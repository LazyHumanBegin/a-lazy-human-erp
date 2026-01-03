// ============================================
// A LAZY HUMAN ERP - SUPABASE CONFIGURATION
// Cloud Database & Authentication
// ============================================

const SUPABASE_URL = 'https://tctpmizdcksdxngtozwe.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRjdHBtaXpkY2tzZHhuZ3RvendlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYyOTE1NzAsImV4cCI6MjA4MTg2NzU3MH0.-BL0NoQxVfFA3MXEuIrC24G6mpkn7HGIyyoRBVFu300';

// Initialize Supabase client (renamed to avoid conflict with CDN's window.supabase)
let _supabaseClient = null;

function initSupabase() {
    if (_supabaseClient) return true; // Already initialized
    
    // The CDN version exposes supabase.createClient directly
    // Try all possible ways the SDK might be exposed
    let createClient = null;
    
    if (typeof window.supabase !== 'undefined') {
        // v2 CDN: window.supabase.createClient
        if (typeof window.supabase.createClient === 'function') {
            createClient = window.supabase.createClient;
        }
        // Or it might already be the createClient function
        else if (typeof window.supabase === 'function') {
            createClient = window.supabase;
        }
    }
    
    if (!createClient) {
        console.warn('⚠️ Supabase SDK not found, retrying...');
        return false;
    }
    
    try {
        // Initialize with proper auth persistence settings
        _supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
            auth: {
                persistSession: true,
                storageKey: 'ezcubic-supabase-auth',
                storage: window.localStorage,
                autoRefreshToken: true,
                detectSessionInUrl: false
            }
        });
        console.log('🐱 Supabase initialized successfully with auth persistence');
        return true;
    } catch (err) {
        console.error('❌ Supabase init error:', err);
        return false;
    }
}

// Get Supabase client instance
function getSupabase() {
    if (!_supabaseClient) {
        initSupabase();
    }
    return _supabaseClient;
}

// Auto-initialize on load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(initSupabase, 100);
    });
} else {
    setTimeout(initSupabase, 100);
}

// ============================================
// AUTHENTICATION FUNCTIONS
// ============================================

// Sign up new user with email and password
async function supabaseSignUp(email, password, userData = {}) {
    try {
        const { data, error } = await getSupabase().auth.signUp({
            email: email,
            password: password,
            options: {
                data: userData // Additional user metadata
            }
        });
        
        if (error) throw error;
        
        console.log('✅ User signed up:', email);
        return { success: true, data };
    } catch (error) {
        console.error('❌ Sign up error:', error.message);
        return { success: false, error: error.message };
    }
}

// Sign in existing user
async function supabaseSignIn(email, password) {
    try {
        const { data, error } = await getSupabase().auth.signInWithPassword({
            email: email,
            password: password
        });
        
        if (error) throw error;
        
        console.log('✅ User signed in:', email);
        return { success: true, data };
    } catch (error) {
        console.error('❌ Sign in error:', error.message);
        return { success: false, error: error.message };
    }
}

// Sign out current user
async function supabaseSignOut() {
    try {
        const { error } = await getSupabase().auth.signOut();
        if (error) throw error;
        
        console.log('✅ User signed out');
        return { success: true };
    } catch (error) {
        console.error('❌ Sign out error:', error.message);
        return { success: false, error: error.message };
    }
}

// Get current user session
async function supabaseGetSession() {
    try {
        const { data: { session }, error } = await getSupabase().auth.getSession();
        if (error) throw error;
        return session;
    } catch (error) {
        console.error('❌ Get session error:', error.message);
        return null;
    }
}

// Get current user
async function supabaseGetUser() {
    try {
        const { data: { user }, error } = await getSupabase().auth.getUser();
        if (error) throw error;
        return user;
    } catch (error) {
        console.error('❌ Get user error:', error.message);
        return null;
    }
}

// Listen to auth state changes
function supabaseOnAuthStateChange(callback) {
    return getSupabase().auth.onAuthStateChange((event, session) => {
        console.log('🔐 Auth state changed:', event);
        callback(event, session);
    });
}

