// ==================== QUOTATIONS ACTIONS ====================
// Status actions, project conversion, sharing, print, email

// ==================== STATUS ACTIONS ====================
function markQuotationSent(quotationId) {
    const quotation = quotations.find(q => q.id === quotationId);
    if (!quotation) return;
    
    quotation.status = 'sent';
    quotation.sentAt = new Date().toISOString();
    quotation.updatedAt = new Date().toISOString();
    
    saveQuotations();
    renderQuotations();
    updateQuotationStats();
    viewQuotationDetail(quotationId);
    showToast('Quotation marked as sent!', 'success');
}

function acceptQuotation(quotationId) {
    const quotation = quotations.find(q => q.id === quotationId);
    if (!quotation) return;
    
    if (!confirm('Accept this quotation and create a new project?\n\nThis will convert the quotation into an active project for tracking and payments.')) {
        return;
    }
    
    // Create project from quotation
    const project = {
        id: 'PROJ' + Date.now(),
        projectNo: quotation.quotationNo.replace('QT', 'PRJ'),
        name: quotation.subject || `Project for ${quotation.customerName}`,
        description: generateProjectDescription(quotation),
        customerId: quotation.customerId,
        customerName: quotation.customerName,
        totalAmount: quotation.totalAmount,
        amountPaid: 0,
        startDate: new Date().toISOString().split('T')[0],
        endDate: '',
        status: 'confirmed',
        milestones: generateDefaultMilestones(quotation.totalAmount),
        paymentHistory: [],
        quotationId: quotationId,
        quotationNo: quotation.quotationNo,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };
    
    // Add to projects
    if (typeof projects !== 'undefined') {
        projects.push(project);
        if (typeof saveProjects === 'function') saveProjects();
        if (typeof renderProjects === 'function') renderProjects();
        if (typeof updateProjectStats === 'function') updateProjectStats();
    }
    
    // Update quotation status
    quotation.status = 'accepted';
    quotation.acceptedAt = new Date().toISOString();
    quotation.updatedAt = new Date().toISOString();
    quotation.projectId = project.id;
    
    saveQuotations();
    renderQuotations();
    updateQuotationStats();
    closeModal('quotationDetailModal');
    
    showToast('Quotation accepted! Project created successfully.', 'success');
    
    // Navigate to projects section
    setTimeout(() => {
        if (typeof showSection === 'function') {
            showSection('projects');
            // Open the new project detail
            if (typeof viewProjectDetail === 'function') {
                viewProjectDetail(project.id);
            }
        }
    }, 500);
}

function generateProjectDescription(quotation) {
    let desc = '';
    if (quotation.subject) {
        desc += quotation.subject + '\n\n';
    }
    desc += 'Items:\n';
    (quotation.items || []).forEach((item, i) => {
        desc += `${i + 1}. ${item.description} (Qty: ${item.quantity}, RM ${item.lineTotal?.toFixed(2)})\n`;
    });
    desc += `\nTotal: RM ${quotation.totalAmount?.toFixed(2)}`;
    return desc;
}

function generateDefaultMilestones(totalAmount) {
    return [
        {
            name: 'Deposit (50%)',
            percentage: 50,
            amount: totalAmount * 0.5,
            dueDate: '',
            status: 'pending',
            paidAmount: 0
        },
        {
            name: 'Final Payment (50%)',
            percentage: 50,
            amount: totalAmount * 0.5,
            dueDate: '',
            status: 'pending',
            paidAmount: 0
        }
    ];
}

function rejectQuotation(quotationId) {
    const quotation = quotations.find(q => q.id === quotationId);
    if (!quotation) return;
    
    const reason = prompt('Reason for rejection (optional):');
    
    quotation.status = 'rejected';
    quotation.rejectedAt = new Date().toISOString();
    quotation.rejectionReason = reason || '';
    quotation.updatedAt = new Date().toISOString();
    
    saveQuotations();
    renderQuotations();
    updateQuotationStats();
    viewQuotationDetail(quotationId);
    showToast('Quotation marked as rejected.', 'info');
}

