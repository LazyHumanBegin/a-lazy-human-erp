// ==================== LEAVE-ATTENDANCE UI.JS ====================
// Leave Management & Attendance Tracking - UI & Rendering
// Malaysian Employment Act Compliant

// ==================== LEAVE REQUEST MODAL ====================
function showLeaveRequestModal(requestId = null) {
    const modal = document.getElementById('leaveRequestModal');
    const title = document.getElementById('leaveRequestModalTitle');
    const form = document.getElementById('leaveRequestForm');
    const employeeSelect = document.getElementById('leaveEmployee');
    
    // Populate employees
    const employees = window.getEmployees ? window.getEmployees() : [];
    employeeSelect.innerHTML = '<option value="">Select Employee</option>' +
        employees.filter(e => e.status === 'active')
            .map(e => `<option value="${e.id}">${escapeHTML(e.name)}</option>`).join('');
    
    if (requestId) {
        const request = getLeaveRequestById(requestId);
        if (request) {
            title.innerHTML = '<i class="fas fa-edit"></i> Edit Leave Request';
            document.getElementById('leaveRequestId').value = request.id;
            document.getElementById('leaveEmployee').value = request.employeeId;
            document.getElementById('leaveType').value = request.leaveType;
            document.getElementById('leaveFromDate').value = request.fromDate;
            document.getElementById('leaveToDate').value = request.toDate;
            document.getElementById('leaveReason').value = request.reason || '';
            
            // Set duration radio
            const durationRadio = document.querySelector(`input[name="leaveDuration"][value="${request.duration}"]`);
            if (durationRadio) durationRadio.checked = true;
            
            calculateLeaveDays();
        }
    } else {
        title.innerHTML = '<i class="fas fa-calendar-plus"></i> New Leave Request';
        form.reset();
        document.getElementById('leaveRequestId').value = '';
        document.getElementById('leaveDaysCount').textContent = '0 days';
    }
    
    modal.style.display = 'flex';
}

function closeLeaveRequestModal() {
    document.getElementById('leaveRequestModal').style.display = 'none';
}

function saveLeaveRequest() {
    const id = document.getElementById('leaveRequestId').value;
    const employeeId = document.getElementById('leaveEmployee').value;
    const leaveType = document.getElementById('leaveType').value;
    const fromDate = document.getElementById('leaveFromDate').value;
    const toDate = document.getElementById('leaveToDate').value;
    const reason = document.getElementById('leaveReason').value.trim();
    const duration = document.querySelector('input[name="leaveDuration"]:checked')?.value || 'full';
    
    if (!employeeId || !leaveType || !fromDate || !toDate) {
        showNotification('Please fill in all required fields', 'error');
        return;
    }
    
    const employees = window.getEmployees ? window.getEmployees() : [];
    const employee = employees.find(e => e.id === employeeId);
    
    const days = calculateLeaveDays();
    
    // Check leave balance
    const balance = getEmployeeLeaveBalance(employeeId, leaveType);
    if (leaveType !== 'unpaid' && days > balance.remaining) {
        showNotification(`Insufficient ${LEAVE_ENTITLEMENTS[leaveType].name} balance. Available: ${balance.remaining} days`, 'error');
        return;
    }
    
    const existingRequest = id ? getLeaveRequestById(id) : null;
    
    const requestData = {
        id: id || generateUniqueId('LV'),
        employeeId: employeeId,
        employeeName: employee ? employee.name : 'Unknown',
        leaveType: leaveType,
        leaveTypeName: LEAVE_ENTITLEMENTS[leaveType]?.name || leaveType,
        fromDate: fromDate,
        toDate: toDate,
        days: days,
        duration: duration,
        reason: reason,
        status: existingRequest?.status || 'pending',
        createdAt: existingRequest?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };
    
    saveLeaveRequestData(requestData);
    closeLeaveRequestModal();
    loadLeaveRequests();
    updateLeaveStats();
    showNotification(id ? 'Leave request updated!' : 'Leave request submitted!', 'success');
}

