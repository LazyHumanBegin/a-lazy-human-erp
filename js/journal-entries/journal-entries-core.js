/**
 * EZCubic ERP - Journal Entries Core Module
 * Double-Entry Bookkeeping System - Data & Operations
 * Version: 2.3.0 - Split from journal-entries.js
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

// ==================== ACCOUNT MAPPINGS ====================

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

// ==================== AUTO-GENERATION FROM TRANSACTIONS ====================

// Create journal entry from income transaction
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

// Create journal entry from expense transaction
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

// Backward compatibility aliases
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

// ==================== HELPER FUNCTIONS ====================
function formatNumber(num) {
    return (num || 0).toLocaleString('en-MY', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

// ==================== WINDOW EXPORTS ====================
window.JOURNAL_KEY = JOURNAL_KEY;
window.JOURNAL_SEQUENCE_KEY = JOURNAL_SEQUENCE_KEY;
window.JOURNAL_TYPES = JOURNAL_TYPES;
window.JOURNAL_STATUS = JOURNAL_STATUS;
window.journalEntries = journalEntries;
window.journalSequence = journalSequence;
window.initJournalEntries = initJournalEntries;
window.loadJournalEntries = loadJournalEntries;
window.saveJournalEntries = saveJournalEntries;
window.loadJournalSequence = loadJournalSequence;
window.saveJournalSequence = saveJournalSequence;
window.generateJournalNumber = generateJournalNumber;
window.createJournalEntry = createJournalEntry;
window.postJournalEntry = postJournalEntry;
window.voidJournalEntry = voidJournalEntry;
window.getJournalEntry = getJournalEntry;
window.getJournalEntriesByDate = getJournalEntriesByDate;
window.getJournalEntriesByAccount = getJournalEntriesByAccount;
window.INCOME_CATEGORY_ACCOUNTS = INCOME_CATEGORY_ACCOUNTS;
window.EXPENSE_CATEGORY_ACCOUNTS = EXPENSE_CATEGORY_ACCOUNTS;
window.PAYMENT_METHOD_ACCOUNTS = PAYMENT_METHOD_ACCOUNTS;
window.getAccountCodeForIncomeCategory = getAccountCodeForIncomeCategory;
window.getAccountCodeForExpenseCategory = getAccountCodeForExpenseCategory;
window.getAccountCodeForPaymentMethod = getAccountCodeForPaymentMethod;
window.createJournalFromIncomeTransaction = createJournalFromIncomeTransaction;
window.createJournalFromExpenseTransaction = createJournalFromExpenseTransaction;
window.createJournalFromIncome = createJournalFromIncome;
window.createJournalFromExpense = createJournalFromExpense;
window.createJournalFromSale = createJournalFromSale;
window.createJournalFromPayroll = createJournalFromPayroll;