function duplicateQuotation(quotationId) {
    const quotation = quotations.find(q => q.id === quotationId);
    if (!quotation) return;
    
    // Create duplicate with new ID and dates
    const duplicate = {
        ...JSON.parse(JSON.stringify(quotation)),
        id: 'QT' + Date.now(),
        quotationNo: generateQuotationNo(),
        date: new Date().toISOString().split('T')[0],
        status: 'draft',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };
    
    // Set new validity period
    const validDate = new Date();
    validDate.setDate(validDate.getDate() + 30);
    duplicate.validUntil = validDate.toISOString().split('T')[0];
    
    // Remove links to old data
    delete duplicate.sentAt;
    delete duplicate.acceptedAt;
    delete duplicate.rejectedAt;
    delete duplicate.rejectionReason;
    delete duplicate.projectId;
    
    quotations.push(duplicate);
    saveQuotations();
    renderQuotations();
    updateQuotationStats();
    closeModal('quotationDetailModal');
    
    // Open the duplicate for editing
    showQuotationModal(duplicate.id);
    showToast('Quotation duplicated! You can now edit and send.', 'success');
}

function deleteQuotation(quotationId) {
    const quotation = quotations.find(q => q.id === quotationId);
    if (!quotation) return;
    
    if (!confirm(`Delete quotation ${quotation.quotationNo}?\n\nThis cannot be undone.`)) {
        return;
    }
    
    const index = quotations.findIndex(q => q.id === quotationId);
    if (index !== -1) {
        quotations.splice(index, 1);
        saveQuotations();
        renderQuotations();
        updateQuotationStats();
        closeModal('quotationDetailModal');
        showToast('Quotation deleted!', 'success');
    }
}

