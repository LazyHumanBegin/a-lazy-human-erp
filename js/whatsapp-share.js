// ==================== WHATSAPP SHARE MODULE ====================
// Phase 5.0 - "One Click Magic" - Share to WhatsApp without API
// Uses WhatsApp Web/App deep links

/**
 * Share text content to WhatsApp
 * @param {string} message - The message to share
 * @param {string} phoneNumber - Optional: specific phone number (with country code, no +)
 */
function shareToWhatsApp(message, phoneNumber = null) {
    const encodedMessage = encodeURIComponent(message);
    
    // If phone number provided, send directly to that number
    // Otherwise, open WhatsApp and let user choose contact
    const url = phoneNumber 
        ? `https://wa.me/${phoneNumber}?text=${encodedMessage}`
        : `https://wa.me/?text=${encodedMessage}`;
    
    window.open(url, '_blank');
    
    showToast('Opening WhatsApp...', 'success');
}

/**
 * Generate daily summary text for WhatsApp
 */
function generateDailySummary() {
    const today = new Date().toLocaleDateString('en-MY', { 
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
    });
    
    // Get transactions for today
    const todayStr = new Date().toISOString().split('T')[0];
    const todayTransactions = (window.transactions || []).filter(t => 
        t.date && t.date.startsWith(todayStr)
    );
    
    // Calculate totals
    const income = todayTransactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);
    
    const expenses = todayTransactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);
    
    const profit = income - expenses;
    
    // Get sales count from orders
    const todayOrders = (window.orders || []).filter(o => 
        o.date && o.date.startsWith(todayStr)
    );
    const salesCount = todayOrders.length;
    const salesTotal = todayOrders.reduce((sum, o) => sum + (parseFloat(o.total) || 0), 0);
    
    // Get low stock alerts
    const products = window.products || [];
    const lowStock = products.filter(p => {
        const stock = p.stock || 0;
        const minStock = p.minStock || p.reorderLevel || 5;
        return stock <= minStock;
    });
    
    // Build message
    let message = `📊 *EZ Smart Daily Summary*\n`;
    message += `📅 ${today}\n`;
    message += `━━━━━━━━━━━━━━━━━━━━\n\n`;
    
    message += `💰 *Financial Summary*\n`;
    message += `📈 Income: RM ${income.toFixed(2)}\n`;
    message += `📉 Expenses: RM ${expenses.toFixed(2)}\n`;
    message += `${profit >= 0 ? '✅' : '⚠️'} Profit: RM ${profit.toFixed(2)}\n\n`;
    
    if (salesCount > 0) {
        message += `🛒 *Sales*\n`;
        message += `📦 Orders: ${salesCount}\n`;
        message += `💵 Total: RM ${salesTotal.toFixed(2)}\n\n`;
    }
    
    if (lowStock.length > 0) {
        message += `⚠️ *Low Stock Alert (${lowStock.length} items)*\n`;
        lowStock.slice(0, 5).forEach(p => {
            message += `• ${p.name}: ${p.stock || 0} left\n`;
        });
        if (lowStock.length > 5) {
            message += `• ...and ${lowStock.length - 5} more\n`;
        }
        message += `\n`;
    }
    
    message += `━━━━━━━━━━━━━━━━━━━━\n`;
    message += `_Sent from EZ Smart_ 🦥`;
    
    return message;
}

/**
 * Generate weekly summary text for WhatsApp
 */
