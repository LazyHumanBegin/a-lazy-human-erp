/**
 * EZCubic Phase 2 - POS Receipt Module
 * Receipt display, print, email functions
 */

// ==================== RECEIPT DISPLAY ====================
function showReceipt(sale) {
    const modal = document.getElementById('receiptModal');
    const content = document.getElementById('receiptContent');
    
    if (!modal || !content) {
        console.error('Receipt modal or content element not found');
        return;
    }
    
    const settings = typeof getPlatformSettings === 'function' ? getPlatformSettings() : 
        JSON.parse(localStorage.getItem('companySettings') || '{}');
    
    const businessName = settings.businessName || 'A Lazy Human Business';
    const businessAddress = settings.businessAddress || '';
    const sst = settings.sstNumber || '';
    const branchName = sale.branchName || 'Main Branch';
    
    content.innerHTML = `
        <div class="receipt">
            <div class="receipt-header">
                <h2>${escapeHtml(businessName)}</h2>
                <p style="font-weight: 600; color: #2563eb;"><i class="fas fa-store"></i> ${escapeHtml(branchName)}</p>
                ${businessAddress ? `<p>${escapeHtml(businessAddress)}</p>` : ''}
                ${sst ? `<p>SST No: ${sst}</p>` : ''}
            </div>
            <div class="receipt-divider">================================</div>
            <div class="receipt-info">
                <div><strong>Receipt:</strong> ${sale.receiptNo}</div>
                <div><strong>Date:</strong> ${typeof formatMalaysiaDateTime === 'function' ? formatMalaysiaDateTime(sale.date) : new Date(sale.date).toLocaleString('en-MY', { timeZone: 'Asia/Kuala_Lumpur' })}</div>
                <div><strong>Customer:</strong> ${escapeHtml(sale.customerName)}</div>
                ${sale.salesperson ? `<div><strong>Served by:</strong> ${escapeHtml(sale.salesperson)}</div>` : ''}
            </div>
            <div class="receipt-divider">================================</div>
            <div class="receipt-items">
                ${sale.items.map(item => `
                    <div class="receipt-item">
                        <div class="item-name">${escapeHtml(item.name)}</div>
                        <div class="item-details">
                            ${item.quantity} x RM${item.price.toFixed(2)}
                            <span class="item-total">RM${(item.quantity * item.price).toFixed(2)}</span>
                        </div>
                        ${item.memo ? `<div class="item-memo" style="font-size: 10px; color: #666; padding-left: 10px;"><i>📝 ${escapeHtml(item.memo)}</i></div>` : ''}
                    </div>
                `).join('')}
            </div>
            <div class="receipt-divider">--------------------------------</div>
            <div class="receipt-totals">
                <div class="total-row">
                    <span>Subtotal:</span>
                    <span>RM ${sale.subtotal.toFixed(2)}</span>
                </div>
                ${sale.discount > 0 ? `
                <div class="total-row">
                    <span>Discount:</span>
                    <span>-RM ${sale.discount.toFixed(2)}</span>
                </div>
                ` : ''}
                <div class="total-row">
                    <span>Tax (6% SST):</span>
                    <span>RM ${sale.tax.toFixed(2)}</span>
                </div>
                <div class="total-row grand-total">
                    <span>TOTAL:</span>
                    <span>RM ${sale.total.toFixed(2)}</span>
                </div>
            </div>
            <div class="receipt-divider">--------------------------------</div>
            <div class="receipt-payment">
                <div><strong>Payment:</strong> ${capitalizeFirst(sale.paymentMethod)}</div>
                ${sale.paymentMethod === 'cash' ? `
                <div>Received: RM ${sale.amountReceived.toFixed(2)}</div>
                <div>Change: RM ${sale.change.toFixed(2)}</div>
                ` : ''}
            </div>
            <div class="receipt-divider">================================</div>
            <div class="receipt-footer">
                <p>Thank you for your purchase!</p>
                <p>Terima kasih atas pembelian anda!</p>
            </div>
        </div>
    `;
    
    // Store for printing
    window.lastReceipt = sale;
    
    modal.style.display = '';
    modal.classList.add('show');
}

