/**
 * BRANCHES-CRUD.JS
 * Multi-Branch Management Module - CRUD Operations
 * Branch CRUD, Modals, Filters
 * Version: 2.2.7 - Modular Split - 26 Dec 2025
 */

// ==================== BRANCH SELECTOR ====================
function renderBranchSelector() {
    const selector = document.getElementById('branch-selector');
    if (!selector) return;
    
    const activeBranches = branches.filter(b => b.status === 'active');
    
    selector.innerHTML = `
        <option value="all">All Branches</option>
        ${activeBranches.map(b => `
            <option value="${b.id}" ${b.id === currentBranchId ? 'selected' : ''}>
                ${escapeHTML(b.name)} ${b.isDefault ? '(HQ)' : ''}
            </option>
        `).join('')}
    `;
}

// ==================== STATS ====================
function updateBranchStats() {
    const totalBranchesEl = document.getElementById('total-branches');
    const activeBranchesEl = document.getElementById('active-branches');
    const pendingTransfersEl = document.getElementById('pending-transfers');
    const totalTransfersEl = document.getElementById('total-transfers');
    
    const activeBranches = branches.filter(b => b.status === 'active').length;
    const pendingTransfers = branchTransfers.filter(t => t.status === 'pending').length;
    
    if (totalBranchesEl) totalBranchesEl.textContent = branches.length;
    if (activeBranchesEl) activeBranchesEl.textContent = activeBranches;
    if (pendingTransfersEl) pendingTransfersEl.textContent = pendingTransfers;
    if (totalTransfersEl) totalTransfersEl.textContent = branchTransfers.length;
}

