// ==================== KPI-REPORTS.JS ====================
// Key Performance Indicator System - Reports Module
// Staff Scorecard, Performance Reports, Export Functions
// Version: 2.2.7 - Modular Split - 26 Dec 2025

// ==================== STAFF PERFORMANCE SCORECARD ====================
function initializeKPIReport() {
    const employeeSelect = document.getElementById('kpiReportEmployee');
    const departmentSelect = document.getElementById('kpiReportDepartment');
    const monthInput = document.getElementById('kpiReportMonth');
    
    const employees = window.getEmployees ? window.getEmployees() : [];
    
    if (employeeSelect) {
        employeeSelect.innerHTML = '<option value="">All Employees</option>' +
            employees.filter(e => e.status === 'active')
            .map(e => `<option value="${e.id}">${escapeHTML(e.name)}</option>`).join('');
    }
    
    if (departmentSelect) {
        const departments = [...new Set(employees.map(e => e.department).filter(Boolean))];
        departmentSelect.innerHTML = '<option value="">All Departments</option>' +
            departments.map(d => `<option value="${d}">${escapeHTML(d)}</option>`).join('');
    }
    
    if (monthInput && !monthInput.value) {
        const today = new Date();
        monthInput.value = today.toISOString().slice(0, 7);
    }
}

function loadKPIReport() {
    console.log('KPI Report filters changed');
}

// Force refresh all data sources for KPI Report
function refreshKPIDataSources() {
    console.log('Refreshing KPI data sources from localStorage...');
    
    try {
        const storedSales = localStorage.getItem('ezcubic_sales');
        if (storedSales) {
            const parsed = JSON.parse(storedSales);
            if (Array.isArray(parsed)) {
                window.sales = parsed;
                if (typeof sales !== 'undefined') sales = parsed;
            }
        }
    } catch (e) { console.error('Error refreshing sales:', e); }
    
    try {
        const storedOrders = localStorage.getItem('ezcubic_orders');
        if (storedOrders) {
            const parsed = JSON.parse(storedOrders);
            if (Array.isArray(parsed)) {
                window.orders = parsed;
                if (typeof orders !== 'undefined') orders = parsed;
            }
        }
    } catch (e) { console.error('Error refreshing orders:', e); }
    
    try {
        const storedCustomers = localStorage.getItem('ezcubic_customers');
        if (storedCustomers) {
            const parsed = JSON.parse(storedCustomers);
            if (Array.isArray(parsed)) {
                window.customers = parsed;
                if (typeof customers !== 'undefined') customers = parsed;
            }
        }
    } catch (e) { console.error('Error refreshing customers:', e); }
    
    try {
        const storedQuotations = localStorage.getItem('ezcubic_quotations');
        if (storedQuotations) {
            const parsed = JSON.parse(storedQuotations);
            if (Array.isArray(parsed)) {
                window.quotations = parsed;
                if (typeof quotations !== 'undefined') quotations = parsed;
            }
        }
    } catch (e) { console.error('Error refreshing quotations:', e); }
    
    try {
        const storedProjects = localStorage.getItem('ezcubic_projects');
        if (storedProjects) {
            const parsed = JSON.parse(storedProjects);
            if (Array.isArray(parsed)) {
                window.projects = parsed;
                if (typeof projects !== 'undefined') projects = parsed;
            }
        }
    } catch (e) { console.error('Error refreshing projects:', e); }
    
    try {
        const storedProducts = localStorage.getItem('ezcubic_products');
        if (storedProducts) {
            const parsed = JSON.parse(storedProducts);
            if (Array.isArray(parsed)) {
                window.products = parsed;
                if (typeof products !== 'undefined') products = parsed;
            }
        }
    } catch (e) { console.error('Error refreshing products:', e); }
    
    try {
        const storedEmployees = localStorage.getItem('ezcubic_employees');
        if (storedEmployees) {
            const parsed = JSON.parse(storedEmployees);
            if (Array.isArray(parsed)) {
                window.employees = parsed;
                if (typeof employees !== 'undefined') employees = parsed;
            }
        }
    } catch (e) { console.error('Error refreshing employees:', e); }
    
    if (typeof loadFromUserTenant === 'function') {
        try {
            loadFromUserTenant();
        } catch (e) { console.error('Error loading from tenant:', e); }
    }
    
    console.log('KPI data sources refreshed. Sales:', (window.sales || []).length, 'Orders:', (window.orders || []).length);
}

