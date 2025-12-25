/**
 * BRANCHES-STOCK.JS
 * Multi-Branch Management Module - Stock Management
 * Branch Stock Operations, Sync Functions
 * Version: 2.2.7 - Modular Split - 26 Dec 2025
 */

// Branch stock is stored as: { productId: { branchId: quantity } }
let branchStockData = {};

// ==================== BRANCH STOCK OPERATIONS ====================
function getBranchStock(productId, branchId) {
    if (!branchStockData[productId]) return 0;
    return branchStockData[productId][branchId] || 0;
}

function setBranchStock(productId, branchId, quantity) {
    if (!branchStockData[productId]) {
        branchStockData[productId] = {};
    }
    branchStockData[productId][branchId] = quantity;
    saveBranchStockData();
}

function adjustBranchStock(productId, branchId, adjustment) {
    if (!branchStockData[productId]) {
        branchStockData[productId] = {};
    }
    const current = branchStockData[productId][branchId] || 0;
    branchStockData[productId][branchId] = Math.max(0, current + adjustment);
    saveBranchStockData();
    syncBranchStockToProduct(productId);
}

function getAllBranchStock(productId) {
    return branchStockData[productId] || {};
}

function getTotalBranchStock(productId) {
    const stockByBranch = branchStockData[productId] || {};
    return Object.values(stockByBranch).reduce((sum, qty) => sum + qty, 0);
}

// ==================== STORAGE ====================
const BRANCH_STOCK_KEY = 'ezcubic_branch_stock';

function loadBranchStockData() {
    try {
        const user = window.currentUser;
        if (user && user.tenantId) {
            const tenantKey = 'ezcubic_tenant_' + user.tenantId;
            const tenantData = JSON.parse(localStorage.getItem(tenantKey) || '{}');
            if (tenantData.branchStock) {
                branchStockData = tenantData.branchStock;
                return;
            }
        }
        
        const stored = localStorage.getItem(BRANCH_STOCK_KEY);
        if (stored) {
            branchStockData = JSON.parse(stored);
        }
    } catch (e) {
        console.error('Error loading branch stock data:', e);
        branchStockData = {};
    }
}

function saveBranchStockData() {
    try {
        localStorage.setItem(BRANCH_STOCK_KEY, JSON.stringify(branchStockData));
        
        const user = window.currentUser;
        if (user && user.tenantId) {
            const tenantKey = 'ezcubic_tenant_' + user.tenantId;
            let tenantData = JSON.parse(localStorage.getItem(tenantKey) || '{}');
            tenantData.branchStock = branchStockData;
            tenantData.updatedAt = new Date().toISOString();
            localStorage.setItem(tenantKey, JSON.stringify(tenantData));
        }
    } catch (e) {
        console.error('Error saving branch stock data:', e);
    }
}

// ==================== INITIALIZATION ====================
function initializeBranchStockFromProducts() {
    loadBranchStockData();
    
    const products = window.products || [];
    const defaultBranchId = branches.find(b => b.isDefault)?.id || branches[0]?.id;
    
    if (!defaultBranchId) return;
    
    // Initialize stock for products without branch stock data
    products.forEach(product => {
        if (!branchStockData[product.id]) {
            branchStockData[product.id] = {};
            // Put all stock in default branch
            branchStockData[product.id][defaultBranchId] = product.quantity || 0;
        }
    });
    
    saveBranchStockData();
}

// ==================== SYNC FUNCTIONS ====================
function syncBranchStockToProduct(productId) {
    const products = window.products || [];
    const product = products.find(p => p.id === productId);
    
    if (product) {
        // Update total quantity across all branches
        product.quantity = getTotalBranchStock(productId);
        
        // Save products
        if (typeof window.saveProducts === 'function') {
            window.saveProducts();
        }
    }
}

function syncAllBranchStockToProducts() {
    const products = window.products || [];
    
    products.forEach(product => {
        const totalStock = getTotalBranchStock(product.id);
        if (product.quantity !== totalStock) {
            product.quantity = totalStock;
        }
    });
    
    if (typeof window.saveProducts === 'function') {
        window.saveProducts();
    }
}