// Reset password
async function supabaseResetPassword(email) {
    try {
        const { data, error } = await getSupabase().auth.resetPasswordForEmail(email, {
            redirectTo: window.location.origin + '/reset-password'
        });
        
        if (error) throw error;
        
        console.log('✅ Password reset email sent');
        return { success: true, data };
    } catch (error) {
        console.error('❌ Reset password error:', error.message);
        return { success: false, error: error.message };
    }
}

// ============================================
// DATABASE FUNCTIONS
// ============================================

// Create or update tenant data
async function saveTenantData(tenantId, tableName, data) {
    try {
        // Extract data_key from data object for proper upsert
        // Handle both {key: 'x', value: y} format and direct data
        const dataKey = (data && typeof data === 'object' && data.key) ? data.key : 'default';
        
        const { data: result, error } = await getSupabase()
            .from(tableName)
            .upsert({
                tenant_id: tenantId,
                data_key: dataKey,
                data: data,
                updated_at: new Date().toISOString()
            }, {
                onConflict: 'tenant_id,data_key'
            });
        
        if (error) throw error;
        
        console.log(`✅ Saved ${tableName}/${dataKey} for tenant ${tenantId}`);
        return { success: true, data: result };
    } catch (error) {
        console.error(`❌ Save ${tableName} error:`, error?.message || error);
        return { success: false, error: error?.message || String(error) };
    }
}

// Get tenant data
async function getTenantData(tenantId, tableName) {
    try {
        const { data, error } = await getSupabase()
            .from(tableName)
            .select('*')
            .eq('tenant_id', tenantId)
            .single();
        
        if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows
        
        return { success: true, data };
    } catch (error) {
        console.error(`❌ Get ${tableName} error:`, error.message);
        return { success: false, error: error.message };
    }
}

// Delete tenant data
async function deleteTenantData(tenantId, tableName) {
    try {
        const { error } = await getSupabase()
            .from(tableName)
            .delete()
            .eq('tenant_id', tenantId);
        
        if (error) throw error;
        
        console.log(`✅ Deleted ${tableName} for tenant ${tenantId}`);
        return { success: true };
    } catch (error) {
        console.error(`❌ Delete ${tableName} error:`, error.message);
        return { success: false, error: error.message };
    }
}

// ============================================
// REALTIME SUBSCRIPTIONS
// ============================================

// Subscribe to changes in a table
function subscribeToTable(tableName, tenantId, callback) {
    return getSupabase()
        .channel(`${tableName}_${tenantId}`)
        .on('postgres_changes', 
            { 
                event: '*', 
                schema: 'public', 
                table: tableName,
                filter: `tenant_id=eq.${tenantId}`
            }, 
            (payload) => {
                console.log('📡 Realtime update:', payload);
                callback(payload);
            }
        )
        .subscribe();
}

