/**
 * EZCubic ERP - Journal Entries UI Module
 * Double-Entry Bookkeeping System - Rendering & Modals
 * Version: 2.3.0 - Split from journal-entries.js
 */

// ==================== RENDERING ====================
function renderJournalEntriesContent() {
    const contentArea = document.getElementById('journalEntriesContent');
    if (!contentArea) return;
    
    // Initialize if needed
    if (journalEntries.length === 0) {
        loadJournalEntries();
    }
    
    const html = `
        <div class="journal-container">
            <!-- Header -->
            <div class="section-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <div>
                    <h2 style="margin: 0; color: #1e293b;">
                        <i class="fas fa-book" style="color: #2563eb; margin-right: 10px;"></i>
                        Journal Entries
                    </h2>
                    <p style="color: #64748b; margin: 5px 0 0 0;">Double-Entry Bookkeeping Ledger</p>
                </div>
                <button class="btn-primary" onclick="showNewJournalModal()">
                    <i class="fas fa-plus"></i> New Journal Entry
                </button>
            </div>
            
            <!-- Stats Cards -->
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 15px; margin-bottom: 20px;">
                ${renderJournalStats()}
            </div>
            
            <!-- Filters -->
            <div style="display: flex; gap: 15px; margin-bottom: 20px; flex-wrap: wrap; background: #f8fafc; padding: 15px; border-radius: 10px;">
                <div style="flex: 1; min-width: 200px;">
                    <input type="text" id="journalSearchInput" class="form-control" placeholder="Search entries..." 
                        oninput="filterJournalEntries()">
                </div>
                <select id="journalTypeFilter" class="form-control" style="width: 180px;" onchange="filterJournalEntries()">
                    <option value="">All Types</option>
                    ${Object.values(JOURNAL_TYPES).map(t => `<option value="${t.id}">${t.name}</option>`).join('')}
                </select>
                <select id="journalStatusFilter" class="form-control" style="width: 150px;" onchange="filterJournalEntries()">
                    <option value="">All Status</option>
                    ${Object.values(JOURNAL_STATUS).map(s => `<option value="${s.id}">${s.name}</option>`).join('')}
                </select>
                <input type="date" id="journalStartDate" class="form-control" style="width: 150px;" onchange="filterJournalEntries()">
                <input type="date" id="journalEndDate" class="form-control" style="width: 150px;" onchange="filterJournalEntries()">
            </div>
            
            <!-- Journal Entries List -->
            <div id="journalEntriesList" class="journal-entries-list">
                ${renderJournalEntriesList()}
            </div>
        </div>
    `;
    
    contentArea.innerHTML = html;
}

function renderJournalStats() {
    const total = journalEntries.length;
    const drafted = journalEntries.filter(e => e.status === 'draft').length;
    const posted = journalEntries.filter(e => e.status === 'posted').length;
    const voided = journalEntries.filter(e => e.status === 'voided').length;
    const totalAmount = journalEntries.filter(e => e.status === 'posted').reduce((sum, e) => sum + e.totalDebit, 0);
    
    return `
        <div style="background: white; padding: 15px 20px; border-radius: 10px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
            <div style="color: #64748b; font-size: 12px;">Total Entries</div>
            <div style="font-size: 24px; font-weight: 700; color: #1e293b;">${total}</div>
        </div>
        <div style="background: white; padding: 15px 20px; border-radius: 10px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
            <div style="color: #64748b; font-size: 12px;">Draft</div>
            <div style="font-size: 24px; font-weight: 700; color: #94a3b8;">${drafted}</div>
        </div>
        <div style="background: white; padding: 15px 20px; border-radius: 10px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
            <div style="color: #64748b; font-size: 12px;">Posted</div>
            <div style="font-size: 24px; font-weight: 700; color: #10b981;">${posted}</div>
        </div>
        <div style="background: white; padding: 15px 20px; border-radius: 10px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
            <div style="color: #64748b; font-size: 12px;">Total Posted (RM)</div>
            <div style="font-size: 24px; font-weight: 700; color: #3b82f6;">${formatNumberJE(totalAmount)}</div>
        </div>
    `;
}

