// ==================== CHATBOT.JS ====================
// AI Chatbot Functions

// ==================== STATE VARIABLES ====================
let isChatbotActive = false;
let chatHistory = [];
let unreadMessages = 0;

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
    
    if (!chatbot) {
        console.warn('Chatbot container not found');
        return;
    }
    
    if (!isChatbotActive) {
        chatbot.classList.add('active');
        chatbot.classList.remove('minimized');
        isChatbotActive = true;
        unreadMessages = 0;
        updateNotificationBadge();
        const input = document.getElementById('chatbotInput');
        if (input) input.focus();
    } else if (chatbot.classList.contains('minimized')) {
        chatbot.classList.remove('minimized');
        const input = document.getElementById('chatbotInput');
        if (input) input.focus();
    } else {
        chatbot.classList.add('minimized');
    }
}

function showChatbot() {
    const chatbot = document.getElementById('aiChatbotContainer');
    if (!chatbot) {
        console.warn('Chatbot container not found');
        return;
    }
    chatbot.classList.add('active');
    chatbot.classList.remove('minimized');
    isChatbotActive = true;
    unreadMessages = 0;
    updateNotificationBadge();
    const input = document.getElementById('chatbotInput');
    if (input) input.focus();
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

// Conversation history for AI context
let conversationHistory = [];
const MAX_CONVERSATION_HISTORY = 10; // Keep last 10 messages for context
let isProcessingMessage = false; // Prevent double-sends

// Build comprehensive business context for AI
function getBusinessContext() {
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                        'July', 'August', 'September', 'October', 'November', 'December'];
    
    let monthIncome = 0;
    let monthExpenses = 0;
    const recentTransactions = [];
    
    // Calculate monthly figures and get recent transactions
    const sortedTransactions = [...(businessData.transactions || [])].sort((a, b) => 
        new Date(b.date) - new Date(a.date)
    );
    
    sortedTransactions.forEach(tx => {
        const txDate = parseDateSafe(tx.date);
        if (txDate.getMonth() === currentMonth && txDate.getFullYear() === currentYear) {
            if (tx.type === 'income') monthIncome += tx.amount;
            else monthExpenses += tx.amount;
        }
    });
    
    // Get recent transactions (last 10)
    sortedTransactions.slice(0, 10).forEach(tx => {
        recentTransactions.push({
            type: tx.type,
            amount: tx.amount,
            description: tx.description,
            category: tx.category,
            date: tx.date
        });
    });
    
    // Get customer stats
    const customers = Array.isArray(window.customers) ? window.customers : [];
    const topCustomers = [...customers]
        .sort((a, b) => (b.totalSpent || 0) - (a.totalSpent || 0))
        .slice(0, 5)
        .map(c => ({ name: c.name, total: c.totalSpent || 0 }));
    
    // Get product/inventory stats
    const products = Array.isArray(window.products) ? window.products : [];
    const lowStockItems = products.filter(p => p.quantity <= (p.reorderLevel || 5)).length;
    
    // Get order stats
    const orders = Array.isArray(window.orders) ? window.orders : [];
    const pendingOrders = orders.filter(o => o.status === 'pending' || o.status === 'processing').length;
    
    // Get overdue invoices
    const invoices = Array.isArray(window.invoices) ? window.invoices : [];
    const today = new Date();
    const overdueInvoices = invoices.filter(inv => 
        inv.status !== 'paid' && new Date(inv.dueDate) < today
    ).length;
    
    return {
        businessName: businessData.settings?.businessName || 'My Business',
        currency: businessData.settings?.currency || 'MYR',
        currentMonth: monthNames[currentMonth] + ' ' + currentYear,
        monthlyIncome: monthIncome,
        monthlyExpenses: monthExpenses,
        monthlyProfit: monthIncome - monthExpenses,
        totalTransactions: businessData.transactions?.length || 0,
        totalCustomers: customers.length,
        totalProducts: products.length,
        lowStockItems: lowStockItems,
        pendingOrders: pendingOrders,
        overdueInvoices: overdueInvoices,
        recentTransactions: recentTransactions,
        topCustomers: topCustomers
    };
}

// Build simple context for fallback responses
function getSimpleContext() {
    const context = getBusinessContext();
    return {
        currentMonthIncome: context.monthlyIncome,
        currentMonthExpenses: context.monthlyExpenses,
        businessName: context.businessName,
        totalTransactions: context.totalTransactions,
        currency: context.currency
    };
}

// Process user message - try AI first, fallback to rules
async function processUserMessage(message) {
    if (!message.trim()) return;
    
    // Prevent double processing
    if (isProcessingMessage) {
        console.log('Already processing a message, please wait...');
        return;
    }
    
    isProcessingMessage = true;
    
    addChatMessage(message, true);
    showTypingIndicator();
    
    // Add to conversation history
    conversationHistory.push({ role: 'user', content: message });
    if (conversationHistory.length > MAX_CONVERSATION_HISTORY) {
        conversationHistory = conversationHistory.slice(-MAX_CONVERSATION_HISTORY);
    }
    
    try {
        // Try AI response first
        console.log('Calling AI with message:', message);
        const aiResponse = await getAIResponse(message);
        console.log('AI response:', aiResponse);
        
        hideTypingIndicator();
        
        if (aiResponse.success) {
            // Check if response is an action (JSON)
            const actionResult = parseAndExecuteAction(aiResponse.message);
            
            if (actionResult.isAction) {
                // Show action confirmation message
                addChatMessage(actionResult.message, false);
                showSmartActions(actionResult.message);
                
                // Add to history
                conversationHistory.push({ role: 'assistant', content: actionResult.message });
            } else {
                // Normal chat response
                addChatMessage(aiResponse.message, false);
                showSmartActions(aiResponse.message);
                
                conversationHistory.push({ role: 'assistant', content: aiResponse.message });
            }
            
            if (conversationHistory.length > MAX_CONVERSATION_HISTORY) {
                conversationHistory = conversationHistory.slice(-MAX_CONVERSATION_HISTORY);
            }
        } else {
            // Fallback to rule-based response
            console.log('Using fallback response');
            const fallbackResponse = generateAIResponse(message);
            addChatMessage(fallbackResponse, false);
        }
    } catch (error) {
        console.error('AI response failed:', error);
        hideTypingIndicator();
        const fallbackResponse = generateAIResponse(message);
        addChatMessage(fallbackResponse, false);
    } finally {
        // Always unlock
        isProcessingMessage = false;
    }
}

// Parse AI response and execute action if it's a JSON command
function parseAndExecuteAction(response) {
    // Try to extract JSON from response (might be mixed with text)
    const jsonMatch = response.match(/\{[^{}]*"action"[^{}]*\}/s);
    if (!jsonMatch) {
        return { isAction: false };
    }
    
    try {
        const action = JSON.parse(jsonMatch[0]);
        
        // Normalize field names (AI might use variations)
        if (action.productName) action.product = action.productName;
        if (action.customerName) action.customer = action.customerName;
        if (action.supplierName) action.supplier = action.supplierName;
        
        console.log('Parsed action:', action);
        
        // Transaction actions
        if (action.action === 'add_expense') {
            return executeAddExpense(action);
        } else if (action.action === 'add_income') {
            return executeAddIncome(action);
        }
        // Product & Inventory actions
        else if (action.action === 'add_product') {
            return executeAddProduct(action);
        } else if (action.action === 'stock_in') {
            return executeStockIn(action);
        } else if (action.action === 'stock_out') {
            return executeStockOut(action);
        }
        // Customer & Supplier actions
        else if (action.action === 'add_customer') {
            return executeAddCustomer(action);
        } else if (action.action === 'add_supplier') {
            return executeAddSupplier(action);
        }
        // Invoice & Quotation actions
        else if (action.action === 'create_invoice') {
            return executeCreateInvoice(action);
        } else if (action.action === 'create_quotation') {
            return executeCreateQuotation(action);
        }
        // Order actions
        else if (action.action === 'create_order') {
            return executeCreateOrder(action);
        }
        // Bill actions
        else if (action.action === 'add_bill') {
            return executeAddBill(action);
        }
        // BOM actions
        else if (action.action === 'create_bom') {
            return executeCreateBOM(action);
        }
        // Project actions
        else if (action.action === 'create_project') {
            return executeCreateProject(action);
        }
        // Delivery Order actions
        else if (action.action === 'create_delivery_order' || action.action === 'create_do') {
            return executeCreateDeliveryOrder(action);
        }
        // Employee/Payroll actions
        else if (action.action === 'add_employee') {
            return executeAddEmployee(action);
        }
        // KPI actions
        else if (action.action === 'create_kpi') {
            return executeCreateKPI(action);
        }
        // Branch actions
        else if (action.action === 'add_branch') {
            return executeAddBranch(action);
        }
        // Stock Transfer actions
        else if (action.action === 'stock_transfer' || action.action === 'transfer_stock') {
            return executeStockTransfer(action);
        }
        // Journal Entry actions
        else if (action.action === 'create_journal' || action.action === 'journal_entry') {
            return executeCreateJournalEntry(action);
        }
        // Leave actions
        else if (action.action === 'apply_leave' || action.action === 'create_leave') {
            return executeApplyLeave(action);
        }
        // POS Sale actions
        else if (action.action === 'pos_sale' || action.action === 'create_sale' || action.action === 'quick_sale') {
            return executePOSSale(action);
        }
        // Search/Find actions
        else if (action.action === 'search') {
            return executeSearch(action);
        }
        // Status Update actions
        else if (action.action === 'update_status') {
            return executeUpdateStatus(action);
        }
        // Delete actions
        else if (action.action === 'delete') {
            return executeDelete(action);
        }
        
        return { isAction: false };
    } catch (e) {
        console.log('Not a JSON action:', e.message);
        return { isAction: false };
    }
}

// Execute: Add Expense
function executeAddExpense(action) {
    try {
        const transaction = {
            id: 'TX' + Date.now(),
            type: 'expense',
            amount: parseFloat(action.amount) || 0,
            description: action.description || 'Expense',
            category: action.category || 'Other',
            date: new Date().toISOString().split('T')[0],
            createdAt: new Date().toISOString(),
            createdBy: 'AI Assistant'
        };
        
        // Add to businessData
        if (window.businessData && window.businessData.transactions) {
            window.businessData.transactions.push(transaction);
            
            // Save and update
            if (typeof saveData === 'function') saveData();
            if (typeof updateDashboard === 'function') updateDashboard();
            if (typeof showNotification === 'function') {
                showNotification(`Expense RM${action.amount} added!`, 'success');
            }
        }
        
        return {
            isAction: true,
            message: `Done! ✅ Added expense: RM${action.amount} for "${action.description}" (${action.category})`
        };
    } catch (e) {
        console.error('Error adding expense:', e);
        return { isAction: true, message: `Oops! Couldn't add expense: ${e.message}` };
    }
}

