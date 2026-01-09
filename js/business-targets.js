/**
 * Business Targets & Monitoring Module
 * Target-based performance tracking for business planning
 * Version: 1.0.0 - Initial release - 9 Jan 2026
 */

// ==================== STATE ====================
const TARGETS_KEY = 'ezcubic_business_targets';
let businessTargets = {
    enabled: false,
    period: 'monthly', // monthly, quarterly, yearly
    targetProfitMargin: 30, // percentage
    fixedCosts: {
        salaries: 0,
        rent: 0,
        utilities: 0,
        marketing: 0,
        rd: 0,
        other: 0
    },
    variableCostPerUnit: 0,
    sellingPricePerUnit: 0,
    targetUnits: 0,
    targetRevenue: 0,
    createdAt: null,
    updatedAt: null
};

// ==================== INITIALIZATION ====================
function initializeBusinessTargets() {
    loadBusinessTargets();
    console.log('📊 Business Targets module loaded');
}

function loadBusinessTargets() {
    const stored = localStorage.getItem(TARGETS_KEY);
    if (stored) {
        businessTargets = { ...businessTargets, ...JSON.parse(stored) };
    }
}

function saveBusinessTargets() {
    businessTargets.updatedAt = new Date().toISOString();
    localStorage.setItem(TARGETS_KEY, JSON.stringify(businessTargets));
}

// ==================== UI DISPLAY ====================
function showBusinessTargets() {
    // Show section
    if (typeof showSection === 'function') {
        showSection('business-targets');
    }
    
    renderBusinessTargets();
}
window.showBusinessTargets = showBusinessTargets;

function renderBusinessTargets() {
    const container = document.getElementById('businessTargetsContent');
    if (!container) return;
    
    if (!businessTargets.enabled) {
        container.innerHTML = renderTargetsSetup();
    } else {
        container.innerHTML = renderTargetsMonitoring();
    }
    
    attachEventListeners();
}

// ==================== SETUP VIEW ====================
function renderTargetsSetup() {
    return `
        <div class="targets-setup">
            <div class="setup-header">
                <h2>📊 Business Targets Setup</h2>
                <p>Set your business targets to monitor performance and track progress toward your goals.</p>
            </div>
            
            <div class="setup-card">
                <h3>🎯 Target Settings</h3>
                
                <div class="form-group">
                    <label>Monitoring Period</label>
                    <select id="targetPeriod" class="form-control">
                        <option value="monthly" selected>Monthly</option>
                        <option value="quarterly">Quarterly (3 months)</option>
                        <option value="yearly">Yearly</option>
                    </select>
                </div>
                
                <div class="form-group">
                    <label>Target Profit Margin (%)</label>
                    <input type="number" id="targetMargin" class="form-control" 
                           value="30" min="0" max="100" step="1">
                    <small>Expected profit margin after all costs</small>
                </div>
            </div>
            
            <div class="setup-card">
                <h3>💰 Fixed Costs (Per Month)</h3>
                
                <div class="form-row">
                    <div class="form-group">
                        <label>HR/Salaries</label>
                        <input type="number" id="costSalaries" class="form-control" 
                               value="0" min="0" step="100">
                    </div>
                    
                    <div class="form-group">
                        <label>Rent/Properties</label>
                        <input type="number" id="costRent" class="form-control" 
                               value="0" min="0" step="100">
                    </div>
                </div>
                
                <div class="form-row">
                    <div class="form-group">
                        <label>Utilities</label>
                        <input type="number" id="costUtilities" class="form-control" 
                               value="0" min="0" step="50">
                    </div>
                    
                    <div class="form-group">
                        <label>Marketing</label>
                        <input type="number" id="costMarketing" class="form-control" 
                               value="0" min="0" step="100">
                    </div>
                </div>
                
                <div class="form-row">
                    <div class="form-group">
                        <label>R&D/Development</label>
                        <input type="number" id="costRD" class="form-control" 
                               value="0" min="0" step="100">
                    </div>
                    
                    <div class="form-group">
                        <label>Other Fixed Costs</label>
                        <input type="number" id="costOther" class="form-control" 
                               value="0" min="0" step="100">
                    </div>
                </div>
                
                <div class="cost-summary">
                    <strong>Total Fixed Costs: RM <span id="totalFixedCosts">0.00</span>/month</strong>
                </div>
            </div>
            
            <div class="setup-card">
                <h3>📦 Revenue Settings</h3>
                
                <div class="form-row">
                    <div class="form-group">
                        <label>Average Selling Price (RM per unit/plate/bowl)</label>
                        <input type="number" id="sellingPrice" class="form-control" 
                               value="0" min="0" step="0.50">
                    </div>
                    
                    <div class="form-group">
                        <label>Variable Cost Per Unit (RM)</label>
                        <input type="number" id="variableCost" class="form-control" 
                               value="0" min="0" step="0.10">
                        <small>Materials, packaging per unit</small>
                    </div>
                </div>
            </div>
            
            <div class="setup-actions">
                <button class="btn-primary" onclick="calculateAndSaveTargets()">
                    🎯 Calculate & Start Monitoring
                </button>
            </div>
        </div>
    `;
}