function renderJournalEntriesList() {
    const searchTerm = document.getElementById('journalSearchInput')?.value?.toLowerCase() || '';
    const typeFilter = document.getElementById('journalTypeFilter')?.value || '';
    const statusFilter = document.getElementById('journalStatusFilter')?.value || '';
    const startDate = document.getElementById('journalStartDate')?.value || '';
    const endDate = document.getElementById('journalEndDate')?.value || '';
    
    let filtered = journalEntries.filter(entry => {
        if (typeFilter && entry.type !== typeFilter) return false;
        if (statusFilter && entry.status !== statusFilter) return false;
        if (startDate && entry.date < startDate) return false;
        if (endDate && entry.date > endDate) return false;
        if (searchTerm && !entry.journalNumber.toLowerCase().includes(searchTerm) && 
            !entry.description.toLowerCase().includes(searchTerm)) return false;
        return true;
    });
    
    // Sort by date descending
    filtered.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    if (filtered.length === 0) {
        return `
            <div style="padding: 60px; text-align: center; color: #94a3b8;">
                <i class="fas fa-book" style="font-size: 48px; margin-bottom: 15px;"></i>
                <p style="margin: 0;">No journal entries found</p>
                <button class="btn-primary" style="margin-top: 15px;" onclick="showNewJournalModal()">
                    <i class="fas fa-plus"></i> Create First Entry
                </button>
            </div>
        `;
    }
    
    let html = `
        <table style="width: 100%; border-collapse: collapse;">
            <thead>
                <tr style="background: #f8fafc;">
                    <th style="padding: 12px; text-align: left; border-bottom: 2px solid #e2e8f0;">Entry No.</th>
                    <th style="padding: 12px; text-align: left; border-bottom: 2px solid #e2e8f0;">Date</th>
                    <th style="padding: 12px; text-align: left; border-bottom: 2px solid #e2e8f0;">Type</th>
                    <th style="padding: 12px; text-align: left; border-bottom: 2px solid #e2e8f0;">Description</th>
                    <th style="padding: 12px; text-align: right; border-bottom: 2px solid #e2e8f0;">Amount (RM)</th>
                    <th style="padding: 12px; text-align: center; border-bottom: 2px solid #e2e8f0;">Status</th>
                    <th style="padding: 12px; text-align: center; border-bottom: 2px solid #e2e8f0;">Actions</th>
                </tr>
            </thead>
            <tbody>
    `;
    
    filtered.forEach(entry => {
        const journalType = JOURNAL_TYPES[entry.type.toUpperCase()] || JOURNAL_TYPES.GENERAL;
        const status = JOURNAL_STATUS[entry.status.toUpperCase()] || JOURNAL_STATUS.DRAFT;
        
        html += `
            <tr style="border-bottom: 1px solid #e2e8f0;" onclick="showJournalDetail('${entry.id}')" class="clickable-row">
                <td style="padding: 12px; font-family: monospace; font-weight: 600; color: ${journalType.color};">
                    ${entry.journalNumber}
                </td>
                <td style="padding: 12px;">${formatDateJE(entry.date)}</td>
                <td style="padding: 12px;">
                    <span style="background: ${journalType.color}15; color: ${journalType.color}; padding: 3px 10px; border-radius: 15px; font-size: 12px;">
                        ${journalType.name}
                    </span>
                </td>
                <td style="padding: 12px; max-width: 300px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                    ${escapeHTML(entry.description)}
                </td>
                <td style="padding: 12px; text-align: right; font-family: monospace; font-weight: 600;">
                    ${formatNumberJE(entry.totalDebit)}
                </td>
                <td style="padding: 12px; text-align: center;">
                    <span style="background: ${status.color}20; color: ${status.color}; padding: 3px 10px; border-radius: 15px; font-size: 12px;">
                        ${status.name}
                    </span>
                </td>
                <td style="padding: 12px; text-align: center;" onclick="event.stopPropagation();">
                    ${entry.status === 'draft' ? `
                        <button onclick="postJournalEntry('${entry.id}'); renderJournalEntriesContent();" class="btn-icon" title="Post Entry" style="color: #10b981;">
                            <i class="fas fa-check"></i>
                        </button>
                    ` : ''}
                    ${entry.status !== 'voided' ? `
                        <button onclick="showVoidJournalModal('${entry.id}')" class="btn-icon" title="Void Entry" style="color: #ef4444;">
                            <i class="fas fa-ban"></i>
                        </button>
                    ` : ''}
                    <button onclick="showJournalDetail('${entry.id}')" class="btn-icon" title="View Details">
                        <i class="fas fa-eye"></i>
                    </button>
                </td>
            </tr>
        `;
    });
    
    html += '</tbody></table>';
    return html;
}

function filterJournalEntries() {
    const listContainer = document.getElementById('journalEntriesList');
    if (listContainer) {
        listContainer.innerHTML = renderJournalEntriesList();
    }
}

