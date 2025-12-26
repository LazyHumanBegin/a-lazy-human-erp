/**
 * EZCubic - Platform Control System
 * For platform providers to manage subscriptions, automation, and control
 * Version: 1.0.0 - 17 Dec 2025
 */

// ==================== PLATFORM SETTINGS ====================
const PLATFORM_SETTINGS_KEY = 'ezcubic_platform_settings';

const DEFAULT_PLATFORM_SETTINGS = {
    platformName: 'A Lazy Human ERP',
    platformLogo: null,
    
    // Registration & Onboarding
    allowSelfRegistration: true,
    requireEmailVerification: false, // Would need email server in production
    defaultPlan: 'starter',
    autoCreateBusiness: true, // Auto-create business when Business Admin signs up
    
    // Trial Settings
    enableTrials: true,
    trialDays: 14,
    
    // Feature Limits by Plan - Bundle Configuration
    plans: {
        personal: {
            name: 'Personal',
            price: 0,
            color: '#64748b',
            description: 'For personal finance tracking',
            limits: {
                transactions: 500,
                products: 0,
                customers: 0,
                users: 1,
                branches: 0, // No branches for Personal
                storage: 50 // MB
            },
            // Personal only gets basic accounting features - no team management
            features: ['dashboard', 'transactions', 'income', 'expenses', 'reports', 'taxes', 'balance', 'monthly-reports', 'ai-chatbot', 'settings'],
            hiddenSections: ['pos', 'inventory', 'stock', 'orders', 'crm', 'customers', 'suppliers', 'quotations', 'projects', 'payroll', 'leave-attendance', 'einvoice', 'branches', 'user-management', 'purchase-orders', 'delivery-orders', 'employees', 'kpi', 'lhdn-export', 'bank-reconciliation', 'chart-of-accounts', 'journal-entries', 'aging-reports']
        },
        starter: {
            name: 'Starter',
            price: 49,
            color: '#2563eb',
            description: 'For small businesses',
            limits: {
                transactions: 5000,
                products: 100,
                customers: 100,
                users: 3,
                branches: 1,
                storage: 500
            },
            // Starter gets basic business features + can add up to 3 users
            features: ['dashboard', 'transactions', 'income', 'expenses', 'reports', 'taxes', 'balance', 'monthly-reports', 'ai-chatbot', 'pos', 'inventory', 'crm', 'bills', 'quotations', 'invoices', 'lhdn-export', 'chart-of-accounts', 'journal-entries', 'aging-reports', 'settings', 'users'],
            hiddenSections: ['stock', 'orders', 'suppliers', 'projects', 'payroll', 'leave-attendance', 'einvoice', 'branches', 'purchase-orders', 'delivery-orders', 'employees', 'kpi', 'bank-reconciliation']
        },
        professional: {
            name: 'Professional',
            price: 149,
            color: '#10b981',
            description: 'For growing businesses',
            limits: {
                transactions: -1, // Unlimited
                products: 1000,
                customers: 1000,
                users: 10,
                branches: 3, // Up to 3 branches/outlets
                storage: 2000
            },
            // Professional gets ALL features including branches (up to 3)
            features: ['dashboard', 'transactions', 'income', 'expenses', 'reports', 'taxes', 'balance', 'monthly-reports', 'ai-chatbot', 'pos', 'inventory', 'stock', 'orders', 'crm', 'bills', 'quotations', 'invoices', 'suppliers', 'purchase-orders', 'delivery-orders', 'projects', 'employees', 'payroll', 'leave-attendance', 'kpi', 'einvoice', 'branches', 'bank-reconciliation', 'lhdn-export', 'chart-of-accounts', 'journal-entries', 'aging-reports', 'settings', 'users'],
            hiddenSections: [] // Professional now has access to branches (limited to 3)
        },
        enterprise: {
            name: 'Enterprise',
            price: 399,
            color: '#7c3aed',
            description: 'For large organizations with multiple outlets',
            limits: {
                transactions: -1,
                products: -1,
                customers: -1,
                users: -1,
                branches: -1, // Unlimited branches/outlets
                storage: -1
            },
            // Enterprise gets EVERYTHING including multi-branch/outlet
            features: ['all'],
            hiddenSections: []
        }
    },
    
    // Automation Settings
    automation: {
        autoSuspendOnExpiry: true,
        gracePeriodDays: 7,
        sendExpiryReminders: true,
        reminderDaysBefore: [7, 3, 1],
        autoBackupEnabled: true,
        backupFrequency: 'daily'
    },
    
    // Notifications
    notifications: {
        newUserNotify: true,
        newBusinessNotify: true,
        paymentNotify: true
    }
};

// ==================== SUBSCRIPTION MANAGEMENT ====================
const SUBSCRIPTIONS_KEY = 'ezcubic_subscriptions';

function getSubscriptions() {
    const stored = localStorage.getItem(SUBSCRIPTIONS_KEY);
    return stored ? JSON.parse(stored) : {};
}

function saveSubscriptions(subs) {
    localStorage.setItem(SUBSCRIPTIONS_KEY, JSON.stringify(subs));
}

function createSubscription(tenantId, plan = 'starter', isTrialVal = true) {
    console.log('📝 createSubscription called:', tenantId, plan, isTrialVal);
    const settings = getPlatformSettings();
    const subs = getSubscriptions();
    
    const now = new Date();
    let expiresAt;
    let isTrial = isTrialVal;
    
    // Personal plan is always FREE - no trial, no expiry
    if (plan === 'personal') {
        isTrial = false;
        expiresAt = null; // Never expires
        
        subs[tenantId] = {
            tenantId,
            plan,
            status: 'active',
            isTrial: false,
            isFree: true, // Mark as free plan
            startedAt: now.toISOString(),
            expiresAt: null, // Never expires
            autoRenew: false,
            paymentMethod: null,
            history: [{
                action: 'free_plan_activated',
                plan,
                timestamp: now.toISOString()
            }]
        };
        
        saveSubscriptions(subs);
        return subs[tenantId];
    }
    
    // For paid plans - check trial
    if (isTrial && settings.enableTrials) {
        expiresAt = new Date(now.getTime() + (settings.trialDays * 24 * 60 * 60 * 1000));
    } else {
        // 30 days subscription
        expiresAt = new Date(now.getTime() + (30 * 24 * 60 * 60 * 1000));
    }
    
    subs[tenantId] = {
        tenantId,
        plan,
        status: 'active',
        isTrial: isTrial,
        isFree: false,
        startedAt: now.toISOString(),
        expiresAt: expiresAt.toISOString(),
        autoRenew: false,
        paymentMethod: null,
        history: [{
            action: isTrial ? 'trial_started' : 'subscription_started',
            plan,
            timestamp: now.toISOString()
        }]
    };
    
    saveSubscriptions(subs);
    return subs[tenantId];
}

function getSubscription(tenantId) {
    const subs = getSubscriptions();
    return subs[tenantId] || null;
}

function updateSubscription(tenantId, updates) {
    const subs = getSubscriptions();
    console.log('📝 updateSubscription called for:', tenantId, 'updates:', updates);
    console.log('📝 All subscription keys:', Object.keys(subs));
    console.log('📝 Current sub before update:', subs[tenantId]);
    
    if (subs[tenantId]) {
        subs[tenantId] = { ...subs[tenantId], ...updates };
        subs[tenantId].history = subs[tenantId].history || [];
        subs[tenantId].history.push({
            action: 'updated',
            changes: Object.keys(updates),
            timestamp: new Date().toISOString()
        });
        saveSubscriptions(subs);
        console.log('📝 Sub after update:', subs[tenantId]);
        
        // Verify it was saved
        const verify = JSON.parse(localStorage.getItem(SUBSCRIPTIONS_KEY) || '{}');
        console.log('📝 Verified from localStorage:', verify[tenantId]?.plan);
    } else {
        console.warn('⚠️ No subscription found for tenant:', tenantId);
        console.warn('⚠️ Available tenants:', Object.keys(subs));
    }
    return subs[tenantId];
}

function checkSubscriptionStatus(tenantId) {
    const sub = getSubscription(tenantId);
    if (!sub) return { valid: false, reason: 'no_subscription' };
    
    // Free plan (Personal) is always valid - never expires
    if (sub.isFree || sub.plan === 'personal') {
        return { valid: true, reason: 'free_plan', subscription: sub };
    }
    
    const now = new Date();
    const expires = new Date(sub.expiresAt);
    const settings = getPlatformSettings();
    
    if (sub.status === 'suspended') {
        return { valid: false, reason: 'suspended', subscription: sub };
    }
    
    if (sub.status === 'cancelled') {
        return { valid: false, reason: 'cancelled', subscription: sub };
    }
    
    if (now > expires) {
        // Check grace period
        const graceEnd = new Date(expires.getTime() + (settings.automation.gracePeriodDays * 24 * 60 * 60 * 1000));
        
        if (now > graceEnd && settings.automation.autoSuspendOnExpiry) {
            // Auto-suspend
            updateSubscription(tenantId, { status: 'suspended' });
            return { valid: false, reason: 'expired_suspended', subscription: sub };
        }
        
        return { valid: true, reason: 'grace_period', daysLeft: Math.ceil((graceEnd - now) / (24 * 60 * 60 * 1000)), subscription: sub };
    }
    
    const daysLeft = Math.ceil((expires - now) / (24 * 60 * 60 * 1000));
    return { valid: true, reason: 'active', daysLeft, subscription: sub };
}

// ==================== PLATFORM SETTINGS ====================
function getPlatformSettings() {
    const stored = localStorage.getItem(PLATFORM_SETTINGS_KEY);
    if (!stored) return DEFAULT_PLATFORM_SETTINGS;
    
    const parsed = JSON.parse(stored);
    
    // Deep merge plans - respect saved features, only use defaults for new plans
    const mergedPlans = {};
    Object.keys(DEFAULT_PLATFORM_SETTINGS.plans).forEach(planId => {
        const defaultPlan = DEFAULT_PLATFORM_SETTINGS.plans[planId];
        const storedPlan = parsed.plans?.[planId];
        
        // If plan exists in storage, use stored features (user has customized)
        // If plan doesn't exist in storage, use default features
        if (storedPlan) {
            mergedPlans[planId] = {
                ...defaultPlan,
                ...storedPlan,
                // Keep stored features as-is (respect user's choices)
                features: storedPlan.features || defaultPlan.features,
                hiddenSections: storedPlan.hiddenSections || defaultPlan.hiddenSections || [],
                limits: { ...defaultPlan.limits, ...(storedPlan.limits || {}) }
            };
        } else {
            // New plan not in storage - use defaults
            mergedPlans[planId] = { ...defaultPlan };
        }
    });
    
    return {
        ...DEFAULT_PLATFORM_SETTINGS,
        ...parsed,
        plans: mergedPlans
    };
}

