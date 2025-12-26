/**
 * EZCubic - Aging Reports Core (Data and Calculations)
 * Split from aging-reports.js v2.3.2
 * Accounts Receivable & Accounts Payable Aging Analysis
 */

// ==================== AGING BRACKETS (in days) ====================
const AGING_BRACKETS = [
    { label: 'Current', min: 0, max: 0, color: '#10b981', description: 'Not yet due' },
    { label: '1-30 Days Overdue', min: 1, max: 30, color: '#3b82f6', description: 'Past due 1-30 days' },
    { label: '31-60 Days Overdue', min: 31, max: 60, color: '#f59e0b', description: 'Past due 31-60 days' },
    { label: '61-90 Days Overdue', min: 61, max: 90, color: '#f97316', description: 'Past due 61-90 days' },
    { label: '91-120 Days Overdue', min: 91, max: 120, color: '#ef4444', description: 'Past due 91-120 days' },
    { label: '120+ Days Overdue', min: 121, max: Infinity, color: '#991b1b', description: 'Past due over 120 days' }
];

// ==================== DEBUG FUNCTION ====================
// Debug function to log aging data sources
function debugAgingData() {
    console.log('=== AGING REPORT DEBUG ===');
    
    // AR Sources
    const eInvoices = window.invoices || JSON.parse(localStorage.getItem('ezcubic_invoices') || '[]');
    const sales = window.sales || JSON.parse(localStorage.getItem('ezcubic_sales') || '[]');
    const creditSales = sales.filter(s => s.paymentMethod === 'credit' || s.isCredit);
    const quotations = window.quotations || JSON.parse(localStorage.getItem('ezcubic_quotations') || '[]');
    
    console.log('AR Data Sources:');
    console.log('  E-Invoices:', eInvoices.length, eInvoices);
    console.log('  Credit Sales:', creditSales.length, creditSales);
    console.log('  Quotations (invoiced):', quotations.filter(q => q.status === 'invoiced').length);
    
    // AP Sources
    const purchaseOrders = window.purchaseOrders || JSON.parse(localStorage.getItem('ezcubic_purchaseOrders') || '[]');
    const bills = window.bills || (typeof businessData !== 'undefined' && businessData.bills) || [];
    const transactions = window.transactions || (typeof businessData !== 'undefined' && businessData.transactions) || [];
    const supplierExpenses = transactions.filter(t => t.type === 'expense' && (t.supplier || t.payee) && (t.status === 'unpaid' || t.status === 'pending'));
    
    console.log('AP Data Sources:');
    console.log('  Purchase Orders:', purchaseOrders.length, purchaseOrders);
    console.log('  Bills:', bills.length, bills);
    console.log('  Supplier Expenses:', supplierExpenses.length);
    
    console.log('=== END DEBUG ===');
}

