/**
 * Ez.Smart User Management Module - PART C (Actions)
 * ===================================================
 * Extracted from users.js for modular architecture
 * 
 * PART C: User Action Operations
 * - toggleUserStatus() - activate/deactivate users
 * - deleteUser() - delete user with confirmation
 * - confirmDeleteUser(), executeDeleteUser() - delete confirmation modal
 * - showUserLimitModal() - plan limit warning modal
 * - showUserDetailModal() - view user details
 * - exportUserList() - export users to CSV
 * 
 * Dependencies:
 * - ROLES from permissions.js
 * - currentUser, users, saveUsers() from users.js
 * - escapeHtml(), showToast(), closeModal() from ui.js
 * - getPlatformSettings(), getSubscriptions(), checkSubscriptionStatus() from platform-control.js
 * - renderUserManagement() from user-management.js (Part A)
 * - getTenants(), saveTenants(), getSubscriptions(), saveSubscriptions() from multi-tenant.js
 * 
 * Version: 1.0.0
 * Last Updated: 2024-12-29
 */

(function() {
    'use strict';
    
    // ==================== TOGGLE USER STATUS ====================
    
    /**
     * Toggle user status (activate/deactivate)
     * Basic version for Business Admin use
     */
    function toggleUserStatus(userId, newStatus) {
        // If newStatus is provided, this is called from Founder control panel
        if (newStatus !== undefined) {
            // Founder-only status change
            if (currentUser.role !== 'founder') {
                showToast('Only founder can change user status', 'error');
                return;
            }
            
            const user = users.find(u => u.id === userId);
            if (!user) {
                showToast('User not found', 'error');
                return;
            }
            
            // Update status
            user.status = newStatus;
            user.updatedAt = new Date().toISOString();
            
            // Close modal first to prevent UI hang
            closeModal('userDetailModal');
            
            // Save locally first (skip cloud sync to prevent lag)
            localStorage.setItem('ezcubic_users', JSON.stringify(users));
            
            // Show feedback immediately
            showToast(`User ${user.name || user.email} has been ${newStatus === 'active' ? 'activated' : 'deactivated'}`, 'success');
            
            // Re-render UI
            renderUserManagement();
            
            // Schedule cloud sync in background (delayed)
            setTimeout(() => {
                if (typeof window.fullCloudSync === 'function') {
                    window.fullCloudSync().catch(err => console.warn('Background sync failed:', err));
                }
            }, 1000);
            
            return;
        }
        
        // Standard toggle (Business Admin use)
        const user = users.find(u => u.id === userId);
        if (!user || user.role === 'founder') return;
        
        user.status = user.status === 'active' ? 'inactive' : 'active';
        user.updatedAt = new Date().toISOString();
        
        saveUsers();
        renderUserManagement();
        showToast(`User ${user.status === 'active' ? 'activated' : 'deactivated'}`, 'success');
    }
    
    // ==================== DELETE USER ====================
    
    /**
     * Delete user (simple confirmation)
     */
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
    
    /**
     * Confirm delete user - Founder only (with modal)
     */
    function confirmDeleteUser(userId) {
        if (currentUser.role !== 'founder') {
            showToast('Only founder can delete users', 'error');
            return;
        }
        
        const user = users.find(u => u.id === userId);
        if (!user) {
            showToast('User not found', 'error');
            return;
        }
        
        // Remove existing modal if any to prevent hanging
        const existingModal = document.getElementById('confirmDeleteUserModal');
        if (existingModal) {
            existingModal.remove();
        }
        
        const confirmHTML = `
            <div class="modal show" id="confirmDeleteUserModal" style="z-index: 10006;">
                <div class="modal-content" style="max-width: 420px;">
                    <div class="modal-header" style="background: linear-gradient(135deg, #dc2626, #ef4444);">
                        <h3 class="modal-title" style="color: white;">
                            <i class="fas fa-exclamation-triangle"></i> Delete User
                        </h3>
                        <button class="modal-close" onclick="closeModal('confirmDeleteUserModal')" style="color: white;">&times;</button>
                    </div>
                    <div class="modal-body" style="text-align: center; padding: 30px;">
                        <div style="width: 70px; height: 70px; border-radius: 50%; background: #fee2e2; display: flex; align-items: center; justify-content: center; margin: 0 auto 20px;">
                            <i class="fas fa-user-times" style="font-size: 28px; color: #dc2626;"></i>
                        </div>
                        <h4 style="margin: 0 0 10px; color: #1e293b;">Are you sure?</h4>
                        <p style="color: #64748b; margin: 0 0 20px; font-size: 14px;">
                            You are about to permanently delete:
                        </p>
                        <div style="background: #f8fafc; border-radius: 8px; padding: 15px; margin-bottom: 20px;">
                            <div style="font-weight: 600; color: #1e293b;">${escapeHtml(user.name || 'N/A')}</div>
                            <div style="color: #64748b; font-size: 13px;">${escapeHtml(user.email || 'N/A')}</div>
                            <code style="font-size: 11px; background: #e0e7ff; color: #4338ca; padding: 2px 6px; border-radius: 4px; margin-top: 8px; display: inline-block;">${user.id}</code>
                        </div>
                        <p style="color: #dc2626; font-size: 13px; margin: 0;">
                            <i class="fas fa-warning"></i> This action cannot be undone!
                        </p>
                    </div>
                    <div class="modal-footer" style="justify-content: center; gap: 12px;">
                        <button class="btn-secondary" onclick="closeModal('confirmDeleteUserModal')" style="min-width: 100px;">
                            Cancel
                        </button>
                        <button class="btn-danger" onclick="executeDeleteUser('${user.id}')" style="min-width: 100px;">
                            <i class="fas fa-trash-alt"></i> Delete
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        closeModal('userDetailModal');
        document.body.insertAdjacentHTML('beforeend', confirmHTML);
    }
    
    /**
     * Execute delete user
     */
    function executeDeleteUser(userId) {
        if (currentUser.role !== 'founder') {
            showToast('Only founder can delete users', 'error');
            return;
        }
        
        const userIndex = users.findIndex(u => u.id === userId);
        if (userIndex === -1) {
            showToast('User not found', 'error');
            return;
        }
        
        const user = users[userIndex];
        const userName = user.name || user.email;
        
        // If user is business_admin, also delete their tenant and subscription
        if (user.role === 'business_admin' && user.tenantId) {
            // Delete tenant
            const tenants = typeof getTenants === 'function' ? getTenants() : JSON.parse(localStorage.getItem('ezcubic_tenants') || '{}');
            if (tenants[user.tenantId]) {
                delete tenants[user.tenantId];
                if (typeof saveTenants === 'function') {
                    saveTenants(tenants);
                } else {
                    localStorage.setItem('ezcubic_tenants', JSON.stringify(tenants));
                }
            }
            
            // Delete subscription
            const subs = typeof getSubscriptions === 'function' ? getSubscriptions() : JSON.parse(localStorage.getItem('ezcubic_subscriptions') || '{}');
            if (subs[user.tenantId]) {
                delete subs[user.tenantId];
                if (typeof saveSubscriptions === 'function') {
                    saveSubscriptions(subs);
                } else {
                    localStorage.setItem('ezcubic_subscriptions', JSON.stringify(subs));
                }
            }
            
            console.log(`Deleted tenant and subscription for: ${user.tenantId}`);
        }
        
        // Remove user from array
        users.splice(userIndex, 1);
        saveUsers();
        
        closeModal('confirmDeleteUserModal');
        showToast(`User "${userName}" has been deleted`, 'success');
        renderUserManagement();
        
        // Immediate cloud sync to remove from cloud
        if (typeof window.fullCloudSync === 'function') {
            console.log('☁️ Syncing delete to cloud...');
            window.fullCloudSync().catch(err => console.warn('Cloud sync failed:', err));
        } else if (typeof scheduleAutoCloudSync === 'function') {
            scheduleAutoCloudSync();
        }
    }
    
    // ==================== USER LIMIT MODAL ====================
    
    /**
     * Show user limit reached modal
     */
    function showUserLimitModal(planName, currentCount, limit) {
        console.log('showUserLimitModal called:', planName, currentCount, limit);
        
        // Remove existing modal if any
        document.getElementById('userLimitModal')?.remove();
        
        const planDisplayName = planName.charAt(0).toUpperCase() + planName.slice(1);
        
        // Get upgrade options
        const platformSettings = typeof getPlatformSettings === 'function' ? getPlatformSettings() : null;
        const plans = platformSettings?.plans || {};
        
        // Determine upgrade plan
        let upgradePlan = null;
        let upgradeLimit = 0;
        if (planName === 'starter') {
            upgradePlan = plans.professional;
            upgradeLimit = upgradePlan?.limits?.users || 10;
        } else if (planName === 'professional') {
            upgradePlan = plans.enterprise;
            upgradeLimit = -1; // Unlimited
        }
        
        const modalHTML = `
            <div class="modal show" id="userLimitModal" style="z-index: 10005; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center;">
                <div style="background: white; max-width: 480px; border-radius: 16px; overflow: hidden; box-shadow: 0 25px 50px rgba(0,0,0,0.25);">
                    <div style="background: linear-gradient(135deg, #ef4444, #dc2626); padding: 25px; text-align: center; color: white;">
                        <div style="font-size: 50px; margin-bottom: 10px;">⚠️</div>
                        <h2 style="margin: 0; font-size: 22px;">User Limit Reached</h2>
                    </div>
                    <div style="padding: 25px; text-align: center;">
                        <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 12px; padding: 20px; margin-bottom: 20px;">
                            <div style="font-size: 36px; font-weight: 700; color: #dc2626;">${currentCount} / ${limit}</div>
                            <div style="color: #991b1b; margin-top: 5px;">Users in your account</div>
                        </div>
                        
                        <p style="color: #64748b; margin-bottom: 20px; line-height: 1.6;">
                            Your <strong style="color: #2563eb;">${planDisplayName} Plan</strong> allows a maximum of 
                            <strong>${limit} users</strong>. To add more team members, please upgrade your subscription.
                        </p>
                        
                        ${upgradePlan ? `
                        <div style="background: linear-gradient(135deg, #f0fdf4, #dcfce7); border: 2px solid #22c55e; border-radius: 12px; padding: 20px; margin-bottom: 20px;">
                            <div style="font-weight: 600; color: #166534; margin-bottom: 8px;">
                                <i class="fas fa-arrow-up"></i> Upgrade to ${upgradePlan.name}
                            </div>
                            <div style="font-size: 28px; font-weight: 700; color: #15803d;">
                                ${upgradeLimit === -1 ? '∞ Unlimited' : upgradeLimit + ' Users'}
                            </div>
                            <div style="color: #166534; font-size: 14px; margin-top: 5px;">
                                RM ${upgradePlan.price}/month
                            </div>
                        </div>
                        ` : ''}
                        
                        <div style="display: flex; gap: 10px; justify-content: center;">
                            <button onclick="document.getElementById('userLimitModal').remove()" style="padding: 12px 25px; border-radius: 8px; background: #e2e8f0; border: none; cursor: pointer; font-weight: 600;">
                                <i class="fas fa-times"></i> Close
                            </button>
                            ${upgradePlan ? `
                            <button onclick="document.getElementById('userLimitModal').remove(); alert('Please contact support to upgrade your plan');" style="padding: 12px 25px; border-radius: 8px; background: linear-gradient(135deg, #22c55e, #16a34a); color: white; border: none; cursor: pointer; font-weight: 600;">
                                <i class="fas fa-rocket"></i> Upgrade Now
                            </button>
                            ` : ''}
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        console.log('Modal HTML inserted');
        
        // Also show alert as backup
        alert(`⚠️ User Limit Reached!\n\nYour ${planDisplayName} Plan allows ${limit} users.\nYou currently have ${currentCount} users.\n\nPlease upgrade to add more team members.`);
    }
    
    // ==================== USER DETAIL MODAL ====================
    
    /**
     * Show user detail modal (Founder view)
     */
    function showUserDetailModal(userId) {
        const user = users.find(u => u.id === userId);
        if (!user) {
            showToast('User not found', 'error');
            return;
        }
        
        // Remove existing modal if any
        const existingModal = document.getElementById('userDetailModal');
        if (existingModal) {
            existingModal.remove();
        }
        
        const platformSettings = typeof getPlatformSettings === 'function' ? getPlatformSettings() : null;
        const role = ROLES[user.role] || {};
        const plan = platformSettings?.plans?.[user.plan];
        const subscriptions = typeof getSubscriptions === 'function' ? getSubscriptions() : {};
        const subscription = user.tenantId ? subscriptions[user.tenantId] : null;
        
        // Find related users (staff/manager under this business admin)
        let relatedUsers = [];
        if (user.role === 'business_admin') {
            relatedUsers = users.filter(u => u.tenantId === user.tenantId && u.id !== user.id);
        } else if (user.role === 'staff' || user.role === 'manager') {
            const owner = users.find(u => u.tenantId === user.tenantId && u.role === 'business_admin');
            if (owner) {
                relatedUsers = [owner];
            }
        }
        
        const modalHTML = `
            <div class="modal show" id="userDetailModal" style="z-index: 10005;">
                <div class="modal-content" style="max-width: 600px;">
                    <div class="modal-header" style="background: linear-gradient(135deg, ${role.color || '#6366f1'}, ${role.color || '#6366f1'}dd);">
                        <h3 class="modal-title" style="color: white;">
                            <i class="fas ${role.icon || 'fa-user'}"></i> User Details
                        </h3>
                        <button class="modal-close" onclick="closeModal('userDetailModal')" style="color: white;">&times;</button>
                    </div>
                    <div class="modal-body" style="padding: 0;">
                        <!-- User Header -->
                        <div style="background: ${role.color || '#6366f1'}15; padding: 20px; border-bottom: 1px solid #e2e8f0;">
                            <div style="display: flex; align-items: center; gap: 15px;">
                                <div style="width: 60px; height: 60px; border-radius: 50%; background: ${role.color || '#6366f1'}; display: flex; align-items: center; justify-content: center;">
                                    <i class="fas ${role.icon || 'fa-user'}" style="font-size: 24px; color: white;"></i>
                                </div>
                                <div style="flex: 1;">
                                    <div style="font-size: 18px; font-weight: 600; color: #1e293b;">${escapeHtml(user.name || 'N/A')}</div>
                                    <div style="color: #64748b; font-size: 14px;">${escapeHtml(user.email || 'N/A')}</div>
                                    <div style="margin-top: 6px;">
                                        <span style="background: ${role.color || '#6366f1'}20; color: ${role.color || '#6366f1'}; padding: 3px 10px; border-radius: 12px; font-size: 12px; font-weight: 500;">
                                            ${role.name || user.role}
                                        </span>
                                        <span style="background: ${user.status === 'active' ? '#dcfce7' : '#fee2e2'}; color: ${user.status === 'active' ? '#16a34a' : '#dc2626'}; padding: 3px 10px; border-radius: 12px; font-size: 12px; font-weight: 500; margin-left: 6px;">
                                            ${user.status || 'active'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Details Grid -->
                        <div style="padding: 20px;">
                            <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px;">
                                <div style="background: #f8fafc; padding: 12px; border-radius: 8px;">
                                    <div style="font-size: 11px; color: #64748b; text-transform: uppercase; margin-bottom: 4px;">User ID (UID)</div>
                                    <div style="font-family: monospace; color: #4338ca; font-weight: 600; font-size: 13px;">${user.id}</div>
                                </div>
                                <div style="background: #f8fafc; padding: 12px; border-radius: 8px;">
                                    <div style="font-size: 11px; color: #64748b; text-transform: uppercase; margin-bottom: 4px;">Tenant ID</div>
                                    <div style="font-family: monospace; color: #4338ca; font-weight: 600; font-size: 13px;">${user.tenantId || 'N/A'}</div>
                                </div>
                                <div style="background: #f8fafc; padding: 12px; border-radius: 8px;">
                                    <div style="font-size: 11px; color: #64748b; text-transform: uppercase; margin-bottom: 4px;">Plan</div>
                                    <div>
                                        ${plan ? `<span style="background: ${plan.color}; color: white; padding: 3px 10px; border-radius: 12px; font-size: 12px;">${plan.name}</span>` : '<span style="color: #94a3b8;">No plan</span>'}
                                    </div>
                                </div>
                                <div style="background: #f8fafc; padding: 12px; border-radius: 8px;">
                                    <div style="font-size: 11px; color: #64748b; text-transform: uppercase; margin-bottom: 4px;">Created</div>
                                    <div style="font-size: 13px; color: #1e293b;">${user.createdAt ? new Date(user.createdAt).toLocaleString() : 'Unknown'}</div>
                                </div>
                            </div>
                            
                            ${subscription ? `
                            <div style="margin-top: 15px; background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 12px;">
                                <div style="font-size: 11px; color: #166534; text-transform: uppercase; margin-bottom: 6px;">
                                    <i class="fas fa-calendar-check"></i> Subscription
                                </div>
                                <div style="display: flex; justify-content: space-between; align-items: center;">
                                    <div>
                                        <span style="font-size: 13px; color: #166534;">Expires: ${new Date(subscription.expiresAt).toLocaleDateString()}</span>
                                        ${subscription.isTrial ? '<span style="background: #f59e0b; color: white; padding: 2px 6px; border-radius: 8px; font-size: 10px; margin-left: 8px;">TRIAL</span>' : ''}
                                    </div>
                                </div>
                            </div>
                            ` : ''}
                            
                            ${user.permissions && user.permissions.length > 0 ? `
                            <div style="margin-top: 15px;">
                                <div style="font-size: 11px; color: #64748b; text-transform: uppercase; margin-bottom: 8px;">
                                    <i class="fas fa-key"></i> Permissions (${user.permissions.includes('all') ? 'Full Access' : user.permissions.length + ' modules'})
                                </div>
                                <div style="display: flex; flex-wrap: wrap; gap: 6px;">
                                    ${user.permissions.includes('all') ? 
                                        '<span style="background: #dcfce7; color: #166534; padding: 4px 10px; border-radius: 6px; font-size: 12px;">All Modules</span>' :
                                        user.permissions.slice(0, 10).map(p => `<span style="background: #e2e8f0; color: #475569; padding: 4px 8px; border-radius: 6px; font-size: 11px;">${p}</span>`).join('') +
                                        (user.permissions.length > 10 ? `<span style="color: #64748b; font-size: 11px;">+${user.permissions.length - 10} more</span>` : '')
                                    }
                                </div>
                            </div>
                            ` : ''}
                            
                            ${relatedUsers.length > 0 ? `
                            <div style="margin-top: 15px; border-top: 1px solid #e2e8f0; padding-top: 15px;">
                                <div style="font-size: 11px; color: #64748b; text-transform: uppercase; margin-bottom: 8px;">
                                    <i class="fas fa-users"></i> ${user.role === 'business_admin' ? 'Team Members' : 'Business Owner'}
                                </div>
                                <div style="display: flex; flex-direction: column; gap: 8px;">
                                    ${relatedUsers.slice(0, 5).map(ru => {
                                        const rRole = ROLES[ru.role] || {};
                                        return `
                                            <div style="display: flex; align-items: center; gap: 10px; background: #f8fafc; padding: 8px 12px; border-radius: 8px;">
                                                <div style="width: 32px; height: 32px; border-radius: 50%; background: ${rRole.color || '#64748b'}; display: flex; align-items: center; justify-content: center;">
                                                    <i class="fas ${rRole.icon || 'fa-user'}" style="font-size: 12px; color: white;"></i>
                                                </div>
                                                <div style="flex: 1;">
                                                    <div style="font-size: 13px; font-weight: 500;">${escapeHtml(ru.name)}</div>
                                                    <div style="font-size: 11px; color: #64748b;">${rRole.name || ru.role}</div>
                                                </div>
                                                <code style="font-size: 10px; background: #e0e7ff; color: #4338ca; padding: 2px 6px; border-radius: 4px;">${ru.id}</code>
                                            </div>
                                        `;
                                    }).join('')}
                                    ${relatedUsers.length > 5 ? `<div style="color: #64748b; font-size: 12px; text-align: center;">+${relatedUsers.length - 5} more</div>` : ''}
                                </div>
                            </div>
                            ` : ''}
                        </div>
                    </div>
                    <div class="modal-footer" style="display: flex; justify-content: space-between; align-items: center;">
                        <div>
                            ${currentUser.role === 'founder' && user.role !== 'founder' ? `
                                <button class="btn-danger" onclick="confirmDeleteUser('${user.id}')" style="margin-right: 8px;">
                                    <i class="fas fa-trash-alt"></i> Delete
                                </button>
                                ${user.status === 'active' ? `
                                    <button class="btn-warning" onclick="toggleUserStatus('${user.id}', 'inactive')">
                                        <i class="fas fa-ban"></i> Deactivate
                                    </button>
                                ` : `
                                    <button class="btn-success" onclick="toggleUserStatus('${user.id}', 'active')">
                                        <i class="fas fa-check-circle"></i> Activate
                                    </button>
                                `}
                            ` : ''}
                        </div>
                        <div>
                            <button class="btn-secondary" onclick="closeModal('userDetailModal')">Close</button>
                            ${currentUser.role === 'founder' && user.role !== 'founder' ? `
                                <button class="btn-primary" onclick="closeModal('userDetailModal'); editUser('${user.id}')">
                                    <i class="fas fa-edit"></i> Edit User
                                </button>
                            ` : ''}
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', modalHTML);
    }
    
    // ==================== EXPORT USER LIST ====================
    
    /**
     * Export user list to CSV
     */
    function exportUserList() {
        const allUsers = users.filter(u => u.role !== 'founder');
        const platformSettings = typeof getPlatformSettings === 'function' ? getPlatformSettings() : null;
        
        // Create CSV content
        let csv = 'UID,Name,Email,Role,Plan,Status,Tenant ID,Created\n';
        
        allUsers.forEach(user => {
            const plan = platformSettings?.plans?.[user.plan];
            csv += `"${user.id}","${user.name || ''}","${user.email || ''}","${user.role}","${plan?.name || user.plan || ''}","${user.status || 'active'}","${user.tenantId || ''}","${user.createdAt || ''}"\n`;
        });
        
        // Download
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `ezcubic_users_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        
        showToast(`Exported ${allUsers.length} users`, 'success');
    }
    
    // ==================== EXPORTS ====================
    window.toggleUserStatus = toggleUserStatus;
    window.deleteUser = deleteUser;
    window.confirmDeleteUser = confirmDeleteUser;
    window.executeDeleteUser = executeDeleteUser;
    window.showUserLimitModal = showUserLimitModal;
    window.showUserDetailModal = showUserDetailModal;
    window.exportUserList = exportUserList;
    
    console.log('👥 User Management module loaded (Part C: Actions)');
    
})();
