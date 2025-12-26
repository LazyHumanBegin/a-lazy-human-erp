/**
 * EZCubic - User Management Core - Data & CRUD operations
 * Split from users-management.js v2.3.2
 * 
 * This file contains:
 * - showUserManagement() - Entry point
 * - renderUserManagement() - Data preparation and stats calculation
 * - Tab switching and filter functions
 * - User CRUD operations (save, update, delete)
 * - Export functionality
 * 
 * Dependencies: users-core.js (ROLES, ERP_MODULES, ERP_MODULE_CATEGORIES)
 * Load before: users-management-ui.js
 */

// ==================== USER MANAGEMENT SECTION ====================
function showUserManagement() {
    showSection('user-management');
    renderUserManagement();
}

function renderUserManagement() {
    const container = document.getElementById('usersContainer');
    if (!container) return;
    
    if (!currentUser) {
        container.innerHTML = '<p>Please login to access user management.</p>';
        return;
    }
    
    // Load ALL system users (for Founder's User Control tab)
    const allSystemUsers = [...users].filter(u => u.role !== 'founder');
    
    // Determine what users current user can see/manage
    let manageableUsers = [];
    let visibleRoles = [];
    const isFounder = currentUser.role === 'founder';
    const isERPAssistant = currentUser.role === 'erp_assistant';
    
    if (isFounder || isERPAssistant) {
        // Founder and ERP Assistant can see ALL users except founder
        manageableUsers = [...users].filter(u => u.role !== 'founder');
        visibleRoles = ['business_admin', 'manager', 'staff', 'personal'];
    } else if (currentUser.role === 'business_admin') {
        // Business admin sees their own tenant's users
        manageableUsers = users.filter(u => 
            u.tenantId === currentUser.tenantId && 
            u.role !== 'founder' &&
            u.id !== currentUser.id
        );
        visibleRoles = ['manager', 'staff'];
    } else if (currentUser.role === 'manager') {
        // Managers can see staff in their tenant
        manageableUsers = users.filter(u => 
            u.tenantId === currentUser.tenantId && 
            u.role === 'staff'
        );
        visibleRoles = ['staff'];
    } else {
        // Staff and personal can only see themselves
        manageableUsers = [];
        visibleRoles = [];
    }
    
    // Group users by role
    const usersByRole = {};
    manageableUsers.forEach(user => {
        if (!usersByRole[user.role]) {
            usersByRole[user.role] = [];
        }
        usersByRole[user.role].push(user);
    });
    
    // Get subscription stats for Business Admins
    const platformSettings = typeof getPlatformSettings === 'function' ? getPlatformSettings() : null;
    const subscriptions = typeof getSubscriptions === 'function' ? getSubscriptions() : {};
    const businessAdmins = manageableUsers.filter(u => u.role === 'business_admin');
    
    // Count subscriptions by plan
    const planCounts = {};
    let trialCount = 0;
    let expiredCount = 0;
    
    businessAdmins.forEach(user => {
        if (user.plan) {
            planCounts[user.plan] = (planCounts[user.plan] || 0) + 1;
        }
        const sub = user.tenantId ? subscriptions[user.tenantId] : null;
        if (sub?.isTrial) trialCount++;
        const status = sub && typeof checkSubscriptionStatus === 'function' ? checkSubscriptionStatus(user.tenantId) : null;
        if (status && !status.valid) expiredCount++;
    });
    
    // Stats for Founder - ALL users
    const founderStats = isFounder ? {
        totalAll: allSystemUsers.length,
        businessAdmins: allSystemUsers.filter(u => u.role === 'business_admin').length,
        managers: allSystemUsers.filter(u => u.role === 'manager').length,
        staff: allSystemUsers.filter(u => u.role === 'staff').length,
        personal: allSystemUsers.filter(u => u.role === 'personal').length,
        erpAssistants: allSystemUsers.filter(u => u.role === 'erp_assistant').length,
        activeAll: allSystemUsers.filter(u => u.status === 'active').length,
        inactiveAll: allSystemUsers.filter(u => u.status === 'inactive').length,
        trials: trialCount,
        expired: expiredCount
    } : null;
    
    // Stats
    const stats = {
        total: manageableUsers.length,
        active: manageableUsers.filter(u => u.status === 'active').length,
        inactive: manageableUsers.filter(u => u.status === 'inactive').length,
        businessAdmins: businessAdmins.length,
        trials: trialCount,
        expired: expiredCount
    };
    
    // Show different stats based on role
    const showSubscriptionStats = (currentUser.role === 'founder' || currentUser.role === 'erp_assistant') && businessAdmins.length > 0;
    
    // Track active tab
    const activeTab = window.userMgmtActiveTab || 'users';
    
    // Delegate to UI module for rendering
    if (typeof renderUserManagementUI === 'function') {
        renderUserManagementUI(container, {
            isFounder,
            isERPAssistant,
            allSystemUsers,
            manageableUsers,
            visibleRoles,
            usersByRole,
            platformSettings,
            subscriptions,
            businessAdmins,
            planCounts,
            founderStats,
            stats,
            showSubscriptionStats,
            activeTab
        });
    }
}

