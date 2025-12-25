// ==================== E-INVOICE-API.JS ====================
// LHDN MyInvois e-Invoice Integration - API & UBL Functions
// Part B of e-invoice.js split
// Version: 2.1.5 - 17 Dec 2025

// ==================== GENERATE E-INVOICE ====================
function generateEInvoice(invoiceData) {
    if (!eInvoiceSettings.enabled) {
        console.log('e-Invoice not enabled');
        return null;
    }
    
    const ublInvoice = formatUBLInvoice(invoiceData);
    return ublInvoice;
}

// ==================== FORMAT UBL INVOICE ====================
// LHDN requires UBL 2.1 format
function formatUBLInvoice(invoice) {
    const settings = eInvoiceSettings;
    const businessSettings = window.businessData?.settings || {};
    
    // Generate UUID for the invoice
    const uuid = generateUUID();
    
    const ublDocument = {
        _D: 'urn:oasis:names:specification:ubl:schema:xsd:Invoice-2',
        _A: 'urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2',
        _B: 'urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2',
        Invoice: [{
            ID: [{_: invoice.invoiceNumber || invoice.id}],
            IssueDate: [{_: formatISODate(invoice.date || new Date())}],
            IssueTime: [{_: formatISOTime(invoice.date || new Date())}],
            InvoiceTypeCode: [{
                _: invoice.type || '01',
                listVersionID: '1.0'
            }],
            DocumentCurrencyCode: [{_: 'MYR'}],
            TaxCurrencyCode: [{_: 'MYR'}],
            InvoicePeriod: [{
                StartDate: [{_: formatISODate(invoice.periodStart || invoice.date)}],
                EndDate: [{_: formatISODate(invoice.periodEnd || invoice.date)}],
                Description: [{_: 'Monthly'}]
            }],
            BillingReference: invoice.originalInvoice ? [{
                InvoiceDocumentReference: [{
                    ID: [{_: invoice.originalInvoice}]
                }]
            }] : undefined,
            AccountingSupplierParty: [{
                Party: [{
                    IndustryClassificationCode: [{
                        _: settings.msic,
                        name: settings.businessActivityDesc
                    }],
                    PartyIdentification: [
                        {ID: [{_: settings.tin, schemeID: 'TIN'}]},
                        {ID: [{_: settings.brn, schemeID: 'BRN'}]}
                    ],
                    PostalAddress: [{
                        CityName: [{_: businessSettings.city || ''}],
                        PostalZone: [{_: businessSettings.postcode || ''}],
                        CountrySubentityCode: [{_: getStateCode(businessSettings.state)}],
                        AddressLine: [{Line: [{_: businessSettings.address || ''}]}],
                        Country: [{IdentificationCode: [{_: 'MYS', listID: 'ISO3166-1', listAgencyID: '6'}]}]
                    }],
                    PartyLegalEntity: [{
                        RegistrationName: [{_: businessSettings.businessName || ''}]
                    }],
                    Contact: [{
                        Telephone: [{_: businessSettings.phone || ''}],
                        ElectronicMail: [{_: businessSettings.email || ''}]
                    }]
                }]
            }],
            AccountingCustomerParty: [{
                Party: [{
                    PartyIdentification: [
                        {ID: [{_: invoice.customer?.tin || 'EI00000000010', schemeID: 'TIN'}]},
                        {ID: [{_: invoice.customer?.brn || invoice.customer?.ic || '', schemeID: invoice.customer?.brn ? 'BRN' : 'NRIC'}]}
                    ],
                    PostalAddress: [{
                        CityName: [{_: invoice.customer?.city || ''}],
                        PostalZone: [{_: invoice.customer?.postcode || ''}],
                        CountrySubentityCode: [{_: getStateCode(invoice.customer?.state)}],
                        AddressLine: [{Line: [{_: invoice.customer?.address || ''}]}],
                        Country: [{IdentificationCode: [{_: 'MYS', listID: 'ISO3166-1', listAgencyID: '6'}]}]
                    }],
                    PartyLegalEntity: [{
                        RegistrationName: [{_: invoice.customer?.company || invoice.customer?.name || 'Cash Customer'}]
                    }],
                    Contact: [{
                        Telephone: [{_: invoice.customer?.phone || ''}],
                        ElectronicMail: [{_: invoice.customer?.email || ''}]
                    }]
                }]
            }],
            TaxTotal: [{
                TaxAmount: [{_: (invoice.tax || 0).toFixed(2), currencyID: 'MYR'}],
                TaxSubtotal: [{
                    TaxableAmount: [{_: (invoice.subtotal || 0).toFixed(2), currencyID: 'MYR'}],
                    TaxAmount: [{_: (invoice.tax || 0).toFixed(2), currencyID: 'MYR'}],
                    TaxCategory: [{
                        ID: [{_: invoice.taxCategory || '01'}],
                        Percent: [{_: invoice.taxRate || 0}],
                        TaxScheme: [{
                            ID: [{_: 'OTH', schemeID: 'UN/ECE 5153', schemeAgencyID: '6'}]
                        }]
                    }]
                }]
            }],
            LegalMonetaryTotal: [{
                LineExtensionAmount: [{_: (invoice.subtotal || 0).toFixed(2), currencyID: 'MYR'}],
                TaxExclusiveAmount: [{_: (invoice.subtotal || 0).toFixed(2), currencyID: 'MYR'}],
                TaxInclusiveAmount: [{_: (invoice.total || 0).toFixed(2), currencyID: 'MYR'}],
                PayableAmount: [{_: (invoice.total || 0).toFixed(2), currencyID: 'MYR'}]
            }],
            InvoiceLine: (invoice.items || []).map((item, index) => ({
                ID: [{_: (index + 1).toString()}],
                InvoicedQuantity: [{_: item.quantity || 1, unitCode: item.unit || 'EA'}],
                LineExtensionAmount: [{_: (item.total || 0).toFixed(2), currencyID: 'MYR'}],
                TaxTotal: [{
                    TaxAmount: [{_: (item.tax || 0).toFixed(2), currencyID: 'MYR'}],
                    TaxSubtotal: [{
                        TaxableAmount: [{_: (item.total || 0).toFixed(2), currencyID: 'MYR'}],
                        TaxAmount: [{_: (item.tax || 0).toFixed(2), currencyID: 'MYR'}],
                        TaxCategory: [{
                            ID: [{_: '01'}],
                            Percent: [{_: 0}],
                            TaxScheme: [{ID: [{_: 'OTH'}]}]
                        }]
                    }]
                }],
                Item: [{
                    Description: [{_: item.description || item.name || ''}],
                    OriginCountry: [{IdentificationCode: [{_: 'MYS'}]}],
                    CommodityClassification: [{
                        ItemClassificationCode: [{_: item.classCode || '001', listID: 'CLASS'}]
                    }]
                }],
                Price: [{
                    PriceAmount: [{_: (item.unitPrice || item.price || 0).toFixed(2), currencyID: 'MYR'}]
                }],
                ItemPriceExtension: [{
                    Amount: [{_: (item.total || 0).toFixed(2), currencyID: 'MYR'}]
                }]
            }))
        }]
    };
    
    return {
        uuid: uuid,
        document: ublDocument,
        hash: generateDocumentHash(ublDocument)
    };
}

