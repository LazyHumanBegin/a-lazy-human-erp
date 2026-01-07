/**
 * EZCubic Stock Manager - Central Stock Control
 * 
 * SINGLE SOURCE OF TRUTH for all stock operations
 * All modules (POS, Inventory, Stock) must use these functions
 * 
 * Rules:
 * 1. product.branchStock = authoritative per-branch stock
 * 2. product.stock = derived total (sum of all branchStock)
 * 3. Never update stock directly - always use updateProductStock()
 * 
 * @version 1.0.0
 * @date 2026-01-07
 */

// ==================== CONSTANTS ====================
const DEFAULT_BRANCH_ID = 'BRANCH_HQ';
const STOCK_MOVEMENTS_KEY = 'ezcubic_stock_movements';

// ==================== CORE STOCK FUNCTION ====================

/**
 * THE CENTRAL STOCK UPDATE FUNCTION
 * All stock changes MUST go through this function
 * 
 * @param {string} productId - Product ID
 * @param {string} branchId - Branch ID (default: BRANCH_HQ)
 * @param {number} quantityChange - Positive to add, negative to subtract
 * @param {string} reason - Reason for change (sale, purchase, adjustment, transfer, etc.)
 * @param {object} options - Additional options
 * @param {string} options.reference - Reference number (sale ID, PO number, etc.)
 * @param {string} options.notes - Additional notes
 * @param {boolean} options.skipCloudSync - Skip cloud sync (for batch operations)
 * @returns {object} { success: boolean, product: object, newStock: number, error: string }
 */
function updateProductStock(productId, branchId, quantityChange, reason, options = {}) {
    console.log('📦 updateProductStock:', { productId, branchId, quantityChange, reason });
    
    // Validate inputs
    if (!productId) {
        console.error('❌ updateProductStock: productId required');
        return { success: false, error: 'Product ID required' };
    }
    
    if (typeof quantityChange !== 'number' || isNaN(quantityChange)) {
        console.error('❌ updateProductStock: invalid quantityChange');
        return { success: false, error: 'Invalid quantity change' };
    }
    
    // Use default branch if not specified
    branchId = branchId || getDefaultBranchId();
    
    // Find the product in window.products (single source of truth)
    const product = window.products?.find(p => p.id === productId);
    if (!product) {
        console.error('❌ updateProductStock: product not found:', productId);
        return { success: false, error: 'Product not found' };
    }
    
    // Initialize branchStock if needed
    if (!product.branchStock) {
        product.branchStock = {};
    }
    
    // Get current branch stock
    const currentBranchStock = product.branchStock[branchId] || 0;
    const newBranchStock = currentBranchStock + quantityChange;
    
    // Check for negative stock (optional - allow it but warn)
    if (newBranchStock < 0 && reason !== 'adjustment') {
        console.warn('⚠️ Stock going negative:', product.name, 'Branch:', branchId, 'New:', newBranchStock);
        // Still allow it for flexibility, but warn
    }
    
    // UPDATE THE STOCK
    product.branchStock[branchId] = Math.max(0, newBranchStock); // Clamp to 0 minimum
    
    // Recalculate total stock from all branches
    product.stock = calculateTotalStock(product);
    
    console.log('✅ Stock updated:', product.name, {
        branch: branchId,
        was: currentBranchStock,
        change: quantityChange,
        now: product.branchStock[branchId],
        total: product.stock
    });
    
    // Record stock movement
    recordStockMovement({
        productId: product.id,
        productName: product.name,
        branchId: branchId,
        quantityChange: quantityChange,
        previousStock: currentBranchStock,
        newStock: product.branchStock[branchId],
        reason: reason,
        reference: options.reference || '',
        notes: options.notes || '',
        userId: window.currentUser?.id || 'system',
        timestamp: new Date().toISOString()
    });
    
    // ===== RECORD PURCHASE EXPENSE FOR STOCK IN =====
    // When stock is added (positive quantityChange) and product has cost, record expense
    if (quantityChange > 0 && (reason === 'stock-in' || reason === 'purchase' || reason === 'Purchase') && product.cost > 0) {
        const purchaseCost = product.cost * quantityChange;
        const purchaseTransaction = {
            id: 'TX' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
            type: 'expense',
            amount: purchaseCost,
            description: `Stock Purchase: ${product.name} (${quantityChange} ${product.unit || 'units'})`,
            category: 'Inventory Purchase',
            date: new Date().toISOString().split('T')[0],
            reference: options.reference || `STK-${Date.now().toString().slice(-6)}`,
            branchId: branchId,
            createdAt: new Date().toISOString(),
            createdBy: window.currentUser?.name || 'System'
        };
        
        // Add to transactions
        if (window.businessData && window.businessData.transactions) {
            window.businessData.transactions.push(purchaseTransaction);
        } else if (window.transactions) {
            window.transactions.push(purchaseTransaction);
        }
        
        // Save
        if (typeof saveData === 'function') saveData();
        
        console.log('📊 Purchase expense recorded:', purchaseCost, 'for', product.name);
    }
    
    // Save products (this triggers cloud sync)
    saveProductsToStorage(!options.skipCloudSync);
    
    return {
        success: true,
        product: product,
        previousStock: currentBranchStock,
        newStock: product.branchStock[branchId],
        totalStock: product.stock
    };
}

