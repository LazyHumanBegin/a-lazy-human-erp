/**
 * EZCubic - User Cloud Sync Functions Module
 * Company code sync, factory reset, debug functions
 * Version: 2.2.5 - Split from users-cloud.js
 */

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
