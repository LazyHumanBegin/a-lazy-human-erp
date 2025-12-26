/**
 * EZCubic Phase 2 - Inventory Core Module
 * Data management, CRUD operations, stats, branch stock
 * Version: 2.3.0 - Split from inventory-new.js
 */

// ==================== CONSTANTS ====================
const PRODUCTS_KEY = 'ezcubic_inventory';
const STOCK_MOVEMENTS_KEY = 'ezcubic_stock_movements';

// ==================== INITIALIZATION ====================
function initializeInventory() {
    loadProducts();
    loadCategories();
    loadInventoryBranchFilter();
    updateInventoryStats();
}

// Load branches into inventory filter dropdown
function loadInventoryBranchFilter() {
    const filter = document.getElementById('inventoryBranchFilter');
    if (!filter) return;
    
    filter.innerHTML = '<option value="">All Branches/Outlets</option>';
    
    const branchList = typeof branches !== 'undefined' ? branches : [];
    const activeBranches = branchList.filter(b => b.status === 'active');
    
    activeBranches.forEach(branch => {
        const option = document.createElement('option');
        option.value = branch.id;
        option.textContent = `${branch.name} (${branch.code})`;
        filter.appendChild(option);
    });
}

// ==================== PRODUCT CRUD ====================
function loadProducts() {
    console.log('📦 loadProducts called');
    
    // PRIORITY 1: Load from tenant storage directly
    const user = window.currentUser;
    if (user && user.tenantId) {
        const tenantKey = 'ezcubic_tenant_' + user.tenantId;
        const tenantData = JSON.parse(localStorage.getItem(tenantKey) || '{}');
        console.log('📦 Tenant data products:', tenantData.products?.length || 0);
        if (Array.isArray(tenantData.products) && tenantData.products.length > 0) {
            products = tenantData.products;
            window.products = products;
            if (typeof businessData !== 'undefined') {
                businessData.products = products;
            }
            console.log('✅ Products loaded from tenant:', products.length);
            renderProducts();
            return;
        }
    }
    
    // PRIORITY 2: Check window.products
    if (Array.isArray(window.products) && window.products.length > 0) {
        products = window.products;
        console.log('✅ Products loaded from window:', products.length);
    } else {
        // PRIORITY 3: Load from localStorage
        const stored = localStorage.getItem(PRODUCTS_KEY);
        if (stored) {
            const parsed = JSON.parse(stored);
            if (Array.isArray(parsed) && parsed.length > 0) {
                products = parsed;
                console.log('✅ Products loaded from localStorage key:', products.length);
            }
        }
    }
    
    window.products = products;
    if (typeof businessData !== 'undefined') {
        businessData.products = products;
    }
    
    console.log('📦 Final products count:', products.length);
    renderProducts();
}

function saveProducts() {
    console.log('💾 saveProducts called, products:', products.length);
    
    localStorage.setItem(PRODUCTS_KEY, JSON.stringify(products));
    updateInventoryStats();
    updateLowStockBadge();
    
    window.products = products;
    
    if (typeof businessData !== 'undefined') {
        businessData.products = products;
    }
    
    // Direct tenant save
    const user = window.currentUser;
    if (user && user.tenantId) {
        const tenantKey = 'ezcubic_tenant_' + user.tenantId;
        let tenantData = JSON.parse(localStorage.getItem(tenantKey) || '{}');
        tenantData.products = products;
        tenantData.updatedAt = new Date().toISOString();
        localStorage.setItem(tenantKey, JSON.stringify(tenantData));
        console.log('✅ Products saved directly to tenant:', products.length);
    }
}

