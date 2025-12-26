/**
 * EZCubic - Employee List & Management UI - Split from payroll-ui.js v2.3.2
 * Malaysian HR & Payroll System - Employee Management
 * Handles: loadEmployees, populateDepartmentFilter, viewEmployee, closeEmployeeDetailModal
 * Version: 1.0.0 - 26 Dec 2025
 */

// ==================== EMPLOYEE LIST ====================
function loadEmployees() {
    const windowEmployees = window.employees || [];
    const stored = localStorage.getItem(EMPLOYEES_KEY);
    let localStorageEmployees = [];
    try {
        localStorageEmployees = JSON.parse(stored) || [];
    } catch (e) {
        localStorageEmployees = [];
    }
    
    if (windowEmployees.length > 0) {
        employees = windowEmployees;
    } else if (localStorageEmployees.length > 0) {
        employees = localStorageEmployees;
        window.employees = employees;
    }
    window.employees = employees;
    
    const container = document.getElementById('employeesGrid');
    if (!container) return;
    
    const searchTerm = document.getElementById('employeeSearch')?.value.toLowerCase() || '';
    const statusFilter = document.getElementById('employeeStatusFilter')?.value || 'all';
    const deptFilter = document.getElementById('employeeDeptFilter')?.value || 'all';
    
    let filteredEmployees = employees.filter(emp => {
        const matchesSearch = emp.name.toLowerCase().includes(searchTerm) || 
                             emp.ic.includes(searchTerm) ||
                             (emp.department || '').toLowerCase().includes(searchTerm);
        const matchesStatus = statusFilter === 'all' || emp.status === statusFilter;
        const matchesDept = deptFilter === 'all' || emp.department === deptFilter;
        return matchesSearch && matchesStatus && matchesDept;
    });
    
    if (filteredEmployees.length === 0) {
        container.innerHTML = `
            <div class="empty-state" style="grid-column: 1/-1;">
                <i class="fas fa-users"></i>
                <h4>No employees found</h4>
                <p>Add your first employee to get started</p>
                <button class="btn-primary" onclick="showEmployeeModal()" style="margin-top: 15px;">
                    <i class="fas fa-plus"></i> Add Employee
                </button>
            </div>
        `;
        return;
    }
    
    container.innerHTML = filteredEmployees.map(emp => `
        <div class="employee-card ${emp.status === 'inactive' ? 'inactive' : ''}">
            <div class="employee-avatar">
                ${emp.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
            </div>
            <div class="employee-info">
                <h4>${escapeHTML(emp.name)}</h4>
                <p class="employee-position">${escapeHTML(emp.position || 'No Position')}</p>
                <p class="employee-department"><i class="fas fa-building"></i> ${escapeHTML(emp.department || 'No Department')}</p>
                <p class="employee-salary"><i class="fas fa-money-bill"></i> ${formatCurrency(emp.basicSalary)}/month</p>
            </div>
            <div class="employee-status">
                <span class="status-badge ${emp.status}">${emp.status === 'active' ? 'Active' : 'Inactive'}</span>
            </div>
            <div class="employee-actions">
                <button class="btn-icon" onclick="viewEmployee('${emp.id}')" title="View Details">
                    <i class="fas fa-eye"></i>
                </button>
                <button class="btn-icon" onclick="viewEmployeeSalesReport('${escapeHTML(emp.name)}')" title="Sales Report">
                    <i class="fas fa-chart-bar"></i>
                </button>
                <button class="btn-icon" onclick="editEmployee('${emp.id}')" title="Edit">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn-icon danger" onclick="deleteEmployee('${emp.id}')" title="Delete">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
    `).join('');
    
    populateDepartmentFilter();
}

function populateDepartmentFilter() {
    const filter = document.getElementById('employeeDeptFilter');
    if (!filter) return;
    
    const departments = [...new Set(employees.map(e => e.department).filter(d => d))];
    const currentValue = filter.value;
    
    filter.innerHTML = '<option value="all">All Departments</option>' +
        departments.map(d => `<option value="${escapeHTML(d)}">${escapeHTML(d)}</option>`).join('');
    
    filter.value = currentValue;
}

