// ==================== HR-MODULES.JS ====================
// Standalone HR sections: Employees Directory, Leave & Attendance, KPI & Performance

// ==================== EMPLOYEE DIRECTORY ====================
function initializeEmployeeDirectory() {
    loadEmployeeDirectoryStats();
    loadEmployeeDirectoryGrid();
    populateEmployeeDirectoryFilters();
}

function loadEmployeeDirectoryStats() {
    const employees = getEmployees();
    const active = employees.filter(e => e.status === 'active').length;
    const inactive = employees.filter(e => e.status === 'inactive').length;
    const onLeave = employees.filter(e => e.status === 'on-leave').length;
    
    document.getElementById('empTotalCount').textContent = employees.length;
    document.getElementById('empActiveCount').textContent = active;
    document.getElementById('empInactiveCount').textContent = inactive;
    document.getElementById('empOnLeaveCount').textContent = onLeave;
}

function loadEmployeeDirectoryGrid() {
    const employees = getEmployees();
    const grid = document.getElementById('employeeDirectoryGrid');
    
    if (employees.length === 0) {
        grid.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-users"></i>
                <h4>No employees yet</h4>
                <p>Add your first employee to get started</p>
                <button class="btn-primary" onclick="showEmployeeModal()" style="margin-top: 15px;">
                    <i class="fas fa-plus"></i> Add Employee
                </button>
            </div>
        `;
        return;
    }
    
    grid.innerHTML = employees.map(emp => `
        <div class="employee-card" onclick="viewEmployee(${emp.id})">
            <div class="employee-avatar">
                ${emp.avatar ? `<img src="${emp.avatar}" alt="${emp.name}">` : `<i class="fas fa-user"></i>`}
            </div>
            <div class="employee-info">
                <h4>${emp.name}</h4>
                <p>${emp.position || 'Staff'}</p>
                <span class="status-badge ${emp.status}">${emp.status}</span>
            </div>
            <div class="employee-contact">
                <small><i class="fas fa-phone"></i> ${emp.phone || '-'}</small>
                <small><i class="fas fa-envelope"></i> ${emp.email || '-'}</small>
            </div>
        </div>
    `).join('');
}

function populateEmployeeDirectoryFilters() {
    const employees = getEmployees();
    const departments = [...new Set(employees.map(e => e.department).filter(Boolean))];
    
    const deptFilter = document.getElementById('empDirectoryDept');
    if (deptFilter) {
        deptFilter.innerHTML = `
            <option value="all">All Departments</option>
            ${departments.map(d => `<option value="${d}">${d}</option>`).join('')}
        `;
    }
}

function filterEmployeeDirectory() {
    const search = document.getElementById('empDirectorySearch')?.value?.toLowerCase() || '';
    const status = document.getElementById('empDirectoryStatus')?.value || 'all';
    const dept = document.getElementById('empDirectoryDept')?.value || 'all';
    
    let employees = getEmployees();
    
    if (search) {
        employees = employees.filter(e => 
            e.name?.toLowerCase().includes(search) ||
            e.email?.toLowerCase().includes(search) ||
            e.phone?.includes(search)
        );
    }
    
    if (status !== 'all') {
        employees = employees.filter(e => e.status === status);
    }
    
    if (dept !== 'all') {
        employees = employees.filter(e => e.department === dept);
    }
    
    const grid = document.getElementById('employeeDirectoryGrid');
    if (employees.length === 0) {
        grid.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-search"></i>
                <h4>No employees found</h4>
                <p>Try adjusting your filters</p>
            </div>
        `;
        return;
    }
    
    grid.innerHTML = employees.map(emp => `
        <div class="employee-card" onclick="viewEmployee(${emp.id})">
            <div class="employee-avatar">
                ${emp.avatar ? `<img src="${emp.avatar}" alt="${emp.name}">` : `<i class="fas fa-user"></i>`}
            </div>
            <div class="employee-info">
                <h4>${emp.name}</h4>
                <p>${emp.position || 'Staff'}</p>
                <span class="status-badge ${emp.status}">${emp.status}</span>
            </div>
            <div class="employee-contact">
                <small><i class="fas fa-phone"></i> ${emp.phone || '-'}</small>
                <small><i class="fas fa-envelope"></i> ${emp.email || '-'}</small>
            </div>
        </div>
    `).join('');
}

