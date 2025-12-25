/**
 * EZCubic - User Management Core Module
 * Constants, storage, Supabase client, password hashing, roles, modules
 * Version: 2.2.5 - Split from users.js
 */

// ==================== USER DATA STORAGE ====================
const USERS_KEY = 'ezcubic_users';
const CURRENT_USER_KEY = 'ezcubic_current_user';
const USER_SESSIONS_KEY = 'ezcubic_sessions';
const SESSION_TOKEN_KEY = 'ezcubic_session_token';

// ==================== SHARED SUPABASE CLIENT ====================
// Singleton pattern to prevent "Multiple GoTrueClient instances" warning
let _usersModuleSupabaseClient = null;
const SUPABASE_CONFIG = {
    url: 'https://tctpmizdcksdxngtozwe.supabase.co',
    key: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRjdHBtaXpkY2tzZHhuZ3RvendlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYyOTE1NzAsImV4cCI6MjA4MTg2NzU3MH0.-BL0NoQxVfFA3MXEuIrC24G6mpkn7HGIyyoRBVFu300'
};

function getUsersSupabaseClient() {
    if (!_usersModuleSupabaseClient) {
        if (window.supabase && window.supabase.createClient) {
            _usersModuleSupabaseClient = window.supabase.createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.key);
        }
    }
    return _usersModuleSupabaseClient;
}
// Expose globally for other modules
window.getUsersSupabaseClient = getUsersSupabaseClient;

// Generate unique session token
function generateSessionToken() {
    return 'sess_' + Date.now() + '_' + Math.random().toString(36).substring(2, 15);
}

// ==================== PASSWORD HASHING ====================
// Secure password hashing using SHA-256 (built-in Web Crypto API)
async function hashPassword(password) {
    const encoder = new TextEncoder();
    const data = encoder.encode(password + 'ezcubic_salt_2024'); // Add salt for extra security
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex;
}

// Sync version for backward compatibility (uses simple hash)
function hashPasswordSync(password) {
    // Simple hash for sync operations - still better than plain text
    let hash = 0;
    const str = password + 'ezcubic_salt_2024';
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
    }
    // Convert to hex and pad to make it look like a proper hash
    return 'h1_' + Math.abs(hash).toString(16).padStart(8, '0') + Date.now().toString(36).slice(-4);
}

// Check if a password is hashed (starts with hash prefix or is 64 chars hex)
function isPasswordHashed(password) {
    if (!password) return false;
    // Check for our hash prefixes or SHA-256 length (64 hex chars)
    return password.startsWith('h1_') || /^[a-f0-9]{64}$/.test(password);
}

// Verify password (handles both hashed and legacy plain text)
async function verifyPassword(inputPassword, storedPassword) {
    // If stored password is not hashed (legacy), compare directly
    if (!isPasswordHashed(storedPassword)) {
        return inputPassword === storedPassword;
    }
    
    // If it's our sync hash format
    if (storedPassword.startsWith('h1_')) {
        // For h1_ hashes, we need to compare the base hash part (first 8 chars after prefix)
        const inputHash = hashPasswordSync(inputPassword);
        return storedPassword.substring(0, 11) === inputHash.substring(0, 11);
    }
    
    // SHA-256 hash comparison
    const inputHash = await hashPassword(inputPassword);
    return inputHash === storedPassword;
}

// Generate unique Company Code for tenant (e.g., "ACME-7X2K")
function generateCompanyCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // No confusing chars (0,O,1,I,L)
    let code = '';
    for (let i = 0; i < 4; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code + '-' + Date.now().toString(36).toUpperCase().slice(-4);
}

// Default Founder Account (You)
const DEFAULT_FOUNDER = {
    id: 'founder_001',
    email: 'founder@ezcubic.com',
    password: 'founder123', // In production, this would be hashed
    name: 'Founder',
    role: 'founder',
    status: 'active',
    permissions: ['all'],
    tenantId: 'tenant_founder', // Founder gets their own isolated tenant
    createdAt: new Date().toISOString(),
    createdBy: 'system'
};

