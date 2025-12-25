/**
 * EZCubic - Platform UI Advanced
 * Plan editor, feature management, access control, and cloud sync
 * Split from platform-control.js v2.2.6 - 22 Jan 2025
 */

// ==================== EDIT PLAN FEATURES MODAL ====================
function showEditPlanFeaturesModal() {
    const settings = getPlatformSettings();
    
    document.getElementById('editPlanFeaturesModal')?.remove();
    
    const allFeatures = [
        { id: 'dashboard', name: 'Dashboard', category: 'Core' },
        { id: 'transactions', name: 'Transactions', category: 'Finance' },
        { id: 'income', name: 'Record Income', category: 'Finance' },
        { id: 'expenses', name: 'Record Expenses', category: 'Finance' },
        { id: 'bills', name: 'Bills', category: 'Finance' },
        { id: 'reports', name: 'Reports', category: 'Finance' },
        { id: 'taxes', name: 'Taxes', category: 'Finance' },
        { id: 'balance', name: 'Balance Sheet', category: 'Finance' },
        { id: 'monthly-reports', name: 'Monthly Reports', category: 'Finance' },
        { id: 'bank-reconciliation', name: 'Bank Reconciliation', category: 'Finance' },
        { id: 'lhdn-export', name: 'LHDN & Audit Export', category: 'Finance' },
        { id: 'chart-of-accounts', name: 'Chart of Accounts', category: 'Accounting' },
        { id: 'journal-entries', name: 'Journal Entries', category: 'Accounting' },
        { id: 'aging-reports', name: 'AR/AP Aging Reports', category: 'Accounting' },
        { id: 'pos', name: 'Point of Sale', category: 'Sales' },
        { id: 'quotations', name: 'Quotations', category: 'Sales' },
        { id: 'invoices', name: 'Invoices', category: 'Sales' },
        { id: 'orders', name: 'Orders', category: 'Sales' },
        { id: 'crm', name: 'CRM / Customers', category: 'Sales' },
        { id: 'einvoice', name: 'e-Invoice', category: 'Sales' },
        { id: 'email-invoice', name: 'Invoice/Receipt', category: 'Sales' },
        { id: 'inventory', name: 'Inventory', category: 'Stock' },
        { id: 'stock', name: 'Stock Management', category: 'Stock' },
        { id: 'suppliers', name: 'Suppliers', category: 'Purchasing' },
        { id: 'purchase-orders', name: 'Purchase Orders', category: 'Purchasing' },
        { id: 'delivery-orders', name: 'Delivery Orders', category: 'Purchasing' },
        { id: 'employees', name: 'Employees', category: 'HR' },
        { id: 'payroll', name: 'Payroll', category: 'HR' },
        { id: 'leave-attendance', name: 'Leave & Attendance', category: 'HR' },
        { id: 'kpi', name: 'KPI & Performance', category: 'HR' },
        { id: 'projects', name: 'Projects', category: 'Operations' },
        { id: 'branches', name: 'Multi-Branch', category: 'Admin' },
        { id: 'settings', name: 'Settings', category: 'Admin' },
        { id: 'users', name: 'User Management', category: 'Admin' },
        { id: 'backup-restore', name: 'Backup & Restore', category: 'Admin' },
        { id: 'ai-chatbot', name: 'AI Assistant', category: 'AI' }
    ];
    
    // Group features by category
    const categories = {};
    allFeatures.forEach(f => {
        if (!categories[f.category]) categories[f.category] = [];
        categories[f.category].push(f);
    });
    
    const modalHTML = `
        <div class="modal show" id="editPlanFeaturesModal" style="z-index: 10001;">
            <div class="modal-content" style="max-width: 900px; max-height: 90vh; overflow: hidden; display: flex; flex-direction: column;">
                <div class="modal-header" style="background: linear-gradient(135deg, #2563eb, #1d4ed8); color: white;">
                    <h3 class="modal-title"><i class="fas fa-key"></i> Edit Plan Feature Access</h3>
                    <button class="modal-close" onclick="closeModal('editPlanFeaturesModal')" style="color: white;">&times;</button>
                </div>
                <div style="padding: 20px; overflow-y: auto; flex: 1;">
                    <p style="margin-bottom: 15px; color: #64748b; font-size: 13px;">
                        <i class="fas fa-info-circle"></i> Check/uncheck features for each plan. Users signing up will automatically get these permissions.
                    </p>
                    
                    <div style="overflow-x: auto;">
                        <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
                            <thead>
                                <tr style="background: #f1f5f9; position: sticky; top: 0;">
                                    <th style="padding: 12px; text-align: left; border-bottom: 2px solid #e2e8f0; min-width: 150px;">Feature</th>
                                    ${Object.entries(settings.plans).map(([planId, plan]) => `
                                        <th style="padding: 12px; text-align: center; border-bottom: 2px solid #e2e8f0; min-width: 100px;">
                                            <div style="color: ${plan.color}; font-weight: 600;">${plan.name}</div>
                                            <label style="display: flex; align-items: center; justify-content: center; gap: 5px; margin-top: 5px; cursor: pointer; font-size: 11px; color: #64748b;">
                                                <input type="checkbox" id="allFeatures_${planId}" onchange="toggleAllPlanFeatures('${planId}', this.checked)"
                                                    ${plan.features.includes('all') ? 'checked' : ''}>
                                                All
                                            </label>
                                        </th>
                                    `).join('')}
                                </tr>
                            </thead>
                            <tbody>
                                ${Object.entries(categories).map(([catName, features]) => `
                                    <tr style="background: #f8fafc;">
                                        <td colspan="${Object.keys(settings.plans).length + 1}" style="padding: 8px 12px; font-weight: 600; color: #475569;">
                                            <i class="fas fa-folder"></i> ${catName}
                                        </td>
                                    </tr>
                                    ${features.map(feature => `
                                        <tr style="border-bottom: 1px solid #e2e8f0;">
                                            <td style="padding: 10px 12px; padding-left: 24px;">${feature.name}</td>
                                            ${Object.entries(settings.plans).map(([planId, plan]) => {
                                                const hasAccess = plan.features.includes('all') || plan.features.includes(feature.id);
                                                return `
                                                    <td style="padding: 10px 12px; text-align: center;">
                                                        <input type="checkbox" 
                                                            class="feature-checkbox feature-${planId}"
                                                            data-plan="${planId}" 
                                                            data-feature="${feature.id}"
                                                            ${hasAccess ? 'checked' : ''}
                                                            ${plan.features.includes('all') ? 'disabled' : ''}
                                                            onchange="updateFeatureCheckbox('${planId}')"
                                                            style="width: 18px; height: 18px; cursor: pointer;">
                                                    </td>
                                                `;
                                            }).join('')}
                                        </tr>
                                    `).join('')}
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
                <div class="modal-footer" style="border-top: 1px solid #e2e8f0; padding: 15px 20px;">
                    <button class="btn-secondary" onclick="closeModal('editPlanFeaturesModal')">Cancel</button>
                    <button class="btn-primary" onclick="savePlanFeatures()">
                        <i class="fas fa-save"></i> Save Changes
                    </button>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

function toggleAllPlanFeatures(planId, checked) {
    const checkboxes = document.querySelectorAll(`.feature-${planId}`);
    checkboxes.forEach(cb => {
        cb.checked = checked;
        cb.disabled = checked;
    });
}

function updateFeatureCheckbox(planId) {
    // Uncheck "All" if any individual feature is unchecked
    const allCheckbox = document.getElementById(`allFeatures_${planId}`);
    const featureCheckboxes = document.querySelectorAll(`.feature-${planId}`);
    const allChecked = Array.from(featureCheckboxes).every(cb => cb.checked);
    
    if (allCheckbox && !allChecked) {
        allCheckbox.checked = false;
        featureCheckboxes.forEach(cb => cb.disabled = false);
    }
}

function savePlanFeatures() {
    const settings = getPlatformSettings();
    
    Object.keys(settings.plans).forEach(planId => {
        const allCheckbox = document.getElementById(`allFeatures_${planId}`);
        
        if (allCheckbox && allCheckbox.checked) {
            settings.plans[planId].features = ['all'];
        } else {
            const checkedFeatures = [];
            document.querySelectorAll(`.feature-${planId}:checked`).forEach(cb => {
                checkedFeatures.push(cb.dataset.feature);
            });
            settings.plans[planId].features = checkedFeatures;
        }
        
        // Update hiddenSections based on unchecked features
        const allFeatureIds = ['dashboard', 'transactions', 'income', 'expenses', 'bills', 'reports', 'taxes', 
            'balance', 'monthly-reports', 'bank-reconciliation', 'lhdn-export',
            'chart-of-accounts', 'journal-entries', 'aging-reports',
            'pos', 'quotations', 'orders', 'crm', 'einvoice', 'email-invoice',
            'inventory', 'stock', 'suppliers', 'purchase-orders', 'delivery-orders',
            'employees', 'payroll', 'leave-attendance', 'kpi',
            'projects', 'branches', 'settings', 'users', 'backup-restore', 'ai-chatbot'];
        
        if (!settings.plans[planId].features.includes('all')) {
            settings.plans[planId].hiddenSections = allFeatureIds.filter(f => !settings.plans[planId].features.includes(f));
        } else {
            settings.plans[planId].hiddenSections = [];
        }
    });
    
    savePlatformSettings(settings);
    
    // Sync plan features to all users on each plan
    syncPlanFeaturesToUsers();
    
    closeModal('editPlanFeaturesModal');
    renderPlatformControl();
    showToast('Plan features updated and synced to all users!', 'success');
}

/**
 * Sync plan features to all users on that plan
 */
function syncPlanFeaturesToUsers() {
    const settings = getPlatformSettings();
    const allUsers = JSON.parse(localStorage.getItem('ezcubic_users') || '[]');
    let syncCount = 0;
    
    allUsers.forEach(user => {
        // Sync Business Admin users
        if (user.role === 'business_admin' && user.plan) {
            const plan = settings.plans[user.plan];
            if (plan) {
                const oldPermissions = user.permissions ? [...user.permissions] : [];
                const newPermissions = plan.features.includes('all') ? ['all'] : [...plan.features];
                
                user.permissions = newPermissions;
                
                const oldSorted = oldPermissions.sort().join(',');
                const newSorted = newPermissions.sort().join(',');
                if (oldSorted !== newSorted) {
                    syncCount++;
                    user.updatedAt = new Date().toISOString();
                    console.log(`✓ Synced Business Admin ${user.email} to ${user.plan} plan:`, user.permissions);
                }
            }
        }
        
        // Sync Staff/Manager
        if (['staff', 'manager'].includes(user.role) && user.tenantId) {
            const owner = allUsers.find(u => 
                u.tenantId === user.tenantId && 
                (u.role === 'business_admin' || u.role === 'founder')
            );
            
            if (owner && owner.plan) {
                const ownerPlan = settings.plans[owner.plan];
                if (ownerPlan) {
                    const ownerFeatures = ownerPlan.features;
                    
                    if (user.permissions && user.permissions.includes('all')) {
                        // Keep all access
                    } else if (!ownerFeatures.includes('all')) {
                        const staffPerms = user.permissions || [];
                        const newFeaturesInPlan = ownerFeatures.filter(f => !staffPerms.includes(f));
                        
                        if (newFeaturesInPlan.length > 0) {
                            user.permissions = [...new Set([...staffPerms, ...newFeaturesInPlan])];
                            syncCount++;
                            user.updatedAt = new Date().toISOString();
                            console.log(`✓ Added new features to ${user.role} ${user.email}:`, newFeaturesInPlan);
                        }
                        
                        const invalidFeatures = staffPerms.filter(p => !ownerFeatures.includes(p));
                        if (invalidFeatures.length > 0) {
                            user.permissions = user.permissions.filter(p => ownerFeatures.includes(p));
                            console.log(`✗ Removed features from ${user.email} (not in plan):`, invalidFeatures);
                        }
                    }
                }
            }
        }
    });
    
    localStorage.setItem('ezcubic_users', JSON.stringify(allUsers));
    
    // Update current user if affected
    const currentUserKey = localStorage.getItem('ezcubic_current_user');
    if (currentUserKey) {
        const currentUserData = JSON.parse(currentUserKey);
        const updatedCurrentUser = allUsers.find(u => u.id === currentUserData.id);
        if (updatedCurrentUser) {
            localStorage.setItem('ezcubic_current_user', JSON.stringify(updatedCurrentUser));
            if (window.currentUser) {
                window.currentUser = updatedCurrentUser;
            }
        }
    }
    
    if (syncCount > 0) {
        console.log(`🔄 Plan sync complete: ${syncCount} users updated`);
    }
    return syncCount;
}

// ==================== PRICING PLAN EDITOR ====================
function showEditPlanModal(planId) {
    const settings = getPlatformSettings();
    const plan = settings.plans[planId];
    if (!plan) return;
    
    document.getElementById('editPlanModal')?.remove();
    
    const modalHTML = `
        <div class="modal show" id="editPlanModal">
            <div class="modal-content" style="max-width: 600px;">
                <div class="modal-header">
                    <h3 class="modal-title"><i class="fas fa-edit"></i> Edit Plan: ${plan.name}</h3>
                    <button class="modal-close" onclick="closeModal('editPlanModal')">&times;</button>
                </div>
                <form onsubmit="savePlanChanges(event, '${planId}')">
                    <div class="form-grid">
                        <div class="form-group">
                            <label class="form-label">Plan Name *</label>
                            <input type="text" id="editPlanName" class="form-control" value="${typeof escapeHtml === 'function' ? escapeHtml(plan.name) : plan.name}" required>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Price (RM/month) *</label>
                            <input type="number" id="editPlanPrice" class="form-control" value="${plan.price}" min="0" step="1" required>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Color</label>
                            <input type="color" id="editPlanColor" class="form-control" value="${plan.color}" style="height: 40px;">
                        </div>
                        <div class="form-group">
                            <label class="form-label">Plan ID</label>
                            <input type="text" class="form-control" value="${planId}" disabled>
                        </div>
                    </div>
                    
                    <h4 style="margin: 20px 0 10px; color: #475569;"><i class="fas fa-sliders-h"></i> Usage Limits</h4>
                    <p style="font-size: 12px; color: #94a3b8; margin-bottom: 15px;">Set to -1 for unlimited</p>
                    
                    <div class="form-grid" style="grid-template-columns: repeat(3, 1fr);">
                        <div class="form-group">
                            <label class="form-label">Transactions</label>
                            <input type="number" id="editLimitTransactions" class="form-control" value="${plan.limits.transactions}" min="-1">
                        </div>
                        <div class="form-group">
                            <label class="form-label">Products</label>
                            <input type="number" id="editLimitProducts" class="form-control" value="${plan.limits.products}" min="-1">
                        </div>
                        <div class="form-group">
                            <label class="form-label">Customers</label>
                            <input type="number" id="editLimitCustomers" class="form-control" value="${plan.limits.customers}" min="-1">
                        </div>
                        <div class="form-group">
                            <label class="form-label">Users</label>
                            <input type="number" id="editLimitUsers" class="form-control" value="${plan.limits.users}" min="-1">
                        </div>
                        <div class="form-group">
                            <label class="form-label">Branches</label>
                            <input type="number" id="editLimitBranches" class="form-control" value="${plan.limits.branches}" min="-1">
                        </div>
                        <div class="form-group">
                            <label class="form-label">Storage (MB)</label>
                            <input type="number" id="editLimitStorage" class="form-control" value="${plan.limits.storage}" min="-1">
                        </div>
                    </div>
                    
                    <div class="modal-footer">
                        <button type="button" class="btn-secondary" onclick="closeModal('editPlanModal')">Cancel</button>
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

function showAddPlanModal() {
    document.getElementById('addPlanModal')?.remove();
    
    const modalHTML = `
        <div class="modal show" id="addPlanModal">
            <div class="modal-content" style="max-width: 600px;">
                <div class="modal-header">
                    <h3 class="modal-title"><i class="fas fa-plus"></i> Add New Plan</h3>
                    <button class="modal-close" onclick="closeModal('addPlanModal')">&times;</button>
                </div>
                <form onsubmit="savePlanChanges(event, null)">
                    <div class="form-grid">
                        <div class="form-group">
                            <label class="form-label">Plan ID *</label>
                            <input type="text" id="newPlanId" class="form-control" placeholder="e.g., premium" required pattern="[a-z_]+" title="Lowercase letters and underscores only">
                        </div>
                        <div class="form-group">
                            <label class="form-label">Plan Name *</label>
                            <input type="text" id="editPlanName" class="form-control" placeholder="e.g., Premium" required>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Price (RM/month) *</label>
                            <input type="number" id="editPlanPrice" class="form-control" value="99" min="0" step="1" required>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Color</label>
                            <input type="color" id="editPlanColor" class="form-control" value="#6366f1" style="height: 40px;">
                        </div>
                    </div>
                    
                    <h4 style="margin: 20px 0 10px; color: #475569;"><i class="fas fa-sliders-h"></i> Usage Limits</h4>
                    <p style="font-size: 12px; color: #94a3b8; margin-bottom: 15px;">Set to -1 for unlimited</p>
                    
                    <div class="form-grid" style="grid-template-columns: repeat(3, 1fr);">
                        <div class="form-group">
                            <label class="form-label">Transactions</label>
                            <input type="number" id="editLimitTransactions" class="form-control" value="1000" min="-1">
                        </div>
                        <div class="form-group">
                            <label class="form-label">Products</label>
                            <input type="number" id="editLimitProducts" class="form-control" value="500" min="-1">
                        </div>
                        <div class="form-group">
                            <label class="form-label">Customers</label>
                            <input type="number" id="editLimitCustomers" class="form-control" value="500" min="-1">
                        </div>
                        <div class="form-group">
                            <label class="form-label">Users</label>
                            <input type="number" id="editLimitUsers" class="form-control" value="5" min="-1">
                        </div>
                        <div class="form-group">
                            <label class="form-label">Branches</label>
                            <input type="number" id="editLimitBranches" class="form-control" value="2" min="-1">
                        </div>
                        <div class="form-group">
                            <label class="form-label">Storage (MB)</label>
                            <input type="number" id="editLimitStorage" class="form-control" value="1000" min="-1">
                        </div>
                    </div>
                    
                    <div class="modal-footer">
                        <button type="button" class="btn-secondary" onclick="closeModal('addPlanModal')">Cancel</button>
                        <button type="submit" class="btn-primary">
                            <i class="fas fa-plus"></i> Create Plan
                        </button>
                    </div>
                </form>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

function savePlanChanges(event, planId) {
    event.preventDefault();
    
    const settings = getPlatformSettings();
    
    // If no planId, this is a new plan
    if (!planId) {
        planId = document.getElementById('newPlanId').value.toLowerCase().replace(/[^a-z_]/g, '');
        if (settings.plans[planId]) {
            showToast('Plan ID already exists!', 'error');
            return;
        }
    }
    
    const planData = {
        name: document.getElementById('editPlanName').value.trim(),
        price: parseInt(document.getElementById('editPlanPrice').value) || 0,
        color: document.getElementById('editPlanColor').value,
        limits: {
            transactions: parseInt(document.getElementById('editLimitTransactions').value),
            products: parseInt(document.getElementById('editLimitProducts').value),
            customers: parseInt(document.getElementById('editLimitCustomers').value),
            users: parseInt(document.getElementById('editLimitUsers').value),
            branches: parseInt(document.getElementById('editLimitBranches').value),
            storage: parseInt(document.getElementById('editLimitStorage').value)
        },
        features: settings.plans[planId]?.features || ['all']
    };
    
    settings.plans[planId] = planData;
    savePlatformSettings(settings);
    
    closeModal('editPlanModal');
    closeModal('addPlanModal');
    renderPlatformControl();
    
    showToast(`Plan "${planData.name}" saved successfully!`, 'success');
}

function deletePlan(planId) {
    const settings = getPlatformSettings();
    const plan = settings.plans[planId];
    
    if (!plan) return;
    
    // Check if any subscriptions use this plan
    const subs = getSubscriptions();
    const usingPlan = Object.values(subs).filter(s => s.plan === planId).length;
    
    if (usingPlan > 0) {
        showToast(`Cannot delete: ${usingPlan} subscription(s) are using this plan. Change their plans first.`, 'error');
        return;
    }
    
    if (!confirm(`Are you sure you want to delete the "${plan.name}" plan?`)) return;
    
    delete settings.plans[planId];
    savePlatformSettings(settings);
    
    renderPlatformControl();
    showToast(`Plan "${plan.name}" deleted!`, 'success');
}

// ==================== PLAN-BASED FEATURE ACCESS CONTROL ====================
function applyPlanRestrictions() {
    const currentUser = JSON.parse(localStorage.getItem('ezcubic_current_user') || '{}');
    const tenantId = currentUser.tenantId || localStorage.getItem('ezcubic_tenant_id');
    
    // Skip for personal users
    if (currentUser.role === 'personal') {
        console.log('applyPlanRestrictions: Skipping for personal user');
        if (typeof applyUserPermissions === 'function') {
            applyUserPermissions();
        }
        return;
    }
    
    // Founders and ERP Assistants bypass restrictions
    if (currentUser.role === 'founder' || currentUser.role === 'erp_assistant') {
        showAllNavItems();
        return;
    }
    
    if (!tenantId) {
        showAllNavItems();
        return;
    }
    
    const subscription = getSubscription(tenantId);
    if (!subscription) {
        applyFeatureRestrictions('personal');
        return;
    }
    
    applyFeatureRestrictions(subscription.plan);
}

function applyFeatureRestrictions(planId) {
    if (window.currentUser && window.currentUser.role === 'personal') {
        console.log('Skipping applyFeatureRestrictions for personal user');
        return;
    }
    
    const settings = getPlatformSettings();
    const plan = settings.plans[planId];
    
    if (!plan) {
        showAllNavItems();
        return;
    }
    
    const hiddenSections = plan.hiddenSections || [];
    
    const sectionMap = {
        'pos': "showSection('pos')",
        'inventory': "showSection('inventory')",
        'stock': "showSection('stock')",
        'orders': "showSection('orders')",
        'crm': "showSection('crm')",
        'customers': "showSection('customers')",
        'suppliers': "showSection('suppliers')",
        'quotations': "showSection('quotations')",
        'invoices': "showSection('invoices')",
        'projects': "showSection('projects')",
        'payroll': "showSection('payroll')",
        'leave-attendance': "showSection('leave-attendance')",
        'einvoice': "showSection('einvoice')",
        'branches': "showSection('branches')",
        'user-management': "showSection('user-management')"
    };
    
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.style.display = '';
    });
    
    hiddenSections.forEach(sectionId => {
        const selector = sectionMap[sectionId];
        if (selector) {
            const btn = document.querySelector(`.nav-btn[onclick="${selector}"]`);
            if (btn) {
                btn.style.display = 'none';
            }
        }
    });
    
    hideEmptyNavSeparators();
    
    if (hiddenSections.length > 0) {
        showPlanBadge(plan.name, plan.color);
    }
}

