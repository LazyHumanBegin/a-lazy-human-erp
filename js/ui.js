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
    } else if (sectionId === 'crm') {
        // Reload CRM customers from localStorage to get fresh data (e.g., after POS sale)
        if (typeof loadCRMCustomers === 'function') loadCRMCustomers();
        if (typeof renderCRMCustomers === 'function') renderCRMCustomers();
        if (typeof updateCRMStats === 'function') updateCRMStats();
    } else if (sectionId === 'customers') {
        if (typeof initializeCustomers === 'function') initializeCustomers();
    } else if (sectionId === 'stock') {
        if (typeof initializeStock === 'function') initializeStock();
        if (typeof renderStockMovements === 'function') renderStockMovements();
    } else if (sectionId === 'orders') {
        if (typeof initializeOrders === 'function') initializeOrders();
    } else if (sectionId === 'bom') {
        if (typeof showBOMSection === 'function') showBOMSection();
    } else if (sectionId === 'invoices') {
        if (typeof initializeInvoices === 'function') initializeInvoices();
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
    // Settings section - load company logo preview and document numbering
    else if (sectionId === 'settings') {
        if (typeof loadCompanyLogo === 'function') loadCompanyLogo();
        if (typeof loadDocumentNumberingSettings === 'function') loadDocumentNumberingSettings();
        if (typeof loadCommissionSettings === 'function') loadCommissionSettings();
    }
    
    // Update AI contextual help for the current section
    if (typeof updateContextualHelp === 'function') {
        updateContextualHelp(sectionId);
    }
    
    // Scroll main content to top (not sidebar)
    const mainContent = document.querySelector('.main-content');
    if (mainContent) {
        mainContent.scrollTo({ top: 0, behavior: 'instant' });
    }
    
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
    document.title = `Smart Business Management Platform - ERP by A Lazy Human`;
    
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
    // Block staff/manager from saving company settings
    const currentUser = JSON.parse(localStorage.getItem('ezcubic_current_user') || '{}');
    if (currentUser.role === 'staff' || currentUser.role === 'manager') {
        showNotification('Only Business Admin can change company settings', 'error');
        return;
    }
    
    businessData.settings.businessName = document.getElementById('businessName').value;
    businessData.settings.ssmNumber = document.getElementById('ssmNumber').value;
    businessData.settings.tinNumber = document.getElementById('tinNumber').value;
    businessData.settings.gstNumber = document.getElementById('gstNumber').value;
    businessData.settings.financialYearStart = document.getElementById('financialYearStart').value;
    businessData.settings.defaultTaxRate = parseFloat(document.getElementById('defaultTaxRate').value);
    
    // Company contact details for quotations/invoices
    const addressEl = document.getElementById('businessAddress');
    const phoneEl = document.getElementById('businessPhone');
    const emailEl = document.getElementById('businessEmail');
    const websiteEl = document.getElementById('businessWebsite');
    const bankEl = document.getElementById('businessBankAccount');
    
    if (addressEl) businessData.settings.businessAddress = addressEl.value;
    if (phoneEl) businessData.settings.businessPhone = phoneEl.value;
    if (emailEl) businessData.settings.businessEmail = emailEl.value;
    if (websiteEl) businessData.settings.businessWebsite = websiteEl.value;
    if (bankEl) businessData.settings.businessBankAccount = bankEl.value;
    
    // Also save to localStorage for quick access
    localStorage.setItem('ezcubic_business_address', addressEl?.value || '');
    localStorage.setItem('ezcubic_business_phone', phoneEl?.value || '');
    localStorage.setItem('ezcubic_business_email', emailEl?.value || '');
    localStorage.setItem('ezcubic_business_website', websiteEl?.value || '');
    localStorage.setItem('ezcubic_business_bank', bankEl?.value || '');
    
    // Document Numbering Settings
    saveDocumentNumberingSettings();
    
    document.getElementById('corporateTaxRate').value = businessData.settings.defaultTaxRate;
    
    if (saveData()) {
        updateCompanyNameInUI();
        updateMalaysianTaxEstimator();
        showNotification('Settings saved successfully!', 'success');
    }
}

