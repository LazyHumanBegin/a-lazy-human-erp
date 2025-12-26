// ==================== CHART OF ACCOUNTS UI - v2.3.0 ====================
// Rendering, modals, filtering, and UI interactions
// Split from chart-of-accounts.js for better maintainability

// ==================== MAIN RENDER ====================
function renderChartOfAccountsContent() {
    const contentArea = document.getElementById('content-area');
    if (!contentArea) return;
    
    // Initialize if needed
    if (chartOfAccounts.length === 0) {
        loadChartOfAccounts();
    }
    
    const html = `
        <div class="coa-container">
            <!-- Header -->
            <div class="section-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <div>
                    <h2 style="margin: 0; color: #1e293b;">
                        <i class="fas fa-sitemap" style="color: #2563eb; margin-right: 10px;"></i>
                        Chart of Accounts
                    </h2>
                    <p style="color: #64748b; margin: 5px 0 0 0;">Malaysian Standard Chart of Accounts (MPERS/MFRS Compliant)</p>
                </div>
                <div style="display: flex; gap: 10px;">
                    <button class="btn-secondary" onclick="showTrialBalanceModal()">
                        <i class="fas fa-balance-scale"></i> Trial Balance
                    </button>
                    <button class="btn-primary" onclick="showAddAccountModal()">
                        <i class="fas fa-plus"></i> Add Account
                    </button>
                </div>
            </div>
            
            <!-- Search & Filter -->
            <div style="display: flex; gap: 15px; margin-bottom: 20px; flex-wrap: wrap;">
                <div style="flex: 1; min-width: 200px;">
                    <input type="text" id="coaSearchInput" class="form-control" placeholder="Search accounts..." 
                        oninput="filterChartOfAccounts()">
                </div>
                <select id="coaTypeFilter" class="form-control" style="width: 180px;" onchange="filterChartOfAccounts()">
                    <option value="">All Types</option>
                    <option value="asset">Assets</option>
                    <option value="liability">Liabilities</option>
                    <option value="equity">Equity</option>
                    <option value="revenue">Revenue</option>
                    <option value="expense">Expenses</option>
                </select>
                <label style="display: flex; align-items: center; gap: 8px; color: #64748b;">
                    <input type="checkbox" id="coaShowInactive" onchange="filterChartOfAccounts()">
                    Show Inactive
                </label>
            </div>
            
            <!-- Account Type Tabs -->
            <div class="coa-tabs" style="display: flex; gap: 10px; margin-bottom: 20px; flex-wrap: wrap;">
                ${Object.values(ACCOUNT_TYPES).map(type => `
                    <button class="coa-tab" onclick="scrollToAccountType('${type.id}')" 
                        style="padding: 10px 20px; border: none; border-radius: 8px; cursor: pointer; background: ${type.color}15; color: ${type.color}; font-weight: 500; display: flex; align-items: center; gap: 8px;">
                        <i class="fas ${type.icon}"></i>
                        ${type.name}
                        <span style="background: ${type.color}; color: white; padding: 2px 8px; border-radius: 10px; font-size: 11px;">
                            ${chartOfAccounts.filter(a => a.type === type.id && !a.isHeader).length}
                        </span>
                    </button>
                `).join('')}
            </div>
            
            <!-- Accounts List -->
            <div id="coaAccountsList" class="coa-accounts-list">
                ${renderAccountsList()}
            </div>
        </div>
    `;
    
    contentArea.innerHTML = html;
}

