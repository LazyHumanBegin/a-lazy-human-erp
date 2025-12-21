// ==================== DATA.JS ====================
// Data Management Functions

// Export functions to window for onclick handlers
window.loadData = loadData;
window.saveData = saveData;
window.exportData = exportData;
window.importData = importData;
window.confirmResetTransactions = confirmResetTransactions;
window.confirmResetAll = confirmResetAll;
window.exportFullBackup = exportFullBackup;
window.importFullBackup = importFullBackup;
window.saveToUserTenant = saveToUserTenant;

// FULL BACKUP - exports ALL business data including products, customers, sales, projects, etc.
function exportFullBackup() {
    try {
        const user = window.currentUser;
        const tenantId = user?.tenantId || 'tenant_founder';
        const tenantKey = 'ezcubic_tenant_' + tenantId;
        
        // Gather ALL data from tenant storage OR from individual keys (using safe functions)
        const fullBackup = {
            version: '2.1',
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
        
        const businessName = (businessData.settings?.businessName || 'EZCubic').replace(/\s+/g, '-');
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

// Save data to current user's tenant storage
function saveToUserTenant() {
    // PROTECTION: Don't save if we're in the middle of switching users
    if (window._isLoadingUserData) {
        console.log('Skipping tenant save - user data is being loaded');
        return;
    }
    
    const user = window.currentUser;
    if (!user || !user.tenantId) {
        console.log('saveToUserTenant: No user or tenantId', user?.email, user?.tenantId);
        return;
    }
    
    const tenantKey = 'ezcubic_tenant_' + user.tenantId;
    let tenantData = safeLocalStorageGet(tenantKey, {});
    
    // DEBUG: Log what we're about to save
    console.log('saveToUserTenant DEBUG:', {
        tenantKey: tenantKey,
        windowCustomers: window.customers?.length,
        localStorageCustomers: JSON.parse(localStorage.getItem('ezcubic_customers') || '[]').length
    });
    
    // Update tenant data with ALL current data sources (using safe getters)
    tenantData.transactions = businessData.transactions || window.transactions || [];
    tenantData.bills = businessData.bills || [];
    tenantData.products = window.products || safeLocalStorageGet('ezcubic_products', []);
    // For customers, check localStorage FIRST since saveCustomers writes there directly
    const localCustomers = safeLocalStorageGet('ezcubic_customers', []);
    tenantData.customers = (localCustomers.length > 0) ? localCustomers : (window.customers || []);
    console.log('saveToUserTenant - saving customers:', tenantData.customers?.length);
    tenantData.stockMovements = window.stockMovements || safeLocalStorageGet('ezcubic_stock_movements', []);
    tenantData.sales = window.sales || safeLocalStorageGet('ezcubic_sales', []);
    tenantData.suppliers = window.suppliers || safeLocalStorageGet('ezcubic_suppliers', []);
    tenantData.branches = window.branches || safeLocalStorageGet('ezcubic_branches', []);
    tenantData.branchTransfers = window.branchTransfers || safeLocalStorageGet('ezcubic_branch_transfers', []);
    tenantData.quotations = window.quotations || safeLocalStorageGet('ezcubic_quotations', []);
    tenantData.projects = window.projects || safeLocalStorageGet('ezcubic_projects', []);
    tenantData.purchaseOrders = window.purchaseOrders || safeLocalStorageGet('ezcubic_purchase_orders', []);
    tenantData.goodsReceipts = window.goodsReceipts || safeLocalStorageGet('ezcubic_goods_receipts', []);
    
    // HR & Payroll data
    tenantData.employees = window.employees || safeLocalStorageGet('ezcubic_employees', []);
    tenantData.payrollRecords = window.payrollRecords || safeLocalStorageGet('ezcubic_payroll', []);
    tenantData.kpiTemplates = window.kpiTemplates || safeLocalStorageGet('ezcubic_kpi_templates', []);
    tenantData.kpiAssignments = window.kpiAssignments || safeLocalStorageGet('ezcubic_kpi_assignments', []);
    tenantData.kpiScores = window.kpiScores || safeLocalStorageGet('ezcubic_kpi_scores', []);
    tenantData.leaveRequests = window.leaveRequests || safeLocalStorageGet('ezcubic_leave_requests', []);
    tenantData.leaveBalances = window.leaveBalances || safeLocalStorageGet('ezcubic_leave_balances', []);
    tenantData.attendanceRecords = window.attendanceRecords || safeLocalStorageGet('ezcubic_attendance', []);
    
    // Accounting & Finance data
    tenantData.orders = window.orders || safeLocalStorageGet('ezcubic_orders', []);
    tenantData.invoices = window.invoices || safeLocalStorageGet('ezcubic_invoices', []);
    tenantData.bankAccounts = window.bankAccounts || safeLocalStorageGet('ezcubic_bank_accounts', []);
    tenantData.creditCards = window.creditCards || safeLocalStorageGet('ezcubic_credit_cards', []);
    tenantData.manualBalances = window.manualBalances || safeLocalStorageGet('ezcubic_manual_balances', {});
    
    // POS data
    tenantData.heldSales = safeLocalStorageGet('ezcubic_held_sales', []);
    tenantData.posReceipts = safeLocalStorageGet('ezcubic_pos_receipts', []);
    
    // Inventory (alias for products in some modules)
    tenantData.inventory = window.products || safeLocalStorageGet('ezcubic_inventory', []);
    
    // CRM customers (separate from regular customers module)
    tenantData.crmCustomers = window.crmCustomers || safeLocalStorageGet('ezcubic_crm_customers', []);
    
    // Regular customers module
    tenantData.customers = window.customers || safeLocalStorageGet('ezcubic_customers', []);
    
    // E-Invoice settings
    tenantData.einvoiceSettings = safeLocalStorageGet('ezcubic_einvoice_settings', {});
    
    // Outlets
    tenantData.outlets = window.outlets || safeLocalStorageGet('ezcubic_outlets', []);
    
    // Delivery orders
    tenantData.deliveryOrders = window.deliveryOrders || safeLocalStorageGet('ezcubic_delivery_orders', []);
    
    // Chart of Accounts & Journal Entries
    tenantData.chartOfAccounts = window.chartOfAccounts || safeLocalStorageGet('ezcubic_chart_of_accounts', []);
    tenantData.journalEntries = window.journalEntries || safeLocalStorageGet('ezcubic_journal_entries', []);
    tenantData.journalSequence = safeLocalStorageGet('ezcubic_journal_sequence', { year: new Date().getFullYear(), sequence: 0 });
    
    // AI state (optional per-tenant)
    tenantData.aiState = safeLocalStorageGet('ezcubic_ai_state', {});
    
    tenantData.settings = businessData.settings || {};
    tenantData.updatedAt = new Date().toISOString();
    
    safeLocalStorageSet(tenantKey, tenantData);
    console.log('Saved to tenant:', user.tenantId);
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

function importData() {
    document.getElementById('importModal').style.display = 'flex';
}

function closeImportModal() {
    document.getElementById('importModal').style.display = 'none';
}

function processImport() {
    const fileInput = document.getElementById('importFile');
    const importType = document.getElementById('importType').value;
    
    if (!fileInput.files[0]) {
        showNotification('Please select a file to import', 'error');
        return;
    }
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const importedData = JSON.parse(e.target.result);
            
            if (!importedData.transactions || !importedData.settings) {
                throw new Error('Invalid file format');
            }
            
            if (importType === 'replace') {
                businessData = importedData;
                showNotification('All data replaced successfully!', 'success');
            } else {
                const existingIds = new Set(businessData.transactions.map(t => t.id));
                const newTransactions = importedData.transactions.filter(t => !existingIds.has(t.id));
                businessData.transactions.push(...newTransactions);
                
                const existingBillIds = new Set(businessData.bills.map(b => b.id));
                const newBills = importedData.bills.filter(b => !existingBillIds.has(b.id));
                businessData.bills.push(...newBills);
                
                businessData.settings = {
                    ...importedData.settings,
                    ...businessData.settings
                };
                
                showNotification('Data merged successfully!', 'success');
            }
            
            saveData();
            closeImportModal();
            
            updateDashboard();
            updateReports();
            updateMalaysianTaxEstimator();
            calculatePersonalTax();
            populateYearSelector();
            
        } catch (error) {
            console.error('Error importing data:', error);
            showNotification('Error importing data. Please check file format.', 'error');
        }
    };
    
    reader.readAsText(fileInput.files[0]);
}

function confirmResetTransactions() {
    if (confirm('Are you sure you want to clear all transactions and bills? Company settings will be preserved.')) {
        // Create auto-backup before reset
        if (typeof createAutoBackup === 'function') {
            createAutoBackup('before_reset_transactions');
            console.log('Auto-backup created before resetting transactions');
        }
        
        businessData.transactions = [];
        businessData.bills = [];
        
        if (saveData()) {
            updateDashboard();
            updateReports();
            updateMalaysianTaxEstimator();
            calculatePersonalTax();
            populateYearSelector();
            
            showNotification('All transactions and bills cleared successfully!', 'success');
        }
    }
}

function confirmResetAll() {
    if (confirm('Are you sure you want to clear ALL data including company settings? This action cannot be undone!')) {
        // Create auto-backup before reset
        if (typeof createAutoBackup === 'function') {
            createAutoBackup('before_reset_all');
            console.log('Auto-backup created before resetting all data');
        }
        
        businessData = {
            transactions: [],
            bills: [],
            settings: getDefaultSettings()
        };
        
        if (saveData()) {
            updateCompanyNameInUI();
            updateDashboard();
            updateReports();
            updateMalaysianTaxEstimator();
            calculatePersonalTax();
            populateYearSelector();
            
            showNotification('All data cleared successfully!', 'success');
        }
    }
}

// Import old transactions from Excel/CSV
function importOldTransactions() {
    // Create modal if it doesn't exist
    let modal = document.getElementById('importOldTransModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'importOldTransModal';
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 600px;">
                <div class="modal-header">
                    <h3 class="modal-title"><i class="fas fa-file-import"></i> Import Old Transactions</h3>
                    <button class="modal-close" onclick="closeModal('importOldTransModal')">&times;</button>
                </div>
                <div class="modal-body">
                    <div style="background: #fef3c7; border: 1px solid #fbbf24; border-radius: 8px; padding: 15px; margin-bottom: 20px;">
                        <div style="color: #92400e; font-weight: 600; margin-bottom: 8px;">
                            <i class="fas fa-info-circle"></i> Supported Formats
                        </div>
                        <ul style="color: #78350f; font-size: 13px; padding-left: 20px; margin: 0;">
                            <li><strong>CSV</strong> - Comma-separated values</li>
                            <li><strong>Excel (.xlsx)</strong> - Microsoft Excel files</li>
                        </ul>
                    </div>
                    
                    <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 15px; margin-bottom: 20px;">
                        <div style="color: #334155; font-weight: 600; margin-bottom: 8px;">
                            <i class="fas fa-columns"></i> Required Columns
                        </div>
                        <div style="color: #64748b; font-size: 12px;">
                            <code style="background: #e2e8f0; padding: 2px 6px; border-radius: 4px;">Date</code>
                            <code style="background: #e2e8f0; padding: 2px 6px; border-radius: 4px;">Description</code>
                            <code style="background: #e2e8f0; padding: 2px 6px; border-radius: 4px;">Amount</code>
                            <code style="background: #e2e8f0; padding: 2px 6px; border-radius: 4px;">Type</code> (income/expense)
                        </div>
                        <div style="color: #94a3b8; font-size: 11px; margin-top: 8px;">
                            Optional: Category, Reference, Notes
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <label class="form-label">Select File</label>
                        <input type="file" id="oldTransFile" class="form-control" accept=".csv,.xlsx,.xls">
                    </div>
                    
                    <div class="form-group">
                        <label class="form-label">Import Mode</label>
                        <select id="oldTransImportMode" class="form-control">
                            <option value="append">Append to existing transactions</option>
                            <option value="replace">Replace all transactions (use with caution)</option>
                        </select>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn-secondary" onclick="closeModal('importOldTransModal')">Cancel</button>
                    <button class="btn-primary" onclick="processOldTransactionsImport()">
                        <i class="fas fa-upload"></i> Import
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }
    
    modal.style.display = '';
    modal.classList.add('show');
}

// Process the old transactions import
function processOldTransactionsImport() {
    const fileInput = document.getElementById('oldTransFile');
    const importMode = document.getElementById('oldTransImportMode')?.value || 'append';
    
    if (!fileInput || !fileInput.files[0]) {
        showNotification('Error', 'Please select a file to import', 'error');
        return;
    }
    
    const file = fileInput.files[0];
    const fileName = file.name.toLowerCase();
    
    if (fileName.endsWith('.csv')) {
        processCSVImport(file, importMode);
    } else if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
        showNotification('Excel Import', 'For Excel files, please save as CSV first, then import the CSV file.', 'warning');
    } else {
        showNotification('Error', 'Unsupported file format. Please use CSV.', 'error');
    }
}

// Process CSV import
function processCSVImport(file, importMode) {
    const reader = new FileReader();
    
    reader.onload = function(e) {
        try {
            const text = e.target.result;
            const lines = text.split('\n');
            
            if (lines.length < 2) {
                throw new Error('File appears to be empty');
            }
            
            // Parse header
            const header = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/"/g, ''));
            
            // Find column indices
            const dateIdx = header.findIndex(h => h.includes('date'));
            const descIdx = header.findIndex(h => h.includes('description') || h.includes('desc') || h.includes('memo'));
            const amountIdx = header.findIndex(h => h.includes('amount') || h.includes('value'));
            const typeIdx = header.findIndex(h => h.includes('type'));
            const categoryIdx = header.findIndex(h => h.includes('category') || h.includes('cat'));
            const refIdx = header.findIndex(h => h.includes('reference') || h.includes('ref'));
            
            if (dateIdx === -1 || amountIdx === -1) {
                throw new Error('CSV must have Date and Amount columns');
            }
            
            // Parse transactions
            const newTransactions = [];
            for (let i = 1; i < lines.length; i++) {
                const line = lines[i].trim();
                if (!line) continue;
                
                // Parse CSV line (handle quoted values)
                const values = parseCSVLine(line);
                
                const amount = Math.abs(parseFloat(values[amountIdx]?.replace(/[^0-9.-]/g, '')) || 0);
                if (amount === 0) continue;
                
                // Determine type
                let type = 'expense';
                if (typeIdx !== -1) {
                    const typeVal = (values[typeIdx] || '').toLowerCase();
                    if (typeVal.includes('income') || typeVal.includes('credit') || typeVal.includes('in')) {
                        type = 'income';
                    }
                } else {
                    // Check if original amount was positive
                    const rawAmount = parseFloat(values[amountIdx]?.replace(/[^0-9.-]/g, '')) || 0;
                    if (rawAmount > 0) type = 'income';
                }
                
                newTransactions.push({
                    id: 'imported_' + Date.now() + '_' + i,
                    date: parseImportDate(values[dateIdx]),
                    description: values[descIdx] || 'Imported transaction',
                    amount: amount,
                    type: type,
                    category: values[categoryIdx] || (type === 'income' ? 'Sales' : 'Operating Expenses'),
                    reference: values[refIdx] || '',
                    imported: true,
                    importDate: new Date().toISOString()
                });
            }
            
            if (newTransactions.length === 0) {
                throw new Error('No valid transactions found in file');
            }
            
            // Get current transactions
            const tenantId = typeof getCurrentTenantId === 'function' ? getCurrentTenantId() : 'default';
            let transactions = JSON.parse(localStorage.getItem(`transactions_${tenantId}`) || '[]');
            
            if (importMode === 'replace') {
                transactions = newTransactions;
            } else {
                transactions = [...transactions, ...newTransactions];
            }
            
            // Save
            localStorage.setItem(`transactions_${tenantId}`, JSON.stringify(transactions));
            
            closeModal('importOldTransModal');
            showNotification('Success', `Imported ${newTransactions.length} transactions successfully!`, 'success');
            
            // Refresh UI
            if (typeof loadTransactions === 'function') loadTransactions();
            if (typeof updateDashboard === 'function') updateDashboard();
            
        } catch (error) {
            console.error('Import error:', error);
            showNotification('Import Failed', error.message, 'error');
        }
    };
    
    reader.readAsText(file);
}

// Parse CSV line handling quoted values
function parseCSVLine(line) {
    const values = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        
        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            values.push(current.trim());
            current = '';
        } else {
            current += char;
        }
    }
    values.push(current.trim());
    
    return values;
}

