// ==================== BALANCE-SHEET.JS ====================
// Balance Sheet Functions (Simple + Detailed)

// ==================== SIMPLE BALANCE SHEET ====================
function calculateSimpleBalanceSheet() {
    const transactions = getTransactionsFromStorage() || [];
    const bills = getBillsFromStorage() || [];
    
    // Validate arrays
    if (!Array.isArray(transactions)) {
        console.warn('Invalid transactions data, using empty array');
        transactions = [];
    }
    if (!Array.isArray(bills)) {
        console.warn('Invalid bills data, using empty array');
        bills = [];
    }
    
    const totalIncome = transactions
        .filter(t => t && t.type === 'income' && typeof t.amount === 'number')
        .reduce((sum, t) => sum + t.amount, 0);
    
    const totalExpenses = transactions
        .filter(t => t && t.type === 'expense' && typeof t.amount === 'number')
        .reduce((sum, t) => sum + t.amount, 0);
    
    const unpaidBills = bills
        .filter(b => b && b.status !== 'paid' && typeof b.amount === 'number')
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
    
    if (!simpleBalanceSummary) {
        console.warn('Simple balance summary element not found');
        return;
    }
    
    try {
        displaySimpleBalanceSheet();
        
        const data = calculateSimpleBalanceSheet();
        const bsAssets = document.getElementById('bs-assets');
        const bsLiabilities = document.getElementById('bs-liabilities');
        const bsEquity = document.getElementById('bs-equity');
        
        if (bsAssets) bsAssets.textContent = data.cashBalance.toFixed(2);
        if (bsLiabilities) bsLiabilities.textContent = data.whatIOwe.toFixed(2);
        if (bsEquity) bsEquity.textContent = data.netWorth.toFixed(2);
    } catch (error) {
        console.error('Error updating simple balance sheet:', error);
        simpleBalanceSummary.innerHTML = `
            <div style="padding: 20px; text-align: center; color: #ef4444;">
                <i class="fas fa-exclamation-triangle"></i>
                <p>Unable to load balance sheet. Please check your data.</p>
            </div>
        `;
    }
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
    
    // Validate businessData exists
    if (!businessData || !businessData.transactions || !Array.isArray(businessData.transactions)) {
        console.warn('No transaction data for balance sheet');
        businessData = businessData || { transactions: [], bills: [] };
    }
    
    businessData.transactions.forEach(tx => {
        if (!tx || !tx.date) return; // Skip invalid transactions
        const txDate = parseDateSafe(tx.date);
        if (txDate <= asOfDate) {
            const amount = parseFloat(tx.amount) || 0;
            if (tx.type === 'income') {
                totalIncome += amount;
            } else {
                totalExpenses += amount;
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
    
    // Validate businessData and bills exist
    if (!businessData || !businessData.bills || !Array.isArray(businessData.bills)) {
        console.warn('No bills data for liabilities calculation');
        return 0;
    }
    
    businessData.bills.forEach(bill => {
        if (!bill || !bill.dueDate) return; // Skip invalid bills
        if (bill.status !== 'paid') {
            const dueDate = parseDateSafe(bill.dueDate);
            if (dueDate <= asOfDate) {
                const amount = parseFloat(bill.amount) || 0;
                totalLiabilities += amount;
            }
        }
    });
    return totalLiabilities;
}

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

// ==================== BALANCE HISTORY ====================
function saveBalanceSnapshot() {
    const totals = calculateDetailedTotals();
    const history = JSON.parse(localStorage.getItem(BALANCE_HISTORY_KEY)) || [];
    
    const snapshot = {
        date: new Date().toISOString(),
        assets: totals.totalAssets,
        liabilities: totals.totalLiabilities,
        equity: totals.totalEquity
    };
    
    history.push(snapshot);
    if (history.length > 12) {
        history.shift();
    }
    
    localStorage.setItem(BALANCE_HISTORY_KEY, JSON.stringify(history));
}

function saveBalanceHistorySnapshot() {
    try {
        const transactions = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
        const bankAccounts = JSON.parse(localStorage.getItem(BANK_ACCOUNTS_KEY)) || [];
        
        let cashFromTransactions = 0;
        transactions.forEach(t => {
            if (t.type === 'income') {
                cashFromTransactions += parseFloat(t.amount) || 0;
            } else if (t.type === 'expense') {
                cashFromTransactions -= parseFloat(t.amount) || 0;
            }
        });
        
        let totalBankBalance = 0;
        bankAccounts.forEach(account => {
            totalBankBalance += parseFloat(account.balance) || 0;
        });
        
        let totalAssets = cashFromTransactions + totalBankBalance;
        const assetInputs = ['bs-equipment', 'bs-vehicle', 'bs-furniture'];
        assetInputs.forEach(id => {
            const input = document.getElementById(id);
            if (input) {
                totalAssets += parseFloat(input.value) || 0;
            }
        });
        
        let totalLiabilities = 0;
        const liabilityInputs = ['bs-loan', 'bs-car-loan', 'bs-creditcard1'];
        liabilityInputs.forEach(id => {
            const input = document.getElementById(id);
            if (input) {
                totalLiabilities += parseFloat(input.value) || 0;
            }
        });
        
        const startingCapital = parseFloat(document.getElementById('bs-starting-capital')?.value) || 0;
        const additionalInvestment = parseFloat(document.getElementById('bs-additional-investment')?.value) || 0;
        const currentProfit = cashFromTransactions;
        const totalEquity = startingCapital + additionalInvestment + currentProfit;
        
        const history = JSON.parse(localStorage.getItem(BALANCE_HISTORY_KEY)) || [];
        const snapshot = {
            date: new Date().toISOString(),
            assets: totalAssets,
            liabilities: totalLiabilities,
            equity: totalEquity
        };
        
        history.push(snapshot);
        if (history.length > 12) {
            history.shift();
        }
        
        localStorage.setItem(BALANCE_HISTORY_KEY, JSON.stringify(history));
    } catch (error) {
        console.error('Error saving balance history:', error);
    }
}

function loadBalanceHistory() {
    const history = JSON.parse(localStorage.getItem(BALANCE_HISTORY_KEY)) || [];
    const transactions = businessData.transactions || [];
    
    const chartContainer = document.getElementById('balanceHistoryChart');
    const tableContainer = document.getElementById('balanceHistoryTable');
    
    // Show transaction-based history if no manual snapshots
    if (history.length === 0) {
        // Create monthly summary from transactions
        if (transactions.length === 0) {
            if (chartContainer) {
                chartContainer.innerHTML = '<p style="text-align: center; color: #64748b; padding: 40px;"><i class="fas fa-history" style="font-size: 48px; color: #e2e8f0; display: block; margin-bottom: 15px;"></i>No transaction history yet.<br>Start recording transactions to see your financial history.</p>';
            }
            if (tableContainer) {
                tableContainer.innerHTML = '';
            }
            return;
        }
        
        // Generate history from transactions
        const monthlyHistory = generateMonthlyHistoryFromTransactions(transactions);
        createBalanceHistoryChart(monthlyHistory);
        createTransactionHistoryTable(transactions);
    } else {
        createBalanceHistoryChart(history);
        createBalanceHistoryTable(history);
    }
}

function generateMonthlyHistoryFromTransactions(transactions) {
    const monthlyData = {};
    
    transactions.forEach(t => {
        const date = new Date(t.date);
        const monthKey = date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0');
        
        if (!monthlyData[monthKey]) {
            monthlyData[monthKey] = {
                date: new Date(date.getFullYear(), date.getMonth(), 1).toISOString(),
                income: 0,
                expenses: 0
            };
        }
        
        if (t.type === 'income') {
            monthlyData[monthKey].income += parseFloat(t.amount) || 0;
        } else {
            monthlyData[monthKey].expenses += parseFloat(t.amount) || 0;
        }
    });
    
    // Convert to array and calculate running totals
    const sortedMonths = Object.keys(monthlyData).sort();
    let runningAssets = 0;
    let runningLiabilities = 0;
    
    return sortedMonths.map(month => {
        runningAssets += monthlyData[month].income;
        runningLiabilities += monthlyData[month].expenses;
        
        return {
            date: monthlyData[month].date,
            assets: runningAssets,
            liabilities: runningLiabilities,
            equity: runningAssets - runningLiabilities
        };
    });
}

function createTransactionHistoryTable(transactions) {
    const container = document.getElementById('balanceHistoryTable');
    if (!container) return;
    
    // Sort transactions by date (newest first)
    const sortedTransactions = [...transactions].sort((a, b) => new Date(b.date) - new Date(a.date));
    
    let html = `
        <h4 style="margin-bottom: 15px; color: #1e293b;"><i class="fas fa-list"></i> Recent Transactions</h4>
        <table class="history-table">
            <thead>
                <tr>
                    <th>Date</th>
                    <th>Description</th>
                    <th>Type</th>
                    <th>Amount (RM)</th>
                </tr>
            </thead>
            <tbody>
    `;
    
    // Show last 20 transactions
    sortedTransactions.slice(0, 20).forEach(tx => {
        const date = new Date(tx.date);
        const formattedDate = date.toLocaleDateString('en-MY', { 
            day: 'numeric', 
            month: 'short', 
            year: 'numeric' 
        });
        
        const typeClass = tx.type === 'income' ? 'assets-cell' : 'liabilities-cell';
        const typeLabel = tx.type === 'income' ? 'Income' : 'Expense';
        const amountPrefix = tx.type === 'income' ? '+' : '-';
        
        html += `
            <tr>
                <td>${formattedDate}</td>
                <td>${escapeHTML(tx.description || 'No description')}</td>
                <td><span style="padding: 2px 8px; border-radius: 4px; font-size: 12px; background: ${tx.type === 'income' ? '#d1fae5' : '#fee2e2'}; color: ${tx.type === 'income' ? '#065f46' : '#991b1b'};">${typeLabel}</span></td>
                <td class="${typeClass}">${amountPrefix}${formatCurrency(tx.amount)}</td>
            </tr>
        `;
    });
    
    if (sortedTransactions.length > 20) {
        html += `<tr><td colspan="4" style="text-align: center; color: #64748b; padding: 15px;">Showing 20 of ${sortedTransactions.length} transactions</td></tr>`;
    }
    
    html += '</tbody></table>';
    container.innerHTML = html;
}

function createBalanceHistoryChart(history) {
    const container = document.getElementById('balanceHistoryChart');
    if (!container) return;
    
    container.innerHTML = '<canvas id="balance-history-chart"></canvas>';
    
    const ctx = document.getElementById('balance-history-chart');
    if (!ctx) return;
    
    const labels = history.map(h => {
        const date = new Date(h.date);
        return date.toLocaleDateString('en-MY', { month: 'short', year: 'numeric' });
    });
    
    new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Assets',
                    data: history.map(h => h.assets),
                    borderColor: '#2563eb',
                    backgroundColor: 'rgba(37, 99, 235, 0.1)',
                    fill: true,
                    tension: 0.4
                },
                {
                    label: 'Liabilities',
                    data: history.map(h => h.liabilities),
                    borderColor: '#ef4444',
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    fill: true,
                    tension: 0.4
                },
                {
                    label: 'Equity',
                    data: history.map(h => h.equity),
                    borderColor: '#10b981',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    fill: true,
                    tension: 0.4
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top'
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return context.dataset.label + ': ' + formatCurrency(context.raw);
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return 'RM ' + value.toLocaleString();
                        }
                    }
                }
            }
        }
    });
}

