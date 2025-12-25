/**
 * EZCubic - AI Assistant Core
 * Configuration, state, module tutorials, and initialization
 * Split from ai-assistant.js v2.2.6 - 22 Jan 2025
 */

// ==================== AI CONFIGURATION ====================
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

// ==================== AI STATE ====================
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

// ==================== QUICK HELP TOPICS ====================
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
                if (typeof refreshInsights === 'function') refreshInsights();
                if (typeof updateAIAnalytics === 'function') updateAIAnalytics();
                if (typeof updateAIStats === 'function') updateAIStats();
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
    if (event && event.target) {
        event.target.classList.add('active');
    }
    
    // Update insights based on mode
    if (typeof refreshInsights === 'function') refreshInsights();
    
    if (typeof showNotification === 'function') {
        showNotification(`AI Mode: ${mode.charAt(0).toUpperCase() + mode.slice(1)}`, 'info');
    } else if (typeof showToast === 'function') {
        showToast(`AI Mode: ${mode.charAt(0).toUpperCase() + mode.slice(1)}`, 'info');
    }
    saveAIState();
}

// ==================== HELPER FUNCTIONS ====================
function calculateEstimatedTax(taxableProfit) {
    if (taxableProfit <= 0) return 0;
    
    let tax = 0;
    if (taxableProfit <= 150000) {
        tax = taxableProfit * 0.15;
    } else if (taxableProfit <= 600000) {
        tax = (150000 * 0.15) + ((taxableProfit - 150000) * 0.17);
    } else {
        tax = (150000 * 0.15) + (450000 * 0.17) + ((taxableProfit - 600000) * 0.24);
    }
    return tax;
}

function findDuplicateTransactions() {
    const transactions = (window.businessData && window.businessData.transactions) || [];
    const duplicates = [];
    
    for (let i = 0; i < transactions.length; i++) {
        for (let j = i + 1; j < transactions.length; j++) {
            const t1 = transactions[i];
            const t2 = transactions[j];
            
            // Check if same amount, same type, same date
            if (t1.amount === t2.amount && 
                t1.type === t2.type && 
                t1.date === t2.date) {
                duplicates.push({ original: t1, duplicate: t2 });
            }
        }
    }
    
    return duplicates;
}

// ==================== GLOBAL EXPORTS ====================
window.AI_CONFIG = AI_CONFIG;
window.aiState = aiState;
window.MODULE_TUTORIALS = MODULE_TUTORIALS;
window.QUICK_HELP = QUICK_HELP;
window.initAIAssistant = initAIAssistant;
window.loadAIState = loadAIState;
window.saveAIState = saveAIState;
window.setAIMode = setAIMode;
window.calculateEstimatedTax = calculateEstimatedTax;
window.findDuplicateTransactions = findDuplicateTransactions;
