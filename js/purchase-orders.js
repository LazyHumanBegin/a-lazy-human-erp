// ==================== PURCHASE-ORDERS.JS ====================
// Purchase Order & Goods Receiving Module
// Procurement workflow for suppliers

// ==================== GLOBAL VARIABLES ====================
let purchaseOrders = [];
let goodsReceipts = [];

const PURCHASE_ORDERS_KEY = 'ezcubic_purchase_orders';
const GOODS_RECEIPTS_KEY = 'ezcubic_goods_receipts';

// Sync local variables with window (called by multi-tenant system)
function syncPurchaseOrdersFromWindow() {
    if (Array.isArray(window.purchaseOrders)) {
        purchaseOrders = window.purchaseOrders;
    }
    if (Array.isArray(window.goodsReceipts)) {
        goodsReceipts = window.goodsReceipts;
    }
}
window.syncPurchaseOrdersFromWindow = syncPurchaseOrdersFromWindow;

// PO Status Flow: draft -> pending -> approved -> ordered -> partial/received -> closed
const PO_STATUS = {
    draft: { label: 'Draft', color: '#64748b', next: ['pending', 'cancelled'] },
    pending: { label: 'Pending Approval', color: '#f59e0b', next: ['approved', 'cancelled'] },
    approved: { label: 'Approved', color: '#3b82f6', next: ['ordered', 'cancelled'] },
    ordered: { label: 'Ordered', color: '#8b5cf6', next: ['partial', 'received'] },
    partial: { label: 'Partially Received', color: '#06b6d4', next: ['received'] },
    received: { label: 'Received', color: '#10b981', next: ['closed'] },
    closed: { label: 'Closed', color: '#475569', next: [] },
    cancelled: { label: 'Cancelled', color: '#ef4444', next: [] }
};

// ==================== EXPORT FUNCTIONS ====================
window.initializePurchaseOrders = initializePurchaseOrders;
window.showSupplierTab = showSupplierTab;
window.showPurchaseOrderModal = showPurchaseOrderModal;
window.closePurchaseOrderModal = closePurchaseOrderModal;
window.savePurchaseOrder = savePurchaseOrder;
window.loadPurchaseOrders = loadPurchaseOrders;
window.viewPurchaseOrder = viewPurchaseOrder;
window.editPurchaseOrder = editPurchaseOrder;
window.deletePurchaseOrder = deletePurchaseOrder;
window.approvePurchaseOrder = approvePurchaseOrder;
window.markAsOrdered = markAsOrdered;
window.addPOItem = addPOItem;
window.removePOItem = removePOItem;
window.updatePOTotals = updatePOTotals;
window.showReceiveGoodsModal = showReceiveGoodsModal;
window.closeReceiveGoodsModal = closeReceiveGoodsModal;
window.saveGoodsReceipt = saveGoodsReceipt;
window.loadPendingDeliveries = loadPendingDeliveries;
window.loadRecentReceipts = loadRecentReceipts;
window.printPurchaseOrder = printPurchaseOrder;

// ==================== HELPER FUNCTIONS ====================
function getSuppliersList() {
    try {
        if (Array.isArray(window.suppliers)) {
            return window.suppliers;
        }
        const stored = localStorage.getItem('ezcubic_suppliers');
        if (stored) {
            const parsed = JSON.parse(stored);
            return Array.isArray(parsed) ? parsed : [];
        }
    } catch (e) {
        console.error('Error loading suppliers:', e);
    }
    return [];
}

// ==================== INITIALIZATION ====================
function initializePurchaseOrders() {
    loadPOData();
    populatePOFilters();
    updatePOStats();
}

function loadPOData() {
    // First check if window has data from tenant loading (even if empty array)
    // This is critical for multi-tenant isolation - don't fall back to localStorage if tenant has no data
    if (Array.isArray(window.purchaseOrders)) {
        purchaseOrders = window.purchaseOrders;
    } else {
        const storedPOs = localStorage.getItem(PURCHASE_ORDERS_KEY);
        if (storedPOs) {
            purchaseOrders = JSON.parse(storedPOs);
            if (!Array.isArray(purchaseOrders)) purchaseOrders = [];
        }
        window.purchaseOrders = purchaseOrders;
    }
    
    if (Array.isArray(window.goodsReceipts)) {
        goodsReceipts = window.goodsReceipts;
    } else {
        const storedReceipts = localStorage.getItem(GOODS_RECEIPTS_KEY);
        if (storedReceipts) {
            goodsReceipts = JSON.parse(storedReceipts);
            if (!Array.isArray(goodsReceipts)) goodsReceipts = [];
        }
        window.goodsReceipts = goodsReceipts;
    }
}

