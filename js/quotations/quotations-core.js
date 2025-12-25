// ==================== QUOTATIONS CORE ====================
// Core data management, initialization, load/save, stats

const QUOTATIONS_KEY = 'quotations';
let quotations = [];

// ==================== INITIALIZATION ====================
function initializeQuotations() {
    loadQuotations();
    updateQuotationStats();
}

function loadQuotations() {
    // Check for tenant-specific data first if available
    if (typeof window.getCurrentTenantKey === 'function') {
        const tenantKey = window.getCurrentTenantKey();
        if (tenantKey) {
            const tenantData = localStorage.getItem(`erp_tenant_${tenantKey}_quotations`);
            if (tenantData) {
                try {
                    quotations = JSON.parse(tenantData);
                    console.log(`Loaded ${quotations.length} quotations for tenant: ${tenantKey}`);
                    return;
                } catch (e) {
                    console.error('Error loading tenant quotations:', e);
                }
            }
        }
    }
    
    // Fallback to regular storage
    const data = localStorage.getItem(QUOTATIONS_KEY);
    if (data) {
        try {
            quotations = JSON.parse(data);
        } catch (e) {
            console.error('Error loading quotations:', e);
            quotations = [];
        }
    }
}

function saveQuotations() {
    // Save directly for current tenant if available
    if (typeof window.getCurrentTenantKey === 'function') {
        const tenantKey = window.getCurrentTenantKey();
        if (tenantKey) {
            localStorage.setItem(`erp_tenant_${tenantKey}_quotations`, JSON.stringify(quotations));
        }
    }
    
    // Also save to regular key for compatibility
    localStorage.setItem(QUOTATIONS_KEY, JSON.stringify(quotations));
}

// ==================== QUOTATION NUMBER GENERATION ====================
function generateQuotationNo() {
    // Check for document numbering feature first
    if (typeof generateDocumentNumber === 'function') {
        try {
            return generateDocumentNumber('quotation');
        } catch (e) {
            console.log('Document numbering not available, using fallback');
        }
    }
    
    // Fallback to simple numbering
    const date = new Date();
    const year = date.getFullYear().toString().substr(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    
    // Get highest number for this month
    const prefix = `QT${year}${month}`;
    let maxNum = 0;
    
    quotations.forEach(q => {
        if (q.quotationNo && q.quotationNo.startsWith(prefix)) {
            const num = parseInt(q.quotationNo.substr(prefix.length)) || 0;
            if (num > maxNum) maxNum = num;
        }
    });
    
    return prefix + (maxNum + 1).toString().padStart(4, '0');
}

// ==================== STATS ====================
function updateQuotationStats() {
    const total = quotations.length;
    const pending = quotations.filter(q => q.status === 'sent').length;
    const accepted = quotations.filter(q => q.status === 'accepted').length;
    
    // Update dashboard stats if elements exist
    const totalEl = document.getElementById('totalQuotations');
    const pendingEl = document.getElementById('pendingQuotations');
    const acceptedEl = document.getElementById('acceptedQuotations');
    
    if (totalEl) totalEl.textContent = total;
    if (pendingEl) pendingEl.textContent = pending;
    if (acceptedEl) acceptedEl.textContent = accepted;
    
    // Calculate total value
    const totalValue = quotations.reduce((sum, q) => sum + (parseFloat(q.totalAmount) || 0), 0);
    const valueEl = document.getElementById('quotationsValue');
    if (valueEl) valueEl.textContent = formatCurrency(totalValue);
}

// ==================== HELPER FUNCTIONS ====================
function formatDate(dateStr) {
    if (!dateStr) return 'N/A';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' });
}

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', function() {
    initializeQuotations();
});

// ==================== WINDOW EXPORTS ====================
window.QUOTATIONS_KEY = QUOTATIONS_KEY;
window.quotations = quotations;
window.initializeQuotations = initializeQuotations;
window.loadQuotations = loadQuotations;
window.saveQuotations = saveQuotations;
window.generateQuotationNo = generateQuotationNo;
window.updateQuotationStats = updateQuotationStats;
