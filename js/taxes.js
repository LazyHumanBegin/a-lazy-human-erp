// ==================== TAXES.JS ====================
// Malaysian Tax and SST Functions

// ==================== MALAYSIAN TAX ESTIMATOR ====================
// Export functions to window for onclick handlers
window.updateMalaysianTaxEstimator = updateMalaysianTaxEstimator;
window.calculatePersonalTax = calculatePersonalTax;
window.calculateSST = calculateSST;
window.calculateAndDisplaySST = calculateAndDisplaySST;
window.updateSSTCategories = updateSSTCategories;
window.updateSSTSummary = updateSSTSummary;
window.initTaxSection = initTaxSection;
window.validateTaxInput = validateTaxInput;

// Initialize tax section on page load
function initTaxSection() {
    // Add event listener for corporate tax rate slider
    const taxRateSlider = document.getElementById('corporateTaxRate');
    if (taxRateSlider) {
        taxRateSlider.addEventListener('input', function() {
            document.getElementById('corporateTaxRateValue').textContent = this.value + '%';
            updateMalaysianTaxEstimator();
        });
    }
    
    // Add event listeners for personal tax inputs
    const personalTaxInputs = ['tax-employment', 'tax-zakat', 'relief-epf', 'relief-life', 'relief-lifestyle', 'relief-medical'];
    personalTaxInputs.forEach(id => {
        const input = document.getElementById(id);
        if (input) {
            input.addEventListener('input', calculatePersonalTax);
        }
    });
    
    // Initial calculation
    updateMalaysianTaxEstimator();
}

// Validate tax input fields
function validateTaxInput(input, maxValue) {
    let value = parseFloat(input.value) || 0;
    if (value < 0) value = 0;
    if (maxValue && value > maxValue) value = maxValue;
    input.value = value;
    calculatePersonalTax();
}

function updateMalaysianTaxEstimator() {
    const currentYear = new Date().getFullYear();
    let yearIncome = 0;
    let yearExpenses = 0;
    
    businessData.transactions.forEach(tx => {
        const txDate = parseDateSafe(tx.date);
        if (txDate.getFullYear() === currentYear) {
            if (tx.type === 'income') yearIncome += tx.amount;
            else yearExpenses += tx.amount;
        }
    });
    
    const taxRateInput = document.getElementById('corporateTaxRate');
    const taxRate = taxRateInput ? parseFloat(taxRateInput.value) : 17;
    const taxableProfit = Math.max(0, yearIncome - yearExpenses);
    
    // Malaysian Corporate Tax Calculation (SME rates for YA2024)
    let taxAmount = 0;
    if (taxableProfit > 0) {
        // For SME: First RM150,000 at 15%, RM150,001-RM600,000 at 17%, Above RM600,000 at 24%
        if (taxableProfit <= 150000) {
            taxAmount = taxableProfit * 0.15;
        } else if (taxableProfit <= 600000) {
            taxAmount = (150000 * 0.15) + ((taxableProfit - 150000) * 0.17);
        } else {
            taxAmount = (150000 * 0.15) + (450000 * 0.17) + ((taxableProfit - 600000) * 0.24);
        }
        
        // Override with manual rate if slider is used
        if (taxRateInput && taxRateInput.value !== '17') {
            taxAmount = taxableProfit * (taxRate / 100);
        }
    }
    
    // Update UI elements
    const incomeEl = document.getElementById('corporateTaxIncome');
    const expensesEl = document.getElementById('corporateTaxExpenses');
    const profitEl = document.getElementById('corporateTaxProfit');
    const taxAmountEl = document.getElementById('corporateTaxAmount');
    const taxRateValueEl = document.getElementById('corporateTaxRateValue');
    const cp204El = document.getElementById('cp204Payment');
    const nextDateEl = document.getElementById('nextTaxDate');
    
    if (incomeEl) incomeEl.textContent = formatCurrency(yearIncome);
    if (expensesEl) expensesEl.textContent = formatCurrency(yearExpenses);
    if (profitEl) profitEl.textContent = formatCurrency(taxableProfit);
    if (taxAmountEl) taxAmountEl.textContent = formatCurrency(taxAmount);
    if (taxRateValueEl) taxRateValueEl.textContent = taxRate.toFixed(1) + '%';
    
    // CP204 Monthly Instalment
    const cp204Payment = taxAmount / 12;
    if (cp204El) cp204El.textContent = formatCurrency(cp204Payment);
    
    // Next payment date calculation
    const today = new Date();
    let nextPaymentMonth = today.getMonth();
    let nextPaymentYear = today.getFullYear();
    
    // CP204 is due by 30th of each second month (Feb, Apr, Jun, Aug, Oct, Dec)
    const cp204Months = [1, 3, 5, 7, 9, 11]; // 0-indexed months
    for (let i = 0; i < cp204Months.length; i++) {
        if (cp204Months[i] >= today.getMonth()) {
            nextPaymentMonth = cp204Months[i];
            break;
        }
        if (i === cp204Months.length - 1) {
            nextPaymentMonth = cp204Months[0];
            nextPaymentYear += 1;
        }
    }
    
    const nextPaymentDate = new Date(nextPaymentYear, nextPaymentMonth, 30);
    if (nextDateEl) {
        nextDateEl.textContent = nextPaymentDate.toLocaleDateString('en-MY', { 
            day: 'numeric', 
            month: 'long', 
            year: 'numeric' 
        });
    }
    
    updateMalaysianTaxTable(taxableProfit);
}

