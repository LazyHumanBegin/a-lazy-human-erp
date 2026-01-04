/**
 * EZ CUBIC Tenant Module
 * Multi-tenant data isolation and management
 * 
 * Functions:
 * - generateCompanyCode() - Generate unique company code for device sync
 * - migrateFounderData() - Migrate existing data to founder tenant
 * - downloadTenantInfoFromCloud() - Download tenant metadata from cloud
 * - downloadTenantFromCloud() - Download full tenant data from cloud
 * - loadUserTenantData() - Load user's isolated tenant data
 * - initializeEmptyTenantData() - Create new tenant with empty data
 * - syncTenantDataToCloud() - Sync tenant data to cloud storage
 * - resetToEmptyData() - Reset all data to empty state
 * - resetWindowArraysOnly() - Reset only window arrays (for same tenant refresh)
 * 
 * @version 2028010
 * @date 2025-01-01
 */

// ==================== COMPANY CODE ====================

/**
 * Generate unique company code for device sync
 * Format: XXXX-YYYY (4 chars + 4 timestamp chars)
 */
function generateCompanyCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 4; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code + '-' + Date.now().toString(36).toUpperCase().slice(-4);
}

// Expose to window for global access
window.generateCompanyCode = generateCompanyCode;

// ==================== TENANT MIGRATION ====================

/**
 * Migrate existing data to Founder tenant
 * Called when creating the first tenant for existing data
 */
function migrateFounderData(tenantId) {
    const tenantKey = 'ezcubic_tenant_' + tenantId;
    
    console.log('Migrating existing data to Founder tenant:', tenantId);
    
    // Gather existing data from global storage keys
    const existingData = JSON.parse(localStorage.getItem('ezcubicDataMY') || '{}');
    const existingProducts = JSON.parse(localStorage.getItem('ezcubic_products') || '[]');
    const existingCustomers = JSON.parse(localStorage.getItem('ezcubic_customers') || '[]');
    const existingSuppliers = JSON.parse(localStorage.getItem('ezcubic_suppliers') || '[]');
    const existingBranches = JSON.parse(localStorage.getItem('ezcubic_branches') || '[]');
    const existingQuotations = JSON.parse(localStorage.getItem('ezcubic_quotations') || '[]');
    const existingProjects = JSON.parse(localStorage.getItem('ezcubic_projects') || '[]');
    const existingPurchaseOrders = JSON.parse(localStorage.getItem('ezcubic_purchase_orders') || '[]');
    const existingStockMovements = JSON.parse(localStorage.getItem('ezcubic_stock_movements') || '[]');
    const existingSales = JSON.parse(localStorage.getItem('ezcubic_sales') || '[]');
    const existingDeliveryOrders = JSON.parse(localStorage.getItem('ezcubic_delivery_orders') || '[]');
    
    // Get default settings
    const defaultSettings = typeof getDefaultSettings === 'function' ? getDefaultSettings() : {
        businessName: "Founder's Business",
        currency: 'MYR',
        defaultTaxRate: 0
    };
    
    // Create founder tenant data with all existing data
    const founderTenantData = {
        transactions: existingData.transactions || [],
        bills: existingData.bills || [],
        products: existingProducts,
        customers: existingCustomers,
        suppliers: existingSuppliers,
        branches: existingBranches,
        quotations: existingQuotations,
        projects: existingProjects,
        purchaseOrders: existingPurchaseOrders,
        stockMovements: existingStockMovements,
        sales: existingSales,
        deliveryOrders: existingDeliveryOrders,
        settings: existingData.settings || defaultSettings,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };
    
    // Save to founder's tenant storage
    localStorage.setItem(tenantKey, JSON.stringify(founderTenantData));
    
    // Register founder tenant with Company Code
    const tenants = JSON.parse(localStorage.getItem('ezcubic_tenants') || '{}');
    tenants[tenantId] = {
        id: tenantId,
        ownerId: 'founder_001',
        businessName: existingData.settings?.businessName || "Founder's Business",
        companyCode: generateCompanyCode(), // For device sync
        createdAt: new Date().toISOString(),
        status: 'active'
    };
    localStorage.setItem('ezcubic_tenants', JSON.stringify(tenants));
    
    console.log('Founder data migration completed with:', {
        transactions: founderTenantData.transactions.length,
        products: founderTenantData.products.length,
        customers: founderTenantData.customers.length,
        quotations: founderTenantData.quotations.length,
        projects: founderTenantData.projects.length,
        sales: founderTenantData.sales.length,
        stockMovements: founderTenantData.stockMovements.length,
        deliveryOrders: founderTenantData.deliveryOrders.length
    });
}

// Expose to window
window.migrateFounderData = migrateFounderData;

// ==================== CLOUD SYNC ====================

/**
 * Get Supabase client for users (from users.js)
 */
function getUsersSupabaseClient() {
    if (typeof window.getUsersSupabaseClient === 'function') {
        return window.getUsersSupabaseClient();
    }
    // Fallback: Create client directly with main Supabase config
    if (window.supabase?.createClient) {
        return window.supabase.createClient(
            'https://tctpmizdcksdxngtozwe.supabase.co',
            'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRjdHBtaXpkY2tzZHhuZ3RvendlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYyOTE1NzAsImV4cCI6MjA4MTg2NzU3MH0.-BL0NoQxVfFA3MXEuIrC24G6mpkn7HGIyyoRBVFu300'
        );
    }
    console.warn('⚠️ Supabase not available');
    return null;
}