// ==================== NEW JOURNAL MODAL ====================
function showNewJournalModal() {
    // Load Chart of Accounts if not already loaded
    if (typeof loadChartOfAccounts === 'function' && (!chartOfAccounts || chartOfAccounts.length === 0)) {
        loadChartOfAccounts();
    }
    
    // Remove existing modal if any
    const existing = document.getElementById('newJournalModal');
    if (existing) existing.remove();
    
    const modal = document.createElement('div');
    modal.id = 'newJournalModal';
    modal.className = 'modal';
    modal.style.display = 'flex';
    modal.dataset.dynamic = 'true';
    
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 900px; max-height: 90vh; overflow: auto;">
            <div class="modal-header">
                <h3 class="modal-title"><i class="fas fa-plus-circle"></i> New Journal Entry</h3>
                <button class="modal-close" onclick="closeModal('newJournalModal')">&times;</button>
            </div>
            <div class="modal-body">
                <!-- Entry Header -->
                <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin-bottom: 20px;">
                    <div class="form-group">
                        <label class="form-label">Entry Type</label>
                        <select id="newJournalType" class="form-control">
                            ${Object.values(JOURNAL_TYPES).map(t => `<option value="${t.id}">${t.name}</option>`).join('')}
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Date *</label>
                        <input type="date" id="newJournalDate" class="form-control" value="${new Date().toISOString().split('T')[0]}">
                    </div>
                    <div class="form-group" style="grid-column: span 2;">
                        <label class="form-label">Description *</label>
                        <input type="text" id="newJournalDesc" class="form-control" placeholder="Enter description">
                    </div>
                </div>
                
                <div class="form-group">
                    <label class="form-label">Reference (Optional)</label>
                    <input type="text" id="newJournalRef" class="form-control" placeholder="Invoice number, check number, etc.">
                </div>
                
                <!-- Journal Lines -->
                <div style="margin-top: 20px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                        <h4 style="margin: 0;"><i class="fas fa-list"></i> Journal Lines</h4>
                        <button type="button" class="btn-secondary" onclick="addJournalLine()">
                            <i class="fas fa-plus"></i> Add Line
                        </button>
                    </div>
                    
                    <div id="journalLinesContainer" style="background: #f8fafc; border-radius: 8px; padding: 15px;">
                        <table style="width: 100%; border-collapse: collapse;">
                            <thead>
                                <tr style="background: #e2e8f0;">
                                    <th style="padding: 10px; text-align: left; width: 30%;">Account</th>
                                    <th style="padding: 10px; text-align: left; width: 30%;">Description</th>
                                    <th style="padding: 10px; text-align: right; width: 15%;">Debit (RM)</th>
                                    <th style="padding: 10px; text-align: right; width: 15%;">Credit (RM)</th>
                                    <th style="padding: 10px; width: 10%;"></th>
                                </tr>
                            </thead>
                            <tbody id="journalLinesList">
                                ${renderNewJournalLine(1)}
                                ${renderNewJournalLine(2)}
                            </tbody>
                            <tfoot>
                                <tr style="background: #e2e8f0; font-weight: 600;">
                                    <td colspan="2" style="padding: 10px;">TOTALS</td>
                                    <td style="padding: 10px; text-align: right;" id="journalTotalDebit">0.00</td>
                                    <td style="padding: 10px; text-align: right;" id="journalTotalCredit">0.00</td>
                                    <td></td>
                                </tr>
                                <tr id="journalDifferenceRow" style="display: none;">
                                    <td colspan="2" style="padding: 10px; color: #dc2626;">DIFFERENCE</td>
                                    <td colspan="2" style="padding: 10px; text-align: center; color: #dc2626;" id="journalDifference"></td>
                                    <td></td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn-secondary" onclick="closeModal('newJournalModal')">Cancel</button>
                <button class="btn-primary" onclick="saveJournalEntryFromModal()" id="saveJournalBtn">
                    <i class="fas fa-save"></i> Save as Draft
                </button>
                <button class="btn-primary" onclick="saveAndPostJournalEntry()" id="savePostJournalBtn" style="background: #10b981;">
                    <i class="fas fa-check"></i> Save & Post
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
}

