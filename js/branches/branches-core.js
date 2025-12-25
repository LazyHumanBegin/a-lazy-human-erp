/**
 * BRANCHES-CORE.JS
 * Multi-Branch Management Module - Core
 * Constants, Initialization, Data Management
 * Version: 2.2.7 - Modular Split - 26 Dec 2025
 */

// ==================== CONSTANTS ====================
const BRANCHES_KEY = 'ezcubic_branches';
const BRANCH_TRANSFERS_KEY = 'ezcubic_branch_transfers';
const CURRENT_BRANCH_KEY = 'ezcubic_current_branch';

// ==================== GLOBAL VARIABLES ====================
let branches = [];
let branchTransfers = [];
let currentBranchId = null;
let _branchesInitialized = false;

// Sync local variables with window (called by multi-tenant system)
function syncBranchesFromWindow() {
    if (Array.isArray(window.branches)) {
        branches = window.branches;
    }
}
window.syncBranchesFromWindow = syncBranchesFromWindow;

// Create default HQ branch for all accounts
function createDefaultHQBranch() {
    const hqBranch = {
        id: 'BRANCH_HQ',
        code: 'HQ',
        name: 'Headquarters',
        type: 'headquarters',
        address: '',
        city: '',
        state: '',
        postcode: '',
        phone: '',
        email: '',
        manager: '',
        status: 'active',
        isDefault: true,
        createdAt: new Date().toISOString()
    };
    branches.push(hqBranch);
    currentBranchId = hqBranch.id;
    
    localStorage.setItem(BRANCHES_KEY, JSON.stringify(branches));
    window.branches = branches;
    
    // DIRECT tenant save
    const user = window.currentUser;
    if (user && user.tenantId) {
        const tenantKey = 'ezcubic_tenant_' + user.tenantId;
        let tenantData = JSON.parse(localStorage.getItem(tenantKey) || '{}');
        tenantData.branches = branches;
        tenantData.updatedAt = new Date().toISOString();
        localStorage.setItem(tenantKey, JSON.stringify(tenantData));
        console.log('✅ HQ branch saved directly to tenant');
    }
    
    console.log('Created default HQ branch');
}
window.createDefaultHQBranch = createDefaultHQBranch;

// Ensure default HQ exists
function ensureDefaultHQExists() {
    console.log('ensureDefaultHQExists called, current branches:', branches.length);
    
    if (Array.isArray(window.branches)) {
        branches = window.branches;
    }
    
    const hqExists = branches.some(b => b.id === 'BRANCH_HQ' || b.type === 'headquarters');
    
    if (!hqExists) {
        const limit = getBranchLimit();
        console.log('No HQ found. Branch limit:', limit);
        
        if (limit !== 0) {
            console.log('Creating HQ branch...');
            createDefaultHQBranch();
        }
    }
    
    window.branches = branches;
}
window.ensureDefaultHQExists = ensureDefaultHQExists;

// Get branch limit based on current user's plan
function getBranchLimit() {
    const currentUser = typeof getCurrentUser === 'function' ? getCurrentUser() : window.currentUser;
    const settings = typeof getPlatformSettings === 'function' ? getPlatformSettings() : null;
    
    if (currentUser && (currentUser.role === 'founder' || currentUser.role === 'erp_assistant')) {
        return -1; // Unlimited
    }
    
    if (!currentUser || !settings || !settings.plans) {
        return 1;
    }
    
    const userPlan = currentUser.plan || 'starter';
    const planData = settings.plans[userPlan];
    
    if (planData && planData.limits) {
        return planData.limits.branches || 1;
    }
    
    return 1;
}

// Check if user can add more branches
function canAddBranch() {
    const limit = getBranchLimit();
    const currentCount = branches.length;
    
    if (limit === -1) {
        return { allowed: true, current: currentCount, limit: -1 };
    }
    
    return {
        allowed: currentCount < limit,
        current: currentCount,
        limit: limit
    };
}
window.canAddBranch = canAddBranch;

// ==================== INITIALIZATION ====================
function initializeBranches() {
    console.log('initializeBranches called');
    
    syncBranchesFromWindow();
    loadBranchData();
    
    const hqExists = branches.some(b => b.id === 'BRANCH_HQ' || b.type === 'headquarters');
    
    if (!hqExists && branches.length === 0) {
        const limit = getBranchLimit();
        if (limit !== 0) {
            createDefaultHQBranch();
        }
    }
    
    if (!currentBranchId && branches.length > 0) {
        currentBranchId = branches.find(b => b.isDefault)?.id || branches[0].id;
        localStorage.setItem(CURRENT_BRANCH_KEY, currentBranchId);
    }
    
    renderBranchSelector();
    renderBranches();
    updateBranchStats();
    syncBranchesToOutlets();
    initializeBranchStockFromProducts();
}

