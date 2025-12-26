/**
 * EZCubic - Platform Control Panel UI
 * Platform control rendering, tenant/subscription management, settings forms
 * Split from platform-ui.js v2.3.2
 */

// ==================== PLATFORM CONTROL PANEL ====================
function renderPlatformControl() {
    const container = document.getElementById('platformControlContent');
    if (!container) return;
    
    console.log('🎨 renderPlatformControl called');
    
    const settings = getPlatformSettings();
    const tenants = typeof getTenants === 'function' ? getTenants() : {};
    const subs = getSubscriptions();
    
    // Build tenant list from both tenants storage AND users with tenantIds
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
                                companyCode = generateCompanyCodeForTenant(tenant.id);
                            }
                            
                            return `
                                <tr>
                                    <td>
                                        <strong>${typeof escapeHtml === 'function' ? escapeHtml(tenant.businessName) : tenant.businessName}</strong>
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
    const tenant = typeof getTenantInfo === 'function' ? getTenantInfo(tenantId) : null;
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
                <p style="margin-bottom: 15px;">Change plan for: <strong>${typeof escapeHtml === 'function' ? escapeHtml(tenant?.businessName || 'Unknown') : (tenant?.businessName || 'Unknown')}</strong></p>
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
    const tenants = typeof getTenants === 'function' ? getTenants() : {};
    if (tenants[tenantId]) {
        tenants[tenantId].status = 'suspended';
        if (typeof saveTenants === 'function') saveTenants(tenants);
    }
    
    renderPlatformControl();
    showToast('Business suspended', 'info');
}

function reactivateTenant(tenantId) {
    // Extend by 30 days and reactivate
    extendSubscription(tenantId);
    
    // Update tenant status
    const tenants = typeof getTenants === 'function' ? getTenants() : {};
    if (tenants[tenantId]) {
        tenants[tenantId].status = 'active';
        if (typeof saveTenants === 'function') saveTenants(tenants);
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

// ==================== GLOBAL EXPORTS ====================
window.renderPlatformControl = renderPlatformControl;
window.renderPlanFeaturesRows = renderPlanFeaturesRows;
window.showChangePlanModal = showChangePlanModal;
window.executeChangePlan = executeChangePlan;
window.syncUserToNewPlan = syncUserToNewPlan;
window.extendSubscription = extendSubscription;
window.suspendTenant = suspendTenant;
window.reactivateTenant = reactivateTenant;
window.savePlatformSettingsForm = savePlatformSettingsForm;
window.savePlanLimits = savePlanLimits;