function closeReceiptModal() {
    const modal = document.getElementById('receiptModal');
    if (modal) {
        modal.classList.remove('show');
        modal.style.display = 'none';
    }
}

// ==================== PRINT RECEIPT ====================
function printReceipt() {
    const content = document.getElementById('receiptContent');
    if (!content) return;
    
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Receipt</title>
            <style>
                body { font-family: 'Courier New', monospace; font-size: 12px; width: 280px; margin: 0 auto; }
                .receipt { padding: 10px; }
                .receipt-header { text-align: center; margin-bottom: 10px; }
                .receipt-header h2 { margin: 0; font-size: 14px; }
                .receipt-divider { text-align: center; margin: 5px 0; }
                .receipt-item { margin: 5px 0; }
                .item-details { display: flex; justify-content: space-between; padding-left: 10px; }
                .total-row { display: flex; justify-content: space-between; }
                .grand-total { font-weight: bold; font-size: 14px; margin-top: 5px; }
                .receipt-footer { text-align: center; margin-top: 10px; font-size: 10px; }
                @media print { body { width: 100%; } }
            </style>
        </head>
        <body>${content.innerHTML}</body>
        </html>
    `);
    printWindow.document.close();
    printWindow.print();
}

// ==================== EMAIL RECEIPT ====================
function emailReceipt() {
    const sale = window.lastReceipt;
    if (!sale) {
        showNotification('No receipt to email', 'error');
        return;
    }

    // Get company settings
    const settings = typeof getPlatformSettings === 'function' ? getPlatformSettings() : 
        JSON.parse(localStorage.getItem('companySettings') || '{}');
    const companyName = settings.businessName || 'Our Store';

    // Build items list
    const itemsList = sale.items.map((item, i) => 
        `${i + 1}. ${item.name} x ${item.quantity} @ RM${item.price.toFixed(2)} = RM${(item.quantity * item.price).toFixed(2)}`
    ).join('%0D%0A');

    // Build email subject
    const subject = encodeURIComponent(`Receipt from ${companyName} - ${sale.receiptNo}`);

    // Build email body
    const body = encodeURIComponent(
`Thank you for shopping at ${companyName}!

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
RECEIPT: ${sale.receiptNo}
Date: ${sale.date} ${sale.time || ''}
Cashier: ${sale.cashier || sale.salesperson || 'Staff'}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

ITEMS:
${itemsList}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Subtotal: RM ${sale.subtotal.toFixed(2)}
${sale.discount > 0 ? `Discount: - RM ${sale.discount.toFixed(2)}\n` : ''}Tax (6% SST): RM ${sale.tax.toFixed(2)}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TOTAL: RM ${sale.total.toFixed(2)}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Payment Method: ${sale.paymentMethod.charAt(0).toUpperCase() + sale.paymentMethod.slice(1)}
${sale.paymentMethod === 'cash' ? `Amount Received: RM ${sale.amountReceived.toFixed(2)}\nChange: RM ${sale.change.toFixed(2)}` : ''}

Thank you for your purchase!
Terima kasih atas pembelian anda!

${companyName}
`);

    // Open mailto link
    const mailtoLink = `mailto:?subject=${subject}&body=${body}`;
    window.location.href = mailtoLink;

    showNotification('Your email app should open with the receipt details. Add the customer email and send.', 'success');
}

// ==================== HELPER FUNCTIONS ====================
function capitalizeFirst(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
}

// ==================== WINDOW EXPORTS (Receipt) ====================
window.showReceipt = showReceipt;
window.closeReceiptModal = closeReceiptModal;
window.printReceipt = printReceipt;
window.emailReceipt = emailReceipt;

console.log('POS Receipt module loaded');
