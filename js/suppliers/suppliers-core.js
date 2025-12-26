/**
 * EZCubic - Supplier Profile Module (Core)
 * Data management, CRUD operations, payments, and business logic
 */

const SUPPLIERS_KEY = 'ezcubic_suppliers';

// Use a getter to always return window.suppliers array
// This ensures consistency with multi-tenant data loading
Object.defineProperty(window, 'suppliersModule', {
    get: function() {
        if (!Array.isArray(window.suppliers)) {
            window.suppliers = [];
        }
        return window.suppliers;
    },
    set: function(val) {
        window.suppliers = Array.isArray(val) ? val : [];
    }
});

// Local variable that stays synced - initialized from window
let suppliers = [];

// Sync local variable with window (called by multi-tenant system)
function syncSuppliersFromWindow() {
    if (Array.isArray(window.suppliers)) {
        suppliers = window.suppliers;
    }
}
window.syncSuppliersFromWindow = syncSuppliersFromWindow;

// ==================== INITIALIZATION ====================
function initializeSuppliers() {
    loadSuppliers();
    renderSuppliers();
    updateSupplierStats();
}

function loadSuppliers() {
    // PRIORITY 1: Load from tenant storage directly (most reliable)
    const user = window.currentUser;
    if (user && user.tenantId) {
        const tenantKey = 'ezcubic_tenant_' + user.tenantId;
        const tenantData = JSON.parse(localStorage.getItem(tenantKey) || '{}');
        if (Array.isArray(tenantData.suppliers) && tenantData.suppliers.length > 0) {
            suppliers = tenantData.suppliers;
            window.suppliers = suppliers;
            console.log('✅ Suppliers loaded from tenant:', suppliers.length);
            return;
        }
    }
    
    // PRIORITY 2: Sync from window in case tenant data was loaded
    if (Array.isArray(window.suppliers) && window.suppliers.length > 0) {
        suppliers = window.suppliers;
        console.log('✅ Suppliers loaded from window:', suppliers.length);
        return;
    }
    
    // PRIORITY 3: Load from localStorage
    const stored = localStorage.getItem(SUPPLIERS_KEY);
    const data = stored ? JSON.parse(stored) : [];
    suppliers = Array.isArray(data) ? data : [];
    window.suppliers = suppliers;
    console.log('✅ Suppliers loaded from localStorage key:', suppliers.length);
}

function saveSuppliers() {
    localStorage.setItem(SUPPLIERS_KEY, JSON.stringify(suppliers));
    window.suppliers = suppliers; // Keep window in sync
    updateSupplierStats();
    
    // DIRECT tenant save
    const user = window.currentUser;
    if (user && user.tenantId) {
        const tenantKey = 'ezcubic_tenant_' + user.tenantId;
        let tenantData = JSON.parse(localStorage.getItem(tenantKey) || '{}');
        tenantData.suppliers = suppliers;
        tenantData.updatedAt = new Date().toISOString();
        localStorage.setItem(tenantKey, JSON.stringify(tenantData));
        console.log('✅ Suppliers saved directly to tenant:', suppliers.length);
    }
    
    // Note: Don't call saveToUserTenant - it would overwrite with stale data
}

