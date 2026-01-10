/**
 * Ez.Smart Cloud Sync Utilities Module
 * =====================================
 * Extracted from users.js for modular architecture
 * 
 * Purpose: Cloud synchronization test and utility functions
 * - Supabase connection testing
 * - Force sync users/tenants to cloud
 * - Download users from cloud (role-aware)
 * - Full tenant data sync
 * - Company code based sync for staff devices
 * 
 * Dependencies:
 * - window.supabase (Supabase SDK)
 * - getUsersSupabaseClient() from users.js
 * - ensureFounderExists() from auth.js
 * - generateCompanyCode() from users.js
 * - localStorage for data storage
 * 
 * Version: 1.1.0 - Added sync status tracking & timestamp-based resolution
 * Last Updated: 2026-01-04
 */

(function() {
    'use strict';
    
    // ==================== SYNC STATUS TRACKING ====================
    /**
     * Global sync status - tracks if sync is in progress and last sync times
     */
    window.syncStatus = {
        inProgress: false,
        lastSync: null,
        lastError: null,
        pendingChanges: 0,
        isOnline: navigator.onLine
    };
    
    // Track online/offline status
    window.addEventListener('online', () => {
        window.syncStatus.isOnline = true;
        console.log('🌐 Back online - will sync pending changes');
        // Trigger sync of any pending changes
        if (window.syncStatus.pendingChanges > 0 && typeof window.forceSyncUsersToCloud === 'function') {
            window.forceSyncUsersToCloud(true);
        }
    });
    
    window.addEventListener('offline', () => {
        window.syncStatus.isOnline = false;
        console.log('📴 Offline - changes will sync when back online');
    });
    
    /**
     * Get sync status for UI display
     * Run: getSyncStatus()
     */
    window.getSyncStatus = function() {
        const status = window.syncStatus;
        const lastSyncAgo = status.lastSync 
            ? Math.round((Date.now() - new Date(status.lastSync).getTime()) / 1000) + 's ago'
            : 'Never';
        
        return {
            ...status,
            lastSyncAgo,
            statusText: status.inProgress ? '🔄 Syncing...' 
                : status.lastError ? '⚠️ Sync Error' 
                : status.isOnline ? '✅ Synced' 
                : '📴 Offline'
        };
    };
    
    // ==================== CLOUD CONNECTION TEST ====================
    /**
     * Test Supabase connection
     * Run in console: testCloudConnection()
     * @returns {Object} Test result with success status and data
     */
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
    
    // ==================== FORCE SYNC USERS TO CLOUD ====================
    /**
     * Force sync all users to cloud NOW
     * IMPORTANT: This MERGES local users with cloud users, not replace!
     * Run: forceSyncUsersToCloud()
     * @param {boolean} silent - If true, suppress alerts (for background sync)
     * @returns {Object} Result with success status
     */
    window.forceSyncUsersToCloud = async function(silent = true) {
        console.log('☁️ Force syncing users to cloud (MERGE mode)...');
        console.log('🔍 [SYNC DEBUG] Function called, silent:', silent);
        
        // Prevent concurrent syncs
        if (window.syncStatus.inProgress) {
            console.log('⏸️ Sync already in progress, skipping...');
            return { success: false, error: 'Sync already in progress' };
        }
        
        window.syncStatus.inProgress = true;
        
        try {
            // Wait for Supabase SDK to be ready
            console.log('🔍 [SYNC DEBUG] Checking Supabase SDK availability...');
            let retries = 0;
            while (!window.supabase?.createClient && retries < 20) {
                console.log('🔍 [SYNC DEBUG] SDK not ready, waiting... retry', retries + 1);
                await new Promise(r => setTimeout(r, 300));
                retries++;
            }
            
            if (!window.supabase?.createClient) {
                const msg = 'Supabase SDK not loaded';
                console.error('❌ [SYNC DEBUG]', msg);
                window.syncStatus.inProgress = false;
                window.syncStatus.lastError = msg;
                if (!silent) alert('❌ ' + msg);
                return { success: false, error: msg };
            }
            
            console.log('🔍 [SYNC DEBUG] Supabase SDK ready, getting client...');
            const client = getUsersSupabaseClient();
            console.log('🔍 [SYNC DEBUG] Client obtained:', !!client);
            console.log('🔍 [SYNC DEBUG] Client from() method:', typeof client?.from);
            if (!client) {
                const msg = 'Could not get Supabase client';
                console.error('❌ [SYNC DEBUG]', msg);
                window.syncStatus.inProgress = false;
                window.syncStatus.lastError = msg;
                if (!silent) alert('❌ ' + msg);
                return { success: false, error: msg };
            }
            
            // STEP 1: Download existing cloud users first (to merge, not replace!)
            console.log('🔍 [SYNC DEBUG] STEP 1: Downloading cloud users...');
            let cloudUsers = [];
            let cloudTenants = {};
            let cloudDeletedUsers = [];
            let cloudDeletedTenants = [];
            
            try {
                console.log('🔍 [SYNC DEBUG] Querying tenant_data table...');
                const queryResult = await client
                    .from('tenant_data')
                    .select('*')
                    .eq('tenant_id', 'global');
                    
                console.log('🔍 [SYNC DEBUG] Raw query result:', queryResult);
                const { data: cloudData, error: downloadError } = queryResult;
                
                console.log('🔍 [SYNC DEBUG] Cloud download result:', { dataLength: cloudData?.length, error: downloadError });
                
                if (downloadError) {
                    console.error('🔍 [SYNC DEBUG] Download error:', downloadError);
                }
                
                if (!downloadError && cloudData) {
                    console.log('🔍 [SYNC DEBUG] Processing', cloudData.length, 'cloud records...');
                    
                    // CRITICAL: Process deletion tracking lists FIRST
                    for (const record of cloudData) {
                        if (record.data_key === 'ezcubic_deleted_users' && record.data?.value) {
                            cloudDeletedUsers = record.data.value;
                            console.log('  ☁️ Cloud deleted users tracking:', cloudDeletedUsers.length);
                        }
                        if (record.data_key === 'ezcubic_deleted_tenants' && record.data?.value) {
                            cloudDeletedTenants = record.data.value;
                            console.log('  ☁️ Cloud deleted tenants tracking:', cloudDeletedTenants.length);
                        }
                    }
                    
                    // Now process users and tenants
                    for (const record of cloudData) {
                        console.log('🔍 [SYNC DEBUG] Record data_key:', record.data_key);
                        if (record.data_key === 'ezcubic_users' && record.data?.value) {
                            cloudUsers = record.data.value;
                            console.log('  ☁️ Cloud users found:', cloudUsers.length);
                            console.log('  ☁️ Cloud user emails:', cloudUsers.map(u => u.email));
                        }
                        if (record.data_key === 'ezcubic_tenants' && record.data?.value) {
                            cloudTenants = record.data.value;
                            console.log('  ☁️ Cloud tenants found:', Object.keys(cloudTenants).length);
                        }
                    }
                }
            } catch (e) {
                console.error('  ⚠️ Could not fetch cloud data for merge:', e);
                console.warn('  ⚠️ Error message:', e.message);
            }
            
            // STEP 2: Merge local users with cloud users
            console.log('🔍 [SYNC DEBUG] STEP 2: Merging local and cloud users...');
            
            // DEBUG: Check raw localStorage
            const rawLocalUsers = localStorage.getItem('ezcubic_users');
            console.log('🔍 [SYNC DEBUG] RAW localStorage ezcubic_users:', rawLocalUsers);
            
            const localUsers = JSON.parse(rawLocalUsers || '[]');
            const localTenants = JSON.parse(localStorage.getItem('ezcubic_tenants') || '{}');
            
            // CRITICAL: Merge deletion tracking lists from local AND cloud
            // Use Set to combine and deduplicate
            const localDeletedUsers = JSON.parse(localStorage.getItem('ezcubic_deleted_users') || '[]');
            const localDeletedTenants = JSON.parse(localStorage.getItem('ezcubic_deleted_tenants') || '[]');
            
            const deletedUsers = [...new Set([...localDeletedUsers, ...cloudDeletedUsers])];
            const deletedTenants = [...new Set([...localDeletedTenants, ...cloudDeletedTenants])];
            
            // Update local storage with merged deletion tracking
            localStorage.setItem('ezcubic_deleted_users', JSON.stringify(deletedUsers));
            localStorage.setItem('ezcubic_deleted_tenants', JSON.stringify(deletedTenants));
            
            console.log('  📱 Local users:', localUsers.length);
            console.log('  📱 Local tenants:', Object.keys(localTenants).length);
            console.log('  🗑️ Deleted users tracked (local):', localDeletedUsers.length);
            console.log('  🗑️ Deleted users tracked (cloud):', cloudDeletedUsers.length);
            console.log('  🗑️ Deleted users tracked (merged):', deletedUsers.length);
            console.log('  🗑️ Deleted tenants tracked (local):', localDeletedTenants.length);
            console.log('  🗑️ Deleted tenants tracked (cloud):', cloudDeletedTenants.length);
            console.log('  🗑️ Deleted tenants tracked (merged):', deletedTenants.length);
            console.log('🔍 [SYNC DEBUG] Local users FULL DATA:');
            localUsers.forEach((u, i) => {
                console.log(`  [${i}] email: ${u.email}, role: ${u.role}, id: ${u.id}`);
            });
            
            // Create merged users map (use email as unique key)
            const mergedUsersMap = new Map();
            
            // Add cloud users first - BUT skip deleted ones
            console.log('🔍 [SYNC DEBUG] Adding cloud users to map...');
            cloudUsers.forEach(u => {
                const key = u.email || u.id;
                // Skip if user was deleted
                if (deletedUsers.includes(u.id) || deletedUsers.includes(u.email)) {
                    console.log('  🗑️ Skipping deleted user from cloud:', u.email);
                    return;
                }
                if (u.email) mergedUsersMap.set(u.email, u);
                else if (u.id) mergedUsersMap.set(u.id, u);
            });
            
            // Add/update with local users
            // CRITICAL: Admin-controlled fields (plan, role, permissions, status) ALWAYS come from cloud
            // because only founder/admin can change these from Platform Control
            console.log('🔍 [SYNC DEBUG] Merging local users into map...');
            localUsers.forEach(u => {
                const key = u.email || u.id;
                const existing = mergedUsersMap.get(key);
                if (!existing) {
                    // New user from local - add to cloud
                    mergedUsersMap.set(key, u);
                    console.log('  ➕ Adding new user to cloud:', u.email);
                } else {
                    // Existing user - merge carefully using timestamps
                    // Newer updatedAt wins for admin-controlled fields (plan, role, permissions, status)
                    const localTime = new Date(u.updatedAt || u.createdAt || 0).getTime();
                    const cloudTime = new Date(existing.updatedAt || existing.createdAt || 0).getTime();
                    
                    // Use whichever has newer admin fields
                    const useLocalAdmin = localTime >= cloudTime;
                    
                    const mergedUser = {
                        ...existing,  // Start with cloud data
                        ...u,         // Apply local changes
                        // Admin-controlled fields: use whichever is newer
                        plan: useLocalAdmin ? (u.plan || existing.plan) : (existing.plan || u.plan),
                        role: useLocalAdmin ? (u.role || existing.role) : (existing.role || u.role),
                        permissions: useLocalAdmin ? (u.permissions || existing.permissions) : (existing.permissions || u.permissions),
                        status: useLocalAdmin ? (u.status || existing.status) : (existing.status || u.status),
                        updatedAt: useLocalAdmin ? u.updatedAt : existing.updatedAt
                    };
                    mergedUsersMap.set(key, mergedUser);
                    if (existing.plan !== u.plan) {
                        console.log(`  🔄 Plan sync: ${u.email} local=${u.plan} cloud=${existing.plan} → using ${useLocalAdmin ? 'local' : 'cloud'} (newer)`);
                    }
                }
            });
            
            const mergedUsers = Array.from(mergedUsersMap.values());
            console.log('  🔄 Merged users total:', mergedUsers.length);
            console.log('🔍 [SYNC DEBUG] Merged users emails:', mergedUsers.map(u => u.email));
            
            // Merge tenants - but skip deleted ones
            const mergedTenants = {};
            // Add cloud tenants first (skip deleted)
            Object.entries(cloudTenants).forEach(([id, tenant]) => {
                if (!deletedTenants.includes(id)) {
                    mergedTenants[id] = tenant;
                } else {
                    console.log('  🗑️ Skipping deleted tenant from cloud:', id);
                }
            });
            // Add/override with local tenants (skip deleted)
            Object.entries(localTenants).forEach(([id, tenant]) => {
                if (!deletedTenants.includes(id)) {
                    mergedTenants[id] = tenant;
                }
            });
            console.log('  🔄 Merged tenants total:', Object.keys(mergedTenants).length);
            
            // STEP 3: Upload merged data to cloud
            console.log('🔍 [SYNC DEBUG] STEP 3: Uploading to cloud...');
            console.log('🔍 [SYNC DEBUG] Preparing upsert with', mergedUsers.length, 'users');
            
            const { error: usersError } = await client.from('tenant_data').upsert({
                tenant_id: 'global',
                data_key: 'ezcubic_users',
                data: { key: 'ezcubic_users', value: mergedUsers, synced_at: new Date().toISOString() },
                updated_at: new Date().toISOString()
            }, { onConflict: 'tenant_id,data_key' });
            
            console.log('🔍 [SYNC DEBUG] Upsert result - error:', usersError);
            
            if (usersError) {
                console.error('❌ Users sync failed:', usersError.message);
                if (!silent) alert('❌ Users sync failed: ' + usersError.message);
                return { success: false, error: usersError.message };
            }
            
            console.log('🔍 [SYNC DEBUG] Users uploaded successfully!');
            
            // Sync tenants
            const { error: tenantsError } = await client.from('tenant_data').upsert({
                tenant_id: 'global',
                data_key: 'ezcubic_tenants',
                data: { key: 'ezcubic_tenants', value: mergedTenants, synced_at: new Date().toISOString() },
                updated_at: new Date().toISOString()
            }, { onConflict: 'tenant_id,data_key' });
            
            if (tenantsError) {
                console.error('❌ Tenants sync failed:', tenantsError.message);
            }
            
            // CRITICAL: Also upload deletion tracking lists so they persist across syncs
            console.log('🔍 [SYNC DEBUG] Uploading deletion tracking lists...');
            if (deletedUsers.length > 0) {
                const { error: delUsersError } = await client.from('tenant_data').upsert({
                    tenant_id: 'global',
                    data_key: 'ezcubic_deleted_users',
                    data: { key: 'ezcubic_deleted_users', value: deletedUsers, synced_at: new Date().toISOString() },
                    updated_at: new Date().toISOString()
                }, { onConflict: 'tenant_id,data_key' });
                
                if (!delUsersError) {
                    console.log('  📤 Deleted users tracking uploaded:', deletedUsers.length);
                } else {
                    console.warn('  ⚠️ Failed to upload deleted users tracking:', delUsersError.message);
                }
            }
            
            if (deletedTenants.length > 0) {
                const { error: delTenantsError } = await client.from('tenant_data').upsert({
                    tenant_id: 'global',
                    data_key: 'ezcubic_deleted_tenants',
                    data: { key: 'ezcubic_deleted_tenants', value: deletedTenants, synced_at: new Date().toISOString() },
                    updated_at: new Date().toISOString()
                }, { onConflict: 'tenant_id,data_key' });
                
                if (!delTenantsError) {
                    console.log('  📤 Deleted tenants tracking uploaded:', deletedTenants.length);
                } else {
                    console.warn('  ⚠️ Failed to upload deleted tenants tracking:', delTenantsError.message);
                }
            }
            
            // STEP 4: Update local storage with merged data too
            console.log('🔍 [SYNC DEBUG] STEP 4: Updating local storage...');
            localStorage.setItem('ezcubic_users', JSON.stringify(mergedUsers));
            localStorage.setItem('ezcubic_tenants', JSON.stringify(mergedTenants));
            
            console.log('✅ Merged & synced to cloud!');
            console.log('  Users:', mergedUsers.length);
            console.log('  Tenants:', Object.keys(mergedTenants).length);
            console.log('  Deleted users tracked:', deletedUsers.length);
            console.log('  Deleted tenants tracked:', deletedTenants.length);
            console.log('🔍 [SYNC DEBUG] Sync completed successfully');
            
            // Update sync status
            window.syncStatus.inProgress = false;
            window.syncStatus.lastSync = new Date().toISOString();
            window.syncStatus.lastError = null;
            window.syncStatus.pendingChanges = 0;
            
            return { success: true, users: mergedUsers.length, tenants: Object.keys(mergedTenants).length };
            
        } catch (err) {
            console.error('❌ Sync error:', err);
            window.syncStatus.inProgress = false;
            window.syncStatus.lastError = err.message;
            if (!silent) alert('❌ Error: ' + err.message);
            return { success: false, error: err.message };
        }
    };
    
    // ==================== DIRECT UPLOAD (NO MERGE) ====================
    /**
     * Upload users directly to cloud WITHOUT merging
     * Used after user deletion to ensure deleted users stay deleted
     * Run: directUploadUsersToCloud()
     */
    window.directUploadUsersToCloud = async function(silent = true) {
        console.log('📤 Direct uploading users to cloud (no merge)...');
        
        try {
            const client = getUsersSupabaseClient();
            if (!client) {
                console.error('❌ Cannot direct upload: No Supabase client');
                return { success: false, error: 'No Supabase client' };
            }
            
            // Get local data
            const localUsers = JSON.parse(localStorage.getItem('ezcubic_users') || '[]');
            const localTenants = JSON.parse(localStorage.getItem('ezcubic_tenants') || '{}');
            
            // Get deleted lists to filter them out
            let deletedUsers = JSON.parse(localStorage.getItem('ezcubic_deleted_users') || '[]');
            let deletedTenants = JSON.parse(localStorage.getItem('ezcubic_deleted_tenants') || '[]');
            
            // CRITICAL: Remove founder from deletion lists - founder should NEVER be deleted
            const founderProtected = ['founder_001', 'founder@ezcubic.com', 'jeremy.tanchh@gmail.com'];
            const founderTenantProtected = ['tenant_founder'];
            
            const originalDeletedCount = deletedUsers.length;
            deletedUsers = deletedUsers.filter(id => !founderProtected.includes(id));
            deletedTenants = deletedTenants.filter(id => !founderTenantProtected.includes(id));
            
            if (deletedUsers.length !== originalDeletedCount) {
                console.log('⚠️ Removed founder from deletion list - founder cannot be deleted!');
                localStorage.setItem('ezcubic_deleted_users', JSON.stringify(deletedUsers));
                localStorage.setItem('ezcubic_deleted_tenants', JSON.stringify(deletedTenants));
            }
            
            // Filter out deleted users AND users from deleted tenants from upload
            // BUT never filter out founder!
            const cleanUsers = localUsers.filter(u => {
                // Never filter out founder
                if (u.role === 'founder' || founderProtected.includes(u.id) || founderProtected.includes(u.email)) {
                    return true;
                }
                const isUserDeleted = deletedUsers.includes(u.id) || deletedUsers.includes(u.email);
                const isTenantDeleted = u.tenantId && deletedTenants.includes(u.tenantId);
                if (isUserDeleted) console.log('  🗑️ Filtering out deleted user:', u.email);
                if (isTenantDeleted) console.log('  🗑️ Filtering out user from deleted tenant:', u.email);
                return !isUserDeleted && !isTenantDeleted;
            });
            
            // Filter out deleted tenants from upload (but never founder tenant)
            const cleanTenants = { ...localTenants };
            deletedTenants.forEach(tenantId => {
                if (cleanTenants[tenantId] && !founderTenantProtected.includes(tenantId)) {
                    console.log('  🗑️ Filtering out deleted tenant:', tenantId);
                    delete cleanTenants[tenantId];
                }
            });
            
            console.log('  📤 Uploading', cleanUsers.length, 'users (after filtering)');
            console.log('  📤 Uploading', Object.keys(cleanTenants).length, 'tenants (after filtering)');
            
            // Upload users directly (overwrites cloud data)
            const { error: usersError } = await client.from('tenant_data').upsert({
                tenant_id: 'global',
                data_key: 'ezcubic_users',
                data: { key: 'ezcubic_users', value: cleanUsers, synced_at: new Date().toISOString() },
                updated_at: new Date().toISOString()
            }, { onConflict: 'tenant_id,data_key' });
            
            if (usersError) {
                console.error('❌ Users upload failed:', usersError.message);
                return { success: false, error: usersError.message };
            }
            
            // Upload tenants directly
            const { error: tenantsError } = await client.from('tenant_data').upsert({
                tenant_id: 'global',
                data_key: 'ezcubic_tenants',
                data: { key: 'ezcubic_tenants', value: cleanTenants, synced_at: new Date().toISOString() },
                updated_at: new Date().toISOString()
            }, { onConflict: 'tenant_id,data_key' });
            
            if (tenantsError) {
                console.error('❌ Tenants upload failed:', tenantsError.message);
                return { success: false, error: tenantsError.message };
            }
            
            // Also upload subscriptions (filter out deleted tenants)
            const localSubscriptions = JSON.parse(localStorage.getItem('ezcubic_subscriptions') || '{}');
            const cleanSubscriptions = { ...localSubscriptions };
            deletedTenants.forEach(tenantId => {
                if (cleanSubscriptions[tenantId]) {
                    console.log('  🗑️ Filtering out subscription for deleted tenant:', tenantId);
                    delete cleanSubscriptions[tenantId];
                }
            });
            
            const { error: subsError } = await client.from('tenant_data').upsert({
                tenant_id: 'global',
                data_key: 'ezcubic_subscriptions',
                data: { key: 'ezcubic_subscriptions', value: cleanSubscriptions, synced_at: new Date().toISOString() },
                updated_at: new Date().toISOString()
            }, { onConflict: 'tenant_id,data_key' });
            
            if (subsError) {
                console.warn('⚠️ Subscriptions upload failed:', subsError.message);
                // Don't fail the whole operation for subscriptions
            } else {
                console.log('  📤 Subscriptions uploaded');
            }
            
            console.log('✅ Direct upload successful!');
            
            // Sync user permissions with plans after upload (in case plan features changed)
            if (typeof syncUserPermissionsWithPlan === 'function') {
                setTimeout(() => syncUserPermissionsWithPlan(), 500);
            }
            
            // Upload deletion tracking lists to cloud (so all devices sync the same deletions)
            if (deletedUsers.length > 0) {
                const { error: delUsersError } = await client.from('tenant_data').upsert({
                    tenant_id: 'global',
                    data_key: 'ezcubic_deleted_users',
                    data: { key: 'ezcubic_deleted_users', value: deletedUsers, synced_at: new Date().toISOString() },
                    updated_at: new Date().toISOString()
                }, { onConflict: 'tenant_id,data_key' });
                
                if (!delUsersError) {
                    console.log('  📤 Deleted users tracking uploaded');
                }
            }
            
            if (deletedTenants.length > 0) {
                const { error: delTenantsError } = await client.from('tenant_data').upsert({
                    tenant_id: 'global',
                    data_key: 'ezcubic_deleted_tenants',
                    data: { key: 'ezcubic_deleted_tenants', value: deletedTenants, synced_at: new Date().toISOString() },
                    updated_at: new Date().toISOString()
                }, { onConflict: 'tenant_id,data_key' });
                
                if (!delTenantsError) {
                    console.log('  📤 Deleted tenants tracking uploaded');
                }
            }
            
            // Also delete the tenant's data from cloud if any tenant was deleted
            for (const tenantId of deletedTenants) {
                console.log('  🗑️ Deleting tenant data from cloud:', tenantId);
                try {
                    await client.from('tenant_data').delete()
                        .eq('tenant_id', tenantId);
                    console.log('  ✅ Deleted cloud data for tenant:', tenantId);
                } catch (e) {
                    console.warn('  ⚠️ Could not delete cloud data for tenant:', tenantId, e);
                }
            }
            
            // Keep deletion tracking for consistency across devices
            console.log('  ℹ️ Keeping deletion tracking synced across devices');
            
            return { success: true, users: cleanUsers.length, tenants: Object.keys(cleanTenants).length };
            
        } catch (err) {
            console.error('❌ Direct upload error:', err);
            return { success: false, error: err.message };
        }
    };
    
    // ==================== CLEAR DELETION TRACKING ====================
    /**
     * Manually clear deletion tracking (use after confirming cloud is clean)
     * Run: clearDeletionTracking()
     */
    window.clearDeletionTracking = function() {
        const deletedUsers = JSON.parse(localStorage.getItem('ezcubic_deleted_users') || '[]');
        const deletedTenants = JSON.parse(localStorage.getItem('ezcubic_deleted_tenants') || '[]');
        
        console.log('🧹 Clearing deletion tracking...');
        console.log('  Deleted users cleared:', deletedUsers.length);
        console.log('  Deleted tenants cleared:', deletedTenants.length);
        
        localStorage.removeItem('ezcubic_deleted_users');
        localStorage.removeItem('ezcubic_deleted_tenants');
        
        alert('✅ Deletion tracking cleared!\n\nUsers: ' + deletedUsers.length + '\nTenants: ' + deletedTenants.length);
    };
    
    // ==================== DOWNLOAD USERS FROM CLOUD ====================
    /**
     * Download users from cloud to this device
     * ROLE-AWARE: Founder gets all, Admin gets only their tenant's users
     * Run: downloadUsersFromCloud()
     */
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
            
            // CRITICAL: Download deletion tracking lists FIRST before processing any data
            let deletedUsers = JSON.parse(localStorage.getItem('ezcubic_deleted_users') || '[]');
            let deletedTenants = JSON.parse(localStorage.getItem('ezcubic_deleted_tenants') || '[]');
            
            for (const record of data || []) {
                // Process deletion tracking lists FIRST
                if (record.data_key === 'ezcubic_deleted_users' && record.data?.value) {
                    deletedUsers = record.data.value;
                    localStorage.setItem('ezcubic_deleted_users', JSON.stringify(deletedUsers));
                    console.log('  📥 Downloaded deleted users tracking:', deletedUsers.length);
                }
                
                if (record.data_key === 'ezcubic_deleted_tenants' && record.data?.value) {
                    deletedTenants = record.data.value;
                    localStorage.setItem('ezcubic_deleted_tenants', JSON.stringify(deletedTenants));
                    console.log('  📥 Downloaded deleted tenants tracking:', deletedTenants.length);
                }
            }
            
            // Now process users and tenants with the updated deletion lists
            for (const record of data || []) {
                if (record.data_key === 'ezcubic_users' && record.data?.value) {
                    const cloudUsers = record.data.value;
                    const localUsers = JSON.parse(localStorage.getItem('ezcubic_users') || '[]');
                    
                    // ROLE-BASED FILTERING
                    let usersToSync = cloudUsers;
                    
                    // First filter out deleted users and users from deleted tenants
                    usersToSync = usersToSync.filter(u => {
                        const isUserDeleted = deletedUsers.includes(u.id) || deletedUsers.includes(u.email);
                        const isTenantDeleted = u.tenantId && deletedTenants.includes(u.tenantId);
                        if (isUserDeleted) console.log('  🗑️ Skipping deleted user:', u.email);
                        if (isTenantDeleted) console.log('  🗑️ Skipping user from deleted tenant:', u.email);
                        return !isUserDeleted && !isTenantDeleted;
                    });
                    
                    if (!isFounder && currentTenantId) {
                        // Admin/Staff: Only sync users from their tenant
                        usersToSync = usersToSync.filter(u => 
                            u.tenantId === currentTenantId || 
                            u.id === currentUser.id // Always include self
                        );
                        console.log('  🔒 Filtered to tenant users only:', usersToSync.length, 'of', cloudUsers.length);
                    } else if (isFounder) {
                        // Founder: Gets ALL users (except deleted)
                        console.log('  👑 Founder access: All', usersToSync.length, 'users');
                    }
                    
                    // FIRST: Filter out any deleted users from local
                    let cleanLocalUsers = localUsers.filter(lu => {
                        const isDeleted = deletedUsers.includes(lu.id) || deletedUsers.includes(lu.email);
                        if (isDeleted) console.log('  🗑️ Removing deleted local user:', lu.email);
                        return !isDeleted;
                    });
                    
                    // Merge: Add filtered cloud users not in local
                    usersToSync.forEach(cu => {
                        const existingIdx = cleanLocalUsers.findIndex(lu => lu.id === cu.id || lu.email === cu.email);
                        if (existingIdx === -1) {
                            cleanLocalUsers.push(cu);
                        } else {
                            // Update existing user with cloud data
                            cleanLocalUsers[existingIdx] = { ...cleanLocalUsers[existingIdx], ...cu };
                        }
                    });
                    
                    localStorage.setItem('ezcubic_users', JSON.stringify(cleanLocalUsers));
                    usersDownloaded = usersToSync.length;
                    console.log('  Users synced:', usersToSync.length);
                }
                
                if (record.data_key === 'ezcubic_tenants' && record.data?.value) {
                    const cloudTenants = record.data.value;
                    const localTenants = JSON.parse(localStorage.getItem('ezcubic_tenants') || '{}');
                    
                    // Get deleted tenants list
                    const deletedTenants = JSON.parse(localStorage.getItem('ezcubic_deleted_tenants') || '[]');
                    
                    if (!isFounder && currentTenantId) {
                        // Admin: Only get their own tenant info (if not deleted)
                        if (cloudTenants[currentTenantId] && !deletedTenants.includes(currentTenantId)) {
                            localTenants[currentTenantId] = cloudTenants[currentTenantId];
                            console.log('  🔒 Synced own tenant only:', currentTenantId);
                        }
                    } else {
                        // Founder: Gets ALL tenants (except deleted)
                        Object.entries(cloudTenants).forEach(([id, tenant]) => {
                            if (!deletedTenants.includes(id)) {
                                localTenants[id] = tenant;
                            } else {
                                console.log('  🗑️ Skipping deleted tenant:', id);
                            }
                        });
                        console.log('  👑 Founder access: Tenants synced');
                    }
                    
                    localStorage.setItem('ezcubic_tenants', JSON.stringify(localTenants));
                    tenantsDownloaded = Object.keys(localTenants).length;
                }
                
                // Also sync subscriptions (filter deleted tenants)
                if (record.data_key === 'ezcubic_subscriptions' && record.data?.value) {
                    const cloudSubs = record.data.value;
                    const localSubs = JSON.parse(localStorage.getItem('ezcubic_subscriptions') || '{}');
                    const deletedTenants = JSON.parse(localStorage.getItem('ezcubic_deleted_tenants') || '[]');
                    
                    // Merge: filter out deleted tenant subscriptions
                    Object.entries(cloudSubs).forEach(([tenantId, sub]) => {
                        if (!deletedTenants.includes(tenantId)) {
                            localSubs[tenantId] = sub;
                        } else {
                            console.log('  🗑️ Skipping subscription for deleted tenant:', tenantId);
                        }
                    });
                    
                    // Also remove any local subscriptions for deleted tenants
                    deletedTenants.forEach(tenantId => delete localSubs[tenantId]);
                    
                    localStorage.setItem('ezcubic_subscriptions', JSON.stringify(localSubs));
                    console.log('  Subscriptions synced');
                }
            }
            
            // If no tracking lists found in cloud, clear local ones
            const hasDeletedUsersInCloud = data.some(r => r.data_key === 'ezcubic_deleted_users');
            const hasDeletedTenantsInCloud = data.some(r => r.data_key === 'ezcubic_deleted_tenants');
            
            if (!hasDeletedUsersInCloud && localStorage.getItem('ezcubic_deleted_users')) {
                console.log('  🧹 Cloud has no deletion tracking - clearing local deleted users list');
                localStorage.removeItem('ezcubic_deleted_users');
            }
            
            if (!hasDeletedTenantsInCloud && localStorage.getItem('ezcubic_deleted_tenants')) {
                console.log('  🧹 Cloud has no deletion tracking - clearing local deleted tenants list');
                localStorage.removeItem('ezcubic_deleted_tenants');
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
    
    // ==================== CLOUD SYNC STATUS ====================
    /**
     * Show cloud sync status
     * @returns {Object} Local users and tenants count
     */
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
    
    // ==================== SYNC ALL TENANT DATA TO CLOUD ====================
    /**
     * Sync ALL tenant data to cloud (for Founder to upload everything)
     */
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
    
    // ==================== DOWNLOAD TENANT DATA FROM CLOUD ====================
    /**
     * Download specific tenant data from cloud
     * @param {string} tenantId - Optional tenant ID (uses current user's if not provided)
     */
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
    
    // ==================== FULL CLOUD SYNC ====================
    /**
     * Full sync - users, tenants, and all tenant data
     * Handles offline gracefully by queuing for later
     */
    window.fullCloudSync = async function() {
        console.log('☁️ Starting FULL cloud sync...');
        
        // Check if cloud is available first
        const isOnline = await window.checkCloudHealth();
        if (!isOnline) {
            console.log('☁️ Cloud offline - queuing sync for later');
            window.queueCloudSync();
            return { success: false, offline: true };
        }
        
        try {
            // 1. Sync users
            await window.forceSyncUsersToCloud();
            
            // 2. Sync all tenant data
            await window.syncAllTenantDataToCloud();
            
            console.log('✅ FULL sync complete!');
            return { success: true };
        } catch (e) {
            console.warn('⚠️ Sync failed:', e.message);
            window.queueCloudSync();
            return { success: false, error: e.message };
        }
    };
    
    // ==================== MOBILE DOWNLOAD FROM CLOUD ====================
    /**
     * Mobile-friendly cloud download (shows UI feedback)
     * LOGIN PAGE SYNC: Downloads only user credentials for login purposes
     * After login, role-based sync applies (Admin=tenant only, Founder=all)
     */
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
            
            // CRITICAL: Download deletion tracking lists FIRST
            let deletedUsers = JSON.parse(localStorage.getItem('ezcubic_deleted_users') || '[]');
            let deletedTenants = JSON.parse(localStorage.getItem('ezcubic_deleted_tenants') || '[]');
            
            for (const record of data || []) {
                if (record.data_key === 'ezcubic_deleted_users' && record.data?.value) {
                    const cloudDeletedUsers = record.data.value;
                    deletedUsers = [...new Set([...deletedUsers, ...cloudDeletedUsers])];
                    localStorage.setItem('ezcubic_deleted_users', JSON.stringify(deletedUsers));
                    console.log('  📥 Merged deleted users tracking:', deletedUsers.length);
                }
                if (record.data_key === 'ezcubic_deleted_tenants' && record.data?.value) {
                    const cloudDeletedTenants = record.data.value;
                    deletedTenants = [...new Set([...deletedTenants, ...cloudDeletedTenants])];
                    localStorage.setItem('ezcubic_deleted_tenants', JSON.stringify(deletedTenants));
                    console.log('  📥 Merged deleted tenants tracking:', deletedTenants.length);
                }
            }
            
            // Now process users with updated deletion tracking
            for (const record of data || []) {
                if (record.data_key === 'ezcubic_users' && record.data?.value) {
                    const cloudUsers = record.data.value;
                    let localUsers = JSON.parse(localStorage.getItem('ezcubic_users') || '[]');
                    
                    // FIRST: Filter out deleted users from cloud data
                    let usersToSync = cloudUsers.filter(u => {
                        const isUserDeleted = deletedUsers.includes(u.id) || deletedUsers.includes(u.email);
                        const isTenantDeleted = u.tenantId && deletedTenants.includes(u.tenantId);
                        if (isUserDeleted) console.log('  🗑️ Skipping deleted user from cloud:', u.email);
                        if (isTenantDeleted) console.log('  🗑️ Skipping user from deleted tenant:', u.email);
                        return !isUserDeleted && !isTenantDeleted;
                    });
                    
                    // ROLE-BASED FILTERING (when logged in)
                    if (isLoggedIn && !isFounder && currentTenantId) {
                        // Admin/Staff: Only sync their tenant's users
                        usersToSync = usersToSync.filter(u => 
                            u.tenantId === currentTenantId || 
                            u.id === currentUser.id
                        );
                    }
                    // If not logged in (login page), sync all for authentication purposes (minus deleted)
                    
                    // SECOND: Filter out deleted users from local data
                    localUsers = localUsers.filter(lu => {
                        const isDeleted = deletedUsers.includes(lu.id) || deletedUsers.includes(lu.email);
                        const isTenantDeleted = lu.tenantId && deletedTenants.includes(lu.tenantId);
                        if (isDeleted || isTenantDeleted) console.log('  🗑️ Removing deleted local user:', lu.email);
                        return !isDeleted && !isTenantDeleted;
                    });
                    
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
                    let localTenants = JSON.parse(localStorage.getItem('ezcubic_tenants') || '{}');
                    
                    // Filter out deleted tenants
                    if (isLoggedIn && !isFounder && currentTenantId) {
                        // Admin: Only their tenant (if not deleted)
                        if (cloudTenants[currentTenantId] && !deletedTenants.includes(currentTenantId)) {
                            localTenants[currentTenantId] = cloudTenants[currentTenantId];
                        }
                    } else {
                        // Founder or login page: All tenants (except deleted)
                        Object.entries(cloudTenants).forEach(([id, tenant]) => {
                            if (!deletedTenants.includes(id)) {
                                localTenants[id] = tenant;
                            } else {
                                console.log('  🗑️ Skipping deleted tenant:', id);
                                // Also remove if exists locally
                                delete localTenants[id];
                            }
                        });
                    }
                    
                    // Also remove any deleted tenants from local
                    deletedTenants.forEach(id => delete localTenants[id]);
                    
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
    
    // ==================== COMPANY CODE SYNC FUNCTIONS ====================
    /**
     * Toggle Company Code sync panel on login page
     */
    window.toggleCompanyCodeSync = function() {
        const panel = document.getElementById('companyCodeSync');
        if (panel) {
            panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
            if (panel.style.display === 'block') {
                document.getElementById('companyCodeInput')?.focus();
            }
        }
    };
    
    /**
     * Sync by Company Code - only downloads users from that specific tenant
     */
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
            
            // CRITICAL: First download deletion tracking
            let deletedUsers = JSON.parse(localStorage.getItem('ezcubic_deleted_users') || '[]');
            let deletedTenants = JSON.parse(localStorage.getItem('ezcubic_deleted_tenants') || '[]');
            
            for (const record of data || []) {
                if (record.data_key === 'ezcubic_deleted_users' && record.data?.value) {
                    const cloudDeletedUsers = record.data.value;
                    deletedUsers = [...new Set([...deletedUsers, ...cloudDeletedUsers])];
                    localStorage.setItem('ezcubic_deleted_users', JSON.stringify(deletedUsers));
                }
                if (record.data_key === 'ezcubic_deleted_tenants' && record.data?.value) {
                    const cloudDeletedTenants = record.data.value;
                    deletedTenants = [...new Set([...deletedTenants, ...cloudDeletedTenants])];
                    localStorage.setItem('ezcubic_deleted_tenants', JSON.stringify(deletedTenants));
                }
            }
            
            for (const record of data || []) {
                if (record.data_key === 'ezcubic_tenants' && record.data?.value) {
                    cloudTenants = record.data.value;
                    
                    // Find tenant matching the Company Code (skip deleted tenants)
                    for (const [tenantId, tenant] of Object.entries(cloudTenants)) {
                        if (tenant.companyCode && tenant.companyCode.toUpperCase() === code) {
                            // Check if this tenant is deleted
                            if (deletedTenants.includes(tenantId)) {
                                console.log('🗑️ Skipping deleted tenant:', tenantId);
                                continue;
                            }
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
            
            // Filter users to only this tenant (skip deleted users)
            const tenantUsers = cloudUsers.filter(u => {
                if (u.tenantId !== targetTenantId) return false;
                const isDeleted = deletedUsers.includes(u.id) || deletedUsers.includes(u.email);
                if (isDeleted) {
                    console.log('🗑️ Skipping deleted user:', u.email);
                    return false;
                }
                return true;
            });
            
            if (tenantUsers.length === 0) {
                alert('⚠️ No users found for this company.\n\nAsk your Admin to create your account first.');
                resetBtn();
                return;
            }
            
            // Save filtered users locally (skip deleted ones)
            let localUsers = JSON.parse(localStorage.getItem('ezcubic_users') || '[]');
            
            // First remove any deleted users from local
            localUsers = localUsers.filter(u => {
                const isDeleted = deletedUsers.includes(u.id) || deletedUsers.includes(u.email);
                return !isDeleted;
            });
            
            tenantUsers.forEach(cu => {
                const existingIdx = localUsers.findIndex(lu => lu.id === cu.id || lu.email === cu.email);
                if (existingIdx === -1) {
                    localUsers.push(cu);
                } else {
                    localUsers[existingIdx] = { ...localUsers[existingIdx], ...cu };
                }
            });
            localStorage.setItem('ezcubic_users', JSON.stringify(localUsers));
            
            // Save tenant info (if not deleted)
            let localTenants = JSON.parse(localStorage.getItem('ezcubic_tenants') || '{}');
            
            // Remove any deleted tenants from local
            deletedTenants.forEach(id => delete localTenants[id]);
            
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
    
    // ==================== COMPANY CODE MANAGEMENT ====================
    /**
     * Get Company Code for current tenant (for Admin to share)
     * @returns {string|null} Company code or null
     */
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
    
    /**
     * Regenerate Company Code (if leaked)
     * @returns {string|null} New company code or null
     */
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
    
    // ==================== CLOUD HEALTH CHECK ====================
    /**
     * Check if Supabase cloud is available
     * @returns {Promise<boolean>} true if online, false if offline
     */
    window.checkCloudHealth = async function() {
        try {
            // Use the existing Supabase client if available (avoids duplicate fetch)
            if (typeof getUsersSupabaseClient === 'function') {
                const client = getUsersSupabaseClient();
                const { error } = await client
                    .from('tenant_data')
                    .select('tenant_id')
                    .limit(1);
                
                const isOnline = !error;
                window._cloudOnline = isOnline;
                
                // Update UI indicator if exists
                const indicator = document.getElementById('cloudStatusIndicator');
                if (indicator) {
                    indicator.innerHTML = isOnline 
                        ? '<i class="fas fa-cloud" style="color: #10b981;"></i>' 
                        : '<i class="fas fa-cloud-slash" style="color: #ef4444;"></i>';
                    indicator.title = isOnline ? 'Cloud: Online' : 'Cloud: Offline (data saved locally)';
                }
                
                return isOnline;
            }
            
            // Fallback: simple connectivity check
            window._cloudOnline = navigator.onLine;
            return navigator.onLine;
        } catch (e) {
            window._cloudOnline = false;
            return false;
        }
    };
    
    /**
     * Queue sync for when cloud comes back online
     */
    window.queueCloudSync = function() {
        const pending = JSON.parse(localStorage.getItem('ezcubic_pending_sync') || '[]');
        if (!pending.includes(Date.now())) {
            pending.push(Date.now());
            localStorage.setItem('ezcubic_pending_sync', JSON.stringify(pending.slice(-10))); // Keep last 10
        }
        console.log('📋 Sync queued for when cloud is back online');
    };
    
    /**
     * Process pending syncs when cloud is available
     */
    window.processPendingSyncs = async function() {
        const pending = JSON.parse(localStorage.getItem('ezcubic_pending_sync') || '[]');
        if (pending.length === 0) return;
        
        const isOnline = await window.checkCloudHealth();
        if (!isOnline) {
            console.log('☁️ Cloud still offline, will retry later');
            return;
        }
        
        console.log('☁️ Processing', pending.length, 'pending syncs...');
        
        // Update UI to show syncing
        if (typeof window.updateCloudSyncUI === 'function') {
            window.updateCloudSyncUI(true, 'syncing');
        }
        
        try {
            await window.fullCloudSync();
            localStorage.setItem('ezcubic_pending_sync', '[]');
            console.log('✅ Pending syncs processed!');
            
            // Update UI back to connected
            if (typeof window.updateCloudSyncUI === 'function') {
                window.updateCloudSyncUI(true);
            }
            
            if (typeof showToast === 'function') {
                showToast('Cloud sync completed ✓', 'success');
            }
        } catch (e) {
            console.warn('⚠️ Sync failed, will retry:', e.message);
            if (typeof window.updateCloudSyncUI === 'function') {
                window.updateCloudSyncUI(true, 'pending');
            }
        }
    };
    
    // Check cloud health on load and periodically
    setTimeout(() => {
        window.checkCloudHealth().then(online => {
            console.log('☁️ Cloud status:', online ? 'Online' : 'Offline');
            
            // Update UI based on cloud availability
            if (!online && typeof window.updateCloudSyncUI === 'function') {
                window.updateCloudSyncUI(false, 'service-down');
            }
            
            if (online) {
                window.processPendingSyncs();
            }
        });
    }, 3000);
    
    // Check every 5 minutes
    setInterval(() => {
        window.checkCloudHealth().then(async online => {
            if (online && window._cloudWasOffline) {
                console.log('☁️ Cloud back online! Processing pending syncs...');
                
                // Check if signed in
                const session = await supabaseGetSession?.() || null;
                if (session && typeof window.updateCloudSyncUI === 'function') {
                    window.updateCloudSyncUI(true);
                }
                
                window.processPendingSyncs();
            } else if (!online) {
                if (typeof window.updateCloudSyncUI === 'function') {
                    window.updateCloudSyncUI(false, 'service-down');
                }
            }
            window._cloudWasOffline = !online;
        });
    }, 5 * 60 * 1000);
    
    // ==================== MODULE INITIALIZATION ====================
    console.log('☁️ Cloud Sync Utils module loaded');
    
})();
