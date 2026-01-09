/**
 * EZCubic - Permissions Module
 * Role-based access control for multi-tenant ERP
 * 
 * Extracted from users.js for better maintainability
 * Version: 1.0.0 - 28 Dec 2025
 * 
 * @module permissions
 */

// ==================== ROLE DEFINITIONS ====================

/**
 * Role definitions with hierarchy and capabilities
 * @constant {Object}
 */
const ROLES = {
    founder: {
        name: 'Founder',
        level: 1,
        description: 'Full system access - Owner',
        color: '#7c3aed',
        icon: 'fa-crown',
        canManage: ['erp_assistant', 'business_admin', 'personal', 'manager', 'staff'],
        defaultPermissions: ['all']
    },
    erp_assistant: {
        name: 'ERP Assistant',
        level: 2,
        description: 'A Lazy Human Staff - Platform management only',
        color: '#2563eb',
        icon: 'fa-user-tie',
        canManage: ['business_admin', 'personal', 'manager', 'staff'],
        defaultPermissions: ['users'],
        platformOnly: true
    },
    business_admin: {
        name: 'Business Admin',
        level: 3,
        description: 'Business Owner/User',
        color: '#10b981',
        icon: 'fa-building',
        canManage: ['manager', 'staff'],
        defaultPermissions: ['dashboard', 'transactions', 'inventory', 'pos', 'reports']
    },
    personal: {
        name: 'Personal',
        level: 3,
        description: 'Personal Finance User - Basic features only',
        color: '#64748b',
        icon: 'fa-user',
        canManage: [],
        defaultPermissions: ['dashboard', 'transactions', 'income', 'expenses', 'reports', 'taxes', 'balance-sheet', 'monthly-reports', 'ai-chatbot'],
        plan: 'personal'
    },
    manager: {
        name: 'Manager',
        level: 4,
        description: 'Business Manager',
        color: '#f59e0b',
        icon: 'fa-user-shield',
        canManage: ['staff'],
        defaultPermissions: ['dashboard', 'transactions', 'inventory', 'pos']
    },
    staff: {
        name: 'Staff',
        level: 5,
        description: 'Business Staff',
        color: '#64748b',
        icon: 'fa-user',
        canManage: [],
        defaultPermissions: ['pos']
    }
};

// ==================== ERP MODULE DEFINITIONS ====================

/**
 * ERP Modules organized by category
 * @constant {Array}
 */
