/**
 * EZCubic - User UI Render Module
 * Login handlers, registration, password reset, modals, guest mode
 * Version: 2.2.5 - Split from users-ui.js
 */

// ==================== LOGIN PAGE HANDLERS ====================
function handleLoginPage(event) {
    event.preventDefault();
    const email = document.getElementById('loginPageEmail').value;
    const password = document.getElementById('loginPagePassword').value;
    login(email, password);
}

function handleRegisterPage(event) {
    event.preventDefault();
    
    const name = document.getElementById('regPageName').value.trim();
    const email = document.getElementById('regPageEmail').value.trim();
    const password = document.getElementById('regPagePassword').value;
    const passwordConfirm = document.getElementById('regPagePasswordConfirm').value;
    
    // Validation
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
    if (users.find(u => u.email.toLowerCase() === email.toLowerCase())) {
        showToast('Email already registered. Please login instead.', 'error');
        return;
    }
    
    // Hash password before storing
    hashPassword(password).then(hashedPassword => {
        // Create a unique tenant for this user
        const tenantId = 'tenant_' + Date.now();
        
        // Create personal user with hashed password
        const newUser = {
            id: 'user_' + Date.now(),
            email: email,
            password: hashedPassword, // Now hashed!
            name: name,
            role: 'personal',
            plan: 'personal',
            status: 'active',
            permissions: ['dashboard', 'transactions', 'income', 'expenses', 'reports', 'taxes', 'balance-sheet', 'monthly-reports', 'ai-chatbot', 'bills'],
            tenantId: tenantId,
            createdAt: new Date().toISOString(),
            registeredVia: 'free_signup'
        };
        
        users.push(newUser);
        saveUsers();
        
        // Initialize empty tenant data
        initializeEmptyTenantData(tenantId, name);
        
        // Auto-login
        currentUser = newUser;
        window.currentUser = newUser;
        localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(currentUser));
        
        // Remove guest mode
        isGuestMode = false;
        removeViewOnlyMode();
        
        // Load tenant data
        if (typeof loadCurrentTenantData === 'function') {
            loadCurrentTenantData();
        } else {
            resetToEmptyData();
        }
        
        showToast(`Welcome ${name}! Your free account is ready.`, 'success');
        
        // Hide login page and show main app
        const loginPage = document.getElementById('loginPageOverlay');
        if (loginPage) loginPage.classList.add('hidden');
        
        document.body.classList.remove('logged-out');
        const appContainer = document.querySelector('.app-container');
        if (appContainer) appContainer.classList.remove('logged-out');
        
        // Show mobile menu button
        const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
        if (mobileMenuBtn) mobileMenuBtn.style.display = '';
        
        // Update auth panel
        updateAuthUI();
        
        // Apply plan restrictions
        if (typeof applyPlanRestrictions === 'function') {
            applyPlanRestrictions();
        }
        
        // Show dashboard
        showSection('dashboard');
        
        // Refresh displays
        if (typeof updateDisplay === 'function') updateDisplay();
        if (typeof renderDashboard === 'function') renderDashboard();
        
        console.log('🔒 User registered with hashed password');
    });
}

function verifyForgotEmail() {
    const email = document.getElementById('forgotPageEmail').value.trim();
    
    if (!email) {
        showToast('Please enter your email address', 'error');
        return;
    }
    
    loadUsers();
    const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());
    
    if (!user) {
        showToast('No account found with this email', 'error');
        return;
    }
    
    // Show step 2
    document.getElementById('forgotStep1').style.display = 'none';
    document.getElementById('forgotStep2').style.display = 'block';
    document.getElementById('foundEmailDisplay').textContent = email;
    document.getElementById('resetPageUserId').value = user.id;
}