// ==================== PRINT QUOTATION ====================
function printQuotation(quotationId) {
    const quotation = quotations.find(q => q.id === quotationId);
    if (!quotation) return;
    
    // Get customer details
    let customerInfo = { name: quotation.customerName, company: quotation.customerCompany };
    if (typeof crmCustomers !== 'undefined' && quotation.customerId) {
        const customer = crmCustomers.find(c => c.id === quotation.customerId);
        if (customer) {
            customerInfo = customer;
        }
    }
    
    // Get business info
    let businessName = 'Your Business';
    let businessAddress = '';
    let businessPhone = '';
    let businessEmail = '';
    if (typeof businessData !== 'undefined' && businessData.settings) {
        businessName = businessData.settings.businessName || businessName;
        businessAddress = businessData.settings.businessAddress || '';
        businessPhone = businessData.settings.businessPhone || '';
        businessEmail = businessData.settings.businessEmail || '';
    }
    
    const printContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Quotation ${quotation.quotationNo}</title>
            <style>
                * { margin: 0; padding: 0; box-sizing: border-box; }
                body { font-family: 'Segoe UI', Arial, sans-serif; padding: 40px; color: #333; }
                .header { display: flex; justify-content: space-between; margin-bottom: 40px; }
                .company-info h1 { font-size: 24px; color: #2563eb; margin-bottom: 5px; }
                .company-info p { font-size: 12px; color: #666; }
                .quotation-title { text-align: right; }
                .quotation-title h2 { font-size: 28px; color: #333; margin-bottom: 5px; }
                .quotation-title .number { font-size: 14px; color: #666; }
                .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 30px; margin-bottom: 30px; }
                .info-section h3 { font-size: 12px; text-transform: uppercase; color: #666; margin-bottom: 10px; border-bottom: 1px solid #eee; padding-bottom: 5px; }
                .info-section p { font-size: 13px; margin-bottom: 3px; }
                .items-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
                .items-table th { background: #f8fafc; padding: 12px; text-align: left; font-size: 12px; text-transform: uppercase; color: #666; border-bottom: 2px solid #e2e8f0; }
                .items-table td { padding: 12px; border-bottom: 1px solid #e2e8f0; font-size: 13px; }
                .items-table .qty { text-align: center; }
                .items-table .amount { text-align: right; }
                .totals { margin-left: auto; width: 300px; }
                .totals .row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee; font-size: 13px; }
                .totals .row.grand { font-weight: bold; font-size: 16px; color: #2563eb; border-bottom: 2px solid #2563eb; }
                .terms { margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; }
                .terms h3 { font-size: 12px; text-transform: uppercase; color: #666; margin-bottom: 10px; }
                .terms p { font-size: 12px; color: #666; white-space: pre-line; }
                .footer { margin-top: 50px; text-align: center; font-size: 11px; color: #999; }
                @media print { body { padding: 20px; } }
            </style>
        </head>
        <body>
            <div class="header">
                <div class="company-info">
                    <h1>${escapeHtml(businessName)}</h1>
                    ${businessAddress ? `<p>${escapeHtml(businessAddress)}</p>` : ''}
                    ${businessPhone ? `<p>Tel: ${escapeHtml(businessPhone)}</p>` : ''}
                    ${businessEmail ? `<p>Email: ${escapeHtml(businessEmail)}</p>` : ''}
                </div>
                <div class="quotation-title">
                    <h2>QUOTATION</h2>
                    <div class="number">${escapeHtml(quotation.quotationNo)}</div>
                </div>
            </div>
            
            <div class="info-grid">
                <div class="info-section">
                    <h3>Bill To</h3>
                    <p><strong>${escapeHtml(customerInfo.name)}</strong></p>
                    ${customerInfo.company ? `<p>${escapeHtml(customerInfo.company)}</p>` : ''}
                    ${customerInfo.address ? `<p>${escapeHtml(customerInfo.address)}</p>` : ''}
                    ${customerInfo.phone ? `<p>Tel: ${escapeHtml(customerInfo.phone)}</p>` : ''}
                    ${customerInfo.email ? `<p>Email: ${escapeHtml(customerInfo.email)}</p>` : ''}
                </div>
                <div class="info-section">
                    <h3>Quotation Details</h3>
                    <p><strong>Date:</strong> ${formatDate(quotation.date)}</p>
                    <p><strong>Valid Until:</strong> ${formatDate(quotation.validUntil)}</p>
                    ${quotation.subject ? `<p><strong>Subject:</strong> ${escapeHtml(quotation.subject)}</p>` : ''}
                </div>
            </div>
            
            <table class="items-table">
                <thead>
                    <tr>
                        <th style="width: 50%;">Description</th>
                        <th class="qty" style="width: 15%;">Qty</th>
                        <th class="amount" style="width: 17.5%;">Unit Price</th>
                        <th class="amount" style="width: 17.5%;">Amount</th>
                    </tr>
                </thead>
                <tbody>
                    ${(quotation.items || []).map(item => `
                        <tr>
                            <td>${escapeHtml(item.description)}</td>
                            <td class="qty">${item.quantity}</td>
                            <td class="amount">RM ${item.unitPrice?.toFixed(2)}</td>
                            <td class="amount">RM ${item.lineTotal?.toFixed(2)}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
            
            <div class="totals">
                <div class="row">
                    <span>Subtotal:</span>
                    <span>RM ${quotation.subtotal?.toFixed(2)}</span>
                </div>
                ${quotation.discount > 0 ? `
                <div class="row">
                    <span>Discount (${quotation.discount}%):</span>
                    <span>- RM ${quotation.discountAmount?.toFixed(2)}</span>
                </div>
                ` : ''}
                ${quotation.taxRate > 0 ? `
                <div class="row">
                    <span>SST/Tax (${quotation.taxRate}%):</span>
                    <span>+ RM ${quotation.taxAmount?.toFixed(2)}</span>
                </div>
                ` : ''}
                <div class="row grand">
                    <span>Grand Total:</span>
                    <span>RM ${quotation.totalAmount?.toFixed(2)}</span>
                </div>
            </div>
            
            ${quotation.notes ? `
            <div class="terms">
                <h3>Notes</h3>
                <p>${escapeHtml(quotation.notes)}</p>
            </div>
            ` : ''}
            
            ${quotation.terms ? `
            <div class="terms">
                <h3>Terms & Conditions</h3>
                <p>${escapeHtml(quotation.terms)}</p>
            </div>
            ` : ''}
            
            <div class="footer">
                <p>This is a computer-generated document. No signature is required.</p>
                <p>Thank you for your business!</p>
            </div>
            
            <script>window.onload = function() { window.print(); }</script>
        </body>
        </html>
    `;
    
    const printWindow = window.open('', '_blank');
    printWindow.document.write(printContent);
    printWindow.document.close();
}

// ==================== WHATSAPP QUOTATION ====================
function shareQuotationWhatsApp(quotationId) {
    const quotation = quotations.find(q => q.id === quotationId);
    if (!quotation) {
        showNotification('Quotation not found', 'error');
        return;
    }
    
    const settings = JSON.parse(localStorage.getItem('companySettings') || '{}');
    const businessName = settings.businessName || window.businessData?.settings?.businessName || 'A Lazy Human';
    
    let message = `*${businessName}*\n`;
    message += `━━━━━━━━━━━━━━━━\n`;
    message += `📋 *Quotation: ${quotation.quotationNo}*\n`;
    message += `📅 Date: ${quotation.date}\n`;
    message += `⏰ Valid Until: ${quotation.validUntil || 'N/A'}\n`;
    message += `👤 Customer: ${quotation.customerName}\n\n`;
    
    message += `*Items:*\n`;
    if (quotation.items && quotation.items.length > 0) {
        quotation.items.forEach(item => {
            message += `• ${item.description}\n`;
            message += `   Qty: ${item.quantity} × RM ${parseFloat(item.unitPrice).toFixed(2)} = RM ${parseFloat(item.total).toFixed(2)}\n`;
        });
    }
    
    message += `\n━━━━━━━━━━━━━━━━\n`;
    message += `Subtotal: RM ${parseFloat(quotation.subtotal || 0).toFixed(2)}\n`;
    if (quotation.discount > 0) {
        message += `Discount: -RM ${parseFloat(quotation.discount).toFixed(2)}\n`;
    }
    if (quotation.tax > 0) {
        message += `Tax: RM ${parseFloat(quotation.tax).toFixed(2)}\n`;
    }
    message += `*TOTAL: RM ${parseFloat(quotation.total).toFixed(2)}*\n`;
    message += `━━━━━━━━━━━━━━━━\n\n`;
    
    if (quotation.notes) {
        message += `📝 Notes: ${quotation.notes}\n\n`;
    }
    
    message += `Please reply to confirm or if you have any questions. Thank you! 🙏`;
    
    const encoded = encodeURIComponent(message);
    window.open(`https://wa.me/?text=${encoded}`, '_blank');
    
    showNotification('Opening WhatsApp...', 'success');
}

// ==================== EMAIL QUOTATION ====================
function emailQuotation(quotationId) {
    const quotation = quotations.find(q => q.id === quotationId);
    if (!quotation) {
        showNotification('Error', 'Quotation not found', 'error');
        return;
    }

    // Get customer email
    let customerEmail = '';
    let customerName = quotation.customerName || 'Valued Customer';
    
    if (typeof crmCustomers !== 'undefined' && quotation.customerId) {
        const customer = crmCustomers.find(c => c.id === quotation.customerId);
        if (customer) {
            customerEmail = customer.email || '';
            customerName = customer.name || customerName;
        }
    }

    // Get company settings
    const settings = JSON.parse(localStorage.getItem('companySettings') || '{}');
    const companyName = settings.businessName || 'Our Company';

    // Build items list
    let itemsList = '';
    if (quotation.items && quotation.items.length > 0) {
        itemsList = quotation.items.map((item, i) => 
            `${i + 1}. ${item.description} - Qty: ${item.quantity} x RM ${parseFloat(item.unitPrice).toFixed(2)} = RM ${parseFloat(item.total).toFixed(2)}`
        ).join('%0D%0A');
    }

    // Build email subject
    const subject = encodeURIComponent(`Quotation ${quotation.quotationNo} from ${companyName}`);

    // Build email body
    const body = encodeURIComponent(
`Dear ${customerName},

Please find below the details of your quotation:

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
QUOTATION: ${quotation.quotationNo}
Date: ${formatDate(quotation.date)}
Valid Until: ${formatDate(quotation.validUntil)}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${quotation.subject ? `Subject: ${quotation.subject}\n\n` : ''}ITEMS:
${itemsList}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Subtotal: RM ${parseFloat(quotation.subtotal || 0).toFixed(2)}
${quotation.discountPercent > 0 ? `Discount (${quotation.discountPercent}%): - RM ${parseFloat(quotation.discountAmount || 0).toFixed(2)}\n` : ''}${quotation.taxPercent > 0 ? `Tax/SST (${quotation.taxPercent}%): + RM ${parseFloat(quotation.taxAmount || 0).toFixed(2)}\n` : ''}GRAND TOTAL: RM ${parseFloat(quotation.grandTotal || 0).toFixed(2)}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${quotation.notes ? `Note: ${quotation.notes}\n\n` : ''}${quotation.terms ? `Terms & Conditions:\n${quotation.terms}\n\n` : ''}
Please let us know if you have any questions or would like to proceed with this quotation.

Thank you for your business!

Best regards,
${companyName}
`);

    // Open mailto link
    const mailtoLink = `mailto:${customerEmail}?subject=${subject}&body=${body}`;
    window.location.href = mailtoLink;

    showNotification('Email Opened', 'Your email app should open with the quotation details. Please send the email manually.', 'success');
}

// ==================== WINDOW EXPORTS ====================
window.markQuotationSent = markQuotationSent;
window.acceptQuotation = acceptQuotation;
window.generateProjectDescription = generateProjectDescription;
window.generateDefaultMilestones = generateDefaultMilestones;
window.rejectQuotation = rejectQuotation;
window.duplicateQuotation = duplicateQuotation;
window.deleteQuotation = deleteQuotation;
window.printQuotation = printQuotation;
window.shareQuotationWhatsApp = shareQuotationWhatsApp;
window.emailQuotation = emailQuotation;
