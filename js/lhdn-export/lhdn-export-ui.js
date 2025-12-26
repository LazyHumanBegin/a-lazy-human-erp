/**
 * EZCubic ERP - LHDN Export UI Module
 * Initialization, rendering, export functions
 * Version: 2.3.0 - Split from lhdn-export.js
 */

// ==================== INITIALIZATION ====================

function initializeLHDNExport() {
    const content = document.getElementById('lhdnExportContent');
    if (!content) return;
    
    let currentUser = JSON.parse(localStorage.getItem('ezcubic_current_user'));
    if (!currentUser) {
        currentUser = JSON.parse(localStorage.getItem('currentUser'));
    }
    
    if (!currentUser) {
        content.innerHTML = `
            <div class="content-card full-width" style="text-align: center; padding: 60px 40px;">
                <i class="fas fa-lock" style="font-size: 48px; color: #94a3b8; margin-bottom: 16px;"></i>
                <h3 style="color: #64748b; margin-bottom: 10px;">Please Log In</h3>
                <p style="color: #94a3b8;">You need to log in to access LHDN & Audit Export.</p>
            </div>
        `;
        return;
    }
    
    const userRole = (currentUser.role || '').toLowerCase().replace(/\s+/g, '_');
    const isFounder = currentUser.isFounder === true || 
                      currentUser.id === 'founder_001' || 
                      currentUser.email === 'founder@ezcubic.com' ||
                      userRole === 'founder';
    const isBusinessAdmin = userRole === 'business_admin';
    const hasManagerPermission = userRole === 'manager' && 
        currentUser.permissions && 
        currentUser.permissions.includes('lhdn-export');
    
    if (!isFounder && !isBusinessAdmin && !hasManagerPermission) {
        content.innerHTML = `
            <div class="content-card full-width" style="text-align: center; padding: 60px 40px;">
                <i class="fas fa-ban" style="font-size: 48px; color: #ef4444; margin-bottom: 16px;"></i>
                <h3 style="color: #1e293b; margin-bottom: 10px;">Access Denied</h3>
                <p style="color: #64748b; margin-bottom: 15px;">
                    LHDN & Audit Export is only available for Founder, Business Admin, or Managers with permission.
                </p>
            </div>
        `;
        return;
    }
    
    const userPlan = (currentUser.plan || 'personal').toLowerCase();
    const allowedPlans = ['starter', 'business', 'professional', 'enterprise'];
    const hasPlanAccess = isFounder || allowedPlans.includes(userPlan);
    
    if (!hasPlanAccess) {
        content.innerHTML = `
            <div class="content-card full-width" style="text-align: center; padding: 60px 40px;">
                <i class="fas fa-crown" style="font-size: 48px; color: #f59e0b; margin-bottom: 16px;"></i>
                <h3 style="color: #1e293b; margin-bottom: 10px;">Upgrade Required</h3>
                <p style="color: #64748b;">LHDN & Audit Export is available on Starter plan and above.</p>
            </div>
        `;
        return;
    }
    
    renderLHDNExportContent(content);
}

