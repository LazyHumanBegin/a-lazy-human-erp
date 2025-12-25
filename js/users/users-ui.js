/**
 * EZCubic - User UI Module
 * Login page, login modal, UI updates, registration forms
 * Version: 2.2.5 - Split from users.js
 */

// Guest mode flag
let isGuestMode = false;

// ==================== UI UPDATES ====================
function updateAuthUI() {
    const authContainer = document.getElementById('authContainer');
    const userMenuContainer = document.getElementById('userMenuContainer');
    
    // Platform Admin nav elements
    const platformAdminNav = document.getElementById('platformAdminNav');
    const userManagementNav = document.getElementById('userManagementNav');
    const platformControlNav = document.getElementById('platformControlNav');
    const tenantSelector = document.getElementById('tenantSelector');
    
    if (currentUser) {
        // User is logged in
        const role = ROLES[currentUser.role] || {};
        
        if (authContainer) authContainer.style.display = 'none';
        if (userMenuContainer) {
            userMenuContainer.style.display = 'block';
            userMenuContainer.innerHTML = `
                <div class="user-menu" onclick="toggleUserMenu()">
                    <div class="user-avatar" style="background: ${role.color || '#6366f1'}">
                        <i class="fas ${role.icon || 'fa-user'}"></i>
                    </div>
                    <div class="user-info">
                        <span class="user-name">${escapeHtml(currentUser.name)}</span>
                        <span class="user-role">${role.name || currentUser.role}</span>
                    </div>
                    <i class="fas fa-chevron-down"></i>
                </div>
                <div class="user-dropdown" id="userDropdown">
                    <div class="dropdown-header">
                        <div class="user-avatar-lg" style="background: ${role.color || '#6366f1'}">
                            <i class="fas ${role.icon || 'fa-user'}"></i>
                        </div>
                        <div>
                            <div class="dropdown-name">${escapeHtml(currentUser.name)}</div>
                            <div class="dropdown-email">${escapeHtml(currentUser.email)}</div>
                            <span class="dropdown-role" style="background: ${role.color || '#6366f1'}">${role.name || currentUser.role}</span>
                        </div>
                    </div>
                    <div class="dropdown-divider"></div>
                    <a class="dropdown-item" onclick="showSection('settings'); closeUserMenu();">
                        <i class="fas fa-cog"></i> Settings
                    </a>
                    ${currentUser.role === 'founder' || currentUser.role === 'business_admin' ? `
                        <a class="dropdown-item" onclick="showSection('user-management'); closeUserMenu();">
                            <i class="fas fa-users"></i> User Management
                        </a>
                    ` : ''}
                    <div class="dropdown-divider"></div>
                    <a class="dropdown-item danger" onclick="logout()">
                        <i class="fas fa-sign-out-alt"></i> Logout
                    </a>
                </div>
            `;
        }
        
        // Show/hide Platform Admin navigation based on role
        const isPlatformAdmin = ['founder', 'erp_assistant'].includes(currentUser.role);
        const isBusinessAdmin = currentUser.role === 'business_admin';
        
        if (platformAdminNav) {
            platformAdminNav.classList.toggle('visible', isPlatformAdmin);
        }
        if (userManagementNav) {
            userManagementNav.style.display = (isPlatformAdmin || isBusinessAdmin) ? '' : 'none';
        }
        if (platformControlNav) {
            platformControlNav.classList.toggle('visible', isPlatformAdmin);
        }
        if (tenantSelector) {
            tenantSelector.style.display = isPlatformAdmin ? '' : 'none';
        }
    } else {
        // User is not logged in
        if (authContainer) authContainer.style.display = '';
        if (userMenuContainer) {
            userMenuContainer.style.display = 'none';
            userMenuContainer.innerHTML = '';
        }
        
        // Hide platform admin nav
        if (platformAdminNav) platformAdminNav.classList.remove('visible');
        if (userManagementNav) userManagementNav.style.display = 'none';
        if (platformControlNav) platformControlNav.classList.remove('visible');
        if (tenantSelector) tenantSelector.style.display = 'none';
        
        // Show login page
        showLoginPage();
    }
}

function toggleUserMenu() {
    const dropdown = document.getElementById('userDropdown');
    if (dropdown) {
        dropdown.classList.toggle('show');
    }
}