function saveProduct(event) {
    event.preventDefault();
    
    const id = document.getElementById('productId').value;
    const imageData = document.getElementById('productImageData').value;
    
    updateCombinedSKU();
    const selectedOutlets = getSelectedOutlets();
    const supplierId = document.getElementById('productSupplier')?.value || '';
    
    // Get branch-specific stock
    const branchStockData = getBranchStockFromInputs();
    const totalStock = Object.values(branchStockData).reduce((sum, qty) => sum + qty, 0);
    
    const productData = {
        name: document.getElementById('productName').value.trim(),
        sku: document.getElementById('productSKU').value.trim() || generateSKU(true),
        category: document.getElementById('productCategory').value,
        supplierId: supplierId,
        outlets: selectedOutlets,
        unit: document.getElementById('productUnit').value,
        cost: parseFloat(document.getElementById('productCost').value) || 0,
        price: parseFloat(document.getElementById('productPrice').value) || 0,
        stock: totalStock,
        branchStock: branchStockData,
        minStock: parseInt(document.getElementById('productMinStock').value) || 5,
        taxRate: parseFloat(document.getElementById('productTax').value) || 0,
        description: document.getElementById('productDescription').value.trim(),
        image: imageData || null,
        updatedAt: new Date().toISOString()
    };
    
    if (id) {
        const index = products.findIndex(p => p.id === id);
        if (index !== -1) {
            const oldBranchStock = products[index].branchStock || {};
            products[index] = { ...products[index], ...productData };
            
            // Record stock adjustment per branch
            Object.keys(branchStockData).forEach(branchId => {
                const oldQty = oldBranchStock[branchId] || 0;
                const newQty = branchStockData[branchId] || 0;
                if (oldQty !== newQty) {
                    const branchName = getBranchNameForStock(branchId);
                    recordStockMovement({
                        productId: id,
                        productName: productData.name,
                        type: 'adjustment',
                        quantity: newQty - oldQty,
                        branchId: branchId,
                        branchName: branchName,
                        reason: 'Product edit',
                        notes: `Stock at ${branchName} adjusted from ${oldQty} to ${newQty}`
                    });
                }
            });
            
            saveBranchStockData(id, branchStockData);
        }
        showToast('Product updated successfully!', 'success');
    } else {
        const newProduct = {
            id: generateUUID(),
            ...productData,
            createdAt: new Date().toISOString()
        };
        products.push(newProduct);
        
        // Record initial stock per branch
        Object.keys(branchStockData).forEach(branchId => {
            const qty = branchStockData[branchId] || 0;
            if (qty > 0) {
                const branchName = getBranchNameForStock(branchId);
                recordStockMovement({
                    productId: newProduct.id,
                    productName: productData.name,
                    type: 'in',
                    quantity: qty,
                    branchId: branchId,
                    branchName: branchName,
                    reason: 'Initial stock',
                    notes: `Initial stock at ${branchName}`
                });
            }
        });
        
        saveBranchStockData(newProduct.id, branchStockData);
        showToast('Product added successfully!', 'success');
    }
    
    saveProducts();
    renderProducts();
    closeModal('productModal');
}

function deleteProduct(productId) {
    const product = products.find(p => p.id === productId);
    if (!product) return;
    
    if (confirm(`Are you sure you want to delete "${product.name}"?\n\nThis will also remove all stock history for this product.`)) {
        products = products.filter(p => p.id !== productId);
        stockMovements = stockMovements.filter(m => m.productId !== productId);
        
        saveProducts();
        localStorage.setItem(STOCK_MOVEMENTS_KEY, JSON.stringify(stockMovements));
        
        renderProducts();
        showToast('Product deleted successfully!', 'info');
    }
}

// ==================== SKU GENERATION ====================
function generateSKU(returnOnly = false) {
    const prefixField = document.getElementById('productSKUPrefix');
    const prefix = prefixField?.value.trim().toUpperCase() || 'EZ';
    
    const existingNumbers = products
        .filter(p => p.sku && p.sku.startsWith(prefix + '-'))
        .map(p => parseInt(p.sku.split('-')[1]) || 0);
    
    const nextNumber = existingNumbers.length > 0 ? Math.max(...existingNumbers) + 1 : 1;
    const numberStr = nextNumber.toString().padStart(3, '0');
    const sku = `${prefix}-${numberStr}`;
    
    if (returnOnly) {
        return sku;
    }
    
    if (prefixField) prefixField.value = prefix;
    document.getElementById('productSKUNumber').value = numberStr;
    updateCombinedSKU();
    return sku;
}

