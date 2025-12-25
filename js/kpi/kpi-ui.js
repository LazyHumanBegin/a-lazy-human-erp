// ==================== KPI-UI.JS ====================
// Key Performance Indicator System - UI Module
// Overview, Modals, Display Functions, Employee Performance
// Version: 2.2.7 - Modular Split - 26 Dec 2025

// ==================== KPI OVERVIEW ====================
function loadKPIOverview() {
    const container = document.getElementById('kpiOverviewGrid');
    if (!container) return;
    
    const periodFilter = document.getElementById('kpiPeriodFilter')?.value || '';
    
    let filtered = [...kpiAssignments].sort((a, b) => 
        new Date(b.assignedAt) - new Date(a.assignedAt)
    );
    
    if (periodFilter) {
        filtered = filtered.filter(a => a.period === periodFilter);
    }
    
    if (filtered.length === 0) {
        container.innerHTML = `
            <div class="empty-state" style="grid-column: 1/-1;">
                <i class="fas fa-chart-bar"></i>
                <h4>No KPI Assignments</h4>
                <p>Assign KPIs to employees to track performance</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = filtered.map(assignment => {
        const rating = assignment.overallScore !== null ? getRating(assignment.overallScore) : null;
        
        return `
            <div class="kpi-assignment-card ${assignment.status}">
                <div class="assignment-header">
                    <div class="employee-avatar-small">
                        ${assignment.employeeName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                    </div>
                    <div class="assignment-info">
                        <h4>${escapeHTML(assignment.employeeName)}</h4>
                        <span class="assignment-template">${escapeHTML(assignment.templateName)}</span>
                    </div>
                    <span class="assignment-period">${formatPeriod(assignment.period)}</span>
                </div>
                
                ${assignment.status === 'scored' ? `
                    <div class="assignment-score">
                        <div class="score-circle" style="border-color: ${rating.color}">
                            <span class="score-value">${assignment.overallScore.toFixed(0)}%</span>
                        </div>
                        <div class="score-details">
                            <span class="rating-stars" style="color: ${rating.color}">${'★'.repeat(rating.stars)}${'☆'.repeat(5-rating.stars)}</span>
                            <span class="rating-label">${rating.label}</span>
                        </div>
                    </div>
                    <div class="assignment-metrics-mini">
                        ${assignment.metrics.map(m => `
                            <div class="metric-mini ${getScoreClass(m.score)}">
                                <span class="metric-mini-name">${escapeHTML(m.name.substring(0, 15))}${m.name.length > 15 ? '...' : ''}</span>
                                <span class="metric-mini-score">${m.score.toFixed(0)}%</span>
                            </div>
                        `).join('')}
                    </div>
                ` : `
                    <div class="assignment-pending">
                        <i class="fas fa-clock"></i>
                        <span>Pending Scoring</span>
                    </div>
                `}
                
                <div class="assignment-actions">
                    ${assignment.status === 'pending' ? `
                        <button class="btn-primary" onclick="showScoreKPIModal('${assignment.id}')">
                            <i class="fas fa-edit"></i> Score Now
                        </button>
                    ` : `
                        <button class="btn-secondary" onclick="showScoreKPIModal('${assignment.id}')">
                            <i class="fas fa-edit"></i> Update
                        </button>
                        <button class="btn-secondary" onclick="viewEmployeePerformance('${assignment.employeeId}')">
                            <i class="fas fa-chart-line"></i> History
                        </button>
                    `}
                </div>
            </div>
        `;
    }).join('');
}

function filterKPIByPeriod() {
    loadKPIOverview();
}

// ==================== EMPLOYEE PERFORMANCE ====================
function viewEmployeePerformance(employeeId) {
    const modal = document.getElementById('performanceModal');
    const employee = (window.getEmployees ? window.getEmployees() : []).find(e => e.id === employeeId);
    
    if (!employee) return;
    
    const employeeScores = kpiScores.filter(s => s.employeeId === employeeId)
        .sort((a, b) => new Date(b.period) - new Date(a.period));
    
    const content = document.getElementById('performanceContent');
    
    if (employeeScores.length === 0) {
        content.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-chart-line"></i>
                <h4>No Performance History</h4>
                <p>Score KPIs to build performance history</p>
            </div>
        `;
    } else {
        const avgScore = employeeScores.reduce((sum, s) => sum + s.overallScore, 0) / employeeScores.length;
        const avgRating = getRating(avgScore);
        const bestScore = Math.max(...employeeScores.map(s => s.overallScore));
        const latestScore = employeeScores[0];
        
        content.innerHTML = `
            <div class="performance-header">
                <div class="employee-avatar-large">
                    ${employee.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                </div>
                <div class="performance-summary">
                    <h3>${escapeHTML(employee.name)}</h3>
                    <p>${escapeHTML(employee.position || 'No Position')} • ${escapeHTML(employee.department || 'No Department')}</p>
                </div>
            </div>
            
            <div class="performance-stats">
                <div class="perf-stat">
                    <span class="perf-stat-value" style="color: ${avgRating.color}">${avgScore.toFixed(0)}%</span>
                    <span class="perf-stat-label">Average Score</span>
                </div>
                <div class="perf-stat">
                    <span class="perf-stat-value">${bestScore.toFixed(0)}%</span>
                    <span class="perf-stat-label">Best Score</span>
                </div>
                <div class="perf-stat">
                    <span class="perf-stat-value">${employeeScores.length}</span>
                    <span class="perf-stat-label">Reviews</span>
                </div>
                <div class="perf-stat">
                    <span class="perf-stat-value">${'★'.repeat(avgRating.stars)}</span>
                    <span class="perf-stat-label">${avgRating.label}</span>
                </div>
            </div>
            
            <h4 style="margin: 20px 0 15px;"><i class="fas fa-history"></i> Performance History</h4>
            <div class="performance-history">
                ${employeeScores.map(score => {
                    const rating = getRating(score.overallScore);
                    return `
                        <div class="history-item">
                            <div class="history-period">${formatPeriod(score.period)}</div>
                            <div class="history-template">${escapeHTML(score.templateName)}</div>
                            <div class="history-score">
                                <span class="score-badge" style="background: ${rating.color}">${score.overallScore.toFixed(0)}%</span>
                                <span class="rating-text">${rating.label}</span>
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        `;
    }
    
    document.getElementById('performanceEmployeeName').textContent = employee.name;
    modal.style.display = 'flex';
}

function closePerformanceModal() {
    document.getElementById('performanceModal').style.display = 'none';
}

// ==================== KPI TABS ====================
function showKPITab(tab) {
    document.querySelectorAll('#kpiSection .tab').forEach(t => t.classList.remove('active'));
    event.currentTarget.classList.add('active');
    
    const templatesSection = document.getElementById('kpiTemplatesSection');
    const overviewSection = document.getElementById('kpiOverviewSection');
    const reportSection = document.getElementById('kpiReportSection');
    
    templatesSection.style.display = 'none';
    overviewSection.style.display = 'none';
    if (reportSection) reportSection.style.display = 'none';
    
    if (tab === 'templates') {
        templatesSection.style.display = 'block';
        loadKPITemplates();
    } else if (tab === 'report') {
        if (reportSection) {
            reportSection.style.display = 'block';
            initializeKPIReport();
        }
    } else {
        overviewSection.style.display = 'block';
        loadKPIOverview();
    }
}

// ==================== KPI REPORT DETAIL ====================
function viewKPIReportDetail(employeeId, templateId, period) {
    const reportData = window.lastKPIReportData?.find(d => 
        d.employeeId === employeeId && d.templateId === templateId && d.period === period
    );
    
    if (!reportData) {
        showNotification('Report data not found', 'error');
        return;
    }
    
    const detailHtml = `
        <div style="padding: 20px;">
            <h3 style="margin-bottom: 20px;">
                <i class="fas fa-chart-pie"></i> KPI Detail - ${escapeHTML(reportData.employeeName)}
            </h3>
            
            <div class="stats-grid" style="margin-bottom: 20px;">
                <div class="stat-card income">
                    <div class="stat-label">Overall Score</div>
                    <div class="stat-value" style="color: ${reportData.rating.color}">${reportData.overallScore.toFixed(0)}%</div>
                </div>
                <div class="stat-card">
                    <div class="stat-label">Rating</div>
                    <div class="stat-value">${reportData.rating.label}</div>
                </div>
            </div>
            
            <h4 style="margin-bottom: 15px;"><i class="fas fa-list"></i> Metric Breakdown</h4>
            <table class="data-table" style="font-size: 14px;">
                <thead>
                    <tr>
                        <th>Metric</th>
                        <th>Weight</th>
                        <th>Target</th>
                        <th>Actual</th>
                        <th>Score</th>
                    </tr>
                </thead>
                <tbody>
                    ${reportData.metrics.map(m => `
                        <tr>
                            <td>${escapeHTML(m.name)}</td>
                            <td>${m.weight}%</td>
                            <td>${m.target} ${m.unit}</td>
                            <td>${m.actual !== null ? `${m.unit === 'RM' ? formatCurrency(m.actual) : m.actual}` : '<em>N/A</em>'}</td>
                            <td>
                                <span class="score-badge ${getScoreClass(m.score)}" style="padding: 2px 8px; border-radius: 10px;">
                                    ${m.score.toFixed(0)}%
                                </span>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
            
            <div style="margin-top: 20px; text-align: right;">
                <button class="btn-secondary" onclick="this.closest('.modal-overlay').remove()">Close</button>
                <button class="btn-primary" onclick="saveAutoKPIScore('${employeeId}', '${templateId}', '${period}'); this.closest('.modal-overlay').remove();">
                    <i class="fas fa-save"></i> Save This Score
                </button>
            </div>
        </div>
    `;
    
    const modalOverlay = document.createElement('div');
    modalOverlay.className = 'modal-overlay';
    modalOverlay.style.cssText = 'position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 10000;';
    modalOverlay.innerHTML = `
        <div class="modal-content" style="background: white; border-radius: 12px; max-width: 700px; width: 90%; max-height: 80vh; overflow-y: auto;">
            ${detailHtml}
        </div>
    `;
    modalOverlay.onclick = (e) => {
        if (e.target === modalOverlay) modalOverlay.remove();
    };
    document.body.appendChild(modalOverlay);
}

function saveAutoKPIScore(employeeId, templateId, period) {
    const reportData = window.lastKPIReportData?.find(d => 
        d.employeeId === employeeId && d.templateId === templateId && d.period === period
    );
    
    if (!reportData) {
        showNotification('Report data not found', 'error');
        return;
    }
    
    let assignment = kpiAssignments.find(a => 
        a.employeeId === employeeId && 
        a.templateId === templateId && 
        a.period === period
    );
    
    const template = kpiTemplates.find(t => t.id === templateId);
    
    if (!assignment) {
        assignment = {
            id: generateUniqueId(),
            templateId: templateId,
            templateName: template.name,
            employeeId: employeeId,
            employeeName: reportData.employeeName,
            period: period,
            metrics: reportData.metrics,
            status: 'scored',
            overallScore: reportData.overallScore,
            assignedAt: new Date().toISOString(),
            scoredAt: new Date().toISOString()
        };
        kpiAssignments.push(assignment);
    } else {
        assignment.metrics = reportData.metrics;
        assignment.overallScore = reportData.overallScore;
        assignment.status = 'scored';
        assignment.scoredAt = new Date().toISOString();
    }
    
    const existingScore = kpiScores.find(s => 
        s.employeeId === employeeId && 
        s.templateName === template.name && 
        s.period === period
    );
    
    if (!existingScore) {
        const scoreRecord = {
            id: generateUniqueId(),
            assignmentId: assignment.id,
            employeeId: employeeId,
            employeeName: reportData.employeeName,
            templateName: template.name,
            period: period,
            overallScore: reportData.overallScore,
            rating: reportData.rating.label,
            metrics: [...reportData.metrics],
            scoredAt: new Date().toISOString(),
            autoGenerated: true
        };
        kpiScores.push(scoreRecord);
    } else {
        existingScore.overallScore = reportData.overallScore;
        existingScore.rating = reportData.rating.label;
        existingScore.metrics = [...reportData.metrics];
        existingScore.scoredAt = new Date().toISOString();
        existingScore.autoGenerated = true;
    }
    
    saveKPIAssignments();
    saveKPIScores();
    updateKPIStats();
    
    showNotification(`KPI score saved for ${reportData.employeeName}!`, 'success');
}

function exportKPIReport() {
    const reportData = window.lastKPIReportData;
    
    if (!reportData || reportData.length === 0) {
        showNotification('No report data to export. Generate a report first.', 'error');
        return;
    }
    
    const headers = ['Employee', 'Template', 'Period', 'Sales (RM)', 'Transactions', 'Avg Sale', 'Score (%)', 'Rating'];
    const rows = reportData.map(d => [
        d.employeeName,
        d.templateName,
        d.period,
        d.sales.toFixed(2),
        d.transactions,
        d.avgSale.toFixed(2),
        d.overallScore.toFixed(1),
        d.rating.label
    ]);
    
    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `KPI_Report_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    
    showNotification('KPI report exported!', 'success');
}

// ==================== MISSING FUNCTION STUBS ====================
function loadEmployeeKPIs(employeeId) {
    const container = document.getElementById('employeeKPIsContainer');
    if (!container) return;
    
    const employeeAssignments = kpiAssignments.filter(a => a.employeeId === employeeId);
    
    if (employeeAssignments.length === 0) {
        container.innerHTML = '<p class="text-muted">No KPIs assigned to this employee.</p>';
        return;
    }
    
    container.innerHTML = employeeAssignments.map(assignment => {
        const template = kpiTemplates.find(t => t.id === assignment.templateId);
        const score = assignment.scores?.[assignment.scores?.length - 1] || null;
        
        return `
            <div class="kpi-item">
                <div class="kpi-name">${template?.name || 'Unknown KPI'}</div>
                <div class="kpi-score">${score ? score.totalScore + '%' : 'Not scored'}</div>
            </div>
        `;
    }).join('');
}

// ==================== EXPORT TO WINDOW ====================
window.loadKPIOverview = loadKPIOverview;
window.filterKPIByPeriod = filterKPIByPeriod;
window.viewEmployeePerformance = viewEmployeePerformance;
window.closePerformanceModal = closePerformanceModal;
window.showKPITab = showKPITab;
window.viewKPIReportDetail = viewKPIReportDetail;
window.saveAutoKPIScore = saveAutoKPIScore;
window.exportKPIReport = exportKPIReport;
window.loadEmployeeKPIs = loadEmployeeKPIs;