/**
 * Download tenant metadata from cloud
 */
async function downloadTenantInfoFromCloud(tenantId) {
    
    try {
        if (!window.supabase?.createClient) return;
        
        const client = getUsersSupabaseClient();
        
        const { data, error } = await client
            .from('tenant_data')
            .select('*')
            .eq('tenant_id', 'global')
            .eq('data_key', 'ezcubic_tenants')
            .single();
        
        if (error || !data?.data?.value) return;
        
        const cloudTenants = data.data.value;
        const tenantInfo = cloudTenants[tenantId];
        
        if (tenantInfo) {
            // Merge into local tenants
            const localTenants = JSON.parse(localStorage.getItem('ezcubic_tenants') || '{}');
            localTenants[tenantId] = tenantInfo;
            localStorage.setItem('ezcubic_tenants', JSON.stringify(localTenants));
            console.log('☁️ Downloaded tenant info:', tenantInfo.businessName);
        }
        
    } catch (err) {
        console.warn('⚠️ Could not download tenant info:', err);
    }
}

// Expose to window
window.downloadTenantInfoFromCloud = downloadTenantInfoFromCloud;

/**
 * Download full tenant data from cloud (transactions, products, etc.)
 * IMPORTANT: Uses timestamp-based merge to preserve local deletions/additions
 */
