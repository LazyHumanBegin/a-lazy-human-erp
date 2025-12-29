/**
 * EZCubic Phase 2 - Point of Sale (POS) Module
 * Cart management, checkout, payment processing, receipts
 */

// ==================== POS STATE ====================
let heldSales = [];
let currentPOSCategory = '';

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
    
    // Debug log to help troubleshoot
    console.log('POS Salespersons: Plan=', userPlan, 'hasEmployeeModule=', hasEmployeeModule, 'Total employees=', employeeList.length, 'Active=', activeEmployees.length);
    activeEmployees.forEach(emp => {
        console.log('  Employee:', emp.name, 'Position:', emp.position, 'posAccountType:', emp.posAccountType);
    });
    
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
            // Determine account type: check posAccountType first, then infer from position field
            let accountType = emp.posAccountType || 'staff';
            
            // If posAccountType is default 'staff', check position field for manager/admin roles
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
        // Include current logged-in user
        if (currentUser && currentUser.name) {
            const userRole = currentUser.role || 'admin';
            const badge = userRole === 'admin' ? '👑' : userRole === 'manager' ? '⭐' : '👤';
            options += `<option value="${escapeHtml(currentUser.name)}" data-account-type="${userRole}">${badge} ${escapeHtml(currentUser.name)} (${userRole.charAt(0).toUpperCase() + userRole.slice(1)})</option>`;
        }
        
        // Add default account options if no employees
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

// Alias for filterPOSProducts
function filterPOSProducts(term) {
    renderPOSProducts(term);
}

// Alias for outlet filtering
function filterProductsByOutlet(outlet) {
    renderPOSProducts();
}

function filterPOSByOutlet(outlet) {
    renderPOSProducts();
}