function updateMalaysianTaxTable(taxableProfit = 0) {
    const container = document.getElementById('malaysianTaxTable');
    if (!container) return;
    
    // Malaysian Corporate Tax Rates for SME (YA2024)
    const brackets = [
        { min: 0, max: 150000, rate: 15, description: 'First RM 150,000' },
        { min: 150001, max: 600000, rate: 17, description: 'RM 150,001 - RM 600,000' },
        { min: 600001, max: Infinity, rate: 24, description: 'Above RM 600,000' }
    ];
    
    let tableHTML = '';
    let cumulativeTax = 0;
    
    brackets.forEach((bracket, index) => {
        const bracketRange = bracket.max === Infinity ? 
            bracket.description : 
            bracket.description;
        
        let bracketTax = 0;
        let bracketAmount = 0;
        let isActive = false;
        
        if (taxableProfit > bracket.min) {
            isActive = true;
            if (bracket.max === Infinity) {
                bracketAmount = Math.max(0, taxableProfit - bracket.min);
            } else {
                bracketAmount = Math.min(bracket.max - bracket.min, Math.max(0, taxableProfit - bracket.min));
            }
            bracketTax = bracketAmount * (bracket.rate / 100);
            cumulativeTax += bracketTax;
        }
        
        const activeStyle = isActive ? 'background: rgba(37, 99, 235, 0.1); font-weight: 600;' : '';
        
        tableHTML += `
            <tr style="${activeStyle}">
                <td style="color: #475569;">${bracketRange}</td>
                <td style="color: #475569;">${bracket.rate}%</td>
                <td style="color: ${isActive ? '#2563eb' : '#475569'};">${isActive ? formatCurrency(bracketTax) : '-'}</td>
            </tr>
        `;
    });
    
    // Add total row
    tableHTML += `
        <tr style="background: #1e293b;">
            <td colspan="2" style="color: white; font-weight: 600;">Total Estimated Tax</td>
            <td style="color: #f59e0b; font-weight: 700;">${formatCurrency(cumulativeTax)}</td>
        </tr>
    `;
    
    container.innerHTML = tableHTML;
}