function generateWeeklySummary() {
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - 7);
    
    const weekStartStr = weekStart.toISOString().split('T')[0];
    const todayStr = now.toISOString().split('T')[0];
    
    // Get transactions for the week
    const weekTransactions = (window.transactions || []).filter(t => 
        t.date && t.date >= weekStartStr && t.date <= todayStr
    );
    
    // Calculate totals
    const income = weekTransactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);
    
    const expenses = weekTransactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);
    
    const profit = income - expenses;
    
    // Get orders for the week
    const weekOrders = (window.orders || []).filter(o => 
        o.date && o.date >= weekStartStr && o.date <= todayStr
    );
    const salesCount = weekOrders.length;
    const salesTotal = weekOrders.reduce((sum, o) => sum + (parseFloat(o.total) || 0), 0);
    
    // Top selling products
    const productSales = {};
    weekOrders.forEach(order => {
        (order.items || []).forEach(item => {
            const name = item.productName || item.name;
            if (name) {
                productSales[name] = (productSales[name] || 0) + (item.quantity || 1);
            }
        });
    });
    const topProducts = Object.entries(productSales)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);
    
    // Build message
    let message = `📊 *EZ Smart Weekly Report*\n`;
    message += `📅 ${weekStart.toLocaleDateString('en-MY')} - ${now.toLocaleDateString('en-MY')}\n`;
    message += `━━━━━━━━━━━━━━━━━━━━\n\n`;
    
    message += `💰 *Financial Summary*\n`;
    message += `📈 Total Income: RM ${income.toFixed(2)}\n`;
    message += `📉 Total Expenses: RM ${expenses.toFixed(2)}\n`;
    message += `${profit >= 0 ? '✅' : '⚠️'} Net Profit: RM ${profit.toFixed(2)}\n`;
    const margin = income > 0 ? ((profit / income) * 100).toFixed(1) : 0;
    message += `📊 Profit Margin: ${margin}%\n\n`;
    
    message += `🛒 *Sales Performance*\n`;
    message += `📦 Total Orders: ${salesCount}\n`;
    message += `💵 Total Revenue: RM ${salesTotal.toFixed(2)}\n`;
    const avgOrder = salesCount > 0 ? (salesTotal / salesCount).toFixed(2) : 0;
    message += `📈 Avg Order Value: RM ${avgOrder}\n\n`;
    
    if (topProducts.length > 0) {
        message += `🏆 *Top Selling Products*\n`;
        topProducts.forEach((p, i) => {
            message += `${i + 1}. ${p[0]} (${p[1]} sold)\n`;
        });
        message += `\n`;
    }
    
    message += `━━━━━━━━━━━━━━━━━━━━\n`;
    message += `_Sent from EZ Smart_ 🦥`;
    
    return message;
}

/**
 * Generate monthly summary text for WhatsApp
 */
function generateMonthlySummary() {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    
    const monthStartStr = monthStart.toISOString().split('T')[0];
    const todayStr = now.toISOString().split('T')[0];
    
    // Get transactions for the month
    const monthTransactions = (window.transactions || []).filter(t => 
        t.date && t.date >= monthStartStr && t.date <= todayStr
    );
    
    // Calculate totals
    const income = monthTransactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);
    
    const expenses = monthTransactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);
    
    const profit = income - expenses;
    
    // Expense breakdown by category
    const expenseByCategory = {};
    monthTransactions
        .filter(t => t.type === 'expense')
        .forEach(t => {
            const cat = t.category || 'Other';
            expenseByCategory[cat] = (expenseByCategory[cat] || 0) + (parseFloat(t.amount) || 0);
        });
    const topExpenses = Object.entries(expenseByCategory)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);
    
    // Get orders
    const monthOrders = (window.orders || []).filter(o => 
        o.date && o.date >= monthStartStr && o.date <= todayStr
    );
    const salesTotal = monthOrders.reduce((sum, o) => sum + (parseFloat(o.total) || 0), 0);
    
    const monthName = now.toLocaleDateString('en-MY', { month: 'long', year: 'numeric' });
    
    // Build message
    let message = `📊 *EZ Smart Monthly Report*\n`;
    message += `📅 ${monthName}\n`;
    message += `━━━━━━━━━━━━━━━━━━━━\n\n`;
    
    message += `💰 *P&L Summary*\n`;
    message += `📈 Revenue: RM ${income.toFixed(2)}\n`;
    message += `📉 Expenses: RM ${expenses.toFixed(2)}\n`;
    message += `${profit >= 0 ? '✅' : '🔴'} Net Profit: RM ${profit.toFixed(2)}\n`;
    const margin = income > 0 ? ((profit / income) * 100).toFixed(1) : 0;
    message += `📊 Margin: ${margin}%\n\n`;
    
    message += `🛒 *Sales*\n`;
    message += `📦 Orders: ${monthOrders.length}\n`;
    message += `💵 Total: RM ${salesTotal.toFixed(2)}\n\n`;
    
    if (topExpenses.length > 0) {
        message += `📋 *Top Expenses*\n`;
        topExpenses.forEach(e => {
            message += `• ${e[0]}: RM ${e[1].toFixed(2)}\n`;
        });
        message += `\n`;
    }
    
    message += `━━━━━━━━━━━━━━━━━━━━\n`;
    message += `_Sent from EZ Smart_ 🦥`;
    
    return message;
}

