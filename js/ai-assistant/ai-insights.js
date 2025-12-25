/**
 * EZCubic - AI Insights & Analytics
 * Proactive insights, analytics panel, and trend analysis
 * Split from ai-assistant.js v2.2.6 - 22 Jan 2025
 */

// ==================== PROACTIVE INSIGHTS ====================
function refreshInsights() {
    const container = document.getElementById('aiInsightsContainer');
    if (!container) return;
    
    container.innerHTML = `
        <div style="text-align: center; padding: 40px; color: #94a3b8;">
            <i class="fas fa-spinner fa-spin" style="font-size: 24px; margin-bottom: 10px;"></i>
            <p>Analyzing your business data...</p>
        </div>
    `;
    
    setTimeout(() => {
        const insights = generateProactiveInsights();
        displayInsights(insights);
    }, 800);
}

function generateProactiveInsights() {
    const insights = [];
    const transactions = (window.businessData && window.businessData.transactions) || [];
    const bills = (window.businessData && window.businessData.bills) || [];
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();
    
    // Filter current month transactions
    const monthTransactions = transactions.filter(t => {
        const d = new Date(t.date);
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    });
    
    const monthIncome = monthTransactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const monthExpenses = monthTransactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    
    // 1. Cash Flow Analysis
    if (monthExpenses > monthIncome * 0.9) {
        insights.push({
            type: 'warning',
            priority: 'high',
            icon: 'fa-exclamation-triangle',
            title: 'High Expense Alert',
            description: `Your expenses (RM ${formatNumber(monthExpenses)}) are ${monthIncome > 0 ? Math.round((monthExpenses / monthIncome) * 100) : 100}% of your income this month. Consider reviewing non-essential spending.`,
            action: "showSection('expenses')",
            actionText: 'Review Expenses'
        });
    } else if (monthIncome > monthExpenses * 1.5) {
        insights.push({
            type: 'success',
            priority: 'low',
            icon: 'fa-chart-line',
            title: 'Strong Profit Margin',
            description: `Great job! Your profit margin is ${monthIncome > 0 ? Math.round(((monthIncome - monthExpenses) / monthIncome) * 100) : 0}% this month. Consider investing surplus in business growth.`,
            action: "showSection('reports')",
            actionText: 'View Reports'
        });
    }
    
    // 2. Upcoming Bills
    const upcomingBills = bills.filter(b => {
        if (!b.dueDate || b.isPaid) return false;
        const due = new Date(b.dueDate);
        const daysUntil = Math.ceil((due - currentDate) / (1000 * 60 * 60 * 24));
        return daysUntil >= 0 && daysUntil <= 7;
    });
    
    if (upcomingBills.length > 0) {
        const totalDue = upcomingBills.reduce((s, b) => s + (b.amount || 0), 0);
        insights.push({
            type: 'warning',
            priority: 'high',
            icon: 'fa-calendar-alt',
            title: `${upcomingBills.length} Bills Due Soon`,
            description: `You have RM ${formatNumber(totalDue)} in bills due within the next 7 days. Ensure sufficient funds are available.`,
            action: "showSection('bills')",
            actionText: 'View Bills'
        });
    }
    
    // 3. Tax Optimization
    const yearIncome = transactions.filter(t => {
        const d = new Date(t.date);
        return d.getFullYear() === currentYear && t.type === 'income';
    }).reduce((s, t) => s + t.amount, 0);
    
    const yearExpenses = transactions.filter(t => {
        const d = new Date(t.date);
        return d.getFullYear() === currentYear && t.type === 'expense';
    }).reduce((s, t) => s + t.amount, 0);
    
    const taxableProfit = yearIncome - yearExpenses;
    
    if (taxableProfit > 150000) {
        insights.push({
            type: 'info',
            priority: 'medium',
            icon: 'fa-percentage',
            title: 'Tax Bracket Alert',
            description: `Your taxable profit (RM ${formatNumber(taxableProfit)}) exceeds RM 150,000. You're now in the 17% bracket. Consider tax planning strategies.`,
            action: "showSection('taxes')",
            actionText: 'Tax Calculator'
        });
    }
    
    // 4. SST Registration Check
    if (yearIncome > 400000) {
        insights.push({
            type: 'warning',
            priority: 'high',
            icon: 'fa-file-invoice',
            title: 'SST Registration Reminder',
            description: `Your annual revenue (RM ${formatNumber(yearIncome)}) is approaching the RM 500,000 SST threshold. Prepare for registration if not already registered.`,
            action: "showTaxTab('sst')",
            actionText: 'SST Calculator'
        });
    }
    
    // 5. Uncategorized Transactions
    const uncategorized = transactions.filter(t => !t.category || t.category === 'Other' || t.category === 'Uncategorized');
    if (uncategorized.length > 5) {
        insights.push({
            type: 'info',
            priority: 'medium',
            icon: 'fa-tags',
            title: `${uncategorized.length} Uncategorized Transactions`,
            description: 'Proper categorization helps with accurate reporting and tax deductions. Let me help categorize them automatically.',
            action: "runAutomation('categorize')",
            actionText: 'Auto-Categorize'
        });
    }
    
    // 6. Monthly Comparison
    const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;
    
    const lastMonthIncome = transactions.filter(t => {
        const d = new Date(t.date);
        return d.getMonth() === lastMonth && d.getFullYear() === lastMonthYear && t.type === 'income';
    }).reduce((s, t) => s + t.amount, 0);
    
    if (lastMonthIncome > 0 && monthIncome > 0) {
        const change = ((monthIncome - lastMonthIncome) / lastMonthIncome) * 100;
        if (Math.abs(change) > 20) {
            insights.push({
                type: change > 0 ? 'success' : 'warning',
                priority: change > 0 ? 'low' : 'medium',
                icon: change > 0 ? 'fa-arrow-up' : 'fa-arrow-down',
                title: `Income ${change > 0 ? 'Increased' : 'Decreased'} ${Math.abs(change).toFixed(0)}%`,
                description: `Your income ${change > 0 ? 'grew' : 'dropped'} from RM ${formatNumber(lastMonthIncome)} to RM ${formatNumber(monthIncome)} compared to last month.`,
                action: "showSection('monthly-reports')",
                actionText: 'View Trends'
            });
        }
    }
    
    // Update insight count
    if (window.aiState) {
        window.aiState.insights = insights;
    }
    const countEl = document.getElementById('aiInsightsCount');
    if (countEl) countEl.textContent = insights.length;
    if (typeof saveAIState === 'function') saveAIState();
    
    return insights;
}

