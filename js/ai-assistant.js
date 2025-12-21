// ==================== AI-ASSISTANT.JS ====================
// EZCubic Intelligent AI Assistant
// Proactive insights, automation, and intelligent analysis

// AI Assistant Configuration
const AI_CONFIG = {
    mode: 'local', // local, hybrid, or cloud
    enabledFeatures: {
        proactiveInsights: true,
        anomalyDetection: true,
        taxOptimization: true,
        cashFlowPrediction: true,
        autoCategorization: true
    }
};

// AI State
let aiState = {
    currentMode: 'assistant',
    insights: [],
    tasksCompleted: 0,
    timeSaved: 0,
    analyticsPeriod: 'month',
    learningProgress: 0,
    isProcessing: false
};

// ==================== INITIALIZATION ====================
function initAIAssistant() {
    console.log('🚀 Initializing AI Assistant...');
    
    try {
        // Load saved state
        loadAIState();
        
        // Generate initial insights
        setTimeout(() => {
            try {
                refreshInsights();
                updateAIAnalytics();
                updateAIStats();
            } catch (e) {
                console.log('AI insights init:', e.message);
            }
        }, 500);
        
        console.log('✅ AI Assistant initialized');
    } catch (e) {
        console.log('AI Assistant init error:', e.message);
    }
}

function loadAIState() {
    const saved = localStorage.getItem('ezcubic_ai_state');
    if (saved) {
        try {
            const parsed = JSON.parse(saved);
            aiState = { ...aiState, ...parsed };
        } catch (e) {
            console.log('AI state reset');
        }
    }
}

function saveAIState() {
    localStorage.setItem('ezcubic_ai_state', JSON.stringify(aiState));
}

// ==================== AI MODE SWITCHING ====================
function setAIMode(mode) {
    aiState.currentMode = mode;
    
    // Update UI
    document.querySelectorAll('.mode-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');
    
    // Update insights based on mode
    refreshInsights();
    
    showNotification(`AI Mode: ${mode.charAt(0).toUpperCase() + mode.slice(1)}`, 'info');
    saveAIState();
}

// ==================== PROACTIVE INSIGHTS ====================
function refreshInsights() {
    const container = document.getElementById('aiInsightsContainer');
    if (!container) return;
    
    container.innerHTML = `
        <div style="text-align: center; padding: 40px; color: #94a3b8;">
            <i class="fas fa-spinner fa-spin" style="font-size: 24px; margin-bottom: 10px;"></i>
            <p>Analyzing your business data...</p>
        </div>
    `;
    
    setTimeout(() => {
        const insights = generateProactiveInsights();
        displayInsights(insights);
    }, 800);
}

function generateProactiveInsights() {
    const insights = [];
    const transactions = businessData.transactions || [];
    const bills = businessData.bills || [];
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();
    
    // Filter current month transactions
    const monthTransactions = transactions.filter(t => {
        const d = new Date(t.date);
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    });
    
    const monthIncome = monthTransactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const monthExpenses = monthTransactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    
    // 1. Cash Flow Analysis
    if (monthExpenses > monthIncome * 0.9) {
        insights.push({
            type: 'warning',
            priority: 'high',
            icon: 'fa-exclamation-triangle',
            title: 'High Expense Alert',
            description: `Your expenses (RM ${formatNumber(monthExpenses)}) are ${monthIncome > 0 ? Math.round((monthExpenses / monthIncome) * 100) : 100}% of your income this month. Consider reviewing non-essential spending.`,
            action: "showSection('expenses')",
            actionText: 'Review Expenses'
        });
    } else if (monthIncome > monthExpenses * 1.5) {
        insights.push({
            type: 'success',
            priority: 'low',
            icon: 'fa-chart-line',
            title: 'Strong Profit Margin',
            description: `Great job! Your profit margin is ${monthIncome > 0 ? Math.round(((monthIncome - monthExpenses) / monthIncome) * 100) : 0}% this month. Consider investing surplus in business growth.`,
            action: "showSection('reports')",
            actionText: 'View Reports'
        });
    }
    
    // 2. Upcoming Bills
    const upcomingBills = bills.filter(b => {
        if (!b.dueDate || b.isPaid) return false;
        const due = new Date(b.dueDate);
        const daysUntil = Math.ceil((due - currentDate) / (1000 * 60 * 60 * 24));
        return daysUntil >= 0 && daysUntil <= 7;
    });
    
    if (upcomingBills.length > 0) {
        const totalDue = upcomingBills.reduce((s, b) => s + (b.amount || 0), 0);
        insights.push({
            type: 'warning',
            priority: 'high',
            icon: 'fa-calendar-alt',
            title: `${upcomingBills.length} Bills Due Soon`,
            description: `You have RM ${formatNumber(totalDue)} in bills due within the next 7 days. Ensure sufficient funds are available.`,
            action: "showSection('bills')",
            actionText: 'View Bills'
        });
    }
    
    // 3. Tax Optimization
    const yearIncome = transactions.filter(t => {
        const d = new Date(t.date);
        return d.getFullYear() === currentYear && t.type === 'income';
    }).reduce((s, t) => s + t.amount, 0);
    
    const yearExpenses = transactions.filter(t => {
        const d = new Date(t.date);
        return d.getFullYear() === currentYear && t.type === 'expense';
    }).reduce((s, t) => s + t.amount, 0);
    
    const taxableProfit = yearIncome - yearExpenses;
    
    if (taxableProfit > 150000) {
        insights.push({
            type: 'info',
            priority: 'medium',
            icon: 'fa-percentage',
            title: 'Tax Bracket Alert',
            description: `Your taxable profit (RM ${formatNumber(taxableProfit)}) exceeds RM 150,000. You're now in the 17% bracket. Consider tax planning strategies.`,
            action: "showSection('taxes')",
            actionText: 'Tax Calculator'
        });
    }
    
    // 4. SST Registration Check
    if (yearIncome > 400000) {
        insights.push({
            type: 'warning',
            priority: 'high',
            icon: 'fa-file-invoice',
            title: 'SST Registration Reminder',
            description: `Your annual revenue (RM ${formatNumber(yearIncome)}) is approaching the RM 500,000 SST threshold. Prepare for registration if not already registered.`,
            action: "showTaxTab('sst')",
            actionText: 'SST Calculator'
        });
    }
    
    // 5. Uncategorized Transactions
    const uncategorized = transactions.filter(t => !t.category || t.category === 'Other' || t.category === 'Uncategorized');
    if (uncategorized.length > 5) {
        insights.push({
            type: 'info',
            priority: 'medium',
            icon: 'fa-tags',
            title: `${uncategorized.length} Uncategorized Transactions`,
            description: 'Proper categorization helps with accurate reporting and tax deductions. Let me help categorize them automatically.',
            action: "runAutomation('categorize')",
            actionText: 'Auto-Categorize'
        });
    }
    
    // 6. Monthly Comparison
    const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;
    
    const lastMonthIncome = transactions.filter(t => {
        const d = new Date(t.date);
        return d.getMonth() === lastMonth && d.getFullYear() === lastMonthYear && t.type === 'income';
    }).reduce((s, t) => s + t.amount, 0);
    
    if (lastMonthIncome > 0 && monthIncome > 0) {
        const change = ((monthIncome - lastMonthIncome) / lastMonthIncome) * 100;
        if (Math.abs(change) > 20) {
            insights.push({
                type: change > 0 ? 'success' : 'warning',
                priority: change > 0 ? 'low' : 'medium',
                icon: change > 0 ? 'fa-arrow-up' : 'fa-arrow-down',
                title: `Income ${change > 0 ? 'Increased' : 'Decreased'} ${Math.abs(change).toFixed(0)}%`,
                description: `Your income ${change > 0 ? 'grew' : 'dropped'} from RM ${formatNumber(lastMonthIncome)} to RM ${formatNumber(monthIncome)} compared to last month.`,
                action: "showSection('monthly-reports')",
                actionText: 'View Trends'
            });
        }
    }
    
    // Update insight count
    aiState.insights = insights;
    document.getElementById('aiInsightsCount').textContent = insights.length;
    saveAIState();
    
    return insights;
}

