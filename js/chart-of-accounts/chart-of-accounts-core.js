// ==================== CHART OF ACCOUNTS CORE - v2.3.1 ====================
// Data management, CRUD operations, and business logic
// Split from chart-of-accounts.js for better maintainability

// ==================== STORAGE KEYS ====================
const COA_KEY = 'ezsmartChartOfAccounts';
const COA_SETTINGS_KEY = 'ezsmartCOASettings';

// ==================== ACCOUNT TYPES ====================
const ACCOUNT_TYPES = {
    ASSET: {
        id: 'asset',
        name: 'Assets',
        code: '1',
        description: 'Resources owned by the business',
        normalBalance: 'debit',
        icon: 'fa-building',
        color: '#2563eb'
    },
    LIABILITY: {
        id: 'liability',
        name: 'Liabilities',
        code: '2',
        description: 'Obligations owed to others',
        normalBalance: 'credit',
        icon: 'fa-file-invoice-dollar',
        color: '#dc2626'
    },
    EQUITY: {
        id: 'equity',
        name: 'Equity',
        code: '3',
        description: "Owner's stake in the business",
        normalBalance: 'credit',
        icon: 'fa-landmark',
        color: '#7c3aed'
    },
    REVENUE: {
        id: 'revenue',
        name: 'Revenue',
        code: '4',
        description: 'Income from business operations',
        normalBalance: 'credit',
        icon: 'fa-chart-line',
        color: '#059669'
    },
    EXPENSE: {
        id: 'expense',
        name: 'Expenses',
        code: '5',
        description: 'Costs of business operations',
        normalBalance: 'debit',
        icon: 'fa-receipt',
        color: '#ea580c'
    }
};

