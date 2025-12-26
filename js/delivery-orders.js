/**
 * EZCubic - Delivery Orders Module
 * Manage outgoing (sales) and incoming (purchase) deliveries
 * Version: 1.0.0 - 17 Dec 2025
 */

// ==================== GLOBAL VARIABLES ====================
let deliveryOrders = [];
const DELIVERY_ORDERS_KEY = 'ezcubic_delivery_orders';

// Sync local variable with window (called by multi-tenant system)
function syncDeliveryOrdersFromWindow() {
    if (Array.isArray(window.deliveryOrders)) {
        deliveryOrders = window.deliveryOrders;
    }
}
window.syncDeliveryOrdersFromWindow = syncDeliveryOrdersFromWindow;

// DO Status Flow
const DO_STATUS = {
    draft: { label: 'Draft', color: '#64748b', icon: 'fa-file' },
    confirmed: { label: 'Confirmed', color: '#3b82f6', icon: 'fa-check' },
    shipped: { label: 'Shipped', color: '#8b5cf6', icon: 'fa-truck' },
    in_transit: { label: 'In Transit', color: '#f59e0b', icon: 'fa-shipping-fast' },
    delivered: { label: 'Delivered', color: '#10b981', icon: 'fa-check-circle' },
    cancelled: { label: 'Cancelled', color: '#ef4444', icon: 'fa-times' }
};

let currentDOTab = 'outgoing';

// ==================== INITIALIZATION ====================
function initializeDeliveryOrders() {
    loadDeliveryOrders();
    renderDeliveryOrdersList();
    updateDOStats();
}

function loadDeliveryOrders() {
    // First check if window has data from tenant loading (even if empty array)
    // This is critical for multi-tenant isolation - don't fall back to localStorage if tenant has no data
    if (Array.isArray(window.deliveryOrders)) {
        deliveryOrders = window.deliveryOrders;
        return;
    }
    // Otherwise load from localStorage
    const stored = localStorage.getItem(DELIVERY_ORDERS_KEY);
    if (stored) {
        deliveryOrders = JSON.parse(stored);
        if (!Array.isArray(deliveryOrders)) deliveryOrders = [];
    }
    window.deliveryOrders = deliveryOrders;
}

function saveDeliveryOrders() {
    localStorage.setItem(DELIVERY_ORDERS_KEY, JSON.stringify(deliveryOrders));
    window.deliveryOrders = deliveryOrders; // Keep window in sync
    
    // Also save to tenant storage for data isolation
    if (typeof saveToUserTenant === 'function') {
        saveToUserTenant();
    }
}

// ==================== STATS ====================
function updateDOStats() {
    const total = deliveryOrders.length;
    const pending = deliveryOrders.filter(d => d.status === 'draft' || d.status === 'confirmed').length;
    const inTransit = deliveryOrders.filter(d => d.status === 'shipped' || d.status === 'in_transit').length;
    const delivered = deliveryOrders.filter(d => d.status === 'delivered').length;
    
    const totalEl = document.getElementById('doTotalCount');
    const pendingEl = document.getElementById('doPendingCount');
    const transitEl = document.getElementById('doInTransitCount');
    const deliveredEl = document.getElementById('doDeliveredCount');
    
    if (totalEl) totalEl.textContent = total;
    if (pendingEl) pendingEl.textContent = pending;
    if (transitEl) transitEl.textContent = inTransit;
    if (deliveredEl) deliveredEl.textContent = delivered;
    
    // Update badge
    const badge = document.getElementById('pendingDOBadge');
    if (badge) {
        badge.textContent = pending;
        badge.style.display = pending > 0 ? '' : 'none';
    }
}

// ==================== TAB NAVIGATION ====================
function showDOTab(tab) {
    currentDOTab = tab;
    
    document.querySelectorAll('#delivery-orders .tabs .tab').forEach(t => t.classList.remove('active'));
    event.currentTarget.classList.add('active');
    
    renderDeliveryOrdersList();
}