function updateCombinedSKU() {
    const prefix = document.getElementById('productSKUPrefix')?.value.trim().toUpperCase() || '';
    const number = document.getElementById('productSKUNumber')?.value.trim() || '';
    const combined = prefix && number ? `${prefix}-${number}` : (prefix || number);
    document.getElementById('productSKU').value = combined;
}

// ==================== CATEGORIES ====================
function loadCategories() {
    const categoryFilter = document.getElementById('categoryFilter');
    if (!categoryFilter) return;
    
    const usedCategories = [...new Set(products.map(p => p.category))];
    const allCategories = [...new Set([...categories, ...usedCategories])].sort();
    
    categoryFilter.innerHTML = '<option value="">All Categories</option>' +
        allCategories.map(cat => `<option value="${cat}">${cat}</option>`).join('');
}

// ==================== INVENTORY STATS ====================
function updateInventoryStats() {
    const totalProducts = products.length;
    const totalStockValue = products.reduce((sum, p) => sum + (p.cost * p.stock), 0);
    const lowStockItems = products.filter(p => p.stock > 0 && p.stock <= p.minStock).length;
    const outOfStockItems = products.filter(p => p.stock === 0).length;
    
    const totalProductsEl = document.getElementById('totalProducts');
    const totalStockValueEl = document.getElementById('totalStockValue');
    const lowStockCountEl = document.getElementById('lowStockCount');
    const outOfStockCountEl = document.getElementById('outOfStockCount');
    
    if (totalProductsEl) totalProductsEl.textContent = totalProducts;
    if (totalStockValueEl) totalStockValueEl.textContent = formatMYR(totalStockValue);
    if (lowStockCountEl) lowStockCountEl.textContent = lowStockItems;
    if (outOfStockCountEl) outOfStockCountEl.textContent = outOfStockItems;
}

function updateLowStockBadge() {
    const badge = document.getElementById('lowStockBadge');
    if (!badge) return;
    
    const lowStockCount = products.filter(p => p.stock <= p.minStock).length;
    
    if (lowStockCount > 0) {
        badge.textContent = lowStockCount;
        badge.style.display = 'flex';
    } else {
        badge.style.display = 'none';
    }
}

// ==================== STOCK STATUS HELPERS ====================
function getStockStatus(product) {
    if (product.stock === 0) {
        return { class: 'out-of-stock', text: 'Out of Stock', icon: 'fa-times-circle' };
    } else if (product.stock <= product.minStock) {
        return { class: 'low-stock', text: 'Low Stock', icon: 'fa-exclamation-triangle' };
    }
    return { class: 'in-stock', text: 'In Stock', icon: 'fa-check-circle' };
}

function getStockStatusForQty(stock, minStock) {
    if (stock === 0) {
        return { class: 'out-of-stock', text: 'Out of Stock', icon: 'fa-times-circle' };
    } else if (stock <= minStock) {
        return { class: 'low-stock', text: 'Low Stock', icon: 'fa-exclamation-triangle' };
    }
    return { class: 'in-stock', text: 'In Stock', icon: 'fa-check-circle' };
}

// ==================== BRANCH STOCK FUNCTIONS ====================
function getBranchStockFromInputs() {
    const singleStockInput = document.getElementById('singleBranchStock');
    if (singleStockInput) {
        const qty = parseInt(singleStockInput.value) || 0;
        return { 'main': qty };
    }
    
    const inputs = document.querySelectorAll('.branch-stock-input');
    const branchStock = {};
    
    inputs.forEach(input => {
        const branchId = input.dataset.branchId;
        const qty = parseInt(input.value) || 0;
        branchStock[branchId] = qty;
    });
    
    return branchStock;
}

