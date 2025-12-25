/**
 * EZCubic - Platform Core
 * Core constants, subscriptions, and settings management
 * Split from platform-control.js v2.2.6 - 22 Jan 2025
 */

// ==================== PLATFORM SETTINGS ====================
const PLATFORM_SETTINGS_KEY = 'ezcubic_platform_settings';
const SUBSCRIPTIONS_KEY = 'ezcubic_subscriptions';

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
    const data = typeof loadTenantData === 'function' ? loadTenantData(tenantId) : null;
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

// ==================== GLOBAL EXPORTS ====================
window.PLATFORM_SETTINGS_KEY = PLATFORM_SETTINGS_KEY;
window.SUBSCRIPTIONS_KEY = SUBSCRIPTIONS_KEY;
window.DEFAULT_PLATFORM_SETTINGS = DEFAULT_PLATFORM_SETTINGS;
window.getSubscriptions = getSubscriptions;
window.saveSubscriptions = saveSubscriptions;
window.createSubscription = createSubscription;
window.getSubscription = getSubscription;
window.updateSubscription = updateSubscription;
window.checkSubscriptionStatus = checkSubscriptionStatus;
window.getPlatformSettings = getPlatformSettings;
window.savePlatformSettings = savePlatformSettings;
window.getTenantUsage = getTenantUsage;
window.checkUsageLimits = checkUsageLimits;
