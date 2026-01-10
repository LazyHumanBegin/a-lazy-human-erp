/**
 * Ez.Smart User Management Module - PART A (Display)
 * ===================================================
 * Extracted from users.js for modular architecture
 * 
 * PART A: Display & Filtering Functions
 * - showUserManagement() - Main entry point
 * - renderUserManagement() - Render user list UI
 * - renderUserCard() - Individual user card HTML
 * - switchUserMgmtTab() - Tab switching for Founder
 * - toggleFilterDropdown() - Filter UI toggle
 * - clearFilters() - Reset all filters
 * - filterFounderUserList() - Search/filter users
 * 
 * PART B (user-management-crud.js): Add/Edit/Delete Operations
 * - showAddUserModal(), saveNewUser()
 * - editUser(), updateUser()
 * - toggleUserStatus(), deleteUser()
 * - Permission category toggle functions
 * - showUserDetailModal(), exportUserList()
 * 
 * Dependencies:
 * - ROLES, ERP_MODULES, ERP_MODULE_CATEGORIES from permissions.js
 * - currentUser, users, saveUsers() from users.js
 * - canAccessModule(), canManageRole() from permissions.js
 * - escapeHtml(), showToast(), closeModal() from ui.js
 * - getPlatformSettings(), getSubscriptions(), checkSubscriptionStatus() from platform-control.js
 * 
 * Version: 1.0.0
 * Last Updated: 2024-12-29
 */

