/**
 * EZCubic Smart Accounting - Stock Core Module
 * Data operations: load, save, movements, transfers, adjustments
 * Split from stock.js for v2.3.1
 */

// ==================== STOCK INITIALIZATION ====================
function initializeStock() {
    loadStockMovements();
    updateStockStats();
    setDefaultStockDates();
    renderStockMovements();
}

function loadStockMovements() {
    // PRIORITY 1: Load from tenant storage directly (most reliable)
    const user = window.currentUser;
    if (user && user.tenantId) {
        const tenantKey = 'ezcubic_tenant_' + user.tenantId;
        const tenantData = JSON.parse(localStorage.getItem(tenantKey) || '{}');
        if (Array.isArray(tenantData.stockMovements) && tenantData.stockMovements.length > 0) {
            stockMovements = tenantData.stockMovements;
            window.stockMovements = stockMovements;
            console.log('✅ Stock movements loaded from tenant:', stockMovements.length);
            return;
        }
    }
    
    // PRIORITY 2: Check window.stockMovements
    if (Array.isArray(window.stockMovements) && window.stockMovements.length > 0) {
        stockMovements = window.stockMovements;
        console.log('✅ Stock movements loaded from window:', stockMovements.length);
    } else {
        // PRIORITY 3: Load from localStorage
        const stored = localStorage.getItem(STOCK_MOVEMENTS_KEY);
        if (stored) {
            stockMovements = JSON.parse(stored);
            console.log('✅ Stock movements loaded from localStorage key:', stockMovements.length);
        }
    }
    window.stockMovements = stockMovements;
}

function saveStockMovements() {
    localStorage.setItem(STOCK_MOVEMENTS_KEY, JSON.stringify(stockMovements));
    window.stockMovements = stockMovements;
    
    // DIRECT tenant save
    const user = window.currentUser;
    if (user && user.tenantId) {
        const tenantKey = 'ezcubic_tenant_' + user.tenantId;
        let tenantData = JSON.parse(localStorage.getItem(tenantKey) || '{}');
        tenantData.stockMovements = stockMovements;
        tenantData.updatedAt = new Date().toISOString();
        localStorage.setItem(tenantKey, JSON.stringify(tenantData));
        console.log('✅ Stock movements saved directly to tenant:', stockMovements.length);
    }
    
    // Note: Don't call saveToUserTenant - it would overwrite with stale data
}

// ==================== STOCK ADJUSTMENT ====================
function saveStockAdjustment(event) {
    event.preventDefault();
    
    const productIdEl = document.getElementById('adjustProductId');
    const adjustmentTypeEl = document.getElementById('adjustmentType');
    const adjustQuantityEl = document.getElementById('adjustQuantity');
    const adjustNotesEl = document.getElementById('adjustNotes');
    
    if (!productIdEl || !adjustmentTypeEl || !adjustQuantityEl) {
        showToast('Stock adjustment form not ready', 'error');
        return;
    }
    
    const productId = productIdEl.value;
    const adjustmentType = adjustmentTypeEl.value;
    const quantity = parseInt(adjustQuantityEl.value) || 0;
    const reason = document.getElementById('adjustReason')?.value || '';
    const notes = adjustNotesEl?.value?.trim() || '';
    
    const product = products.find(p => p.id === productId);
    if (!product) {
        showToast('Product not found!', 'error');
        return;
    }
    
    // Handle transfer between outlets
    if (adjustmentType === 'transfer') {
        return handleOutletTransfer(productId, product, quantity, notes);
    }
    
    let newStock = product.stock;
    let movementQty = quantity;
    
    switch (adjustmentType) {
        case 'in':
            newStock = product.stock + quantity;
            movementQty = quantity;
            break;
        case 'out':
            if (quantity > product.stock) {
                showToast('Cannot remove more than current stock!', 'error');
                return;
            }
            newStock = product.stock - quantity;
            movementQty = -quantity;
            break;
        case 'set':
            movementQty = quantity - product.stock;
            newStock = quantity;
            break;
    }
    
    // Update product stock
    const index = products.findIndex(p => p.id === productId);
    products[index].stock = newStock;
    products[index].updatedAt = new Date().toISOString();
    
    // Record stock movement
    recordStockMovement({
        productId: productId,
        productName: product.name,
        type: adjustmentType === 'set' ? 'adjustment' : adjustmentType,
        quantity: movementQty,
        reason: reason,
        notes: notes
    });
    
    // Record purchase cost to accounting when stock is received
    if (adjustmentType === 'in' && reason === 'Purchase' && product.cost > 0) {
        const purchaseCost = product.cost * quantity;
        const purchaseTransaction = {
            id: generateUUID(),
            date: new Date().toISOString().split('T')[0],
            amount: purchaseCost,
            category: 'Inventory Purchase',
            description: `Stock Purchase: ${product.name} (${quantity} units)`,
            type: 'expense',
            reference: `STK-${Date.now()}`,
            timestamp: new Date().toISOString()
        };
        // Push to businessData.transactions for proper sync with All Transactions
        if (typeof businessData !== 'undefined' && businessData.transactions) {
            businessData.transactions.push(purchaseTransaction);
        } else {
            transactions.push(purchaseTransaction);
        }
        saveData();
    }
    
    saveProducts();
    renderProducts();
    renderStockMovements();
    updateStockStats();
    
    closeModal('stockAdjustmentModal');
    showToast('Stock adjusted successfully!', 'success');
}

