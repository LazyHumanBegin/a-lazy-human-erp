// ==================== APP-CORE.JS ====================
// Application Initialization & Core Functions
// Part A of app.js split

// ==================== INITIALIZE APP ====================
function initializeApp() {
    // Wait if tenant data is still loading (max 5 retries = 500ms)
    if (window._isLoadingUserData) {
        window._initAppRetries = (window._initAppRetries || 0) + 1;
        if (window._initAppRetries < 5) {
            console.log('Waiting for tenant data to finish loading... (retry ' + window._initAppRetries + ')');
            setTimeout(initializeApp, 100);
            return;
        } else {
            console.log('Timeout waiting for tenant data, proceeding anyway');
            window._isLoadingUserData = false; // Force clear the flag
        }
    }
    window._initAppRetries = 0; // Reset retry counter
    
    try {
        // Only load data if no user is logged in (user system handles tenant data)
        // This prevents loading stale data when switching accounts
        if (!window.currentUser) {
            loadData();
        }
        
        // Initialize settings fields
        const businessNameInput = document.getElementById('businessName');
        if (businessNameInput) businessNameInput.value = businessData.settings.businessName || '';
        
        const ssmNumberInput = document.getElementById('ssmNumber');
        if (ssmNumberInput) ssmNumberInput.value = businessData.settings.ssmNumber || '';
        
        const tinNumberInput = document.getElementById('tinNumber');
        if (tinNumberInput) tinNumberInput.value = businessData.settings.tinNumber || '';
        
        const gstNumberInput = document.getElementById('gstNumber');
        if (gstNumberInput) gstNumberInput.value = businessData.settings.gstNumber || '';
        
        const financialYearStartInput = document.getElementById('financialYearStart');
        if (financialYearStartInput) financialYearStartInput.value = businessData.settings.financialYearStart || '01';
        
        const defaultTaxRateInput = document.getElementById('defaultTaxRate');
        if (defaultTaxRateInput) defaultTaxRateInput.value = businessData.settings.defaultTaxRate || 17;
        
        const corporateTaxRateInput = document.getElementById('corporateTaxRate');
        if (corporateTaxRateInput) corporateTaxRateInput.value = businessData.settings.defaultTaxRate || 17;
        
        // Company contact details for quotations/invoices
        const businessAddressInput = document.getElementById('businessAddress');
        if (businessAddressInput) businessAddressInput.value = businessData.settings.businessAddress || localStorage.getItem('ezcubic_business_address') || '';
        
        const businessPhoneInput = document.getElementById('businessPhone');
        if (businessPhoneInput) businessPhoneInput.value = businessData.settings.businessPhone || localStorage.getItem('ezcubic_business_phone') || '';
        
        const businessEmailInput = document.getElementById('businessEmail');
        if (businessEmailInput) businessEmailInput.value = businessData.settings.businessEmail || localStorage.getItem('ezcubic_business_email') || '';
        
        const businessWebsiteInput = document.getElementById('businessWebsite');
        if (businessWebsiteInput) businessWebsiteInput.value = businessData.settings.businessWebsite || localStorage.getItem('ezcubic_business_website') || '';
        
        const businessBankInput = document.getElementById('businessBankAccount');
        if (businessBankInput) businessBankInput.value = businessData.settings.businessBankAccount || localStorage.getItem('ezcubic_business_bank') || '';
        
        // Set default dates
        const today = new Date().toISOString().split('T')[0];
        const incomeDateInput = document.getElementById('incomeDate');
        if (incomeDateInput) incomeDateInput.value = today;
        
        const expenseDateInput = document.getElementById('expenseDate');
        if (expenseDateInput) expenseDateInput.value = today;
        
        // Initialize all sections
        updateCompanyNameInUI();
        initializeCharts();
        updateDashboard();
        populateYearSelector();
        initializeChatbot();
        initDetailedBalanceSheet();
        
        // Initialize tax section if available
        if (typeof initTaxSection === 'function') {
            initTaxSection();
        }
        
        // ==================== PHASE 2: Initialize Operational Modules ====================
        initializePhase2Modules();
        
        // Show welcome banner if needed
        if (businessData.settings.showWelcome !== false) {
            const welcomeBanner = document.getElementById('welcomeBanner');
            if (welcomeBanner) welcomeBanner.style.display = 'block';
        }
        
        console.log('A Lazy Human ERP initialized successfully');
    } catch (error) {
        console.error('Error initializing app:', error);
        showNotification('Error initializing app. Some features may not work.', 'error');
    }
}

