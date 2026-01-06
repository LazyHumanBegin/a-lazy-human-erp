// ==================== CORE.JS ====================
// Constants, Data Structure & Helper Functions
// ==================== STORAGE KEYS ====================
const STORAGE_KEY = 'ezcubicDataMY';
const MANUAL_BALANCES_KEY = 'ezcubic_manual_balances';
const BANK_ACCOUNTS_KEY = 'ezcubic_bank_accounts';
const BALANCE_HISTORY_KEY = 'ezcubic_balance_history';
const OPENING_BALANCE_KEY = 'ezcubic_opening_balances';
const PRODUCTS_KEY = 'ezcubic_products';
const CUSTOMERS_KEY = 'ezcubic_customers';
const STOCK_MOVEMENTS_KEY = 'ezcubic_stock_movements';
const SALES_KEY = 'ezcubic_sales';
const OUTLETS_KEY = 'ezcubic_outlets';

// ==================== SAFE LOCALSTORAGE UTILITIES ====================
/**
 * Safely get data from localStorage with JSON parsing
 * Prevents app crashes from corrupted/invalid JSON data
 * @param {string} key - localStorage key
 * @param {*} defaultValue - Default value if key doesn't exist or parsing fails
 * @returns {*} Parsed data or defaultValue
 */
function safeLocalStorageGet(key, defaultValue = null) {
    try {
        const stored = localStorage.getItem(key);
        if (stored === null || stored === undefined) {
            return defaultValue;
        }
        const parsed = JSON.parse(stored);
        // Validate array types
        if (Array.isArray(defaultValue) && !Array.isArray(parsed)) {
            console.warn(`safeLocalStorageGet: Expected array for ${key}, got ${typeof parsed}`);
            return defaultValue;
        }
        // Validate object types
        if (defaultValue !== null && typeof defaultValue === 'object' && !Array.isArray(defaultValue)) {
            if (typeof parsed !== 'object' || Array.isArray(parsed)) {
                console.warn(`safeLocalStorageGet: Expected object for ${key}, got ${typeof parsed}`);
                return defaultValue;
            }
        }
        return parsed;
    } catch (error) {
        console.error(`safeLocalStorageGet: Failed to parse ${key}:`, error);
        // Attempt to backup corrupted data
        try {
            const corrupted = localStorage.getItem(key);
            if (corrupted) {
                localStorage.setItem(`${key}_corrupted_${Date.now()}`, corrupted);
                console.log(`Corrupted data backed up to ${key}_corrupted_${Date.now()}`);
            }
        } catch (backupError) {
            console.error('Failed to backup corrupted data:', backupError);
        }
        return defaultValue;
    }
}

/**
 * Safely set data to localStorage with JSON stringifying
 * Handles quota exceeded errors and provides user feedback
 * @param {string} key - localStorage key
 * @param {*} value - Data to store
 * @returns {boolean} Success status
 */
function safeLocalStorageSet(key, value) {
    try {
        const serialized = JSON.stringify(value);
        localStorage.setItem(key, serialized);
        return true;
    } catch (error) {
        if (error.name === 'QuotaExceededError' || error.code === 22) {
            console.error(`safeLocalStorageSet: Storage quota exceeded for ${key}`);
            showNotification('Storage limit reached! Please export your data and clear old records.', 'error');
            // Try to show storage usage
            try {
                const usage = getStorageUsage();
                console.log('Current storage usage:', usage);
            } catch (e) {}
        } else {
            console.error(`safeLocalStorageSet: Failed to save ${key}:`, error);
            showNotification('Failed to save data. Please try again.', 'error');
        }
        return false;
    }
}

/**
 * Get current localStorage usage statistics
 * @returns {Object} Storage usage info
 */
function getStorageUsage() {
    let total = 0;
    let items = {};
    for (let key in localStorage) {
        if (localStorage.hasOwnProperty(key)) {
            const size = (localStorage[key].length * 2) / 1024; // Size in KB (UTF-16)
            total += size;
            items[key] = size.toFixed(2) + ' KB';
        }
    }
    return {
        totalKB: total.toFixed(2),
        totalMB: (total / 1024).toFixed(2),
        items: items,
        estimatedLimit: '5-10 MB (browser dependent)'
    };
}

/**
 * Check if localStorage is available and working
 * @returns {boolean}
 */