// ==================== PERSONAL TAX ====================
function calculatePersonalTax() {
    const bizProfit = getBusinessNetProfit();
    
    document.getElementById('tax-biz-profit').value = bizProfit.toFixed(2);
    
    const employment = parseFloat(document.getElementById('tax-employment').value) || 0;
    const zakat = parseFloat(document.getElementById('tax-zakat').value) || 0;
    
    const reliefIndividual = 9000;
    const reliefEpf = Math.min(parseFloat(document.getElementById('relief-epf').value) || 0, 4000);
    const reliefLife = Math.min(parseFloat(document.getElementById('relief-life').value) || 0, 3000);
    const reliefLifestyle = Math.min(parseFloat(document.getElementById('relief-lifestyle').value) || 0, 2500);
    const reliefMedical = Math.min(parseFloat(document.getElementById('relief-medical').value) || 0, 10000);
    
    const totalRelief = reliefIndividual + reliefEpf + reliefLife + reliefLifestyle + reliefMedical;
    const grossIncome = bizProfit + employment;
    let chargeableIncome = Math.max(0, grossIncome - totalRelief);
    
    const taxBrackets = [
        { min: 0, max: 5000, rate: 0, tax: 0 },
        { min: 5001, max: 20000, rate: 0.01, tax: 0 },
        { min: 20001, max: 35000, rate: 0.03, tax: 150 },
        { min: 35001, max: 50000, rate: 0.08, tax: 600 },
        { min: 50001, max: 70000, rate: 0.14, tax: 2800 },
        { min: 70001, max: 100000, rate: 0.21, tax: 6300 },
        { min: 100001, max: 400000, rate: 0.24, tax: 72000 },
        { min: 400001, max: 600000, rate: 0.245, tax: 49000 },
        { min: 600001, max: 1000000, rate: 0.25, tax: 100000 },
        { min: 1000001, max: 2000000, rate: 0.26, tax: 260000 },
        { min: 2000001, max: Infinity, rate: 0.28, tax: 0 }
    ];
    
    let tax = 0;
    let remainingIncome = chargeableIncome;
    
    for (let i = 0; i < taxBrackets.length; i++) {
        const bracket = taxBrackets[i];
        
        if (remainingIncome <= 0) break;
        
        if (remainingIncome > bracket.max) {
            tax += bracket.tax;
            remainingIncome -= (bracket.max - bracket.min + 1);
        } else {
            const taxableInBracket = remainingIncome - bracket.min + 1;
            if (taxableInBracket > 0) {
                tax += taxableInBracket * bracket.rate;
            }
            remainingIncome = 0;
        }
    }
    
    const finalTax = Math.max(0, tax - zakat);
    
    document.getElementById('personal-tax-amount').textContent = finalTax.toFixed(2);
    document.getElementById('personal-summary-gross').textContent = grossIncome.toFixed(2);
    document.getElementById('personal-summary-relief').textContent = totalRelief.toFixed(2);
    document.getElementById('personal-summary-chargeable').textContent = chargeableIncome.toFixed(2);
    document.getElementById('personal-summary-zakat').textContent = zakat.toFixed(2);
    document.getElementById('personal-summary-payable').textContent = finalTax.toFixed(2);
    
    const percent = Math.min(100, (chargeableIncome / 1000000) * 100);
    document.getElementById('tax-progress').style.width = percent + '%';
    document.getElementById('bracket-percent').textContent = percent.toFixed(0) + '% to 1M bracket';
}

function getBusinessNetProfit() {
    const currentYear = new Date().getFullYear();
    let yearIncome = 0;
    let yearExpenses = 0;
    
    businessData.transactions.forEach(tx => {
        const txDate = parseDateSafe(tx.date);
        if (txDate.getFullYear() === currentYear) {
            if (tx.type === 'income') yearIncome += tx.amount;
            else yearExpenses += tx.amount;
        }
    });
    
    return Math.max(0, yearIncome - yearExpenses);
}