// ==================== PHASE 2: Initialize Modules ====================
function initializePhase2Modules() {
    try {
        // Load Phase 2 data from localStorage
        loadPhase2Data();
        
        // Initialize outlets first
        loadOutlets();
        
        // Initialize inventory
        if (typeof initializeInventory === 'function') {
            initializeInventory();
        }
        
        // Initialize stock
        if (typeof initializeStock === 'function') {
            initializeStock();
        }
        
        // Initialize customers
        if (typeof initializeCustomers === 'function') {
            initializeCustomers();
        }
        
        // Initialize POS
        if (typeof initializePOS === 'function') {
            initializePOS();
        }
        
        // Initialize Orders
        if (typeof initializeOrders === 'function') {
            initializeOrders();
        }
        
        // Initialize CRM
        if (typeof initializeCRM === 'function') {
            initializeCRM();
        }
        
        // Initialize Suppliers
        if (typeof initializeSuppliers === 'function') {
            initializeSuppliers();
        }
        
        // Initialize Projects
        if (typeof initializeProjects === 'function') {
            initializeProjects();
        }
        
        // Initialize Payroll (Phase 3)
        if (typeof initializePayroll === 'function') {
            initializePayroll();
        }
        
        // Initialize KPI System (Phase 3)
        if (typeof initializeKPI === 'function') {
            initializeKPI();
        }
        
        // Initialize Branches (Phase 5)
        if (typeof initializeBranches === 'function') {
            initializeBranches();
        }
        
        // Initialize Audit Log (System Tracking)
        if (typeof initializeAuditLog === 'function') {
            initializeAuditLog();
        }
        
        // Process recurring bills - auto-generate upcoming bills
        if (typeof processRecurringBills === 'function') {
            const generated = processRecurringBills();
            if (generated > 0) {
                console.log(`Auto-generated ${generated} recurring bills`);
            }
        }
        
        // Update low stock badge
        if (typeof updateLowStockBadge === 'function') {
            updateLowStockBadge();
        }
        
        console.log('Phase 2 modules initialized');
    } catch (error) {
        console.error('Error initializing Phase 2 modules:', error);
    }
}

// Load Phase 2 data from localStorage
function loadPhase2Data() {
    try {
        // Load products
        const storedProducts = localStorage.getItem(PRODUCTS_KEY);
        if (storedProducts) {
            products = JSON.parse(storedProducts);
        }
        
        // Load customers
        const storedCustomers = localStorage.getItem(CUSTOMERS_KEY);
        if (storedCustomers) {
            customers = JSON.parse(storedCustomers);
        }
        
        // Load stock movements
        const storedMovements = localStorage.getItem(STOCK_MOVEMENTS_KEY);
        if (storedMovements) {
            stockMovements = JSON.parse(storedMovements);
        }
        
        // Load sales
        const storedSales = localStorage.getItem(SALES_KEY);
        if (storedSales) {
            sales = JSON.parse(storedSales);
        }
        
        console.log('Phase 2 data loaded:', {
            products: products.length,
            customers: customers.length,
            stockMovements: stockMovements.length,
            sales: sales.length
        });
    } catch (error) {
        console.error('Error loading Phase 2 data:', error);
    }
}

function initDetailedBalanceSheet() {
    // Initialize the combined view (simple + detailed on same page)
    const simpleBalanceView = document.getElementById('simpleBalanceView');
    if (simpleBalanceView) {
        simpleBalanceView.classList.add('active');
    }
    
    // Add change listeners to balance inputs
    document.querySelectorAll('.balance-input').forEach(input => {
        input.addEventListener('change', function() {
            updateManualBalance(this.id);
        });
    });
    
    // Load the simple summary and detailed data
    try {
        displaySimpleBalanceSheet();
        loadDetailedBalanceSheet();
        loadCreditCards();
    } catch (e) {
        console.log('Balance sheet init:', e.message);
    }
}

