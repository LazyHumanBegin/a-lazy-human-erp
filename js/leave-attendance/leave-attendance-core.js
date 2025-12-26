// ==================== LEAVE-ATTENDANCE CORE.JS ====================
// Leave Management & Attendance Tracking - Data & Business Logic
// Malaysian Employment Act Compliant

// ==================== GLOBAL VARIABLES ====================
let leaveRequests = [];
let leaveBalances = [];
let attendanceRecords = [];

const LEAVE_REQUESTS_KEY = 'ezcubic_leave_requests';
const LEAVE_BALANCES_KEY = 'ezcubic_leave_balances';
const ATTENDANCE_KEY = 'ezcubic_attendance';

// ==================== MALAYSIAN LEAVE ENTITLEMENTS ====================
const LEAVE_ENTITLEMENTS = {
    annual: {
        name: 'Annual Leave',
        // Employment Act 1955: 8 days (< 2 years), 12 days (2-5 years), 16 days (> 5 years)
        entitlement: [
            { yearsService: 0, days: 8 },
            { yearsService: 2, days: 12 },
            { yearsService: 5, days: 16 }
        ],
        paid: true,
        carryForward: true,
        maxCarryForward: 5
    },
    medical: {
        name: 'Medical Leave (MC)',
        // Employment Act 1955: 14 days (< 2 years), 18 days (2-5 years), 22 days (> 5 years)
        entitlement: [
            { yearsService: 0, days: 14 },
            { yearsService: 2, days: 18 },
            { yearsService: 5, days: 22 }
        ],
        paid: true,
        carryForward: false
    },
    maternity: {
        name: 'Maternity Leave',
        // Employment Act: 98 consecutive days
        entitlement: [{ yearsService: 0, days: 98 }],
        paid: true,
        carryForward: false,
        genderRestricted: 'female'
    },
    paternity: {
        name: 'Paternity Leave',
        // Employment Act (amended 2022): 7 consecutive days
        entitlement: [{ yearsService: 0, days: 7 }],
        paid: true,
        carryForward: false,
        genderRestricted: 'male'
    },
    compassionate: {
        name: 'Compassionate Leave',
        entitlement: [{ yearsService: 0, days: 3 }],
        paid: true,
        carryForward: false
    },
    emergency: {
        name: 'Emergency Leave',
        entitlement: [{ yearsService: 0, days: 2 }],
        paid: true,
        carryForward: false
    },
    unpaid: {
        name: 'Unpaid Leave',
        entitlement: [{ yearsService: 0, days: 30 }], // Configurable
        paid: false,
        carryForward: false
    },
    replacement: {
        name: 'Replacement Leave',
        entitlement: [{ yearsService: 0, days: 0 }], // Earned, not fixed
        paid: true,
        carryForward: true
    },
    study: {
        name: 'Study Leave',
        entitlement: [{ yearsService: 0, days: 5 }],
        paid: true,
        carryForward: false
    },
    other: {
        name: 'Other Leave',
        entitlement: [{ yearsService: 0, days: 5 }],
        paid: false,
        carryForward: false
    }
};

// ==================== WORK SCHEDULE SETTINGS ====================
const WORK_SCHEDULE = {
    startTime: '09:00',
    endTime: '18:00',
    lunchStart: '13:00',
    lunchEnd: '14:00',
    lateThreshold: 15,  // minutes grace period
    workDays: [1, 2, 3, 4, 5], // Monday to Friday
    hoursPerDay: 8
};

// ==================== INITIALIZATION ====================
function initializeLeaveAttendance() {
    loadLeaveData();
    loadAttendanceData();
    updateLeaveStats();
    updateAttendanceStats();
    populateLeaveEmployeeFilters();
    startClockUpdate();
}

function loadLeaveData() {
    const storedRequests = localStorage.getItem(LEAVE_REQUESTS_KEY);
    if (storedRequests) {
        leaveRequests = JSON.parse(storedRequests);
    }
    
    const storedBalances = localStorage.getItem(LEAVE_BALANCES_KEY);
    if (storedBalances) {
        leaveBalances = JSON.parse(storedBalances);
    }
}

function loadAttendanceData() {
    const storedAttendance = localStorage.getItem(ATTENDANCE_KEY);
    if (storedAttendance) {
        attendanceRecords = JSON.parse(storedAttendance);
    }
}

