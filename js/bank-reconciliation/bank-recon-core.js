/**
 * EZCubic Smart Accounting - Bank Reconciliation Core Module
 * Data operations: CSV parsing, matching logic, state management
 * Split from bank-reconciliation.js for v2.3.1
 */

// Module state
let bankStatementItems = [];
let erpTransactions = [];
let reconciledItems = [];
let unreconciledBank = [];
let unreconciledERP = [];

// Selection state
let selectedBankItem = null;
let selectedERPItem = null;

// Initialize Bank Reconciliation
function initializeBankReconciliation() {
    const content = document.getElementById('bankReconciliationContent');
    if (!content) return;
    
    // Check access permission - try both possible storage keys
    let currentUser = JSON.parse(localStorage.getItem('ezcubic_current_user'));
    if (!currentUser) {
        currentUser = JSON.parse(localStorage.getItem('currentUser'));
    }
    console.log('[Bank Reconciliation] Current user:', currentUser);
    
    if (!currentUser) {
        content.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #94a3b8;">
                <i class="fas fa-lock" style="font-size: 48px; margin-bottom: 16px;"></i>
                <h3>Please log in to access Bank Reconciliation</h3>
            </div>
        `;
        return;
    }
    
    // Check role permission - handle various ways the role might be stored
    const userRole = (currentUser.role || '').toLowerCase().replace(/\s+/g, '_');
    const isFounder = currentUser.isFounder === true || 
                      currentUser.id === 'founder_001' || 
                      currentUser.email === 'founder@ezcubic.com' ||
                      userRole === 'founder';
    const isBusinessAdmin = userRole === 'business_admin';
    const hasManagerPermission = userRole === 'manager' && 
        currentUser.permissions && 
        currentUser.permissions.includes('bank-reconciliation');
    
    console.log('[Bank Reconciliation] Role:', userRole, 'isFounder:', isFounder, 'isBusinessAdmin:', isBusinessAdmin);
    
    if (!isFounder && !isBusinessAdmin && !hasManagerPermission) {
        content.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #ef4444;">
                <i class="fas fa-ban" style="font-size: 48px; margin-bottom: 16px;"></i>
                <h3>Access Denied</h3>
                <p style="color: #94a3b8;">Bank Reconciliation is only available for Founder, Business Admin, or Managers with permission.</p>
                <p style="color: #64748b; font-size: 12px; margin-top: 10px;">Your role: ${currentUser.role || 'Not set'}</p>
            </div>
        `;
        return;
    }
    
    // Render main interface
    renderBankReconciliation();
}

// Upload bank statement CSV
function uploadBankStatement() {
    const bankAccount = document.getElementById('reconBankAccount')?.value;
    
    if (!bankAccount) {
        // Show error notification - need to select bank first
        if (typeof showToast === 'function') {
            showToast('Please select a bank account first before uploading CSV file', 'error');
        } else if (typeof showNotification === 'function') {
            showNotification('Bank Required', 'Please select a bank account first before uploading CSV file', 'error');
        } else {
            alert('Please select a bank account first before uploading CSV file');
        }
        
        // Highlight the bank dropdown to draw attention
        const bankSelect = document.getElementById('reconBankAccount');
        if (bankSelect) {
            bankSelect.style.border = '2px solid #ef4444';
            bankSelect.style.animation = 'shake 0.5s';
            bankSelect.focus();
            setTimeout(() => {
                bankSelect.style.border = '';
                bankSelect.style.animation = '';
            }, 2000);
        }
        return;
    }
    
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.csv';
    
    input.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        try {
            const text = await file.text();
            const rows = parseCSV(text);
            
            if (rows.length < 2) {
                throw new Error('CSV file appears to be empty or invalid');
            }
            
            // Parse bank statement items
            bankStatementItems = [];
            for (let i = 1; i < rows.length; i++) {
                const row = rows[i];
                if (row.length < 4) continue;
                
                const item = {
                    id: `bank_${i}`,
                    date: parseReconDate(row[0]),
                    description: row[1]?.trim() || '',
                    debit: parseFloat(row[2]) || 0,
                    credit: parseFloat(row[3]) || 0,
                    balance: parseFloat(row[4]) || 0,
                    matched: false,
                    matchedWith: null
                };
                
                item.amount = item.credit - item.debit;
                bankStatementItems.push(item);
            }
            
            renderBankStatementList();
            updateSummary();
            
            // Enable auto-match button
            const autoMatchBtn = document.getElementById('autoMatchBtn');
            if (autoMatchBtn) autoMatchBtn.disabled = false;
            
            showNotification('Success', `Loaded ${bankStatementItems.length} bank transactions`, 'success');
            
        } catch (error) {
            console.error('CSV parse error:', error);
            showNotification('Error', 'Failed to parse CSV: ' + error.message, 'error');
        }
    };
    
    input.click();
}

