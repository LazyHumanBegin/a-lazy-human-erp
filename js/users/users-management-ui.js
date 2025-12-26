/**
 * EZCubic - User Management UI - Modals and rendering
 * Split from users-management.js v2.3.2
 * 
 * This file contains:
 * - renderUserManagementUI() - Main UI template rendering
 * - showAddUserModal() - Add user modal
 * - editUser() - Edit user modal
 * - showUserDetailModal() - User details view
 * - confirmDeleteUser() - Delete confirmation modal
 * - showUserLimitModal() - Plan limit warning
 * - Permission category toggle functions
 * 
 * Dependencies: users-management-core.js (must load first)
 */

// ==================== MAIN UI RENDERING ====================

function renderUserManagementUI(container, data) {
    const {
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
    } = data;
    
    container.innerHTML = `
        ${isFounder ? `
        <!-- FOUNDER: Tabbed Interface -->
        <div class="founder-tabs" style="margin-bottom: 20px;">
            <div style="display: flex; gap: 0; border-bottom: 2px solid #e2e8f0;">
                <button onclick="switchUserMgmtTab('users')" id="tabUsers" 
                    style="padding: 12px 24px; border: none; background: ${activeTab === 'users' ? '#6366f1' : 'transparent'}; color: ${activeTab === 'users' ? 'white' : '#64748b'}; font-weight: 600; font-size: 14px; cursor: pointer; border-radius: 8px 8px 0 0; transition: all 0.2s;">
                    <i class="fas fa-user-plus" style="margin-right: 8px;"></i>Add Users
                </button>
                <button onclick="switchUserMgmtTab('control')" id="tabControl" 
                    style="padding: 12px 24px; border: none; background: ${activeTab === 'control' ? '#6366f1' : 'transparent'}; color: ${activeTab === 'control' ? 'white' : '#64748b'}; font-weight: 600; font-size: 14px; cursor: pointer; border-radius: 8px 8px 0 0; transition: all 0.2s;">
                    <i class="fas fa-users-cog" style="margin-right: 8px;"></i>User Control
                    <span style="background: ${activeTab === 'control' ? 'rgba(255,255,255,0.3)' : '#e0e7ff'}; color: ${activeTab === 'control' ? 'white' : '#4338ca'}; padding: 2px 8px; border-radius: 10px; font-size: 11px; margin-left: 6px;">${allSystemUsers.length}</span>
                </button>
            </div>
        </div>
        
        <!-- TAB: User Control Panel -->
        <div id="userControlTab" style="display: ${activeTab === 'control' ? 'block' : 'none'};">
            <!-- Stats Overview -->
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(100px, 1fr)); gap: 12px; margin-bottom: 20px;">
                <div style="background: linear-gradient(135deg, #6366f1, #818cf8); border-radius: 12px; padding: 16px; color: white; text-align: center;">
                    <div style="font-size: 28px; font-weight: 700;">${founderStats.totalAll}</div>
                    <div style="font-size: 11px; opacity: 0.9;">Total Users</div>
                </div>
                <div style="background: linear-gradient(135deg, #10b981, #34d399); border-radius: 12px; padding: 16px; color: white; text-align: center;">
                    <div style="font-size: 28px; font-weight: 700;">${founderStats.activeAll}</div>
                    <div style="font-size: 11px; opacity: 0.9;">Active</div>
                </div>
                <div style="background: linear-gradient(135deg, #ef4444, #f87171); border-radius: 12px; padding: 16px; color: white; text-align: center;">
                    <div style="font-size: 28px; font-weight: 700;">${founderStats.inactiveAll}</div>
                    <div style="font-size: 11px; opacity: 0.9;">Inactive</div>
                </div>
                <div style="background: linear-gradient(135deg, #8b5cf6, #a78bfa); border-radius: 12px; padding: 16px; color: white; text-align: center;">
                    <div style="font-size: 28px; font-weight: 700;">${founderStats.businessAdmins}</div>
                    <div style="font-size: 11px; opacity: 0.9;">Business</div>
                </div>
            </div>
            
            <!-- Search & Filter Bar -->
            <div style="background: white; border-radius: 12px; padding: 16px; margin-bottom: 16px; box-shadow: 0 2px 8px rgba(0,0,0,0.06);">
                <div style="display: flex; gap: 12px; flex-wrap: wrap; align-items: center;">
                    <div style="flex: 1; min-width: 250px;">
                        <div style="position: relative;">
                            <i class="fas fa-search" style="position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: #94a3b8;"></i>
                            <input type="text" id="founderUserSearch" placeholder="Search by ID, name, or email..." 
                                style="width: 100%; padding: 10px 12px 10px 38px; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 14px;"
                                oninput="filterFounderUserList(this.value)">
                        </div>
                    </div>
                    <div style="position: relative;">
                        <button onclick="toggleFilterDropdown()" style="padding: 10px 16px; border: 1px solid #e2e8f0; background: white; border-radius: 8px; font-size: 14px; cursor: pointer; display: flex; align-items: center; gap: 8px;">
                            <i class="fas fa-filter" style="color: #6366f1;"></i>
                            <span>Filters</span>
                            <i class="fas fa-chevron-down" style="font-size: 10px; color: #94a3b8;"></i>
                        </button>
                        <div id="filterDropdown" style="display: none; position: absolute; top: 100%; right: 0; margin-top: 8px; background: white; border-radius: 12px; box-shadow: 0 10px 40px rgba(0,0,0,0.15); padding: 16px; min-width: 200px; z-index: 100;">
                            <div style="margin-bottom: 12px;">
                                <label style="font-size: 11px; color: #64748b; text-transform: uppercase; font-weight: 600;">Role</label>
                                <select id="founderRoleFilter" onchange="filterFounderUserList(document.getElementById('founderUserSearch').value)" 
                                    style="width: 100%; padding: 8px; border: 1px solid #e2e8f0; border-radius: 6px; font-size: 13px; margin-top: 4px;">
                                    <option value="">All Roles</option>
                                    <option value="business_admin">Business Admin</option>
                                    <option value="manager">Manager</option>
                                    <option value="staff">Staff</option>
                                    <option value="personal">Personal</option>
                                </select>
                            </div>
                            <div style="margin-bottom: 12px;">
                                <label style="font-size: 11px; color: #64748b; text-transform: uppercase; font-weight: 600;">Status</label>
                                <select id="founderStatusFilter" onchange="filterFounderUserList(document.getElementById('founderUserSearch').value)" 
                                    style="width: 100%; padding: 8px; border: 1px solid #e2e8f0; border-radius: 6px; font-size: 13px; margin-top: 4px;">
                                    <option value="">All Status</option>
                                    <option value="active">Active</option>
                                    <option value="inactive">Inactive</option>
                                </select>
                            </div>
                            <button onclick="clearFilters()" style="width: 100%; padding: 8px; background: #f1f5f9; border: none; border-radius: 6px; font-size: 12px; cursor: pointer; color: #64748b;">
                                Clear Filters
                            </button>
                        </div>
                    </div>
                    <button class="btn-outline" onclick="exportUserList()" style="padding: 10px 16px; white-space: nowrap;">
                        <i class="fas fa-download"></i> Export
                    </button>
                </div>
            </div>
            
            <!-- Users Table -->
            <div style="background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.06);">
                <div style="padding: 16px; border-bottom: 1px solid #e2e8f0;">
                    <h4 style="margin: 0; font-size: 15px; color: #1e293b;">
                        All Users <span id="founderUserCount" style="color: #94a3b8; font-weight: normal;">(${allSystemUsers.length})</span>
                    </h4>
                </div>
                <div style="overflow-x: auto;">
                    <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
                        <thead>
                            <tr style="background: #f8fafc;">
                                <th style="padding: 12px; text-align: left; font-weight: 600; color: #475569;">User</th>
                                <th style="padding: 12px; text-align: left; font-weight: 600; color: #475569;">Role</th>
                                <th style="padding: 12px; text-align: left; font-weight: 600; color: #475569;">Status</th>
                                <th style="padding: 12px; text-align: center; font-weight: 600; color: #475569;">Actions</th>
                            </tr>
                        </thead>
                        <tbody id="founderUsersTableBody">
                            ${allSystemUsers.map(user => {
                                const role = ROLES[user.role] || {};
                                const isActive = user.status === 'active' || !user.status;
                                return `
                                    <tr class="founder-user-row" data-uid="${user.id}" data-name="${(user.name || '').toLowerCase()}" data-email="${(user.email || '').toLowerCase()}" data-role="${user.role}" data-status="${user.status || 'active'}"
                                        style="transition: background 0.15s;" 
                                        onmouseover="this.style.background='#f8fafc'" 
                                        onmouseout="this.style.background=''">
                                        <td style="padding: 12px; border-bottom: 1px solid #f1f5f9;">
                                            <div style="display: flex; align-items: center; gap: 10px;">
                                                <div style="width: 36px; height: 36px; border-radius: 50%; background: ${role.color || '#6366f1'}20; display: flex; align-items: center; justify-content: center;">
                                                    <i class="fas ${role.icon || 'fa-user'}" style="color: ${role.color || '#6366f1'}; font-size: 14px;"></i>
                                                </div>
                                                <div>
                                                    <div style="font-weight: 500; color: #1e293b;">${escapeHtml(user.name || 'N/A')}</div>
                                                    <div style="font-size: 11px; color: #94a3b8;">${escapeHtml(user.email || 'N/A')}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td style="padding: 12px; border-bottom: 1px solid #f1f5f9;">
                                            <span style="background: ${role.color || '#6366f1'}15; color: ${role.color || '#6366f1'}; padding: 4px 10px; border-radius: 6px; font-size: 11px; font-weight: 500;">
                                                ${role.name || user.role}
                                            </span>
                                        </td>
                                        <td style="padding: 12px; border-bottom: 1px solid #f1f5f9;">
                                            <span style="background: ${isActive ? '#dcfce7' : '#fee2e2'}; color: ${isActive ? '#16a34a' : '#dc2626'}; padding: 4px 10px; border-radius: 6px; font-size: 11px; font-weight: 500;">
                                                ${isActive ? 'Active' : 'Inactive'}
                                            </span>
                                        </td>
                                        <td style="padding: 12px; border-bottom: 1px solid #f1f5f9; text-align: center;">
                                            <div style="display: flex; gap: 6px; justify-content: center;">
                                                <button onclick="showUserDetailModal('${user.id}')" style="padding: 6px 10px; border: none; background: #e0e7ff; color: #4338ca; border-radius: 6px; cursor: pointer; font-size: 11px;" title="View">
                                                    <i class="fas fa-eye"></i>
                                                </button>
                                                ${isActive ? `
                                                    <button onclick="toggleUserStatus('${user.id}', 'inactive')" style="padding: 6px 10px; border: none; background: #fef3c7; color: #d97706; border-radius: 6px; cursor: pointer; font-size: 11px;" title="Deactivate">
                                                        <i class="fas fa-ban"></i>
                                                    </button>
                                                ` : `
                                                    <button onclick="toggleUserStatus('${user.id}', 'active')" style="padding: 6px 10px; border: none; background: #dcfce7; color: #16a34a; border-radius: 6px; cursor: pointer; font-size: 11px;" title="Activate">
                                                        <i class="fas fa-check"></i>
                                                    </button>
                                                `}
                                                <button onclick="confirmDeleteUser('${user.id}')" style="padding: 6px 10px; border: none; background: #fee2e2; color: #dc2626; border-radius: 6px; cursor: pointer; font-size: 11px;" title="Delete">
                                                    <i class="fas fa-trash"></i>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                `;
                            }).join('')}
                        </tbody>
                    </table>
                </div>
                ${allSystemUsers.length === 0 ? `
                    <div style="padding: 40px; text-align: center; color: #94a3b8;">
                        <i class="fas fa-users" style="font-size: 32px; margin-bottom: 10px;"></i>
                        <p>No users found</p>
                    </div>
                ` : ''}
            </div>
        </div>
        
        <!-- TAB: Add Users (existing content) -->
        <div id="addUsersTab" style="display: ${activeTab === 'users' ? 'block' : 'none'};">
        ` : ''}
        
        <div class="user-management-stats">
            <div class="stat-card">
                <div class="stat-icon" style="background: linear-gradient(135deg, #2563eb, #3b82f6);">
                    <i class="fas fa-users"></i>
                </div>
                <div class="stat-info">
                    <span class="stat-value">${stats.total}</span>
                    <span class="stat-label">Total Users</span>
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-icon" style="background: linear-gradient(135deg, #10b981, #34d399);">
                    <i class="fas fa-user-check"></i>
                </div>
                <div class="stat-info">
                    <span class="stat-value">${stats.active}</span>
                    <span class="stat-label">Active</span>
                </div>
            </div>
            ${showSubscriptionStats ? `
                <div class="stat-card">
                    <div class="stat-icon" style="background: linear-gradient(135deg, #8b5cf6, #a78bfa);">
                        <i class="fas fa-building"></i>
                    </div>
                    <div class="stat-info">
                        <span class="stat-value">${stats.businessAdmins}</span>
                        <span class="stat-label">Businesses</span>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon" style="background: linear-gradient(135deg, #f59e0b, #fbbf24);">
                        <i class="fas fa-hourglass-half"></i>
                    </div>
                    <div class="stat-info">
                        <span class="stat-value">${stats.trials}</span>
                        <span class="stat-label">On Trial</span>
                    </div>
                </div>
            ` : `
                <div class="stat-card">
                    <div class="stat-icon" style="background: linear-gradient(135deg, #f59e0b, #fbbf24);">
                        <i class="fas fa-user-clock"></i>
                    </div>
                    <div class="stat-info">
                        <span class="stat-value">${stats.inactive}</span>
                        <span class="stat-label">Inactive</span>
                    </div>
                </div>
            `}
            </div>
        </div>
        
        ${showSubscriptionStats && Object.keys(planCounts).length > 0 ? `
            <div style="background: white; border-radius: 12px; padding: 16px; margin-bottom: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                <h4 style="margin: 0 0 12px 0; font-size: 14px; color: #334155;">
                    <i class="fas fa-chart-pie" style="margin-right: 8px; color: #8b5cf6;"></i>
                    Subscriptions by Plan
                </h4>
                <div style="display: flex; gap: 12px; flex-wrap: wrap;">
                    ${Object.entries(platformSettings?.plans || {}).map(([planId, plan]) => {
                        const count = planCounts[planId] || 0;
                        return `
                            <div style="display: flex; align-items: center; gap: 8px; background: ${plan.color}15; padding: 8px 12px; border-radius: 8px; border-left: 3px solid ${plan.color};">
                                <span style="font-weight: 600; color: ${plan.color};">${count}</span>
                                <span style="font-size: 12px; color: #64748b;">${plan.name}</span>
                            </div>
                        `;
                    }).join('')}
                    ${stats.expired > 0 ? `
                        <div style="display: flex; align-items: center; gap: 8px; background: #fef2f2; padding: 8px 12px; border-radius: 8px; border-left: 3px solid #ef4444;">
                            <span style="font-weight: 600; color: #ef4444;">${stats.expired}</span>
                            <span style="font-size: 12px; color: #64748b;">Expired</span>
                        </div>
                    ` : ''}
                </div>
            </div>
        ` : ''}
        
        <div class="users-list">
            ${visibleRoles.length === 0 ? `
                <div class="no-access-message" style="text-align: center; padding: 40px; color: #64748b;">
                    <i class="fas fa-user-lock" style="font-size: 48px; margin-bottom: 15px; opacity: 0.5;"></i>
                    <p>You can only view your own profile.</p>
                </div>
            ` : visibleRoles.map(roleId => {
                const role = ROLES[roleId];
                const roleUsers = usersByRole[roleId] || [];
                
                return `
                    <div class="role-section">
                        <div class="role-header">
                            <div class="role-title">
                                <i class="fas ${role.icon}" style="color: ${role.color}"></i>
                                <span>${role.name}</span>
                                <span class="role-count">${roleUsers.length}</span>
                            </div>
                            ${canManageRole(roleId) ? `
                                <button class="btn-outline btn-sm" onclick="showAddUserModal('${roleId}')">
                                    <i class="fas fa-plus"></i> Add ${role.name}
                                </button>
                            ` : ''}
                        </div>
                        <div class="role-users">
                            ${roleUsers.length === 0 ? `
                                <div class="no-users">No ${role.name.toLowerCase()}s yet</div>
                            ` : roleUsers.map(user => {
                                const platformSettingsLocal = typeof getPlatformSettings === 'function' ? getPlatformSettings() : null;
                                const userPlan = user.plan ? platformSettingsLocal?.plans?.[user.plan] : null;
                                const subscriptionsLocal = typeof getSubscriptions === 'function' ? getSubscriptions() : {};
                                const subscription = user.tenantId ? subscriptionsLocal[user.tenantId] : null;
                                const subscriptionStatus = subscription && typeof checkSubscriptionStatus === 'function' 
                                    ? checkSubscriptionStatus(user.tenantId) : null;
                                
                                return `
                                <div class="user-card ${user.status === 'inactive' ? 'inactive' : ''}">
                                    <div class="user-avatar" style="background: ${role.color}">
                                        <i class="fas ${role.icon}"></i>
                                    </div>
                                    <div class="user-details">
                                        <div class="user-name">${escapeHtml(user.name)}</div>
                                        <div class="user-email">${escapeHtml(user.email)}</div>
                                        <div class="user-uid"><i class="fas fa-id-badge"></i> UID: ${escapeHtml(user.id || 'N/A')}</div>
                                        <div class="user-meta">
                                            <span class="status-badge ${user.status}">${user.status}</span>
                                            ${user.role === 'business_admin' && userPlan ? `
                                                <span class="plan-badge" style="background: ${userPlan.color}; color: white; padding: 2px 8px; border-radius: 10px; font-size: 11px;">
                                                    ${userPlan.name}
                                                </span>
                                                ${subscription?.isFree || user.plan === 'personal' ? '<span style="background: #64748b; color: white; padding: 2px 6px; border-radius: 8px; font-size: 10px; margin-left: 4px;">FREE</span>' : 
                                                  subscription?.isTrial ? '<span style="background: #f59e0b; color: white; padding: 2px 6px; border-radius: 8px; font-size: 10px; margin-left: 4px;">TRIAL</span>' : ''}
                                            ` : `
                                                <span class="permissions-count">
                                                    <i class="fas fa-key"></i> ${user.permissions.includes('all') ? 'Full Access' : user.permissions.length + ' modules'}
                                                </span>
                                            `}
                                        </div>
                                        ${user.role === 'business_admin' && subscription ? `
                                            <div style="font-size: 11px; color: #64748b; margin-top: 4px;">
                                                ${subscription?.isFree || user.plan === 'personal' ? 
                                                    `<i class="fas fa-infinity" style="color: #10b981;"></i> Free forever - No expiry` :
                                                    subscriptionStatus?.valid ? 
                                                        `<i class="fas fa-check-circle" style="color: #10b981;"></i> Expires: ${new Date(subscription.expiresAt).toLocaleDateString()}` :
                                                        `<i class="fas fa-exclamation-circle" style="color: #ef4444;"></i> ${subscriptionStatus?.reason?.replace(/_/g, ' ') || 'Expired'}`
                                                }
                                                ${subscriptionStatus?.daysLeft !== undefined && !subscription?.isFree && user.plan !== 'personal' ? ` (${subscriptionStatus.daysLeft} days left)` : ''}
                                            </div>
                                        ` : ''}
                                    </div>
                                    <div class="user-actions">
                                        ${user.id !== currentUser.id && canManageRole(user.role) ? `
                                            <button class="btn-icon" onclick="editUser('${user.id}')" title="Edit">
                                                <i class="fas fa-edit"></i>
                                            </button>
                                            ${user.role === 'business_admin' ? `
                                                <button class="btn-icon" onclick="showChangePlanModal('${user.tenantId}')" title="Change Plan">
                                                    <i class="fas fa-box"></i>
                                                </button>
                                            ` : ''}
                                            <button class="btn-icon" onclick="toggleUserStatus('${user.id}')" title="${user.status === 'active' ? 'Deactivate' : 'Activate'}">
                                                <i class="fas fa-${user.status === 'active' ? 'ban' : 'check'}"></i>
                                            </button>
                                            <button class="btn-icon danger" onclick="deleteUser('${user.id}')" title="Delete">
                                                <i class="fas fa-trash"></i>
                                            </button>
                                        ` : ''}
                                        ${user.id === currentUser.id ? `
                                            <span class="current-user-badge">You</span>
                                        ` : ''}
                                    </div>
                                </div>
                            `}).join('')}
                        </div>
                    </div>
                `;
            }).join('')}
            
            ${(currentUser.role === 'business_admin' || currentUser.role === 'manager') ? `
                <div class="role-section" style="margin-top: 20px; border-top: 2px solid #e2e8f0; padding-top: 20px;">
                    <div class="role-header">
                        <div class="role-title">
                            <i class="fas fa-user" style="color: ${ROLES[currentUser.role]?.color}"></i>
                            <span>Your Profile</span>
                        </div>
                    </div>
                    <div class="role-users">
                        <div class="user-card">
                            <div class="user-avatar" style="background: ${ROLES[currentUser.role]?.color}">
                                <i class="fas ${ROLES[currentUser.role]?.icon}"></i>
                            </div>
                            <div class="user-details">
                                <div class="user-name">${escapeHtml(currentUser.name)}</div>
                                <div class="user-email">${escapeHtml(currentUser.email)}</div>
                                <div class="user-uid"><i class="fas fa-id-badge"></i> UID: ${escapeHtml(currentUser.id || 'N/A')}</div>
                                <div class="user-meta">
                                    <span class="status-badge ${currentUser.status}">${currentUser.status}</span>
                                    <span class="role-badge" style="background: ${ROLES[currentUser.role]?.color}; color: white; padding: 2px 8px; border-radius: 10px; font-size: 11px;">
                                        ${ROLES[currentUser.role]?.name}
                                    </span>
                                </div>
                            </div>
                            <div class="user-actions">
                                <span class="current-user-badge">You</span>
                            </div>
                        </div>
                    </div>
                </div>
            ` : ''}
        </div>
        
        ${isFounder ? `</div>` : ''}
    `;
}

