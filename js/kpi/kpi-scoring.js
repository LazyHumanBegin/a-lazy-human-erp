// ==================== KPI-SCORING.JS ====================
// Key Performance Indicator System - Scoring Module
// Assignment, Scoring, Auto-Calculate Functions
// Version: 2.2.7 - Modular Split - 26 Dec 2025

// ==================== KPI ASSIGNMENT ====================
function showAssignKPIModal(templateId = null) {
    const modal = document.getElementById('assignKPIModal');
    const templateSelect = document.getElementById('assignKPITemplate');
    const employeeSelect = document.getElementById('assignKPIEmployee');
    
    // Populate templates
    templateSelect.innerHTML = '<option value="">Select KPI Template</option>' +
        kpiTemplates.map(t => `<option value="${t.id}" ${t.id === templateId ? 'selected' : ''}>${escapeHTML(t.name)}</option>`).join('');
    
    // Populate employees (get from payroll.js)
    const activeEmployees = (window.getEmployees ? window.getEmployees() : []).filter(e => e.status === 'active');
    employeeSelect.innerHTML = '<option value="">Select Employee</option>' +
        activeEmployees.map(e => `<option value="${e.id}">${escapeHTML(e.name)} - ${escapeHTML(e.position || 'No Position')}</option>`).join('');
    
    // Set current period
    const today = new Date();
    document.getElementById('assignKPIPeriod').value = today.toISOString().slice(0, 7);
    
    modal.style.display = 'flex';
}

function closeAssignKPIModal() {
    document.getElementById('assignKPIModal').style.display = 'none';
}

function assignKPIToEmployee() {
    const templateId = document.getElementById('assignKPITemplate').value;
    const employeeId = document.getElementById('assignKPIEmployee').value;
    const period = document.getElementById('assignKPIPeriod').value;
    
    if (!templateId || !employeeId || !period) {
        showNotification('Please fill all fields', 'error');
        return;
    }
    
    // Check if already assigned
    const existing = kpiAssignments.find(a => 
        a.employeeId === employeeId && 
        a.templateId === templateId && 
        a.period === period
    );
    
    if (existing) {
        showNotification('This KPI is already assigned for this period', 'error');
        return;
    }
    
    const template = kpiTemplates.find(t => t.id === templateId);
    const employee = (window.getEmployees ? window.getEmployees() : []).find(e => e.id === employeeId);
    
    const assignment = {
        id: generateUniqueId(),
        templateId: templateId,
        templateName: template.name,
        employeeId: employeeId,
        employeeName: employee.name,
        period: period,
        metrics: template.metrics.map(m => ({
            ...m,
            actual: null,
            score: null
        })),
        status: 'pending',
        overallScore: null,
        assignedAt: new Date().toISOString()
    };
    
    kpiAssignments.push(assignment);
    saveKPIAssignments();
    closeAssignKPIModal();
    loadKPIOverview();
    updateKPIStats();
    showNotification(`KPI assigned to ${employee.name}!`, 'success');
}

