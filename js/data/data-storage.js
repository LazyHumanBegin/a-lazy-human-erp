/**
 * EZCubic Smart Accounting - Data Storage Module
 * Core data persistence: load, save, backup, restore, tenant sync
 * Split from data.js for v2.3.1
 */

// FULL BACKUP - exports ALL business data including products, customers, sales, projects, etc.
function exportFullBackup() {
    try {
        const user = window.currentUser;
        const tenantId = user?.tenantId || 'tenant_founder';
        const tenantKey = 'ezcubic_tenant_' + tenantId;
        
        // Gather ALL data from tenant storage OR from individual keys (using safe functions)
        const fullBackup = {
            version: APP_VERSION,
            exportDate: new Date().toISOString(),
            tenantId: tenantId,
            // Core accounting
            transactions: businessData.transactions || [],
            bills: businessData.bills || [],
            settings: businessData.settings || {},
            // Products & Inventory
            products: window.products || safeLocalStorageGet('ezcubic_products', []),
            stockMovements: window.stockMovements || safeLocalStorageGet('ezcubic_stock_movements', []),
            // CRM
            customers: window.customers || safeLocalStorageGet('ezcubic_customers', []),
            suppliers: window.suppliers || safeLocalStorageGet('ezcubic_suppliers', []),
            // Sales & Orders
            sales: window.sales || safeLocalStorageGet('ezcubic_sales', []),
            // Business modules
            quotations: window.quotations || safeLocalStorageGet('ezcubic_quotations', []),
            projects: window.projects || safeLocalStorageGet('ezcubic_projects', []),
            purchaseOrders: window.purchaseOrders || safeLocalStorageGet('ezcubic_purchase_orders', []),
            deliveryOrders: window.deliveryOrders || safeLocalStorageGet('ezcubic_delivery_orders', []),
            // Branches
            branches: window.branches || safeLocalStorageGet('ezcubic_branches', []),
            // HR & Payroll
            employees: window.employees || safeLocalStorageGet('ezcubic_employees', []),
            payrollRecords: window.payrollRecords || safeLocalStorageGet('ezcubic_payroll', []),
            kpiTemplates: window.kpiTemplates || safeLocalStorageGet('ezcubic_kpi_templates', []),
            kpiAssignments: window.kpiAssignments || safeLocalStorageGet('ezcubic_kpi_assignments', []),
            kpiScores: window.kpiScores || safeLocalStorageGet('ezcubic_kpi_scores', []),
            leaveRequests: window.leaveRequests || safeLocalStorageGet('ezcubic_leave_requests', []),
            leaveBalances: window.leaveBalances || safeLocalStorageGet('ezcubic_leave_balances', []),
            attendanceRecords: window.attendanceRecords || safeLocalStorageGet('ezcubic_attendance', [])
        };
        
        const dataStr = JSON.stringify(fullBackup, null, 2);
        const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
        
        const businessName = (businessData.settings?.businessName || 'A-Lazy-Human').replace(/\s+/g, '-');
        const exportFileName = `${businessName}-FULL-backup-${new Date().toISOString().slice(0,10)}.json`;
        
        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', exportFileName);
        linkElement.click();
        
        showToast('Full backup exported successfully!', 'success');
        console.log('Full backup exported:', {
            transactions: fullBackup.transactions.length,
            products: fullBackup.products.length,
            customers: fullBackup.customers.length,
            sales: fullBackup.sales.length,
            quotations: fullBackup.quotations.length,
            projects: fullBackup.projects.length
        });
    } catch (error) {
        console.error('Full backup export failed:', error);
        showToast('Failed to export full backup', 'error');
    }
}