function isLocalStorageAvailable() {
    try {
        const testKey = '__storage_test__';
        localStorage.setItem(testKey, testKey);
        localStorage.removeItem(testKey);
        return true;
    } catch (e) {
        return false;
    }
}

/**
 * Create automatic backup before destructive operations
 * @param {string} reason - Reason for backup (e.g., 'before_reset', 'before_import')
 * @returns {boolean} Success status
 */
function createAutoBackup(reason = 'auto') {
    try {
        const backup = {
            timestamp: new Date().toISOString(),
            reason: reason,
            data: {}
        };
        
        // Backup critical data keys
        const criticalKeys = [
            'ezcubicDataMY', 'ezcubic_products', 'ezcubic_customers', 
            'ezcubic_suppliers', 'ezcubic_sales', 'ezcubic_transactions',
            'ezcubic_employees', 'ezcubic_payroll', 'ezcubic_journal_entries',
            'ezcubic_chart_of_accounts'
        ];
        
        criticalKeys.forEach(key => {
            const value = localStorage.getItem(key);
            if (value) {
                backup.data[key] = value;
            }
        });
        
        // Store backup with timestamp
        const backupKey = `ezcubic_autobackup_${reason}_${Date.now()}`;
        localStorage.setItem(backupKey, JSON.stringify(backup));
        
        // Keep only last 3 auto-backups per reason
        cleanOldAutoBackups(reason, 3);
        
        console.log(`Auto-backup created: ${backupKey}`);
        return true;
    } catch (error) {
        console.error('Failed to create auto-backup:', error);
        return false;
    }
}

/**
 * Clean old auto-backups, keeping only the most recent ones
 * @param {string} reason - Backup reason to filter
 * @param {number} keepCount - Number of backups to keep
 */
function cleanOldAutoBackups(reason, keepCount = 3) {
    try {
        const backupKeys = [];
        for (let key in localStorage) {
            if (key.startsWith(`ezcubic_autobackup_${reason}_`)) {
                backupKeys.push(key);
            }
        }
        
        // Sort by timestamp (newest first)
        backupKeys.sort().reverse();
        
        // Remove old backups
        backupKeys.slice(keepCount).forEach(key => {
            localStorage.removeItem(key);
        });
    } catch (error) {
        console.error('Failed to clean old backups:', error);
    }
}

// Export safe storage functions globally
window.safeLocalStorageGet = safeLocalStorageGet;
window.safeLocalStorageSet = safeLocalStorageSet;
window.getStorageUsage = getStorageUsage;
window.isLocalStorageAvailable = isLocalStorageAvailable;
window.createAutoBackup = createAutoBackup;

// ==================== PHASE 2 DATA ====================
let outlets = [];

// ==================== BUSINESS DATA STRUCTURE ====================
let businessData = {
    transactions: [],
    bills: [],
    // Phase 2: Operational Core
    products: [],
    customers: [],
    stockMovements: [],
    sales: [],
    currentCart: [],
    categories: ['General', 'Electronics', 'Food & Beverage', 'Clothing', 'Services', 'Office Supplies'],
    settings: {
        businessName: "My Malaysian Business",
        currency: "MYR",
        financialYearStart: new Date().toISOString().slice(0, 10),
        ssmNumber: "",
        tinNumber: "",
        gstNumber: "",
        defaultTaxRate: 17,
        showWelcome: true,
        // Phase 2 settings
        lowStockThreshold: 10,
        enableLoyaltyPoints: true,
        pointsPerRM: 1,
        pointsRedemptionRate: 100 // 100 points = RM1
    }
};
// CRITICAL: Expose businessData to window for cross-module access
window.businessData = businessData;

// Phase 2: Global references for operational modules
let products = [];
let customers = [];
let stockMovements = [];
let sales = [];
let currentCart = [];
let categories = ['General', 'Electronics', 'Food & Beverage', 'Clothing', 'Services', 'Office Supplies'];
let transactions = [];
let settings = {};

// Sync local arrays with window globals (called after tenant data loads)
function syncCoreFromWindow() {
    if (Array.isArray(window.products)) products = window.products;
    if (Array.isArray(window.customers)) customers = window.customers;
    if (Array.isArray(window.stockMovements)) stockMovements = window.stockMovements;
    if (Array.isArray(window.sales)) sales = window.sales;
    console.log('🔄 Core.js synced from window: products=' + products.length + ', customers=' + customers.length);
}
window.syncCoreFromWindow = syncCoreFromWindow;

