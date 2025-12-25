// ==================== E-INVOICE-CORE.JS ====================
// LHDN MyInvois e-Invoice Integration - Core & Settings
// Part A of e-invoice.js split
// Version: 2.1.5 - 17 Dec 2025

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

function closeEInvoiceSettingsModal() {
    const modal = document.getElementById('eInvoiceSettingsModal');
    if (modal) modal.style.display = 'none';
}

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

// ==================== WINDOW EXPORTS ====================
window.EINVOICE_CONFIG = EINVOICE_CONFIG;
window.EINVOICE_SETTINGS_KEY = EINVOICE_SETTINGS_KEY;
window.EINVOICE_SUBMISSIONS_KEY = EINVOICE_SUBMISSIONS_KEY;
window.DEMO_CUSTOMERS = DEMO_CUSTOMERS;
window.DEMO_PRODUCTS = DEMO_PRODUCTS;

window.initializeEInvoice = initializeEInvoice;
window.loadEInvoiceData = loadEInvoiceData;
window.saveEInvoiceData = saveEInvoiceData;
window.showEInvoiceSettings = showEInvoiceSettings;
window.createEInvoiceSettingsModal = createEInvoiceSettingsModal;
window.checkAutoSubmitAvailability = checkAutoSubmitAvailability;
window.closeEInvoiceSettingsModal = closeEInvoiceSettingsModal;
window.validateTINFormat = validateTINFormat;
window.saveEInvoiceSettings = saveEInvoiceSettings;
window.testEInvoiceConnection = testEInvoiceConnection;
window.getAuthToken = getAuthToken;
window.updateEInvoiceStats = updateEInvoiceStats;

// Helper functions
window.generateUUID = generateUUID;
window.generateSubmissionId = generateSubmissionId;
window.generateDocumentHash = generateDocumentHash;
window.formatISODate = formatISODate;
window.formatISOTime = formatISOTime;
window.formatDateTime = formatDateTime;
window.getStateCode = getStateCode;
window.validateTIN = validateTIN;
window.escapeHTML = escapeHTML;