// ==================== ADD USER MODAL ====================

function showAddUserModal(roleId = 'staff') {
    const isFounder = window.currentUser?.role === 'founder';
    
    if (!isFounder && (roleId === 'staff' || roleId === 'manager')) {
        const allUsers = JSON.parse(localStorage.getItem('ezcubic_users') || '[]');
        const currentTenantId = window.currentUser?.tenantId;
        const tenantUsers = allUsers.filter(u => u.tenantId === currentTenantId);
        const tenantUserCount = tenantUsers.length;
        
        const platformSettings = typeof getPlatformSettings === 'function' ? getPlatformSettings() : null;
        const userPlan = window.currentUser?.plan || 'starter';
        const planLimits = platformSettings?.plans?.[userPlan]?.limits;
        const userLimit = planLimits?.users !== undefined ? planLimits.users : 3;
        
        if (userLimit !== -1 && tenantUserCount >= userLimit) {
            showUserLimitModal(userPlan, tenantUserCount, userLimit);
            return;
        }
    }
    
    const role = ROLES[roleId];
    const platformSettings = typeof getPlatformSettings === 'function' ? getPlatformSettings() : null;
    const plans = platformSettings?.plans || {
        personal: { name: 'Personal', price: 0, color: '#64748b' },
        starter: { name: 'Starter', price: 49, color: '#3b82f6' },
        professional: { name: 'Professional', price: 149, color: '#8b5cf6' },
        enterprise: { name: 'Enterprise', price: 399, color: '#f59e0b' }
    };
    
    const showPlanSelector = roleId === 'business_admin';
    const showERPModules = roleId === 'staff' || roleId === 'manager';
    
    const ownerPlan = window.currentUser?.plan || 'starter';
    const ownerPlanConfig = platformSettings?.plans?.[ownerPlan] || plans[ownerPlan];
    const ownerFeatures = ownerPlanConfig?.features || [];
    const hasAllFeatures = ownerFeatures.includes('all');
    
    const filteredCategories = ERP_MODULE_CATEGORIES.map(category => {
        const allowedModules = category.modules.filter(module => {
            return hasAllFeatures || ownerFeatures.includes(module.id);
        });
        return { ...category, modules: allowedModules };
    }).filter(category => category.modules.length > 0);
    
    const totalAvailableModules = filteredCategories.reduce((sum, cat) => sum + cat.modules.length, 0);
    
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
                    
                    ${showPlanSelector ? `
                    <div class="form-group" style="margin-bottom: 20px;">
                        <label class="form-label"><i class="fas fa-box"></i> Subscription Plan *</label>
                        <div class="plan-selector" style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px;">
                            ${Object.entries(plans).filter(([planId]) => planId !== 'personal').map(([planId, plan]) => {
                                const featureCount = plan.features?.includes('all') ? 'All Features' : `${plan.features?.length || 0} modules`;
                                return `
                                <label class="plan-option" style="border: 2px solid ${planId === 'starter' ? plan.color : '#e2e8f0'}; border-radius: 10px; padding: 12px; cursor: pointer;">
                                    <div style="display: flex; align-items: center; gap: 10px;">
                                        <input type="radio" name="userPlan" value="${planId}" ${planId === 'starter' ? 'checked' : ''} onchange="highlightSelectedPlan(this)">
                                        <div style="flex: 1;">
                                            <div style="font-weight: 600; color: ${plan.color};">${plan.name}</div>
                                            <div style="font-size: 12px; color: #64748b;">${plan.price === 0 ? 'Free' : `RM${plan.price}/mo`}</div>
                                        </div>
                                    </div>
                                    <div style="font-size: 10px; color: #94a3b8; padding-left: 28px;">${featureCount}</div>
                                </label>
                            `}).join('')}
                        </div>
                        <div id="planFeaturePreview" style="margin-top: 10px; padding: 10px; background: #f8fafc; border-radius: 8px; font-size: 11px;"></div>
                    </div>
                    ` : ''}
                    
                    ${showERPModules ? `
                    <div class="form-group">
                        <label class="form-label"><i class="fas fa-key"></i> Module Access Permissions</label>
                        <div class="permissions-grid">
                            <label class="permission-item full-access" style="margin-bottom: 12px; background: linear-gradient(135deg, #10b98115, #10b98105); border: 1px solid #10b981; border-radius: 8px; padding: 10px;">
                                <input type="checkbox" id="permFullAccess" onchange="toggleFullAccess(this)">
                                <span><i class="fas fa-shield-alt" style="color: #10b981;"></i> Full Access</span>
                            </label>
                            <div class="permissions-categories" id="permissionsModules" style="max-height: 350px; overflow-y: auto;">
                                ${filteredCategories.map(category => `
                                    <div class="permission-category" style="margin-bottom: 10px; border: 1px solid #e2e8f0; border-radius: 8px;">
                                        <div class="category-header" onclick="togglePermissionCategory('${category.id}')" style="background: ${category.color}15; padding: 10px 12px; cursor: pointer; display: flex; align-items: center; justify-content: space-between;">
                                            <label style="display: flex; align-items: center; gap: 10px; cursor: pointer; flex: 1;">
                                                <input type="checkbox" class="category-checkbox" data-category="${category.id}" onchange="toggleCategoryModules('${category.id}', this.checked)">
                                                <i class="fas ${category.icon}" style="color: ${category.color};"></i>
                                                <span style="font-weight: 600;">${category.name}</span>
                                                <span class="category-count" id="count-${category.id}" style="background: ${category.color}; color: white; font-size: 10px; padding: 2px 6px; border-radius: 10px;">0/${category.modules.length}</span>
                                            </label>
                                            <i class="fas fa-chevron-down category-toggle" id="toggle-${category.id}"></i>
                                        </div>
                                        <div class="category-modules" id="modules-${category.id}" style="padding: 8px 12px; display: none;">
                                            ${category.modules.map(module => `
                                                <label class="permission-item" style="display: flex; align-items: center; gap: 8px; padding: 6px 0;">
                                                    <input type="checkbox" name="permissions" value="${module.id}" data-category="${category.id}" onchange="updateCategoryCount('${category.id}')" ${role.defaultPermissions.includes(module.id) || role.defaultPermissions.includes('all') ? 'checked' : ''}>
                                                    <i class="fas ${module.icon}" style="color: #64748b;"></i>
                                                    <span style="font-size: 13px;">${module.name}</span>
                                                </label>
                                            `).join('')}
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    </div>
                    ` : ''}
                    
                    <div class="modal-footer">
                        <button type="button" class="btn-secondary" onclick="closeModal('addUserModal')">Cancel</button>
                        <button type="submit" class="btn-primary"><i class="fas fa-save"></i> Create User</button>
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
        }
        if (showPlanSelector) {
            const checkedPlan = document.querySelector('input[name="userPlan"]:checked');
            if (checkedPlan) highlightSelectedPlan(checkedPlan);
        }
    }, 50);
}

// ==================== PERMISSION CATEGORY FUNCTIONS ====================

function togglePermissionCategory(categoryId) {
    const modules = document.getElementById(`modules-${categoryId}`);
    const toggle = document.getElementById(`toggle-${categoryId}`);
    
    if (modules.style.display === 'none') {
        modules.style.display = 'block';
        toggle.style.transform = 'rotate(180deg)';
    } else {
        modules.style.display = 'none';
        toggle.style.transform = 'rotate(0deg)';
    }
}

function toggleCategoryModules(categoryId, checked) {
    const checkboxes = document.querySelectorAll(`input[data-category="${categoryId}"]`);
    checkboxes.forEach(cb => {
        if (!cb.disabled) cb.checked = checked;
    });
    updateCategoryCount(categoryId);
}

function updateCategoryCount(categoryId) {
    const checkboxes = document.querySelectorAll(`input[data-category="${categoryId}"]`);
    const total = checkboxes.length;
    const checked = Array.from(checkboxes).filter(cb => cb.checked).length;
    
    const countEl = document.getElementById(`count-${categoryId}`);
    if (countEl) countEl.textContent = `${checked}/${total}`;
    
    const categoryCheckbox = document.querySelector(`input.category-checkbox[data-category="${categoryId}"]`);
    if (categoryCheckbox) {
        categoryCheckbox.checked = checked === total && total > 0;
        categoryCheckbox.indeterminate = checked > 0 && checked < total;
    }
}

function toggleFullAccess(checkbox) {
    const modules = document.querySelectorAll('#permissionsModules input[type="checkbox"]');
    modules.forEach(cb => {
        cb.checked = checkbox.checked;
        cb.disabled = checkbox.checked;
    });
    ERP_MODULE_CATEGORIES.forEach(cat => updateCategoryCount(cat.id));
}

// ==================== EDIT USER MODAL ====================

function editUser(userId) {
    const user = users.find(u => u.id === userId);
    if (!user) return;
    
    const role = ROLES[user.role];
    let filteredModules = ERP_MODULES;
    
    const modalHTML = `
        <div class="modal show" id="editUserModal">
            <div class="modal-content" style="max-width: 550px;">
                <div class="modal-header">
                    <h3 class="modal-title"><i class="fas fa-user-edit"></i> Edit User</h3>
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
                                ${Object.entries(ROLES).filter(([roleId]) => roleId !== 'founder' && (canManageRole(roleId) || roleId === user.role)).map(([roleId, r]) => `
                                    <option value="${roleId}" ${roleId === user.role ? 'selected' : ''}>${r.name}</option>
                                `).join('')}
                            </select>
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <label class="form-label">ERP Module Access</label>
                        <div class="permissions-grid">
                            <label class="permission-item full-access">
                                <input type="checkbox" id="editPermFullAccess" onchange="toggleFullAccess(this)" ${user.permissions.includes('all') ? 'checked' : ''}>
                                <span><i class="fas fa-shield-alt"></i> Full Access</span>
                            </label>
                            <div class="permissions-modules" id="editPermissionsModules">
                                ${filteredModules.map(module => `
                                    <label class="permission-item">
                                        <input type="checkbox" name="editPermissions" value="${module.id}" ${user.permissions.includes('all') || user.permissions.includes(module.id) ? 'checked' : ''} ${user.permissions.includes('all') ? 'disabled' : ''}>
                                        <span><i class="fas ${module.icon}"></i> ${module.name}</span>
                                    </label>
                                `).join('')}
                            </div>
                        </div>
                    </div>
                    
                    <div class="modal-footer">
                        <button type="button" class="btn-secondary" onclick="closeModal('editUserModal')">Cancel</button>
                        <button type="submit" class="btn-primary"><i class="fas fa-save"></i> Update User</button>
                    </div>
                </form>
            </div>
        </div>
    `;
    
    document.getElementById('editUserModal')?.remove();
    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

// ==================== USER DETAIL MODAL ====================

function showUserDetailModal(userId) {
    const user = users.find(u => u.id === userId);
    if (!user) {
        showToast('User not found', 'error');
        return;
    }
    
    document.getElementById('userDetailModal')?.remove();
    
    const platformSettings = typeof getPlatformSettings === 'function' ? getPlatformSettings() : null;
    const role = ROLES[user.role] || {};
    const plan = platformSettings?.plans?.[user.plan];
    
    const modalHTML = `
        <div class="modal show" id="userDetailModal" style="z-index: 10005;">
            <div class="modal-content" style="max-width: 600px;">
                <div class="modal-header" style="background: linear-gradient(135deg, ${role.color || '#6366f1'}, ${role.color || '#6366f1'}dd);">
                    <h3 class="modal-title" style="color: white;"><i class="fas ${role.icon || 'fa-user'}"></i> User Details</h3>
                    <button class="modal-close" onclick="closeModal('userDetailModal')" style="color: white;">&times;</button>
                </div>
                <div class="modal-body" style="padding: 20px;">
                    <div style="display: flex; align-items: center; gap: 15px; margin-bottom: 20px;">
                        <div style="width: 60px; height: 60px; border-radius: 50%; background: ${role.color || '#6366f1'}; display: flex; align-items: center; justify-content: center;">
                            <i class="fas ${role.icon || 'fa-user'}" style="font-size: 24px; color: white;"></i>
                        </div>
                        <div>
                            <div style="font-size: 18px; font-weight: 600;">${escapeHtml(user.name || 'N/A')}</div>
                            <div style="color: #64748b;">${escapeHtml(user.email || 'N/A')}</div>
                            <span style="background: ${role.color || '#6366f1'}20; color: ${role.color || '#6366f1'}; padding: 3px 10px; border-radius: 12px; font-size: 12px;">${role.name || user.role}</span>
                        </div>
                    </div>
                    <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px;">
                        <div style="background: #f8fafc; padding: 12px; border-radius: 8px;">
                            <div style="font-size: 11px; color: #64748b;">User ID</div>
                            <div style="font-family: monospace; color: #4338ca;">${user.id}</div>
                        </div>
                        <div style="background: #f8fafc; padding: 12px; border-radius: 8px;">
                            <div style="font-size: 11px; color: #64748b;">Tenant ID</div>
                            <div style="font-family: monospace; color: #4338ca;">${user.tenantId || 'N/A'}</div>
                        </div>
                        <div style="background: #f8fafc; padding: 12px; border-radius: 8px;">
                            <div style="font-size: 11px; color: #64748b;">Plan</div>
                            <div>${plan ? `<span style="background: ${plan.color}; color: white; padding: 3px 10px; border-radius: 12px; font-size: 12px;">${plan.name}</span>` : 'N/A'}</div>
                        </div>
                        <div style="background: #f8fafc; padding: 12px; border-radius: 8px;">
                            <div style="font-size: 11px; color: #64748b;">Status</div>
                            <div><span style="background: ${user.status === 'active' ? '#dcfce7' : '#fee2e2'}; color: ${user.status === 'active' ? '#16a34a' : '#dc2626'}; padding: 3px 10px; border-radius: 12px; font-size: 12px;">${user.status || 'active'}</span></div>
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn-secondary" onclick="closeModal('userDetailModal')">Close</button>
                    <button class="btn-primary" onclick="closeModal('userDetailModal'); editUser('${user.id}')"><i class="fas fa-edit"></i> Edit</button>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

// ==================== DELETE CONFIRMATION MODAL ====================

function confirmDeleteUser(userId) {
    const user = users.find(u => u.id === userId);
    if (!user) return;
    
    document.getElementById('confirmDeleteUserModal')?.remove();
    
    const confirmHTML = `
        <div class="modal show" id="confirmDeleteUserModal" style="z-index: 10006;">
            <div class="modal-content" style="max-width: 420px;">
                <div class="modal-header" style="background: linear-gradient(135deg, #dc2626, #ef4444);">
                    <h3 class="modal-title" style="color: white;"><i class="fas fa-exclamation-triangle"></i> Delete User</h3>
                    <button class="modal-close" onclick="closeModal('confirmDeleteUserModal')" style="color: white;">&times;</button>
                </div>
                <div class="modal-body" style="text-align: center; padding: 30px;">
                    <p>Are you sure you want to delete <strong>${escapeHtml(user.name)}</strong>?</p>
                    <p style="color: #dc2626; font-size: 13px;"><i class="fas fa-warning"></i> This action cannot be undone!</p>
                </div>
                <div class="modal-footer" style="justify-content: center; gap: 12px;">
                    <button class="btn-secondary" onclick="closeModal('confirmDeleteUserModal')">Cancel</button>
                    <button class="btn-danger" onclick="executeDeleteUser('${user.id}')"><i class="fas fa-trash-alt"></i> Delete</button>
                </div>
            </div>
        </div>
    `;
    
    closeModal('userDetailModal');
    document.body.insertAdjacentHTML('beforeend', confirmHTML);
}

// ==================== USER LIMIT MODAL ====================

function showUserLimitModal(planName, currentCount, limit) {
    document.getElementById('userLimitModal')?.remove();
    
    const planDisplayName = planName.charAt(0).toUpperCase() + planName.slice(1);
    
    const modalHTML = `
        <div class="modal show" id="userLimitModal" style="z-index: 10005;">
            <div style="background: white; max-width: 480px; border-radius: 16px; overflow: hidden; margin: auto;">
                <div style="background: linear-gradient(135deg, #ef4444, #dc2626); padding: 25px; text-align: center; color: white;">
                    <div style="font-size: 50px;">⚠️</div>
                    <h2 style="margin: 10px 0 0;">User Limit Reached</h2>
                </div>
                <div style="padding: 25px; text-align: center;">
                    <div style="background: #fef2f2; border-radius: 12px; padding: 20px; margin-bottom: 20px;">
                        <div style="font-size: 36px; font-weight: 700; color: #dc2626;">${currentCount} / ${limit}</div>
                        <div style="color: #991b1b;">Users in your account</div>
                    </div>
                    <p style="color: #64748b;">Your <strong>${planDisplayName} Plan</strong> allows ${limit} users. Upgrade to add more.</p>
                    <button onclick="document.getElementById('userLimitModal').remove()" style="padding: 12px 25px; border-radius: 8px; background: #e2e8f0; border: none; cursor: pointer; font-weight: 600;">Close</button>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

// ==================== WINDOW EXPORTS ====================
window.renderUserManagementUI = renderUserManagementUI;
window.showAddUserModal = showAddUserModal;
window.togglePermissionCategory = togglePermissionCategory;
window.toggleCategoryModules = toggleCategoryModules;
window.updateCategoryCount = updateCategoryCount;
window.toggleFullAccess = toggleFullAccess;
window.editUser = editUser;
window.showUserDetailModal = showUserDetailModal;
window.confirmDeleteUser = confirmDeleteUser;
window.showUserLimitModal = showUserLimitModal;