const ERP_MODULE_CATEGORIES = [
    {
        id: 'finance',
        name: 'Finance & Accounting',
        icon: 'fa-coins',
        color: '#10b981',
        modules: [
            { id: 'dashboard', name: 'Dashboard', icon: 'fa-tachometer-alt' },
            { id: 'transactions', name: 'Transactions', icon: 'fa-exchange-alt' },
            { id: 'income', name: 'Record Income', icon: 'fa-plus-circle' },
            { id: 'expenses', name: 'Record Expenses', icon: 'fa-minus-circle' },
            { id: 'bills', name: 'Bills', icon: 'fa-file-invoice' },
            { id: 'reports', name: 'Reports', icon: 'fa-chart-bar' },
            { id: 'taxes', name: 'Taxes', icon: 'fa-percentage' },
            { id: 'balance', name: 'Balance Sheet', icon: 'fa-balance-scale' },
            { id: 'monthly-reports', name: 'Monthly Reports', icon: 'fa-calendar-alt' },
            { id: 'bank-reconciliation', name: 'Bank Reconciliation', icon: 'fa-check-double' },
            { id: 'lhdn-export', name: 'LHDN & Audit Export', icon: 'fa-file-export' }
        ]
    },
    {
        id: 'accounting',
        name: 'Accounting',
        icon: 'fa-book',
        color: '#0891b2',
        modules: [
            { id: 'chart-of-accounts', name: 'Chart of Accounts', icon: 'fa-sitemap' },
            { id: 'journal-entries', name: 'Journal Entries', icon: 'fa-book' },
            { id: 'aging-reports', name: 'AR/AP Aging Reports', icon: 'fa-clock' }
        ]
    },
    {
        id: 'sales',
        name: 'Sales & CRM',
        icon: 'fa-shopping-cart',
        color: '#2563eb',
        modules: [
            { id: 'pos', name: 'Point of Sale', icon: 'fa-cash-register' },
            { id: 'quotations', name: 'Quotations', icon: 'fa-file-alt' },
            { id: 'invoices', name: 'Invoices', icon: 'fa-file-invoice-dollar' },
            { id: 'orders', name: 'Orders', icon: 'fa-shopping-cart' },
            { id: 'crm', name: 'CRM / Customers', icon: 'fa-users' },
            { id: 'einvoice', name: 'e-Invoice', icon: 'fa-file-invoice-dollar' },
            { id: 'email-invoice', name: 'Invoice/Receipt', icon: 'fa-envelope' },
            { id: 'customers', name: 'Customers', icon: 'fa-address-book' }
        ]
    },
    {
        id: 'inventory',
        name: 'Inventory & Stock',
        icon: 'fa-boxes',
        color: '#f59e0b',
        modules: [
            { id: 'inventory', name: 'Inventory', icon: 'fa-boxes' },
            { id: 'stock', name: 'Stock Control', icon: 'fa-warehouse' },
            { id: 'products', name: 'Products', icon: 'fa-box' }
        ]
    },
    {
        id: 'purchasing',
        name: 'Purchasing',
        icon: 'fa-truck',
        color: '#8b5cf6',
        modules: [
            { id: 'suppliers', name: 'Suppliers', icon: 'fa-truck' },
            { id: 'purchase-orders', name: 'Purchase Orders', icon: 'fa-shopping-cart' },
            { id: 'delivery-orders', name: 'Delivery Orders', icon: 'fa-shipping-fast' }
        ]
    },
    {
        id: 'hr',
        name: 'HR & Payroll',
        icon: 'fa-user-tie',
        color: '#ec4899',
        modules: [
            { id: 'employees', name: 'Employees', icon: 'fa-users' },
            { id: 'payroll', name: 'Payroll', icon: 'fa-money-check-alt' },
            { id: 'leave-attendance', name: 'Leave & Attendance', icon: 'fa-calendar-check' },
            { id: 'kpi', name: 'KPI & Performance', icon: 'fa-chart-line' }
        ]
    },
    {
        id: 'projects',
        name: 'Projects',
        icon: 'fa-project-diagram',
        color: '#06b6d4',
        modules: [
            { id: 'projects', name: 'Projects', icon: 'fa-project-diagram' }
        ]
    },
    {
        id: 'admin',
        name: 'Administration',
        icon: 'fa-cog',
        color: '#64748b',
        modules: [
            { id: 'branches', name: 'Branches', icon: 'fa-code-branch' },
            { id: 'settings', name: 'Settings', icon: 'fa-cog' },
            { id: 'users', name: 'User Management', icon: 'fa-users-cog' },
            { id: 'backup-restore', name: 'Backup & Restore', icon: 'fa-database' }
        ]
    },
    {
        id: 'ai',
        name: 'AI Tools',
        icon: 'fa-robot',
        color: '#6366f1',
        modules: [
            { id: 'ai-chatbot', name: 'AI Assistant', icon: 'fa-robot' }
        ]
    }
];

/**
 * Flat ERP_MODULES array for backward compatibility
 * @constant {Array}
 */
const ERP_MODULES = ERP_MODULE_CATEGORIES.flatMap(cat => cat.modules);

/**
 * Sections hidden from personal users
 * @constant {Array}
 */
const PERSONAL_HIDDEN_SECTIONS = [
    'pos', 'inventory', 'stock', 'orders', 'crm', 'customers', 'suppliers', 
    'quotations', 'projects', 'payroll', 'leave-attendance', 'einvoice', 
    'branches', 'user-management', 'purchase-orders', 'delivery-orders', 
    'employees', 'kpi', 'lhdn-export', 'bank-reconciliation', 
    'chart-of-accounts', 'journal-entries', 'aging-reports', 'audit-log'
];

/**
 * Module ID mapping from section names
 * @constant {Object}
 */
const MODULE_MAP = {
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
    'business-targets': 'business-targets',
    'settings': 'settings',
    'user-management': 'users'
};