// FULL IMPORT - restores ALL business data
function importFullBackup(file) {
    if (!file) {
        // Create file input if not provided
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = (e) => {
            if (e.target.files[0]) {
                importFullBackup(e.target.files[0]);
            }
        };
        input.click();
        return;
    }
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const backup = JSON.parse(e.target.result);
            
            // Validate backup structure
            if (!backup.version || !backup.exportDate) {
                throw new Error('Invalid backup file format - missing version or exportDate');
            }
            
            // Validate data arrays
            const validateArray = (data, name) => {
                if (data && !Array.isArray(data)) {
                    console.warn(`Import warning: ${name} is not an array, using empty array`);
                    return [];
                }
                return data || [];
            };
            
            // Sanitize backup data
            backup.transactions = validateArray(backup.transactions, 'transactions');
            backup.products = validateArray(backup.products, 'products');
            backup.customers = validateArray(backup.customers, 'customers');
            backup.sales = validateArray(backup.sales, 'sales');
            backup.quotations = validateArray(backup.quotations, 'quotations');
            backup.projects = validateArray(backup.projects, 'projects');
            backup.employees = validateArray(backup.employees, 'employees');
            backup.bills = validateArray(backup.bills, 'bills');
            
            if (!confirm(`This will restore backup from ${backup.exportDate}.\n\nThis includes:\n- ${backup.transactions?.length || 0} transactions\n- ${backup.products?.length || 0} products\n- ${backup.customers?.length || 0} customers\n- ${backup.sales?.length || 0} sales\n- ${backup.quotations?.length || 0} quotations\n- ${backup.projects?.length || 0} projects\n\nExisting data will be replaced. Continue?`)) {
                return;
            }
            
            // Create auto-backup before import
            if (typeof createAutoBackup === 'function') {
                createAutoBackup('before_import');
                console.log('Auto-backup created before import');
            }
            
            // Restore to businessData
            businessData.transactions = backup.transactions || [];
            businessData.bills = backup.bills || [];
            businessData.settings = backup.settings || getDefaultSettings();
            
            // Restore to global arrays
            window.products = products = backup.products || [];
            window.customers = customers = backup.customers || [];
            window.stockMovements = stockMovements = backup.stockMovements || [];
            window.sales = sales = backup.sales || [];
            window.suppliers = suppliers = backup.suppliers || [];
            window.branches = branches = backup.branches || [];
            window.quotations = quotations = backup.quotations || [];
            window.projects = projects = backup.projects || [];
            window.purchaseOrders = purchaseOrders = backup.purchaseOrders || [];
            window.deliveryOrders = deliveryOrders = backup.deliveryOrders || [];
            
            // Save to localStorage keys using safe function
            safeLocalStorageSet('ezcubic_products', backup.products || []);
            safeLocalStorageSet('ezcubic_customers', backup.customers || []);
            safeLocalStorageSet('ezcubic_suppliers', backup.suppliers || []);
            safeLocalStorageSet('ezcubic_branches', backup.branches || []);
            safeLocalStorageSet('ezcubic_quotations', backup.quotations || []);
            safeLocalStorageSet('ezcubic_projects', backup.projects || []);
            safeLocalStorageSet('ezcubic_purchase_orders', backup.purchaseOrders || []);
            safeLocalStorageSet('ezcubic_stock_movements', backup.stockMovements || []);
            safeLocalStorageSet('ezcubic_sales', backup.sales || []);
            safeLocalStorageSet('ezcubic_delivery_orders', backup.deliveryOrders || []);
            
            // Save to tenant storage
            saveData();
            saveToUserTenant();
            
            // Refresh all UI
            if (typeof updateDashboard === 'function') updateDashboard();
            if (typeof renderProducts === 'function') renderProducts();
            if (typeof renderCustomers === 'function') renderCustomers();
            if (typeof renderOrders === 'function') renderOrders();
            if (typeof renderQuotations === 'function') renderQuotations();
            if (typeof renderProjects === 'function') renderProjects();
            
            showToast('Full backup restored successfully!', 'success');
            console.log('Full backup restored');
            
        } catch (error) {
            console.error('Error importing backup:', error);
            showToast('Error importing backup: ' + error.message, 'error');
        }
    };
    
    reader.readAsText(file);
}