function savePlatformSettings(settings) {
    localStorage.setItem(PLATFORM_SETTINGS_KEY, JSON.stringify(settings));
}

// ==================== USAGE TRACKING ====================
function getTenantUsage(tenantId) {
    const data = loadTenantData(tenantId);
    if (!data) return null;
    
    return {
        transactions: (data.transactions || []).length,
        products: (data.products || []).length,
        customers: (data.customers || []).length,
        users: (window.users || []).filter(u => u.tenantId === tenantId).length,
        branches: (data.branches || []).length || 1,
        // Estimate storage (rough calculation)
        storage: Math.round(JSON.stringify(data).length / 1024 / 1024 * 100) / 100 // MB
    };
}

function checkUsageLimits(tenantId) {
    const sub = getSubscription(tenantId);
    if (!sub) return { withinLimits: true, warnings: [] };
    
    const settings = getPlatformSettings();
    const plan = settings.plans[sub.plan];
    if (!plan) return { withinLimits: true, warnings: [] };
    
    const usage = getTenantUsage(tenantId);
    if (!usage) return { withinLimits: true, warnings: [] };
    
    const warnings = [];
    const exceeded = [];
    
    Object.entries(plan.limits).forEach(([key, limit]) => {
        if (limit === -1) return; // Unlimited
        
        const used = usage[key] || 0;
        const percentage = (used / limit) * 100;
        
        if (used >= limit) {
            exceeded.push({ key, used, limit });
        } else if (percentage >= 80) {
            warnings.push({ key, used, limit, percentage: Math.round(percentage) });
        }
    });
    
    return {
        withinLimits: exceeded.length === 0,
        exceeded,
        warnings,
        usage,
        limits: plan.limits
    };
}

