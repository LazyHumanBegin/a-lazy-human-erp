/**
 * Authentication Module for EZ.Smart v2.1
 * Extracted from users.js - Phase 3
 * 
 * This module handles:
 * - Session management (tokens, validation, timeout)
 * - Password hashing and verification
 * - Login/Logout functionality
 * - Login page UI (full screen)
 * - Login modal UI
 * - Password reset
 * - User registration
 * 
 * @version 1.0.2 - Fixed: Use window.* prefix for tenant functions
 * @requires users.js to be loaded first (for users array)
 */

// ==================== SESSION MANAGEMENT ====================

// Session timeout in hours (24 hours by default)
const SESSION_TIMEOUT_HOURS = 24;

// Storage keys (shared with users.js)
const AUTH_CURRENT_USER_KEY = 'ezcubic_current_user';
const AUTH_SESSION_TOKEN_KEY = 'ezcubic_session_token';

// Reference to users array from users.js (will be available when this module loads)
// Note: users.js must be loaded BEFORE auth.js
function getUsers() {
    return window.users || [];
}

/**
 * Generate unique session token for single-device login
 */
function generateSessionToken() {
    return 'sess_' + Date.now() + '_' + Math.random().toString(36).substring(2, 15);
}

/**
 * Start periodic session validation
 */
let sessionValidationInterval = null;

function startSessionValidation() {
    // Clear any existing interval
    if (sessionValidationInterval) {
        clearInterval(sessionValidationInterval);
    }
    
    // Validate session every 10 seconds for faster multi-device detection
    sessionValidationInterval = setInterval(() => {
        if (window.currentUser) {
            validateSessionToken(window.currentUser);
        }
    }, 10 * 1000); // 10 seconds (was 30)
}

/**
 * Check if session is valid and not expired
 */
function checkSession() {
    const session = localStorage.getItem(AUTH_CURRENT_USER_KEY);
    console.log('checkSession called, session exists:', !!session);
    
    if (session) {
        try {
            const userData = JSON.parse(session);
            console.log('Session data:', userData.email, userData.id);
            
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
            
            // Get users array from window (loaded by users.js) or from localStorage directly
            let users = window.users;
            if (!users || users.length === 0) {
                users = JSON.parse(localStorage.getItem('ezcubic_users') || '[]');
                console.log('Loaded users from localStorage, count:', users.length);
            }
            
            const user = users.find(u => u.id === userData.id && u.status === 'active');
            console.log('Found user in array:', !!user);
            
            if (user) {
                // CRITICAL: Set BOTH window.currentUser AND update users.js local variable
                window.currentUser = user;
                
                // CRITICAL: Update the cached session with fresh data from users array
                // This ensures plan upgrades from cloud are persisted to the session cache
                localStorage.setItem(AUTH_CURRENT_USER_KEY, JSON.stringify({
                    id: user.id,
                    email: user.email,
                    name: user.name,
                    role: user.role,
                    plan: user.plan,
                    tenantId: user.tenantId,
                    permissions: user.permissions,
                    loginTime: userData.loginTime // Preserve original login time
                }));
                console.log('✅ Session cache updated with fresh user data (plan:', user.plan, ')');
                
                // Load user's tenant data on session restore
                // MUST await to ensure data is loaded before UI renders
                if (typeof window.loadUserTenantData === 'function') {
                    window.loadUserTenantData(user).then(() => {
                        console.log('✅ Tenant data loaded for session restore');
                        // Apply permissions AFTER data is loaded
                        if (typeof applyUserPermissions === 'function') {
                            applyUserPermissions();
                        }
                        if (typeof resetNavCategoryStates === 'function') {
                            setTimeout(() => resetNavCategoryStates(), 100);
                        }
                    });
                }
                
                // Check session token for single-device login (async, non-blocking)
                // Validate immediately to catch multi-device logins faster
                validateSessionToken(user);
                
                return true;
            } else {
                console.warn('User not found in users array, checking localStorage directly');
                // User not in memory, but session exists - don't logout immediately
                // The session data itself contains enough to continue
                window.currentUser = {
                    id: userData.id,
                    email: userData.email,
                    name: userData.name,
                    role: userData.role,
                    plan: userData.plan,
                    tenantId: userData.tenantId,
                    status: 'active'
                };
                return true;
            }
        } catch (error) {
            console.error('Error checking session:', error);
            logout();
        }
    }
    return false;
}

/**
 * Validate session token against cloud - force logout if another device logged in
 */
async function validateSessionToken(user) {
    const localToken = localStorage.getItem(AUTH_SESSION_TOKEN_KEY);
    if (!localToken) return;
    
    try {
        const cloudToken = await getCloudSessionToken(user.id);
        
        if (cloudToken && cloudToken !== localToken) {
            console.log('⚠️ Session invalidated - another device logged in');
            forceLogoutOtherDevice();
        }
    } catch (err) {
        console.warn('Session validation error:', err);
    }
}