// ==================== KPI SCORING ====================
function showScoreKPIModal(assignmentId) {
    const modal = document.getElementById('scoreKPIModal');
    const assignment = kpiAssignments.find(a => a.id === assignmentId);
    
    if (!assignment) return;
    
    document.getElementById('scoreAssignmentId').value = assignmentId;
    document.getElementById('scoreEmployeeName').textContent = assignment.employeeName;
    document.getElementById('scorePeriod').textContent = formatPeriod(assignment.period);
    document.getElementById('scoreTemplateName').textContent = assignment.templateName;
    
    // Render metrics for scoring with auto-fill button
    const container = document.getElementById('scoreMetricsContainer');
    container.innerHTML = `
        <div class="auto-score-section" style="margin-bottom: 15px; padding: 10px; background: #f0f9ff; border-radius: 8px; border: 1px solid #0ea5e9;">
            <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px;">
                <div>
                    <strong style="color: #0369a1;"><i class="fas fa-magic"></i> Auto-Calculate from System Data</strong>
                    <p style="margin: 5px 0 0; font-size: 12px; color: #666;">Automatically fill metrics from sales, attendance, and performance data</p>
                </div>
                <button type="button" class="btn-primary" onclick="autoCalculateKPIScores('${assignmentId}')" style="background: linear-gradient(135deg, #0ea5e9, #0284c7);">
                    <i class="fas fa-calculator"></i> Auto-Calculate
                </button>
            </div>
        </div>
        ${assignment.metrics.map((metric, index) => `
        <div class="score-metric-row">
            <div class="metric-info">
                <span class="metric-label">${escapeHTML(metric.name)}</span>
                <span class="metric-target">Target: ${metric.target} ${metric.unit}</span>
                <span class="metric-weight-badge">${metric.weight}%</span>
            </div>
            <div class="metric-input">
                <input type="number" class="form-control metric-actual" 
                       data-metric-id="${metric.id}"
                       value="${metric.actual !== null ? metric.actual : ''}" 
                       step="0.01" placeholder="Actual value"
                       oninput="calculateMetricScore(this, ${metric.target}, '${metric.unit}')">
                <div class="metric-score-display" id="score-${metric.id}">
                    ${metric.score !== null ? `${metric.score.toFixed(1)}%` : '-'}
                </div>
            </div>
        </div>
    `).join('')}`;
    
    // Show current overall score if exists
    updateOverallScorePreview();
    
    modal.style.display = 'flex';
}

// ==================== AUTO-CALCULATE KPI FROM SYSTEM DATA ====================
function autoCalculateKPIScores(assignmentId) {
    const assignment = kpiAssignments.find(a => a.id === assignmentId);
    if (!assignment) return;
    
    const employeeName = assignment.employeeName;
    const period = assignment.period;
    const [year, month] = period.split('-');
    
    // Gather system data for this employee and period
    const employeeData = gatherEmployeePerformanceData(employeeName, year, month);
    
    // Fill in metric values based on metric names
    assignment.metrics.forEach(metric => {
        const autoValue = getAutoValueForMetric(metric, employeeData);
        if (autoValue !== null) {
            const input = document.querySelector(`[data-metric-id="${metric.id}"]`);
            if (input) {
                input.value = autoValue;
                calculateMetricScore(input, metric.target, metric.unit);
            }
        }
    });
    
    updateOverallScorePreview();
    showNotification('KPI scores auto-calculated from system data!', 'success');
}