// ==================== RENDER LIST ====================
function renderDeliveryOrdersList() {
    const container = document.getElementById('deliveryOrdersList');
    if (!container) return;
    
    const searchTerm = document.getElementById('doSearchInput')?.value?.toLowerCase() || '';
    const statusFilter = document.getElementById('doStatusFilter')?.value || '';
    const dateFilter = document.getElementById('doDateFilter')?.value || '';
    
    let filtered = deliveryOrders.filter(d => d.type === currentDOTab);
    
    // Apply filters
    if (searchTerm) {
        filtered = filtered.filter(d => 
            d.doNumber?.toLowerCase().includes(searchTerm) ||
            d.customerName?.toLowerCase().includes(searchTerm) ||
            d.supplierName?.toLowerCase().includes(searchTerm) ||
            d.address?.toLowerCase().includes(searchTerm)
        );
    }
    
    if (statusFilter) {
        filtered = filtered.filter(d => d.status === statusFilter);
    }
    
    if (dateFilter) {
        filtered = filtered.filter(d => d.date === dateFilter);
    }
    
    // Sort by date desc
    filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    if (filtered.length === 0) {
        container.innerHTML = `
            <div class="empty-state" style="text-align: center; padding: 60px 20px; color: #64748b;">
                <i class="fas fa-shipping-fast" style="font-size: 60px; margin-bottom: 20px; opacity: 0.5;"></i>
                <h3 style="margin-bottom: 10px;">No ${currentDOTab === 'outgoing' ? 'Outgoing' : 'Incoming'} Delivery Orders</h3>
                <p style="margin-bottom: 20px;">Create your first delivery order to track shipments</p>
                <button class="btn-primary" onclick="showCreateDOModal()">
                    <i class="fas fa-plus"></i> Create Delivery Order
                </button>
            </div>
        `;
        return;
    }
    
    container.innerHTML = `
        <div class="table-container">
            <table class="data-table">
                <thead>
                    <tr>
                        <th>DO Number</th>
                        <th>Date</th>
                        <th>${currentDOTab === 'outgoing' ? 'Customer' : 'Supplier'}</th>
                        <th>Reference</th>
                        <th>Items</th>
                        <th>Status</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${filtered.map(d => {
                        const status = DO_STATUS[d.status] || DO_STATUS.draft;
                        return `
                            <tr>
                                <td><strong>${escapeHtml(d.doNumber)}</strong></td>
                                <td>${formatDate(d.date)}</td>
                                <td>${escapeHtml(d.customerName || d.supplierName || '-')}</td>
                                <td>
                                    ${d.referenceType ? `<span class="badge">${d.referenceType}: ${d.referenceNumber || '-'}</span>` : '-'}
                                </td>
                                <td>${d.items?.length || 0} items</td>
                                <td>
                                    <span class="status-badge" style="background: ${status.color}; color: white;">
                                        <i class="fas ${status.icon}"></i> ${status.label}
                                    </span>
                                </td>
                                <td>
                                    <div class="action-buttons">
                                        <button class="btn-icon" onclick="viewDO('${d.id}')" title="View">
                                            <i class="fas fa-eye"></i>
                                        </button>
                                        ${d.status === 'draft' ? `
                                            <button class="btn-icon" onclick="editDO('${d.id}')" title="Edit">
                                                <i class="fas fa-edit"></i>
                                            </button>
                                        ` : ''}
                                        ${d.status === 'confirmed' ? `
                                            <button class="btn-icon success" onclick="markDOShipped('${d.id}')" title="Mark Shipped">
                                                <i class="fas fa-truck"></i>
                                            </button>
                                        ` : ''}
                                        ${d.status === 'in_transit' ? `
                                            <button class="btn-icon success" onclick="markDODelivered('${d.id}')" title="Mark Delivered">
                                                <i class="fas fa-check-circle"></i>
                                            </button>
                                        ` : ''}
                                        <button class="btn-icon" onclick="printDO('${d.id}')" title="Print">
                                            <i class="fas fa-print"></i>
                                        </button>
                                        ${d.status === 'draft' ? `
                                            <button class="btn-icon danger" onclick="deleteDO('${d.id}')" title="Delete">
                                                <i class="fas fa-trash"></i>
                                            </button>
                                        ` : ''}
                                    </div>
                                </td>
                            </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
        </div>
    `;
}

function filterDOList() {
    renderDeliveryOrdersList();
}

// ==================== CREATE/EDIT DO ====================
function showCreateDOModal(editId = null) {
    const isEdit = !!editId;
    let doData = isEdit ? deliveryOrders.find(d => d.id === editId) : null;
    
    document.getElementById('createDOModal')?.remove();
    
    // Get customers and suppliers
    const customers = window.customers || [];
    const suppliers = window.suppliers || [];
    
    const modalHTML = `
        <div class="modal show" id="createDOModal">
            <div class="modal-content" style="max-width: 800px;">
                <div class="modal-header">
                    <h3 class="modal-title">
                        <i class="fas fa-shipping-fast"></i> ${isEdit ? 'Edit' : 'New'} Delivery Order
                    </h3>
                    <button class="modal-close" onclick="closeModal('createDOModal')">&times;</button>
                </div>
                <form onsubmit="saveDO(event, ${isEdit ? `'${editId}'` : 'null'})">
                    <div class="form-grid">
                        <div class="form-group">
                            <label class="form-label">DO Type *</label>
                            <select id="doType" class="form-control" required onchange="toggleDOTypeFields()">
                                <option value="outgoing" ${doData?.type === 'outgoing' ? 'selected' : ''}>Outgoing (Sales Delivery)</option>
                                <option value="incoming" ${doData?.type === 'incoming' ? 'selected' : ''}>Incoming (Purchase Receive)</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label class="form-label">DO Number *</label>
                            <input type="text" id="doNumber" class="form-control" value="${doData?.doNumber || generateDONumber()}" required>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Date *</label>
                            <input type="date" id="doDate" class="form-control" value="${doData?.date || new Date().toISOString().split('T')[0]}" required>
                        </div>
                        <div class="form-group" id="doCustomerGroup">
                            <label class="form-label">Customer *</label>
                            <select id="doCustomer" class="form-control">
                                <option value="">Select Customer</option>
                                ${customers.map(c => `
                                    <option value="${c.id}" ${doData?.customerId === c.id ? 'selected' : ''}>${escapeHtml(c.name || c.company)}</option>
                                `).join('')}
                            </select>
                        </div>
                        <div class="form-group" id="doSupplierGroup" style="display: none;">
                            <label class="form-label">Supplier *</label>
                            <select id="doSupplier" class="form-control">
                                <option value="">Select Supplier</option>
                                ${suppliers.map(s => `
                                    <option value="${s.id}" ${doData?.supplierId === s.id ? 'selected' : ''}>${escapeHtml(s.company || s.name)}</option>
                                `).join('')}
                            </select>
                        </div>
                    </div>
                    
                    <div class="form-grid">
                        <div class="form-group">
                            <label class="form-label">Reference Type</label>
                            <select id="doRefType" class="form-control">
                                <option value="">None</option>
                                <option value="SO" ${doData?.referenceType === 'SO' ? 'selected' : ''}>Sales Order</option>
                                <option value="PO" ${doData?.referenceType === 'PO' ? 'selected' : ''}>Purchase Order</option>
                                <option value="INV" ${doData?.referenceType === 'INV' ? 'selected' : ''}>Invoice</option>
                                <option value="QUO" ${doData?.referenceType === 'QUO' ? 'selected' : ''}>Quotation</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Reference Number</label>
                            <input type="text" id="doRefNumber" class="form-control" value="${doData?.referenceNumber || ''}" placeholder="e.g., SO-2024-001">
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <label class="form-label">Delivery Address *</label>
                        <textarea id="doAddress" class="form-control" rows="2" required placeholder="Full delivery address">${doData?.address || ''}</textarea>
                    </div>
                    
                    <!-- Items Section -->
                    <div class="form-group">
                        <label class="form-label">Items</label>
                        <div id="doItemsContainer">
                            ${doData?.items?.length ? doData.items.map((item, idx) => createDOItemRow(item, idx)).join('') : createDOItemRow({}, 0)}
                        </div>
                        <button type="button" class="btn-outline btn-sm" onclick="addDOItem()" style="margin-top: 10px;">
                            <i class="fas fa-plus"></i> Add Item
                        </button>
                    </div>
                    
                    <div class="form-group">
                        <label class="form-label">Notes</label>
                        <textarea id="doNotes" class="form-control" rows="2" placeholder="Delivery instructions, special handling...">${doData?.notes || ''}</textarea>
                    </div>
                    
                    <div class="modal-footer">
                        <button type="button" class="btn-secondary" onclick="closeModal('createDOModal')">Cancel</button>
                        <button type="submit" class="btn-primary">
                            <i class="fas fa-save"></i> ${isEdit ? 'Update' : 'Create'} DO
                        </button>
                    </div>
                </form>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    toggleDOTypeFields();
}

