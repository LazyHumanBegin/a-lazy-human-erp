/**
 * EZCubic - Notifications System
 * In-app notifications for alerts, reminders, and updates
 * Version: 1.0.0 - 26 Dec 2025
 */

// ==================== STORAGE ====================
const NOTIFICATIONS_KEY = 'ezcubic_notifications';
const NOTIFICATION_SETTINGS_KEY = 'ezcubic_notification_settings';

// ==================== DATA ====================
let notifications = [];
let notificationSettings = {
    enabled: true,
    sound: true,
    desktop: false,
    lowStockAlert: true,
    billDueAlert: true,
    invoiceDueAlert: true,
    salesAlert: true,
    systemAlert: true
};

// ==================== NOTIFICATION TYPES ====================
const NOTIFICATION_TYPES = {
    low_stock: { icon: 'fa-boxes', color: '#f59e0b', title: 'Low Stock Alert' },
    bill_due: { icon: 'fa-file-invoice', color: '#ef4444', title: 'Bill Due' },
    bill_overdue: { icon: 'fa-exclamation-triangle', color: '#dc2626', title: 'Bill Overdue' },
    invoice_due: { icon: 'fa-file-invoice-dollar', color: '#f59e0b', title: 'Invoice Due' },
    invoice_paid: { icon: 'fa-check-circle', color: '#10b981', title: 'Invoice Paid' },
    sale_completed: { icon: 'fa-shopping-cart', color: '#10b981', title: 'Sale Completed' },
    order_received: { icon: 'fa-truck', color: '#3b82f6', title: 'Order Received' },
    system: { icon: 'fa-info-circle', color: '#6366f1', title: 'System' },
    reminder: { icon: 'fa-bell', color: '#8b5cf6', title: 'Reminder' },
    success: { icon: 'fa-check-circle', color: '#10b981', title: 'Success' },
    warning: { icon: 'fa-exclamation-triangle', color: '#f59e0b', title: 'Warning' },
    error: { icon: 'fa-times-circle', color: '#ef4444', title: 'Error' }
};

// ==================== INITIALIZATION ====================
function initializeNotifications() {
    loadNotifications();
    loadNotificationSettings();
    renderNotificationBell();
    checkAutomaticAlerts();
    
    // Check alerts periodically (every 5 minutes)
    setInterval(checkAutomaticAlerts, 5 * 60 * 1000);
    
    console.log('✅ Notifications system initialized');
}

function loadNotifications() {
    try {
        const stored = localStorage.getItem(NOTIFICATIONS_KEY);
        if (stored) {
            notifications = JSON.parse(stored);
        }
    } catch (e) {
        console.error('Error loading notifications:', e);
        notifications = [];
    }
}

function saveNotifications() {
    try {
        localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(notifications));
    } catch (e) {
        console.error('Error saving notifications:', e);
    }
}

function loadNotificationSettings() {
    try {
        const stored = localStorage.getItem(NOTIFICATION_SETTINGS_KEY);
        if (stored) {
            notificationSettings = { ...notificationSettings, ...JSON.parse(stored) };
        }
    } catch (e) {
        console.error('Error loading notification settings:', e);
    }
}

function saveNotificationSettings() {
    try {
        localStorage.setItem(NOTIFICATION_SETTINGS_KEY, JSON.stringify(notificationSettings));
    } catch (e) {
        console.error('Error saving notification settings:', e);
    }
}

// ==================== CREATE NOTIFICATION ====================
function createNotification(type, message, data = {}) {
    if (!notificationSettings.enabled) return null;
    
    const typeConfig = NOTIFICATION_TYPES[type] || NOTIFICATION_TYPES.system;
    
    const notification = {
        id: 'notif_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
        type: type,
        title: data.title || typeConfig.title,
        message: message,
        icon: typeConfig.icon,
        color: typeConfig.color,
        read: false,
        createdAt: new Date().toISOString(),
        data: data
    };
    
    notifications.unshift(notification);
    
    // Keep only last 100 notifications
    if (notifications.length > 100) {
        notifications = notifications.slice(0, 100);
    }
    
    saveNotifications();
    updateNotificationBell();
    
    // Play sound if enabled
    if (notificationSettings.sound) {
        playNotificationSound();
    }
    
    // Show desktop notification if enabled
    if (notificationSettings.desktop && Notification.permission === 'granted') {
        showDesktopNotification(notification);
    }
    
    return notification;
}