function saveLeaveData() {
    localStorage.setItem(LEAVE_REQUESTS_KEY, JSON.stringify(leaveRequests));
    localStorage.setItem(LEAVE_BALANCES_KEY, JSON.stringify(leaveBalances));
}

function saveAttendanceData() {
    localStorage.setItem(ATTENDANCE_KEY, JSON.stringify(attendanceRecords));
}

// ==================== LEAVE BALANCE CALCULATIONS ====================
function getEmployeeLeaveBalance(employeeId, leaveType, yearsService = 0) {
    const config = LEAVE_ENTITLEMENTS[leaveType];
    if (!config) return { entitlement: 0, used: 0, pending: 0, remaining: 0 };
    
    // Get entitlement based on years of service
    let entitlement = 0;
    for (const tier of config.entitlement) {
        if (yearsService >= tier.yearsService) {
            entitlement = tier.days;
        }
    }
    
    // Count used and pending days
    const currentYear = new Date().getFullYear();
    const yearRequests = leaveRequests.filter(r => 
        r.employeeId === employeeId && 
        r.leaveType === leaveType &&
        new Date(r.fromDate).getFullYear() === currentYear
    );
    
    const used = yearRequests.filter(r => r.status === 'approved')
        .reduce((sum, r) => sum + r.days, 0);
    const pending = yearRequests.filter(r => r.status === 'pending')
        .reduce((sum, r) => sum + r.days, 0);
    
    // Check for carry forward
    let carryForward = 0;
    const employeeBalance = leaveBalances.find(b => 
        b.employeeId === employeeId && b.leaveType === leaveType
    );
    if (employeeBalance && config.carryForward) {
        carryForward = Math.min(employeeBalance.carryForward || 0, config.maxCarryForward || 0);
    }
    
    return {
        entitlement: entitlement + carryForward,
        used: used,
        pending: pending,
        remaining: Math.max(0, entitlement + carryForward - used)
    };
}

function updateLeaveBalance(employeeId, leaveType, adjustment) {
    let balance = leaveBalances.find(b => 
        b.employeeId === employeeId && b.leaveType === leaveType
    );
    
    if (!balance) {
        balance = {
            id: generateUniqueId('LB'),
            employeeId: employeeId,
            leaveType: leaveType,
            adjustment: 0,
            carryForward: 0
        };
        leaveBalances.push(balance);
    }
    
    balance.adjustment = (balance.adjustment || 0) + adjustment;
    saveLeaveData();
}

function calculateLeaveDays() {
    const fromDate = document.getElementById('leaveFromDate').value;
    const toDate = document.getElementById('leaveToDate').value;
    const duration = document.querySelector('input[name="leaveDuration"]:checked')?.value || 'full';
    
    if (!fromDate || !toDate) {
        document.getElementById('leaveDaysCount').textContent = '0 days';
        return 0;
    }
    
    const start = new Date(fromDate);
    const end = new Date(toDate);
    
    if (end < start) {
        document.getElementById('leaveDaysCount').textContent = 'Invalid dates';
        return 0;
    }
    
    // Calculate working days (excluding weekends)
    let workingDays = 0;
    let currentDate = new Date(start);
    
    while (currentDate <= end) {
        const dayOfWeek = currentDate.getDay();
        if (WORK_SCHEDULE.workDays.includes(dayOfWeek)) {
            workingDays++;
        }
        currentDate.setDate(currentDate.getDate() + 1);
    }
    
    // Adjust for half day
    if (duration.startsWith('half') && workingDays > 0) {
        workingDays = workingDays - 0.5;
    }
    
    document.getElementById('leaveDaysCount').textContent = `${workingDays} day${workingDays !== 1 ? 's' : ''}`;
    return workingDays;
}

// ==================== LEAVE CRUD OPERATIONS ====================
function saveLeaveRequestData(requestData) {
    const id = requestData.id;
    if (id && leaveRequests.find(r => r.id === id)) {
        const index = leaveRequests.findIndex(r => r.id === id);
        if (index !== -1) {
            leaveRequests[index] = requestData;
        }
    } else {
        leaveRequests.push(requestData);
    }
    saveLeaveData();
}