// ==================== OUTLET TRANSFER HANDLER ====================
function handleOutletTransfer(productId, product, quantity, notes) {
    const fromOutletId = document.getElementById('transferFromOutlet')?.value;
    const toOutletId = document.getElementById('transferToOutlet')?.value;
    
    // Validation
    if (!fromOutletId) {
        showToast('Please select the source outlet', 'error');
        document.getElementById('transferFromOutlet')?.focus();
        return;
    }
    
    if (!toOutletId) {
        showToast('Please select the destination outlet', 'error');
        document.getElementById('transferToOutlet')?.focus();
        return;
    }
    
    if (fromOutletId === toOutletId) {
        showToast('Source and destination outlets cannot be the same', 'error');
        return;
    }
    
    if (quantity <= 0) {
        showToast('Please enter a valid quantity to transfer', 'error');
        return;
    }
    
    // Get outlet names
    let fromOutletName = fromOutletId;
    let toOutletName = toOutletId;
    
    if (typeof branches !== 'undefined') {
        const fromBranch = branches.find(b => b.id === fromOutletId);
        const toBranch = branches.find(b => b.id === toOutletId);
        fromOutletName = fromBranch?.name || fromOutletId;
        toOutletName = toBranch?.name || toOutletId;
    } else if (typeof posOutlets !== 'undefined') {
        const fromOutlet = posOutlets.find(o => o.id === fromOutletId);
        const toOutlet = posOutlets.find(o => o.id === toOutletId);
        fromOutletName = fromOutlet?.name || fromOutletId;
        toOutletName = toOutlet?.name || toOutletId;
    }
    
    // Check source stock
    let sourceStock = product.stock;
    if (typeof getBranchStock === 'function') {
        sourceStock = getBranchStock(productId, fromOutletId);
    }
    
    if (quantity > sourceStock) {
        showToast(`Insufficient stock at ${fromOutletName}. Available: ${sourceStock} ${product.unit}`, 'error');
        return;
    }
    
    // Perform the transfer using branch stock functions if available
    if (typeof adjustBranchStock === 'function') {
        // Decrease from source
        adjustBranchStock(productId, fromOutletId, -quantity);
        // Increase at destination
        adjustBranchStock(productId, toOutletId, quantity);
    }
    
    // Record stock movements for both outlets
    recordStockMovement({
        productId: productId,
        productName: product.name,
        type: 'transfer-out',
        quantity: -quantity,
        reason: 'Transfer',
        notes: `Transferred to ${toOutletName}. ${notes}`,
        reference: `TRF-${Date.now()}`
    });
    
    recordStockMovement({
        productId: productId,
        productName: product.name,
        type: 'transfer-in',
        quantity: quantity,
        reason: 'Transfer',
        notes: `Received from ${fromOutletName}. ${notes}`,
        reference: `TRF-${Date.now()}`
    });
    
    // Create a branch transfer record if available
    if (typeof branchTransfers !== 'undefined') {
        const transfer = {
            id: 'TRF_' + Date.now(),
            fromBranchId: fromOutletId,
            toBranchId: toOutletId,
            items: [{
                productId: productId,
                productName: product.name,
                quantity: quantity,
                unit: product.unit
            }],
            status: 'completed',
            notes: notes,
            createdAt: new Date().toISOString(),
            completedAt: new Date().toISOString()
        };
        branchTransfers.push(transfer);
        if (typeof saveBranchData === 'function') {
            saveBranchData();
        }
    }
    
    saveProducts();
    renderProducts();
    renderStockMovements();
    updateStockStats();
    
    // Refresh branch views if available
    if (typeof renderTransfers === 'function') {
        renderTransfers();
    }
    
    closeModal('stockAdjustmentModal');
    showToast(`Transferred ${quantity} ${product.unit} of ${product.name} from ${fromOutletName} to ${toOutletName}`, 'success');
}

// ==================== STOCK MOVEMENT RECORDING ====================
function recordStockMovement(data) {
    const movement = {
        id: generateUUID(),
        date: new Date().toISOString(),
        productId: data.productId,
        productName: data.productName,
        type: data.type, // 'in', 'out', 'adjustment', 'sale'
        quantity: data.quantity,
        reason: data.reason || '',
        reference: data.reference || '',
        notes: data.notes || ''
    };
    
    stockMovements.unshift(movement);
    saveStockMovements();
}

