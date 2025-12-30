/**
 * EZCubic Phase 5 - Multi-Branch Management Module
 * Manage multiple business locations, branch transfers, and consolidated reporting
 */

// ==================== CONSTANTS ====================
const BRANCHES_KEY = 'ezcubic_branches';
const BRANCH_TRANSFERS_KEY = 'ezcubic_branch_transfers';
const CURRENT_BRANCH_KEY = 'ezcubic_current_branch';

// ==================== GLOBAL VARIABLES ====================
let branches = [];
let branchTransfers = [];
let currentBranchId = null;
let _branchesInitialized = false; // Prevent double initialization

// Sync local variables with window (called by multi-tenant system)
function syncBranchesFromWindow() {
    if (Array.isArray(window.branches)) {
        branches = window.branches;
    }
}
window.syncBranchesFromWindow = syncBranchesFromWindow;

// Create default HQ branch for all accounts
function createDefaultHQBranch() {
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
    branches.push(hqBranch);
    currentBranchId = hqBranch.id;
    
    // Save to localStorage
    localStorage.setItem(BRANCHES_KEY, JSON.stringify(branches));
    
    // Sync to window
    window.branches = branches;
    
    // DIRECT tenant save (don't use saveToUserTenant)
    const user = window.currentUser;
    if (user && user.tenantId) {
        const tenantKey = 'ezcubic_tenant_' + user.tenantId;
        let tenantData = JSON.parse(localStorage.getItem(tenantKey) || '{}');
        tenantData.branches = branches;
        tenantData.updatedAt = new Date().toISOString();
        localStorage.setItem(tenantKey, JSON.stringify(tenantData));
        console.log('✅ HQ branch saved directly to tenant');
    }
    
    console.log('Created default HQ branch');
}
window.createDefaultHQBranch = createDefaultHQBranch;

// Ensure default HQ exists - called when viewing branches section
function ensureDefaultHQExists() {
    console.log('ensureDefaultHQExists called, current branches:', branches.length);
    
    // Sync from window first
    if (Array.isArray(window.branches)) {
        branches = window.branches;
    }
    
    // Check if HQ exists
    const hqExists = branches.some(b => b.id === 'BRANCH_HQ' || b.type === 'headquarters');
    
    if (!hqExists) {
        const limit = getBranchLimit();
        console.log('No HQ found. Branch limit:', limit);
        
        // Create HQ for any plan that allows branches
        if (limit !== 0) {
            console.log('Creating HQ branch...');
            createDefaultHQBranch();
        }
    }
    
    // Sync back to window
    window.branches = branches;
}
window.ensureDefaultHQExists = ensureDefaultHQExists;

// Get branch limit based on current user's plan
function getBranchLimit() {
    const currentUser = typeof getCurrentUser === 'function' ? getCurrentUser() : window.currentUser;
    const settings = typeof getPlatformSettings === 'function' ? getPlatformSettings() : null;
    
    console.log('getBranchLimit - currentUser:', currentUser?.name, 'role:', currentUser?.role, 'plan:', currentUser?.plan);
    console.log('getBranchLimit - settings available:', !!settings);
    
    // Founder and ERP Assistant have unlimited branches
    if (currentUser && (currentUser.role === 'founder' || currentUser.role === 'erp_assistant')) {
        console.log('getBranchLimit - founder/erp_assistant detected, returning unlimited (-1)');
        return -1; // Unlimited
    }
    
    if (!currentUser || !settings || !settings.plans) {
        console.log('getBranchLimit - missing data, defaulting to 1');
        return 1; // Default to 1 branch limit
    }
    
    const userPlan = currentUser.plan || 'starter';
    const planData = settings.plans[userPlan];
    
    console.log('getBranchLimit - userPlan:', userPlan, 'planData:', planData?.name, 'branches limit:', planData?.limits?.branches);
    
    if (planData && planData.limits) {
        return planData.limits.branches || 1;
    }
    
    return 1;
}

// Check if user can add more branches
function canAddBranch() {
    const limit = getBranchLimit();
    const currentCount = branches.length;
    
    console.log('canAddBranch - limit:', limit, 'current:', currentCount);
    
    // -1 means unlimited
    if (limit === -1) {
        console.log('canAddBranch - unlimited, returning allowed:true');
        return { allowed: true, current: currentCount, limit: -1 };
    }
    
    const result = {
        allowed: currentCount < limit,
        current: currentCount,
        limit: limit
    };
    console.log('canAddBranch - result:', result);
    return result;
}
window.canAddBranch = canAddBranch;

// ==================== INITIALIZATION ====================
function initializeBranches() {
    console.log('initializeBranches called');
    console.log('Current user:', window.currentUser?.name, 'plan:', window.currentUser?.plan);
    console.log('window.branches before sync:', window.branches);
    
    // Sync from window first (in case tenant data was loaded)
    syncBranchesFromWindow();
    
    loadBranchData();
    
    console.log('Branches after loading:', branches.length, branches);
    
    // Create default HQ branch if none exists AND plan allows branches
    // Check if HQ already exists to avoid duplicates
    const hqExists = branches.some(b => b.id === 'BRANCH_HQ' || b.type === 'headquarters');
    console.log('HQ exists:', hqExists);
    
    if (!hqExists && branches.length === 0) {
        const limit = getBranchLimit();
        console.log('No branches found. Branch limit for plan:', limit);
        
        // Create HQ for any plan that allows at least 1 branch (limit > 0 or unlimited -1)
        if (limit !== 0) {
            console.log('Creating default HQ branch...');
            createDefaultHQBranch();
            console.log('Branches after HQ creation:', branches.length, branches);
        } else {
            console.log('Personal plan - branches not available');
        }
    }
    
    // Set current branch if not set
    if (!currentBranchId && branches.length > 0) {
        currentBranchId = branches.find(b => b.isDefault)?.id || branches[0].id;
        localStorage.setItem(CURRENT_BRANCH_KEY, currentBranchId);
    }
    
    renderBranchSelector();
    renderBranches();
    updateBranchStats();
    
    // Sync branches to POS outlets system
    syncBranchesToOutlets();
    
    // Initialize branch stock from existing products
    initializeBranchStockFromProducts();
}

function loadBranchData() {
    try {
        console.log('🏢 loadBranchData called');
        console.log('🏢 window.branches at start:', window.branches?.length || 0, window.branches);
        
        // PRIORITY 1: Check window first (set by loadUserTenantData with merged data)
        // This is the most up-to-date source after merge logic runs
        if (Array.isArray(window.branches) && window.branches.length > 0) {
            branches = window.branches;
            console.log('🏢 ✅ Branches loaded from window (merged):', branches.length);
            // Also load transfers from window
            if (Array.isArray(window.branchTransfers)) {
                branchTransfers = window.branchTransfers;
            }
            currentBranchId = localStorage.getItem(CURRENT_BRANCH_KEY);
            return; // Found window data, done
        }
        
        // PRIORITY 2: Load from tenant storage directly
        const user = window.currentUser;
        console.log('🏢 currentUser:', user?.email, 'tenantId:', user?.tenantId);
        if (user && user.tenantId) {
            const tenantKey = 'ezcubic_tenant_' + user.tenantId;
            const tenantData = JSON.parse(localStorage.getItem(tenantKey) || '{}');
            console.log('🏢 Tenant branches count:', tenantData.branches?.length || 0);
            if (Array.isArray(tenantData.branches) && tenantData.branches.length > 0) {
                branches = tenantData.branches;
                window.branches = branches;
                console.log('🏢 ✅ Branches loaded from tenant:', branches.length);
            }
            if (Array.isArray(tenantData.branchTransfers)) {
                branchTransfers = tenantData.branchTransfers;
                window.branchTransfers = branchTransfers;
                console.log('✅ Branch transfers loaded from tenant:', branchTransfers.length);
            }
            if (branches.length > 0) {
                currentBranchId = localStorage.getItem(CURRENT_BRANCH_KEY);
                return; // Found tenant data, done
            }
        }
        
        // PRIORITY 3: Fall back to localStorage key
        const storedBranches = localStorage.getItem(BRANCHES_KEY);
        console.log('Falling back to localStorage, stored:', !!storedBranches);
        if (storedBranches) {
            branches = JSON.parse(storedBranches);
            if (!Array.isArray(branches)) branches = [];
            console.log('✅ Branches loaded from localStorage key:', branches.length);
        }
        // Sync back to window
        window.branches = branches;
        
        // Load transfers
        if (Array.isArray(window.branchTransfers) && window.branchTransfers.length > 0) {
            branchTransfers = window.branchTransfers;
            console.log('✅ Transfers loaded from window:', branchTransfers.length);
        } else {
            const storedTransfers = localStorage.getItem(BRANCH_TRANSFERS_KEY);
            if (storedTransfers) {
                branchTransfers = JSON.parse(storedTransfers);
                if (!Array.isArray(branchTransfers)) branchTransfers = [];
            }
            window.branchTransfers = branchTransfers;
        }
        console.log('Loaded transfers:', branchTransfers.length);
        
        currentBranchId = localStorage.getItem(CURRENT_BRANCH_KEY);
    } catch (e) {
        console.error('Error loading branch data:', e);
        branches = [];
        branchTransfers = [];
    }
}

function saveBranchData() {
    try {
        console.log('🏢 saveBranchData called, branches count:', branches.length);
        localStorage.setItem(BRANCHES_KEY, JSON.stringify(branches));
        localStorage.setItem(BRANCH_TRANSFERS_KEY, JSON.stringify(branchTransfers));
        if (currentBranchId) {
            localStorage.setItem(CURRENT_BRANCH_KEY, currentBranchId);
        }
        
        // DIRECT tenant save (don't use saveToUserTenant - it overwrites with stale data)
        const user = window.currentUser;
        console.log('🏢 currentUser:', user?.email, 'tenantId:', user?.tenantId);
        if (user && user.tenantId) {
            const tenantKey = 'ezcubic_tenant_' + user.tenantId;
            let tenantData = JSON.parse(localStorage.getItem(tenantKey) || '{}');
            tenantData.branches = branches;
            tenantData.branchTransfers = branchTransfers;
            tenantData.updatedAt = new Date().toISOString();
            localStorage.setItem(tenantKey, JSON.stringify(tenantData));
            console.log('🏢 ✅ Branches saved directly to tenant:', branches.length);
        } else {
            console.log('🏢 ⚠️ No user/tenant, branches only saved to localStorage');
        }
        
        // Sync to window for other modules
        window.branches = branches;
        window.branchTransfers = branchTransfers;
        
        // Trigger cloud sync for deletions
        if (typeof window.fullCloudSync === 'function') {
            setTimeout(() => {
                window.fullCloudSync().catch(e => console.warn('Cloud sync failed:', e));
            }, 100);
        }
        
        console.log('saveBranchData: saved', branchTransfers.length, 'transfers');
    } catch (e) {
        console.error('Error saving branch data:', e);
    }
}

// ==================== BRANCH SELECTOR (GLOBAL) ====================
function renderBranchSelector() {
    const selector = document.getElementById('globalBranchSelector');
    if (!selector) return;
    
    const activeBranches = branches.filter(b => b.status === 'active');
    
    // Simple select dropdown
    selector.innerHTML = `
        <option value="all">All Branches</option>
        ${activeBranches.map(branch => `
            <option value="${branch.id}" ${branch.id === currentBranchId ? 'selected' : ''}>
                ${escapeHTML(branch.name)} (${escapeHTML(branch.code)})
            </option>
        `).join('')}
    `;
}

