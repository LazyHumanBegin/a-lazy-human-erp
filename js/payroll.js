// ==================== PAYROLL.JS ====================
// Malaysian HR & Payroll System
// EPF, SOCSO, EIS, PCB Calculations

// ==================== GLOBAL VARIABLES ====================
let employees = [];
let payrollRecords = [];
const EMPLOYEES_KEY = 'ezcubic_employees';
const PAYROLL_KEY = 'ezcubic_payroll';

// ==================== EXPORT FUNCTIONS ====================
window.initializePayroll = initializePayroll;
window.showEmployeeModal = showEmployeeModal;
window.closeEmployeeModal = closeEmployeeModal;
window.saveEmployee = saveEmployee;
window.loadEmployees = loadEmployees;
window.viewEmployee = viewEmployee;
window.editEmployee = editEmployee;
window.deleteEmployee = deleteEmployee;
window.showProcessPayrollModal = showProcessPayrollModal;
window.closeProcessPayrollModal = closeProcessPayrollModal;
window.processPayroll = processPayroll;
window.calculatePayrollPreview = calculatePayrollPreview;
window.loadPayrollHistory = loadPayrollHistory;
window.viewPayslip = viewPayslip;
window.printPayslip = printPayslip;
window.markPayrollAsPaid = markPayrollAsPaid;
window.deletePayroll = deletePayroll;
window.filterEmployees = filterEmployees;
window.showPayrollTab = showPayrollTab;
window.toggleCommissionFields = toggleCommissionFields;
window.onPayrollEmployeeChange = onPayrollEmployeeChange;
window.calculateAutoCommission = calculateAutoCommission;
window.addCommissionRule = addCommissionRule;
window.removeCommissionRule = removeCommissionRule;
window.addCommissionTier = addCommissionTier;
window.removeCommissionTier = removeCommissionTier;
// Sales Report functions
window.initializeSalesReport = initializeSalesReport;
window.loadSalesReport = loadSalesReport;
window.clearSalesReportFilters = clearSalesReportFilters;
window.exportSalesReport = exportSalesReport;
window.viewEmployeeSalesReport = viewEmployeeSalesReport;

// Export employees array for KPI module access
window.getEmployees = () => employees;

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
    // Using simplified rates - actual SOCSO uses wage categories
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
    // Check multiple sources for employee data and use the one with data
    const windowEmployees = window.employees || [];
    const localStorageEmployees = JSON.parse(localStorage.getItem(EMPLOYEES_KEY) || '[]');
    
    // Use whichever source has data (prefer window.employees from tenant load)
    if (windowEmployees.length > 0) {
        employees = windowEmployees;
        console.log('Loaded employees from window.employees:', employees.length);
    } else if (localStorageEmployees.length > 0) {
        employees = localStorageEmployees;
        console.log('Loaded employees from localStorage:', employees.length);
        // Sync to window for tenant save
        window.employees = employees;
    } else {
        employees = [];
        console.log('No employees found in any source');
    }
    
    // Ensure window.employees is always in sync
    window.employees = employees;
}

function saveEmployeesData() {
    // Update window.employees to ensure tenant save gets latest data
    window.employees = employees;
    localStorage.setItem(EMPLOYEES_KEY, JSON.stringify(employees));
    // Also save to tenant storage for multi-tenant isolation
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
    // Update window.payrollRecords to ensure tenant save gets latest data
    window.payrollRecords = payrollRecords;
    localStorage.setItem(PAYROLL_KEY, JSON.stringify(payrollRecords));
    // Also save to tenant storage for multi-tenant isolation
    if (typeof saveToUserTenant === 'function') {
        saveToUserTenant();
    }
}

// ==================== EMPLOYEE MANAGEMENT ====================
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
            // POS Account Type
            const posAccountTypeEl = document.getElementById('empPosAccountType');
            if (posAccountTypeEl) posAccountTypeEl.value = employee.posAccountType || 'staff';
            // Statutory flags (default to true for existing employees without flags)
            document.getElementById('empHasEPF').checked = employee.hasEPF !== false;
            document.getElementById('empHasSOCSO').checked = employee.hasSOCSO !== false;
            document.getElementById('empHasEIS').checked = employee.hasEIS !== false;
            document.getElementById('empHasPCB').checked = employee.hasPCB !== false;
            // Commission settings
            document.getElementById('empCommissionType').value = employee.commissionType || 'none';
            document.getElementById('empCommissionValue').value = employee.commissionValue || '';
            // Clear containers first
            document.getElementById('commissionRulesContainer').innerHTML = '';
            document.getElementById('commissionTiersContainer').innerHTML = '';
            toggleCommissionFields();
            // Load commission rules if product-based
            if (employee.commissionType === 'product' && employee.commissionRules) {
                loadCommissionRules(employee.commissionRules);
            }
            // Load commission tiers if tiered
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
        // POS Account Type default
        const posAccountTypeEl = document.getElementById('empPosAccountType');
        if (posAccountTypeEl) posAccountTypeEl.value = 'staff';
        // Set default statutory flags (all checked)
        document.getElementById('empHasEPF').checked = true;
        document.getElementById('empHasSOCSO').checked = true;
        document.getElementById('empHasEIS').checked = true;
        document.getElementById('empHasPCB').checked = true;
        // Default commission
        document.getElementById('empCommissionType').value = 'none';
        document.getElementById('empCommissionValue').value = '';
        document.getElementById('commissionRulesContainer').innerHTML = '';
        document.getElementById('commissionTiersContainer').innerHTML = '';
        toggleCommissionFields();
    }
    
    modal.style.display = 'flex';
}