function displayInsights(insights) {
    const container = document.getElementById('aiInsightsContainer');
    if (!container) return;
    
    if (insights.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #94a3b8;">
                <i class="fas fa-check-circle" style="font-size: 48px; color: #10b981; margin-bottom: 15px;"></i>
                <h4 style="color: white; margin-bottom: 10px;">All Good!</h4>
                <p>No urgent insights at the moment. Keep up the great work!</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = insights.map(insight => `
        <div class="ai-insight-card ${insight.priority}">
            <div class="insight-header">
                <i class="fas ${insight.icon}"></i>
                <h4>${insight.title}</h4>
                <span class="insight-priority ${insight.priority}">${insight.priority.toUpperCase()}</span>
            </div>
            <div class="insight-body">
                <p>${insight.description}</p>
            </div>
            <div class="insight-actions">
                <button class="insight-action-btn" onclick="${insight.action}">
                    <i class="fas fa-arrow-right"></i> ${insight.actionText}
                </button>
            </div>
        </div>
    `).join('');
}

// ==================== AI QUERY PROCESSING ====================
function handleAIQueryKeyPress(event) {
    if (event.key === 'Enter') {
        processAIQuery();
    }
}

function askAIExample(query) {
    document.getElementById('aiQueryInput').value = query;
    processAIQuery();
}

async function processAIQuery() {
    const input = document.getElementById('aiQueryInput');
    const query = input.value.trim();
    
    if (!query) return;
    
    const container = document.getElementById('aiResponseContainer');
    
    // Add user message
    container.innerHTML += `
        <div class="ai-response" style="justify-content: flex-end;">
            <div class="response-content" style="background: rgba(59, 130, 246, 0.2); padding: 15px; border-radius: 10px; max-width: 80%;">
                <div class="response-text" style="color: #e2e8f0;">${query}</div>
            </div>
        </div>
    `;
    
    input.value = '';
    
    // Show typing indicator
    container.innerHTML += `
        <div class="ai-response" id="typingIndicator">
            <div class="ai-avatar"><img src="images/ai-logo.png" alt="AI" class="ai-logo-img"></div>
            <div class="response-content">
                <div class="response-text" style="color: #94a3b8;">
                    <i class="fas fa-spinner fa-spin"></i> Thinking...
                </div>
            </div>
        </div>
    `;
    
    container.scrollTop = container.scrollHeight;
    
    // Process query
    setTimeout(() => {
        const response = generateAIResponse(query);
        
        // Remove typing indicator
        const typing = document.getElementById('typingIndicator');
        if (typing) typing.remove();
        
        // Add AI response
        container.innerHTML += `
            <div class="ai-response">
                <div class="ai-avatar"><img src="images/ai-logo.png" alt="AI" class="ai-logo-img"></div>
                <div class="response-content">
                    <div class="response-text">${response.text}</div>
                    ${response.actions ? `
                        <div class="response-actions">
                            ${response.actions.map(a => `
                                <button class="response-action" onclick="${a.action}">${a.label}</button>
                            `).join('')}
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
        
        container.scrollTop = container.scrollHeight;
        aiState.tasksCompleted++;
        updateAIStats();
        saveAIState();
    }, 1000);
}

function generateAIResponse(query) {
    const lowerQuery = query.toLowerCase();
    const transactions = businessData.transactions || [];
    const bills = businessData.bills || [];
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth();
    
    // Calculate common metrics
    const yearIncome = transactions.filter(t => new Date(t.date).getFullYear() === currentYear && t.type === 'income')
        .reduce((s, t) => s + t.amount, 0);
    const yearExpenses = transactions.filter(t => new Date(t.date).getFullYear() === currentYear && t.type === 'expense')
        .reduce((s, t) => s + t.amount, 0);
    const monthIncome = transactions.filter(t => {
        const d = new Date(t.date);
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear && t.type === 'income';
    }).reduce((s, t) => s + t.amount, 0);
    const monthExpenses = transactions.filter(t => {
        const d = new Date(t.date);
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear && t.type === 'expense';
    }).reduce((s, t) => s + t.amount, 0);
    
    // ==================== ACCOUNTING BASICS FOR BEGINNERS ====================
    
    // What is accounting
    if (lowerQuery.includes('what is accounting') || (lowerQuery.includes('accounting') && lowerQuery.includes('why'))) {
        return {
            text: `<strong>📚 What is Accounting? (Simple Explanation)</strong>
                <div style="margin-top: 15px; line-height: 1.8;">
                    <p>Accounting is simply <strong>keeping track of your money</strong> - what comes in and what goes out.</p>
                    
                    <div style="background: rgba(59, 130, 246, 0.15); padding: 15px; border-radius: 10px; margin: 15px 0;">
                        <strong style="color: #60a5fa;">🎯 Think of it like this:</strong>
                        <p style="color: #cbd5e1; margin-top: 8px;">It's like keeping a diary for your business money. You write down every time you earn money and every time you spend money.</p>
                    </div>
                    
                    <strong style="color: #f59e0b;">Why do you need it?</strong>
                    <ul style="color: #cbd5e1; padding-left: 20px; margin-top: 10px;">
                        <li>Know if you're making profit or losing money</li>
                        <li>Pay correct taxes (not more, not less!)</li>
                        <li>Make better business decisions</li>
                        <li>Required by law for businesses in Malaysia</li>
                    </ul>
                </div>`,
            actions: [
                { label: '🎓 Start Tutorial', action: "startBeginnerTutorial()" },
                { label: '💰 Learn Income vs Expenses', action: "askAIExample('Explain income and expenses in simple terms')" }
            ]
        };
    }
    
    // Income vs Expenses explanation
    if ((lowerQuery.includes('income') && lowerQuery.includes('expense')) || lowerQuery.includes('money in') || lowerQuery.includes('money out')) {
        return {
            text: `<strong>💰 Income vs Expenses - Super Simple!</strong>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-top: 20px;">
                    <div style="background: rgba(16, 185, 129, 0.2); padding: 20px; border-radius: 12px; border-top: 4px solid #10b981;">
                        <h4 style="color: #6ee7b7;"><i class="fas fa-arrow-circle-down"></i> INCOME</h4>
                        <p style="color: white; font-size: 14px; margin: 10px 0;">= Money coming IN to you</p>
                        <div style="color: #94a3b8; font-size: 13px;">
                            <strong>Examples:</strong>
                            <ul style="padding-left: 18px; margin-top: 8px;">
                                <li>You sell products/services</li>
                                <li>Customer pays you</li>
                                <li>Interest from bank</li>
                                <li>Rental income</li>
                            </ul>
                        </div>
                    </div>
                    <div style="background: rgba(239, 68, 68, 0.2); padding: 20px; border-radius: 12px; border-top: 4px solid #ef4444;">
                        <h4 style="color: #fca5a5;"><i class="fas fa-arrow-circle-up"></i> EXPENSES</h4>
                        <p style="color: white; font-size: 14px; margin: 10px 0;">= Money going OUT from you</p>
                        <div style="color: #94a3b8; font-size: 13px;">
                            <strong>Examples:</strong>
                            <ul style="padding-left: 18px; margin-top: 8px;">
                                <li>Pay for rent, utilities</li>
                                <li>Buy stock/supplies</li>
                                <li>Staff salaries</li>
                                <li>Transport, marketing</li>
                            </ul>
                        </div>
                    </div>
                </div>
                <div style="background: rgba(245, 158, 11, 0.2); padding: 15px; border-radius: 10px; margin-top: 15px; text-align: center;">
                    <strong style="color: #fcd34d; font-size: 16px;">💡 The Magic Formula:</strong>
                    <p style="color: white; font-size: 18px; margin-top: 8px;">Income - Expenses = <strong>PROFIT</strong></p>
                </div>`,
            actions: [
                { label: '➕ Record Income', action: "showSection('income')" },
                { label: '➖ Record Expense', action: "showSection('expenses')" },
                { label: '❓ What is Profit?', action: "askAIExample('What is profit and how do I calculate it?')" }
            ]
        };
    }
    
    // What is profit
    if (lowerQuery.includes('profit') && (lowerQuery.includes('what') || lowerQuery.includes('explain') || lowerQuery.includes('calculate'))) {
        const currentProfit = monthIncome - monthExpenses;
        return {
            text: `<strong>🎯 What is Profit? (Easy Explanation)</strong>
                <div style="margin-top: 15px; line-height: 1.8;">
                    <p><strong>Profit</strong> = The money LEFT OVER after you pay all your costs.</p>
                    
                    <div style="background: rgba(16, 185, 129, 0.15); padding: 20px; border-radius: 10px; margin: 15px 0;">
                        <strong style="color: #6ee7b7;">Simple Example:</strong>
                        <div style="margin-top: 10px; color: #cbd5e1;">
                            <p>You sell nasi lemak for RM 10</p>
                            <p>Cost of ingredients: RM 4</p>
                            <p>Your <strong style="color: #10b981;">PROFIT = RM 6</strong></p>
                        </div>
                    </div>
                    
                    <div style="background: rgba(59, 130, 246, 0.15); padding: 15px; border-radius: 10px; margin-bottom: 15px;">
                        <strong style="color: #60a5fa;">📊 Your Current Month:</strong>
                        <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; margin-top: 10px;">
                            <div style="text-align: center;">
                                <div style="color: #6ee7b7; font-size: 18px; font-weight: bold;">RM ${formatNumber(monthIncome)}</div>
                                <div style="color: #94a3b8; font-size: 11px;">Income</div>
                            </div>
                            <div style="text-align: center;">
                                <div style="color: #fca5a5; font-size: 18px; font-weight: bold;">RM ${formatNumber(monthExpenses)}</div>
                                <div style="color: #94a3b8; font-size: 11px;">Expenses</div>
                            </div>
                            <div style="text-align: center;">
                                <div style="color: ${currentProfit >= 0 ? '#10b981' : '#ef4444'}; font-size: 18px; font-weight: bold;">RM ${formatNumber(currentProfit)}</div>
                                <div style="color: #94a3b8; font-size: 11px;">${currentProfit >= 0 ? 'Profit! ✓' : 'Loss ✗'}</div>
                            </div>
                        </div>
                    </div>
                    
                    <p style="color: #f59e0b;"><i class="fas fa-lightbulb"></i> <strong>Tip:</strong> ${currentProfit >= 0 ? 'You\'re making profit! Keep it up!' : 'You\'re spending more than earning. Review your expenses!'}</p>
                </div>`,
            actions: [
                { label: '📊 View Reports', action: "showSection('reports')" },
                { label: '➖ Review Expenses', action: "showSection('expenses')" }
            ]
        };
    }
    
    // Assets and liabilities
    if ((lowerQuery.includes('asset') && lowerQuery.includes('liabilit')) || lowerQuery.includes('balance sheet')) {
        return {
            text: `<strong>⚖️ Assets vs Liabilities (Made Simple!)</strong>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-top: 20px;">
                    <div style="background: rgba(16, 185, 129, 0.2); padding: 20px; border-radius: 12px;">
                        <h4 style="color: #6ee7b7;"><i class="fas fa-gem"></i> ASSETS</h4>
                        <p style="color: white; font-size: 14px; margin: 10px 0;">= Things you OWN (valuable stuff)</p>
                        <div style="color: #94a3b8; font-size: 13px;">
                            <ul style="padding-left: 18px;">
                                <li>Cash in bank</li>
                                <li>Stock/inventory</li>
                                <li>Equipment, vehicles</li>
                                <li>Money owed to you</li>
                            </ul>
                        </div>
                    </div>
                    <div style="background: rgba(239, 68, 68, 0.2); padding: 20px; border-radius: 12px;">
                        <h4 style="color: #fca5a5;"><i class="fas fa-credit-card"></i> LIABILITIES</h4>
                        <p style="color: white; font-size: 14px; margin: 10px 0;">= Things you OWE (debts)</p>
                        <div style="color: #94a3b8; font-size: 13px;">
                            <ul style="padding-left: 18px;">
                                <li>Bank loans</li>
                                <li>Credit card debt</li>
                                <li>Unpaid bills</li>
                                <li>Money you owe suppliers</li>
                            </ul>
                        </div>
                    </div>
                </div>
                <div style="background: rgba(139, 92, 246, 0.2); padding: 15px; border-radius: 10px; margin-top: 15px;">
                    <strong style="color: #a78bfa;">📋 Balance Sheet Formula:</strong>
                    <p style="color: white; margin-top: 8px;">Assets - Liabilities = <strong>Equity</strong> (your business worth)</p>
                    <p style="color: #94a3b8; font-size: 12px; margin-top: 5px;">If Assets > Liabilities = Good! You own more than you owe.</p>
                </div>`,
            actions: [
                { label: '📋 View Balance Sheet', action: "showSection('balance-sheet')" },
                { label: '🎓 Full Tutorial', action: "startBeginnerTutorial()" }
            ]
        };
    }
    
    // Malaysian tax basics
    if ((lowerQuery.includes('tax') && lowerQuery.includes('basic')) || (lowerQuery.includes('tax') && lowerQuery.includes('guide')) || (lowerQuery.includes('malaysian') && lowerQuery.includes('tax'))) {
        return {
            text: `<strong>🇲🇾 Malaysian Business Tax - Beginner's Guide</strong>
                <div style="margin-top: 15px; line-height: 1.7;">
                    <div style="background: rgba(59, 130, 246, 0.15); padding: 15px; border-radius: 10px; margin-bottom: 15px;">
                        <strong style="color: #60a5fa;">💡 What You Need to Know:</strong>
                        <ul style="color: #cbd5e1; padding-left: 20px; margin-top: 10px;">
                            <li>Business must register with LHDN (tax office)</li>
                            <li>Tax is calculated on your PROFIT (not income)</li>
                            <li>File your taxes once a year</li>
                        </ul>
                    </div>
                    
                    <div style="background: rgba(245, 158, 11, 0.15); padding: 15px; border-radius: 10px; margin-bottom: 15px;">
                        <strong style="color: #fcd34d;">📊 2024/2025 Company Tax Rates:</strong>
                        <table style="width: 100%; margin-top: 10px; color: #cbd5e1; font-size: 13px;">
                            <tr><td>First RM 150,000 profit</td><td style="text-align: right; color: #10b981;"><strong>15%</strong></td></tr>
                            <tr><td>RM 150,001 - RM 600,000</td><td style="text-align: right; color: #f59e0b;"><strong>17%</strong></td></tr>
                            <tr><td>Above RM 600,000</td><td style="text-align: right; color: #ef4444;"><strong>24%</strong></td></tr>
                        </table>
                    </div>
                    
                    <div style="background: rgba(16, 185, 129, 0.15); padding: 15px; border-radius: 10px;">
                        <strong style="color: #6ee7b7;">✅ Save Tax by Recording ALL Expenses!</strong>
                        <p style="color: #94a3b8; font-size: 13px; margin-top: 5px;">Every legitimate expense reduces your profit, which means less tax. That's why proper record-keeping is important!</p>
                    </div>
                </div>`,
            actions: [
                { label: '🧮 Tax Calculator', action: "showSection('taxes')" },
                { label: '➖ Record Expenses', action: "showSection('expenses')" }
            ]
        };
    }
    
    // What receipts to keep
    if (lowerQuery.includes('receipt') && (lowerQuery.includes('keep') || lowerQuery.includes('what') || lowerQuery.includes('should'))) {
        return {
            text: `<strong>🧾 What Receipts Should You Keep?</strong>
                <div style="margin-top: 15px; line-height: 1.7;">
                    <p style="color: #f59e0b;"><strong>Rule:</strong> Keep ALL receipts for 7 years! (LHDN requirement)</p>
                    
                    <div style="background: rgba(16, 185, 129, 0.15); padding: 15px; border-radius: 10px; margin: 15px 0;">
                        <strong style="color: #6ee7b7;">✓ Must Keep:</strong>
                        <ul style="color: #cbd5e1; padding-left: 20px; margin-top: 10px;">
                            <li>Sales invoices you issue</li>
                            <li>Purchase receipts (inventory, supplies)</li>
                            <li>Rent and utility bills</li>
                            <li>Transport & fuel receipts</li>
                            <li>Staff salary records</li>
                            <li>Bank statements</li>
                        </ul>
                    </div>
                    
                    <div style="background: rgba(245, 158, 11, 0.15); padding: 15px; border-radius: 10px;">
                        <strong style="color: #fcd34d;">💡 Pro Tips:</strong>
                        <ul style="color: #94a3b8; padding-left: 20px; margin-top: 8px; font-size: 13px;">
                            <li>Take photos of paper receipts (they fade!)</li>
                            <li>Organize by month in folders</li>
                            <li>Record expenses in EZCubic immediately</li>
                            <li>No receipt = No tax deduction!</li>
                        </ul>
                    </div>
                </div>`,
            actions: [
                { label: '➖ Record Expense', action: "showSection('expenses')" },
                { label: '📊 View All Transactions', action: "showSection('transactions')" }
            ]
        };
    }
    
    // How often to update accounts
    if (lowerQuery.includes('how often') || (lowerQuery.includes('update') && lowerQuery.includes('account')) || lowerQuery.includes('best practice')) {
        return {
            text: `<strong>📅 How Often Should You Update Your Accounts?</strong>
                <div style="margin-top: 15px;">
                    <div style="display: grid; gap: 12px;">
                        <div style="background: rgba(16, 185, 129, 0.2); padding: 15px; border-radius: 10px; border-left: 4px solid #10b981;">
                            <strong style="color: #6ee7b7;">🌟 IDEAL: Daily (5 mins)</strong>
                            <p style="color: #94a3b8; font-size: 13px; margin-top: 5px;">Record transactions at end of each day. Easiest to remember details!</p>
                        </div>
                        <div style="background: rgba(59, 130, 246, 0.2); padding: 15px; border-radius: 10px; border-left: 4px solid #3b82f6;">
                            <strong style="color: #93c5fd;">✓ GOOD: Weekly (15 mins)</strong>
                            <p style="color: #94a3b8; font-size: 13px; margin-top: 5px;">Set aside time every week to update all transactions.</p>
                        </div>
                        <div style="background: rgba(245, 158, 11, 0.2); padding: 15px; border-radius: 10px; border-left: 4px solid #f59e0b;">
                            <strong style="color: #fcd34d;">⚠️ MINIMUM: Monthly</strong>
                            <p style="color: #94a3b8; font-size: 13px; margin-top: 5px;">At least once a month. But you might forget details!</p>
                        </div>
                    </div>
                    
                    <div style="background: rgba(139, 92, 246, 0.15); padding: 15px; border-radius: 10px; margin-top: 15px;">
                        <strong style="color: #a78bfa;">📋 Monthly Checklist:</strong>
                        <ul style="color: #cbd5e1; padding-left: 20px; margin-top: 8px; font-size: 13px;">
                            <li>☐ Review all income entries</li>
                            <li>☐ Review all expense entries</li>
                            <li>☐ Check for missing receipts</li>
                            <li>☐ Pay upcoming bills</li>
                            <li>☐ Check profit/loss for the month</li>
                        </ul>
                    </div>
                </div>`,
            actions: [
                { label: '➕ Add Income', action: "showSection('income')" },
                { label: '📊 Monthly Reports', action: "showSection('monthly-reports')" }
            ]
        };
    }
    
    // ==================== GUIDED SETUP RESPONSES ====================
    
    // Getting started / How to start
    if (lowerQuery.includes('get started') || lowerQuery.includes('how do i start') || lowerQuery.includes('where to start') || lowerQuery.includes('new here')) {
        return {
            text: `<strong>🚀 Welcome to A Lazy Human! Let me guide you through setup:</strong>
                <div style="margin-top: 15px;">
                    <div style="background: rgba(59, 130, 246, 0.2); padding: 15px; border-radius: 8px; margin-bottom: 10px;">
                        <strong>Step 1: Set Up Your Business Profile</strong>
                        <p style="color: #94a3b8; font-size: 13px; margin-top: 5px;">Go to Settings and enter your business name, SSM number, and tax details.</p>
                    </div>
                    <div style="background: rgba(16, 185, 129, 0.2); padding: 15px; border-radius: 8px; margin-bottom: 10px;">
                        <strong>Step 2: Add Your First Transaction</strong>
                        <p style="color: #94a3b8; font-size: 13px; margin-top: 5px;">Record your income and expenses to start tracking your finances.</p>
                    </div>
                    <div style="background: rgba(245, 158, 11, 0.2); padding: 15px; border-radius: 8px; margin-bottom: 10px;">
                        <strong>Step 3: Set Up Recurring Bills</strong>
                        <p style="color: #94a3b8; font-size: 13px; margin-top: 5px;">Add your monthly bills like rent, utilities, and subscriptions.</p>
                    </div>
                    <div style="background: rgba(139, 92, 246, 0.2); padding: 15px; border-radius: 8px;">
                        <strong>Step 4: Explore Your Dashboard</strong>
                        <p style="color: #94a3b8; font-size: 13px; margin-top: 5px;">View your financial overview, charts, and insights.</p>
                    </div>
                </div>`,
            actions: [
                { label: '⚙️ Go to Settings', action: "showSection('settings')" },
                { label: '➕ Add Income', action: "showSection('income')" }
            ]
        };
    }
    
    // Setup business profile
    if (lowerQuery.includes('set up') && (lowerQuery.includes('business') || lowerQuery.includes('profile') || lowerQuery.includes('company'))) {
        const businessName = businessData.settings?.businessName;
        return {
            text: `<strong>📋 Setting Up Your Business Profile:</strong>
                ${businessName ? `<p style="color: #10b981; margin-top: 10px;">✓ Business name already set: <strong>${businessName}</strong></p>` : ''}
                <ol style="margin-top: 15px; padding-left: 20px; color: #cbd5e1;">
                    <li><strong>Business Name</strong> - This appears on all reports and exports</li>
                    <li><strong>SSM Number</strong> - Your company registration number (e.g., 1234567-X)</li>
                    <li><strong>TIN Number</strong> - Tax Identification Number for LHDN</li>
                    <li><strong>GST/SST Number</strong> - If registered for SST (optional)</li>
                    <li><strong>Financial Year Start</strong> - Usually January or your incorporation month</li>
                </ol>
                <p style="margin-top: 15px; color: #f59e0b;"><i class="fas fa-lightbulb"></i> Tip: Keep your SSM and LHDN documents handy when filling this in.</p>`,
            actions: [
                { label: '⚙️ Open Settings', action: "showSection('settings')" }
            ]
        };
    }
    
    // Add first income/transaction
    if (lowerQuery.includes('add') && (lowerQuery.includes('first') || lowerQuery.includes('income') || lowerQuery.includes('transaction'))) {
        return {
            text: `<strong>💰 Adding Your First Transaction:</strong>
                <div style="margin-top: 15px;">
                    <h4 style="color: #10b981;">For Income:</h4>
                    <ol style="padding-left: 20px; color: #cbd5e1; margin-bottom: 15px;">
                        <li>Click "Income" in the menu</li>
                        <li>Enter the amount received</li>
                        <li>Add a description (e.g., "Sales - Client ABC")</li>
                        <li>Select the date and payment method</li>
                        <li>Click "Add Income"</li>
                    </ol>
                    <h4 style="color: #ef4444;">For Expenses:</h4>
                    <ol style="padding-left: 20px; color: #cbd5e1;">
                        <li>Click "Expenses" in the menu</li>
                        <li>Enter the amount spent</li>
                        <li>Select a category (Rent, Utilities, etc.)</li>
                        <li>Add description and receipt details</li>
                        <li>Click "Add Expense"</li>
                    </ol>
                </div>
                <p style="margin-top: 15px; color: #f59e0b;"><i class="fas fa-lightbulb"></i> Tip: Categorize expenses properly for accurate tax deductions!</p>`,
            actions: [
                { label: '➕ Add Income', action: "showSection('income')" },
                { label: '➖ Add Expense', action: "showSection('expenses')" }
            ]
        };
    }
    
    // Setup bills/reminders
    if (lowerQuery.includes('bill') && (lowerQuery.includes('set up') || lowerQuery.includes('setup') || lowerQuery.includes('recurring') || lowerQuery.includes('reminder'))) {
        return {
            text: `<strong>📅 Setting Up Bills & Reminders:</strong>
                <p style="margin-top: 10px; color: #cbd5e1;">Never miss a payment by tracking your recurring bills:</p>
                <ol style="margin-top: 15px; padding-left: 20px; color: #cbd5e1;">
                    <li>Go to <strong>Bills</strong> section</li>
                    <li>Click <strong>"Add Bill"</strong></li>
                    <li>Enter bill details:
                        <ul style="padding-left: 20px; margin-top: 5px;">
                            <li>Bill name (e.g., "Office Rent")</li>
                            <li>Amount due</li>
                            <li>Due date</li>
                            <li>Category</li>
                            <li>Recurring frequency (monthly/yearly)</li>
                        </ul>
                    </li>
                </ol>
                <div style="background: rgba(245, 158, 11, 0.2); padding: 15px; border-radius: 8px; margin-top: 15px;">
                    <strong>Common bills to track:</strong>
                    <p style="color: #cbd5e1; font-size: 13px; margin-top: 5px;">Rent, TNB, Water, Internet, Phone, Insurance, Loan payments, Subscriptions</p>
                </div>`,
            actions: [
                { label: '📋 Manage Bills', action: "showSection('bills')" }
            ]
        };
    }
    
    // Understand dashboard
    if (lowerQuery.includes('dashboard') || lowerQuery.includes('understand') && lowerQuery.includes('chart')) {
        return {
            text: `<strong>📊 Understanding Your Dashboard:</strong>
                <div style="margin-top: 15px;">
                    <div style="border-left: 3px solid #10b981; padding-left: 15px; margin-bottom: 15px;">
                        <strong style="color: #10b981;">Total Revenue</strong>
                        <p style="color: #94a3b8; font-size: 13px;">All your income/sales for the selected period</p>
                    </div>
                    <div style="border-left: 3px solid #ef4444; padding-left: 15px; margin-bottom: 15px;">
                        <strong style="color: #ef4444;">Total Expenses</strong>
                        <p style="color: #94a3b8; font-size: 13px;">All your business costs and spending</p>
                    </div>
                    <div style="border-left: 3px solid #3b82f6; padding-left: 15px; margin-bottom: 15px;">
                        <strong style="color: #3b82f6;">Net Profit</strong>
                        <p style="color: #94a3b8; font-size: 13px;">Revenue minus Expenses = Your profit</p>
                    </div>
                    <div style="border-left: 3px solid #f59e0b; padding-left: 15px;">
                        <strong style="color: #f59e0b;">Charts</strong>
                        <p style="color: #94a3b8; font-size: 13px;">Visual trends of your income vs expenses over time</p>
                    </div>
                </div>
                <p style="margin-top: 15px; color: #60a5fa;">Your current stats: Revenue RM ${formatNumber(monthIncome)} | Expenses RM ${formatNumber(monthExpenses)} | Net RM ${formatNumber(monthIncome - monthExpenses)}</p>`,
            actions: [
                { label: '📊 View Dashboard', action: "showSection('dashboard')" },
                { label: '📈 View Reports', action: "showSection('reports')" }
            ]
        };
    }
    
    // Profit this month
    if (lowerQuery.includes('profit') && (lowerQuery.includes('month') || lowerQuery.includes('this'))) {
        const profit = monthIncome - monthExpenses;
        const profitPercent = monthIncome > 0 ? ((profit / monthIncome) * 100).toFixed(1) : 0;
        return {
            text: `<strong>📈 This Month's Profit Summary:</strong>
                <div style="margin-top: 15px; display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px;">
                    <div style="background: rgba(16, 185, 129, 0.2); padding: 15px; border-radius: 8px; text-align: center;">
                        <div style="color: #6ee7b7; font-size: 12px;">Income</div>
                        <div style="color: white; font-size: 18px; font-weight: 700;">RM ${formatNumber(monthIncome)}</div>
                    </div>
                    <div style="background: rgba(239, 68, 68, 0.2); padding: 15px; border-radius: 8px; text-align: center;">
                        <div style="color: #fca5a5; font-size: 12px;">Expenses</div>
                        <div style="color: white; font-size: 18px; font-weight: 700;">RM ${formatNumber(monthExpenses)}</div>
                    </div>
                    <div style="background: rgba(59, 130, 246, 0.2); padding: 15px; border-radius: 8px; text-align: center;">
                        <div style="color: #93c5fd; font-size: 12px;">Net Profit</div>
                        <div style="color: ${profit >= 0 ? '#10b981' : '#ef4444'}; font-size: 18px; font-weight: 700;">RM ${formatNumber(profit)}</div>
                    </div>
                </div>
                <p style="margin-top: 15px; color: ${profit >= 0 ? '#10b981' : '#ef4444'};">
                    Profit Margin: <strong>${profitPercent}%</strong> ${profit >= 0 ? '✓ Healthy' : '⚠️ Review expenses'}
                </p>`,
            actions: [
                { label: '📊 Full Report', action: "showSection('reports')" },
                { label: '📈 Monthly View', action: "showSection('monthly-reports')" }
            ]
        };
    }
    
    // Generate report
    if (lowerQuery.includes('report') || lowerQuery.includes('generate')) {
        return {
            text: `<strong>📄 Available Reports:</strong>
                <div style="margin-top: 15px;">
                    <div style="background: rgba(59, 130, 246, 0.15); padding: 12px; border-radius: 8px; margin-bottom: 10px; cursor: pointer;" onclick="showSection('reports')">
                        <strong>📊 Financial Summary</strong>
                        <p style="color: #94a3b8; font-size: 12px; margin-top: 3px;">Income, expenses, and profit overview</p>
                    </div>
                    <div style="background: rgba(16, 185, 129, 0.15); padding: 12px; border-radius: 8px; margin-bottom: 10px; cursor: pointer;" onclick="showSection('monthly-reports')">
                        <strong>📈 Monthly Analysis</strong>
                        <p style="color: #94a3b8; font-size: 12px; margin-top: 3px;">Month-by-month trends and comparisons</p>
                    </div>
                    <div style="background: rgba(139, 92, 246, 0.15); padding: 12px; border-radius: 8px; margin-bottom: 10px; cursor: pointer;" onclick="showSection('balance-sheet')">
                        <strong>📋 Balance Sheet</strong>
                        <p style="color: #94a3b8; font-size: 12px; margin-top: 3px;">Assets, liabilities, and equity</p>
                    </div>
                    <div style="background: rgba(245, 158, 11, 0.15); padding: 12px; border-radius: 8px; cursor: pointer;" onclick="showSection('taxes')">
                        <strong>🧾 Tax Report</strong>
                        <p style="color: #94a3b8; font-size: 12px; margin-top: 3px;">Tax estimates and deductions</p>
                    </div>
                </div>`,
            actions: [
                { label: '📥 Export Report', action: "showExportOptionsModal()" }
            ]
        };
    }
    
    // Tax reduction queries
    if (lowerQuery.includes('reduce') && lowerQuery.includes('tax')) {
        return {
            text: `<strong>Tax Reduction Strategies for Malaysian Businesses:</strong>
                <ol style="margin-top: 10px; padding-left: 20px; color: #cbd5e1;">
                    <li><strong>Maximize Deductions:</strong> Ensure all business expenses are properly recorded (rent, utilities, salaries, marketing)</li>
                    <li><strong>Capital Allowances:</strong> Claim depreciation on equipment, vehicles, and machinery</li>
                    <li><strong>EPF & SOCSO:</strong> Employer contributions are tax-deductible</li>
                    <li><strong>Training Expenses:</strong> Staff training costs are fully deductible</li>
                    <li><strong>R&D Incentives:</strong> Double deduction for approved research activities</li>
                    <li><strong>Zakat:</strong> Business zakat can be deducted (up to 2.5% of profit)</li>
                </ol>
                <p style="margin-top: 15px; color: #f59e0b;"><i class="fas fa-lightbulb"></i> Based on your YTD profit of RM ${formatNumber(yearIncome - yearExpenses)}, your estimated tax is RM ${formatNumber(calculateEstimatedTax(yearIncome - yearExpenses))}.</p>`,
            actions: [
                { label: 'Tax Calculator', action: "showSection('taxes')" },
                { label: 'Review Expenses', action: "showSection('expenses')" }
            ]
        };
    }
    
    // Cash flow prediction
    if (lowerQuery.includes('cash flow') || lowerQuery.includes('predict')) {
        const avgMonthlyIncome = yearIncome / Math.max(1, currentMonth + 1);
        const avgMonthlyExpense = yearExpenses / Math.max(1, currentMonth + 1);
        const predictedProfit = avgMonthlyIncome - avgMonthlyExpense;
        
        return {
            text: `<strong>Cash Flow Prediction (Next 30 Days):</strong>
                <div style="margin-top: 15px; display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                    <div style="background: rgba(16, 185, 129, 0.2); padding: 15px; border-radius: 8px;">
                        <div style="color: #6ee7b7; font-size: 12px;">Predicted Income</div>
                        <div style="color: white; font-size: 20px; font-weight: 700;">RM ${formatNumber(avgMonthlyIncome)}</div>
                    </div>
                    <div style="background: rgba(239, 68, 68, 0.2); padding: 15px; border-radius: 8px;">
                        <div style="color: #fca5a5; font-size: 12px;">Predicted Expenses</div>
                        <div style="color: white; font-size: 20px; font-weight: 700;">RM ${formatNumber(avgMonthlyExpense)}</div>
                    </div>
                </div>
                <p style="margin-top: 15px; color: ${predictedProfit >= 0 ? '#10b981' : '#ef4444'};">
                    <strong>Predicted Net: RM ${formatNumber(predictedProfit)}</strong>
                </p>
                <p style="color: #94a3b8; font-size: 12px; margin-top: 10px;">* Based on ${currentMonth + 1}-month average. Actual results may vary.</p>`,
            actions: [
                { label: 'View Reports', action: "showSection('reports')" },
                { label: 'Add Income', action: "showSection('income')" }
            ]
        };
    }
    
    // Categorize transactions
    if (lowerQuery.includes('categorize') || lowerQuery.includes('category')) {
        return {
            text: `I can help categorize your transactions automatically based on their descriptions. This helps with:
                <ul style="margin-top: 10px; padding-left: 20px; color: #cbd5e1;">
                    <li>More accurate financial reports</li>
                    <li>Better tax deduction tracking</li>
                    <li>Expense pattern analysis</li>
                </ul>
                <p style="margin-top: 15px;">Click "Auto-Categorize" to start the process.</p>`,
            actions: [
                { label: 'Auto-Categorize', action: "runAutomation('categorize')" },
                { label: 'View Transactions', action: "showSection('transactions')" }
            ]
        };
    }
    
    // Duplicate entries
    if (lowerQuery.includes('duplicate')) {
        const duplicates = findDuplicateTransactions();
        return {
            text: duplicates.length > 0 
                ? `I found <strong>${duplicates.length} potential duplicate entries</strong>. These are transactions with similar amounts and dates. Review them to avoid double-counting.`
                : `<strong>No duplicates found!</strong> Your transaction records look clean.`,
            actions: duplicates.length > 0 ? [
                { label: 'Review Duplicates', action: "runAutomation('duplicates')" }
            ] : []
        };
    }
    
    // Bills due
    if (lowerQuery.includes('bill') && lowerQuery.includes('due')) {
        const upcomingBills = bills.filter(b => {
            if (!b.dueDate || b.isPaid) return false;
            const due = new Date(b.dueDate);
            return due >= new Date();
        }).sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
        
        if (upcomingBills.length === 0) {
            return {
                text: `<strong>No upcoming bills!</strong> All your bills are paid or you haven't added any bills yet.`,
                actions: [{ label: 'Add Bill', action: "showSection('bills')" }]
            };
        }
        
        const billsList = upcomingBills.slice(0, 5).map(b => 
            `<li><strong>${b.name || 'Bill'}</strong> - RM ${formatNumber(b.amount)} due ${new Date(b.dueDate).toLocaleDateString('en-MY')}</li>`
        ).join('');
        
        return {
            text: `<strong>Upcoming Bills (${upcomingBills.length} total):</strong>
                <ul style="margin-top: 10px; padding-left: 20px; color: #cbd5e1;">${billsList}</ul>
                <p style="margin-top: 15px; color: #f59e0b;">Total due: RM ${formatNumber(upcomingBills.reduce((s, b) => s + b.amount, 0))}</p>`,
            actions: [{ label: 'Manage Bills', action: "showSection('bills')" }]
        };
    }
    
    // Top expenses
    if (lowerQuery.includes('top') && lowerQuery.includes('expense')) {
        const expenses = transactions.filter(t => t.type === 'expense');
        const byCategory = {};
        expenses.forEach(e => {
            const cat = e.category || 'Other';
            byCategory[cat] = (byCategory[cat] || 0) + e.amount;
        });
        
        const sorted = Object.entries(byCategory).sort((a, b) => b[1] - a[1]).slice(0, 5);
        const expenseList = sorted.map(([cat, amt]) => 
            `<li><strong>${cat}</strong>: RM ${formatNumber(amt)}</li>`
        ).join('');
        
        return {
            text: `<strong>Top 5 Expense Categories:</strong>
                <ol style="margin-top: 10px; padding-left: 20px; color: #cbd5e1;">${expenseList}</ol>`,
            actions: [{ label: 'View All Expenses', action: "showSection('expenses')" }]
        };
    }
    
    // Default response - more helpful with guided options
    return {
        text: `<strong>I'm here to help! 🤖</strong>
            <p style="margin-top: 10px; color: #cbd5e1;">I didn't quite catch that. Here's what I can do:</p>
            
            <div style="margin-top: 15px; display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                <div style="background: rgba(59, 130, 246, 0.15); padding: 12px; border-radius: 8px;">
                    <strong style="color: #60a5fa;">🚀 Getting Started</strong>
                    <p style="color: #94a3b8; font-size: 12px; margin-top: 3px;">"How do I get started?"</p>
                </div>
                <div style="background: rgba(16, 185, 129, 0.15); padding: 12px; border-radius: 8px;">
                    <strong style="color: #6ee7b7;">💰 Finances</strong>
                    <p style="color: #94a3b8; font-size: 12px; margin-top: 3px;">"Show my profit this month"</p>
                </div>
                <div style="background: rgba(245, 158, 11, 0.15); padding: 12px; border-radius: 8px;">
                    <strong style="color: #fcd34d;">🧾 Tax Help</strong>
                    <p style="color: #94a3b8; font-size: 12px; margin-top: 3px;">"How can I reduce my tax?"</p>
                </div>
                <div style="background: rgba(239, 68, 68, 0.15); padding: 12px; border-radius: 8px;">
                    <strong style="color: #fca5a5;">📅 Bills</strong>
                    <p style="color: #94a3b8; font-size: 12px; margin-top: 3px;">"What bills are due soon?"</p>
                </div>
            </div>
            
            <p style="margin-top: 15px; color: #94a3b8; font-size: 13px;">💡 Tip: Click the Quick Start buttons above for guided help!</p>`,
        actions: [
            { label: '🚀 Get Started', action: "askAIExample('How do I get started?')" },
            { label: '📊 Dashboard', action: "showSection('dashboard')" }
        ]
    };
}

// Toggle Analytics Panel
function toggleAnalyticsPanel() {
    const content = document.getElementById('analyticsContent');
    const icon = document.getElementById('analyticsToggleIcon');
    
    if (!content || !icon) return;
    
    if (content.style.display === 'none') {
        content.style.display = 'block';
        icon.style.transform = 'rotate(0deg)';
    } else {
        content.style.display = 'none';
        icon.style.transform = 'rotate(-90deg)';
    }
}

function calculateEstimatedTax(profit) {
    if (profit <= 0) return 0;
    if (profit <= 150000) return profit * 0.15;
    if (profit <= 600000) return 22500 + (profit - 150000) * 0.17;
    return 22500 + 76500 + (profit - 600000) * 0.24;
}

function findDuplicateTransactions() {
    const transactions = businessData.transactions || [];
    const duplicates = [];
    
    for (let i = 0; i < transactions.length; i++) {
        for (let j = i + 1; j < transactions.length; j++) {
            if (transactions[i].amount === transactions[j].amount &&
                transactions[i].date === transactions[j].date &&
                transactions[i].type === transactions[j].type) {
                duplicates.push({ original: transactions[i], duplicate: transactions[j] });
            }
        }
    }
    
    return duplicates;
}

// ==================== VOICE INPUT ====================
let isRecording = false;

function toggleVoiceInput() {
    const btn = document.getElementById('aiVoiceButton');
    
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
        showNotification('Voice input not supported in this browser', 'error');
        return;
    }
    
    if (isRecording) {
        stopVoiceInput();
        return;
    }
    
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    
    recognition.lang = 'en-MY';
    recognition.continuous = false;
    recognition.interimResults = false;
    
    recognition.onstart = function() {
        isRecording = true;
        btn.classList.add('active');
        btn.innerHTML = '<i class="fas fa-stop"></i>';
        showNotification('Listening...', 'info');
    };
    
    recognition.onresult = function(event) {
        const transcript = event.results[0][0].transcript;
        document.getElementById('aiQueryInput').value = transcript;
        processAIQuery();
    };
    
    recognition.onerror = function(event) {
        showNotification('Voice recognition error: ' + event.error, 'error');
        stopVoiceInput();
    };
    
    recognition.onend = function() {
        stopVoiceInput();
    };
    
    recognition.start();
}