// ==================== AR AGING FUNCTIONS ====================
function calculateARAgingReport(asOfDate = new Date()) {
    // Debug log
    console.log('Calculating AR Aging Report as of:', asOfDate);
    
    const report = {
        asOfDate: asOfDate,
        generatedAt: new Date().toISOString(),
        summary: {
            totalReceivables: 0,
            brackets: AGING_BRACKETS.map(b => ({ ...b, amount: 0, count: 0 }))
        },
        customers: [],
        overdue: {
            total: 0,
            count: 0
        }
    };
    
    // Get all unpaid/partially paid invoices from multiple sources
    let invoices = [];
    
    // Source 1: E-Invoices (window.invoices or localStorage)
    const eInvoices = window.invoices || JSON.parse(localStorage.getItem('ezcubic_invoices') || '[]');
    if (Array.isArray(eInvoices)) {
        invoices = invoices.concat(eInvoices.filter(inv => {
            const outstanding = (inv.total || 0) - (inv.paidAmount || 0);
            return outstanding > 0 && inv.status !== 'cancelled' && inv.status !== 'paid';
        }).map(inv => ({
            ...inv,
            invoiceNumber: inv.invoiceNumber || inv.id,
            customerName: inv.customerName || inv.customer?.name || 'Unknown Customer',
            customerId: inv.customerId || inv.customer?.id || inv.customerName,
            total: inv.total || inv.grandTotal || 0,
            date: inv.date || inv.invoiceDate,
            dueDate: inv.dueDate || inv.date
        })));
    }
    
    // Source 2: Credit Sales from POS (unpaid or partially paid)
    const sales = window.sales || JSON.parse(localStorage.getItem('ezcubic_sales') || '[]');
    if (Array.isArray(sales)) {
        const creditSales = sales.filter(sale => {
            const outstanding = (sale.total || 0) - (sale.paidAmount || 0);
            return (sale.paymentMethod === 'credit' || sale.isCredit === true) && 
                   outstanding > 0 && 
                   sale.status !== 'cancelled' && 
                   sale.status !== 'paid';
        });
        invoices = invoices.concat(creditSales.map(sale => ({
            invoiceNumber: sale.receiptNo || sale.id,
            customerName: sale.customerName || 'Walk-in Customer',
            customerId: sale.customerId || sale.customerName,
            customerPhone: sale.customerPhone || '',
            customerEmail: sale.customerEmail || '',
            total: sale.total || 0,
            paidAmount: sale.paidAmount || 0,
            date: sale.date,
            dueDate: sale.dueDate || sale.date,
            status: sale.status
        })));
    }
    
    // Source 3: Quotations converted to invoices (if applicable)
    const quotations = window.quotations || JSON.parse(localStorage.getItem('ezcubic_quotations') || '[]');
    if (Array.isArray(quotations)) {
        const invoicedQuotations = quotations.filter(q => {
            const outstanding = (q.total || 0) - (q.paidAmount || 0);
            return q.status === 'invoiced' && outstanding > 0;
        });
        invoices = invoices.concat(invoicedQuotations.map(q => ({
            invoiceNumber: q.invoiceNumber || q.quotationNumber || q.id,
            customerName: q.customerName || 'Unknown Customer',
            customerId: q.customerId || q.customerName,
            customerPhone: q.customerPhone || '',
            customerEmail: q.customerEmail || '',
            total: q.total || q.grandTotal || 0,
            paidAmount: q.paidAmount || 0,
            date: q.invoiceDate || q.date,
            dueDate: q.dueDate || q.invoiceDate || q.date,
            status: q.status
        })));
    }
    
    // Group by customer
    const customerMap = new Map();
    
    invoices.forEach(invoice => {
        const customerId = invoice.customerId || invoice.customerName || 'Unknown';
        const customerName = invoice.customerName || 'Unknown Customer';
        
        if (!customerMap.has(customerId)) {
            customerMap.set(customerId, {
                customerId,
                customerName,
                invoices: [],
                brackets: AGING_BRACKETS.map(b => ({ ...b, amount: 0 })),
                totalOutstanding: 0,
                creditLimit: invoice.creditLimit || 0,
                phone: invoice.customerPhone || '',
                email: invoice.customerEmail || ''
            });
        }
        
        const customer = customerMap.get(customerId);
        const outstanding = (invoice.total || 0) - (invoice.paidAmount || 0);
        const dueDate = new Date(invoice.dueDate || invoice.date);
        const daysOverdue = Math.max(0, Math.floor((asOfDate - dueDate) / (1000 * 60 * 60 * 24)));
        
        // Find the appropriate bracket
        const bracketIndex = AGING_BRACKETS.findIndex(b => daysOverdue >= b.min && daysOverdue <= b.max);
        const bracket = bracketIndex >= 0 ? bracketIndex : AGING_BRACKETS.length - 1;
        
        customer.invoices.push({
            invoiceNumber: invoice.invoiceNumber,
            invoiceDate: invoice.date,
            dueDate: invoice.dueDate || invoice.date,
            total: invoice.total || 0,
            paidAmount: invoice.paidAmount || 0,
            outstanding,
            daysOverdue,
            bracket: AGING_BRACKETS[bracket].label
        });
        
        customer.brackets[bracket].amount += outstanding;
        customer.totalOutstanding += outstanding;
        
        // Update summary
        report.summary.brackets[bracket].amount += outstanding;
        report.summary.brackets[bracket].count++;
        report.summary.totalReceivables += outstanding;
        
        if (daysOverdue > 0) {
            report.overdue.total += outstanding;
            report.overdue.count++;
        }
    });
    
    // Convert map to array and sort by total outstanding (descending)
    report.customers = Array.from(customerMap.values())
        .sort((a, b) => b.totalOutstanding - a.totalOutstanding);
    
    // Debug log results
    console.log('AR Report Summary:', {
        total: report.summary.totalReceivables,
        brackets: report.summary.brackets.map(b => `${b.label}: RM${b.amount.toFixed(2)} (${b.count})`),
        customers: report.customers.length
    });
    
    return report;
}