function renderPOSProducts(searchTerm = '') {
    const container = document.getElementById('posProductsGrid');
    if (!container) return;
    
    // Use window.products as fallback in case local scope is stale
    const productList = (typeof products !== 'undefined' && products.length > 0) ? products : (window.products || []);
    
    const search = searchTerm || document.getElementById('posSearch')?.value?.toLowerCase() || '';
    const selectedOutlet = document.getElementById('posOutletFilter')?.value || 'all';
    
    // Get current branch for stock lookup (use selectedOutlet or current branch)
    const currentBranch = selectedOutlet !== 'all' ? selectedOutlet : 
        (typeof getCurrentBranchId === 'function' ? getCurrentBranchId() : null);
    
    let filtered = productList.filter(p => {
        const matchesSearch = !search || 
            p.name.toLowerCase().includes(search) ||
            p.sku.toLowerCase().includes(search);
        const matchesCategory = !currentPOSCategory || p.category === currentPOSCategory;
        
        // Check if product is available at selected outlet
        // Support both old single 'outlet' and new 'outlets' array
        const productOutlets = p.outlets || (p.outlet ? [p.outlet] : ['all']);
        const matchesOutlet = selectedOutlet === 'all' || 
            productOutlets.includes('all') || 
            productOutlets.includes(selectedOutlet);
        
        // Get stock using branch stock system
        let stockAtOutlet = 0;
        if (currentBranch && typeof getBranchStock === 'function') {
            // Specific branch selected
            stockAtOutlet = getBranchStock(p.id, currentBranch);
        } else if (selectedOutlet === 'all' && typeof getTotalBranchStock === 'function') {
            // All outlets - get total from branch stock system
            stockAtOutlet = getTotalBranchStock(p.id);
            // Fall back to product.stock if no branch stock exists
            if (stockAtOutlet === 0 && (!window.branches || window.branches.length === 0)) {
                stockAtOutlet = p.stock;
            }
        } else if (selectedOutlet !== 'all' && p.branchStock) {
            // Fallback to old branchStock property
            stockAtOutlet = p.branchStock[selectedOutlet] || 0;
        } else {
            stockAtOutlet = p.stock; // Default fallback
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
    
    // Get outlet/branch display name dynamically
    const getOutletShortName = (outletId) => {
        if (!outletId || outletId === 'all') return 'All';
        // Try branches first (new system)
        const branch = window.branches?.find(b => b.id === outletId);
        if (branch) return branch.code || branch.name.slice(0, 3).toUpperCase();
        // Fallback to outlets
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
    
    // Get display string for multiple outlets
    const getOutletsDisplay = (product) => {
        const productOutlets = product.outlets || (product.outlet ? [product.outlet] : ['all']);
        if (productOutlets.includes('all')) return 'All';
        if (productOutlets.length === 1) return getOutletShortName(productOutlets[0]);
        if (productOutlets.length <= 2) return productOutlets.map(getOutletShortName).join(', ');
        return `${productOutlets.length} outlets`;
    };
    
    // Get stock display based on selected outlet using branch stock system
    const getStockDisplay = (product) => {
        // If a specific branch is selected, show branch stock
        if (currentBranch && typeof getBranchStock === 'function') {
            return getBranchStock(product.id, currentBranch);
        }
        // For "All Outlets", calculate total from branch stock system
        if (selectedOutlet === 'all' && typeof getTotalBranchStock === 'function') {
            const totalFromBranches = getTotalBranchStock(product.id);
            // Use branch total if we have branches, otherwise fall back to product.stock
            if (totalFromBranches > 0 || (window.branches && window.branches.length > 0)) {
                return totalFromBranches;
            }
        }
        // Fallback to old branchStock property
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

// ==================== CART MANAGEMENT ====================
function addToCart(productId) {
    const product = products.find(p => p.id === productId);
    if (!product) return;
    
    // Get current outlet/branch
    const currentBranchId = document.getElementById('posOutletFilter')?.value || '';
    
    // Get available stock - check branch stock first, fallback to total stock
    let availableStock = product.stock || 0;
    
    // Only use branch-specific stock if:
    // 1. A specific branch is selected (not 'all' or empty)
    // 2. The product has branchStock defined
    // 3. The branch actually has stock allocated
    if (currentBranchId && currentBranchId !== 'all' && product.branchStock && product.branchStock[currentBranchId] !== undefined) {
        availableStock = product.branchStock[currentBranchId] || 0;
    }
    
    // Check if already in cart
    const existingIndex = currentCart.findIndex(item => item.productId === productId);
    
    if (existingIndex !== -1) {
        // Check stock at current branch
        if (currentCart[existingIndex].quantity >= availableStock) {
            showToast(`Only ${availableStock} available at this outlet`, 'warning');
            return;
        }
        currentCart[existingIndex].quantity++;
    } else {
        if (availableStock === 0) {
            showToast(`${product.name} is out of stock at this outlet`, 'warning');
            return;
        }
        currentCart.push({
            productId: product.id,
            name: product.name,
            price: product.price,
            cost: product.cost,
            quantity: 1,
            unit: product.unit
        });
    }
    
    renderCart();
    updateCartTotals();
    
    // Visual feedback
    showToast(`${product.name} added to cart`, 'success');
}

function updateCartItemQuantity(productId, change) {
    const product = products.find(p => p.id === productId);
    const itemIndex = currentCart.findIndex(item => item.productId === productId);
    
    if (itemIndex === -1) return;
    
    const newQty = currentCart[itemIndex].quantity + change;
    
    if (newQty <= 0) {
        removeFromCart(productId);
        return;
    }
    
    // Get current outlet/branch
    const currentBranchId = document.getElementById('posOutletFilter')?.value || '';
    
    // Get available stock - check branch stock first, fallback to total stock
    let availableStock = product ? (product.stock || 0) : 999;
    
    // Only use branch-specific stock if branch is selected AND has stock allocated
    if (product && currentBranchId && currentBranchId !== 'all' && product.branchStock && product.branchStock[currentBranchId] !== undefined) {
        availableStock = product.branchStock[currentBranchId] || 0;
    }
    
    if (newQty > availableStock) {
        showToast(`Only ${availableStock} available at this outlet`, 'warning');
        return;
    }
    
    currentCart[itemIndex].quantity = newQty;
    renderCart();
    updateCartTotals();
}

function setCartItemQuantity(productId, quantity) {
    const product = products.find(p => p.id === productId);
    const itemIndex = currentCart.findIndex(item => item.productId === productId);
    
    if (itemIndex === -1) return;
    
    const qty = parseInt(quantity) || 0;
    
    if (qty <= 0) {
        removeFromCart(productId);
        return;
    }
    
    if (product && qty > product.stock) {
        showToast(`Only ${product.stock} available in stock`, 'warning');
        currentCart[itemIndex].quantity = product.stock;
    } else {
        currentCart[itemIndex].quantity = qty;
    }
    
    renderCart();
    updateCartTotals();
}

function removeFromCart(productId) {
    currentCart = currentCart.filter(item => item.productId !== productId);
    renderCart();
    updateCartTotals();
}

function clearCart() {
    if (currentCart.length === 0) return;
    
    if (confirm('Clear all items from cart?')) {
        currentCart = [];
        renderCart();
        updateCartTotals();
    }
}

function renderCart() {
    const container = document.getElementById('posCartItems');
    if (!container) return;
    
    if (currentCart.length === 0) {
        container.innerHTML = `
            <div class="cart-empty">
                <i class="fas fa-shopping-basket"></i>
                <p>Cart is empty</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = currentCart.map(item => `
        <div class="cart-item">
            <div class="cart-item-info">
                <div class="cart-item-name">
                    ${escapeHtml(item.name)}
                    <button class="cart-item-memo-btn" onclick="showItemMemo('${item.productId}')" title="Add serving note">
                        <i class="fas fa-sticky-note ${item.memo ? 'has-memo' : ''}"></i>
                    </button>
                </div>
                <div class="cart-item-price">RM ${item.price.toFixed(2)} each</div>
                ${item.memo ? `<div class="cart-item-memo"><i class="fas fa-info-circle"></i> ${escapeHtml(item.memo)}</div>` : ''}
            </div>
            <div class="cart-item-quantity">
                <button class="qty-btn" onclick="updateCartItemQuantity('${item.productId}', -1)">-</button>
                <input type="number" value="${item.quantity}" min="1" 
                       onchange="setCartItemQuantity('${item.productId}', this.value)"
                       onclick="this.select()">
                <button class="qty-btn" onclick="updateCartItemQuantity('${item.productId}', 1)">+</button>
            </div>
            <div class="cart-item-total">RM ${(item.price * item.quantity).toFixed(2)}</div>
            <button class="cart-item-remove" onclick="removeFromCart('${item.productId}')">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `).join('');
}

// ==================== ITEM MEMO / SERVING NOTES ====================
function showItemMemo(productId) {
    const item = currentCart.find(i => i.productId === productId);
    if (!item) return;
    
    const currentMemo = item.memo || '';
    const memo = prompt(`Serving Note for ${item.name}:\n(e.g., "Less ice", "No sugar", "Table 5", "Serve to Mr. Tan")`, currentMemo);
    
    if (memo !== null) {
        item.memo = memo.trim();
        renderCart();
        if (memo.trim()) {
            showToast('Memo added', 'success');
        }
    }
}

function updateCartTotals() {
    const subtotal = currentCart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const discount = parseFloat(document.getElementById('cartDiscount')?.value) || 0;
    
    // Calculate tax per item based on product's tax rate
    let totalTax = 0;
    currentCart.forEach(item => {
        const product = products.find(p => p.id === item.productId);
        const taxRate = product?.taxRate !== undefined ? product.taxRate / 100 : 0.06; // Default 6% if not set
        const itemSubtotal = item.price * item.quantity;
        // Apply proportional discount
        const itemDiscount = discount > 0 ? (itemSubtotal / subtotal) * discount : 0;
        const taxableAmount = Math.max(0, itemSubtotal - itemDiscount);
        totalTax += taxableAmount * taxRate;
    });
    
    const taxableSubtotal = Math.max(0, subtotal - discount);
    const total = taxableSubtotal + totalTax;
    
    const subtotalEl = document.getElementById('cartSubtotal');
    const taxEl = document.getElementById('cartTax');
    const totalEl = document.getElementById('cartTotal');
    
    if (subtotalEl) subtotalEl.textContent = `RM ${subtotal.toFixed(2)}`;
    if (taxEl) taxEl.textContent = `RM ${totalTax.toFixed(2)}`;
    if (totalEl) totalEl.textContent = `RM ${total.toFixed(2)}`;
}

// ==================== HOLD / RECALL SALES ====================
function holdSale() {
    if (currentCart.length === 0) {
        showToast('Cart is empty!', 'warning');
        return;
    }
    
    const customerId = document.getElementById('posCustomer')?.value || '';
    const customer = customers.find(c => c.id === customerId);
    const salesperson = document.getElementById('posSalesperson')?.value || '';
    
    heldSales.push({
        id: generateUUID(),
        date: new Date().toISOString(),
        customerId: customerId,
        customerName: customer?.name || 'Walk-in',
        salesperson: salesperson,
        items: [...currentCart],
        discount: parseFloat(document.getElementById('cartDiscount')?.value) || 0
    });
    
    saveHeldSales();
    currentCart = [];
    document.getElementById('cartDiscount').value = 0;
    renderCart();
    updateCartTotals();
    
    showToast('Sale held successfully!', 'success');
}

function showHeldSales() {
    if (heldSales.length === 0) {
        showToast('No held sales', 'info');
        return;
    }
    
    const html = `
        <div class="held-sales-list">
            ${heldSales.map((sale, index) => `
                <div class="held-sale-item">
                    <div class="held-sale-info">
                        <strong>${sale.customerName}</strong>
                        <span>${formatHeldDate(sale.date)}</span>
                        <span>${sale.items.length} items - RM ${sale.items.reduce((s, i) => s + i.price * i.quantity, 0).toFixed(2)}</span>
                    </div>
                    <div class="held-sale-actions">
                        <button class="btn-primary btn-sm" onclick="recallSale(${index}); closeHeldModal();">Recall</button>
                        <button class="btn-outline btn-sm danger" onclick="deleteHeldSale(${index})">Delete</button>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
    
    // Create temporary modal for held sales
    let modal = document.getElementById('heldSalesModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'heldSalesModal';
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 500px;">
                <div class="modal-header">
                    <h3 class="modal-title">Held Sales</h3>
                    <button class="modal-close" onclick="closeHeldModal()">&times;</button>
                </div>
                <div id="heldSalesContent"></div>
            </div>
        `;
        document.body.appendChild(modal);
    }
    
    document.getElementById('heldSalesContent').innerHTML = html;
    modal.style.display = '';
    modal.classList.add('show');
}

function closeHeldModal() {
    const modal = document.getElementById('heldSalesModal');
    if (modal) modal.classList.remove('show');
}

function recallSale(index) {
    const sale = heldSales[index];
    if (!sale) return;
    
    // Check if cart has items
    if (currentCart.length > 0) {
        if (!confirm('Current cart has items. Replace with held sale?')) return;
    }
    
    currentCart = [...sale.items];
    document.getElementById('posCustomer').value = sale.customerId || '';
    document.getElementById('posSalesperson').value = sale.salesperson || '';
    document.getElementById('cartDiscount').value = sale.discount || 0;
    
    // Remove from held
    heldSales.splice(index, 1);
    saveHeldSales();
    
    renderCart();
    updateCartTotals();
    showToast('Sale recalled!', 'success');
}

function deleteHeldSale(index) {
    if (confirm('Delete this held sale?')) {
        heldSales.splice(index, 1);
        saveHeldSales();
        showHeldSales();
    }
}

function updateHeldCount() {
    const el = document.getElementById('heldCount');
    if (el) el.textContent = heldSales.length;
}

function formatHeldDate(dateStr) {
    const date = new Date(dateStr);
    return date.toLocaleString('en-MY', { 
        month: 'short', 
        day: 'numeric', 
        hour: '2-digit', 
        minute: '2-digit' 
    });
}

// ==================== PAYMENT PROCESSING ====================

// Auto-generate transaction reference
function generateTransactionRef() {
    const now = new Date();
    const prefix = 'TXN';
    const date = now.toISOString().slice(0, 10).replace(/-/g, '');
    const time = now.toTimeString().slice(0, 8).replace(/:/g, '');
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `${prefix}${date}${time}${random}`;
}

function showPaymentModal() {
    if (currentCart.length === 0) {
        showToast('Cart is empty!', 'warning');
        return;
    }
    
    // Reset processing flag when opening modal
    isProcessingPayment = false;
    
    const modal = document.getElementById('posPaymentModal');
    const subtotal = currentCart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const discount = parseFloat(document.getElementById('cartDiscount')?.value) || 0;
    const tax = calculateCartTax();
    const total = Math.max(0, subtotal - discount) + tax;
    
    document.getElementById('paymentTotalAmount').textContent = `RM ${total.toFixed(2)}`;
    document.getElementById('amountReceived').value = '';
    document.getElementById('changeDisplay').style.display = 'none';
    // Auto-generate Transaction ID
    document.getElementById('posPaymentReference').value = generateTransactionRef();;
    
    // Reset to cash
    document.querySelector('input[name="paymentMethod"][value="cash"]').checked = true;
    
    // Get credit payment elements
    const creditPaymentOption = document.getElementById('creditPaymentOption');
    const creditInfoGroup = document.getElementById('creditInfoGroup');
    
    // Default: hide credit option
    if (creditPaymentOption) creditPaymentOption.style.display = 'none';
    if (creditInfoGroup) creditInfoGroup.style.display = 'none';
    
    // Check if customer has credit terms
    const customerId = document.getElementById('posCustomer')?.value || '';
    
    if (customerId && creditPaymentOption && creditInfoGroup) {
        // Get CRM customer data
        const crmCustomer = getCRMCustomerById(customerId);
        console.log('POS Credit Check - Customer ID:', customerId, 'CRM Customer:', crmCustomer);
        
        if (crmCustomer && crmCustomer.creditTerms && crmCustomer.creditTerms !== 'cod') {
            // Show credit payment option
            creditPaymentOption.style.display = 'block';
            console.log('POS Credit - Showing credit option for:', crmCustomer.name, 'Terms:', crmCustomer.creditTerms);
            
            // Calculate credit info
            const creditLimit = parseFloat(crmCustomer.creditLimit) || 0;
            const outstanding = parseFloat(crmCustomer.outstandingBalance) || 0;
            const available = creditLimit - outstanding;
            
            // Update credit info display
            const termLabels = {
                '7days': 'Net 7 Days',
                '14days': 'Net 14 Days',
                '30days': 'Net 30 Days',
                '60days': 'Net 60 Days',
                '90days': 'Net 90 Days'
            };
            
            document.getElementById('creditTermsDisplay').textContent = termLabels[crmCustomer.creditTerms] || crmCustomer.creditTerms;
            document.getElementById('creditLimitDisplay').textContent = `RM ${creditLimit.toFixed(2)}`;
            document.getElementById('creditOutstandingDisplay').textContent = `RM ${outstanding.toFixed(2)}`;
            document.getElementById('creditAvailableDisplay').textContent = `RM ${available.toFixed(2)}`;
            
            // Color code available credit
            const availableEl = document.getElementById('creditAvailableDisplay');
            if (available < total) {
                availableEl.classList.add('over-limit');
                availableEl.classList.remove('credit-available');
            } else {
                availableEl.classList.add('credit-available');
                availableEl.classList.remove('over-limit');
            }
        } else {
            creditPaymentOption.style.display = 'none';
            creditInfoGroup.style.display = 'none';
        }
    }
    
    // Add event listener for payment method change
    document.querySelectorAll('input[name="paymentMethod"]').forEach(radio => {
        radio.addEventListener('change', handlePaymentMethodChange);
    });
    
    // Initialize view
    handlePaymentMethodChange();
    
    modal.style.display = '';
    modal.classList.add('show');
}

function closePosPaymentModal() {
    const modal = document.getElementById('posPaymentModal');
    if (modal) {
        modal.classList.remove('show');
        modal.style.display = 'none';
    }
    isProcessingPayment = false;
}

function handlePaymentMethodChange() {
    const paymentMethod = document.querySelector('input[name="paymentMethod"]:checked')?.value;
    const cashAmountGroup = document.getElementById('cashAmountGroup');
    const creditInfoGroup = document.getElementById('creditInfoGroup');
    
    if (cashAmountGroup) {
        cashAmountGroup.style.display = paymentMethod === 'cash' ? 'block' : 'none';
    }
    
    if (creditInfoGroup) {
        creditInfoGroup.style.display = paymentMethod === 'credit' ? 'block' : 'none';
    }
}

// Helper to get CRM customer by ID
function getCRMCustomerById(customerId) {
    // Try window.crmCustomers first (set by tenant data loading)
    if (Array.isArray(window.crmCustomers) && window.crmCustomers.length > 0) {
        const found = window.crmCustomers.find(c => c.id === customerId);
        if (found) return found;
    }
    // Try module-level crmCustomers
    if (typeof crmCustomers !== 'undefined' && Array.isArray(crmCustomers)) {
        const found = crmCustomers.find(c => c.id === customerId);
        if (found) return found;
    }
    // Try from localStorage
    try {
        const stored = localStorage.getItem('ezcubic_crm_customers');
        if (stored) {
            const customers = JSON.parse(stored);
            const found = customers.find(c => c.id === customerId);
            if (found) return found;
        }
    } catch (e) {
        console.error('Error loading CRM customers:', e);
    }
    
    // Also check regular customers (they may have credit settings)
    if (Array.isArray(window.customers) && window.customers.length > 0) {
        const found = window.customers.find(c => c.id === customerId);
        if (found) return found;
    }
    
    // Try from localStorage for regular customers
    try {
        const stored = localStorage.getItem('ezcubic_customers');
        if (stored) {
            const customers = JSON.parse(stored);
            const found = customers.find(c => c.id === customerId);
            if (found) return found;
        }
    } catch (e) {
        console.error('Error loading regular customers:', e);
    }
    
    return null;
}

function calculateChange() {
    const subtotal = currentCart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const discount = parseFloat(document.getElementById('cartDiscount')?.value) || 0;
    
    // Calculate tax per product
    let totalTax = 0;
    currentCart.forEach(item => {
        const product = products.find(p => p.id === item.productId);
        const taxRate = product?.taxRate !== undefined ? product.taxRate / 100 : 0.06;
        const itemSubtotal = item.price * item.quantity;
        const itemDiscount = discount > 0 ? (itemSubtotal / subtotal) * discount : 0;
        const taxableAmount = Math.max(0, itemSubtotal - itemDiscount);
        totalTax += taxableAmount * taxRate;
    });
    
    const total = Math.max(0, subtotal - discount) + totalTax;
    
    const received = parseFloat(document.getElementById('amountReceived').value) || 0;
    const change = received - total;
    
    const displayEl = document.getElementById('changeDisplay');
    const changeEl = document.getElementById('changeAmount');
    
    if (received > 0) {
        displayEl.style.display = 'flex';
        changeEl.textContent = `RM ${Math.max(0, change).toFixed(2)}`;
        changeEl.style.color = change >= 0 ? '#10b981' : '#ef4444';
    } else {
        displayEl.style.display = 'none';
    }
}

function fillExactAmount() {
    const subtotal = currentCart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const discount = parseFloat(document.getElementById('cartDiscount')?.value) || 0;
    const tax = calculateCartTax();
    const total = Math.max(0, subtotal - discount) + tax;
    
    document.getElementById('amountReceived').value = total.toFixed(2);
    calculateChange();
}

function calculateCartTax() {
    const subtotal = currentCart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const discount = parseFloat(document.getElementById('cartDiscount')?.value) || 0;
    
    let totalTax = 0;
    currentCart.forEach(item => {
        const product = products.find(p => p.id === item.productId);
        const taxRate = product?.taxRate !== undefined ? product.taxRate / 100 : 0.06;
        const itemSubtotal = item.price * item.quantity;
        const itemDiscount = discount > 0 ? (itemSubtotal / subtotal) * discount : 0;
        const taxableAmount = Math.max(0, itemSubtotal - itemDiscount);
        totalTax += taxableAmount * taxRate;
    });
    
    return totalTax;
}

// Flag to prevent double submission
let isProcessingPayment = false;

function processPayment(event) {
    event.preventDefault();
    
    // Prevent double submission
    if (isProcessingPayment) {
        console.log('Payment already processing...');
        return;
    }
    
    // ===== VALIDATE OUTLET SELECTION =====
    const posOutletFilter = document.getElementById('posOutletFilter');
    const outletFilterVisible = posOutletFilter && posOutletFilter.closest('.pos-outlet-filter')?.style.display !== 'none';
    let selectedOutlet = posOutletFilter?.value || 'all';
    
    // If outlet filter is hidden (single-branch plans), use default HQ branch
    if (!outletFilterVisible || selectedOutlet === 'all') {
        // Get default branch or HQ
        const defaultBranch = (window.branches || []).find(b => b.isDefault || b.id === 'BRANCH_HQ');
        selectedOutlet = defaultBranch?.id || 'BRANCH_HQ';
    }
    
    // ===== VALIDATE SALESPERSON/CASHIER SELECTION =====
    const salesperson = document.getElementById('posSalesperson')?.value || '';
    if (!salesperson) {
        showToast('Please select a cashier/staff before checkout!', 'error');
        document.getElementById('posSalesperson')?.focus();
        return;
    }
    
    // Check if cart is empty
    if (currentCart.length === 0) {
        showToast('Cart is empty!', 'error');
        return;
    }
    
    // Set processing flag AFTER validations pass
    isProcessingPayment = true;
    
    const paymentMethod = document.querySelector('input[name="paymentMethod"]:checked').value;
    const reference = document.getElementById('posPaymentReference').value.trim();
    
    const subtotal = currentCart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const discount = parseFloat(document.getElementById('cartDiscount')?.value) || 0;
    const tax = calculateCartTax();
    const total = Math.max(0, subtotal - discount) + tax;
    
    // Validate cash payment
    if (paymentMethod === 'cash') {
        const received = parseFloat(document.getElementById('amountReceived').value) || 0;
        if (received < total) {
            showToast('Insufficient amount received!', 'error');
            isProcessingPayment = false;
            return;
        }
    }
    
    // Validate credit payment
    if (paymentMethod === 'credit') {
        const customerId = document.getElementById('posCustomer')?.value || '';
        if (!customerId) {
            showToast('Please select a customer for credit payment!', 'error');
            isProcessingPayment = false;
            return;
        }
        
        const crmCustomer = getCRMCustomerById(customerId);
        if (!crmCustomer || !crmCustomer.creditTerms || crmCustomer.creditTerms === 'cod') {
            showToast('This customer does not have credit terms!', 'error');
            isProcessingPayment = false;
            return;
        }
        
        const creditLimit = parseFloat(crmCustomer.creditLimit) || 0;
        const outstanding = parseFloat(crmCustomer.outstandingBalance) || 0;
        const available = creditLimit - outstanding;
        
        if (total > available) {
            showToast(`Credit limit exceeded! Available: RM ${available.toFixed(2)}`, 'error');
            isProcessingPayment = false;
            return;
        }
    }
    
    // Create sale record
    const customerId = document.getElementById('posCustomer')?.value || '';
    
    // Look up customer in CRM first, then fall back to legacy customers
    let customer = null;
    let customerName = 'Walk-in Customer';
    
    if (customerId) {
        // Try CRM customers first
        if (typeof getCRMCustomersForSelect === 'function') {
            const crmCustomers = getCRMCustomersForSelect();
            const crmCustomer = crmCustomers.find(c => c.id === customerId);
            if (crmCustomer) {
                customerName = crmCustomer.name;
                customer = crmCustomer;
            }
        }
        
        // Fall back to legacy customers array
        if (!customer && Array.isArray(customers)) {
            customer = customers.find(c => c.id === customerId);
            if (customer) {
                customerName = customer.name;
            }
        }
    }
    
    // Get current branch/outlet (use selectedOutlet from validation above)
    const currentBranch = typeof getCurrentBranch === 'function' ? getCurrentBranch() : null;
    const branchId = selectedOutlet !== 'all' ? selectedOutlet : (currentBranch?.id || 'BRANCH_HQ');
    const branchName = getBranchNameById(branchId);
    
    // Get current tenant ID for multi-tenant support
    const currentTenantId = typeof getCurrentTenantId === 'function' ? getCurrentTenantId() : null;
    
    // Calculate due date for credit sales based on customer's credit terms
    let dueDate = null;
    let creditTerms = null;
    if (paymentMethod === 'credit' && customerId) {
        const crmCustomer = getCRMCustomerById(customerId);
        if (crmCustomer && crmCustomer.creditTerms) {
            creditTerms = crmCustomer.creditTerms;
            const saleDate = new Date();
            const termDays = {
                'cod': 0,
                '7days': 7,
                '14days': 14,
                '30days': 30,
                '60days': 60,
                '90days': 90
            };
            const days = termDays[crmCustomer.creditTerms] || 30;
            dueDate = new Date(saleDate);
            dueDate.setDate(dueDate.getDate() + days);
            dueDate = dueDate.toISOString();
        }
    }
    
    const sale = {
        id: generateUUID(),
        receiptNo: generateReceiptNumber(),
        date: new Date().toISOString(),
        dueDate: dueDate, // Due date for credit sales (for AR aging reports)
        creditTerms: creditTerms, // Store credit terms used
        isCredit: paymentMethod === 'credit', // Flag for AR reports
        paidAmount: paymentMethod === 'credit' ? 0 : total, // Credit sales start unpaid
        tenantId: currentTenantId, // Add tenant ID for multi-tenant support
        customerId: customerId,
        customerName: customerName,
        salesperson: document.getElementById('posSalesperson')?.value || '',
        cashier: document.getElementById('posSalesperson')?.value || '',
        branchId: branchId,
        branchName: branchName,
        items: [...currentCart],
        subtotal: subtotal,
        discount: discount,
        tax: tax,
        total: total,
        paymentMethod: paymentMethod,
        reference: reference,
        amountReceived: paymentMethod === 'cash' ? parseFloat(document.getElementById('amountReceived').value) : total,
        change: paymentMethod === 'cash' ? parseFloat(document.getElementById('amountReceived').value) - total : 0,
        status: paymentMethod === 'credit' ? 'unpaid' : 'completed' // Credit sales start as unpaid
    };
    
    // Save sale
    sales.push(sale);
    localStorage.setItem(SALES_KEY, JSON.stringify(sales));
    
    // Update stock using branch stock system
    currentCart.forEach(item => {
        const productIndex = products.findIndex(p => p.id === item.productId);
        if (productIndex !== -1) {
            // Use centralized branch stock system
            if (branchId && branchId !== 'all' && typeof adjustBranchStock === 'function') {
                // Deduct from branch-specific stock
                adjustBranchStock(item.productId, branchId, -item.quantity);
                
                // Update total stock in product (sum of all branches)
                if (typeof getTotalBranchStock === 'function') {
                    products[productIndex].stock = getTotalBranchStock(item.productId);
                }
            } else {
                // Fallback to simple stock deduction from total stock
                products[productIndex].stock = Math.max(0, (products[productIndex].stock || 0) - item.quantity);
                
                // Also adjust default branch stock
                if (typeof adjustBranchStock === 'function') {
                    const defaultBranchId = typeof getCurrentBranchId === 'function' ? getCurrentBranchId() : 'BRANCH_HQ';
                    adjustBranchStock(item.productId, defaultBranchId, -item.quantity);
                }
            }
            
            // Record stock movement with branch info
            if (typeof recordStockMovement === 'function') {
                recordStockMovement({
                    productId: item.productId,
                    productName: item.name,
                    type: 'sale',
                    quantity: -item.quantity,
                    branchId: branchId,
                    branchName: branchName,
                    reason: 'POS Sale',
                    reference: sale.receiptNo,
                    notes: `Sold at ${branchName} to ${sale.customerName}`
                });
            }
        }
    });
    
    // Save updated products to localStorage
    if (typeof saveProducts === 'function') {
        saveProducts();
    } else {
        localStorage.setItem(PRODUCTS_KEY, JSON.stringify(products));
    }
    
    // Update customer loyalty points
    if (customer && settings.enableLoyaltyPoints) {
        const pointsEarned = Math.floor(total * settings.pointsPerRM);
        const customerIndex = customers.findIndex(c => c.id === customerId);
        if (customerIndex !== -1) {
            customers[customerIndex].loyaltyPoints = (customers[customerIndex].loyaltyPoints || 0) + pointsEarned;
            customers[customerIndex].totalPurchases = (customers[customerIndex].totalPurchases || 0) + total;
            customers[customerIndex].lastPurchase = sale.date;
            saveCustomers();
        }
    }
    
    // Link sale to CRM customer
    if (customerId && typeof linkSaleToCRMCustomer === 'function') {
        linkSaleToCRMCustomer(customerId, {
            saleId: sale.id,
            receiptNo: sale.receiptNo,
            date: sale.date,
            total: sale.total,
            items: sale.items.map(item => ({
                name: item.name,
                quantity: item.quantity,
                price: item.price
            })),
            paymentMethod: sale.paymentMethod
        });
    }
    
    // Update CRM customer outstanding balance for credit payments
    if (paymentMethod === 'credit' && customerId) {
        updateCRMCustomerCredit(customerId, total);
    }
    
    // Also record as income transaction (for credit, mark as accounts receivable)
    const incomeTransaction = {
        id: generateUUID(),
        date: new Date().toISOString().split('T')[0],
        amount: total,
        category: 'Sales',
        description: `POS Sale #${sale.receiptNo}`,
        type: 'income',
        method: paymentMethod,
        reference: sale.receiptNo,
        timestamp: new Date().toISOString()
    };
    // Push to businessData.transactions to ensure proper sync with All Transactions
    if (typeof businessData !== 'undefined' && businessData.transactions) {
        businessData.transactions.push(incomeTransaction);
    } else {
        transactions.push(incomeTransaction);
    }
    
    // Record cost of goods sold (COGS) as expense
    const totalCost = currentCart.reduce((sum, item) => {
        const product = products.find(p => p.id === item.productId);
        return sum + ((product?.cost || 0) * item.quantity);
    }, 0);
    
    if (totalCost > 0) {
        const cogsTransaction = {
            id: generateUUID(),
            date: new Date().toISOString().split('T')[0],
            amount: totalCost,
            category: 'Cost of Goods Sold',
            description: `COGS for Sale #${sale.receiptNo}`,
            type: 'expense',
            method: paymentMethod,
            reference: sale.receiptNo,
            timestamp: new Date().toISOString()
        };
        // Push to businessData.transactions to ensure proper sync with All Transactions
        if (typeof businessData !== 'undefined' && businessData.transactions) {
            businessData.transactions.push(cogsTransaction);
        } else {
            transactions.push(cogsTransaction);
        }
        
        // Show COGS expense recorded notification
        setTimeout(() => {
            showToast(`📦 COGS expense recorded: RM ${totalCost.toFixed(2)}`, 'info');
        }, 1500);
    }
    
    saveData();
    
    // Also save sales to tenant storage
    window.sales = sales;
    if (typeof saveToUserTenant === 'function') {
        saveToUserTenant();
        console.log('POS: Sales and products saved to tenant');
    }
    
    // Update order stats if function exists
    if (typeof updateOrderStats === 'function') {
        updateOrderStats();
    }
    
    // Also refresh orders table if visible
    if (typeof renderOrders === 'function') {
        renderOrders();
    }
    
    closePosPaymentModal();
    
    // Clear the cart BEFORE showing receipt to prevent double submission
    currentCart = [];
    renderCart();
    updateCartTotals();
    
    // Reset payment form
    const paymentForm = document.getElementById('paymentForm');
    if (paymentForm) paymentForm.reset();
    document.getElementById('amountReceived').value = '';
    document.getElementById('changeAmount').textContent = 'RM 0.00';
    document.getElementById('posPaymentReference').value = '';
    
    // Show receipt
    showReceipt(sale);
    
    // Refresh POS products to show updated stock
    renderPOSProducts();
    
    // Reset processing flag
    isProcessingPayment = false;
    
    // Show success notification
    showToast('✅ Sale completed successfully!', 'success');
    
    // Record audit log for the sale
    if (typeof recordAuditLog === 'function') {
        recordAuditLog({
            action: 'create',
            module: 'sales',
            subModule: 'pos',
            recordId: sale.id,
            recordName: sale.receiptNo,
            description: `POS sale completed - ${sale.items.length} item(s), Total: RM ${sale.total.toFixed(2)}`,
            newValue: {
                receiptNo: sale.receiptNo,
                customer: sale.customerName,
                items: sale.items.map(i => `${i.name} x${i.quantity}`).join(', '),
                total: sale.total,
                paymentMethod: sale.paymentMethod,
                cashier: sale.salesperson,
                branch: sale.branchName
            }
        });
    }
    
    // Show income recorded notification after a delay
    setTimeout(() => {
        showToast(`💰 Income recorded: RM ${total.toFixed(2)}`, 'success');
    }, 500);
}

function generateReceiptNumber() {
    // Use customizable document numbering if available
    if (typeof generateDocumentNumber === 'function') {
        return generateDocumentNumber('receipt');
    }
    
    // Fallback to original logic
    const date = new Date();
    const prefix = 'RCP';
    const dateStr = date.toISOString().split('T')[0].replace(/-/g, '');
    const sequence = (sales.length + 1).toString().padStart(4, '0');
    return `${prefix}${dateStr}-${sequence}`;
}

// ==================== RECEIPT ====================
function showReceipt(sale) {
    const modal = document.getElementById('receiptModal');
    const content = document.getElementById('receiptContent');
    
    const businessName = settings.businessName || 'A Lazy Human Business';
    const businessAddress = settings.businessAddress || '';
    const sst = settings.sstNumber || '';
    const branchName = sale.branchName || 'Main Branch';
    
    content.innerHTML = `
        <div class="receipt">
            <div class="receipt-header">
                <h2>${escapeHtml(businessName)}</h2>
                <p style="font-weight: 600; color: #2563eb;"><i class="fas fa-store"></i> ${escapeHtml(branchName)}</p>
                ${businessAddress ? `<p>${escapeHtml(businessAddress)}</p>` : ''}
                ${sst ? `<p>SST No: ${sst}</p>` : ''}
            </div>
            <div class="receipt-divider">================================</div>
            <div class="receipt-info">
                <div><strong>Receipt:</strong> ${sale.receiptNo}</div>
                <div><strong>Date:</strong> ${typeof formatMalaysiaDateTime === 'function' ? formatMalaysiaDateTime(sale.date) : new Date(sale.date).toLocaleString('en-MY', { timeZone: 'Asia/Kuala_Lumpur' })}</div>
                <div><strong>Customer:</strong> ${escapeHtml(sale.customerName)}</div>
                ${sale.salesperson ? `<div><strong>Served by:</strong> ${escapeHtml(sale.salesperson)}</div>` : ''}
            </div>
            <div class="receipt-divider">================================</div>
            <div class="receipt-items">
                ${sale.items.map(item => `
                    <div class="receipt-item">
                        <div class="item-name">${escapeHtml(item.name)}</div>
                        <div class="item-details">
                            ${item.quantity} x RM${item.price.toFixed(2)}
                            <span class="item-total">RM${(item.quantity * item.price).toFixed(2)}</span>
                        </div>
                        ${item.memo ? `<div class="item-memo" style="font-size: 10px; color: #666; padding-left: 10px;"><i>📝 ${escapeHtml(item.memo)}</i></div>` : ''}
                    </div>
                `).join('')}
            </div>
            <div class="receipt-divider">--------------------------------</div>
            <div class="receipt-totals">
                <div class="total-row">
                    <span>Subtotal:</span>
                    <span>RM ${sale.subtotal.toFixed(2)}</span>
                </div>
                ${sale.discount > 0 ? `
                <div class="total-row">
                    <span>Discount:</span>
                    <span>-RM ${sale.discount.toFixed(2)}</span>
                </div>
                ` : ''}
                <div class="total-row">
                    <span>Tax (6% SST):</span>
                    <span>RM ${sale.tax.toFixed(2)}</span>
                </div>
                <div class="total-row grand-total">
                    <span>TOTAL:</span>
                    <span>RM ${sale.total.toFixed(2)}</span>
                </div>
            </div>
            <div class="receipt-divider">--------------------------------</div>
            <div class="receipt-payment">
                <div><strong>Payment:</strong> ${capitalizeFirst(sale.paymentMethod)}</div>
                ${sale.paymentMethod === 'cash' ? `
                <div>Received: RM ${sale.amountReceived.toFixed(2)}</div>
                <div>Change: RM ${sale.change.toFixed(2)}</div>
                ` : ''}
            </div>
            <div class="receipt-divider">================================</div>
            <div class="receipt-footer">
                <p>Thank you for your purchase!</p>
                <p>Terima kasih atas pembelian anda!</p>
            </div>
        </div>
    `;
    
    // Store for printing
    window.lastReceipt = sale;
    
    modal.style.display = '';
    modal.classList.add('show');
}

function printReceipt() {
    const content = document.getElementById('receiptContent');
    if (!content) return;
    
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Receipt</title>
            <style>
                body { font-family: 'Courier New', monospace; font-size: 12px; width: 280px; margin: 0 auto; }
                .receipt { padding: 10px; }
                .receipt-header { text-align: center; margin-bottom: 10px; }
                .receipt-header h2 { margin: 0; font-size: 14px; }
                .receipt-divider { text-align: center; margin: 5px 0; }
                .receipt-item { margin: 5px 0; }
                .item-details { display: flex; justify-content: space-between; padding-left: 10px; }
                .total-row { display: flex; justify-content: space-between; }
                .grand-total { font-weight: bold; font-size: 14px; margin-top: 5px; }
                .receipt-footer { text-align: center; margin-top: 10px; font-size: 10px; }
                @media print { body { width: 100%; } }
            </style>
        </head>
        <body>${content.innerHTML}</body>
        </html>
    `);
    printWindow.document.close();
    printWindow.print();
}

// ==================== EMAIL RECEIPT ====================
function emailReceipt() {
    const sale = window.lastReceipt;
    if (!sale) {
        showNotification('Error', 'No receipt to email', 'error');
        return;
    }

    // Get company settings
    const settings = JSON.parse(localStorage.getItem('companySettings') || '{}');
    const companyName = settings.businessName || 'Our Store';

    // Build items list
    const itemsList = sale.items.map((item, i) => 
        `${i + 1}. ${item.name} x ${item.quantity} @ RM${item.price.toFixed(2)} = RM${(item.quantity * item.price).toFixed(2)}`
    ).join('%0D%0A');

    // Build email subject
    const subject = encodeURIComponent(`Receipt from ${companyName} - ${sale.receiptNo}`);

    // Build email body
    const body = encodeURIComponent(
`Thank you for shopping at ${companyName}!

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
RECEIPT: ${sale.receiptNo}
Date: ${sale.date} ${sale.time}
Cashier: ${sale.cashier}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

ITEMS:
${itemsList}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Subtotal: RM ${sale.subtotal.toFixed(2)}
${sale.discount > 0 ? `Discount: - RM ${sale.discount.toFixed(2)}\n` : ''}Tax (6% SST): RM ${sale.tax.toFixed(2)}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TOTAL: RM ${sale.total.toFixed(2)}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Payment Method: ${sale.paymentMethod.charAt(0).toUpperCase() + sale.paymentMethod.slice(1)}
${sale.paymentMethod === 'cash' ? `Amount Received: RM ${sale.amountReceived.toFixed(2)}\nChange: RM ${sale.change.toFixed(2)}` : ''}

Thank you for your purchase!
Terima kasih atas pembelian anda!

${companyName}
`);

    // Open mailto link
    const mailtoLink = `mailto:?subject=${subject}&body=${body}`;
    window.location.href = mailtoLink;

    showNotification('Email Opened', 'Your email app should open with the receipt details. Add the customer email and send.', 'success');
}

// ==================== SALES HISTORY ====================
function loadSales() {
    const stored = localStorage.getItem(SALES_KEY);
    if (stored) {
        sales = JSON.parse(stored);
    }
}

// ==================== BRANCH HELPER ====================
function getBranchNameById(branchId) {
    if (!branchId || branchId === 'all') return 'All Branches';
    
    // Try branches array first
    if (typeof branches !== 'undefined' && branches.length > 0) {
        const branch = branches.find(b => b.id === branchId);
        if (branch) return branch.name;
    }
    
    // Fall back to outlets
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
    
    // Get branches from window or local scope - ensure it's an array
    let branchList = window.branches || (typeof branches !== 'undefined' ? branches : []);
    if (!Array.isArray(branchList)) branchList = [];
    let activeBranches = branchList.filter(b => b && b.status === 'active');
    
    // Always ensure at least HQ exists for single-branch plans
    if (activeBranches.length === 0) {
        activeBranches = [{
            id: 'hq',
            name: 'Headquarters (HQ)',
            code: 'HQ',
            type: 'hq',
            status: 'active'
        }];
    }
    
    // Check if user's plan allows multi-branch
    let canUseMultiBranch = false;
    const currentUser = typeof getCurrentUser === 'function' ? getCurrentUser() : window.currentUser;
    const settings = typeof getPlatformSettings === 'function' ? getPlatformSettings() : null;
    
    // Founder and ERP Assistant always have unlimited branch access
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
    
    // Hide outlet filter if plan doesn't support multi-branch or only 1 branch
    const posOutletContainer = posOutletFilter.closest('.pos-outlet-filter');
    const shouldHideSelector = !canUseMultiBranch || activeBranches.length <= 1;
    
    if (posOutletContainer) {
        posOutletContainer.style.display = shouldHideSelector ? 'none' : '';
    }
    
    // For single-branch/Starter plan: auto-select the only branch
    if (shouldHideSelector && activeBranches.length > 0) {
        posOutletFilter.innerHTML = `<option value="${activeBranches[0].id}">${escapeHtml(activeBranches[0].name)}</option>`;
        posOutletFilter.value = activeBranches[0].id;
        return;
    }
    
    // Populate outlet dropdown with branches for multi-branch plans
    const currentValue = posOutletFilter.value;
    posOutletFilter.innerHTML = `
        <option value="all">-- Select Outlet/Branch --</option>
        ${activeBranches.map(branch => `
            <option value="${branch.id}">${escapeHtml(branch.name)}${branch.code ? ` (${escapeHtml(branch.code)})` : ''}</option>
        `).join('')}
    `;
    
    // Restore previous selection if valid
    if (currentValue && currentValue !== 'all' && activeBranches.find(b => b.id === currentValue)) {
        posOutletFilter.value = currentValue;
    }
}

// Function to get sales filtered by branch
function getSalesByBranch(branchId) {
    const salesList = window.sales || (typeof sales !== 'undefined' ? sales : []);
    if (!branchId || branchId === 'all') {
        return salesList;
    }
    return salesList.filter(s => s.branchId === branchId);
}

// Function to get sales summary by branch
function getSalesSummaryByBranch() {
    const salesList = window.sales || (typeof sales !== 'undefined' ? sales : []);
    const branchList = window.branches || (typeof branches !== 'undefined' ? branches : []);
    
    const summary = {};
    
    // Initialize all branches
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
    
    // Aggregate sales by branch
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

// ==================== WINDOW EXPORTS ====================
// Export all functions used by inline onclick handlers
window.initializePOS = initializePOS;
window.addToCart = addToCart;
window.updateCartItemQuantity = updateCartItemQuantity;
window.setCartItemQuantity = setCartItemQuantity;
window.removeFromCart = removeFromCart;
window.filterPOSCategory = filterPOSCategory;
window.filterPOSProducts = filterPOSProducts;
window.filterProductsByOutlet = filterProductsByOutlet;
window.filterPOSByOutlet = filterPOSByOutlet;
window.clearCart = clearCart;
window.holdSale = holdSale;
window.showHeldSales = showHeldSales;
window.recallSale = recallSale;
window.deleteHeldSale = deleteHeldSale;
window.closeHeldModal = closeHeldModal;
window.showCheckout = showPaymentModal;
window.showPaymentModal = showPaymentModal;
window.closePosPaymentModal = closePosPaymentModal;
window.processPayment = processPayment;
// Note: selectPOSCustomer was removed - customer selection handled by posCustomer dropdown
window.showItemMemo = showItemMemo;
// Note: saveItemMemo was removed - memo is saved directly in showItemMemo via prompt()
// Note: updateAmountReceived was removed - use calculateChange() instead
// Note: applyDiscount was removed - discount is applied via cartDiscount input field
window.printReceipt = printReceipt;
window.emailReceipt = emailReceipt;
window.loadSales = loadSales;
window.loadPOSCustomers = loadPOSCustomers;
window.loadPOSBranchSelector = loadPOSBranchSelector;
window.getSalesByBranch = getSalesByBranch;
window.getSalesSummaryByBranch = getSalesSummaryByBranch;
window.searchPOSProducts = searchPOSProducts;
window.calculateChange = calculateChange;
window.fillExactAmount = fillExactAmount;
window.generateTransactionRef = generateTransactionRef;

// Note: POS module is initialized by app.js via initializePhase2Modules()
