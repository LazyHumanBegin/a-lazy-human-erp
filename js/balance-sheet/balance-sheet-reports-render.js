// ==================== BALANCE-SHEET-REPORTS-RENDER.JS ====================
// COA-Based Balance Sheet & Double-Entry Rendering Functions
// Part 2 of balance-sheet-reports.js split

// ==================== COA-BASED BALANCE SHEET ====================
/**
 * Calculate balance sheet from Chart of Accounts (double-entry)
 * This provides a more accurate accounting view
 */
function calculateBalanceSheetFromCOA() {
    // Load Chart of Accounts if available
    if (typeof loadChartOfAccounts !== 'function') {
        console.log('Chart of Accounts not available, using simple calculation');
        return null;
    }
    
    const accounts = loadChartOfAccounts();
    if (!accounts || accounts.length === 0) {
        return null;
    }
    
    // Calculate totals by type
    const assets = accounts.filter(a => a.type === 'asset' && !a.isHeader && a.isActive !== false);
    const liabilities = accounts.filter(a => a.type === 'liability' && !a.isHeader && a.isActive !== false);
    const equity = accounts.filter(a => a.type === 'equity' && !a.isHeader && a.isActive !== false);
    const revenue = accounts.filter(a => a.type === 'revenue' && !a.isHeader && a.isActive !== false);
    const expenses = accounts.filter(a => a.type === 'expense' && !a.isHeader && a.isActive !== false);
    
    const totalAssets = assets.reduce((sum, a) => sum + (a.balance || 0), 0);
    const totalLiabilities = liabilities.reduce((sum, a) => sum + (a.balance || 0), 0);
    const totalEquity = equity.reduce((sum, a) => sum + (a.balance || 0), 0);
    const totalRevenue = revenue.reduce((sum, a) => sum + (a.balance || 0), 0);
    const totalExpenses = expenses.reduce((sum, a) => sum + (a.balance || 0), 0);
    
    // Net Income = Revenue - Expenses
    const netIncome = totalRevenue - totalExpenses;
    
    // Total Equity includes retained earnings (net income)
    const totalEquityWithRetained = totalEquity + netIncome;
    
    // Balance Sheet equation check: Assets = Liabilities + Equity
    const isBalanced = Math.abs(totalAssets - (totalLiabilities + totalEquityWithRetained)) < 0.01;
    
    return {
        // Asset breakdown
        assets: {
            current: assets.filter(a => a.subtype === 'current'),
            nonCurrent: assets.filter(a => a.subtype === 'non-current'),
            total: totalAssets
        },
        // Liability breakdown
        liabilities: {
            current: liabilities.filter(a => a.subtype === 'current'),
            nonCurrent: liabilities.filter(a => a.subtype === 'non-current'),
            total: totalLiabilities
        },
        // Equity
        equity: {
            items: equity,
            total: totalEquity,
            retainedEarnings: netIncome,
            totalWithRetained: totalEquityWithRetained
        },
        // Income Statement summary
        incomeStatement: {
            revenue: totalRevenue,
            expenses: totalExpenses,
            netIncome: netIncome
        },
        // Validation
        isBalanced: isBalanced,
        difference: totalAssets - (totalLiabilities + totalEquityWithRetained)
    };
}

/**
 * Display balance sheet with COA data if available
 */