// ==================== DEFAULT MALAYSIAN CHART OF ACCOUNTS ====================
const DEFAULT_CHART_OF_ACCOUNTS = [
    // ========== ASSETS (1xxx) ==========
    { code: '1000', name: 'ASSETS', type: 'asset', subtype: 'asset', isHeader: true, isSystem: true },
    
    // Current Assets (11xx)
    { code: '1100', name: 'Current Assets', type: 'asset', subtype: 'current_asset', parent: '1000', isHeader: true },
    
    // Cash & Bank (111x)
    { code: '1110', name: 'Cash and Cash Equivalents', type: 'asset', subtype: 'cash', parent: '1100', isHeader: true },
    { code: '1111', name: 'Cash on Hand', type: 'asset', subtype: 'cash', parent: '1110', balance: 0 },
    { code: '1112', name: 'Petty Cash', type: 'asset', subtype: 'cash', parent: '1110', balance: 0 },
    { code: '1113', name: 'Cash in Transit', type: 'asset', subtype: 'cash', parent: '1110', balance: 0 },
    { code: '1114', name: 'Bank - Maybank', type: 'asset', subtype: 'bank', parent: '1110', balance: 0 },
    { code: '1115', name: 'Bank - CIMB', type: 'asset', subtype: 'bank', parent: '1110', balance: 0 },
    { code: '1116', name: 'Bank - Public Bank', type: 'asset', subtype: 'bank', parent: '1110', balance: 0 },
    { code: '1117', name: 'Bank - RHB', type: 'asset', subtype: 'bank', parent: '1110', balance: 0 },
    { code: '1118', name: 'Bank - Hong Leong', type: 'asset', subtype: 'bank', parent: '1110', balance: 0 },
    { code: '1119', name: 'Fixed Deposit', type: 'asset', subtype: 'bank', parent: '1110', balance: 0 },
    
    // Receivables (112x)
    { code: '1120', name: 'Receivables', type: 'asset', subtype: 'receivable', parent: '1100', isHeader: true },
    { code: '1121', name: 'Accounts Receivable - Trade', type: 'asset', subtype: 'receivable', parent: '1120', balance: 0 },
    { code: '1122', name: 'Accounts Receivable - Other', type: 'asset', subtype: 'receivable', parent: '1120', balance: 0 },
    { code: '1123', name: 'Allowance for Doubtful Debts', type: 'asset', subtype: 'receivable', parent: '1120', balance: 0, isContra: true },
    { code: '1124', name: 'Staff Loans & Advances', type: 'asset', subtype: 'receivable', parent: '1120', balance: 0 },
    { code: '1125', name: 'Director Advances', type: 'asset', subtype: 'receivable', parent: '1120', balance: 0 },
    { code: '1126', name: 'GST Refundable (Historical)', type: 'asset', subtype: 'receivable', parent: '1120', balance: 0 },
    { code: '1127', name: 'Deposits Receivable', type: 'asset', subtype: 'receivable', parent: '1120', balance: 0 },
    
    // Inventory (113x)
    { code: '1130', name: 'Inventory', type: 'asset', subtype: 'inventory', parent: '1100', isHeader: true },
    { code: '1131', name: 'Inventory - Raw Materials', type: 'asset', subtype: 'inventory', parent: '1130', balance: 0 },
    { code: '1132', name: 'Inventory - Work in Progress', type: 'asset', subtype: 'inventory', parent: '1130', balance: 0 },
    { code: '1133', name: 'Inventory - Finished Goods', type: 'asset', subtype: 'inventory', parent: '1130', balance: 0 },
    { code: '1134', name: 'Inventory - Trading Goods', type: 'asset', subtype: 'inventory', parent: '1130', balance: 0 },
    { code: '1135', name: 'Inventory Provision', type: 'asset', subtype: 'inventory', parent: '1130', balance: 0, isContra: true },
    
    // Prepayments (114x)
    { code: '1140', name: 'Prepayments', type: 'asset', subtype: 'prepaid', parent: '1100', isHeader: true },
    { code: '1141', name: 'Prepaid Insurance', type: 'asset', subtype: 'prepaid', parent: '1140', balance: 0 },
    { code: '1142', name: 'Prepaid Rent', type: 'asset', subtype: 'prepaid', parent: '1140', balance: 0 },
    { code: '1143', name: 'Prepaid Expenses - Other', type: 'asset', subtype: 'prepaid', parent: '1140', balance: 0 },
    
    // Non-Current Assets (12xx)
    { code: '1200', name: 'Non-Current Assets', type: 'asset', subtype: 'non_current_asset', parent: '1000', isHeader: true },
    
    // Fixed Assets (121x)
    { code: '1210', name: 'Property, Plant & Equipment', type: 'asset', subtype: 'fixed_asset', parent: '1200', isHeader: true },
    { code: '1211', name: 'Land', type: 'asset', subtype: 'fixed_asset', parent: '1210', balance: 0 },
    { code: '1212', name: 'Buildings', type: 'asset', subtype: 'fixed_asset', parent: '1210', balance: 0 },
    { code: '1213', name: 'Accumulated Depreciation - Buildings', type: 'asset', subtype: 'fixed_asset', parent: '1210', balance: 0, isContra: true },
    { code: '1214', name: 'Plant & Machinery', type: 'asset', subtype: 'fixed_asset', parent: '1210', balance: 0 },
    { code: '1215', name: 'Accumulated Depreciation - Plant & Machinery', type: 'asset', subtype: 'fixed_asset', parent: '1210', balance: 0, isContra: true },
    { code: '1216', name: 'Motor Vehicles', type: 'asset', subtype: 'fixed_asset', parent: '1210', balance: 0 },
    { code: '1217', name: 'Accumulated Depreciation - Motor Vehicles', type: 'asset', subtype: 'fixed_asset', parent: '1210', balance: 0, isContra: true },
    { code: '1218', name: 'Office Equipment', type: 'asset', subtype: 'fixed_asset', parent: '1210', balance: 0 },
    { code: '1219', name: 'Accumulated Depreciation - Office Equipment', type: 'asset', subtype: 'fixed_asset', parent: '1210', balance: 0, isContra: true },
    { code: '1220', name: 'Furniture & Fittings', type: 'asset', subtype: 'fixed_asset', parent: '1210', balance: 0 },
    { code: '1221', name: 'Accumulated Depreciation - Furniture & Fittings', type: 'asset', subtype: 'fixed_asset', parent: '1210', balance: 0, isContra: true },
    { code: '1222', name: 'Computer Equipment', type: 'asset', subtype: 'fixed_asset', parent: '1210', balance: 0 },
    { code: '1223', name: 'Accumulated Depreciation - Computer Equipment', type: 'asset', subtype: 'fixed_asset', parent: '1210', balance: 0, isContra: true },
    { code: '1224', name: 'Renovation', type: 'asset', subtype: 'fixed_asset', parent: '1210', balance: 0 },
    { code: '1225', name: 'Accumulated Depreciation - Renovation', type: 'asset', subtype: 'fixed_asset', parent: '1210', balance: 0, isContra: true },
    
    // Intangible Assets (123x)
    { code: '1230', name: 'Intangible Assets', type: 'asset', subtype: 'intangible', parent: '1200', isHeader: true },
    { code: '1231', name: 'Goodwill', type: 'asset', subtype: 'intangible', parent: '1230', balance: 0 },
    { code: '1232', name: 'Software & Licenses', type: 'asset', subtype: 'intangible', parent: '1230', balance: 0 },
    { code: '1233', name: 'Accumulated Amortization', type: 'asset', subtype: 'intangible', parent: '1230', balance: 0, isContra: true },
    
    // Investments (124x)
    { code: '1240', name: 'Investments', type: 'asset', subtype: 'investment', parent: '1200', isHeader: true },
    { code: '1241', name: 'Investment in Subsidiaries', type: 'asset', subtype: 'investment', parent: '1240', balance: 0 },
    { code: '1242', name: 'Investment in Associates', type: 'asset', subtype: 'investment', parent: '1240', balance: 0 },
    { code: '1243', name: 'Other Investments', type: 'asset', subtype: 'investment', parent: '1240', balance: 0 },
    
    // ========== LIABILITIES (2xxx) ==========
    { code: '2000', name: 'LIABILITIES', type: 'liability', subtype: 'liability', isHeader: true, isSystem: true },
    
    // Current Liabilities (21xx)
    { code: '2100', name: 'Current Liabilities', type: 'liability', subtype: 'current_liability', parent: '2000', isHeader: true },
    
    // Payables (211x)
    { code: '2110', name: 'Payables', type: 'liability', subtype: 'payable', parent: '2100', isHeader: true },
    { code: '2111', name: 'Accounts Payable - Trade', type: 'liability', subtype: 'payable', parent: '2110', balance: 0 },
    { code: '2112', name: 'Accounts Payable - Other', type: 'liability', subtype: 'payable', parent: '2110', balance: 0 },
    { code: '2113', name: 'Accrued Expenses', type: 'liability', subtype: 'payable', parent: '2110', balance: 0 },
    { code: '2114', name: 'Deposits Received', type: 'liability', subtype: 'payable', parent: '2110', balance: 0 },
    { code: '2115', name: 'Unearned Revenue', type: 'liability', subtype: 'payable', parent: '2110', balance: 0 },
    
    // Tax Liabilities (212x)
    { code: '2120', name: 'Tax Liabilities', type: 'liability', subtype: 'tax', parent: '2100', isHeader: true },
    { code: '2121', name: 'SST Payable', type: 'liability', subtype: 'tax', parent: '2120', balance: 0 },
    { code: '2122', name: 'Income Tax Payable', type: 'liability', subtype: 'tax', parent: '2120', balance: 0 },
    { code: '2123', name: 'Withholding Tax Payable', type: 'liability', subtype: 'tax', parent: '2120', balance: 0 },
    { code: '2124', name: 'GST Payable (Historical)', type: 'liability', subtype: 'tax', parent: '2120', balance: 0 },
    
    // Employee Liabilities (213x)
    { code: '2130', name: 'Employee Liabilities', type: 'liability', subtype: 'employee', parent: '2100', isHeader: true },
    { code: '2131', name: 'Salaries & Wages Payable', type: 'liability', subtype: 'employee', parent: '2130', balance: 0 },
    { code: '2132', name: 'EPF Payable', type: 'liability', subtype: 'employee', parent: '2130', balance: 0 },
    { code: '2133', name: 'SOCSO Payable', type: 'liability', subtype: 'employee', parent: '2130', balance: 0 },
    { code: '2134', name: 'EIS Payable', type: 'liability', subtype: 'employee', parent: '2130', balance: 0 },
    { code: '2135', name: 'PCB Payable', type: 'liability', subtype: 'employee', parent: '2130', balance: 0 },
    { code: '2136', name: 'HRDF Payable', type: 'liability', subtype: 'employee', parent: '2130', balance: 0 },
    
    // Short-term Borrowings (214x)
    { code: '2140', name: 'Short-term Borrowings', type: 'liability', subtype: 'borrowing', parent: '2100', isHeader: true },
    { code: '2141', name: 'Bank Overdraft', type: 'liability', subtype: 'borrowing', parent: '2140', balance: 0 },
    { code: '2142', name: 'Short-term Loans', type: 'liability', subtype: 'borrowing', parent: '2140', balance: 0 },
    { code: '2143', name: 'Current Portion of Long-term Debt', type: 'liability', subtype: 'borrowing', parent: '2140', balance: 0 },
    
    // Non-Current Liabilities (22xx)
    { code: '2200', name: 'Non-Current Liabilities', type: 'liability', subtype: 'non_current_liability', parent: '2000', isHeader: true },
    { code: '2210', name: 'Long-term Borrowings', type: 'liability', subtype: 'long_term_debt', parent: '2200', isHeader: true },
    { code: '2211', name: 'Term Loans', type: 'liability', subtype: 'long_term_debt', parent: '2210', balance: 0 },
    { code: '2212', name: 'Hire Purchase Payable', type: 'liability', subtype: 'long_term_debt', parent: '2210', balance: 0 },
    { code: '2213', name: 'Finance Lease Liability', type: 'liability', subtype: 'long_term_debt', parent: '2210', balance: 0 },
    { code: '2214', name: 'Deferred Tax Liability', type: 'liability', subtype: 'long_term_debt', parent: '2210', balance: 0 },
    { code: '2215', name: 'Directors Loan', type: 'liability', subtype: 'long_term_debt', parent: '2210', balance: 0 },
    
    // ========== EQUITY (3xxx) ==========
    { code: '3000', name: 'EQUITY', type: 'equity', subtype: 'equity', isHeader: true, isSystem: true },
    
    // Share Capital (31xx)
    { code: '3100', name: 'Share Capital', type: 'equity', subtype: 'capital', parent: '3000', isHeader: true },
    { code: '3110', name: 'Ordinary Shares', type: 'equity', subtype: 'capital', parent: '3100', balance: 0 },
    { code: '3120', name: 'Preference Shares', type: 'equity', subtype: 'capital', parent: '3100', balance: 0 },
    { code: '3130', name: 'Share Premium', type: 'equity', subtype: 'capital', parent: '3100', balance: 0 },
    
    // Reserves (32xx)
    { code: '3200', name: 'Reserves', type: 'equity', subtype: 'reserve', parent: '3000', isHeader: true },
    { code: '3210', name: 'Retained Earnings', type: 'equity', subtype: 'reserve', parent: '3200', balance: 0, isSystem: true },
    { code: '3220', name: 'Capital Reserve', type: 'equity', subtype: 'reserve', parent: '3200', balance: 0 },
    { code: '3230', name: 'Revaluation Reserve', type: 'equity', subtype: 'reserve', parent: '3200', balance: 0 },
    { code: '3240', name: 'Translation Reserve', type: 'equity', subtype: 'reserve', parent: '3200', balance: 0 },
    
    // Current Year (33xx)
    { code: '3300', name: 'Current Year', type: 'equity', subtype: 'current', parent: '3000', isHeader: true },
    { code: '3310', name: 'Current Year Profit/Loss', type: 'equity', subtype: 'current', parent: '3300', balance: 0, isSystem: true },
    { code: '3320', name: 'Dividends', type: 'equity', subtype: 'current', parent: '3300', balance: 0 },
    { code: '3330', name: 'Drawings', type: 'equity', subtype: 'current', parent: '3300', balance: 0 },
    
    // ========== REVENUE (4xxx) ==========
    { code: '4000', name: 'REVENUE', type: 'revenue', subtype: 'revenue', isHeader: true, isSystem: true },
    
    // Operating Revenue (41xx)
    { code: '4100', name: 'Operating Revenue', type: 'revenue', subtype: 'operating', parent: '4000', isHeader: true },
    { code: '4110', name: 'Sales - Products', type: 'revenue', subtype: 'sales', parent: '4100', balance: 0 },
    { code: '4120', name: 'Sales - Services', type: 'revenue', subtype: 'sales', parent: '4100', balance: 0 },
    { code: '4130', name: 'Sales - Projects', type: 'revenue', subtype: 'sales', parent: '4100', balance: 0 },
    { code: '4140', name: 'Sales Returns & Allowances', type: 'revenue', subtype: 'sales', parent: '4100', balance: 0, isContra: true },
    { code: '4150', name: 'Sales Discounts', type: 'revenue', subtype: 'sales', parent: '4100', balance: 0, isContra: true },
    
    // Other Revenue (42xx)
    { code: '4200', name: 'Other Revenue', type: 'revenue', subtype: 'other_income', parent: '4000', isHeader: true },
    { code: '4210', name: 'Interest Income', type: 'revenue', subtype: 'other_income', parent: '4200', balance: 0 },
    { code: '4220', name: 'Dividend Income', type: 'revenue', subtype: 'other_income', parent: '4200', balance: 0 },
    { code: '4230', name: 'Rental Income', type: 'revenue', subtype: 'other_income', parent: '4200', balance: 0 },
    { code: '4240', name: 'Gain on Disposal of Assets', type: 'revenue', subtype: 'other_income', parent: '4200', balance: 0 },
    { code: '4250', name: 'Foreign Exchange Gain', type: 'revenue', subtype: 'other_income', parent: '4200', balance: 0 },
    { code: '4260', name: 'Miscellaneous Income', type: 'revenue', subtype: 'other_income', parent: '4200', balance: 0 },
    
    // ========== EXPENSES (5xxx) ==========
    { code: '5000', name: 'EXPENSES', type: 'expense', subtype: 'expense', isHeader: true, isSystem: true },
    
    // Cost of Sales (51xx)
    { code: '5100', name: 'Cost of Sales', type: 'expense', subtype: 'cogs', parent: '5000', isHeader: true },
    { code: '5110', name: 'Purchases', type: 'expense', subtype: 'cogs', parent: '5100', balance: 0 },
    { code: '5111', name: 'Purchase Returns', type: 'expense', subtype: 'cogs', parent: '5100', balance: 0, isContra: true },
    { code: '5112', name: 'Purchase Discounts', type: 'expense', subtype: 'cogs', parent: '5100', balance: 0, isContra: true },
    { code: '5120', name: 'Direct Labour', type: 'expense', subtype: 'cogs', parent: '5100', balance: 0 },
    { code: '5130', name: 'Direct Materials', type: 'expense', subtype: 'cogs', parent: '5100', balance: 0 },
    { code: '5140', name: 'Manufacturing Overhead', type: 'expense', subtype: 'cogs', parent: '5100', balance: 0 },
    { code: '5150', name: 'Freight Inward', type: 'expense', subtype: 'cogs', parent: '5100', balance: 0 },
    { code: '5160', name: 'Import Duties', type: 'expense', subtype: 'cogs', parent: '5100', balance: 0 },
    
    // Operating Expenses (52xx)
    { code: '5200', name: 'Operating Expenses', type: 'expense', subtype: 'operating', parent: '5000', isHeader: true },
    
    // Employee Costs (521x)
    { code: '5210', name: 'Employee Costs', type: 'expense', subtype: 'employee', parent: '5200', isHeader: true },
    { code: '5211', name: 'Salaries & Wages', type: 'expense', subtype: 'employee', parent: '5210', balance: 0 },
    { code: '5212', name: 'EPF - Employer', type: 'expense', subtype: 'employee', parent: '5210', balance: 0 },
    { code: '5213', name: 'SOCSO - Employer', type: 'expense', subtype: 'employee', parent: '5210', balance: 0 },
    { code: '5214', name: 'EIS - Employer', type: 'expense', subtype: 'employee', parent: '5210', balance: 0 },
    { code: '5215', name: 'HRDF Levy', type: 'expense', subtype: 'employee', parent: '5210', balance: 0 },
    { code: '5216', name: 'Staff Benefits', type: 'expense', subtype: 'employee', parent: '5210', balance: 0 },
    { code: '5217', name: 'Staff Training', type: 'expense', subtype: 'employee', parent: '5210', balance: 0 },
    { code: '5218', name: 'Staff Welfare', type: 'expense', subtype: 'employee', parent: '5210', balance: 0 },
    { code: '5219', name: 'Directors Remuneration', type: 'expense', subtype: 'employee', parent: '5210', balance: 0 },
    
    // Premises Costs (522x)
    { code: '5220', name: 'Premises Costs', type: 'expense', subtype: 'premises', parent: '5200', isHeader: true },
    { code: '5221', name: 'Rent', type: 'expense', subtype: 'premises', parent: '5220', balance: 0 },
    { code: '5222', name: 'Utilities - Electricity', type: 'expense', subtype: 'premises', parent: '5220', balance: 0 },
    { code: '5223', name: 'Utilities - Water', type: 'expense', subtype: 'premises', parent: '5220', balance: 0 },
    { code: '5224', name: 'Property Tax/Assessment', type: 'expense', subtype: 'premises', parent: '5220', balance: 0 },
    { code: '5225', name: 'Repairs & Maintenance', type: 'expense', subtype: 'premises', parent: '5220', balance: 0 },
    { code: '5226', name: 'Security', type: 'expense', subtype: 'premises', parent: '5220', balance: 0 },
    { code: '5227', name: 'Cleaning', type: 'expense', subtype: 'premises', parent: '5220', balance: 0 },
    
    // Administrative Expenses (523x)
    { code: '5230', name: 'Administrative Expenses', type: 'expense', subtype: 'admin', parent: '5200', isHeader: true },
    { code: '5231', name: 'Office Supplies', type: 'expense', subtype: 'admin', parent: '5230', balance: 0 },
    { code: '5232', name: 'Printing & Stationery', type: 'expense', subtype: 'admin', parent: '5230', balance: 0 },
    { code: '5233', name: 'Telephone & Internet', type: 'expense', subtype: 'admin', parent: '5230', balance: 0 },
    { code: '5234', name: 'Postage & Courier', type: 'expense', subtype: 'admin', parent: '5230', balance: 0 },
    { code: '5235', name: 'Bank Charges', type: 'expense', subtype: 'admin', parent: '5230', balance: 0 },
    { code: '5236', name: 'Professional Fees - Accounting', type: 'expense', subtype: 'admin', parent: '5230', balance: 0 },
    { code: '5237', name: 'Professional Fees - Legal', type: 'expense', subtype: 'admin', parent: '5230', balance: 0 },
    { code: '5238', name: 'Professional Fees - Secretarial', type: 'expense', subtype: 'admin', parent: '5230', balance: 0 },
    { code: '5239', name: 'Professional Fees - Other', type: 'expense', subtype: 'admin', parent: '5230', balance: 0 },
    
    // Marketing Expenses (524x)
    { code: '5240', name: 'Marketing Expenses', type: 'expense', subtype: 'marketing', parent: '5200', isHeader: true },
    { code: '5241', name: 'Advertising', type: 'expense', subtype: 'marketing', parent: '5240', balance: 0 },
    { code: '5242', name: 'Promotion', type: 'expense', subtype: 'marketing', parent: '5240', balance: 0 },
    { code: '5243', name: 'Commission', type: 'expense', subtype: 'marketing', parent: '5240', balance: 0 },
    { code: '5244', name: 'Entertainment', type: 'expense', subtype: 'marketing', parent: '5240', balance: 0 },
    { code: '5245', name: 'Business Development', type: 'expense', subtype: 'marketing', parent: '5240', balance: 0 },
    
    // Vehicle Expenses (525x)
    { code: '5250', name: 'Vehicle Expenses', type: 'expense', subtype: 'vehicle', parent: '5200', isHeader: true },
    { code: '5251', name: 'Fuel', type: 'expense', subtype: 'vehicle', parent: '5250', balance: 0 },
    { code: '5252', name: 'Vehicle Repairs & Maintenance', type: 'expense', subtype: 'vehicle', parent: '5250', balance: 0 },
    { code: '5253', name: 'Road Tax & Insurance', type: 'expense', subtype: 'vehicle', parent: '5250', balance: 0 },
    { code: '5254', name: 'Parking & Toll', type: 'expense', subtype: 'vehicle', parent: '5250', balance: 0 },
    
    // Travel Expenses (526x)
    { code: '5260', name: 'Travel Expenses', type: 'expense', subtype: 'travel', parent: '5200', isHeader: true },
    { code: '5261', name: 'Local Travel', type: 'expense', subtype: 'travel', parent: '5260', balance: 0 },
    { code: '5262', name: 'Overseas Travel', type: 'expense', subtype: 'travel', parent: '5260', balance: 0 },
    { code: '5263', name: 'Accommodation', type: 'expense', subtype: 'travel', parent: '5260', balance: 0 },
    { code: '5264', name: 'Meals & Subsistence', type: 'expense', subtype: 'travel', parent: '5260', balance: 0 },
    
    // Insurance (527x)
    { code: '5270', name: 'Insurance', type: 'expense', subtype: 'insurance', parent: '5200', isHeader: true },
    { code: '5271', name: 'General Insurance', type: 'expense', subtype: 'insurance', parent: '5270', balance: 0 },
    { code: '5272', name: 'Fire Insurance', type: 'expense', subtype: 'insurance', parent: '5270', balance: 0 },
    { code: '5273', name: 'Workmen Compensation', type: 'expense', subtype: 'insurance', parent: '5270', balance: 0 },
    { code: '5274', name: 'Professional Indemnity', type: 'expense', subtype: 'insurance', parent: '5270', balance: 0 },
    
    // Depreciation & Amortization (528x)
    { code: '5280', name: 'Depreciation & Amortization', type: 'expense', subtype: 'depreciation', parent: '5200', isHeader: true },
    { code: '5281', name: 'Depreciation - Buildings', type: 'expense', subtype: 'depreciation', parent: '5280', balance: 0 },
    { code: '5282', name: 'Depreciation - Plant & Machinery', type: 'expense', subtype: 'depreciation', parent: '5280', balance: 0 },
    { code: '5283', name: 'Depreciation - Motor Vehicles', type: 'expense', subtype: 'depreciation', parent: '5280', balance: 0 },
    { code: '5284', name: 'Depreciation - Office Equipment', type: 'expense', subtype: 'depreciation', parent: '5280', balance: 0 },
    { code: '5285', name: 'Depreciation - Furniture & Fittings', type: 'expense', subtype: 'depreciation', parent: '5280', balance: 0 },
    { code: '5286', name: 'Depreciation - Computer Equipment', type: 'expense', subtype: 'depreciation', parent: '5280', balance: 0 },
    { code: '5287', name: 'Depreciation - Renovation', type: 'expense', subtype: 'depreciation', parent: '5280', balance: 0 },
    { code: '5288', name: 'Amortization - Intangibles', type: 'expense', subtype: 'depreciation', parent: '5280', balance: 0 },
    
    // Other Operating Expenses (529x)
    { code: '5290', name: 'Other Operating Expenses', type: 'expense', subtype: 'other', parent: '5200', isHeader: true },
    { code: '5291', name: 'Bad Debts', type: 'expense', subtype: 'other', parent: '5290', balance: 0 },
    { code: '5292', name: 'Provision for Doubtful Debts', type: 'expense', subtype: 'other', parent: '5290', balance: 0 },
    { code: '5293', name: 'Foreign Exchange Loss', type: 'expense', subtype: 'other', parent: '5290', balance: 0 },
    { code: '5294', name: 'Loss on Disposal of Assets', type: 'expense', subtype: 'other', parent: '5290', balance: 0 },
    { code: '5295', name: 'Penalties & Fines', type: 'expense', subtype: 'other', parent: '5290', balance: 0 },
    { code: '5296', name: 'Donations', type: 'expense', subtype: 'other', parent: '5290', balance: 0 },
    { code: '5297', name: 'Subscriptions & Memberships', type: 'expense', subtype: 'other', parent: '5290', balance: 0 },
    { code: '5298', name: 'Miscellaneous Expenses', type: 'expense', subtype: 'other', parent: '5290', balance: 0 },
    
    // Finance Costs (53xx)
    { code: '5300', name: 'Finance Costs', type: 'expense', subtype: 'finance', parent: '5000', isHeader: true },
    { code: '5310', name: 'Interest on Loans', type: 'expense', subtype: 'finance', parent: '5300', balance: 0 },
    { code: '5320', name: 'Interest on Hire Purchase', type: 'expense', subtype: 'finance', parent: '5300', balance: 0 },
    { code: '5330', name: 'Interest on Finance Lease', type: 'expense', subtype: 'finance', parent: '5300', balance: 0 },
    { code: '5340', name: 'Bank Charges - Finance', type: 'expense', subtype: 'finance', parent: '5300', balance: 0 },
    
    // Tax Expenses (54xx)
    { code: '5400', name: 'Tax Expenses', type: 'expense', subtype: 'tax', parent: '5000', isHeader: true },
    { code: '5410', name: 'Current Tax Expense', type: 'expense', subtype: 'tax', parent: '5400', balance: 0 },
    { code: '5420', name: 'Deferred Tax Expense', type: 'expense', subtype: 'tax', parent: '5400', balance: 0 }
];