async function downloadTenantFromCloud(tenantId) {
    
    try {
        if (!window.supabase?.createClient) return;
        
        const client = getUsersSupabaseClient();
        
        // First download tenant info
        await downloadTenantInfoFromCloud(tenantId);
        
        // Then try to download full tenant data
        const { data, error } = await client
            .from('tenant_data')
            .select('*')
            .eq('tenant_id', tenantId)
            .eq('data_key', 'tenant_full_data')
            .single();
        
        if (!error && data?.data?.value) {
            const cloudData = data.data.value;
            const tenantKey = 'ezcubic_tenant_' + tenantId;
            
            // Check if we have newer local data (user made changes since last sync)
            const localUpdatedAt = parseInt(localStorage.getItem('ezcubic_last_save_timestamp') || '0');
            const cloudUpdatedAt = cloudData.updatedAt ? new Date(cloudData.updatedAt).getTime() : 0;
            
            // Check if local actually has meaningful data
            const localTenantData = JSON.parse(localStorage.getItem(tenantKey) || '{}');
            const localHasData = (localTenantData.products?.length > 0) || 
                                (localTenantData.customers?.length > 0) ||
                                (localTenantData.transactions?.length > 0) ||
                                (localTenantData.sales?.length > 0);
            
            // Check if cloud has meaningful data
            const cloudHasData = (cloudData.products?.length > 0) || 
                                (cloudData.customers?.length > 0) ||
                                (cloudData.transactions?.length > 0) ||
                                (cloudData.sales?.length > 0);
            
            // CRITICAL: Check if local has FEWER products (indicating deletion)
            const localProductCount = localTenantData.products?.length || 0;
            const cloudProductCount = cloudData.products?.length || 0;
            const localHasDeletions = localProductCount < cloudProductCount;
            
            console.log('☁️ Cloud download - data check:', {
                localTimestamp: localUpdatedAt,
                cloudTimestamp: cloudUpdatedAt,
                localNewer: localUpdatedAt > cloudUpdatedAt,
                localHasData,
                cloudHasData,
                localProducts: localProductCount,
                cloudProducts: cloudProductCount,
                localHasDeletions
            });
            
            // CRITICAL FIX: Prefer local if:
            // 1. Local timestamp is newer (or equal with margin), OR
            // 2. Local has fewer items (deletions happened)
            // Only use cloud if local has NO data at all
            const shouldPreferLocal = (localUpdatedAt >= cloudUpdatedAt && localHasData) || 
                                      (localHasDeletions && localUpdatedAt > 0);
            
            if (shouldPreferLocal) {
                console.log('☁️ LOCAL DATA IS NEWER OR HAS DELETIONS - preserving local changes');
                // Still save to tenant storage but merge with local data taking priority
                const existingTenantData = JSON.parse(localStorage.getItem(tenantKey) || '{}');
                
                // Merge: cloudData as base, but keep local arrays if they exist
                const mergedData = { ...cloudData };
                
                // For arrays, prefer local TENANT STORAGE (which has deletions/additions applied)
                // CRITICAL FIX: Use existingTenantData NOT localStorage keys to preserve deletions
                const arrayKeys = ['customers', 'products', 'crmCustomers', 'suppliers', 'quotations', 
                                   'projects', 'transactions', 'sales', 'orders', 'stockMovements', 
                                   'employees', 'branches', 'heldSales', 'kpiTemplates', 'kpiAssignments', 'kpiScores'];
                
                arrayKeys.forEach(key => {
                    // CRITICAL: Read from tenant storage (existingTenantData) NOT generic localStorage
                    // This preserves deletions - when you delete a product, it's removed from tenant storage
                    // but generic localStorage (ezcubic_products) might have stale data
                    if (existingTenantData[key] !== undefined) {
                        mergedData[key] = existingTenantData[key];
                        console.log(`  ↳ Keeping local tenant ${key}:`, (existingTenantData[key] || []).length, 'items');
                    }
                });
                
                // Update tenant storage with merged data
                mergedData.updatedAt = new Date().toISOString();
                localStorage.setItem(tenantKey, JSON.stringify(mergedData));
                
                // CRITICAL: Also sync tenant data to generic localStorage keys
                // This ensures getData() later reads correct data even if useLocalStorage=true
                localStorage.setItem('ezcubic_products', JSON.stringify(mergedData.products || []));
                localStorage.setItem('ezcubic_customers', JSON.stringify(mergedData.customers || []));
                localStorage.setItem('ezcubic_crm_customers', JSON.stringify(mergedData.crmCustomers || []));
                localStorage.setItem('ezcubic_suppliers', JSON.stringify(mergedData.suppliers || []));
                localStorage.setItem('ezcubic_quotations', JSON.stringify(mergedData.quotations || []));
                localStorage.setItem('ezcubic_projects', JSON.stringify(mergedData.projects || []));
                localStorage.setItem('ezcubic_stock_movements', JSON.stringify(mergedData.stockMovements || []));
                localStorage.setItem('ezcubic_sales', JSON.stringify(mergedData.sales || []));
                localStorage.setItem('ezcubic_orders', JSON.stringify(mergedData.orders || []));
                localStorage.setItem('ezcubic_employees', JSON.stringify(mergedData.employees || []));
                localStorage.setItem('ezcubic_branches', JSON.stringify(mergedData.branches || []));
                console.log('☁️ Synced tenant data to generic localStorage keys');
                
                console.log('☁️ Merged cloud + local (local priority) for tenant:', tenantId);
                return;
            }
            
            // Cloud is newer OR local has no data - use cloud data
            console.log('☁️ Using cloud data (cloud newer or local empty)');
            localStorage.setItem(tenantKey, JSON.stringify(cloudData));
            
            // CRITICAL: Extract ALL data from cloud to localStorage, including empty arrays
            // This ensures stale data from previous users is cleared
            // Always set the key - use empty array if cloud has no data
            localStorage.setItem('ezcubic_customers', JSON.stringify(cloudData.customers || []));
            console.log('  ↳ Extracted', (cloudData.customers || []).length, 'customers');
            
            localStorage.setItem('ezcubic_products', JSON.stringify(cloudData.products || []));
            console.log('  ↳ Extracted', (cloudData.products || []).length, 'products');
            
            localStorage.setItem('ezcubic_crm_customers', JSON.stringify(cloudData.crmCustomers || []));
            console.log('  ↳ Extracted', (cloudData.crmCustomers || []).length, 'CRM customers');
            
            localStorage.setItem('ezcubic_suppliers', JSON.stringify(cloudData.suppliers || []));
            console.log('  ↳ Extracted', (cloudData.suppliers || []).length, 'suppliers');
            
            localStorage.setItem('ezcubic_quotations', JSON.stringify(cloudData.quotations || []));
            console.log('  ↳ Extracted', (cloudData.quotations || []).length, 'quotations');
            
            localStorage.setItem('ezcubic_projects', JSON.stringify(cloudData.projects || []));
            console.log('  ↳ Extracted', (cloudData.projects || []).length, 'projects');
            
            localStorage.setItem('ezcubic_transactions', JSON.stringify(cloudData.transactions || []));
            console.log('  ↳ Extracted', (cloudData.transactions || []).length, 'transactions');
            
            localStorage.setItem('ezcubic_sales', JSON.stringify(cloudData.sales || []));
            console.log('  ↳ Extracted', (cloudData.sales || []).length, 'sales');
            
            localStorage.setItem('ezcubic_orders', JSON.stringify(cloudData.orders || []));
            console.log('  ↳ Extracted', (cloudData.orders || []).length, 'orders');
            
            localStorage.setItem('ezcubic_stock_movements', JSON.stringify(cloudData.stockMovements || []));
            console.log('  ↳ Extracted', (cloudData.stockMovements || []).length, 'stock movements');
            
            localStorage.setItem('ezcubic_employees', JSON.stringify(cloudData.employees || []));
            console.log('  ↳ Extracted', (cloudData.employees || []).length, 'employees');
            
            localStorage.setItem('ezcubic_branches', JSON.stringify(cloudData.branches || []));
            console.log('  ↳ Extracted', (cloudData.branches || []).length, 'branches');
            
            // Also extract held sales and KPI data
            localStorage.setItem('ezcubic_held_sales', JSON.stringify(cloudData.heldSales || []));
            console.log('  ↳ Extracted', (cloudData.heldSales || []).length, 'held sales');
            
            localStorage.setItem('ezcubic_kpi_templates', JSON.stringify(cloudData.kpiTemplates || []));
            console.log('  ↳ Extracted', (cloudData.kpiTemplates || []).length, 'KPI templates');
        } else {
            // No cloud data exists for this tenant (new user or cloud error)
            // CRITICAL: Clear localStorage keys to prevent data bleeding from previous users
            console.log('☁️ No cloud data found for tenant:', tenantId, '- clearing localStorage');
            const keysToClean = [
                'ezcubic_products', 'ezcubic_customers', 'ezcubic_suppliers',
                'ezcubic_branches', 'ezcubic_quotations', 'ezcubic_projects',
                'ezcubic_crm_customers', 'ezcubic_employees', 'ezcubic_stock_movements',
                'ezcubic_sales', 'ezcubic_orders', 'ezcubic_transactions',
                'ezcubic_held_sales', 'ezcubic_kpi_templates'
            ];
            keysToClean.forEach(key => {
                localStorage.setItem(key, '[]');
            });
        }
        
    } catch (err) {
        console.warn('⚠️ Could not download tenant data:', err);
    }
}

