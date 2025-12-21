/**
 * EZCubic ERP - Audit Log Module
 * Records all changes made in the ERP for accountability and tracking
 * Tracks: who did what, when, to what item, with before/after values
 */

// ==================== AUDIT LOG STATE ====================
const AUDIT_LOG_KEY = 'ezcubic_audit_logs';
let auditLogs = [];

// ==================== AUDIT LOG INITIALIZATION ====================
function initializeAuditLog() {
    loadAuditLogs();
    console.log('Audit Log module initialized:', auditLogs.length, 'log entries');
}

function loadAuditLogs() {
    try {
        const stored = localStorage.getItem(AUDIT_LOG_KEY);
        if (stored) {
            auditLogs = JSON.parse(stored);
        }
        window.auditLogs = auditLogs;
    } catch (e) {
        console.error('Error loading audit logs:', e);
        auditLogs = [];
    }
}

function saveAuditLogs() {
    try {
        localStorage.setItem(AUDIT_LOG_KEY, JSON.stringify(auditLogs));
        window.auditLogs = auditLogs;
    } catch (e) {
        console.error('Error saving audit logs:', e);
    }
}

// ==================== CORE AUDIT LOG FUNCTION ====================
/**
 * Record an audit log entry
 * @param {Object} logEntry - The log entry details
 * @param {string} logEntry.action - Action type: 'create', 'update', 'delete', 'void', 'restore', 'export', 'login', 'logout'
 * @param {string} logEntry.module - Module name: 'inventory', 'sales', 'bills', 'customers', 'employees', 'transactions', 'settings', etc.
 * @param {string} logEntry.subModule - Sub-module name: 'products', 'receipts', 'quotations', etc.
 * @param {string} logEntry.recordId - ID of the affected record
 * @param {string} logEntry.recordName - Display name of the record (e.g., product name, receipt number)
 * @param {string} logEntry.description - Human-readable description of what changed
 * @param {Object} logEntry.oldValue - Previous value(s) before change (for updates/deletes)
 * @param {Object} logEntry.newValue - New value(s) after change (for creates/updates)
 * @param {string} logEntry.reason - Optional reason for the change (e.g., void reason)
 */
function recordAuditLog(logEntry) {
    try {
        // Get current user info
        const currentUser = typeof getCurrentUser === 'function' ? getCurrentUser() : window.currentUser;
        const userName = currentUser?.name || currentUser?.email || 'Unknown User';
        const userRole = currentUser?.role || 'user';
        const tenantId = typeof getCurrentTenantId === 'function' ? getCurrentTenantId() : null;
        
        const entry = {
            id: generateAuditLogId(),
            timestamp: new Date().toISOString(),
            tenantId: tenantId,
            // User info
            userId: currentUser?.id || currentUser?.email || 'unknown',
            userName: userName,
            userRole: userRole,
            // Action details
            action: logEntry.action || 'unknown',
            module: logEntry.module || 'system',
            subModule: logEntry.subModule || '',
            // Record info
            recordId: logEntry.recordId || '',
            recordName: logEntry.recordName || '',
            description: logEntry.description || '',
            // Values for tracking changes
            oldValue: logEntry.oldValue || null,
            newValue: logEntry.newValue || null,
            // Additional context
            reason: logEntry.reason || '',
            ipAddress: '', // Can be populated server-side if needed
            userAgent: navigator.userAgent
        };
        
        // Add to beginning (newest first)
        auditLogs.unshift(entry);
        
        // Limit log size to prevent localStorage overflow (keep last 10,000 entries)
        const MAX_LOG_ENTRIES = 10000;
        if (auditLogs.length > MAX_LOG_ENTRIES) {
            auditLogs = auditLogs.slice(0, MAX_LOG_ENTRIES);
        }
        
        saveAuditLogs();
        
        console.log('📋 Audit Log:', entry.action, entry.module, entry.recordName || entry.description);
        
        return entry;
    } catch (e) {
        console.error('Error recording audit log:', e);
        return null;
    }
}

