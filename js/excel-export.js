// ==================== EXCEL-EXPORT.JS ====================
// Export data to Excel (.xlsx) format
// Uses SheetJS library (XLSX)

/**
 * Generic function to export data to Excel
 * @param {Array} data - Array of objects to export
 * @param {string} filename - Name of the file (without extension)
 * @param {string} sheetName - Name of the Excel sheet
 * @param {Array} columns - Optional column configuration [{header: 'Display Name', key: 'dataKey'}]
 */
function exportToExcel(data, filename, sheetName = 'Sheet1', columns = null) {
    if (!window.XLSX) {
        showNotification('Excel export library not loaded. Please refresh the page.', 'error');
        return;
    }
    
    if (!data || data.length === 0) {
        showNotification('No data to export', 'warning');
        return;
    }
    
    try {
        let exportData = data;
        
        // If columns specified, transform data to match column order and headers
        if (columns && columns.length > 0) {
            exportData = data.map(row => {
                const newRow = {};
                columns.forEach(col => {
                    const value = row[col.key];
                    // Format dates and numbers nicely
                    if (value instanceof Date) {
                        newRow[col.header] = value.toLocaleDateString('en-MY');
                    } else if (typeof value === 'number' && col.format === 'currency') {
                        newRow[col.header] = value.toFixed(2);
                    } else {
                        newRow[col.header] = value !== undefined && value !== null ? value : '';
                    }
                });
                return newRow;
            });
        }
        
        // Create workbook and worksheet
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(exportData);
        
        // Auto-size columns (approximate)
        const colWidths = [];
        if (exportData.length > 0) {
            const keys = Object.keys(exportData[0]);
            keys.forEach((key, i) => {
                let maxWidth = key.length;
                exportData.forEach(row => {
                    const val = row[key];
                    if (val) {
                        const len = String(val).length;
                        if (len > maxWidth) maxWidth = len;
                    }
                });
                colWidths.push({ wch: Math.min(maxWidth + 2, 50) });
            });
            ws['!cols'] = colWidths;
        }
        
        // Add worksheet to workbook
        XLSX.utils.book_append_sheet(wb, ws, sheetName);
        
        // Generate filename with date
        const date = new Date().toISOString().split('T')[0];
        const fullFilename = `${filename}_${date}.xlsx`;
        
        // Download file
        XLSX.writeFile(wb, fullFilename);
        
        showNotification(`Exported ${data.length} records to ${fullFilename}`, 'success');
        
    } catch (error) {
        console.error('Excel export error:', error);
        showNotification('Failed to export to Excel: ' + error.message, 'error');
    }
}

/**
 * Export multiple sheets to one Excel file
 * @param {Array} sheets - Array of {name: 'SheetName', data: [...], columns: [...]}
 * @param {string} filename - Name of the file
 */
function exportMultiSheetExcel(sheets, filename) {
    if (!window.XLSX) {
        showNotification('Excel export library not loaded. Please refresh the page.', 'error');
        return;
    }
    
    try {
        const wb = XLSX.utils.book_new();
        
        sheets.forEach(sheet => {
            let exportData = sheet.data || [];
            
            if (sheet.columns && sheet.columns.length > 0 && exportData.length > 0) {
                exportData = exportData.map(row => {
                    const newRow = {};
                    sheet.columns.forEach(col => {
                        const value = row[col.key];
                        newRow[col.header] = value !== undefined && value !== null ? value : '';
                    });
                    return newRow;
                });
            }
            
            const ws = XLSX.utils.json_to_sheet(exportData);
            XLSX.utils.book_append_sheet(wb, ws, sheet.name || 'Sheet');
        });
        
        const date = new Date().toISOString().split('T')[0];
        const fullFilename = `${filename}_${date}.xlsx`;
        
        XLSX.writeFile(wb, fullFilename);
        showNotification(`Exported to ${fullFilename}`, 'success');
        
    } catch (error) {
        console.error('Multi-sheet Excel export error:', error);
        showNotification('Failed to export to Excel: ' + error.message, 'error');
    }
}

// ==================== SPECIFIC EXPORT FUNCTIONS ====================

// Export Transactions to Excel
function exportTransactionsToExcel() {
    const transactions = getTransactionsFromStorage();
    
    const columns = [
        { header: 'Date', key: 'date' },
        { header: 'Type', key: 'type' },
        { header: 'Category', key: 'category' },
        { header: 'Description', key: 'description' },
        { header: 'Amount (RM)', key: 'amount', format: 'currency' },
        { header: 'Payment Method', key: 'paymentMethod' },
        { header: 'Reference', key: 'reference' },
        { header: 'Status', key: 'status' }
    ];
    
    exportToExcel(transactions, 'Transactions', 'Transactions', columns);
}

// Export Bills to Excel
function exportBillsToExcel() {
    const bills = getBillsFromStorage();
    
    const columns = [
        { header: 'Bill Number', key: 'billNumber' },
        { header: 'Vendor', key: 'vendor' },
        { header: 'Description', key: 'name' },
        { header: 'Amount (RM)', key: 'amount', format: 'currency' },
        { header: 'Due Date', key: 'dueDate' },
        { header: 'Status', key: 'status' },
        { header: 'Category', key: 'category' }
    ];
    
    exportToExcel(bills, 'Bills', 'Bills', columns);
}

