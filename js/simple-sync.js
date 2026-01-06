/**
 * EZCubic Simple Cloud Sync
 * Cloud-First Approach: Cloud is the single source of truth
 * 
 * Rules:
 * 1. SAVE: Local → Tenant → Cloud (with retry)
 * 2. LOGIN: Cloud → Local (cloud wins)
 * 3. OFFLINE: Queue changes, sync when online
 * 
 * @version 1.0.0
 * @date 2026-01-07
 */

// ==================== SYNC STATE ====================
const SYNC_QUEUE_KEY = 'ezcubic_sync_queue';
const SYNC_STATUS_KEY = 'ezcubic_sync_status';

let syncState = {
    status: 'idle', // 'idle', 'syncing', 'success', 'error', 'offline', 'pending'
    lastSync: null,
    pendingChanges: 0,
    retryCount: 0,
    maxRetries: 3
};

// ==================== SYNC STATUS UI ====================

/**
 * Update the sync status indicator in the UI
 */
function updateSyncStatusUI() {
    const badge = document.getElementById('cloudSyncBadge') || document.querySelector('.cloud-sync-badge-inline');
    if (!badge) return;
    
    // Remove all status classes
    badge.classList.remove('syncing', 'offline', 'error', 'pending', 'success');
    
    const icon = badge.querySelector('i');
    const text = badge.querySelector('span') || badge;
    
    switch (syncState.status) {
        case 'syncing':
            badge.classList.add('syncing');
            if (icon) icon.className = 'fas fa-sync fa-spin';
            badge.title = 'Syncing to cloud...';
            break;
        case 'success':
            badge.classList.add('success');
            if (icon) icon.className = 'fas fa-cloud-check';
            badge.title = 'Synced to cloud';
            // Reset to idle after 3 seconds
            setTimeout(() => {
                if (syncState.status === 'success') {
                    syncState.status = 'idle';
                    updateSyncStatusUI();
                }
            }, 3000);
            break;
        case 'error':
            badge.classList.add('error');
            if (icon) icon.className = 'fas fa-cloud-exclamation';
            badge.title = 'Sync failed - click to retry';
            break;
        case 'offline':
            badge.classList.add('offline');
            if (icon) icon.className = 'fas fa-cloud-slash';
            badge.title = 'Offline - changes will sync when online';
            break;
        case 'pending':
            badge.classList.add('pending');
            if (icon) icon.className = 'fas fa-cloud-arrow-up';
            badge.title = `${syncState.pendingChanges} changes pending sync`;
            break;
        default: // idle
            if (icon) icon.className = 'fas fa-cloud';
            badge.title = 'Cloud sync ready';
    }
}

/**
 * Show sync toast notification
 */
function showSyncToast(message, type = 'info') {
    if (typeof showToast === 'function') {
        showToast(message, type);
    } else if (typeof showNotification === 'function') {
        showNotification(message, type);
    }
}

// ==================== OFFLINE QUEUE ====================

/**
 * Add change to offline queue
 */
function queueOfflineChange(changeType, data) {
    const queue = JSON.parse(localStorage.getItem(SYNC_QUEUE_KEY) || '[]');
    queue.push({
        type: changeType,
        data: data,
        timestamp: Date.now()
    });
    localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(queue));
    syncState.pendingChanges = queue.length;
    syncState.status = 'pending';
    updateSyncStatusUI();
    console.log('📤 Queued offline change:', changeType);
}

/**
 * Process offline queue when back online
 */
async function processOfflineQueue() {
    const queue = JSON.parse(localStorage.getItem(SYNC_QUEUE_KEY) || '[]');
    if (queue.length === 0) return;
    
    console.log('📤 Processing', queue.length, 'queued changes...');
    
    // Just do a full sync - simpler than processing individual changes
    const success = await pushToCloud();
    
    if (success) {
        localStorage.setItem(SYNC_QUEUE_KEY, '[]');
        syncState.pendingChanges = 0;
        console.log('✅ Offline queue processed');
    }
}

// ==================== CHECK ONLINE STATUS ====================

/**
 * Check if we can reach the cloud
 */
async function isCloudReachable() {
    if (!navigator.onLine) return false;
    
    try {
        // Try to reach Supabase
        if (!window.supabase?.createClient) return false;
        
        const client = getSimpleSyncSupabaseClient();
        if (!client) return false;
        
        // Quick health check
        const { error } = await client.from('users').select('id').limit(1);
        return !error;
    } catch (e) {
        return false;
    }
}

/**
 * Get Supabase client for sync
 */
function getSimpleSyncSupabaseClient() {
    // Use existing client if available (from users.js or supabase.js)
    if (typeof getUsersSupabaseClient === 'function') {
        return getUsersSupabaseClient();
    }
    
    if (typeof window.getSupabaseClient === 'function') {
        return window.getSupabaseClient();
    }
    
    console.warn('⚠️ No Supabase client available');
    return null;
}

// ==================== PUSH TO CLOUD ====================

