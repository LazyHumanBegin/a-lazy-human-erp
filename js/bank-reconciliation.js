/**
 * EZCubic ERP - Bank Reconciliation Module
 * Match bank statements with recorded transactions
 * Access: Founder + Business Admin + Manager (with permission)
 */

// Module state
let bankStatementItems = [];
let erpTransactions = [];
let reconciledItems = [];
let unreconciledBank = [];
let unreconciledERP = [];

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

function renderBankReconciliation() {
    const content = document.getElementById('bankReconciliationContent');
    if (!content) return;
    
    // Get saved reconciliation history
    const tenantId = getCurrentTenantId ? getCurrentTenantId() : 'default';
    const savedHistory = JSON.parse(localStorage.getItem(`reconciliation_${tenantId}`) || '[]');
    
    content.innerHTML = `
        <div class="bank-recon-container">
            <!-- Step 1: Import Bank Statement -->
            <div class="recon-section">
                <div class="section-header">
                    <h3><i class="fas fa-file-import"></i> Step 1: Import Bank Statement</h3>
                </div>
                <div class="import-area">
                    <div style="display: flex; gap: 15px; align-items: center; flex-wrap: wrap;">
                        <div class="form-group" style="flex: 1; min-width: 200px;">
                            <label class="form-label">Bank Account</label>
                            <select id="reconBankAccount" class="form-control" onchange="loadERPTransactions()">
                                <option value="">-- Select Bank --</option>
                                <option value="maybank">Maybank</option>
                                <option value="cimb">CIMB</option>
                                <option value="public-bank">Public Bank</option>
                                <option value="rhb">RHB</option>
                                <option value="hong-leong">Hong Leong</option>
                                <option value="ambank">AmBank</option>
                                <option value="other">Other Bank</option>
                            </select>
                        </div>
                        <div class="form-group" style="flex: 1; min-width: 200px;">
                            <label class="form-label">Statement Period</label>
                            <input type="month" id="reconPeriod" class="form-control" onchange="loadERPTransactions()">
                        </div>
                        <div class="form-group">
                            <label class="form-label">&nbsp;</label>
                            <button class="btn-primary" onclick="uploadBankStatement()">
                                <i class="fas fa-upload"></i> Upload CSV
                            </button>
                        </div>
                    </div>
                    <div id="importHelp" style="background: #fef3c7; border: 1px solid #fbbf24; border-radius: 8px; padding: 12px; margin-top: 15px; font-size: 12px;">
                        <strong style="color: #92400e;"><i class="fas fa-info-circle"></i> CSV Format Required:</strong>
                        <div style="color: #78350f; margin-top: 8px;">
                            Date, Description, Debit, Credit, Balance<br>
                            <span style="color: #a16207;">Example: 01/01/2025, "Payment from Customer ABC", , 500.00, 15000.00</span>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Step 2: Match Transactions -->
            <div class="recon-section" style="margin-top: 20px;">
                <div class="section-header">
                    <h3><i class="fas fa-link"></i> Step 2: Match Transactions</h3>
                    <div style="display: flex; gap: 10px;">
                        <button class="btn-outline btn-sm" onclick="autoMatchTransactions()" id="autoMatchBtn" disabled>
                            <i class="fas fa-magic"></i> Auto-Match
                        </button>
                        <button class="btn-outline btn-sm" onclick="clearMatches()">
                            <i class="fas fa-eraser"></i> Clear All
                        </button>
                    </div>
                </div>
                
                <div class="recon-grid">
                    <!-- Bank Statement Column -->
                    <div class="recon-column">
                        <div class="column-header" style="background: #3b82f6;">
                            <i class="fas fa-university"></i> Bank Statement
                            <span id="bankItemCount" class="item-count">0 items</span>
                        </div>
                        <div id="bankStatementList" class="transaction-list">
                            <div class="empty-state">
                                <i class="fas fa-file-csv"></i>
                                <p>Upload a bank statement to begin</p>
                            </div>
                        </div>
                    </div>
                    
                    <!-- ERP Transactions Column -->
                    <div class="recon-column">
                        <div class="column-header" style="background: #10b981;">
                            <i class="fas fa-database"></i> ERP Records
                            <span id="erpItemCount" class="item-count">0 items</span>
                        </div>
                        <div id="erpTransactionList" class="transaction-list">
                            <div class="empty-state">
                                <i class="fas fa-database"></i>
                                <p>Select bank and period to load transactions</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Step 3: Reconciliation Summary -->
            <div class="recon-section" style="margin-top: 20px;">
                <div class="section-header">
                    <h3><i class="fas fa-clipboard-check"></i> Step 3: Reconciliation Summary</h3>
                    <button class="btn-primary" onclick="completeReconciliation()" id="completeReconBtn" disabled>
                        <i class="fas fa-check-circle"></i> Complete Reconciliation
                    </button>
                </div>
                
                <div class="summary-cards">
                    <div class="summary-card" style="border-color: #10b981;">
                        <div class="summary-icon" style="background: #10b981;"><i class="fas fa-check"></i></div>
                        <div class="summary-content">
                            <h4>Matched</h4>
                            <div class="summary-value" id="matchedCount">0</div>
                            <div class="summary-amount" id="matchedAmount">RM 0.00</div>
                        </div>
                    </div>
                    <div class="summary-card" style="border-color: #3b82f6;">
                        <div class="summary-icon" style="background: #3b82f6;"><i class="fas fa-university"></i></div>
                        <div class="summary-content">
                            <h4>Unmatched Bank</h4>
                            <div class="summary-value" id="unmatchedBankCount">0</div>
                            <div class="summary-amount" id="unmatchedBankAmount">RM 0.00</div>
                        </div>
                    </div>
                    <div class="summary-card" style="border-color: #f59e0b;">
                        <div class="summary-icon" style="background: #f59e0b;"><i class="fas fa-database"></i></div>
                        <div class="summary-content">
                            <h4>Unmatched ERP</h4>
                            <div class="summary-value" id="unmatchedERPCount">0</div>
                            <div class="summary-amount" id="unmatchedERPAmount">RM 0.00</div>
                        </div>
                    </div>
                    <div class="summary-card" style="border-color: #ef4444;">
                        <div class="summary-icon" style="background: #ef4444;"><i class="fas fa-exclamation-triangle"></i></div>
                        <div class="summary-content">
                            <h4>Difference</h4>
                            <div class="summary-value" id="differenceLabel">-</div>
                            <div class="summary-amount" id="differenceAmount">RM 0.00</div>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Reconciliation History -->
            <div class="recon-section" style="margin-top: 20px;">
                <div class="section-header">
                    <h3><i class="fas fa-history"></i> Reconciliation History</h3>
                </div>
                <div id="reconHistoryContent">
                    ${savedHistory.length > 0 ? renderReconciliationHistory(savedHistory) : `
                        <div class="empty-state" style="padding: 30px;">
                            <i class="fas fa-history" style="font-size: 36px; color: #64748b;"></i>
                            <p style="color: #94a3b8; margin-top: 10px;">No reconciliation history yet</p>
                        </div>
                    `}
                </div>
            </div>
        </div>
    `;
    
    // Set default period to current month
    const periodInput = document.getElementById('reconPeriod');
    if (periodInput) {
        const now = new Date();
        periodInput.value = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    }
}