function createBalanceHistoryTable(history) {
    const container = document.getElementById('balanceHistoryTable');
    if (!container) return;
    
    let html = `
        <table class="history-table">
            <thead>
                <tr>
                    <th>Date</th>
                    <th>Total Assets</th>
                    <th>Total Liabilities</th>
                    <th>Total Equity</th>
                    <th>Change</th>
                </tr>
            </thead>
            <tbody>
    `;
    
    const reversedHistory = [...history].reverse();
    
    reversedHistory.forEach((entry, index) => {
        const date = new Date(entry.date);
        const formattedDate = date.toLocaleDateString('en-MY', { 
            day: 'numeric', 
            month: 'short', 
            year: 'numeric' 
        });
        
        let changeHtml = '-';
        if (index < reversedHistory.length - 1) {
            const prevEntry = reversedHistory[index + 1];
            const change = entry.equity - prevEntry.equity;
            const changePercent = prevEntry.equity !== 0 ? ((change / prevEntry.equity) * 100).toFixed(1) : 0;
            const changeClass = change >= 0 ? 'positive' : 'negative';
            const changeSign = change >= 0 ? '+' : '';
            changeHtml = `<span class="history-change ${changeClass}">${changeSign}${changePercent}%</span>`;
        }
        
        html += `
            <tr>
                <td>${formattedDate}</td>
                <td class="assets-cell">${formatCurrency(entry.assets)}</td>
                <td class="liabilities-cell">${formatCurrency(entry.liabilities)}</td>
                <td class="equity-cell">${formatCurrency(entry.equity)}</td>
                <td>${changeHtml}</td>
            </tr>
        `;
    });
    
    html += '</tbody></table>';
    container.innerHTML = html;
}