// ==================== SST CALCULATION ====================
function calculateSST(amount, taxType = 'sales', itemType = 'standard', isInclusive = false) {
    if (typeof amount !== 'number' || amount <= 0) {
        console.error('Invalid amount for SST calculation');
        return {
            error: 'Invalid amount',
            sstAmount: 0,
            baseAmount: amount,
            totalAmount: amount,
            rate: 0
        };
    }
    
    const sstRates = {
        sales: {
            standard: 0.10,
            exempt: 0,
            zeroRated: 0,
            special: {
                alcohol: 0.10,
                tobacco: 0.10,
                vehicle: 0.10,
                'luxury-goods': 0.10
            }
        },
        service: {
            standard: 0.06,
            exempt: 0,
            'food-beverage': 0.06,
            'professional-services': 0.06,
            'telecommunications': 0.06,
            'digital-services': 0.06
        }
    };
    
    let taxRate = 0;
    
    if (taxType === 'sales') {
        if (sstRates.sales[itemType] !== undefined) {
            taxRate = sstRates.sales[itemType];
        } else if (sstRates.sales.special[itemType] !== undefined) {
            taxRate = sstRates.sales.special[itemType];
        } else {
            taxRate = sstRates.sales.standard;
        }
    } else if (taxType === 'service') {
        if (sstRates.service[itemType] !== undefined) {
            taxRate = sstRates.service[itemType];
        } else {
            taxRate = sstRates.service.standard;
        }
    }
    
    let baseAmount, sstAmount, totalAmount;
    
    if (isInclusive) {
        baseAmount = amount / (1 + taxRate);
        sstAmount = amount - baseAmount;
        totalAmount = amount;
    } else {
        baseAmount = amount;
        sstAmount = amount * taxRate;
        totalAmount = amount + sstAmount;
    }
    
    baseAmount = Math.round(baseAmount * 100) / 100;
    sstAmount = Math.round(sstAmount * 100) / 100;
    totalAmount = Math.round(totalAmount * 100) / 100;
    
    return {
        baseAmount: baseAmount,
        sstAmount: sstAmount,
        totalAmount: totalAmount,
        taxRate: taxRate * 100,
        taxType: taxType,
        itemType: itemType,
        breakdown: {
            taxableAmount: baseAmount,
            taxPercentage: taxRate * 100,
            taxAmount: sstAmount,
            grandTotal: totalAmount
        }
    };
}

function calculateSSTForTransaction(items) {
    let totalBaseAmount = 0;
    let totalSST = 0;
    let breakdown = [];
    
    items.forEach((item, index) => {
        const result = calculateSST(
            item.amount,
            item.taxType || 'sales',
            item.itemType || 'standard',
            item.isInclusive || false
        );
        
        totalBaseAmount += result.baseAmount;
        totalSST += result.sstAmount;
        
        breakdown.push({
            itemNo: index + 1,
            description: item.description || `Item ${index + 1}`,
            ...result.breakdown
        });
    });
    
    const totalAmount = totalBaseAmount + totalSST;
    
    return {
        totalBaseAmount: Math.round(totalBaseAmount * 100) / 100,
        totalSST: Math.round(totalSST * 100) / 100,
        totalAmount: Math.round(totalAmount * 100) / 100,
        itemCount: items.length,
        breakdown: breakdown,
        summary: {
            taxableAmount: Math.round(totalBaseAmount * 100) / 100,
            totalTax: Math.round(totalSST * 100) / 100,
            amountPayable: Math.round(totalAmount * 100) / 100
        }
    };
}

function getSSTRate(taxType, category = 'standard') {
    const rates = {
        sales: {
            standard: 10,
            exempt: 0,
            'zero-rated': 0,
            alcohol: 10,
            tobacco: 10,
            vehicle: 10,
            'luxury-goods': 10
        },
        service: {
            standard: 6,
            exempt: 0,
            'food-beverage': 6,
            'professional-services': 6,
            'telecommunications': 6,
            'digital-services': 6
        }
    };
    
    if (rates[taxType] && rates[taxType][category] !== undefined) {
        return rates[taxType][category];
    }
    
    return taxType === 'sales' ? 10 : 6;
}

