/**
 * BRANCHES-TRANSFERS.JS
 * Multi-Branch Management Module - Transfers
 * Transfer CRUD, Confirm, Complete, Cancel
 * Version: 2.2.7 - Modular Split - 26 Dec 2025
 */

// ==================== TRANSFER MODAL ====================
function showTransferModal(transferId = null) {
    const modal = document.getElementById('transfer-modal');
    const title = document.getElementById('transfer-modal-title');
    const form = document.getElementById('transfer-form');
    
    if (!modal) return;
    
    const activeBranches = branches.filter(b => b.status === 'active');
    
    // Populate branch dropdowns
    const fromSelect = document.getElementById('transfer-from-branch');
    const toSelect = document.getElementById('transfer-to-branch');
    
    if (fromSelect && toSelect) {
        fromSelect.innerHTML = activeBranches.map(b => 
            `<option value="${b.id}">${escapeHTML(b.name)}</option>`
        ).join('');
        
        toSelect.innerHTML = activeBranches.map(b => 
            `<option value="${b.id}">${escapeHTML(b.name)}</option>`
        ).join('');
    }
    
    if (transferId) {
        const transfer = branchTransfers.find(t => t.id === transferId);
        if (!transfer) return;
        
        title.textContent = 'Edit Transfer';
        document.getElementById('transfer-id').value = transfer.id;
        fromSelect.value = transfer.fromBranch;
        toSelect.value = transfer.toBranch;
        document.getElementById('transfer-notes').value = transfer.notes || '';
        
        // Load items
        renderTransferItems(transfer.items || []);
    } else {
        title.textContent = 'New Stock Transfer';
        form.reset();
        document.getElementById('transfer-id').value = '';
        document.getElementById('transfer-number').value = generateTransferNumber();
        
        // Clear items
        renderTransferItems([]);
    }
    
    modal.classList.add('active');
    updateTransferProducts();
}

function closeTransferModal() {
    const modal = document.getElementById('transfer-modal');
    if (modal) modal.classList.remove('active');
}

// ==================== TRANSFER ITEMS ====================
let currentTransferItems = [];

