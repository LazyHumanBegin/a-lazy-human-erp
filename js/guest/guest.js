/**
 * Guest Preview Mode Module for EZ.Smart v2.1
 * Extracted from users.js - Phase 5
 * 
 * This module handles:
 * - Guest preview mode (view-only access)
 * - Guest badge UI
 * - View-only mode styling
 * - Free registration modal
 * - Guest access control
 * 
 * @version 1.0.0
 * @requires permissions.js, auth.js, tenant.js to be loaded first
 */

// ==================== GUEST MODE STATE ====================

let isGuestMode = false;

// Expose isGuestMode getter/setter on window
Object.defineProperty(window, 'isGuestMode', {
    get: function() { return isGuestMode; },
    set: function(value) { isGuestMode = value; },
    configurable: true
});

// ==================== GUEST PREVIEW MODE ====================

/**
 * Apply guest preview mode - restricted view for non-logged-in users
 * Shows only Dashboard, hides all business tools
 */
function applyGuestPreviewMode() {
    isGuestMode = true;
    
    // Guest preview - only show BASIC features, hide powerful tools from competitors
    // Show: Dashboard only (with limited view)
    // Hide: All business tools, reports, AI, etc.
    
    document.querySelectorAll('.nav-btn').forEach(btn => {
        const section = btn.getAttribute('onclick')?.match(/showSection\('([^']+)'\)/)?.[1];
        if (section) {
            // Only show Dashboard for guests - hide everything else
            btn.style.display = section === 'dashboard' ? '' : 'none';
        }
    });
    
    // Hide all nav separators
    document.querySelectorAll('.nav-separator').forEach(sep => {
        sep.style.display = 'none';
    });
    
    // Hide platform admin nav (remove visible class to keep them hidden)
    const platformAdminNav = document.getElementById('platformAdminNav');
    const userManagementNav = document.getElementById('userManagementNav');
    const platformControlNav = document.getElementById('platformControlNav');
    const tenantSelector = document.getElementById('tenantSelector');
    
    if (platformAdminNav) platformAdminNav.classList.remove('visible');
    if (userManagementNav) userManagementNav.classList.remove('visible');
    if (platformControlNav) platformControlNav.classList.remove('visible');
    if (tenantSelector) tenantSelector.style.display = 'none';
    
    // Show guest badge with feature teaser
    showGuestBadge();
    
    // Make everything view-only
    applyViewOnlyMode();
}

// Expose to window
window.applyGuestPreviewMode = applyGuestPreviewMode;

// ==================== VIEW-ONLY MODE ====================

/**
 * Apply view-only mode for guests - disable all inputs and buttons
 * Adds CSS styles and banner to indicate preview mode
 */
function applyViewOnlyMode() {
    // Add overlay style to main content
    const style = document.createElement('style');
    style.id = 'guestViewOnlyStyle';
    style.textContent = `
        /* Disable all inputs, buttons, and interactive elements for guests */
        .main-content input:not(.guest-allowed),
        .main-content textarea:not(.guest-allowed),
        .main-content select:not(.guest-allowed),
        .main-content button:not(.guest-allowed):not(.nav-btn),
        .main-content .btn-primary:not(.guest-allowed),
        .main-content .btn-secondary:not(.guest-allowed),
        .main-content .btn-danger:not(.guest-allowed),
        .main-content [onclick]:not(.nav-btn):not(.guest-allowed) {
            pointer-events: none !important;
            opacity: 0.5 !important;
            cursor: not-allowed !important;
        }
        
        /* View-only banner */
        .view-only-banner {
            background: linear-gradient(135deg, #f59e0b, #d97706);
            color: white;
            padding: 10px 20px;
            text-align: center;
            font-size: 13px;
            font-weight: 500;
            position: sticky;
            top: 0;
            z-index: 100;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 15px;
        }
        
        .view-only-banner button {
            pointer-events: auto !important;
            opacity: 1 !important;
            cursor: pointer !important;
            background: white;
            color: #d97706;
            border: none;
            padding: 6px 16px;
            border-radius: 6px;
            font-weight: 600;
            font-size: 12px;
        }
        
        .view-only-banner button:hover {
            background: #fef3c7;
        }
    `;
    document.head.appendChild(style);
    
    // Add view-only banner at top of main content
    const mainContent = document.querySelector('.main-content');
    if (mainContent) {
        const banner = document.createElement('div');
        banner.id = 'viewOnlyBanner';
        banner.className = 'view-only-banner';
        banner.innerHTML = `
            <i class="fas fa-lock"></i>
            <span><strong>Preview Mode</strong> - Create a free account to unlock all features</span>
            <button onclick="showFreeRegistrationModal()" class="guest-allowed">
                <i class="fas fa-unlock"></i> Get Started Free
            </button>
            <button onclick="showLoginPage()" class="guest-allowed" style="background: transparent; color: white; border: 1px solid white;">
                Login
            </button>
        `;
        mainContent.prepend(banner);
    }
}