// ==================== NOTIFICATION BELL UI ====================
function renderNotificationBell() {
    // Find or create notification bell container in header
    let bellContainer = document.getElementById('notificationBellContainer');
    
    if (!bellContainer) {
        // Find the top bar actions area (main header)
        const topBarActions = document.querySelector('.top-bar-actions');
        if (topBarActions) {
            bellContainer = document.createElement('div');
            bellContainer.id = 'notificationBellContainer';
            bellContainer.className = 'notification-bell-container';
            bellContainer.style.cssText = 'position: relative; display: inline-flex;';
            bellContainer.innerHTML = `
                <button class="btn-icon notification-bell" onclick="toggleNotificationPanel()" title="Notifications">
                    <i class="fas fa-bell"></i>
                    <span class="notification-badge" id="notificationBadge" style="display: none;">0</span>
                </button>
            `;
            // Insert after dark mode toggle (3rd position)
            const darkModeBtn = topBarActions.querySelector('[onclick*="toggleDarkMode"]');
            if (darkModeBtn && darkModeBtn.nextSibling) {
                topBarActions.insertBefore(bellContainer, darkModeBtn.nextSibling);
            } else {
                // Fallback: insert at the beginning
                topBarActions.insertBefore(bellContainer, topBarActions.firstChild);
            }
            console.log('✅ Notification bell added to header');
        } else {
            console.warn('⚠️ Could not find .top-bar-actions for notification bell');
        }
    }
    
    updateNotificationBell();
}

function updateNotificationBell() {
    const badge = document.getElementById('notificationBadge');
    if (!badge) return;
    
    const unreadCount = notifications.filter(n => !n.read).length;
    
    if (unreadCount > 0) {
        badge.textContent = unreadCount > 99 ? '99+' : unreadCount;
        badge.style.display = 'flex';
    } else {
        badge.style.display = 'none';
    }
}

function toggleNotificationPanel() {
    let panel = document.getElementById('notificationPanel');
    
    if (panel) {
        panel.remove();
        return;
    }
    
    // Create panel
    panel = document.createElement('div');
    panel.id = 'notificationPanel';
    panel.className = 'notification-panel';
    panel.innerHTML = `
        <div class="notification-panel-header">
            <h3><i class="fas fa-bell"></i> Notifications</h3>
            <div class="notification-panel-actions">
                <button onclick="markAllNotificationsRead()" class="btn-text" title="Mark all as read">
                    <i class="fas fa-check-double"></i>
                </button>
                <button onclick="clearAllNotifications()" class="btn-text" title="Clear all">
                    <i class="fas fa-trash"></i>
                </button>
                <button onclick="toggleNotificationPanel()" class="btn-text">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        </div>
        <div class="notification-panel-body" id="notificationList">
            ${renderNotificationList()}
        </div>
        <div class="notification-panel-footer">
            <button onclick="showNotificationSettings()" class="btn-text">
                <i class="fas fa-cog"></i> Settings
            </button>
        </div>
    `;
    
    document.body.appendChild(panel);
    
    // Close when clicking outside
    setTimeout(() => {
        document.addEventListener('click', closeNotificationPanelOnOutsideClick);
    }, 100);
}

function closeNotificationPanelOnOutsideClick(e) {
    const panel = document.getElementById('notificationPanel');
    const bell = document.querySelector('.notification-bell');
    
    if (panel && !panel.contains(e.target) && !bell.contains(e.target)) {
        panel.remove();
        document.removeEventListener('click', closeNotificationPanelOnOutsideClick);
    }
}

function renderNotificationList() {
    if (notifications.length === 0) {
        return `
            <div class="notification-empty">
                <i class="fas fa-bell-slash"></i>
                <p>No notifications</p>
            </div>
        `;
    }
    
    return notifications.slice(0, 50).map(notif => `
        <div class="notification-item ${notif.read ? 'read' : 'unread'}" onclick="handleNotificationClick('${notif.id}')">
            <div class="notification-icon" style="background: ${notif.color}20; color: ${notif.color}">
                <i class="fas ${notif.icon}"></i>
            </div>
            <div class="notification-content">
                <div class="notification-title">${escapeHtml(notif.title)}</div>
                <div class="notification-message">${escapeHtml(notif.message)}</div>
                <div class="notification-time">${formatTimeAgo(notif.createdAt)}</div>
            </div>
            <button class="notification-dismiss" onclick="event.stopPropagation(); dismissNotification('${notif.id}')" title="Dismiss">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `).join('');
}

function handleNotificationClick(notifId) {
    const notif = notifications.find(n => n.id === notifId);
    if (!notif) return;
    
    // Mark as read
    notif.read = true;
    saveNotifications();
    updateNotificationBell();
    
    // Navigate based on type
    if (notif.data && notif.data.link) {
        toggleNotificationPanel();
        if (typeof showSection === 'function') {
            showSection(notif.data.link);
        }
    }
    
    // Refresh list
    const list = document.getElementById('notificationList');
    if (list) {
        list.innerHTML = renderNotificationList();
    }
}

