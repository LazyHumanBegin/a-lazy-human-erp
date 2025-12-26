/**
 * EZCubic - Multi-Tenant Core Data Management
 * Split from multi-tenant.js v2.3.2
 * 
 * Core tenant data structures and storage functions
 * Version: 1.0.0 - 26 Dec 2025
 */

// ==================== TENANT STORAGE ====================
const TENANTS_KEY = 'ezcubic_tenants';
const TENANT_DATA_PREFIX = 'ezcubic_tenant_';

// Current active tenant
let currentTenantId = null;

// ==================== TENANT STRUCTURE ====================
// Each tenant (business) has its own isolated data
function createTenantDataStructure() {
    return {
        transactions: [],
        bills: [],
        products: [],
        customers: [],
        stockMovements: [],
        sales: [],
        suppliers: [],
        quotations: [],
        projects: [],
        employees: [],
        branches: [],
        purchaseOrders: [],
        settings: {
            businessName: "",
            currency: "MYR",
            ssmNumber: "",
            tinNumber: "",
            gstNumber: "",
            defaultTaxRate: 0,
            lowStockThreshold: 10
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };
}

// ==================== TENANT MANAGEMENT ====================
function getTenants() {
    const stored = localStorage.getItem(TENANTS_KEY);
    return stored ? JSON.parse(stored) : {};
}

function saveTenants(tenants) {
    localStorage.setItem(TENANTS_KEY, JSON.stringify(tenants));
}

// Generate Company Code for sync
function generateCompanyCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 4; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code + '-' + Date.now().toString(36).toUpperCase().slice(-4);
}

function createTenant(userId, businessName) {
    const tenants = getTenants();
    const tenantId = 'tenant_' + Date.now();
    const companyCode = generateCompanyCode();
    
    tenants[tenantId] = {
        id: tenantId,
        ownerId: userId,
        businessName: businessName || 'New Business',
        companyCode: companyCode, // Auto-generate Company Code
        createdAt: new Date().toISOString(),
        status: 'active'
    };
    
    saveTenants(tenants);
    
    // Create empty data structure for this tenant
    const tenantData = createTenantDataStructure();
    tenantData.settings.businessName = businessName || 'New Business';
    saveTenantData(tenantId, tenantData);
    
    console.log('🏢 Created tenant:', tenantId, 'Company Code:', companyCode);
    
    // AUTO-SYNC to cloud (non-blocking)
    autoSyncToCloud();
    
    return tenantId;
}

// Auto-sync users and tenants to cloud
async function autoSyncToCloud() {
    try {
        // Use shared client from users.js if available
        const client = typeof getUsersSupabaseClient === 'function' ? getUsersSupabaseClient() : null;
        if (!client) {
            console.warn('⚠️ Supabase not ready, will sync later');
            return;
        }
        
        // Sync users
        const users = JSON.parse(localStorage.getItem('ezcubic_users') || '[]');
        if (users.length > 0) {
            await client.from('tenant_data').upsert({
                tenant_id: 'global',
                data_key: 'ezcubic_users',
                data: { key: 'ezcubic_users', value: users, synced_at: new Date().toISOString() },
                updated_at: new Date().toISOString()
            }, { onConflict: 'tenant_id,data_key' });
        }
        
        // Sync tenants
        const tenants = JSON.parse(localStorage.getItem('ezcubic_tenants') || '{}');
        if (Object.keys(tenants).length > 0) {
            await client.from('tenant_data').upsert({
                tenant_id: 'global',
                data_key: 'ezcubic_tenants',
                data: { key: 'ezcubic_tenants', value: tenants, synced_at: new Date().toISOString() },
                updated_at: new Date().toISOString()
            }, { onConflict: 'tenant_id,data_key' });
        }
        
        console.log('☁️ Auto-synced to cloud');
    } catch (err) {
        console.warn('⚠️ Auto-sync failed:', err.message);
    }
}

function getTenantInfo(tenantId) {
    const tenants = getTenants();
    return tenants[tenantId] || null;
}

// ==================== TENANT DATA ACCESS ====================
function getTenantDataKey(tenantId) {
    return TENANT_DATA_PREFIX + tenantId;
}

function loadTenantData(tenantId) {
    if (!tenantId) return null;
    const stored = localStorage.getItem(getTenantDataKey(tenantId));
    return stored ? JSON.parse(stored) : createTenantDataStructure();
}

function saveTenantData(tenantId, data) {
    if (!tenantId) return;
    data.updatedAt = new Date().toISOString();
    localStorage.setItem(getTenantDataKey(tenantId), JSON.stringify(data));
}

// ==================== EXPORTS ====================
window.TENANTS_KEY = TENANTS_KEY;
window.TENANT_DATA_PREFIX = TENANT_DATA_PREFIX;
window.currentTenantId = currentTenantId;
window.createTenantDataStructure = createTenantDataStructure;
window.getTenants = getTenants;
window.saveTenants = saveTenants;
window.generateCompanyCode = generateCompanyCode;
window.createTenant = createTenant;
window.autoSyncToCloud = autoSyncToCloud;
window.getTenantInfo = getTenantInfo;
window.getTenantDataKey = getTenantDataKey;
window.loadTenantData = loadTenantData;
window.saveTenantData = saveTenantData;

// Export setter for currentTenantId (used by UI module)
window.setCurrentTenantIdValue = function(value) {
    currentTenantId = value;
    window.currentTenantId = currentTenantId;
};
window.getCurrentTenantIdValue = function() {
    return currentTenantId;
};
