/**
 * PAYROLL-CALCULATIONS.JS
 * Malaysian HR & Payroll System - Calculations
 * EPF, SOCSO, EIS, PCB, Commission Calculations
 * Version: 2.2.7 - Modular Split - 26 Dec 2025
 */

// ==================== STATUTORY CALCULATIONS ====================
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
        return { employee: 24.75, employer: 74.45 };
    }
    
    for (const category of SOCSO_TABLE) {
        if (basicSalary <= category.maxWage) {
            return {
                employee: category.employee,
                employer: category.employer
            };
        }
    }
    
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
    const epfRelief = Math.min(epfContribution * 12, 4000);
    const taxableIncome = annualIncome - epfRelief - 9000;
    
    if (taxableIncome <= 0) return 0;
    
    let annualTax = 0;
    for (const bracket of PCB_BRACKETS) {
        if (taxableIncome >= bracket.min && taxableIncome <= bracket.max) {
            annualTax = (taxableIncome * bracket.rate) - bracket.deduct;
            break;
        }
    }
    
    return Math.max(0, Math.round(annualTax / 12 * 100) / 100);
}

function calculateFullPayroll(employee, allowances = 0, overtime = 0, deductions = 0, commission = 0) {
    const basicSalary = employee.basicSalary || 0;
    const grossSalary = basicSalary + allowances + overtime + commission;
    
    const birthYear = parseInt('19' + employee.ic.substring(0, 2));
    const age = new Date().getFullYear() - birthYear;
    
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
        hasEPF,
        hasSOCSO,
        hasEIS,
        hasPCB
    };
}

// ==================== COMMISSION FIELDS ====================
function toggleCommissionFields() {
    const commissionType = document.getElementById('empCommissionType').value;
    const valueGroup = document.getElementById('commissionValueGroup');
    const valueLabel = document.getElementById('commissionValueLabel');
    const productSection = document.getElementById('productCommissionSection');
    const tieredSection = document.getElementById('tieredCommissionSection');
    
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
        const container = document.getElementById('commissionTiersContainer');
        if (container.children.length === 0) {
            addCommissionTier(0, 50000, 5);
            addCommissionTier(50001, 100000, 10);
            addCommissionTier(100001, null, 15);
        }
    } else if (commissionType === 'product') {
        productSection.style.display = 'block';
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
    
    tiers.sort((a, b) => a.min - b.min);
    return tiers;
}

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

function calculateTieredCommission(totalSales, tiers) {
    if (!tiers || tiers.length === 0) return { commission: 0, tier: null };
    
    for (const tier of tiers) {
        if (totalSales >= tier.min && totalSales <= (tier.max || Infinity)) {
            return {
                commission: totalSales * (tier.rate / 100),
                tier: tier,
                rate: tier.rate
            };
        }
    }
    
    const lastTier = tiers[tiers.length - 1];
    return {
        commission: totalSales * (lastTier.rate / 100),
        tier: lastTier,
        rate: lastTier.rate
    };
}

// ==================== PRODUCT COMMISSION ====================
function addCommissionRule() {
    const container = document.getElementById('commissionRulesContainer');
    const ruleId = generateUniqueId();
    
    const inventory = JSON.parse(localStorage.getItem('ezcubic_inventory') || '[]');
    const productOptions = inventory.map(p => 
        `<option value="${p.id}">${escapeHTML(p.name)}</option>`
    ).join('');
    
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
        targetSelect.innerHTML = '<option value="all">All Products</option>';
        targetSelect.value = 'all';
    }
};

window.updateRuleValueLabel = function(select) {
    const row = select.closest('.commission-rule-row');
    const currencyLabel = row.querySelector('.rule-currency');
    currencyLabel.textContent = select.value === 'percentage' ? '%' : 'RM';
};

function removeCommissionRule(ruleId) {
    const row = document.querySelector(`[data-rule-id="${ruleId}"]`);
    if (row) row.remove();
}

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

// ==================== AUTO COMMISSION CALCULATION ====================
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
    
    if (employee.commissionType === 'none' || !employee.commissionType) {
        if (commissionInfo) commissionInfo.innerHTML = '<span style="color: #94a3b8;">No commission set for this employee</span>';
        if (commissionField) commissionField.value = '0';
        return;
    }
    
    const [year, month] = payrollMonth.split('-');
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);
    
    const transactions = JSON.parse(localStorage.getItem('ezcubic_transactions') || '[]');
    const orders = JSON.parse(localStorage.getItem('ezcubic_orders') || '[]');
    const posSales = JSON.parse(localStorage.getItem('ezcubic_sales') || '[]');
    const posReceipts = JSON.parse(localStorage.getItem('ezcubic_pos_receipts') || '[]');
    const inventory = JSON.parse(localStorage.getItem('ezcubic_inventory') || '[]');
    
    const allPOSSales = [...posSales, ...posReceipts.filter(r => !posSales.find(s => s.receiptNo === r.receiptNo))];
    
    let commission = 0;
    let details = '';
    
    if (employee.commissionType === 'percentage') {
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
        let breakdown = [];
        
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
        
        if (breakdown.length > 0) {
            details = breakdown.slice(0, 3).map(b => 
                `${b.name}: ${b.qty} × ${formatCurrency(b.commission / b.qty)}`
            ).join(', ');
            if (breakdown.length > 3) details += ` +${breakdown.length - 3} more`;
        } else {
            details = 'No matching product sales found';
        }
    } else if (employee.commissionType === 'tiered' && employee.commissionTiers) {
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
        
        allPOSSales.forEach(r => {
            if (r.cashier === employee.name || r.salesperson === employee.name) {
                const receiptDate = new Date(r.date || r.timestamp);
                if (receiptDate >= startDate && receiptDate <= endDate) {
                    totalSales += parseFloat(r.total) || 0;
                }
            }
        });
        
        const result = calculateTieredCommission(totalSales, employee.commissionTiers);
        commission = result.commission;
        
        if (result.tier) {
            const tierMax = result.tier.max === Infinity ? '∞' : formatCurrency(result.tier.max);
            details = `Sales: ${formatCurrency(totalSales)} (Tier: ${formatCurrency(result.tier.min)} - ${tierMax} @ ${result.rate}%)`;
        } else {
            details = `Sales: ${formatCurrency(totalSales)} - No matching tier`;
        }
    }
    
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

// ==================== EXPORT TO WINDOW ====================
window.calculateEPF = calculateEPF;
window.calculateSOCSO = calculateSOCSO;
window.calculateEIS = calculateEIS;
window.calculatePCB = calculatePCB;
window.calculateFullPayroll = calculateFullPayroll;
window.toggleCommissionFields = toggleCommissionFields;
window.addCommissionTier = addCommissionTier;
window.removeCommissionTier = removeCommissionTier;
window.getCommissionTiers = getCommissionTiers;
window.loadCommissionTiers = loadCommissionTiers;
window.calculateTieredCommission = calculateTieredCommission;
window.addCommissionRule = addCommissionRule;
window.removeCommissionRule = removeCommissionRule;
window.getCommissionRules = getCommissionRules;
window.loadCommissionRules = loadCommissionRules;
window.onPayrollEmployeeChange = onPayrollEmployeeChange;
window.calculateAutoCommission = calculateAutoCommission;