function closeUserMenu() {
    const dropdown = document.getElementById('userDropdown');
    if (dropdown) {
        dropdown.classList.remove('show');
    }
}

// Close dropdown when clicking outside
document.addEventListener('click', (e) => {
    if (!e.target.closest('.user-menu')) {
        closeUserMenu();
    }
});

// ==================== LOGIN PAGE (FULL SCREEN) ====================
function showLoginPage() {
    let loginPage = document.getElementById('loginPageOverlay');
    
    if (!loginPage) {
        // Create the login page overlay
        const loginPageHTML = `
            <div class="login-page-overlay" id="loginPageOverlay">
                <div class="login-page-container">
                    <div class="login-page-brand">
                        <div class="brand-logo">
                            <img src="images/lazyhuman.svg" alt="A Lazy Human" style="width: 80px; height: 80px;">
                        </div>
                        <h1>A Lazy Human</h1>
                        <div class="tagline">Malaysian Business Accounting & Tax Platform</div>
                    </div>
                    
                    <div class="login-page-card">
                        <!-- LOGIN FORM -->
                        <div id="loginFormView">
                            <h2>Welcome Back</h2>
                            <p class="subtitle">Sign in to access your business dashboard</p>
                            
                            <form id="loginPageForm" onsubmit="handleLoginPage(event)">
                                <div id="loginErrorMessage" style="display: none; background: #fef2f2; border: 1px solid #fecaca; color: #dc2626; padding: 12px 15px; border-radius: 8px; margin-bottom: 15px; font-size: 14px;">
                                    <i class="fas fa-exclamation-circle" style="margin-right: 8px;"></i>
                                    <span id="loginErrorText"></span>
                                </div>
                                
                                <div class="form-group">
                                    <label class="form-label">Email Address</label>
                                    <div class="input-wrapper">
                                        <i class="fas fa-envelope"></i>
                                        <input type="email" id="loginPageEmail" placeholder="Enter your email" required>
                                    </div>
                                </div>
                                
                                <div class="form-group">
                                    <label class="form-label">Password</label>
                                    <div class="input-wrapper">
                                        <i class="fas fa-lock"></i>
                                        <input type="password" id="loginPagePassword" placeholder="Enter your password" required>
                                    </div>
                                </div>
                                
                                <div class="options-row">
                                    <label class="remember-me">
                                        <input type="checkbox" id="loginPageRemember">
                                        Remember me
                                    </label>
                                    <a href="#" class="forgot-link" onclick="showForgotPasswordView(); return false;">Forgot password?</a>
                                </div>
                                
                                <button type="submit" class="login-btn">
                                    <i class="fas fa-sign-in-alt"></i>
                                    Sign In
                                </button>
                            </form>
                            
                            <div class="divider">
                                <span>New to A Lazy Human?</span>
                            </div>
                            
                            <button type="button" class="register-btn" onclick="showRegisterView();">
                                <i class="fas fa-user-plus"></i>
                                Create Free Account
                            </button>
                        </div>
                        
                        <!-- REGISTER FORM -->
                        <div id="registerFormView" style="display: none;">
                            <div style="display: flex; align-items: center; margin-bottom: 15px;">
                                <button type="button" onclick="showLoginView();" style="background: none; border: none; color: #64748b; cursor: pointer; padding: 5px; margin-right: 10px; font-size: 16px;">
                                    <i class="fas fa-arrow-left"></i>
                                </button>
                                <div>
                                    <h2 style="margin: 0;">Create Account</h2>
                                    <p class="subtitle" style="margin: 5px 0 0;">Start tracking your finances for free</p>
                                </div>
                            </div>
                            
                            <form id="registerPageForm" onsubmit="handleRegisterPage(event)">
                                <div class="form-group">
                                    <label class="form-label">Full Name</label>
                                    <div class="input-wrapper">
                                        <i class="fas fa-user"></i>
                                        <input type="text" id="regPageName" placeholder="Enter your full name" required>
                                    </div>
                                </div>
                                
                                <div class="form-group">
                                    <label class="form-label">Email Address</label>
                                    <div class="input-wrapper">
                                        <i class="fas fa-envelope"></i>
                                        <input type="email" id="regPageEmail" placeholder="Enter your email" required>
                                    </div>
                                </div>
                                
                                <div class="form-group">
                                    <label class="form-label">Password</label>
                                    <div class="input-wrapper">
                                        <i class="fas fa-lock"></i>
                                        <input type="password" id="regPagePassword" placeholder="Create a password" minlength="6" required>
                                    </div>
                                </div>
                                
                                <div class="form-group">
                                    <label class="form-label">Confirm Password</label>
                                    <div class="input-wrapper">
                                        <i class="fas fa-lock"></i>
                                        <input type="password" id="regPagePasswordConfirm" placeholder="Confirm password" required>
                                    </div>
                                </div>
                                
                                <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 12px; margin-bottom: 15px;">
                                    <div style="font-weight: 600; color: #166534; margin-bottom: 5px; font-size: 13px;">
                                        <i class="fas fa-check-circle"></i> Personal Plan (Free)
                                    </div>
                                    <div style="font-size: 11px; color: #15803d;">
                                        Dashboard • Income & Expenses • Reports • Tax Calculator • AI Assistant
                                    </div>
                                </div>
                                
                                <div class="form-group" style="display: flex; align-items: flex-start; gap: 8px;">
                                    <input type="checkbox" id="regPageAgree" required style="margin-top: 3px; width: 16px; height: 16px;">
                                    <label for="regPageAgree" style="font-size: 12px; color: #64748b; cursor: pointer;">
                                        I agree to the Terms of Service and Privacy Policy
                                    </label>
                                </div>
                                
                                <button type="submit" class="login-btn" style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);">
                                    <i class="fas fa-user-plus"></i>
                                    Create Free Account
                                </button>
                            </form>
                            
                            <div class="divider">
                                <span>Already have an account?</span>
                            </div>
                            
                            <button type="button" class="register-btn" onclick="showLoginView();" style="color: #3b82f6; border-color: #3b82f6;">
                                <i class="fas fa-sign-in-alt"></i>
                                Sign In
                            </button>
                        </div>
                        
                        <!-- FORGOT PASSWORD FORM -->
                        <div id="forgotPasswordView" style="display: none;">
                            <h2>Reset Password</h2>
                            <p class="subtitle">Enter your email to find your account</p>
                            
                            <div id="forgotStep1">
                                <div class="form-group">
                                    <label class="form-label">Email Address</label>
                                    <div class="input-wrapper">
                                        <i class="fas fa-envelope"></i>
                                        <input type="email" id="forgotPageEmail" placeholder="Enter your registered email" required>
                                    </div>
                                </div>
                                
                                <button type="button" class="login-btn" onclick="verifyForgotEmail();">
                                    <i class="fas fa-search"></i>
                                    Find Account
                                </button>
                            </div>
                            
                            <div id="forgotStep2" style="display: none;">
                                <div style="text-align: center; margin-bottom: 20px;">
                                    <div style="width: 50px; height: 50px; background: #dcfce7; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 10px;">
                                        <i class="fas fa-user-check" style="font-size: 20px; color: #16a34a;"></i>
                                    </div>
                                    <p style="color: #64748b; font-size: 13px;">Account found: <strong id="foundEmailDisplay"></strong></p>
                                </div>
                                
                                <div class="form-group">
                                    <label class="form-label">New Password</label>
                                    <div class="input-wrapper">
                                        <i class="fas fa-lock"></i>
                                        <input type="password" id="newPagePassword" placeholder="Enter new password" minlength="6" required>
                                    </div>
                                </div>
                                
                                <div class="form-group">
                                    <label class="form-label">Confirm New Password</label>
                                    <div class="input-wrapper">
                                        <i class="fas fa-lock"></i>
                                        <input type="password" id="confirmPagePassword" placeholder="Confirm new password" required>
                                    </div>
                                </div>
                                
                                <input type="hidden" id="resetPageUserId" value="">
                                
                                <button type="button" class="login-btn" onclick="executePagePasswordReset();">
                                    <i class="fas fa-save"></i>
                                    Reset Password
                                </button>
                            </div>
                            
                            <div class="divider">
                                <span>Remember your password?</span>
                            </div>
                            
                            <button type="button" class="register-btn" onclick="showLoginView();" style="color: #3b82f6; border-color: #3b82f6;">
                                <i class="fas fa-arrow-left"></i>
                                Back to Login
                            </button>
                        </div>
                    </div>
                    
                    <!-- Cloud Sync with Company Code -->
                    <div id="syncSection" style="text-align: center; margin-top: 15px;">
                        <a href="#" onclick="toggleCompanyCodeSync(); return false;" style="color: #64748b; font-size: 12px; text-decoration: none;">
                            <i class="fas fa-cloud-download-alt"></i> Sync from another device?
                        </a>
                        <div id="companyCodeSync" style="display: none; margin-top: 15px; padding: 15px; background: #f8fafc; border-radius: 12px; text-align: left;">
                            <p style="font-size: 12px; color: #64748b; margin-bottom: 10px;">
                                <i class="fas fa-building"></i> Enter your Company Code (ask your Admin)
                            </p>
                            <div style="display: flex; gap: 8px;">
                                <input type="text" id="companyCodeInput" placeholder="e.g. ACME-7X2K" 
                                    style="flex: 1; padding: 10px 12px; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 14px; text-transform: uppercase; font-family: monospace; letter-spacing: 1px;"
                                    maxlength="12">
                                <button onclick="syncByCompanyCode()" 
                                    style="padding: 10px 16px; background: #2563eb; color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 13px;">
                                    <i class="fas fa-sync"></i> Sync
                                </button>
                            </div>
                            <p style="font-size: 11px; color: #94a3b8; margin-top: 8px;">
                                💡 Your Admin can find this in Settings → Company Code
                            </p>
                        </div>
                    </div>
                    
                    <div class="login-page-footer">
                        <p>© ${new Date().getFullYear()} EZCubic. All rights reserved.</p>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', loginPageHTML);
        loginPage = document.getElementById('loginPageOverlay');
    } else {
        // Reset to login view when showing
        showLoginView();
    }
    
    // Show login page
    loginPage.classList.remove('hidden');
    
    // Hide the main app
    const appContainer = document.querySelector('.app-container');
    if (appContainer) {
        appContainer.classList.add('logged-out');
    }
    document.body.classList.add('logged-out');
    
    // Hide mobile menu button
    const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
    if (mobileMenuBtn) mobileMenuBtn.style.display = 'none';
}

// Toggle between login/register/forgot views
function showLoginView() {
    document.getElementById('loginFormView').style.display = 'block';
    document.getElementById('registerFormView').style.display = 'none';
    document.getElementById('forgotPasswordView').style.display = 'none';
}

function showRegisterView() {
    document.getElementById('loginFormView').style.display = 'none';
    document.getElementById('registerFormView').style.display = 'block';
    document.getElementById('forgotPasswordView').style.display = 'none';
}

function showForgotPasswordView() {
    document.getElementById('loginFormView').style.display = 'none';
    document.getElementById('registerFormView').style.display = 'none';
    document.getElementById('forgotPasswordView').style.display = 'block';
    // Reset to step 1
    document.getElementById('forgotStep1').style.display = 'block';
    document.getElementById('forgotStep2').style.display = 'none';
}

function hideLoginPage() {
    const loginPage = document.getElementById('loginPageOverlay');
    if (loginPage) {
        loginPage.classList.add('hidden');
    }
    
    // Show the main app
    const appContainer = document.querySelector('.app-container');
    if (appContainer) {
        appContainer.classList.remove('logged-out');
    }
    document.body.classList.remove('logged-out');
    
    // Show mobile menu button
    const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
    if (mobileMenuBtn) mobileMenuBtn.style.display = '';
}

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
window.updateAuthUI = updateAuthUI;
window.toggleUserMenu = toggleUserMenu;
window.closeUserMenu = closeUserMenu;
window.showLoginPage = showLoginPage;
window.showLoginView = showLoginView;
window.showRegisterView = showRegisterView;
window.showForgotPasswordView = showForgotPasswordView;
window.hideLoginPage = hideLoginPage;
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
window.applyGuestPreviewMode = applyGuestPreviewMode;
window.checkGuestAccess = checkGuestAccess;
window.isGuestMode = isGuestMode;