// ==================== GENERATE STAFF SCORECARD ====================
function generateStaffScorecard() {
    const selectedEmployee = document.getElementById('kpiReportEmployee')?.value || '';
    const selectedMonth = document.getElementById('kpiReportMonth')?.value || '';
    const selectedDepartment = document.getElementById('kpiReportDepartment')?.value || '';
    
    if (!selectedMonth) {
        showNotification('Please select a month', 'error');
        return;
    }
    
    refreshKPIDataSources();
    
    const [year, month] = selectedMonth.split('-');
    const employees = window.getEmployees ? window.getEmployees() : [];
    let activeEmployees = employees.filter(e => e.status === 'active');
    
    if (selectedDepartment) {
        activeEmployees = activeEmployees.filter(e => e.department === selectedDepartment);
    }
    
    if (selectedEmployee) {
        activeEmployees = activeEmployees.filter(e => e.id === selectedEmployee);
    }
    
    if (activeEmployees.length === 0) {
        document.getElementById('staffScorecardContainer').innerHTML = `
            <div style="text-align: center; padding: 60px; color: #666; background: #f8fafc; border-radius: 12px;">
                <i class="fas fa-users-slash" style="font-size: 48px; margin-bottom: 15px; display: block; color: #94a3b8;"></i>
                <h4 style="margin: 0 0 10px 0; color: #475569;">No Employees Found</h4>
                <p style="margin: 0;">Add employees in the HR module to generate scorecards</p>
            </div>
        `;
        return;
    }
    
    let scorecardData = [];
    let topPerformers = 0;
    let needsImprovement = 0;
    let totalScores = [];
    
    activeEmployees.forEach(employee => {
        const perfData = gatherEmployeePerformanceData(employee.name, year, month);
        const attendanceData = getEmployeeAttendance(employee.id, year, month);
        const taskData = getEmployeeTaskCompletion(employee.id, year, month);
        
        const salesScore = calculateSalesScore(perfData);
        const attendanceScore = calculateAttendanceScore(attendanceData);
        const taskScore = calculateTaskScore(taskData);
        const qualityScore = getManualQualityScore(employee.id, year, month);
        
        const overallScore = (salesScore * 0.4) + (attendanceScore * 0.3) + (taskScore * 0.2) + (qualityScore * 0.1);
        const rating = getRating(overallScore);
        
        if (overallScore >= 90) topPerformers++;
        if (overallScore < 60) needsImprovement++;
        if (overallScore > 0) totalScores.push(overallScore);
        
        scorecardData.push({
            employee: employee,
            salesScore: salesScore,
            salesData: perfData,
            attendanceScore: attendanceScore,
            attendanceData: attendanceData,
            taskScore: taskScore,
            taskData: taskData,
            qualityScore: qualityScore,
            overallScore: overallScore,
            rating: rating,
            period: selectedMonth
        });
    });
    
    scorecardData.sort((a, b) => b.overallScore - a.overallScore);
    
    const avgPerformance = totalScores.length > 0 ? 
        totalScores.reduce((a, b) => a + b, 0) / totalScores.length : 0;
    
    document.getElementById('kpiAvgPerformance').textContent = avgPerformance > 0 ? `${avgPerformance.toFixed(0)}%` : '-';
    document.getElementById('kpiTopPerformers').textContent = topPerformers;
    document.getElementById('kpiNeedsImprovement').textContent = needsImprovement;
    document.getElementById('kpiEmployeesEvaluated').textContent = scorecardData.length;
    
    renderStaffScorecards(scorecardData, selectedMonth);
    
    window.lastScorecardData = scorecardData;
    
    showNotification(`Generated scorecards for ${scorecardData.length} employee(s)`, 'success');
}

