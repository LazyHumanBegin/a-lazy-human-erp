/**
 * EZCubic - Plan Feature Management
 * Split from platform-ui-advanced.js v2.3.2
 * Plan editor, feature toggles, and plan-to-user sync
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

// ==================== GLOBAL EXPORTS ====================
window.showEditPlanFeaturesModal = showEditPlanFeaturesModal;
window.toggleAllPlanFeatures = toggleAllPlanFeatures;
window.updateFeatureCheckbox = updateFeatureCheckbox;
window.savePlanFeatures = savePlanFeatures;
window.syncPlanFeaturesToUsers = syncPlanFeaturesToUsers;
