/**
 * EZCubic - Multi-Tenant UI and Data Bridge
 * Split from multi-tenant.js v2.3.2
 * 
 * UI components and data bridge functions connecting tenant data to global businessData
 * Version: 1.0.0 - 26 Dec 2025
 */

// ==================== CURRENT USER TENANT ====================
function getCurrentTenantId() {
    if (!window.currentUser) return null;
    
    const currentTenantId = window.getCurrentTenantIdValue ? window.getCurrentTenantIdValue() : null;
    
    // Founder - use their own tenant by default, or selected tenant for viewing others
    if (window.currentUser.role === 'founder') {
        // If no tenant selected, use founder's own tenant
        if (!currentTenantId && window.currentUser.tenantId) {
            return window.currentUser.tenantId;
        }
        return currentTenantId || window.currentUser.tenantId || null;
    }
    
    // ERP Assistant - use selected tenant or null
    if (window.currentUser.role === 'erp_assistant') {
        return currentTenantId;
    }
    
    // Business Admin - use their own tenant
    if (window.currentUser.role === 'business_admin') {
        return window.currentUser.tenantId;
    }
    
    // Manager/Staff - inherit from parent
    return window.currentUser.tenantId;
}

function setCurrentTenant(tenantId) {
    if (window.setCurrentTenantIdValue) {
        window.setCurrentTenantIdValue(tenantId);
    }
    localStorage.setItem('ezcubic_selected_tenant', tenantId || '');
    
    // Reload data for this tenant
    loadCurrentTenantData();
    
    // Update UI
    updateTenantSelector();
    
    // Refresh dashboard if visible
    if (typeof updateDashboard === 'function') {
        updateDashboard();
    }
}

// ==================== TENANT SELECTOR UI ====================
function updateTenantSelector() {
    const container = document.getElementById('tenantSelectorContainer');
    if (!container) return;
    
    if (!window.currentUser || !['founder', 'erp_assistant'].includes(window.currentUser.role)) {
        container.style.display = 'none';
        return;
    }
    
    container.style.display = 'block';
    
    const tenants = getTenants();
    const tenantList = Object.values(tenants);
    const currentTenantId = window.getCurrentTenantIdValue ? window.getCurrentTenantIdValue() : null;
    
    container.innerHTML = `
        <div class="tenant-selector">
            <label style="font-size: 12px; color: #64748b; margin-right: 8px;">
                <i class="fas fa-building"></i> Viewing:
            </label>
            <select id="tenantSelect" class="form-control" style="width: auto; padding: 6px 12px; font-size: 13px;" onchange="handleTenantChange(this.value)">
                <option value="">All Businesses (Overview)</option>
                ${tenantList.map(t => `
                    <option value="${t.id}" ${currentTenantId === t.id ? 'selected' : ''}>
                        ${escapeHtml(t.businessName)}
                    </option>
                `).join('')}
            </select>
        </div>
    `;
}

function handleTenantChange(tenantId) {
    setCurrentTenant(tenantId || null);
    showToast(tenantId ? 'Switched to: ' + getTenantInfo(tenantId)?.businessName : 'Viewing all businesses', 'info');
}

// ==================== DATA BRIDGE ====================
// Connect tenant data to the global businessData object
function loadCurrentTenantData() {
    const tenantId = getCurrentTenantId();
    
    if (!tenantId && window.currentUser?.role !== 'founder') {
        console.warn('No tenant ID for current user');
        return;
    }
    
    if (tenantId) {
        const tenantData = loadTenantData(tenantId);
        
        // Map tenant data to global businessData
        if (window.businessData) {
            window.businessData.transactions = tenantData.transactions || [];
            window.businessData.bills = tenantData.bills || [];
            window.businessData.products = tenantData.products || [];
            window.businessData.customers = tenantData.customers || [];
            window.businessData.stockMovements = tenantData.stockMovements || [];
            window.businessData.sales = tenantData.sales || [];
            window.businessData.settings = { ...window.businessData.settings, ...tenantData.settings };
        }
        
        // Update global arrays
        if (typeof products !== 'undefined') window.products = tenantData.products || [];
        if (typeof customers !== 'undefined') window.customers = tenantData.customers || [];
        if (typeof stockMovements !== 'undefined') window.stockMovements = tenantData.stockMovements || [];
        if (typeof sales !== 'undefined') window.sales = tenantData.sales || [];
    }
    
    console.log('Loaded tenant data for:', tenantId);
}

