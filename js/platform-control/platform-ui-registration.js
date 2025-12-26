/**
 * EZCubic - Platform UI Registration Functions
 * Self-registration modal, step navigation, and registration handling
 * Split from platform-ui.js v2.3.2
 */

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
        if (typeof loadUsers === 'function') loadUsers();
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
    if (typeof loadUsers === 'function') loadUsers();
    
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
        const tenantId = typeof createTenant === 'function' ? createTenant(newUser.id, businessName) : 'tenant_' + Date.now();
        newUser.tenantId = tenantId;
        
        // Create subscription
        createSubscription(tenantId, plan, settings.enableTrials);
    } else {
        newUser.tenantId = 'personal_' + Date.now();
    }
    
    // Save user
    window.users.push(newUser);
    if (typeof saveUsers === 'function') saveUsers();
    
    closeModal('registrationModal');
    
    // Auto-login
    if (typeof login === 'function') login(email, password);
    
    showToast(`Welcome to ${settings.platformName}! Your ${settings.enableTrials ? 'trial' : 'subscription'} has started.`, 'success');
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

// ==================== GLOBAL EXPORTS ====================
window.showRegistrationModal = showRegistrationModal;
window.goToRegStep = goToRegStep;
window.handleSelfRegistration = handleSelfRegistration;
window.enhanceLoginModal = enhanceLoginModal;
