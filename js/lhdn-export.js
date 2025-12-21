/**
 * EZCubic ERP - LHDN & Audit Export Module
 * Comprehensive export for Malaysian tax compliance and auditing
 * Version: 1.0.0 - 19 Dec 2025
 * Plan Access: Starter, Professional, Enterprise (not Personal)
 * Role Access: Founder + Business Admin + Manager (with lhdn-export permission)
 */

// ==================== INITIALIZATION ====================

function initializeLHDNExport() {
    const content = document.getElementById('lhdnExportContent');
    if (!content) return;
    
    // Check access permission
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
    
    // Check role permission
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
                <div style="background: #f8fafc; border-radius: 8px; padding: 12px 20px; display: inline-block;">
                    <span style="color: #94a3b8; font-size: 13px;">Your role: </span>
                    <span style="color: #475569; font-weight: 600;">${currentUser.role || 'Not set'}</span>
                </div>
            </div>
        `;
        return;
    }
    
    // Check plan access (Starter, Business, Professional, Enterprise)
    const userPlan = (currentUser.plan || 'personal').toLowerCase();
    const allowedPlans = ['starter', 'business', 'professional', 'enterprise'];
    const hasPlanAccess = isFounder || allowedPlans.includes(userPlan);
    
    if (!hasPlanAccess) {
        content.innerHTML = `
            <div class="content-card full-width" style="text-align: center; padding: 60px 40px;">
                <i class="fas fa-crown" style="font-size: 48px; color: #f59e0b; margin-bottom: 16px;"></i>
                <h3 style="color: #1e293b; margin-bottom: 10px;">Upgrade Required</h3>
                <p style="color: #64748b; margin-bottom: 15px;">
                    LHDN & Audit Export is available on Starter, Professional, and Enterprise plans.
                </p>
                <div style="background: #fffbeb; border: 1px solid #fcd34d; border-radius: 8px; padding: 16px 24px; margin-bottom: 20px; display: inline-block;">
                    <span style="color: #92400e; font-size: 13px;">Your current plan: </span>
                    <span style="color: #78350f; font-weight: 600; text-transform: capitalize;">${userPlan}</span>
                </div>
                <br>
                <button class="btn-primary" onclick="typeof showUpgradePlanModal === 'function' ? showUpgradePlanModal() : alert('Upgrade feature coming soon!')" style="margin-top: 10px;">
                    <i class="fas fa-arrow-up"></i> Upgrade Plan
                </button>
            </div>
        `;
        return;
    }
    
    // User has access - render the main interface
    renderLHDNExportContent(content);
}

function renderLHDNExportContent(content) {
    const currentYear = new Date().getFullYear();
    
    content.innerHTML = `
        <!-- Header Card -->
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
            <p style="color: #64748b; margin-bottom: 0;">
                <i class="fas fa-info-circle"></i> Generate comprehensive reports for LHDN submission, tax filing, and external audit compliance.
            </p>
        </div>
        
        <!-- Quick Export Buttons -->
        <div class="content-card full-width">
            <h3 style="margin: 0 0 15px 0; color: #1e293b;">
                <i class="fas fa-bolt" style="color: #f59e0b;"></i> Quick Export
            </h3>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px;">
                <button onclick="exportAnnualPackage()" class="export-quick-btn">
                    <i class="fas fa-file-archive" style="color: #10b981;"></i>
                    <span>Annual Package</span>
                    <small>All reports for ${currentYear}</small>
                </button>
                <button onclick="exportIncomeStatement()" class="export-quick-btn">
                    <i class="fas fa-chart-line" style="color: #3b82f6;"></i>
                    <span>Income Statement</span>
                    <small>Profit & Loss</small>
                </button>
                <button onclick="exportBalanceSheetReport()" class="export-quick-btn">
                    <i class="fas fa-balance-scale" style="color: #8b5cf6;"></i>
                    <span>Balance Sheet</span>
                    <small>Financial Position</small>
                </button>
                <button onclick="exportTaxSummary()" class="export-quick-btn">
                    <i class="fas fa-calculator" style="color: #ef4444;"></i>
                    <span>Tax Summary</span>
                    <small>LHDN Report</small>
                </button>
            </div>
        </div>
        
        <!-- Report Selection -->
        <div class="content-card full-width">
            <h3 style="margin: 0 0 15px 0; color: #1e293b;">
                <i class="fas fa-folder-open" style="color: #3b82f6;"></i> Select Reports to Export
            </h3>
            
            <!-- Date Range & Format -->
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
                    <label class="form-label">Export Format</label>
                    <select id="lhdnExportFormat" class="form-control">
                        <option value="pdf">PDF Document</option>
                        <option value="excel">Excel Spreadsheet</option>
                        <option value="csv">CSV (Data Only)</option>
                    </select>
                </div>
            </div>
            
            <!-- Report Categories -->
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 15px; margin-bottom: 20px;">
                
                <!-- Financial Statements -->
                <div class="report-category">
                    <h4><i class="fas fa-file-invoice-dollar" style="color: #10b981;"></i> Financial Statements</h4>
                    <label class="report-checkbox">
                        <input type="checkbox" id="chkIncomeStatement" checked>
                        <span>Income Statement (P&L)</span>
                    </label>
                    <label class="report-checkbox">
                        <input type="checkbox" id="chkBalanceSheet" checked>
                        <span>Balance Sheet</span>
                    </label>
                    <label class="report-checkbox">
                        <input type="checkbox" id="chkCashFlow">
                        <span>Cash Flow Statement</span>
                    </label>
                    <label class="report-checkbox">
                        <input type="checkbox" id="chkEquityStatement">
                        <span>Changes in Equity</span>
                    </label>
                </div>
                
                <!-- Tax Reports -->
                <div class="report-category">
                    <h4><i class="fas fa-landmark" style="color: #ef4444;"></i> Tax Reports (LHDN)</h4>
                    <label class="report-checkbox">
                        <input type="checkbox" id="chkTaxSummary" checked>
                        <span>Tax Summary Report</span>
                    </label>
                    <label class="report-checkbox">
                        <input type="checkbox" id="chkTaxDeductions">
                        <span>Tax Deductions</span>
                    </label>
                    <label class="report-checkbox">
                        <input type="checkbox" id="chkCapitalAllowance">
                        <span>Capital Allowance</span>
                    </label>
                    <label class="report-checkbox">
                        <input type="checkbox" id="chkSSTReport">
                        <span>SST/Service Tax</span>
                    </label>
                </div>
                
                <!-- Transaction Reports -->
                <div class="report-category">
                    <h4><i class="fas fa-list-alt" style="color: #3b82f6;"></i> Transaction Reports</h4>
                    <label class="report-checkbox">
                        <input type="checkbox" id="chkGeneralLedger" checked>
                        <span>General Ledger</span>
                    </label>
                    <label class="report-checkbox">
                        <input type="checkbox" id="chkTrialBalance">
                        <span>Trial Balance</span>
                    </label>
                    <label class="report-checkbox">
                        <input type="checkbox" id="chkIncomeDetail">
                        <span>Income Detail</span>
                    </label>
                    <label class="report-checkbox">
                        <input type="checkbox" id="chkExpenseDetail">
                        <span>Expense Detail</span>
                    </label>
                </div>
                
                <!-- Audit Documents -->
                <div class="report-category">
                    <h4><i class="fas fa-clipboard-check" style="color: #8b5cf6;"></i> Audit Documents</h4>
                    <label class="report-checkbox">
                        <input type="checkbox" id="chkAuditTrail">
                        <span>Audit Trail Log</span>
                    </label>
                    <label class="report-checkbox">
                        <input type="checkbox" id="chkBankReconciliation">
                        <span>Bank Reconciliation</span>
                    </label>
                    <label class="report-checkbox">
                        <input type="checkbox" id="chkAgedReceivables">
                        <span>Aged Receivables</span>
                    </label>
                    <label class="report-checkbox">
                        <input type="checkbox" id="chkAgedPayables">
                        <span>Aged Payables</span>
                    </label>
                </div>
            </div>
            
            <!-- Export Button -->
            <div style="text-align: center;">
                <button onclick="exportSelectedReports()" class="btn-primary" style="padding: 12px 30px;">
                    <i class="fas fa-download"></i> Export Selected Reports
                </button>
            </div>
        </div>
        
        <!-- Export History -->
        <div class="content-card full-width">
            <h3 style="margin: 0 0 15px 0; color: #1e293b;">
                <i class="fas fa-history" style="color: #64748b;"></i> Recent Exports
            </h3>
            <div id="exportHistoryList">
                ${renderExportHistory()}
            </div>
        </div>
        
        <!-- LHDN Guidelines -->
        <div class="content-card full-width" style="background: linear-gradient(135deg, #fefce8, #fef9c3); border: 1px solid #facc15;">
            <h3 style="margin: 0 0 15px 0; color: #854d0e;">
                <i class="fas fa-info-circle"></i> LHDN Filing Guidelines
            </h3>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; color: #713f12; font-size: 13px;">
                <div>
                    <h5 style="margin: 0 0 8px 0;"><i class="fas fa-calendar-alt"></i> Filing Deadlines</h5>
                    <ul style="margin: 0; padding-left: 18px;">
                        <li>Form BE (Individual): 30 April</li>
                        <li>Form B (Business): 30 June</li>
                        <li>Form C (Company): 7 months after FY end</li>
                    </ul>
                </div>
                <div>
                    <h5 style="margin: 0 0 8px 0;"><i class="fas fa-file-alt"></i> Required Documents</h5>
                    <ul style="margin: 0; padding-left: 18px;">
                        <li>Income Statement</li>
                        <li>Balance Sheet</li>
                        <li>Tax Computation</li>
                    </ul>
                </div>
                <div>
                    <h5 style="margin: 0 0 8px 0;"><i class="fas fa-archive"></i> Record Keeping</h5>
                    <ul style="margin: 0; padding-left: 18px;">
                        <li>Keep records for 7 years</li>
                        <li>Maintain audit trail</li>
                        <li>Store in accessible format</li>
                    </ul>
                </div>
            </div>
            <div style="margin-top: 12px; text-align: center;">
                <a href="https://www.hasil.gov.my" target="_blank" style="color: #854d0e; font-weight: 600; text-decoration: none;">
                    <i class="fas fa-external-link-alt"></i> Visit LHDN Official Website
                </a>
            </div>
        </div>
    `;
}

// ==================== EXPORT FUNCTIONS ====================

function exportAnnualPackage() {
    const currentYear = new Date().getFullYear();
    const fromDate = `${currentYear}-01-01`;
    const toDate = `${currentYear}-12-31`;
    
    showToast('Generating Annual Package...', 'info');
    
    // Generate all reports
    const reports = {
        incomeStatement: generateIncomeStatement(fromDate, toDate),
        balanceSheet: generateBalanceSheetData(),
        taxSummary: generateTaxSummary(fromDate, toDate),
        generalLedger: generateGeneralLedger(fromDate, toDate),
        auditTrail: generateAuditTrailData(fromDate, toDate)
    };
    
    // Create combined PDF
    generateAnnualPackagePDF(reports, currentYear);
    
    // Record in history
    saveExportHistory('Annual Package', currentYear, 'PDF');
}

function exportIncomeStatement() {
    const fromDate = document.getElementById('lhdnExportFromDate')?.value || `${new Date().getFullYear()}-01-01`;
    const toDate = document.getElementById('lhdnExportToDate')?.value || `${new Date().getFullYear()}-12-31`;
    const format = document.getElementById('lhdnExportFormat')?.value || 'pdf';
    
    const data = generateIncomeStatement(fromDate, toDate);
    
    if (format === 'pdf') {
        generateIncomeStatementPDF(data, fromDate, toDate);
    } else if (format === 'excel' || format === 'csv') {
        generateIncomeStatementCSV(data, fromDate, toDate);
    }
    
    saveExportHistory('Income Statement', `${fromDate} to ${toDate}`, format.toUpperCase());
    showToast('Income Statement exported successfully!', 'success');
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
    showToast('Balance Sheet exported successfully!', 'success');
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
    showToast('Tax Summary exported successfully!', 'success');
}

function exportSelectedReports() {
    const fromDate = document.getElementById('lhdnExportFromDate')?.value;
    const toDate = document.getElementById('lhdnExportToDate')?.value;
    const format = document.getElementById('lhdnExportFormat')?.value || 'pdf';
    
    const selectedReports = [];
    
    // Check which reports are selected
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
        showToast('Please select at least one report to export', 'error');
        return;
    }
    
    showToast(`Generating ${selectedReports.length} reports...`, 'info');
    
    // Generate combined export
    generateCombinedExport(selectedReports, fromDate, toDate, format);
    
    saveExportHistory(`${selectedReports.length} Reports`, `${fromDate} to ${toDate}`, format.toUpperCase());
}

// ==================== DATA GENERATION ====================

function generateIncomeStatement(fromDate, toDate) {
    const transactions = (businessData?.transactions || window.transactions || []).filter(tx => {
        const txDate = new Date(tx.date);
        return txDate >= new Date(fromDate) && txDate <= new Date(toDate);
    });
    
    // Calculate totals
    let totalIncome = 0;
    let totalExpenses = 0;
    const incomeByCategory = {};
    const expenseByCategory = {};
    
    transactions.forEach(tx => {
        const amount = parseFloat(tx.amount) || 0;
        const category = tx.category || 'Uncategorized';
        
        if (tx.type === 'income' || tx.type === 'inflow') {
            totalIncome += amount;
            incomeByCategory[category] = (incomeByCategory[category] || 0) + amount;
        } else if (tx.type === 'expense' || tx.type === 'outflow') {
            totalExpenses += amount;
            expenseByCategory[category] = (expenseByCategory[category] || 0) + amount;
        }
    });
    
    return {
        totalIncome,
        totalExpenses,
        netProfit: totalIncome - totalExpenses,
        incomeByCategory,
        expenseByCategory,
        transactionCount: transactions.length
    };
}

function generateBalanceSheetData() {
    const transactions = businessData?.transactions || window.transactions || [];
    const manualBalances = window.manualBalances || JSON.parse(localStorage.getItem('ezcubic_manual_balances') || '{}');
    
    let totalIncome = 0;
    let totalExpenses = 0;
    
    transactions.forEach(tx => {
        const amount = parseFloat(tx.amount) || 0;
        if (tx.type === 'income' || tx.type === 'inflow') {
            totalIncome += amount;
        } else {
            totalExpenses += amount;
        }
    });
    
    const retainedEarnings = totalIncome - totalExpenses;
    
    return {
        assets: {
            cash: manualBalances.cash || 0,
            bank: manualBalances.bank || 0,
            accountsReceivable: manualBalances.accountsReceivable || 0,
            inventory: manualBalances.inventory || 0,
            fixedAssets: manualBalances.fixedAssets || 0,
            totalAssets: (manualBalances.cash || 0) + (manualBalances.bank || 0) + 
                        (manualBalances.accountsReceivable || 0) + (manualBalances.inventory || 0) + 
                        (manualBalances.fixedAssets || 0)
        },
        liabilities: {
            accountsPayable: manualBalances.accountsPayable || 0,
            loans: manualBalances.loans || 0,
            creditCards: manualBalances.creditCards || 0,
            totalLiabilities: (manualBalances.accountsPayable || 0) + (manualBalances.loans || 0) + 
                             (manualBalances.creditCards || 0)
        },
        equity: {
            capital: manualBalances.capital || 0,
            retainedEarnings: retainedEarnings,
            totalEquity: (manualBalances.capital || 0) + retainedEarnings
        }
    };
}

function generateTaxSummary(fromDate, toDate) {
    const incomeData = generateIncomeStatement(fromDate, toDate);
    
    // Malaysian tax calculation (simplified)
    const taxableIncome = incomeData.netProfit;
    let estimatedTax = 0;
    
    // Progressive tax rates for individuals (simplified)
    if (taxableIncome <= 5000) {
        estimatedTax = 0;
    } else if (taxableIncome <= 20000) {
        estimatedTax = (taxableIncome - 5000) * 0.01;
    } else if (taxableIncome <= 35000) {
        estimatedTax = 150 + (taxableIncome - 20000) * 0.03;
    } else if (taxableIncome <= 50000) {
        estimatedTax = 600 + (taxableIncome - 35000) * 0.06;
    } else if (taxableIncome <= 70000) {
        estimatedTax = 1500 + (taxableIncome - 50000) * 0.11;
    } else if (taxableIncome <= 100000) {
        estimatedTax = 3700 + (taxableIncome - 70000) * 0.19;
    } else {
        estimatedTax = 9400 + (taxableIncome - 100000) * 0.24;
    }
    
    return {
        grossIncome: incomeData.totalIncome,
        allowableDeductions: incomeData.totalExpenses,
        taxableIncome: taxableIncome,
        estimatedTax: Math.max(0, estimatedTax),
        effectiveRate: taxableIncome > 0 ? (estimatedTax / taxableIncome * 100).toFixed(2) : 0
    };
}

function generateGeneralLedger(fromDate, toDate) {
    const transactions = (businessData?.transactions || window.transactions || []).filter(tx => {
        const txDate = new Date(tx.date);
        return txDate >= new Date(fromDate) && txDate <= new Date(toDate);
    });
    
    return transactions.sort((a, b) => new Date(a.date) - new Date(b.date));
}

function generateAuditTrailData(fromDate, toDate) {
    const auditLogs = JSON.parse(localStorage.getItem('ezcubic_audit_logs') || '[]');
    
    return auditLogs.filter(log => {
        const logDate = new Date(log.timestamp);
        return logDate >= new Date(fromDate) && logDate <= new Date(toDate);
    });
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


${'='.repeat(60)}
TAX SUMMARY (LHDN)
${'='.repeat(60)}

Gross Income:           RM ${reports.taxSummary.grossIncome.toLocaleString('en-MY', {minimumFractionDigits: 2})}
Allowable Deductions:   RM ${reports.taxSummary.allowableDeductions.toLocaleString('en-MY', {minimumFractionDigits: 2})}
${'─'.repeat(60)}
Taxable Income:         RM ${reports.taxSummary.taxableIncome.toLocaleString('en-MY', {minimumFractionDigits: 2})}
Estimated Tax:          RM ${reports.taxSummary.estimatedTax.toLocaleString('en-MY', {minimumFractionDigits: 2})}
Effective Tax Rate:     ${reports.taxSummary.effectiveRate}%

* Tax calculation is based on Malaysian individual progressive rates.
* Please consult a tax professional for accurate assessment.


${'='.repeat(60)}
GENERAL LEDGER SUMMARY
${'='.repeat(60)}

Total Transactions: ${reports.generalLedger.length}
Period: ${year}-01-01 to ${year}-12-31

${'─'.repeat(60)}
Date          Type      Category              Amount
${'─'.repeat(60)}
${reports.generalLedger.slice(0, 50).map(tx => 
    `${tx.date}    ${(tx.type || '').padEnd(8)}  ${(tx.category || '').substring(0, 20).padEnd(20)}  RM ${parseFloat(tx.amount).toLocaleString('en-MY', {minimumFractionDigits: 2})}`
).join('\n')}
${reports.generalLedger.length > 50 ? `\n... and ${reports.generalLedger.length - 50} more transactions` : ''}


${'='.repeat(60)}
END OF ANNUAL PACKAGE
${'='.repeat(60)}

This report was generated by EZCubic ERP System.
For official tax filing, please verify all figures with supporting documents.
`;

    downloadTextFile(content, `Annual_Package_${year}_${businessName.replace(/\s+/g, '_')}.txt`);
}