function stopVoiceInput() {
    const btn = document.getElementById('aiVoiceButton');
    isRecording = false;
    btn.classList.remove('active');
    btn.innerHTML = '<i class="fas fa-microphone"></i>';
}

// ==================== AUTOMATION ====================
function runAutomation(type) {
    showNotification(`Running ${type} automation...`, 'info');
    
    switch (type) {
        case 'categorize':
            autoCategorizeTransactions();
            break;
        case 'duplicates':
            findAndShowDuplicates();
            break;
        case 'tax-optimize':
            showTaxOptimization();
            break;
        case 'report-generate':
            // Use goToMonthlyReports for automation, generateMonthlyReport for export
            goToMonthlyReports();
            break;
        case 'predict-cashflow':
            showCashFlowPrediction();
            break;
        case 'receipts':
            showNotification('Receipt analysis coming soon!', 'info');
            break;
        default:
            showNotification('Automation not available', 'error');
    }
    
    aiState.tasksCompleted++;
    aiState.timeSaved += 0.5;
    updateAIStats();
    saveAIState();
}

function runAllAutomations() {
    showNotification('Running all automations...', 'info');
    
    setTimeout(() => autoCategorizeTransactions(), 500);
    setTimeout(() => findAndShowDuplicates(), 1500);
    
    aiState.tasksCompleted += 2;
    aiState.timeSaved += 1;
    updateAIStats();
    saveAIState();
}