function approveLeave(requestId) {
    const request = leaveRequests.find(r => r.id === requestId);
    if (!request) return;
    
    if (confirm(`Approve leave request for ${request.employeeName}?\n${request.leaveTypeName}: ${request.fromDate} to ${request.toDate}`)) {
        request.status = 'approved';
        request.approvedAt = new Date().toISOString();
        
        // Deduct from balance
        updateLeaveBalance(request.employeeId, request.leaveType, -request.days);
        
        saveLeaveData();
        loadLeaveRequests();
        updateLeaveStats();
        showNotification('Leave request approved!', 'success');
    }
}

function rejectLeave(requestId) {
    const request = leaveRequests.find(r => r.id === requestId);
    if (!request) return;
    
    const reason = prompt('Reason for rejection (optional):');
    
    request.status = 'rejected';
    request.rejectedAt = new Date().toISOString();
    request.rejectionReason = reason || '';
    
    saveLeaveData();
    loadLeaveRequests();
    updateLeaveStats();
    showNotification('Leave request rejected', 'warning');
}

function deleteLeaveRequest(requestId) {
    const request = leaveRequests.find(r => r.id === requestId);
    if (!request) return;
    
    if (confirm(`Delete leave request for ${request.employeeName}?`)) {
        // If was approved, restore balance
        if (request.status === 'approved') {
            updateLeaveBalance(request.employeeId, request.leaveType, request.days);
        }
        
        leaveRequests = leaveRequests.filter(r => r.id !== requestId);
        saveLeaveData();
        loadLeaveRequests();
        updateLeaveStats();
        showNotification('Leave request deleted', 'success');
    }
}

function getLeaveRequestById(requestId) {
    return leaveRequests.find(r => r.id === requestId);
}

function getLeaveRequestsArray() {
    return leaveRequests;
}

function getLeaveBalancesArray() {
    return leaveBalances;
}

// ==================== ATTENDANCE BUSINESS LOGIC ====================
function calculateWorkHours(clockIn, clockOut) {
    if (!clockIn || !clockOut) return 0;
    
    const [inHour, inMin] = clockIn.split(':').map(Number);
    const [outHour, outMin] = clockOut.split(':').map(Number);
    
    const inMinutes = inHour * 60 + inMin;
    const outMinutes = outHour * 60 + outMin;
    
    // Subtract lunch hour (1 hour)
    let workMinutes = outMinutes - inMinutes - 60;
    
    return Math.max(0, workMinutes / 60);
}

function clockInEmployee(employeeId) {
    const employees = window.getEmployees ? window.getEmployees() : [];
    const employee = employees.find(e => e.id === employeeId);
    if (!employee) return { success: false, message: 'Employee not found' };
    
    const today = new Date().toISOString().slice(0, 10);
    const now = new Date();
    const timeStr = now.toTimeString().slice(0, 5);
    
    // Check if already clocked in today
    const existingRecord = attendanceRecords.find(r => 
        r.employeeId === employeeId && r.date === today
    );
    
    if (existingRecord && existingRecord.clockIn) {
        return { success: false, message: `${employee.name} already clocked in today at ${existingRecord.clockIn}` };
    }
    
    // Determine status (late if after start time + threshold)
    const startTime = WORK_SCHEDULE.startTime;
    const [startHour, startMin] = startTime.split(':').map(Number);
    const lateThreshold = new Date(now);
    lateThreshold.setHours(startHour, startMin + WORK_SCHEDULE.lateThreshold, 0);
    
    const status = now > lateThreshold ? 'late' : 'present';
    
    if (existingRecord) {
        existingRecord.clockIn = timeStr;
        existingRecord.status = status;
    } else {
        const record = {
            id: generateUniqueId('ATT'),
            employeeId: employeeId,
            employeeName: employee.name,
            date: today,
            clockIn: timeStr,
            clockOut: null,
            status: status,
            workHours: 0,
            notes: ''
        };
        attendanceRecords.push(record);
    }
    
    saveAttendanceData();
    
    const statusMsg = status === 'late' ? ' (Late)' : '';
    return { success: true, message: `${employee.name} clocked in at ${timeStr}${statusMsg}`, status };
}