function exportEmployeesToExcel() {
    const employees = getEmployees();
    if (employees.length === 0) {
        showNotification('No employees to export', 'warning');
        return;
    }
    
    let csv = 'Name,Email,Phone,Position,Department,Status,Salary,Join Date\n';
    employees.forEach(emp => {
        csv += `"${emp.name || ''}","${emp.email || ''}","${emp.phone || ''}","${emp.position || ''}","${emp.department || ''}","${emp.status || ''}","${emp.salary || ''}","${emp.joinDate || ''}"\n`;
    });
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `employees_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    
    showNotification('Employees exported successfully', 'success');
}

// ==================== LEAVE & ATTENDANCE SECTION ====================
function initializeLeaveAttendance() {
    loadLAStats();
    loadLALeaveRequests();
    populateLAFilters();
}

function showLATab(tabName) {
    // Hide all tabs
    document.getElementById('laLeaveTab').style.display = 'none';
    document.getElementById('laAttendanceTab').style.display = 'none';
    document.getElementById('laCalendarTab').style.display = 'none';
    
    // Remove active class from all tab buttons
    document.querySelectorAll('#leave-attendance .tab').forEach(tab => tab.classList.remove('active'));
    
    // Show selected tab
    const tabMap = {
        'leave': 'laLeaveTab',
        'attendance': 'laAttendanceTab', 
        'calendar': 'laCalendarTab'
    };
    document.getElementById(tabMap[tabName]).style.display = 'block';
    
    // Find and activate the correct tab button
    const tabs = document.querySelectorAll('#leave-attendance .tab');
    tabs.forEach(tab => {
        if (tab.onclick && tab.onclick.toString().includes(tabName)) {
            tab.classList.add('active');
        }
    });
    
    // Load tab-specific content
    if (tabName === 'leave') {
        loadLALeaveRequests();
    } else if (tabName === 'attendance') {
        loadLAAttendance();
    } else if (tabName === 'calendar') {
        loadLACalendar();
    }
}

function loadLAStats() {
    const leaveRequests = getLeaveRequests();
    const today = new Date().toISOString().split('T')[0];
    const currentMonth = new Date().toISOString().slice(0, 7);
    
    const pending = leaveRequests.filter(l => l.status === 'pending').length;
    const approved = leaveRequests.filter(l => l.status === 'approved' && l.createdDate?.startsWith(currentMonth)).length;
    const onToday = leaveRequests.filter(l => l.status === 'approved' && l.fromDate <= today && l.toDate >= today).length;
    const rejected = leaveRequests.filter(l => l.status === 'rejected').length;
    
    document.getElementById('laPendingCount').textContent = pending;
    document.getElementById('laApprovedCount').textContent = approved;
    document.getElementById('laOnTodayCount').textContent = onToday;
    document.getElementById('laRejectedCount').textContent = rejected;
}

function loadLALeaveRequests() {
    const leaveRequests = getLeaveRequests();
    const employees = getEmployees();
    const tbody = document.getElementById('laLeaveRequestsBody');
    
    const statusFilter = document.getElementById('laLeaveStatusFilter')?.value || '';
    const employeeFilter = document.getElementById('laLeaveEmployeeFilter')?.value || '';
    const monthFilter = document.getElementById('laLeaveMonthFilter')?.value || '';
    
    let filtered = leaveRequests;
    
    if (statusFilter) {
        filtered = filtered.filter(l => l.status === statusFilter);
    }
    if (employeeFilter) {
        filtered = filtered.filter(l => l.employeeId == employeeFilter);
    }
    if (monthFilter) {
        filtered = filtered.filter(l => l.fromDate?.startsWith(monthFilter) || l.toDate?.startsWith(monthFilter));
    }
    
    if (filtered.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" style="text-align: center; color: #64748b; padding: 40px;">
                    <i class="fas fa-calendar-times" style="font-size: 40px; margin-bottom: 10px; display: block;"></i>
                    No leave requests found
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = filtered.map(leave => {
        const employee = employees.find(e => e.id == leave.employeeId);
        const days = calculateLeaveDays(leave.fromDate, leave.toDate);
        
        return `
            <tr>
                <td>${employee?.name || 'Unknown'}</td>
                <td>${leave.leaveType || '-'}</td>
                <td>${formatDate(leave.fromDate)}</td>
                <td>${formatDate(leave.toDate)}</td>
                <td>${days}</td>
                <td>${leave.reason || '-'}</td>
                <td><span class="status-badge ${leave.status}">${leave.status}</span></td>
                <td>
                    ${leave.status === 'pending' ? `
                        <button class="btn-small btn-primary" onclick="approveLeaveLA(${leave.id})">
                            <i class="fas fa-check"></i>
                        </button>
                        <button class="btn-small btn-danger" onclick="rejectLeaveLA(${leave.id})">
                            <i class="fas fa-times"></i>
                        </button>
                    ` : `
                        <button class="btn-small" onclick="viewLeaveLA(${leave.id})">
                            <i class="fas fa-eye"></i>
                        </button>
                    `}
                </td>
            </tr>
        `;
    }).join('');
}

function populateLAFilters() {
    const employees = getEmployees();
    
    const employeeFilter = document.getElementById('laLeaveEmployeeFilter');
    if (employeeFilter) {
        employeeFilter.innerHTML = `
            <option value="">All Employees</option>
            ${employees.map(e => `<option value="${e.id}">${e.name}</option>`).join('')}
        `;
    }
    
    const clockEmployee = document.getElementById('laClockEmployee');
    if (clockEmployee) {
        clockEmployee.innerHTML = `
            <option value="">Select Employee</option>
            ${employees.filter(e => e.status === 'active').map(e => `<option value="${e.id}">${e.name}</option>`).join('')}
        `;
    }
    
    // Set current month
    const monthFilter = document.getElementById('laLeaveMonthFilter');
    if (monthFilter) {
        monthFilter.value = new Date().toISOString().slice(0, 7);
    }
}

function loadLAAttendance() {
    const attendance = getAttendanceRecords();
    const employees = getEmployees();
    const today = new Date().toISOString().split('T')[0];
    
    // Calculate stats
    const todayRecords = attendance.filter(a => a.date === today);
    const present = todayRecords.filter(a => a.status === 'present' || a.clockIn).length;
    const late = todayRecords.filter(a => a.status === 'late').length;
    const absent = employees.length - todayRecords.length;
    
    document.getElementById('laPresentCount').textContent = present;
    document.getElementById('laLateCount').textContent = late;
    document.getElementById('laAbsentCount').textContent = Math.max(0, absent);
    
    const tbody = document.getElementById('laAttendanceBody');
    
    if (attendance.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" style="text-align: center; color: #64748b; padding: 40px;">
                    <i class="fas fa-clock" style="font-size: 40px; margin-bottom: 10px; display: block;"></i>
                    No attendance records found
                </td>
            </tr>
        `;
        return;
    }
    
    const recent = attendance.slice(-50).reverse();
    tbody.innerHTML = recent.map(record => {
        const employee = employees.find(e => e.id == record.employeeId);
        const hours = calculateWorkHours(record.clockIn, record.clockOut);
        
        return `
            <tr>
                <td>${employee?.name || 'Unknown'}</td>
                <td>${formatDate(record.date)}</td>
                <td>${record.clockIn || '-'}</td>
                <td>${record.clockOut || '-'}</td>
                <td>${hours}</td>
                <td><span class="status-badge ${record.status || 'present'}">${record.status || 'present'}</span></td>
                <td>${record.notes || '-'}</td>
            </tr>
        `;
    }).join('');
}