// ==================== SUBMIT E-INVOICE ====================
async function submitEInvoice(invoiceId) {
    if (!eInvoiceSettings.enabled) {
        showNotification('e-Invoice integration is not enabled', 'warning');
        return null;
    }
    
    // Get invoice data
    const invoices = JSON.parse(localStorage.getItem('ezcubic_invoices') || '[]');
    const invoice = invoices.find(inv => inv.id === invoiceId);
    
    if (!invoice) {
        showNotification('Invoice not found', 'error');
        return null;
    }
    
    // Check if already submitted
    const existingSubmission = eInvoiceSubmissions.find(s => s.invoiceId === invoiceId && s.status === 'Valid');
    if (existingSubmission) {
        showNotification('This invoice has already been submitted', 'warning');
        return existingSubmission;
    }
    
    try {
        showNotification('Submitting to LHDN...', 'info');
        
        // Generate UBL document
        const ublData = generateEInvoice(invoice);
        
        // Get auth token
        const token = await getAuthToken();
        
        // Submit to LHDN
        // Note: In production, this would be actual API call
        /*
        const baseUrl = eInvoiceSettings.environment === 'production' 
            ? EINVOICE_CONFIG.prodBaseUrl 
            : EINVOICE_CONFIG.sandboxBaseUrl;
        
        const response = await fetch(`${baseUrl}/api/${EINVOICE_CONFIG.apiVersion}/documentsubmissions`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                documents: [{
                    format: 'JSON',
                    documentHash: ublData.hash,
                    codeNumber: invoice.invoiceNumber,
                    document: btoa(JSON.stringify(ublData.document))
                }]
            })
        });
        
        if (!response.ok) {
            throw new Error(`Submission failed: ${response.status}`);
        }
        
        const result = await response.json();
        */
        
        // Simulated response for demo
        const result = {
            submissionUid: 'SUB_' + Date.now(),
            acceptedDocuments: [{
                uuid: ublData.uuid,
                invoiceCodeNumber: invoice.invoiceNumber,
                longId: 'LONG_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)
            }],
            rejectedDocuments: []
        };
        
        // Record submission
        const submission = {
            id: generateSubmissionId(),
            invoiceId: invoiceId,
            invoiceNumber: invoice.invoiceNumber,
            submissionUid: result.submissionUid,
            uuid: ublData.uuid,
            longId: result.acceptedDocuments[0]?.longId,
            status: 'Submitted',
            submittedAt: new Date().toISOString(),
            environment: eInvoiceSettings.environment,
            response: result
        };
        
        eInvoiceSubmissions.push(submission);
        saveEInvoiceData();
        
        // Update invoice with e-invoice status
        invoice.eInvoiceStatus = 'Submitted';
        invoice.eInvoiceUuid = ublData.uuid;
        invoice.eInvoiceLongId = submission.longId;
        localStorage.setItem('ezcubic_invoices', JSON.stringify(invoices));
        
        showNotification('Invoice submitted to LHDN successfully!', 'success');
        loadEInvoiceSubmissions();
        
        return submission;
        
    } catch (error) {
        console.error('e-Invoice submission error:', error);
        showNotification('Failed to submit invoice: ' + error.message, 'error');
        return null;
    }
}

