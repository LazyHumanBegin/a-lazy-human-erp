/**
 * EZCubic Smart Accounting - Invoice Core Module
 * Data management: CRUD, save/load, payment logic, recurring
 * Split from invoices.js for v2.3.1
 */

const INVOICES_KEY = 'ezcubic_invoices';
let invoices = [];

// ==================== INITIALIZATION ====================
function initializeInvoices() {
    loadInvoices();
    renderInvoices();
    updateInvoiceStats();
    checkRecurringInvoices();
}

function loadInvoices() {
    // PRIORITY 1: Load from tenant storage directly
    const user = window.currentUser;
    if (user && user.tenantId) {
        const tenantKey = 'ezcubic_tenant_' + user.tenantId;
        const tenantData = JSON.parse(localStorage.getItem(tenantKey) || '{}');
        if (Array.isArray(tenantData.invoices) && tenantData.invoices.length > 0) {
            invoices = tenantData.invoices;
            window.invoices = invoices;
            console.log('✅ Invoices loaded from tenant:', invoices.length);
            return;
        }
    }
    
    // PRIORITY 2: Check window.invoices
    if (Array.isArray(window.invoices) && window.invoices.length > 0) {
        invoices = window.invoices;
        console.log('✅ Invoices loaded from window:', invoices.length);
    } else {
        // PRIORITY 3: Load from localStorage
        const stored = localStorage.getItem(INVOICES_KEY);
        if (stored) {
            try {
                const parsed = JSON.parse(stored);
                invoices = Array.isArray(parsed) ? parsed : [];
                console.log('✅ Invoices loaded from localStorage:', invoices.length);
            } catch (e) {
                console.error('Error parsing invoices:', e);
                invoices = [];
            }
        } else {
            invoices = [];
        }
    }
    
    window.invoices = invoices;
}

function saveInvoices() {
    localStorage.setItem(INVOICES_KEY, JSON.stringify(invoices));
    window.invoices = invoices;
    
    // DIRECT tenant save
    const user = window.currentUser;
    if (user && user.tenantId) {
        const tenantKey = 'ezcubic_tenant_' + user.tenantId;
        let tenantData = JSON.parse(localStorage.getItem(tenantKey) || '{}');
        tenantData.invoices = invoices;
        tenantData.updatedAt = new Date().toISOString();
        localStorage.setItem(tenantKey, JSON.stringify(tenantData));
        console.log('✅ Invoices saved directly to tenant:', invoices.length);
    }
}

// ==================== GENERATE INVOICE NUMBER ====================
function generateInvoiceNo() {
    // Use customizable document numbering if available
    if (typeof generateDocumentNumber === 'function') {
        return generateDocumentNumber('invoice');
    }
    
    // Fallback
    const now = new Date();
    const year = now.getFullYear().toString().slice(-2);
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const prefix = `INV${year}${month}`;
    const existingNums = invoices
        .filter(inv => inv.invoiceNo && inv.invoiceNo.startsWith(prefix))
        .map(inv => parseInt(inv.invoiceNo.replace(prefix, '')) || 0);
    const nextNum = existingNums.length > 0 ? Math.max(...existingNums) + 1 : 1;
    return `${prefix}${nextNum.toString().padStart(4, '0')}`;
}

// ==================== INVOICE STATS ====================
function updateInvoiceStats() {
    const totalEl = document.getElementById('invoicesTotalCount');
    const unpaidEl = document.getElementById('invoicesUnpaid');
    const overdueEl = document.getElementById('invoicesOverdue');
    const paidEl = document.getElementById('invoicesPaid');
    const totalValueEl = document.getElementById('invoicesTotalValue');
    const outstandingEl = document.getElementById('invoicesOutstanding');
    
    if (!totalEl) return;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const unpaid = invoices.filter(inv => inv.status === 'unpaid' || inv.status === 'partial');
    const overdue = invoices.filter(inv => {
        if (inv.status === 'paid' || inv.status === 'cancelled') return false;
        const dueDate = new Date(inv.dueDate);
        return dueDate < today;
    });
    const paid = invoices.filter(inv => inv.status === 'paid');
    
    const totalValue = invoices.reduce((sum, inv) => sum + (inv.total || 0), 0);
    const outstanding = unpaid.reduce((sum, inv) => sum + ((inv.total || 0) - (inv.paidAmount || 0)), 0);
    
    totalEl.textContent = invoices.length;
    unpaidEl.textContent = unpaid.length;
    overdueEl.textContent = overdue.length;
    paidEl.textContent = paid.length;
    
    if (totalValueEl) totalValueEl.textContent = formatCurrency(totalValue);
    if (outstandingEl) outstandingEl.textContent = formatCurrency(outstanding);
}

