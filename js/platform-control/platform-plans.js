/**
 * EZCubic - Platform Plans
 * Plan limits, permissions, and usage checking
 * Split from platform-control.js v2.2.6 - 22 Jan 2025
 */

// ==================== AUTO PERMISSION ASSIGNMENT ====================

/**
 * Get permissions automatically based on plan
 * This function maps each plan to its allowed modules
 */
function getPermissionsForPlan(planId) {
    const settings = getPlatformSettings();
    const plan = settings.plans[planId];
    
    if (!plan) {
        console.warn(`Plan "${planId}" not found, using default permissions`);
        return ['dashboard'];
    }
    
    // If plan has 'all' feature, return all module permissions
    if (plan.features.includes('all')) {
        return ['all'];
    }
    
    // Return the specific features for this plan
    return [...plan.features];
}

/**
 * Apply plan-based restrictions to a user
 * Call this when user logs in to enforce their plan limits
 */
function applyPlanToUser(user) {
    if (!user || !user.plan) return;
    
    const settings = getPlatformSettings();
    const plan = settings.plans[user.plan];
    
    if (!plan) return;
    
    // Update user permissions based on current plan features
    user.permissions = getPermissionsForPlan(user.plan);
    
    // Apply UI restrictions
    applyFeatureRestrictions(user.plan);
    
    return user;
}

/**
 * Upgrade user plan and update permissions
 */
function upgradeUserPlan(userId, newPlanId) {
    if (typeof loadUsers === 'function') loadUsers();
    const user = window.users.find(u => u.id === userId);
    if (!user) return false;
    
    const settings = getPlatformSettings();
    const newPlan = settings.plans[newPlanId];
    if (!newPlan) return false;
    
    // Update user plan and permissions
    user.plan = newPlanId;
    user.permissions = getPermissionsForPlan(newPlanId);
    user.updatedAt = new Date().toISOString();
    
    // Update subscription if tenant exists
    if (user.tenantId && user.tenantId !== 'personal_' + user.id.split('_')[1]) {
        const subs = getSubscriptions();
        if (subs[user.tenantId]) {
            subs[user.tenantId].plan = newPlanId;
            subs[user.tenantId].updatedAt = new Date().toISOString();
            localStorage.setItem(SUBSCRIPTIONS_KEY, JSON.stringify(subs));
        }
    }
    
    if (typeof saveUsers === 'function') saveUsers();
    showToast(`User upgraded to ${newPlan.name} plan!`, 'success');
    return true;
}

/**
 * Get plan features summary for display
 */
function getPlanFeaturesSummary(planId) {
    const settings = getPlatformSettings();
    const plan = settings.plans[planId];
    
    if (!plan) return [];
    
    // Map feature IDs to readable names (all 28 features)
    const featureNames = {
        'dashboard': 'Dashboard & Overview',
        'transactions': 'Transaction Management',
        'income': 'Record Income',
        'expenses': 'Record Expenses',
        'bills': 'Bills Management',
        'reports': 'Financial Reports',
        'taxes': 'Tax Calculator',
        'balance': 'Balance Sheet',
        'monthly-reports': 'Monthly Reports',
        'bank-reconciliation': 'Bank Reconciliation',
        'ai-chatbot': 'AI Assistant',
        'pos': 'Point of Sale',
        'inventory': 'Inventory Management',
        'stock': 'Stock Management',
        'orders': 'Orders Management',
        'crm': 'CRM / Customers',
        'customers': 'Customer Database',
        'suppliers': 'Supplier Management',
        'purchase-orders': 'Purchase Orders',
        'delivery-orders': 'Delivery Orders',
        'quotations': 'Quotations',
        'invoices': 'Invoices',
        'email-invoice': 'Invoice/Receipt',
        'projects': 'Project Management',
        'employees': 'Employee Directory',
        'payroll': 'Payroll Management',
        'leave-attendance': 'Leave & Attendance',
        'kpi': 'KPI & Performance',
        'einvoice': 'e-Invoice (LHDN)',
        'branches': 'Multi-Branch',
        'settings': 'Settings',
        'users': 'User Management',
        'backup-restore': 'Backup & Restore',
        'all': 'Full Access - All Features'
    };
    
    if (plan.features.includes('all')) {
        return ['Full Access - All Features'];
    }
    
    return plan.features.map(f => featureNames[f] || f);
}

// ==================== PLAN LIMIT CHECKING ====================

/**
 * Get current user's plan limits
 */
