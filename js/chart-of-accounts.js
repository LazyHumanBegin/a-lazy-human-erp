/**
 * EZCubic ERP - Chart of Accounts Module
 * Malaysian Standard Chart of Accounts with MPERS/MFRS compliance
 * Version: 1.0.0 - 20 Dec 2025
 */

// ==================== STORAGE KEYS ====================
const COA_KEY = 'ezcubic_chart_of_accounts';
const COA_SETTINGS_KEY = 'ezcubic_coa_settings';

// ==================== ACCOUNT TYPES ====================
const ACCOUNT_TYPES = {
    ASSET: {
        id: 'asset',
        name: 'Assets',
        normalBalance: 'debit',
        code: '1',
        color: '#10b981',
        icon: 'fa-building',
        description: 'Resources owned by the business'
    },
    LIABILITY: {
        id: 'liability',
        name: 'Liabilities',
        normalBalance: 'credit',
        code: '2',
        color: '#ef4444',
        icon: 'fa-hand-holding-usd',
        description: 'Obligations owed to others'
    },
    EQUITY: {
        id: 'equity',
        name: 'Equity',
        normalBalance: 'credit',
        code: '3',
        color: '#8b5cf6',
        icon: 'fa-landmark',
        description: 'Owner\'s stake in the business'
    },
    REVENUE: {
        id: 'revenue',
        name: 'Revenue',
        normalBalance: 'credit',
        code: '4',
        color: '#3b82f6',
        icon: 'fa-chart-line',
        description: 'Income from business operations'
    },
    EXPENSE: {
        id: 'expense',
        name: 'Expenses',
        normalBalance: 'debit',
        code: '5',
        color: '#f59e0b',
        icon: 'fa-receipt',
        description: 'Costs of running the business'
    }
};

