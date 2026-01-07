/**
 * EZCubic Phase 2 - Stock Management Module
 * Stock movements, adjustments, low stock alerts, valuation
 */

// STOCK_MOVEMENTS_KEY and stockMovements declared in stock-manager.js

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

// ==================== STOCK ADJUSTMENT MODAL ====================
function showStockAdjustmentModal() {
    const modal = document.getElementById('stockAdjustmentModal');
    const select = document.getElementById('adjustProductId');
    
    // Populate products dropdown
    select.innerHTML = '<option value="">Select Product</option>' +
        products.map(p => `<option value="${p.id}">${p.name} (${p.stock} ${p.unit})</option>`).join('');
    
    // Reset form
    document.getElementById('stockAdjustmentForm').reset();
    document.getElementById('currentStockDisplay').value = '';
    document.getElementById('currentStockDisplay').placeholder = 'Select a product';
    
    // Populate outlet dropdowns for transfer
    populateTransferOutlets();
    
    // Hide transfer fields initially
    toggleTransferFields();
    
    modal.style.display = '';
    modal.classList.add('show');
}

function populateTransferOutlets() {
    const fromSelect = document.getElementById('transferFromOutlet');
    const toSelect = document.getElementById('transferToOutlet');
    
    if (!fromSelect || !toSelect) return;
    
    // Get outlets from branches or POS outlets
    let outlets = [];
    if (typeof branches !== 'undefined' && branches.length > 0) {
        outlets = branches.filter(b => b.status === 'active').map(b => ({
            id: b.id,
            name: b.name,
            code: b.code
        }));
    } else if (typeof posOutlets !== 'undefined' && posOutlets.length > 0) {
        outlets = posOutlets.filter(o => o.status === 'active').map(o => ({
            id: o.id,
            name: o.name,
            code: o.code || o.id
        }));
    }
    
    const optionsHtml = '<option value="">Select Outlet</option>' +
        outlets.map(o => `<option value="${o.id}">${o.name} (${o.code})</option>`).join('');
    
    fromSelect.innerHTML = optionsHtml;
    toSelect.innerHTML = optionsHtml;
}

function toggleTransferFields() {
    const adjustmentType = document.getElementById('adjustmentType')?.value;
    const transferFields = document.getElementById('transferFields');
    const reasonGroup = document.getElementById('reasonGroup');
    const modalTitle = document.querySelector('#stockAdjustmentModal .modal-title');
    
    if (!transferFields) return;
    
    if (adjustmentType === 'transfer') {
        transferFields.style.display = 'block';
        if (reasonGroup) reasonGroup.style.display = 'none';
        if (modalTitle) modalTitle.textContent = 'Transfer Stock Between Outlets';
        
        // Add event listeners for outlet stock display
        const fromEl = document.getElementById('transferFromOutlet');
        const toEl = document.getElementById('transferToOutlet');
        if (fromEl) fromEl.onchange = updateOutletStockInfo;
        if (toEl) toEl.onchange = updateOutletStockInfo;
    } else {
        transferFields.style.display = 'none';
        if (reasonGroup) reasonGroup.style.display = 'block';
        if (modalTitle) modalTitle.textContent = 'Adjust Stock';
        const stockInfoEl = document.getElementById('outletStockInfo');
        if (stockInfoEl) stockInfoEl.style.display = 'none';
    }
}

function updateOutletStockInfo() {
    const adjustProductEl = document.getElementById('adjustProductId');
    const fromOutletEl = document.getElementById('transferFromOutlet');
    const toOutletEl = document.getElementById('transferToOutlet');
    const stockInfo = document.getElementById('outletStockInfo');
    
    // Early return if elements don't exist
    if (!adjustProductEl || !stockInfo) return;
    
    const productId = adjustProductEl.value;
    const fromOutlet = fromOutletEl?.value || '';
    const toOutlet = toOutletEl?.value || '';
    
    if (!productId) return;
    
    const product = products.find(p => p.id === productId);
    if (!product) return;
    
    // Show stock info panel
    if (fromOutlet || toOutlet) {
        stockInfo.style.display = 'block';
        
        // Get branch stock if available
        if (typeof getBranchStock === 'function') {
            const sourceStock = fromOutlet ? getBranchStock(productId, fromOutlet) : '-';
            const destStock = toOutlet ? getBranchStock(productId, toOutlet) : '-';
            
            document.getElementById('sourceOutletStock').textContent = 
                fromOutlet ? `${sourceStock} ${product.unit}` : '-';
            document.getElementById('destOutletStock').textContent = 
                toOutlet ? `${destStock} ${product.unit}` : '-';
        } else {
            // Fallback to total stock
            document.getElementById('sourceOutletStock').textContent = `${product.stock} ${product.unit}`;
            document.getElementById('destOutletStock').textContent = `${product.stock} ${product.unit}`;
        }
    } else {
        stockInfo.style.display = 'none';
    }
}

