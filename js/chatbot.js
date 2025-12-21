// ==================== CHATBOT.JS ====================
// AI Chatbot Functions

// ==================== INITIALIZATION ====================
// Export functions to window for onclick handlers
window.initializeChatbot = initializeChatbot;
window.toggleChatbot = toggleChatbot;
window.showChatbot = showChatbot;
window.sendChatMessage = sendChatMessage;
window.handleChatbotKeyPress = handleChatbotKeyPress;
window.askQuickQuestion = askQuickQuestion;
window.clearChatHistory = clearChatHistory;

function initializeChatbot() {
    loadChatHistory();
    updateRecentChatPreview();
}

function loadChatHistory() {
    try {
        const saved = localStorage.getItem('ezcubicChatHistory');
        if (saved) {
            chatHistory = JSON.parse(saved);
        }
    } catch (error) {
        console.error('Error loading chat history:', error);
        chatHistory = [];
    }
}

function saveChatHistory() {
    try {
        localStorage.setItem('ezcubicChatHistory', JSON.stringify(chatHistory));
    } catch (error) {
        console.error('Error saving chat history:', error);
    }
}

// ==================== TOGGLE / SHOW ====================
function toggleChatbot() {
    const chatbot = document.getElementById('aiChatbotContainer');
    const toggleBtn = document.getElementById('chatbotToggleBtn');
    
    if (!isChatbotActive) {
        chatbot.classList.add('active');
        chatbot.classList.remove('minimized');
        isChatbotActive = true;
        unreadMessages = 0;
        updateNotificationBadge();
        document.getElementById('chatbotInput').focus();
    } else if (chatbot.classList.contains('minimized')) {
        chatbot.classList.remove('minimized');
        document.getElementById('chatbotInput').focus();
    } else {
        chatbot.classList.add('minimized');
    }
}

function showChatbot() {
    const chatbot = document.getElementById('aiChatbotContainer');
    chatbot.classList.add('active');
    chatbot.classList.remove('minimized');
    isChatbotActive = true;
    unreadMessages = 0;
    updateNotificationBadge();
    document.getElementById('chatbotInput').focus();
}

// ==================== MESSAGE HANDLING ====================
function addChatMessage(message, isUser = true) {
    const messagesContainer = document.getElementById('chatbotMessages');
    const now = new Date();
    const timeString = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    const messageElement = document.createElement('div');
    messageElement.className = `chatbot-message ${isUser ? 'user' : 'bot'}`;
    messageElement.innerHTML = `
        <div class="message-content">
            <div class="message-avatar">
                <i class="fas fa-${isUser ? 'user' : 'robot'}"></i>
            </div>
            <div class="message-text">${escapeHTML(message)}</div>
        </div>
        <div class="message-time">${timeString}</div>
    `;
    
    messagesContainer.appendChild(messageElement);
    
    chatHistory.push({
        message: message,
        isUser: isUser,
        timestamp: now.toISOString(),
        context: getBusinessContext()
    });
    
    if (chatHistory.length > 50) {
        chatHistory = chatHistory.slice(-50);
    }
    
    saveChatHistory();
    updateRecentChatPreview();
    
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
    
    if (isChatbotActive && !document.getElementById('aiChatbotContainer').classList.contains('minimized')) {
    } else if (!isUser) {
        unreadMessages++;
        updateNotificationBadge();
    }
}