// Global variables
let chartOfAccounts = [];

// ==================== INITIALIZATION ====================
function initChartOfAccounts() {
    loadChartOfAccounts();
    console.log('Chart of Accounts initialized');
}

// ==================== DATA MANAGEMENT ====================
function loadChartOfAccounts() {
    const saved = localStorage.getItem(COA_KEY);
    if (saved) {
        chartOfAccounts = JSON.parse(saved);
    } else {
        // Initialize with default Malaysian COA
        chartOfAccounts = JSON.parse(JSON.stringify(DEFAULT_CHART_OF_ACCOUNTS));
        saveChartOfAccounts();
    }
    return chartOfAccounts;
}

function saveChartOfAccounts() {
    localStorage.setItem(COA_KEY, JSON.stringify(chartOfAccounts));
}

// ==================== ACCOUNT CRUD OPERATIONS ====================
function getAccount(code) {
    return chartOfAccounts.find(acc => acc.code === code);
}

function getAccountsByType(type) {
    return chartOfAccounts.filter(acc => acc.type === type && !acc.isHeader);
}

function getAccountsBySubtype(subtype) {
    return chartOfAccounts.filter(acc => acc.subtype === subtype && !acc.isHeader);
}

function getChildAccounts(parentCode) {
    return chartOfAccounts.filter(acc => acc.parent === parentCode);
}

