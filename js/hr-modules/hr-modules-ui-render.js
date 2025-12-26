/**
 * EZCubic - HR Modules UI Render
 * KPI & Performance UI functions
 * Version: 2.3.3 - Split from hr-modules-ui.js
 */

// ==================== KPI & PERFORMANCE UI ====================
function initializeKPISection() {
    const employees = getEmployees();
    
    // If no employees, show setup guide
    if (employees.length === 0) {
        showKPISetupGuide();
        return;
    }
    
    loadKPISectionStats();
    loadKPISectionFilters();
    loadKPISectionTemplates();
    // Auto-generate report on load
    generateKPISectionReport();
}

function showKPISetupGuide() {
    const reportTab = document.getElementById('kpiReportTab');
    if (reportTab) {
        reportTab.innerHTML = `
            <div style="text-align: center; padding: 60px 20px;">
                <i class="fas fa-chart-line" style="font-size: 80px; color: #0d6efd; margin-bottom: 20px;"></i>
                <h3>Set Up KPI & Performance Tracking</h3>
                <p style="color: #64748b; margin-bottom: 30px;">To use KPI tracking, you need employees in your system first.</p>
                
                <div style="display: flex; gap: 15px; justify-content: center; flex-wrap: wrap;">
                    <button class="btn-primary" onclick="showSection('payroll')">
                        <i class="fas fa-users"></i> Go to Employees
                    </button>
                    <button class="btn-outline" onclick="loadKPISampleData()">
                        <i class="fas fa-database"></i> Load Sample Data
                    </button>
                </div>
                
                <div style="margin-top: 40px; text-align: left; max-width: 500px; margin-left: auto; margin-right: auto; background: #f8fafc; padding: 20px; border-radius: 12px;">
                    <h4 style="margin: 0 0 15px;"><i class="fas fa-lightbulb" style="color: #f59e0b;"></i> How KPI Tracking Works</h4>
                    <ul style="color: #64748b; padding-left: 20px; margin: 0;">
                        <li style="margin-bottom: 8px;">Add employees in the Employees & Payroll section</li>
                        <li style="margin-bottom: 8px;">Set sales targets for each employee</li>
                        <li style="margin-bottom: 8px;">Assign transactions to employees (via POS or manual entry)</li>
                        <li style="margin-bottom: 8px;">KPI scores are auto-calculated based on sales performance</li>
                        <li>View leaderboards and performance reports here</li>
                    </ul>
                </div>
            </div>
        `;
    }
}

function loadKPISampleData() {
    loadKPISampleDataCore();
    showNotification('Sample KPI data loaded successfully!', 'success');
    initializeKPISection();
}

function showKPITab(tabName) {
    // Hide all sections - use actual element IDs from HTML
    const overviewSection = document.getElementById('kpiOverviewSection');
    const reportSection = document.getElementById('kpiReportSection');
    const templatesSection = document.getElementById('kpiTemplatesSection');
    
    if (overviewSection) overviewSection.style.display = 'none';
    if (reportSection) reportSection.style.display = 'none';
    if (templatesSection) templatesSection.style.display = 'none';
    
    // Remove active from all tabs
    document.querySelectorAll('#kpiSection .tabs.secondary .tab').forEach(tab => tab.classList.remove('active'));
    
    // Show selected section
    const sectionMap = {
        'overview': overviewSection,
        'report': reportSection,
        'templates': templatesSection
    };
    
    if (sectionMap[tabName]) {
        sectionMap[tabName].style.display = 'block';
    }
    
    // Find and activate correct button
    const tabs = document.querySelectorAll('#kpiSection .tabs.secondary .tab');
    tabs.forEach(tab => {
        if (tab.onclick && tab.onclick.toString().includes(`'${tabName}'`)) {
            tab.classList.add('active');
        }
    });
    
    // Load content based on tab
    if (tabName === 'overview') {
        if (typeof loadKPIOverview === 'function') loadKPIOverview();
    } else if (tabName === 'report') {
        if (typeof initializeKPIReport === 'function') initializeKPIReport();
    } else if (tabName === 'templates') {
        loadKPISectionTemplates();
    }
}

function loadKPISectionStats() {
    const stats = getKPISectionStats();
    
    document.getElementById('kpiSectionTotalSales').textContent = `RM ${stats.totalSales.toLocaleString()}`;
    document.getElementById('kpiSectionTransactions').textContent = stats.txCount;
}

