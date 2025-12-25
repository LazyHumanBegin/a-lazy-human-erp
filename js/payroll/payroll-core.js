/**
 * PAYROLL-CORE.JS
 * Malaysian HR & Payroll System - Core
 * Constants, Data Management, Employee CRUD
 * Version: 2.2.7 - Modular Split - 26 Dec 2025
 */

// ==================== GLOBAL VARIABLES ====================
let employees = [];
let payrollRecords = [];
const EMPLOYEES_KEY = 'ezcubic_employees';
const PAYROLL_KEY = 'ezcubic_payroll';

// ==================== MALAYSIAN STATUTORY RATES (2024/2025) ====================
const STATUTORY_RATES = {
    // EPF (KWSP) Rates
    EPF: {
        employeeRate: 0.11,        // 11% employee contribution
        employerRateBelow60: 0.13, // 13% employer (age < 60)
        employerRate60Above: 0.065, // 6.5% employer (age >= 60)
        maxWage: 20000             // Max salary for EPF calculation
    },
    
    // SOCSO (PERKESO) - Employment Injury Scheme + Invalidity Scheme
    SOCSO: {
        employeeRate: 0.005,       // ~0.5% employee
        employerRate: 0.0175,      // ~1.75% employer
        maxWage: 5000              // Max wage for SOCSO
    },
    
    // EIS (Employment Insurance System)
    EIS: {
        employeeRate: 0.002,       // 0.2% employee
        employerRate: 0.002,       // 0.2% employer
        maxWage: 5000              // Max wage for EIS
    }
};

// PCB (MTD) Tax Brackets 2024 (Simplified Monthly Calculation)
const PCB_BRACKETS = [
    { min: 0, max: 5000, rate: 0, deduct: 0 },
    { min: 5001, max: 20000, rate: 0.01, deduct: 0 },
    { min: 20001, max: 35000, rate: 0.03, deduct: 400 },
    { min: 35001, max: 50000, rate: 0.06, deduct: 1450 },
    { min: 50001, max: 70000, rate: 0.11, deduct: 3950 },
    { min: 70001, max: 100000, rate: 0.19, deduct: 9550 },
    { min: 100001, max: 400000, rate: 0.25, deduct: 15550 },
    { min: 400001, max: 600000, rate: 0.26, deduct: 19550 },
    { min: 600001, max: 2000000, rate: 0.28, deduct: 31550 },
    { min: 2000001, max: Infinity, rate: 0.30, deduct: 71550 }
];

