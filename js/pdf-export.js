// ==================== PDF-EXPORT.JS ====================
// PDF Export Functions - Professional Business Report Templates

// Generate professional financial report
function exportToPDF() {
    showExportOptionsModal('financial');
}

// Show export options modal
function showExportOptionsModal(reportType) {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.id = 'exportModal';
    modal.style.display = 'flex';
    
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 500px;">
            <div class="modal-header">
                <h3 class="modal-title"><i class="fas fa-file-export" style="color: #2563eb;"></i> Export Report</h3>
                <button class="close-modal" onclick="closeExportModal()">&times;</button>
            </div>
            
            <div style="margin-bottom: 20px;">
                <label style="font-weight: 600; margin-bottom: 10px; display: block;">Report Type</label>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                    <button class="export-type-btn active" data-type="summary" onclick="selectExportType('summary', this)">
                        <i class="fas fa-chart-pie"></i>
                        <span>Summary Report</span>
                    </button>
                    <button class="export-type-btn" data-type="detailed" onclick="selectExportType('detailed', this)">
                        <i class="fas fa-list-alt"></i>
                        <span>Detailed Report</span>
                    </button>
                    <button class="export-type-btn" data-type="balance" onclick="selectExportType('balance', this)">
                        <i class="fas fa-balance-scale"></i>
                        <span>Balance Sheet</span>
                    </button>
                    <button class="export-type-btn" data-type="transactions" onclick="selectExportType('transactions', this)">
                        <i class="fas fa-receipt"></i>
                        <span>Transactions</span>
                    </button>
                </div>
            </div>
            
            <div style="margin-bottom: 20px;">
                <label style="font-weight: 600; margin-bottom: 10px; display: block;">Period</label>
                <select id="exportPeriod" style="width: 100%;">
                    <option value="month">This Month</option>
                    <option value="quarter">This Quarter</option>
                    <option value="year" selected>This Year</option>
                    <option value="all">All Time</option>
                </select>
            </div>
            
            <div style="margin-bottom: 20px;">
                <label style="font-weight: 600; margin-bottom: 10px; display: block;">Format</label>
                <div style="display: flex; gap: 10px;">
                    <button class="export-format-btn active" data-format="pdf" onclick="selectExportFormat('pdf', this)">
                        <i class="fas fa-file-pdf"></i> PDF
                    </button>
                    <button class="export-format-btn" data-format="excel" onclick="selectExportFormat('excel', this)">
                        <i class="fas fa-file-excel"></i> Excel
                    </button>
                </div>
            </div>
            
            <div style="display: flex; gap: 10px; margin-top: 25px;">
                <button class="btn-secondary" style="flex: 1;" onclick="closeExportModal()">Cancel</button>
                <button class="btn-primary" style="flex: 1;" onclick="generateExport()">
                    <i class="fas fa-download"></i> Export
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Store selected options
    window.exportOptions = {
        type: 'summary',
        format: 'pdf',
        period: 'year'
    };
}

