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
    isProcessing: false,
    currentSection: 'dashboard',
    viewedTutorials: [],
    helpDismissed: false
};

// ==================== MODULE TUTORIALS ====================
const MODULE_TUTORIALS = {
    'dashboard': {
        title: 'Dashboard Overview',
        icon: 'fa-home',
        color: '#3b82f6',
        steps: [
            { title: 'Welcome to Dashboard', content: 'Your dashboard is the command center - see all your business finances at a glance. Revenue, expenses, profit, and trends are all here.', highlight: '.stats-grid' },
            { title: 'Key Metrics', content: 'The top cards show: Total Revenue (money in), Total Expenses (money out), Net Profit (what\'s left), and Pending Bills.', highlight: '.stat-card' },
            { title: 'Charts & Trends', content: 'The charts below show your income vs expenses over time. Green is good (income), red is costs. Look for upward income trends!', highlight: '.chart-container' },
            { title: 'Quick Actions', content: 'Use the sidebar to quickly jump to any section. Or ask me anything in the AI Assistant!', highlight: '.sidebar' }
        ]
    },
    'income': {
        title: 'Recording Income',
        icon: 'fa-arrow-down',
        color: '#10b981',
        steps: [
            { title: 'What is Income?', content: 'Income is money your business RECEIVES - from sales, services, interest, or any other source.', highlight: null },
            { title: 'Adding Income', content: 'Click "Add Income" to record money received. Enter the amount, add a description (e.g., "Sale to Customer A"), pick the date, and select payment method.', highlight: '#addIncomeBtn' },
            { title: 'Categories', content: 'Categorize income properly: Sales, Services, Interest, Commission, etc. This helps with tax reporting!', highlight: '.category-select' },
            { title: 'Pro Tips', content: '💡 Record income the same day you receive it!\n💡 Add invoice numbers in descriptions for easy tracking\n💡 Export monthly for your records', highlight: null }
        ]
    },
    'expenses': {
        title: 'Recording Expenses',
        icon: 'fa-arrow-up',
        color: '#ef4444',
        steps: [
            { title: 'What are Expenses?', content: 'Expenses are business costs - rent, utilities, supplies, salaries, marketing, anything you spend money on.', highlight: null },
            { title: 'Adding Expenses', content: 'Click "Add Expense", enter amount, choose category (Rent, Utilities, etc.), add description and receipt number if available.', highlight: '#addExpenseBtn' },
            { title: 'Why Categories Matter', content: 'Proper categorization = better tax deductions! Rent, utilities, office supplies, marketing - all deductible. Wrong category = missed savings.', highlight: '.category-select' },
            { title: 'Keep Receipts!', content: '⚠️ LHDN requires receipts for 7 years!\n💡 Take photos of paper receipts\n💡 Add receipt numbers in descriptions\n💡 No receipt = No tax deduction', highlight: null }
        ]
    },
    'pos': {
        title: 'Point of Sale (POS)',
        icon: 'fa-cash-register',
        color: '#8b5cf6',
        steps: [
            { title: 'Welcome to POS', content: 'The POS is your digital cash register! Perfect for retail shops, restaurants, or any business selling products directly to customers.', highlight: null },
            { title: 'Making a Sale', content: '1. Search or click products to add to cart\n2. Adjust quantities if needed\n3. Apply discounts if any\n4. Select payment method\n5. Complete the sale!', highlight: '.pos-grid' },
            { title: 'Product Management', content: 'Go to Inventory to add products. Set prices, stock levels, and categories. Products will appear in POS automatically.', highlight: null },
            { title: 'Daily Summary', content: 'At end of day, check "Daily Sales" to see total sales, payment breakdown, and top-selling items. Great for cash reconciliation!', highlight: null }
        ]
    },
    'inventory': {
        title: 'Inventory Management',
        icon: 'fa-boxes',
        color: '#f59e0b',
        steps: [
            { title: 'Why Inventory?', content: 'Track what you have, what\'s selling, and when to reorder. Never run out of stock or overstock again!', highlight: null },
            { title: 'Adding Products', content: 'Click "Add Product" → Enter name, SKU, cost price, selling price, quantity, and category. Set low stock alert level!', highlight: '#addProductBtn' },
            { title: 'Stock Movements', content: 'Record stock in (purchases from supplier) and stock out (sales, damaged, etc.). Every movement is tracked for accurate counts.', highlight: '.stock-actions' },
            { title: 'Low Stock Alerts', content: 'Set minimum stock levels. When stock drops below, you\'ll see alerts. Never lose sales due to stockouts!', highlight: '.low-stock-alert' }
        ]
    },
    'crm': {
        title: 'Customer Management (CRM)',
        icon: 'fa-users',
        color: '#06b6d4',
        steps: [
            { title: 'What is CRM?', content: 'CRM = Customer Relationship Management. Keep track of all your customers, their purchase history, and communication.', highlight: null },
            { title: 'Adding Customers', content: 'Click "Add Customer" → Enter name, email, phone, address. Link to a company if B2B. Track every interaction!', highlight: '#addCustomerBtn' },
            { title: 'Customer History', content: 'Click any customer to see their complete history: orders, payments, notes. Know your best customers!', highlight: '.customer-card' },
            { title: 'Why Track Customers?', content: '💡 Identify VIP customers (top spenders)\n💡 Send targeted promotions\n💡 Follow up on unpaid invoices\n💡 Build lasting relationships', highlight: null }
        ]
    },
    'quotations': {
        title: 'Quotations',
        icon: 'fa-file-invoice-dollar',
        color: '#ec4899',
        steps: [
            { title: 'What are Quotations?', content: 'Quotations are price estimates you give to customers BEFORE they confirm an order. Professional way to win business!', highlight: null },
            { title: 'Creating a Quote', content: '1. Click "New Quotation"\n2. Select customer\n3. Add items with prices\n4. Set validity period\n5. Add terms & notes\n6. Send to customer!', highlight: '#newQuotationBtn' },
            { title: 'Quote to Order', content: 'When customer accepts, click "Convert to Order" - automatically creates order from the quotation. No double work!', highlight: '.convert-btn' },
            { title: 'Track Win Rate', content: 'See how many quotes convert to orders. Low conversion? Maybe adjust pricing or follow up faster!', highlight: null }
        ]
    },
    'projects': {
        title: 'Project Management',
        icon: 'fa-project-diagram',
        color: '#14b8a6',
        steps: [
            { title: 'What are Projects?', content: 'Track long-term work with multiple milestones. Perfect for contractors, agencies, consultants, and service businesses.', highlight: null },
            { title: 'Creating Projects', content: '1. Click "New Project"\n2. Enter name, client, start/end dates\n3. Set budget\n4. Add milestones\n5. Assign team members', highlight: '#newProjectBtn' },
            { title: 'Milestones & Tasks', content: 'Break projects into milestones. Each milestone has tasks. Track progress percentage and due dates.', highlight: '.milestone-list' },
            { title: 'Profitability', content: 'Track costs vs budget. See if project is profitable before it ends. Adjust scope if over budget!', highlight: '.project-budget' }
        ]
    },
    'bills': {
        title: 'Bills Management',
        icon: 'fa-file-invoice',
        color: '#f97316',
        steps: [
            { title: 'Never Miss a Payment', content: 'Track all your recurring bills - rent, utilities, subscriptions, loans. Get reminders before due dates!', highlight: null },
            { title: 'Adding Bills', content: 'Click "Add Bill" → Enter name, amount, due date, category. Set as recurring if it repeats monthly/yearly.', highlight: '#addBillBtn' },
            { title: 'Payment Tracking', content: 'Mark bills as paid when you pay them. The system calculates what\'s upcoming and what\'s overdue.', highlight: '.bill-status' },
            { title: 'Recurring Bills', content: '💡 Set up monthly bills once, they auto-repeat!\n💡 Examples: TNB, Water, Internet, Rent, Insurance\n💡 Check "Bills Due" on dashboard regularly', highlight: null }
        ]
    },
    'taxes': {
        title: 'Tax Center',
        icon: 'fa-percentage',
        color: '#ef4444',
        steps: [
            { title: 'Malaysian Tax Basics', content: 'Business tax in Malaysia: 15% on first RM150k, 17% on next RM450k, 24% above. SST is separate (Sales 10%, Service 8%).', highlight: null },
            { title: 'Tax Calculator', content: 'Enter your income and expenses, the calculator estimates your tax automatically. Shows deductions and final amount.', highlight: '.tax-calculator' },
            { title: 'Reduce Tax Legally', content: '💡 Record ALL business expenses (reduce taxable profit)\n💡 EPF/SOCSO contributions are deductible\n💡 Capital allowances for equipment\n💡 Keep proper records!', highlight: null },
            { title: 'SST Registration', content: 'Annual revenue > RM500k? You must register for SST. Charge SST on sales, claim back on purchases.', highlight: '.sst-section' }
        ]
    },
    'reports': {
        title: 'Reports & Analysis',
        icon: 'fa-chart-pie',
        color: '#8b5cf6',
        steps: [
            { title: 'Why Reports?', content: 'Reports show the big picture. Are you profitable? Where\'s money going? What\'s trending? Make better decisions!', highlight: null },
            { title: 'Key Reports', content: '📊 Profit & Loss - Income vs Expenses\n📋 Balance Sheet - Assets vs Liabilities\n📈 Cash Flow - Money movement\n🧾 Tax Summary - For LHDN filing', highlight: '.report-list' },
            { title: 'Monthly Review', content: 'Every month, check your P&L report. Compare to previous months. Spot problems early!', highlight: '.monthly-reports' },
            { title: 'Export for Accountant', content: 'Use Export to PDF/Excel. Send to your accountant for tax filing. Professional reports = happy accountant!', highlight: '.export-btn' }
        ]
    },
    'balance-sheet': {
        title: 'Balance Sheet',
        icon: 'fa-balance-scale',
        color: '#6366f1',
        steps: [
            { title: 'What is Balance Sheet?', content: 'Shows your business NET WORTH at a point in time. Assets (what you own) minus Liabilities (what you owe) = Equity (your worth).', highlight: null },
            { title: 'Assets', content: 'What you OWN:\n💰 Cash in bank\n📦 Inventory value\n🏢 Equipment/vehicles\n📄 Money owed to you (receivables)', highlight: '.assets-section' },
            { title: 'Liabilities', content: 'What you OWE:\n🏦 Bank loans\n💳 Credit card debt\n📋 Unpaid bills\n👥 Money owed to suppliers', highlight: '.liabilities-section' },
            { title: 'Reading It', content: '✅ Assets > Liabilities = GOOD (positive equity)\n❌ Liabilities > Assets = TROUBLE (debt exceeds worth)\n💡 Goal: Grow assets, minimize liabilities', highlight: null }
        ]
    },
    'settings': {
        title: 'Settings',
        icon: 'fa-cog',
        color: '#64748b',
        steps: [
            { title: 'Business Profile', content: 'Enter your business name, SSM number, address, and TIN. This appears on all reports and exports.', highlight: '.business-profile' },
            { title: 'User Management', content: 'Add staff accounts with different permissions. Manager, Staff, Viewer roles. Control who sees what.', highlight: '.user-management' },
            { title: 'Cloud Sync', content: 'Enable cloud sync to backup data and access from multiple devices. Enter Company Code to sync with team.', highlight: '.cloud-sync' },
            { title: 'Preferences', content: 'Dark/light mode, currency format, date format, notifications. Customize to your liking!', highlight: '.preferences' }
        ]
    }
};