function showAllNavItems() {
    const currentUser = window.currentUser || JSON.parse(localStorage.getItem('ezcubic_current_user') || '{}');
    if (currentUser.role === 'personal') {
        console.log('showAllNavItems: Skipping for personal user');
        if (typeof applyUserPermissions === 'function') {
            applyUserPermissions();
        }
        return;
    }
    
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.style.display = '';
    });
    document.querySelectorAll('.nav-separator').forEach(sep => {
        sep.style.display = '';
    });
    const badge = document.getElementById('currentPlanBadge');
    if (badge) badge.remove();
}

function hideEmptyNavSeparators() {
    const separators = document.querySelectorAll('.nav-separator');
    
    separators.forEach(separator => {
        let nextEl = separator.nextElementSibling;
        let hasVisibleButton = false;
        
        while (nextEl && !nextEl.classList.contains('nav-separator')) {
            if (nextEl.classList.contains('nav-btn') && nextEl.style.display !== 'none') {
                hasVisibleButton = true;
                break;
            }
            nextEl = nextEl.nextElementSibling;
        }
        
        separator.style.display = hasVisibleButton ? '' : 'none';
    });
}

function showPlanBadge(planName, planColor) {
    const existingBadge = document.getElementById('currentPlanBadge');
    if (existingBadge) existingBadge.remove();
    
    const navHeader = document.querySelector('.nav-header');
    if (navHeader) {
        const badge = document.createElement('div');
        badge.id = 'currentPlanBadge';
        badge.innerHTML = `
            <div style="padding: 8px 15px; background: ${planColor}15; border: 1px solid ${planColor}40; border-radius: 8px; margin: 10px 15px; text-align: center;">
                <span style="font-size: 11px; color: ${planColor}; font-weight: 600;">${planName.toUpperCase()} PLAN</span>
                <a href="#" onclick="showUpgradeModal(); return false;" style="display: block; font-size: 10px; color: #2563eb; margin-top: 3px;">Upgrade for more features</a>
            </div>
        `;
        navHeader.appendChild(badge);
    }
}