function getCurrentPlanLimits() {
    const user = window.currentUser || (typeof getCurrentUser === 'function' ? getCurrentUser() : null);
    if (!user) return null;
    
    // Founder/ERP Assistant = unlimited everything
    if (user.role === 'founder' || user.role === 'erp_assistant') {
        return {
            transactions: -1,
            products: -1,
            customers: -1,
            users: -1,
            branches: -1,
            storage: -1,
            quotations: -1,
            projects: -1
        };
    }
    
    const settings = getPlatformSettings();
    const planId = user.plan || 'starter';
    const plan = settings.plans[planId];
    
    console.log('getCurrentPlanLimits - user:', user.name, 'role:', user.role, 'plan:', planId, 'limits:', plan?.limits);
    
    return plan ? plan.limits : null;
}

/**
 * Get current usage counts for the logged-in user's tenant
 */
function getCurrentUsage() {
    const user = window.currentUser || (typeof getCurrentUser === 'function' ? getCurrentUser() : null);
    if (!user || !user.tenantId) return null;
    
    const tenantKey = 'ezcubic_tenant_' + user.tenantId;
    const tenantData = JSON.parse(localStorage.getItem(tenantKey) || '{}');
    
    // Count users in same tenant
    const users = JSON.parse(localStorage.getItem('ezcubic_users') || '[]');
    const tenantUsers = users.filter(u => u.tenantId === user.tenantId).length;
    
    // Get products count - try window first, then tenant data, then legacy storage
    let productsCount = 0;
    if (Array.isArray(window.products) && window.products.length > 0) {
        productsCount = window.products.length;
    } else if (Array.isArray(tenantData.products)) {
        productsCount = tenantData.products.length;
    } else {
        const legacyProducts = JSON.parse(localStorage.getItem('ezcubic_products') || '[]');
        productsCount = legacyProducts.length;
    }
    
    // Get customers count - combine CRM customers + legacy customers
    let customersCount = 0;
    // CRM customers (main customer module)
    if (Array.isArray(window.crmCustomers) && window.crmCustomers.length > 0) {
        customersCount = window.crmCustomers.length;
    } else if (Array.isArray(tenantData.crmCustomers)) {
        customersCount = tenantData.crmCustomers.length;
    } else {
        const legacyCRM = JSON.parse(localStorage.getItem('ezcubic_crm_customers') || '[]');
        customersCount = legacyCRM.length;
    }
    // Also count legacy customers if separate
    if (Array.isArray(tenantData.customers)) {
        customersCount = Math.max(customersCount, tenantData.customers.length);
    }
    
    // Get transactions count - try businessData first, then tenant data
    let transactionsCount = 0;
    if (typeof businessData !== 'undefined' && Array.isArray(businessData.transactions)) {
        transactionsCount = businessData.transactions.length;
    } else if (Array.isArray(tenantData.transactions)) {
        transactionsCount = tenantData.transactions.length;
    }
    
    // Get branches count
    let branchesCount = 1; // At least 1 (HQ)
    if (Array.isArray(window.branches) && window.branches.length > 0) {
        branchesCount = window.branches.length;
    } else if (Array.isArray(tenantData.branches)) {
        branchesCount = tenantData.branches.length || 1;
    }
    
    // Get employees count (for Professional/Enterprise plans)
    let employeesCount = 0;
    if (Array.isArray(window.employees) && window.employees.length > 0) {
        employeesCount = window.employees.length;
    } else if (Array.isArray(tenantData.employees)) {
        employeesCount = tenantData.employees.length;
    }
    
    console.log('getCurrentUsage:', {
        transactions: transactionsCount,
        products: productsCount,
        customers: customersCount,
        users: tenantUsers,
        employees: employeesCount,
        branches: branchesCount
    });
    
    return {
        transactions: transactionsCount,
        products: productsCount,
        customers: customersCount,
        users: tenantUsers,
        employees: employeesCount,
        branches: branchesCount,
        quotations: (tenantData.quotations || []).length,
        projects: (tenantData.projects || []).length,
        sales: (tenantData.sales || window.sales || []).length
    };
}

/**
 * Check if a specific limit has been reached
 * @param {string} limitType - Type of limit (transactions, products, customers, users, branches)
 * @returns {object} - { allowed: boolean, current: number, limit: number, message: string }
 */