// SOCSO Contribution Table (Simplified - actual uses categories)
const SOCSO_TABLE = [
    { maxWage: 30, employee: 0.10, employer: 0.40 },
    { maxWage: 50, employee: 0.20, employer: 0.70 },
    { maxWage: 70, employee: 0.30, employer: 1.00 },
    { maxWage: 100, employee: 0.40, employer: 1.40 },
    { maxWage: 140, employee: 0.60, employer: 1.90 },
    { maxWage: 200, employee: 0.85, employer: 2.65 },
    { maxWage: 300, employee: 1.25, employer: 3.95 },
    { maxWage: 400, employee: 1.75, employer: 5.45 },
    { maxWage: 500, employee: 2.25, employer: 6.95 },
    { maxWage: 600, employee: 2.75, employer: 8.45 },
    { maxWage: 700, employee: 3.25, employer: 9.95 },
    { maxWage: 800, employee: 3.75, employer: 11.45 },
    { maxWage: 900, employee: 4.25, employer: 12.95 },
    { maxWage: 1000, employee: 4.75, employer: 14.45 },
    { maxWage: 1100, employee: 5.25, employer: 15.95 },
    { maxWage: 1200, employee: 5.75, employer: 17.45 },
    { maxWage: 1300, employee: 6.25, employer: 18.95 },
    { maxWage: 1400, employee: 6.75, employer: 20.45 },
    { maxWage: 1500, employee: 7.25, employer: 21.95 },
    { maxWage: 1600, employee: 7.75, employer: 23.45 },
    { maxWage: 1700, employee: 8.25, employer: 24.95 },
    { maxWage: 1800, employee: 8.75, employer: 26.45 },
    { maxWage: 1900, employee: 9.25, employer: 27.95 },
    { maxWage: 2000, employee: 9.75, employer: 29.45 },
    { maxWage: 2100, employee: 10.25, employer: 30.95 },
    { maxWage: 2200, employee: 10.75, employer: 32.45 },
    { maxWage: 2300, employee: 11.25, employer: 33.95 },
    { maxWage: 2400, employee: 11.75, employer: 35.45 },
    { maxWage: 2500, employee: 12.25, employer: 36.95 },
    { maxWage: 2600, employee: 12.75, employer: 38.45 },
    { maxWage: 2700, employee: 13.25, employer: 39.95 },
    { maxWage: 2800, employee: 13.75, employer: 41.45 },
    { maxWage: 2900, employee: 14.25, employer: 42.95 },
    { maxWage: 3000, employee: 14.75, employer: 44.45 },
    { maxWage: 3100, employee: 15.25, employer: 45.95 },
    { maxWage: 3200, employee: 15.75, employer: 47.45 },
    { maxWage: 3300, employee: 16.25, employer: 48.95 },
    { maxWage: 3400, employee: 16.75, employer: 50.45 },
    { maxWage: 3500, employee: 17.25, employer: 51.95 },
    { maxWage: 3600, employee: 17.75, employer: 53.45 },
    { maxWage: 3700, employee: 18.25, employer: 54.95 },
    { maxWage: 3800, employee: 18.75, employer: 56.45 },
    { maxWage: 3900, employee: 19.25, employer: 57.95 },
    { maxWage: 4000, employee: 19.75, employer: 59.45 },
    { maxWage: 4100, employee: 20.25, employer: 60.95 },
    { maxWage: 4200, employee: 20.75, employer: 62.45 },
    { maxWage: 4300, employee: 21.25, employer: 63.95 },
    { maxWage: 4400, employee: 21.75, employer: 65.45 },
    { maxWage: 4500, employee: 22.25, employer: 66.95 },
    { maxWage: 4600, employee: 22.75, employer: 68.45 },
    { maxWage: 4700, employee: 23.25, employer: 69.95 },
    { maxWage: 4800, employee: 23.75, employer: 71.45 },
    { maxWage: 4900, employee: 24.25, employer: 72.95 },
    { maxWage: 5000, employee: 24.75, employer: 74.45 }
];

// ==================== INITIALIZE ====================
function initializePayroll() {
    loadEmployeesData();
    loadPayrollData();
    loadEmployees();
    loadPayrollHistory();
    updatePayrollStats();
}

function loadEmployeesData() {
    const windowEmployees = window.employees || [];
    const localStorageEmployees = JSON.parse(localStorage.getItem(EMPLOYEES_KEY) || '[]');
    
    if (windowEmployees.length > 0) {
        employees = windowEmployees;
        console.log('Loaded employees from window.employees:', employees.length);
    } else if (localStorageEmployees.length > 0) {
        employees = localStorageEmployees;
        console.log('Loaded employees from localStorage:', employees.length);
        window.employees = employees;
    } else {
        employees = [];
        console.log('No employees found in any source');
    }
    
    window.employees = employees;
}

function saveEmployeesData() {
    window.employees = employees;
    localStorage.setItem(EMPLOYEES_KEY, JSON.stringify(employees));
    if (typeof saveToUserTenant === 'function') {
        saveToUserTenant();
    }
}

function loadPayrollData() {
    const stored = localStorage.getItem(PAYROLL_KEY);
    if (stored) {
        payrollRecords = JSON.parse(stored);
    }
}

function savePayrollData() {
    window.payrollRecords = payrollRecords;
    localStorage.setItem(PAYROLL_KEY, JSON.stringify(payrollRecords));
    if (typeof saveToUserTenant === 'function') {
        saveToUserTenant();
    }
}