// ==================== SELF-REGISTRATION ====================
function showRegistrationModal() {
    const settings = getPlatformSettings();
    
    if (!settings.allowSelfRegistration) {
        showToast('Registration is currently disabled. Please contact administrator.', 'error');
        return;
    }
    
    document.getElementById('registrationModal')?.remove();
    
    const plansHTML = Object.entries(settings.plans).map(([planId, plan]) => `
        <label class="plan-option ${planId === settings.defaultPlan ? 'recommended' : ''}">
            <input type="radio" name="regPlan" value="${planId}" ${planId === settings.defaultPlan ? 'checked' : ''}>
            <div class="plan-card" style="border-color: ${plan.color}">
                <div class="plan-header" style="background: ${plan.color}">
                    <span class="plan-name">${plan.name}</span>
                    <span class="plan-price">RM ${plan.price}/mo</span>
                </div>
                <div class="plan-features">
                    <div class="plan-limit"><i class="fas fa-exchange-alt"></i> ${plan.limits.transactions === -1 ? 'Unlimited' : plan.limits.transactions} transactions</div>
                    <div class="plan-limit"><i class="fas fa-box"></i> ${plan.limits.products === -1 ? 'Unlimited' : plan.limits.products} products</div>
                    <div class="plan-limit"><i class="fas fa-users"></i> ${plan.limits.users === -1 ? 'Unlimited' : plan.limits.users} users</div>
                </div>
                ${settings.enableTrials ? `<div class="plan-trial">${settings.trialDays}-day free trial</div>` : ''}
            </div>
        </label>
    `).join('');
    
    const modalHTML = `
        <div class="modal show" id="registrationModal" style="z-index: 10000;">
            <div class="modal-content" style="max-width: 700px;">
                <div class="modal-header">
                    <h3 class="modal-title"><i class="fas fa-user-plus"></i> Create Your Account</h3>
                    <button class="modal-close" onclick="closeModal('registrationModal')">&times;</button>
                </div>
                <form onsubmit="handleSelfRegistration(event)">
                    <div class="registration-steps">
                        <!-- Step 1: Account Details -->
                        <div id="regStep1" class="reg-step active">
                            <h4><i class="fas fa-user"></i> Step 1: Your Details</h4>
                            <div class="form-grid">
                                <div class="form-group">
                                    <label class="form-label">Full Name *</label>
                                    <input type="text" id="regName" class="form-control" required placeholder="Your full name">
                                </div>
                                <div class="form-group">
                                    <label class="form-label">Email *</label>
                                    <input type="email" id="regEmail" class="form-control" required placeholder="your@email.com">
                                </div>
                                <div class="form-group">
                                    <label class="form-label">Password *</label>
                                    <input type="password" id="regPassword" class="form-control" required placeholder="Min 6 characters" minlength="6">
                                </div>
                                <div class="form-group">
                                    <label class="form-label">Confirm Password *</label>
                                    <input type="password" id="regPasswordConfirm" class="form-control" required placeholder="Confirm password">
                                </div>
                            </div>
                            <div class="form-group">
                                <label class="form-label">Business Name *</label>
                                <input type="text" id="regBusinessName" class="form-control" required placeholder="Your business name">
                            </div>
                            <button type="button" class="btn-primary" style="width: 100%;" onclick="goToRegStep(2)">
                                Continue <i class="fas fa-arrow-right"></i>
                            </button>
                        </div>
                        
                        <!-- Step 2: Choose Plan -->
                        <div id="regStep2" class="reg-step">
                            <h4><i class="fas fa-clipboard-list"></i> Step 2: Choose Your Plan</h4>
                            <div class="plans-grid">
                                ${plansHTML}
                            </div>
                            <div style="display: flex; gap: 10px; margin-top: 20px;">
                                <button type="button" class="btn-secondary" onclick="goToRegStep(1)">
                                    <i class="fas fa-arrow-left"></i> Back
                                </button>
                                <button type="submit" class="btn-primary" style="flex: 1;">
                                    <i class="fas fa-rocket"></i> Start ${settings.enableTrials ? 'Free Trial' : 'Now'}
                                </button>
                            </div>
                        </div>
                    </div>
                </form>
                <div class="modal-footer" style="justify-content: center; border-top: 1px solid #e2e8f0; margin-top: 20px; padding-top: 15px;">
                    <span style="color: #64748b;">Already have an account?</span>
                    <a href="#" onclick="closeModal('registrationModal'); showLoginModal(); return false;" style="color: #2563eb; margin-left: 5px;">Sign In</a>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

function goToRegStep(step) {
    // Validate step 1 before proceeding
    if (step === 2) {
        const name = document.getElementById('regName').value.trim();
        const email = document.getElementById('regEmail').value.trim();
        const password = document.getElementById('regPassword').value;
        const passwordConfirm = document.getElementById('regPasswordConfirm').value;
        const businessName = document.getElementById('regBusinessName').value.trim();
        
        if (!name || !email || !password || !businessName) {
            showToast('Please fill in all required fields', 'error');
            return;
        }
        
        if (password !== passwordConfirm) {
            showToast('Passwords do not match', 'error');
            return;
        }
        
        if (password.length < 6) {
            showToast('Password must be at least 6 characters', 'error');
            return;
        }
        
        // Check if email exists
        loadUsers();
        if (window.users.find(u => u.email.toLowerCase() === email.toLowerCase())) {
            showToast('Email already registered', 'error');
            return;
        }
    }
    
    document.querySelectorAll('.reg-step').forEach(s => s.classList.remove('active'));
    document.getElementById(`regStep${step}`).classList.add('active');
}

function handleSelfRegistration(event) {
    event.preventDefault();
    
    const settings = getPlatformSettings();
    const name = document.getElementById('regName').value.trim();
    const email = document.getElementById('regEmail').value.trim();
    const password = document.getElementById('regPassword').value;
    const businessName = document.getElementById('regBusinessName').value.trim();
    const plan = document.querySelector('input[name="regPlan"]:checked')?.value || settings.defaultPlan;
    
    // Create user with auto-assigned permissions based on plan
    loadUsers();
    
    const newUser = {
        id: 'user_' + Date.now(),
        email: email,
        password: password,
        name: name,
        role: plan === 'personal' ? 'personal' : 'business_admin',
        plan: plan,
        status: 'active',
        permissions: getPermissionsForPlan(plan), // Auto-assign based on plan
        createdAt: new Date().toISOString(),
        createdBy: 'self_registration'
    };
    
    // Create tenant (not for personal plan)
    if (plan !== 'personal') {
        const tenantId = createTenant(newUser.id, businessName);
        newUser.tenantId = tenantId;
        
        // Create subscription
        createSubscription(tenantId, plan, settings.enableTrials);
    } else {
        newUser.tenantId = 'personal_' + Date.now();
    }
    
    // Save user
    window.users.push(newUser);
    saveUsers();
    
    closeModal('registrationModal');
    
    // Auto-login
    login(email, password);
    
    showToast(`Welcome to ${settings.platformName}! Your ${settings.enableTrials ? 'trial' : 'subscription'} has started.`, 'success');
}

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
    loadUsers();
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
    
    saveUsers();
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
 * Show upgrade plan modal - Enhanced pricing page with features
 */
function showUpgradePlanModal() {
    const user = window.currentUser;
    if (!user) return;
    
    const currentPlan = user.plan || 'starter';
    const settings = getPlatformSettings();
    
    document.getElementById('upgradePlanModal')?.remove();
    
    // Plan order for comparison
    const planOrder = ['personal', 'starter', 'business', 'professional', 'enterprise'];
    const currentPlanIndex = planOrder.indexOf(currentPlan);
    
    // Feature categories for display
    const featureCategories = {
        core: {
            name: 'Core Features',
            icon: 'fa-cube',
            features: [
                { id: 'dashboard', name: 'Dashboard & Analytics', plans: ['personal', 'starter', 'business', 'professional', 'enterprise'] },
                { id: 'transactions', name: 'Transaction Management', plans: ['personal', 'starter', 'business', 'professional', 'enterprise'] },
                { id: 'income', name: 'Income Tracking', plans: ['personal', 'starter', 'business', 'professional', 'enterprise'] },
                { id: 'expenses', name: 'Expense Tracking', plans: ['personal', 'starter', 'business', 'professional', 'enterprise'] },
                { id: 'bills', name: 'Bills Management', plans: ['personal', 'starter', 'business', 'professional', 'enterprise'] }
            ]
        },
        accounting: {
            name: 'Accounting',
            icon: 'fa-calculator',
            features: [
                { id: 'balance-sheet', name: 'Balance Sheet', plans: ['starter', 'business', 'professional', 'enterprise'] },
                { id: 'monthly-reports', name: 'Monthly Reports', plans: ['starter', 'business', 'professional', 'enterprise'] },
                { id: 'taxes', name: 'Tax Management', plans: ['business', 'professional', 'enterprise'] },
                { id: 'bank-reconciliation', name: 'Bank Reconciliation', plans: ['business', 'professional', 'enterprise'] },
                { id: 'lhdn-export', name: 'LHDN & Audit Export', plans: ['starter', 'business', 'professional', 'enterprise'] }
            ]
        },
        sales: {
            name: 'Sales & CRM',
            icon: 'fa-shopping-cart',
            features: [
                { id: 'pos', name: 'Point of Sale (POS)', plans: ['starter', 'business', 'professional', 'enterprise'] },
                { id: 'quotations', name: 'Quotations', plans: ['starter', 'business', 'professional', 'enterprise'] },
                { id: 'invoices', name: 'Invoices', plans: ['starter', 'business', 'professional', 'enterprise'] },
                { id: 'orders', name: 'Order Management', plans: ['business', 'professional', 'enterprise'] },
                { id: 'crm', name: 'Customer Management (CRM)', plans: ['starter', 'business', 'professional', 'enterprise'] },
                { id: 'einvoice', name: 'E-Invoice (Malaysia)', plans: ['professional', 'enterprise'] },
                { id: 'email-invoice', name: 'Invoice/Receipt', plans: ['professional', 'enterprise'] }
            ]
        },
        inventory: {
            name: 'Inventory & Stock',
            icon: 'fa-warehouse',
            features: [
                { id: 'inventory', name: 'Inventory Management', plans: ['starter', 'business', 'professional', 'enterprise'] },
                { id: 'stock', name: 'Stock Control', plans: ['business', 'professional', 'enterprise'] },
                { id: 'multi-branch', name: 'Multi-Branch Stock', plans: ['professional', 'enterprise'] }
            ]
        },
        hr: {
            name: 'HR & Payroll',
            icon: 'fa-users',
            features: [
                { id: 'payroll', name: 'Payroll Management', plans: ['business', 'professional', 'enterprise'] },
                { id: 'kpi', name: 'KPI Performance', plans: ['professional', 'enterprise'] },
                { id: 'projects', name: 'Project Management', plans: ['professional', 'enterprise'] }
            ]
        },
        advanced: {
            name: 'Advanced Features',
            icon: 'fa-rocket',
            features: [
                { id: 'ai-assistant', name: 'AI Assistant', plans: ['professional', 'enterprise'] },
                { id: 'chatbot', name: 'AI Chatbot', plans: ['professional', 'enterprise'] },
                { id: 'backup-restore', name: 'Backup & Restore', plans: ['business', 'professional', 'enterprise'] },
                { id: 'audit-log', name: 'Audit Log', plans: ['enterprise'] },
                { id: 'api-access', name: 'API Access', plans: ['enterprise'] }
            ]
        }
    };
    
    // Plan styling
    const planStyles = {
        personal: { color: '#64748b', gradient: 'linear-gradient(135deg, #64748b, #94a3b8)', icon: 'fa-user' },
        starter: { color: '#10b981', gradient: 'linear-gradient(135deg, #047857, #10b981)', icon: 'fa-rocket' },
        business: { color: '#3b82f6', gradient: 'linear-gradient(135deg, #1e40af, #3b82f6)', icon: 'fa-building' },
        professional: { color: '#8b5cf6', gradient: 'linear-gradient(135deg, #6d28d9, #8b5cf6)', icon: 'fa-briefcase' },
        enterprise: { color: '#f59e0b', gradient: 'linear-gradient(135deg, #0f172a, #1e293b)', icon: 'fa-gem' }
    };
    
    const modalHTML = `
        <div class="modal show" id="upgradePlanModal" style="z-index: 10002;">
            <div class="modal-content" style="max-width: 1200px; max-height: 90vh; overflow: hidden; display: flex; flex-direction: column; border-radius: 20px; border: none;">
                <!-- Hero Header -->
                <div style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%); color: white; padding: 40px 30px; text-align: center; position: relative; overflow: hidden; flex-shrink: 0;">
                    <!-- Decorative elements -->
                    <div style="position: absolute; top: -50px; right: -50px; width: 150px; height: 150px; background: radial-gradient(circle, rgba(99,102,241,0.3) 0%, transparent 70%); border-radius: 50%;"></div>
                    <div style="position: absolute; bottom: -30px; left: -30px; width: 100px; height: 100px; background: radial-gradient(circle, rgba(16,185,129,0.3) 0%, transparent 70%); border-radius: 50%;"></div>
                    
                    <button class="modal-close" onclick="closeModal('upgradePlanModal')" style="position: absolute; top: 15px; right: 20px; background: rgba(255,255,255,0.1); border: none; color: white; width: 36px; height: 36px; border-radius: 50%; cursor: pointer; font-size: 20px; transition: all 0.2s;">&times;</button>
                    
                    <div style="position: relative; z-index: 1;">
                        <div style="display: inline-block; background: linear-gradient(135deg, #6366f1, #8b5cf6); padding: 8px 20px; border-radius: 20px; font-size: 12px; font-weight: 600; margin-bottom: 15px; letter-spacing: 1px;">
                            <i class="fas fa-sparkles"></i> PRICING PLANS
                        </div>
                        <h2 style="margin: 0 0 10px 0; font-size: 32px; font-weight: 700;">Choose Your Perfect Plan</h2>
                        <p style="margin: 0; opacity: 0.8; font-size: 15px;">Scale your business with the right tools. Upgrade anytime.</p>
                        
                        <div style="margin-top: 20px; display: inline-flex; align-items: center; gap: 10px; background: rgba(255,255,255,0.1); padding: 8px 20px; border-radius: 25px; backdrop-filter: blur(10px);">
                            <span style="font-size: 13px; opacity: 0.9;">Current Plan:</span>
                            <span style="background: ${settings.plans[currentPlan]?.color}; padding: 4px 14px; border-radius: 15px; font-size: 12px; font-weight: 700;">${settings.plans[currentPlan]?.name}</span>
                        </div>
                    </div>
                </div>
                
                <div style="padding: 30px; overflow-y: auto; flex: 1; background: linear-gradient(180deg, #f8fafc 0%, #ffffff 100%);">
                    
                    <!-- Pricing Cards - Centered -->
                    <div style="display: flex; justify-content: center; gap: 16px; margin-bottom: 40px; flex-wrap: wrap;">
                        ${planOrder.map((planId, idx) => {
                            const plan = settings.plans[planId];
                            if (!plan) return '';
                            const style = planStyles[planId];
                            const isCurrent = planId === currentPlan;
                            const isDowngrade = idx < currentPlanIndex;
                            const isPopular = planId === 'professional';
                            
                            return `
                                <div style="
                                    width: 200px;
                                    border: ${isCurrent ? '2px solid ' + style.color : '1px solid #e2e8f0'};
                                    border-radius: 20px;
                                    overflow: hidden;
                                    background: white;
                                    position: relative;
                                    transition: all 0.3s ease;
                                    ${isDowngrade ? 'opacity: 0.5;' : ''}
                                    ${isPopular ? 'transform: scale(1.05); box-shadow: 0 20px 40px rgba(139, 92, 246, 0.25); z-index: 2;' : 'box-shadow: 0 4px 15px rgba(0,0,0,0.08);'}
                                ">
                                    ${isPopular ? `
                                        <div style="background: linear-gradient(135deg, #f59e0b, #d97706); color: white; text-align: center; padding: 6px; font-size: 10px; font-weight: 700; letter-spacing: 1px;">
                                            <i class="fas fa-crown"></i> MOST POPULAR
                                        </div>
                                    ` : ''}
                                    ${isCurrent && !isPopular ? `
                                        <div style="background: ${style.gradient}; color: white; text-align: center; padding: 6px; font-size: 10px; font-weight: 700; letter-spacing: 1px;">
                                            <i class="fas fa-check-circle"></i> CURRENT PLAN
                                        </div>
                                    ` : ''}
                                    
                                    <div style="background: ${style.gradient}; padding: 25px 15px; text-align: center; color: white;">
                                        <div style="width: 50px; height: 50px; background: rgba(255,255,255,0.2); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 12px;">
                                            <i class="fas ${style.icon}" style="font-size: 22px;"></i>
                                        </div>
                                        <h4 style="margin: 0; font-size: 18px; font-weight: 600;">${plan.name}</h4>
                                    </div>
                                    
                                    <div style="padding: 25px 20px; text-align: center;">
                                        <div style="margin-bottom: 20px;">
                                            <span style="font-size: 14px; color: #64748b; vertical-align: top;">RM</span>
                                            <span style="font-size: 40px; font-weight: 800; color: #0f172a; line-height: 1;">${plan.price}</span>
                                            <span style="font-size: 13px; color: #64748b;">/${plan.price === 0 ? 'free' : 'mo'}</span>
                                        </div>
                                        
                                        <div style="font-size: 12px; color: #475569; text-align: left; space-y: 8px;">
                                            <div style="padding: 8px 0; border-bottom: 1px solid #f1f5f9; display: flex; justify-content: space-between; align-items: center;">
                                                <span><i class="fas fa-exchange-alt" style="width: 16px; color: ${style.color}; margin-right: 6px;"></i>Transactions</span>
                                                <strong style="color: #0f172a;">${plan.limits.transactions === -1 ? '∞' : plan.limits.transactions.toLocaleString()}</strong>
                                            </div>
                                            <div style="padding: 8px 0; border-bottom: 1px solid #f1f5f9; display: flex; justify-content: space-between; align-items: center;">
                                                <span><i class="fas fa-box" style="width: 16px; color: ${style.color}; margin-right: 6px;"></i>Products</span>
                                                <strong style="color: #0f172a;">${plan.limits.products === -1 ? '∞' : plan.limits.products.toLocaleString()}</strong>
                                            </div>
                                            <div style="padding: 8px 0; border-bottom: 1px solid #f1f5f9; display: flex; justify-content: space-between; align-items: center;">
                                                <span><i class="fas fa-users" style="width: 16px; color: ${style.color}; margin-right: 6px;"></i>Users</span>
                                                <strong style="color: #0f172a;">${plan.limits.users === -1 ? '∞' : plan.limits.users}</strong>
                                            </div>
                                            <div style="padding: 8px 0; display: flex; justify-content: space-between; align-items: center;">
                                                <span><i class="fas fa-building" style="width: 16px; color: ${style.color}; margin-right: 6px;"></i>Branches</span>
                                                <strong style="color: #0f172a;">${plan.limits.branches === -1 ? '∞' : plan.limits.branches}</strong>
                                            </div>
                                        </div>
                                        
                                        <div style="margin-top: 20px;">
                                            ${!isCurrent && !isDowngrade ? `
                                                <button style="width: 100%; padding: 12px; background: ${style.gradient}; color: white; border: none; border-radius: 10px; font-size: 14px; font-weight: 600; cursor: pointer; transition: all 0.2s; box-shadow: 0 4px 15px ${style.color}40;" 
                                                    onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 6px 20px ${style.color}50';"
                                                    onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 4px 15px ${style.color}40';"
                                                    onclick="requestPlanUpgrade('${planId}')">
                                                    <i class="fas fa-arrow-up"></i> Upgrade Now
                                                </button>
                                            ` : isCurrent ? `
                                                <button style="width: 100%; padding: 12px; background: #f1f5f9; color: #64748b; border: none; border-radius: 10px; font-size: 14px; font-weight: 600; cursor: default;">
                                                    <i class="fas fa-check"></i> Current Plan
                                                </button>
                                            ` : `
                                                <button style="width: 100%; padding: 12px; background: #f1f5f9; color: #94a3b8; border: none; border-radius: 10px; font-size: 14px; cursor: default; opacity: 0.6;">
                                                    Not Available
                                                </button>
                                            `}
                                        </div>
                                    </div>
                                </div>
                            `;
                        }).join('')}
                    </div>
                    
                    <!-- Feature Comparison Table -->
                    <div style="background: white; border-radius: 20px; padding: 30px; box-shadow: 0 4px 20px rgba(0,0,0,0.05); border: 1px solid #e2e8f0;">
                        <div style="text-align: center; margin-bottom: 25px;">
                            <h3 style="margin: 0 0 8px 0; color: #0f172a; font-size: 22px;">
                                <i class="fas fa-th-list" style="color: #6366f1; margin-right: 10px;"></i>Complete Feature Comparison
                            </h3>
                            <p style="margin: 0; color: #64748b; font-size: 14px;">See what's included in each plan</p>
                        </div>
                        
                        <div style="overflow-x: auto;">
                            <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
                                <thead>
                                    <tr style="background: linear-gradient(135deg, #f8fafc, #f1f5f9);">
                                        <th style="text-align: left; padding: 15px; width: 30%; color: #334155; font-weight: 600; border-radius: 10px 0 0 0;">Features</th>
                                        ${planOrder.map((planId, idx) => {
                                            const plan = settings.plans[planId];
                                            const style = planStyles[planId];
                                            const isLast = idx === planOrder.length - 1;
                                            return `<th style="text-align: center; padding: 15px; ${isLast ? 'border-radius: 0 10px 0 0;' : ''}">
                                                <div style="display: inline-flex; flex-direction: column; align-items: center; gap: 5px;">
                                                    <div style="width: 32px; height: 32px; background: ${style.gradient}; border-radius: 8px; display: flex; align-items: center; justify-content: center;">
                                                        <i class="fas ${style.icon}" style="color: white; font-size: 14px;"></i>
                                                    </div>
                                                    <span style="color: ${style.color}; font-weight: 600;">${plan?.name || planId}</span>
                                                </div>
                                            </th>`;
                                        }).join('')}
                                    </tr>
                                </thead>
                                <tbody>
                                    ${Object.entries(featureCategories).map(([catId, category]) => `
                                        <tr>
                                            <td colspan="6" style="padding: 12px 15px; font-weight: 600; color: #1e293b; background: linear-gradient(90deg, #f8fafc, transparent); border-top: 2px solid #e2e8f0;">
                                                <i class="fas ${category.icon}" style="color: #6366f1; margin-right: 10px; width: 18px;"></i> ${category.name}
                                            </td>
                                        </tr>
                                        ${category.features.map(feature => `
                                            <tr style="transition: background 0.2s;" onmouseover="this.style.background='#f8fafc'" onmouseout="this.style.background='transparent'">
                                                <td style="padding: 12px 15px; color: #475569; border-bottom: 1px solid #f1f5f9;">${feature.name}</td>
                                                ${planOrder.map(planId => {
                                                    const hasFeature = feature.plans.includes(planId);
                                                    const style = planStyles[planId];
                                                    return `<td style="text-align: center; padding: 12px; border-bottom: 1px solid #f1f5f9;">
                                                        ${hasFeature ? 
                                                            `<div style="width: 24px; height: 24px; background: linear-gradient(135deg, #10b981, #059669); border-radius: 50%; display: inline-flex; align-items: center; justify-content: center;">
                                                                <i class="fas fa-check" style="color: white; font-size: 11px;"></i>
                                                            </div>` : 
                                                            `<i class="fas fa-minus" style="color: #e2e8f0; font-size: 14px;"></i>`
                                                        }
                                                    </td>`;
                                                }).join('')}
                                            </tr>
                                        `).join('')}
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                    </div>
                    
                    <!-- Contact Section -->
                    <div style="margin-top: 30px; text-align: center; padding: 30px; background: linear-gradient(135deg, #1e1b4b, #312e81); border-radius: 20px; color: white; position: relative; overflow: hidden;">
                        <div style="position: absolute; top: -30px; right: -30px; width: 100px; height: 100px; background: radial-gradient(circle, rgba(99,102,241,0.4) 0%, transparent 70%); border-radius: 50%;"></div>
                        <div style="position: relative; z-index: 1;">
                            <div style="width: 60px; height: 60px; background: rgba(255,255,255,0.15); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 15px;">
                                <i class="fas fa-headset" style="font-size: 26px;"></i>
                            </div>
                            <h4 style="margin: 0 0 8px 0; font-size: 20px;">Need Help Choosing?</h4>
                            <p style="margin: 0 0 20px 0; opacity: 0.8; font-size: 14px;">Our team is ready to help you find the perfect plan for your business needs.</p>
                            <div style="display: flex; gap: 12px; justify-content: center; flex-wrap: wrap;">
                                <a href="mailto:support@ezcubic.com" style="display: inline-flex; align-items: center; gap: 8px; padding: 12px 24px; background: rgba(255,255,255,0.15); color: white; text-decoration: none; border-radius: 10px; font-size: 14px; font-weight: 500; transition: all 0.2s; border: 1px solid rgba(255,255,255,0.2);" onmouseover="this.style.background='rgba(255,255,255,0.25)'" onmouseout="this.style.background='rgba(255,255,255,0.15)'">
                                    <i class="fas fa-envelope"></i> Email Support
                                </a>
                                <a href="https://wa.me/60123456789" target="_blank" style="display: inline-flex; align-items: center; gap: 8px; padding: 12px 24px; background: #25d366; color: white; text-decoration: none; border-radius: 10px; font-size: 14px; font-weight: 500; transition: all 0.2s;" onmouseover="this.style.background='#22c55e'" onmouseout="this.style.background='#25d366'">
                                    <i class="fab fa-whatsapp"></i> WhatsApp
                                </a>
                            </div>
                        </div>
                    </div>
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
    
    closeModal('upgradePlanModal');
    
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

// Export limit functions to window
window.checkLimit = checkLimit;
window.canAdd = canAdd;
window.getCurrentPlanLimits = getCurrentPlanLimits;
window.getCurrentUsage = getCurrentUsage;
window.getUsageSummary = getUsageSummary;
window.showLimitReachedModal = showLimitReachedModal;
window.showUpgradePlanModal = showUpgradePlanModal;
window.requestPlanUpgrade = requestPlanUpgrade;
window.renderUsageWidget = renderUsageWidget;

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
window.testTransactionLimit = testTransactionLimit;

// ==================== PLATFORM CONTROL PANEL ====================
function renderPlatformControl() {
    const container = document.getElementById('platformControlContent');
    if (!container) return;
    
    console.log('🎨 renderPlatformControl called');
    
    const settings = getPlatformSettings();
    const tenants = getTenants();
    const subs = getSubscriptions();
    
    // Build tenant list from both tenants storage AND users with tenantIds
    // This ensures we show all business admins even if their tenant wasn't properly registered
    const allUsers = JSON.parse(localStorage.getItem('ezcubic_users') || '[]');
    const businessAdmins = allUsers.filter(u => u.role === 'business_admin' && u.tenantId);
    
    // Add any missing tenants from business admins
    businessAdmins.forEach(admin => {
        if (!tenants[admin.tenantId]) {
            tenants[admin.tenantId] = {
                id: admin.tenantId,
                businessName: admin.businessName || admin.companyName || `${admin.name}'s Business`,
                ownerEmail: admin.email,
                createdAt: admin.createdAt || new Date().toISOString()
            };
        }
    });
    
    const tenantList = Object.values(tenants);
    
    console.log('🎨 Tenants:', tenantList.length, 'Subscriptions:', Object.keys(subs).length);
    
    // Calculate platform stats
    let totalRevenue = 0;
    let activeTrials = 0;
    let activePaid = 0;
    let expired = 0;
    
    tenantList.forEach(tenant => {
        const sub = subs[tenant.id];
        if (sub) {
            const status = checkSubscriptionStatus(tenant.id);
            if (sub.isTrial && status.valid) activeTrials++;
            else if (!sub.isTrial && status.valid) {
                activePaid++;
                totalRevenue += settings.plans[sub.plan]?.price || 0;
            }
            else if (!status.valid) expired++;
        }
    });
    
    container.innerHTML = `
        <!-- Header with Refresh -->
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; padding: 15px 20px; background: linear-gradient(135deg, #f8fafc, #f1f5f9); border-radius: 12px; border: 1px solid #e2e8f0;">
            <div>
                <h3 style="margin: 0; color: #1e293b; font-size: 16px;">
                    <i class="fas fa-satellite-dish" style="color: #6366f1; margin-right: 8px;"></i>
                    Platform Control Center
                </h3>
                <p style="margin: 4px 0 0 0; color: #64748b; font-size: 12px;">
                    Last updated: <span id="platformLastSync">${new Date().toLocaleTimeString()}</span>
                </p>
            </div>
            <button id="platformRefreshBtn" onclick="refreshPlatformFromCloud()" class="btn-primary" style="padding: 10px 18px; font-size: 13px; display: flex; align-items: center; gap: 8px;">
                <i class="fas fa-sync-alt"></i> Sync from Cloud
            </button>
        </div>
        
        <!-- Platform Stats -->
        <div class="platform-stats-grid">
            <div class="platform-stat primary">
                <i class="fas fa-building"></i>
                <div class="stat-content">
                    <span class="stat-value">${tenantList.length}</span>
                    <span class="stat-label">Total Businesses</span>
                </div>
            </div>
            <div class="platform-stat success">
                <i class="fas fa-flask"></i>
                <div class="stat-content">
                    <span class="stat-value">${activeTrials}</span>
                    <span class="stat-label">Active Trials</span>
                </div>
            </div>
            <div class="platform-stat info">
                <i class="fas fa-credit-card"></i>
                <div class="stat-content">
                    <span class="stat-value">${activePaid}</span>
                    <span class="stat-label">Paid Subscriptions</span>
                </div>
            </div>
            <div class="platform-stat warning">
                <i class="fas fa-coins"></i>
                <div class="stat-content">
                    <span class="stat-value">RM ${totalRevenue.toLocaleString()}</span>
                    <span class="stat-label">Monthly Revenue</span>
                </div>
            </div>
        </div>
        
        <!-- Platform Settings -->
        <div class="platform-section">
            <div class="section-header">
                <h3><i class="fas fa-cog"></i> Platform Settings</h3>
                <button class="btn-outline btn-sm" onclick="savePlatformSettingsForm()">
                    <i class="fas fa-save"></i> Save Changes
                </button>
            </div>
            
            <div class="settings-grid">
                <div class="settings-group">
                    <h4><i class="fas fa-user-plus"></i> Registration</h4>
                    <label class="toggle-setting">
                        <input type="checkbox" id="settingAllowReg" ${settings.allowSelfRegistration ? 'checked' : ''}>
                        <span>Allow Self-Registration</span>
                    </label>
                    <label class="toggle-setting">
                        <input type="checkbox" id="settingAutoCreate" ${settings.autoCreateBusiness ? 'checked' : ''}>
                        <span>Auto-Create Business on Signup</span>
                    </label>
                    <div class="form-group">
                        <label>Default Plan</label>
                        <select id="settingDefaultPlan" class="form-control">
                            ${Object.entries(settings.plans).map(([id, plan]) => `
                                <option value="${id}" ${id === settings.defaultPlan ? 'selected' : ''}>${plan.name}</option>
                            `).join('')}
                        </select>
                    </div>
                </div>
                
                <div class="settings-group">
                    <h4><i class="fas fa-flask"></i> Trials</h4>
                    <label class="toggle-setting">
                        <input type="checkbox" id="settingEnableTrials" ${settings.enableTrials ? 'checked' : ''}>
                        <span>Enable Free Trials</span>
                    </label>
                    <div class="form-group">
                        <label>Trial Duration (Days)</label>
                        <input type="number" id="settingTrialDays" class="form-control" value="${settings.trialDays}" min="1" max="90">
                    </div>
                </div>
                
                <div class="settings-group">
                    <h4><i class="fas fa-robot"></i> Automation</h4>
                    <label class="toggle-setting">
                        <input type="checkbox" id="settingAutoSuspend" ${settings.automation.autoSuspendOnExpiry ? 'checked' : ''}>
                        <span>Auto-Suspend on Expiry</span>
                    </label>
                    <div class="form-group">
                        <label>Grace Period (Days)</label>
                        <input type="number" id="settingGraceDays" class="form-control" value="${settings.automation.gracePeriodDays}" min="0" max="30">
                    </div>
                </div>
            </div>
        </div>
        
        <!-- Subscription Management -->
        <div class="platform-section">
            <div class="section-header">
                <h3><i class="fas fa-credit-card"></i> Subscription Management</h3>
            </div>
            
            <div class="subscriptions-table" style="overflow-x: auto; -webkit-overflow-scrolling: touch;">
                <table>
                    <thead>
                        <tr>
                            <th>Business</th>
                            <th>Company Code</th>
                            <th>Plan</th>
                            <th>Status</th>
                            <th>Expires</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${tenantList.length === 0 ? `
                            <tr><td colspan="7" style="text-align: center; padding: 40px; color: #64748b;">No businesses yet</td></tr>
                        ` : tenantList.map(tenant => {
                            const sub = subs[tenant.id];
                            const status = sub ? checkSubscriptionStatus(tenant.id) : { valid: false, reason: 'no_subscription' };
                            const usage = getTenantUsage(tenant.id);
                            const plan = sub ? settings.plans[sub.plan] : null;
                            
                            // Get or generate Company Code
                            let companyCode = tenant.companyCode;
                            if (!companyCode) {
                                // Generate if missing
                                companyCode = generateCompanyCodeForTenant(tenant.id);
                            }
                            
                            return `
                                <tr>
                                    <td>
                                        <strong>${escapeHtml(tenant.businessName)}</strong>
                                        <small style="display: block; color: #64748b;">${tenant.id}</small>
                                    </td>
                                    <td>
                                        <div style="display: flex; align-items: center; gap: 6px;">
                                            <code style="background: #f0f9ff; color: #0369a1; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: 600; letter-spacing: 1px;">${companyCode || 'N/A'}</code>
                                            <button class="btn-icon" onclick="copyTenantCompanyCode('${companyCode}')" title="Copy Code" style="padding: 4px;">
                                                <i class="fas fa-copy" style="font-size: 11px;"></i>
                                            </button>
                                        </div>
                                    </td>
                                    <td>
                                        ${plan ? `
                                            <span class="plan-badge" style="background: ${plan.color}">${plan.name}</span>
                                            ${sub.isFree || sub.plan === 'personal' ? '<span class="trial-badge" style="background: #64748b;">FREE</span>' : 
                                              sub.isTrial ? '<span class="trial-badge">TRIAL</span>' : ''}
                                        ` : '<span style="color: #94a3b8;">No plan</span>'}
                                    </td>
                                    <td>
                                        <span class="status-badge ${status.valid ? 'active' : 'inactive'}">
                                            ${status.reason.replace(/_/g, ' ')}
                                        </span>
                                        ${status.daysLeft !== undefined && !sub?.isFree && sub?.plan !== 'personal' ? `<small>(${status.daysLeft} days left)</small>` : ''}
                                    </td>
                                    <td>${sub?.isFree || sub?.plan === 'personal' ? '<span style="color: #10b981;"><i class="fas fa-infinity"></i> Never</span>' : sub ? new Date(sub.expiresAt).toLocaleDateString() : '-'}</td>
                                    <td>
                                        <button class="btn-icon" onclick="showChangePlanModal('${tenant.id}')" title="Change Plan">
                                            <i class="fas fa-exchange-alt"></i>
                                        </button>
                                        <button class="btn-icon" onclick="extendSubscription('${tenant.id}')" title="Extend 30 Days">
                                            <i class="fas fa-calendar-plus"></i>
                                        </button>
                                        ${status.valid ? `
                                            <button class="btn-icon danger" onclick="suspendTenant('${tenant.id}')" title="Suspend">
                                                <i class="fas fa-ban"></i>
                                            </button>
                                        ` : `
                                            <button class="btn-icon success" onclick="reactivateTenant('${tenant.id}')" title="Reactivate">
                                                <i class="fas fa-check"></i>
                                            </button>
                                        `}
                                    </td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            </div>
        </div>
        
        <!-- Pricing Plans -->
        <div class="platform-section">
            <div class="section-header">
                <h3><i class="fas fa-tags"></i> Pricing Plans</h3>
                <button class="btn-outline btn-sm" onclick="showAddPlanModal()">
                    <i class="fas fa-plus"></i> Add Plan
                </button>
            </div>
            <div class="pricing-plans-grid">
                ${Object.entries(settings.plans).map(([planId, plan]) => `
                    <div class="pricing-plan-card" style="border-top: 4px solid ${plan.color}">
                        <div class="plan-actions">
                            <button class="btn-icon" onclick="showEditPlanModal('${planId}')" title="Edit Plan">
                                <i class="fas fa-edit"></i>
                            </button>
                            ${planId !== 'free' && planId !== 'starter' ? `
                            <button class="btn-icon danger" onclick="deletePlan('${planId}')" title="Delete Plan">
                                <i class="fas fa-trash"></i>
                            </button>
                            ` : ''}
                        </div>
                        <div class="plan-name" style="color: ${plan.color}">${plan.name}</div>
                        <div class="plan-price">RM ${plan.price}<span>/month</span></div>
                        <div class="plan-limits">
                            <div><i class="fas fa-exchange-alt"></i> ${plan.limits.transactions === -1 ? '∞' : plan.limits.transactions} transactions</div>
                            <div><i class="fas fa-box"></i> ${plan.limits.products === -1 ? '∞' : plan.limits.products} products</div>
                            <div><i class="fas fa-users"></i> ${plan.limits.customers === -1 ? '∞' : plan.limits.customers} customers</div>
                            <div><i class="fas fa-user-friends"></i> ${plan.limits.users === -1 ? '∞' : plan.limits.users} users</div>
                            <div><i class="fas fa-code-branch"></i> ${plan.limits.branches === -1 ? '∞' : plan.limits.branches} branches</div>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
        
        <!-- Plan Limits Table (Editable) -->
        <div class="platform-section">
            <div class="section-header">
                <h3><i class="fas fa-sliders-h"></i> Plan Limits</h3>
                <button class="btn-primary btn-sm" onclick="savePlanLimits()">
                    <i class="fas fa-save"></i> Save Limits
                </button>
            </div>
            <div style="overflow-x: auto;">
                <table style="width: 100%; border-collapse: collapse; font-size: 13px;" id="planLimitsTable">
                    <thead>
                        <tr style="background: #f1f5f9;">
                            <th style="padding: 12px; text-align: left; border-bottom: 2px solid #e2e8f0; min-width: 150px;">
                                <i class="fas fa-list"></i> Limit Type
                            </th>
                            ${Object.entries(settings.plans).map(([planId, plan]) => `
                                <th style="padding: 12px; text-align: center; border-bottom: 2px solid #e2e8f0; min-width: 120px;">
                                    <span style="color: ${plan.color}; font-weight: 600;">${plan.name}</span>
                                    <small style="display: block; color: #64748b;">RM ${plan.price}/mo</small>
                                </th>
                            `).join('')}
                        </tr>
                    </thead>
                    <tbody>
                        <tr style="border-bottom: 1px solid #e2e8f0;">
                            <td style="padding: 10px 12px;"><i class="fas fa-exchange-alt" style="width: 20px; color: #6366f1;"></i> Transactions</td>
                            ${Object.entries(settings.plans).map(([planId, plan]) => `
                                <td style="padding: 8px; text-align: center;">
                                    <input type="number" class="form-control plan-limit-input" 
                                        data-plan="${planId}" data-limit="transactions" 
                                        value="${plan.limits.transactions}" min="-1"
                                        style="width: 80px; text-align: center; margin: 0 auto;"
                                        title="-1 = Unlimited">
                                </td>
                            `).join('')}
                        </tr>
                        <tr style="border-bottom: 1px solid #e2e8f0;">
                            <td style="padding: 10px 12px;"><i class="fas fa-box" style="width: 20px; color: #8b5cf6;"></i> Products</td>
                            ${Object.entries(settings.plans).map(([planId, plan]) => `
                                <td style="padding: 8px; text-align: center;">
                                    <input type="number" class="form-control plan-limit-input" 
                                        data-plan="${planId}" data-limit="products" 
                                        value="${plan.limits.products}" min="-1"
                                        style="width: 80px; text-align: center; margin: 0 auto;"
                                        title="-1 = Unlimited, 0 = Not Available">
                                </td>
                            `).join('')}
                        </tr>
                        <tr style="border-bottom: 1px solid #e2e8f0;">
                            <td style="padding: 10px 12px;"><i class="fas fa-users" style="width: 20px; color: #ec4899;"></i> Customers</td>
                            ${Object.entries(settings.plans).map(([planId, plan]) => `
                                <td style="padding: 8px; text-align: center;">
                                    <input type="number" class="form-control plan-limit-input" 
                                        data-plan="${planId}" data-limit="customers" 
                                        value="${plan.limits.customers}" min="-1"
                                        style="width: 80px; text-align: center; margin: 0 auto;"
                                        title="-1 = Unlimited, 0 = Not Available">
                                </td>
                            `).join('')}
                        </tr>
                        <tr style="border-bottom: 1px solid #e2e8f0;">
                            <td style="padding: 10px 12px;"><i class="fas fa-user-friends" style="width: 20px; color: #f59e0b;"></i> Users</td>
                            ${Object.entries(settings.plans).map(([planId, plan]) => `
                                <td style="padding: 8px; text-align: center;">
                                    <input type="number" class="form-control plan-limit-input" 
                                        data-plan="${planId}" data-limit="users" 
                                        value="${plan.limits.users}" min="-1"
                                        style="width: 80px; text-align: center; margin: 0 auto;"
                                        title="-1 = Unlimited">
                                </td>
                            `).join('')}
                        </tr>
                        <tr style="border-bottom: 1px solid #e2e8f0;">
                            <td style="padding: 10px 12px;"><i class="fas fa-code-branch" style="width: 20px; color: #10b981;"></i> Branches</td>
                            ${Object.entries(settings.plans).map(([planId, plan]) => `
                                <td style="padding: 8px; text-align: center;">
                                    <input type="number" class="form-control plan-limit-input" 
                                        data-plan="${planId}" data-limit="branches" 
                                        value="${plan.limits.branches}" min="-1"
                                        style="width: 80px; text-align: center; margin: 0 auto;"
                                        title="-1 = Unlimited">
                                </td>
                            `).join('')}
                        </tr>
                        <tr style="border-bottom: 1px solid #e2e8f0;">
                            <td style="padding: 10px 12px;"><i class="fas fa-hdd" style="width: 20px; color: #3b82f6;"></i> Storage (MB)</td>
                            ${Object.entries(settings.plans).map(([planId, plan]) => `
                                <td style="padding: 8px; text-align: center;">
                                    <input type="number" class="form-control plan-limit-input" 
                                        data-plan="${planId}" data-limit="storage" 
                                        value="${plan.limits.storage}" min="-1"
                                        style="width: 80px; text-align: center; margin: 0 auto;"
                                        title="-1 = Unlimited">
                                </td>
                            `).join('')}
                        </tr>
                    </tbody>
                </table>
            </div>
            <div style="margin-top: 12px; padding: 10px; background: #fefce8; border-radius: 8px; border-left: 4px solid #eab308;">
                <small style="color: #854d0e;">
                    <i class="fas fa-lightbulb"></i> <strong>Tip:</strong> 
                    Use <code style="background: #fef3c7; padding: 2px 6px; border-radius: 4px;">-1</code> for unlimited, 
                    <code style="background: #fef3c7; padding: 2px 6px; border-radius: 4px;">0</code> for not available
                </small>
            </div>
        </div>
        
        <!-- Plan Feature Access Matrix -->
        <div class="platform-section">
            <div class="section-header">
                <h3><i class="fas fa-key"></i> Plan Feature Access</h3>
                <div style="display: flex; align-items: center; gap: 15px;">
                    <span style="font-size: 12px; color: #64748b;">Auto-assigned when users sign up</span>
                    <button class="btn-primary btn-sm" onclick="showEditPlanFeaturesModal()">
                        <i class="fas fa-edit"></i> Edit Features
                    </button>
                </div>
            </div>
            <div class="plan-features-matrix" style="overflow-x: auto;">
                <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
                    <thead>
                        <tr style="background: #f1f5f9;">
                            <th style="padding: 12px; text-align: left; border-bottom: 2px solid #e2e8f0;">Module / Feature</th>
                            ${Object.entries(settings.plans).map(([planId, plan]) => `
                                <th style="padding: 12px; text-align: center; border-bottom: 2px solid #e2e8f0;">
                                    <span style="color: ${plan.color}; font-weight: 600;">${plan.name}</span>
                                    <small style="display: block; color: #64748b;">RM ${plan.price}/mo</small>
                                </th>
                            `).join('')}
                        </tr>
                    </thead>
                    <tbody>
                        ${renderPlanFeaturesRows(settings.plans)}
                    </tbody>
                </table>
            </div>
            <div style="margin-top: 15px; padding: 12px; background: #f0f9ff; border-radius: 8px; border-left: 4px solid #2563eb;">
                <strong style="color: #1e40af;"><i class="fas fa-info-circle"></i> How Auto-Assignment Works:</strong>
                <p style="margin: 8px 0 0; font-size: 13px; color: #334155;">
                    When a user signs up with a plan, they automatically get access to the modules listed above. 
                    You can customize plan features by editing each plan's "features" array in the settings.
                </p>
            </div>
        </div>
    `;
}

// Helper function to render plan features rows
function renderPlanFeaturesRows(plans) {
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
    
    let currentCategory = '';
    let html = '';
    
    allFeatures.forEach(feature => {
        if (feature.category !== currentCategory) {
            currentCategory = feature.category;
            html += `
                <tr style="background: #f8fafc;">
                    <td colspan="${Object.keys(plans).length + 1}" style="padding: 8px 12px; font-weight: 600; color: #475569;">
                        <i class="fas fa-folder"></i> ${currentCategory}
                    </td>
                </tr>
            `;
        }
        
        html += `
            <tr style="border-bottom: 1px solid #e2e8f0;">
                <td style="padding: 10px 12px; padding-left: 24px;">${feature.name}</td>
                ${Object.entries(plans).map(([planId, plan]) => {
                    const hasAccess = plan.features.includes('all') || plan.features.includes(feature.id);
                    return `
                        <td style="padding: 10px 12px; text-align: center;">
                            ${hasAccess 
                                ? `<i class="fas fa-check-circle" style="color: #10b981; font-size: 16px;"></i>` 
                                : `<i class="fas fa-times-circle" style="color: #e2e8f0; font-size: 16px;"></i>`
                            }
                        </td>
                    `;
                }).join('')}
            </tr>
        `;
    });
    
    return html;
}

// ==================== SUBSCRIPTION ACTIONS ====================
function showChangePlanModal(tenantId) {
    const tenant = getTenantInfo(tenantId);
    const sub = getSubscription(tenantId);
    const settings = getPlatformSettings();
    
    document.getElementById('changePlanModal')?.remove();
    
    const modalHTML = `
        <div class="modal show" id="changePlanModal">
            <div class="modal-content" style="max-width: 500px;">
                <div class="modal-header">
                    <h3 class="modal-title"><i class="fas fa-exchange-alt"></i> Change Plan</h3>
                    <button class="modal-close" onclick="closeModal('changePlanModal')">&times;</button>
                </div>
                <p style="margin-bottom: 15px;">Change plan for: <strong>${escapeHtml(tenant?.businessName || 'Unknown')}</strong></p>
                <div class="form-group">
                    <label class="form-label">Select New Plan</label>
                    <select id="newPlanSelect" class="form-control">
                        ${Object.entries(settings.plans).map(([id, plan]) => `
                            <option value="${id}" ${sub?.plan === id ? 'selected' : ''}>${plan.name} - RM ${plan.price}/mo</option>
                        `).join('')}
                    </select>
                </div>
                <label style="display: flex; align-items: center; gap: 8px; margin-bottom: 15px;">
                    <input type="checkbox" id="resetTrialCheck">
                    <span>Reset as new trial</span>
                </label>
                <div class="modal-footer">
                    <button class="btn-secondary" onclick="closeModal('changePlanModal')">Cancel</button>
                    <button class="btn-primary" onclick="executeChangePlan('${tenantId}')">
                        <i class="fas fa-save"></i> Change Plan
                    </button>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

function executeChangePlan(tenantId) {
    const newPlan = document.getElementById('newPlanSelect').value;
    const resetTrial = document.getElementById('resetTrialCheck').checked;
    const settings = getPlatformSettings();
    
    console.log('🔄 Changing plan for tenant:', tenantId, 'to:', newPlan);
    
    // Check if subscription exists
    const existingSubs = getSubscriptions();
    
    if (resetTrial || !existingSubs[tenantId]) {
        // Create new subscription (or reset as trial)
        console.log('📝 Creating new subscription for tenant:', tenantId);
        createSubscription(tenantId, newPlan, resetTrial);
    } else {
        // Update existing subscription
        updateSubscription(tenantId, { plan: newPlan });
    }
    
    // Verify the change was saved
    const verifyData = getSubscriptions();
    console.log('✅ Verified subscription after save:', verifyData[tenantId]?.plan);
    
    // Sync the new plan features to the user
    syncUserToNewPlan(tenantId, newPlan);
    
    closeModal('changePlanModal');
    
    // Show loading indicator
    showToast('⏳ Updating plan...', 'info');
    
    // Force clear the container completely
    const container = document.getElementById('platformControlContent');
    if (container) {
        // Hide container first
        container.style.opacity = '0';
        container.innerHTML = '';
    }
    
    // Use requestAnimationFrame to ensure DOM updates
    requestAnimationFrame(() => {
        setTimeout(() => {
            console.log('🔄 Re-rendering Platform Control...');
            renderPlatformControl();
            
            // Force reflow and show
            if (container) {
                void container.offsetHeight; // Force reflow
                container.style.opacity = '1';
            }
            
            showToast('✅ Plan changed to ' + newPlan.toUpperCase() + '!', 'success');
        }, 150);
    });
}

/**
 * Sync a specific user/tenant to a new plan
 * Called when a Business Admin's plan is changed
 */
function syncUserToNewPlan(tenantId, newPlanId) {
    const settings = getPlatformSettings();
    const plan = settings.plans[newPlanId];
    if (!plan) return;
    
    const allUsers = JSON.parse(localStorage.getItem('ezcubic_users') || '[]');
    const newFeatures = plan.features.includes('all') ? ['all'] : [...plan.features];
    
    allUsers.forEach(user => {
        // Update Business Admin's permissions
        if (user.tenantId === tenantId && user.role === 'business_admin') {
            user.plan = newPlanId;
            user.permissions = newFeatures;
            user.updatedAt = new Date().toISOString();
            console.log(`Updated ${user.email} to ${newPlanId} plan:`, user.permissions);
        }
        
        // Update Staff/Manager permissions - remove features no longer in plan
        // Also update their plan to match admin's plan
        if (user.tenantId === tenantId && ['staff', 'manager'].includes(user.role)) {
            user.plan = newPlanId; // Staff/Manager plan follows their admin's plan
            if (!newFeatures.includes('all') && user.permissions && !user.permissions.includes('all')) {
                user.permissions = user.permissions.filter(p => newFeatures.includes(p));
            }
            user.updatedAt = new Date().toISOString();
            console.log(`Updated staff ${user.email} to ${newPlanId} plan, permissions:`, user.permissions);
        }
    });
    
    localStorage.setItem('ezcubic_users', JSON.stringify(allUsers));
    
    // Update current user if affected
    const currentUserData = JSON.parse(localStorage.getItem('ezcubic_current_user') || '{}');
    if (currentUserData.tenantId === tenantId) {
        const updatedUser = allUsers.find(u => u.id === currentUserData.id);
        if (updatedUser) {
            localStorage.setItem('ezcubic_current_user', JSON.stringify(updatedUser));
            if (window.currentUser) {
                window.currentUser = updatedUser;
            }
        }
    }
    
    // Sync to cloud so the user's device gets the update
    if (typeof window.fullCloudSync === 'function') {
        console.log('☁️ Syncing plan change to cloud...');
        window.fullCloudSync().then(() => {
            console.log('✅ Plan change synced to cloud successfully');
            showToast('Plan synced to cloud! User will see changes on next login/refresh.', 'success');
        }).catch(err => {
            console.warn('Cloud sync failed:', err);
            showToast('Plan changed locally. Cloud sync pending.', 'warning');
        });
    } else if (typeof scheduleAutoCloudSync === 'function') {
        scheduleAutoCloudSync();
    }
}

function extendSubscription(tenantId) {
    const sub = getSubscription(tenantId);
    if (!sub) {
        createSubscription(tenantId, 'starter', false);
    } else {
        const currentExpiry = new Date(sub.expiresAt);
        const newExpiry = new Date(Math.max(currentExpiry.getTime(), Date.now()) + (30 * 24 * 60 * 60 * 1000));
        updateSubscription(tenantId, { 
            expiresAt: newExpiry.toISOString(),
            status: 'active',
            isTrial: false
        });
    }
    
    renderPlatformControl();
    showToast('Subscription extended by 30 days!', 'success');
}

function suspendTenant(tenantId) {
    if (!confirm('Are you sure you want to suspend this business? They will lose access until reactivated.')) return;
    
    updateSubscription(tenantId, { status: 'suspended' });
    
    // Also update tenant status
    const tenants = getTenants();
    if (tenants[tenantId]) {
        tenants[tenantId].status = 'suspended';
        saveTenants(tenants);
    }
    
    renderPlatformControl();
    showToast('Business suspended', 'info');
}

function reactivateTenant(tenantId) {
    // Extend by 30 days and reactivate
    extendSubscription(tenantId);
    
    // Update tenant status
    const tenants = getTenants();
    if (tenants[tenantId]) {
        tenants[tenantId].status = 'active';
        saveTenants(tenants);
    }
    
    renderPlatformControl();
    showToast('Business reactivated!', 'success');
}

function savePlatformSettingsForm() {
    const settings = getPlatformSettings();
    
    settings.allowSelfRegistration = document.getElementById('settingAllowReg').checked;
    settings.autoCreateBusiness = document.getElementById('settingAutoCreate').checked;
    settings.defaultPlan = document.getElementById('settingDefaultPlan').value;
    settings.enableTrials = document.getElementById('settingEnableTrials').checked;
    settings.trialDays = parseInt(document.getElementById('settingTrialDays').value) || 14;
    settings.automation.autoSuspendOnExpiry = document.getElementById('settingAutoSuspend').checked;
    settings.automation.gracePeriodDays = parseInt(document.getElementById('settingGraceDays').value) || 7;
    
    savePlatformSettings(settings);
    showToast('Platform settings saved!', 'success');
}

// ==================== SAVE PLAN LIMITS ====================
function savePlanLimits() {
    const settings = getPlatformSettings();
    const inputs = document.querySelectorAll('.plan-limit-input');
    
    if (inputs.length === 0) {
        showToast('No limit inputs found', 'error');
        return;
    }
    
    inputs.forEach(input => {
        const planId = input.dataset.plan;
        const limitType = input.dataset.limit;
        const value = parseInt(input.value);
        
        if (settings.plans[planId] && settings.plans[planId].limits) {
            settings.plans[planId].limits[limitType] = isNaN(value) ? 0 : value;
        }
    });
    
    savePlatformSettings(settings);
    showToast('Plan limits saved successfully!', 'success');
    renderPlatformControl();
}

// ==================== ADD REGISTER BUTTON TO LOGIN ====================
function enhanceLoginModal() {
    const settings = getPlatformSettings();
    if (!settings.allowSelfRegistration) return;
    
    // This will be called after login modal is shown
    setTimeout(() => {
        const loginModal = document.getElementById('loginModal');
        if (loginModal && !loginModal.querySelector('.register-link')) {
            const footer = loginModal.querySelector('.login-footer');
            if (footer) {
                footer.innerHTML += `
                    <div class="register-link" style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #e2e8f0; text-align: center;">
                        <span style="color: #64748b;">Don't have an account?</span>
                        <a href="#" onclick="closeLoginModal(); showRegistrationModal(); return false;" style="color: #2563eb; font-weight: 600; margin-left: 5px;">Sign Up Free</a>
                    </div>
                `;
            }
        }
    }, 100);
}

// Override showLoginModal to add register link
const originalShowLoginModal = window.showLoginModal;
window.showLoginModal = function() {
    if (typeof originalShowLoginModal === 'function') {
        originalShowLoginModal();
    }
    enhanceLoginModal();
};

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
 * This ensures when a plan is updated, all users on that plan get the new features
 * Also automatically adds new features to old accounts that were created before features existed
 */
function syncPlanFeaturesToUsers() {
    const settings = getPlatformSettings();
    const allUsers = JSON.parse(localStorage.getItem('ezcubic_users') || '[]');
    let syncCount = 0;
    
    allUsers.forEach(user => {
        // Sync Business Admin users - they get ALL features from their plan
        if (user.role === 'business_admin' && user.plan) {
            const plan = settings.plans[user.plan];
            if (plan) {
                const oldPermissions = user.permissions ? [...user.permissions] : [];
                const newPermissions = plan.features.includes('all') ? ['all'] : [...plan.features];
                
                // Always update to match plan features (this adds new features automatically)
                user.permissions = newPermissions;
                
                // Check if permissions actually changed
                const oldSorted = oldPermissions.sort().join(',');
                const newSorted = newPermissions.sort().join(',');
                if (oldSorted !== newSorted) {
                    syncCount++;
                    user.updatedAt = new Date().toISOString();
                    console.log(`✓ Synced Business Admin ${user.email} to ${user.plan} plan:`, user.permissions);
                }
            }
        }
        
        // Sync Staff/Manager - add new features from owner's plan
        if (['staff', 'manager'].includes(user.role) && user.tenantId) {
            const owner = allUsers.find(u => 
                u.tenantId === user.tenantId && 
                (u.role === 'business_admin' || u.role === 'founder')
            );
            
            if (owner && owner.plan) {
                const ownerPlan = settings.plans[owner.plan];
                if (ownerPlan) {
                    const ownerFeatures = ownerPlan.features;
                    const oldPermissions = user.permissions ? [...user.permissions] : [];
                    
                    // If staff has 'all' access, keep it
                    if (user.permissions && user.permissions.includes('all')) {
                        // No change needed
                    }
                    // If owner has 'all' access, add new features to staff that they might be missing
                    else if (ownerFeatures.includes('all')) {
                        // Staff keeps their current permissions, owner plan allows everything
                        // Optionally: could grant staff all permissions too
                    }
                    // Owner has specific features - add any new ones staff doesn't have
                    else {
                        // Get all new features in owner's plan that staff doesn't have yet
                        const staffPerms = user.permissions || [];
                        const newFeaturesInPlan = ownerFeatures.filter(f => !staffPerms.includes(f));
                        
                        // Add new features automatically (staff gets same access as owner by default)
                        if (newFeaturesInPlan.length > 0) {
                            user.permissions = [...new Set([...staffPerms, ...newFeaturesInPlan])];
                            syncCount++;
                            user.updatedAt = new Date().toISOString();
                            console.log(`✓ Added new features to ${user.role} ${user.email}:`, newFeaturesInPlan);
                        }
                        
                        // Also remove features that are no longer in owner's plan
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
    
    // Save all updated users
    localStorage.setItem('ezcubic_users', JSON.stringify(allUsers));
    
    // Update current user if they were affected
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

// ==================== EXPORTS ====================
window.getPlatformSettings = getPlatformSettings;
window.savePlatformSettings = savePlatformSettings;
window.getSubscriptions = getSubscriptions;
window.createSubscription = createSubscription;
window.getSubscription = getSubscription;
window.updateSubscription = updateSubscription;
window.checkSubscriptionStatus = checkSubscriptionStatus;
window.getTenantUsage = getTenantUsage;
window.checkUsageLimits = checkUsageLimits;
window.showRegistrationModal = showRegistrationModal;
window.goToRegStep = goToRegStep;
window.handleSelfRegistration = handleSelfRegistration;
window.getPermissionsForPlan = getPermissionsForPlan;
window.applyPlanToUser = applyPlanToUser;
window.applyFeatureRestrictions = applyFeatureRestrictions;
window.upgradeUserPlan = upgradeUserPlan;
window.getPlanFeaturesSummary = getPlanFeaturesSummary;
window.renderPlatformControl = renderPlatformControl;
window.showChangePlanModal = showChangePlanModal;
window.executeChangePlan = executeChangePlan;
window.extendSubscription = extendSubscription;
window.suspendTenant = suspendTenant;
window.reactivateTenant = reactivateTenant;
window.savePlatformSettingsForm = savePlatformSettingsForm;
window.savePlanLimits = savePlanLimits;
window.showEditPlanModal = showEditPlanModal;
window.showAddPlanModal = showAddPlanModal;
window.savePlanChanges = savePlanChanges;
window.deletePlan = deletePlan;
window.showEditPlanFeaturesModal = showEditPlanFeaturesModal;
window.toggleAllPlanFeatures = toggleAllPlanFeatures;
window.updateFeatureCheckbox = updateFeatureCheckbox;
window.savePlanFeatures = savePlanFeatures;
window.syncPlanFeaturesToUsers = syncPlanFeaturesToUsers;
window.syncUserToNewPlan = syncUserToNewPlan;

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
                            <input type="text" id="editPlanName" class="form-control" value="${escapeHtml(plan.name)}" required>
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
        features: settings.plans[planId]?.features || ['all'] // Keep existing features or default to all
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
    // Get current user's subscription plan
    const currentUser = JSON.parse(localStorage.getItem('ezcubic_current_user') || '{}');
    const tenantId = currentUser.tenantId || localStorage.getItem('ezcubic_tenant_id');
    
    // Skip for personal users - they use applyUserPermissions() from users.js
    if (currentUser.role === 'personal') {
        console.log('applyPlanRestrictions: Skipping for personal user, using applyUserPermissions instead');
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
        // No tenant, show all (demo mode)
        showAllNavItems();
        return;
    }
    
    const subscription = getSubscription(tenantId);
    if (!subscription) {
        // No subscription found, apply default restrictions
        applyFeatureRestrictions('personal');
        return;
    }
    
    applyFeatureRestrictions(subscription.plan);
}

function applyFeatureRestrictions(planId) {
    // Skip for personal users - they use applyUserPermissions() instead
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
    
    // Map section IDs to nav button selectors
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
    
    // Show all nav buttons first
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.style.display = '';
    });
    
    // Hide restricted sections
    hiddenSections.forEach(sectionId => {
        const selector = sectionMap[sectionId];
        if (selector) {
            const btn = document.querySelector(`.nav-btn[onclick="${selector}"]`);
            if (btn) {
                btn.style.display = 'none';
            }
        }
    });
    
    // Also hide nav separators if all items in that section are hidden
    hideEmptyNavSeparators();
    
    // Show upgrade prompt if plan has restrictions
    if (hiddenSections.length > 0) {
        showPlanBadge(plan.name, plan.color);
    }
}

function showAllNavItems() {
    // Don't show all items for personal users
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
    // Remove plan badge if exists
    const badge = document.getElementById('currentPlanBadge');
    if (badge) badge.remove();
}

function hideEmptyNavSeparators() {
    const separators = document.querySelectorAll('.nav-separator');
    
    separators.forEach(separator => {
        let nextEl = separator.nextElementSibling;
        let hasVisibleButton = false;
        
        // Check siblings until next separator or end
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
    // Remove existing badge
    const existingBadge = document.getElementById('currentPlanBadge');
    if (existingBadge) existingBadge.remove();
    
    // Add plan badge to nav header
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
    const settings = getPlatformSettings();
    const plans = settings.plans;
    
    // Get current plan
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
    
    // In production, this would integrate with payment gateway
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

// Apply restrictions on page load
document.addEventListener('DOMContentLoaded', function() {
    // Small delay to ensure DOM is ready
    setTimeout(() => {
        // Auto-sync plan features to all users (adds new features to old accounts)
        syncPlanFeaturesToUsers();
        
        // Then apply plan restrictions
        applyPlanRestrictions();
    }, 500);
});

// Export new functions
window.applyPlanRestrictions = applyPlanRestrictions;
window.showUpgradeModal = showUpgradeModal;
window.requestUpgrade = requestUpgrade;
window.requestDowngrade = requestDowngrade;

// ==================== COMPANY CODE HELPERS ====================

// Generate Company Code for a tenant (if missing)
function generateCompanyCodeForTenant(tenantId) {
    const tenants = JSON.parse(localStorage.getItem('ezcubic_tenants') || '{}');
    const tenant = tenants[tenantId];
    
    if (!tenant) return null;
    
    if (!tenant.companyCode) {
        // Generate new code
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

// Copy tenant Company Code to clipboard
window.copyTenantCompanyCode = function(code) {
    if (!code || code === 'N/A') {
        showToast('No Company Code available', 'warning');
        return;
    }
    
    navigator.clipboard.writeText(code).then(() => {
        showToast('📋 Company Code copied: ' + code, 'success');
    }).catch(() => {
        // Fallback
        const textarea = document.createElement('textarea');
        textarea.value = code;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        showToast('📋 Company Code copied: ' + code, 'success');
    });
};

/**
 * Refresh Platform Control data from cloud
 * Downloads latest users and tenants data, then re-renders
 */
window.refreshPlatformFromCloud = async function() {
    const btn = document.getElementById('platformRefreshBtn');
    const originalHTML = btn ? btn.innerHTML : '';
    
    if (btn) {
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Syncing...';
        btn.disabled = true;
    }
    
    try {
        // Download from cloud using mobileDownloadFromCloud
        if (typeof window.mobileDownloadFromCloud === 'function') {
            // Create a fake event to prevent alert behavior
            const fakeEvent = { target: null };
            window.event = fakeEvent;
            
            await window.downloadUsersFromCloud();
            console.log('☁️ Users downloaded from cloud');
        }
        
        // Re-render the platform control
        renderPlatformControl();
        
        // Update last sync time
        const syncTimeEl = document.getElementById('platformLastSync');
        if (syncTimeEl) {
            syncTimeEl.textContent = new Date().toLocaleTimeString();
        }
        
        showToast('✅ Platform data refreshed from cloud!', 'success');
    } catch (err) {
        console.error('Platform sync error:', err);
        showToast('⚠️ Sync failed: ' + err.message, 'error');
    } finally {
        if (btn) {
            btn.innerHTML = originalHTML || '<i class="fas fa-sync-alt"></i> Sync from Cloud';
            btn.disabled = false;
        }
    }
};

/**
 * Download users data from cloud (silent, no UI)
 */
window.downloadUsersFromCloud = async function() {
    // Wait for Supabase SDK
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
    
    // Get users from cloud
    const { data, error } = await client.from('tenant_data')
        .select('*')
        .eq('tenant_id', 'global');
    
    if (error) throw error;
    
    for (const record of data || []) {
        if (record.data_key === 'ezcubic_users' && record.data?.value) {
            const cloudUsers = record.data.value;
            const localUsers = JSON.parse(localStorage.getItem('ezcubic_users') || '[]');
            
            // Merge: Cloud wins for newer data
            const mergedUsers = [...localUsers];
            cloudUsers.forEach(cloudUser => {
                const localIdx = mergedUsers.findIndex(u => u.id === cloudUser.id);
                if (localIdx >= 0) {
                    // Compare timestamps, prefer newer
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
            
            // Merge tenants
            const mergedTenants = { ...localTenants, ...cloudTenants };
            localStorage.setItem('ezcubic_tenants', JSON.stringify(mergedTenants));
            console.log('🏢 Tenants merged from cloud');
        }
    }
};

// Export helper
window.generateCompanyCodeForTenant = generateCompanyCodeForTenant;

// ==================== CLOUD SYNC FOR PLATFORM CONTROL ====================
// Refresh Platform Control data from cloud
window.refreshPlatformFromCloud = async function() {
    const btn = document.getElementById('platformRefreshBtn');
    const originalHTML = btn ? btn.innerHTML : '';
    
    if (btn) {
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Syncing...';
        btn.disabled = true;
    }
    
    try {
        // Use the mobileDownloadFromCloud function to get latest data
        if (typeof window.mobileDownloadFromCloud === 'function') {
            await window.mobileDownloadFromCloud();
        } else if (typeof window.downloadUsersFromCloud === 'function') {
            await window.downloadUsersFromCloud();
        }
        
        // Re-render Platform Control with fresh data
        renderPlatformControl();
        
        // Update timestamp
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
};