function renderTransferItems(items = []) {
    currentTransferItems = items;
    const container = document.getElementById('transfer-items-list');
    if (!container) return;
    
    if (items.length === 0) {
        container.innerHTML = `
            <div class="empty-state small">
                <p>No items added yet</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = items.map((item, index) => `
        <div class="transfer-item">
            <div class="item-info">
                <span class="item-name">${escapeHTML(item.productName)}</span>
                <span class="item-sku">${escapeHTML(item.sku || '')}</span>
            </div>
            <div class="item-qty">
                <input type="number" value="${item.quantity}" min="1" 
                       onchange="updateTransferItemQty(${index}, this.value)">
            </div>
            <button class="btn btn-sm btn-danger" onclick="removeTransferItem(${index})">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `).join('');
    
    updateTransferTotal();
}

function addTransferItem() {
    const productSelect = document.getElementById('transfer-product');
    const qtyInput = document.getElementById('transfer-qty');
    
    if (!productSelect || !qtyInput) return;
    
    const productId = productSelect.value;
    const quantity = parseInt(qtyInput.value) || 1;
    
    if (!productId) {
        showNotification('Please select a product', 'warning');
        return;
    }
    
    // Get product details
    const products = window.products || [];
    const product = products.find(p => p.id === productId);
    
    if (!product) {
        showNotification('Product not found', 'error');
        return;
    }
    
    // Check if already in list
    const existingIndex = currentTransferItems.findIndex(i => i.productId === productId);
    
    if (existingIndex !== -1) {
        currentTransferItems[existingIndex].quantity += quantity;
    } else {
        currentTransferItems.push({
            productId: product.id,
            productName: product.name,
            sku: product.sku || product.code || '',
            quantity: quantity,
            unitCost: product.cost || product.price || 0
        });
    }
    
    renderTransferItems(currentTransferItems);
    
    // Reset inputs
    productSelect.value = '';
    qtyInput.value = 1;
}

function removeTransferItem(index) {
    currentTransferItems.splice(index, 1);
    renderTransferItems(currentTransferItems);
}

function updateTransferItemQty(index, qty) {
    const quantity = parseInt(qty) || 1;
    if (currentTransferItems[index]) {
        currentTransferItems[index].quantity = quantity;
    }
    updateTransferTotal();
}

function updateTransferTotal() {
    const totalEl = document.getElementById('transfer-total-items');
    const valueEl = document.getElementById('transfer-total-value');
    
    if (totalEl) {
        const totalItems = currentTransferItems.reduce((sum, item) => sum + item.quantity, 0);
        totalEl.textContent = totalItems;
    }
    
    if (valueEl) {
        const totalValue = currentTransferItems.reduce((sum, item) => 
            sum + (item.quantity * (item.unitCost || 0)), 0);
        valueEl.textContent = formatRM(totalValue);
    }
}

function updateTransferProducts() {
    const productSelect = document.getElementById('transfer-product');
    const fromBranchId = document.getElementById('transfer-from-branch')?.value;
    
    if (!productSelect) return;
    
    const products = window.products || [];
    
    // Filter products with stock in source branch
    const availableProducts = products.filter(p => {
        if (!fromBranchId) return p.quantity > 0;
        const branchStock = getBranchStock(p.id, fromBranchId);
        return branchStock > 0;
    });
    
    productSelect.innerHTML = `
        <option value="">Select Product</option>
        ${availableProducts.map(p => {
            const stock = fromBranchId ? getBranchStock(p.id, fromBranchId) : p.quantity;
            return `<option value="${p.id}">${escapeHTML(p.name)} (${stock} in stock)</option>`;
        }).join('')}
    `;
}

// ==================== SAVE TRANSFER ====================
function saveTransfer() {
    const id = document.getElementById('transfer-id').value;
    const transferNumber = document.getElementById('transfer-number').value;
    const fromBranch = document.getElementById('transfer-from-branch').value;
    const toBranch = document.getElementById('transfer-to-branch').value;
    const notes = document.getElementById('transfer-notes').value.trim();
    
    if (!fromBranch || !toBranch) {
        showNotification('Please select source and destination branches', 'error');
        return;
    }
    
    if (fromBranch === toBranch) {
        showNotification('Source and destination must be different', 'error');
        return;
    }
    
    if (currentTransferItems.length === 0) {
        showNotification('Please add at least one item', 'error');
        return;
    }
    
    // Validate stock availability
    for (const item of currentTransferItems) {
        const available = getBranchStock(item.productId, fromBranch);
        if (available < item.quantity) {
            showNotification(`Insufficient stock for ${item.productName} (${available} available)`, 'error');
            return;
        }
    }
    
    if (id) {
        // Update existing
        const index = branchTransfers.findIndex(t => t.id === id);
        if (index !== -1) {
            branchTransfers[index] = {
                ...branchTransfers[index],
                fromBranch, toBranch, notes,
                items: currentTransferItems,
                updatedAt: new Date().toISOString()
            };
            showNotification('Transfer updated successfully', 'success');
        }
    } else {
        // Create new
        const newTransfer = {
            id: 'TRANSFER_' + Date.now(),
            transferNumber,
            fromBranch,
            toBranch,
            items: currentTransferItems,
            notes,
            status: 'pending',
            createdBy: window.currentUser?.username || 'Unknown',
            createdAt: new Date().toISOString()
        };
        branchTransfers.push(newTransfer);
        showNotification('Transfer created successfully', 'success');
    }
    
    saveBranchData();
    renderTransfers();
    updateBranchStats();
    closeTransferModal();
}

// ==================== RENDER TRANSFERS ====================
function renderTransfers(statusFilter = null) {
    const container = document.getElementById('transfer-list');
    if (!container) return;
    
    let filtered = branchTransfers;
    if (statusFilter && statusFilter !== 'all') {
        filtered = branchTransfers.filter(t => t.status === statusFilter);
    }
    
    // Sort by date descending
    filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    if (filtered.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-exchange-alt"></i>
                <p>No transfers found</p>
                <button class="btn btn-primary" onclick="showTransferModal()">
                    <i class="fas fa-plus"></i> Create Transfer
                </button>
            </div>
        `;
        return;
    }
    
    container.innerHTML = filtered.map(transfer => {
        const fromBranch = branches.find(b => b.id === transfer.fromBranch);
        const toBranch = branches.find(b => b.id === transfer.toBranch);
        const totalItems = transfer.items?.reduce((sum, i) => sum + i.quantity, 0) || 0;
        
        return `
            <div class="transfer-card ${transfer.status}">
                <div class="transfer-header">
                    <div class="transfer-number">
                        <strong>${escapeHTML(transfer.transferNumber)}</strong>
                        <span class="transfer-date">${formatDate(transfer.createdAt)}</span>
                    </div>
                    <span class="status-badge ${transfer.status}">${transfer.status}</span>
                </div>
                <div class="transfer-route">
                    <span class="from-branch">${escapeHTML(fromBranch?.name || 'Unknown')}</span>
                    <i class="fas fa-arrow-right"></i>
                    <span class="to-branch">${escapeHTML(toBranch?.name || 'Unknown')}</span>
                </div>
                <div class="transfer-summary">
                    <span><i class="fas fa-boxes"></i> ${totalItems} items</span>
                </div>
                <div class="transfer-actions">
                    <button class="btn btn-sm btn-outline" onclick="viewTransferDetails('${transfer.id}')">
                        <i class="fas fa-eye"></i> View
                    </button>
                    ${transfer.status === 'pending' ? `
                        <button class="btn btn-sm btn-success" onclick="confirmTransfer('${transfer.id}')">
                            <i class="fas fa-check"></i> Confirm
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="cancelTransfer('${transfer.id}')">
                            <i class="fas fa-times"></i> Cancel
                        </button>
                    ` : ''}
                    ${transfer.status === 'in-transit' ? `
                        <button class="btn btn-sm btn-success" onclick="completeTransfer('${transfer.id}')">
                            <i class="fas fa-check-double"></i> Complete
                        </button>
                    ` : ''}
                </div>
            </div>
        `;
    }).join('');
}

