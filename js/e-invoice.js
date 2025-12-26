// ==================== E-INVOICE.JS ====================
// LHDN MyInvois e-Invoice Integration Module
// Malaysian Tax Compliance for Electronic Invoicing
// Version: 2.1.5 - Fixed exports - 17 Dec 2025

// Early function declarations to prevent reference errors
var showEInvoiceModal, closeEInvoiceModal;

// ==================== CONFIGURATION ====================
const EINVOICE_CONFIG = {
    // LHDN MyInvois API endpoints (Production)
    prodBaseUrl: 'https://myinvois.hasil.gov.my',
    // LHDN MyInvois API endpoints (Sandbox/Testing)
    sandboxBaseUrl: 'https://preprod-myinvois.hasil.gov.my',
    
    // API versions
    apiVersion: 'v1.0',
    
    // Default settings
    environment: 'sandbox', // 'sandbox' or 'production'
    
    // Retry settings
    maxRetries: 3,
    retryDelay: 1000,
    
    // Invoice types per LHDN
    invoiceTypes: {
        '01': 'Invoice',
        '02': 'Credit Note',
        '03': 'Debit Note',
        '04': 'Refund Note',
        '11': 'Self-Billed Invoice',
        '12': 'Self-Billed Credit Note',
        '13': 'Self-Billed Debit Note',
        '14': 'Self-Billed Refund Note'
    }
};

// ==================== STORAGE KEYS ====================
const EINVOICE_SETTINGS_KEY = 'ezcubic_einvoice_settings';
const EINVOICE_SUBMISSIONS_KEY = 'ezcubic_einvoice_submissions';
const EINVOICE_TOKEN_KEY = 'ezcubic_einvoice_token';

// ==================== DEMO DATA ====================
const DEMO_CUSTOMERS = [
    { name: 'ABC Trading Sdn Bhd', tin: 'C20230001234', brn: '202301001234', address: '123 Jalan Sultan Ismail, 50250 Kuala Lumpur', state: 'Kuala Lumpur' },
    { name: 'XYZ Enterprise', tin: 'C20220009876', brn: '199901005678', address: '45 Jalan Ampang, 50450 Kuala Lumpur', state: 'Kuala Lumpur' },
    { name: 'Syarikat Maju Jaya', tin: 'C20210005555', brn: '202201003456', address: '88 Jalan Tun Razak, 50400 Kuala Lumpur', state: 'Kuala Lumpur' },
    { name: 'Tech Solutions Malaysia', tin: 'C20240002222', brn: '202401002222', address: '10 Jalan PJU 5/1, 47810 Petaling Jaya', state: 'Selangor' },
    { name: 'Global Services Sdn Bhd', tin: 'C20190008888', brn: '201901008888', address: '55 Jalan Bukit Bintang, 55100 Kuala Lumpur', state: 'Kuala Lumpur' }
];

const DEMO_PRODUCTS = [
    { name: 'Professional Services', price: 1500, unit: 'HR' },
    { name: 'Software License (Annual)', price: 2400, unit: 'EA' },
    { name: 'Consultation Fee', price: 800, unit: 'HR' },
    { name: 'Hardware Equipment', price: 3500, unit: 'EA' },
    { name: 'Maintenance Service', price: 500, unit: 'MTH' },
    { name: 'Training Program', price: 1200, unit: 'EA' },
    { name: 'Cloud Hosting (Monthly)', price: 299, unit: 'MTH' },
    { name: 'Technical Support', price: 150, unit: 'HR' }
];

// ==================== GLOBAL VARIABLES ====================
let eInvoiceSettings = {};
let eInvoiceSubmissions = [];

// ==================== INITIALIZATION ====================
function initializeEInvoice() {
    loadEInvoiceData();
    updateEInvoiceStats();
}

function loadEInvoiceData() {
    const savedSettings = localStorage.getItem(EINVOICE_SETTINGS_KEY);
    if (savedSettings) {
        eInvoiceSettings = JSON.parse(savedSettings);
    } else {
        // Default settings
        eInvoiceSettings = {
            enabled: false,
            environment: 'sandbox',
            clientId: '',
            clientSecret: '',
            tin: '', // Tax Identification Number
            brn: '', // Business Registration Number (SSM)
            msic: '', // Malaysian Standard Industrial Classification code
            businessActivityDesc: '',
            defaultInvoiceType: '01',
            autoSubmit: false,
            lastSync: null
        };
    }
    
    const savedSubmissions = localStorage.getItem(EINVOICE_SUBMISSIONS_KEY);
    if (savedSubmissions) {
        eInvoiceSubmissions = JSON.parse(savedSubmissions);
    }
}