function formatSSTResult(sstResult) {
    if (sstResult.error) {
        return `<div class="alert alert-error">${sstResult.error}</div>`;
    }
    
    const taxTypeText = sstResult.taxType === 'sales' ? 'Sales Tax' : 'Service Tax';
    
    return `
        <div class="sst-calculation-result">
            <h4>SST Calculation Result</h4>
            <div class="sst-breakdown">
                <div class="sst-row">
                    <span>Tax Type:</span>
                    <span>${taxTypeText}</span>
                </div>
                <div class="sst-row">
                    <span>Tax Rate:</span>
                    <span>${sstResult.taxRate}%</span>
                </div>
                <div class="sst-row">
                    <span>Taxable Amount:</span>
                    <span>RM ${sstResult.baseAmount.toFixed(2)}</span>
                </div>
                <div class="sst-row">
                    <span>SST Amount:</span>
                    <span class="sst-amount">RM ${sstResult.sstAmount.toFixed(2)}</span>
                </div>
                <div class="sst-row total">
                    <span>Total Amount:</span>
                    <span class="total-amount">RM ${sstResult.totalAmount.toFixed(2)}</span>
                </div>
            </div>
        </div>
    `;
}

function addSSTCalculatorToUI() {
    if (document.querySelector('.sst-calculator')) return;

    const sstHTML = `
        <div class="sst-calculator" style="margin-top: 20px; border-top: 1px solid #e2e8f0; padding-top: 20px;">
            <h3><i class="fas fa-calculator"></i> SST Calculator</h3>
            <div class="transaction-form">
                <div class="form-row">
                    <div class="form-group">
                        <label>Amount (RM)</label>
                        <input type="number" id="sstAmount" placeholder="0.00" step="0.01">
                    </div>
                    <div class="form-group">
                        <label>Tax Type</label>
                        <select id="sstType">
                            <option value="sales">Sales Tax (Goods)</option>
                            <option value="service">Service Tax (Services)</option>
                        </select>
                    </div>
                </div>
                
                <div class="form-group">
                    <label>Item Category</label>
                    <select id="sstCategory">
                        <optgroup label="Sales Tax">
                            <option value="standard">Standard Goods (10%)</option>
                            <option value="alcohol">Alcohol (10%)</option>
                            <option value="tobacco">Tobacco (10%)</option>
                            <option value="vehicle">Motor Vehicles (10%)</option>
                            <option value="exempt">Exempt Goods (0%)</option>
                        </optgroup>
                        <optgroup label="Service Tax">
                            <option value="standard">Standard Services (6%)</option>
                            <option value="food-beverage">Food & Beverage (6%)</option>
                            <option value="professional-services">Professional Services (6%)</option>
                            <option value="digital-services">Digital Services (6%)</option>
                        </optgroup>
                    </select>
                </div>
                
                <div class="form-group">
                    <label>
                        <input type="checkbox" id="sstInclusive">
                        Amount already includes SST
                    </label>
                </div>
                
                <button class="btn-primary" onclick="calculateAndDisplaySST()">
                    <i class="fas fa-calculator"></i> Calculate SST
                </button>
                
                <div id="sstResult" style="margin-top: 20px;"></div>
            </div>
        </div>
    `;
    
    const taxSection = document.querySelector('#corporate-tax');
    if (taxSection) {
        taxSection.insertAdjacentHTML('beforeend', sstHTML);
    }
}

function calculateAndDisplaySST() {
    const amount = parseFloat(document.getElementById('sstAmount').value) || 0;
    const taxType = document.getElementById('sstType').value;
    const itemType = document.getElementById('sstCategory').value;
    const isInclusive = document.getElementById('sstInclusive').checked;
    
    const result = calculateSST(amount, taxType, itemType, isInclusive);
    
    document.getElementById('sstResult').innerHTML = formatSSTResult(result);
}

