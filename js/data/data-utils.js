/**
 * EZCubic Smart Accounting - Data Utils Module
 * Version management, import/export utilities, CSV parsing, reset functions
 * Split from data.js for v2.3.1
 */

// ==================== APP VERSION ====================
// Single source of truth for version number
// Update this when releasing new versions
const APP_VERSION = '2.3.1';
window.APP_VERSION = APP_VERSION;

// Update version display in UI
function updateVersionDisplay() {
    const versionEl = document.getElementById('appVersion');
    if (versionEl) {
        versionEl.textContent = 'v' + APP_VERSION;
    }
}

// Run on DOM ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', updateVersionDisplay);
} else {
    updateVersionDisplay();
}

// Import data modal
function importData() {
    document.getElementById('importModal').style.display = 'flex';
}

function closeImportModal() {
    document.getElementById('importModal').style.display = 'none';
}

function processImport() {
    const fileInput = document.getElementById('importFile');
    const importType = document.getElementById('importType').value;
    
    if (!fileInput.files[0]) {
        showNotification('Please select a file to import', 'error');
        return;
    }
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const importedData = JSON.parse(e.target.result);
            
            if (!importedData.transactions || !importedData.settings) {
                throw new Error('Invalid file format');
            }
            
            if (importType === 'replace') {
                businessData = importedData;
                showNotification('All data replaced successfully!', 'success');
            } else {
                const existingIds = new Set(businessData.transactions.map(t => t.id));
                const newTransactions = importedData.transactions.filter(t => !existingIds.has(t.id));
                businessData.transactions.push(...newTransactions);
                
                const existingBillIds = new Set(businessData.bills.map(b => b.id));
                const newBills = importedData.bills.filter(b => !existingBillIds.has(b.id));
                businessData.bills.push(...newBills);
                
                businessData.settings = {
                    ...importedData.settings,
                    ...businessData.settings
                };
                
                showNotification('Data merged successfully!', 'success');
            }
            
            saveData();
            closeImportModal();
            
            updateDashboard();
            updateReports();
            updateMalaysianTaxEstimator();
            calculatePersonalTax();
            populateYearSelector();
            
        } catch (error) {
            console.error('Error importing data:', error);
            showNotification('Error importing data. Please check file format.', 'error');
        }
    };
    
    reader.readAsText(fileInput.files[0]);
}

function confirmResetTransactions() {
    if (confirm('Are you sure you want to clear all transactions and bills? Company settings will be preserved.')) {
        // Create auto-backup before reset
        if (typeof createAutoBackup === 'function') {
            createAutoBackup('before_reset_transactions');
            console.log('Auto-backup created before resetting transactions');
        }
        
        businessData.transactions = [];
        businessData.bills = [];
        
        if (saveData()) {
            updateDashboard();
            updateReports();
            updateMalaysianTaxEstimator();
            calculatePersonalTax();
            populateYearSelector();
            
            showNotification('All transactions and bills cleared successfully!', 'success');
        }
    }
}

function confirmResetAll() {
    if (confirm('Are you sure you want to clear ALL data including company settings? This action cannot be undone!')) {
        // Create auto-backup before reset
        if (typeof createAutoBackup === 'function') {
            createAutoBackup('before_reset_all');
            console.log('Auto-backup created before resetting all data');
        }
        
        businessData = {
            transactions: [],
            bills: [],
            settings: getDefaultSettings()
        };
        
        if (saveData()) {
            updateCompanyNameInUI();
            updateDashboard();
            updateReports();
            updateMalaysianTaxEstimator();
            calculatePersonalTax();
            populateYearSelector();
            
            showNotification('All data cleared successfully!', 'success');
        }
    }
}