function addAccount(accountData) {
    // Validate
    if (chartOfAccounts.find(acc => acc.code === accountData.code)) {
        showNotification('Account code already exists', 'error');
        return false;
    }
    
    const newAccount = {
        code: accountData.code,
        name: accountData.name,
        type: accountData.type,
        subtype: accountData.subtype || accountData.type,
        parent: accountData.parent || null,
        description: accountData.description || '',
        isHeader: accountData.isHeader || false,
        isActive: true,
        balance: 0,
        createdAt: new Date().toISOString()
    };
    
    // Insert in correct position (sorted by code)
    const insertIndex = chartOfAccounts.findIndex(acc => acc.code > newAccount.code);
    if (insertIndex === -1) {
        chartOfAccounts.push(newAccount);
    } else {
        chartOfAccounts.splice(insertIndex, 0, newAccount);
    }
    
    saveChartOfAccounts();
    showNotification('Account added successfully', 'success');
    return true;
}

function updateAccount(code, updates) {
    const index = chartOfAccounts.findIndex(acc => acc.code === code);
    if (index === -1) return false;
    
    // Don't allow changing system accounts
    if (chartOfAccounts[index].isSystem) {
        showNotification('Cannot modify system account', 'error');
        return false;
    }
    
    chartOfAccounts[index] = { ...chartOfAccounts[index], ...updates, updatedAt: new Date().toISOString() };
    saveChartOfAccounts();
    showNotification('Account updated successfully', 'success');
    return true;
}