// ==================== LEAVE REQUESTS LIST ====================
function loadLeaveRequests() {
    const tbody = document.getElementById('leaveRequestsBody');
    if (!tbody) return;
    
    const leaveRequests = getLeaveRequestsArray();
    const statusFilter = document.getElementById('leaveStatusFilter')?.value || '';
    const employeeFilter = document.getElementById('leaveEmployeeFilter')?.value || '';
    const monthFilter = document.getElementById('leaveMonthFilter')?.value || '';
    
    let filtered = [...leaveRequests].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    if (statusFilter) {
        filtered = filtered.filter(r => r.status === statusFilter);
    }
    
    if (employeeFilter) {
        filtered = filtered.filter(r => r.employeeId === employeeFilter);
    }
    
    if (monthFilter) {
        const [year, month] = monthFilter.split('-');
        filtered = filtered.filter(r => {
            const from = new Date(r.fromDate);
            return from.getFullYear() === parseInt(year) && (from.getMonth() + 1) === parseInt(month);
        });
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
    
    tbody.innerHTML = filtered.map(request => {
        const statusBadge = getLeaveStatusBadge(request.status);
        return `
            <tr>
                <td>
                    <strong>${escapeHTML(request.employeeName)}</strong>
                </td>
                <td>
                    <span class="badge ${getLeaveTypeBadgeClass(request.leaveType)}">
                        ${escapeHTML(request.leaveTypeName)}
                    </span>
                </td>
                <td>${formatDateLA(request.fromDate)}</td>
                <td>${formatDateLA(request.toDate)}</td>
                <td><strong>${request.days}</strong></td>
                <td style="max-width: 150px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${escapeHTML(request.reason || '-')}">
                    ${escapeHTML(request.reason || '-')}
                </td>
                <td>${statusBadge}</td>
                <td>
                    ${request.status === 'pending' ? `
                        <button class="btn-icon success" onclick="approveLeave('${request.id}')" title="Approve">
                            <i class="fas fa-check"></i>
                        </button>
                        <button class="btn-icon danger" onclick="rejectLeave('${request.id}')" title="Reject">
                            <i class="fas fa-times"></i>
                        </button>
                    ` : ''}
                    <button class="btn-icon" onclick="showLeaveRequestModal('${request.id}')" title="Edit">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-icon danger" onclick="deleteLeaveRequest('${request.id}')" title="Delete">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

function getLeaveStatusBadge(status) {
    const badges = {
        pending: '<span class="status-badge warning">Pending</span>',
        approved: '<span class="status-badge success">Approved</span>',
        rejected: '<span class="status-badge danger">Rejected</span>'
    };
    return badges[status] || status;
}

function getLeaveTypeBadgeClass(type) {
    const classes = {
        annual: 'info',
        medical: 'warning',
        emergency: 'danger',
        unpaid: 'secondary',
        maternity: 'primary',
        paternity: 'primary',
        compassionate: 'secondary',
        replacement: 'outline',
        study: 'info'
    };
    return classes[type] || 'outline';
}

// ==================== LEAVE BALANCE MODAL ====================
function showLeaveBalanceModal() {
    const modal = document.getElementById('leaveBalanceModal');
    const employeeSelect = document.getElementById('leaveBalanceEmployee');
    
    // Populate employees
    const employees = window.getEmployees ? window.getEmployees() : [];
    employeeSelect.innerHTML = '<option value="">Select Employee</option>' +
        employees.filter(e => e.status === 'active')
            .map(e => `<option value="${e.id}">${escapeHTML(e.name)}</option>`).join('');
    
    document.getElementById('leaveBalanceContent').innerHTML = `
        <div class="empty-state">
            <i class="fas fa-user"></i>
            <p>Select an employee to view leave balance</p>
        </div>
    `;
    
    modal.style.display = 'flex';
}

function closeLeaveBalanceModal() {
    document.getElementById('leaveBalanceModal').style.display = 'none';
}

function loadLeaveBalance() {
    const employeeId = document.getElementById('leaveBalanceEmployee').value;
    const content = document.getElementById('leaveBalanceContent');
    
    if (!employeeId) {
        content.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-user"></i>
                <p>Select an employee to view leave balance</p>
            </div>
        `;
        return;
    }
    
    const employees = window.getEmployees ? window.getEmployees() : [];
    const employee = employees.find(e => e.id === employeeId);
    
    if (!employee) return;
    
    // Calculate years of service
    const joinDate = employee.joinDate ? new Date(employee.joinDate) : new Date();
    const yearsService = Math.floor((new Date() - joinDate) / (365.25 * 24 * 60 * 60 * 1000));
    
    let balanceHtml = `
        <div style="background: #f8fafc; padding: 15px; border-radius: 10px; margin-bottom: 20px;">
            <h4 style="margin: 0 0 5px;">${escapeHTML(employee.name)}</h4>
            <p style="margin: 0; color: #64748b; font-size: 13px;">
                ${escapeHTML(employee.position || 'N/A')} • ${yearsService} year${yearsService !== 1 ? 's' : ''} service
            </p>
        </div>
        
        <div class="leave-balance-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 15px;">
    `;
    
    // Get balance for each leave type
    Object.keys(LEAVE_ENTITLEMENTS).forEach(leaveType => {
        const config = LEAVE_ENTITLEMENTS[leaveType];
        
        // Skip gender-restricted leaves
        if (config.genderRestricted && employee.gender !== config.genderRestricted) {
            return;
        }
        
        const balance = getEmployeeLeaveBalance(employeeId, leaveType, yearsService);
        const usedPercent = balance.entitlement > 0 ? (balance.used / balance.entitlement) * 100 : 0;
        const barColor = usedPercent > 80 ? '#ef4444' : usedPercent > 50 ? '#f59e0b' : '#10b981';
        
        balanceHtml += `
            <div class="leave-balance-card" style="background: white; border: 1px solid #e2e8f0; border-radius: 10px; padding: 15px;">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px;">
                    <div>
                        <div style="font-weight: 600; color: #1e293b;">${config.name}</div>
                        <div style="font-size: 12px; color: ${config.paid ? '#10b981' : '#64748b'};">
                            ${config.paid ? 'Paid' : 'Unpaid'}
                        </div>
                    </div>
                    <div style="text-align: right;">
                        <div style="font-size: 24px; font-weight: 700; color: ${barColor};">${balance.remaining}</div>
                        <div style="font-size: 11px; color: #64748b;">of ${balance.entitlement} days</div>
                    </div>
                </div>
                <div style="background: #f1f5f9; border-radius: 10px; height: 8px; overflow: hidden;">
                    <div style="background: ${barColor}; height: 100%; width: ${Math.min(usedPercent, 100)}%; transition: width 0.3s;"></div>
                </div>
                <div style="display: flex; justify-content: space-between; font-size: 11px; color: #64748b; margin-top: 5px;">
                    <span>Used: ${balance.used}</span>
                    <span>Pending: ${balance.pending}</span>
                </div>
            </div>
        `;
    });
    
    balanceHtml += '</div>';
    content.innerHTML = balanceHtml;
}

// ==================== LEAVE STATS ====================
function updateLeaveStats() {
    const leaveRequests = getLeaveRequestsArray();
    const today = new Date().toISOString().slice(0, 10);
    const currentMonth = new Date().toISOString().slice(0, 7);
    
    const pendingCount = leaveRequests.filter(r => r.status === 'pending').length;
    const approvedThisMonth = leaveRequests.filter(r => 
        r.status === 'approved' && r.approvedAt?.startsWith(currentMonth)
    ).length;
    const onLeaveToday = leaveRequests.filter(r => 
        r.status === 'approved' && r.fromDate <= today && r.toDate >= today
    ).length;
    const rejectedCount = leaveRequests.filter(r => r.status === 'rejected').length;
    
    const elements = {
        'leavePendingCount': pendingCount,
        'leaveApprovedCount': approvedThisMonth,
        'leaveOnTodayCount': onLeaveToday,
        'leaveRejectedCount': rejectedCount
    };
    
    Object.entries(elements).forEach(([id, value]) => {
        const el = document.getElementById(id);
        if (el) el.textContent = value;
    });
}

function populateLeaveEmployeeFilters() {
    const employees = window.getEmployees ? window.getEmployees() : [];
    const activeEmployees = employees.filter(e => e.status === 'active');
    
    const filters = ['leaveEmployeeFilter', 'attendanceFilterEmployee', 'attendanceEmployeeSelect'];
    filters.forEach(filterId => {
        const select = document.getElementById(filterId);
        if (select) {
            const firstOption = select.querySelector('option');
            select.innerHTML = '';
            if (firstOption) select.appendChild(firstOption);
            activeEmployees.forEach(e => {
                const option = document.createElement('option');
                option.value = e.id;
                option.textContent = e.name;
                select.appendChild(option);
            });
        }
    });
}

// ==================== ATTENDANCE UI ====================
function startClockUpdate() {
    updateAttendanceDateTime();
    setInterval(updateAttendanceDateTime, 1000);
}

function updateAttendanceDateTime() {
    const el = document.getElementById('currentDateTime');
    if (el) {
        const now = new Date();
        el.textContent = now.toLocaleTimeString('en-MY', { 
            hour: '2-digit', 
            minute: '2-digit',
            second: '2-digit'
        });
    }
}

function clockIn() {
    const employeeId = document.getElementById('attendanceEmployeeSelect')?.value;
    if (!employeeId) {
        showNotification('Please select an employee', 'error');
        return;
    }
    
    const result = clockInEmployee(employeeId);
    if (result.success) {
        loadAttendanceRecords();
        updateAttendanceStats();
        showNotification(result.message, 'success');
    } else {
        showNotification(result.message, result.message.includes('already') ? 'warning' : 'error');
    }
}

function clockOut() {
    const employeeId = document.getElementById('attendanceEmployeeSelect')?.value;
    if (!employeeId) {
        showNotification('Please select an employee', 'error');
        return;
    }
    
    const result = clockOutEmployee(employeeId);
    if (result.success) {
        loadAttendanceRecords();
        updateAttendanceStats();
        showNotification(result.message, 'success');
    } else {
        showNotification(result.message, result.message.includes('already') ? 'warning' : 'error');
    }
}

// ==================== ATTENDANCE RECORDS LIST ====================
function loadAttendanceRecords() {
    const tbody = document.getElementById('attendanceRecordsBody');
    if (!tbody) return;
    
    const attendanceRecords = getAttendanceRecordsArray();
    const employeeFilter = document.getElementById('attendanceFilterEmployee')?.value || '';
    const dateFilter = document.getElementById('attendanceDateFilter')?.value || '';
    const monthFilter = document.getElementById('attendanceMonthFilter')?.value || '';
    
    let filtered = [...attendanceRecords].sort((a, b) => {
        if (a.date !== b.date) return b.date.localeCompare(a.date);
        return (b.clockIn || '').localeCompare(a.clockIn || '');
    });
    
    if (employeeFilter) {
        filtered = filtered.filter(r => r.employeeId === employeeFilter);
    }
    
    if (dateFilter) {
        filtered = filtered.filter(r => r.date === dateFilter);
    }
    
    if (monthFilter) {
        filtered = filtered.filter(r => r.date.startsWith(monthFilter));
    }
    
    // Limit to last 100 records for performance
    filtered = filtered.slice(0, 100);
    
    if (filtered.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" style="text-align: center; color: #64748b; padding: 40px;">
                    <i class="fas fa-user-clock" style="font-size: 40px; margin-bottom: 10px; display: block;"></i>
                    No attendance records found
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = filtered.map(record => {
        const statusBadge = getAttendanceStatusBadge(record.status);
        return `
            <tr>
                <td>${formatDateLA(record.date)}</td>
                <td><strong>${escapeHTML(record.employeeName)}</strong></td>
                <td>${record.clockIn || '-'}</td>
                <td>${record.clockOut || '-'}</td>
                <td>${record.workHours ? record.workHours.toFixed(1) + 'h' : '-'}</td>
                <td>${statusBadge}</td>
                <td style="max-width: 100px; overflow: hidden; text-overflow: ellipsis;" title="${escapeHTML(record.notes || '')}">
                    ${escapeHTML(record.notes || '-')}
                </td>
                <td>
                    <button class="btn-icon" onclick="showAttendanceEditModal('${record.id}')" title="Edit">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-icon danger" onclick="deleteAttendanceRecord('${record.id}')" title="Delete">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

function getAttendanceStatusBadge(status) {
    const badges = {
        'present': '<span class="status-badge success">Present</span>',
        'late': '<span class="status-badge warning">Late</span>',
        'absent': '<span class="status-badge danger">Absent</span>',
        'half-day': '<span class="status-badge info">Half Day</span>',
        'on-leave': '<span class="status-badge secondary">On Leave</span>'
    };
    return badges[status] || status;
}

function updateAttendanceStats() {
    const leaveRequests = getLeaveRequestsArray();
    const attendanceRecords = getAttendanceRecordsArray();
    const today = new Date().toISOString().slice(0, 10);
    const todayRecords = attendanceRecords.filter(r => r.date === today);
    
    const employees = window.getEmployees ? window.getEmployees() : [];
    const activeCount = employees.filter(e => e.status === 'active').length;
    
    const present = todayRecords.filter(r => r.status === 'present').length;
    const late = todayRecords.filter(r => r.status === 'late').length;
    
    // Calculate absent (active employees without attendance record)
    const onLeaveToday = leaveRequests.filter(r => 
        r.status === 'approved' && r.fromDate <= today && r.toDate >= today
    ).map(r => r.employeeId);
    
    const absent = activeCount - present - late - onLeaveToday.length;
    
    const elements = {
        'attendancePresentCount': present,
        'attendanceLateCount': late,
        'attendanceAbsentCount': Math.max(0, absent),
        'attendanceOnLeaveCount': onLeaveToday.length
    };
    
    Object.entries(elements).forEach(([id, value]) => {
        const el = document.getElementById(id);
        if (el) el.textContent = value;
    });
}

// ==================== ATTENDANCE EDIT MODAL ====================
function showAttendanceEditModal(recordId) {
    const record = getAttendanceRecordById(recordId);
    if (!record) return;
    
    const modal = document.getElementById('attendanceEditModal');
    document.getElementById('attendanceEditId').value = record.id;
    document.getElementById('attendanceEditEmployee').value = record.employeeName;
    document.getElementById('attendanceEditDate').value = record.date;
    document.getElementById('attendanceEditClockIn').value = record.clockIn || '';
    document.getElementById('attendanceEditClockOut').value = record.clockOut || '';
    document.getElementById('attendanceEditStatus').value = record.status;
    document.getElementById('attendanceEditNotes').value = record.notes || '';
    
    modal.style.display = 'flex';
}

function closeAttendanceEditModal() {
    document.getElementById('attendanceEditModal').style.display = 'none';
}

function saveAttendanceEdit() {
    const id = document.getElementById('attendanceEditId').value;
    const record = getAttendanceRecordById(id);
    if (!record) return;
    
    const recordData = {
        id: id,
        clockIn: document.getElementById('attendanceEditClockIn').value || null,
        clockOut: document.getElementById('attendanceEditClockOut').value || null,
        status: document.getElementById('attendanceEditStatus').value,
        notes: document.getElementById('attendanceEditNotes').value.trim()
    };
    
    saveAttendanceRecord(recordData);
    closeAttendanceEditModal();
    loadAttendanceRecords();
    updateAttendanceStats();
    showNotification('Attendance record updated!', 'success');
}

function clearAttendanceFilters() {
    document.getElementById('attendanceFilterEmployee').value = '';
    document.getElementById('attendanceDateFilter').value = '';
    document.getElementById('attendanceMonthFilter').value = '';
    loadAttendanceRecords();
}

// ==================== EXPORT ====================
function exportAttendanceReport() {
    const attendanceRecords = getAttendanceRecordsArray();
    const monthFilter = document.getElementById('attendanceMonthFilter')?.value || '';
    let filtered = monthFilter ? 
        attendanceRecords.filter(r => r.date.startsWith(monthFilter)) :
        attendanceRecords;
    
    filtered = filtered.sort((a, b) => a.date.localeCompare(b.date));
    
    if (filtered.length === 0) {
        showNotification('No attendance records to export', 'error');
        return;
    }
    
    const headers = ['Date', 'Employee', 'Clock In', 'Clock Out', 'Work Hours', 'Status', 'Notes'];
    const rows = filtered.map(r => [
        r.date,
        r.employeeName,
        r.clockIn || '',
        r.clockOut || '',
        r.workHours ? r.workHours.toFixed(1) : '',
        r.status,
        r.notes || ''
    ]);
    
    const csvContent = [headers, ...rows].map(row => 
        row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
    ).join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Attendance_Report_${monthFilter || 'All'}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    
    showNotification('Attendance report exported!', 'success');
}

// ==================== WINDOW EXPORTS ====================
window.showLeaveRequestModal = showLeaveRequestModal;
window.closeLeaveRequestModal = closeLeaveRequestModal;
window.saveLeaveRequest = saveLeaveRequest;
window.loadLeaveRequests = loadLeaveRequests;
window.showLeaveBalanceModal = showLeaveBalanceModal;
window.closeLeaveBalanceModal = closeLeaveBalanceModal;
window.loadLeaveBalance = loadLeaveBalance;
window.updateLeaveStats = updateLeaveStats;
window.populateLeaveEmployeeFilters = populateLeaveEmployeeFilters;
window.startClockUpdate = startClockUpdate;
window.updateAttendanceDateTime = updateAttendanceDateTime;
window.clockIn = clockIn;
window.clockOut = clockOut;
window.loadAttendanceRecords = loadAttendanceRecords;
window.updateAttendanceStats = updateAttendanceStats;
window.showAttendanceEditModal = showAttendanceEditModal;
window.closeAttendanceEditModal = closeAttendanceEditModal;
window.saveAttendanceEdit = saveAttendanceEdit;
window.clearAttendanceFilters = clearAttendanceFilters;
window.exportAttendanceReport = exportAttendanceReport;