/**
 * Get available stock for a product at a specific branch
 * Use this for stock checks before sale/transfer
 */
function getAvailableStock(productId, branchId = null) {
    branchId = branchId || getDefaultBranchId();
    
    const product = window.products?.find(p => p.id === productId);
    if (!product) return 0;
    
    // If no branchStock, fall back to total stock (legacy compatibility)
    if (!product.branchStock || Object.keys(product.branchStock).length === 0) {
        return product.stock || 0;
    }
    
    return product.branchStock[branchId] || 0;
}

/**
 * Check if stock is sufficient for a quantity
 */
function hasEnoughStock(productId, quantity, branchId = null) {
    const available = getAvailableStock(productId, branchId);
    return available >= quantity;
}

/**
 * Batch stock update - for multiple products (e.g., completing a sale)
 * Deducts stock FIRST, records all movements, then saves once
 */
function batchUpdateStock(updates, reason, options = {}) {
    console.log('📦 batchUpdateStock:', updates.length, 'items');
    
    const results = [];
    const branchId = options.branchId || getDefaultBranchId();
    
    // First pass: validate all updates
    for (const update of updates) {
        const product = window.products?.find(p => p.id === update.productId);
        if (!product) {
            results.push({ productId: update.productId, success: false, error: 'Product not found' });
            continue;
        }
        results.push({ productId: update.productId, product, success: true });
    }
    
    // Check if any failed
    const failed = results.filter(r => !r.success);
    if (failed.length > 0 && !options.partialAllowed) {
        console.error('❌ Batch update failed - some products not found');
        return { success: false, results, error: 'Some products not found' };
    }
    
    // Second pass: update all stocks
    for (let i = 0; i < updates.length; i++) {
        const update = updates[i];
        if (!results[i].success) continue;
        
        const product = results[i].product;
        
        // Initialize branchStock if needed
        if (!product.branchStock) {
            product.branchStock = {};
        }
        
        const currentStock = product.branchStock[branchId] || 0;
        const newStock = currentStock + update.quantityChange;
        
        product.branchStock[branchId] = Math.max(0, newStock);
        product.stock = calculateTotalStock(product);
        
        results[i].previousStock = currentStock;
        results[i].newStock = product.branchStock[branchId];
        
        // Record movement
        recordStockMovement({
            productId: product.id,
            productName: product.name,
            branchId: branchId,
            quantityChange: update.quantityChange,
            previousStock: currentStock,
            newStock: product.branchStock[branchId],
            reason: reason,
            reference: options.reference || '',
            notes: update.notes || options.notes || '',
            userId: window.currentUser?.id || 'system',
            timestamp: new Date().toISOString()
        });
    }
    
    // Save once at the end
    saveProductsToStorage(true);
    
    console.log('✅ Batch stock update complete:', results.filter(r => r.success).length, 'updated');
    
    return { success: true, results };
}

// ==================== HELPER FUNCTIONS ====================

/**
 * Calculate total stock from all branches
 */
function calculateTotalStock(product) {
    if (!product.branchStock || typeof product.branchStock !== 'object') {
        return product.stock || 0;
    }
    
    let total = 0;
    for (const branchId in product.branchStock) {
        total += product.branchStock[branchId] || 0;
    }
    return total;
}

/**
 * Get default branch ID for current user/context
 */
function getDefaultBranchId() {
    // Check if multi-branch is enabled
    const user = window.currentUser;
    
    // If user has assigned branch, use that
    if (user?.branchId) {
        return user.branchId;
    }
    
    // Check for selected branch in POS
    const selectedBranch = document.getElementById('posBranchSelect')?.value;
    if (selectedBranch) {
        return selectedBranch;
    }
    
    // Default to HQ
    return DEFAULT_BRANCH_ID;
}

/**
 * Record stock movement for audit trail
 */
function recordStockMovement(movement) {
    // Ensure stockMovements array exists
    if (!Array.isArray(window.stockMovements)) {
        window.stockMovements = JSON.parse(localStorage.getItem(STOCK_MOVEMENTS_KEY) || '[]');
    }
    
    // Add movement
    window.stockMovements.push({
        id: 'SM_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
        ...movement
    });
    
    // Keep only last 1000 movements (prevent bloat)
    if (window.stockMovements.length > 1000) {
        window.stockMovements = window.stockMovements.slice(-1000);
    }
    
    // Save to localStorage
    localStorage.setItem(STOCK_MOVEMENTS_KEY, JSON.stringify(window.stockMovements));
    
    // Also save to tenant storage
    const user = window.currentUser;
    if (user?.tenantId) {
        const tenantKey = 'ezcubic_tenant_' + user.tenantId;
        try {
            let tenantData = JSON.parse(localStorage.getItem(tenantKey) || '{}');
            tenantData.stockMovements = window.stockMovements;
            localStorage.setItem(tenantKey, JSON.stringify(tenantData));
        } catch (e) {
            console.warn('Failed to save stock movements to tenant:', e);
        }
    }
}