function deactivateAccount(code) {
    const account = chartOfAccounts.find(acc => acc.code === code);
    if (!account) return false;
    
    if (account.isSystem) {
        showNotification('Cannot deactivate system account', 'error');
        return false;
    }
    
    if (account.balance !== 0) {
        showNotification('Cannot deactivate account with non-zero balance', 'error');
        return false;
    }
    
    account.isActive = false;
    saveChartOfAccounts();
    showNotification('Account deactivated', 'success');
    return true;
}

function activateAccount(code) {
    const account = chartOfAccounts.find(acc => acc.code === code);
    if (!account) return false;
    
    account.isActive = true;
    saveChartOfAccounts();
    showNotification('Account activated', 'success');
    return true;
}

// ==================== BALANCE OPERATIONS ====================
function updateAccountBalance(code, amount, transactionType = 'debit') {
    const account = chartOfAccounts.find(acc => acc.code === code);
    if (!account) return false;
    
    const typeInfo = ACCOUNT_TYPES[account.type.toUpperCase()];
    if (!typeInfo) return false;
    
    // Determine if this increases or decreases the balance
    const isIncrease = (transactionType === typeInfo.normalBalance);
    
    if (isIncrease) {
        account.balance = (account.balance || 0) + amount;
    } else {
        account.balance = (account.balance || 0) - amount;
    }
    
    saveChartOfAccounts();
    return true;
}

