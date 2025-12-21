/**
 * EZCubic Phase 2 - Orders Management Module
 * Order tracking, status management, order history
 */

// ==================== ORDERS INITIALIZATION ====================
function initializeOrders() {
    setDefaultOrderDates();
    renderOrders();
    updateOrderStats();
}

function setDefaultOrderDates() {
    const today = new Date();
    const monthAgo = new Date(today.getFullYear(), today.getMonth() - 1, today.getDate());
    
    const fromInput = document.getElementById('orderDateFrom');
    const toInput = document.getElementById('orderDateTo');
    
    if (fromInput) fromInput.value = monthAgo.toISOString().split('T')[0];
    if (toInput) toInput.value = today.toISOString().split('T')[0];
}

// ==================== ORDER STATS ====================
function updateOrderStats() {
    const totalEl = document.getElementById('totalOrders');
    const completedEl = document.getElementById('completedOrders');
    const pendingEl = document.getElementById('pendingOrders');
    const cancelledEl = document.getElementById('cancelledOrders');
    
    if (!totalEl) return;
    
    const completed = sales.filter(s => s.status === 'completed' || !s.status).length;
    const pending = sales.filter(s => s.status === 'pending').length;
    const processing = sales.filter(s => s.status === 'processing').length;
    const cancelled = sales.filter(s => s.status === 'cancelled').length;
    
    totalEl.textContent = sales.length;
    completedEl.textContent = completed;
    pendingEl.textContent = pending + processing;
    cancelledEl.textContent = cancelled;
    
    // Update badge
    updatePendingOrdersBadge();
}

function updatePendingOrdersBadge() {
    const badge = document.getElementById('pendingOrdersBadge');
    if (!badge) return;
    
    const pendingCount = sales.filter(s => s.status === 'pending' || s.status === 'processing').length;
    
    if (pendingCount > 0) {
        badge.textContent = pendingCount;
        badge.style.display = 'flex';
    } else {
        badge.style.display = 'none';
    }
}