// ==================== TAB SWITCHING & FILTER FUNCTIONS ====================

function switchUserMgmtTab(tab) {
    window.userMgmtActiveTab = tab;
    
    const usersTab = document.getElementById('addUsersTab');
    const controlTab = document.getElementById('userControlTab');
    const tabUsers = document.getElementById('tabUsers');
    const tabControl = document.getElementById('tabControl');
    
    if (tab === 'users') {
        if (usersTab) usersTab.style.display = 'block';
        if (controlTab) controlTab.style.display = 'none';
        if (tabUsers) {
            tabUsers.style.background = '#6366f1';
            tabUsers.style.color = 'white';
        }
        if (tabControl) {
            tabControl.style.background = 'transparent';
            tabControl.style.color = '#64748b';
        }
    } else {
        if (usersTab) usersTab.style.display = 'none';
        if (controlTab) controlTab.style.display = 'block';
        if (tabUsers) {
            tabUsers.style.background = 'transparent';
            tabUsers.style.color = '#64748b';
        }
        if (tabControl) {
            tabControl.style.background = '#6366f1';
            tabControl.style.color = 'white';
        }
    }
}

function toggleFilterDropdown() {
    const dropdown = document.getElementById('filterDropdown');
    if (dropdown) {
        dropdown.style.display = dropdown.style.display === 'none' ? 'block' : 'none';
    }
}

function clearFilters() {
    const roleFilter = document.getElementById('founderRoleFilter');
    const statusFilter = document.getElementById('founderStatusFilter');
    const searchInput = document.getElementById('founderUserSearch');
    
    if (roleFilter) roleFilter.value = '';
    if (statusFilter) statusFilter.value = '';
    if (searchInput) searchInput.value = '';
    
    filterFounderUserList('');
    
    const dropdown = document.getElementById('filterDropdown');
    if (dropdown) dropdown.style.display = 'none';
}

// Close filter dropdown when clicking outside
document.addEventListener('click', function(e) {
    const dropdown = document.getElementById('filterDropdown');
    const filterBtn = e.target.closest('button');
    if (dropdown && dropdown.style.display === 'block') {
        if (!e.target.closest('#filterDropdown') && (!filterBtn || !filterBtn.onclick?.toString().includes('toggleFilterDropdown'))) {
            dropdown.style.display = 'none';
        }
    }
});

