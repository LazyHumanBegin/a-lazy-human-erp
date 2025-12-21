/**
 * EZCubic ERP - Journal Entries Module
 * Double-Entry Bookkeeping System
 * Version: 1.0.0 - 20 Dec 2025
 */

// ==================== STORAGE KEYS ====================
const JOURNAL_KEY = 'ezcubic_journal_entries';
const JOURNAL_SEQUENCE_KEY = 'ezcubic_journal_sequence';

// ==================== JOURNAL ENTRY TYPES ====================
const JOURNAL_TYPES = {
    GENERAL: { id: 'general', name: 'General Journal', prefix: 'GJ', color: '#3b82f6' },
    SALES: { id: 'sales', name: 'Sales Journal', prefix: 'SJ', color: '#10b981' },
    PURCHASE: { id: 'purchase', name: 'Purchase Journal', prefix: 'PJ', color: '#f59e0b' },
    CASH_RECEIPT: { id: 'cash_receipt', name: 'Cash Receipts', prefix: 'CR', color: '#8b5cf6' },
    CASH_PAYMENT: { id: 'cash_payment', name: 'Cash Payments', prefix: 'CP', color: '#ef4444' },
    PAYROLL: { id: 'payroll', name: 'Payroll Journal', prefix: 'PY', color: '#06b6d4' },
    ADJUSTMENT: { id: 'adjustment', name: 'Adjusting Entry', prefix: 'AJ', color: '#ec4899' },
    CLOSING: { id: 'closing', name: 'Closing Entry', prefix: 'CL', color: '#1e293b' }
};

// ==================== JOURNAL ENTRY STATUS ====================
const JOURNAL_STATUS = {
    DRAFT: { id: 'draft', name: 'Draft', color: '#94a3b8' },
    PENDING: { id: 'pending', name: 'Pending Approval', color: '#f59e0b' },
    POSTED: { id: 'posted', name: 'Posted', color: '#10b981' },
    VOIDED: { id: 'voided', name: 'Voided', color: '#ef4444' }
};

// ==================== GLOBAL VARIABLES ====================
let journalEntries = [];
let journalSequence = { year: new Date().getFullYear(), sequence: 0 };

// ==================== INITIALIZATION ====================
function initJournalEntries() {
    loadJournalEntries();
    loadJournalSequence();
}

function loadJournalEntries() {
    // First check if window.journalEntries was set by tenant data loading
    // Important: Check for Array.isArray, not length - empty array is valid tenant data
    if (Array.isArray(window.journalEntries)) {
        journalEntries = window.journalEntries;
        console.log('Journal Entries loaded from tenant data:', journalEntries.length, 'entries');
        return journalEntries;
    }
    
    // No tenant data loaded yet - try localStorage (legacy/fallback)
    journalEntries = safeLocalStorageGet(JOURNAL_KEY, []);
    window.journalEntries = journalEntries;
    console.log('Journal Entries loaded from localStorage:', journalEntries.length, 'entries');
    return journalEntries;
}

function saveJournalEntries() {
    safeLocalStorageSet(JOURNAL_KEY, journalEntries);
    window.journalEntries = journalEntries;
    
    // Also save to tenant storage for data isolation
    if (typeof saveToUserTenant === 'function') {
        saveToUserTenant();
    }
}

function loadJournalSequence() {
    const stored = safeLocalStorageGet(JOURNAL_SEQUENCE_KEY, null);
    const currentYear = new Date().getFullYear();
    
    if (stored && stored.year === currentYear) {
        journalSequence = stored;
    } else {
        journalSequence = { year: currentYear, sequence: 0 };
        saveJournalSequence();
    }
}

function saveJournalSequence() {
    safeLocalStorageSet(JOURNAL_SEQUENCE_KEY, journalSequence);
    // No need to call saveToUserTenant here as it's called with saveJournalEntries
}

function generateJournalNumber(type = 'general') {
    const journalType = JOURNAL_TYPES[type.toUpperCase()] || JOURNAL_TYPES.GENERAL;
    const currentYear = new Date().getFullYear();
    
    // Reset sequence if year changed
    if (journalSequence.year !== currentYear) {
        journalSequence = { year: currentYear, sequence: 0 };
    }
    
    journalSequence.sequence++;
    saveJournalSequence();
    
    // Format: GJ-2024-00001
    return `${journalType.prefix}-${currentYear}-${String(journalSequence.sequence).padStart(5, '0')}`;
}

