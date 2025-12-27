// ==================== DASHBOARD.JS ====================
// Dashboard and Charts Functions

// ==================== MAIN DASHBOARD UPDATE ====================
// Export functions to window
window.updateDashboard = updateDashboard;
window.updateBalanceEquation = updateBalanceEquation;
window.loadRecentTransactions = loadRecentTransactions;
window.loadUpcomingBills = loadUpcomingBills;

function updateDashboard() {
    // Debug: Check businessData state
    console.log('🟢 updateDashboard called');
    console.log('🟢 businessData exists:', typeof businessData !== 'undefined');
    console.log('🟢 window.businessData exists:', typeof window.businessData !== 'undefined');
    console.log('🟢 transactions count:', (window.businessData?.transactions || businessData?.transactions || []).length);
    
    // Use window.businessData to ensure we get the correct reference
    const data = window.businessData || businessData;
    
    // Update company name in UI first (welcome message, page title, dashboard header)
    if (typeof updateCompanyNameInUI === 'function') updateCompanyNameInUI();
    
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;
    
    // Update current date display
    const currentDateEl = document.getElementById('currentDate');
    if (currentDateEl) {
        const today = new Date();
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        currentDateEl.textContent = today.toLocaleDateString('en-MY', options);
    }
    
    let totalIncome = 0;
    let totalExpenses = 0;
    let monthIncome = 0;
    let monthExpenses = 0;
    let prevMonthIncome = 0;
    let prevMonthExpenses = 0;
    
    // Use data reference (window.businessData or businessData)
    const transactions = data.transactions || [];
    console.log('🟢 Processing', transactions.length, 'transactions for dashboard');
    
    transactions.forEach(tx => {
        const txDate = parseDateSafe(tx.date);
        const txMonth = txDate.getMonth();
        const txYear = txDate.getFullYear();
        
        if (tx.type === 'income') {
            totalIncome += tx.amount;
            if (txMonth === currentMonth && txYear === currentYear) {
                monthIncome += tx.amount;
            }
            if (txMonth === prevMonth && txYear === prevYear) {
                prevMonthIncome += tx.amount;
            }
        } else if (tx.type === 'expense') {
            totalExpenses += tx.amount;
            if (txMonth === currentMonth && txYear === currentYear) {
                monthExpenses += tx.amount;
            }
            if (txMonth === prevMonth && txYear === prevYear) {
                prevMonthExpenses += tx.amount;
            }
        }
    });
    
    console.log('🟢 Dashboard totals - Income:', totalIncome, 'Expenses:', totalExpenses);
    
    const cashBalance = totalIncome - totalExpenses;
    const incomeChange = prevMonthIncome > 0 ? ((monthIncome - prevMonthIncome) / prevMonthIncome * 100).toFixed(1) : '0';
    const expenseChange = prevMonthExpenses > 0 ? ((monthExpenses - prevMonthExpenses) / prevMonthExpenses * 100).toFixed(1) : '0';
    
    const today = new Date();
    let billsDueCount = 0;
    let billsDueAmount = 0;
    
    const bills = data.bills || [];
    bills.forEach(bill => {
        const dueDate = parseDateSafe(bill.dueDate);
        if (bill.status !== 'paid' && dueDate >= today) {
            billsDueCount++;
            billsDueAmount += (bill.amount || 0);
        }
    });
    
    document.getElementById('cashBalance').textContent = formatCurrency(cashBalance);
    document.getElementById('monthIncome').textContent = formatCurrency(monthIncome);
    document.getElementById('monthExpense').textContent = formatCurrency(monthExpenses);
    document.getElementById('billsDue').textContent = formatCurrency(billsDueAmount);
    
    // Update bills count label
    const billsCountLabel = document.getElementById('billsCountLabel');
    if (billsCountLabel) {
        billsCountLabel.textContent = `${billsDueCount} bill${billsDueCount !== 1 ? 's' : ''}`;
    }
    
    const incomeChangeElement = document.getElementById('incomeChange');
    const expenseChangeElement = document.getElementById('expenseChange');
    
    if (incomeChangeElement) {
        const change = parseFloat(incomeChange);
        incomeChangeElement.innerHTML = `<i class="fas fa-arrow-${change >= 0 ? 'up' : 'down'}"></i> ${Math.abs(change)}%`;
    }
    
    if (expenseChangeElement) {
        const change = parseFloat(expenseChange);
        expenseChangeElement.innerHTML = `<i class="fas fa-arrow-${change >= 0 ? 'up' : 'down'}"></i> ${Math.abs(change)}%`;
    }
    
    document.getElementById('billsBadge').textContent = billsDueCount;
    loadRecentTransactions();
    loadUpcomingBills();
    updateCharts();
    updateBalanceEquation();
    
    // Update plan usage widget
    if (typeof renderUsageWidget === 'function') {
        renderUsageWidget();
    }
}

function updateBalanceEquation() {
    let totalIncome = 0;
    let totalExpenses = 0;
    
    businessData.transactions.forEach(tx => {
        if (tx.type === 'income') totalIncome += tx.amount;
        else totalExpenses += tx.amount;
    });
    
    const netProfit = totalIncome - totalExpenses;
    
    document.getElementById('bs-assets').textContent = formatRM(netProfit);
    document.getElementById('bs-equity').textContent = formatRM(netProfit);
    document.getElementById('bs-liabilities').textContent = formatRM(0);
}

