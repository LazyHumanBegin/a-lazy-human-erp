/**
 * EZCubic - User Permissions Module
 * Permission checking, access control, plan restrictions
 * Version: 2.2.5 - Split from users.js
 */

// ==================== PERMISSIONS ====================
function canAccessModule(moduleId) {
    if (!currentUser) return false;
    
    // Founder and Platform Admin have UNLIMITED access to all modules
    if (['founder', 'platform_admin'].includes(currentUser.role)) {
        return true;
    }
    
    // For Business Admin - check their plan features
    if (currentUser.role === 'business_admin') {
        // Get plan features
        const platformSettings = typeof getPlatformSettings === 'function' ? getPlatformSettings() : null;
        const userPlan = currentUser.plan || 'starter';
        const planFeatures = platformSettings?.plans?.[userPlan]?.features || [];
        
        // If plan has 'all' features, allow everything
        if (planFeatures.includes('all')) return true;
        
        // Check if module is in plan features
        return planFeatures.includes(moduleId);
    }
    
    // For Staff/Manager - check BOTH their assigned permissions AND the owner's plan
    if (['staff', 'manager'].includes(currentUser.role)) {
        // First check if user has permission assigned
        const hasUserPermission = currentUser.permissions.includes('all') || currentUser.permissions.includes(moduleId);
        
        // Debug log
        console.log(`canAccessModule(${moduleId}): user perms=[${currentUser.permissions.join(',')}], hasUserPerm=${hasUserPermission}`);
        
        if (!hasUserPermission) {
            console.log(`  -> DENIED: User doesn't have permission for ${moduleId}`);
            return false;
        }
        
        // Then check if the module is allowed by the tenant owner's plan
        const ownerPlanFeatures = getOwnerPlanFeatures();
        const ownerHasAll = ownerPlanFeatures.includes('all');
        const ownerAllows = ownerHasAll || ownerPlanFeatures.includes(moduleId);
        console.log(`  -> Owner plan allows ${moduleId}: ${ownerAllows}`);
        
        // Even if owner has 'all' plan, staff MUST have the specific permission assigned
        // Only return true if: (1) user has permission AND (2) owner's plan allows the module
        if (!ownerAllows) {
            console.log(`  -> DENIED: Owner plan doesn't include ${moduleId}`);
            return false;
        }
        
        // User has permission AND owner allows it
        return true;
    }
    
    // Personal users - check their plan features and hidden sections
    if (currentUser.role === 'personal') {
        const platformSettings = typeof getPlatformSettings === 'function' ? getPlatformSettings() : null;
        const personalPlan = platformSettings?.plans?.personal || {};
        const planFeatures = personalPlan.features || [];
        const hiddenSections = personalPlan.hiddenSections || [];
        
        // Check if explicitly hidden
        if (hiddenSections.includes(moduleId)) return false;
        
        // Check if has all or the specific feature
        if (planFeatures.includes('all')) return true;
        return planFeatures.includes(moduleId);
    }
    
    // Fallback to permission check
    if (currentUser.permissions.includes('all')) return true;
    return currentUser.permissions.includes(moduleId);
}

// Get the Business Admin's (owner's) plan features for Staff/Manager access control
function getOwnerPlanFeatures() {
    if (!currentUser || !currentUser.tenantId) return [];
    
    // Find the Business Admin who owns this tenant
    const allUsers = JSON.parse(localStorage.getItem('ezcubic_users') || '[]');
    const owner = allUsers.find(u => 
        u.tenantId === currentUser.tenantId && 
        (u.role === 'business_admin' || u.role === 'founder')
    );
    
    if (!owner) return [];
    
    const platformSettings = typeof getPlatformSettings === 'function' ? getPlatformSettings() : null;
    const ownerPlan = owner.plan || 'starter';
    return platformSettings?.plans?.[ownerPlan]?.features || [];
}

// Apply owner's plan restrictions to Staff/Manager
function applyOwnerPlanRestrictions(user) {
    if (!user || !user.tenantId) return;
    
    // Find the Business Admin who owns this tenant
    const allUsers = JSON.parse(localStorage.getItem('ezcubic_users') || '[]');
    const owner = allUsers.find(u => 
        u.tenantId === user.tenantId && 
        (u.role === 'business_admin' || u.role === 'founder')
    );
    
    if (!owner) return;
    
    const platformSettings = typeof getPlatformSettings === 'function' ? getPlatformSettings() : null;
    const ownerPlan = owner.plan || 'starter';
    
    console.log(`Applying owner plan restrictions: ${ownerPlan} for ${user.role}: ${user.email}`);
    console.log(`User's assigned permissions:`, user.permissions);
    
    // DON'T call applyFeatureRestrictions here - it would show all plan modules
    // Instead, let applyUserPermissions handle it (which checks BOTH user permissions AND owner plan)
    
    // Only update limits display based on owner's plan
    if (typeof updatePlanLimitsDisplay === 'function') {
        updatePlanLimitsDisplay(ownerPlan);
    }
    
    // Re-apply user permissions to ensure correct modules are shown
    // This checks both user's assigned permissions AND owner's plan
    applyUserPermissions();
}

function canManageRole(roleId) {
    if (!currentUser) return false;
    const userRole = ROLES[currentUser.role];
    return userRole && userRole.canManage.includes(roleId);
}