// ==================== JOURNAL ENTRY OPERATIONS ====================
function createJournalEntry(entryData) {
    // Validate required fields
    if (!entryData.lines || entryData.lines.length < 2) {
        showNotification('Journal entry must have at least 2 lines', 'error');
        return null;
    }
    
    // Validate double-entry: debits must equal credits
    const totalDebit = entryData.lines.reduce((sum, line) => sum + (line.debit || 0), 0);
    const totalCredit = entryData.lines.reduce((sum, line) => sum + (line.credit || 0), 0);
    
    if (Math.abs(totalDebit - totalCredit) > 0.01) {
        showNotification(`Entry is not balanced. Debit: RM${formatNumber(totalDebit)}, Credit: RM${formatNumber(totalCredit)}`, 'error');
        return null;
    }
    
    // Validate accounts exist
    const invalidAccounts = entryData.lines.filter(line => {
        const account = getAccount(line.accountCode);
        return !account || account.isHeader;
    });
    
    if (invalidAccounts.length > 0) {
        showNotification('One or more account codes are invalid or are header accounts', 'error');
        return null;
    }
    
    const journalEntry = {
        id: generateUniqueId('JE'),
        journalNumber: generateJournalNumber(entryData.type || 'general'),
        type: entryData.type || 'general',
        date: entryData.date || new Date().toISOString().split('T')[0],
        description: entryData.description || '',
        reference: entryData.reference || '',
        lines: entryData.lines.map((line, index) => ({
            lineNumber: index + 1,
            accountCode: line.accountCode,
            accountName: getAccount(line.accountCode)?.name || '',
            description: line.description || '',
            debit: parseFloat(line.debit) || 0,
            credit: parseFloat(line.credit) || 0
        })),
        totalDebit,
        totalCredit,
        status: 'draft',
        createdBy: currentUser?.username || 'system',
        createdAt: new Date().toISOString(),
        attachments: entryData.attachments || []
    };
    
    journalEntries.push(journalEntry);
    saveJournalEntries();
    
    // Record audit log
    if (typeof recordAuditLog === 'function') {
        recordAuditLog({
            action: 'create',
            module: 'journal-entries',
            recordId: journalEntry.journalNumber,
            details: `Created journal entry: ${journalEntry.description} (RM${formatNumber(totalDebit)})`
        });
    }
    
    showNotification(`Journal entry ${journalEntry.journalNumber} created`, 'success');
    return journalEntry;
}

function postJournalEntry(journalId) {
    const entry = journalEntries.find(e => e.id === journalId);
    if (!entry) {
        showNotification('Journal entry not found', 'error');
        return false;
    }
    
    if (entry.status === 'posted') {
        showNotification('Entry is already posted', 'warning');
        return false;
    }
    
    if (entry.status === 'voided') {
        showNotification('Cannot post a voided entry', 'error');
        return false;
    }
    
    // Update account balances
    entry.lines.forEach(line => {
        if (line.debit > 0) {
            updateAccountBalance(line.accountCode, line.debit, true);
        }
        if (line.credit > 0) {
            updateAccountBalance(line.accountCode, line.credit, false);
        }
    });
    
    entry.status = 'posted';
    entry.postedBy = currentUser?.username || 'system';
    entry.postedAt = new Date().toISOString();
    
    saveJournalEntries();
    
    // Save COA with updated balances
    if (typeof saveChartOfAccounts === 'function') {
        saveChartOfAccounts();
    }
    
    // Record audit log
    if (typeof recordAuditLog === 'function') {
        recordAuditLog({
            action: 'post',
            module: 'journal-entries',
            recordId: entry.journalNumber,
            details: `Posted journal entry: ${entry.description}`
        });
    }
    
    showNotification(`Journal entry ${entry.journalNumber} posted successfully`, 'success');
    return true;
}