function renderNewJournalLine(lineNumber) {
    const accounts = (typeof chartOfAccounts !== 'undefined' ? chartOfAccounts : [])
        .filter(a => !a.isHeader && a.isActive !== false)
        .sort((a, b) => a.code.localeCompare(b.code));
    
    return `
        <tr id="journalLine${lineNumber}">
            <td style="padding: 8px;">
                <select class="form-control journal-account" style="font-size: 13px;" onchange="updateJournalTotals()">
                    <option value="">Select Account</option>
                    ${accounts.map(a => `<option value="${a.code}">${a.code} - ${a.name}</option>`).join('')}
                </select>
            </td>
            <td style="padding: 8px;">
                <input type="text" class="form-control journal-line-desc" style="font-size: 13px;" placeholder="Line description">
            </td>
            <td style="padding: 8px;">
                <input type="number" class="form-control journal-debit" style="text-align: right; font-size: 13px;" 
                    step="0.01" min="0" placeholder="0.00" onchange="updateJournalTotals()">
            </td>
            <td style="padding: 8px;">
                <input type="number" class="form-control journal-credit" style="text-align: right; font-size: 13px;" 
                    step="0.01" min="0" placeholder="0.00" onchange="updateJournalTotals()">
            </td>
            <td style="padding: 8px; text-align: center;">
                <button type="button" class="btn-icon" onclick="removeJournalLine(${lineNumber})" title="Remove" style="color: #ef4444;">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        </tr>
    `;
}

let journalLineCounter = 2;

function addJournalLine() {
    journalLineCounter++;
    const tbody = document.getElementById('journalLinesList');
    if (tbody) {
        tbody.insertAdjacentHTML('beforeend', renderNewJournalLine(journalLineCounter));
    }
}

function removeJournalLine(lineNumber) {
    const row = document.getElementById(`journalLine${lineNumber}`);
    if (row) {
        row.remove();
        updateJournalTotals();
    }
}

function updateJournalTotals() {
    const debits = document.querySelectorAll('.journal-debit');
    const credits = document.querySelectorAll('.journal-credit');
    
    let totalDebit = 0;
    let totalCredit = 0;
    
    debits.forEach(input => totalDebit += parseFloat(input.value) || 0);
    credits.forEach(input => totalCredit += parseFloat(input.value) || 0);
    
    document.getElementById('journalTotalDebit').textContent = formatNumberJE(totalDebit);
    document.getElementById('journalTotalCredit').textContent = formatNumberJE(totalCredit);
    
    const diffRow = document.getElementById('journalDifferenceRow');
    const diffCell = document.getElementById('journalDifference');
    const difference = Math.abs(totalDebit - totalCredit);
    
    if (difference > 0.01) {
        diffRow.style.display = '';
        diffCell.textContent = `RM ${formatNumberJE(difference)} (${totalDebit > totalCredit ? 'Credit needed' : 'Debit needed'})`;
    } else {
        diffRow.style.display = 'none';
    }
}

function saveJournalEntryFromModal() {
    const lines = collectJournalLines();
    if (!lines) return;
    
    const entry = createJournalEntry({
        type: document.getElementById('newJournalType').value,
        date: document.getElementById('newJournalDate').value,
        description: document.getElementById('newJournalDesc').value.trim(),
        reference: document.getElementById('newJournalRef').value.trim(),
        lines
    });
    
    if (entry) {
        closeModal('newJournalModal');
        renderJournalEntriesContent();
    }
}

function saveAndPostJournalEntry() {
    const lines = collectJournalLines();
    if (!lines) return;
    
    const entry = createJournalEntry({
        type: document.getElementById('newJournalType').value,
        date: document.getElementById('newJournalDate').value,
        description: document.getElementById('newJournalDesc').value.trim(),
        reference: document.getElementById('newJournalRef').value.trim(),
        lines
    });
    
    if (entry) {
        postJournalEntry(entry.id);
        closeModal('newJournalModal');
        renderJournalEntriesContent();
    }
}

function collectJournalLines() {
    const rows = document.querySelectorAll('#journalLinesList tr');
    const lines = [];
    
    rows.forEach(row => {
        const accountSelect = row.querySelector('.journal-account');
        const descInput = row.querySelector('.journal-line-desc');
        const debitInput = row.querySelector('.journal-debit');
        const creditInput = row.querySelector('.journal-credit');
        
        if (accountSelect && accountSelect.value) {
            const debit = parseFloat(debitInput.value) || 0;
            const credit = parseFloat(creditInput.value) || 0;
            
            if (debit > 0 || credit > 0) {
                lines.push({
                    accountCode: accountSelect.value,
                    description: descInput.value.trim(),
                    debit,
                    credit
                });
            }
        }
    });
    
    if (lines.length < 2) {
        showNotification('At least 2 valid lines are required', 'error');
        return null;
    }
    
    return lines;
}