// ==================== DEFAULT MALAYSIAN CHART OF ACCOUNTS ====================
const DEFAULT_CHART_OF_ACCOUNTS = [
    // ==================== ASSETS (1xxx) ====================
    // Current Assets (10xx - 13xx)
    { code: '1000', name: 'Current Assets', type: 'asset', subtype: 'current', isHeader: true, isSystem: true },
    { code: '1010', name: 'Cash in Hand', type: 'asset', subtype: 'current', parent: '1000', isSystem: true },
    { code: '1020', name: 'Petty Cash', type: 'asset', subtype: 'current', parent: '1000', isSystem: true },
    { code: '1100', name: 'Bank Accounts', type: 'asset', subtype: 'current', parent: '1000', isHeader: true, isSystem: true },
    { code: '1110', name: 'Maybank Current Account', type: 'asset', subtype: 'current', parent: '1100' },
    { code: '1120', name: 'CIMB Business Account', type: 'asset', subtype: 'current', parent: '1100' },
    { code: '1130', name: 'Public Bank Account', type: 'asset', subtype: 'current', parent: '1100' },
    { code: '1140', name: 'RHB Bank Account', type: 'asset', subtype: 'current', parent: '1100' },
    { code: '1150', name: 'Hong Leong Bank Account', type: 'asset', subtype: 'current', parent: '1100' },
    { code: '1200', name: 'Accounts Receivable', type: 'asset', subtype: 'current', parent: '1000', isSystem: true },
    { code: '1210', name: 'Trade Receivables', type: 'asset', subtype: 'current', parent: '1200', isSystem: true },
    { code: '1220', name: 'Other Receivables', type: 'asset', subtype: 'current', parent: '1200' },
    { code: '1230', name: 'Allowance for Doubtful Debts', type: 'asset', subtype: 'current', parent: '1200', isContra: true },
    { code: '1300', name: 'Inventory', type: 'asset', subtype: 'current', parent: '1000', isSystem: true },
    { code: '1310', name: 'Finished Goods', type: 'asset', subtype: 'current', parent: '1300' },
    { code: '1320', name: 'Raw Materials', type: 'asset', subtype: 'current', parent: '1300' },
    { code: '1330', name: 'Work in Progress', type: 'asset', subtype: 'current', parent: '1300' },
    { code: '1400', name: 'Prepaid Expenses', type: 'asset', subtype: 'current', parent: '1000' },
    { code: '1410', name: 'Prepaid Rent', type: 'asset', subtype: 'current', parent: '1400' },
    { code: '1420', name: 'Prepaid Insurance', type: 'asset', subtype: 'current', parent: '1400' },
    { code: '1500', name: 'Deposits', type: 'asset', subtype: 'current', parent: '1000' },
    { code: '1510', name: 'Security Deposits', type: 'asset', subtype: 'current', parent: '1500' },
    { code: '1520', name: 'Utility Deposits', type: 'asset', subtype: 'current', parent: '1500' },
    
    // Non-Current Assets (14xx - 19xx)
    { code: '1600', name: 'Non-Current Assets', type: 'asset', subtype: 'non-current', isHeader: true, isSystem: true },
    { code: '1610', name: 'Property, Plant & Equipment', type: 'asset', subtype: 'non-current', parent: '1600', isHeader: true },
    { code: '1611', name: 'Land', type: 'asset', subtype: 'non-current', parent: '1610' },
    { code: '1612', name: 'Buildings', type: 'asset', subtype: 'non-current', parent: '1610' },
    { code: '1613', name: 'Accumulated Depreciation - Buildings', type: 'asset', subtype: 'non-current', parent: '1610', isContra: true },
    { code: '1620', name: 'Motor Vehicles', type: 'asset', subtype: 'non-current', parent: '1610' },
    { code: '1621', name: 'Accumulated Depreciation - Motor Vehicles', type: 'asset', subtype: 'non-current', parent: '1610', isContra: true },
    { code: '1630', name: 'Office Equipment', type: 'asset', subtype: 'non-current', parent: '1610' },
    { code: '1631', name: 'Accumulated Depreciation - Office Equipment', type: 'asset', subtype: 'non-current', parent: '1610', isContra: true },
    { code: '1640', name: 'Furniture & Fixtures', type: 'asset', subtype: 'non-current', parent: '1610' },
    { code: '1641', name: 'Accumulated Depreciation - Furniture & Fixtures', type: 'asset', subtype: 'non-current', parent: '1610', isContra: true },
    { code: '1650', name: 'Computer Equipment', type: 'asset', subtype: 'non-current', parent: '1610' },
    { code: '1651', name: 'Accumulated Depreciation - Computer Equipment', type: 'asset', subtype: 'non-current', parent: '1610', isContra: true },
    { code: '1700', name: 'Intangible Assets', type: 'asset', subtype: 'non-current', parent: '1600', isHeader: true },
    { code: '1710', name: 'Goodwill', type: 'asset', subtype: 'non-current', parent: '1700' },
    { code: '1720', name: 'Software & Licenses', type: 'asset', subtype: 'non-current', parent: '1700' },
    { code: '1730', name: 'Patents & Trademarks', type: 'asset', subtype: 'non-current', parent: '1700' },
    { code: '1800', name: 'Investments', type: 'asset', subtype: 'non-current', parent: '1600' },
    
    // ==================== LIABILITIES (2xxx) ====================
    // Current Liabilities (20xx - 23xx)
    { code: '2000', name: 'Current Liabilities', type: 'liability', subtype: 'current', isHeader: true, isSystem: true },
    { code: '2100', name: 'Accounts Payable', type: 'liability', subtype: 'current', parent: '2000', isSystem: true },
    { code: '2110', name: 'Trade Payables', type: 'liability', subtype: 'current', parent: '2100', isSystem: true },
    { code: '2120', name: 'Other Payables', type: 'liability', subtype: 'current', parent: '2100' },
    { code: '2200', name: 'Credit Card Payables', type: 'liability', subtype: 'current', parent: '2000' },
    { code: '2300', name: 'Accrued Expenses', type: 'liability', subtype: 'current', parent: '2000' },
    { code: '2310', name: 'Accrued Salaries', type: 'liability', subtype: 'current', parent: '2300' },
    { code: '2320', name: 'Accrued Utilities', type: 'liability', subtype: 'current', parent: '2300' },
    { code: '2400', name: 'Taxes Payable', type: 'liability', subtype: 'current', parent: '2000', isHeader: true },
    { code: '2410', name: 'SST Payable', type: 'liability', subtype: 'current', parent: '2400', isSystem: true },
    { code: '2420', name: 'Income Tax Payable', type: 'liability', subtype: 'current', parent: '2400' },
    { code: '2430', name: 'PCB/MTD Payable', type: 'liability', subtype: 'current', parent: '2400', isSystem: true },
    { code: '2440', name: 'EPF Payable', type: 'liability', subtype: 'current', parent: '2400', isSystem: true },
    { code: '2450', name: 'SOCSO Payable', type: 'liability', subtype: 'current', parent: '2400', isSystem: true },
    { code: '2460', name: 'EIS Payable', type: 'liability', subtype: 'current', parent: '2400', isSystem: true },
    { code: '2500', name: 'Unearned Revenue', type: 'liability', subtype: 'current', parent: '2000' },
    { code: '2510', name: 'Customer Deposits', type: 'liability', subtype: 'current', parent: '2500' },
    { code: '2600', name: 'Short-term Loans', type: 'liability', subtype: 'current', parent: '2000' },
    { code: '2610', name: 'Bank Overdraft', type: 'liability', subtype: 'current', parent: '2600' },
    { code: '2620', name: 'Current Portion of Long-term Debt', type: 'liability', subtype: 'current', parent: '2600' },
    
    // Non-Current Liabilities (24xx - 29xx)
    { code: '2700', name: 'Non-Current Liabilities', type: 'liability', subtype: 'non-current', isHeader: true, isSystem: true },
    { code: '2710', name: 'Long-term Loans', type: 'liability', subtype: 'non-current', parent: '2700' },
    { code: '2720', name: 'Mortgage Payable', type: 'liability', subtype: 'non-current', parent: '2700' },
    { code: '2730', name: 'Hire Purchase Payable', type: 'liability', subtype: 'non-current', parent: '2700' },
    { code: '2800', name: 'Deferred Tax Liability', type: 'liability', subtype: 'non-current', parent: '2700' },
    
    // ==================== EQUITY (3xxx) ====================
    { code: '3000', name: 'Equity', type: 'equity', subtype: 'equity', isHeader: true, isSystem: true },
    { code: '3100', name: 'Share Capital', type: 'equity', subtype: 'equity', parent: '3000', isSystem: true },
    { code: '3110', name: 'Ordinary Share Capital', type: 'equity', subtype: 'equity', parent: '3100' },
    { code: '3120', name: 'Preference Share Capital', type: 'equity', subtype: 'equity', parent: '3100' },
    { code: '3200', name: 'Capital Reserves', type: 'equity', subtype: 'equity', parent: '3000' },
    { code: '3210', name: 'Share Premium', type: 'equity', subtype: 'equity', parent: '3200' },
    { code: '3220', name: 'Revaluation Reserve', type: 'equity', subtype: 'equity', parent: '3200' },
    { code: '3300', name: 'Retained Earnings', type: 'equity', subtype: 'equity', parent: '3000', isSystem: true },
    { code: '3310', name: 'Accumulated Profits', type: 'equity', subtype: 'equity', parent: '3300', isSystem: true },
    { code: '3320', name: 'Current Year Profit/Loss', type: 'equity', subtype: 'equity', parent: '3300', isSystem: true },
    { code: '3400', name: 'Owner\'s Drawings', type: 'equity', subtype: 'equity', parent: '3000', isContra: true },
    { code: '3500', name: 'Owner\'s Capital', type: 'equity', subtype: 'equity', parent: '3000' },
    
    // ==================== REVENUE (4xxx) ====================
    { code: '4000', name: 'Revenue', type: 'revenue', subtype: 'operating', isHeader: true, isSystem: true },
    { code: '4100', name: 'Sales Revenue', type: 'revenue', subtype: 'operating', parent: '4000', isSystem: true },
    { code: '4110', name: 'Product Sales', type: 'revenue', subtype: 'operating', parent: '4100' },
    { code: '4120', name: 'Service Revenue', type: 'revenue', subtype: 'operating', parent: '4100' },
    { code: '4130', name: 'Sales Returns & Allowances', type: 'revenue', subtype: 'operating', parent: '4100', isContra: true },
    { code: '4140', name: 'Sales Discounts', type: 'revenue', subtype: 'operating', parent: '4100', isContra: true },
    { code: '4200', name: 'Other Operating Income', type: 'revenue', subtype: 'operating', parent: '4000' },
    { code: '4210', name: 'Commission Income', type: 'revenue', subtype: 'operating', parent: '4200' },
    { code: '4220', name: 'Rental Income', type: 'revenue', subtype: 'operating', parent: '4200' },
    { code: '4300', name: 'Non-Operating Income', type: 'revenue', subtype: 'non-operating', parent: '4000' },
    { code: '4310', name: 'Interest Income', type: 'revenue', subtype: 'non-operating', parent: '4300' },
    { code: '4320', name: 'Dividend Income', type: 'revenue', subtype: 'non-operating', parent: '4300' },
    { code: '4330', name: 'Gain on Asset Disposal', type: 'revenue', subtype: 'non-operating', parent: '4300' },
    { code: '4340', name: 'Foreign Exchange Gain', type: 'revenue', subtype: 'non-operating', parent: '4300' },
    
    // ==================== EXPENSES (5xxx) ====================
    // Cost of Goods Sold (50xx)
    { code: '5000', name: 'Cost of Goods Sold', type: 'expense', subtype: 'cogs', isHeader: true, isSystem: true },
    { code: '5100', name: 'Purchases', type: 'expense', subtype: 'cogs', parent: '5000', isSystem: true },
    { code: '5110', name: 'Purchases - Raw Materials', type: 'expense', subtype: 'cogs', parent: '5100' },
    { code: '5120', name: 'Purchases - Finished Goods', type: 'expense', subtype: 'cogs', parent: '5100' },
    { code: '5130', name: 'Purchase Returns & Allowances', type: 'expense', subtype: 'cogs', parent: '5100', isContra: true },
    { code: '5140', name: 'Purchase Discounts', type: 'expense', subtype: 'cogs', parent: '5100', isContra: true },
    { code: '5200', name: 'Direct Costs', type: 'expense', subtype: 'cogs', parent: '5000' },
    { code: '5210', name: 'Direct Labor', type: 'expense', subtype: 'cogs', parent: '5200' },
    { code: '5220', name: 'Freight-In', type: 'expense', subtype: 'cogs', parent: '5200' },
    { code: '5230', name: 'Customs & Import Duties', type: 'expense', subtype: 'cogs', parent: '5200' },
    
    // Operating Expenses (51xx - 59xx)
    { code: '5300', name: 'Operating Expenses', type: 'expense', subtype: 'operating', isHeader: true, isSystem: true },
    
    // Payroll & Staff Costs
    { code: '5400', name: 'Payroll & Staff Costs', type: 'expense', subtype: 'operating', parent: '5300', isHeader: true },
    { code: '5410', name: 'Salaries & Wages', type: 'expense', subtype: 'operating', parent: '5400', isSystem: true },
    { code: '5420', name: 'EPF - Employer Contribution', type: 'expense', subtype: 'operating', parent: '5400', isSystem: true },
    { code: '5430', name: 'SOCSO - Employer Contribution', type: 'expense', subtype: 'operating', parent: '5400', isSystem: true },
    { code: '5440', name: 'EIS - Employer Contribution', type: 'expense', subtype: 'operating', parent: '5400', isSystem: true },
    { code: '5450', name: 'Staff Bonuses', type: 'expense', subtype: 'operating', parent: '5400' },
    { code: '5460', name: 'Staff Benefits', type: 'expense', subtype: 'operating', parent: '5400' },
    { code: '5470', name: 'Staff Training', type: 'expense', subtype: 'operating', parent: '5400' },
    { code: '5480', name: 'Staff Insurance', type: 'expense', subtype: 'operating', parent: '5400' },
    { code: '5490', name: 'Commission Expense', type: 'expense', subtype: 'operating', parent: '5400' },
    
    // Office & Administrative
    { code: '5500', name: 'Office & Administrative', type: 'expense', subtype: 'operating', parent: '5300', isHeader: true },
    { code: '5510', name: 'Rent Expense', type: 'expense', subtype: 'operating', parent: '5500' },
    { code: '5520', name: 'Utilities', type: 'expense', subtype: 'operating', parent: '5500' },
    { code: '5521', name: 'Electricity', type: 'expense', subtype: 'operating', parent: '5520' },
    { code: '5522', name: 'Water', type: 'expense', subtype: 'operating', parent: '5520' },
    { code: '5523', name: 'Internet & Telephone', type: 'expense', subtype: 'operating', parent: '5520' },
    { code: '5530', name: 'Office Supplies', type: 'expense', subtype: 'operating', parent: '5500' },
    { code: '5540', name: 'Printing & Stationery', type: 'expense', subtype: 'operating', parent: '5500' },
    { code: '5550', name: 'Postage & Courier', type: 'expense', subtype: 'operating', parent: '5500' },
    { code: '5560', name: 'Cleaning & Maintenance', type: 'expense', subtype: 'operating', parent: '5500' },
    { code: '5570', name: 'Security', type: 'expense', subtype: 'operating', parent: '5500' },
    
    // Professional Services
    { code: '5600', name: 'Professional Services', type: 'expense', subtype: 'operating', parent: '5300', isHeader: true },
    { code: '5610', name: 'Accounting & Audit Fees', type: 'expense', subtype: 'operating', parent: '5600' },
    { code: '5620', name: 'Legal Fees', type: 'expense', subtype: 'operating', parent: '5600' },
    { code: '5630', name: 'Consulting Fees', type: 'expense', subtype: 'operating', parent: '5600' },
    { code: '5640', name: 'Secretarial Fees', type: 'expense', subtype: 'operating', parent: '5600' },
    { code: '5650', name: 'Tax Filing Fees', type: 'expense', subtype: 'operating', parent: '5600' },
    
    // Marketing & Sales
    { code: '5700', name: 'Marketing & Sales', type: 'expense', subtype: 'operating', parent: '5300', isHeader: true },
    { code: '5710', name: 'Advertising', type: 'expense', subtype: 'operating', parent: '5700' },
    { code: '5720', name: 'Marketing Materials', type: 'expense', subtype: 'operating', parent: '5700' },
    { code: '5730', name: 'Website & Digital Marketing', type: 'expense', subtype: 'operating', parent: '5700' },
    { code: '5740', name: 'Trade Shows & Events', type: 'expense', subtype: 'operating', parent: '5700' },
    { code: '5750', name: 'Sales Promotion', type: 'expense', subtype: 'operating', parent: '5700' },
    
    // Travel & Entertainment
    { code: '5800', name: 'Travel & Entertainment', type: 'expense', subtype: 'operating', parent: '5300', isHeader: true },
    { code: '5810', name: 'Travel - Local', type: 'expense', subtype: 'operating', parent: '5800' },
    { code: '5820', name: 'Travel - Overseas', type: 'expense', subtype: 'operating', parent: '5800' },
    { code: '5830', name: 'Accommodation', type: 'expense', subtype: 'operating', parent: '5800' },
    { code: '5840', name: 'Meals & Entertainment', type: 'expense', subtype: 'operating', parent: '5800' },
    { code: '5850', name: 'Fuel & Toll', type: 'expense', subtype: 'operating', parent: '5800' },
    { code: '5860', name: 'Parking', type: 'expense', subtype: 'operating', parent: '5800' },
    
    // Insurance & Licenses
    { code: '5900', name: 'Insurance & Licenses', type: 'expense', subtype: 'operating', parent: '5300', isHeader: true },
    { code: '5910', name: 'Business Insurance', type: 'expense', subtype: 'operating', parent: '5900' },
    { code: '5920', name: 'Vehicle Insurance', type: 'expense', subtype: 'operating', parent: '5900' },
    { code: '5930', name: 'Business Licenses', type: 'expense', subtype: 'operating', parent: '5900' },
    { code: '5940', name: 'Permits & Renewals', type: 'expense', subtype: 'operating', parent: '5900' },
    
    // Depreciation & Amortization
    { code: '6000', name: 'Depreciation & Amortization', type: 'expense', subtype: 'operating', parent: '5300', isHeader: true },
    { code: '6010', name: 'Depreciation - Buildings', type: 'expense', subtype: 'operating', parent: '6000' },
    { code: '6020', name: 'Depreciation - Motor Vehicles', type: 'expense', subtype: 'operating', parent: '6000' },
    { code: '6030', name: 'Depreciation - Office Equipment', type: 'expense', subtype: 'operating', parent: '6000' },
    { code: '6040', name: 'Depreciation - Furniture & Fixtures', type: 'expense', subtype: 'operating', parent: '6000' },
    { code: '6050', name: 'Depreciation - Computer Equipment', type: 'expense', subtype: 'operating', parent: '6000' },
    { code: '6060', name: 'Amortization - Intangibles', type: 'expense', subtype: 'operating', parent: '6000' },
    
    // Financial Expenses
    { code: '6100', name: 'Financial Expenses', type: 'expense', subtype: 'financial', isHeader: true },
    { code: '6110', name: 'Bank Charges', type: 'expense', subtype: 'financial', parent: '6100' },
    { code: '6120', name: 'Interest Expense', type: 'expense', subtype: 'financial', parent: '6100' },
    { code: '6130', name: 'Credit Card Fees', type: 'expense', subtype: 'financial', parent: '6100' },
    { code: '6140', name: 'Foreign Exchange Loss', type: 'expense', subtype: 'financial', parent: '6100' },
    { code: '6150', name: 'Late Payment Penalties', type: 'expense', subtype: 'financial', parent: '6100' },
    
    // Other Expenses
    { code: '6200', name: 'Other Expenses', type: 'expense', subtype: 'other', isHeader: true },
    { code: '6210', name: 'Bad Debts', type: 'expense', subtype: 'other', parent: '6200' },
    { code: '6220', name: 'Loss on Asset Disposal', type: 'expense', subtype: 'other', parent: '6200' },
    { code: '6230', name: 'Donations', type: 'expense', subtype: 'other', parent: '6200' },
    { code: '6240', name: 'Miscellaneous Expenses', type: 'expense', subtype: 'other', parent: '6200' },
    
    // Tax Expense
    { code: '6300', name: 'Tax Expense', type: 'expense', subtype: 'tax', isHeader: true },
    { code: '6310', name: 'Income Tax Expense', type: 'expense', subtype: 'tax', parent: '6300' },
    { code: '6320', name: 'Deferred Tax Expense', type: 'expense', subtype: 'tax', parent: '6300' }
];