function createDOItemRow(item = {}, index = 0) {
    const products = window.products || [];
    
    return `
        <div class="do-item-row" style="display: grid; grid-template-columns: 2fr 1fr 1fr auto; gap: 10px; margin-bottom: 10px; align-items: center;">
            <select class="form-control do-item-product" onchange="updateDOItemDetails(this)">
                <option value="">Select Product</option>
                ${products.map(p => `
                    <option value="${p.id}" data-sku="${p.sku || ''}" ${item.productId === p.id ? 'selected' : ''}>
                        ${escapeHtml(p.name)} ${p.sku ? `(${p.sku})` : ''}
                    </option>
                `).join('')}
                <option value="custom" ${item.isCustom ? 'selected' : ''}>-- Custom Item --</option>
            </select>
            <input type="text" class="form-control do-item-desc" placeholder="Description" value="${escapeHtml(item.description || '')}">
            <input type="number" class="form-control do-item-qty" placeholder="Qty" min="1" value="${item.quantity || 1}">
            <button type="button" class="btn-icon danger" onclick="removeDOItem(this)" title="Remove">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `;
}

function addDOItem() {
    const container = document.getElementById('doItemsContainer');
    const index = container.querySelectorAll('.do-item-row').length;
    container.insertAdjacentHTML('beforeend', createDOItemRow({}, index));
}

