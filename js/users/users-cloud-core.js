/**
 * EZCubic - User Cloud Sync Core Module
 * Core cloud sync functions: tenant data sync, connection testing, upload/download
 * Version: 2.2.5 - Split from users-cloud.js
 */

// ==================== CLOUD SYNC FUNCTIONS ====================

// Sync tenant data to Supabase cloud
async function syncTenantDataToCloud(tenantId, tenantData) {
    try {
        if (!window.supabase?.createClient) {
            console.warn('⚠️ Supabase SDK not loaded, tenant data not synced');
            return;
        }
        
        const client = getUsersSupabaseClient();
        
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
            console.warn('⚠️ Tenant data sync failed:', error.message);
        } else {
            console.log('☁️ Tenant data synced to cloud:', tenantId);
        }
    } catch (err) {
        console.warn('⚠️ Tenant sync error:', err);
    }
}

// Test Supabase connection
window.testCloudConnection = async function() {
    console.log('🧪 Testing Supabase connection...');
    
    try {
        if (!window.supabase?.createClient) {
            console.error('❌ Supabase SDK not loaded');
            return { success: false, error: 'Supabase SDK not loaded' };
        }
        
        const client = getUsersSupabaseClient();
        
        console.log('  Testing SELECT...');
        const { data: selectData, error: selectError } = await client
            .from('tenant_data')
            .select('*')
            .eq('tenant_id', 'global')
            .limit(5);
        
        if (selectError) {
            console.error('❌ SELECT failed:', selectError.message);
            return { success: false, error: selectError.message };
        }
        
        console.log('✅ SELECT OK - Found', selectData?.length || 0, 'records');
        
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
        
        await client.from('tenant_data').delete().eq('tenant_id', 'test_connection');
        
        console.log('✅ ALL TESTS PASSED - Supabase is working!');
        return { success: true, data: selectData };
        
    } catch (err) {
        console.error('❌ Test failed:', err);
        return { success: false, error: err.message };
    }
};

// Force sync all users to cloud
window.forceSyncUsersToCloud = async function() {
    console.log('☁️ Force syncing users to cloud...');
    
    try {
        if (!window.supabase?.createClient) {
            console.error('❌ Supabase SDK not loaded');
            return;
        }
        
        const client = getUsersSupabaseClient();
        const localUsers = JSON.parse(localStorage.getItem('ezcubic_users') || '[]');
        const localTenants = JSON.parse(localStorage.getItem('ezcubic_tenants') || '{}');
        
        console.log('  Local users:', localUsers.length);
        console.log('  Local tenants:', Object.keys(localTenants).length);
        
        const { error: usersError } = await client.from('tenant_data').upsert({
            tenant_id: 'global',
            data_key: 'ezcubic_users',
            data: { key: 'ezcubic_users', value: localUsers, synced_at: new Date().toISOString() },
            updated_at: new Date().toISOString()
        }, { onConflict: 'tenant_id,data_key' });
        
        if (usersError) {
            console.error('❌ Users sync failed:', usersError.message);
            return;
        }
        
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
        
    } catch (err) {
        console.error('❌ Sync error:', err);
    }
};

// Download users from cloud
window.downloadUsersFromCloud = async function() {
    console.log('📥 Downloading users from cloud...');
    
    try {
        if (!window.supabase?.createClient) {
            alert('❌ Supabase SDK not loaded');
            return;
        }
        
        const client = getUsersSupabaseClient();
        const currentUser = JSON.parse(localStorage.getItem('ezcubic_current_user') || '{}');
        const isFounder = currentUser.role === 'founder';
        const currentTenantId = currentUser.tenantId;
        
        const { data, error } = await client.from('tenant_data')
            .select('*')
            .eq('tenant_id', 'global');
        
        if (error) {
            console.error('❌ Download failed:', error.message);
            return;
        }
        
        let usersDownloaded = 0;
        let tenantsDownloaded = 0;
        
        for (const record of data || []) {
            if (record.data_key === 'ezcubic_users' && record.data?.value) {
                const cloudUsers = record.data.value;
                const localUsers = JSON.parse(localStorage.getItem('ezcubic_users') || '[]');
                
                let usersToSync = cloudUsers;
                
                if (!isFounder && currentTenantId) {
                    usersToSync = cloudUsers.filter(u => 
                        u.tenantId === currentTenantId || u.id === currentUser.id
                    );
                }
                
                usersToSync.forEach(cu => {
                    const existingIdx = localUsers.findIndex(lu => lu.id === cu.id || lu.email === cu.email);
                    if (existingIdx === -1) {
                        localUsers.push(cu);
                    } else {
                        localUsers[existingIdx] = { ...localUsers[existingIdx], ...cu };
                    }
                });
                
                localStorage.setItem('ezcubic_users', JSON.stringify(localUsers));
                usersDownloaded = usersToSync.length;
            }
            
            if (record.data_key === 'ezcubic_tenants' && record.data?.value) {
                const cloudTenants = record.data.value;
                const localTenants = JSON.parse(localStorage.getItem('ezcubic_tenants') || '{}');
                
                if (!isFounder && currentTenantId) {
                    if (cloudTenants[currentTenantId]) {
                        localTenants[currentTenantId] = cloudTenants[currentTenantId];
                    }
                } else {
                    Object.assign(localTenants, cloudTenants);
                }
                
                localStorage.setItem('ezcubic_tenants', JSON.stringify(localTenants));
                tenantsDownloaded = Object.keys(localTenants).length;
            }
        }
        
        if (typeof ensureFounderExists === 'function') {
            ensureFounderExists();
        }
        
        console.log('✅ Download complete!');
        location.reload();
        
    } catch (err) {
        console.error('❌ Download error:', err);
    }
};