function autoCategorizeTransactions() {
    const transactions = businessData.transactions || [];
    let categorized = 0;
    
    const patterns = {
        'rent|sewa': 'Rent',
        'electric|tnb|water|air|utility': 'Utilities',
        'supplies|stationery|office': 'Office Supplies',
        'salary|wage|gaji|epf|socso': 'Salaries',
        'marketing|ads|promotion|iklan': 'Marketing',
        'travel|petrol|toll|parking|fuel': 'Travel',
        'lawyer|accountant|consultant|professional': 'Professional Fees',
        'food|meal|lunch|dinner|makan': 'Meals & Entertainment',
        'phone|internet|telco|mobile': 'Telecommunications',
        'insurance|insuran': 'Insurance',
        'bank|charge|fee': 'Bank Charges'
    };
    
    transactions.forEach(t => {
        if (!t.category || t.category === 'Other' || t.category === 'Uncategorized') {
            const desc = (t.description || '').toLowerCase();
            for (const [pattern, category] of Object.entries(patterns)) {
                if (new RegExp(pattern, 'i').test(desc)) {
                    t.category = category;
                    categorized++;
                    break;
                }
            }
        }
    });
    
    if (categorized > 0) {
        saveData();
        showNotification(`Categorized ${categorized} transactions!`, 'success');
    } else {
        showNotification('All transactions are already categorized', 'info');
    }
}