// Execute: Add Income
function executeAddIncome(action) {
    try {
        const transaction = {
            id: 'TX' + Date.now(),
            type: 'income',
            amount: parseFloat(action.amount) || 0,
            description: action.description || 'Income',
            category: action.category || 'Sales',
            date: new Date().toISOString().split('T')[0],
            createdAt: new Date().toISOString(),
            createdBy: 'AI Assistant'
        };
        
        // Add to businessData
        if (window.businessData && window.businessData.transactions) {
            window.businessData.transactions.push(transaction);
            
            // Save and update
            if (typeof saveData === 'function') saveData();
            if (typeof updateDashboard === 'function') updateDashboard();
            if (typeof showNotification === 'function') {
                showNotification(`Income RM${action.amount} added!`, 'success');
            }
        }
        
        return {
            isAction: true,
            message: `Done! ✅ Added income: RM${action.amount} for "${action.description}" (${action.category})`
        };
    } catch (e) {
        console.error('Error adding income:', e);
        return { isAction: true, message: `Oops! Couldn't add income: ${e.message}` };
    }
}

// Execute: Add Product
function executeAddProduct(action) {
    try {
        const product = {
            id: 'PROD' + Date.now(),
            name: action.name || 'New Product',
            sku: action.sku || 'SKU' + Date.now().toString().slice(-6),
            price: parseFloat(action.price) || 0,
            cost: parseFloat(action.cost) || 0,
            quantity: parseInt(action.quantity) || 0,
            category: action.category || 'General',
            status: 'active',
            createdAt: new Date().toISOString(),
            createdBy: 'AI Assistant'
        };
        
        // Add to products array (same pattern as inventory.js)
        if (!window.products) window.products = [];
        window.products.push(product);
        
        // Use proper save function if available, else direct localStorage
        if (typeof saveProducts === 'function') {
            saveProducts();
        } else {
            localStorage.setItem('ezcubic_products', JSON.stringify(window.products));
            // Also save to tenant
            const user = window.currentUser;
            if (user && user.tenantId) {
                const tenantKey = 'ezcubic_tenant_' + user.tenantId;
                let tenantData = JSON.parse(localStorage.getItem(tenantKey) || '{}');
                tenantData.products = window.products;
                tenantData.updatedAt = new Date().toISOString();
                localStorage.setItem(tenantKey, JSON.stringify(tenantData));
            }
        }
        
        // Refresh the UI
        if (typeof renderProducts === 'function') renderProducts();
        if (typeof showNotification === 'function') {
            showNotification(`Product "${action.name}" added!`, 'success');
        }
        
        return {
            isAction: true,
            message: `Done! ✅ Added product: "${action.name}" - RM${action.price}, ${action.quantity} in stock 📦`
        };
    } catch (e) {
        console.error('Error adding product:', e);
        return { isAction: true, message: `Oops! Couldn't add product: ${e.message}` };
    }
}

// Execute: Add Customer
function executeAddCustomer(action) {
    try {
        const customer = {
            id: 'CUST' + Date.now(),
            name: action.name || 'New Customer',
            email: action.email || '',
            phone: action.phone || '',
            company: action.company || '',
            status: 'active',
            createdAt: new Date().toISOString(),
            createdBy: 'AI Assistant'
        };
        
        // Add to CRM customers array (same pattern as crm.js)
        if (!window.crmCustomers) window.crmCustomers = [];
        window.crmCustomers.push(customer);
        
        // Use proper save function if available, else direct localStorage
        if (typeof saveCRMCustomers === 'function') {
            saveCRMCustomers();
        } else {
            localStorage.setItem('ezcubic_crm_customers', JSON.stringify(window.crmCustomers));
            // Also save to tenant
            const user = window.currentUser;
            if (user && user.tenantId) {
                const tenantKey = 'ezcubic_tenant_' + user.tenantId;
                let tenantData = JSON.parse(localStorage.getItem(tenantKey) || '{}');
                tenantData.crmCustomers = window.crmCustomers;
                tenantData.updatedAt = new Date().toISOString();
                localStorage.setItem(tenantKey, JSON.stringify(tenantData));
            }
        }
        
        // Refresh the UI
        if (typeof renderCRMCustomers === 'function') renderCRMCustomers();
        if (typeof showNotification === 'function') {
            showNotification(`Customer "${action.name}" added!`, 'success');
        }
        
        return {
            isAction: true,
            message: `Done! ✅ Added customer: "${action.name}" 👤`
        };
    } catch (e) {
        console.error('Error adding customer:', e);
        return { isAction: true, message: `Oops! Couldn't add customer: ${e.message}` };
    }
}

// Execute: Add Supplier
function executeAddSupplier(action) {
    try {
        if (!action.name) {
            return { isAction: true, message: "Need a supplier name! Try: 'add supplier ABC Trading'" };
        }
        
        const supplier = {
            id: 'SUP_' + Date.now(),
            name: action.name,
            company: action.company || action.name,
            email: action.email || '',
            phone: action.phone || '',
            address: action.address || '',
            category: action.category || 'General',
            status: 'active',
            notes: action.notes || 'Added via AI',
            createdAt: new Date().toISOString()
        };
        
        // Add to suppliers array (same pattern as suppliers.js)
        if (!window.suppliers) window.suppliers = [];
        window.suppliers.push(supplier);
        
        // Use proper save function if available, else direct localStorage
        if (typeof saveSuppliers === 'function') {
            saveSuppliers();
        } else {
            localStorage.setItem('ezcubic_suppliers', JSON.stringify(window.suppliers));
            // Also save to tenant
            const user = window.currentUser;
            if (user && user.tenantId) {
                const tenantKey = 'ezcubic_tenant_' + user.tenantId;
                let tenantData = JSON.parse(localStorage.getItem(tenantKey) || '{}');
                tenantData.suppliers = window.suppliers;
                tenantData.updatedAt = new Date().toISOString();
                localStorage.setItem(tenantKey, JSON.stringify(tenantData));
            }
        }
        
        // Refresh the UI
        if (typeof renderSuppliers === 'function') renderSuppliers();
        if (typeof showNotification === 'function') {
            showNotification(`Supplier "${action.name}" added!`, 'success');
        }
        
        return {
            isAction: true,
            message: `Done! ✅ Added supplier: "${action.name}" 🏭`
        };
    } catch (e) {
        console.error('Error adding supplier:', e);
        return { isAction: true, message: `Oops! Couldn't add supplier: ${e.message}` };
    }
}

// Execute: Create Invoice
function executeCreateInvoice(action) {
    try {
        if (!action.customer) {
            return { isAction: true, message: "Need a customer name! Try: 'create invoice for Ahmad RM500'" };
        }
        
        const amount = parseFloat(action.amount) || 0;
        const invoice = {
            id: 'INV_' + Date.now(),
            invoiceNumber: `INV-${Date.now().toString().slice(-6)}`,
            customer: action.customer,
            customerName: action.customer,
            items: action.items || [{ description: action.description || 'Service', quantity: 1, price: amount }],
            subtotal: amount,
            tax: amount * 0.06,
            total: amount * 1.06,
            status: action.status || 'pending',
            dueDate: action.dueDate || new Date(Date.now() + 30*24*60*60*1000).toISOString().split('T')[0],
            createdAt: new Date().toISOString(),
            notes: action.notes || 'Created via AI'
        };
        
        // Add to invoices array (same pattern as invoices.js)
        if (!window.invoices) window.invoices = [];
        window.invoices.push(invoice);
        
        // Use proper save function if available, else direct localStorage
        if (typeof saveInvoices === 'function') {
            saveInvoices();
        } else {
            localStorage.setItem('ezcubic_invoices', JSON.stringify(window.invoices));
            // Also save to tenant
            const user = window.currentUser;
            if (user && user.tenantId) {
                const tenantKey = 'ezcubic_tenant_' + user.tenantId;
                let tenantData = JSON.parse(localStorage.getItem(tenantKey) || '{}');
                tenantData.invoices = window.invoices;
                tenantData.updatedAt = new Date().toISOString();
                localStorage.setItem(tenantKey, JSON.stringify(tenantData));
            }
        }
        
        // Refresh the UI
        if (typeof renderInvoices === 'function') renderInvoices();
        if (typeof showNotification === 'function') {
            showNotification(`Invoice ${invoice.invoiceNumber} created!`, 'success');
        }
        
        return {
            isAction: true,
            message: `Done! ✅ Created invoice ${invoice.invoiceNumber} for ${action.customer} - RM${amount.toFixed(2)} 📄`
        };
    } catch (e) {
        console.error('Error creating invoice:', e);
        return { isAction: true, message: `Oops! Couldn't create invoice: ${e.message}` };
    }
}

// Execute: Create Quotation
function executeCreateQuotation(action) {
    try {
        if (!action.customer) {
            return { isAction: true, message: "Need a customer name! Try: 'create quotation for Siti RM1000'" };
        }
        
        const amount = parseFloat(action.amount) || 0;
        const quotation = {
            id: 'QT_' + Date.now(),
            quotationNumber: `QT-${Date.now().toString().slice(-6)}`,
            customer: action.customer,
            customerName: action.customer,
            items: action.items || [{ description: action.description || 'Service', quantity: 1, price: amount }],
            subtotal: amount,
            tax: amount * 0.06,
            total: amount * 1.06,
            status: action.status || 'draft',
            validUntil: action.validUntil || new Date(Date.now() + 14*24*60*60*1000).toISOString().split('T')[0],
            createdAt: new Date().toISOString(),
            notes: action.notes || 'Created via AI'
        };
        
        // Add to quotations array (same pattern as quotations.js)
        if (!window.quotations) window.quotations = [];
        window.quotations.push(quotation);
        
        // Use proper save function if available, else direct localStorage
        if (typeof saveQuotations === 'function') {
            saveQuotations();
        } else {
            localStorage.setItem('ezcubic_quotations', JSON.stringify(window.quotations));
            // Also save to tenant
            const user = window.currentUser;
            if (user && user.tenantId) {
                const tenantKey = 'ezcubic_tenant_' + user.tenantId;
                let tenantData = JSON.parse(localStorage.getItem(tenantKey) || '{}');
                tenantData.quotations = window.quotations;
                tenantData.updatedAt = new Date().toISOString();
                localStorage.setItem(tenantKey, JSON.stringify(tenantData));
            }
        }
        
        // Refresh the UI
        if (typeof renderQuotations === 'function') renderQuotations();
        if (typeof showNotification === 'function') {
            showNotification(`Quotation ${quotation.quotationNumber} created!`, 'success');
        }
        
        return {
            isAction: true,
            message: `Done! ✅ Created quotation ${quotation.quotationNumber} for ${action.customer} - RM${amount.toFixed(2)} 📋`
        };
    } catch (e) {
        console.error('Error creating quotation:', e);
        return { isAction: true, message: `Oops! Couldn't create quotation: ${e.message}` };
    }
}

