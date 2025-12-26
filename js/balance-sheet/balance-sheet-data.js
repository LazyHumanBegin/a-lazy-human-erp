// ==================== BALANCE-SHEET-DATA.JS ====================
// Balance Sheet Data Functions - Simple Balance Sheet & Export
// Split from balance-sheet-core.js for better modularity

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

// ==================== WINDOW EXPORTS ====================
window.calculateSimpleBalanceSheet = calculateSimpleBalanceSheet;
window.displaySimpleBalanceSheet = displaySimpleBalanceSheet;
window.updateSimpleBalanceSheet = updateSimpleBalanceSheet;
window.updateBalanceSheet = updateBalanceSheet;
window.calculateTotalLiabilities = calculateTotalLiabilities;
window.exportSimpleBalanceSheet = exportSimpleBalanceSheet;
window.exportBalanceSheetPDF = exportBalanceSheetPDF;