function clearBalanceHistory() {
    if (confirm('Are you sure you want to clear all balance history? This cannot be undone.')) {
        localStorage.removeItem(BALANCE_HISTORY_KEY);
        loadBalanceHistory();
        showNotification('Balance history cleared', 'success');
    }
}

// ==================== RECEIVABLES & LIABILITIES ====================
function loadReceivables() {
    const bills = JSON.parse(localStorage.getItem('ezcubic_bills')) || [];
    const container = document.getElementById('receivablesList');
    if (!container) return;
    
    const receivables = bills.filter(b => b.type === 'income' && b.status !== 'paid');
    
    if (receivables.length === 0) {
        container.innerHTML = '<div class="balance-item"><span style="color: #64748b;">No pending receivables</span><span class="balance-amount">RM 0.00</span></div>';
        return;
    }
    
    let html = '';
    let total = 0;
    receivables.forEach(bill => {
        const amount = parseFloat(bill.amount) || 0;
        total += amount;
        html += `
            <div class="balance-item">
                <span>${bill.description || bill.name}</span>
                <span class="balance-amount">${formatCurrency(amount)}</span>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

function loadCurrentLiabilities() {
    const bills = JSON.parse(localStorage.getItem('ezcubic_bills')) || [];
    const container = document.getElementById('currentLiabilities');
    if (!container) return;
    
    const payables = bills.filter(b => b.type === 'expense' && b.status !== 'paid');
    
    if (payables.length === 0) {
        container.innerHTML = '<div class="balance-item"><span style="color: #64748b;">No pending bills</span><span class="balance-amount">RM 0.00</span></div>';
        return;
    }
    
    let html = '';
    payables.forEach(bill => {
        const amount = parseFloat(bill.amount) || 0;
        html += `
            <div class="balance-item">
                <span>${bill.description || bill.name}</span>
                <span class="balance-amount">${formatCurrency(amount)}</span>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

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

// Global scope exports
window.calculateSimpleBalanceSheet = calculateSimpleBalanceSheet;
window.displaySimpleBalanceSheet = displaySimpleBalanceSheet;
window.updateSimpleBalanceSheet = updateSimpleBalanceSheet;
window.exportSimpleBalanceSheet = exportSimpleBalanceSheet;
window.setBalanceSheetView = setBalanceSheetView;
window.loadDetailedBalanceSheet = loadDetailedBalanceSheet;
window.updateManualBalance = updateManualBalance;
window.updateDetailedBalanceTotals = updateDetailedBalanceTotals;
window.saveDetailedBalanceSheet = saveDetailedBalanceSheet;
window.resetBalanceSheetInputs = resetBalanceSheetInputs;
window.saveBalanceSnapshot = saveBalanceSnapshot;
window.loadBalanceHistory = loadBalanceHistory;
window.clearBalanceHistory = clearBalanceHistory;
window.calculateBalanceSheetFromCOA = calculateBalanceSheetFromCOA;
window.displayEnhancedBalanceSheet = displayEnhancedBalanceSheet;
window.calculateDoubleEntryFromTransactions = calculateDoubleEntryFromTransactions;
