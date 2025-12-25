// ==================== BALANCE-SHEET-CORE.JS ====================
// Balance Sheet Core Functions (Simple + Detailed)
// Part A of balance-sheet.js split

// ==================== SIMPLE BALANCE SHEET ====================
function calculateSimpleBalanceSheet() {
    const transactions = getTransactionsFromStorage();
    const bills = getBillsFromStorage();
    
    const totalIncome = transactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + t.amount, 0);
    
    const totalExpenses = transactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0);
    
    const unpaidBills = bills
        .filter(b => b.status !== 'paid')
        .reduce((sum, b) => sum + b.amount, 0);
    
    const cashBalance = totalIncome - totalExpenses;
    const netWorth = cashBalance - unpaidBills;
    
    let financialHealth = 'Good';
    let healthColor = '#10b981';
    
    if (netWorth < 0) {
        financialHealth = 'Attention Needed';
        healthColor = '#ef4444';
    } else if (netWorth < totalExpenses * 0.5) {
        financialHealth = 'Monitor Closely';
        healthColor = '#f59e0b';
    }
    
    const cashFlowRatio = totalIncome > 0 ? (totalExpenses / totalIncome) : 0;
    
    return {
        cashBalance: cashBalance,
        whatIOwe: unpaidBills,
        netWorth: netWorth,
        financialHealth: financialHealth,
        healthColor: healthColor,
        cashFlowRatio: cashFlowRatio,
        moneyIn: totalIncome,
        moneyOut: totalExpenses,
        billsDue: unpaidBills,
        hasPositiveCashFlow: totalIncome > totalExpenses,
        hasBillsDue: unpaidBills > 0,
        isProfitable: netWorth > 0
    };
}

function displaySimpleBalanceSheet() {
    const data = calculateSimpleBalanceSheet();
    
    const html = `
        <div class="simple-balance-sheet">
            <h3 style="margin-bottom: 20px; color: #1e293b;">
                <i class="fas fa-chart-line"></i> My Financial Position
            </h3>
            
            <div class="balance-simple-view">
                <div class="balance-box assets">
                    <div class="balance-box-title assets">
                        <i class="fas fa-wallet"></i> Money I Have
                    </div>
                    <div class="balance-box-amount" style="color: #1e40af;">
                        RM ${data.cashBalance.toFixed(2)}
                    </div>
                    <div class="balance-box-subtitle">
                        Cash available in business
                    </div>
                </div>
                
                <div class="balance-box liabilities">
                    <div class="balance-box-title liabilities">
                        <i class="fas fa-credit-card"></i> Money I Owe
                    </div>
                    <div class="balance-box-amount" style="color: #b91c1c;">
                        RM ${data.whatIOwe.toFixed(2)}
                    </div>
                    <div class="balance-box-subtitle">
                        Bills that need to be paid
                    </div>
                </div>
            </div>
            
            <div class="net-worth-card">
                <div class="net-worth-label">
                    <i class="fas fa-star"></i> My Business Net Worth
                </div>
                <div class="net-worth-amount">
                    RM ${data.netWorth.toFixed(2)}
                </div>
                <div class="net-worth-status" style="background: ${data.healthColor}20; color: ${data.healthColor}; border: 1px solid ${data.healthColor}40;">
                    ${data.financialHealth}
                </div>
            </div>
            
            <div style="text-align: center; margin: 20px 0; color: #64748b;">
                <i class="fas fa-info-circle"></i> 
                Net Worth = Money I Have - Money I Owe
            </div>
            
            <div class="quick-balance-check">
                <h4>
                    <i class="fas fa-bolt"></i> Quick Financial Check
                </h4>
                <div class="quick-check-grid">
                    <div class="quick-check-item">
                        <div class="quick-check-value" style="color: #10b981;">
                            RM ${data.moneyIn.toFixed(2)}
                        </div>
                        <div class="quick-check-label">Money In</div>
                    </div>
                    <div class="quick-check-item">
                        <div class="quick-check-value" style="color: #ef4444;">
                            RM ${data.moneyOut.toFixed(2)}
                        </div>
                        <div class="quick-check-label">Money Out</div>
                    </div>
                    <div class="quick-check-item">
                        <div class="quick-check-value" style="color: ${data.hasPositiveCashFlow ? '#10b981' : '#ef4444'};">
                            ${data.hasPositiveCashFlow ? '✓' : '✗'}
                        </div>
                        <div class="quick-check-label">Positive Cash Flow</div>
                    </div>
                    <div class="quick-check-item">
                        <div class="quick-check-value" style="color: ${!data.hasBillsDue ? '#10b981' : '#f59e0b'};">
                            ${data.hasBillsDue ? 'RM ' + data.billsDue.toFixed(0) : '✓'}
                        </div>
                        <div class="quick-check-label">Bills Due</div>
                    </div>
                </div>
            </div>
            
            <div class="cash-flow-indicator">
                <h4>
                    <i class="fas fa-chart-line"></i> Cash Flow Health
                </h4>
                <div class="cash-flow-meter">
                    <span style="color: #ef4444; font-size: 12px;">Spending</span>
                    <div class="cash-flow-bar">
                        <div class="cash-flow-fill" style="width: ${Math.min(data.cashFlowRatio * 100, 100)}%"></div>
                        <div class="cash-flow-marker" style="left: ${Math.min(data.cashFlowRatio * 100, 100)}%; border-color: ${data.cashFlowRatio > 0.8 ? '#ef4444' : data.cashFlowRatio > 0.5 ? '#f59e0b' : '#10b981'}"></div>
                    </div>
                    <span style="color: #10b981; font-size: 12px;">Income</span>
                </div>
                <div class="cash-flow-labels">
                    <span>High Expenses</span>
                    <span>Balanced</span>
                    <span>Healthy</span>
                </div>
            </div>
            
            <div class="balance-tips">
                <h4>
                    <i class="fas fa-lightbulb"></i> Simple Tips
                </h4>
                <div class="balance-tip-item">
                    <i class="fas fa-check-circle"></i>
                    <div class="balance-tip-text">
                        <strong>Keep 3 months of expenses</strong> as emergency cash
                    </div>
                </div>
                <div class="balance-tip-item">
                    <i class="fas fa-check-circle"></i>
                    <div class="balance-tip-text">
                        <strong>Pay bills on time</strong> to avoid late fees
                    </div>
                </div>
                <div class="balance-tip-item">
                    <i class="fas fa-check-circle"></i>
                    <div class="balance-tip-text">
                        <strong>Review this monthly</strong> to track your progress
                    </div>
                </div>
            </div>
        </div>
    `;
    
    document.getElementById('simpleBalanceSummary').innerHTML = html;
}