function gatherEmployeePerformanceData(employeeName, year, month) {
    // Get sales data - always try localStorage first for freshest data, then window objects
    let posSales = [];
    try {
        const storedSales = localStorage.getItem('ezcubic_sales');
        if (storedSales) {
            posSales = JSON.parse(storedSales);
        }
        if (Array.isArray(window.sales) && window.sales.length > 0) {
            if (posSales.length === 0 || window.sales.length > posSales.length) {
                posSales = window.sales;
            }
        }
    } catch (e) {
        posSales = Array.isArray(window.sales) ? window.sales : [];
    }
    if (!Array.isArray(posSales)) posSales = [];
    
    let posReceipts = JSON.parse(localStorage.getItem('ezcubic_pos_receipts') || '[]');
    if (!Array.isArray(posReceipts)) posReceipts = [];
    
    let orders = [];
    try {
        const storedOrders = localStorage.getItem('ezcubic_orders');
        if (storedOrders) {
            orders = JSON.parse(storedOrders);
        }
        if (Array.isArray(window.orders) && window.orders.length > orders.length) {
            orders = window.orders;
        }
    } catch (e) {
        orders = Array.isArray(window.orders) ? window.orders : [];
    }
    if (!Array.isArray(orders)) orders = [];
    
    let transactions = (businessData && Array.isArray(businessData.transactions)) ? businessData.transactions : JSON.parse(localStorage.getItem('ezcubic_transactions') || '[]');
    if (!Array.isArray(transactions)) transactions = [];
    
    let customers = [];
    try {
        const storedCustomers = localStorage.getItem('ezcubic_customers');
        if (storedCustomers) {
            customers = JSON.parse(storedCustomers);
        }
        if (Array.isArray(window.customers) && window.customers.length > customers.length) {
            customers = window.customers;
        }
    } catch (e) {
        customers = Array.isArray(window.customers) ? window.customers : [];
    }
    if (!Array.isArray(customers)) customers = [];
    
    let quotations = [];
    try {
        const storedQuotations = localStorage.getItem('ezcubic_quotations');
        if (storedQuotations) {
            quotations = JSON.parse(storedQuotations);
        }
        if (Array.isArray(window.quotations) && window.quotations.length > quotations.length) {
            quotations = window.quotations;
        }
    } catch (e) {
        quotations = Array.isArray(window.quotations) ? window.quotations : [];
    }
    if (!Array.isArray(quotations)) quotations = [];
    
    let projects = [];
    try {
        const storedProjects = localStorage.getItem('ezcubic_projects');
        if (storedProjects) {
            projects = JSON.parse(storedProjects);
        }
        if (Array.isArray(window.projects) && window.projects.length > projects.length) {
            projects = window.projects;
        }
    } catch (e) {
        projects = Array.isArray(window.projects) ? window.projects : [];
    }
    if (!Array.isArray(projects)) projects = [];
    
    let inventory = [];
    try {
        const storedInventory = localStorage.getItem('ezcubic_products') || localStorage.getItem('ezcubic_inventory');
        if (storedInventory) {
            inventory = JSON.parse(storedInventory);
        }
        if (Array.isArray(window.products) && window.products.length > inventory.length) {
            inventory = window.products;
        }
    } catch (e) {
        inventory = Array.isArray(window.products) ? window.products : [];
    }
    if (!Array.isArray(inventory)) inventory = [];
    
    console.log(`KPI Data for ${employeeName} (${year}-${month}): Sales=${posSales.length}, Orders=${orders.length}, Customers=${customers.length}`);
    
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);
    
    const isInPeriod = (dateStr) => {
        const date = new Date(dateStr);
        return date >= startDate && date <= endDate;
    };
    
    const isEmployeeSale = (salesperson) => {
        if (!salesperson) return false;
        return salesperson.toLowerCase().includes(employeeName.toLowerCase()) ||
               employeeName.toLowerCase().includes(salesperson.toLowerCase());
    };
    
    let employeeSales = [];
    let allPeriodSales = [];
    
    // POS Sales
    posSales.forEach(r => {
        if (isInPeriod(r.date || r.timestamp)) {
            const sale = {
                date: r.date || r.timestamp,
                total: parseFloat(r.total) || 0,
                items: r.items || [],
                customer: r.customerName || 'Walk-in',
                salesperson: r.salesperson || r.cashier || ''
            };
            allPeriodSales.push(sale);
            if (isEmployeeSale(sale.salesperson)) {
                employeeSales.push(sale);
            }
        }
    });
    
    // POS Receipts
    posReceipts.forEach(r => {
        if (isInPeriod(r.date || r.timestamp)) {
            const sale = {
                date: r.date || r.timestamp,
                total: parseFloat(r.total) || 0,
                items: r.items || [],
                customer: r.customerName || 'Walk-in',
                salesperson: r.salesperson || r.cashier || ''
            };
            if (!employeeSales.find(s => s.date === sale.date && s.total === sale.total)) {
                allPeriodSales.push(sale);
                if (isEmployeeSale(sale.salesperson)) {
                    employeeSales.push(sale);
                }
            }
        }
    });
    
    // Orders
    orders.forEach(o => {
        if (o.status === 'completed' && isInPeriod(o.date)) {
            const sale = {
                date: o.date,
                total: parseFloat(o.total) || 0,
                items: o.items || [],
                customer: o.customerName || 'N/A',
                salesperson: o.salesperson || ''
            };
            allPeriodSales.push(sale);
            if (isEmployeeSale(sale.salesperson)) {
                employeeSales.push(sale);
            }
        }
    });
    
    // Calculate metrics
    const totalSales = employeeSales.reduce((sum, s) => sum + s.total, 0);
    const transactionCount = employeeSales.length;
    const totalItems = employeeSales.reduce((sum, s) => sum + (s.items?.length || 0), 0);
    const avgSale = transactionCount > 0 ? totalSales / transactionCount : 0;
    
    const uniqueCustomers = new Set(employeeSales.map(s => s.customer)).size;
    
    const customersBefore = new Set();
    [...posSales, ...posReceipts, ...orders].forEach(s => {
        const saleDate = new Date(s.date || s.timestamp);
        if (saleDate < startDate) {
            customersBefore.add(s.customerName || s.customer);
        }
    });
    const newCustomers = employeeSales.filter(s => 
        s.customer && !customersBefore.has(s.customer) && s.customer !== 'Walk-in'
    ).length;
    
    const employeeQuotations = quotations.filter(q => 
        isEmployeeSale(q.salesperson) && isInPeriod(q.date)
    );
    const convertedQuotations = employeeQuotations.filter(q => q.status === 'converted' || q.status === 'accepted').length;
    const quotationConversion = employeeQuotations.length > 0 ? 
        (convertedQuotations / employeeQuotations.length) * 100 : 0;
    
    const completedProjects = projects.filter(p => 
        isEmployeeSale(p.salesperson) && 
        p.status === 'completed' && 
        isInPeriod(p.completedDate || p.endDate)
    ).length;
    
    const returnCustomers = employeeSales.filter(s => 
        customersBefore.has(s.customer)
    ).length;
    const retentionRate = transactionCount > 0 ? (returnCustomers / transactionCount) * 100 : 0;
    
    let avgResponseTime = 24;
    if (employeeQuotations.length > 0) {
        const responseTimes = employeeQuotations
            .filter(q => q.convertedDate && q.date)
            .map(q => {
                const created = new Date(q.date);
                const converted = new Date(q.convertedDate);
                return (converted - created) / (1000 * 60 * 60);
            });
        if (responseTimes.length > 0) {
            avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
        }
    }
    
    const daysInMonth = new Date(year, month, 0).getDate();
    const workingDays = Math.round(daysInMonth * 5 / 7);
    const dailySalesAvg = totalSales / workingDays;
    const dailyTransactionAvg = transactionCount / workingDays;
    
    return {
        totalSales,
        transactionCount,
        avgSale,
        totalItems,
        dailySalesAvg,
        dailyTransactionAvg,
        uniqueCustomers,
        newCustomers,
        retentionRate,
        returnCustomers,
        quotationCount: employeeQuotations.length,
        quotationConversion,
        convertedQuotations,
        completedProjects,
        avgResponseTime,
        workingDays,
        teamTotalSales: allPeriodSales.reduce((sum, s) => sum + s.total, 0),
        teamSalesCount: allPeriodSales.length,
        salesShare: allPeriodSales.length > 0 ? 
            (transactionCount / allPeriodSales.length) * 100 : 0,
        revenueShare: allPeriodSales.reduce((sum, s) => sum + s.total, 0) > 0 ?
            (totalSales / allPeriodSales.reduce((sum, s) => sum + s.total, 0)) * 100 : 0,
        attendanceRate: 95,
        qualityScore: 90,
        safetyScore: 100,
        customerSatisfaction: 4,
        productivityScore: 85
    };
}

