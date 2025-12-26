// ==================== PURCHASE ORDERS UI ====================
// Modals, rendering, tabs, printing
// Version: 2.3.0 - Split from purchase-orders.js

// ==================== TAB NAVIGATION ====================
function showSupplierTab(tab) {
    document.querySelectorAll('#suppliers .tabs .tab').forEach(t => t.classList.remove('active'));
    event.currentTarget.classList.add('active');
    
    const suppliersSection = document.getElementById('suppliersSection');
    const purchaseOrdersSection = document.getElementById('purchaseOrdersSection');
    const receivingSection = document.getElementById('receivingSection');
    
    // Hide all sections
    if (suppliersSection) suppliersSection.style.display = 'none';
    if (purchaseOrdersSection) purchaseOrdersSection.style.display = 'none';
    if (receivingSection) receivingSection.style.display = 'none';
    
    if (tab === 'suppliers') {
        if (suppliersSection) suppliersSection.style.display = 'block';
        if (typeof renderSuppliers === 'function') {
            renderSuppliers();
        }
    } else if (tab === 'purchaseOrders') {
        if (purchaseOrdersSection) purchaseOrdersSection.style.display = 'block';
        syncPurchaseOrdersFromWindow();
        initializePurchaseOrders();
        loadPurchaseOrders();
    } else if (tab === 'receiving') {
        if (receivingSection) receivingSection.style.display = 'block';
        syncPurchaseOrdersFromWindow();
        loadPendingDeliveries();
        loadRecentReceipts();
        updateReceivingStats();
    }
}

// ==================== PURCHASE ORDER MODAL ====================
function showPurchaseOrderModal(poId = null) {
    const modal = document.getElementById('purchaseOrderModal');
    const title = document.getElementById('poModalTitle');
    const supplierSelect = document.getElementById('poSupplier');
    
    // Populate suppliers
    const suppliers = getSuppliersList();
    supplierSelect.innerHTML = '<option value="">Select Supplier</option>' +
        suppliers.filter(s => s.status === 'active')
            .map(s => `<option value="${s.id}">${escapeHTML(s.company || s.name)}</option>`).join('');
    
    if (poId) {
        const po = purchaseOrders.find(p => p.id === poId);
        if (po) {
            title.innerHTML = '<i class="fas fa-edit"></i> Edit Purchase Order';
            document.getElementById('poId').value = po.id;
            document.getElementById('poNumber').value = po.poNumber;
            document.getElementById('poDate').value = po.date;
            document.getElementById('poSupplier').value = po.supplierId;
            document.getElementById('poExpectedDelivery').value = po.expectedDelivery || '';
            document.getElementById('poRemarks').value = po.remarks || '';
            
            // Load items
            renderPOItems(po.items);
            updatePOTotals();
        }
    } else {
        title.innerHTML = '<i class="fas fa-file-invoice"></i> New Purchase Order';
        document.getElementById('purchaseOrderForm').reset();
        document.getElementById('poId').value = '';
        document.getElementById('poNumber').value = generatePONumber();
        document.getElementById('poDate').value = new Date().toISOString().slice(0, 10);
        
        // Clear items
        document.getElementById('poItemsContainer').innerHTML = '';
        addPOItem();
        updatePOTotals();
    }
    
    modal.style.display = 'flex';
}

function closePurchaseOrderModal() {
    document.getElementById('purchaseOrderModal').style.display = 'none';
}

// ==================== PO ITEMS UI ====================
// poItemCounter is defined in purchase-orders-core.js - use window reference
if (typeof poItemCounter === 'undefined') {
    var poItemCounter = 0;
}