// Role Definitions
const ROLES = {
    founder: {
        name: 'Founder',
        level: 1,
        description: 'Full system access - Owner',
        color: '#7c3aed',
        icon: 'fa-crown',
        canManage: ['erp_assistant', 'business_admin', 'personal', 'manager', 'staff'],
        defaultPermissions: ['all']
    },
    erp_assistant: {
        name: 'ERP Assistant',
        level: 2,
        description: 'A Lazy Human Staff - Platform management only',
        color: '#2563eb',
        icon: 'fa-user-tie',
        canManage: ['business_admin', 'personal', 'manager', 'staff'],
        defaultPermissions: ['users'], // Only user management - NO access to customer business data
        platformOnly: true // Flag to indicate this role cannot view tenant data
    },
    business_admin: {
        name: 'Business Admin',
        level: 3,
        description: 'Business Owner/User',
        color: '#10b981',
        icon: 'fa-building',
        canManage: ['manager', 'staff'],
        defaultPermissions: ['dashboard', 'transactions', 'inventory', 'pos', 'reports']
    },
    personal: {
        name: 'Personal',
        level: 3,
        description: 'Personal Finance User - Basic features only',
        color: '#64748b',
        icon: 'fa-user',
        canManage: [],
        defaultPermissions: ['dashboard', 'transactions', 'income', 'expenses', 'reports', 'taxes', 'balance-sheet', 'monthly-reports', 'ai-chatbot'],
        plan: 'personal' // Links to personal plan for feature restrictions
    },
    manager: {
        name: 'Manager',
        level: 4,
        description: 'Business Manager',
        color: '#f59e0b',
        icon: 'fa-user-shield',
        canManage: ['staff'],
        defaultPermissions: ['dashboard', 'transactions', 'inventory', 'pos']
    },
    staff: {
        name: 'Staff',
        level: 5,
        description: 'Business Staff',
        color: '#64748b',
        icon: 'fa-user',
        canManage: [],
        defaultPermissions: ['pos']
    }
};