/**
 * Generate invoice summary for WhatsApp
 * @param {Object} invoice - Invoice/order object
 */
function generateInvoiceSummary(invoice) {
    if (!invoice) return '';
    
    const invoiceNo = invoice.invoiceNumber || invoice.orderNumber || invoice.id;
    const customerName = invoice.customerName || invoice.customer?.name || 'Customer';
    const date = invoice.date || new Date().toISOString().split('T')[0];
    const total = parseFloat(invoice.total || invoice.grandTotal || 0);
    const items = invoice.items || [];
    
    let message = `📄 *Invoice ${invoiceNo}*\n`;
    message += `━━━━━━━━━━━━━━━━━━━━\n\n`;
    
    message += `👤 Customer: ${customerName}\n`;
    message += `📅 Date: ${date}\n\n`;
    
    message += `📦 *Items*\n`;
    items.forEach(item => {
        const name = item.productName || item.name || 'Item';
        const qty = item.quantity || 1;
        const price = parseFloat(item.price || item.unitPrice || 0);
        const subtotal = qty * price;
        message += `• ${name} x${qty} = RM ${subtotal.toFixed(2)}\n`;
    });
    
    message += `\n💵 *Total: RM ${total.toFixed(2)}*\n\n`;
    
    if (invoice.status === 'unpaid' || invoice.status === 'pending') {
        message += `⚠️ Payment Status: UNPAID\n`;
    } else {
        message += `✅ Payment Status: PAID\n`;
    }
    
    message += `\n━━━━━━━━━━━━━━━━━━━━\n`;
    message += `_Sent from EZ Smart_ 🦥`;
    
    return message;
}

/**
 * Generate quotation summary for WhatsApp
 * @param {Object} quotation - Quotation object
 */
function generateQuotationSummary(quotation) {
    if (!quotation) return '';
    
    const quoteNo = quotation.quotationNo || quotation.quoteNumber || quotation.id;
    const customerName = quotation.customerName || quotation.customer?.name || 'Customer';
    const date = quotation.date || new Date().toISOString().split('T')[0];
    const validUntil = quotation.validUntil || quotation.expiryDate || '';
    const total = parseFloat(quotation.totalAmount || quotation.total || 0);
    const items = quotation.items || [];
    
    let message = `📋 *Quotation ${quoteNo}*\n`;
    message += `━━━━━━━━━━━━━━━━━━━━\n\n`;
    
    message += `👤 Customer: ${customerName}\n`;
    message += `📅 Date: ${date}\n`;
    if (validUntil) {
        message += `⏳ Valid Until: ${validUntil}\n`;
    }
    message += `\n`;
    
    message += `📦 *Items*\n`;
    items.forEach(item => {
        const name = item.productName || item.name || item.description || 'Item';
        const qty = item.quantity || 1;
        const price = parseFloat(item.price || item.unitPrice || 0);
        const subtotal = qty * price;
        message += `• ${name} x${qty} = RM ${subtotal.toFixed(2)}\n`;
    });
    
    message += `\n💵 *Total: RM ${total.toFixed(2)}*\n\n`;
    
    message += `━━━━━━━━━━━━━━━━━━━━\n`;
    message += `_Sent from EZ Smart_ 🦥\n`;
    message += `_Reply YES to confirm this quotation_`;
    
    return message;
}

/**
 * Generate low stock alert for WhatsApp
 */