// ==================== GLOBAL VARIABLES ====================
let chartOfAccounts = [];

// ==================== INITIALIZATION ====================
function initChartOfAccounts() {
    loadChartOfAccounts();
}

function loadChartOfAccounts() {
    // First check if window.chartOfAccounts was set by tenant data loading
    // Important: Check for Array.isArray, not length - empty array is valid tenant data
    if (Array.isArray(window.chartOfAccounts)) {
        if (window.chartOfAccounts.length > 0) {
            chartOfAccounts = window.chartOfAccounts;
            console.log('Chart of Accounts loaded from tenant data:', chartOfAccounts.length, 'accounts');
            return chartOfAccounts;
        } else {
            // Tenant has empty COA - initialize with defaults for this tenant
            console.log('Tenant has empty Chart of Accounts - initializing with defaults');
            chartOfAccounts = DEFAULT_CHART_OF_ACCOUNTS.map(acc => ({
                ...acc,
                id: acc.code,
                balance: 0,
                isActive: true,
                createdAt: new Date().toISOString()
            }));
            window.chartOfAccounts = chartOfAccounts;
            saveChartOfAccounts();
            return chartOfAccounts;
        }
    }
    
    // No tenant data loaded yet - try localStorage (legacy/fallback)
    const stored = safeLocalStorageGet(COA_KEY, null);
    if (stored && stored.length > 0) {
        chartOfAccounts = stored;
        window.chartOfAccounts = chartOfAccounts;
        console.log('Chart of Accounts loaded from localStorage:', chartOfAccounts.length, 'accounts');
    } else {
        // Initialize with default Malaysian COA
        chartOfAccounts = DEFAULT_CHART_OF_ACCOUNTS.map(acc => ({
            ...acc,
            id: acc.code,
            balance: 0,
            isActive: true,
            createdAt: new Date().toISOString()
        }));
        window.chartOfAccounts = chartOfAccounts;
        saveChartOfAccounts();
        console.log('Chart of Accounts initialized with defaults:', chartOfAccounts.length, 'accounts');
    }
    return chartOfAccounts;
}