// ==================== HELPER FUNCTIONS FOR SCORECARD ====================
function getEmployeeAttendance(employeeId, year, month) {
    const attendanceRecords = window.attendanceRecords || 
        JSON.parse(localStorage.getItem('ezcubic_attendance') || '[]');
    
    if (!Array.isArray(attendanceRecords)) return { present: 0, total: 22, late: 0 };
    
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);
    
    let workingDays = 0;
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
        if (d.getDay() !== 0 && d.getDay() !== 6) workingDays++;
    }
    
    const monthRecords = attendanceRecords.filter(r => {
        if (r.employeeId !== employeeId) return false;
        const recordDate = new Date(r.date);
        return recordDate >= startDate && recordDate <= endDate;
    });
    
    const present = monthRecords.filter(r => r.status === 'present' || r.status === 'late').length;
    const late = monthRecords.filter(r => r.status === 'late').length;
    
    return {
        present: present,
        total: workingDays,
        late: late,
        absent: workingDays - present
    };
}

function getEmployeeTaskCompletion(employeeId, year, month) {
    const projects = window.projects || JSON.parse(localStorage.getItem('ezcubic_projects') || '[]');
    
    if (!Array.isArray(projects)) return { completed: 0, total: 0, onTime: 0 };
    
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);
    
    let completedTasks = 0;
    let totalTasks = 0;
    let onTimeTasks = 0;
    
    const employees = window.getEmployees ? window.getEmployees() : [];
    const employee = employees.find(e => e.id === employeeId);
    const employeeName = employee?.name || '';
    
    projects.forEach(project => {
        if (!project.tasks) return;
        
        project.tasks.forEach(task => {
            const isAssigned = task.assignedTo === employeeId || 
                             task.assignedTo === employeeName ||
                             (task.assignees && task.assignees.includes(employeeId));
            
            if (!isAssigned) return;
            
            const taskDue = task.dueDate ? new Date(task.dueDate) : null;
            const taskCompleted = task.completedAt ? new Date(task.completedAt) : null;
            
            if (taskDue && taskDue >= startDate && taskDue <= endDate) {
                totalTasks++;
                if (task.status === 'completed' || task.status === 'done') {
                    completedTasks++;
                    if (taskCompleted && taskCompleted <= taskDue) {
                        onTimeTasks++;
                    }
                }
            }
        });
    });
    
    return {
        completed: completedTasks,
        total: totalTasks,
        onTime: onTimeTasks
    };
}

function getManualQualityScore(employeeId, year, month) {
    const kpiScoresData = window.kpiScores || JSON.parse(localStorage.getItem('ezcubic_kpi_scores') || '[]');
    
    const period = `${year}-${month.toString().padStart(2, '0')}`;
    const qualityRecord = kpiScoresData.find(s => 
        s.employeeId === employeeId && 
        s.period === period &&
        s.category === 'quality'
    );
    
    if (qualityRecord) {
        return qualityRecord.score || 80;
    }
    
    return 80;
}

function calculateSalesScore(perfData) {
    const salesTarget = window.salesTargets?.[perfData.employeeId] || 10000;
    
    if (!perfData.totalSales || perfData.totalSales === 0) return 0;
    
    const percentAchieved = (perfData.totalSales / salesTarget) * 100;
    return Math.min(100, Math.max(0, percentAchieved * (100 / 120)));
}

function calculateAttendanceScore(attendanceData) {
    if (!attendanceData.total || attendanceData.total === 0) return 80;
    
    const attendanceRate = (attendanceData.present / attendanceData.total) * 100;
    const lateDeduction = (attendanceData.late / attendanceData.total) * 10;
    
    return Math.min(100, Math.max(0, attendanceRate - lateDeduction));
}

