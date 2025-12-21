// ==================== UI.JS ====================
// UI Navigation & Settings Functions

// Export functions to window
window.updateEInvoiceStatusBanner = updateEInvoiceStatusBanner;
window.toggleNavCategory = toggleNavCategory;

// ==================== COLLAPSIBLE NAVIGATION CATEGORIES ====================
function toggleNavCategory(separator) {
    const categoryDiv = separator.nextElementSibling;
    const icon = separator.querySelector('.collapse-icon');
    
    if (categoryDiv && categoryDiv.classList.contains('nav-category')) {
        categoryDiv.classList.toggle('collapsed');
        if (icon) {
            icon.classList.toggle('rotated');
        }
    }
}

// ==================== UI NAVIGATION ====================
function showSection(sectionId) {
    document.querySelectorAll('.content-section').forEach(section => {
        section.classList.remove('active');
    });
    
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    document.getElementById(sectionId).classList.add('active');
    
    // Use exact match for section ID to avoid partial matches (e.g., 'reports' matching 'monthly-reports')
    const navButton = document.querySelector(`.nav-btn[onclick="showSection('${sectionId}')"]`);
    if (navButton) {
        navButton.classList.add('active');
    }
    
    if (sectionId === 'dashboard') {
        updateDashboard();
    } else if (sectionId === 'transactions') {
        loadTransactions();
    } else if (sectionId === 'bills') {
        loadBills();
    } else if (sectionId === 'monthly-reports') {
        populateYearSelector();
        updateMonthlyCharts();
    } else if (sectionId === 'reports') {
        updateReports();
    } else if (sectionId === 'balance-sheet') {
        updateSimpleBalanceSheet();
    } else if (sectionId === 'taxes') {
        updateMalaysianTaxEstimator();
        setTimeout(calculatePersonalTax, 100);
    } else if (sectionId === 'ai-chatbot') {
        updateRecentChatPreview();
        showChatbot();
    }
    // Phase 2: Operational Core sections
    else if (sectionId === 'inventory') {
        if (typeof initializeInventory === 'function') initializeInventory();
    } else if (sectionId === 'pos') {
        if (typeof initializePOS === 'function') initializePOS();
    } else if (sectionId === 'customers') {
        if (typeof initializeCustomers === 'function') initializeCustomers();
    } else if (sectionId === 'stock') {
        if (typeof initializeStock === 'function') initializeStock();
        if (typeof renderStockMovements === 'function') renderStockMovements();
    } else if (sectionId === 'orders') {
        if (typeof initializeOrders === 'function') initializeOrders();
    }
    // Phase 4: Purchasing sections
    else if (sectionId === 'purchase-orders') {
        if (typeof initializePurchaseOrders === 'function') initializePurchaseOrders();
        if (typeof loadPurchaseOrders === 'function') loadPurchaseOrders();
    } else if (sectionId === 'delivery-orders') {
        if (typeof initializeDeliveryOrders === 'function') initializeDeliveryOrders();
    }
    // HR & Payroll sections
    else if (sectionId === 'employees') {
        if (typeof initializeEmployeeDirectory === 'function') initializeEmployeeDirectory();
    } else if (sectionId === 'leave-attendance') {
        if (typeof initializeLeaveAttendance === 'function') initializeLeaveAttendance();
    } else if (sectionId === 'kpi') {
        if (typeof initializeKPISection === 'function') initializeKPISection();
    } else if (sectionId === 'payroll') {
        if (typeof initializePayroll === 'function') initializePayroll();
    }
    // Platform Admin sections
    else if (sectionId === 'platform-control') {
        if (typeof renderPlatformControl === 'function') renderPlatformControl();
    } else if (sectionId === 'user-management') {
        if (typeof renderUserManagement === 'function') renderUserManagement();
    } else if (sectionId === 'branches') {
        // Ensure branches are initialized and HQ exists when viewing branches section
        if (typeof ensureDefaultHQExists === 'function') ensureDefaultHQExists();
        if (typeof renderBranches === 'function') renderBranches();
        if (typeof updateBranchStats === 'function') updateBranchStats();
    }
    // Audit Log section
    else if (sectionId === 'audit-log') {
        if (typeof renderAuditLogSection === 'function') renderAuditLogSection();
    }
    // Bank Reconciliation section
    else if (sectionId === 'bank-reconciliation') {
        if (typeof initializeBankReconciliation === 'function') initializeBankReconciliation();
    }
    // LHDN & Audit Export section
    else if (sectionId === 'lhdn-export') {
        if (typeof initializeLHDNExport === 'function') initializeLHDNExport();
    }
    // Chart of Accounts section
    else if (sectionId === 'chart-of-accounts') {
        if (typeof initChartOfAccounts === 'function') initChartOfAccounts();
        if (typeof renderChartOfAccountsContent === 'function') renderChartOfAccountsContent();
    }
    // Journal Entries section
    else if (sectionId === 'journal-entries') {
        if (typeof initJournalEntries === 'function') initJournalEntries();
        if (typeof renderJournalEntriesContent === 'function') renderJournalEntriesContent();
    }
    // Aging Reports section
    else if (sectionId === 'aging-reports') {
        if (typeof renderAgingReportsContent === 'function') renderAgingReportsContent();
    }
    
    // Scroll to top of page when changing sections
    window.scrollTo({ top: 0, behavior: 'instant' });
    
    // Close mobile menu if on mobile (only if it's open)
    if (window.innerWidth <= 768) {
        closeMobileMenu();
    }
}