function renderLHDNExportContent(content) {
    const currentYear = new Date().getFullYear();
    
    content.innerHTML = `
        <div class="content-card full-width">
            <div class="card-header">
                <h2><i class="fas fa-file-export"></i> LHDN & Audit Export</h2>
                <div style="display: flex; align-items: center; gap: 10px;">
                    <span style="background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%); 
                                 color: white; padding: 4px 12px; border-radius: 6px; 
                                 font-size: 11px; font-weight: 600;">
                        🔒 ADMIN ACCESS
                    </span>
                    <button class="btn-primary" onclick="exportAnnualPackage()">
                        <i class="fas fa-download"></i> Download Annual Package
                    </button>
                </div>
            </div>
        </div>
        
        <div class="content-card full-width">
            <h3 style="margin: 0 0 15px 0;"><i class="fas fa-bolt" style="color: #f59e0b;"></i> Quick Export</h3>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px;">
                <button onclick="exportAnnualPackage()" class="export-quick-btn">
                    <i class="fas fa-file-archive" style="color: #10b981;"></i>
                    <span>Annual Package</span>
                </button>
                <button onclick="exportIncomeStatement()" class="export-quick-btn">
                    <i class="fas fa-chart-line" style="color: #3b82f6;"></i>
                    <span>Income Statement</span>
                </button>
                <button onclick="exportBalanceSheetReport()" class="export-quick-btn">
                    <i class="fas fa-balance-scale" style="color: #8b5cf6;"></i>
                    <span>Balance Sheet</span>
                </button>
                <button onclick="exportTaxSummary()" class="export-quick-btn">
                    <i class="fas fa-calculator" style="color: #ef4444;"></i>
                    <span>Tax Summary</span>
                </button>
            </div>
        </div>
        
        <div class="content-card full-width">
            <h3 style="margin: 0 0 15px 0;"><i class="fas fa-folder-open" style="color: #3b82f6;"></i> Select Reports</h3>
            <div class="form-row" style="margin-bottom: 20px;">
                <div class="form-group" style="flex: 1;">
                    <label class="form-label">From Date</label>
                    <input type="date" id="lhdnExportFromDate" class="form-control" value="${currentYear}-01-01">
                </div>
                <div class="form-group" style="flex: 1;">
                    <label class="form-label">To Date</label>
                    <input type="date" id="lhdnExportToDate" class="form-control" value="${currentYear}-12-31">
                </div>
                <div class="form-group" style="flex: 1;">
                    <label class="form-label">Format</label>
                    <select id="lhdnExportFormat" class="form-control">
                        <option value="pdf">PDF</option>
                        <option value="excel">Excel</option>
                        <option value="csv">CSV</option>
                    </select>
                </div>
            </div>
            
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 15px; margin-bottom: 20px;">
                <div class="report-category">
                    <h4><i class="fas fa-file-invoice-dollar" style="color: #10b981;"></i> Financial Statements</h4>
                    <label class="report-checkbox"><input type="checkbox" id="chkIncomeStatement" checked><span>Income Statement</span></label>
                    <label class="report-checkbox"><input type="checkbox" id="chkBalanceSheet" checked><span>Balance Sheet</span></label>
                    <label class="report-checkbox"><input type="checkbox" id="chkCashFlow"><span>Cash Flow Statement</span></label>
                    <label class="report-checkbox"><input type="checkbox" id="chkEquityStatement"><span>Changes in Equity</span></label>
                </div>
                
                <div class="report-category">
                    <h4><i class="fas fa-landmark" style="color: #ef4444;"></i> Tax Reports (LHDN)</h4>
                    <label class="report-checkbox"><input type="checkbox" id="chkTaxSummary" checked><span>Tax Summary</span></label>
                    <label class="report-checkbox"><input type="checkbox" id="chkTaxDeductions"><span>Tax Deductions</span></label>
                    <label class="report-checkbox"><input type="checkbox" id="chkCapitalAllowance"><span>Capital Allowance</span></label>
                    <label class="report-checkbox"><input type="checkbox" id="chkSSTReport"><span>SST/Service Tax</span></label>
                </div>
                
                <div class="report-category">
                    <h4><i class="fas fa-list-alt" style="color: #3b82f6;"></i> Transaction Reports</h4>
                    <label class="report-checkbox"><input type="checkbox" id="chkGeneralLedger" checked><span>General Ledger</span></label>
                    <label class="report-checkbox"><input type="checkbox" id="chkTrialBalance"><span>Trial Balance</span></label>
                    <label class="report-checkbox"><input type="checkbox" id="chkIncomeDetail"><span>Income Detail</span></label>
                    <label class="report-checkbox"><input type="checkbox" id="chkExpenseDetail"><span>Expense Detail</span></label>
                </div>
                
                <div class="report-category">
                    <h4><i class="fas fa-clipboard-check" style="color: #8b5cf6;"></i> Audit Documents</h4>
                    <label class="report-checkbox"><input type="checkbox" id="chkAuditTrail"><span>Audit Trail</span></label>
                    <label class="report-checkbox"><input type="checkbox" id="chkBankReconciliation"><span>Bank Reconciliation</span></label>
                    <label class="report-checkbox"><input type="checkbox" id="chkAgedReceivables"><span>Aged Receivables</span></label>
                    <label class="report-checkbox"><input type="checkbox" id="chkAgedPayables"><span>Aged Payables</span></label>
                </div>
            </div>
            
            <div style="text-align: center;">
                <button onclick="exportSelectedReports()" class="btn-primary" style="padding: 12px 30px;">
                    <i class="fas fa-download"></i> Export Selected Reports
                </button>
            </div>
        </div>
        
        <div class="content-card full-width">
            <h3 style="margin: 0 0 15px 0;"><i class="fas fa-history" style="color: #64748b;"></i> Recent Exports</h3>
            <div id="exportHistoryList">${renderExportHistory()}</div>
        </div>
    `;
}