// ERP Modules organized by category
const ERP_MODULE_CATEGORIES = [
    {
        id: 'finance',
        name: 'Finance & Accounting',
        icon: 'fa-coins',
        color: '#10b981',
        modules: [
            { id: 'dashboard', name: 'Dashboard', icon: 'fa-tachometer-alt' },
            { id: 'transactions', name: 'Transactions', icon: 'fa-exchange-alt' },
            { id: 'income', name: 'Record Income', icon: 'fa-plus-circle' },
            { id: 'expenses', name: 'Record Expenses', icon: 'fa-minus-circle' },
            { id: 'bills', name: 'Bills', icon: 'fa-file-invoice' },
            { id: 'reports', name: 'Reports', icon: 'fa-chart-bar' },
            { id: 'taxes', name: 'Taxes', icon: 'fa-percentage' },
            { id: 'balance', name: 'Balance Sheet', icon: 'fa-balance-scale' },
            { id: 'monthly-reports', name: 'Monthly Reports', icon: 'fa-calendar-alt' },
            { id: 'bank-reconciliation', name: 'Bank Reconciliation', icon: 'fa-check-double' },
            { id: 'lhdn-export', name: 'LHDN & Audit Export', icon: 'fa-file-export' }
        ]
    },
    {
        id: 'accounting',
        name: 'Accounting',
        icon: 'fa-book',
        color: '#0891b2',
        modules: [
            { id: 'chart-of-accounts', name: 'Chart of Accounts', icon: 'fa-sitemap' },
            { id: 'journal-entries', name: 'Journal Entries', icon: 'fa-book' },
            { id: 'aging-reports', name: 'AR/AP Aging Reports', icon: 'fa-clock' }
        ]
    },
    {
        id: 'sales',
        name: 'Sales & CRM',
        icon: 'fa-shopping-cart',
        color: '#2563eb',
        modules: [
            { id: 'pos', name: 'Point of Sale', icon: 'fa-cash-register' },
            { id: 'quotations', name: 'Quotations', icon: 'fa-file-alt' },
            { id: 'invoices', name: 'Invoices', icon: 'fa-file-invoice-dollar' },
            { id: 'orders', name: 'Orders', icon: 'fa-shopping-cart' },
            { id: 'crm', name: 'CRM / Customers', icon: 'fa-users' },
            { id: 'einvoice', name: 'e-Invoice', icon: 'fa-file-invoice-dollar' },
            { id: 'email-invoice', name: 'Invoice/Receipt', icon: 'fa-envelope' },
            { id: 'customers', name: 'Customers', icon: 'fa-address-book' }
        ]
    },
    {
        id: 'inventory',
        name: 'Inventory & Stock',
        icon: 'fa-boxes',
        color: '#f59e0b',
        modules: [
            { id: 'inventory', name: 'Inventory', icon: 'fa-boxes' },
            { id: 'stock', name: 'Stock Control', icon: 'fa-warehouse' },
            { id: 'products', name: 'Products', icon: 'fa-box' }
        ]
    },
    {
        id: 'purchasing',
        name: 'Purchasing',
        icon: 'fa-truck',
        color: '#8b5cf6',
        modules: [
            { id: 'suppliers', name: 'Suppliers', icon: 'fa-truck' },
            { id: 'purchase-orders', name: 'Purchase Orders', icon: 'fa-shopping-cart' },
            { id: 'delivery-orders', name: 'Delivery Orders', icon: 'fa-shipping-fast' }
        ]
    },
    {
        id: 'hr',
        name: 'HR & Payroll',
        icon: 'fa-user-tie',
        color: '#ec4899',
        modules: [
            { id: 'employees', name: 'Employees', icon: 'fa-users' },
            { id: 'payroll', name: 'Payroll', icon: 'fa-money-check-alt' },
            { id: 'leave-attendance', name: 'Leave & Attendance', icon: 'fa-calendar-check' },
            { id: 'kpi', name: 'KPI & Performance', icon: 'fa-chart-line' }
        ]
    },
    {
        id: 'projects',
        name: 'Projects',
        icon: 'fa-project-diagram',
        color: '#06b6d4',
        modules: [
            { id: 'projects', name: 'Projects', icon: 'fa-project-diagram' }
        ]
    },
    {
        id: 'admin',
        name: 'Administration',
        icon: 'fa-cog',
        color: '#64748b',
        modules: [
            { id: 'branches', name: 'Branches', icon: 'fa-code-branch' },
            { id: 'settings', name: 'Settings', icon: 'fa-cog' },
            { id: 'users', name: 'User Management', icon: 'fa-users-cog' },
            { id: 'backup-restore', name: 'Backup & Restore', icon: 'fa-database' }
        ]
    },
    {
        id: 'ai',
        name: 'AI Tools',
        icon: 'fa-robot',
        color: '#6366f1',
        modules: [
            { id: 'ai-chatbot', name: 'AI Assistant', icon: 'fa-robot' }
        ]
    }
];

// Flat ERP_MODULES for backward compatibility
const ERP_MODULES = ERP_MODULE_CATEGORIES.flatMap(cat => cat.modules);

// User Data
let users = [];
let currentUser = null;

// ==================== WINDOW EXPORTS ====================
window.USERS_KEY = USERS_KEY;
window.CURRENT_USER_KEY = CURRENT_USER_KEY;
window.USER_SESSIONS_KEY = USER_SESSIONS_KEY;
window.SESSION_TOKEN_KEY = SESSION_TOKEN_KEY;
window.SUPABASE_CONFIG = SUPABASE_CONFIG;
window.DEFAULT_FOUNDER = DEFAULT_FOUNDER;
window.ROLES = ROLES;
window.ERP_MODULE_CATEGORIES = ERP_MODULE_CATEGORIES;
window.ERP_MODULES = ERP_MODULES;
window.generateSessionToken = generateSessionToken;
window.hashPassword = hashPassword;
window.hashPasswordSync = hashPasswordSync;
window.isPasswordHashed = isPasswordHashed;
window.verifyPassword = verifyPassword;
window.generateCompanyCode = generateCompanyCode;