// Execute: Stock In (receive inventory)
function executeStockIn(action) {
    try {
        if (!action.product) {
            return { isAction: true, message: "Need a product name! Try: 'stock in 50 units of Widget A'" };
        }
        
        const quantity = parseInt(action.quantity) || 1;
        
        // Get products from window.products (same pattern as inventory.js)
        const productsList = window.products || [];
        
        if (productsList.length === 0) {
            return { isAction: true, message: "No products found. Add some products first! 📦" };
        }
        
        // Find product by name (case insensitive)
        const product = productsList.find(p => 
            p.name?.toLowerCase().includes(action.product.toLowerCase())
        );
        
        if (product) {
            product.quantity = (product.quantity || 0) + quantity;
            
            // Use proper save function if available
            if (typeof saveProducts === 'function') {
                saveProducts();
            } else {
                localStorage.setItem('ezcubic_products', JSON.stringify(window.products));
                const user = window.currentUser;
                if (user && user.tenantId) {
                    const tenantKey = 'ezcubic_tenant_' + user.tenantId;
                    let tenantData = JSON.parse(localStorage.getItem(tenantKey) || '{}');
                    tenantData.products = window.products;
                    tenantData.updatedAt = new Date().toISOString();
                    localStorage.setItem(tenantKey, JSON.stringify(tenantData));
                }
            }
            
            if (typeof renderProducts === 'function') renderProducts();
            if (typeof renderInventory === 'function') renderInventory();
            
            return {
                isAction: true,
                message: `Done! ✅ Added ${quantity} units to "${product.name}" (now: ${product.quantity}) 📦⬆️`
            };
        } else {
            return {
                isAction: true,
                message: `Couldn't find product "${action.product}". Want me to add it first?`
            };
        }
    } catch (e) {
        console.error('Error with stock in:', e);
        return { isAction: true, message: `Oops! Stock in failed: ${e.message}` };
    }
}

// Execute: Stock Out (reduce inventory)
function executeStockOut(action) {
    try {
        if (!action.product) {
            return { isAction: true, message: "Need a product name! Try: 'stock out 10 units of Widget A'" };
        }
        
        const quantity = parseInt(action.quantity) || 1;
        
        // Get products from window.products (same pattern as inventory.js)
        const productsList = window.products || [];
        
        if (productsList.length === 0) {
            return { isAction: true, message: "No products found. Add some products first! 📦" };
        }
        
        // Find product by name (case insensitive)
        const product = productsList.find(p => 
            p.name?.toLowerCase().includes(action.product.toLowerCase())
        );
        
        if (product) {
            const currentQty = product.quantity || 0;
            if (currentQty < quantity) {
                return {
                    isAction: true,
                    message: `⚠️ Not enough stock! "${product.name}" only has ${currentQty} units.`
                };
            }
            
            product.quantity = currentQty - quantity;
            
            // Use proper save function if available
            if (typeof saveProducts === 'function') {
                saveProducts();
            } else {
                localStorage.setItem('ezcubic_products', JSON.stringify(window.products));
                const user = window.currentUser;
                if (user && user.tenantId) {
                    const tenantKey = 'ezcubic_tenant_' + user.tenantId;
                    let tenantData = JSON.parse(localStorage.getItem(tenantKey) || '{}');
                    tenantData.products = window.products;
                    tenantData.updatedAt = new Date().toISOString();
                    localStorage.setItem(tenantKey, JSON.stringify(tenantData));
                }
            }
            
            if (typeof renderProducts === 'function') renderProducts();
            if (typeof renderInventory === 'function') renderInventory();
            
            return {
                isAction: true,
                message: `Done! ✅ Removed ${quantity} units from "${product.name}" (now: ${product.quantity}) 📦⬇️`
            };
        } else {
            return {
                isAction: true,
                message: `Couldn't find product "${action.product}". Check inventory?`
            };
        }
    } catch (e) {
        console.error('Error with stock out:', e);
        return { isAction: true, message: `Oops! Stock out failed: ${e.message}` };
    }
}

// Execute: Create Order (purchase order)
function executeCreateOrder(action) {
    try {
        if (!action.supplier && !action.product) {
            return { isAction: true, message: "Need details! Try: 'create order for 100 widgets from ABC Supply'" };
        }
        
        const quantity = parseInt(action.quantity) || 1;
        const amount = parseFloat(action.amount) || 0;
        
        const order = {
            id: 'PO_' + Date.now(),
            poNumber: `PO-${Date.now().toString().slice(-6)}`,
            orderNumber: `PO-${Date.now().toString().slice(-6)}`,
            supplier: action.supplier || 'General Supplier',
            supplierName: action.supplier || 'General Supplier',
            items: [{
                product: action.product || 'Various Items',
                quantity: quantity,
                unitPrice: amount / quantity || 0
            }],
            total: amount,
            status: action.status || 'pending',
            expectedDate: action.expectedDate || new Date(Date.now() + 7*24*60*60*1000).toISOString().split('T')[0],
            createdAt: new Date().toISOString(),
            notes: action.notes || 'Created via AI'
        };
        
        // Add to purchaseOrders array (same pattern as purchase-orders.js)
        if (!window.purchaseOrders) window.purchaseOrders = [];
        window.purchaseOrders.push(order);
        
        // Use proper save function if available
        if (typeof savePurchaseOrders === 'function') {
            savePurchaseOrders();
        } else {
            localStorage.setItem('ezcubic_purchaseOrders', JSON.stringify(window.purchaseOrders));
            const user = window.currentUser;
            if (user && user.tenantId) {
                const tenantKey = 'ezcubic_tenant_' + user.tenantId;
                let tenantData = JSON.parse(localStorage.getItem(tenantKey) || '{}');
                tenantData.purchaseOrders = window.purchaseOrders;
                tenantData.updatedAt = new Date().toISOString();
                localStorage.setItem(tenantKey, JSON.stringify(tenantData));
            }
        }
        
        // Refresh the UI
        if (typeof renderPurchaseOrders === 'function') renderPurchaseOrders();
        if (typeof showNotification === 'function') {
            showNotification(`Purchase Order ${order.poNumber} created!`, 'success');
        }
        
        return {
            isAction: true,
            message: `Done! ✅ Created PO ${order.poNumber} - ${quantity}x ${action.product || 'items'} from ${order.supplier} 📝`
        };
    } catch (e) {
        console.error('Error creating order:', e);
        return { isAction: true, message: `Oops! Couldn't create order: ${e.message}` };
    }
}

// Execute: Add Bill
function executeAddBill(action) {
    try {
        if (!action.name && !action.description) {
            return { isAction: true, message: "Need a bill name! Try: 'add bill electricity RM500 due 15th'" };
        }
        
        const amount = parseFloat(action.amount) || 0;
        
        // Parse due date
        let dueDate = action.dueDate;
        if (!dueDate) {
            // Default to end of current month
            const now = new Date();
            dueDate = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
        } else if (typeof dueDate === 'string' && !dueDate.includes('-')) {
            // If just a day number like "15th", set to current month
            const day = parseInt(dueDate.replace(/\D/g, ''));
            if (day > 0 && day <= 31) {
                const now = new Date();
                dueDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            }
        }
        
        // Match the structure from bills.js saveBill()
        const bill = {
            id: 'BILL_' + Date.now(),
            name: action.name || action.description || 'Bill',
            amount: amount,
            dueDate: dueDate,
            category: action.category || 'Utilities',
            vendor: action.vendor || 'Unknown',
            status: 'pending',
            createdAt: new Date().toISOString(),
            isRecurring: action.recurring || false,
            recurringFrequency: null,
            recurringEndDate: null,
            lastGeneratedDate: null
        };
        
        // Use global businessData (same as bills.js)
        if (typeof businessData !== 'undefined') {
            if (!businessData.bills) businessData.bills = [];
            businessData.bills.push(bill);
        } else if (window.businessData) {
            if (!window.businessData.bills) window.businessData.bills = [];
            window.businessData.bills.push(bill);
        }
        
        saveData();
        
        // Reload bills list (same as bills.js does)
        if (typeof loadBills === 'function') loadBills();
        
        const dueDateFormatted = new Date(dueDate).toLocaleDateString('en-MY', { day: 'numeric', month: 'short' });
        
        return {
            isAction: true,
            message: `Done! ✅ Added bill: ${bill.name} RM${amount.toFixed(2)} due ${dueDateFormatted} 📋`
        };
    } catch (e) {
        console.error('Error adding bill:', e);
        return { isAction: true, message: `Oops! Couldn't add bill: ${e.message}` };
    }
}

// Execute: Create BOM (Bill of Materials)
function executeCreateBOM(action) {
    try {
        if (!action.name) {
            return { isAction: true, message: "Need a BOM name! Try: 'create BOM for Wooden Chair'" };
        }
        
        const bom = {
            id: 'bom_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
            name: action.name,
            description: action.description || '',
            productId: action.productId || null,
            outputQuantity: parseInt(action.outputQuantity) || 1,
            components: action.components || [],
            laborCost: parseFloat(action.laborCost) || 0,
            overheadCost: parseFloat(action.overheadCost) || 0,
            notes: action.notes || 'Created via AI Assistant',
            status: action.status || 'active',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            createdBy: window.currentUser?.name || 'AI Assistant'
        };
        
        // Add to billOfMaterials array (same pattern as bom.js)
        if (!window.billOfMaterials) window.billOfMaterials = [];
        window.billOfMaterials.push(bom);
        
        // Use proper save function if available
        if (typeof saveBOMData === 'function') {
            saveBOMData();
        } else {
            localStorage.setItem('ezcubic_bom', JSON.stringify(window.billOfMaterials));
            const user = window.currentUser;
            if (user && user.tenantId) {
                const tenantKey = 'ezcubic_tenant_' + user.tenantId;
                let tenantData = JSON.parse(localStorage.getItem(tenantKey) || '{}');
                tenantData.billOfMaterials = window.billOfMaterials;
                tenantData.updatedAt = new Date().toISOString();
                localStorage.setItem(tenantKey, JSON.stringify(tenantData));
            }
        }
        
        // Refresh UI
        if (typeof renderBOMList === 'function') renderBOMList();
        if (typeof showNotification === 'function') {
            showNotification(`BOM "${action.name}" created!`, 'success');
        }
        
        return {
            isAction: true,
            message: `Done! ✅ Created BOM: "${action.name}" 🏭\nYou can add components in the BOM section.`
        };
    } catch (e) {
        console.error('Error creating BOM:', e);
        return { isAction: true, message: `Oops! Couldn't create BOM: ${e.message}` };
    }
}