function updateSimpleBalanceSheet() {
    const simpleBalanceSummary = document.getElementById('simpleBalanceSummary');
    
    if (!simpleBalanceSummary) return;
    
    displaySimpleBalanceSheet();
    
    const data = calculateSimpleBalanceSheet();
    const bsAssets = document.getElementById('bs-assets');
    const bsLiabilities = document.getElementById('bs-liabilities');
    const bsEquity = document.getElementById('bs-equity');
    
    if (bsAssets) bsAssets.textContent = data.cashBalance.toFixed(2);
    if (bsLiabilities) bsLiabilities.textContent = data.whatIOwe.toFixed(2);
    if (bsEquity) bsEquity.textContent = data.netWorth.toFixed(2);
}

function updateBalanceSheet() {
    const currentDate = new Date();
    const period = document.getElementById('balanceSheetDate')?.value || 'current';
    let asOfDate = currentDate;
    
    switch(period) {
        case 'last-month':
            asOfDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
            break;
        case 'last-quarter':
            const quarter = Math.floor((currentDate.getMonth() - 1) / 3);
            asOfDate = new Date(currentDate.getFullYear(), quarter * 3, 1);
            break;
        case 'last-year':
            asOfDate = new Date(currentDate.getFullYear() - 1, 11, 31);
            break;
    }
    
    let totalIncome = 0;
    let totalExpenses = 0;
    
    businessData.transactions.forEach(tx => {
        const txDate = parseDateSafe(tx.date);
        if (txDate <= asOfDate) {
            if (tx.type === 'income') {
                totalIncome += tx.amount;
            } else {
                totalExpenses += tx.amount;
            }
        }
    });
    
    const netProfit = totalIncome - totalExpenses;
    const assets = netProfit;
    const liabilities = calculateTotalLiabilities(asOfDate);
    const equity = assets - liabilities;
    
    document.getElementById('bs-assets').textContent = assets.toFixed(2);
    document.getElementById('bs-liabilities').textContent = liabilities.toFixed(2);
    document.getElementById('bs-equity').textContent = equity.toFixed(2);
}