// Parse CSV text
function parseCSV(text) {
    const rows = [];
    const lines = text.split('\n');
    
    for (const line of lines) {
        const row = [];
        let cell = '';
        let inQuotes = false;
        
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            
            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                row.push(cell.trim());
                cell = '';
            } else {
                cell += char;
            }
        }
        row.push(cell.trim());
        
        if (row.some(c => c)) rows.push(row);
    }
    
    return rows;
}

// Parse various date formats
function parseReconDate(dateStr) {
    if (!dateStr) return '';
    
    // Try various formats
    const formats = [
        /(\d{1,2})\/(\d{1,2})\/(\d{4})/, // DD/MM/YYYY
        /(\d{4})-(\d{2})-(\d{2})/, // YYYY-MM-DD
        /(\d{1,2})-(\d{1,2})-(\d{4})/, // DD-MM-YYYY
    ];
    
    for (const format of formats) {
        const match = dateStr.match(format);
        if (match) {
            // Determine format and create date
            if (dateStr.includes('-') && match[1].length === 4) {
                return `${match[1]}-${match[2]}-${match[3]}`; // YYYY-MM-DD
            } else {
                return `${match[3]}-${match[2].padStart(2, '0')}-${match[1].padStart(2, '0')}`; // Convert to YYYY-MM-DD
            }
        }
    }
    
    return dateStr;
}

// Load ERP transactions for selected period
function loadERPTransactions() {
    const period = document.getElementById('reconPeriod')?.value;
    if (!period) return;
    
    // Get transactions from ERP
    const tenantId = getCurrentTenantId ? getCurrentTenantId() : 'default';
    const allTransactions = JSON.parse(localStorage.getItem(`transactions_${tenantId}`) || '[]');
    
    // Filter by period (month)
    const [year, month] = period.split('-');
    erpTransactions = allTransactions.filter(t => {
        const txDate = new Date(t.date);
        return txDate.getFullYear() === parseInt(year) && 
               (txDate.getMonth() + 1) === parseInt(month);
    }).map(t => ({
        id: t.id,
        date: t.date,
        description: t.description || t.reference || '',
        amount: t.type === 'income' || t.type === 'inflow' ? parseFloat(t.amount) : -parseFloat(t.amount),
        type: t.type,
        category: t.category,
        reference: t.reference,
        matched: false,
        matchedWith: null
    }));
    
    renderERPTransactionList();
    updateSummary();
}

// Select bank item for matching
function selectBankItem(itemId) {
    // Toggle selection
    if (selectedBankItem === itemId) {
        selectedBankItem = null;
    } else {
        selectedBankItem = itemId;
    }
    
    // Update UI
    document.querySelectorAll('#bankStatementList .recon-item').forEach(el => {
        el.classList.toggle('selected', el.dataset.id === selectedBankItem);
    });
    
    // If both selected, try to match
    if (selectedBankItem && selectedERPItem) {
        matchItems(selectedBankItem, selectedERPItem);
    }
}

// Select ERP item for matching
function selectERPItem(itemId) {
    // Toggle selection
    if (selectedERPItem === itemId) {
        selectedERPItem = null;
    } else {
        selectedERPItem = itemId;
    }
    
    // Update UI
    document.querySelectorAll('#erpTransactionList .recon-item').forEach(el => {
        el.classList.toggle('selected', el.dataset.id === selectedERPItem);
    });
    
    // If both selected, try to match
    if (selectedBankItem && selectedERPItem) {
        matchItems(selectedBankItem, selectedERPItem);
    }
}

// Match two items
function matchItems(bankId, erpId) {
    const bankItem = bankStatementItems.find(i => i.id === bankId);
    const erpItem = erpTransactions.find(i => i.id === erpId);
    
    if (!bankItem || !erpItem) return;
    
    // Check if amounts are close (within RM 0.01)
    const amountDiff = Math.abs(bankItem.amount - erpItem.amount);
    if (amountDiff > 0.01) {
        const confirmed = confirm(
            `Amount difference: RM ${amountDiff.toFixed(2)}\n\n` +
            `Bank: RM ${bankItem.amount.toFixed(2)}\n` +
            `ERP: RM ${erpItem.amount.toFixed(2)}\n\n` +
            `Match anyway?`
        );
        if (!confirmed) {
            selectedBankItem = null;
            selectedERPItem = null;
            renderBankStatementList();
            renderERPTransactionList();
            return;
        }
    }
    
    // Mark as matched
    bankItem.matched = true;
    bankItem.matchedWith = erpId;
    erpItem.matched = true;
    erpItem.matchedWith = bankId;
    
    reconciledItems.push({
        bankItem,
        erpItem,
        difference: bankItem.amount - erpItem.amount
    });
    
    // Reset selection
    selectedBankItem = null;
    selectedERPItem = null;
    
    // Update UI
    renderBankStatementList();
    renderERPTransactionList();
    updateSummary();
    
    showNotification('Matched', 'Transaction matched successfully', 'success');
}

