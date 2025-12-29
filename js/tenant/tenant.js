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
    // Fallback: Create client directly
    if (window.supabase?.createClient) {
        return window.supabase.createClient(
            'https://cfwvxvogrkbntfrnwpkl.supabase.co',
            'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNmd3Z4dm9ncmtibnRmcm53cGtsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzU1NTg4OTIsImV4cCI6MjA1MTEzNDg5Mn0.kpPWiXqn8cq0PXn5Qql6vfXmvsjGpTSjM-jfM-Tp_PE'
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
            const tenantData = data.data.value;
            localStorage.setItem('ezcubic_tenant_' + tenantId, JSON.stringify(tenantData));
            console.log('☁️ Downloaded full tenant data:', tenantId);
            
            // Also extract to individual localStorage keys for immediate availability
            // This ensures customers, products, etc. are ready when modules initialize
            if (tenantData.customers?.length) {
                localStorage.setItem('ezcubic_customers', JSON.stringify(tenantData.customers));
                console.log('  ↳ Extracted', tenantData.customers.length, 'customers');
            }
            if (tenantData.products?.length) {
                localStorage.setItem('ezcubic_products', JSON.stringify(tenantData.products));
                console.log('  ↳ Extracted', tenantData.products.length, 'products');
            }
            if (tenantData.crmCustomers?.length) {
                localStorage.setItem('ezcubic_crm_customers', JSON.stringify(tenantData.crmCustomers));
                console.log('  ↳ Extracted', tenantData.crmCustomers.length, 'CRM customers');
            }
            if (tenantData.suppliers?.length) {
                localStorage.setItem('ezcubic_suppliers', JSON.stringify(tenantData.suppliers));
                console.log('  ↳ Extracted', tenantData.suppliers.length, 'suppliers');
            }
            if (tenantData.quotations?.length) {
                localStorage.setItem('ezcubic_quotations', JSON.stringify(tenantData.quotations));
                console.log('  ↳ Extracted', tenantData.quotations.length, 'quotations');
            }
            if (tenantData.projects?.length) {
                localStorage.setItem('ezcubic_projects', JSON.stringify(tenantData.projects));
                console.log('  ↳ Extracted', tenantData.projects.length, 'projects');
            }
            if (tenantData.transactions?.length) {
                localStorage.setItem('ezcubic_transactions', JSON.stringify(tenantData.transactions));
                console.log('  ↳ Extracted', tenantData.transactions.length, 'transactions');
            }
            if (tenantData.sales?.length) {
                localStorage.setItem('ezcubic_sales', JSON.stringify(tenantData.sales));
                console.log('  ↳ Extracted', tenantData.sales.length, 'sales');
            }
            if (tenantData.orders?.length) {
                localStorage.setItem('ezcubic_orders', JSON.stringify(tenantData.orders));
                console.log('  ↳ Extracted', tenantData.orders.length, 'orders');
            }
            if (tenantData.stockMovements?.length) {
                localStorage.setItem('ezcubic_stock_movements', JSON.stringify(tenantData.stockMovements));
                console.log('  ↳ Extracted', tenantData.stockMovements.length, 'stock movements');
            }
            if (tenantData.employees?.length) {
                localStorage.setItem('ezcubic_employees', JSON.stringify(tenantData.employees));
                console.log('  ↳ Extracted', tenantData.employees.length, 'employees');
            }
            if (tenantData.branches?.length) {
                localStorage.setItem('ezcubic_branches', JSON.stringify(tenantData.branches));
                console.log('  ↳ Extracted', tenantData.branches.length, 'branches');
            }
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
 */
function loadUserTenantData(user) {
    console.log('loadUserTenantData called for user:', user?.email, 'tenantId:', user?.tenantId);
    
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
        // Create tenant for existing user without one
        if (user) {
            const tenantId = 'tenant_' + Date.now();
            user.tenantId = tenantId;
            initializeEmptyTenantData(tenantId, user.name);
            // Save users - call window.saveUsers if available
            if (typeof window.saveUsers === 'function') {
                window.saveUsers();
            }
        }
        window._isLoadingUserData = false;
        return;
    }
    
    // Check if we're loading the SAME tenant (page refresh) vs DIFFERENT tenant (user switch)
    const lastLoadedTenant = localStorage.getItem('ezcubic_last_tenant_id');
    const isSameTenant = lastLoadedTenant === user.tenantId;
    
    // Store current tenant ID for future comparisons
    localStorage.setItem('ezcubic_last_tenant_id', user.tenantId);
    
    const tenantKey = 'ezcubic_tenant_' + user.tenantId;
    const tenantData = JSON.parse(localStorage.getItem(tenantKey) || 'null');
    
    console.log('Loading tenant data from key:', tenantKey);
    console.log('Is same tenant (page refresh):', isSameTenant);
    console.log('Tenant data found:', tenantData ? 'Yes' : 'No');
    if (tenantData) {
        console.log('Tenant data products:', tenantData.products?.length || 0);
        console.log('Tenant data customers:', tenantData.customers?.length || 0);
        console.log('Tenant data CRM customers:', tenantData.crmCustomers?.length || 0);
        console.log('Tenant data suppliers:', tenantData.suppliers?.length || 0);
        console.log('Tenant data quotations:', tenantData.quotations?.length || 0);
    }
    
    // ONLY reset data if switching to a DIFFERENT tenant
    // If same tenant (page refresh), preserve localStorage data
    if (!isSameTenant) {
        console.log('Different tenant - resetting data');
        resetToEmptyData();
    } else {
        console.log('Same tenant (page refresh) - preserving localStorage, only resetting window arrays');
        // Just reset window arrays but NOT localStorage
        resetWindowArraysOnly();
    }
    
    if (tenantData) {
        console.log('Loading tenant data for:', user.tenantId);
        
        // SMART MERGE: For page refresh, localStorage might have newer data
        // Prefer localStorage if it has more items than tenant data
        const mergeWithLocalStorage = (tenantArray, localStorageKey) => {
            const localData = JSON.parse(localStorage.getItem(localStorageKey) || '[]');
            const tenantLen = (tenantArray || []).length;
            const localLen = localData.length;
            console.log(`🔀 Merge ${localStorageKey}: tenant=${tenantLen}, localStorage=${localLen}`);
            // If localStorage has more data OR tenant is empty, use localStorage
            if (localLen > tenantLen || tenantLen === 0) {
                console.log(`🔀 Using localStorage for ${localStorageKey}: ${localLen} items (tenant had ${tenantLen})`);
                return localData;
            }
            console.log(`🔀 Using tenant for ${localStorageKey}: ${tenantLen} items (localStorage had ${localLen})`);
            return tenantArray || [];
        };
        
        // Get merged data - prefer localStorage when it has more items
        const mergedProducts = mergeWithLocalStorage(tenantData.products, 'ezcubic_products');
        const mergedCustomers = mergeWithLocalStorage(tenantData.customers, 'ezcubic_customers');
        const mergedSuppliers = mergeWithLocalStorage(tenantData.suppliers, 'ezcubic_suppliers');
        const mergedBranches = mergeWithLocalStorage(tenantData.branches, 'ezcubic_branches');
        const mergedQuotations = mergeWithLocalStorage(tenantData.quotations, 'ezcubic_quotations');
        const mergedProjects = mergeWithLocalStorage(tenantData.projects, 'ezcubic_projects');
        const mergedCRMCustomers = mergeWithLocalStorage(tenantData.crmCustomers, 'ezcubic_crm_customers');
        const mergedEmployees = mergeWithLocalStorage(tenantData.employees, 'ezcubic_employees');
        const mergedStockMovements = mergeWithLocalStorage(tenantData.stockMovements, 'ezcubic_stock_movements');
        const mergedSales = mergeWithLocalStorage(tenantData.sales, 'ezcubic_sales');
        const mergedOrders = mergeWithLocalStorage(tenantData.orders, 'ezcubic_orders');
        const mergedPurchaseOrders = mergeWithLocalStorage(tenantData.purchaseOrders, 'ezcubic_purchase_orders');
        
        // CRITICAL: Also check ezcubicDataMY for transactions - this is where saveData() saves them
        const ezcubicDataMY = JSON.parse(localStorage.getItem('ezcubicDataMY') || '{}');
        const localTransactions = ezcubicDataMY.transactions || [];
        const tenantTransactions = tenantData.transactions || [];
        // Use whichever has more transactions (newer data)
        const mergedTransactions = localTransactions.length > tenantTransactions.length ? localTransactions : tenantTransactions;
        console.log(`🔵 Transactions merge: local=${localTransactions.length}, tenant=${tenantTransactions.length}, using=${mergedTransactions.length}`);
        
        // DEBUG: Show actual transaction data
        if (mergedTransactions.length > 0) {
            console.log('🔵 First transaction:', mergedTransactions[0]);
        }
        
        const localBills = ezcubicDataMY.bills || [];
        const tenantBills = tenantData.bills || [];
        const mergedBills = localBills.length > tenantBills.length ? localBills : tenantBills;
        
        // Map merged data to global businessData - use window.businessData for cross-module access
        console.log('🔵 loadUserTenantData: Setting businessData.transactions to', mergedTransactions.length, 'items');
        console.log('🔵 window.businessData exists?', typeof window.businessData !== 'undefined');
        
        // FORCE create window.businessData if it doesn't exist
        if (typeof window.businessData === 'undefined' || !window.businessData) {
            console.log('🔵 Creating window.businessData');
            window.businessData = {
                transactions: [],
                bills: [],
                settings: {}
            };
        }
        
        // Now set the data
        window.businessData.transactions = mergedTransactions;
        window.businessData.bills = mergedBills;
        window.businessData.products = mergedProducts;
        window.businessData.customers = mergedCustomers;
        window.businessData.stockMovements = mergedStockMovements;
        window.businessData.sales = mergedSales;
        window.businessData.suppliers = mergedSuppliers;
        window.businessData.branches = mergedBranches;
        window.businessData.quotations = mergedQuotations;
        window.businessData.projects = mergedProjects;
        window.businessData.purchaseOrders = mergedPurchaseOrders;
        window.businessData.deliveryOrders = tenantData.deliveryOrders || [];
        
        // Get default settings function
        const getDefaultSettings = typeof window.getDefaultSettings === 'function' 
            ? window.getDefaultSettings 
            : () => ({ businessName: 'My Business', currency: 'MYR', defaultTaxRate: 0 });
        
        if (tenantData.settings) {
            window.businessData.settings = { ...getDefaultSettings(), ...tenantData.settings };
        }
        
        // Also update the local businessData reference if it exists
        if (typeof businessData !== 'undefined') {
            businessData = window.businessData;
        }
        
        console.log('🔵 After setting window.businessData.transactions:', window.businessData.transactions.length);
        
        // Update global arrays with merged data
        window.transactions = mergedTransactions;
        window.products = mergedProducts;
        window.customers = mergedCustomers;
        window.stockMovements = mergedStockMovements;
        window.sales = mergedSales;
        window.suppliers = mergedSuppliers;
        window.branches = mergedBranches;
        console.log('🔵 SET window.branches to', mergedBranches.length, 'items');
        window.branchTransfers = tenantData.branchTransfers || [];
        window.quotations = mergedQuotations;
        window.projects = mergedProjects;
        window.purchaseOrders = mergedPurchaseOrders;
        window.goodsReceipts = tenantData.goodsReceipts || [];
        window.deliveryOrders = tenantData.deliveryOrders || [];
        window.crmCustomers = mergedCRMCustomers;
        window.employees = mergedEmployees;
        window.orders = mergedOrders;
        
        // Also update local module variables directly
        if (typeof products !== 'undefined') products = mergedProducts;
        if (typeof customers !== 'undefined') customers = mergedCustomers;
        if (typeof stockMovements !== 'undefined') stockMovements = mergedStockMovements;
        if (typeof sales !== 'undefined') sales = mergedSales;
        if (typeof transactions !== 'undefined') transactions = mergedTransactions;
        if (typeof suppliers !== 'undefined') suppliers = mergedSuppliers;
        if (typeof branches !== 'undefined') branches = mergedBranches;
        if (typeof branchTransfers !== 'undefined') branchTransfers = tenantData.branchTransfers || [];
        if (typeof quotations !== 'undefined') quotations = mergedQuotations;
        if (typeof projects !== 'undefined') projects = mergedProjects;
        if (typeof purchaseOrders !== 'undefined') purchaseOrders = mergedPurchaseOrders;
        if (typeof goodsReceipts !== 'undefined') goodsReceipts = tenantData.goodsReceipts || [];
        if (typeof deliveryOrders !== 'undefined') deliveryOrders = tenantData.deliveryOrders || [];
        if (typeof crmCustomers !== 'undefined') crmCustomers = mergedCRMCustomers;
        if (typeof orders !== 'undefined') orders = mergedOrders;
        
        // HR & Payroll module variables
        // Check if localStorage has data but tenant doesn't - recover from localStorage
        const localEmployees = JSON.parse(localStorage.getItem('ezcubic_employees') || '[]');
        const localPayroll = JSON.parse(localStorage.getItem('ezcubic_payroll') || '[]');
        
        // Use tenant data if available, otherwise fall back to localStorage (data recovery)
        const employeesToUse = (tenantData.employees && tenantData.employees.length > 0) 
            ? tenantData.employees 
            : localEmployees;
        const payrollToUse = (tenantData.payrollRecords && tenantData.payrollRecords.length > 0) 
            ? tenantData.payrollRecords 
            : localPayroll;
        
        window.employees = employeesToUse;
        window.payrollRecords = payrollToUse;
        if (typeof employees !== 'undefined') employees = employeesToUse;
        if (typeof payrollRecords !== 'undefined') payrollRecords = payrollToUse;
        if (typeof kpiTemplates !== 'undefined') kpiTemplates = tenantData.kpiTemplates || [];
        if (typeof kpiAssignments !== 'undefined') kpiAssignments = tenantData.kpiAssignments || [];
        if (typeof kpiScores !== 'undefined') kpiScores = tenantData.kpiScores || [];
        if (typeof leaveRequests !== 'undefined') leaveRequests = tenantData.leaveRequests || [];
        if (typeof leaveBalances !== 'undefined') leaveBalances = tenantData.leaveBalances || [];
        if (typeof attendanceRecords !== 'undefined') attendanceRecords = tenantData.attendanceRecords || [];
        
        // If we recovered data from localStorage, save it to tenant storage
        if (localEmployees.length > 0 && (!tenantData.employees || tenantData.employees.length === 0)) {
            console.log('🔄 Recovered', localEmployees.length, 'employees from localStorage - saving to tenant');
            tenantData.employees = localEmployees;
            // Will be saved later
        }
        if (localPayroll.length > 0 && (!tenantData.payrollRecords || tenantData.payrollRecords.length === 0)) {
            console.log('🔄 Recovered', localPayroll.length, 'payroll records from localStorage - saving to tenant');
            tenantData.payrollRecords = localPayroll;
        }
        
        // Save to legacy storage keys for compatibility with modules
        // Use merged data (which already prefers localStorage when it has more items)
        localStorage.setItem('ezcubic_products', JSON.stringify(mergedProducts));
        localStorage.setItem('ezcubic_customers', JSON.stringify(mergedCustomers));
        localStorage.setItem('ezcubic_suppliers', JSON.stringify(mergedSuppliers));
        localStorage.setItem('ezcubic_branches', JSON.stringify(mergedBranches));
        localStorage.setItem('ezcubic_branch_transfers', JSON.stringify(tenantData.branchTransfers || []));
        localStorage.setItem('ezcubic_quotations', JSON.stringify(mergedQuotations));
        localStorage.setItem('ezcubic_projects', JSON.stringify(mergedProjects));
        localStorage.setItem('ezcubic_purchase_orders', JSON.stringify(mergedPurchaseOrders));
        localStorage.setItem('ezcubic_goods_receipts', JSON.stringify(tenantData.goodsReceipts || []));
        window.goodsReceipts = tenantData.goodsReceipts || [];
        localStorage.setItem('ezcubic_stock_movements', JSON.stringify(mergedStockMovements));
        localStorage.setItem('ezcubic_sales', JSON.stringify(mergedSales));
        localStorage.setItem('ezcubic_delivery_orders', JSON.stringify(tenantData.deliveryOrders || []));
        localStorage.setItem('ezcubic_crm_customers', JSON.stringify(mergedCRMCustomers));
        localStorage.setItem('ezcubic_orders', JSON.stringify(mergedOrders));
        
        // HR & Payroll storage keys - use the recovered/merged data
        localStorage.setItem('ezcubic_employees', JSON.stringify(employeesToUse));
        localStorage.setItem('ezcubic_payroll', JSON.stringify(payrollToUse));
        localStorage.setItem('ezcubic_kpi_templates', JSON.stringify(tenantData.kpiTemplates || []));
        localStorage.setItem('ezcubic_kpi_assignments', JSON.stringify(tenantData.kpiAssignments || []));
        localStorage.setItem('ezcubic_kpi_scores', JSON.stringify(tenantData.kpiScores || []));
        localStorage.setItem('ezcubic_leave_requests', JSON.stringify(tenantData.leaveRequests || []));
        localStorage.setItem('ezcubic_leave_balances', JSON.stringify(tenantData.leaveBalances || []));
        localStorage.setItem('ezcubic_attendance', JSON.stringify(tenantData.attendanceRecords || []));
        
        // If we recovered employees from localStorage, save updated tenant data immediately
        if (localEmployees.length > 0 && (!tenantData.employees || tenantData.employees.length === 0)) {
            tenantData.employees = localEmployees;
            localStorage.setItem(tenantKey, JSON.stringify(tenantData));
            console.log('✅ Saved recovered employee data to tenant storage');
        }
        
        // Accounting & Finance storage keys
        localStorage.setItem('ezcubic_transactions', JSON.stringify(tenantData.transactions || []));
        localStorage.setItem('ezcubic_bills', JSON.stringify(tenantData.bills || []));
        localStorage.setItem('ezcubic_orders', JSON.stringify(tenantData.orders || []));
        localStorage.setItem('ezcubic_invoices', JSON.stringify(tenantData.invoices || []));
        localStorage.setItem('ezcubic_bank_accounts', JSON.stringify(tenantData.bankAccounts || []));
        localStorage.setItem('ezcubic_credit_cards', JSON.stringify(tenantData.creditCards || []));
        localStorage.setItem('ezcubic_manual_balances', JSON.stringify(tenantData.manualBalances || {}));
        
        // Chart of Accounts & Journal Entries
        localStorage.setItem('ezcubic_chart_of_accounts', JSON.stringify(tenantData.chartOfAccounts || []));
        localStorage.setItem('ezcubic_journal_entries', JSON.stringify(tenantData.journalEntries || []));
        localStorage.setItem('ezcubic_journal_sequence', JSON.stringify(tenantData.journalSequence || { year: new Date().getFullYear(), sequence: 0 }));
        
        // POS
        localStorage.setItem('ezcubic_held_sales', JSON.stringify(tenantData.heldSales || []));
        localStorage.setItem('ezcubic_pos_receipts', JSON.stringify(tenantData.posReceipts || []));
        
        // E-Invoice
        localStorage.setItem('ezcubic_einvoice_settings', JSON.stringify(tenantData.einvoiceSettings || {}));
        
        // Outlets
        localStorage.setItem('ezcubic_outlets', JSON.stringify(tenantData.outlets || []));
        
        // AI Assistant
        localStorage.setItem('ezcubic_ai_state', JSON.stringify(tenantData.aiState || {}));
        
        // Save ezcubicDataMY with transactions and bills
        const ezcubicData = {
            transactions: mergedTransactions,
            bills: mergedBills,
            settings: tenantData.settings || {},
            version: '2.0',
            lastSaved: new Date().toISOString()
        };
        localStorage.setItem('ezcubicDataMY', JSON.stringify(ezcubicData));
        
    } else {
        // No tenant data found - initialize empty tenant
        console.log('No tenant data found - initializing empty tenant');
        initializeEmptyTenantData(user.tenantId, user.name);
    }
    
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