function calculateTotalLiabilities(asOfDate) {
    let totalLiabilities = 0;
    businessData.bills.forEach(bill => {
        if (bill.status !== 'paid') {
            const dueDate = parseDateSafe(bill.dueDate);
            if (dueDate <= asOfDate) {
                totalLiabilities += bill.amount;
            }
        }
    });
    return totalLiabilities;
}

// ==================== EXPORT FUNCTIONS ====================
function exportSimpleBalanceSheet() {
    // Use the professional balance sheet export from pdf-export.js
    if (typeof generateBalanceSheetReport === 'function') {
        window.exportOptions = {
            type: 'balance',
            format: 'pdf',
            period: 'year'
        };
        generateBalanceSheetReport();
    } else {
        // Fallback to original if function not available
        const simpleBalanceView = document.getElementById('simpleBalanceView');
        if (!simpleBalanceView) {
            showNotification('No balance sheet content to export', 'error');
            return;
        }
        
        const balanceSheetContent = simpleBalanceView.cloneNode(true);
        const companyName = businessData.settings.businessName || 'My Business';
        const today = new Date().toLocaleDateString();
        
        const printDiv = document.createElement('div');
        printDiv.style.cssText = 'padding: 30px; background: white; font-family: Arial, sans-serif; max-width: 900px;';
        
        printDiv.innerHTML = `
            <div style="text-align: center; margin-bottom: 30px; border-bottom: 3px solid #2563eb; padding-bottom: 20px;">
                <h1 style="color: #2563eb; margin-bottom: 5px;">${escapeHTML(companyName)}</h1>
                <h2 style="color: #64748b; margin-bottom: 15px;">Financial Position Report</h2>
                <div style="color: #94a3b8;">Generated on ${escapeHTML(today)}</div>
            </div>
            ${balanceSheetContent.innerHTML}
        `;
        
        document.body.appendChild(printDiv);
        
        html2canvas(printDiv, {
            scale: 2,
            useCORS: true,
            logging: false,
            backgroundColor: '#ffffff'
        }).then(canvas => {
            const imgData = canvas.toDataURL('image/png');
            const link = document.createElement('a');
            link.href = imgData;
            link.download = `${companyName.replace(/\s+/g, '-')}-Financial-Position-${today.replace(/\//g, '-')}.png`;
            link.click();
            
            document.body.removeChild(printDiv);
            showNotification('Financial Position exported successfully!', 'success');
        }).catch(error => {
            console.error('Export failed:', error);
            document.body.removeChild(printDiv);
            showNotification('Failed to export financial position', 'error');
        });
    }
}

function exportBalanceSheetPDF() {
    const balanceSheetContent = document.getElementById('balanceSheetContent').cloneNode(true);
    const companyName = businessData.settings.businessName;
    const today = new Date().toLocaleDateString();
    
    const printDiv = document.createElement('div');
    printDiv.style.cssText = 'padding: 30px; background: white; font-family: Arial, sans-serif; max-width: 800px;';
    
    printDiv.innerHTML = `
        <div style="text-align: center; margin-bottom: 30px; border-bottom: 3px solid #2563eb; padding-bottom: 20px;">
            <h1 style="color: #2563eb; margin-bottom: 5px;">${escapeHTML(companyName)}</h1>
            <h2 style="color: #64748b; margin-bottom: 15px;">Balance Sheet</h2>
            <div style="color: #94a3b8;">Generated on ${escapeHTML(today)}</div>
        </div>
        ${balanceSheetContent.innerHTML}
    `;
    
    document.body.appendChild(printDiv);
    
    html2canvas(printDiv, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
    }).then(canvas => {
        const imgData = canvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.href = imgData;
        link.download = `${companyName.replace(/\s+/g, '-')}-Balance-Sheet-${today.replace(/\//g, '-')}.png`;
        link.click();
        
        document.body.removeChild(printDiv);
        showNotification('Balance Sheet exported successfully!', 'success');
    }).catch(error => {
        console.error('Export failed:', error);
        document.body.removeChild(printDiv);
        showNotification('Failed to export balance sheet', 'error');
    });
}

