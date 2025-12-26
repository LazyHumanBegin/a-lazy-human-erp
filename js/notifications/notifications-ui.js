/**
 * NOTIFICATIONS-UI.JS
 * Notification & Alert System - UI Rendering
 * Handles notification panel, badges, and user interactions
 * Version: 2.3.3 - 26 Dec 2025
 */

// ==================== EXPORTS ====================
window.renderNotifications = renderNotifications;
window.updateNotificationBadge = updateNotificationBadge;
window.toggleNotificationPanel = toggleNotificationPanel;
window.closeNotificationPanel = closeNotificationPanel;
window.handleNotificationClick = handleNotificationClick;
window.openNotificationSettings = openNotificationSettings;
window.saveNotificationSettings = saveNotificationSettingsUI;

// ==================== UI RENDERING ====================
function renderNotifications() {
    const container = document.getElementById('notificationsList');
    if (!container) return;
    
    const notifications = window.NotificationSystem ? window.NotificationSystem.getNotifications() : [];
    const activeNotifications = notifications.filter(n => !n.dismissed);
    
    if (activeNotifications.length === 0) {
        container.innerHTML = `
            <div class="notification-empty">
                <i class="fas fa-bell-slash"></i>
                <p>No notifications</p>
                <small>You're all caught up!</small>
            </div>
        `;
        return;
    }
    
    container.innerHTML = activeNotifications.map(notification => `
        <div class="notification-item ${notification.read ? 'read' : 'unread'} ${notification.type}" 
             onclick="handleNotificationClick('${notification.id}', '${notification.link || ''}')">
            <div class="notification-icon ${notification.type}">
                <i class="fas ${notification.icon || 'fa-bell'}"></i>
            </div>
            <div class="notification-content">
                <div class="notification-title">${notification.title}</div>
                <div class="notification-message">${notification.message}</div>
                <div class="notification-time">${formatNotificationTime(notification.createdAt)}</div>
            </div>
            <button class="notification-dismiss" onclick="event.stopPropagation(); dismissSingleNotification('${notification.id}')" title="Dismiss">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `).join('');
}

function formatNotificationTime(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString('en-MY', { day: 'numeric', month: 'short' });
}

function updateNotificationBadge() {
    const badge = document.getElementById('notificationBadge');
    if (!badge) return;
    
    const count = window.NotificationSystem ? window.NotificationSystem.getUnreadCount() : 0;
    
    if (count > 0) {
        badge.textContent = count > 99 ? '99+' : count;
        badge.style.display = 'flex';
    } else {
        badge.style.display = 'none';
    }
}

// ==================== PANEL CONTROLS ====================
function toggleNotificationPanel() {
    const panel = document.getElementById('notificationPanel');
    if (!panel) return;
    
    const isOpen = panel.classList.contains('open');
    
    if (isOpen) {
        closeNotificationPanel();
    } else {
        panel.classList.add('open');
        renderNotifications();
        
        // Close when clicking outside
        setTimeout(() => {
            document.addEventListener('click', closeOnOutsideClick);
        }, 100);
    }
}

function closeNotificationPanel() {
    const panel = document.getElementById('notificationPanel');
    if (panel) {
        panel.classList.remove('open');
    }
    document.removeEventListener('click', closeOnOutsideClick);
}

function closeOnOutsideClick(e) {
    const panel = document.getElementById('notificationPanel');
    const bell = document.getElementById('notificationBell');
    
    if (panel && !panel.contains(e.target) && bell && !bell.contains(e.target)) {
        closeNotificationPanel();
    }
}

// ==================== USER ACTIONS ====================
function handleNotificationClick(notificationId, link) {
    // Mark as read
    if (window.NotificationSystem) {
        window.NotificationSystem.markAsRead(notificationId);
    }
    
    // Navigate to section if link provided
    if (link && typeof showSection === 'function') {
        closeNotificationPanel();
        showSection(link);
    }
    
    renderNotifications();
}

window.dismissSingleNotification = function(notificationId) {
    if (window.NotificationSystem) {
        window.NotificationSystem.dismiss(notificationId);
    }
};

window.markAllNotificationsRead = function() {
    if (window.NotificationSystem) {
        window.NotificationSystem.markAllAsRead();
        renderNotifications();
    }
};

