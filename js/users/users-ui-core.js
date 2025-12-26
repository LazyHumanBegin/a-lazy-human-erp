/**
 * EZCubic - User UI Core Module
 * Core UI functions: Auth UI updates, login page, navigation
 * Version: 2.2.5 - Split from users-ui.js
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
            if (isPlatformAdmin) platformAdminNav.style.display = '';
        }
        if (userManagementNav) {
            const showUserMgmt = isPlatformAdmin || isBusinessAdmin;
            userManagementNav.classList.toggle('visible', showUserMgmt);
            if (showUserMgmt) userManagementNav.style.display = '';
        }
        if (platformControlNav) {
            platformControlNav.classList.toggle('visible', isPlatformAdmin);
            if (isPlatformAdmin) platformControlNav.style.display = '';
        }
        // Always hide tenant selector - it's managed separately by multi-tenant module
        if (tenantSelector) {
            tenantSelector.style.display = 'none';
        }
        
        // Show mobile menu button when logged in
        const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
        if (mobileMenuBtn) mobileMenuBtn.style.display = '';
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

// ==================== WINDOW EXPORTS ====================
window.isGuestMode = isGuestMode;
window.updateAuthUI = updateAuthUI;
window.toggleUserMenu = toggleUserMenu;
window.closeUserMenu = closeUserMenu;
window.showLoginPage = showLoginPage;
window.showLoginView = showLoginView;
window.showRegisterView = showRegisterView;
window.showForgotPasswordView = showForgotPasswordView;
window.hideLoginPage = hideLoginPage;