function dismissNotification(notifId) {
    notifications = notifications.filter(n => n.id !== notifId);
    saveNotifications();
    updateNotificationBell();
    
    const list = document.getElementById('notificationList');
    if (list) {
        list.innerHTML = renderNotificationList();
    }
}

function markAllNotificationsRead() {
    notifications.forEach(n => n.read = true);
    saveNotifications();
    updateNotificationBell();
    
    const list = document.getElementById('notificationList');
    if (list) {
        list.innerHTML = renderNotificationList();
    }
}

function clearAllNotifications() {
    if (confirm('Clear all notifications?')) {
        notifications = [];
        saveNotifications();
        updateNotificationBell();
        
        const list = document.getElementById('notificationList');
        if (list) {
            list.innerHTML = renderNotificationList();
        }
    }
}

// ==================== AUTOMATIC ALERTS ====================
function checkAutomaticAlerts() {
    if (!notificationSettings.enabled) return;
    
    checkLowStockAlerts();
    checkBillDueAlerts();
    checkInvoiceDueAlerts();
}

function checkLowStockAlerts() {
    if (!notificationSettings.lowStockAlert) return;
    
    const products = window.products || [];
    const lowStockProducts = products.filter(p => p.stock <= (p.minStock || 5) && p.stock > 0);
    const outOfStockProducts = products.filter(p => p.stock <= 0);
    
    // Check if we already notified today
    const today = new Date().toDateString();
    const lastCheck = localStorage.getItem('ezcubic_last_stock_check');
    
    if (lastCheck === today) return;
    localStorage.setItem('ezcubic_last_stock_check', today);
    
    if (outOfStockProducts.length > 0) {
        createNotification('low_stock', 
            `${outOfStockProducts.length} product(s) are out of stock!`,
            { link: 'inventory', count: outOfStockProducts.length }
        );
    }
    
    if (lowStockProducts.length > 0) {
        createNotification('low_stock',
            `${lowStockProducts.length} product(s) running low on stock`,
            { link: 'inventory', count: lowStockProducts.length }
        );
    }
}

function checkBillDueAlerts() {
    if (!notificationSettings.billDueAlert) return;
    
    const bills = window.businessData?.bills || [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const lastCheck = localStorage.getItem('ezcubic_last_bill_check');
    const todayStr = today.toDateString();
    if (lastCheck === todayStr) return;
    localStorage.setItem('ezcubic_last_bill_check', todayStr);
    
    const dueSoon = bills.filter(b => {
        if (b.status === 'paid') return false;
        const dueDate = new Date(b.dueDate);
        dueDate.setHours(0, 0, 0, 0);
        const daysUntilDue = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));
        return daysUntilDue >= 0 && daysUntilDue <= 7;
    });
    
    const overdue = bills.filter(b => {
        if (b.status === 'paid') return false;
        const dueDate = new Date(b.dueDate);
        dueDate.setHours(0, 0, 0, 0);
        return dueDate < today;
    });
    
    if (overdue.length > 0) {
        createNotification('bill_overdue',
            `${overdue.length} bill(s) are overdue!`,
            { link: 'bills', count: overdue.length }
        );
    }
    
    if (dueSoon.length > 0) {
        createNotification('bill_due',
            `${dueSoon.length} bill(s) due within 7 days`,
            { link: 'bills', count: dueSoon.length }
        );
    }
}

function checkInvoiceDueAlerts() {
    if (!notificationSettings.invoiceDueAlert) return;
    // Similar logic for invoices - implement based on your invoice structure
}

