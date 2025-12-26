/**
 * EZCubic Phase 2 - POS Core Module
 * State management, initialization, products, categories, customers loading
 */

// ==================== POS STATE (Shared across all POS modules) ====================
let heldSales = [];
let currentPOSCategory = '';
let isProcessingPayment = false;

// ==================== POS INITIALIZATION ====================
function initializePOS() {
    console.log('initializePOS called, products:', products?.length, 'window.products:', window.products?.length);
    
    // Ensure HQ branch exists for ALL plans (even if Branches section is hidden)
    ensureHQBranchExists();
    
    // Sync branch stock to products array (ensures correct stock values across all outlets)
    if (typeof syncAllBranchStockToProducts === 'function') {
        syncAllBranchStockToProducts();
    }
    
    loadHeldSales();
    loadPOSProducts();
    loadPOSCategories();
    loadPOSCustomers();
    loadPOSSalespersons();
    updateHeldCount();
    
    // Sync branches to POS outlets first
    if (typeof syncBranchesToOutlets === 'function') {
        syncBranchesToOutlets();
    }
    
    // Then apply outlet filter visibility based on plan
    if (typeof renderOutletDropdowns === 'function') {
        renderOutletDropdowns();
    }
    
    // Load POS branch/outlet selector
    loadPOSBranchSelector();
}

// Ensure HQ branch exists for ALL plans - even Starter needs an outlet for POS
function ensureHQBranchExists() {
    // Load branches from window or localStorage
    let branchList = window.branches || [];
    if (branchList.length === 0) {
        const stored = localStorage.getItem('ezcubic_branches');
        if (stored) {
            branchList = JSON.parse(stored);
        }
    }
    
    // If no branches exist, create default HQ
    if (branchList.length === 0) {
        const hqBranch = {
            id: 'BRANCH_HQ',
            code: 'HQ',
            name: 'Headquarters',
            type: 'headquarters',
            address: '',
            city: '',
            state: '',
            postcode: '',
            phone: '',
            email: '',
            manager: '',
            status: 'active',
            isDefault: true,
            createdAt: new Date().toISOString()
        };
        branchList.push(hqBranch);
        
        // Save to localStorage and window
        localStorage.setItem('ezcubic_branches', JSON.stringify(branchList));
        window.branches = branchList;
        
        // Also update the branches variable if it exists
        if (typeof branches !== 'undefined') {
            branches = branchList;
        }
        
        console.log('Created default HQ branch for POS');
    }
}

function loadHeldSales() {
    const stored = localStorage.getItem('ezcubic_held_sales');
    if (stored) {
        heldSales = JSON.parse(stored);
    }
}

function saveHeldSales() {
    localStorage.setItem('ezcubic_held_sales', JSON.stringify(heldSales));
    updateHeldCount();
}

// ==================== POS PRODUCTS ====================
function loadPOSProducts() {
    renderPOSProducts();
}

function loadPOSCategories() {
    const container = document.getElementById('posCategories');
    if (!container) return;
    
    // Use window.products as fallback
    const productList = (typeof products !== 'undefined' && products.length > 0) ? products : (window.products || []);
    const usedCategories = [...new Set(productList.filter(p => p.stock > 0).map(p => p.category))];
    
    container.innerHTML = `
        <button class="pos-category-btn ${!currentPOSCategory ? 'active' : ''}" onclick="filterPOSCategory('')">All</button>
        ${usedCategories.map(cat => `
            <button class="pos-category-btn ${currentPOSCategory === cat ? 'active' : ''}" 
                    onclick="filterPOSCategory('${cat}')">${cat}</button>
        `).join('')}
    `;
}