// Expose to window
window.applyViewOnlyMode = applyViewOnlyMode;

/**
 * Remove view-only mode when logged in
 * Removes CSS styles and banner
 */
function removeViewOnlyMode() {
    const style = document.getElementById('guestViewOnlyStyle');
    if (style) style.remove();
    
    const banner = document.getElementById('viewOnlyBanner');
    if (banner) banner.remove();
    
    const guestBadge = document.getElementById('guestModeBadge');
    if (guestBadge) guestBadge.remove();
}

// Expose to window
window.removeViewOnlyMode = removeViewOnlyMode;

// ==================== GUEST BADGE ====================

/**
 * Show guest badge in sidebar with feature teaser and registration CTA
 */
function showGuestBadge() {
    // Remove existing badge
    const existingBadge = document.getElementById('guestModeBadge');
    if (existingBadge) existingBadge.remove();
    
    // Add guest badge to sidebar
    const sidebar = document.querySelector('.nav-panel');
    if (sidebar) {
        const badge = document.createElement('div');
        badge.id = 'guestModeBadge';
        badge.innerHTML = `
            <div style="
                background: linear-gradient(135deg, #1e293b, #334155);
                color: white;
                padding: 15px;
                margin: 10px;
                border-radius: 12px;
                text-align: center;
                font-size: 12px;
            ">
                <i class="fas fa-lock" style="font-size: 24px; margin-bottom: 8px; color: #f59e0b;"></i>
                <div style="font-weight: 600; margin-bottom: 5px; font-size: 14px;">Unlock Full Access</div>
                <div style="opacity: 0.8; font-size: 11px; margin-bottom: 12px; line-height: 1.4;">
                    Register free to access:<br>
                    • Finance & Accounting<br>
                    • Reports & Analytics<br>
                    • And more features...
                </div>
                <button onclick="showFreeRegistrationModal()" style="
                    background: linear-gradient(135deg, #10b981, #059669);
                    color: white;
                    border: none;
                    padding: 10px 16px;
                    border-radius: 8px;
                    cursor: pointer;
                    font-weight: 600;
                    font-size: 12px;
                    width: 100%;
                    margin-bottom: 8px;
                ">
                    <i class="fas fa-user-plus"></i> Register Free
                </button>
                <button onclick="showLoginPage()" style="
                    background: transparent;
                    color: #94a3b8;
                    border: 1px solid #475569;
                    padding: 8px 16px;
                    border-radius: 8px;
                    cursor: pointer;
                    font-weight: 500;
                    font-size: 11px;
                    width: 100%;
                ">
                    Already have account? Login
                </button>
            </div>
        `;
        
        // Insert after nav header or at top
        const navHeader = sidebar.querySelector('.sidebar-header');
        if (navHeader) {
            navHeader.after(badge);
        } else {
            sidebar.prepend(badge);
        }
    }
}

// Expose to window
window.showGuestBadge = showGuestBadge;

// ==================== FREE REGISTRATION MODAL ====================

/**
 * Show free registration modal for guests
 */
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

// Expose to window
window.showFreeRegistrationModal = showFreeRegistrationModal;

/**
 * Close free registration modal
 */
function closeFreeRegisterModal() {
    const modal = document.getElementById('freeRegisterModal');
    if (modal) modal.remove();
}

// Expose to window
window.closeFreeRegisterModal = closeFreeRegisterModal;

