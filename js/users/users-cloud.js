/**
 * EZCubic - User Cloud Sync Module
 * Cloud sync, company code, factory reset, tenant data sync
 * Version: 2.2.5 - Split from users.js
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

// ==================== COMPANY CODE SYNC ====================

// Sync by Company Code
window.syncByCompanyCode = async function() {
    const codeInput = document.getElementById('companyCodeInput');
    const code = (codeInput?.value || '').trim().toUpperCase();
    
    if (!code || code.length < 4) {
        alert('⚠️ Please enter a valid Company Code');
        return;
    }
    
    const btn = event?.target?.closest('button');
    const originalText = btn ? btn.innerHTML : '';
    if (btn) {
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        btn.disabled = true;
    }
    
    try {
        let retries = 0;
        while (!window.supabase?.createClient && retries < 10) {
            await new Promise(r => setTimeout(r, 300));
            retries++;
        }
        
        if (!window.supabase?.createClient) {
            alert('❌ Cloud service not ready.');
            resetBtn();
            return;
        }
        
        const client = getUsersSupabaseClient();
        
        const { data, error } = await client.from('tenant_data')
            .select('*')
            .eq('tenant_id', 'global');
        
        if (error) {
            alert('❌ Sync failed: ' + error.message);
            resetBtn();
            return;
        }
        
        let targetTenantId = null;
        let targetTenantInfo = null;
        let cloudUsers = [];
        
        for (const record of data || []) {
            if (record.data_key === 'ezcubic_tenants' && record.data?.value) {
                const cloudTenants = record.data.value;
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
            alert('❌ Company Code not found: ' + code);
            resetBtn();
            return;
        }
        
        const tenantUsers = cloudUsers.filter(u => u.tenantId === targetTenantId);
        
        if (tenantUsers.length === 0) {
            alert('⚠️ No users found for this company.');
            resetBtn();
            return;
        }
        
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
        
        const localTenants = JSON.parse(localStorage.getItem('ezcubic_tenants') || '{}');
        localTenants[targetTenantId] = targetTenantInfo;
        localStorage.setItem('ezcubic_tenants', JSON.stringify(localTenants));
        
        if (typeof ensureFounderExists === 'function') {
            ensureFounderExists();
        }
        
        alert('✅ Synced!\n\n🏢 ' + targetTenantInfo.businessName + '\n👥 ' + tenantUsers.length + ' user(s)');
        location.reload();
        
    } catch (err) {
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

// Get Company Code for current tenant
window.getCompanyCode = function() {
    const currentUser = JSON.parse(localStorage.getItem('ezcubic_current_user') || '{}');
    if (!currentUser.tenantId) return null;
    
    const tenants = JSON.parse(localStorage.getItem('ezcubic_tenants') || '{}');
    const tenant = tenants[currentUser.tenantId];
    
    if (!tenant) return null;
    
    if (!tenant.companyCode) {
        tenant.companyCode = generateCompanyCode();
        tenants[currentUser.tenantId] = tenant;
        localStorage.setItem('ezcubic_tenants', JSON.stringify(tenants));
    }
    
    console.log('🏢 Company Code:', tenant.companyCode);
    return tenant.companyCode;
};

// Regenerate Company Code
window.regenerateCompanyCode = function() {
    const currentUser = JSON.parse(localStorage.getItem('ezcubic_current_user') || '{}');
    if (!currentUser.tenantId) return null;
    if (!['founder', 'business_admin'].includes(currentUser.role)) return null;
    
    const tenants = JSON.parse(localStorage.getItem('ezcubic_tenants') || '{}');
    const tenant = tenants[currentUser.tenantId];
    if (!tenant) return null;
    
    tenant.companyCode = generateCompanyCode();
    tenants[currentUser.tenantId] = tenant;
    localStorage.setItem('ezcubic_tenants', JSON.stringify(tenants));
    
    console.log('✅ New Company Code:', tenant.companyCode);
    return tenant.companyCode;
};

// ==================== COMPANY CODE UI ====================

window.initCompanyCodeUI = function() {
    const currentUser = JSON.parse(localStorage.getItem('ezcubic_current_user') || '{}');
    const section = document.getElementById('companyCodeSection');
    const display = document.getElementById('companyCodeDisplay');
    
    if (!section) return;
    
    if (!['founder', 'business_admin'].includes(currentUser.role)) {
        section.style.display = 'none';
        return;
    }
    
    section.style.display = 'block';
    
    const tenants = JSON.parse(localStorage.getItem('ezcubic_tenants') || '{}');
    const tenant = tenants[currentUser.tenantId];
    
    if (tenant) {
        if (!tenant.companyCode) {
            tenant.companyCode = generateCompanyCode();
            tenants[currentUser.tenantId] = tenant;
            localStorage.setItem('ezcubic_tenants', JSON.stringify(tenants));
        }
        if (display) display.textContent = tenant.companyCode;
    } else {
        if (display) display.textContent = 'N/A';
    }
};

window.copyCompanyCode = function() {
    const display = document.getElementById('companyCodeDisplay');
    const code = display?.textContent;
    
    if (!code || code === 'N/A') {
        alert('⚠️ No Company Code available');
        return;
    }
    
    navigator.clipboard.writeText(code).then(() => {
        const btn = event?.target?.closest('button');
        if (btn) {
            const originalHTML = btn.innerHTML;
            btn.innerHTML = '<i class="fas fa-check"></i> Copied!';
            btn.style.background = '#10b981';
            setTimeout(() => {
                btn.innerHTML = originalHTML;
                btn.style.background = '#0ea5e9';
            }, 2000);
        }
    }).catch(() => {
        alert('📋 Copied: ' + code);
    });
};

window.regenerateCompanyCodeUI = function() {
    if (!confirm('⚠️ Regenerate Company Code?\n\nStaff with the old code will need the new one.')) {
        return;
    }
    
    const newCode = regenerateCompanyCode();
    
    if (newCode) {
        const display = document.getElementById('companyCodeDisplay');
        if (display) display.textContent = newCode;
        
        if (confirm('✅ New Code: ' + newCode + '\n\nSync to cloud now?')) {
            if (typeof fullCloudSync === 'function') fullCloudSync();
        }
    }
};

// ==================== FACTORY RESET ====================

window.factoryReset = async function() {
    console.log('═══════════════════════════════════════════════════');
    console.log('  🔴 FACTORY RESET - DANGER ZONE');
    console.log('═══════════════════════════════════════════════════');
    console.log('  This will DELETE all accounts except founder.');
    console.log('  To confirm, run: confirmFactoryReset()');
    console.log('═══════════════════════════════════════════════════');
};

window.confirmFactoryReset = async function() {
    if (!confirm('⚠️ FACTORY RESET ⚠️\n\nThis will DELETE all accounts!\n\nAre you ABSOLUTELY sure?')) {
        return;
    }
    
    const confirmation = prompt('Type RESET to confirm:');
    if (confirmation !== 'RESET') {
        console.log('❌ Cancelled');
        return;
    }
    
    try {
        const freshFounder = {
            id: 'founder_001',
            email: 'founder@ezcubic.com',
            password: 'founder123',
            name: 'Founder',
            role: 'founder',
            status: 'active',
            permissions: ['all'],
            tenantId: 'tenant_founder',
            createdAt: new Date().toISOString()
        };
        
        const freshTenants = {
            'tenant_founder': {
                id: 'tenant_founder',
                ownerId: 'founder_001',
                businessName: "Founder's Business",
                companyCode: generateCompanyCode(),
                createdAt: new Date().toISOString(),
                status: 'active'
            }
        };
        
        localStorage.setItem('ezcubic_users', JSON.stringify([freshFounder]));
        localStorage.setItem('ezcubic_tenants', JSON.stringify(freshTenants));
        localStorage.removeItem('ezcubic_current_user');
        localStorage.removeItem('ezcubic_session_token');
        
        if (window.supabase?.createClient) {
            const client = getUsersSupabaseClient();
            
            await client.from('tenant_data').upsert({
                tenant_id: 'global',
                data_key: 'ezcubic_users',
                data: { key: 'ezcubic_users', value: [freshFounder], synced_at: new Date().toISOString() },
                updated_at: new Date().toISOString()
            }, { onConflict: 'tenant_id,data_key' });
            
            await client.from('tenant_data').upsert({
                tenant_id: 'global',
                data_key: 'ezcubic_tenants',
                data: { key: 'ezcubic_tenants', value: freshTenants, synced_at: new Date().toISOString() },
                updated_at: new Date().toISOString()
            }, { onConflict: 'tenant_id,data_key' });
        }
        
        users = [freshFounder];
        currentUser = null;
        
        alert('✅ FACTORY RESET COMPLETE!\n\n📧 Email: founder@ezcubic.com\n🔑 Password: founder123');
        setTimeout(() => location.reload(), 1000);
        
    } catch (err) {
        alert('❌ Failed: ' + err.message);
    }
};

// ==================== DEBUG FUNCTIONS ====================

window.viewCurrentState = function() {
    const users = JSON.parse(localStorage.getItem('ezcubic_users') || '[]');
    const tenants = JSON.parse(localStorage.getItem('ezcubic_tenants') || '{}');
    const currentUser = JSON.parse(localStorage.getItem('ezcubic_current_user') || '{}');
    
    console.log('═══════════════════════════════════════════════════');
    console.log('  📊 CURRENT STATE');
    console.log('═══════════════════════════════════════════════════');
    console.log('  👤 Current User:', currentUser.email || 'Not logged in');
    console.log('  👥 Total Users:', users.length);
    console.log('  🏢 Total Tenants:', Object.keys(tenants).length);
    console.log('═══════════════════════════════════════════════════');
    
    return { users, tenants, currentUser };
};

window.viewCloudState = async function() {
    console.log('☁️ Fetching cloud state...');
    
    try {
        if (!window.supabase?.createClient) {
            console.log('❌ Supabase not loaded');
            return;
        }
        
        const client = getUsersSupabaseClient();
        
        const { data, error } = await client.from('tenant_data')
            .select('*')
            .eq('tenant_id', 'global');
        
        if (error) {
            console.error('❌ Error:', error.message);
            return;
        }
        
        console.log('═══════════════════════════════════════════════════');
        console.log('  ☁️ CLOUD STATE');
        console.log('═══════════════════════════════════════════════════');
        
        for (const record of data || []) {
            if (record.data_key === 'ezcubic_users') {
                const cloudUsers = record.data?.value || [];
                console.log('  👥 Cloud Users:', cloudUsers.length);
            }
            if (record.data_key === 'ezcubic_tenants') {
                const cloudTenants = record.data?.value || {};
                console.log('  🏢 Cloud Tenants:', Object.keys(cloudTenants).length);
            }
        }
        console.log('═══════════════════════════════════════════════════');
        
    } catch (err) {
        console.error('❌ Error:', err);
    }
};

window.cloudSyncStatus = function() {
    const localUsers = JSON.parse(localStorage.getItem('ezcubic_users') || '[]');
    const localTenants = JSON.parse(localStorage.getItem('ezcubic_tenants') || '{}');
    
    console.log('=== CLOUD SYNC STATUS ===');
    console.log('Local Users:', localUsers.length);
    console.log('Local Tenants:', Object.keys(localTenants).length);
    console.log('=========================');
    console.log('Commands: testCloudConnection(), forceSyncUsersToCloud(), downloadUsersFromCloud(), fullCloudSync()');
    
    return { users: localUsers.length, tenants: Object.keys(localTenants).length };
};

window.debugSyncFromLoginPage = async function() {
    try {
        const localUsers = JSON.parse(localStorage.getItem('ezcubic_users') || '[]');
        
        if (!window.supabase?.createClient) {
            alert('❌ Supabase not available.');
            return;
        }
        
        const client = getUsersSupabaseClient();
        
        const { data, error } = await client.from('tenant_data')
            .select('data')
            .eq('tenant_id', 'global')
            .eq('data_key', 'ezcubic_users')
            .single();
        
        if (error && error.code !== 'PGRST116') {
            alert('❌ Cloud error: ' + error.message);
            return;
        }
        
        const cloudUsers = data?.data?.value || [];
        
        const action = confirm(
            '📱 LOCAL: ' + localUsers.length + ' users\n' +
            '☁️ CLOUD: ' + cloudUsers.length + ' users\n\n' +
            'OK = Download from cloud\nCancel = Upload to cloud'
        );
        
        if (action) {
            const merged = [...localUsers];
            cloudUsers.forEach(cu => {
                if (!merged.find(lu => lu.id === cu.id || lu.email === cu.email)) {
                    merged.push(cu);
                }
            });
            localStorage.setItem('ezcubic_users', JSON.stringify(merged));
            alert('✅ Downloaded! Refreshing...');
            location.reload();
        } else {
            await client.from('tenant_data').upsert({
                tenant_id: 'global',
                data_key: 'ezcubic_users',
                data: { key: 'ezcubic_users', value: localUsers, synced_at: new Date().toISOString() },
                updated_at: new Date().toISOString()
            }, { onConflict: 'tenant_id,data_key' });
            alert('✅ Uploaded!');
        }
    } catch (err) {
        alert('Error: ' + err.message);
    }
};

// ==================== WINDOW EXPORTS ====================
window.syncTenantDataToCloud = syncTenantDataToCloud;