function getAccountBalance(code) {
    const account = chartOfAccounts.find(acc => acc.code === code);
    return account ? (account.balance || 0) : 0;
}

function getTotalByType(type) {
    return chartOfAccounts
        .filter(acc => acc.type === type && !acc.isHeader)
        .reduce((sum, acc) => sum + (acc.balance || 0), 0);
}

// ==================== TRIAL BALANCE ====================
function generateTrialBalance() {
    let totalDebit = 0;
    let totalCredit = 0;
    
    const accounts = chartOfAccounts
        .filter(acc => !acc.isHeader && acc.balance !== 0)
        .map(acc => {
            const typeInfo = ACCOUNT_TYPES[acc.type.toUpperCase()];
            let debit = 0;
            let credit = 0;
            
            if (typeInfo.normalBalance === 'debit') {
                if (acc.balance >= 0) {
                    debit = acc.balance;
                } else {
                    credit = Math.abs(acc.balance);
                }
            } else {
                if (acc.balance >= 0) {
                    credit = acc.balance;
                } else {
                    debit = Math.abs(acc.balance);
                }
            }
            
            totalDebit += debit;
            totalCredit += credit;
            
            return {
                code: acc.code,
                name: acc.name,
                debit,
                credit
            };
        });
    
    return {
        accounts,
        totalDebit,
        totalCredit,
        isBalanced: Math.abs(totalDebit - totalCredit) < 0.01
    };
}

