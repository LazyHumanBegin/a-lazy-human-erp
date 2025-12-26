/**
 * EZCubic - AI Chat UI Module
 * AI Response Generation (Part B) - Guided Setup & Query Responses
 * Contains: Guided Setup, Profit queries, Reports, Tax, Cash flow, etc.
 * Split from ai-chat.js v2.2.6 - 26 Dec 2025
 */

// ==================== AI RESPONSE UI FUNCTION ====================
// This function continues generateAIResponse from ai-chat-core.js
function _generateAIResponseUI(lowerQuery, query, transactions, bills, monthIncome, monthExpenses, yearIncome, yearExpenses, currentMonth, currentYear) {
    
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
        const businessName = window.businessData && window.businessData.settings && window.businessData.settings.businessName;
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
    
    // ==================== PROFIT & REPORT QUERIES ====================
    
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
    
    // ==================== TAX QUERIES ====================
    
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
                <p style="margin-top: 15px; color: #f59e0b;"><i class="fas fa-lightbulb"></i> Based on your YTD profit of RM ${formatNumber(yearIncome - yearExpenses)}, your estimated tax is RM ${formatNumber(typeof calculateEstimatedTax === 'function' ? calculateEstimatedTax(yearIncome - yearExpenses) : 0)}.</p>`,
            actions: [
                { label: 'Tax Calculator', action: "showSection('taxes')" },
                { label: 'Review Expenses', action: "showSection('expenses')" }
            ]
        };
    }
    
    // ==================== CASH FLOW QUERIES ====================
    
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
    
    // ==================== TRANSACTION QUERIES ====================
    
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
        const duplicates = typeof findDuplicateTransactions === 'function' ? findDuplicateTransactions() : [];
        return {
            text: duplicates.length > 0 
                ? `I found <strong>${duplicates.length} potential duplicate entries</strong>. These are transactions with similar amounts and dates. Review them to avoid double-counting.`
                : `<strong>No duplicates found!</strong> Your transaction records look clean.`,
            actions: duplicates.length > 0 ? [
                { label: 'Review Duplicates', action: "runAutomation('duplicates')" }
            ] : []
        };
    }
    
    // ==================== BILLS QUERIES ====================
    
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
    
    // ==================== EXPENSE QUERIES ====================
    
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

    // ==================== END OF UI RESPONSES ====================
    // Continue to Part B for: POS, Inventory, CRM, Quotations, Projects, 
    // Tutorials, Help responses, Voice input, Automation functions
    
    // PLACEHOLDER - This will be replaced by Part B
    return _generateAIResponsePartB(lowerQuery, query, transactions, bills, monthIncome, monthExpenses, yearIncome, yearExpenses, currentMonth, currentYear);
}

// Placeholder function - will be defined in Part B (ai-chat-b.js)
function _generateAIResponsePartB(lowerQuery, query, transactions, bills, monthIncome, monthExpenses, yearIncome, yearExpenses, currentMonth, currentYear) {
    // This function is defined in ai-chat-b.js
    // Default fallback in case Part B is not loaded
    return {
        text: `<strong>I'm here to help! 🤖</strong>
            <p style="margin-top: 10px; color: #cbd5e1;">Try asking about:</p>
            <ul style="margin-top: 10px; padding-left: 20px; color: #94a3b8;">
                <li>Getting started</li>
                <li>Your profit this month</li>
                <li>Tax tips</li>
                <li>Bills due soon</li>
            </ul>`,
        actions: [
            { label: '🚀 Get Started', action: "askAIExample('How do I get started?')" },
            { label: '📊 Dashboard', action: "showSection('dashboard')" }
        ]
    };
}

// ==================== WINDOW EXPORTS (UI MODULE) ====================
window._generateAIResponseUI = _generateAIResponseUI;
window._generateAIResponsePartB = _generateAIResponsePartB;