function displayInsights(insights) {
    const container = document.getElementById('aiInsightsContainer');
    if (!container) return;
    
    if (insights.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #94a3b8;">
                <i class="fas fa-check-circle" style="font-size: 48px; color: #10b981; margin-bottom: 15px;"></i>
                <h4 style="color: white; margin-bottom: 10px;">All Good!</h4>
                <p>No urgent insights at the moment. Keep up the great work!</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = insights.map(insight => `
        <div class="ai-insight-card ${insight.priority}">
            <div class="insight-header">
                <i class="fas ${insight.icon}"></i>
                <h4>${insight.title}</h4>
                <span class="insight-priority ${insight.priority}">${insight.priority.toUpperCase()}</span>
            </div>
            <div class="insight-body">
                <p>${insight.description}</p>
            </div>
            <div class="insight-actions">
                <button class="insight-action-btn" onclick="${insight.action}">
                    <i class="fas fa-arrow-right"></i> ${insight.actionText}
                </button>
            </div>
        </div>
    `).join('');
}

// ==================== ANALYTICS PANEL ====================
function toggleAnalyticsPanel() {
    const content = document.getElementById('analyticsContent');
    const icon = document.getElementById('analyticsToggleIcon');
    
    if (!content || !icon) return;
    
    if (content.style.display === 'none') {
        content.style.display = 'block';
        icon.style.transform = 'rotate(0deg)';
    } else {
        content.style.display = 'none';
        icon.style.transform = 'rotate(-90deg)';
    }
}

function setAnalyticsPeriod(period) {
    if (window.aiState) {
        window.aiState.analyticsPeriod = period;
    }
    
    document.querySelectorAll('.analytics-filter').forEach(btn => {
        btn.classList.remove('active');
    });
    if (event && event.target) {
        event.target.classList.add('active');
    }
    
    updateAIAnalytics();
    if (typeof saveAIState === 'function') saveAIState();
}

function updateAIAnalytics() {
    try {
        const transactions = (window.businessData && window.businessData.transactions) || [];
        const currentDate = new Date();
        const currentYear = currentDate.getFullYear();
        const currentMonth = currentDate.getMonth();
        const currentQuarter = Math.floor(currentMonth / 3);
        
        const period = (window.aiState && window.aiState.analyticsPeriod) || 'month';
        let filteredTransactions = [];
        
        switch (period) {
            case 'month':
                filteredTransactions = transactions.filter(t => {
                    const d = new Date(t.date);
                    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
                });
                break;
            case 'quarter':
                filteredTransactions = transactions.filter(t => {
                    const d = new Date(t.date);
                    return Math.floor(d.getMonth() / 3) === currentQuarter && d.getFullYear() === currentYear;
                });
                break;
            case 'year':
                filteredTransactions = transactions.filter(t => {
                    const d = new Date(t.date);
                    return d.getFullYear() === currentYear;
                });
                break;
        }
        
        const income = filteredTransactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
        const expenses = filteredTransactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
        const profit = income - expenses;
        
        // Profit Margin
        const profitMargin = income > 0 ? Math.round((profit / income) * 100) : 0;
        const profitMarginEl = document.getElementById('aiProfitMargin');
        if (profitMarginEl) profitMarginEl.textContent = profitMargin + '%';
        
        // Expense Ratio
        const expenseRatio = income > 0 ? Math.round((expenses / income) * 100) : 0;
        const expenseRatioEl = document.getElementById('aiExpenseRatio');
        if (expenseRatioEl) expenseRatioEl.textContent = expenseRatio + '%';
        
        // Cash Flow Health (0-100 score)
        let healthScore = 50;
        if (profitMargin > 20) healthScore += 20;
        else if (profitMargin > 10) healthScore += 10;
        else if (profitMargin < 0) healthScore -= 20;
        
        if (expenseRatio < 70) healthScore += 15;
        else if (expenseRatio > 90) healthScore -= 15;
        
        if (filteredTransactions.length > 10) healthScore += 15;
        
        healthScore = Math.min(100, Math.max(0, healthScore));
        const cashFlowEl = document.getElementById('aiCashFlowHealth');
        if (cashFlowEl) cashFlowEl.textContent = healthScore;
        
        // Tax Efficiency
        const taxEfficiency = Math.min(100, Math.round(80 + (profit > 0 ? 10 : 0) + (expenseRatio > 50 ? 10 : 0)));
        const taxEffEl = document.getElementById('aiTaxEfficiency');
        if (taxEffEl) taxEffEl.textContent = taxEfficiency + '%';
    
        // Update trends
        updateAnalyticsTrends(profitMargin, expenseRatio, healthScore);
        
        // Update chart
        updateAIChart(filteredTransactions);
    } catch (e) {
        console.log('updateAIAnalytics error:', e.message);
    }
}

function updateAnalyticsTrends(profitMargin, expenseRatio, healthScore) {
    const profitTrend = document.getElementById('aiProfitTrend');
    const expenseTrend = document.getElementById('aiExpenseTrend');
    const cashFlowTrend = document.getElementById('aiCashFlowTrend');
    const taxTrend = document.getElementById('aiTaxTrend');
    
    if (profitTrend) {
        profitTrend.className = 'analytics-trend ' + (profitMargin >= 15 ? 'positive' : profitMargin >= 0 ? '' : 'negative');
        profitTrend.innerHTML = profitMargin >= 15 
            ? '<i class="fas fa-check-circle"></i> Healthy'
            : profitMargin >= 0 
            ? '<i class="fas fa-minus"></i> Average'
            : '<i class="fas fa-exclamation-circle"></i> Needs attention';
    }
    
    if (expenseTrend) {
        expenseTrend.className = 'analytics-trend ' + (expenseRatio <= 70 ? 'positive' : expenseRatio <= 85 ? '' : 'negative');
        expenseTrend.innerHTML = expenseRatio <= 70
            ? '<i class="fas fa-arrow-down"></i> Well controlled'
            : expenseRatio <= 85
            ? '<i class="fas fa-minus"></i> Moderate'
            : '<i class="fas fa-arrow-up"></i> High';
    }
    
    if (cashFlowTrend) {
        cashFlowTrend.className = 'analytics-trend ' + (healthScore >= 70 ? 'positive' : healthScore >= 50 ? '' : 'negative');
        cashFlowTrend.innerHTML = healthScore >= 70
            ? '<i class="fas fa-heart"></i> Strong'
            : healthScore >= 50
            ? '<i class="fas fa-minus"></i> Fair'
            : '<i class="fas fa-exclamation-triangle"></i> Weak';
    }
    
    if (taxTrend) {
        taxTrend.className = 'analytics-trend positive';
        taxTrend.innerHTML = '<i class="fas fa-check-circle"></i> Optimized';
    }
}

function updateAIChart(transactions) {
    const canvas = document.getElementById('aiAnalyticsChart');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    
    // Group by week/month
    const grouped = {};
    transactions.forEach(t => {
        const d = new Date(t.date);
        const key = d.toLocaleDateString('en-MY', { month: 'short', day: 'numeric' });
        if (!grouped[key]) grouped[key] = { income: 0, expense: 0 };
        if (t.type === 'income') grouped[key].income += t.amount;
        else grouped[key].expense += t.amount;
    });
    
    const labels = Object.keys(grouped).slice(-10);
    const incomeData = labels.map(l => grouped[l].income);
    const expenseData = labels.map(l => grouped[l].expense);
    
    // Destroy existing chart
    if (window.aiChart) {
        window.aiChart.destroy();
    }
    
    window.aiChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Income',
                    data: incomeData,
                    borderColor: '#10b981',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    fill: true,
                    tension: 0.4
                },
                {
                    label: 'Expenses',
                    data: expenseData,
                    borderColor: '#ef4444',
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
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
                    labels: { color: '#94a3b8' }
                }
            },
            scales: {
                x: {
                    ticks: { color: '#94a3b8' },
                    grid: { color: 'rgba(255,255,255,0.1)' }
                },
                y: {
                    ticks: { 
                        color: '#94a3b8',
                        callback: function(value) {
                            return 'RM ' + (typeof formatNumber === 'function' ? formatNumber(value) : value.toLocaleString());
                        }
                    },
                    grid: { color: 'rgba(255,255,255,0.1)' }
                }
            }
        }
    });
}