function updateTotalStock() {
    const branchStock = getBranchStockFromInputs();
    const total = Object.values(branchStock).reduce((sum, qty) => sum + qty, 0);
    
    const totalField = document.getElementById('productStock');
    if (totalField) {
        totalField.value = total;
    }
}

function getBranchNameForStock(branchId) {
    const branchList = typeof branches !== 'undefined' ? branches : [];
    const branch = branchList.find(b => b.id === branchId);
    return branch ? branch.name : 'Unknown Branch';
}

function saveBranchStockData(productId, branchStock) {
    const stockKey = 'ezcubic_branch_stock';
    const stored = localStorage.getItem(stockKey);
    const allBranchStock = stored ? JSON.parse(stored) : {};
    
    Object.keys(branchStock).forEach(branchId => {
        const key = `${productId}_${branchId}`;
        allBranchStock[key] = branchStock[branchId];
    });
    
    localStorage.setItem(stockKey, JSON.stringify(allBranchStock));
}

function getProductStockByBranch(productId, branchId) {
    const product = products.find(p => p.id === productId);
    if (!product) return 0;
    
    if (product.branchStock && product.branchStock[branchId] !== undefined) {
        return product.branchStock[branchId];
    }
    
    if (typeof getBranchStock === 'function') {
        return getBranchStock(productId, branchId);
    }
    
    return 0;
}

function getProductTotalStock(productId) {
    const product = products.find(p => p.id === productId);
    if (!product) return 0;
    
    if (product.branchStock) {
        return Object.values(product.branchStock).reduce((sum, qty) => sum + qty, 0);
    }
    
    return product.stock || 0;
}

function getBranchStockBadges(product) {
    if (!product.branchStock) return '';
    
    const branchList = typeof branches !== 'undefined' ? branches : [];
    const activeBranches = branchList.filter(b => b.status === 'active');
    
    if (activeBranches.length === 0) return '';
    
    return activeBranches.map(branch => {
        const qty = product.branchStock[branch.id] || 0;
        let badgeClass = '';
        if (qty === 0) badgeClass = 'out';
        else if (qty <= product.minStock) badgeClass = 'low';
        
        return `<span class="branch-stock-badge ${badgeClass}" title="${branch.name}">
            <i class="fas fa-store"></i> ${branch.code}: ${qty}
        </span>`;
    }).join('');
}

// ==================== COST CALCULATION HELPERS ====================
function getLastKnownCost(productName, category) {
    const similar = products.filter(p => 
        p.category === category || 
        p.name.toLowerCase().includes(productName.toLowerCase().split(' ')[0])
    );
    
    if (similar.length > 0) {
        const avgCost = similar.reduce((sum, p) => sum + (p.cost || 0), 0) / similar.length;
        return avgCost > 0 ? avgCost : null;
    }
    return null;
}

// ==================== WINDOW EXPORTS ====================
window.initializeInventory = initializeInventory;
window.loadInventoryBranchFilter = loadInventoryBranchFilter;
window.loadProducts = loadProducts;
window.saveProducts = saveProducts;
window.saveProduct = saveProduct;
window.deleteProduct = deleteProduct;
window.generateSKU = generateSKU;
window.updateCombinedSKU = updateCombinedSKU;
window.loadCategories = loadCategories;
window.updateInventoryStats = updateInventoryStats;
window.updateLowStockBadge = updateLowStockBadge;
window.getStockStatus = getStockStatus;
window.getStockStatusForQty = getStockStatusForQty;
window.getBranchStockFromInputs = getBranchStockFromInputs;
window.updateTotalStock = updateTotalStock;
window.getBranchNameForStock = getBranchNameForStock;
window.saveBranchStockData = saveBranchStockData;
window.getProductStockByBranch = getProductStockByBranch;
window.getProductTotalStock = getProductTotalStock;
window.getBranchStockBadges = getBranchStockBadges;
window.getLastKnownCost = getLastKnownCost;
