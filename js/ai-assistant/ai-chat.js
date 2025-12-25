/**
 * EZCubic - AI Chat & Query Processing
 * Chat interface, query handling, AI responses, voice input, automation
 * Split from ai-assistant.js v2.2.6 - 26 Dec 2025
 * Part A: Query processing and first half of generateAIResponse
 */

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
        if (window.aiState) window.aiState.tasksCompleted++;
        if (typeof updateAIStats === 'function') updateAIStats();
        if (typeof saveAIState === 'function') saveAIState();
    }, 1000);
}

function generateAIResponse(query) {
    const lowerQuery = query.toLowerCase();
    const transactions = (window.businessData && window.businessData.transactions) || [];
    const bills = (window.businessData && window.businessData.bills) || [];
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
                <p style="margin-top: 15px; color: #f59e0b;"><i class="fas fa-lightbulb"></i> Based on your YTD profit of RM ${formatNumber(yearIncome - yearExpenses)}, your estimated tax is RM ${formatNumber(typeof calculateEstimatedTax === 'function' ? calculateEstimatedTax(yearIncome - yearExpenses) : 0)}.</p>`,
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

    // ==================== END OF PART A ====================
    // Continue to Part B for: POS, Inventory, CRM, Quotations, Projects, 
    // Tutorials, Help responses, Voice input, Automation functions
    
    // PLACEHOLDER - This will be replaced by Part B
    return _generateAIResponsePartB(lowerQuery, query, transactions, bills, monthIncome, monthExpenses, yearIncome, yearExpenses, currentMonth, currentYear);
}

// Placeholder function - will be defined in Part B
function _generateAIResponsePartB(lowerQuery, query, transactions, bills, monthIncome, monthExpenses, yearIncome, yearExpenses, currentMonth, currentYear) {
    // This function is defined in ai-chat-partb.js
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

// ==================== GLOBAL EXPORTS (PART A) ====================
window.handleAIQueryKeyPress = handleAIQueryKeyPress;
window.askAIExample = askAIExample;
window.processAIQuery = processAIQuery;
window.generateAIResponse = generateAIResponse;