function saveChartOfAccounts() {
    safeLocalStorageSet(COA_KEY, chartOfAccounts);
    window.chartOfAccounts = chartOfAccounts;
    
    // Also save to tenant storage for data isolation
    if (typeof saveToUserTenant === 'function') {
        saveToUserTenant();
    }
}

// ==================== ACCOUNT OPERATIONS ====================
function getAccount(code) {
    return chartOfAccounts.find(acc => acc.code === code);
}

function getAccountsByType(type) {
    return chartOfAccounts.filter(acc => acc.type === type && acc.isActive !== false);
}

function getAccountsBySubtype(subtype) {
    return chartOfAccounts.filter(acc => acc.subtype === subtype && acc.isActive !== false);
}

function getChildAccounts(parentCode) {
    return chartOfAccounts.filter(acc => acc.parent === parentCode && acc.isActive !== false);
}

function addAccount(accountData) {
    // Validate required fields
    if (!accountData.code || !accountData.name || !accountData.type) {
        showNotification('Account code, name, and type are required', 'error');
        return false;
    }
    
    // Check for duplicate code
    if (chartOfAccounts.find(acc => acc.code === accountData.code)) {
        showNotification('Account code already exists', 'error');
        return false;
    }
    
    const newAccount = {
        id: accountData.code,
        code: accountData.code,
        name: accountData.name,
        type: accountData.type,
        subtype: accountData.subtype || accountData.type,
        parent: accountData.parent || null,
        description: accountData.description || '',
        balance: 0,
        isActive: true,
        isHeader: accountData.isHeader || false,
        isSystem: false,
        createdAt: new Date().toISOString()
    };
    
    chartOfAccounts.push(newAccount);
    chartOfAccounts.sort((a, b) => a.code.localeCompare(b.code));
    saveChartOfAccounts();
    
    // Record audit log
    if (typeof recordAuditLog === 'function') {
        recordAuditLog({
            action: 'create',
            module: 'chart-of-accounts',
            recordId: newAccount.code,
            details: `Added account: ${newAccount.code} - ${newAccount.name}`
        });
    }
    
    showNotification(`Account ${newAccount.code} added successfully`, 'success');
    return newAccount;
}

