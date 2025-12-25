/**
 * EZCubic - User Management & Access Control System
 * Role-based access control for multi-tenant ERP
 * Version: 1.0.0 - 17 Dec 2025
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

// ERP Modules for Permission Assignment
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

// ==================== INITIALIZATION ====================
function initializeUserSystem() {
    loadUsers();
    
    // Quick check - if no valid session, show login immediately (no flash)
    const session = localStorage.getItem(CURRENT_USER_KEY);
    const hasValidSession = session && JSON.parse(session).id;
    
    if (!hasValidSession) {
        // No session - show login page immediately, hide app
        showLoginPage();
        return;
    }
    
    // Has session - show app container
    const appContainer = document.getElementById('appContainer');
    if (appContainer) appContainer.style.display = '';
    
    // CLOUD SYNC: Try to sync users from cloud before checking session
    // This ensures Phone B gets user01 created on Phone A
    loadUsersFromCloud().then(() => {
        // Reload users in case cloud had updates
        loadUsers();
        checkSession();
        updateAuthUI();
    }).catch(() => {
        // Fallback to local-only if cloud fails
        checkSession();
        updateAuthUI();
    });
    
    // Start periodic session validation (every 30 seconds)
    startSessionValidation();
}

// Periodic session validation for single-device login
let sessionValidationInterval = null;
function startSessionValidation() {
    // Clear any existing interval
    if (sessionValidationInterval) {
        clearInterval(sessionValidationInterval);
    }
    
    // Check session every 30 seconds
    sessionValidationInterval = setInterval(() => {
        if (currentUser && currentUser.id) {
            validateSessionToken(currentUser);
        }
    }, 30000); // 30 seconds
}
window.startSessionValidation = startSessionValidation;

function loadUsers() {
    const stored = localStorage.getItem(USERS_KEY);
    if (stored) {
        users = JSON.parse(stored);
    }
    
    // Ensure founder account exists
    if (!users.find(u => u.role === 'founder')) {
        users.push(DEFAULT_FOUNDER);
        saveUsers();
    }
    
    // Ensure founder has tenantId
    const founder = users.find(u => u.role === 'founder');
    if (founder && !founder.tenantId) {
        founder.tenantId = 'tenant_founder';
        saveUsers();
    }
    
    // Always check if founder's tenant DATA exists (not just tenantId)
    // If tenant data is missing, migrate existing global data
    if (founder && founder.tenantId) {
        const tenantKey = 'ezcubic_tenant_' + founder.tenantId;
        const existingTenantData = localStorage.getItem(tenantKey);
        
        if (!existingTenantData) {
            console.log('Founder tenant data missing, migrating...');
            migrateFounderData(founder.tenantId);
        } else {
            // Check if tenant data is empty/corrupted
            try {
                const parsed = JSON.parse(existingTenantData);
                const isEmpty = !parsed.transactions?.length && !parsed.products?.length && !parsed.customers?.length;
                
                // If tenant is empty but global data exists, re-migrate
                const globalData = JSON.parse(localStorage.getItem('ezcubicDataMY') || '{}');
                const globalProducts = JSON.parse(localStorage.getItem('ezcubic_products') || '[]');
                
                if (isEmpty && (globalData.transactions?.length > 0 || globalProducts.length > 0)) {
                    console.log('Founder tenant empty but global data exists, re-migrating...');
                    localStorage.removeItem(tenantKey); // Remove empty tenant
                    migrateFounderData(founder.tenantId);
                }
            } catch(e) {
                console.error('Error parsing tenant data, re-migrating...', e);
                migrateFounderData(founder.tenantId);
            }
        }
    }
}

// Migrate existing global data to Founder's tenant storage
function migrateFounderData(tenantId) {
    const tenantKey = 'ezcubic_tenant_' + tenantId;
    
    console.log('Migrating existing data to Founder tenant:', tenantId);
    
    // Gather existing data from global storage keys
    const existingData = JSON.parse(localStorage.getItem('ezcubicDataMY') || '{}');
    const existingProducts = JSON.parse(localStorage.getItem('ezcubic_products') || '[]');
    const existingCustomers = JSON.parse(localStorage.getItem('ezcubic_customers') || '[]');
    const existingSuppliers = JSON.parse(localStorage.getItem('ezcubic_suppliers') || '[]');
    const existingBranches = JSON.parse(localStorage.getItem('ezcubic_branches') || '[]');
    const existingQuotations = JSON.parse(localStorage.getItem('ezcubic_quotations') || '[]');
    const existingProjects = JSON.parse(localStorage.getItem('ezcubic_projects') || '[]');
    const existingPurchaseOrders = JSON.parse(localStorage.getItem('ezcubic_purchase_orders') || '[]');
    const existingStockMovements = JSON.parse(localStorage.getItem('ezcubic_stock_movements') || '[]');
    const existingSales = JSON.parse(localStorage.getItem('ezcubic_sales') || '[]');
    const existingDeliveryOrders = JSON.parse(localStorage.getItem('ezcubic_delivery_orders') || '[]');
    
    // Get default settings
    const defaultSettings = typeof getDefaultSettings === 'function' ? getDefaultSettings() : {
        businessName: "Founder's Business",
        currency: 'MYR',
        defaultTaxRate: 0
    };
    
    // Create founder tenant data with all existing data
    const founderTenantData = {
        transactions: existingData.transactions || [],
        bills: existingData.bills || [],
        products: existingProducts,
        customers: existingCustomers,
        suppliers: existingSuppliers,
        branches: existingBranches,
        quotations: existingQuotations,
        projects: existingProjects,
        purchaseOrders: existingPurchaseOrders,
        stockMovements: existingStockMovements,
        sales: existingSales,
        deliveryOrders: existingDeliveryOrders,
        settings: existingData.settings || defaultSettings,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };
    
    // Save to founder's tenant storage
    localStorage.setItem(tenantKey, JSON.stringify(founderTenantData));
    
    // Register founder tenant with Company Code
    const tenants = JSON.parse(localStorage.getItem('ezcubic_tenants') || '{}');
    tenants[tenantId] = {
        id: tenantId,
        ownerId: 'founder_001',
        businessName: existingData.settings?.businessName || "Founder's Business",
        companyCode: generateCompanyCode(), // For device sync
        createdAt: new Date().toISOString(),
        status: 'active'
    };
    localStorage.setItem('ezcubic_tenants', JSON.stringify(tenants));
    
    console.log('Founder data migration completed with:', {
        transactions: founderTenantData.transactions.length,
        products: founderTenantData.products.length,
        customers: founderTenantData.customers.length,
        quotations: founderTenantData.quotations.length,
        projects: founderTenantData.projects.length,
        sales: founderTenantData.sales.length,
        stockMovements: founderTenantData.stockMovements.length,
        deliveryOrders: founderTenantData.deliveryOrders.length
    });
}

// Debug function to check all storage - run in browser console: debugStorage()
window.debugStorage = function() {
    console.log('=== EZCUBIC STORAGE DEBUG ===');
    
    // Check all relevant localStorage keys
    const keys = [
        'ezcubicDataMY',
        'ezcubic_products',
        'ezcubic_customers',
        'ezcubic_suppliers',
        'ezcubic_branches',
        'ezcubic_quotations',
        'ezcubic_projects',
        'ezcubic_purchase_orders',
        'ezcubic_stock_movements',
        'ezcubic_sales',
        'ezcubic_delivery_orders',
        'ezcubic_tenant_tenant_founder',
        'ezcubic_users',
        'ezcubic_tenants'
    ];
    
    keys.forEach(key => {
        const data = localStorage.getItem(key);
        if (data) {
            try {
                const parsed = JSON.parse(data);
                const count = Array.isArray(parsed) ? parsed.length : 
                              (parsed.transactions ? parsed.transactions.length : 'object');
                console.log(`✓ ${key}: ${count} items`);
            } catch(e) {
                console.log(`✗ ${key}: invalid JSON`);
            }
        } else {
            console.log(`✗ ${key}: empty/missing`);
        }
    });
    
    // Check current tenant data
    const founder = users.find(u => u.role === 'founder');
    if (founder && founder.tenantId) {
        const tenantKey = 'ezcubic_tenant_' + founder.tenantId;
        const tenantData = JSON.parse(localStorage.getItem(tenantKey) || '{}');
        console.log('\n=== FOUNDER TENANT DATA ===');
        console.log('Transactions:', tenantData.transactions?.length || 0);
        console.log('Products:', tenantData.products?.length || 0);
        console.log('Customers:', tenantData.customers?.length || 0);
        console.log('Sales:', tenantData.sales?.length || 0);
        console.log('Quotations:', tenantData.quotations?.length || 0);
        console.log('Projects:', tenantData.projects?.length || 0);
        console.log('Stock Movements:', tenantData.stockMovements?.length || 0);
    }
    
    return 'Run forceMigration() to force re-migration from global keys';
};

// Force migration - run in console: forceMigration()
window.forceMigration = function() {
    const founder = users.find(u => u.role === 'founder');
    if (!founder) {
        console.error('No founder account found');
        return;
    }
    
    const tenantKey = 'ezcubic_tenant_' + founder.tenantId;
    console.log('Removing existing tenant data and forcing migration...');
    localStorage.removeItem(tenantKey);
    migrateFounderData(founder.tenantId);
    console.log('Migration complete. Please refresh the page and login again.');
    return 'Done! Refresh page now.';
};

function saveUsers(skipCloudSync = false) {
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
    
    // SAFETY: Don't auto-sync to cloud if we only have founder account
    // This prevents overwriting cloud data when a new device initializes
    const usersData = JSON.parse(localStorage.getItem('ezcubic_users') || '[]');
    const hasOnlyFounder = usersData.length <= 1 && usersData.every(u => u.role === 'founder');
    
    if (skipCloudSync || hasOnlyFounder) {
        if (hasOnlyFounder) {
            console.log('⏸️ Skipping cloud sync (only founder account - use fullCloudSync() to force)');
        }
        return;
    }
    
    // CLOUD SYNC: Automatically sync users AND tenants to cloud after any change
    setTimeout(async () => {
        try {
            // Direct Supabase upload (skip CloudSync - it has issues)
            
            if (window.supabase && window.supabase.createClient) {
                const client = getUsersSupabaseClient();
                
                // Sync users
                const { error: userError } = await client
                    .from('tenant_data')
                    .upsert({
                        tenant_id: 'global',
                        data_key: 'ezcubic_users',
                        data: { key: 'ezcubic_users', value: usersData, synced_at: new Date().toISOString() },
                        updated_at: new Date().toISOString()
                    }, { onConflict: 'tenant_id,data_key' });
                
                // Also sync tenants (for Company Codes)
                const tenantsData = JSON.parse(localStorage.getItem('ezcubic_tenants') || '{}');
                const { error: tenantError } = await client
                    .from('tenant_data')
                    .upsert({
                        tenant_id: 'global',
                        data_key: 'ezcubic_tenants',
                        data: { key: 'ezcubic_tenants', value: tenantsData, synced_at: new Date().toISOString() },
                        updated_at: new Date().toISOString()
                    }, { onConflict: 'tenant_id,data_key' });
                
                if (userError || tenantError) {
                    console.warn('⚠️ Sync partial:', userError?.message, tenantError?.message);
                } else {
                    console.log('☁️ Users + Tenants synced to cloud');
                }
            }
        } catch (err) {
            console.warn('⚠️ Cloud sync failed:', err);
        }
    }, 200);
}

// Load users from cloud on startup (for multi-device support)
async function loadUsersFromCloud() {
    // Direct Supabase download (skip CloudSync - it has issues)
    try {
        
        if (window.supabase && window.supabase.createClient) {
            console.log('☁️ Downloading users from cloud...');
            const client = getUsersSupabaseClient();
            
            const { data, error } = await client
                .from('tenant_data')
                .select('*')
                .eq('tenant_id', 'global')
                .eq('data_key', 'ezcubic_users');
            
            if (error) {
                console.warn('⚠️ Direct download error:', error.message);
                return;
            }
            
            if (data && data.length > 0) {
                const cloudUsers = data[0].data?.value || [];
                
                // Merge cloud users with local
                const localUsers = JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
                const userMap = new Map();
                
                // Add local users first
                localUsers.forEach(u => userMap.set(u.id, u));
                
                // Merge cloud users (add missing, update if cloud is newer)
                for (const cloudUser of cloudUsers) {
                    const localUser = userMap.get(cloudUser.id);
                    if (!localUser) {
                        userMap.set(cloudUser.id, cloudUser);
                        console.log('👤 Added from cloud:', cloudUser.email);
                    } else {
                        const localTime = new Date(localUser.updatedAt || localUser.createdAt || 0);
                        const cloudTime = new Date(cloudUser.updatedAt || cloudUser.createdAt || 0);
                        if (cloudTime > localTime) {
                            // For staff/manager: preserve local permissions (custom access set by admin)
                            // But take plan and other data from cloud
                            const isStaffOrManager = localUser.role === 'staff' || localUser.role === 'manager';
                            if (isStaffOrManager && localUser.permissions && localUser.permissions.length > 0) {
                                userMap.set(cloudUser.id, { ...cloudUser, permissions: localUser.permissions });
                            } else {
                                userMap.set(cloudUser.id, cloudUser);
                            }
                        }
                    }
                }
                
                users = Array.from(userMap.values());
                localStorage.setItem(USERS_KEY, JSON.stringify(users));
                console.log('👥 Users merged from cloud:', users.length);
                
                // CRITICAL: Ensure founder exists after cloud sync
                ensureFounderExists();
            }
        }
    } catch (err) {
        console.warn('⚠️ Could not load users from cloud:', err);
    }
    
    // Final check: ensure founder exists
    ensureFounderExists();
}

// Expose for cloud-sync module
window.loadUsers = function() {
    const stored = localStorage.getItem(USERS_KEY);
    if (stored) {
        users = JSON.parse(stored);
    }
    
    // ALWAYS ensure founder account exists
    ensureFounderExists();
};

// Helper function to ensure founder always exists
function ensureFounderExists() {
    if (!users.find(u => u.role === 'founder')) {
        console.log('🔧 Adding missing founder account...');
        users.push(DEFAULT_FOUNDER);
        localStorage.setItem(USERS_KEY, JSON.stringify(users));
    }
    
    // Ensure founder has tenantId
    const founder = users.find(u => u.role === 'founder');
    if (founder && !founder.tenantId) {
        founder.tenantId = 'tenant_founder';
        localStorage.setItem(USERS_KEY, JSON.stringify(users));
    }
}
window.ensureFounderExists = ensureFounderExists;

// ==================== AUTO CLOUD LOOKUP ====================
// Find a specific user by email in cloud storage
async function findUserInCloud(email) {
    
    // Wait for Supabase to be ready
    let retries = 0;
    while (!window.supabase?.createClient && retries < 10) {
        await new Promise(r => setTimeout(r, 200));
        retries++;
    }
    
    if (!window.supabase?.createClient) {
        console.warn('⚠️ Supabase not ready for cloud lookup');
        return null;
    }
    
    try {
        const client = getUsersSupabaseClient();
        
        const { data, error } = await client
            .from('tenant_data')
            .select('*')
            .eq('tenant_id', 'global')
            .eq('data_key', 'ezcubic_users')
            .single();
        
        if (error) {
            console.warn('⚠️ Cloud lookup error:', error.message);
            return null;
        }
        
        const cloudUsers = data?.data?.value || [];
        const foundUser = cloudUsers.find(u => u.email.toLowerCase() === email.toLowerCase());
        
        if (foundUser) {
            console.log('☁️ Found user in cloud:', foundUser.email, '- Role:', foundUser.role);
            
            // Also download their tenant info if available
            if (foundUser.tenantId) {
                await downloadTenantInfoFromCloud(foundUser.tenantId);
            }
        }
        
        return foundUser || null;
        
    } catch (err) {
        console.error('❌ Cloud lookup failed:', err);
        return null;
    }
}

// Download tenant info (not full data) from cloud
async function downloadTenantInfoFromCloud(tenantId) {
    
    try {
        if (!window.supabase?.createClient) return;
        
        const client = getUsersSupabaseClient();
        
        const { data, error } = await client
            .from('tenant_data')
            .select('*')
            .eq('tenant_id', 'global')
            .eq('data_key', 'ezcubic_tenants')
            .single();
        
        if (error || !data?.data?.value) return;
        
        const cloudTenants = data.data.value;
        const tenantInfo = cloudTenants[tenantId];
        
        if (tenantInfo) {
            // Merge into local tenants
            const localTenants = JSON.parse(localStorage.getItem('ezcubic_tenants') || '{}');
            localTenants[tenantId] = tenantInfo;
            localStorage.setItem('ezcubic_tenants', JSON.stringify(localTenants));
            console.log('☁️ Downloaded tenant info:', tenantInfo.businessName);
        }
        
    } catch (err) {
        console.warn('⚠️ Could not download tenant info:', err);
    }
}

// Download full tenant data from cloud (transactions, products, etc.)
async function downloadTenantFromCloud(tenantId) {
    
    try {
        if (!window.supabase?.createClient) return;
        
        const client = getUsersSupabaseClient();
        
        // First download tenant info
        await downloadTenantInfoFromCloud(tenantId);
        
        // Then try to download full tenant data
        const { data, error } = await client
            .from('tenant_data')
            .select('*')
            .eq('tenant_id', tenantId)
            .eq('data_key', 'tenant_full_data')
            .single();
        
        if (!error && data?.data?.value) {
            const tenantData = data.data.value;
            localStorage.setItem('ezcubic_tenant_' + tenantId, JSON.stringify(tenantData));
            console.log('☁️ Downloaded full tenant data:', tenantId);
            
            // Also extract to individual localStorage keys for immediate availability
            // This ensures customers, products, etc. are ready when modules initialize
            if (tenantData.customers?.length) {
                localStorage.setItem('ezcubic_customers', JSON.stringify(tenantData.customers));
                console.log('  ↳ Extracted', tenantData.customers.length, 'customers');
            }
            if (tenantData.products?.length) {
                localStorage.setItem('ezcubic_products', JSON.stringify(tenantData.products));
                console.log('  ↳ Extracted', tenantData.products.length, 'products');
            }
            if (tenantData.crmCustomers?.length) {
                localStorage.setItem('ezcubic_crm_customers', JSON.stringify(tenantData.crmCustomers));
                console.log('  ↳ Extracted', tenantData.crmCustomers.length, 'CRM customers');
            }
            if (tenantData.suppliers?.length) {
                localStorage.setItem('ezcubic_suppliers', JSON.stringify(tenantData.suppliers));
                console.log('  ↳ Extracted', tenantData.suppliers.length, 'suppliers');
            }
            if (tenantData.quotations?.length) {
                localStorage.setItem('ezcubic_quotations', JSON.stringify(tenantData.quotations));
                console.log('  ↳ Extracted', tenantData.quotations.length, 'quotations');
            }
            if (tenantData.projects?.length) {
                localStorage.setItem('ezcubic_projects', JSON.stringify(tenantData.projects));
                console.log('  ↳ Extracted', tenantData.projects.length, 'projects');
            }
            if (tenantData.transactions?.length) {
                localStorage.setItem('ezcubic_transactions', JSON.stringify(tenantData.transactions));
                console.log('  ↳ Extracted', tenantData.transactions.length, 'transactions');
            }
            if (tenantData.sales?.length) {
                localStorage.setItem('ezcubic_sales', JSON.stringify(tenantData.sales));
                console.log('  ↳ Extracted', tenantData.sales.length, 'sales');
            }
            if (tenantData.orders?.length) {
                localStorage.setItem('ezcubic_orders', JSON.stringify(tenantData.orders));
                console.log('  ↳ Extracted', tenantData.orders.length, 'orders');
            }
            if (tenantData.stockMovements?.length) {
                localStorage.setItem('ezcubic_stock_movements', JSON.stringify(tenantData.stockMovements));
                console.log('  ↳ Extracted', tenantData.stockMovements.length, 'stock movements');
            }
            if (tenantData.employees?.length) {
                localStorage.setItem('ezcubic_employees', JSON.stringify(tenantData.employees));
                console.log('  ↳ Extracted', tenantData.employees.length, 'employees');
            }
            if (tenantData.branches?.length) {
                localStorage.setItem('ezcubic_branches', JSON.stringify(tenantData.branches));
                console.log('  ↳ Extracted', tenantData.branches.length, 'branches');
            }
        }
        
    } catch (err) {
        console.warn('⚠️ Could not download tenant data:', err);
    }
}

// ==================== AUTHENTICATION ====================
// Session timeout in hours (24 hours by default)
const SESSION_TIMEOUT_HOURS = 24;

function checkSession() {
    const session = localStorage.getItem(CURRENT_USER_KEY);
    if (session) {
        try {
            const userData = JSON.parse(session);
            
            // Check session expiration
            if (userData.loginTime) {
                const loginTime = new Date(userData.loginTime);
                const now = new Date();
                const hoursSinceLogin = (now - loginTime) / (1000 * 60 * 60);
                
                if (hoursSinceLogin > SESSION_TIMEOUT_HOURS) {
                    console.log('Session expired after', hoursSinceLogin.toFixed(1), 'hours');
                    logout();
                    if (typeof showNotification === 'function') {
                        showNotification('Your session has expired. Please login again.', 'info');
                    }
                    return false;
                }
            }
            
            const user = users.find(u => u.id === userData.id && u.status === 'active');
            if (user) {
                currentUser = user;
                window.currentUser = user; // CRITICAL: Expose to window for other modules
                
                // CRITICAL: Load user's tenant data on session restore (page refresh)
                // This ensures the correct data is loaded BEFORE modules initialize
                loadUserTenantData(user);
                
                // Check session token for single-device login (async, runs in background)
                validateSessionToken(user);
                
                return true;
            } else {
                logout();
            }
        } catch (error) {
            console.error('Error checking session:', error);
            logout();
        }
    }
    return false;
}

// Validate session token against cloud - force logout if another device logged in
async function validateSessionToken(user) {
    const localToken = localStorage.getItem(SESSION_TOKEN_KEY);
    if (!localToken) return; // No token to validate
    
    try {
        // Get session token from cloud
        const cloudToken = await getCloudSessionToken(user.id);
        
        if (cloudToken && cloudToken !== localToken) {
            console.log('⚠️ Session invalidated - another device logged in');
            // Another device has logged in - force logout
            forceLogoutOtherDevice();
        }
    } catch (err) {
        console.warn('Session validation error:', err);
    }
}

// Get session token from cloud
async function getCloudSessionToken(userId) {
    try {
        
        let client = null;
        if (window.supabase && window.supabase.createClient) {
            client = getUsersSupabaseClient();
        }
        if (!client) return null;
        
        const { data, error } = await client
            .from('tenant_data')
            .select('data')
            .eq('tenant_id', 'sessions')
            .eq('data_key', 'session_' + userId)
            .single();
        
        if (error || !data) return null;
        return data.data?.sessionToken || null;
    } catch (err) {
        return null;
    }
}

// Save session token to cloud
async function saveCloudSessionToken(userId, token, deviceInfo) {
    try {
        
        let client = null;
        if (window.supabase && window.supabase.createClient) {
            client = getUsersSupabaseClient();
        }
        if (!client) return false;
        
        const { error } = await client
            .from('tenant_data')
            .upsert({
                tenant_id: 'sessions',
                data_key: 'session_' + userId,
                data: {
                    sessionToken: token,
                    deviceInfo: deviceInfo,
                    loginTime: new Date().toISOString()
                },
                updated_at: new Date().toISOString()
            }, { onConflict: 'tenant_id,data_key' });
        
        return !error;
    } catch (err) {
        console.warn('Failed to save session token to cloud:', err);
        return false;
    }
}

// Force logout when another device logs in
function forceLogoutOtherDevice() {
    // Clear local session
    localStorage.removeItem(CURRENT_USER_KEY);
    localStorage.removeItem(SESSION_TOKEN_KEY);
    currentUser = null;
    window.currentUser = null;
    
    // Show message and redirect to login
    alert('You have been logged out because your account was accessed from another device.');
    
    // Show login page
    showLoginPage();
}

// Main login function - tries cloud sync first for multi-device support
function login(email, password) {
    // Show loading state
    const loginBtn = document.querySelector('#loginForm button[type="submit"], .login-form button[type="submit"]');
    const originalBtnText = loginBtn ? loginBtn.innerHTML : '';
    if (loginBtn) {
        loginBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Checking...';
        loginBtn.disabled = true;
    }
    
    // Try to sync from cloud first, then attempt login
    tryLoginWithCloudSync(email, password).finally(() => {
        // Restore button state
        if (loginBtn) {
            loginBtn.innerHTML = originalBtnText || '<i class="fas fa-sign-in-alt"></i> Login';
            loginBtn.disabled = false;
        }
    });
    
    return false; // Prevent form submission, async handles it
}

// Async login that checks cloud first
async function tryLoginWithCloudSync(email, password) {
    // Helper to show login error
    function showLoginError(message) {
        // Try inline error first (for login page)
        const errorDiv = document.getElementById('loginErrorMessage');
        const errorText = document.getElementById('loginErrorText');
        if (errorDiv && errorText) {
            errorText.textContent = message;
            errorDiv.style.display = 'block';
            // Shake animation
            errorDiv.style.animation = 'none';
            setTimeout(() => errorDiv.style.animation = 'shake 0.5s', 10);
        }
        // Also try modal error (for login modal)
        const modalErrorDiv = document.getElementById('loginModalError');
        const modalErrorText = document.getElementById('loginModalErrorText');
        if (modalErrorDiv && modalErrorText) {
            modalErrorText.textContent = message;
            modalErrorDiv.style.display = 'block';
        }
        // Also use toast as backup
        if (typeof showToast === 'function') {
            showToast(message, 'error');
        }
    }
    
    // Helper to show loading state
    function showLoginLoading(show) {
        const btn = document.querySelector('#loginPageForm button[type="submit"]') || 
                    document.querySelector('#loginForm button[type="submit"]');
        if (btn) {
            if (show) {
                btn.dataset.originalText = btn.innerHTML;
                btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Checking...';
                btn.disabled = true;
            } else {
                btn.innerHTML = btn.dataset.originalText || 'Login';
                btn.disabled = false;
            }
        }
    }
    
    showLoginLoading(true);
    
    // First try to sync users from cloud (for multi-device login)
    try {
        console.log('☁️ Checking cloud for user updates before login...');
        await loadUsersFromCloud();
    } catch (err) {
        console.warn('⚠️ Cloud sync failed, using local data:', err);
    }
    
    // Now reload users from localStorage (includes any cloud updates)
    loadUsers();
    
    console.log('Login attempt:', email);
    console.log('Users in system:', users.map(u => ({ email: u.email, status: u.status })));
    
    // First check if email exists locally
    let userByEmail = users.find(u => u.email.toLowerCase() === email.toLowerCase());
    
    // ========== AUTO CLOUD LOOKUP ==========
    // If user not found locally, try direct cloud lookup
    if (!userByEmail) {
        console.log('👤 User not found locally, checking cloud directly...');
        
        try {
            const cloudUser = await findUserInCloud(email);
            
            if (cloudUser) {
                console.log('☁️ Found user in cloud:', cloudUser.email);
                
                // Add user to local storage
                users.push(cloudUser);
                localStorage.setItem(USERS_KEY, JSON.stringify(users));
                
                // Also download their tenant if they have one
                if (cloudUser.tenantId) {
                    await downloadTenantFromCloud(cloudUser.tenantId);
                }
                
                userByEmail = cloudUser;
                console.log('✅ User synced from cloud to local');
            }
        } catch (err) {
            console.warn('⚠️ Cloud lookup failed:', err);
        }
    }
    
    if (!userByEmail) {
        showLoginLoading(false);
        showLoginError('Email not found. Please check your email or register.');
        return false;
    }
    
    // Check if account is active
    if (userByEmail.status !== 'active') {
        showLoginLoading(false);
        showLoginError('Your account is inactive. Please contact support.');
        return false;
    }
    
    // Check password (supports both hashed and legacy plain text)
    const passwordValid = await verifyPassword(password, userByEmail.password);
    if (!passwordValid) {
        showLoginLoading(false);
        showLoginError('Incorrect password. Please try again.');
        return false;
    }
    
    showLoginLoading(false);
    
    // Auto-upgrade: If password is plain text, hash it now
    if (!isPasswordHashed(userByEmail.password)) {
        const hashedPw = await hashPassword(password);
        userByEmail.password = hashedPw;
        saveUsers();
        console.log('🔒 Password upgraded to hashed format');
    }
    
    // Successful login - hide any error messages
    const errorDiv = document.getElementById('loginErrorMessage');
    if (errorDiv) errorDiv.style.display = 'none';
    const modalErrorDiv = document.getElementById('loginModalError');
    if (modalErrorDiv) modalErrorDiv.style.display = 'none';
    
    const user = userByEmail;
    
    if (user) {
        currentUser = user;
        window.currentUser = user; // CRITICAL: Expose to window for other modules
        
        // Generate unique session token for single-device login
        const sessionToken = generateSessionToken();
        const deviceInfo = {
            userAgent: navigator.userAgent,
            platform: navigator.platform,
            language: navigator.language,
            screenSize: `${window.screen.width}x${window.screen.height}`
        };
        
        // Save session token locally
        localStorage.setItem(SESSION_TOKEN_KEY, sessionToken);
        
        // Save session token to cloud (invalidates other devices)
        saveCloudSessionToken(user.id, sessionToken, deviceInfo);
        
        localStorage.setItem(CURRENT_USER_KEY, JSON.stringify({
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            plan: user.plan,
            tenantId: user.tenantId,
            loginTime: new Date().toISOString()
        }));
        
        // Log session
        logSession(user.id, 'login');
        
        // Record audit log for login
        if (typeof recordAuditLog === 'function') {
            recordAuditLog({
                action: 'login',
                module: 'auth',
                recordId: user.id || user.email,
                recordName: user.name || user.email,
                description: `User logged in: ${user.name || user.email} (${user.role})`
            });
        }
        
        // Exit guest mode
        isGuestMode = false;
        removeViewOnlyMode();
        
        // Load user's tenant data (their isolated business data)
        loadUserTenantData(user);
        
        // Show app container (it was hidden during login check)
        const appContainer = document.getElementById('appContainer');
        if (appContainer) appContainer.style.display = '';
        
        updateAuthUI();
        closeLoginModal();
        hideLoginPage(); // Hide full-screen login page
        showToast(`Welcome back, ${user.name}!`, 'success');
        
        // Apply permissions based on user's role and plan
        applyUserPermissions();
        
        // For Staff/Manager, apply the owner's plan restrictions
        if (['staff', 'manager'].includes(user.role)) {
            applyOwnerPlanRestrictions(user);
        }
        // Note: Do NOT call applyPlanToUser for personal users as it overrides our restrictions
        // For Business Admin/Founder, apply their own plan restrictions
        else if (user.plan && user.role !== 'personal' && typeof applyPlanToUser === 'function') {
            applyPlanToUser(user);
        }
        
        // Re-apply permissions for personal users to ensure they stick
        if (user.role === 'personal') {
            setTimeout(() => applyUserPermissions(), 50);
        }
        
        // ALWAYS show dashboard after login (reset to dashboard)
        if (typeof showSection === 'function') {
            showSection('dashboard');
        }
        
        // Force refresh ALL UI components after login with delay
        // Wait for tenant data to finish loading (150ms) plus buffer
        setTimeout(() => {
            console.log('Post-login UI refresh...');
            
            // Re-apply permissions to ensure nav is updated
            applyUserPermissions();
            
            // Update company name in UI
            if (typeof updateCompanyNameInUI === 'function') updateCompanyNameInUI();
            
            // Update dashboard with fresh tenant data
            if (typeof updateDashboard === 'function') updateDashboard();
        }, 300);
        
        return true;
    } else {
        showToast('Invalid email or password', 'error');
        return false;
    }
}

// Load user's isolated tenant data
function loadUserTenantData(user) {
    console.log('loadUserTenantData called for user:', user?.email, 'tenantId:', user?.tenantId);
    
    // Set flag to prevent saveData from overwriting tenant data during load
    window._isLoadingUserData = true;
    
    // SAFETY: Ensure flag is cleared after 5 seconds max (in case of errors)
    setTimeout(() => {
        if (window._isLoadingUserData) {
            console.warn('⚠️ _isLoadingUserData flag was stuck, clearing it');
            window._isLoadingUserData = false;
        }
    }, 5000);
    
    if (!user || !user.tenantId) {
        console.log('No tenant ID for user, creating new tenant...');
        // Create tenant for existing user without one
        if (user) {
            const tenantId = 'tenant_' + Date.now();
            user.tenantId = tenantId;
            initializeEmptyTenantData(tenantId, user.name);
            saveUsers();
        }
        window._isLoadingUserData = false;
        return;
    }
    
    // Check if we're loading the SAME tenant (page refresh) vs DIFFERENT tenant (user switch)
    const lastLoadedTenant = localStorage.getItem('ezcubic_last_tenant_id');
    const isSameTenant = lastLoadedTenant === user.tenantId;
    
    // Store current tenant ID for future comparisons
    localStorage.setItem('ezcubic_last_tenant_id', user.tenantId);
    
    const tenantKey = 'ezcubic_tenant_' + user.tenantId;
    const tenantData = JSON.parse(localStorage.getItem(tenantKey) || 'null');
    
    console.log('Loading tenant data from key:', tenantKey);
    console.log('Is same tenant (page refresh):', isSameTenant);
    console.log('Tenant data found:', tenantData ? 'Yes' : 'No');
    if (tenantData) {
        console.log('Tenant data products:', tenantData.products?.length || 0);
        console.log('Tenant data customers:', tenantData.customers?.length || 0);
        console.log('Tenant data CRM customers:', tenantData.crmCustomers?.length || 0);
        console.log('Tenant data suppliers:', tenantData.suppliers?.length || 0);
        console.log('Tenant data quotations:', tenantData.quotations?.length || 0);
    }
    
    // ONLY reset data if switching to a DIFFERENT tenant
    // If same tenant (page refresh), preserve localStorage data
    if (!isSameTenant) {
        console.log('Different tenant - resetting data');
        resetToEmptyData();
    } else {
        console.log('Same tenant (page refresh) - preserving localStorage, only resetting window arrays');
        // Just reset window arrays but NOT localStorage
        resetWindowArraysOnly();
    }
    
    if (tenantData) {
        console.log('Loading tenant data for:', user.tenantId);
        
        // SMART MERGE: For page refresh, localStorage might have newer data
        // Prefer localStorage if it has more items than tenant data
        const mergeWithLocalStorage = (tenantArray, localStorageKey) => {
            const localData = JSON.parse(localStorage.getItem(localStorageKey) || '[]');
            const tenantLen = (tenantArray || []).length;
            const localLen = localData.length;
            // If localStorage has more data OR tenant is empty, use localStorage
            if (localLen > tenantLen || tenantLen === 0) {
                console.log(`Using localStorage for ${localStorageKey}: ${localLen} items (tenant had ${tenantLen})`);
                return localData;
            }
            return tenantArray || [];
        };
        
        // Get merged data - prefer localStorage when it has more items
        const mergedProducts = mergeWithLocalStorage(tenantData.products, 'ezcubic_products');
        const mergedCustomers = mergeWithLocalStorage(tenantData.customers, 'ezcubic_customers');
        const mergedSuppliers = mergeWithLocalStorage(tenantData.suppliers, 'ezcubic_suppliers');
        const mergedBranches = mergeWithLocalStorage(tenantData.branches, 'ezcubic_branches');
        const mergedQuotations = mergeWithLocalStorage(tenantData.quotations, 'ezcubic_quotations');
        const mergedProjects = mergeWithLocalStorage(tenantData.projects, 'ezcubic_projects');
        const mergedCRMCustomers = mergeWithLocalStorage(tenantData.crmCustomers, 'ezcubic_crm_customers');
        const mergedEmployees = mergeWithLocalStorage(tenantData.employees, 'ezcubic_employees');
        const mergedStockMovements = mergeWithLocalStorage(tenantData.stockMovements, 'ezcubic_stock_movements');
        const mergedSales = mergeWithLocalStorage(tenantData.sales, 'ezcubic_sales');
        const mergedOrders = mergeWithLocalStorage(tenantData.orders, 'ezcubic_orders');
        const mergedPurchaseOrders = mergeWithLocalStorage(tenantData.purchaseOrders, 'ezcubic_purchase_orders');
        
        // Map merged data to global businessData
        if (typeof businessData !== 'undefined') {
            businessData.transactions = tenantData.transactions || [];
            businessData.bills = tenantData.bills || [];
            businessData.products = mergedProducts;
            businessData.customers = mergedCustomers;
            businessData.stockMovements = mergedStockMovements;
            businessData.sales = mergedSales;
            businessData.suppliers = mergedSuppliers;
            businessData.branches = mergedBranches;
            businessData.quotations = mergedQuotations;
            businessData.projects = mergedProjects;
            businessData.purchaseOrders = mergedPurchaseOrders;
            businessData.deliveryOrders = tenantData.deliveryOrders || [];
            if (tenantData.settings) {
                businessData.settings = { ...getDefaultSettings(), ...tenantData.settings };
            }
        }
        
        // Update global arrays with merged data
        window.products = mergedProducts;
        window.customers = mergedCustomers;
        window.stockMovements = mergedStockMovements;
        window.sales = mergedSales;
        window.transactions = tenantData.transactions || [];
        window.suppliers = mergedSuppliers;
        window.branches = mergedBranches;
        window.branchTransfers = tenantData.branchTransfers || [];
        window.quotations = mergedQuotations;
        window.projects = mergedProjects;
        window.purchaseOrders = mergedPurchaseOrders;
        window.goodsReceipts = tenantData.goodsReceipts || [];
        window.deliveryOrders = tenantData.deliveryOrders || [];
        window.crmCustomers = mergedCRMCustomers;
        window.employees = mergedEmployees;
        window.orders = mergedOrders;
        
        // Also update local module variables directly
        if (typeof products !== 'undefined') products = mergedProducts;
        if (typeof customers !== 'undefined') customers = mergedCustomers;
        if (typeof stockMovements !== 'undefined') stockMovements = mergedStockMovements;
        if (typeof sales !== 'undefined') sales = mergedSales;
        if (typeof suppliers !== 'undefined') suppliers = mergedSuppliers;
        if (typeof branches !== 'undefined') branches = mergedBranches;
        if (typeof branchTransfers !== 'undefined') branchTransfers = tenantData.branchTransfers || [];
        if (typeof quotations !== 'undefined') quotations = mergedQuotations;
        if (typeof projects !== 'undefined') projects = mergedProjects;
        if (typeof purchaseOrders !== 'undefined') purchaseOrders = mergedPurchaseOrders;
        if (typeof goodsReceipts !== 'undefined') goodsReceipts = tenantData.goodsReceipts || [];
        if (typeof deliveryOrders !== 'undefined') deliveryOrders = tenantData.deliveryOrders || [];
        if (typeof crmCustomers !== 'undefined') crmCustomers = mergedCRMCustomers;
        if (typeof orders !== 'undefined') orders = mergedOrders;
        
        // HR & Payroll module variables
        // Check if localStorage has data but tenant doesn't - recover from localStorage
        const localEmployees = JSON.parse(localStorage.getItem('ezcubic_employees') || '[]');
        const localPayroll = JSON.parse(localStorage.getItem('ezcubic_payroll') || '[]');
        
        // Use tenant data if available, otherwise fall back to localStorage (data recovery)
        const employeesToUse = (tenantData.employees && tenantData.employees.length > 0) 
            ? tenantData.employees 
            : localEmployees;
        const payrollToUse = (tenantData.payrollRecords && tenantData.payrollRecords.length > 0) 
            ? tenantData.payrollRecords 
            : localPayroll;
        
        window.employees = employeesToUse;
        window.payrollRecords = payrollToUse;
        if (typeof employees !== 'undefined') employees = employeesToUse;
        if (typeof payrollRecords !== 'undefined') payrollRecords = payrollToUse;
        if (typeof kpiTemplates !== 'undefined') kpiTemplates = tenantData.kpiTemplates || [];
        if (typeof kpiAssignments !== 'undefined') kpiAssignments = tenantData.kpiAssignments || [];
        if (typeof kpiScores !== 'undefined') kpiScores = tenantData.kpiScores || [];
        if (typeof leaveRequests !== 'undefined') leaveRequests = tenantData.leaveRequests || [];
        if (typeof leaveBalances !== 'undefined') leaveBalances = tenantData.leaveBalances || [];
        if (typeof attendanceRecords !== 'undefined') attendanceRecords = tenantData.attendanceRecords || [];
        
        // If we recovered data from localStorage, save it to tenant storage
        if (localEmployees.length > 0 && (!tenantData.employees || tenantData.employees.length === 0)) {
            console.log('🔄 Recovered', localEmployees.length, 'employees from localStorage - saving to tenant');
            tenantData.employees = localEmployees;
            // Will be saved later
        }
        if (localPayroll.length > 0 && (!tenantData.payrollRecords || tenantData.payrollRecords.length === 0)) {
            console.log('🔄 Recovered', localPayroll.length, 'payroll records from localStorage - saving to tenant');
            tenantData.payrollRecords = localPayroll;
        }
        
        // Save to legacy storage keys for compatibility with modules
        // Use merged data (which already prefers localStorage when it has more items)
        localStorage.setItem('ezcubic_products', JSON.stringify(mergedProducts));
        localStorage.setItem('ezcubic_customers', JSON.stringify(mergedCustomers));
        localStorage.setItem('ezcubic_suppliers', JSON.stringify(mergedSuppliers));
        localStorage.setItem('ezcubic_branches', JSON.stringify(mergedBranches));
        localStorage.setItem('ezcubic_branch_transfers', JSON.stringify(tenantData.branchTransfers || []));
        localStorage.setItem('ezcubic_quotations', JSON.stringify(mergedQuotations));
        localStorage.setItem('ezcubic_projects', JSON.stringify(mergedProjects));
        localStorage.setItem('ezcubic_purchase_orders', JSON.stringify(mergedPurchaseOrders));
        localStorage.setItem('ezcubic_goods_receipts', JSON.stringify(tenantData.goodsReceipts || []));
        window.goodsReceipts = tenantData.goodsReceipts || [];
        localStorage.setItem('ezcubic_stock_movements', JSON.stringify(mergedStockMovements));
        localStorage.setItem('ezcubic_sales', JSON.stringify(mergedSales));
        localStorage.setItem('ezcubic_delivery_orders', JSON.stringify(tenantData.deliveryOrders || []));
        localStorage.setItem('ezcubic_crm_customers', JSON.stringify(mergedCRMCustomers));
        localStorage.setItem('ezcubic_orders', JSON.stringify(mergedOrders));
        
        // HR & Payroll storage keys - use the recovered/merged data
        localStorage.setItem('ezcubic_employees', JSON.stringify(employeesToUse));
        localStorage.setItem('ezcubic_payroll', JSON.stringify(payrollToUse));
        localStorage.setItem('ezcubic_kpi_templates', JSON.stringify(tenantData.kpiTemplates || []));
        localStorage.setItem('ezcubic_kpi_assignments', JSON.stringify(tenantData.kpiAssignments || []));
        localStorage.setItem('ezcubic_kpi_scores', JSON.stringify(tenantData.kpiScores || []));
        localStorage.setItem('ezcubic_leave_requests', JSON.stringify(tenantData.leaveRequests || []));
        localStorage.setItem('ezcubic_leave_balances', JSON.stringify(tenantData.leaveBalances || []));
        localStorage.setItem('ezcubic_attendance', JSON.stringify(tenantData.attendanceRecords || []));
        
        // If we recovered employees from localStorage, save updated tenant data immediately
        if (localEmployees.length > 0 && (!tenantData.employees || tenantData.employees.length === 0)) {
            tenantData.employees = localEmployees;
            localStorage.setItem(tenantKey, JSON.stringify(tenantData));
            console.log('✅ Saved recovered employee data to tenant storage');
        }
        
        // Accounting & Finance storage keys
        localStorage.setItem('ezcubic_transactions', JSON.stringify(tenantData.transactions || []));
        localStorage.setItem('ezcubic_bills', JSON.stringify(tenantData.bills || []));
        localStorage.setItem('ezcubic_orders', JSON.stringify(tenantData.orders || []));
        localStorage.setItem('ezcubic_invoices', JSON.stringify(tenantData.invoices || []));
        localStorage.setItem('ezcubic_bank_accounts', JSON.stringify(tenantData.bankAccounts || []));
        localStorage.setItem('ezcubic_credit_cards', JSON.stringify(tenantData.creditCards || []));
        localStorage.setItem('ezcubic_manual_balances', JSON.stringify(tenantData.manualBalances || {}));
        
        // Chart of Accounts & Journal Entries (Accounting module)
        const coaData = tenantData.chartOfAccounts || [];
        localStorage.setItem('ezcubic_chart_of_accounts', JSON.stringify(coaData));
        window.chartOfAccounts = coaData;
        if (typeof chartOfAccounts !== 'undefined') chartOfAccounts = coaData;
        
        const journalData = tenantData.journalEntries || [];
        localStorage.setItem('ezcubic_journal_entries', JSON.stringify(journalData));
        window.journalEntries = journalData;
        if (typeof journalEntries !== 'undefined') journalEntries = journalData;
        
        // Journal sequence (per tenant)
        const journalSeqData = tenantData.journalSequence || { year: new Date().getFullYear(), sequence: 0 };
        localStorage.setItem('ezcubic_journal_sequence', JSON.stringify(journalSeqData));
        if (typeof journalSequence !== 'undefined') journalSequence = journalSeqData;
        
        // POS storage keys
        localStorage.setItem('ezcubic_held_sales', JSON.stringify(tenantData.heldSales || []));
        localStorage.setItem('ezcubic_pos_receipts', JSON.stringify(tenantData.posReceipts || []));
        
        // Inventory storage keys
        localStorage.setItem('ezcubic_inventory', JSON.stringify(tenantData.inventory || tenantData.products || []));
        
        // CRM storage keys - also set window.crmCustomers for module access
        const crmData = tenantData.crmCustomers || [];
        localStorage.setItem('ezcubic_crm_customers', JSON.stringify(crmData));
        window.crmCustomers = crmData;
        if (typeof crmCustomers !== 'undefined') crmCustomers = crmData;
        
        // E-Invoice settings
        localStorage.setItem('ezcubic_einvoice_settings', JSON.stringify(tenantData.einvoiceSettings || {}));
        
        // Outlets
        localStorage.setItem('ezcubic_outlets', JSON.stringify(tenantData.outlets || []));
        
        // AI assistant state (per tenant)
        localStorage.setItem('ezcubic_ai_state', JSON.stringify(tenantData.aiState || {}));
        
        // Also update ezcubicDataMY for compatibility with transactions/bills loading
        localStorage.setItem('ezcubicDataMY', JSON.stringify({
            transactions: tenantData.transactions || [],
            bills: tenantData.bills || [],
            settings: tenantData.settings || businessData.settings,
            version: '2.0',
            lastSaved: new Date().toISOString()
        }));
        
        // Refresh ALL UI components after tenant data load
        setTimeout(() => {
            try {
                console.log('Refreshing all modules after tenant data load...');
                
                // Core modules
                if (typeof renderProducts === 'function') renderProducts();
                if (typeof loadBranches === 'function') loadBranches();
                // Sync suppliers module with window.suppliers then load
                if (typeof syncSuppliersFromWindow === 'function') syncSuppliersFromWindow();
                if (typeof loadSuppliers === 'function') loadSuppliers();
                if (typeof renderSuppliers === 'function') renderSuppliers();
                if (typeof updateDashboard === 'function') updateDashboard();
                
                // Inventory module
                if (typeof loadProducts === 'function') {
                    loadProducts();
                }
                if (typeof updateInventoryStats === 'function') updateInventoryStats();
                
                // Stock Control module
                if (typeof loadStockMovements === 'function') {
                    loadStockMovements();
                    if (typeof renderStockMovements === 'function') renderStockMovements();
                    if (typeof updateStockStats === 'function') updateStockStats();
                }
                
                // POS module - refresh products and categories
                if (typeof loadPOSProducts === 'function') loadPOSProducts();
                if (typeof loadPOSCategories === 'function') loadPOSCategories();
                if (typeof loadPOSCustomers === 'function') loadPOSCustomers();
                if (typeof renderPOSProducts === 'function') renderPOSProducts();
                
                // Orders module
                if (typeof renderOrders === 'function') renderOrders();
                if (typeof updateOrderStats === 'function') updateOrderStats();
                
                // Quotations module
                if (typeof loadQuotations === 'function') {
                    loadQuotations();
                    if (typeof renderQuotations === 'function') renderQuotations();
                    if (typeof updateQuotationStats === 'function') updateQuotationStats();
                }
                
                // Projects module
                if (typeof loadProjects === 'function') {
                    loadProjects();
                    if (typeof renderProjects === 'function') renderProjects();
                    if (typeof updateProjectStats === 'function') updateProjectStats();
                }
                
                // Purchase Orders module
                if (typeof syncPurchaseOrdersFromWindow === 'function') syncPurchaseOrdersFromWindow();
                if (typeof loadPurchaseOrders === 'function') {
                    loadPurchaseOrders();
                    if (typeof renderPurchaseOrders === 'function') renderPurchaseOrders();
                }
                if (typeof loadPendingDeliveries === 'function') loadPendingDeliveries();
                if (typeof loadRecentReceipts === 'function') loadRecentReceipts();
                
                // Delivery Orders module
                if (typeof syncDeliveryOrdersFromWindow === 'function') syncDeliveryOrdersFromWindow();
                if (typeof loadDeliveryOrders === 'function') {
                    loadDeliveryOrders();
                    if (typeof renderDeliveryOrdersList === 'function') renderDeliveryOrdersList();
                }
                
                // Branches module
                if (typeof syncBranchesFromWindow === 'function') syncBranchesFromWindow();
                if (typeof initializeBranches === 'function') initializeBranches();
                
                // Customers module (basic)
                if (typeof loadCustomers === 'function') loadCustomers();
                if (typeof renderCustomers === 'function') renderCustomers();
                
                // CRM module (advanced customers)
                if (typeof loadCRMCustomers === 'function') loadCRMCustomers();
                if (typeof renderCRMCustomers === 'function') renderCRMCustomers();
                if (typeof updateCRMStats === 'function') updateCRMStats();
                
                // Transactions module
                if (typeof loadTransactions === 'function') loadTransactions();
                if (typeof renderTransactions === 'function') renderTransactions();
                
                // Bills module
                if (typeof loadBills === 'function') loadBills();
                if (typeof renderBills === 'function') renderBills();
                
                // HR & Payroll modules
                if (typeof loadEmployees === 'function') loadEmployees();
                if (typeof renderEmployeeTable === 'function') renderEmployeeTable();
                if (typeof loadPayrollRecords === 'function') loadPayrollRecords();
                if (typeof loadKPITemplates === 'function') loadKPITemplates();
                if (typeof loadLeaveRequests === 'function') loadLeaveRequests();
                if (typeof loadAttendanceRecords === 'function') loadAttendanceRecords();
                
                // Chart of Accounts & Journal Entries modules
                if (typeof initChartOfAccounts === 'function') initChartOfAccounts();
                if (typeof renderChartOfAccountsContent === 'function') renderChartOfAccountsContent();
                if (typeof initJournalEntries === 'function') initJournalEntries();
                if (typeof renderJournalEntriesContent === 'function') renderJournalEntriesContent();
                
                // Update company name in UI (welcome message, page title, etc.)
                if (typeof updateCompanyNameInUI === 'function') updateCompanyNameInUI();
                
                // Re-apply user permissions to update navigation
                applyUserPermissions();
                
                // Update the user menu display with current user info
                updateAuthUI();
                
                // Force dashboard update with fresh data
                if (typeof updateDashboard === 'function') updateDashboard();
                
                console.log('All modules refreshed');
            } catch (error) {
                console.error('Error refreshing modules after tenant load:', error);
            } finally {
                // ALWAYS clear the loading flag - allow saving again
                window._isLoadingUserData = false;
            }
        }, 200);
    } else {
        console.log('No tenant data found, initializing empty data for:', user.tenantId);
        initializeEmptyTenantData(user.tenantId, user.name);
        
        // CRITICAL: Set all window arrays to empty AFTER initializing empty tenant
        // This ensures modules see empty arrays, not stale data
        window.products = [];
        window.customers = [];
        window.stockMovements = [];
        window.sales = [];
        window.transactions = [];
        window.suppliers = [];
        window.branches = [];
        window.quotations = [];
        window.projects = [];
        window.purchaseOrders = [];
        window.goodsReceipts = [];
        window.deliveryOrders = [];
        window.employees = [];
        window.payrollRecords = [];
        window.kpiTemplates = [];
        window.kpiAssignments = [];
        window.kpiScores = [];
        window.leaveRequests = [];
        window.leaveBalances = [];
        window.attendanceRecords = [];
        
        // Chart of Accounts & Journal Entries
        window.chartOfAccounts = [];
        window.journalEntries = [];
        
        // CRM customers
        window.crmCustomers = [];
        
        // Update company name even for empty tenant
        if (typeof updateCompanyNameInUI === 'function') updateCompanyNameInUI();
        
        // Clear the loading flag
        window._isLoadingUserData = false;
    }
}

function logout() {
    if (currentUser) {
        // Record audit log for logout before clearing user
        if (typeof recordAuditLog === 'function') {
            recordAuditLog({
                action: 'logout',
                module: 'auth',
                recordId: currentUser.id || currentUser.email,
                recordName: currentUser.name || currentUser.email,
                description: `User logged out: ${currentUser.name || currentUser.email}`
            });
        }
        
        // Save current user's data to their tenant before logging out
        if (typeof saveToUserTenant === 'function') {
            saveToUserTenant();
        }
        logSession(currentUser.id, 'logout');
    }
    
    currentUser = null;
    window.currentUser = null;
    localStorage.removeItem(CURRENT_USER_KEY);
    localStorage.removeItem(SESSION_TOKEN_KEY); // Clear session token on logout
    
    // Stop session validation interval
    if (sessionValidationInterval) {
        clearInterval(sessionValidationInterval);
        sessionValidationInterval = null;
    }
    
    // Reset all data to empty state to prevent data leakage
    resetToEmptyData();
    
    updateAuthUI();
    
    // Show login page (full screen)
    showLoginPage();
    showToast('You have been logged out', 'info');
}

function logSession(userId, action) {
    const sessions = JSON.parse(localStorage.getItem(USER_SESSIONS_KEY) || '[]');
    sessions.push({
        userId,
        action,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent
    });
    // Keep last 100 sessions
    if (sessions.length > 100) {
        sessions.splice(0, sessions.length - 100);
    }
    localStorage.setItem(USER_SESSIONS_KEY, JSON.stringify(sessions));
}

// ==================== UI UPDATES ====================
function updateAuthUI() {
    const authContainer = document.getElementById('authContainer');
    const userMenuContainer = document.getElementById('userMenuContainer');
    
    // Platform Admin nav elements
    const platformAdminNav = document.getElementById('platformAdminNav');
    const userManagementNav = document.getElementById('userManagementNav');
    const platformControlNav = document.getElementById('platformControlNav');
    const tenantSelector = document.getElementById('tenantSelector');
    
    if (currentUser) {
        // Show/hide Platform Admin nav based on role
        const isPlatformAdmin = currentUser.role === 'founder' || currentUser.role === 'erp_assistant';
        const isFounder = currentUser.role === 'founder';
        const isBusinessAdmin = currentUser.role === 'business_admin';
        const hasLHDNPermission = currentUser.role === 'manager' && 
            currentUser.permissions && 
            currentUser.permissions.includes('lhdn-export');
        
        // Use class toggle for platform admin elements (CSS has !important)
        if (platformAdminNav) {
            platformAdminNav.classList.toggle('visible', isPlatformAdmin);
        }
        if (userManagementNav) {
            userManagementNav.classList.toggle('visible', isPlatformAdmin);
        }
        // Only Founder can access Platform Control (not ERP Assistant)
        if (platformControlNav) {
            platformControlNav.classList.toggle('visible', isFounder);
        }
        // Only Founder can switch between tenants
        if (tenantSelector) tenantSelector.style.display = isFounder ? '' : 'none';
        
        // Show/hide LHDN Export nav based on role AND plan
        const lhdnExportNav = document.getElementById('lhdnExportNav');
        if (lhdnExportNav) {
            // Check if user's plan includes LHDN Export feature
            const userPlan = currentUser.plan || 'personal';
            const lhdnPlans = ['starter', 'business', 'professional', 'enterprise'];
            const hasPlanAccess = isFounder || lhdnPlans.includes(userPlan.toLowerCase());
            const hasRoleAccess = isFounder || isBusinessAdmin || hasLHDNPermission;
            
            // Must have BOTH plan access AND role access
            lhdnExportNav.style.display = (hasPlanAccess && hasRoleAccess) ? '' : 'none';
        }
        
        // Show user menu
        if (authContainer) authContainer.style.display = 'none';
        if (userMenuContainer) {
            userMenuContainer.style.display = 'flex';
            userMenuContainer.innerHTML = `
                <div class="user-menu">
                    <button class="user-menu-btn" onclick="toggleUserMenu()">
                        <div class="user-avatar" style="background: ${ROLES[currentUser.role]?.color || '#64748b'}">
                            <i class="fas ${ROLES[currentUser.role]?.icon || 'fa-user'}"></i>
                        </div>
                        <div class="user-info">
                            <span class="user-name">${escapeHtml(currentUser.name)}</span>
                            <span class="user-role">${ROLES[currentUser.role]?.name || currentUser.role}</span>
                        </div>
                        <i class="fas fa-chevron-down"></i>
                    </button>
                    <div class="user-dropdown" id="userDropdown">
                        <div class="dropdown-header">
                            <div class="dropdown-user-avatar" style="background: ${ROLES[currentUser.role]?.color || '#64748b'}">
                                <i class="fas ${ROLES[currentUser.role]?.icon || 'fa-user'}"></i>
                            </div>
                            <div class="dropdown-user-info">
                                <strong>${escapeHtml(currentUser.name)}</strong>
                                <small>${currentUser.email}</small>
                                <code class="user-uid-badge">${currentUser.id || 'N/A'}</code>
                            </div>
                        </div>
                        <div class="dropdown-divider"></div>
                        ${currentUser.role !== 'erp_assistant' ? `
                        <a href="#" onclick="showSection('settings'); closeUserMenu(); return false;">
                            <i class="fas fa-cog"></i> Settings
                        </a>
                        ` : ''}
                        ${canAccessModule('users') ? `
                        <a href="#" onclick="showSection('user-management'); closeUserMenu(); return false;">
                            <i class="fas fa-users-cog"></i> User Management
                        </a>
                        ` : ''}
                        ${isFounder ? `
                        <a href="#" onclick="showSection('platform-control'); renderPlatformControl(); closeUserMenu(); return false;">
                            <i class="fas fa-server"></i> Platform Control
                        </a>
                        ` : ''}
                        <div class="dropdown-divider"></div>
                        <a href="#" onclick="logout(); return false;" class="logout-link">
                            <i class="fas fa-sign-out-alt"></i> Logout
                        </a>
                    </div>
                </div>
            `;
        }
        
        // Update tenant selector (only for Founder)
        if (isFounder && typeof updateTenantSelector === 'function') {
            updateTenantSelector();
        }
        
        // For Founder: Clear any cached tenant and reset to their own data
        if (isFounder) {
            // Clear any previously selected tenant
            if (typeof clearTenantSelection === 'function') {
                clearTenantSelection();
            }
            
            // Founder should have their own tenant for their dashboard
            if (!currentUser.tenantId) {
                // Create founder's own tenant if not exists
                if (typeof createTenant === 'function') {
                    const founderTenantId = createTenant(currentUser.id, 'Platform Admin');
                    currentUser.tenantId = founderTenantId;
                    // Save the updated user
                    const userIndex = users.findIndex(u => u.id === currentUser.id);
                    if (userIndex !== -1) {
                        users[userIndex].tenantId = founderTenantId;
                        saveUsers();
                    }
                    console.log('Created founder tenant:', founderTenantId);
                }
            }
            
            // Set founder to view their own tenant
            if (typeof setCurrentTenant === 'function') {
                setCurrentTenant(currentUser.tenantId);
            }
            
            // Reset global data to founder's own tenant
            if (typeof resetToEmptyData === 'function') {
                resetToEmptyData();
            }
        }
        
        // Load tenant data (not for ERP Assistants - they only manage users)
        if (currentUser.role !== 'erp_assistant' && typeof loadCurrentTenantData === 'function') {
            loadCurrentTenantData();
        }
        
        // Show/hide nav items based on permissions
        applyUserPermissions();
        
        // Hide login page and show app
        hideLoginPage();
        
    } else {
        // Not logged in - show login page
        if (authContainer) authContainer.style.display = 'none';
        if (userMenuContainer) userMenuContainer.style.display = 'none';
        
        // Hide platform admin nav for guests (remove visible class)
        if (platformAdminNav) platformAdminNav.classList.remove('visible');
        if (userManagementNav) userManagementNav.classList.remove('visible');
        if (platformControlNav) platformControlNav.classList.remove('visible');
        if (tenantSelector) tenantSelector.style.display = 'none';
        
        // Show login page
        showLoginPage();
    }
}

function toggleUserMenu() {
    const dropdown = document.getElementById('userDropdown');
    if (dropdown) {
        dropdown.classList.toggle('show');
    }
}

function closeUserMenu() {
    const dropdown = document.getElementById('userDropdown');
    if (dropdown) {
        dropdown.classList.remove('show');
    }
}

// Close dropdown when clicking outside
document.addEventListener('click', (e) => {
    if (!e.target.closest('.user-menu')) {
        closeUserMenu();
    }
});

// ==================== PERMISSIONS ====================
function canAccessModule(moduleId) {
    if (!currentUser) return false;
    
    // Founder and Platform Admin have UNLIMITED access to all modules
    if (['founder', 'platform_admin'].includes(currentUser.role)) {
        return true;
    }
    
    // For Business Admin - check their plan features
    if (currentUser.role === 'business_admin') {
        // Get plan features
        const platformSettings = typeof getPlatformSettings === 'function' ? getPlatformSettings() : null;
        const userPlan = currentUser.plan || 'starter';
        const planFeatures = platformSettings?.plans?.[userPlan]?.features || [];
        
        // If plan has 'all' features, allow everything
        if (planFeatures.includes('all')) return true;
        
        // Check if module is in plan features
        return planFeatures.includes(moduleId);
    }
    
    // For Staff/Manager - check BOTH their assigned permissions AND the owner's plan
    if (['staff', 'manager'].includes(currentUser.role)) {
        // First check if user has permission assigned
        const hasUserPermission = currentUser.permissions.includes('all') || currentUser.permissions.includes(moduleId);
        
        // Debug log
        console.log(`canAccessModule(${moduleId}): user perms=[${currentUser.permissions.join(',')}], hasUserPerm=${hasUserPermission}`);
        
        if (!hasUserPermission) {
            console.log(`  -> DENIED: User doesn't have permission for ${moduleId}`);
            return false;
        }
        
        // Then check if the module is allowed by the tenant owner's plan
        const ownerPlanFeatures = getOwnerPlanFeatures();
        const ownerHasAll = ownerPlanFeatures.includes('all');
        const ownerAllows = ownerHasAll || ownerPlanFeatures.includes(moduleId);
        console.log(`  -> Owner plan allows ${moduleId}: ${ownerAllows}`);
        
        // Even if owner has 'all' plan, staff MUST have the specific permission assigned
        // Only return true if: (1) user has permission AND (2) owner's plan allows the module
        if (!ownerAllows) {
            console.log(`  -> DENIED: Owner plan doesn't include ${moduleId}`);
            return false;
        }
        
        // User has permission AND owner allows it
        return true;
    }
    
    // Personal users - check their plan features and hidden sections
    if (currentUser.role === 'personal') {
        const platformSettings = typeof getPlatformSettings === 'function' ? getPlatformSettings() : null;
        const personalPlan = platformSettings?.plans?.personal || {};
        const planFeatures = personalPlan.features || [];
        const hiddenSections = personalPlan.hiddenSections || [];
        
        // Check if explicitly hidden
        if (hiddenSections.includes(moduleId)) return false;
        
        // Check if has all or the specific feature
        if (planFeatures.includes('all')) return true;
        return planFeatures.includes(moduleId);
    }
    
    // Fallback to permission check
    if (currentUser.permissions.includes('all')) return true;
    return currentUser.permissions.includes(moduleId);
}

// Get the Business Admin's (owner's) plan features for Staff/Manager access control
function getOwnerPlanFeatures() {
    if (!currentUser || !currentUser.tenantId) return [];
    
    // Find the Business Admin who owns this tenant
    const allUsers = JSON.parse(localStorage.getItem('ezcubic_users') || '[]');
    const owner = allUsers.find(u => 
        u.tenantId === currentUser.tenantId && 
        (u.role === 'business_admin' || u.role === 'founder')
    );
    
    if (!owner) return [];
    
    const platformSettings = typeof getPlatformSettings === 'function' ? getPlatformSettings() : null;
    const ownerPlan = owner.plan || 'starter';
    return platformSettings?.plans?.[ownerPlan]?.features || [];
}

// Apply owner's plan restrictions to Staff/Manager
function applyOwnerPlanRestrictions(user) {
    if (!user || !user.tenantId) return;
    
    // Find the Business Admin who owns this tenant
    const allUsers = JSON.parse(localStorage.getItem('ezcubic_users') || '[]');
    const owner = allUsers.find(u => 
        u.tenantId === user.tenantId && 
        (u.role === 'business_admin' || u.role === 'founder')
    );
    
    if (!owner) return;
    
    const platformSettings = typeof getPlatformSettings === 'function' ? getPlatformSettings() : null;
    const ownerPlan = owner.plan || 'starter';
    
    console.log(`Applying owner plan restrictions: ${ownerPlan} for ${user.role}: ${user.email}`);
    console.log(`User's assigned permissions:`, user.permissions);
    
    // DON'T call applyFeatureRestrictions here - it would show all plan modules
    // Instead, let applyUserPermissions handle it (which checks BOTH user permissions AND owner plan)
    
    // Only update limits display based on owner's plan
    if (typeof updatePlanLimitsDisplay === 'function') {
        updatePlanLimitsDisplay(ownerPlan);
    }
    
    // Re-apply user permissions to ensure correct modules are shown
    // This checks both user's assigned permissions AND owner's plan
    applyUserPermissions();
}

function canManageRole(roleId) {
    if (!currentUser) return false;
    const userRole = ROLES[currentUser.role];
    return userRole && userRole.canManage.includes(roleId);
}

function applyUserPermissions() {
    console.log('applyUserPermissions called. currentUser:', currentUser?.email, 'role:', currentUser?.role);
    
    // Guest mode: Show personal plan features but require login to use
    if (!currentUser) {
        // Apply personal plan restrictions for guest preview
        if (typeof applyGuestPreviewMode === 'function') {
            applyGuestPreviewMode();
        } else {
            // Fallback: Show personal plan features
            const personalFeatures = ['dashboard', 'transactions', 'income', 'expenses', 'reports', 'taxes', 'balance-sheet', 'monthly-reports', 'ai-chatbot', 'bills'];
            const personalHidden = ['pos', 'inventory', 'stock', 'orders', 'crm', 'customers', 'suppliers', 'quotations', 'projects', 'payroll', 'leave-attendance', 'einvoice', 'branches', 'user-management', 'platform-control'];
            
            document.querySelectorAll('.nav-btn').forEach(btn => {
                const section = btn.getAttribute('onclick')?.match(/showSection\('([^']+)'\)/)?.[1];
                if (section) {
                    // Show only personal plan sections
                    const isHidden = personalHidden.some(hidden => section.includes(hidden));
                    btn.style.display = isHidden ? 'none' : '';
                }
            });
            
            // Hide business-only navigation separators for guests
            hideBusinessNavSeparators();
            
            // Show guest badge
            showGuestBadge();
        }
        return;
    }
    
    // Define hidden sections for personal users
    const personalHiddenSections = ['pos', 'inventory', 'stock', 'orders', 'crm', 'customers', 'suppliers', 'quotations', 'projects', 'payroll', 'leave-attendance', 'einvoice', 'branches', 'user-management', 'purchase-orders', 'delivery-orders', 'employees', 'kpi', 'lhdn-export', 'bank-reconciliation', 'chart-of-accounts', 'journal-entries', 'aging-reports', 'audit-log'];
    
    // Show/hide navigation buttons based on permissions
    document.querySelectorAll('.nav-btn').forEach(btn => {
        const section = btn.getAttribute('onclick')?.match(/showSection\('([^']+)'\)/)?.[1];
        if (section) {
            const moduleMap = {
                'dashboard': 'dashboard',
                'transactions': 'transactions',
                'bills': 'bills',
                'inventory': 'inventory',
                'stock': 'stock',
                'pos': 'pos',
                'orders': 'orders',
                'crm': 'crm',
                'suppliers': 'suppliers',
                'quotations': 'quotations',
                'projects': 'projects',
                'payroll': 'payroll',
                'kpi': 'kpi',
                'leave-attendance': 'leave-attendance',
                'purchase-orders': 'purchase-orders',
                'delivery-orders': 'delivery-orders',
                'employees': 'employees',
                'e-invoice': 'einvoice',
                'branches': 'branches',
                'reports': 'reports',
                'taxes': 'taxes',
                'balance-sheet': 'balance',
                'settings': 'settings',
                'user-management': 'users'
            };
            
            const moduleId = moduleMap[section] || section;
            
            // Staff and Manager should NEVER see certain admin sections
            if (['staff', 'manager'].includes(currentUser.role)) {
                const adminOnlySections = ['user-management', 'platform-control'];
                if (adminOnlySections.includes(section)) {
                    btn.style.display = 'none';
                    return;
                }
            }
            
            // Personal users - apply strict plan restrictions
            if (currentUser.role === 'personal') {
                console.log('Applying personal restrictions for section:', section);
                // Check if this section should be hidden for personal users
                const isHidden = personalHiddenSections.some(hidden => section === hidden || section.includes(hidden));
                if (isHidden) {
                    console.log('  -> HIDING:', section);
                    btn.style.display = 'none';
                    return;
                }
                // Show the button if not hidden
                console.log('  -> SHOWING:', section);
                btn.style.display = '';
                return;
            }
            
            btn.style.display = canAccessModule(moduleId) ? '' : 'none';
        }
    });
    
    // Hide business-only navigation separators for personal users
    if (currentUser.role === 'personal') {
        hideBusinessNavSeparators();
    } else {
        showAllNavSeparators();
    }
}

// Hide navigation separators that are business-only
function hideBusinessNavSeparators() {
    const separators = document.querySelectorAll('.nav-separator');
    separators.forEach(sep => {
        const text = sep.textContent.trim().toLowerCase();
        // Hide these separators for personal users
        if (text.includes('sales') || text.includes('crm') || 
            text.includes('operations') || text.includes('purchasing') || 
            text.includes('hr') || text.includes('payroll') ||
            text.includes('multi-branch') || text.includes('branch')) {
            sep.style.display = 'none';
        }
    });
}

// Show all navigation separators
function showAllNavSeparators() {
    const separators = document.querySelectorAll('.nav-separator');
    separators.forEach(sep => {
        // Don't show platform admin separator unless they have access
        if (!sep.id || sep.id !== 'platformAdminNav') {
            sep.style.display = '';
        }
    });
}

// ==================== LOGIN PAGE (FULL SCREEN) ====================
function showLoginPage() {
    let loginPage = document.getElementById('loginPageOverlay');
    
    if (!loginPage) {
        // Create the login page overlay
        const loginPageHTML = `
            <div class="login-page-overlay" id="loginPageOverlay">
                <div class="login-page-container">
                    <div class="login-page-brand">
                        <div class="brand-logo">
                            <img src="images/lazyhuman.svg" alt="A Lazy Human" style="width: 80px; height: 80px;">
                        </div>
                        <h1>A Lazy Human</h1>
                        <div class="tagline">Malaysian Business Accounting & Tax Platform</div>
                    </div>
                    
                    <div class="login-page-card">
                        <!-- LOGIN FORM -->
                        <div id="loginFormView">
                            <h2>Welcome Back</h2>
                            <p class="subtitle">Sign in to access your business dashboard</p>
                            
                            <form id="loginPageForm" onsubmit="handleLoginPage(event)">
                                <div id="loginErrorMessage" style="display: none; background: #fef2f2; border: 1px solid #fecaca; color: #dc2626; padding: 12px 15px; border-radius: 8px; margin-bottom: 15px; font-size: 14px;">
                                    <i class="fas fa-exclamation-circle" style="margin-right: 8px;"></i>
                                    <span id="loginErrorText"></span>
                                </div>
                                
                                <div class="form-group">
                                    <label class="form-label">Email Address</label>
                                    <div class="input-wrapper">
                                        <i class="fas fa-envelope"></i>
                                        <input type="email" id="loginPageEmail" placeholder="Enter your email" required>
                                    </div>
                                </div>
                                
                                <div class="form-group">
                                    <label class="form-label">Password</label>
                                    <div class="input-wrapper">
                                        <i class="fas fa-lock"></i>
                                        <input type="password" id="loginPagePassword" placeholder="Enter your password" required>
                                    </div>
                                </div>
                                
                                <div class="options-row">
                                    <label class="remember-me">
                                        <input type="checkbox" id="loginPageRemember">
                                        Remember me
                                    </label>
                                    <a href="#" class="forgot-link" onclick="showForgotPasswordView(); return false;">Forgot password?</a>
                                </div>
                                
                                <button type="submit" class="login-btn">
                                    <i class="fas fa-sign-in-alt"></i>
                                    Sign In
                                </button>
                            </form>
                            
                            <div class="divider">
                                <span>New to A Lazy Human?</span>
                            </div>
                            
                            <button type="button" class="register-btn" onclick="showRegisterView();">
                                <i class="fas fa-user-plus"></i>
                                Create Free Account
                            </button>
                        </div>
                        
                        <!-- REGISTER FORM -->
                        <div id="registerFormView" style="display: none;">
                            <div style="display: flex; align-items: center; margin-bottom: 15px;">
                                <button type="button" onclick="showLoginView();" style="background: none; border: none; color: #64748b; cursor: pointer; padding: 5px; margin-right: 10px; font-size: 16px;">
                                    <i class="fas fa-arrow-left"></i>
                                </button>
                                <div>
                                    <h2 style="margin: 0;">Create Account</h2>
                                    <p class="subtitle" style="margin: 5px 0 0;">Start tracking your finances for free</p>
                                </div>
                            </div>
                            
                            <form id="registerPageForm" onsubmit="handleRegisterPage(event)">
                                <div class="form-group">
                                    <label class="form-label">Full Name</label>
                                    <div class="input-wrapper">
                                        <i class="fas fa-user"></i>
                                        <input type="text" id="regPageName" placeholder="Enter your full name" required>
                                    </div>
                                </div>
                                
                                <div class="form-group">
                                    <label class="form-label">Email Address</label>
                                    <div class="input-wrapper">
                                        <i class="fas fa-envelope"></i>
                                        <input type="email" id="regPageEmail" placeholder="Enter your email" required>
                                    </div>
                                </div>
                                
                                <div class="form-group">
                                    <label class="form-label">Password</label>
                                    <div class="input-wrapper">
                                        <i class="fas fa-lock"></i>
                                        <input type="password" id="regPagePassword" placeholder="Create a password" minlength="6" required>
                                    </div>
                                </div>
                                
                                <div class="form-group">
                                    <label class="form-label">Confirm Password</label>
                                    <div class="input-wrapper">
                                        <i class="fas fa-lock"></i>
                                        <input type="password" id="regPagePasswordConfirm" placeholder="Confirm password" required>
                                    </div>
                                </div>
                                
                                <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 12px; margin-bottom: 15px;">
                                    <div style="font-weight: 600; color: #166534; margin-bottom: 5px; font-size: 13px;">
                                        <i class="fas fa-check-circle"></i> Personal Plan (Free)
                                    </div>
                                    <div style="font-size: 11px; color: #15803d;">
                                        Dashboard • Income & Expenses • Reports • Tax Calculator • AI Assistant
                                    </div>
                                </div>
                                
                                <div class="form-group" style="display: flex; align-items: flex-start; gap: 8px;">
                                    <input type="checkbox" id="regPageAgree" required style="margin-top: 3px; width: 16px; height: 16px;">
                                    <label for="regPageAgree" style="font-size: 12px; color: #64748b; cursor: pointer;">
                                        I agree to the Terms of Service and Privacy Policy
                                    </label>
                                </div>
                                
                                <button type="submit" class="login-btn" style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);">
                                    <i class="fas fa-user-plus"></i>
                                    Create Free Account
                                </button>
                            </form>
                            
                            <div class="divider">
                                <span>Already have an account?</span>
                            </div>
                            
                            <button type="button" class="register-btn" onclick="showLoginView();" style="color: #3b82f6; border-color: #3b82f6;">
                                <i class="fas fa-sign-in-alt"></i>
                                Sign In
                            </button>
                        </div>
                        
                        <!-- FORGOT PASSWORD FORM -->
                        <div id="forgotPasswordView" style="display: none;">
                            <h2>Reset Password</h2>
                            <p class="subtitle">Enter your email to find your account</p>
                            
                            <div id="forgotStep1">
                                <div class="form-group">
                                    <label class="form-label">Email Address</label>
                                    <div class="input-wrapper">
                                        <i class="fas fa-envelope"></i>
                                        <input type="email" id="forgotPageEmail" placeholder="Enter your registered email" required>
                                    </div>
                                </div>
                                
                                <button type="button" class="login-btn" onclick="verifyForgotEmail();">
                                    <i class="fas fa-search"></i>
                                    Find Account
                                </button>
                            </div>
                            
                            <div id="forgotStep2" style="display: none;">
                                <div style="text-align: center; margin-bottom: 20px;">
                                    <div style="width: 50px; height: 50px; background: #dcfce7; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 10px;">
                                        <i class="fas fa-user-check" style="font-size: 20px; color: #16a34a;"></i>
                                    </div>
                                    <p style="color: #64748b; font-size: 13px;">Account found: <strong id="foundEmailDisplay"></strong></p>
                                </div>
                                
                                <div class="form-group">
                                    <label class="form-label">New Password</label>
                                    <div class="input-wrapper">
                                        <i class="fas fa-lock"></i>
                                        <input type="password" id="newPagePassword" placeholder="Enter new password" minlength="6" required>
                                    </div>
                                </div>
                                
                                <div class="form-group">
                                    <label class="form-label">Confirm New Password</label>
                                    <div class="input-wrapper">
                                        <i class="fas fa-lock"></i>
                                        <input type="password" id="confirmPagePassword" placeholder="Confirm new password" required>
                                    </div>
                                </div>
                                
                                <input type="hidden" id="resetPageUserId" value="">
                                
                                <button type="button" class="login-btn" onclick="executePagePasswordReset();">
                                    <i class="fas fa-save"></i>
                                    Reset Password
                                </button>
                            </div>
                            
                            <div class="divider">
                                <span>Remember your password?</span>
                            </div>
                            
                            <button type="button" class="register-btn" onclick="showLoginView();" style="color: #3b82f6; border-color: #3b82f6;">
                                <i class="fas fa-arrow-left"></i>
                                Back to Login
                            </button>
                        </div>
                    </div>
                    
                    <!-- Cloud Sync with Company Code -->
                    <div id="syncSection" style="text-align: center; margin-top: 15px;">
                        <a href="#" onclick="toggleCompanyCodeSync(); return false;" style="color: #64748b; font-size: 12px; text-decoration: none;">
                            <i class="fas fa-cloud-download-alt"></i> Sync from another device?
                        </a>
                        <div id="companyCodeSync" style="display: none; margin-top: 15px; padding: 15px; background: #f8fafc; border-radius: 12px; text-align: left;">
                            <p style="font-size: 12px; color: #64748b; margin-bottom: 10px;">
                                <i class="fas fa-building"></i> Enter your Company Code (ask your Admin)
                            </p>
                            <div style="display: flex; gap: 8px;">
                                <input type="text" id="companyCodeInput" placeholder="e.g. ACME-7X2K" 
                                    style="flex: 1; padding: 10px 12px; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 14px; text-transform: uppercase; font-family: monospace; letter-spacing: 1px;"
                                    maxlength="12">
                                <button onclick="syncByCompanyCode()" 
                                    style="padding: 10px 16px; background: #2563eb; color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 13px;">
                                    <i class="fas fa-sync"></i> Sync
                                </button>
                            </div>
                            <p style="font-size: 11px; color: #94a3b8; margin-top: 8px;">
                                💡 Your Admin can find this in Settings → Company Code
                            </p>
                        </div>
                    </div>
                    
                    <div class="login-page-footer">
                        <p>© ${new Date().getFullYear()} EZCubic. All rights reserved.</p>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', loginPageHTML);
        loginPage = document.getElementById('loginPageOverlay');
    } else {
        // Reset to login view when showing
        showLoginView();
    }
    
    // Show login page
    loginPage.classList.remove('hidden');
    
    // Hide the main app
    const appContainer = document.querySelector('.app-container');
    if (appContainer) {
        appContainer.classList.add('logged-out');
    }
    document.body.classList.add('logged-out');
    
    // Hide mobile menu button
    const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
    if (mobileMenuBtn) mobileMenuBtn.style.display = 'none';
}

// Toggle between login/register/forgot views
function showLoginView() {
    document.getElementById('loginFormView').style.display = 'block';
    document.getElementById('registerFormView').style.display = 'none';
    document.getElementById('forgotPasswordView').style.display = 'none';
}

function showRegisterView() {
    document.getElementById('loginFormView').style.display = 'none';
    document.getElementById('registerFormView').style.display = 'block';
    document.getElementById('forgotPasswordView').style.display = 'none';
}

function showForgotPasswordView() {
    document.getElementById('loginFormView').style.display = 'none';
    document.getElementById('registerFormView').style.display = 'none';
    document.getElementById('forgotPasswordView').style.display = 'block';
    // Reset to step 1
    document.getElementById('forgotStep1').style.display = 'block';
    document.getElementById('forgotStep2').style.display = 'none';
}

function hideLoginPage() {
    const loginPage = document.getElementById('loginPageOverlay');
    if (loginPage) {
        loginPage.classList.add('hidden');
    }
    
    // Show the main app
    const appContainer = document.querySelector('.app-container');
    if (appContainer) {
        appContainer.classList.remove('logged-out');
    }
    document.body.classList.remove('logged-out');
    
    // Show mobile menu button
    const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
    if (mobileMenuBtn) mobileMenuBtn.style.display = '';
}

function handleLoginPage(event) {
    event.preventDefault();
    const email = document.getElementById('loginPageEmail').value;
    const password = document.getElementById('loginPagePassword').value;
    login(email, password);
}

function handleRegisterPage(event) {
    event.preventDefault();
    
    const name = document.getElementById('regPageName').value.trim();
    const email = document.getElementById('regPageEmail').value.trim();
    const password = document.getElementById('regPagePassword').value;
    const passwordConfirm = document.getElementById('regPagePasswordConfirm').value;
    
    // Validation
    if (password !== passwordConfirm) {
        showToast('Passwords do not match', 'error');
        return;
    }
    
    if (password.length < 6) {
        showToast('Password must be at least 6 characters', 'error');
        return;
    }
    
    // Check if email exists
    loadUsers();
    if (users.find(u => u.email.toLowerCase() === email.toLowerCase())) {
        showToast('Email already registered. Please login instead.', 'error');
        return;
    }
    
    // Hash password before storing
    hashPassword(password).then(hashedPassword => {
        // Create a unique tenant for this user
        const tenantId = 'tenant_' + Date.now();
        
        // Create personal user with hashed password
        const newUser = {
            id: 'user_' + Date.now(),
            email: email,
            password: hashedPassword, // Now hashed!
            name: name,
            role: 'personal',
            plan: 'personal',
            status: 'active',
            permissions: ['dashboard', 'transactions', 'income', 'expenses', 'reports', 'taxes', 'balance-sheet', 'monthly-reports', 'ai-chatbot', 'bills'],
            tenantId: tenantId,
            createdAt: new Date().toISOString(),
            registeredVia: 'free_signup'
        };
        
        users.push(newUser);
        saveUsers();
        
        // Initialize empty tenant data
        initializeEmptyTenantData(tenantId, name);
        
        // Auto-login
        currentUser = newUser;
        window.currentUser = newUser;
        localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(currentUser));
        
        // Remove guest mode
        isGuestMode = false;
        removeViewOnlyMode();
        
        // Load tenant data
        if (typeof loadCurrentTenantData === 'function') {
            loadCurrentTenantData();
        } else {
            resetToEmptyData();
        }
        
        showToast(`Welcome ${name}! Your free account is ready.`, 'success');
        
        // Hide login page and show main app
        const loginPage = document.getElementById('loginPageOverlay');
        if (loginPage) loginPage.classList.add('hidden');
        
        document.body.classList.remove('logged-out');
        const appContainer = document.querySelector('.app-container');
        if (appContainer) appContainer.classList.remove('logged-out');
        
        // Show mobile menu button
        const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
        if (mobileMenuBtn) mobileMenuBtn.style.display = '';
        
        // Update auth panel
        updateAuthPanel();
        
        // Apply plan restrictions
        if (typeof applyPlanRestrictions === 'function') {
            applyPlanRestrictions();
        }
        
        // Show dashboard
        showSection('dashboard');
        
        // Refresh displays
        if (typeof updateDisplay === 'function') updateDisplay();
        if (typeof renderDashboard === 'function') renderDashboard();
        
        console.log('🔒 User registered with hashed password');
    });
}

function verifyForgotEmail() {
    const email = document.getElementById('forgotPageEmail').value.trim();
    
    if (!email) {
        showToast('Please enter your email address', 'error');
        return;
    }
    
    loadUsers();
    const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());
    
    if (!user) {
        showToast('No account found with this email', 'error');
        return;
    }
    
    // Show step 2
    document.getElementById('forgotStep1').style.display = 'none';
    document.getElementById('forgotStep2').style.display = 'block';
    document.getElementById('foundEmailDisplay').textContent = email;
    document.getElementById('resetPageUserId').value = user.id;
}

function executePagePasswordReset() {
    const newPassword = document.getElementById('newPagePassword').value;
    const confirmPassword = document.getElementById('confirmPagePassword').value;
    const userId = document.getElementById('resetPageUserId').value;
    
    if (newPassword !== confirmPassword) {
        showToast('Passwords do not match', 'error');
        return;
    }
    
    if (newPassword.length < 6) {
        showToast('Password must be at least 6 characters', 'error');
        return;
    }
    
    const userIndex = users.findIndex(u => u.id === userId);
    if (userIndex === -1) {
        showToast('User not found', 'error');
        return;
    }
    
    users[userIndex].password = newPassword;
    users[userIndex].updatedAt = new Date().toISOString();
    saveUsers();
    
    showLoginView();
    showToast('Password reset successfully! Please login with your new password.', 'success');
}

// ==================== LOGIN MODAL ====================
function showLoginModal() {
    let modal = document.getElementById('loginModal');
    
    if (!modal) {
        const modalHTML = `
            <div class="modal show" id="loginModal" style="z-index: 9999;">
                <div class="modal-content" style="max-width: 400px;">
                    <div class="login-header">
                        <div class="login-logo">
                            <img src="images/lazyhuman.svg" alt="A Lazy Human" style="width: 60px; height: 60px;">
                        </div>
                        <h2>A Lazy Human</h2>
                        <p>Sign in to continue</p>
                    </div>
                    <form id="loginForm" onsubmit="handleLogin(event)">
                        <div class="form-group">
                            <label class="form-label">Email</label>
                            <div class="input-icon">
                                <i class="fas fa-envelope"></i>
                                <input type="email" id="loginEmail" class="form-control" required placeholder="Enter your email">
                            </div>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Password</label>
                            <div class="input-icon">
                                <i class="fas fa-lock"></i>
                                <input type="password" id="loginPassword" class="form-control" required placeholder="Enter your password">
                            </div>
                        </div>
                        <div class="form-group" style="display: flex; justify-content: space-between; align-items: center;">
                            <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
                                <input type="checkbox" id="rememberMe"> Remember me
                            </label>
                            <a href="#" onclick="showForgotPassword(); return false;" style="color: #2563eb; font-size: 13px;">Forgot password?</a>
                        </div>
                        <button type="submit" class="btn-primary" style="width: 100%; padding: 12px;">
                            <i class="fas fa-sign-in-alt"></i> Sign In
                        </button>
                    </form>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        modal = document.getElementById('loginModal');
    } else {
        modal.style.display = '';
        modal.classList.add('show');
    }
}

function closeLoginModal() {
    const modal = document.getElementById('loginModal');
    if (modal) {
        modal.classList.remove('show');
    }
}

function handleLogin(event) {
    event.preventDefault();
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    login(email, password);
}

function showForgotPassword() {
    closeLoginModal();
    
    // Remove existing modal if any
    document.getElementById('forgotPasswordModal')?.remove();
    
    const modalHTML = `
        <div class="modal show" id="forgotPasswordModal" style="z-index: 10000;">
            <div class="modal-content" style="max-width: 400px;">
                <div class="modal-header">
                    <h3 class="modal-title"><i class="fas fa-key"></i> Reset Password</h3>
                    <button class="modal-close" onclick="closeForgotPasswordModal()">&times;</button>
                </div>
                <div id="forgotPasswordStep1">
                    <p style="color: #64748b; margin-bottom: 20px;">Enter your email address to reset your password.</p>
                    <div class="form-group">
                        <label class="form-label">Email Address</label>
                        <input type="email" id="resetEmail" class="form-control" placeholder="Enter your registered email" required>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn-secondary" onclick="closeForgotPasswordModal(); showLoginPage();">Back to Login</button>
                        <button type="button" class="btn-primary" onclick="verifyResetEmail()">
                            <i class="fas fa-search"></i> Find Account
                        </button>
                    </div>
                </div>
                <div id="forgotPasswordStep2" style="display: none;">
                    <div style="text-align: center; margin-bottom: 20px;">
                        <div style="width: 60px; height: 60px; background: #dcfce7; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 15px;">
                            <i class="fas fa-user-check" style="font-size: 24px; color: #16a34a;"></i>
                        </div>
                        <p style="color: #64748b;">Account found for: <strong id="foundEmail"></strong></p>
                    </div>
                    <div class="form-group">
                        <label class="form-label">New Password</label>
                        <input type="password" id="newResetPassword" class="form-control" placeholder="Enter new password" minlength="6" required>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Confirm New Password</label>
                        <input type="password" id="confirmResetPassword" class="form-control" placeholder="Confirm new password" required>
                    </div>
                    <input type="hidden" id="resetUserId" value="">
                    <div class="modal-footer">
                        <button type="button" class="btn-secondary" onclick="closeForgotPasswordModal(); showLoginPage();">Cancel</button>
                        <button type="button" class="btn-primary" onclick="executePasswordReset()">
                            <i class="fas fa-save"></i> Reset Password
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

function closeForgotPasswordModal() {
    const modal = document.getElementById('forgotPasswordModal');
    if (modal) {
        modal.remove();
    }
}

function verifyResetEmail() {
    const email = document.getElementById('resetEmail').value.trim();
    
    if (!email) {
        showToast('Please enter your email address', 'error');
        return;
    }
    
    // Reload users to get latest data
    loadUsers();
    
    const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());
    
    if (user) {
        document.getElementById('forgotPasswordStep1').style.display = 'none';
        document.getElementById('forgotPasswordStep2').style.display = 'block';
        document.getElementById('foundEmail').textContent = user.email;
        document.getElementById('resetUserId').value = user.id;
        showToast('Account found! Please set a new password.', 'success');
    } else {
        showToast('No account found with this email address', 'error');
    }
}

function executePasswordReset() {
    const userId = document.getElementById('resetUserId').value;
    const newPassword = document.getElementById('newResetPassword').value;
    const confirmPassword = document.getElementById('confirmResetPassword').value;
    
    if (!newPassword || newPassword.length < 6) {
        showToast('Password must be at least 6 characters', 'error');
        return;
    }
    
    if (newPassword !== confirmPassword) {
        showToast('Passwords do not match', 'error');
        return;
    }
    
    // Reload and update
    loadUsers();
    
    const userIndex = users.findIndex(u => u.id === userId);
    if (userIndex === -1) {
        showToast('User not found', 'error');
        return;
    }
    
    users[userIndex].password = newPassword;
    users[userIndex].updatedAt = new Date().toISOString();
    saveUsers();
    
    closeForgotPasswordModal();
    showLoginPage();
    showToast('Password reset successfully! Please login with your new password.', 'success');
}

// ==================== USER MANAGEMENT ====================
function showUserManagement() {
    const container = document.getElementById('user-management');
    if (!container) return;
    
    if (!currentUser || !canAccessModule('users')) {
        container.innerHTML = `
            <div class="access-denied">
                <i class="fas fa-lock"></i>
                <h3>Access Denied</h3>
                <p>You don't have permission to access User Management</p>
            </div>
        `;
        return;
    }
    
    renderUserManagement();
}

function renderUserManagement() {
    const container = document.getElementById('userManagementContent');
    if (!container) return;
    
    // Determine which roles to show based on current user's role
    let visibleRoles = [];
    let manageableUsers = [];
    
    // For Founder: Show ALL users in the system for monitoring
    const isFounder = currentUser.role === 'founder';
    const allSystemUsers = isFounder ? users.filter(u => u.role !== 'founder') : [];
    
    if (currentUser.role === 'founder') {
        // Founder sees platform-level roles only (not tenant-level manager/staff)
        visibleRoles = ['erp_assistant', 'business_admin', 'personal'];
        manageableUsers = users.filter(u => u.role !== 'founder' && u.role !== 'manager' && u.role !== 'staff');
    } else if (currentUser.role === 'erp_assistant') {
        // ERP Assistant only sees Business Admins and Personal users they can manage
        visibleRoles = ['business_admin', 'personal'];
        manageableUsers = users.filter(u => u.role === 'business_admin' || u.role === 'personal');
    } else if (currentUser.role === 'business_admin') {
        // Business Admin sees Manager and Staff within their tenant only
        visibleRoles = ['manager', 'staff'];
        manageableUsers = users.filter(u => 
            (u.role === 'manager' || u.role === 'staff') && 
            u.tenantId === currentUser.tenantId
        );
        // Also show themselves
        manageableUsers.push(currentUser);
    } else if (currentUser.role === 'manager') {
        // Manager sees Staff within their tenant only
        visibleRoles = ['staff'];
        manageableUsers = users.filter(u => 
            u.role === 'staff' && 
            u.tenantId === currentUser.tenantId
        );
        // Also show themselves
        manageableUsers.push(currentUser);
    } else {
        // Staff can only see themselves
        visibleRoles = [];
        manageableUsers = [currentUser];
    }
    
    // Group by role
    const usersByRole = {};
    manageableUsers.forEach(user => {
        if (!usersByRole[user.role]) {
            usersByRole[user.role] = [];
        }
        usersByRole[user.role].push(user);
    });
    
    // Get subscription stats for Business Admins
    const platformSettings = typeof getPlatformSettings === 'function' ? getPlatformSettings() : null;
    const subscriptions = typeof getSubscriptions === 'function' ? getSubscriptions() : {};
    const businessAdmins = manageableUsers.filter(u => u.role === 'business_admin');
    
    // Count subscriptions by plan
    const planCounts = {};
    let trialCount = 0;
    let expiredCount = 0;
    
    businessAdmins.forEach(user => {
        if (user.plan) {
            planCounts[user.plan] = (planCounts[user.plan] || 0) + 1;
        }
        const sub = user.tenantId ? subscriptions[user.tenantId] : null;
        if (sub?.isTrial) trialCount++;
        const status = sub && typeof checkSubscriptionStatus === 'function' ? checkSubscriptionStatus(user.tenantId) : null;
        if (status && !status.valid) expiredCount++;
    });
    
    // Stats for Founder - ALL users
    const founderStats = isFounder ? {
        totalAll: allSystemUsers.length,
        businessAdmins: allSystemUsers.filter(u => u.role === 'business_admin').length,
        managers: allSystemUsers.filter(u => u.role === 'manager').length,
        staff: allSystemUsers.filter(u => u.role === 'staff').length,
        personal: allSystemUsers.filter(u => u.role === 'personal').length,
        erpAssistants: allSystemUsers.filter(u => u.role === 'erp_assistant').length,
        activeAll: allSystemUsers.filter(u => u.status === 'active').length,
        inactiveAll: allSystemUsers.filter(u => u.status === 'inactive').length,
        trials: trialCount,
        expired: expiredCount
    } : null;
    
    // Stats
    const stats = {
        total: manageableUsers.length,
        active: manageableUsers.filter(u => u.status === 'active').length,
        inactive: manageableUsers.filter(u => u.status === 'inactive').length,
        businessAdmins: businessAdmins.length,
        trials: trialCount,
        expired: expiredCount
    };
    
    // Show different stats based on role
    const showSubscriptionStats = (currentUser.role === 'founder' || currentUser.role === 'erp_assistant') && businessAdmins.length > 0;
    
    // Track active tab
    const activeTab = window.userMgmtActiveTab || 'users';
    
    container.innerHTML = `
        ${isFounder ? `
        <!-- FOUNDER: Tabbed Interface -->
        <div class="founder-tabs" style="margin-bottom: 20px;">
            <div style="display: flex; gap: 0; border-bottom: 2px solid #e2e8f0;">
                <button onclick="switchUserMgmtTab('users')" id="tabUsers" 
                    style="padding: 12px 24px; border: none; background: ${activeTab === 'users' ? '#6366f1' : 'transparent'}; color: ${activeTab === 'users' ? 'white' : '#64748b'}; font-weight: 600; font-size: 14px; cursor: pointer; border-radius: 8px 8px 0 0; transition: all 0.2s;">
                    <i class="fas fa-user-plus" style="margin-right: 8px;"></i>Add Users
                </button>
                <button onclick="switchUserMgmtTab('control')" id="tabControl" 
                    style="padding: 12px 24px; border: none; background: ${activeTab === 'control' ? '#6366f1' : 'transparent'}; color: ${activeTab === 'control' ? 'white' : '#64748b'}; font-weight: 600; font-size: 14px; cursor: pointer; border-radius: 8px 8px 0 0; transition: all 0.2s;">
                    <i class="fas fa-users-cog" style="margin-right: 8px;"></i>User Control
                    <span style="background: ${activeTab === 'control' ? 'rgba(255,255,255,0.3)' : '#e0e7ff'}; color: ${activeTab === 'control' ? 'white' : '#4338ca'}; padding: 2px 8px; border-radius: 10px; font-size: 11px; margin-left: 6px;">${allSystemUsers.length}</span>
                </button>
            </div>
        </div>
        
        <!-- TAB: User Control Panel -->
        <div id="userControlTab" style="display: ${activeTab === 'control' ? 'block' : 'none'};">
            <!-- Stats Overview -->
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(100px, 1fr)); gap: 12px; margin-bottom: 20px;">
                <div style="background: linear-gradient(135deg, #6366f1, #818cf8); border-radius: 12px; padding: 16px; color: white; text-align: center;">
                    <div style="font-size: 28px; font-weight: 700;">${founderStats.totalAll}</div>
                    <div style="font-size: 11px; opacity: 0.9;">Total Users</div>
                </div>
                <div style="background: linear-gradient(135deg, #10b981, #34d399); border-radius: 12px; padding: 16px; color: white; text-align: center;">
                    <div style="font-size: 28px; font-weight: 700;">${founderStats.activeAll}</div>
                    <div style="font-size: 11px; opacity: 0.9;">Active</div>
                </div>
                <div style="background: linear-gradient(135deg, #ef4444, #f87171); border-radius: 12px; padding: 16px; color: white; text-align: center;">
                    <div style="font-size: 28px; font-weight: 700;">${founderStats.inactiveAll}</div>
                    <div style="font-size: 11px; opacity: 0.9;">Inactive</div>
                </div>
                <div style="background: linear-gradient(135deg, #8b5cf6, #a78bfa); border-radius: 12px; padding: 16px; color: white; text-align: center;">
                    <div style="font-size: 28px; font-weight: 700;">${founderStats.businessAdmins}</div>
                    <div style="font-size: 11px; opacity: 0.9;">Business</div>
                </div>
            </div>
            
            <!-- Search & Filter Bar -->
            <div style="background: white; border-radius: 12px; padding: 16px; margin-bottom: 16px; box-shadow: 0 2px 8px rgba(0,0,0,0.06);">
                <div style="display: flex; gap: 12px; flex-wrap: wrap; align-items: center;">
                    <div style="flex: 1; min-width: 250px;">
                        <div style="position: relative;">
                            <i class="fas fa-search" style="position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: #94a3b8;"></i>
                            <input type="text" id="founderUserSearch" placeholder="Search by ID, name, or email..." 
                                style="width: 100%; padding: 10px 12px 10px 38px; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 14px;"
                                oninput="filterFounderUserList(this.value)">
                        </div>
                    </div>
                    <div style="position: relative;">
                        <button onclick="toggleFilterDropdown()" style="padding: 10px 16px; border: 1px solid #e2e8f0; background: white; border-radius: 8px; font-size: 14px; cursor: pointer; display: flex; align-items: center; gap: 8px;">
                            <i class="fas fa-filter" style="color: #6366f1;"></i>
                            <span>Filters</span>
                            <i class="fas fa-chevron-down" style="font-size: 10px; color: #94a3b8;"></i>
                        </button>
                        <div id="filterDropdown" style="display: none; position: absolute; top: 100%; right: 0; margin-top: 8px; background: white; border-radius: 12px; box-shadow: 0 10px 40px rgba(0,0,0,0.15); padding: 16px; min-width: 200px; z-index: 100;">
                            <div style="margin-bottom: 12px;">
                                <label style="font-size: 11px; color: #64748b; text-transform: uppercase; font-weight: 600;">Role</label>
                                <select id="founderRoleFilter" onchange="filterFounderUserList(document.getElementById('founderUserSearch').value)" 
                                    style="width: 100%; padding: 8px; border: 1px solid #e2e8f0; border-radius: 6px; font-size: 13px; margin-top: 4px;">
                                    <option value="">All Roles</option>
                                    <option value="business_admin">Business Admin</option>
                                    <option value="manager">Manager</option>
                                    <option value="staff">Staff</option>
                                    <option value="personal">Personal</option>
                                </select>
                            </div>
                            <div style="margin-bottom: 12px;">
                                <label style="font-size: 11px; color: #64748b; text-transform: uppercase; font-weight: 600;">Status</label>
                                <select id="founderStatusFilter" onchange="filterFounderUserList(document.getElementById('founderUserSearch').value)" 
                                    style="width: 100%; padding: 8px; border: 1px solid #e2e8f0; border-radius: 6px; font-size: 13px; margin-top: 4px;">
                                    <option value="">All Status</option>
                                    <option value="active">Active</option>
                                    <option value="inactive">Inactive</option>
                                </select>
                            </div>
                            <button onclick="clearFilters()" style="width: 100%; padding: 8px; background: #f1f5f9; border: none; border-radius: 6px; font-size: 12px; cursor: pointer; color: #64748b;">
                                Clear Filters
                            </button>
                        </div>
                    </div>
                    <button class="btn-outline" onclick="exportUserList()" style="padding: 10px 16px; white-space: nowrap;">
                        <i class="fas fa-download"></i> Export
                    </button>
                </div>
            </div>
            
            <!-- Users Table -->
            <div style="background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.06);">
                <div style="padding: 16px; border-bottom: 1px solid #e2e8f0;">
                    <h4 style="margin: 0; font-size: 15px; color: #1e293b;">
                        All Users <span id="founderUserCount" style="color: #94a3b8; font-weight: normal;">(${allSystemUsers.length})</span>
                    </h4>
                </div>
                <div style="overflow-x: auto;">
                    <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
                        <thead>
                            <tr style="background: #f8fafc;">
                                <th style="padding: 12px; text-align: left; font-weight: 600; color: #475569;">User</th>
                                <th style="padding: 12px; text-align: left; font-weight: 600; color: #475569;">Role</th>
                                <th style="padding: 12px; text-align: left; font-weight: 600; color: #475569;">Status</th>
                                <th style="padding: 12px; text-align: center; font-weight: 600; color: #475569;">Actions</th>
                            </tr>
                        </thead>
                        <tbody id="founderUsersTableBody">
                            ${allSystemUsers.map(user => {
                                const role = ROLES[user.role] || {};
                                const isActive = user.status === 'active' || !user.status;
                                return `
                                    <tr class="founder-user-row" data-uid="${user.id}" data-name="${(user.name || '').toLowerCase()}" data-email="${(user.email || '').toLowerCase()}" data-role="${user.role}" data-status="${user.status || 'active'}"
                                        style="transition: background 0.15s;" 
                                        onmouseover="this.style.background='#f8fafc'" 
                                        onmouseout="this.style.background=''">
                                        <td style="padding: 12px; border-bottom: 1px solid #f1f5f9;">
                                            <div style="display: flex; align-items: center; gap: 10px;">
                                                <div style="width: 36px; height: 36px; border-radius: 50%; background: ${role.color || '#6366f1'}20; display: flex; align-items: center; justify-content: center;">
                                                    <i class="fas ${role.icon || 'fa-user'}" style="color: ${role.color || '#6366f1'}; font-size: 14px;"></i>
                                                </div>
                                                <div>
                                                    <div style="font-weight: 500; color: #1e293b;">${escapeHtml(user.name || 'N/A')}</div>
                                                    <div style="font-size: 11px; color: #94a3b8;">${escapeHtml(user.email || 'N/A')}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td style="padding: 12px; border-bottom: 1px solid #f1f5f9;">
                                            <span style="background: ${role.color || '#6366f1'}15; color: ${role.color || '#6366f1'}; padding: 4px 10px; border-radius: 6px; font-size: 11px; font-weight: 500;">
                                                ${role.name || user.role}
                                            </span>
                                        </td>
                                        <td style="padding: 12px; border-bottom: 1px solid #f1f5f9;">
                                            <span style="background: ${isActive ? '#dcfce7' : '#fee2e2'}; color: ${isActive ? '#16a34a' : '#dc2626'}; padding: 4px 10px; border-radius: 6px; font-size: 11px; font-weight: 500;">
                                                ${isActive ? 'Active' : 'Inactive'}
                                            </span>
                                        </td>
                                        <td style="padding: 12px; border-bottom: 1px solid #f1f5f9; text-align: center;">
                                            <div style="display: flex; gap: 6px; justify-content: center;">
                                                <button onclick="showUserDetailModal('${user.id}')" style="padding: 6px 10px; border: none; background: #e0e7ff; color: #4338ca; border-radius: 6px; cursor: pointer; font-size: 11px;" title="View">
                                                    <i class="fas fa-eye"></i>
                                                </button>
                                                ${isActive ? `
                                                    <button onclick="toggleUserStatus('${user.id}', 'inactive')" style="padding: 6px 10px; border: none; background: #fef3c7; color: #d97706; border-radius: 6px; cursor: pointer; font-size: 11px;" title="Deactivate">
                                                        <i class="fas fa-ban"></i>
                                                    </button>
                                                ` : `
                                                    <button onclick="toggleUserStatus('${user.id}', 'active')" style="padding: 6px 10px; border: none; background: #dcfce7; color: #16a34a; border-radius: 6px; cursor: pointer; font-size: 11px;" title="Activate">
                                                        <i class="fas fa-check"></i>
                                                    </button>
                                                `}
                                                <button onclick="confirmDeleteUser('${user.id}')" style="padding: 6px 10px; border: none; background: #fee2e2; color: #dc2626; border-radius: 6px; cursor: pointer; font-size: 11px;" title="Delete">
                                                    <i class="fas fa-trash"></i>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                `;
                            }).join('')}
                        </tbody>
                    </table>
                </div>
                ${allSystemUsers.length === 0 ? `
                    <div style="padding: 40px; text-align: center; color: #94a3b8;">
                        <i class="fas fa-users" style="font-size: 32px; margin-bottom: 10px;"></i>
                        <p>No users found</p>
                    </div>
                ` : ''}
            </div>
        </div>
        
        <!-- TAB: Add Users (existing content) -->
        <div id="addUsersTab" style="display: ${activeTab === 'users' ? 'block' : 'none'};">
        ` : ''}
        
        <div class="user-management-stats">
            <div class="stat-card">
                <div class="stat-icon" style="background: linear-gradient(135deg, #2563eb, #3b82f6);">
                    <i class="fas fa-users"></i>
                </div>
                <div class="stat-info">
                    <span class="stat-value">${stats.total}</span>
                    <span class="stat-label">Total Users</span>
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-icon" style="background: linear-gradient(135deg, #10b981, #34d399);">
                    <i class="fas fa-user-check"></i>
                </div>
                <div class="stat-info">
                    <span class="stat-value">${stats.active}</span>
                    <span class="stat-label">Active</span>
                </div>
            </div>
            ${showSubscriptionStats ? `
                <div class="stat-card">
                    <div class="stat-icon" style="background: linear-gradient(135deg, #8b5cf6, #a78bfa);">
                        <i class="fas fa-building"></i>
                    </div>
                    <div class="stat-info">
                        <span class="stat-value">${stats.businessAdmins}</span>
                        <span class="stat-label">Businesses</span>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon" style="background: linear-gradient(135deg, #f59e0b, #fbbf24);">
                        <i class="fas fa-hourglass-half"></i>
                    </div>
                    <div class="stat-info">
                        <span class="stat-value">${stats.trials}</span>
                        <span class="stat-label">On Trial</span>
                    </div>
                </div>
            ` : `
                <div class="stat-card">
                    <div class="stat-icon" style="background: linear-gradient(135deg, #f59e0b, #fbbf24);">
                        <i class="fas fa-user-clock"></i>
                    </div>
                    <div class="stat-info">
                        <span class="stat-value">${stats.inactive}</span>
                        <span class="stat-label">Inactive</span>
                    </div>
                </div>
            `}
            </div>
        </div>
        
        ${showSubscriptionStats && Object.keys(planCounts).length > 0 ? `
            <div style="background: white; border-radius: 12px; padding: 16px; margin-bottom: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                <h4 style="margin: 0 0 12px 0; font-size: 14px; color: #334155;">
                    <i class="fas fa-chart-pie" style="margin-right: 8px; color: #8b5cf6;"></i>
                    Subscriptions by Plan
                </h4>
                <div style="display: flex; gap: 12px; flex-wrap: wrap;">
                    ${Object.entries(platformSettings?.plans || {}).map(([planId, plan]) => {
                        const count = planCounts[planId] || 0;
                        return `
                            <div style="display: flex; align-items: center; gap: 8px; background: ${plan.color}15; padding: 8px 12px; border-radius: 8px; border-left: 3px solid ${plan.color};">
                                <span style="font-weight: 600; color: ${plan.color};">${count}</span>
                                <span style="font-size: 12px; color: #64748b;">${plan.name}</span>
                            </div>
                        `;
                    }).join('')}
                    ${stats.expired > 0 ? `
                        <div style="display: flex; align-items: center; gap: 8px; background: #fef2f2; padding: 8px 12px; border-radius: 8px; border-left: 3px solid #ef4444;">
                            <span style="font-weight: 600; color: #ef4444;">${stats.expired}</span>
                            <span style="font-size: 12px; color: #64748b;">Expired</span>
                        </div>
                    ` : ''}
                </div>
            </div>
        ` : ''}
        
        <div class="users-list">
            ${visibleRoles.length === 0 ? `
                <div class="no-access-message" style="text-align: center; padding: 40px; color: #64748b;">
                    <i class="fas fa-user-lock" style="font-size: 48px; margin-bottom: 15px; opacity: 0.5;"></i>
                    <p>You can only view your own profile.</p>
                </div>
            ` : visibleRoles.map(roleId => {
                const role = ROLES[roleId];
                const roleUsers = usersByRole[roleId] || [];
                
                return `
                    <div class="role-section">
                        <div class="role-header">
                            <div class="role-title">
                                <i class="fas ${role.icon}" style="color: ${role.color}"></i>
                                <span>${role.name}</span>
                                <span class="role-count">${roleUsers.length}</span>
                            </div>
                            ${canManageRole(roleId) ? `
                                <button class="btn-outline btn-sm" onclick="showAddUserModal('${roleId}')">
                                    <i class="fas fa-plus"></i> Add ${role.name}
                                </button>
                            ` : ''}
                        </div>
                        <div class="role-users">
                            ${roleUsers.length === 0 ? `
                                <div class="no-users">No ${role.name.toLowerCase()}s yet</div>
                            ` : roleUsers.map(user => {
                                // Get plan info for business_admin users
                                const platformSettings = typeof getPlatformSettings === 'function' ? getPlatformSettings() : null;
                                const userPlan = user.plan ? platformSettings?.plans?.[user.plan] : null;
                                const subscriptions = typeof getSubscriptions === 'function' ? getSubscriptions() : {};
                                const subscription = user.tenantId ? subscriptions[user.tenantId] : null;
                                const subscriptionStatus = subscription && typeof checkSubscriptionStatus === 'function' 
                                    ? checkSubscriptionStatus(user.tenantId) : null;
                                
                                return `
                                <div class="user-card ${user.status === 'inactive' ? 'inactive' : ''}">
                                    <div class="user-avatar" style="background: ${role.color}">
                                        <i class="fas ${role.icon}"></i>
                                    </div>
                                    <div class="user-details">
                                        <div class="user-name">${escapeHtml(user.name)}</div>
                                        <div class="user-email">${escapeHtml(user.email)}</div>
                                        <div class="user-uid"><i class="fas fa-id-badge"></i> UID: ${escapeHtml(user.id || 'N/A')}</div>
                                        <div class="user-meta">
                                            <span class="status-badge ${user.status}">${user.status}</span>
                                            ${user.role === 'business_admin' && userPlan ? `
                                                <span class="plan-badge" style="background: ${userPlan.color}; color: white; padding: 2px 8px; border-radius: 10px; font-size: 11px;">
                                                    ${userPlan.name}
                                                </span>
                                                ${subscription?.isFree || user.plan === 'personal' ? '<span style="background: #64748b; color: white; padding: 2px 6px; border-radius: 8px; font-size: 10px; margin-left: 4px;">FREE</span>' : 
                                                  subscription?.isTrial ? '<span style="background: #f59e0b; color: white; padding: 2px 6px; border-radius: 8px; font-size: 10px; margin-left: 4px;">TRIAL</span>' : ''}
                                            ` : `
                                                <span class="permissions-count">
                                                    <i class="fas fa-key"></i> ${user.permissions.includes('all') ? 'Full Access' : user.permissions.length + ' modules'}
                                                </span>
                                            `}
                                        </div>
                                        ${user.role === 'business_admin' && subscription ? `
                                            <div style="font-size: 11px; color: #64748b; margin-top: 4px;">
                                                ${subscription?.isFree || user.plan === 'personal' ? 
                                                    `<i class="fas fa-infinity" style="color: #10b981;"></i> Free forever - No expiry` :
                                                    subscriptionStatus?.valid ? 
                                                        `<i class="fas fa-check-circle" style="color: #10b981;"></i> Expires: ${new Date(subscription.expiresAt).toLocaleDateString()}` :
                                                        `<i class="fas fa-exclamation-circle" style="color: #ef4444;"></i> ${subscriptionStatus?.reason?.replace(/_/g, ' ') || 'Expired'}`
                                                }
                                                ${subscriptionStatus?.daysLeft !== undefined && !subscription?.isFree && user.plan !== 'personal' ? ` (${subscriptionStatus.daysLeft} days left)` : ''}
                                            </div>
                                        ` : ''}
                                    </div>
                                    <div class="user-actions">
                                        ${user.id !== currentUser.id && canManageRole(user.role) ? `
                                            <button class="btn-icon" onclick="editUser('${user.id}')" title="Edit">
                                                <i class="fas fa-edit"></i>
                                            </button>
                                            ${user.role === 'business_admin' ? `
                                                <button class="btn-icon" onclick="showChangePlanModal('${user.tenantId}')" title="Change Plan">
                                                    <i class="fas fa-box"></i>
                                                </button>
                                            ` : ''}
                                            <button class="btn-icon" onclick="toggleUserStatus('${user.id}')" title="${user.status === 'active' ? 'Deactivate' : 'Activate'}">
                                                <i class="fas fa-${user.status === 'active' ? 'ban' : 'check'}"></i>
                                            </button>
                                            <button class="btn-icon danger" onclick="deleteUser('${user.id}')" title="Delete">
                                                <i class="fas fa-trash"></i>
                                            </button>
                                        ` : ''}
                                        ${user.id === currentUser.id ? `
                                            <span class="current-user-badge">You</span>
                                        ` : ''}
                                    </div>
                                </div>
                            `}).join('')}
                        </div>
                    </div>
                `;
            }).join('')}
            
            ${/* Show current user's own profile if they're viewing limited roles */
            (currentUser.role === 'business_admin' || currentUser.role === 'manager') ? `
                <div class="role-section" style="margin-top: 20px; border-top: 2px solid #e2e8f0; padding-top: 20px;">
                    <div class="role-header">
                        <div class="role-title">
                            <i class="fas fa-user" style="color: ${ROLES[currentUser.role]?.color}"></i>
                            <span>Your Profile</span>
                        </div>
                    </div>
                    <div class="role-users">
                        <div class="user-card">
                            <div class="user-avatar" style="background: ${ROLES[currentUser.role]?.color}">
                                <i class="fas ${ROLES[currentUser.role]?.icon}"></i>
                            </div>
                            <div class="user-details">
                                <div class="user-name">${escapeHtml(currentUser.name)}</div>
                                <div class="user-email">${escapeHtml(currentUser.email)}</div>
                                <div class="user-uid"><i class="fas fa-id-badge"></i> UID: ${escapeHtml(currentUser.id || 'N/A')}</div>
                                <div class="user-meta">
                                    <span class="status-badge ${currentUser.status}">${currentUser.status}</span>
                                    <span class="role-badge" style="background: ${ROLES[currentUser.role]?.color}; color: white; padding: 2px 8px; border-radius: 10px; font-size: 11px;">
                                        ${ROLES[currentUser.role]?.name}
                                    </span>
                                </div>
                            </div>
                            <div class="user-actions">
                                <span class="current-user-badge">You</span>
                            </div>
                        </div>
                    </div>
                </div>
            ` : ''}
        </div>
        
        ${isFounder ? `</div>` : ''}
    `;
}

// ==================== TAB SWITCHING & FILTER FUNCTIONS ====================

// Switch between User Management tabs
function switchUserMgmtTab(tab) {
    window.userMgmtActiveTab = tab;
    
    const usersTab = document.getElementById('addUsersTab');
    const controlTab = document.getElementById('userControlTab');
    const tabUsers = document.getElementById('tabUsers');
    const tabControl = document.getElementById('tabControl');
    
    if (tab === 'users') {
        if (usersTab) usersTab.style.display = 'block';
        if (controlTab) controlTab.style.display = 'none';
        if (tabUsers) {
            tabUsers.style.background = '#6366f1';
            tabUsers.style.color = 'white';
        }
        if (tabControl) {
            tabControl.style.background = 'transparent';
            tabControl.style.color = '#64748b';
        }
    } else {
        if (usersTab) usersTab.style.display = 'none';
        if (controlTab) controlTab.style.display = 'block';
        if (tabUsers) {
            tabUsers.style.background = 'transparent';
            tabUsers.style.color = '#64748b';
        }
        if (tabControl) {
            tabControl.style.background = '#6366f1';
            tabControl.style.color = 'white';
        }
    }
}

// Toggle filter dropdown visibility
function toggleFilterDropdown() {
    const dropdown = document.getElementById('filterDropdown');
    if (dropdown) {
        dropdown.style.display = dropdown.style.display === 'none' ? 'block' : 'none';
    }
}

// Clear all filters
function clearFilters() {
    const roleFilter = document.getElementById('founderRoleFilter');
    const statusFilter = document.getElementById('founderStatusFilter');
    const searchInput = document.getElementById('founderUserSearch');
    
    if (roleFilter) roleFilter.value = '';
    if (statusFilter) statusFilter.value = '';
    if (searchInput) searchInput.value = '';
    
    // Re-apply filter (which will show all)
    filterFounderUserList('');
    
    // Close dropdown
    const dropdown = document.getElementById('filterDropdown');
    if (dropdown) dropdown.style.display = 'none';
}

// Close filter dropdown when clicking outside
document.addEventListener('click', function(e) {
    const dropdown = document.getElementById('filterDropdown');
    const filterBtn = e.target.closest('button');
    if (dropdown && dropdown.style.display === 'block') {
        if (!e.target.closest('#filterDropdown') && (!filterBtn || !filterBtn.onclick?.toString().includes('toggleFilterDropdown'))) {
            dropdown.style.display = 'none';
        }
    }
});

// Expose tab functions
window.switchUserMgmtTab = switchUserMgmtTab;
window.toggleFilterDropdown = toggleFilterDropdown;
window.clearFilters = clearFilters;

// ==================== ADD/EDIT USER MODAL ====================

// Highlight selected plan in add user modal and update feature preview
function highlightSelectedPlan(radio) {
    // Reset all plan option borders
    document.querySelectorAll('.plan-option').forEach(opt => {
        opt.style.borderColor = '#e2e8f0';
        opt.style.background = '#fff';
    });
    
    // Highlight the selected plan
    if (radio && radio.closest('.plan-option')) {
        const platformSettings = typeof getPlatformSettings === 'function' ? getPlatformSettings() : null;
        const plans = platformSettings?.plans || {
            personal: { color: '#64748b', features: ['dashboard', 'transactions'] },
            starter: { color: '#3b82f6', features: ['dashboard', 'pos', 'inventory', 'customers', 'bills', 'quotations', 'reports'] },
            professional: { color: '#10b981', features: ['all'] },
            enterprise: { color: '#7c3aed', features: ['all'] }
        };
        const planKey = radio.value;
        const plan = plans[planKey];
        const planColor = plan?.color || '#3b82f6';
        
        radio.closest('.plan-option').style.borderColor = planColor;
        radio.closest('.plan-option').style.background = planColor + '08';
        
        // Update feature preview
        const preview = document.getElementById('planFeaturePreview');
        if (preview && plan) {
            const featureNames = {
                'dashboard': 'Dashboard', 'transactions': 'Transactions', 'income': 'Income',
                'expenses': 'Expenses', 'reports': 'Reports', 'taxes': 'Taxes',
                'balance': 'Balance Sheet', 'monthly-reports': 'Monthly Reports',
                'ai-chatbot': 'AI Assistant', 'pos': 'POS', 'inventory': 'Inventory',
                'stock': 'Stock', 'orders': 'Orders', 'crm': 'CRM', 'customers': 'Customers',
                'suppliers': 'Suppliers', 'quotations': 'Quotations', 'projects': 'Projects',
                'payroll': 'Payroll', 'leave-attendance': 'Leave & Attendance', 'kpi': 'KPI',
                'einvoice': 'E-Invoice', 'branches': 'Multi-Branch', 'bills': 'Bills',
                'purchase-orders': 'Purchase Orders', 'delivery-orders': 'Delivery Orders',
                'employees': 'Employees', 'settings': 'Settings', 'users': 'User Management'
            };
            
            const planName = plan.name || planKey.charAt(0).toUpperCase() + planKey.slice(1);
            let featuresHTML = '';
            
            if (plan.features?.includes('all')) {
                featuresHTML = '<span style="background: #dcfce7; color: #166534; padding: 2px 8px; border-radius: 4px;">✓ All Features Included</span>';
            } else if (plan.features) {
                featuresHTML = plan.features.slice(0, 10).map(f => 
                    `<span style="background: #e2e8f0; padding: 2px 8px; border-radius: 4px;">${featureNames[f] || f}</span>`
                ).join('');
                if (plan.features.length > 10) {
                    featuresHTML += `<span style="background: #e2e8f0; padding: 2px 8px; border-radius: 4px;">+${plan.features.length - 10} more</span>`;
                }
            }
            
            preview.innerHTML = `
                <strong style="color: ${planColor};">${planName} Plan includes:</strong>
                <div style="margin-top: 5px; display: flex; flex-wrap: wrap; gap: 5px;">
                    ${featuresHTML}
                </div>
            `;
        }
        
        // Auto-select ERP module checkboxes based on plan features
        autoSelectModulesForPlan(planKey);
    }
}

// Auto-select ERP module checkboxes based on selected plan
function autoSelectModulesForPlan(planKey) {
    const platformSettings = typeof getPlatformSettings === 'function' ? getPlatformSettings() : null;
    const plan = platformSettings?.plans?.[planKey];
    
    if (!plan) return;
    
    const features = plan.features || [];
    const isAllFeatures = features.includes('all');
    
    // First, uncheck all module checkboxes
    document.querySelectorAll('#permissionsModules input[type="checkbox"]').forEach(cb => {
        cb.checked = false;
    });
    
    // Disable Full Access checkbox if not enterprise
    const fullAccessCb = document.getElementById('permFullAccess');
    if (fullAccessCb) {
        fullAccessCb.checked = isAllFeatures;
        
        // If all features, disable individual checkboxes
        if (isAllFeatures) {
            document.querySelectorAll('#permissionsModules input[type="checkbox"]').forEach(cb => {
                cb.checked = true;
                cb.disabled = true;
            });
        } else {
            // Enable individual checkboxes and select only plan features
            document.querySelectorAll('#permissionsModules input[type="checkbox"]').forEach(cb => {
                cb.disabled = false;
                // Check if this module is in the plan features
                if (features.includes(cb.value)) {
                    cb.checked = true;
                }
            });
        }
    }
    
    // Update category checkboxes and counts
    if (typeof ERP_MODULE_CATEGORIES !== 'undefined') {
        ERP_MODULE_CATEGORIES.forEach(cat => {
            if (typeof updateCategoryCount === 'function') {
                updateCategoryCount(cat.id);
            }
        });
    }
}

function showAddUserModal(roleId = 'staff') {
    console.log('showAddUserModal called with roleId:', roleId);
    
    // Founder has no limits - skip all limit checks
    const isFounder = window.currentUser?.role === 'founder';
    
    // Check user limit for staff/manager (not for business_admin which creates new tenants, not for founder)
    if (!isFounder && (roleId === 'staff' || roleId === 'manager')) {
        // Get current tenant user count
        const allUsers = JSON.parse(localStorage.getItem('ezcubic_users') || '[]');
        const currentTenantId = window.currentUser?.tenantId;
        const tenantUsers = allUsers.filter(u => u.tenantId === currentTenantId);
        const tenantUserCount = tenantUsers.length;
        
        // Get plan limits
        const platformSettings = typeof getPlatformSettings === 'function' ? getPlatformSettings() : null;
        const userPlan = window.currentUser?.plan || 'starter';
        const planLimits = platformSettings?.plans?.[userPlan]?.limits;
        const userLimit = planLimits?.users !== undefined ? planLimits.users : 3;
        
        console.log(`Add User Modal - Tenant: ${currentTenantId}, Users: ${tenantUserCount}, Limit: ${userLimit}, Plan: ${userPlan}`);
        
        // Check if limit reached (-1 means unlimited)
        if (userLimit !== -1 && tenantUserCount >= userLimit) {
            console.log('LIMIT REACHED - showing modal');
            // Show limit reached modal
            showUserLimitModal(userPlan, tenantUserCount, userLimit);
            return;
        }
    }
    
    const role = ROLES[roleId];
    
    // Get available plans from platform settings
    const platformSettings = typeof getPlatformSettings === 'function' ? getPlatformSettings() : null;
    const plans = platformSettings?.plans || {
        personal: { name: 'Personal', price: 0, color: '#64748b' },
        starter: { name: 'Starter', price: 49, color: '#3b82f6' },
        professional: { name: 'Professional', price: 149, color: '#8b5cf6' },
        enterprise: { name: 'Enterprise', price: 399, color: '#f59e0b' }
    };
    
    // Show plan selector only for business_admin role
    const showPlanSelector = roleId === 'business_admin';
    // Show ERP modules only for staff/manager roles (not for business_admin)
    const showERPModules = roleId === 'staff' || roleId === 'manager';
    
    // Get the Business Owner's plan features to limit what staff/manager can access
    const ownerPlan = window.currentUser?.plan || 'starter';
    const ownerPlanConfig = platformSettings?.plans?.[ownerPlan] || plans[ownerPlan];
    const ownerFeatures = ownerPlanConfig?.features || [];
    const hasAllFeatures = ownerFeatures.includes('all');
    
    // Filter ERP_MODULE_CATEGORIES based on owner's plan
    const filteredCategories = ERP_MODULE_CATEGORIES.map(category => {
        // Filter modules that are in the owner's plan
        const allowedModules = category.modules.filter(module => {
            return hasAllFeatures || ownerFeatures.includes(module.id);
        });
        
        return {
            ...category,
            modules: allowedModules
        };
    }).filter(category => category.modules.length > 0); // Only show categories with available modules
    
    // Calculate total available modules for display
    const totalAvailableModules = filteredCategories.reduce((sum, cat) => sum + cat.modules.length, 0);
    
    const modalHTML = `
        <div class="modal show" id="addUserModal">
            <div class="modal-content" style="max-width: ${showERPModules ? '650px' : '550px'};">
                <div class="modal-header">
                    <h3 class="modal-title">
                        <i class="fas fa-user-plus"></i> Add New ${role.name}
                    </h3>
                    <button class="modal-close" onclick="closeModal('addUserModal')">&times;</button>
                </div>
                <form id="addUserForm" onsubmit="saveNewUser(event)" autocomplete="off">
                    <input type="hidden" id="newUserRole" value="${roleId}">
                    
                    <div class="form-grid">
                        <div class="form-group">
                            <label class="form-label">Full Name *</label>
                            <input type="text" id="newUserName" class="form-control" required placeholder="Enter full name">
                        </div>
                        <div class="form-group">
                            <label class="form-label">Email *</label>
                            <input type="email" id="newUserEmail" class="form-control" required placeholder="Enter email address">
                        </div>
                        <div class="form-group">
                            <label class="form-label">Password *</label>
                            <input type="password" id="newUserPassword" class="form-control" required placeholder="Enter password" minlength="6" autocomplete="new-password">
                        </div>
                        <div class="form-group">
                            <label class="form-label">Confirm Password *</label>
                            <input type="password" id="newUserPasswordConfirm" class="form-control" required placeholder="Confirm password" autocomplete="new-password">
                        </div>
                    </div>
                    
                    ${showPlanSelector ? `
                    <div class="form-group" style="margin-bottom: 20px;">
                        <label class="form-label"><i class="fas fa-box"></i> Subscription Plan *</label>
                        <p style="font-size: 12px; color: #64748b; margin-bottom: 10px;">
                            Select the subscription plan for this business. Access permissions are automatically set based on the plan.
                        </p>
                        <div class="plan-selector" style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px;">
                            ${Object.entries(plans).filter(([planId]) => planId !== 'personal').map(([planId, plan]) => {
                                const featureCount = plan.features?.includes('all') ? 'All Features' : `${plan.features?.length || 0} modules`;
                                return `
                                <label class="plan-option" style="
                                    border: 2px solid ${planId === 'starter' ? plan.color : '#e2e8f0'};
                                    border-radius: 10px;
                                    padding: 12px;
                                    cursor: pointer;
                                    transition: all 0.2s;
                                    display: flex;
                                    flex-direction: column;
                                    gap: 6px;
                                    background: ${planId === 'starter' ? plan.color + '08' : 'white'};
                                " onmouseover="this.style.borderColor='${plan.color}'" 
                                   onmouseout="if(!this.querySelector('input').checked) this.style.borderColor='#e2e8f0'">
                                    <div style="display: flex; align-items: center; gap: 10px;">
                                        <input type="radio" name="userPlan" value="${planId}" 
                                            ${planId === 'starter' ? 'checked' : ''}
                                            onchange="highlightSelectedPlan(this)"
                                            style="width: 18px; height: 18px;">
                                        <div style="flex: 1;">
                                            <div style="font-weight: 600; color: ${plan.color};">${plan.name}</div>
                                            <div style="font-size: 12px; color: #64748b;">
                                                ${plan.price === 0 ? 'Free' : `RM${plan.price}/mo`}
                                            </div>
                                        </div>
                                        ${planId === 'enterprise' ? '<i class="fas fa-crown" style="color: #f59e0b;"></i>' : ''}
                                        ${planId === 'professional' ? '<i class="fas fa-star" style="color: #10b981;"></i>' : ''}
                                    </div>
                                    <div style="font-size: 10px; color: #94a3b8; padding-left: 28px;">
                                        ${featureCount}
                                    </div>
                                </label>
                            `}).join('')}
                        </div>
                        <div id="planFeaturePreview" style="margin-top: 10px; padding: 10px; background: #f8fafc; border-radius: 8px; font-size: 11px; color: #64748b;">
                            <strong style="color: #334155;">Starter Plan includes:</strong>
                            <div style="margin-top: 5px; display: flex; flex-wrap: wrap; gap: 5px;">
                                <span style="background: #e2e8f0; padding: 2px 8px; border-radius: 4px;">Dashboard</span>
                                <span style="background: #e2e8f0; padding: 2px 8px; border-radius: 4px;">POS</span>
                                <span style="background: #e2e8f0; padding: 2px 8px; border-radius: 4px;">Inventory</span>
                                <span style="background: #e2e8f0; padding: 2px 8px; border-radius: 4px;">Customers</span>
                                <span style="background: #e2e8f0; padding: 2px 8px; border-radius: 4px;">Bills</span>
                                <span style="background: #e2e8f0; padding: 2px 8px; border-radius: 4px;">Quotations</span>
                                <span style="background: #e2e8f0; padding: 2px 8px; border-radius: 4px;">Reports</span>
                            </div>
                        </div>
                    </div>
                    ` : ''}
                    
                    ${showERPModules ? `
                    <div class="form-group">
                        <label class="form-label">
                            <i class="fas fa-key"></i> Module Access Permissions
                            <span style="font-weight: normal; font-size: 12px; color: #64748b; display: block; margin-top: 4px;">
                                Based on your <strong style="color: ${ownerPlanConfig?.color || '#2563eb'}">${ownerPlanConfig?.name || 'Starter'}</strong> plan (${totalAvailableModules} modules available)
                            </span>
                        </label>
                        <div class="permissions-grid">
                            <label class="permission-item full-access" style="margin-bottom: 12px; background: linear-gradient(135deg, #10b98115, #10b98105); border: 1px solid #10b981; border-radius: 8px; padding: 10px;">
                                <input type="checkbox" id="permFullAccess" onchange="toggleFullAccess(this)">
                                <span><i class="fas fa-shield-alt" style="color: #10b981;"></i> Full Access (All ${totalAvailableModules} Available Modules)</span>
                            </label>
                            <div class="permissions-categories" id="permissionsModules" style="max-height: 350px; overflow-y: auto;">
                                ${filteredCategories.map(category => `
                                    <div class="permission-category" style="margin-bottom: 10px; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
                                        <div class="category-header" onclick="togglePermissionCategory('${category.id}')" style="
                                            background: linear-gradient(135deg, ${category.color}15, ${category.color}05);
                                            padding: 10px 12px;
                                            cursor: pointer;
                                            display: flex;
                                            align-items: center;
                                            justify-content: space-between;
                                            border-bottom: 1px solid #e2e8f0;
                                        ">
                                            <label style="display: flex; align-items: center; gap: 10px; cursor: pointer; flex: 1;">
                                                <input type="checkbox" class="category-checkbox" data-category="${category.id}" 
                                                    onchange="toggleCategoryModules('${category.id}', this.checked)"
                                                    style="width: 16px; height: 16px;">
                                                <i class="fas ${category.icon}" style="color: ${category.color}; width: 18px;"></i>
                                                <span style="font-weight: 600; color: #1e293b;">${category.name}</span>
                                                <span class="category-count" id="count-${category.id}" style="
                                                    background: ${category.color};
                                                    color: white;
                                                    font-size: 10px;
                                                    padding: 2px 6px;
                                                    border-radius: 10px;
                                                ">0/${category.modules.length}</span>
                                            </label>
                                            <i class="fas fa-chevron-down category-toggle" id="toggle-${category.id}" style="color: #64748b; transition: transform 0.2s;"></i>
                                        </div>
                                        <div class="category-modules" id="modules-${category.id}" style="padding: 8px 12px; display: none; background: #fafafa;">
                                            ${category.modules.map(module => `
                                                <label class="permission-item" style="display: flex; align-items: center; gap: 8px; padding: 6px 0; cursor: pointer;">
                                                    <input type="checkbox" name="permissions" value="${module.id}" 
                                                        data-category="${category.id}"
                                                        onchange="updateCategoryCount('${category.id}')"
                                                        ${role.defaultPermissions.includes(module.id) || role.defaultPermissions.includes('all') ? 'checked' : ''}>
                                                    <i class="fas ${module.icon}" style="color: #64748b; width: 16px; font-size: 12px;"></i>
                                                    <span style="font-size: 13px; color: #334155;">${module.name}</span>
                                                </label>
                                            `).join('')}
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                            ${!hasAllFeatures ? `
                            <div style="margin-top: 10px; padding: 10px; background: #fef3c7; border: 1px solid #fcd34d; border-radius: 8px; font-size: 12px; color: #92400e;">
                                <i class="fas fa-info-circle"></i> 
                                <strong>Note:</strong> Only modules included in your ${ownerPlanConfig?.name || 'Starter'} plan are shown. 
                                <a href="#" onclick="showNotification('Contact support to upgrade your plan for more features', 'info'); return false;" style="color: #2563eb; text-decoration: underline;">Upgrade</a> for more modules.
                            </div>
                            ` : ''}
                        </div>
                    </div>
                    ` : ''}
                    
                    <div class="modal-footer">
                        <button type="button" class="btn-secondary" onclick="closeModal('addUserModal')">Cancel</button>
                        <button type="submit" class="btn-primary">
                            <i class="fas fa-save"></i> Create User
                        </button>
                    </div>
                </form>
            </div>
        </div>
    `;
    
    document.getElementById('addUserModal')?.remove();
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // Initialize category counts after modal is added (use filtered categories)
    setTimeout(() => {
        if (showERPModules) {
            filteredCategories.forEach(cat => updateCategoryCount(cat.id));
        }
        
        // Highlight initially selected plan
        if (showPlanSelector) {
            const checkedPlan = document.querySelector('input[name="userPlan"]:checked');
            if (checkedPlan) highlightSelectedPlan(checkedPlan);
        }
    }, 50);
}