function saveCurrentTenantData() {
    const tenantId = getCurrentTenantId();
    if (!tenantId) return;
    
    const tenantData = loadTenantData(tenantId);
    
    // Copy from global businessData
    if (window.businessData) {
        tenantData.transactions = window.businessData.transactions || [];
        tenantData.bills = window.businessData.bills || [];
        tenantData.products = window.businessData.products || [];
        tenantData.customers = window.businessData.customers || [];
        tenantData.stockMovements = window.businessData.stockMovements || [];
        tenantData.sales = window.businessData.sales || [];
        tenantData.settings = window.businessData.settings || {};
    }
    
    saveTenantData(tenantId, tenantData);
}

// Save to user's tenant (alias for saveCurrentTenantData)
function saveToUserTenant() {
    saveCurrentTenantData();
}

// ==================== USER-TENANT ASSIGNMENT ====================
function assignUserToTenant(userId, tenantId) {
    // Reload users
    if (typeof loadUsers === 'function') loadUsers();
    
    const userIndex = window.users?.findIndex(u => u.id === userId);
    if (userIndex === -1 || userIndex === undefined) return false;
    
    window.users[userIndex].tenantId = tenantId;
    
    if (typeof saveUsers === 'function') saveUsers();
    return true;
}

function getUserTenant(userId) {
    const user = window.users?.find(u => u.id === userId);
    return user?.tenantId || null;
}

// ==================== FOUNDER DASHBOARD ====================
function renderFounderDashboard() {
    const container = document.getElementById('founderDashboardContent');
    if (!container) return;
    
    const tenants = getTenants();
    const tenantList = Object.values(tenants);
    
    // Calculate stats across all tenants
    let totalRevenue = 0;
    let totalExpenses = 0;
    let totalTransactions = 0;
    let totalProducts = 0;
    let totalCustomers = 0;
    
    const businessStats = tenantList.map(tenant => {
        const data = loadTenantData(tenant.id);
        
        const revenue = (data.transactions || [])
            .filter(t => t.type === 'income')
            .reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);
            
        const expenses = (data.transactions || [])
            .filter(t => t.type === 'expense')
            .reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);
        
        totalRevenue += revenue;
        totalExpenses += expenses;
        totalTransactions += (data.transactions || []).length;
        totalProducts += (data.products || []).length;
        totalCustomers += (data.customers || []).length;
        
        return {
            ...tenant,
            revenue,
            expenses,
            profit: revenue - expenses,
            transactionCount: (data.transactions || []).length,
            productCount: (data.products || []).length,
            customerCount: (data.customers || []).length,
            lastActivity: data.updatedAt
        };
    });
    
    // Get users count
    const totalUsers = (window.users || []).length;
    const activeUsers = (window.users || []).filter(u => u.status === 'active').length;
    
    container.innerHTML = `
        <div class="founder-stats-grid">
            <div class="founder-stat-card primary">
                <div class="stat-icon"><i class="fas fa-building"></i></div>
                <div class="stat-content">
                    <div class="stat-value">${tenantList.length}</div>
                    <div class="stat-label">Total Businesses</div>
                </div>
            </div>
            <div class="founder-stat-card success">
                <div class="stat-icon"><i class="fas fa-users"></i></div>
                <div class="stat-content">
                    <div class="stat-value">${activeUsers}/${totalUsers}</div>
                    <div class="stat-label">Active Users</div>
                </div>
            </div>
            <div class="founder-stat-card info">
                <div class="stat-icon"><i class="fas fa-chart-line"></i></div>
                <div class="stat-content">
                    <div class="stat-value">RM ${formatNumber(totalRevenue)}</div>
                    <div class="stat-label">Total Platform Revenue</div>
                </div>
            </div>
            <div class="founder-stat-card warning">
                <div class="stat-icon"><i class="fas fa-exchange-alt"></i></div>
                <div class="stat-content">
                    <div class="stat-value">${totalTransactions}</div>
                    <div class="stat-label">Total Transactions</div>
                </div>
            </div>
        </div>
        
        <div class="founder-section">
            <div class="section-header">
                <h3><i class="fas fa-building"></i> Business Overview</h3>
                <button class="btn-primary btn-sm" onclick="showCreateBusinessModal()">
                    <i class="fas fa-plus"></i> Add Business
                </button>
            </div>
            
            ${tenantList.length === 0 ? `
                <div class="empty-state">
                    <i class="fas fa-store"></i>
                    <h4>No Businesses Yet</h4>
                    <p>Create a business to get started</p>
                    <button class="btn-primary" onclick="showCreateBusinessModal()">
                        <i class="fas fa-plus"></i> Create First Business
                    </button>
                </div>
            ` : `
                <div class="business-cards-grid">
                    ${businessStats.map(biz => `
                        <div class="business-card">
                            <div class="business-header">
                                <div class="business-icon" style="background: ${getBusinessColor(biz.id)}">
                                    <i class="fas fa-store"></i>
                                </div>
                                <div class="business-title">
                                    <h4>${escapeHtml(biz.businessName)}</h4>
                                    <span class="business-status ${biz.status}">${biz.status}</span>
                                </div>
                                <div class="business-actions">
                                    <button class="btn-icon" onclick="viewBusiness('${biz.id}')" title="View">
                                        <i class="fas fa-eye"></i>
                                    </button>
                                    <button class="btn-icon" onclick="editBusiness('${biz.id}')" title="Edit">
                                        <i class="fas fa-edit"></i>
                                    </button>
                                </div>
                            </div>
                            <div class="business-stats">
                                <div class="biz-stat">
                                    <span class="biz-stat-value income">RM ${formatNumber(biz.revenue)}</span>
                                    <span class="biz-stat-label">Revenue</span>
                                </div>
                                <div class="biz-stat">
                                    <span class="biz-stat-value expense">RM ${formatNumber(biz.expenses)}</span>
                                    <span class="biz-stat-label">Expenses</span>
                                </div>
                                <div class="biz-stat">
                                    <span class="biz-stat-value ${biz.profit >= 0 ? 'income' : 'expense'}">RM ${formatNumber(biz.profit)}</span>
                                    <span class="biz-stat-label">Profit</span>
                                </div>
                            </div>
                            <div class="business-meta">
                                <span><i class="fas fa-exchange-alt"></i> ${biz.transactionCount} transactions</span>
                                <span><i class="fas fa-box"></i> ${biz.productCount} products</span>
                                <span><i class="fas fa-users"></i> ${biz.customerCount} customers</span>
                            </div>
                            <div class="business-footer">
                                <small>Last activity: ${formatDate(biz.lastActivity)}</small>
                            </div>
                        </div>
                    `).join('')}
                </div>
            `}
        </div>
        
        <div class="founder-section">
            <div class="section-header">
                <h3><i class="fas fa-users"></i> Recent User Activity</h3>
            </div>
            <div class="activity-list">
                ${renderRecentSessions()}
            </div>
        </div>
    `;
}