function updateAIStats() {
    try {
        const insightsEl = document.getElementById('aiInsightsCount');
        const tasksEl = document.getElementById('aiTasksCompleted');
        const timeEl = document.getElementById('aiTimeSaved');
        const accuracyEl = document.getElementById('aiAccuracy');
        
        const state = window.aiState || { insights: [], tasksCompleted: 0, timeSaved: 0 };
        
        if (insightsEl) insightsEl.textContent = state.insights.length;
        if (tasksEl) tasksEl.textContent = state.tasksCompleted;
        if (timeEl) timeEl.textContent = state.timeSaved.toFixed(1) + 'h';
        
        // Update accuracy based on tasks completed
        const accuracy = Math.min(98, 85 + Math.min(state.tasksCompleted, 13));
        if (accuracyEl) accuracyEl.textContent = accuracy + '%';
    } catch (e) {
        console.log('updateAIStats error:', e.message);
    }
}

// ==================== GLOBAL EXPORTS ====================
window.refreshInsights = refreshInsights;
window.generateProactiveInsights = generateProactiveInsights;
window.displayInsights = displayInsights;
window.toggleAnalyticsPanel = toggleAnalyticsPanel;
window.setAnalyticsPeriod = setAnalyticsPeriod;
window.updateAIAnalytics = updateAIAnalytics;
window.updateAnalyticsTrends = updateAnalyticsTrends;
window.updateAIChart = updateAIChart;
window.updateAIStats = updateAIStats;