function toggleBranchDropdown() {
    // Legacy function - not needed with native select
}

function switchBranch(branchId) {
    if (branchId === 'all') {
        currentBranchId = null;
        localStorage.removeItem(CURRENT_BRANCH_KEY);
        showNotification('Viewing all branches', 'info');
    } else {
        const branch = branches.find(b => b.id === branchId);
        if (!branch || branch.status !== 'active') return;
        
        currentBranchId = branchId;
        localStorage.setItem(CURRENT_BRANCH_KEY, currentBranchId);
        showNotification(`Switched to ${branch.name}`, 'success');
    }
    
    // Refresh current view with new branch data
    refreshCurrentView();
}

function refreshCurrentView() {
    // Refresh all data views for the new branch context
    if (typeof updateDashboard === 'function') updateDashboard();
    if (typeof loadTransactions === 'function') loadTransactions();
    if (typeof renderInventory === 'function') renderInventory();
    if (typeof loadPurchaseOrders === 'function') loadPurchaseOrders();
    if (typeof updateBranchStats === 'function') updateBranchStats();
}

// ==================== BRANCH STATS ====================
function updateBranchStats() {
    const total = branches.length;
    const active = branches.filter(b => b.status === 'active').length;
    const pending = branchTransfers.filter(t => t.status === 'pending' || t.status === 'intransit').length;
    
    // Get branch limit based on plan
    const limit = getBranchLimit();
    const limitDisplay = limit === -1 ? '∞' : limit;
    
    // Calculate total staff from employees if available
    let totalStaff = 0;
    try {
        const employees = JSON.parse(localStorage.getItem('ezcubic_employees') || '[]');
        totalStaff = employees.filter(e => e.status === 'active').length;
    } catch (e) {
        totalStaff = 0;
    }
    
    // Update stats - use correct element IDs from HTML
    const totalEl = document.getElementById('totalBranches');
    const activeEl = document.getElementById('activeBranches');
    const pendingEl = document.getElementById('pendingTransfers');
    const staffEl = document.getElementById('totalBranchStaff');
    
    // Show count with limit (e.g., "2 / 3" or "5 / ∞")
    if (totalEl) totalEl.textContent = `${total} / ${limitDisplay}`;
    if (activeEl) activeEl.textContent = active;
    if (pendingEl) pendingEl.textContent = pending;
    if (staffEl) staffEl.textContent = totalStaff;
    
    // Update Add Branch button state if exists
    const addBranchBtn = document.querySelector('[onclick="showBranchModal()"]');
    if (addBranchBtn && limit !== -1 && total >= limit) {
        addBranchBtn.disabled = true;
        addBranchBtn.title = `Branch limit reached (${limit}). Upgrade your plan to add more.`;
        addBranchBtn.style.opacity = '0.5';
        addBranchBtn.style.cursor = 'not-allowed';
    } else if (addBranchBtn) {
        addBranchBtn.disabled = false;
        addBranchBtn.title = '';
        addBranchBtn.style.opacity = '';
        addBranchBtn.style.cursor = '';
    }
}