function loadLACalendar() {
    const calendarView = document.getElementById('laCalendarView');
    const today = new Date();
    const month = today.getMonth();
    const year = today.getFullYear();
    
    const leaveRequests = getLeaveRequests().filter(l => l.status === 'approved');
    
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    let calendar = `
        <div style="margin-bottom: 15px; font-weight: bold;">
            ${today.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
        </div>
        <div style="display: grid; grid-template-columns: repeat(7, 1fr); gap: 5px;">
            <div style="font-weight: bold; padding: 10px; text-align: center;">Sun</div>
            <div style="font-weight: bold; padding: 10px; text-align: center;">Mon</div>
            <div style="font-weight: bold; padding: 10px; text-align: center;">Tue</div>
            <div style="font-weight: bold; padding: 10px; text-align: center;">Wed</div>
            <div style="font-weight: bold; padding: 10px; text-align: center;">Thu</div>
            <div style="font-weight: bold; padding: 10px; text-align: center;">Fri</div>
            <div style="font-weight: bold; padding: 10px; text-align: center;">Sat</div>
    `;
    
    // Empty cells for days before first of month
    for (let i = 0; i < firstDay; i++) {
        calendar += '<div style="padding: 10px;"></div>';
    }
    
    // Days of month
    for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const hasLeave = leaveRequests.some(l => dateStr >= l.fromDate && dateStr <= l.toDate);
        const isToday = day === today.getDate();
        
        calendar += `
            <div style="padding: 10px; text-align: center; border-radius: 8px; 
                        ${isToday ? 'background: #0d6efd; color: white;' : ''}
                        ${hasLeave ? 'background: #ffc107; color: #000;' : ''}
                        ${!isToday && !hasLeave ? 'background: #f8fafc;' : ''}">
                ${day}
            </div>
        `;
    }
    
    calendar += '</div>';
    calendarView.innerHTML = calendar;
}

