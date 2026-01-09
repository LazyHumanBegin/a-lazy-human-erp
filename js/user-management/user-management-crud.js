/**
 * Ez.Smart User Management Module - PART B (CRUD)
 * ================================================
 * Extracted from users.js for modular architecture
 * 
 * PART B: Add/Edit User Operations
 * - highlightSelectedPlan() - Plan selection UI
 * - autoSelectModulesForPlan() - Auto-select modules based on plan
 * - showAddUserModal() - Display add user form
 * - togglePermissionCategory() - Expand/collapse permission categories
 * - toggleCategoryModules() - Select all modules in category
 * - updateCategoryCount() - Update category checkbox count
 * - toggleFullAccess() - Toggle full access checkbox
 * - saveNewUser() - Create new user
 * - editUser() - Display edit user form
 * - updateUser() - Save user changes
 * 
 * Dependencies:
 * - ROLES, ERP_MODULES, ERP_MODULE_CATEGORIES from permissions.js
 * - currentUser, users, saveUsers(), hashPassword() from users.js
 * - canManageRole() from permissions.js
 * - escapeHtml(), showToast(), closeModal() from ui.js
 * - getPlatformSettings() from platform-control.js
 * - createTenant(), createSubscription() from multi-tenant.js
 * - renderUserManagement() from user-management.js (Part A)
 * - showUserLimitModal() from user-management-actions.js (Part C)
 * 
 * Version: 1.0.0
 * Last Updated: 2024-12-29
 */