// Expose to window
window.downloadTenantFromCloud = downloadTenantFromCloud;

/**
 * Sync tenant data to Supabase cloud
 */
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

// Expose to window
window.syncTenantDataToCloud = syncTenantDataToCloud;

// ==================== TENANT DATA LOADING ====================

/**
 * Load user's isolated tenant data
 * Handles both same tenant (refresh) and different tenant (user switch)
 * AUTO-DOWNLOADS from cloud if local data is empty (for staff on new devices)
 */
async function loadUserTenantData(user) {
    console.log('========================================');
    console.log('🔄 loadUserTenantData called for user:', user?.email, 'tenantId:', user?.tenantId);
    console.log('========================================');
    
    // Set flag to prevent saveData from overwriting tenant data during load
    window._isLoadingUserData = true;
    
    // SAFETY: Ensure flag is cleared after 5 seconds max (in case of errors)
    setTimeout(() => {
        if (window._isLoadingUserData) {
            console.warn('⚠️ _isLoadingUserData flag was stuck, clearing it');
            window._isLoadingUserData = false;
        }
    }, 5000);
    
    if (!user || !user.tenantId) {
        console.log('No tenant ID for user, creating new tenant...');
        if (user) {
            const tenantId = 'tenant_' + Date.now();
            user.tenantId = tenantId;
            initializeEmptyTenantData(tenantId, user.name);
            if (typeof window.saveUsers === 'function') {
                window.saveUsers();
            }
        }
        window._isLoadingUserData = false;
        return;
    }
    
    // Track last loaded user for comparison
    const lastLoadedUserId = localStorage.getItem('ezcubic_last_user_id');
    const isSameUser = lastLoadedUserId === user.id;
    
    console.log('👤 User check: lastUser=' + lastLoadedUserId + ', currentUser=' + user.id + ', isSameUser=' + isSameUser);
    
    // Save current user ID for next time
    localStorage.setItem('ezcubic_last_tenant_id', user.tenantId);
    localStorage.setItem('ezcubic_last_user_id', user.id);
    
    // Load tenant data from tenant-specific storage
    const tenantKey = 'ezcubic_tenant_' + user.tenantId;
    let tenantData = JSON.parse(localStorage.getItem(tenantKey) || 'null');
    
    console.log('📦 Tenant storage key:', tenantKey);
    console.log('📦 Tenant data exists:', !!tenantData);
    if (tenantData) {
        console.log('📦 Products in tenant:', tenantData.products?.length || 0);
        console.log('📦 Branches in tenant:', tenantData.branches?.length || 0);
    }
    
    // CRITICAL FIX: For same user, ALWAYS try cloud download first
    // This ensures Device B gets Device A's inventory even if Device B has stale local data
    // The cloud download function handles timestamp comparison to avoid overwriting newer local changes
    if (typeof downloadTenantFromCloud === 'function') {
        console.log('☁️ Checking cloud for tenant data...');
        try {
            await downloadTenantFromCloud(user.tenantId);
            // Re-read tenant data after cloud download (might have updated it)
            const updatedTenantData = JSON.parse(localStorage.getItem(tenantKey) || 'null');
            if (updatedTenantData) {
                tenantData = updatedTenantData;
                console.log('✅ Tenant data loaded/updated from cloud!');
                console.log('📦 Products after cloud sync:', tenantData.products?.length || 0);
            }
        } catch (err) {
            console.warn('⚠️ Cloud download failed:', err.message);
        }
    }
    
    // CRITICAL: Always reset window arrays before loading
    resetWindowArraysOnly();
    
    // CRITICAL FIX: If different user, clear all generic localStorage keys
    // to prevent data bleeding from previous user
    if (!isSameUser) {
        console.log('🔄 Different user detected - clearing generic localStorage keys');
        const keysToClean = [
            'ezcubic_products', 'ezcubic_customers', 'ezcubic_suppliers',
            'ezcubic_branches', 'ezcubic_quotations', 'ezcubic_projects',
            'ezcubic_crm_customers', 'ezcubic_employees', 'ezcubic_stock_movements',
            'ezcubic_sales', 'ezcubic_orders', 'ezcubic_purchase_orders',
            'ezcubic_held_sales', 'ezcubic_transactions', 'ezcubic_bills',
            'ezcubicDataMY', 'ezcubic_last_save_timestamp'
        ];
        keysToClean.forEach(key => localStorage.removeItem(key));
    }
    
    if (!tenantData) {
        console.log('⚠️ No tenant data found, initializing empty...');
        initializeEmptyTenantData(user.tenantId, user.name || 'User');
        window._isLoadingUserData = false;
        return;
    }
    
    // ============================================================
    // FIX: ALWAYS prefer tenant storage as source of truth
    // localStorage is only a cache - tenant storage is the real data
    // ============================================================
    
    // Compare timestamps to determine which is newer
    const tenantUpdatedAt = tenantData.updatedAt ? new Date(tenantData.updatedAt).getTime() : 0;
    const localSaveTimestamp = parseInt(localStorage.getItem('ezcubic_last_save_timestamp') || '0');
    
    // Use localStorage ONLY if same user AND local timestamp is actually newer than tenant
    const useLocalStorage = isSameUser && localSaveTimestamp > tenantUpdatedAt;
    console.log('📊 Data source decision: useLocalStorage=' + useLocalStorage);
    console.log('📊 Timestamps: tenant=' + tenantUpdatedAt + ', local=' + localSaveTimestamp + ', isSameUser=' + isSameUser);
    
    // Helper to get data from the correct source
    const getData = (tenantArray, localStorageKey) => {
        if (useLocalStorage) {
            // Same user with newer local timestamp - prefer localStorage
            // IMPORTANT: localStorage might have 0 items (user deleted everything)
            // That's valid - don't fall back to tenant in that case
            const localRaw = localStorage.getItem(localStorageKey);
            if (localRaw !== null) {
                const localData = JSON.parse(localRaw);
                console.log(`  ✓ Using localStorage for ${localStorageKey}: ${localData.length} items`);
                return localData;
            }
        }
        // Different user OR localStorage key doesn't exist - use tenant data
        console.log(`  ✓ Using tenant for ${localStorageKey}: ${(tenantArray || []).length} items`);
        return tenantArray || [];
    };
    
    // Load all data from tenant storage (or localStorage for same user)
    const products = getData(tenantData.products, 'ezcubic_products');
    const customers = getData(tenantData.customers, 'ezcubic_customers');
    const suppliers = getData(tenantData.suppliers, 'ezcubic_suppliers');
    const branches = getData(tenantData.branches, 'ezcubic_branches');
    const quotations = getData(tenantData.quotations, 'ezcubic_quotations');
    const projects = getData(tenantData.projects, 'ezcubic_projects');
    const crmCustomers = getData(tenantData.crmCustomers, 'ezcubic_crm_customers');
    const employees = getData(tenantData.employees, 'ezcubic_employees');
    const stockMovements = getData(tenantData.stockMovements, 'ezcubic_stock_movements');
    const sales = getData(tenantData.sales, 'ezcubic_sales');
    const orders = getData(tenantData.orders, 'ezcubic_orders');
    const purchaseOrders = getData(tenantData.purchaseOrders, 'ezcubic_purchase_orders');
    const transactions = tenantData.transactions || [];
    const bills = tenantData.bills || [];
    const heldSales = getData(tenantData.heldSales, 'ezcubic_held_sales');
    
    console.log('📊 Final data counts:');
    console.log('  - Products:', products.length);
    console.log('  - Branches:', branches.length);
    console.log('  - Customers:', customers.length);
    console.log('  - Sales:', sales.length);
    
    // Gather remaining data from tenant storage
    const kpiTemplates = tenantData.kpiTemplates || [];
    const kpiAssignments = tenantData.kpiAssignments || [];
    const kpiScores = tenantData.kpiScores || [];
    
    // Create businessData object
    if (typeof window.businessData === 'undefined' || !window.businessData) {
        window.businessData = { transactions: [], bills: [], settings: {} };
    }
    
    // Get default settings function
    const getDefaultSettings = typeof window.getDefaultSettings === 'function' 
        ? window.getDefaultSettings 
        : () => ({ businessName: 'My Business', currency: 'MYR', defaultTaxRate: 0 });
    
    // Set all businessData properties
    window.businessData.transactions = transactions;
    window.businessData.bills = bills;
    window.businessData.products = products;
    window.businessData.customers = customers;
    window.businessData.stockMovements = stockMovements;
    window.businessData.sales = sales;
    window.businessData.suppliers = suppliers;
    window.businessData.branches = branches;
    window.businessData.quotations = quotations;
    window.businessData.projects = projects;
    window.businessData.purchaseOrders = purchaseOrders;
    window.businessData.deliveryOrders = tenantData.deliveryOrders || [];
    if (tenantData.settings) {
        window.businessData.settings = { ...getDefaultSettings(), ...tenantData.settings };
    }
    
    // Update global arrays
    window.transactions = transactions;
    window.products = products;
    window.customers = customers;
    window.stockMovements = stockMovements;
    window.sales = sales;
    window.suppliers = suppliers;
    window.branches = branches;
    window.branchTransfers = tenantData.branchTransfers || [];
    window.quotations = quotations;
    window.projects = projects;
    window.purchaseOrders = purchaseOrders;
    window.goodsReceipts = tenantData.goodsReceipts || [];
    window.deliveryOrders = tenantData.deliveryOrders || [];
    window.crmCustomers = crmCustomers;
    window.employees = employees;
    window.orders = orders;
    window.heldSales = heldSales;
    window.payrollRecords = tenantData.payrollRecords || [];
    window.kpiTemplates = kpiTemplates;
    window.kpiAssignments = kpiAssignments;
    window.kpiScores = kpiScores;
    
    console.log('📦 SET window.branches to', branches.length, 'items');
    console.log('📦 SET window.products to', products.length, 'items');
    
    // CRITICAL: Save to legacy storage keys for compatibility with modules
    // This updates localStorage with the tenant's data (on user switch) or keeps as is (same user refresh)
    localStorage.setItem('ezcubic_products', JSON.stringify(products));
    localStorage.setItem('ezcubic_customers', JSON.stringify(customers));
    localStorage.setItem('ezcubic_suppliers', JSON.stringify(suppliers));
    localStorage.setItem('ezcubic_branches', JSON.stringify(branches));
    localStorage.setItem('ezcubic_branch_transfers', JSON.stringify(tenantData.branchTransfers || []));
    localStorage.setItem('ezcubic_quotations', JSON.stringify(quotations));
    localStorage.setItem('ezcubic_projects', JSON.stringify(projects));
    localStorage.setItem('ezcubic_purchase_orders', JSON.stringify(purchaseOrders));
    localStorage.setItem('ezcubic_goods_receipts', JSON.stringify(tenantData.goodsReceipts || []));
    localStorage.setItem('ezcubic_stock_movements', JSON.stringify(stockMovements));
    localStorage.setItem('ezcubic_sales', JSON.stringify(sales));
    localStorage.setItem('ezcubic_delivery_orders', JSON.stringify(tenantData.deliveryOrders || []));
    localStorage.setItem('ezcubic_crm_customers', JSON.stringify(crmCustomers));
    localStorage.setItem('ezcubic_orders', JSON.stringify(orders));
    
    // HR & Payroll storage keys
    localStorage.setItem('ezcubic_employees', JSON.stringify(employees));
    localStorage.setItem('ezcubic_payroll', JSON.stringify(tenantData.payrollRecords || []));
    localStorage.setItem('ezcubic_kpi_templates', JSON.stringify(kpiTemplates));
    localStorage.setItem('ezcubic_kpi_assignments', JSON.stringify(kpiAssignments));
    localStorage.setItem('ezcubic_kpi_scores', JSON.stringify(kpiScores));
    localStorage.setItem('ezcubic_leave_requests', JSON.stringify(tenantData.leaveRequests || []));
    localStorage.setItem('ezcubic_leave_balances', JSON.stringify(tenantData.leaveBalances || []));
    localStorage.setItem('ezcubic_attendance', JSON.stringify(tenantData.attendanceRecords || []));
    
    // Accounting & Finance storage keys
    localStorage.setItem('ezcubic_transactions', JSON.stringify(transactions));
    localStorage.setItem('ezcubic_bills', JSON.stringify(bills));
    localStorage.setItem('ezcubic_invoices', JSON.stringify(tenantData.invoices || []));
    localStorage.setItem('ezcubic_bank_accounts', JSON.stringify(tenantData.bankAccounts || []));
    localStorage.setItem('ezcubic_credit_cards', JSON.stringify(tenantData.creditCards || []));
    localStorage.setItem('ezcubic_manual_balances', JSON.stringify(tenantData.manualBalances || {}));
    
    // Chart of Accounts & Journal Entries
    localStorage.setItem('ezcubic_chart_of_accounts', JSON.stringify(tenantData.chartOfAccounts || []));
    localStorage.setItem('ezcubic_journal_entries', JSON.stringify(tenantData.journalEntries || []));
    localStorage.setItem('ezcubic_journal_sequence', JSON.stringify(tenantData.journalSequence || { year: new Date().getFullYear(), sequence: 0 }));
    
    // POS
    localStorage.setItem('ezcubic_held_sales', JSON.stringify(heldSales));
    localStorage.setItem('ezcubic_pos_receipts', JSON.stringify(tenantData.posReceipts || []));
    
    // E-Invoice
    localStorage.setItem('ezcubic_einvoice_settings', JSON.stringify(tenantData.einvoiceSettings || {}));
    
    // Outlets
    localStorage.setItem('ezcubic_outlets', JSON.stringify(tenantData.outlets || []));
    
    // AI Assistant
    localStorage.setItem('ezcubic_ai_state', JSON.stringify(tenantData.aiState || {}));
    
    // Save ezcubicDataMY with transactions and bills
    const ezcubicData = {
        transactions: transactions,
        bills: bills,
        settings: tenantData.settings || {},
        version: '2.0',
        lastSaved: new Date().toISOString()
    };
    localStorage.setItem('ezcubicDataMY', JSON.stringify(ezcubicData));
    
    // Clear the loading flag
    window._isLoadingUserData = false;
    
    console.log('✅ Tenant data loaded for:', user.tenantId);
}