function clockInLA() {
    const employeeId = document.getElementById('laClockEmployee')?.value;
    if (!employeeId) {
        showNotification('Please select an employee', 'warning');
        return;
    }
    
    const now = new Date();
    const attendance = getAttendanceRecords();
    const today = now.toISOString().split('T')[0];
    
    // Check if already clocked in
    const existing = attendance.find(a => a.employeeId == employeeId && a.date === today);
    if (existing && existing.clockIn) {
        showNotification('Employee already clocked in today', 'warning');
        return;
    }
    
    const record = {
        id: Date.now(),
        employeeId: parseInt(employeeId),
        date: today,
        clockIn: now.toTimeString().slice(0, 5),
        status: now.getHours() > 9 ? 'late' : 'present'
    };
    
    attendance.push(record);
    saveAttendanceRecords(attendance);
    
    showNotification('Clock in recorded', 'success');
    loadLAAttendance();
}

function clockOutLA() {
    const employeeId = document.getElementById('laClockEmployee')?.value;
    if (!employeeId) {
        showNotification('Please select an employee', 'warning');
        return;
    }
    
    const now = new Date();
    const attendance = getAttendanceRecords();
    const today = now.toISOString().split('T')[0];
    
    const existing = attendance.find(a => a.employeeId == employeeId && a.date === today);
    if (!existing) {
        showNotification('No clock in record found for today', 'warning');
        return;
    }
    
    if (existing.clockOut) {
        showNotification('Employee already clocked out today', 'warning');
        return;
    }
    
    existing.clockOut = now.toTimeString().slice(0, 5);
    saveAttendanceRecords(attendance);
    
    showNotification('Clock out recorded', 'success');
    loadLAAttendance();
}

function approveLeaveLA(leaveId) {
    const leaveRequests = getLeaveRequests();
    const leave = leaveRequests.find(l => l.id == leaveId);
    if (leave) {
        leave.status = 'approved';
        leave.approvedDate = new Date().toISOString();
        saveLeaveRequests(leaveRequests);
        showNotification('Leave request approved', 'success');
        loadLALeaveRequests();
        loadLAStats();
    }
}

function rejectLeaveLA(leaveId) {
    const leaveRequests = getLeaveRequests();
    const leave = leaveRequests.find(l => l.id == leaveId);
    if (leave) {
        leave.status = 'rejected';
        leave.rejectedDate = new Date().toISOString();
        saveLeaveRequests(leaveRequests);
        showNotification('Leave request rejected', 'info');
        loadLALeaveRequests();
        loadLAStats();
    }
}

function viewLeaveLA(leaveId) {
    const leaveRequests = getLeaveRequests();
    const leave = leaveRequests.find(l => l.id == leaveId);
    const employees = getEmployees();
    const employee = employees.find(e => e.id == leave?.employeeId);
    
    if (!leave) return;
    
    showModal('Leave Request Details', `
        <div style="padding: 20px;">
            <p><strong>Employee:</strong> ${employee?.name || 'Unknown'}</p>
            <p><strong>Leave Type:</strong> ${leave.leaveType || '-'}</p>
            <p><strong>From:</strong> ${formatDate(leave.fromDate)}</p>
            <p><strong>To:</strong> ${formatDate(leave.toDate)}</p>
            <p><strong>Days:</strong> ${calculateLeaveDays(leave.fromDate, leave.toDate)}</p>
            <p><strong>Reason:</strong> ${leave.reason || '-'}</p>
            <p><strong>Status:</strong> <span class="status-badge ${leave.status}">${leave.status}</span></p>
        </div>
    `);
}