// Chart instances
let incomeChart, pieChart, cashFlowChart, monthlyChart;

// ==================== HELPER FUNCTIONS ====================
function escapeHTML(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Alias for escapeHTML (used in Phase 2 modules)
function escapeHtml(text) {
    return escapeHTML(text);
}

function parseDateSafe(dateString) {
    if (!dateString) return new Date();
    
    if (dateString instanceof Date) return dateString;
    
    // Try multiple date formats
    if (typeof dateString === 'string') {
        // Try ISO format
        const isoDate = new Date(dateString);
        if (!isNaN(isoDate.getTime())) return isoDate;
        
        // Try YYYY-MM-DD format
        if (dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
            return new Date(dateString + 'T00:00:00');
        }
        
        // Try DD/MM/YYYY format (common in Malaysia)
        const parts = dateString.split(/[/-]/);
        if (parts.length === 3) {
            const day = parseInt(parts[0], 10);
            const month = parseInt(parts[1], 10) - 1;
            const year = parseInt(parts[2], 10);
            if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
                const date = new Date(year, month, day);
                if (!isNaN(date.getTime())) return date;
            }
        }
    }
    
    console.warn('Invalid date:', dateString, 'Using current date instead');
    return new Date();
}

function formatDateForInput(date) {
    const d = parseDateSafe(date);
    return d.toISOString().split('T')[0];
}

function formatCurrency(amount) {
    if (amount === null || amount === undefined || isNaN(amount)) amount = 0;
    
    return new Intl.NumberFormat('ms-MY', {
        style: 'currency',
        currency: 'MYR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(amount);
}

function formatNumber(number) {
    if (isNaN(number)) number = 0;
    return new Intl.NumberFormat('ms-MY').format(number);
}

function generateUniqueId() {
    return Date.now() + '-' + Math.random().toString(36).substr(2, 9);
}

function showNotification(message, type) {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        border-radius: 8px;
        color: white;
        font-weight: 600;
        z-index: 10000;
        animation: fadeIn 0.3s ease;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        min-width: 250px;
        max-width: 350px;
        background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#2563eb'};
    `;
    
    notification.innerHTML = `
        <div style="display: flex; align-items: center; justify-content: space-between;">
            <span>${escapeHTML(message)}</span>
            <button onclick="this.parentElement.parentElement.remove()" style="background: none; border: none; color: white; cursor: pointer; margin-left: 10px;">
                ×
            </button>
        </div>
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        if (notification.parentNode) {
            notification.style.opacity = '0';
            notification.style.transition = 'opacity 0.3s';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }
    }, 3000);
}

// ==================== PHASE 2: HELPER FUNCTIONS ====================
// Toast notification (alias for showNotification)
function showToast(message, type = 'info') {
    showNotification(message, type);
}

// Get Malaysia date/time
function getMalaysiaDateTime() {
    return new Date().toLocaleString('en-MY', { timeZone: 'Asia/Kuala_Lumpur' });
}

// Format date to Malaysia timezone
function formatMalaysiaDate(date) {
    const d = date ? new Date(date) : new Date();
    return d.toLocaleDateString('en-MY', { 
        timeZone: 'Asia/Kuala_Lumpur',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    });
}

// Format date and time to Malaysia timezone
function formatMalaysiaDateTime(date) {
    const d = date ? new Date(date) : new Date();
    return d.toLocaleString('en-MY', { 
        timeZone: 'Asia/Kuala_Lumpur',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
    });
}

// Generate UUID for unique IDs
function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

// Format currency in Malaysian Ringgit
function formatMYR(amount) {
    if (amount === null || amount === undefined || isNaN(amount)) amount = 0;
    return 'RM ' + parseFloat(amount).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

// Format number as RM 5,000.00
function formatRM(amount) {
    if (isNaN(amount) || amount === null || amount === undefined) return 'RM 0.00';
    return 'RM ' + Number(amount).toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Close modal by ID - handles both class-based and inline style modals
function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('show');
        // Only set display:none for dynamically created modals
        // Static modals use CSS .show class for visibility
        if (modal.dataset.dynamic === 'true') {
            modal.style.display = 'none';
            modal.remove();
        }
    }
}