function processTransferStock(transferId, action) {
    const transfer = branchTransfers.find(t => t.id === transferId);
    if (!transfer) return false;
    
    switch (action) {
        case 'deduct':
            // Deduct from source branch
            transfer.items.forEach(item => {
                adjustBranchStock(item.productId, transfer.fromBranch, -item.quantity);
            });
            break;
            
        case 'add':
            // Add to destination branch
            transfer.items.forEach(item => {
                adjustBranchStock(item.productId, transfer.toBranch, item.quantity);
            });
            break;
            
        case 'reverse':
            // Reverse deduction (for cancelled transfers that were in-transit)
            transfer.items.forEach(item => {
                adjustBranchStock(item.productId, transfer.fromBranch, item.quantity);
            });
            break;
    }
    
    return true;
}

// ==================== POS INTEGRATION ====================
function syncBranchesToOutlets() {
    // Sync branches to POS outlets for compatibility
    const outlets = branches.filter(b => b.status === 'active').map(b => ({
        id: b.id,
        name: b.name,
        code: b.code,
        address: b.address,
        type: b.type === 'headquarters' ? 'main' : 'branch'
    }));
    
    window.posOutlets = outlets;
    
    // Update outlet selector in POS if exists
    updatePOSOutletFilter();
}

function updatePOSOutletFilter() {
    const outletFilter = document.getElementById('pos-outlet-filter');
    if (!outletFilter) return;
    
    const activeBranches = branches.filter(b => b.status === 'active');
    
    outletFilter.innerHTML = `
        <option value="">All Outlets</option>
        ${activeBranches.map(b => `
            <option value="${b.id}">${escapeHTML(b.name)}</option>
        `).join('')}
    `;
}

// ==================== BRANCH INVENTORY VALUE ====================
function getBranchInventoryValue(branchId) {
    const products = window.products || [];
    let totalValue = 0;
    
    products.forEach(product => {
        const stock = getBranchStock(product.id, branchId);
        const cost = product.cost || product.price || 0;
        totalValue += stock * cost;
    });
    
    return totalValue;
}

// ==================== BRANCH SALES ====================
function getBranchSalesThisMonth(branchId) {
    const transactions = window.transactions || [];
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    return transactions
        .filter(t => {
            const tDate = new Date(t.date);
            return t.type === 'income' && 
                   t.branchId === branchId && 
                   tDate >= startOfMonth;
        })
        .reduce((sum, t) => sum + (t.amount || 0), 0);
}

function getBranchSalesTotal(branchId) {
    const transactions = window.transactions || [];
    
    return transactions
        .filter(t => t.type === 'income' && t.branchId === branchId)
        .reduce((sum, t) => sum + (t.amount || 0), 0);
}

function getBranchTransactionCount(branchId) {
    const transactions = window.transactions || [];
    return transactions.filter(t => t.branchId === branchId).length;
}

// ==================== EXPORT TO WINDOW ====================
window.branchStockData = branchStockData;
window.getBranchStock = getBranchStock;
window.setBranchStock = setBranchStock;
window.adjustBranchStock = adjustBranchStock;
window.getAllBranchStock = getAllBranchStock;
window.getTotalBranchStock = getTotalBranchStock;
window.loadBranchStockData = loadBranchStockData;
window.saveBranchStockData = saveBranchStockData;
window.initializeBranchStockFromProducts = initializeBranchStockFromProducts;
window.syncBranchStockToProduct = syncBranchStockToProduct;
window.syncAllBranchStockToProducts = syncAllBranchStockToProducts;
window.processTransferStock = processTransferStock;
window.syncBranchesToOutlets = syncBranchesToOutlets;
window.updatePOSOutletFilter = updatePOSOutletFilter;
window.getBranchInventoryValue = getBranchInventoryValue;
window.getBranchSalesThisMonth = getBranchSalesThisMonth;
window.getBranchSalesTotal = getBranchSalesTotal;
window.getBranchTransactionCount = getBranchTransactionCount;
