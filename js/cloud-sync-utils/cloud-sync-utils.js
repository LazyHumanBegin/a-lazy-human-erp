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
 * Version: 1.0.0
 * Last Updated: 2025-01-13
 */

(function() {
    'use strict';
    
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
     * Run: forceSyncUsersToCloud()
     */
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