function showTypingIndicator() {
    const messagesContainer = document.getElementById('chatbotMessages');
    const typingElement = document.createElement('div');
    typingElement.className = 'chatbot-message bot';
    typingElement.id = 'typingIndicator';
    typingElement.innerHTML = `
        <div class="message-content">
            <div class="message-avatar">
                <i class="fas fa-robot"></i>
            </div>
            <div class="message-text">
                <div class="typing-indicator">
                    <span></span>
                    <span></span>
                    <span></span>
                </div>
            </div>
        </div>
    `;
    
    messagesContainer.appendChild(typingElement);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function hideTypingIndicator() {
    const typingElement = document.getElementById('typingIndicator');
    if (typingElement) {
        typingElement.remove();
    }
}

// ==================== CONTEXT & PROCESSING ====================
function getBusinessContext() {
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    
    let monthIncome = 0;
    let monthExpenses = 0;
    
    businessData.transactions.forEach(tx => {
        const txDate = parseDateSafe(tx.date);
        if (txDate.getMonth() === currentMonth && txDate.getFullYear() === currentYear) {
            if (tx.type === 'income') monthIncome += tx.amount;
            else monthExpenses += tx.amount;
        }
    });
    
    return {
        currentMonthIncome: monthIncome,
        currentMonthExpenses: monthExpenses,
        businessName: businessData.settings.businessName,
        totalTransactions: businessData.transactions.length,
        currency: businessData.settings.currency
    };
}

function processUserMessage(message) {
    if (!message.trim()) return;
    
    addChatMessage(message, true);
    showTypingIndicator();
    
    setTimeout(() => {
        hideTypingIndicator();
        const response = generateAIResponse(message);
        addChatMessage(response, false);
    }, 1000 + Math.random() * 1000);
}

// ==================== AI RESPONSE GENERATION ====================
function generateAIResponse(message) {
    const lowerMessage = message.toLowerCase();
    const context = getBusinessContext();
    
    if (lowerMessage.includes('tax') || lowerMessage.includes('lhdn') || lowerMessage.includes('cp204')) {
        if (lowerMessage.includes('deduct') || lowerMessage.includes('expense')) {
            return `Based on Malaysian tax regulations (Income Tax Act 1967), here are common tax-deductible expenses:

✅ **Fully Deductible:**
• Business operating expenses (rent, utilities, supplies)
• Employee salaries, EPF, SOCSO, EIS contributions
• Marketing and advertising costs
• Professional fees (accountants, lawyers)
• Repair and maintenance costs
• Training and staff development
• Insurance premiums

✅ **Special Deductions for Malaysian Businesses:**
• R&D expenses (up to 200% deduction for approved projects)
• Donations to approved institutions
• Export promotion expenses

⚠ **Not Deductible:**
• Personal expenses
• Capital expenditures (treated differently)
• Fines and penalties
• Entertainment expenses (limited deduction)

For your current business: Your expenses this month are ${formatCurrency(context.currentMonthExpenses)}. Remember to keep all receipts for 7 years as required by LHDN.`;
        } else if (lowerMessage.includes('sst') || lowerMessage.includes('sales tax') || lowerMessage.includes('service tax')) {
            return `**SST (Sales & Service Tax) in Malaysia:**

📋 **Current SST Rates:**
• Sales Tax: 5-10% (varies by product category)
• Service Tax: 6% (for taxable services)

🏪 **Registration Threshold:**
• Sales Tax: RM500,000 annual taxable turnover
• Service Tax: RM500,000 annual taxable services

📝 **What's Taxable:**
• Most manufactured goods (Sales Tax)
• Selected services: consulting, accounting, legal, hotels, restaurants (Service Tax)

💡 **For Your Business:**
If your annual revenue exceeds RM500,000, you must register for SST with Royal Malaysian Customs Department. Keep proper records of all taxable supplies.

Current monthly revenue: ${formatCurrency(context.currentMonthIncome)}`;
        } else if (lowerMessage.includes('calculate') || lowerMessage.includes('rate')) {
            const taxableProfit = context.currentMonthIncome - context.currentMonthExpenses;
            const taxRate = businessData.settings.defaultTaxRate;
            const estimatedTax = taxableProfit > 0 ? taxableProfit * (taxRate / 100) : 0;
            
            return `**Corporate Tax Calculation (Malaysia):**

💰 **Taxable Profit Formula:**
Total Revenue - Allowable Expenses = Taxable Profit

Your current month:
• Revenue: ${formatCurrency(context.currentMonthIncome)}
• Expenses: ${formatCurrency(context.currentMonthExpenses)}
• Taxable Profit: ${formatCurrency(taxableProfit)}

📊 **Tax Rates for SMEs (Paid-up capital ≤ RM2.5M):**
• First RM500,000: 15%
• Next RM500,000: 17%
• Above RM1,000,000: 24%

🔢 **Estimated Tax (using ${taxRate}% rate):**
${formatCurrency(taxableProfit)} × ${taxRate}% = ${formatCurrency(estimatedTax)}

📅 **Payment:**
• CP204 instalments due every 2 months (by 30th)
• Final tax payment due 7 months after financial year-end

💡 **Tip:** Set aside ${formatCurrency(estimatedTax / 12)} monthly for tax payments.`;
        }
    }
    
    if (lowerMessage.includes('account') || lowerMessage.includes('record') || lowerMessage.includes('bookkeeping')) {
        if (lowerMessage.includes('keep') || lowerMessage.includes('record')) {
            return `**Essential Records for Malaysian Businesses:**

📁 **Legal Requirements (Companies Act 2016):**
1. **Financial Records** - Keep for 7 years
   • Sales invoices and receipts
   • Purchase bills and receipts
   • Bank statements
   • Payment vouchers

2. **Statutory Records** - Keep permanently
   • Certificate of Incorporation (SSM)
   • Company Constitution
   • Register of Directors
   • Register of Members

3. **Tax Records (LHDN Requirements):**
   • EA Forms for employees
   • CP8D (Contractor statements)
   • SST returns and records (if registered)
   • Withholding tax records

💡 **Digital Record Keeping Tips:**
• Scan all receipts using your phone
• Use EZCubic to track all transactions
• Backup monthly to cloud storage
• Use separate business bank account`;
        } else if (lowerMessage.includes('balance sheet') || lowerMessage.includes('financial statement')) {
            return `**Financial Statements Requirements in Malaysia:**

📄 **Required Statements (Financial Reporting Standard):**
1. **Statement of Financial Position** (Balance Sheet)
2. **Statement of Profit or Loss** (Income Statement)
3. **Statement of Changes in Equity**
4. **Statement of Cash Flows**
5. **Notes to the Accounts**

📋 **SSM Filing Requirements:**
• Dormant companies: Lodge Annual Return
• Small companies (revenue < RM100k): Simplified reporting
• Other companies: Audited financial statements

⏰ **Deadlines:**
• Private companies: 30 days after AGM
• Public companies: 6 months after financial year-end

🔧 **EZCubic can help you prepare:**
• Automatic balance sheet generation
• Profit & Loss statements
• Cash flow tracking
• Export ready for accountant review`;
        }
    }
    
    if (lowerMessage.includes('business') || lowerMessage.includes('start') || lowerMessage.includes('company')) {
        if (lowerMessage.includes('ssm') || lowerMessage.includes('register')) {
            return `**Business Registration in Malaysia (SSM):**

🏢 **Types of Business Structures:**
1. **Sole Proprietorship** - Simple, unlimited liability
2. **Partnership** - 2-20 partners
3. **Private Limited Company (Sdn Bhd)** - Separate legal entity

📝 **Registration Process:**
1. **Name Search & Reservation** (RM50-60)
2. **Registration** (RM1,000-5,000 depending on capital)
3. **Company Seal** (RM100-200)
4. **Business Bank Account**

📋 **Required Documents:**
• Identity card/passport copies
• Registered business address
• Details of directors/shareholders
• Company constitution

⏰ **Timeline:** 1-3 working days for SSM registration

💰 **Costs:**
• Sole proprietorship: RM60-100
• Partnership: RM150-300
• Sdn Bhd: RM1,000+ (depending on capital)

💡 **Recommendation:** Most businesses choose Sdn Bhd for liability protection.`;
        } else if (lowerMessage.includes('expense') && (lowerMessage.includes('save') || lowerMessage.includes('reduce'))) {
            return `**Expense Optimization Strategies for Malaysian Businesses:**

💰 **Quick Wins:**
1. **Negotiate with suppliers** - Ask for bulk discounts
2. **Review subscriptions** - Cancel unused services
3. **Go paperless** - Save on printing and storage
4. **Energy efficiency** - Switch to LED lights, optimize AC usage

📊 **Tax-Smart Expenses:**
• **Claim all deductions** - Keep receipts for everything
• **Time purchases** - Buy assets before year-end for capital allowances
• **Employee training** - Deductible and improves productivity

💡 **For Your Current Situation:**
Your monthly expenses are ${formatCurrency(context.currentMonthExpenses)}. Consider:
• Reviewing your top 3 expense categories
• Renegotiating with regular suppliers
• Claiming all eligible tax deductions

🛠 **Use EZCubic to:**
• Track expenses by category
• Identify spending patterns
• Generate expense reports for analysis`;
        }
    }
    
    if (lowerMessage.includes('personal') && lowerMessage.includes('tax')) {
        return `**Malaysian Personal Income Tax:**

📋 **Key Features:**
• Progressive tax rates (0-30%)
• Various tax reliefs available
• EPF contributions tax deductible (up to RM4,000)
• Medical expenses for parents deductible (up to RM10,000)
• Zakat payments are tax rebates

💰 **Common Reliefs:**
1. Individual relief: RM9,000
2. EPF/Life Insurance: Up to RM7,000
3. Medical expenses (parents): Up to RM10,000
4. Lifestyle (books, gym, tech): Up to RM2,500
5. Education/Medical (self): Various limits

💡 **Use EZCubic's Personal Tax Calculator to:**
• Estimate your annual tax liability
• Maximize your tax relief claims
• Plan for tax payments
• Understand the progressive tax system`;
    }
    
    if (lowerMessage.includes('cash') || lowerMessage.includes('flow') || lowerMessage.includes('profit')) {
        const netIncome = context.currentMonthIncome - context.currentMonthExpenses;
        const profitMargin = context.currentMonthIncome > 0 ? (netIncome / context.currentMonthIncome * 100).toFixed(1) : 0;
        
        return `**Financial Health Analysis:**

📈 **Your Current Metrics:**
• Monthly Revenue: ${formatCurrency(context.currentMonthIncome)}
• Monthly Expenses: ${formatCurrency(context.currentMonthExpenses)}
• Net Profit: ${formatCurrency(netIncome)}
• Profit Margin: ${profitMargin}%

🎯 **Healthy Business Benchmarks (Malaysia SMEs):**
• Profit Margin: 10-20% (good), 20%+ (excellent)
• Expense-to-Revenue Ratio: Below 80%
• Cash Reserve: 3-6 months of expenses

💡 **Recommendations:**
${profitMargin > 20 ? '✅ Excellent profit margin! Consider reinvesting in growth.' : 
  profitMargin > 10 ? '✅ Good profit margin. Maintain current strategies.' : 
  profitMargin > 0 ? '⚠️ Low profit margin. Review expenses and pricing.' : 
  '❌ Negative profit. Immediate expense reduction needed.'}

📊 **Action Steps:**
1. Review your highest expense categories
2. Consider price adjustments if margin is low
3. Build cash reserves for emergencies
4. Plan for seasonal fluctuations`;
    }
    
    const responses = [
        "I understand you're asking about Malaysian business matters. Could you be more specific? For example, you could ask about tax deductions, SST registration, or financial reporting requirements.",
        "That's an interesting question about Malaysian business operations. To help you better, could you tell me if this relates to taxation, accounting, business registration, or financial management?",
        "I specialize in Malaysian business finance and accounting. You might want to ask about:\n• Malaysian tax rates and deductions\n• SSM registration process\n• Financial statement requirements\n• Expense tracking best practices\n• GST/SST compliance",
        `Based on your business data (${context.businessName}), I notice you have ${context.totalTransactions} transactions recorded. Would you like help analyzing your financial patterns or understanding specific regulations?`
    ];
    
    return responses[Math.floor(Math.random() * responses.length)];
}

// ==================== USER INTERACTION ====================
function sendChatMessage() {
    const input = document.getElementById('chatbotInput');
    const message = input.value.trim();
    
    if (message) {
        processUserMessage(message);
        input.value = '';
    }
}

function handleChatbotKeyPress(event) {
    if (event.key === 'Enter') {
        sendChatMessage();
    }
}

function askQuickQuestion(question) {
    const input = document.getElementById('chatbotInput');
    input.value = question;
    sendChatMessage();
}

function clearChatHistory() {
    if (confirm('Are you sure you want to clear all chat history? This action cannot be undone.')) {
        chatHistory = [];
        saveChatHistory();
        
        const messagesContainer = document.getElementById('chatbotMessages');
        messagesContainer.innerHTML = `
            <div class="chatbot-message bot">
                <div class="message-content">
                    <div class="message-avatar">
                        <i class="fas fa-robot"></i>
                    </div>
                    <div class="message-text">
                        Hello! I'm your EZCubic AI Assistant. I can help you with:
                        <ul style="margin-top: 5px; padding-left: 15px;">
                            <li>Accounting advice for Malaysian businesses</li>
                            <li>Tax calculation explanations</li>
                            <li>Financial report analysis</li>
                            <li>Expense categorization help</li>
                            <li>General business finance questions</li>
                        </ul>
                        How can I help you today?
                    </div>
                </div>
                <div class="message-time">Just now</div>
            </div>
        `;
        
        unreadMessages = 0;
        updateNotificationBadge();
        updateRecentChatPreview();
        
        showNotification('Chat history cleared successfully!', 'success');
    }
}

// ==================== NOTIFICATIONS ====================
function updateNotificationBadge() {
    const badge = document.getElementById('chatbotNotification');
    const navBadge = document.getElementById('chatbotNavBadge');
    
    if (unreadMessages > 0) {
        badge.style.display = 'flex';
        badge.textContent = unreadMessages > 9 ? '9+' : unreadMessages;
        
        if (navBadge) {
            navBadge.style.display = 'flex';
            navBadge.textContent = unreadMessages > 9 ? '9+' : unreadMessages;
        }
    } else {
        badge.style.display = 'none';
        if (navBadge) {
            navBadge.style.display = 'none';
        }
    }
}

function updateRecentChatPreview() {
    const recentContainer = document.getElementById('recentChatPreview');
    if (!recentContainer) return;
    
    const recentChats = chatHistory.filter(msg => msg.isUser).slice(-3);
    
    if (recentChats.length === 0) {
        recentContainer.innerHTML = `
            <div style="color: #94a3b8; text-align: center; padding: 20px;">
                <i class="fas fa-comment-slash" style="font-size: 24px; margin-bottom: 10px;"></i>
                <div>No recent conversations</div>
            </div>
        `;
        return;
    }
    
    recentContainer.innerHTML = recentChats.map(chat => `
        <div style="padding: 8px; border-bottom: 1px solid #e2e8f0;">
            <div style="font-size: 13px; color: #475569; margin-bottom: 4px;">
                ${escapeHTML(chat.message.length > 50 ? chat.message.substring(0, 50) + '...' : chat.message)}
            </div>
            <div style="font-size: 11px; color: #94a3b8;">
                ${new Date(chat.timestamp).toLocaleDateString()}
            </div>
        </div>
    `).join('');
}
