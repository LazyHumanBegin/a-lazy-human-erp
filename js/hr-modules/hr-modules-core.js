// ==================== HR-MODULES CORE.JS ====================
// HR sections: Data management, business logic, helper functions

// ==================== DATA ACCESS FUNCTIONS ====================
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

function saveKPITemplates(templates) {
    localStorage.setItem('ezcubic_kpi_templates', JSON.stringify(templates));
    if (typeof saveToUserTenant === 'function') {
        saveToUserTenant();
    }
}

// ==================== CALCULATION FUNCTIONS ====================
function calculateLeaveDaysHR(fromDate, toDate) {
    if (!fromDate || !toDate) return 0;
    const from = new Date(fromDate);
    const to = new Date(toDate);
    const diff = Math.abs(to - from);
    return Math.ceil(diff / (1000 * 60 * 60 * 24)) + 1;
}

function calculateWorkHoursHR(clockIn, clockOut) {
    if (!clockIn || !clockOut) return '-';
    const [inH, inM] = clockIn.split(':').map(Number);
    const [outH, outM] = clockOut.split(':').map(Number);
    const hours = outH - inH + (outM - inM) / 60;
    return `${hours.toFixed(1)}h`;
}

function formatDateHR(dateStr) {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-MY', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
    });
}

// ==================== EMPLOYEE DIRECTORY LOGIC ====================
function getEmployeeDirectoryStats() {
    const employees = getEmployees();
    return {
        total: employees.length,
        active: employees.filter(e => e.status === 'active').length,
        inactive: employees.filter(e => e.status === 'inactive').length,
        onLeave: employees.filter(e => e.status === 'on-leave').length
    };
}

function filterEmployeesData(search, status, dept) {
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
    
    return employees;
}

function getEmployeeDepartments() {
    const employees = getEmployees();
    return [...new Set(employees.map(e => e.department).filter(Boolean))];
}

// ==================== LEAVE & ATTENDANCE LOGIC ====================
function getLAStats() {
    const leaveRequests = getLeaveRequests();
    const today = new Date().toISOString().split('T')[0];
    const currentMonth = new Date().toISOString().slice(0, 7);
    
    return {
        pending: leaveRequests.filter(l => l.status === 'pending').length,
        approved: leaveRequests.filter(l => l.status === 'approved' && l.createdDate?.startsWith(currentMonth)).length,
        onToday: leaveRequests.filter(l => l.status === 'approved' && l.fromDate <= today && l.toDate >= today).length,
        rejected: leaveRequests.filter(l => l.status === 'rejected').length
    };
}

function getFilteredLeaveRequests(statusFilter, employeeFilter, monthFilter) {
    let filtered = getLeaveRequests();
    
    if (statusFilter) {
        filtered = filtered.filter(l => l.status === statusFilter);
    }
    if (employeeFilter) {
        filtered = filtered.filter(l => l.employeeId == employeeFilter);
    }
    if (monthFilter) {
        filtered = filtered.filter(l => l.fromDate?.startsWith(monthFilter) || l.toDate?.startsWith(monthFilter));
    }
    
    return filtered;
}

function getAttendanceStats() {
    const attendance = getAttendanceRecords();
    const employees = getEmployees();
    const today = new Date().toISOString().split('T')[0];
    
    const todayRecords = attendance.filter(a => a.date === today);
    return {
        present: todayRecords.filter(a => a.status === 'present' || a.clockIn).length,
        late: todayRecords.filter(a => a.status === 'late').length,
        absent: Math.max(0, employees.length - todayRecords.length)
    };
}