function loadPOSCustomers() {
    const select = document.getElementById('posCustomer');
    if (!select) return;
    
    // Get CRM customers if available
    const crmList = typeof getCRMCustomersForSelect === 'function' ? getCRMCustomersForSelect() : [];
    
    // Also get regular customers
    let regularCustomers = Array.isArray(window.customers) ? window.customers : [];
    if (regularCustomers.length === 0) {
        try {
            const stored = localStorage.getItem('ezcubic_customers');
            if (stored) regularCustomers = JSON.parse(stored) || [];
        } catch (e) {}
    }
    
    select.innerHTML = `<option value="">Walk-in Customer</option>`;
    
    // Show CRM customers first (they support credit terms)
    if (crmList.length > 0) {
        select.innerHTML += `<optgroup label="CRM Customers (Credit Available)">`;
        select.innerHTML += crmList.map(c => `
            <option value="${c.id}" data-type="crm">${escapeHtml(c.name)}${c.company ? ` (${escapeHtml(c.company)})` : ''}</option>
        `).join('');
        select.innerHTML += `</optgroup>`;
    }
    
    // Also show regular customers (no credit terms)
    if (regularCustomers.length > 0) {
        // Filter out customers that are already in CRM list (by name match to avoid duplicates)
        const crmNames = crmList.map(c => c.name.toLowerCase());
        const uniqueRegularCustomers = regularCustomers.filter(c => !crmNames.includes(c.name?.toLowerCase()));
        
        if (uniqueRegularCustomers.length > 0) {
            select.innerHTML += `<optgroup label="Customers">`;
            select.innerHTML += uniqueRegularCustomers.map(c => `
                <option value="${c.id}" data-type="regular">${escapeHtml(c.name)}</option>
            `).join('');
            select.innerHTML += `</optgroup>`;
        }
    }
}

function loadPOSSalespersons() {
    const select = document.getElementById('posSalesperson');
    if (!select) return;
    
    const currentUser = typeof getCurrentUser === 'function' ? getCurrentUser() : window.currentUser;
    const userPlan = currentUser?.plan || 'starter';
    
    // Check if user has HR/Employee module access (Professional and Enterprise plans)
    const hasEmployeeModule = userPlan === 'professional' || userPlan === 'enterprise';
    
    // Get employees if available - try multiple sources
    let employeeList = [];
    
    // Try window.employees first
    if (Array.isArray(window.employees) && window.employees.length > 0) {
        employeeList = window.employees;
    } else {
        // Try loading from localStorage
        try {
            const stored = localStorage.getItem('ezcubic_employees');
            if (stored) {
                const parsed = JSON.parse(stored);
                if (Array.isArray(parsed)) {
                    employeeList = parsed;
                    window.employees = employeeList; // Update window reference
                }
            }
        } catch (e) {
            console.error('Error loading employees for POS:', e);
        }
    }
    
    // Ensure employeeList is always an array
    if (!Array.isArray(employeeList)) {
        console.warn('employeeList was not an array, resetting to empty array');
        employeeList = [];
    }
    
    const activeEmployees = employeeList.filter(e => e.status === 'active');
    
    // Build options list
    let options = '<option value="">-- Select Cashier/Staff --</option>';
    
    if (hasEmployeeModule && activeEmployees.length > 0) {
        // Filter employees based on current user's role
        let filteredEmployees = activeEmployees;
        
        // If staff is logged in, only show staff role employees
        if (currentUser && currentUser.role === 'staff') {
            filteredEmployees = activeEmployees.filter(emp => {
                let accountType = emp.posAccountType || 'staff';
                if (accountType === 'staff' && emp.position) {
                    const positionLower = emp.position.toLowerCase();
                    if (positionLower.includes('admin') || positionLower.includes('owner') || positionLower.includes('director')) {
                        accountType = 'admin';
                    } else if (positionLower.includes('manager') || positionLower.includes('supervisor') || positionLower.includes('lead')) {
                        accountType = 'manager';
                    }
                }
                return accountType === 'staff';
            });
        }
        
        // Show employees from HR module
        filteredEmployees.forEach(emp => {
            let accountType = emp.posAccountType || 'staff';
            
            if (accountType === 'staff' && emp.position) {
                const positionLower = emp.position.toLowerCase();
                if (positionLower.includes('admin') || positionLower.includes('owner') || positionLower.includes('director')) {
                    accountType = 'admin';
                } else if (positionLower.includes('manager') || positionLower.includes('supervisor') || positionLower.includes('lead')) {
                    accountType = 'manager';
                }
            }
            
            const badge = accountType === 'admin' ? '👑' : accountType === 'manager' ? '⭐' : '👤';
            options += `<option value="${escapeHtml(emp.name)}" data-account-type="${accountType}">${badge} ${escapeHtml(emp.name)} (${escapeHtml(emp.position || accountType)})</option>`;
        });
    } else {
        // Default accounts for Starter plan or when no employees exist
        if (currentUser && currentUser.name) {
            const userRole = currentUser.role || 'admin';
            const badge = userRole === 'admin' ? '👑' : userRole === 'manager' ? '⭐' : '👤';
            options += `<option value="${escapeHtml(currentUser.name)}" data-account-type="${userRole}">${badge} ${escapeHtml(currentUser.name)} (${userRole.charAt(0).toUpperCase() + userRole.slice(1)})</option>`;
        }
        
        if (activeEmployees.length === 0) {
            options += `
                <option value="Admin" data-account-type="admin">👑 Admin Account</option>
                <option value="Manager" data-account-type="manager">⭐ Manager Account</option>
                <option value="Staff" data-account-type="staff">👤 Staff Account</option>
            `;
        }
    }
    
    select.innerHTML = options;
    
    // Auto-select current user if they're in the list
    if (currentUser && currentUser.name) {
        const userOption = Array.from(select.options).find(opt => opt.value === currentUser.name);
        if (userOption) {
            select.value = currentUser.name;
        }
    }
}

