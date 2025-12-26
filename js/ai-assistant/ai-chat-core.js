/**
 * EZCubic - AI Chat Core Module
 * Query processing, AI response generation (Part A)
 * Contains: AI Query Processing, Accounting Basics for Beginners
 * Split from ai-chat.js v2.2.6 - 26 Dec 2025
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

    // ==================== END OF ACCOUNTING BASICS ====================
    // Continue to UI module for: Guided Setup, Profit queries, Reports, etc.
    
    return _generateAIResponseUI(lowerQuery, query, transactions, bills, monthIncome, monthExpenses, yearIncome, yearExpenses, currentMonth, currentYear);
}

// Placeholder function - will be defined in ai-chat-ui.js
function _generateAIResponseUI(lowerQuery, query, transactions, bills, monthIncome, monthExpenses, yearIncome, yearExpenses, currentMonth, currentYear) {
    // This function is defined in ai-chat-ui.js
    // Default fallback in case UI module is not loaded
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

// ==================== WINDOW EXPORTS (CORE MODULE) ====================
window.handleAIQueryKeyPress = handleAIQueryKeyPress;
window.askAIExample = askAIExample;
window.processAIQuery = processAIQuery;
window.generateAIResponse = generateAIResponse;