// ==================== CONFIRM TRANSFER ====================
function confirmTransfer(transferId) {
    const transfer = branchTransfers.find(t => t.id === transferId);
    if (!transfer || transfer.status !== 'pending') return;
    
    if (!confirm('Confirm this transfer? Stock will be deducted from source branch.')) return;
    
    // Deduct stock from source branch
    for (const item of transfer.items) {
        adjustBranchStock(item.productId, transfer.fromBranch, -item.quantity);
    }
    
    transfer.status = 'in-transit';
    transfer.confirmedAt = new Date().toISOString();
    transfer.confirmedBy = window.currentUser?.username || 'Unknown';
    
    saveBranchData();
    renderTransfers();
    updateBranchStats();
    
    showNotification('Transfer confirmed and in transit', 'success');
}

// ==================== COMPLETE TRANSFER ====================
function completeTransfer(transferId) {
    const transfer = branchTransfers.find(t => t.id === transferId);
    if (!transfer || transfer.status !== 'in-transit') return;
    
    if (!confirm('Complete this transfer? Stock will be added to destination branch.')) return;
    
    // Add stock to destination branch
    for (const item of transfer.items) {
        adjustBranchStock(item.productId, transfer.toBranch, item.quantity);
    }
    
    transfer.status = 'completed';
    transfer.completedAt = new Date().toISOString();
    transfer.completedBy = window.currentUser?.username || 'Unknown';
    
    saveBranchData();
    renderTransfers();
    updateBranchStats();
    
    showNotification('Transfer completed successfully', 'success');
}

// ==================== CANCEL TRANSFER ====================
function cancelTransfer(transferId) {
    const transfer = branchTransfers.find(t => t.id === transferId);
    if (!transfer || transfer.status !== 'pending') return;
    
    if (!confirm('Cancel this transfer?')) return;
    
    transfer.status = 'cancelled';
    transfer.cancelledAt = new Date().toISOString();
    transfer.cancelledBy = window.currentUser?.username || 'Unknown';
    
    saveBranchData();
    renderTransfers();
    updateBranchStats();
    
    showNotification('Transfer cancelled', 'info');
}

