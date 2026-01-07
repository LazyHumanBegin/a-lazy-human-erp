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
    let periodCOGS = 0;  // Cost of Goods Sold (v2.8.2)
    let periodExpenses = 0;  // Operating expenses (non-COGS)
    
    businessData.transactions.forEach(tx => {
        const txDate = parseDateSafe(tx.date);
        if (txDate >= startDate && txDate <= endDate) {
            if (tx.type === 'income') {
                periodIncome += tx.amount;
            } else if (tx.type === 'expense') {
                // Separate COGS from operating expenses
                if (tx.category === 'Cost of Goods Sold') {
                    periodCOGS += tx.amount;
                } else {
                    periodExpenses += tx.amount;
                }
            }
        }
    });
    
    const grossProfit = periodIncome - periodCOGS;  // Revenue - COGS
    const netProfit = grossProfit - periodExpenses;  // Gross Profit - Operating Expenses
    const grossMargin = periodIncome > 0 ? (grossProfit / periodIncome * 100) : 0;
    const netMargin = periodIncome > 0 ? (netProfit / periodIncome * 100) : 0;
    
    // Update P&L display
    document.getElementById('profitLoss').textContent = formatCurrency(netProfit);
    document.getElementById('reportIncome').textContent = formatCurrency(periodIncome);
    document.getElementById('reportExpenses').textContent = formatCurrency(periodExpenses + periodCOGS);  // Total for backward compat
    
    // Update COGS and Gross Profit if elements exist (v2.8.2)
    const cogsEl = document.getElementById('reportCOGS');
    const grossProfitEl = document.getElementById('reportGrossProfit');
    const opExpensesEl = document.getElementById('reportOpExpenses');
    
    if (cogsEl) cogsEl.textContent = formatCurrency(periodCOGS);
    if (grossProfitEl) grossProfitEl.textContent = formatCurrency(grossProfit);
    if (opExpensesEl) opExpensesEl.textContent = formatCurrency(periodExpenses);
    
    const progressBar = document.querySelector('.progress-fill');
    if (progressBar) {
        if (netMargin > 0) {
            progressBar.style.width = Math.min(netMargin, 100) + '%';
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

// ==================== SALES CHANNEL REPORT ====================
// Shows breakdown by Order Type (Dine-in, Takeaway, Delivery) and Platform

function getPlatformCommissionsForReport() {
    // Get from localStorage (editable in Settings)
    const stored = localStorage.getItem('ezcubic_platform_commissions');
    if (stored) {
        return JSON.parse(stored);
    }
    // Default rates
    return {
        grab: 30,
        foodpanda: 30,
        shopeefood: 25,
        own: 0,
        other: 0
    };
}

function showSalesChannelReport(startDate, endDate) {
    // Default to current month if no dates provided
    if (!startDate || !endDate) {
        const now = new Date();
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    }
    
    const salesData = window.sales || JSON.parse(localStorage.getItem('ezcubic_sales') || '[]');
    
    // Filter by date range
    const filteredSales = salesData.filter(sale => {
        const saleDate = new Date(sale.date);
        return saleDate >= startDate && saleDate <= endDate;
    });
    
    // Get editable commission rates
    const platformCommissions = getPlatformCommissionsForReport();
    
    // Calculate totals by order type
    const byOrderType = {
        'dine-in': { count: 0, total: 0 },
        'takeaway': { count: 0, total: 0 },
        'delivery': { count: 0, total: 0 }
    };
    
    // Calculate totals by delivery platform
    const byPlatform = {};
    
    filteredSales.forEach(sale => {
        const orderType = sale.orderType || 'dine-in';
        const total = sale.total || 0;
        
        // Count by order type
        if (!byOrderType[orderType]) {
            byOrderType[orderType] = { count: 0, total: 0 };
        }
        byOrderType[orderType].count++;
        byOrderType[orderType].total += total;
        
        // Count by platform (delivery only)
        if (orderType === 'delivery' && sale.deliveryPlatform) {
            if (!byPlatform[sale.deliveryPlatform]) {
                byPlatform[sale.deliveryPlatform] = { count: 0, total: 0, commission: 0 };
            }
            byPlatform[sale.deliveryPlatform].count++;
            byPlatform[sale.deliveryPlatform].total += total;
            
            // Calculate commission using editable rates
            const commissionRate = platformCommissions[sale.deliveryPlatform] || 0;
            byPlatform[sale.deliveryPlatform].commission += total * (commissionRate / 100);
        }
    });
    
    const grandTotal = filteredSales.reduce((sum, s) => sum + (s.total || 0), 0);
    const totalCommission = Object.values(byPlatform).reduce((sum, p) => sum + p.commission, 0);
    const netAfterCommission = grandTotal - totalCommission;
    
    // Build report HTML
    const html = `
        <div style="padding: 20px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <h3 style="margin: 0;"><i class="fas fa-chart-pie"></i> Sales Channel Report</h3>
                <span style="color: #64748b; font-size: 14px;">
                    ${startDate.toLocaleDateString('en-MY')} - ${endDate.toLocaleDateString('en-MY')}
                </span>
            </div>
            
            <!-- Summary Cards -->
            <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin-bottom: 25px;">
                <div style="background: linear-gradient(135deg, #dbeafe, #eff6ff); padding: 15px; border-radius: 10px;">
                    <div style="font-size: 12px; color: #1d4ed8;">Total Sales</div>
                    <div style="font-size: 24px; font-weight: 700; color: #1e40af;">RM ${grandTotal.toFixed(2)}</div>
                    <div style="font-size: 12px; color: #64748b;">${filteredSales.length} orders</div>
                </div>
                <div style="background: linear-gradient(135deg, #dcfce7, #f0fdf4); padding: 15px; border-radius: 10px;">
                    <div style="font-size: 12px; color: #16a34a;">🍽️ Dine-in</div>
                    <div style="font-size: 20px; font-weight: 700; color: #15803d;">RM ${byOrderType['dine-in'].total.toFixed(2)}</div>
                    <div style="font-size: 12px; color: #64748b;">${byOrderType['dine-in'].count} orders (${grandTotal > 0 ? ((byOrderType['dine-in'].total / grandTotal) * 100).toFixed(1) : 0}%)</div>
                </div>
                <div style="background: linear-gradient(135deg, #fef3c7, #fffbeb); padding: 15px; border-radius: 10px;">
                    <div style="font-size: 12px; color: #d97706;">🥡 Takeaway</div>
                    <div style="font-size: 20px; font-weight: 700; color: #b45309;">RM ${byOrderType['takeaway'].total.toFixed(2)}</div>
                    <div style="font-size: 12px; color: #64748b;">${byOrderType['takeaway'].count} orders (${grandTotal > 0 ? ((byOrderType['takeaway'].total / grandTotal) * 100).toFixed(1) : 0}%)</div>
                </div>
                <div style="background: linear-gradient(135deg, #fee2e2, #fef2f2); padding: 15px; border-radius: 10px;">
                    <div style="font-size: 12px; color: #dc2626;">🛵 Delivery</div>
                    <div style="font-size: 20px; font-weight: 700; color: #b91c1c;">RM ${byOrderType['delivery'].total.toFixed(2)}</div>
                    <div style="font-size: 12px; color: #64748b;">${byOrderType['delivery'].count} orders (${grandTotal > 0 ? ((byOrderType['delivery'].total / grandTotal) * 100).toFixed(1) : 0}%)</div>
                </div>
            </div>
            
            <!-- Delivery Platform Breakdown -->
            ${Object.keys(byPlatform).length > 0 ? `
                <div style="background: #f8fafc; border-radius: 10px; padding: 20px; margin-bottom: 20px;">
                    <h4 style="margin: 0 0 15px 0; color: #334155;"><i class="fas fa-motorcycle"></i> Delivery Platform Breakdown</h4>
                    <table style="width: 100%; border-collapse: collapse;">
                        <thead>
                            <tr style="border-bottom: 2px solid #e2e8f0;">
                                <th style="text-align: left; padding: 10px; color: #64748b; font-weight: 600;">Platform</th>
                                <th style="text-align: right; padding: 10px; color: #64748b; font-weight: 600;">Orders</th>
                                <th style="text-align: right; padding: 10px; color: #64748b; font-weight: 600;">Sales</th>
                                <th style="text-align: right; padding: 10px; color: #64748b; font-weight: 600;">Commission %</th>
                                <th style="text-align: right; padding: 10px; color: #64748b; font-weight: 600;">Commission</th>
                                <th style="text-align: right; padding: 10px; color: #64748b; font-weight: 600;">Net</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${Object.entries(byPlatform).map(([platform, data]) => {
                                const commissionRate = platformCommissions[platform] || 0;
                                const net = data.total - data.commission;
                                const platformNames = {
                                    'grab': '🟢 Grab',
                                    'foodpanda': '🩷 FoodPanda',
                                    'shopeefood': '🟠 ShopeeFood',
                                    'own': '🚗 Own Delivery',
                                    'other': '📦 Other'
                                };
                                return `
                                    <tr style="border-bottom: 1px solid #e2e8f0;">
                                        <td style="padding: 12px; font-weight: 600;">${platformNames[platform] || platform}</td>
                                        <td style="padding: 12px; text-align: right;">${data.count}</td>
                                        <td style="padding: 12px; text-align: right;">RM ${data.total.toFixed(2)}</td>
                                        <td style="padding: 12px; text-align: right; color: #dc2626;">${commissionRate}%</td>
                                        <td style="padding: 12px; text-align: right; color: #dc2626;">-RM ${data.commission.toFixed(2)}</td>
                                        <td style="padding: 12px; text-align: right; color: #059669; font-weight: 600;">RM ${net.toFixed(2)}</td>
                                    </tr>
                                `;
                            }).join('')}
                        </tbody>
                        <tfoot>
                            <tr style="background: #f1f5f9; font-weight: 700;">
                                <td style="padding: 12px;">Total Delivery</td>
                                <td style="padding: 12px; text-align: right;">${byOrderType['delivery'].count}</td>
                                <td style="padding: 12px; text-align: right;">RM ${byOrderType['delivery'].total.toFixed(2)}</td>
                                <td style="padding: 12px; text-align: right;"></td>
                                <td style="padding: 12px; text-align: right; color: #dc2626;">-RM ${totalCommission.toFixed(2)}</td>
                                <td style="padding: 12px; text-align: right; color: #059669;">RM ${(byOrderType['delivery'].total - totalCommission).toFixed(2)}</td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            ` : '<div style="background: #f8fafc; padding: 20px; border-radius: 10px; text-align: center; color: #64748b; margin-bottom: 20px;">No delivery orders in this period</div>'}
            
            <!-- Net Profit Summary -->
            <div style="background: linear-gradient(135deg, #f0fdf4, #dcfce7); padding: 20px; border-radius: 10px; border: 2px solid #22c55e;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <div style="font-size: 14px; color: #16a34a; font-weight: 600;">💰 Net Sales After Platform Commission</div>
                        <div style="font-size: 12px; color: #64748b; margin-top: 5px;">
                            Total Sales (RM ${grandTotal.toFixed(2)}) - Platform Commissions (RM ${totalCommission.toFixed(2)})
                        </div>
                    </div>
                    <div style="font-size: 28px; font-weight: 700; color: #15803d;">RM ${netAfterCommission.toFixed(2)}</div>
                </div>
            </div>
        </div>
    `;
    
    // Show in modal
    let modal = document.getElementById('salesChannelModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'salesChannelModal';
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 900px;">
                <div class="modal-header">
                    <h3 class="modal-title"><i class="fas fa-chart-pie"></i> Sales Channel Report</h3>
                    <button class="modal-close" onclick="closeSalesChannelReport()">&times;</button>
                </div>
                <div id="salesChannelContent"></div>
            </div>
        `;
        document.body.appendChild(modal);
    }
    
    document.getElementById('salesChannelContent').innerHTML = html;
    modal.style.display = '';
    modal.classList.add('show');
}

function closeSalesChannelReport() {
    const modal = document.getElementById('salesChannelModal');
    if (modal) modal.classList.remove('show');
}

// Expose to window
window.showSalesChannelReport = showSalesChannelReport;
window.closeSalesChannelReport = closeSalesChannelReport;