function checkLimit(limitType) {
    // Get current user from multiple sources
    const currentUser = window.currentUser || (typeof getCurrentUser === 'function' ? getCurrentUser() : null);
    
    // Founder and ERP Assistant have no limits - always allowed
    if (currentUser?.role === 'founder' || currentUser?.role === 'erp_assistant') {
        console.log('checkLimit - founder/erp_assistant detected, unlimited access');
        return { allowed: true, current: 0, limit: -1, message: '' };
    }
    
    const limits = getCurrentPlanLimits();
    const usage = getCurrentUsage();
    
    if (!limits || !usage) {
        return { allowed: true, current: 0, limit: -1, message: '' };
    }
    
    const limit = limits[limitType];
    const current = usage[limitType] || 0;
    
    // -1 means unlimited
    if (limit === -1) {
        return { allowed: true, current, limit: -1, message: '' };
    }
    
    // 0 means feature not available
    if (limit === 0) {
        return { 
            allowed: false, 
            current, 
            limit: 0, 
            message: `${formatLimitType(limitType)} is not available in your current plan. Please upgrade.`
        };
    }
    
    const allowed = current < limit;
    const remaining = limit - current;
    
    return {
        allowed,
        current,
        limit,
        remaining: Math.max(0, remaining),
        message: allowed 
            ? `${remaining} ${formatLimitType(limitType)} remaining` 
            : `You have reached your ${formatLimitType(limitType)} limit (${limit}). Please upgrade your plan.`
    };
}

/**
 * Format limit type for display
 */
function formatLimitType(type) {
    const names = {
        transactions: 'transactions',
        products: 'products',
        customers: 'customers',
        users: 'team members',
        branches: 'branches/outlets',
        quotations: 'quotations',
        projects: 'projects',
        storage: 'storage'
    };
    return names[type] || type;
}

/**
 * Check if user can add more of a resource type
 * Shows toast warning if limit reached
 * @returns {boolean} - true if allowed, false if limit reached
 */
function canAdd(limitType, showWarning = true) {
    const result = checkLimit(limitType);
    
    if (!result.allowed && showWarning) {
        showLimitReachedModal(limitType, result);
    }
    
    return result.allowed;
}

/**
 * Get icon for limit type
 */
function getLimitIcon(limitType) {
    const icons = {
        transactions: '<i class="fas fa-exchange-alt" style="color: #3b82f6;"></i>',
        products: '<i class="fas fa-boxes" style="color: #f59e0b;"></i>',
        customers: '<i class="fas fa-users" style="color: #10b981;"></i>',
        users: '<i class="fas fa-user-friends" style="color: #8b5cf6;"></i>',
        branches: '<i class="fas fa-code-branch" style="color: #ec4899;"></i>',
        quotations: '<i class="fas fa-file-alt" style="color: #06b6d4;"></i>',
        projects: '<i class="fas fa-project-diagram" style="color: #6366f1;"></i>',
        storage: '<i class="fas fa-database" style="color: #64748b;"></i>'
    };
    return icons[limitType] || '<i class="fas fa-ban" style="color: #ef4444;"></i>';
}

/**
 * Show limit reached modal with upgrade options
 */