function selectExportType(type, btn) {
    document.querySelectorAll('.export-type-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    window.exportOptions.type = type;
}

function selectExportFormat(format, btn) {
    document.querySelectorAll('.export-format-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    window.exportOptions.format = format;
}

function closeExportModal() {
    const modal = document.getElementById('exportModal');
    if (modal) modal.remove();
}

function generateExport() {
    const period = document.getElementById('exportPeriod').value;
    window.exportOptions.period = period;
    
    closeExportModal();
    
    switch (window.exportOptions.type) {
        case 'summary':
            generateSummaryReport();
            break;
        case 'detailed':
            generateDetailedReport();
            break;
        case 'balance':
            generateBalanceSheetReport();
            break;
        case 'transactions':
            generateTransactionsReport();
            break;
    }
}

// Get transactions for period
function getTransactionsForPeriod(period) {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    const currentQuarter = Math.floor(currentMonth / 3);
    
    return businessData.transactions.filter(tx => {
        const txDate = parseDateSafe(tx.date);
        switch (period) {
            case 'month':
                return txDate.getFullYear() === currentYear && txDate.getMonth() === currentMonth;
            case 'quarter':
                const txQuarter = Math.floor(txDate.getMonth() / 3);
                return txDate.getFullYear() === currentYear && txQuarter === currentQuarter;
            case 'year':
                return txDate.getFullYear() === currentYear;
            case 'all':
            default:
                return true;
        }
    });
}

// Calculate period totals
function calculatePeriodTotals(transactions) {
    let income = 0, expenses = 0;
    transactions.forEach(tx => {
        if (tx.type === 'income') income += tx.amount;
        else expenses += tx.amount;
    });
    return { income, expenses, profit: income - expenses };
}

// Get period label
function getPeriodLabel(period) {
    const now = new Date();
    switch (period) {
        case 'month':
            return now.toLocaleDateString('en-MY', { month: 'long', year: 'numeric' });
        case 'quarter':
            const quarter = Math.floor(now.getMonth() / 3) + 1;
            return `Q${quarter} ${now.getFullYear()}`;
        case 'year':
            return `Year ${now.getFullYear()}`;
        case 'all':
            return 'All Time';
    }
}

// Generate Summary Report (Professional Template)
function generateSummaryReport() {
    const period = window.exportOptions.period;
    const transactions = getTransactionsForPeriod(period);
    const totals = calculatePeriodTotals(transactions);
    const periodLabel = getPeriodLabel(period);
    
    const today = new Date();
    const reportDate = today.toLocaleDateString('en-MY', { 
        year: 'numeric', month: 'long', day: 'numeric' 
    });
    
    // Calculate category breakdown
    const categoryTotals = {};
    transactions.forEach(tx => {
        const cat = tx.category || 'Other';
        if (!categoryTotals[cat]) categoryTotals[cat] = { income: 0, expense: 0 };
        if (tx.type === 'income') categoryTotals[cat].income += tx.amount;
        else categoryTotals[cat].expense += tx.amount;
    });
    
    const companyName = businessData.settings.businessName || 'My Business';
    const ssmNumber = businessData.settings.ssmNumber || '';
    const tinNumber = businessData.settings.tinNumber || '';
    
    const reportContent = document.createElement('div');
    reportContent.style.cssText = 'width: 800px; background: white; font-family: Arial, Helvetica, sans-serif;';
    
    reportContent.innerHTML = `
        <div style="padding: 40px;">
            <!-- Header with Logo Area -->
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 3px solid #2563eb;">
                <div>
                    <h1 style="color: #2563eb; font-size: 28px; margin: 0 0 5px 0; font-weight: 700;">${escapeHTML(companyName)}</h1>
                    ${ssmNumber ? `<div style="color: #64748b; font-size: 13px;">SSM: ${escapeHTML(ssmNumber)}</div>` : ''}
                    ${tinNumber ? `<div style="color: #64748b; font-size: 13px;">TIN: ${escapeHTML(tinNumber)}</div>` : ''}
                </div>
                <div style="text-align: right;">
                    <div style="background: #2563eb; color: white; padding: 8px 16px; border-radius: 6px; font-weight: 600; font-size: 14px;">
                        FINANCIAL SUMMARY
                    </div>
                    <div style="color: #64748b; font-size: 12px; margin-top: 8px;">${periodLabel}</div>
                </div>
            </div>
            
            <!-- Key Metrics -->
            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-bottom: 30px;">
                <div style="background: linear-gradient(135deg, #10b981, #059669); color: white; padding: 25px; border-radius: 10px; text-align: center;">
                    <div style="font-size: 12px; opacity: 0.9; text-transform: uppercase; letter-spacing: 1px;">Total Revenue</div>
                    <div style="font-size: 28px; font-weight: 700; margin-top: 8px;">RM ${totals.income.toLocaleString('en-MY', {minimumFractionDigits: 2})}</div>
                </div>
                <div style="background: linear-gradient(135deg, #ef4444, #dc2626); color: white; padding: 25px; border-radius: 10px; text-align: center;">
                    <div style="font-size: 12px; opacity: 0.9; text-transform: uppercase; letter-spacing: 1px;">Total Expenses</div>
                    <div style="font-size: 28px; font-weight: 700; margin-top: 8px;">RM ${totals.expenses.toLocaleString('en-MY', {minimumFractionDigits: 2})}</div>
                </div>
                <div style="background: linear-gradient(135deg, ${totals.profit >= 0 ? '#2563eb, #1d4ed8' : '#f59e0b, #d97706'}); color: white; padding: 25px; border-radius: 10px; text-align: center;">
                    <div style="font-size: 12px; opacity: 0.9; text-transform: uppercase; letter-spacing: 1px;">Net ${totals.profit >= 0 ? 'Profit' : 'Loss'}</div>
                    <div style="font-size: 28px; font-weight: 700; margin-top: 8px;">RM ${Math.abs(totals.profit).toLocaleString('en-MY', {minimumFractionDigits: 2})}</div>
                </div>
            </div>
            
            <!-- Income & Expense Breakdown -->
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 30px; margin-bottom: 30px;">
                <div style="background: #f8fafc; padding: 20px; border-radius: 10px; border: 1px solid #e2e8f0;">
                    <h3 style="color: #10b981; margin: 0 0 15px 0; font-size: 16px; border-bottom: 2px solid #10b981; padding-bottom: 8px;">
                        <span style="margin-right: 8px;">↑</span> Income Breakdown
                    </h3>
                    ${Object.entries(categoryTotals)
                        .filter(([_, v]) => v.income > 0)
                        .sort((a, b) => b[1].income - a[1].income)
                        .slice(0, 5)
                        .map(([cat, v]) => `
                            <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e2e8f0;">
                                <span style="color: #475569;">${escapeHTML(cat)}</span>
                                <span style="color: #10b981; font-weight: 600;">RM ${v.income.toLocaleString('en-MY', {minimumFractionDigits: 2})}</span>
                            </div>
                        `).join('') || '<div style="color: #94a3b8; text-align: center; padding: 20px;">No income recorded</div>'}
                </div>
                
                <div style="background: #f8fafc; padding: 20px; border-radius: 10px; border: 1px solid #e2e8f0;">
                    <h3 style="color: #ef4444; margin: 0 0 15px 0; font-size: 16px; border-bottom: 2px solid #ef4444; padding-bottom: 8px;">
                        <span style="margin-right: 8px;">↓</span> Expense Breakdown
                    </h3>
                    ${Object.entries(categoryTotals)
                        .filter(([_, v]) => v.expense > 0)
                        .sort((a, b) => b[1].expense - a[1].expense)
                        .slice(0, 5)
                        .map(([cat, v]) => `
                            <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e2e8f0;">
                                <span style="color: #475569;">${escapeHTML(cat)}</span>
                                <span style="color: #ef4444; font-weight: 600;">RM ${v.expense.toLocaleString('en-MY', {minimumFractionDigits: 2})}</span>
                            </div>
                        `).join('') || '<div style="color: #94a3b8; text-align: center; padding: 20px;">No expenses recorded</div>'}
                </div>
            </div>
            
            <!-- Quick Stats -->
            <div style="background: #1e293b; color: white; padding: 20px; border-radius: 10px; margin-bottom: 30px;">
                <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; text-align: center;">
                    <div>
                        <div style="font-size: 24px; font-weight: 700;">${transactions.length}</div>
                        <div style="font-size: 11px; opacity: 0.7; text-transform: uppercase;">Transactions</div>
                    </div>
                    <div>
                        <div style="font-size: 24px; font-weight: 700;">${transactions.filter(t => t.type === 'income').length}</div>
                        <div style="font-size: 11px; opacity: 0.7; text-transform: uppercase;">Income Entries</div>
                    </div>
                    <div>
                        <div style="font-size: 24px; font-weight: 700;">${transactions.filter(t => t.type === 'expense').length}</div>
                        <div style="font-size: 11px; opacity: 0.7; text-transform: uppercase;">Expense Entries</div>
                    </div>
                    <div>
                        <div style="font-size: 24px; font-weight: 700; color: ${totals.profit >= 0 ? '#34d399' : '#fbbf24'};">${totals.income > 0 ? ((totals.profit / totals.income) * 100).toFixed(1) : 0}%</div>
                        <div style="font-size: 11px; opacity: 0.7; text-transform: uppercase;">Profit Margin</div>
                    </div>
                </div>
            </div>
            
            <!-- Footer -->
            <div style="text-align: center; padding-top: 20px; border-top: 1px solid #e2e8f0; color: #94a3b8; font-size: 11px;">
                <div>Report generated on ${reportDate} by EZCubic Accounting System</div>
                <div style="margin-top: 5px;">${escapeHTML(companyName)} ${ssmNumber ? '| ' + ssmNumber : ''}</div>
            </div>
        </div>
    `;
    
    exportReportContent(reportContent, `${companyName}-Summary-${periodLabel}`);
}

// Generate Detailed Report with all transactions
function generateDetailedReport() {
    const period = window.exportOptions.period;
    const transactions = getTransactionsForPeriod(period);
    const totals = calculatePeriodTotals(transactions);
    const periodLabel = getPeriodLabel(period);
    
    const today = new Date();
    const reportDate = today.toLocaleDateString('en-MY', { 
        year: 'numeric', month: 'long', day: 'numeric' 
    });
    
    const companyName = businessData.settings.businessName || 'My Business';
    const ssmNumber = businessData.settings.ssmNumber || '';
    
    const sortedTransactions = [...transactions].sort((a, b) => new Date(b.date) - new Date(a.date));
    
    const reportContent = document.createElement('div');
    reportContent.style.cssText = 'width: 800px; background: white; font-family: Arial, Helvetica, sans-serif;';
    
    reportContent.innerHTML = `
        <div style="padding: 40px;">
            <!-- Header -->
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 25px; padding-bottom: 15px; border-bottom: 3px solid #2563eb;">
                <div>
                    <h1 style="color: #2563eb; font-size: 24px; margin: 0 0 5px 0;">${escapeHTML(companyName)}</h1>
                    ${ssmNumber ? `<div style="color: #64748b; font-size: 12px;">SSM: ${escapeHTML(ssmNumber)}</div>` : ''}
                </div>
                <div style="text-align: right;">
                    <div style="background: #1e293b; color: white; padding: 6px 14px; border-radius: 5px; font-weight: 600; font-size: 13px;">
                        DETAILED REPORT
                    </div>
                    <div style="color: #64748b; font-size: 11px; margin-top: 5px;">${periodLabel}</div>
                </div>
            </div>
            
            <!-- Summary Row -->
            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin-bottom: 25px;">
                <div style="background: #f0fdf4; padding: 15px; border-radius: 8px; border-left: 4px solid #10b981;">
                    <div style="font-size: 11px; color: #64748b; text-transform: uppercase;">Total Income</div>
                    <div style="font-size: 20px; font-weight: 700; color: #10b981;">RM ${totals.income.toLocaleString('en-MY', {minimumFractionDigits: 2})}</div>
                </div>
                <div style="background: #fef2f2; padding: 15px; border-radius: 8px; border-left: 4px solid #ef4444;">
                    <div style="font-size: 11px; color: #64748b; text-transform: uppercase;">Total Expenses</div>
                    <div style="font-size: 20px; font-weight: 700; color: #ef4444;">RM ${totals.expenses.toLocaleString('en-MY', {minimumFractionDigits: 2})}</div>
                </div>
                <div style="background: ${totals.profit >= 0 ? '#eff6ff' : '#fffbeb'}; padding: 15px; border-radius: 8px; border-left: 4px solid ${totals.profit >= 0 ? '#2563eb' : '#f59e0b'};">
                    <div style="font-size: 11px; color: #64748b; text-transform: uppercase;">Net ${totals.profit >= 0 ? 'Profit' : 'Loss'}</div>
                    <div style="font-size: 20px; font-weight: 700; color: ${totals.profit >= 0 ? '#2563eb' : '#f59e0b'};">RM ${Math.abs(totals.profit).toLocaleString('en-MY', {minimumFractionDigits: 2})}</div>
                </div>
            </div>
            
            <!-- Transactions Table -->
            <div style="margin-bottom: 20px;">
                <h3 style="color: #1e293b; margin: 0 0 15px 0; font-size: 14px; font-weight: 600;">Transaction Details (${sortedTransactions.length} records)</h3>
                <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
                    <thead>
                        <tr style="background: #f8fafc;">
                            <th style="text-align: left; padding: 10px; border-bottom: 2px solid #e2e8f0; color: #64748b; font-weight: 600;">Date</th>
                            <th style="text-align: left; padding: 10px; border-bottom: 2px solid #e2e8f0; color: #64748b; font-weight: 600;">Description</th>
                            <th style="text-align: left; padding: 10px; border-bottom: 2px solid #e2e8f0; color: #64748b; font-weight: 600;">Category</th>
                            <th style="text-align: center; padding: 10px; border-bottom: 2px solid #e2e8f0; color: #64748b; font-weight: 600;">Type</th>
                            <th style="text-align: right; padding: 10px; border-bottom: 2px solid #e2e8f0; color: #64748b; font-weight: 600;">Amount (RM)</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${sortedTransactions.slice(0, 50).map((tx, i) => `
                            <tr style="background: ${i % 2 === 0 ? 'white' : '#f8fafc'};">
                                <td style="padding: 8px 10px; border-bottom: 1px solid #f1f5f9; color: #64748b;">${parseDateSafe(tx.date).toLocaleDateString('en-MY', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                                <td style="padding: 8px 10px; border-bottom: 1px solid #f1f5f9; color: #1e293b;">${escapeHTML(tx.description)}</td>
                                <td style="padding: 8px 10px; border-bottom: 1px solid #f1f5f9; color: #64748b;">${escapeHTML(tx.category || '-')}</td>
                                <td style="padding: 8px 10px; border-bottom: 1px solid #f1f5f9; text-align: center;">
                                    <span style="background: ${tx.type === 'income' ? '#d1fae5' : '#fee2e2'}; color: ${tx.type === 'income' ? '#065f46' : '#991b1b'}; padding: 2px 8px; border-radius: 10px; font-size: 10px; font-weight: 600;">
                                        ${tx.type === 'income' ? 'IN' : 'OUT'}
                                    </span>
                                </td>
                                <td style="padding: 8px 10px; border-bottom: 1px solid #f1f5f9; text-align: right; font-weight: 600; color: ${tx.type === 'income' ? '#10b981' : '#ef4444'};">
                                    ${tx.type === 'income' ? '+' : '-'}${tx.amount.toLocaleString('en-MY', {minimumFractionDigits: 2})}
                                </td>
                            </tr>
                        `).join('')}
                        ${sortedTransactions.length > 50 ? `
                            <tr>
                                <td colspan="5" style="padding: 10px; text-align: center; color: #64748b; font-style: italic;">
                                    ... and ${sortedTransactions.length - 50} more transactions
                                </td>
                            </tr>
                        ` : ''}
                    </tbody>
                </table>
            </div>
            
            <!-- Footer -->
            <div style="text-align: center; padding-top: 15px; border-top: 1px solid #e2e8f0; color: #94a3b8; font-size: 10px;">
                Report generated on ${reportDate} | EZCubic Accounting System | ${escapeHTML(companyName)}
            </div>
        </div>
    `;
    
    exportReportContent(reportContent, `${companyName}-Detailed-${periodLabel}`);
}

// Generate Balance Sheet Report
function generateBalanceSheetReport() {
    const today = new Date();
    const reportDate = today.toLocaleDateString('en-MY', { 
        year: 'numeric', month: 'long', day: 'numeric' 
    });
    
    const companyName = businessData.settings.businessName || 'My Business';
    const ssmNumber = businessData.settings.ssmNumber || '';
    
    // Calculate balance sheet data
    const balanceData = calculateSimpleBalanceSheet();
    
    // Get bank accounts
    const bankAccounts = JSON.parse(localStorage.getItem('ezcubic_bank_accounts') || '[]');
    
    // Get credit cards
    const creditCards = JSON.parse(localStorage.getItem('ezcubic_credit_cards') || '[]');
    
    // Get manual balances
    const manualBalances = JSON.parse(localStorage.getItem('ezcubic_manual_balances') || '{}');
    
    const reportContent = document.createElement('div');
    reportContent.style.cssText = 'width: 800px; background: white; font-family: Arial, Helvetica, sans-serif;';
    
    reportContent.innerHTML = `
        <div style="padding: 40px;">
            <!-- Header -->
            <div style="text-align: center; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 3px solid #2563eb;">
                <h1 style="color: #2563eb; font-size: 26px; margin: 0 0 5px 0;">${escapeHTML(companyName)}</h1>
                ${ssmNumber ? `<div style="color: #64748b; font-size: 13px; margin-bottom: 10px;">SSM: ${escapeHTML(ssmNumber)}</div>` : ''}
                <div style="display: inline-block; background: #1e293b; color: white; padding: 8px 20px; border-radius: 6px; font-weight: 600;">
                    BALANCE SHEET
                </div>
                <div style="color: #64748b; font-size: 13px; margin-top: 10px;">As at ${reportDate}</div>
            </div>
            
            <!-- Balance Sheet Grid -->
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 30px; margin-bottom: 30px;">
                <!-- Assets Column -->
                <div>
                    <h3 style="color: #2563eb; margin: 0 0 15px 0; padding-bottom: 10px; border-bottom: 2px solid #2563eb; font-size: 16px;">
                        ASSETS (What You Have)
                    </h3>
                    
                    <div style="margin-bottom: 20px;">
                        <h4 style="color: #64748b; font-size: 12px; margin: 0 0 10px 0; text-transform: uppercase;">Cash & Bank</h4>
                        ${bankAccounts.length > 0 ? bankAccounts.map(acc => `
                            <div style="display: flex; justify-content: space-between; padding: 8px 12px; background: #f8fafc; border-radius: 6px; margin-bottom: 5px;">
                                <span style="color: #475569;">${escapeHTML(acc.name)}</span>
                                <span style="color: #1e293b; font-weight: 600;">RM ${(acc.balance || 0).toLocaleString('en-MY', {minimumFractionDigits: 2})}</span>
                            </div>
                        `).join('') : `
                            <div style="display: flex; justify-content: space-between; padding: 8px 12px; background: #f8fafc; border-radius: 6px;">
                                <span style="color: #475569;">Cash</span>
                                <span style="color: #1e293b; font-weight: 600;">RM ${(balanceData.cashInBank || 0).toLocaleString('en-MY', {minimumFractionDigits: 2})}</span>
                            </div>
                        `}
                    </div>
                    
                    ${manualBalances.inventory ? `
                    <div style="margin-bottom: 20px;">
                        <h4 style="color: #64748b; font-size: 12px; margin: 0 0 10px 0; text-transform: uppercase;">Inventory</h4>
                        <div style="display: flex; justify-content: space-between; padding: 8px 12px; background: #f8fafc; border-radius: 6px;">
                            <span style="color: #475569;">Stock Value</span>
                            <span style="color: #1e293b; font-weight: 600;">RM ${parseFloat(manualBalances.inventory || 0).toLocaleString('en-MY', {minimumFractionDigits: 2})}</span>
                        </div>
                    </div>
                    ` : ''}
                    
                    ${manualBalances.equipment ? `
                    <div style="margin-bottom: 20px;">
                        <h4 style="color: #64748b; font-size: 12px; margin: 0 0 10px 0; text-transform: uppercase;">Fixed Assets</h4>
                        <div style="display: flex; justify-content: space-between; padding: 8px 12px; background: #f8fafc; border-radius: 6px;">
                            <span style="color: #475569;">Equipment</span>
                            <span style="color: #1e293b; font-weight: 600;">RM ${parseFloat(manualBalances.equipment || 0).toLocaleString('en-MY', {minimumFractionDigits: 2})}</span>
                        </div>
                    </div>
                    ` : ''}
                    
                    <div style="background: linear-gradient(135deg, #2563eb, #3b82f6); color: white; padding: 15px; border-radius: 8px; display: flex; justify-content: space-between; margin-top: 20px;">
                        <span style="font-weight: 600;">TOTAL ASSETS</span>
                        <span style="font-size: 20px; font-weight: 700;">RM ${(balanceData.totalAssets || 0).toLocaleString('en-MY', {minimumFractionDigits: 2})}</span>
                    </div>
                </div>
                
                <!-- Liabilities Column -->
                <div>
                    <h3 style="color: #ef4444; margin: 0 0 15px 0; padding-bottom: 10px; border-bottom: 2px solid #ef4444; font-size: 16px;">
                        LIABILITIES (What You Owe)
                    </h3>
                    
                    <div style="margin-bottom: 20px;">
                        <h4 style="color: #64748b; font-size: 12px; margin: 0 0 10px 0; text-transform: uppercase;">Credit Cards</h4>
                        ${creditCards.length > 0 ? creditCards.map(card => `
                            <div style="display: flex; justify-content: space-between; padding: 8px 12px; background: #fef2f2; border-radius: 6px; margin-bottom: 5px;">
                                <span style="color: #475569;">${escapeHTML(card.name)} (****${card.last4})</span>
                                <span style="color: #ef4444; font-weight: 600;">RM ${(card.balance || 0).toLocaleString('en-MY', {minimumFractionDigits: 2})}</span>
                            </div>
                        `).join('') : `
                            <div style="color: #94a3b8; font-size: 13px; padding: 10px;">No credit cards</div>
                        `}
                    </div>
                    
                    ${balanceData.billsDue > 0 ? `
                    <div style="margin-bottom: 20px;">
                        <h4 style="color: #64748b; font-size: 12px; margin: 0 0 10px 0; text-transform: uppercase;">Bills Payable</h4>
                        <div style="display: flex; justify-content: space-between; padding: 8px 12px; background: #fef2f2; border-radius: 6px;">
                            <span style="color: #475569;">Outstanding Bills</span>
                            <span style="color: #ef4444; font-weight: 600;">RM ${(balanceData.billsDue || 0).toLocaleString('en-MY', {minimumFractionDigits: 2})}</span>
                        </div>
                    </div>
                    ` : ''}
                    
                    ${manualBalances.loans ? `
                    <div style="margin-bottom: 20px;">
                        <h4 style="color: #64748b; font-size: 12px; margin: 0 0 10px 0; text-transform: uppercase;">Loans</h4>
                        <div style="display: flex; justify-content: space-between; padding: 8px 12px; background: #fef2f2; border-radius: 6px;">
                            <span style="color: #475569;">Business Loans</span>
                            <span style="color: #ef4444; font-weight: 600;">RM ${parseFloat(manualBalances.loans || 0).toLocaleString('en-MY', {minimumFractionDigits: 2})}</span>
                        </div>
                    </div>
                    ` : ''}
                    
                    <div style="background: linear-gradient(135deg, #ef4444, #f87171); color: white; padding: 15px; border-radius: 8px; display: flex; justify-content: space-between; margin-top: 20px;">
                        <span style="font-weight: 600;">TOTAL LIABILITIES</span>
                        <span style="font-size: 20px; font-weight: 700;">RM ${(balanceData.totalLiabilities || 0).toLocaleString('en-MY', {minimumFractionDigits: 2})}</span>
                    </div>
                </div>
            </div>
            
            <!-- Net Worth -->
            <div style="background: linear-gradient(135deg, #10b981, #059669); color: white; padding: 25px; border-radius: 10px; text-align: center; margin-bottom: 30px;">
                <div style="font-size: 14px; opacity: 0.9; text-transform: uppercase; letter-spacing: 1px;">NET WORTH (EQUITY)</div>
                <div style="font-size: 36px; font-weight: 700; margin-top: 10px;">RM ${(balanceData.netWorth || 0).toLocaleString('en-MY', {minimumFractionDigits: 2})}</div>
                <div style="font-size: 12px; opacity: 0.8; margin-top: 10px;">Assets - Liabilities = Net Worth</div>
            </div>
            
            <!-- Accounting Equation -->
            <div style="background: #f8fafc; padding: 20px; border-radius: 10px; text-align: center; border: 1px solid #e2e8f0;">
                <div style="font-size: 12px; color: #64748b; margin-bottom: 10px; text-transform: uppercase;">Accounting Equation</div>
                <div style="display: flex; align-items: center; justify-content: center; gap: 20px; flex-wrap: wrap;">
                    <div style="background: #eff6ff; padding: 15px 25px; border-radius: 8px; border: 2px solid #2563eb;">
                        <div style="font-size: 11px; color: #64748b;">Assets</div>
                        <div style="font-size: 18px; font-weight: 700; color: #2563eb;">RM ${(balanceData.totalAssets || 0).toLocaleString('en-MY')}</div>
                    </div>
                    <span style="font-size: 24px; color: #94a3b8;">=</span>
                    <div style="background: #fef2f2; padding: 15px 25px; border-radius: 8px; border: 2px solid #ef4444;">
                        <div style="font-size: 11px; color: #64748b;">Liabilities</div>
                        <div style="font-size: 18px; font-weight: 700; color: #ef4444;">RM ${(balanceData.totalLiabilities || 0).toLocaleString('en-MY')}</div>
                    </div>
                    <span style="font-size: 24px; color: #94a3b8;">+</span>
                    <div style="background: #f0fdf4; padding: 15px 25px; border-radius: 8px; border: 2px solid #10b981;">
                        <div style="font-size: 11px; color: #64748b;">Equity</div>
                        <div style="font-size: 18px; font-weight: 700; color: #10b981;">RM ${(balanceData.netWorth || 0).toLocaleString('en-MY')}</div>
                    </div>
                </div>
            </div>
            
            <!-- Footer -->
            <div style="text-align: center; padding-top: 20px; margin-top: 20px; border-top: 1px solid #e2e8f0; color: #94a3b8; font-size: 11px;">
                Report generated on ${reportDate} | EZCubic Accounting System | ${escapeHTML(companyName)}
            </div>
        </div>
    `;
    
    exportReportContent(reportContent, `${companyName}-Balance-Sheet-${reportDate}`);
}

// Generate Transactions Report
function generateTransactionsReport() {
    const period = window.exportOptions.period;
    const transactions = getTransactionsForPeriod(period);
    const periodLabel = getPeriodLabel(period);
    
    const today = new Date();
    const reportDate = today.toLocaleDateString('en-MY', { 
        year: 'numeric', month: 'long', day: 'numeric' 
    });
    
    const companyName = businessData.settings.businessName || 'My Business';
    
    const sortedTransactions = [...transactions].sort((a, b) => new Date(b.date) - new Date(a.date));
    
    // Group by month
    const groupedByMonth = {};
    sortedTransactions.forEach(tx => {
        const date = parseDateSafe(tx.date);
        const monthKey = date.toLocaleDateString('en-MY', { month: 'long', year: 'numeric' });
        if (!groupedByMonth[monthKey]) groupedByMonth[monthKey] = [];
        groupedByMonth[monthKey].push(tx);
    });
    
    const reportContent = document.createElement('div');
    reportContent.style.cssText = 'width: 800px; background: white; font-family: Arial, Helvetica, sans-serif;';
    
    let monthSections = '';
    for (const [month, txs] of Object.entries(groupedByMonth)) {
        const monthIncome = txs.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
        const monthExpense = txs.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
        
        monthSections += `
            <div style="margin-bottom: 25px;">
                <div style="display: flex; justify-content: space-between; align-items: center; background: #f8fafc; padding: 12px 15px; border-radius: 8px 8px 0 0; border: 1px solid #e2e8f0; border-bottom: none;">
                    <h4 style="margin: 0; color: #1e293b; font-size: 14px;">${month}</h4>
                    <div style="display: flex; gap: 20px; font-size: 12px;">
                        <span style="color: #10b981;">+RM ${monthIncome.toLocaleString('en-MY', {minimumFractionDigits: 2})}</span>
                        <span style="color: #ef4444;">-RM ${monthExpense.toLocaleString('en-MY', {minimumFractionDigits: 2})}</span>
                    </div>
                </div>
                <table style="width: 100%; border-collapse: collapse; font-size: 11px; border: 1px solid #e2e8f0; border-top: none;">
                    ${txs.slice(0, 20).map((tx, i) => `
                        <tr style="background: ${i % 2 === 0 ? 'white' : '#fafafa'};">
                            <td style="padding: 8px 12px; border-bottom: 1px solid #f1f5f9; color: #64748b; width: 80px;">${parseDateSafe(tx.date).toLocaleDateString('en-MY', { day: '2-digit', month: 'short' })}</td>
                            <td style="padding: 8px 12px; border-bottom: 1px solid #f1f5f9; color: #1e293b;">${escapeHTML(tx.description)}</td>
                            <td style="padding: 8px 12px; border-bottom: 1px solid #f1f5f9; color: #64748b; width: 100px;">${escapeHTML(tx.category || '-')}</td>
                            <td style="padding: 8px 12px; border-bottom: 1px solid #f1f5f9; text-align: right; width: 100px; font-weight: 600; color: ${tx.type === 'income' ? '#10b981' : '#ef4444'};">
                                ${tx.type === 'income' ? '+' : '-'}${tx.amount.toLocaleString('en-MY', {minimumFractionDigits: 2})}
                            </td>
                        </tr>
                    `).join('')}
                    ${txs.length > 20 ? `
                        <tr><td colspan="4" style="padding: 8px; text-align: center; color: #64748b; font-style: italic;">+${txs.length - 20} more</td></tr>
                    ` : ''}
                </table>
            </div>
        `;
    }
    
    reportContent.innerHTML = `
        <div style="padding: 35px;">
            <!-- Header -->
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 25px; padding-bottom: 15px; border-bottom: 3px solid #2563eb;">
                <div>
                    <h1 style="color: #2563eb; font-size: 22px; margin: 0;">${escapeHTML(companyName)}</h1>
                </div>
                <div style="text-align: right;">
                    <div style="background: #f59e0b; color: white; padding: 6px 14px; border-radius: 5px; font-weight: 600; font-size: 12px;">
                        TRANSACTIONS REGISTER
                    </div>
                    <div style="color: #64748b; font-size: 11px; margin-top: 5px;">${periodLabel} • ${sortedTransactions.length} records</div>
                </div>
            </div>
            
            ${monthSections || '<div style="text-align: center; color: #94a3b8; padding: 40px;">No transactions found for this period</div>'}
            
            <!-- Footer -->
            <div style="text-align: center; padding-top: 15px; border-top: 1px solid #e2e8f0; color: #94a3b8; font-size: 10px;">
                Generated on ${reportDate} | EZCubic Accounting System
            </div>
        </div>
    `;
    
    exportReportContent(reportContent, `${companyName}-Transactions-${periodLabel}`);
}

// Export report content (PDF or Excel)
function exportReportContent(reportContent, filename) {
    document.body.appendChild(reportContent);
    
    if (window.exportOptions.format === 'pdf') {
        // Export as PDF using iframe (more reliable than window.open)
        try {
            // Create hidden iframe for printing
            let printFrame = document.getElementById('printFrame');
            if (!printFrame) {
                printFrame = document.createElement('iframe');
                printFrame.id = 'printFrame';
                printFrame.style.cssText = 'position: fixed; right: 0; bottom: 0; width: 0; height: 0; border: 0;';
                document.body.appendChild(printFrame);
            }
            
            const printDoc = printFrame.contentDocument || printFrame.contentWindow.document;
            printDoc.open();
            printDoc.write(`
                <!DOCTYPE html>
                <html>
                <head>
                    <title>${filename}</title>
                    <style>
                        body { margin: 0; padding: 0; }
                        @media print {
                            body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
                        }
                        @page { 
                            size: A4; 
                            margin: 10mm; 
                        }
                    </style>
                </head>
                <body>${reportContent.innerHTML}</body>
                </html>
            `);
            printDoc.close();
            
            // Wait for content to load, then print
            setTimeout(() => {
                try {
                    printFrame.contentWindow.focus();
                    printFrame.contentWindow.print();
                    showNotification('Print dialog opened! Select "Save as PDF" to save.', 'success');
                } catch (printError) {
                    console.error('Print error:', printError);
                    // Fallback: try window.print() on main document
                    fallbackPrint(reportContent, filename);
                }
            }, 300);
            
        } catch (error) {
            console.error('Export error:', error);
            // Fallback method
            fallbackPrint(reportContent, filename);
        }
        document.body.removeChild(reportContent);
    } else if (window.exportOptions.format === 'excel') {
        // Export as Excel (CSV format that Excel can open)
        exportToExcel(filename);
        document.body.removeChild(reportContent);
    } else {
        document.body.removeChild(reportContent);
        showNotification('Unknown export format', 'error');
    }
}

// Fallback print function using a new window
function fallbackPrint(reportContent, filename) {
    const printWindow = window.open('', '_blank', 'width=800,height=600');
    if (printWindow) {
        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>${filename}</title>
                <style>
                    body { margin: 20px; padding: 0; }
                    @media print {
                        body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
                    }
                </style>
            </head>
            <body>
                ${reportContent.innerHTML}
                <script>
                    setTimeout(function() { window.print(); }, 500);
                <\/script>
            </body>
            </html>
        `);
        printWindow.document.close();
        showNotification('Print window opened! Select "Save as PDF" to save.', 'success');
    } else {
        showNotification('Pop-up blocked! Please allow pop-ups for this site to export PDF.', 'error');
    }
}

// Export data to Excel (CSV format)
function exportToExcel(filename) {
    const period = window.exportOptions.period;
    const reportType = window.exportOptions.type;
    const transactions = getTransactionsForPeriod(period);
    const totals = calculatePeriodTotals(transactions);
    const periodLabel = getPeriodLabel(period);
    const companyName = businessData.settings.businessName || 'My Business';
    const today = new Date().toLocaleDateString('en-MY');
    
    let csvContent = '';
    let xlsContent = '';
    
    // BOM for UTF-8 encoding in Excel
    const BOM = '\uFEFF';
    
    if (reportType === 'summary' || reportType === 'detailed') {
        // Summary/Detailed Report Excel
        xlsContent = `
            <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
            <head>
                <meta charset="UTF-8">
                <!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet>
                <x:Name>Financial Report</x:Name>
                <x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions>
                </x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]-->
                <style>
                    td, th { padding: 5px 10px; border: 1px solid #ddd; }
                    th { background: #2563eb; color: white; font-weight: bold; }
                    .header { font-size: 18px; font-weight: bold; color: #2563eb; }
                    .subheader { color: #64748b; }
                    .income { color: #10b981; }
                    .expense { color: #ef4444; }
                    .total { font-weight: bold; background: #f8fafc; }
                </style>
            </head>
            <body>
                <table>
                    <tr><td colspan="4" class="header">${escapeHTML(companyName)}</td></tr>
                    <tr><td colspan="4" class="subheader">Financial Report - ${periodLabel}</td></tr>
                    <tr><td colspan="4" class="subheader">Generated: ${today}</td></tr>
                    <tr><td colspan="4"></td></tr>
                    <tr><td colspan="4" style="font-weight: bold;">SUMMARY</td></tr>
                    <tr><td>Total Income</td><td colspan="3" class="income">RM ${totals.income.toLocaleString('en-MY', {minimumFractionDigits: 2})}</td></tr>
                    <tr><td>Total Expenses</td><td colspan="3" class="expense">RM ${totals.expenses.toLocaleString('en-MY', {minimumFractionDigits: 2})}</td></tr>
                    <tr class="total"><td>Net ${totals.profit >= 0 ? 'Profit' : 'Loss'}</td><td colspan="3">RM ${Math.abs(totals.profit).toLocaleString('en-MY', {minimumFractionDigits: 2})}</td></tr>
                    <tr><td colspan="4"></td></tr>
                    <tr><th>Date</th><th>Description</th><th>Category</th><th>Amount (RM)</th></tr>
                    ${transactions.sort((a, b) => new Date(b.date) - new Date(a.date)).map(tx => `
                        <tr>
                            <td>${parseDateSafe(tx.date).toLocaleDateString('en-MY')}</td>
                            <td>${escapeHTML(tx.description)}</td>
                            <td>${escapeHTML(tx.category || '-')}</td>
                            <td class="${tx.type === 'income' ? 'income' : 'expense'}">${tx.type === 'income' ? '+' : '-'}${tx.amount.toLocaleString('en-MY', {minimumFractionDigits: 2})}</td>
                        </tr>
                    `).join('')}
                </table>
            </body>
            </html>
        `;
    } else if (reportType === 'balance') {
        // Balance Sheet Excel
        const balanceData = calculateSimpleBalanceSheet();
        const bankAccounts = JSON.parse(localStorage.getItem('ezcubic_bank_accounts') || '[]');
        const creditCards = JSON.parse(localStorage.getItem('ezcubic_credit_cards') || '[]');
        
        xlsContent = `
            <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
            <head>
                <meta charset="UTF-8">
                <!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet>
                <x:Name>Balance Sheet</x:Name>
                <x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions>
                </x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]-->
                <style>
                    td, th { padding: 5px 10px; border: 1px solid #ddd; }
                    th { background: #2563eb; color: white; font-weight: bold; }
                    .header { font-size: 18px; font-weight: bold; color: #2563eb; }
                    .section { font-weight: bold; background: #f1f5f9; }
                    .assets { color: #2563eb; }
                    .liabilities { color: #ef4444; }
                    .equity { color: #10b981; }
                    .total { font-weight: bold; background: #1e293b; color: white; }
                </style>
            </head>
            <body>
                <table>
                    <tr><td colspan="2" class="header">${escapeHTML(companyName)}</td></tr>
                    <tr><td colspan="2">BALANCE SHEET</td></tr>
                    <tr><td colspan="2">As at ${today}</td></tr>
                    <tr><td colspan="2"></td></tr>
                    <tr class="section"><td colspan="2" class="assets">ASSETS</td></tr>
                    ${bankAccounts.map(acc => `
                        <tr><td>${escapeHTML(acc.name)}</td><td>RM ${(acc.balance || 0).toLocaleString('en-MY', {minimumFractionDigits: 2})}</td></tr>
                    `).join('') || `<tr><td>Cash</td><td>RM ${(balanceData.cashInBank || 0).toLocaleString('en-MY', {minimumFractionDigits: 2})}</td></tr>`}
                    <tr class="total"><td>TOTAL ASSETS</td><td>RM ${(balanceData.totalAssets || 0).toLocaleString('en-MY', {minimumFractionDigits: 2})}</td></tr>
                    <tr><td colspan="2"></td></tr>
                    <tr class="section"><td colspan="2" class="liabilities">LIABILITIES</td></tr>
                    ${creditCards.map(card => `
                        <tr><td>${escapeHTML(card.name)} (****${card.last4})</td><td>RM ${(card.balance || 0).toLocaleString('en-MY', {minimumFractionDigits: 2})}</td></tr>
                    `).join('') || '<tr><td>No liabilities</td><td>RM 0.00</td></tr>'}
                    ${balanceData.billsDue > 0 ? `<tr><td>Bills Payable</td><td>RM ${(balanceData.billsDue || 0).toLocaleString('en-MY', {minimumFractionDigits: 2})}</td></tr>` : ''}
                    <tr class="total"><td>TOTAL LIABILITIES</td><td>RM ${(balanceData.totalLiabilities || 0).toLocaleString('en-MY', {minimumFractionDigits: 2})}</td></tr>
                    <tr><td colspan="2"></td></tr>
                    <tr class="section"><td colspan="2" class="equity">EQUITY (NET WORTH)</td></tr>
                    <tr class="total"><td>NET WORTH</td><td>RM ${(balanceData.netWorth || 0).toLocaleString('en-MY', {minimumFractionDigits: 2})}</td></tr>
                </table>
            </body>
            </html>
        `;
    } else if (reportType === 'transactions') {
        // Transactions Register Excel
        xlsContent = `
            <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
            <head>
                <meta charset="UTF-8">
                <!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet>
                <x:Name>Transactions</x:Name>
                <x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions>
                </x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]-->
                <style>
                    td, th { padding: 5px 10px; border: 1px solid #ddd; }
                    th { background: #f59e0b; color: white; font-weight: bold; }
                    .header { font-size: 18px; font-weight: bold; color: #2563eb; }
                    .income { color: #10b981; }
                    .expense { color: #ef4444; }
                </style>
            </head>
            <body>
                <table>
                    <tr><td colspan="5" class="header">${escapeHTML(companyName)}</td></tr>
                    <tr><td colspan="5">TRANSACTIONS REGISTER - ${periodLabel}</td></tr>
                    <tr><td colspan="5">Generated: ${today}</td></tr>
                    <tr><td colspan="5"></td></tr>
                    <tr>
                        <th>Date</th>
                        <th>Description</th>
                        <th>Category</th>
                        <th>Type</th>
                        <th>Amount (RM)</th>
                    </tr>
                    ${transactions.sort((a, b) => new Date(b.date) - new Date(a.date)).map(tx => `
                        <tr>
                            <td>${parseDateSafe(tx.date).toLocaleDateString('en-MY')}</td>
                            <td>${escapeHTML(tx.description)}</td>
                            <td>${escapeHTML(tx.category || '-')}</td>
                            <td>${tx.type === 'income' ? 'Income' : 'Expense'}</td>
                            <td class="${tx.type === 'income' ? 'income' : 'expense'}">${tx.type === 'income' ? '+' : '-'}${tx.amount.toLocaleString('en-MY', {minimumFractionDigits: 2})}</td>
                        </tr>
                    `).join('')}
                    <tr><td colspan="5"></td></tr>
                    <tr><td colspan="4" style="font-weight: bold;">Total Income:</td><td class="income">RM ${totals.income.toLocaleString('en-MY', {minimumFractionDigits: 2})}</td></tr>
                    <tr><td colspan="4" style="font-weight: bold;">Total Expenses:</td><td class="expense">RM ${totals.expenses.toLocaleString('en-MY', {minimumFractionDigits: 2})}</td></tr>
                    <tr><td colspan="4" style="font-weight: bold;">Net:</td><td style="font-weight: bold;">RM ${totals.profit.toLocaleString('en-MY', {minimumFractionDigits: 2})}</td></tr>
                </table>
            </body>
            </html>
        `;
    }
    
    // Download as Excel file
    const blob = new Blob([BOM + xlsContent], { type: 'application/vnd.ms-excel;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${filename.replace(/\s+/g, '-')}.xls`;
    link.click();
    URL.revokeObjectURL(link.href);
    
    showNotification('Excel file downloaded successfully!', 'success');
}

function generateMonthlyReport() {
    exportToPDF();
}

// Export functions to window for onclick handlers
window.exportToPDF = exportToPDF;
window.generateMonthlyReport = generateMonthlyReport;
window.showExportOptionsModal = showExportOptionsModal;
window.selectExportType = selectExportType;
window.selectExportFormat = selectExportFormat;
window.closeExportModal = closeExportModal;
window.generateExport = generateExport;
window.generateSummaryReport = generateSummaryReport;
window.generateDetailedReport = generateDetailedReport;
window.generateBalanceSheetReport = generateBalanceSheetReport;
window.generateTransactionsReport = generateTransactionsReport;
window.exportToExcel = exportToExcel;
window.fallbackPrint = fallbackPrint;
window.exportReportContent = exportReportContent;