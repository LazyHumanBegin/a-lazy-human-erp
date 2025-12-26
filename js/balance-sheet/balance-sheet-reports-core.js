// ==================== BALANCE-SHEET-REPORTS-CORE.JS ====================
// Balance Sheet History, Receivables & Liabilities Functions
// Part 1 of balance-sheet-reports.js split

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

// ==================== WINDOW EXPORTS ====================
window.saveBalanceSnapshot = saveBalanceSnapshot;
window.saveBalanceHistorySnapshot = saveBalanceHistorySnapshot;
window.loadBalanceHistory = loadBalanceHistory;
window.generateMonthlyHistoryFromTransactions = generateMonthlyHistoryFromTransactions;
window.createTransactionHistoryTable = createTransactionHistoryTable;
window.createBalanceHistoryChart = createBalanceHistoryChart;
window.createBalanceHistoryTable = createBalanceHistoryTable;
window.clearBalanceHistory = clearBalanceHistory;
window.loadReceivables = loadReceivables;
window.loadCurrentLiabilities = loadCurrentLiabilities;
