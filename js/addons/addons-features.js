// ==================== ADDONS-FEATURES.JS ====================
// EZCubic - Addons Features Module - Quick add, activity, WhatsApp, search - Split from addons-core.js v2.3.2

// ==================== 1. QUICK ADD FLOATING BUTTON ====================
function initQuickAddButton() {
    if (document.getElementById('quickAddFab')) return;
    
    const fab = document.createElement('div');
    fab.id = 'quickAddFab';
    fab.innerHTML = `
        <style>
            #quickAddFab {
                position: fixed;
                bottom: 80px;
                right: 20px;
                z-index: 9998;
            }
            #quickAddFab .fab-main {
                width: 56px;
                height: 56px;
                border-radius: 50%;
                background: linear-gradient(135deg, #2563eb, #1d4ed8);
                color: white;
                border: none;
                font-size: 24px;
                cursor: pointer;
                box-shadow: 0 4px 15px rgba(37, 99, 235, 0.4);
                transition: transform 0.2s;
            }
            #quickAddFab .fab-main:hover { transform: scale(1.1); }
            #quickAddFab .fab-menu {
                position: absolute;
                bottom: 65px;
                right: 0;
                display: none;
                flex-direction: column;
                gap: 10px;
            }
            #quickAddFab.open .fab-menu { display: flex; }
            #quickAddFab.open .fab-main { transform: rotate(45deg); }
            #quickAddFab .fab-item {
                display: flex;
                align-items: center;
                gap: 10px;
                padding: 10px 15px;
                background: white;
                border-radius: 25px;
                box-shadow: 0 2px 10px rgba(0,0,0,0.15);
                cursor: pointer;
                white-space: nowrap;
                font-size: 14px;
                transition: transform 0.2s;
            }
            #quickAddFab .fab-item:hover { transform: translateX(-5px); }
            #quickAddFab .fab-item i { color: #2563eb; width: 20px; }
            @media (max-width: 768px) {
                #quickAddFab { bottom: 100px; }
            }
        </style>
        <div class="fab-menu">
            <div class="fab-item" onclick="quickAddIncome()"><i class="fas fa-plus-circle"></i> Add Income</div>
            <div class="fab-item" onclick="quickAddExpense()"><i class="fas fa-minus-circle"></i> Add Expense</div>
            <div class="fab-item" onclick="quickAddBill()"><i class="fas fa-file-invoice"></i> Add Bill</div>
            <div class="fab-item" onclick="quickAddProduct()"><i class="fas fa-box"></i> Add Product</div>
            <div class="fab-item" onclick="quickAddCustomer()"><i class="fas fa-user-plus"></i> Add Customer</div>
        </div>
        <button class="fab-main" onclick="toggleQuickAddMenu()">
            <i class="fas fa-plus"></i>
        </button>
    `;
    document.body.appendChild(fab);
}

function toggleQuickAddMenu() {
    document.getElementById('quickAddFab').classList.toggle('open');
}

function quickAddIncome() {
    toggleQuickAddMenu();
    showSection('income');
}

function quickAddExpense() {
    toggleQuickAddMenu();
    showSection('expenses');
}

function quickAddBill() {
    toggleQuickAddMenu();
    showSection('bills');
    if (typeof showAddBillModal === 'function') showAddBillModal();
}

function quickAddProduct() {
    toggleQuickAddMenu();
    showSection('inventory');
    if (typeof showProductModal === 'function') showProductModal();
}

function quickAddCustomer() {
    toggleQuickAddMenu();
    showSection('crm');
    if (typeof showCRMCustomerModal === 'function') showCRMCustomerModal();
}

// ==================== 2. RECENT ACTIVITY FEED ====================
function getRecentActivity(limit = 10) {
    const activities = [];
    
    // Get recent transactions
    const transactions = getTransactionsFromStorage().slice(-5);
    transactions.forEach(t => {
        activities.push({
            type: t.type,
            icon: t.type === 'income' ? 'fa-arrow-up' : 'fa-arrow-down',
            color: t.type === 'income' ? '#10b981' : '#ef4444',
            text: `${t.type === 'income' ? 'Income' : 'Expense'}: ${t.description || t.category}`,
            amount: t.amount,
            date: t.date
        });
    });
    
    // Sort by date and return
    return activities
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .slice(0, limit);
}