function applyUserPermissions() {
    console.log('applyUserPermissions called. currentUser:', currentUser?.email, 'role:', currentUser?.role);
    
    // Guest mode: Show personal plan features but require login to use
    if (!currentUser) {
        // Apply personal plan restrictions for guest preview
        if (typeof applyGuestPreviewMode === 'function') {
            applyGuestPreviewMode();
        } else {
            // Fallback: Show personal plan features
            const personalFeatures = ['dashboard', 'transactions', 'income', 'expenses', 'reports', 'taxes', 'balance-sheet', 'monthly-reports', 'ai-chatbot', 'bills'];
            const personalHidden = ['pos', 'inventory', 'stock', 'orders', 'crm', 'customers', 'suppliers', 'quotations', 'projects', 'payroll', 'leave-attendance', 'einvoice', 'branches', 'user-management', 'platform-control'];
            
            document.querySelectorAll('.nav-btn').forEach(btn => {
                const section = btn.getAttribute('onclick')?.match(/showSection\('([^']+)'\)/)?.[1];
                if (section) {
                    // Show only personal plan sections
                    const isHidden = personalHidden.some(hidden => section.includes(hidden));
                    btn.style.display = isHidden ? 'none' : '';
                }
            });
            
            // Hide business-only navigation separators for guests
            hideBusinessNavSeparators();
            
            // Show guest badge
            showGuestBadge();
        }
        return;
    }
    
    // Define hidden sections for personal users
    const personalHiddenSections = ['pos', 'inventory', 'stock', 'orders', 'crm', 'customers', 'suppliers', 'quotations', 'projects', 'payroll', 'leave-attendance', 'einvoice', 'branches', 'user-management', 'purchase-orders', 'delivery-orders', 'employees', 'kpi', 'lhdn-export', 'bank-reconciliation', 'chart-of-accounts', 'journal-entries', 'aging-reports', 'audit-log'];
    
    // Show/hide navigation buttons based on permissions
    document.querySelectorAll('.nav-btn').forEach(btn => {
        const section = btn.getAttribute('onclick')?.match(/showSection\('([^']+)'\)/)?.[1];
        if (section) {
            const moduleMap = {
                'dashboard': 'dashboard',
                'transactions': 'transactions',
                'bills': 'bills',
                'inventory': 'inventory',
                'stock': 'stock',
                'pos': 'pos',
                'orders': 'orders',
                'crm': 'crm',
                'suppliers': 'suppliers',
                'quotations': 'quotations',
                'projects': 'projects',
                'payroll': 'payroll',
                'kpi': 'kpi',
                'leave-attendance': 'leave-attendance',
                'purchase-orders': 'purchase-orders',
                'delivery-orders': 'delivery-orders',
                'employees': 'employees',
                'e-invoice': 'einvoice',
                'branches': 'branches',
                'reports': 'reports',
                'taxes': 'taxes',
                'balance-sheet': 'balance',
                'settings': 'settings',
                'user-management': 'users'
            };
            
            const moduleId = moduleMap[section] || section;
            
            // Staff and Manager should NEVER see certain admin sections
            if (['staff', 'manager'].includes(currentUser.role)) {
                const adminOnlySections = ['user-management', 'platform-control'];
                if (adminOnlySections.includes(section)) {
                    btn.style.display = 'none';
                    return;
                }
            }
            
            // Personal users - apply strict plan restrictions
            if (currentUser.role === 'personal') {
                console.log('Applying personal restrictions for section:', section);
                // Check if this section should be hidden for personal users
                const isHidden = personalHiddenSections.some(hidden => section === hidden || section.includes(hidden));
                if (isHidden) {
                    console.log('  -> HIDING:', section);
                    btn.style.display = 'none';
                    return;
                }
                // Show the button if not hidden
                console.log('  -> SHOWING:', section);
                btn.style.display = '';
                return;
            }
            
            btn.style.display = canAccessModule(moduleId) ? '' : 'none';
        }
    });
    
    // Hide business-only navigation separators for personal users
    if (currentUser.role === 'personal') {
        hideBusinessNavSeparators();
    } else {
        showAllNavSeparators();
    }
}

// Hide navigation separators that are business-only
function hideBusinessNavSeparators() {
    const separators = document.querySelectorAll('.nav-separator');
    separators.forEach(sep => {
        const text = sep.textContent.trim().toLowerCase();
        // Hide these separators for personal users
        if (text.includes('sales') || text.includes('crm') || 
            text.includes('operations') || text.includes('purchasing') || 
            text.includes('hr') || text.includes('payroll') ||
            text.includes('multi-branch') || text.includes('branch')) {
            sep.style.display = 'none';
        }
    });
}

// Show all navigation separators
function showAllNavSeparators() {
    const separators = document.querySelectorAll('.nav-separator');
    separators.forEach(sep => {
        // Don't show platform admin separator unless they have access
        if (!sep.id || sep.id !== 'platformAdminNav') {
            sep.style.display = '';
        }
    });
}

// Show guest badge
function showGuestBadge() {
    // Implementation for showing guest badge
    const userMenuContainer = document.getElementById('userMenuContainer');
    if (userMenuContainer) {
        userMenuContainer.innerHTML = `
            <div class="guest-badge">
                <i class="fas fa-user-circle"></i>
                <span>Guest</span>
            </div>
        `;
    }
}

// ==================== WINDOW EXPORTS ====================
window.canAccessModule = canAccessModule;
window.getOwnerPlanFeatures = getOwnerPlanFeatures;
window.applyOwnerPlanRestrictions = applyOwnerPlanRestrictions;
window.canManageRole = canManageRole;
window.applyUserPermissions = applyUserPermissions;
window.hideBusinessNavSeparators = hideBusinessNavSeparators;
window.showAllNavSeparators = showAllNavSeparators;