function findAndShowDuplicates() {
    const duplicates = findDuplicateTransactions();
    
    if (duplicates.length === 0) {
        showNotification('No duplicate transactions found!', 'success');
        return;
    }
    
    showNotification(`Found ${duplicates.length} potential duplicates. Review in transactions.`, 'warning');
    showSection('transactions');
}

function showTaxOptimization() {
    showSection('taxes');
    setTimeout(() => {
        showNotification('Review tax optimization suggestions in the Tax Center', 'info');
    }, 500);
}

function goToMonthlyReports() {
    showSection('monthly-reports');
    showNotification('Monthly report generated!', 'success');
}

function showCashFlowPrediction() {
    askAIExample('Predict my cash flow next month');
}

// ==================== ANALYTICS ====================
function setAnalyticsPeriod(period) {
    aiState.analyticsPeriod = period;
    
    document.querySelectorAll('.analytics-filter').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');
    
    updateAIAnalytics();
    saveAIState();
}

function updateAIAnalytics() {
    try {
        const transactions = businessData.transactions || [];
        const currentDate = new Date();
        const currentYear = currentDate.getFullYear();
        const currentMonth = currentDate.getMonth();
        const currentQuarter = Math.floor(currentMonth / 3);
        
        let filteredTransactions = [];
        
        switch (aiState.analyticsPeriod) {
            case 'month':
                filteredTransactions = transactions.filter(t => {
                    const d = new Date(t.date);
                    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
                });
                break;
            case 'quarter':
                filteredTransactions = transactions.filter(t => {
                    const d = new Date(t.date);
                    return Math.floor(d.getMonth() / 3) === currentQuarter && d.getFullYear() === currentYear;
                });
                break;
            case 'year':
                filteredTransactions = transactions.filter(t => {
                    const d = new Date(t.date);
                    return d.getFullYear() === currentYear;
                });
                break;
        }
        
        const income = filteredTransactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
        const expenses = filteredTransactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
        const profit = income - expenses;
        
        // Profit Margin
        const profitMargin = income > 0 ? Math.round((profit / income) * 100) : 0;
        const profitMarginEl = document.getElementById('aiProfitMargin');
        if (profitMarginEl) profitMarginEl.textContent = profitMargin + '%';
        
        // Expense Ratio
        const expenseRatio = income > 0 ? Math.round((expenses / income) * 100) : 0;
        const expenseRatioEl = document.getElementById('aiExpenseRatio');
        if (expenseRatioEl) expenseRatioEl.textContent = expenseRatio + '%';
        
        // Cash Flow Health (0-100 score)
        let healthScore = 50;
        if (profitMargin > 20) healthScore += 20;
        else if (profitMargin > 10) healthScore += 10;
        else if (profitMargin < 0) healthScore -= 20;
        
        if (expenseRatio < 70) healthScore += 15;
        else if (expenseRatio > 90) healthScore -= 15;
        
        if (filteredTransactions.length > 10) healthScore += 15;
        
        healthScore = Math.min(100, Math.max(0, healthScore));
        const cashFlowEl = document.getElementById('aiCashFlowHealth');
        if (cashFlowEl) cashFlowEl.textContent = healthScore;
        
        // Tax Efficiency
        const taxEfficiency = Math.min(100, Math.round(80 + (profit > 0 ? 10 : 0) + (expenseRatio > 50 ? 10 : 0)));
        const taxEffEl = document.getElementById('aiTaxEfficiency');
        if (taxEffEl) taxEffEl.textContent = taxEfficiency + '%';
    
        // Update trends
        updateAnalyticsTrends(profitMargin, expenseRatio, healthScore);
        
        // Update chart
        updateAIChart(filteredTransactions);
    } catch (e) {
        console.log('updateAIAnalytics error:', e.message);
    }
}