// Toggle commission value field visibility
function toggleCommissionFields() {
    const commissionType = document.getElementById('empCommissionType').value;
    const valueGroup = document.getElementById('commissionValueGroup');
    const valueLabel = document.getElementById('commissionValueLabel');
    const productSection = document.getElementById('productCommissionSection');
    const tieredSection = document.getElementById('tieredCommissionSection');
    
    // Hide all first
    valueGroup.style.display = 'none';
    productSection.style.display = 'none';
    tieredSection.style.display = 'none';
    
    if (commissionType === 'percentage') {
        valueGroup.style.display = 'block';
        valueLabel.textContent = 'Commission Rate (%)';
        document.getElementById('empCommissionValue').placeholder = 'e.g., 5 for 5%';
    } else if (commissionType === 'fixed') {
        valueGroup.style.display = 'block';
        valueLabel.textContent = 'Fixed Commission (RM)';
        document.getElementById('empCommissionValue').placeholder = 'e.g., 500';
    } else if (commissionType === 'tiered') {
        tieredSection.style.display = 'block';
        // Add default tiers if empty
        const container = document.getElementById('commissionTiersContainer');
        if (container.children.length === 0) {
            addCommissionTier(0, 50000, 5);
            addCommissionTier(50001, 100000, 10);
            addCommissionTier(100001, null, 15);
        }
    } else if (commissionType === 'product') {
        productSection.style.display = 'block';
        // Add default rule if empty
        const container = document.getElementById('commissionRulesContainer');
        if (container.children.length === 0) {
            addCommissionRule();
        }
    }
}

// ==================== TIERED COMMISSION ====================
function addCommissionTier(minVal = '', maxVal = '', rate = '') {
    const container = document.getElementById('commissionTiersContainer');
    const tierId = generateUniqueId();
    
    const tierHtml = `
        <div class="commission-tier-row" data-tier-id="${tierId}" style="display: grid; grid-template-columns: 1fr 1fr 100px 40px; gap: 10px; align-items: center; padding: 10px; background: #f8fafc; border-radius: 8px; margin-bottom: 8px;">
            <input type="number" class="form-control tier-min" value="${minVal}" min="0" step="1" placeholder="0">
            <input type="number" class="form-control tier-max" value="${maxVal || ''}" min="0" step="1" placeholder="No limit">
            <div style="display: flex; align-items: center; gap: 5px;">
                <input type="number" class="form-control tier-rate" value="${rate}" min="0" max="100" step="0.1" placeholder="5">
                <span style="color: #64748b;">%</span>
            </div>
            <button type="button" class="btn-icon danger" onclick="removeCommissionTier('${tierId}')" title="Remove">
                <i class="fas fa-trash"></i>
            </button>
        </div>
    `;
    
    container.insertAdjacentHTML('beforeend', tierHtml);
}

function removeCommissionTier(tierId) {
    const row = document.querySelector(`[data-tier-id="${tierId}"]`);
    if (row) row.remove();
}

// Get commission tiers from form
function getCommissionTiers() {
    const tiers = [];
    const rows = document.querySelectorAll('.commission-tier-row');
    
    rows.forEach(row => {
        const min = parseFloat(row.querySelector('.tier-min').value) || 0;
        const maxInput = row.querySelector('.tier-max').value;
        const max = maxInput ? parseFloat(maxInput) : Infinity;
        const rate = parseFloat(row.querySelector('.tier-rate').value) || 0;
        
        if (rate > 0) {
            tiers.push({ min, max, rate });
        }
    });
    
    // Sort by min value
    tiers.sort((a, b) => a.min - b.min);
    
    return tiers;
}

// Load commission tiers into form
function loadCommissionTiers(tiers) {
    const container = document.getElementById('commissionTiersContainer');
    container.innerHTML = '';
    
    if (!tiers || tiers.length === 0) {
        addCommissionTier(0, 50000, 5);
        addCommissionTier(50001, 100000, 10);
        addCommissionTier(100001, null, 15);
        return;
    }
    
    tiers.forEach(tier => {
        addCommissionTier(tier.min, tier.max === Infinity ? '' : tier.max, tier.rate);
    });
}

// Calculate tiered commission
function calculateTieredCommission(totalSales, tiers) {
    if (!tiers || tiers.length === 0) return { commission: 0, tier: null };
    
    // Find the matching tier
    for (const tier of tiers) {
        if (totalSales >= tier.min && totalSales <= (tier.max || Infinity)) {
            return {
                commission: totalSales * (tier.rate / 100),
                tier: tier,
                rate: tier.rate
            };
        }
    }
    
    // Default to last tier if sales exceed all
    const lastTier = tiers[tiers.length - 1];
    return {
        commission: totalSales * (lastTier.rate / 100),
        tier: lastTier,
        rate: lastTier.rate
    };
}