// ==================== HELPER FUNCTIONS ====================
function getAccountLevel(code) {
    let level = 0;
    let account = chartOfAccounts.find(a => a.code === code);
    while (account?.parent) {
        level++;
        account = chartOfAccounts.find(a => a.code === account.parent);
    }
    return level;
}

// ==================== WINDOW EXPORTS ====================
window.COA_KEY = COA_KEY;
window.COA_SETTINGS_KEY = COA_SETTINGS_KEY;
window.ACCOUNT_TYPES = ACCOUNT_TYPES;
window.DEFAULT_CHART_OF_ACCOUNTS = DEFAULT_CHART_OF_ACCOUNTS;
window.chartOfAccounts = chartOfAccounts;
window.initChartOfAccounts = initChartOfAccounts;
window.loadChartOfAccounts = loadChartOfAccounts;
window.saveChartOfAccounts = saveChartOfAccounts;
window.getAccount = getAccount;
window.getAccountsByType = getAccountsByType;
window.getAccountsBySubtype = getAccountsBySubtype;
window.getChildAccounts = getChildAccounts;
window.addAccount = addAccount;
window.updateAccount = updateAccount;
window.deactivateAccount = deactivateAccount;
window.activateAccount = activateAccount;
window.updateAccountBalance = updateAccountBalance;
window.getAccountBalance = getAccountBalance;
window.getTotalByType = getTotalByType;
window.generateTrialBalance = generateTrialBalance;
window.getAccountLevel = getAccountLevel;