// ==================== DETAILED BALANCE SHEET ====================
function setBalanceSheetView(view) {
    try {
        // Update toggle buttons (now 3: simple=0, double-entry=1, history=2)
        document.querySelectorAll('.view-toggle-btn').forEach((btn, index) => {
            btn.classList.remove('active');
            if ((view === 'simple' && index === 0) || 
                (view === 'double-entry' && index === 1) ||
                (view === 'history' && index === 2)) {
                btn.classList.add('active');
            }
        });
        
        document.querySelectorAll('.balance-view').forEach(v => {
            v.classList.remove('active');
        });
        
        const viewIdMap = {
            'simple': 'simpleBalanceView',
            'double-entry': 'simpleBalanceView', // Reuse same container
            'history': 'historyBalanceView'
        };
        
        const viewElement = document.getElementById(viewIdMap[view]);
        if (viewElement) {
            viewElement.classList.add('active');
        }
        
        // Toggle visibility of detailed breakdown section
        const detailedSection = document.querySelector('.detailed-balance-sheet');
        if (detailedSection) {
            if (view === 'double-entry') {
                detailedSection.style.display = 'none';
            } else {
                detailedSection.style.display = 'block';
            }
        }
        
        if (view === 'history') {
            loadBalanceHistory();
        } else if (view === 'double-entry') {
            // Show double-entry balance sheet from Chart of Accounts
            displayEnhancedBalanceSheet();
        } else if (view === 'simple') {
            // Load both simple summary and detailed view (combined)
            try {
                displaySimpleBalanceSheet();
                loadDetailedBalanceSheet();
                loadCreditCards();
                updateDetailedBalanceTotals();
            } catch (e) {
                console.log('Balance sheet update skipped:', e.message);
            }
        }
    } catch (error) {
        console.error('Error in setBalanceSheetView:', error);
    }
}

function loadDetailedBalanceSheet() {
    try {
        loadBankAccounts();
        loadCreditCards();
        
        const manualBalances = JSON.parse(localStorage.getItem(MANUAL_BALANCES_KEY)) || {};
        
        Object.keys(manualBalances).forEach(key => {
            const input = document.getElementById(key);
            if (input) {
                input.value = manualBalances[key] || '';
            }
        });
        
        updateDetailedBalanceTotals();
        loadReceivables();
        loadCurrentLiabilities();
    } catch (error) {
        console.error('Error loading detailed balance sheet:', error);
    }
}

function loadManualBalances() {
    const manualBalances = JSON.parse(localStorage.getItem(MANUAL_BALANCES_KEY)) || {};
    
    Object.keys(manualBalances).forEach(key => {
        const input = document.getElementById(key);
        if (input) {
            input.value = manualBalances[key];
        }
    });
}

function updateManualBalance(inputId) {
    if (inputId) {
        const input = document.getElementById(inputId);
        if (input) {
            const value = parseFloat(input.value) || 0;
            const manualBalances = JSON.parse(localStorage.getItem(MANUAL_BALANCES_KEY)) || {};
            manualBalances[inputId] = value;
            localStorage.setItem(MANUAL_BALANCES_KEY, JSON.stringify(manualBalances));
        }
    }
    
    updateDetailedBalanceTotals();
}

function saveManualBalances() {
    const inputs = document.querySelectorAll('.balance-input');
    const manualBalances = {};
    
    inputs.forEach(input => {
        manualBalances[input.id] = parseFloat(input.value) || 0;
    });
    
    localStorage.setItem(MANUAL_BALANCES_KEY, JSON.stringify(manualBalances));
    showNotification('Manual balances saved successfully!', 'success');
    
    saveBalanceSnapshot();
}

function calculateDetailedTotals() {
    const transactions = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    const manualBalances = JSON.parse(localStorage.getItem(MANUAL_BALANCES_KEY)) || {};
    
    let totalIncome = 0;
    let totalExpenses = 0;
    let accountsReceivable = 0;
    let accountsPayable = 0;
    
    transactions.forEach(t => {
        if (t.type === 'income') {
            totalIncome += parseFloat(t.amount) || 0;
            if (t.status === 'pending') {
                accountsReceivable += parseFloat(t.amount) || 0;
            }
        } else if (t.type === 'expense') {
            totalExpenses += parseFloat(t.amount) || 0;
            if (t.status === 'pending') {
                accountsPayable += parseFloat(t.amount) || 0;
            }
        }
    });
    
    const calculatedCash = totalIncome - totalExpenses;
    
    const bankAccount = manualBalances['bank-account-input'] || 0;
    const inventory = manualBalances['inventory-input'] || 0;
    const fixedAssets = manualBalances['fixed-assets-input'] || 0;
    const otherAssets = manualBalances['other-assets-input'] || 0;
    const bankLoan = manualBalances['bank-loan-input'] || 0;
    const otherLiabilities = manualBalances['other-liabilities-input'] || 0;
    const ownerCapital = manualBalances['owner-capital-input'] || 0;
    const drawings = manualBalances['drawings-input'] || 0;
    
    const totalAssets = calculatedCash + bankAccount + accountsReceivable + inventory + fixedAssets + otherAssets;
    const totalLiabilities = accountsPayable + bankLoan + otherLiabilities;
    const retainedEarnings = totalIncome - totalExpenses;
    const totalEquity = ownerCapital + retainedEarnings - drawings;
    
    updateElementText('total-assets', formatCurrency(totalAssets));
    updateElementText('total-liabilities', formatCurrency(totalLiabilities));
    updateElementText('total-equity', formatCurrency(totalEquity));
    updateElementText('retained-earnings', formatCurrency(retainedEarnings));
    
    const balanceCheck = totalAssets - (totalLiabilities + totalEquity);
    if (Math.abs(balanceCheck) > 0.01) {
        console.log('Balance sheet does not balance. Difference:', balanceCheck);
    }
    
    return {
        totalAssets,
        totalLiabilities,
        totalEquity,
        retainedEarnings
    };
}