// ==================== EXPORT FUNCTIONS ====================

function exportAnnualPackage() {
    const currentYear = new Date().getFullYear();
    const fromDate = `${currentYear}-01-01`;
    const toDate = `${currentYear}-12-31`;
    
    showToast('Generating Annual Package...', 'info');
    
    const reports = {
        incomeStatement: generateIncomeStatement(fromDate, toDate),
        balanceSheet: generateBalanceSheetData(),
        taxSummary: generateTaxSummary(fromDate, toDate),
        generalLedger: generateGeneralLedger(fromDate, toDate),
        auditTrail: generateAuditTrailData(fromDate, toDate)
    };
    
    generateAnnualPackagePDF(reports, currentYear);
    saveExportHistory('Annual Package', currentYear, 'PDF');
}

function exportIncomeStatement() {
    const fromDate = document.getElementById('lhdnExportFromDate')?.value || `${new Date().getFullYear()}-01-01`;
    const toDate = document.getElementById('lhdnExportToDate')?.value || `${new Date().getFullYear()}-12-31`;
    const format = document.getElementById('lhdnExportFormat')?.value || 'pdf';
    
    const data = generateIncomeStatement(fromDate, toDate);
    
    if (format === 'pdf') {
        generateIncomeStatementPDF(data, fromDate, toDate);
    } else {
        generateIncomeStatementCSV(data, fromDate, toDate);
    }
    
    saveExportHistory('Income Statement', `${fromDate} to ${toDate}`, format.toUpperCase());
    showToast('Income Statement exported!', 'success');
}

function exportBalanceSheetReport() {
    const format = document.getElementById('lhdnExportFormat')?.value || 'pdf';
    const data = generateBalanceSheetData();
    
    if (format === 'pdf') {
        generateBalanceSheetPDF(data);
    } else {
        generateBalanceSheetCSV(data);
    }
    
    saveExportHistory('Balance Sheet', new Date().toLocaleDateString(), format.toUpperCase());
    showToast('Balance Sheet exported!', 'success');
}

function exportTaxSummary() {
    const fromDate = document.getElementById('lhdnExportFromDate')?.value || `${new Date().getFullYear()}-01-01`;
    const toDate = document.getElementById('lhdnExportToDate')?.value || `${new Date().getFullYear()}-12-31`;
    const format = document.getElementById('lhdnExportFormat')?.value || 'pdf';
    
    const data = generateTaxSummary(fromDate, toDate);
    
    if (format === 'pdf') {
        generateTaxSummaryPDF(data, fromDate, toDate);
    } else {
        generateTaxSummaryCSV(data, fromDate, toDate);
    }
    
    saveExportHistory('Tax Summary', `${fromDate} to ${toDate}`, format.toUpperCase());
    showToast('Tax Summary exported!', 'success');
}