// ==================== SAVE INVOICE ====================
function saveInvoice(event) {
    event.preventDefault();
    
    const invoiceNo = document.getElementById('invoiceNo').value.trim();
    const date = document.getElementById('invoiceDate').value;
    const dueDate = document.getElementById('invoiceDueDate').value;
    const customerId = document.getElementById('invoiceCustomer').value;
    const description = document.getElementById('invoiceDescription').value.trim();
    const notes = document.getElementById('invoiceNotes').value.trim();
    const terms = document.getElementById('invoiceTerms').value.trim();
    const status = document.getElementById('invoiceStatus').value;
    const isRecurring = document.getElementById('invoiceRecurring').checked;
    const recurringFrequency = document.getElementById('invoiceRecurringFrequency').value;
    const recurringEndDate = document.getElementById('invoiceRecurringEnd').value;
    
    if (!invoiceNo || !date || !dueDate) {
        showNotification('Please fill in invoice number, date and due date', 'error');
        return;
    }
    
    // Get customer details
    let customerName = 'Walk-in Customer';
    let customerDetails = {};
    if (customerId) {
        const customer = (window.crmCustomers || []).find(c => c.id === customerId);
        if (customer) {
            customerName = customer.company || customer.name;
            customerDetails = {
                name: customer.name,
                company: customer.company,
                email: customer.email,
                phone: customer.phone,
                address: customer.address
            };
        }
    }
    
    // Collect items
    const items = [];
    const rows = document.querySelectorAll('.invoice-item-row');
    rows.forEach(row => {
        const desc = row.querySelector('.item-description').value.trim();
        const qty = parseFloat(row.querySelector('.item-quantity').value) || 0;
        const price = parseFloat(row.querySelector('.item-price').value) || 0;
        
        if (desc && qty > 0 && price > 0) {
            items.push({
                description: desc,
                quantity: qty,
                unitPrice: price,
                amount: qty * price
            });
        }
    });
    
    if (items.length === 0) {
        showNotification('Please add at least one item with description, quantity and price', 'error');
        return;
    }
    
    const subtotal = items.reduce((sum, item) => sum + item.amount, 0);
    const taxRate = parseFloat(document.getElementById('invoiceTaxRate')?.value) || 0;
    const tax = subtotal * (taxRate / 100);
    const total = subtotal + tax;
    
    const invoice = {
        id: editingInvoiceId || 'INV_' + Date.now(),
        invoiceNo,
        date,
        dueDate,
        customerId,
        customerName,
        customerDetails,
        description,
        notes,
        terms,
        items,
        subtotal,
        taxRate,
        tax,
        total,
        status,
        paidAmount: editingInvoiceId ? (invoices.find(i => i.id === editingInvoiceId)?.paidAmount || 0) : 0,
        isRecurring,
        recurringFrequency: isRecurring ? recurringFrequency : null,
        recurringEndDate: isRecurring ? recurringEndDate : null,
        lastGeneratedDate: isRecurring ? date : null,
        createdAt: editingInvoiceId ? (invoices.find(i => i.id === editingInvoiceId)?.createdAt || new Date().toISOString()) : new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };
    
    if (editingInvoiceId) {
        const index = invoices.findIndex(i => i.id === editingInvoiceId);
        if (index !== -1) {
            invoices[index] = invoice;
        }
        showNotification(`Invoice ${invoiceNo} updated!`, 'success');
    } else {
        invoices.push(invoice);
        showNotification(`Invoice ${invoiceNo} created!`, 'success');
    }
    
    saveInvoices();
    renderInvoices();
    updateInvoiceStats();
    closeInvoiceModal();
    
    // Log audit
    if (typeof logAuditEvent === 'function') {
        logAuditEvent(editingInvoiceId ? 'invoice_updated' : 'invoice_created', 'invoice', invoice.id, {
            invoiceNo,
            customerName,
            total
        });
    }
}