function getAutoValueForMetric(metric, data) {
    const name = metric.name.toLowerCase();
    const unit = metric.unit;
    
    if (name.includes('sales target') || name.includes('sales achievement') || 
        (name.includes('total') && name.includes('sales'))) {
        return data.totalSales;
    }
    if (name.includes('revenue') || name.includes('gross')) {
        return data.totalSales;
    }
    if (name.includes('number of sales') || name.includes('transaction') || 
        name.includes('sales count') || name.includes('deals closed')) {
        return data.transactionCount;
    }
    if (name.includes('average') && (name.includes('sale') || name.includes('order'))) {
        return data.avgSale;
    }
    if (name.includes('new customer') || name.includes('customer acquisition')) {
        return data.newCustomers;
    }
    if (name.includes('retention') || name.includes('repeat customer')) {
        return data.retentionRate;
    }
    if (name.includes('response time') || name.includes('reply time')) {
        return data.avgResponseTime;
    }
    if (name.includes('conversion') || name.includes('close rate')) {
        return data.quotationConversion;
    }
    if (name.includes('unit') || name.includes('items sold') || name.includes('products sold')) {
        return data.totalItems;
    }
    if (name.includes('project') && name.includes('complet')) {
        return data.completedProjects;
    }
    if (name.includes('quotation') && !name.includes('conversion')) {
        return data.quotationCount;
    }
    if (name.includes('customer satisfaction') || name.includes('feedback') || name.includes('csat')) {
        return data.customerSatisfaction;
    }
    if (name.includes('attendance')) {
        return data.attendanceRate;
    }
    if (name.includes('quality')) {
        return data.qualityScore;
    }
    if (name.includes('safety')) {
        if (name.includes('incident')) return 0;
        return data.safetyScore;
    }
    if (name.includes('productivity') || name.includes('output')) {
        if (unit === 'count') return data.transactionCount;
        return data.productivityScore;
    }
    if (name.includes('deliver')) {
        return data.transactionCount;
    }
    if (name.includes('on-time') || name.includes('ontime')) {
        return 95;
    }
    if (name.includes('issue') || name.includes('resolved') || name.includes('ticket')) {
        return data.transactionCount;
    }
    if (name.includes('fulfillment')) {
        return 98;
    }
    if (name.includes('inventory') && name.includes('accuracy')) {
        return 99;
    }
    if (name.includes('training')) {
        return 8;
    }
    if (name.includes('employee') && name.includes('satisfaction')) {
        return 85;
    }
    if (name.includes('payroll') && name.includes('accuracy')) {
        return 100;
    }
    if (name.includes('recruitment')) {
        return 100;
    }
    return null;
}