function generateAuditLogId() {
    return 'LOG_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

// ==================== AUDIT LOG QUERIES ====================
/**
 * Get audit logs with optional filters
 */
function getAuditLogs(filters = {}) {
    let results = [...auditLogs];
    
    // Filter by date range
    if (filters.startDate) {
        const start = new Date(filters.startDate);
        start.setHours(0, 0, 0, 0);
        results = results.filter(log => new Date(log.timestamp) >= start);
    }
    
    if (filters.endDate) {
        const end = new Date(filters.endDate);
        end.setHours(23, 59, 59, 999);
        results = results.filter(log => new Date(log.timestamp) <= end);
    }
    
    // Filter by user
    if (filters.userId) {
        results = results.filter(log => log.userId === filters.userId || log.userName.toLowerCase().includes(filters.userId.toLowerCase()));
    }
    
    // Filter by action type
    if (filters.action) {
        results = results.filter(log => log.action === filters.action);
    }
    
    // Filter by module
    if (filters.module) {
        results = results.filter(log => log.module === filters.module);
    }
    
    // Filter by search term
    if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        results = results.filter(log => 
            log.description.toLowerCase().includes(searchLower) ||
            log.recordName.toLowerCase().includes(searchLower) ||
            log.recordId.toLowerCase().includes(searchLower) ||
            log.userName.toLowerCase().includes(searchLower)
        );
    }
    
    // Limit results
    if (filters.limit) {
        results = results.slice(0, filters.limit);
    }
    
    return results;
}

/**
 * Get logs for a specific record
 */
function getLogsForRecord(recordId) {
    return auditLogs.filter(log => log.recordId === recordId);
}

/**
 * Get logs by user
 */
function getLogsByUser(userId) {
    return auditLogs.filter(log => log.userId === userId || log.userName === userId);
}

// ==================== AUDIT LOG UI ====================
function renderAuditLogSection() {
    // Set default date range (last 30 days)
    const today = new Date();
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const startDateInput = document.getElementById('auditLogStartDate');
    const endDateInput = document.getElementById('auditLogEndDate');
    
    if (startDateInput && !startDateInput.value) {
        startDateInput.value = thirtyDaysAgo.toISOString().split('T')[0];
    }
    if (endDateInput && !endDateInput.value) {
        endDateInput.value = today.toISOString().split('T')[0];
    }
    
    // Populate filter dropdowns
    populateAuditLogFilters();
    
    // Render the log table
    filterAuditLogs();
}

function populateAuditLogFilters() {
    const userSelect = document.getElementById('auditLogUserFilter');
    const moduleSelect = document.getElementById('auditLogModuleFilter');
    
    if (userSelect) {
        // Get unique users from logs
        const uniqueUsers = [...new Set(auditLogs.map(log => log.userName))].filter(Boolean);
        userSelect.innerHTML = `<option value="">All Users</option>` + 
            uniqueUsers.map(user => `<option value="${escapeHtml(user)}">${escapeHtml(user)}</option>`).join('');
    }
    
    if (moduleSelect) {
        const modules = [
            { value: 'inventory', label: 'Inventory/Products' },
            { value: 'sales', label: 'POS Sales' },
            { value: 'bills', label: 'Bills/Purchases' },
            { value: 'customers', label: 'Customers' },
            { value: 'crm', label: 'CRM' },
            { value: 'employees', label: 'HR/Employees' },
            { value: 'transactions', label: 'Transactions' },
            { value: 'quotations', label: 'Quotations' },
            { value: 'orders', label: 'Orders' },
            { value: 'projects', label: 'Projects' },
            { value: 'branches', label: 'Branches' },
            { value: 'settings', label: 'Settings' },
            { value: 'auth', label: 'Login/Logout' }
        ];
        
        moduleSelect.innerHTML = `<option value="">All Modules</option>` + 
            modules.map(m => `<option value="${m.value}">${m.label}</option>`).join('');
    }
}

function filterAuditLogs() {
    const filters = {
        startDate: document.getElementById('auditLogStartDate')?.value || '',
        endDate: document.getElementById('auditLogEndDate')?.value || '',
        userId: document.getElementById('auditLogUserFilter')?.value || '',
        action: document.getElementById('auditLogActionFilter')?.value || '',
        module: document.getElementById('auditLogModuleFilter')?.value || '',
        search: document.getElementById('auditLogSearch')?.value || ''
    };
    
    const logs = getAuditLogs(filters);
    renderAuditLogTable(logs);
    updateAuditLogStats(logs);
}