// ==================== PERMISSION CHECK FUNCTIONS ====================

/**
 * Check if the current user can access a specific module
 * @param {string} moduleId - The module identifier
 * @returns {boolean} - True if user can access the module
 */
function canAccessModule(moduleId) {
    const currentUser = window.currentUser;
    if (!currentUser) return false;
    
    // Founder and Platform Admin have UNLIMITED access to all modules
    if (['founder', 'platform_admin'].includes(currentUser.role)) {
        return true;
    }
    
    // For Business Admin - check their plan features
    if (currentUser.role === 'business_admin') {
        const platformSettings = typeof getPlatformSettings === 'function' ? getPlatformSettings() : null;
        const userPlan = currentUser.plan || 'starter';
        const planFeatures = platformSettings?.plans?.[userPlan]?.features || [];
        
        if (planFeatures.includes('all')) return true;
        return planFeatures.includes(moduleId);
    }
    
    // For Staff/Manager - STRICT permission check
    if (['staff', 'manager'].includes(currentUser.role)) {
        // Check if user has empty/no permissions array
        if (!currentUser.permissions || !Array.isArray(currentUser.permissions)) {
            console.log(`canAccessModule(${moduleId}): DENIED - no permissions array`);
            return false;
        }
        
        // Dashboard is always accessible
        if (moduleId === 'dashboard') {
            return true;
        }
        
        // Check if user has 'all' permission
        if (currentUser.permissions.includes('all')) {
            return true;
        }
        
        // STRICT: Check if user has this specific module permission
        const hasPermission = currentUser.permissions.includes(moduleId);
        console.log(`canAccessModule(${moduleId}): permissions=[${currentUser.permissions.join(',')}], result=${hasPermission}`);
        
        if (!hasPermission) {
            return false;
        }
        
        // Also check owner's plan
        const ownerPlanFeatures = getOwnerPlanFeatures();
        if (ownerPlanFeatures.length > 0 && !ownerPlanFeatures.includes('all') && !ownerPlanFeatures.includes(moduleId)) {
            console.log(`canAccessModule(${moduleId}): DENIED by owner plan`);
            return false;
        }
        
        return true;
    }
    
    // Personal users - check their plan features and hidden sections
    if (currentUser.role === 'personal') {
        const platformSettings = typeof getPlatformSettings === 'function' ? getPlatformSettings() : null;
        const personalPlan = platformSettings?.plans?.personal || {};
        const planFeatures = personalPlan.features || [];
        const hiddenSections = personalPlan.hiddenSections || [];
        
        if (hiddenSections.includes(moduleId)) return false;
        if (planFeatures.includes('all')) return true;
        return planFeatures.includes(moduleId);
    }
    
    // Fallback to permission check
    if (currentUser.permissions && currentUser.permissions.includes('all')) return true;
    return currentUser.permissions && currentUser.permissions.includes(moduleId);
}

/**
 * Get the Business Admin's (owner's) plan features for Staff/Manager access control
 * @returns {Array} - Array of feature/module IDs
 */
