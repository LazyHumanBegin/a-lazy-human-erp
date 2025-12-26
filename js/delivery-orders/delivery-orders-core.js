/**
 * EZCubic - Delivery Orders Core Module - Data and CRUD Operations
 * Split from delivery-orders.js v2.3.2
 * Version: 1.0.0 - 26 Dec 2025
 */

// ==================== GLOBAL VARIABLES ====================
let deliveryOrders = [];
const DELIVERY_ORDERS_KEY = 'ezcubic_delivery_orders';

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

// ==================== SYNC ====================
// Sync local variable with window (called by multi-tenant system)
function syncDeliveryOrdersFromWindow() {
    if (Array.isArray(window.deliveryOrders)) {
        deliveryOrders = window.deliveryOrders;
    }
}

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

// ==================== GENERATE DO NUMBER ====================
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

// ==================== CRUD OPERATIONS ====================
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

// ==================== EXPORT ====================
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

// ==================== WINDOW EXPORTS ====================
window.DO_STATUS = DO_STATUS;
window.deliveryOrders = deliveryOrders;
window.currentDOTab = currentDOTab;
window.DELIVERY_ORDERS_KEY = DELIVERY_ORDERS_KEY;

window.syncDeliveryOrdersFromWindow = syncDeliveryOrdersFromWindow;
window.initializeDeliveryOrders = initializeDeliveryOrders;
window.loadDeliveryOrders = loadDeliveryOrders;
window.saveDeliveryOrders = saveDeliveryOrders;
window.updateDOStats = updateDOStats;
window.generateDONumber = generateDONumber;
window.saveDO = saveDO;
window.deleteDO = deleteDO;
window.confirmDO = confirmDO;
window.markDOShipped = markDOShipped;
window.markDODelivered = markDODelivered;
window.exportDeliveryOrders = exportDeliveryOrders;
window.formatDate = formatDate;