function renderAuditLogTable(logs) {
    const container = document.getElementById('auditLogTableBody');
    if (!container) return;
    
    if (logs.length === 0) {
        container.innerHTML = `
            <tr>
                <td colspan="6" class="text-center" style="padding: 40px;">
                    <i class="fas fa-clipboard-list" style="font-size: 48px; color: #ddd;"></i>
                    <p style="margin-top: 10px; color: #888;">No audit logs found for the selected filters</p>
                </td>
            </tr>
        `;
        return;
    }
    
    container.innerHTML = logs.slice(0, 500).map(log => {
        const actionClass = getActionClass(log.action);
        const actionIcon = getActionIcon(log.action);
        const moduleIcon = getModuleIcon(log.module);
        const formattedDate = formatAuditLogDate(log.timestamp);
        
        return `
            <tr class="audit-log-row" onclick="viewAuditLogDetail('${log.id}')">
                <td class="audit-log-date">
                    <div class="audit-date-time">
                        <span class="audit-date">${formattedDate.date}</span>
                        <span class="audit-time">${formattedDate.time}</span>
                    </div>
                </td>
                <td class="audit-log-user">
                    <div class="audit-user-info">
                        <span class="audit-user-avatar">${getUserInitials(log.userName)}</span>
                        <div>
                            <span class="audit-user-name">${escapeHtml(log.userName)}</span>
                            <span class="audit-user-role">${escapeHtml(log.userRole)}</span>
                        </div>
                    </div>
                </td>
                <td class="audit-log-action">
                    <span class="audit-action-badge ${actionClass}">
                        <i class="fas ${actionIcon}"></i> ${capitalizeFirst(log.action)}
                    </span>
                </td>
                <td class="audit-log-module">
                    <span class="audit-module-badge">
                        <i class="fas ${moduleIcon}"></i> ${capitalizeFirst(log.module)}
                    </span>
                </td>
                <td class="audit-log-description">
                    <div class="audit-desc-text">
                        ${log.recordName ? `<strong>${escapeHtml(log.recordName)}</strong><br>` : ''}
                        ${escapeHtml(log.description)}
                    </div>
                </td>
                <td class="audit-log-actions">
                    <button class="btn-icon" onclick="event.stopPropagation(); viewAuditLogDetail('${log.id}')" title="View Details">
                        <i class="fas fa-eye"></i>
                    </button>
                </td>
            </tr>
        `;
    }).join('');
    
    // Show count info
    const countInfo = document.getElementById('auditLogCountInfo');
    if (countInfo) {
        countInfo.textContent = logs.length > 500 
            ? `Showing 500 of ${logs.length} entries` 
            : `${logs.length} entries`;
    }
}

function updateAuditLogStats(logs) {
    // Count by action type
    const creates = logs.filter(l => l.action === 'create').length;
    const updates = logs.filter(l => l.action === 'update').length;
    const deletes = logs.filter(l => l.action === 'delete').length;
    const voids = logs.filter(l => l.action === 'void').length;
    
    const statCreates = document.getElementById('auditStatCreates');
    const statUpdates = document.getElementById('auditStatUpdates');
    const statDeletes = document.getElementById('auditStatDeletes');
    const statVoids = document.getElementById('auditStatVoids');
    
    if (statCreates) statCreates.textContent = creates;
    if (statUpdates) statUpdates.textContent = updates;
    if (statDeletes) statDeletes.textContent = deletes;
    if (statVoids) statVoids.textContent = voids;
}