/**
 * Push current tenant data to cloud
 * Call this after any data save
 */
async function pushToCloud(showFeedback = true) {
    const user = window.currentUser;
    if (!user || !user.tenantId) {
        console.log('⚠️ No user/tenant for cloud push');
        return false;
    }
    
    // Check if online
    const online = await isCloudReachable();
    if (!online) {
        syncState.status = 'offline';
        updateSyncStatusUI();
        if (showFeedback) showSyncToast('Offline - changes saved locally', 'warning');
        return false;
    }
    
    syncState.status = 'syncing';
    updateSyncStatusUI();
    
    try {
        const tenantKey = 'ezcubic_tenant_' + user.tenantId;
        const tenantData = JSON.parse(localStorage.getItem(tenantKey) || '{}');
        
        if (!tenantData || Object.keys(tenantData).length === 0) {
            console.log('⚠️ No tenant data to push');
            return false;
        }
        
        // Add sync metadata
        tenantData.lastSyncedAt = new Date().toISOString();
        tenantData.syncedBy = user.id;
        tenantData.syncedFrom = navigator.userAgent.includes('Mobile') ? 'mobile' : 'desktop';
        
        const client = getSimpleSyncSupabaseClient();
        if (!client) {
            throw new Error('Supabase client not available');
        }
        
        const { error } = await client.from('tenant_data').upsert({
            tenant_id: user.tenantId,
            data_key: 'tenant_full_data',
            data: {
                tenantId: user.tenantId,
                value: tenantData,
                synced_at: new Date().toISOString()
            },
            updated_at: new Date().toISOString()
        }, { onConflict: 'tenant_id,data_key' });
        
        if (error) throw error;
        
        // Update local tenant storage with sync timestamp
        localStorage.setItem(tenantKey, JSON.stringify(tenantData));
        
        syncState.status = 'success';
        syncState.lastSync = new Date().toISOString();
        syncState.retryCount = 0;
        updateSyncStatusUI();
        
        console.log('✅ Pushed to cloud:', user.tenantId);
        if (showFeedback) showSyncToast('✅ Synced to cloud', 'success');
        
        return true;
        
    } catch (err) {
        console.error('❌ Push to cloud failed:', err);
        syncState.status = 'error';
        syncState.retryCount++;
        updateSyncStatusUI();
        
        if (showFeedback) showSyncToast('❌ Sync failed - will retry', 'error');
        
        // Auto-retry up to maxRetries
        if (syncState.retryCount < syncState.maxRetries) {
            setTimeout(() => pushToCloud(false), 5000 * syncState.retryCount);
        }
        
        return false;
    }
}

// ==================== PULL FROM CLOUD ====================

/**
 * Pull tenant data from cloud and overwrite local
 * Call this on login
 */
async function pullFromCloud(tenantId) {
    if (!tenantId) {
        const user = window.currentUser;
        tenantId = user?.tenantId;
    }
    
    if (!tenantId) {
        console.log('⚠️ No tenant ID for cloud pull');
        return null;
    }
    
    syncState.status = 'syncing';
    updateSyncStatusUI();
    
    try {
        const client = getSimpleSyncSupabaseClient();
        if (!client) {
            throw new Error('Supabase client not available');
        }
        
        const { data, error } = await client.from('tenant_data')
            .select('*')
            .eq('tenant_id', tenantId)
            .eq('data_key', 'tenant_full_data')
            .single();
        
        if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
            throw error;
        }
        
        if (data?.data?.value) {
            const cloudData = data.data.value;
            const tenantKey = 'ezcubic_tenant_' + tenantId;
            
            // SIMPLE: Cloud wins - just save cloud data to local
            localStorage.setItem(tenantKey, JSON.stringify(cloudData));
            
            // Extract to individual localStorage keys for modules that read directly
            extractToLocalStorage(cloudData);
            
            syncState.status = 'success';
            syncState.lastSync = new Date().toISOString();
            updateSyncStatusUI();
            
            console.log('✅ Pulled from cloud:', tenantId);
            console.log('  Products:', cloudData.products?.length || 0);
            console.log('  Customers:', cloudData.customers?.length || 0);
            
            return cloudData;
        } else {
            console.log('☁️ No cloud data for tenant:', tenantId);
            syncState.status = 'idle';
            updateSyncStatusUI();
            return null;
        }
        
    } catch (err) {
        console.error('❌ Pull from cloud failed:', err);
        syncState.status = 'error';
        updateSyncStatusUI();
        return null;
    }
}

/**
 * Extract tenant data to individual localStorage keys
 */