function executePagePasswordReset() {
    const newPassword = document.getElementById('newPagePassword').value;
    const confirmPassword = document.getElementById('confirmPagePassword').value;
    const userId = document.getElementById('resetPageUserId').value;
    
    if (newPassword !== confirmPassword) {
        showToast('Passwords do not match', 'error');
        return;
    }
    
    if (newPassword.length < 6) {
        showToast('Password must be at least 6 characters', 'error');
        return;
    }
    
    const userIndex = users.findIndex(u => u.id === userId);
    if (userIndex === -1) {
        showToast('User not found', 'error');
        return;
    }
    
    users[userIndex].password = newPassword;
    users[userIndex].updatedAt = new Date().toISOString();
    saveUsers();
    
    showLoginView();
    showToast('Password reset successfully! Please login with your new password.', 'success');
}

// ==================== LOGIN MODAL ====================
function showLoginModal() {
    let modal = document.getElementById('loginModal');
    
    if (!modal) {
        const modalHTML = `
            <div class="modal show" id="loginModal" style="z-index: 9999;">
                <div class="modal-content" style="max-width: 400px;">
                    <div class="login-header">
                        <div class="login-logo">
                            <img src="images/lazyhuman.svg" alt="A Lazy Human" style="width: 60px; height: 60px;">
                        </div>
                        <h2>A Lazy Human</h2>
                        <p>Sign in to continue</p>
                    </div>
                    <form id="loginForm" onsubmit="handleLogin(event)">
                        <div class="form-group">
                            <label class="form-label">Email</label>
                            <div class="input-icon">
                                <i class="fas fa-envelope"></i>
                                <input type="email" id="loginEmail" class="form-control" required placeholder="Enter your email">
                            </div>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Password</label>
                            <div class="input-icon">
                                <i class="fas fa-lock"></i>
                                <input type="password" id="loginPassword" class="form-control" required placeholder="Enter your password">
                            </div>
                        </div>
                        <div class="form-group" style="display: flex; justify-content: space-between; align-items: center;">
                            <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
                                <input type="checkbox" id="rememberMe"> Remember me
                            </label>
                            <a href="#" onclick="showForgotPassword(); return false;" style="color: #2563eb; font-size: 13px;">Forgot password?</a>
                        </div>
                        <button type="submit" class="btn-primary" style="width: 100%; padding: 12px;">
                            <i class="fas fa-sign-in-alt"></i> Sign In
                        </button>
                    </form>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        modal = document.getElementById('loginModal');
    } else {
        modal.style.display = '';
        modal.classList.add('show');
    }
}

function closeLoginModal() {
    const modal = document.getElementById('loginModal');
    if (modal) {
        modal.classList.remove('show');
    }
}

function handleLogin(event) {
    event.preventDefault();
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    login(email, password);
}

function showForgotPassword() {
    closeLoginModal();
    
    // Remove existing modal if any
    document.getElementById('forgotPasswordModal')?.remove();
    
    const modalHTML = `
        <div class="modal show" id="forgotPasswordModal" style="z-index: 10000;">
            <div class="modal-content" style="max-width: 400px;">
                <div class="modal-header">
                    <h3 class="modal-title"><i class="fas fa-key"></i> Reset Password</h3>
                    <button class="modal-close" onclick="closeForgotPasswordModal()">&times;</button>
                </div>
                <div id="forgotPasswordStep1">
                    <p style="color: #64748b; margin-bottom: 20px;">Enter your email address to reset your password.</p>
                    <div class="form-group">
                        <label class="form-label">Email Address</label>
                        <input type="email" id="resetEmail" class="form-control" placeholder="Enter your registered email" required>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn-secondary" onclick="closeForgotPasswordModal(); showLoginPage();">Back to Login</button>
                        <button type="button" class="btn-primary" onclick="verifyResetEmail()">
                            <i class="fas fa-search"></i> Find Account
                        </button>
                    </div>
                </div>
                <div id="forgotPasswordStep2" style="display: none;">
                    <div style="text-align: center; margin-bottom: 20px;">
                        <div style="width: 60px; height: 60px; background: #dcfce7; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 15px;">
                            <i class="fas fa-user-check" style="font-size: 24px; color: #16a34a;"></i>
                        </div>
                        <p style="color: #64748b;">Account found for: <strong id="foundEmail"></strong></p>
                    </div>
                    <div class="form-group">
                        <label class="form-label">New Password</label>
                        <input type="password" id="newResetPassword" class="form-control" placeholder="Enter new password" minlength="6" required>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Confirm New Password</label>
                        <input type="password" id="confirmResetPassword" class="form-control" placeholder="Confirm new password" required>
                    </div>
                    <input type="hidden" id="resetUserId" value="">
                    <div class="modal-footer">
                        <button type="button" class="btn-secondary" onclick="closeForgotPasswordModal(); showLoginPage();">Cancel</button>
                        <button type="button" class="btn-primary" onclick="executePasswordReset()">
                            <i class="fas fa-save"></i> Reset Password
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

function closeForgotPasswordModal() {
    const modal = document.getElementById('forgotPasswordModal');
    if (modal) {
        modal.remove();
    }
}

function verifyResetEmail() {
    const email = document.getElementById('resetEmail').value.trim();
    
    if (!email) {
        showToast('Please enter your email address', 'error');
        return;
    }
    
    // Reload users to get latest data
    loadUsers();
    
    const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());
    
    if (user) {
        document.getElementById('forgotPasswordStep1').style.display = 'none';
        document.getElementById('forgotPasswordStep2').style.display = 'block';
        document.getElementById('foundEmail').textContent = user.email;
        document.getElementById('resetUserId').value = user.id;
        showToast('Account found! Please set a new password.', 'success');
    } else {
        showToast('No account found with this email address', 'error');
    }
}

function executePasswordReset() {
    const userId = document.getElementById('resetUserId').value;
    const newPassword = document.getElementById('newResetPassword').value;
    const confirmPassword = document.getElementById('confirmResetPassword').value;
    
    if (!newPassword || newPassword.length < 6) {
        showToast('Password must be at least 6 characters', 'error');
        return;
    }
    
    if (newPassword !== confirmPassword) {
        showToast('Passwords do not match', 'error');
        return;
    }
    
    // Reload and update
    loadUsers();
    
    const userIndex = users.findIndex(u => u.id === userId);
    if (userIndex === -1) {
        showToast('User not found', 'error');
        return;
    }
    
    users[userIndex].password = newPassword;
    users[userIndex].updatedAt = new Date().toISOString();
    saveUsers();
    
    closeForgotPasswordModal();
    showLoginPage();
    showToast('Password reset successfully! Please login with your new password.', 'success');
}

// Toggle company code sync section
function toggleCompanyCodeSync() {
    const section = document.getElementById('companyCodeSync');
    if (section) {
        section.style.display = section.style.display === 'none' ? 'block' : 'none';
    }
}

// Remove view-only mode (for guest users)
function removeViewOnlyMode() {
    document.querySelectorAll('.view-only-overlay, .guest-badge, #viewOnlyBanner').forEach(el => el.remove());
    document.querySelectorAll('input, select, textarea, button').forEach(el => {
        el.disabled = false;
        el.classList.remove('guest-disabled');
    });
}

// ==================== FREE REGISTRATION MODAL ====================
function showFreeRegistrationModal() {
    const existingModal = document.getElementById('freeRegisterModal');
    if (existingModal) existingModal.remove();
    
    const modalHTML = `
        <div class="modal show" id="freeRegisterModal" style="z-index: 9999;">
            <div class="modal-content" style="max-width: 450px;">
                <div class="modal-header" style="background: linear-gradient(135deg, #10b981, #059669); color: white; text-align: center; padding: 25px;">
                    <h3 style="margin: 0; font-size: 20px;">
                        <i class="fas fa-gift" style="margin-right: 8px;"></i> Create Free Account
                    </h3>
                    <p style="margin: 8px 0 0; opacity: 0.9; font-size: 13px;">Start tracking your finances for free</p>
                    <button class="modal-close" onclick="closeFreeRegisterModal()" style="position: absolute; top: 15px; right: 15px; background: none; border: none; color: white; font-size: 20px; cursor: pointer;">&times;</button>
                </div>
                <form id="freeRegisterForm" onsubmit="handleFreeRegistration(event)" style="padding: 20px;">
                    <div class="form-group">
                        <label class="form-label">Full Name *</label>
                        <input type="text" id="regName" class="form-control" required placeholder="Enter your full name">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Email *</label>
                        <input type="email" id="regEmail" class="form-control" required placeholder="Enter your email">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Password *</label>
                        <input type="password" id="regPassword" class="form-control" required placeholder="Create a password" minlength="6">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Confirm Password *</label>
                        <input type="password" id="regPasswordConfirm" class="form-control" required placeholder="Confirm your password">
                    </div>
                    
                    <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 12px; margin: 15px 0;">
                        <div style="font-weight: 600; color: #166534; margin-bottom: 8px;">
                            <i class="fas fa-check-circle"></i> Personal Plan (Free)
                        </div>
                        <ul style="margin: 0; padding-left: 20px; font-size: 12px; color: #15803d;">
                            <li>Dashboard & Overview</li>
                            <li>Record Income & Expenses</li>
                            <li>Transaction Management</li>
                            <li>Financial Reports</li>
                            <li>Tax Calculator</li>
                            <li>AI Assistant</li>
                        </ul>
                    </div>
                    
                    <div class="form-group" style="display: flex; align-items: flex-start; gap: 8px;">
                        <input type="checkbox" id="regAgree" required style="margin-top: 4px;">
                        <label for="regAgree" style="font-size: 12px; color: #64748b; cursor: pointer;">
                            I agree to the Terms of Service and Privacy Policy
                        </label>
                    </div>
                    
                    <button type="submit" class="btn-primary" style="width: 100%; padding: 12px; font-size: 14px;">
                        <i class="fas fa-user-plus"></i> Create Free Account
                    </button>
                    
                    <p style="text-align: center; margin-top: 15px; font-size: 13px; color: #64748b;">
                        Already have an account? 
                        <a href="#" onclick="closeFreeRegisterModal(); showLoginPage(); return false;" style="color: #2563eb; font-weight: 500;">Sign In</a>
                    </p>
                </form>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

function closeFreeRegisterModal() {
    const modal = document.getElementById('freeRegisterModal');
    if (modal) modal.remove();
}

function handleFreeRegistration(event) {
    event.preventDefault();
    
    const name = document.getElementById('regName').value.trim();
    const email = document.getElementById('regEmail').value.trim();
    const password = document.getElementById('regPassword').value;
    const passwordConfirm = document.getElementById('regPasswordConfirm').value;
    
    // Validation
    if (password !== passwordConfirm) {
        showToast('Passwords do not match', 'error');
        return;
    }
    
    if (password.length < 6) {
        showToast('Password must be at least 6 characters', 'error');
        return;
    }
    
    // Load users if needed
    if (typeof loadUsers === 'function') loadUsers();
    
    // Check if email exists
    if (users.find(u => u.email.toLowerCase() === email.toLowerCase())) {
        showToast('Email already registered. Please login instead.', 'error');
        return;
    }
    
    // Create a unique tenant for this user (isolated business data)
    const tenantId = 'tenant_' + Date.now();
    
    // Create personal user
    const newUser = {
        id: 'user_' + Date.now(),
        email: email,
        password: password,
        name: name,
        role: 'personal',
        plan: 'personal',
        status: 'active',
        permissions: ['dashboard', 'transactions', 'income', 'expenses', 'reports', 'taxes', 'balance-sheet', 'monthly-reports', 'ai-chatbot', 'bills'],
        tenantId: tenantId,
        createdAt: new Date().toISOString(),
        registeredVia: 'free_signup'
    };
    
    users.push(newUser);
    if (typeof saveUsers === 'function') saveUsers();
    
    // Initialize empty tenant data for this user
    if (typeof initializeEmptyTenantData === 'function') {
        initializeEmptyTenantData(tenantId, name);
    }
    
    // Auto-login
    currentUser = newUser;
    window.currentUser = newUser;
    localStorage.setItem('ezcubic_current_user', JSON.stringify(currentUser));
    
    closeFreeRegisterModal();
    if (typeof hideLoginPage === 'function') hideLoginPage();
    
    // Remove guest mode
    isGuestMode = false;
    removeViewOnlyMode();
    
    // Load the user's empty tenant data
    if (typeof loadCurrentTenantData === 'function') {
        loadCurrentTenantData();
    } else if (typeof resetToEmptyData === 'function') {
        resetToEmptyData();
    }
    
    // Update UI
    if (typeof updateAuthUI === 'function') updateAuthUI();
    
    showToast(`Welcome ${name}! Your free account is ready.`, 'success');
    
    // Show dashboard
    if (typeof showSection === 'function') {
        showSection('dashboard');
    }
    
    // Refresh dashboard
    if (typeof updateDashboard === 'function') {
        updateDashboard();
    }
}

// ==================== GUEST PREVIEW MODE ====================
function applyGuestPreviewMode() {
    isGuestMode = true;
    
    // Guest preview - only show BASIC features
    document.querySelectorAll('.nav-btn').forEach(btn => {
        const section = btn.getAttribute('onclick')?.match(/showSection\('([^']+)'\)/)?.[1];
        if (section) {
            // Only show Dashboard for guests
            btn.style.display = section === 'dashboard' ? '' : 'none';
        }
    });
    
    // Hide all nav separators
    document.querySelectorAll('.nav-separator').forEach(sep => {
        sep.style.display = 'none';
    });
    
    // Hide platform admin nav
    const platformAdminNav = document.getElementById('platformAdminNav');
    const userManagementNav = document.getElementById('userManagementNav');
    const platformControlNav = document.getElementById('platformControlNav');
    const tenantSelector = document.getElementById('tenantSelector');
    
    if (platformAdminNav) platformAdminNav.classList.remove('visible');
    if (userManagementNav) userManagementNav.style.display = 'none';
    if (platformControlNav) platformControlNav.classList.remove('visible');
    if (tenantSelector) tenantSelector.style.display = 'none';
}

// Intercept section navigation for guests
function checkGuestAccess(sectionId) {
    if (!currentUser && isGuestMode) {
        // Allow viewing but prompt on interaction
        showFreeRegistrationModal();
        return false;
    }
    return true;
}

// ==================== WINDOW EXPORTS ====================
window.handleLoginPage = handleLoginPage;
window.handleRegisterPage = handleRegisterPage;
window.verifyForgotEmail = verifyForgotEmail;
window.executePagePasswordReset = executePagePasswordReset;
window.showLoginModal = showLoginModal;
window.closeLoginModal = closeLoginModal;
window.handleLogin = handleLogin;
window.showForgotPassword = showForgotPassword;
window.closeForgotPasswordModal = closeForgotPasswordModal;
window.verifyResetEmail = verifyResetEmail;
window.executePasswordReset = executePasswordReset;
window.toggleCompanyCodeSync = toggleCompanyCodeSync;
window.removeViewOnlyMode = removeViewOnlyMode;
window.showFreeRegistrationModal = showFreeRegistrationModal;
window.closeFreeRegisterModal = closeFreeRegisterModal;
window.handleFreeRegistration = handleFreeRegistration;
window.applyGuestPreviewMode = applyGuestPreviewMode;
window.checkGuestAccess = checkGuestAccess;