function voidJournalEntry(journalId, reason) {
    const entry = journalEntries.find(e => e.id === journalId);
    if (!entry) {
        showNotification('Journal entry not found', 'error');
        return false;
    }
    
    if (entry.status === 'voided') {
        showNotification('Entry is already voided', 'warning');
        return false;
    }
    
    // If posted, reverse the account balances
    if (entry.status === 'posted') {
        entry.lines.forEach(line => {
            if (line.debit > 0) {
                updateAccountBalance(line.accountCode, line.debit, false); // Reverse debit
            }
            if (line.credit > 0) {
                updateAccountBalance(line.accountCode, line.credit, true); // Reverse credit
            }
        });
        
        if (typeof saveChartOfAccounts === 'function') {
            saveChartOfAccounts();
        }
    }
    
    entry.status = 'voided';
    entry.voidedBy = currentUser?.username || 'system';
    entry.voidedAt = new Date().toISOString();
    entry.voidReason = reason || 'No reason provided';
    
    saveJournalEntries();
    
    // Record audit log
    if (typeof recordAuditLog === 'function') {
        recordAuditLog({
            action: 'void',
            module: 'journal-entries',
            recordId: entry.journalNumber,
            details: `Voided journal entry: ${reason}`
        });
    }
    
    showNotification(`Journal entry ${entry.journalNumber} has been voided`, 'success');
    return true;
}

function getJournalEntry(journalId) {
    return journalEntries.find(e => e.id === journalId || e.journalNumber === journalId);
}

function getJournalEntriesByDate(startDate, endDate) {
    return journalEntries.filter(entry => {
        const entryDate = entry.date;
        return entryDate >= startDate && entryDate <= endDate;
    });
}

function getJournalEntriesByAccount(accountCode) {
    return journalEntries.filter(entry => 
        entry.lines.some(line => line.accountCode === accountCode)
    );
}

// ==================== AUTO-GENERATION FROM TRANSACTIONS ====================

// Income category to revenue account mapping
const INCOME_CATEGORY_ACCOUNTS = {
    'sales': '4110',           // Product Sales
    'services': '4120',        // Service Revenue
    'consulting': '4120',      // Service Revenue
    'commission': '4210',      // Commission Income
    'rental': '4220',          // Rental Income
    'interest': '4310',        // Interest Income
    'dividend': '4320',        // Dividend Income
    'other': '4200',           // Other Operating Income
    'refund': '4200',          // Other Operating Income
    'default': '4110'          // Product Sales (default)
};

// Expense category to expense account mapping
const EXPENSE_CATEGORY_ACCOUNTS = {
    // Payroll
    'salary': '5410',          // Salaries & Wages
    'wages': '5410',           // Salaries & Wages
    'epf': '5420',             // EPF Employer
    'socso': '5430',           // SOCSO Employer
    'eis': '5440',             // EIS Employer
    'bonus': '5450',           // Staff Bonuses
    'commission': '5490',      // Commission Expense
    
    // Office & Admin
    'rent': '5510',            // Rent Expense
    'utilities': '5520',       // Utilities
    'electricity': '5521',     // Electricity
    'water': '5522',           // Water
    'internet': '5523',        // Internet & Telephone
    'phone': '5523',           // Internet & Telephone
    'office supplies': '5530', // Office Supplies
    'stationery': '5540',      // Printing & Stationery
    'postage': '5550',         // Postage & Courier
    'maintenance': '5560',     // Cleaning & Maintenance
    'cleaning': '5560',        // Cleaning & Maintenance
    
    // Professional Services
    'accounting': '5610',      // Accounting & Audit Fees
    'audit': '5610',           // Accounting & Audit Fees
    'legal': '5620',           // Legal Fees
    'consulting': '5630',      // Consulting Fees
    'professional': '5630',    // Consulting Fees
    
    // Marketing
    'advertising': '5710',     // Advertising
    'marketing': '5720',       // Marketing Materials
    'website': '5730',         // Website & Digital Marketing
    
    // Travel & Entertainment
    'travel': '5810',          // Travel - Local
    'transport': '5810',       // Travel - Local
    'accommodation': '5830',   // Accommodation
    'meals': '5840',           // Meals & Entertainment
    'entertainment': '5840',   // Meals & Entertainment
    'fuel': '5850',            // Fuel & Toll
    'petrol': '5850',          // Fuel & Toll
    'toll': '5850',            // Fuel & Toll
    'parking': '5860',         // Parking
    
    // Insurance & Licenses
    'insurance': '5910',       // Business Insurance
    'license': '5930',         // Business Licenses
    
    // Financial
    'bank charges': '6110',    // Bank Charges
    'interest': '6120',        // Interest Expense
    'bank fee': '6110',        // Bank Charges
    
    // Other
    'depreciation': '6050',    // Depreciation - Computer Equipment
    'bad debt': '6210',        // Bad Debts
    'donation': '6230',        // Donations
    'miscellaneous': '6240',   // Miscellaneous Expenses
    'other': '6240',           // Miscellaneous Expenses
    'default': '5300'          // Operating Expenses (header - fallback)
};