// ==================== DOM CONTENT LOADED ====================
document.addEventListener('DOMContentLoaded', function() {
    // Wait for user system to initialize first
    // User system handles login check and shows login page if needed
    // Only initialize app after user system is ready (500ms delay)
    setTimeout(function() {
        // Only initialize app if user is logged in or app container is visible
        const appContainer = document.getElementById('appContainer');
        const isAppVisible = appContainer && appContainer.style.display !== 'none';
        
        if (isAppVisible && window.currentUser) {
            initializeApp();
        } else {
            console.log('⏳ App initialization deferred - waiting for login');
            // Set up a watcher to initialize when user logs in
            window._waitForLogin = setInterval(function() {
                if (window.currentUser) {
                    clearInterval(window._waitForLogin);
                    initializeApp();
                }
            }, 500);
        }
    }, 400);
    
    const currentMonth = new Date().toISOString().slice(0, 7);
    const filterMonth = document.getElementById('filterMonth');
    if (filterMonth) {
        filterMonth.value = currentMonth;
    }
    
    window.addEventListener('error', function(event) {
        // Only log errors, don't show notification for every error
        // as some errors (like missing images) are non-critical
        console.error('Global error:', event.error);
        
        // Only show notification for critical JavaScript errors, not resource loading errors
        if (event.error && event.error.message && !event.filename.includes('.png') && !event.filename.includes('.jpg')) {
            // Don't show notification - just log to console
            // showNotification('An error occurred. Please refresh the page.', 'error');
        }
    });
    
    // ==================== KEYBOARD SHORTCUTS ====================
    document.addEventListener('keydown', function(e) {
        // Only if not typing in an input
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') {
            return;
        }
        
        // Ctrl/Cmd + key shortcuts
        if (e.ctrlKey || e.metaKey) {
            switch(e.key.toLowerCase()) {
                case 's': // Save/Export
                    e.preventDefault();
                    if (typeof exportData === 'function') exportData();
                    break;
                case 'i': // Quick add income
                    e.preventDefault();
                    if (typeof quickAddIncome === 'function') quickAddIncome();
                    break;
                case 'e': // Quick add expense
                    e.preventDefault();
                    if (typeof quickAddExpense === 'function') quickAddExpense();
                    break;
            }
        }
        
        // Alt + number for quick navigation
        if (e.altKey) {
            switch(e.key) {
                case '1': showSection('dashboard'); break;
                case '2': showSection('income'); break;
                case '3': showSection('expenses'); break;
                case '4': showSection('reports'); break;
                case '5': showSection('balance-sheet'); break;
            }
        }
    });
    
    // ==================== AUTO-BACKUP REMINDER ====================
    checkBackupReminder();
});

function checkBackupReminder() {
    const lastBackup = localStorage.getItem('ezcubic_last_backup');
    const today = new Date().toISOString().slice(0, 10);
    
    if (!lastBackup) {
        // First time - set today as reference
        localStorage.setItem('ezcubic_last_backup', today);
        return;
    }
    
    const daysSinceBackup = Math.floor((new Date(today) - new Date(lastBackup)) / (1000 * 60 * 60 * 24));
    
    // Remind every 7 days
    if (daysSinceBackup >= 7 && businessData.transactions.length > 0) {
        setTimeout(() => {
            showBackupReminder(daysSinceBackup);
        }, 3000);
    }
}

function showBackupReminder(days) {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.id = 'backupReminderModal';
    modal.style.display = 'flex';
    
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 400px; text-align: center;">
            <div style="font-size: 48px; margin-bottom: 15px;">💾</div>
            <h3 style="margin-bottom: 10px; color: #1e293b;">Backup Reminder</h3>
            <p style="color: #64748b; margin-bottom: 20px;">
                It's been <strong>${days} days</strong> since your last backup. 
                We recommend backing up your data regularly to prevent data loss.
            </p>
            <div style="display: flex; gap: 10px; justify-content: center;">
                <button class="btn-secondary" onclick="dismissBackupReminder()">
                    Remind Later
                </button>
                <button class="btn-primary" onclick="backupNow()">
                    <i class="fas fa-download"></i> Backup Now
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
}