function updateAccount(code, updates) {
    const account = chartOfAccounts.find(acc => acc.code === code);
    if (!account) {
        showNotification('Account not found', 'error');
        return false;
    }
    
    if (account.isSystem && (updates.code || updates.type)) {
        showNotification('Cannot modify system account code or type', 'error');
        return false;
    }
    
    // Apply updates
    Object.assign(account, updates, { updatedAt: new Date().toISOString() });
    saveChartOfAccounts();
    
    showNotification(`Account ${code} updated successfully`, 'success');
    return account;
}

function deactivateAccount(code) {
    const account = chartOfAccounts.find(acc => acc.code === code);
    if (!account) {
        showNotification('Account not found', 'error');
        return false;
    }
    
    if (account.isSystem) {
        showNotification('Cannot deactivate system account', 'error');
        return false;
    }
    
    // Check if account has balance
    if (account.balance !== 0) {
        showNotification('Cannot deactivate account with non-zero balance', 'error');
        return false;
    }
    
    account.isActive = false;
    account.deactivatedAt = new Date().toISOString();
    saveChartOfAccounts();
    
    showNotification(`Account ${code} deactivated`, 'success');
    return true;
}

function activateAccount(code) {
    const account = chartOfAccounts.find(acc => acc.code === code);
    if (!account) {
        showNotification('Account not found', 'error');
        return false;
    }
    
    account.isActive = true;
    delete account.deactivatedAt;
    saveChartOfAccounts();
    
    showNotification(`Account ${code} activated`, 'success');
    return true;
}