// ==================== SYNC SUPPLIER OUTSTANDING FROM BILLS/POs ====================
function syncSupplierOutstanding() {
    // Get all unpaid bills
    const bills = (typeof businessData !== 'undefined' && Array.isArray(businessData.bills)) 
                  ? businessData.bills 
                  : JSON.parse(localStorage.getItem('ezcubic_bills') || '[]');
    
    // Get all unpaid purchase orders
    const purchaseOrders = window.purchaseOrders || JSON.parse(localStorage.getItem('ezcubic_purchaseOrders') || '[]');
    
    // Calculate outstanding per supplier
    const supplierOutstanding = new Map();
    const supplierBillsList = new Map();
    
    // Sum up unpaid bills by vendor/supplier
    if (Array.isArray(bills)) {
        bills.forEach(bill => {
            if (bill.status !== 'paid') {
                const vendor = bill.vendor || bill.supplierName || 'Unknown';
                const amount = parseFloat(bill.amount || bill.total || 0) - parseFloat(bill.paidAmount || 0);
                if (amount > 0) {
                    supplierOutstanding.set(vendor, (supplierOutstanding.get(vendor) || 0) + amount);
                    if (!supplierBillsList.has(vendor)) supplierBillsList.set(vendor, []);
                    supplierBillsList.get(vendor).push({
                        id: bill.id,
                        reference: bill.name || bill.billNumber || bill.id,
                        amount: amount,
                        dueDate: bill.dueDate
                    });
                }
            }
        });
    }
    
    // Sum up unpaid purchase orders
    if (Array.isArray(purchaseOrders)) {
        purchaseOrders.forEach(po => {
            if (po.status !== 'paid' && po.status !== 'cancelled') {
                const supplier = po.supplierName || 'Unknown';
                const amount = parseFloat(po.total || po.grandTotal || 0) - parseFloat(po.paidAmount || 0);
                if (amount > 0) {
                    supplierOutstanding.set(supplier, (supplierOutstanding.get(supplier) || 0) + amount);
                    if (!supplierBillsList.has(supplier)) supplierBillsList.set(supplier, []);
                    supplierBillsList.get(supplier).push({
                        id: po.id,
                        reference: po.poNumber || po.id,
                        amount: amount,
                        dueDate: po.dueDate
                    });
                }
            }
        });
    }
    
    // Update supplier outstanding balances
    suppliers.forEach(supplier => {
        const supplierNames = [supplier.company, supplier.name].filter(Boolean);
        let totalOutstanding = 0;
        let billsList = [];
        
        supplierNames.forEach(name => {
            if (supplierOutstanding.has(name)) {
                totalOutstanding += supplierOutstanding.get(name);
            }
            if (supplierBillsList.has(name)) {
                billsList = billsList.concat(supplierBillsList.get(name));
            }
        });
        
        supplier.outstandingBalance = totalOutstanding;
        supplier.unpaidBills = billsList;
    });
    
    window.suppliers = suppliers;
}
window.syncSupplierOutstanding = syncSupplierOutstanding;

// ==================== SUPPLIER STATS ====================
function updateSupplierStats() {
    // First sync outstanding from actual bills/POs
    syncSupplierOutstanding();
    
    const totalEl = document.getElementById('suppliersTotalCount');
    const activeEl = document.getElementById('suppliersActive');
    const payableEl = document.getElementById('suppliersTotalPayable');
    const overdueEl = document.getElementById('suppliersOverdue');
    
    const activeSuppliers = suppliers.filter(s => s.status === 'active');
    const totalPayable = suppliers.reduce((sum, s) => sum + (parseFloat(s.outstandingBalance) || 0), 0);
    const overdueCount = suppliers.filter(s => (parseFloat(s.outstandingBalance) || 0) > 0 && isOverdue(s)).length;
    
    if (totalEl) totalEl.textContent = suppliers.length;
    if (activeEl) activeEl.textContent = activeSuppliers.length;
    if (payableEl) payableEl.textContent = formatRM(totalPayable);
    if (overdueEl) overdueEl.textContent = overdueCount;
}

function isOverdue(supplier) {
    // Check if any unpaid bills are overdue
    if (supplier.unpaidBills && supplier.unpaidBills.length > 0) {
        const today = new Date();
        return supplier.unpaidBills.some(bill => {
            if (bill.dueDate) {
                return new Date(bill.dueDate) < today;
            }
            return false;
        });
    }
    // Fallback to old logic
    if (!supplier.lastPurchaseDate || !supplier.paymentTerms) return false;
    const termDays = parseInt(supplier.paymentTerms) || 30;
    const dueDate = new Date(supplier.lastPurchaseDate);
    dueDate.setDate(dueDate.getDate() + termDays);
    return new Date() > dueDate;
}