function calculateTaskScore(taskData) {
    if (!taskData.total || taskData.total === 0) return 80;
    
    const completionRate = (taskData.completed / taskData.total) * 100;
    const onTimeBonus = taskData.completed > 0 ? (taskData.onTime / taskData.completed) * 10 : 0;
    
    return Math.min(100, Math.max(0, completionRate + onTimeBonus));
}

// ==================== RENDER SCORECARDS ====================
function renderStaffScorecards(scorecardData, period) {
    const container = document.getElementById('staffScorecardContainer');
    const monthName = new Date(period + '-01').toLocaleDateString('en-MY', { month: 'long', year: 'numeric' });
    
    container.innerHTML = `
        <div class="scorecard-grid">
            ${scorecardData.map((data, index) => renderSingleScorecard(data, index, monthName)).join('')}
        </div>
    `;
    
    renderPerformanceComparison(scorecardData);
}

function renderSingleScorecard(data, rank, monthName) {
    const initials = data.employee.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
    const avatarColors = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4', '#ec4899'];
    const avatarColor = avatarColors[rank % avatarColors.length];
    
    const getBarClass = (score) => {
        if (score >= 90) return 'excellent';
        if (score >= 70) return 'good';
        if (score >= 50) return 'average';
        return 'poor';
    };
    
    return `
        <div class="staff-scorecard">
            <div class="scorecard-header" style="background: linear-gradient(135deg, ${avatarColor}, ${avatarColor}dd);">
                <div class="scorecard-avatar">${initials}</div>
                <div class="scorecard-employee-info">
                    <h3>${escapeHTML(data.employee.name)}</h3>
                    <div class="department">${escapeHTML(data.employee.department || 'General')}</div>
                    <div class="position">${escapeHTML(data.employee.position || 'Staff')}</div>
                </div>
                <div class="scorecard-overall">
                    <div class="score">${data.overallScore.toFixed(0)}%</div>
                    <div class="label">Overall</div>
                </div>
            </div>
            
            <div class="scorecard-metrics">
                <div class="scorecard-metric">
                    <div class="metric-icon sales"><i class="fas fa-dollar-sign"></i></div>
                    <div class="metric-label">Sales</div>
                    <div class="metric-value">${data.salesScore.toFixed(0)}%</div>
                    <div class="metric-detail">${formatCurrency(data.salesData.totalSales)} | ${data.salesData.transactionCount} txn</div>
                    <div class="metric-bar"><div class="metric-bar-fill ${getBarClass(data.salesScore)}" style="width: ${Math.min(100, data.salesScore)}%"></div></div>
                </div>
                
                <div class="scorecard-metric">
                    <div class="metric-icon attendance"><i class="fas fa-calendar-check"></i></div>
                    <div class="metric-label">Attendance</div>
                    <div class="metric-value">${data.attendanceScore.toFixed(0)}%</div>
                    <div class="metric-detail">${data.attendanceData.present}/${data.attendanceData.total} days | ${data.attendanceData.late} late</div>
                    <div class="metric-bar"><div class="metric-bar-fill ${getBarClass(data.attendanceScore)}" style="width: ${Math.min(100, data.attendanceScore)}%"></div></div>
                </div>
                
                <div class="scorecard-metric">
                    <div class="metric-icon tasks"><i class="fas fa-tasks"></i></div>
                    <div class="metric-label">Tasks</div>
                    <div class="metric-value">${data.taskScore.toFixed(0)}%</div>
                    <div class="metric-detail">${data.taskData.completed}/${data.taskData.total} done | ${data.taskData.onTime} on-time</div>
                    <div class="metric-bar"><div class="metric-bar-fill ${getBarClass(data.taskScore)}" style="width: ${Math.min(100, data.taskScore)}%"></div></div>
                </div>
                
                <div class="scorecard-metric">
                    <div class="metric-icon quality"><i class="fas fa-star"></i></div>
                    <div class="metric-label">Quality</div>
                    <div class="metric-value">${data.qualityScore.toFixed(0)}%</div>
                    <div class="metric-detail">Based on feedback</div>
                    <div class="metric-bar"><div class="metric-bar-fill ${getBarClass(data.qualityScore)}" style="width: ${Math.min(100, data.qualityScore)}%"></div></div>
                </div>
            </div>
            
            <div class="scorecard-footer">
                <div class="scorecard-rating">
                    <span class="stars">${'★'.repeat(data.rating.stars)}${'☆'.repeat(5-data.rating.stars)}</span>
                    <span class="rating-text">${data.rating.label}</span>
                </div>
                <div class="scorecard-actions">
                    <button class="btn-view" onclick="viewScorecardDetail('${data.employee.id}', '${data.period}')">
                        <i class="fas fa-eye"></i> Detail
                    </button>
                    <button class="btn-print" onclick="printScorecard('${data.employee.id}', '${data.period}')">
                        <i class="fas fa-print"></i>
                    </button>
                </div>
            </div>
        </div>
    `;
}