// ==================== VIEW TRANSFER DETAILS ====================
function viewTransferDetails(transferId) {
    const transfer = branchTransfers.find(t => t.id === transferId);
    if (!transfer) return;
    
    const modal = document.getElementById('transfer-detail-modal');
    const content = document.getElementById('transfer-detail-content');
    
    if (!modal || !content) {
        // Fallback to alert
        alert(JSON.stringify(transfer, null, 2));
        return;
    }
    
    const fromBranch = branches.find(b => b.id === transfer.fromBranch);
    const toBranch = branches.find(b => b.id === transfer.toBranch);
    const totalValue = transfer.items?.reduce((sum, i) => sum + (i.quantity * (i.unitCost || 0)), 0) || 0;
    
    content.innerHTML = `
        <div class="transfer-detail-header">
            <h2>${escapeHTML(transfer.transferNumber)}</h2>
            <span class="status-badge ${transfer.status}">${transfer.status}</span>
        </div>
        
        <div class="transfer-route-detail">
            <div class="route-branch from">
                <i class="fas fa-warehouse"></i>
                <span>From</span>
                <strong>${escapeHTML(fromBranch?.name || 'Unknown')}</strong>
            </div>
            <div class="route-arrow">
                <i class="fas fa-long-arrow-alt-right"></i>
            </div>
            <div class="route-branch to">
                <i class="fas fa-warehouse"></i>
                <span>To</span>
                <strong>${escapeHTML(toBranch?.name || 'Unknown')}</strong>
            </div>
        </div>
        
        <div class="transfer-items-detail">
            <h4>Transfer Items</h4>
            <table class="detail-table">
                <thead>
                    <tr>
                        <th>Product</th>
                        <th>SKU</th>
                        <th>Quantity</th>
                        <th>Unit Cost</th>
                        <th>Total</th>
                    </tr>
                </thead>
                <tbody>
                    ${(transfer.items || []).map(item => `
                        <tr>
                            <td>${escapeHTML(item.productName)}</td>
                            <td>${escapeHTML(item.sku || '-')}</td>
                            <td>${item.quantity}</td>
                            <td>${formatRM(item.unitCost || 0)}</td>
                            <td>${formatRM(item.quantity * (item.unitCost || 0))}</td>
                        </tr>
                    `).join('')}
                </tbody>
                <tfoot>
                    <tr>
                        <td colspan="4"><strong>Total Value</strong></td>
                        <td><strong>${formatRM(totalValue)}</strong></td>
                    </tr>
                </tfoot>
            </table>
        </div>
        
        <div class="transfer-timeline">
            <h4>Timeline</h4>
            <div class="timeline">
                <div class="timeline-item">
                    <i class="fas fa-plus-circle"></i>
                    <span>Created by ${escapeHTML(transfer.createdBy || 'Unknown')} on ${formatDate(transfer.createdAt)}</span>
                </div>
                ${transfer.confirmedAt ? `
                    <div class="timeline-item">
                        <i class="fas fa-check-circle"></i>
                        <span>Confirmed by ${escapeHTML(transfer.confirmedBy || 'Unknown')} on ${formatDate(transfer.confirmedAt)}</span>
                    </div>
                ` : ''}
                ${transfer.completedAt ? `
                    <div class="timeline-item">
                        <i class="fas fa-check-double"></i>
                        <span>Completed by ${escapeHTML(transfer.completedBy || 'Unknown')} on ${formatDate(transfer.completedAt)}</span>
                    </div>
                ` : ''}
                ${transfer.cancelledAt ? `
                    <div class="timeline-item cancelled">
                        <i class="fas fa-times-circle"></i>
                        <span>Cancelled by ${escapeHTML(transfer.cancelledBy || 'Unknown')} on ${formatDate(transfer.cancelledAt)}</span>
                    </div>
                ` : ''}
            </div>
        </div>
        
        ${transfer.notes ? `
            <div class="transfer-notes">
                <h4>Notes</h4>
                <p>${escapeHTML(transfer.notes)}</p>
            </div>
        ` : ''}
    `;
    
    modal.classList.add('active');
}

function closeTransferDetailModal() {
    const modal = document.getElementById('transfer-detail-modal');
    if (modal) modal.classList.remove('active');
}

// ==================== EXPORT TO WINDOW ====================
window.showTransferModal = showTransferModal;
window.closeTransferModal = closeTransferModal;
window.renderTransferItems = renderTransferItems;
window.addTransferItem = addTransferItem;
window.removeTransferItem = removeTransferItem;
window.updateTransferItemQty = updateTransferItemQty;
window.updateTransferTotal = updateTransferTotal;
window.updateTransferProducts = updateTransferProducts;
window.saveTransfer = saveTransfer;
window.renderTransfers = renderTransfers;
window.confirmTransfer = confirmTransfer;
window.completeTransfer = completeTransfer;
window.cancelTransfer = cancelTransfer;
window.viewTransferDetails = viewTransferDetails;
window.closeTransferDetailModal = closeTransferDetailModal;