function toggleMobileMenu() {
    const navPanel = document.getElementById('navPanel');
    const overlay = document.querySelector('.mobile-overlay');
    const mobileBtn = document.getElementById('mobileMenuBtn');
    
    navPanel.classList.toggle('active');
    overlay.classList.toggle('active');
    
    // Hide/show mobile button when nav bar toggles
    if (mobileBtn) {
        if (navPanel.classList.contains('active')) {
            mobileBtn.style.opacity = '0';
            mobileBtn.style.pointerEvents = 'none';
        } else {
            mobileBtn.style.opacity = '1';
            mobileBtn.style.pointerEvents = 'auto';
        }
    }
}

// Close mobile menu (only if open) - used by showSection
function closeMobileMenu() {
    const navPanel = document.getElementById('navPanel');
    const overlay = document.querySelector('.mobile-overlay');
    const mobileBtn = document.getElementById('mobileMenuBtn');
    
    if (navPanel && navPanel.classList.contains('active')) {
        navPanel.classList.remove('active');
        if (overlay) overlay.classList.remove('active');
        if (mobileBtn) {
            mobileBtn.style.opacity = '1';
            mobileBtn.style.pointerEvents = 'auto';
        }
    }
}

function hideWelcomeBanner() {
    document.getElementById('welcomeBanner').style.display = 'none';
    businessData.settings.showWelcome = false;
    saveData();
}