// Unsubscribe from channel
function unsubscribeFromChannel(channel) {
    if (channel) {
        getSupabase().removeChannel(channel);
    }
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

// Check if Supabase is connected
async function checkSupabaseConnection() {
    try {
        const { data, error } = await getSupabase()
            .from('health_check')
            .select('count')
            .limit(1);
        
        // Even if table doesn't exist, connection is working
        return { connected: true };
    } catch (error) {
        return { connected: false, error: error.message };
    }
}

// Check if cloud mode is enabled
function isCloudModeEnabled() {
    return localStorage.getItem('cloudModeEnabled') === 'true';
}

// Enable cloud mode
function enableCloudMode() {
    localStorage.setItem('cloudModeEnabled', 'true');
    console.log('☁️ Cloud mode enabled');
}

// Disable cloud mode (offline/local only)
function disableCloudMode() {
    localStorage.setItem('cloudModeEnabled', 'false');
    console.log('💾 Local mode enabled');
}

// Export for use in other modules
window.SupabaseConfig = {
    url: SUPABASE_URL,
    anonKey: SUPABASE_ANON_KEY,
    init: initSupabase,
    getClient: getSupabase,
    // Auth
    signUp: supabaseSignUp,
    signIn: supabaseSignIn,
    signOut: supabaseSignOut,
    getSession: supabaseGetSession,
    getUser: supabaseGetUser,
    onAuthStateChange: supabaseOnAuthStateChange,
    resetPassword: supabaseResetPassword,
    // Database
    saveTenantData: saveTenantData,
    getTenantData: getTenantData,
    deleteTenantData: deleteTenantData,
    // Realtime
    subscribeToTable: subscribeToTable,
    unsubscribeFromChannel: unsubscribeFromChannel,
    // Utils
    checkConnection: checkSupabaseConnection,
    isCloudMode: isCloudModeEnabled,
    enableCloud: enableCloudMode,
    disableCloud: disableCloudMode
};

// ============================================
// UI FUNCTIONS FOR CLOUD SYNC
// ============================================

// Enable cloud sync - simplified (no password needed)
async function cloudSignIn() {
    // Get current logged-in user from app session
    const session = JSON.parse(localStorage.getItem('erpSession') || '{}');
    const currentUser = session.user;
    
    if (!currentUser || !currentUser.email) {
        showNotification('⚠️ Please login to the app first before enabling cloud sync', 'warning');
        return;
    }
    
    const tenantId = getCurrentTenantIdForCloud();
    
    if (!tenantId || tenantId === 'default') {
        showNotification('⚠️ Invalid tenant. Please re-login.', 'warning');
        return;
    }
    
    // Simple confirmation
    const confirm = window.confirm(
        `Enable Cloud Sync?\n\n` +
        `Account: ${currentUser.email}\n` +
        `Tenant: ${tenantId.substring(0, 20)}...\n\n` +
        `Your data will sync across all your devices automatically.`
    );
    
    if (!confirm) return;
    
    showNotification('🔄 Enabling cloud sync...', 'info');
    console.log('☁️ Enabling tenant-based cloud sync for:', tenantId);
    
    // Enable cloud mode
    enableCloudMode();
    localStorage.setItem('ezcubic_cloud_tenant_mode', tenantId);
    
    // Test connection
    try {
        const client = getSupabase();
        const { error } = await client
            .from('tenant_data')
            .select('tenant_id')
            .eq('tenant_id', tenantId)
            .limit(1);
        
        if (error) {
            console.warn('☁️ Cloud test warning:', error.message);
            // Still enable - might just be empty table
        }
        
        console.log('☁️ Cloud sync enabled successfully!');
        showNotification('✅ Cloud sync enabled!', 'success');
        updateCloudSyncUI(true);
        
        // Trigger initial sync
        if (typeof window.fullCloudSync === 'function') {
            setTimeout(() => {
                window.fullCloudSync().then(() => {
                    showNotification('✅ Data synced to cloud!', 'success');
                }).catch(e => console.warn('Initial sync warning:', e.message));
            }, 1000);
        }
        
    } catch (e) {
        console.error('☁️ Cloud enable error:', e);
        showNotification('⚠️ Cloud connection issue - will retry automatically', 'warning');
        // Still enable mode - will sync when connection available
        updateCloudSyncUI(true);
    }
}

// Disable cloud sync
async function cloudSignOut() {
    const confirmed = confirm('Disable cloud sync?\n\nYour local data will be kept.\nYou can re-enable anytime.');
    if (!confirmed) return;
    
    // Clear cloud mode settings
    localStorage.removeItem('ezcubic_cloud_tenant_mode');
    disableCloudMode();
    
    // Also sign out of Supabase auth if any
    await supabaseSignOut();
    
    showNotification('☁️ Cloud sync disabled', 'info');
    updateCloudSyncUI(false);
}

// Manual sync trigger
async function cloudSyncNow() {
    // Check if cloud mode is enabled
    const tenantMode = localStorage.getItem('ezcubic_cloud_tenant_mode');
    const cloudEnabled = localStorage.getItem('cloudModeEnabled') === 'true';
    
    if (!tenantMode && !cloudEnabled) {
        showNotification('⚠️ Please enable cloud sync first', 'warning');
        return;
    }
    
    showNotification('🔄 Syncing with cloud...', 'info');
    updateCloudSyncUI(true, 'syncing');
    
    try {
        if (typeof window.fullCloudSync === 'function') {
            const result = await window.fullCloudSync();
            if (result.success) {
                showNotification('✅ Cloud sync complete!', 'success');
                updateLastSyncTime();
            } else if (result.offline) {
                showNotification('⚠️ Offline - will sync when connected', 'warning');
            } else {
                showNotification('⚠️ Sync issue: ' + (result.error || 'Unknown'), 'warning');
            }
        } else if (window.CloudSync) {
            const result = await window.CloudSync.syncBidirectional();
            if (result.success) {
                updateLastSyncTime();
            }
        } else {
            showNotification('⚠️ Cloud sync module not ready', 'warning');
        }
    } catch (e) {
        console.error('Cloud sync error:', e);
        showNotification('⚠️ Sync error - will retry', 'warning');
    }
    
    updateCloudSyncUI(true);
}

// Update cloud sync UI based on auth state
// state: 'connected', 'offline', 'service-down', 'syncing', 'pending'
function updateCloudSyncUI(isSignedIn, state = null) {
    const statusEl = document.getElementById('cloudSyncStatus');
    const signInBtn = document.getElementById('cloudSignInBtn');
    const syncBtn = document.getElementById('cloudSyncBtn');
    const signOutBtn = document.getElementById('cloudSignOutBtn');
    const infoEl = document.getElementById('cloudSyncInfo');
    const badge = document.getElementById('cloudSyncBadge');
    
    // Update sidebar badge (inline cloud icon next to version)
    if (badge) {
        if (state === 'syncing') {
            badge.style.display = 'inline-flex';
            badge.className = 'cloud-sync-badge-inline syncing';
            badge.innerHTML = '<i class="fas fa-sync"></i>';
            badge.title = 'Syncing data to cloud...';
        } else if (state === 'service-down' || state === 'error') {
            badge.style.display = 'inline-flex';
            badge.className = 'cloud-sync-badge-inline error';
            badge.innerHTML = '<i class="fas fa-exclamation-triangle"></i>';
            badge.title = 'Cloud sync error - data saved locally';
        } else if (isSignedIn) {
            badge.style.display = 'inline-flex';
            badge.className = 'cloud-sync-badge-inline';
            badge.innerHTML = '<i class="fas fa-cloud"></i>';
            badge.title = 'Cloud Backup Active';
            badge.onclick = () => showSection('settings');
        } else {
            badge.style.display = 'none';
        }
    }
    
    // Handle special states
    if (state === 'service-down') {
        if (statusEl) {
            statusEl.innerHTML = '<i class="fas fa-exclamation-triangle" style="color: #ef4444;"></i> Cloud Unavailable';
            statusEl.style.background = '#7f1d1d';
        }
        if (infoEl) infoEl.textContent = 'Cloud service temporarily unavailable. Data saved locally.';
        return;
    }
    
    if (state === 'syncing') {
        if (statusEl) {
            statusEl.innerHTML = '<i class="fas fa-sync fa-spin" style="color: #3b82f6;"></i> Syncing...';
            statusEl.style.background = '#1e40af';
        }
        return;
    }
    
    if (state === 'pending') {
        if (statusEl) {
            statusEl.innerHTML = '<i class="fas fa-clock" style="color: #f59e0b;"></i> Sync Pending';
            statusEl.style.background = '#92400e';
        }
        if (infoEl) infoEl.textContent = 'Changes will sync when cloud is available';
        return;
    }
    
    if (isSignedIn) {
        if (statusEl) statusEl.innerHTML = '<i class="fas fa-circle" style="color: #10b981;"></i> Connected';
        if (statusEl) statusEl.style.background = '#065f46';
        updateLastSyncTime();
    } else {
        if (statusEl) statusEl.innerHTML = '<i class="fas fa-circle" style="color: #fbbf24;"></i> Offline';
        if (statusEl) statusEl.style.background = '#475569';
        if (infoEl) infoEl.textContent = 'Login to enable cloud backup';
    }
}

// Update last sync time display
function updateLastSyncTime() {
    const infoEl = document.getElementById('cloudSyncInfo');
    const lastSync = localStorage.getItem('lastCloudSync');
    
    if (infoEl) {
        if (lastSync) {
            const syncDate = new Date(lastSync);
            infoEl.textContent = `Last sync: ${syncDate.toLocaleString()}`;
        } else {
            infoEl.textContent = 'Not synced yet';
        }
    }
}

// Get current tenant ID helper
function getCurrentTenantIdForCloud() {
    const session = JSON.parse(localStorage.getItem('erpSession') || '{}');
    return session.tenantId || localStorage.getItem('currentTenantId') || 'default';
}

// Force sync users to cloud (for testing/debugging)
async function forceSyncUsers() {
    console.log('🔄 Force syncing users to cloud...');
    if (window.CloudSync && typeof window.CloudSync.syncUsersNow === 'function') {
        const result = await window.CloudSync.syncUsersNow();
        console.log('Force sync result:', result);
        return result;
    }
    return { success: false, error: 'CloudSync not available' };
}

// Force download users from cloud
async function forceDownloadUsers() {
    console.log('📥 Force downloading users from cloud...');
    if (window.CloudSync && typeof window.CloudSync.downloadGlobalData === 'function') {
        const result = await window.CloudSync.downloadGlobalData();
        console.log('Force download result:', result);
        // Reload users
        if (typeof window.loadUsers === 'function') {
            window.loadUsers();
        }
        return result;
    }
    return { success: false, error: 'CloudSync not available' };
}

// Check and update cloud status on page load
async function initCloudSyncUI() {
    if (!window.SupabaseConfig) {
        setTimeout(initCloudSyncUI, 500);
        return;
    }
    
    // Check for Supabase auth session first
    const session = await supabaseGetSession();
    if (session) {
        updateCloudSyncUI(true);
        return;
    }
    
    // Also check for tenant-mode cloud sync (no auth required)
    const tenantMode = localStorage.getItem('ezcubic_cloud_tenant_mode');
    const cloudModeEnabled = localStorage.getItem('cloudModeEnabled') === 'true';
    
    if (tenantMode || cloudModeEnabled) {
        console.log('☁️ Tenant-mode cloud sync active');
        updateCloudSyncUI(true);
        return;
    }
    
    updateCloudSyncUI(false);
}

// Initialize UI when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(initCloudSyncUI, 1000);
    });
} else {
    setTimeout(initCloudSyncUI, 1000);
}

