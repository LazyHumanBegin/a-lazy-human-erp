/**
 * EZCubic Smart Accounting - Bank Reconciliation UI Module
 * Rendering: Main interface, lists, history, report modal
 * Split from bank-reconciliation.js for v2.3.1
 */

// Render main bank reconciliation interface
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

// Render reconciliation history table
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

// Render bank statement list
function renderBankStatementList() {
    const container = document.getElementById('bankStatementList');
    const countEl = document.getElementById('bankItemCount');
    const bankStatementItems = window.getBankStatementItems ? window.getBankStatementItems() : [];
    
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
    
    const escapeHtml = window.escapeReconHtml || function(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    };
    
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
    const erpTransactions = window.getErpTransactions ? window.getErpTransactions() : [];
    
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
    
    const escapeHtml = window.escapeReconHtml || function(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    };
    
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

// Export functions to window
window.renderBankReconciliation = renderBankReconciliation;
window.renderReconciliationHistory = renderReconciliationHistory;
window.renderBankStatementList = renderBankStatementList;
window.renderERPTransactionList = renderERPTransactionList;
window.viewReconciliationReport = viewReconciliationReport;