// ==================== DELETE INVOICE ====================
function deleteInvoice(id) {
    const invoice = invoices.find(inv => inv.id === id);
    if (!invoice) return;
    
    if (!confirm(`Delete invoice ${invoice.invoiceNo}? This cannot be undone.`)) return;
    
    invoices = invoices.filter(inv => inv.id !== id);
    saveInvoices();
    renderInvoices();
    updateInvoiceStats();
    
    showNotification(`Invoice ${invoice.invoiceNo} deleted`, 'success');
    
    if (typeof logAuditEvent === 'function') {
        logAuditEvent('invoice_deleted', 'invoice', id, { invoiceNo: invoice.invoiceNo });
    }
}

// ==================== PAYMENT RECORDING ====================
function savePayment(event) {
    event.preventDefault();
    
    const invoiceId = document.getElementById('paymentInvoiceId').value;
    const amount = parseFloat(document.getElementById('paymentAmount').value) || 0;
    const date = document.getElementById('paymentDate').value;
    const method = document.getElementById('paymentMethod').value;
    const reference = document.getElementById('paymentReference').value.trim();
    const notes = document.getElementById('paymentNotes').value.trim();
    
    const invoice = invoices.find(inv => inv.id === invoiceId);
    if (!invoice) return;
    
    const outstanding = invoice.total - (invoice.paidAmount || 0);
    
    if (amount <= 0 || amount > outstanding) {
        showNotification(`Payment amount must be between RM 0.01 and RM ${outstanding.toFixed(2)}`, 'error');
        return;
    }
    
    // Update invoice
    invoice.paidAmount = (invoice.paidAmount || 0) + amount;
    
    // Update status
    if (invoice.paidAmount >= invoice.total) {
        invoice.status = 'paid';
        invoice.paidDate = date;
    } else {
        invoice.status = 'partial';
    }
    
    // Add payment record
    if (!invoice.payments) invoice.payments = [];
    invoice.payments.push({
        id: 'PAY_' + Date.now(),
        amount,
        date,
        method,
        reference,
        notes,
        recordedAt: new Date().toISOString()
    });
    
    invoice.updatedAt = new Date().toISOString();
    
    saveInvoices();
    
    // Record as income transaction
    if (typeof businessData !== 'undefined' && businessData.transactions) {
        const transaction = {
            id: 'TXN_' + Date.now(),
            type: 'income',
            category: 'service',
            amount: amount,
            date: date,
            description: `Payment for Invoice ${invoice.invoiceNo}`,
            reference: invoice.invoiceNo,
            paymentMethod: method,
            customer: invoice.customerName
        };
        businessData.transactions.push(transaction);
        if (typeof saveData === 'function') saveData();
    }
    
    showNotification(`Payment of RM ${amount.toFixed(2)} recorded for ${invoice.invoiceNo}`, 'success');
    
    closePaymentModal();
    renderInvoices();
    updateInvoiceStats();
    
    // Log audit
    if (typeof logAuditEvent === 'function') {
        logAuditEvent('payment_recorded', 'invoice', invoiceId, {
            invoiceNo: invoice.invoiceNo,
            paymentAmount: amount,
            newStatus: invoice.status
        });
    }
}

