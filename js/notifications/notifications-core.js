/**
 * NOTIFICATIONS-CORE.JS
 * Notification & Alert System - Core Logic
 * READ-ONLY: Checks data conditions, does NOT modify other modules
 * Version: 2.3.3 - 26 Dec 2025
 */

// ==================== CONSTANTS ====================
const NOTIFICATIONS_KEY = 'ezcubic_notifications';
const NOTIFICATION_SETTINGS_KEY = 'ezcubic_notification_settings';

// ==================== GLOBAL VARIABLES ====================
let notifications = [];
let notificationSettings = {
    lowStockEnabled: true,
    lowStockThreshold: 10, // Use item's minStock if available, else this default
    overdueInvoicesEnabled: true,
    overdueDays: 7,
    payrollReminderEnabled: true,
    payrollDaysBefore: 3,
    expiringItemsEnabled: true,
    expiryDaysBefore: 30,
    quotationExpiryEnabled: true,
    projectDeadlineEnabled: true,
    projectDaysBefore: 7
};

// ==================== EXPORTS ====================
window.NotificationSystem = {
    init: initNotifications,
    checkAll: checkAllNotifications,
    getNotifications: () => notifications,
    getUnreadCount: getUnreadCount,
    markAsRead: markNotificationAsRead,
    markAllAsRead: markAllNotificationsAsRead,
    dismiss: dismissNotification,
    dismissAll: dismissAllNotifications,
    getSettings: () => notificationSettings,
    updateSettings: updateNotificationSettings,
    refresh: refreshNotifications
};

