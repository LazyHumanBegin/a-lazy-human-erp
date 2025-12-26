// ==================== BALANCE-SHEET-CALC.JS ====================
// Balance Sheet Calculation Functions - Detailed Balance Sheet
// Split from balance-sheet-core.js for better modularity

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

// ==================== WINDOW EXPORTS ====================
window.setBalanceSheetView = setBalanceSheetView;
window.loadDetailedBalanceSheet = loadDetailedBalanceSheet;
window.loadManualBalances = loadManualBalances;
window.updateManualBalance = updateManualBalance;
window.saveManualBalances = saveManualBalances;
window.calculateDetailedTotals = calculateDetailedTotals;
window.updateDetailedBalanceTotals = updateDetailedBalanceTotals;
window.saveDetailedBalanceSheet = saveDetailedBalanceSheet;
window.resetBalanceSheetInputs = resetBalanceSheetInputs;