// Payment method to asset account mapping
const PAYMENT_METHOD_ACCOUNTS = {
    'cash': '1010',            // Cash in Hand
    'bank': '1110',            // Maybank Current Account (default bank)
    'bank transfer': '1110',   // Maybank Current Account
    'cheque': '1110',          // Bank Account
    'credit card': '2200',     // Credit Card Payables (liability)
    'debit card': '1110',      // Bank Account
    'ewallet': '1110',         // Bank Account (for now)
    'online': '1110',          // Bank Account
    'default': '1110'          // Default to bank
};

function getAccountCodeForIncomeCategory(category) {
    const normalized = (category || '').toLowerCase().trim();
    return INCOME_CATEGORY_ACCOUNTS[normalized] || INCOME_CATEGORY_ACCOUNTS['default'];
}

function getAccountCodeForExpenseCategory(category) {
    const normalized = (category || '').toLowerCase().trim();
    return EXPENSE_CATEGORY_ACCOUNTS[normalized] || EXPENSE_CATEGORY_ACCOUNTS['default'];
}

function getAccountCodeForPaymentMethod(method) {
    const normalized = (method || '').toLowerCase().trim();
    return PAYMENT_METHOD_ACCOUNTS[normalized] || PAYMENT_METHOD_ACCOUNTS['default'];
}

// Create journal entry from income transaction (called from transactions.js)
function createJournalFromIncomeTransaction(transaction) {
    const assetAccountCode = getAccountCodeForPaymentMethod(transaction.method);
    const revenueAccountCode = getAccountCodeForIncomeCategory(transaction.category);
    
    const lines = [
        {
            accountCode: assetAccountCode,
            description: `Received: ${transaction.description}`,
            debit: transaction.amount,
            credit: 0
        },
        {
            accountCode: revenueAccountCode,
            description: transaction.description,
            debit: 0,
            credit: transaction.amount
        }
    ];
    
    return createJournalEntry({
        type: 'cash_receipt',
        date: transaction.date,
        description: `Income: ${transaction.description}`,
        reference: transaction.id,
        lines
    });
}

// Create journal entry from expense transaction (called from transactions.js)
function createJournalFromExpenseTransaction(transaction) {
    const expenseAccountCode = getAccountCodeForExpenseCategory(transaction.category);
    const paymentAccountCode = getAccountCodeForPaymentMethod(transaction.method);
    
    // Check if payment is via credit card (liability increase, not asset decrease)
    const isCreditCard = (transaction.method || '').toLowerCase().includes('credit');
    
    const lines = [
        {
            accountCode: expenseAccountCode,
            description: `${transaction.description}`,
            debit: transaction.amount,
            credit: 0
        },
        {
            accountCode: paymentAccountCode,
            description: transaction.vendor || transaction.description,
            debit: isCreditCard ? 0 : 0, // Credit card: credit liability
            credit: transaction.amount
        }
    ];
    
    return createJournalEntry({
        type: 'cash_payment',
        date: transaction.date,
        description: `Expense: ${transaction.description}`,
        reference: transaction.id,
        lines
    });
}

// Original functions kept for backward compatibility
function createJournalFromIncome(transaction) {
    return createJournalFromIncomeTransaction(transaction);
}

function createJournalFromExpense(transaction) {
    return createJournalFromExpenseTransaction(transaction);
}