// ==================== SUPPLIER CRUD ====================
function saveSupplierData(supplierData, id = null) {
    if (!supplierData.name && !supplierData.company) {
        showToast('Please enter supplier name or company', 'error');
        return false;
    }
    
    if (id) {
        // Update existing
        const index = suppliers.findIndex(s => s.id === id);
        if (index !== -1) {
            suppliers[index] = { ...suppliers[index], ...supplierData, updatedAt: new Date().toISOString() };
            showToast('Supplier updated successfully!', 'success');
        }
    } else {
        // Create new
        const newSupplier = {
            id: generateUUID(),
            ...supplierData,
            outstandingBalance: 0,
            totalPurchases: 0,
            purchaseHistory: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        suppliers.push(newSupplier);
        showToast('Supplier added successfully!', 'success');
    }
    
    saveSuppliers();
    return true;
}

function deleteSupplier(supplierId) {
    const supplier = suppliers.find(s => s.id === supplierId);
    if (!supplier) return;
    
    const outstanding = parseFloat(supplier.outstandingBalance) || 0;
    
    let message = `Are you sure you want to delete "${supplier.company || supplier.name}"?`;
    if (outstanding > 0) {
        message += `\n\n⚠️ Warning: This supplier has ${formatRM(outstanding)} outstanding balance!`;
    }
    
    if (confirm(message)) {
        suppliers = suppliers.filter(s => s.id !== supplierId);
        saveSuppliers();
        closeModal('supplierDetailModal');
        renderSuppliers();
        showToast('Supplier deleted', 'success');
    }
}

function getSupplierById(supplierId) {
    return suppliers.find(s => s.id === supplierId);
}

// ==================== SUPPLIER PAYMENTS ====================
function processSupplierPayment(event, supplierId) {
    event.preventDefault();
    
    const supplier = suppliers.find(s => s.id === supplierId);
    if (!supplier) return;
    
    const amount = parseFloat(document.getElementById('supplierPaymentAmount').value);
    const method = document.getElementById('supplierPaymentMethod').value;
    const reference = document.getElementById('supplierPaymentRef').value.trim();
    const date = document.getElementById('supplierPaymentDate').value;
    
    if (!amount || amount <= 0) {
        showToast('Please enter a valid amount', 'error');
        return;
    }
    
    // Update supplier balance
    supplier.outstandingBalance = Math.max(0, (parseFloat(supplier.outstandingBalance) || 0) - amount);
    
    // Mark matching purchases as paid
    if (supplier.purchaseHistory) {
        let remaining = amount;
        for (let purchase of supplier.purchaseHistory) {
            if (!purchase.paid && remaining > 0) {
                if (remaining >= purchase.amount) {
                    purchase.paid = true;
                    purchase.paidDate = date;
                    remaining -= purchase.amount;
                } else {
                    // Partial payment - split the purchase
                    purchase.amount -= remaining;
                    remaining = 0;
                }
            }
        }
    }
    
    supplier.updatedAt = new Date().toISOString();
    saveSuppliers();
    
    // Record as expense transaction
    const expenseTransaction = {
        id: generateUUID(),
        date: date,
        amount: amount,
        category: 'Supplier Payment',
        description: `Payment to ${supplier.company || supplier.name}${reference ? ' - Ref: ' + reference : ''}`,
        type: 'expense',
        method: method,
        vendor: supplier.company || supplier.name,
        reference: reference,
        timestamp: new Date().toISOString()
    };
    
    if (typeof businessData !== 'undefined' && businessData.transactions) {
        businessData.transactions.push(expenseTransaction);
    } else if (typeof transactions !== 'undefined') {
        transactions.push(expenseTransaction);
    }
    if (typeof saveData === 'function') saveData();
    
    // Mark related bills as paid
    markSupplierBillsAsPaid(supplierId, amount, date);
    
    closeModal('supplierPaymentModal');
    closeModal('supplierDetailModal');
    renderSuppliers();
    updateSupplierStats();
    
    // Refresh all related views
    if (typeof loadTransactions === 'function') loadTransactions();
    if (typeof loadRecentTransactions === 'function') loadRecentTransactions();
    if (typeof updateDashboard === 'function') updateDashboard();
    if (typeof loadBills === 'function') loadBills();
    if (typeof loadUpcomingBills === 'function') loadUpcomingBills();
    if (typeof updateBalanceSheet === 'function') updateBalanceSheet();
    if (typeof updateMonthlyCharts === 'function') updateMonthlyCharts();
    if (typeof updateReports === 'function') updateReports();
    
    showToast(`Payment of ${formatRM(amount)} recorded!`, 'success');
}

// Mark supplier bills as paid when payment is made
function markSupplierBillsAsPaid(supplierId, paymentAmount, paymentDate) {
    if (typeof businessData === 'undefined' || !businessData.bills) return;
    
    let remainingAmount = paymentAmount;
    
    // Find unpaid bills for this supplier, oldest first
    const supplierBills = businessData.bills
        .filter(b => b.supplierId === supplierId && b.status !== 'paid')
        .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
    
    for (const bill of supplierBills) {
        if (remainingAmount <= 0) break;
        
        if (remainingAmount >= bill.amount) {
            // Full payment for this bill
            bill.status = 'paid';
            bill.paidDate = paymentDate;
            bill.paidAmount = bill.amount;
            remainingAmount -= bill.amount;
            console.log(`Bill ${bill.id} marked as paid`);
        } else {
            // Partial payment - reduce bill amount
            bill.partialPayments = bill.partialPayments || [];
            bill.partialPayments.push({
                amount: remainingAmount,
                date: paymentDate
            });
            bill.paidAmount = (bill.paidAmount || 0) + remainingAmount;
            // If total paid equals or exceeds amount, mark as paid
            if (bill.paidAmount >= bill.amount) {
                bill.status = 'paid';
                bill.paidDate = paymentDate;
            }
            remainingAmount = 0;
        }
    }
    
    if (typeof saveData === 'function') saveData();
}

// ==================== PURCHASE MANAGEMENT ====================
function saveSupplierPurchase(event, supplierId) {
    event.preventDefault();
    
    const supplier = suppliers.find(s => s.id === supplierId);
    if (!supplier) return;
    
    const date = document.getElementById('purchaseDate').value;
    const description = document.getElementById('purchaseDescription').value.trim();
    const amount = parseFloat(document.getElementById('purchaseAmount').value);
    const invoice = document.getElementById('purchaseInvoice').value.trim();
    const paid = document.getElementById('purchasePaid').checked;
    const createBill = document.getElementById('purchaseCreateBill').checked;
    
    if (!amount || amount <= 0) {
        showToast('Please enter a valid amount', 'error');
        return;
    }
    
    // Add to purchase history
    if (!supplier.purchaseHistory) supplier.purchaseHistory = [];
    supplier.purchaseHistory.unshift({
        id: generateUUID(),
        date: date,
        description: description,
        amount: amount,
        invoice: invoice,
        paid: paid,
        paidDate: paid ? date : null
    });
    
    // Update totals
    supplier.totalPurchases = (parseFloat(supplier.totalPurchases) || 0) + amount;
    if (!paid) {
        supplier.outstandingBalance = (parseFloat(supplier.outstandingBalance) || 0) + amount;
    }
    supplier.lastPurchaseDate = date;
    supplier.updatedAt = new Date().toISOString();
    
    saveSuppliers();
    
    // Create bill if requested
    if (createBill && !paid && typeof businessData !== 'undefined') {
        const termDays = parseInt(supplier.paymentTerms) || 30;
        const dueDate = new Date(date);
        dueDate.setDate(dueDate.getDate() + termDays);
        
        const bill = {
            id: generateUUID(),
            name: description,
            amount: amount,
            dueDate: dueDate.toISOString().split('T')[0],
            category: 'Supplier Purchase',
            vendor: supplier.company || supplier.name,
            status: 'pending',
            recurring: false,
            reference: invoice,
            supplierId: supplierId,
            timestamp: new Date().toISOString()
        };
        
        if (!businessData.bills) businessData.bills = [];
        businessData.bills.push(bill);
        if (typeof saveData === 'function') saveData();
        if (typeof loadBills === 'function') loadBills();
    }
    
    closeModal('addPurchaseModal');
    showSupplierDetail(supplierId);
    renderSuppliers();
    updateSupplierStats();
    
    showToast('Purchase recorded successfully!', 'success');
}

// Link purchase to supplier from stock/inventory
function linkPurchaseToSupplier(supplierId, purchaseData) {
    const supplier = suppliers.find(s => s.id === supplierId);
    if (!supplier) return false;
    
    if (!supplier.purchaseHistory) supplier.purchaseHistory = [];
    supplier.purchaseHistory.unshift({
        id: generateUUID(),
        date: purchaseData.date || new Date().toISOString().split('T')[0],
        description: purchaseData.description || 'Stock Purchase',
        amount: purchaseData.amount || 0,
        invoice: purchaseData.invoice || '',
        paid: purchaseData.paid || false
    });
    
    supplier.totalPurchases = (parseFloat(supplier.totalPurchases) || 0) + (purchaseData.amount || 0);
    if (!purchaseData.paid) {
        supplier.outstandingBalance = (parseFloat(supplier.outstandingBalance) || 0) + (purchaseData.amount || 0);
    }
    supplier.lastPurchaseDate = purchaseData.date || new Date().toISOString().split('T')[0];
    
    saveSuppliers();
    return true;
}

// ==================== HELPER FUNCTIONS ====================
function getCategoryLabel(category) {
    const labels = {
        'general': 'General',
        'raw-materials': 'Raw Materials',
        'packaging': 'Packaging',
        'equipment': 'Equipment',
        'services': 'Services',
        'logistics': 'Logistics',
        'office': 'Office Supplies',
        'utilities': 'Utilities'
    };
    return labels[category] || category || 'General';
}

function formatDateSupplier(dateStr) {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-MY', { day: '2-digit', month: 'short', year: 'numeric' });
}

function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        showToast('Copied to clipboard!', 'success');
    });
}

