// ==================== ADDONS-REPORTS-PDF.JS ====================
// EZCubic - PDF Generation Templates - Split from addons-reports.js v2.3.2
// Quotation PDF Export, Invoice PDF Export, Template Selection

// ==================== QUOTATION PDF TEMPLATES ====================
const quotationTemplates = {
    modern: {
        name: 'Modern',
        primaryColor: '#2563eb',
        headerBg: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
        style: 'clean'
    },
    classic: {
        name: 'Classic',
        primaryColor: '#1e293b',
        headerBg: '#1e293b',
        style: 'traditional'
    },
    minimal: {
        name: 'Minimal',
        primaryColor: '#374151',
        headerBg: '#ffffff',
        style: 'simple'
    },
    professional: {
        name: 'Professional',
        primaryColor: '#059669',
        headerBg: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
        style: 'corporate'
    }
};

function getSelectedTemplate() {
    return localStorage.getItem('ezcubic_quotation_template') || 'modern';
}

function setQuotationTemplate(templateId) {
    localStorage.setItem('ezcubic_quotation_template', templateId);
    showNotification(`Template changed to ${quotationTemplates[templateId]?.name || 'Modern'}`, 'success');
}

function showTemplateSelector() {
    const current = getSelectedTemplate();
    
    const modal = document.createElement('div');
    modal.id = 'templateSelectorModal';
    modal.innerHTML = `
        <div style="position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 99999; 
                    display: flex; align-items: center; justify-content: center; padding: 20px;"
             onclick="if(event.target === this) this.remove()">
            <div style="background: white; border-radius: 16px; width: 100%; max-width: 700px; 
                        box-shadow: 0 20px 50px rgba(0,0,0,0.3); overflow: hidden;">
                <div style="padding: 20px; background: linear-gradient(135deg, #2563eb, #1d4ed8); color: white;">
                    <h3 style="margin: 0;"><i class="fas fa-palette"></i> Choose Quotation Template</h3>
                </div>
                <div style="padding: 20px; display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px;">
                    ${Object.entries(quotationTemplates).map(([id, t]) => `
                        <div onclick="setQuotationTemplate('${id}'); document.getElementById('templateSelectorModal').remove();"
                             style="border: 2px solid ${current === id ? '#2563eb' : '#e2e8f0'}; border-radius: 12px; 
                                    padding: 15px; cursor: pointer; transition: all 0.2s;
                                    ${current === id ? 'background: #eff6ff;' : ''}"
                             onmouseover="this.style.borderColor='#2563eb'" 
                             onmouseout="this.style.borderColor='${current === id ? '#2563eb' : '#e2e8f0'}'">
                            <div style="height: 80px; background: ${t.headerBg}; border-radius: 8px; margin-bottom: 10px;
                                        display: flex; align-items: center; justify-content: center; color: ${t.style === 'simple' ? '#374151' : 'white'};">
                                <span style="font-weight: 600;">QUOTATION</span>
                            </div>
                            <div style="display: flex; justify-content: space-between; align-items: center;">
                                <span style="font-weight: 600; color: #1e293b;">${t.name}</span>
                                ${current === id ? '<i class="fas fa-check-circle" style="color: #2563eb;"></i>' : ''}
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

function generateQuotationPDF(quotationId) {
    const quotations = window.quotations || [];
    const quotation = quotations.find(q => q.id == quotationId);
    if (!quotation) {
        showNotification('Quotation not found', 'error');
        return;
    }
    
    const template = quotationTemplates[getSelectedTemplate()] || quotationTemplates.modern;
    const logo = getCompanyLogo();
    
    // Get company details
    const settings = window.businessData?.settings || {};
    const companyName = settings.businessName || 'Your Company';
    const companyAddress = settings.businessAddress || localStorage.getItem('ezcubic_business_address') || '';
    const companyPhone = settings.businessPhone || localStorage.getItem('ezcubic_business_phone') || '';
    const companyEmail = settings.businessEmail || localStorage.getItem('ezcubic_business_email') || '';
    const companyWebsite = settings.businessWebsite || localStorage.getItem('ezcubic_business_website') || '';
    const companySSM = settings.ssmNumber || '';
    const bankAccount = settings.businessBankAccount || localStorage.getItem('ezcubic_business_bank') || '';
    
    // Get customer info
    let customerInfo = { name: quotation.customerName, company: quotation.customerCompany };
    if (typeof crmCustomers !== 'undefined' && quotation.customerId) {
        const customer = crmCustomers.find(c => c.id === quotation.customerId);
        if (customer) customerInfo = customer;
    }
    
    const pdfContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Quotation ${quotation.quotationNo}</title>
            <style>
                * { margin: 0; padding: 0; box-sizing: border-box; }
                body { font-family: 'Segoe UI', Arial, sans-serif; color: #333; background: white; }
                .page { max-width: 800px; margin: 0 auto; padding: 40px; }
                
                .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 3px solid ${template.primaryColor}; }
                .company-section { display: flex; gap: 20px; align-items: center; }
                .company-logo { width: 80px; height: 80px; object-fit: contain; }
                .company-logo-placeholder { width: 80px; height: 80px; background: #f1f5f9; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: #94a3b8; font-size: 32px; }
                .company-info h1 { font-size: 22px; color: ${template.primaryColor}; margin-bottom: 5px; }
                .company-info p { font-size: 11px; color: #64748b; line-height: 1.4; }
                
                .doc-title { text-align: right; }
                .doc-title h2 { font-size: 28px; color: ${template.primaryColor}; letter-spacing: 2px; }
                .doc-title .number { font-size: 14px; color: #64748b; margin-top: 5px; }
                
                .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 30px; margin-bottom: 30px; }
                .info-box { background: #f8fafc; padding: 15px; border-radius: 8px; border-left: 3px solid ${template.primaryColor}; }
                .info-box h3 { font-size: 11px; text-transform: uppercase; color: ${template.primaryColor}; margin-bottom: 10px; letter-spacing: 1px; }
                .info-box p { font-size: 12px; margin-bottom: 3px; color: #334155; }
                .info-box strong { color: #1e293b; }
                
                table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
                th { background: ${template.primaryColor}; color: white; padding: 12px; text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; }
                td { padding: 12px; border-bottom: 1px solid #e2e8f0; font-size: 12px; }
                .text-right { text-align: right; }
                .text-center { text-align: center; }
                
                .totals { margin-left: auto; width: 280px; }
                .totals .row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e2e8f0; font-size: 13px; }
                .totals .row.grand { background: ${template.primaryColor}; color: white; padding: 12px; margin-top: 10px; border-radius: 6px; font-weight: bold; font-size: 15px; }
                
                .terms { margin-top: 30px; padding: 20px; background: #f8fafc; border-radius: 8px; }
                .terms h3 { font-size: 12px; color: ${template.primaryColor}; margin-bottom: 10px; text-transform: uppercase; }
                .terms p { font-size: 11px; color: #64748b; white-space: pre-line; line-height: 1.6; }
                
                .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e2e8f0; text-align: center; font-size: 10px; color: #94a3b8; }
                .bank-info { background: #fef3c7; padding: 15px; border-radius: 8px; margin-top: 20px; }
                .bank-info h4 { font-size: 11px; color: #92400e; margin-bottom: 8px; }
                .bank-info p { font-size: 12px; color: #78350f; }
                
                @media print { 
                    body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
                    .page { padding: 20px; }
                    .no-print { display: none; }
                }
            </style>
        </head>
        <body>
            <div class="page">
                <div class="header">
                    <div class="company-section">
                        ${logo ? `<img src="${logo}" class="company-logo" alt="Logo">` : `<div class="company-logo-placeholder">🏢</div>`}
                        <div class="company-info">
                            <h1>${escapeHtml(companyName)}</h1>
                            ${companySSM ? `<p><strong>Reg No:</strong> ${escapeHtml(companySSM)}</p>` : ''}
                            ${companyAddress ? `<p>${escapeHtml(companyAddress)}</p>` : ''}
                            ${companyPhone ? `<p>Tel: ${escapeHtml(companyPhone)}</p>` : ''}
                            ${companyEmail ? `<p>Email: ${escapeHtml(companyEmail)}</p>` : ''}
                            ${companyWebsite ? `<p>Web: ${escapeHtml(companyWebsite)}</p>` : ''}
                        </div>
                    </div>
                    <div class="doc-title">
                        <h2>QUOTATION</h2>
                        <div class="number">${escapeHtml(quotation.quotationNo)}</div>
                    </div>
                </div>
                
                <div class="info-grid">
                    <div class="info-box">
                        <h3>Bill To</h3>
                        <p><strong>${escapeHtml(customerInfo.name)}</strong></p>
                        ${customerInfo.company ? `<p>${escapeHtml(customerInfo.company)}</p>` : ''}
                        ${customerInfo.address ? `<p>${escapeHtml(customerInfo.address)}</p>` : ''}
                        ${customerInfo.phone ? `<p>Tel: ${escapeHtml(customerInfo.phone)}</p>` : ''}
                        ${customerInfo.email ? `<p>Email: ${escapeHtml(customerInfo.email)}</p>` : ''}
                    </div>
                    <div class="info-box">
                        <h3>Quotation Details</h3>
                        <p><strong>Date:</strong> ${quotation.date}</p>
                        <p><strong>Valid Until:</strong> ${quotation.validUntil}</p>
                        ${quotation.subject ? `<p><strong>Subject:</strong> ${escapeHtml(quotation.subject)}</p>` : ''}
                        ${quotation.salesperson ? `<p><strong>Salesperson:</strong> ${escapeHtml(quotation.salesperson)}</p>` : ''}
                    </div>
                </div>
                
                <table>
                    <thead>
                        <tr>
                            <th style="width: 5%;">#</th>
                            <th style="width: 45%;">Description</th>
                            <th class="text-center" style="width: 12%;">Qty</th>
                            <th class="text-right" style="width: 19%;">Unit Price</th>
                            <th class="text-right" style="width: 19%;">Amount</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${(quotation.items || []).map((item, i) => `
                            <tr>
                                <td>${i + 1}</td>
                                <td>${escapeHtml(item.description)}</td>
                                <td class="text-center">${item.quantity}</td>
                                <td class="text-right">RM ${parseFloat(item.unitPrice || 0).toFixed(2)}</td>
                                <td class="text-right">RM ${parseFloat(item.total || item.lineTotal || 0).toFixed(2)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
                
                <div class="totals">
                    <div class="row">
                        <span>Subtotal:</span>
                        <span>RM ${parseFloat(quotation.subtotal || 0).toFixed(2)}</span>
                    </div>
                    ${quotation.discount > 0 ? `
                    <div class="row">
                        <span>Discount (${quotation.discount}%):</span>
                        <span>- RM ${parseFloat(quotation.discountAmount || 0).toFixed(2)}</span>
                    </div>
                    ` : ''}
                    ${quotation.taxRate > 0 ? `
                    <div class="row">
                        <span>SST/Tax (${quotation.taxRate}%):</span>
                        <span>+ RM ${parseFloat(quotation.taxAmount || 0).toFixed(2)}</span>
                    </div>
                    ` : ''}
                    <div class="row grand">
                        <span>TOTAL</span>
                        <span>RM ${parseFloat(quotation.totalAmount || quotation.total || 0).toFixed(2)}</span>
                    </div>
                </div>
                
                ${bankAccount ? `
                <div class="bank-info">
                    <h4>💳 Payment Details</h4>
                    <p>${escapeHtml(bankAccount)}</p>
                </div>
                ` : ''}
                
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
                
                <div class="no-print" style="text-align: center; margin-top: 30px; padding: 20px; background: #f0f9ff; border-radius: 10px;">
                    <button onclick="window.print()" style="padding: 12px 30px; background: ${template.primaryColor}; color: white; border: none; border-radius: 8px; font-size: 14px; cursor: pointer; margin-right: 10px;">
                        <i class="fas fa-print"></i> Print / Save as PDF
                    </button>
                    <button onclick="window.close()" style="padding: 12px 30px; background: #64748b; color: white; border: none; border-radius: 8px; font-size: 14px; cursor: pointer;">
                        Close
                    </button>
                    <p style="margin-top: 10px; font-size: 12px; color: #64748b;">
                        💡 Tip: To save as PDF, choose "Save as PDF" as your printer
                    </p>
                </div>
            </div>
        </body>
        </html>
    `;
    
    const pdfWindow = window.open('', '_blank');
    pdfWindow.document.write(pdfContent);
    pdfWindow.document.close();
}

// Helper for escaping HTML
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ==================== INVOICE PDF TEMPLATES ====================
const invoiceTemplates = {
    modern: {
        name: 'Modern',
        primaryColor: '#2563eb',
        headerBg: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
        style: 'clean'
    },
    classic: {
        name: 'Classic',
        primaryColor: '#1e293b',
        headerBg: '#1e293b',
        style: 'traditional'
    },
    minimal: {
        name: 'Minimal',
        primaryColor: '#374151',
        headerBg: '#ffffff',
        style: 'simple'
    },
    professional: {
        name: 'Professional',
        primaryColor: '#059669',
        headerBg: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
        style: 'corporate'
    },
    elegant: {
        name: 'Elegant',
        primaryColor: '#7c3aed',
        headerBg: 'linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%)',
        style: 'premium'
    }
};

function getSelectedInvoiceTemplate() {
    return localStorage.getItem('ezcubic_invoice_template') || 'modern';
}

function setInvoiceTemplate(templateId) {
    localStorage.setItem('ezcubic_invoice_template', templateId);
    showNotification(`Invoice template changed to ${invoiceTemplates[templateId]?.name || 'Modern'}`, 'success');
}

function showInvoiceTemplateSelector() {
    const current = getSelectedInvoiceTemplate();
    
    const modal = document.createElement('div');
    modal.id = 'invoiceTemplateSelectorModal';
    modal.innerHTML = `
        <div style="position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 99999; 
                    display: flex; align-items: center; justify-content: center; padding: 20px;"
             onclick="if(event.target === this) this.remove()">
            <div style="background: white; border-radius: 16px; width: 100%; max-width: 800px; 
                        box-shadow: 0 20px 50px rgba(0,0,0,0.3); overflow: hidden;">
                <div style="padding: 20px; background: linear-gradient(135deg, #2563eb, #1d4ed8); color: white;">
                    <h3 style="margin: 0;"><i class="fas fa-palette"></i> Choose Invoice Template</h3>
                </div>
                <div style="padding: 20px; display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px;">
                    ${Object.entries(invoiceTemplates).map(([id, t]) => `
                        <div onclick="setInvoiceTemplate('${id}'); document.getElementById('invoiceTemplateSelectorModal').remove();"
                             style="border: 2px solid ${current === id ? '#2563eb' : '#e2e8f0'}; border-radius: 12px; 
                                    padding: 15px; cursor: pointer; transition: all 0.2s;
                                    ${current === id ? 'background: #eff6ff;' : ''}"
                             onmouseover="this.style.borderColor='#2563eb'" 
                             onmouseout="this.style.borderColor='${current === id ? '#2563eb' : '#e2e8f0'}'">
                            <div style="height: 70px; background: ${t.headerBg}; border-radius: 8px; margin-bottom: 10px;
                                        display: flex; align-items: center; justify-content: center; color: ${t.style === 'simple' ? '#374151' : 'white'};">
                                <span style="font-weight: 600; font-size: 14px;">INVOICE</span>
                            </div>
                            <div style="display: flex; justify-content: space-between; align-items: center;">
                                <span style="font-weight: 600; color: #1e293b; font-size: 13px;">${t.name}</span>
                                ${current === id ? '<i class="fas fa-check-circle" style="color: #2563eb;"></i>' : ''}
                            </div>
                        </div>
                    `).join('')}
                </div>
                <div style="padding: 15px 20px; background: #f8fafc; border-top: 1px solid #e2e8f0; text-align: center;">
                    <p style="margin: 0; color: #64748b; font-size: 13px;">
                        <i class="fas fa-info-circle"></i> Selected template will be used when generating invoice PDF
                    </p>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

function generateInvoicePDF(invoiceId) {
    const invoices = window.invoices || [];
    const invoice = invoices.find(i => i.id == invoiceId);
    if (!invoice) {
        showNotification('Invoice not found', 'error');
        return;
    }
    
    const template = invoiceTemplates[getSelectedInvoiceTemplate()] || invoiceTemplates.modern;
    const logo = getCompanyLogo();
    
    // Get company details
    const settings = window.businessData?.settings || {};
    const companyName = settings.businessName || 'Your Company';
    const companyAddress = settings.businessAddress || localStorage.getItem('ezcubic_business_address') || '';
    const companyPhone = settings.businessPhone || localStorage.getItem('ezcubic_business_phone') || '';
    const companyEmail = settings.businessEmail || localStorage.getItem('ezcubic_business_email') || '';
    const companyWebsite = settings.businessWebsite || localStorage.getItem('ezcubic_business_website') || '';
    const companySSM = settings.ssmNumber || '';
    const bankAccount = settings.businessBankAccount || localStorage.getItem('ezcubic_business_bank') || '';
    
    // Get customer info
    let customerInfo = { 
        name: invoice.customerName, 
        company: invoice.customerDetails?.company || '',
        address: invoice.customerDetails?.address || '',
        email: invoice.customerDetails?.email || '',
        phone: invoice.customerDetails?.phone || ''
    };
    
    // Status display
    let statusLabel = 'Unpaid';
    let statusColor = '#ef4444';
    let statusBg = '#fee2e2';
    if (invoice.status === 'paid') {
        statusLabel = 'PAID';
        statusColor = '#10b981';
        statusBg = '#d1fae5';
    } else if (invoice.status === 'partial') {
        statusLabel = 'PARTIAL';
        statusColor = '#f59e0b';
        statusBg = '#fef3c7';
    } else if (invoice.status === 'overdue' || (invoice.status === 'unpaid' && new Date(invoice.dueDate) < new Date())) {
        statusLabel = 'OVERDUE';
        statusColor = '#dc2626';
        statusBg = '#fecaca';
    }
    
    const pdfContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Invoice ${invoice.invoiceNo}</title>
            <style>
                * { margin: 0; padding: 0; box-sizing: border-box; }
                body { font-family: 'Segoe UI', Arial, sans-serif; color: #333; background: white; }
                .page { max-width: 800px; margin: 0 auto; padding: 40px; }
                
                .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 3px solid ${template.primaryColor}; }
                .company-section { display: flex; gap: 20px; align-items: center; }
                .company-logo { width: 80px; height: 80px; object-fit: contain; }
                .company-logo-placeholder { width: 80px; height: 80px; background: #f1f5f9; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: #94a3b8; font-size: 32px; }
                .company-info h1 { font-size: 22px; color: ${template.primaryColor}; margin-bottom: 5px; }
                .company-info p { font-size: 11px; color: #64748b; line-height: 1.4; }
                
                .doc-title { text-align: right; }
                .doc-title h2 { font-size: 28px; color: ${template.primaryColor}; letter-spacing: 2px; }
                .doc-title .number { font-size: 14px; color: #64748b; margin-top: 5px; }
                .status-badge { display: inline-block; padding: 6px 16px; border-radius: 20px; font-size: 12px; font-weight: 700; background: ${statusBg}; color: ${statusColor}; margin-top: 8px; }
                
                .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 30px; margin-bottom: 30px; }
                .info-box { background: #f8fafc; padding: 15px; border-radius: 8px; border-left: 3px solid ${template.primaryColor}; }
                .info-box h3 { font-size: 11px; text-transform: uppercase; color: ${template.primaryColor}; margin-bottom: 10px; letter-spacing: 1px; }
                .info-box p { font-size: 12px; margin-bottom: 3px; color: #334155; }
                .info-box strong { color: #1e293b; }
                
                table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
                th { background: ${template.primaryColor}; color: white; padding: 12px; text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; }
                td { padding: 12px; border-bottom: 1px solid #e2e8f0; font-size: 12px; }
                .text-right { text-align: right; }
                .text-center { text-align: center; }
                
                .totals { margin-left: auto; width: 280px; }
                .totals .row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e2e8f0; font-size: 13px; }
                .totals .row.grand { background: ${template.primaryColor}; color: white; padding: 12px; margin-top: 10px; border-radius: 6px; font-weight: bold; font-size: 15px; }
                .totals .row.paid { color: #10b981; }
                .totals .row.balance { color: #ef4444; font-weight: 600; }
                
                .terms { margin-top: 30px; padding: 20px; background: #f8fafc; border-radius: 8px; }
                .terms h3 { font-size: 12px; color: ${template.primaryColor}; margin-bottom: 10px; text-transform: uppercase; }
                .terms p { font-size: 11px; color: #64748b; white-space: pre-line; line-height: 1.6; }
                
                .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e2e8f0; text-align: center; font-size: 10px; color: #94a3b8; }
                .bank-info { background: #fef3c7; padding: 15px; border-radius: 8px; margin-top: 20px; }
                .bank-info h4 { font-size: 11px; color: #92400e; margin-bottom: 8px; }
                .bank-info p { font-size: 12px; color: #78350f; white-space: pre-line; }
                
                .payment-history { margin-top: 20px; background: #f0fdf4; padding: 15px; border-radius: 8px; }
                .payment-history h4 { font-size: 11px; color: #166534; margin-bottom: 10px; text-transform: uppercase; }
                .payment-history table { margin: 0; }
                .payment-history th { background: #166534; }
                
                @media print { 
                    body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
                    .page { padding: 20px; }
                    .no-print { display: none; }
                }
            </style>
        </head>
        <body>
            <div class="page">
                <div class="header">
                    <div class="company-section">
                        ${logo ? `<img src="${logo}" class="company-logo" alt="Logo">` : `<div class="company-logo-placeholder">🏢</div>`}
                        <div class="company-info">
                            <h1>${escapeHtml(companyName)}</h1>
                            ${companySSM ? `<p><strong>Reg No:</strong> ${escapeHtml(companySSM)}</p>` : ''}
                            ${companyAddress ? `<p>${escapeHtml(companyAddress)}</p>` : ''}
                            ${companyPhone ? `<p>Tel: ${escapeHtml(companyPhone)}</p>` : ''}
                            ${companyEmail ? `<p>Email: ${escapeHtml(companyEmail)}</p>` : ''}
                            ${companyWebsite ? `<p>Web: ${escapeHtml(companyWebsite)}</p>` : ''}
                        </div>
                    </div>
                    <div class="doc-title">
                        <h2>INVOICE</h2>
                        <div class="number">${escapeHtml(invoice.invoiceNo)}</div>
                        <div class="status-badge">${statusLabel}</div>
                    </div>
                </div>
                
                <div class="info-grid">
                    <div class="info-box">
                        <h3>Bill To</h3>
                        <p><strong>${escapeHtml(customerInfo.name || customerInfo.company)}</strong></p>
                        ${customerInfo.company && customerInfo.name !== customerInfo.company ? `<p>${escapeHtml(customerInfo.company)}</p>` : ''}
                        ${customerInfo.address ? `<p>${escapeHtml(customerInfo.address)}</p>` : ''}
                        ${customerInfo.phone ? `<p>Tel: ${escapeHtml(customerInfo.phone)}</p>` : ''}
                        ${customerInfo.email ? `<p>Email: ${escapeHtml(customerInfo.email)}</p>` : ''}
                    </div>
                    <div class="info-box">
                        <h3>Invoice Details</h3>
                        <p><strong>Invoice Date:</strong> ${invoice.date}</p>
                        <p><strong>Due Date:</strong> ${invoice.dueDate}</p>
                        ${invoice.description ? `<p><strong>Description:</strong> ${escapeHtml(invoice.description)}</p>` : ''}
                        ${invoice.isRecurring ? `<p><strong>Recurring:</strong> ${invoice.recurringFrequency}</p>` : ''}
                    </div>
                </div>
                
                <table>
                    <thead>
                        <tr>
                            <th style="width: 5%;">#</th>
                            <th style="width: 45%;">Description</th>
                            <th class="text-center" style="width: 12%;">Qty</th>
                            <th class="text-right" style="width: 19%;">Unit Price</th>
                            <th class="text-right" style="width: 19%;">Amount</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${(invoice.items || []).map((item, i) => `
                            <tr>
                                <td>${i + 1}</td>
                                <td>${escapeHtml(item.description)}</td>
                                <td class="text-center">${item.quantity}</td>
                                <td class="text-right">RM ${parseFloat(item.unitPrice || 0).toFixed(2)}</td>
                                <td class="text-right">RM ${parseFloat(item.amount || 0).toFixed(2)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
                
                <div class="totals">
                    <div class="row">
                        <span>Subtotal:</span>
                        <span>RM ${parseFloat(invoice.subtotal || 0).toFixed(2)}</span>
                    </div>
                    ${invoice.tax > 0 ? `
                    <div class="row">
                        <span>Tax (${invoice.taxRate}%):</span>
                        <span>RM ${parseFloat(invoice.tax || 0).toFixed(2)}</span>
                    </div>
                    ` : ''}
                    <div class="row grand">
                        <span>TOTAL</span>
                        <span>RM ${parseFloat(invoice.total || 0).toFixed(2)}</span>
                    </div>
                    ${invoice.paidAmount > 0 ? `
                    <div class="row paid">
                        <span>Amount Paid:</span>
                        <span>RM ${parseFloat(invoice.paidAmount || 0).toFixed(2)}</span>
                    </div>
                    <div class="row balance">
                        <span>Balance Due:</span>
                        <span>RM ${parseFloat((invoice.total || 0) - (invoice.paidAmount || 0)).toFixed(2)}</span>
                    </div>
                    ` : ''}
                </div>
                
                ${bankAccount ? `
                <div class="bank-info">
                    <h4>💳 Payment Details</h4>
                    <p>${escapeHtml(bankAccount)}</p>
                </div>
                ` : ''}
                
                ${invoice.payments && invoice.payments.length > 0 ? `
                <div class="payment-history">
                    <h4>💰 Payment History</h4>
                    <table>
                        <thead>
                            <tr>
                                <th>Date</th>
                                <th>Method</th>
                                <th>Reference</th>
                                <th class="text-right">Amount</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${invoice.payments.map(p => `
                                <tr>
                                    <td>${p.date}</td>
                                    <td>${p.method}</td>
                                    <td>${escapeHtml(p.reference || '-')}</td>
                                    <td class="text-right">RM ${parseFloat(p.amount || 0).toFixed(2)}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
                ` : ''}
                
                ${invoice.notes ? `
                <div class="terms">
                    <h3>Notes</h3>
                    <p>${escapeHtml(invoice.notes)}</p>
                </div>
                ` : ''}
                
                ${invoice.terms ? `
                <div class="terms">
                    <h3>Terms & Conditions</h3>
                    <p>${escapeHtml(invoice.terms)}</p>
                </div>
                ` : ''}
                
                <div class="footer">
                    <p>This is a computer-generated document. No signature is required.</p>
                    <p>Thank you for your business!</p>
                </div>
                
                <div class="no-print" style="text-align: center; margin-top: 30px; padding: 20px; background: #f0f9ff; border-radius: 10px;">
                    <button onclick="window.print()" style="padding: 12px 30px; background: ${template.primaryColor}; color: white; border: none; border-radius: 8px; font-size: 14px; cursor: pointer; margin-right: 10px;">
                        <i class="fas fa-print"></i> Print / Save as PDF
                    </button>
                    <button onclick="window.close()" style="padding: 12px 30px; background: #64748b; color: white; border: none; border-radius: 8px; font-size: 14px; cursor: pointer;">
                        Close
                    </button>
                    <p style="margin-top: 10px; font-size: 12px; color: #64748b;">
                        💡 Tip: To save as PDF, choose "Save as PDF" as your printer
                    </p>
                </div>
            </div>
        </body>
        </html>
    `;
    
    const pdfWindow = window.open('', '_blank');
    pdfWindow.document.write(pdfContent);
    pdfWindow.document.close();
}

// ==================== GLOBAL EXPORTS - PDF TEMPLATES ====================
// Quotation PDF & Templates
window.quotationTemplates = quotationTemplates;
window.getSelectedTemplate = getSelectedTemplate;
window.setQuotationTemplate = setQuotationTemplate;
window.showTemplateSelector = showTemplateSelector;
window.generateQuotationPDF = generateQuotationPDF;

// Invoice PDF & Templates
window.invoiceTemplates = invoiceTemplates;
window.getSelectedInvoiceTemplate = getSelectedInvoiceTemplate;
window.setInvoiceTemplate = setInvoiceTemplate;
window.showInvoiceTemplateSelector = showInvoiceTemplateSelector;
window.generateInvoicePDF = generateInvoicePDF;

// Helper
window.escapeHtml = escapeHtml;