function renderPerformanceComparison(scorecardData) {
    const section = document.getElementById('performanceComparisonSection');
    const tbody = document.getElementById('performanceComparisonBody');
    
    if (!section || !tbody) return;
    
    section.style.display = 'block';
    
    tbody.innerHTML = scorecardData.map((data, index) => {
        const getBadgeClass = (score) => {
            if (score >= 90) return 'excellent';
            if (score >= 70) return 'good';
            if (score >= 50) return 'average';
            return 'poor';
        };
        
        return `
            <tr>
                <td><strong>#${index + 1}</strong></td>
                <td>
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <div style="width: 32px; height: 32px; border-radius: 50%; background: ${['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444'][index % 5]}; color: white; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: bold;">
                            ${data.employee.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                        </div>
                        ${escapeHTML(data.employee.name)}
                    </div>
                </td>
                <td>${escapeHTML(data.employee.department || '-')}</td>
                <td><span class="rating-badge ${getBadgeClass(data.salesScore)}">${data.salesScore.toFixed(0)}%</span></td>
                <td><span class="rating-badge ${getBadgeClass(data.attendanceScore)}">${data.attendanceScore.toFixed(0)}%</span></td>
                <td><span class="rating-badge ${getBadgeClass(data.taskScore)}">${data.taskScore.toFixed(0)}%</span></td>
                <td><span class="rating-badge ${getBadgeClass(data.qualityScore)}">${data.qualityScore.toFixed(0)}%</span></td>
                <td><strong style="color: ${data.rating.color}">${data.overallScore.toFixed(0)}%</strong></td>
                <td>
                    <span style="color: ${data.rating.color};">${'★'.repeat(data.rating.stars)}${'☆'.repeat(5-data.rating.stars)}</span>
                </td>
            </tr>
        `;
    }).join('');
}