function loadRecentTransactions() {
    const container = document.getElementById('recentTransactions');
    if (!container) return;
    
    // Sort by date descending (latest first), then by timestamp if available
    const sortedTransactions = [...businessData.transactions]
        .sort((a, b) => {
            const dateCompare = new Date(b.date) - new Date(a.date);
            if (dateCompare !== 0) return dateCompare;
            // If same date, sort by timestamp (most recent first)
            return new Date(b.timestamp || b.date) - new Date(a.timestamp || a.date);
        })
        .slice(0, 20); // Get more transactions for grouping
    
    if (sortedTransactions.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-exchange-alt"></i>
                <h4>No transactions yet</h4>
                <div style="margin-top: 10px;">Start by recording your first transaction</div>
                <button class="btn-secondary" onclick="showSection('income')" style="margin-top: 15px;">
                    Add first transaction
                </button>
            </div>
        `;
        return;
    }
    
    // Group transactions by date
    const groupedByDate = {};
    sortedTransactions.forEach(tx => {
        const dateKey = tx.date; // YYYY-MM-DD format
        if (!groupedByDate[dateKey]) {
            groupedByDate[dateKey] = [];
        }
        groupedByDate[dateKey].push(tx);
    });
    
    // Format date header
    const formatDateHeader = (dateStr) => {
        const date = parseDateSafe(dateStr);
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        
        const isToday = date.toDateString() === today.toDateString();
        const isYesterday = date.toDateString() === yesterday.toDateString();
        
        if (isToday) return 'Today';
        if (isYesterday) return 'Yesterday';
        return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined });
    };
    
    // Build HTML with date groupings
    let html = '';
    let totalShown = 0;
    const maxTransactions = 10;
    
    Object.keys(groupedByDate).forEach(dateKey => {
        if (totalShown >= maxTransactions) return;
        
        const dayTransactions = groupedByDate[dateKey];
        const dayTotal = dayTransactions.reduce((sum, tx) => {
            return sum + (tx.type === 'income' ? tx.amount : -tx.amount);
        }, 0);
        
        html += `
            <div class="transaction-date-header" style="display: flex; justify-content: space-between; align-items: center; padding: 8px 12px; background: #f8fafc; border-radius: 6px; margin: 10px 0 5px 0; font-size: 12px;">
                <span style="font-weight: 600; color: #475569;">${formatDateHeader(dateKey)}</span>
                <span style="color: ${dayTotal >= 0 ? '#10b981' : '#ef4444'}; font-weight: 500;">
                    ${dayTotal >= 0 ? '+' : ''}${formatCurrency(dayTotal)}
                </span>
            </div>
        `;
        
        dayTransactions.forEach(tx => {
            if (totalShown >= maxTransactions) return;
            
            html += `
                <div class="transaction-item fade-in">
                    <div class="transaction-info">
                        <div class="transaction-title">
                            ${escapeHTML(tx.description)}
                            <span class="transaction-category">${tx.type === 'income' ? 'Income' : 'Expense'}</span>
                        </div>
                        <div class="transaction-date">
                            ${tx.category || ''}${tx.vendor ? ` • ${escapeHTML(tx.vendor)}` : tx.customer ? ` • ${escapeHTML(tx.customer)}` : ''}
                        </div>
                    </div>
                    <div class="transaction-amount ${tx.type === 'income' ? 'positive' : 'negative'}">
                        ${tx.type === 'income' ? '+' : '-'}${formatCurrency(tx.amount)}
                    </div>
                    <div class="transaction-actions">
                        <button class="action-btn edit" onclick="editTransaction('${tx.id}')" title="Edit">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="action-btn delete" onclick="confirmDeleteTransaction('${tx.id}')" title="Delete">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            `;
            totalShown++;
        });
    });
    
    container.innerHTML = html;
}

function loadUpcomingBills() {
    const container = document.getElementById('upcomingBills');
    if (!container) return;
    
    const today = new Date();
    const upcomingBills = businessData.bills
        .filter(bill => {
            const dueDate = parseDateSafe(bill.dueDate);
            return bill.status !== 'paid' && dueDate >= today;
        })
        .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
        .slice(0, 5);
    
    if (upcomingBills.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-check-circle"></i>
                <h4>No upcoming bills</h4>
                <div style="margin-top: 10px;">All bills are paid or scheduled</div>
            </div>
        `;
        return;
    }
    
    container.innerHTML = upcomingBills.map(bill => {
        const dueDate = parseDateSafe(bill.dueDate);
        const daysUntilDue = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));
        let statusClass = 'upcoming';
        let statusText = 'Upcoming';
        
        if (daysUntilDue <= 0) {
            statusClass = 'overdue';
            statusText = 'Overdue';
        } else if (daysUntilDue <= 7) {
            statusClass = 'warning';
            statusText = 'Due Soon';
        }
        
        return `
            <div class="bill-card ${statusClass}" style="margin-bottom: 10px;">
                <div class="bill-title">${escapeHTML(bill.name)}</div>
                <div class="bill-amount">${formatCurrency(bill.amount)}</div>
                <div class="bill-due-date">
                    <i class="fas fa-calendar"></i> Due Date: ${dueDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    <span style="margin-left: 10px; color: ${statusClass === 'overdue' ? '#ef4444' : '#f59e0b'}">
                        (${daysUntilDue <= 0 ? 'Overdue' : `${daysUntilDue} days`})
                    </span>
                </div>
                <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 10px;">
                    <span class="bill-status status-${statusClass}">${statusText}</span>
                    <button class="btn-secondary" onclick="markBillAsPaid('${bill.id}')" style="padding: 3px 8px; font-size: 12px;">
                        Mark as Paid
                    </button>
                </div>
            </div>
        `;
    }).join('');
}