function getOwnerPlanFeatures() {
    const currentUser = window.currentUser;
    if (!currentUser || !currentUser.tenantId) return [];
    
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

/**
 * Apply owner's plan restrictions to Staff/Manager
 * @param {Object} user - User object to apply restrictions to
 */
function applyOwnerPlanRestrictions(user) {
    if (!user || !user.tenantId) return;
    
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
    
    if (typeof updatePlanLimitsDisplay === 'function') {
        updatePlanLimitsDisplay(ownerPlan);
    }
    
    applyUserPermissions();
}

/**
 * Check if the current user can manage a specific role
 * @param {string} roleId - The role identifier
 * @returns {boolean} - True if user can manage the role
 */
function canManageRole(roleId) {
    const currentUser = window.currentUser;
    if (!currentUser) return false;
    const userRole = ROLES[currentUser.role];
    return userRole && userRole.canManage.includes(roleId);
}

/**
 * Apply user permissions to the UI (show/hide nav buttons)
 */
function applyUserPermissions() {
    const currentUser = window.currentUser;
    console.log('applyUserPermissions called. currentUser:', currentUser?.email, 'role:', currentUser?.role);
    
    // Check if there's a valid session in localStorage (user might not be loaded yet)
    const sessionData = localStorage.getItem('ezcubic_currentUser');
    const hasValidSession = sessionData && JSON.parse(sessionData)?.id;
    
    // Guest mode: Show personal plan features but require login to use
    // Only apply guest mode if there's NO session at all (not just currentUser not loaded yet)
    if (!currentUser && !hasValidSession) {
        if (typeof applyGuestPreviewMode === 'function') {
            applyGuestPreviewMode();
        } else {
            const personalFeatures = ['dashboard', 'transactions', 'income', 'expenses', 'reports', 'taxes', 'balance-sheet', 'monthly-reports', 'ai-chatbot', 'bills'];
            const personalHidden = ['pos', 'inventory', 'stock', 'orders', 'crm', 'customers', 'suppliers', 'quotations', 'projects', 'payroll', 'leave-attendance', 'einvoice', 'branches', 'user-management', 'platform-control'];
            
            document.querySelectorAll('.nav-btn').forEach(btn => {
                const section = btn.getAttribute('onclick')?.match(/showSection\('([^']+)'\)/)?.[1];
                if (section) {
                    const isHidden = personalHidden.some(hidden => section.includes(hidden));
                    btn.style.display = isHidden ? 'none' : '';
                }
            });
            
            hideBusinessNavSeparators();
            if (typeof showGuestBadge === 'function') {
                showGuestBadge();
            }
        }
        return;
    }
    
    // If we have session but no currentUser yet, wait for it to load
    if (!currentUser && hasValidSession) {
        console.log('⏳ Session exists but currentUser not loaded yet, skipping permissions for now');
        return;
    }
    
    // CRITICAL: Remove guest preview mode if user is logged in
    // This fixes the issue where preview banner persists after hard refresh
    if (currentUser && typeof removeViewOnlyMode === 'function') {
        removeViewOnlyMode();
    }
    
    // Show/hide navigation buttons based on permissions
    document.querySelectorAll('.nav-btn').forEach(btn => {
        const section = btn.getAttribute('onclick')?.match(/showSection\('([^']+)'\)/)?.[1];
        if (section) {
            const moduleId = MODULE_MAP[section] || section;
            
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
                const isHidden = PERSONAL_HIDDEN_SECTIONS.some(hidden => section === hidden || section.includes(hidden));
                if (isHidden) {
                    console.log('  -> HIDING:', section);
                    btn.style.display = 'none';
                    return;
                }
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
    
    // CRITICAL: Reset nav-category collapsed states to fix UI alignment
    resetNavCategoryStates();
}

/**
 * Reset all nav-category elements to ensure proper alignment
 * This fixes the issue where all nav buttons appear combined without category separators
 */
function resetNavCategoryStates() {
    console.log('🎨 resetNavCategoryStates called');
    
    // First, ensure all nav-separators are visible (unless for personal users)
    const currentUser = window.currentUser;
    const isPersonal = currentUser?.role === 'personal';
    
    const separators = document.querySelectorAll('.nav-separator');
    separators.forEach(sep => {
        // Don't show platform admin for non-founders
        if (sep.id === 'platformAdminNav') return;
        
        // For personal users, hide business-specific separators
        if (isPersonal) {
            const text = sep.textContent.trim().toLowerCase();
            if (text.includes('sales') || text.includes('crm') || 
                text.includes('operations') || text.includes('purchasing') || 
                text.includes('hr') || text.includes('payroll') ||
                text.includes('multi-branch') || text.includes('branch')) {
                sep.style.display = 'none';
            } else {
                sep.style.display = '';
            }
        } else {
            sep.style.display = '';
        }
    });
    
    // Reset all categories to be visible and properly styled
    const categories = document.querySelectorAll('.nav-category');
    console.log('🎨 Total nav-categories:', categories.length);
    
    categories.forEach((cat, index) => {
        // Remove collapsed class
        cat.classList.remove('collapsed');
        
        // Force proper display style - reset all inline styles that might break layout
        cat.style.display = 'flex';
        cat.style.flexDirection = 'column';
        cat.style.gap = '8px';
        cat.style.maxHeight = ''; // Clear any max-height that might have been set
        cat.style.overflow = ''; // Clear any overflow setting
        
        // Check if all buttons inside are hidden (by permission check)
        const buttons = cat.querySelectorAll('.nav-btn');
        const visibleButtons = Array.from(buttons).filter(btn => {
            // Check both display style and computed style
            const isHidden = btn.style.display === 'none' || 
                window.getComputedStyle(btn).display === 'none';
            return !isHidden;
        });
        
        console.log(`🎨 Category ${index}: ${buttons.length} buttons, ${visibleButtons.length} visible`);
        
        // If no visible buttons, hide the entire category and its separator
        if (visibleButtons.length === 0) {
            cat.style.display = 'none';
            const prevSep = cat.previousElementSibling;
            if (prevSep && prevSep.classList.contains('nav-separator')) {
                prevSep.style.display = 'none';
            }
        }
    });
    
    // Also reset all nav-separators to visible (permissions will re-hide what's needed)
    const allSeparators = document.querySelectorAll('.nav-separator:not(#platformAdminNav)');
    allSeparators.forEach(sep => {
        sep.style.display = '';
    });
    
    // Reset collapse icons
    const icons = document.querySelectorAll('.nav-separator .collapse-icon');
    icons.forEach(icon => icon.classList.remove('rotated'));
    
    console.log('🎨 resetNavCategoryStates complete');
}

/**
 * Hide navigation separators that are business-only
 */
function hideBusinessNavSeparators() {
    const separators = document.querySelectorAll('.nav-separator');
    separators.forEach(sep => {
        const text = sep.textContent.trim().toLowerCase();
        if (text.includes('sales') || text.includes('crm') || 
            text.includes('operations') || text.includes('purchasing') || 
            text.includes('hr') || text.includes('payroll') ||
            text.includes('multi-branch') || text.includes('branch')) {
            sep.style.display = 'none';
        }
    });
}

/**
 * Show all navigation separators
 */
function showAllNavSeparators() {
    const separators = document.querySelectorAll('.nav-separator');
    separators.forEach(sep => {
        if (!sep.id || sep.id !== 'platformAdminNav') {
            sep.style.display = '';
        }
    });
}

// ==================== UTILITY FUNCTIONS ====================

/**
 * Get role definition by role ID
 * @param {string} roleId - The role identifier
 * @returns {Object|null} - Role definition or null
 */
function getRoleDefinition(roleId) {
    return ROLES[roleId] || null;
}

/**
 * Get all modules for a category
 * @param {string} categoryId - The category identifier
 * @returns {Array} - Array of modules
 */
function getModulesByCategory(categoryId) {
    const category = ERP_MODULE_CATEGORIES.find(cat => cat.id === categoryId);
    return category ? category.modules : [];
}

/**
 * Get module definition by ID
 * @param {string} moduleId - The module identifier
 * @returns {Object|null} - Module definition or null
 */
function getModuleDefinition(moduleId) {
    return ERP_MODULES.find(m => m.id === moduleId) || null;
}

// ==================== EXPORTS ====================

// Export to window for backward compatibility with users.js
window.ROLES = ROLES;
window.ERP_MODULES = ERP_MODULES;
window.ERP_MODULE_CATEGORIES = ERP_MODULE_CATEGORIES;
window.PERSONAL_HIDDEN_SECTIONS = PERSONAL_HIDDEN_SECTIONS;
window.MODULE_MAP = MODULE_MAP;

// Export functions
window.canAccessModule = canAccessModule;
window.canManageRole = canManageRole;
window.applyUserPermissions = applyUserPermissions;
window.hideBusinessNavSeparators = hideBusinessNavSeparators;
window.showAllNavSeparators = showAllNavSeparators;
window.resetNavCategoryStates = resetNavCategoryStates;
window.getOwnerPlanFeatures = getOwnerPlanFeatures;
window.applyOwnerPlanRestrictions = applyOwnerPlanRestrictions;

// Utility exports
window.getRoleDefinition = getRoleDefinition;
window.getModulesByCategory = getModulesByCategory;
window.getModuleDefinition = getModuleDefinition;

console.log('✅ Permissions module loaded (v1.0.0)');