// ==================== BALANCE OPERATIONS ====================
function updateAccountBalance(code, amount, isDebit) {
    const account = chartOfAccounts.find(acc => acc.code === code);
    if (!account) return false;
    
    const accountType = ACCOUNT_TYPES[account.type.toUpperCase()];
    if (!accountType) return false;
    
    // Apply double-entry logic
    if (accountType.normalBalance === 'debit') {
        account.balance += isDebit ? amount : -amount;
    } else {
        account.balance += isDebit ? -amount : amount;
    }
    
    // Handle contra accounts (reverse the effect)
    if (account.isContra) {
        account.balance = -account.balance;
    }
    
    saveChartOfAccounts();
    return true;
}

function getAccountBalance(code) {
    const account = chartOfAccounts.find(acc => acc.code === code);
    return account ? account.balance : 0;
}

function getTotalByType(type) {
    return chartOfAccounts
        .filter(acc => acc.type === type && !acc.isHeader && acc.isActive !== false)
        .reduce((sum, acc) => sum + (acc.balance || 0), 0);
}

// ==================== TRIAL BALANCE ====================
function generateTrialBalance(asOfDate = new Date()) {
    const trialBalance = {
        date: asOfDate,
        accounts: [],
        totalDebit: 0,
        totalCredit: 0
    };
    
    chartOfAccounts.forEach(account => {
        if (account.isHeader || account.isActive === false) return;
        
        const balance = account.balance || 0;
        if (balance === 0) return; // Skip zero balance accounts
        
        const accountType = ACCOUNT_TYPES[account.type.toUpperCase()];
        const isDebitBalance = accountType.normalBalance === 'debit';
        
        const entry = {
            code: account.code,
            name: account.name,
            type: account.type,
            debit: 0,
            credit: 0
        };
        
        if (balance >= 0) {
            if (isDebitBalance) {
                entry.debit = balance;
                trialBalance.totalDebit += balance;
            } else {
                entry.credit = balance;
                trialBalance.totalCredit += balance;
            }
        } else {
            // Negative balance (unusual)
            if (isDebitBalance) {
                entry.credit = Math.abs(balance);
                trialBalance.totalCredit += Math.abs(balance);
            } else {
                entry.debit = Math.abs(balance);
                trialBalance.totalDebit += Math.abs(balance);
            }
        }
        
        trialBalance.accounts.push(entry);
    });
    
    trialBalance.isBalanced = Math.abs(trialBalance.totalDebit - trialBalance.totalCredit) < 0.01;
    
    return trialBalance;
}