(function() {
    'use strict';
    
    // ==================== USER MANAGEMENT MAIN ====================
    
    /**
     * Show user management section
     */
    function showUserManagement() {
        const container = document.getElementById('user-management');
        if (!container) return;
        
        if (!currentUser || !canAccessModule('users')) {
            container.innerHTML = `
                <div class="access-denied">
                    <i class="fas fa-lock"></i>
                    <h3>Access Denied</h3>
                    <p>You don't have permission to access User Management</p>
                </div>
            `;
            return;
        }
        
        renderUserManagement();
    }
    
    /**
     * Render user management UI
     */
    function renderUserManagement() {
        const container = document.getElementById('userManagementContent');
        if (!container) return;
        
        // CRITICAL: Always read fresh users from localStorage to ensure we have latest data
        // This fixes issues where plan changes don't reflect until page refresh
        let freshUsers = JSON.parse(localStorage.getItem('ezcubic_users') || '[]');
        
        // Filter out deleted users and users from deleted tenants
        const deletedUsers = JSON.parse(localStorage.getItem('ezcubic_deleted_users') || '[]');
        const deletedTenants = JSON.parse(localStorage.getItem('ezcubic_deleted_tenants') || '[]');
        
        // AUTO-CLEANUP: Actually remove deleted users from localStorage (not just filter)
        // This ensures they never come back
        if (deletedUsers.length > 0 || deletedTenants.length > 0) {
            const beforeCount = freshUsers.length;
            freshUsers = freshUsers.filter(u => {
                // Never delete founder
                if (u.role === 'founder') return true;
                
                const isUserDeleted = deletedUsers.includes(u.id) || deletedUsers.includes(u.email);
                const isTenantDeleted = u.tenantId && deletedTenants.includes(u.tenantId);
                
                if (isUserDeleted || isTenantDeleted) {
                    console.log('🧹 Auto-removing deleted user from storage:', u.email);
                    return false;
                }
                return true;
            });
            
            // Save cleaned list back to localStorage
            if (freshUsers.length !== beforeCount) {
                localStorage.setItem('ezcubic_users', JSON.stringify(freshUsers));
                console.log(`🧹 Cleaned ${beforeCount - freshUsers.length} deleted users from localStorage`);
            }
        }
        
        const activeUsers = freshUsers;
        
        if (window.users) {
            window.users = activeUsers;
        }
        // Use filtered data
        const users = activeUsers;
        
        // Determine which roles to show based on current user's role
        let visibleRoles = [];
        let manageableUsers = [];
        
        // For Founder: Show ALL users in the system for monitoring
        const isFounder = currentUser.role === 'founder';
        const allSystemUsers = isFounder ? users.filter(u => u.role !== 'founder') : [];
        
        if (currentUser.role === 'founder') {
            // Founder sees platform-level roles only (not tenant-level manager/staff)
            visibleRoles = ['erp_assistant', 'business_admin', 'personal'];
            manageableUsers = users.filter(u => u.role !== 'founder' && u.role !== 'manager' && u.role !== 'staff');
        } else if (currentUser.role === 'erp_assistant') {
            // ERP Assistant only sees Business Admins and Personal users they can manage
            visibleRoles = ['business_admin', 'personal'];
            manageableUsers = users.filter(u => u.role === 'business_admin' || u.role === 'personal');
        } else if (currentUser.role === 'business_admin') {
            // Business Admin sees Manager and Staff within their tenant only
            visibleRoles = ['manager', 'staff'];
            manageableUsers = users.filter(u => 
                (u.role === 'manager' || u.role === 'staff') && 
                u.tenantId === currentUser.tenantId
            );
            // Also show themselves
            manageableUsers.push(currentUser);
        } else if (currentUser.role === 'manager') {
            // Manager sees Staff within their tenant only
            visibleRoles = ['staff'];
            manageableUsers = users.filter(u => 
                u.role === 'staff' && 
                u.tenantId === currentUser.tenantId
            );
            // Also show themselves
            manageableUsers.push(currentUser);
        } else {
            // Staff can only see themselves
            visibleRoles = [];
            manageableUsers = [currentUser];
        }
        
        // Group by role
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
                        <button class="btn-outline" onclick="purgeDeletedData()" style="padding: 10px 16px; white-space: nowrap; background: #fef2f2; border-color: #fecaca; color: #dc2626;">
                            <i class="fas fa-trash-alt"></i> Purge Deleted
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
                                ` : roleUsers.map(user => renderUserCard(user, role)).join('')}
                            </div>
                        </div>
                    `;
                }).join('')}
                
                ${/* Show current user's own profile if they're viewing limited roles */
                (currentUser.role === 'business_admin' || currentUser.role === 'manager') ? `
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
    
    /**
     * Render individual user card
     */
    function renderUserCard(user, role) {
        // Get plan info for business_admin users
        const platformSettings = typeof getPlatformSettings === 'function' ? getPlatformSettings() : null;
        const userPlan = user.plan ? platformSettings?.plans?.[user.plan] : null;
        const subscriptions = typeof getSubscriptions === 'function' ? getSubscriptions() : {};
        const subscription = user.tenantId ? subscriptions[user.tenantId] : null;
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
        `;
    }
    
    // ==================== TAB SWITCHING & FILTER FUNCTIONS ====================
    
    /**
     * Switch between User Management tabs
     */
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
    
    /**
     * Toggle filter dropdown visibility
     */
    function toggleFilterDropdown() {
        const dropdown = document.getElementById('filterDropdown');
        if (dropdown) {
            dropdown.style.display = dropdown.style.display === 'none' ? 'block' : 'none';
        }
    }
    
    /**
     * Clear all filters
     */
    function clearFilters() {
        const roleFilter = document.getElementById('founderRoleFilter');
        const statusFilter = document.getElementById('founderStatusFilter');
        const searchInput = document.getElementById('founderUserSearch');
        
        if (roleFilter) roleFilter.value = '';
        if (statusFilter) statusFilter.value = '';
        if (searchInput) searchInput.value = '';
        
        // Re-apply filter (which will show all)
        filterFounderUserList('');
        
        // Close dropdown
        const dropdown = document.getElementById('filterDropdown');
        if (dropdown) dropdown.style.display = 'none';
    }
    
    /**
     * Filter founder user list
     */
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
            
            // Check search term
            const matchesSearch = !searchTerm || 
                uid.includes(searchLower) || 
                name.includes(searchLower) || 
                email.includes(searchLower);
            
            // Check filters
            const matchesRole = !roleFilter || role === roleFilter;
            const matchesPlan = !planFilter || plan === planFilter;
            const matchesStatus = !statusFilter || status === statusFilter;
            
            const isVisible = matchesSearch && matchesRole && matchesPlan && matchesStatus;
            row.style.display = isVisible ? '' : 'none';
            
            if (isVisible) visibleCount++;
        });
        
        // Update count
        const countEl = document.getElementById('founderUserCount');
        if (countEl) {
            countEl.textContent = `(${visibleCount})`;
        }
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
    
    // ==================== PURGE DELETED DATA ====================
    /**
     * Permanently purge deleted users/subscriptions from both local and cloud
     */
    async function purgeDeletedData() {
        if (!confirm('⚠️ Purge all deleted users and subscriptions?\n\nThis will permanently remove:\n- Deleted user tracking\n- Deleted subscription tracking\n- The actual deleted users/subscriptions from cloud\n\nFrom both local storage AND cloud database.\n\nThis action cannot be undone.')) {
            return;
        }
        
        try {
            // Get deleted lists
            const deletedUsers = JSON.parse(localStorage.getItem('ezcubic_deleted_users') || '[]');
            const deletedTenants = JSON.parse(localStorage.getItem('ezcubic_deleted_tenants') || '[]');
            
            const deleteCount = deletedUsers.length + deletedTenants.length;
            
            if (deleteCount === 0) {
                showToast('No deleted data to purge', 'info');
                return;
            }
            
            console.log('🗑️ Purging deleted data:', { users: deletedUsers, tenants: deletedTenants });
            
            // STEP 1: Clear tracking lists from local FIRST
            localStorage.removeItem('ezcubic_deleted_users');
            localStorage.removeItem('ezcubic_deleted_tenants');
            console.log('🗑️ Cleared local deletion tracking lists');
            
            // STEP 2: Clean localStorage data (users, tenants, subscriptions)
            const USERS_KEY = 'ezcubic_users';
            const TENANTS_KEY = 'ezcubic_tenants';
            const SUBS_KEY = 'ezcubic_subscriptions';
            
            // Clean users
            const localUsers = JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
            const cleanedLocalUsers = localUsers.filter(u => 
                !deletedUsers.includes(u.id) && 
                !deletedUsers.includes(u.email)
            );
            localStorage.setItem(USERS_KEY, JSON.stringify(cleanedLocalUsers));
            console.log(`🗑️ Cleaned localStorage users: ${localUsers.length} → ${cleanedLocalUsers.length}`);
            
            // Clean tenants
            const localTenants = JSON.parse(localStorage.getItem(TENANTS_KEY) || '{}');
            deletedTenants.forEach(tenantId => delete localTenants[tenantId]);
            localStorage.setItem(TENANTS_KEY, JSON.stringify(localTenants));
            console.log(`🗑️ Cleaned localStorage tenants: removed ${deletedTenants.length}`);
            
            // Clean subscriptions
            const localSubs = JSON.parse(localStorage.getItem(SUBS_KEY) || '{}');
            deletedTenants.forEach(tenantId => delete localSubs[tenantId]);
            localStorage.setItem(SUBS_KEY, JSON.stringify(localSubs));
            console.log(`🗑️ Cleaned localStorage subscriptions: removed ${deletedTenants.length}`);
            
            // Also remove from window globals if exists
            if (window.users) {
                window.users = window.users.filter(u => 
                    !deletedUsers.includes(u.id) && 
                    !deletedUsers.includes(u.email)
                );
            }
            
            // STEP 3: Upload cleaned data to cloud (overwrite)
            if (typeof window.directUploadUsersToCloud === 'function') {
                console.log('📤 Uploading cleaned data to cloud...');
                await window.directUploadUsersToCloud(false);
                console.log('✅ Cloud updated with cleaned data');
            } else {
                console.warn('⚠️ directUploadUsersToCloud not available - cloud not updated');
            }
            
            // STEP 4: Delete tracking lists from cloud (so other devices stop filtering)
            if (typeof getUsersSupabaseClient === 'function') {
                const client = getUsersSupabaseClient();
                if (client) {
                    console.log('🗑️ Removing deletion tracking from cloud...');
                    try {
                        await client
                            .from('tenant_data')
                            .delete()
                            .eq('tenant_id', 'global')
                            .eq('data_key', 'ezcubic_deleted_users');
                        
                        await client
                            .from('tenant_data')
                            .delete()
                            .eq('tenant_id', 'global')
                            .eq('data_key', 'ezcubic_deleted_tenants');
                        
                        console.log('✅ Deletion tracking removed from cloud');
                    } catch (err) {
                        console.warn('⚠️ Could not remove tracking from cloud:', err);
                    }
                }
            }
            
            showToast(`✅ Purged ${deleteCount} deleted items from local & cloud`, 'success');
            
            // Refresh UI without reload - safer and faster
            if (typeof renderUserManagement === 'function') {
                renderUserManagement();
            }
            
        } catch (err) {
            console.error('❌ Purge failed:', err);
            showToast('Failed to purge deleted data: ' + err.message, 'error');
        }
    }
    
    // ==================== EXPORTS ====================
    window.showUserManagement = showUserManagement;
    window.renderUserManagement = renderUserManagement;
    window.renderUserCard = renderUserCard;
    window.switchUserMgmtTab = switchUserMgmtTab;
    window.toggleFilterDropdown = toggleFilterDropdown;
    window.clearFilters = clearFilters;
    window.filterFounderUserList = filterFounderUserList;
    window.purgeDeletedData = purgeDeletedData;
    
    console.log('👥 User Management module loaded (Part A: Display)');
    
})();