function viewAuditLogDetail(logId) {
    const log = auditLogs.find(l => l.id === logId);
    if (!log) return;
    
    const formattedDate = formatAuditLogDate(log.timestamp);
    const actionClass = getActionClass(log.action);
    
    const modalHtml = `
        <div class="modal show" id="auditLogDetailModal" onclick="if(event.target===this)closeModal('auditLogDetailModal')">
            <div class="modal-content" style="max-width: 700px;">
                <div class="modal-header">
                    <h3 class="modal-title"><i class="fas fa-clipboard-list"></i> Audit Log Detail</h3>
                    <button class="modal-close" onclick="closeModal('auditLogDetailModal')">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="audit-detail-header">
                        <span class="audit-action-badge ${actionClass}" style="font-size: 14px; padding: 8px 16px;">
                            <i class="fas ${getActionIcon(log.action)}"></i> ${capitalizeFirst(log.action)}
                        </span>
                        <span class="audit-module-badge" style="font-size: 14px; padding: 8px 16px;">
                            <i class="fas ${getModuleIcon(log.module)}"></i> ${capitalizeFirst(log.module)}${log.subModule ? ' / ' + capitalizeFirst(log.subModule) : ''}
                        </span>
                    </div>
                    
                    <div class="audit-detail-grid">
                        <div class="audit-detail-row">
                            <label><i class="fas fa-calendar"></i> Date & Time</label>
                            <span>${formattedDate.date} at ${formattedDate.time}</span>
                        </div>
                        <div class="audit-detail-row">
                            <label><i class="fas fa-user"></i> User</label>
                            <span>${escapeHtml(log.userName)} (${escapeHtml(log.userRole)})</span>
                        </div>
                        ${log.recordId ? `
                        <div class="audit-detail-row">
                            <label><i class="fas fa-hashtag"></i> Record ID</label>
                            <span class="audit-record-id">${escapeHtml(log.recordId)}</span>
                        </div>
                        ` : ''}
                        ${log.recordName ? `
                        <div class="audit-detail-row">
                            <label><i class="fas fa-tag"></i> Record Name</label>
                            <span><strong>${escapeHtml(log.recordName)}</strong></span>
                        </div>
                        ` : ''}
                        <div class="audit-detail-row full-width">
                            <label><i class="fas fa-info-circle"></i> Description</label>
                            <span>${escapeHtml(log.description)}</span>
                        </div>
                        ${log.reason ? `
                        <div class="audit-detail-row full-width">
                            <label><i class="fas fa-comment"></i> Reason</label>
                            <span>${escapeHtml(log.reason)}</span>
                        </div>
                        ` : ''}
                    </div>
                    
                    ${log.oldValue || log.newValue ? `
                    <div class="audit-changes-section">
                        <h4><i class="fas fa-exchange-alt"></i> Changes</h4>
                        <div class="audit-changes-grid">
                            ${log.oldValue ? `
                            <div class="audit-change-panel old-value">
                                <h5><i class="fas fa-minus-circle"></i> Before</h5>
                                <pre>${formatAuditValue(log.oldValue)}</pre>
                            </div>
                            ` : ''}
                            ${log.newValue ? `
                            <div class="audit-change-panel new-value">
                                <h5><i class="fas fa-plus-circle"></i> After</h5>
                                <pre>${formatAuditValue(log.newValue)}</pre>
                            </div>
                            ` : ''}
                        </div>
                    </div>
                    ` : ''}
                    
                    <div class="audit-meta-info">
                        <small>
                            <strong>Log ID:</strong> ${log.id}<br>
                            <strong>User ID:</strong> ${log.userId}
                        </small>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn-outline" onclick="closeModal('auditLogDetailModal')">Close</button>
                </div>
            </div>
        </div>
    `;
    
    // Remove existing modal if any
    const existingModal = document.getElementById('auditLogDetailModal');
    if (existingModal) existingModal.remove();
    
    // Add modal to DOM
    document.body.insertAdjacentHTML('beforeend', modalHtml);
}

function formatAuditValue(value) {
    if (value === null || value === undefined) return 'N/A';
    
    if (typeof value === 'object') {
        // Format object nicely, showing only key fields
        const formatted = {};
        const priorityKeys = ['name', 'price', 'stock', 'quantity', 'total', 'amount', 'status', 'description'];
        
        // Show priority keys first
        priorityKeys.forEach(key => {
            if (value[key] !== undefined) {
                formatted[key] = value[key];
            }
        });
        
        // Then add other keys
        Object.keys(value).forEach(key => {
            if (!priorityKeys.includes(key) && !['id', 'createdAt', 'updatedAt', 'timestamp'].includes(key)) {
                formatted[key] = value[key];
            }
        });
        
        return escapeHtml(JSON.stringify(formatted, null, 2));
    }
    
    return escapeHtml(String(value));
}