function generateLowStockAlert() {
    const products = window.products || [];
    const lowStock = products.filter(p => {
        const stock = p.stock || 0;
        const minStock = p.minStock || p.reorderLevel || 5;
        return stock <= minStock;
    }).sort((a, b) => (a.stock || 0) - (b.stock || 0));
    
    if (lowStock.length === 0) {
        return `✅ *Stock Status*\n\nAll items are well stocked! 👍\n\n_Sent from EZ Smart_ 🦥`;
    }
    
    let message = `⚠️ *Low Stock Alert*\n`;
    message += `━━━━━━━━━━━━━━━━━━━━\n\n`;
    message += `${lowStock.length} items need restocking:\n\n`;
    
    lowStock.forEach(p => {
        const stock = p.stock || 0;
        const emoji = stock === 0 ? '🔴' : stock <= 3 ? '🟠' : '🟡';
        message += `${emoji} *${p.name}*\n`;
        message += `   Stock: ${stock} ${p.unit || 'pcs'}\n`;
        if (p.minStock) message += `   Min: ${p.minStock}\n`;
        message += `\n`;
    });
    
    message += `━━━━━━━━━━━━━━━━━━━━\n`;
    message += `_Sent from EZ Smart_ 🦥`;
    
    return message;
}

/**
 * Generate payment reminder for WhatsApp
 * @param {Object} invoice - Invoice object
 */
function generatePaymentReminder(invoice) {
    if (!invoice) return '';
    
    const invoiceNo = invoice.invoiceNumber || invoice.orderNumber || invoice.id;
    const customerName = invoice.customerName || invoice.customer?.name || 'Customer';
    const total = parseFloat(invoice.total || invoice.grandTotal || 0);
    const dueDate = invoice.dueDate || '';
    
    let message = `💳 *Payment Reminder*\n`;
    message += `━━━━━━━━━━━━━━━━━━━━\n\n`;
    
    message += `Hi ${customerName},\n\n`;
    message += `This is a friendly reminder for:\n\n`;
    message += `📄 Invoice: ${invoiceNo}\n`;
    message += `💵 Amount: RM ${total.toFixed(2)}\n`;
    if (dueDate) {
        message += `📅 Due Date: ${dueDate}\n`;
    }
    message += `\n`;
    message += `Please arrange payment at your earliest convenience. Thank you! 🙏\n\n`;
    
    message += `━━━━━━━━━━━━━━━━━━━━\n`;
    message += `_Sent from EZ Smart_ 🦥`;
    
    return message;
}

// ==================== QUICK SHARE FUNCTIONS ====================

/**
 * Share daily summary to WhatsApp
 */
function shareDailySummary() {
    const message = generateDailySummary();
    shareToWhatsApp(message);
}

/**
 * Share weekly summary to WhatsApp
 */
function shareWeeklySummary() {
    const message = generateWeeklySummary();
    shareToWhatsApp(message);
}

/**
 * Share monthly summary to WhatsApp
 */
function shareMonthlySummary() {
    const message = generateMonthlySummary();
    shareToWhatsApp(message);
}

/**
 * Share low stock alert to WhatsApp
 */
function shareLowStockAlert() {
    const message = generateLowStockAlert();
    shareToWhatsApp(message);
}

/**
 * Share invoice to WhatsApp
 * @param {string} invoiceId - Invoice ID to share
 */
function shareInvoice(invoiceId) {
    const orders = window.orders || [];
    const invoice = orders.find(o => o.id === invoiceId || o.invoiceNumber === invoiceId || o.orderNumber === invoiceId);
    
    if (!invoice) {
        showToast('Invoice not found', 'error');
        return;
    }
    
    const message = generateInvoiceSummary(invoice);
    
    // If customer has phone, offer to send directly
    const customerPhone = invoice.customerPhone || invoice.customer?.phone;
    if (customerPhone) {
        // Clean phone number (remove spaces, dashes, and ensure country code)
        let phone = customerPhone.replace(/[\s\-\(\)]/g, '');
        if (phone.startsWith('0')) {
            phone = '60' + phone.substring(1); // Malaysia country code
        } else if (!phone.startsWith('60') && !phone.startsWith('+60')) {
            phone = '60' + phone;
        }
        phone = phone.replace('+', '');
        
        shareToWhatsApp(message, phone);
    } else {
        shareToWhatsApp(message);
    }
}