// ==================== JOURNAL DETAIL MODAL ====================
function showJournalDetail(journalId) {
    const entry = journalEntries.find(e => e.id === journalId);
    if (!entry) return;
    
    const journalType = JOURNAL_TYPES[entry.type.toUpperCase()] || JOURNAL_TYPES.GENERAL;
    const status = JOURNAL_STATUS[entry.status.toUpperCase()] || JOURNAL_STATUS.DRAFT;
    
    // Remove existing modal if any
    const existing = document.getElementById('journalDetailModal');
    if (existing) existing.remove();
    
    const modal = document.createElement('div');
    modal.id = 'journalDetailModal';
    modal.className = 'modal';
    modal.style.display = 'flex';
    modal.dataset.dynamic = 'true';
    
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 800px; max-height: 90vh; overflow: auto;">
            <div class="modal-header">
                <h3 class="modal-title">
                    <i class="fas fa-book" style="color: ${journalType.color};"></i> 
                    ${entry.journalNumber}
                </h3>
                <button class="modal-close" onclick="closeModal('journalDetailModal')">&times;</button>
            </div>
            <div class="modal-body">
                <!-- Status Badge -->
                <div style="margin-bottom: 20px;">
                    <span style="background: ${status.color}20; color: ${status.color}; padding: 5px 15px; border-radius: 20px; font-weight: 600;">
                        ${status.name}
                    </span>
                    <span style="background: ${journalType.color}15; color: ${journalType.color}; padding: 5px 15px; border-radius: 20px; font-weight: 600; margin-left: 10px;">
                        ${journalType.name}
                    </span>
                </div>
                
                <!-- Entry Info -->
                <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; margin-bottom: 20px; background: #f8fafc; padding: 15px; border-radius: 8px;">
                    <div>
                        <div style="color: #64748b; font-size: 12px;">Date</div>
                        <div style="font-weight: 600;">${formatDateJE(entry.date)}</div>
                    </div>
                    <div>
                        <div style="color: #64748b; font-size: 12px;">Reference</div>
                        <div style="font-weight: 600;">${entry.reference || '-'}</div>
                    </div>
                    <div style="grid-column: span 2;">
                        <div style="color: #64748b; font-size: 12px;">Description</div>
                        <div style="font-weight: 600;">${escapeHTML(entry.description)}</div>
                    </div>
                </div>
                
                <!-- Journal Lines -->
                <h4 style="margin: 20px 0 10px 0;">Journal Lines</h4>
                <table style="width: 100%; border-collapse: collapse;">
                    <thead>
                        <tr style="background: #f8fafc;">
                            <th style="padding: 10px; text-align: left; border-bottom: 2px solid #e2e8f0;">Account</th>
                            <th style="padding: 10px; text-align: left; border-bottom: 2px solid #e2e8f0;">Description</th>
                            <th style="padding: 10px; text-align: right; border-bottom: 2px solid #e2e8f0;">Debit (RM)</th>
                            <th style="padding: 10px; text-align: right; border-bottom: 2px solid #e2e8f0;">Credit (RM)</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${entry.lines.map(line => `
                            <tr style="border-bottom: 1px solid #e2e8f0;">
                                <td style="padding: 10px;">
                                    <span style="font-family: monospace; color: #2563eb;">${line.accountCode}</span>
                                    ${escapeHTML(line.accountName)}
                                </td>
                                <td style="padding: 10px; color: #64748b;">${escapeHTML(line.description || '-')}</td>
                                <td style="padding: 10px; text-align: right; font-family: monospace;">
                                    ${line.debit > 0 ? formatNumberJE(line.debit) : '-'}
                                </td>
                                <td style="padding: 10px; text-align: right; font-family: monospace;">
                                    ${line.credit > 0 ? formatNumberJE(line.credit) : '-'}
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                    <tfoot>
                        <tr style="background: #f8fafc; font-weight: 600;">
                            <td colspan="2" style="padding: 10px; border-top: 2px solid #1e293b;">TOTALS</td>
                            <td style="padding: 10px; text-align: right; border-top: 2px solid #1e293b; font-family: monospace;">
                                ${formatNumberJE(entry.totalDebit)}
                            </td>
                            <td style="padding: 10px; text-align: right; border-top: 2px solid #1e293b; font-family: monospace;">
                                ${formatNumberJE(entry.totalCredit)}
                            </td>
                        </tr>
                    </tfoot>
                </table>
                
                <!-- Audit Info -->
                <div style="margin-top: 20px; padding: 15px; background: #f1f5f9; border-radius: 8px; font-size: 13px; color: #64748b;">
                    <div><strong>Created:</strong> ${formatDateTimeJE(entry.createdAt)} by ${entry.createdBy}</div>
                    ${entry.postedAt ? `<div><strong>Posted:</strong> ${formatDateTimeJE(entry.postedAt)} by ${entry.postedBy}</div>` : ''}
                    ${entry.voidedAt ? `<div><strong>Voided:</strong> ${formatDateTimeJE(entry.voidedAt)} by ${entry.voidedBy} - ${entry.voidReason}</div>` : ''}
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn-secondary" onclick="closeModal('journalDetailModal')">Close</button>
                ${entry.status === 'draft' ? `
                    <button class="btn-primary" onclick="postJournalEntry('${entry.id}'); closeModal('journalDetailModal'); renderJournalEntriesContent();" style="background: #10b981;">
                        <i class="fas fa-check"></i> Post Entry
                    </button>
                ` : ''}
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
}

// ==================== VOID JOURNAL MODAL ====================
function showVoidJournalModal(journalId) {
    const entry = journalEntries.find(e => e.id === journalId);
    if (!entry) return;
    
    // Remove existing modal if any
    const existing = document.getElementById('voidJournalModal');
    if (existing) existing.remove();
    
    const modal = document.createElement('div');
    modal.id = 'voidJournalModal';
    modal.className = 'modal';
    modal.style.display = 'flex';
    modal.dataset.dynamic = 'true';
    
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 400px;">
            <div class="modal-header" style="background: #fef2f2;">
                <h3 class="modal-title" style="color: #dc2626;"><i class="fas fa-ban"></i> Void Journal Entry</h3>
                <button class="modal-close" onclick="closeModal('voidJournalModal')">&times;</button>
            </div>
            <div class="modal-body">
                <p>Are you sure you want to void journal entry <strong>${entry.journalNumber}</strong>?</p>
                ${entry.status === 'posted' ? `
                    <div style="background: #fef3c7; padding: 10px; border-radius: 8px; margin: 15px 0; color: #92400e;">
                        <i class="fas fa-exclamation-triangle"></i>
                        This entry has been posted. Voiding will reverse the account balances.
                    </div>
                ` : ''}
                <div class="form-group">
                    <label class="form-label">Reason for Voiding *</label>
                    <textarea id="voidJournalReason" class="form-control" rows="3" placeholder="Enter reason"></textarea>
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn-secondary" onclick="closeModal('voidJournalModal')">Cancel</button>
                <button class="btn-danger" onclick="confirmVoidJournal('${journalId}')">
                    <i class="fas fa-ban"></i> Void Entry
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
}

function confirmVoidJournal(journalId) {
    const reason = document.getElementById('voidJournalReason').value.trim();
    if (!reason) {
        showNotification('Please enter a reason for voiding', 'error');
        return;
    }
    
    voidJournalEntry(journalId, reason);
    closeModal('voidJournalModal');
    renderJournalEntriesContent();
}

// ==================== HELPER FUNCTIONS ====================
function formatDateJE(dateStr) {
    return new Date(dateStr).toLocaleDateString('en-MY', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
    });
}

function formatDateTimeJE(dateStr) {
    return new Date(dateStr).toLocaleString('en-MY', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function formatNumberJE(num) {
    return (num || 0).toLocaleString('en-MY', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

// ==================== WINDOW EXPORTS ====================
window.renderJournalEntriesContent = renderJournalEntriesContent;
window.renderJournalStats = renderJournalStats;
window.renderJournalEntriesList = renderJournalEntriesList;
window.filterJournalEntries = filterJournalEntries;
window.showNewJournalModal = showNewJournalModal;
window.renderNewJournalLine = renderNewJournalLine;
window.addJournalLine = addJournalLine;
window.removeJournalLine = removeJournalLine;
window.updateJournalTotals = updateJournalTotals;
window.saveJournalEntryFromModal = saveJournalEntryFromModal;
window.saveAndPostJournalEntry = saveAndPostJournalEntry;
window.collectJournalLines = collectJournalLines;
window.showJournalDetail = showJournalDetail;
window.showVoidJournalModal = showVoidJournalModal;
window.confirmVoidJournal = confirmVoidJournal;