// Add commission rule row
function addCommissionRule() {
    const container = document.getElementById('commissionRulesContainer');
    const ruleId = generateUniqueId();
    
    // Get products from inventory
    const inventory = JSON.parse(localStorage.getItem('ezcubic_inventory') || '[]');
    const productOptions = inventory.map(p => 
        `<option value="${p.id}">${escapeHTML(p.name)}</option>`
    ).join('');
    
    // Get unique categories
    const categories = [...new Set(inventory.map(p => p.category).filter(c => c))];
    const categoryOptions = categories.map(c => 
        `<option value="cat_${c}">${escapeHTML(c)} (Category)</option>`
    ).join('');
    
    const ruleHtml = `
        <div class="commission-rule-row" data-rule-id="${ruleId}" style="display: flex; gap: 10px; align-items: center; padding: 10px; background: #f8fafc; border-radius: 8px; margin-bottom: 8px;">
            <select class="form-control rule-type" style="width: 120px;" onchange="updateRuleOptions(this)">
                <option value="product">Product</option>
                <option value="category">Category</option>
                <option value="all">All Sales</option>
            </select>
            <select class="form-control rule-target" style="flex: 1;">
                <option value="">Select Product</option>
                ${productOptions}
                <optgroup label="Categories">
                    ${categoryOptions}
                </optgroup>
            </select>
            <select class="form-control rule-calc-type" style="width: 100px;" onchange="updateRuleValueLabel(this)">
                <option value="per_unit">Per Unit</option>
                <option value="percentage">% of Sale</option>
            </select>
            <div style="display: flex; align-items: center; gap: 5px;">
                <span class="rule-currency">RM</span>
                <input type="number" class="form-control rule-value" style="width: 80px;" step="0.01" min="0" placeholder="1.00">
            </div>
            <button type="button" class="btn-icon danger" onclick="removeCommissionRule('${ruleId}')" title="Remove">
                <i class="fas fa-trash"></i>
            </button>
        </div>
    `;
    
    container.insertAdjacentHTML('beforeend', ruleHtml);
}

// Update rule options based on type
window.updateRuleOptions = function(select) {
    const row = select.closest('.commission-rule-row');
    const targetSelect = row.querySelector('.rule-target');
    const type = select.value;
    
    const inventory = JSON.parse(localStorage.getItem('ezcubic_inventory') || '[]');
    
    if (type === 'product') {
        const productOptions = inventory.map(p => 
            `<option value="${p.id}">${escapeHTML(p.name)}</option>`
        ).join('');
        targetSelect.innerHTML = `<option value="">Select Product</option>${productOptions}`;
        targetSelect.style.display = 'block';
    } else if (type === 'category') {
        const categories = [...new Set(inventory.map(p => p.category).filter(c => c))];
        const categoryOptions = categories.map(c => 
            `<option value="${c}">${escapeHTML(c)}</option>`
        ).join('');
        targetSelect.innerHTML = `<option value="">Select Category</option>${categoryOptions}`;
        targetSelect.style.display = 'block';
    } else {
        // All sales
        targetSelect.innerHTML = '<option value="all">All Products</option>';
        targetSelect.value = 'all';
    }
};

// Update value label (RM vs %)
window.updateRuleValueLabel = function(select) {
    const row = select.closest('.commission-rule-row');
    const currencyLabel = row.querySelector('.rule-currency');
    currencyLabel.textContent = select.value === 'percentage' ? '%' : 'RM';
};

// Remove commission rule
function removeCommissionRule(ruleId) {
    const row = document.querySelector(`[data-rule-id="${ruleId}"]`);
    if (row) row.remove();
}

// Get commission rules from form
function getCommissionRules() {
    const rules = [];
    const rows = document.querySelectorAll('.commission-rule-row');
    
    rows.forEach(row => {
        const type = row.querySelector('.rule-type').value;
        const target = row.querySelector('.rule-target').value;
        const calcType = row.querySelector('.rule-calc-type').value;
        const value = parseFloat(row.querySelector('.rule-value').value) || 0;
        
        if (target && value > 0) {
            rules.push({ type, target, calcType, value });
        }
    });
    
    return rules;
}

// Load commission rules into form
function loadCommissionRules(rules) {
    const container = document.getElementById('commissionRulesContainer');
    container.innerHTML = '';
    
    if (!rules || rules.length === 0) {
        addCommissionRule();
        return;
    }
    
    rules.forEach(rule => {
        addCommissionRule();
        const rows = container.querySelectorAll('.commission-rule-row');
        const row = rows[rows.length - 1];
        
        row.querySelector('.rule-type').value = rule.type;
        updateRuleOptions(row.querySelector('.rule-type'));
        row.querySelector('.rule-target').value = rule.target;
        row.querySelector('.rule-calc-type').value = rule.calcType;
        row.querySelector('.rule-value').value = rule.value;
        updateRuleValueLabel(row.querySelector('.rule-calc-type'));
    });
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
        // Statutory contribution flags
        hasEPF: document.getElementById('empHasEPF').checked,
        hasSOCSO: document.getElementById('empHasSOCSO').checked,
        hasEIS: document.getElementById('empHasEIS').checked,
        hasPCB: document.getElementById('empHasPCB').checked,
        // Commission settings
        commissionType: commissionType,
        commissionValue: parseFloat(document.getElementById('empCommissionValue').value) || 0,
        commissionRules: commissionType === 'product' ? getCommissionRules() : [],
        commissionTiers: commissionType === 'tiered' ? getCommissionTiers() : [],
        status: document.getElementById('empStatus').value,
        createdAt: id ? employees.find(e => e.id === id)?.createdAt : new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };
    
    // Ensure employees is an array before operations
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
    
    // Keep window.employees in sync
    window.employees = employees;
    
    saveEmployeesData();
    closeEmployeeModal();
    loadEmployees();
    updatePayrollStats();
    showNotification(id ? 'Employee updated successfully!' : 'Employee added successfully!', 'success');
}