// Export employees array for KPI module access
window.getEmployees = () => employees;

// ==================== EMPLOYEE MODAL ====================
function showEmployeeModal(employeeId = null) {
    const modal = document.getElementById('employeeModal');
    const title = document.getElementById('employeeModalTitle');
    const form = document.getElementById('employeeForm');
    
    if (employeeId) {
        const employee = employees.find(e => e.id === employeeId);
        if (employee) {
            title.textContent = 'Edit Employee';
            document.getElementById('employeeId').value = employee.id;
            document.getElementById('empName').value = employee.name || '';
            document.getElementById('empIC').value = employee.ic || '';
            document.getElementById('empEmail').value = employee.email || '';
            document.getElementById('empPhone').value = employee.phone || '';
            document.getElementById('empAddress').value = employee.address || '';
            document.getElementById('empDepartment').value = employee.department || '';
            document.getElementById('empPosition').value = employee.position || '';
            document.getElementById('empType').value = employee.employmentType || 'full-time';
            document.getElementById('empStartDate').value = employee.startDate || '';
            document.getElementById('empBasicSalary').value = employee.basicSalary || '';
            document.getElementById('empBankName').value = employee.bankName || '';
            document.getElementById('empBankAccount').value = employee.bankAccount || '';
            document.getElementById('empEPFNo').value = employee.epfNo || '';
            document.getElementById('empSOCSONo').value = employee.socsoNo || '';
            document.getElementById('empTaxNo').value = employee.taxNo || '';
            document.getElementById('empStatus').value = employee.status || 'active';
            
            const posAccountTypeEl = document.getElementById('empPosAccountType');
            if (posAccountTypeEl) posAccountTypeEl.value = employee.posAccountType || 'staff';
            
            document.getElementById('empHasEPF').checked = employee.hasEPF !== false;
            document.getElementById('empHasSOCSO').checked = employee.hasSOCSO !== false;
            document.getElementById('empHasEIS').checked = employee.hasEIS !== false;
            document.getElementById('empHasPCB').checked = employee.hasPCB !== false;
            
            document.getElementById('empCommissionType').value = employee.commissionType || 'none';
            document.getElementById('empCommissionValue').value = employee.commissionValue || '';
            document.getElementById('commissionRulesContainer').innerHTML = '';
            document.getElementById('commissionTiersContainer').innerHTML = '';
            toggleCommissionFields();
            
            if (employee.commissionType === 'product' && employee.commissionRules) {
                loadCommissionRules(employee.commissionRules);
            }
            if (employee.commissionType === 'tiered' && employee.commissionTiers) {
                loadCommissionTiers(employee.commissionTiers);
            }
        }
    } else {
        title.textContent = 'Add New Employee';
        form.reset();
        document.getElementById('employeeId').value = '';
        document.getElementById('empStartDate').value = new Date().toISOString().split('T')[0];
        document.getElementById('empStatus').value = 'active';
        
        const posAccountTypeEl = document.getElementById('empPosAccountType');
        if (posAccountTypeEl) posAccountTypeEl.value = 'staff';
        
        document.getElementById('empHasEPF').checked = true;
        document.getElementById('empHasSOCSO').checked = true;
        document.getElementById('empHasEIS').checked = true;
        document.getElementById('empHasPCB').checked = true;
        
        document.getElementById('empCommissionType').value = 'none';
        document.getElementById('empCommissionValue').value = '';
        document.getElementById('commissionRulesContainer').innerHTML = '';
        document.getElementById('commissionTiersContainer').innerHTML = '';
        toggleCommissionFields();
    }
    
    modal.style.display = 'flex';
}

function closeEmployeeModal() {
    document.getElementById('employeeModal').style.display = 'none';
}