function filterFounderUserList(searchTerm) {
    const roleFilter = document.getElementById('founderRoleFilter')?.value || '';
    const planFilter = document.getElementById('founderPlanFilter')?.value || '';
    const statusFilter = document.getElementById('founderStatusFilter')?.value || '';
    
    const rows = document.querySelectorAll('.founder-user-row');
    let visibleCount = 0;
    
    rows.forEach(row => {
        const uid = row.dataset.uid?.toLowerCase() || '';
        const name = row.dataset.name || '';
        const email = row.dataset.email || '';
        const role = row.dataset.role || '';
        const plan = row.dataset.plan || '';
        const status = row.dataset.status || '';
        
        const searchLower = searchTerm.toLowerCase();
        
        const matchesSearch = !searchTerm || 
            uid.includes(searchLower) || 
            name.includes(searchLower) || 
            email.includes(searchLower);
        
        const matchesRole = !roleFilter || role === roleFilter;
        const matchesPlan = !planFilter || plan === planFilter;
        const matchesStatus = !statusFilter || status === statusFilter;
        
        const isVisible = matchesSearch && matchesRole && matchesPlan && matchesStatus;
        row.style.display = isVisible ? '' : 'none';
        
        if (isVisible) visibleCount++;
    });
    
    const countEl = document.getElementById('founderUserCount');
    if (countEl) {
        countEl.textContent = `(${visibleCount})`;
    }
}

// ==================== PLAN SELECTION & MODULE AUTO-SELECT ====================

function highlightSelectedPlan(radio) {
    document.querySelectorAll('.plan-option').forEach(opt => {
        opt.style.borderColor = '#e2e8f0';
        opt.style.background = '#fff';
    });
    
    if (radio && radio.closest('.plan-option')) {
        const platformSettings = typeof getPlatformSettings === 'function' ? getPlatformSettings() : null;
        const plans = platformSettings?.plans || {
            personal: { color: '#64748b', features: ['dashboard', 'transactions'] },
            starter: { color: '#3b82f6', features: ['dashboard', 'pos', 'inventory', 'customers', 'bills', 'quotations', 'reports'] },
            professional: { color: '#10b981', features: ['all'] },
            enterprise: { color: '#7c3aed', features: ['all'] }
        };
        const planKey = radio.value;
        const plan = plans[planKey];
        const planColor = plan?.color || '#3b82f6';
        
        radio.closest('.plan-option').style.borderColor = planColor;
        radio.closest('.plan-option').style.background = planColor + '08';
        
        const preview = document.getElementById('planFeaturePreview');
        if (preview && plan) {
            const featureNames = {
                'dashboard': 'Dashboard', 'transactions': 'Transactions', 'income': 'Income',
                'expenses': 'Expenses', 'reports': 'Reports', 'taxes': 'Taxes',
                'balance': 'Balance Sheet', 'monthly-reports': 'Monthly Reports',
                'ai-chatbot': 'AI Assistant', 'pos': 'POS', 'inventory': 'Inventory',
                'stock': 'Stock', 'orders': 'Orders', 'crm': 'CRM', 'customers': 'Customers',
                'suppliers': 'Suppliers', 'quotations': 'Quotations', 'projects': 'Projects',
                'payroll': 'Payroll', 'leave-attendance': 'Leave & Attendance', 'kpi': 'KPI',
                'einvoice': 'E-Invoice', 'branches': 'Multi-Branch', 'bills': 'Bills'
            };
            
            const planName = plan.name || planKey.charAt(0).toUpperCase() + planKey.slice(1);
            let featuresHTML = '';
            
            if (plan.features?.includes('all')) {
                featuresHTML = '<span style="background: #dcfce7; color: #166534; padding: 2px 8px; border-radius: 4px;">✓ All Features Included</span>';
            } else if (plan.features) {
                featuresHTML = plan.features.slice(0, 10).map(f => 
                    `<span style="background: #e2e8f0; padding: 2px 8px; border-radius: 4px;">${featureNames[f] || f}</span>`
                ).join('');
                if (plan.features.length > 10) {
                    featuresHTML += `<span style="background: #e2e8f0; padding: 2px 8px; border-radius: 4px;">+${plan.features.length - 10} more</span>`;
                }
            }
            
            preview.innerHTML = `
                <strong style="color: ${planColor};">${planName} Plan includes:</strong>
                <div style="margin-top: 5px; display: flex; flex-wrap: wrap; gap: 5px;">
                    ${featuresHTML}
                </div>
            `;
        }
        
        autoSelectModulesForPlan(planKey);
    }
}