// ==================== VIEW & PRINT SCORECARD ====================
function viewScorecardDetail(employeeId, period) {
    const data = window.lastScorecardData?.find(d => d.employee.id === employeeId && d.period === period);
    if (!data) {
        showNotification('Scorecard data not found', 'error');
        return;
    }
    
    const monthName = new Date(period + '-01').toLocaleDateString('en-MY', { month: 'long', year: 'numeric' });
    
    const html = `
        <div style="padding: 20px; max-width: 600px;">
            <h3 style="margin-bottom: 20px; display: flex; align-items: center; gap: 10px;">
                <i class="fas fa-user-chart"></i> 
                ${escapeHTML(data.employee.name)} - ${monthName}
            </h3>
            
            <div class="stats-grid" style="margin-bottom: 20px;">
                <div class="stat-card income">
                    <div class="stat-label">Overall Score</div>
                    <div class="stat-value" style="color: ${data.rating.color}">${data.overallScore.toFixed(0)}%</div>
                </div>
                <div class="stat-card">
                    <div class="stat-label">Rating</div>
                    <div class="stat-value">${data.rating.label}</div>
                </div>
            </div>
            
            <h4 style="margin-bottom: 15px;"><i class="fas fa-chart-bar"></i> Performance Breakdown</h4>
            
            <table class="data-table" style="font-size: 14px;">
                <thead>
                    <tr>
                        <th>Category</th>
                        <th>Weight</th>
                        <th>Score</th>
                        <th>Details</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td><i class="fas fa-dollar-sign text-success"></i> Sales Performance</td>
                        <td>40%</td>
                        <td><strong>${data.salesScore.toFixed(0)}%</strong></td>
                        <td>RM ${data.salesData.totalSales.toFixed(2)} | ${data.salesData.transactionCount} transactions</td>
                    </tr>
                    <tr>
                        <td><i class="fas fa-calendar-check text-primary"></i> Attendance</td>
                        <td>30%</td>
                        <td><strong>${data.attendanceScore.toFixed(0)}%</strong></td>
                        <td>${data.attendanceData.present}/${data.attendanceData.total} present | ${data.attendanceData.late} late</td>
                    </tr>
                    <tr>
                        <td><i class="fas fa-tasks text-warning"></i> Task Completion</td>
                        <td>20%</td>
                        <td><strong>${data.taskScore.toFixed(0)}%</strong></td>
                        <td>${data.taskData.completed}/${data.taskData.total} completed | ${data.taskData.onTime} on-time</td>
                    </tr>
                    <tr>
                        <td><i class="fas fa-star text-purple"></i> Quality</td>
                        <td>10%</td>
                        <td><strong>${data.qualityScore.toFixed(0)}%</strong></td>
                        <td>Based on feedback & reviews</td>
                    </tr>
                </tbody>
                <tfoot>
                    <tr style="font-weight: bold; background: #f8fafc;">
                        <td>TOTAL</td>
                        <td>100%</td>
                        <td style="color: ${data.rating.color}">${data.overallScore.toFixed(0)}%</td>
                        <td>${'★'.repeat(data.rating.stars)}${'☆'.repeat(5-data.rating.stars)} ${data.rating.label}</td>
                    </tr>
                </tfoot>
            </table>
        </div>
    `;
    
    showCustomModal('Scorecard Detail', html);
}