function showTaxTab(tabId) {
    document.querySelectorAll('.tax-tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    
    document.querySelectorAll('.tax-tabs .tab').forEach(tab => {
        tab.classList.remove('active');
    });
    
    document.getElementById(tabId + '-tax').classList.add('active');
    event.currentTarget.classList.add('active');
    
    if (tabId === 'corporate') {
        updateMalaysianTaxEstimator();
    } else if (tabId === 'personal') {
        setTimeout(calculatePersonalTax, 50);
    } else if (tabId === 'sst') {
        if (typeof updateSSTCategories === 'function') {
            updateSSTCategories();
        }
        if (typeof updateSSTSummary === 'function') {
            updateSSTSummary();
        }
    } else if (tabId === 'einvoice') {
        if (typeof initializeEInvoice === 'function') {
            initializeEInvoice();
        }
        if (typeof loadEInvoiceSubmissions === 'function') {
            loadEInvoiceSubmissions();
        }
        // Update status banner
        updateEInvoiceStatusBanner();
    }
}

function updateEInvoiceStatusBanner() {
    const banner = document.getElementById('einvoiceStatusBanner');
    if (!banner) return;
    
    const settings = JSON.parse(localStorage.getItem('ezcubic_einvoice_settings') || '{}');
    
    if (settings.enabled && settings.tin && settings.clientId) {
        banner.style.background = '#dcfce7';
        banner.innerHTML = `
            <div style="display: flex; align-items: center; gap: 10px;">
                <i class="fas fa-check-circle" style="color: #10b981; font-size: 20px;"></i>
                <div>
                    <strong style="color: #166534;">e-Invoice Enabled ${settings.demoMode ? '(DEMO)' : ''}</strong>
                    <p style="margin: 5px 0 0; color: #15803d; font-size: 13px;">
                        Connected to ${settings.environment === 'production' ? 'Production' : 'Sandbox'} | TIN: ${settings.tin}
                    </p>
                </div>
            </div>
        `;
    } else {
        banner.style.background = '#fef3c7';
        banner.innerHTML = `
            <div style="display: flex; align-items: center; gap: 10px;">
                <i class="fas fa-exclamation-circle" style="color: #f59e0b; font-size: 20px;"></i>
                <div>
                    <strong style="color: #92400e;">e-Invoice Not Configured</strong>
                    <p style="margin: 5px 0 0; color: #a16207; font-size: 13px;">
                        Configure your LHDN credentials to enable e-Invoice submission.
                    </p>
                </div>
            </div>
        `;
    }
}

function updateCompanyNameInUI() {
    const companyName = businessData.settings.businessName || "My Malaysian Business";
    document.title = `${companyName} - EZCubic Malaysia`;
    
    const welcomeCompanyName = document.getElementById('welcomeCompanyName');
    if (welcomeCompanyName) {
        welcomeCompanyName.textContent = `Welcome to ${companyName}!`;
    }
    
    const dashboardCompanyName = document.getElementById('dashboardCompanyName');
    if (dashboardCompanyName) {
        dashboardCompanyName.textContent = `${companyName} Dashboard`;
    }
}

// ==================== QUICK ACTION FUNCTIONS ====================
function quickAddIncome() {
    showSection('income');
}

function quickAddExpense() {
    showSection('expenses');
}

// ==================== SETTINGS FUNCTIONS ====================
function saveSettings() {
    businessData.settings.businessName = document.getElementById('businessName').value;
    businessData.settings.ssmNumber = document.getElementById('ssmNumber').value;
    businessData.settings.tinNumber = document.getElementById('tinNumber').value;
    businessData.settings.gstNumber = document.getElementById('gstNumber').value;
    businessData.settings.financialYearStart = document.getElementById('financialYearStart').value;
    businessData.settings.defaultTaxRate = parseFloat(document.getElementById('defaultTaxRate').value);
    
    document.getElementById('corporateTaxRate').value = businessData.settings.defaultTaxRate;
    
    if (saveData()) {
        updateCompanyNameInUI();
        updateMalaysianTaxEstimator();
        showNotification('Settings saved successfully!', 'success');
    }
}

// Show/Hide Backup Help Tooltip
function showBackupHelpTooltip() {
    const tooltip = document.getElementById('backupHelpTooltip');
    if (tooltip) {
        tooltip.style.display = tooltip.style.display === 'none' ? 'block' : 'none';
    }
}

// Generic Help Tooltip Toggle
function toggleHelpTooltip(tooltipId) {
    // Close all other tooltips first
    document.querySelectorAll('.help-tooltip-box').forEach(t => {
        if (t.id !== tooltipId) {
            t.style.display = 'none';
        }
    });
    
    const tooltip = document.getElementById(tooltipId);
    if (tooltip) {
        tooltip.style.display = tooltip.style.display === 'none' ? 'block' : 'none';
    }
}

// Export functions to window for onclick handlers
window.showSection = showSection;
window.toggleMobileMenu = toggleMobileMenu;
window.closeMobileMenu = closeMobileMenu;
window.hideWelcomeBanner = hideWelcomeBanner;
window.showTaxTab = showTaxTab;
window.quickAddIncome = quickAddIncome;
window.quickAddExpense = quickAddExpense;
window.saveSettings = saveSettings;
window.updateCompanyNameInUI = updateCompanyNameInUI;
window.showBackupHelpTooltip = showBackupHelpTooltip;
window.toggleHelpTooltip = toggleHelpTooltip;