// ==================== RECURRING INVOICES ====================
function checkRecurringInvoices() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const recurringInvoices = invoices.filter(inv => inv.isRecurring && inv.status !== 'cancelled');
    
    recurringInvoices.forEach(template => {
        // Check if we should generate a new invoice
        const lastGenerated = new Date(template.lastGeneratedDate || template.date);
        const endDate = template.recurringEndDate ? new Date(template.recurringEndDate) : null;
        
        // Skip if past end date
        if (endDate && today > endDate) return;
        
        let shouldGenerate = false;
        let nextDate = new Date(lastGenerated);
        
        switch(template.recurringFrequency) {
            case 'weekly':
                nextDate.setDate(nextDate.getDate() + 7);
                break;
            case 'monthly':
                nextDate.setMonth(nextDate.getMonth() + 1);
                break;
            case 'quarterly':
                nextDate.setMonth(nextDate.getMonth() + 3);
                break;
            case 'yearly':
                nextDate.setFullYear(nextDate.getFullYear() + 1);
                break;
        }
        
        nextDate.setHours(0, 0, 0, 0);
        shouldGenerate = today >= nextDate;
        
        if (shouldGenerate) {
            generateRecurringInvoice(template, nextDate);
        }
    });
}

function generateRecurringInvoice(template, invoiceDate) {
    const newInvoiceNo = generateInvoiceNo();
    const dueDate = new Date(invoiceDate);
    
    // Calculate due date based on original difference
    const originalDiff = Math.round((new Date(template.dueDate) - new Date(template.date)) / (1000 * 60 * 60 * 24));
    dueDate.setDate(dueDate.getDate() + originalDiff);
    
    const newInvoice = {
        id: 'INV_' + Date.now(),
        invoiceNo: newInvoiceNo,
        date: invoiceDate.toISOString().split('T')[0],
        dueDate: dueDate.toISOString().split('T')[0],
        customerId: template.customerId,
        customerName: template.customerName,
        customerDetails: template.customerDetails,
        description: template.description,
        notes: template.notes,
        terms: template.terms,
        items: JSON.parse(JSON.stringify(template.items)), // Deep copy
        subtotal: template.subtotal,
        taxRate: template.taxRate,
        tax: template.tax,
        total: template.total,
        status: 'unpaid',
        paidAmount: 0,
        isRecurring: false, // New invoice is not recurring
        generatedFromRecurring: template.id,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };
    
    invoices.push(newInvoice);
    
    // Update template's last generated date
    template.lastGeneratedDate = invoiceDate.toISOString().split('T')[0];
    template.updatedAt = new Date().toISOString();
    
    saveInvoices();
    
    console.log(`✅ Generated recurring invoice: ${newInvoiceNo} from template ${template.invoiceNo}`);
    
    showNotification(`Recurring invoice ${newInvoiceNo} generated automatically`, 'info');
}

// ==================== STATUS HELPERS ====================
function getInvoiceStatusClass(status, isOverdue = false) {
    if (isOverdue) return 'status-overdue';
    switch(status) {
        case 'paid': return 'status-success';
        case 'partial': return 'status-warning';
        case 'unpaid': return 'status-pending';
        case 'cancelled': return 'status-cancelled';
        case 'draft': return 'status-draft';
        default: return 'status-pending';
    }
}

function getInvoiceStatusLabel(status) {
    switch(status) {
        case 'paid': return 'Paid';
        case 'partial': return 'Partial';
        case 'unpaid': return 'Unpaid';
        case 'cancelled': return 'Cancelled';
        case 'draft': return 'Draft';
        default: return status;
    }
}

// ==================== HELPER FUNCTIONS ====================
function formatDate(dateStr) {
    if (!dateStr) return 'N/A';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-MY', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatCurrency(amount) {
    return `RM ${(amount || 0).toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ==================== EXPORT TO WINDOW ====================
window.initializeInvoices = initializeInvoices;
window.loadInvoices = loadInvoices;
window.saveInvoices = saveInvoices;
window.generateInvoiceNo = generateInvoiceNo;
window.updateInvoiceStats = updateInvoiceStats;
window.saveInvoice = saveInvoice;
window.deleteInvoice = deleteInvoice;
window.savePayment = savePayment;
window.checkRecurringInvoices = checkRecurringInvoices;
window.generateRecurringInvoice = generateRecurringInvoice;
window.getInvoiceStatusClass = getInvoiceStatusClass;
window.getInvoiceStatusLabel = getInvoiceStatusLabel;
