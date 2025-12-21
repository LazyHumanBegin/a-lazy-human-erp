// ==================== REPORTS.JS ====================
// Reports and Monthly Reports Functions

// ==================== MONTHLY REPORTS ====================
// Export functions to window for onclick handlers
window.populateYearSelector = populateYearSelector;
window.updateMonthlyCharts = updateMonthlyCharts;
window.updateReports = updateReports;

function populateYearSelector() {
    const selector = document.getElementById('monthlyYearSelect');
    if (!selector) return;
    
    selector.innerHTML = '';
    
    const years = new Set();
    businessData.transactions.forEach(tx => {
        const year = parseDateSafe(tx.date).getFullYear();
        years.add(year);
    });
    
    if (years.size === 0) {
        years.add(new Date().getFullYear());
    }
    
    const currentYear = new Date().getFullYear();
    years.add(currentYear - 1);
    years.add(currentYear + 1);
    
    const sortedYears = Array.from(years).sort((a, b) => b - a);
    
    sortedYears.forEach(year => {
        const option = document.createElement('option');
        option.value = year;
        option.text = year;
        if (year === currentYear) option.selected = true;
        selector.appendChild(option);
    });
}

function updateMonthlyCharts() {
    const selectedYear = parseInt(document.getElementById('monthlyYearSelect')?.value || new Date().getFullYear());
    const chartType = document.getElementById('monthlyChartType')?.value || 'bar';
    
    if (monthlyChart) {
        monthlyChart.destroy();
        monthlyChart = null;
    }
    
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthlyIncome = new Array(12).fill(0);
    const monthlyExpenses = new Array(12).fill(0);
    
    businessData.transactions.forEach(tx => {
        const txDate = parseDateSafe(tx.date);
        const txYear = txDate.getFullYear();
        const txMonth = txDate.getMonth();
        
        if (txYear === selectedYear) {
            if (tx.type === 'income') {
                monthlyIncome[txMonth] += tx.amount;
            } else {
                monthlyExpenses[txMonth] += tx.amount;
            }
        }
    });
    
    const monthlyCtx = document.getElementById('monthlyChart')?.getContext('2d');
    if (monthlyCtx) {
        monthlyChart = new Chart(monthlyCtx, {
            type: chartType,
            data: {
                labels: months,
                datasets: [
                    {
                        label: 'Revenue',
                        data: monthlyIncome,
                        backgroundColor: '#10b981',
                        borderColor: '#10b981',
                        borderWidth: 2,
                        borderRadius: 4,
                        barPercentage: 0.6
                    },
                    {
                        label: 'Expenses',
                        data: monthlyExpenses,
                        backgroundColor: '#ef4444',
                        borderColor: '#ef4444',
                        borderWidth: 2,
                        borderRadius: 4,
                        barPercentage: 0.6
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: { color: 'rgba(226, 232, 240, 0.5)' },
                        ticks: {
                            callback: function(value) { return 'RM ' + value.toLocaleString(); },
                            color: '#64748b'
                        }
                    },
                    x: {
                        grid: { display: false },
                        ticks: { color: '#64748b' }
                    }
                },
                plugins: {
                    legend: {
                        position: 'top',
                        labels: {
                            color: '#475569',
                            usePointStyle: true,
                            padding: 20
                        }
                    }
                }
            }
        });
    }
    
    updateMonthlyBreakdownTable(selectedYear, monthlyIncome, monthlyExpenses);
}

function updateMonthlyBreakdownTable(year, incomeData, expenseData) {
    const container = document.getElementById('monthlyBreakdownTable');
    if (!container) return;
    
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 
                   'July', 'August', 'September', 'October', 'November', 'December'];
    
    let tableHTML = `
        <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
            <thead>
                <tr style="background: #f8fafc; border-bottom: 2px solid #e2e8f0;">
                    <th style="text-align: left; padding: 10px; color: #64748b;">Month</th>
                    <th style="text-align: right; padding: 10px; color: #64748b;">Revenue (RM)</th>
                    <th style="text-align: right; padding: 10px; color: #64748b;">Expenses (RM)</th>
                    <th style="text-align: right; padding: 10px; color: #64748b;">Net (RM)</th>
                </tr>
            </thead>
            <tbody>
    `;
    
    let totalIncome = 0;
    let totalExpenses = 0;
    
    for (let i = 0; i < 12; i++) {
        const income = incomeData[i] || 0;
        const expenses = expenseData[i] || 0;
        const net = income - expenses;
        
        totalIncome += income;
        totalExpenses += expenses;
        
        tableHTML += `
            <tr style="border-bottom: 1px solid #e2e8f0;">
                <td style="padding: 10px; color: #475569;">${months[i]}</td>
                <td style="padding: 10px; text-align: right; color: ${income > 0 ? '#10b981' : '#64748b'};">${formatCurrency(income)}</td>
                <td style="padding: 10px; text-align: right; color: ${expenses > 0 ? '#ef4444' : '#64748b'};">${formatCurrency(expenses)}</td>
                <td style="padding: 10px; text-align: right; color: ${net >= 0 ? '#10b981' : '#ef4444'}; font-weight: ${net !== 0 ? '600' : 'normal'};">${formatCurrency(net)}</td>
            </tr>
        `;
    }
    
    const totalNet = totalIncome - totalExpenses;
    
    tableHTML += `
            <tr style="background: #f8fafc; border-top: 2px solid #e2e8f0;">
                <td style="padding: 10px; color: #1e293b; font-weight: 600;">Total ${year}</td>
                <td style="padding: 10px; text-align: right; color: #10b981; font-weight: 600;">${formatCurrency(totalIncome)}</td>
                <td style="padding: 10px; text-align: right; color: #ef4444; font-weight: 600;">${formatCurrency(totalExpenses)}</td>
                <td style="padding: 10px; text-align: right; color: ${totalNet >= 0 ? '#10b981' : '#ef4444'}; font-weight: 600;">${formatCurrency(totalNet)}</td>
            </tr>
        </tbody>
    </table>
    `;
    
    container.innerHTML = tableHTML;
}