function exportSelectedReports() {
    const fromDate = document.getElementById('lhdnExportFromDate')?.value;
    const toDate = document.getElementById('lhdnExportToDate')?.value;
    const format = document.getElementById('lhdnExportFormat')?.value || 'pdf';
    
    const selectedReports = [];
    
    if (document.getElementById('chkIncomeStatement')?.checked) selectedReports.push('Income Statement');
    if (document.getElementById('chkBalanceSheet')?.checked) selectedReports.push('Balance Sheet');
    if (document.getElementById('chkCashFlow')?.checked) selectedReports.push('Cash Flow Statement');
    if (document.getElementById('chkEquityStatement')?.checked) selectedReports.push('Statement of Changes in Equity');
    if (document.getElementById('chkTaxSummary')?.checked) selectedReports.push('Tax Summary');
    if (document.getElementById('chkTaxDeductions')?.checked) selectedReports.push('Tax Deductions');
    if (document.getElementById('chkCapitalAllowance')?.checked) selectedReports.push('Capital Allowance');
    if (document.getElementById('chkSSTReport')?.checked) selectedReports.push('SST Report');
    if (document.getElementById('chkGeneralLedger')?.checked) selectedReports.push('General Ledger');
    if (document.getElementById('chkTrialBalance')?.checked) selectedReports.push('Trial Balance');
    if (document.getElementById('chkIncomeDetail')?.checked) selectedReports.push('Income Detail');
    if (document.getElementById('chkExpenseDetail')?.checked) selectedReports.push('Expense Detail');
    if (document.getElementById('chkAuditTrail')?.checked) selectedReports.push('Audit Trail');
    if (document.getElementById('chkBankReconciliation')?.checked) selectedReports.push('Bank Reconciliation');
    if (document.getElementById('chkAgedReceivables')?.checked) selectedReports.push('Aged Receivables');
    if (document.getElementById('chkAgedPayables')?.checked) selectedReports.push('Aged Payables');
    
    if (selectedReports.length === 0) {
        showToast('Please select at least one report', 'error');
        return;
    }
    
    showToast(`Generating ${selectedReports.length} reports...`, 'info');
    generateCombinedExport(selectedReports, fromDate, toDate, format);
    saveExportHistory(`${selectedReports.length} Reports`, `${fromDate} to ${toDate}`, format.toUpperCase());
}

function exportGeneralLedger(fromDate, toDate, format) {
    const data = generateGeneralLedger(fromDate, toDate);
    
    let csv = 'General Ledger\n';
    csv += `Period: ${fromDate} to ${toDate}\n\n`;
    csv += 'Date,Reference,Description,Type,Category,Amount (RM)\n';
    
    data.forEach(tx => {
        csv += `${tx.date},"${tx.reference || ''}","${(tx.description || '').replace(/"/g, '""')}",${tx.type},${tx.category || ''},${parseFloat(tx.amount).toFixed(2)}\n`;
    });
    
    downloadCSVFile(csv, `General_Ledger_${fromDate}_${toDate}.csv`);
    showToast('General Ledger exported!', 'success');
}

function exportAuditTrailReport(fromDate, toDate, format) {
    const data = generateAuditTrailData(fromDate, toDate);
    
    let csv = 'Audit Trail Log\n';
    csv += `Period: ${fromDate} to ${toDate}\n\n`;
    csv += 'Timestamp,User,Action,Module,Record ID,Description\n';
    
    data.forEach(log => {
        csv += `${log.timestamp},"${log.user || 'System'}",${log.action},"${log.module || ''}","${log.recordId || ''}","${(log.description || '').replace(/"/g, '""')}"\n`;
    });
    
    downloadCSVFile(csv, `Audit_Trail_${fromDate}_${toDate}.csv`);
    showToast('Audit Trail exported!', 'success');
}

// ==================== PDF GENERATION ====================