function generateIncomeStatementPDF(data, fromDate, toDate) {
    const businessName = businessData?.settings?.businessName || 'EZCubic Business';
    
    let content = `
INCOME STATEMENT (PROFIT & LOSS)
${businessName}
Period: ${fromDate} to ${toDate}
Generated: ${new Date().toLocaleString('en-MY')}

${'='.repeat(60)}

REVENUE
${'─'.repeat(60)}
${Object.entries(data.incomeByCategory).map(([cat, amt]) => 
    `${cat.padEnd(45)} RM ${amt.toLocaleString('en-MY', {minimumFractionDigits: 2})}`
).join('\n')}
${'─'.repeat(60)}
TOTAL REVENUE                                    RM ${data.totalIncome.toLocaleString('en-MY', {minimumFractionDigits: 2})}

EXPENSES
${'─'.repeat(60)}
${Object.entries(data.expenseByCategory).map(([cat, amt]) => 
    `${cat.padEnd(45)} RM ${amt.toLocaleString('en-MY', {minimumFractionDigits: 2})}`
).join('\n')}
${'─'.repeat(60)}
TOTAL EXPENSES                                   RM ${data.totalExpenses.toLocaleString('en-MY', {minimumFractionDigits: 2})}

${'='.repeat(60)}
NET PROFIT/(LOSS)                                RM ${data.netProfit.toLocaleString('en-MY', {minimumFractionDigits: 2})}
${'='.repeat(60)}

Total Transactions: ${data.transactionCount}
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
Generated: ${new Date().toLocaleString('en-MY')}

${'='.repeat(60)}

ASSETS
${'─'.repeat(60)}
Current Assets:
  Cash in Hand                                   RM ${data.assets.cash.toLocaleString('en-MY', {minimumFractionDigits: 2})}
  Bank Balance                                   RM ${data.assets.bank.toLocaleString('en-MY', {minimumFractionDigits: 2})}
  Accounts Receivable                            RM ${data.assets.accountsReceivable.toLocaleString('en-MY', {minimumFractionDigits: 2})}
  Inventory                                      RM ${data.assets.inventory.toLocaleString('en-MY', {minimumFractionDigits: 2})}

Non-Current Assets:
  Fixed Assets                                   RM ${data.assets.fixedAssets.toLocaleString('en-MY', {minimumFractionDigits: 2})}
${'─'.repeat(60)}
TOTAL ASSETS                                     RM ${data.assets.totalAssets.toLocaleString('en-MY', {minimumFractionDigits: 2})}

LIABILITIES
${'─'.repeat(60)}
Current Liabilities:
  Accounts Payable                               RM ${data.liabilities.accountsPayable.toLocaleString('en-MY', {minimumFractionDigits: 2})}
  Credit Card Payable                            RM ${data.liabilities.creditCards.toLocaleString('en-MY', {minimumFractionDigits: 2})}

Non-Current Liabilities:
  Loans Payable                                  RM ${data.liabilities.loans.toLocaleString('en-MY', {minimumFractionDigits: 2})}
${'─'.repeat(60)}
TOTAL LIABILITIES                                RM ${data.liabilities.totalLiabilities.toLocaleString('en-MY', {minimumFractionDigits: 2})}

EQUITY
${'─'.repeat(60)}
  Capital                                        RM ${data.equity.capital.toLocaleString('en-MY', {minimumFractionDigits: 2})}
  Retained Earnings                              RM ${data.equity.retainedEarnings.toLocaleString('en-MY', {minimumFractionDigits: 2})}
${'─'.repeat(60)}
TOTAL EQUITY                                     RM ${data.equity.totalEquity.toLocaleString('en-MY', {minimumFractionDigits: 2})}

${'='.repeat(60)}
TOTAL LIABILITIES & EQUITY                       RM ${(data.liabilities.totalLiabilities + data.equity.totalEquity).toLocaleString('en-MY', {minimumFractionDigits: 2})}
${'='.repeat(60)}
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
    csv += 'Total Assets,Assets,' + data.assets.totalAssets.toFixed(2) + '\n\n';
    
    csv += 'Accounts Payable,Liabilities,' + data.liabilities.accountsPayable.toFixed(2) + '\n';
    csv += 'Credit Cards,Liabilities,' + data.liabilities.creditCards.toFixed(2) + '\n';
    csv += 'Loans,Liabilities,' + data.liabilities.loans.toFixed(2) + '\n';
    csv += 'Total Liabilities,Liabilities,' + data.liabilities.totalLiabilities.toFixed(2) + '\n\n';
    
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
Generated: ${new Date().toLocaleString('en-MY')}

${'='.repeat(60)}
LHDN TAX COMPUTATION
${'='.repeat(60)}

Gross Income                                     RM ${data.grossIncome.toLocaleString('en-MY', {minimumFractionDigits: 2})}
Less: Allowable Deductions                       RM ${data.allowableDeductions.toLocaleString('en-MY', {minimumFractionDigits: 2})}
${'─'.repeat(60)}
TAXABLE INCOME                                   RM ${data.taxableIncome.toLocaleString('en-MY', {minimumFractionDigits: 2})}

${'='.repeat(60)}
ESTIMATED TAX PAYABLE                            RM ${data.estimatedTax.toLocaleString('en-MY', {minimumFractionDigits: 2})}
${'='.repeat(60)}

Effective Tax Rate: ${data.effectiveRate}%

${'─'.repeat(60)}
NOTES:
1. Tax computation based on Malaysian individual progressive rates.
2. This is an estimate only. Actual tax may vary.
3. Please consult a licensed tax agent for accurate assessment.
4. Keep all supporting documents for 7 years.
${'─'.repeat(60)}

Malaysian Tax Rates (Individual Resident):
- RM 0 - 5,000:         0%
- RM 5,001 - 20,000:    1%
- RM 20,001 - 35,000:   3%
- RM 35,001 - 50,000:   6%
- RM 50,001 - 70,000:   11%
- RM 70,001 - 100,000:  19%
- Above RM 100,000:     24%
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
    // For simplicity, generate individual exports
    reports.forEach((report, index) => {
        setTimeout(() => {
            switch(report) {
                case 'Income Statement':
                    exportIncomeStatement();
                    break;
                case 'Balance Sheet':
                    exportBalanceSheetReport();
                    break;
                case 'Tax Summary':
                    exportTaxSummary();
                    break;
                case 'General Ledger':
                    exportGeneralLedger(fromDate, toDate, format);
                    break;
                case 'Audit Trail':
                    exportAuditTrailReport(fromDate, toDate, format);
                    break;
                case 'Bank Reconciliation':
                    exportBankReconciliationReport(fromDate, toDate, format);
                    break;
                default:
                    console.log('Report not yet implemented:', report);
            }
        }, index * 500); // Stagger exports
    });
    
    showToast(`Exporting ${reports.length} reports...`, 'success');
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

function exportBankReconciliationReport(fromDate, toDate, format) {
    // Get tenant ID
    const tenantId = typeof getCurrentTenantId === 'function' ? getCurrentTenantId() : 'default';
    
    // Get saved reconciliation history
    const history = JSON.parse(localStorage.getItem(`reconciliation_${tenantId}`) || '[]');
    
    if (history.length === 0) {
        showToast('No Bank Reconciliation records found. Please complete Bank Reconciliation first.', 'warning');
        return;
    }
    
    // Filter by date range
    const filteredHistory = history.filter(record => {
        const recordDate = new Date(record.date);
        return recordDate >= new Date(fromDate) && recordDate <= new Date(toDate);
    });
    
    if (filteredHistory.length === 0) {
        showToast('No Bank Reconciliation records found for the selected period.', 'warning');
        return;
    }
    
    const businessName = businessData?.settings?.businessName || 'EZCubic Business';
    
    let content = `BANK RECONCILIATION REPORT\n`;
    content += `${businessName}\n`;
    content += `Period: ${fromDate} to ${toDate}\n`;
    content += `Generated: ${new Date().toLocaleString('en-MY')}\n\n`;
    content += `${'='.repeat(70)}\n\n`;
    
    filteredHistory.forEach((record, index) => {
        content += `RECONCILIATION #${index + 1}\n`;
        content += `${'─'.repeat(70)}\n`;
        content += `Bank: ${record.bank || 'N/A'}\n`;
        content += `Period: ${record.period || 'N/A'}\n`;
        content += `Date Completed: ${record.date || 'N/A'}\n`;
        content += `Status: ${record.status || 'Completed'}\n\n`;
        
        // Summary
        content += `SUMMARY:\n`;
        content += `  Bank Statement Balance:     RM ${(record.bankBalance || 0).toLocaleString('en-MY', {minimumFractionDigits: 2})}\n`;
        content += `  ERP Balance:                RM ${(record.erpBalance || 0).toLocaleString('en-MY', {minimumFractionDigits: 2})}\n`;
        content += `  Difference:                 RM ${(record.difference || 0).toLocaleString('en-MY', {minimumFractionDigits: 2})}\n`;
        content += `  Matched Transactions:       ${record.matchedCount || 0}\n`;
        content += `  Unmatched Bank Items:       ${record.unmatchedBankCount || 0}\n`;
        content += `  Unmatched ERP Items:        ${record.unmatchedERPCount || 0}\n\n`;
        
        // Matched Items
        if (record.details && record.details.matched && record.details.matched.length > 0) {
            content += `MATCHED TRANSACTIONS:\n`;
            content += `${'─'.repeat(70)}\n`;
            content += `Date          Description                           Amount (RM)\n`;
            content += `${'─'.repeat(70)}\n`;
            record.details.matched.forEach(item => {
                const date = (item.bankItem?.date || item.date || '').substring(0, 10).padEnd(14);
                const desc = (item.bankItem?.description || item.description || '').substring(0, 35).padEnd(38);
                const amt = parseFloat(item.bankItem?.amount || item.amount || 0).toLocaleString('en-MY', {minimumFractionDigits: 2});
                content += `${date}${desc}${amt}\n`;
            });
            content += `\n`;
        }
        
        // Unmatched Bank Items
        if (record.details && record.details.unmatchedBank && record.details.unmatchedBank.length > 0) {
            content += `UNMATCHED BANK STATEMENT ITEMS:\n`;
            content += `${'─'.repeat(70)}\n`;
            record.details.unmatchedBank.forEach(item => {
                const date = (item.date || '').substring(0, 10).padEnd(14);
                const desc = (item.description || '').substring(0, 35).padEnd(38);
                const amt = parseFloat(item.amount || 0).toLocaleString('en-MY', {minimumFractionDigits: 2});
                content += `${date}${desc}${amt}\n`;
            });
            content += `\n`;
        }
        
        // Unmatched ERP Items
        if (record.details && record.details.unmatchedERP && record.details.unmatchedERP.length > 0) {
            content += `UNMATCHED ERP TRANSACTIONS:\n`;
            content += `${'─'.repeat(70)}\n`;
            record.details.unmatchedERP.forEach(item => {
                const date = (item.date || '').substring(0, 10).padEnd(14);
                const desc = (item.description || item.category || '').substring(0, 35).padEnd(38);
                const amt = parseFloat(item.amount || 0).toLocaleString('en-MY', {minimumFractionDigits: 2});
                content += `${date}${desc}${amt}\n`;
            });
            content += `\n`;
        }
        
        content += `\n${'='.repeat(70)}\n\n`;
    });
    
    content += `END OF BANK RECONCILIATION REPORT\n`;
    content += `Total Reconciliations: ${filteredHistory.length}\n`;
    
    downloadTextFile(content, `Bank_Reconciliation_${fromDate}_${toDate}.txt`);
    saveExportHistory('Bank Reconciliation', `${fromDate} to ${toDate}`, 'TXT');
    showToast('Bank Reconciliation Report exported!', 'success');
}