// ==================== ACCOUNTS LIST RENDERING ====================
function renderAccountsList() {
    const searchTerm = document.getElementById('coaSearchInput')?.value?.toLowerCase() || '';
    const typeFilter = document.getElementById('coaTypeFilter')?.value || '';
    const showInactive = document.getElementById('coaShowInactive')?.checked || false;
    
    let filteredAccounts = chartOfAccounts.filter(acc => {
        if (!showInactive && acc.isActive === false) return false;
        if (typeFilter && acc.type !== typeFilter) return false;
        if (searchTerm && !acc.name.toLowerCase().includes(searchTerm) && !acc.code.includes(searchTerm)) return false;
        return true;
    });
    
    let html = '';
    let currentType = '';
    
    filteredAccounts.forEach(account => {
        // Type header
        if (account.type !== currentType) {
            currentType = account.type;
            const typeInfo = ACCOUNT_TYPES[currentType.toUpperCase()];
            if (typeInfo) {
                html += `
                    <div id="coa-type-${currentType}" class="coa-type-header" style="background: ${typeInfo.color}15; padding: 15px; border-radius: 8px; margin: 20px 0 10px 0; border-left: 4px solid ${typeInfo.color};">
                        <h3 style="margin: 0; color: ${typeInfo.color}; display: flex; align-items: center; gap: 10px;">
                            <i class="fas ${typeInfo.icon}"></i>
                            ${typeInfo.name}
                        </h3>
                        <p style="margin: 5px 0 0 0; color: #64748b; font-size: 13px;">${typeInfo.description}</p>
                    </div>
                `;
            }
        }
        
        // Account row
        const indent = account.parent ? (getAccountLevel(account.code) * 20) : 0;
        const typeInfo = ACCOUNT_TYPES[account.type.toUpperCase()];
        
        html += `
            <div class="coa-account-row ${account.isHeader ? 'coa-header-row' : ''} ${account.isActive === false ? 'coa-inactive' : ''}" 
                style="display: flex; align-items: center; padding: 12px 15px; border-bottom: 1px solid #e2e8f0; ${account.isHeader ? 'background: #f8fafc; font-weight: 600;' : ''}"
                data-code="${account.code}">
                <div style="width: 100px; color: ${typeInfo?.color || '#64748b'}; font-family: monospace; font-weight: 600;">
                    ${account.code}
                </div>
                <div style="flex: 1; padding-left: ${indent}px;">
                    ${account.isHeader ? '<i class="fas fa-folder" style="color: #94a3b8; margin-right: 8px;"></i>' : ''}
                    ${escapeHTML(account.name)}
                    ${account.isContra ? '<span style="font-size: 10px; background: #fef3c7; color: #92400e; padding: 2px 6px; border-radius: 4px; margin-left: 8px;">Contra</span>' : ''}
                    ${account.isSystem ? '<span style="font-size: 10px; background: #e0e7ff; color: #4338ca; padding: 2px 6px; border-radius: 4px; margin-left: 8px;">System</span>' : ''}
                    ${account.isActive === false ? '<span style="font-size: 10px; background: #fee2e2; color: #dc2626; padding: 2px 6px; border-radius: 4px; margin-left: 8px;">Inactive</span>' : ''}
                </div>
                <div style="width: 150px; text-align: right; font-family: monospace; ${(account.balance || 0) < 0 ? 'color: #dc2626;' : ''}">
                    ${account.isHeader ? '' : formatCurrency(account.balance || 0)}
                </div>
                <div style="width: 100px; text-align: right;">
                    ${!account.isSystem ? `
                        <button onclick="showEditAccountModal('${account.code}')" class="btn-icon" title="Edit">
                            <i class="fas fa-edit"></i>
                        </button>
                        ${account.isActive === false ? `
                            <button onclick="activateAccount('${account.code}'); renderChartOfAccountsContent();" class="btn-icon" title="Activate" style="color: #10b981;">
                                <i class="fas fa-check-circle"></i>
                            </button>
                        ` : `
                            <button onclick="deactivateAccount('${account.code}'); renderChartOfAccountsContent();" class="btn-icon" title="Deactivate" style="color: #ef4444;">
                                <i class="fas fa-ban"></i>
                            </button>
                        `}
                    ` : ''}
                </div>
            </div>
        `;
    });
    
    return html || '<div style="padding: 40px; text-align: center; color: #94a3b8;">No accounts found</div>';
}

// ==================== FILTER & NAVIGATION ====================
function filterChartOfAccounts() {
    const listContainer = document.getElementById('coaAccountsList');
    if (listContainer) {
        listContainer.innerHTML = renderAccountsList();
    }
}