function showCurrentStock() {
    const productEl = document.getElementById('adjustProductId');
    const display = document.getElementById('currentStockDisplay');
    
    if (!productEl || !display) return;
    
    const productId = productEl.value;
    
    if (productId) {
        const product = products.find(p => p.id === productId);
        if (product) {
            display.value = `${product.stock} ${product.unit}`;
        }
        // Also update outlet stock info if transfer mode
        updateOutletStockInfo();
    } else {
        display.value = '';
        display.placeholder = 'Select a product';
    }
}

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
    
    // ===== USE CENTRALIZED STOCK MANAGER =====
    let quantityChange = 0;
    let adjustReason = 'adjustment';
    
    switch (adjustmentType) {
        case 'in':
            quantityChange = quantity;
            adjustReason = reason || 'stock-in';
            break;
        case 'out':
            const available = typeof getAvailableStock === 'function' 
                ? getAvailableStock(productId) 
                : product.stock;
            if (quantity > available) {
                showToast('Cannot remove more than current stock!', 'error');
                return;
            }
            quantityChange = -quantity;
            adjustReason = reason || 'stock-out';
            break;
        case 'set':
            const currentStock = typeof getAvailableStock === 'function' 
                ? getAvailableStock(productId) 
                : product.stock;
            quantityChange = quantity - currentStock;
            adjustReason = 'adjustment';
            break;
    }
    
    // Use central stock manager if available
    if (typeof updateProductStock === 'function') {
        const result = updateProductStock(productId, null, quantityChange, adjustReason, {
            notes: notes,
            reference: `ADJ-${Date.now()}`
        });
        
        if (!result.success) {
            showToast(result.error || 'Stock adjustment failed', 'error');
            return;
        }
    } else {
        // Fallback: direct update
        const index = products.findIndex(p => p.id === productId);
        if (index !== -1) {
            products[index].stock = Math.max(0, products[index].stock + quantityChange);
            products[index].updatedAt = new Date().toISOString();
        }
        
        // Record stock movement (legacy)
        recordStockMovement({
            productId: productId,
            productName: product.name,
            type: adjustmentType === 'set' ? 'adjustment' : adjustmentType,
            quantity: quantityChange,
            reason: reason,
            notes: notes
        });
        
        saveProducts();
    }
    
    // ==================== COGS ACCOUNTING (v2.8.2) ====================
    // Stock In: NO immediate expense - inventory is an ASSET
    // Cost will be recorded as COGS (Cost of Goods Sold) when item is SOLD
    // This is proper accrual accounting method
    if (adjustmentType === 'in' && product.cost > 0) {
        const purchaseCost = product.cost * quantity;
        // Just log for reference - no expense recorded
        console.log(`📦 Stock In: ${quantity}x ${product.name} @ RM${product.cost} = RM${purchaseCost} (added to inventory asset)`);
        showToast(`Stock in: ${quantity}x ${product.name} added to inventory (Cost: RM${purchaseCost.toFixed(2)})`, 'info');
    }
    
    // Stock Out: Record COGS expense when items leave inventory
    if (adjustmentType === 'out' && product.cost > 0) {
        const cogsCost = product.cost * quantity;
        const cogsTransaction = {
            id: generateUUID(),
            date: new Date().toISOString().split('T')[0],
            amount: cogsCost,
            category: 'Cost of Goods Sold',
            description: `COGS: ${product.name} (${quantity} ${product.unit || 'units'})`,
            type: 'expense',
            reference: `COGS-${Date.now().toString().slice(-6)}`,
            reason: reason || 'Stock Out',
            productId: product.id,
            productName: product.name,
            quantity: quantity,
            unitCost: product.cost,
            timestamp: new Date().toISOString(),
            createdBy: window.currentUser?.name || 'System'
        };
        if (typeof businessData !== 'undefined' && businessData.transactions) {
            businessData.transactions.push(cogsTransaction);
        } else if (typeof transactions !== 'undefined') {
            transactions.push(cogsTransaction);
        }
        saveData();
        
        console.log(`📤 Stock Out: ${quantity}x ${product.name} - COGS RM${cogsCost.toFixed(2)} recorded`);
        showToast(`COGS: RM${cogsCost.toFixed(2)} recorded for ${product.name}`, 'info');
    }
    
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
    
    // Check source stock using central function
    let sourceStock = typeof getAvailableStock === 'function' 
        ? getAvailableStock(productId, fromOutletId)
        : product.stock;
    
    if (quantity > sourceStock) {
        showToast(`Insufficient stock at ${fromOutletName}. Available: ${sourceStock} ${product.unit}`, 'error');
        return;
    }
    
    // ===== USE CENTRALIZED TRANSFER FUNCTION =====
    if (typeof transferStock === 'function') {
        const result = transferStock(productId, fromOutletId, toOutletId, quantity, notes);
        
        if (!result.success) {
            showToast(result.error || 'Transfer failed', 'error');
            return;
        }
    } else {
        // Fallback: use adjustBranchStock if available
        if (typeof adjustBranchStock === 'function') {
            adjustBranchStock(productId, fromOutletId, -quantity);
            adjustBranchStock(productId, toOutletId, quantity);
        }
        
        // Record stock movements (legacy)
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
        
        saveProducts();
    }
    
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

