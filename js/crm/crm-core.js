/**
 * EZCubic - CRM Data Management - Split from crm.js v2.3.2
 * Data storage, initialization, and CRUD operations for CRM customers
 */

// ==================== CRM DATA ====================
const CRM_CUSTOMERS_KEY = 'ezcubic_crm_customers';
let crmCustomers = [];

// ==================== CRM INITIALIZATION ====================
function initializeCRM() {
    loadCRMCustomers();
    renderCRMCustomers();
    updateCRMStats();
}

// ==================== CRM DATA MANAGEMENT ====================
function loadCRMCustomers() {
    // PRIORITY 1: Load from tenant storage directly (most reliable)
    const user = window.currentUser;
    if (user && user.tenantId) {
        const tenantKey = 'ezcubic_tenant_' + user.tenantId;
        const tenantData = JSON.parse(localStorage.getItem(tenantKey) || '{}');
        if (Array.isArray(tenantData.crmCustomers) && tenantData.crmCustomers.length > 0) {
            crmCustomers = tenantData.crmCustomers;
            window.crmCustomers = crmCustomers;
            console.log('✅ CRM loaded from tenant:', crmCustomers.length, 'customers');
            return;
        }
    }
    
    // PRIORITY 2: Check window.crmCustomers (set by tenant data loading)
    if (Array.isArray(window.crmCustomers) && window.crmCustomers.length > 0) {
        crmCustomers = window.crmCustomers;
        console.log('✅ CRM loaded from window:', crmCustomers.length, 'customers');
    } else {
        // PRIORITY 3: Fall back to localStorage key
        const stored = localStorage.getItem(CRM_CUSTOMERS_KEY);
        if (stored) {
            try {
                const parsed = JSON.parse(stored);
                if (Array.isArray(parsed)) {
                    crmCustomers = parsed;
                    console.log('✅ CRM loaded from localStorage key:', crmCustomers.length, 'customers');
                }
            } catch (e) {
                console.error('Error parsing CRM customers from localStorage:', e);
                crmCustomers = [];
            }
        }
    }
    // Sync back to window for other modules
    window.crmCustomers = crmCustomers;
}

function saveCRMCustomers() {
    // Save to localStorage
    localStorage.setItem(CRM_CUSTOMERS_KEY, JSON.stringify(crmCustomers));
    
    // Sync to window for other modules
    window.crmCustomers = crmCustomers;
    
    // Update UI stats
    updateCRMStats();
    
    // DIRECT tenant save
    const user = window.currentUser;
    if (user && user.tenantId) {
        const tenantKey = 'ezcubic_tenant_' + user.tenantId;
        let tenantData = JSON.parse(localStorage.getItem(tenantKey) || '{}');
        tenantData.crmCustomers = crmCustomers;
        tenantData.updatedAt = new Date().toISOString();
        localStorage.setItem(tenantKey, JSON.stringify(tenantData));
        console.log('✅ CRM Customers saved directly to tenant:', crmCustomers.length);
    }
    
    // Note: Don't call saveToUserTenant - it would overwrite with stale data
}

// ==================== CRM STATS ====================
function updateCRMStats() {
    // Total customers
    const totalEl = document.getElementById('crmTotalCustomers');
    if (totalEl) totalEl.textContent = crmCustomers.length;
    
    // VIP customers
    const vipEl = document.getElementById('crmVIPCustomers');
    if (vipEl) vipEl.textContent = crmCustomers.filter(c => c.group === 'vip').length;
    
    // Outstanding balance
    const outstandingEl = document.getElementById('crmOutstandingBalance');
    if (outstandingEl) {
        const totalOutstanding = crmCustomers.reduce((sum, c) => sum + (c.outstandingBalance || 0), 0);
        outstandingEl.textContent = formatRM(totalOutstanding);
    }
    
    // This month sales
    const thisMonthEl = document.getElementById('crmThisMonthSales');
    if (thisMonthEl) {
        const now = new Date();
        const thisMonth = now.getMonth();
        const thisYear = now.getFullYear();
        
        let monthSales = 0;
        crmCustomers.forEach(customer => {
            if (customer.salesHistory) {
                customer.salesHistory.forEach(sale => {
                    const saleDate = new Date(sale.date);
                    if (saleDate.getMonth() === thisMonth && saleDate.getFullYear() === thisYear) {
                        monthSales += sale.amount;
                    }
                });
            }
        });
        thisMonthEl.textContent = formatRM(monthSales);
    }
}

// ==================== CRM CUSTOMER DELETE ====================
function deleteCRMCustomer(customerId) {
    const customer = crmCustomers.find(c => c.id === customerId);
    if (!customer) return;
    
    if (!confirm(`Delete customer "${customer.name}"? This action cannot be undone.`)) {
        return;
    }
    
    crmCustomers = crmCustomers.filter(c => c.id !== customerId);
    saveCRMCustomers();
    renderCRMCustomers();
    showToast('Customer deleted!', 'success');
}

// ==================== LINK SALES TO CRM ====================
function linkSaleToCRMCustomer(customerId, saleData) {
    const customer = crmCustomers.find(c => c.id === customerId);
    if (!customer) return;
    
    if (!customer.salesHistory) {
        customer.salesHistory = [];
    }
    
    customer.salesHistory.unshift({
        id: saleData.id,
        reference: saleData.receiptNo,
        date: saleData.date,
        amount: saleData.total,
        items: saleData.items?.length || 0
    });
    
    customer.totalSpent = (customer.totalSpent || 0) + saleData.total;
    customer.updatedAt = new Date().toISOString();
    
    // Update group to VIP if they've spent enough
    if (customer.totalSpent >= 1000 && customer.group !== 'vip' && customer.group !== 'b2b') {
        customer.group = 'vip';
    }
    
    saveCRMCustomers();
}