// Save Document Numbering Settings
function saveDocumentNumberingSettings() {
    const separator = document.getElementById('docNumSeparator')?.value || '-';
    const yearFormat = document.getElementById('docNumYearFormat')?.value || 'YYMM';
    const padding = parseInt(document.getElementById('docNumPadding')?.value) || 4;
    const reset = document.getElementById('docNumReset')?.value || 'never';
    
    const docTypes = ['Quotation', 'Invoice', 'Receipt', 'PurchaseOrder', 'DeliveryOrder', 'SalesOrder'];
    const documents = {};
    
    docTypes.forEach(type => {
        const prefixEl = document.getElementById(`docPrefix${type}`);
        const nextEl = document.getElementById(`docNext${type}`);
        documents[type.toLowerCase()] = {
            prefix: (prefixEl?.value || type.substring(0, 3)).toUpperCase(),
            next: parseInt(nextEl?.value) || 1
        };
    });
    
    businessData.settings.documentNumbering = {
        separator,
        yearFormat,
        padding,
        reset,
        documents,
        lastReset: businessData.settings.documentNumbering?.lastReset || new Date().toISOString().slice(0, 7)
    };
}

// Load Document Numbering Settings into UI
function loadDocumentNumberingSettings() {
    const settings = businessData.settings?.documentNumbering || getDefaultDocumentNumbering();
    
    // Global settings
    const separatorEl = document.getElementById('docNumSeparator');
    const yearFormatEl = document.getElementById('docNumYearFormat');
    const paddingEl = document.getElementById('docNumPadding');
    const resetEl = document.getElementById('docNumReset');
    
    if (separatorEl) separatorEl.value = settings.separator || '-';
    if (yearFormatEl) yearFormatEl.value = settings.yearFormat || 'YYMM';
    if (paddingEl) paddingEl.value = settings.padding || 4;
    if (resetEl) resetEl.value = settings.reset || 'never';
    
    // Per-document settings
    const docTypes = ['Quotation', 'Invoice', 'Receipt', 'PurchaseOrder', 'DeliveryOrder', 'SalesOrder'];
    const defaultPrefixes = { quotation: 'QUO', invoice: 'INV', receipt: 'RCP', purchaseorder: 'PO', deliveryorder: 'DO', salesorder: 'SO' };
    
    docTypes.forEach(type => {
        const key = type.toLowerCase();
        const doc = settings.documents?.[key] || { prefix: defaultPrefixes[key], next: 1 };
        
        const prefixEl = document.getElementById(`docPrefix${type}`);
        const nextEl = document.getElementById(`docNext${type}`);
        
        if (prefixEl) prefixEl.value = doc.prefix || defaultPrefixes[key];
        if (nextEl) nextEl.value = doc.next || 1;
    });
    
    updateDocNumberPreview();
}

// Get default document numbering settings
function getDefaultDocumentNumbering() {
    return {
        separator: '-',
        yearFormat: 'YYMM',
        padding: 4,
        reset: 'never',
        documents: {
            quotation: { prefix: 'QUO', next: 1 },
            invoice: { prefix: 'INV', next: 1 },
            receipt: { prefix: 'RCP', next: 1 },
            purchaseorder: { prefix: 'PO', next: 1 },
            deliveryorder: { prefix: 'DO', next: 1 },
            salesorder: { prefix: 'SO', next: 1 }
        },
        lastReset: new Date().toISOString().slice(0, 7)
    };
}

// Update preview for all document types
function updateDocNumberPreview() {
    const docTypes = ['Quotation', 'Invoice', 'Receipt', 'PurchaseOrder', 'DeliveryOrder', 'SalesOrder'];
    
    docTypes.forEach(type => {
        const prefixEl = document.getElementById(`docPrefix${type}`);
        const nextEl = document.getElementById(`docNext${type}`);
        const previewEl = document.getElementById(`preview${type}`);
        
        if (prefixEl && nextEl && previewEl) {
            const prefix = prefixEl.value.toUpperCase() || type.substring(0, 3).toUpperCase();
            const next = parseInt(nextEl.value) || 1;
            previewEl.textContent = formatDocumentNumber(prefix, next);
        }
    });
}