// Quick Help Topics - Contextual
const QUICK_HELP = {
    'dashboard': ['How do I read my dashboard?', 'What does net profit mean?', 'How to improve my profit?'],
    'income': ['How to add income?', 'What categories for income?', 'How to record a sale?'],
    'expenses': ['How to add an expense?', 'What receipts to keep?', 'Tax-deductible expenses?'],
    'pos': ['How to make a sale?', 'How to apply discount?', 'How to add products to POS?'],
    'inventory': ['How to add products?', 'How to track stock?', 'What is low stock alert?'],
    'crm': ['How to add customers?', 'How to track customer orders?', 'What is customer history?'],
    'quotations': ['How to create quotation?', 'How to convert quote to order?', 'Quotation templates?'],
    'projects': ['How to create project?', 'How to add milestones?', 'How to track project profit?'],
    'bills': ['How to add recurring bill?', 'How to mark bill as paid?', 'Bill reminders setup?'],
    'taxes': ['How much tax do I pay?', 'Malaysian tax rates?', 'How to reduce tax legally?'],
    'reports': ['How to generate report?', 'Export to Excel/PDF?', 'Monthly vs yearly reports?'],
    'balance-sheet': ['What is balance sheet?', 'Assets vs liabilities?', 'How to read balance sheet?'],
    'settings': ['How to change business name?', 'How to add team members?', 'How to sync data?']
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
    
    // ==================== POS QUESTIONS ====================
    if (lowerQuery.includes('pos') || lowerQuery.includes('point of sale') || lowerQuery.includes('cash register')) {
        if (lowerQuery.includes('how') || lowerQuery.includes('use') || lowerQuery.includes('work')) {
            return {
                text: `<strong>🛒 How to Use POS (Point of Sale)</strong>
                    <div style="margin-top: 15px; line-height: 1.8;">
                        <p>POS is your digital cash register - perfect for retail sales!</p>
                        
                        <div style="background: rgba(139, 92, 246, 0.15); padding: 20px; border-radius: 10px; margin: 15px 0;">
                            <strong style="color: #a78bfa;">Quick Steps to Make a Sale:</strong>
                            <ol style="color: #cbd5e1; padding-left: 20px; margin-top: 10px;">
                                <li style="margin-bottom: 8px;">Go to <strong>POS</strong> section</li>
                                <li style="margin-bottom: 8px;">Search or click products to add to cart</li>
                                <li style="margin-bottom: 8px;">Adjust quantity using +/- buttons</li>
                                <li style="margin-bottom: 8px;">Apply discount if needed</li>
                                <li style="margin-bottom: 8px;">Select payment: Cash, Card, or E-Wallet</li>
                                <li>Click <strong>"Complete Sale"</strong></li>
                            </ol>
                        </div>
                        
                        <div style="background: rgba(245, 158, 11, 0.15); padding: 12px; border-radius: 8px;">
                            <strong style="color: #fcd34d;">💡 Tips:</strong>
                            <ul style="color: #94a3b8; padding-left: 20px; margin-top: 5px; font-size: 13px;">
                                <li>Add products in Inventory first</li>
                                <li>Use barcode scanner for faster checkout</li>
                                <li>Check Daily Sales for cash reconciliation</li>
                            </ul>
                        </div>
                    </div>`,
                actions: [
                    { label: '🛒 Go to POS', action: "showSection('pos')" },
                    { label: '📦 Add Products', action: "showSection('inventory')" },
                    { label: '📚 POS Tutorial', action: "startModuleTutorial('pos')" }
                ]
            };
        }
        
        if (lowerQuery.includes('discount')) {
            return {
                text: `<strong>💰 How to Apply Discounts in POS</strong>
                    <div style="margin-top: 15px;">
                        <ol style="color: #cbd5e1; padding-left: 20px; line-height: 2;">
                            <li>Add items to cart first</li>
                            <li>Click <strong>"Apply Discount"</strong> button</li>
                            <li>Enter discount:
                                <ul style="padding-left: 20px; margin-top: 5px;">
                                    <li>Percentage: e.g., 10%</li>
                                    <li>Fixed amount: e.g., RM 5</li>
                                </ul>
                            </li>
                            <li>Discount will be applied to total</li>
                        </ol>
                        
                        <div style="background: rgba(16, 185, 129, 0.15); padding: 12px; border-radius: 8px; margin-top: 15px;">
                            <strong style="color: #6ee7b7;">💡 Pro Tip:</strong>
                            <span style="color: #94a3b8;"> Set up preset discounts (5%, 10%, 20%) for faster checkout!</span>
                        </div>
                    </div>`,
                actions: [
                    { label: '🛒 Go to POS', action: "showSection('pos')" }
                ]
            };
        }
    }
    
    // ==================== INVENTORY QUESTIONS ====================
    if (lowerQuery.includes('inventory') || lowerQuery.includes('stock') || lowerQuery.includes('product')) {
        if (lowerQuery.includes('add') || lowerQuery.includes('create') || lowerQuery.includes('new')) {
            return {
                text: `<strong>📦 How to Add Products to Inventory</strong>
                    <div style="margin-top: 15px; line-height: 1.8;">
                        <div style="background: rgba(245, 158, 11, 0.15); padding: 20px; border-radius: 10px; margin-bottom: 15px;">
                            <strong style="color: #fcd34d;">Step-by-Step:</strong>
                            <ol style="color: #cbd5e1; padding-left: 20px; margin-top: 10px;">
                                <li style="margin-bottom: 8px;">Go to <strong>Inventory</strong> section</li>
                                <li style="margin-bottom: 8px;">Click <strong>"Add Product"</strong></li>
                                <li style="margin-bottom: 8px;">Enter product details:
                                    <ul style="padding-left: 15px; margin-top: 5px; color: #94a3b8;">
                                        <li>Name: Product name</li>
                                        <li>SKU: Unique code (optional)</li>
                                        <li>Cost Price: What you pay</li>
                                        <li>Selling Price: What customer pays</li>
                                        <li>Quantity: Current stock</li>
                                        <li>Category: Food, Electronics, etc.</li>
                                    </ul>
                                </li>
                                <li style="margin-bottom: 8px;">Set <strong>Low Stock Alert</strong> level</li>
                                <li>Click <strong>"Save Product"</strong></li>
                            </ol>
                        </div>
                        
                        <p style="color: #10b981;">✓ Product will automatically appear in POS!</p>
                    </div>`,
                actions: [
                    { label: '📦 Go to Inventory', action: "showSection('inventory')" },
                    { label: '📚 Inventory Tutorial', action: "startModuleTutorial('inventory')" }
                ]
            };
        }
        
        if (lowerQuery.includes('low') || lowerQuery.includes('alert') || lowerQuery.includes('reorder')) {
            return {
                text: `<strong>⚠️ Low Stock Alerts</strong>
                    <div style="margin-top: 15px; line-height: 1.8;">
                        <p>Get notified when products are running low so you never miss a sale!</p>
                        
                        <div style="background: rgba(239, 68, 68, 0.15); padding: 15px; border-radius: 10px; margin: 15px 0;">
                            <strong style="color: #fca5a5;">How it Works:</strong>
                            <ol style="color: #cbd5e1; padding-left: 20px; margin-top: 10px;">
                                <li>When adding/editing a product, set "Low Stock Level"</li>
                                <li>Example: Set to 10 units</li>
                                <li>When stock drops to 10 or below, you'll see alerts</li>
                                <li>Alerts appear on Dashboard and Inventory</li>
                            </ol>
                        </div>
                        
                        <div style="background: rgba(245, 158, 11, 0.15); padding: 12px; border-radius: 8px;">
                            <strong style="color: #fcd34d;">💡 Recommended Levels:</strong>
                            <ul style="color: #94a3b8; padding-left: 20px; margin-top: 5px; font-size: 13px;">
                                <li>Fast-selling items: 20-30 units</li>
                                <li>Normal items: 10-15 units</li>
                                <li>Slow-moving items: 5 units</li>
                            </ul>
                        </div>
                    </div>`,
                actions: [
                    { label: '📦 Check Inventory', action: "showSection('inventory')" }
                ]
            };
        }
        
        if (lowerQuery.includes('track') || lowerQuery.includes('manage')) {
            return {
                text: `<strong>📦 Inventory Tracking Guide</strong>
                    <div style="margin-top: 15px; line-height: 1.8;">
                        <div style="display: grid; gap: 12px;">
                            <div style="background: rgba(16, 185, 129, 0.15); padding: 15px; border-radius: 8px;">
                                <strong style="color: #6ee7b7;">📥 Stock In (Receiving)</strong>
                                <p style="color: #94a3b8; font-size: 13px; margin-top: 5px;">When you receive stock from supplier, add a "Stock In" movement to increase quantity.</p>
                            </div>
                            <div style="background: rgba(239, 68, 68, 0.15); padding: 15px; border-radius: 8px;">
                                <strong style="color: #fca5a5;">📤 Stock Out (Sales/Adjustments)</strong>
                                <p style="color: #94a3b8; font-size: 13px; margin-top: 5px;">POS sales auto-deduct. For damaged/lost items, add "Stock Out" manually.</p>
                            </div>
                            <div style="background: rgba(59, 130, 246, 0.15); padding: 15px; border-radius: 8px;">
                                <strong style="color: #93c5fd;">📊 Stock Reports</strong>
                                <p style="color: #94a3b8; font-size: 13px; margin-top: 5px;">View stock levels, valuation, movement history. Export for stocktake!</p>
                            </div>
                        </div>
                    </div>`,
                actions: [
                    { label: '📦 Go to Inventory', action: "showSection('inventory')" },
                    { label: '📚 Full Tutorial', action: "startModuleTutorial('inventory')" }
                ]
            };
        }
    }
    
    // ==================== CRM / CUSTOMER QUESTIONS ====================
    if (lowerQuery.includes('customer') || lowerQuery.includes('crm') || lowerQuery.includes('client')) {
        if (lowerQuery.includes('add') || lowerQuery.includes('new') || lowerQuery.includes('create')) {
            return {
                text: `<strong>👥 How to Add Customers</strong>
                    <div style="margin-top: 15px; line-height: 1.8;">
                        <div style="background: rgba(6, 182, 212, 0.15); padding: 20px; border-radius: 10px;">
                            <strong style="color: #22d3ee;">Quick Steps:</strong>
                            <ol style="color: #cbd5e1; padding-left: 20px; margin-top: 10px;">
                                <li style="margin-bottom: 8px;">Go to <strong>CRM / Customers</strong></li>
                                <li style="margin-bottom: 8px;">Click <strong>"Add Customer"</strong></li>
                                <li style="margin-bottom: 8px;">Enter details:
                                    <ul style="padding-left: 15px; margin-top: 5px; color: #94a3b8;">
                                        <li>Name (required)</li>
                                        <li>Email</li>
                                        <li>Phone number</li>
                                        <li>Address</li>
                                        <li>Company (if B2B)</li>
                                    </ul>
                                </li>
                                <li>Click <strong>"Save Customer"</strong></li>
                            </ol>
                        </div>
                        
                        <div style="margin-top: 15px; color: #94a3b8; font-size: 13px;">
                            💡 You can also add customers during POS checkout or when creating quotations!
                        </div>
                    </div>`,
                actions: [
                    { label: '👥 Go to CRM', action: "showSection('crm')" },
                    { label: '📚 CRM Tutorial', action: "startModuleTutorial('crm')" }
                ]
            };
        }
        
        if (lowerQuery.includes('history') || lowerQuery.includes('track') || lowerQuery.includes('order')) {
            return {
                text: `<strong>📋 Customer History & Tracking</strong>
                    <div style="margin-top: 15px; line-height: 1.8;">
                        <p>Click on any customer to see their complete history!</p>
                        
                        <div style="background: rgba(6, 182, 212, 0.15); padding: 15px; border-radius: 10px; margin: 15px 0;">
                            <strong style="color: #22d3ee;">What You Can See:</strong>
                            <ul style="color: #cbd5e1; padding-left: 20px; margin-top: 10px;">
                                <li>All orders/purchases</li>
                                <li>Total spent (lifetime value)</li>
                                <li>Payment history</li>
                                <li>Outstanding amounts</li>
                                <li>Notes & interactions</li>
                                <li>Quotations sent</li>
                            </ul>
                        </div>
                        
                        <div style="background: rgba(245, 158, 11, 0.15); padding: 12px; border-radius: 8px;">
                            <strong style="color: #fcd34d;">💡 Why Track Customers?</strong>
                            <ul style="color: #94a3b8; padding-left: 20px; margin-top: 5px; font-size: 13px;">
                                <li>Identify VIP customers (top spenders)</li>
                                <li>Follow up on unpaid invoices</li>
                                <li>Send birthday/loyalty promotions</li>
                                <li>Personalize service based on history</li>
                            </ul>
                        </div>
                    </div>`,
                actions: [
                    { label: '👥 View Customers', action: "showSection('crm')" }
                ]
            };
        }
    }
    
    // ==================== QUOTATION QUESTIONS ====================
    if (lowerQuery.includes('quotation') || lowerQuery.includes('quote') || lowerQuery.includes('estimate')) {
        if (lowerQuery.includes('create') || lowerQuery.includes('how') || lowerQuery.includes('make')) {
            return {
                text: `<strong>📝 How to Create a Quotation</strong>
                    <div style="margin-top: 15px; line-height: 1.8;">
                        <div style="background: rgba(236, 72, 153, 0.15); padding: 20px; border-radius: 10px;">
                            <strong style="color: #f472b6;">Step-by-Step:</strong>
                            <ol style="color: #cbd5e1; padding-left: 20px; margin-top: 10px;">
                                <li style="margin-bottom: 8px;">Go to <strong>Quotations</strong></li>
                                <li style="margin-bottom: 8px;">Click <strong>"New Quotation"</strong></li>
                                <li style="margin-bottom: 8px;">Select or add customer</li>
                                <li style="margin-bottom: 8px;">Add items:
                                    <ul style="padding-left: 15px; margin-top: 5px; color: #94a3b8;">
                                        <li>Item description</li>
                                        <li>Quantity</li>
                                        <li>Unit price</li>
                                    </ul>
                                </li>
                                <li style="margin-bottom: 8px;">Set validity period (e.g., 14 days)</li>
                                <li style="margin-bottom: 8px;">Add terms & conditions</li>
                                <li>Click <strong>"Save"</strong> then <strong>"Send"</strong></li>
                            </ol>
                        </div>
                        
                        <p style="margin-top: 15px; color: #10b981;">✓ Customer accepts? Click "Convert to Order" - no retyping!</p>
                    </div>`,
                actions: [
                    { label: '📝 Create Quotation', action: "showSection('quotations')" },
                    { label: '📚 Quotations Tutorial', action: "startModuleTutorial('quotations')" }
                ]
            };
        }
        
        if (lowerQuery.includes('convert') || lowerQuery.includes('order') || lowerQuery.includes('accept')) {
            return {
                text: `<strong>✅ Converting Quotation to Order</strong>
                    <div style="margin-top: 15px; line-height: 1.8;">
                        <p>When customer accepts your quotation:</p>
                        
                        <div style="background: rgba(16, 185, 129, 0.15); padding: 15px; border-radius: 10px; margin: 15px 0;">
                            <ol style="color: #cbd5e1; padding-left: 20px;">
                                <li style="margin-bottom: 8px;">Open the quotation</li>
                                <li style="margin-bottom: 8px;">Click <strong>"Convert to Order"</strong></li>
                                <li style="margin-bottom: 8px;">Review order details</li>
                                <li>Confirm and save</li>
                            </ol>
                        </div>
                        
                        <p style="color: #94a3b8; font-size: 13px;">
                            💡 All items, prices, and customer info are auto-copied. The quotation is marked as "Accepted".
                        </p>
                    </div>`,
                actions: [
                    { label: '📝 View Quotations', action: "showSection('quotations')" }
                ]
            };
        }
    }
    
    // ==================== PROJECT QUESTIONS ====================
    if (lowerQuery.includes('project') || lowerQuery.includes('milestone') || lowerQuery.includes('task')) {
        if (lowerQuery.includes('create') || lowerQuery.includes('new') || lowerQuery.includes('how')) {
            return {
                text: `<strong>📋 How to Create & Manage Projects</strong>
                    <div style="margin-top: 15px; line-height: 1.8;">
                        <div style="background: rgba(20, 184, 166, 0.15); padding: 20px; border-radius: 10px;">
                            <strong style="color: #2dd4bf;">Creating a Project:</strong>
                            <ol style="color: #cbd5e1; padding-left: 20px; margin-top: 10px;">
                                <li style="margin-bottom: 8px;">Go to <strong>Projects</strong></li>
                                <li style="margin-bottom: 8px;">Click <strong>"New Project"</strong></li>
                                <li style="margin-bottom: 8px;">Enter details:
                                    <ul style="padding-left: 15px; margin-top: 5px; color: #94a3b8;">
                                        <li>Project name</li>
                                        <li>Client/Customer</li>
                                        <li>Start & end dates</li>
                                        <li>Budget</li>
                                    </ul>
                                </li>
                                <li style="margin-bottom: 8px;">Add <strong>Milestones</strong> (phases)</li>
                                <li>Add <strong>Tasks</strong> under each milestone</li>
                            </ol>
                        </div>
                        
                        <div style="margin-top: 15px; background: rgba(245, 158, 11, 0.15); padding: 12px; border-radius: 8px;">
                            <strong style="color: #fcd34d;">💡 Example Milestones:</strong>
                            <span style="color: #94a3b8;"> Design → Development → Testing → Launch</span>
                        </div>
                    </div>`,
                actions: [
                    { label: '📋 Go to Projects', action: "showSection('projects')" },
                    { label: '📚 Projects Tutorial', action: "startModuleTutorial('projects')" }
                ]
            };
        }
        
        if (lowerQuery.includes('profit') || lowerQuery.includes('budget') || lowerQuery.includes('cost')) {
            return {
                text: `<strong>💰 Project Profitability Tracking</strong>
                    <div style="margin-top: 15px; line-height: 1.8;">
                        <p>Track if your project is profitable before it ends!</p>
                        
                        <div style="display: grid; gap: 10px; margin: 15px 0;">
                            <div style="background: rgba(16, 185, 129, 0.15); padding: 12px; border-radius: 8px;">
                                <strong style="color: #6ee7b7;">Budget</strong>
                                <p style="color: #94a3b8; font-size: 13px;">Set when creating project - what client pays</p>
                            </div>
                            <div style="background: rgba(239, 68, 68, 0.15); padding: 12px; border-radius: 8px;">
                                <strong style="color: #fca5a5;">Costs</strong>
                                <p style="color: #94a3b8; font-size: 13px;">Add expenses as you incur them - materials, labor, etc.</p>
                            </div>
                            <div style="background: rgba(59, 130, 246, 0.15); padding: 12px; border-radius: 8px;">
                                <strong style="color: #93c5fd;">Profit = Budget - Costs</strong>
                                <p style="color: #94a3b8; font-size: 13px;">See real-time profit margin throughout the project</p>
                            </div>
                        </div>
                        
                        <p style="color: #f59e0b;">⚠️ If costs exceed budget, adjust scope or timeline!</p>
                    </div>`,
                actions: [
                    { label: '📋 View Projects', action: "showSection('projects')" }
                ]
            };
        }
    }
    
    // ==================== TUTORIAL/HELP REQUESTS ====================
    if (lowerQuery.includes('tutorial') || lowerQuery.includes('learn') || lowerQuery.includes('guide') || lowerQuery.includes('teach')) {
        return {
            text: `<strong>📚 Available Tutorials & Guides</strong>
                <div style="margin-top: 15px; line-height: 1.8;">
                    <p style="color: #cbd5e1;">Click any topic to start learning:</p>
                    
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 15px;">
                        <button onclick="startBeginnerTutorial()" style="background: rgba(59, 130, 246, 0.2); border: none; padding: 15px; border-radius: 8px; cursor: pointer; text-align: left;">
                            <strong style="color: #60a5fa;">🎓 Beginner Tutorial</strong>
                            <p style="color: #94a3b8; font-size: 12px; margin-top: 3px;">New to accounting? Start here!</p>
                        </button>
                        <button onclick="startModuleTutorial('dashboard')" style="background: rgba(16, 185, 129, 0.2); border: none; padding: 15px; border-radius: 8px; cursor: pointer; text-align: left;">
                            <strong style="color: #6ee7b7;">📊 Dashboard</strong>
                            <p style="color: #94a3b8; font-size: 12px; margin-top: 3px;">Understand your finances</p>
                        </button>
                        <button onclick="startModuleTutorial('pos')" style="background: rgba(139, 92, 246, 0.2); border: none; padding: 15px; border-radius: 8px; cursor: pointer; text-align: left;">
                            <strong style="color: #a78bfa;">🛒 POS System</strong>
                            <p style="color: #94a3b8; font-size: 12px; margin-top: 3px;">Make sales like a pro</p>
                        </button>
                        <button onclick="startModuleTutorial('inventory')" style="background: rgba(245, 158, 11, 0.2); border: none; padding: 15px; border-radius: 8px; cursor: pointer; text-align: left;">
                            <strong style="color: #fcd34d;">📦 Inventory</strong>
                            <p style="color: #94a3b8; font-size: 12px; margin-top: 3px;">Track your products</p>
                        </button>
                        <button onclick="startModuleTutorial('taxes')" style="background: rgba(239, 68, 68, 0.2); border: none; padding: 15px; border-radius: 8px; cursor: pointer; text-align: left;">
                            <strong style="color: #fca5a5;">🧾 Taxes</strong>
                            <p style="color: #94a3b8; font-size: 12px; margin-top: 3px;">Malaysian tax guide</p>
                        </button>
                        <button onclick="showAllTutorials()" style="background: rgba(100, 116, 139, 0.2); border: none; padding: 15px; border-radius: 8px; cursor: pointer; text-align: left;">
                            <strong style="color: #94a3b8;">📖 All Tutorials</strong>
                            <p style="color: #64748b; font-size: 12px; margin-top: 3px;">See full list</p>
                        </button>
                    </div>
                </div>`,
            actions: [
                { label: '🎓 Start Beginner Tutorial', action: "startBeginnerTutorial()" },
                { label: '📖 All Tutorials', action: "showAllTutorials()" }
            ]
        };
    }
    
    // ==================== HELP / WHAT CAN YOU DO ====================
    if (lowerQuery.includes('help') || lowerQuery.includes('what can you') || lowerQuery.includes('assist')) {
        return {
            text: `<strong>🤖 Hi! I'm your AI Assistant!</strong>
                <div style="margin-top: 15px; line-height: 1.8;">
                    <p style="color: #cbd5e1;">I can help you with lots of things:</p>
                    
                    <div style="display: grid; gap: 10px; margin-top: 15px;">
                        <div style="background: rgba(59, 130, 246, 0.15); padding: 12px; border-radius: 8px;">
                            <strong style="color: #60a5fa;">📚 Learn & Tutorial</strong>
                            <p style="color: #94a3b8; font-size: 12px;">Step-by-step guides for every feature</p>
                        </div>
                        <div style="background: rgba(16, 185, 129, 0.15); padding: 12px; border-radius: 8px;">
                            <strong style="color: #6ee7b7;">📊 Business Insights</strong>
                            <p style="color: #94a3b8; font-size: 12px;">"Show my profit", "Top expenses", "Cash flow"</p>
                        </div>
                        <div style="background: rgba(245, 158, 11, 0.15); padding: 12px; border-radius: 8px;">
                            <strong style="color: #fcd34d;">🧾 Tax Help</strong>
                            <p style="color: #94a3b8; font-size: 12px;">Malaysian tax rates, deductions, SST info</p>
                        </div>
                        <div style="background: rgba(239, 68, 68, 0.15); padding: 12px; border-radius: 8px;">
                            <strong style="color: #fca5a5;">📅 Reminders</strong>
                            <p style="color: #94a3b8; font-size: 12px;">"Bills due soon", upcoming payments</p>
                        </div>
                        <div style="background: rgba(139, 92, 246, 0.15); padding: 12px; border-radius: 8px;">
                            <strong style="color: #a78bfa;">🔧 How-To Guides</strong>
                            <p style="color: #94a3b8; font-size: 12px;">POS, Inventory, CRM, Projects, Quotations</p>
                        </div>
                    </div>
                    
                    <p style="margin-top: 15px; color: #f59e0b; font-size: 13px;">
                        💡 Just type your question or click the buttons below!
                    </p>
                </div>`,
            actions: [
                { label: '🎓 Start Tutorial', action: "startBeginnerTutorial()" },
                { label: '📊 My Profit', action: "askAIExample('Show my profit this month')" },
                { label: '📚 All Guides', action: "showAllTutorials()" }
            ]
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
        if (event.error === 'aborted') {
            console.log('⚠️ Speech recognition aborted (connection issue)');
            showNotification('Microphone interrupted. Check your connection and try again.', 'warning');
            setTimeout(() => stopVoiceInput(), 2000);
        } else if (event.error === 'network') {
            console.log('⚠️ Network error during speech recognition');
            showNotification('Network connection lost. Please check your internet.', 'error');
            stopVoiceInput();
        } else if (event.error === 'not-allowed') {
            console.log('⚠️ Microphone permission denied');
            showNotification('Microphone access denied. Please allow microphone in settings.', 'error');
            stopVoiceInput();
        } else {
            showNotification('Voice recognition error: ' + event.error, 'error');
            stopVoiceInput();
        }
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
window.startModuleTutorial = startModuleTutorial;
window.nextModuleStep = nextModuleStep;
window.prevModuleStep = prevModuleStep;
window.closeModuleTutorial = closeModuleTutorial;
window.showContextualHelp = showContextualHelp;
window.showQuickGuide = showQuickGuide;
window.dismissContextualHelp = dismissContextualHelp;
window.showAllTutorials = showAllTutorials;

// ==================== MODULE TUTORIAL SYSTEM ====================
let currentModuleTutorial = null;
let moduleStep = 0;

function startModuleTutorial(moduleName) {
    const tutorial = MODULE_TUTORIALS[moduleName];
    if (!tutorial) {
        showNotification('Tutorial not available for this section', 'info');
        return;
    }
    
    currentModuleTutorial = moduleName;
    moduleStep = 0;
    
    // Track viewed tutorials
    if (!aiState.viewedTutorials.includes(moduleName)) {
        aiState.viewedTutorials.push(moduleName);
        saveAIState();
    }
    
    displayModuleTutorialStep();
    showNotification(`Starting ${tutorial.title} tutorial 🎓`, 'info');
}

function displayModuleTutorialStep() {
    const tutorial = MODULE_TUTORIALS[currentModuleTutorial];
    if (!tutorial) return;
    
    const step = tutorial.steps[moduleStep];
    if (!step) return;
    
    const container = document.getElementById('aiResponseContainer');
    if (!container) return;
    
    const progressPercent = Math.round(((moduleStep + 1) / tutorial.steps.length) * 100);
    
    container.innerHTML = `
        <div class="ai-response module-tutorial" style="border: 2px solid ${tutorial.color}33; background: ${tutorial.color}08;">
            <div class="ai-avatar" style="background: ${tutorial.color};">
                <i class="fas ${tutorial.icon}"></i>
            </div>
            <div class="response-content">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                    <div>
                        <span style="color: ${tutorial.color}; font-size: 12px; text-transform: uppercase;">${tutorial.title}</span>
                        <h3 style="color: white; margin-top: 5px;">${step.title}</h3>
                    </div>
                    <span style="color: #64748b; font-size: 12px;">Step ${moduleStep + 1}/${tutorial.steps.length}</span>
                </div>
                
                <div style="background: rgba(0,0,0,0.2); height: 4px; border-radius: 2px; margin-bottom: 15px;">
                    <div style="background: ${tutorial.color}; height: 100%; width: ${progressPercent}%; border-radius: 2px; transition: width 0.3s;"></div>
                </div>
                
                <div class="response-text" style="white-space: pre-line; line-height: 1.8;">
                    ${step.content}
                </div>
                
                <div class="response-actions" style="margin-top: 20px; display: flex; gap: 10px; flex-wrap: wrap;">
                    ${moduleStep > 0 ? '<button class="ai-action-btn secondary" onclick="prevModuleStep()"><i class="fas fa-arrow-left"></i> Back</button>' : ''}
                    ${moduleStep < tutorial.steps.length - 1 
                        ? '<button class="ai-action-btn primary" onclick="nextModuleStep()">Next <i class="fas fa-arrow-right"></i></button>' 
                        : '<button class="ai-action-btn success" onclick="closeModuleTutorial()"><i class="fas fa-check"></i> Done!</button>'}
                    <button class="ai-action-btn outline" onclick="closeModuleTutorial()">Exit Tutorial</button>
                </div>
            </div>
        </div>
    `;
    
    container.scrollTop = 0;
}

function nextModuleStep() {
    const tutorial = MODULE_TUTORIALS[currentModuleTutorial];
    if (moduleStep < tutorial.steps.length - 1) {
        moduleStep++;
        displayModuleTutorialStep();
    }
}

function prevModuleStep() {
    if (moduleStep > 0) {
        moduleStep--;
        displayModuleTutorialStep();
    }
}

function closeModuleTutorial() {
    const tutorial = MODULE_TUTORIALS[currentModuleTutorial];
    currentModuleTutorial = null;
    moduleStep = 0;
    
    const container = document.getElementById('aiResponseContainer');
    if (container) {
        container.innerHTML = `
            <div class="ai-response">
                <div class="ai-avatar" style="background: #10b981;">
                    <i class="fas fa-check-circle"></i>
                </div>
                <div class="response-content">
                    <div class="response-text">
                        <strong style="color: #10b981;">Tutorial Complete! 🎉</strong>
                        <p style="margin-top: 10px; color: #cbd5e1;">
                            Great job! You've learned the basics of ${tutorial?.title || 'this module'}.
                        </p>
                        <p style="margin-top: 10px; color: #94a3b8; font-size: 13px;">
                            💡 Need more help? Just ask me anything or type your question below!
                        </p>
                    </div>
                    <div class="response-actions" style="margin-top: 15px;">
                        <button class="ai-action-btn" onclick="showAllTutorials()">📚 More Tutorials</button>
                        <button class="ai-action-btn" onclick="askAIExample('What else can you help me with?')">💬 Ask a Question</button>
                    </div>
                </div>
            </div>
        `;
    }
    
    aiState.tasksCompleted++;
    saveAIState();
}

function showAllTutorials() {
    const container = document.getElementById('aiResponseContainer');
    if (!container) return;
    
    const tutorialCards = Object.entries(MODULE_TUTORIALS).map(([key, tutorial]) => {
        const completed = aiState.viewedTutorials.includes(key);
        return `
            <div onclick="startModuleTutorial('${key}')" 
                 style="background: ${tutorial.color}15; padding: 15px; border-radius: 10px; cursor: pointer; 
                        border-left: 4px solid ${tutorial.color}; transition: all 0.2s;"
                 onmouseover="this.style.transform='translateX(5px)'" 
                 onmouseout="this.style.transform='translateX(0)'">
                <div style="display: flex; align-items: center; gap: 12px;">
                    <i class="fas ${tutorial.icon}" style="color: ${tutorial.color}; font-size: 20px;"></i>
                    <div style="flex: 1;">
                        <strong style="color: white;">${tutorial.title}</strong>
                        <p style="color: #94a3b8; font-size: 12px; margin-top: 3px;">${tutorial.steps.length} steps</p>
                    </div>
                    ${completed ? '<i class="fas fa-check-circle" style="color: #10b981;"></i>' : '<i class="fas fa-play-circle" style="color: #64748b;"></i>'}
                </div>
            </div>
        `;
    }).join('');
    
    container.innerHTML = `
        <div class="ai-response">
            <div class="ai-avatar" style="background: linear-gradient(135deg, #3b82f6, #8b5cf6);">
                <i class="fas fa-graduation-cap"></i>
            </div>
            <div class="response-content">
                <h3 style="color: white; margin-bottom: 5px;">📚 Available Tutorials</h3>
                <p style="color: #94a3b8; font-size: 13px; margin-bottom: 20px;">Click any tutorial to start learning!</p>
                
                <div style="display: grid; gap: 10px; max-height: 400px; overflow-y: auto;">
                    ${tutorialCards}
                </div>
                
                <div style="margin-top: 20px; padding: 15px; background: rgba(245, 158, 11, 0.15); border-radius: 10px;">
                    <strong style="color: #fcd34d;"><i class="fas fa-lightbulb"></i> Tip:</strong>
                    <span style="color: #cbd5e1;"> Start with "Dashboard Overview" if you're new!</span>
                </div>
            </div>
        </div>
    `;
    
    container.scrollTop = 0;
}

// ==================== CONTEXTUAL HELP SYSTEM ====================
function updateContextualHelp(sectionName) {
    aiState.currentSection = sectionName;
    
    // Auto-show contextual help for first-time visitors
    if (!aiState.viewedTutorials.includes(sectionName) && !aiState.helpDismissed) {
        showContextualHelp(sectionName);
    }
}

function showContextualHelp(sectionName) {
    const tutorial = MODULE_TUTORIALS[sectionName];
    const quickHelp = QUICK_HELP[sectionName];
    
    if (!tutorial && !quickHelp) return;
    
    const container = document.getElementById('aiResponseContainer');
    if (!container) return;
    
    const quickQuestions = quickHelp ? quickHelp.map(q => 
        `<button class="ai-action-btn outline small" onclick="askAIExample('${q}')" style="font-size: 12px; padding: 8px 12px;">${q}</button>`
    ).join('') : '';
    
    container.innerHTML = `
        <div class="ai-response contextual-help" style="border: 2px solid ${tutorial?.color || '#3b82f6'}33;">
            <div class="ai-avatar" style="background: ${tutorial?.color || '#3b82f6'};">
                <i class="fas ${tutorial?.icon || 'fa-question-circle'}"></i>
            </div>
            <div class="response-content">
                <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                    <div>
                        <span style="color: ${tutorial?.color || '#3b82f6'}; font-size: 11px; text-transform: uppercase;">Need Help?</span>
                        <h3 style="color: white; margin-top: 5px;">${tutorial?.title || sectionName}</h3>
                    </div>
                    <button onclick="dismissContextualHelp()" style="background: none; border: none; color: #64748b; cursor: pointer; padding: 5px;">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                
                <p style="color: #94a3b8; margin-top: 10px; font-size: 14px;">
                    ${tutorial?.steps[0]?.content?.substring(0, 150) || 'Welcome to this section!'}...
                </p>
                
                ${quickHelp ? `
                    <div style="margin-top: 15px;">
                        <p style="color: #64748b; font-size: 11px; margin-bottom: 10px;">QUICK QUESTIONS:</p>
                        <div style="display: flex; flex-wrap: wrap; gap: 8px;">
                            ${quickQuestions}
                        </div>
                    </div>
                ` : ''}
                
                <div class="response-actions" style="margin-top: 15px; display: flex; gap: 10px;">
                    ${tutorial ? `<button class="ai-action-btn primary" onclick="startModuleTutorial('${sectionName}')"><i class="fas fa-play"></i> Start Tutorial</button>` : ''}
                    <button class="ai-action-btn outline" onclick="dismissContextualHelp()">Got it!</button>
                </div>
            </div>
        </div>
    `;
}

function dismissContextualHelp() {
    const container = document.getElementById('aiResponseContainer');
    if (container) {
        container.innerHTML = `
            <div class="ai-response">
                <div class="ai-avatar"><img src="images/ai-logo.png" alt="AI" class="ai-logo-img"></div>
                <div class="response-content">
                    <div class="response-text">
                        <p style="color: #cbd5e1;">👋 I'm here if you need help! Just type a question below or click one of the quick actions.</p>
                    </div>
                    <div class="response-actions" style="margin-top: 10px;">
                        <button class="ai-action-btn" onclick="showAllTutorials()">📚 Tutorials</button>
                        <button class="ai-action-btn" onclick="askAIExample('How do I get started?')">🚀 Get Started</button>
                    </div>
                </div>
            </div>
        `;
    }
}

// ==================== QUICK GUIDES ====================
function showQuickGuide(topic) {
    const guides = {
        'add-income': {
            title: 'Quick Guide: Add Income',
            steps: [
                '1. Click "Income" in the sidebar (or Record Income)',
                '2. Click the "Add Income" button',
                '3. Enter the amount you received',
                '4. Add a description (e.g., "Sale to Customer ABC")',
                '5. Select the date and payment method',
                '6. Click "Save" or "Add Income"',
                '✅ Done! Your income is recorded.'
            ]
        },
        'add-expense': {
            title: 'Quick Guide: Add Expense',
            steps: [
                '1. Click "Expenses" in the sidebar',
                '2. Click the "Add Expense" button',
                '3. Enter the amount spent',
                '4. Select a category (Rent, Utilities, etc.)',
                '5. Add description and receipt number',
                '6. Pick the date and click "Save"',
                '💡 Tip: Proper categories = better tax deductions!'
            ]
        },
        'make-sale': {
            title: 'Quick Guide: Make a Sale (POS)',
            steps: [
                '1. Go to POS (Point of Sale)',
                '2. Search or click products to add to cart',
                '3. Adjust quantity if needed',
                '4. Apply discount (if any)',
                '5. Select payment method (Cash/Card/E-Wallet)',
                '6. Click "Complete Sale"',
                '🧾 Receipt will be generated automatically!'
            ]
        },
        'add-product': {
            title: 'Quick Guide: Add Product',
            steps: [
                '1. Go to Inventory section',
                '2. Click "Add Product"',
                '3. Enter product name and SKU',
                '4. Set cost price and selling price',
                '5. Enter current stock quantity',
                '6. Set low stock alert level',
                '7. Click "Save Product"',
                '📦 Product will appear in POS!'
            ]
        },
        'add-customer': {
            title: 'Quick Guide: Add Customer',
            steps: [
                '1. Go to CRM / Customers section',
                '2. Click "Add Customer"',
                '3. Enter name, email, phone',
                '4. Add address (optional)',
                '5. Add any notes about the customer',
                '6. Click "Save Customer"',
                '👥 Now you can track their orders!'
            ]
        },
        'create-quotation': {
            title: 'Quick Guide: Create Quotation',
            steps: [
                '1. Go to Quotations section',
                '2. Click "New Quotation"',
                '3. Select customer (or add new)',
                '4. Add items with quantities and prices',
                '5. Set validity period (e.g., 14 days)',
                '6. Add terms & conditions',
                '7. Click "Save" then "Send to Customer"',
                '✉️ Email the PDF to your customer!'
            ]
        },
        'export-report': {
            title: 'Quick Guide: Export Report',
            steps: [
                '1. Go to Reports section',
                '2. Select report type (P&L, Balance Sheet, etc.)',
                '3. Choose date range',
                '4. Click "Generate Report"',
                '5. Review the report',
                '6. Click "Export to PDF" or "Export to Excel"',
                '📄 Save and send to your accountant!'
            ]
        }
    };
    
    const guide = guides[topic];
    if (!guide) return;
    
    const container = document.getElementById('aiResponseContainer');
    if (!container) return;
    
    const stepsHtml = guide.steps.map(step => `<li style="margin-bottom: 8px;">${step}</li>`).join('');
    
    container.innerHTML = `
        <div class="ai-response">
            <div class="ai-avatar" style="background: #3b82f6;">
                <i class="fas fa-list-ol"></i>
            </div>
            <div class="response-content">
                <h3 style="color: white; margin-bottom: 15px;">${guide.title}</h3>
                <ol style="color: #cbd5e1; padding-left: 20px; line-height: 1.8;">
                    ${stepsHtml}
                </ol>
                <div class="response-actions" style="margin-top: 15px;">
                    <button class="ai-action-btn" onclick="askAIExample('What else can you help me with?')">More Help</button>
                    <button class="ai-action-btn outline" onclick="dismissContextualHelp()">Got it!</button>
                </div>
            </div>
        </div>
    `;
}

// ==================== ALPHA 6: SMART RECOMMENDATIONS ENGINE ====================

/**
 * Smart Recommendations - AI suggests specific actions based on business data
 */
const SmartRecommendations = {
    recommendations: [],
    
    // Generate all recommendations
    generateAll: function() {
        this.recommendations = [];
        
        this.checkInventoryActions();
        this.checkCustomerFollowups();
        this.checkFinancialActions();
        this.checkSalesOpportunities();
        this.checkOperationalEfficiency();
        
        // Sort by priority
        this.recommendations.sort(function(a, b) {
            var priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
            return priorityOrder[a.priority] - priorityOrder[b.priority];
        });
        
        return this.recommendations;
    },
    
    // Inventory-based recommendations
    checkInventoryActions: function() {
        var products = JSON.parse(localStorage.getItem('ezcubic_products') || '[]');
        var sales = JSON.parse(localStorage.getItem('ezcubic_sales') || '[]');
        
        // Calculate sales velocity for each product
        var thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        var productSales = {};
        sales.forEach(function(sale) {
            if (new Date(sale.date) >= thirtyDaysAgo && sale.items) {
                sale.items.forEach(function(item) {
                    productSales[item.productId] = (productSales[item.productId] || 0) + (item.quantity || 1);
                });
            }
        });
        
        products.forEach(function(product) {
            var stock = product.quantity || 0;
            var reorderLevel = product.reorderLevel || 10;
            var monthlySales = productSales[product.id] || 0;
            var daysOfStock = monthlySales > 0 ? Math.round((stock / monthlySales) * 30) : 999;
            
            // Recommend reorder
            if (stock <= reorderLevel && stock > 0) {
                var suggestedQty = Math.max(reorderLevel * 2, monthlySales * 2);
                SmartRecommendations.recommendations.push({
                    type: 'REORDER',
                    icon: 'fa-shopping-cart',
                    color: '#f59e0b',
                    priority: 'high',
                    title: 'Reorder ' + product.name,
                    message: 'Only ' + stock + ' left (reorder point: ' + reorderLevel + '). Suggest ordering ' + Math.round(suggestedQty) + ' units.',
                    action: 'showSection(\'inventory\')',
                    actionText: 'Go to Inventory'
                });
            }
            
            // Recommend clearance for slow-moving stock
            if (stock > 50 && monthlySales < 3 && daysOfStock > 180) {
                SmartRecommendations.recommendations.push({
                    type: 'CLEARANCE',
                    icon: 'fa-percentage',
                    color: '#8b5cf6',
                    priority: 'medium',
                    title: 'Consider Discount on ' + product.name,
                    message: stock + ' units in stock but only ' + monthlySales + ' sold last month. Consider a promotion.',
                    action: 'showSection(\'inventory\')',
                    actionText: 'View Product'
                });
            }
        });
    },
    
    // Customer follow-up recommendations
    checkCustomerFollowups: function() {
        var customers = JSON.parse(localStorage.getItem('ezcubic_customers') || '[]');
        var sales = JSON.parse(localStorage.getItem('ezcubic_sales') || '[]');
        var invoices = JSON.parse(localStorage.getItem('ezcubic_invoices') || '[]');
        
        var sixtyDaysAgo = new Date();
        sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
        
        // Find customers with overdue invoices
        invoices.forEach(function(inv) {
            if (inv.status === 'overdue' || (inv.status !== 'paid' && new Date(inv.dueDate) < new Date())) {
                var customer = customers.find(function(c) { return c.id === inv.customerId; });
                var customerName = customer ? customer.name : 'Customer';
                var daysOverdue = Math.floor((new Date() - new Date(inv.dueDate)) / (1000 * 60 * 60 * 24));
                
                SmartRecommendations.recommendations.push({
                    type: 'FOLLOW_UP',
                    icon: 'fa-phone',
                    color: '#ef4444',
                    priority: daysOverdue > 30 ? 'critical' : 'high',
                    title: 'Follow up with ' + customerName,
                    message: 'Invoice ' + inv.invoiceNo + ' is ' + daysOverdue + ' days overdue (RM ' + (inv.total || 0).toFixed(2) + ')',
                    action: 'showSection(\'crm\')',
                    actionText: 'Open CRM'
                });
            }
        });
        
        // Find inactive valuable customers
        customers.forEach(function(customer) {
            var customerSales = sales.filter(function(s) { return s.customerId === customer.id; });
            var totalSpent = customerSales.reduce(function(sum, s) { return sum + (s.total || 0); }, 0);
            var lastSale = customerSales.sort(function(a, b) { return new Date(b.date) - new Date(a.date); })[0];
            
            if (totalSpent > 5000 && lastSale && new Date(lastSale.date) < sixtyDaysAgo) {
                SmartRecommendations.recommendations.push({
                    type: 'REACTIVATE',
                    icon: 'fa-user-clock',
                    color: '#3b82f6',
                    priority: 'medium',
                    title: 'Re-engage ' + customer.name,
                    message: 'Valuable customer (RM ' + totalSpent.toFixed(0) + ' total) hasn\'t purchased in 60+ days.',
                    action: 'showSection(\'crm\')',
                    actionText: 'View Customer'
                });
            }
        });
    },
    
    // Financial action recommendations
    checkFinancialActions: function() {
        var transactions = JSON.parse(localStorage.getItem('ezcubic_transactions') || '[]');
        var bills = JSON.parse(localStorage.getItem('ezcubic_bills') || '[]');
        
        // Check for upcoming bills
        var nextWeek = new Date();
        nextWeek.setDate(nextWeek.getDate() + 7);
        
        var upcomingBills = bills.filter(function(bill) {
            return bill.status !== 'paid' && new Date(bill.dueDate) <= nextWeek && new Date(bill.dueDate) >= new Date();
        });
        
        if (upcomingBills.length > 0) {
            var totalDue = upcomingBills.reduce(function(sum, b) { return sum + (b.amount || 0); }, 0);
            SmartRecommendations.recommendations.push({
                type: 'PAY_BILLS',
                icon: 'fa-file-invoice-dollar',
                color: '#f59e0b',
                priority: 'high',
                title: 'Pay ' + upcomingBills.length + ' Bills This Week',
                message: 'Total RM ' + totalDue.toFixed(2) + ' due within 7 days.',
                action: 'showSection(\'bills\')',
                actionText: 'View Bills'
            });
        }
        
        // Check for uncategorized transactions
        var uncategorized = transactions.filter(function(t) { 
            return !t.category || t.category === '' || t.category === 'Uncategorized'; 
        });
        
        if (uncategorized.length >= 5) {
            SmartRecommendations.recommendations.push({
                type: 'CATEGORIZE',
                icon: 'fa-tags',
                color: '#8b5cf6',
                priority: 'low',
                title: 'Categorize ' + uncategorized.length + ' Transactions',
                message: 'Keep your books clean for easier tax filing.',
                action: 'showSection(\'transactions\')',
                actionText: 'Categorize Now'
            });
        }
    },
    
    // Sales opportunity recommendations
    checkSalesOpportunities: function() {
        var sales = JSON.parse(localStorage.getItem('ezcubic_sales') || '[]');
        var quotations = JSON.parse(localStorage.getItem('ezcubic_quotations') || '[]');
        
        // Check for pending quotations
        var pendingQuotes = quotations.filter(function(q) { 
            return q.status === 'pending' || q.status === 'sent'; 
        });
        
        var oldQuotes = pendingQuotes.filter(function(q) {
            var daysSent = Math.floor((new Date() - new Date(q.date)) / (1000 * 60 * 60 * 24));
            return daysSent > 7;
        });
        
        if (oldQuotes.length > 0) {
            var totalValue = oldQuotes.reduce(function(sum, q) { return sum + (q.total || 0); }, 0);
            SmartRecommendations.recommendations.push({
                type: 'FOLLOW_QUOTE',
                icon: 'fa-file-alt',
                color: '#10b981',
                priority: 'medium',
                title: 'Follow Up on ' + oldQuotes.length + ' Quotations',
                message: 'RM ' + totalValue.toFixed(2) + ' in quotes pending over 7 days.',
                action: 'showSection(\'quotations\')',
                actionText: 'View Quotations'
            });
        }
    },
    
    // Operational efficiency recommendations
    checkOperationalEfficiency: function() {
        var sales = JSON.parse(localStorage.getItem('ezcubic_sales') || '[]');
        
        // Analyze best selling days
        var dayStats = {};
        sales.forEach(function(sale) {
            var day = new Date(sale.date).toLocaleDateString('en-US', { weekday: 'long' });
            dayStats[day] = (dayStats[day] || 0) + (sale.total || 0);
        });
        
        var dayKeys = Object.keys(dayStats);
        if (dayKeys.length === 0) return; // No data to analyze
        
        var bestDay = dayKeys.reduce(function(a, b) { 
            return dayStats[a] > dayStats[b] ? a : b; 
        });
        
        var worstDay = dayKeys.reduce(function(a, b) { 
            return dayStats[a] < dayStats[b] ? a : b; 
        });
        
        if (Object.keys(dayStats).length >= 5 && dayStats[bestDay] > dayStats[worstDay] * 3) {
            SmartRecommendations.recommendations.push({
                type: 'OPTIMIZE',
                icon: 'fa-lightbulb',
                color: '#f59e0b',
                priority: 'low',
                title: 'Optimize ' + worstDay + ' Sales',
                message: bestDay + ' sales are 3x higher. Consider promotions on ' + worstDay + '.',
                action: null,
                actionText: null
            });
        }
    },
    
    // Get recommendations HTML
    getHTML: function() {
        if (this.recommendations.length === 0) {
            this.generateAll();
        }
        
        if (this.recommendations.length === 0) {
            return '<div style="text-align:center;padding:20px;color:#94a3b8;"><i class="fas fa-check-circle" style="font-size:24px;margin-bottom:10px;display:block;color:#10b981;"></i>No recommendations right now. You\'re doing great!</div>';
        }
        
        var html = '<div style="margin-bottom:10px;color:#94a3b8;font-size:13px;">' + this.recommendations.length + ' suggestions based on your data:</div>';
        
        for (var i = 0; i < Math.min(this.recommendations.length, 5); i++) {
            var rec = this.recommendations[i];
            html += '<div style="background:rgba(30,41,59,0.8);border-left:4px solid ' + rec.color + ';padding:12px;margin-bottom:8px;border-radius:8px;">';
            html += '<div style="display:flex;align-items:flex-start;gap:10px;">';
            html += '<i class="fas ' + rec.icon + '" style="color:' + rec.color + ';margin-top:2px;"></i>';
            html += '<div style="flex:1;">';
            html += '<div style="font-weight:600;color:white;margin-bottom:3px;">' + rec.title + '</div>';
            html += '<div style="color:#94a3b8;font-size:12px;">' + rec.message + '</div>';
            if (rec.action) {
                html += '<button onclick="' + rec.action + '" style="margin-top:8px;background:' + rec.color + ';color:white;border:none;padding:5px 12px;border-radius:4px;cursor:pointer;font-size:12px;">' + rec.actionText + '</button>';
            }
            html += '</div></div></div>';
        }
        
        return html;
    }
};

// ==================== ALPHA 6: PREDICTIVE FORECASTING ENGINE ====================

/**
 * Predictive Forecasting - Predict future revenue and expenses
 */
const PredictiveForecasting = {
    
    // Calculate monthly totals from transactions
    getMonthlyData: function() {
        var transactions = JSON.parse(localStorage.getItem('ezcubic_transactions') || '[]');
        var sales = JSON.parse(localStorage.getItem('ezcubic_sales') || '[]');
        
        var monthlyData = {};
        
        // Process transactions (expenses)
        transactions.forEach(function(t) {
            var date = new Date(t.date);
            var monthKey = date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0');
            
            if (!monthlyData[monthKey]) {
                monthlyData[monthKey] = { income: 0, expenses: 0, sales: 0 };
            }
            
            if (t.type === 'income') {
                monthlyData[monthKey].income += t.amount || 0;
            } else {
                monthlyData[monthKey].expenses += t.amount || 0;
            }
        });
        
        // Process sales
        sales.forEach(function(s) {
            var date = new Date(s.date);
            var monthKey = date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0');
            
            if (!monthlyData[monthKey]) {
                monthlyData[monthKey] = { income: 0, expenses: 0, sales: 0 };
            }
            
            monthlyData[monthKey].sales += s.total || 0;
        });
        
        return monthlyData;
    },
    
    // Simple linear regression for prediction
    linearRegression: function(data) {
        var n = data.length;
        if (n < 2) return { slope: 0, intercept: data[0] || 0 };
        
        var sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
        
        for (var i = 0; i < n; i++) {
            sumX += i;
            sumY += data[i];
            sumXY += i * data[i];
            sumX2 += i * i;
        }
        
        var denominator = (n * sumX2 - sumX * sumX);
        if (denominator === 0) return { slope: 0, intercept: sumY / n }; // Prevent division by zero
        
        var slope = (n * sumXY - sumX * sumY) / denominator;
        var intercept = (sumY - slope * sumX) / n;
        
        // Handle NaN/Infinity
        if (!isFinite(slope)) slope = 0;
        if (!isFinite(intercept)) intercept = sumY / n || 0;
        
        return { slope: slope, intercept: intercept };
    },
    
    // Generate forecast
    generateForecast: function() {
        var monthlyData = this.getMonthlyData();
        var months = Object.keys(monthlyData).sort();
        
        if (months.length < 2) {
            return {
                hasData: false,
                message: 'Need at least 2 months of data for forecasting'
            };
        }
        
        // Get last 6 months or all available
        var recentMonths = months.slice(-6);
        
        var salesData = recentMonths.map(function(m) { return monthlyData[m].sales + monthlyData[m].income; });
        var expenseData = recentMonths.map(function(m) { return monthlyData[m].expenses; });
        
        // Calculate trends
        var salesTrend = this.linearRegression(salesData);
        var expenseTrend = this.linearRegression(expenseData);
        
        // Predict next month
        var nextIndex = salesData.length;
        var predictedSales = Math.max(0, salesTrend.slope * nextIndex + salesTrend.intercept);
        var predictedExpenses = Math.max(0, expenseTrend.slope * nextIndex + expenseTrend.intercept);
        var predictedProfit = predictedSales - predictedExpenses;
        
        // Calculate averages
        var avgSales = salesData.reduce(function(a, b) { return a + b; }, 0) / salesData.length;
        var avgExpenses = expenseData.reduce(function(a, b) { return a + b; }, 0) / expenseData.length;
        
        // Determine trend direction
        var salesTrendDir = salesTrend.slope > avgSales * 0.05 ? 'up' : 
                          salesTrend.slope < -avgSales * 0.05 ? 'down' : 'stable';
        var expenseTrendDir = expenseTrend.slope > avgExpenses * 0.05 ? 'up' : 
                            expenseTrend.slope < -avgExpenses * 0.05 ? 'down' : 'stable';
        
        // Calculate confidence (based on data consistency)
        var salesVariance = 0;
        for (var i = 0; i < salesData.length; i++) {
            salesVariance += Math.pow(salesData[i] - avgSales, 2);
        }
        var salesStdDev = Math.sqrt(salesVariance / salesData.length);
        var confidence = Math.max(30, Math.min(90, 90 - (salesStdDev / avgSales) * 100));
        
        // Next month name
        var lastMonth = new Date(months[months.length - 1] + '-01');
        lastMonth.setMonth(lastMonth.getMonth() + 1);
        var nextMonthName = lastMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
        
        return {
            hasData: true,
            nextMonth: nextMonthName,
            predictedRevenue: predictedSales,
            predictedExpenses: predictedExpenses,
            predictedProfit: predictedProfit,
            revenueTrend: salesTrendDir,
            expenseTrend: expenseTrendDir,
            confidence: Math.round(confidence),
            monthsAnalyzed: recentMonths.length,
            avgRevenue: avgSales,
            avgExpenses: avgExpenses,
            revenueGrowth: avgSales > 0 ? ((salesTrend.slope / avgSales) * 100).toFixed(1) : 0
        };
    },
    
    // Get forecast HTML
    getHTML: function() {
        var forecast = this.generateForecast();
        
        if (!forecast.hasData) {
            return '<div style="text-align:center;padding:20px;color:#94a3b8;"><i class="fas fa-chart-line" style="font-size:24px;margin-bottom:10px;display:block;"></i>' + forecast.message + '</div>';
        }
        
        var trendIcon = function(dir) {
            if (dir === 'up') return '<i class="fas fa-arrow-up" style="color:#10b981;"></i>';
            if (dir === 'down') return '<i class="fas fa-arrow-down" style="color:#ef4444;"></i>';
            return '<i class="fas fa-minus" style="color:#94a3b8;"></i>';
        };
        
        var profitColor = forecast.predictedProfit >= 0 ? '#10b981' : '#ef4444';
        
        var html = '<div style="background:linear-gradient(135deg,rgba(59,130,246,0.2),rgba(139,92,246,0.2));border-radius:12px;padding:15px;margin-bottom:15px;">';
        html += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">';
        html += '<span style="font-weight:600;color:white;"><i class="fas fa-crystal-ball" style="margin-right:8px;"></i>Forecast: ' + forecast.nextMonth + '</span>';
        html += '<span style="background:rgba(255,255,255,0.2);padding:3px 8px;border-radius:12px;font-size:11px;color:#e2e8f0;">' + forecast.confidence + '% confidence</span>';
        html += '</div>';
        
        html += '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;">';
        
        // Revenue
        html += '<div style="background:rgba(0,0,0,0.2);padding:10px;border-radius:8px;text-align:center;">';
        html += '<div style="color:#94a3b8;font-size:11px;margin-bottom:4px;">Revenue ' + trendIcon(forecast.revenueTrend) + '</div>';
        html += '<div style="color:#10b981;font-weight:600;">RM ' + forecast.predictedRevenue.toFixed(0) + '</div>';
        html += '</div>';
        
        // Expenses
        html += '<div style="background:rgba(0,0,0,0.2);padding:10px;border-radius:8px;text-align:center;">';
        html += '<div style="color:#94a3b8;font-size:11px;margin-bottom:4px;">Expenses ' + trendIcon(forecast.expenseTrend) + '</div>';
        html += '<div style="color:#f59e0b;font-weight:600;">RM ' + forecast.predictedExpenses.toFixed(0) + '</div>';
        html += '</div>';
        
        // Profit
        html += '<div style="background:rgba(0,0,0,0.2);padding:10px;border-radius:8px;text-align:center;">';
        html += '<div style="color:#94a3b8;font-size:11px;margin-bottom:4px;">Est. Profit</div>';
        html += '<div style="color:' + profitColor + ';font-weight:600;">RM ' + forecast.predictedProfit.toFixed(0) + '</div>';
        html += '</div>';
        
        html += '</div>';
        
        // Growth indicator
        if (forecast.revenueGrowth != 0) {
            var growthColor = forecast.revenueGrowth > 0 ? '#10b981' : '#ef4444';
            var growthIcon = forecast.revenueGrowth > 0 ? 'fa-trending-up' : 'fa-trending-down';
            html += '<div style="margin-top:10px;padding:8px;background:rgba(0,0,0,0.2);border-radius:6px;text-align:center;">';
            html += '<span style="color:' + growthColor + ';font-size:12px;"><i class="fas ' + growthIcon + '" style="margin-right:5px;"></i>';
            html += (forecast.revenueGrowth > 0 ? '+' : '') + forecast.revenueGrowth + '% monthly growth trend</span>';
            html += '</div>';
        }
        
        html += '</div>';
        
        html += '<div style="color:#64748b;font-size:11px;text-align:center;">Based on ' + forecast.monthsAnalyzed + ' months of data</div>';
        
        return html;
    }
};

// Expose globally
window.SmartRecommendations = SmartRecommendations;
window.PredictiveForecasting = PredictiveForecasting;

// ==================== ALPHA 6: PROACTIVE ALERTS & ANOMALY DETECTION ====================

/**
 * Proactive AI Alert System
 * Automatically detects issues and opportunities, notifies user
 */
const ProactiveAlerts = {
    // Alert types and their configs
    alertTypes: {
        LOW_STOCK: { icon: 'fa-box', color: '#f59e0b', priority: 'high' },
        SALES_DROP: { icon: 'fa-chart-line-down', color: '#ef4444', priority: 'high' },
        SALES_SPIKE: { icon: 'fa-chart-line', color: '#10b981', priority: 'medium' },
        OVERDUE_INVOICE: { icon: 'fa-file-invoice-dollar', color: '#ef4444', priority: 'high' },
        UNUSUAL_EXPENSE: { icon: 'fa-exclamation-triangle', color: '#f59e0b', priority: 'high' },
        CASH_FLOW_WARNING: { icon: 'fa-money-bill-wave', color: '#ef4444', priority: 'critical' },
        REORDER_REMINDER: { icon: 'fa-shopping-cart', color: '#3b82f6', priority: 'medium' },
        TOP_CUSTOMER: { icon: 'fa-star', color: '#10b981', priority: 'low' },
        PROFIT_MILESTONE: { icon: 'fa-trophy', color: '#10b981', priority: 'low' }
    },
    
    // Store for detected alerts
    activeAlerts: [],
    dismissedAlerts: JSON.parse(localStorage.getItem('ezcubic_dismissed_alerts') || '[]'),
    lastCheck: null,
    
    // Run all checks
    runAllChecks: function() {
        console.log('[AI PROACTIVE] Running all alert checks...');
        this.activeAlerts = [];
        
        this.checkLowStock();
        this.checkSalesTrend();
        this.checkOverdueInvoices();
        this.checkUnusualExpenses();
        this.checkCashFlow();
        this.checkProfitMilestones();
        this.checkTopCustomers();
        
        this.lastCheck = new Date().toISOString();
        this.showAlertNotifications();
        
        console.log('[AI PROACTIVE] Found', this.activeAlerts.length, 'alerts');
        return this.activeAlerts;
    },
    
    // Check for low stock items
    checkLowStock: function() {
        try {
            var products = JSON.parse(localStorage.getItem('ezcubic_products') || '[]');
        } catch(e) {
            var products = [];
        }
        var lowStockItems = [];
        
        for (var i = 0; i < products.length; i++) {
            var p = products[i];
            var stock = p.stock || p.quantity || 0;
            var minStock = p.minStock || p.reorderLevel || 10;
            if (stock <= minStock && stock > 0) {
                lowStockItems.push(p.name + ' (' + stock + ' left)');
            } else if (stock === 0) {
                lowStockItems.push(p.name + ' (OUT OF STOCK!)');
            }
        }
        
        if (lowStockItems.length > 0) {
            this.addAlert('LOW_STOCK', 
                'Low Stock Alert: ' + lowStockItems.length + ' items need attention',
                lowStockItems.slice(0, 5).join(', ') + (lowStockItems.length > 5 ? '...' : ''),
                { items: lowStockItems }
            );
        }
    },
    
    // Check sales trend (compare this week vs last week)
    checkSalesTrend: function() {
        try {
            var sales = JSON.parse(localStorage.getItem('ezcubic_sales') || '[]');
        } catch(e) {
            var sales = [];
        }
        var now = new Date();
        var thisWeekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        var lastWeekStart = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
        
        var thisWeekSales = 0;
        var lastWeekSales = 0;
        
        for (var i = 0; i < sales.length; i++) {
            var saleDate = new Date(sales[i].date);
            var amount = sales[i].total || 0;
            
            if (saleDate >= thisWeekStart) {
                thisWeekSales += amount;
            } else if (saleDate >= lastWeekStart && saleDate < thisWeekStart) {
                lastWeekSales += amount;
            }
        }
        
        if (lastWeekSales > 0) {
            var change = ((thisWeekSales - lastWeekSales) / lastWeekSales) * 100;
            
            if (change <= -20) {
                this.addAlert('SALES_DROP',
                    'Sales Down ' + Math.abs(change).toFixed(0) + '% This Week',
                    'This week: RM' + thisWeekSales.toFixed(0) + ' vs Last week: RM' + lastWeekSales.toFixed(0) + '. Consider running a promotion!',
                    { thisWeek: thisWeekSales, lastWeek: lastWeekSales, change: change }
                );
            } else if (change >= 30) {
                this.addAlert('SALES_SPIKE',
                    'Great News! Sales Up ' + change.toFixed(0) + '%',
                    'This week: RM' + thisWeekSales.toFixed(0) + ' vs Last week: RM' + lastWeekSales.toFixed(0) + '. Keep it up!',
                    { thisWeek: thisWeekSales, lastWeek: lastWeekSales, change: change }
                );
            }
        }
    },
    
    // Check overdue invoices
    checkOverdueInvoices: function() {
        try {
            var invoices = JSON.parse(localStorage.getItem('ezcubic_invoices') || '[]');
            var sales = JSON.parse(localStorage.getItem('ezcubic_sales') || '[]');
        } catch(e) {
            var invoices = [];
            var sales = [];
        }
        var overdue = [];
        var now = new Date();
        
        // Check invoices
        for (var i = 0; i < invoices.length; i++) {
            var inv = invoices[i];
            if (inv.status === 'unpaid' || inv.status === 'pending') {
                var dueDate = new Date(inv.dueDate || inv.date);
                if (dueDate < now) {
                    overdue.push((inv.invoiceNo || inv.id) + ' - RM' + (inv.total || 0).toFixed(0));
                }
            }
        }
        
        // Check credit sales
        for (var j = 0; j < sales.length; j++) {
            var sale = sales[j];
            if (sale.isCredit && sale.status !== 'paid') {
                var saleDueDate = new Date(sale.dueDate || sale.date);
                if (saleDueDate < now) {
                    overdue.push((sale.receiptNo || sale.id) + ' - RM' + (sale.total || 0).toFixed(0));
                }
            }
        }
        
        if (overdue.length > 0) {
            this.addAlert('OVERDUE_INVOICE',
                overdue.length + ' Overdue Payment' + (overdue.length > 1 ? 's' : ''),
                'Follow up on: ' + overdue.slice(0, 3).join(', ') + (overdue.length > 3 ? '...' : ''),
                { invoices: overdue }
            );
        }
    },
    
    // Anomaly Detection: Check for unusual expenses
    checkUnusualExpenses: function() {
        try {
            var transactions = JSON.parse(localStorage.getItem('ezcubic_transactions') || '[]');
        } catch(e) {
            var transactions = [];
        }
        var now = new Date();
        var thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        
        // Calculate average expense by category
        var categoryTotals = {};
        var categoryCounts = {};
        var recentExpenses = [];
        
        for (var i = 0; i < transactions.length; i++) {
            var t = transactions[i];
            if (t.type === 'expense') {
                var cat = t.category || 'Other';
                var amt = Math.abs(t.amount || 0);
                var tDate = new Date(t.date);
                
                if (!categoryTotals[cat]) {
                    categoryTotals[cat] = 0;
                    categoryCounts[cat] = 0;
                }
                categoryTotals[cat] += amt;
                categoryCounts[cat]++;
                
                if (tDate >= thirtyDaysAgo) {
                    recentExpenses.push({ category: cat, amount: amt, description: t.description, date: t.date });
                }
            }
        }
        
        // Find unusual (>2x average) recent expenses
        var unusual = [];
        for (var j = 0; j < recentExpenses.length; j++) {
            var exp = recentExpenses[j];
            var avgForCategory = categoryTotals[exp.category] / Math.max(categoryCounts[exp.category], 1);
            
            if (exp.amount > avgForCategory * 2 && exp.amount > 500) {
                unusual.push('RM' + exp.amount.toFixed(0) + ' ' + exp.category + ' (' + (exp.description || 'No description').substring(0, 30) + ')');
            }
        }
        
        if (unusual.length > 0) {
            this.addAlert('UNUSUAL_EXPENSE',
                'Unusual Expense Detected',
                unusual[0] + ' is higher than your average. Please verify this is correct.',
                { expenses: unusual }
            );
        }
    },
    
    // Check cash flow projection
    checkCashFlow: function() {
        try {
            var transactions = JSON.parse(localStorage.getItem('ezcubic_transactions') || '[]');
        } catch(e) {
            var transactions = [];
        }
        var now = new Date();
        var thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        
        var income30d = 0;
        var expense30d = 0;
        
        for (var i = 0; i < transactions.length; i++) {
            var t = transactions[i];
            var tDate = new Date(t.date);
            
            if (tDate >= thirtyDaysAgo) {
                if (t.type === 'income') {
                    income30d += Math.abs(t.amount || 0);
                } else if (t.type === 'expense') {
                    expense30d += Math.abs(t.amount || 0);
                }
            }
        }
        
        var netCashFlow = income30d - expense30d;
        
        if (netCashFlow < 0 && Math.abs(netCashFlow) > 1000) {
            this.addAlert('CASH_FLOW_WARNING',
                'Cash Flow Warning',
                'You spent RM' + Math.abs(netCashFlow).toFixed(0) + ' more than you earned this month. Review expenses or boost sales.',
                { income: income30d, expense: expense30d, net: netCashFlow }
            );
        }
    },
    
    // Check profit milestones
    checkProfitMilestones: function() {
        try {
            var transactions = JSON.parse(localStorage.getItem('ezcubic_transactions') || '[]');
        } catch(e) {
            var transactions = [];
        }
        var totalIncome = 0;
        var totalExpense = 0;
        
        for (var i = 0; i < transactions.length; i++) {
            var t = transactions[i];
            if (t.type === 'income') {
                totalIncome += Math.abs(t.amount || 0);
            } else if (t.type === 'expense') {
                totalExpense += Math.abs(t.amount || 0);
            }
        }
        
        var totalProfit = totalIncome - totalExpense;
        var milestones = [10000, 50000, 100000, 500000, 1000000];
        
        for (var j = 0; j < milestones.length; j++) {
            var milestone = milestones[j];
            var prevMilestone = milestones[j - 1] || 0;
            
            if (totalProfit >= milestone && totalProfit < milestone * 1.1) {
                this.addAlert('PROFIT_MILESTONE',
                    'Congratulations! Profit Milestone Reached',
                    'Your total profit has reached RM' + milestone.toLocaleString() + '! Keep up the great work!',
                    { profit: totalProfit, milestone: milestone }
                );
                break;
            }
        }
    },
    
    // Check top customers
    checkTopCustomers: function() {
        try {
            var sales = JSON.parse(localStorage.getItem('ezcubic_sales') || '[]');
        } catch(e) {
            var sales = [];
        }
        var customerSpend = {};
        var now = new Date();
        var thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        
        for (var i = 0; i < sales.length; i++) {
            var sale = sales[i];
            var saleDate = new Date(sale.date);
            
            if (saleDate >= thirtyDaysAgo && sale.customerName && sale.customerName !== 'Walk-in') {
                if (!customerSpend[sale.customerName]) {
                    customerSpend[sale.customerName] = 0;
                }
                customerSpend[sale.customerName] += sale.total || 0;
            }
        }
        
        // Find top customer
        var topCustomer = null;
        var topAmount = 0;
        for (var name in customerSpend) {
            if (customerSpend[name] > topAmount) {
                topAmount = customerSpend[name];
                topCustomer = name;
            }
        }
        
        if (topCustomer && topAmount > 1000) {
            this.addAlert('TOP_CUSTOMER',
                'Top Customer This Month',
                topCustomer + ' spent RM' + topAmount.toFixed(0) + ' this month. Consider sending a thank you!',
                { customer: topCustomer, amount: topAmount }
            );
        }
    },
    
    // Add alert to active list
    addAlert: function(type, title, message, data) {
        var alertId = type + '_' + Date.now();
        
        // Check if dismissed
        if (this.dismissedAlerts.indexOf(type) >= 0) {
            return;
        }
        
        this.activeAlerts.push({
            id: alertId,
            type: type,
            title: title,
            message: message,
            data: data,
            config: this.alertTypes[type],
            timestamp: new Date().toISOString()
        });
    },
    
    // Show notification badge
    showAlertNotifications: function() {
        var highPriorityCount = 0;
        for (var i = 0; i < this.activeAlerts.length; i++) {
            var alert = this.activeAlerts[i];
            if (alert.config.priority === 'high' || alert.config.priority === 'critical') {
                highPriorityCount++;
            }
        }
        
        // Update AI button badge if exists
        var aiBtn = document.querySelector('.ai-float-btn, #aiAssistantBtn');
        if (aiBtn && highPriorityCount > 0) {
            var badge = aiBtn.querySelector('.alert-badge');
            if (!badge) {
                badge = document.createElement('span');
                badge.className = 'alert-badge';
                badge.style.cssText = 'position:absolute;top:-5px;right:-5px;background:#ef4444;color:white;border-radius:50%;width:20px;height:20px;font-size:12px;display:flex;align-items:center;justify-content:center;';
                aiBtn.style.position = 'relative';
                aiBtn.appendChild(badge);
            }
            badge.textContent = highPriorityCount;
        }
    },
    
    // Dismiss an alert type
    dismissAlert: function(type) {
        this.dismissedAlerts.push(type);
        localStorage.setItem('ezcubic_dismissed_alerts', JSON.stringify(this.dismissedAlerts));
        this.activeAlerts = this.activeAlerts.filter(function(a) { return a.type !== type; });
        this.showAlertNotifications();
    },
    
    // Clear all dismissed
    resetDismissed: function() {
        this.dismissedAlerts = [];
        localStorage.removeItem('ezcubic_dismissed_alerts');
    },
    
    // Get alerts HTML for display
    getAlertsHTML: function() {
        if (this.activeAlerts.length === 0) {
            return '<div style="text-align:center;padding:20px;color:#94a3b8;"><i class="fas fa-check-circle" style="font-size:24px;margin-bottom:10px;display:block;color:#10b981;"></i>All clear! No alerts right now.</div>';
        }
        
        var html = '';
        for (var i = 0; i < this.activeAlerts.length; i++) {
            var alert = this.activeAlerts[i];
            var priorityColor = alert.config.priority === 'critical' ? '#ef4444' : 
                               alert.config.priority === 'high' ? '#f59e0b' : '#3b82f6';
            
            html += '<div class="proactive-alert" style="background:rgba(30,41,59,0.8);border-left:4px solid ' + alert.config.color + ';padding:15px;margin-bottom:10px;border-radius:8px;">';
            html += '<div style="display:flex;align-items:flex-start;gap:12px;">';
            html += '<i class="fas ' + alert.config.icon + '" style="color:' + alert.config.color + ';font-size:20px;margin-top:2px;"></i>';
            html += '<div style="flex:1;">';
            html += '<div style="font-weight:600;color:white;margin-bottom:5px;">' + alert.title + '</div>';
            html += '<div style="color:#94a3b8;font-size:13px;">' + alert.message + '</div>';
            html += '</div>';
            html += '<button onclick="ProactiveAlerts.dismissAlert(\'' + alert.type + '\')" style="background:none;border:none;color:#64748b;cursor:pointer;padding:5px;" title="Dismiss"><i class="fas fa-times"></i></button>';
            html += '</div></div>';
        }
        
        return html;
    },
    
    // Render alerts to dashboard panel (light theme)
    renderDashboardPanel: function() {
        var panel = document.getElementById('proactiveAlertsPanel');
        var badge = document.getElementById('alertsBadge');
        if (!panel) return;
        
        if (this.activeAlerts.length === 0) {
            panel.innerHTML = '<div style="text-align:center;padding:30px;color:#64748b;"><i class="fas fa-check-circle" style="font-size:32px;margin-bottom:10px;display:block;color:#10b981;"></i><strong>All Clear!</strong><br><small>No alerts at this time. Alpha is watching your business.</small></div>';
            if (badge) badge.style.display = 'none';
            return;
        }
        
        // Update badge
        if (badge) {
            badge.textContent = this.activeAlerts.length;
            badge.style.display = 'inline-block';
        }
        
        var html = '';
        for (var i = 0; i < this.activeAlerts.length; i++) {
            var alert = this.activeAlerts[i];
            var bgColor = alert.config.priority === 'critical' ? 'rgba(239,68,68,0.1)' : 
                         alert.config.priority === 'high' ? 'rgba(245,158,11,0.1)' : 'rgba(59,130,246,0.1)';
            
            html += '<div class="proactive-alert-item" style="background:' + bgColor + ';border-left:4px solid ' + alert.config.color + ';padding:12px 15px;margin-bottom:10px;border-radius:8px;">';
            html += '<div style="display:flex;align-items:flex-start;gap:12px;">';
            html += '<i class="fas ' + alert.config.icon + '" style="color:' + alert.config.color + ';font-size:18px;margin-top:2px;"></i>';
            html += '<div style="flex:1;">';
            html += '<div style="font-weight:600;color:#1e293b;margin-bottom:4px;">' + alert.title + '</div>';
            html += '<div style="color:#64748b;font-size:13px;">' + alert.message + '</div>';
            html += '</div>';
            html += '<button onclick="ProactiveAlerts.dismissAlert(\'' + alert.type + '\'); ProactiveAlerts.renderDashboardPanel();" style="background:none;border:none;color:#94a3b8;cursor:pointer;padding:5px;transition:color 0.2s;" onmouseover="this.style.color=\'#ef4444\'" onmouseout="this.style.color=\'#94a3b8\'" title="Dismiss"><i class="fas fa-times"></i></button>';
            html += '</div></div>';
        }
        
        panel.innerHTML = html;
    }
};

// Refresh alerts function (for button)
function refreshProactiveAlerts() {
    var panel = document.getElementById('proactiveAlertsPanel');
    if (panel) {
        panel.innerHTML = '<div style="text-align:center;padding:30px;color:#94a3b8;"><i class="fas fa-spinner fa-spin" style="font-size:24px;margin-bottom:10px;display:block;"></i>Checking for alerts...</div>';
    }
    setTimeout(function() {
        ProactiveAlerts.runAllChecks();
        ProactiveAlerts.renderDashboardPanel();
    }, 500);
}

// Auto-run checks on page load and every 5 minutes
function initProactiveAlerts() {
    // Initial check after 3 seconds (let data load first)
    setTimeout(function() {
        ProactiveAlerts.runAllChecks();
        ProactiveAlerts.renderDashboardPanel();
    }, 3000);
    
    // Check every 5 minutes
    setInterval(function() {
        ProactiveAlerts.runAllChecks();
        ProactiveAlerts.renderDashboardPanel();
    }, 5 * 60 * 1000);
}

// Expose globally
window.ProactiveAlerts = ProactiveAlerts;
window.initProactiveAlerts = initProactiveAlerts;
window.refreshProactiveAlerts = refreshProactiveAlerts;

// Initialize on load
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(initAIAssistant, 500);
    setTimeout(initProactiveAlerts, 1000);
});