// ==================== STOCK TABS ====================
function showStockTab(tabName) {
    // Hide all tabs
    document.querySelectorAll('.stock-tab').forEach(tab => {
        tab.style.display = 'none';
        tab.classList.remove('active');
    });
    
    // Update buttons
    document.querySelectorAll('#stock .view-toggle-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.closest('.view-toggle-btn').classList.add('active');
    
    // Show selected tab
    const tab = document.getElementById(`${tabName}Tab`);
    if (tab) {
        tab.style.display = 'block';
        tab.classList.add('active');
    }
    
    // Load tab content
    switch (tabName) {
        case 'movements':
            renderStockMovements();
            break;
        case 'lowstock':
            renderLowStockAlerts();
            break;
        case 'valuation':
            renderStockValuation();
            break;
    }
}

// ==================== STOCK MOVEMENTS TAB ====================
function setDefaultStockDates() {
    const today = new Date();
    const monthAgo = new Date(today.getFullYear(), today.getMonth() - 1, today.getDate());
    
    const fromInput = document.getElementById('stockDateFrom');
    const toInput = document.getElementById('stockDateTo');
    
    if (fromInput) fromInput.value = monthAgo.toISOString().split('T')[0];
    if (toInput) toInput.value = today.toISOString().split('T')[0];
}

function filterStockMovements() {
    renderStockMovements();
}

function renderStockMovements() {
    const tbody = document.getElementById('stockMovementsBody');
    if (!tbody) return;
    
    // CRITICAL: Always sync from window.stockMovements before rendering
    // This ensures we see the latest movements recorded by batchUpdateStock
    if (Array.isArray(window.stockMovements) && window.stockMovements.length > 0) {
        stockMovements = window.stockMovements;
    }
    
    const fromDate = document.getElementById('stockDateFrom')?.value;
    const toDate = document.getElementById('stockDateTo')?.value;
    const typeFilter = document.getElementById('movementTypeFilter')?.value;
    
    let filtered = stockMovements.filter(m => {
        const movementDate = m.date || m.timestamp;
        const date = new Date(movementDate);
        const matchesDate = (!fromDate || date >= new Date(fromDate)) && 
                           (!toDate || date <= new Date(toDate + 'T23:59:59'));
        // Support both type and reason fields
        const movementType = m.type || m.reason || '';
        const matchesType = !typeFilter || movementType === typeFilter || 
                           movementType.replace('-', '_') === typeFilter ||
                           movementType.replace('_', '-') === typeFilter;
        return matchesDate && matchesType;
    });
    
    if (filtered.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" style="text-align: center; padding: 40px; color: #94a3b8;">
                    <i class="fas fa-exchange-alt" style="font-size: 48px; margin-bottom: 15px; opacity: 0.5;"></i>
                    <p>No stock movements found for the selected criteria</p>
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = filtered.map(movement => {
        // Support both old (type) and new (reason) field names
        const movementType = movement.type || movement.reason || 'adjustment';
        const typeClass = getMovementTypeClass(movementType);
        const typeIcon = getMovementTypeIcon(movementType);
        
        // Support both quantity and quantityChange - ensure it's a number
        let qty = movement.quantity !== undefined ? movement.quantity : movement.quantityChange;
        if (qty === undefined || qty === null) qty = 0; // Fallback to 0 if undefined
        
        // Get branch name if available
        const branchName = movement.branchId ? 
            (window.branches?.find(b => b.id === movement.branchId)?.name || movement.branchId) : '';
        
        return `
            <tr>
                <td>${formatDate(new Date(movement.date || movement.timestamp))}</td>
                <td>
                    ${escapeHtml(movement.productName)}
                    ${branchName ? `<br><small style="color:#64748b;">@ ${escapeHtml(branchName)}</small>` : ''}
                </td>
                <td>
                    <span class="movement-type ${typeClass}">
                        <i class="fas ${typeIcon}"></i> ${capitalizeFirst(movementType.replace('_', ' ').replace('-', ' '))}
                    </span>
                </td>
                <td class="${qty >= 0 ? 'positive' : 'negative'}">
                    ${qty >= 0 ? '+' : ''}${qty}
                </td>
                <td>${movement.reference || '-'}</td>
                <td>${movement.notes || movement.reason || '-'}</td>
            </tr>
        `;
    }).join('');
}

function getMovementTypeClass(type) {
    switch (type) {
        case 'in': 
        case 'stock-in':
        case 'purchase':
            return 'type-in';
        case 'out': 
        case 'stock-out':
            return 'type-out';
        case 'sale': return 'type-sale';
        case 'adjustment': return 'type-adjustment';
        case 'transfer_out': 
        case 'transfer-out':
            return 'type-out';
        case 'transfer_in': 
        case 'transfer-in':
            return 'type-in';
        default: return '';
    }
}

function getMovementTypeIcon(type) {
    switch (type) {
        case 'in': 
        case 'stock-in':
        case 'purchase':
            return 'fa-arrow-down';
        case 'out': 
        case 'stock-out':
            return 'fa-arrow-up';
        case 'sale': return 'fa-shopping-cart';
        case 'adjustment': return 'fa-edit';
        case 'transfer_out': 
        case 'transfer-out':
            return 'fa-truck-loading';
        case 'transfer_in': 
        case 'transfer-in':
            return 'fa-dolly';
        default: return 'fa-exchange-alt';
    }
}

// ==================== LOW STOCK ALERTS ====================
function renderLowStockAlerts() {
    const container = document.getElementById('lowStockGrid');
    if (!container) return;
    
    const lowStockProducts = products.filter(p => p.stock <= p.minStock);
    
    if (lowStockProducts.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-check-circle" style="color: #10b981;"></i>
                <h3>All Stock Levels OK</h3>
                <p>No products are below minimum stock level</p>
            </div>
        `;
        return;
    }
    
    // Sort by urgency (out of stock first, then by how far below min)
    lowStockProducts.sort((a, b) => {
        if (a.stock === 0 && b.stock > 0) return -1;
        if (b.stock === 0 && a.stock > 0) return 1;
        return (a.stock / a.minStock) - (b.stock / b.minStock);
    });
    
    container.innerHTML = `
        <div class="low-stock-list">
            ${lowStockProducts.map(product => {
                const urgencyClass = product.stock === 0 ? 'critical' : 'warning';
                const reorderQty = Math.max(0, (product.minStock * 2) - product.stock);
                
                // Get supplier info
                let supplierName = '';
                let supplierInfo = '';
                if (product.supplierId && typeof suppliers !== 'undefined') {
                    const supplier = suppliers.find(s => s.id === product.supplierId);
                    if (supplier) {
                        supplierName = supplier.company || supplier.name;
                        supplierInfo = `
                            <div class="supplier-tag">
                                <i class="fas fa-truck"></i> ${escapeHtml(supplierName)}
                            </div>
                        `;
                    }
                }
                
                return `
                    <div class="low-stock-item ${urgencyClass}">
                        <div class="low-stock-info">
                            <h4>${escapeHtml(product.name)}</h4>
                            ${supplierInfo}
                            <div class="stock-details">
                                <span class="current">Current: <strong>${product.stock} ${product.unit}</strong></span>
                                <span class="minimum">Minimum: ${product.minStock} ${product.unit}</span>
                            </div>
                        </div>
                        <div class="low-stock-actions">
                            <span class="suggested-reorder">Suggest reorder: ${reorderQty} ${product.unit}</span>
                            <div class="action-buttons">
                                ${product.supplierId ? `
                                    <button class="btn-outline btn-sm" onclick="quickReorderFromSupplier('${product.id}', ${reorderQty})" title="Reorder from ${escapeHtml(supplierName)}">
                                        <i class="fas fa-shopping-cart"></i> Reorder
                                    </button>
                                ` : ''}
                                <button class="btn-primary btn-sm" onclick="quickStockAdjust('${product.id}')">
                                    <i class="fas fa-plus"></i> Restock
                                </button>
                            </div>
                        </div>
                    </div>
                `;
            }).join('')}
        </div>
    `;
}

// Quick reorder from supplier
function quickReorderFromSupplier(productId, quantity) {
    const product = products.find(p => p.id === productId);
    if (!product || !product.supplierId) {
        showToast('No supplier linked to this product', 'error');
        return;
    }
    
    const supplier = typeof suppliers !== 'undefined' ? suppliers.find(s => s.id === product.supplierId) : null;
    if (!supplier) {
        showToast('Supplier not found', 'error');
        return;
    }
    
    const estimatedCost = product.cost * quantity;
    
    // Create a purchase from supplier
    const modalHtml = `
        <div class="modal show" id="quickReorderModal">
            <div class="modal-content" style="max-width: 500px;">
                <div class="modal-header">
                    <h3 class="modal-title"><i class="fas fa-shopping-cart"></i> Quick Reorder</h3>
                    <button class="modal-close" onclick="closeModal('quickReorderModal')">&times;</button>
                </div>
                <form onsubmit="processQuickReorder(event, '${productId}', '${supplier.id}')">
                    <div class="reorder-summary">
                        <div class="reorder-product">
                            <strong>${escapeHtml(product.name)}</strong>
                            <span class="sku">${product.sku}</span>
                        </div>
                        <div class="reorder-supplier">
                            <i class="fas fa-truck"></i> From: ${escapeHtml(supplier.company || supplier.name)}
                        </div>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Quantity to Order *</label>
                        <input type="number" id="reorderQuantity" class="form-control" value="${quantity}" min="1" required oninput="updateReorderTotal(${product.cost})">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Unit Cost (RM)</label>
                        <input type="number" id="reorderUnitCost" class="form-control" value="${product.cost.toFixed(2)}" step="0.01" min="0" oninput="updateReorderTotal()">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Estimated Total</label>
                        <input type="text" id="reorderTotal" class="form-control" value="RM ${estimatedCost.toFixed(2)}" readonly style="font-weight: bold; background: #f1f5f9;">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Notes</label>
                        <input type="text" id="reorderNotes" class="form-control" placeholder="PO number, delivery instructions...">
                    </div>
                    <div class="form-group">
                        <label>
                            <input type="checkbox" id="reorderAddStock" checked> Add to stock immediately (received)
                        </label>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn-secondary" onclick="closeModal('quickReorderModal')">Cancel</button>
                        <button type="submit" class="btn-primary">
                            <i class="fas fa-check"></i> Create Order
                        </button>
                    </div>
                </form>
            </div>
        </div>
    `;
    
    document.getElementById('quickReorderModal')?.remove();
    document.body.insertAdjacentHTML('beforeend', modalHtml);
}

function updateReorderTotal() {
    const qty = parseFloat(document.getElementById('reorderQuantity')?.value) || 0;
    const cost = parseFloat(document.getElementById('reorderUnitCost')?.value) || 0;
    const totalEl = document.getElementById('reorderTotal');
    if (totalEl) {
        totalEl.value = `RM ${(qty * cost).toFixed(2)}`;
    }
}

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

// Export functions
window.initializeStock = initializeStock;
window.showStockAdjustmentModal = showStockAdjustmentModal;
window.showCurrentStock = showCurrentStock;
window.saveStockAdjustment = saveStockAdjustment;
window.recordStockMovement = recordStockMovement;
window.showStockTab = showStockTab;
window.filterStockMovements = filterStockMovements;
window.renderStockMovements = renderStockMovements;
window.renderLowStockAlerts = renderLowStockAlerts;
window.renderStockValuation = renderStockValuation;
window.updateStockStats = updateStockStats;
window.quickReorderFromSupplier = quickReorderFromSupplier;
window.updateReorderTotal = updateReorderTotal;
window.processQuickReorder = processQuickReorder;
window.toggleTransferFields = toggleTransferFields;
window.populateTransferOutlets = populateTransferOutlets;
window.updateOutletStockInfo = updateOutletStockInfo;
window.handleOutletTransfer = handleOutletTransfer;

// ==================== STOCK VALUATION ====================
function renderStockValuation() {
    // CRITICAL: Sync from window.products to get latest stock values
    const productList = window.products || products || [];
    
    const costValue = productList.reduce((sum, p) => sum + (p.cost * p.stock), 0);
    const retailValue = productList.reduce((sum, p) => sum + (p.price * p.stock), 0);
    const potentialProfit = retailValue - costValue;
    
    const costEl = document.getElementById('totalCostValue');
    const retailEl = document.getElementById('totalRetailValue');
    const profitEl = document.getElementById('potentialProfit');
    
    if (costEl) costEl.textContent = formatMYR(costValue);
    if (retailEl) retailEl.textContent = formatMYR(retailValue);
    if (profitEl) profitEl.textContent = formatMYR(potentialProfit);
    
    // Category breakdown
    const categoryValuation = {};
    productList.forEach(p => {
        const category = p.category || 'Uncategorized'; // Fix: handle undefined category
        if (!categoryValuation[category]) {
            categoryValuation[category] = { cost: 0, retail: 0, count: 0 };
        }
        categoryValuation[category].cost += p.cost * p.stock;
        categoryValuation[category].retail += p.price * p.stock;
        categoryValuation[category].count += p.stock;
    });
    
    const container = document.getElementById('stockValuationChart');
    if (!container) return;
    
    const categories = Object.entries(categoryValuation).sort((a, b) => b[1].retail - a[1].retail);
    
    if (categories.length === 0) {
        container.innerHTML = `
            <div class="empty-state" style="margin-top: 20px;">
                <i class="fas fa-chart-pie" style="opacity: 0.5;"></i>
                <p>No products in inventory for valuation</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = `
        <h4 style="margin-bottom: 15px;">Valuation by Category</h4>
        <div class="valuation-breakdown">
            ${categories.map(([category, data]) => {
                const percentage = retailValue > 0 ? ((data.retail / retailValue) * 100).toFixed(1) : 0;
                return `
                    <div class="valuation-row">
                        <div class="valuation-category">
                            <span class="category-name">${category}</span>
                            <span class="category-count">${data.count} items</span>
                        </div>
                        <div class="valuation-bar-container">
                            <div class="valuation-bar" style="width: ${percentage}%"></div>
                        </div>
                        <div class="valuation-values">
                            <span class="cost-value">${formatMYR(data.cost)}</span>
                            <span class="retail-value">${formatMYR(data.retail)}</span>
                            <span class="percentage">${percentage}%</span>
                        </div>
                    </div>
                `;
            }).join('')}
        </div>
    `;
}

// ==================== STOCK STATS ====================
function updateStockStats() {
    // Stats are updated via inventory stats
    updateInventoryStats();
}

// ==================== HELPERS ====================
function capitalizeFirst(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

function formatDate(date) {
    return date.toLocaleDateString('en-MY', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Note: Stock module is initialized by app.js via initializePhase2Modules()