// Import old transactions from Excel/CSV
function importOldTransactions() {
    // Create modal if it doesn't exist
    let modal = document.getElementById('importOldTransModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'importOldTransModal';
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 600px;">
                <div class="modal-header">
                    <h3 class="modal-title"><i class="fas fa-file-import"></i> Import Old Transactions</h3>
                    <button class="modal-close" onclick="closeModal('importOldTransModal')">&times;</button>
                </div>
                <div class="modal-body">
                    <div style="background: #fef3c7; border: 1px solid #fbbf24; border-radius: 8px; padding: 15px; margin-bottom: 20px;">
                        <div style="color: #92400e; font-weight: 600; margin-bottom: 8px;">
                            <i class="fas fa-info-circle"></i> Supported Formats
                        </div>
                        <ul style="color: #78350f; font-size: 13px; padding-left: 20px; margin: 0;">
                            <li><strong>CSV</strong> - Comma-separated values</li>
                            <li><strong>Excel (.xlsx)</strong> - Microsoft Excel files</li>
                        </ul>
                    </div>
                    
                    <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 15px; margin-bottom: 20px;">
                        <div style="color: #334155; font-weight: 600; margin-bottom: 8px;">
                            <i class="fas fa-columns"></i> Required Columns
                        </div>
                        <div style="color: #64748b; font-size: 12px;">
                            <code style="background: #e2e8f0; padding: 2px 6px; border-radius: 4px;">Date</code>
                            <code style="background: #e2e8f0; padding: 2px 6px; border-radius: 4px;">Description</code>
                            <code style="background: #e2e8f0; padding: 2px 6px; border-radius: 4px;">Amount</code>
                            <code style="background: #e2e8f0; padding: 2px 6px; border-radius: 4px;">Type</code> (income/expense)
                        </div>
                        <div style="color: #94a3b8; font-size: 11px; margin-top: 8px;">
                            Optional: Category, Reference, Notes
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <label class="form-label">Select File</label>
                        <input type="file" id="oldTransFile" class="form-control" accept=".csv,.xlsx,.xls">
                    </div>
                    
                    <div class="form-group">
                        <label class="form-label">Import Mode</label>
                        <select id="oldTransImportMode" class="form-control">
                            <option value="append">Append to existing transactions</option>
                            <option value="replace">Replace all transactions (use with caution)</option>
                        </select>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn-secondary" onclick="closeModal('importOldTransModal')">Cancel</button>
                    <button class="btn-primary" onclick="processOldTransactionsImport()">
                        <i class="fas fa-upload"></i> Import
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }
    
    modal.style.display = '';
    modal.classList.add('show');
}

// Process the old transactions import
function processOldTransactionsImport() {
    const fileInput = document.getElementById('oldTransFile');
    const importMode = document.getElementById('oldTransImportMode')?.value || 'append';
    
    if (!fileInput || !fileInput.files[0]) {
        showNotification('Error', 'Please select a file to import', 'error');
        return;
    }
    
    const file = fileInput.files[0];
    const fileName = file.name.toLowerCase();
    
    if (fileName.endsWith('.csv')) {
        processCSVImport(file, importMode);
    } else if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
        showNotification('Excel Import', 'For Excel files, please save as CSV first, then import the CSV file.', 'warning');
    } else {
        showNotification('Error', 'Unsupported file format. Please use CSV.', 'error');
    }
}