function clockOutEmployee(employeeId) {
    const employees = window.getEmployees ? window.getEmployees() : [];
    const employee = employees.find(e => e.id === employeeId);
    if (!employee) return { success: false, message: 'Employee not found' };
    
    const today = new Date().toISOString().slice(0, 10);
    const now = new Date();
    const timeStr = now.toTimeString().slice(0, 5);
    
    const record = attendanceRecords.find(r => 
        r.employeeId === employeeId && r.date === today
    );
    
    if (!record || !record.clockIn) {
        return { success: false, message: `${employee.name} hasn't clocked in today` };
    }
    
    if (record.clockOut) {
        return { success: false, message: `${employee.name} already clocked out at ${record.clockOut}` };
    }
    
    record.clockOut = timeStr;
    record.workHours = calculateWorkHours(record.clockIn, record.clockOut);
    
    saveAttendanceData();
    return { success: true, message: `${employee.name} clocked out at ${timeStr}. Work hours: ${record.workHours.toFixed(1)}h`, workHours: record.workHours };
}

function saveAttendanceRecord(recordData) {
    const id = recordData.id;
    const record = attendanceRecords.find(r => r.id === id);
    if (record) {
        Object.assign(record, recordData);
        if (record.clockIn && record.clockOut) {
            record.workHours = calculateWorkHours(record.clockIn, record.clockOut);
        }
    }
    saveAttendanceData();
}

function deleteAttendanceRecord(recordId) {
    const record = attendanceRecords.find(r => r.id === recordId);
    if (!record) return;
    
    if (confirm(`Delete attendance record for ${record.employeeName} on ${record.date}?`)) {
        attendanceRecords = attendanceRecords.filter(r => r.id !== recordId);
        saveAttendanceData();
        loadAttendanceRecords();
        updateAttendanceStats();
        showNotification('Attendance record deleted', 'success');
    }
}

function getAttendanceRecordById(recordId) {
    return attendanceRecords.find(r => r.id === recordId);
}

function getAttendanceRecordsArray() {
    return attendanceRecords;
}

// ==================== HELPER FUNCTIONS ====================
function generateUniqueId(prefix = 'ID') {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function escapeHTML(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function formatDateLA(dateStr) {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-MY', { 
        day: '2-digit', 
        month: 'short', 
        year: 'numeric' 
    });
}

function showNotification(message, type = 'info') {
    if (typeof window.showNotification === 'function' && window.showNotification !== showNotification) {
        window.showNotification(message, type);
    } else {
        console.log(`[${type.toUpperCase()}] ${message}`);
        // Fallback notification
        const notif = document.createElement('div');
        notif.className = `notification ${type}`;
        notif.style.cssText = 'position: fixed; top: 20px; right: 20px; padding: 15px 25px; border-radius: 8px; z-index: 10001; animation: slideIn 0.3s;';
        notif.style.background = type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : type === 'warning' ? '#f59e0b' : '#3b82f6';
        notif.style.color = 'white';
        notif.textContent = message;
        document.body.appendChild(notif);
        setTimeout(() => notif.remove(), 3000);
    }
}

// ==================== WINDOW EXPORTS ====================
window.LEAVE_ENTITLEMENTS = LEAVE_ENTITLEMENTS;
window.WORK_SCHEDULE = WORK_SCHEDULE;
window.initializeLeaveAttendance = initializeLeaveAttendance;
window.loadLeaveData = loadLeaveData;
window.loadAttendanceData = loadAttendanceData;
window.saveLeaveData = saveLeaveData;
window.saveAttendanceData = saveAttendanceData;
window.getEmployeeLeaveBalance = getEmployeeLeaveBalance;
window.updateLeaveBalance = updateLeaveBalance;
window.calculateLeaveDays = calculateLeaveDays;
window.saveLeaveRequestData = saveLeaveRequestData;
window.approveLeave = approveLeave;
window.rejectLeave = rejectLeave;
window.deleteLeaveRequest = deleteLeaveRequest;
window.getLeaveRequestById = getLeaveRequestById;
window.getLeaveRequestsArray = getLeaveRequestsArray;
window.getLeaveBalancesArray = getLeaveBalancesArray;
window.calculateWorkHours = calculateWorkHours;
window.clockInEmployee = clockInEmployee;
window.clockOutEmployee = clockOutEmployee;
window.saveAttendanceRecord = saveAttendanceRecord;
window.deleteAttendanceRecord = deleteAttendanceRecord;
window.getAttendanceRecordById = getAttendanceRecordById;
window.getAttendanceRecordsArray = getAttendanceRecordsArray;
window.generateUniqueId = generateUniqueId;
window.escapeHTML = escapeHTML;
window.formatDateLA = formatDateLA;