function showUpgradeModal() {
    showUpgradePlanModal();
}

function showUpgradePlanModal() {
    const settings = getPlatformSettings();
    const plans = settings.plans;
    
    const currentUser = JSON.parse(localStorage.getItem('ezcubic_current_user') || '{}');
    const tenantId = currentUser.tenantId || localStorage.getItem('ezcubic_tenant_id');
    const subscription = tenantId ? getSubscription(tenantId) : null;
    const currentPlan = subscription?.plan || 'personal';
    
    document.getElementById('upgradeModal')?.remove();
    
    let plansHTML = '';
    Object.entries(plans).forEach(([id, plan]) => {
        const isCurrent = id === currentPlan;
        const isUpgrade = plan.price > (plans[currentPlan]?.price || 0);
        
        plansHTML += `
            <div class="upgrade-plan-card" style="border: 2px solid ${isCurrent ? plan.color : '#e2e8f0'}; border-radius: 12px; padding: 20px; text-align: center; ${isCurrent ? `background: ${plan.color}10;` : ''}">
                <h4 style="color: ${plan.color}; margin: 0 0 5px;">${plan.name}</h4>
                <p style="font-size: 12px; color: #64748b; margin: 0 0 15px;">${plan.description || ''}</p>
                <div style="font-size: 28px; font-weight: bold; margin-bottom: 10px;">
                    ${plan.price === 0 ? 'Free' : `RM ${plan.price}`}
                    ${plan.price > 0 ? '<span style="font-size: 12px; font-weight: normal;">/mo</span>' : ''}
                </div>
                <ul style="text-align: left; font-size: 12px; color: #475569; padding-left: 20px; margin-bottom: 15px;">
                    <li>Up to ${plan.limits.transactions === -1 ? 'Unlimited' : plan.limits.transactions} transactions</li>
                    <li>Up to ${plan.limits.products === -1 ? 'Unlimited' : plan.limits.products} products</li>
                    <li>Up to ${plan.limits.users === -1 ? 'Unlimited' : plan.limits.users} users</li>
                    <li>${plan.limits.branches === -1 ? 'Unlimited' : plan.limits.branches} branch(es)</li>
                </ul>
                ${isCurrent 
                    ? '<span style="color: #10b981; font-weight: 600;"><i class="fas fa-check-circle"></i> Current Plan</span>'
                    : isUpgrade 
                        ? `<button class="btn-primary" style="width: 100%;" onclick="requestUpgrade('${id}')">Upgrade Now</button>`
                        : `<button class="btn-outline" style="width: 100%;" onclick="requestDowngrade('${id}')">Downgrade</button>`
                }
            </div>
        `;
    });
    
    const modalHTML = `
        <div class="modal show" id="upgradeModal">
            <div class="modal-content" style="max-width: 900px;">
                <div class="modal-header">
                    <h3 class="modal-title"><i class="fas fa-rocket"></i> Upgrade Your Plan</h3>
                    <button class="modal-close" onclick="closeModal('upgradeModal')">&times;</button>
                </div>
                <p style="color: #64748b; margin-bottom: 20px;">Choose a plan that fits your business needs</p>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px;">
                    ${plansHTML}
                </div>
                <div style="margin-top: 20px; padding: 15px; background: #f8fafc; border-radius: 8px; text-align: center;">
                    <p style="margin: 0; color: #64748b; font-size: 13px;">
                        <i class="fas fa-info-circle"></i> Need help choosing? Contact us at <a href="mailto:support@ezcubic.com">support@ezcubic.com</a>
                    </p>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

function requestUpgrade(planId) {
    const settings = getPlatformSettings();
    const plan = settings.plans[planId];
    
    if (!plan) return;
    
    if (confirm(`Upgrade to ${plan.name} plan for RM ${plan.price}/month?\n\nNote: In production, this would redirect to payment.`)) {
        const currentUser = JSON.parse(localStorage.getItem('ezcubic_current_user') || '{}');
        const tenantId = currentUser.tenantId || localStorage.getItem('ezcubic_tenant_id');
        
        if (tenantId) {
            updateSubscription(tenantId, { plan: planId });
            closeModal('upgradeModal');
            applyPlanRestrictions();
            showToast(`Upgraded to ${plan.name} plan!`, 'success');
        }
    }
}

function requestDowngrade(planId) {
    const settings = getPlatformSettings();
    const plan = settings.plans[planId];
    
    if (!plan) return;
    
    if (confirm(`Downgrade to ${plan.name} plan?\n\nNote: Some features may become unavailable.`)) {
        const currentUser = JSON.parse(localStorage.getItem('ezcubic_current_user') || '{}');
        const tenantId = currentUser.tenantId || localStorage.getItem('ezcubic_tenant_id');
        
        if (tenantId) {
            updateSubscription(tenantId, { plan: planId });
            closeModal('upgradeModal');
            applyPlanRestrictions();
            showToast(`Changed to ${plan.name} plan`, 'info');
        }
    }
}

// ==================== COMPANY CODE HELPERS ====================
function generateCompanyCodeForTenant(tenantId) {
    const tenants = JSON.parse(localStorage.getItem('ezcubic_tenants') || '{}');
    const tenant = tenants[tenantId];
    
    if (!tenant) return null;
    
    if (!tenant.companyCode) {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        let code = '';
        for (let i = 0; i < 4; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        tenant.companyCode = code + '-' + Date.now().toString(36).toUpperCase().slice(-4);
        tenants[tenantId] = tenant;
        localStorage.setItem('ezcubic_tenants', JSON.stringify(tenants));
        console.log('🏢 Generated Company Code for', tenantId, ':', tenant.companyCode);
    }
    
    return tenant.companyCode;
}

function copyTenantCompanyCode(code) {
    if (!code || code === 'N/A') {
        showToast('No Company Code available', 'warning');
        return;
    }
    
    navigator.clipboard.writeText(code).then(() => {
        showToast('📋 Company Code copied: ' + code, 'success');
    }).catch(() => {
        const textarea = document.createElement('textarea');
        textarea.value = code;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        showToast('📋 Company Code copied: ' + code, 'success');
    });
}

// ==================== CLOUD SYNC ====================
async function refreshPlatformFromCloud() {
    const btn = document.getElementById('platformRefreshBtn');
    const originalHTML = btn ? btn.innerHTML : '';
    
    if (btn) {
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Syncing...';
        btn.disabled = true;
    }
    
    try {
        if (typeof window.mobileDownloadFromCloud === 'function') {
            await window.mobileDownloadFromCloud();
        } else if (typeof window.downloadUsersFromCloud === 'function') {
            await window.downloadUsersFromCloud();
        }
        
        renderPlatformControl();
        
        const timestampEl = document.getElementById('platformLastSync');
        if (timestampEl) {
            timestampEl.textContent = new Date().toLocaleTimeString();
        }
        
        showToast('✅ Platform data synced from cloud!', 'success');
    } catch (err) {
        console.error('Platform sync failed:', err);
        showToast('❌ Sync failed: ' + err.message, 'error');
    } finally {
        if (btn) {
            btn.innerHTML = originalHTML;
            btn.disabled = false;
        }
    }
}

async function downloadUsersFromCloud() {
    let retries = 0;
    while (!window.supabase?.createClient && retries < 10) {
        await new Promise(r => setTimeout(r, 300));
        retries++;
    }
    
    if (!window.supabase?.createClient) {
        throw new Error('Cloud service not ready');
    }
    
    const client = typeof getUsersSupabaseClient === 'function' ? 
        getUsersSupabaseClient() : 
        window.supabase.createClient(
            'https://txjfdxnpasxtwfajhpla.supabase.co',
            'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR4amZkeG5wYXN4dHdmYWpocGxhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY2MDM1MjcsImV4cCI6MjA2MjE3OTUyN30.wIYDhXETCPgN__J1bJ36cJmBHYr22F1f44K3VTVEgnY'
        );
    
    const { data, error } = await client.from('tenant_data')
        .select('*')
        .eq('tenant_id', 'global');
    
    if (error) throw error;
    
    for (const record of data || []) {
        if (record.data_key === 'ezcubic_users' && record.data?.value) {
            const cloudUsers = record.data.value;
            const localUsers = JSON.parse(localStorage.getItem('ezcubic_users') || '[]');
            
            const mergedUsers = [...localUsers];
            cloudUsers.forEach(cloudUser => {
                const localIdx = mergedUsers.findIndex(u => u.id === cloudUser.id);
                if (localIdx >= 0) {
                    const localUpdated = new Date(mergedUsers[localIdx].updatedAt || 0);
                    const cloudUpdated = new Date(cloudUser.updatedAt || 0);
                    if (cloudUpdated >= localUpdated) {
                        mergedUsers[localIdx] = cloudUser;
                    }
                } else {
                    mergedUsers.push(cloudUser);
                }
            });
            
            localStorage.setItem('ezcubic_users', JSON.stringify(mergedUsers));
            console.log('👥 Users merged from cloud:', mergedUsers.length);
        }
        
        if (record.data_key === 'ezcubic_tenants' && record.data?.value) {
            const cloudTenants = record.data.value;
            const localTenants = JSON.parse(localStorage.getItem('ezcubic_tenants') || '{}');
            
            const mergedTenants = { ...localTenants, ...cloudTenants };
            localStorage.setItem('ezcubic_tenants', JSON.stringify(mergedTenants));
            console.log('🏢 Tenants merged from cloud');
        }
    }
}

// ==================== INIT: Apply restrictions on page load ====================
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(() => {
        syncPlanFeaturesToUsers();
        applyPlanRestrictions();
    }, 500);
});

// ==================== GLOBAL EXPORTS ====================
window.showEditPlanFeaturesModal = showEditPlanFeaturesModal;
window.toggleAllPlanFeatures = toggleAllPlanFeatures;
window.updateFeatureCheckbox = updateFeatureCheckbox;
window.savePlanFeatures = savePlanFeatures;
window.syncPlanFeaturesToUsers = syncPlanFeaturesToUsers;
window.showEditPlanModal = showEditPlanModal;
window.showAddPlanModal = showAddPlanModal;
window.savePlanChanges = savePlanChanges;
window.deletePlan = deletePlan;
window.applyPlanRestrictions = applyPlanRestrictions;
window.applyFeatureRestrictions = applyFeatureRestrictions;
window.showAllNavItems = showAllNavItems;
window.hideEmptyNavSeparators = hideEmptyNavSeparators;
window.showPlanBadge = showPlanBadge;
window.showUpgradeModal = showUpgradeModal;
window.showUpgradePlanModal = showUpgradePlanModal;
window.requestUpgrade = requestUpgrade;
window.requestDowngrade = requestDowngrade;
window.generateCompanyCodeForTenant = generateCompanyCodeForTenant;
window.copyTenantCompanyCode = copyTenantCompanyCode;
window.refreshPlatformFromCloud = refreshPlatformFromCloud;
window.downloadUsersFromCloud = downloadUsersFromCloud;