function createJournalFromSale(invoice) {
    const lines = [
        {
            accountCode: '1210', // Trade Receivables
            description: `Invoice ${invoice.invoiceNumber}`,
            debit: invoice.total,
            credit: 0
        },
        {
            accountCode: '4110', // Sales Revenue
            description: `Sales: ${invoice.customerName}`,
            debit: 0,
            credit: invoice.subtotal
        }
    ];
    
    // Add SST if applicable
    if (invoice.sstAmount > 0) {
        lines.push({
            accountCode: '2410', // SST Payable
            description: 'SST on Sales',
            debit: 0,
            credit: invoice.sstAmount
        });
    }
    
    return createJournalEntry({
        type: 'sales',
        date: invoice.date,
        description: `Invoice ${invoice.invoiceNumber} - ${invoice.customerName}`,
        reference: invoice.invoiceNumber,
        lines
    });
}

function createJournalFromPayroll(payrollRun) {
    const lines = [
        // Gross Salary
        {
            accountCode: '5410', // Salaries & Wages
            description: `Payroll: ${payrollRun.period}`,
            debit: payrollRun.grossTotal,
            credit: 0
        },
        // Employer EPF
        {
            accountCode: '5420', // EPF Employer
            description: `EPF Employer: ${payrollRun.period}`,
            debit: payrollRun.employerEpf,
            credit: 0
        },
        // Employer SOCSO
        {
            accountCode: '5430', // SOCSO Employer
            description: `SOCSO Employer: ${payrollRun.period}`,
            debit: payrollRun.employerSocso,
            credit: 0
        },
        // Employer EIS
        {
            accountCode: '5440', // EIS Employer
            description: `EIS Employer: ${payrollRun.period}`,
            debit: payrollRun.employerEis,
            credit: 0
        },
        // Net Pay (Bank)
        {
            accountCode: '1110', // Bank Account
            description: 'Net Salary Payment',
            debit: 0,
            credit: payrollRun.netTotal
        },
        // EPF Payable
        {
            accountCode: '2440', // EPF Payable
            description: 'EPF (Employee + Employer)',
            debit: 0,
            credit: payrollRun.employeeEpf + payrollRun.employerEpf
        },
        // SOCSO Payable
        {
            accountCode: '2450', // SOCSO Payable
            description: 'SOCSO (Employee + Employer)',
            debit: 0,
            credit: payrollRun.employeeSocso + payrollRun.employerSocso
        },
        // EIS Payable
        {
            accountCode: '2460', // EIS Payable
            description: 'EIS (Employee + Employer)',
            debit: 0,
            credit: payrollRun.employeeEis + payrollRun.employerEis
        },
        // PCB Payable
        {
            accountCode: '2430', // PCB Payable
            description: 'PCB/MTD',
            debit: 0,
            credit: payrollRun.pcbTotal
        }
    ];
    
    return createJournalEntry({
        type: 'payroll',
        date: payrollRun.date,
        description: `Payroll - ${payrollRun.period}`,
        reference: payrollRun.id,
        lines
    });
}

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
            <div style="font-size: 24px; font-weight: 700; color: #3b82f6;">${formatNumber(totalAmount)}</div>
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
                <td style="padding: 12px;">${formatDate(entry.date)}</td>
                <td style="padding: 12px;">
                    <span style="background: ${journalType.color}15; color: ${journalType.color}; padding: 3px 10px; border-radius: 15px; font-size: 12px;">
                        ${journalType.name}
                    </span>
                </td>
                <td style="padding: 12px; max-width: 300px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                    ${escapeHTML(entry.description)}
                </td>
                <td style="padding: 12px; text-align: right; font-family: monospace; font-weight: 600;">
                    ${formatNumber(entry.totalDebit)}
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

// ==================== MODALS ====================
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
                <button class="btn-primary" onclick="saveJournalEntry()" id="saveJournalBtn">
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
    
    document.getElementById('journalTotalDebit').textContent = formatNumber(totalDebit);
    document.getElementById('journalTotalCredit').textContent = formatNumber(totalCredit);
    
    const diffRow = document.getElementById('journalDifferenceRow');
    const diffCell = document.getElementById('journalDifference');
    const difference = Math.abs(totalDebit - totalCredit);
    
    if (difference > 0.01) {
        diffRow.style.display = '';
        diffCell.textContent = `RM ${formatNumber(difference)} (${totalDebit > totalCredit ? 'Credit needed' : 'Debit needed'})`;
    } else {
        diffRow.style.display = 'none';
    }
}