function removeDOItem(btn) {
    const container = document.getElementById('doItemsContainer');
    if (container.querySelectorAll('.do-item-row').length > 1) {
        btn.closest('.do-item-row').remove();
    } else {
        showToast('At least one item is required', 'warning');
    }
}

function updateDOItemDetails(select) {
    const row = select.closest('.do-item-row');
    const descInput = row.querySelector('.do-item-desc');
    
    if (select.value && select.value !== 'custom') {
        const option = select.selectedOptions[0];
        descInput.value = option.textContent.trim();
    }
}

function toggleDOTypeFields() {
    const type = document.getElementById('doType').value;
    const customerGroup = document.getElementById('doCustomerGroup');
    const supplierGroup = document.getElementById('doSupplierGroup');
    
    if (type === 'outgoing') {
        customerGroup.style.display = '';
        supplierGroup.style.display = 'none';
        document.getElementById('doCustomer').required = true;
        document.getElementById('doSupplier').required = false;
    } else {
        customerGroup.style.display = 'none';
        supplierGroup.style.display = '';
        document.getElementById('doCustomer').required = false;
        document.getElementById('doSupplier').required = true;
    }
}

function generateDONumber() {
    // Use customizable document numbering if available
    if (typeof generateDocumentNumber === 'function') {
        return generateDocumentNumber('deliveryorder');
    }
    
    // Fallback to original logic
    const year = new Date().getFullYear();
    const count = deliveryOrders.filter(d => d.doNumber?.includes(`DO-${year}`)).length + 1;
    return `DO-${year}-${String(count).padStart(4, '0')}`;
}