// ==================== NOTIFICATION SETTINGS ====================
function showNotificationSettings() {
    toggleNotificationPanel(); // Close the panel first
    
    const modalHTML = `
        <div class="modal show" id="notificationSettingsModal" style="z-index: 10001;">
            <div class="modal-content" style="max-width: 450px;">
                <div class="modal-header">
                    <h3><i class="fas fa-bell"></i> Notification Settings</h3>
                    <button class="modal-close" onclick="closeModal('notificationSettingsModal')">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="form-group">
                        <label class="toggle-label">
                            <input type="checkbox" id="notifEnabled" ${notificationSettings.enabled ? 'checked' : ''} onchange="updateNotificationSetting('enabled', this.checked)">
                            <span>Enable Notifications</span>
                        </label>
                    </div>
                    <div class="form-group">
                        <label class="toggle-label">
                            <input type="checkbox" id="notifSound" ${notificationSettings.sound ? 'checked' : ''} onchange="updateNotificationSetting('sound', this.checked)">
                            <span>Play Sound</span>
                        </label>
                    </div>
                    <div class="form-group">
                        <label class="toggle-label">
                            <input type="checkbox" id="notifDesktop" ${notificationSettings.desktop ? 'checked' : ''} onchange="requestDesktopPermission(this)">
                            <span>Desktop Notifications</span>
                        </label>
                    </div>
                    
                    <h4 style="margin-top: 20px; margin-bottom: 10px;">Alert Types</h4>
                    <div class="form-group">
                        <label class="toggle-label">
                            <input type="checkbox" ${notificationSettings.lowStockAlert ? 'checked' : ''} onchange="updateNotificationSetting('lowStockAlert', this.checked)">
                            <span>Low Stock Alerts</span>
                        </label>
                    </div>
                    <div class="form-group">
                        <label class="toggle-label">
                            <input type="checkbox" ${notificationSettings.billDueAlert ? 'checked' : ''} onchange="updateNotificationSetting('billDueAlert', this.checked)">
                            <span>Bill Due Alerts</span>
                        </label>
                    </div>
                    <div class="form-group">
                        <label class="toggle-label">
                            <input type="checkbox" ${notificationSettings.salesAlert ? 'checked' : ''} onchange="updateNotificationSetting('salesAlert', this.checked)">
                            <span>Sales Alerts</span>
                        </label>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn-primary" onclick="closeModal('notificationSettingsModal')">Done</button>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

function updateNotificationSetting(key, value) {
    notificationSettings[key] = value;
    saveNotificationSettings();
}

function requestDesktopPermission(checkbox) {
    if (checkbox.checked) {
        if (Notification.permission === 'granted') {
            updateNotificationSetting('desktop', true);
        } else if (Notification.permission !== 'denied') {
            Notification.requestPermission().then(permission => {
                if (permission === 'granted') {
                    updateNotificationSetting('desktop', true);
                } else {
                    checkbox.checked = false;
                    showToast('Desktop notifications denied', 'warning');
                }
            });
        } else {
            checkbox.checked = false;
            showToast('Desktop notifications blocked. Enable in browser settings.', 'warning');
        }
    } else {
        updateNotificationSetting('desktop', false);
    }
}

// ==================== HELPERS ====================
function playNotificationSound() {
    try {
        const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdH2Onp6bl4+HesXx/ebm8v7zt7WPgHh6hI+epKamoZuSiYN+fYGIkZylq6+qpJyUjoiDgIKHj5ikrLCvrKaelY6IhIKEipGaorCytLGsp5+XjoiEgoSKkpqirK+wsa6poJmQiISChIqTm6OssbKxr6mhmJCJhYSEipObo6yvsLGvq6SclY6IhYSEipKaoqyvsLCvrKWem5SMh4WEiJGZn6ivsbGwr6ynpJyWjYiFhIiQmKCosLGxsbGtqaKbl42JhYWIkJigorCxsbKyraqlnpiPi4eFiJCZoKixs7OzsrCqpZ6YkIuHhoiQmaCosrS0tLKxrKeinpiQjIiGiJCZoKiytLS0s7KuqqOem5KNiYeIkJmgqLK0tLW0sq+spaCYk46KiIiQmaCpsrW1tbSzsq+rpKCbk4+LiYmQmaGqsrW1trW0s7GsqKGdlpGMiomQmaGqsrW2trW1s7KuqqOgnJaRjYqKkZqhqrO2t7a1tLOyr6qkn5yXkY2LipGaoaq0tre3trW0s7CsqKKfm5aPjIuLkpuiq7S3uLe3trSzsq6qpKCclpGOjIuTm6KrtLi4uLe3tbS0sKypo5+blZGOjI2TnKOstbi5ube3tbS0sa2ppKCbl5KPjY2Um6Oss7m5ure3tre1s7Ctqaahnpn/');
        audio.volume = 0.3;
        audio.play().catch(() => {}); // Ignore autoplay errors
    } catch (e) {}
}

function showDesktopNotification(notif) {
    try {
        new Notification(notif.title, {
            body: notif.message,
            icon: '/images/icon-192.png'
        });
    } catch (e) {}
}

function formatTimeAgo(dateStr) {
    const date = new Date(dateStr);
    const now = new Date();
    const seconds = Math.floor((now - date) / 1000);
    
    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
    return date.toLocaleDateString();
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ==================== WINDOW EXPORTS ====================
window.initializeNotifications = initializeNotifications;
window.createNotification = createNotification;
window.toggleNotificationPanel = toggleNotificationPanel;
window.markAllNotificationsRead = markAllNotificationsRead;
window.clearAllNotifications = clearAllNotifications;
window.dismissNotification = dismissNotification;
window.showNotificationSettings = showNotificationSettings;
window.updateNotificationSetting = updateNotificationSetting;
window.requestDesktopPermission = requestDesktopPermission;
window.checkAutomaticAlerts = checkAutomaticAlerts;

console.log('✅ Notifications module loaded');
