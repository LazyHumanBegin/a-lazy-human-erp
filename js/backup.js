/**
 * EZCubic ERP - Backup & Restore Module
 * Handles full system data backup and restoration
 * Access: Founder + Business Admin only
 */

// Helper function to check if user is founder
function isFounderUser(user) {
    if (!user) return false;
    const role = (user.role || '').toLowerCase().replace(/\s+/g, '_');
    return user.isFounder === true || 
           user.id === 'founder_001' || 
           user.email === 'founder@ezcubic.com' ||
           role === 'founder';
}

// Helper function to check if user is business admin
function isBusinessAdminUser(user) {
    if (!user) return false;
    const role = (user.role || '').toLowerCase().replace(/\s+/g, '_');
    return role === 'business_admin';
}

// Backup/Restore functions
function exportBackup() {
    // Try both possible storage keys for current user
    let currentUser = JSON.parse(localStorage.getItem('ezcubic_current_user'));
    if (!currentUser) {
        currentUser = JSON.parse(localStorage.getItem('currentUser'));
    }
    
    // Check permissions - Only Founder and Business Admin can backup
    if (!currentUser || (!isFounderUser(currentUser) && !isBusinessAdminUser(currentUser))) {
        showNotification('Access Denied', 'Only Founder and Business Admin can export data.', 'error');
        return;
    }

    try {
        // Gather all data from localStorage
        const backupData = {
            metadata: {
                exportDate: new Date().toISOString(),
                exportedBy: currentUser.email,
                exportedByRole: currentUser.role || 'founder',
                exportedByUID: currentUser.uid,
                version: '2.1',
                appName: 'A Lazy Human ERP'
            },
            data: {}
        };

        // For Founder: Can export all platform data or specific tenant
        if (isFounderUser(currentUser)) {
            const exportChoice = confirm(
                '🔹 Export All Platform Data?\n\n' +
                'YES = Export ALL tenants & users (complete platform backup)\n' +
                'NO = Export only your tenant data\n\n' +
                'Choose carefully!'
            );

            if (exportChoice) {
                // Export everything
                for (let i = 0; i < localStorage.length; i++) {
                    const key = localStorage.key(i);
                    const value = localStorage.getItem(key);
                    backupData.data[key] = value;
                }
                backupData.metadata.backupType = 'full-platform';
                backupData.metadata.tenantsIncluded = 'all';
            } else {
                // Export only founder's tenant
                const tenantId = getCurrentTenantId();
                exportTenantData(backupData, tenantId, currentUser);
                backupData.metadata.backupType = 'single-tenant';
                backupData.metadata.tenantsIncluded = tenantId;
            }
        } else {
            // Business Admin: Export only their tenant data
            const tenantId = getCurrentTenantId();
            exportTenantData(backupData, tenantId, currentUser);
            backupData.metadata.backupType = 'single-tenant';
            backupData.metadata.tenantsIncluded = tenantId;
        }

        // Create JSON file
        const jsonString = JSON.stringify(backupData, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        // Create download link
        const a = document.createElement('a');
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
        const backupType = backupData.metadata.backupType;
        a.href = url;
        a.download = `ezcubic-backup-${backupType}-${timestamp}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        // Save last backup info
        const backupInfo = {
            date: new Date().toISOString(),
            by: currentUser.email,
            type: backupType,
            size: jsonString.length
        };
        localStorage.setItem('lastBackup', JSON.stringify(backupInfo));

        // Update UI
        updateBackupInfo();

        showNotification(
            'Backup Successful', 
            `✅ Data exported successfully!\n\nType: ${backupType}\nSize: ${formatBytes(jsonString.length)}`, 
            'success'
        );

    } catch (error) {
        console.error('Export error:', error);
        showNotification('Export Failed', 'Error exporting data: ' + error.message, 'error');
    }
}

function exportTenantData(backupData, tenantId, currentUser) {
    // Export tenant-specific data
    const keysToExport = [
        'users',
        'currentUser',
        'companySettings',
        'tenants',
        'currentTenantId',
        `transactions_${tenantId}`,
        `customers_${tenantId}`,
        `inventory_${tenantId}`,
        `orders_${tenantId}`,
        `quotations_${tenantId}`,
        `projects_${tenantId}`,
        `bills_${tenantId}`,
        `stock_${tenantId}`,
        `pos_${tenantId}`,
        `crm_${tenantId}`,
        `taxSettings_${tenantId}`,
        `accountingSettings_${tenantId}`
    ];

    keysToExport.forEach(key => {
        const value = localStorage.getItem(key);
        if (value) {
            backupData.data[key] = value;
        }
    });
}

function importBackup() {
    // Try both possible storage keys for current user
    let currentUser = JSON.parse(localStorage.getItem('ezcubic_current_user'));
    if (!currentUser) {
        currentUser = JSON.parse(localStorage.getItem('currentUser'));
    }
    
    // Check permissions
    if (!currentUser || (!isFounderUser(currentUser) && !isBusinessAdminUser(currentUser))) {
        showNotification('Access Denied', 'Only Founder and Business Admin can import data.', 'error');
        return;
    }

    // Confirm action
    const confirmed = confirm(
        '⚠️ WARNING: Import Backup Data\n\n' +
        'This will RESTORE data from a backup file.\n\n' +
        '🔴 IMPORTANT:\n' +
        '• This may OVERWRITE existing data\n' +
        '• Make sure you have a recent backup\n' +
        '• Only import files exported from EZCubic\n\n' +
        'Continue with import?'
    );

    if (!confirmed) return;

    // Create file input
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    
    input.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        try {
            const text = await file.text();
            const backupData = JSON.parse(text);

            // Validate backup file
            if (!backupData.metadata || !backupData.data) {
                throw new Error('Invalid backup file format');
            }

            // Show import info
            const importInfo = `
                📦 Backup Information:
                
                Exported: ${new Date(backupData.metadata.exportDate).toLocaleString()}
                By: ${backupData.metadata.exportedBy} (${backupData.metadata.exportedByRole})
                Type: ${backupData.metadata.backupType}
                Version: ${backupData.metadata.version}
                
                Continue with restore?
            `;

            const proceedImport = confirm(importInfo);
            if (!proceedImport) return;

            // For Founder importing full platform backup
            if (backupData.metadata.backupType === 'full-platform' && isFounderUser(currentUser)) {
                const fullRestore = confirm(
                    '🔹 Full Platform Restore?\n\n' +
                    'This backup contains ALL platform data.\n\n' +
                    'YES = Restore everything (will overwrite ALL data)\n' +
                    'NO = Cancel import\n\n' +
                    'Are you absolutely sure?'
                );

                if (!fullRestore) return;
            }

            // Restore data
            Object.keys(backupData.data).forEach(key => {
                localStorage.setItem(key, backupData.data[key]);
            });

            showNotification(
                'Import Successful', 
                '✅ Data restored successfully!\n\nPage will reload to apply changes.', 
                'success'
            );

            // Reload page after 2 seconds
            setTimeout(() => {
                window.location.reload();
            }, 2000);

        } catch (error) {
            console.error('Import error:', error);
            showNotification('Import Failed', 'Error importing data: ' + error.message, 'error');
        }
    };

    input.click();
}

function updateBackupInfo() {
    const infoElement = document.getElementById('backupInfo');
    if (!infoElement) return;

    const lastBackup = localStorage.getItem('lastBackup');
    
    if (lastBackup) {
        const info = JSON.parse(lastBackup);
        const date = new Date(info.date);
        const timeAgo = getTimeAgo(date);
        
        infoElement.innerHTML = `
            <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); 
                        padding: 12px; border-radius: 8px; margin-top: 10px;">
                <div style="display: flex; align-items: center; gap: 10px; color: white;">
                    <i class="fas fa-check-circle" style="font-size: 20px;"></i>
                    <div style="flex: 1;">
                        <div style="font-weight: 600; font-size: 13px;">Last Backup</div>
                        <div style="font-size: 12px; opacity: 0.9;">
                            ${timeAgo} • ${info.type} • ${formatBytes(info.size)}
                        </div>
                    </div>
                </div>
            </div>
        `;
    } else {
        infoElement.innerHTML = `
            <div style="background: #fef3c7; border: 1px solid #fbbf24; 
                        padding: 12px; border-radius: 8px; margin-top: 10px;">
                <div style="display: flex; align-items: center; gap: 10px; color: #92400e;">
                    <i class="fas fa-exclamation-triangle" style="font-size: 20px;"></i>
                    <div style="font-size: 12px;">
                        <strong>No backup yet</strong><br>
                        It's recommended to backup your data regularly
                    </div>
                </div>
            </div>
        `;
    }
}

// Helper functions
function formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

function getTimeAgo(date) {
    const seconds = Math.floor((new Date() - date) / 1000);
    
    if (seconds < 60) return 'Just now';
    
    const intervals = {
        year: 31536000,
        month: 2592000,
        week: 604800,
        day: 86400,
        hour: 3600,
        minute: 60
    };
    
    for (let [name, value] of Object.entries(intervals)) {
        const interval = Math.floor(seconds / value);
        if (interval >= 1) {
            return interval === 1 ? `1 ${name} ago` : `${interval} ${name}s ago`;
        }
    }
    
    return 'Just now';
}

function showBackupHelpTooltip() {
    const tooltip = document.getElementById('backupHelpTooltip');
    if (tooltip) {
        tooltip.style.display = tooltip.style.display === 'none' ? 'block' : 'none';
    }
}

// Initialize backup info on page load
document.addEventListener('DOMContentLoaded', function() {
    updateBackupInfo();
    initAutoBackup();
});

// ==================== AUTO-BACKUP SYSTEM ====================
const AUTO_BACKUP_KEY = 'alazyhumanAutoBackup';
const AUTO_BACKUP_SETTINGS_KEY = 'alazyhumanAutoBackupSettings';

// Default settings
function getAutoBackupSettings() {
    const defaults = {
        enabled: true,
        intervalHours: 24, // Auto-backup every 24 hours
        maxBackups: 5, // Keep last 5 backups
        lastAutoBackup: null,
        showReminder: true
    };
    try {
        const saved = localStorage.getItem(AUTO_BACKUP_SETTINGS_KEY);
        return saved ? { ...defaults, ...JSON.parse(saved) } : defaults;
    } catch {
        return defaults;
    }
}

function saveAutoBackupSettings(settings) {
    localStorage.setItem(AUTO_BACKUP_SETTINGS_KEY, JSON.stringify(settings));
}

// Initialize auto-backup system
function initAutoBackup() {
    const settings = getAutoBackupSettings();
    
    if (!settings.enabled) return;
    
    // Check if auto-backup is needed
    const now = new Date();
    const lastBackup = settings.lastAutoBackup ? new Date(settings.lastAutoBackup) : null;
    const hoursSinceBackup = lastBackup ? (now - lastBackup) / (1000 * 60 * 60) : Infinity;
    
    if (hoursSinceBackup >= settings.intervalHours) {
        // Perform auto-backup
        performAutoBackup();
    }
    
    // Set up periodic check (every hour)
    setInterval(() => {
        const currentSettings = getAutoBackupSettings();
        if (currentSettings.enabled) {
            const checkNow = new Date();
            const checkLast = currentSettings.lastAutoBackup ? new Date(currentSettings.lastAutoBackup) : null;
            const checkHours = checkLast ? (checkNow - checkLast) / (1000 * 60 * 60) : Infinity;
            
            if (checkHours >= currentSettings.intervalHours) {
                performAutoBackup();
            }
        }
    }, 60 * 60 * 1000); // Check every hour
}

// Perform auto-backup (saves to IndexedDB/localStorage)
function performAutoBackup() {
    try {
        const currentUser = JSON.parse(localStorage.getItem('ezcubic_current_user') || localStorage.getItem('currentUser') || 'null');
        
        // Create backup data
        const backupData = {
            metadata: {
                exportDate: new Date().toISOString(),
                exportedBy: currentUser?.email || 'auto',
                version: '2.1',
                appName: 'A Lazy Human ERP',
                backupType: 'auto-backup',
                isAutoBackup: true
            },
            data: {}
        };
        
        // Gather all relevant data
        const keysToBackup = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            // Skip auto-backup storage itself to avoid recursion
            if (key && !key.startsWith('alazyhumanAutoBackup')) {
                keysToBackup.push(key);
            }
        }
        
        keysToBackup.forEach(key => {
            backupData.data[key] = localStorage.getItem(key);
        });
        
        // Get existing auto-backups
        let autoBackups = [];
        try {
            autoBackups = JSON.parse(localStorage.getItem(AUTO_BACKUP_KEY) || '[]');
        } catch {
            autoBackups = [];
        }
        
        // Add new backup
        const settings = getAutoBackupSettings();
        autoBackups.unshift({
            timestamp: new Date().toISOString(),
            data: JSON.stringify(backupData),
            size: JSON.stringify(backupData).length
        });
        
        // Keep only last N backups
        if (autoBackups.length > settings.maxBackups) {
            autoBackups = autoBackups.slice(0, settings.maxBackups);
        }
        
        // Save auto-backups
        localStorage.setItem(AUTO_BACKUP_KEY, JSON.stringify(autoBackups));
        
        // Update settings
        settings.lastAutoBackup = new Date().toISOString();
        saveAutoBackupSettings(settings);
        
        console.log('[Auto-Backup] Backup completed:', new Date().toLocaleString());
        
        // Show subtle notification (non-intrusive)
        if (typeof showToast === 'function') {
            showToast('Auto-backup saved ✓', 'success');
        }
        
        return true;
    } catch (error) {
        console.error('[Auto-Backup] Error:', error);
        return false;
    }
}

// Restore from auto-backup
function showAutoBackupRestore() {
    const autoBackups = JSON.parse(localStorage.getItem(AUTO_BACKUP_KEY) || '[]');
    
    if (autoBackups.length === 0) {
        showNotification('No Auto-Backups', 'No auto-backups available yet. Auto-backup runs every 24 hours.', 'info');
        return;
    }
    
    let backupListHTML = autoBackups.map((backup, index) => {
        const date = new Date(backup.timestamp);
        const size = formatBytes(backup.size);
        return `
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px; background: ${index === 0 ? '#f0f9ff' : '#f8fafc'}; border-radius: 8px; margin-bottom: 8px; border: 1px solid ${index === 0 ? '#bae6fd' : '#e2e8f0'};">
                <div>
                    <div style="font-weight: 600; color: #1e293b;">${date.toLocaleDateString()} ${date.toLocaleTimeString()}</div>
                    <div style="font-size: 12px; color: #64748b;">${size} ${index === 0 ? '(Latest)' : ''}</div>
                </div>
                <button onclick="restoreAutoBackup(${index})" class="btn-primary" style="padding: 8px 16px; font-size: 13px;">
                    <i class="fas fa-undo"></i> Restore
                </button>
            </div>
        `;
    }).join('');
    
    const modalHTML = `
        <div class="modal show" id="autoBackupModal" style="z-index: 10000;">
            <div class="modal-content" style="max-width: 500px;">
                <div class="modal-header">
                    <h3><i class="fas fa-history"></i> Auto-Backup Recovery</h3>
                    <button class="modal-close" onclick="closeModal('autoBackupModal')">&times;</button>
                </div>
                <div class="modal-body">
                    <p style="color: #64748b; margin-bottom: 15px;">Select a backup to restore. This will replace current data.</p>
                    ${backupListHTML}
                </div>
                <div class="modal-footer">
                    <button class="btn-secondary" onclick="closeModal('autoBackupModal')">Cancel</button>
                </div>
            </div>
        </div>
    `;
    
    // Remove existing modal if any
    const existing = document.getElementById('autoBackupModal');
    if (existing) existing.remove();
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

function restoreAutoBackup(index) {
    const autoBackups = JSON.parse(localStorage.getItem(AUTO_BACKUP_KEY) || '[]');
    
    if (!autoBackups[index]) {
        showNotification('Error', 'Backup not found', 'error');
        return;
    }
    
    if (!confirm('⚠️ This will restore data from this backup and replace current data. Continue?')) {
        return;
    }
    
    try {
        const backupData = JSON.parse(autoBackups[index].data);
        
        // Restore all data
        Object.keys(backupData.data).forEach(key => {
            if (backupData.data[key] !== null) {
                localStorage.setItem(key, backupData.data[key]);
            }
        });
        
        showNotification('Restore Complete', 'Data restored successfully! Page will reload.', 'success');
        
        setTimeout(() => {
            window.location.reload();
        }, 1500);
        
    } catch (error) {
        console.error('Restore error:', error);
        showNotification('Restore Failed', 'Error restoring backup: ' + error.message, 'error');
    }
}

// Manual trigger for auto-backup
function triggerAutoBackup() {
    if (performAutoBackup()) {
        showNotification('Backup Complete', 'Auto-backup saved successfully!', 'success');
    } else {
        showNotification('Backup Failed', 'Could not create auto-backup.', 'error');
    }
}

// Export functions to window
window.exportBackup = exportBackup;
window.importBackup = importBackup;
window.updateBackupInfo = updateBackupInfo;
window.showBackupHelpTooltip = showBackupHelpTooltip;
window.showAutoBackupRestore = showAutoBackupRestore;
window.restoreAutoBackup = restoreAutoBackup;
window.triggerAutoBackup = triggerAutoBackup;
window.performAutoBackup = performAutoBackup;
window.getAutoBackupSettings = getAutoBackupSettings;
window.saveAutoBackupSettings = saveAutoBackupSettings;