// ==================== AP AGING FUNCTIONS ====================
function calculateAPAgingReport(asOfDate = new Date()) {
    // Debug log
    console.log('Calculating AP Aging Report as of:', asOfDate);
    
    const report = {
        asOfDate: asOfDate,
        generatedAt: new Date().toISOString(),
        summary: {
            totalPayables: 0,
            brackets: AGING_BRACKETS.map(b => ({ ...b, amount: 0, count: 0 }))
        },
        suppliers: [],
        overdue: {
            total: 0,
            count: 0
        }
    };
    
    // Get all unpaid purchase orders/bills from multiple sources
    let bills = [];
    
    // Source 1: Purchase Orders (window.purchaseOrders or localStorage)
    const purchaseOrders = window.purchaseOrders || JSON.parse(localStorage.getItem('ezcubic_purchaseOrders') || '[]');
    if (Array.isArray(purchaseOrders)) {
        const unpaidPOs = purchaseOrders.filter(po => {
            const outstanding = (po.total || po.grandTotal || 0) - (po.paidAmount || 0);
            return outstanding > 0 && po.status !== 'cancelled' && po.status !== 'paid';
        });
        bills = bills.concat(unpaidPOs.map(po => ({
            billNumber: po.poNumber || po.id,
            supplierName: po.supplierName || po.supplier?.name || 'Unknown Supplier',
            supplierId: po.supplierId || po.supplier?.id || po.supplierName,
            supplierPhone: po.supplierPhone || '',
            supplierEmail: po.supplierEmail || '',
            total: po.total || po.grandTotal || 0,
            paidAmount: po.paidAmount || 0,
            date: po.date || po.orderDate,
            dueDate: po.dueDate || po.date,
            status: po.status
        })));
    }
    
    // Source 2: Bills/Invoices from suppliers (window.bills or localStorage)
    const supplierBills = window.bills || (typeof businessData !== 'undefined' && businessData.bills) || 
                         JSON.parse(localStorage.getItem('ezcubic_bills') || '[]');
    if (Array.isArray(supplierBills)) {
        const unpaidBills = supplierBills.filter(bill => {
            const outstanding = (bill.total || bill.amount || 0) - (bill.paidAmount || 0);
            return outstanding > 0 && bill.status !== 'cancelled' && bill.status !== 'paid';
        });
        bills = bills.concat(unpaidBills.map(bill => ({
            billNumber: bill.name || bill.billNumber || bill.reference || bill.id,
            supplierName: bill.supplierName || bill.vendor || 'Unknown Supplier',
            supplierId: bill.supplierId || bill.supplierName || bill.vendor,
            supplierPhone: bill.supplierPhone || '',
            supplierEmail: bill.supplierEmail || '',
            total: bill.total || bill.amount || 0,
            paidAmount: bill.paidAmount || 0,
            date: bill.date || bill.billDate || bill.createdAt,
            dueDate: bill.dueDate || bill.date,
            status: bill.status
        })));
    }
    
    // Source 3: Expense transactions with supplier marked as unpaid
    const transactions = window.transactions || (typeof businessData !== 'undefined' && businessData.transactions) || 
                        JSON.parse(localStorage.getItem('ezcubic_transactions') || '[]');
    if (Array.isArray(transactions)) {
        const supplierExpenses = transactions.filter(t => 
            t.type === 'expense' && 
            (t.supplier || t.payee) && 
            (t.status === 'unpaid' || t.status === 'pending')
        );
        bills = bills.concat(supplierExpenses.map(e => ({
            billNumber: e.reference || e.description || e.id,
            supplierName: e.supplier || e.payee || 'Unknown Supplier',
            supplierId: e.supplierId || e.supplier || e.payee,
            total: e.amount || 0,
            paidAmount: 0,
            date: e.date,
            dueDate: e.dueDate || e.date,
            status: 'unpaid'
        })));
    }
    
    // Group by supplier
    const supplierMap = new Map();
    
    bills.forEach(bill => {
        const supplierId = bill.supplierId || bill.supplierName || bill.vendor || 'Unknown';
        const supplierName = bill.supplierName || bill.vendor || 'Unknown Supplier';
        
        if (!supplierMap.has(supplierId)) {
            supplierMap.set(supplierId, {
                supplierId,
                supplierName,
                bills: [],
                brackets: AGING_BRACKETS.map(b => ({ ...b, amount: 0 })),
                totalOutstanding: 0,
                phone: bill.supplierPhone || '',
                email: bill.supplierEmail || ''
            });
        }
        
        const supplier = supplierMap.get(supplierId);
        const outstanding = (bill.total || 0) - (bill.paidAmount || 0);
        const dueDate = new Date(bill.dueDate || bill.date);
        const daysOverdue = Math.max(0, Math.floor((asOfDate - dueDate) / (1000 * 60 * 60 * 24)));
        
        // Find the appropriate bracket
        const bracketIndex = AGING_BRACKETS.findIndex(b => daysOverdue >= b.min && daysOverdue <= b.max);
        const bracket = bracketIndex >= 0 ? bracketIndex : AGING_BRACKETS.length - 1;
        
        supplier.bills.push({
            billNumber: bill.billNumber || bill.poNumber || bill.reference || 'N/A',
            billDate: bill.date,
            dueDate: bill.dueDate || bill.date,
            total: bill.total || 0,
            paidAmount: bill.paidAmount || 0,
            outstanding,
            daysOverdue,
            bracket: AGING_BRACKETS[bracket].label
        });
        
        supplier.brackets[bracket].amount += outstanding;
        supplier.totalOutstanding += outstanding;
        
        // Update summary
        report.summary.brackets[bracket].amount += outstanding;
        report.summary.brackets[bracket].count++;
        report.summary.totalPayables += outstanding;
        
        if (daysOverdue > 0) {
            report.overdue.total += outstanding;
            report.overdue.count++;
        }
    });
    
    // Convert map to array and sort by total outstanding (descending)
    report.suppliers = Array.from(supplierMap.values())
        .sort((a, b) => b.totalOutstanding - a.totalOutstanding);
    
    // Debug log results
    console.log('AP Report Summary:', {
        total: report.summary.totalPayables,
        brackets: report.summary.brackets.map(b => `${b.label}: RM${b.amount.toFixed(2)} (${b.count})`),
        suppliers: report.suppliers.length
    });
    
    return report;
}

// ==================== HELPER FUNCTIONS ====================
function formatNumber(num) {
    return (num || 0).toLocaleString('en-MY', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

function formatDateShort(dateStr) {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-MY', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
    });
}

// ==================== EXPORTS ====================
window.AGING_BRACKETS = AGING_BRACKETS;
window.debugAgingData = debugAgingData;
window.calculateARAgingReport = calculateARAgingReport;
window.calculateAPAgingReport = calculateAPAgingReport;
window.formatNumber = formatNumber;
window.formatDateShort = formatDateShort;