/**
 * Get session token from cloud storage
 */
async function getCloudSessionToken(userId) {
    try {
        let client = null;
        if (window.supabase && window.supabase.createClient && typeof getUsersSupabaseClient === 'function') {
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

/**
 * Save session token to cloud storage
 */
async function saveCloudSessionToken(userId, token, deviceInfo) {
    try {
        let client = null;
        if (window.supabase && window.supabase.createClient && typeof getUsersSupabaseClient === 'function') {
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

/**
 * Force logout when another device logs in
 */
function forceLogoutOtherDevice() {
    localStorage.removeItem(AUTH_CURRENT_USER_KEY);
    localStorage.removeItem(AUTH_SESSION_TOKEN_KEY);
    window.currentUser = null;
    
    // Reload chatbot for new (null) user context
    if (typeof reloadChatbotForUser === 'function') {
        reloadChatbotForUser();
    }
    
    alert('You have been logged out because your account was accessed from another device.');
    showLoginPage();
}

// ==================== PASSWORD HASHING ====================

/**
 * Secure password hashing using SHA-256 (async)
 */
async function hashPassword(password) {
    const encoder = new TextEncoder();
    const data = encoder.encode(password + 'ezcubic_salt_2024');
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex;
}

/**
 * Sync version of password hashing for backward compatibility
 */
function hashPasswordSync(password) {
    let hash = 0;
    const str = password + 'ezcubic_salt_2024';
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return 'h1_' + Math.abs(hash).toString(16).padStart(8, '0') + Date.now().toString(36).slice(-4);
}

/**
 * Check if a password is hashed
 */
function isPasswordHashed(password) {
    if (!password) return false;
    return password.startsWith('h1_') || /^[a-f0-9]{64}$/.test(password);
}

/**
 * Verify password (handles both hashed and legacy plain text)
 */
async function verifyPassword(inputPassword, storedPassword) {
    if (!isPasswordHashed(storedPassword)) {
        return inputPassword === storedPassword;
    }
    
    if (storedPassword.startsWith('h1_')) {
        const inputHash = hashPasswordSync(inputPassword);
        return storedPassword.substring(0, 11) === inputHash.substring(0, 11);
    }
    
    const inputHash = await hashPassword(inputPassword);
    return inputHash === storedPassword;
}

// ==================== AUTO CLOUD SYNC ====================

/**
 * Automatically enable cloud sync when user logs in
 * Works for ALL roles (founder, admin, staff, manager) in the same tenant
 * No separate Supabase auth needed - uses tenant ID for data isolation
 */
async function autoEnableCloudSync(user, password) {
    // Skip if no supabase SDK
    if (!window.supabase?.createClient) {
        console.log('☁️ Supabase not available, skipping auto cloud sync');
        return;
    }
    
    const tenantId = user.tenantId;
    if (!tenantId) {
        console.log('☁️ No tenant ID, skipping cloud sync');
        return;
    }
    
    console.log('☁️ Auto-enabling cloud sync for tenant:', tenantId, 'user:', user.email, 'role:', user.role);
    
    // Enable cloud mode for this device (tenant-based, no auth required)
    if (typeof enableCloudMode === 'function') {
        enableCloudMode();
    } else {
        localStorage.setItem('cloudModeEnabled', 'true');
    }
    localStorage.setItem('ezcubic_cloud_tenant_mode', tenantId);
    
    // Update UI
    if (typeof window.updateCloudSyncUI === 'function') {
        window.updateCloudSyncUI(true);
    }
    
    // SMART SYNC: Check cloud vs local timestamps to decide sync direction
    // This ensures:
    // - Admin enables sync, adds products → uploads to cloud
    // - Staff logs in on Device B → downloads Admin's products
    // - Staff adds new SKU → uploads to cloud  
    // - Admin logs in again → downloads Staff's new SKU
    setTimeout(async () => {
        try {
            const tenantKey = 'ezcubic_tenant_' + tenantId;
            const localTenantData = JSON.parse(localStorage.getItem(tenantKey) || '{}');
            const localTimestamp = localTenantData.updatedAt ? new Date(localTenantData.updatedAt).getTime() : 0;
            const hasLocalData = localTenantData.products?.length > 0 || 
                                localTenantData.customers?.length > 0 ||
                                localTenantData.transactions?.length > 0 ||
                                localTenantData.quotations?.length > 0;
            
            // Step 1: Check cloud timestamp first
            let cloudTimestamp = 0;
            let cloudHasData = false;
            try {
                if (window.supabase?.createClient && typeof getUsersSupabaseClient === 'function') {
                    const client = getUsersSupabaseClient();
                    const { data, error } = await client
                        .from('tenant_data')
                        .select('updated_at, data')
                        .eq('tenant_id', tenantId)
                        .eq('data_key', 'tenant_full_data')
                        .single();
                    
                    if (!error && data) {
                        cloudTimestamp = new Date(data.updated_at).getTime();
                        cloudHasData = data.data?.value?.products?.length > 0 || 
                                      data.data?.value?.customers?.length > 0;
                        console.log('☁️ Cloud check:', { cloudTimestamp, localTimestamp, cloudNewer: cloudTimestamp > localTimestamp });
                    }
                }
            } catch (e) {
                console.warn('☁️ Cloud timestamp check failed:', e.message);
            }
            
            // Step 2: Decide sync direction based on timestamps
            if (cloudTimestamp > localTimestamp && cloudHasData) {
                // CLOUD IS NEWER - download first (another device made changes)
                console.log('☁️ Cloud is newer - downloading latest data... (role:', user.role, ')');
                if (typeof window.downloadTenantFromCloud === 'function') {
                    try {
                        await window.downloadTenantFromCloud(tenantId);
                        console.log('☁️ Downloaded newer data from cloud!');
                        // Reload tenant data into memory
                        if (typeof window.loadUserTenantData === 'function') {
                            await window.loadUserTenantData(user);
                        }
                        // Refresh UI - including inventory
                        if (typeof updateDashboard === 'function') updateDashboard();
                        if (typeof renderProducts === 'function') renderProducts();
                        if (typeof updateInventoryStats === 'function') updateInventoryStats();
                        if (typeof showToast === 'function') {
                            showToast('✓ Synced latest data from cloud', 'success');
                        }
                    } catch (e) {
                        console.warn('☁️ Cloud download failed:', e.message);
                    }
                }
            } else if (hasLocalData) {
                // LOCAL IS NEWER OR SAME - upload local changes
                console.log('☁️ Local data is current - uploading to cloud... (role:', user.role, ')');
                if (typeof window.fullCloudSync === 'function') {
                    window.fullCloudSync().then(() => {
                        console.log('☁️ Cloud sync complete');
                    }).catch(e => console.warn('☁️ Sync warning:', e.message));
                }
            } else if (!hasLocalData && cloudHasData) {
                // No local data but cloud has data - download
                console.log('☁️ No local data - downloading from cloud... (role:', user.role, ')');
                if (typeof window.downloadTenantFromCloud === 'function') {
                    try {
                        await window.downloadTenantFromCloud(tenantId);
                        if (typeof window.loadUserTenantData === 'function') {
                            await window.loadUserTenantData(user);
                        }
                        if (typeof showToast === 'function') {
                            showToast('✓ Data synced from cloud', 'success');
                        }
                    } catch (e) {
                        console.warn('☁️ Cloud download failed:', e.message);
                    }
                }
            } else {
                // New tenant - nothing to sync yet
                console.log('☁️ New tenant - no data to sync yet (role:', user.role, ')');
            }
        } catch (err) {
            console.warn('☁️ Auto cloud sync error:', err.message);
        }
    }, 2000);
}

// ==================== LOGIN FUNCTION ====================

/**
 * Main login function - tries cloud sync first for multi-device support
 */
function login(email, password) {
    const loginBtn = document.querySelector('#loginForm button[type="submit"], .login-form button[type="submit"]');
    const originalBtnText = loginBtn ? loginBtn.innerHTML : '';
    
    if (loginBtn) {
        loginBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Checking...';
        loginBtn.disabled = true;
    }
    
    tryLoginWithCloudSync(email, password).finally(() => {
        if (loginBtn) {
            loginBtn.innerHTML = originalBtnText || '<i class="fas fa-sign-in-alt"></i> Login';
            loginBtn.disabled = false;
        }
    });
    
    return false;
}

/**
 * Async login that checks cloud first
 */
async function tryLoginWithCloudSync(email, password) {
    function showLoginError(message) {
        const errorDiv = document.getElementById('loginErrorMessage');
        const errorText = document.getElementById('loginErrorText');
        if (errorDiv && errorText) {
            errorText.textContent = message;
            errorDiv.style.display = 'block';
            errorDiv.style.animation = 'none';
            setTimeout(() => errorDiv.style.animation = 'shake 0.5s', 10);
        }
        
        const modalErrorDiv = document.getElementById('loginModalError');
        const modalErrorText = document.getElementById('loginModalErrorText');
        if (modalErrorDiv && modalErrorText) {
            modalErrorText.textContent = message;
            modalErrorDiv.style.display = 'block';
        }
        
        if (typeof showToast === 'function') {
            showToast(message, 'error');
        }
    }
    
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
    
    // Try to sync users from cloud first
    try {
        console.log('☁️ Checking cloud for user updates before login...');
        if (typeof loadUsersFromCloud === 'function') {
            await loadUsersFromCloud();
        }
    } catch (err) {
        console.warn('⚠️ Cloud sync failed, using local data:', err);
    }
    
    // Reload users from localStorage
    if (typeof loadUsers === 'function') {
        loadUsers();
    }
    
    const users = window.users || [];
    console.log('Login attempt:', email);
    
    let userByEmail = users.find(u => u.email.toLowerCase() === email.toLowerCase());
    
    // Auto cloud lookup if not found locally
    if (!userByEmail && typeof findUserInCloud === 'function') {
        console.log('👤 User not found locally, checking cloud directly...');
        
        try {
            const cloudUser = await findUserInCloud(email);
            
            // findUserInCloud already checks deletion tracking and returns null for deleted users
            if (cloudUser) {
                console.log('☁️ Found user in cloud:', cloudUser.email);
                
                // Double-check deletion tracking before adding
                const deletedUsers = JSON.parse(localStorage.getItem('ezcubic_deleted_users') || '[]');
                const deletedTenants = JSON.parse(localStorage.getItem('ezcubic_deleted_tenants') || '[]');
                const isDeleted = deletedUsers.includes(cloudUser.id) || deletedUsers.includes(cloudUser.email);
                const isTenantDeleted = cloudUser.tenantId && deletedTenants.includes(cloudUser.tenantId);
                
                if (isDeleted || isTenantDeleted) {
                    console.log('🗑️ User is marked as deleted, cannot login:', cloudUser.email);
                    showLoginLoading(false);
                    showLoginError('This account has been deleted. Please contact your administrator.');
                    return false;
                }
                
                users.push(cloudUser);
                localStorage.setItem('ezcubic_users', JSON.stringify(users));
                
                if (cloudUser.tenantId && typeof downloadTenantFromCloud === 'function') {
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
    
    if (userByEmail.status !== 'active') {
        showLoginLoading(false);
        showLoginError('Your account is inactive. Please contact support.');
        return false;
    }
    
    const passwordValid = await verifyPassword(password, userByEmail.password);
    if (!passwordValid) {
        showLoginLoading(false);
        showLoginError('Incorrect password. Please try again.');
        return false;
    }
    
    showLoginLoading(false);
    
    // Auto-upgrade plain text password to hashed
    if (!isPasswordHashed(userByEmail.password)) {
        const hashedPw = await hashPassword(password);
        userByEmail.password = hashedPw;
        if (typeof saveUsers === 'function') saveUsers();
        console.log('🔒 Password upgraded to hashed format');
    }
    
    // Hide error messages
    const errorDiv = document.getElementById('loginErrorMessage');
    if (errorDiv) errorDiv.style.display = 'none';
    const modalErrorDiv = document.getElementById('loginModalError');
    if (modalErrorDiv) modalErrorDiv.style.display = 'none';
    
    const user = userByEmail;
    
    if (user) {
        window.currentUser = user;
        
        // Generate session token
        const sessionToken = generateSessionToken();
        const deviceInfo = {
            userAgent: navigator.userAgent,
            platform: navigator.platform,
            language: navigator.language,
            screenSize: `${window.screen.width}x${window.screen.height}`
        };
        
        localStorage.setItem(AUTH_SESSION_TOKEN_KEY, sessionToken);
        saveCloudSessionToken(user.id, sessionToken, deviceInfo);
        
        localStorage.setItem(AUTH_CURRENT_USER_KEY, JSON.stringify({
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            plan: user.plan,
            tenantId: user.tenantId,
            loginTime: new Date().toISOString()
        }));
        
        // Log session
        if (typeof logSession === 'function') {
            logSession(user.id, 'login');
        }
        
        // Record audit log
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
        if (typeof window.isGuestMode !== 'undefined') {
            window.isGuestMode = false;
        }
        if (typeof removeViewOnlyMode === 'function') {
            removeViewOnlyMode();
        }
        
        // Load user's tenant data (async - auto-downloads from cloud if needed for new devices)
        if (typeof window.loadUserTenantData === 'function') {
            // Await to ensure data is ready before showing UI
            await window.loadUserTenantData(user);
        }
        
        // Show app container
        const appContainer = document.getElementById('appContainer');
        if (appContainer) appContainer.style.display = '';
        
        if (typeof updateAuthUI === 'function') updateAuthUI();
        closeLoginModal();
        hideLoginPage();
        
        if (typeof showToast === 'function') {
            showToast(`Welcome back, ${user.name}!`, 'success');
        }
        
        // Apply permissions
        if (typeof applyUserPermissions === 'function') {
            applyUserPermissions();
        }
        
        // Apply plan restrictions
        if (['staff', 'manager'].includes(user.role) && typeof applyOwnerPlanRestrictions === 'function') {
            applyOwnerPlanRestrictions(user);
        } else if (user.plan && user.role !== 'personal' && typeof applyPlanToUser === 'function') {
            applyPlanToUser(user);
        }
        
        // Re-apply for personal users
        if (user.role === 'personal' && typeof applyUserPermissions === 'function') {
            setTimeout(() => applyUserPermissions(), 50);
        }
        
        // Show dashboard
        if (typeof showSection === 'function') {
            showSection('dashboard');
        }
        
        // Post-login UI refresh
        setTimeout(() => {
            console.log('Post-login UI refresh...');
            
            // Sync user permissions with plan before applying
            if (typeof syncUserPermissionsWithPlan === 'function') {
                syncUserPermissionsWithPlan();
            }
            
            if (typeof applyUserPermissions === 'function') applyUserPermissions();
            if (typeof resetNavCategoryStates === 'function') resetNavCategoryStates();
            if (typeof updateCompanyNameInUI === 'function') updateCompanyNameInUI();
            if (typeof updateDashboard === 'function') updateDashboard();
            
            // Trigger PWA install prompt event
            window.dispatchEvent(new Event('user-logged-in'));
            
            // Reload chatbot with user-specific data
            if (typeof reloadChatbotForUser === 'function') {
                reloadChatbotForUser();
            }
            
            // AUTO CLOUD SYNC: Automatically enable cloud backup on login
            autoEnableCloudSync(user, password);
        }, 300);
        
        // Additional nav fix after longer delay
        setTimeout(() => {
            if (typeof resetNavCategoryStates === 'function') resetNavCategoryStates();
        }, 800);
        
        return true;
    } else {
        if (typeof showToast === 'function') {
            showToast('Invalid email or password', 'error');
        }
        return false;
    }
}

// ==================== LOGOUT FUNCTION ====================

/**
 * Logout current user
 */
function logout() {
    if (window.currentUser) {
        // Record audit log
        if (typeof recordAuditLog === 'function') {
            recordAuditLog({
                action: 'logout',
                module: 'auth',
                recordId: window.currentUser.id || window.currentUser.email,
                recordName: window.currentUser.name || window.currentUser.email,
                description: `User logged out: ${window.currentUser.name || window.currentUser.email}`
            });
        }
        
        // Save tenant data
        if (typeof saveToUserTenant === 'function') {
            saveToUserTenant();
        }
        
        if (typeof logSession === 'function') {
            logSession(window.currentUser.id, 'logout');
        }
    }
    
    window.currentUser = null;
    localStorage.removeItem(AUTH_CURRENT_USER_KEY);
    localStorage.removeItem(AUTH_SESSION_TOKEN_KEY);
    
    // Stop session validation
    if (sessionValidationInterval) {
        clearInterval(sessionValidationInterval);
        sessionValidationInterval = null;
    }
    
    // Reset data
    if (typeof resetToEmptyData === 'function') {
        resetToEmptyData();
    }
    
    // Reload chatbot for guest context (clears user-specific data from view)
    if (typeof reloadChatbotForUser === 'function') {
        reloadChatbotForUser();
    }
    
    if (typeof updateAuthUI === 'function') {
        updateAuthUI();
    }
    
    showLoginPage();
    
    if (typeof showToast === 'function') {
        showToast('You have been logged out', 'info');
    }
}

/**
 * Log session activity
 */
function logSession(userId, action) {
    const USER_SESSIONS_KEY = 'ezcubic_user_sessions';
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

// ==================== LOGIN PAGE (FULL SCREEN) ====================

/**
 * Show full-screen login page
 */
function showLoginPage() {
    let loginPage = document.getElementById('loginPageOverlay');
    
    if (!loginPage) {
        const loginPageHTML = `
            <div class="login-page-overlay" id="loginPageOverlay">
                <div class="login-page-container">
                    <div class="login-page-brand">
                        <div class="brand-logo">
                            <img src="images/lazyhuman.svg" alt="A Lazy Human" style="width: 80px; height: 80px;">
                        </div>
                        <h1>A Lazy Human</h1>
                        <div class="tagline">Smart To Be Lazy</div>
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
                        <p>© ${new Date().getFullYear()} A Lazy Human. All rights reserved.</p>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', loginPageHTML);
        loginPage = document.getElementById('loginPageOverlay');
    } else {
        showLoginView();
    }
    
    loginPage.classList.remove('hidden');
    
    const appContainer = document.querySelector('.app-container');
    if (appContainer) {
        appContainer.classList.add('logged-out');
    }
    document.body.classList.add('logged-out');
    
    const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
    if (mobileMenuBtn) mobileMenuBtn.style.display = 'none';
}

/**
 * Toggle between login/register/forgot views
 */
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
    document.getElementById('forgotStep1').style.display = 'block';
    document.getElementById('forgotStep2').style.display = 'none';
}

/**
 * Hide login page and show main app
 */
function hideLoginPage() {
    const loginPage = document.getElementById('loginPageOverlay');
    if (loginPage) {
        loginPage.classList.add('hidden');
    }
    
    const appContainer = document.querySelector('.app-container');
    if (appContainer) {
        appContainer.classList.remove('logged-out');
        appContainer.style.display = '';
    }
    
    // Also show by ID
    const appContainerById = document.getElementById('appContainer');
    if (appContainerById) {
        appContainerById.style.display = '';
    }
    
    document.body.classList.remove('logged-out');
    
    const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
    if (mobileMenuBtn) mobileMenuBtn.style.display = '';
    
    // Reset nav categories after showing app
    setTimeout(() => {
        if (typeof resetNavCategoryStates === 'function') {
            resetNavCategoryStates();
        }
    }, 100);
}

/**
 * Toggle company code sync section
 */
function toggleCompanyCodeSync() {
    const syncDiv = document.getElementById('companyCodeSync');
    if (syncDiv) {
        syncDiv.style.display = syncDiv.style.display === 'none' ? 'block' : 'none';
    }
}

// ==================== LOGIN PAGE HANDLERS ====================

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
    
    if (password !== passwordConfirm) {
        if (typeof showToast === 'function') showToast('Passwords do not match', 'error');
        return;
    }
    
    if (password.length < 6) {
        if (typeof showToast === 'function') showToast('Password must be at least 6 characters', 'error');
        return;
    }
    
    // CRITICAL: Load from CLOUD first to get latest users list (including deleted tracking)
    if (typeof loadUsersFromCloud === 'function') {
        loadUsersFromCloud().then(() => {
            continueRegistration(name, email, password);
        });
    } else {
        // Fallback to localStorage if cloud not available
        if (typeof loadUsers === 'function') loadUsers();
        continueRegistration(name, email, password);
    }
}

function continueRegistration(name, email, password) {
    // Get latest users array
    let users = window.users || [];
    if (users.length === 0) {
        users = JSON.parse(localStorage.getItem('ezcubic_users') || '[]');
    }
    
    // Get deleted users list to prevent re-registration of deleted accounts
    const deletedUsers = JSON.parse(localStorage.getItem('ezcubic_deleted_users') || '[]');
    
    // Check if email exists OR was deleted
    const emailLower = email.toLowerCase();
    if (users.find(u => u.email.toLowerCase() === emailLower)) {
        if (typeof showToast === 'function') showToast('Email already registered. Please login instead.', 'error');
        return;
    }
    if (deletedUsers.includes(emailLower)) {
        if (typeof showToast === 'function') showToast('This email was previously deleted. Please contact support to restore.', 'error');
        return;
    }
    
    // Hash password and create user
    hashPassword(password).then(hashedPassword => {
        const tenantId = 'tenant_' + Date.now();
        
        const newUser = {
            id: 'user_' + Date.now(),
            email: email,
            password: hashedPassword,
            name: name,
            role: 'personal',
            plan: 'personal',
            status: 'active',
            permissions: ['dashboard', 'transactions', 'income', 'expenses', 'reports', 'taxes', 'balance-sheet', 'monthly-reports', 'ai-chatbot', 'bills'],
            tenantId: tenantId,
            createdAt: new Date().toISOString(),
            registeredVia: 'free_signup'
        };
        
        // Add to users array
        users.push(newUser);
        window.users = users;
        localStorage.setItem('ezcubic_users', JSON.stringify(users));
        
        console.log('✅ New user created:', newUser.email);
        
        // CRITICAL: Upload to cloud immediately so it's available on other devices
        if (typeof window.directUploadUsersToCloud === 'function') {
            window.directUploadUsersToCloud(false).then(() => {
                console.log('✅ User synced to cloud');
            }).catch(err => {
                console.warn('⚠️ Cloud sync failed, but user is saved locally:', err);
            });
        }
        
        // Initialize tenant
        if (typeof window.initializeEmptyTenantData === 'function') {
            window.initializeEmptyTenantData(tenantId, name);
            console.log('✅ Tenant initialized for registered user:', tenantId);
        } else {
            console.warn('⚠️ initializeEmptyTenantData not available');
        }
        
        // Auto-login
        window.currentUser = newUser;
        localStorage.setItem(AUTH_CURRENT_USER_KEY, JSON.stringify(newUser));
        
        if (typeof window.isGuestMode !== 'undefined') {
            window.isGuestMode = false;
        }
        if (typeof removeViewOnlyMode === 'function') {
            removeViewOnlyMode();
        }
        
        if (typeof window.loadCurrentTenantData === 'function') {
            window.loadCurrentTenantData();
        } else if (typeof window.resetToEmptyData === 'function') {
            window.resetToEmptyData();
        }
        
        if (typeof showToast === 'function') {
            showToast(`Welcome ${name}! Your free account is ready.`, 'success');
        }
        
        // Hide login page
        const loginPage = document.getElementById('loginPageOverlay');
        if (loginPage) loginPage.classList.add('hidden');
        
        document.body.classList.remove('logged-out');
        const appContainer = document.querySelector('.app-container');
        if (appContainer) {
            appContainer.classList.remove('logged-out');
            appContainer.style.display = ''; // Make sure it's visible
        }
        
        // Also show appContainer by ID
        const appContainerById = document.getElementById('appContainer');
        if (appContainerById) {
            appContainerById.style.display = '';
        }
        
        const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
        if (mobileMenuBtn) mobileMenuBtn.style.display = '';
        
        // CRITICAL: Call updateAuthUI to show user menu with logout button
        try {
            if (typeof updateAuthUI === 'function') updateAuthUI();
            if (typeof updateAuthPanel === 'function') updateAuthPanel();
            if (typeof applyPlanRestrictions === 'function') applyPlanRestrictions();
            if (typeof applyUserPermissions === 'function') applyUserPermissions();
            if (typeof showSection === 'function') showSection('dashboard');
            if (typeof updateDisplay === 'function') updateDisplay();
            if (typeof renderDashboard === 'function') renderDashboard();
            
            // AUTO CLOUD SYNC: Enable cloud backup immediately after registration
            // This ensures new users' data is backed up from day 1
            setTimeout(async () => {
                console.log('🔍 [DEBUG] Starting registration sync flow...');
                console.log('🔍 [DEBUG] New user:', newUser.username, newUser.email);
                try {
                    await autoEnableCloudSync(newUser, password);
                    console.log('☁️ Cloud sync auto-enabled for new registration');
                    
                    // CRITICAL: Also sync the global users list to cloud
                    // This ensures founder/admin on other devices can see new users
                    console.log('🔍 [DEBUG] Checking for Supabase SDK...');
                    console.log('🔍 [DEBUG] window.supabase exists:', !!window.supabase);
                    console.log('🔍 [DEBUG] window.supabase.createClient exists:', !!window.supabase?.createClient);
                    
                    // Wait for Supabase SDK to be ready
                    let retries = 0;
                    while (!window.supabase?.createClient && retries < 20) {
                        console.log('🔍 [DEBUG] Waiting for Supabase SDK, retry', retries + 1);
                        await new Promise(r => setTimeout(r, 300));
                        retries++;
                    }
                    
                    console.log('🔍 [DEBUG] After wait loop - window.supabase.createClient:', !!window.supabase?.createClient);
                    console.log('🔍 [DEBUG] forceSyncUsersToCloud function exists:', typeof window.forceSyncUsersToCloud);
                    
                    if (typeof window.forceSyncUsersToCloud === 'function') {
                        console.log('🔍 [DEBUG] Calling forceSyncUsersToCloud()...');
                        try {
                            const result = await window.forceSyncUsersToCloud();
                            console.log('🔍 [DEBUG] forceSyncUsersToCloud result:', result);
                            console.log('☁️ Global users list synced to cloud after registration');
                        } catch (syncErr) {
                            console.error('🔍 [DEBUG] forceSyncUsersToCloud error:', syncErr);
                            console.warn('☁️ Could not sync users to cloud:', syncErr.message);
                        }
                    } else {
                        console.warn('☁️ forceSyncUsersToCloud not available yet');
                    }
                } catch (cloudErr) {
                    console.error('🔍 [DEBUG] Cloud sync error:', cloudErr);
                    console.warn('☁️ Cloud sync warning:', cloudErr.message);
                }
                console.log('🔍 [DEBUG] Registration sync flow completed');
            }, 1000);
        } catch (err) {
            console.error('Error during post-registration setup:', err);
        }
        
        console.log('🔒 User registered with hashed password');
    });
}

function verifyForgotEmail() {
    const email = document.getElementById('forgotPageEmail').value.trim();
    
    if (!email) {
        if (typeof showToast === 'function') showToast('Please enter your email address', 'error');
        return;
    }
    
    // Load users from localStorage directly to ensure we have latest data
    if (typeof loadUsers === 'function') loadUsers();
    let users = window.users;
    if (!users || users.length === 0) {
        users = JSON.parse(localStorage.getItem('ezcubic_users') || '[]');
    }
    console.log('verifyForgotEmail: checking', users.length, 'users for', email);
    const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());
    
    if (!user) {
        if (typeof showToast === 'function') showToast('No account found with this email', 'error');
        return;
    }
    
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
        if (typeof showToast === 'function') showToast('Passwords do not match', 'error');
        return;
    }
    
    if (newPassword.length < 6) {
        if (typeof showToast === 'function') showToast('Password must be at least 6 characters', 'error');
        return;
    }
    
    // Load users from localStorage directly
    let users = window.users;
    if (!users || users.length === 0) {
        users = JSON.parse(localStorage.getItem('ezcubic_users') || '[]');
    }
    const userIndex = users.findIndex(u => u.id === userId);
    
    if (userIndex === -1) {
        if (typeof showToast === 'function') showToast('User not found', 'error');
        return;
    }
    
    users[userIndex].password = newPassword;
    users[userIndex].updatedAt = new Date().toISOString();
    window.users = users; // Sync back to window
    localStorage.setItem('ezcubic_users', JSON.stringify(users));
    if (typeof saveUsers === 'function') saveUsers();
    
    showLoginView();
    if (typeof showToast === 'function') {
        showToast('Password reset successfully! Please login with your new password.', 'success');
    }
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

// ==================== FORGOT PASSWORD MODAL ====================

function showForgotPassword() {
    closeLoginModal();
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
    if (modal) modal.remove();
}

function verifyResetEmail() {
    const email = document.getElementById('resetEmail').value.trim();
    
    if (!email) {
        if (typeof showToast === 'function') showToast('Please enter your email address', 'error');
        return;
    }
    
    // Load users from localStorage directly to ensure we have latest data
    if (typeof loadUsers === 'function') loadUsers();
    let users = window.users;
    if (!users || users.length === 0) {
        users = JSON.parse(localStorage.getItem('ezcubic_users') || '[]');
    }
    console.log('verifyResetEmail: checking', users.length, 'users for', email);
    const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());
    
    if (user) {
        document.getElementById('forgotPasswordStep1').style.display = 'none';
        document.getElementById('forgotPasswordStep2').style.display = 'block';
        document.getElementById('foundEmail').textContent = user.email;
        document.getElementById('resetUserId').value = user.id;
        if (typeof showToast === 'function') showToast('Account found! Please set a new password.', 'success');
    } else {
        if (typeof showToast === 'function') showToast('No account found with this email address', 'error');
    }
}

function executePasswordReset() {
    const userId = document.getElementById('resetUserId').value;
    const newPassword = document.getElementById('newResetPassword').value;
    const confirmPassword = document.getElementById('confirmResetPassword').value;
    
    if (!newPassword || newPassword.length < 6) {
        if (typeof showToast === 'function') showToast('Password must be at least 6 characters', 'error');
        return;
    }
    
    if (newPassword !== confirmPassword) {
        if (typeof showToast === 'function') showToast('Passwords do not match', 'error');
        return;
    }
    
    // Load users from localStorage directly
    if (typeof loadUsers === 'function') loadUsers();
    let users = window.users;
    if (!users || users.length === 0) {
        users = JSON.parse(localStorage.getItem('ezcubic_users') || '[]');
    }
    
    const userIndex = users.findIndex(u => u.id === userId);
    if (userIndex === -1) {
        if (typeof showToast === 'function') showToast('User not found', 'error');
        return;
    }
    
    users[userIndex].password = newPassword;
    users[userIndex].updatedAt = new Date().toISOString();
    window.users = users; // Sync back to window
    localStorage.setItem('ezcubic_users', JSON.stringify(users));
    if (typeof saveUsers === 'function') saveUsers();
    
    closeForgotPasswordModal();
    showLoginPage();
    if (typeof showToast === 'function') {
        showToast('Password reset successfully! Please login with your new password.', 'success');
    }
}

// ==================== EXPORTS ====================

// Session management
window.generateSessionToken = generateSessionToken;
window.startSessionValidation = startSessionValidation;
window.checkSession = checkSession;
window.validateSessionToken = validateSessionToken;
window.getCloudSessionToken = getCloudSessionToken;
window.saveCloudSessionToken = saveCloudSessionToken;
window.forceLogoutOtherDevice = forceLogoutOtherDevice;

// Password handling
window.hashPassword = hashPassword;
window.hashPasswordSync = hashPasswordSync;
window.isPasswordHashed = isPasswordHashed;
window.verifyPassword = verifyPassword;

// Login/Logout
window.login = login;
window.tryLoginWithCloudSync = tryLoginWithCloudSync;
window.autoEnableCloudSync = autoEnableCloudSync;
window.logout = logout;
window.logSession = logSession;

// Login page (full screen)
window.showLoginPage = showLoginPage;
window.hideLoginPage = hideLoginPage;
window.showLoginView = showLoginView;
window.showRegisterView = showRegisterView;
window.showForgotPasswordView = showForgotPasswordView;
window.handleLoginPage = handleLoginPage;
window.handleRegisterPage = handleRegisterPage;
window.verifyForgotEmail = verifyForgotEmail;
window.executePagePasswordReset = executePagePasswordReset;
window.toggleCompanyCodeSync = toggleCompanyCodeSync;

// Login modal
window.showLoginModal = showLoginModal;
window.closeLoginModal = closeLoginModal;
window.handleLogin = handleLogin;

// Forgot password modal
window.showForgotPassword = showForgotPassword;
window.closeForgotPasswordModal = closeForgotPasswordModal;
window.verifyResetEmail = verifyResetEmail;
window.executePasswordReset = executePasswordReset;

// Constants
window.SESSION_TIMEOUT_HOURS = SESSION_TIMEOUT_HOURS;

console.log('✅ Auth module loaded (auth.js v1.0.0)');
