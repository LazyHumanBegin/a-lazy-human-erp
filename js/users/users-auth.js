/**
 * EZCubic - User Authentication Module
 * Login, logout, session management
 * Version: 2.2.5 - Split from users.js
 */

// Session timeout in hours (24 hours by default)
const SESSION_TIMEOUT_HOURS = 24;

// Periodic session validation for single-device login
let sessionValidationInterval = null;

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
    
    // ONLY reset data if switching to a DIFFERENT tenant
    if (!isSameTenant) {
        console.log('Different tenant - resetting data');
        resetToEmptyData();
    } else {
        console.log('Same tenant (page refresh) - preserving localStorage, only resetting window arrays');
        resetWindowArraysOnly();
    }
    
    if (tenantData) {
        console.log('Loading tenant data for:', user.tenantId);
        
        // Load all tenant data into window and businessData objects
        // (Full implementation in original file - this is abbreviated for the split)
        loadTenantDataToGlobals(tenantData, isSameTenant, tenantKey, user);
    } else {
        console.log('No tenant data found, initializing empty data for:', user.tenantId);
        initializeEmptyTenantData(user.tenantId, user.name);
        resetWindowArraysToEmpty();
        
        // Update company name even for empty tenant
        if (typeof updateCompanyNameInUI === 'function') updateCompanyNameInUI();
        
        // Clear the loading flag
        window._isLoadingUserData = false;
    }
}

// Helper to load tenant data into global variables
function loadTenantDataToGlobals(tenantData, isSameTenant, tenantKey, user) {
    // SMART MERGE: For page refresh, localStorage might have newer data
    const mergeWithLocalStorage = (tenantArray, localStorageKey) => {
        const localData = JSON.parse(localStorage.getItem(localStorageKey) || '[]');
        const tenantLen = (tenantArray || []).length;
        const localLen = localData.length;
        if (localLen > tenantLen || tenantLen === 0) {
            console.log(`Using localStorage for ${localStorageKey}: ${localLen} items (tenant had ${tenantLen})`);
            return localData;
        }
        return tenantArray || [];
    };
    
    // Get merged data
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
    
    // Update global arrays
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
    
    // Save to legacy storage keys for compatibility
    localStorage.setItem('ezcubic_products', JSON.stringify(mergedProducts));
    localStorage.setItem('ezcubic_customers', JSON.stringify(mergedCustomers));
    localStorage.setItem('ezcubic_suppliers', JSON.stringify(mergedSuppliers));
    localStorage.setItem('ezcubic_branches', JSON.stringify(mergedBranches));
    localStorage.setItem('ezcubic_quotations', JSON.stringify(mergedQuotations));
    localStorage.setItem('ezcubic_projects', JSON.stringify(mergedProjects));
    localStorage.setItem('ezcubic_stock_movements', JSON.stringify(mergedStockMovements));
    localStorage.setItem('ezcubic_sales', JSON.stringify(mergedSales));
    localStorage.setItem('ezcubic_crm_customers', JSON.stringify(mergedCRMCustomers));
    localStorage.setItem('ezcubic_employees', JSON.stringify(mergedEmployees));
    localStorage.setItem('ezcubic_orders', JSON.stringify(mergedOrders));
    localStorage.setItem('ezcubic_purchase_orders', JSON.stringify(mergedPurchaseOrders));
    
    // Also update ezcubicDataMY for compatibility
    localStorage.setItem('ezcubicDataMY', JSON.stringify({
        transactions: tenantData.transactions || [],
        bills: tenantData.bills || [],
        settings: tenantData.settings || businessData.settings,
        version: '2.0',
        lastSaved: new Date().toISOString()
    }));
    
    // Refresh UI after tenant data load
    setTimeout(() => {
        try {
            console.log('Refreshing all modules after tenant data load...');
            refreshAllModulesAfterTenantLoad();
        } catch (error) {
            console.error('Error refreshing modules after tenant load:', error);
        } finally {
            window._isLoadingUserData = false;
        }
    }, 200);
}

// Helper to refresh all modules after tenant data load
function refreshAllModulesAfterTenantLoad() {
    // Core modules
    if (typeof renderProducts === 'function') renderProducts();
    if (typeof loadBranches === 'function') loadBranches();
    if (typeof updateDashboard === 'function') updateDashboard();
    
    // Inventory module
    if (typeof loadProducts === 'function') loadProducts();
    if (typeof updateInventoryStats === 'function') updateInventoryStats();
    
    // POS module
    if (typeof loadPOSProducts === 'function') loadPOSProducts();
    if (typeof loadPOSCategories === 'function') loadPOSCategories();
    if (typeof loadPOSCustomers === 'function') loadPOSCustomers();
    if (typeof renderPOSProducts === 'function') renderPOSProducts();
    
    // Orders module
    if (typeof renderOrders === 'function') renderOrders();
    if (typeof updateOrderStats === 'function') updateOrderStats();
    
    // Quotations module
    if (typeof loadQuotations === 'function') loadQuotations();
    if (typeof renderQuotations === 'function') renderQuotations();
    
    // Projects module
    if (typeof loadProjects === 'function') loadProjects();
    if (typeof renderProjects === 'function') renderProjects();
    
    // CRM module
    if (typeof loadCRMCustomers === 'function') loadCRMCustomers();
    if (typeof renderCRMCustomers === 'function') renderCRMCustomers();
    
    // HR & Payroll modules
    if (typeof loadEmployees === 'function') loadEmployees();
    if (typeof loadPayrollRecords === 'function') loadPayrollRecords();
    
    // Update company name in UI
    if (typeof updateCompanyNameInUI === 'function') updateCompanyNameInUI();
    
    // Re-apply user permissions
    applyUserPermissions();
    updateAuthUI();
    
    // Force dashboard update
    if (typeof updateDashboard === 'function') updateDashboard();
    
    console.log('All modules refreshed');
}

// Helper to reset window arrays to empty
function resetWindowArraysToEmpty() {
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
    window.chartOfAccounts = [];
    window.journalEntries = [];
    window.crmCustomers = [];
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

// Helper function for resetting to empty data (placeholder - defined in data.js)
function resetToEmptyData() {
    if (typeof window.resetToEmptyData === 'function') {
        window.resetToEmptyData();
    }
}

// Helper function for resetting window arrays only (placeholder)
function resetWindowArraysOnly() {
    if (typeof window.resetWindowArraysOnly === 'function') {
        window.resetWindowArraysOnly();
    }
}

// Initialize empty tenant data (placeholder)
function initializeEmptyTenantData(tenantId, userName) {
    if (typeof window.initializeEmptyTenantData === 'function') {
        window.initializeEmptyTenantData(tenantId, userName);
    }
}

// ==================== WINDOW EXPORTS ====================
window.initializeUserSystem = initializeUserSystem;
window.startSessionValidation = startSessionValidation;
window.loadUsers = loadUsers;
window.saveUsers = saveUsers;
window.ensureFounderExists = ensureFounderExists;
window.migrateFounderData = migrateFounderData;
window.checkSession = checkSession;
window.validateSessionToken = validateSessionToken;
window.getCloudSessionToken = getCloudSessionToken;
window.saveCloudSessionToken = saveCloudSessionToken;
window.forceLogoutOtherDevice = forceLogoutOtherDevice;
window.login = login;
window.tryLoginWithCloudSync = tryLoginWithCloudSync;
window.loadUserTenantData = loadUserTenantData;
window.logout = logout;
window.logSession = logSession;