function savePOData() {
    localStorage.setItem(PURCHASE_ORDERS_KEY, JSON.stringify(purchaseOrders));
    localStorage.setItem(GOODS_RECEIPTS_KEY, JSON.stringify(goodsReceipts));
    
    // Keep window in sync
    window.purchaseOrders = purchaseOrders;
    window.goodsReceipts = goodsReceipts;
    
    // DIRECT tenant save
    const user = window.currentUser;
    if (user && user.tenantId) {
        const tenantKey = 'ezcubic_tenant_' + user.tenantId;
        let tenantData = JSON.parse(localStorage.getItem(tenantKey) || '{}');
        tenantData.purchaseOrders = purchaseOrders;
        tenantData.goodsReceipts = goodsReceipts;
        tenantData.updatedAt = new Date().toISOString();
        localStorage.setItem(tenantKey, JSON.stringify(tenantData));
        console.log('✅ Purchase Orders saved directly to tenant:', purchaseOrders.length);
    }
    
    // Trigger cloud sync for deletions
    if (typeof window.fullCloudSync === 'function') {
        setTimeout(() => {
            window.fullCloudSync().catch(e => console.warn('Cloud sync failed:', e));
        }, 100);
    }
}

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
        syncPurchaseOrdersFromWindow(); // Sync data first
        initializePurchaseOrders();
        loadPurchaseOrders();
    } else if (tab === 'receiving') {
        if (receivingSection) receivingSection.style.display = 'block';
        syncPurchaseOrdersFromWindow(); // Sync data first
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
        addPOItem(); // Add one empty row
        updatePOTotals();
    }
    
    modal.style.display = 'flex';
}

function closePurchaseOrderModal() {
    document.getElementById('purchaseOrderModal').style.display = 'none';
}

function generatePONumber() {
    // Use customizable document numbering if available
    if (typeof generateDocumentNumber === 'function') {
        return generateDocumentNumber('purchaseorder');
    }
    
    // Fallback to original logic
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    
    // Find the highest number for this month
    const prefix = `PO${year}${month}`;
    const existingNumbers = purchaseOrders
        .filter(po => po.poNumber && po.poNumber.startsWith(prefix))
        .map(po => parseInt(po.poNumber.slice(-4)) || 0);
    
    const nextNumber = existingNumbers.length > 0 ? Math.max(...existingNumbers) + 1 : 1;
    return `${prefix}${nextNumber.toString().padStart(4, '0')}`;
}

// ==================== PO ITEMS ====================
let poItemCounter = 0;

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
window.onPOItemProductChange = onPOItemProductChange;

// Handle supplier selection change
function onPOSupplierChange() {
    const supplierId = document.getElementById('poSupplier').value;
    if (supplierId) {
        const suppliers = getSuppliersList();
        const supplier = suppliers.find(s => s.id === supplierId);
        if (supplier) {
            // Could auto-fill supplier-related info if needed
            console.log('Selected supplier:', supplier.company || supplier.name);
        }
    }
}
window.onPOSupplierChange = onPOSupplierChange;

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
    
    const tax = 0; // Can implement tax calculation if needed
    const grandTotal = subtotal + tax;
    
    document.getElementById('poSubtotal').textContent = `RM ${subtotal.toFixed(2)}`;
    document.getElementById('poTax').textContent = `RM ${tax.toFixed(2)}`;
    document.getElementById('poTotal').textContent = `RM ${grandTotal.toFixed(2)}`;
}