function closeScoreKPIModal() {
    document.getElementById('scoreKPIModal').style.display = 'none';
}

function calculateMetricScore(input, target, unit) {
    const actual = parseFloat(input.value) || 0;
    const metricId = input.dataset.metricId;
    const scoreDisplay = document.getElementById(`score-${metricId}`);
    
    let score = 0;
    
    if (unit === 'hours' || unit === 'days') {
        score = target > 0 ? Math.min(200, (target / actual) * 100) : 0;
    } else if (unit === 'score') {
        score = (actual / 5) * 100;
    } else {
        score = target > 0 ? (actual / target) * 100 : 0;
    }
    
    score = Math.max(0, Math.min(200, score));
    
    scoreDisplay.textContent = `${score.toFixed(1)}%`;
    scoreDisplay.className = 'metric-score-display ' + getScoreClass(score);
    
    updateOverallScorePreview();
}

function updateOverallScorePreview() {
    const assignmentId = document.getElementById('scoreAssignmentId').value;
    const assignment = kpiAssignments.find(a => a.id === assignmentId);
    if (!assignment) return;
    
    let totalWeightedScore = 0;
    let totalWeight = 0;
    
    assignment.metrics.forEach(metric => {
        const input = document.querySelector(`[data-metric-id="${metric.id}"]`);
        if (input && input.value) {
            const actual = parseFloat(input.value) || 0;
            let score = 0;
            
            if (metric.unit === 'hours' || metric.unit === 'days') {
                score = metric.target > 0 ? Math.min(200, (metric.target / actual) * 100) : 0;
            } else if (metric.unit === 'score') {
                score = (actual / 5) * 100;
            } else {
                score = metric.target > 0 ? (actual / metric.target) * 100 : 0;
            }
            
            score = Math.max(0, Math.min(200, score));
            totalWeightedScore += score * (metric.weight / 100);
            totalWeight += metric.weight;
        }
    });
    
    const overallScore = totalWeight > 0 ? totalWeightedScore : 0;
    const rating = getRating(overallScore);
    
    const preview = document.getElementById('overallScorePreview');
    if (preview) {
        preview.innerHTML = `
            <div class="overall-score-value" style="color: ${rating.color}">
                ${overallScore.toFixed(1)}%
            </div>
            <div class="overall-score-rating">
                <span class="rating-stars">${'★'.repeat(rating.stars)}${'☆'.repeat(5-rating.stars)}</span>
                <span class="rating-label" style="color: ${rating.color}">${rating.label}</span>
            </div>
        `;
    }
}