// Open modal by ID
function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        // Clear any inline display style that might override CSS
        modal.style.display = '';
        modal.classList.add('show');
    }
}

// Clean up any orphan/stuck modal overlays - call this if buttons stop working
function cleanupModals() {
    // Remove dynamic modal overlays (created by JS, not in original HTML)
    document.querySelectorAll('.modal-overlay').forEach(el => el.remove());
    
    // Remove show class from all modals
    document.querySelectorAll('.modal.show').forEach(modal => {
        modal.classList.remove('show');
    });
    
    console.log('Modal cleanup completed');
}

// Initialize modal backdrop click-to-close functionality
function initModalBackdropClose() {
    document.addEventListener('click', function(e) {
        // If clicking directly on a modal backdrop (not its content)
        if (e.target.classList.contains('modal') && e.target.classList.contains('show')) {
            const modalId = e.target.id;
            if (modalId) {
                closeModal(modalId);
            }
        }
    });
}

// Run initialization
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initModalBackdropClose);
} else {
    initModalBackdropClose();
}

function getDefaultSettings() {
    return {
        businessName: "My Malaysian Business",
        currency: "MYR",
        financialYearStart: new Date().toISOString().slice(0, 10),
        ssmNumber: "",
        tinNumber: "",
        gstNumber: "",
        defaultTaxRate: 17,
        showWelcome: true
    };
}

function validateTaxInput(input, maxValue) {
    const value = parseFloat(input.value) || 0;
    if (value > maxValue) {
        input.value = maxValue;
        showNotification(`Maximum value is ${maxValue}`, 'warning');
    } else if (value < 0) {
        input.value = 0;
        showNotification('Value cannot be negative', 'warning');
    }
    calculatePersonalTax();
}

// Update element text safely
function updateElementText(id, text) {
    const element = document.getElementById(id);
    if (element) {
        element.textContent = text;
    }
}

// Get transactions from storage (helper function)
function getTransactionsFromStorage() {
    return businessData.transactions || [];
}

// Get bills from storage (helper function)
function getBillsFromStorage() {
    return businessData.bills || [];
}

function getMethodIcon(method) {
    const icons = {
        'cash': 'money-bill',
        'bank': 'university',
        'card': 'credit-card',
        'ewallet': 'mobile-alt',
        'check': 'money-check',
        'other': 'question-circle'
    };
    return icons[method] || 'money-bill';
}

function getCategoryColor(category) {
    const colors = {
        sales: '#2563eb',
        service: '#10b981',
        rental: '#8b5cf6',
        interest: '#f59e0b',
        other: '#06b6d4',
        rent: '#ef4444',
        utilities: '#f59e0b',
        supplies: '#06b6d4',
        salary: '#64748b',
        marketing: '#ec4899',
        travel: '#f97316',
        entertainment: '#8b5cf6',
        professional: '#14b8a6'
    };
    return colors[category] || '#8b5cf6';
}

function getCategoryName(category) {
    const names = {
        sales: 'Sales',
        service: 'Service',
        rental: 'Rental',
        interest: 'Interest',
        other: 'Other',
        rent: 'Rent',
        utilities: 'Utilities',
        supplies: 'Supplies',
        salary: 'Salaries & EPF',
        marketing: 'Marketing',
        travel: 'Travel',
        entertainment: 'Entertainment',
        professional: 'Professional Fees'
    };
    return names[category] || category.charAt(0).toUpperCase() + category.slice(1);
}

// ==================== EXPORT CORE FUNCTIONS TO WINDOW ====================
window.closeModal = closeModal;
window.openModal = openModal;
window.cleanupModals = cleanupModals;
window.formatMYR = formatMYR;
window.generateUUID = generateUUID;
window.escapeHtml = escapeHtml;
window.escapeHTML = escapeHtml; // Alias for capital HTML version
window.formatDateForInput = formatDateForInput;
window.showToast = showToast;
window.showNotification = showNotification;
window.getCategoryColor = getCategoryColor;
window.getCategoryName = getCategoryName;
window.getMalaysiaDateTime = getMalaysiaDateTime;
window.formatMalaysiaDate = formatMalaysiaDate;
window.formatMalaysiaDateTime = formatMalaysiaDateTime;