// ==================== CRM EXPORT ====================
function exportCustomersCRM() {
    if (crmCustomers.length === 0) {
        showToast('No customers to export', 'warning');
        return;
    }
    
    const headers = ['Name', 'Group', 'Phone', 'Email', 'Company', 'Address', 'Credit Terms', 'Credit Limit', 'Outstanding', 'Total Spent', 'Status'];
    const rows = crmCustomers.map(c => [
        c.name,
        c.group,
        c.phone || '',
        c.email || '',
        c.company || '',
        c.address || '',
        c.creditTerms || 'cod',
        c.creditLimit || 0,
        c.outstandingBalance || 0,
        c.totalSpent || 0,
        c.status || 'active'
    ]);
    
    const csvContent = [headers, ...rows]
        .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
        .join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `crm_customers_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    
    showToast('Customers exported!', 'success');
}

// ==================== GET CRM CUSTOMERS FOR POS ====================
function getCRMCustomersForSelect() {
    return crmCustomers
        .filter(c => c.status === 'active')
        .map(c => ({
            id: c.id,
            name: c.name,
            company: c.company,
            group: c.group
        }));
}

// ==================== CREDIT MANAGEMENT ====================
function updateCRMCustomerCredit(customerId, amount) {
    const customer = crmCustomers.find(c => c.id === customerId);
    if (!customer) return;
    
    // Add to outstanding balance
    customer.outstandingBalance = (parseFloat(customer.outstandingBalance) || 0) + amount;
    customer.updatedAt = new Date().toISOString();
    
    saveCRMCustomers();
    updateCRMStats();
    renderCRMCustomers();
}

function receiveCRMPayment(customerId, amount, reference = '') {
    const customer = crmCustomers.find(c => c.id === customerId);
    if (!customer) return false;
    
    const outstanding = parseFloat(customer.outstandingBalance) || 0;
    const paymentAmount = parseFloat(amount) || 0;
    
    if (paymentAmount <= 0) {
        showToast('Invalid payment amount!', 'error');
        return false;
    }
    
    // Reduce outstanding balance
    customer.outstandingBalance = Math.max(0, outstanding - paymentAmount);
    customer.updatedAt = new Date().toISOString();
    
    // Record interaction
    customer.interactions = customer.interactions || [];
    customer.interactions.unshift({
        date: new Date().toISOString(),
        type: 'payment',
        note: `Payment received: RM ${paymentAmount.toFixed(2)}${reference ? ' (Ref: ' + reference + ')' : ''}`
    });
    
    saveCRMCustomers();
    updateCRMStats();
    
    // Record as income in accounting
    const incomeTransaction = {
        id: generateUUID(),
        date: new Date().toISOString().split('T')[0],
        amount: paymentAmount,
        category: 'Accounts Receivable Payment',
        description: `Credit payment from ${customer.name}${reference ? ' - Ref: ' + reference : ''}`,
        type: 'income',
        reference: reference || `CRM-${customerId}`,
        timestamp: new Date().toISOString()
    };
    // Push to businessData.transactions for proper sync with All Transactions
    if (typeof businessData !== 'undefined' && businessData.transactions) {
        businessData.transactions.push(incomeTransaction);
    } else if (typeof transactions !== 'undefined') {
        transactions.push(incomeTransaction);
    }
    if (typeof saveData === 'function') saveData();
    
    showToast(`Payment of RM ${paymentAmount.toFixed(2)} recorded!`, 'success');
    return true;
}

// ==================== CRM INTERACTIONS ====================
function addCRMInteraction(customerId) {
    const note = prompt('Add a note for this customer:');
    if (note === null || note.trim() === '') return;
    
    const customer = crmCustomers.find(c => c.id === customerId);
    if (!customer) return;
    
    if (!customer.interactions) {
        customer.interactions = [];
    }
    
    customer.interactions.unshift({
        id: generateUUID(),
        date: new Date().toISOString(),
        text: note.trim(),
        type: 'note'
    });
    
    customer.updatedAt = new Date().toISOString();
    saveCRMCustomers();
    renderCRMCustomers();
    showToast('Note added!', 'success');
}

// ==================== WINDOW EXPORTS ====================
window.CRM_CUSTOMERS_KEY = CRM_CUSTOMERS_KEY;
window.crmCustomers = crmCustomers;
window.initializeCRM = initializeCRM;
window.loadCRMCustomers = loadCRMCustomers;
window.saveCRMCustomers = saveCRMCustomers;
window.updateCRMStats = updateCRMStats;
window.deleteCRMCustomer = deleteCRMCustomer;
window.linkSaleToCRMCustomer = linkSaleToCRMCustomer;
window.exportCustomersCRM = exportCustomersCRM;
window.exportCRMCustomers = exportCustomersCRM; // Alias
window.getCRMCustomersForSelect = getCRMCustomersForSelect;
window.updateCRMCustomerCredit = updateCRMCustomerCredit;
window.receiveCRMPayment = receiveCRMPayment;
window.addCRMInteraction = addCRMInteraction;