// ==================== VIEW EMPLOYEE ====================
function viewEmployee(employeeId) {
    const employee = employees.find(e => e.id === employeeId);
    if (!employee) return;
    
    const modal = document.getElementById('employeeDetailModal');
    const content = document.getElementById('employeeDetailContent');
    
    const birthYear = parseInt('19' + employee.ic.substring(0, 2));
    const currentYear = new Date().getFullYear();
    const age = currentYear - birthYear;
    
    const startDate = new Date(employee.startDate);
    const yearsOfService = ((new Date() - startDate) / (365.25 * 24 * 60 * 60 * 1000)).toFixed(1);
    
    content.innerHTML = `
        <div class="employee-detail-header">
            <div class="employee-detail-avatar">
                ${employee.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
            </div>
            <div class="employee-detail-title">
                <h3>${escapeHTML(employee.name)}</h3>
                <p>${escapeHTML(employee.position || 'No Position')} • ${escapeHTML(employee.department || 'No Department')}</p>
                <span class="status-badge ${employee.status}">${employee.status === 'active' ? 'Active' : 'Inactive'}</span>
            </div>
        </div>
        
        <div class="employee-detail-sections">
            <div class="detail-section">
                <h4><i class="fas fa-user"></i> Personal Information</h4>
                <div class="detail-grid">
                    <div class="detail-item">
                        <span class="label">IC Number</span>
                        <span class="value">${escapeHTML(employee.ic)}</span>
                    </div>
                    <div class="detail-item">
                        <span class="label">Age</span>
                        <span class="value">${age} years old</span>
                    </div>
                    <div class="detail-item">
                        <span class="label">Email</span>
                        <span class="value">${escapeHTML(employee.email || '-')}</span>
                    </div>
                    <div class="detail-item">
                        <span class="label">Phone</span>
                        <span class="value">${escapeHTML(employee.phone || '-')}</span>
                    </div>
                    <div class="detail-item" style="grid-column: 1/-1;">
                        <span class="label">Address</span>
                        <span class="value">${escapeHTML(employee.address || '-')}</span>
                    </div>
                </div>
            </div>
            
            <div class="detail-section">
                <h4><i class="fas fa-briefcase"></i> Employment Details</h4>
                <div class="detail-grid">
                    <div class="detail-item">
                        <span class="label">Employment Type</span>
                        <span class="value">${employee.employmentType === 'full-time' ? 'Full Time' : employee.employmentType === 'part-time' ? 'Part Time' : 'Contract'}</span>
                    </div>
                    <div class="detail-item">
                        <span class="label">Start Date</span>
                        <span class="value">${new Date(employee.startDate).toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                    </div>
                    <div class="detail-item">
                        <span class="label">Years of Service</span>
                        <span class="value">${yearsOfService} years</span>
                    </div>
                    <div class="detail-item">
                        <span class="label">Basic Salary</span>
                        <span class="value" style="color: #10b981; font-weight: 600;">${formatCurrency(employee.basicSalary)}</span>
                    </div>
                </div>
            </div>
            
            <div class="detail-section">
                <h4><i class="fas fa-university"></i> Bank & Statutory</h4>
                <div class="detail-grid">
                    <div class="detail-item">
                        <span class="label">Bank Name</span>
                        <span class="value">${escapeHTML(employee.bankName || '-')}</span>
                    </div>
                    <div class="detail-item">
                        <span class="label">Bank Account</span>
                        <span class="value">${escapeHTML(employee.bankAccount || '-')}</span>
                    </div>
                    <div class="detail-item">
                        <span class="label">EPF No.</span>
                        <span class="value">${escapeHTML(employee.epfNo || '-')}</span>
                    </div>
                    <div class="detail-item">
                        <span class="label">SOCSO No.</span>
                        <span class="value">${escapeHTML(employee.socsoNo || '-')}</span>
                    </div>
                    <div class="detail-item">
                        <span class="label">Tax No. (LHDN)</span>
                        <span class="value">${escapeHTML(employee.taxNo || '-')}</span>
                    </div>
                </div>
            </div>
        </div>
        
        <div class="employee-detail-actions">
            <button class="btn-primary" onclick="showProcessPayrollModal('${employee.id}')">
                <i class="fas fa-calculator"></i> Process Payroll
            </button>
            <button class="btn-secondary" onclick="editEmployee('${employee.id}'); closeEmployeeDetailModal();">
                <i class="fas fa-edit"></i> Edit Employee
            </button>
        </div>
    `;
    
    modal.style.display = 'flex';
}

function closeEmployeeDetailModal() {
    document.getElementById('employeeDetailModal').style.display = 'none';
}

// ==================== EXPORT TO WINDOW ====================
window.loadEmployees = loadEmployees;
window.populateDepartmentFilter = populateDepartmentFilter;
window.viewEmployee = viewEmployee;
window.closeEmployeeDetailModal = closeEmployeeDetailModal;