// ==================== KPI & PERFORMANCE SECTION ====================
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
    // Create sample employees
    const sampleEmployees = [
        { id: 1, name: 'Ahmad Razak', email: 'ahmad@company.com', phone: '012-3456789', position: 'Sales Manager', department: 'Sales', status: 'active', salary: 5000, salesTarget: 50000, joinDate: '2023-01-15' },
        { id: 2, name: 'Siti Aminah', email: 'siti@company.com', phone: '013-4567890', position: 'Senior Sales', department: 'Sales', status: 'active', salary: 3500, salesTarget: 30000, joinDate: '2023-03-20' },
        { id: 3, name: 'Raj Kumar', email: 'raj@company.com', phone: '014-5678901', position: 'Sales Executive', department: 'Sales', status: 'active', salary: 2800, salesTarget: 20000, joinDate: '2023-06-01' },
        { id: 4, name: 'Lim Wei Ming', email: 'weiming@company.com', phone: '015-6789012', position: 'Sales Executive', department: 'Sales', status: 'active', salary: 2800, salesTarget: 20000, joinDate: '2023-08-15' },
        { id: 5, name: 'Nurul Izzah', email: 'nurul@company.com', phone: '016-7890123', position: 'Junior Sales', department: 'Sales', status: 'active', salary: 2200, salesTarget: 15000, joinDate: '2024-01-10' }
    ];
    
    // Save sample employees - use same key as payroll.js
    localStorage.setItem('ezcubic_employees', JSON.stringify(sampleEmployees));
    // Also save to tenant storage for multi-tenant isolation
    if (typeof saveToUserTenant === 'function') {
        saveToUserTenant();
    }

    // Create sample transactions for current month
    const currentMonth = new Date().toISOString().slice(0, 7);
    const existingTx = window.transactions || [];
    
    const sampleTransactions = [
        { id: Date.now() + 1, type: 'income', amount: 15000, description: 'Product Sales - Enterprise Package', date: `${currentMonth}-05`, category: 'Sales', staffId: 1 },
        { id: Date.now() + 2, type: 'income', amount: 12000, description: 'Service Contract', date: `${currentMonth}-08`, category: 'Sales', staffId: 1 },
        { id: Date.now() + 3, type: 'income', amount: 8500, description: 'Product Sales - Standard Package', date: `${currentMonth}-10`, category: 'Sales', staffId: 2 },
        { id: Date.now() + 4, type: 'income', amount: 9200, description: 'Consultation Services', date: `${currentMonth}-12`, category: 'Sales', staffId: 2 },
        { id: Date.now() + 5, type: 'income', amount: 6500, description: 'Product Sales - Basic Package', date: `${currentMonth}-14`, category: 'Sales', staffId: 3 },
        { id: Date.now() + 6, type: 'income', amount: 4800, description: 'Maintenance Contract', date: `${currentMonth}-15`, category: 'Sales', staffId: 3 },
        { id: Date.now() + 7, type: 'income', amount: 7200, description: 'Product Sales - Pro Package', date: `${currentMonth}-16`, category: 'Sales', staffId: 4 },
        { id: Date.now() + 8, type: 'income', amount: 3500, description: 'Support Package', date: `${currentMonth}-17`, category: 'Sales', staffId: 4 },
        { id: Date.now() + 9, type: 'income', amount: 5500, description: 'Product Sales - Starter Package', date: `${currentMonth}-10`, category: 'Sales', staffId: 5 },
        { id: Date.now() + 10, type: 'income', amount: 2800, description: 'Training Services', date: `${currentMonth}-13`, category: 'Sales', staffId: 5 }
    ];
    
    // Add sample transactions
    window.transactions = [...existingTx, ...sampleTransactions];
    if (typeof saveTransactions === 'function') {
        saveTransactions();
    }
    
    // Create sample KPI templates
    const sampleTemplates = [
        {
            id: 1,
            name: 'Sales Performance',
            description: 'Standard sales KPI template for sales team',
            metrics: [
                { name: 'Monthly Sales', weight: 40 },
                { name: 'New Customers', weight: 30 },
                { name: 'Customer Retention', weight: 30 }
            ]
        },
        {
            id: 2,
            name: 'Customer Service',
            description: 'KPI template for customer service team',
            metrics: [
                { name: 'Response Time', weight: 35 },
                { name: 'Customer Satisfaction', weight: 40 },
                { name: 'Issue Resolution', weight: 25 }
            ]
        }
    ];
    localStorage.setItem('ezcubic_kpi_templates', JSON.stringify(sampleTemplates));
    // Also save to tenant storage for multi-tenant isolation
    if (typeof saveToUserTenant === 'function') {
        saveToUserTenant();
    }
    showNotification('Sample KPI data loaded successfully!', 'success');
    
    // Reinitialize the section
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
        // Initialize KPI report filters and dropdowns
        if (typeof initializeKPIReport === 'function') initializeKPIReport();
    } else if (tabName === 'templates') {
        if (typeof loadKPISectionTemplates === 'function') loadKPISectionTemplates();
    }
}