// ==================== QUICK REORDER PROCESSING ====================
function processQuickReorder(event, productId, supplierId) {
    event.preventDefault();
    
    const product = products.find(p => p.id === productId);
    const supplier = typeof suppliers !== 'undefined' ? suppliers.find(s => s.id === supplierId) : null;
    
    if (!product || !supplier) {
        showToast('Product or supplier not found', 'error');
        return;
    }
    
    const quantity = parseInt(document.getElementById('reorderQuantity').value) || 0;
    const unitCost = parseFloat(document.getElementById('reorderUnitCost').value) || 0;
    const notes = document.getElementById('reorderNotes').value.trim();
    const addStock = document.getElementById('reorderAddStock').checked;
    const totalAmount = quantity * unitCost;
    
    // Add purchase to supplier
    if (typeof addPurchaseToSupplier === 'function' || typeof linkPurchaseToSupplier === 'function') {
        const purchaseData = {
            date: new Date().toISOString().split('T')[0],
            description: `Reorder: ${product.name} x ${quantity}`,
            amount: totalAmount,
            invoice: notes || '',
            paid: false
        };
        
        if (!supplier.purchaseHistory) supplier.purchaseHistory = [];
        supplier.purchaseHistory.unshift({
            id: generateUUID(),
            ...purchaseData
        });
        supplier.totalPurchases = (parseFloat(supplier.totalPurchases) || 0) + totalAmount;
        supplier.outstandingBalance = (parseFloat(supplier.outstandingBalance) || 0) + totalAmount;
        supplier.lastPurchaseDate = purchaseData.date;
        
        if (typeof saveSuppliers === 'function') saveSuppliers();
    }
    
    // Add stock if checkbox is checked
    if (addStock) {
        product.stock += quantity;
        
        // Record stock movement
        if (typeof recordStockMovement === 'function') {
            recordStockMovement({
                productId: productId,
                productName: product.name,
                type: 'in',
                quantity: quantity,
                reason: 'Purchase',
                reference: `Reorder from ${supplier.company || supplier.name}`,
                notes: notes
            });
        }
        
        // Record expense transaction
        if (typeof businessData !== 'undefined' && businessData.transactions) {
            const expenseTransaction = {
                id: generateUUID(),
                date: new Date().toISOString().split('T')[0],
                amount: totalAmount,
                category: 'Inventory Purchase',
                description: `Reorder: ${product.name} (${quantity} ${product.unit}) from ${supplier.company || supplier.name}`,
                type: 'expense',
                vendor: supplier.company || supplier.name,
                reference: notes,
                timestamp: new Date().toISOString()
            };
            businessData.transactions.push(expenseTransaction);
            if (typeof saveData === 'function') saveData();
        }
        
        saveProducts();
    }
    
    // Create bill to pay
    if (!addStock && typeof businessData !== 'undefined') {
        const termDays = parseInt(supplier.paymentTerms) || 30;
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + termDays);
        
        const bill = {
            id: generateUUID(),
            name: `Reorder: ${product.name} x ${quantity}`,
            amount: totalAmount,
            dueDate: dueDate.toISOString().split('T')[0],
            category: 'Inventory Purchase',
            vendor: supplier.company || supplier.name,
            status: 'pending',
            recurring: false,
            reference: notes,
            supplierId: supplierId,
            timestamp: new Date().toISOString()
        };
        
        if (!businessData.bills) businessData.bills = [];
        businessData.bills.push(bill);
        if (typeof saveData === 'function') saveData();
        if (typeof loadBills === 'function') loadBills();
    }
    
    closeModal('quickReorderModal');
    renderLowStockAlerts();
    renderProducts();
    updateStockStats();
    
    showToast(`Reorder for ${quantity} ${product.unit} of ${product.name} created!`, 'success');
}

// ==================== STOCK STATS ====================
function updateStockStats() {
    // Stats are updated via inventory stats
    if (typeof updateInventoryStats === 'function') {
        updateInventoryStats();
    }
}

// ==================== HELPERS ====================
function capitalizeFirst(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

function formatStockDate(date) {
    return date.toLocaleDateString('en-MY', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function getMovementTypeClass(type) {
    switch (type) {
        case 'in': return 'type-in';
        case 'out': return 'type-out';
        case 'sale': return 'type-sale';
        case 'adjustment': return 'type-adjustment';
        case 'transfer_out': return 'type-out';
        case 'transfer_in': return 'type-in';
        default: return '';
    }
}

function getMovementTypeIcon(type) {
    switch (type) {
        case 'in': return 'fa-arrow-down';
        case 'out': return 'fa-arrow-up';
        case 'sale': return 'fa-shopping-cart';
        case 'adjustment': return 'fa-edit';
        case 'transfer_out': return 'fa-truck-loading';
        case 'transfer_in': return 'fa-dolly';
        default: return 'fa-exchange-alt';
    }
}

// Export functions to window
window.initializeStock = initializeStock;
window.loadStockMovements = loadStockMovements;
window.saveStockMovements = saveStockMovements;
window.saveStockAdjustment = saveStockAdjustment;
window.handleOutletTransfer = handleOutletTransfer;
window.recordStockMovement = recordStockMovement;
window.processQuickReorder = processQuickReorder;
window.updateStockStats = updateStockStats;
window.capitalizeFirst = capitalizeFirst;
window.formatStockDate = formatStockDate;
window.getMovementTypeClass = getMovementTypeClass;
window.getMovementTypeIcon = getMovementTypeIcon;