// ==================== MONITORING VIEW ====================
function renderTargetsMonitoring() {
    const actual = calculateActualPerformance();
    const progress = calculateProgress(actual);
    
    return `
        <div class="targets-monitoring">
            <div class="monitoring-header">
                <h2>📊 Business Performance Monitoring</h2>
                <button class="btn-outline" onclick="editTargets()">⚙️ Edit Targets</button>
            </div>
            
            <!-- Summary Cards -->
            <div class="metrics-grid">
                ${renderMetricCard('Revenue', actual.revenue, businessTargets.targetRevenue, 'RM', '💰')}
                ${renderMetricCard('Units Sold', actual.units, businessTargets.targetUnits, ' units', '📦')}
                ${renderMetricCard('Profit Margin', actual.profitMargin, businessTargets.targetProfitMargin, '%', '📈')}
                ${renderMetricCard('Break-Even', actual.units, businessTargets.breakEvenUnits, ' units', '⚖️', true)}
            </div>
            
            <!-- Progress Tracking -->
            <div class="progress-section">
                <h3>📈 Progress Tracking</h3>
                ${renderProgressBar('Revenue Target', actual.revenue, businessTargets.targetRevenue, 'RM')}
                ${renderProgressBar('Units Target', actual.units, businessTargets.targetUnits, ' units')}
                ${renderProgressBar('Profit Margin', actual.profitMargin, businessTargets.targetProfitMargin, '%')}
            </div>
            
            <!-- Insights & Recommendations -->
            <div class="insights-section">
                <h3>💡 Insights & Recommendations</h3>
                ${renderInsights(actual, progress)}
            </div>
            
            <!-- Target Details -->
            <div class="target-details">
                <h3>🎯 Your Targets (${capitalizeFirst(businessTargets.period)})</h3>
                <div class="details-grid">
                    <div class="detail-item">
                        <span class="detail-label">Target Profit Margin:</span>
                        <span class="detail-value">${businessTargets.targetProfitMargin}%</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Fixed Costs:</span>
                        <span class="detail-value">RM ${calculateTotalFixedCosts().toFixed(2)}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Selling Price:</span>
                        <span class="detail-value">RM ${businessTargets.sellingPricePerUnit.toFixed(2)}/unit</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Variable Cost:</span>
                        <span class="detail-value">RM ${businessTargets.variableCostPerUnit.toFixed(2)}/unit</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Break-Even Point:</span>
                        <span class="detail-value">${businessTargets.breakEvenUnits} units</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Target Units:</span>
                        <span class="detail-value">${businessTargets.targetUnits} units</span>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// ==================== CALCULATION FUNCTIONS ====================
function calculateAndSaveTargets() {
    // Get all inputs
    const period = document.getElementById('targetPeriod').value;
    const margin = parseFloat(document.getElementById('targetMargin').value) || 30;
    
    businessTargets.period = period;
    businessTargets.targetProfitMargin = margin;
    
    // Fixed costs
    businessTargets.fixedCosts = {
        salaries: parseFloat(document.getElementById('costSalaries').value) || 0,
        rent: parseFloat(document.getElementById('costRent').value) || 0,
        utilities: parseFloat(document.getElementById('costUtilities').value) || 0,
        marketing: parseFloat(document.getElementById('costMarketing').value) || 0,
        rd: parseFloat(document.getElementById('costRD').value) || 0,
        other: parseFloat(document.getElementById('costOther').value) || 0
    };
    
    // Revenue settings
    businessTargets.sellingPricePerUnit = parseFloat(document.getElementById('sellingPrice').value) || 0;
    businessTargets.variableCostPerUnit = parseFloat(document.getElementById('variableCost').value) || 0;
    
    // Validate
    if (businessTargets.sellingPricePerUnit <= 0) {
        showToast('Please enter a valid selling price', 'error');
        return;
    }
    
    // Calculate targets
    const totalFixedCosts = calculateTotalFixedCosts();
    const contributionMargin = businessTargets.sellingPricePerUnit - businessTargets.variableCostPerUnit;
    
    if (contributionMargin <= 0) {
        showToast('Selling price must be higher than variable cost!', 'error');
        return;
    }
    
    // Break-even point (units needed to cover fixed costs)
    businessTargets.breakEvenUnits = Math.ceil(totalFixedCosts / contributionMargin);
    
    // Target units (to achieve desired profit margin)
    // Formula: (Fixed Costs + Desired Profit) / Contribution Margin
    const desiredProfit = totalFixedCosts * (margin / 100) / (1 - margin / 100);
    businessTargets.targetUnits = Math.ceil((totalFixedCosts + desiredProfit) / contributionMargin);
    
    // Target revenue
    businessTargets.targetRevenue = businessTargets.targetUnits * businessTargets.sellingPricePerUnit;
    
    businessTargets.enabled = true;
    businessTargets.createdAt = businessTargets.createdAt || new Date().toISOString();
    
    saveBusinessTargets();
    showToast('✅ Targets set successfully! Monitoring started.', 'success');
    renderBusinessTargets();
}
window.calculateAndSaveTargets = calculateAndSaveTargets;

function calculateTotalFixedCosts() {
    return Object.values(businessTargets.fixedCosts).reduce((sum, cost) => sum + cost, 0);
}

function calculateActualPerformance() {
    // Get actual data from transactions
    const transactions = window.businessData?.transactions || [];
    
    // Filter by period
    const periodStart = getPeriodStartDate();
    const periodTransactions = transactions.filter(t => {
        const txDate = new Date(t.date);
        return txDate >= periodStart;
    });
    
    // Calculate actual revenue and expenses
    const revenue = periodTransactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + t.amount, 0);
    
    const expenses = periodTransactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0);
    
    const profit = revenue - expenses;
    const profitMargin = revenue > 0 ? (profit / revenue) * 100 : 0;
    
    // Estimate units sold (revenue / selling price)
    const units = businessTargets.sellingPricePerUnit > 0 
        ? Math.floor(revenue / businessTargets.sellingPricePerUnit) 
        : 0;
    
    return {
        revenue,
        expenses,
        profit,
        profitMargin,
        units
    };
}

function calculateProgress(actual) {
    return {
        revenueProgress: businessTargets.targetRevenue > 0 
            ? (actual.revenue / businessTargets.targetRevenue) * 100 
            : 0,
        unitsProgress: businessTargets.targetUnits > 0 
            ? (actual.units / businessTargets.targetUnits) * 100 
            : 0,
        marginProgress: businessTargets.targetProfitMargin > 0 
            ? (actual.profitMargin / businessTargets.targetProfitMargin) * 100 
            : 0,
        breakEvenProgress: businessTargets.breakEvenUnits > 0 
            ? (actual.units / businessTargets.breakEvenUnits) * 100 
            : 0
    };
}

function getPeriodStartDate() {
    const now = new Date();
    
    switch (businessTargets.period) {
        case 'monthly':
            return new Date(now.getFullYear(), now.getMonth(), 1);
        case 'quarterly':
            const quarter = Math.floor(now.getMonth() / 3);
            return new Date(now.getFullYear(), quarter * 3, 1);
        case 'yearly':
            return new Date(now.getFullYear(), 0, 1);
        default:
            return new Date(now.getFullYear(), now.getMonth(), 1);
    }
}

// ==================== UI COMPONENTS ====================
function renderMetricCard(label, actual, target, unit, icon, isBreakEven = false) {
    const percentage = target > 0 ? (actual / target) * 100 : 0;
    const status = isBreakEven 
        ? (actual >= target ? 'success' : 'warning')
        : (percentage >= 100 ? 'success' : percentage >= 80 ? 'warning' : 'danger');
    
    return `
        <div class="metric-card metric-${status}">
            <div class="metric-icon">${icon}</div>
            <div class="metric-content">
                <div class="metric-label">${label}</div>
                <div class="metric-value">${formatNumber(actual)}${unit}</div>
                <div class="metric-target">Target: ${formatNumber(target)}${unit}</div>
                <div class="metric-percentage ${status}">${percentage.toFixed(1)}%</div>
            </div>
        </div>
    `;
}

function renderProgressBar(label, actual, target, unit) {
    const percentage = Math.min((actual / target) * 100, 100);
    const status = percentage >= 100 ? 'success' : percentage >= 80 ? 'warning' : 'danger';
    
    return `
        <div class="progress-item">
            <div class="progress-header">
                <span>${label}</span>
                <span>${formatNumber(actual)}${unit} / ${formatNumber(target)}${unit}</span>
            </div>
            <div class="progress-bar-container">
                <div class="progress-bar progress-${status}" style="width: ${percentage}%"></div>
            </div>
            <div class="progress-percentage">${percentage.toFixed(1)}%</div>
        </div>
    `;
}

function renderInsights(actual, progress) {
    const insights = [];
    
    // Revenue insights
    if (progress.revenueProgress < 50) {
        const daysInPeriod = getDaysInPeriod();
        const daysPassed = getDaysPassed();
        const expectedProgress = (daysPassed / daysInPeriod) * 100;
        
        if (progress.revenueProgress < expectedProgress - 10) {
            insights.push({
                type: 'warning',
                icon: '⚠️',
                title: 'Behind Revenue Target',
                message: `You're ${(expectedProgress - progress.revenueProgress).toFixed(1)}% behind schedule. Consider increasing marketing or promotions.`
            });
        }
    } else if (progress.revenueProgress >= 100) {
        insights.push({
            type: 'success',
            icon: '🎉',
            title: 'Revenue Target Achieved!',
            message: `Congratulations! You've hit your revenue target. Keep up the great work!`
        });
    }
    
    // Margin insights
    if (actual.profitMargin < businessTargets.targetProfitMargin) {
        const marginGap = businessTargets.targetProfitMargin - actual.profitMargin;
        insights.push({
            type: 'info',
            icon: '💡',
            title: 'Profit Margin Below Target',
            message: `Your margin is ${marginGap.toFixed(1)}% below target. Consider reducing costs or increasing prices slightly.`
        });
    }
    
    // Break-even insights
    if (actual.units < businessTargets.breakEvenUnits) {
        const unitsNeeded = businessTargets.breakEvenUnits - actual.units;
        insights.push({
            type: 'warning',
            icon: '⚖️',
            title: 'Below Break-Even Point',
            message: `You need ${unitsNeeded} more units to cover all fixed costs.`
        });
    } else {
        insights.push({
            type: 'success',
            icon: '✅',
            title: 'Above Break-Even',
            message: `You're profitable! Every additional unit sold adds RM ${(businessTargets.sellingPricePerUnit - businessTargets.variableCostPerUnit).toFixed(2)} to profit.`
        });
    }
    
    if (insights.length === 0) {
        insights.push({
            type: 'info',
            icon: '📊',
            title: 'On Track',
            message: 'Your business is performing well and on track to meet targets!'
        });
    }
    
    return insights.map(insight => `
        <div class="insight-card insight-${insight.type}">
            <div class="insight-icon">${insight.icon}</div>
            <div class="insight-content">
                <h4>${insight.title}</h4>
                <p>${insight.message}</p>
            </div>
        </div>
    `).join('');
}