// Toggle permission category expand/collapse
function togglePermissionCategory(categoryId) {
    const modules = document.getElementById(`modules-${categoryId}`);
    const toggle = document.getElementById(`toggle-${categoryId}`);
    
    if (modules.style.display === 'none') {
        modules.style.display = 'block';
        toggle.style.transform = 'rotate(180deg)';
    } else {
        modules.style.display = 'none';
        toggle.style.transform = 'rotate(0deg)';
    }
}

// Toggle all modules in a category
function toggleCategoryModules(categoryId, checked) {
    const checkboxes = document.querySelectorAll(`input[data-category="${categoryId}"]`);
    checkboxes.forEach(cb => {
        if (!cb.disabled) {
            cb.checked = checked;
        }
    });
    updateCategoryCount(categoryId);
}

// Update category count badge
function updateCategoryCount(categoryId) {
    const checkboxes = document.querySelectorAll(`input[data-category="${categoryId}"]`);
    const total = checkboxes.length;
    const checked = Array.from(checkboxes).filter(cb => cb.checked).length;
    
    const countEl = document.getElementById(`count-${categoryId}`);
    if (countEl) {
        countEl.textContent = `${checked}/${total}`;
    }
    
    // Update category checkbox state
    const categoryCheckbox = document.querySelector(`input.category-checkbox[data-category="${categoryId}"]`);
    if (categoryCheckbox) {
        categoryCheckbox.checked = checked === total && total > 0;
        categoryCheckbox.indeterminate = checked > 0 && checked < total;
    }
}