// Execute: Create Project
function executeCreateProject(action) {
    try {
        if (!action.name && !action.customer) {
            return { isAction: true, message: "Need project details! Try: 'create project Kitchen Renovation for Ahmad RM50000'" };
        }
        
        const amount = parseFloat(action.amount) || 0;
        const projectNo = `PRJ-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}-${Date.now().toString().slice(-4)}`;
        
        const project = {
            id: 'proj_' + Date.now(),
            projectNo: projectNo,
            name: action.name || `Project for ${action.customer}`,
            customerId: action.customerId || null,
            customerName: action.customer || 'General Customer',
            description: action.description || '',
            totalAmount: amount,
            amountPaid: 0,
            status: action.status || 'quotation',
            startDate: action.startDate || new Date().toISOString().split('T')[0],
            endDate: action.endDate || null,
            salesperson: action.salesperson || window.currentUser?.name || '',
            milestones: action.milestones || [
                { name: 'Deposit', percentage: 30, amount: amount * 0.30, status: 'pending', dueDate: '' },
                { name: 'Progress Payment', percentage: 40, amount: amount * 0.40, status: 'pending', dueDate: '' },
                { name: 'Final Payment', percentage: 30, amount: amount * 0.30, status: 'pending', dueDate: '' }
            ],
            payments: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        
        // Add to projects array (same pattern as projects.js)
        if (!window.projects) window.projects = [];
        window.projects.push(project);
        
        // Use proper save function if available
        if (typeof saveProjects === 'function') {
            saveProjects();
        } else {
            localStorage.setItem('ezcubic_projects', JSON.stringify(window.projects));
            const user = window.currentUser;
            if (user && user.tenantId) {
                const tenantKey = 'ezcubic_tenant_' + user.tenantId;
                let tenantData = JSON.parse(localStorage.getItem(tenantKey) || '{}');
                tenantData.projects = window.projects;
                tenantData.updatedAt = new Date().toISOString();
                localStorage.setItem(tenantKey, JSON.stringify(tenantData));
            }
        }
        
        // Refresh UI
        if (typeof renderProjects === 'function') renderProjects();
        if (typeof updateProjectStats === 'function') updateProjectStats();
        if (typeof showNotification === 'function') {
            showNotification(`Project "${project.name}" created!`, 'success');
        }
        
        return {
            isAction: true,
            message: `Done! ✅ Created project ${projectNo}: "${project.name}" for ${project.customerName} - RM${amount.toFixed(2)} 📋\n\nMilestones:\n• Deposit (30%): RM${(amount * 0.30).toFixed(2)}\n• Progress (40%): RM${(amount * 0.40).toFixed(2)}\n• Final (30%): RM${(amount * 0.30).toFixed(2)}`
        };
    } catch (e) {
        console.error('Error creating project:', e);
        return { isAction: true, message: `Oops! Couldn't create project: ${e.message}` };
    }
}

// Execute: Create Delivery Order
function executeCreateDeliveryOrder(action) {
    try {
        if (!action.customer && !action.supplier) {
            return { isAction: true, message: "Need details! Try: 'create delivery order for Ahmad' or 'create incoming DO from ABC Supply'" };
        }
        
        const type = action.supplier ? 'incoming' : 'outgoing';
        const doNumber = `DO-${Date.now().toString().slice(-6)}`;
        
        const deliveryOrder = {
            id: 'do_' + Date.now(),
            doNumber: doNumber,
            type: type,
            date: action.date || new Date().toISOString().split('T')[0],
            customerId: type === 'outgoing' ? (action.customerId || null) : null,
            customerName: type === 'outgoing' ? (action.customer || null) : null,
            supplierId: type === 'incoming' ? (action.supplierId || null) : null,
            supplierName: type === 'incoming' ? (action.supplier || null) : null,
            referenceType: action.referenceType || (action.invoiceNo ? 'Invoice' : action.poNumber ? 'PO' : ''),
            referenceNumber: action.referenceNumber || action.invoiceNo || action.poNumber || '',
            address: action.address || '',
            items: action.items || [{ description: action.item || 'Items', quantity: parseInt(action.quantity) || 1 }],
            notes: action.notes || 'Created via AI Assistant',
            status: 'draft',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        
        // Add to deliveryOrders array (same pattern as delivery-orders.js)
        if (!window.deliveryOrders) window.deliveryOrders = [];
        window.deliveryOrders.push(deliveryOrder);
        
        // Use proper save function if available
        if (typeof saveDeliveryOrders === 'function') {
            saveDeliveryOrders();
        } else {
            localStorage.setItem('ezcubic_delivery_orders', JSON.stringify(window.deliveryOrders));
            const user = window.currentUser;
            if (user && user.tenantId) {
                const tenantKey = 'ezcubic_tenant_' + user.tenantId;
                let tenantData = JSON.parse(localStorage.getItem(tenantKey) || '{}');
                tenantData.deliveryOrders = window.deliveryOrders;
                tenantData.updatedAt = new Date().toISOString();
                localStorage.setItem(tenantKey, JSON.stringify(tenantData));
            }
        }
        
        // Refresh UI
        if (typeof renderDeliveryOrdersList === 'function') renderDeliveryOrdersList();
        if (typeof updateDOStats === 'function') updateDOStats();
        if (typeof showNotification === 'function') {
            showNotification(`Delivery Order ${doNumber} created!`, 'success');
        }
        
        const recipient = type === 'outgoing' ? action.customer : action.supplier;
        return {
            isAction: true,
            message: `Done! ✅ Created ${type === 'outgoing' ? 'outgoing' : 'incoming'} DO ${doNumber} for ${recipient} 🚚\nStatus: Draft - Ready for confirmation.`
        };
    } catch (e) {
        console.error('Error creating delivery order:', e);
        return { isAction: true, message: `Oops! Couldn't create delivery order: ${e.message}` };
    }
}

// Execute: Add Employee (Payroll)
function executeAddEmployee(action) {
    try {
        if (!action.name) {
            return { isAction: true, message: "Need employee name! Try: 'add employee Ahmad salary RM3000'" };
        }
        
        const employee = {
            id: 'emp_' + Date.now(),
            name: action.name,
            ic: action.ic || '',
            email: action.email || '',
            phone: action.phone || '',
            department: action.department || 'General',
            position: action.position || 'Staff',
            employmentType: action.type || 'full-time',
            startDate: action.startDate || new Date().toISOString().split('T')[0],
            basicSalary: parseFloat(action.salary) || parseFloat(action.amount) || 0,
            bankName: action.bank || '',
            bankAccount: action.bankAccount || '',
            hasEPF: true,
            hasSOCSO: true,
            hasEIS: true,
            hasPCB: true,
            status: 'active',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        
        // Add to employees array
        if (!window.employees) window.employees = [];
        window.employees.push(employee);
        
        // Save
        if (typeof saveEmployeesData === 'function') {
            saveEmployeesData();
        } else {
            localStorage.setItem('ezcubic_employees', JSON.stringify(window.employees));
            const user = window.currentUser;
            if (user && user.tenantId) {
                const tenantKey = 'ezcubic_tenant_' + user.tenantId;
                let tenantData = JSON.parse(localStorage.getItem(tenantKey) || '{}');
                tenantData.employees = window.employees;
                tenantData.updatedAt = new Date().toISOString();
                localStorage.setItem(tenantKey, JSON.stringify(tenantData));
            }
        }
        
        // Refresh UI
        if (typeof loadEmployees === 'function') loadEmployees();
        if (typeof updatePayrollStats === 'function') updatePayrollStats();
        
        const salaryStr = employee.basicSalary > 0 ? ` with salary RM${employee.basicSalary.toLocaleString()}` : '';
        return {
            isAction: true,
            message: `Done! ✅ Added employee: ${employee.name}${salaryStr} 👤\nDepartment: ${employee.department} | Position: ${employee.position}`
        };
    } catch (e) {
        console.error('Error adding employee:', e);
        return { isAction: true, message: `Oops! Couldn't add employee: ${e.message}` };
    }
}

// Execute: Create KPI Template
function executeCreateKPI(action) {
    try {
        if (!action.name && !action.title) {
            return { isAction: true, message: "Need KPI name! Try: 'create KPI Sales Target RM10000'" };
        }
        
        const kpiTemplate = {
            id: 'kpi_' + Date.now(),
            name: action.name || action.title,
            description: action.description || `KPI for ${action.name || action.title}`,
            category: action.category || 'Performance',
            metric: action.metric || 'value',
            targetValue: parseFloat(action.target) || parseFloat(action.amount) || parseFloat(action.value) || 100,
            unit: action.unit || (action.amount ? 'RM' : '%'),
            frequency: action.frequency || 'monthly',
            weight: parseFloat(action.weight) || 100,
            status: 'active',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        
        // Add to kpiTemplates array
        if (!window.kpiTemplates) window.kpiTemplates = [];
        window.kpiTemplates.push(kpiTemplate);
        
        // Save
        if (typeof saveKPITemplates === 'function') {
            saveKPITemplates();
        } else {
            localStorage.setItem('ezcubic_kpi_templates', JSON.stringify(window.kpiTemplates));
            const user = window.currentUser;
            if (user && user.tenantId) {
                const tenantKey = 'ezcubic_tenant_' + user.tenantId;
                let tenantData = JSON.parse(localStorage.getItem(tenantKey) || '{}');
                tenantData.kpiTemplates = window.kpiTemplates;
                tenantData.updatedAt = new Date().toISOString();
                localStorage.setItem(tenantKey, JSON.stringify(tenantData));
            }
        }
        
        // Refresh UI
        if (typeof loadKPITemplates === 'function') loadKPITemplates();
        if (typeof updateKPIStats === 'function') updateKPIStats();
        
        return {
            isAction: true,
            message: `Done! ✅ Created KPI: ${kpiTemplate.name} 🎯\nTarget: ${kpiTemplate.unit === 'RM' ? 'RM' : ''}${kpiTemplate.targetValue.toLocaleString()}${kpiTemplate.unit === '%' ? '%' : ''} | Frequency: ${kpiTemplate.frequency}`
        };
    } catch (e) {
        console.error('Error creating KPI:', e);
        return { isAction: true, message: `Oops! Couldn't create KPI: ${e.message}` };
    }
}

// Execute: Add Branch
function executeAddBranch(action) {
    try {
        if (!action.name) {
            return { isAction: true, message: "Need branch name! Try: 'add branch Penang outlet'" };
        }
        
        const branchCode = (action.code || action.name.substring(0, 3).toUpperCase() + '_' + Date.now().toString().slice(-4));
        
        const branch = {
            id: 'branch_' + Date.now(),
            code: branchCode,
            name: action.name,
            address: action.address || '',
            phone: action.phone || '',
            email: action.email || '',
            manager: action.manager || '',
            type: action.type || 'outlet',
            status: 'active',
            isDefault: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        
        // Add to branches array
        if (!window.branches) window.branches = [];
        window.branches.push(branch);
        
        // Save
        if (typeof saveBranchData === 'function') {
            saveBranchData();
        } else {
            localStorage.setItem('ezcubic_branches', JSON.stringify(window.branches));
            const user = window.currentUser;
            if (user && user.tenantId) {
                const tenantKey = 'ezcubic_tenant_' + user.tenantId;
                let tenantData = JSON.parse(localStorage.getItem(tenantKey) || '{}');
                tenantData.branches = window.branches;
                tenantData.updatedAt = new Date().toISOString();
                localStorage.setItem(tenantKey, JSON.stringify(tenantData));
            }
        }
        
        // Refresh UI
        if (typeof renderBranches === 'function') renderBranches();
        if (typeof updateBranchStats === 'function') updateBranchStats();
        if (typeof renderBranchSelector === 'function') renderBranchSelector();
        
        return {
            isAction: true,
            message: `Done! ✅ Added branch: ${branch.name} 🏢\nCode: ${branch.code} | Type: ${branch.type}`
        };
    } catch (e) {
        console.error('Error adding branch:', e);
        return { isAction: true, message: `Oops! Couldn't add branch: ${e.message}` };
    }
}

// Execute: Stock Transfer between branches
function executeStockTransfer(action) {
    try {
        if (!action.product && !action.item) {
            return { isAction: true, message: "Need product to transfer! Try: 'transfer 10 iPhone to Penang branch'" };
        }
        
        const productName = action.product || action.item;
        const quantity = parseInt(action.quantity) || parseInt(action.amount) || 1;
        const toBranch = action.to || action.branch || action.destination;
        const fromBranch = action.from || 'HQ';
        
        // Find product
        const products = window.products || [];
        const product = products.find(p => 
            p.name?.toLowerCase().includes(productName.toLowerCase()) ||
            p.sku?.toLowerCase().includes(productName.toLowerCase())
        );
        
        if (!product) {
            return { isAction: true, message: `Couldn't find product "${productName}". Check inventory.` };
        }
        
        // Find branches
        const branches = window.branches || [];
        const sourceBranch = branches.find(b => b.name?.toLowerCase().includes(fromBranch.toLowerCase()) || b.code?.toLowerCase().includes(fromBranch.toLowerCase())) || { id: 'BRANCH_HQ', name: 'HQ' };
        const destBranch = branches.find(b => b.name?.toLowerCase().includes(toBranch?.toLowerCase()) || b.code?.toLowerCase().includes(toBranch?.toLowerCase()));
        
        if (!destBranch) {
            return { isAction: true, message: `Couldn't find destination branch "${toBranch}". Check branch list.` };
        }
        
        const transfer = {
            id: 'transfer_' + Date.now(),
            transferNumber: 'TRF-' + Date.now().toString().slice(-6),
            productId: product.id,
            productName: product.name,
            productSku: product.sku,
            quantity: quantity,
            fromBranchId: sourceBranch.id,
            fromBranchName: sourceBranch.name,
            toBranchId: destBranch.id,
            toBranchName: destBranch.name,
            status: 'pending',
            notes: action.notes || 'Created via AI Assistant',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        
        // Add to transfers array
        if (!window.branchTransfers) window.branchTransfers = [];
        window.branchTransfers.push(transfer);
        
        // Save
        if (typeof saveBranchData === 'function') {
            saveBranchData();
        } else {
            localStorage.setItem('ezcubic_branch_transfers', JSON.stringify(window.branchTransfers));
        }
        
        // Refresh UI
        if (typeof renderTransfers === 'function') renderTransfers();
        
        return {
            isAction: true,
            message: `Done! ✅ Stock transfer created: ${transfer.transferNumber} 📦\n${quantity}x ${product.name}\nFrom: ${sourceBranch.name} → To: ${destBranch.name}\nStatus: Pending approval`
        };
    } catch (e) {
        console.error('Error creating transfer:', e);
        return { isAction: true, message: `Oops! Couldn't create transfer: ${e.message}` };
    }
}

// Execute: Create Journal Entry
function executeCreateJournalEntry(action) {
    try {
        if (!action.debit && !action.credit) {
            return { isAction: true, message: "Need debit and credit accounts! Try: 'journal entry debit Cash RM1000 credit Sales RM1000'" };
        }
        
        const amount = parseFloat(action.amount) || parseFloat(action.debitAmount) || parseFloat(action.creditAmount) || 0;
        const journalNumber = 'JE-' + Date.now().toString().slice(-6);
        
        const journalEntry = {
            id: 'je_' + Date.now(),
            journalNumber: journalNumber,
            date: action.date || new Date().toISOString().split('T')[0],
            type: action.type || 'general',
            description: action.description || action.memo || 'Journal Entry',
            lines: [
                {
                    id: 'line_' + Date.now() + '_1',
                    accountCode: action.debitCode || '',
                    accountName: action.debit || 'Debit Account',
                    debit: amount,
                    credit: 0,
                    description: action.debitDesc || ''
                },
                {
                    id: 'line_' + Date.now() + '_2',
                    accountCode: action.creditCode || '',
                    accountName: action.credit || 'Credit Account',
                    debit: 0,
                    credit: amount,
                    description: action.creditDesc || ''
                }
            ],
            totalDebit: amount,
            totalCredit: amount,
            status: 'draft',
            reference: action.reference || '',
            createdBy: window.currentUser?.name || 'AI Assistant',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        
        // Add to journal entries array
        if (!window.journalEntries) window.journalEntries = [];
        window.journalEntries.push(journalEntry);
        
        // Save
        if (typeof saveJournalEntries === 'function') {
            saveJournalEntries();
        } else {
            localStorage.setItem('ezcubic_journal_entries', JSON.stringify(window.journalEntries));
            const user = window.currentUser;
            if (user && user.tenantId) {
                const tenantKey = 'ezcubic_tenant_' + user.tenantId;
                let tenantData = JSON.parse(localStorage.getItem(tenantKey) || '{}');
                tenantData.journalEntries = window.journalEntries;
                tenantData.updatedAt = new Date().toISOString();
                localStorage.setItem(tenantKey, JSON.stringify(tenantData));
            }
        }
        
        // Refresh UI
        if (typeof renderJournalEntries === 'function') renderJournalEntries();
        
        return {
            isAction: true,
            message: `Done! ✅ Journal Entry ${journalNumber} created 📒\nDr. ${action.debit}: RM${amount.toLocaleString()}\nCr. ${action.credit}: RM${amount.toLocaleString()}\nStatus: Draft`
        };
    } catch (e) {
        console.error('Error creating journal entry:', e);
        return { isAction: true, message: `Oops! Couldn't create journal entry: ${e.message}` };
    }
}

// Execute: Apply Leave
function executeApplyLeave(action) {
    try {
        if (!action.employee && !action.name) {
            return { isAction: true, message: "Need employee name! Try: 'apply leave for Ahmad from Jan 5 to Jan 7'" };
        }
        
        const employeeName = action.employee || action.name;
        
        // Find employee
        const employees = window.employees || [];
        const employee = employees.find(e => 
            e.name?.toLowerCase().includes(employeeName.toLowerCase())
        );
        
        const startDate = action.startDate || action.from || action.date || new Date().toISOString().split('T')[0];
        const endDate = action.endDate || action.to || startDate;
        
        // Calculate days
        const start = new Date(startDate);
        const end = new Date(endDate);
        const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
        
        const leaveRequest = {
            id: 'leave_' + Date.now(),
            employeeId: employee?.id || null,
            employeeName: employee?.name || employeeName,
            leaveType: action.type || 'annual',
            startDate: startDate,
            endDate: endDate,
            days: days,
            reason: action.reason || 'Applied via AI Assistant',
            status: 'pending',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        
        // Add to leave requests
        if (!window.leaveRequests) window.leaveRequests = [];
        window.leaveRequests.push(leaveRequest);
        
        // Save
        localStorage.setItem('ezcubic_leave_requests', JSON.stringify(window.leaveRequests));
        const user = window.currentUser;
        if (user && user.tenantId) {
            const tenantKey = 'ezcubic_tenant_' + user.tenantId;
            let tenantData = JSON.parse(localStorage.getItem(tenantKey) || '{}');
            tenantData.leaveRequests = window.leaveRequests;
            tenantData.updatedAt = new Date().toISOString();
            localStorage.setItem(tenantKey, JSON.stringify(tenantData));
        }
        
        // Refresh UI
        if (typeof loadLeaveRequests === 'function') loadLeaveRequests();
        if (typeof updateLeaveStats === 'function') updateLeaveStats();
        
        const leaveTypeNames = {
            annual: 'Annual Leave',
            medical: 'Medical Leave',
            maternity: 'Maternity Leave',
            paternity: 'Paternity Leave',
            unpaid: 'Unpaid Leave',
            emergency: 'Emergency Leave'
        };
        
        return {
            isAction: true,
            message: `Done! ✅ Leave request submitted 📅\nEmployee: ${leaveRequest.employeeName}\nType: ${leaveTypeNames[leaveRequest.leaveType] || leaveRequest.leaveType}\nDuration: ${startDate} to ${endDate} (${days} day${days > 1 ? 's' : ''})\nStatus: Pending approval`
        };
    } catch (e) {
        console.error('Error applying leave:', e);
        return { isAction: true, message: `Oops! Couldn't apply leave: ${e.message}` };
    }
}

// Execute: POS Quick Sale
function executePOSSale(action) {
    try {
        const amount = parseFloat(action.amount) || parseFloat(action.total) || 0;
        const paymentMethod = action.payment || action.method || 'cash';
        
        if (amount <= 0 && !action.items && !action.product) {
            return { isAction: true, message: "Need sale amount or items! Try: 'sale RM150 cash' or 'sell 2 coffee'" };
        }
        
        const saleNumber = 'POS-' + Date.now().toString().slice(-6);
        let items = [];
        let totalAmount = amount;
        
        // If product specified, find it
        if (action.product || action.item) {
            const productName = action.product || action.item;
            const products = window.products || [];
            const product = products.find(p => 
                p.name?.toLowerCase().includes(productName.toLowerCase())
            );
            
            if (product) {
                const qty = parseInt(action.quantity) || 1;
                items.push({
                    productId: product.id,
                    name: product.name,
                    sku: product.sku,
                    quantity: qty,
                    price: product.price,
                    total: product.price * qty
                });
                totalAmount = product.price * qty;
            }
        }
        
        // If no items but amount given, create generic item
        if (items.length === 0 && totalAmount > 0) {
            items.push({
                productId: null,
                name: 'Quick Sale',
                quantity: 1,
                price: totalAmount,
                total: totalAmount
            });
        }
        
        const sale = {
            id: 'sale_' + Date.now(),
            saleNumber: saleNumber,
            date: new Date().toISOString(),
            items: items,
            subtotal: totalAmount,
            tax: 0,
            discount: parseFloat(action.discount) || 0,
            total: totalAmount - (parseFloat(action.discount) || 0),
            paymentMethod: paymentMethod,
            amountPaid: totalAmount,
            change: 0,
            customerId: action.customerId || null,
            customerName: action.customer || 'Walk-in',
            cashierId: window.currentUser?.id || null,
            cashierName: window.currentUser?.name || 'POS',
            status: 'completed',
            createdAt: new Date().toISOString()
        };
        
        // Add to sales
        if (!window.sales) window.sales = [];
        window.sales.push(sale);
        
        // Save
        if (typeof saveSales === 'function') {
            saveSales();
        } else {
            localStorage.setItem('ezcubic_sales', JSON.stringify(window.sales));
            const user = window.currentUser;
            if (user && user.tenantId) {
                const tenantKey = 'ezcubic_tenant_' + user.tenantId;
                let tenantData = JSON.parse(localStorage.getItem(tenantKey) || '{}');
                tenantData.sales = window.sales;
                tenantData.updatedAt = new Date().toISOString();
                localStorage.setItem(tenantKey, JSON.stringify(tenantData));
            }
        }
        
        // Deduct stock if product sold
        if (items.length > 0 && items[0].productId) {
            const products = window.products || [];
            const product = products.find(p => p.id === items[0].productId);
            if (product) {
                product.stock = (product.stock || 0) - items[0].quantity;
                if (typeof saveProducts === 'function') saveProducts();
            }
        }
        
        // Refresh UI
        if (typeof renderSalesHistory === 'function') renderSalesHistory();
        if (typeof updatePOSStats === 'function') updatePOSStats();
        
        const paymentLabels = { cash: '💵 Cash', card: '💳 Card', ewallet: '📱 E-Wallet', qr: '📱 QR' };
        
        return {
            isAction: true,
            message: `Done! ✅ Sale completed: ${saleNumber} 🧾\nTotal: RM${sale.total.toLocaleString()}\nPayment: ${paymentLabels[paymentMethod] || paymentMethod}\nCustomer: ${sale.customerName}`
        };
    } catch (e) {
        console.error('Error creating sale:', e);
        return { isAction: true, message: `Oops! Couldn't create sale: ${e.message}` };
    }
}

// Execute: Search/Find
function executeSearch(action) {
    try {
        const type = action.type?.toLowerCase() || '';
        const filter = action.filter?.toLowerCase() || 'all';
        const value = action.value || '';
        let results = [];
        let message = '';
        
        const today = new Date().toISOString().split('T')[0];
        const thisMonth = today.slice(0, 7);
        
        if (type === 'invoices' || type === 'invoice') {
            // Use window.invoices (same as invoices.js)
            const invoices = window.invoices || [];
            
            if (filter === 'unpaid' || filter === 'pending') {
                results = invoices.filter(i => i.status === 'pending' || i.status === 'unpaid');
                message = results.length > 0 
                    ? `Found ${results.length} unpaid invoice(s):\n${results.slice(0, 5).map(i => `• ${i.invoiceNumber || i.id} - ${i.customer || i.customerName} RM${i.total?.toFixed(2) || i.amount?.toFixed(2)}`).join('\n')}`
                    : `No unpaid invoices found! 🎉`;
            } else if (filter === 'customer' && value) {
                results = invoices.filter(i => (i.customer || i.customerName)?.toLowerCase().includes(value.toLowerCase()));
                message = results.length > 0
                    ? `Found ${results.length} invoice(s) for "${value}":\n${results.slice(0, 5).map(i => `• ${i.invoiceNumber || i.id} - RM${i.total?.toFixed(2) || i.amount?.toFixed(2)} (${i.status})`).join('\n')}`
                    : `No invoices found for "${value}"`;
            } else if (filter === 'paid') {
                results = invoices.filter(i => i.status === 'paid');
                message = `Found ${results.length} paid invoice(s) 💰`;
            } else {
                message = `Total: ${invoices.length} invoices 📄`;
            }
            
        } else if (type === 'customers' || type === 'customer') {
            // Use window.crmCustomers (same as crm.js)
            const customers = window.crmCustomers || [];
            if (value) {
                results = customers.filter(c => c.name?.toLowerCase().includes(value.toLowerCase()));
                message = results.length > 0
                    ? `Found ${results.length} customer(s) matching "${value}":\n${results.slice(0, 5).map(c => `• ${c.name} ${c.phone || ''}`).join('\n')}`
                    : `No customers found matching "${value}"`;
            } else {
                message = `Total: ${customers.length} customers 👥`;
            }
            
        } else if (type === 'products' || type === 'product') {
            // Use window.products (same as inventory.js)
            const products = window.products || [];
            if (filter === 'low_stock' || filter === 'low stock') {
                results = products.filter(p => (p.quantity || 0) < (p.minStock || 10));
                message = results.length > 0
                    ? `⚠️ ${results.length} low stock items:\n${results.slice(0, 5).map(p => `• ${p.name}: ${p.quantity || 0} left`).join('\n')}`
                    : `All products are well stocked! ✅`;
            } else if (value) {
                results = products.filter(p => p.name?.toLowerCase().includes(value.toLowerCase()));
                message = results.length > 0
                    ? `Found:\n${results.slice(0, 5).map(p => `• ${p.name} - RM${p.price?.toFixed(2)} (Stock: ${p.quantity || 0})`).join('\n')}`
                    : `No products found matching "${value}"`;
            } else {
                message = `Total: ${products.length} products 📦`;
            }
            
        } else if (type === 'expenses' || type === 'expense') {
            const transactions = window.businessData?.transactions || [];
            const expenses = transactions.filter(t => t.type === 'expense');
            
            if (filter === 'today') {
                results = expenses.filter(e => e.date === today);
                const total = results.reduce((sum, e) => sum + (e.amount || 0), 0);
                message = `Today's expenses: RM${total.toFixed(2)} (${results.length} items) 💸`;
            } else if (filter === 'this_month' || filter === 'this month') {
                results = expenses.filter(e => e.date?.startsWith(thisMonth));
                const total = results.reduce((sum, e) => sum + (e.amount || 0), 0);
                message = `This month's expenses: RM${total.toFixed(2)} (${results.length} items) 💸`;
            } else {
                const total = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
                message = `Total expenses: RM${total.toFixed(2)} (${expenses.length} items)`;
            }
            
        } else if (type === 'income') {
            const transactions = window.businessData?.transactions || [];
            const income = transactions.filter(t => t.type === 'income');
            
            if (filter === 'today') {
                results = income.filter(i => i.date === today);
                const total = results.reduce((sum, i) => sum + (i.amount || 0), 0);
                message = `Today's income: RM${total.toFixed(2)} (${results.length} items) 💰`;
            } else if (filter === 'this_month' || filter === 'this month') {
                results = income.filter(i => i.date?.startsWith(thisMonth));
                const total = results.reduce((sum, i) => sum + (i.amount || 0), 0);
                message = `This month's income: RM${total.toFixed(2)} (${results.length} items) 💰`;
            } else {
                const total = income.reduce((sum, i) => sum + (i.amount || 0), 0);
                message = `Total income: RM${total.toFixed(2)} (${income.length} items)`;
            }
            
        } else if (type === 'quotations' || type === 'quotation') {
            // Use window.quotations (same as quotations.js)
            const quotations = window.quotations || [];
            if (filter === 'pending' || filter === 'draft') {
                results = quotations.filter(q => q.status === 'draft' || q.status === 'pending');
                message = `Found ${results.length} pending quotation(s) 📋`;
            } else {
                message = `Total: ${quotations.length} quotations 📋`;
            }
            
        } else if (type === 'suppliers' || type === 'supplier') {
            // Use window.suppliers (same as suppliers.js)
            const suppliers = window.suppliers || [];
            if (value) {
                results = suppliers.filter(s => s.name?.toLowerCase().includes(value.toLowerCase()));
                message = results.length > 0
                    ? `Found ${results.length} supplier(s) matching "${value}":\n${results.slice(0, 5).map(s => `• ${s.name} ${s.phone || ''}`).join('\n')}`
                    : `No suppliers found matching "${value}"`;
            } else {
                message = `Total: ${suppliers.length} suppliers 🏭`;
            }
            
        } else if (type === 'bills' || type === 'bill') {
            const bills = (typeof businessData !== 'undefined' ? businessData.bills : window.businessData?.bills) || [];
            
            if (filter === 'unpaid' || filter === 'pending') {
                results = bills.filter(b => b.status === 'unpaid' || b.status === 'pending');
                const total = results.reduce((sum, b) => sum + (b.amount || 0), 0);
                if (results.length > 0) {
                    message = `📋 ${results.length} unpaid bill(s) - Total: RM${total.toFixed(2)}\n${results.slice(0, 5).map(b => `• ${b.name}: RM${b.amount?.toFixed(2)} (due ${b.dueDate || 'N/A'})`).join('\n')}`;
                } else {
                    message = `No unpaid bills! All clear 🎉`;
                }
            } else if (filter === 'due_soon' || filter === 'due soon' || filter === 'due this week') {
                const nextWeek = new Date(Date.now() + 7*24*60*60*1000).toISOString().split('T')[0];
                results = bills.filter(b => (b.status === 'unpaid' || b.status === 'pending') && b.dueDate && b.dueDate <= nextWeek);
                const total = results.reduce((sum, b) => sum + (b.amount || 0), 0);
                if (results.length > 0) {
                    message = `⚠️ ${results.length} bill(s) due soon - Total: RM${total.toFixed(2)}\n${results.map(b => `• ${b.name}: RM${b.amount?.toFixed(2)} (due ${b.dueDate})`).join('\n')}`;
                } else {
                    message = `No bills due this week! 👍`;
                }
            } else if (filter === 'paid') {
                results = bills.filter(b => b.status === 'paid');
                message = `${results.length} paid bill(s) ✅`;
            } else {
                const unpaid = bills.filter(b => b.status !== 'paid');
                const total = unpaid.reduce((sum, b) => sum + (b.amount || 0), 0);
                message = `Total: ${bills.length} bills (${unpaid.length} unpaid - RM${total.toFixed(2)}) 📋`;
            }
            
        } else if (type === 'bom' || type === 'boms' || type === 'bill of materials') {
            // Use window.billOfMaterials (same as bom.js)
            const boms = window.billOfMaterials || [];
            if (filter === 'active') {
                results = boms.filter(b => b.status === 'active');
                message = results.length > 0
                    ? `Found ${results.length} active BOM(s):\n${results.slice(0, 5).map(b => `• ${b.name} (${b.components?.length || 0} components)`).join('\n')}`
                    : `No active BOMs found`;
            } else if (value) {
                results = boms.filter(b => b.name?.toLowerCase().includes(value.toLowerCase()));
                message = results.length > 0
                    ? `Found ${results.length} BOM(s) matching "${value}":\n${results.slice(0, 5).map(b => `• ${b.name}`).join('\n')}`
                    : `No BOMs found matching "${value}"`;
            } else {
                message = `Total: ${boms.length} BOM(s) 🏭`;
            }
            
        } else if (type === 'projects' || type === 'project') {
            // Use window.projects (same as projects.js)
            const projectList = window.projects || [];
            if (filter === 'active' || filter === 'in_progress') {
                results = projectList.filter(p => p.status !== 'completed' && p.status !== 'cancelled');
                const totalValue = results.reduce((sum, p) => sum + (p.totalAmount || 0), 0);
                message = results.length > 0
                    ? `📋 ${results.length} active project(s) - Total: RM${totalValue.toLocaleString()}\n${results.slice(0, 5).map(p => `• ${p.projectNo}: ${p.name} - RM${(p.totalAmount || 0).toLocaleString()}`).join('\n')}`
                    : `No active projects`;
            } else if (filter === 'completed') {
                results = projectList.filter(p => p.status === 'completed');
                message = `${results.length} completed project(s) ✅`;
            } else if (value) {
                results = projectList.filter(p => p.name?.toLowerCase().includes(value.toLowerCase()) || p.customerName?.toLowerCase().includes(value.toLowerCase()));
                message = results.length > 0
                    ? `Found ${results.length} project(s):\n${results.slice(0, 5).map(p => `• ${p.projectNo}: ${p.name} (${p.status})`).join('\n')}`
                    : `No projects found matching "${value}"`;
            } else {
                const totalValue = projectList.reduce((sum, p) => sum + (p.totalAmount || 0), 0);
                message = `Total: ${projectList.length} projects - RM${totalValue.toLocaleString()} 📋`;
            }
            
        } else if (type === 'delivery_orders' || type === 'delivery' || type === 'do') {
            // Use window.deliveryOrders (same as delivery-orders.js)
            const doList = window.deliveryOrders || [];
            if (filter === 'pending' || filter === 'draft') {
                results = doList.filter(d => d.status === 'draft' || d.status === 'confirmed');
                message = results.length > 0
                    ? `📦 ${results.length} pending DO(s):\n${results.slice(0, 5).map(d => `• ${d.doNumber}: ${d.customerName || d.supplierName} (${d.status})`).join('\n')}`
                    : `No pending delivery orders`;
            } else if (filter === 'shipped' || filter === 'in_transit') {
                results = doList.filter(d => d.status === 'shipped' || d.status === 'in_transit');
                message = `${results.length} DO(s) in transit 🚚`;
            } else if (filter === 'delivered') {
                results = doList.filter(d => d.status === 'delivered');
                message = `${results.length} delivered DO(s) ✅`;
            } else {
                message = `Total: ${doList.length} delivery orders 🚚`;
            }
            
        } else if (type === 'employees' || type === 'employee' || type === 'staff') {
            const employees = window.employees || [];
            if (filter === 'active') {
                results = employees.filter(e => e.status === 'active');
                const totalSalary = results.reduce((sum, e) => sum + (e.basicSalary || 0), 0);
                message = results.length > 0
                    ? `👤 ${results.length} active employee(s) - Total salary: RM${totalSalary.toLocaleString()}\n${results.slice(0, 5).map(e => `• ${e.name} - ${e.position || 'Staff'} (RM${(e.basicSalary || 0).toLocaleString()})`).join('\n')}`
                    : `No active employees`;
            } else if (value) {
                results = employees.filter(e => e.name?.toLowerCase().includes(value.toLowerCase()) || e.department?.toLowerCase().includes(value.toLowerCase()));
                message = results.length > 0
                    ? `Found ${results.length} employee(s):\n${results.slice(0, 5).map(e => `• ${e.name} - ${e.department || 'General'}`).join('\n')}`
                    : `No employees found matching "${value}"`;
            } else {
                const totalSalary = employees.reduce((sum, e) => sum + (e.basicSalary || 0), 0);
                message = `Total: ${employees.length} employees - Salary: RM${totalSalary.toLocaleString()}/month 👥`;
            }
            
        } else if (type === 'kpi' || type === 'kpis') {
            const kpis = window.kpiTemplates || [];
            if (filter === 'active') {
                results = kpis.filter(k => k.status === 'active');
                message = results.length > 0
                    ? `🎯 ${results.length} active KPI(s):\n${results.slice(0, 5).map(k => `• ${k.name} - Target: ${k.unit === 'RM' ? 'RM' : ''}${k.targetValue}${k.unit === '%' ? '%' : ''}`).join('\n')}`
                    : `No active KPIs`;
            } else {
                message = `Total: ${kpis.length} KPI template(s) 🎯`;
            }
            
        } else if (type === 'branches' || type === 'branch' || type === 'outlets') {
            const branches = window.branches || [];
            if (filter === 'active') {
                results = branches.filter(b => b.status === 'active');
                message = results.length > 0
                    ? `🏢 ${results.length} active branch(es):\n${results.slice(0, 5).map(b => `• ${b.name} (${b.code}) - ${b.type || 'outlet'}`).join('\n')}`
                    : `No active branches`;
            } else {
                message = `Total: ${branches.length} branch(es) 🏢`;
            }
            
        } else if (type === 'journal' || type === 'journals' || type === 'journal_entries') {
            const journals = window.journalEntries || [];
            if (filter === 'draft') {
                results = journals.filter(j => j.status === 'draft');
                message = results.length > 0
                    ? `📒 ${results.length} draft journal(s):\n${results.slice(0, 5).map(j => `• ${j.journalNumber}: ${j.description} - RM${j.totalDebit?.toLocaleString() || 0}`).join('\n')}`
                    : `No draft journals`;
            } else if (filter === 'posted') {
                results = journals.filter(j => j.status === 'posted');
                message = `${results.length} posted journal(s) ✅`;
            } else {
                const totalDebit = journals.reduce((sum, j) => sum + (j.totalDebit || 0), 0);
                message = `Total: ${journals.length} journal entries - RM${totalDebit.toLocaleString()} 📒`;
            }
            
        } else if (type === 'leave' || type === 'leaves' || type === 'cuti') {
            const leaves = window.leaveRequests || [];
            if (filter === 'pending') {
                results = leaves.filter(l => l.status === 'pending');
                message = results.length > 0
                    ? `📅 ${results.length} pending leave request(s):\n${results.slice(0, 5).map(l => `• ${l.employeeName}: ${l.leaveType} (${l.days} days)`).join('\n')}`
                    : `No pending leave requests`;
            } else if (filter === 'approved') {
                results = leaves.filter(l => l.status === 'approved');
                message = `${results.length} approved leave(s) ✅`;
            } else {
                message = `Total: ${leaves.length} leave request(s) 📅`;
            }
            
        } else if (type === 'sales' || type === 'pos') {
            const sales = window.sales || [];
            if (filter === 'today') {
                results = sales.filter(s => s.date?.startsWith(today) || s.createdAt?.startsWith(today));
                const totalSales = results.reduce((sum, s) => sum + (s.total || 0), 0);
                message = results.length > 0
                    ? `💰 Today's sales: ${results.length} transaction(s) - RM${totalSales.toLocaleString()}`
                    : `No sales today yet`;
            } else if (filter === 'this_month') {
                results = sales.filter(s => s.date?.startsWith(thisMonth) || s.createdAt?.startsWith(thisMonth));
                const totalSales = results.reduce((sum, s) => sum + (s.total || 0), 0);
                message = `This month: ${results.length} sales - RM${totalSales.toLocaleString()} 📊`;
            } else {
                const totalSales = sales.reduce((sum, s) => sum + (s.total || 0), 0);
                message = `Total: ${sales.length} sales - RM${totalSales.toLocaleString()} 💰`;
            }
            
        } else {
            message = `I can search: invoices, customers, products, suppliers, expenses, income, quotations, bills, bom, projects, delivery_orders, employees, kpi, branches, journals, leave, sales 🔍`;
        }
        
        return { isAction: true, message };
    } catch (e) {
        console.error('Error searching:', e);
        return { isAction: true, message: `Search error: ${e.message}` };
    }
}

// Execute: Update Status
function executeUpdateStatus(action) {
    try {
        const type = action.type?.toLowerCase() || '';
        const id = action.id || '';
        const newStatus = action.status?.toLowerCase() || '';
        
        if (!id) {
            return { isAction: true, message: "Need an ID! Try: 'mark invoice INV-123456 as paid'" };
        }
        
        if (type === 'invoice') {
            // Use window.invoices (same as invoices.js)
            const invoices = window.invoices || [];
            const invoice = invoices.find(i => 
                i.invoiceNumber === id || 
                i.id === id || 
                i.invoiceNumber?.includes(id) ||
                i.id?.includes(id)
            );
            
            if (invoice) {
                invoice.status = newStatus || 'paid';
                if (newStatus === 'paid') {
                    invoice.paidDate = new Date().toISOString().split('T')[0];
                }
                if (typeof saveInvoices === 'function') saveInvoices();
                if (typeof renderInvoices === 'function') renderInvoices();
                return { isAction: true, message: `Done! ✅ Invoice ${invoice.invoiceNumber || id} marked as ${invoice.status} 📄` };
            } else {
                return { isAction: true, message: `Couldn't find invoice "${id}". Check the invoice number?` };
            }
            
        } else if (type === 'quotation') {
            // Use window.quotations (same as quotations.js)
            const quotations = window.quotations || [];
            const quotation = quotations.find(q => 
                q.quotationNumber === id || 
                q.id === id ||
                q.quotationNumber?.includes(id)
            );
            
            if (quotation) {
                quotation.status = newStatus || 'accepted';
                if (typeof saveQuotations === 'function') saveQuotations();
                if (typeof renderQuotations === 'function') renderQuotations();
                return { isAction: true, message: `Done! ✅ Quotation ${quotation.quotationNumber || id} marked as ${quotation.status} 📋` };
            } else {
                return { isAction: true, message: `Couldn't find quotation "${id}"` };
            }
            
        } else if (type === 'order') {
            // Use window.purchaseOrders (same as purchase-orders.js)
            const orders = window.purchaseOrders || [];
            const order = orders.find(o => 
                o.poNumber === id || 
                o.orderNumber === id || 
                o.id === id ||
                o.poNumber?.includes(id) ||
                o.orderNumber?.includes(id)
            );
            
            if (order) {
                order.status = newStatus || 'completed';
                if (typeof savePurchaseOrders === 'function') savePurchaseOrders();
                if (typeof renderPurchaseOrders === 'function') renderPurchaseOrders();
                return { isAction: true, message: `Done! ✅ Order ${order.poNumber || order.orderNumber || id} marked as ${order.status} 📝` };
            } else {
                return { isAction: true, message: `Couldn't find order "${id}"` };
            }
            
        } else if (type === 'bill') {
            const bills = window.businessData.bills || [];
            const name = action.name || id;
            const bill = bills.find(b => 
                b.name?.toLowerCase().includes(name.toLowerCase()) ||
                b.id === name
            );
            
            if (bill) {
                bill.status = newStatus || 'paid';
                if (newStatus === 'paid') {
                    bill.paidDate = new Date().toISOString().split('T')[0];
                }
                saveData();
                if (typeof renderBills === 'function') renderBills();
                return { isAction: true, message: `Done! ✅ Bill "${bill.name}" marked as ${bill.status} 💰` };
            } else {
                return { isAction: true, message: `Couldn't find bill "${name}". Try: 'show unpaid bills' first` };
            }
        }
        
        return { isAction: true, message: `Can update: invoice, quotation, order, bill status` };
    } catch (e) {
        console.error('Error updating status:', e);
        return { isAction: true, message: `Update error: ${e.message}` };
    }
}

// Execute: Delete
async function executeDelete(action) {
    try {
        const type = action.type?.toLowerCase() || '';
        const which = action.which?.toLowerCase() || '';
        const id = action.id || '';
        
        // Get data safely
        const data = window.businessData || {};
        
        if (type === 'expense') {
            const transactions = data.transactions || [];
            const expenses = transactions.filter(t => t.type === 'expense');
            
            if (expenses.length === 0) {
                return { isAction: true, message: "No expenses to delete 📝" };
            }
            
            if (which === 'last') {
                // Find the most recent expense
                const sorted = [...expenses].sort((a, b) => new Date(b.createdAt || b.date) - new Date(a.createdAt || a.date));
                const lastExpense = sorted[0];
                const index = transactions.findIndex(t => t.id === lastExpense.id);
                
                if (index > -1) {
                    const deleted = transactions.splice(index, 1)[0];
                    saveData();
                    if (typeof renderTransactions === 'function') renderTransactions();
                    return { isAction: true, message: `Done! 🗑️ Deleted expense: RM${deleted.amount?.toFixed(2)} - ${deleted.description}` };
                }
            } else if (id) {
                const index = transactions.findIndex(t => t.id === id && t.type === 'expense');
                if (index > -1) {
                    const deleted = transactions.splice(index, 1)[0];
                    saveData();
                    if (typeof renderTransactions === 'function') renderTransactions();
                    return { isAction: true, message: `Done! 🗑️ Deleted expense: ${deleted.description}` };
                }
            }
            return { isAction: true, message: `No expense found to delete` };
            
        } else if (type === 'income') {
            const transactions = data.transactions || [];
            const incomes = transactions.filter(t => t.type === 'income');
            
            if (incomes.length === 0) {
                return { isAction: true, message: "No income to delete 📝" };
            }
            
            if (which === 'last') {
                const sorted = [...incomes].sort((a, b) => new Date(b.createdAt || b.date) - new Date(a.createdAt || a.date));
                const lastIncome = sorted[0];
                const index = transactions.findIndex(t => t.id === lastIncome.id);
                
                if (index > -1) {
                    const deleted = transactions.splice(index, 1)[0];
                    saveData();
                    if (typeof renderTransactions === 'function') renderTransactions();
                    return { isAction: true, message: `Done! 🗑️ Deleted income: RM${deleted.amount?.toFixed(2)} - ${deleted.description}` };
                }
            }
            return { isAction: true, message: `No income found to delete` };
            
        } else if (type === 'invoice') {
            // Use window.invoices (same as invoices.js)
            const invoiceList = window.invoices || [];
            const index = invoiceList.findIndex(i => i.invoiceNumber === id || i.id === id || i.invoiceNumber?.includes(id));
            
            if (index > -1) {
                const deleted = invoiceList.splice(index, 1)[0];
                if (typeof saveInvoices === 'function') {
                    saveInvoices();
                } else {
                    localStorage.setItem('ezcubic_invoices', JSON.stringify(window.invoices));
                    const user = window.currentUser;
                    if (user && user.tenantId) {
                        const tenantKey = 'ezcubic_tenant_' + user.tenantId;
                        let tenantData = JSON.parse(localStorage.getItem(tenantKey) || '{}');
                        tenantData.invoices = window.invoices;
                        tenantData.updatedAt = new Date().toISOString();
                        localStorage.setItem(tenantKey, JSON.stringify(tenantData));
                    }
                }
                if (typeof renderInvoices === 'function') renderInvoices();
                return { isAction: true, message: `Done! 🗑️ Deleted invoice: ${deleted.invoiceNumber}` };
            }
            return { isAction: true, message: `Couldn't find invoice "${id}"` };
            
        } else if (type === 'customer') {
            // Use window.crmCustomers (same as crm.js)
            const customers = window.crmCustomers || [];
            const index = customers.findIndex(c => c.name?.toLowerCase().includes(id.toLowerCase()) || c.id === id);
            
            if (index > -1) {
                const deleted = customers.splice(index, 1)[0];
                if (typeof saveCRMCustomers === 'function') {
                    saveCRMCustomers();
                } else {
                    localStorage.setItem('ezcubic_crm_customers', JSON.stringify(window.crmCustomers));
                    const user = window.currentUser;
                    if (user && user.tenantId) {
                        const tenantKey = 'ezcubic_tenant_' + user.tenantId;
                        let tenantData = JSON.parse(localStorage.getItem(tenantKey) || '{}');
                        tenantData.crmCustomers = window.crmCustomers;
                        tenantData.updatedAt = new Date().toISOString();
                        localStorage.setItem(tenantKey, JSON.stringify(tenantData));
                    }
                }
                if (typeof renderCRMCustomers === 'function') renderCRMCustomers();
                return { isAction: true, message: `Done! 🗑️ Deleted customer: ${deleted.name}` };
            }
            return { isAction: true, message: `Couldn't find customer "${id}"` };
            
        } else if (type === 'product') {
            // Use window.products (same as inventory.js)
            const productsList = window.products || [];
            const index = productsList.findIndex(p => p.name?.toLowerCase().includes(id.toLowerCase()) || p.id === id);
            
            if (index > -1) {
                const deleted = productsList.splice(index, 1)[0];
                // Use proper save function if available - use sync version to avoid double cloud sync
                if (typeof saveProductsSync === 'function') {
                    saveProductsSync();
                } else if (typeof saveProducts === 'function') {
                    saveProducts();
                } else {
                    localStorage.setItem('ezcubic_products', JSON.stringify(window.products));
                    // Save timestamp with margin to ensure local wins
                    localStorage.setItem('ezcubic_last_save_timestamp', (Date.now() + 5000).toString());
                    const user = window.currentUser;
                    if (user && user.tenantId) {
                        const tenantKey = 'ezcubic_tenant_' + user.tenantId;
                        let tenantData = JSON.parse(localStorage.getItem(tenantKey) || '{}');
                        tenantData.products = window.products;
                        tenantData.updatedAt = new Date().toISOString();
                        localStorage.setItem(tenantKey, JSON.stringify(tenantData));
                    }
                }
                if (typeof renderProducts === 'function') renderProducts();
                if (typeof renderInventory === 'function') renderInventory();
                
                // CRITICAL: Await cloud sync for deletions
                if (typeof window.fullCloudSync === 'function') {
                    try {
                        await window.fullCloudSync();
                        return { isAction: true, message: `Done! 🗑️ Deleted & synced: ${deleted.name}` };
                    } catch (e) {
                        console.warn('Cloud sync failed:', e);
                        return { isAction: true, message: `Done! 🗑️ Deleted product: ${deleted.name} (sync pending)` };
                    }
                }
                return { isAction: true, message: `Done! 🗑️ Deleted product: ${deleted.name}` };
            }
            return { isAction: true, message: `Couldn't find product "${id}"` };
        }
        
        return { isAction: true, message: `I can delete: expense, income, invoice, customer, product` };
    } catch (e) {
        console.error('Error deleting:', e);
        return { isAction: true, message: `Delete error: ${e.message}` };
    }
}

// Smart Quick Actions - show context-aware buttons based on AI response
function showSmartActions(responseText) {
    const lowerResponse = responseText.toLowerCase();
    const actionsContainer = document.querySelector('.chatbot-quick-actions');
    if (!actionsContainer) return;
    
    const actions = [];
    
    // Detect keywords and suggest relevant actions
    if (lowerResponse.includes('stock') || lowerResponse.includes('inventory') || lowerResponse.includes('product')) {
        actions.push({ label: '📦 View Inventory', action: "showSection('inventory')" });
    }
    if (lowerResponse.includes('profit') || lowerResponse.includes('revenue') || lowerResponse.includes('expense') || lowerResponse.includes('rm')) {
        actions.push({ label: '📊 View Dashboard', action: "showSection('dashboard')" });
    }
    if (lowerResponse.includes('customer') || lowerResponse.includes('crm') || lowerResponse.includes('client')) {
        actions.push({ label: '👥 View Customers', action: "showSection('crm')" });
    }
    if (lowerResponse.includes('invoice') || lowerResponse.includes('bill') || lowerResponse.includes('payment')) {
        actions.push({ label: '📄 View Invoices', action: "showSection('invoices')" });
    }
    if (lowerResponse.includes('sale') || lowerResponse.includes('pos') || lowerResponse.includes('order')) {
        actions.push({ label: '🛒 Go to POS', action: "showSection('pos')" });
    }
    if (lowerResponse.includes('tax') || lowerResponse.includes('sst') || lowerResponse.includes('lhdn')) {
        actions.push({ label: '💰 Tax Calculator', action: "showSection('taxes')" });
    }
    if (lowerResponse.includes('report') || lowerResponse.includes('statement')) {
        actions.push({ label: '📈 View Reports', action: "showSection('reports')" });
    }
    
    // Limit to 3 actions max
    const limitedActions = actions.slice(0, 3);
    
    // If we found relevant actions, show them; otherwise show defaults
    if (limitedActions.length > 0) {
        actionsContainer.innerHTML = limitedActions.map(a => 
            `<button onclick="${a.action}; toggleChatbot();">${a.label}</button>`
        ).join('');
    } else {
        // Default actions
        actionsContainer.innerHTML = `
            <button onclick="askQuickQuestion('What is my profit this month?')">📊 My Profit</button>
            <button onclick="askQuickQuestion('Who are my top customers?')">👥 Top Customers</button>
            <button onclick="askQuickQuestion('Any low stock items?')">📦 Low Stock</button>
        `;
    }
}

// Call the Netlify function for AI response
async function getAIResponse(message) {
    try {
        const businessContext = getBusinessContext();
        
        console.log('Sending to AI:', { messagesCount: conversationHistory.length, hasContext: !!businessContext });
        
        // Add timeout to prevent hanging
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
        
        const response = await fetch('/.netlify/functions/ai-chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                messages: conversationHistory,
                businessContext: businessContext
            }),
            signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        console.log('AI response status:', response.status);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('AI error response:', errorText);
            throw new Error(`AI service error: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('AI response data:', data);
        
        if (data.fallback || data.error) {
            console.log('AI returned fallback flag or error');
            return { success: false, error: data.error };
        }
        
        return {
            success: true,
            message: data.message
        };
    } catch (error) {
        if (error.name === 'AbortError') {
            console.error('AI request timed out');
            return { success: false, error: 'Request timed out' };
        }
        console.error('AI API call failed:', error);
        return { success: false, error: error.message };
    }
}

// ==================== AI RESPONSE GENERATION (FALLBACK) ====================
// Used when DeepSeek API is not available
function generateAIResponse(message) {
    const lowerMessage = message.toLowerCase();
    const context = getSimpleContext();
    
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