// Make functions globally available
window.cloudSignIn = cloudSignIn;
window.cloudSignOut = cloudSignOut;
window.cloudSyncNow = cloudSyncNow;
window.forceSyncUsers = forceSyncUsers;
window.forceDownloadUsers = forceDownloadUsers;
window.updateCloudSyncUI = updateCloudSyncUI;

// DEBUG: Check what users are in cloud vs local
window.debugUserSync = async function() {
    console.log('=== DEBUG USER SYNC ===');
    
    // 1. Check local users
    const localUsers = JSON.parse(localStorage.getItem('ezcubic_users') || '[]');
    console.log('📱 LOCAL users:', localUsers.map(u => ({ id: u.id, email: u.email, role: u.role })));
    
    // 2. Check cloud users
    try {
        const { data, error } = await window.SupabaseConfig.getClient()
            .from('tenant_data')
            .select('*')
            .eq('tenant_id', 'global')
            .eq('data_key', 'ezcubic_users');
        
        if (error) {
            console.error('❌ Cloud query error:', error);
            return { local: localUsers, cloud: null, error: error.message };
        } else if (data && data.length > 0) {
            const cloudUsers = data[0].data?.value || [];
            console.log('☁️ CLOUD users:', cloudUsers.map(u => ({ id: u.id, email: u.email, role: u.role })));
            return { local: localUsers, cloud: cloudUsers };
        } else {
            console.log('☁️ CLOUD: No users found in cloud');
            return { local: localUsers, cloud: [] };
        }
    } catch (err) {
        console.error('❌ Debug error:', err);
        return { local: localUsers, cloud: null, error: err.message };
    }
};

// DEBUG: Show sync status in a popup (for mobile)
window.showSyncDebug = async function() {
    const result = await window.debugUserSync();
    
    const localList = result.local.map(u => `• ${u.email} (${u.role})`).join('\n') || 'None';
    const cloudList = result.cloud ? result.cloud.map(u => `• ${u.email} (${u.role})`).join('\n') || 'None' : 'Error: ' + result.error;
    
    const message = `📱 LOCAL USERS:\n${localList}\n\n☁️ CLOUD USERS:\n${cloudList}`;
    
    alert(message);
    
    // Also offer to force sync
    if (confirm('Force upload local users to cloud?')) {
        await window.forceSyncUsers();
        alert('✅ Users uploaded to cloud! Now check other device.');
    }
};

console.log('🐱 Supabase module loaded');