function loadKPISectionFilters() {
    const employees = getEmployees();
    const templates = getKPITemplates();
    
    const empFilter = document.getElementById('kpiSectionEmployee');
    if (empFilter) {
        empFilter.innerHTML = `
            <option value="">All Employees</option>
            ${employees.map(e => `<option value="${e.id}">${e.name}</option>`).join('')}
        `;
    }
    
    const templateFilter = document.getElementById('kpiSectionTemplate');
    if (templateFilter) {
        templateFilter.innerHTML = `
            <option value="">All Templates</option>
            ${templates.map(t => `<option value="${t.id}">${t.name}</option>`).join('')}
        `;
    }
    
    const monthFilter = document.getElementById('kpiSectionMonth');
    if (monthFilter) {
        monthFilter.value = new Date().toISOString().slice(0, 7);
    }
}

function loadKPISectionTemplates() {
    const templates = getKPITemplates();
    const grid = document.getElementById('kpiSectionTemplatesGrid');
    
    if (!grid) return;
    
    if (templates.length === 0) {
        grid.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-file-alt"></i>
                <h4>No KPI templates</h4>
                <p>Create your first KPI template</p>
                <button class="btn-primary" onclick="showKPITemplateModal()" style="margin-top: 15px;">
                    <i class="fas fa-plus"></i> Create Template
                </button>
            </div>
        `;
        return;
    }
    
    grid.innerHTML = templates.map(t => `
        <div class="kpi-template-card" style="background: #f8fafc; border-radius: 12px; padding: 20px; border: 1px solid #e2e8f0;">
            <h4 style="margin: 0 0 10px;">${t.name}</h4>
            <p style="color: #64748b; font-size: 14px; margin: 0 0 15px;">${t.description || 'No description'}</p>
            <div style="display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 15px;">
                ${t.metrics?.map(m => `<span class="tag">${m.name}</span>`).join('') || ''}
            </div>
            <div style="display: flex; gap: 10px;">
                <button class="btn-small" onclick="editKPITemplate(${t.id})">
                    <i class="fas fa-edit"></i> Edit
                </button>
                <button class="btn-small btn-danger" onclick="deleteKPITemplate(${t.id})">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
    `).join('');
}

function generateKPISectionReport() {
    const employees = getEmployees();
    const month = document.getElementById('kpiSectionMonth')?.value || new Date().toISOString().slice(0, 7);
    const employeeFilter = document.getElementById('kpiSectionEmployee')?.value;
    
    const tbody = document.getElementById('kpiSectionReportBody');
    
    const reports = generateKPIReports(employees, month, employeeFilter);
    
    if (reports.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="9" style="text-align: center; padding: 40px; color: #666;">
                    No employees found
                </td>
            </tr>
        `;
        return;
    }
    
    // Update stats
    const totalSales = reports.reduce((sum, r) => sum + r.totalSales, 0);
    const totalTx = reports.reduce((sum, r) => sum + r.txCount, 0);
    const avgScore = reports.length > 0 ? Math.round(reports.reduce((sum, r) => sum + r.score, 0) / reports.length) : 0;
    
    document.getElementById('kpiSectionTotalSales').textContent = `RM ${totalSales.toLocaleString()}`;
    document.getElementById('kpiSectionTransactions').textContent = totalTx;
    document.getElementById('kpiSectionAvgPerformance').textContent = `${avgScore}%`;
    
    tbody.innerHTML = reports.map(r => `
        <tr>
            <td>${r.employee.name}</td>
            <td>Default</td>
            <td>${month}</td>
            <td>RM ${r.totalSales.toLocaleString()}</td>
            <td>${r.txCount}</td>
            <td>RM ${r.avgSale.toLocaleString()}</td>
            <td>
                <div style="display: flex; align-items: center; gap: 10px;">
                    <div style="flex: 1; background: #e2e8f0; border-radius: 4px; height: 8px;">
                        <div style="width: ${r.score}%; background: ${r.score >= 70 ? '#22c55e' : r.score >= 50 ? '#f59e0b' : '#ef4444'}; height: 100%; border-radius: 4px;"></div>
                    </div>
                    <span>${r.score}%</span>
                </div>
            </td>
            <td><span class="status-badge ${r.rating === 'Excellent' ? 'income' : r.rating === 'Good' ? 'warning' : 'expense'}">${r.rating}</span></td>
            <td>
                <button class="btn-small" onclick="viewEmployeeKPIDetail(${r.employee.id})">
                    <i class="fas fa-eye"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

function loadKPILeaderboard() {
    const employees = getEmployees();
    const currentMonth = new Date().toISOString().slice(0, 7);
    
    const tbody = document.getElementById('kpiLeaderboardBody');
    
    // Calculate scores for all employees
    const scores = employees.map(emp => {
        const kpi = calculateEmployeeKPI(emp, currentMonth);
        return {
            employee: emp,
            totalSales: kpi.totalSales,
            score: kpi.score
        };
    }).sort((a, b) => b.score - a.score);
    
    // Update summary stats
    if (scores.length > 0) {
        document.getElementById('kpiTopPerformer').textContent = scores[0].employee.name;
        document.getElementById('kpiAvgTeamScore').textContent = Math.round(scores.reduce((sum, s) => sum + s.score, 0) / scores.length) + '%';
        document.getElementById('kpiBelowTarget').textContent = scores.filter(s => s.score < 100).length;
        document.getElementById('kpiNeedsImprovement').textContent = scores.filter(s => s.score < 50).length;
    }
    
    if (scores.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" style="text-align: center; padding: 40px; color: #666;">
                    <i class="fas fa-trophy" style="font-size: 40px; margin-bottom: 10px; display: block;"></i>
                    No performance data available yet
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = scores.slice(0, 10).map((s, i) => `
        <tr>
            <td>
                ${i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}
            </td>
            <td>${s.employee.name}</td>
            <td>${s.employee.department || '-'}</td>
            <td>RM ${s.totalSales.toLocaleString()}</td>
            <td>
                <div style="display: flex; align-items: center; gap: 10px;">
                    <div style="flex: 1; background: #e2e8f0; border-radius: 4px; height: 8px; max-width: 100px;">
                        <div style="width: ${s.score}%; background: ${s.score >= 70 ? '#22c55e' : s.score >= 50 ? '#f59e0b' : '#ef4444'}; height: 100%; border-radius: 4px;"></div>
                    </div>
                    <span>${s.score}%</span>
                </div>
            </td>
            <td>
                <i class="fas fa-arrow-${s.score >= 50 ? 'up' : 'down'}" style="color: ${s.score >= 50 ? '#22c55e' : '#ef4444'}"></i>
            </td>
        </tr>
    `).join('');
}

function viewEmployeeKPIDetail(employeeId) {
    const employees = getEmployees();
    const emp = employees.find(e => e.id == employeeId);
    if (!emp) return;
    
    const currentMonth = new Date().toISOString().slice(0, 7);
    const kpi = calculateEmployeeKPI(emp, currentMonth);
    
    showModal(`KPI Details: ${emp.name}`, `
        <div style="padding: 20px;">
            <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; margin-bottom: 20px;">
                <div style="background: #f8fafc; padding: 15px; border-radius: 8px;">
                    <div style="color: #64748b; font-size: 12px;">Total Sales</div>
                    <div style="font-size: 24px; font-weight: bold;">RM ${kpi.totalSales.toLocaleString()}</div>
                </div>
                <div style="background: #f8fafc; padding: 15px; border-radius: 8px;">
                    <div style="color: #64748b; font-size: 12px;">Target</div>
                    <div style="font-size: 24px; font-weight: bold;">RM ${kpi.target.toLocaleString()}</div>
                </div>
                <div style="background: #f8fafc; padding: 15px; border-radius: 8px;">
                    <div style="color: #64748b; font-size: 12px;">Transactions</div>
                    <div style="font-size: 24px; font-weight: bold;">${kpi.txCount}</div>
                </div>
                <div style="background: #f8fafc; padding: 15px; border-radius: 8px;">
                    <div style="color: #64748b; font-size: 12px;">Score</div>
                    <div style="font-size: 24px; font-weight: bold; color: ${kpi.score >= 70 ? '#22c55e' : kpi.score >= 50 ? '#f59e0b' : '#ef4444'};">${kpi.score}%</div>
                </div>
            </div>
            <h4>Recent Transactions</h4>
            <div style="max-height: 200px; overflow-y: auto;">
                ${kpi.transactions.slice(-5).reverse().map(t => `
                    <div style="display: flex; justify-content: space-between; padding: 10px; border-bottom: 1px solid #e2e8f0;">
                        <span>${t.description || 'Sale'}</span>
                        <span style="font-weight: bold;">RM ${(t.amount || 0).toLocaleString()}</span>
                    </div>
                `).join('') || '<p style="color: #64748b; text-align: center;">No transactions this month</p>'}
            </div>
        </div>
    `);
}

// ==================== WINDOW EXPORTS ====================
window.initializeKPISection = initializeKPISection;
window.showKPITab = showKPITab;
window.generateKPISectionReport = generateKPISectionReport;
window.loadKPISectionReport = generateKPISectionReport;
window.viewEmployeeKPIDetail = viewEmployeeKPIDetail;
window.loadKPISampleData = loadKPISampleData;
window.loadKPILeaderboard = loadKPILeaderboard;