function saveJournalEntry() {
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
                        <div style="font-weight: 600;">${formatDate(entry.date)}</div>
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
                                    ${line.debit > 0 ? formatNumber(line.debit) : '-'}
                                </td>
                                <td style="padding: 10px; text-align: right; font-family: monospace;">
                                    ${line.credit > 0 ? formatNumber(line.credit) : '-'}
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                    <tfoot>
                        <tr style="background: #f8fafc; font-weight: 600;">
                            <td colspan="2" style="padding: 10px; border-top: 2px solid #1e293b;">TOTALS</td>
                            <td style="padding: 10px; text-align: right; border-top: 2px solid #1e293b; font-family: monospace;">
                                ${formatNumber(entry.totalDebit)}
                            </td>
                            <td style="padding: 10px; text-align: right; border-top: 2px solid #1e293b; font-family: monospace;">
                                ${formatNumber(entry.totalCredit)}
                            </td>
                        </tr>
                    </tfoot>
                </table>
                
                <!-- Audit Info -->
                <div style="margin-top: 20px; padding: 15px; background: #f1f5f9; border-radius: 8px; font-size: 13px; color: #64748b;">
                    <div><strong>Created:</strong> ${formatDateTime(entry.createdAt)} by ${entry.createdBy}</div>
                    ${entry.postedAt ? `<div><strong>Posted:</strong> ${formatDateTime(entry.postedAt)} by ${entry.postedBy}</div>` : ''}
                    ${entry.voidedAt ? `<div><strong>Voided:</strong> ${formatDateTime(entry.voidedAt)} by ${entry.voidedBy} - ${entry.voidReason}</div>` : ''}
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
function formatDate(dateStr) {
    return new Date(dateStr).toLocaleDateString('en-MY', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
    });
}

function formatDateTime(dateStr) {
    return new Date(dateStr).toLocaleString('en-MY', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function formatNumber(num) {
    return (num || 0).toLocaleString('en-MY', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

// ==================== EXPORTS ====================
window.initJournalEntries = initJournalEntries;
window.loadJournalEntries = loadJournalEntries;
window.createJournalEntry = createJournalEntry;
window.postJournalEntry = postJournalEntry;
window.voidJournalEntry = voidJournalEntry;
window.getJournalEntry = getJournalEntry;
window.getJournalEntriesByDate = getJournalEntriesByDate;
window.getJournalEntriesByAccount = getJournalEntriesByAccount;
window.createJournalFromIncome = createJournalFromIncome;
window.createJournalFromExpense = createJournalFromExpense;
window.createJournalFromIncomeTransaction = createJournalFromIncomeTransaction;
window.createJournalFromExpenseTransaction = createJournalFromExpenseTransaction;
window.getAccountCodeForIncomeCategory = getAccountCodeForIncomeCategory;
window.getAccountCodeForExpenseCategory = getAccountCodeForExpenseCategory;
window.getAccountCodeForPaymentMethod = getAccountCodeForPaymentMethod;
window.createJournalFromSale = createJournalFromSale;
window.createJournalFromPayroll = createJournalFromPayroll;
window.renderJournalEntriesContent = renderJournalEntriesContent;
window.filterJournalEntries = filterJournalEntries;
window.showNewJournalModal = showNewJournalModal;
window.addJournalLine = addJournalLine;
window.removeJournalLine = removeJournalLine;
window.updateJournalTotals = updateJournalTotals;
window.saveJournalEntry = saveJournalEntry;
window.saveAndPostJournalEntry = saveAndPostJournalEntry;
window.showJournalDetail = showJournalDetail;
window.showVoidJournalModal = showVoidJournalModal;
window.confirmVoidJournal = confirmVoidJournal;
window.JOURNAL_TYPES = JOURNAL_TYPES;
window.JOURNAL_STATUS = JOURNAL_STATUS;
window.INCOME_CATEGORY_ACCOUNTS = INCOME_CATEGORY_ACCOUNTS;
window.EXPENSE_CATEGORY_ACCOUNTS = EXPENSE_CATEGORY_ACCOUNTS;
window.PAYMENT_METHOD_ACCOUNTS = PAYMENT_METHOD_ACCOUNTS;
window.journalEntries = journalEntries;