function addPOItem(item = null) {
    const container = document.getElementById('poItemsContainer');
    const itemId = `poi_${++poItemCounter}`;
    
    // Get products for dropdown
    const products = JSON.parse(localStorage.getItem('ezcubic_inventory') || '[]');
    
    const itemHtml = `
        <div class="po-item-row" data-item-id="${itemId}" style="display: grid; grid-template-columns: 2fr 100px 100px 120px 40px; gap: 10px; padding: 10px; border-bottom: 1px solid #e2e8f0; align-items: center;">
            <div>
                <select class="form-control poi-product" onchange="onPOItemProductChange(this)" style="font-size: 13px;">
                    <option value="">Select Product or type description</option>
                    ${products.map(p => `<option value="${p.id}" data-price="${p.costPrice || p.price || 0}">${escapeHTML(p.name)} (${escapeHTML(p.sku || 'N/A')})</option>`).join('')}
                    <option value="_custom">-- Custom Item --</option>
                </select>
                <input type="text" class="form-control poi-description" placeholder="Custom description" style="display: none; margin-top: 5px; font-size: 13px;" value="${item?.description || ''}">
            </div>
            <input type="number" class="form-control poi-qty" min="1" value="${item?.quantity || 1}" oninput="updatePOTotals()" style="font-size: 13px;">
            <input type="number" class="form-control poi-price" min="0" step="0.01" value="${item?.unitPrice || ''}" oninput="updatePOTotals()" placeholder="0.00" style="font-size: 13px;">
            <div class="poi-total" style="font-weight: 600; text-align: right;">RM 0.00</div>
            <button type="button" class="btn-icon danger" onclick="removePOItem('${itemId}')" title="Remove">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `;
    
    container.insertAdjacentHTML('beforeend', itemHtml);
    
    // If editing with existing item data
    if (item && item.productId) {
        const row = container.querySelector(`[data-item-id="${itemId}"]`);
        const productSelect = row.querySelector('.poi-product');
        productSelect.value = item.productId;
        
        if (item.productId === '_custom') {
            row.querySelector('.poi-description').style.display = 'block';
        }
    }
    
    updatePOTotals();
}

function removePOItem(itemId) {
    const row = document.querySelector(`[data-item-id="${itemId}"]`);
    if (row) {
        row.remove();
        updatePOTotals();
    }
}

function onPOItemProductChange(select) {
    const row = select.closest('.po-item-row');
    const descInput = row.querySelector('.poi-description');
    const priceInput = row.querySelector('.poi-price');
    
    if (select.value === '_custom') {
        descInput.style.display = 'block';
        descInput.focus();
        priceInput.value = '';
    } else if (select.value) {
        descInput.style.display = 'none';
        const selectedOption = select.options[select.selectedIndex];
        const price = selectedOption.dataset.price || 0;
        priceInput.value = parseFloat(price).toFixed(2);
    } else {
        descInput.style.display = 'none';
    }
    
    updatePOTotals();
}

function onPOSupplierChange() {
    const supplierId = document.getElementById('poSupplier').value;
    if (supplierId) {
        const suppliers = getSuppliersList();
        const supplier = suppliers.find(s => s.id === supplierId);
        if (supplier) {
            console.log('Selected supplier:', supplier.company || supplier.name);
        }
    }
}

function renderPOItems(items) {
    const container = document.getElementById('poItemsContainer');
    container.innerHTML = '';
    poItemCounter = 0;
    
    items.forEach(item => addPOItem(item));
}

function updatePOTotals() {
    const rows = document.querySelectorAll('.po-item-row');
    let subtotal = 0;
    
    rows.forEach(row => {
        const qty = parseFloat(row.querySelector('.poi-qty').value) || 0;
        const price = parseFloat(row.querySelector('.poi-price').value) || 0;
        const total = qty * price;
        
        row.querySelector('.poi-total').textContent = `RM ${total.toFixed(2)}`;
        subtotal += total;
    });
    
    const tax = 0;
    const grandTotal = subtotal + tax;
    
    document.getElementById('poSubtotal').textContent = `RM ${subtotal.toFixed(2)}`;
    document.getElementById('poTax').textContent = `RM ${tax.toFixed(2)}`;
    document.getElementById('poTotal').textContent = `RM ${grandTotal.toFixed(2)}`;
}

