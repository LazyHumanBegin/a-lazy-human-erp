/**
 * EZCubic - Core Authentication Functions - Split from users-auth.js v2.3.2
 * Core auth: SESSION_TIMEOUT_HOURS, initializeUserSystem, loadUsers, saveUsers,
 * migrateFounderData, login, tryLoginWithCloudSync, logout, checkSession
 */

// Session timeout in hours (24 hours by default)
const SESSION_TIMEOUT_HOURS = 24;

// ==================== INITIALIZATION ====================
function initializeUserSystem() {
    console.log('🔐 initializeUserSystem called');
    loadUsers();
    
    // Quick check - if no valid session, show login immediately (no flash)
    const sessionKey = window.CURRENT_USER_KEY || 'ezcubic_current_user';
    const session = localStorage.getItem(sessionKey);
    
    console.log('🔐 Session check:', { sessionKey, hasSession: !!session });
    
    let hasValidSession = false;
    if (session && session !== 'undefined' && session !== 'null') {
        try {
            const parsed = JSON.parse(session);
            hasValidSession = parsed && parsed.id;
            console.log('🔐 Parsed session:', { id: parsed?.id, hasValidSession });
        } catch (e) {
            console.warn('🔐 Session parse error:', e.message);
            localStorage.removeItem(sessionKey);
        }
    }
    
    if (!hasValidSession) {
        // No session - show login page immediately, hide app
        console.log('🔐 No valid session - showing login page');
        const appContainer = document.getElementById('appContainer');
        if (appContainer) appContainer.style.display = 'none';
        showLoginPage();
        return;
    }
    
    console.log('🔐 Valid session found - showing app');
    // Has session - show app container
    const appContainer = document.getElementById('appContainer');
    if (appContainer) appContainer.style.display = '';
    
    // Show mobile menu immediately
    const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
    if (mobileMenuBtn) mobileMenuBtn.style.display = '';
    
    // Hide tenant selector (should stay hidden)
    const tenantSelector = document.getElementById('tenantSelector');
    if (tenantSelector) tenantSelector.style.display = 'none';
    
    // Check session and update UI immediately
    checkSession();
    if (typeof updateAuthUI === 'function') {
        updateAuthUI();
    }
    
    // CLOUD SYNC: Try to sync users from cloud (background)
    // This ensures Phone B gets user01 created on Phone A
    // Use downloadUsersFromCloud (from users-cloud-core.js) or skip if not available
    const cloudSyncFn = window.downloadUsersFromCloud || (async () => {});
    cloudSyncFn().then(() => {
        // Reload users in case cloud had updates
        loadUsers();
        checkSession();
        if (typeof updateAuthUI === 'function') updateAuthUI();
    }).catch(() => {
        // Fallback - already handled above
    });
    
    // Start periodic session validation (every 30 seconds)
    startSessionValidation();
}

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

// Main login function - tries cloud sync first for multi-device support
function login(email, password) {
    console.log('🔐 Login attempt for:', email);
    
    // Show loading state - check both loginPageForm (full page) and loginForm (modal)
    const loginBtn = document.querySelector('#loginPageForm button[type="submit"], #loginForm button[type="submit"], .login-form button[type="submit"]');
    const originalBtnText = loginBtn ? loginBtn.innerHTML : '';
    if (loginBtn) {
        loginBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Checking...';
        loginBtn.disabled = true;
    }
    
    // Try to sync from cloud first, then attempt login
    tryLoginWithCloudSync(email, password).finally(() => {
        // Restore button state
        if (loginBtn) {
            loginBtn.innerHTML = originalBtnText || '<i class="fas fa-sign-in-alt"></i> Sign In';
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
        if (typeof window.downloadUsersFromCloud === 'function') {
            await window.downloadUsersFromCloud();
        }
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

// Helper function for resetting to empty data (placeholder - defined in data.js)
function resetToEmptyData() {
    // Placeholder - actual implementation may be in data module
    console.log('resetToEmptyData called - clearing business data arrays');
    window.transactions = [];
    window.bills = [];
    window.products = [];
    window.customers = [];
    window.stockMovements = [];
}

// Helper function for resetting window arrays only
function resetWindowArraysOnly() {
    // Reset all window-level data arrays
    console.log('resetWindowArraysOnly called');
    window.transactions = [];
    window.bills = [];
    window.products = [];
    window.customers = [];
    window.stockMovements = [];
    window.sales = [];
    window.purchaseOrders = [];
    window.quotations = [];
    window.invoices = [];
}

// Initialize empty tenant data (placeholder)
function initializeEmptyTenantData(tenantId, userName) {
    console.log('initializeEmptyTenantData called for:', tenantId);
    // Initialize empty data structures for new tenant
    resetWindowArraysOnly();
}

// ==================== WINDOW EXPORTS ====================
window.SESSION_TIMEOUT_HOURS = SESSION_TIMEOUT_HOURS;
window.initializeUserSystem = initializeUserSystem;
window.loadUsers = loadUsers;
window.saveUsers = saveUsers;
window.migrateFounderData = migrateFounderData;
window.checkSession = checkSession;
window.login = login;
window.tryLoginWithCloudSync = tryLoginWithCloudSync;
window.logout = logout;
window.resetToEmptyData = resetToEmptyData;
window.resetWindowArraysOnly = resetWindowArraysOnly;
window.initializeEmptyTenantData = initializeEmptyTenantData;

// NOTE: initializeUserSystem() is called from users-cloud-sync.js (last loaded users module)
// to ensure all user functions (showLoginPage, etc.) are available