// Get suppliers for dropdown select
function getSuppliersForSelect() {
    return suppliers.filter(s => s.status === 'active').map(s => ({
        id: s.id,
        name: s.name,
        company: s.company
    }));
}

// Get suppliers array reference
function getSuppliersArray() {
    return suppliers;
}

// ==================== EXPORT SUPPLIERS ====================
function exportSuppliers() {
    if (suppliers.length === 0) {
        showToast('No suppliers to export', 'info');
        return;
    }
    
    // Create CSV content
    const headers = ['Company', 'Contact', 'Email', 'Phone', 'Address', 'Category', 'Payment Terms', 'Credit Limit', 'Outstanding', 'Total Purchases', 'Status'];
    const rows = suppliers.map(s => [
        s.company || '',
        s.name || '',
        s.email || '',
        s.phone || '',
        (s.address || '').replace(/\n/g, ' '),
        getCategoryLabel(s.category),
        `Net ${s.paymentTerms || 30} days`,
        s.creditLimit || 0,
        s.outstandingBalance || 0,
        s.totalPurchases || 0,
        s.status || 'active'
    ]);
    
    const csv = [headers.join(','), ...rows.map(row => row.map(cell => `"${cell}"`).join(','))].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `suppliers-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    
    showToast('Suppliers exported successfully!', 'success');
}

// ==================== WINDOW EXPORTS ====================
window.initializeSuppliers = initializeSuppliers;
window.loadSuppliers = loadSuppliers;
window.saveSuppliers = saveSuppliers;
window.updateSupplierStats = updateSupplierStats;
window.isOverdue = isOverdue;
window.saveSupplierData = saveSupplierData;
window.deleteSupplier = deleteSupplier;
window.getSupplierById = getSupplierById;
window.processSupplierPayment = processSupplierPayment;
window.markSupplierBillsAsPaid = markSupplierBillsAsPaid;
window.saveSupplierPurchase = saveSupplierPurchase;
window.linkPurchaseToSupplier = linkPurchaseToSupplier;
window.getCategoryLabel = getCategoryLabel;
window.formatDateSupplier = formatDateSupplier;
window.copyToClipboard = copyToClipboard;
window.getSuppliersForSelect = getSuppliersForSelect;
window.getSuppliersArray = getSuppliersArray;
window.exportSuppliers = exportSuppliers;