function extractToLocalStorage(tenantData) {
    if (!tenantData) return;
    
    const mappings = {
        products: 'ezcubic_products',
        customers: 'ezcubic_customers',
        crmCustomers: 'ezcubic_crm_customers',
        suppliers: 'ezcubic_suppliers',
        branches: 'ezcubic_branches',
        quotations: 'ezcubic_quotations',
        projects: 'ezcubic_projects',
        employees: 'ezcubic_employees',
        stockMovements: 'ezcubic_stock_movements',
        sales: 'ezcubic_sales',
        orders: 'ezcubic_orders',
        transactions: 'ezcubic_transactions',
        bills: 'ezcubic_bills',
        heldSales: 'ezcubic_held_sales',
        purchaseOrders: 'ezcubic_purchase_orders',
        invoices: 'ezcubic_invoices'
    };
    
    for (const [key, storageKey] of Object.entries(mappings)) {
        const value = tenantData[key];
        if (value !== undefined) {
            localStorage.setItem(storageKey, JSON.stringify(value));
            console.log(`  ↳ ${storageKey}: ${Array.isArray(value) ? value.length : 'set'}`);
        }
    }
    
    // Also update window arrays for immediate use
    if (tenantData.products) window.products = tenantData.products;
    if (tenantData.customers) window.customers = tenantData.customers;
    if (tenantData.crmCustomers) window.crmCustomers = tenantData.crmCustomers;
    if (tenantData.suppliers) window.suppliers = tenantData.suppliers;
    if (tenantData.branches) window.branches = tenantData.branches;
    if (tenantData.sales) window.sales = tenantData.sales;
    if (tenantData.employees) window.employees = tenantData.employees;
}

// ==================== SIMPLE SYNC HELPER ====================

/**
 * Helper to save data and sync to cloud
 * Use this in all save functions
 */
async function saveAndSync(dataType, data, tenantKey = null) {
    const user = window.currentUser;
    if (!user || !user.tenantId) {
        console.warn('⚠️ No user for saveAndSync');
        return false;
    }
    
    const tenantStorageKey = 'ezcubic_tenant_' + user.tenantId;
    
    // 1. Save to individual localStorage key (for modules that read directly)
    const storageKeyMap = {
        products: 'ezcubic_products',
        customers: 'ezcubic_customers',
        crmCustomers: 'ezcubic_crm_customers',
        suppliers: 'ezcubic_suppliers',
        branches: 'ezcubic_branches',
        quotations: 'ezcubic_quotations',
        projects: 'ezcubic_projects',
        employees: 'ezcubic_employees',
        stockMovements: 'ezcubic_stock_movements',
        sales: 'ezcubic_sales',
        orders: 'ezcubic_orders',
        transactions: 'ezcubic_transactions',
        bills: 'ezcubic_bills',
        heldSales: 'ezcubic_held_sales'
    };
    
    const storageKey = storageKeyMap[dataType] || tenantKey;
    if (storageKey) {
        localStorage.setItem(storageKey, JSON.stringify(data));
    }
    
    // 2. Save to tenant storage
    let tenantData = JSON.parse(localStorage.getItem(tenantStorageKey) || '{}');
    tenantData[dataType] = data;
    tenantData.updatedAt = new Date().toISOString();
    localStorage.setItem(tenantStorageKey, JSON.stringify(tenantData));
    
    // 3. Push to cloud (async, don't wait)
    pushToCloud(true);
    
    return true;
}

// ==================== ONLINE/OFFLINE LISTENERS ====================

window.addEventListener('online', async () => {
    console.log('🌐 Back online!');
    syncState.status = 'idle';
    updateSyncStatusUI();
    
    // Process any queued changes
    await processOfflineQueue();
    
    // Do a full push to ensure cloud is up to date
    await pushToCloud(true);
});

window.addEventListener('offline', () => {
    console.log('📴 Gone offline');
    syncState.status = 'offline';
    updateSyncStatusUI();
});

// ==================== MANUAL SYNC BUTTON ====================

/**
 * Force sync - can be called from UI
 */
async function forceSyncNow() {
    showSyncToast('🔄 Syncing...', 'info');
    
    const user = window.currentUser;
    if (!user || !user.tenantId) {
        showSyncToast('❌ Please login first', 'error');
        return;
    }
    
    // First pull from cloud to get any changes from other devices
    const cloudData = await pullFromCloud(user.tenantId);
    
    if (cloudData) {
        // Reload UI with new data
        if (typeof initializeApp === 'function') {
            // Just refresh the current section
            const currentSection = document.querySelector('.content-section.active')?.id;
            if (currentSection) {
                showSection(currentSection);
            }
        }
    }
    
    // Then push local changes to cloud
    await pushToCloud(true);
}

// ==================== EXPORTS ====================

window.simpleSync = {
    push: pushToCloud,
    pull: pullFromCloud,
    saveAndSync: saveAndSync,
    forceSync: forceSyncNow,
    getStatus: () => syncState,
    updateUI: updateSyncStatusUI
};

window.pushToCloud = pushToCloud;
window.pullFromCloud = pullFromCloud;
window.saveAndSync = saveAndSync;
window.forceSyncNow = forceSyncNow;

console.log('✅ Simple Sync module loaded');
console.log('   Use window.simpleSync.push() to push to cloud');
console.log('   Use window.simpleSync.pull() to pull from cloud');
console.log('   Use window.forceSyncNow() to force sync');