// ==================== EXPORT AUDIT LOGS ====================
function exportAuditLogs() {
    const filters = {
        startDate: document.getElementById('auditLogStartDate')?.value || '',
        endDate: document.getElementById('auditLogEndDate')?.value || '',
        userId: document.getElementById('auditLogUserFilter')?.value || '',
        action: document.getElementById('auditLogActionFilter')?.value || '',
        module: document.getElementById('auditLogModuleFilter')?.value || '',
        search: document.getElementById('auditLogSearch')?.value || ''
    };
    
    const logs = getAuditLogs(filters);
    
    if (logs.length === 0) {
        showToast('No logs to export', 'warning');
        return;
    }
    
    // Create CSV
    const headers = ['Date', 'Time', 'User', 'Role', 'Action', 'Module', 'Record ID', 'Record Name', 'Description', 'Reason'];
    const rows = logs.map(log => {
        const dt = new Date(log.timestamp);
        return [
            dt.toLocaleDateString('en-MY'),
            dt.toLocaleTimeString('en-MY'),
            log.userName,
            log.userRole,
            log.action,
            log.module,
            log.recordId,
            log.recordName,
            log.description.replace(/"/g, '""'),
            log.reason?.replace(/"/g, '""') || ''
        ].map(v => `"${v}"`).join(',');
    });
    
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `audit_log_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    showToast(`Exported ${logs.length} audit log entries`, 'success');
}

// ==================== HELPER FUNCTIONS ====================
function getActionClass(action) {
    const classes = {
        'create': 'action-create',
        'update': 'action-update',
        'delete': 'action-delete',
        'void': 'action-void',
        'restore': 'action-restore',
        'export': 'action-export',
        'login': 'action-login',
        'logout': 'action-logout'
    };
    return classes[action] || 'action-default';
}

function getActionIcon(action) {
    const icons = {
        'create': 'fa-plus-circle',
        'update': 'fa-edit',
        'delete': 'fa-trash',
        'void': 'fa-ban',
        'restore': 'fa-undo',
        'export': 'fa-download',
        'login': 'fa-sign-in-alt',
        'logout': 'fa-sign-out-alt'
    };
    return icons[action] || 'fa-circle';
}

function getModuleIcon(module) {
    const icons = {
        'inventory': 'fa-boxes',
        'sales': 'fa-cash-register',
        'bills': 'fa-file-invoice-dollar',
        'customers': 'fa-users',
        'crm': 'fa-address-book',
        'employees': 'fa-user-tie',
        'transactions': 'fa-exchange-alt',
        'quotations': 'fa-file-alt',
        'orders': 'fa-shopping-cart',
        'projects': 'fa-project-diagram',
        'branches': 'fa-store',
        'settings': 'fa-cog',
        'auth': 'fa-key',
        'system': 'fa-server'
    };
    return icons[module] || 'fa-folder';
}

function getUserInitials(name) {
    if (!name) return '?';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
}

function formatAuditLogDate(timestamp) {
    const date = new Date(timestamp);
    return {
        date: date.toLocaleDateString('en-MY', { year: 'numeric', month: 'short', day: 'numeric' }),
        time: date.toLocaleTimeString('en-MY', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    };
}

function capitalizeFirst(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
}

// ==================== QUICK LOG HELPERS ====================
// Convenience functions for common logging scenarios

function logCreate(module, recordId, recordName, description, newValue = null) {
    return recordAuditLog({
        action: 'create',
        module: module,
        recordId: recordId,
        recordName: recordName,
        description: description,
        newValue: newValue
    });
}

function logUpdate(module, recordId, recordName, description, oldValue = null, newValue = null) {
    return recordAuditLog({
        action: 'update',
        module: module,
        recordId: recordId,
        recordName: recordName,
        description: description,
        oldValue: oldValue,
        newValue: newValue
    });
}

function logDelete(module, recordId, recordName, description, oldValue = null, reason = '') {
    return recordAuditLog({
        action: 'delete',
        module: module,
        recordId: recordId,
        recordName: recordName,
        description: description,
        oldValue: oldValue,
        reason: reason
    });
}

function logVoid(module, recordId, recordName, description, reason = '') {
    return recordAuditLog({
        action: 'void',
        module: module,
        recordId: recordId,
        recordName: recordName,
        description: description,
        reason: reason
    });
}

// ==================== WINDOW EXPORTS ====================
window.initializeAuditLog = initializeAuditLog;
window.recordAuditLog = recordAuditLog;
window.getAuditLogs = getAuditLogs;
window.getLogsForRecord = getLogsForRecord;
window.getLogsByUser = getLogsByUser;
window.renderAuditLogSection = renderAuditLogSection;
window.filterAuditLogs = filterAuditLogs;
window.viewAuditLogDetail = viewAuditLogDetail;
window.exportAuditLogs = exportAuditLogs;
window.logCreate = logCreate;
window.logUpdate = logUpdate;
window.logDelete = logDelete;
window.logVoid = logVoid;