(function() {
    'use strict';
    
    // ==================== PLAN SELECTION ====================
    
    /**
     * Highlight selected plan in add user modal
     */
    function highlightSelectedPlan(radio) {
        // Reset all plan options
        document.querySelectorAll('.plan-option').forEach(opt => {
            opt.style.borderColor = '#e2e8f0';
            opt.style.background = 'white';
        });
        
        // Highlight selected
        const label = radio.closest('.plan-option');
        if (label) {
            const planId = radio.value;
            const platformSettings = typeof getPlatformSettings === 'function' ? getPlatformSettings() : null;
            const plan = platformSettings?.plans?.[planId];
            if (plan) {
                label.style.borderColor = plan.color;
                label.style.background = plan.color + '08';
            }
        }
        
        // Update feature preview
        updatePlanFeaturePreview(radio.value);
    }
    
    /**
     * Update plan feature preview in modal
     */
    function updatePlanFeaturePreview(planId) {
        const previewEl = document.getElementById('planFeaturePreview');
        if (!previewEl) return;
        
        const platformSettings = typeof getPlatformSettings === 'function' ? getPlatformSettings() : null;
        const plan = platformSettings?.plans?.[planId];
        
        if (!plan) return;
        
        const features = plan.features || [];
        const featureNames = features.includes('all') ? ['All Features Included'] : 
            features.slice(0, 10).map(f => {
                const module = ERP_MODULES.find(m => m.id === f);
                return module ? module.name : f;
            });
        
        previewEl.innerHTML = `
            <strong style="color: #334155;">${plan.name} Plan includes:</strong>
            <div style="margin-top: 5px; display: flex; flex-wrap: wrap; gap: 5px;">
                ${featureNames.map(f => `<span style="background: #e2e8f0; padding: 2px 8px; border-radius: 4px;">${f}</span>`).join('')}
                ${!features.includes('all') && features.length > 10 ? `<span style="color: #64748b;">+${features.length - 10} more</span>` : ''}
            </div>
        `;
    }
    
    /**
     * Auto-select modules based on plan (for staff/manager)
     */
    function autoSelectModulesForPlan(planId) {
        const platformSettings = typeof getPlatformSettings === 'function' ? getPlatformSettings() : null;
        const plan = platformSettings?.plans?.[planId];
        
        if (!plan) return;
        
        const features = plan.features || [];
        
        // Handle Full Access checkbox
        const fullAccessCheckbox = document.getElementById('permFullAccess');
        if (fullAccessCheckbox) {
            if (features.includes('all')) {
                fullAccessCheckbox.checked = true;
                // Disable individual checkboxes
                document.querySelectorAll('#permissionsModules input[type="checkbox"]').forEach(cb => {
                    cb.checked = true;
                    cb.disabled = true;
                });
            } else {
                fullAccessCheckbox.checked = false;
                // Enable individual checkboxes and select only plan features
                document.querySelectorAll('#permissionsModules input[type="checkbox"]').forEach(cb => {
                    cb.disabled = false;
                    if (features.includes(cb.value)) {
                        cb.checked = true;
                    }
                });
            }
        }
        
        // Update category checkboxes and counts
        if (typeof ERP_MODULE_CATEGORIES !== 'undefined') {
            ERP_MODULE_CATEGORIES.forEach(cat => {
                updateCategoryCount(cat.id);
            });
        }
    }
    
    // ==================== ADD USER MODAL ====================
    
    /**
     * Show add user modal
     */
    function showAddUserModal(roleId = 'staff') {
        console.log('showAddUserModal called with roleId:', roleId);
        
        // Founder has no limits - skip all limit checks
        const isFounder = window.currentUser?.role === 'founder';
        
        // Check user limit for staff/manager (not for business_admin which creates new tenants, not for founder)
        if (!isFounder && (roleId === 'staff' || roleId === 'manager')) {
            const allUsers = JSON.parse(localStorage.getItem('ezcubic_users') || '[]');
            const currentTenantId = window.currentUser?.tenantId;
            const tenantUsers = allUsers.filter(u => u.tenantId === currentTenantId);
            const tenantUserCount = tenantUsers.length;
            
            const platformSettings = typeof getPlatformSettings === 'function' ? getPlatformSettings() : null;
            const userPlan = window.currentUser?.plan || 'starter';
            const planLimits = platformSettings?.plans?.[userPlan]?.limits;
            const userLimit = planLimits?.users !== undefined ? planLimits.users : 3;
            
            console.log(`Add User Modal - Tenant: ${currentTenantId}, Users: ${tenantUserCount}, Limit: ${userLimit}, Plan: ${userPlan}`);
            
            if (userLimit !== -1 && tenantUserCount >= userLimit) {
                console.log('LIMIT REACHED - showing modal');
                if (typeof showUserLimitModal === 'function') {
                    showUserLimitModal(userPlan, tenantUserCount, userLimit);
                }
                return;
            }
        }
        
        const role = ROLES[roleId];
        const platformSettings = typeof getPlatformSettings === 'function' ? getPlatformSettings() : null;
        const plans = platformSettings?.plans || {
            personal: { name: 'Personal', price: 0, color: '#64748b' },
            starter: { name: 'Starter', price: 39, color: '#3b82f6' },
            professional: { name: 'Professional', price: 129, color: '#8b5cf6' },
            premium: { name: 'Premium', price: 249, color: '#f59e0b' }
        };
        
        const showPlanSelector = roleId === 'business_admin';
        const showERPModules = roleId === 'staff' || roleId === 'manager';
        
        // Get owner's plan features for module filtering
        let ownerPlan = 'starter';
        let ownerFeatures = [];
        
        if (window.currentUser?.role === 'founder') {
            // Founder ALWAYS has ALL features regardless of plan
            ownerPlan = 'premium';
            ownerFeatures = ['all'];
        } else if (window.currentUser?.role === 'business_admin') {
            ownerPlan = window.currentUser?.plan || 'starter';
            const ownerPlanConfig = platformSettings?.plans?.[ownerPlan] || plans[ownerPlan];
            ownerFeatures = ownerPlanConfig?.features || [];
        } else if (window.currentUser?.role === 'manager') {
            const allUsers = JSON.parse(localStorage.getItem('ezcubic_users') || '[]');
            const owner = allUsers.find(u => 
                u.tenantId === window.currentUser?.tenantId && 
                (u.role === 'business_admin' || u.role === 'founder')
            );
            
            if (owner) {
                ownerPlan = owner.plan || 'starter';
                const ownerPlanConfig = platformSettings?.plans?.[ownerPlan] || plans[ownerPlan];
                const ownerPlanFeatures = ownerPlanConfig?.features || [];
                const managerPermissions = window.currentUser?.permissions || [];
                
                if (managerPermissions.includes('all')) {
                    ownerFeatures = ownerPlanFeatures;
                } else {
                    if (ownerPlanFeatures.includes('all')) {
                        ownerFeatures = managerPermissions;
                    } else {
                        ownerFeatures = ownerPlanFeatures.filter(f => managerPermissions.includes(f));
                    }
                }
            }
        }
        
        const ownerPlanConfig = platformSettings?.plans?.[ownerPlan] || plans[ownerPlan];
        const hasAllFeatures = ownerFeatures.includes('all');
        
        // Filter categories based on allowed features
        const filteredCategories = ERP_MODULE_CATEGORIES.map(category => {
            const allowedModules = category.modules.filter(module => {
                return hasAllFeatures || ownerFeatures.includes(module.id);
            });
            return { ...category, modules: allowedModules };
        }).filter(category => category.modules.length > 0);
        
        const totalAvailableModules = filteredCategories.reduce((sum, cat) => sum + cat.modules.length, 0);
        
        const isManager = window.currentUser?.role === 'manager';
        const permissionLabelText = isManager 
            ? `Based on your assigned permissions (${totalAvailableModules} modules you can assign)`
            : `Based on your <strong style="color: ${ownerPlanConfig?.color || '#2563eb'}">${ownerPlanConfig?.name || 'Starter'}</strong> plan (${totalAvailableModules} modules available)`;
        
        const modalHTML = `
            <div class="modal show" id="addUserModal">
                <div class="modal-content" style="max-width: ${showERPModules ? '650px' : '550px'};">
                    <div class="modal-header">
                        <h3 class="modal-title">
                            <i class="fas fa-user-plus"></i> Add New ${role.name}
                        </h3>
                        <button class="modal-close" onclick="closeModal('addUserModal')">&times;</button>
                    </div>
                    <form id="addUserForm" onsubmit="saveNewUser(event)" autocomplete="off">
                        <input type="hidden" id="newUserRole" value="${roleId}">
                        
                        <div class="form-grid">
                            <div class="form-group">
                                <label class="form-label">Full Name *</label>
                                <input type="text" id="newUserName" class="form-control" required placeholder="Enter full name">
                            </div>
                            <div class="form-group">
                                <label class="form-label">Email *</label>
                                <input type="email" id="newUserEmail" class="form-control" required placeholder="Enter email address">
                            </div>
                            <div class="form-group">
                                <label class="form-label">Password *</label>
                                <input type="password" id="newUserPassword" class="form-control" required placeholder="Enter password" minlength="6" autocomplete="new-password">
                            </div>
                            <div class="form-group">
                                <label class="form-label">Confirm Password *</label>
                                <input type="password" id="newUserPasswordConfirm" class="form-control" required placeholder="Confirm password" autocomplete="new-password">
                            </div>
                        </div>
                        
                        ${showPlanSelector ? generatePlanSelectorHTML(plans) : ''}
                        
                        ${showERPModules ? generateBranchAccessHTML() : ''}
                        
                        ${showERPModules ? generatePermissionsHTML(filteredCategories, role, totalAvailableModules, permissionLabelText, hasAllFeatures, ownerPlanConfig) : ''}
                        
                        <div class="modal-footer">
                            <button type="button" class="btn-secondary" onclick="closeModal('addUserModal')">Cancel</button>
                            <button type="submit" class="btn-primary">
                                <i class="fas fa-save"></i> Create User
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        `;
        
        document.getElementById('addUserModal')?.remove();
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        
        setTimeout(() => {
            if (showERPModules) {
                filteredCategories.forEach(cat => updateCategoryCount(cat.id));
                initBranchAccessCheckboxes();
            }
            if (showPlanSelector) {
                const checkedPlan = document.querySelector('input[name="userPlan"]:checked');
                if (checkedPlan) highlightSelectedPlan(checkedPlan);
            }
        }, 50);
    }
    
    /**
     * Generate branch access selector HTML (only shows if 2+ branches exist)
     * IMPORTANT: Only shows branches belonging to the user's tenant, not founder's branches
     */
    function generateBranchAccessHTML() {
        // Get the user being edited to determine which tenant's branches to show
        const currentUser = JSON.parse(localStorage.getItem('ezcubic_current_user') || '{}');
        const currentTenantId = currentUser.tenantId;
        
        // Get branches from window.branches OR localStorage
        let allBranches = window.branches || [];
        if (!Array.isArray(allBranches) || allBranches.length === 0) {
            allBranches = JSON.parse(localStorage.getItem('ezcubic_branches') || '[]');
        }
        
        // Filter branches to only show those belonging to the current tenant
        // Founder sees all, but when editing other users, only show that tenant's branches
        const branches = allBranches.filter(b => {
            // If no tenant filter, show all (founder editing)
            if (!currentTenantId || currentUser.role === 'founder') {
                // But still filter - only show branches that match the user being edited's tenant
                // Get the user being edited from the form if available
                const editUserForm = document.getElementById('editUserForm');
                if (editUserForm) {
                    const editingUserId = editUserForm.dataset?.userId;
                    if (editingUserId) {
                        const users = JSON.parse(localStorage.getItem('ezcubic_users') || '[]');
                        const editingUser = users.find(u => u.id === editingUserId);
                        if (editingUser?.tenantId) {
                            return b.tenantId === editingUser.tenantId;
                        }
                    }
                }
                return true; // Founder with no specific user context sees all
            }
            return b.tenantId === currentTenantId;
        });
        
        console.log('🏢 generateBranchAccessHTML - branches found:', branches.length, branches.map(b => b.name));
        
        // Only show if admin has 2 or more branches
        if (branches.length < 2) {
            console.log('🏢 Branch access section hidden - less than 2 branches');
            return '';
        }
        
        const branchCheckboxes = branches.map(branch => `
            <label style="display: flex; align-items: center; gap: 8px; padding: 8px 12px; background: #f8fafc; border-radius: 6px; cursor: pointer; border: 1px solid #e2e8f0;">
                <input type="checkbox" name="branchAccess" value="${branch.id}" checked 
                    style="width: 16px; height: 16px;" onchange="updateBranchAccessCount()">
                <div style="flex: 1;">
                    <div style="font-weight: 500; font-size: 13px;">${branch.name}</div>
                    <div style="font-size: 11px; color: #64748b;">${branch.type === 'headquarters' ? 'HQ' : branch.code || branch.type}</div>
                </div>
                ${branch.type === 'headquarters' ? '<i class="fas fa-building" style="color: #6366f1;"></i>' : '<i class="fas fa-store" style="color: #10b981;"></i>'}
            </label>
        `).join('');
        
        return `
            <div class="form-group" style="margin-bottom: 20px; border: 1px solid #e2e8f0; border-radius: 10px; padding: 15px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                    <label class="form-label" style="margin: 0;">
                        <i class="fas fa-store-alt" style="color: #6366f1;"></i> Branch Access
                    </label>
                    <span id="branchAccessCount" style="font-size: 12px; background: #6366f1; color: white; padding: 2px 8px; border-radius: 10px;">
                        ${branches.length} / ${branches.length}
                    </span>
                </div>
                <p style="font-size: 12px; color: #64748b; margin-bottom: 12px;">
                    Select which branches this user can access in POS and reports
                </p>
                <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px;">
                    <label style="display: flex; align-items: center; gap: 6px; cursor: pointer; font-size: 13px; color: #6366f1; font-weight: 500;">
                        <input type="checkbox" id="branchAccessAll" checked onchange="toggleAllBranchAccess(this.checked)">
                        All Branches
                    </label>
                </div>
                <div id="branchAccessList" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 8px;">
                    ${branchCheckboxes}
                </div>
            </div>
        `;
    }
    
    /**
     * Initialize branch access checkboxes event handlers
     */
    function initBranchAccessCheckboxes() {
        updateBranchAccessCount();
    }
    
    /**
     * Toggle all branch access checkboxes
     */
    function toggleAllBranchAccess(checked) {
        const checkboxes = document.querySelectorAll('input[name="branchAccess"]');
        checkboxes.forEach(cb => cb.checked = checked);
        updateBranchAccessCount();
    }
    window.toggleAllBranchAccess = toggleAllBranchAccess;
    
    /**
     * Update branch access count display
     */
    function updateBranchAccessCount() {
        const total = document.querySelectorAll('input[name="branchAccess"]').length;
        const checked = document.querySelectorAll('input[name="branchAccess"]:checked').length;
        const countEl = document.getElementById('branchAccessCount');
        const allCheckbox = document.getElementById('branchAccessAll');
        
        if (countEl) {
            countEl.textContent = `${checked} / ${total}`;
            countEl.style.background = checked === total ? '#6366f1' : (checked === 0 ? '#ef4444' : '#f59e0b');
        }
        
        if (allCheckbox) {
            allCheckbox.checked = checked === total;
        }
    }
    window.updateBranchAccessCount = updateBranchAccessCount;
    
    /**
     * Generate branch access HTML for EDIT user modal
     * Pre-checks branches based on user's existing allowedBranches
     */
    function generateEditBranchAccessHTML(user) {
        // Get branches from window.branches OR localStorage
        let allBranches = window.branches || [];
        if (!Array.isArray(allBranches) || allBranches.length === 0) {
            allBranches = JSON.parse(localStorage.getItem('ezcubic_branches') || '[]');
        }
        
        // CRITICAL: Filter branches to only show the user's tenant branches
        // When editing a user, only show branches belonging to THEIR tenant, not founder's
        const branches = allBranches.filter(b => {
            // If user has a tenantId, only show branches from their tenant
            if (user.tenantId) {
                return b.tenantId === user.tenantId;
            }
            // If no tenantId (shouldn't happen), don't show any branches
            return false;
        });
        
        console.log('🏢 generateEditBranchAccessHTML for', user.email, '- tenant:', user.tenantId, '- branches found:', branches.length);
        
        // Only show if user's tenant has 2 or more branches
        if (branches.length < 2) {
            return '';
        }
        
        // Get user's allowed branches (default to all if not set)
        const userAllowedBranches = user.allowedBranches || branches.map(b => b.id);
        const allSelected = userAllowedBranches.length === branches.length;
        
        const branchCheckboxes = branches.map(branch => {
            const isChecked = userAllowedBranches.includes(branch.id);
            return `
            <label style="display: flex; align-items: center; gap: 8px; padding: 8px 12px; background: #f8fafc; border-radius: 6px; cursor: pointer; border: 1px solid #e2e8f0;">
                <input type="checkbox" name="branchAccess" value="${branch.id}" ${isChecked ? 'checked' : ''} 
                    style="width: 16px; height: 16px;" onchange="updateBranchAccessCount()">
                <div style="flex: 1;">
                    <div style="font-weight: 500; font-size: 13px;">${branch.name}</div>
                    <div style="font-size: 11px; color: #64748b;">${branch.type === 'headquarters' ? 'HQ' : branch.code || branch.type}</div>
                </div>
                ${branch.type === 'headquarters' ? '<i class="fas fa-building" style="color: #6366f1;"></i>' : '<i class="fas fa-store" style="color: #10b981;"></i>'}
            </label>
        `}).join('');
        
        const checkedCount = userAllowedBranches.length;
        const badgeColor = checkedCount === branches.length ? '#6366f1' : (checkedCount === 0 ? '#ef4444' : '#f59e0b');
        
        return `
            <div class="form-group" style="margin-bottom: 20px; border: 1px solid #e2e8f0; border-radius: 10px; padding: 15px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                    <label class="form-label" style="margin: 0;">
                        <i class="fas fa-store-alt" style="color: #6366f1;"></i> Branch Access
                    </label>
                    <span id="branchAccessCount" style="font-size: 12px; background: ${badgeColor}; color: white; padding: 2px 8px; border-radius: 10px;">
                        ${checkedCount} / ${branches.length}
                    </span>
                </div>
                <p style="font-size: 12px; color: #64748b; margin-bottom: 12px;">
                    Select which branches this user can access in POS and reports
                </p>
                <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px;">
                    <label style="display: flex; align-items: center; gap: 6px; cursor: pointer; font-size: 13px; color: #6366f1; font-weight: 500;">
                        <input type="checkbox" id="branchAccessAll" ${allSelected ? 'checked' : ''} onchange="toggleAllBranchAccess(this.checked)">
                        All Branches
                    </label>
                </div>
                <div id="branchAccessList" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 8px;">
                    ${branchCheckboxes}
                </div>
            </div>
        `;
    }
    
    /**
     * Generate plan selector HTML
     */
    function generatePlanSelectorHTML(plans) {
        return `
            <div class="form-group" style="margin-bottom: 20px;">
                <label class="form-label"><i class="fas fa-box"></i> Subscription Plan *</label>
                <p style="font-size: 12px; color: #64748b; margin-bottom: 10px;">
                    Select the subscription plan for this business. Access permissions are automatically set based on the plan.
                </p>
                <div class="plan-selector" style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px;">
                    ${Object.entries(plans).filter(([planId]) => planId !== 'personal').map(([planId, plan]) => {
                        const featureCount = plan.features?.includes('all') ? 'All Features' : `${plan.features?.length || 0} modules`;
                        return `
                        <label class="plan-option" style="
                            border: 2px solid ${planId === 'starter' ? plan.color : '#e2e8f0'};
                            border-radius: 10px;
                            padding: 12px;
                            cursor: pointer;
                            transition: all 0.2s;
                            display: flex;
                            flex-direction: column;
                            gap: 6px;
                            background: ${planId === 'starter' ? plan.color + '08' : 'white'};
                        " onmouseover="this.style.borderColor='${plan.color}'" 
                           onmouseout="if(!this.querySelector('input').checked) this.style.borderColor='#e2e8f0'">
                            <div style="display: flex; align-items: center; gap: 10px;">
                                <input type="radio" name="userPlan" value="${planId}" 
                                    ${planId === 'starter' ? 'checked' : ''}
                                    onchange="highlightSelectedPlan(this)"
                                    style="width: 18px; height: 18px;">
                                <div style="flex: 1;">
                                    <div style="font-weight: 600; color: ${plan.color};">${plan.name}</div>
                                    <div style="font-size: 12px; color: #64748b;">
                                        ${plan.price === 0 ? 'Free' : `RM${plan.price}/mo`}
                                    </div>
                                </div>
                                ${planId === 'premium' ? '<i class="fas fa-crown" style="color: #f59e0b;"></i>' : ''}
                                ${planId === 'professional' ? '<i class="fas fa-star" style="color: #10b981;"></i>' : ''}
                            </div>
                            <div style="font-size: 10px; color: #94a3b8; padding-left: 28px;">
                                ${featureCount}
                            </div>
                        </label>
                    `}).join('')}
                </div>
                <div id="planFeaturePreview" style="margin-top: 10px; padding: 10px; background: #f8fafc; border-radius: 8px; font-size: 11px; color: #64748b;">
                    <strong style="color: #334155;">Starter Plan includes:</strong>
                    <div style="margin-top: 5px; display: flex; flex-wrap: wrap; gap: 5px;">
                        <span style="background: #e2e8f0; padding: 2px 8px; border-radius: 4px;">Dashboard</span>
                        <span style="background: #e2e8f0; padding: 2px 8px; border-radius: 4px;">POS</span>
                        <span style="background: #e2e8f0; padding: 2px 8px; border-radius: 4px;">Inventory</span>
                        <span style="background: #e2e8f0; padding: 2px 8px; border-radius: 4px;">Customers</span>
                        <span style="background: #e2e8f0; padding: 2px 8px; border-radius: 4px;">Bills</span>
                    </div>
                </div>
            </div>
        `;
    }
    
    /**
     * Generate permissions HTML for staff/manager
     */
    function generatePermissionsHTML(filteredCategories, role, totalAvailableModules, permissionLabelText, hasAllFeatures, ownerPlanConfig) {
        return `
            <div class="form-group">
                <label class="form-label">
                    <i class="fas fa-key"></i> Module Access Permissions
                    <span style="font-weight: normal; font-size: 12px; color: #64748b; display: block; margin-top: 4px;">
                        ${permissionLabelText}
                    </span>
                </label>
                <div class="permissions-grid">
                    <label class="permission-item full-access" style="margin-bottom: 12px; background: linear-gradient(135deg, #10b98115, #10b98105); border: 1px solid #10b981; border-radius: 8px; padding: 10px;">
                        <input type="checkbox" id="permFullAccess" onchange="toggleFullAccess(this)">
                        <span><i class="fas fa-shield-alt" style="color: #10b981;"></i> Full Access (All ${totalAvailableModules} Available Modules)</span>
                    </label>
                    <div class="permissions-categories" id="permissionsModules" style="max-height: 350px; overflow-y: auto;">
                        ${filteredCategories.map(category => `
                            <div class="permission-category" style="margin-bottom: 10px; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
                                <div class="category-header" onclick="togglePermissionCategory('${category.id}')" style="
                                    background: linear-gradient(135deg, ${category.color}15, ${category.color}05);
                                    padding: 10px 12px;
                                    cursor: pointer;
                                    display: flex;
                                    align-items: center;
                                    justify-content: space-between;
                                    border-bottom: 1px solid #e2e8f0;
                                ">
                                    <label style="display: flex; align-items: center; gap: 10px; cursor: pointer; flex: 1;">
                                        <input type="checkbox" class="category-checkbox" data-category="${category.id}" 
                                            onchange="toggleCategoryModules('${category.id}', this.checked)"
                                            style="width: 16px; height: 16px;">
                                        <i class="fas ${category.icon}" style="color: ${category.color}; width: 18px;"></i>
                                        <span style="font-weight: 600; color: #1e293b;">${category.name}</span>
                                        <span class="category-count" id="count-${category.id}" style="
                                            background: ${category.color};
                                            color: white;
                                            font-size: 10px;
                                            padding: 2px 6px;
                                            border-radius: 10px;
                                        ">0/${category.modules.length}</span>
                                    </label>
                                    <i class="fas fa-chevron-down category-toggle" id="toggle-${category.id}" style="color: #64748b; transition: transform 0.2s;"></i>
                                </div>
                                <div class="category-modules" id="modules-${category.id}" style="padding: 8px 12px; display: none; background: #fafafa;">
                                    ${category.modules.map(module => `
                                        <label class="permission-item" style="display: flex; align-items: center; gap: 8px; padding: 6px 0; cursor: pointer;">
                                            <input type="checkbox" name="permissions" value="${module.id}" 
                                                data-category="${category.id}"
                                                onchange="updateCategoryCount('${category.id}')"
                                                ${role.defaultPermissions.includes(module.id) || role.defaultPermissions.includes('all') ? 'checked' : ''}>
                                            <i class="fas ${module.icon}" style="color: #64748b; width: 16px; font-size: 12px;"></i>
                                            <span style="font-size: 13px; color: #334155;">${module.name}</span>
                                        </label>
                                    `).join('')}
                                </div>
                            </div>
                        `).join('')}
                    </div>
                    ${!hasAllFeatures ? `
                    <div style="margin-top: 10px; padding: 10px; background: #fef3c7; border: 1px solid #fcd34d; border-radius: 8px; font-size: 12px; color: #92400e;">
                        <i class="fas fa-info-circle"></i> 
                        <strong>Note:</strong> Only modules included in your ${ownerPlanConfig?.name || 'Starter'} plan are shown. 
                        <a href="#" onclick="showNotification('Contact support to upgrade your plan for more features', 'info'); return false;" style="color: #2563eb; text-decoration: underline;">Upgrade</a> for more modules.
                    </div>
                    ` : ''}
                </div>
            </div>
        `;
    }
    
    // ==================== PERMISSION CATEGORY FUNCTIONS ====================
    
    /**
     * Toggle permission category expand/collapse
     */
    function togglePermissionCategory(categoryId) {
        const modules = document.getElementById(`modules-${categoryId}`);
        const toggle = document.getElementById(`toggle-${categoryId}`);
        
        if (modules && toggle) {
            if (modules.style.display === 'none') {
                modules.style.display = 'block';
                toggle.style.transform = 'rotate(180deg)';
            } else {
                modules.style.display = 'none';
                toggle.style.transform = 'rotate(0deg)';
            }
        }
    }
    
    /**
     * Toggle all modules in a category
     */
    function toggleCategoryModules(categoryId, checked) {
        const checkboxes = document.querySelectorAll(`input[data-category="${categoryId}"]`);
        checkboxes.forEach(cb => {
            if (!cb.disabled) {
                cb.checked = checked;
            }
        });
        updateCategoryCount(categoryId);
    }
    
    /**
     * Update category count badge
     */
    function updateCategoryCount(categoryId) {
        const checkboxes = document.querySelectorAll(`input[data-category="${categoryId}"]`);
        const total = checkboxes.length;
        const checked = Array.from(checkboxes).filter(cb => cb.checked).length;
        
        const countEl = document.getElementById(`count-${categoryId}`);
        if (countEl) {
            countEl.textContent = `${checked}/${total}`;
        }
        
        const categoryCheckbox = document.querySelector(`input.category-checkbox[data-category="${categoryId}"]`);
        if (categoryCheckbox) {
            categoryCheckbox.checked = checked === total && total > 0;
            categoryCheckbox.indeterminate = checked > 0 && checked < total;
        }
    }
    
    /**
     * Toggle full access checkbox
     */
    function toggleFullAccess(checkbox) {
        const modules = document.querySelectorAll('#permissionsModules input[type="checkbox"], #editPermissionsModules input[type="checkbox"]');
        modules.forEach(cb => {
            cb.checked = checkbox.checked;
            cb.disabled = checkbox.checked;
        });
        
        // Update all category counts
        if (typeof ERP_MODULE_CATEGORIES !== 'undefined') {
            ERP_MODULE_CATEGORIES.forEach(cat => updateCategoryCount(cat.id));
        }
    }
    
    // ==================== SAVE NEW USER ====================
    
    /**
     * Save new user from add modal
     */
    async function saveNewUser(event) {
        event.preventDefault();
        
        const name = document.getElementById('newUserName').value.trim();
        const email = document.getElementById('newUserEmail').value.trim();
        const password = document.getElementById('newUserPassword').value;
        const passwordConfirm = document.getElementById('newUserPasswordConfirm').value;
        const role = document.getElementById('newUserRole').value;
        
        const isFounder = currentUser?.role === 'founder';
        
        // Check user limit for Staff/Manager roles
        if (!isFounder && (role === 'staff' || role === 'manager') && currentUser && currentUser.tenantId) {
            const allUsers = JSON.parse(localStorage.getItem('ezcubic_users') || '[]');
            const tenantUsers = allUsers.filter(u => u.tenantId === currentUser.tenantId);
            const tenantUserCount = tenantUsers.length;
            
            const platformSettings = typeof getPlatformSettings === 'function' ? getPlatformSettings() : null;
            const userPlan = currentUser.plan || 'starter';
            const planLimits = platformSettings?.plans?.[userPlan]?.limits;
            const userLimit = planLimits?.users || 3;
            
            if (userLimit !== -1 && tenantUserCount >= userLimit) {
                closeModal('addUserModal');
                document.getElementById('addUserModal')?.remove();
                if (typeof showUserLimitModal === 'function') {
                    showUserLimitModal(userPlan, tenantUserCount, userLimit);
                }
                return;
            }
        }
        
        // Validation
        if (password !== passwordConfirm) {
            showToast('Passwords do not match', 'error');
            return;
        }
        
        if (users.find(u => u.email.toLowerCase() === email.toLowerCase())) {
            showToast('Email already exists', 'error');
            return;
        }
        
        // Get permissions
        let permissions = [];
        if (role === 'staff' || role === 'manager') {
            const fullAccessEl = document.getElementById('permFullAccess');
            const fullAccess = fullAccessEl && fullAccessEl.checked;
            if (fullAccess) {
                permissions = ['all'];
            } else {
                permissions = Array.from(document.querySelectorAll('#permissionsModules input:checked'))
                    .map(cb => cb.value);
            }
        }
        
        // Generate User ID
        let userId;
        if ((role === 'staff' || role === 'manager') && currentUser && currentUser.id) {
            const ownerBaseId = currentUser.id.replace(/[A-Z]$/, '');
            const existingUsers = users.filter(u => u.id.startsWith(ownerBaseId) && u.id !== currentUser.id);
            const usedSuffixes = existingUsers.map(u => u.id.replace(ownerBaseId, ''));
            let suffix = 'A';
            while (usedSuffixes.includes(suffix)) {
                if (suffix === 'Z') {
                    suffix = 'AA';
                } else if (suffix.length === 1) {
                    suffix = String.fromCharCode(suffix.charCodeAt(0) + 1);
                } else {
                    const lastChar = suffix.slice(-1);
                    const prefix = suffix.slice(0, -1);
                    if (lastChar === 'Z') {
                        suffix = String.fromCharCode(prefix.charCodeAt(prefix.length - 1) + 1) + 'A';
                    } else {
                        suffix = prefix + String.fromCharCode(lastChar.charCodeAt(0) + 1);
                    }
                }
            }
            userId = ownerBaseId + suffix;
        } else {
            userId = 'user_' + Date.now();
        }
        
        // Hash password
        const hashedPw = typeof hashPassword === 'function' ? await hashPassword(password) : password;
        
        const newUser = {
            id: userId,
            email: email,
            password: hashedPw,
            name: name,
            role: role,
            status: 'active',
            permissions: permissions,
            createdAt: new Date().toISOString(),
            createdBy: currentUser.id
        };
        
        // Business Admin: Create tenant and subscription
        if (role === 'business_admin' && typeof createTenant === 'function') {
            const tenantId = createTenant(newUser.id, name + "'s Business");
            newUser.tenantId = tenantId;
            
            const selectedPlanRadio = document.querySelector('input[name="userPlan"]:checked');
            newUser.plan = selectedPlanRadio ? selectedPlanRadio.value : 'starter';
            
            const platformSettings = typeof getPlatformSettings === 'function' ? getPlatformSettings() : null;
            const selectedPlan = platformSettings?.plans?.[newUser.plan];
            if (selectedPlan && selectedPlan.features) {
                newUser.permissions = selectedPlan.features.includes('all') ? ['all'] : [...selectedPlan.features];
            }
            
            if (typeof createSubscription === 'function') {
                createSubscription(tenantId, newUser.plan, platformSettings?.enableTrials || false);
            }
        }
        
        // Personal user
        if (role === 'personal') {
            newUser.plan = 'personal';
            newUser.tenantId = 'personal_' + Date.now();
            
            const platformSettings = typeof getPlatformSettings === 'function' ? getPlatformSettings() : null;
            const personalPlan = platformSettings?.plans?.personal;
            if (personalPlan && personalPlan.features) {
                newUser.permissions = [...personalPlan.features];
            } else {
                newUser.permissions = ['dashboard', 'transactions', 'income', 'expenses', 'reports', 'taxes', 'balance', 'monthly-reports', 'ai-chatbot', 'settings'];
            }
            
            if (typeof window.initializeEmptyTenantData === 'function') {
                window.initializeEmptyTenantData(newUser.tenantId, newUser.name);
            }
        }
        
        // Staff/Manager: Inherit tenant
        if ((role === 'manager' || role === 'staff') && currentUser.tenantId) {
            newUser.tenantId = currentUser.tenantId;
            newUser.plan = currentUser.plan || 'starter';
            
            // Get branch access (if branches exist)
            const branchCheckboxes = document.querySelectorAll('input[name="branchAccess"]:checked');
            if (branchCheckboxes.length > 0) {
                newUser.allowedBranches = Array.from(branchCheckboxes).map(cb => cb.value);
            } else {
                // Default: access to all branches
                const allBranches = JSON.parse(localStorage.getItem('ezcubic_branches') || '[]');
                newUser.allowedBranches = allBranches.map(b => b.id);
            }
            
            if (permissions.length === 0 || !permissions.includes('all')) {
                const platformSettings = typeof getPlatformSettings === 'function' ? getPlatformSettings() : null;
                const creatorPlan = currentUser.plan || 'starter';
                const planFeatures = platformSettings?.plans?.[creatorPlan]?.features;
                
                if (planFeatures) {
                    if (permissions.length === 0) {
                        newUser.permissions = planFeatures.includes('all') ? ['all'] : [...planFeatures];
                    } else {
                        if (planFeatures.includes('all')) {
                            newUser.permissions = permissions;
                        } else {
                            newUser.permissions = permissions.filter(p => planFeatures.includes(p));
                        }
                    }
                }
            }
        }
        
        users.push(newUser);
        saveUsers();
        
        closeModal('addUserModal');
        renderUserManagement();
        
        if (role === 'business_admin' && newUser.plan) {
            const planNames = { personal: 'Personal', starter: 'Starter', professional: 'Professional', premium: 'Premium' };
            showToast(`${ROLES[role].name} created with ${planNames[newUser.plan] || newUser.plan} plan!`, 'success');
        } else {
            showToast(`${ROLES[role].name} created successfully!`, 'success');
        }
    }
    
    // ==================== EDIT USER ====================
    
    /**
     * Show edit user modal
     */
    function editUser(userId) {
        const user = users.find(u => u.id === userId);
        if (!user) return;
        
        const role = ROLES[user.role];
        let filteredModules = ERP_MODULES;
        let ownerPlanName = '';
        let planFeatures = [];
        
        const isManagerEditing = window.currentUser?.role === 'manager';
        
        // Filter modules based on owner's plan
        if (['staff', 'manager'].includes(user.role) && user.tenantId) {
            const allUsers = JSON.parse(localStorage.getItem('ezcubic_users') || '[]');
            const owner = allUsers.find(u => 
                u.tenantId === user.tenantId && 
                (u.role === 'business_admin' || u.role === 'founder')
            );
            
            if (owner) {
                const platformSettings = typeof getPlatformSettings === 'function' ? getPlatformSettings() : null;
                const ownerPlan = owner.plan || 'starter';
                ownerPlanName = platformSettings?.plans?.[ownerPlan]?.name || ownerPlan;
                const ownerFeatures = platformSettings?.plans?.[ownerPlan]?.features || [];
                planFeatures = ownerFeatures;
                
                if (!ownerFeatures.includes('all')) {
                    filteredModules = ERP_MODULES.filter(m => ownerFeatures.includes(m.id));
                }
                
                if (isManagerEditing) {
                    const managerPermissions = window.currentUser?.permissions || [];
                    if (!managerPermissions.includes('all')) {
                        filteredModules = filteredModules.filter(m => managerPermissions.includes(m.id));
                        ownerPlanName = '';
                    }
                }
            }
        } else if (user.role === 'business_admin' && user.plan) {
            const platformSettings = typeof getPlatformSettings === 'function' ? getPlatformSettings() : null;
            ownerPlanName = platformSettings?.plans?.[user.plan]?.name || user.plan;
            planFeatures = platformSettings?.plans?.[user.plan]?.features || [];
            
            if (!planFeatures.includes('all')) {
                filteredModules = ERP_MODULES.filter(m => planFeatures.includes(m.id));
            }
        }
        
        let planNote = '';
        if (isManagerEditing && ['staff', 'manager'].includes(user.role)) {
            planNote = `<small style="color: #64748b; display: block; margin-top: 5px;">
                <i class="fas fa-info-circle"></i> Based on your assigned permissions (${filteredModules.length} modules you can assign)
            </small>`;
        } else if (ownerPlanName) {
            planNote = `<small style="color: #64748b; display: block; margin-top: 5px;">
                <i class="fas fa-info-circle"></i> Modules available based on ${ownerPlanName} plan (${filteredModules.length} modules)
            </small>`;
        }
        
        // Generate branch access HTML for edit modal
        const editBranchAccessHTML = generateEditBranchAccessHTML(user);
        
        const modalHTML = `
            <div class="modal show" id="editUserModal">
                <div class="modal-content" style="max-width: 550px;">
                    <div class="modal-header">
                        <h3 class="modal-title">
                            <i class="fas fa-user-edit"></i> Edit User
                        </h3>
                        <button class="modal-close" onclick="closeModal('editUserModal')">&times;</button>
                    </div>
                    <form id="editUserForm" onsubmit="updateUser(event, '${userId}')">
                        <div class="form-grid">
                            <div class="form-group">
                                <label class="form-label">Full Name *</label>
                                <input type="text" id="editUserName" class="form-control" required value="${escapeHtml(user.name)}">
                            </div>
                            <div class="form-group">
                                <label class="form-label">Email *</label>
                                <input type="email" id="editUserEmail" class="form-control" required value="${escapeHtml(user.email)}">
                            </div>
                            <div class="form-group">
                                <label class="form-label">New Password (leave blank to keep)</label>
                                <input type="password" id="editUserPassword" class="form-control" placeholder="Enter new password" minlength="6">
                            </div>
                            <div class="form-group">
                                <label class="form-label">Role</label>
                                <select id="editUserRole" class="form-control" ${user.role === 'founder' ? 'disabled' : ''}>
                                    ${Object.entries(ROLES).filter(([roleId]) => 
                                        roleId !== 'founder' && (canManageRole(roleId) || roleId === user.role)
                                    ).map(([roleId, r]) => `
                                        <option value="${roleId}" ${roleId === user.role ? 'selected' : ''}>${r.name}</option>
                                    `).join('')}
                                </select>
                            </div>
                        </div>
                        
                        ${editBranchAccessHTML}
                        
                        <div class="form-group">
                            <label class="form-label">ERP Module Access</label>
                            ${planNote}
                            <div class="permissions-grid">
                                <label class="permission-item full-access">
                                    <input type="checkbox" id="editPermFullAccess" onchange="toggleFullAccess(this)" 
                                        ${user.permissions.includes('all') ? 'checked' : ''}>
                                    <span><i class="fas fa-shield-alt"></i> Full Access (All Available Modules)</span>
                                </label>
                                <div class="permissions-modules" id="editPermissionsModules">
                                    ${filteredModules.map(module => `
                                        <label class="permission-item">
                                            <input type="checkbox" name="editPermissions" value="${module.id}" 
                                                ${user.permissions.includes('all') || user.permissions.includes(module.id) ? 'checked' : ''}
                                                ${user.permissions.includes('all') ? 'disabled' : ''}>
                                            <span><i class="fas ${module.icon}"></i> ${module.name}</span>
                                        </label>
                                    `).join('')}
                                </div>
                            </div>
                        </div>
                        
                        <div class="modal-footer">
                            <button type="button" class="btn-secondary" onclick="closeModal('editUserModal')">Cancel</button>
                            <button type="submit" class="btn-primary">
                                <i class="fas fa-save"></i> Update User
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        `;
        
        document.getElementById('editUserModal')?.remove();
        document.body.insertAdjacentHTML('beforeend', modalHTML);
    }
    
    /**
     * Update user from edit modal
     */
    function updateUser(event, userId) {
        event.preventDefault();
        
        const userIndex = users.findIndex(u => u.id === userId);
        if (userIndex === -1) return;
        
        const name = document.getElementById('editUserName').value.trim();
        const email = document.getElementById('editUserEmail').value.trim();
        const password = document.getElementById('editUserPassword').value;
        const role = document.getElementById('editUserRole').value;
        
        if (users.find(u => u.email.toLowerCase() === email.toLowerCase() && u.id !== userId)) {
            showToast('Email already exists', 'error');
            return;
        }
        
        const fullAccess = document.getElementById('editPermFullAccess').checked;
        let permissions = [];
        if (fullAccess) {
            permissions = ['all'];
        } else {
            permissions = Array.from(document.querySelectorAll('#editPermissionsModules input:checked'))
                .map(cb => cb.value);
        }
        
        // Get allowed branches (for staff/manager roles)
        const branchCheckboxes = document.querySelectorAll('input[name="branchAccess"]:checked');
        const allowedBranches = branchCheckboxes.length > 0 
            ? Array.from(branchCheckboxes).map(cb => cb.value)
            : users[userIndex].allowedBranches; // Keep existing if no branch UI shown
        
        users[userIndex].name = name;
        users[userIndex].email = email;
        users[userIndex].role = role;
        users[userIndex].permissions = permissions;
        users[userIndex].allowedBranches = allowedBranches;
        users[userIndex].updatedAt = new Date().toISOString();
        
        if (password) {
            users[userIndex].password = password;
        }
        
        saveUsers();
        
        // IMPORTANT: Also sync to cloud immediately so other devices see the changes
        if (typeof window.directUploadUsersToCloud === 'function') {
            window.directUploadUsersToCloud(false).then(() => {
                console.log('☁️ User changes synced to cloud');
            }).catch(err => {
                console.warn('⚠️ Failed to sync user changes to cloud:', err);
            });
        }
        
        closeModal('editUserModal');
        renderUserManagement();
        showToast('User updated successfully!', 'success');
    }
    
    // ==================== EXPORTS ====================
    window.highlightSelectedPlan = highlightSelectedPlan;
    window.autoSelectModulesForPlan = autoSelectModulesForPlan;
    window.showAddUserModal = showAddUserModal;
    window.togglePermissionCategory = togglePermissionCategory;
    window.toggleCategoryModules = toggleCategoryModules;
    window.updateCategoryCount = updateCategoryCount;
    window.toggleFullAccess = toggleFullAccess;
    window.saveNewUser = saveNewUser;
    window.editUser = editUser;
    window.updateUser = updateUser;
    
    console.log('👥 User Management module loaded (Part B: CRUD)');
    
})();