// ==================== UTILITY FUNCTIONS ====================

function downloadTextFile(content, filename) {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function downloadCSVFile(content, filename) {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// ==================== EXPORT HISTORY ====================

function saveExportHistory(reportName, period, format) {
    const history = JSON.parse(localStorage.getItem('ezcubic_export_history') || '[]');
    
    history.unshift({
        id: Date.now(),
        reportName,
        period,
        format,
        timestamp: new Date().toISOString(),
        user: window.currentUser?.name || 'Unknown'
    });
    
    // Keep only last 20 exports
    if (history.length > 20) history.pop();
    
    localStorage.setItem('ezcubic_export_history', JSON.stringify(history));
    
    // Refresh display
    const historyList = document.getElementById('exportHistoryList');
    if (historyList) {
        historyList.innerHTML = renderExportHistory();
    }
}

function renderExportHistory() {
    const history = JSON.parse(localStorage.getItem('ezcubic_export_history') || '[]');
    
    if (history.length === 0) {
        return `
            <div style="text-align: center; padding: 30px; color: #94a3b8;">
                <i class="fas fa-inbox" style="font-size: 36px; margin-bottom: 10px;"></i>
                <p>No exports yet. Generate your first report above!</p>
            </div>
        `;
    }
    
    return `
        <table class="data-table">
            <thead>
                <tr>
                    <th>Report</th>
                    <th>Period</th>
                    <th>Format</th>
                    <th>Date/Time</th>
                    <th>User</th>
                </tr>
            </thead>
            <tbody>
                ${history.slice(0, 10).map(item => `
                    <tr>
                        <td><i class="fas fa-file-alt" style="color: #3b82f6; margin-right: 8px;"></i>${item.reportName}</td>
                        <td>${item.period}</td>
                        <td><span class="status-badge" style="background: ${item.format === 'PDF' ? '#ef4444' : '#10b981'}; color: white;">${item.format}</span></td>
                        <td>${new Date(item.timestamp).toLocaleString('en-MY')}</td>
                        <td>${item.user}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

// ==================== EXPOSE TO WINDOW ====================

window.initializeLHDNExport = initializeLHDNExport;
window.exportAnnualPackage = exportAnnualPackage;
window.exportIncomeStatement = exportIncomeStatement;
window.exportBalanceSheetReport = exportBalanceSheetReport;
window.exportTaxSummary = exportTaxSummary;
window.exportSelectedReports = exportSelectedReports;
window.exportGeneralLedger = exportGeneralLedger;
window.exportAuditTrailReport = exportAuditTrailReport;