function showLimitReachedModal(limitType, limitResult) {
    const user = window.currentUser;
    const currentPlan = user?.plan || 'starter';
    const settings = getPlatformSettings();
    
    // Find upgrade options
    const planOrder = ['personal', 'starter', 'professional', 'enterprise'];
    const currentIndex = planOrder.indexOf(currentPlan);
    const upgradePlans = planOrder.slice(currentIndex + 1).map(id => ({
        id,
        ...settings.plans[id]
    }));
    
    document.getElementById('limitReachedModal')?.remove();
    
    const modalHTML = `
        <div class="modal show" id="limitReachedModal" style="z-index: 10002;">
            <div class="modal-content" style="max-width: 500px;">
                <div class="modal-header" style="background: linear-gradient(135deg, #ef4444, #dc2626); color: white;">
                    <h3 class="modal-title"><i class="fas fa-exclamation-triangle"></i> Limit Reached</h3>
                    <button class="modal-close" onclick="closeModal('limitReachedModal')" style="color: white;">&times;</button>
                </div>
                <div style="padding: 25px; text-align: center;">
                    <div style="font-size: 60px; margin-bottom: 15px;">
                        ${getLimitIcon(limitType)}
                    </div>
                    <h4 style="color: #1e293b; margin-bottom: 10px;">
                        ${formatLimitType(limitType).charAt(0).toUpperCase() + formatLimitType(limitType).slice(1)} Limit Reached
                    </h4>
                    <p style="color: #64748b; margin-bottom: 20px;">
                        You've used <strong>${limitResult.current}</strong> of <strong>${limitResult.limit}</strong> ${formatLimitType(limitType)} 
                        in your <strong style="color: ${settings.plans[currentPlan]?.color}">${settings.plans[currentPlan]?.name}</strong> plan.
                    </p>
                    
                    ${upgradePlans.length > 0 ? `
                        <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 10px; padding: 15px; margin-bottom: 20px;">
                            <p style="font-weight: 600; color: #166534; margin-bottom: 10px;">
                                <i class="fas fa-arrow-up"></i> Upgrade to get more:
                            </p>
                            <div style="display: flex; gap: 10px; justify-content: center; flex-wrap: wrap;">
                                ${upgradePlans.map(plan => `
                                    <div style="background: white; border: 2px solid ${plan.color}; border-radius: 8px; padding: 12px 15px; min-width: 120px;">
                                        <div style="font-weight: 600; color: ${plan.color};">${plan.name}</div>
                                        <div style="font-size: 18px; font-weight: 700; color: #1e293b;">
                                            ${plan.limits[limitType] === -1 ? '∞' : plan.limits[limitType]}
                                        </div>
                                        <div style="font-size: 11px; color: #64748b;">${formatLimitType(limitType)}</div>
                                        <div style="font-size: 12px; color: #64748b; margin-top: 5px;">RM${plan.price}/mo</div>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    ` : ''}
                </div>
                <div class="modal-footer" style="justify-content: center; gap: 10px;">
                    <button class="btn-secondary" onclick="closeModal('limitReachedModal')">
                        <i class="fas fa-times"></i> Close
                    </button>
                    ${upgradePlans.length > 0 ? `
                        <button class="btn-primary" onclick="closeModal('limitReachedModal'); showUpgradePlanModal();" style="background: linear-gradient(135deg, #10b981, #059669);">
                            <i class="fas fa-rocket"></i> Upgrade Plan
                        </button>
                    ` : ''}
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

/**
 * Request plan upgrade (for demo, just shows a message)
 */
function requestPlanUpgrade(planId) {
    const settings = getPlatformSettings();
    const plan = settings.plans[planId];
    
    if (typeof closeModal === 'function') closeModal('upgradePlanModal');
    
    showToast(`To upgrade to ${plan.name} (RM${plan.price}/mo), please contact support or visit your billing page.`, 'info');
    
    // In production, this would redirect to a payment page
    // window.location.href = '/billing?plan=' + planId;
}

/**
 * Get usage summary for display in dashboard or settings
 */
function getUsageSummary() {
    const limits = getCurrentPlanLimits();
    const usage = getCurrentUsage();
    
    if (!limits || !usage) return null;
    
    const summary = {};
    const limitTypes = ['transactions', 'products', 'customers', 'users', 'branches'];
    
    limitTypes.forEach(type => {
        const limit = limits[type];
        const current = usage[type] || 0;
        
        summary[type] = {
            current,
            limit: limit === -1 ? '∞' : limit,
            percentage: limit === -1 ? 0 : (limit === 0 ? 100 : Math.min(100, (current / limit) * 100)),
            unlimited: limit === -1,
            blocked: limit === 0
        };
    });
    
    return summary;
}

/**
 * Render usage widget for dashboard - Premium styled cards for all plans
 */
function renderUsageWidget() {
    const container = document.getElementById('usageWidget');
    if (!container) return;
    
    const user = window.currentUser;
    if (!user) return;
    
    // Plan styling configurations
    const planStyles = {
        founder: {
            gradient: 'linear-gradient(135deg, #1e1b4b, #312e81)',
            badgeGradient: 'linear-gradient(135deg, #fbbf24, #f59e0b)',
            badgeText: '#1e1b4b',
            icon: 'fa-crown',
            iconColor: '#fbbf24',
            title: 'Platform Admin',
            subtitle: 'Full access to all ERP features with no restrictions',
            cardBg: 'rgba(255,255,255,0.1)',
            textColor: 'white'
        },
        enterprise: {
            gradient: 'linear-gradient(135deg, #0f172a, #1e293b)',
            badgeGradient: 'linear-gradient(135deg, #f59e0b, #d97706)',
            badgeText: '#0f172a',
            icon: 'fa-gem',
            iconColor: '#f59e0b',
            title: 'Enterprise Suite',
            subtitle: 'Maximum power for large organizations',
            cardBg: 'rgba(255,255,255,0.08)',
            textColor: 'white'
        },
        professional: {
            gradient: 'linear-gradient(135deg, #4c1d95, #6d28d9)',
            badgeGradient: 'linear-gradient(135deg, #a78bfa, #8b5cf6)',
            badgeText: '#4c1d95',
            icon: 'fa-briefcase',
            iconColor: '#c4b5fd',
            title: 'Professional Suite',
            subtitle: 'Advanced features for growing businesses',
            cardBg: 'rgba(255,255,255,0.1)',
            textColor: 'white'
        },
        business: {
            gradient: 'linear-gradient(135deg, #1e40af, #3b82f6)',
            badgeGradient: 'linear-gradient(135deg, #60a5fa, #3b82f6)',
            badgeText: '#1e40af',
            icon: 'fa-building',
            iconColor: '#93c5fd',
            title: 'Business Suite',
            subtitle: 'Comprehensive tools for your business',
            cardBg: 'rgba(255,255,255,0.1)',
            textColor: 'white'
        },
        starter: {
            gradient: 'linear-gradient(135deg, #047857, #10b981)',
            badgeGradient: 'linear-gradient(135deg, #6ee7b7, #34d399)',
            badgeText: '#047857',
            icon: 'fa-rocket',
            iconColor: '#a7f3d0',
            title: 'Starter Plan',
            subtitle: 'Essential features to get you started',
            cardBg: 'rgba(255,255,255,0.1)',
            textColor: 'white'
        },
        personal: {
            gradient: 'linear-gradient(135deg, #64748b, #94a3b8)',
            badgeGradient: 'linear-gradient(135deg, #e2e8f0, #cbd5e1)',
            badgeText: '#475569',
            icon: 'fa-user',
            iconColor: '#e2e8f0',
            title: 'Personal Account',
            subtitle: 'Track your personal finances easily',
            cardBg: 'rgba(255,255,255,0.1)',
            textColor: 'white'
        }
    };
    
    // Determine user's plan style
    let styleKey = 'starter';
    if (user.role === 'founder') {
        styleKey = 'founder';
    } else if (user.plan) {
        styleKey = user.plan.toLowerCase().replace(/\s+/g, '');
        if (!planStyles[styleKey]) styleKey = 'starter';
    }
    
    const style = planStyles[styleKey];
    const settings = getPlatformSettings();
    const planConfig = settings.plans[user.plan || 'starter'];
    const summary = getUsageSummary();
    
    // Get limits and current usage for display
    const limits = planConfig?.limits || {};
    const isFounder = styleKey === 'founder';
    
    // Build display items with current/limit
    const displayLimits = [
        { 
            key: 'users', 
            icon: 'fa-users', 
            label: 'Users', 
            current: summary?.users?.current || 0,
            limit: isFounder ? -1 : (limits.users || 1)
        },
        { 
            key: 'products', 
            icon: 'fa-box', 
            label: 'Products', 
            current: summary?.products?.current || 0,
            limit: isFounder ? -1 : (limits.products || 50)
        },
        { 
            key: 'branches', 
            icon: 'fa-building', 
            label: 'Branches', 
            current: summary?.branches?.current || 0,
            limit: isFounder ? -1 : (limits.branches || 1)
        }
    ];
    
    // Format limit display: "current/limit" or "current/∞"
    const formatUsage = (current, limit) => {
        if (limit === -1 || limit === '∞' || limit === 'unlimited') {
            return `${current}/∞`;
        }
        return `${current}/${limit}`;
    };
    
    // Calculate usage percentage for color
    const getUsageColor = (current, limit) => {
        if (limit === -1 || limit === '∞') return 'rgba(255,255,255,0.9)';
        const pct = (current / limit) * 100;
        if (pct >= 90) return '#fca5a5'; // Red
        if (pct >= 70) return '#fcd34d'; // Yellow
        return 'rgba(255,255,255,0.9)'; // Normal
    };
    
    container.innerHTML = `
        <div style="background: ${style.gradient}; border-radius: 12px; padding: 20px; box-shadow: 0 4px 15px rgba(0,0,0,0.2); color: ${style.textColor};">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                <h4 style="margin: 0; color: ${style.textColor};">
                    <i class="fas ${style.icon}" style="color: ${style.iconColor};"></i> ${style.title}
                </h4>
                <span style="background: ${style.badgeGradient}; color: ${style.badgeText}; padding: 4px 12px; border-radius: 15px; font-size: 11px; font-weight: 700; text-transform: uppercase;">
                    ${styleKey === 'founder' ? 'FOUNDER' : (planConfig?.name || user.plan || 'STARTER')}
                </span>
            </div>
            
            <div style="text-align: center; padding: 15px 0;">
                <i class="fas ${styleKey === 'founder' || styleKey === 'enterprise' ? 'fa-infinity' : 'fa-chart-line'}" style="font-size: 32px; color: ${style.iconColor}; margin-bottom: 10px; display: block;"></i>
                <div style="font-size: 16px; font-weight: 600; margin-bottom: 5px;">${styleKey === 'founder' ? 'Unlimited Access' : style.subtitle}</div>
                ${styleKey !== 'founder' ? `<div style="font-size: 12px; opacity: 0.7;">Your subscription is active</div>` : `<div style="font-size: 12px; opacity: 0.7;">Full access to all ERP features</div>`}
            </div>
            
            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-top: 15px;">
                ${displayLimits.map(item => `
                    <div style="background: ${style.cardBg}; border-radius: 8px; padding: 10px; text-align: center;">
                        <i class="fas ${item.icon}" style="font-size: 16px; margin-bottom: 5px;"></i>
                        <div style="font-size: 10px; opacity: 0.8;">${item.label}</div>
                        <div style="font-size: 13px; font-weight: 600; color: ${getUsageColor(item.current, item.limit)};">${formatUsage(item.current, item.limit)}</div>
                    </div>
                `).join('')}
            </div>
            
            ${styleKey !== 'founder' && styleKey !== 'enterprise' ? `
                <button class="btn-sm" style="width: 100%; margin-top: 15px; background: rgba(255,255,255,0.2); color: white; border: 1px solid rgba(255,255,255,0.3); backdrop-filter: blur(10px);"
                    onclick="showUpgradePlanModal()">
                    <i class="fas fa-arrow-up"></i> Upgrade Plan
                </button>
            ` : ''}
        </div>
    `;
}

// ==================== TEST LIMIT FUNCTION ====================
/**
 * Test function to simulate transaction limit
 * Usage in console: testTransactionLimit(500) - simulates 500 transactions
 */
function testTransactionLimit(simulatedCount = null) {
    const user = window.currentUser;
    if (!user) {
        console.log('❌ No user logged in');
        return;
    }
    
    const limits = getCurrentPlanLimits();
    const usage = getCurrentUsage();
    
    console.log('📊 Current Plan:', user.plan || 'starter');
    console.log('📈 Transaction Limit:', limits?.transactions === -1 ? 'Unlimited' : limits?.transactions);
    console.log('📝 Current Transactions:', usage?.transactions || 0);
    
    if (simulatedCount !== null) {
        // Temporarily override for testing
        const originalUsage = getCurrentUsage;
        window.getCurrentUsage = function() {
            const real = originalUsage();
            return { ...real, transactions: simulatedCount };
        };
        
        console.log('\n🧪 SIMULATING', simulatedCount, 'transactions...');
        const result = checkLimit('transactions');
        console.log('Result:', result);
        
        if (!result.allowed) {
            console.log('🚫 LIMIT REACHED! Showing modal...');
            showLimitReachedModal('transactions', result);
        } else {
            console.log('✅ Still allowed. Remaining:', result.remaining);
        }
        
        // Restore original
        window.getCurrentUsage = originalUsage;
    } else {
        // Just check current status
        const result = checkLimit('transactions');
        console.log('\n📋 Limit Check Result:', result);
        
        if (!result.allowed) {
            console.log('🚫 LIMIT REACHED!');
        } else {
            console.log('✅ Allowed. Remaining:', result.remaining);
        }
    }
    
    return checkLimit('transactions');
}

// ==================== GLOBAL EXPORTS ====================
window.getPermissionsForPlan = getPermissionsForPlan;
window.applyPlanToUser = applyPlanToUser;
window.upgradeUserPlan = upgradeUserPlan;
window.getPlanFeaturesSummary = getPlanFeaturesSummary;
window.getCurrentPlanLimits = getCurrentPlanLimits;
window.getCurrentUsage = getCurrentUsage;
window.checkLimit = checkLimit;
window.formatLimitType = formatLimitType;
window.canAdd = canAdd;
window.getLimitIcon = getLimitIcon;
window.showLimitReachedModal = showLimitReachedModal;
window.requestPlanUpgrade = requestPlanUpgrade;
window.getUsageSummary = getUsageSummary;
window.renderUsageWidget = renderUsageWidget;
window.testTransactionLimit = testTransactionLimit;