function processClockIn(employeeId) {
    const now = new Date();
    const attendance = getAttendanceRecords();
    const today = now.toISOString().split('T')[0];
    
    // Check if already clocked in
    const existing = attendance.find(a => a.employeeId == employeeId && a.date === today);
    if (existing && existing.clockIn) {
        return { success: false, message: 'Employee already clocked in today' };
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
    
    return { success: true, message: 'Clock in recorded' };
}

function processClockOut(employeeId) {
    const now = new Date();
    const attendance = getAttendanceRecords();
    const today = now.toISOString().split('T')[0];
    
    const existing = attendance.find(a => a.employeeId == employeeId && a.date === today);
    if (!existing) {
        return { success: false, message: 'No clock in record found for today' };
    }
    
    if (existing.clockOut) {
        return { success: false, message: 'Employee already clocked out today' };
    }
    
    existing.clockOut = now.toTimeString().slice(0, 5);
    saveAttendanceRecords(attendance);
    
    return { success: true, message: 'Clock out recorded' };
}

function approveLeaveRequest(leaveId) {
    const leaveRequests = getLeaveRequests();
    const leave = leaveRequests.find(l => l.id == leaveId);
    if (leave) {
        leave.status = 'approved';
        leave.approvedDate = new Date().toISOString();
        saveLeaveRequests(leaveRequests);
        return true;
    }
    return false;
}

function rejectLeaveRequest(leaveId) {
    const leaveRequests = getLeaveRequests();
    const leave = leaveRequests.find(l => l.id == leaveId);
    if (leave) {
        leave.status = 'rejected';
        leave.rejectedDate = new Date().toISOString();
        saveLeaveRequests(leaveRequests);
        return true;
    }
    return false;
}

// ==================== KPI LOGIC ====================
function getKPISectionStats() {
    const transactions = window.transactions || [];
    const currentMonth = new Date().toISOString().slice(0, 7);
    
    const monthlyTx = transactions.filter(t => 
        t.type === 'income' && t.date?.startsWith(currentMonth)
    );
    
    return {
        totalSales: monthlyTx.reduce((sum, t) => sum + (t.amount || 0), 0),
        txCount: monthlyTx.length
    };
}

function calculateEmployeeKPI(employee, month) {
    const transactions = window.transactions || [];
    
    const empTx = transactions.filter(t => 
        t.type === 'income' && 
        t.date?.startsWith(month) &&
        (t.staffId == employee.id || t.assignedTo == employee.id)
    );
    
    const totalSales = empTx.reduce((sum, t) => sum + (t.amount || 0), 0);
    const txCount = empTx.length;
    const avgSale = txCount > 0 ? totalSales / txCount : 0;
    
    const target = employee.salesTarget || 10000;
    const score = Math.min(100, Math.round((totalSales / target) * 100));
    
    let rating = 'Needs Improvement';
    if (score >= 90) rating = 'Excellent';
    else if (score >= 70) rating = 'Good';
    else if (score >= 50) rating = 'Average';
    
    return {
        employee,
        totalSales,
        txCount,
        avgSale,
        target,
        score,
        rating,
        transactions: empTx
    };
}

function generateKPIReports(employees, month, employeeFilter) {
    let targetEmployees = employees;
    if (employeeFilter) {
        targetEmployees = employees.filter(e => e.id == employeeFilter);
    }
    
    return targetEmployees.map(emp => calculateEmployeeKPI(emp, month));
}

function loadKPISampleDataCore() {
    // Create sample employees
    const sampleEmployees = [
        { id: 1, name: 'Ahmad Razak', email: 'ahmad@company.com', phone: '012-3456789', position: 'Sales Manager', department: 'Sales', status: 'active', salary: 5000, salesTarget: 50000, joinDate: '2023-01-15' },
        { id: 2, name: 'Siti Aminah', email: 'siti@company.com', phone: '013-4567890', position: 'Senior Sales', department: 'Sales', status: 'active', salary: 3500, salesTarget: 30000, joinDate: '2023-03-20' },
        { id: 3, name: 'Raj Kumar', email: 'raj@company.com', phone: '014-5678901', position: 'Sales Executive', department: 'Sales', status: 'active', salary: 2800, salesTarget: 20000, joinDate: '2023-06-01' },
        { id: 4, name: 'Lim Wei Ming', email: 'weiming@company.com', phone: '015-6789012', position: 'Sales Executive', department: 'Sales', status: 'active', salary: 2800, salesTarget: 20000, joinDate: '2023-08-15' },
        { id: 5, name: 'Nurul Izzah', email: 'nurul@company.com', phone: '016-7890123', position: 'Junior Sales', department: 'Sales', status: 'active', salary: 2200, salesTarget: 15000, joinDate: '2024-01-10' }
    ];
    
    localStorage.setItem('ezcubic_employees', JSON.stringify(sampleEmployees));
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
    if (typeof saveToUserTenant === 'function') {
        saveToUserTenant();
    }
    
    return true;
}

// ==================== WINDOW EXPORTS ====================
window.getEmployees = getEmployees;
window.getLeaveRequests = getLeaveRequests;
window.saveLeaveRequests = saveLeaveRequests;
window.getAttendanceRecords = getAttendanceRecords;
window.saveAttendanceRecords = saveAttendanceRecords;
window.getKPITemplates = getKPITemplates;
window.saveKPITemplates = saveKPITemplates;
window.calculateLeaveDaysHR = calculateLeaveDaysHR;
window.calculateWorkHoursHR = calculateWorkHoursHR;
window.formatDateHR = formatDateHR;
window.getEmployeeDirectoryStats = getEmployeeDirectoryStats;
window.filterEmployeesData = filterEmployeesData;
window.getEmployeeDepartments = getEmployeeDepartments;
window.getLAStats = getLAStats;
window.getFilteredLeaveRequests = getFilteredLeaveRequests;
window.getAttendanceStats = getAttendanceStats;
window.processClockIn = processClockIn;
window.processClockOut = processClockOut;
window.approveLeaveRequest = approveLeaveRequest;
window.rejectLeaveRequest = rejectLeaveRequest;
window.getKPISectionStats = getKPISectionStats;
window.calculateEmployeeKPI = calculateEmployeeKPI;
window.generateKPIReports = generateKPIReports;
window.loadKPISampleDataCore = loadKPISampleDataCore;