function toggleFullAccess(checkbox) {
    const modules = document.querySelectorAll('#permissionsModules input[type="checkbox"]');
    modules.forEach(cb => {
        cb.checked = checkbox.checked;
        cb.disabled = checkbox.checked;
    });
    
    // Update all category counts
    ERP_MODULE_CATEGORIES.forEach(cat => updateCategoryCount(cat.id));
}

async function saveNewUser(event) {
    event.preventDefault();
    
    const name = document.getElementById('newUserName').value.trim();
    const email = document.getElementById('newUserEmail').value.trim();
    const password = document.getElementById('newUserPassword').value;
    const passwordConfirm = document.getElementById('newUserPasswordConfirm').value;
    const role = document.getElementById('newUserRole').value;
    
    // Founder has no limits - skip all limit checks
    const isFounder = currentUser?.role === 'founder';
    
    // Check user limit for Staff/Manager roles (they belong to current tenant) - skip for founder
    if (!isFounder && (role === 'staff' || role === 'manager') && currentUser && currentUser.tenantId) {
        // Count existing users in this tenant
        const allUsers = JSON.parse(localStorage.getItem('ezcubic_users') || '[]');
        const tenantUsers = allUsers.filter(u => u.tenantId === currentUser.tenantId);
        const tenantUserCount = tenantUsers.length;
        
        // Get plan limits
        const platformSettings = typeof getPlatformSettings === 'function' ? getPlatformSettings() : null;
        const userPlan = currentUser.plan || 'starter';
        const planLimits = platformSettings?.plans?.[userPlan]?.limits;
        const userLimit = planLimits?.users || 3; // Default to 3 if not found
        
        console.log(`User limit check: ${tenantUserCount} users, limit: ${userLimit}`);
        
        // Check if limit reached (-1 means unlimited)
        if (userLimit !== -1 && tenantUserCount >= userLimit) {
            // Close the add user modal first
            closeModal('addUserModal');
            document.getElementById('addUserModal')?.remove();
            
            // Show limit modal with alert
            showUserLimitModal(userPlan, tenantUserCount, userLimit);
            return;
        }
    }
    
    // Validation
    if (password !== passwordConfirm) {
        showToast('Passwords do not match', 'error');
        return;
    }
    
    if (users.find(u => u.email.toLowerCase() === email.toLowerCase())) {
        showToast('Email already exists', 'error');
        return;
    }
    
    // Get permissions based on role
    let permissions = [];
    
    // For Staff/Manager: Get permissions from checkboxes
    if (role === 'staff' || role === 'manager') {
        const fullAccessEl = document.getElementById('permFullAccess');
        const fullAccess = fullAccessEl && fullAccessEl.checked;
        if (fullAccess) {
            permissions = ['all'];
        } else {
            permissions = Array.from(document.querySelectorAll('#permissionsModules input:checked'))
                .map(cb => cb.value);
        }
    }
    
    // Generate User ID based on role
    let userId;
    if ((role === 'staff' || role === 'manager') && currentUser && currentUser.id) {
        // For staff/manager: Use business owner's UID + alphabet suffix
        const ownerBaseId = currentUser.id.replace(/[A-Z]$/, ''); // Remove existing suffix if any
        const existingUsers = users.filter(u => u.id.startsWith(ownerBaseId) && u.id !== currentUser.id);
        
        // Find next available alphabet (A, B, C, ..., Z, AA, AB, ...)
        const usedSuffixes = existingUsers.map(u => u.id.replace(ownerBaseId, ''));
        let suffix = 'A';
        while (usedSuffixes.includes(suffix)) {
            // Increment suffix: A->B, Z->AA, AZ->BA, etc.
            if (suffix === 'Z') {
                suffix = 'AA';
            } else if (suffix.length === 1) {
                suffix = String.fromCharCode(suffix.charCodeAt(0) + 1);
            } else {
                // Multi-char suffix
                const lastChar = suffix.slice(-1);
                const prefix = suffix.slice(0, -1);
                if (lastChar === 'Z') {
                    suffix = String.fromCharCode(prefix.charCodeAt(prefix.length - 1) + 1) + 'A';
                } else {
                    suffix = prefix + String.fromCharCode(lastChar.charCodeAt(0) + 1);
                }
            }
        }
        userId = ownerBaseId + suffix;
    } else {
        // For business admin, personal, etc.: Generate new base ID
        userId = 'user_' + Date.now();
    }
    
    // Create user with hashed password
    const hashedPw = await hashPassword(password);
    const newUser = {
        id: userId,
        email: email,
        password: hashedPw, // Securely hashed
        name: name,
        role: role,
        status: 'active',
        permissions: permissions,
        createdAt: new Date().toISOString(),
        createdBy: currentUser.id
    };
    
    // If Business Admin, auto-create a tenant for them
    if (role === 'business_admin' && typeof createTenant === 'function') {
        const tenantId = createTenant(newUser.id, name + "'s Business");
        newUser.tenantId = tenantId;
        
        // Get selected plan from plan selector
        const selectedPlanRadio = document.querySelector('input[name="userPlan"]:checked');
        newUser.plan = selectedPlanRadio ? selectedPlanRadio.value : 'starter';
        
        // Auto-assign permissions based on plan features from Platform Control
        const platformSettings = typeof getPlatformSettings === 'function' ? getPlatformSettings() : null;
        const selectedPlan = platformSettings?.plans?.[newUser.plan];
        if (selectedPlan && selectedPlan.features) {
            newUser.permissions = selectedPlan.features.includes('all') ? ['all'] : [...selectedPlan.features];
        } else if (typeof getPermissionsForPlan === 'function') {
            newUser.permissions = getPermissionsForPlan(newUser.plan);
        }
        
        // Create subscription for the tenant
        if (typeof createSubscription === 'function') {
            createSubscription(tenantId, newUser.plan, platformSettings?.enableTrials || false);
        }
    }
    
    // If Personal user, assign personal plan and permissions
    if (role === 'personal') {
        newUser.plan = 'personal';
        newUser.tenantId = 'personal_' + Date.now(); // Unique personal space
        
        // Auto-assign personal plan permissions from Platform Control
        const platformSettings = typeof getPlatformSettings === 'function' ? getPlatformSettings() : null;
        const personalPlan = platformSettings?.plans?.personal;
        if (personalPlan && personalPlan.features) {
            newUser.permissions = [...personalPlan.features];
        } else if (typeof getPermissionsForPlan === 'function') {
            newUser.permissions = getPermissionsForPlan('personal');
        } else {
            // Default personal features
            newUser.permissions = ['dashboard', 'transactions', 'income', 'expenses', 'reports', 'taxes', 'balance', 'monthly-reports', 'ai-chatbot', 'settings'];
        }
        
        // Initialize empty tenant data for personal user
        if (typeof initializeEmptyTenantData === 'function') {
            initializeEmptyTenantData(newUser.tenantId, newUser.name);
        }
    }
    
    // If Manager or Staff, inherit tenant from creator (if creator is Business Admin)
    if ((role === 'manager' || role === 'staff') && currentUser.tenantId) {
        newUser.tenantId = currentUser.tenantId;
        console.log(`Staff/Manager created with tenantId: ${newUser.tenantId} (inherited from ${currentUser.email})`);
        
        // Also inherit the plan for reference
        newUser.plan = currentUser.plan || 'starter';
        
        // Auto-assign permissions based on Business Admin's plan if none were selected
        if (permissions.length === 0 || (permissions.length > 0 && !permissions.includes('all'))) {
            const platformSettings = typeof getPlatformSettings === 'function' ? getPlatformSettings() : null;
            const creatorPlan = currentUser.plan || 'starter';
            const planFeatures = platformSettings?.plans?.[creatorPlan]?.features;
            
            if (planFeatures) {
                // Use selected permissions but cap them to plan's allowed features
                if (permissions.length === 0) {
                    // No permissions selected, give all plan features
                    newUser.permissions = planFeatures.includes('all') ? ['all'] : [...planFeatures];
                } else {
                    // Filter selected permissions to only what plan allows
                    if (planFeatures.includes('all')) {
                        newUser.permissions = permissions;
                    } else {
                        newUser.permissions = permissions.filter(p => planFeatures.includes(p));
                    }
                }
            }
        }
    }
    
    users.push(newUser);
    saveUsers();
    
    closeModal('addUserModal');
    renderUserManagement();
    
    // Show success message with plan info for business_admin
    if (role === 'business_admin' && newUser.plan) {
        const planNames = { personal: 'Personal', starter: 'Starter', professional: 'Professional', enterprise: 'Enterprise' };
        showToast(`${ROLES[role].name} created with ${planNames[newUser.plan] || newUser.plan} plan!`, 'success');
    } else {
        showToast(`${ROLES[role].name} created successfully!`, 'success');
    }
}