function renderReconciliationHistory(history) {
    return `
        <table class="data-table">
            <thead>
                <tr>
                    <th>Date</th>
                    <th>Bank</th>
                    <th>Period</th>
                    <th>Matched</th>
                    <th>Unmatched</th>
                    <th>Difference</th>
                    <th>Status</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                ${history.slice(-10).reverse().map(item => `
                    <tr>
                        <td>${new Date(item.date).toLocaleDateString()}</td>
                        <td>${item.bank}</td>
                        <td>${item.period}</td>
                        <td style="color: #10b981;">${item.matchedCount}</td>
                        <td style="color: #f59e0b;">${item.unmatchedCount}</td>
                        <td style="color: ${item.difference === 0 ? '#10b981' : '#ef4444'};">
                            RM ${Math.abs(item.difference).toFixed(2)}
                        </td>
                        <td>
                            <span class="status-badge ${item.status === 'completed' ? 'success' : 'warning'}">
                                ${item.status}
                            </span>
                        </td>
                        <td>
                            <button class="btn-icon" onclick="viewReconciliationReport('${item.id}')" title="View Report">
                                <i class="fas fa-eye"></i>
                            </button>
                            <button class="btn-icon" onclick="exportReconciliationReport('${item.id}')" title="Export">
                                <i class="fas fa-download"></i>
                            </button>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
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
                    date: parseDate(row[0]),
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
function parseDate(dateStr) {
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

// Render bank statement list
function renderBankStatementList() {
    const container = document.getElementById('bankStatementList');
    const countEl = document.getElementById('bankItemCount');
    
    if (!container) return;
    
    if (bankStatementItems.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-file-csv"></i>
                <p>Upload a bank statement to begin</p>
            </div>
        `;
        if (countEl) countEl.textContent = '0 items';
        return;
    }
    
    container.innerHTML = bankStatementItems.map(item => `
        <div class="recon-item ${item.matched ? 'matched' : ''}" 
             data-id="${item.id}"
             onclick="selectBankItem('${item.id}')">
            <div class="item-date">${item.date}</div>
            <div class="item-desc">${escapeHtml(item.description.substring(0, 40))}${item.description.length > 40 ? '...' : ''}</div>
            <div class="item-amount ${item.amount >= 0 ? 'positive' : 'negative'}">
                ${item.amount >= 0 ? '+' : ''}RM ${Math.abs(item.amount).toFixed(2)}
            </div>
            ${item.matched ? `<i class="fas fa-check-circle matched-icon"></i>` : ''}
        </div>
    `).join('');
    
    if (countEl) countEl.textContent = `${bankStatementItems.length} items`;
}

// Render ERP transaction list
function renderERPTransactionList() {
    const container = document.getElementById('erpTransactionList');
    const countEl = document.getElementById('erpItemCount');
    
    if (!container) return;
    
    if (erpTransactions.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-database"></i>
                <p>No transactions found for selected period</p>
            </div>
        `;
        if (countEl) countEl.textContent = '0 items';
        return;
    }
    
    container.innerHTML = erpTransactions.map(item => `
        <div class="recon-item ${item.matched ? 'matched' : ''}" 
             data-id="${item.id}"
             onclick="selectERPItem('${item.id}')">
            <div class="item-date">${item.date}</div>
            <div class="item-desc">${escapeHtml((item.description || item.reference || '').substring(0, 40))}</div>
            <div class="item-amount ${item.amount >= 0 ? 'positive' : 'negative'}">
                ${item.amount >= 0 ? '+' : ''}RM ${Math.abs(item.amount).toFixed(2)}
            </div>
            ${item.matched ? `<i class="fas fa-check-circle matched-icon"></i>` : ''}
        </div>
    `).join('');
    
    if (countEl) countEl.textContent = `${erpTransactions.length} items`;
}

// Selection state
let selectedBankItem = null;
let selectedERPItem = null;

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
    document.getElementById('matchedCount').textContent = matched.length;
    document.getElementById('matchedAmount').textContent = `RM ${matchedAmount.toFixed(2)}`;
    
    document.getElementById('unmatchedBankCount').textContent = unmatchedBank.length;
    document.getElementById('unmatchedBankAmount').textContent = `RM ${Math.abs(unmatchedBankAmount).toFixed(2)}`;
    
    document.getElementById('unmatchedERPCount').textContent = unmatchedERP.length;
    document.getElementById('unmatchedERPAmount').textContent = `RM ${Math.abs(unmatchedERPAmount).toFixed(2)}`;
    
    document.getElementById('differenceLabel').textContent = difference === 0 ? 'Balanced' : 'Variance';
    document.getElementById('differenceAmount').textContent = `RM ${Math.abs(difference).toFixed(2)}`;
    document.getElementById('differenceAmount').style.color = difference === 0 ? '#10b981' : '#ef4444';
    
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

// View reconciliation report
function viewReconciliationReport(recordId) {
    const tenantId = getCurrentTenantId ? getCurrentTenantId() : 'default';
    const history = JSON.parse(localStorage.getItem(`reconciliation_${tenantId}`) || '[]');
    const record = history.find(h => h.id === recordId);
    
    if (!record) {
        showNotification('Error', 'Record not found', 'error');
        return;
    }
    
    // Create modal
    let modal = document.getElementById('reconReportModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'reconReportModal';
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 800px;">
                <div class="modal-header">
                    <h3 class="modal-title">Reconciliation Report</h3>
                    <button class="modal-close" onclick="closeModal('reconReportModal')">&times;</button>
                </div>
                <div id="reconReportContent" style="padding: 20px; max-height: 70vh; overflow-y: auto;"></div>
                <div class="modal-footer">
                    <button class="btn-secondary" onclick="closeModal('reconReportModal')">Close</button>
                    <button class="btn-primary" onclick="exportReconciliationReport('${recordId}')">
                        <i class="fas fa-download"></i> Export PDF
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }
    
    document.getElementById('reconReportContent').innerHTML = `
        <div class="report-header" style="text-align: center; margin-bottom: 20px;">
            <h2>Bank Reconciliation Report</h2>
            <p style="color: #64748b;">
                ${record.bank.toUpperCase()} - ${record.period} | 
                Generated: ${new Date(record.date).toLocaleDateString()}
            </p>
        </div>
        
        <div class="report-summary" style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin-bottom: 20px;">
            <div style="background: #10b98120; padding: 15px; border-radius: 8px; text-align: center;">
                <div style="font-size: 24px; font-weight: bold; color: #10b981;">${record.matchedCount}</div>
                <div style="color: #64748b;">Matched</div>
            </div>
            <div style="background: #3b82f620; padding: 15px; border-radius: 8px; text-align: center;">
                <div style="font-size: 24px; font-weight: bold; color: #3b82f6;">${record.details?.unmatchedBank?.length || 0}</div>
                <div style="color: #64748b;">Bank Only</div>
            </div>
            <div style="background: #f59e0b20; padding: 15px; border-radius: 8px; text-align: center;">
                <div style="font-size: 24px; font-weight: bold; color: #f59e0b;">${record.details?.unmatchedERP?.length || 0}</div>
                <div style="color: #64748b;">ERP Only</div>
            </div>
            <div style="background: ${record.difference === 0 ? '#10b98120' : '#ef444420'}; padding: 15px; border-radius: 8px; text-align: center;">
                <div style="font-size: 24px; font-weight: bold; color: ${record.difference === 0 ? '#10b981' : '#ef4444'};">
                    RM ${Math.abs(record.difference).toFixed(2)}
                </div>
                <div style="color: #64748b;">Difference</div>
            </div>
        </div>
        
        ${record.details?.unmatchedBank?.length > 0 ? `
            <h4 style="margin-top: 20px;"><i class="fas fa-university"></i> Unmatched Bank Transactions</h4>
            <table class="data-table" style="margin-top: 10px;">
                <thead>
                    <tr><th>Date</th><th>Description</th><th>Amount</th></tr>
                </thead>
                <tbody>
                    ${record.details.unmatchedBank.map(item => `
                        <tr>
                            <td>${item.date}</td>
                            <td>${item.description}</td>
                            <td style="color: ${item.amount >= 0 ? '#10b981' : '#ef4444'};">
                                RM ${Math.abs(item.amount).toFixed(2)}
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        ` : ''}
        
        ${record.details?.unmatchedERP?.length > 0 ? `
            <h4 style="margin-top: 20px;"><i class="fas fa-database"></i> Unmatched ERP Transactions</h4>
            <table class="data-table" style="margin-top: 10px;">
                <thead>
                    <tr><th>Date</th><th>Description</th><th>Amount</th></tr>
                </thead>
                <tbody>
                    ${record.details.unmatchedERP.map(item => `
                        <tr>
                            <td>${item.date}</td>
                            <td>${item.description || item.reference || '-'}</td>
                            <td style="color: ${item.amount >= 0 ? '#10b981' : '#ef4444'};">
                                RM ${Math.abs(item.amount).toFixed(2)}
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        ` : ''}
    `;
    
    modal.style.display = '';
    modal.classList.add('show');
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
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Export functions
window.initializeBankReconciliation = initializeBankReconciliation;
window.uploadBankStatement = uploadBankStatement;
window.loadERPTransactions = loadERPTransactions;
window.selectBankItem = selectBankItem;
window.selectERPItem = selectERPItem;
window.autoMatchTransactions = autoMatchTransactions;
window.clearMatches = clearMatches;
window.completeReconciliation = completeReconciliation;
window.viewReconciliationReport = viewReconciliationReport;
window.exportReconciliationReport = exportReconciliationReport;