function generateAnnualPackagePDF(reports, year) {
    const businessName = businessData?.settings?.businessName || 'EZCubic Business';
    
    let content = `
ANNUAL FINANCIAL PACKAGE
${businessName}
Assessment Year: ${year}
Generated: ${new Date().toLocaleString('en-MY')}

${'='.repeat(60)}

INCOME STATEMENT (PROFIT & LOSS)
${'='.repeat(60)}

REVENUE
${Object.entries(reports.incomeStatement.incomeByCategory).map(([cat, amt]) => 
    `  ${cat.padEnd(40)} RM ${amt.toLocaleString('en-MY', {minimumFractionDigits: 2})}`
).join('\n')}
${'─'.repeat(60)}
Total Revenue                                    RM ${reports.incomeStatement.totalIncome.toLocaleString('en-MY', {minimumFractionDigits: 2})}

EXPENSES
${Object.entries(reports.incomeStatement.expenseByCategory).map(([cat, amt]) => 
    `  ${cat.padEnd(40)} RM ${amt.toLocaleString('en-MY', {minimumFractionDigits: 2})}`
).join('\n')}
${'─'.repeat(60)}
Total Expenses                                   RM ${reports.incomeStatement.totalExpenses.toLocaleString('en-MY', {minimumFractionDigits: 2})}

${'='.repeat(60)}
NET PROFIT/(LOSS)                                RM ${reports.incomeStatement.netProfit.toLocaleString('en-MY', {minimumFractionDigits: 2})}
${'='.repeat(60)}

TAX SUMMARY
${'─'.repeat(60)}
Gross Income:           RM ${reports.taxSummary.grossIncome.toLocaleString('en-MY', {minimumFractionDigits: 2})}
Allowable Deductions:   RM ${reports.taxSummary.allowableDeductions.toLocaleString('en-MY', {minimumFractionDigits: 2})}
Taxable Income:         RM ${reports.taxSummary.taxableIncome.toLocaleString('en-MY', {minimumFractionDigits: 2})}
Estimated Tax:          RM ${reports.taxSummary.estimatedTax.toLocaleString('en-MY', {minimumFractionDigits: 2})}
Effective Tax Rate:     ${reports.taxSummary.effectiveRate}%

GENERAL LEDGER SUMMARY
${'─'.repeat(60)}
Total Transactions: ${reports.generalLedger.length}
`;

    downloadTextFile(content, `Annual_Package_${year}_${businessName.replace(/\s+/g, '_')}.txt`);
}

function generateIncomeStatementPDF(data, fromDate, toDate) {
    const businessName = businessData?.settings?.businessName || 'EZCubic Business';
    
    let content = `
INCOME STATEMENT (PROFIT & LOSS)
${businessName}
Period: ${fromDate} to ${toDate}

${'='.repeat(60)}

REVENUE
${Object.entries(data.incomeByCategory).map(([cat, amt]) => 
    `${cat.padEnd(45)} RM ${amt.toLocaleString('en-MY', {minimumFractionDigits: 2})}`
).join('\n')}
${'─'.repeat(60)}
TOTAL REVENUE                                    RM ${data.totalIncome.toLocaleString('en-MY', {minimumFractionDigits: 2})}

EXPENSES
${Object.entries(data.expenseByCategory).map(([cat, amt]) => 
    `${cat.padEnd(45)} RM ${amt.toLocaleString('en-MY', {minimumFractionDigits: 2})}`
).join('\n')}
${'─'.repeat(60)}
TOTAL EXPENSES                                   RM ${data.totalExpenses.toLocaleString('en-MY', {minimumFractionDigits: 2})}

${'='.repeat(60)}
NET PROFIT/(LOSS)                                RM ${data.netProfit.toLocaleString('en-MY', {minimumFractionDigits: 2})}
`;

    downloadTextFile(content, `Income_Statement_${fromDate}_${toDate}.txt`);
}