// ==================== ORDER RENDERING ====================
function renderOrders() {
    const tbody = document.getElementById('ordersTableBody');
    if (!tbody) return;
    
    const searchTerm = document.getElementById('orderSearch')?.value?.toLowerCase() || '';
    const fromDate = document.getElementById('orderDateFrom')?.value;
    const toDate = document.getElementById('orderDateTo')?.value;
    const statusFilter = document.getElementById('orderStatusFilter')?.value;
    
    let filtered = sales.filter(order => {
        const date = new Date(order.date);
        const matchesSearch = !searchTerm || 
            order.receiptNo.toLowerCase().includes(searchTerm) ||
            order.customerName.toLowerCase().includes(searchTerm);
        const matchesDate = (!fromDate || date >= new Date(fromDate)) && 
                           (!toDate || date <= new Date(toDate + 'T23:59:59'));
        const orderStatus = order.status || 'completed';
        const matchesStatus = !statusFilter || orderStatus === statusFilter;
        return matchesSearch && matchesDate && matchesStatus;
    });
    
    // Sort by date descending (newest first)
    filtered.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    if (filtered.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="9" style="text-align: center; padding: 40px; color: #94a3b8;">
                    <i class="fas fa-clipboard-list" style="font-size: 48px; margin-bottom: 15px; opacity: 0.5;"></i>
                    <p>${sales.length === 0 ? 'No orders yet. Sales from POS will appear here.' : 'No orders match your filters'}</p>
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = filtered.map(order => {
        const status = order.status || 'completed';
        const statusClass = getOrderStatusClass(status);
        const statusIcon = getOrderStatusIcon(status);
        const paymentIcon = getPaymentIcon(order.paymentMethod);
        const branchDisplay = order.branchName || 'Main Branch';
        
        return `
            <tr>
                <td><strong>${order.receiptNo}</strong></td>
                <td>${formatOrderDate(new Date(order.date))}</td>
                <td>
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <div class="customer-avatar" style="width: 30px; height: 30px; font-size: 11px;">
                            ${getInitials(order.customerName)}
                        </div>
                        ${escapeHtml(order.customerName)}
                    </div>
                </td>
                <td>
                    <span class="branch-badge" style="background: rgba(37, 99, 235, 0.1); color: #2563eb; padding: 4px 8px; border-radius: 4px; font-size: 11px;">
                        <i class="fas fa-store"></i> ${escapeHtml(branchDisplay)}
                    </span>
                </td>
                <td>${order.items.length} items</td>
                <td><strong>${formatMYR(order.total)}</strong></td>
                <td>
                    <span style="display: flex; align-items: center; gap: 5px;">
                        <i class="fas ${paymentIcon}"></i> ${capitalizeFirst(order.paymentMethod)}
                    </span>
                </td>
                <td>
                    <span class="order-status ${statusClass}">
                        <i class="fas ${statusIcon}"></i> ${capitalizeFirst(status)}
                    </span>
                </td>
                <td>
                    <div style="display: flex; gap: 5px;">
                        <button class="btn-outline btn-sm" onclick="viewOrderDetails('${order.id}')" title="View Details">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn-outline btn-sm" onclick="printOrderReceipt('${order.id}')" title="Print Receipt">
                            <i class="fas fa-print"></i>
                        </button>
                        ${status !== 'completed' && status !== 'cancelled' ? `
                            <button class="btn-outline btn-sm" onclick="updateOrderStatus('${order.id}')" title="Update Status">
                                <i class="fas fa-edit"></i>
                            </button>
                        ` : ''}
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

function searchOrders(term) {
    renderOrders();
}

function filterOrders() {
    renderOrders();
}

// ==================== ORDER HELPERS ====================
function getOrderStatusClass(status) {
    switch (status) {
        case 'completed': return 'status-completed';
        case 'pending': return 'status-pending';
        case 'processing': return 'status-processing';
        case 'cancelled': return 'status-cancelled';
        default: return 'status-completed';
    }
}

function getOrderStatusIcon(status) {
    switch (status) {
        case 'completed': return 'fa-check-circle';
        case 'pending': return 'fa-clock';
        case 'processing': return 'fa-spinner';
        case 'cancelled': return 'fa-times-circle';
        default: return 'fa-check-circle';
    }
}

function getPaymentIcon(method) {
    switch (method) {
        case 'cash': return 'fa-money-bill-wave';
        case 'card': return 'fa-credit-card';
        case 'ewallet': return 'fa-mobile-alt';
        case 'qr': return 'fa-qrcode';
        default: return 'fa-money-bill';
    }
}

function getInitials(name) {
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
}

function capitalizeFirst(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
}

function formatOrderDate(date) {
    return date.toLocaleDateString('en-MY', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// ==================== ORDER ACTIONS ====================
function viewOrderDetails(orderId) {
    const order = sales.find(s => s.id === orderId);
    if (!order) return;
    
    const status = order.status || 'completed';
    const statusClass = getOrderStatusClass(status);
    
    const html = `
        <div class="order-details">
            <div class="order-header-info">
                <div>
                    <h4 style="margin: 0;">${order.receiptNo}</h4>
                    <p style="margin: 5px 0; color: #64748b;">${formatOrderDate(new Date(order.date))}</p>
                </div>
                <span class="order-status ${statusClass}" style="font-size: 14px;">
                    <i class="fas ${getOrderStatusIcon(status)}"></i> ${capitalizeFirst(status)}
                </span>
            </div>
            
            <div class="order-customer-info" style="background: #f8fafc; padding: 12px; border-radius: 8px; margin: 15px 0;">
                <strong>Customer:</strong> ${escapeHtml(order.customerName)}<br>
                <strong>Payment:</strong> ${capitalizeFirst(order.paymentMethod)}
                ${order.reference ? `<br><strong>Reference:</strong> ${order.reference}` : ''}
            </div>
            
            <h4 style="margin-bottom: 10px;">Items</h4>
            <div class="order-items-list">
                ${order.items.map(item => `
                    <div class="order-item-row" style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f1f5f9;">
                        <div>
                            <strong>${escapeHtml(item.name)}</strong>
                            <span style="color: #64748b;"> × ${item.quantity}</span>
                        </div>
                        <span>${formatMYR(item.price * item.quantity)}</span>
                    </div>
                `).join('')}
            </div>
            
            <div class="order-totals" style="margin-top: 15px; padding-top: 15px; border-top: 2px solid #e2e8f0;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                    <span>Subtotal</span>
                    <span>${formatMYR(order.subtotal)}</span>
                </div>
                ${order.discount > 0 ? `
                    <div style="display: flex; justify-content: space-between; margin-bottom: 5px; color: #ef4444;">
                        <span>Discount</span>
                        <span>-${formatMYR(order.discount)}</span>
                    </div>
                ` : ''}
                <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                    <span>Tax</span>
                    <span>${formatMYR(order.tax)}</span>
                </div>
                <div style="display: flex; justify-content: space-between; font-weight: bold; font-size: 16px; margin-top: 10px;">
                    <span>TOTAL</span>
                    <span>${formatMYR(order.total)}</span>
                </div>
                ${order.paymentMethod === 'cash' && order.amountReceived ? `
                    <div style="display: flex; justify-content: space-between; margin-top: 10px; padding-top: 10px; border-top: 1px dashed #e2e8f0;">
                        <span>Amount Received</span>
                        <span>${formatMYR(order.amountReceived)}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; color: #10b981;">
                        <span>Change</span>
                        <span>${formatMYR(order.change)}</span>
                    </div>
                ` : ''}
            </div>
        </div>
    `;
    
    // Create modal
    let modal = document.getElementById('orderDetailsModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'orderDetailsModal';
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 500px;">
                <div class="modal-header">
                    <h3 class="modal-title">Order Details</h3>
                    <button class="modal-close" onclick="closeModal('orderDetailsModal')">&times;</button>
                </div>
                <div id="orderDetailsContent"></div>
                <div class="modal-footer">
                    <button type="button" class="btn-secondary" onclick="closeModal('orderDetailsModal')">Close</button>
                    <button type="button" class="btn-outline" onclick="emailCurrentOrder()" style="background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%); color: white; border: none;">
                        <i class="fas fa-envelope"></i> Email
                    </button>
                    <button type="button" class="btn-primary" onclick="printCurrentOrderReceipt()">
                        <i class="fas fa-print"></i> Print Receipt
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }
    
    document.getElementById('orderDetailsContent').innerHTML = html;
    modal.dataset.orderId = orderId;
    modal.style.display = '';
    modal.classList.add('show');
}

function printCurrentOrderReceipt() {
    const modal = document.getElementById('orderDetailsModal');
    if (modal && modal.dataset.orderId) {
        printOrderReceipt(modal.dataset.orderId);
    }
}

function printOrderReceipt(orderId) {
    const order = sales.find(s => s.id === orderId);
    if (!order) return;
    
    // Use the existing printReceipt function from pos.js if available
    if (typeof printReceipt === 'function') {
        // Temporarily store the order data and call print
        const receiptData = {
            ...order,
            businessName: businessData.settings.businessName || 'My Business'
        };
        printReceiptFromOrder(receiptData);
    } else {
        showToast('Print functionality not available', 'error');
    }
}

function printReceiptFromOrder(order) {
    const receiptContent = `
        <div style="font-family: monospace; width: 280px; padding: 20px;">
            <div style="text-align: center; margin-bottom: 15px;">
                <h2 style="margin: 0;">${order.businessName}</h2>
                <p style="margin: 5px 0;">Receipt</p>
            </div>
            <div style="border-top: 1px dashed #000; border-bottom: 1px dashed #000; padding: 10px 0; margin: 10px 0;">
                <p style="margin: 3px 0;"><strong>Receipt:</strong> ${order.receiptNo}</p>
                <p style="margin: 3px 0;"><strong>Date:</strong> ${formatOrderDate(new Date(order.date))}</p>
                <p style="margin: 3px 0;"><strong>Customer:</strong> ${order.customerName}</p>
            </div>
            <div style="margin: 10px 0;">
                ${order.items.map(item => `
                    <div style="display: flex; justify-content: space-between; margin: 5px 0;">
                        <span>${item.name} × ${item.quantity}</span>
                        <span>RM ${(item.price * item.quantity).toFixed(2)}</span>
                    </div>
                `).join('')}
            </div>
            <div style="border-top: 1px dashed #000; padding-top: 10px; margin-top: 10px;">
                <div style="display: flex; justify-content: space-between;"><span>Subtotal</span><span>RM ${order.subtotal.toFixed(2)}</span></div>
                ${order.discount > 0 ? `<div style="display: flex; justify-content: space-between;"><span>Discount</span><span>-RM ${order.discount.toFixed(2)}</span></div>` : ''}
                <div style="display: flex; justify-content: space-between;"><span>Tax</span><span>RM ${order.tax.toFixed(2)}</span></div>
                <div style="display: flex; justify-content: space-between; font-weight: bold; font-size: 16px; margin-top: 5px;"><span>TOTAL</span><span>RM ${order.total.toFixed(2)}</span></div>
            </div>
            <div style="text-align: center; margin-top: 15px; font-size: 12px;">
                <p>Thank you for your business!</p>
            </div>
        </div>
    `;
    
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`<html><head><title>Receipt</title></head><body>${receiptContent}</body></html>`);
    printWindow.document.close();
    printWindow.print();
}

function updateOrderStatus(orderId) {
    const order = sales.find(s => s.id === orderId);
    if (!order) return;
    
    const currentStatus = order.status || 'completed';
    
    const html = `
        <div class="form-group">
            <label class="form-label">Current Status: <strong>${capitalizeFirst(currentStatus)}</strong></label>
        </div>
        <div class="form-group">
            <label class="form-label">New Status</label>
            <select id="newOrderStatus" class="form-control">
                <option value="pending" ${currentStatus === 'pending' ? 'selected' : ''}>Pending</option>
                <option value="processing" ${currentStatus === 'processing' ? 'selected' : ''}>Processing</option>
                <option value="completed" ${currentStatus === 'completed' ? 'selected' : ''}>Completed</option>
                <option value="cancelled" ${currentStatus === 'cancelled' ? 'selected' : ''}>Cancelled</option>
            </select>
        </div>
        <div class="form-group">
            <label class="form-label">Notes (Optional)</label>
            <textarea id="statusNotes" class="form-control" rows="2" placeholder="Add a note about this status change"></textarea>
        </div>
    `;
    
    // Create modal
    let modal = document.getElementById('updateStatusModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'updateStatusModal';
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 400px;">
                <div class="modal-header">
                    <h3 class="modal-title">Update Order Status</h3>
                    <button class="modal-close" onclick="closeModal('updateStatusModal')">&times;</button>
                </div>
                <div id="updateStatusContent"></div>
                <div class="modal-footer">
                    <button type="button" class="btn-secondary" onclick="closeModal('updateStatusModal')">Cancel</button>
                    <button type="button" class="btn-primary" onclick="saveOrderStatus()">Update Status</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }
    
    document.getElementById('updateStatusContent').innerHTML = html;
    modal.dataset.orderId = orderId;
    modal.style.display = '';
    modal.classList.add('show');
}

function saveOrderStatus() {
    const modal = document.getElementById('updateStatusModal');
    if (!modal || !modal.dataset.orderId) return;
    
    const orderId = modal.dataset.orderId;
    const newStatus = document.getElementById('newOrderStatus').value;
    const notes = document.getElementById('statusNotes').value.trim();
    
    const orderIndex = sales.findIndex(s => s.id === orderId);
    if (orderIndex === -1) return;
    
    sales[orderIndex].status = newStatus;
    if (notes) {
        sales[orderIndex].statusNotes = notes;
    }
    sales[orderIndex].statusUpdatedAt = new Date().toISOString();
    
    localStorage.setItem(SALES_KEY, JSON.stringify(sales));
    
    // Sync to tenant storage
    window.sales = sales;
    if (typeof saveToUserTenant === 'function') {
        saveToUserTenant();
    }
    
    closeModal('updateStatusModal');
    renderOrders();
    updateOrderStats();
    showToast(`Order status updated to ${capitalizeFirst(newStatus)}`, 'success');
}

// ==================== EXPORT ORDERS ====================
function exportOrders() {
    if (sales.length === 0) {
        showToast('No orders to export', 'info');
        return;
    }
    
    // Create CSV content
    const headers = ['Receipt #', 'Date', 'Customer', 'Items', 'Subtotal', 'Discount', 'Tax', 'Total', 'Payment Method', 'Status'];
    const rows = sales.map(order => [
        order.receiptNo,
        new Date(order.date).toLocaleString('en-MY'),
        order.customerName,
        order.items.length,
        order.subtotal.toFixed(2),
        order.discount.toFixed(2),
        order.tax.toFixed(2),
        order.total.toFixed(2),
        order.paymentMethod,
        order.status || 'completed'
    ]);
    
    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `orders_export_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showToast('Orders exported successfully!', 'success');
}

// ==================== EMAIL ORDER ====================
function emailCurrentOrder() {
    const modal = document.getElementById('orderDetailsModal');
    if (!modal || !modal.dataset.orderId) return;
    
    const order = sales.find(s => s.id === modal.dataset.orderId);
    if (!order) {
        showNotification('Error', 'Order not found', 'error');
        return;
    }

    // Get company settings
    const settings = JSON.parse(localStorage.getItem('companySettings') || '{}');
    const companyName = settings.businessName || 'Our Store';

    // Build items list
    const itemsList = order.items.map((item, i) => 
        `${i + 1}. ${item.name} x ${item.quantity} @ RM${item.price.toFixed(2)} = RM${(item.quantity * item.price).toFixed(2)}`
    ).join('%0D%0A');

    // Build email subject
    const subject = encodeURIComponent(`Order Receipt from ${companyName} - ${order.receiptNo}`);

    // Build email body
    const body = encodeURIComponent(
`Dear ${order.customerName || 'Customer'},

Thank you for your order at ${companyName}!

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ORDER: ${order.receiptNo}
Date: ${order.date}
Status: ${order.status ? order.status.charAt(0).toUpperCase() + order.status.slice(1) : 'Completed'}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

ITEMS:
${itemsList}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Subtotal: RM ${order.subtotal.toFixed(2)}
${order.discount > 0 ? `Discount: - RM ${order.discount.toFixed(2)}\n` : ''}Tax: RM ${order.tax.toFixed(2)}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TOTAL: RM ${order.total.toFixed(2)}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Payment Method: ${order.paymentMethod ? order.paymentMethod.charAt(0).toUpperCase() + order.paymentMethod.slice(1) : 'N/A'}
${order.reference ? `Reference: ${order.reference}` : ''}

Thank you for your business!

${companyName}
`);

    // Open mailto link
    const mailtoLink = `mailto:?subject=${subject}&body=${body}`;
    window.location.href = mailtoLink;

    showNotification('Email Opened', 'Your email app should open with the order details.', 'success');
}

// ==================== WINDOW EXPORTS ====================
window.initializeOrders = initializeOrders;
window.renderOrders = renderOrders;
window.updateOrderStats = updateOrderStats;
window.updatePendingOrdersBadge = updatePendingOrdersBadge;
window.viewOrderDetails = viewOrderDetails;
window.printOrderReceipt = printOrderReceipt;
window.updateOrderStatus = updateOrderStatus;
window.saveOrderStatus = saveOrderStatus;
window.exportOrders = exportOrders;
window.emailCurrentOrder = emailCurrentOrder;

// Note: Orders module is initialized by app.js via initializePhase2Modules()