function renderRecentActivityWidget() {
    const container = document.getElementById('recentActivityWidget');
    if (!container) return;
    
    const activities = getRecentActivity(5);
    
    if (activities.length === 0) {
        container.innerHTML = '<p style="color: #94a3b8; text-align: center;">No recent activity</p>';
        return;
    }
    
    container.innerHTML = activities.map(a => `
        <div style="display: flex; align-items: center; gap: 12px; padding: 10px 0; border-bottom: 1px solid #e2e8f0;">
            <div style="width: 36px; height: 36px; background: ${a.color}20; color: ${a.color}; 
                        border-radius: 50%; display: flex; align-items: center; justify-content: center;">
                <i class="fas ${a.icon}"></i>
            </div>
            <div style="flex: 1;">
                <div style="font-size: 14px; color: #334155;">${a.text}</div>
                <div style="font-size: 12px; color: #94a3b8;">${a.date}</div>
            </div>
            <div style="font-weight: 600; color: ${a.color};">RM ${parseFloat(a.amount).toFixed(2)}</div>
        </div>
    `).join('');
}

// ==================== 3. DUPLICATE RECORD (UTILS) ====================
function duplicateQuotation(id) {
    const quotations = window.quotations || [];
    const original = quotations.find(q => q.id === id);
    if (!original) return;
    
    const duplicate = {
        ...JSON.parse(JSON.stringify(original)),
        id: Date.now(),
        quoteNumber: 'QT-' + Date.now(),
        date: new Date().toISOString().split('T')[0],
        status: 'draft'
    };
    
    quotations.push(duplicate);
    localStorage.setItem('ezcubic_quotations', JSON.stringify(quotations));
    window.quotations = quotations;
    
    showNotification('Quotation duplicated successfully', 'success');
    if (typeof loadQuotations === 'function') loadQuotations();
}

function duplicateOrder(id) {
    const orders = window.orders || [];
    const original = orders.find(o => o.id === id);
    if (!original) return;
    
    const duplicate = {
        ...JSON.parse(JSON.stringify(original)),
        id: Date.now(),
        orderNumber: 'ORD-' + Date.now(),
        date: new Date().toISOString().split('T')[0],
        status: 'pending'
    };
    
    orders.push(duplicate);
    localStorage.setItem('ezcubic_orders', JSON.stringify(orders));
    window.orders = orders;
    
    showNotification('Order duplicated successfully', 'success');
    if (typeof loadOrders === 'function') loadOrders();
}