function filterPOSCategory(category) {
    currentPOSCategory = category;
    loadPOSCategories();
    renderPOSProducts();
}

function searchPOSProducts(term) {
    renderPOSProducts(term);
}

function filterPOSProducts(term) {
    renderPOSProducts(term);
}

function filterPOSByOutlet(outlet) {
    renderPOSProducts();
}

function renderPOSProducts(searchTerm = '') {
    const container = document.getElementById('posProductsGrid');
    if (!container) return;
    
    const productList = (typeof products !== 'undefined' && products.length > 0) ? products : (window.products || []);
    
    const search = searchTerm || document.getElementById('posSearch')?.value?.toLowerCase() || '';
    const selectedOutlet = document.getElementById('posOutletFilter')?.value || 'all';
    
    const currentBranch = selectedOutlet !== 'all' ? selectedOutlet : 
        (typeof getCurrentBranchId === 'function' ? getCurrentBranchId() : null);
    
    let filtered = productList.filter(p => {
        const matchesSearch = !search || 
            p.name.toLowerCase().includes(search) ||
            p.sku.toLowerCase().includes(search);
        const matchesCategory = !currentPOSCategory || p.category === currentPOSCategory;
        
        const productOutlets = p.outlets || (p.outlet ? [p.outlet] : ['all']);
        const matchesOutlet = selectedOutlet === 'all' || 
            productOutlets.includes('all') || 
            productOutlets.includes(selectedOutlet);
        
        let stockAtOutlet = 0;
        if (currentBranch && typeof getBranchStock === 'function') {
            stockAtOutlet = getBranchStock(p.id, currentBranch);
        } else if (selectedOutlet === 'all' && typeof getTotalBranchStock === 'function') {
            stockAtOutlet = getTotalBranchStock(p.id);
            if (stockAtOutlet === 0 && (!window.branches || window.branches.length === 0)) {
                stockAtOutlet = p.stock;
            }
        } else if (selectedOutlet !== 'all' && p.branchStock) {
            stockAtOutlet = p.branchStock[selectedOutlet] || 0;
        } else {
            stockAtOutlet = p.stock;
        }
        
        const inStock = stockAtOutlet > 0;
        return matchesSearch && matchesCategory && matchesOutlet && inStock;
    });
    
    if (filtered.length === 0) {
        container.innerHTML = `
            <div class="pos-empty">
                <i class="fas fa-box-open"></i>
                <p>${productList.length === 0 ? 'No products in inventory' : 'No products found at this outlet'}</p>
                ${productList.length === 0 ? `<a href="#" onclick="showSection('inventory')">Add Products</a>` : ''}
            </div>
        `;
        return;
    }
    
    const getOutletShortName = (outletId) => {
        if (!outletId || outletId === 'all') return 'All';
        const branch = window.branches?.find(b => b.id === outletId);
        if (branch) return branch.code || branch.name.slice(0, 3).toUpperCase();
        const outlet = outlets.find(o => o.id === outletId);
        if (outlet) {
            const words = outlet.name.split(' ');
            if (words.length > 1) {
                return words.map(w => w[0]).join('').toUpperCase().slice(0, 3);
            }
            return outlet.name.slice(0, 3).toUpperCase();
        }
        return 'All';
    };
    
    const getOutletsDisplay = (product) => {
        const productOutlets = product.outlets || (product.outlet ? [product.outlet] : ['all']);
        if (productOutlets.includes('all')) return 'All';
        if (productOutlets.length === 1) return getOutletShortName(productOutlets[0]);
        if (productOutlets.length <= 2) return productOutlets.map(getOutletShortName).join(', ');
        return `${productOutlets.length} outlets`;
    };
    
    const getStockDisplay = (product) => {
        if (currentBranch && typeof getBranchStock === 'function') {
            return getBranchStock(product.id, currentBranch);
        }
        if (selectedOutlet === 'all' && typeof getTotalBranchStock === 'function') {
            const totalFromBranches = getTotalBranchStock(product.id);
            if (totalFromBranches > 0 || (window.branches && window.branches.length > 0)) {
                return totalFromBranches;
            }
        }
        if (selectedOutlet !== 'all' && product.branchStock) {
            return product.branchStock[selectedOutlet] || 0;
        }
        return product.stock;
    };
    
    container.innerHTML = filtered.map(product => {
        const stockDisplay = getStockDisplay(product);
        const stockClass = stockDisplay <= (product.minStock || 5) ? 'low-stock' : '';
        
        return `
            <div class="pos-product-card" onclick="addToCart('${product.id}')">
                ${product.image ? `<div class="pos-product-image"><img src="${product.image}" alt="${escapeHtml(product.name)}"></div>` : 
                `<div class="pos-product-image pos-product-no-image"><i class="fas fa-box"></i></div>`}
                <div class="pos-product-info">
                    <div class="pos-product-sku">${product.sku}</div>
                    <div class="pos-product-name">${escapeHtml(product.name)}</div>
                    <div class="pos-product-price">RM ${product.price.toFixed(2)}</div>
                    <div class="pos-product-meta">
                        <span class="pos-product-stock ${stockClass}">${stockDisplay} in stock</span>
                        <span class="pos-product-outlet">${getOutletsDisplay(product)}</span>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// ==================== BRANCH HELPER ====================
function getBranchNameById(branchId) {
    if (!branchId || branchId === 'all') return 'All Branches';
    
    if (typeof branches !== 'undefined' && branches.length > 0) {
        const branch = branches.find(b => b.id === branchId);
        if (branch) return branch.name;
    }
    
    if (typeof outlets !== 'undefined' && outlets.length > 0) {
        const outlet = outlets.find(o => o.id === branchId);
        if (outlet) return outlet.name;
    }
    
    return 'Unknown Branch';
}

// ==================== POS BRANCH/OUTLET SELECTOR ====================
function loadPOSBranchSelector() {
    const posOutletFilter = document.getElementById('posOutletFilter');
    if (!posOutletFilter) return;
    
    const branchList = window.branches || (typeof branches !== 'undefined' ? branches : []);
    let activeBranches = branchList.filter(b => b.status === 'active');
    
    if (activeBranches.length === 0) {
        activeBranches = [{
            id: 'hq',
            name: 'Headquarters (HQ)',
            code: 'HQ',
            type: 'hq',
            status: 'active'
        }];
    }
    
    let canUseMultiBranch = false;
    const currentUser = typeof getCurrentUser === 'function' ? getCurrentUser() : window.currentUser;
    const settings = typeof getPlatformSettings === 'function' ? getPlatformSettings() : null;
    
    if (currentUser && (currentUser.role === 'founder' || currentUser.role === 'erp_assistant')) {
        canUseMultiBranch = true;
    } else if (currentUser && settings && settings.plans) {
        const userPlan = currentUser.plan || 'starter';
        const planData = settings.plans[userPlan];
        if (planData && planData.limits) {
            const branchLimit = planData.limits.branches;
            canUseMultiBranch = branchLimit === -1 || branchLimit > 1;
        }
    }
    
    const posOutletContainer = posOutletFilter.closest('.pos-outlet-filter');
    const shouldHideSelector = !canUseMultiBranch || activeBranches.length <= 1;
    
    if (posOutletContainer) {
        posOutletContainer.style.display = shouldHideSelector ? 'none' : '';
    }
    
    if (shouldHideSelector && activeBranches.length > 0) {
        posOutletFilter.innerHTML = `<option value="${activeBranches[0].id}">${escapeHtml(activeBranches[0].name)}</option>`;
        posOutletFilter.value = activeBranches[0].id;
        return;
    }
    
    const currentValue = posOutletFilter.value;
    posOutletFilter.innerHTML = `
        <option value="all">-- Select Outlet/Branch --</option>
        ${activeBranches.map(branch => `
            <option value="${branch.id}">${escapeHtml(branch.name)}${branch.code ? ` (${escapeHtml(branch.code)})` : ''}</option>
        `).join('')}
    `;
    
    if (currentValue && currentValue !== 'all' && activeBranches.find(b => b.id === currentValue)) {
        posOutletFilter.value = currentValue;
    }
}

// ==================== SALES HISTORY ====================
function loadSales() {
    const stored = localStorage.getItem(SALES_KEY);
    if (stored) {
        sales = JSON.parse(stored);
    }
}

function getSalesByBranch(branchId) {
    const salesList = window.sales || (typeof sales !== 'undefined' ? sales : []);
    if (!branchId || branchId === 'all') {
        return salesList;
    }
    return salesList.filter(s => s.branchId === branchId);
}

function getSalesSummaryByBranch() {
    const salesList = window.sales || (typeof sales !== 'undefined' ? sales : []);
    const branchList = window.branches || (typeof branches !== 'undefined' ? branches : []);
    
    const summary = {};
    
    branchList.forEach(branch => {
        summary[branch.id] = {
            branchId: branch.id,
            branchName: branch.name,
            branchCode: branch.code,
            totalSales: 0,
            salesCount: 0,
            itemsSold: 0
        };
    });
    
    salesList.forEach(sale => {
        const branchId = sale.branchId || 'BRANCH_HQ';
        if (!summary[branchId]) {
            summary[branchId] = {
                branchId: branchId,
                branchName: sale.branchName || 'Unknown',
                branchCode: '',
                totalSales: 0,
                salesCount: 0,
                itemsSold: 0
            };
        }
        summary[branchId].totalSales += (sale.total || 0);
        summary[branchId].salesCount += 1;
        summary[branchId].itemsSold += sale.items?.reduce((sum, item) => sum + item.quantity, 0) || 0;
    });
    
    return Object.values(summary);
}

// ==================== WINDOW EXPORTS (Core) ====================
window.initializePOS = initializePOS;
window.filterPOSCategory = filterPOSCategory;
window.filterPOSProducts = filterPOSProducts;
window.filterPOSByOutlet = filterPOSByOutlet;
window.searchPOSProducts = searchPOSProducts;
window.loadPOSCustomers = loadPOSCustomers;
window.loadPOSBranchSelector = loadPOSBranchSelector;
window.loadSales = loadSales;
window.getSalesByBranch = getSalesByBranch;
window.getSalesSummaryByBranch = getSalesSummaryByBranch;
window.getBranchNameById = getBranchNameById;
window.renderPOSProducts = renderPOSProducts;
window.loadPOSCategories = loadPOSCategories;

console.log('POS Core module loaded');
