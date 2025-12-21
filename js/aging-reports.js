/**
 * EZCubic ERP - Aging Reports Module
 * Accounts Receivable & Accounts Payable Aging Analysis
 * Version: 1.0.0 - 20 Dec 2025
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
window.debugAgingData = debugAgingData;

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

// ==================== RENDERING ====================
function renderAgingReportsContent() {
    const contentArea = document.getElementById('agingReportsContent');
    if (!contentArea) return;
    
    const html = `
        <div class="aging-container">
            <!-- Header -->
            <div class="section-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <div>
                    <h2 style="margin: 0; color: #1e293b;">
                        <i class="fas fa-clock" style="color: #2563eb; margin-right: 10px;"></i>
                        Aging Reports
                    </h2>
                    <p style="color: #64748b; margin: 5px 0 0 0;">Accounts Receivable & Payable Aging Analysis</p>
                </div>
                <div style="display: flex; gap: 10px;">
                    <input type="date" id="agingAsOfDate" class="form-control" value="${new Date().toISOString().split('T')[0]}" 
                        onchange="refreshAgingReports()">
                    <button class="btn-secondary" onclick="exportAgingToPDF()">
                        <i class="fas fa-file-pdf"></i> Export PDF
                    </button>
                </div>
            </div>
            
            <!-- Tabs -->
            <div class="aging-tabs" style="display: flex; gap: 10px; margin-bottom: 20px;">
                <button class="aging-tab active" onclick="showAgingTab('ar')" id="arTab" 
                    style="flex: 1; padding: 15px; border: none; border-radius: 8px; cursor: pointer; background: #dcfce7; color: #16a34a; font-weight: 600;">
                    <i class="fas fa-hand-holding-usd"></i>
                    Accounts Receivable (AR)
                </button>
                <button class="aging-tab" onclick="showAgingTab('ap')" id="apTab"
                    style="flex: 1; padding: 15px; border: none; border-radius: 8px; cursor: pointer; background: #f1f5f9; color: #64748b; font-weight: 600;">
                    <i class="fas fa-file-invoice-dollar"></i>
                    Accounts Payable (AP)
                </button>
            </div>
            
            <!-- Content Areas -->
            <div id="arAgingContent" style="display: block;">
                ${renderARAgingReport()}
            </div>
            <div id="apAgingContent" style="display: none;">
                ${renderAPAgingReport()}
            </div>
        </div>
    `;
    
    contentArea.innerHTML = html;
}

function renderARAgingReport() {
    const asOfDate = new Date(document.getElementById('agingAsOfDate')?.value || new Date());
    const report = calculateARAgingReport(asOfDate);
    
    let html = `
        <!-- Info Banner -->
        <div style="background: #eff6ff; border: 1px solid #bfdbfe; padding: 12px 15px; border-radius: 8px; margin-bottom: 20px; font-size: 13px; color: #1e40af;">
            <i class="fas fa-info-circle" style="margin-right: 8px;"></i>
            <strong>How to read:</strong> "Current" = not yet due. Other columns show days <strong>past the due date</strong>. 
            Amounts move to overdue columns only after their due date has passed.
        </div>
        
        <!-- Summary Cards -->
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 15px; margin-bottom: 25px;">
            <div style="background: linear-gradient(135deg, #10b981, #059669); color: white; padding: 20px; border-radius: 12px;">
                <div style="font-size: 12px; opacity: 0.9;">Total Receivables</div>
                <div style="font-size: 28px; font-weight: 700;">RM ${formatNumber(report.summary.totalReceivables)}</div>
            </div>
            ${report.summary.brackets.map(b => `
                <div style="background: white; padding: 15px; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); border-left: 4px solid ${b.color};" title="${b.description || ''}">
                    <div style="font-size: 11px; color: #64748b;">${b.label}</div>
                    <div style="font-size: 18px; font-weight: 700; color: ${b.color};">RM ${formatNumber(b.amount)}</div>
                    <div style="font-size: 11px; color: #94a3b8;">${b.count} invoice(s)</div>
                </div>
            `).join('')}
        </div>
        
        <!-- Overdue Alert -->
        ${report.overdue.total > 0 ? `
            <div style="background: #fef2f2; border: 1px solid #fecaca; padding: 15px; border-radius: 10px; margin-bottom: 20px; display: flex; align-items: center; gap: 15px;">
                <i class="fas fa-exclamation-triangle" style="font-size: 24px; color: #dc2626;"></i>
                <div>
                    <div style="font-weight: 600; color: #991b1b;">Overdue Receivables</div>
                    <div style="color: #7f1d1d;">
                        RM ${formatNumber(report.overdue.total)} across ${report.overdue.count} invoice(s) are past due
                    </div>
                </div>
            </div>
        ` : ''}
        
        <!-- Customer Aging Table -->
        <div style="background: white; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); overflow: hidden;">
            <div style="padding: 15px 20px; background: #f8fafc; border-bottom: 1px solid #e2e8f0;">
                <h3 style="margin: 0; color: #1e293b;"><i class="fas fa-users" style="color: #3b82f6;"></i> Aging by Customer</h3>
            </div>
            
            ${report.customers.length > 0 ? `
                <table style="width: 100%; border-collapse: collapse;">
                    <thead>
                        <tr style="background: #f8fafc;">
                            <th style="padding: 12px 15px; text-align: left; border-bottom: 2px solid #e2e8f0; width: 200px;">Customer</th>
                            ${AGING_BRACKETS.map(b => `
                                <th style="padding: 12px 10px; text-align: right; border-bottom: 2px solid #e2e8f0; color: ${b.color}; font-size: 12px;" title="${b.description || ''}">
                                    ${b.label}
                                </th>
                            `).join('')}
                            <th style="padding: 12px 15px; text-align: right; border-bottom: 2px solid #e2e8f0; font-weight: 700;">Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${report.customers.map(customer => `
                            <tr class="clickable-row" onclick="showCustomerAgingDetail('${customer.customerId}')" style="border-bottom: 1px solid #e2e8f0;">
                                <td style="padding: 12px 15px;">
                                    <div style="font-weight: 600;">${escapeHTML(customer.customerName)}</div>
                                    <div style="font-size: 12px; color: #64748b;">${customer.invoices.length} invoice(s)</div>
                                </td>
                                ${customer.brackets.map(b => `
                                    <td style="padding: 12px 10px; text-align: right; font-family: monospace; ${b.amount > 0 ? 'color: ' + b.color : 'color: #cbd5e1'};">
                                        ${b.amount > 0 ? formatNumber(b.amount) : '-'}
                                    </td>
                                `).join('')}
                                <td style="padding: 12px 15px; text-align: right; font-weight: 700; font-family: monospace;">
                                    ${formatNumber(customer.totalOutstanding)}
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                    <tfoot>
                        <tr style="background: #1e293b; color: white; font-weight: 700;">
                            <td style="padding: 15px;">TOTAL</td>
                            ${report.summary.brackets.map(b => `
                                <td style="padding: 15px 10px; text-align: right; font-family: monospace;">
                                    ${formatNumber(b.amount)}
                                </td>
                            `).join('')}
                            <td style="padding: 15px; text-align: right; font-family: monospace;">
                                ${formatNumber(report.summary.totalReceivables)}
                            </td>
                        </tr>
                    </tfoot>
                </table>
            ` : `
                <div style="padding: 60px; text-align: center; color: #94a3b8;">
                    <i class="fas fa-check-circle" style="font-size: 48px; color: #10b981; margin-bottom: 15px;"></i>
                    <p style="margin: 0; font-size: 18px;">No outstanding receivables</p>
                    <p style="margin: 5px 0 0 0;">All customer invoices have been paid</p>
                </div>
            `}
        </div>
    `;
    
    return html;
}

function renderAPAgingReport() {
    const asOfDate = new Date(document.getElementById('agingAsOfDate')?.value || new Date());
    const report = calculateAPAgingReport(asOfDate);
    
    let html = `
        <!-- Info Banner -->
        <div style="background: #fef3c7; border: 1px solid #fde68a; padding: 12px 15px; border-radius: 8px; margin-bottom: 20px; font-size: 13px; color: #92400e;">
            <i class="fas fa-info-circle" style="margin-right: 8px;"></i>
            <strong>How to read:</strong> "Current" = not yet due. Other columns show days <strong>past the due date</strong>. 
            Bills move to overdue columns only after their due date has passed.
        </div>
        
        <!-- Summary Cards -->
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 15px; margin-bottom: 25px;">
            <div style="background: linear-gradient(135deg, #ef4444, #dc2626); color: white; padding: 20px; border-radius: 12px;">
                <div style="font-size: 12px; opacity: 0.9;">Total Payables</div>
                <div style="font-size: 28px; font-weight: 700;">RM ${formatNumber(report.summary.totalPayables)}</div>
            </div>
            ${report.summary.brackets.map(b => `
                <div style="background: white; padding: 15px; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); border-left: 4px solid ${b.color};" title="${b.description || ''}">
                    <div style="font-size: 11px; color: #64748b;">${b.label}</div>
                    <div style="font-size: 18px; font-weight: 700; color: ${b.color};">RM ${formatNumber(b.amount)}</div>
                    <div style="font-size: 11px; color: #94a3b8;">${b.count} bill(s)</div>
                </div>
            `).join('')}
        </div>
        
        <!-- Overdue Alert -->
        ${report.overdue.total > 0 ? `
            <div style="background: #fef3c7; border: 1px solid #fde68a; padding: 15px; border-radius: 10px; margin-bottom: 20px; display: flex; align-items: center; gap: 15px;">
                <i class="fas fa-exclamation-circle" style="font-size: 24px; color: #d97706;"></i>
                <div>
                    <div style="font-weight: 600; color: #92400e;">Overdue Payables</div>
                    <div style="color: #78350f;">
                        RM ${formatNumber(report.overdue.total)} across ${report.overdue.count} bill(s) are past due
                    </div>
                </div>
            </div>
        ` : ''}
        
        <!-- Supplier Aging Table -->
        <div style="background: white; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); overflow: hidden;">
            <div style="padding: 15px 20px; background: #f8fafc; border-bottom: 1px solid #e2e8f0;">
                <h3 style="margin: 0; color: #1e293b;"><i class="fas fa-truck" style="color: #f59e0b;"></i> Aging by Supplier</h3>
            </div>
            
            ${report.suppliers.length > 0 ? `
                <table style="width: 100%; border-collapse: collapse;">
                    <thead>
                        <tr style="background: #f8fafc;">
                            <th style="padding: 12px 15px; text-align: left; border-bottom: 2px solid #e2e8f0; width: 200px;">Supplier</th>
                            ${AGING_BRACKETS.map(b => `
                                <th style="padding: 12px 10px; text-align: right; border-bottom: 2px solid #e2e8f0; color: ${b.color}; font-size: 12px;" title="${b.description || ''}">
                                    ${b.label}
                                </th>
                            `).join('')}
                            <th style="padding: 12px 15px; text-align: right; border-bottom: 2px solid #e2e8f0; font-weight: 700;">Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${report.suppliers.map(supplier => `
                            <tr class="clickable-row" onclick="showSupplierAgingDetail('${supplier.supplierId}')" style="border-bottom: 1px solid #e2e8f0;">
                                <td style="padding: 12px 15px;">
                                    <div style="font-weight: 600;">${escapeHTML(supplier.supplierName)}</div>
                                    <div style="font-size: 12px; color: #64748b;">${supplier.bills.length} bill(s)</div>
                                </td>
                                ${supplier.brackets.map(b => `
                                    <td style="padding: 12px 10px; text-align: right; font-family: monospace; ${b.amount > 0 ? 'color: ' + b.color : 'color: #cbd5e1'};">
                                        ${b.amount > 0 ? formatNumber(b.amount) : '-'}
                                    </td>
                                `).join('')}
                                <td style="padding: 12px 15px; text-align: right; font-weight: 700; font-family: monospace;">
                                    ${formatNumber(supplier.totalOutstanding)}
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                    <tfoot>
                        <tr style="background: #1e293b; color: white; font-weight: 700;">
                            <td style="padding: 15px;">TOTAL</td>
                            ${report.summary.brackets.map(b => `
                                <td style="padding: 15px 10px; text-align: right; font-family: monospace;">
                                    ${formatNumber(b.amount)}
                                </td>
                            `).join('')}
                            <td style="padding: 15px; text-align: right; font-family: monospace;">
                                ${formatNumber(report.summary.totalPayables)}
                            </td>
                        </tr>
                    </tfoot>
                </table>
            ` : `
                <div style="padding: 60px; text-align: center; color: #94a3b8;">
                    <i class="fas fa-check-circle" style="font-size: 48px; color: #10b981; margin-bottom: 15px;"></i>
                    <p style="margin: 0; font-size: 18px;">No outstanding payables</p>
                    <p style="margin: 5px 0 0 0;">All supplier bills have been paid</p>
                </div>
            `}
        </div>
    `;
    
    return html;
}

function showAgingTab(tab) {
    const arTab = document.getElementById('arTab');
    const apTab = document.getElementById('apTab');
    const arContent = document.getElementById('arAgingContent');
    const apContent = document.getElementById('apAgingContent');
    
    if (tab === 'ar') {
        arTab.style.background = '#dcfce7';
        arTab.style.color = '#16a34a';
        apTab.style.background = '#f1f5f9';
        apTab.style.color = '#64748b';
        arContent.style.display = 'block';
        apContent.style.display = 'none';
    } else {
        arTab.style.background = '#f1f5f9';
        arTab.style.color = '#64748b';
        apTab.style.background = '#fee2e2';
        apTab.style.color = '#dc2626';
        arContent.style.display = 'none';
        apContent.style.display = 'block';
    }
}

function refreshAgingReports() {
    const arContent = document.getElementById('arAgingContent');
    const apContent = document.getElementById('apAgingContent');
    
    if (arContent) arContent.innerHTML = renderARAgingReport();
    if (apContent) apContent.innerHTML = renderAPAgingReport();
}

// ==================== DETAIL MODALS ====================
function showCustomerAgingDetail(customerId) {
    const asOfDate = new Date(document.getElementById('agingAsOfDate')?.value || new Date());
    const report = calculateARAgingReport(asOfDate);
    const customer = report.customers.find(c => c.customerId === customerId);
    
    if (!customer) {
        showNotification('Customer not found', 'error');
        return;
    }
    
    // Remove existing modal if any
    const existing = document.getElementById('customerAgingModal');
    if (existing) existing.remove();
    
    const modal = document.createElement('div');
    modal.id = 'customerAgingModal';
    modal.className = 'modal';
    modal.style.display = 'flex';
    modal.dataset.dynamic = 'true';
    
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 800px; max-height: 90vh; overflow: auto;">
            <div class="modal-header">
                <h3 class="modal-title"><i class="fas fa-user"></i> ${escapeHTML(customer.customerName)}</h3>
                <button class="modal-close" onclick="closeModal('customerAgingModal')">&times;</button>
            </div>
            <div class="modal-body">
                <!-- Customer Summary -->
                <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin-bottom: 20px;">
                    <div style="background: #f8fafc; padding: 15px; border-radius: 8px; text-align: center;">
                        <div style="color: #64748b; font-size: 12px;">Total Outstanding</div>
                        <div style="font-size: 24px; font-weight: 700; color: #ef4444;">RM ${formatNumber(customer.totalOutstanding)}</div>
                    </div>
                    <div style="background: #f8fafc; padding: 15px; border-radius: 8px; text-align: center;">
                        <div style="color: #64748b; font-size: 12px;">Open Invoices</div>
                        <div style="font-size: 24px; font-weight: 700; color: #3b82f6;">${customer.invoices.length}</div>
                    </div>
                    <div style="background: #f8fafc; padding: 15px; border-radius: 8px; text-align: center;">
                        <div style="color: #64748b; font-size: 12px;">Oldest Overdue</div>
                        <div style="font-size: 24px; font-weight: 700; color: #f59e0b;">
                            ${Math.max(...customer.invoices.map(i => i.daysOverdue))} days
                        </div>
                    </div>
                </div>
                
                <!-- Aging Breakdown -->
                <div style="display: flex; gap: 10px; margin-bottom: 20px; flex-wrap: wrap;">
                    ${customer.brackets.map(b => `
                        <div style="flex: 1; min-width: 100px; background: ${b.color}15; padding: 10px; border-radius: 8px; border-left: 3px solid ${b.color};">
                            <div style="font-size: 11px; color: ${b.color};">${b.label}</div>
                            <div style="font-weight: 700;">RM ${formatNumber(b.amount)}</div>
                        </div>
                    `).join('')}
                </div>
                
                <!-- Invoice List -->
                <h4 style="margin: 20px 0 10px 0;">Outstanding Invoices</h4>
                <table style="width: 100%; border-collapse: collapse;">
                    <thead>
                        <tr style="background: #f8fafc;">
                            <th style="padding: 10px; text-align: left; border-bottom: 2px solid #e2e8f0;">Invoice #</th>
                            <th style="padding: 10px; text-align: left; border-bottom: 2px solid #e2e8f0;">Date</th>
                            <th style="padding: 10px; text-align: left; border-bottom: 2px solid #e2e8f0;">Due Date</th>
                            <th style="padding: 10px; text-align: right; border-bottom: 2px solid #e2e8f0;">Total</th>
                            <th style="padding: 10px; text-align: right; border-bottom: 2px solid #e2e8f0;">Paid</th>
                            <th style="padding: 10px; text-align: right; border-bottom: 2px solid #e2e8f0;">Outstanding</th>
                            <th style="padding: 10px; text-align: center; border-bottom: 2px solid #e2e8f0;">Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${customer.invoices.map(inv => {
                            const bracket = AGING_BRACKETS.find(b => b.label === inv.bracket);
                            return `
                                <tr style="border-bottom: 1px solid #e2e8f0;">
                                    <td style="padding: 10px; font-weight: 600;">${inv.invoiceNumber}</td>
                                    <td style="padding: 10px;">${formatDateShort(inv.invoiceDate)}</td>
                                    <td style="padding: 10px; ${inv.daysOverdue > 0 ? 'color: #ef4444;' : ''}">${formatDateShort(inv.dueDate)}</td>
                                    <td style="padding: 10px; text-align: right; font-family: monospace;">RM ${formatNumber(inv.total)}</td>
                                    <td style="padding: 10px; text-align: right; font-family: monospace; color: #10b981;">RM ${formatNumber(inv.paidAmount)}</td>
                                    <td style="padding: 10px; text-align: right; font-family: monospace; font-weight: 600;">RM ${formatNumber(inv.outstanding)}</td>
                                    <td style="padding: 10px; text-align: center;">
                                        <span style="background: ${bracket?.color || '#94a3b8'}20; color: ${bracket?.color || '#94a3b8'}; padding: 3px 10px; border-radius: 15px; font-size: 12px;">
                                            ${inv.daysOverdue === 0 ? 'Current' : inv.daysOverdue + ' days'}
                                        </span>
                                    </td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            </div>
            <div class="modal-footer">
                <button class="btn-secondary" onclick="closeModal('customerAgingModal')">Close</button>
                <button class="btn-primary" onclick="sendCollectionReminder('${customerId}')">
                    <i class="fas fa-envelope"></i> Send Reminder
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
}

function showSupplierAgingDetail(supplierId) {
    const asOfDate = new Date(document.getElementById('agingAsOfDate')?.value || new Date());
    const report = calculateAPAgingReport(asOfDate);
    const supplier = report.suppliers.find(s => s.supplierId === supplierId);
    
    if (!supplier) {
        showNotification('Supplier not found', 'error');
        return;
    }
    
    // Remove existing modal if any
    const existing = document.getElementById('supplierAgingModal');
    if (existing) existing.remove();
    
    const modal = document.createElement('div');
    modal.id = 'supplierAgingModal';
    modal.className = 'modal';
    modal.style.display = 'flex';
    modal.dataset.dynamic = 'true';
    
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 800px; max-height: 90vh; overflow: auto;">
            <div class="modal-header">
                <h3 class="modal-title"><i class="fas fa-truck"></i> ${escapeHTML(supplier.supplierName)}</h3>
                <button class="modal-close" onclick="closeModal('supplierAgingModal')">&times;</button>
            </div>
            <div class="modal-body">
                <!-- Supplier Summary -->
                <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin-bottom: 20px;">
                    <div style="background: #f8fafc; padding: 15px; border-radius: 8px; text-align: center;">
                        <div style="color: #64748b; font-size: 12px;">Total Outstanding</div>
                        <div style="font-size: 24px; font-weight: 700; color: #dc2626;">RM ${formatNumber(supplier.totalOutstanding)}</div>
                    </div>
                    <div style="background: #f8fafc; padding: 15px; border-radius: 8px; text-align: center;">
                        <div style="color: #64748b; font-size: 12px;">Open Bills</div>
                        <div style="font-size: 24px; font-weight: 700; color: #3b82f6;">${supplier.bills.length}</div>
                    </div>
                    <div style="background: #f8fafc; padding: 15px; border-radius: 8px; text-align: center;">
                        <div style="color: #64748b; font-size: 12px;">Oldest Overdue</div>
                        <div style="font-size: 24px; font-weight: 700; color: #f59e0b;">
                            ${Math.max(...supplier.bills.map(b => b.daysOverdue))} days
                        </div>
                    </div>
                </div>
                
                <!-- Aging Breakdown -->
                <div style="display: flex; gap: 10px; margin-bottom: 20px; flex-wrap: wrap;">
                    ${supplier.brackets.map(b => `
                        <div style="flex: 1; min-width: 100px; background: ${b.color}15; padding: 10px; border-radius: 8px; border-left: 3px solid ${b.color};">
                            <div style="font-size: 11px; color: ${b.color};">${b.label}</div>
                            <div style="font-weight: 700;">RM ${formatNumber(b.amount)}</div>
                        </div>
                    `).join('')}
                </div>
                
                <!-- Bill List -->
                <h4 style="margin: 20px 0 10px 0;">Outstanding Bills</h4>
                <table style="width: 100%; border-collapse: collapse;">
                    <thead>
                        <tr style="background: #f8fafc;">
                            <th style="padding: 10px; text-align: left; border-bottom: 2px solid #e2e8f0;">Bill #</th>
                            <th style="padding: 10px; text-align: left; border-bottom: 2px solid #e2e8f0;">Date</th>
                            <th style="padding: 10px; text-align: left; border-bottom: 2px solid #e2e8f0;">Due Date</th>
                            <th style="padding: 10px; text-align: right; border-bottom: 2px solid #e2e8f0;">Total</th>
                            <th style="padding: 10px; text-align: right; border-bottom: 2px solid #e2e8f0;">Paid</th>
                            <th style="padding: 10px; text-align: right; border-bottom: 2px solid #e2e8f0;">Outstanding</th>
                            <th style="padding: 10px; text-align: center; border-bottom: 2px solid #e2e8f0;">Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${supplier.bills.map(bill => {
                            const bracket = AGING_BRACKETS.find(b => b.label === bill.bracket);
                            return `
                                <tr style="border-bottom: 1px solid #e2e8f0;">
                                    <td style="padding: 10px; font-weight: 600;">${bill.billNumber}</td>
                                    <td style="padding: 10px;">${formatDateShort(bill.billDate)}</td>
                                    <td style="padding: 10px; ${bill.daysOverdue > 0 ? 'color: #ef4444;' : ''}">${formatDateShort(bill.dueDate)}</td>
                                    <td style="padding: 10px; text-align: right; font-family: monospace;">RM ${formatNumber(bill.total)}</td>
                                    <td style="padding: 10px; text-align: right; font-family: monospace; color: #10b981;">RM ${formatNumber(bill.paidAmount)}</td>
                                    <td style="padding: 10px; text-align: right; font-family: monospace; font-weight: 600;">RM ${formatNumber(bill.outstanding)}</td>
                                    <td style="padding: 10px; text-align: center;">
                                        <span style="background: ${bracket?.color || '#94a3b8'}20; color: ${bracket?.color || '#94a3b8'}; padding: 3px 10px; border-radius: 15px; font-size: 12px;">
                                            ${bill.daysOverdue === 0 ? 'Current' : bill.daysOverdue + ' days'}
                                        </span>
                                    </td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            </div>
            <div class="modal-footer">
                <button class="btn-secondary" onclick="closeModal('supplierAgingModal')">Close</button>
                <button class="btn-primary" onclick="recordPayment('${supplierId}')">
                    <i class="fas fa-credit-card"></i> Record Payment
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
}

// ==================== ACTIONS ====================
function sendCollectionReminder(customerId) {
    showNotification('Collection reminder feature will be implemented with email integration', 'info');
    closeModal('customerAgingModal');
}

function recordPayment(supplierId) {
    showNotification('Payment recording will redirect to payments module', 'info');
    closeModal('supplierAgingModal');
}

function exportAgingToPDF() {
    if (typeof exportToPDF === 'function') {
        showNotification('Generating PDF report...', 'info');
    } else {
        showNotification('PDF export will be implemented', 'info');
    }
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
window.calculateARAgingReport = calculateARAgingReport;
window.calculateAPAgingReport = calculateAPAgingReport;
window.renderAgingReportsContent = renderAgingReportsContent;
window.renderARAgingReport = renderARAgingReport;
window.renderAPAgingReport = renderAPAgingReport;
window.showAgingTab = showAgingTab;
window.refreshAgingReports = refreshAgingReports;
window.showCustomerAgingDetail = showCustomerAgingDetail;
window.showSupplierAgingDetail = showSupplierAgingDetail;
window.sendCollectionReminder = sendCollectionReminder;
window.recordPayment = recordPayment;
window.exportAgingToPDF = exportAgingToPDF;
window.AGING_BRACKETS = AGING_BRACKETS;