function saveEmployee() {
    const id = document.getElementById('employeeId').value;
    const name = document.getElementById('empName').value.trim();
    const ic = document.getElementById('empIC').value.trim();
    const basicSalary = parseFloat(document.getElementById('empBasicSalary').value) || 0;
    
    if (!name || !ic || basicSalary <= 0) {
        showNotification('Please fill in Name, IC Number, and Basic Salary', 'error');
        return;
    }
    
    const commissionType = document.getElementById('empCommissionType').value;
    
    const employeeData = {
        id: id || generateUniqueId(),
        name: name,
        ic: ic,
        email: document.getElementById('empEmail').value.trim(),
        phone: document.getElementById('empPhone').value.trim(),
        address: document.getElementById('empAddress').value.trim(),
        department: document.getElementById('empDepartment').value.trim(),
        position: document.getElementById('empPosition').value.trim(),
        employmentType: document.getElementById('empType').value,
        posAccountType: document.getElementById('empPosAccountType')?.value || 'staff',
        startDate: document.getElementById('empStartDate').value,
        basicSalary: basicSalary,
        bankName: document.getElementById('empBankName').value.trim(),
        bankAccount: document.getElementById('empBankAccount').value.trim(),
        epfNo: document.getElementById('empEPFNo').value.trim(),
        socsoNo: document.getElementById('empSOCSONo').value.trim(),
        taxNo: document.getElementById('empTaxNo').value.trim(),
        hasEPF: document.getElementById('empHasEPF').checked,
        hasSOCSO: document.getElementById('empHasSOCSO').checked,
        hasEIS: document.getElementById('empHasEIS').checked,
        hasPCB: document.getElementById('empHasPCB').checked,
        commissionType: commissionType,
        commissionValue: parseFloat(document.getElementById('empCommissionValue').value) || 0,
        commissionRules: commissionType === 'product' ? getCommissionRules() : [],
        commissionTiers: commissionType === 'tiered' ? getCommissionTiers() : [],
        status: document.getElementById('empStatus').value,
        createdAt: id ? employees.find(e => e.id === id)?.createdAt : new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };
    
    if (!Array.isArray(employees)) {
        console.warn('employees was not an array, reinitializing');
        employees = window.employees || [];
        if (!Array.isArray(employees)) {
            employees = [];
        }
    }
    
    if (id) {
        const index = employees.findIndex(e => e.id === id);
        if (index !== -1) {
            employees[index] = employeeData;
        }
    } else {
        employees.push(employeeData);
    }
    
    window.employees = employees;
    
    saveEmployeesData();
    closeEmployeeModal();
    loadEmployees();
    updatePayrollStats();
    showNotification(id ? 'Employee updated successfully!' : 'Employee added successfully!', 'success');
}

function editEmployee(employeeId) {
    showEmployeeModal(employeeId);
}

function deleteEmployee(employeeId) {
    const employee = employees.find(e => e.id === employeeId);
    if (!employee) return;
    
    if (confirm(`Are you sure you want to delete ${employee.name}? This cannot be undone.`)) {
        employees = employees.filter(e => e.id !== employeeId);
        saveEmployeesData();
        loadEmployees();
        updatePayrollStats();
        showNotification('Employee deleted', 'success');
    }
}

function filterEmployees() {
    loadEmployees();
}

// ==================== EXPORT TO WINDOW ====================
window.employees = employees;
window.payrollRecords = payrollRecords;
window.EMPLOYEES_KEY = EMPLOYEES_KEY;
window.PAYROLL_KEY = PAYROLL_KEY;
window.STATUTORY_RATES = STATUTORY_RATES;
window.PCB_BRACKETS = PCB_BRACKETS;
window.SOCSO_TABLE = SOCSO_TABLE;

window.initializePayroll = initializePayroll;
window.loadEmployeesData = loadEmployeesData;
window.saveEmployeesData = saveEmployeesData;
window.loadPayrollData = loadPayrollData;
window.savePayrollData = savePayrollData;
window.showEmployeeModal = showEmployeeModal;
window.closeEmployeeModal = closeEmployeeModal;
window.saveEmployee = saveEmployee;
window.editEmployee = editEmployee;
window.deleteEmployee = deleteEmployee;
window.filterEmployees = filterEmployees;