function collectPOItems() {
    const rows = document.querySelectorAll('.po-item-row');
    const items = [];
    
    rows.forEach(row => {
        const productSelect = row.querySelector('.poi-product');
        const productId = productSelect.value;
        
        if (!productId) return;
        
        let productName = '';
        let description = '';
        
        if (productId === '_custom') {
            description = row.querySelector('.poi-description').value.trim();
            productName = description;
        } else {
            const selectedOption = productSelect.options[productSelect.selectedIndex];
            productName = selectedOption.textContent;
        }
        
        const quantity = parseFloat(row.querySelector('.poi-qty').value) || 0;
        const unitPrice = parseFloat(row.querySelector('.poi-price').value) || 0;
        
        if (quantity > 0) {
            items.push({
                productId: productId,
                productName: productName,
                description: description,
                quantity: quantity,
                unitPrice: unitPrice,
                total: quantity * unitPrice,
                receivedQty: 0 // For tracking partial receipts
            });
        }
    });
    
    return items;
}

// ==================== SAVE PURCHASE ORDER ====================
function savePurchaseOrder(status = 'pending') {
    const id = document.getElementById('poId').value;
    const poNumber = document.getElementById('poNumber').value;
    const date = document.getElementById('poDate').value;
    const supplierId = document.getElementById('poSupplier').value;
    const expectedDelivery = document.getElementById('poExpectedDelivery').value;
    const remarks = document.getElementById('poRemarks').value.trim();
    
    if (!supplierId) {
        showNotification('Please select a supplier', 'error');
        return;
    }
    
    const items = collectPOItems();
    
    if (items.length === 0) {
        showNotification('Please add at least one item', 'error');
        return;
    }
    
    const suppliers = getSuppliersList();
    const supplier = suppliers.find(s => s.id === supplierId);
    
    const subtotal = items.reduce((sum, item) => sum + item.total, 0);
    
    const poData = {
        id: id || generateUniqueId('PO'),
        poNumber: poNumber,
        date: date,
        supplierId: supplierId,
        supplierName: supplier ? (supplier.company || supplier.name) : 'Unknown',
        expectedDelivery: expectedDelivery || null,
        items: items,
        subtotal: subtotal,
        tax: 0,
        total: subtotal,
        status: status,
        remarks: remarks,
        createdAt: id ? purchaseOrders.find(p => p.id === id)?.createdAt : new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };
    
    if (id) {
        const index = purchaseOrders.findIndex(p => p.id === id);
        if (index !== -1) {
            purchaseOrders[index] = poData;
        }
    } else {
        purchaseOrders.push(poData);
    }
    
    savePOData();
    closePurchaseOrderModal();
    loadPurchaseOrders();
    updatePOStats();
    
    const statusLabel = status === 'draft' ? 'saved as draft' : 'submitted for approval';
    showNotification(`Purchase Order ${poNumber} ${statusLabel}!`, 'success');
}

// ==================== LOAD PURCHASE ORDERS ====================
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
                <td>${formatDate(po.date)}</td>
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
                    <p style="margin: 5px 0 0; color: #64748b;">${formatDate(po.date)}</p>
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
                    <strong>${po.expectedDelivery ? formatDate(po.expectedDelivery) : 'Not specified'}</strong>
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

function deletePurchaseOrder(poId) {
    const po = purchaseOrders.find(p => p.id === poId);
    if (!po) return;
    
    if (confirm(`Delete Purchase Order ${po.poNumber}? This cannot be undone.`)) {
        purchaseOrders = purchaseOrders.filter(p => p.id !== poId);
        savePOData();
        loadPurchaseOrders();
        updatePOStats();
        showNotification('Purchase Order deleted', 'success');
    }
}

function approvePurchaseOrder(poId) {
    const po = purchaseOrders.find(p => p.id === poId);
    if (!po) return;
    
    if (confirm(`Approve Purchase Order ${po.poNumber} for RM ${po.total.toFixed(2)}?`)) {
        po.status = 'approved';
        po.approvedAt = new Date().toISOString();
        savePOData();
        loadPurchaseOrders();
        updatePOStats();
        showNotification(`PO ${po.poNumber} approved!`, 'success');
    }
}

function markAsOrdered(poId) {
    const po = purchaseOrders.find(p => p.id === poId);
    if (!po) return;
    
    if (confirm(`Mark ${po.poNumber} as ordered/sent to supplier?`)) {
        po.status = 'ordered';
        po.orderedAt = new Date().toISOString();
        savePOData();
        loadPurchaseOrders();
        updatePOStats();
        showNotification(`PO ${po.poNumber} marked as ordered`, 'success');
    }
}