// Update SST categories based on tax type selection
function updateSSTCategories() {
    const taxType = document.getElementById('sstType')?.value || 'sales';
    const categorySelect = document.getElementById('sstCategory');
    if (!categorySelect) return;
    
    if (taxType === 'sales') {
        categorySelect.innerHTML = `
            <option value="standard">Standard Goods (10%)</option>
            <option value="alcohol">Alcohol (10%)</option>
            <option value="tobacco">Tobacco (10%)</option>
            <option value="vehicle">Motor Vehicles (10%)</option>
            <option value="luxury-goods">Luxury Goods (10%)</option>
            <option value="exempt">Exempt Goods (0%)</option>
            <option value="zero-rated">Zero-Rated Goods (0%)</option>
        `;
    } else {
        categorySelect.innerHTML = `
            <option value="standard">Standard Services (6%)</option>
            <option value="food-beverage">Food & Beverage (6%)</option>
            <option value="professional-services">Professional Services (6%)</option>
            <option value="telecommunications">Telecommunications (6%)</option>
            <option value="digital-services">Digital Services (6%)</option>
            <option value="exempt">Exempt Services (0%)</option>
        `;
    }
}

// Update SST summary from business transactions
function updateSSTSummary() {
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth();
    
    let totalSales = 0;
    let totalServices = 0;
    let salesTaxCollected = 0;
    let serviceTaxCollected = 0;
    
    // Calculate from transactions
    if (typeof businessData !== 'undefined' && businessData.transactions) {
        businessData.transactions.forEach(tx => {
            const txDate = parseDateSafe(tx.date);
            if (txDate.getFullYear() === currentYear) {
                if (tx.type === 'income') {
                    // Check if transaction has SST category
                    if (tx.sstType === 'sales' || tx.category?.toLowerCase().includes('sales')) {
                        totalSales += tx.amount;
                        if (tx.sstIncluded || tx.sstAmount) {
                            salesTaxCollected += tx.sstAmount || (tx.amount * 0.10 / 1.10);
                        }
                    } else if (tx.sstType === 'service' || tx.category?.toLowerCase().includes('service')) {
                        totalServices += tx.amount;
                        if (tx.sstIncluded || tx.sstAmount) {
                            serviceTaxCollected += tx.sstAmount || (tx.amount * 0.06 / 1.06);
                        }
                    } else {
                        // Default to sales for income
                        totalSales += tx.amount;
                    }
                }
            }
        });
    }
    
    // Update UI elements
    const totalSalesEl = document.getElementById('sstTotalSales');
    const salesTaxEl = document.getElementById('sstSalesTax');
    const serviceTaxEl = document.getElementById('sstServiceTax');
    const totalPayableEl = document.getElementById('sstTotalPayable');
    
    if (totalSalesEl) totalSalesEl.textContent = 'RM ' + formatNumber(totalSales + totalServices);
    if (salesTaxEl) salesTaxEl.textContent = 'RM ' + formatNumber(salesTaxCollected);
    if (serviceTaxEl) serviceTaxEl.textContent = 'RM ' + formatNumber(serviceTaxCollected);
    if (totalPayableEl) totalPayableEl.textContent = 'RM ' + formatNumber(salesTaxCollected + serviceTaxCollected);
    
    // Check registration threshold
    const threshold = 500000;
    const totalTaxableSales = totalSales + totalServices;
    const thresholdStatus = document.getElementById('sst-threshold-status');
    
    if (thresholdStatus) {
        if (totalTaxableSales >= threshold) {
            thresholdStatus.innerHTML = `<span style="color: #ef4444;"><i class="fas fa-exclamation-triangle"></i> SST Registration Required (Exceeded RM 500,000 threshold)</span>`;
        } else {
            const remaining = threshold - totalTaxableSales;
            thresholdStatus.innerHTML = `<span style="color: #10b981;"><i class="fas fa-check-circle"></i> Below threshold. RM ${formatNumber(remaining)} until registration required.</span>`;
        }
    }
    
    return {
        totalSales,
        totalServices,
        salesTaxCollected,
        serviceTaxCollected,
        totalSST: salesTaxCollected + serviceTaxCollected
    };
}

// Global scope exports
window.calculateSST = calculateSST;
window.calculateSSTForTransaction = calculateSSTForTransaction;
window.calculateAndDisplaySST = calculateAndDisplaySST;
window.updateSSTCategories = updateSSTCategories;
window.updateSSTSummary = updateSSTSummary;