function scrollToAccountType(type) {
    const element = document.getElementById(`coa-type-${type}`);
    if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

// ==================== ADD ACCOUNT MODAL ====================
function showAddAccountModal() {
    // Remove existing modal if any
    const existing = document.getElementById('addAccountModal');
    if (existing) existing.remove();
    
    const modal = document.createElement('div');
    modal.id = 'addAccountModal';
    modal.className = 'modal';
    modal.style.display = 'flex';
    modal.dataset.dynamic = 'true';
    
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 500px;">
            <div class="modal-header">
                <h3 class="modal-title"><i class="fas fa-plus-circle"></i> Add New Account</h3>
                <button class="modal-close" onclick="closeModal('addAccountModal')">&times;</button>
            </div>
            <div class="modal-body">
                <div class="form-group">
                    <label class="form-label">Account Code *</label>
                    <input type="text" id="newAccountCode" class="form-control" placeholder="e.g., 1115" maxlength="10">
                    <small style="color: #64748b;">Use 4-digit codes following the structure (1xxx=Asset, 2xxx=Liability, etc.)</small>
                </div>
                <div class="form-group">
                    <label class="form-label">Account Name *</label>
                    <input type="text" id="newAccountName" class="form-control" placeholder="e.g., Bank - Alliance">
                </div>
                <div class="form-group">
                    <label class="form-label">Account Type *</label>
                    <select id="newAccountType" class="form-control" onchange="updateParentOptions()">
                        <option value="">Select Type</option>
                        ${Object.values(ACCOUNT_TYPES).map(t => `<option value="${t.id}">${t.name}</option>`).join('')}
                    </select>
                </div>
                <div class="form-group">
                    <label class="form-label">Parent Account</label>
                    <select id="newAccountParent" class="form-control">
                        <option value="">None (Top Level)</option>
                    </select>
                </div>
                <div class="form-group">
                    <label class="form-label">Description</label>
                    <textarea id="newAccountDesc" class="form-control" rows="2" placeholder="Optional description"></textarea>
                </div>
                <div class="form-group">
                    <label style="display: flex; align-items: center; gap: 8px;">
                        <input type="checkbox" id="newAccountIsHeader">
                        This is a header/group account (no transactions)
                    </label>
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn-secondary" onclick="closeModal('addAccountModal')">Cancel</button>
                <button class="btn-primary" onclick="saveNewAccount()">
                    <i class="fas fa-save"></i> Save Account
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
}

function updateParentOptions() {
    const type = document.getElementById('newAccountType').value;
    const parentSelect = document.getElementById('newAccountParent');
    
    const parentAccounts = chartOfAccounts.filter(acc => 
        acc.type === type && (acc.isHeader || !acc.parent)
    );
    
    parentSelect.innerHTML = '<option value="">None (Top Level)</option>' +
        parentAccounts.map(acc => `<option value="${acc.code}">${acc.code} - ${acc.name}</option>`).join('');
}

function saveNewAccount() {
    const code = document.getElementById('newAccountCode').value.trim();
    const name = document.getElementById('newAccountName').value.trim();
    const type = document.getElementById('newAccountType').value;
    const parent = document.getElementById('newAccountParent').value;
    const description = document.getElementById('newAccountDesc').value.trim();
    const isHeader = document.getElementById('newAccountIsHeader').checked;
    
    if (!code || !name || !type) {
        showNotification('Please fill in all required fields', 'error');
        return;
    }
    
    const result = addAccount({
        code,
        name,
        type,
        subtype: type,
        parent: parent || null,
        description,
        isHeader
    });
    
    if (result) {
        closeModal('addAccountModal');
        renderChartOfAccountsContent();
    }
}

// ==================== EDIT ACCOUNT MODAL ====================
function showEditAccountModal(code) {
    const account = chartOfAccounts.find(a => a.code === code);
    if (!account) return;
    
    // Remove existing modal if any
    const existing = document.getElementById('editAccountModal');
    if (existing) existing.remove();
    
    const modal = document.createElement('div');
    modal.id = 'editAccountModal';
    modal.className = 'modal';
    modal.style.display = 'flex';
    modal.dataset.dynamic = 'true';
    
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 500px;">
            <div class="modal-header">
                <h3 class="modal-title"><i class="fas fa-edit"></i> Edit Account</h3>
                <button class="modal-close" onclick="closeModal('editAccountModal')">&times;</button>
            </div>
            <div class="modal-body">
                <div class="form-group">
                    <label class="form-label">Account Code</label>
                    <input type="text" class="form-control" value="${account.code}" disabled style="background: #f1f5f9;">
                </div>
                <div class="form-group">
                    <label class="form-label">Account Name *</label>
                    <input type="text" id="editAccountName" class="form-control" value="${escapeHTML(account.name)}">
                </div>
                <div class="form-group">
                    <label class="form-label">Description</label>
                    <textarea id="editAccountDesc" class="form-control" rows="2">${escapeHTML(account.description || '')}</textarea>
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn-secondary" onclick="closeModal('editAccountModal')">Cancel</button>
                <button class="btn-primary" onclick="saveEditedAccount('${code}')">
                    <i class="fas fa-save"></i> Save Changes
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
}

function saveEditedAccount(code) {
    const name = document.getElementById('editAccountName').value.trim();
    const description = document.getElementById('editAccountDesc').value.trim();
    
    if (!name) {
        showNotification('Account name is required', 'error');
        return;
    }
    
    updateAccount(code, { name, description });
    closeModal('editAccountModal');
    renderChartOfAccountsContent();
}

// ==================== TRIAL BALANCE MODAL ====================
function showTrialBalanceModal() {
    const trialBalance = generateTrialBalance();
    
    // Remove existing modal if any
    const existing = document.getElementById('trialBalanceModal');
    if (existing) existing.remove();
    
    const modal = document.createElement('div');
    modal.id = 'trialBalanceModal';
    modal.className = 'modal';
    modal.style.display = 'flex';
    modal.dataset.dynamic = 'true';
    
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 800px; max-height: 90vh; overflow: auto;">
            <div class="modal-header">
                <h3 class="modal-title"><i class="fas fa-balance-scale"></i> Trial Balance</h3>
                <button class="modal-close" onclick="closeModal('trialBalanceModal')">&times;</button>
            </div>
            <div class="modal-body">
                <div style="text-align: center; margin-bottom: 20px;">
                    <h4 style="margin: 0;">${businessData.settings?.businessName || 'Company Name'}</h4>
                    <p style="color: #64748b; margin: 5px 0;">Trial Balance as of ${new Date().toLocaleDateString('en-MY')}</p>
                    <div style="display: inline-block; padding: 5px 15px; border-radius: 20px; ${trialBalance.isBalanced ? 'background: #dcfce7; color: #16a34a;' : 'background: #fee2e2; color: #dc2626;'}">
                        ${trialBalance.isBalanced ? '<i class="fas fa-check-circle"></i> Balanced' : '<i class="fas fa-exclamation-triangle"></i> Out of Balance'}
                    </div>
                </div>
                
                <table style="width: 100%; border-collapse: collapse;">
                    <thead>
                        <tr style="background: #f8fafc;">
                            <th style="padding: 12px; text-align: left; border-bottom: 2px solid #e2e8f0;">Code</th>
                            <th style="padding: 12px; text-align: left; border-bottom: 2px solid #e2e8f0;">Account Name</th>
                            <th style="padding: 12px; text-align: right; border-bottom: 2px solid #e2e8f0;">Debit (RM)</th>
                            <th style="padding: 12px; text-align: right; border-bottom: 2px solid #e2e8f0;">Credit (RM)</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${trialBalance.accounts.map(acc => `
                            <tr>
                                <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; font-family: monospace;">${acc.code}</td>
                                <td style="padding: 10px; border-bottom: 1px solid #e2e8f0;">${escapeHTML(acc.name)}</td>
                                <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; text-align: right; font-family: monospace;">
                                    ${acc.debit ? formatNumber(acc.debit) : '-'}
                                </td>
                                <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; text-align: right; font-family: monospace;">
                                    ${acc.credit ? formatNumber(acc.credit) : '-'}
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                    <tfoot>
                        <tr style="background: #f8fafc; font-weight: 600;">
                            <td colspan="2" style="padding: 12px; border-top: 2px solid #1e293b;">TOTAL</td>
                            <td style="padding: 12px; text-align: right; border-top: 2px solid #1e293b; font-family: monospace;">
                                ${formatNumber(trialBalance.totalDebit)}
                            </td>
                            <td style="padding: 12px; text-align: right; border-top: 2px solid #1e293b; font-family: monospace;">
                                ${formatNumber(trialBalance.totalCredit)}
                            </td>
                        </tr>
                    </tfoot>
                </table>
                
                ${!trialBalance.isBalanced ? `
                    <div style="margin-top: 15px; padding: 15px; background: #fef3c7; border-radius: 8px; color: #92400e;">
                        <i class="fas fa-exclamation-triangle"></i>
                        <strong>Warning:</strong> Trial balance is out by RM ${formatNumber(Math.abs(trialBalance.totalDebit - trialBalance.totalCredit))}
                    </div>
                ` : ''}
            </div>
            <div class="modal-footer">
                <button class="btn-secondary" onclick="closeModal('trialBalanceModal')">Close</button>
                <button class="btn-primary" onclick="exportTrialBalance()">
                    <i class="fas fa-download"></i> Export PDF
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
}

function exportTrialBalance() {
    // Use existing PDF export functionality
    if (typeof exportToPDF === 'function') {
        showNotification('Generating PDF...', 'info');
        // Implementation would use the PDF export module
    } else {
        showNotification('PDF export will be implemented', 'info');
    }
}

// ==================== WINDOW EXPORTS ====================
window.renderChartOfAccountsContent = renderChartOfAccountsContent;
window.renderAccountsList = renderAccountsList;
window.filterChartOfAccounts = filterChartOfAccounts;
window.scrollToAccountType = scrollToAccountType;
window.showAddAccountModal = showAddAccountModal;
window.updateParentOptions = updateParentOptions;
window.saveNewAccount = saveNewAccount;
window.showEditAccountModal = showEditAccountModal;
window.saveEditedAccount = saveEditedAccount;
window.showTrialBalanceModal = showTrialBalanceModal;
window.exportTrialBalance = exportTrialBalance;