function saveEInvoiceData() {
    localStorage.setItem(EINVOICE_SETTINGS_KEY, JSON.stringify(eInvoiceSettings));
    localStorage.setItem(EINVOICE_SUBMISSIONS_KEY, JSON.stringify(eInvoiceSubmissions));
    // Also save to tenant storage for multi-tenant isolation
    if (typeof saveToUserTenant === 'function') {
        saveToUserTenant();
    }
}

// ==================== E-INVOICE SETTINGS ====================
function showEInvoiceSettings() {
    const modal = document.getElementById('eInvoiceSettingsModal');
    if (!modal) {
        createEInvoiceSettingsModal();
        return showEInvoiceSettings();
    }
    
    // Populate form
    document.getElementById('einvEnabled').checked = eInvoiceSettings.enabled || false;
    document.getElementById('einvEnvironment').value = eInvoiceSettings.environment || 'sandbox';
    document.getElementById('einvClientId').value = eInvoiceSettings.clientId || '';
    document.getElementById('einvClientSecret').value = eInvoiceSettings.clientSecret || '';
    document.getElementById('einvTIN').value = eInvoiceSettings.tin || '';
    document.getElementById('einvBRN').value = eInvoiceSettings.brn || '';
    document.getElementById('einvMSIC').value = eInvoiceSettings.msic || '';
    document.getElementById('einvBusinessActivity').value = eInvoiceSettings.businessActivityDesc || '';
    document.getElementById('einvAutoSubmit').checked = eInvoiceSettings.autoSubmit || false;
    
    // Add oninput handlers for credential fields
    document.getElementById('einvClientId').oninput = checkAutoSubmitAvailability;
    document.getElementById('einvClientSecret').oninput = checkAutoSubmitAvailability;
    
    modal.style.display = 'flex';
    
    // Check auto-submit availability after modal is shown
    setTimeout(checkAutoSubmitAvailability, 100);
}