function generateIncomeStatementCSV(data, fromDate, toDate) {
    let csv = 'Income Statement\n';
    csv += `Period: ${fromDate} to ${toDate}\n\n`;
    csv += 'Category,Type,Amount (RM)\n';
    
    Object.entries(data.incomeByCategory).forEach(([cat, amt]) => {
        csv += `"${cat}",Income,${amt.toFixed(2)}\n`;
    });
    
    Object.entries(data.expenseByCategory).forEach(([cat, amt]) => {
        csv += `"${cat}",Expense,${amt.toFixed(2)}\n`;
    });
    
    csv += `\nSummary\n`;
    csv += `Total Income,,${data.totalIncome.toFixed(2)}\n`;
    csv += `Total Expenses,,${data.totalExpenses.toFixed(2)}\n`;
    csv += `Net Profit,,${data.netProfit.toFixed(2)}\n`;
    
    downloadCSVFile(csv, `Income_Statement_${fromDate}_${toDate}.csv`);
}

function generateBalanceSheetPDF(data) {
    const businessName = businessData?.settings?.businessName || 'EZCubic Business';
    
    let content = `
BALANCE SHEET
${businessName}
As at: ${new Date().toLocaleDateString('en-MY')}

ASSETS
  Cash in Hand                                   RM ${data.assets.cash.toLocaleString('en-MY', {minimumFractionDigits: 2})}
  Bank Balance                                   RM ${data.assets.bank.toLocaleString('en-MY', {minimumFractionDigits: 2})}
  Accounts Receivable                            RM ${data.assets.accountsReceivable.toLocaleString('en-MY', {minimumFractionDigits: 2})}
  Inventory                                      RM ${data.assets.inventory.toLocaleString('en-MY', {minimumFractionDigits: 2})}
  Fixed Assets                                   RM ${data.assets.fixedAssets.toLocaleString('en-MY', {minimumFractionDigits: 2})}
TOTAL ASSETS                                     RM ${data.assets.totalAssets.toLocaleString('en-MY', {minimumFractionDigits: 2})}

LIABILITIES
  Accounts Payable                               RM ${data.liabilities.accountsPayable.toLocaleString('en-MY', {minimumFractionDigits: 2})}
  Credit Cards                                   RM ${data.liabilities.creditCards.toLocaleString('en-MY', {minimumFractionDigits: 2})}
  Loans Payable                                  RM ${data.liabilities.loans.toLocaleString('en-MY', {minimumFractionDigits: 2})}
TOTAL LIABILITIES                                RM ${data.liabilities.totalLiabilities.toLocaleString('en-MY', {minimumFractionDigits: 2})}

EQUITY
  Capital                                        RM ${data.equity.capital.toLocaleString('en-MY', {minimumFractionDigits: 2})}
  Retained Earnings                              RM ${data.equity.retainedEarnings.toLocaleString('en-MY', {minimumFractionDigits: 2})}
TOTAL EQUITY                                     RM ${data.equity.totalEquity.toLocaleString('en-MY', {minimumFractionDigits: 2})}
`;

    downloadTextFile(content, `Balance_Sheet_${new Date().toISOString().split('T')[0]}.txt`);
}

function generateBalanceSheetCSV(data) {
    let csv = 'Balance Sheet\n';
    csv += `As at: ${new Date().toLocaleDateString('en-MY')}\n\n`;
    csv += 'Account,Category,Amount (RM)\n';
    csv += 'Cash in Hand,Assets,' + data.assets.cash.toFixed(2) + '\n';
    csv += 'Bank Balance,Assets,' + data.assets.bank.toFixed(2) + '\n';
    csv += 'Accounts Receivable,Assets,' + data.assets.accountsReceivable.toFixed(2) + '\n';
    csv += 'Inventory,Assets,' + data.assets.inventory.toFixed(2) + '\n';
    csv += 'Fixed Assets,Assets,' + data.assets.fixedAssets.toFixed(2) + '\n';
    csv += 'Total Assets,Assets,' + data.assets.totalAssets.toFixed(2) + '\n';
    csv += 'Accounts Payable,Liabilities,' + data.liabilities.accountsPayable.toFixed(2) + '\n';
    csv += 'Credit Cards,Liabilities,' + data.liabilities.creditCards.toFixed(2) + '\n';
    csv += 'Loans,Liabilities,' + data.liabilities.loans.toFixed(2) + '\n';
    csv += 'Total Liabilities,Liabilities,' + data.liabilities.totalLiabilities.toFixed(2) + '\n';
    csv += 'Capital,Equity,' + data.equity.capital.toFixed(2) + '\n';
    csv += 'Retained Earnings,Equity,' + data.equity.retainedEarnings.toFixed(2) + '\n';
    csv += 'Total Equity,Equity,' + data.equity.totalEquity.toFixed(2) + '\n';
    
    downloadCSVFile(csv, `Balance_Sheet_${new Date().toISOString().split('T')[0]}.csv`);
}

