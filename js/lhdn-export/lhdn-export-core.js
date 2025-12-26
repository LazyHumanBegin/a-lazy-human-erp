/**
 * EZCubic ERP - LHDN Export Core Module
 * Data generation, tax calculations, utilities
 * Version: 2.3.0 - Split from lhdn-export.js
 */

// ==================== DATA GENERATION ====================

function generateIncomeStatement(fromDate, toDate) {
    const transactions = (businessData?.transactions || window.transactions || []).filter(tx => {
        const txDate = new Date(tx.date);
        return txDate >= new Date(fromDate) && txDate <= new Date(toDate);
    });
    
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
    
    const taxableIncome = incomeData.netProfit;
    let estimatedTax = 0;
    
    // Malaysian progressive tax rates (individuals)
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
    
    if (history.length > 20) history.pop();
    
    localStorage.setItem('ezcubic_export_history', JSON.stringify(history));
    
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

// ==================== WINDOW EXPORTS ====================
window.generateIncomeStatement = generateIncomeStatement;
window.generateBalanceSheetData = generateBalanceSheetData;
window.generateTaxSummary = generateTaxSummary;
window.generateGeneralLedger = generateGeneralLedger;
window.generateAuditTrailData = generateAuditTrailData;
window.downloadTextFile = downloadTextFile;
window.downloadCSVFile = downloadCSVFile;
window.saveExportHistory = saveExportHistory;
window.renderExportHistory = renderExportHistory;