function printScorecard(employeeId, period) {
    const data = window.lastScorecardData?.find(d => d.employee.id === employeeId && d.period === period);
    if (!data) {
        showNotification('Scorecard data not found', 'error');
        return;
    }
    
    const monthName = new Date(period + '-01').toLocaleDateString('en-MY', { month: 'long', year: 'numeric' });
    const businessName = window.settings?.businessName || 'EZCubic Business';
    
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Staff Scorecard - ${data.employee.name}</title>
            <style>
                body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
                .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 15px; margin-bottom: 20px; }
                .header h1 { margin: 0 0 5px 0; }
                .header h2 { margin: 0; color: #666; font-weight: normal; }
                .employee-info { display: flex; justify-content: space-between; margin-bottom: 20px; }
                .score-box { text-align: center; padding: 20px; background: #f0f0f0; border-radius: 10px; }
                .score-box .score { font-size: 48px; font-weight: bold; }
                .score-box .label { font-size: 14px; color: #666; }
                table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
                th { background: #f5f5f5; }
                .footer { margin-top: 30px; text-align: center; font-size: 12px; color: #666; }
                @media print { body { margin: 0; } }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>${businessName}</h1>
                <h2>Staff Performance Scorecard - ${monthName}</h2>
            </div>
            
            <div class="employee-info">
                <div>
                    <p><strong>Employee:</strong> ${data.employee.name}</p>
                    <p><strong>Department:</strong> ${data.employee.department || 'General'}</p>
                    <p><strong>Position:</strong> ${data.employee.position || 'Staff'}</p>
                </div>
                <div class="score-box">
                    <div class="score">${data.overallScore.toFixed(0)}%</div>
                    <div class="label">${data.rating.label}</div>
                </div>
            </div>
            
            <table>
                <thead>
                    <tr>
                        <th>Performance Category</th>
                        <th>Weight</th>
                        <th>Score</th>
                        <th>Details</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>Sales Performance</td>
                        <td>40%</td>
                        <td>${data.salesScore.toFixed(0)}%</td>
                        <td>RM ${data.salesData.totalSales.toFixed(2)} revenue | ${data.salesData.transactionCount} transactions</td>
                    </tr>
                    <tr>
                        <td>Attendance</td>
                        <td>30%</td>
                        <td>${data.attendanceScore.toFixed(0)}%</td>
                        <td>${data.attendanceData.present}/${data.attendanceData.total} days present | ${data.attendanceData.late} late</td>
                    </tr>
                    <tr>
                        <td>Task Completion</td>
                        <td>20%</td>
                        <td>${data.taskScore.toFixed(0)}%</td>
                        <td>${data.taskData.completed}/${data.taskData.total} tasks completed | ${data.taskData.onTime} on-time</td>
                    </tr>
                    <tr>
                        <td>Quality Score</td>
                        <td>10%</td>
                        <td>${data.qualityScore.toFixed(0)}%</td>
                        <td>Based on feedback & quality metrics</td>
                    </tr>
                </tbody>
                <tfoot>
                    <tr style="font-weight: bold;">
                        <td>OVERALL SCORE</td>
                        <td>100%</td>
                        <td>${data.overallScore.toFixed(0)}%</td>
                        <td>${data.rating.label}</td>
                    </tr>
                </tfoot>
            </table>
            
            <div class="footer">
                <p>Generated on ${new Date().toLocaleDateString('en-MY')} | ${businessName}</p>
            </div>
        </body>
        </html>
    `);
    printWindow.document.close();
    printWindow.print();
}

function exportStaffScorecard() {
    const data = window.lastScorecardData;
    if (!data || data.length === 0) {
        showNotification('Generate scorecards first before exporting', 'warning');
        return;
    }
    
    const headers = ['Rank', 'Employee', 'Department', 'Position', 'Sales Score', 'Attendance Score', 'Task Score', 'Quality Score', 'Overall Score', 'Rating'];
    const rows = data.map((d, i) => [
        i + 1,
        d.employee.name,
        d.employee.department || '',
        d.employee.position || '',
        d.salesScore.toFixed(0) + '%',
        d.attendanceScore.toFixed(0) + '%',
        d.taskScore.toFixed(0) + '%',
        d.qualityScore.toFixed(0) + '%',
        d.overallScore.toFixed(0) + '%',
        d.rating.label
    ]);
    
    const csv = [headers.join(','), ...rows.map(r => r.map(c => `"${c}"`).join(','))].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `staff-scorecard-${data[0].period}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    
    showNotification('Scorecard exported successfully', 'success');
}

// Backward compatibility
function generateAutoKPIReport() {
    generateStaffScorecard();
}

// ==================== EXPORT TO WINDOW ====================
window.initializeKPIReport = initializeKPIReport;
window.loadKPIReport = loadKPIReport;
window.refreshKPIDataSources = refreshKPIDataSources;
window.generateStaffScorecard = generateStaffScorecard;
window.getEmployeeAttendance = getEmployeeAttendance;
window.getEmployeeTaskCompletion = getEmployeeTaskCompletion;
window.getManualQualityScore = getManualQualityScore;
window.calculateSalesScore = calculateSalesScore;
window.calculateAttendanceScore = calculateAttendanceScore;
window.calculateTaskScore = calculateTaskScore;
window.renderStaffScorecards = renderStaffScorecards;
window.renderSingleScorecard = renderSingleScorecard;
window.renderPerformanceComparison = renderPerformanceComparison;
window.viewScorecardDetail = viewScorecardDetail;
window.printScorecard = printScorecard;
window.exportStaffScorecard = exportStaffScorecard;
window.generateAutoKPIReport = generateAutoKPIReport;