/**
 * Save products to storage and optionally sync to cloud
 */
function saveProductsToStorage(syncToCloud = true) {
    const PRODUCTS_KEY = 'ezcubic_products';
    
    // Save to localStorage
    localStorage.setItem(PRODUCTS_KEY, JSON.stringify(window.products || []));
    
    // Update businessData if exists
    if (typeof businessData !== 'undefined') {
        businessData.products = window.products;
    }
    
    // Save to tenant storage
    const user = window.currentUser;
    if (user?.tenantId) {
        const tenantKey = 'ezcubic_tenant_' + user.tenantId;
        try {
            let tenantData = JSON.parse(localStorage.getItem(tenantKey) || '{}');
            tenantData.products = window.products;
            tenantData.updatedAt = new Date().toISOString();
            localStorage.setItem(tenantKey, JSON.stringify(tenantData));
        } catch (e) {
            console.warn('Failed to save products to tenant:', e);
        }
    }
    
    // Update UI stats if available
    if (typeof updateInventoryStats === 'function') {
        updateInventoryStats();
    }
    if (typeof updateLowStockBadge === 'function') {
        updateLowStockBadge();
    }
    
    // Sync to cloud
    if (syncToCloud && typeof window.pushToCloud === 'function') {
        window.pushToCloud(false); // Don't show toast for every stock update
    }
}

/**
 * Initialize product's branch stock from total stock
 * Call this when a product doesn't have branchStock yet
 */
function initializeProductBranchStock(product, branchId = null) {
    branchId = branchId || DEFAULT_BRANCH_ID;
    
    if (!product.branchStock) {
        product.branchStock = {};
    }
    
    // If no branch stock exists, put all stock in default branch
    const totalBranchStock = calculateTotalStock(product);
    if (totalBranchStock === 0 && product.stock > 0) {
        product.branchStock[branchId] = product.stock;
        console.log('📦 Initialized branchStock for', product.name, ':', product.stock, 'at', branchId);
    }
    
    return product;
}

/**
 * Ensure all products have branchStock initialized
 */
function initializeAllProductsBranchStock() {
    if (!Array.isArray(window.products)) return;
    
    let updated = 0;
    for (const product of window.products) {
        if (!product.branchStock || Object.keys(product.branchStock).length === 0) {
            initializeProductBranchStock(product);
            updated++;
        }
    }
    
    if (updated > 0) {
        console.log('📦 Initialized branchStock for', updated, 'products');
        saveProductsToStorage(true);
    }
}

// ==================== TRANSFER STOCK ====================

/**
 * Transfer stock between branches
 */
function transferStock(productId, fromBranchId, toBranchId, quantity, notes = '') {
    console.log('📦 Transfer stock:', { productId, from: fromBranchId, to: toBranchId, quantity });
    
    if (quantity <= 0) {
        return { success: false, error: 'Quantity must be positive' };
    }
    
    // Check source has enough stock
    if (!hasEnoughStock(productId, quantity, fromBranchId)) {
        return { success: false, error: 'Insufficient stock at source branch' };
    }
    
    // Deduct from source
    const deductResult = updateProductStock(productId, fromBranchId, -quantity, 'transfer-out', {
        reference: `TO:${toBranchId}`,
        notes: notes,
        skipCloudSync: true // We'll sync once at the end
    });
    
    if (!deductResult.success) {
        return deductResult;
    }
    
    // Add to destination
    const addResult = updateProductStock(productId, toBranchId, quantity, 'transfer-in', {
        reference: `FROM:${fromBranchId}`,
        notes: notes,
        skipCloudSync: false // Sync now
    });
    
    return addResult;
}

// ==================== EXPORTS ====================

window.stockManager = {
    update: updateProductStock,
    getAvailable: getAvailableStock,
    hasEnough: hasEnoughStock,
    batchUpdate: batchUpdateStock,
    transfer: transferStock,
    getDefaultBranch: getDefaultBranchId,
    initializeAll: initializeAllProductsBranchStock,
    calculateTotal: calculateTotalStock
};

// Also expose main functions directly for easy access
window.updateProductStock = updateProductStock;
window.getAvailableStock = getAvailableStock;
window.hasEnoughStock = hasEnoughStock;
window.batchUpdateStock = batchUpdateStock;
window.transferStock = transferStock;

console.log('✅ Stock Manager loaded - SINGLE SOURCE OF TRUTH for all stock operations');
console.log('   Use: updateProductStock(productId, branchId, quantity, reason)');
console.log('   Use: getAvailableStock(productId, branchId)');
console.log('   Use: batchUpdateStock(updates, reason, options)');