function autoSelectModulesForPlan(planKey) {
    const platformSettings = typeof getPlatformSettings === 'function' ? getPlatformSettings() : null;
    const plan = platformSettings?.plans?.[planKey];
    
    if (!plan) return;
    
    const features = plan.features || [];
    const isAllFeatures = features.includes('all');
    
    document.querySelectorAll('#permissionsModules input[type="checkbox"]').forEach(cb => {
        cb.checked = false;
    });
    
    const fullAccessCb = document.getElementById('permFullAccess');
    if (fullAccessCb) {
        fullAccessCb.checked = isAllFeatures;
        
        if (isAllFeatures) {
            document.querySelectorAll('#permissionsModules input[type="checkbox"]').forEach(cb => {
                cb.checked = true;
                cb.disabled = true;
            });
        } else {
            document.querySelectorAll('#permissionsModules input[type="checkbox"]').forEach(cb => {
                cb.disabled = false;
                if (features.includes(cb.value)) {
                    cb.checked = true;
                }
            });
        }
    }
    
    if (typeof ERP_MODULE_CATEGORIES !== 'undefined') {
        ERP_MODULE_CATEGORIES.forEach(cat => {
            updateCategoryCount(cat.id);
        });
    }
}

// ==================== SAVE NEW USER ====================

async function saveNewUser(event) {
    event.preventDefault();
    
    const name = document.getElementById('newUserName').value.trim();
    const email = document.getElementById('newUserEmail').value.trim();
    const password = document.getElementById('newUserPassword').value;
    const passwordConfirm = document.getElementById('newUserPasswordConfirm').value;
    const role = document.getElementById('newUserRole').value;
    
    const isFounder = currentUser?.role === 'founder';
    
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
            showUserLimitModal(userPlan, tenantUserCount, userLimit);
            return;
        }
    }
    
    if (password !== passwordConfirm) {
        showToast('Passwords do not match', 'error');
        return;
    }
    
    if (users.find(u => u.email.toLowerCase() === email.toLowerCase())) {
        showToast('Email already exists', 'error');
        return;
    }
    
    let permissions = [];
    if (role === 'staff' || role === 'manager') {
        const fullAccessEl = document.getElementById('permFullAccess');
        const fullAccess = fullAccessEl && fullAccessEl.checked;
        if (fullAccess) {
            permissions = ['all'];
        } else {
            permissions = Array.from(document.querySelectorAll('#permissionsModules input:checked')).map(cb => cb.value);
        }
    }
    
    let userId;
    if ((role === 'staff' || role === 'manager') && currentUser && currentUser.id) {
        const ownerBaseId = currentUser.id.replace(/[A-Z]$/, '');
        const existingUsers = users.filter(u => u.id.startsWith(ownerBaseId) && u.id !== currentUser.id);
        const usedSuffixes = existingUsers.map(u => u.id.replace(ownerBaseId, ''));
        let suffix = 'A';
        while (usedSuffixes.includes(suffix)) {
            if (suffix === 'Z') suffix = 'AA';
            else if (suffix.length === 1) suffix = String.fromCharCode(suffix.charCodeAt(0) + 1);
            else {
                const lastChar = suffix.slice(-1);
                const prefix = suffix.slice(0, -1);
                if (lastChar === 'Z') suffix = String.fromCharCode(prefix.charCodeAt(prefix.length - 1) + 1) + 'A';
                else suffix = prefix + String.fromCharCode(lastChar.charCodeAt(0) + 1);
            }
        }
        userId = ownerBaseId + suffix;
    } else {
        userId = 'user_' + Date.now();
    }
    
    const hashedPw = await hashPassword(password);
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
    
    if (role === 'personal') {
        newUser.plan = 'personal';
        newUser.tenantId = 'personal_' + Date.now();
        newUser.permissions = ['dashboard', 'transactions', 'income', 'expenses', 'reports', 'taxes', 'balance', 'monthly-reports', 'ai-chatbot', 'settings'];
        if (typeof initializeEmptyTenantData === 'function') {
            initializeEmptyTenantData(newUser.tenantId, newUser.name);
        }
    }
    
    if ((role === 'manager' || role === 'staff') && currentUser.tenantId) {
        newUser.tenantId = currentUser.tenantId;
        newUser.plan = currentUser.plan || 'starter';
    }
    
    users.push(newUser);
    saveUsers();
    
    closeModal('addUserModal');
    renderUserManagement();
    showToast(`${ROLES[role].name} created successfully!`, 'success');
}