function editUser(userId) {
    const user = users.find(u => u.id === userId);
    if (!user) return;
    
    const role = ROLES[user.role];
    
    // Get owner's plan features for Staff/Manager editing
    let filteredModules = ERP_MODULES;
    let ownerPlanName = '';
    let planFeatures = [];
    
    // If editing Staff/Manager, filter modules based on owner's plan
    if (['staff', 'manager'].includes(user.role) && user.tenantId) {
        const allUsers = JSON.parse(localStorage.getItem('ezcubic_users') || '[]');
        const owner = allUsers.find(u => 
            u.tenantId === user.tenantId && 
            (u.role === 'business_admin' || u.role === 'founder')
        );
        
        if (owner) {
            const platformSettings = typeof getPlatformSettings === 'function' ? getPlatformSettings() : null;
            const ownerPlan = owner.plan || 'starter';
            ownerPlanName = platformSettings?.plans?.[ownerPlan]?.name || ownerPlan;
            const ownerFeatures = platformSettings?.plans?.[ownerPlan]?.features || [];
            planFeatures = ownerFeatures;
            
            // If owner has 'all', show all modules
            if (!ownerFeatures.includes('all')) {
                filteredModules = ERP_MODULES.filter(m => ownerFeatures.includes(m.id));
            }
            
            // AUTO-SYNC: Add any new plan features to staff/manager permissions
            if (!user.permissions) user.permissions = [];
            if (!user.permissions.includes('all')) {
                const currentPerms = [...user.permissions];
                if (ownerFeatures.includes('all')) {
                    // Owner has all - give staff all filtered modules
                    user.permissions = [...new Set([...currentPerms, ...filteredModules.map(m => m.id)])];
                } else {
                    // Add new features from owner's plan that staff doesn't have
                    user.permissions = [...new Set([...currentPerms, ...ownerFeatures])];
                }
                // Save if changed
                if (user.permissions.length !== currentPerms.length) {
                    user.updatedAt = new Date().toISOString();
                    saveUsers();
                    console.log(`✓ Auto-synced ${user.role} ${user.email} with new plan features`);
                }
            }
        }
    }
    // If editing Business Admin, filter based on their own plan
    else if (user.role === 'business_admin' && user.plan) {
        const platformSettings = typeof getPlatformSettings === 'function' ? getPlatformSettings() : null;
        ownerPlanName = platformSettings?.plans?.[user.plan]?.name || user.plan;
        planFeatures = platformSettings?.plans?.[user.plan]?.features || [];
        
        if (!planFeatures.includes('all')) {
            filteredModules = ERP_MODULES.filter(m => planFeatures.includes(m.id));
        }
        
        // AUTO-SYNC: Update Business Admin permissions to match their plan
        if (!user.permissions) user.permissions = [];
        if (!user.permissions.includes('all')) {
            const currentPerms = [...user.permissions];
            if (planFeatures.includes('all')) {
                user.permissions = ['all'];
            } else {
                user.permissions = [...planFeatures];
            }
            // Save if changed
            if (JSON.stringify(currentPerms.sort()) !== JSON.stringify(user.permissions.sort())) {
                user.updatedAt = new Date().toISOString();
                saveUsers();
                console.log(`✓ Auto-synced Business Admin ${user.email} with plan features`);
            }
        }
    }
    
    const planNote = ownerPlanName ? `<small style="color: #64748b; display: block; margin-top: 5px;">
        <i class="fas fa-info-circle"></i> Modules available based on ${ownerPlanName} plan (${filteredModules.length} modules)
    </small>` : '';
    
    const modalHTML = `
        <div class="modal show" id="editUserModal">
            <div class="modal-content" style="max-width: 550px;">
                <div class="modal-header">
                    <h3 class="modal-title">
                        <i class="fas fa-user-edit"></i> Edit User
                    </h3>
                    <button class="modal-close" onclick="closeModal('editUserModal')">&times;</button>
                </div>
                <form id="editUserForm" onsubmit="updateUser(event, '${userId}')">
                    <div class="form-grid">
                        <div class="form-group">
                            <label class="form-label">Full Name *</label>
                            <input type="text" id="editUserName" class="form-control" required value="${escapeHtml(user.name)}">
                        </div>
                        <div class="form-group">
                            <label class="form-label">Email *</label>
                            <input type="email" id="editUserEmail" class="form-control" required value="${escapeHtml(user.email)}">
                        </div>
                        <div class="form-group">
                            <label class="form-label">New Password (leave blank to keep)</label>
                            <input type="password" id="editUserPassword" class="form-control" placeholder="Enter new password" minlength="6">
                        </div>
                        <div class="form-group">
                            <label class="form-label">Role</label>
                            <select id="editUserRole" class="form-control" ${user.role === 'founder' ? 'disabled' : ''}>
                                ${Object.entries(ROLES).filter(([roleId]) => 
                                    roleId !== 'founder' && (canManageRole(roleId) || roleId === user.role)
                                ).map(([roleId, r]) => `
                                    <option value="${roleId}" ${roleId === user.role ? 'selected' : ''}>${r.name}</option>
                                `).join('')}
                            </select>
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <label class="form-label">ERP Module Access</label>
                        ${planNote}
                        <div class="permissions-grid">
                            <label class="permission-item full-access">
                                <input type="checkbox" id="editPermFullAccess" onchange="toggleFullAccess(this)" 
                                    ${user.permissions.includes('all') ? 'checked' : ''}>
                                <span><i class="fas fa-shield-alt"></i> Full Access (All Available Modules)</span>
                            </label>
                            <div class="permissions-modules" id="editPermissionsModules">
                                ${filteredModules.map(module => `
                                    <label class="permission-item">
                                        <input type="checkbox" name="editPermissions" value="${module.id}" 
                                            ${user.permissions.includes('all') || user.permissions.includes(module.id) ? 'checked' : ''}
                                            ${user.permissions.includes('all') ? 'disabled' : ''}>
                                        <span><i class="fas ${module.icon}"></i> ${module.name}</span>
                                    </label>
                                `).join('')}
                            </div>
                        </div>
                    </div>
                    
                    <div class="modal-footer">
                        <button type="button" class="btn-secondary" onclick="closeModal('editUserModal')">Cancel</button>
                        <button type="submit" class="btn-primary">
                            <i class="fas fa-save"></i> Update User
                        </button>
                    </div>
                </form>
            </div>
        </div>
    `;
    
    document.getElementById('editUserModal')?.remove();
    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

function updateUser(event, userId) {
    event.preventDefault();
    
    const userIndex = users.findIndex(u => u.id === userId);
    if (userIndex === -1) return;
    
    const name = document.getElementById('editUserName').value.trim();
    const email = document.getElementById('editUserEmail').value.trim();
    const password = document.getElementById('editUserPassword').value;
    const role = document.getElementById('editUserRole').value;
    
    // Check email uniqueness
    if (users.find(u => u.email.toLowerCase() === email.toLowerCase() && u.id !== userId)) {
        showToast('Email already exists', 'error');
        return;
    }
    
    // Get permissions
    const fullAccess = document.getElementById('editPermFullAccess').checked;
    let permissions = [];
    if (fullAccess) {
        permissions = ['all'];
    } else {
        permissions = Array.from(document.querySelectorAll('#editPermissionsModules input:checked'))
            .map(cb => cb.value);
    }
    
    // Update user
    users[userIndex].name = name;
    users[userIndex].email = email;
    users[userIndex].role = role;
    users[userIndex].permissions = permissions;
    users[userIndex].updatedAt = new Date().toISOString();
    
    if (password) {
        users[userIndex].password = password;
    }
    
    saveUsers();
    
    closeModal('editUserModal');
    renderUserManagement();
    showToast('User updated successfully!', 'success');
}

function toggleUserStatus(userId) {
    const user = users.find(u => u.id === userId);
    if (!user || user.role === 'founder') return;
    
    user.status = user.status === 'active' ? 'inactive' : 'active';
    user.updatedAt = new Date().toISOString();
    
    saveUsers();
    renderUserManagement();
    showToast(`User ${user.status === 'active' ? 'activated' : 'deactivated'}`, 'success');
}

function deleteUser(userId) {
    const user = users.find(u => u.id === userId);
    if (!user || user.role === 'founder') return;
    
    if (confirm(`Are you sure you want to delete "${user.name}"?\n\nThis action cannot be undone.`)) {
        users = users.filter(u => u.id !== userId);
        saveUsers();
        renderUserManagement();
        showToast('User deleted', 'info');
    }
}

// ==================== GUEST PREVIEW MODE ====================
let isGuestMode = false;

function applyGuestPreviewMode() {
    isGuestMode = true;
    
    // Guest preview - only show BASIC features, hide powerful tools from competitors
    // Show: Dashboard only (with limited view)
    // Hide: All business tools, reports, AI, etc.
    
    document.querySelectorAll('.nav-btn').forEach(btn => {
        const section = btn.getAttribute('onclick')?.match(/showSection\('([^']+)'\)/)?.[1];
        if (section) {
            // Only show Dashboard for guests - hide everything else
            btn.style.display = section === 'dashboard' ? '' : 'none';
        }
    });
    
    // Hide all nav separators
    document.querySelectorAll('.nav-separator').forEach(sep => {
        sep.style.display = 'none';
    });
    
    // Hide platform admin nav (remove visible class to keep them hidden)
    const platformAdminNav = document.getElementById('platformAdminNav');
    const userManagementNav = document.getElementById('userManagementNav');
    const platformControlNav = document.getElementById('platformControlNav');
    const tenantSelector = document.getElementById('tenantSelector');
    
    if (platformAdminNav) platformAdminNav.classList.remove('visible');
    if (userManagementNav) userManagementNav.classList.remove('visible');
    if (platformControlNav) platformControlNav.classList.remove('visible');
    if (tenantSelector) tenantSelector.style.display = 'none';
    
    // Show guest badge with feature teaser
    showGuestBadge();
    
    // Make everything view-only
    applyViewOnlyMode();
}

// Apply view-only mode for guests - disable all inputs and buttons
function applyViewOnlyMode() {
    // Add overlay style to main content
    const style = document.createElement('style');
    style.id = 'guestViewOnlyStyle';
    style.textContent = `
        /* Disable all inputs, buttons, and interactive elements for guests */
        .main-content input:not(.guest-allowed),
        .main-content textarea:not(.guest-allowed),
        .main-content select:not(.guest-allowed),
        .main-content button:not(.guest-allowed):not(.nav-btn),
        .main-content .btn-primary:not(.guest-allowed),
        .main-content .btn-secondary:not(.guest-allowed),
        .main-content .btn-danger:not(.guest-allowed),
        .main-content [onclick]:not(.nav-btn):not(.guest-allowed) {
            pointer-events: none !important;
            opacity: 0.5 !important;
            cursor: not-allowed !important;
        }
        
        /* View-only banner */
        .view-only-banner {
            background: linear-gradient(135deg, #f59e0b, #d97706);
            color: white;
            padding: 10px 20px;
            text-align: center;
            font-size: 13px;
            font-weight: 500;
            position: sticky;
            top: 0;
            z-index: 100;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 15px;
        }
        
        .view-only-banner button {
            pointer-events: auto !important;
            opacity: 1 !important;
            cursor: pointer !important;
            background: white;
            color: #d97706;
            border: none;
            padding: 6px 16px;
            border-radius: 6px;
            font-weight: 600;
            font-size: 12px;
        }
        
        .view-only-banner button:hover {
            background: #fef3c7;
        }
    `;
    document.head.appendChild(style);
    
    // Add view-only banner at top of main content
    const mainContent = document.querySelector('.main-content');
    if (mainContent) {
        const banner = document.createElement('div');
        banner.id = 'viewOnlyBanner';
        banner.className = 'view-only-banner';
        banner.innerHTML = `
            <i class="fas fa-lock"></i>
            <span><strong>Preview Mode</strong> - Create a free account to unlock all features</span>
            <button onclick="showFreeRegistrationModal()" class="guest-allowed">
                <i class="fas fa-unlock"></i> Get Started Free
            </button>
            <button onclick="showLoginPage()" class="guest-allowed" style="background: transparent; color: white; border: 1px solid white;">
                Login
            </button>
        `;
        mainContent.prepend(banner);
    }
}

// Remove view-only mode when logged in
function removeViewOnlyMode() {
    const style = document.getElementById('guestViewOnlyStyle');
    if (style) style.remove();
    
    const banner = document.getElementById('viewOnlyBanner');
    if (banner) banner.remove();
    
    const guestBadge = document.getElementById('guestModeBadge');
    if (guestBadge) guestBadge.remove();
}

function showGuestBadge() {
    // Remove existing badge
    const existingBadge = document.getElementById('guestModeBadge');
    if (existingBadge) existingBadge.remove();
    
    // Add guest badge to sidebar
    const sidebar = document.querySelector('.nav-panel');
    if (sidebar) {
        const badge = document.createElement('div');
        badge.id = 'guestModeBadge';
        badge.innerHTML = `
            <div style="
                background: linear-gradient(135deg, #1e293b, #334155);
                color: white;
                padding: 15px;
                margin: 10px;
                border-radius: 12px;
                text-align: center;
                font-size: 12px;
            ">
                <i class="fas fa-lock" style="font-size: 24px; margin-bottom: 8px; color: #f59e0b;"></i>
                <div style="font-weight: 600; margin-bottom: 5px; font-size: 14px;">Unlock Full Access</div>
                <div style="opacity: 0.8; font-size: 11px; margin-bottom: 12px; line-height: 1.4;">
                    Register free to access:<br>
                    • Finance & Accounting<br>
                    • Reports & Analytics<br>
                    • And more features...
                </div>
                <button onclick="showFreeRegistrationModal()" style="
                    background: linear-gradient(135deg, #10b981, #059669);
                    color: white;
                    border: none;
                    padding: 10px 16px;
                    border-radius: 8px;
                    cursor: pointer;
                    font-weight: 600;
                    font-size: 12px;
                    width: 100%;
                    margin-bottom: 8px;
                ">
                    <i class="fas fa-user-plus"></i> Register Free
                </button>
                <button onclick="showLoginPage()" style="
                    background: transparent;
                    color: #94a3b8;
                    border: 1px solid #475569;
                    padding: 8px 16px;
                    border-radius: 8px;
                    cursor: pointer;
                    font-weight: 500;
                    font-size: 11px;
                    width: 100%;
                ">
                    Already have account? Login
                </button>
            </div>
        `;
        
        // Insert after nav header or at top
        const navHeader = sidebar.querySelector('.sidebar-header');
        if (navHeader) {
            navHeader.after(badge);
        } else {
            sidebar.prepend(badge);
        }
    }
}

function showFreeRegistrationModal() {
    const existingModal = document.getElementById('freeRegisterModal');
    if (existingModal) existingModal.remove();
    
    const modalHTML = `
        <div class="modal show" id="freeRegisterModal" style="z-index: 9999;">
            <div class="modal-content" style="max-width: 450px;">
                <div class="modal-header" style="background: linear-gradient(135deg, #10b981, #059669); color: white; text-align: center; padding: 25px;">
                    <h3 style="margin: 0; font-size: 20px;">
                        <i class="fas fa-gift" style="margin-right: 8px;"></i> Create Free Account
                    </h3>
                    <p style="margin: 8px 0 0; opacity: 0.9; font-size: 13px;">Start tracking your finances for free</p>
                    <button class="modal-close" onclick="closeFreeRegisterModal()" style="position: absolute; top: 15px; right: 15px; background: none; border: none; color: white; font-size: 20px; cursor: pointer;">&times;</button>
                </div>
                <form id="freeRegisterForm" onsubmit="handleFreeRegistration(event)" style="padding: 20px;">
                    <div class="form-group">
                        <label class="form-label">Full Name *</label>
                        <input type="text" id="regName" class="form-control" required placeholder="Enter your full name">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Email *</label>
                        <input type="email" id="regEmail" class="form-control" required placeholder="Enter your email">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Password *</label>
                        <input type="password" id="regPassword" class="form-control" required placeholder="Create a password" minlength="6">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Confirm Password *</label>
                        <input type="password" id="regPasswordConfirm" class="form-control" required placeholder="Confirm your password">
                    </div>
                    
                    <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 12px; margin: 15px 0;">
                        <div style="font-weight: 600; color: #166534; margin-bottom: 8px;">
                            <i class="fas fa-check-circle"></i> Personal Plan (Free)
                        </div>
                        <ul style="margin: 0; padding-left: 20px; font-size: 12px; color: #15803d;">
                            <li>Dashboard & Overview</li>
                            <li>Record Income & Expenses</li>
                            <li>Transaction Management</li>
                            <li>Financial Reports</li>
                            <li>Tax Calculator</li>
                            <li>AI Assistant</li>
                        </ul>
                    </div>
                    
                    <div class="form-group" style="display: flex; align-items: flex-start; gap: 8px;">
                        <input type="checkbox" id="regAgree" required style="margin-top: 4px;">
                        <label for="regAgree" style="font-size: 12px; color: #64748b; cursor: pointer;">
                            I agree to the Terms of Service and Privacy Policy
                        </label>
                    </div>
                    
                    <button type="submit" class="btn-primary" style="width: 100%; padding: 12px; font-size: 14px;">
                        <i class="fas fa-user-plus"></i> Create Free Account
                    </button>
                    
                    <p style="text-align: center; margin-top: 15px; font-size: 13px; color: #64748b;">
                        Already have an account? 
                        <a href="#" onclick="closeFreeRegisterModal(); showLoginPage(); return false;" style="color: #2563eb; font-weight: 500;">Sign In</a>
                    </p>
                </form>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

function closeFreeRegisterModal() {
    const modal = document.getElementById('freeRegisterModal');
    if (modal) modal.remove();
}

function handleFreeRegistration(event) {
    event.preventDefault();
    
    const name = document.getElementById('regName').value.trim();
    const email = document.getElementById('regEmail').value.trim();
    const password = document.getElementById('regPassword').value;
    const passwordConfirm = document.getElementById('regPasswordConfirm').value;
    
    // Validation
    if (password !== passwordConfirm) {
        showToast('Passwords do not match', 'error');
        return;
    }
    
    if (password.length < 6) {
        showToast('Password must be at least 6 characters', 'error');
        return;
    }
    
    // Check if email exists
    if (users.find(u => u.email.toLowerCase() === email.toLowerCase())) {
        showToast('Email already registered. Please login instead.', 'error');
        return;
    }
    
    // Create a unique tenant for this user (isolated business data)
    const tenantId = 'tenant_' + Date.now();
    
    // Create personal user
    const newUser = {
        id: 'user_' + Date.now(),
        email: email,
        password: password,
        name: name,
        role: 'personal',
        plan: 'personal',
        status: 'active',
        permissions: ['dashboard', 'transactions', 'income', 'expenses', 'reports', 'taxes', 'balance-sheet', 'monthly-reports', 'ai-chatbot', 'bills'],
        tenantId: tenantId,
        createdAt: new Date().toISOString(),
        registeredVia: 'free_signup'
    };
    
    users.push(newUser);
    saveUsers();
    
    // Initialize empty tenant data for this user
    initializeEmptyTenantData(tenantId, name);
    
    // Auto-login
    currentUser = newUser;
    window.currentUser = newUser; // CRITICAL: Expose to window for other modules
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(currentUser));
    
    closeFreeRegisterModal();
    hideLoginPage(); // Hide login page after registration
    
    // Remove guest mode
    isGuestMode = false;
    removeViewOnlyMode();
    
    // Load the user's empty tenant data
    if (typeof loadCurrentTenantData === 'function') {
        loadCurrentTenantData();
    } else {
        // Fallback: Reset global data to empty
        resetToEmptyData();
    }
    
    // Update UI
    updateAuthUI();
    
    showToast(`Welcome ${name}! Your free account is ready with a fresh start.`, 'success');
    
    // Show dashboard
    if (typeof showSection === 'function') {
        showSection('dashboard');
    }
    
    // Refresh dashboard to show empty state
    if (typeof updateDashboard === 'function') {
        updateDashboard();
    }
}

// Initialize empty tenant data for new users
function initializeEmptyTenantData(tenantId, userName) {
    const emptyTenantData = {
        // Core data
        transactions: [],
        bills: [],
        products: [],
        customers: [],
        stockMovements: [],
        sales: [],
        suppliers: [],
        quotations: [],
        projects: [],
        employees: [],
        branches: [],
        purchaseOrders: [],
        goodsReceipts: [],
        deliveryOrders: [],
        
        // HR & Payroll data
        payrollRecords: [],
        kpiTemplates: [],
        kpiAssignments: [],
        kpiScores: [],
        leaveRequests: [],
        leaveBalances: [],
        attendanceRecords: [],
        
        // Accounting & Finance data
        orders: [],
        invoices: [],
        bankAccounts: [],
        creditCards: [],
        manualBalances: {},
        
        // Chart of Accounts & Journal Entries
        chartOfAccounts: [],
        journalEntries: [],
        journalSequence: { year: new Date().getFullYear(), sequence: 0 },
        
        // POS data
        heldSales: [],
        posReceipts: [],
        
        // Inventory (alias)
        inventory: [],
        
        // CRM (alias)
        crmCustomers: [],
        
        // E-Invoice
        einvoiceSettings: {},
        
        // Outlets
        outlets: [],
        
        // AI state
        aiState: {},
        
        settings: {
            businessName: userName + "'s Business",
            currency: "MYR",
            ssmNumber: "",
            tinNumber: "",
            gstNumber: "",
            defaultTaxRate: 0,
            lowStockThreshold: 10
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };
    
    // Save tenant data
    localStorage.setItem('ezcubic_tenant_' + tenantId, JSON.stringify(emptyTenantData));
    
    // Also register the tenant in the tenants list with Company Code
    const tenants = JSON.parse(localStorage.getItem('ezcubic_tenants') || '{}');
    const companyCode = generateCompanyCode();
    tenants[tenantId] = {
        id: tenantId,
        ownerId: 'user_' + Date.now(),
        businessName: userName + "'s Business",
        companyCode: companyCode, // For staff device sync
        createdAt: new Date().toISOString(),
        status: 'active'
    };
    localStorage.setItem('ezcubic_tenants', JSON.stringify(tenants));
    
    console.log('🏢 Company Code for new tenant:', companyCode);
    
    // CLOUD SYNC: Sync new tenant data to cloud
    syncTenantDataToCloud(tenantId, emptyTenantData);
}

// Sync tenant data to Supabase cloud
async function syncTenantDataToCloud(tenantId, tenantData) {
    
    try {
        if (!window.supabase?.createClient) {
            console.warn('⚠️ Supabase SDK not loaded, tenant data not synced');
            return;
        }
        
        const client = getUsersSupabaseClient();
        
        const { error } = await client.from('tenant_data').upsert({
            tenant_id: tenantId,
            data_key: 'tenant_full_data',
            data: { 
                tenantId: tenantId,
                value: tenantData, 
                synced_at: new Date().toISOString() 
            },
            updated_at: new Date().toISOString()
        }, { onConflict: 'tenant_id,data_key' });
        
        if (error) {
            console.warn('⚠️ Tenant data sync failed:', error.message);
        } else {
            console.log('☁️ Tenant data synced to cloud:', tenantId);
        }
    } catch (err) {
        console.warn('⚠️ Tenant sync error:', err);
    }
}

// Reset only window arrays (for page refresh with same tenant)
// Does NOT clear localStorage - preserves data saved by modules
function resetWindowArraysOnly() {
    console.log('Resetting window arrays only (preserving localStorage)...');
    
    // Reset window arrays to empty - they'll be repopulated from localStorage/tenant
    window.products = [];
    window.customers = [];
    window.stockMovements = [];
    window.sales = [];
    window.transactions = [];
    window.suppliers = [];
    window.branches = [];
    window.quotations = [];
    window.projects = [];
    window.purchaseOrders = [];
    window.goodsReceipts = [];
    window.deliveryOrders = [];
    window.crmCustomers = [];
    window.chartOfAccounts = [];
    window.journalEntries = [];
    window.employees = [];
    window.payrollRecords = [];
    
    // Note: We do NOT clear localStorage here - modules will load from it
}

// Reset global data to empty state - clears in-memory data AND legacy storage
function resetToEmptyData() {
    console.log('Resetting all data to empty state...');
    
    // Get default settings
    const defaultSettings = typeof getDefaultSettings === 'function' ? getDefaultSettings() : {
        businessName: 'My Business',
        currency: 'MYR',
        defaultTaxRate: 0
    };
    
    // Reset businessData object (in-memory)
    if (typeof businessData !== 'undefined') {
        businessData.transactions = [];
        businessData.bills = [];
        businessData.products = [];
        businessData.customers = [];
        businessData.stockMovements = [];
        businessData.sales = [];
        businessData.suppliers = [];
        businessData.branches = [];
        businessData.quotations = [];
        businessData.projects = [];
        businessData.purchaseOrders = [];
        businessData.deliveryOrders = [];
        businessData.currentCart = [];
        businessData.settings = defaultSettings;
    }
    
    // Reset ALL global arrays (in-memory)
    window.products = [];
    window.customers = [];
    window.stockMovements = [];
    window.sales = [];
    window.transactions = [];
    window.suppliers = [];
    window.branches = [];
    window.quotations = [];
    window.projects = [];
    window.purchaseOrders = [];
    window.goodsReceipts = [];
    window.deliveryOrders = [];
    
    // Also try to reset module-level variables if they exist
    try { if (typeof products !== 'undefined') products = []; } catch(e) {}
    try { if (typeof customers !== 'undefined') customers = []; } catch(e) {}
    try { if (typeof stockMovements !== 'undefined') stockMovements = []; } catch(e) {}
    try { if (typeof sales !== 'undefined') sales = []; } catch(e) {}
    try { if (typeof suppliers !== 'undefined') suppliers = []; } catch(e) {}
    try { if (typeof branches !== 'undefined') branches = []; } catch(e) {}
    try { if (typeof quotations !== 'undefined') quotations = []; } catch(e) {}
    try { if (typeof projects !== 'undefined') projects = []; } catch(e) {}
    try { if (typeof purchaseOrders !== 'undefined') purchaseOrders = []; } catch(e) {}
    try { if (typeof goodsReceipts !== 'undefined') goodsReceipts = []; } catch(e) {}
    try { if (typeof deliveryOrders !== 'undefined') deliveryOrders = []; } catch(e) {}
    try { if (typeof outlets !== 'undefined') outlets = []; } catch(e) {}
    try { if (typeof employees !== 'undefined') employees = []; } catch(e) {}
    try { if (typeof payrollRecords !== 'undefined') payrollRecords = []; } catch(e) {}
    try { if (typeof kpiTemplates !== 'undefined') kpiTemplates = []; } catch(e) {}
    try { if (typeof kpiAssignments !== 'undefined') kpiAssignments = []; } catch(e) {}
    try { if (typeof kpiScores !== 'undefined') kpiScores = []; } catch(e) {}
    try { if (typeof leaveRequests !== 'undefined') leaveRequests = []; } catch(e) {}
    try { if (typeof leaveBalances !== 'undefined') leaveBalances = []; } catch(e) {}
    try { if (typeof attendanceRecords !== 'undefined') attendanceRecords = []; } catch(e) {}
    
    // Reset Chart of Accounts & Journal Entries
    window.chartOfAccounts = [];
    window.journalEntries = [];
    try { if (typeof chartOfAccounts !== 'undefined') chartOfAccounts = []; } catch(e) {}
    try { if (typeof journalEntries !== 'undefined') journalEntries = []; } catch(e) {}
    try { if (typeof journalSequence !== 'undefined') journalSequence = { year: new Date().getFullYear(), sequence: 0 }; } catch(e) {}
    
    // Reset CRM customers
    window.crmCustomers = [];
    try { if (typeof crmCustomers !== 'undefined') crmCustomers = []; } catch(e) {}
    
    // CRITICAL: Clear ALL legacy localStorage keys to prevent stale data
    // These will be repopulated with correct tenant data in loadUserTenantData()
    localStorage.setItem('ezcubic_products', '[]');
    localStorage.setItem('ezcubic_customers', '[]');
    localStorage.setItem('ezcubic_suppliers', '[]');
    localStorage.setItem('ezcubic_branches', '[]');
    localStorage.setItem('ezcubic_quotations', '[]');
    localStorage.setItem('ezcubic_projects', '[]');
    localStorage.setItem('ezcubic_purchase_orders', '[]');
    localStorage.setItem('ezcubic_goods_receipts', '[]');
    localStorage.setItem('ezcubic_stock_movements', '[]');
    localStorage.setItem('ezcubic_sales', '[]');
    localStorage.setItem('ezcubic_delivery_orders', '[]');
    localStorage.setItem('ezcubic_outlets', '[]');
    
    // HR & Payroll keys
    localStorage.setItem('ezcubic_employees', '[]');
    localStorage.setItem('ezcubic_payroll', '[]');
    localStorage.setItem('ezcubic_kpi_templates', '[]');
    localStorage.setItem('ezcubic_kpi_assignments', '[]');
    localStorage.setItem('ezcubic_kpi_scores', '[]');
    localStorage.setItem('ezcubic_leave_requests', '[]');
    localStorage.setItem('ezcubic_leave_balances', '[]');
    localStorage.setItem('ezcubic_attendance', '[]');
    
    // Accounting & Finance keys
    localStorage.setItem('ezcubic_transactions', '[]');
    localStorage.setItem('ezcubic_bills', '[]');
    localStorage.setItem('ezcubic_orders', '[]');
    localStorage.setItem('ezcubic_invoices', '[]');
    localStorage.setItem('ezcubic_bank_accounts', '[]');
    localStorage.setItem('ezcubic_credit_cards', '[]');
    localStorage.setItem('ezcubic_manual_balances', '{}');
    
    // Chart of Accounts & Journal Entries keys
    localStorage.setItem('ezcubic_chart_of_accounts', '[]');
    localStorage.setItem('ezcubic_journal_entries', '[]');
    localStorage.setItem('ezcubic_journal_sequence', JSON.stringify({ year: new Date().getFullYear(), sequence: 0 }));
    
    // POS keys
    localStorage.setItem('ezcubic_held_sales', '[]');
    localStorage.setItem('ezcubic_pos_receipts', '[]');
    
    // Inventory keys  
    localStorage.setItem('ezcubic_inventory', '[]');
    
    // CRM keys
    localStorage.setItem('ezcubic_crm_customers', '[]');
    
    // E-Invoice settings
    localStorage.setItem('ezcubic_einvoice_settings', '{}');
    
    // AI assistant state
    localStorage.setItem('ezcubic_ai_state', '{}');
    
    localStorage.setItem('ezcubicDataMY', JSON.stringify({
        transactions: [],
        bills: [],
        settings: defaultSettings,
        version: '2.0',
        lastSaved: new Date().toISOString()
    }));
    
    console.log('All data reset complete');
}

// Intercept section navigation for guests
function checkGuestAccess(sectionId) {
    if (!currentUser && isGuestMode) {
        // Allow viewing but prompt on interaction
        showFreeRegistrationModal();
        return false;
    }
    return true;
}

// ==================== EXPORTS ====================
window.initializeUserSystem = initializeUserSystem;
window.loadUsers = loadUsers;
window.login = login;
window.logout = logout;
window.applyUserPermissions = applyUserPermissions;
window.hideBusinessNavSeparators = hideBusinessNavSeparators;
window.showAllNavSeparators = showAllNavSeparators;
window.canAccessModule = canAccessModule;
// ==================== USER LIMIT MODAL ====================
function showUserLimitModal(planName, currentCount, limit) {
    console.log('showUserLimitModal called:', planName, currentCount, limit);
    
    // Remove existing modal if any
    document.getElementById('userLimitModal')?.remove();
    
    const planDisplayName = planName.charAt(0).toUpperCase() + planName.slice(1);
    
    // Get upgrade options
    const platformSettings = typeof getPlatformSettings === 'function' ? getPlatformSettings() : null;
    const plans = platformSettings?.plans || {};
    
    // Determine upgrade plan
    let upgradePlan = null;
    let upgradeLimit = 0;
    if (planName === 'starter') {
        upgradePlan = plans.professional;
        upgradeLimit = upgradePlan?.limits?.users || 10;
    } else if (planName === 'professional') {
        upgradePlan = plans.enterprise;
        upgradeLimit = -1; // Unlimited
    }
    
    const modalHTML = `
        <div class="modal show" id="userLimitModal" style="z-index: 10005; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center;">
            <div style="background: white; max-width: 480px; border-radius: 16px; overflow: hidden; box-shadow: 0 25px 50px rgba(0,0,0,0.25);">
                <div style="background: linear-gradient(135deg, #ef4444, #dc2626); padding: 25px; text-align: center; color: white;">
                    <div style="font-size: 50px; margin-bottom: 10px;">⚠️</div>
                    <h2 style="margin: 0; font-size: 22px;">User Limit Reached</h2>
                </div>
                <div style="padding: 25px; text-align: center;">
                    <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 12px; padding: 20px; margin-bottom: 20px;">
                        <div style="font-size: 36px; font-weight: 700; color: #dc2626;">${currentCount} / ${limit}</div>
                        <div style="color: #991b1b; margin-top: 5px;">Users in your account</div>
                    </div>
                    
                    <p style="color: #64748b; margin-bottom: 20px; line-height: 1.6;">
                        Your <strong style="color: #2563eb;">${planDisplayName} Plan</strong> allows a maximum of 
                        <strong>${limit} users</strong>. To add more team members, please upgrade your subscription.
                    </p>
                    
                    ${upgradePlan ? `
                    <div style="background: linear-gradient(135deg, #f0fdf4, #dcfce7); border: 2px solid #22c55e; border-radius: 12px; padding: 20px; margin-bottom: 20px;">
                        <div style="font-weight: 600; color: #166534; margin-bottom: 8px;">
                            <i class="fas fa-arrow-up"></i> Upgrade to ${upgradePlan.name}
                        </div>
                        <div style="font-size: 28px; font-weight: 700; color: #15803d;">
                            ${upgradeLimit === -1 ? '∞ Unlimited' : upgradeLimit + ' Users'}
                        </div>
                        <div style="color: #166534; font-size: 14px; margin-top: 5px;">
                            RM ${upgradePlan.price}/month
                        </div>
                    </div>
                    ` : ''}
                    
                    <div style="display: flex; gap: 10px; justify-content: center;">
                        <button onclick="document.getElementById('userLimitModal').remove()" style="padding: 12px 25px; border-radius: 8px; background: #e2e8f0; border: none; cursor: pointer; font-weight: 600;">
                            <i class="fas fa-times"></i> Close
                        </button>
                        ${upgradePlan ? `
                        <button onclick="document.getElementById('userLimitModal').remove(); alert('Please contact support to upgrade your plan');" style="padding: 12px 25px; border-radius: 8px; background: linear-gradient(135deg, #22c55e, #16a34a); color: white; border: none; cursor: pointer; font-weight: 600;">
                            <i class="fas fa-rocket"></i> Upgrade Now
                        </button>
                        ` : ''}
                    </div>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    console.log('Modal HTML inserted');
    
    // Also show alert as backup
    alert(`⚠️ User Limit Reached!\n\nYour ${planDisplayName} Plan allows ${limit} users.\nYou currently have ${currentCount} users.\n\nPlease upgrade to add more team members.`);
}

window.showLoginModal = showLoginModal;
window.closeLoginModal = closeLoginModal;
window.handleLogin = handleLogin;
window.showForgotPassword = showForgotPassword;
window.closeForgotPasswordModal = closeForgotPasswordModal;
window.verifyResetEmail = verifyResetEmail;
window.executePasswordReset = executePasswordReset;
window.toggleUserMenu = toggleUserMenu;
// ==================== FOUNDER: USER SEARCH & FILTER ====================
function filterFounderUserList(searchTerm) {
    const roleFilter = document.getElementById('founderRoleFilter')?.value || '';
    const planFilter = document.getElementById('founderPlanFilter')?.value || '';
    const statusFilter = document.getElementById('founderStatusFilter')?.value || '';
    
    const rows = document.querySelectorAll('.founder-user-row');
    let visibleCount = 0;
    
    rows.forEach(row => {
        const uid = row.dataset.uid?.toLowerCase() || '';
        const name = row.dataset.name || '';
        const email = row.dataset.email || '';
        const role = row.dataset.role || '';
        const plan = row.dataset.plan || '';
        const status = row.dataset.status || '';
        
        const searchLower = searchTerm.toLowerCase();
        
        // Check search term
        const matchesSearch = !searchTerm || 
            uid.includes(searchLower) || 
            name.includes(searchLower) || 
            email.includes(searchLower);
        
        // Check filters
        const matchesRole = !roleFilter || role === roleFilter;
        const matchesPlan = !planFilter || plan === planFilter;
        const matchesStatus = !statusFilter || status === statusFilter;
        
        const isVisible = matchesSearch && matchesRole && matchesPlan && matchesStatus;
        row.style.display = isVisible ? '' : 'none';
        
        if (isVisible) visibleCount++;
    });
    
    // Update count
    const countEl = document.getElementById('founderUserCount');
    if (countEl) {
        countEl.textContent = `(${visibleCount})`;
    }
}

function showUserDetailModal(userId) {
    const user = users.find(u => u.id === userId);
    if (!user) {
        showToast('User not found', 'error');
        return;
    }
    
    // Remove existing modal if any
    const existingModal = document.getElementById('userDetailModal');
    if (existingModal) {
        existingModal.remove();
    }
    
    const platformSettings = typeof getPlatformSettings === 'function' ? getPlatformSettings() : null;
    const role = ROLES[user.role] || {};
    const plan = platformSettings?.plans?.[user.plan];
    const subscriptions = typeof getSubscriptions === 'function' ? getSubscriptions() : {};
    const subscription = user.tenantId ? subscriptions[user.tenantId] : null;
    
    // Find related users (staff/manager under this business admin)
    let relatedUsers = [];
    if (user.role === 'business_admin') {
        relatedUsers = users.filter(u => u.tenantId === user.tenantId && u.id !== user.id);
    } else if (user.role === 'staff' || user.role === 'manager') {
        // Find the business owner
        const owner = users.find(u => u.tenantId === user.tenantId && u.role === 'business_admin');
        if (owner) {
            relatedUsers = [owner];
        }
    }
    
    const modalHTML = `
        <div class="modal show" id="userDetailModal" style="z-index: 10005;">
            <div class="modal-content" style="max-width: 600px;">
                <div class="modal-header" style="background: linear-gradient(135deg, ${role.color || '#6366f1'}, ${role.color || '#6366f1'}dd);">
                    <h3 class="modal-title" style="color: white;">
                        <i class="fas ${role.icon || 'fa-user'}"></i> User Details
                    </h3>
                    <button class="modal-close" onclick="closeModal('userDetailModal')" style="color: white;">&times;</button>
                </div>
                <div class="modal-body" style="padding: 0;">
                    <!-- User Header -->
                    <div style="background: ${role.color || '#6366f1'}15; padding: 20px; border-bottom: 1px solid #e2e8f0;">
                        <div style="display: flex; align-items: center; gap: 15px;">
                            <div style="width: 60px; height: 60px; border-radius: 50%; background: ${role.color || '#6366f1'}; display: flex; align-items: center; justify-content: center;">
                                <i class="fas ${role.icon || 'fa-user'}" style="font-size: 24px; color: white;"></i>
                            </div>
                            <div style="flex: 1;">
                                <div style="font-size: 18px; font-weight: 600; color: #1e293b;">${escapeHtml(user.name || 'N/A')}</div>
                                <div style="color: #64748b; font-size: 14px;">${escapeHtml(user.email || 'N/A')}</div>
                                <div style="margin-top: 6px;">
                                    <span style="background: ${role.color || '#6366f1'}20; color: ${role.color || '#6366f1'}; padding: 3px 10px; border-radius: 12px; font-size: 12px; font-weight: 500;">
                                        ${role.name || user.role}
                                    </span>
                                    <span style="background: ${user.status === 'active' ? '#dcfce7' : '#fee2e2'}; color: ${user.status === 'active' ? '#16a34a' : '#dc2626'}; padding: 3px 10px; border-radius: 12px; font-size: 12px; font-weight: 500; margin-left: 6px;">
                                        ${user.status || 'active'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Details Grid -->
                    <div style="padding: 20px;">
                        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px;">
                            <div style="background: #f8fafc; padding: 12px; border-radius: 8px;">
                                <div style="font-size: 11px; color: #64748b; text-transform: uppercase; margin-bottom: 4px;">User ID (UID)</div>
                                <div style="font-family: monospace; color: #4338ca; font-weight: 600; font-size: 13px;">${user.id}</div>
                            </div>
                            <div style="background: #f8fafc; padding: 12px; border-radius: 8px;">
                                <div style="font-size: 11px; color: #64748b; text-transform: uppercase; margin-bottom: 4px;">Tenant ID</div>
                                <div style="font-family: monospace; color: #4338ca; font-weight: 600; font-size: 13px;">${user.tenantId || 'N/A'}</div>
                            </div>
                            <div style="background: #f8fafc; padding: 12px; border-radius: 8px;">
                                <div style="font-size: 11px; color: #64748b; text-transform: uppercase; margin-bottom: 4px;">Plan</div>
                                <div>
                                    ${plan ? `<span style="background: ${plan.color}; color: white; padding: 3px 10px; border-radius: 12px; font-size: 12px;">${plan.name}</span>` : '<span style="color: #94a3b8;">No plan</span>'}
                                </div>
                            </div>
                            <div style="background: #f8fafc; padding: 12px; border-radius: 8px;">
                                <div style="font-size: 11px; color: #64748b; text-transform: uppercase; margin-bottom: 4px;">Created</div>
                                <div style="font-size: 13px; color: #1e293b;">${user.createdAt ? new Date(user.createdAt).toLocaleString() : 'Unknown'}</div>
                            </div>
                        </div>
                        
                        ${subscription ? `
                        <div style="margin-top: 15px; background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 12px;">
                            <div style="font-size: 11px; color: #166534; text-transform: uppercase; margin-bottom: 6px;">
                                <i class="fas fa-calendar-check"></i> Subscription
                            </div>
                            <div style="display: flex; justify-content: space-between; align-items: center;">
                                <div>
                                    <span style="font-size: 13px; color: #166534;">Expires: ${new Date(subscription.expiresAt).toLocaleDateString()}</span>
                                    ${subscription.isTrial ? '<span style="background: #f59e0b; color: white; padding: 2px 6px; border-radius: 8px; font-size: 10px; margin-left: 8px;">TRIAL</span>' : ''}
                                </div>
                            </div>
                        </div>
                        ` : ''}
                        
                        ${user.permissions && user.permissions.length > 0 ? `
                        <div style="margin-top: 15px;">
                            <div style="font-size: 11px; color: #64748b; text-transform: uppercase; margin-bottom: 8px;">
                                <i class="fas fa-key"></i> Permissions (${user.permissions.includes('all') ? 'Full Access' : user.permissions.length + ' modules'})
                            </div>
                            <div style="display: flex; flex-wrap: wrap; gap: 6px;">
                                ${user.permissions.includes('all') ? 
                                    '<span style="background: #dcfce7; color: #166534; padding: 4px 10px; border-radius: 6px; font-size: 12px;">All Modules</span>' :
                                    user.permissions.slice(0, 10).map(p => `<span style="background: #e2e8f0; color: #475569; padding: 4px 8px; border-radius: 6px; font-size: 11px;">${p}</span>`).join('') +
                                    (user.permissions.length > 10 ? `<span style="color: #64748b; font-size: 11px;">+${user.permissions.length - 10} more</span>` : '')
                                }
                            </div>
                        </div>
                        ` : ''}
                        
                        ${relatedUsers.length > 0 ? `
                        <div style="margin-top: 15px; border-top: 1px solid #e2e8f0; padding-top: 15px;">
                            <div style="font-size: 11px; color: #64748b; text-transform: uppercase; margin-bottom: 8px;">
                                <i class="fas fa-users"></i> ${user.role === 'business_admin' ? 'Team Members' : 'Business Owner'}
                            </div>
                            <div style="display: flex; flex-direction: column; gap: 8px;">
                                ${relatedUsers.slice(0, 5).map(ru => {
                                    const rRole = ROLES[ru.role] || {};
                                    return `
                                        <div style="display: flex; align-items: center; gap: 10px; background: #f8fafc; padding: 8px 12px; border-radius: 8px;">
                                            <div style="width: 32px; height: 32px; border-radius: 50%; background: ${rRole.color || '#64748b'}; display: flex; align-items: center; justify-content: center;">
                                                <i class="fas ${rRole.icon || 'fa-user'}" style="font-size: 12px; color: white;"></i>
                                            </div>
                                            <div style="flex: 1;">
                                                <div style="font-size: 13px; font-weight: 500;">${escapeHtml(ru.name)}</div>
                                                <div style="font-size: 11px; color: #64748b;">${rRole.name || ru.role}</div>
                                            </div>
                                            <code style="font-size: 10px; background: #e0e7ff; color: #4338ca; padding: 2px 6px; border-radius: 4px;">${ru.id}</code>
                                        </div>
                                    `;
                                }).join('')}
                                ${relatedUsers.length > 5 ? `<div style="color: #64748b; font-size: 12px; text-align: center;">+${relatedUsers.length - 5} more</div>` : ''}
                            </div>
                        </div>
                        ` : ''}
                    </div>
                </div>
                <div class="modal-footer" style="display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        ${currentUser.role === 'founder' && user.role !== 'founder' ? `
                            <button class="btn-danger" onclick="confirmDeleteUser('${user.id}')" style="margin-right: 8px;">
                                <i class="fas fa-trash-alt"></i> Delete
                            </button>
                            ${user.status === 'active' ? `
                                <button class="btn-warning" onclick="toggleUserStatus('${user.id}', 'inactive')">
                                    <i class="fas fa-ban"></i> Deactivate
                                </button>
                            ` : `
                                <button class="btn-success" onclick="toggleUserStatus('${user.id}', 'active')">
                                    <i class="fas fa-check-circle"></i> Activate
                                </button>
                            `}
                        ` : ''}
                    </div>
                    <div>
                        <button class="btn-secondary" onclick="closeModal('userDetailModal')">Close</button>
                        ${currentUser.role === 'founder' && user.role !== 'founder' ? `
                            <button class="btn-primary" onclick="closeModal('userDetailModal'); editUser('${user.id}')">
                                <i class="fas fa-edit"></i> Edit User
                            </button>
                        ` : ''}
                    </div>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

// Toggle user status (activate/deactivate) - Founder only
function toggleUserStatus(userId, newStatus) {
    if (currentUser.role !== 'founder') {
        showToast('Only founder can change user status', 'error');
        return;
    }
    
    const user = users.find(u => u.id === userId);
    if (!user) {
        showToast('User not found', 'error');
        return;
    }
    
    // Update status
    user.status = newStatus;
    user.updatedAt = new Date().toISOString();
    
    // Close modal first to prevent UI hang
    closeModal('userDetailModal');
    
    // Save locally first (skip cloud sync to prevent lag)
    localStorage.setItem('ezcubic_users', JSON.stringify(users));
    
    // Show feedback immediately
    showToast(`User ${user.name || user.email} has been ${newStatus === 'active' ? 'activated' : 'deactivated'}`, 'success');
    
    // Re-render UI
    renderUserManagement();
    
    // Schedule cloud sync in background (delayed)
    setTimeout(() => {
        if (typeof window.fullCloudSync === 'function') {
            window.fullCloudSync().catch(err => console.warn('Background sync failed:', err));
        }
    }, 1000);
}

// Confirm delete user - Founder only
function confirmDeleteUser(userId) {
    if (currentUser.role !== 'founder') {
        showToast('Only founder can delete users', 'error');
        return;
    }
    
    const user = users.find(u => u.id === userId);
    if (!user) {
        showToast('User not found', 'error');
        return;
    }
    
    // Remove existing modal if any to prevent hanging
    const existingModal = document.getElementById('confirmDeleteUserModal');
    if (existingModal) {
        existingModal.remove();
    }
    
    const confirmHTML = `
        <div class="modal show" id="confirmDeleteUserModal" style="z-index: 10006;">
            <div class="modal-content" style="max-width: 420px;">
                <div class="modal-header" style="background: linear-gradient(135deg, #dc2626, #ef4444);">
                    <h3 class="modal-title" style="color: white;">
                        <i class="fas fa-exclamation-triangle"></i> Delete User
                    </h3>
                    <button class="modal-close" onclick="closeModal('confirmDeleteUserModal')" style="color: white;">&times;</button>
                </div>
                <div class="modal-body" style="text-align: center; padding: 30px;">
                    <div style="width: 70px; height: 70px; border-radius: 50%; background: #fee2e2; display: flex; align-items: center; justify-content: center; margin: 0 auto 20px;">
                        <i class="fas fa-user-times" style="font-size: 28px; color: #dc2626;"></i>
                    </div>
                    <h4 style="margin: 0 0 10px; color: #1e293b;">Are you sure?</h4>
                    <p style="color: #64748b; margin: 0 0 20px; font-size: 14px;">
                        You are about to permanently delete:
                    </p>
                    <div style="background: #f8fafc; border-radius: 8px; padding: 15px; margin-bottom: 20px;">
                        <div style="font-weight: 600; color: #1e293b;">${escapeHtml(user.name || 'N/A')}</div>
                        <div style="color: #64748b; font-size: 13px;">${escapeHtml(user.email || 'N/A')}</div>
                        <code style="font-size: 11px; background: #e0e7ff; color: #4338ca; padding: 2px 6px; border-radius: 4px; margin-top: 8px; display: inline-block;">${user.id}</code>
                    </div>
                    <p style="color: #dc2626; font-size: 13px; margin: 0;">
                        <i class="fas fa-warning"></i> This action cannot be undone!
                    </p>
                </div>
                <div class="modal-footer" style="justify-content: center; gap: 12px;">
                    <button class="btn-secondary" onclick="closeModal('confirmDeleteUserModal')" style="min-width: 100px;">
                        Cancel
                    </button>
                    <button class="btn-danger" onclick="executeDeleteUser('${user.id}')" style="min-width: 100px;">
                        <i class="fas fa-trash-alt"></i> Delete
                    </button>
                </div>
            </div>
        </div>
    `;
    
    closeModal('userDetailModal');
    document.body.insertAdjacentHTML('beforeend', confirmHTML);
}

// Execute delete user
function executeDeleteUser(userId) {
    if (currentUser.role !== 'founder') {
        showToast('Only founder can delete users', 'error');
        return;
    }
    
    const userIndex = users.findIndex(u => u.id === userId);
    if (userIndex === -1) {
        showToast('User not found', 'error');
        return;
    }
    
    const user = users[userIndex];
    const userName = user.name || user.email;
    
    // If user is business_admin, also delete their tenant and subscription
    if (user.role === 'business_admin' && user.tenantId) {
        // Delete tenant
        const tenants = typeof getTenants === 'function' ? getTenants() : JSON.parse(localStorage.getItem('ezcubic_tenants') || '{}');
        if (tenants[user.tenantId]) {
            delete tenants[user.tenantId];
            if (typeof saveTenants === 'function') {
                saveTenants(tenants);
            } else {
                localStorage.setItem('ezcubic_tenants', JSON.stringify(tenants));
            }
        }
        
        // Delete subscription
        const subs = typeof getSubscriptions === 'function' ? getSubscriptions() : JSON.parse(localStorage.getItem('ezcubic_subscriptions') || '{}');
        if (subs[user.tenantId]) {
            delete subs[user.tenantId];
            if (typeof saveSubscriptions === 'function') {
                saveSubscriptions(subs);
            } else {
                localStorage.setItem('ezcubic_subscriptions', JSON.stringify(subs));
            }
        }
        
        console.log(`Deleted tenant and subscription for: ${user.tenantId}`);
    }
    
    // Remove user from array
    users.splice(userIndex, 1);
    saveUsers();
    
    closeModal('confirmDeleteUserModal');
    showToast(`User "${userName}" has been deleted`, 'success');
    renderUserManagement();
    
    // Immediate cloud sync to remove from cloud
    if (typeof window.fullCloudSync === 'function') {
        console.log('☁️ Syncing delete to cloud...');
        window.fullCloudSync().catch(err => console.warn('Cloud sync failed:', err));
    } else if (typeof scheduleAutoCloudSync === 'function') {
        scheduleAutoCloudSync();
    }
}

function exportUserList() {
    const allUsers = users.filter(u => u.role !== 'founder');
    const platformSettings = typeof getPlatformSettings === 'function' ? getPlatformSettings() : null;
    
    // Create CSV content
    let csv = 'UID,Name,Email,Role,Plan,Status,Tenant ID,Created\n';
    
    allUsers.forEach(user => {
        const plan = platformSettings?.plans?.[user.plan];
        csv += `"${user.id}","${user.name || ''}","${user.email || ''}","${user.role}","${plan?.name || user.plan || ''}","${user.status || 'active'}","${user.tenantId || ''}","${user.createdAt || ''}"\n`;
    });
    
    // Download
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ezcubic_users_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    
    showToast(`Exported ${allUsers.length} users`, 'success');
}

window.filterFounderUserList = filterFounderUserList;
window.showUserDetailModal = showUserDetailModal;
window.toggleUserStatus = toggleUserStatus;
window.confirmDeleteUser = confirmDeleteUser;
window.executeDeleteUser = executeDeleteUser;
window.exportUserList = exportUserList;
window.closeUserMenu = closeUserMenu;
window.showUserManagement = showUserManagement;
window.renderUserManagement = renderUserManagement;
window.showAddUserModal = showAddUserModal;
window.showUserLimitModal = showUserLimitModal;
window.highlightSelectedPlan = highlightSelectedPlan;
window.autoSelectModulesForPlan = autoSelectModulesForPlan;
window.toggleFullAccess = toggleFullAccess;
window.togglePermissionCategory = togglePermissionCategory;
window.toggleCategoryModules = toggleCategoryModules;
window.updateCategoryCount = updateCategoryCount;
window.saveNewUser = saveNewUser;
window.editUser = editUser;
window.updateUser = updateUser;
window.toggleUserStatus = toggleUserStatus;
window.deleteUser = deleteUser;
window.canAccessModule = canAccessModule;
window.canManageRole = canManageRole;
window.currentUser = currentUser;
window.ROLES = ROLES;
window.ERP_MODULES = ERP_MODULES;
window.ERP_MODULE_CATEGORIES = ERP_MODULE_CATEGORIES;
window.applyGuestPreviewMode = applyGuestPreviewMode;
window.applyViewOnlyMode = applyViewOnlyMode;
window.removeViewOnlyMode = removeViewOnlyMode;
window.showGuestBadge = showGuestBadge;
window.showFreeRegistrationModal = showFreeRegistrationModal;
window.closeFreeRegisterModal = closeFreeRegisterModal;
window.handleFreeRegistration = handleFreeRegistration;
window.isGuestMode = isGuestMode;
window.initializeEmptyTenantData = initializeEmptyTenantData;
window.resetToEmptyData = resetToEmptyData;
window.loadUserTenantData = loadUserTenantData;
window.showLoginPage = showLoginPage;
window.hideLoginPage = hideLoginPage;
window.handleLoginPage = handleLoginPage;
window.showLoginView = showLoginView;
window.showRegisterView = showRegisterView;
window.showForgotPasswordView = showForgotPasswordView;
window.handleRegisterPage = handleRegisterPage;
window.verifyForgotEmail = verifyForgotEmail;
window.executePagePasswordReset = executePagePasswordReset;

// Debug Sync from Login Page
async function debugSyncFromLoginPage() {
    try {
        const localUsers = JSON.parse(localStorage.getItem('ezcubic_users') || '[]');
        
        let client = null;
        if (window.supabase && window.supabase.createClient) {
            client = getUsersSupabaseClient();
        }
        
        if (!client) {
            alert('❌ Supabase not available. Refresh page and try again.');
            return;
        }
        
        // Fetch cloud users
        const { data, error } = await client.from('tenant_data')
            .select('data')
            .eq('tenant_id', 'global')
            .eq('data_key', 'ezcubic_users')
            .single();
        
        if (error && error.code !== 'PGRST116') {
            alert('❌ Cloud error: ' + error.message);
            return;
        }
        
        const cloudUsers = data?.data?.value || [];
        const localList = localUsers.map(u => u.email + ' (' + u.role + ')').join('\n') || 'None';
        const cloudList = cloudUsers.map(u => u.email + ' (' + u.role + ')').join('\n') || 'None';
        
        const action = confirm(
            '📱 LOCAL USERS:\n' + localList + '\n\n' +
            '☁️ CLOUD USERS:\n' + cloudList + '\n\n' +
            'Click OK to DOWNLOAD cloud users to local.\n' +
            'Click CANCEL to UPLOAD local users to cloud.'
        );
        
        if (action) {
            // Merge cloud into local
            const merged = [...localUsers];
            cloudUsers.forEach(cu => {
                if (!merged.find(lu => lu.id === cu.id || lu.email === cu.email)) {
                    merged.push(cu);
                }
            });
            localStorage.setItem('ezcubic_users', JSON.stringify(merged));
            alert('✅ Downloaded! ' + merged.length + ' users now in local storage.\nRefresh page to see changes.');
            location.reload();
        } else {
            // Upload local to cloud
            const { error: uploadError } = await client.from('tenant_data')
                .upsert({
                    tenant_id: 'global',
                    data_key: 'ezcubic_users',
                    data: { key: 'ezcubic_users', value: localUsers, synced_at: new Date().toISOString() },
                    updated_at: new Date().toISOString()
                }, { onConflict: 'tenant_id,data_key' });
            
            if (uploadError) {
                alert('❌ Upload error: ' + uploadError.message);
            } else {
                alert('✅ Uploaded ' + localUsers.length + ' users to cloud!');
            }
        }
    } catch (err) {
        alert('Error: ' + err.message);
    }
}
window.debugSyncFromLoginPage = debugSyncFromLoginPage;

// ==================== CLOUD SYNC TEST FUNCTIONS ====================
// Test Supabase connection - run in console: testCloudConnection()
window.testCloudConnection = async function() {
    console.log('🧪 Testing Supabase connection...');
    
    try {
        if (!window.supabase?.createClient) {
            console.error('❌ Supabase SDK not loaded');
            return { success: false, error: 'Supabase SDK not loaded' };
        }
        
        const client = getUsersSupabaseClient();
        
        // Test SELECT
        console.log('  Testing SELECT...');
        const { data: selectData, error: selectError } = await client
            .from('tenant_data')
            .select('*')
            .eq('tenant_id', 'global')
            .limit(5);
        
        if (selectError) {
            console.error('❌ SELECT failed:', selectError.message);
            console.log('💡 TIP: Did you run the database-schema.sql in Supabase SQL Editor?');
            return { success: false, error: selectError.message, tip: 'Run database-schema.sql' };
        }
        
        console.log('✅ SELECT OK - Found', selectData?.length || 0, 'records');
        
        // Test INSERT/UPSERT
        console.log('  Testing UPSERT...');
        const testData = {
            tenant_id: 'test_connection',
            data_key: 'connection_test',
            data: { test: true, timestamp: new Date().toISOString() },
            updated_at: new Date().toISOString()
        };
        
        const { error: upsertError } = await client
            .from('tenant_data')
            .upsert(testData, { onConflict: 'tenant_id,data_key' });
        
        if (upsertError) {
            console.error('❌ UPSERT failed:', upsertError.message);
            return { success: false, error: upsertError.message };
        }
        
        console.log('✅ UPSERT OK');
        
        // Clean up test record
        await client.from('tenant_data').delete().eq('tenant_id', 'test_connection');
        
        console.log('✅ ALL TESTS PASSED - Supabase is working!');
        console.log('\n📊 Cloud data found:', selectData);
        
        return { success: true, data: selectData };
        
    } catch (err) {
        console.error('❌ Test failed:', err);
        return { success: false, error: err.message };
    }
};

// Force sync all users to cloud NOW - run: forceSyncUsersToCloud()
window.forceSyncUsersToCloud = async function() {
    console.log('☁️ Force syncing users to cloud...');
    
    try {
        if (!window.supabase?.createClient) {
            alert('❌ Supabase SDK not loaded');
            return;
        }
        
        const client = getUsersSupabaseClient();
        const localUsers = JSON.parse(localStorage.getItem('ezcubic_users') || '[]');
        const localTenants = JSON.parse(localStorage.getItem('ezcubic_tenants') || '{}');
        
        console.log('  Local users:', localUsers.length);
        console.log('  Local tenants:', Object.keys(localTenants).length);
        
        // Sync users
        const { error: usersError } = await client.from('tenant_data').upsert({
            tenant_id: 'global',
            data_key: 'ezcubic_users',
            data: { key: 'ezcubic_users', value: localUsers, synced_at: new Date().toISOString() },
            updated_at: new Date().toISOString()
        }, { onConflict: 'tenant_id,data_key' });
        
        if (usersError) {
            console.error('❌ Users sync failed:', usersError.message);
            alert('❌ Users sync failed: ' + usersError.message);
            return;
        }
        
        // Sync tenants
        const { error: tenantsError } = await client.from('tenant_data').upsert({
            tenant_id: 'global',
            data_key: 'ezcubic_tenants',
            data: { key: 'ezcubic_tenants', value: localTenants, synced_at: new Date().toISOString() },
            updated_at: new Date().toISOString()
        }, { onConflict: 'tenant_id,data_key' });
        
        if (tenantsError) {
            console.error('❌ Tenants sync failed:', tenantsError.message);
        }
        
        console.log('✅ Synced to cloud!');
        console.log('  Users:', localUsers.length);
        console.log('  Tenants:', Object.keys(localTenants).length);
        // Silent sync - no alert
        // alert('✅ Synced ' + localUsers.length + ' users and ' + Object.keys(localTenants).length + ' tenants to cloud!');
        
    } catch (err) {
        console.error('❌ Sync error:', err);
        alert('❌ Error: ' + err.message);
    }
};

// Download users from cloud to this device - run: downloadUsersFromCloud()
// ROLE-AWARE: Founder gets all, Admin gets only their tenant's users
window.downloadUsersFromCloud = async function() {
    console.log('📥 Downloading users from cloud...');
    
    try {
        if (!window.supabase?.createClient) {
            alert('❌ Supabase SDK not loaded');
            return;
        }
        
        const client = getUsersSupabaseClient();
        
        // Check current user's role to determine access level
        const currentUser = JSON.parse(localStorage.getItem('ezcubic_current_user') || '{}');
        const isFounder = currentUser.role === 'founder';
        const currentTenantId = currentUser.tenantId;
        
        console.log('  Current role:', currentUser.role || 'none (login page)');
        console.log('  Tenant:', currentTenantId || 'global');
        
        // Get users from cloud
        const { data, error } = await client.from('tenant_data')
            .select('*')
            .eq('tenant_id', 'global');
        
        if (error) {
            console.error('❌ Download failed:', error.message);
            alert('❌ Download failed: ' + error.message);
            return;
        }
        
        let usersDownloaded = 0;
        let tenantsDownloaded = 0;
        
        for (const record of data || []) {
            if (record.data_key === 'ezcubic_users' && record.data?.value) {
                const cloudUsers = record.data.value;
                const localUsers = JSON.parse(localStorage.getItem('ezcubic_users') || '[]');
                
                // ROLE-BASED FILTERING
                let usersToSync = cloudUsers;
                
                if (!isFounder && currentTenantId) {
                    // Admin/Staff: Only sync users from their tenant
                    usersToSync = cloudUsers.filter(u => 
                        u.tenantId === currentTenantId || 
                        u.id === currentUser.id // Always include self
                    );
                    console.log('  🔒 Filtered to tenant users only:', usersToSync.length, 'of', cloudUsers.length);
                } else if (isFounder) {
                    // Founder: Gets ALL users
                    console.log('  👑 Founder access: All', cloudUsers.length, 'users');
                }
                
                // Merge: Add filtered cloud users not in local
                usersToSync.forEach(cu => {
                    const existingIdx = localUsers.findIndex(lu => lu.id === cu.id || lu.email === cu.email);
                    if (existingIdx === -1) {
                        localUsers.push(cu);
                    } else {
                        // Update existing user with cloud data
                        localUsers[existingIdx] = { ...localUsers[existingIdx], ...cu };
                    }
                });
                
                localStorage.setItem('ezcubic_users', JSON.stringify(localUsers));
                usersDownloaded = usersToSync.length;
                console.log('  Users synced:', usersToSync.length);
            }
            
            if (record.data_key === 'ezcubic_tenants' && record.data?.value) {
                const cloudTenants = record.data.value;
                const localTenants = JSON.parse(localStorage.getItem('ezcubic_tenants') || '{}');
                
                if (!isFounder && currentTenantId) {
                    // Admin: Only get their own tenant info
                    if (cloudTenants[currentTenantId]) {
                        localTenants[currentTenantId] = cloudTenants[currentTenantId];
                        console.log('  🔒 Synced own tenant only:', currentTenantId);
                    }
                } else {
                    // Founder: Gets ALL tenants
                    Object.assign(localTenants, cloudTenants);
                    console.log('  👑 Founder access: All', Object.keys(cloudTenants).length, 'tenants');
                }
                
                localStorage.setItem('ezcubic_tenants', JSON.stringify(localTenants));
                tenantsDownloaded = Object.keys(localTenants).length;
            }
        }
        
        // Ensure founder account exists after download
        if (typeof ensureFounderExists === 'function') {
            ensureFounderExists();
        }
        
        const roleMsg = isFounder ? '👑 Founder (Full Access)' : '🔒 ' + (currentUser.role || 'User') + ' (Tenant Only)';
        console.log('✅ Download complete!');
        alert('✅ Downloaded from cloud!\n\n' + roleMsg + '\nUsers: ' + usersDownloaded + '\nTenants: ' + tenantsDownloaded + '\n\nRefreshing page...');
        location.reload();
        
    } catch (err) {
        console.error('❌ Download error:', err);
        alert('❌ Error: ' + err.message);
    }
};

// Show cloud sync status
window.cloudSyncStatus = function() {
    const localUsers = JSON.parse(localStorage.getItem('ezcubic_users') || '[]');
    const localTenants = JSON.parse(localStorage.getItem('ezcubic_tenants') || '{}');
    
    console.log('=== CLOUD SYNC STATUS ===');
    console.log('Local Users:', localUsers.length);
    localUsers.forEach(u => console.log('  -', u.email, '(' + u.role + ')'));
    console.log('Local Tenants:', Object.keys(localTenants).length);
    Object.entries(localTenants).forEach(([id, t]) => console.log('  -', id, ':', t.businessName));
    console.log('=========================');
    console.log('\nAvailable commands:');
    console.log('  testCloudConnection()       - Test if Supabase is working');
    console.log('  forceSyncUsersToCloud()     - Upload all users to cloud');
    console.log('  downloadUsersFromCloud()    - Download users from cloud');
    console.log('  syncAllTenantDataToCloud()  - Upload ALL tenant data');
    console.log('  downloadTenantDataFromCloud(tenantId) - Download specific tenant data');
    
    return { users: localUsers.length, tenants: Object.keys(localTenants).length };
};

// Sync ALL tenant data to cloud (for Founder to upload everything)
window.syncAllTenantDataToCloud = async function() {
    console.log('☁️ Syncing ALL tenant data to cloud...');
    
    try {
        if (!window.supabase?.createClient) {
            alert('❌ Supabase SDK not loaded');
            return;
        }
        
        const client = getUsersSupabaseClient();
        
        // Find all tenant data in localStorage
        const tenantKeys = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith('ezcubic_tenant_')) {
                tenantKeys.push(key);
            }
        }
        
        console.log('  Found', tenantKeys.length, 'tenants to sync');
        let synced = 0;
        let failed = 0;
        
        for (const key of tenantKeys) {
            const tenantId = key.replace('ezcubic_tenant_', '');
            const tenantData = JSON.parse(localStorage.getItem(key) || '{}');
            
            const { error } = await client.from('tenant_data').upsert({
                tenant_id: tenantId,
                data_key: 'tenant_full_data',
                data: { 
                    tenantId: tenantId,
                    value: tenantData, 
                    synced_at: new Date().toISOString() 
                },
                updated_at: new Date().toISOString()
            }, { onConflict: 'tenant_id,data_key' });
            
            if (error) {
                console.error('  ❌', tenantId, ':', error.message);
                failed++;
            } else {
                console.log('  ✅', tenantId);
                synced++;
            }
        }
        
        console.log('☁️ Sync complete! Synced:', synced, 'Failed:', failed);
        // Silent sync - no popup
        // alert('☁️ Tenant Data Sync Complete!\n\nSynced: ' + synced + '\nFailed: ' + failed);
        
    } catch (err) {
        console.error('❌ Sync error:', err);
        alert('❌ Error: ' + err.message);
    }
};

// Download specific tenant data from cloud
window.downloadTenantDataFromCloud = async function(tenantId) {
    if (!tenantId) {
        // If no tenantId provided, use current user's tenantId
        const currentUser = JSON.parse(localStorage.getItem('ezcubic_current_user') || '{}');
        tenantId = currentUser.tenantId;
        if (!tenantId) {
            alert('No tenant ID provided and no current user tenant found');
            return;
        }
    }
    
    console.log('📥 Downloading tenant data:', tenantId);
    
    try {
        if (!window.supabase?.createClient) {
            alert('❌ Supabase SDK not loaded');
            return;
        }
        
        const client = getUsersSupabaseClient();
        
        const { data, error } = await client.from('tenant_data')
            .select('*')
            .eq('tenant_id', tenantId)
            .eq('data_key', 'tenant_full_data')
            .single();
        
        if (error) {
            console.error('❌ Download failed:', error.message);
            alert('❌ No cloud data found for tenant: ' + tenantId);
            return;
        }
        
        if (data?.data?.value) {
            localStorage.setItem('ezcubic_tenant_' + tenantId, JSON.stringify(data.data.value));
            console.log('✅ Downloaded tenant data:', tenantId);
            alert('✅ Downloaded tenant data!\n\nTenant: ' + tenantId + '\n\nRefreshing...');
            location.reload();
        } else {
            alert('❌ No data found in cloud for tenant: ' + tenantId);
        }
        
    } catch (err) {
        console.error('❌ Download error:', err);
        alert('❌ Error: ' + err.message);
    }
};

// Full sync - users, tenants, and all tenant data
window.fullCloudSync = async function() {
    console.log('☁️ Starting FULL cloud sync...');
    
    // 1. Sync users
    await window.forceSyncUsersToCloud();
    
    // 2. Sync all tenant data
    await window.syncAllTenantDataToCloud();
    
    console.log('✅ FULL sync complete!');
};

// Mobile-friendly cloud download (shows UI feedback)
// LOGIN PAGE SYNC: Downloads only user credentials for login purposes
// After login, role-based sync applies (Admin=tenant only, Founder=all)
window.mobileDownloadFromCloud = async function() {
    // Show loading
    const btn = event?.target?.closest('a');
    const originalText = btn ? btn.innerHTML : '';
    if (btn) {
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Syncing...';
        btn.style.pointerEvents = 'none';
    }
    
    
    try {
        // Wait for Supabase SDK
        let retries = 0;
        while (!window.supabase?.createClient && retries < 10) {
            await new Promise(r => setTimeout(r, 300));
            retries++;
        }
        
        if (!window.supabase?.createClient) {
            alert('❌ Cloud service not ready. Please refresh and try again.');
            if (btn) {
                btn.innerHTML = originalText;
                btn.style.pointerEvents = '';
            }
            return;
        }
        
        const client = getUsersSupabaseClient();
        
        // Check if already logged in (role-based sync)
        const currentUser = JSON.parse(localStorage.getItem('ezcubic_current_user') || '{}');
        const isLoggedIn = !!currentUser.id;
        const isFounder = currentUser.role === 'founder';
        const currentTenantId = currentUser.tenantId;
        
        // Get users from cloud
        const { data, error } = await client.from('tenant_data')
            .select('*')
            .eq('tenant_id', 'global');
        
        if (error) {
            alert('❌ Sync failed: ' + error.message);
            if (btn) {
                btn.innerHTML = originalText;
                btn.style.pointerEvents = '';
            }
            return;
        }
        
        let usersFound = 0;
        let tenantsFound = 0;
        
        for (const record of data || []) {
            if (record.data_key === 'ezcubic_users' && record.data?.value) {
                const cloudUsers = record.data.value;
                const localUsers = JSON.parse(localStorage.getItem('ezcubic_users') || '[]');
                
                // ROLE-BASED FILTERING (when logged in)
                let usersToSync = cloudUsers;
                
                if (isLoggedIn && !isFounder && currentTenantId) {
                    // Admin/Staff: Only sync their tenant's users
                    usersToSync = cloudUsers.filter(u => 
                        u.tenantId === currentTenantId || 
                        u.id === currentUser.id
                    );
                }
                // If not logged in (login page), sync all for authentication purposes
                
                // Merge: Add cloud users not in local
                usersToSync.forEach(cu => {
                    const existingIdx = localUsers.findIndex(lu => lu.id === cu.id || lu.email === cu.email);
                    if (existingIdx === -1) {
                        localUsers.push(cu);
                    } else {
                        // For staff/manager: preserve their PERMISSIONS (custom access set by admin)
                        // But PLAN should come from cloud (reflects owner's current plan)
                        const existingUser = localUsers[existingIdx];
                        const isStaffOrManager = existingUser.role === 'staff' || existingUser.role === 'manager';
                        
                        if (isStaffOrManager && existingUser.permissions && existingUser.permissions.length > 0) {
                            // Preserve local permissions (custom access), take plan from cloud
                            localUsers[existingIdx] = { ...existingUser, ...cu, permissions: existingUser.permissions };
                        } else {
                            // For other roles or staff without custom permissions, fully merge from cloud
                            localUsers[existingIdx] = { ...localUsers[existingIdx], ...cu };
                        }
                    }
                });
                
                localStorage.setItem('ezcubic_users', JSON.stringify(localUsers));
                usersFound = usersToSync.length;
            }
            
            if (record.data_key === 'ezcubic_tenants' && record.data?.value) {
                const cloudTenants = record.data.value;
                const localTenants = JSON.parse(localStorage.getItem('ezcubic_tenants') || '{}');
                
                if (isLoggedIn && !isFounder && currentTenantId) {
                    // Admin: Only their tenant
                    if (cloudTenants[currentTenantId]) {
                        localTenants[currentTenantId] = cloudTenants[currentTenantId];
                    }
                } else {
                    // Founder or login page: All tenants
                    Object.assign(localTenants, cloudTenants);
                }
                
                localStorage.setItem('ezcubic_tenants', JSON.stringify(localTenants));
                tenantsFound = Object.keys(localTenants).length;
            }
        }
        
        // CRITICAL: Ensure founder exists after sync
        if (typeof ensureFounderExists === 'function') {
            ensureFounderExists();
        }
        
        if (usersFound > 0) {
            const roleInfo = isLoggedIn 
                ? (isFounder ? '👑 Full Access' : '🔒 Tenant Only') 
                : '🔑 Login Credentials';
            // Silent reload - no alert
            // alert('✅ Synced from cloud!\n\n' + roleInfo + '\n' + usersFound + ' users synced.\n\nPage will refresh...');
            location.reload();
        } else {
            // Even if no cloud users, ensure founder exists
            // Silent reload - no alert
            // alert('ℹ️ No cloud data found.\n\nUsing default Founder account.\n\nPage will refresh...');
            location.reload();
        }
        
    } catch (err) {
        alert('❌ Error: ' + err.message);
        if (btn) {
            btn.innerHTML = originalText;
            btn.style.pointerEvents = '';
        }
    }
};

// Toggle Company Code sync panel on login page
window.toggleCompanyCodeSync = function() {
    const panel = document.getElementById('companyCodeSync');
    if (panel) {
        panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
        if (panel.style.display === 'block') {
            document.getElementById('companyCodeInput')?.focus();
        }
    }
};

// Sync by Company Code - only downloads users from that specific tenant
window.syncByCompanyCode = async function() {
    const codeInput = document.getElementById('companyCodeInput');
    const code = (codeInput?.value || '').trim().toUpperCase();
    
    if (!code || code.length < 4) {
        alert('⚠️ Please enter a valid Company Code');
        return;
    }
    
    // Show loading
    const btn = event?.target?.closest('button');
    const originalText = btn ? btn.innerHTML : '';
    if (btn) {
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        btn.disabled = true;
    }
    
    
    try {
        // Wait for Supabase SDK
        let retries = 0;
        while (!window.supabase?.createClient && retries < 10) {
            await new Promise(r => setTimeout(r, 300));
            retries++;
        }
        
        if (!window.supabase?.createClient) {
            alert('❌ Cloud service not ready. Please refresh and try again.');
            resetBtn();
            return;
        }
        
        const client = getUsersSupabaseClient();
        
        // Get tenants and users from cloud
        const { data, error } = await client.from('tenant_data')
            .select('*')
            .eq('tenant_id', 'global');
        
        if (error) {
            alert('❌ Sync failed: ' + error.message);
            resetBtn();
            return;
        }
        
        // Find tenant by Company Code
        let targetTenantId = null;
        let targetTenantInfo = null;
        let cloudTenants = {};
        let cloudUsers = [];
        
        for (const record of data || []) {
            if (record.data_key === 'ezcubic_tenants' && record.data?.value) {
                cloudTenants = record.data.value;
                
                // Find tenant matching the Company Code
                for (const [tenantId, tenant] of Object.entries(cloudTenants)) {
                    if (tenant.companyCode && tenant.companyCode.toUpperCase() === code) {
                        targetTenantId = tenantId;
                        targetTenantInfo = tenant;
                        break;
                    }
                }
            }
            if (record.data_key === 'ezcubic_users' && record.data?.value) {
                cloudUsers = record.data.value;
            }
        }
        
        if (!targetTenantId) {
            alert('❌ Company Code not found: ' + code + '\n\nPlease check with your Admin for the correct code.');
            resetBtn();
            return;
        }
        
        console.log('🏢 Found company:', targetTenantInfo.businessName, '(' + targetTenantId + ')');
        
        // Filter users to only this tenant
        const tenantUsers = cloudUsers.filter(u => u.tenantId === targetTenantId);
        
        if (tenantUsers.length === 0) {
            alert('⚠️ No users found for this company.\n\nAsk your Admin to create your account first.');
            resetBtn();
            return;
        }
        
        // Save filtered users locally
        const localUsers = JSON.parse(localStorage.getItem('ezcubic_users') || '[]');
        tenantUsers.forEach(cu => {
            const existingIdx = localUsers.findIndex(lu => lu.id === cu.id || lu.email === cu.email);
            if (existingIdx === -1) {
                localUsers.push(cu);
            } else {
                localUsers[existingIdx] = { ...localUsers[existingIdx], ...cu };
            }
        });
        localStorage.setItem('ezcubic_users', JSON.stringify(localUsers));
        
        // Save tenant info
        const localTenants = JSON.parse(localStorage.getItem('ezcubic_tenants') || '{}');
        localTenants[targetTenantId] = targetTenantInfo;
        localStorage.setItem('ezcubic_tenants', JSON.stringify(localTenants));
        
        // Ensure founder account exists (for fallback login)
        if (typeof ensureFounderExists === 'function') {
            ensureFounderExists();
        }
        
        console.log('✅ Synced', tenantUsers.length, 'users from', targetTenantInfo.businessName);
        
        alert('✅ Synced successfully!\n\n🏢 ' + targetTenantInfo.businessName + '\n👥 ' + tenantUsers.length + ' user(s) synced\n\nYou can now login with your account.');
        location.reload();
        
    } catch (err) {
        console.error('❌ Sync error:', err);
        alert('❌ Error: ' + err.message);
        resetBtn();
    }
    
    function resetBtn() {
        if (btn) {
            btn.innerHTML = originalText;
            btn.disabled = false;
        }
    }
};

// Get Company Code for current tenant (for Admin to share)
window.getCompanyCode = function() {
    const currentUser = JSON.parse(localStorage.getItem('ezcubic_current_user') || '{}');
    if (!currentUser.tenantId) {
        console.log('❌ No tenant found');
        return null;
    }
    
    const tenants = JSON.parse(localStorage.getItem('ezcubic_tenants') || '{}');
    const tenant = tenants[currentUser.tenantId];
    
    if (!tenant) {
        console.log('❌ Tenant not found');
        return null;
    }
    
    // Generate code if missing
    if (!tenant.companyCode) {
        tenant.companyCode = generateCompanyCode();
        tenants[currentUser.tenantId] = tenant;
        localStorage.setItem('ezcubic_tenants', JSON.stringify(tenants));
        console.log('🆕 Generated new Company Code');
    }
    
    console.log('═══════════════════════════════════════');
    console.log('🏢 Company Code for:', tenant.businessName);
    console.log('═══════════════════════════════════════');
    console.log('   📋 ' + tenant.companyCode);
    console.log('═══════════════════════════════════════');
    console.log('Share this code with your staff so they');
    console.log('can sync their devices to login.');
    console.log('═══════════════════════════════════════');
    
    return tenant.companyCode;
};

// Regenerate Company Code (if leaked)
window.regenerateCompanyCode = function() {
    const currentUser = JSON.parse(localStorage.getItem('ezcubic_current_user') || '{}');
    if (!currentUser.tenantId) {
        console.log('❌ No tenant found');
        return null;
    }
    
    if (!['founder', 'business_admin'].includes(currentUser.role)) {
        console.log('❌ Only Admin/Founder can regenerate Company Code');
        return null;
    }
    
    const tenants = JSON.parse(localStorage.getItem('ezcubic_tenants') || '{}');
    const tenant = tenants[currentUser.tenantId];
    
    if (!tenant) {
        console.log('❌ Tenant not found');
        return null;
    }
    
    const oldCode = tenant.companyCode;
    tenant.companyCode = generateCompanyCode();
    tenants[currentUser.tenantId] = tenant;
    localStorage.setItem('ezcubic_tenants', JSON.stringify(tenants));
    
    console.log('✅ Company Code regenerated!');
    console.log('   Old:', oldCode);
    console.log('   New:', tenant.companyCode);
    console.log('⚠️ Remember to run fullCloudSync() to update cloud!');
    
    return tenant.companyCode;
};

// ==================== COMPANY CODE UI FUNCTIONS ====================

// Initialize Company Code section in Settings
window.initCompanyCodeUI = function() {
    const currentUser = JSON.parse(localStorage.getItem('ezcubic_current_user') || '{}');
    const section = document.getElementById('companyCodeSection');
    const display = document.getElementById('companyCodeDisplay');
    
    if (!section) return;
    
    // Only show for Founder and Business Admin
    if (!['founder', 'business_admin'].includes(currentUser.role)) {
        section.style.display = 'none';
        return;
    }
    
    section.style.display = 'block';
    
    // Get or generate company code
    const tenants = JSON.parse(localStorage.getItem('ezcubic_tenants') || '{}');
    const tenant = tenants[currentUser.tenantId];
    
    if (tenant) {
        if (!tenant.companyCode) {
            tenant.companyCode = generateCompanyCode();
            tenants[currentUser.tenantId] = tenant;
            localStorage.setItem('ezcubic_tenants', JSON.stringify(tenants));
        }
        if (display) {
            display.textContent = tenant.companyCode;
        }
    } else {
        if (display) {
            display.textContent = 'N/A';
        }
    }
};

// Copy Company Code to clipboard
window.copyCompanyCode = function() {
    const display = document.getElementById('companyCodeDisplay');
    const code = display?.textContent;
    
    if (!code || code === '----' || code === 'N/A') {
        alert('⚠️ No Company Code available');
        return;
    }
    
    navigator.clipboard.writeText(code).then(() => {
        // Show feedback
        const btn = event?.target?.closest('button');
        if (btn) {
            const originalHTML = btn.innerHTML;
            btn.innerHTML = '<i class="fas fa-check"></i> Copied!';
            btn.style.background = '#10b981';
            setTimeout(() => {
                btn.innerHTML = originalHTML;
                btn.style.background = '#0ea5e9';
            }, 2000);
        }
    }).catch(() => {
        // Fallback for older browsers
        const textarea = document.createElement('textarea');
        textarea.value = code;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        alert('📋 Copied: ' + code);
    });
};

// Regenerate Company Code from UI
window.regenerateCompanyCodeUI = function() {
    if (!confirm('⚠️ Regenerate Company Code?\n\nThis will invalidate the old code.\nStaff with the old code will need the new one to sync.\n\nContinue?')) {
        return;
    }
    
    const newCode = regenerateCompanyCode();
    
    if (newCode) {
        const display = document.getElementById('companyCodeDisplay');
        if (display) {
            display.textContent = newCode;
            display.style.animation = 'pulse 0.5s ease';
            setTimeout(() => display.style.animation = '', 500);
        }
        
        // Prompt to sync to cloud
        if (confirm('✅ New Company Code: ' + newCode + '\n\nSync to cloud now?\n(Required for staff to use the new code)')) {
            if (typeof fullCloudSync === 'function') {
                fullCloudSync();
            } else if (typeof window.fullCloudSync === 'function') {
                window.fullCloudSync();
            } else {
                alert('Run fullCloudSync() in console to sync the new code to cloud.');
            }
        }
    }
};

// Call initCompanyCodeUI when Settings section is shown
const originalShowSection = window.showSection;
window.showSection = function(sectionId) {
    if (originalShowSection) {
        originalShowSection(sectionId);
    }
    if (sectionId === 'settings') {
        setTimeout(initCompanyCodeUI, 100);
        // Lock settings for staff/manager
        setTimeout(lockSettingsForStaffManager, 150);
    }
};

// Lock Company Settings for Staff/Manager - they can view but not edit
function lockSettingsForStaffManager() {
    const currentUser = JSON.parse(localStorage.getItem('ezcubic_current_user') || '{}');
    if (currentUser.role !== 'staff' && currentUser.role !== 'manager') return;
    
    // Get the settings section
    const settingsSection = document.getElementById('settings');
    if (!settingsSection) return;
    
    // Add warning banner
    const existingBanner = document.getElementById('settingsLockBanner');
    if (!existingBanner) {
        const cardHeader = settingsSection.querySelector('.card-header');
        if (cardHeader) {
            const banner = document.createElement('div');
            banner.id = 'settingsLockBanner';
            banner.style.cssText = 'background: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 12px 16px; margin: 15px 0; display: flex; align-items: center; gap: 10px;';
            banner.innerHTML = `
                <i class="fas fa-lock" style="color: #d97706; font-size: 18px;"></i>
                <div>
                    <strong style="color: #92400e;">View Only Mode</strong>
                    <p style="margin: 0; font-size: 12px; color: #78350f;">Only the Business Admin can modify company settings.</p>
                </div>
            `;
            cardHeader.after(banner);
        }
    }
    
    // Disable all input fields
    const inputs = settingsSection.querySelectorAll('input, select, textarea');
    inputs.forEach(input => {
        input.disabled = true;
        input.style.cursor = 'not-allowed';
        input.style.opacity = '0.7';
    });
    
    // Disable save button
    const saveBtn = settingsSection.querySelector('button[onclick="saveSettings()"]');
    if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.style.cursor = 'not-allowed';
        saveBtn.style.opacity = '0.5';
        saveBtn.title = 'Only Business Admin can save settings';
    }
    
    // Disable logo upload buttons
    const uploadBtns = settingsSection.querySelectorAll('button');
    uploadBtns.forEach(btn => {
        if (btn.textContent.includes('Upload') || btn.querySelector('.fa-upload') || btn.querySelector('.fa-trash')) {
            btn.disabled = true;
            btn.style.cursor = 'not-allowed';
            btn.style.opacity = '0.5';
        }
    });
}

// ==================== FACTORY RESET FUNCTIONS ====================

/**
 * FACTORY RESET - Clears everything and starts fresh with only Founder
 * Run in console: factoryReset()
 * 
 * This will:
 * 1. Clear ALL users except founder from local storage
 * 2. Clear ALL tenants except founder's tenant
 * 3. Clear ALL cloud data (users, tenants)
 * 4. Reset to fresh founder-only state
 */
window.factoryReset = async function() {
    console.log('');
    console.log('═══════════════════════════════════════════════════');
    console.log('  🔴 FACTORY RESET - DANGER ZONE');
    console.log('═══════════════════════════════════════════════════');
    console.log('');
    console.log('  This will DELETE:');
    console.log('  • All user accounts (except founder)');
    console.log('  • All tenants/businesses (except founder)');
    console.log('  • All cloud data');
    console.log('');
    console.log('  To confirm, run: confirmFactoryReset()');
    console.log('');
    console.log('═══════════════════════════════════════════════════');
};

window.confirmFactoryReset = async function() {
    if (!confirm('⚠️ FACTORY RESET ⚠️\n\nThis will DELETE all accounts and data!\n\nOnly the Founder account will remain.\n\nAre you ABSOLUTELY sure?')) {
        console.log('❌ Factory reset cancelled');
        return;
    }
    
    if (!confirm('🔴 FINAL WARNING 🔴\n\nThis action CANNOT be undone!\n\nType "RESET" in the next prompt to confirm...')) {
        console.log('❌ Factory reset cancelled');
        return;
    }
    
    const confirmation = prompt('Type RESET to confirm factory reset:');
    if (confirmation !== 'RESET') {
        console.log('❌ Factory reset cancelled - confirmation not matched');
        alert('Factory reset cancelled');
        return;
    }
    
    console.log('🔄 Starting factory reset...');
    
    try {
        // Step 1: Create fresh founder account
        const freshFounder = {
            id: 'founder_001',
            email: 'founder@ezcubic.com',
            password: 'founder123',
            name: 'Founder',
            role: 'founder',
            status: 'active',
            permissions: ['all'],
            tenantId: 'tenant_founder',
            createdAt: new Date().toISOString(),
            createdBy: 'system'
        };
        
        // Step 2: Create fresh founder tenant
        const freshTenants = {
            'tenant_founder': {
                id: 'tenant_founder',
                ownerId: 'founder_001',
                businessName: "Founder's Business",
                companyCode: generateCompanyCode(),
                createdAt: new Date().toISOString(),
                status: 'active'
            }
        };
        
        // Step 3: Clear local storage
        console.log('  📦 Clearing local storage...');
        localStorage.setItem('ezcubic_users', JSON.stringify([freshFounder]));
        localStorage.setItem('ezcubic_tenants', JSON.stringify(freshTenants));
        localStorage.removeItem('ezcubic_current_user');
        localStorage.removeItem('ezcubic_session_token');
        localStorage.removeItem('ezcubic_sessions');
        
        // Clear all tenant data except founder's
        const keysToRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith('ezcubic_tenant_') && key !== 'ezcubic_tenant_tenant_founder') {
                keysToRemove.push(key);
            }
        }
        keysToRemove.forEach(key => localStorage.removeItem(key));
        console.log('  ✅ Local storage cleared');
        
        // Step 4: Clear cloud data
        console.log('  ☁️ Clearing cloud data...');
        
        if (window.supabase?.createClient) {
            const client = getUsersSupabaseClient();
            
            // Upload fresh users to cloud
            await client.from('tenant_data').upsert({
                tenant_id: 'global',
                data_key: 'ezcubic_users',
                data: { key: 'ezcubic_users', value: [freshFounder], synced_at: new Date().toISOString() },
                updated_at: new Date().toISOString()
            }, { onConflict: 'tenant_id,data_key' });
            
            // Upload fresh tenants to cloud
            await client.from('tenant_data').upsert({
                tenant_id: 'global',
                data_key: 'ezcubic_tenants',
                data: { key: 'ezcubic_tenants', value: freshTenants, synced_at: new Date().toISOString() },
                updated_at: new Date().toISOString()
            }, { onConflict: 'tenant_id,data_key' });
            
            console.log('  ✅ Cloud data reset');
        } else {
            console.warn('  ⚠️ Supabase not available - cloud not cleared');
        }
        
        // Step 5: Update local variables
        users = [freshFounder];
        currentUser = null;
        
        console.log('');
        console.log('═══════════════════════════════════════════════════');
        console.log('  ✅ FACTORY RESET COMPLETE');
        console.log('═══════════════════════════════════════════════════');
        console.log('');
        console.log('  Founder Account:');
        console.log('  📧 Email: founder@ezcubic.com');
        console.log('  🔑 Password: founder123');
        console.log('');
        console.log('  Company Code: ' + freshTenants['tenant_founder'].companyCode);
        console.log('');
        console.log('  Page will reload in 3 seconds...');
        console.log('═══════════════════════════════════════════════════');
        
        alert('✅ FACTORY RESET COMPLETE!\n\n📧 Email: founder@ezcubic.com\n🔑 Password: founder123\n\nPage will reload...');
        
        setTimeout(() => location.reload(), 3000);
        
    } catch (err) {
        console.error('❌ Factory reset failed:', err);
        alert('❌ Factory reset failed: ' + err.message);
    }
};

/**
 * View current state - for debugging
 * Run in console: viewCurrentState()
 */
window.viewCurrentState = function() {
    const users = JSON.parse(localStorage.getItem('ezcubic_users') || '[]');
    const tenants = JSON.parse(localStorage.getItem('ezcubic_tenants') || '{}');
    const currentUser = JSON.parse(localStorage.getItem('ezcubic_current_user') || '{}');
    
    console.log('');
    console.log('═══════════════════════════════════════════════════');
    console.log('  📊 CURRENT STATE');
    console.log('═══════════════════════════════════════════════════');
    console.log('');
    console.log('  👤 Current User:', currentUser.email || 'Not logged in');
    console.log('  📋 Role:', currentUser.role || 'N/A');
    console.log('  🏢 Tenant:', currentUser.tenantId || 'N/A');
    console.log('');
    console.log('  👥 Total Users:', users.length);
    users.forEach((u, i) => {
        console.log(`     ${i+1}. ${u.email} (${u.role}) - Tenant: ${u.tenantId || 'none'}`);
    });
    console.log('');
    console.log('  🏢 Total Tenants:', Object.keys(tenants).length);
    Object.values(tenants).forEach((t, i) => {
        console.log(`     ${i+1}. ${t.businessName} - Code: ${t.companyCode || 'N/A'}`);
    });
    console.log('');
    console.log('═══════════════════════════════════════════════════');
    
    return { users, tenants, currentUser };
};

/**
 * View cloud state - check what's in the cloud
 * Run in console: viewCloudState()
 */
window.viewCloudState = async function() {
    console.log('☁️ Fetching cloud state...');
    
    
    try {
        if (!window.supabase?.createClient) {
            console.log('❌ Supabase not loaded');
            return;
        }
        
        const client = getUsersSupabaseClient();
        
        const { data, error } = await client.from('tenant_data')
            .select('*')
            .eq('tenant_id', 'global');
        
        if (error) {
            console.error('❌ Error:', error.message);
            return;
        }
        
        console.log('');
        console.log('═══════════════════════════════════════════════════');
        console.log('  ☁️ CLOUD STATE');
        console.log('═══════════════════════════════════════════════════');
        
        for (const record of data || []) {
            if (record.data_key === 'ezcubic_users') {
                const cloudUsers = record.data?.value || [];
                console.log('');
                console.log('  👥 Cloud Users:', cloudUsers.length);
                cloudUsers.forEach((u, i) => {
                    console.log(`     ${i+1}. ${u.email} (${u.role})`);
                });
            }
            if (record.data_key === 'ezcubic_tenants') {
                const cloudTenants = record.data?.value || {};
                console.log('');
                console.log('  🏢 Cloud Tenants:', Object.keys(cloudTenants).length);
                Object.values(cloudTenants).forEach((t, i) => {
                    console.log(`     ${i+1}. ${t.businessName} - Code: ${t.companyCode || 'N/A'}`);
                });
            }
        }
        
        console.log('');
        console.log('  📅 Last sync:', data?.[0]?.data?.synced_at || 'Unknown');
        console.log('═══════════════════════════════════════════════════');
        
    } catch (err) {
        console.error('❌ Error:', err);
    }
};

// Initialize on load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeUserSystem);
} else {
    initializeUserSystem();
}