// Auto-match transactions
function autoMatchTransactions() {
    let matchCount = 0;
    
    for (const bankItem of bankStatementItems) {
        if (bankItem.matched) continue;
        
        // Find matching ERP transaction (same amount, close date)
        for (const erpItem of erpTransactions) {
            if (erpItem.matched) continue;
            
            // Check amount match (within 0.01)
            if (Math.abs(bankItem.amount - erpItem.amount) <= 0.01) {
                // Check date is within 3 days
                const bankDate = new Date(bankItem.date);
                const erpDate = new Date(erpItem.date);
                const daysDiff = Math.abs((bankDate - erpDate) / (1000 * 60 * 60 * 24));
                
                if (daysDiff <= 3) {
                    // Match them
                    bankItem.matched = true;
                    bankItem.matchedWith = erpItem.id;
                    erpItem.matched = true;
                    erpItem.matchedWith = bankItem.id;
                    
                    reconciledItems.push({
                        bankItem,
                        erpItem,
                        difference: bankItem.amount - erpItem.amount
                    });
                    
                    matchCount++;
                    break;
                }
            }
        }
    }
    
    renderBankStatementList();
    renderERPTransactionList();
    updateSummary();
    
    if (matchCount > 0) {
        showNotification('Auto-Match Complete', `${matchCount} transactions matched automatically`, 'success');
    } else {
        showNotification('No Matches', 'No automatic matches found. Try matching manually.', 'warning');
    }
}

// Clear all matches
function clearMatches() {
    if (!confirm('Clear all matched transactions?')) return;
    
    bankStatementItems.forEach(item => {
        item.matched = false;
        item.matchedWith = null;
    });
    
    erpTransactions.forEach(item => {
        item.matched = false;
        item.matchedWith = null;
    });
    
    reconciledItems = [];
    selectedBankItem = null;
    selectedERPItem = null;
    
    renderBankStatementList();
    renderERPTransactionList();
    updateSummary();
    
    showNotification('Cleared', 'All matches cleared', 'info');
}

// Update reconciliation summary
function updateSummary() {
    const matched = reconciledItems;
    const unmatchedBank = bankStatementItems.filter(i => !i.matched);
    const unmatchedERP = erpTransactions.filter(i => !i.matched);
    
    // Calculate amounts
    const matchedAmount = matched.reduce((sum, m) => sum + Math.abs(m.bankItem.amount), 0);
    const unmatchedBankAmount = unmatchedBank.reduce((sum, i) => sum + i.amount, 0);
    const unmatchedERPAmount = unmatchedERP.reduce((sum, i) => sum + i.amount, 0);
    const difference = unmatchedBankAmount - unmatchedERPAmount;
    
    // Update UI
    const matchedCountEl = document.getElementById('matchedCount');
    const matchedAmountEl = document.getElementById('matchedAmount');
    const unmatchedBankCountEl = document.getElementById('unmatchedBankCount');
    const unmatchedBankAmountEl = document.getElementById('unmatchedBankAmount');
    const unmatchedERPCountEl = document.getElementById('unmatchedERPCount');
    const unmatchedERPAmountEl = document.getElementById('unmatchedERPAmount');
    const differenceLabelEl = document.getElementById('differenceLabel');
    const differenceAmountEl = document.getElementById('differenceAmount');
    
    if (matchedCountEl) matchedCountEl.textContent = matched.length;
    if (matchedAmountEl) matchedAmountEl.textContent = `RM ${matchedAmount.toFixed(2)}`;
    
    if (unmatchedBankCountEl) unmatchedBankCountEl.textContent = unmatchedBank.length;
    if (unmatchedBankAmountEl) unmatchedBankAmountEl.textContent = `RM ${Math.abs(unmatchedBankAmount).toFixed(2)}`;
    
    if (unmatchedERPCountEl) unmatchedERPCountEl.textContent = unmatchedERP.length;
    if (unmatchedERPAmountEl) unmatchedERPAmountEl.textContent = `RM ${Math.abs(unmatchedERPAmount).toFixed(2)}`;
    
    if (differenceLabelEl) differenceLabelEl.textContent = difference === 0 ? 'Balanced' : 'Variance';
    if (differenceAmountEl) {
        differenceAmountEl.textContent = `RM ${Math.abs(difference).toFixed(2)}`;
        differenceAmountEl.style.color = difference === 0 ? '#10b981' : '#ef4444';
    }
    
    // Enable complete button if there are matches
    const completeBtn = document.getElementById('completeReconBtn');
    if (completeBtn) {
        completeBtn.disabled = matched.length === 0;
    }
}