// ==================== REPORTS ====================
function updateReports() {
    const period = document.getElementById('reportPeriod')?.value || 'month';
    const today = new Date();
    let startDate, endDate;
    
    if (period === 'month') {
        startDate = new Date(today.getFullYear(), today.getMonth(), 1);
        endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    } else if (period === 'quarter') {
        const quarter = Math.floor(today.getMonth() / 3);
        startDate = new Date(today.getFullYear(), quarter * 3, 1);
        endDate = new Date(today.getFullYear(), (quarter + 1) * 3, 0);
    } else {
        startDate = new Date(today.getFullYear(), 0, 1);
        endDate = new Date(today.getFullYear(), 11, 31);
    }
    
    let periodIncome = 0;
    let periodExpenses = 0;
    
    businessData.transactions.forEach(tx => {
        const txDate = parseDateSafe(tx.date);
        if (txDate >= startDate && txDate <= endDate) {
            if (tx.type === 'income') periodIncome += tx.amount;
            else periodExpenses += tx.amount;
        }
    });
    
    const profitLoss = periodIncome - periodExpenses;
    const profitMargin = periodIncome > 0 ? (profitLoss / periodIncome * 100) : 0;
    
    document.getElementById('profitLoss').textContent = formatCurrency(profitLoss);
    document.getElementById('reportIncome').textContent = formatCurrency(periodIncome);
    document.getElementById('reportExpenses').textContent = formatCurrency(periodExpenses);
    
    const progressBar = document.querySelector('.progress-fill');
    if (progressBar) {
        if (profitMargin > 0) {
            progressBar.style.width = Math.min(profitMargin, 100) + '%';
            progressBar.style.background = 'linear-gradient(90deg, #10b981, #34d399)';
        } else {
            progressBar.style.width = '100%';
            progressBar.style.background = 'linear-gradient(90deg, #ef4444, #f87171)';
        }
    }
    
    updateExpenseBreakdown(startDate, endDate);
    updateIncomeSources(startDate, endDate);
}

function updateExpenseBreakdown(startDate, endDate) {
    const container = document.getElementById('expenseBreakdown');
    if (!container) return;
    
    const expenseCategories = {};
    
    businessData.transactions.forEach(tx => {
        const txDate = parseDateSafe(tx.date);
        if (tx.type === 'expense' && txDate >= startDate && txDate <= endDate) {
            if (!expenseCategories[tx.category]) {
                expenseCategories[tx.category] = 0;
            }
            expenseCategories[tx.category] += tx.amount;
        }
    });
    
    const sortedCategories = Object.entries(expenseCategories)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5);
    
    if (sortedCategories.length === 0) {
        container.innerHTML = '<div style="color: #94a3b8; text-align: center; padding: 20px;">No expense data</div>';
        return;
    }
    
    const totalExpenses = Object.values(expenseCategories).reduce((a, b) => a + b, 0);
    
    container.innerHTML = sortedCategories.map(([category, amount]) => {
        const percentage = ((amount / totalExpenses) * 100).toFixed(1);
        return `
            <div style="margin-bottom: 15px;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                    <span style="color: #475569;">${getCategoryName(category)}</span>
                    <span style="font-weight: 600; color: #1e293b;">${formatCurrency(amount)}</span>
                </div>
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${percentage}%"></div>
                </div>
                <div style="font-size: 12px; color: #64748b; margin-top: 3px; text-align: right;">
                    ${percentage}%
                </div>
            </div>
        `;
    }).join('');
}

function updateIncomeSources(startDate, endDate) {
    const container = document.getElementById('incomeSources');
    if (!container) return;
    
    const incomeCategories = {};
    
    businessData.transactions.forEach(tx => {
        const txDate = parseDateSafe(tx.date);
        if (tx.type === 'income' && txDate >= startDate && txDate <= endDate) {
            if (!incomeCategories[tx.category]) {
                incomeCategories[tx.category] = 0;
            }
            incomeCategories[tx.category] += tx.amount;
        }
    });
    
    const sortedCategories = Object.entries(incomeCategories)
        .sort(([, a], [, b]) => b - a);
    
    if (sortedCategories.length === 0) {
        container.innerHTML = '<div style="color: #94a3b8; text-align: center; padding: 20px;">No income data</div>';
        return;
    }
    
    container.innerHTML = sortedCategories.map(([category, amount]) => `
        <div style="margin-bottom: 15px;">
            <div style="display: flex; align-items: center; gap: 10px;">
                <div style="width: 12px; height: 12px; border-radius: 50%; background: ${getCategoryColor(category)};"></div>
                <div style="flex: 1;">
                    <div style="display: flex; justify-content: space-between;">
                        <span style="color: #475569;">${getCategoryName(category)}</span>
                        <span style="font-weight: 600; color: #1e293b;">${formatCurrency(amount)}</span>
                    </div>
                    <div style="font-size: 12px; color: #64748b;">
                        ${((amount / Object.values(incomeCategories).reduce((a, b) => a + b, 0)) * 100).toFixed(1)}%
                    </div>
                </div>
            </div>
        </div>
    `).join('');
}