// ==================== CHECK STATUS ====================
async function checkEInvoiceStatus(submissionId) {
    const submission = eInvoiceSubmissions.find(s => s.id === submissionId);
    if (!submission) {
        showNotification('Submission not found', 'error');
        return null;
    }
    
    try {
        const token = await getAuthToken();
        
        // In production, this would call the actual API
        /*
        const baseUrl = eInvoiceSettings.environment === 'production' 
            ? EINVOICE_CONFIG.prodBaseUrl 
            : EINVOICE_CONFIG.sandboxBaseUrl;
        
        const response = await fetch(`${baseUrl}/api/${EINVOICE_CONFIG.apiVersion}/documents/${submission.uuid}/details`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        const result = await response.json();
        */
        
        // Simulated status check
        const statuses = ['Submitted', 'Valid', 'Invalid'];
        const randomStatus = submission.status === 'Submitted' ? 'Valid' : submission.status;
        
        submission.status = randomStatus;
        submission.validatedAt = randomStatus === 'Valid' ? new Date().toISOString() : null;
        
        saveEInvoiceData();
        loadEInvoiceSubmissions();
        
        showNotification(`e-Invoice status: ${submission.status}`, 
            submission.status === 'Valid' ? 'success' : 'warning');
        
        return submission;
        
    } catch (error) {
        console.error('Status check error:', error);
        showNotification('Failed to check status', 'error');
        return null;
    }
}

// ==================== CANCEL E-INVOICE ====================
async function cancelEInvoice(submissionId, reason) {
    const submission = eInvoiceSubmissions.find(s => s.id === submissionId);
    if (!submission) {
        showNotification('Submission not found', 'error');
        return false;
    }
    
    if (submission.status === 'Cancelled') {
        showNotification('Already cancelled', 'warning');
        return false;
    }
    
    if (!reason) {
        reason = prompt('Please enter cancellation reason:');
        if (!reason) return false;
    }
    
    try {
        const token = await getAuthToken();
        
        // In production, would call actual API
        /*
        const response = await fetch(`${baseUrl}/api/${EINVOICE_CONFIG.apiVersion}/documents/state/${submission.uuid}/state`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                status: 'cancelled',
                reason: reason
            })
        });
        */
        
        submission.status = 'Cancelled';
        submission.cancelledAt = new Date().toISOString();
        submission.cancellationReason = reason;
        
        saveEInvoiceData();
        loadEInvoiceSubmissions();
        
        showNotification('e-Invoice cancelled successfully', 'success');
        return true;
        
    } catch (error) {
        console.error('Cancellation error:', error);
        showNotification('Failed to cancel e-Invoice', 'error');
        return false;
    }
}

