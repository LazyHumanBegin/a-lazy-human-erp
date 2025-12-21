// ==================== CHARTS.JS ====================
// Chart Functions

// ==================== INITIALIZE CHARTS ====================
// Export functions to window
window.initializeCharts = initializeCharts;
window.updateCharts = updateCharts;

function initializeCharts() {
    const incomeCtx = document.getElementById('incomeChart')?.getContext('2d');
    if (incomeCtx) {
        incomeChart = new Chart(incomeCtx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: 'Income',
                    data: [],
                    borderColor: '#10b981',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    tension: 0.4,
                    fill: true,
                    pointBackgroundColor: '#10b981',
                    pointBorderColor: '#ffffff',
                    pointBorderWidth: 2,
                    pointRadius: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: { color: 'rgba(226, 232, 240, 0.5)' },
                        ticks: {
                            callback: function(value) { return formatCurrency(value); },
                            color: '#64748b'
                        }
                    },
                    x: {
                        grid: { color: 'rgba(226, 232, 240, 0.5)' },
                        ticks: { color: '#64748b' }
                    }
                }
            }
        });
    }
    
    const pieCtx = document.getElementById('pieChart')?.getContext('2d');
    if (pieCtx) {
        pieChart = new Chart(pieCtx, {
            type: 'doughnut',
            data: {
                labels: ['Income', 'Expenses'],
                datasets: [{
                    data: [0, 0],
                    backgroundColor: ['#10b981', '#ef4444'],
                    borderWidth: 2,
                    borderColor: '#ffffff',
                    hoverOffset: 10
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '70%',
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            color: '#475569',
                            padding: 20,
                            usePointStyle: true
                        }
                    }
                }
            }
        });
    }
    
    const cashFlowCtx = document.getElementById('cashFlowChart')?.getContext('2d');
    if (cashFlowCtx) {
        cashFlowChart = new Chart(cashFlowCtx, {
            type: 'bar',
            data: {
                labels: [],
                datasets: [
                    {
                        label: 'Income',
                        data: [],
                        backgroundColor: '#10b981',
                        borderColor: '#10b981',
                        borderWidth: 1,
                        borderRadius: 4
                    },
                    {
                        label: 'Expenses',
                        data: [],
                        backgroundColor: '#ef4444',
                        borderColor: '#ef4444',
                        borderWidth: 1,
                        borderRadius: 4
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
                            callback: function(value) { return formatCurrency(value); },
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
                        labels: {
                            color: '#475569',
                            usePointStyle: true
                        }
                    }
                }
            }
        });
    }
    
    const monthlyCtx = document.getElementById('monthlyChart')?.getContext('2d');
    if (monthlyCtx) {
        monthlyChart = new Chart(monthlyCtx, {
            type: 'bar',
            data: {
                labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
                datasets: [
                    {
                        label: 'Revenue',
                        data: [],
                        backgroundColor: '#10b981',
                        borderColor: '#10b981',
                        borderWidth: 2,
                        borderRadius: 4,
                        barPercentage: 0.6
                    },
                    {
                        label: 'Expenses',
                        data: [],
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
}

// ==================== UPDATE CHARTS ====================
function updateCharts() {
    const months = [];
    const incomeData = [];
    const today = new Date();
    
    for (let i = 5; i >= 0; i--) {
        const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
        const monthYear = date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
        months.push(monthYear);
        
        let monthIncome = 0;
        const targetMonth = date.getMonth();
        const targetYear = date.getFullYear();
        
        businessData.transactions.forEach(tx => {
            const txDate = parseDateSafe(tx.date);
            if (tx.type === 'income' && 
                txDate.getMonth() === targetMonth && 
                txDate.getFullYear() === targetYear) {
                monthIncome += tx.amount;
            }
        });
        
        incomeData.push(monthIncome);
    }
    
    if (incomeChart) {
        incomeChart.data.labels = months;
        incomeChart.data.datasets[0].data = incomeData;
        incomeChart.update();
    }
    
    let totalIncome = 0;
    let totalExpenses = 0;
    
    businessData.transactions.forEach(tx => {
        if (tx.type === 'income') totalIncome += tx.amount;
        else totalExpenses += tx.amount;
    });
    
    if (pieChart) {
        pieChart.data.datasets[0].data = [totalIncome, totalExpenses];
        pieChart.update();
    }
    
    const cashFlowMonths = [];
    const cashFlowIncome = [];
    const cashFlowExpenses = [];
    
    for (let i = 5; i >= 0; i--) {
        const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
        const monthYear = date.toLocaleDateString('en-US', { month: 'short' });
        cashFlowMonths.push(monthYear);
        
        let monthIncome = 0;
        let monthExpenses = 0;
        const targetMonth = date.getMonth();
        const targetYear = date.getFullYear();
        
        businessData.transactions.forEach(tx => {
            const txDate = parseDateSafe(tx.date);
            if (txDate.getMonth() === targetMonth && txDate.getFullYear() === targetYear) {
                if (tx.type === 'income') monthIncome += tx.amount;
                else monthExpenses += tx.amount;
            }
        });
        
        cashFlowIncome.push(monthIncome);
        cashFlowExpenses.push(monthExpenses);
    }
    
    if (cashFlowChart) {
        cashFlowChart.data.labels = cashFlowMonths;
        cashFlowChart.data.datasets[0].data = cashFlowIncome;
        cashFlowChart.data.datasets[1].data = cashFlowExpenses;
        cashFlowChart.update();
    }
}