// ==================== RECEIVE GOODS ====================
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

function saveGoodsReceipt() {
    const poId = document.getElementById('receivePoId').value;
    const po = purchaseOrders.find(p => p.id === poId);
    if (!po) return;
    
    const receiptDate = document.getElementById('receiveDate').value;
    const deliveryNote = document.getElementById('receiveDeliveryNote').value.trim();
    const notes = document.getElementById('receiveNotes').value.trim();
    
    const rows = document.querySelectorAll('.receive-item-row');
    let hasReceipts = false;
    const receivedItems = [];
    
    rows.forEach((row, idx) => {
        const checkbox = row.querySelector('.rcv-check');
        const qtyInput = row.querySelector('.rcv-qty');
        
        if (checkbox && checkbox.checked && !qtyInput.disabled) {
            const qty = parseFloat(qtyInput.value) || 0;
            if (qty > 0) {
                hasReceipts = true;
                po.items[idx].receivedQty = (po.items[idx].receivedQty || 0) + qty;
                
                receivedItems.push({
                    productId: po.items[idx].productId,
                    productName: po.items[idx].productName,
                    quantity: qty,
                    unitPrice: po.items[idx].unitPrice
                });
                
                // Update inventory stock
                updateInventoryStock(po.items[idx].productId, qty, 'in', `Received from PO ${po.poNumber}`);
            }
        }
    });
    
    if (!hasReceipts) {
        showNotification('Please select items to receive', 'error');
        return;
    }
    
    // Check if all items fully received
    const allReceived = po.items.every(item => (item.receivedQty || 0) >= item.quantity);
    po.status = allReceived ? 'received' : 'partial';
    
    // Create receipt record
    const receipt = {
        id: generateUniqueId('RCV'),
        poId: po.id,
        poNumber: po.poNumber,
        supplierId: po.supplierId,
        supplierName: po.supplierName,
        receiptDate: receiptDate,
        deliveryNote: deliveryNote,
        items: receivedItems,
        totalValue: receivedItems.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0),
        notes: notes,
        tenantId: window.currentUser?.tenantId || null, // Track which tenant created this
        createdAt: new Date().toISOString()
    };
    
    goodsReceipts.push(receipt);
    
    // Update supplier's outstanding balance (accounts payable)
    updateSupplierPayable(po.supplierId, receipt.totalValue);
    
    // Save PO data first
    savePOData();
    
    // Create expense transaction for the received goods
    createPurchaseTransaction(receipt, po);
    
    // Create a bill to pay for the received goods
    createBillFromReceipt(receipt, po);
    
    closeReceiveGoodsModal();
    loadPurchaseOrders();
    loadPendingDeliveries();
    loadRecentReceipts();
    updatePOStats();
    
    // Refresh transactions list if on that page
    if (typeof loadTransactions === 'function') {
        loadTransactions();
    }
    if (typeof loadRecentTransactions === 'function') {
        loadRecentTransactions();
    }
    if (typeof updateDashboard === 'function') {
        updateDashboard();
    }
    // Update reports
    if (typeof updateMonthlyCharts === 'function') {
        updateMonthlyCharts();
    }
    if (typeof updateReports === 'function') {
        updateReports();
    }
    if (typeof updateBalanceSheet === 'function') {
        updateBalanceSheet();
    }
    // Refresh bills list (both Bills page and Dashboard upcoming bills)
    // Use setTimeout to ensure data is saved before loading
    setTimeout(() => {
        if (typeof loadBills === 'function') {
            loadBills();
        }
        if (typeof loadUpcomingBills === 'function') {
            loadUpcomingBills();
        }
    }, 100);
    
    const message = allReceived ? 
        `All items received for PO ${po.poNumber}!` : 
        `Partial receipt recorded for PO ${po.poNumber}`;
    showNotification(message, 'success');
}

