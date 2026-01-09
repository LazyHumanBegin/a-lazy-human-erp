/**
 * A Lazy Human - User Management & Access Control System
 * Role-based access control for multi-tenant ERP
 * Version: 2.3.0 - Modular architecture refactoring complete
 * 
 * This file now handles:
 * - User data storage and management
 * - Core user system initialization
 * - Auth UI updates
 * 
 * Functions moved to modules:
 * - Auth: js/auth/auth.js
 * - Permissions: js/permissions/permissions.js
 * - Tenant: js/tenant/tenant.js
 * - Guest: js/guest/guest.js
 * - User Management: js/user-management/*.js
 * - Cloud Sync Utils: js/cloud-sync-utils/cloud-sync-utils.js
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
            // Initialize with proper auth persistence settings
            _usersModuleSupabaseClient = window.supabase.createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.key, {
                auth: {
                    persistSession: true,
                    storageKey: 'ezcubic-supabase-auth',
                    storage: window.localStorage,
                    autoRefreshToken: true,
                    detectSessionInUrl: false
                }
            });
            console.log('🐱 Users module Supabase client initialized with auth persistence');
        }
    }
    return _usersModuleSupabaseClient;
}
// Expose globally for other modules
window.getUsersSupabaseClient = getUsersSupabaseClient;

// ==================== SESSION & PASSWORD ====================
// NOTE: Session and password functions are now in js/auth/auth.js
// Available: generateSessionToken(), hashPassword(), verifyPassword(), 
// isPasswordHashed(), hashPasswordSync()

// Generate unique Company Code for tenant (e.g., "ACME-7X2K")
// NOTE: generateCompanyCode() is now in js/tenant/tenant.js

// Default Founder Account (You)
const DEFAULT_FOUNDER = {
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

// Test accounts for development
const TEST_ACCOUNTS = [
    {
        id: 'test_123',
        email: '123@123',
        password: '123',
        name: 'Test User 123',
        role: 'owner',
        plan: 'professional',
        status: 'active',
        permissions: ['all'],
        tenantId: 'tenant_test123',
        createdAt: new Date().toISOString(),
        createdBy: 'system'
    },
    {
        id: 'test_321',
        email: '321@321',
        password: '321',
        name: 'Test User 321',
        role: 'owner',
        plan: 'starter',
        status: 'active',
        permissions: ['all'],
        tenantId: 'tenant_test321',
        createdAt: new Date().toISOString(),
        createdBy: 'system'
    }
];

// ==================== ROLES & MODULES ====================
// NOTE: ROLES, ERP_MODULE_CATEGORIES, and ERP_MODULES are now loaded from
// js/permissions/permissions.js - Do NOT redeclare them here!
// They are available via window.ROLES, window.ERP_MODULES, etc.

// User Data - exposed to window for auth.js
let users = [];
window.users = users; // CRITICAL: Expose to window for auth.js module
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
    
    // CRITICAL: Set loading flag EARLY to prevent initializeApp from proceeding
    // before tenant data is loaded. This flag is cleared in loadUserTenantData().
    window._isLoadingUserData = true;
    
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

// NOTE: startSessionValidation() is now in js/auth/auth.js

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
    
    // Ensure test accounts exist (for development)
    TEST_ACCOUNTS.forEach(testUser => {
        if (!users.find(u => u.email === testUser.email)) {
            users.push(testUser);
        }
    });
    saveUsers();
    
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
                    // Call window.migrateFounderData from tenant.js
                    if (typeof window.migrateFounderData === 'function') {
                        window.migrateFounderData(founder.tenantId);
                    }
                }
            } catch(e) {
                console.error('Error parsing tenant data, re-migrating...', e);
                // Call window.migrateFounderData from tenant.js
                if (typeof window.migrateFounderData === 'function') {
                    window.migrateFounderData(founder.tenantId);
                }
            }
        }
    }
}

// NOTE: migrateFounderData() is now in js/tenant/tenant.js

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
                
                // Get deleted users and tenants list to filter them out
                const deletedUsers = JSON.parse(localStorage.getItem('ezcubic_deleted_users') || '[]');
                const deletedTenants = JSON.parse(localStorage.getItem('ezcubic_deleted_tenants') || '[]');
                console.log('🗑️ Deleted users to filter:', deletedUsers.length);
                console.log('🗑️ Deleted tenants to filter:', deletedTenants.length);
                
                // Merge cloud users with local
                const localUsers = JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
                const userMap = new Map();
                
                // Add local users first (skip deleted users and users from deleted tenants)
                localUsers.forEach(u => {
                    const isUserDeleted = deletedUsers.includes(u.id) || deletedUsers.includes(u.email);
                    const isTenantDeleted = u.tenantId && deletedTenants.includes(u.tenantId);
                    if (!isUserDeleted && !isTenantDeleted) {
                        userMap.set(u.id, u);
                    } else if (isTenantDeleted) {
                        console.log('🗑️ Skipping user from deleted tenant:', u.email);
                    }
                });
                
                // Merge cloud users - ALWAYS take admin-controlled fields from cloud
                // Admin-controlled: plan, role, status (only founder/admin can change these)
                // BUT skip deleted users and users from deleted tenants!
                for (const cloudUser of cloudUsers) {
                    // Skip if this user was deleted
                    const isUserDeleted = deletedUsers.includes(cloudUser.id) || deletedUsers.includes(cloudUser.email);
                    const isTenantDeleted = cloudUser.tenantId && deletedTenants.includes(cloudUser.tenantId);
                    if (isUserDeleted) {
                        console.log('🗑️ Skipping deleted user from cloud:', cloudUser.email);
                        continue;
                    }
                    if (isTenantDeleted) {
                        console.log('🗑️ Skipping user from deleted tenant:', cloudUser.email);
                        continue;
                    }
                    
                    const localUser = userMap.get(cloudUser.id);
                    if (!localUser) {
                        userMap.set(cloudUser.id, cloudUser);
                        console.log('👤 Added from cloud:', cloudUser.email);
                    } else {
                        // ALWAYS apply admin-controlled fields from cloud
                        // These can only be changed by founder/admin in Platform Control
                        const mergedUser = {
                            ...localUser,   // Keep local data as base
                            ...cloudUser,   // Apply cloud updates
                            // For permissions: admin sets these, so prefer cloud
                            // unless it's a staff/manager who had custom permissions set locally
                            permissions: (localUser.role === 'staff' || localUser.role === 'manager') 
                                && localUser.permissions?.length > 0 
                                ? localUser.permissions 
                                : cloudUser.permissions || localUser.permissions
                        };
                        userMap.set(cloudUser.id, mergedUser);
                        
                        // Log plan changes
                        if (localUser.plan !== cloudUser.plan) {
                            console.log(`🔄 Plan updated from cloud: ${cloudUser.email} ${localUser.plan} → ${cloudUser.plan}`);
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

// NOTE: downloadTenantInfoFromCloud() is now in js/tenant/tenant.js

// NOTE: downloadTenantFromCloud() is now in js/tenant/tenant.js

// ==================== AUTHENTICATION ====================
// NOTE: Authentication functions are now in js/auth/auth.js
// Available: login(), logout(), checkSession(), showLoginPage(), hideLoginPage(),
// showLoginModal(), closeLoginModal(), generateSessionToken(), validateSessionToken(),
// hashPassword(), verifyPassword(), etc.

// NOTE: loadUserTenantData() is now in js/tenant/tenant.js

// NOTE: logout() and logSession() are now in js/auth/auth.js

// ==================== UI UPDATES ====================
function updateAuthUI() {
    const authContainer = document.getElementById('authContainer');
    const userMenuContainer = document.getElementById('userMenuContainer');
    
    // Platform Admin nav elements
    const platformAdminNav = document.getElementById('platformAdminNav');
    const userManagementNav = document.getElementById('userManagementNav');
    const platformControlNav = document.getElementById('platformControlNav');
    const tenantSelector = document.getElementById('tenantSelector');
    
    // CRITICAL: Use window.currentUser as auth.js sets that, not local currentUser
    const user = window.currentUser || currentUser;
    
    if (user) {
        // Sync local variable with window
        currentUser = user;
        
        // Show/hide Platform Admin nav based on role
        const isPlatformAdmin = user.role === 'founder' || user.role === 'erp_assistant';
        const isFounder = user.role === 'founder';
        const isBusinessAdmin = user.role === 'business_admin';
        const hasLHDNPermission = user.role === 'manager' && 
            user.permissions && 
            user.permissions.includes('lhdn-export');
        
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
        // Tenant selector hidden - use Platform Control instead
        if (tenantSelector) {
            tenantSelector.style.display = 'none';
        }
        
        // Show/hide LHDN Export nav based on role AND plan
        const lhdnExportNav = document.getElementById('lhdnExportNav');
        if (lhdnExportNav) {
            // Check if user's plan includes LHDN Export feature
            const userPlan = user.plan || 'personal';
            const lhdnPlans = ['starter', 'professional', 'premium'];
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
                        <a href="#" onclick="showChangePasswordModal(); closeUserMenu(); return false;">
                            <i class="fas fa-key"></i> Change Password
                        </a>
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
            
            // DON'T reset data here - it's already loaded by loadUserTenantData
            // resetToEmptyData() was wiping localStorage on every page load!
            // if (typeof resetToEmptyData === 'function') {
            //     resetToEmptyData();
            // }
        }
        
        // Load tenant data (not for ERP Assistants - they only manage users)
        if (currentUser.role !== 'erp_assistant' && typeof window.loadCurrentTenantData === 'function') {
            window.loadCurrentTenantData();
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

function showChangePasswordModal() {
    if (!window.currentUser) {
        showToast('You must be logged in to change password', 'error');
        return;
    }

    // Remove existing modal if any
    document.getElementById('changePasswordModal')?.remove();

    const modalHTML = `
        <div class="modal show" id="changePasswordModal" style="z-index: 10000;">
            <div class="modal-content" style="max-width: 450px;">
                <div class="modal-header">
                    <h3 class="modal-title"><i class="fas fa-key"></i> Change Password</h3>
                    <button class="modal-close" onclick="closeModal('changePasswordModal')">&times;</button>
                </div>
                <form onsubmit="handleChangePassword(event)">
                    <div class="form-group">
                        <label class="form-label">Current Password *</label>
                        <input type="password" id="currentPassword" class="form-control" required 
                               placeholder="Enter current password" autocomplete="current-password">
                    </div>
                    <div class="form-group">
                        <label class="form-label">New Password *</label>
                        <input type="password" id="newPassword" class="form-control" required 
                               placeholder="Min 6 characters" minlength="6" autocomplete="new-password">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Confirm New Password *</label>
                        <input type="password" id="confirmPassword" class="form-control" required 
                               placeholder="Re-enter new password" autocomplete="new-password">
                    </div>
                    <div class="modal-actions">
                        <button type="button" class="btn-secondary" onclick="closeModal('changePasswordModal')">
                            Cancel
                        </button>
                        <button type="submit" class="btn-primary">
                            <i class="fas fa-check"></i> Update Password
                        </button>
                    </div>
                </form>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

function handleChangePassword(event) {
    event.preventDefault();

    const currentPassword = document.getElementById('currentPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;

    // Validate current password
    if (window.currentUser.password !== currentPassword) {
        showToast('Current password is incorrect', 'error');
        return;
    }

    // Validate new passwords match
    if (newPassword !== confirmPassword) {
        showToast('New passwords do not match', 'error');
        return;
    }

    // Validate new password length
    if (newPassword.length < 6) {
        showToast('New password must be at least 6 characters', 'error');
        return;
    }

    // Don't allow same password
    if (newPassword === currentPassword) {
        showToast('New password must be different from current password', 'error');
        return;
    }

    // Update password
    const userIndex = window.users.findIndex(u => u.id === window.currentUser.id);
    if (userIndex === -1) {
        showToast('User not found', 'error');
        return;
    }

    window.users[userIndex].password = newPassword;
    window.users[userIndex].updatedAt = new Date().toISOString();
    window.currentUser.password = newPassword;

    // Save to localStorage
    saveUsers();

    // Update in localStorage current user
    localStorage.setItem('ezcubic_currentUser', JSON.stringify(window.currentUser));

    // Sync to cloud
    if (typeof window.directUploadUsersToCloud === 'function') {
        window.directUploadUsersToCloud(false).then(() => {
            console.log('☁️ Password change synced to cloud');
        }).catch(err => {
            console.warn('⚠️ Failed to sync password to cloud:', err);
        });
    }

    closeModal('changePasswordModal');
    showToast('Password updated successfully!', 'success');
}

// Close dropdown when clicking outside
document.addEventListener('click', (e) => {
    if (!e.target.closest('.user-menu')) {
        closeUserMenu();
    }
});

// ==================== PERMISSIONS ====================
// NOTE: Permission functions are now in js/permissions/permissions.js
// Functions available globally: canAccessModule(), canManageRole(), applyUserPermissions(),
// hideBusinessNavSeparators(), showAllNavSeparators(), getOwnerPlanFeatures(), applyOwnerPlanRestrictions()
// Constants available: ROLES, ERP_MODULES, ERP_MODULE_CATEGORIES

// NOTE: Login page functions are now in js/auth/auth.js
// Functions available: showLoginPage(), hideLoginPage(), showLoginView(), showRegisterView(), 
// showForgotPasswordView(), handleLoginPage(), handleRegisterPage(), verifyForgotEmail(), executePagePasswordReset()

// NOTE: Login modal functions are now in js/auth/auth.js
// Functions available: showLoginModal(), closeLoginModal(), handleLogin(), showForgotPassword(),
// closeForgotPasswordModal(), verifyResetEmail(), executePasswordReset()

// ==================== USER MANAGEMENT ====================
// NOTE: User Management functions have been moved to js/user-management/ module
// Part A (user-management.js): showUserManagement(), renderUserManagement(), renderUserCard(),
//   switchUserMgmtTab(), toggleFilterDropdown(), clearFilters(), filterFounderUserList()
// Part B (user-management-crud.js): highlightSelectedPlan(), autoSelectModulesForPlan(),
//   showAddUserModal(), saveNewUser(), togglePermissionCategory(), toggleCategoryModules(),
//   updateCategoryCount(), toggleFullAccess(), editUser(), updateUser()
// Part C (user-management-actions.js): toggleUserStatus(), deleteUser(), confirmDeleteUser(),
//   executeDeleteUser(), showUserLimitModal(), showUserDetailModal(), exportUserList()

// ==================== EXPORTS ====================
window.initializeUserSystem = initializeUserSystem;
window.loadUsers = loadUsers;
window.toggleUserMenu = toggleUserMenu;
window.closeUserMenu = closeUserMenu;
window.showChangePasswordModal = showChangePasswordModal;
window.handleChangePassword = handleChangePassword;
// NOTE: login(), logout() are now exported from js/auth/auth.js
// NOTE: Permission functions are now exported from js/permissions/permissions.js
// NOTE: User Management functions now exported from js/user-management/*.js
window.currentUser = currentUser;
// NOTE: Guest mode functions now exported from js/guest/guest.js
// Available: applyGuestPreviewMode, applyViewOnlyMode, removeViewOnlyMode, showGuestBadge,
// showFreeRegistrationModal, closeFreeRegisterModal, handleFreeRegistration, checkGuestAccess, isGuestMode

// NOTE: Tenant functions now exported from js/tenant/tenant.js
// Available: initializeEmptyTenantData, resetToEmptyData, loadUserTenantData, resetWindowArraysOnly,
// migrateFounderData, syncTenantDataToCloud, downloadTenantFromCloud, generateCompanyCode

// NOTE: Login page exports are now in js/auth/auth.js
// (showLoginPage, hideLoginPage, handleLoginPage, showLoginView, showRegisterView, 
// showForgotPasswordView, handleRegisterPage, verifyForgotEmail, executePagePasswordReset)

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
            alert('✅ Downloaded ' + cloudUsers.length + ' cloud users. Merged to ' + merged.length + ' total.');
        } else {
            // Upload local to cloud
            await client.from('tenant_data')
                .upsert({
                    tenant_id: 'global',
                    data_key: 'ezcubic_users',
                    data: { value: localUsers },
                    updated_at: new Date().toISOString()
                });
            alert('✅ Uploaded ' + localUsers.length + ' local users to cloud.');
        }
    } catch (err) {
        alert('❌ Sync error: ' + err.message);
        console.error('Debug sync error:', err);
    }
}

window.debugSyncFromLoginPage = debugSyncFromLoginPage;

// ==================== ADDITIONAL UTILITIES ====================
// NOTE: The following duplicate User Management functions have been removed.
// They are now in js/user-management/*.js modules:
// - showUserManagement, renderUserManagement, renderUserCard (Part A)
// - showAddUserModal, saveNewUser, editUser, updateUser (Part B)  
// - toggleUserStatus, deleteUser, showUserLimitModal, showUserDetailModal, exportUserList (Part C)
// - highlightSelectedPlan, autoSelectModulesForPlan, togglePermissionCategory, etc.

// NOTE: These window exports are now handled by user-management/*.js modules

// Permission constants and functions now exported from js/permissions/permissions.js
// Available: ROLES, ERP_MODULES, ERP_MODULE_CATEGORIES, canAccessModule, canManageRole
window.currentUser = currentUser;

// Initialize on load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeUserSystem);
} else {
    initializeUserSystem();
}