function loadBranchData() {
    try {
        const user = window.currentUser;
        if (user && user.tenantId) {
            const tenantKey = 'ezcubic_tenant_' + user.tenantId;
            const tenantData = JSON.parse(localStorage.getItem(tenantKey) || '{}');
            if (Array.isArray(tenantData.branches) && tenantData.branches.length > 0) {
                branches = tenantData.branches;
                window.branches = branches;
            }
            if (Array.isArray(tenantData.branchTransfers)) {
                branchTransfers = tenantData.branchTransfers;
                window.branchTransfers = branchTransfers;
            }
            if (branches.length > 0) {
                currentBranchId = localStorage.getItem(CURRENT_BRANCH_KEY);
                return;
            }
        }
        
        if (Array.isArray(window.branches) && window.branches.length > 0) {
            branches = window.branches;
        } else {
            const storedBranches = localStorage.getItem(BRANCHES_KEY);
            if (storedBranches) {
                branches = JSON.parse(storedBranches);
                if (!Array.isArray(branches)) branches = [];
            }
            window.branches = branches;
        }
        
        if (Array.isArray(window.branchTransfers) && window.branchTransfers.length > 0) {
            branchTransfers = window.branchTransfers;
        } else {
            const storedTransfers = localStorage.getItem(BRANCH_TRANSFERS_KEY);
            if (storedTransfers) {
                branchTransfers = JSON.parse(storedTransfers);
                if (!Array.isArray(branchTransfers)) branchTransfers = [];
            }
            window.branchTransfers = branchTransfers;
        }
        
        currentBranchId = localStorage.getItem(CURRENT_BRANCH_KEY);
    } catch (e) {
        console.error('Error loading branch data:', e);
        branches = [];
        branchTransfers = [];
    }
}

function saveBranchData() {
    try {
        localStorage.setItem(BRANCHES_KEY, JSON.stringify(branches));
        localStorage.setItem(BRANCH_TRANSFERS_KEY, JSON.stringify(branchTransfers));
        if (currentBranchId) {
            localStorage.setItem(CURRENT_BRANCH_KEY, currentBranchId);
        }
        
        const user = window.currentUser;
        if (user && user.tenantId) {
            const tenantKey = 'ezcubic_tenant_' + user.tenantId;
            let tenantData = JSON.parse(localStorage.getItem(tenantKey) || '{}');
            tenantData.branches = branches;
            tenantData.branchTransfers = branchTransfers;
            tenantData.updatedAt = new Date().toISOString();
            localStorage.setItem(tenantKey, JSON.stringify(tenantData));
        }
        
        window.branches = branches;
        window.branchTransfers = branchTransfers;
    } catch (e) {
        console.error('Error saving branch data:', e);
    }
}

// ==================== HELPER FUNCTIONS ====================
function formatRM(amount) {
    return 'RM ' + (amount || 0).toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDate(dateStr) {
    return new Date(dateStr).toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' });
}

function escapeHTML(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

function showNotification(message, type = 'info') {
    if (typeof window.showNotification === 'function' && window.showNotification !== showNotification) {
        window.showNotification(message, type);
    } else {
        console.log(`[${type.toUpperCase()}] ${message}`);
    }
}

function getCurrentBranch() {
    return branches.find(b => b.id === currentBranchId) || branches[0];
}

function getCurrentBranchId() {
    return currentBranchId;
}

function switchBranch(branchId) {
    if (branchId === 'all') {
        currentBranchId = null;
        localStorage.removeItem(CURRENT_BRANCH_KEY);
        showNotification('Viewing all branches', 'info');
    } else {
        const branch = branches.find(b => b.id === branchId);
        if (!branch || branch.status !== 'active') return;
        
        currentBranchId = branchId;
        localStorage.setItem(CURRENT_BRANCH_KEY, currentBranchId);
        showNotification(`Switched to ${branch.name}`, 'success');
    }
    
    refreshCurrentView();
}

function refreshCurrentView() {
    if (typeof updateDashboard === 'function') updateDashboard();
    if (typeof loadTransactions === 'function') loadTransactions();
    if (typeof renderInventory === 'function') renderInventory();
    if (typeof loadPurchaseOrders === 'function') loadPurchaseOrders();
    if (typeof updateBranchStats === 'function') updateBranchStats();
}

function generateTransferNumber() {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const count = branchTransfers.filter(t => {
        const d = new Date(t.createdAt);
        return d.getFullYear() === date.getFullYear() && d.getMonth() === date.getMonth();
    }).length + 1;
    
    return `TRF${year}${month}${count.toString().padStart(4, '0')}`;
}

// ==================== EXPORT TO WINDOW ====================
window.BRANCHES_KEY = BRANCHES_KEY;
window.BRANCH_TRANSFERS_KEY = BRANCH_TRANSFERS_KEY;
window.CURRENT_BRANCH_KEY = CURRENT_BRANCH_KEY;
window.branches = branches;
window.branchTransfers = branchTransfers;

window.initializeBranches = initializeBranches;
window.loadBranchData = loadBranchData;
window.saveBranchData = saveBranchData;
window.getBranchLimit = getBranchLimit;
window.formatRM = formatRM;
window.formatDate = formatDate;
window.escapeHTML = escapeHTML;
window.getCurrentBranch = getCurrentBranch;
window.getCurrentBranchId = getCurrentBranchId;
window.switchBranch = switchBranch;
window.refreshCurrentView = refreshCurrentView;
window.generateTransferNumber = generateTransferNumber;