function loadEmployees() {
    // Sync from window.employees or localStorage - check both sources
    const windowEmployees = window.employees || [];
    const stored = localStorage.getItem(EMPLOYEES_KEY);
    let localStorageEmployees = [];
    try {
        localStorageEmployees = JSON.parse(stored) || [];
    } catch (e) {
        localStorageEmployees = [];
    }
    
    // Use whichever has data, prefer tenant data (window)
    if (windowEmployees.length > 0) {
        employees = windowEmployees;
    } else if (localStorageEmployees.length > 0) {
        employees = localStorageEmployees;
        window.employees = employees; // Sync back
    }
    // Keep employees in sync with window
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
    
    // Populate department filter
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

function filterEmployees() {
    loadEmployees();
}

function viewEmployee(employeeId) {
    const employee = employees.find(e => e.id === employeeId);
    if (!employee) return;
    
    const modal = document.getElementById('employeeDetailModal');
    const content = document.getElementById('employeeDetailContent');
    
    // Calculate age from IC
    const birthYear = parseInt('19' + employee.ic.substring(0, 2));
    const currentYear = new Date().getFullYear();
    const age = currentYear - birthYear;
    
    // Calculate years of service
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

// ==================== PAYROLL CALCULATIONS ====================
function calculateEPF(basicSalary, age = 30) {
    const cappedSalary = Math.min(basicSalary, STATUTORY_RATES.EPF.maxWage);
    const employeeContribution = Math.round(cappedSalary * STATUTORY_RATES.EPF.employeeRate);
    const employerRate = age >= 60 ? STATUTORY_RATES.EPF.employerRate60Above : STATUTORY_RATES.EPF.employerRateBelow60;
    const employerContribution = Math.round(cappedSalary * employerRate);
    
    return {
        employee: employeeContribution,
        employer: employerContribution
    };
}

function calculateSOCSO(basicSalary) {
    if (basicSalary > 5000) {
        // Use max category
        return { employee: 24.75, employer: 74.45 };
    }
    
    // Find the appropriate wage category
    for (const category of SOCSO_TABLE) {
        if (basicSalary <= category.maxWage) {
            return {
                employee: category.employee,
                employer: category.employer
            };
        }
    }
    
    // Default to max if not found
    return { employee: 24.75, employer: 74.45 };
}

function calculateEIS(basicSalary) {
    const cappedSalary = Math.min(basicSalary, STATUTORY_RATES.EIS.maxWage);
    return {
        employee: Math.round(cappedSalary * STATUTORY_RATES.EIS.employeeRate * 100) / 100,
        employer: Math.round(cappedSalary * STATUTORY_RATES.EIS.employerRate * 100) / 100
    };
}

function calculatePCB(annualIncome, epfContribution = 0) {
    // Simplified PCB calculation
    // Actual PCB requires more complex calculation with relief claims
    
    // Apply EPF relief (max RM4,000/year)
    const epfRelief = Math.min(epfContribution * 12, 4000);
    const taxableIncome = annualIncome - epfRelief - 9000; // Basic personal relief RM9,000
    
    if (taxableIncome <= 0) return 0;
    
    let annualTax = 0;
    for (const bracket of PCB_BRACKETS) {
        if (taxableIncome >= bracket.min && taxableIncome <= bracket.max) {
            annualTax = (taxableIncome * bracket.rate) - bracket.deduct;
            break;
        }
    }
    
    // Monthly PCB (divide by 12)
    return Math.max(0, Math.round(annualTax / 12 * 100) / 100);
}

function calculateFullPayroll(employee, allowances = 0, overtime = 0, deductions = 0, commission = 0) {
    const basicSalary = employee.basicSalary || 0;
    const grossSalary = basicSalary + allowances + overtime + commission;
    
    // Get age from IC
    const birthYear = parseInt('19' + employee.ic.substring(0, 2));
    const age = new Date().getFullYear() - birthYear;
    
    // Calculate statutory deductions based on employee flags
    const hasEPF = employee.hasEPF !== false;
    const hasSOCSO = employee.hasSOCSO !== false;
    const hasEIS = employee.hasEIS !== false;
    const hasPCB = employee.hasPCB !== false;
    
    const epf = hasEPF ? calculateEPF(basicSalary, age) : { employee: 0, employer: 0 };
    const socso = hasSOCSO ? calculateSOCSO(basicSalary) : { employee: 0, employer: 0 };
    const eis = hasEIS ? calculateEIS(basicSalary) : { employee: 0, employer: 0 };
    const pcb = hasPCB ? calculatePCB(basicSalary * 12, epf.employee) : 0;
    
    const totalEmployeeDeductions = epf.employee + socso.employee + eis.employee + pcb + deductions;
    const netSalary = grossSalary - totalEmployeeDeductions;
    
    const totalEmployerContributions = epf.employer + socso.employer + eis.employer;
    const totalCostToCompany = grossSalary + totalEmployerContributions;
    
    return {
        basicSalary,
        allowances,
        overtime,
        commission,
        grossSalary,
        epfEmployee: epf.employee,
        epfEmployer: epf.employer,
        socsoEmployee: socso.employee,
        socsoEmployer: socso.employer,
        eisEmployee: eis.employee,
        eisEmployer: eis.employer,
        pcb,
        otherDeductions: deductions,
        totalDeductions: totalEmployeeDeductions,
        netSalary,
        totalEmployerContributions,
        totalCostToCompany,
        // Include flags in result for display
        hasEPF,
        hasSOCSO,
        hasEIS,
        hasPCB
    };
}

// ==================== COMMISSION CALCULATION ====================
function onPayrollEmployeeChange() {
    calculateAutoCommission();
    calculatePayrollPreview();
}

function calculateAutoCommission() {
    const employeeId = document.getElementById('payrollEmployee').value;
    const payrollMonth = document.getElementById('payrollMonth').value;
    const commissionInfo = document.getElementById('commissionInfo');
    const commissionField = document.getElementById('payrollCommission');
    
    if (!employeeId || !payrollMonth) {
        if (commissionInfo) commissionInfo.innerHTML = '';
        return;
    }
    
    const employee = employees.find(e => e.id === employeeId);
    if (!employee) return;
    
    // Check if employee has commission settings
    if (employee.commissionType === 'none' || !employee.commissionType) {
        if (commissionInfo) commissionInfo.innerHTML = '<span style="color: #94a3b8;">No commission set for this employee</span>';
        if (commissionField) commissionField.value = '0';
        return;
    }
    
    // Get date range for the month
    const [year, month] = payrollMonth.split('-');
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);
    
    // Get sales data - check all possible keys
    const transactions = JSON.parse(localStorage.getItem('ezcubic_transactions') || '[]');
    const orders = JSON.parse(localStorage.getItem('ezcubic_orders') || '[]');
    const posSales = JSON.parse(localStorage.getItem('ezcubic_sales') || '[]');
    const posReceipts = JSON.parse(localStorage.getItem('ezcubic_pos_receipts') || '[]');
    const inventory = JSON.parse(localStorage.getItem('ezcubic_inventory') || '[]');
    
    // Combine POS sales
    const allPOSSales = [...posSales, ...posReceipts.filter(r => !posSales.find(s => s.receiptNo === r.receiptNo))];
    
    let commission = 0;
    let details = '';
    
    if (employee.commissionType === 'percentage') {
        // Percentage of total sales
        let totalSales = 0;
        
        transactions.forEach(t => {
            if (t.type === 'income' && t.salesperson === employee.name) {
                const txDate = new Date(t.date);
                if (txDate >= startDate && txDate <= endDate) {
                    totalSales += parseFloat(t.amount) || 0;
                }
            }
        });
        
        orders.forEach(o => {
            if (o.status === 'completed' && o.salesperson === employee.name) {
                const orderDate = new Date(o.date);
                if (orderDate >= startDate && orderDate <= endDate) {
                    totalSales += parseFloat(o.total) || 0;
                }
            }
        });
        
        // Check POS sales
        allPOSSales.forEach(r => {
            if (r.cashier === employee.name || r.salesperson === employee.name) {
                const receiptDate = new Date(r.date || r.timestamp);
                if (receiptDate >= startDate && receiptDate <= endDate) {
                    totalSales += parseFloat(r.total) || 0;
                }
            }
        });
        
        commission = totalSales * (employee.commissionValue / 100);
        details = `Sales: ${formatCurrency(totalSales)} × ${employee.commissionValue}%`;
        
    } else if (employee.commissionType === 'fixed') {
        // Fixed monthly amount (if any sales)
        let hasSales = false;
        
        transactions.forEach(t => {
            if (t.type === 'income' && t.salesperson === employee.name) {
                const txDate = new Date(t.date);
                if (txDate >= startDate && txDate <= endDate) hasSales = true;
            }
        });
        
        if (!hasSales) {
            allPOSSales.forEach(r => {
                if (r.cashier === employee.name || r.salesperson === employee.name) {
                    const receiptDate = new Date(r.date || r.timestamp);
                    if (receiptDate >= startDate && receiptDate <= endDate) hasSales = true;
                }
            });
        }
        
        commission = hasSales ? employee.commissionValue : 0;
        details = hasSales ? 'Fixed monthly commission' : 'No sales this month';
        
    } else if (employee.commissionType === 'product' && employee.commissionRules) {
        // Product-based commission
        let breakdown = [];
        
        // Process POS sales with item details
        allPOSSales.forEach(receipt => {
            if (receipt.cashier === employee.name || receipt.salesperson === employee.name) {
                const receiptDate = new Date(receipt.date || receipt.timestamp);
                if (receiptDate >= startDate && receiptDate <= endDate && receipt.items) {
                    receipt.items.forEach(item => {
                        const product = inventory.find(p => p.id === item.productId || p.name === item.name);
                        
                        employee.commissionRules.forEach(rule => {
                            let matches = false;
                            
                            if (rule.type === 'product' && product && product.id === rule.target) {
                                matches = true;
                            } else if (rule.type === 'category' && product && product.category === rule.target) {
                                matches = true;
                            } else if (rule.type === 'all') {
                                matches = true;
                            }
                            
                            if (matches) {
                                const qty = parseInt(item.quantity) || 1;
                                const itemTotal = parseFloat(item.total) || (parseFloat(item.price) * qty);
                                
                                let itemCommission = 0;
                                if (rule.calcType === 'per_unit') {
                                    itemCommission = rule.value * qty;
                                } else { // percentage
                                    itemCommission = itemTotal * (rule.value / 100);
                                }
                                
                                commission += itemCommission;
                                
                                // Track for breakdown
                                const existing = breakdown.find(b => b.name === (item.name || product?.name || 'Item'));
                                if (existing) {
                                    existing.qty += qty;
                                    existing.commission += itemCommission;
                                } else {
                                    breakdown.push({
                                        name: item.name || product?.name || 'Item',
                                        qty: qty,
                                        commission: itemCommission
                                    });
                                }
                            }
                        });
                    });
                }
            }
        });
        
        // Also check orders with items
        orders.forEach(order => {
            if ((order.salesperson === employee.name) && order.status === 'completed') {
                const orderDate = new Date(order.date);
                if (orderDate >= startDate && orderDate <= endDate && order.items) {
                    order.items.forEach(item => {
                        const product = inventory.find(p => p.id === item.productId || p.name === item.name);
                        
                        employee.commissionRules.forEach(rule => {
                            let matches = false;
                            
                            if (rule.type === 'product' && product && product.id === rule.target) {
                                matches = true;
                            } else if (rule.type === 'category' && product && product.category === rule.target) {
                                matches = true;
                            } else if (rule.type === 'all') {
                                matches = true;
                            }
                            
                            if (matches) {
                                const qty = parseInt(item.quantity) || 1;
                                const itemTotal = parseFloat(item.total) || (parseFloat(item.price) * qty);
                                
                                let itemCommission = 0;
                                if (rule.calcType === 'per_unit') {
                                    itemCommission = rule.value * qty;
                                } else {
                                    itemCommission = itemTotal * (rule.value / 100);
                                }
                                
                                commission += itemCommission;
                                
                                const existing = breakdown.find(b => b.name === (item.name || product?.name || 'Item'));
                                if (existing) {
                                    existing.qty += qty;
                                    existing.commission += itemCommission;
                                } else {
                                    breakdown.push({
                                        name: item.name || product?.name || 'Item',
                                        qty: qty,
                                        commission: itemCommission
                                    });
                                }
                            }
                        });
                    });
                }
            }
        });
        
        // Create breakdown details
        if (breakdown.length > 0) {
            details = breakdown.slice(0, 3).map(b => 
                `${b.name}: ${b.qty} × ${formatCurrency(b.commission / b.qty)}`
            ).join(', ');
            if (breakdown.length > 3) details += ` +${breakdown.length - 3} more`;
        } else {
            details = 'No matching product sales found';
        }
    } else if (employee.commissionType === 'tiered' && employee.commissionTiers) {
        // Tiered commission - KPI style
        let totalSales = 0;
        
        // Calculate total sales from all sources
        transactions.forEach(t => {
            if (t.type === 'income' && t.salesperson === employee.name) {
                const txDate = new Date(t.date);
                if (txDate >= startDate && txDate <= endDate) {
                    totalSales += parseFloat(t.amount) || 0;
                }
            }
        });
        
        orders.forEach(o => {
            if (o.status === 'completed' && o.salesperson === employee.name) {
                const orderDate = new Date(o.date);
                if (orderDate >= startDate && orderDate <= endDate) {
                    totalSales += parseFloat(o.total) || 0;
                }
            }
        });
        
        allPOSSales.forEach(r => {
            if (r.cashier === employee.name || r.salesperson === employee.name) {
                const receiptDate = new Date(r.date || r.timestamp);
                if (receiptDate >= startDate && receiptDate <= endDate) {
                    totalSales += parseFloat(r.total) || 0;
                }
            }
        });
        
        // Find matching tier
        const result = calculateTieredCommission(totalSales, employee.commissionTiers);
        commission = result.commission;
        
        if (result.tier) {
            const tierMax = result.tier.max === Infinity ? '∞' : formatCurrency(result.tier.max);
            details = `Sales: ${formatCurrency(totalSales)} (Tier: ${formatCurrency(result.tier.min)} - ${tierMax} @ ${result.rate}%)`;
        } else {
            details = `Sales: ${formatCurrency(totalSales)} - No matching tier`;
        }
    }
    
    // Update commission field and info
    if (commissionField) {
        commissionField.value = commission.toFixed(2);
    }
    if (commissionInfo) {
        if (commission > 0) {
            commissionInfo.innerHTML = `<span style="color: #10b981;"><i class="fas fa-check-circle"></i> ${details} = <strong>${formatCurrency(commission)}</strong></span>`;
        } else {
            commissionInfo.innerHTML = `<span style="color: #f59e0b;"><i class="fas fa-info-circle"></i> ${details || 'No sales found for this period'}</span>`;
        }
    }
    
    calculatePayrollPreview();
}

// ==================== PROCESS PAYROLL ====================
function showProcessPayrollModal(employeeId = null) {
    const modal = document.getElementById('processPayrollModal');
    const employeeSelect = document.getElementById('payrollEmployee');
    
    // Populate employee dropdown
    const activeEmployees = employees.filter(e => e.status === 'active');
    employeeSelect.innerHTML = '<option value="">Select Employee</option>' +
        activeEmployees.map(e => `<option value="${e.id}" ${e.id === employeeId ? 'selected' : ''}>${escapeHTML(e.name)} - ${formatCurrency(e.basicSalary)}</option>`).join('');
    
    // Set current month
    const today = new Date();
    document.getElementById('payrollMonth').value = today.toISOString().slice(0, 7);
    
    // Reset fields
    document.getElementById('payrollAllowances').value = '0';
    document.getElementById('payrollOvertime').value = '0';
    document.getElementById('payrollCommission').value = '0';
    document.getElementById('payrollDeductions').value = '0';
    document.getElementById('commissionInfo').innerHTML = '';
    
    // Calculate preview and commission if employee selected
    if (employeeId) {
        // Small delay to ensure DOM is ready
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
    
    // Show exemption notice if applicable
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
                ${allowances > 0 ? `
                <div class="preview-row">
                    <span>Allowances</span>
                    <span>${formatCurrency(allowances)}</span>
                </div>` : ''}
                ${overtime > 0 ? `
                <div class="preview-row">
                    <span>Overtime</span>
                    <span>${formatCurrency(overtime)}</span>
                </div>` : ''}
                ${commission > 0 ? `
                <div class="preview-row">
                    <span>Commission</span>
                    <span>${formatCurrency(commission)}</span>
                </div>` : ''}
                <div class="preview-row total">
                    <span>Gross Salary</span>
                    <span>${formatCurrency(payroll.grossSalary)}</span>
                </div>
            </div>
            
            <div class="preview-section deductions">
                <h5><i class="fas fa-minus-circle"></i> Deductions (Employee)</h5>
                ${payroll.hasEPF ? `
                <div class="preview-row">
                    <span>EPF (11%)</span>
                    <span>- ${formatCurrency(payroll.epfEmployee)}</span>
                </div>` : ''}
                ${payroll.hasSOCSO ? `
                <div class="preview-row">
                    <span>SOCSO</span>
                    <span>- ${formatCurrency(payroll.socsoEmployee)}</span>
                </div>` : ''}
                ${payroll.hasEIS ? `
                <div class="preview-row">
                    <span>EIS</span>
                    <span>- ${formatCurrency(payroll.eisEmployee)}</span>
                </div>` : ''}
                ${payroll.hasPCB ? `
                <div class="preview-row">
                    <span>PCB (Tax)</span>
                    <span>- ${formatCurrency(payroll.pcb)}</span>
                </div>` : ''}
                ${deductions > 0 ? `
                <div class="preview-row">
                    <span>Other Deductions</span>
                    <span>- ${formatCurrency(deductions)}</span>
                </div>` : ''}
                <div class="preview-row total">
                    <span>Total Deductions</span>
                    <span>- ${formatCurrency(payroll.totalDeductions)}</span>
                </div>
            </div>
            
            <div class="preview-section employer">
                <h5><i class="fas fa-building"></i> Employer Contributions</h5>
                ${payroll.hasEPF ? `
                <div class="preview-row">
                    <span>EPF (13%)</span>
                    <span>${formatCurrency(payroll.epfEmployer)}</span>
                </div>` : ''}
                ${payroll.hasSOCSO ? `
                <div class="preview-row">
                    <span>SOCSO</span>
                    <span>${formatCurrency(payroll.socsoEmployer)}</span>
                </div>` : ''}
                ${payroll.hasEIS ? `
                <div class="preview-row">
                    <span>EIS</span>
                    <span>${formatCurrency(payroll.eisEmployer)}</span>
                </div>` : ''}
                <div class="preview-row total">
                    <span>Total Employer</span>
                    <span>${formatCurrency(payroll.totalEmployerContributions)}</span>
                </div>
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
    
    // Check if already processed
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
    
    // Create expense transaction for salary
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

// Mark payroll as paid and optionally create bill payment
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
    
    // Update status to paid
    record.status = 'paid';
    record.paidAt = new Date().toISOString();
    record.paidBy = typeof getCurrentUser === 'function' ? getCurrentUser()?.name : 'Admin';
    
    savePayrollData();
    loadPayrollHistory();
    
    showToast(`✅ Payroll for ${record.employeeName} marked as PAID`, 'success');
}

// Delete payroll record
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
    
    // Remove the payroll record
    payrollRecords = payrollRecords.filter(p => p.id !== recordId);
    
    // Also remove the associated salary expense transaction
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
    
    // Also update dashboard to reflect the change
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

function showPayrollTab(tab) {
    document.querySelectorAll('#payroll .tabs:not(.secondary) .tab').forEach(t => t.classList.remove('active'));
    event.currentTarget.classList.add('active');
    
    const employeesSection = document.getElementById('employeesSection');
    const payrollSection = document.getElementById('payrollSection');
    const salesReportSection = document.getElementById('salesReportSection');
    const kpiSection = document.getElementById('kpiSection');
    const leaveSection = document.getElementById('leaveSection');
    const attendanceSection = document.getElementById('attendanceSection');
    
    // Hide all sections
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
                <div class="info-row">
                    <span class="label">Employee Name:</span>
                    <span class="value">${escapeHTML(record.employeeName)}</span>
                </div>
                <div class="info-row">
                    <span class="label">IC Number:</span>
                    <span class="value">${escapeHTML(employee?.ic || '-')}</span>
                </div>
                <div class="info-row">
                    <span class="label">Position:</span>
                    <span class="value">${escapeHTML(employee?.position || '-')}</span>
                </div>
                <div class="info-row">
                    <span class="label">Department:</span>
                    <span class="value">${escapeHTML(employee?.department || '-')}</span>
                </div>
                <div class="info-row">
                    <span class="label">EPF No:</span>
                    <span class="value">${escapeHTML(employee?.epfNo || '-')}</span>
                </div>
                <div class="info-row">
                    <span class="label">Bank Account:</span>
                    <span class="value">${escapeHTML(employee?.bankName || '')} ${escapeHTML(employee?.bankAccount || '-')}</span>
                </div>
            </div>
            
            <div class="payslip-body">
                <div class="payslip-column earnings">
                    <h4>EARNINGS</h4>
                    <div class="payslip-line">
                        <span>Basic Salary</span>
                        <span>${formatCurrency(record.basicSalary)}</span>
                    </div>
                    ${record.allowances > 0 ? `
                    <div class="payslip-line">
                        <span>Allowances</span>
                        <span>${formatCurrency(record.allowances)}</span>
                    </div>` : ''}
                    ${record.overtime > 0 ? `
                    <div class="payslip-line">
                        <span>Overtime</span>
                        <span>${formatCurrency(record.overtime)}</span>
                    </div>` : ''}
                    <div class="payslip-line total">
                        <span>GROSS SALARY</span>
                        <span>${formatCurrency(record.grossSalary)}</span>
                    </div>
                </div>
                
                <div class="payslip-column deductions">
                    <h4>DEDUCTIONS</h4>
                    <div class="payslip-line">
                        <span>EPF (Employee 11%)</span>
                        <span>${formatCurrency(record.epfEmployee)}</span>
                    </div>
                    <div class="payslip-line">
                        <span>SOCSO</span>
                        <span>${formatCurrency(record.socsoEmployee)}</span>
                    </div>
                    <div class="payslip-line">
                        <span>EIS</span>
                        <span>${formatCurrency(record.eisEmployee)}</span>
                    </div>
                    <div class="payslip-line">
                        <span>PCB (Income Tax)</span>
                        <span>${formatCurrency(record.pcb)}</span>
                    </div>
                    ${record.otherDeductions > 0 ? `
                    <div class="payslip-line">
                        <span>Other Deductions</span>
                        <span>${formatCurrency(record.otherDeductions)}</span>
                    </div>` : ''}
                    <div class="payslip-line total">
                        <span>TOTAL DEDUCTIONS</span>
                        <span>${formatCurrency(record.totalDeductions)}</span>
                    </div>
                </div>
            </div>
            
            <div class="payslip-employer">
                <h4>EMPLOYER CONTRIBUTIONS</h4>
                <div class="employer-grid">
                    <div class="payslip-line">
                        <span>EPF (Employer 13%)</span>
                        <span>${formatCurrency(record.epfEmployer)}</span>
                    </div>
                    <div class="payslip-line">
                        <span>SOCSO (Employer)</span>
                        <span>${formatCurrency(record.socsoEmployer)}</span>
                    </div>
                    <div class="payslip-line">
                        <span>EIS (Employer)</span>
                        <span>${formatCurrency(record.eisEmployer)}</span>
                    </div>
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
    // Populate employee dropdown
    const select = document.getElementById('salesReportEmployee');
    if (select) {
        select.innerHTML = '<option value="">All Salespersons</option>' +
            employees.filter(e => e.status === 'active').map(e => 
                `<option value="${escapeHTML(e.name)}">${escapeHTML(e.name)}</option>`
            ).join('');
    }
    
    // Set current month
    const monthInput = document.getElementById('salesReportMonth');
    if (monthInput && !monthInput.value) {
        monthInput.value = new Date().toISOString().slice(0, 7);
    }
    
    loadSalesReport();
}

function loadSalesReport() {
    const selectedEmployee = document.getElementById('salesReportEmployee')?.value || '';
    const selectedMonth = document.getElementById('salesReportMonth')?.value || '';
    
    // Get all sales data sources - check window.sales first (live data), then localStorage
    const posSales = window.sales || JSON.parse(localStorage.getItem('ezcubic_sales') || '[]');
    const posReceipts = JSON.parse(localStorage.getItem('ezcubic_pos_receipts') || '[]');
    const orders = window.orders || JSON.parse(localStorage.getItem('ezcubic_orders') || '[]');
    const transactions = (businessData && businessData.transactions) ? businessData.transactions : JSON.parse(localStorage.getItem('ezcubic_transactions') || '[]');
    
    // Combine all sales
    let allSales = [];
    
    // POS Sales (main sales from POS module)
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
    
    // POS Receipts (alternate key)
    if (Array.isArray(posReceipts)) {
        posReceipts.forEach(r => {
            // Avoid duplicates by checking receiptNo
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
    
    // Orders
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
    
    // Income Transactions
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
    
    // Apply filters
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
    
    // Sort by date (newest first)
    allSales.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    // Calculate stats
    const totalSales = allSales.reduce((sum, s) => sum + s.total, 0);
    const totalCount = allSales.length;
    const avgSale = totalCount > 0 ? totalSales / totalCount : 0;
    
    // Calculate commission for selected employee
    let commission = 0;
    if (selectedEmployee && selectedMonth) {
        const employee = employees.find(e => e.name === selectedEmployee);
        if (employee) {
            commission = calculateEmployeeCommission(employee, totalSales, allSales, selectedMonth);
        }
    }
    
    // Update stats
    document.getElementById('salesReportTotal').textContent = formatCurrency(totalSales);
    document.getElementById('salesReportCount').textContent = totalCount;
    document.getElementById('salesReportCommission').textContent = formatCurrency(commission);
    document.getElementById('salesReportAvg').textContent = formatCurrency(avgSale);
    
    // Render table
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
        // Simplified - would need item-level data for accurate calculation
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
    
    // Get table data
    const table = document.getElementById('salesReportTable');
    const rows = table.querySelectorAll('tbody tr');
    
    if (rows.length === 0 || rows[0].cells.length === 1) {
        showNotification('No data to export', 'warning');
        return;
    }
    
    let csv = 'Date,Reference,Customer,Items,Total (RM),Source\\n';
    
    rows.forEach(row => {
        const cells = row.querySelectorAll('td');
        if (cells.length >= 6) {
            csv += `"${cells[0].textContent}","${cells[1].textContent}","${cells[2].textContent}","${cells[3].textContent}","${cells[4].textContent.replace('RM ', '')}","${cells[5].textContent}"\\n`;
        }
    });
    
    // Download
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
    // Switch to Sales Report tab with employee pre-selected
    document.getElementById('salesReportEmployee').value = employeeName;
    document.getElementById('salesReportMonth').value = new Date().toISOString().slice(0, 7);
    
    // Click the Sales Report tab
    const tabs = document.querySelectorAll('#payroll .tabs:not(.secondary) .tab');
    tabs.forEach(t => t.classList.remove('active'));
    tabs[2].classList.add('active'); // Sales Report is the 3rd tab (index 2)
    
    // Show sales report section
    document.getElementById('employeesSection').style.display = 'none';
    document.getElementById('payrollSection').style.display = 'none';
    document.getElementById('salesReportSection').style.display = 'block';
    document.getElementById('kpiSection').style.display = 'none';
    
    loadSalesReport();
}