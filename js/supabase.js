// ============================================
// A LAZY HUMAN ERP - SUPABASE CONFIGURATION
// Cloud Database & Authentication
// ============================================

const SUPABASE_URL = 'https://tctpmizdcksdxngtozwe.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRjdHBtaXpkY2tzZHhuZ3RvendlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYyOTE1NzAsImV4cCI6MjA4MTg2NzU3MH0.-BL0NoQxVfFA3MXEuIrC24G6mpkn7HGIyyoRBVFu300';

// Initialize Supabase client
let supabase = null;

function initSupabase() {
    if (typeof window.supabase !== 'undefined' && window.supabase.createClient) {
        supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        console.log('🐱 Supabase initialized successfully');
        return true;
    } else {
        console.warn('⚠️ Supabase SDK not loaded yet');
        return false;
    }
}

// Get Supabase client instance
function getSupabase() {
    if (!supabase) {
        initSupabase();
    }
    return supabase;
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
        const { data: result, error } = await getSupabase()
            .from(tableName)
            .upsert({
                tenant_id: tenantId,
                data: data,
                updated_at: new Date().toISOString()
            }, {
                onConflict: 'tenant_id'
            });
        
        if (error) throw error;
        
        console.log(`✅ Saved ${tableName} for tenant ${tenantId}`);
        return { success: true, data: result };
    } catch (error) {
        console.error(`❌ Save ${tableName} error:`, error.message);
        return { success: false, error: error.message };
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

// Show cloud sign-in modal
async function cloudSignIn() {
    const email = prompt('Enter your email for cloud sync:');
    if (!email) return;
    
    const password = prompt('Enter your password (or create one for new account):');
    if (!password) return;
    
    // Try to sign in first
    showNotification('Connecting to cloud...', 'info');
    let result = await supabaseSignIn(email, password);
    
    if (!result.success) {
        // If sign in fails, try to sign up
        if (result.error.includes('Invalid login credentials')) {
            const confirmSignUp = confirm('Account not found. Create a new cloud account with this email?');
            if (confirmSignUp) {
                result = await supabaseSignUp(email, password, {
                    tenant_id: getCurrentTenantIdForCloud()
                });
                
                if (result.success) {
                    showNotification('✅ Cloud account created! Please check your email to verify.', 'success');
                    updateCloudSyncUI(true);
                    enableCloudMode();
                } else {
                    showNotification('❌ Sign up failed: ' + result.error, 'error');
                }
            }
        } else {
            showNotification('❌ Sign in failed: ' + result.error, 'error');
        }
    } else {
        showNotification('✅ Connected to cloud!', 'success');
        updateCloudSyncUI(true);
        enableCloudMode();
        
        // Trigger initial sync
        if (window.CloudSync) {
            setTimeout(() => window.CloudSync.syncBidirectional(), 1000);
        }
    }
}

// Sign out of cloud
async function cloudSignOut() {
    const confirmed = confirm('Sign out of cloud sync? Your local data will be kept.');
    if (!confirmed) return;
    
    const result = await supabaseSignOut();
    if (result.success) {
        showNotification('Signed out of cloud', 'info');
        updateCloudSyncUI(false);
        disableCloudMode();
    }
}

// Manual sync trigger
async function cloudSyncNow() {
    if (!window.CloudSync) {
        showNotification('Cloud sync module not loaded', 'error');
        return;
    }
    
    showNotification('🔄 Syncing with cloud...', 'info');
    const result = await window.CloudSync.syncBidirectional();
    
    if (result.success) {
        showNotification('✅ Cloud sync complete!', 'success');
        updateLastSyncTime();
    } else {
        showNotification('❌ Sync failed: ' + (result.error || result.reason), 'error');
    }
}

// Update cloud sync UI based on auth state
function updateCloudSyncUI(isSignedIn) {
    const statusEl = document.getElementById('cloudSyncStatus');
    const signInBtn = document.getElementById('cloudSignInBtn');
    const syncBtn = document.getElementById('cloudSyncBtn');
    const signOutBtn = document.getElementById('cloudSignOutBtn');
    const infoEl = document.getElementById('cloudSyncInfo');
    
    if (isSignedIn) {
        if (statusEl) statusEl.innerHTML = '<i class="fas fa-circle" style="color: #10b981;"></i> Connected';
        if (statusEl) statusEl.style.background = '#065f46';
        if (signInBtn) signInBtn.style.display = 'none';
        if (syncBtn) syncBtn.style.display = 'inline-flex';
        if (signOutBtn) signOutBtn.style.display = 'inline-flex';
        updateLastSyncTime();
    } else {
        if (statusEl) statusEl.innerHTML = '<i class="fas fa-circle" style="color: #fbbf24;"></i> Offline';
        if (statusEl) statusEl.style.background = '#475569';
        if (signInBtn) signInBtn.style.display = 'inline-flex';
        if (syncBtn) syncBtn.style.display = 'none';
        if (signOutBtn) signOutBtn.style.display = 'none';
        if (infoEl) infoEl.textContent = 'Sign in to sync data across devices';
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

// Check and update cloud status on page load
async function initCloudSyncUI() {
    if (!window.SupabaseConfig) {
        setTimeout(initCloudSyncUI, 500);
        return;
    }
    
    const session = await supabaseGetSession();
    updateCloudSyncUI(!!session);
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
window.updateCloudSyncUI = updateCloudSyncUI;

console.log('🐱 Supabase module loaded');