function updateAnalyticsTrends(profitMargin, expenseRatio, healthScore) {
    const profitTrend = document.getElementById('aiProfitTrend');
    const expenseTrend = document.getElementById('aiExpenseTrend');
    const cashFlowTrend = document.getElementById('aiCashFlowTrend');
    const taxTrend = document.getElementById('aiTaxTrend');
    
    if (profitTrend) {
        profitTrend.className = 'analytics-trend ' + (profitMargin >= 15 ? 'positive' : profitMargin >= 0 ? '' : 'negative');
        profitTrend.innerHTML = profitMargin >= 15 
            ? '<i class="fas fa-check-circle"></i> Healthy'
            : profitMargin >= 0 
            ? '<i class="fas fa-minus"></i> Average'
            : '<i class="fas fa-exclamation-circle"></i> Needs attention';
    }
    
    if (expenseTrend) {
        expenseTrend.className = 'analytics-trend ' + (expenseRatio <= 70 ? 'positive' : expenseRatio <= 85 ? '' : 'negative');
        expenseTrend.innerHTML = expenseRatio <= 70
            ? '<i class="fas fa-arrow-down"></i> Well controlled'
            : expenseRatio <= 85
            ? '<i class="fas fa-minus"></i> Moderate'
            : '<i class="fas fa-arrow-up"></i> High';
    }
    
    if (cashFlowTrend) {
        cashFlowTrend.className = 'analytics-trend ' + (healthScore >= 70 ? 'positive' : healthScore >= 50 ? '' : 'negative');
        cashFlowTrend.innerHTML = healthScore >= 70
            ? '<i class="fas fa-heart"></i> Strong'
            : healthScore >= 50
            ? '<i class="fas fa-minus"></i> Fair'
            : '<i class="fas fa-exclamation-triangle"></i> Weak';
    }
    
    if (taxTrend) {
        taxTrend.className = 'analytics-trend positive';
        taxTrend.innerHTML = '<i class="fas fa-check-circle"></i> Optimized';
    }
}

function updateAIChart(transactions) {
    const canvas = document.getElementById('aiAnalyticsChart');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    
    // Group by week/month
    const grouped = {};
    transactions.forEach(t => {
        const d = new Date(t.date);
        const key = d.toLocaleDateString('en-MY', { month: 'short', day: 'numeric' });
        if (!grouped[key]) grouped[key] = { income: 0, expense: 0 };
        if (t.type === 'income') grouped[key].income += t.amount;
        else grouped[key].expense += t.amount;
    });
    
    const labels = Object.keys(grouped).slice(-10);
    const incomeData = labels.map(l => grouped[l].income);
    const expenseData = labels.map(l => grouped[l].expense);
    
    // Destroy existing chart
    if (window.aiChart) {
        window.aiChart.destroy();
    }
    
    window.aiChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Income',
                    data: incomeData,
                    borderColor: '#10b981',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    fill: true,
                    tension: 0.4
                },
                {
                    label: 'Expenses',
                    data: expenseData,
                    borderColor: '#ef4444',
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    fill: true,
                    tension: 0.4
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    labels: { color: '#94a3b8' }
                }
            },
            scales: {
                x: {
                    ticks: { color: '#94a3b8' },
                    grid: { color: 'rgba(255,255,255,0.1)' }
                },
                y: {
                    ticks: { 
                        color: '#94a3b8',
                        callback: function(value) {
                            return 'RM ' + formatNumber(value);
                        }
                    },
                    grid: { color: 'rgba(255,255,255,0.1)' }
                }
            }
        }
    });
}