function updateDetailedBalanceTotals() {
    try {
        let transactions = businessData.transactions || [];
        if (transactions.length === 0) {
            const savedData = localStorage.getItem(STORAGE_KEY);
            if (savedData) {
                const parsed = JSON.parse(savedData);
                transactions = parsed.transactions || [];
            }
        }
        
        const bankAccounts = JSON.parse(localStorage.getItem(BANK_ACCOUNTS_KEY)) || [];
        const creditCards = JSON.parse(localStorage.getItem('ezcubic_credit_cards')) || [];
        
        let cashFromTransactions = 0;
        transactions.forEach(t => {
            if (t.type === 'income') {
                cashFromTransactions += parseFloat(t.amount) || 0;
            } else if (t.type === 'expense') {
                cashFromTransactions -= parseFloat(t.amount) || 0;
            }
        });
        
        const cashElement = document.getElementById('bs-cash');
        if (cashElement) {
            cashElement.textContent = 'RM ' + cashFromTransactions.toFixed(2);
        }
        
        let totalBankBalance = 0;
        bankAccounts.forEach(account => {
            const input = document.getElementById(account.id);
            if (input) {
                totalBankBalance += parseFloat(input.value) || 0;
            } else {
                totalBankBalance += parseFloat(account.balance) || 0;
            }
        });
        
        let fixedAssets = 0;
        const assetInputs = ['bs-equipment', 'bs-vehicle', 'bs-furniture'];
        assetInputs.forEach(id => {
            const input = document.getElementById(id);
            if (input) {
                fixedAssets += parseFloat(input.value) || 0;
            }
        });
        
        const totalAssets = cashFromTransactions + totalBankBalance + fixedAssets;
        
        // Calculate liabilities including credit cards
        let totalLiabilities = 0;
        const liabilityInputs = ['bs-loan', 'bs-car-loan'];
        liabilityInputs.forEach(id => {
            const input = document.getElementById(id);
            if (input) {
                totalLiabilities += parseFloat(input.value) || 0;
            }
        });
        
        // Add credit card balances to liabilities
        creditCards.forEach(card => {
            const input = document.getElementById(card.id);
            if (input) {
                totalLiabilities += parseFloat(input.value) || 0;
            } else {
                totalLiabilities += parseFloat(card.balance) || 0;
            }
        });
        
        // Get editable profit values
        const currentProfitInput = document.getElementById('bs-current-profit');
        const accumulatedProfitInput = document.getElementById('bs-accumulated-profit');
        const currentProfit = currentProfitInput ? (parseFloat(currentProfitInput.value) || cashFromTransactions) : cashFromTransactions;
        const accumulatedProfit = accumulatedProfitInput ? (parseFloat(accumulatedProfitInput.value) || 0) : 0;
        
        const startingCapital = parseFloat(document.getElementById('bs-starting-capital')?.value) || 0;
        const additionalInvestment = parseFloat(document.getElementById('bs-additional-investment')?.value) || 0;
        const totalEquity = startingCapital + additionalInvestment + currentProfit + accumulatedProfit;
        
        const totalAssetsEl = document.getElementById('detailed-total-assets');
        if (totalAssetsEl) {
            totalAssetsEl.textContent = 'RM ' + totalAssets.toFixed(2);
        }
        
        const totalLiabilitiesEl = document.getElementById('detailed-total-liabilities');
        if (totalLiabilitiesEl) {
            totalLiabilitiesEl.textContent = 'RM ' + totalLiabilities.toFixed(2);
        }
        
        const totalEquityEl = document.getElementById('detailed-total-equity');
        if (totalEquityEl) {
            totalEquityEl.textContent = 'RM ' + totalEquity.toFixed(2);
        }
        
        const bsAssetsEl = document.getElementById('bs-assets');
        if (bsAssetsEl) {
            bsAssetsEl.textContent = totalAssets.toFixed(2);
        }
        
        const bsLiabilitiesEl = document.getElementById('bs-liabilities');
        if (bsLiabilitiesEl) {
            bsLiabilitiesEl.textContent = totalLiabilities.toFixed(2);
        }
        
        const bsEquityEl = document.getElementById('bs-equity');
        if (bsEquityEl) {
            bsEquityEl.textContent = (totalAssets - totalLiabilities).toFixed(2);
        }
        
        const balanceCheckResult = document.getElementById('balance-check-result');
        const difference = totalAssets - (totalLiabilities + totalEquity);
        if (balanceCheckResult) {
            if (Math.abs(difference) < 0.01) {
                balanceCheckResult.innerHTML = '✓ Balanced';
                balanceCheckResult.style.color = '#10b981';
            } else {
                balanceCheckResult.innerHTML = '✗ Difference: RM ' + Math.abs(difference).toFixed(2);
                balanceCheckResult.style.color = '#ef4444';
            }
        }
        
        console.log('Balance Totals Updated:', { totalAssets, totalLiabilities, totalEquity });
    } catch (error) {
        console.error('Error updating balance totals:', error);
    }
}