// Fallback function to save data directly to localStorage when tenant not available
function saveDirectToLocalStorage() {
    try {
        console.log('Saving directly to localStorage...');
        
        // Save all module data to their respective localStorage keys
        safeLocalStorageSet('ezcubic_products', window.products || []);
        safeLocalStorageSet('ezcubic_customers', window.customers || []);
        safeLocalStorageSet('ezcubic_suppliers', window.suppliers || []);
        safeLocalStorageSet('ezcubic_crm_customers', window.crmCustomers || []);
        safeLocalStorageSet('ezcubic_quotations', window.quotations || []);
        safeLocalStorageSet('ezcubic_projects', window.projects || []);
        safeLocalStorageSet('ezcubic_stock_movements', window.stockMovements || []);
        safeLocalStorageSet('ezcubic_branches', window.branches || []);
        safeLocalStorageSet('ezcubic_branch_transfers', window.branchTransfers || []);
        safeLocalStorageSet('ezcubic_purchase_orders', window.purchaseOrders || []);
        safeLocalStorageSet('ezcubic_goods_receipts', window.goodsReceipts || []);
        safeLocalStorageSet('ezcubic_delivery_orders', window.deliveryOrders || []);
        safeLocalStorageSet('ezcubic_orders', window.orders || []);
        safeLocalStorageSet('ezcubic_invoices', window.invoices || []);
        safeLocalStorageSet('ezcubic_employees', window.employees || []);
        safeLocalStorageSet('ezcubic_payroll', window.payrollRecords || []);
        safeLocalStorageSet('ezcubic_sales', window.sales || []);
        
        console.log('✅ Data saved directly to localStorage');
    } catch (error) {
        console.error('Error saving directly to localStorage:', error);
    }
}

function loadData() {
    try {
        // Use safe localStorage getter
        const savedData = safeLocalStorageGet('ezcubicDataMY', null);
        if (savedData) {
            businessData = savedData;
            
            if (!businessData.settings) {
                businessData.settings = getDefaultSettings();
            }
            
            if (!businessData.transactions) businessData.transactions = [];
            if (!businessData.bills) businessData.bills = [];
            
            console.log('EZCubic Malaysia data loaded successfully');
        }
        
        // Sync global references for Phase 2 modules
        transactions = businessData.transactions || [];
        settings = businessData.settings || {};
        
    } catch (error) {
        console.error('Error loading data:', error);
        showNotification('Error loading saved data. Using default settings.', 'error');
        businessData = {
            transactions: [],
            bills: [],
            settings: getDefaultSettings()
        };
        transactions = [];
        settings = businessData.settings;
    }
}

function saveData() {
    try {
        // PROTECTION: Don't save if we're in the middle of switching users
        // This prevents empty data from overwriting tenant storage
        if (window._isLoadingUserData) {
            console.log('Skipping save - user data is being loaded');
            return false; // Return false to indicate save was skipped
        }
        
        // Ensure global transactions reference is synced with businessData
        // This handles cases where modules push to global 'transactions' array
        if (typeof transactions !== 'undefined' && transactions !== businessData.transactions) {
            // Merge any transactions that might be in global but not in businessData
            transactions.forEach(tx => {
                if (!businessData.transactions.find(bt => bt.id === tx.id)) {
                    businessData.transactions.push(tx);
                }
            });
            // Re-sync the reference
            transactions = businessData.transactions;
        }
        
        const dataToSave = {
            transactions: businessData.transactions,
            bills: businessData.bills,
            settings: businessData.settings,
            version: '2.0',
            lastSaved: new Date().toISOString()
        };
        
        // Use safe localStorage setter
        if (!safeLocalStorageSet('ezcubicDataMY', dataToSave)) {
            return false; // Storage failed (quota exceeded, etc.)
        }
        
        // Also save to user's tenant storage if logged in
        saveToUserTenant();
        
        console.log('EZCubic Malaysia data saved successfully');
        return true;
    } catch (error) {
        console.error('Error saving data:', error);
        showNotification('Error saving data. Please try again.', 'error');
        return false;
    }
}

// Helper: Only update if new data has items OR existing is empty
// This prevents overwriting good data with empty arrays
function smartMerge(existingData, newData, dataName) {
    const existingLen = Array.isArray(existingData) ? existingData.length : 0;
    const newLen = Array.isArray(newData) ? newData.length : 0;
    
    // If new data has items, use it
    if (newLen > 0) {
        return newData;
    }
    // If new data is empty but existing has data, KEEP existing
    if (existingLen > 0) {
        console.log(`Preserving existing ${dataName}: ${existingLen} items`);
        return existingData;
    }
    // Both empty, return empty array
    return [];
}