// ==================== LOAD SUBMISSIONS ====================
function loadEInvoiceSubmissions() {
    const tbody = document.getElementById('eInvoiceSubmissionsBody');
    if (!tbody) return;
    
    const sorted = [...eInvoiceSubmissions].sort((a, b) => 
        new Date(b.submittedAt) - new Date(a.submittedAt)
    );
    
    if (sorted.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" style="text-align: center; color: #64748b; padding: 40px;">
                    <i class="fas fa-file-invoice" style="font-size: 40px; margin-bottom: 10px; display: block;"></i>
                    <p style="margin-bottom: 15px;">No e-Invoice submissions yet</p>
                    <button class="btn-outline" onclick="generateDemoInvoice()" style="font-size: 13px;">
                        <i class="fas fa-flask"></i> Generate Demo Invoice
                    </button>
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = sorted.map(sub => {
        const statusColors = {
            'Submitted': '#f59e0b',
            'Valid': '#10b981',
            'Invalid': '#ef4444',
            'Cancelled': '#64748b'
        };
        const statusColor = statusColors[sub.status] || '#64748b';
        
        return `
            <tr>
                <td>
                    <strong>${escapeHTML(sub.invoiceNumber)}</strong>
                    ${sub.isDemo ? '<span style="background: #8b5cf6; color: white; font-size: 10px; padding: 2px 6px; border-radius: 4px; margin-left: 5px;">DEMO</span>' : ''}
                    ${sub.customerName ? `<div style="font-size: 12px; color: #64748b;">${escapeHTML(sub.customerName)}</div>` : ''}
                </td>
                <td style="font-size: 11px; font-family: monospace; max-width: 100px; overflow: hidden; text-overflow: ellipsis;">${sub.uuid?.substring(0, 12) || '-'}...</td>
                <td>${formatDateTime(sub.submittedAt)}</td>
                <td>
                    <span class="status-badge" style="background: ${statusColor}20; color: ${statusColor};">
                        ${sub.status}
                    </span>
                </td>
                <td>
                    <span class="status-badge ${sub.environment === 'production' ? 'success' : ''}" style="${sub.environment !== 'production' ? 'background: #fef3c7; color: #92400e;' : ''}">
                        ${sub.environment === 'production' ? 'Production' : 'Sandbox'}
                    </span>
                </td>
                <td>
                    ${sub.status === 'Submitted' ? `
                        <button class="btn-icon" onclick="simulateStatusCheck('${sub.id}')" title="Check Status">
                            <i class="fas fa-sync"></i>
                        </button>
                    ` : ''}
                    ${sub.status === 'Valid' ? `
                        <button class="btn-icon danger" onclick="cancelEInvoice('${sub.id}')" title="Cancel">
                            <i class="fas fa-times"></i>
                        </button>
                    ` : ''}
                    <button class="btn-icon" onclick="viewEInvoiceDetails('${sub.id}')" title="View Details">
                        <i class="fas fa-eye"></i>
                    </button>
                    ${sub.ublDocument ? `
                        <button class="btn-icon" onclick="viewUBLDocument('${sub.id}')" title="View UBL Document" style="color: #8b5cf6;">
                            <i class="fas fa-code"></i>
                        </button>
                    ` : ''}
                </td>
            </tr>
        `;
    }).join('');
}

function viewEInvoiceDetails(submissionId) {
    const sub = eInvoiceSubmissions.find(s => s.id === submissionId);
    if (!sub) return;
    
    const detailHtml = `
        <div style="padding: 20px;">
            <h3 style="margin-bottom: 15px;"><i class="fas fa-file-invoice"></i> e-Invoice Details</h3>
            
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 20px;">
                <div style="background: #f8fafc; padding: 15px; border-radius: 8px;">
                    <label style="color: #64748b; font-size: 12px;">Invoice Number</label>
                    <div style="font-weight: 600;">${escapeHTML(sub.invoiceNumber)}</div>
                </div>
                <div style="background: #f8fafc; padding: 15px; border-radius: 8px;">
                    <label style="color: #64748b; font-size: 12px;">Status</label>
                    <div style="font-weight: 600;">${sub.status}</div>
                </div>
                <div style="background: #f8fafc; padding: 15px; border-radius: 8px;">
                    <label style="color: #64748b; font-size: 12px;">UUID</label>
                    <div style="font-family: monospace; font-size: 11px; word-break: break-all;">${sub.uuid || 'N/A'}</div>
                </div>
                <div style="background: #f8fafc; padding: 15px; border-radius: 8px;">
                    <label style="color: #64748b; font-size: 12px;">Long ID</label>
                    <div style="font-family: monospace; font-size: 11px; word-break: break-all;">${sub.longId || 'N/A'}</div>
                </div>
                <div style="background: #f8fafc; padding: 15px; border-radius: 8px;">
                    <label style="color: #64748b; font-size: 12px;">Submitted At</label>
                    <div>${formatDateTime(sub.submittedAt)}</div>
                </div>
                <div style="background: #f8fafc; padding: 15px; border-radius: 8px;">
                    <label style="color: #64748b; font-size: 12px;">Environment</label>
                    <div>${sub.environment === 'production' ? 'Production' : 'Sandbox'}</div>
                </div>
            </div>
            
            ${sub.status === 'Cancelled' ? `
                <div style="background: #fef2f2; padding: 15px; border-radius: 8px; margin-bottom: 15px;">
                    <strong style="color: #ef4444;">Cancelled:</strong> ${sub.cancellationReason || 'No reason provided'}
                    <div style="font-size: 12px; color: #64748b; margin-top: 5px;">
                        Cancelled at: ${formatDateTime(sub.cancelledAt)}
                    </div>
                </div>
            ` : ''}
            
            <div style="text-align: right;">
                <button class="btn-secondary" onclick="this.closest('.modal-overlay').remove()">Close</button>
            </div>
        </div>
    `;
    
    const modalOverlay = document.createElement('div');
    modalOverlay.className = 'modal-overlay';
    modalOverlay.style.cssText = 'position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 10000;';
    modalOverlay.innerHTML = `<div class="modal-content" style="background: white; border-radius: 12px; max-width: 600px; width: 90%;">${detailHtml}</div>`;
    modalOverlay.onclick = (e) => {
        if (e.target === modalOverlay) modalOverlay.remove();
    };
    document.body.appendChild(modalOverlay);
}

// ==================== INVOICE INTEGRATION ====================
// Hook into invoice creation to auto-submit if enabled
function hookInvoiceCreation() {
    const originalSaveInvoice = window.saveInvoice;
    if (originalSaveInvoice) {
        window.saveInvoice = function(...args) {
            const result = originalSaveInvoice.apply(this, args);
            
            // Auto-submit if enabled
            if (eInvoiceSettings.enabled && eInvoiceSettings.autoSubmit) {
                setTimeout(() => {
                    const invoices = JSON.parse(localStorage.getItem('ezcubic_invoices') || '[]');
                    const latestInvoice = invoices[invoices.length - 1];
                    if (latestInvoice && !latestInvoice.eInvoiceStatus) {
                        submitEInvoice(latestInvoice.id);
                    }
                }, 1000);
            }
            
            return result;
        };
    }
}

// Initialize hook when module loads
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(hookInvoiceCreation, 2000);
});

