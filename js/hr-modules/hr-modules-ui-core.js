/**
 * EZCubic - HR Modules UI Core
 * Employee Directory & Leave/Attendance UI functions
 * Version: 2.3.3 - Split from hr-modules-ui.js
 */

// ==================== EMPLOYEE DIRECTORY UI ====================
function initializeEmployeeDirectory() {
    loadEmployeeDirectoryStats();
    loadEmployeeDirectoryGrid();
    populateEmployeeDirectoryFilters();
}

function loadEmployeeDirectoryStats() {
    const stats = getEmployeeDirectoryStats();
    
    document.getElementById('empTotalCount').textContent = stats.total;
    document.getElementById('empActiveCount').textContent = stats.active;
    document.getElementById('empInactiveCount').textContent = stats.inactive;
    document.getElementById('empOnLeaveCount').textContent = stats.onLeave;
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
    const departments = getEmployeeDepartments();
    
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
    
    const employees = filterEmployeesData(search, status, dept);
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

// ==================== LEAVE & ATTENDANCE UI ====================
function initializeLeaveAttendanceHR() {
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
    const stats = getLAStats();
    
    document.getElementById('laPendingCount').textContent = stats.pending;
    document.getElementById('laApprovedCount').textContent = stats.approved;
    document.getElementById('laOnTodayCount').textContent = stats.onToday;
    document.getElementById('laRejectedCount').textContent = stats.rejected;
}

function loadLALeaveRequests() {
    const employees = getEmployees();
    const tbody = document.getElementById('laLeaveRequestsBody');
    
    const statusFilter = document.getElementById('laLeaveStatusFilter')?.value || '';
    const employeeFilter = document.getElementById('laLeaveEmployeeFilter')?.value || '';
    const monthFilter = document.getElementById('laLeaveMonthFilter')?.value || '';
    
    const filtered = getFilteredLeaveRequests(statusFilter, employeeFilter, monthFilter);
    
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
        const days = calculateLeaveDaysHR(leave.fromDate, leave.toDate);
        
        return `
            <tr>
                <td>${employee?.name || 'Unknown'}</td>
                <td>${leave.leaveType || '-'}</td>
                <td>${formatDateHR(leave.fromDate)}</td>
                <td>${formatDateHR(leave.toDate)}</td>
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
    const stats = getAttendanceStats();
    
    document.getElementById('laPresentCount').textContent = stats.present;
    document.getElementById('laLateCount').textContent = stats.late;
    document.getElementById('laAbsentCount').textContent = stats.absent;
    
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
        const hours = calculateWorkHoursHR(record.clockIn, record.clockOut);
        
        return `
            <tr>
                <td>${employee?.name || 'Unknown'}</td>
                <td>${formatDateHR(record.date)}</td>
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
    
    const result = processClockIn(employeeId);
    showNotification(result.message, result.success ? 'success' : 'warning');
    if (result.success) loadLAAttendance();
}

function clockOutLA() {
    const employeeId = document.getElementById('laClockEmployee')?.value;
    if (!employeeId) {
        showNotification('Please select an employee', 'warning');
        return;
    }
    
    const result = processClockOut(employeeId);
    showNotification(result.message, result.success ? 'success' : 'warning');
    if (result.success) loadLAAttendance();
}

function approveLeaveLA(leaveId) {
    if (approveLeaveRequest(leaveId)) {
        showNotification('Leave request approved', 'success');
        loadLALeaveRequests();
        loadLAStats();
    }
}

function rejectLeaveLA(leaveId) {
    if (rejectLeaveRequest(leaveId)) {
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
            <p><strong>From:</strong> ${formatDateHR(leave.fromDate)}</p>
            <p><strong>To:</strong> ${formatDateHR(leave.toDate)}</p>
            <p><strong>Days:</strong> ${calculateLeaveDaysHR(leave.fromDate, leave.toDate)}</p>
            <p><strong>Reason:</strong> ${leave.reason || '-'}</p>
            <p><strong>Status:</strong> <span class="status-badge ${leave.status}">${leave.status}</span></p>
        </div>
    `);
}

// ==================== WINDOW EXPORTS ====================
window.initializeEmployeeDirectory = initializeEmployeeDirectory;
window.filterEmployeeDirectory = filterEmployeeDirectory;
window.exportEmployeesToExcel = exportEmployeesToExcel;

window.initializeLeaveAttendanceHR = initializeLeaveAttendanceHR;
window.showLATab = showLATab;
window.loadLALeaveRequests = loadLALeaveRequests;
window.clockInLA = clockInLA;
window.clockOutLA = clockOutLA;
window.approveLeaveLA = approveLeaveLA;
window.rejectLeaveLA = rejectLeaveLA;
window.viewLeaveLA = viewLeaveLA;