// Save data to current user's tenant storage
// CRITICAL: This function now PRESERVES existing tenant data when new data is empty
function saveToUserTenant() {
    // PROTECTION: Don't save if we're in the middle of switching users
    if (window._isLoadingUserData) {
        console.log('Skipping tenant save - user data is being loaded');
        return;
    }
    
    const user = window.currentUser;
    if (!user || !user.tenantId) {
        console.log('saveToUserTenant: No user or tenantId - saving to localStorage directly');
        // FALLBACK: Still save to localStorage when no tenant
        saveDirectToLocalStorage();
        return;
    }
    
    const tenantKey = 'ezcubic_tenant_' + user.tenantId;
    let tenantData = safeLocalStorageGet(tenantKey, {});
    
    // DEBUG: Log what we're about to save
    console.log('saveToUserTenant DEBUG:', {
        tenantKey: tenantKey,
        existingCRMCustomers: tenantData.crmCustomers?.length || 0,
        existingCustomers: tenantData.customers?.length || 0,
        existingProducts: tenantData.products?.length || 0,
        existingBranches: tenantData.branches?.length || 0
    });
    
    // Update tenant data with smart merge - preserves existing when new is empty
    tenantData.transactions = smartMerge(tenantData.transactions, businessData.transactions || window.transactions, 'transactions');
    tenantData.bills = smartMerge(tenantData.bills, businessData.bills, 'bills');
    
    // Products
    const localProducts = safeLocalStorageGet('ezcubic_products', []);
    const newProducts = localProducts.length > 0 ? localProducts : (window.products || []);
    tenantData.products = smartMerge(tenantData.products, newProducts, 'products');
    
    // Customers (regular)
    const localCustomers = safeLocalStorageGet('ezcubic_customers', []);
    const newCustomers = localCustomers.length > 0 ? localCustomers : (window.customers || []);
    tenantData.customers = smartMerge(tenantData.customers, newCustomers, 'customers');
    
    // Stock movements
    const newStockMovements = window.stockMovements || safeLocalStorageGet('ezcubic_stock_movements', []);
    tenantData.stockMovements = smartMerge(tenantData.stockMovements, newStockMovements, 'stockMovements');
    
    // Sales
    const newSales = window.sales || safeLocalStorageGet('ezcubic_sales', []);
    tenantData.sales = smartMerge(tenantData.sales, newSales, 'sales');
    
    // Suppliers
    const localSuppliers = safeLocalStorageGet('ezcubic_suppliers', []);
    const newSuppliers = localSuppliers.length > 0 ? localSuppliers : (window.suppliers || []);
    tenantData.suppliers = smartMerge(tenantData.suppliers, newSuppliers, 'suppliers');
    
    // Branches
    const newBranches = window.branches || safeLocalStorageGet('ezcubic_branches', []);
    tenantData.branches = smartMerge(tenantData.branches, newBranches, 'branches');
    
    // Branch transfers
    const newBranchTransfers = window.branchTransfers || safeLocalStorageGet('ezcubic_branch_transfers', []);
    tenantData.branchTransfers = smartMerge(tenantData.branchTransfers, newBranchTransfers, 'branchTransfers');
    
    // Quotations
    const newQuotations = window.quotations || safeLocalStorageGet('ezcubic_quotations', []);
    tenantData.quotations = smartMerge(tenantData.quotations, newQuotations, 'quotations');
    
    // Projects
    const newProjects = window.projects || safeLocalStorageGet('ezcubic_projects', []);
    tenantData.projects = smartMerge(tenantData.projects, newProjects, 'projects');
    
    // Purchase orders
    const newPurchaseOrders = window.purchaseOrders || safeLocalStorageGet('ezcubic_purchase_orders', []);
    tenantData.purchaseOrders = smartMerge(tenantData.purchaseOrders, newPurchaseOrders, 'purchaseOrders');
    
    // Goods receipts
    const newGoodsReceipts = window.goodsReceipts || safeLocalStorageGet('ezcubic_goods_receipts', []);
    tenantData.goodsReceipts = smartMerge(tenantData.goodsReceipts, newGoodsReceipts, 'goodsReceipts');
    
    // HR & Payroll data
    const newEmployees = window.employees || safeLocalStorageGet('ezcubic_employees', []);
    tenantData.employees = smartMerge(tenantData.employees, newEmployees, 'employees');
    
    const newPayrollRecords = window.payrollRecords || safeLocalStorageGet('ezcubic_payroll', []);
    tenantData.payrollRecords = smartMerge(tenantData.payrollRecords, newPayrollRecords, 'payrollRecords');
    
    const newKpiTemplates = window.kpiTemplates || safeLocalStorageGet('ezcubic_kpi_templates', []);
    tenantData.kpiTemplates = smartMerge(tenantData.kpiTemplates, newKpiTemplates, 'kpiTemplates');
    
    const newKpiAssignments = window.kpiAssignments || safeLocalStorageGet('ezcubic_kpi_assignments', []);
    tenantData.kpiAssignments = smartMerge(tenantData.kpiAssignments, newKpiAssignments, 'kpiAssignments');
    
    const newKpiScores = window.kpiScores || safeLocalStorageGet('ezcubic_kpi_scores', []);
    tenantData.kpiScores = smartMerge(tenantData.kpiScores, newKpiScores, 'kpiScores');
    
    const newLeaveRequests = window.leaveRequests || safeLocalStorageGet('ezcubic_leave_requests', []);
    tenantData.leaveRequests = smartMerge(tenantData.leaveRequests, newLeaveRequests, 'leaveRequests');
    
    const newLeaveBalances = window.leaveBalances || safeLocalStorageGet('ezcubic_leave_balances', []);
    tenantData.leaveBalances = smartMerge(tenantData.leaveBalances, newLeaveBalances, 'leaveBalances');
    
    const newAttendance = window.attendanceRecords || safeLocalStorageGet('ezcubic_attendance', []);
    tenantData.attendanceRecords = smartMerge(tenantData.attendanceRecords, newAttendance, 'attendanceRecords');
    
    // Accounting & Finance data
    const newOrders = window.orders || safeLocalStorageGet('ezcubic_orders', []);
    tenantData.orders = smartMerge(tenantData.orders, newOrders, 'orders');
    
    const newInvoices = window.invoices || safeLocalStorageGet('ezcubic_invoices', []);
    tenantData.invoices = smartMerge(tenantData.invoices, newInvoices, 'invoices');
    
    const newBankAccounts = window.bankAccounts || safeLocalStorageGet('ezcubic_bank_accounts', []);
    tenantData.bankAccounts = smartMerge(tenantData.bankAccounts, newBankAccounts, 'bankAccounts');
    
    const newCreditCards = window.creditCards || safeLocalStorageGet('ezcubic_credit_cards', []);
    tenantData.creditCards = smartMerge(tenantData.creditCards, newCreditCards, 'creditCards');
    
    // Manual balances (object, not array)
    const newManualBalances = window.manualBalances || safeLocalStorageGet('ezcubic_manual_balances', {});
    if (Object.keys(newManualBalances).length > 0 || !tenantData.manualBalances) {
        tenantData.manualBalances = newManualBalances;
    }
    
    // POS data
    const newHeldSales = safeLocalStorageGet('ezcubic_held_sales', []);
    tenantData.heldSales = smartMerge(tenantData.heldSales, newHeldSales, 'heldSales');
    
    const newPosReceipts = safeLocalStorageGet('ezcubic_pos_receipts', []);
    tenantData.posReceipts = smartMerge(tenantData.posReceipts, newPosReceipts, 'posReceipts');
    
    // Inventory (alias for products)
    tenantData.inventory = tenantData.products;
    
    // CRM customers (separate from regular customers module)
    const localCRMCustomers = safeLocalStorageGet('ezcubic_crm_customers', []);
    const newCRMCustomers = localCRMCustomers.length > 0 ? localCRMCustomers : (window.crmCustomers || []);
    tenantData.crmCustomers = smartMerge(tenantData.crmCustomers, newCRMCustomers, 'crmCustomers');
    
    // E-Invoice settings (object)
    const newEinvoiceSettings = safeLocalStorageGet('ezcubic_einvoice_settings', {});
    if (Object.keys(newEinvoiceSettings).length > 0 || !tenantData.einvoiceSettings) {
        tenantData.einvoiceSettings = newEinvoiceSettings;
    }
    
    // Outlets
    const newOutlets = window.outlets || safeLocalStorageGet('ezcubic_outlets', []);
    tenantData.outlets = smartMerge(tenantData.outlets, newOutlets, 'outlets');
    
    // Delivery orders
    const newDeliveryOrders = window.deliveryOrders || safeLocalStorageGet('ezcubic_delivery_orders', []);
    tenantData.deliveryOrders = smartMerge(tenantData.deliveryOrders, newDeliveryOrders, 'deliveryOrders');
    
    // Chart of Accounts & Journal Entries
    const newChartOfAccounts = window.chartOfAccounts || safeLocalStorageGet('ezcubic_chart_of_accounts', []);
    tenantData.chartOfAccounts = smartMerge(tenantData.chartOfAccounts, newChartOfAccounts, 'chartOfAccounts');
    
    const newJournalEntries = window.journalEntries || safeLocalStorageGet('ezcubic_journal_entries', []);
    tenantData.journalEntries = smartMerge(tenantData.journalEntries, newJournalEntries, 'journalEntries');
    
    // Journal sequence (object)
    const newJournalSeq = safeLocalStorageGet('ezcubic_journal_sequence', null);
    if (newJournalSeq) {
        tenantData.journalSequence = newJournalSeq;
    }
    
    // AI state (object)
    const newAiState = safeLocalStorageGet('ezcubic_ai_state', {});
    if (Object.keys(newAiState).length > 0 || !tenantData.aiState) {
        tenantData.aiState = newAiState;
    }
    
    // Settings - always update if provided
    if (businessData.settings && Object.keys(businessData.settings).length > 0) {
        tenantData.settings = businessData.settings;
    }
    
    tenantData.updatedAt = new Date().toISOString();
    
    safeLocalStorageSet(tenantKey, tenantData);
    console.log('Saved to tenant:', user.tenantId, '- CRM:', tenantData.crmCustomers?.length, 'Customers:', tenantData.customers?.length, 'Products:', tenantData.products?.length);
}

