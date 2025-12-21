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
                appName: 'EZCubic ERP'
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
});

// Export functions to window
window.exportBackup = exportBackup;
window.importBackup = importBackup;
window.updateBackupInfo = updateBackupInfo;
window.showBackupHelpTooltip = showBackupHelpTooltip;