function displayEnhancedBalanceSheet() {
    // Try to get COA data first, otherwise calculate from transactions
    let coaData = calculateBalanceSheetFromCOA();
    
    // If no COA, calculate Double Entry view from transactions
    if (!coaData) {
        coaData = calculateDoubleEntryFromTransactions();
    }
    
    const container = document.getElementById('simpleBalanceSummary');
    if (!container) return;
    
    const html = `
        <div class="double-entry-balance-sheet" style="padding: 15px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; flex-wrap: wrap; gap: 10px;">
                <h3 style="margin: 0; color: #1e293b;">
                    <i class="fas fa-balance-scale-left"></i> Balance Sheet (Double-Entry)
                </h3>
                <span style="font-size: 12px; padding: 5px 12px; border-radius: 15px; ${coaData.isBalanced ? 'background: #dcfce7; color: #16a34a;' : 'background: #fee2e2; color: #dc2626;'}">
                    ${coaData.isBalanced ? '✓ Balanced' : '⚠ Difference: RM ' + Math.abs(coaData.difference).toFixed(2)}
                </span>
            </div>
            
            <!-- Two Column Layout for Assets and Liabilities+Equity -->
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                
                <!-- LEFT: ASSETS -->
                <div style="background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%); padding: 15px; border-radius: 12px; border: 1px solid #bfdbfe;">
                    <h4 style="margin: 0 0 15px 0; color: #1e40af; display: flex; align-items: center; gap: 8px;">
                        <i class="fas fa-coins"></i> ASSETS
                    </h4>
                    
                    <!-- Current Assets -->
                    <div style="margin-bottom: 12px;">
                        <div style="font-weight: 600; color: #3b82f6; font-size: 11px; text-transform: uppercase; margin-bottom: 6px; letter-spacing: 0.5px;">
                            Current Assets
                        </div>
                        ${coaData.assets.current.map(item => `
                            <div style="display: flex; justify-content: space-between; padding: 6px 8px; background: white; border-radius: 6px; margin-bottom: 4px; font-size: 13px;">
                                <span style="color: #334155;">${item.name}</span>
                                <span style="font-family: monospace; font-weight: 500; color: #1e40af;">RM ${item.balance.toFixed(2)}</span>
                            </div>
                        `).join('')}
                    </div>
                    
                    <!-- Non-Current Assets -->
                    ${coaData.assets.nonCurrent.length > 0 ? `
                        <div style="margin-bottom: 12px;">
                            <div style="font-weight: 600; color: #3b82f6; font-size: 11px; text-transform: uppercase; margin-bottom: 6px; letter-spacing: 0.5px;">
                                Non-Current Assets
                            </div>
                            ${coaData.assets.nonCurrent.map(item => `
                                <div style="display: flex; justify-content: space-between; padding: 6px 8px; background: white; border-radius: 6px; margin-bottom: 4px; font-size: 13px;">
                                    <span style="color: #334155;">${item.name}</span>
                                    <span style="font-family: monospace; font-weight: 500; color: #1e40af;">RM ${item.balance.toFixed(2)}</span>
                                </div>
                            `).join('')}
                        </div>
                    ` : ''}
                    
                    <!-- Total Assets -->
                    <div style="border-top: 2px solid #2563eb; padding-top: 10px; margin-top: 10px;">
                        <div style="display: flex; justify-content: space-between; font-weight: 700; font-size: 14px;">
                            <span style="color: #1e40af;">TOTAL ASSETS</span>
                            <span style="font-family: monospace; color: #1e40af;">RM ${coaData.assets.total.toFixed(2)}</span>
                        </div>
                    </div>
                </div>
                
                <!-- RIGHT: LIABILITIES + EQUITY -->
                <div>
                    <!-- Liabilities -->
                    <div style="background: linear-gradient(135deg, #fef2f2 0%, #fecaca 100%); padding: 15px; border-radius: 12px; border: 1px solid #fca5a5; margin-bottom: 15px;">
                        <h4 style="margin: 0 0 15px 0; color: #991b1b; display: flex; align-items: center; gap: 8px;">
                            <i class="fas fa-file-invoice-dollar"></i> LIABILITIES
                        </h4>
                        
                        <!-- Current Liabilities -->
                        <div style="margin-bottom: 12px;">
                            <div style="font-weight: 600; color: #dc2626; font-size: 11px; text-transform: uppercase; margin-bottom: 6px; letter-spacing: 0.5px;">
                                Current Liabilities
                            </div>
                            ${coaData.liabilities.current.length > 0 ? coaData.liabilities.current.map(item => `
                                <div style="display: flex; justify-content: space-between; padding: 6px 8px; background: white; border-radius: 6px; margin-bottom: 4px; font-size: 13px;">
                                    <span style="color: #334155;">${item.name}</span>
                                    <span style="font-family: monospace; font-weight: 500; color: #991b1b;">RM ${item.balance.toFixed(2)}</span>
                                </div>
                            `).join('') : `
                                <div style="padding: 6px 8px; background: white; border-radius: 6px; font-size: 13px; color: #94a3b8; font-style: italic;">
                                    No current liabilities
                                </div>
                            `}
                        </div>
                        
                        <!-- Total Liabilities -->
                        <div style="border-top: 2px solid #dc2626; padding-top: 10px; margin-top: 10px;">
                            <div style="display: flex; justify-content: space-between; font-weight: 700; font-size: 14px;">
                                <span style="color: #991b1b;">TOTAL LIABILITIES</span>
                                <span style="font-family: monospace; color: #991b1b;">RM ${coaData.liabilities.total.toFixed(2)}</span>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Equity -->
                    <div style="background: linear-gradient(135deg, #f5f3ff 0%, #e9d5ff 100%); padding: 15px; border-radius: 12px; border: 1px solid #c4b5fd;">
                        <h4 style="margin: 0 0 15px 0; color: #5b21b6; display: flex; align-items: center; gap: 8px;">
                            <i class="fas fa-landmark"></i> OWNER'S EQUITY
                        </h4>
                        
                        ${coaData.equity.items.map(item => `
                            <div style="display: flex; justify-content: space-between; padding: 6px 8px; background: white; border-radius: 6px; margin-bottom: 4px; font-size: 13px;">
                                <span style="color: #334155;">${item.name}</span>
                                <span style="font-family: monospace; font-weight: 500; color: #5b21b6;">RM ${item.balance.toFixed(2)}</span>
                            </div>
                        `).join('')}
                        
                        <!-- Retained Earnings -->
                        <div style="display: flex; justify-content: space-between; padding: 6px 8px; background: #dcfce7; border-radius: 6px; margin-bottom: 4px; font-size: 13px;">
                            <span style="color: #166534;">Retained Earnings</span>
                            <span style="font-family: monospace; font-weight: 500; color: #166534;">RM ${coaData.equity.retainedEarnings.toFixed(2)}</span>
                        </div>
                        
                        <!-- Total Equity -->
                        <div style="border-top: 2px solid #7c3aed; padding-top: 10px; margin-top: 10px;">
                            <div style="display: flex; justify-content: space-between; font-weight: 700; font-size: 14px;">
                                <span style="color: #5b21b6;">TOTAL EQUITY</span>
                                <span style="font-family: monospace; color: #5b21b6;">RM ${coaData.equity.totalWithRetained.toFixed(2)}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Accounting Equation Box -->
            <div style="margin-top: 20px; background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%); padding: 20px; border-radius: 12px; text-align: center; border: 1px solid #cbd5e1;">
                <div style="font-size: 12px; color: #64748b; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 1px;">The Accounting Equation</div>
                <div style="font-size: 16px; font-weight: 600; display: flex; justify-content: center; align-items: center; flex-wrap: wrap; gap: 8px;">
                    <span style="background: #2563eb; color: white; padding: 8px 16px; border-radius: 8px;">Assets<br><span style="font-size: 14px;">RM ${coaData.assets.total.toFixed(2)}</span></span>
                    <span style="color: #64748b; font-size: 24px;">=</span>
                    <span style="background: #dc2626; color: white; padding: 8px 16px; border-radius: 8px;">Liabilities<br><span style="font-size: 14px;">RM ${coaData.liabilities.total.toFixed(2)}</span></span>
                    <span style="color: #64748b; font-size: 24px;">+</span>
                    <span style="background: #7c3aed; color: white; padding: 8px 16px; border-radius: 8px;">Equity<br><span style="font-size: 14px;">RM ${coaData.equity.totalWithRetained.toFixed(2)}</span></span>
                </div>
            </div>
            
            <!-- Income Statement Summary -->
            <div style="margin-top: 20px; background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 20px; border-radius: 12px; color: white;">
                <h4 style="margin: 0 0 15px 0; display: flex; align-items: center; gap: 8px;">
                    <i class="fas fa-chart-line"></i> Income Statement Summary
                </h4>
                <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; text-align: center;">
                    <div style="background: rgba(255,255,255,0.15); padding: 12px; border-radius: 8px;">
                        <div style="font-size: 11px; opacity: 0.9; text-transform: uppercase;">Revenue</div>
                        <div style="font-size: 18px; font-weight: 700;">RM ${coaData.incomeStatement.revenue.toFixed(2)}</div>
                    </div>
                    <div style="background: rgba(255,255,255,0.15); padding: 12px; border-radius: 8px;">
                        <div style="font-size: 11px; opacity: 0.9; text-transform: uppercase;">Expenses</div>
                        <div style="font-size: 18px; font-weight: 700;">RM ${coaData.incomeStatement.expenses.toFixed(2)}</div>
                    </div>
                    <div style="background: rgba(255,255,255,0.25); padding: 12px; border-radius: 8px;">
                        <div style="font-size: 11px; opacity: 0.9; text-transform: uppercase;">Net Income</div>
                        <div style="font-size: 18px; font-weight: 700;">RM ${coaData.incomeStatement.netIncome.toFixed(2)}</div>
                    </div>
                </div>
            </div>
            
            <!-- Professional Accounting Note -->
            <div style="margin-top: 15px; padding: 12px; background: #fefce8; border-radius: 8px; border-left: 4px solid #eab308; font-size: 12px; color: #713f12;">
                <i class="fas fa-info-circle"></i> <strong>Double-Entry Note:</strong> Every transaction affects at least two accounts. 
                Assets = Liabilities + Equity must always balance. Retained Earnings = Total Revenue - Total Expenses.
            </div>
        </div>
    `;
    
    container.innerHTML = html;
}