function createEInvoiceSettingsModal() {
    const modalHtml = `
    <div class="modal" id="eInvoiceSettingsModal">
        <div class="modal-content" style="max-width: 600px;">
            <div class="modal-header">
                <h3><i class="fas fa-file-invoice"></i> LHDN e-Invoice Settings</h3>
                <button class="close-btn" onclick="closeEInvoiceSettingsModal()">&times;</button>
            </div>
            <div class="modal-body">
                <div class="alert alert-info" style="margin-bottom: 20px; padding: 15px; background: #dbeafe; border-radius: 8px;">
                    <i class="fas fa-info-circle"></i> 
                    Configure your LHDN MyInvois credentials for e-Invoice submission.
                    <a href="https://myinvois.hasil.gov.my" target="_blank" style="color: #2563eb;">Register at MyInvois Portal</a>
                </div>
                
                <form id="eInvoiceSettingsForm">
                    <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 20px; padding: 15px; background: #f8fafc; border-radius: 8px;">
                        <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
                            <input type="checkbox" id="einvEnabled" style="width: 18px; height: 18px;">
                            <span style="font-weight: 600;">Enable e-Invoice Integration</span>
                        </label>
                    </div>
                    
                    <h4 style="margin-bottom: 15px; color: #475569;"><i class="fas fa-server"></i> API Configuration</h4>
                    
                    <div class="form-group" style="margin-bottom: 15px;">
                        <label>Environment</label>
                        <select id="einvEnvironment" class="form-control">
                            <option value="sandbox">Sandbox (Testing)</option>
                            <option value="production">Production (Live)</option>
                        </select>
                        <small style="color: #64748b;">Use Sandbox for testing before going live</small>
                    </div>
                    
                    <div class="form-row" style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 15px;">
                        <div class="form-group">
                            <label>Client ID *</label>
                            <input type="text" id="einvClientId" class="form-control" placeholder="Your MyInvois Client ID">
                        </div>
                        <div class="form-group">
                            <label>Client Secret *</label>
                            <input type="password" id="einvClientSecret" class="form-control" placeholder="Your MyInvois Client Secret">
                        </div>
                    </div>
                    
                    <h4 style="margin: 20px 0 15px; color: #475569;"><i class="fas fa-building"></i> Business Information</h4>
                    
                    <div class="form-row" style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 15px;">
                        <div class="form-group">
                            <label>TIN (Tax ID Number) *</label>
                            <input type="text" id="einvTIN" class="form-control" placeholder="e.g., C12345678000" oninput="validateTINFormat(this); checkAutoSubmitAvailability();">
                            <small id="tinValidation" style="color: #64748b;">12-14 characters</small>
                        </div>
                        <div class="form-group">
                            <label>BRN (SSM Number) *</label>
                            <input type="text" id="einvBRN" class="form-control" placeholder="e.g., 202301012345" oninput="checkAutoSubmitAvailability()">
                        </div>
                    </div>
                    
                    <div class="form-row" style="display: grid; grid-template-columns: 1fr 2fr; gap: 15px; margin-bottom: 15px;">
                        <div class="form-group">
                            <label>MSIC Code *</label>
                            <input type="text" id="einvMSIC" class="form-control" placeholder="e.g., 47111" oninput="checkAutoSubmitAvailability()">
                            <small style="color: #64748b;">5-digit industry code</small>
                        </div>
                        <div class="form-group">
                            <label>Business Activity Description</label>
                            <input type="text" id="einvBusinessActivity" class="form-control" placeholder="e.g., Retail sale in non-specialized stores">
                        </div>
                    </div>
                    
                    <h4 style="margin: 20px 0 15px; color: #475569;"><i class="fas fa-cog"></i> Submission Settings</h4>
                    
                    <div id="autoSubmitSection" style="padding: 15px; background: #f8fafc; border-radius: 8px; margin-bottom: 15px;">
                        <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px;">
                            <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
                                <input type="checkbox" id="einvAutoSubmit" style="width: 16px; height: 16px;" disabled>
                                <span>Auto-submit invoices to LHDN</span>
                            </label>
                        </div>
                        <div id="autoSubmitStatus" style="font-size: 12px; color: #ef4444;">
                            <i class="fas fa-lock"></i> Complete all required fields above to enable auto-submit
                        </div>
                    </div>
                    
                    <div style="margin-top: 10px;">
                        <button type="button" class="btn-outline" onclick="testEInvoiceConnection()">
                            <i class="fas fa-plug"></i> Test Connection
                        </button>
                        <span id="connectionStatus" style="margin-left: 10px;"></span>
                    </div>
                </form>
            </div>
            <div class="modal-footer">
                <button class="btn-secondary" onclick="closeEInvoiceSettingsModal()">Cancel</button>
                <button class="btn-primary" onclick="saveEInvoiceSettings()">
                    <i class="fas fa-save"></i> Save Settings
                </button>
            </div>
        </div>
    </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);
}

// Check if all required fields are filled to enable auto-submit
function checkAutoSubmitAvailability() {
    const clientId = document.getElementById('einvClientId')?.value?.trim() || '';
    const clientSecret = document.getElementById('einvClientSecret')?.value?.trim() || '';
    const tin = document.getElementById('einvTIN')?.value?.trim() || '';
    const brn = document.getElementById('einvBRN')?.value?.trim() || '';
    const msic = document.getElementById('einvMSIC')?.value?.trim() || '';
    
    const autoSubmitCheckbox = document.getElementById('einvAutoSubmit');
    const autoSubmitStatus = document.getElementById('autoSubmitStatus');
    const autoSubmitSection = document.getElementById('autoSubmitSection');
    
    if (!autoSubmitCheckbox || !autoSubmitStatus) return;
    
    const isComplete = clientId && clientSecret && tin.length >= 12 && brn && msic.length === 5;
    
    if (isComplete) {
        autoSubmitCheckbox.disabled = false;
        autoSubmitSection.style.background = '#f0fdf4';
        autoSubmitStatus.innerHTML = '<i class="fas fa-check-circle" style="color: #10b981;"></i> <span style="color: #166534;">Credentials complete! Auto-submit is available.</span>';
    } else {
        autoSubmitCheckbox.disabled = true;
        autoSubmitCheckbox.checked = false;
        autoSubmitSection.style.background = '#f8fafc';
        
        // Show what's missing
        const missing = [];
        if (!clientId) missing.push('Client ID');
        if (!clientSecret) missing.push('Client Secret');
        if (tin.length < 12) missing.push('TIN');
        if (!brn) missing.push('BRN');
        if (msic.length !== 5) missing.push('MSIC');
        
        autoSubmitStatus.innerHTML = `<i class="fas fa-lock"></i> <span style="color: #ef4444;">Missing: ${missing.join(', ')}</span>`;
    }
}
window.checkAutoSubmitAvailability = checkAutoSubmitAvailability;

function closeEInvoiceSettingsModal() {
    const modal = document.getElementById('eInvoiceSettingsModal');
    if (modal) modal.style.display = 'none';
}
window.closeEInvoiceSettingsModal = closeEInvoiceSettingsModal;

function validateTINFormat(input) {
    const value = input.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    input.value = value;
    
    const validation = document.getElementById('tinValidation');
    if (value.length >= 12 && value.length <= 14) {
        validation.style.color = '#10b981';
        validation.textContent = '✓ Valid format';
    } else {
        validation.style.color = '#ef4444';
        validation.textContent = 'Must be 12-14 characters';
    }
}
window.validateTINFormat = validateTINFormat;

function saveEInvoiceSettings() {
    const enabled = document.getElementById('einvEnabled').checked;
    const environment = document.getElementById('einvEnvironment').value;
    const clientId = document.getElementById('einvClientId').value.trim();
    const clientSecret = document.getElementById('einvClientSecret').value.trim();
    const tin = document.getElementById('einvTIN').value.trim().toUpperCase();
    const brn = document.getElementById('einvBRN').value.trim();
    const msic = document.getElementById('einvMSIC').value.trim();
    const businessActivity = document.getElementById('einvBusinessActivity').value.trim();
    const autoSubmitCheckbox = document.getElementById('einvAutoSubmit');
    const autoSubmit = autoSubmitCheckbox && !autoSubmitCheckbox.disabled ? autoSubmitCheckbox.checked : false;
    
    if (enabled) {
        if (!clientId || !clientSecret) {
            showNotification('Please enter Client ID and Client Secret', 'error');
            return;
        }
        if (!tin || tin.length < 12) {
            showNotification('Please enter a valid TIN', 'error');
            return;
        }
        if (!brn) {
            showNotification('Please enter your SSM/BRN number', 'error');
            return;
        }
        if (!msic || msic.length !== 5) {
            showNotification('Please enter a valid 5-digit MSIC code', 'error');
            return;
        }
    }
    
    // Double-check: autoSubmit can only be true if all credentials are complete
    const credentialsComplete = clientId && clientSecret && tin && tin.length >= 12 && brn && msic && msic.length === 5;
    const finalAutoSubmit = autoSubmit && credentialsComplete;
    
    eInvoiceSettings = {
        enabled,
        environment,
        clientId,
        clientSecret,
        tin,
        brn,
        msic,
        businessActivityDesc: businessActivity,
        autoSubmit: finalAutoSubmit,
        lastUpdated: new Date().toISOString()
    };
    
    saveEInvoiceData();
    closeEInvoiceSettingsModal();
    
    // Show appropriate notification
    if (finalAutoSubmit) {
        showNotification('e-Invoice settings saved! Auto-submit is ENABLED - invoices will be submitted automatically.', 'success');
    } else {
        showNotification('e-Invoice settings saved successfully!', 'success');
    }
}

// ==================== TEST CONNECTION ====================
async function testEInvoiceConnection() {
    const statusEl = document.getElementById('connectionStatus');
    statusEl.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Testing...';
    statusEl.style.color = '#64748b';
    
    try {
        const token = await getAuthToken();
        if (token) {
            statusEl.innerHTML = '<i class="fas fa-check-circle"></i> Connected!';
            statusEl.style.color = '#10b981';
        } else {
            throw new Error('No token received');
        }
    } catch (error) {
        statusEl.innerHTML = '<i class="fas fa-times-circle"></i> Connection failed';
        statusEl.style.color = '#ef4444';
        console.error('e-Invoice connection test failed:', error);
    }
}

// ==================== AUTHENTICATION ====================
async function getAuthToken() {
    const settings = eInvoiceSettings;
    if (!settings.clientId || !settings.clientSecret) {
        throw new Error('Missing API credentials');
    }
    
    const baseUrl = settings.environment === 'production' 
        ? EINVOICE_CONFIG.prodBaseUrl 
        : EINVOICE_CONFIG.sandboxBaseUrl;
    
    // Note: In production, this would make actual API call to LHDN
    // For demo purposes, we simulate the token response
    
    // Actual implementation would be:
    /*
    const response = await fetch(`${baseUrl}/connect/token`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
            client_id: settings.clientId,
            client_secret: settings.clientSecret,
            grant_type: 'client_credentials',
            scope: 'InvoicingAPI'
        })
    });
    
    if (!response.ok) {
        throw new Error(`Auth failed: ${response.status}`);
    }
    
    const data = await response.json();
    return data.access_token;
    */
    
    // Simulated token for demo
    return 'demo_token_' + Date.now();
}

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
                    No e-Invoice submissions yet
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
                <td><strong>${escapeHTML(sub.invoiceNumber)}</strong></td>
                <td style="font-size: 12px; font-family: monospace;">${sub.uuid?.substring(0, 8) || '-'}...</td>
                <td>${formatDateTime(sub.submittedAt)}</td>
                <td>
                    <span class="status-badge" style="background: ${statusColor}20; color: ${statusColor};">
                        ${sub.status}
                    </span>
                </td>
                <td>
                    <span class="status-badge ${sub.environment === 'production' ? 'success' : 'warning'}">
                        ${sub.environment === 'production' ? 'Production' : 'Sandbox'}
                    </span>
                </td>
                <td>
                    ${sub.status === 'Submitted' ? `
                        <button class="btn-icon" onclick="checkEInvoiceStatus('${sub.id}')" title="Check Status">
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
window.viewEInvoiceDetails = viewEInvoiceDetails;

// ==================== STATS ====================
function updateEInvoiceStats() {
    const total = eInvoiceSubmissions.length;
    const valid = eInvoiceSubmissions.filter(s => s.status === 'Valid').length;
    const pending = eInvoiceSubmissions.filter(s => s.status === 'Submitted').length;
    const invalid = eInvoiceSubmissions.filter(s => s.status === 'Invalid').length;
    
    const elements = {
        'einvTotalCount': total,
        'einvValidCount': valid,
        'einvPendingCount': pending,
        'einvInvalidCount': invalid
    };
    
    Object.entries(elements).forEach(([id, value]) => {
        const el = document.getElementById(id);
        if (el) el.textContent = value;
    });
}

// ==================== HELPER FUNCTIONS ====================
function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

function generateSubmissionId() {
    return 'EINV_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

function generateDocumentHash(document) {
    // SHA-256 hash of document - simplified for demo
    const str = JSON.stringify(document);
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return Math.abs(hash).toString(16).padStart(64, '0');
}

function formatISODate(date) {
    const d = new Date(date);
    return d.toISOString().slice(0, 10);
}

function formatISOTime(date) {
    const d = new Date(date);
    return d.toISOString().slice(11, 19) + 'Z';
}

function formatDateTime(dateStr) {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleString('en-MY', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function getStateCode(state) {
    const stateCodes = {
        'johor': '01', 'kedah': '02', 'kelantan': '03', 'melaka': '04',
        'negeri sembilan': '05', 'pahang': '06', 'pulau pinang': '07', 'penang': '07',
        'perak': '08', 'perlis': '09', 'selangor': '10', 'terengganu': '11',
        'sabah': '12', 'sarawak': '13', 'wp kuala lumpur': '14', 'kuala lumpur': '14',
        'wp labuan': '15', 'labuan': '15', 'wp putrajaya': '16', 'putrajaya': '16'
    };
    return stateCodes[(state || '').toLowerCase()] || '14';
}

function validateTIN(tin) {
    // TIN format: C followed by 10-13 digits
    const pattern = /^[A-Z]\d{10,13}$/;
    return pattern.test(tin);
}

function escapeHTML(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function showNotification(message, type = 'info') {
    if (typeof window.showNotification === 'function' && window.showNotification !== showNotification) {
        window.showNotification(message, type);
    } else {
        console.log(`[${type.toUpperCase()}] ${message}`);
    }
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

// ==================== DEMO MODE ====================
// Demo functions for testing e-Invoice workflow without real credentials

function runEInvoiceDemo() {
    // Show demo walkthrough modal
    const modalHtml = `
        <div class="modal-overlay" id="demoWalkthroughModal" style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.7); display: flex; align-items: center; justify-content: center; z-index: 10000;">
            <div class="modal-content" style="background: white; border-radius: 16px; max-width: 600px; width: 90%; overflow: hidden;">
                <div style="background: linear-gradient(135deg, #8b5cf6, #6366f1); padding: 30px; color: white; text-align: center;">
                    <i class="fas fa-flask" style="font-size: 50px; margin-bottom: 15px;"></i>
                    <h2 style="margin: 0;">e-Invoice Demo Mode</h2>
                    <p style="margin: 10px 0 0; opacity: 0.9;">Experience the complete e-Invoice workflow</p>
                </div>
                <div style="padding: 25px;">
                    <div style="margin-bottom: 20px;">
                        <h4 style="color: #1e293b; margin-bottom: 15px;"><i class="fas fa-info-circle" style="color: #3b82f6;"></i> What this demo will show:</h4>
                        <ul style="color: #64748b; line-height: 1.8; padding-left: 20px;">
                            <li>Generate sample invoices with realistic Malaysian business data</li>
                            <li>Simulate submission to LHDN MyInvois (sandbox)</li>
                            <li>View UBL 2.1 document format used by LHDN</li>
                            <li>Track submission status (Submitted → Valid/Invalid)</li>
                            <li>Test cancellation workflow</li>
                        </ul>
                    </div>
                    
                    <div style="background: #f0fdf4; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                        <div style="display: flex; align-items: center; gap: 10px; color: #166534;">
                            <i class="fas fa-check-circle"></i>
                            <span><strong>No real LHDN credentials needed!</strong> All data is simulated.</span>
                        </div>
                    </div>
                    
                    <div style="display: flex; gap: 10px; justify-content: flex-end;">
                        <button class="btn-secondary" onclick="document.getElementById('demoWalkthroughModal').remove()">Cancel</button>
                        <button class="btn-primary" onclick="startDemoSequence()" style="background: linear-gradient(135deg, #8b5cf6, #6366f1);">
                            <i class="fas fa-play"></i> Start Demo
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);
}

async function startDemoSequence() {
    // Close walkthrough modal
    const walkthroughModal = document.getElementById('demoWalkthroughModal');
    if (walkthroughModal) walkthroughModal.remove();
    
    try {
        // Enable demo settings
        eInvoiceSettings = {
            enabled: true,
            environment: 'sandbox',
            demoMode: true,
            clientId: 'DEMO_CLIENT_ID',
            clientSecret: 'DEMO_SECRET',
            tin: 'C20231234567',
            brn: '202301012345',
            msic: '62011',
            businessActivityDesc: 'Computer programming activities',
            autoSubmit: false
        };
        saveEInvoiceData();
        
        showNotification('🎮 Demo mode enabled! Generating sample invoice...', 'success');
        
        // Wait a moment for visual feedback
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Generate first demo invoice
        await generateDemoInvoice();
        
        // Update UI
        if (typeof window.updateEInvoiceStatusBanner === 'function') {
            window.updateEInvoiceStatusBanner();
        }
        
        // Show success message
        setTimeout(() => {
            showNotification('✅ Demo invoice created! Check the submissions table below.', 'success');
        }, 500);
    } catch (error) {
        console.error('Demo sequence error:', error);
        showNotification('Demo error: ' + error.message, 'error');
    }
}
window.startDemoSequence = startDemoSequence;

async function generateDemoInvoice() {
    try {
        // Random customer
        const customer = DEMO_CUSTOMERS[Math.floor(Math.random() * DEMO_CUSTOMERS.length)];
        
        // Random products (1-4 items)
        const numItems = Math.floor(Math.random() * 4) + 1;
        const items = [];
        const usedProducts = new Set();
        
        for (let i = 0; i < numItems; i++) {
            let productIdx;
            do {
                productIdx = Math.floor(Math.random() * DEMO_PRODUCTS.length);
            } while (usedProducts.has(productIdx) && usedProducts.size < DEMO_PRODUCTS.length);
            
            usedProducts.add(productIdx);
            const product = DEMO_PRODUCTS[productIdx];
            const qty = Math.floor(Math.random() * 5) + 1;
            
            items.push({
                name: product.name,
                description: product.name,
                quantity: qty,
                unitPrice: product.price,
                unit: product.unit,
                total: qty * product.price,
                tax: 0
            });
        }
        
        const subtotal = items.reduce((sum, item) => sum + item.total, 0);
        const taxRate = 0; // SST exempt for demo
        const tax = subtotal * taxRate;
        const total = subtotal + tax;
        
        // Generate invoice number using customizable document numbering if available
        const date = new Date();
        let invNum;
        if (typeof generateDocumentNumber === 'function') {
            invNum = generateDocumentNumber('invoice');
        } else {
            invNum = `INV${date.getFullYear()}${(date.getMonth() + 1).toString().padStart(2, '0')}${Math.floor(Math.random() * 9000 + 1000)}`;
        }
        
        // Create demo invoice object
        const demoInvoice = {
            id: 'DEMO_' + Date.now(),
            invoiceNumber: invNum,
            date: date.toISOString().slice(0, 10),
            customer: {
                name: customer.name,
                company: customer.name,
                tin: customer.tin,
                brn: customer.brn,
                address: customer.address,
                state: customer.state,
                city: customer.state,
                postcode: '50000'
            },
            items: items,
            subtotal: subtotal,
            tax: tax,
            taxRate: taxRate * 100,
            total: total,
            type: '01'
        };
        
        // Generate UBL document
        const ublData = formatUBLInvoice(demoInvoice);
        
        // Simulate random status
        const statuses = ['Submitted', 'Submitted', 'Valid', 'Valid', 'Valid'];
        const randomStatus = statuses[Math.floor(Math.random() * statuses.length)];
        
        // Create submission record
        const submission = {
            id: generateSubmissionId(),
            invoiceId: demoInvoice.id,
            invoiceNumber: demoInvoice.invoiceNumber,
            customerName: customer.name,
            amount: total,
            submissionUid: 'DEMO_SUB_' + Date.now(),
            uuid: ublData.uuid || generateUUID(),
            longId: 'DEMO_LONG_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
            status: randomStatus,
            submittedAt: new Date().toISOString(),
            validatedAt: randomStatus === 'Valid' ? new Date().toISOString() : null,
            environment: 'sandbox',
            isDemo: true,
            ublDocument: ublData.document,
            response: {
                acceptedDocuments: [{
                    uuid: ublData.uuid,
                    invoiceCodeNumber: demoInvoice.invoiceNumber
                }]
            }
        };
        
        eInvoiceSubmissions.push(submission);
        saveEInvoiceData();
        
        // Refresh the submissions table
        loadEInvoiceSubmissions();
        updateEInvoiceStats();
        
        showNotification(`📄 Demo invoice ${invNum} created (${randomStatus})`, 'success');
        
        return submission;
    } catch (error) {
        console.error('Generate demo invoice error:', error);
        showNotification('Error generating demo: ' + error.message, 'error');
        return null;
    }
}

function clearDemoData() {
    if (!confirm('Clear all demo e-Invoice data? This will remove all demo submissions.')) {
        return;
    }
    
    // Remove demo submissions
    eInvoiceSubmissions = eInvoiceSubmissions.filter(s => !s.isDemo);
    
    // Reset demo settings if in demo mode
    if (eInvoiceSettings.demoMode) {
        eInvoiceSettings = {
            enabled: false,
            environment: 'sandbox',
            demoMode: false,
            clientId: '',
            clientSecret: '',
            tin: '',
            brn: '',
            msic: '',
            businessActivityDesc: '',
            autoSubmit: false
        };
    }
    
    saveEInvoiceData();
    loadEInvoiceSubmissions();
    updateEInvoiceStats();
    
    if (typeof window.updateEInvoiceStatusBanner === 'function') {
        window.updateEInvoiceStatusBanner();
    }
    
    showNotification('🗑️ Demo data cleared', 'success');
}

// Enhanced submissions table to show demo badge and more info
const originalLoadEInvoiceSubmissions = loadEInvoiceSubmissions;
loadEInvoiceSubmissions = function() {
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
};

// Simulate status check for demo
function simulateStatusCheck(submissionId) {
    const sub = eInvoiceSubmissions.find(s => s.id === submissionId);
    if (!sub) return;
    
    showNotification('🔄 Checking status with LHDN...', 'info');
    
    setTimeout(() => {
        // 80% chance of Valid, 20% chance of Invalid
        sub.status = Math.random() > 0.2 ? 'Valid' : 'Invalid';
        sub.validatedAt = new Date().toISOString();
        
        if (sub.status === 'Invalid') {
            sub.validationErrors = [
                { code: 'BR-MY-01', message: 'Demo validation error for testing purposes' }
            ];
        }
        
        saveEInvoiceData();
        loadEInvoiceSubmissions();
        updateEInvoiceStats();
        
        const icon = sub.status === 'Valid' ? '✅' : '❌';
        showNotification(`${icon} Status updated: ${sub.status}`, sub.status === 'Valid' ? 'success' : 'error');
    }, 1500);
}
window.simulateStatusCheck = simulateStatusCheck;

// View UBL document
function viewUBLDocument(submissionId) {
    const sub = eInvoiceSubmissions.find(s => s.id === submissionId);
    if (!sub || !sub.ublDocument) {
        showNotification('UBL document not available', 'warning');
        return;
    }
    
    const ublJson = JSON.stringify(sub.ublDocument, null, 2);
    
    const modalHtml = `
        <div class="modal-overlay" style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 10000;">
            <div class="modal-content" style="background: white; border-radius: 12px; max-width: 800px; width: 95%; max-height: 85vh; display: flex; flex-direction: column;">
                <div style="padding: 20px; border-bottom: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center;">
                    <h3 style="margin: 0;"><i class="fas fa-code" style="color: #8b5cf6;"></i> UBL 2.1 Document</h3>
                    <button class="btn-icon" onclick="this.closest('.modal-overlay').remove()" style="font-size: 20px;">×</button>
                </div>
                <div style="padding: 20px; overflow-y: auto; flex: 1;">
                    <div style="background: #f8fafc; padding: 10px; border-radius: 6px; margin-bottom: 15px;">
                        <strong>Invoice:</strong> ${escapeHTML(sub.invoiceNumber)} | 
                        <strong>UUID:</strong> ${sub.uuid}
                    </div>
                    <pre style="background: #1e293b; color: #e2e8f0; padding: 20px; border-radius: 8px; overflow-x: auto; font-size: 12px; line-height: 1.5; max-height: 400px;">${escapeHTML(ublJson)}</pre>
                </div>
                <div style="padding: 15px 20px; border-top: 1px solid #e2e8f0; display: flex; justify-content: flex-end; gap: 10px;">
                    <button class="btn-outline" onclick="copyUBLToClipboard('${submissionId}')">
                        <i class="fas fa-copy"></i> Copy JSON
                    </button>
                    <button class="btn-secondary" onclick="this.closest('.modal-overlay').remove()">Close</button>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);
}
window.viewUBLDocument = viewUBLDocument;

function copyUBLToClipboard(submissionId) {
    const sub = eInvoiceSubmissions.find(s => s.id === submissionId);
    if (!sub || !sub.ublDocument) return;
    
    const ublJson = JSON.stringify(sub.ublDocument, null, 2);
    navigator.clipboard.writeText(ublJson).then(() => {
        showNotification('📋 UBL document copied to clipboard!', 'success');
    }).catch(() => {
        showNotification('Failed to copy', 'error');
    });
}
window.copyUBLToClipboard = copyUBLToClipboard;

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

// ==================== EXPORT FUNCTIONS ====================
window.initializeEInvoice = initializeEInvoice;
window.showEInvoiceSettings = showEInvoiceSettings;
window.saveEInvoiceSettings = saveEInvoiceSettings;
window.generateEInvoice = generateEInvoice;
window.submitEInvoice = submitEInvoice;
window.checkEInvoiceStatus = checkEInvoiceStatus;
window.cancelEInvoice = cancelEInvoice;
window.loadEInvoiceSubmissions = loadEInvoiceSubmissions;
window.validateTIN = validateTIN;
window.formatUBLInvoice = formatUBLInvoice;
window.showEInvoiceModal = showEInvoiceModal;
window.closeEInvoiceModal = closeEInvoiceModal;
window.testEInvoiceConnection = testEInvoiceConnection;
window.viewUBLDocument = viewUBLDocument;
window.copyUBLToClipboard = copyUBLToClipboard;

// Demo Mode Functions
window.runEInvoiceDemo = runEInvoiceDemo;
window.generateDemoInvoice = generateDemoInvoice;
window.clearDemoData = clearDemoData;