// Sync all tenant data to cloud
window.syncAllTenantDataToCloud = async function() {
    console.log('☁️ Syncing ALL tenant data to cloud...');
    
    try {
        if (!window.supabase?.createClient) {
            return;
        }
        
        const client = getUsersSupabaseClient();
        
        const tenantKeys = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith('ezcubic_tenant_')) {
                tenantKeys.push(key);
            }
        }
        
        let synced = 0;
        
        for (const key of tenantKeys) {
            const tenantId = key.replace('ezcubic_tenant_', '');
            const tenantData = JSON.parse(localStorage.getItem(key) || '{}');
            
            const { error } = await client.from('tenant_data').upsert({
                tenant_id: tenantId,
                data_key: 'tenant_full_data',
                data: { tenantId, value: tenantData, synced_at: new Date().toISOString() },
                updated_at: new Date().toISOString()
            }, { onConflict: 'tenant_id,data_key' });
            
            if (!error) synced++;
        }
        
        console.log('☁️ Sync complete! Synced:', synced);
        
    } catch (err) {
        console.error('❌ Sync error:', err);
    }
};

// Download specific tenant data from cloud
window.downloadTenantDataFromCloud = async function(tenantId) {
    if (!tenantId) {
        const currentUser = JSON.parse(localStorage.getItem('ezcubic_current_user') || '{}');
        tenantId = currentUser.tenantId;
        if (!tenantId) return;
    }
    
    try {
        if (!window.supabase?.createClient) return;
        
        const client = getUsersSupabaseClient();
        
        const { data, error } = await client.from('tenant_data')
            .select('*')
            .eq('tenant_id', tenantId)
            .eq('data_key', 'tenant_full_data')
            .single();
        
        if (error) {
            console.error('❌ Download failed:', error.message);
            return;
        }
        
        if (data?.data?.value) {
            localStorage.setItem('ezcubic_tenant_' + tenantId, JSON.stringify(data.data.value));
            console.log('✅ Downloaded tenant data:', tenantId);
            location.reload();
        }
        
    } catch (err) {
        console.error('❌ Download error:', err);
    }
};

// Full cloud sync
window.fullCloudSync = async function() {
    console.log('☁️ Starting FULL cloud sync...');
    await window.forceSyncUsersToCloud();
    await window.syncAllTenantDataToCloud();
    console.log('✅ FULL sync complete!');
};

// Mobile-friendly cloud download
window.mobileDownloadFromCloud = async function() {
    const btn = event?.target?.closest('a');
    const originalText = btn ? btn.innerHTML : '';
    if (btn) {
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Syncing...';
        btn.style.pointerEvents = 'none';
    }
    
    try {
        let retries = 0;
        while (!window.supabase?.createClient && retries < 10) {
            await new Promise(r => setTimeout(r, 300));
            retries++;
        }
        
        if (!window.supabase?.createClient) {
            alert('❌ Cloud service not ready. Please refresh.');
            if (btn) {
                btn.innerHTML = originalText;
                btn.style.pointerEvents = '';
            }
            return;
        }
        
        const client = getUsersSupabaseClient();
        const currentUser = JSON.parse(localStorage.getItem('ezcubic_current_user') || '{}');
        const isLoggedIn = !!currentUser.id;
        const isFounder = currentUser.role === 'founder';
        const currentTenantId = currentUser.tenantId;
        
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
        
        for (const record of data || []) {
            if (record.data_key === 'ezcubic_users' && record.data?.value) {
                const cloudUsers = record.data.value;
                const localUsers = JSON.parse(localStorage.getItem('ezcubic_users') || '[]');
                
                let usersToSync = cloudUsers;
                if (isLoggedIn && !isFounder && currentTenantId) {
                    usersToSync = cloudUsers.filter(u => u.tenantId === currentTenantId || u.id === currentUser.id);
                }
                
                usersToSync.forEach(cu => {
                    const existingIdx = localUsers.findIndex(lu => lu.id === cu.id || lu.email === cu.email);
                    if (existingIdx === -1) {
                        localUsers.push(cu);
                    } else {
                        localUsers[existingIdx] = { ...localUsers[existingIdx], ...cu };
                    }
                });
                
                localStorage.setItem('ezcubic_users', JSON.stringify(localUsers));
            }
            
            if (record.data_key === 'ezcubic_tenants' && record.data?.value) {
                const cloudTenants = record.data.value;
                const localTenants = JSON.parse(localStorage.getItem('ezcubic_tenants') || '{}');
                
                if (isLoggedIn && !isFounder && currentTenantId) {
                    if (cloudTenants[currentTenantId]) {
                        localTenants[currentTenantId] = cloudTenants[currentTenantId];
                    }
                } else {
                    Object.assign(localTenants, cloudTenants);
                }
                
                localStorage.setItem('ezcubic_tenants', JSON.stringify(localTenants));
            }
        }
        
        if (typeof ensureFounderExists === 'function') {
            ensureFounderExists();
        }
        
        location.reload();
        
    } catch (err) {
        alert('❌ Error: ' + err.message);
        if (btn) {
            btn.innerHTML = originalText;
            btn.style.pointerEvents = '';
        }
    }
};

// ==================== WINDOW EXPORTS ====================
window.syncTenantDataToCloud = syncTenantDataToCloud;