// ==================== INITIALIZATION ====================
function initNotifications() {
    loadNotificationSettings();
    loadNotifications();
    
    // Initial check
    refreshNotifications();
    
    // Auto-refresh every 5 minutes
    setInterval(refreshNotifications, 5 * 60 * 1000);
    
    console.log('✅ Notification System initialized');
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

function updateNotificationSettings(newSettings) {
    notificationSettings = { ...notificationSettings, ...newSettings };
    saveNotificationSettings();
    refreshNotifications();
}

function loadNotifications() {
    try {
        const stored = localStorage.getItem(NOTIFICATIONS_KEY);
        if (stored) {
            notifications = JSON.parse(stored);
            // Clean old notifications (older than 30 days)
            const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
            notifications = notifications.filter(n => new Date(n.createdAt).getTime() > thirtyDaysAgo);
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

// ==================== MAIN CHECK FUNCTION ====================
function refreshNotifications() {
    checkAllNotifications();
    if (typeof window.renderNotifications === 'function') {
        window.renderNotifications();
    }
    if (typeof window.updateNotificationBadge === 'function') {
        window.updateNotificationBadge();
    }
}

function checkAllNotifications() {
    const newAlerts = [];
    
    // Check each category
    if (notificationSettings.lowStockEnabled) {
        newAlerts.push(...checkLowStock());
    }
    if (notificationSettings.overdueInvoicesEnabled) {
        newAlerts.push(...checkOverdueInvoices());
    }
    if (notificationSettings.payrollReminderEnabled) {
        newAlerts.push(...checkPayrollDue());
    }
    if (notificationSettings.expiringItemsEnabled) {
        newAlerts.push(...checkExpiringItems());
    }
    if (notificationSettings.quotationExpiryEnabled) {
        newAlerts.push(...checkExpiringQuotations());
    }
    if (notificationSettings.projectDeadlineEnabled) {
        newAlerts.push(...checkProjectDeadlines());
    }
    
    // Merge new alerts with existing (avoid duplicates)
    newAlerts.forEach(alert => {
        const exists = notifications.find(n => n.id === alert.id);
        if (!exists) {
            notifications.unshift(alert);
        }
    });
    
    // Sort by date (newest first)
    notifications.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    // Limit to 100 notifications
    if (notifications.length > 100) {
        notifications = notifications.slice(0, 100);
    }
    
    saveNotifications();
    return notifications;
}

// ==================== CHECK FUNCTIONS (READ-ONLY) ====================

// 1. Low Stock Alert
function checkLowStock() {
    const alerts = [];
    const items = window.inventoryItems || [];
    
    items.forEach(item => {
        const minStock = item.minStock || notificationSettings.lowStockThreshold;
        const currentQty = item.quantity || 0;
        
        if (currentQty <= minStock && currentQty > 0) {
            alerts.push({
                id: `low-stock-${item.id}-${new Date().toDateString()}`,
                type: 'warning',
                category: 'inventory',
                icon: 'fa-box',
                title: 'Low Stock Warning',
                message: `${item.name} is running low (${currentQty} remaining)`,
                link: 'inventory',
                linkText: 'View Inventory',
                createdAt: new Date().toISOString(),
                read: false,
                dismissed: false
            });
        } else if (currentQty === 0) {
            alerts.push({
                id: `out-of-stock-${item.id}-${new Date().toDateString()}`,
                type: 'danger',
                category: 'inventory',
                icon: 'fa-exclamation-triangle',
                title: 'Out of Stock!',
                message: `${item.name} is out of stock`,
                link: 'inventory',
                linkText: 'View Inventory',
                createdAt: new Date().toISOString(),
                read: false,
                dismissed: false
            });
        }
    });
    
    return alerts;
}

// 2. Overdue Invoices
function checkOverdueInvoices() {
    const alerts = [];
    const invoices = window.invoices || [];
    const today = new Date();
    
    invoices.forEach(invoice => {
        if (invoice.status === 'paid' || invoice.status === 'cancelled') return;
        
        const dueDate = new Date(invoice.dueDate);
        const daysDiff = Math.floor((today - dueDate) / (1000 * 60 * 60 * 24));
        
        if (daysDiff > 0) {
            alerts.push({
                id: `overdue-invoice-${invoice.id}-${new Date().toDateString()}`,
                type: 'danger',
                category: 'finance',
                icon: 'fa-file-invoice-dollar',
                title: 'Overdue Invoice',
                message: `Invoice #${invoice.invoiceNumber || invoice.id} is ${daysDiff} days overdue (RM ${(invoice.total || 0).toFixed(2)})`,
                link: 'invoices',
                linkText: 'View Invoices',
                createdAt: new Date().toISOString(),
                read: false,
                dismissed: false
            });
        } else if (daysDiff >= -3 && daysDiff <= 0) {
            // Due within 3 days
            alerts.push({
                id: `due-soon-invoice-${invoice.id}-${new Date().toDateString()}`,
                type: 'warning',
                category: 'finance',
                icon: 'fa-clock',
                title: 'Invoice Due Soon',
                message: `Invoice #${invoice.invoiceNumber || invoice.id} is due ${daysDiff === 0 ? 'today' : `in ${Math.abs(daysDiff)} days`}`,
                link: 'invoices',
                linkText: 'View Invoices',
                createdAt: new Date().toISOString(),
                read: false,
                dismissed: false
            });
        }
    });
    
    return alerts;
}

// 3. Payroll Reminder
function checkPayrollDue() {
    const alerts = [];
    const today = new Date();
    const currentDay = today.getDate();
    const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
    
    // Common payroll dates: 25th or last day of month
    const payrollDates = [25, daysInMonth];
    
    payrollDates.forEach(payDay => {
        const daysUntilPayroll = payDay - currentDay;
        
        if (daysUntilPayroll > 0 && daysUntilPayroll <= notificationSettings.payrollDaysBefore) {
            const alertId = `payroll-reminder-${today.getFullYear()}-${today.getMonth()}-${payDay}`;
            
            // Check if this alert already exists
            if (!notifications.find(n => n.id === alertId)) {
                alerts.push({
                    id: alertId,
                    type: 'info',
                    category: 'hr',
                    icon: 'fa-money-check-alt',
                    title: 'Payroll Reminder',
                    message: `Payroll processing due in ${daysUntilPayroll} day${daysUntilPayroll > 1 ? 's' : ''} (${payDay}th)`,
                    link: 'hr-modules',
                    linkText: 'Go to Payroll',
                    createdAt: new Date().toISOString(),
                    read: false,
                    dismissed: false
                });
            }
        }
    });
    
    return alerts;
}

// 4. Expiring Items
function checkExpiringItems() {
    const alerts = [];
    const items = window.inventoryItems || [];
    const today = new Date();
    const threshold = notificationSettings.expiryDaysBefore;
    
    items.forEach(item => {
        if (!item.expiryDate) return;
        
        const expiryDate = new Date(item.expiryDate);
        const daysUntilExpiry = Math.floor((expiryDate - today) / (1000 * 60 * 60 * 24));
        
        if (daysUntilExpiry < 0) {
            alerts.push({
                id: `expired-${item.id}-${new Date().toDateString()}`,
                type: 'danger',
                category: 'inventory',
                icon: 'fa-calendar-times',
                title: 'Item Expired!',
                message: `${item.name} has expired (${Math.abs(daysUntilExpiry)} days ago)`,
                link: 'inventory',
                linkText: 'View Inventory',
                createdAt: new Date().toISOString(),
                read: false,
                dismissed: false
            });
        } else if (daysUntilExpiry <= threshold) {
            alerts.push({
                id: `expiring-${item.id}-${new Date().toDateString()}`,
                type: 'warning',
                category: 'inventory',
                icon: 'fa-calendar-alt',
                title: 'Item Expiring Soon',
                message: `${item.name} will expire in ${daysUntilExpiry} day${daysUntilExpiry > 1 ? 's' : ''}`,
                link: 'inventory',
                linkText: 'View Inventory',
                createdAt: new Date().toISOString(),
                read: false,
                dismissed: false
            });
        }
    });
    
    return alerts;
}

// 5. Expiring Quotations
function checkExpiringQuotations() {
    const alerts = [];
    const quotations = window.quotations || [];
    const today = new Date();
    
    quotations.forEach(quote => {
        if (quote.status !== 'pending' && quote.status !== 'sent') return;
        if (!quote.validUntil) return;
        
        const validUntil = new Date(quote.validUntil);
        const daysUntilExpiry = Math.floor((validUntil - today) / (1000 * 60 * 60 * 24));
        
        if (daysUntilExpiry < 0) {
            alerts.push({
                id: `quote-expired-${quote.id}`,
                type: 'warning',
                category: 'sales',
                icon: 'fa-file-alt',
                title: 'Quotation Expired',
                message: `Quote #${quote.quoteNumber || quote.id} has expired`,
                link: 'quotations',
                linkText: 'View Quotations',
                createdAt: new Date().toISOString(),
                read: false,
                dismissed: false
            });
        } else if (daysUntilExpiry <= 3) {
            alerts.push({
                id: `quote-expiring-${quote.id}-${new Date().toDateString()}`,
                type: 'info',
                category: 'sales',
                icon: 'fa-file-alt',
                title: 'Quotation Expiring Soon',
                message: `Quote #${quote.quoteNumber || quote.id} expires in ${daysUntilExpiry} day${daysUntilExpiry > 1 ? 's' : ''}`,
                link: 'quotations',
                linkText: 'View Quotations',
                createdAt: new Date().toISOString(),
                read: false,
                dismissed: false
            });
        }
    });
    
    return alerts;
}

// 6. Project Deadlines
function checkProjectDeadlines() {
    const alerts = [];
    const projects = window.projects || [];
    const today = new Date();
    const threshold = notificationSettings.projectDaysBefore;
    
    projects.forEach(project => {
        if (project.status === 'completed' || project.status === 'cancelled') return;
        if (!project.deadline && !project.endDate) return;
        
        const deadline = new Date(project.deadline || project.endDate);
        const daysUntilDeadline = Math.floor((deadline - today) / (1000 * 60 * 60 * 24));
        
        if (daysUntilDeadline < 0) {
            alerts.push({
                id: `project-overdue-${project.id}`,
                type: 'danger',
                category: 'projects',
                icon: 'fa-project-diagram',
                title: 'Project Overdue!',
                message: `${project.name} is ${Math.abs(daysUntilDeadline)} days past deadline`,
                link: 'projects',
                linkText: 'View Projects',
                createdAt: new Date().toISOString(),
                read: false,
                dismissed: false
            });
        } else if (daysUntilDeadline <= threshold) {
            alerts.push({
                id: `project-deadline-${project.id}-${new Date().toDateString()}`,
                type: 'warning',
                category: 'projects',
                icon: 'fa-project-diagram',
                title: 'Project Deadline Approaching',
                message: `${project.name} deadline in ${daysUntilDeadline} day${daysUntilDeadline > 1 ? 's' : ''}`,
                link: 'projects',
                linkText: 'View Projects',
                createdAt: new Date().toISOString(),
                read: false,
                dismissed: false
            });
        }
    });
    
    return alerts;
}

// ==================== NOTIFICATION ACTIONS ====================
function getUnreadCount() {
    return notifications.filter(n => !n.read && !n.dismissed).length;
}

function markNotificationAsRead(notificationId) {
    const notification = notifications.find(n => n.id === notificationId);
    if (notification) {
        notification.read = true;
        saveNotifications();
        if (typeof window.updateNotificationBadge === 'function') {
            window.updateNotificationBadge();
        }
    }
}

function markAllNotificationsAsRead() {
    notifications.forEach(n => n.read = true);
    saveNotifications();
    if (typeof window.updateNotificationBadge === 'function') {
        window.updateNotificationBadge();
    }
}

function dismissNotification(notificationId) {
    const index = notifications.findIndex(n => n.id === notificationId);
    if (index > -1) {
        notifications.splice(index, 1);
        saveNotifications();
        if (typeof window.renderNotifications === 'function') {
            window.renderNotifications();
        }
        if (typeof window.updateNotificationBadge === 'function') {
            window.updateNotificationBadge();
        }
    }
}

function dismissAllNotifications() {
    notifications = [];
    saveNotifications();
    if (typeof window.renderNotifications === 'function') {
        window.renderNotifications();
    }
    if (typeof window.updateNotificationBadge === 'function') {
        window.updateNotificationBadge();
    }
}

// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
    // Delay init to ensure other modules are loaded
    setTimeout(initNotifications, 2000);
});

console.log('📢 Notifications Core loaded');