/**
 * Share quotation to WhatsApp
 * @param {string} quotationId - Quotation ID to share
 */
function shareQuotation(quotationId) {
    const quotations = window.quotations || [];
    const quotation = quotations.find(q => q.id === quotationId || q.quotationNo === quotationId);
    
    if (!quotation) {
        showToast('Quotation not found', 'error');
        return;
    }
    
    const message = generateQuotationSummary(quotation);
    
    // If customer has phone, offer to send directly
    const customerPhone = quotation.customerPhone || quotation.customer?.phone;
    if (customerPhone) {
        let phone = customerPhone.replace(/[\s\-\(\)]/g, '');
        if (phone.startsWith('0')) {
            phone = '60' + phone.substring(1);
        } else if (!phone.startsWith('60') && !phone.startsWith('+60')) {
            phone = '60' + phone;
        }
        phone = phone.replace('+', '');
        
        shareToWhatsApp(message, phone);
    } else {
        shareToWhatsApp(message);
    }
}

/**
 * Share payment reminder to WhatsApp
 * @param {string} invoiceId - Invoice ID
 */
function sharePaymentReminder(invoiceId) {
    const orders = window.orders || [];
    const invoice = orders.find(o => o.id === invoiceId || o.invoiceNumber === invoiceId);
    
    if (!invoice) {
        showToast('Invoice not found', 'error');
        return;
    }
    
    const message = generatePaymentReminder(invoice);
    
    const customerPhone = invoice.customerPhone || invoice.customer?.phone;
    if (customerPhone) {
        let phone = customerPhone.replace(/[\s\-\(\)]/g, '');
        if (phone.startsWith('0')) {
            phone = '60' + phone.substring(1);
        } else if (!phone.startsWith('60') && !phone.startsWith('+60')) {
            phone = '60' + phone;
        }
        phone = phone.replace('+', '');
        
        shareToWhatsApp(message, phone);
    } else {
        shareToWhatsApp(message);
    }
}

/**
 * Share custom message to WhatsApp
 * @param {string} customMessage - Custom message to share
 */
function shareCustomMessage(customMessage) {
    if (!customMessage || customMessage.trim() === '') {
        showToast('No message to share', 'error');
        return;
    }
    shareToWhatsApp(customMessage);
}

// ==================== EXPOSE FUNCTIONS ====================
window.shareToWhatsApp = shareToWhatsApp;
window.shareDailySummary = shareDailySummary;
window.shareWeeklySummary = shareWeeklySummary;
window.shareMonthlySummary = shareMonthlySummary;
window.shareLowStockAlert = shareLowStockAlert;
window.shareInvoice = shareInvoice;
window.shareQuotation = shareQuotation;
window.sharePaymentReminder = sharePaymentReminder;
window.shareCustomMessage = shareCustomMessage;
window.generateDailySummary = generateDailySummary;
window.generateWeeklySummary = generateWeeklySummary;
window.generateMonthlySummary = generateMonthlySummary;
window.generateInvoiceSummary = generateInvoiceSummary;
window.generateQuotationSummary = generateQuotationSummary;
window.generateLowStockAlert = generateLowStockAlert;
window.generatePaymentReminder = generatePaymentReminder;

// Toggle WhatsApp menu dropdown
function toggleWhatsAppMenu() {
    const menu = document.getElementById('whatsappShareMenu');
    if (menu) {
        menu.style.display = menu.style.display === 'none' ? 'block' : 'none';
    }
}

// Close menu when clicking outside
document.addEventListener('click', function(e) {
    const menu = document.getElementById('whatsappShareMenu');
    const btn = e.target.closest('[onclick*="toggleWhatsAppMenu"]');
    if (menu && !btn && !e.target.closest('#whatsappShareMenu')) {
        menu.style.display = 'none';
    }
});

window.toggleWhatsAppMenu = toggleWhatsAppMenu;

console.log('📱 WhatsApp Share Module loaded - One Click Magic! 🚀');