/**
 * Calculate Double Entry balance sheet from transactions (when no COA exists)
 */
function calculateDoubleEntryFromTransactions() {
    const transactions = getTransactionsFromStorage();
    const bills = getBillsFromStorage();
    const bankAccounts = JSON.parse(localStorage.getItem(BANK_ACCOUNTS_KEY)) || [];
    const creditCards = JSON.parse(localStorage.getItem('ezcubic_credit_cards')) || [];
    const manualBalances = JSON.parse(localStorage.getItem(MANUAL_BALANCES_KEY)) || {};
    
    // Calculate from transactions
    const totalIncome = transactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);
    
    const totalExpenses = transactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);
    
    const cashBalance = totalIncome - totalExpenses;
    
    // Calculate bank account totals
    let totalBankBalance = 0;
    bankAccounts.forEach(account => {
        totalBankBalance += parseFloat(account.balance) || 0;
    });
    
    // Calculate unpaid bills as Accounts Payable
    const accountsPayable = bills
        .filter(b => b.status !== 'paid')
        .reduce((sum, b) => sum + (parseFloat(b.amount) || 0), 0);
    
    // Calculate credit card balances
    let totalCreditCards = 0;
    creditCards.forEach(card => {
        totalCreditCards += parseFloat(card.balance) || 0;
    });
    
    // Get manual entries for fixed assets
    const equipment = manualBalances['bs-equipment'] || 0;
    const vehicle = manualBalances['bs-vehicle'] || 0;
    const furniture = manualBalances['bs-furniture'] || 0;
    const loan = manualBalances['bs-loan'] || 0;
    const carLoan = manualBalances['bs-car-loan'] || 0;
    const startingCapital = manualBalances['bs-starting-capital'] || 0;
    
    // Build the data structure
    const currentAssets = [
        { name: 'Cash (from Transactions)', balance: cashBalance },
        { name: 'Bank Accounts', balance: totalBankBalance }
    ];
    
    const nonCurrentAssets = [];
    if (equipment > 0) nonCurrentAssets.push({ name: 'Equipment', balance: equipment });
    if (vehicle > 0) nonCurrentAssets.push({ name: 'Vehicle', balance: vehicle });
    if (furniture > 0) nonCurrentAssets.push({ name: 'Furniture & Fixtures', balance: furniture });
    
    const currentLiabilities = [];
    if (accountsPayable > 0) currentLiabilities.push({ name: 'Accounts Payable (Unpaid Bills)', balance: accountsPayable });
    if (totalCreditCards > 0) currentLiabilities.push({ name: 'Credit Card Payable', balance: totalCreditCards });
    if (loan > 0) currentLiabilities.push({ name: 'Bank Loan', balance: loan });
    if (carLoan > 0) currentLiabilities.push({ name: 'Car Loan', balance: carLoan });
    
    const totalAssets = cashBalance + totalBankBalance + equipment + vehicle + furniture;
    const totalLiabilities = accountsPayable + totalCreditCards + loan + carLoan;
    const retainedEarnings = totalIncome - totalExpenses;
    const totalEquity = startingCapital + retainedEarnings;
    
    // Check if balanced
    const difference = totalAssets - (totalLiabilities + totalEquity);
    const isBalanced = Math.abs(difference) < 0.01;
    
    return {
        assets: {
            current: currentAssets,
            nonCurrent: nonCurrentAssets,
            total: totalAssets
        },
        liabilities: {
            current: currentLiabilities,
            nonCurrent: [],
            total: totalLiabilities
        },
        equity: {
            items: startingCapital > 0 ? [{ name: "Owner's Capital", balance: startingCapital }] : [],
            total: startingCapital,
            retainedEarnings: retainedEarnings,
            totalWithRetained: totalEquity
        },
        incomeStatement: {
            revenue: totalIncome,
            expenses: totalExpenses,
            netIncome: retainedEarnings
        },
        isBalanced: isBalanced,
        difference: difference
    };
}

// ==================== WINDOW EXPORTS ====================
window.calculateBalanceSheetFromCOA = calculateBalanceSheetFromCOA;
window.displayEnhancedBalanceSheet = displayEnhancedBalanceSheet;
window.calculateDoubleEntryFromTransactions = calculateDoubleEntryFromTransactions;