// Complete reconciliation
function completeReconciliation() {
    const bankAccount = document.getElementById('reconBankAccount')?.value;
    const period = document.getElementById('reconPeriod')?.value;
    
    if (!bankAccount || !period) {
        showNotification('Error', 'Please select bank and period', 'error');
        return;
    }
    
    const unmatchedBank = bankStatementItems.filter(i => !i.matched);
    const unmatchedERP = erpTransactions.filter(i => !i.matched);
    const difference = unmatchedBank.reduce((sum, i) => sum + i.amount, 0) - 
                      unmatchedERP.reduce((sum, i) => sum + i.amount, 0);
    
    const confirmed = confirm(
        `Complete Reconciliation?\n\n` +
        `Matched: ${reconciledItems.length}\n` +
        `Unmatched Bank: ${unmatchedBank.length}\n` +
        `Unmatched ERP: ${unmatchedERP.length}\n` +
        `Difference: RM ${Math.abs(difference).toFixed(2)}`
    );
    
    if (!confirmed) return;
    
    // Save reconciliation record
    const tenantId = getCurrentTenantId ? getCurrentTenantId() : 'default';
    const history = JSON.parse(localStorage.getItem(`reconciliation_${tenantId}`) || '[]');
    
    const record = {
        id: `recon_${Date.now()}`,
        date: new Date().toISOString(),
        bank: bankAccount,
        period: period,
        matchedCount: reconciledItems.length,
        unmatchedCount: unmatchedBank.length + unmatchedERP.length,
        difference: difference,
        status: 'completed',
        details: {
            matched: reconciledItems,
            unmatchedBank: unmatchedBank,
            unmatchedERP: unmatchedERP
        }
    };
    
    history.push(record);
    localStorage.setItem(`reconciliation_${tenantId}`, JSON.stringify(history));
    
    showNotification('Success', 'Reconciliation completed and saved', 'success');
    
    // Reset and refresh
    bankStatementItems = [];
    erpTransactions = [];
    reconciledItems = [];
    renderBankReconciliation();
}

// Export reconciliation report
function exportReconciliationReport(recordId) {
    const tenantId = getCurrentTenantId ? getCurrentTenantId() : 'default';
    const history = JSON.parse(localStorage.getItem(`reconciliation_${tenantId}`) || '[]');
    const record = history.find(h => h.id === recordId);
    
    if (!record) {
        showNotification('Error', 'Record not found', 'error');
        return;
    }
    
    // Create CSV export
    let csv = 'Bank Reconciliation Report\n';
    csv += `Bank,${record.bank}\n`;
    csv += `Period,${record.period}\n`;
    csv += `Date,${new Date(record.date).toLocaleDateString()}\n`;
    csv += `Matched,${record.matchedCount}\n`;
    csv += `Unmatched,${record.unmatchedCount}\n`;
    csv += `Difference,RM ${Math.abs(record.difference).toFixed(2)}\n\n`;
    
    if (record.details?.unmatchedBank?.length > 0) {
        csv += 'Unmatched Bank Transactions\n';
        csv += 'Date,Description,Amount\n';
        record.details.unmatchedBank.forEach(item => {
            csv += `${item.date},"${item.description}",${item.amount.toFixed(2)}\n`;
        });
        csv += '\n';
    }
    
    if (record.details?.unmatchedERP?.length > 0) {
        csv += 'Unmatched ERP Transactions\n';
        csv += 'Date,Description,Amount\n';
        record.details.unmatchedERP.forEach(item => {
            csv += `${item.date},"${item.description || item.reference || ''}",${item.amount.toFixed(2)}\n`;
        });
    }
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `reconciliation_${record.bank}_${record.period}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showNotification('Exported', 'Report exported as CSV', 'success');
}

// Helper: escape HTML
function escapeReconHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Export functions to window
window.initializeBankReconciliation = initializeBankReconciliation;
window.uploadBankStatement = uploadBankStatement;
window.loadERPTransactions = loadERPTransactions;
window.selectBankItem = selectBankItem;
window.selectERPItem = selectERPItem;
window.matchItems = matchItems;
window.autoMatchTransactions = autoMatchTransactions;
window.clearMatches = clearMatches;
window.updateSummary = updateSummary;
window.completeReconciliation = completeReconciliation;
window.exportReconciliationReport = exportReconciliationReport;
window.parseCSV = parseCSV;
window.parseReconDate = parseReconDate;
window.escapeReconHtml = escapeReconHtml;

// Export state for UI module
window.getBankStatementItems = () => bankStatementItems;
window.getErpTransactions = () => erpTransactions;
window.getReconciledItems = () => reconciledItems;