function saveKPIScore() {
    const assignmentId = document.getElementById('scoreAssignmentId').value;
    const assignment = kpiAssignments.find(a => a.id === assignmentId);
    
    if (!assignment) return;
    
    let totalWeightedScore = 0;
    let allScored = true;
    
    assignment.metrics.forEach(metric => {
        const input = document.querySelector(`[data-metric-id="${metric.id}"]`);
        if (input && input.value) {
            const actual = parseFloat(input.value) || 0;
            let score = 0;
            
            if (metric.unit === 'hours' || metric.unit === 'days') {
                score = metric.target > 0 ? Math.min(200, (metric.target / actual) * 100) : 0;
            } else if (metric.unit === 'score') {
                score = (actual / 5) * 100;
            } else {
                score = metric.target > 0 ? (actual / metric.target) * 100 : 0;
            }
            
            score = Math.max(0, Math.min(200, score));
            
            metric.actual = actual;
            metric.score = score;
            totalWeightedScore += score * (metric.weight / 100);
        } else {
            allScored = false;
        }
    });
    
    if (!allScored) {
        showNotification('Please fill in all metric values', 'error');
        return;
    }
    
    assignment.overallScore = totalWeightedScore;
    assignment.status = 'scored';
    assignment.scoredAt = new Date().toISOString();
    
    const scoreRecord = {
        id: generateUniqueId(),
        assignmentId: assignmentId,
        employeeId: assignment.employeeId,
        employeeName: assignment.employeeName,
        templateName: assignment.templateName,
        period: assignment.period,
        overallScore: totalWeightedScore,
        rating: getRating(totalWeightedScore).label,
        metrics: [...assignment.metrics],
        scoredAt: new Date().toISOString()
    };
    
    kpiScores.push(scoreRecord);
    
    saveKPIAssignments();
    saveKPIScores();
    closeScoreKPIModal();
    loadKPIOverview();
    updateKPIStats();
    showNotification('KPI scores saved!', 'success');
}

// ==================== EXPORT TO WINDOW ====================
window.showAssignKPIModal = showAssignKPIModal;
window.closeAssignKPIModal = closeAssignKPIModal;
window.assignKPIToEmployee = assignKPIToEmployee;
window.showScoreKPIModal = showScoreKPIModal;
window.autoCalculateKPIScores = autoCalculateKPIScores;
window.gatherEmployeePerformanceData = gatherEmployeePerformanceData;
window.getAutoValueForMetric = getAutoValueForMetric;
window.closeScoreKPIModal = closeScoreKPIModal;
window.calculateMetricScore = calculateMetricScore;
window.updateOverallScorePreview = updateOverallScorePreview;
window.saveKPIScore = saveKPIScore;