function updateAIStats() {
    try {
        const insightsEl = document.getElementById('aiInsightsCount');
        const tasksEl = document.getElementById('aiTasksCompleted');
        const timeEl = document.getElementById('aiTimeSaved');
        const accuracyEl = document.getElementById('aiAccuracy');
        
        if (insightsEl) insightsEl.textContent = aiState.insights.length;
        if (tasksEl) tasksEl.textContent = aiState.tasksCompleted;
        if (timeEl) timeEl.textContent = aiState.timeSaved.toFixed(1) + 'h';
        
        // Update accuracy based on tasks completed
        const accuracy = Math.min(98, 85 + Math.min(aiState.tasksCompleted, 13));
        if (accuracyEl) accuracyEl.textContent = accuracy + '%';
    } catch (e) {
        console.log('updateAIStats error:', e.message);
    }
}

// ==================== LEARNING MODULE ====================
function startLearning(topic) {
    const modules = {
        'basic-accounting': {
            title: 'Accounting Basics for Malaysian Businesses',
            content: `
                <h4>Understanding the Basics</h4>
                <p><strong>Assets</strong> = What you own (cash, equipment, inventory)</p>
                <p><strong>Liabilities</strong> = What you owe (loans, accounts payable)</p>
                <p><strong>Equity</strong> = Assets - Liabilities (your net worth)</p>
                <br>
                <h4>The Accounting Equation</h4>
                <p style="font-size: 18px; color: #60a5fa;"><strong>Assets = Liabilities + Equity</strong></p>
            `
        },
        'malaysian-tax': {
            title: 'Malaysian Tax Guide',
            content: `
                <h4>Corporate Tax Rates (SME - YA2024)</h4>
                <ul>
                    <li>First RM 150,000: <strong>15%</strong></li>
                    <li>RM 150,001 - RM 600,000: <strong>17%</strong></li>
                    <li>Above RM 600,000: <strong>24%</strong></li>
                </ul>
                <br>
                <h4>SST Rates</h4>
                <ul>
                    <li>Sales Tax: <strong>10%</strong> (goods)</li>
                    <li>Service Tax: <strong>6%</strong> (services)</li>
                    <li>Registration threshold: RM 500,000/year</li>
                </ul>
            `
        },
        'cash-flow': {
            title: 'Cash Flow Management',
            content: `
                <h4>Cash Flow Basics</h4>
                <p>Cash flow = Cash inflows - Cash outflows</p>
                <br>
                <h4>Tips for Better Cash Flow</h4>
                <ul>
                    <li>Invoice promptly and follow up</li>
                    <li>Negotiate better payment terms with suppliers</li>
                    <li>Monitor receivables regularly</li>
                    <li>Maintain emergency reserves</li>
                </ul>
            `
        }
    };
    
    const module = modules[topic];
    if (!module) {
        showNotification('Module coming soon!', 'info');
        return;
    }
    
    const container = document.getElementById('aiResponseContainer');
    container.innerHTML += `
        <div class="ai-response">
            <div class="ai-avatar"><i class="fas fa-graduation-cap"></i></div>
            <div class="response-content">
                <h3 style="color: white; margin-bottom: 15px;">${module.title}</h3>
                <div class="response-text">${module.content}</div>
            </div>
        </div>
    `;
    container.scrollTop = container.scrollHeight;
    
    // Update learning progress
    aiState.learningProgress = Math.min(100, aiState.learningProgress + 33);
    document.getElementById('learningProgressPercent').textContent = aiState.learningProgress + '% Complete';
    document.getElementById('learningProgressBar').style.width = aiState.learningProgress + '%';
    saveAIState();
}

// ==================== BEGINNER'S TUTORIAL SYSTEM ====================
let tutorialStep = 0;
const tutorialSteps = [
    {
        title: "Welcome to A Lazy Human! 🎉",
        content: `
            <div style="line-height: 1.8;">
                <p>Hi there! I'm your AI accounting assistant. Don't worry if you've <strong>never done accounting before</strong> - I'll make it super easy!</p>
                <div style="background: rgba(59, 130, 246, 0.2); padding: 15px; border-radius: 10px; margin: 15px 0;">
                    <strong style="color: #60a5fa;">🎯 What is EZCubic?</strong>
                    <p style="color: #cbd5e1; margin-top: 8px;">It's like a simple notebook for your business money - tracking what comes IN (income) and what goes OUT (expenses).</p>
                </div>
                <p style="color: #f59e0b;"><i class="fas fa-clock"></i> This tutorial takes about 5 minutes. Ready?</p>
            </div>`,
        actions: [
            { label: "Let's Go! →", action: "nextTutorialStep()" },
            { label: "Skip Tutorial", action: "skipTutorial()" }
        ]
    },
    {
        title: "Step 1: Understanding Money Flow 💰",
        content: `
            <div style="line-height: 1.8;">
                <p>Every business has two types of money movement:</p>
                
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin: 20px 0;">
                    <div style="background: rgba(16, 185, 129, 0.2); padding: 20px; border-radius: 10px; border-left: 4px solid #10b981;">
                        <h4 style="color: #6ee7b7; margin-bottom: 10px;"><i class="fas fa-arrow-down"></i> INCOME</h4>
                        <p style="color: #cbd5e1; font-size: 13px;">Money coming INTO your business</p>
                        <ul style="color: #94a3b8; font-size: 12px; margin-top: 10px; padding-left: 15px;">
                            <li>Sales to customers</li>
                            <li>Payment for services</li>
                            <li>Interest earned</li>
                        </ul>
                    </div>
                    <div style="background: rgba(239, 68, 68, 0.2); padding: 20px; border-radius: 10px; border-left: 4px solid #ef4444;">
                        <h4 style="color: #fca5a5; margin-bottom: 10px;"><i class="fas fa-arrow-up"></i> EXPENSES</h4>
                        <p style="color: #cbd5e1; font-size: 13px;">Money going OUT of your business</p>
                        <ul style="color: #94a3b8; font-size: 12px; margin-top: 10px; padding-left: 15px;">
                            <li>Rent, utilities</li>
                            <li>Supplies, inventory</li>
                            <li>Salaries, fees</li>
                        </ul>
                    </div>
                </div>
                
                <div style="background: rgba(245, 158, 11, 0.2); padding: 15px; border-radius: 10px;">
                    <strong style="color: #fcd34d;">💡 Simple Formula:</strong>
                    <p style="color: white; font-size: 16px; margin-top: 8px;">Income - Expenses = <strong>Profit</strong> (or Loss)</p>
                </div>
            </div>`,
        actions: [
            { label: "← Back", action: "prevTutorialStep()" },
            { label: "Got it! Next →", action: "nextTutorialStep()" }
        ]
    },
    {
        title: "Step 2: Your First Task - Set Up Profile 🏢",
        content: `
            <div style="line-height: 1.8;">
                <p>Let's set up your business profile. This info appears on your reports.</p>
                
                <div style="background: rgba(255,255,255,0.05); padding: 20px; border-radius: 10px; margin: 15px 0;">
                    <h4 style="color: white; margin-bottom: 15px;">You'll need:</h4>
                    <div style="display: grid; gap: 10px;">
                        <div style="display: flex; align-items: center; gap: 10px; color: #cbd5e1;">
                            <i class="fas fa-check-circle" style="color: #10b981;"></i>
                            <span><strong>Business Name</strong> - Your company/shop name</span>
                        </div>
                        <div style="display: flex; align-items: center; gap: 10px; color: #cbd5e1;">
                            <i class="fas fa-check-circle" style="color: #10b981;"></i>
                            <span><strong>SSM Number</strong> - Company registration (optional)</span>
                        </div>
                        <div style="display: flex; align-items: center; gap: 10px; color: #cbd5e1;">
                            <i class="fas fa-check-circle" style="color: #10b981;"></i>
                            <span><strong>Address</strong> - Business address</span>
                        </div>
                    </div>
                </div>
                
                <p style="color: #94a3b8; font-size: 13px;"><i class="fas fa-info-circle"></i> Don't have SSM? No problem! Just enter your business name to start.</p>
            </div>`,
        actions: [
            { label: "← Back", action: "prevTutorialStep()" },
            { label: "⚙️ Go to Settings", action: "showSection('settings'); nextTutorialStep()" },
            { label: "Skip, Next →", action: "nextTutorialStep()" }
        ]
    },
    {
        title: "Step 3: Record Your First Income 💵",
        content: `
            <div style="line-height: 1.8;">
                <p>Now let's add your first income! This is how you record money coming in.</p>
                
                <div style="background: rgba(16, 185, 129, 0.15); padding: 20px; border-radius: 10px; margin: 15px 0;">
                    <h4 style="color: #6ee7b7; margin-bottom: 15px;"><i class="fas fa-hand-holding-usd"></i> Example: Recording a Sale</h4>
                    <ol style="color: #cbd5e1; padding-left: 20px;">
                        <li style="margin-bottom: 8px;">Click <strong>"Record Income"</strong> in the menu</li>
                        <li style="margin-bottom: 8px;">Enter <strong>Amount</strong>: RM 500.00</li>
                        <li style="margin-bottom: 8px;">Add <strong>Description</strong>: "Sale to Customer ABC"</li>
                        <li style="margin-bottom: 8px;">Pick the <strong>Date</strong></li>
                        <li>Click <strong>"Add Income"</strong> button</li>
                    </ol>
                </div>
                
                <div style="background: rgba(59, 130, 246, 0.2); padding: 12px; border-radius: 8px;">
                    <strong style="color: #60a5fa;">🎯 Pro Tip:</strong>
                    <span style="color: #cbd5e1;"> Add income right after you receive payment so you don't forget!</span>
                </div>
            </div>`,
        actions: [
            { label: "← Back", action: "prevTutorialStep()" },
            { label: "➕ Try Adding Income", action: "showSection('income'); nextTutorialStep()" },
            { label: "Next →", action: "nextTutorialStep()" }
        ]
    },
    {
        title: "Step 4: Record Expenses 📝",
        content: `
            <div style="line-height: 1.8;">
                <p>Tracking expenses is <strong>super important</strong> for knowing your real profit!</p>
                
                <div style="background: rgba(239, 68, 68, 0.15); padding: 20px; border-radius: 10px; margin: 15px 0;">
                    <h4 style="color: #fca5a5; margin-bottom: 15px;"><i class="fas fa-shopping-cart"></i> Example: Recording an Expense</h4>
                    <ol style="color: #cbd5e1; padding-left: 20px;">
                        <li style="margin-bottom: 8px;">Click <strong>"Record Expenses"</strong> in the menu</li>
                        <li style="margin-bottom: 8px;">Enter <strong>Amount</strong>: RM 150.00</li>
                        <li style="margin-bottom: 8px;">Select <strong>Category</strong>: Office Supplies</li>
                        <li style="margin-bottom: 8px;">Add <strong>Description</strong>: "Printer paper & ink"</li>
                        <li>Click <strong>"Add Expense"</strong></li>
                    </ol>
                </div>
                
                <div style="background: rgba(245, 158, 11, 0.2); padding: 12px; border-radius: 8px;">
                    <strong style="color: #fcd34d;">💡 Why Categories?</strong>
                    <span style="color: #cbd5e1;"> Proper categories = better tax deductions = more savings!</span>
                </div>
            </div>`,
        actions: [
            { label: "← Back", action: "prevTutorialStep()" },
            { label: "➖ Try Adding Expense", action: "showSection('expenses'); nextTutorialStep()" },
            { label: "Next →", action: "nextTutorialStep()" }
        ]
    },
    {
        title: "Step 5: Understanding Your Dashboard 📊",
        content: `
            <div style="line-height: 1.8;">
                <p>Your dashboard shows everything at a glance!</p>
                
                <div style="display: grid; gap: 12px; margin: 15px 0;">
                    <div style="background: rgba(16, 185, 129, 0.15); padding: 15px; border-radius: 8px; display: flex; align-items: center; gap: 15px;">
                        <i class="fas fa-arrow-down" style="font-size: 24px; color: #10b981;"></i>
                        <div>
                            <strong style="color: #6ee7b7;">Total Revenue</strong>
                            <p style="color: #94a3b8; font-size: 12px; margin-top: 3px;">Sum of all your income/sales</p>
                        </div>
                    </div>
                    <div style="background: rgba(239, 68, 68, 0.15); padding: 15px; border-radius: 8px; display: flex; align-items: center; gap: 15px;">
                        <i class="fas fa-arrow-up" style="font-size: 24px; color: #ef4444;"></i>
                        <div>
                            <strong style="color: #fca5a5;">Total Expenses</strong>
                            <p style="color: #94a3b8; font-size: 12px; margin-top: 3px;">Sum of all your costs</p>
                        </div>
                    </div>
                    <div style="background: rgba(59, 130, 246, 0.15); padding: 15px; border-radius: 8px; display: flex; align-items: center; gap: 15px;">
                        <i class="fas fa-chart-line" style="font-size: 24px; color: #3b82f6;"></i>
                        <div>
                            <strong style="color: #93c5fd;">Net Profit/Loss</strong>
                            <p style="color: #94a3b8; font-size: 12px; margin-top: 3px;">Revenue minus Expenses = Your profit!</p>
                        </div>
                    </div>
                </div>
                
                <p style="color: #10b981;">✓ Green numbers = Good (making money)</p>
                <p style="color: #ef4444;">✗ Red numbers = Review needed (spending more than earning)</p>
            </div>`,
        actions: [
            { label: "← Back", action: "prevTutorialStep()" },
            { label: "📊 View Dashboard", action: "showSection('dashboard'); nextTutorialStep()" },
            { label: "Next →", action: "nextTutorialStep()" }
        ]
    },
    {
        title: "You're Ready! 🎓",
        content: `
            <div style="line-height: 1.8;">
                <div style="text-align: center; margin-bottom: 20px;">
                    <i class="fas fa-trophy" style="font-size: 48px; color: #f59e0b;"></i>
                    <h3 style="color: white; margin-top: 15px;">Congratulations! Tutorial Complete!</h3>
                </div>
                
                <p>You now know the basics! Here's what you learned:</p>
                
                <div style="background: rgba(16, 185, 129, 0.15); padding: 20px; border-radius: 10px; margin: 15px 0;">
                    <ul style="color: #cbd5e1; padding-left: 20px;">
                        <li style="margin-bottom: 8px;">✓ Income vs Expenses</li>
                        <li style="margin-bottom: 8px;">✓ How to record transactions</li>
                        <li style="margin-bottom: 8px;">✓ Understanding your dashboard</li>
                        <li>✓ What profit means</li>
                    </ul>
                </div>
                
                <div style="background: rgba(59, 130, 246, 0.2); padding: 15px; border-radius: 10px;">
                    <strong style="color: #60a5fa;">💡 What's Next?</strong>
                    <ul style="color: #cbd5e1; font-size: 13px; margin-top: 10px; padding-left: 20px;">
                        <li>Add your actual income & expenses</li>
                        <li>Set up recurring bills</li>
                        <li>Check the Tax section for tax estimates</li>
                        <li>Ask me anytime you have questions!</li>
                    </ul>
                </div>
            </div>`,
        actions: [
            { label: "📊 Go to Dashboard", action: "showSection('dashboard'); closeTutorial()" },
            { label: "➕ Add Income", action: "showSection('income'); closeTutorial()" },
            { label: "🔄 Restart Tutorial", action: "restartTutorial()" }
        ]
    }
];