function saveDO(event, editId = null) {
    event.preventDefault();
    
    const type = document.getElementById('doType').value;
    const items = [];
    
    document.querySelectorAll('.do-item-row').forEach(row => {
        const productSelect = row.querySelector('.do-item-product');
        const desc = row.querySelector('.do-item-desc').value;
        const qty = parseInt(row.querySelector('.do-item-qty').value) || 1;
        
        if (productSelect.value || desc) {
            items.push({
                productId: productSelect.value !== 'custom' ? productSelect.value : null,
                isCustom: productSelect.value === 'custom',
                description: desc,
                quantity: qty
            });
        }
    });
    
    if (items.length === 0) {
        showToast('Please add at least one item', 'error');
        return;
    }
    
    const doData = {
        id: editId || 'do_' + Date.now(),
        doNumber: document.getElementById('doNumber').value,
        type: type,
        date: document.getElementById('doDate').value,
        customerId: type === 'outgoing' ? document.getElementById('doCustomer').value : null,
        customerName: type === 'outgoing' ? document.getElementById('doCustomer').selectedOptions[0]?.text : null,
        supplierId: type === 'incoming' ? document.getElementById('doSupplier').value : null,
        supplierName: type === 'incoming' ? document.getElementById('doSupplier').selectedOptions[0]?.text : null,
        referenceType: document.getElementById('doRefType').value,
        referenceNumber: document.getElementById('doRefNumber').value,
        address: document.getElementById('doAddress').value,
        items: items,
        notes: document.getElementById('doNotes').value,
        status: 'draft',
        createdAt: editId ? deliveryOrders.find(d => d.id === editId)?.createdAt : new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };
    
    if (editId) {
        const index = deliveryOrders.findIndex(d => d.id === editId);
        if (index !== -1) {
            doData.status = deliveryOrders[index].status; // Keep existing status
            deliveryOrders[index] = doData;
        }
    } else {
        deliveryOrders.push(doData);
    }
    
    saveDeliveryOrders();
    closeModal('createDOModal');
    renderDeliveryOrdersList();
    updateDOStats();
    
    showToast(`Delivery Order ${editId ? 'updated' : 'created'} successfully!`, 'success');
}