// ==================== 4. PRINT ANY TABLE ====================
function printTable(tableId, title) {
    const table = document.getElementById(tableId);
    if (!table) {
        showNotification('Table not found', 'error');
        return;
    }
    
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
        <html>
        <head>
            <title>${title || 'Print'}</title>
            <style>
                body { font-family: Arial, sans-serif; padding: 20px; }
                h1 { color: #1e293b; margin-bottom: 20px; }
                table { width: 100%; border-collapse: collapse; }
                th, td { border: 1px solid #e2e8f0; padding: 10px; text-align: left; }
                th { background: #f1f5f9; font-weight: 600; }
                @media print { button { display: none; } }
            </style>
        </head>
        <body>
            <h1>${title || 'Report'}</h1>
            <p>Printed on: ${new Date().toLocaleString()}</p>
            ${table.outerHTML}
            <button onclick="window.print()" style="margin-top: 20px; padding: 10px 20px;">Print</button>
        </body>
        </html>
    `);
    printWindow.document.close();
}

// ==================== 5. PAYMENT REMINDERS ====================
function checkPaymentReminders() {
    const bills = getBillsFromStorage();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const overdueBills = bills.filter(b => {
        if (b.status === 'paid') return false;
        const dueDate = new Date(b.dueDate);
        return dueDate < today;
    });
    
    const dueSoonBills = bills.filter(b => {
        if (b.status === 'paid') return false;
        const dueDate = new Date(b.dueDate);
        const diffDays = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));
        return diffDays >= 0 && diffDays <= 3;
    });
    
    if (overdueBills.length > 0) {
        showNotification(`⚠️ You have ${overdueBills.length} overdue bill(s)!`, 'error');
    }
    
    if (dueSoonBills.length > 0) {
        setTimeout(() => {
            showNotification(`📅 ${dueSoonBills.length} bill(s) due within 3 days`, 'warning');
        }, 2000);
    }
}

// ==================== 6. LOW STOCK ALERTS ====================
function checkLowStockAlerts() {
    const products = window.products || JSON.parse(localStorage.getItem('ezcubic_products') || '[]');
    
    const lowStockItems = products.filter(p => {
        const stock = parseFloat(p.stock) || 0;
        const minStock = parseFloat(p.minStock) || 5;
        return stock <= minStock && stock > 0;
    });
    
    const outOfStockItems = products.filter(p => {
        const stock = parseFloat(p.stock) || 0;
        return stock <= 0;
    });
    
    if (outOfStockItems.length > 0) {
        showNotification(`🚨 ${outOfStockItems.length} product(s) out of stock!`, 'error');
    }
    
    if (lowStockItems.length > 0) {
        setTimeout(() => {
            showNotification(`📦 ${lowStockItems.length} product(s) running low on stock`, 'warning');
        }, 2000);
    }
}

// ==================== 7. WHATSAPP SHARE ====================
function shareViaWhatsApp(type, id) {
    let message = '';
    const businessName = businessData?.settings?.businessName || 'A Lazy Human';
    
    if (type === 'invoice' || type === 'order') {
        const orders = window.orders || [];
        const order = orders.find(o => o.id === id);
        if (order) {
            message = `*${businessName}*\n\n`;
            message += `📄 Invoice: ${order.orderNumber}\n`;
            message += `📅 Date: ${order.date}\n`;
            message += `💰 Total: RM ${parseFloat(order.total).toFixed(2)}\n\n`;
            message += `Thank you for your business!`;
        }
    } else if (type === 'quotation') {
        const quotations = window.quotations || [];
        const quote = quotations.find(q => q.id === id);
        if (quote) {
            message = `*${businessName}*\n\n`;
            message += `📋 Quotation: ${quote.quoteNumber}\n`;
            message += `📅 Date: ${quote.date}\n`;
            message += `💰 Total: RM ${parseFloat(quote.total).toFixed(2)}\n`;
            message += `⏰ Valid Until: ${quote.validUntil}\n\n`;
            message += `Please confirm if you'd like to proceed.`;
        }
    }
    
    if (message) {
        const encoded = encodeURIComponent(message);
        window.open(`https://wa.me/?text=${encoded}`, '_blank');
    } else {
        showNotification('Could not find record to share', 'error');
    }
}

function shareOrderWhatsApp(id) {
    shareViaWhatsApp('order', id);
}

function shareQuotationWhatsApp(id) {
    shareViaWhatsApp('quotation', id);
}

// ==================== 8. GLOBAL SEARCH ====================
function openGlobalSearch() {
    const existing = document.getElementById('globalSearchModal');
    if (existing) existing.remove();
    
    const modal = document.createElement('div');
    modal.id = 'globalSearchModal';
    modal.innerHTML = `
        <div style="position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 99999; 
                    display: flex; align-items: flex-start; justify-content: center; padding-top: 100px;"
             onclick="if(event.target === this) closeGlobalSearch()">
            <div style="background: white; border-radius: 12px; width: 90%; max-width: 600px; 
                        box-shadow: 0 20px 50px rgba(0,0,0,0.3); overflow: hidden;">
                <div style="padding: 15px; border-bottom: 1px solid #e2e8f0;">
                    <input type="text" id="globalSearchInput" placeholder="Search transactions, customers, products..." 
                           style="width: 100%; padding: 12px 15px; border: none; font-size: 16px; outline: none;"
                           oninput="performGlobalSearch(this.value)" autofocus>
                </div>
                <div id="globalSearchResults" style="max-height: 400px; overflow-y: auto; padding: 10px;">
                    <p style="color: #94a3b8; text-align: center; padding: 20px;">Type to search...</p>
                </div>
                <div style="padding: 10px 15px; background: #f8fafc; font-size: 12px; color: #64748b;">
                    <kbd style="background: #e2e8f0; padding: 2px 6px; border-radius: 4px;">↵</kbd> to select • 
                    <kbd style="background: #e2e8f0; padding: 2px 6px; border-radius: 4px;">ESC</kbd> to close
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    document.getElementById('globalSearchInput').focus();
}

function closeGlobalSearch() {
    const modal = document.getElementById('globalSearchModal');
    if (modal) modal.remove();
}

function performGlobalSearch(query) {
    const results = document.getElementById('globalSearchResults');
    if (!query || query.length < 2) {
        results.innerHTML = '<p style="color: #94a3b8; text-align: center; padding: 20px;">Type at least 2 characters...</p>';
        return;
    }
    
    const q = query.toLowerCase();
    const matches = [];
    
    // Search transactions
    const transactions = getTransactionsFromStorage();
    transactions.filter(t => 
        (t.description && t.description.toLowerCase().includes(q)) ||
        (t.category && t.category.toLowerCase().includes(q))
    ).slice(0, 5).forEach(t => {
        matches.push({
            icon: t.type === 'income' ? 'fa-arrow-up' : 'fa-arrow-down',
            color: t.type === 'income' ? '#10b981' : '#ef4444',
            title: t.description || t.category,
            subtitle: `${t.type} • ${t.date} • RM ${parseFloat(t.amount).toFixed(2)}`,
            action: () => { closeGlobalSearch(); showSection('transactions'); }
        });
    });
    
    // Search customers
    const customers = window.customers || [];
    customers.filter(c => 
        (c.name && c.name.toLowerCase().includes(q)) ||
        (c.email && c.email.toLowerCase().includes(q))
    ).slice(0, 5).forEach(c => {
        matches.push({
            icon: 'fa-user',
            color: '#3b82f6',
            title: c.name,
            subtitle: c.email || c.phone || 'Customer',
            action: () => { closeGlobalSearch(); showSection('crm'); }
        });
    });
    
    // Search products
    const products = window.products || [];
    products.filter(p => 
        (p.name && p.name.toLowerCase().includes(q)) ||
        (p.sku && p.sku.toLowerCase().includes(q))
    ).slice(0, 5).forEach(p => {
        matches.push({
            icon: 'fa-box',
            color: '#8b5cf6',
            title: p.name,
            subtitle: `SKU: ${p.sku || 'N/A'} • Stock: ${p.stock || 0}`,
            action: () => { closeGlobalSearch(); showSection('inventory'); }
        });
    });
    
    if (matches.length === 0) {
        results.innerHTML = '<p style="color: #94a3b8; text-align: center; padding: 20px;">No results found</p>';
        return;
    }
    
    results.innerHTML = matches.map((m, i) => `
        <div onclick="globalSearchResults[${i}].action()" 
             style="display: flex; align-items: center; gap: 12px; padding: 12px; cursor: pointer; 
                    border-radius: 8px; transition: background 0.2s;"
             onmouseover="this.style.background='#f1f5f9'" onmouseout="this.style.background='transparent'">
            <div style="width: 40px; height: 40px; background: ${m.color}20; color: ${m.color}; 
                        border-radius: 10px; display: flex; align-items: center; justify-content: center;">
                <i class="fas ${m.icon}"></i>
            </div>
            <div>
                <div style="font-weight: 500; color: #1e293b;">${m.title}</div>
                <div style="font-size: 12px; color: #64748b;">${m.subtitle}</div>
            </div>
        </div>
    `).join('');
    
    window.globalSearchResults = matches;
}

// ==================== WINDOW EXPORTS ====================
// Quick Add
window.initQuickAddButton = initQuickAddButton;
window.toggleQuickAddMenu = toggleQuickAddMenu;
window.quickAddIncome = quickAddIncome;
window.quickAddExpense = quickAddExpense;
window.quickAddBill = quickAddBill;
window.quickAddProduct = quickAddProduct;
window.quickAddCustomer = quickAddCustomer;

// Activity & Utils
window.getRecentActivity = getRecentActivity;
window.renderRecentActivityWidget = renderRecentActivityWidget;
window.duplicateQuotation = duplicateQuotation;
window.duplicateOrder = duplicateOrder;
window.printTable = printTable;
window.checkPaymentReminders = checkPaymentReminders;
window.checkLowStockAlerts = checkLowStockAlerts;

// WhatsApp
window.shareViaWhatsApp = shareViaWhatsApp;
window.shareOrderWhatsApp = shareOrderWhatsApp;
window.shareQuotationWhatsApp = shareQuotationWhatsApp;

// Global Search
window.openGlobalSearch = openGlobalSearch;
window.closeGlobalSearch = closeGlobalSearch;
window.performGlobalSearch = performGlobalSearch;
