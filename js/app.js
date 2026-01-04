// ==================== APP.JS ====================
// Application Initialization

// ==================== INITIALIZE APP ====================
function initializeApp() {
    // Wait if tenant data is still loading (max 20 retries = 2000ms)
    // Cloud sync can take time, so we need to wait longer
    if (window._isLoadingUserData) {
        window._initAppRetries = (window._initAppRetries || 0) + 1;
        if (window._initAppRetries < 20) {
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
        // DEBUG: Check what we have BEFORE loadData
        console.log('🟡 BEFORE loadData: window.businessData.transactions =', window.businessData?.transactions?.length || 0);
        
        // Load data - this will merge with any existing tenant data
        // loadData now has smart merge logic that preserves tenant data if it has more items
        loadData();
        
        // DEBUG: Log what we have AFTER loadData
        console.log('🟡 AFTER loadData: window.businessData.transactions =', window.businessData?.transactions?.length || 0);
        console.log('🟡 AFTER loadData: window.transactions =', window.transactions?.length || 0);
        
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
        
        // CRITICAL: Re-apply user permissions and fix sidebar on page load/refresh
        // Use multiple attempts to ensure it happens after all async loads complete
        const applyPermissionsAndFixSidebar = () => {
            // Safety: Remove preview mode if session exists
            const sessionData = localStorage.getItem('ezcubic_currentUser');
            if (sessionData && typeof removeViewOnlyMode === 'function') {
                removeViewOnlyMode();
            }
            
            if (typeof applyUserPermissions === 'function') {
                console.log('🎨 Applying user permissions on app init...');
                applyUserPermissions();
            }
            if (typeof resetNavCategoryStates === 'function') {
                console.log('🎨 Resetting nav category states on app init...');
                resetNavCategoryStates();
            }
        };
        
        // Apply immediately, then again after delays to catch late-loading async data
        setTimeout(applyPermissionsAndFixSidebar, 100);
        setTimeout(applyPermissionsAndFixSidebar, 500);
        setTimeout(applyPermissionsAndFixSidebar, 1000);
        
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
        
        // Initialize Notifications System
        if (typeof initializeNotifications === 'function') {
            initializeNotifications();
        }
        
        // Initialize BOM (Bill of Materials)
        if (typeof initializeBOM === 'function') {
            initializeBOM();
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

// ==================== OUTLET MANAGEMENT ====================
function loadOutlets() {
    // PRIORITY 1: Load from tenant storage directly
    const user = window.currentUser;
    if (user && user.tenantId) {
        const tenantKey = 'ezcubic_tenant_' + user.tenantId;
        const tenantData = JSON.parse(localStorage.getItem(tenantKey) || '{}');
        if (Array.isArray(tenantData.outlets) && tenantData.outlets.length > 0) {
            outlets = tenantData.outlets;
            window.outlets = outlets;
            console.log('✅ Outlets loaded from tenant:', outlets.length);
            renderOutletDropdowns();
            return;
        }
    }
    
    // PRIORITY 2: Load from localStorage
    const stored = localStorage.getItem(OUTLETS_KEY);
    if (stored) {
        outlets = JSON.parse(stored);
        console.log('✅ Outlets loaded from localStorage:', outlets.length);
    } else {
        // Default outlets - only create if nothing exists
        outlets = [
            { id: 'outlet1', name: 'Main Branch', status: 'active' }
        ];
        saveOutlets();
    }
    window.outlets = outlets;
    renderOutletDropdowns();
}

function saveOutlets() {
    localStorage.setItem(OUTLETS_KEY, JSON.stringify(outlets));
    window.outlets = outlets;
    
    // DIRECT tenant save
    const user = window.currentUser;
    if (user && user.tenantId) {
        const tenantKey = 'ezcubic_tenant_' + user.tenantId;
        let tenantData = JSON.parse(localStorage.getItem(tenantKey) || '{}');
        tenantData.outlets = outlets;
        tenantData.updatedAt = new Date().toISOString();
        localStorage.setItem(tenantKey, JSON.stringify(tenantData));
        console.log('✅ Outlets saved directly to tenant:', outlets.length);
    }
}

function renderOutletDropdowns() {
    // Get elements
    const productOutletCheckboxes = document.getElementById('productOutletCheckboxes');
    const posOutletFilter = document.getElementById('posOutletFilter');
    const posOutletFilterContainer = posOutletFilter?.closest('.pos-outlet-filter');
    const manageOutletsBtn = productOutletCheckboxes?.parentElement?.querySelector('button[onclick*="showOutletModal"]');
    const posManageOutletsBtn = posOutletFilterContainer?.querySelector('button[onclick*="showOutletModal"]');
    
    // ALWAYS hide the manage outlets button in product form - outlets/branches are managed in Branches section
    if (manageOutletsBtn) {
        manageOutletsBtn.style.display = 'none';
    }
    
    // Default: restricted (safe default)
    let isRestricted = true;
    let branchLimit = 1;
    
    // Get current user's plan and check limits
    const currentUser = window.currentUser || (typeof getCurrentUser === 'function' ? getCurrentUser() : null);
    const settings = typeof getPlatformSettings === 'function' ? getPlatformSettings() : null;
    
    console.log('renderOutletDropdowns - currentUser:', currentUser?.name, 'role:', currentUser?.role, 'plan:', currentUser?.plan);
    
    if (currentUser) {
        // Founder and ERP Assistant have unlimited access
        if (currentUser.role === 'founder' || currentUser.role === 'erp_assistant') {
            isRestricted = false;
            branchLimit = -1; // Unlimited
        } else {
            const userPlan = currentUser.plan || 'starter';
            
            // Check plan directly - Professional and Enterprise always get multi-outlet
            if (userPlan === 'professional' || userPlan === 'premium') {
                isRestricted = false;
            }
            
            // Also check via settings if available
            if (settings && settings.plans) {
                const planData = settings.plans[userPlan];
                if (planData && planData.limits) {
                    branchLimit = planData.limits.branches;
                    // Unrestricted if branches > 1 or unlimited (-1)
                    if (branchLimit === -1 || branchLimit > 1) {
                        isRestricted = false;
                    }
                }
            }
        }
    }
    
    console.log('renderOutletDropdowns - isRestricted:', isRestricted, 'branchLimit:', branchLimit);
    
    // Use branches as the source (synced from Branches module)
    const availableBranches = window.branches || [];
    console.log('renderOutletDropdowns - availableBranches:', availableBranches.length);
    
    // Handle POS outlet filter section
    if (posOutletFilterContainer) {
        if (isRestricted || availableBranches.length <= 1) {
            // Hide entire POS outlet filter section for plans without multi-outlet or single branch
            posOutletFilterContainer.style.display = 'none';
        } else {
            // Show outlet filter
            posOutletFilterContainer.style.display = '';
            
            // Hide manage button on POS
            if (posManageOutletsBtn) {
                posManageOutletsBtn.style.display = 'none';
            }
            
            // Populate outlet options from branches
            const optionsHTML = availableBranches
                .filter(b => b.status === 'active')
                .map(b => `<option value="${b.id}">${escapeHtml(b.name)}</option>`)
                .join('');
            
            const currentValue = posOutletFilter.value;
            posOutletFilter.innerHTML = `<option value="all">All Outlets</option>${optionsHTML}`;
            if (currentValue) posOutletFilter.value = currentValue;
        }
    }
    
    // Generate checkboxes for product form using branches
    if (productOutletCheckboxes) {
        if (isRestricted) {
            productOutletCheckboxes.innerHTML = `
                <div style="padding: 12px; background: #fef3c7; border-radius: 8px; color: #92400e; font-size: 13px; border: 1px solid #fcd34d;">
                    <i class="fas fa-lock" style="margin-right: 8px; color: #f59e0b;"></i>
                    <strong>Multi-outlet feature</strong> requires Professional plan (with branches) or Enterprise plan.
                    <input type="checkbox" value="all" checked style="display: none;">
                </div>
            `;
        } else if (availableBranches.length === 0) {
            // No branches created yet
            productOutletCheckboxes.innerHTML = `
                <div style="padding: 12px; background: #e0f2fe; border-radius: 8px; color: #0369a1; font-size: 13px; border: 1px solid #7dd3fc;">
                    <i class="fas fa-info-circle" style="margin-right: 8px;"></i>
                    No outlets/branches created yet. Go to <strong>Branches</strong> section to add outlets.
                    <input type="checkbox" value="all" checked style="display: none;">
                </div>
            `;
        } else {
            // Show branches as checkboxes (read-only selection, no add/remove)
            const activeBranches = availableBranches.filter(b => b.status === 'active');
            const maxSelectable = branchLimit === -1 ? -1 : branchLimit;
            
            const checkboxesHTML = `
                <label class="outlet-checkbox-item checked" onclick="toggleOutletCheckbox(this, ${maxSelectable})">
                    <input type="checkbox" value="all" checked>
                    <i class="fas fa-check"></i>
                    <span>All Outlets</span>
                </label>
                ${activeBranches.map(b => `
                    <label class="outlet-checkbox-item" onclick="toggleOutletCheckbox(this, ${maxSelectable})">
                        <input type="checkbox" value="${b.id}">
                        <i class="fas fa-check"></i>
                        <span>${escapeHtml(b.name)} (${escapeHtml(b.code || '')})</span>
                    </label>
                `).join('')}
                ${branchLimit !== -1 ? `
                    <div style="width: 100%; font-size: 11px; color: #64748b; margin-top: 5px;">
                        <i class="fas fa-info-circle"></i> Your plan allows up to ${branchLimit} outlets. Manage outlets in Branches section.
                    </div>
                ` : `
                    <div style="width: 100%; font-size: 11px; color: #64748b; margin-top: 5px;">
                        <i class="fas fa-info-circle"></i> Manage outlets in Branches section.
                    </div>
                `}
            `;
            productOutletCheckboxes.innerHTML = checkboxesHTML;
        }
    }
}

function toggleOutletCheckbox(label, maxSelectable = -1) {
    const checkbox = label.querySelector('input[type="checkbox"]');
    const isAllOutlets = checkbox.value === 'all';
    const container = label.closest('.outlet-checkbox-container');
    
    if (isAllOutlets) {
        // If clicking "All Outlets", uncheck all others
        if (!checkbox.checked) {
            checkbox.checked = true;
            label.classList.add('checked');
            // Uncheck all other checkboxes
            container.querySelectorAll('input[type="checkbox"]').forEach(cb => {
                if (cb.value !== 'all') {
                    cb.checked = false;
                    cb.closest('label').classList.remove('checked');
                }
            });
        }
    } else {
        // Check if we're at the limit before allowing selection
        if (!checkbox.checked && maxSelectable !== -1) {
            const currentlySelected = container.querySelectorAll('input[type="checkbox"]:checked:not([value="all"])').length;
            if (currentlySelected >= maxSelectable) {
                if (typeof showToast === 'function') {
                    showToast(`Your plan allows max ${maxSelectable} outlets. Upgrade for more.`, 'warning');
                }
                return; // Don't allow selecting more
            }
        }
        
        // Toggle this checkbox
        checkbox.checked = !checkbox.checked;
        label.classList.toggle('checked', checkbox.checked);
        
        // If any specific outlet is checked, uncheck "All Outlets"
        const allCheckbox = container.querySelector('input[value="all"]');
        const specificChecked = container.querySelectorAll('input[type="checkbox"]:checked:not([value="all"])').length > 0;
        
        if (specificChecked) {
            allCheckbox.checked = false;
            allCheckbox.closest('label').classList.remove('checked');
        } else {
            // If nothing selected, default to "All Outlets"
            allCheckbox.checked = true;
            allCheckbox.closest('label').classList.add('checked');
        }
    }
}

function getSelectedOutlets() {
    const container = document.getElementById('productOutletCheckboxes');
    if (!container) return ['all'];
    
    const checkedBoxes = container.querySelectorAll('input[type="checkbox"]:checked');
    const values = Array.from(checkedBoxes).map(cb => cb.value);
    
    // If "all" is selected or nothing selected, return ['all']
    if (values.includes('all') || values.length === 0) {
        return ['all'];
    }
    return values;
}

function setSelectedOutlets(outletIds) {
    const container = document.getElementById('productOutletCheckboxes');
    if (!container) return;
    
    // If container only has the locked message (restricted plan), skip
    const checkboxes = container.querySelectorAll('input[type="checkbox"]:not([style*="display: none"])');
    if (checkboxes.length === 0) return;
    
    // Normalize to array
    let ids = outletIds;
    if (!Array.isArray(ids)) {
        ids = ids ? [ids] : ['all'];
    }
    if (ids.length === 0) ids = ['all'];
    
    // Uncheck all first
    container.querySelectorAll('input[type="checkbox"]').forEach(cb => {
        cb.checked = false;
        const label = cb.closest('label');
        if (label) label.classList.remove('checked');
    });
    
    // Check the specified outlets
    ids.forEach(id => {
        const cb = container.querySelector(`input[value="${id}"]`);
        if (cb) {
            cb.checked = true;
            const label = cb.closest('label');
            if (label) label.classList.add('checked');
        }
    });
}

function showOutletModal() {
    renderOutletList();
    const outletModal = document.getElementById('outletModal');
    if (outletModal) {
        outletModal.style.display = '';
        outletModal.classList.add('show');
    }
    
    const newOutletInput = document.getElementById('newOutletName');
    const addButton = newOutletInput?.nextElementSibling;
    const addSection = newOutletInput?.closest('div[style*="margin-bottom"]');
    
    // Check branch/outlet limit and show/hide add section
    if (typeof checkLimit === 'function') {
        const limitInfo = checkLimit('branches');
        const totalOutlets = outlets.length + (typeof branches !== 'undefined' ? branches.length : 0);
        
        if (limitInfo && limitInfo.limit !== -1 && totalOutlets >= limitInfo.limit) {
            // At limit - replace add section with upgrade message
            if (addSection) {
                addSection.innerHTML = `
                    <div style="padding: 15px; background: #fef3c7; border-radius: 8px; text-align: center;">
                        <i class="fas fa-exclamation-triangle" style="color: #f59e0b;"></i>
                        <p style="color: #92400e; margin: 8px 0 0;">
                            Branch/Outlet limit reached (${limitInfo.limit}).<br>
                            <a href="#" onclick="closeModal('outletModal'); if(typeof showUpgradePlanModal === 'function') showUpgradePlanModal('branches'); return false;" style="color: #2563eb; font-weight: 600;">Upgrade your plan</a> for more branches/outlets.
                        </p>
                    </div>
                `;
            }
            return;
        }
    }
    
    // Reset the add section if it was replaced
    if (addSection && !addSection.querySelector('#newOutletName')) {
        addSection.innerHTML = `
            <label class="form-label">Add New Outlet</label>
            <div style="display: flex; gap: 8px;">
                <input type="text" id="newOutletName" class="form-control" placeholder="e.g., Main Branch, Outlet KL">
                <button type="button" class="btn-primary" onclick="addOutlet()">
                    <i class="fas fa-plus"></i> Add
                </button>
            </div>
        `;
    }
    
    document.getElementById('newOutletName')?.focus();
}

function renderOutletList() {
    const container = document.getElementById('outletList');
    if (!container) return;
    
    if (outlets.length === 0) {
        container.innerHTML = '<p style="color: #94a3b8; text-align: center; padding: 20px;">No outlets added yet</p>';
        return;
    }
    
    container.innerHTML = outlets.map(outlet => `
        <div class="outlet-item" style="display: flex; align-items: center; justify-content: space-between; padding: 12px; background: #f8fafc; border-radius: 8px; margin-bottom: 8px;">
            <div style="display: flex; align-items: center; gap: 10px;">
                <i class="fas fa-store" style="color: #2563eb;"></i>
                <span style="font-weight: 500;">${escapeHtml(outlet.name)}</span>
            </div>
            <div style="display: flex; gap: 5px;">
                <button type="button" class="btn-outline btn-sm" onclick="editOutlet('${outlet.id}')" title="Edit">
                    <i class="fas fa-edit"></i>
                </button>
                <button type="button" class="btn-outline btn-sm danger" onclick="deleteOutlet('${outlet.id}')" title="Delete">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
    `).join('');
}

function addOutlet() {
    // Check branch/outlet limit before adding
    if (typeof canAdd === 'function' && !canAdd('branches')) {
        closeModal('outletModal');
        return; // Limit reached, modal shown by canAdd()
    }
    
    const nameInput = document.getElementById('newOutletName');
    const name = nameInput.value.trim();
    
    if (!name) {
        showToast('Please enter an outlet name', 'error');
        return;
    }
    
    // Check for duplicate
    if (outlets.some(o => o.name.toLowerCase() === name.toLowerCase())) {
        showToast('Outlet with this name already exists', 'error');
        return;
    }
    
    const newOutlet = {
        id: 'outlet_' + Date.now(),
        name: name
    };
    
    outlets.push(newOutlet);
    saveOutlets();
    renderOutletDropdowns();
    renderOutletList();
    
    nameInput.value = '';
    showToast('Outlet added successfully!', 'success');
}

function editOutlet(outletId) {
    const outlet = outlets.find(o => o.id === outletId);
    if (!outlet) return;
    
    const newName = prompt('Edit outlet name:', outlet.name);
    if (newName === null) return;
    
    const trimmedName = newName.trim();
    if (!trimmedName) {
        showToast('Outlet name cannot be empty', 'error');
        return;
    }
    
    // Check for duplicate (excluding current)
    if (outlets.some(o => o.id !== outletId && o.name.toLowerCase() === trimmedName.toLowerCase())) {
        showToast('Outlet with this name already exists', 'error');
        return;
    }
    
    outlet.name = trimmedName;
    saveOutlets();
    renderOutletDropdowns();
    renderOutletList();
    showToast('Outlet updated!', 'success');
}

function deleteOutlet(outletId) {
    const outlet = outlets.find(o => o.id === outletId);
    if (!outlet) return;
    
    if (!confirm(`Delete outlet "${outlet.name}"? Products assigned to this outlet will still exist.`)) {
        return;
    }
    
    outlets = outlets.filter(o => o.id !== outletId);
    saveOutlets();
    renderOutletDropdowns();
    renderOutletList();
    showToast('Outlet deleted!', 'success');
}

// Load Phase 2 data from localStorage
// NOTE: This should respect window globals if already set by loadUserTenantData()
function loadPhase2Data() {
    try {
        // CRITICAL: If loadUserTenantData already ran, use window globals instead of localStorage
        // This prevents loading stale data from previous user session
        
        // Load products - prefer window global
        if (window.products && window.products.length > 0) {
            products = window.products;
        } else {
            const storedProducts = localStorage.getItem(PRODUCTS_KEY);
            if (storedProducts) {
                products = JSON.parse(storedProducts);
            }
        }
        
        // Load customers - prefer window global
        if (window.customers && window.customers.length > 0) {
            customers = window.customers;
        } else {
            const storedCustomers = localStorage.getItem(CUSTOMERS_KEY);
            if (storedCustomers) {
                customers = JSON.parse(storedCustomers);
            }
        }
        
        // Load stock movements - prefer window global
        if (window.stockMovements && window.stockMovements.length > 0) {
            stockMovements = window.stockMovements;
        } else {
            const storedMovements = localStorage.getItem(STOCK_MOVEMENTS_KEY);
            if (storedMovements) {
                stockMovements = JSON.parse(storedMovements);
            }
        }
        
        // Load sales - prefer window global
        if (window.sales && window.sales.length > 0) {
            sales = window.sales;
        } else {
            const storedSales = localStorage.getItem(SALES_KEY);
            if (storedSales) {
                sales = JSON.parse(storedSales);
            }
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
    // Wait for tenant data to load before initializing app
    // User system loads at 0ms, tenant data loads with 200ms delay
    // So we wait 300ms to ensure tenant data is ready
    setTimeout(initializeApp, 300);
    
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

// Export new functions
window.checkBackupReminder = checkBackupReminder;
window.dismissBackupReminder = dismissBackupReminder;
window.backupNow = backupNow;
window.showKeyboardShortcuts = showKeyboardShortcuts;

// ==================== BANK ACCOUNT MANAGEMENT ====================
function showAddBankAccountModal() {
    const modalHTML = `
        <div class="modal" id="addBankAccountModal" style="display: block;">
            <div class="modal-content" style="max-width: 500px;">
                <div class="modal-header">
                    <h3 class="modal-title">
                        <i class="fas fa-university"></i> Add Bank Account
                    </h3>
                    <button class="close-modal" onclick="closeAddBankAccountModal()">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="form-group">
                        <label>Bank Name</label>
                        <select id="newBankName" onchange="handleBankSelect()">
                            <option value="">-- Select Bank --</option>
                            <option value="Maybank">Maybank</option>
                            <option value="CIMB">CIMB Bank</option>
                            <option value="Public Bank">Public Bank</option>
                            <option value="RHB">RHB Bank</option>
                            <option value="Hong Leong">Hong Leong Bank</option>
                            <option value="AmBank">AmBank</option>
                            <option value="Bank Islam">Bank Islam</option>
                            <option value="Bank Rakyat">Bank Rakyat</option>
                            <option value="OCBC">OCBC Bank</option>
                            <option value="UOB">UOB Bank</option>
                            <option value="HSBC">HSBC Bank</option>
                            <option value="Standard Chartered">Standard Chartered</option>
                            <option value="Alliance Bank">Alliance Bank</option>
                            <option value="Affin Bank">Affin Bank</option>
                            <option value="BSN">Bank Simpanan Nasional</option>
                            <option value="other">Other...</option>
                        </select>
                    </div>
                    <div class="form-group" id="customBankNameGroup" style="display: none;">
                        <label>Custom Bank Name</label>
                        <input type="text" id="customBankName" placeholder="Enter bank name">
                    </div>
                    <div class="form-group">
                        <label>Account Number</label>
                        <input type="text" id="newAccountNumber" placeholder="e.g., 1234-5678-9012">
                    </div>
                    <div class="form-group">
                        <label>Account Type</label>
                        <select id="newAccountType">
                            <option value="current">Current Account</option>
                            <option value="savings">Savings Account</option>
                            <option value="fixed">Fixed Deposit</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Current Balance (RM)</label>
                        <input type="number" id="newAccountBalance" placeholder="0.00" step="0.01">
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn-primary" onclick="saveBankAccount()">
                        <i class="fas fa-save"></i> Add Account
                    </button>
                    <button class="btn-secondary" onclick="closeAddBankAccountModal()">
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

function handleBankSelect() {
    const select = document.getElementById('newBankName');
    const customGroup = document.getElementById('customBankNameGroup');
    if (select.value === 'other') {
        customGroup.style.display = 'block';
    } else {
        customGroup.style.display = 'none';
    }
}

function closeAddBankAccountModal() {
    document.getElementById('addBankAccountModal')?.remove();
}

function saveBankAccount() {
    let bankName = document.getElementById('newBankName').value;
    if (bankName === 'other') {
        bankName = document.getElementById('customBankName').value;
    }
    
    const accountNumber = document.getElementById('newAccountNumber').value;
    const accountType = document.getElementById('newAccountType').value;
    const balance = parseFloat(document.getElementById('newAccountBalance').value) || 0;
    
    if (!bankName) {
        showNotification('Please select or enter a bank name', 'warning');
        return;
    }
    
    const accounts = safeLocalStorageGet(BANK_ACCOUNTS_KEY, []);
    
    const newAccount = {
        id: 'bank-' + Date.now(),
        bankName: bankName,
        accountNumber: accountNumber,
        accountType: accountType,
        balance: balance,
        createdAt: new Date().toISOString()
    };
    
    accounts.push(newAccount);
    safeLocalStorageSet(BANK_ACCOUNTS_KEY, accounts);
    
    closeAddBankAccountModal();
    loadBankAccounts();
    updateDetailedBalanceTotals();
    showNotification('Bank account added successfully!', 'success');
}

function loadBankAccounts() {
    const accounts = safeLocalStorageGet(BANK_ACCOUNTS_KEY, []);
    const container = document.getElementById('bankAccountsList');
    if (!container) return;
    
    let html = `
        <div class="balance-item">
            <span>Cash in Hand</span>
            <span class="balance-amount" id="bs-cash">RM 0.00</span>
        </div>
    `;
    
    accounts.forEach(account => {
        const accountLabel = account.accountNumber 
            ? `${account.bankName} (${maskAccountNumber(account.accountNumber)})`
            : account.bankName;
        
        html += `
            <div class="balance-item bank-account-item" data-account-id="${account.id}">
                <div style="flex-grow: 1;">
                    <div style="font-weight: 500;">${accountLabel}</div>
                    <div style="font-size: 11px; color: #64748b;">${getAccountTypeLabel(account.accountType)}</div>
                </div>
                <span class="balance-amount">
                    RM <input type="number" class="balance-input" id="${account.id}" 
                        value="${account.balance || ''}" placeholder="0.00" step="0.01" 
                        oninput="updateBankAccountBalance('${account.id}', this.value)">
                </span>
                <button class="remove-bank-btn" onclick="removeBankAccount('${account.id}')" title="Remove account">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;
    });
    
    container.innerHTML = html;
    
    updateDetailedBalanceTotals();
}

function maskAccountNumber(accountNumber) {
    if (!accountNumber || accountNumber.length < 4) return accountNumber;
    return '****' + accountNumber.slice(-4);
}

function getAccountTypeLabel(type) {
    const labels = {
        'current': 'Current Account',
        'savings': 'Savings Account',
        'fixed': 'Fixed Deposit'
    };
    return labels[type] || type;
}

function updateBankAccountBalance(accountId, value) {
    const accounts = safeLocalStorageGet(BANK_ACCOUNTS_KEY, []);
    const account = accounts.find(a => a.id === accountId);
    
    if (account) {
        account.balance = parseFloat(value) || 0;
        safeLocalStorageSet(BANK_ACCOUNTS_KEY, accounts);
        updateDetailedBalanceTotals();
    }
}

function removeBankAccount(accountId) {
    if (!confirm('Are you sure you want to remove this bank account?')) {
        return;
    }
    
    let accounts = safeLocalStorageGet(BANK_ACCOUNTS_KEY, []);
    accounts = accounts.filter(a => a.id !== accountId);
    safeLocalStorageSet(BANK_ACCOUNTS_KEY, accounts);
    
    loadBankAccounts();
    updateDetailedBalanceTotals();
    showNotification('Bank account removed', 'success');
}

// ==================== CREDIT CARD FUNCTIONS ====================
const CREDIT_CARDS_KEY = 'ezcubic_credit_cards';

function showAddCreditCardModal() {
    const modalHTML = `
        <div class="modal" id="addCreditCardModal" style="display: block;">
            <div class="modal-content" style="max-width: 500px;">
                <div class="modal-header">
                    <h3 class="modal-title">
                        <i class="fas fa-credit-card"></i> Add Credit Card
                    </h3>
                    <button class="close-modal" onclick="closeAddCreditCardModal()">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="form-group">
                        <label>Card Name / Bank</label>
                        <select id="newCardBank">
                            <option value="">-- Select Bank --</option>
                            <option value="Maybank">Maybank</option>
                            <option value="CIMB">CIMB Bank</option>
                            <option value="Public Bank">Public Bank</option>
                            <option value="RHB">RHB Bank</option>
                            <option value="Hong Leong">Hong Leong Bank</option>
                            <option value="AmBank">AmBank</option>
                            <option value="OCBC">OCBC Bank</option>
                            <option value="UOB">UOB Bank</option>
                            <option value="HSBC">HSBC Bank</option>
                            <option value="Standard Chartered">Standard Chartered</option>
                            <option value="Citibank">Citibank</option>
                            <option value="Alliance Bank">Alliance Bank</option>
                            <option value="Affin Bank">Affin Bank</option>
                            <option value="Other">Other</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Last 4 Digits of Card</label>
                        <input type="text" id="newCardLast4" placeholder="1234" maxlength="4" pattern="[0-9]{4}">
                        <div style="font-size: 11px; color: #64748b; margin-top: 4px;">Enter last 4 digits only</div>
                    </div>
                    <div class="form-group">
                        <label>Current Outstanding Balance (RM)</label>
                        <input type="number" id="newCardBalance" placeholder="0.00" step="0.01">
                        <div style="font-size: 11px; color: #64748b; margin-top: 4px;">Amount you currently owe</div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn-primary" onclick="saveCreditCard()">
                        <i class="fas fa-save"></i> Add Card
                    </button>
                    <button class="btn-secondary" onclick="closeAddCreditCardModal()">
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

function closeAddCreditCardModal() {
    document.getElementById('addCreditCardModal')?.remove();
}

function saveCreditCard() {
    const bankName = document.getElementById('newCardBank').value;
    const last4 = document.getElementById('newCardLast4').value;
    const balance = parseFloat(document.getElementById('newCardBalance').value) || 0;
    
    if (!bankName) {
        showNotification('Please select a bank/card issuer', 'warning');
        return;
    }
    
    if (!last4 || last4.length !== 4 || !/^\d{4}$/.test(last4)) {
        showNotification('Please enter valid last 4 digits', 'warning');
        return;
    }
    
    const cards = safeLocalStorageGet(CREDIT_CARDS_KEY, []);
    
    const newCard = {
        id: 'cc-' + Date.now(),
        bankName: bankName,
        last4: last4,
        balance: balance,
        createdAt: new Date().toISOString()
    };
    
    cards.push(newCard);
    safeLocalStorageSet(CREDIT_CARDS_KEY, cards);
    
    closeAddCreditCardModal();
    loadCreditCards();
    updateDetailedBalanceTotals();
    showNotification('Credit card added successfully!', 'success');
}

function loadCreditCards() {
    const cards = safeLocalStorageGet(CREDIT_CARDS_KEY, []);
    const container = document.getElementById('creditCardsList');
    if (!container) return;
    
    if (cards.length === 0) {
        container.innerHTML = '<div style="color: #94a3b8; font-size: 13px; padding: 10px 0;">No credit cards added</div>';
        return;
    }
    
    let html = '';
    
    cards.forEach(card => {
        html += `
            <div class="balance-item credit-card-item" data-card-id="${card.id}">
                <div style="flex-grow: 1;">
                    <div style="font-weight: 500;">${card.bankName}</div>
                    <div style="font-size: 11px; color: #64748b;">**** **** **** ${card.last4}</div>
                </div>
                <span class="balance-amount">
                    RM <input type="number" class="balance-input" id="${card.id}" 
                        value="${card.balance || ''}" placeholder="0.00" step="0.01" 
                        oninput="updateCreditCardBalance('${card.id}', this.value)">
                </span>
                <button class="remove-bank-btn" onclick="removeCreditCard('${card.id}')" title="Remove card">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;
    });
    
    container.innerHTML = html;
    updateDetailedBalanceTotals();
}

function updateCreditCardBalance(cardId, value) {
    const cards = safeLocalStorageGet(CREDIT_CARDS_KEY, []);
    const card = cards.find(c => c.id === cardId);
    
    if (card) {
        card.balance = parseFloat(value) || 0;
        safeLocalStorageSet(CREDIT_CARDS_KEY, cards);
        updateDetailedBalanceTotals();
    }
}

function removeCreditCard(cardId) {
    if (!confirm('Are you sure you want to remove this credit card?')) {
        return;
    }
    
    let cards = safeLocalStorageGet(CREDIT_CARDS_KEY, []);
    cards = cards.filter(c => c.id !== cardId);
    safeLocalStorageSet(CREDIT_CARDS_KEY, cards);
    
    loadCreditCards();
    updateDetailedBalanceTotals();
    showNotification('Credit card removed', 'success');
}

// ==================== BULK ENTRY FUNCTIONS ====================
function showBulkEntryModal() {
    const modalHTML = `
        <div class="modal" id="bulkEntryModal" style="display: block;">
            <div class="modal-content" style="max-width: 800px;">
                <div class="modal-header">
                    <h3 class="modal-title">
                        <i class="fas fa-history"></i> Bulk Entry for Old Transactions
                    </h3>
                    <button class="close-modal" onclick="closeBulkEntryModal()">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="bulk-entry-guide">
                        <h4>How to enter old business data:</h4>
                        <ol style="margin: 15px 0 15px 20px; color: #475569;">
                            <li>Enter your opening balances using the setup wizard</li>
                            <li>Add major transactions from the past 3-6 months</li>
                            <li>You don't need to enter every single transaction</li>
                            <li>Focus on large income and expense items</li>
                        </ol>
                    </div>
                    
                    <div class="bulk-entry-form">
                        <div class="form-row">
                            <div class="form-group">
                                <label>Starting Date</label>
                                <input type="date" id="bulkStartDate">
                            </div>
                            <div class="form-group">
                                <label>Ending Date</label>
                                <input type="date" id="bulkEndDate">
                            </div>
                        </div>
                        
                        <div class="quick-templates" style="margin: 20px 0;">
                            <h4>Quick Entry Templates:</h4>
                            <div style="display: flex; gap: 10px; flex-wrap: wrap; margin-top: 10px;">
                                <button class="template-btn" onclick="loadTemplate('monthly-rent')">
                                    <i class="fas fa-home"></i> Monthly Rent
                                </button>
                                <button class="template-btn" onclick="loadTemplate('utilities')">
                                    <i class="fas fa-bolt"></i> Utilities
                                </button>
                                <button class="template-btn" onclick="loadTemplate('salary')">
                                    <i class="fas fa-user-tie"></i> Monthly Salary
                                </button>
                                <button class="template-btn" onclick="loadTemplate('sales')">
                                    <i class="fas fa-chart-line"></i> Monthly Sales
                                </button>
                            </div>
                        </div>
                        
                        <div style="margin: 20px 0;">
                            <h4>Bulk Transactions</h4>
                            <div style="max-height: 300px; overflow-y: auto; border: 1px solid #e2e8f0; border-radius: 6px; padding: 10px;">
                                <table style="width: 100%;" id="bulkEntryTable">
                                    <thead>
                                        <tr>
                                            <th>Date</th>
                                            <th>Type</th>
                                            <th>Amount</th>
                                            <th>Description</th>
                                            <th></th>
                                        </tr>
                                    </thead>
                                    <tbody id="bulkEntries">
                                        <tr>
                                            <td><input type="date" class="bulk-input"></td>
                                            <td>
                                                <select class="bulk-input">
                                                    <option value="income">Income</option>
                                                    <option value="expense">Expense</option>
                                                </select>
                                            </td>
                                            <td><input type="number" class="bulk-input" placeholder="0.00" step="0.01"></td>
                                            <td><input type="text" class="bulk-input" placeholder="Description"></td>
                                            <td><button onclick="removeBulkRow(this)" style="background: none; border: none; color: #ef4444; cursor: pointer;"><i class="fas fa-times"></i></button></td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                            <button class="btn-secondary" onclick="addBulkRow()" style="margin-top: 10px; width: 100%;">
                                <i class="fas fa-plus"></i> Add Row
                            </button>
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn-primary" onclick="processBulkEntries()">
                        <i class="fas fa-save"></i> Save All Entries
                    </button>
                    <button class="btn-secondary" onclick="closeBulkEntryModal()">
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

function addBulkRow() {
    const tbody = document.getElementById('bulkEntries');
    const newRow = document.createElement('tr');
    newRow.innerHTML = `
        <td><input type="date" class="bulk-input"></td>
        <td>
            <select class="bulk-input">
                <option value="income">Income</option>
                <option value="expense">Expense</option>
            </select>
        </td>
        <td><input type="number" class="bulk-input" placeholder="0.00" step="0.01"></td>
        <td><input type="text" class="bulk-input" placeholder="Description"></td>
        <td><button onclick="removeBulkRow(this)" style="background: none; border: none; color: #ef4444; cursor: pointer;"><i class="fas fa-times"></i></button></td>
    `;
    tbody.appendChild(newRow);
}

function removeBulkRow(button) {
    button.closest('tr').remove();
}

function processBulkEntries() {
    const rows = document.querySelectorAll('#bulkEntries tr');
    const transactions = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    let addedCount = 0;
    
    rows.forEach(row => {
        const inputs = row.querySelectorAll('.bulk-input');
        if (inputs[0].value && inputs[2].value) {
            transactions.push({
                id: Date.now() + Math.random(),
                type: inputs[1].value,
                amount: parseFloat(inputs[2].value),
                description: inputs[3].value,
                date: inputs[0].value,
                category: inputs[1].value === 'income' ? 'sales' : 'other',
                method: 'bank'
            });
            addedCount++;
        }
    });
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));
    closeBulkEntryModal();
    showNotification(`${addedCount} entries saved successfully!`, 'success');
    updateDashboard();
}

function closeBulkEntryModal() {
    document.getElementById('bulkEntryModal')?.remove();
}

function loadTemplate(templateType) {
    const startDate = document.getElementById('bulkStartDate')?.value;
    const endDate = document.getElementById('bulkEndDate')?.value;
    
    if (!startDate || !endDate) {
        showNotification('Please select start and end dates first', 'warning');
        return;
    }
    
    const start = new Date(startDate);
    const end = new Date(endDate);
    const months = [];
    
    let current = new Date(start);
    while (current <= end) {
        months.push(new Date(current));
        current.setMonth(current.getMonth() + 1);
    }
    
    const tbody = document.getElementById('bulkEntries');
    tbody.innerHTML = '';
    
    const templates = {
        'monthly-rent': { type: 'expense', description: 'Monthly Rent', amount: '' },
        'utilities': { type: 'expense', description: 'Utilities (Electric/Water)', amount: '' },
        'salary': { type: 'expense', description: 'Staff Salary', amount: '' },
        'sales': { type: 'income', description: 'Monthly Sales', amount: '' }
    };
    
    const template = templates[templateType];
    
    months.forEach(month => {
        const dateStr = month.toISOString().split('T')[0];
        const row = document.createElement('tr');
        row.innerHTML = `
            <td><input type="date" class="bulk-input" value="${dateStr}"></td>
            <td>
                <select class="bulk-input">
                    <option value="income" ${template.type === 'income' ? 'selected' : ''}>Income</option>
                    <option value="expense" ${template.type === 'expense' ? 'selected' : ''}>Expense</option>
                </select>
            </td>
            <td><input type="number" class="bulk-input" placeholder="0.00" step="0.01" value="${template.amount}"></td>
            <td><input type="text" class="bulk-input" value="${template.description}"></td>
            <td><button onclick="removeBulkRow(this)" style="background: none; border: none; color: #ef4444; cursor: pointer;"><i class="fas fa-times"></i></button></td>
        `;
        tbody.appendChild(row);
    });
    
    showNotification(`Template loaded for ${months.length} months`, 'success');
}

// ==================== OPENING BALANCE WIZARD ====================
function showOpeningBalanceWizard() {
    const modalHTML = `
        <div class="modal" id="openingBalanceModal" style="display: block;">
            <div class="modal-content" style="max-width: 600px;">
                <div class="modal-header">
                    <h3 class="modal-title">
                        <i class="fas fa-calculator"></i> Set Opening Balances
                    </h3>
                    <button class="close-modal" onclick="closeOpeningBalanceModal()">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="wizard-intro">
                        <i class="fas fa-piggy-bank"></i>
                        <h4>Enter your opening balances</h4>
                        <p style="color: #64748b;">These are the balances as of the date you start using A Lazy Human</p>
                    </div>
                    
                    <div class="form-group">
                        <label>Opening Balance Date</label>
                        <input type="date" id="openingBalanceDate" value="${new Date().toISOString().split('T')[0]}">
                    </div>
                    
                    <div class="balance-input-group">
                        <div class="balance-field">
                            <label><i class="fas fa-university"></i> Bank Account Balance</label>
                            <input type="number" id="openingBankBalance" placeholder="0.00" step="0.01">
                            <div class="field-hint">Total cash in all bank accounts</div>
                        </div>
                        
                        <div class="balance-field">
                            <label><i class="fas fa-money-bill-wave"></i> Cash on Hand</label>
                            <input type="number" id="openingCashBalance" placeholder="0.00" step="0.01">
                            <div class="field-hint">Physical cash in your business</div>
                        </div>
                        
                        <div class="balance-field">
                            <label><i class="fas fa-file-invoice-dollar"></i> Accounts Receivable</label>
                            <input type="number" id="openingReceivable" placeholder="0.00" step="0.01">
                            <div class="field-hint">Money owed to you by customers</div>
                        </div>
                        
                        <div class="balance-field">
                            <label><i class="fas fa-credit-card"></i> Accounts Payable</label>
                            <input type="number" id="openingPayable" placeholder="0.00" step="0.01">
                            <div class="field-hint">Money you owe to suppliers</div>
                        </div>
                        
                        <div class="balance-field">
                            <label><i class="fas fa-boxes"></i> Inventory Value</label>
                            <input type="number" id="openingInventory" placeholder="0.00" step="0.01">
                            <div class="field-hint">Total value of stock/inventory</div>
                        </div>
                        
                        <div class="balance-field">
                            <label><i class="fas fa-building"></i> Fixed Assets</label>
                            <input type="number" id="openingFixedAssets" placeholder="0.00" step="0.01">
                            <div class="field-hint">Equipment, vehicles, property</div>
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn-primary" onclick="saveOpeningBalances()">
                        <i class="fas fa-save"></i> Save Opening Balances
                    </button>
                    <button class="btn-secondary" onclick="closeOpeningBalanceModal()">
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    const openingBalances = safeLocalStorageGet(OPENING_BALANCE_KEY, {});
    if (openingBalances.date) {
        document.getElementById('openingBalanceDate').value = openingBalances.date;
        document.getElementById('openingBankBalance').value = openingBalances.bankBalance || '';
        document.getElementById('openingCashBalance').value = openingBalances.cashBalance || '';
        document.getElementById('openingReceivable').value = openingBalances.receivable || '';
        document.getElementById('openingPayable').value = openingBalances.payable || '';
        document.getElementById('openingInventory').value = openingBalances.inventory || '';
        document.getElementById('openingFixedAssets').value = openingBalances.fixedAssets || '';
    }
}

function saveOpeningBalances() {
    const openingBalances = {
        date: document.getElementById('openingBalanceDate').value,
        bankBalance: parseFloat(document.getElementById('openingBankBalance').value) || 0,
        cashBalance: parseFloat(document.getElementById('openingCashBalance').value) || 0,
        receivable: parseFloat(document.getElementById('openingReceivable').value) || 0,
        payable: parseFloat(document.getElementById('openingPayable').value) || 0,
        inventory: parseFloat(document.getElementById('openingInventory').value) || 0,
        fixedAssets: parseFloat(document.getElementById('openingFixedAssets').value) || 0
    };
    
    safeLocalStorageSet(OPENING_BALANCE_KEY, openingBalances);
    
    const manualBalances = safeLocalStorageGet(MANUAL_BALANCES_KEY, {});
    manualBalances['bank-account-input'] = openingBalances.bankBalance;
    manualBalances['inventory-input'] = openingBalances.inventory;
    manualBalances['fixed-assets-input'] = openingBalances.fixedAssets;
    safeLocalStorageSet(MANUAL_BALANCES_KEY, manualBalances);
    
    closeOpeningBalanceModal();
    showNotification('Opening balances saved successfully!', 'success');
    
    if (document.getElementById('detailed-view')?.classList.contains('active')) {
        loadDetailedBalanceSheet();
    }
}

function closeOpeningBalanceModal() {
    document.getElementById('openingBalanceModal')?.remove();
}

// Export functions to window for onclick handlers
window.initializeApp = initializeApp;
window.renderOutletDropdowns = renderOutletDropdowns;
window.toggleOutletCheckbox = toggleOutletCheckbox;
window.getSelectedOutlets = getSelectedOutlets;
window.setSelectedOutlets = setSelectedOutlets;
window.showOutletModal = showOutletModal;
window.addOutlet = addOutlet;
window.showAddBankAccountModal = showAddBankAccountModal;
window.handleBankSelect = handleBankSelect;
window.closeAddBankAccountModal = closeAddBankAccountModal;
window.saveBankAccount = saveBankAccount;
window.loadBankAccounts = loadBankAccounts;
window.updateBankAccountBalance = updateBankAccountBalance;
window.removeBankAccount = removeBankAccount;
window.showAddCreditCardModal = showAddCreditCardModal;
window.closeAddCreditCardModal = closeAddCreditCardModal;
window.saveCreditCard = saveCreditCard;
window.loadCreditCards = loadCreditCards;
window.updateCreditCardBalance = updateCreditCardBalance;
window.removeCreditCard = removeCreditCard;
window.showBulkEntryModal = showBulkEntryModal;
window.addBulkRow = addBulkRow;
window.removeBulkRow = removeBulkRow;
window.processBulkEntries = processBulkEntries;
window.closeBulkEntryModal = closeBulkEntryModal;
window.loadTemplate = loadTemplate;
window.showOpeningBalanceWizard = showOpeningBalanceWizard;
window.saveOpeningBalances = saveOpeningBalances;
window.closeOpeningBalanceModal = closeOpeningBalanceModal;