// Create expense transaction when goods are received
function createPurchaseTransaction(receipt, po) {
    if (typeof businessData === 'undefined' || !businessData.transactions) {
        console.warn('businessData not available for transaction');
        return;
    }
    
    const transaction = {
        id: generateUniqueId ? generateUniqueId() : 'TXN_' + Date.now(),
        type: 'expense',
        date: receipt.receiptDate,
        amount: receipt.totalValue,
        description: `Purchase - ${receipt.poNumber} (${receipt.items.length} items from ${receipt.supplierName})`,
        category: 'supplies',
        vendor: receipt.supplierName,
        method: 'bank',
        poId: po.id,
        receiptId: receipt.id,
        timestamp: new Date().toISOString()
    };
    
    businessData.transactions.push(transaction);
    
    // Save data
    if (typeof saveData === 'function') {
        saveData();
    }
}

// Create a bill to pay when goods are received
function createBillFromReceipt(receipt, po) {
    if (typeof businessData === 'undefined') {
        console.warn('businessData not available');
        return;
    }
    
    // Ensure bills array exists
    if (!businessData.bills) {
        businessData.bills = [];
    }
    
    // Calculate due date (30 days from receipt by default)
    const dueDate = new Date(receipt.receiptDate);
    dueDate.setDate(dueDate.getDate() + 30);
    
    const bill = {
        id: typeof generateUniqueId === 'function' ? generateUniqueId() : 'BILL_' + Date.now(),
        name: `Payment for ${receipt.poNumber}`,
        amount: receipt.totalValue,
        dueDate: dueDate.toISOString().slice(0, 10),
        category: 'supplies',
        vendor: receipt.supplierName,
        status: 'pending',
        createdAt: new Date().toISOString(),
        // Link to PO and receipt
        poId: po.id,
        receiptId: receipt.id,
        supplierId: po.supplierId,
        isRecurring: false
    };
    
    businessData.bills.push(bill);
    console.log('Bill created:', bill);
    console.log('Total bills now:', businessData.bills.length);
    
    // Save data
    if (typeof saveData === 'function') {
        saveData();
    }
}

function updateInventoryStock(productId, quantity, type, notes) {
    if (!productId || productId === '_custom') return;
    
    const inventory = JSON.parse(localStorage.getItem('ezcubic_inventory') || '[]');
    const product = inventory.find(p => p.id === productId);
    
    if (product) {
        if (type === 'in') {
            product.stock = (product.stock || 0) + quantity;
        } else {
            product.stock = Math.max(0, (product.stock || 0) - quantity);
        }
        localStorage.setItem('ezcubic_inventory', JSON.stringify(inventory));
        // Also save to tenant storage for multi-tenant isolation
        if (typeof saveToUserTenant === 'function') {
            saveToUserTenant();
        }
        
        // Record stock movement
        if (typeof recordStockMovement === 'function') {
            recordStockMovement({
                productId: productId,
                productName: product.name,
                type: type === 'in' ? 'purchase' : 'adjustment',
                quantity: quantity,
                notes: notes
            });
        }
    }
}

function updateSupplierPayable(supplierId, amount) {
    const suppliers = JSON.parse(localStorage.getItem('ezcubic_suppliers') || '[]');
    const supplier = suppliers.find(s => s.id === supplierId);
    
    if (supplier) {
        supplier.outstandingBalance = (parseFloat(supplier.outstandingBalance) || 0) + amount;
        localStorage.setItem('ezcubic_suppliers', JSON.stringify(suppliers));
        // Also save to tenant storage for multi-tenant isolation
        if (typeof saveToUserTenant === 'function') {
            saveToUserTenant();
        }
    }
}