// ==================== HELPER FUNCTIONS ====================
function getDaysInPeriod() {
    const now = new Date();
    switch (businessTargets.period) {
        case 'monthly':
            return new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
        case 'quarterly':
            return 90;
        case 'yearly':
            return 365;
        default:
            return 30;
    }
}

function getDaysPassed() {
    const now = new Date();
    const periodStart = getPeriodStartDate();
    const diffTime = Math.abs(now - periodStart);
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

function formatNumber(num) {
    if (num >= 1000000) {
        return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
        return (num / 1000).toFixed(1) + 'K';
    }
    return num.toFixed(2);
}

function capitalizeFirst(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

function editTargets() {
    businessTargets.enabled = false;
    renderBusinessTargets();
}
window.editTargets = editTargets;

// ==================== EVENT LISTENERS ====================
function attachEventListeners() {
    // Update total fixed costs on input change
    const costInputs = ['costSalaries', 'costRent', 'costUtilities', 'costMarketing', 'costRD', 'costOther'];
    costInputs.forEach(id => {
        const input = document.getElementById(id);
        if (input) {
            input.addEventListener('input', updateTotalFixedCosts);
        }
    });
}

function updateTotalFixedCosts() {
    const total = 
        (parseFloat(document.getElementById('costSalaries').value) || 0) +
        (parseFloat(document.getElementById('costRent').value) || 0) +
        (parseFloat(document.getElementById('costUtilities').value) || 0) +
        (parseFloat(document.getElementById('costMarketing').value) || 0) +
        (parseFloat(document.getElementById('costRD').value) || 0) +
        (parseFloat(document.getElementById('costOther').value) || 0);
    
    const display = document.getElementById('totalFixedCosts');
    if (display) {
        display.textContent = total.toFixed(2);
    }
}

// ==================== INITIALIZE ON LOAD ====================
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeBusinessTargets);
} else {
    initializeBusinessTargets();
}
