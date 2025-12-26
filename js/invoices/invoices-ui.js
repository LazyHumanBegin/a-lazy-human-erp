/**
 * EZCubic Smart Accounting - Invoice UI Module
 * UI rendering: modals, rendering, view, send functions
 * Split from invoices.js for v2.3.1
 */

// Modal state
let editingInvoiceId = null;
let invoiceItemCounter = 0;

// ==================== RENDER INVOICES ====================
function renderInvoices() {
    const tbody = document.getElementById('invoicesTableBody');
    if (!tbody) return;
    
    const searchTerm = document.getElementById('invoiceSearch')?.value?.toLowerCase() || '';
    const statusFilter = document.getElementById('invoiceStatusFilter')?.value || '';
    const dateFrom = document.getElementById('invoiceDateFrom')?.value || '';
    const dateTo = document.getElementById('invoiceDateTo')?.value || '';
    
    let filtered = invoices.filter(inv => {
        const matchesSearch = !searchTerm || 
            inv.invoiceNo?.toLowerCase().includes(searchTerm) ||
            inv.customerName?.toLowerCase().includes(searchTerm) ||
            inv.description?.toLowerCase().includes(searchTerm);
        
        const matchesStatus = !statusFilter || inv.status === statusFilter;
        
        const invDate = new Date(inv.date);
        const matchesDateFrom = !dateFrom || invDate >= new Date(dateFrom);
        const matchesDateTo = !dateTo || invDate <= new Date(dateTo + 'T23:59:59');
        
        return matchesSearch && matchesStatus && matchesDateFrom && matchesDateTo;
    });
    
    // Sort by date descending
    filtered.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    if (filtered.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" style="text-align: center; padding: 40px; color: #94a3b8;">
                    <i class="fas fa-file-invoice" style="font-size: 48px; margin-bottom: 15px; opacity: 0.5;"></i>
                    <p>${invoices.length === 0 ? 'No invoices yet. Click "New Invoice" to create one.' : 'No invoices match your filters'}</p>
                </td>
            </tr>
        `;
        return;
    }
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    tbody.innerHTML = filtered.map(inv => {
        const dueDate = new Date(inv.dueDate);
        const isOverdue = (inv.status === 'unpaid' || inv.status === 'partial') && dueDate < today;
        const statusClass = getInvoiceStatusClass(inv.status, isOverdue);
        const statusLabel = isOverdue ? 'Overdue' : getInvoiceStatusLabel(inv.status);
        const outstanding = (inv.total || 0) - (inv.paidAmount || 0);
        
        return `
            <tr onclick="viewInvoice('${inv.id}')" style="cursor: pointer;">
                <td><strong>${escapeHtml(inv.invoiceNo)}</strong></td>
                <td>${escapeHtml(inv.customerName || 'N/A')}</td>
                <td>${formatDate(inv.date)}</td>
                <td>${formatDate(inv.dueDate)}</td>
                <td style="text-align: right;"><strong>RM ${(inv.total || 0).toFixed(2)}</strong></td>
                <td style="text-align: right;">${inv.status === 'paid' ? '-' : `RM ${outstanding.toFixed(2)}`}</td>
                <td><span class="status-badge ${statusClass}">${statusLabel}</span></td>
                <td onclick="event.stopPropagation();">
                    <div class="action-buttons">
                        <button class="btn-icon" onclick="editInvoice('${inv.id}')" title="Edit">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn-icon" onclick="recordPayment('${inv.id}')" title="Record Payment" ${inv.status === 'paid' ? 'disabled' : ''}>
                            <i class="fas fa-money-bill-wave"></i>
                        </button>
                        <button class="btn-icon" onclick="generateInvoicePDF('${inv.id}')" title="Generate PDF">
                            <i class="fas fa-file-pdf"></i>
                        </button>
                        <button class="btn-icon" onclick="sendInvoiceEmail('${inv.id}')" title="Send Email" style="color: #3b82f6;">
                            <i class="fas fa-envelope"></i>
                        </button>
                        <button class="btn-icon" onclick="sendInvoiceWhatsApp('${inv.id}')" title="Send WhatsApp" style="color: #25d366;">
                            <i class="fab fa-whatsapp"></i>
                        </button>
                        <button class="btn-icon btn-danger" onclick="deleteInvoice('${inv.id}')" title="Delete">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

// ==================== INVOICE MODAL ====================
function showNewInvoiceModal() {
    editingInvoiceId = null;
    invoiceItemCounter = 0;
    
    document.getElementById('invoiceModalTitle').textContent = 'Create New Invoice';
    document.getElementById('invoiceNo').value = generateInvoiceNo();
    document.getElementById('invoiceDate').value = new Date().toISOString().split('T')[0];
    
    // Default due date: 30 days from now
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 30);
    document.getElementById('invoiceDueDate').value = dueDate.toISOString().split('T')[0];
    
    document.getElementById('invoiceCustomer').value = '';
    document.getElementById('invoiceDescription').value = '';
    document.getElementById('invoiceNotes').value = '';
    document.getElementById('invoiceTerms').value = 'Payment due within 30 days of invoice date.';
    document.getElementById('invoiceStatus').value = 'unpaid';
    
    // Recurring options
    document.getElementById('invoiceRecurring').checked = false;
    document.getElementById('recurringInvoiceOptions').style.display = 'none';
    document.getElementById('invoiceRecurringFrequency').value = 'monthly';
    document.getElementById('invoiceRecurringEnd').value = '';
    
    // Clear items
    const container = document.getElementById('invoiceItemsContainer');
    container.innerHTML = '';
    addInvoiceItem();
    
    updateInvoiceTotals();
    populateInvoiceCustomerDropdown();
    
    document.getElementById('invoiceModal').style.display = 'flex';
}

function editInvoice(id) {
    const invoice = invoices.find(inv => inv.id === id);
    if (!invoice) return;
    
    editingInvoiceId = id;
    invoiceItemCounter = 0;
    
    document.getElementById('invoiceModalTitle').textContent = 'Edit Invoice';
    document.getElementById('invoiceNo').value = invoice.invoiceNo;
    document.getElementById('invoiceDate').value = invoice.date;
    document.getElementById('invoiceDueDate').value = invoice.dueDate;
    document.getElementById('invoiceCustomer').value = invoice.customerId || '';
    document.getElementById('invoiceDescription').value = invoice.description || '';
    document.getElementById('invoiceNotes').value = invoice.notes || '';
    document.getElementById('invoiceTerms').value = invoice.terms || 'Payment due within 30 days of invoice date.';
    document.getElementById('invoiceStatus').value = invoice.status || 'unpaid';
    
    // Recurring options
    document.getElementById('invoiceRecurring').checked = invoice.isRecurring || false;
    document.getElementById('recurringInvoiceOptions').style.display = invoice.isRecurring ? 'block' : 'none';
    document.getElementById('invoiceRecurringFrequency').value = invoice.recurringFrequency || 'monthly';
    document.getElementById('invoiceRecurringEnd').value = invoice.recurringEndDate || '';
    
    // Load items
    const container = document.getElementById('invoiceItemsContainer');
    container.innerHTML = '';
    
    if (invoice.items && invoice.items.length > 0) {
        invoice.items.forEach(item => addInvoiceItem(item));
    } else {
        addInvoiceItem();
    }
    
    updateInvoiceTotals();
    populateInvoiceCustomerDropdown();
    
    document.getElementById('invoiceModal').style.display = 'flex';
}

function closeInvoiceModal() {
    document.getElementById('invoiceModal').style.display = 'none';
    editingInvoiceId = null;
}

function toggleRecurringInvoiceOptions() {
    const isRecurring = document.getElementById('invoiceRecurring').checked;
    document.getElementById('recurringInvoiceOptions').style.display = isRecurring ? 'block' : 'none';
}

function populateInvoiceCustomerDropdown() {
    const select = document.getElementById('invoiceCustomer');
    if (!select) return;
    
    // Get customers from CRM
    const customers = window.crmCustomers || [];
    
    // Keep current value
    const currentValue = select.value;
    
    select.innerHTML = '<option value="">-- Select Customer --</option>';
    
    customers.forEach(c => {
        const option = document.createElement('option');
        option.value = c.id;
        option.textContent = c.company ? `${c.name} (${c.company})` : c.name;
        select.appendChild(option);
    });
    
    // Restore value
    if (currentValue) select.value = currentValue;
}

// ==================== INVOICE ITEMS ====================
function addInvoiceItem(item = null) {
    const container = document.getElementById('invoiceItemsContainer');
    const itemId = invoiceItemCounter++;
    
    const row = document.createElement('div');
    row.className = 'invoice-item-row';
    row.dataset.itemId = itemId;
    row.innerHTML = `
        <div class="invoice-item-grid">
            <input type="text" class="form-control item-description" placeholder="Service/Item description" value="${escapeHtml(item?.description || '')}">
            <input type="number" class="form-control item-quantity" placeholder="Qty" min="1" step="1" value="${item?.quantity || 1}" onchange="updateInvoiceTotals()">
            <input type="number" class="form-control item-price" placeholder="Unit Price" min="0" step="0.01" value="${item?.unitPrice || ''}" onchange="updateInvoiceTotals()">
            <input type="text" class="form-control item-amount" readonly value="${item ? (item.quantity * item.unitPrice).toFixed(2) : '0.00'}">
            <button type="button" class="btn-icon btn-danger" onclick="removeInvoiceItem(this)" title="Remove">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `;
    
    container.appendChild(row);
}

function removeInvoiceItem(btn) {
    const container = document.getElementById('invoiceItemsContainer');
    if (container.children.length > 1) {
        btn.closest('.invoice-item-row').remove();
        updateInvoiceTotals();
    } else {
        showNotification('Invoice must have at least one item', 'warning');
    }
}

function updateInvoiceTotals() {
    const rows = document.querySelectorAll('.invoice-item-row');
    let subtotal = 0;
    
    rows.forEach(row => {
        const qty = parseFloat(row.querySelector('.item-quantity').value) || 0;
        const price = parseFloat(row.querySelector('.item-price').value) || 0;
        const amount = qty * price;
        row.querySelector('.item-amount').value = amount.toFixed(2);
        subtotal += amount;
    });
    
    // Get tax rate (default 0 for services)
    const taxRate = parseFloat(document.getElementById('invoiceTaxRate')?.value) || 0;
    const tax = subtotal * (taxRate / 100);
    const total = subtotal + tax;
    
    document.getElementById('invoiceSubtotal').textContent = `RM ${subtotal.toFixed(2)}`;
    document.getElementById('invoiceTax').textContent = `RM ${tax.toFixed(2)}`;
    document.getElementById('invoiceTotal').textContent = `RM ${total.toFixed(2)}`;
}

// ==================== VIEW INVOICE ====================
function viewInvoice(id) {
    const invoice = invoices.find(inv => inv.id === id);
    if (!invoice) return;
    
    const modal = document.getElementById('viewInvoiceModal');
    const content = document.getElementById('viewInvoiceContent');
    
    const isOverdue = (invoice.status === 'unpaid' || invoice.status === 'partial') && new Date(invoice.dueDate) < new Date();
    const statusClass = getInvoiceStatusClass(invoice.status, isOverdue);
    const statusLabel = isOverdue ? 'OVERDUE' : getInvoiceStatusLabel(invoice.status).toUpperCase();
    
    const settings = businessData?.settings || {};
    const companyName = settings.businessName || 'My Business';
    const companyAddress = settings.businessAddress || '';
    const companyPhone = settings.businessPhone || '';
    const companyEmail = settings.businessEmail || '';
    const companySSM = settings.ssmNumber || '';
    
    content.innerHTML = `
        <div class="invoice-preview">
            <div class="invoice-header-section">
                <div class="company-details">
                    ${settings.companyLogo ? `<img src="${settings.companyLogo}" alt="Logo" style="max-height: 60px; margin-bottom: 10px;">` : ''}
                    <h2 style="margin: 0; color: #1e293b;">${escapeHtml(companyName)}</h2>
                    ${companySSM ? `<p style="margin: 2px 0; color: #64748b; font-size: 12px;">SSM: ${escapeHtml(companySSM)}</p>` : ''}
                    ${companyAddress ? `<p style="margin: 2px 0; color: #64748b; font-size: 12px;">${escapeHtml(companyAddress)}</p>` : ''}
                    ${companyPhone ? `<p style="margin: 2px 0; color: #64748b; font-size: 12px;">Tel: ${escapeHtml(companyPhone)}</p>` : ''}
                    ${companyEmail ? `<p style="margin: 2px 0; color: #64748b; font-size: 12px;">Email: ${escapeHtml(companyEmail)}</p>` : ''}
                </div>
                <div class="invoice-title-section" style="text-align: right;">
                    <h1 style="margin: 0; color: #2563eb; font-size: 28px;">INVOICE</h1>
                    <p style="font-size: 18px; font-weight: 600; margin: 5px 0;">${escapeHtml(invoice.invoiceNo)}</p>
                    <span class="status-badge ${statusClass}" style="font-size: 12px;">${statusLabel}</span>
                </div>
            </div>
            
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin: 20px 0; padding: 15px; background: #f8fafc; border-radius: 8px;">
                <div>
                    <h4 style="margin: 0 0 8px; color: #64748b; font-size: 12px; text-transform: uppercase;">Bill To</h4>
                    <p style="margin: 0; font-weight: 600; color: #1e293b;">${escapeHtml(invoice.customerName)}</p>
                    ${invoice.customerDetails?.address ? `<p style="margin: 2px 0; color: #64748b; font-size: 13px;">${escapeHtml(invoice.customerDetails.address)}</p>` : ''}
                    ${invoice.customerDetails?.email ? `<p style="margin: 2px 0; color: #64748b; font-size: 13px;">${escapeHtml(invoice.customerDetails.email)}</p>` : ''}
                    ${invoice.customerDetails?.phone ? `<p style="margin: 2px 0; color: #64748b; font-size: 13px;">${escapeHtml(invoice.customerDetails.phone)}</p>` : ''}
                </div>
                <div style="text-align: right;">
                    <p style="margin: 2px 0;"><strong>Invoice Date:</strong> ${formatDate(invoice.date)}</p>
                    <p style="margin: 2px 0;"><strong>Due Date:</strong> ${formatDate(invoice.dueDate)}</p>
                    ${invoice.isRecurring ? `<p style="margin: 2px 0; color: #8b5cf6;"><i class="fas fa-redo"></i> Recurring (${invoice.recurringFrequency})</p>` : ''}
                </div>
            </div>
            
            ${invoice.description ? `<p style="margin: 10px 0; color: #475569;"><strong>Description:</strong> ${escapeHtml(invoice.description)}</p>` : ''}
            
            <table style="width: 100%; border-collapse: collapse; margin: 15px 0;">
                <thead>
                    <tr style="background: #1e293b; color: white;">
                        <th style="padding: 10px; text-align: left;">Description</th>
                        <th style="padding: 10px; text-align: center; width: 80px;">Qty</th>
                        <th style="padding: 10px; text-align: right; width: 120px;">Unit Price</th>
                        <th style="padding: 10px; text-align: right; width: 120px;">Amount</th>
                    </tr>
                </thead>
                <tbody>
                    ${invoice.items.map(item => `
                        <tr style="border-bottom: 1px solid #e2e8f0;">
                            <td style="padding: 10px;">${escapeHtml(item.description)}</td>
                            <td style="padding: 10px; text-align: center;">${item.quantity}</td>
                            <td style="padding: 10px; text-align: right;">RM ${item.unitPrice.toFixed(2)}</td>
                            <td style="padding: 10px; text-align: right;">RM ${item.amount.toFixed(2)}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
            
            <div style="display: flex; justify-content: flex-end;">
                <div style="width: 250px;">
                    <div style="display: flex; justify-content: space-between; padding: 5px 0; border-bottom: 1px solid #e2e8f0;">
                        <span>Subtotal:</span>
                        <span>RM ${invoice.subtotal.toFixed(2)}</span>
                    </div>
                    ${invoice.tax > 0 ? `
                    <div style="display: flex; justify-content: space-between; padding: 5px 0; border-bottom: 1px solid #e2e8f0;">
                        <span>Tax (${invoice.taxRate}%):</span>
                        <span>RM ${invoice.tax.toFixed(2)}</span>
                    </div>
                    ` : ''}
                    <div style="display: flex; justify-content: space-between; padding: 10px 0; font-size: 18px; font-weight: 700; color: #1e293b;">
                        <span>Total:</span>
                        <span>RM ${invoice.total.toFixed(2)}</span>
                    </div>
                    ${invoice.paidAmount > 0 ? `
                    <div style="display: flex; justify-content: space-between; padding: 5px 0; color: #10b981;">
                        <span>Paid:</span>
                        <span>RM ${invoice.paidAmount.toFixed(2)}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; padding: 5px 0; font-weight: 600; color: #ef4444;">
                        <span>Balance Due:</span>
                        <span>RM ${(invoice.total - invoice.paidAmount).toFixed(2)}</span>
                    </div>
                    ` : ''}
                </div>
            </div>
            
            ${invoice.notes ? `
            <div style="margin-top: 20px; padding: 10px; background: #fef3c7; border-radius: 6px;">
                <strong>Notes:</strong> ${escapeHtml(invoice.notes)}
            </div>
            ` : ''}
            
            ${invoice.terms ? `
            <div style="margin-top: 10px; padding: 10px; background: #f1f5f9; border-radius: 6px; font-size: 12px; color: #64748b;">
                <strong>Terms & Conditions:</strong> ${escapeHtml(invoice.terms)}
            </div>
            ` : ''}
        </div>
    `;
    
    // Set up action buttons
    document.getElementById('viewInvoiceId').value = id;
    
    modal.style.display = 'flex';
}

function closeViewInvoiceModal() {
    document.getElementById('viewInvoiceModal').style.display = 'none';
}

// ==================== PAYMENT MODAL ====================
function recordPayment(id) {
    const invoice = invoices.find(inv => inv.id === id);
    if (!invoice || invoice.status === 'paid') return;
    
    const outstanding = invoice.total - (invoice.paidAmount || 0);
    
    document.getElementById('paymentInvoiceId').value = id;
    document.getElementById('paymentInvoiceNo').textContent = invoice.invoiceNo;
    document.getElementById('paymentOutstanding').textContent = `RM ${outstanding.toFixed(2)}`;
    document.getElementById('paymentAmount').value = outstanding.toFixed(2);
    document.getElementById('paymentAmount').max = outstanding;
    document.getElementById('paymentDate').value = new Date().toISOString().split('T')[0];
    document.getElementById('paymentMethod').value = 'bank';
    document.getElementById('paymentReference').value = '';
    document.getElementById('paymentNotes').value = '';
    
    document.getElementById('paymentModal').style.display = 'flex';
}

function closePaymentModal() {
    document.getElementById('paymentModal').style.display = 'none';
}

// ==================== PRINT / PDF ====================
function printInvoicePDF(id) {
    const invoice = invoices.find(inv => inv.id === id);
    if (!invoice) return;
    
    // Open view modal first to render content
    viewInvoice(id);
    
    setTimeout(() => {
        const content = document.getElementById('viewInvoiceContent');
        if (!content) return;
        
        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Invoice ${invoice.invoiceNo}</title>
                <style>
                    body { font-family: 'Segoe UI', Arial, sans-serif; padding: 20px; color: #1e293b; }
                    .invoice-preview { max-width: 800px; margin: 0 auto; }
                    table { width: 100%; border-collapse: collapse; }
                    th, td { padding: 10px; text-align: left; }
                    th { background: #1e293b; color: white; }
                    tr:nth-child(even) { background: #f8fafc; }
                    .status-badge { padding: 4px 12px; border-radius: 12px; font-size: 11px; font-weight: 600; }
                    .status-success { background: #dcfce7; color: #166534; }
                    .status-warning { background: #fef3c7; color: #92400e; }
                    .status-pending { background: #e0e7ff; color: #3730a3; }
                    .status-overdue { background: #fee2e2; color: #991b1b; }
                    @media print { body { padding: 0; } }
                </style>
            </head>
            <body>
                ${content.innerHTML}
            </body>
            </html>
        `);
        printWindow.document.close();
        printWindow.print();
    }, 300);
}