function generateTaxSummaryPDF(data, fromDate, toDate) {
    const businessName = businessData?.settings?.businessName || 'EZCubic Business';
    
    let content = `
TAX SUMMARY REPORT
${businessName}
Period: ${fromDate} to ${toDate}

LHDN TAX COMPUTATION
${'─'.repeat(60)}
Gross Income                                     RM ${data.grossIncome.toLocaleString('en-MY', {minimumFractionDigits: 2})}
Less: Allowable Deductions                       RM ${data.allowableDeductions.toLocaleString('en-MY', {minimumFractionDigits: 2})}
TAXABLE INCOME                                   RM ${data.taxableIncome.toLocaleString('en-MY', {minimumFractionDigits: 2})}

ESTIMATED TAX PAYABLE                            RM ${data.estimatedTax.toLocaleString('en-MY', {minimumFractionDigits: 2})}
Effective Tax Rate: ${data.effectiveRate}%
`;

    downloadTextFile(content, `Tax_Summary_${fromDate}_${toDate}.txt`);
}

function generateTaxSummaryCSV(data, fromDate, toDate) {
    let csv = 'Tax Summary Report\n';
    csv += `Period: ${fromDate} to ${toDate}\n\n`;
    csv += 'Item,Amount (RM)\n';
    csv += `Gross Income,${data.grossIncome.toFixed(2)}\n`;
    csv += `Allowable Deductions,${data.allowableDeductions.toFixed(2)}\n`;
    csv += `Taxable Income,${data.taxableIncome.toFixed(2)}\n`;
    csv += `Estimated Tax,${data.estimatedTax.toFixed(2)}\n`;
    csv += `Effective Rate (%),${data.effectiveRate}\n`;
    
    downloadCSVFile(csv, `Tax_Summary_${fromDate}_${toDate}.csv`);
}

function generateCombinedExport(reports, fromDate, toDate, format) {
    reports.forEach((report, index) => {
        setTimeout(() => {
            switch(report) {
                case 'Income Statement': exportIncomeStatement(); break;
                case 'Balance Sheet': exportBalanceSheetReport(); break;
                case 'Tax Summary': exportTaxSummary(); break;
                case 'General Ledger': exportGeneralLedger(fromDate, toDate, format); break;
                case 'Audit Trail': exportAuditTrailReport(fromDate, toDate, format); break;
            }
        }, index * 500);
    });
    
    showToast(`Exporting ${reports.length} reports...`, 'success');
}

// ==================== WINDOW EXPORTS ====================
window.initializeLHDNExport = initializeLHDNExport;
window.renderLHDNExportContent = renderLHDNExportContent;
window.exportAnnualPackage = exportAnnualPackage;
window.exportIncomeStatement = exportIncomeStatement;
window.exportBalanceSheetReport = exportBalanceSheetReport;
window.exportTaxSummary = exportTaxSummary;
window.exportSelectedReports = exportSelectedReports;
window.exportGeneralLedger = exportGeneralLedger;
window.exportAuditTrailReport = exportAuditTrailReport;
