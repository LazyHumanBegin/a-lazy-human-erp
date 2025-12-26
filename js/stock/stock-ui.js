/**
 * EZCubic Smart Accounting - Stock UI Module
 * Rendering: Modals, tabs, movements list, low stock alerts, valuation
 * Split from stock.js for v2.3.1
 */

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
    
    const fromDate = document.getElementById('stockDateFrom')?.value;
    const toDate = document.getElementById('stockDateTo')?.value;
    const typeFilter = document.getElementById('movementTypeFilter')?.value;
    
    let filtered = stockMovements.filter(m => {
        const date = new Date(m.date);
        const matchesDate = (!fromDate || date >= new Date(fromDate)) && 
                           (!toDate || date <= new Date(toDate + 'T23:59:59'));
        const matchesType = !typeFilter || m.type === typeFilter;
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
    
    const formatDate = window.formatStockDate || function(date) {
        return date.toLocaleDateString('en-MY', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };
    
    const getTypeClass = window.getMovementTypeClass || function() { return ''; };
    const getTypeIcon = window.getMovementTypeIcon || function() { return 'fa-exchange-alt'; };
    const capitalize = window.capitalizeFirst || function(str) { return str.charAt(0).toUpperCase() + str.slice(1); };
    
    tbody.innerHTML = filtered.map(movement => {
        const typeClass = getTypeClass(movement.type);
        const typeIcon = getTypeIcon(movement.type);
        
        return `
            <tr>
                <td>${formatDate(new Date(movement.date))}</td>
                <td>${escapeHtml(movement.productName)}</td>
                <td>
                    <span class="movement-type ${typeClass}">
                        <i class="fas ${typeIcon}"></i> ${capitalize(movement.type)}
                    </span>
                </td>
                <td class="${movement.quantity >= 0 ? 'positive' : 'negative'}">
                    ${movement.quantity >= 0 ? '+' : ''}${movement.quantity}
                </td>
                <td>${movement.reference || '-'}</td>
                <td>${movement.notes || movement.reason || '-'}</td>
            </tr>
        `;
    }).join('');
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

// ==================== STOCK VALUATION ====================
function renderStockValuation() {
    const costValue = products.reduce((sum, p) => sum + (p.cost * p.stock), 0);
    const retailValue = products.reduce((sum, p) => sum + (p.price * p.stock), 0);
    const potentialProfit = retailValue - costValue;
    
    const costEl = document.getElementById('totalCostValue');
    const retailEl = document.getElementById('totalRetailValue');
    const profitEl = document.getElementById('potentialProfit');
    
    if (costEl) costEl.textContent = formatMYR(costValue);
    if (retailEl) retailEl.textContent = formatMYR(retailValue);
    if (profitEl) profitEl.textContent = formatMYR(potentialProfit);
    
    // Category breakdown
    const categoryValuation = {};
    products.forEach(p => {
        if (!categoryValuation[p.category]) {
            categoryValuation[p.category] = { cost: 0, retail: 0, count: 0 };
        }
        categoryValuation[p.category].cost += p.cost * p.stock;
        categoryValuation[p.category].retail += p.price * p.stock;
        categoryValuation[p.category].count += p.stock;
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

// Export functions to window
window.showStockAdjustmentModal = showStockAdjustmentModal;
window.populateTransferOutlets = populateTransferOutlets;
window.toggleTransferFields = toggleTransferFields;
window.updateOutletStockInfo = updateOutletStockInfo;
window.showCurrentStock = showCurrentStock;
window.showStockTab = showStockTab;
window.setDefaultStockDates = setDefaultStockDates;
window.filterStockMovements = filterStockMovements;
window.renderStockMovements = renderStockMovements;
window.renderLowStockAlerts = renderLowStockAlerts;
window.quickReorderFromSupplier = quickReorderFromSupplier;
window.updateReorderTotal = updateReorderTotal;
window.renderStockValuation = renderStockValuation;