// ==================== BRANCH CRUD ====================
function renderBranches() {
    const container = document.getElementById('branchesGrid');
    if (!container) return;
    
    if (branches.length === 0) {
        container.innerHTML = `
            <div class="empty-state" style="grid-column: 1 / -1;">
                <i class="fas fa-store"></i>
                <h4>No Branches Yet</h4>
                <p>Add your first branch to get started with multi-location management</p>
                <button class="btn-primary" onclick="showBranchModal()">
                    <i class="fas fa-plus"></i> Add Branch
                </button>
            </div>
        `;
        return;
    }
    
    container.innerHTML = branches.map(branch => {
        const branchInventory = getBranchInventoryValue(branch.id);
        const branchSales = getBranchSalesThisMonth(branch.id);
        
        return `
            <div class="branch-card ${branch.type}" data-branch-id="${branch.id}">
                <div class="branch-card-header">
                    <div class="branch-info">
                        <h4><i class="fas fa-${branch.type === 'headquarters' ? 'crown' : branch.type === 'warehouse' ? 'warehouse' : 'store'}"></i> ${escapeHTML(branch.name)}</h4>
                        <span class="branch-code">${escapeHTML(branch.code)}</span>
                    </div>
                    <span class="branch-type ${branch.type}">${branch.type}</span>
                </div>
                
                <div class="branch-card-body">
                    <div class="branch-detail">
                        <i class="fas fa-map-marker-alt"></i>
                        <span>${branch.city ? escapeHTML(branch.city + ', ' + branch.state) : 'No address set'}</span>
                    </div>
                    <div class="branch-detail">
                        <i class="fas fa-user-tie"></i>
                        <span>${branch.manager || 'No manager assigned'}</span>
                    </div>
                    <div class="branch-detail">
                        <i class="fas fa-phone"></i>
                        <span>${branch.phone || 'No phone'}</span>
                    </div>
                </div>
                
                <div class="branch-stats">
                    <div class="branch-stat">
                        <div class="branch-stat-value">${formatRM(branchInventory)}</div>
                        <div class="branch-stat-label">Inventory</div>
                    </div>
                    <div class="branch-stat">
                        <div class="branch-stat-value">${formatRM(branchSales)}</div>
                        <div class="branch-stat-label">Sales</div>
                    </div>
                    <div class="branch-stat">
                        <div class="branch-stat-value">${branch.isDefault ? '<i class="fas fa-star" style="color:#f59e0b;"></i>' : '-'}</div>
                        <div class="branch-stat-label">Default</div>
                    </div>
                </div>
                
                <div class="branch-card-footer">
                    <span class="branch-status ${branch.status}"><span class="branch-status-dot"></span> ${branch.status}</span>
                    <div class="branch-actions">
                        <button class="btn-icon" onclick="viewBranchDetails('${branch.id}')" title="View"><i class="fas fa-eye"></i></button>
                        <button class="btn-icon" onclick="editBranch('${branch.id}')" title="Edit"><i class="fas fa-edit"></i></button>
                        ${!branch.isDefault ? `<button class="btn-icon danger" onclick="deleteBranch('${branch.id}')" title="Delete"><i class="fas fa-trash"></i></button>` : ''}
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// ==================== FILTER FUNCTIONS ====================
function filterBranches(searchTerm = '') {
    const search = searchTerm || document.getElementById('branchSearch')?.value || '';
    const typeFilter = document.getElementById('branchTypeFilter')?.value || '';
    const statusFilter = document.getElementById('branchStatusFilter')?.value || '';
    
    const filtered = branches.filter(branch => {
        const matchesSearch = !search || 
            branch.name.toLowerCase().includes(search.toLowerCase()) ||
            branch.code.toLowerCase().includes(search.toLowerCase()) ||
            (branch.city && branch.city.toLowerCase().includes(search.toLowerCase()));
        
        const matchesType = !typeFilter || branch.type === typeFilter;
        const matchesStatus = !statusFilter || branch.status === statusFilter;
        
        return matchesSearch && matchesType && matchesStatus;
    });
    
    const grid = document.getElementById('branchesGrid');
    if (!grid) return;
    
    if (filtered.length === 0) {
        grid.innerHTML = `
            <div class="branches-empty-state">
                <i class="fas fa-search"></i>
                <h3>No branches found</h3>
                <p>Try adjusting your search or filters</p>
            </div>
        `;
        return;
    }
    
    // Re-render with filtered branches
    grid.innerHTML = filtered.map(branch => {
        const branchInventory = getBranchInventoryValue(branch.id);
        const branchSales = getBranchSalesThisMonth(branch.id);
        
        return `
            <div class="branch-card ${branch.type}" data-branch-id="${branch.id}">
                <div class="branch-card-header">
                    <div class="branch-info">
                        <h4><i class="fas fa-${branch.type === 'headquarters' ? 'crown' : branch.type === 'warehouse' ? 'warehouse' : 'store'}"></i> ${escapeHTML(branch.name)}</h4>
                        <span class="branch-code">${escapeHTML(branch.code)}</span>
                    </div>
                    <span class="branch-type ${branch.type}">${branch.type}</span>
                </div>
                <div class="branch-card-body">
                    <div class="branch-detail"><i class="fas fa-map-marker-alt"></i><span>${branch.city ? escapeHTML(branch.city + ', ' + branch.state) : 'No address set'}</span></div>
                    <div class="branch-detail"><i class="fas fa-user-tie"></i><span>${branch.manager || 'No manager assigned'}</span></div>
                    <div class="branch-detail"><i class="fas fa-phone"></i><span>${branch.phone || 'No phone'}</span></div>
                </div>
                <div class="branch-stats">
                    <div class="branch-stat"><div class="branch-stat-value">${formatRM(branchInventory)}</div><div class="branch-stat-label">Inventory</div></div>
                    <div class="branch-stat"><div class="branch-stat-value">${formatRM(branchSales)}</div><div class="branch-stat-label">Sales</div></div>
                    <div class="branch-stat"><div class="branch-stat-value">${branch.isDefault ? '<i class="fas fa-star" style="color:#f59e0b;"></i>' : '-'}</div><div class="branch-stat-label">Default</div></div>
                </div>
                <div class="branch-card-footer">
                    <span class="branch-status ${branch.status}"><span class="branch-status-dot"></span> ${branch.status}</span>
                    <div class="branch-actions">
                        <button class="btn-icon" onclick="viewBranchDetails('${branch.id}')" title="View"><i class="fas fa-eye"></i></button>
                        <button class="btn-icon" onclick="editBranch('${branch.id}')" title="Edit"><i class="fas fa-edit"></i></button>
                        ${!branch.isDefault ? `<button class="btn-icon danger" onclick="deleteBranch('${branch.id}')" title="Delete"><i class="fas fa-trash"></i></button>` : ''}
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function filterTransfers(searchTerm = '') {
    const search = searchTerm || document.getElementById('transferSearch')?.value || '';
    const statusFilter = document.getElementById('transferStatusFilter')?.value || '';
    
    const filtered = branchTransfers.filter(transfer => {
        const fromBranch = branches.find(b => b.id === transfer.fromBranchId);
        const toBranch = branches.find(b => b.id === transfer.toBranchId);
        
        const matchesSearch = !search || 
            transfer.transferNumber.toLowerCase().includes(search.toLowerCase()) ||
            (fromBranch && fromBranch.name.toLowerCase().includes(search.toLowerCase())) ||
            (toBranch && toBranch.name.toLowerCase().includes(search.toLowerCase()));
        
        const matchesStatus = !statusFilter || transfer.status === statusFilter;
        
        return matchesSearch && matchesStatus;
    });
    
    const tbody = document.getElementById('transfersTableBody');
    if (!tbody) return;
    
    if (filtered.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" style="text-align: center; padding: 40px; color: #64748b;">
                    <i class="fas fa-exchange-alt" style="font-size: 32px; margin-bottom: 10px; display: block;"></i>
                    No transfers found
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).map(transfer => {
        const fromBranch = branches.find(b => b.id === transfer.fromBranchId);
        const toBranch = branches.find(b => b.id === transfer.toBranchId);
        const itemCount = transfer.items.reduce((sum, item) => sum + item.quantity, 0);
        
        return `
            <tr>
                <td><strong>${transfer.transferNumber}</strong></td>
                <td>${formatDate(transfer.transferDate)}</td>
                <td>${fromBranch ? escapeHTML(fromBranch.name) : 'Unknown'}</td>
                <td>${toBranch ? escapeHTML(toBranch.name) : 'Unknown'}</td>
                <td>${itemCount} items</td>
                <td><span class="transfer-status ${transfer.status}">${transfer.status}</span></td>
                <td>
                    <button class="btn-icon" onclick="viewTransferDetails('${transfer.id}')" title="View Details"><i class="fas fa-eye"></i></button>
                    ${transfer.status === 'pending' ? `
                        <button class="btn-icon success" onclick="confirmTransfer('${transfer.id}')" title="Confirm"><i class="fas fa-check"></i></button>
                        <button class="btn-icon danger" onclick="cancelTransfer('${transfer.id}')" title="Cancel"><i class="fas fa-times"></i></button>
                    ` : ''}
                    ${transfer.status === 'intransit' ? `
                        <button class="btn-icon success" onclick="completeTransfer('${transfer.id}')" title="Complete"><i class="fas fa-check-double"></i></button>
                    ` : ''}
                </td>
            </tr>
        `;
    }).join('');
}

function onTransferBranchChange() {
    const fromBranchId = document.getElementById('transferFromBranch')?.value;
    const toBranchSelect = document.getElementById('transferToBranch');
    
    if (!fromBranchId || !toBranchSelect) return;
    
    // Populate destination branches (excluding source branch)
    const availableBranches = branches.filter(b => b.status === 'active' && b.id !== fromBranchId);
    
    toBranchSelect.innerHTML = `
        <option value="">Select destination branch</option>
        ${availableBranches.map(b => `<option value="${b.id}">${escapeHTML(b.name)}</option>`).join('')}
    `;
    
    // Clear transfer items and reload products from source branch
    const itemsBody = document.getElementById('transferItemsBody');
    if (itemsBody) {
        itemsBody.innerHTML = '';
        addTransferItem(); // Add one default item row
    }
}

function showBranchModal(branchId = null) {
    // Check branch limit for new branches (not editing existing)
    if (!branchId) {
        // Use platform canAdd if available, otherwise use local check
        if (typeof canAdd === 'function') {
            if (!canAdd('branches')) {
                return; // Limit reached, modal shown by canAdd()
            }
        } else {
            // Fallback to local branch limit check
            const limitCheck = canAddBranch();
            if (!limitCheck.allowed) {
                showNotification(`Branch limit reached! Your plan allows ${limitCheck.limit} branch${limitCheck.limit !== 1 ? 'es' : ''}. Please upgrade to add more.`, 'error');
                return;
            }
        }
    }
    
    const branch = branchId ? branches.find(b => b.id === branchId) : null;
    const isEdit = !!branch;
    
    // Try to use existing static modal first
    const existingModal = document.getElementById('branchModal');
    if (existingModal && !existingModal.querySelector('[data-dynamic]')) {
        // Use the static HTML modal
        const titleEl = document.getElementById('branchModalTitle');
        if (titleEl) {
            titleEl.innerHTML = `<i class="fas fa-${isEdit ? 'edit' : 'plus'}"></i> ${isEdit ? 'Edit Branch' : 'Add New Branch'}`;
        }
        
        // Populate form fields
        const branchIdField = document.getElementById('branchId');
        if (branchIdField) branchIdField.value = branchId || '';
        
        document.getElementById('branchCode').value = branch?.code || '';
        document.getElementById('branchName').value = branch?.name || '';
        document.getElementById('branchType').value = branch?.type || 'retail';
        document.getElementById('branchManager').value = branch?.manager || '';
        document.getElementById('branchAddress').value = branch?.address || '';
        document.getElementById('branchCity').value = branch?.city || '';
        document.getElementById('branchState').value = branch?.state || '';
        document.getElementById('branchPostcode').value = branch?.postcode || '';
        document.getElementById('branchPhone').value = branch?.phone || '';
        document.getElementById('branchEmail').value = branch?.email || '';
        
        const statusField = document.getElementById('branchStatus');
        if (statusField) statusField.value = branch?.status || 'active';
        
        const hoursField = document.getElementById('branchHours');
        if (hoursField) hoursField.value = branch?.hours || '';
        
        const notesField = document.getElementById('branchNotes');
        if (notesField) notesField.value = branch?.notes || '';
        
        // Show the modal
        existingModal.style.display = '';
        existingModal.classList.add('show');
        return;
    }
    
    // Fallback: Create dynamic modal if no static one exists
    const modalHtml = `
        <div class="modal show" id="branchModal" data-dynamic="true">
            <div class="modal-content" style="max-width: 600px;">
                <div class="modal-header">
                    <h3 class="modal-title">
                        <i class="fas fa-${isEdit ? 'edit' : 'plus'}"></i>
                        ${isEdit ? 'Edit Branch' : 'Add New Branch'}
                    </h3>
                    <button class="modal-close" onclick="closeBranchModal()">&times;</button>
                </div>
                <form onsubmit="saveBranch(event, '${branchId || ''}')">
                    <div class="form-grid">
                        <div class="form-group">
                            <label class="form-label">Branch Code *</label>
                            <input type="text" id="branchCode" class="form-control" required
                                   value="${branch?.code || ''}" placeholder="e.g., KL01, PJ02"
                                   maxlength="10" style="text-transform: uppercase;">
                        </div>
                        <div class="form-group">
                            <label class="form-label">Branch Name *</label>
                            <input type="text" id="branchName" class="form-control" required
                                   value="${branch?.name || ''}" placeholder="e.g., Kuala Lumpur Branch">
                        </div>
                    </div>
                    
                    <div class="form-grid">
                        <div class="form-group">
                            <label class="form-label">Branch Type *</label>
                            <select id="branchType" class="form-control" required>
                                <option value="retail" ${branch?.type === 'retail' ? 'selected' : ''}>Retail Store</option>
                                <option value="warehouse" ${branch?.type === 'warehouse' ? 'selected' : ''}>Warehouse</option>
                                <option value="office" ${branch?.type === 'office' ? 'selected' : ''}>Office</option>
                                <option value="headquarters" ${branch?.type === 'headquarters' ? 'selected' : ''}>Headquarters</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Manager</label>
                            <input type="text" id="branchManager" class="form-control"
                                   value="${branch?.manager || ''}" placeholder="Branch manager name">
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <label class="form-label">Address</label>
                        <textarea id="branchAddress" class="form-control" rows="2"
                                  placeholder="Street address">${branch?.address || ''}</textarea>
                    </div>
                    
                    <div class="form-grid" style="grid-template-columns: 2fr 1fr 1fr;">
                        <div class="form-group">
                            <label class="form-label">City</label>
                            <input type="text" id="branchCity" class="form-control"
                                   value="${branch?.city || ''}" placeholder="City">
                        </div>
                        <div class="form-group">
                            <label class="form-label">State</label>
                            <select id="branchState" class="form-control">
                                <option value="">Select</option>
                                <option value="Johor" ${branch?.state === 'Johor' ? 'selected' : ''}>Johor</option>
                                <option value="Kedah" ${branch?.state === 'Kedah' ? 'selected' : ''}>Kedah</option>
                                <option value="Kelantan" ${branch?.state === 'Kelantan' ? 'selected' : ''}>Kelantan</option>
                                <option value="Melaka" ${branch?.state === 'Melaka' ? 'selected' : ''}>Melaka</option>
                                <option value="Negeri Sembilan" ${branch?.state === 'Negeri Sembilan' ? 'selected' : ''}>Negeri Sembilan</option>
                                <option value="Pahang" ${branch?.state === 'Pahang' ? 'selected' : ''}>Pahang</option>
                                <option value="Perak" ${branch?.state === 'Perak' ? 'selected' : ''}>Perak</option>
                                <option value="Perlis" ${branch?.state === 'Perlis' ? 'selected' : ''}>Perlis</option>
                                <option value="Pulau Pinang" ${branch?.state === 'Pulau Pinang' ? 'selected' : ''}>Pulau Pinang</option>
                                <option value="Sabah" ${branch?.state === 'Sabah' ? 'selected' : ''}>Sabah</option>
                                <option value="Sarawak" ${branch?.state === 'Sarawak' ? 'selected' : ''}>Sarawak</option>
                                <option value="Selangor" ${branch?.state === 'Selangor' ? 'selected' : ''}>Selangor</option>
                                <option value="Terengganu" ${branch?.state === 'Terengganu' ? 'selected' : ''}>Terengganu</option>
                                <option value="WP Kuala Lumpur" ${branch?.state === 'WP Kuala Lumpur' ? 'selected' : ''}>WP Kuala Lumpur</option>
                                <option value="WP Labuan" ${branch?.state === 'WP Labuan' ? 'selected' : ''}>WP Labuan</option>
                                <option value="WP Putrajaya" ${branch?.state === 'WP Putrajaya' ? 'selected' : ''}>WP Putrajaya</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Postcode</label>
                            <input type="text" id="branchPostcode" class="form-control"
                                   value="${branch?.postcode || ''}" placeholder="00000" maxlength="5">
                        </div>
                    </div>
                    
                    <div class="form-grid">
                        <div class="form-group">
                            <label class="form-label">Phone</label>
                            <input type="tel" id="branchPhone" class="form-control"
                                   value="${branch?.phone || ''}" placeholder="03-1234 5678">
                        </div>
                        <div class="form-group">
                            <label class="form-label">Email</label>
                            <input type="email" id="branchEmail" class="form-control"
                                   value="${branch?.email || ''}" placeholder="branch@company.com">
                        </div>
                    </div>
                    
                    <div class="modal-footer">
                        <button type="button" class="btn-secondary" onclick="closeBranchModal()">Cancel</button>
                        <button type="submit" class="btn-primary">
                            <i class="fas fa-save"></i> ${isEdit ? 'Update' : 'Create'} Branch
                        </button>
                    </div>
                </form>
            </div>
        </div>
    `;
    
    document.getElementById('branchModal')?.remove();
    document.body.insertAdjacentHTML('beforeend', modalHtml);
}

function closeBranchModal() {
    const modal = document.getElementById('branchModal');
    if (modal) {
        // If it's a dynamic modal, remove it; otherwise just hide the static one
        if (modal.hasAttribute('data-dynamic')) {
            modal.remove();
        } else {
            modal.classList.remove('show');
            // Reset form
            const form = modal.querySelector('form');
            if (form) form.reset();
        }
    }
}

function saveBranch(event, branchId = null) {
    event.preventDefault();
    
    // Get form values - handle both dynamic modal and static HTML modal
    const code = (document.getElementById('branchCode')?.value || '').trim().toUpperCase();
    const name = (document.getElementById('branchName')?.value || '').trim();
    const type = document.getElementById('branchType')?.value || 'retail';
    const manager = (document.getElementById('branchManager')?.value || '').trim();
    const address = (document.getElementById('branchAddress')?.value || '').trim();
    const city = (document.getElementById('branchCity')?.value || '').trim();
    const state = document.getElementById('branchState')?.value || '';
    const postcode = (document.getElementById('branchPostcode')?.value || '').trim();
    const phone = (document.getElementById('branchPhone')?.value || '').trim();
    const email = (document.getElementById('branchEmail')?.value || '').trim();
    const status = document.getElementById('branchStatus')?.value || 'active';
    
    // Also check for hidden branchId field (from static HTML modal)
    if (!branchId) {
        branchId = document.getElementById('branchId')?.value || null;
    }
    
    if (!code || !name) {
        showNotification('Branch code and name are required', 'error');
        return;
    }
    
    // Check for duplicate code
    const existingBranch = branches.find(b => b.code === code && b.id !== branchId);
    if (existingBranch) {
        showNotification(`Branch code "${code}" already exists in "${existingBranch.name}". Please use a different code.`, 'error');
        // Focus on the code input field
        const codeInput = document.getElementById('branchCode');
        if (codeInput) {
            codeInput.focus();
            codeInput.select();
        }
        return;
    }
    
    // Check for duplicate name (warning, not blocking)
    const existingName = branches.find(b => b.name.toLowerCase() === name.toLowerCase() && b.id !== branchId);
    if (existingName) {
        if (!confirm(`A branch named "${existingName.name}" already exists. Do you want to create another branch with the same name?`)) {
            return;
        }
    }
    
    if (branchId) {
        // Update existing branch
        const branch = branches.find(b => b.id === branchId);
        if (branch) {
            branch.code = code;
            branch.name = name;
            branch.type = type;
            branch.manager = manager;
            branch.address = address;
            branch.city = city;
            branch.state = state;
            branch.postcode = postcode;
            branch.phone = phone;
            branch.email = email;
            branch.status = status;
            branch.updatedAt = new Date().toISOString();
        }
    } else {
        // Create new branch
        const newBranch = {
            id: 'BRANCH_' + Date.now(),
            code,
            name,
            type,
            manager,
            address,
            city,
            state,
            postcode,
            phone,
            email,
            status: status,
            isDefault: false,
            createdAt: new Date().toISOString()
        };
        branches.push(newBranch);
    }
    
    saveBranchData();
    closeBranchModal();
    renderBranches();
    renderBranchSelector();
    updateBranchStats();
    
    // Sync branches to POS outlets
    syncBranchesToOutlets();
    
    showNotification(branchId ? 'Branch updated!' : 'Branch created!', 'success');
}

function editBranch(branchId) {
    showBranchModal(branchId);
}

function toggleBranchStatus(branchId) {
    const branch = branches.find(b => b.id === branchId);
    if (!branch || branch.isDefault) return;
    
    const newStatus = branch.status === 'active' ? 'inactive' : 'active';
    const action = newStatus === 'active' ? 'activate' : 'deactivate';
    
    if (confirm(`Are you sure you want to ${action} ${branch.name}?`)) {
        branch.status = newStatus;
        branch.updatedAt = new Date().toISOString();
        
        // If deactivating current branch, switch to default
        if (newStatus === 'inactive' && currentBranchId === branchId) {
            const defaultBranch = branches.find(b => b.isDefault);
            if (defaultBranch) {
                switchBranch(defaultBranch.id);
            }
        }
        
        saveBranchData();
        renderBranches();
        renderBranchSelector();
        updateBranchStats();
        
        showNotification(`Branch ${newStatus === 'active' ? 'activated' : 'deactivated'}!`, 'success');
    }
}

function deleteBranch(branchId) {
    const branch = branches.find(b => b.id === branchId);
    if (!branch || branch.isDefault) return;
    
    if (confirm(`Are you sure you want to delete ${branch.name}? This cannot be undone.`)) {
        branches = branches.filter(b => b.id !== branchId);
        
        // If deleting current branch, switch to default
        if (currentBranchId === branchId) {
            const defaultBranch = branches.find(b => b.isDefault);
            if (defaultBranch) {
                switchBranch(defaultBranch.id);
            }
        }
        
        saveBranchData();
        renderBranches();
        renderBranchSelector();
        updateBranchStats();
        
        showNotification('Branch deleted!', 'success');
    }
}

// ==================== BRANCH DETAILS ====================
function viewBranchDetails(branchId) {
    const branch = branches.find(b => b.id === branchId);
    if (!branch) return;
    
    const inventoryValue = getBranchInventoryValue(branchId);
    const monthSales = getBranchSalesTotal(branchId);
    const pendingTransfers = branchTransfers.filter(t => 
        (t.fromBranchId === branchId || t.toBranchId === branchId) && t.status === 'pending'
    ).length;
    
    const modalHtml = `
        <div class="modal show" id="branchDetailModal">
            <div class="modal-content" style="max-width: 700px;">
                <div class="modal-header">
                    <h3 class="modal-title">
                        <i class="fas fa-store"></i> ${escapeHTML(branch.name)}
                    </h3>
                    <button class="modal-close" onclick="closeBranchDetailModal()">&times;</button>
                </div>
                <div class="modal-body" style="padding: 20px;">
                    <!-- Branch Info -->
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px;">
                        <div>
                            <h4 style="margin: 0 0 15px; color: #475569;"><i class="fas fa-info-circle"></i> Information</h4>
                            <div class="branch-info-list">
                                <div class="info-item">
                                    <span class="label">Code:</span>
                                    <span class="value">${escapeHTML(branch.code)}</span>
                                </div>
                                <div class="info-item">
                                    <span class="label">Type:</span>
                                    <span class="value">${branch.type}</span>
                                </div>
                                <div class="info-item">
                                    <span class="label">Status:</span>
                                    <span class="value status-${branch.status}">${branch.status}</span>
                                </div>
                                <div class="info-item">
                                    <span class="label">Manager:</span>
                                    <span class="value">${branch.manager || '-'}</span>
                                </div>
                            </div>
                        </div>
                        <div>
                            <h4 style="margin: 0 0 15px; color: #475569;"><i class="fas fa-map-marker-alt"></i> Contact</h4>
                            <div class="branch-info-list">
                                <div class="info-item">
                                    <span class="label">Address:</span>
                                    <span class="value">${branch.address || '-'}</span>
                                </div>
                                <div class="info-item">
                                    <span class="label">City:</span>
                                    <span class="value">${branch.city ? branch.city + ', ' + branch.state : '-'}</span>
                                </div>
                                <div class="info-item">
                                    <span class="label">Phone:</span>
                                    <span class="value">${branch.phone || '-'}</span>
                                </div>
                                <div class="info-item">
                                    <span class="label">Email:</span>
                                    <span class="value">${branch.email || '-'}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Branch Stats -->
                    <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin-bottom: 20px;">
                        <div class="stat-card" style="background: linear-gradient(135deg, #10b981, #059669); color: white; padding: 20px; border-radius: 12px;">
                            <div style="font-size: 24px; font-weight: 700;">${formatRM(monthSales)}</div>
                            <div style="font-size: 13px; opacity: 0.9;">This Month Sales</div>
                        </div>
                        <div class="stat-card" style="background: linear-gradient(135deg, #3b82f6, #2563eb); color: white; padding: 20px; border-radius: 12px;">
                            <div style="font-size: 24px; font-weight: 700;">${formatRM(inventoryValue)}</div>
                            <div style="font-size: 13px; opacity: 0.9;">Inventory Value</div>
                        </div>
                        <div class="stat-card" style="background: linear-gradient(135deg, #f59e0b, #d97706); color: white; padding: 20px; border-radius: 12px;">
                            <div style="font-size: 24px; font-weight: 700;">${pendingTransfers}</div>
                            <div style="font-size: 13px; opacity: 0.9;">Pending Transfers</div>
                        </div>
                    </div>
                    
                    <!-- Quick Actions -->
                    <div style="display: flex; gap: 10px; flex-wrap: wrap;">
                        <button class="btn-primary" onclick="closeBranchDetailModal(); showTransferModal('${branchId}')">
                            <i class="fas fa-exchange-alt"></i> Create Transfer
                        </button>
                        <button class="btn-secondary" onclick="viewBranchInventory('${branchId}')">
                            <i class="fas fa-boxes"></i> View Inventory
                        </button>
                        <button class="btn-secondary" onclick="viewBranchTransactions('${branchId}')">
                            <i class="fas fa-receipt"></i> View Transactions
                        </button>
                        <button class="btn-secondary" onclick="closeBranchDetailModal(); editBranch('${branchId}')">
                            <i class="fas fa-edit"></i> Edit Branch
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    document.getElementById('branchDetailModal')?.remove();
    document.body.insertAdjacentHTML('beforeend', modalHtml);
}

function closeBranchDetailModal() {
    document.getElementById('branchDetailModal')?.remove();
}

// ==================== BRANCH TRANSFERS ====================
function showTransferModal(fromBranchId = null) {
    const activeBranches = branches.filter(b => b.status === 'active');
    // Use global products array or load from correct localStorage key
    const productList = (typeof products !== 'undefined' && products.length > 0) 
        ? products 
        : JSON.parse(localStorage.getItem('ezcubic_products') || '[]');
    
    const modalHtml = `
        <div class="modal show" id="transferModal">
            <div class="modal-content" style="max-width: 700px;">
                <div class="modal-header">
                    <h3 class="modal-title">
                        <i class="fas fa-exchange-alt"></i> Create Stock Transfer
                    </h3>
                    <button class="modal-close" onclick="closeTransferModal()">&times;</button>
                </div>
                <form onsubmit="saveTransfer(event)">
                    <div class="form-grid">
                        <div class="form-group">
                            <label class="form-label">From Branch *</label>
                            <select id="transferFrom" class="form-control" required onchange="updateTransferProducts()">
                                <option value="">Select source branch</option>
                                ${activeBranches.map(b => `
                                    <option value="${b.id}" ${b.id === fromBranchId ? 'selected' : ''}>
                                        ${escapeHTML(b.name)} (${b.code})
                                    </option>
                                `).join('')}
                            </select>
                        </div>
                        <div class="form-group">
                            <label class="form-label">To Branch *</label>
                            <select id="transferTo" class="form-control" required>
                                <option value="">Select destination branch</option>
                                ${activeBranches.map(b => `
                                    <option value="${b.id}">${escapeHTML(b.name)} (${b.code})</option>
                                `).join('')}
                            </select>
                        </div>
                    </div>
                    
                    <div class="form-grid">
                        <div class="form-group">
                            <label class="form-label">Transfer Date *</label>
                            <input type="date" id="transferDate" class="form-control" required
                                   value="${new Date().toISOString().slice(0, 10)}">
                        </div>
                        <div class="form-group">
                            <label class="form-label">Reference</label>
                            <input type="text" id="transferRef" class="form-control" 
                                   placeholder="Transfer reference number">
                        </div>
                    </div>
                    
                    <!-- Transfer Items -->
                    <div style="margin: 20px 0;">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                            <h4 style="margin: 0;"><i class="fas fa-boxes"></i> Items to Transfer</h4>
                            <button type="button" class="btn-secondary" onclick="addTransferItem()">
                                <i class="fas fa-plus"></i> Add Item
                            </button>
                        </div>
                        <div id="transferItemsContainer" style="border: 1px solid #e2e8f0; border-radius: 8px; max-height: 250px; overflow-y: auto;">
                            <!-- Items will be added here -->
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <label class="form-label">Notes</label>
                        <textarea id="transferNotes" class="form-control" rows="2" 
                                  placeholder="Additional notes for this transfer"></textarea>
                    </div>
                    
                    <div class="modal-footer">
                        <button type="button" class="btn-secondary" onclick="closeTransferModal()">Cancel</button>
                        <button type="submit" class="btn-primary">
                            <i class="fas fa-paper-plane"></i> Create Transfer
                        </button>
                    </div>
                </form>
            </div>
        </div>
    `;
    
    document.getElementById('transferModal')?.remove();
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    
    // Add first item row
    addTransferItem();
}

function closeTransferModal() {
    document.getElementById('transferModal')?.remove();
}

let transferItemCounter = 0;

function addTransferItem() {
    const container = document.getElementById('transferItemsContainer');
    // Use global products array or load from correct localStorage key
    const productList = (typeof products !== 'undefined' && products.length > 0) 
        ? products 
        : JSON.parse(localStorage.getItem('ezcubic_products') || '[]');
    const itemId = ++transferItemCounter;
    
    const itemHtml = `
        <div class="transfer-item-row" data-item-id="${itemId}" style="display: grid; grid-template-columns: 2fr 100px 40px; gap: 10px; padding: 12px; border-bottom: 1px solid #e2e8f0; align-items: center;">
            <div>
                <select class="form-control transfer-product" style="font-size: 13px;">
                    <option value="">Select product</option>
                    ${productList.map(p => `
                        <option value="${p.id}" data-stock="${p.stock || 0}" data-sku="${p.sku || ''}">
                            ${p.sku ? `[${escapeHTML(p.sku)}] ` : ''}${escapeHTML(p.name)} (Stock: ${p.stock || 0})
                        </option>
                    `).join('')}
                </select>
            </div>
            <div>
                <input type="number" class="form-control transfer-qty" min="1" placeholder="Qty" style="font-size: 13px;">
            </div>
            <button type="button" class="btn-icon danger" onclick="removeTransferItem(${itemId})">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `;
    
    container.insertAdjacentHTML('beforeend', itemHtml);
}

function removeTransferItem(itemId) {
    const row = document.querySelector(`.transfer-item-row[data-item-id="${itemId}"]`);
    if (row) row.remove();
}

function updateTransferProducts() {
    const fromBranchId = document.getElementById('transferFrom')?.value;
    const toBranchSelect = document.getElementById('transferTo');
    
    if (toBranchSelect) {
        // Update destination to exclude source branch
        const activeBranches = branches.filter(b => b.status === 'active' && b.id !== fromBranchId);
        toBranchSelect.innerHTML = `
            <option value="">Select destination branch</option>
            ${activeBranches.map(b => `
                <option value="${b.id}">${escapeHTML(b.name)} (${b.code})</option>
            `).join('')}
        `;
    }
    
    // Update product dropdowns to show branch-specific stock
    // Use global products array or load from correct localStorage key
    const productList = (typeof products !== 'undefined' && products.length > 0) 
        ? products 
        : JSON.parse(localStorage.getItem('ezcubic_products') || '[]');
    document.querySelectorAll('.transfer-product').forEach(select => {
        const currentVal = select.value;
        select.innerHTML = `
            <option value="">Select product</option>
            ${productList.map(p => {
                const branchStock = fromBranchId && p.branchStock ? (p.branchStock[fromBranchId] || p.stock || 0) : (p.stock || 0);
                return `
                    <option value="${p.id}" data-stock="${branchStock}" data-sku="${p.sku || ''}" ${p.id === currentVal ? 'selected' : ''}>
                        ${p.sku ? `[${escapeHTML(p.sku)}] ` : ''}${escapeHTML(p.name)} (Stock: ${branchStock})
                    </option>
                `;
            }).join('')}
        `;
    });
}

function saveTransfer(event) {
    event.preventDefault();
    
    const fromBranchId = document.getElementById('transferFrom').value;
    const toBranchId = document.getElementById('transferTo').value;
    const date = document.getElementById('transferDate').value;
    const reference = document.getElementById('transferRef').value.trim();
    const notes = document.getElementById('transferNotes').value.trim();
    
    if (fromBranchId === toBranchId) {
        showNotification('Source and destination must be different', 'error');
        return;
    }
    
    // Collect items
    const items = [];
    // Use global products array or load from correct localStorage key
    const productList = (typeof products !== 'undefined' && products.length > 0) 
        ? products 
        : JSON.parse(localStorage.getItem('ezcubic_products') || '[]');
    document.querySelectorAll('.transfer-item-row').forEach(row => {
        const productSelect = row.querySelector('.transfer-product');
        const qtyInput = row.querySelector('.transfer-qty');
        
        if (productSelect.value && qtyInput.value) {
            const product = productList.find(p => p.id === productSelect.value);
            
            items.push({
                productId: productSelect.value,
                productName: product?.name || 'Unknown',
                productSku: product?.sku || '',
                quantity: parseInt(qtyInput.value)
            });
        }
    });
    
    if (items.length === 0) {
        showNotification('Please add at least one item to transfer', 'error');
        return;
    }
    
    const fromBranch = branches.find(b => b.id === fromBranchId);
    const toBranch = branches.find(b => b.id === toBranchId);
    
    const transfer = {
        id: 'TRF_' + Date.now(),
        transferNumber: generateTransferNumber(),
        fromBranchId,
        fromBranchName: fromBranch?.name || '',
        toBranchId,
        toBranchName: toBranch?.name || '',
        date,
        reference,
        items,
        notes,
        status: 'pending',
        createdAt: new Date().toISOString()
    };
    
    branchTransfers.push(transfer);
    saveBranchData();
    
    closeTransferModal();
    renderTransfers();
    updateBranchStats();
    
    showNotification('Transfer created! Awaiting confirmation.', 'success');
}

function generateTransferNumber() {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const count = branchTransfers.filter(t => {
        const d = new Date(t.createdAt);
        return d.getFullYear() === date.getFullYear() && d.getMonth() === date.getMonth();
    }).length + 1;
    
    return `TRF${year}${month}${count.toString().padStart(4, '0')}`;
}

function renderTransfers() {
    const container = document.getElementById('transfersTableBody');
    if (!container) return;
    
    const sortedTransfers = [...branchTransfers]
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    if (sortedTransfers.length === 0) {
        container.innerHTML = `
            <tr>
                <td colspan="7" style="text-align: center; padding: 40px; color: #64748b;">
                    <i class="fas fa-exchange-alt" style="font-size: 40px; margin-bottom: 15px; opacity: 0.3;"></i>
                    <div>No transfers yet. Click "New Transfer" to create one.</div>
                </td>
            </tr>
        `;
        return;
    }
    
    container.innerHTML = sortedTransfers.map(transfer => {
        const statusColors = {
            pending: '#f59e0b',
            intransit: '#3b82f6',
            completed: '#10b981',
            cancelled: '#ef4444'
        };
        
        return `
            <tr>
                <td><strong>${transfer.transferNumber}</strong></td>
                <td>${formatDate(transfer.date)}</td>
                <td>${escapeHTML(transfer.fromBranchName)}</td>
                <td>${escapeHTML(transfer.toBranchName)}</td>
                <td>${transfer.items.length} item(s)</td>
                <td>
                    <span class="status-badge" style="background: ${statusColors[transfer.status]}20; color: ${statusColors[transfer.status]};">
                        ${transfer.status}
                    </span>
                </td>
                <td>
                    <button class="btn-icon" onclick="viewTransferDetails('${transfer.id}')" title="View">
                        <i class="fas fa-eye"></i>
                    </button>
                    ${transfer.status === 'pending' ? `
                        <button class="btn-icon success" onclick="confirmTransfer('${transfer.id}')" title="Confirm & Send">
                            <i class="fas fa-truck"></i>
                        </button>
                        <button class="btn-icon danger" onclick="cancelTransfer('${transfer.id}')" title="Cancel">
                            <i class="fas fa-times"></i>
                        </button>
                    ` : ''}
                    ${transfer.status === 'intransit' ? `
                        <button class="btn-icon success" onclick="completeTransfer('${transfer.id}')" title="Mark as Received">
                            <i class="fas fa-check-double"></i>
                        </button>
                    ` : ''}
                </td>
            </tr>
        `;
    }).join('');
}

function confirmTransfer(transferId) {
    const transfer = branchTransfers.find(t => t.id === transferId);
    if (!transfer || transfer.status !== 'pending') return;
    
    if (confirm(`Confirm transfer ${transfer.transferNumber}? This will start the transfer process.`)) {
        console.log('Confirming transfer:', transfer.id);
        console.log('Deducting from source branch:', transfer.fromBranchId);
        
        // Deduct stock from source branch immediately
        transfer.items.forEach(item => {
            console.log('Deducting stock - Product:', item.productId, 'Qty:', item.quantity, 'From:', transfer.fromBranchId);
            const beforeStock = getBranchStock(item.productId, transfer.fromBranchId);
            console.log('Before stock at source:', beforeStock);
            
            adjustBranchStock(item.productId, transfer.fromBranchId, -item.quantity);
            
            const afterStock = getBranchStock(item.productId, transfer.fromBranchId);
            console.log('After stock at source:', afterStock);
            
            // Create stock movement record for the deduction
            const sourceBranch = branches.find(b => b.id === transfer.fromBranchId);
            const destBranch = branches.find(b => b.id === transfer.toBranchId);
            const product = window.products?.find(p => p.id === item.productId);
            
            // Ensure stockMovements is initialized
            if (!window.stockMovements) {
                const stored = localStorage.getItem('ezcubic_stock_movements');
                window.stockMovements = stored ? JSON.parse(stored) : [];
            }
            
            const stockOutMovement = {
                id: 'SM' + Date.now() + '_out_' + item.productId,
                type: 'transfer_out',
                productId: item.productId,
                productName: product?.name || item.productName || 'Unknown',
                quantity: -item.quantity,
                reason: `Transfer to ${destBranch?.name || transfer.toBranchId}`,
                reference: transfer.transferNumber,
                branchId: transfer.fromBranchId,
                branchName: sourceBranch?.name || transfer.fromBranchId,
                date: new Date().toISOString(),
                createdAt: new Date().toISOString()
            };
            
            window.stockMovements.unshift(stockOutMovement);
            localStorage.setItem('ezcubic_stock_movements', JSON.stringify(window.stockMovements));
            console.log('Stock movement recorded:', stockOutMovement.type, stockOutMovement.productName, stockOutMovement.quantity);
        });
        
        // Also update products array for immediate UI refresh
        if (typeof products !== 'undefined') {
            transfer.items.forEach(item => {
                const product = products.find(p => p.id === item.productId);
                if (product) {
                    if (!product.branchStock) product.branchStock = {};
                    product.branchStock[transfer.fromBranchId] = 
                        getBranchStock(item.productId, transfer.fromBranchId);
                }
            });
        }
        
        // Update window.products as well
        if (window.products) {
            transfer.items.forEach(item => {
                const product = window.products.find(p => p.id === item.productId);
                if (product) {
                    if (!product.branchStock) product.branchStock = {};
                    product.branchStock[transfer.fromBranchId] = 
                        getBranchStock(item.productId, transfer.fromBranchId);
                }
            });
        }
        
        transfer.status = 'intransit';
        transfer.confirmedAt = new Date().toISOString();
        saveBranchData();
        
        // Also save to tenant storage
        if (typeof saveToUserTenant === 'function') {
            saveToUserTenant();
        }
        
        renderTransfers();
        updateBranchStats();
        
        // Refresh Branch Inventory tab
        if (typeof renderBranchInventory === 'function') {
            renderBranchInventory();
        }
        
        // Refresh POS products display
        if (typeof renderPOSProducts === 'function') {
            renderPOSProducts();
        }
        
        // Refresh Inventory display (sync stock changes to Inventory module)
        if (typeof renderProducts === 'function') {
            renderProducts();
        }
        
        // Refresh stock movements
        if (typeof renderStockMovements === 'function') {
            renderStockMovements();
        }
        
        // Refresh Stock Control stats
        if (typeof updateStockStats === 'function') {
            updateStockStats();
        }
        
        showNotification('Transfer confirmed and in transit!', 'success');
    }
}

function completeTransfer(transferId) {
    const transfer = branchTransfers.find(t => t.id === transferId);
    if (!transfer || transfer.status !== 'intransit') return;
    
    if (confirm(`Complete transfer ${transfer.transferNumber}? Stock will be added to destination branch.`)) {
        console.log('Completing transfer:', transfer.id);
        console.log('Destination branch:', transfer.toBranchId);
        
        // Add stock to destination branch
        transfer.items.forEach(item => {
            console.log('Adding stock - Product:', item.productId, 'Qty:', item.quantity, 'To:', transfer.toBranchId);
            const beforeStock = getBranchStock(item.productId, transfer.toBranchId);
            console.log('Before stock at destination:', beforeStock);
            
            adjustBranchStock(item.productId, transfer.toBranchId, item.quantity);
            
            const afterStock = getBranchStock(item.productId, transfer.toBranchId);
            console.log('After stock at destination:', afterStock);
            
            // Create stock movement record for the addition
            const sourceBranch = branches.find(b => b.id === transfer.fromBranchId);
            const destBranch = branches.find(b => b.id === transfer.toBranchId);
            const product = window.products?.find(p => p.id === item.productId);
            
            // Ensure stockMovements is initialized
            if (!window.stockMovements) {
                const stored = localStorage.getItem('ezcubic_stock_movements');
                window.stockMovements = stored ? JSON.parse(stored) : [];
            }
            
            const stockInMovement = {
                id: 'SM' + Date.now() + '_in_' + item.productId,
                type: 'transfer_in',
                productId: item.productId,
                productName: product?.name || item.productName || 'Unknown',
                quantity: item.quantity,
                reason: `Transfer from ${sourceBranch?.name || transfer.fromBranchId}`,
                reference: transfer.transferNumber,
                branchId: transfer.toBranchId,
                branchName: destBranch?.name || transfer.toBranchId,
                date: new Date().toISOString(),
                createdAt: new Date().toISOString()
            };
            
            window.stockMovements.unshift(stockInMovement);
            localStorage.setItem('ezcubic_stock_movements', JSON.stringify(window.stockMovements));
            console.log('Stock movement recorded:', stockInMovement.type, stockInMovement.productName, stockInMovement.quantity);
        });
        
        // Also update products array for immediate UI refresh
        if (typeof products !== 'undefined') {
            transfer.items.forEach(item => {
                const product = products.find(p => p.id === item.productId);
                if (product) {
                    if (!product.branchStock) product.branchStock = {};
                    product.branchStock[transfer.toBranchId] = 
                        getBranchStock(item.productId, transfer.toBranchId);
                }
            });
        }
        
        // Update window.products as well
        if (window.products) {
            transfer.items.forEach(item => {
                const product = window.products.find(p => p.id === item.productId);
                if (product) {
                    if (!product.branchStock) product.branchStock = {};
                    product.branchStock[transfer.toBranchId] = 
                        getBranchStock(item.productId, transfer.toBranchId);
                }
            });
        }
        
        transfer.status = 'completed';
        transfer.completedAt = new Date().toISOString();
        saveBranchData();
        
        // Also save to tenant storage
        if (typeof saveToUserTenant === 'function') {
            saveToUserTenant();
        }
        
        renderTransfers();
        updateBranchStats();
        
        // Refresh Branch Inventory tab
        if (typeof renderBranchInventory === 'function') {
            renderBranchInventory();
        }
        
        // Refresh POS products display
        if (typeof renderPOSProducts === 'function') {
            renderPOSProducts();
        }
        
        // Refresh inventory display
        if (typeof renderProducts === 'function') {
            renderProducts();
        }
        
        // Refresh stock movements
        if (typeof renderStockMovements === 'function') {
            renderStockMovements();
        }
        
        // Refresh Stock Control stats
        if (typeof updateStockStats === 'function') {
            updateStockStats();
        }
        
        // Update inventory stats
        if (typeof updateInventoryStats === 'function') {
            updateInventoryStats();
        }
        
        showNotification('Transfer completed! Inventory updated at both branches.', 'success');
    }
}

function cancelTransfer(transferId) {
    const transfer = branchTransfers.find(t => t.id === transferId);
    if (!transfer || transfer.status !== 'pending') return;
    
    if (confirm(`Cancel transfer ${transfer.transferNumber}?`)) {
        transfer.status = 'cancelled';
        transfer.cancelledAt = new Date().toISOString();
        saveBranchData();
        
        renderTransfers();
        updateBranchStats();
        
        showNotification('Transfer cancelled', 'info');
    }
}

function viewTransferDetails(transferId) {
    const transfer = branchTransfers.find(t => t.id === transferId);
    if (!transfer) return;
    
    const modalHtml = `
        <div class="modal show" id="transferDetailModal">
            <div class="modal-content" style="max-width: 600px;">
                <div class="modal-header">
                    <h3 class="modal-title">
                        <i class="fas fa-exchange-alt"></i> Transfer ${transfer.transferNumber}
                    </h3>
                    <button class="modal-close" onclick="closeModal('transferDetailModal')">&times;</button>
                </div>
                <div style="padding: 20px;">
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 20px;">
                        <div>
                            <div style="color: #64748b; font-size: 12px;">From</div>
                            <div style="font-weight: 600;">${escapeHTML(transfer.fromBranchName)}</div>
                        </div>
                        <div>
                            <div style="color: #64748b; font-size: 12px;">To</div>
                            <div style="font-weight: 600;">${escapeHTML(transfer.toBranchName)}</div>
                        </div>
                        <div>
                            <div style="color: #64748b; font-size: 12px;">Date</div>
                            <div>${formatDate(transfer.date)}</div>
                        </div>
                        <div>
                            <div style="color: #64748b; font-size: 12px;">Status</div>
                            <div class="status-badge" style="display: inline-block;">${transfer.status}</div>
                        </div>
                    </div>
                    
                    <h4 style="margin: 20px 0 10px;"><i class="fas fa-boxes"></i> Items</h4>
                    <table style="width: 100%; border-collapse: collapse;">
                        <thead>
                            <tr style="background: #f8fafc;">
                                <th style="text-align: left; padding: 10px;">Product</th>
                                <th style="text-align: right; padding: 10px;">Quantity</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${transfer.items.map(item => `
                                <tr style="border-bottom: 1px solid #e2e8f0;">
                                    <td style="padding: 10px;">${escapeHTML(item.productName)}</td>
                                    <td style="padding: 10px; text-align: right;">${item.quantity}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                    
                    ${transfer.notes ? `
                        <div style="margin-top: 20px; padding: 15px; background: #f8fafc; border-radius: 8px;">
                            <strong>Notes:</strong> ${escapeHTML(transfer.notes)}
                        </div>
                    ` : ''}
                </div>
            </div>
        </div>
    `;
    
    document.getElementById('transferDetailModal')?.remove();
    document.body.insertAdjacentHTML('beforeend', modalHtml);
}

// ==================== BRANCH TAB NAVIGATION ====================
function showBranchTab(tab) {
    // Update tab buttons
    document.querySelectorAll('#branches .tabs .tab').forEach(t => t.classList.remove('active'));
    if (event && event.currentTarget) {
        event.currentTarget.classList.add('active');
    }
    
    // Show/hide tab content - use correct IDs from HTML
    document.getElementById('branchListTab').style.display = tab === 'list' ? 'block' : 'none';
    const inventoryTab = document.getElementById('branchInventoryTab');
    if (inventoryTab) inventoryTab.style.display = tab === 'inventory' ? 'block' : 'none';
    document.getElementById('branchTransfersTab').style.display = tab === 'transfers' ? 'block' : 'none';
    document.getElementById('branchReportsTab').style.display = tab === 'reports' ? 'block' : 'none';
    
    // Render content for selected tab
    if (tab === 'list') renderBranches();
    if (tab === 'inventory') renderBranchInventory();
    if (tab === 'transfers') renderTransfers();
    if (tab === 'reports') renderBranchReports();
}

// ==================== BRANCH INVENTORY TAB ====================
function renderBranchInventory() {
    const container = document.getElementById('branchInventoryContent');
    const branchSelect = document.getElementById('branchInventoryBranch');
    if (!container) return;
    
    // Populate branch dropdown
    if (branchSelect) {
        const currentValue = branchSelect.value;
        branchSelect.innerHTML = `
            <option value="all">All Branches</option>
            ${branches.filter(b => b.status === 'active').map(b => 
                `<option value="${b.id}">${escapeHTML(b.name)}</option>`
            ).join('')}
        `;
        if (currentValue) branchSelect.value = currentValue;
    }
    
    const selectedBranch = branchSelect?.value || 'all';
    const searchTerm = document.getElementById('branchInventorySearch')?.value?.toLowerCase() || '';
    
    // Get products
    const allProducts = window.products || [];
    
    // Filter products by search
    const filteredProducts = allProducts.filter(p => 
        !searchTerm || 
        p.name.toLowerCase().includes(searchTerm) ||
        (p.sku && p.sku.toLowerCase().includes(searchTerm))
    );
    
    if (filteredProducts.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-boxes"></i>
                <h4>No Products Found</h4>
                <p>Add products in Inventory section to see branch stock levels.</p>
            </div>
        `;
        return;
    }
    
    // Build inventory table
    let html = `
        <div class="table-container">
            <table style="width: 100%; border-collapse: collapse;">
                <thead>
                    <tr style="background: #f8fafc; border-bottom: 2px solid #e2e8f0;">
                        <th style="text-align: left; padding: 12px;">Product</th>
                        <th style="text-align: left; padding: 12px;">SKU</th>
                        ${selectedBranch === 'all' 
                            ? branches.filter(b => b.status === 'active').map(b => 
                                `<th style="text-align: center; padding: 12px;">${escapeHTML(b.code || b.name)}</th>`
                              ).join('')
                            : `<th style="text-align: center; padding: 12px;">Stock</th>`
                        }
                        <th style="text-align: center; padding: 12px;">Total</th>
                        <th style="text-align: right; padding: 12px;">Value</th>
                    </tr>
                </thead>
                <tbody>
    `;
    
    let totalValue = 0;
    
    filteredProducts.forEach(product => {
        const price = product.costPrice || product.price || 0;
        let rowTotal = 0;
        
        html += `<tr style="border-bottom: 1px solid #e2e8f0;">`;
        html += `<td style="padding: 12px;"><strong>${escapeHTML(product.name)}</strong></td>`;
        html += `<td style="padding: 12px; color: #64748b;">${escapeHTML(product.sku || '-')}</td>`;
        
        if (selectedBranch === 'all') {
            // Show stock for each branch
            branches.filter(b => b.status === 'active').forEach(branch => {
                const stock = getBranchStock(product.id, branch.id);
                rowTotal += stock;
                const stockClass = stock <= 0 ? 'color: #ef4444;' : (stock <= (product.lowStockThreshold || 5) ? 'color: #f59e0b;' : 'color: #10b981;');
                html += `<td style="text-align: center; padding: 12px; ${stockClass} font-weight: 600;">${stock}</td>`;
            });
        } else {
            // Show stock for selected branch only
            const stock = getBranchStock(product.id, selectedBranch);
            rowTotal = stock;
            const stockClass = stock <= 0 ? 'color: #ef4444;' : (stock <= (product.lowStockThreshold || 5) ? 'color: #f59e0b;' : 'color: #10b981;');
            html += `<td style="text-align: center; padding: 12px; ${stockClass} font-weight: 600;">${stock}</td>`;
        }
        
        const rowValue = rowTotal * price;
        totalValue += rowValue;
        
        html += `<td style="text-align: center; padding: 12px; font-weight: 600;">${rowTotal}</td>`;
        html += `<td style="text-align: right; padding: 12px;">${formatRM(rowValue)}</td>`;
        html += `</tr>`;
    });
    
    html += `
                </tbody>
                <tfoot>
                    <tr style="background: #f0fdf4; font-weight: 700;">
                        <td colspan="${selectedBranch === 'all' ? branches.filter(b => b.status === 'active').length + 2 : 3}" style="padding: 12px; text-align: right;">Total Inventory Value:</td>
                        <td style="padding: 12px; text-align: center;"></td>
                        <td style="padding: 12px; text-align: right; color: #10b981;">${formatRM(totalValue)}</td>
                    </tr>
                </tfoot>
            </table>
        </div>
    `;
    
    container.innerHTML = html;
}
window.renderBranchInventory = renderBranchInventory;

// ==================== BRANCH REPORTS ====================
function renderBranchReports() {
    const container = document.getElementById('branchReportsContent');
    if (!container) return;
    
    const reportData = branches.filter(b => b.status === 'active').map(branch => ({
        branch: branch,
        sales: getBranchSalesTotal(branch.id),
        inventory: getBranchInventoryValue(branch.id),
        transactions: getBranchTransactionCount(branch.id)
    }));
    
    const totalSales = reportData.reduce((sum, r) => sum + r.sales, 0);
    const totalInventory = reportData.reduce((sum, r) => sum + r.inventory, 0);
    
    container.innerHTML = `
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-bottom: 20px;">
            <div class="stat-card" style="background: #f0fdf4; padding: 20px; border-radius: 12px; border-left: 4px solid #10b981;">
                <div style="font-size: 24px; font-weight: 700; color: #10b981;">${formatRM(totalSales)}</div>
                <div style="color: #64748b;">Total Sales (All Branches)</div>
            </div>
            <div class="stat-card" style="background: #eff6ff; padding: 20px; border-radius: 12px; border-left: 4px solid #3b82f6;">
                <div style="font-size: 24px; font-weight: 700; color: #3b82f6;">${formatRM(totalInventory)}</div>
                <div style="color: #64748b;">Total Inventory Value</div>
            </div>
        </div>
        
        <h4 style="margin: 20px 0 15px;"><i class="fas fa-chart-bar"></i> Branch Performance Comparison</h4>
        <table style="width: 100%; border-collapse: collapse;">
            <thead>
                <tr style="background: #f8fafc; border-bottom: 2px solid #e2e8f0;">
                    <th style="text-align: left; padding: 12px;">Branch</th>
                    <th style="text-align: right; padding: 12px;">Sales</th>
                    <th style="text-align: right; padding: 12px;">% of Total</th>
                    <th style="text-align: right; padding: 12px;">Inventory</th>
                    <th style="text-align: right; padding: 12px;">Transactions</th>
                </tr>
            </thead>
            <tbody>
                ${reportData.map(r => `
                    <tr style="border-bottom: 1px solid #e2e8f0;">
                        <td style="padding: 12px;">
                            <strong>${escapeHTML(r.branch.name)}</strong>
                            <div style="font-size: 12px; color: #64748b;">${r.branch.code}</div>
                        </td>
                        <td style="padding: 12px; text-align: right; color: #10b981; font-weight: 600;">
                            ${formatRM(r.sales)}
                        </td>
                        <td style="padding: 12px; text-align: right;">
                            ${totalSales > 0 ? ((r.sales / totalSales) * 100).toFixed(1) : 0}%
                        </td>
                        <td style="padding: 12px; text-align: right; color: #3b82f6;">
                            ${formatRM(r.inventory)}
                        </td>
                        <td style="padding: 12px; text-align: right;">
                            ${r.transactions}
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

// ==================== HELPER FUNCTIONS ====================
function getBranchInventoryValue(branchId) {
    // Use branch stock system for accurate per-branch inventory
    const inventory = window.products || 
        (typeof products !== 'undefined' && products.length > 0 ? products : 
        JSON.parse(localStorage.getItem('ezcubic_products') || '[]'));
    
    return inventory.reduce((sum, product) => {
        // Get stock from branch stock system
        const branchStock = getBranchStock(product.id, branchId);
        const price = product.costPrice || product.price || 0;
        return sum + (branchStock * price);
    }, 0);
}

function getBranchSalesThisMonth(branchId) {
    return getBranchSalesTotal(branchId);
}

function getBranchSalesTotal(branchId) {
    let total = 0;
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    // Include income transactions
    if (typeof businessData !== 'undefined' && businessData.transactions) {
        total += businessData.transactions
            .filter(tx => {
                const txDate = new Date(tx.date);
                return tx.type === 'income' && 
                       txDate >= startOfMonth &&
                       (tx.branchId === branchId || (!tx.branchId && branchId === currentBranchId));
            })
            .reduce((sum, tx) => sum + (tx.amount || 0), 0);
    }
    
    // Include POS sales - this is the key fix!
    if (typeof sales !== 'undefined' && Array.isArray(sales)) {
        total += sales
            .filter(sale => {
                const saleDate = new Date(sale.date);
                return saleDate >= startOfMonth &&
                       (sale.branchId === branchId || (!sale.branchId && branchId === currentBranchId));
            })
            .reduce((sum, sale) => sum + (sale.total || 0), 0);
    }
    
    return total;
}

function getBranchTransactionCount(branchId) {
    let count = 0;
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    // Count income/expense transactions
    if (typeof businessData !== 'undefined' && businessData.transactions) {
        count += businessData.transactions.filter(tx => {
            const txDate = new Date(tx.date);
            return txDate >= startOfMonth &&
                   (tx.branchId === branchId || (!tx.branchId && branchId === currentBranchId));
        }).length;
    }
    
    // Count POS sales
    if (typeof sales !== 'undefined' && Array.isArray(sales)) {
        count += sales.filter(sale => {
            const saleDate = new Date(sale.date);
            return saleDate >= startOfMonth &&
                   (sale.branchId === branchId || (!sale.branchId && branchId === currentBranchId));
        }).length;
    }
    
    return count;
}

function formatRM(amount) {
    return 'RM ' + (amount || 0).toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDate(dateStr) {
    return new Date(dateStr).toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' });
}

function escapeHTML(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

function showNotification(message, type = 'info') {
    if (typeof window.showNotification === 'function' && window.showNotification !== showNotification) {
        window.showNotification(message, type);
    } else {
        console.log(`[${type.toUpperCase()}] ${message}`);
    }
}

// Note: Using window.closeModal from core.js instead of defining our own
// This prevents accidentally removing static modals from the DOM

function viewBranchInventory(branchId) {
    // Switch to branch and show inventory
    switchBranch(branchId);
    closeBranchDetailModal();
    if (typeof showSection === 'function') {
        showSection('inventory');
    }
}

function viewBranchTransactions(branchId) {
    // Switch to branch and show transactions
    switchBranch(branchId);
    closeBranchDetailModal();
    if (typeof showSection === 'function') {
        showSection('transactions');
    }
}

// ==================== CURRENT BRANCH HELPER ====================
function getCurrentBranch() {
    return branches.find(b => b.id === currentBranchId) || branches[0];
}

function getCurrentBranchId() {
    return currentBranchId;
}

// ==================== SYNC BRANCHES TO POS OUTLETS ====================
function syncBranchesToOutlets() {
    // Sync branches to outlets array used by POS
    if (typeof outlets !== 'undefined') {
        // Convert branches to outlets format
        outlets = branches
            .filter(b => b.status === 'active')
            .map(b => ({
                id: b.id,
                name: b.name,
                code: b.code,
                type: b.type
            }));
        
        // Save outlets
        if (typeof saveOutlets === 'function') {
            saveOutlets();
        } else {
            localStorage.setItem('ezcubic_outlets', JSON.stringify(outlets));
            // Also save to tenant storage for multi-tenant isolation
            if (typeof saveToUserTenant === 'function') {
                saveToUserTenant();
            }
        }
        
        // Re-render outlet dropdowns in POS
        if (typeof renderOutletDropdowns === 'function') {
            renderOutletDropdowns();
        }
        
        // Also update the POS outlet filter directly
        updatePOSOutletFilter();
    }
}

function updatePOSOutletFilter() {
    const posOutletFilter = document.getElementById('posOutletFilter');
    if (!posOutletFilter) return;
    
    const activeBranches = branches.filter(b => b.status === 'active');
    const currentValue = posOutletFilter.value;
    
    posOutletFilter.innerHTML = `
        <option value="all">All Outlets</option>
        ${activeBranches.map(branch => `
            <option value="${branch.id}">${escapeHTML(branch.name)} (${escapeHTML(branch.code)})</option>
        `).join('')}
    `;
    
    // Restore selection if still valid
    if (currentValue && activeBranches.find(b => b.id === currentValue)) {
        posOutletFilter.value = currentValue;
    }
}

// ==================== STOCK PER BRANCH ====================
function getBranchStock(productId, branchId) {
    // Get stock level for a product at a specific branch
    const stockKey = 'ezcubic_branch_stock';
    const stored = localStorage.getItem(stockKey);
    const branchStock = stored ? JSON.parse(stored) : {};
    
    const key = `${productId}_${branchId}`;
    return branchStock[key] || 0;
}

function setBranchStock(productId, branchId, quantity) {
    const stockKey = 'ezcubic_branch_stock';
    const stored = localStorage.getItem(stockKey);
    const branchStock = stored ? JSON.parse(stored) : {};
    
    const key = `${productId}_${branchId}`;
    branchStock[key] = Math.max(0, quantity);
    
    localStorage.setItem(stockKey, JSON.stringify(branchStock));
    
    // ===== SYNC TO PRODUCT ARRAY =====
    // Update product.branchStock and product.stock so Inventory, POS, Stock Control show correct values
    syncBranchStockToProduct(productId);
}

// Sync branch stock storage to product array (for Inventory/POS/Stock Control)
function syncBranchStockToProduct(productId) {
    const productList = typeof products !== 'undefined' ? products : window.products;
    if (!productList || !productList.length) return;
    
    const productIndex = productList.findIndex(p => p.id === productId);
    if (productIndex === -1) return;
    
    const product = productList[productIndex];
    
    // Get all branch stock for this product
    const stockKey = 'ezcubic_branch_stock';
    const stored = localStorage.getItem(stockKey);
    const branchStockData = stored ? JSON.parse(stored) : {};
    
    // Build product.branchStock object
    if (!product.branchStock) {
        product.branchStock = {};
    }
    
    // Get all branches
    const branchList = typeof branches !== 'undefined' ? branches : window.branches || [];
    let totalStock = 0;
    
    branchList.forEach(branch => {
        const key = `${productId}_${branch.id}`;
        const qty = branchStockData[key] || 0;
        product.branchStock[branch.id] = qty;
        totalStock += qty;
    });
    
    // Update product.stock to be total of all branch stock
    product.stock = totalStock;
    product.updatedAt = new Date().toISOString();
    
    // Save products to localStorage
    localStorage.setItem('ezcubic_products', JSON.stringify(productList));
    
    // Sync to window and tenant storage
    window.products = productList;
    if (typeof saveToUserTenant === 'function') {
        saveToUserTenant();
    }
    
    console.log(`Synced stock for ${product.name}: branchStock=${JSON.stringify(product.branchStock)}, total=${totalStock}`);
}
window.syncBranchStockToProduct = syncBranchStockToProduct;

// Sync ALL products' branch stock from ezcubic_branch_stock to products array
// Call this on app load to ensure Inventory/POS/Stock Control show correct values
function syncAllBranchStockToProducts() {
    console.log('syncAllBranchStockToProducts: Starting full sync...');
    
    const productList = typeof products !== 'undefined' && products.length > 0 ? products : window.products || [];
    if (!productList || !productList.length) {
        console.log('syncAllBranchStockToProducts: No products to sync');
        return;
    }
    
    // Get all branch stock data
    const stockKey = 'ezcubic_branch_stock';
    const stored = localStorage.getItem(stockKey);
    const branchStockData = stored ? JSON.parse(stored) : {};
    
    // Get all branches
    let branchList = typeof branches !== 'undefined' ? branches : window.branches || [];
    if (branchList.length === 0) {
        const branchStored = localStorage.getItem('ezcubic_branches');
        if (branchStored) {
            branchList = JSON.parse(branchStored);
        }
    }
    
    if (branchList.length === 0) {
        console.log('syncAllBranchStockToProducts: No branches found');
        return;
    }
    
    let syncedCount = 0;
    
    productList.forEach(product => {
        if (!product.branchStock) {
            product.branchStock = {};
        }
        
        let totalStock = 0;
        
        branchList.forEach(branch => {
            const key = `${product.id}_${branch.id}`;
            const qty = branchStockData[key] || 0;
            product.branchStock[branch.id] = qty;
            totalStock += qty;
        });
        
        // Only update if we have branch stock data OR if total differs
        if (Object.keys(branchStockData).length > 0 && totalStock !== product.stock) {
            product.stock = totalStock;
            product.updatedAt = new Date().toISOString();
            syncedCount++;
        }
    });
    
    // Save updated products
    if (syncedCount > 0) {
        localStorage.setItem('ezcubic_products', JSON.stringify(productList));
        window.products = productList;
        if (typeof saveToUserTenant === 'function') {
            saveToUserTenant();
        }
        console.log(`syncAllBranchStockToProducts: Synced ${syncedCount} products`);
    } else {
        console.log('syncAllBranchStockToProducts: All products already in sync');
    }
}
window.syncAllBranchStockToProducts = syncAllBranchStockToProducts;

function adjustBranchStock(productId, branchId, adjustment) {
    const currentStock = getBranchStock(productId, branchId);
    setBranchStock(productId, branchId, currentStock + adjustment);
}

function getAllBranchStock(productId) {
    // Get stock levels for a product across all branches
    const stockKey = 'ezcubic_branch_stock';
    const stored = localStorage.getItem(stockKey);
    const branchStock = stored ? JSON.parse(stored) : {};
    
    const result = [];
    branches.forEach(branch => {
        const key = `${productId}_${branch.id}`;
        result.push({
            branchId: branch.id,
            branchName: branch.name,
            branchCode: branch.code,
            stock: branchStock[key] || 0
        });
    });
    
    return result;
}

// Get total stock for a product across ALL branches
function getTotalBranchStock(productId) {
    const allStock = getAllBranchStock(productId);
    return allStock.reduce((total, bs) => total + bs.stock, 0);
}
window.getTotalBranchStock = getTotalBranchStock;

function initializeBranchStockFromProducts() {
    // Initialize branch stock from existing products
    // Distribute stock to default branch if not already set
    if (typeof products === 'undefined' || !products.length) return;
    
    const defaultBranch = branches.find(b => b.isDefault) || branches[0];
    if (!defaultBranch) return;
    
    const stockKey = 'ezcubic_branch_stock';
    const stored = localStorage.getItem(stockKey);
    const branchStock = stored ? JSON.parse(stored) : {};
    
    products.forEach(product => {
        const key = `${product.id}_${defaultBranch.id}`;
        // Only initialize if not already set
        if (!(key in branchStock)) {
            branchStock[key] = product.stock || 0;
        }
    });
    
    localStorage.setItem(stockKey, JSON.stringify(branchStock));
}

// ==================== TRANSFER STOCK UPDATES ====================
function processTransferStock(transfer) {
    // When a transfer is completed, update stock at both branches
    if (transfer.status !== 'completed') return;
    
    console.log('Processing stock transfer:', transfer.id);
    console.log('From:', transfer.fromBranchId, 'To:', transfer.toBranchId);
    
    transfer.items.forEach(item => {
        console.log('Processing item:', item.productId, 'qty:', item.quantity);
        
        // Reduce stock at source branch (use correct field name: fromBranchId)
        adjustBranchStock(item.productId, transfer.fromBranchId, -item.quantity);
        // Increase stock at destination branch (use correct field name: toBranchId)
        adjustBranchStock(item.productId, transfer.toBranchId, item.quantity);
        
        console.log('After adjustment - From branch stock:', getBranchStock(item.productId, transfer.fromBranchId));
        console.log('After adjustment - To branch stock:', getBranchStock(item.productId, transfer.toBranchId));
        
        // Create stock movement records for Stock Control module
        if (typeof window.stockMovements !== 'undefined') {
            const sourceBranch = branches.find(b => b.id === transfer.fromBranchId);
            const destBranch = branches.find(b => b.id === transfer.toBranchId);
            const product = window.products?.find(p => p.id === item.productId);
            
            // Stock OUT from source
            const stockOutMovement = {
                id: 'SM' + Date.now() + '_out_' + item.productId,
                type: 'transfer_out',
                productId: item.productId,
                productName: product?.name || item.productName || 'Unknown',
                quantity: -item.quantity,
                reason: `Transfer to ${destBranch?.name || transfer.toBranchId}`,
                reference: transfer.id,
                branchId: transfer.fromBranchId,
                branchName: sourceBranch?.name || transfer.fromBranchId,
                date: new Date().toISOString(),
                createdAt: new Date().toISOString()
            };
            
            // Stock IN to destination
            const stockInMovement = {
                id: 'SM' + Date.now() + '_in_' + item.productId,
                type: 'transfer_in',
                productId: item.productId,
                productName: product?.name || item.productName || 'Unknown',
                quantity: item.quantity,
                reason: `Transfer from ${sourceBranch?.name || transfer.fromBranchId}`,
                reference: transfer.id,
                branchId: transfer.toBranchId,
                branchName: destBranch?.name || transfer.toBranchId,
                date: new Date().toISOString(),
                createdAt: new Date().toISOString()
            };
            
            window.stockMovements.push(stockOutMovement);
            window.stockMovements.push(stockInMovement);
            
            // Save stock movements
            localStorage.setItem('ezcubic_stock_movements', JSON.stringify(window.stockMovements));
        }
    });
    
    // Save branch transfers
    saveBranchData();
    
    // Save to tenant storage
    if (typeof saveToUserTenant === 'function') {
        saveToUserTenant();
    }
    
    // Update all related UI
    if (typeof renderPOSProducts === 'function') renderPOSProducts();
    if (typeof renderProducts === 'function') renderProducts();
    if (typeof renderStockMovements === 'function') renderStockMovements();
    if (typeof updateStockStats === 'function') updateStockStats();
    if (typeof updateInventoryStats === 'function') updateInventoryStats();
    if (typeof renderBranchReports === 'function') renderBranchReports();
    
    console.log('Stock transfer processed and synced to all modules');
}

// ==================== EXPORT FUNCTIONS ====================
window.initializeBranches = initializeBranches;
window.renderBranches = renderBranches;
window.showBranchModal = showBranchModal;
window.closeBranchModal = closeBranchModal;
window.saveBranch = saveBranch;
window.editBranch = editBranch;
window.deleteBranch = deleteBranch;
window.toggleBranchStatus = toggleBranchStatus;
window.viewBranchDetails = viewBranchDetails;
window.closeBranchDetailModal = closeBranchDetailModal;
window.showTransferModal = showTransferModal;
window.closeTransferModal = closeTransferModal;
window.addTransferItem = addTransferItem;
window.removeTransferItem = removeTransferItem;
window.updateTransferProducts = updateTransferProducts;
window.saveTransfer = saveTransfer;
window.confirmTransfer = confirmTransfer;
window.completeTransfer = completeTransfer;
window.cancelTransfer = cancelTransfer;
window.viewTransferDetails = viewTransferDetails;
window.showBranchTab = showBranchTab;
window.renderBranchReports = renderBranchReports;
window.renderTransfers = renderTransfers;
window.updateBranchStats = updateBranchStats;
window.toggleBranchDropdown = toggleBranchDropdown;
window.switchBranch = switchBranch;
window.getCurrentBranch = getCurrentBranch;
window.getCurrentBranchId = getCurrentBranchId;
window.renderBranchSelector = renderBranchSelector;
window.filterBranches = filterBranches;
window.filterTransfers = filterTransfers;
window.onTransferBranchChange = onTransferBranchChange;
window.syncBranchesToOutlets = syncBranchesToOutlets;
window.updatePOSOutletFilter = updatePOSOutletFilter;
window.getBranchStock = getBranchStock;
window.setBranchStock = setBranchStock;
window.adjustBranchStock = adjustBranchStock;
window.getAllBranchStock = getAllBranchStock;
window.initializeBranchStockFromProducts = initializeBranchStockFromProducts;
window.processTransferStock = processTransferStock;
// Don't overwrite window.branches if already set by tenant system
if (!window.branches) {
    window.branches = branches;
}

// Close dropdown when clicking outside
document.addEventListener('click', (e) => {
    if (!e.target.closest('.branch-selector-dropdown')) {
        const menu = document.getElementById('branchDropdownMenu');
        if (menu) menu.classList.remove('show');
    }
});