// Process CSV import
function processCSVImport(file, importMode) {
    const reader = new FileReader();
    
    reader.onload = function(e) {
        try {
            const text = e.target.result;
            const lines = text.split('\n');
            
            if (lines.length < 2) {
                throw new Error('File appears to be empty');
            }
            
            // Parse header
            const header = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/"/g, ''));
            
            // Find column indices
            const dateIdx = header.findIndex(h => h.includes('date'));
            const descIdx = header.findIndex(h => h.includes('description') || h.includes('desc') || h.includes('memo'));
            const amountIdx = header.findIndex(h => h.includes('amount') || h.includes('value'));
            const typeIdx = header.findIndex(h => h.includes('type'));
            const categoryIdx = header.findIndex(h => h.includes('category') || h.includes('cat'));
            const refIdx = header.findIndex(h => h.includes('reference') || h.includes('ref'));
            
            if (dateIdx === -1 || amountIdx === -1) {
                throw new Error('CSV must have Date and Amount columns');
            }
            
            // Parse transactions
            const newTransactions = [];
            for (let i = 1; i < lines.length; i++) {
                const line = lines[i].trim();
                if (!line) continue;
                
                // Parse CSV line (handle quoted values)
                const values = parseCSVLine(line);
                
                const amount = Math.abs(parseFloat(values[amountIdx]?.replace(/[^0-9.-]/g, '')) || 0);
                if (amount === 0) continue;
                
                // Determine type
                let type = 'expense';
                if (typeIdx !== -1) {
                    const typeVal = (values[typeIdx] || '').toLowerCase();
                    if (typeVal.includes('income') || typeVal.includes('credit') || typeVal.includes('in')) {
                        type = 'income';
                    }
                } else {
                    // Check if original amount was positive
                    const rawAmount = parseFloat(values[amountIdx]?.replace(/[^0-9.-]/g, '')) || 0;
                    if (rawAmount > 0) type = 'income';
                }
                
                newTransactions.push({
                    id: 'imported_' + Date.now() + '_' + i,
                    date: parseImportDate(values[dateIdx]),
                    description: values[descIdx] || 'Imported transaction',
                    amount: amount,
                    type: type,
                    category: values[categoryIdx] || (type === 'income' ? 'Sales' : 'Operating Expenses'),
                    reference: values[refIdx] || '',
                    imported: true,
                    importDate: new Date().toISOString()
                });
            }
            
            if (newTransactions.length === 0) {
                throw new Error('No valid transactions found in file');
            }
            
            // Get current transactions
            const tenantId = typeof getCurrentTenantId === 'function' ? getCurrentTenantId() : 'default';
            let transactions = JSON.parse(localStorage.getItem(`transactions_${tenantId}`) || '[]');
            
            if (importMode === 'replace') {
                transactions = newTransactions;
            } else {
                transactions = [...transactions, ...newTransactions];
            }
            
            // Save
            localStorage.setItem(`transactions_${tenantId}`, JSON.stringify(transactions));
            
            closeModal('importOldTransModal');
            showNotification('Success', `Imported ${newTransactions.length} transactions successfully!`, 'success');
            
            // Refresh UI
            if (typeof loadTransactions === 'function') loadTransactions();
            if (typeof updateDashboard === 'function') updateDashboard();
            
        } catch (error) {
            console.error('Import error:', error);
            showNotification('Import Failed', error.message, 'error');
        }
    };
    
    reader.readAsText(file);
}

// Parse CSV line handling quoted values
function parseCSVLine(line) {
    const values = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        
        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            values.push(current.trim());
            current = '';
        } else {
            current += char;
        }
    }
    values.push(current.trim());
    
    return values;
}

// Parse various date formats
function parseImportDate(dateStr) {
    if (!dateStr) return new Date().toISOString().split('T')[0];
    
    dateStr = dateStr.replace(/"/g, '').trim();
    
    // Try various formats
    const formats = [
        /(\d{1,2})\/(\d{1,2})\/(\d{4})/, // DD/MM/YYYY or MM/DD/YYYY
        /(\d{4})-(\d{2})-(\d{2})/, // YYYY-MM-DD
        /(\d{1,2})-(\d{1,2})-(\d{4})/, // DD-MM-YYYY
    ];
    
    for (const format of formats) {
        const match = dateStr.match(format);
        if (match) {
            if (dateStr.includes('-') && match[1].length === 4) {
                return `${match[1]}-${match[2]}-${match[3]}`;
            } else {
                // Assume DD/MM/YYYY for Malaysian format
                return `${match[3]}-${match[2].padStart(2, '0')}-${match[1].padStart(2, '0')}`;
            }
        }
    }
    
    // Try native parsing
    const parsed = new Date(dateStr);
    if (!isNaN(parsed)) {
        return parsed.toISOString().split('T')[0];
    }
    
    return new Date().toISOString().split('T')[0];
}

// Export functions to window
window.importData = importData;
window.closeImportModal = closeImportModal;
window.processImport = processImport;
window.confirmResetTransactions = confirmResetTransactions;
window.confirmResetAll = confirmResetAll;
window.importOldTransactions = importOldTransactions;
window.processOldTransactionsImport = processOldTransactionsImport;
window.processCSVImport = processCSVImport;
window.parseCSVLine = parseCSVLine;
window.parseImportDate = parseImportDate;
window.updateVersionDisplay = updateVersionDisplay;