// ==================== RECEIVING TAB ====================
function loadPendingDeliveries() {
    const container = document.getElementById('pendingDeliveriesList');
    if (!container) return;
    
    // Ensure we have synced data
    if (Array.isArray(window.purchaseOrders)) {
        purchaseOrders = window.purchaseOrders;
    }
    
    // Include approved, ordered, and partial status POs for receiving
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
                            ${po.expectedDelivery ? `Due: ${formatDate(po.expectedDelivery)}` : 'No due date'}
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
    
    // Ensure we have synced data
    if (Array.isArray(window.goodsReceipts)) {
        goodsReceipts = window.goodsReceipts;
    }
    
    // Get current tenant ID for filtering
    const currentTenantId = window.currentUser?.tenantId;
    
    // Filter receipts to only show ones belonging to current tenant
    // This filters out any corrupted data that was accidentally saved across tenants
    const tenantReceipts = goodsReceipts.filter(receipt => {
        // If receipt has no tenantId (old data), check if the PO exists in current tenant's purchaseOrders
        if (!receipt.tenantId) {
            const matchingPO = purchaseOrders.find(po => po.id === receipt.poId);
            return matchingPO !== undefined;
        }
        // If receipt has tenantId, it must match current tenant
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
                <td>${formatDate(receipt.receiptDate)}</td>
                <td><strong>${escapeHTML(receipt.poNumber)}</strong></td>
                <td>${escapeHTML(receipt.supplierName)}</td>
                <td>${itemCount} item${itemCount !== 1 ? 's' : ''}</td>
                <td style="font-weight: 600;">RM ${receipt.totalValue.toFixed(2)}</td>
                <td>${receipt.receivedBy || '-'}</td>
            </tr>
        `;
    }).join('');
}

function updateReceivingStats() {
    const today = new Date().toISOString().slice(0, 10);
    const currentMonth = new Date().toISOString().slice(0, 7);
    
    // Get current tenant ID for filtering
    const currentTenantId = window.currentUser?.tenantId;
    
    // Filter receipts to only show ones belonging to current tenant
    const tenantReceipts = goodsReceipts.filter(receipt => {
        if (!receipt.tenantId) {
            const matchingPO = purchaseOrders.find(po => po.id === receipt.poId);
            return matchingPO !== undefined;
        }
        return receipt.tenantId === currentTenantId;
    });
    
    const pendingCount = purchaseOrders.filter(po => ['ordered', 'partial'].includes(po.status)).length;
    const todayReceipts = tenantReceipts.filter(r => r.receiptDate === today);
    const monthReceipts = tenantReceipts.filter(r => r.receiptDate.startsWith(currentMonth));
    
    const todayCount = todayReceipts.length;
    const monthValue = monthReceipts.reduce((sum, r) => sum + (r.totalValue || 0), 0);
    
    const elements = {
        'rcvPendingCount': pendingCount,
        'rcvTodayCount': todayCount,
        'rcvMonthValue': `RM ${monthValue.toFixed(2)}`
    };
    
    Object.entries(elements).forEach(([id, value]) => {
        const el = document.getElementById(id);
        if (el) el.textContent = value;
    });
}

// ==================== STATS & FILTERS ====================
function updatePOStats() {
    const currentMonth = new Date().toISOString().slice(0, 7);
    
    const pending = purchaseOrders.filter(po => po.status === 'pending').length;
    const approved = purchaseOrders.filter(po => ['approved', 'ordered'].includes(po.status)).length;
    const received = purchaseOrders.filter(po => po.status === 'received').length;
    const monthTotal = purchaseOrders
        .filter(po => po.date.startsWith(currentMonth) && po.status !== 'cancelled')
        .reduce((sum, po) => sum + po.total, 0);
    
    const elements = {
        'poPendingCount': pending,
        'poApprovedCount': approved,
        'poReceivedCount': received,
        'poMonthTotal': `RM ${monthTotal.toFixed(2)}`
    };
    
    Object.entries(elements).forEach(([id, value]) => {
        const el = document.getElementById(id);
        if (el) el.textContent = value;
    });
}

function populatePOFilters() {
    const supplierFilter = document.getElementById('poSupplierFilter');
    if (supplierFilter) {
        const suppliers = getSuppliersList();
        supplierFilter.innerHTML = '<option value="">All Suppliers</option>' +
            suppliers.map(s => `<option value="${s.id}">${escapeHTML(s.company || s.name)}</option>`).join('');
    }
}

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
                    <strong>Date:</strong> ${formatDate(po.date)}<br>
                    <strong>Expected Delivery:</strong> ${po.expectedDelivery ? formatDate(po.expectedDelivery) : 'TBD'}
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
function generateUniqueId(prefix = 'ID') {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function escapeHTML(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function formatDate(dateStr) {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-MY', { 
        day: '2-digit', 
        month: 'short', 
        year: 'numeric' 
    });
}

function showNotification(message, type = 'info') {
    if (typeof window.showNotification === 'function' && window.showNotification !== showNotification) {
        window.showNotification(message, type);
    } else {
        console.log(`[${type.toUpperCase()}] ${message}`);
    }
}