function startBeginnerTutorial() {
    tutorialStep = 0;
    displayTutorialStep();
    showNotification('Tutorial started! Let\'s learn accounting together 🎓', 'success');
    
    // Mark tutorial as started
    aiState.tutorialStarted = true;
    saveAIState();
}

function displayTutorialStep() {
    const step = tutorialSteps[tutorialStep];
    if (!step) return;
    
    const container = document.getElementById('aiResponseContainer');
    if (!container) return;
    
    const actionsHtml = step.actions.map(a => 
        `<button class="ai-action-btn" onclick="${a.action}">${a.label}</button>`
    ).join('');
    
    container.innerHTML = `
        <div class="ai-response tutorial-response" style="border: 2px solid rgba(59, 130, 246, 0.3); background: rgba(59, 130, 246, 0.05);">
            <div class="ai-avatar" style="background: linear-gradient(135deg, #3b82f6, #8b5cf6);">
                <i class="fas fa-graduation-cap"></i>
            </div>
            <div class="response-content">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                    <h3 style="color: white;">${step.title}</h3>
                    <span style="color: #60a5fa; font-size: 12px;">Step ${tutorialStep + 1} of ${tutorialSteps.length}</span>
                </div>
                <div class="response-text">${step.content}</div>
                <div class="response-actions" style="margin-top: 15px;">
                    ${actionsHtml}
                </div>
            </div>
        </div>
    `;
    container.scrollTop = 0;
    
    // Update learning progress
    aiState.learningProgress = Math.round((tutorialStep / (tutorialSteps.length - 1)) * 100);
    const progressEl = document.getElementById('learningProgressPercent');
    const progressBar = document.getElementById('learningProgressBar');
    if (progressEl) progressEl.textContent = aiState.learningProgress + '% Complete';
    if (progressBar) progressBar.style.width = aiState.learningProgress + '%';
}

function nextTutorialStep() {
    if (tutorialStep < tutorialSteps.length - 1) {
        tutorialStep++;
        displayTutorialStep();
    }
}

function prevTutorialStep() {
    if (tutorialStep > 0) {
        tutorialStep--;
        displayTutorialStep();
    }
}

function skipTutorial() {
    closeTutorial();
    showNotification('Tutorial skipped. You can restart anytime from AI Assistant!', 'info');
}

function closeTutorial() {
    // Show default AI response
    const container = document.getElementById('aiResponseContainer');
    if (container) {
        container.innerHTML = `
            <div class="ai-response">
                <div class="ai-avatar">
                    <img src="images/ai-logo.png" alt="AI" class="ai-logo-img">
                </div>
                <div class="response-content">
                    <div class="response-text">
                        <strong style="color: #10b981;">🎓 Tutorial Complete!</strong>
                        <p style="margin-top: 10px; color: #cbd5e1;">
                            Great job! You're now ready to use EZCubic. Remember:
                        </p>
                        <ul style="margin-top: 10px; padding-left: 20px; color: #94a3b8;">
                            <li>Record income when you receive money</li>
                            <li>Record expenses when you spend money</li>
                            <li>Check your dashboard regularly</li>
                            <li>Ask me if you have any questions!</li>
                        </ul>
                    </div>
                </div>
            </div>
        `;
    }
    
    aiState.tutorialCompleted = true;
    aiState.learningProgress = 100;
    saveAIState();
}

function restartTutorial() {
    tutorialStep = 0;
    aiState.learningProgress = 0;
    displayTutorialStep();
}

// ==================== GLOBAL EXPORTS ====================
window.initAIAssistant = initAIAssistant;
window.setAIMode = setAIMode;
window.refreshInsights = refreshInsights;
window.handleAIQueryKeyPress = handleAIQueryKeyPress;
window.askAIExample = askAIExample;
window.processAIQuery = processAIQuery;
window.toggleVoiceInput = toggleVoiceInput;
window.runAutomation = runAutomation;
window.runAllAutomations = runAllAutomations;
window.setAnalyticsPeriod = setAnalyticsPeriod;
window.startLearning = startLearning;
window.toggleAnalyticsPanel = toggleAnalyticsPanel;
window.startBeginnerTutorial = startBeginnerTutorial;
window.nextTutorialStep = nextTutorialStep;
window.prevTutorialStep = prevTutorialStep;
window.skipTutorial = skipTutorial;
window.closeTutorial = closeTutorial;
window.restartTutorial = restartTutorial;

// Initialize on load
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(initAIAssistant, 500);
});