function dismissBackupReminder() {
    const modal = document.getElementById('backupReminderModal');
    if (modal) modal.remove();
}

function backupNow() {
    dismissBackupReminder();
    if (typeof exportData === 'function') {
        exportData();
        localStorage.setItem('ezcubic_last_backup', new Date().toISOString().slice(0, 10));
    }
}

function showKeyboardShortcuts() {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.id = 'keyboardShortcutsModal';
    modal.style.display = 'flex';
    modal.onclick = function(e) { if (e.target === modal) modal.remove(); };
    
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 450px;">
            <div class="modal-header">
                <h3 class="modal-title"><i class="fas fa-keyboard" style="color: #2563eb;"></i> Keyboard Shortcuts</h3>
                <button class="close-modal" onclick="document.getElementById('keyboardShortcutsModal').remove()">&times;</button>
            </div>
            <div style="padding: 20px;">
                <div style="margin-bottom: 20px;">
                    <h4 style="color: #64748b; font-size: 12px; text-transform: uppercase; margin-bottom: 10px;">Quick Actions</h4>
                    <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e2e8f0;">
                        <span>Quick Add Income</span>
                        <span><kbd style="background: #f1f5f9; padding: 4px 8px; border-radius: 4px; font-size: 12px;">Ctrl/⌘ + I</kbd></span>
                    </div>
                    <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e2e8f0;">
                        <span>Quick Add Expense</span>
                        <span><kbd style="background: #f1f5f9; padding: 4px 8px; border-radius: 4px; font-size: 12px;">Ctrl/⌘ + E</kbd></span>
                    </div>
                    <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e2e8f0;">
                        <span>Backup Data</span>
                        <span><kbd style="background: #f1f5f9; padding: 4px 8px; border-radius: 4px; font-size: 12px;">Ctrl/⌘ + S</kbd></span>
                    </div>
                </div>
                <div>
                    <h4 style="color: #64748b; font-size: 12px; text-transform: uppercase; margin-bottom: 10px;">Navigation</h4>
                    <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e2e8f0;">
                        <span>Dashboard</span>
                        <span><kbd style="background: #f1f5f9; padding: 4px 8px; border-radius: 4px; font-size: 12px;">Alt + 1</kbd></span>
                    </div>
                    <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e2e8f0;">
                        <span>Record Income</span>
                        <span><kbd style="background: #f1f5f9; padding: 4px 8px; border-radius: 4px; font-size: 12px;">Alt + 2</kbd></span>
                    </div>
                    <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e2e8f0;">
                        <span>Record Expenses</span>
                        <span><kbd style="background: #f1f5f9; padding: 4px 8px; border-radius: 4px; font-size: 12px;">Alt + 3</kbd></span>
                    </div>
                    <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e2e8f0;">
                        <span>Financial Reports</span>
                        <span><kbd style="background: #f1f5f9; padding: 4px 8px; border-radius: 4px; font-size: 12px;">Alt + 4</kbd></span>
                    </div>
                    <div style="display: flex; justify-content: space-between; padding: 8px 0;">
                        <span>Balance Sheet</span>
                        <span><kbd style="background: #f1f5f9; padding: 4px 8px; border-radius: 4px; font-size: 12px;">Alt + 5</kbd></span>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
}

// ==================== WINDOW EXPORTS ====================
window.initializeApp = initializeApp;
window.initializePhase2Modules = initializePhase2Modules;
window.loadPhase2Data = loadPhase2Data;
window.initDetailedBalanceSheet = initDetailedBalanceSheet;
window.checkBackupReminder = checkBackupReminder;
window.showBackupReminder = showBackupReminder;
window.dismissBackupReminder = dismissBackupReminder;
window.backupNow = backupNow;
window.showKeyboardShortcuts = showKeyboardShortcuts;