// ==================== RENDERING ====================
function renderChartOfAccountsContent() {
    const contentArea = document.getElementById('chartOfAccountsContent');
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

function getAccountLevel(code) {
    let level = 0;
    let account = chartOfAccounts.find(a => a.code === code);
    while (account?.parent) {
        level++;
        account = chartOfAccounts.find(a => a.code === account.parent);
    }
    return level;
}

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

// ==================== MODALS ====================
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

// ==================== EXPORTS ====================
window.initChartOfAccounts = initChartOfAccounts;
window.loadChartOfAccounts = loadChartOfAccounts;
window.saveChartOfAccounts = saveChartOfAccounts;
window.getAccount = getAccount;
window.getAccountsByType = getAccountsByType;
window.addAccount = addAccount;
window.updateAccount = updateAccount;
window.deactivateAccount = deactivateAccount;
window.activateAccount = activateAccount;
window.updateAccountBalance = updateAccountBalance;
window.getAccountBalance = getAccountBalance;
window.getTotalByType = getTotalByType;
window.generateTrialBalance = generateTrialBalance;
window.renderChartOfAccountsContent = renderChartOfAccountsContent;
window.filterChartOfAccounts = filterChartOfAccounts;
window.scrollToAccountType = scrollToAccountType;
window.showAddAccountModal = showAddAccountModal;
window.updateParentOptions = updateParentOptions;
window.saveNewAccount = saveNewAccount;
window.showEditAccountModal = showEditAccountModal;
window.saveEditedAccount = saveEditedAccount;
window.showTrialBalanceModal = showTrialBalanceModal;
window.exportTrialBalance = exportTrialBalance;
window.ACCOUNT_TYPES = ACCOUNT_TYPES;
window.chartOfAccounts = chartOfAccounts;