function loadKPISectionStats() {
    const transactions = window.transactions || [];
    const currentMonth = new Date().toISOString().slice(0, 7);
    
    const monthlyTx = transactions.filter(t => 
        t.type === 'income' && t.date?.startsWith(currentMonth)
    );
    
    const totalSales = monthlyTx.reduce((sum, t) => sum + (t.amount || 0), 0);
    const txCount = monthlyTx.length;
    
    document.getElementById('kpiSectionTotalSales').textContent = `RM ${totalSales.toLocaleString()}`;
    document.getElementById('kpiSectionTransactions').textContent = txCount;
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
    const transactions = window.transactions || [];
    const month = document.getElementById('kpiSectionMonth')?.value || new Date().toISOString().slice(0, 7);
    const employeeFilter = document.getElementById('kpiSectionEmployee')?.value;
    
    const tbody = document.getElementById('kpiSectionReportBody');
    
    let targetEmployees = employees;
    if (employeeFilter) {
        targetEmployees = employees.filter(e => e.id == employeeFilter);
    }
    
    if (targetEmployees.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="9" style="text-align: center; padding: 40px; color: #666;">
                    No employees found
                </td>
            </tr>
        `;
        return;
    }
    
    // Calculate KPI for each employee
    const reports = targetEmployees.map(emp => {
        const empTx = transactions.filter(t => 
            t.type === 'income' && 
            t.date?.startsWith(month) &&
            (t.staffId == emp.id || t.assignedTo == emp.id)
        );
        
        const totalSales = empTx.reduce((sum, t) => sum + (t.amount || 0), 0);
        const txCount = empTx.length;
        const avgSale = txCount > 0 ? totalSales / txCount : 0;
        
        // Calculate score (simplified)
        const target = emp.salesTarget || 10000;
        const score = Math.min(100, Math.round((totalSales / target) * 100));
        
        let rating = 'Needs Improvement';
        if (score >= 90) rating = 'Excellent';
        else if (score >= 70) rating = 'Good';
        else if (score >= 50) rating = 'Average';
        
        return {
            employee: emp,
            totalSales,
            txCount,
            avgSale,
            score,
            rating
        };
    });
    
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
    const transactions = window.transactions || [];
    const currentMonth = new Date().toISOString().slice(0, 7);
    
    const tbody = document.getElementById('kpiLeaderboardBody');
    
    // Calculate scores for all employees
    const scores = employees.map(emp => {
        const empTx = transactions.filter(t => 
            t.type === 'income' && 
            t.date?.startsWith(currentMonth) &&
            (t.staffId == emp.id || t.assignedTo == emp.id)
        );
        
        const totalSales = empTx.reduce((sum, t) => sum + (t.amount || 0), 0);
        const target = emp.salesTarget || 10000;
        const score = Math.min(100, Math.round((totalSales / target) * 100));
        
        return {
            employee: emp,
            totalSales,
            score
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
    
    const transactions = window.transactions || [];
    const currentMonth = new Date().toISOString().slice(0, 7);
    
    const empTx = transactions.filter(t => 
        t.type === 'income' && 
        t.date?.startsWith(currentMonth) &&
        (t.staffId == employeeId || t.assignedTo == employeeId)
    );
    
    const totalSales = empTx.reduce((sum, t) => sum + (t.amount || 0), 0);
    const target = emp.salesTarget || 10000;
    const score = Math.min(100, Math.round((totalSales / target) * 100));
    
    showModal(`KPI Details: ${emp.name}`, `
        <div style="padding: 20px;">
            <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; margin-bottom: 20px;">
                <div style="background: #f8fafc; padding: 15px; border-radius: 8px;">
                    <div style="color: #64748b; font-size: 12px;">Total Sales</div>
                    <div style="font-size: 24px; font-weight: bold;">RM ${totalSales.toLocaleString()}</div>
                </div>
                <div style="background: #f8fafc; padding: 15px; border-radius: 8px;">
                    <div style="color: #64748b; font-size: 12px;">Target</div>
                    <div style="font-size: 24px; font-weight: bold;">RM ${target.toLocaleString()}</div>
                </div>
                <div style="background: #f8fafc; padding: 15px; border-radius: 8px;">
                    <div style="color: #64748b; font-size: 12px;">Transactions</div>
                    <div style="font-size: 24px; font-weight: bold;">${empTx.length}</div>
                </div>
                <div style="background: #f8fafc; padding: 15px; border-radius: 8px;">
                    <div style="color: #64748b; font-size: 12px;">Score</div>
                    <div style="font-size: 24px; font-weight: bold; color: ${score >= 70 ? '#22c55e' : score >= 50 ? '#f59e0b' : '#ef4444'};">${score}%</div>
                </div>
            </div>
            <h4>Recent Transactions</h4>
            <div style="max-height: 200px; overflow-y: auto;">
                ${empTx.slice(-5).reverse().map(t => `
                    <div style="display: flex; justify-content: space-between; padding: 10px; border-bottom: 1px solid #e2e8f0;">
                        <span>${t.description || 'Sale'}</span>
                        <span style="font-weight: bold;">RM ${(t.amount || 0).toLocaleString()}</span>
                    </div>
                `).join('') || '<p style="color: #64748b; text-align: center;">No transactions this month</p>'}
            </div>
        </div>
    `);
}

// ==================== HELPER FUNCTIONS ====================
function getEmployees() {
    // Use same key as payroll.js for consistency
    return JSON.parse(localStorage.getItem('ezcubic_employees')) || [];
}

function getLeaveRequests() {
    // Use same key as leave-attendance.js
    return JSON.parse(localStorage.getItem('ezcubic_leave_requests')) || [];
}

function saveLeaveRequests(requests) {
    localStorage.setItem('ezcubic_leave_requests', JSON.stringify(requests));
    // Also save to tenant storage for multi-tenant isolation
    if (typeof saveToUserTenant === 'function') {
        saveToUserTenant();
    }
}

function getAttendanceRecords() {
    // Use same key as leave-attendance.js
    return JSON.parse(localStorage.getItem('ezcubic_attendance')) || [];
}

function saveAttendanceRecords(records) {
    localStorage.setItem('ezcubic_attendance', JSON.stringify(records));
    // Also save to tenant storage for multi-tenant isolation
    if (typeof saveToUserTenant === 'function') {
        saveToUserTenant();
    }
}

function getKPITemplates() {
    return JSON.parse(localStorage.getItem('ezcubic_kpi_templates')) || [];
}

function calculateLeaveDays(fromDate, toDate) {
    if (!fromDate || !toDate) return 0;
    const from = new Date(fromDate);
    const to = new Date(toDate);
    const diff = Math.abs(to - from);
    return Math.ceil(diff / (1000 * 60 * 60 * 24)) + 1;
}

function calculateWorkHours(clockIn, clockOut) {
    if (!clockIn || !clockOut) return '-';
    const [inH, inM] = clockIn.split(':').map(Number);
    const [outH, outM] = clockOut.split(':').map(Number);
    const hours = outH - inH + (outM - inM) / 60;
    return `${hours.toFixed(1)}h`;
}

function formatDate(dateStr) {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-MY', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
    });
}

// ==================== EXPORT FUNCTIONS ====================
window.initializeEmployeeDirectory = initializeEmployeeDirectory;
window.filterEmployeeDirectory = filterEmployeeDirectory;
window.exportEmployeesToExcel = exportEmployeesToExcel;

window.initializeLeaveAttendance = initializeLeaveAttendance;
window.showLATab = showLATab;
window.loadLALeaveRequests = loadLALeaveRequests;
window.clockInLA = clockInLA;
window.clockOutLA = clockOutLA;
window.approveLeaveLA = approveLeaveLA;
window.rejectLeaveLA = rejectLeaveLA;
window.viewLeaveLA = viewLeaveLA;

window.initializeKPISection = initializeKPISection;
window.showKPITab = showKPITab;
window.generateKPISectionReport = generateKPISectionReport;
window.loadKPISectionReport = generateKPISectionReport;
window.viewEmployeeKPIDetail = viewEmployeeKPIDetail;
window.loadKPISampleData = loadKPISampleData;
