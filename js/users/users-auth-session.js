/**
 * EZCubic - Session Management & Tenant Loading - Split from users-auth.js v2.3.2
 * Session management: startSessionValidation, validateSessionToken, getCloudSessionToken,
 * saveCloudSessionToken, forceLogoutOtherDevice, loadUserTenantData, loadTenantDataToGlobals,
 * refreshAllModulesAfterTenantLoad, resetWindowArraysToEmpty, logSession
 */

// Periodic session validation for single-device login
let sessionValidationInterval = null;

// ==================== SESSION VALIDATION ====================
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

// ==================== TENANT DATA LOADING ====================
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

// ==================== SESSION LOGGING ====================
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

// ==================== WINDOW EXPORTS ====================
window.startSessionValidation = startSessionValidation;
window.validateSessionToken = validateSessionToken;
window.getCloudSessionToken = getCloudSessionToken;
window.saveCloudSessionToken = saveCloudSessionToken;
window.forceLogoutOtherDevice = forceLogoutOtherDevice;
window.loadUserTenantData = loadUserTenantData;
window.loadTenantDataToGlobals = loadTenantDataToGlobals;
window.refreshAllModulesAfterTenantLoad = refreshAllModulesAfterTenantLoad;
window.resetWindowArraysToEmpty = resetWindowArraysToEmpty;
window.logSession = logSession;