// Export Inventory to Excel
function exportInventoryToExcel() {
    const products = window.products || JSON.parse(localStorage.getItem('ezcubic_products') || '[]');
    
    const columns = [
        { header: 'SKU', key: 'sku' },
        { header: 'Product Name', key: 'name' },
        { header: 'Category', key: 'category' },
        { header: 'Current Stock', key: 'stock' },
        { header: 'Min Stock', key: 'minStock' },
        { header: 'Cost Price (RM)', key: 'costPrice', format: 'currency' },
        { header: 'Selling Price (RM)', key: 'price', format: 'currency' },
        { header: 'Status', key: 'status' }
    ];
    
    exportToExcel(products, 'Inventory', 'Products', columns);
}

// Export Customers to Excel
function exportCustomersToExcel() {
    const customers = window.customers || JSON.parse(localStorage.getItem('ezcubic_customers') || '[]');
    
    const columns = [
        { header: 'Name', key: 'name' },
        { header: 'Company', key: 'company' },
        { header: 'Email', key: 'email' },
        { header: 'Phone', key: 'phone' },
        { header: 'Address', key: 'address' },
        { header: 'Total Purchases (RM)', key: 'totalPurchases', format: 'currency' },
        { header: 'Outstanding (RM)', key: 'outstanding', format: 'currency' },
        { header: 'Status', key: 'status' }
    ];
    
    exportToExcel(customers, 'Customers', 'Customers', columns);
}

// Export Suppliers to Excel
function exportSuppliersToExcel() {
    const suppliers = window.suppliers || JSON.parse(localStorage.getItem('ezcubic_suppliers') || '[]');
    
    const columns = [
        { header: 'Company Name', key: 'companyName' },
        { header: 'Contact Person', key: 'contactPerson' },
        { header: 'Email', key: 'email' },
        { header: 'Phone', key: 'phone' },
        { header: 'Address', key: 'address' },
        { header: 'Category', key: 'category' },
        { header: 'Payment Terms', key: 'paymentTerms' },
        { header: 'Outstanding (RM)', key: 'outstanding', format: 'currency' },
        { header: 'Status', key: 'status' }
    ];
    
    exportToExcel(suppliers, 'Suppliers', 'Suppliers', columns);
}

// Export Orders to Excel
function exportOrdersToExcel() {
    const orders = window.orders || JSON.parse(localStorage.getItem('ezcubic_orders') || '[]');
    
    const columns = [
        { header: 'Order Number', key: 'orderNumber' },
        { header: 'Date', key: 'date' },
        { header: 'Customer', key: 'customerName' },
        { header: 'Items', key: 'itemCount' },
        { header: 'Subtotal (RM)', key: 'subtotal', format: 'currency' },
        { header: 'Tax (RM)', key: 'tax', format: 'currency' },
        { header: 'Total (RM)', key: 'total', format: 'currency' },
        { header: 'Status', key: 'status' },
        { header: 'Payment Status', key: 'paymentStatus' }
    ];
    
    // Add item count to orders
    const ordersWithCount = orders.map(o => ({
        ...o,
        itemCount: o.items ? o.items.length : 0
    }));
    
    exportToExcel(ordersWithCount, 'Orders', 'Orders', columns);
}

// Export Employees to Excel
function exportEmployeesToExcel() {
    const employees = window.employees || JSON.parse(localStorage.getItem('ezcubic_employees') || '[]');
    
    const columns = [
        { header: 'Employee ID', key: 'employeeId' },
        { header: 'Name', key: 'name' },
        { header: 'IC Number', key: 'icNumber' },
        { header: 'Position', key: 'position' },
        { header: 'Department', key: 'department' },
        { header: 'Email', key: 'email' },
        { header: 'Phone', key: 'phone' },
        { header: 'Basic Salary (RM)', key: 'basicSalary', format: 'currency' },
        { header: 'Join Date', key: 'joinDate' },
        { header: 'Status', key: 'status' }
    ];
    
    exportToExcel(employees, 'Employees', 'Employees', columns);
}

// Export Quotations to Excel
function exportQuotationsToExcel() {
    const quotations = window.quotations || JSON.parse(localStorage.getItem('ezcubic_quotations') || '[]');
    
    const columns = [
        { header: 'Quote Number', key: 'quoteNumber' },
        { header: 'Date', key: 'date' },
        { header: 'Customer', key: 'customerName' },
        { header: 'Subject', key: 'subject' },
        { header: 'Subtotal (RM)', key: 'subtotal', format: 'currency' },
        { header: 'Tax (RM)', key: 'tax', format: 'currency' },
        { header: 'Total (RM)', key: 'total', format: 'currency' },
        { header: 'Valid Until', key: 'validUntil' },
        { header: 'Status', key: 'status' }
    ];
    
    exportToExcel(quotations, 'Quotations', 'Quotations', columns);
}