function saveDetailedBalanceSheet() {
    try {
        const balanceInputs = document.querySelectorAll('.balance-input');
        const manualBalances = {};
        
        balanceInputs.forEach(input => {
            if (input.id) {
                manualBalances[input.id] = parseFloat(input.value) || 0;
            }
        });
        
        localStorage.setItem(MANUAL_BALANCES_KEY, JSON.stringify(manualBalances));
        
        const bankAccounts = JSON.parse(localStorage.getItem(BANK_ACCOUNTS_KEY)) || [];
        bankAccounts.forEach(account => {
            const input = document.getElementById(account.id);
            if (input) {
                account.balance = parseFloat(input.value) || 0;
            }
        });
        localStorage.setItem(BANK_ACCOUNTS_KEY, JSON.stringify(bankAccounts));
        
        updateDetailedBalanceTotals();
        saveBalanceHistorySnapshot();
        
        showNotification('Balance sheet saved successfully!', 'success');
    } catch (error) {
        console.error('Error saving balance sheet:', error);
        showNotification('Error saving balance sheet', 'error');
    }
}

function resetBalanceSheetInputs() {
    if (!confirm('Are you sure you want to reset all balance sheet inputs? This will clear all manually entered values.')) {
        return;
    }
    
    const balanceInputs = document.querySelectorAll('.balance-input');
    balanceInputs.forEach(input => {
        input.value = '';
    });
    
    localStorage.removeItem(MANUAL_BALANCES_KEY);
    updateDetailedBalanceTotals();
    showNotification('Balance sheet inputs reset', 'success');
}

// Global scope exports for Part A
window.calculateSimpleBalanceSheet = calculateSimpleBalanceSheet;
window.displaySimpleBalanceSheet = displaySimpleBalanceSheet;
window.updateSimpleBalanceSheet = updateSimpleBalanceSheet;
window.updateBalanceSheet = updateBalanceSheet;
window.calculateTotalLiabilities = calculateTotalLiabilities;
window.exportSimpleBalanceSheet = exportSimpleBalanceSheet;
window.exportBalanceSheetPDF = exportBalanceSheetPDF;
window.setBalanceSheetView = setBalanceSheetView;
window.loadDetailedBalanceSheet = loadDetailedBalanceSheet;
window.loadManualBalances = loadManualBalances;
window.updateManualBalance = updateManualBalance;
window.saveManualBalances = saveManualBalances;
window.calculateDetailedTotals = calculateDetailedTotals;
window.updateDetailedBalanceTotals = updateDetailedBalanceTotals;
window.saveDetailedBalanceSheet = saveDetailedBalanceSheet;
window.resetBalanceSheetInputs = resetBalanceSheetInputs;