// ==================== FREE REGISTRATION HANDLER ====================

/**
 * Handle free registration form submission
 * Creates a personal user with isolated tenant data
 * @param {Event} event - Form submit event
 */
function handleFreeRegistration(event) {
    event.preventDefault();
    
    const name = document.getElementById('regName').value.trim();
    const email = document.getElementById('regEmail').value.trim();
    const password = document.getElementById('regPassword').value;
    const passwordConfirm = document.getElementById('regPasswordConfirm').value;
    
    // Validation
    if (password !== passwordConfirm) {
        if (typeof showToast === 'function') showToast('Passwords do not match', 'error');
        return;
    }
    
    if (password.length < 6) {
        if (typeof showToast === 'function') showToast('Password must be at least 6 characters', 'error');
        return;
    }
    
    // Check if email exists - use window.users
    const users = window.users || [];
    if (users.find(u => u.email.toLowerCase() === email.toLowerCase())) {
        if (typeof showToast === 'function') showToast('Email already registered. Please login instead.', 'error');
        return;
    }
    
    // Create a unique tenant for this user (isolated business data)
    const tenantId = 'tenant_' + Date.now();
    
    // Create personal user
    const newUser = {
        id: 'user_' + Date.now(),
        email: email,
        password: password, // Will be hashed by auth module if available
        name: name,
        role: 'personal',
        plan: 'personal',
        status: 'active',
        permissions: ['dashboard', 'transactions', 'income', 'expenses', 'reports', 'taxes', 'balance-sheet', 'monthly-reports', 'ai-chatbot', 'bills'],
        tenantId: tenantId,
        createdAt: new Date().toISOString(),
        registeredVia: 'free_signup'
    };
    
    // Add to users array
    users.push(newUser);
    window.users = users;
    
    // Save users
    if (typeof window.saveUsers === 'function') {
        window.saveUsers();
    } else {
        localStorage.setItem('ezcubic_users', JSON.stringify(users));
    }
    
    // Initialize empty tenant data for this user
    if (typeof window.initializeEmptyTenantData === 'function') {
        window.initializeEmptyTenantData(tenantId, name);
    }
    
    // Auto-login
    window.currentUser = newUser;
    localStorage.setItem('ezcubic_current_user', JSON.stringify(newUser));
    
    closeFreeRegisterModal();
    
    // Hide login page after registration
    if (typeof hideLoginPage === 'function') {
        hideLoginPage();
    }
    
    // Remove guest mode
    isGuestMode = false;
    removeViewOnlyMode();
    
    // Load the user's empty tenant data
    if (typeof window.loadCurrentTenantData === 'function') {
        window.loadCurrentTenantData();
    } else if (typeof window.resetToEmptyData === 'function') {
        window.resetToEmptyData();
    }
    
    // Update UI
    if (typeof updateAuthUI === 'function') {
        updateAuthUI();
    }
    
    if (typeof showToast === 'function') {
        showToast(`Welcome ${name}! Your free account is ready with a fresh start.`, 'success');
    }
    
    // Show dashboard
    if (typeof showSection === 'function') {
        showSection('dashboard');
    }
    
    // Refresh dashboard to show empty state
    if (typeof updateDashboard === 'function') {
        updateDashboard();
    }
}

// Expose to window
window.handleFreeRegistration = handleFreeRegistration;

// ==================== GUEST ACCESS CONTROL ====================

/**
 * Check if guest can access a section
 * Prompts for registration if in guest mode
 * @param {string} sectionId - The section being accessed
 * @returns {boolean} - True if access allowed
 */
function checkGuestAccess(sectionId) {
    if (!window.currentUser && isGuestMode) {
        // Allow viewing but prompt on interaction
        showFreeRegistrationModal();
        return false;
    }
    return true;
}

// Expose to window
window.checkGuestAccess = checkGuestAccess;

// ==================== MODULE INFO ====================

console.log('✅ Guest module loaded (v1.0.0)');
console.log('   Functions: applyGuestPreviewMode, applyViewOnlyMode, removeViewOnlyMode,');
console.log('              showGuestBadge, showFreeRegistrationModal, closeFreeRegisterModal,');
console.log('              handleFreeRegistration, checkGuestAccess');