// Export Purchase Orders to Excel
function exportPurchaseOrdersToExcel() {
    const pos = window.purchaseOrders || JSON.parse(localStorage.getItem('ezcubic_purchase_orders') || '[]');
    
    const columns = [
        { header: 'PO Number', key: 'poNumber' },
        { header: 'Date', key: 'date' },
        { header: 'Supplier', key: 'supplierName' },
        { header: 'Items', key: 'itemCount' },
        { header: 'Subtotal (RM)', key: 'subtotal', format: 'currency' },
        { header: 'Tax (RM)', key: 'tax', format: 'currency' },
        { header: 'Total (RM)', key: 'total', format: 'currency' },
        { header: 'Status', key: 'status' },
        { header: 'Expected Date', key: 'expectedDate' }
    ];
    
    const posWithCount = pos.map(po => ({
        ...po,
        itemCount: po.items ? po.items.length : 0
    }));
    
    exportToExcel(posWithCount, 'Purchase_Orders', 'Purchase Orders', columns);
}

// Export Payroll to Excel
function exportPayrollToExcel() {
    const payroll = window.payrollRecords || JSON.parse(localStorage.getItem('ezcubic_payroll') || '[]');
    
    const columns = [
        { header: 'Payroll ID', key: 'id' },
        { header: 'Employee', key: 'employeeName' },
        { header: 'Period', key: 'period' },
        { header: 'Basic Salary (RM)', key: 'basicSalary', format: 'currency' },
        { header: 'Allowances (RM)', key: 'allowances', format: 'currency' },
        { header: 'Overtime (RM)', key: 'overtime', format: 'currency' },
        { header: 'EPF Employee (RM)', key: 'epfEmployee', format: 'currency' },
        { header: 'SOCSO (RM)', key: 'socso', format: 'currency' },
        { header: 'EIS (RM)', key: 'eis', format: 'currency' },
        { header: 'PCB (RM)', key: 'pcb', format: 'currency' },
        { header: 'Net Pay (RM)', key: 'netPay', format: 'currency' },
        { header: 'Status', key: 'status' }
    ];
    
    exportToExcel(payroll, 'Payroll', 'Payroll', columns);
}

// Export Full Financial Report to Excel (Multi-sheet)
function exportFullFinancialReport() {
    const transactions = getTransactionsFromStorage();
    const bills = getBillsFromStorage();
    
    // Income transactions
    const income = transactions.filter(t => t.type === 'income');
    // Expense transactions
    const expenses = transactions.filter(t => t.type === 'expense');
    
    // Summary data
    const totalIncome = income.reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);
    const totalExpenses = expenses.reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);
    const unpaidBills = bills.filter(b => b.status !== 'paid').reduce((sum, b) => sum + (parseFloat(b.amount) || 0), 0);
    
    const summary = [{
        'Total Income': totalIncome.toFixed(2),
        'Total Expenses': totalExpenses.toFixed(2),
        'Net Profit': (totalIncome - totalExpenses).toFixed(2),
        'Unpaid Bills': unpaidBills.toFixed(2),
        'Report Date': new Date().toLocaleDateString('en-MY')
    }];
    
    const sheets = [
        { name: 'Summary', data: summary },
        { 
            name: 'Income', 
            data: income,
            columns: [
                { header: 'Date', key: 'date' },
                { header: 'Category', key: 'category' },
                { header: 'Description', key: 'description' },
                { header: 'Amount (RM)', key: 'amount' },
                { header: 'Payment Method', key: 'paymentMethod' }
            ]
        },
        { 
            name: 'Expenses', 
            data: expenses,
            columns: [
                { header: 'Date', key: 'date' },
                { header: 'Category', key: 'category' },
                { header: 'Description', key: 'description' },
                { header: 'Amount (RM)', key: 'amount' },
                { header: 'Payment Method', key: 'paymentMethod' }
            ]
        },
        { 
            name: 'Bills', 
            data: bills,
            columns: [
                { header: 'Vendor', key: 'vendor' },
                { header: 'Description', key: 'name' },
                { header: 'Amount (RM)', key: 'amount' },
                { header: 'Due Date', key: 'dueDate' },
                { header: 'Status', key: 'status' }
            ]
        }
    ];
    
    exportMultiSheetExcel(sheets, 'Financial_Report');
}

// ==================== GLOBAL EXPORTS ====================
window.exportToExcel = exportToExcel;
window.exportMultiSheetExcel = exportMultiSheetExcel;
window.exportTransactionsToExcel = exportTransactionsToExcel;
window.exportBillsToExcel = exportBillsToExcel;
window.exportInventoryToExcel = exportInventoryToExcel;
window.exportCustomersToExcel = exportCustomersToExcel;
window.exportSuppliersToExcel = exportSuppliersToExcel;
window.exportOrdersToExcel = exportOrdersToExcel;
window.exportEmployeesToExcel = exportEmployeesToExcel;
window.exportQuotationsToExcel = exportQuotationsToExcel;
window.exportPurchaseOrdersToExcel = exportPurchaseOrdersToExcel;
window.exportPayrollToExcel = exportPayrollToExcel;
window.exportFullFinancialReport = exportFullFinancialReport;

console.log('Excel Export module loaded');