function renderRecentSessions() {
    const sessions = JSON.parse(localStorage.getItem('ezcubic_sessions') || '[]');
    const recentSessions = sessions.slice(-10).reverse();
    
    if (recentSessions.length === 0) {
        return '<p style="color: #64748b; padding: 20px; text-align: center;">No recent activity</p>';
    }
    
    return recentSessions.map(session => {
        const user = (window.users || []).find(u => u.id === session.userId);
        return `
            <div class="activity-item">
                <div class="activity-icon ${session.action}">
                    <i class="fas fa-${session.action === 'login' ? 'sign-in-alt' : 'sign-out-alt'}"></i>
                </div>
                <div class="activity-content">
                    <strong>${user ? escapeHtml(user.name) : 'Unknown User'}</strong>
                    <span>${session.action === 'login' ? 'logged in' : 'logged out'}</span>
                </div>
                <div class="activity-time">
                    ${formatDateTime(session.timestamp)}
                </div>
            </div>
        `;
    }).join('');
}

// ==================== CREATE BUSINESS MODAL ====================
function showCreateBusinessModal() {
    document.getElementById('createBusinessModal')?.remove();
    
    const modalHTML = `
        <div class="modal show" id="createBusinessModal">
            <div class="modal-content" style="max-width: 500px;">
                <div class="modal-header">
                    <h3 class="modal-title"><i class="fas fa-building"></i> Create New Business</h3>
                    <button class="modal-close" onclick="closeModal('createBusinessModal')">&times;</button>
                </div>
                <form onsubmit="createNewBusiness(event)">
                    <div class="form-group">
                        <label class="form-label">Business Name *</label>
                        <input type="text" id="newBusinessName" class="form-control" required placeholder="Enter business name">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Assign Owner (Business Admin)</label>
                        <select id="newBusinessOwner" class="form-control">
                            <option value="">-- Create without owner --</option>
                            ${(window.users || [])
                                .filter(u => u.role === 'business_admin' && !u.tenantId)
                                .map(u => `<option value="${u.id}">${escapeHtml(u.name)} (${u.email})</option>`)
                                .join('')}
                        </select>
                        <small style="color: #64748b;">Only Business Admins without a business are shown</small>
                    </div>
                    <div class="form-group">
                        <label class="form-label">SSM Number</label>
                        <input type="text" id="newBusinessSSM" class="form-control" placeholder="e.g., 1234567-X">
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn-secondary" onclick="closeModal('createBusinessModal')">Cancel</button>
                        <button type="submit" class="btn-primary">
                            <i class="fas fa-plus"></i> Create Business
                        </button>
                    </div>
                </form>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

function createNewBusiness(event) {
    event.preventDefault();
    
    const name = document.getElementById('newBusinessName').value.trim();
    const ownerId = document.getElementById('newBusinessOwner').value;
    const ssm = document.getElementById('newBusinessSSM').value.trim();
    
    if (!name) {
        showToast('Please enter a business name', 'error');
        return;
    }
    
    // Create tenant
    const tenantId = createTenant(ownerId || null, name);
    
    // Update SSM if provided
    if (ssm) {
        const data = loadTenantData(tenantId);
        data.settings.ssmNumber = ssm;
        saveTenantData(tenantId, data);
    }
    
    // Assign owner if selected
    if (ownerId) {
        assignUserToTenant(ownerId, tenantId);
    }
    
    closeModal('createBusinessModal');
    renderFounderDashboard();
    showToast('Business created successfully!', 'success');
}

function viewBusiness(tenantId) {
    setCurrentTenant(tenantId);
    showSection('dashboard');
    showToast('Now viewing: ' + getTenantInfo(tenantId)?.businessName, 'info');
}

function editBusiness(tenantId) {
    const tenant = getTenantInfo(tenantId);
    if (!tenant) return;
    
    const data = loadTenantData(tenantId);
    
    document.getElementById('editBusinessModal')?.remove();
    
    const modalHTML = `
        <div class="modal show" id="editBusinessModal">
            <div class="modal-content" style="max-width: 500px;">
                <div class="modal-header">
                    <h3 class="modal-title"><i class="fas fa-edit"></i> Edit Business</h3>
                    <button class="modal-close" onclick="closeModal('editBusinessModal')">&times;</button>
                </div>
                <form onsubmit="updateBusiness(event, '${tenantId}')">
                    <div class="form-group">
                        <label class="form-label">Business Name *</label>
                        <input type="text" id="editBusinessName" class="form-control" required value="${escapeHtml(tenant.businessName)}">
                    </div>
                    <div class="form-group">
                        <label class="form-label">SSM Number</label>
                        <input type="text" id="editBusinessSSM" class="form-control" value="${escapeHtml(data.settings?.ssmNumber || '')}">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Status</label>
                        <select id="editBusinessStatus" class="form-control">
                            <option value="active" ${tenant.status === 'active' ? 'selected' : ''}>Active</option>
                            <option value="suspended" ${tenant.status === 'suspended' ? 'selected' : ''}>Suspended</option>
                            <option value="inactive" ${tenant.status === 'inactive' ? 'selected' : ''}>Inactive</option>
                        </select>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn-secondary" onclick="closeModal('editBusinessModal')">Cancel</button>
                        <button type="submit" class="btn-primary">
                            <i class="fas fa-save"></i> Save Changes
                        </button>
                    </div>
                </form>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

function updateBusiness(event, tenantId) {
    event.preventDefault();
    
    const name = document.getElementById('editBusinessName').value.trim();
    const ssm = document.getElementById('editBusinessSSM').value.trim();
    const status = document.getElementById('editBusinessStatus').value;
    
    // Update tenant info
    const tenants = getTenants();
    if (tenants[tenantId]) {
        tenants[tenantId].businessName = name;
        tenants[tenantId].status = status;
        saveTenants(tenants);
    }
    
    // Update tenant data
    const data = loadTenantData(tenantId);
    data.settings.businessName = name;
    data.settings.ssmNumber = ssm;
    saveTenantData(tenantId, data);
    
    closeModal('editBusinessModal');
    renderFounderDashboard();
    showToast('Business updated successfully!', 'success');
}

// ==================== HELPERS ====================
function formatNumber(num) {
    return (num || 0).toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDate(dateStr) {
    if (!dateStr) return 'Never';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatDateTime(dateStr) {
    if (!dateStr) return 'Never';
    const date = new Date(dateStr);
    return date.toLocaleString('en-MY', { 
        day: 'numeric', month: 'short', 
        hour: '2-digit', minute: '2-digit'
    });
}

function getBusinessColor(id) {
    const colors = ['#2563eb', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899'];
    const hash = id.split('').reduce((a, b) => a + b.charCodeAt(0), 0);
    return colors[hash % colors.length];
}

// ==================== INITIALIZE ====================
function initializeMultiTenant() {
    // Don't restore saved tenant here - let user login handle it
    // This prevents founder from seeing another user's data on page reload
    
    // Only restore if user is already logged in AND is not a founder
    if (window.currentUser && window.currentUser.role !== 'founder') {
        const savedTenant = localStorage.getItem('ezcubic_selected_tenant');
        if (savedTenant && window.setCurrentTenantIdValue) {
            window.setCurrentTenantIdValue(savedTenant);
        }
        loadCurrentTenantData();
    }
    // For founder, tenant will be set properly during updateAuthUI
}

// Clear tenant selection (used on logout or founder login)
function clearTenantSelection() {
    if (window.setCurrentTenantIdValue) {
        window.setCurrentTenantIdValue(null);
    }
    localStorage.removeItem('ezcubic_selected_tenant');
}

// ==================== AUTO CLOUD SYNC ====================
// Debounced auto-sync to cloud when data changes
let autoSyncTimer = null;
const AUTO_SYNC_DELAY = 5000; // 5 seconds after last change

function scheduleAutoCloudSync() {
    // Auto-sync for ALL logged-in users with a tenant
    // This ensures any team member's changes sync to cloud for their team
    const currentUser = window.currentUser;
    if (!currentUser || !currentUser.tenantId) {
        return; // Must be logged in with a tenant
    }
    
    // Clear previous timer
    if (autoSyncTimer) {
        clearTimeout(autoSyncTimer);
    }
    
    // Schedule new sync
    autoSyncTimer = setTimeout(async () => {
        try {
            if (typeof window.fullCloudSync === 'function') {
                console.log('☁️ Auto-syncing to cloud...');
                await window.fullCloudSync();
                console.log('☁️ Auto-sync complete!');
            } else {
                console.warn('⚠️ fullCloudSync not available');
            }
        } catch (err) {
            console.warn('⚠️ Auto-sync failed:', err);
        }
    }, AUTO_SYNC_DELAY);
}

// ==================== OVERRIDE SAVE DATA ====================
// Hook into the existing saveData function to also save tenant data
const originalSaveData = window.saveData;
window.saveData = function() {
    // Call original
    if (typeof originalSaveData === 'function') {
        originalSaveData();
    }
    
    // Also save to tenant
    saveCurrentTenantData();
    
    // Schedule auto cloud sync (debounced)
    scheduleAutoCloudSync();
};

// ==================== EXPORTS ====================
window.getCurrentTenantId = getCurrentTenantId;
window.setCurrentTenant = setCurrentTenant;
window.updateTenantSelector = updateTenantSelector;
window.handleTenantChange = handleTenantChange;
window.loadCurrentTenantData = loadCurrentTenantData;
window.saveCurrentTenantData = saveCurrentTenantData;
window.saveToUserTenant = saveToUserTenant;
window.assignUserToTenant = assignUserToTenant;
window.getUserTenant = getUserTenant;
window.renderFounderDashboard = renderFounderDashboard;
window.renderRecentSessions = renderRecentSessions;
window.showCreateBusinessModal = showCreateBusinessModal;
window.createNewBusiness = createNewBusiness;
window.viewBusiness = viewBusiness;
window.editBusiness = editBusiness;
window.updateBusiness = updateBusiness;
window.formatNumber = formatNumber;
window.formatDate = formatDate;
window.formatDateTime = formatDateTime;
window.getBusinessColor = getBusinessColor;
window.initializeMultiTenant = initializeMultiTenant;
window.clearTenantSelection = clearTenantSelection;
window.scheduleAutoCloudSync = scheduleAutoCloudSync;

// Initialize when DOM ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeMultiTenant);
} else {
    initializeMultiTenant();
}