// ==================== BRANCH LIST ====================
function renderBranches() {
    const container = document.getElementById('branch-list');
    if (!container) return;
    
    if (branches.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-store"></i>
                <p>No branches found</p>
                <button class="btn btn-primary" onclick="showBranchModal()">
                    <i class="fas fa-plus"></i> Add First Branch
                </button>
            </div>
        `;
        return;
    }
    
    container.innerHTML = branches.map(branch => `
        <div class="branch-card ${branch.status}">
            <div class="branch-header">
                <div class="branch-info">
                    <h3>${escapeHTML(branch.name)} ${branch.isDefault ? '<span class="badge badge-primary">HQ</span>' : ''}</h3>
                    <span class="branch-code">${escapeHTML(branch.code)}</span>
                </div>
                <div class="branch-status">
                    <span class="status-badge ${branch.status}">${branch.status}</span>
                </div>
            </div>
            <div class="branch-details">
                <p><i class="fas fa-map-marker-alt"></i> ${escapeHTML(branch.address || branch.city || 'No address')}</p>
                <p><i class="fas fa-phone"></i> ${escapeHTML(branch.phone || 'No phone')}</p>
                <p><i class="fas fa-user-tie"></i> ${escapeHTML(branch.manager || 'No manager')}</p>
            </div>
            <div class="branch-actions">
                <button class="btn btn-sm btn-outline" onclick="viewBranchDetails('${branch.id}')">
                    <i class="fas fa-eye"></i> View
                </button>
                <button class="btn btn-sm btn-outline" onclick="editBranch('${branch.id}')">
                    <i class="fas fa-edit"></i> Edit
                </button>
                ${!branch.isDefault ? `
                    <button class="btn btn-sm ${branch.status === 'active' ? 'btn-warning' : 'btn-success'}" 
                            onclick="toggleBranchStatus('${branch.id}')">
                        <i class="fas fa-${branch.status === 'active' ? 'pause' : 'play'}"></i>
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="deleteBranch('${branch.id}')">
                        <i class="fas fa-trash"></i>
                    </button>
                ` : ''}
            </div>
        </div>
    `).join('');
}

// ==================== FILTERS ====================
function filterBranches(status) {
    const container = document.getElementById('branch-list');
    if (!container) return;
    
    let filtered = branches;
    if (status && status !== 'all') {
        filtered = branches.filter(b => b.status === status);
    }
    
    if (filtered.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-filter"></i>
                <p>No branches match the filter</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = filtered.map(branch => `
        <div class="branch-card ${branch.status}">
            <div class="branch-header">
                <div class="branch-info">
                    <h3>${escapeHTML(branch.name)} ${branch.isDefault ? '<span class="badge badge-primary">HQ</span>' : ''}</h3>
                    <span class="branch-code">${escapeHTML(branch.code)}</span>
                </div>
                <div class="branch-status">
                    <span class="status-badge ${branch.status}">${branch.status}</span>
                </div>
            </div>
            <div class="branch-details">
                <p><i class="fas fa-map-marker-alt"></i> ${escapeHTML(branch.address || branch.city || 'No address')}</p>
                <p><i class="fas fa-phone"></i> ${escapeHTML(branch.phone || 'No phone')}</p>
                <p><i class="fas fa-user-tie"></i> ${escapeHTML(branch.manager || 'No manager')}</p>
            </div>
            <div class="branch-actions">
                <button class="btn btn-sm btn-outline" onclick="viewBranchDetails('${branch.id}')">
                    <i class="fas fa-eye"></i> View
                </button>
                <button class="btn btn-sm btn-outline" onclick="editBranch('${branch.id}')">
                    <i class="fas fa-edit"></i> Edit
                </button>
                ${!branch.isDefault ? `
                    <button class="btn btn-sm ${branch.status === 'active' ? 'btn-warning' : 'btn-success'}" 
                            onclick="toggleBranchStatus('${branch.id}')">
                        <i class="fas fa-${branch.status === 'active' ? 'pause' : 'play'}"></i>
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="deleteBranch('${branch.id}')">
                        <i class="fas fa-trash"></i>
                    </button>
                ` : ''}
            </div>
        </div>
    `).join('');
}

function filterTransfers(status) {
    renderTransfers(status);
}

function onTransferBranchChange() {
    // Update available products based on source branch
    updateTransferProducts();
}

// ==================== BRANCH MODAL ====================
function showBranchModal(branchId = null) {
    // Check plan limits
    const check = canAddBranch();
    if (!branchId && !check.allowed) {
        if (typeof window.showUpgradeModal === 'function') {
            window.showUpgradeModal('branches');
        } else {
            showNotification(`Branch limit reached (${check.current}/${check.limit}). Please upgrade your plan.`, 'warning');
        }
        return;
    }
    
    const modal = document.getElementById('branch-modal');
    const title = document.getElementById('branch-modal-title');
    const form = document.getElementById('branch-form');
    
    if (!modal) return;
    
    if (branchId) {
        const branch = branches.find(b => b.id === branchId);
        if (!branch) return;
        
        title.textContent = 'Edit Branch';
        document.getElementById('branch-id').value = branch.id;
        document.getElementById('branch-code').value = branch.code || '';
        document.getElementById('branch-name').value = branch.name || '';
        document.getElementById('branch-type').value = branch.type || 'branch';
        document.getElementById('branch-address').value = branch.address || '';
        document.getElementById('branch-city').value = branch.city || '';
        document.getElementById('branch-state').value = branch.state || '';
        document.getElementById('branch-postcode').value = branch.postcode || '';
        document.getElementById('branch-phone').value = branch.phone || '';
        document.getElementById('branch-email').value = branch.email || '';
        document.getElementById('branch-manager').value = branch.manager || '';
    } else {
        title.textContent = 'Add New Branch';
        form.reset();
        document.getElementById('branch-id').value = '';
        document.getElementById('branch-code').value = 'BR' + (branches.length + 1).toString().padStart(3, '0');
    }
    
    modal.classList.add('active');
}

function closeBranchModal() {
    const modal = document.getElementById('branch-modal');
    if (modal) modal.classList.remove('active');
}

// ==================== SAVE BRANCH ====================
function saveBranch() {
    const id = document.getElementById('branch-id').value;
    const code = document.getElementById('branch-code').value.trim();
    const name = document.getElementById('branch-name').value.trim();
    const type = document.getElementById('branch-type').value;
    const address = document.getElementById('branch-address').value.trim();
    const city = document.getElementById('branch-city').value.trim();
    const state = document.getElementById('branch-state').value.trim();
    const postcode = document.getElementById('branch-postcode').value.trim();
    const phone = document.getElementById('branch-phone').value.trim();
    const email = document.getElementById('branch-email').value.trim();
    const manager = document.getElementById('branch-manager').value.trim();
    
    if (!code || !name) {
        showNotification('Branch code and name are required', 'error');
        return;
    }
    
    // Check for duplicate code
    const existingBranch = branches.find(b => b.code === code && b.id !== id);
    if (existingBranch) {
        showNotification('Branch code already exists', 'error');
        return;
    }
    
    if (id) {
        // Update existing
        const index = branches.findIndex(b => b.id === id);
        if (index !== -1) {
            branches[index] = {
                ...branches[index],
                code, name, type, address, city, state, postcode, phone, email, manager,
                updatedAt: new Date().toISOString()
            };
            showNotification('Branch updated successfully', 'success');
        }
    } else {
        // Create new
        const newBranch = {
            id: 'BRANCH_' + Date.now(),
            code, name, type, address, city, state, postcode, phone, email, manager,
            status: 'active',
            isDefault: branches.length === 0,
            createdAt: new Date().toISOString()
        };
        branches.push(newBranch);
        showNotification('Branch created successfully', 'success');
    }
    
    saveBranchData();
    renderBranches();
    renderBranchSelector();
    updateBranchStats();
    syncBranchesToOutlets();
    closeBranchModal();
}

// ==================== EDIT BRANCH ====================
function editBranch(branchId) {
    showBranchModal(branchId);
}

// ==================== TOGGLE STATUS ====================
function toggleBranchStatus(branchId) {
    const branch = branches.find(b => b.id === branchId);
    if (!branch || branch.isDefault) return;
    
    branch.status = branch.status === 'active' ? 'inactive' : 'active';
    branch.updatedAt = new Date().toISOString();
    
    saveBranchData();
    renderBranches();
    renderBranchSelector();
    updateBranchStats();
    syncBranchesToOutlets();
    
    showNotification(`Branch ${branch.status === 'active' ? 'activated' : 'deactivated'}`, 'success');
}

// ==================== DELETE BRANCH ====================
function deleteBranch(branchId) {
    const branch = branches.find(b => b.id === branchId);
    if (!branch || branch.isDefault) {
        showNotification('Cannot delete default branch', 'error');
        return;
    }
    
    if (!confirm(`Are you sure you want to delete "${branch.name}"?`)) return;
    
    const index = branches.findIndex(b => b.id === branchId);
    if (index !== -1) {
        branches.splice(index, 1);
        
        if (currentBranchId === branchId) {
            currentBranchId = branches[0]?.id || null;
        }
        
        saveBranchData();
        renderBranches();
        renderBranchSelector();
        updateBranchStats();
        syncBranchesToOutlets();
        
        showNotification('Branch deleted successfully', 'success');
    }
}

// ==================== VIEW BRANCH DETAILS ====================
function viewBranchDetails(branchId) {
    const branch = branches.find(b => b.id === branchId);
    if (!branch) return;
    
    const modal = document.getElementById('branch-detail-modal');
    const content = document.getElementById('branch-detail-content');
    
    if (!modal || !content) return;
    
    const inventoryValue = getBranchInventoryValue(branchId);
    const salesThisMonth = getBranchSalesThisMonth(branchId);
    const totalSales = getBranchSalesTotal(branchId);
    const transactionCount = getBranchTransactionCount(branchId);
    
    content.innerHTML = `
        <div class="branch-detail-header">
            <h2>${escapeHTML(branch.name)} ${branch.isDefault ? '<span class="badge badge-primary">HQ</span>' : ''}</h2>
            <span class="branch-code">${escapeHTML(branch.code)}</span>
            <span class="status-badge ${branch.status}">${branch.status}</span>
        </div>
        
        <div class="branch-detail-grid">
            <div class="detail-section">
                <h4><i class="fas fa-info-circle"></i> Basic Information</h4>
                <p><strong>Type:</strong> ${branch.type || 'Branch'}</p>
                <p><strong>Address:</strong> ${escapeHTML(branch.address || 'Not set')}</p>
                <p><strong>City:</strong> ${escapeHTML(branch.city || 'Not set')}</p>
                <p><strong>State:</strong> ${escapeHTML(branch.state || 'Not set')}</p>
                <p><strong>Postcode:</strong> ${escapeHTML(branch.postcode || 'Not set')}</p>
            </div>
            
            <div class="detail-section">
                <h4><i class="fas fa-address-book"></i> Contact Information</h4>
                <p><strong>Phone:</strong> ${escapeHTML(branch.phone || 'Not set')}</p>
                <p><strong>Email:</strong> ${escapeHTML(branch.email || 'Not set')}</p>
                <p><strong>Manager:</strong> ${escapeHTML(branch.manager || 'Not assigned')}</p>
            </div>
            
            <div class="detail-section">
                <h4><i class="fas fa-chart-line"></i> Performance</h4>
                <p><strong>Inventory Value:</strong> ${formatRM(inventoryValue)}</p>
                <p><strong>Sales This Month:</strong> ${formatRM(salesThisMonth)}</p>
                <p><strong>Total Sales:</strong> ${formatRM(totalSales)}</p>
                <p><strong>Transactions:</strong> ${transactionCount}</p>
            </div>
            
            <div class="detail-section">
                <h4><i class="fas fa-calendar"></i> Dates</h4>
                <p><strong>Created:</strong> ${formatDate(branch.createdAt)}</p>
                <p><strong>Updated:</strong> ${branch.updatedAt ? formatDate(branch.updatedAt) : 'Never'}</p>
            </div>
        </div>
    `;
    
    modal.classList.add('active');
}

function closeBranchDetailModal() {
    const modal = document.getElementById('branch-detail-modal');
    if (modal) modal.classList.remove('active');
}

// ==================== EXPORT TO WINDOW ====================
window.renderBranchSelector = renderBranchSelector;
window.updateBranchStats = updateBranchStats;
window.renderBranches = renderBranches;
window.filterBranches = filterBranches;
window.filterTransfers = filterTransfers;
window.onTransferBranchChange = onTransferBranchChange;
window.showBranchModal = showBranchModal;
window.closeBranchModal = closeBranchModal;
window.saveBranch = saveBranch;
window.editBranch = editBranch;
window.toggleBranchStatus = toggleBranchStatus;
window.deleteBranch = deleteBranch;
window.viewBranchDetails = viewBranchDetails;
window.closeBranchDetailModal = closeBranchDetailModal;