// Parse various date formats
function parseImportDate(dateStr) {
    if (!dateStr) return new Date().toISOString().split('T')[0];
    
    dateStr = dateStr.replace(/"/g, '').trim();
    
    // Try various formats
    const formats = [
        /(\d{1,2})\/(\d{1,2})\/(\d{4})/, // DD/MM/YYYY or MM/DD/YYYY
        /(\d{4})-(\d{2})-(\d{2})/, // YYYY-MM-DD
        /(\d{1,2})-(\d{1,2})-(\d{4})/, // DD-MM-YYYY
    ];
    
    for (const format of formats) {
        const match = dateStr.match(format);
        if (match) {
            if (dateStr.includes('-') && match[1].length === 4) {
                return `${match[1]}-${match[2]}-${match[3]}`;
            } else {
                // Assume DD/MM/YYYY for Malaysian format
                return `${match[3]}-${match[2].padStart(2, '0')}-${match[1].padStart(2, '0')}`;
            }
        }
    }
    
    // Try native parsing
    const parsed = new Date(dateStr);
    if (!isNaN(parsed)) {
        return parsed.toISOString().split('T')[0];
    }
    
    return new Date().toISOString().split('T')[0];
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

// Export for window access
window.importOldTransactions = importOldTransactions;
window.processOldTransactionsImport = processOldTransactionsImport;
window.syncLocalStorageToTenant = syncLocalStorageToTenant;
window.saveToUserTenant = saveToUserTenant;
window.safeLocalStorageGet = safeLocalStorageGet;
window.safeLocalStorageSet = safeLocalStorageSet;