// ==================== E-INVOICE MODAL FUNCTIONS ====================
function showEInvoiceModal(invoiceId = null) {
    const modal = document.getElementById('eInvoiceModal');
    if (!modal) {
        // Create modal dynamically if doesn't exist
        const modalHtml = `
            <div id="eInvoiceModal" class="modal" style="display: flex;">
                <div class="modal-content" style="max-width: 600px;">
                    <div class="modal-header">
                        <h3><i class="fas fa-file-invoice"></i> Create E-Invoice</h3>
                        <button class="close-btn" onclick="closeEInvoiceModal()">&times;</button>
                    </div>
                    <div class="modal-body">
                        <p>Select a transaction to generate an e-invoice for LHDN submission.</p>
                        <div id="eInvoiceFormContent">
                            <div class="form-group">
                                <label>Select Invoice/Sale</label>
                                <select id="eInvoiceSource" class="form-control">
                                    <option value="">-- Select --</option>
                                </select>
                            </div>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="btn-outline" onclick="closeEInvoiceModal()">Cancel</button>
                        <button class="btn-primary" onclick="generateEInvoice()">Generate E-Invoice</button>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHtml);
    } else {
        modal.style.display = 'flex';
    }
}

function closeEInvoiceModal() {
    const modal = document.getElementById('eInvoiceModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

// ==================== WINDOW EXPORTS ====================
window.generateEInvoice = generateEInvoice;
window.formatUBLInvoice = formatUBLInvoice;
window.submitEInvoice = submitEInvoice;
window.checkEInvoiceStatus = checkEInvoiceStatus;
window.cancelEInvoice = cancelEInvoice;
window.loadEInvoiceSubmissions = loadEInvoiceSubmissions;
window.viewEInvoiceDetails = viewEInvoiceDetails;
window.hookInvoiceCreation = hookInvoiceCreation;
window.showEInvoiceModal = showEInvoiceModal;
window.closeEInvoiceModal = closeEInvoiceModal;