// Format document number with current settings
function formatDocumentNumber(prefix, number) {
    const separator = document.getElementById('docNumSeparator')?.value || '-';
    const yearFormat = document.getElementById('docNumYearFormat')?.value || 'YYMM';
    const padding = parseInt(document.getElementById('docNumPadding')?.value) || 4;
    
    const now = new Date();
    let yearPart = '';
    
    switch(yearFormat) {
        case 'YYMM':
            yearPart = now.getFullYear().toString().slice(-2) + String(now.getMonth() + 1).padStart(2, '0');
            break;
        case 'YY':
            yearPart = now.getFullYear().toString().slice(-2);
            break;
        case 'YYYY':
            yearPart = now.getFullYear().toString();
            break;
        default:
            yearPart = '';
    }
    
    const numPart = String(number).padStart(padding, '0');
    
    if (yearPart) {
        return `${prefix}${separator}${yearPart}${separator}${numPart}`;
    } else {
        return `${prefix}${separator}${numPart}`;
    }
}

// Generate next document number for a given type
function generateDocumentNumber(type) {
    // type: 'quotation', 'invoice', 'receipt', 'purchaseorder', 'deliveryorder', 'salesorder'
    const settings = businessData.settings?.documentNumbering || getDefaultDocumentNumbering();
    const doc = settings.documents?.[type] || { prefix: type.toUpperCase().substring(0, 3), next: 1 };
    
    // Check if we need to reset based on settings
    checkAndResetSequence(settings);
    
    const separator = settings.separator || '-';
    const yearFormat = settings.yearFormat || 'YYMM';
    const padding = settings.padding || 4;
    
    const now = new Date();
    let yearPart = '';
    
    switch(yearFormat) {
        case 'YYMM':
            yearPart = now.getFullYear().toString().slice(-2) + String(now.getMonth() + 1).padStart(2, '0');
            break;
        case 'YY':
            yearPart = now.getFullYear().toString().slice(-2);
            break;
        case 'YYYY':
            yearPart = now.getFullYear().toString();
            break;
        default:
            yearPart = '';
    }
    
    const numPart = String(doc.next).padStart(padding, '0');
    
    let docNumber;
    if (yearPart) {
        docNumber = `${doc.prefix}${separator}${yearPart}${separator}${numPart}`;
    } else {
        docNumber = `${doc.prefix}${separator}${numPart}`;
    }
    
    // Increment the next number
    if (!businessData.settings.documentNumbering) {
        businessData.settings.documentNumbering = getDefaultDocumentNumbering();
    }
    if (!businessData.settings.documentNumbering.documents) {
        businessData.settings.documentNumbering.documents = getDefaultDocumentNumbering().documents;
    }
    if (!businessData.settings.documentNumbering.documents[type]) {
        businessData.settings.documentNumbering.documents[type] = { prefix: doc.prefix, next: 1 };
    }
    businessData.settings.documentNumbering.documents[type].next = doc.next + 1;
    
    // Save to tenant storage
    saveData();
    
    return docNumber;
}

// Check and reset sequence if needed (based on yearly/monthly settings)
function checkAndResetSequence(settings) {
    if (settings.reset === 'never') return;
    
    const now = new Date();
    const currentPeriod = settings.reset === 'yearly' 
        ? now.getFullYear().toString()
        : now.toISOString().slice(0, 7); // YYYY-MM
    
    const lastReset = settings.lastReset || currentPeriod;
    
    if (lastReset !== currentPeriod) {
        // Reset all sequences
        Object.keys(settings.documents).forEach(type => {
            settings.documents[type].next = 1;
        });
        settings.lastReset = currentPeriod;
        
        console.log(`[Doc Numbering] Sequences reset for new ${settings.reset === 'yearly' ? 'year' : 'month'}`);
    }
}

// Export functions to window
window.saveDocumentNumberingSettings = saveDocumentNumberingSettings;
window.loadDocumentNumberingSettings = loadDocumentNumberingSettings;
window.getDefaultDocumentNumbering = getDefaultDocumentNumbering;
window.updateDocNumberPreview = updateDocNumberPreview;
window.formatDocumentNumber = formatDocumentNumber;
window.generateDocumentNumber = generateDocumentNumber;

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