function exportData() {
    try {
        const dataStr = JSON.stringify(businessData, null, 2);
        const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
        
        const companyName = businessData.settings.businessName.replace(/\s+/g, '-');
        const exportFileDefaultName = `${companyName}-backup-${new Date().toISOString().slice(0,10)}.json`;
        
        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', exportFileDefaultName);
        linkElement.click();
        
        showNotification('Data exported successfully!', 'success');
    } catch (error) {
        console.error('Export failed:', error);
        showNotification('Failed to export data', 'error');
    }
}

/**
 * Sync localStorage data to tenant storage
 * Call this to recover data that might be in localStorage but not in tenant storage
 */
function syncLocalStorageToTenant() {
    const user = window.currentUser;
    if (!user || !user.tenantId) {
        console.log('syncLocalStorageToTenant: No user logged in');
        return false;
    }
    
    console.log('Syncing localStorage to tenant storage...');
    
    // Force sync all window variables from localStorage
    window.employees = JSON.parse(localStorage.getItem('ezcubic_employees') || '[]');
    window.payrollRecords = JSON.parse(localStorage.getItem('ezcubic_payroll') || '[]');
    window.kpiTemplates = JSON.parse(localStorage.getItem('ezcubic_kpi_templates') || '[]');
    window.kpiAssignments = JSON.parse(localStorage.getItem('ezcubic_kpi_assignments') || '[]');
    window.kpiScores = JSON.parse(localStorage.getItem('ezcubic_kpi_scores') || '[]');
    window.products = JSON.parse(localStorage.getItem('ezcubic_products') || '[]');
    window.customers = JSON.parse(localStorage.getItem('ezcubic_customers') || '[]');
    window.suppliers = JSON.parse(localStorage.getItem('ezcubic_suppliers') || '[]');
    window.quotations = JSON.parse(localStorage.getItem('ezcubic_quotations') || '[]');
    window.projects = JSON.parse(localStorage.getItem('ezcubic_projects') || '[]');
    
    // Now save to tenant
    saveToUserTenant();
    
    console.log('Sync complete:', {
        employees: window.employees?.length || 0,
        payrollRecords: window.payrollRecords?.length || 0,
        products: window.products?.length || 0
    });
    
    return true;
}

// Export functions to window
window.loadData = loadData;
window.saveData = saveData;
window.exportData = exportData;
window.exportFullBackup = exportFullBackup;
window.importFullBackup = importFullBackup;
window.saveToUserTenant = saveToUserTenant;
window.saveDirectToLocalStorage = saveDirectToLocalStorage;
window.syncLocalStorageToTenant = syncLocalStorageToTenant;
window.smartMerge = smartMerge;