// Alias for backward compatibility
function generateInvoicePDF(id) {
    printInvoicePDF(id);
}

// ==================== SEND INVOICE ====================
function sendInvoiceEmail(id) {
    const invoice = invoices.find(inv => inv.id === id);
    if (!invoice) return;
    
    const email = invoice.customerDetails?.email || '';
    const companyName = businessData?.settings?.businessName || 'Our Company';
    
    const subject = encodeURIComponent(`Invoice ${invoice.invoiceNo} from ${companyName}`);
    const body = encodeURIComponent(`Dear ${invoice.customerName},\n\nPlease find attached Invoice ${invoice.invoiceNo} for RM ${invoice.total.toFixed(2)}.\n\nDue Date: ${formatDate(invoice.dueDate)}\n\nThank you for your business.\n\nBest regards,\n${companyName}`);
    
    if (!email) {
        showNotification('No email address found for this customer', 'warning');
    }
    
    window.open(`mailto:${email}?subject=${subject}&body=${body}`, '_blank');
    showNotification(`Opening email for ${invoice.invoiceNo}`, 'info');
}

function sendInvoiceWhatsApp(id) {
    const invoice = invoices.find(inv => inv.id === id);
    if (!invoice) return;
    
    const companyName = businessData?.settings?.businessName || 'Our Company';
    let phone = invoice.customerDetails?.phone?.replace(/[^0-9]/g, '') || '';
    
    // Add Malaysia country code if not present
    if (phone && !phone.startsWith('60') && phone.startsWith('0')) {
        phone = '60' + phone.substring(1);
    } else if (phone && !phone.startsWith('60')) {
        phone = '60' + phone;
    }
    
    const message = encodeURIComponent(`Hi ${invoice.customerName},\n\nYour invoice *${invoice.invoiceNo}* for *RM ${invoice.total.toFixed(2)}* is ready.\n\n📅 Due Date: ${formatDate(invoice.dueDate)}\n\nThank you for your business!\n\n_${companyName}_`);
    
    if (!phone) {
        showNotification('No phone number found for this customer', 'warning');
        return;
    }
    
    window.open(`https://wa.me/${phone}?text=${message}`, '_blank');
    showNotification(`Opening WhatsApp for ${invoice.invoiceNo}`, 'info');
}

// Legacy function for backward compatibility
function sendInvoice(id) {
    sendInvoiceEmail(id);
}

// ==================== EXPORT TO WINDOW ====================
window.renderInvoices = renderInvoices;
window.showNewInvoiceModal = showNewInvoiceModal;
window.editInvoice = editInvoice;
window.closeInvoiceModal = closeInvoiceModal;
window.toggleRecurringInvoiceOptions = toggleRecurringInvoiceOptions;
window.populateInvoiceCustomerDropdown = populateInvoiceCustomerDropdown;
window.addInvoiceItem = addInvoiceItem;
window.removeInvoiceItem = removeInvoiceItem;
window.updateInvoiceTotals = updateInvoiceTotals;
window.viewInvoice = viewInvoice;
window.closeViewInvoiceModal = closeViewInvoiceModal;
window.recordPayment = recordPayment;
window.closePaymentModal = closePaymentModal;
window.printInvoicePDF = printInvoicePDF;
window.generateInvoicePDF = generateInvoicePDF;
window.sendInvoiceEmail = sendInvoiceEmail;
window.sendInvoiceWhatsApp = sendInvoiceWhatsApp;
window.sendInvoice = sendInvoice;