// ==================== VIEW DO ====================
function viewDO(id) {
    const doData = deliveryOrders.find(d => d.id === id);
    if (!doData) return;
    
    const status = DO_STATUS[doData.status] || DO_STATUS.draft;
    
    document.getElementById('viewDOModal')?.remove();
    
    const modalHTML = `
        <div class="modal show" id="viewDOModal">
            <div class="modal-content" style="max-width: 700px;">
                <div class="modal-header">
                    <h3 class="modal-title">
                        <i class="fas fa-shipping-fast"></i> ${doData.doNumber}
                    </h3>
                    <button class="modal-close" onclick="closeModal('viewDOModal')">&times;</button>
                </div>
                
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                    <span class="status-badge" style="background: ${status.color}; color: white; padding: 8px 16px; font-size: 14px;">
                        <i class="fas ${status.icon}"></i> ${status.label}
                    </span>
                    <span style="color: #64748b;">${formatDate(doData.date)}</span>
                </div>
                
                <div class="form-grid" style="margin-bottom: 20px;">
                    <div>
                        <label style="font-weight: 600; color: #475569;">Type</label>
                        <p>${doData.type === 'outgoing' ? 'Outgoing (Sales)' : 'Incoming (Purchase)'}</p>
                    </div>
                    <div>
                        <label style="font-weight: 600; color: #475569;">${doData.type === 'outgoing' ? 'Customer' : 'Supplier'}</label>
                        <p>${escapeHtml(doData.customerName || doData.supplierName || '-')}</p>
                    </div>
                    ${doData.referenceType ? `
                    <div>
                        <label style="font-weight: 600; color: #475569;">Reference</label>
                        <p>${doData.referenceType}: ${doData.referenceNumber || '-'}</p>
                    </div>
                    ` : ''}
                </div>
                
                <div style="margin-bottom: 20px;">
                    <label style="font-weight: 600; color: #475569;">Delivery Address</label>
                    <p style="background: #f8fafc; padding: 10px; border-radius: 6px; margin-top: 5px;">${escapeHtml(doData.address)}</p>
                </div>
                
                <div style="margin-bottom: 20px;">
                    <label style="font-weight: 600; color: #475569;">Items</label>
                    <table class="data-table" style="margin-top: 10px;">
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>Description</th>
                                <th>Quantity</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${doData.items?.map((item, idx) => `
                                <tr>
                                    <td>${idx + 1}</td>
                                    <td>${escapeHtml(item.description)}</td>
                                    <td>${item.quantity}</td>
                                </tr>
                            `).join('') || '<tr><td colspan="3">No items</td></tr>'}
                        </tbody>
                    </table>
                </div>
                
                ${doData.notes ? `
                <div style="margin-bottom: 20px;">
                    <label style="font-weight: 600; color: #475569;">Notes</label>
                    <p style="background: #f8fafc; padding: 10px; border-radius: 6px; margin-top: 5px;">${escapeHtml(doData.notes)}</p>
                </div>
                ` : ''}
                
                <div class="modal-footer">
                    ${doData.status === 'draft' ? `
                        <button class="btn-primary" onclick="confirmDO('${id}')">
                            <i class="fas fa-check"></i> Confirm DO
                        </button>
                    ` : ''}
                    ${doData.status === 'confirmed' ? `
                        <button class="btn-primary" onclick="markDOShipped('${id}'); closeModal('viewDOModal');">
                            <i class="fas fa-truck"></i> Mark Shipped
                        </button>
                    ` : ''}
                    ${doData.status === 'shipped' || doData.status === 'in_transit' ? `
                        <button class="btn-primary" onclick="markDODelivered('${id}'); closeModal('viewDOModal');">
                            <i class="fas fa-check-circle"></i> Mark Delivered
                        </button>
                    ` : ''}
                    <button class="btn-outline" onclick="printDO('${id}')">
                        <i class="fas fa-print"></i> Print
                    </button>
                    <button class="btn-secondary" onclick="closeModal('viewDOModal')">Close</button>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

function editDO(id) {
    showCreateDOModal(id);
}

function deleteDO(id) {
    if (!confirm('Are you sure you want to delete this delivery order?')) return;
    
    deliveryOrders = deliveryOrders.filter(d => d.id !== id);
    saveDeliveryOrders();
    renderDeliveryOrdersList();
    updateDOStats();
    showToast('Delivery Order deleted', 'success');
}

// ==================== STATUS CHANGES ====================
function confirmDO(id) {
    const doData = deliveryOrders.find(d => d.id === id);
    if (doData) {
        doData.status = 'confirmed';
        doData.confirmedAt = new Date().toISOString();
        saveDeliveryOrders();
        closeModal('viewDOModal');
        renderDeliveryOrdersList();
        updateDOStats();
        showToast('Delivery Order confirmed!', 'success');
    }
}

function markDOShipped(id) {
    const doData = deliveryOrders.find(d => d.id === id);
    if (doData) {
        doData.status = 'in_transit';
        doData.shippedAt = new Date().toISOString();
        saveDeliveryOrders();
        renderDeliveryOrdersList();
        updateDOStats();
        showToast('Delivery Order marked as shipped!', 'success');
    }
}

function markDODelivered(id) {
    const doData = deliveryOrders.find(d => d.id === id);
    if (doData) {
        doData.status = 'delivered';
        doData.deliveredAt = new Date().toISOString();
        saveDeliveryOrders();
        renderDeliveryOrdersList();
        updateDOStats();
        showToast('Delivery Order marked as delivered!', 'success');
    }
}

// ==================== PRINT ====================
function printDO(id) {
    const doData = deliveryOrders.find(d => d.id === id);
    if (!doData) return;
    
    const status = DO_STATUS[doData.status] || DO_STATUS.draft;
    const businessName = businessData?.settings?.businessName || 'EZCubic';
    
    const printContent = `
        <html>
        <head>
            <title>Delivery Order - ${doData.doNumber}</title>
            <style>
                body { font-family: Arial, sans-serif; padding: 20px; max-width: 800px; margin: 0 auto; }
                .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 20px; }
                .header h1 { margin: 0; font-size: 24px; }
                .header h2 { margin: 10px 0 0; font-size: 18px; color: #666; }
                .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px; }
                .info-box { padding: 15px; background: #f5f5f5; border-radius: 5px; }
                .info-box label { font-weight: bold; display: block; margin-bottom: 5px; }
                table { width: 100%; border-collapse: collapse; margin: 20px 0; }
                th, td { border: 1px solid #ddd; padding: 10px; text-align: left; }
                th { background: #f0f0f0; }
                .footer { margin-top: 50px; display: grid; grid-template-columns: 1fr 1fr; gap: 50px; }
                .signature { border-top: 1px solid #333; padding-top: 10px; text-align: center; }
                @media print { body { padding: 0; } }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>${businessName}</h1>
                <h2>DELIVERY ORDER</h2>
            </div>
            
            <div class="info-grid">
                <div class="info-box">
                    <label>DO Number:</label>
                    <span>${doData.doNumber}</span>
                </div>
                <div class="info-box">
                    <label>Date:</label>
                    <span>${formatDate(doData.date)}</span>
                </div>
                <div class="info-box">
                    <label>${doData.type === 'outgoing' ? 'Deliver To:' : 'Receive From:'}</label>
                    <span>${doData.customerName || doData.supplierName || '-'}</span>
                </div>
                <div class="info-box">
                    <label>Status:</label>
                    <span>${status.label}</span>
                </div>
            </div>
            
            <div class="info-box">
                <label>Delivery Address:</label>
                <span>${doData.address}</span>
            </div>
            
            <table>
                <thead>
                    <tr>
                        <th>#</th>
                        <th>Description</th>
                        <th>Quantity</th>
                        <th>Received</th>
                    </tr>
                </thead>
                <tbody>
                    ${doData.items?.map((item, idx) => `
                        <tr>
                            <td>${idx + 1}</td>
                            <td>${item.description}</td>
                            <td>${item.quantity}</td>
                            <td></td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
            
            ${doData.notes ? `<p><strong>Notes:</strong> ${doData.notes}</p>` : ''}
            
            <div class="footer">
                <div>
                    <div class="signature">Prepared By</div>
                </div>
                <div>
                    <div class="signature">Received By</div>
                </div>
            </div>
        </body>
        </html>
    `;
    
    const printWindow = window.open('', '_blank');
    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.print();
}

function exportDeliveryOrders() {
    if (deliveryOrders.length === 0) {
        showToast('No delivery orders to export', 'warning');
        return;
    }
    
    const csv = [
        ['DO Number', 'Date', 'Type', 'Customer/Supplier', 'Reference', 'Items Count', 'Status', 'Address'].join(','),
        ...deliveryOrders.map(d => [
            d.doNumber,
            d.date,
            d.type,
            d.customerName || d.supplierName || '',
            d.referenceType ? `${d.referenceType}-${d.referenceNumber}` : '',
            d.items?.length || 0,
            d.status,
            `"${(d.address || '').replace(/"/g, '""')}"`
        ].join(','))
    ].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `delivery-orders-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    
    showToast('Delivery Orders exported!', 'success');
}

// ==================== HELPER FUNCTIONS ====================
function formatDate(dateStr) {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-MY', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

// ==================== EXPORTS ====================
window.initializeDeliveryOrders = initializeDeliveryOrders;
window.showDOTab = showDOTab;
window.showCreateDOModal = showCreateDOModal;
window.filterDOList = filterDOList;
window.viewDO = viewDO;
window.editDO = editDO;
window.deleteDO = deleteDO;
window.confirmDO = confirmDO;
window.markDOShipped = markDOShipped;
window.markDODelivered = markDODelivered;
window.printDO = printDO;
window.exportDeliveryOrders = exportDeliveryOrders;
window.addDOItem = addDOItem;
window.removeDOItem = removeDOItem;
window.updateDOItemDetails = updateDOItemDetails;
window.toggleDOTypeFields = toggleDOTypeFields;
