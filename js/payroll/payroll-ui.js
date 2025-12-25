/**
 * PAYROLL-UI.JS
 * Malaysian HR & Payroll System - UI
 * Employee List, Payroll Processing, Payslips, Sales Reports
 * Version: 2.2.7 - Modular Split - 26 Dec 2025
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
window.closeEmployeeDetailModal = closeEmployeeDetailModal;

// ==================== PROCESS PAYROLL ====================
function showProcessPayrollModal(employeeId = null) {
    const modal = document.getElementById('processPayrollModal');
    const employeeSelect = document.getElementById('payrollEmployee');
    
    const activeEmployees = employees.filter(e => e.status === 'active');
    employeeSelect.innerHTML = '<option value="">Select Employee</option>' +
        activeEmployees.map(e => `<option value="${e.id}" ${e.id === employeeId ? 'selected' : ''}>${escapeHTML(e.name)} - ${formatCurrency(e.basicSalary)}</option>`).join('');
    
    const today = new Date();
    document.getElementById('payrollMonth').value = today.toISOString().slice(0, 7);
    
    document.getElementById('payrollAllowances').value = '0';
    document.getElementById('payrollOvertime').value = '0';
    document.getElementById('payrollCommission').value = '0';
    document.getElementById('payrollDeductions').value = '0';
    document.getElementById('commissionInfo').innerHTML = '';
    
    if (employeeId) {
        setTimeout(() => {
            calculateAutoCommission();
            calculatePayrollPreview();
        }, 100);
    } else {
        document.getElementById('payrollPreview').innerHTML = '<p style="text-align: center; color: #64748b;">Select an employee to see payroll preview</p>';
    }
    
    modal.style.display = 'flex';
}

function closeProcessPayrollModal() {
    document.getElementById('processPayrollModal').style.display = 'none';
}

function calculatePayrollPreview() {
    const employeeId = document.getElementById('payrollEmployee').value;
    const preview = document.getElementById('payrollPreview');
    
    if (!employeeId) {
        preview.innerHTML = '<p style="text-align: center; color: #64748b;">Select an employee to see payroll preview</p>';
        return;
    }
    
    const employee = employees.find(e => e.id === employeeId);
    if (!employee) return;
    
    const allowances = parseFloat(document.getElementById('payrollAllowances').value) || 0;
    const overtime = parseFloat(document.getElementById('payrollOvertime').value) || 0;
    const commission = parseFloat(document.getElementById('payrollCommission').value) || 0;
    const deductions = parseFloat(document.getElementById('payrollDeductions').value) || 0;
    
    const payroll = calculateFullPayroll(employee, allowances, overtime, deductions, commission);
    
    const exemptions = [];
    if (!payroll.hasEPF) exemptions.push('EPF');
    if (!payroll.hasSOCSO) exemptions.push('SOCSO');
    if (!payroll.hasEIS) exemptions.push('EIS');
    if (!payroll.hasPCB) exemptions.push('PCB');
    const exemptionNotice = exemptions.length > 0 
        ? `<div style="background: #fef3c7; color: #92400e; padding: 8px 12px; border-radius: 6px; margin-bottom: 15px; font-size: 12px;">
             <i class="fas fa-exclamation-triangle"></i> Exempt from: ${exemptions.join(', ')}
           </div>` 
        : '';
    
    preview.innerHTML = `
        ${exemptionNotice}
        <div class="payroll-preview-grid">
            <div class="preview-section earnings">
                <h5><i class="fas fa-plus-circle"></i> Earnings</h5>
                <div class="preview-row">
                    <span>Basic Salary</span>
                    <span>${formatCurrency(payroll.basicSalary)}</span>
                </div>
                ${allowances > 0 ? `<div class="preview-row"><span>Allowances</span><span>${formatCurrency(allowances)}</span></div>` : ''}
                ${overtime > 0 ? `<div class="preview-row"><span>Overtime</span><span>${formatCurrency(overtime)}</span></div>` : ''}
                ${commission > 0 ? `<div class="preview-row"><span>Commission</span><span>${formatCurrency(commission)}</span></div>` : ''}
                <div class="preview-row total"><span>Gross Salary</span><span>${formatCurrency(payroll.grossSalary)}</span></div>
            </div>
            
            <div class="preview-section deductions">
                <h5><i class="fas fa-minus-circle"></i> Deductions (Employee)</h5>
                ${payroll.hasEPF ? `<div class="preview-row"><span>EPF (11%)</span><span>- ${formatCurrency(payroll.epfEmployee)}</span></div>` : ''}
                ${payroll.hasSOCSO ? `<div class="preview-row"><span>SOCSO</span><span>- ${formatCurrency(payroll.socsoEmployee)}</span></div>` : ''}
                ${payroll.hasEIS ? `<div class="preview-row"><span>EIS</span><span>- ${formatCurrency(payroll.eisEmployee)}</span></div>` : ''}
                ${payroll.hasPCB ? `<div class="preview-row"><span>PCB (Tax)</span><span>- ${formatCurrency(payroll.pcb)}</span></div>` : ''}
                ${deductions > 0 ? `<div class="preview-row"><span>Other Deductions</span><span>- ${formatCurrency(deductions)}</span></div>` : ''}
                <div class="preview-row total"><span>Total Deductions</span><span>- ${formatCurrency(payroll.totalDeductions)}</span></div>
            </div>
            
            <div class="preview-section employer">
                <h5><i class="fas fa-building"></i> Employer Contributions</h5>
                ${payroll.hasEPF ? `<div class="preview-row"><span>EPF (13%)</span><span>${formatCurrency(payroll.epfEmployer)}</span></div>` : ''}
                ${payroll.hasSOCSO ? `<div class="preview-row"><span>SOCSO</span><span>${formatCurrency(payroll.socsoEmployer)}</span></div>` : ''}
                ${payroll.hasEIS ? `<div class="preview-row"><span>EIS</span><span>${formatCurrency(payroll.eisEmployer)}</span></div>` : ''}
                <div class="preview-row total"><span>Total Employer</span><span>${formatCurrency(payroll.totalEmployerContributions)}</span></div>
            </div>
            
            <div class="preview-section net-pay">
                <div class="net-pay-box">
                    <span>NET PAY</span>
                    <span class="net-amount">${formatCurrency(payroll.netSalary)}</span>
                </div>
                <div class="total-cost">
                    <span>Total Cost to Company</span>
                    <span>${formatCurrency(payroll.totalCostToCompany)}</span>
                </div>
            </div>
        </div>
    `;
}

function processPayroll() {
    const employeeId = document.getElementById('payrollEmployee').value;
    const payrollMonth = document.getElementById('payrollMonth').value;
    
    if (!employeeId || !payrollMonth) {
        showNotification('Please select employee and month', 'error');
        return;
    }
    
    const employee = employees.find(e => e.id === employeeId);
    if (!employee) return;
    
    const existing = payrollRecords.find(p => p.employeeId === employeeId && p.month === payrollMonth);
    if (existing) {
        if (!confirm('Payroll already processed for this month. Do you want to replace it?')) {
            return;
        }
        payrollRecords = payrollRecords.filter(p => !(p.employeeId === employeeId && p.month === payrollMonth));
    }
    
    const allowances = parseFloat(document.getElementById('payrollAllowances').value) || 0;
    const overtime = parseFloat(document.getElementById('payrollOvertime').value) || 0;
    const commission = parseFloat(document.getElementById('payrollCommission').value) || 0;
    const deductions = parseFloat(document.getElementById('payrollDeductions').value) || 0;
    
    const payroll = calculateFullPayroll(employee, allowances, overtime, deductions, commission);
    
    const record = {
        id: generateUniqueId(),
        employeeId: employeeId,
        employeeName: employee.name,
        month: payrollMonth,
        ...payroll,
        status: 'processed',
        processedAt: new Date().toISOString()
    };
    
    payrollRecords.push(record);
    savePayrollData();
    
    const salaryExpense = {
        id: generateUniqueId(),
        type: 'expense',
        date: `${payrollMonth}-28`,
        amount: payroll.totalCostToCompany,
        description: `Salary - ${employee.name} (${payrollMonth})`,
        category: 'salary',
        method: 'bank',
        timestamp: new Date().toISOString()
    };
    
    businessData.transactions.push(salaryExpense);
    saveData();
    
    closeProcessPayrollModal();
    loadPayrollHistory();
    updatePayrollStats();
    updateDashboard();
    showNotification(`Payroll processed for ${employee.name}!`, 'success');
}

// ==================== PAYROLL HISTORY ====================
function loadPayrollHistory() {
    const container = document.getElementById('payrollHistory');
    if (!container) return;
    
    const monthFilter = document.getElementById('payrollMonthFilter')?.value || '';
    
    let filtered = [...payrollRecords].sort((a, b) => new Date(b.processedAt) - new Date(a.processedAt));
    
    if (monthFilter) {
        filtered = filtered.filter(p => p.month === monthFilter);
    }
    
    if (filtered.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-file-invoice-dollar"></i>
                <h4>No payroll records</h4>
                <p>Process your first payroll to see history here</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = `
        <table class="payroll-table">
            <thead>
                <tr>
                    <th>Employee</th>
                    <th>Month</th>
                    <th>Gross</th>
                    <th>Deductions</th>
                    <th>Net Pay</th>
                    <th>Status</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                ${filtered.map(record => `
                    <tr>
                        <td><strong>${escapeHTML(record.employeeName)}</strong></td>
                        <td>${formatMonth(record.month)}</td>
                        <td>${formatCurrency(record.grossSalary)}</td>
                        <td style="color: #ef4444;">-${formatCurrency(record.totalDeductions)}</td>
                        <td style="color: #10b981; font-weight: 600;">${formatCurrency(record.netSalary)}</td>
                        <td><span class="status-badge ${record.status}">${record.status === 'processed' ? 'Processed' : 'Paid'}</span></td>
                        <td>
                            ${record.status === 'processed' ? `
                            <button class="btn-icon success" onclick="markPayrollAsPaid('${record.id}')" title="Mark as Paid">
                                <i class="fas fa-check-circle"></i>
                            </button>
                            ` : ''}
                            <button class="btn-icon" onclick="viewPayslip('${record.id}')" title="View Payslip">
                                <i class="fas fa-file-alt"></i>
                            </button>
                            <button class="btn-icon" onclick="printPayslip('${record.id}')" title="Print">
                                <i class="fas fa-print"></i>
                            </button>
                            <button class="btn-icon danger" onclick="deletePayroll('${record.id}')" title="Delete Payroll">
                                <i class="fas fa-trash"></i>
                            </button>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

function markPayrollAsPaid(recordId) {
    const record = payrollRecords.find(p => p.id === recordId);
    if (!record) {
        showToast('Payroll record not found', 'error');
        return;
    }
    
    if (record.status === 'paid') {
        showToast('This payroll is already marked as paid', 'info');
        return;
    }
    
    if (!confirm(`Mark payroll for ${record.employeeName} (${formatMonth(record.month)}) as PAID?\n\nNet Pay: RM ${record.netSalary.toFixed(2)}`)) {
        return;
    }
    
    record.status = 'paid';
    record.paidAt = new Date().toISOString();
    record.paidBy = typeof getCurrentUser === 'function' ? getCurrentUser()?.name : 'Admin';
    
    savePayrollData();
    loadPayrollHistory();
    
    showToast(`✅ Payroll for ${record.employeeName} marked as PAID`, 'success');
}

function deletePayroll(recordId) {
    const record = payrollRecords.find(p => p.id === recordId);
    if (!record) {
        showToast('Payroll record not found', 'error');
        return;
    }
    
    const statusText = record.status === 'paid' ? '⚠️ WARNING: This payroll is already PAID!' : '';
    
    if (!confirm(`${statusText}\n\nDelete payroll record for ${record.employeeName}?\n\nMonth: ${formatMonth(record.month)}\nNet Pay: RM ${record.netSalary.toFixed(2)}\n\nThis will also remove the salary expense from transactions.\n\nThis action cannot be undone.`)) {
        return;
    }
    
    payrollRecords = payrollRecords.filter(p => p.id !== recordId);
    
    const salaryDescription = `Salary - ${record.employeeName} (${record.month})`;
    if (businessData && businessData.transactions) {
        businessData.transactions = businessData.transactions.filter(t => 
            !(t.type === 'expense' && t.category === 'salary' && t.description === salaryDescription)
        );
        saveData();
    }
    
    savePayrollData();
    loadPayrollHistory();
    updatePayrollStats();
    
    if (typeof updateDashboard === 'function') {
        updateDashboard();
    }
    
    showToast(`🗑️ Payroll for ${record.employeeName} (${formatMonth(record.month)}) deleted`, 'success');
}

function formatMonth(monthStr) {
    const [year, month] = monthStr.split('-');
    const date = new Date(year, month - 1);
    return date.toLocaleDateString('en-MY', { month: 'short', year: 'numeric' });
}

// ==================== TAB NAVIGATION ====================
function showPayrollTab(tab) {
    document.querySelectorAll('#payroll .tabs:not(.secondary) .tab').forEach(t => t.classList.remove('active'));
    event.currentTarget.classList.add('active');
    
    const employeesSection = document.getElementById('employeesSection');
    const payrollSection = document.getElementById('payrollSection');
    const salesReportSection = document.getElementById('salesReportSection');
    const kpiSection = document.getElementById('kpiSection');
    const leaveSection = document.getElementById('leaveSection');
    const attendanceSection = document.getElementById('attendanceSection');
    
    if (employeesSection) employeesSection.style.display = 'none';
    if (payrollSection) payrollSection.style.display = 'none';
    if (salesReportSection) salesReportSection.style.display = 'none';
    if (kpiSection) kpiSection.style.display = 'none';
    if (leaveSection) leaveSection.style.display = 'none';
    if (attendanceSection) attendanceSection.style.display = 'none';
    
    if (tab === 'employees') {
        if (employeesSection) employeesSection.style.display = 'block';
        loadEmployees();
    } else if (tab === 'payroll') {
        if (payrollSection) payrollSection.style.display = 'block';
        loadPayrollHistory();
    } else if (tab === 'salesReport') {
        if (salesReportSection) salesReportSection.style.display = 'block';
        initializeSalesReport();
    } else if (tab === 'kpi') {
        if (kpiSection) kpiSection.style.display = 'block';
        if (typeof initializeKPI === 'function') {
            initializeKPI();
        }
    } else if (tab === 'leave') {
        if (leaveSection) leaveSection.style.display = 'block';
        if (typeof initializeLeaveAttendance === 'function') {
            initializeLeaveAttendance();
        }
        if (typeof loadLeaveRequests === 'function') {
            loadLeaveRequests();
        }
    } else if (tab === 'attendance') {
        if (attendanceSection) attendanceSection.style.display = 'block';
        if (typeof initializeLeaveAttendance === 'function') {
            initializeLeaveAttendance();
        }
        if (typeof loadAttendanceRecords === 'function') {
            loadAttendanceRecords();
        }
    }
}

// ==================== PAYSLIP ====================
function viewPayslip(recordId) {
    const record = payrollRecords.find(r => r.id === recordId);
    if (!record) return;
    
    const employee = employees.find(e => e.id === record.employeeId);
    const companyName = businessData.settings.businessName || 'Your Company';
    
    const modal = document.getElementById('payslipModal');
    const content = document.getElementById('payslipContent');
    
    content.innerHTML = `
        <div class="payslip" id="payslipPrint">
            <div class="payslip-header">
                <div class="company-info">
                    <h2>${escapeHTML(companyName)}</h2>
                    <p>Pay Slip for ${formatMonth(record.month)}</p>
                </div>
                <div class="payslip-badge">CONFIDENTIAL</div>
            </div>
            
            <div class="payslip-employee-info">
                <div class="info-row"><span class="label">Employee Name:</span><span class="value">${escapeHTML(record.employeeName)}</span></div>
                <div class="info-row"><span class="label">IC Number:</span><span class="value">${escapeHTML(employee?.ic || '-')}</span></div>
                <div class="info-row"><span class="label">Position:</span><span class="value">${escapeHTML(employee?.position || '-')}</span></div>
                <div class="info-row"><span class="label">Department:</span><span class="value">${escapeHTML(employee?.department || '-')}</span></div>
                <div class="info-row"><span class="label">EPF No:</span><span class="value">${escapeHTML(employee?.epfNo || '-')}</span></div>
                <div class="info-row"><span class="label">Bank Account:</span><span class="value">${escapeHTML(employee?.bankName || '')} ${escapeHTML(employee?.bankAccount || '-')}</span></div>
            </div>
            
            <div class="payslip-body">
                <div class="payslip-column earnings">
                    <h4>EARNINGS</h4>
                    <div class="payslip-line"><span>Basic Salary</span><span>${formatCurrency(record.basicSalary)}</span></div>
                    ${record.allowances > 0 ? `<div class="payslip-line"><span>Allowances</span><span>${formatCurrency(record.allowances)}</span></div>` : ''}
                    ${record.overtime > 0 ? `<div class="payslip-line"><span>Overtime</span><span>${formatCurrency(record.overtime)}</span></div>` : ''}
                    <div class="payslip-line total"><span>GROSS SALARY</span><span>${formatCurrency(record.grossSalary)}</span></div>
                </div>
                
                <div class="payslip-column deductions">
                    <h4>DEDUCTIONS</h4>
                    <div class="payslip-line"><span>EPF (Employee 11%)</span><span>${formatCurrency(record.epfEmployee)}</span></div>
                    <div class="payslip-line"><span>SOCSO</span><span>${formatCurrency(record.socsoEmployee)}</span></div>
                    <div class="payslip-line"><span>EIS</span><span>${formatCurrency(record.eisEmployee)}</span></div>
                    <div class="payslip-line"><span>PCB (Income Tax)</span><span>${formatCurrency(record.pcb)}</span></div>
                    ${record.otherDeductions > 0 ? `<div class="payslip-line"><span>Other Deductions</span><span>${formatCurrency(record.otherDeductions)}</span></div>` : ''}
                    <div class="payslip-line total"><span>TOTAL DEDUCTIONS</span><span>${formatCurrency(record.totalDeductions)}</span></div>
                </div>
            </div>
            
            <div class="payslip-employer">
                <h4>EMPLOYER CONTRIBUTIONS</h4>
                <div class="employer-grid">
                    <div class="payslip-line"><span>EPF (Employer 13%)</span><span>${formatCurrency(record.epfEmployer)}</span></div>
                    <div class="payslip-line"><span>SOCSO (Employer)</span><span>${formatCurrency(record.socsoEmployer)}</span></div>
                    <div class="payslip-line"><span>EIS (Employer)</span><span>${formatCurrency(record.eisEmployer)}</span></div>
                </div>
            </div>
            
            <div class="payslip-net">
                <div class="net-pay-label">NET PAY</div>
                <div class="net-pay-amount">${formatCurrency(record.netSalary)}</div>
            </div>
            
            <div class="payslip-footer">
                <p>This is a computer generated payslip. No signature required.</p>
                <p>Generated on: ${new Date(record.processedAt).toLocaleDateString('en-MY', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
            </div>
        </div>
    `;
    
    modal.style.display = 'flex';
}

function closePayslipModal() {
    document.getElementById('payslipModal').style.display = 'none';
}
window.closePayslipModal = closePayslipModal;

function printPayslip(recordId) {
    viewPayslip(recordId);
    setTimeout(() => {
        const printContent = document.getElementById('payslipPrint').innerHTML;
        const printWindow = window.open('', '', 'width=800,height=600');
        printWindow.document.write(`
            <html>
            <head>
                <title>Payslip</title>
                <style>
                    body { font-family: Arial, sans-serif; padding: 20px; }
                    .payslip { max-width: 800px; margin: 0 auto; }
                    .payslip-header { display: flex; justify-content: space-between; border-bottom: 2px solid #1e293b; padding-bottom: 15px; margin-bottom: 20px; }
                    .company-info h2 { margin: 0; color: #1e293b; }
                    .payslip-badge { background: #f1f5f9; padding: 5px 15px; border-radius: 5px; font-size: 12px; color: #64748b; }
                    .payslip-employee-info { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 20px; padding: 15px; background: #f8fafc; border-radius: 8px; }
                    .info-row { display: flex; gap: 10px; }
                    .info-row .label { color: #64748b; min-width: 120px; }
                    .info-row .value { font-weight: 500; }
                    .payslip-body { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px; }
                    .payslip-column h4 { margin: 0 0 10px; padding-bottom: 5px; border-bottom: 1px solid #e2e8f0; }
                    .payslip-line { display: flex; justify-content: space-between; padding: 5px 0; }
                    .payslip-line.total { border-top: 1px solid #e2e8f0; margin-top: 10px; padding-top: 10px; font-weight: 600; }
                    .payslip-employer { background: #f0fdf4; padding: 15px; border-radius: 8px; margin-bottom: 20px; }
                    .payslip-employer h4 { margin: 0 0 10px; color: #166534; }
                    .employer-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
                    .payslip-net { background: #1e293b; color: white; padding: 20px; border-radius: 8px; text-align: center; margin-bottom: 20px; }
                    .net-pay-label { font-size: 14px; margin-bottom: 5px; }
                    .net-pay-amount { font-size: 32px; font-weight: 700; }
                    .payslip-footer { text-align: center; color: #64748b; font-size: 12px; border-top: 1px solid #e2e8f0; padding-top: 15px; }
                    @media print { body { padding: 0; } }
                </style>
            </head>
            <body>${printContent}</body>
            </html>
        `);
        printWindow.document.close();
        printWindow.print();
    }, 300);
}

// ==================== STATS ====================
function updatePayrollStats() {
    const activeCount = employees.filter(e => e.status === 'active').length;
    const totalSalary = employees.filter(e => e.status === 'active').reduce((sum, e) => sum + (e.basicSalary || 0), 0);
    
    const currentMonth = new Date().toISOString().slice(0, 7);
    const thisMonthPayroll = payrollRecords.filter(p => p.month === currentMonth);
    const processedCount = thisMonthPayroll.length;
    const totalPaid = thisMonthPayroll.reduce((sum, p) => sum + (p.netSalary || 0), 0);
    
    const statElements = {
        'totalEmployees': activeCount,
        'totalMonthlySalary': formatCurrency(totalSalary),
        'processedThisMonth': `${processedCount}/${activeCount}`,
        'totalPaidThisMonth': formatCurrency(totalPaid)
    };
    
    Object.entries(statElements).forEach(([id, value]) => {
        const el = document.getElementById(id);
        if (el) el.textContent = value;
    });
}

// ==================== SALES REPORT ====================
function initializeSalesReport() {
    const select = document.getElementById('salesReportEmployee');
    if (select) {
        select.innerHTML = '<option value="">All Salespersons</option>' +
            employees.filter(e => e.status === 'active').map(e => 
                `<option value="${escapeHTML(e.name)}">${escapeHTML(e.name)}</option>`
            ).join('');
    }
    
    const monthInput = document.getElementById('salesReportMonth');
    if (monthInput && !monthInput.value) {
        monthInput.value = new Date().toISOString().slice(0, 7);
    }
    
    loadSalesReport();
}

function loadSalesReport() {
    const selectedEmployee = document.getElementById('salesReportEmployee')?.value || '';
    const selectedMonth = document.getElementById('salesReportMonth')?.value || '';
    
    const posSales = window.sales || JSON.parse(localStorage.getItem('ezcubic_sales') || '[]');
    const posReceipts = JSON.parse(localStorage.getItem('ezcubic_pos_receipts') || '[]');
    const orders = window.orders || JSON.parse(localStorage.getItem('ezcubic_orders') || '[]');
    const transactions = (businessData && businessData.transactions) ? businessData.transactions : JSON.parse(localStorage.getItem('ezcubic_transactions') || '[]');
    
    let allSales = [];
    
    if (Array.isArray(posSales)) {
        posSales.forEach(r => {
            allSales.push({
                date: r.date || r.timestamp,
                reference: r.receiptNo || r.id,
                customer: r.customerName || 'Walk-in',
                salesperson: r.salesperson || r.cashier || '',
                items: r.items?.length || 0,
                total: parseFloat(r.total) || 0,
                source: 'POS'
            });
        });
    }
    
    if (Array.isArray(posReceipts)) {
        posReceipts.forEach(r => {
            if (!allSales.find(s => s.reference === (r.receiptNo || r.id))) {
                allSales.push({
                    date: r.date || r.timestamp,
                    reference: r.receiptNo || r.id,
                    customer: r.customerName || 'Walk-in',
                    salesperson: r.salesperson || r.cashier || '',
                    items: r.items?.length || 0,
                    total: parseFloat(r.total) || 0,
                    source: 'POS'
                });
            }
        });
    }
    
    if (Array.isArray(orders)) {
        orders.forEach(o => {
            if (o.status === 'completed') {
                allSales.push({
                    date: o.date,
                    reference: o.orderNo || o.id,
                    customer: o.customerName || 'N/A',
                    salesperson: o.salesperson || '',
                    items: o.items?.length || 0,
                    total: parseFloat(o.total) || 0,
                    source: 'Order'
                });
            }
        });
    }
    
    if (Array.isArray(transactions)) {
        transactions.forEach(t => {
            if (t.type === 'income' && t.salesperson) {
                allSales.push({
                    date: t.date,
                    reference: t.reference || t.id,
                    customer: t.customer || t.description || 'N/A',
                    salesperson: t.salesperson,
                    items: 1,
                    total: parseFloat(t.amount) || 0,
                    source: 'Transaction'
                });
            }
        });
    }
    
    if (selectedEmployee) {
        allSales = allSales.filter(s => s.salesperson === selectedEmployee);
    }
    
    if (selectedMonth) {
        const [year, month] = selectedMonth.split('-');
        allSales = allSales.filter(s => {
            const saleDate = new Date(s.date);
            return saleDate.getFullYear() === parseInt(year) && 
                   (saleDate.getMonth() + 1) === parseInt(month);
        });
    }
    
    allSales.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    const totalSales = allSales.reduce((sum, s) => sum + s.total, 0);
    const totalCount = allSales.length;
    const avgSale = totalCount > 0 ? totalSales / totalCount : 0;
    
    let commission = 0;
    if (selectedEmployee && selectedMonth) {
        const employee = employees.find(e => e.name === selectedEmployee);
        if (employee) {
            commission = calculateEmployeeCommission(employee, totalSales, allSales, selectedMonth);
        }
    }
    
    document.getElementById('salesReportTotal').textContent = formatCurrency(totalSales);
    document.getElementById('salesReportCount').textContent = totalCount;
    document.getElementById('salesReportCommission').textContent = formatCurrency(commission);
    document.getElementById('salesReportAvg').textContent = formatCurrency(avgSale);
    
    const tbody = document.getElementById('salesReportBody');
    if (allSales.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" style="text-align: center; color: #64748b; padding: 40px;">
                    <i class="fas fa-chart-bar" style="font-size: 40px; margin-bottom: 15px; display: block; opacity: 0.3;"></i>
                    No sales found for the selected criteria
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = allSales.map(s => `
        <tr>
            <td>${formatDate(s.date)}</td>
            <td><code style="font-size: 12px; background: #f1f5f9; padding: 2px 6px; border-radius: 4px;">${escapeHTML(s.reference)}</code></td>
            <td>${escapeHTML(s.customer)}</td>
            <td>${escapeHTML(s.salesperson || '-')}</td>
            <td style="text-align: center;">${s.items}</td>
            <td style="text-align: right; font-weight: 600;">${formatCurrency(s.total)}</td>
            <td>
                <span class="source-badge ${s.source.toLowerCase()}" style="
                    padding: 2px 8px; 
                    border-radius: 4px; 
                    font-size: 11px;
                    background: ${s.source === 'POS' ? '#dbeafe' : s.source === 'Order' ? '#dcfce7' : '#fef3c7'};
                    color: ${s.source === 'POS' ? '#1d4ed8' : s.source === 'Order' ? '#166534' : '#92400e'};
                ">${s.source}</span>
            </td>
        </tr>
    `).join('');
}

function calculateEmployeeCommission(employee, totalSales, salesList, month) {
    if (!employee.commissionType || employee.commissionType === 'none') return 0;
    
    if (employee.commissionType === 'percentage') {
        return totalSales * (employee.commissionValue / 100);
    } else if (employee.commissionType === 'fixed') {
        return salesList.length > 0 ? (employee.commissionValue || 0) : 0;
    } else if (employee.commissionType === 'tiered' && employee.commissionTiers) {
        const result = calculateTieredCommission(totalSales, employee.commissionTiers);
        return result.commission;
    } else if (employee.commissionType === 'product' && employee.commissionRules) {
        return 0;
    }
    return 0;
}

function clearSalesReportFilters() {
    document.getElementById('salesReportEmployee').value = '';
    document.getElementById('salesReportMonth').value = '';
    loadSalesReport();
}

function exportSalesReport() {
    const selectedEmployee = document.getElementById('salesReportEmployee')?.value || 'All';
    const selectedMonth = document.getElementById('salesReportMonth')?.value || 'All Time';
    
    const table = document.getElementById('salesReportTable');
    const rows = table.querySelectorAll('tbody tr');
    
    if (rows.length === 0 || rows[0].cells.length === 1) {
        showNotification('No data to export', 'warning');
        return;
    }
    
    let csv = 'Date,Reference,Customer,Items,Total (RM),Source\n';
    
    rows.forEach(row => {
        const cells = row.querySelectorAll('td');
        if (cells.length >= 6) {
            csv += `"${cells[0].textContent}","${cells[1].textContent}","${cells[2].textContent}","${cells[3].textContent}","${cells[4].textContent.replace('RM ', '')}","${cells[5].textContent}"\n`;
        }
    });
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sales-report-${selectedEmployee}-${selectedMonth}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    
    showNotification('Sales report exported!', 'success');
}

function formatDate(dateStr) {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-MY', { day: '2-digit', month: 'short', year: 'numeric' });
}

function viewEmployeeSalesReport(employeeName) {
    document.getElementById('salesReportEmployee').value = employeeName;
    document.getElementById('salesReportMonth').value = new Date().toISOString().slice(0, 7);
    
    const tabs = document.querySelectorAll('#payroll .tabs:not(.secondary) .tab');
    tabs.forEach(t => t.classList.remove('active'));
    tabs[2].classList.add('active');
    
    document.getElementById('employeesSection').style.display = 'none';
    document.getElementById('payrollSection').style.display = 'none';
    document.getElementById('salesReportSection').style.display = 'block';
    document.getElementById('kpiSection').style.display = 'none';
    
    loadSalesReport();
}

// ==================== EXPORT TO WINDOW ====================
window.loadEmployees = loadEmployees;
window.viewEmployee = viewEmployee;
window.showProcessPayrollModal = showProcessPayrollModal;
window.closeProcessPayrollModal = closeProcessPayrollModal;
window.calculatePayrollPreview = calculatePayrollPreview;
window.processPayroll = processPayroll;
window.loadPayrollHistory = loadPayrollHistory;
window.markPayrollAsPaid = markPayrollAsPaid;
window.deletePayroll = deletePayroll;
window.showPayrollTab = showPayrollTab;
window.viewPayslip = viewPayslip;
window.printPayslip = printPayslip;
window.updatePayrollStats = updatePayrollStats;
window.initializeSalesReport = initializeSalesReport;
window.loadSalesReport = loadSalesReport;
window.clearSalesReportFilters = clearSalesReportFilters;
window.exportSalesReport = exportSalesReport;
window.viewEmployeeSalesReport = viewEmployeeSalesReport;