// Expose to window
window.loadUserTenantData = loadUserTenantData;

// ==================== TENANT INITIALIZATION ====================

/**
 * Initialize empty tenant data for new tenant
 */
function initializeEmptyTenantData(tenantId, userName) {
    // Get default settings function
    const getDefaultSettings = typeof window.getDefaultSettings === 'function' 
        ? window.getDefaultSettings 
        : () => ({ businessName: userName + "'s Business", currency: 'MYR', defaultTaxRate: 0, lowStockThreshold: 10 });
    
    const emptyTenantData = {
        // Core data
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
        goodsReceipts: [],
        deliveryOrders: [],
        
        // HR & Payroll data
        payrollRecords: [],
        kpiTemplates: [],
        kpiAssignments: [],
        kpiScores: [],
        leaveRequests: [],
        leaveBalances: [],
        attendanceRecords: [],
        
        // Accounting & Finance data
        orders: [],
        invoices: [],
        bankAccounts: [],
        creditCards: [],
        manualBalances: {},
        
        // Chart of Accounts & Journal Entries
        chartOfAccounts: [],
        journalEntries: [],
        journalSequence: { year: new Date().getFullYear(), sequence: 0 },
        
        // POS data
        heldSales: [],
        posReceipts: [],
        
        // Inventory (alias)
        inventory: [],
        
        // CRM (alias)
        crmCustomers: [],
        
        // E-Invoice
        einvoiceSettings: {},
        
        // Outlets
        outlets: [],
        
        // AI state
        aiState: {},
        
        settings: {
            businessName: userName + "'s Business",
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
    
    // Save tenant data
    localStorage.setItem('ezcubic_tenant_' + tenantId, JSON.stringify(emptyTenantData));
    
    // Also register the tenant in the tenants list with Company Code
    const tenants = JSON.parse(localStorage.getItem('ezcubic_tenants') || '{}');
    const companyCode = generateCompanyCode();
    tenants[tenantId] = {
        id: tenantId,
        ownerId: 'user_' + Date.now(),
        businessName: userName + "'s Business",
        companyCode: companyCode, // For staff device sync
        createdAt: new Date().toISOString(),
        status: 'active'
    };
    localStorage.setItem('ezcubic_tenants', JSON.stringify(tenants));
    
    console.log('🏢 Company Code for new tenant:', companyCode);
    
    // CLOUD SYNC: Sync new tenant data to cloud
    syncTenantDataToCloud(tenantId, emptyTenantData);
}

// Expose to window
window.initializeEmptyTenantData = initializeEmptyTenantData;

// ==================== DATA RESET ====================

/**
 * Reset only window arrays (for page refresh with same tenant)
 * Does NOT clear localStorage - preserves data saved by modules
 */
function resetWindowArraysOnly() {
    console.log('Resetting window arrays only (preserving localStorage)...');
    
    // Reset window arrays to empty - they'll be repopulated from localStorage/tenant
    window.products = [];
    window.customers = [];
    window.stockMovements = [];
    window.sales = [];
    window.transactions = [];
    window.suppliers = [];
    window.branches = [];
    window.quotations = [];
    window.projects = [];
    window.purchaseOrders = [];
    window.goodsReceipts = [];
    window.deliveryOrders = [];
    window.crmCustomers = [];
    window.chartOfAccounts = [];
    window.journalEntries = [];
    window.employees = [];
    window.payrollRecords = [];
    
    // Note: We do NOT clear localStorage here - modules will load from it
}

// Expose to window
window.resetWindowArraysOnly = resetWindowArraysOnly;

/**
 * Reset global data to empty state - clears in-memory data AND legacy storage
 * Called when switching to a DIFFERENT tenant
 */
function resetToEmptyData() {
    console.log('⚠️ resetToEmptyData() called - CLEARING ALL localStorage keys');
    console.trace('Stack trace:'); // This will show what called this function
    
    // Get default settings function
    const getDefaultSettings = typeof window.getDefaultSettings === 'function' 
        ? window.getDefaultSettings 
        : () => ({ businessName: 'My Business', currency: 'MYR', defaultTaxRate: 0 });
    
    const defaultSettings = getDefaultSettings();
    
    // Reset businessData object (in-memory)
    if (typeof businessData !== 'undefined') {
        businessData.transactions = [];
        businessData.bills = [];
        businessData.products = [];
        businessData.customers = [];
        businessData.stockMovements = [];
        businessData.sales = [];
        businessData.suppliers = [];
        businessData.branches = [];
        businessData.quotations = [];
        businessData.projects = [];
        businessData.purchaseOrders = [];
        businessData.deliveryOrders = [];
        businessData.currentCart = [];
        businessData.settings = defaultSettings;
    }
    
    // Reset ALL global arrays (in-memory)
    window.products = [];
    window.customers = [];
    window.stockMovements = [];
    window.sales = [];
    window.transactions = [];
    window.suppliers = [];
    window.branches = [];
    window.quotations = [];
    window.projects = [];
    window.purchaseOrders = [];
    window.goodsReceipts = [];
    window.deliveryOrders = [];
    
    // Also try to reset module-level variables if they exist
    try { if (typeof products !== 'undefined') products = []; } catch(e) {}
    try { if (typeof customers !== 'undefined') customers = []; } catch(e) {}
    try { if (typeof stockMovements !== 'undefined') stockMovements = []; } catch(e) {}
    try { if (typeof sales !== 'undefined') sales = []; } catch(e) {}
    try { if (typeof suppliers !== 'undefined') suppliers = []; } catch(e) {}
    try { if (typeof branches !== 'undefined') branches = []; } catch(e) {}
    try { if (typeof quotations !== 'undefined') quotations = []; } catch(e) {}
    try { if (typeof projects !== 'undefined') projects = []; } catch(e) {}
    try { if (typeof purchaseOrders !== 'undefined') purchaseOrders = []; } catch(e) {}
    try { if (typeof goodsReceipts !== 'undefined') goodsReceipts = []; } catch(e) {}
    try { if (typeof deliveryOrders !== 'undefined') deliveryOrders = []; } catch(e) {}
    try { if (typeof outlets !== 'undefined') outlets = []; } catch(e) {}
    try { if (typeof employees !== 'undefined') employees = []; } catch(e) {}
    try { if (typeof payrollRecords !== 'undefined') payrollRecords = []; } catch(e) {}
    try { if (typeof kpiTemplates !== 'undefined') kpiTemplates = []; } catch(e) {}
    try { if (typeof kpiAssignments !== 'undefined') kpiAssignments = []; } catch(e) {}
    try { if (typeof kpiScores !== 'undefined') kpiScores = []; } catch(e) {}
    try { if (typeof leaveRequests !== 'undefined') leaveRequests = []; } catch(e) {}
    try { if (typeof leaveBalances !== 'undefined') leaveBalances = []; } catch(e) {}
    try { if (typeof attendanceRecords !== 'undefined') attendanceRecords = []; } catch(e) {}
    
    // Reset Chart of Accounts & Journal Entries
    window.chartOfAccounts = [];
    window.journalEntries = [];
    try { if (typeof chartOfAccounts !== 'undefined') chartOfAccounts = []; } catch(e) {}
    try { if (typeof journalEntries !== 'undefined') journalEntries = []; } catch(e) {}
    try { if (typeof journalSequence !== 'undefined') journalSequence = { year: new Date().getFullYear(), sequence: 0 }; } catch(e) {}
    
    // Reset CRM customers
    window.crmCustomers = [];
    try { if (typeof crmCustomers !== 'undefined') crmCustomers = []; } catch(e) {}
    
    // CRITICAL: Clear ALL legacy localStorage keys to prevent stale data
    // These will be repopulated with correct tenant data in loadUserTenantData()
    localStorage.setItem('ezcubic_products', '[]');
    localStorage.setItem('ezcubic_customers', '[]');
    localStorage.setItem('ezcubic_suppliers', '[]');
    localStorage.setItem('ezcubic_branches', '[]');
    localStorage.setItem('ezcubic_quotations', '[]');
    localStorage.setItem('ezcubic_projects', '[]');
    localStorage.setItem('ezcubic_purchase_orders', '[]');
    localStorage.setItem('ezcubic_goods_receipts', '[]');
    localStorage.setItem('ezcubic_stock_movements', '[]');
    localStorage.setItem('ezcubic_sales', '[]');
    localStorage.setItem('ezcubic_delivery_orders', '[]');
    localStorage.setItem('ezcubic_outlets', '[]');
    
    // HR & Payroll keys
    localStorage.setItem('ezcubic_employees', '[]');
    localStorage.setItem('ezcubic_payroll', '[]');
    localStorage.setItem('ezcubic_kpi_templates', '[]');
    localStorage.setItem('ezcubic_kpi_assignments', '[]');
    localStorage.setItem('ezcubic_kpi_scores', '[]');
    localStorage.setItem('ezcubic_leave_requests', '[]');
    localStorage.setItem('ezcubic_leave_balances', '[]');
    localStorage.setItem('ezcubic_attendance', '[]');
    
    // Accounting & Finance keys
    localStorage.setItem('ezcubic_transactions', '[]');
    localStorage.setItem('ezcubic_bills', '[]');
    localStorage.setItem('ezcubic_orders', '[]');
    localStorage.setItem('ezcubic_invoices', '[]');
    localStorage.setItem('ezcubic_bank_accounts', '[]');
    localStorage.setItem('ezcubic_credit_cards', '[]');
    localStorage.setItem('ezcubic_manual_balances', '{}');
    
    // Chart of Accounts & Journal Entries keys
    localStorage.setItem('ezcubic_chart_of_accounts', '[]');
    localStorage.setItem('ezcubic_journal_entries', '[]');
    localStorage.setItem('ezcubic_journal_sequence', JSON.stringify({ year: new Date().getFullYear(), sequence: 0 }));
    
    // POS keys
    localStorage.setItem('ezcubic_held_sales', '[]');
    localStorage.setItem('ezcubic_pos_receipts', '[]');
    
    // Inventory keys  
    localStorage.setItem('ezcubic_inventory', '[]');
    
    // CRM keys
    localStorage.setItem('ezcubic_crm_customers', '[]');
    
    // E-Invoice settings
    localStorage.setItem('ezcubic_einvoice_settings', '{}');
    
    // AI assistant state
    localStorage.setItem('ezcubic_ai_state', '{}');
    
    localStorage.setItem('ezcubicDataMY', JSON.stringify({
        transactions: [],
        bills: [],
        settings: defaultSettings,
        version: '2.0',
        lastSaved: new Date().toISOString()
    }));
    
    console.log('All data reset complete');
}

// Expose to window
window.resetToEmptyData = resetToEmptyData;

// ==================== MODULE INFO ====================

console.log('✅ Tenant module loaded (v2028010)');
console.log('   Functions: generateCompanyCode, migrateFounderData, downloadTenantInfoFromCloud,');
console.log('              downloadTenantFromCloud, loadUserTenantData, initializeEmptyTenantData,');
console.log('              syncTenantDataToCloud, resetToEmptyData, resetWindowArraysOnly');