window.clearAllNotifications = function() {
    if (confirm('Clear all notifications?')) {
        if (window.NotificationSystem) {
            window.NotificationSystem.dismissAll();
        }
    }
};

window.refreshNotificationsUI = function() {
    if (window.NotificationSystem) {
        window.NotificationSystem.refresh();
    }
};

// ==================== SETTINGS MODAL ====================
function openNotificationSettings() {
    const settings = window.NotificationSystem ? window.NotificationSystem.getSettings() : {};
    
    const modalHTML = `
        <div class="modal-overlay" id="notificationSettingsModal" onclick="if(event.target === this) closeNotificationSettingsModal()">
            <div class="modal-content" style="max-width: 500px;">
                <div class="modal-header">
                    <h3><i class="fas fa-cog"></i> Notification Settings</h3>
                    <button class="modal-close" onclick="closeNotificationSettingsModal()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <div class="notification-settings-form">
                        <div class="setting-group">
                            <label class="setting-toggle">
                                <input type="checkbox" id="settingLowStock" ${settings.lowStockEnabled ? 'checked' : ''}>
                                <span class="toggle-slider"></span>
                                <span class="toggle-label">
                                    <i class="fas fa-box"></i> Low Stock Alerts
                                </span>
                            </label>
                            <div class="setting-detail">
                                <label>Default threshold (if not set per item)</label>
                                <input type="number" id="settingLowStockThreshold" value="${settings.lowStockThreshold || 10}" min="1" class="form-control" style="width: 100px;">
                            </div>
                        </div>
                        
                        <div class="setting-group">
                            <label class="setting-toggle">
                                <input type="checkbox" id="settingOverdueInvoices" ${settings.overdueInvoicesEnabled ? 'checked' : ''}>
                                <span class="toggle-slider"></span>
                                <span class="toggle-label">
                                    <i class="fas fa-file-invoice-dollar"></i> Overdue Invoice Alerts
                                </span>
                            </label>
                        </div>
                        
                        <div class="setting-group">
                            <label class="setting-toggle">
                                <input type="checkbox" id="settingPayroll" ${settings.payrollReminderEnabled ? 'checked' : ''}>
                                <span class="toggle-slider"></span>
                                <span class="toggle-label">
                                    <i class="fas fa-money-check-alt"></i> Payroll Reminders
                                </span>
                            </label>
                            <div class="setting-detail">
                                <label>Days before payroll date</label>
                                <input type="number" id="settingPayrollDays" value="${settings.payrollDaysBefore || 3}" min="1" max="7" class="form-control" style="width: 100px;">
                            </div>
                        </div>
                        
                        <div class="setting-group">
                            <label class="setting-toggle">
                                <input type="checkbox" id="settingExpiring" ${settings.expiringItemsEnabled ? 'checked' : ''}>
                                <span class="toggle-slider"></span>
                                <span class="toggle-label">
                                    <i class="fas fa-calendar-times"></i> Expiring Items Alerts
                                </span>
                            </label>
                            <div class="setting-detail">
                                <label>Days before expiry</label>
                                <input type="number" id="settingExpiryDays" value="${settings.expiryDaysBefore || 30}" min="1" max="90" class="form-control" style="width: 100px;">
                            </div>
                        </div>
                        
                        <div class="setting-group">
                            <label class="setting-toggle">
                                <input type="checkbox" id="settingQuotations" ${settings.quotationExpiryEnabled ? 'checked' : ''}>
                                <span class="toggle-slider"></span>
                                <span class="toggle-label">
                                    <i class="fas fa-file-alt"></i> Quotation Expiry Alerts
                                </span>
                            </label>
                        </div>
                        
                        <div class="setting-group">
                            <label class="setting-toggle">
                                <input type="checkbox" id="settingProjects" ${settings.projectDeadlineEnabled ? 'checked' : ''}>
                                <span class="toggle-slider"></span>
                                <span class="toggle-label">
                                    <i class="fas fa-project-diagram"></i> Project Deadline Alerts
                                </span>
                            </label>
                            <div class="setting-detail">
                                <label>Days before deadline</label>
                                <input type="number" id="settingProjectDays" value="${settings.projectDaysBefore || 7}" min="1" max="30" class="form-control" style="width: 100px;">
                            </div>
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn-secondary" onclick="closeNotificationSettingsModal()">Cancel</button>
                    <button class="btn-primary" onclick="saveNotificationSettingsUI()">
                        <i class="fas fa-save"></i> Save Settings
                    </button>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

window.closeNotificationSettingsModal = function() {
    const modal = document.getElementById('notificationSettingsModal');
    if (modal) {
        modal.remove();
    }
};

function saveNotificationSettingsUI() {
    const newSettings = {
        lowStockEnabled: document.getElementById('settingLowStock').checked,
        lowStockThreshold: parseInt(document.getElementById('settingLowStockThreshold').value) || 10,
        overdueInvoicesEnabled: document.getElementById('settingOverdueInvoices').checked,
        payrollReminderEnabled: document.getElementById('settingPayroll').checked,
        payrollDaysBefore: parseInt(document.getElementById('settingPayrollDays').value) || 3,
        expiringItemsEnabled: document.getElementById('settingExpiring').checked,
        expiryDaysBefore: parseInt(document.getElementById('settingExpiryDays').value) || 30,
        quotationExpiryEnabled: document.getElementById('settingQuotations').checked,
        projectDeadlineEnabled: document.getElementById('settingProjects').checked,
        projectDaysBefore: parseInt(document.getElementById('settingProjectDays').value) || 7
    };
    
    if (window.NotificationSystem) {
        window.NotificationSystem.updateSettings(newSettings);
    }
    
    closeNotificationSettingsModal();
    
    if (typeof showToast === 'function') {
        showToast('Notification settings saved!', 'success');
    }
}

// ==================== CSS STYLES ====================
function injectNotificationStyles() {
    if (document.getElementById('notification-styles')) return;
    
    const styles = document.createElement('style');
    styles.id = 'notification-styles';
    styles.textContent = `
        /* Notification Bell */
        .notification-bell-wrapper {
            position: relative;
            display: inline-flex;
            align-items: center;
        }
        
        .notification-bell {
            background: none;
            border: none;
            color: #94a3b8;
            font-size: 20px;
            cursor: pointer;
            padding: 8px;
            border-radius: 8px;
            transition: all 0.2s;
            position: relative;
        }
        
        .notification-bell:hover {
            color: #f59e0b;
            background: rgba(245, 158, 11, 0.1);
        }
        
        .notification-badge {
            position: absolute;
            top: 2px;
            right: 2px;
            background: #ef4444;
            color: white;
            font-size: 10px;
            font-weight: 600;
            min-width: 18px;
            height: 18px;
            border-radius: 9px;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 0 4px;
            animation: pulse 2s infinite;
        }
        
        @keyframes pulse {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.1); }
        }
        
        /* Notification Panel */
        .notification-panel {
            position: absolute;
            top: 100%;
            right: 0;
            width: 380px;
            max-height: 500px;
            background: #1e293b;
            border-radius: 12px;
            box-shadow: 0 10px 40px rgba(0,0,0,0.4);
            border: 1px solid #334155;
            display: none;
            z-index: 1000;
            overflow: hidden;
        }
        
        .notification-panel.open {
            display: block;
            animation: slideDown 0.2s ease;
        }
        
        @keyframes slideDown {
            from { opacity: 0; transform: translateY(-10px); }
            to { opacity: 1; transform: translateY(0); }
        }
        
        .notification-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 15px;
            border-bottom: 1px solid #334155;
            background: #0f172a;
        }
        
        .notification-header h4 {
            margin: 0;
            color: white;
            font-size: 14px;
        }
        
        .notification-header-actions {
            display: flex;
            gap: 8px;
        }
        
        .notification-header-actions button {
            background: none;
            border: none;
            color: #94a3b8;
            font-size: 12px;
            cursor: pointer;
            padding: 4px 8px;
            border-radius: 4px;
        }
        
        .notification-header-actions button:hover {
            background: rgba(255,255,255,0.1);
            color: white;
        }
        
        /* Notification List */
        .notifications-list {
            max-height: 400px;
            overflow-y: auto;
        }
        
        .notification-item {
            display: flex;
            padding: 12px 15px;
            border-bottom: 1px solid #334155;
            cursor: pointer;
            transition: all 0.2s;
            position: relative;
        }
        
        .notification-item:hover {
            background: rgba(255,255,255,0.05);
        }
        
        .notification-item.unread {
            background: rgba(59, 130, 246, 0.1);
            border-left: 3px solid #3b82f6;
        }
        
        .notification-item.read {
            opacity: 0.7;
        }
        
        .notification-icon {
            width: 36px;
            height: 36px;
            border-radius: 8px;
            display: flex;
            align-items: center;
            justify-content: center;
            margin-right: 12px;
            flex-shrink: 0;
        }
        
        .notification-icon.danger {
            background: rgba(239, 68, 68, 0.2);
            color: #ef4444;
        }
        
        .notification-icon.warning {
            background: rgba(245, 158, 11, 0.2);
            color: #f59e0b;
        }
        
        .notification-icon.info {
            background: rgba(59, 130, 246, 0.2);
            color: #3b82f6;
        }
        
        .notification-icon.success {
            background: rgba(34, 197, 94, 0.2);
            color: #22c55e;
        }
        
        .notification-content {
            flex: 1;
            min-width: 0;
        }
        
        .notification-title {
            font-weight: 600;
            color: white;
            font-size: 13px;
            margin-bottom: 2px;
        }
        
        .notification-message {
            color: #94a3b8;
            font-size: 12px;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }
        
        .notification-time {
            color: #64748b;
            font-size: 11px;
            margin-top: 4px;
        }
        
        .notification-dismiss {
            position: absolute;
            top: 8px;
            right: 8px;
            background: none;
            border: none;
            color: #64748b;
            cursor: pointer;
            padding: 4px;
            border-radius: 4px;
            opacity: 0;
            transition: all 0.2s;
        }
        
        .notification-item:hover .notification-dismiss {
            opacity: 1;
        }
        
        .notification-dismiss:hover {
            background: rgba(239, 68, 68, 0.2);
            color: #ef4444;
        }
        
        /* Empty State */
        .notification-empty {
            padding: 40px 20px;
            text-align: center;
            color: #64748b;
        }
        
        .notification-empty i {
            font-size: 48px;
            margin-bottom: 15px;
            opacity: 0.3;
        }
        
        .notification-empty p {
            margin: 0 0 5px 0;
            color: #94a3b8;
        }
        
        .notification-empty small {
            font-size: 12px;
        }
        
        /* Settings Styles */
        .notification-settings-form {
            display: flex;
            flex-direction: column;
            gap: 15px;
        }
        
        .setting-group {
            background: #0f172a;
            border-radius: 8px;
            padding: 12px;
        }
        
        .setting-toggle {
            display: flex;
            align-items: center;
            gap: 10px;
            cursor: pointer;
        }
        
        .setting-toggle input[type="checkbox"] {
            display: none;
        }
        
        .toggle-slider {
            width: 40px;
            height: 22px;
            background: #475569;
            border-radius: 11px;
            position: relative;
            transition: all 0.3s;
        }
        
        .toggle-slider::after {
            content: '';
            position: absolute;
            width: 18px;
            height: 18px;
            background: white;
            border-radius: 50%;
            top: 2px;
            left: 2px;
            transition: all 0.3s;
        }
        
        .setting-toggle input:checked + .toggle-slider {
            background: #22c55e;
        }
        
        .setting-toggle input:checked + .toggle-slider::after {
            left: 20px;
        }
        
        .toggle-label {
            color: white;
            font-size: 14px;
        }
        
        .toggle-label i {
            margin-right: 8px;
            color: #94a3b8;
        }
        
        .setting-detail {
            margin-top: 10px;
            padding-left: 50px;
            display: flex;
            align-items: center;
            gap: 10px;
        }
        
        .setting-detail label {
            color: #94a3b8;
            font-size: 12px;
        }
        
        .setting-detail input {
            background: #1e293b;
            border: 1px solid #334155;
            color: white;
            padding: 6px 10px;
            border-radius: 6px;
        }
        
        /* Responsive */
        @media (max-width: 480px) {
            .notification-panel {
                width: calc(100vw - 20px);
                right: -10px;
            }
        }
    `;
    
    document.head.appendChild(styles);
}

// Initialize styles on load
document.addEventListener('DOMContentLoaded', injectNotificationStyles);

console.log('📢 Notifications UI loaded');