// ==================== LOAD & RENDER PURCHASE ORDERS ====================
function loadPurchaseOrders() {
    const tbody = document.getElementById('purchaseOrdersBody');
    if (!tbody) return;
    
    const statusFilter = document.getElementById('poStatusFilter')?.value || '';
    const supplierFilter = document.getElementById('poSupplierFilter')?.value || '';
    const monthFilter = document.getElementById('poMonthFilter')?.value || '';
    
    let filtered = [...purchaseOrders].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    if (statusFilter) {
        filtered = filtered.filter(po => po.status === statusFilter);
    }
    
    if (supplierFilter) {
        filtered = filtered.filter(po => po.supplierId === supplierFilter);
    }
    
    if (monthFilter) {
        filtered = filtered.filter(po => po.date.startsWith(monthFilter));
    }
    
    if (filtered.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" style="text-align: center; color: #64748b; padding: 40px;">
                    <i class="fas fa-file-invoice" style="font-size: 40px; margin-bottom: 10px; display: block;"></i>
                    No purchase orders found
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = filtered.map(po => {
        const statusInfo = PO_STATUS[po.status] || { label: po.status, color: '#64748b' };
        const itemCount = po.items ? po.items.length : 0;
        
        return `
            <tr>
                <td><strong>${escapeHTML(po.poNumber)}</strong></td>
                <td>${formatDatePO(po.date)}</td>
                <td>${escapeHTML(po.supplierName)}</td>
                <td>${itemCount} item${itemCount !== 1 ? 's' : ''}</td>
                <td style="font-weight: 600;">RM ${po.total.toFixed(2)}</td>
                <td>
                    <span class="status-badge" style="background: ${statusInfo.color}20; color: ${statusInfo.color};">
                        ${statusInfo.label}
                    </span>
                </td>
                <td>
                    <button class="btn-icon" onclick="viewPurchaseOrder('${po.id}')" title="View">
                        <i class="fas fa-eye"></i>
                    </button>
                    ${['draft', 'pending'].includes(po.status) ? `
                        <button class="btn-icon" onclick="editPurchaseOrder('${po.id}')" title="Edit">
                            <i class="fas fa-edit"></i>
                        </button>
                    ` : ''}
                    ${po.status === 'pending' ? `
                        <button class="btn-icon success" onclick="approvePurchaseOrder('${po.id}')" title="Approve">
                            <i class="fas fa-check"></i>
                        </button>
                    ` : ''}
                    ${po.status === 'approved' ? `
                        <button class="btn-icon" onclick="markAsOrdered('${po.id}')" title="Mark as Ordered" style="color: #8b5cf6;">
                            <i class="fas fa-paper-plane"></i>
                        </button>
                        <button class="btn-icon success" onclick="showReceiveGoodsModal('${po.id}')" title="Receive Goods">
                            <i class="fas fa-box"></i>
                        </button>
                    ` : ''}
                    ${['ordered', 'partial'].includes(po.status) ? `
                        <button class="btn-icon success" onclick="showReceiveGoodsModal('${po.id}')" title="Receive Goods">
                            <i class="fas fa-box"></i>
                        </button>
                    ` : ''}
                    ${['draft'].includes(po.status) ? `
                        <button class="btn-icon danger" onclick="deletePurchaseOrder('${po.id}')" title="Delete">
                            <i class="fas fa-trash"></i>
                        </button>
                    ` : ''}
                </td>
            </tr>
        `;
    }).join('');
}

function viewPurchaseOrder(poId) {
    const po = purchaseOrders.find(p => p.id === poId);
    if (!po) return;
    
    const statusInfo = PO_STATUS[po.status] || { label: po.status, color: '#64748b' };
    
    const detailHtml = `
        <div style="padding: 20px;">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px;">
                <div>
                    <h2 style="margin: 0; color: #1e293b;">${escapeHTML(po.poNumber)}</h2>
                    <p style="margin: 5px 0 0; color: #64748b;">${formatDatePO(po.date)}</p>
                </div>
                <span class="status-badge" style="background: ${statusInfo.color}20; color: ${statusInfo.color}; font-size: 14px; padding: 8px 16px;">
                    ${statusInfo.label}
                </span>
            </div>
            
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px;">
                <div style="background: #f8fafc; padding: 15px; border-radius: 8px;">
                    <h4 style="margin: 0 0 10px; color: #64748b; font-size: 12px; text-transform: uppercase;">Supplier</h4>
                    <strong>${escapeHTML(po.supplierName)}</strong>
                </div>
                <div style="background: #f8fafc; padding: 15px; border-radius: 8px;">
                    <h4 style="margin: 0 0 10px; color: #64748b; font-size: 12px; text-transform: uppercase;">Expected Delivery</h4>
                    <strong>${po.expectedDelivery ? formatDatePO(po.expectedDelivery) : 'Not specified'}</strong>
                </div>
            </div>
            
            <h4 style="margin-bottom: 10px;"><i class="fas fa-list"></i> Order Items</h4>
            <table class="data-table" style="font-size: 13px;">
                <thead>
                    <tr>
                        <th>Product</th>
                        <th style="text-align: center;">Ordered</th>
                        <th style="text-align: center;">Received</th>
                        <th style="text-align: right;">Unit Price</th>
                        <th style="text-align: right;">Total</th>
                    </tr>
                </thead>
                <tbody>
                    ${po.items.map(item => `
                        <tr>
                            <td>${escapeHTML(item.productName)}</td>
                            <td style="text-align: center;">${item.quantity}</td>
                            <td style="text-align: center;">${item.receivedQty || 0}</td>
                            <td style="text-align: right;">RM ${item.unitPrice.toFixed(2)}</td>
                            <td style="text-align: right; font-weight: 600;">RM ${item.total.toFixed(2)}</td>
                        </tr>
                    `).join('')}
                </tbody>
                <tfoot>
                    <tr>
                        <td colspan="4" style="text-align: right; font-weight: 600;">Total:</td>
                        <td style="text-align: right; font-weight: 700; font-size: 16px; color: #2563eb;">RM ${po.total.toFixed(2)}</td>
                    </tr>
                </tfoot>
            </table>
            
            ${po.remarks ? `
                <div style="margin-top: 15px; padding: 10px; background: #fef3c7; border-radius: 6px;">
                    <strong>Remarks:</strong> ${escapeHTML(po.remarks)}
                </div>
            ` : ''}
            
            <div style="margin-top: 20px; display: flex; gap: 10px; justify-content: flex-end;">
                <button class="btn-secondary" onclick="this.closest('.modal-overlay').remove()">Close</button>
                <button class="btn-outline" onclick="printPurchaseOrder('${po.id}'); this.closest('.modal-overlay').remove();">
                    <i class="fas fa-print"></i> Print
                </button>
            </div>
        </div>
    `;
    
    // Create modal
    const modalOverlay = document.createElement('div');
    modalOverlay.className = 'modal-overlay';
    modalOverlay.style.cssText = 'position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 10000;';
    modalOverlay.innerHTML = `
        <div class="modal-content" style="background: white; border-radius: 12px; max-width: 700px; width: 90%; max-height: 80vh; overflow-y: auto;">
            ${detailHtml}
        </div>
    `;
    modalOverlay.onclick = (e) => {
        if (e.target === modalOverlay) modalOverlay.remove();
    };
    document.body.appendChild(modalOverlay);
}

function editPurchaseOrder(poId) {
    showPurchaseOrderModal(poId);
}

// ==================== RECEIVE GOODS MODAL ====================
function showReceiveGoodsModal(poId) {
    const po = purchaseOrders.find(p => p.id === poId);
    if (!po) return;
    
    // Auto-update status to 'ordered' if still 'approved' when receiving
    if (po.status === 'approved') {
        po.status = 'ordered';
        po.orderedAt = new Date().toISOString();
        savePOData();
    }
    
    const modal = document.getElementById('receiveGoodsModal');
    if (!modal) {
        showNotification('Receive goods modal not found', 'error');
        return;
    }
    
    document.getElementById('receivePoId').value = po.id;
    document.getElementById('receivePONumber').value = po.poNumber;
    document.getElementById('receiveSupplier').value = po.supplierName;
    document.getElementById('receiveDate').value = new Date().toISOString().slice(0, 10);
    document.getElementById('receiveDeliveryNote').value = '';
    document.getElementById('receiveNotes').value = '';
    
    // Render items to receive
    const container = document.getElementById('receiveItemsContainer');
    container.innerHTML = po.items.map((item, idx) => {
        const remaining = item.quantity - (item.receivedQty || 0);
        return `
            <div class="receive-item-row" data-item-idx="${idx}" style="display: grid; grid-template-columns: 2fr 80px 80px 100px; gap: 10px; padding: 12px; border-bottom: 1px solid #e2e8f0; align-items: center;">
                <div>
                    <strong>${escapeHTML(item.productName)}</strong>
                    <div style="font-size: 12px; color: #64748b;">
                        Ordered: ${item.quantity} | Already received: ${item.receivedQty || 0}
                    </div>
                </div>
                <div style="text-align: center;">
                    <div style="font-size: 11px; color: #64748b; margin-bottom: 2px;">Remaining</div>
                    <strong style="color: ${remaining > 0 ? '#f59e0b' : '#10b981'};">${remaining}</strong>
                </div>
                <div>
                    <div style="font-size: 11px; color: #64748b; margin-bottom: 2px;">Receive</div>
                    <input type="number" class="form-control rcv-qty" min="0" max="${remaining}" value="${remaining}" style="width: 70px; font-size: 13px;" ${remaining === 0 ? 'disabled' : ''}>
                </div>
                <div>
                    <label style="display: flex; align-items: center; gap: 5px; font-size: 12px; cursor: pointer;">
                        <input type="checkbox" class="rcv-check" ${remaining === 0 ? 'checked disabled' : 'checked'}> 
                        ${remaining === 0 ? 'Complete' : 'Receive'}
                    </label>
                </div>
            </div>
        `;
    }).join('');
    
    modal.style.display = 'flex';
}

function closeReceiveGoodsModal() {
    document.getElementById('receiveGoodsModal').style.display = 'none';
}

// ==================== RECEIVING TAB ====================
function loadPendingDeliveries() {
    const container = document.getElementById('pendingDeliveriesList');
    if (!container) return;
    
    if (Array.isArray(window.purchaseOrders)) {
        purchaseOrders = window.purchaseOrders;
    }
    
    const pending = purchaseOrders.filter(po => ['approved', 'ordered', 'partial'].includes(po.status));
    
    if (pending.length === 0) {
        container.innerHTML = `
            <div class="empty-state" style="padding: 30px;">
                <i class="fas fa-truck-loading"></i>
                <p>No orders awaiting delivery</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = pending.map(po => {
        const totalOrdered = po.items.reduce((sum, item) => sum + item.quantity, 0);
        const totalReceived = po.items.reduce((sum, item) => sum + (item.receivedQty || 0), 0);
        const progress = totalOrdered > 0 ? (totalReceived / totalOrdered) * 100 : 0;
        
        return `
            <div class="pending-delivery-card" style="background: white; border: 1px solid #e2e8f0; border-radius: 10px; padding: 15px; margin-bottom: 10px;">
                <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                    <div>
                        <strong>${escapeHTML(po.poNumber)}</strong>
                        <div style="color: #64748b; font-size: 13px;">${escapeHTML(po.supplierName)}</div>
                    </div>
                    <div style="text-align: right;">
                        <div style="font-weight: 600; color: #2563eb;">RM ${po.total.toFixed(2)}</div>
                        <div style="font-size: 12px; color: #64748b;">
                            ${po.expectedDelivery ? `Due: ${formatDatePO(po.expectedDelivery)}` : 'No due date'}
                        </div>
                    </div>
                </div>
                <div style="margin-top: 10px;">
                    <div style="display: flex; justify-content: space-between; font-size: 12px; color: #64748b; margin-bottom: 5px;">
                        <span>Received: ${totalReceived} / ${totalOrdered} items</span>
                        <span>${progress.toFixed(0)}%</span>
                    </div>
                    <div style="background: #e2e8f0; border-radius: 10px; height: 8px; overflow: hidden;">
                        <div style="background: #10b981; height: 100%; width: ${progress}%;"></div>
                    </div>
                </div>
                <div style="margin-top: 10px; text-align: right;">
                    <button class="btn-primary btn-sm" onclick="showReceiveGoodsModal('${po.id}')">
                        <i class="fas fa-box"></i> Receive Goods
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

function loadRecentReceipts() {
    const tbody = document.getElementById('recentReceiptsBody');
    if (!tbody) return;
    
    if (Array.isArray(window.goodsReceipts)) {
        goodsReceipts = window.goodsReceipts;
    }
    
    const currentTenantId = window.currentUser?.tenantId;
    
    const tenantReceipts = goodsReceipts.filter(receipt => {
        if (!receipt.tenantId) {
            const matchingPO = purchaseOrders.find(po => po.id === receipt.poId);
            return matchingPO !== undefined;
        }
        return receipt.tenantId === currentTenantId;
    });
    
    const recent = [...tenantReceipts]
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 20);
    
    if (recent.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" style="text-align: center; color: #64748b; padding: 30px;">
                    No recent receipts
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = recent.map(receipt => {
        const itemCount = receipt.items ? receipt.items.length : 0;
        return `
            <tr>
                <td>${formatDatePO(receipt.receiptDate)}</td>
                <td><strong>${escapeHTML(receipt.poNumber)}</strong></td>
                <td>${escapeHTML(receipt.supplierName)}</td>
                <td>${itemCount} item${itemCount !== 1 ? 's' : ''}</td>
                <td style="font-weight: 600;">RM ${receipt.totalValue.toFixed(2)}</td>
                <td>${receipt.receivedBy || '-'}</td>
            </tr>
        `;
    }).join('');
}

// ==================== PRINT ====================
function printPurchaseOrder(poId) {
    const po = purchaseOrders.find(p => p.id === poId);
    if (!po) return;
    
    const printWindow = window.open('', '_blank');
    const businessName = businessData?.settings?.businessName || 'Your Company';
    
    printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Purchase Order - ${po.poNumber}</title>
            <style>
                body { font-family: Arial, sans-serif; padding: 20px; }
                .header { text-align: center; margin-bottom: 30px; }
                .po-info { display: flex; justify-content: space-between; margin-bottom: 20px; }
                table { width: 100%; border-collapse: collapse; }
                th, td { border: 1px solid #ddd; padding: 10px; text-align: left; }
                th { background: #f5f5f5; }
                .total { font-weight: bold; font-size: 18px; }
                @media print { button { display: none; } }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>${businessName}</h1>
                <h2>PURCHASE ORDER</h2>
            </div>
            <div class="po-info">
                <div>
                    <strong>PO Number:</strong> ${po.poNumber}<br>
                    <strong>Date:</strong> ${formatDatePO(po.date)}<br>
                    <strong>Expected Delivery:</strong> ${po.expectedDelivery ? formatDatePO(po.expectedDelivery) : 'TBD'}
                </div>
                <div>
                    <strong>Supplier:</strong><br>
                    ${po.supplierName}
                </div>
            </div>
            <table>
                <thead>
                    <tr>
                        <th>Item</th>
                        <th>Quantity</th>
                        <th>Unit Price (RM)</th>
                        <th>Total (RM)</th>
                    </tr>
                </thead>
                <tbody>
                    ${po.items.map(item => `
                        <tr>
                            <td>${item.productName}</td>
                            <td>${item.quantity}</td>
                            <td>${item.unitPrice.toFixed(2)}</td>
                            <td>${item.total.toFixed(2)}</td>
                        </tr>
                    `).join('')}
                </tbody>
                <tfoot>
                    <tr>
                        <td colspan="3" style="text-align: right;"><strong>Total:</strong></td>
                        <td class="total">RM ${po.total.toFixed(2)}</td>
                    </tr>
                </tfoot>
            </table>
            ${po.remarks ? `<p><strong>Remarks:</strong> ${po.remarks}</p>` : ''}
            <button onclick="window.print()" style="margin-top: 20px; padding: 10px 20px;">Print</button>
        </body>
        </html>
    `);
    printWindow.document.close();
}

// ==================== HELPER FUNCTIONS ====================
function formatDatePO(dateStr) {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-MY', { 
        day: '2-digit', 
        month: 'short', 
        year: 'numeric' 
    });
}

// ==================== WINDOW EXPORTS ====================
window.showSupplierTab = showSupplierTab;
window.showPurchaseOrderModal = showPurchaseOrderModal;
window.closePurchaseOrderModal = closePurchaseOrderModal;
window.addPOItem = addPOItem;
window.removePOItem = removePOItem;
window.onPOItemProductChange = onPOItemProductChange;
window.onPOSupplierChange = onPOSupplierChange;
window.renderPOItems = renderPOItems;
window.updatePOTotals = updatePOTotals;
window.loadPurchaseOrders = loadPurchaseOrders;
window.viewPurchaseOrder = viewPurchaseOrder;
window.editPurchaseOrder = editPurchaseOrder;
window.showReceiveGoodsModal = showReceiveGoodsModal;
window.closeReceiveGoodsModal = closeReceiveGoodsModal;
window.loadPendingDeliveries = loadPendingDeliveries;
window.loadRecentReceipts = loadRecentReceipts;
window.printPurchaseOrder = printPurchaseOrder;