// ==================== UPDATE USER ====================

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
        permissions = Array.from(document.querySelectorAll('#editPermissionsModules input:checked')).map(cb => cb.value);
    }
    
    users[userIndex].name = name;
    users[userIndex].email = email;
    users[userIndex].role = role;
    users[userIndex].permissions = permissions;
    users[userIndex].updatedAt = new Date().toISOString();
    
    if (password) {
        users[userIndex].password = password;
    }
    
    saveUsers();
    closeModal('editUserModal');
    renderUserManagement();
    showToast('User updated successfully!', 'success');
}

// ==================== USER STATUS & DELETE ====================

function toggleUserStatus(userId, newStatus) {
    const user = users.find(u => u.id === userId);
    if (!user || user.role === 'founder') return;
    
    if (newStatus) {
        user.status = newStatus;
    } else {
        user.status = user.status === 'active' ? 'inactive' : 'active';
    }
    user.updatedAt = new Date().toISOString();
    
    saveUsers();
    renderUserManagement();
    showToast(`User ${user.status === 'active' ? 'activated' : 'deactivated'}`, 'success');
}

function deleteUser(userId) {
    const user = users.find(u => u.id === userId);
    if (!user || user.role === 'founder') return;
    
    if (confirm(`Are you sure you want to delete "${user.name}"?\n\nThis action cannot be undone.`)) {
        users = users.filter(u => u.id !== userId);
        saveUsers();
        renderUserManagement();
        showToast('User deleted', 'info');
    }
}

function executeDeleteUser(userId) {
    const userIndex = users.findIndex(u => u.id === userId);
    if (userIndex === -1) return;
    
    const user = users[userIndex];
    users.splice(userIndex, 1);
    saveUsers();
    
    closeModal('confirmDeleteUserModal');
    showToast(`User "${user.name}" has been deleted`, 'success');
    renderUserManagement();
}

// ==================== EXPORT ====================

function exportUserList() {
    const allUsers = users.filter(u => u.role !== 'founder');
    const platformSettings = typeof getPlatformSettings === 'function' ? getPlatformSettings() : null;
    
    let csv = 'UID,Name,Email,Role,Plan,Status,Tenant ID,Created\n';
    
    allUsers.forEach(user => {
        const plan = platformSettings?.plans?.[user.plan];
        csv += `"${user.id}","${user.name || ''}","${user.email || ''}","${user.role}","${plan?.name || user.plan || ''}","${user.status || 'active'}","${user.tenantId || ''}","${user.createdAt || ''}"\n`;
    });
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ezcubic_users_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    
    showToast(`Exported ${allUsers.length} users`, 'success');
}

// ==================== WINDOW EXPORTS ====================
window.showUserManagement = showUserManagement;
window.renderUserManagement = renderUserManagement;
window.switchUserMgmtTab = switchUserMgmtTab;
window.toggleFilterDropdown = toggleFilterDropdown;
window.clearFilters = clearFilters;
window.filterFounderUserList = filterFounderUserList;
window.highlightSelectedPlan = highlightSelectedPlan;
window.autoSelectModulesForPlan = autoSelectModulesForPlan;
window.saveNewUser = saveNewUser;
window.updateUser = updateUser;
window.toggleUserStatus = toggleUserStatus;
window.deleteUser = deleteUser;
window.executeDeleteUser = executeDeleteUser;
window.exportUserList = exportUserList;
