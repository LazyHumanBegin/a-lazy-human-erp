// ==================== APP-FINANCE.JS ====================
// Bank Accounts, Credit Cards, Bulk Entry & Opening Balance Functions
// Part C of app.js split

// ==================== BANK ACCOUNT MANAGEMENT ====================
function showAddBankAccountModal() {
    const modalHTML = `
        <div class="modal" id="addBankAccountModal" style="display: block;">
            <div class="modal-content" style="max-width: 500px;">
                <div class="modal-header">
                    <h3 class="modal-title">
                        <i class="fas fa-university"></i> Add Bank Account
                    </h3>
                    <button class="close-modal" onclick="closeAddBankAccountModal()">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="form-group">
                        <label>Bank Name</label>
                        <select id="newBankName" onchange="handleBankSelect()">
                            <option value="">-- Select Bank --</option>
                            <option value="Maybank">Maybank</option>
                            <option value="CIMB">CIMB Bank</option>
                            <option value="Public Bank">Public Bank</option>
                            <option value="RHB">RHB Bank</option>
                            <option value="Hong Leong">Hong Leong Bank</option>
                            <option value="AmBank">AmBank</option>
                            <option value="Bank Islam">Bank Islam</option>
                            <option value="Bank Rakyat">Bank Rakyat</option>
                            <option value="OCBC">OCBC Bank</option>
                            <option value="UOB">UOB Bank</option>
                            <option value="HSBC">HSBC Bank</option>
                            <option value="Standard Chartered">Standard Chartered</option>
                            <option value="Alliance Bank">Alliance Bank</option>
                            <option value="Affin Bank">Affin Bank</option>
                            <option value="BSN">Bank Simpanan Nasional</option>
                            <option value="other">Other...</option>
                        </select>
                    </div>
                    <div class="form-group" id="customBankNameGroup" style="display: none;">
                        <label>Custom Bank Name</label>
                        <input type="text" id="customBankName" placeholder="Enter bank name">
                    </div>
                    <div class="form-group">
                        <label>Account Number</label>
                        <input type="text" id="newAccountNumber" placeholder="e.g., 1234-5678-9012">
                    </div>
                    <div class="form-group">
                        <label>Account Type</label>
                        <select id="newAccountType">
                            <option value="current">Current Account</option>
                            <option value="savings">Savings Account</option>
                            <option value="fixed">Fixed Deposit</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Current Balance (RM)</label>
                        <input type="number" id="newAccountBalance" placeholder="0.00" step="0.01">
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn-primary" onclick="saveBankAccount()">
                        <i class="fas fa-save"></i> Add Account
                    </button>
                    <button class="btn-secondary" onclick="closeAddBankAccountModal()">
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

function handleBankSelect() {
    const select = document.getElementById('newBankName');
    const customGroup = document.getElementById('customBankNameGroup');
    if (select.value === 'other') {
        customGroup.style.display = 'block';
    } else {
        customGroup.style.display = 'none';
    }
}

function closeAddBankAccountModal() {
    document.getElementById('addBankAccountModal')?.remove();
}

function saveBankAccount() {
    let bankName = document.getElementById('newBankName').value;
    if (bankName === 'other') {
        bankName = document.getElementById('customBankName').value;
    }
    
    const accountNumber = document.getElementById('newAccountNumber').value;
    const accountType = document.getElementById('newAccountType').value;
    const balance = parseFloat(document.getElementById('newAccountBalance').value) || 0;
    
    if (!bankName) {
        showNotification('Please select or enter a bank name', 'warning');
        return;
    }
    
    const accounts = safeLocalStorageGet(BANK_ACCOUNTS_KEY, []);
    
    const newAccount = {
        id: 'bank-' + Date.now(),
        bankName: bankName,
        accountNumber: accountNumber,
        accountType: accountType,
        balance: balance,
        createdAt: new Date().toISOString()
    };
    
    accounts.push(newAccount);
    safeLocalStorageSet(BANK_ACCOUNTS_KEY, accounts);
    
    closeAddBankAccountModal();
    loadBankAccounts();
    updateDetailedBalanceTotals();
    showNotification('Bank account added successfully!', 'success');
}

function loadBankAccounts() {
    const accounts = safeLocalStorageGet(BANK_ACCOUNTS_KEY, []);
    const container = document.getElementById('bankAccountsList');
    if (!container) return;
    
    let html = `
        <div class="balance-item">
            <span>Cash in Hand</span>
            <span class="balance-amount" id="bs-cash">RM 0.00</span>
        </div>
    `;
    
    accounts.forEach(account => {
        const accountLabel = account.accountNumber 
            ? `${account.bankName} (${maskAccountNumber(account.accountNumber)})`
            : account.bankName;
        
        html += `
            <div class="balance-item bank-account-item" data-account-id="${account.id}">
                <div style="flex-grow: 1;">
                    <div style="font-weight: 500;">${accountLabel}</div>
                    <div style="font-size: 11px; color: #64748b;">${getAccountTypeLabel(account.accountType)}</div>
                </div>
                <span class="balance-amount">
                    RM <input type="number" class="balance-input" id="${account.id}" 
                        value="${account.balance || ''}" placeholder="0.00" step="0.01" 
                        oninput="updateBankAccountBalance('${account.id}', this.value)">
                </span>
                <button class="remove-bank-btn" onclick="removeBankAccount('${account.id}')" title="Remove account">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;
    });
    
    container.innerHTML = html;
    
    updateDetailedBalanceTotals();
}

function maskAccountNumber(accountNumber) {
    if (!accountNumber || accountNumber.length < 4) return accountNumber;
    return '****' + accountNumber.slice(-4);
}

function getAccountTypeLabel(type) {
    const labels = {
        'current': 'Current Account',
        'savings': 'Savings Account',
        'fixed': 'Fixed Deposit'
    };
    return labels[type] || type;
}

function updateBankAccountBalance(accountId, value) {
    const accounts = safeLocalStorageGet(BANK_ACCOUNTS_KEY, []);
    const account = accounts.find(a => a.id === accountId);
    
    if (account) {
        account.balance = parseFloat(value) || 0;
        safeLocalStorageSet(BANK_ACCOUNTS_KEY, accounts);
        updateDetailedBalanceTotals();
    }
}

function removeBankAccount(accountId) {
    if (!confirm('Are you sure you want to remove this bank account?')) {
        return;
    }
    
    let accounts = safeLocalStorageGet(BANK_ACCOUNTS_KEY, []);
    accounts = accounts.filter(a => a.id !== accountId);
    safeLocalStorageSet(BANK_ACCOUNTS_KEY, accounts);
    
    loadBankAccounts();
    updateDetailedBalanceTotals();
    showNotification('Bank account removed', 'success');
}

// ==================== CREDIT CARD FUNCTIONS ====================
const CREDIT_CARDS_KEY = 'ezcubic_credit_cards';

function showAddCreditCardModal() {
    const modalHTML = `
        <div class="modal" id="addCreditCardModal" style="display: block;">
            <div class="modal-content" style="max-width: 500px;">
                <div class="modal-header">
                    <h3 class="modal-title">
                        <i class="fas fa-credit-card"></i> Add Credit Card
                    </h3>
                    <button class="close-modal" onclick="closeAddCreditCardModal()">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="form-group">
                        <label>Card Name / Bank</label>
                        <select id="newCardBank">
                            <option value="">-- Select Bank --</option>
                            <option value="Maybank">Maybank</option>
                            <option value="CIMB">CIMB Bank</option>
                            <option value="Public Bank">Public Bank</option>
                            <option value="RHB">RHB Bank</option>
                            <option value="Hong Leong">Hong Leong Bank</option>
                            <option value="AmBank">AmBank</option>
                            <option value="OCBC">OCBC Bank</option>
                            <option value="UOB">UOB Bank</option>
                            <option value="HSBC">HSBC Bank</option>
                            <option value="Standard Chartered">Standard Chartered</option>
                            <option value="Citibank">Citibank</option>
                            <option value="Alliance Bank">Alliance Bank</option>
                            <option value="Affin Bank">Affin Bank</option>
                            <option value="Other">Other</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Last 4 Digits of Card</label>
                        <input type="text" id="newCardLast4" placeholder="1234" maxlength="4" pattern="[0-9]{4}">
                        <div style="font-size: 11px; color: #64748b; margin-top: 4px;">Enter last 4 digits only</div>
                    </div>
                    <div class="form-group">
                        <label>Current Outstanding Balance (RM)</label>
                        <input type="number" id="newCardBalance" placeholder="0.00" step="0.01">
                        <div style="font-size: 11px; color: #64748b; margin-top: 4px;">Amount you currently owe</div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn-primary" onclick="saveCreditCard()">
                        <i class="fas fa-save"></i> Add Card
                    </button>
                    <button class="btn-secondary" onclick="closeAddCreditCardModal()">
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

function closeAddCreditCardModal() {
    document.getElementById('addCreditCardModal')?.remove();
}

function saveCreditCard() {
    const bankName = document.getElementById('newCardBank').value;
    const last4 = document.getElementById('newCardLast4').value;
    const balance = parseFloat(document.getElementById('newCardBalance').value) || 0;
    
    if (!bankName) {
        showNotification('Please select a bank/card issuer', 'warning');
        return;
    }
    
    if (!last4 || last4.length !== 4 || !/^\d{4}$/.test(last4)) {
        showNotification('Please enter valid last 4 digits', 'warning');
        return;
    }
    
    const cards = safeLocalStorageGet(CREDIT_CARDS_KEY, []);
    
    const newCard = {
        id: 'cc-' + Date.now(),
        bankName: bankName,
        last4: last4,
        balance: balance,
        createdAt: new Date().toISOString()
    };
    
    cards.push(newCard);
    safeLocalStorageSet(CREDIT_CARDS_KEY, cards);
    
    closeAddCreditCardModal();
    loadCreditCards();
    updateDetailedBalanceTotals();
    showNotification('Credit card added successfully!', 'success');
}

function loadCreditCards() {
    const cards = safeLocalStorageGet(CREDIT_CARDS_KEY, []);
    const container = document.getElementById('creditCardsList');
    if (!container) return;
    
    if (cards.length === 0) {
        container.innerHTML = '<div style="color: #94a3b8; font-size: 13px; padding: 10px 0;">No credit cards added</div>';
        return;
    }
    
    let html = '';
    
    cards.forEach(card => {
        html += `
            <div class="balance-item credit-card-item" data-card-id="${card.id}">
                <div style="flex-grow: 1;">
                    <div style="font-weight: 500;">${card.bankName}</div>
                    <div style="font-size: 11px; color: #64748b;">**** **** **** ${card.last4}</div>
                </div>
                <span class="balance-amount">
                    RM <input type="number" class="balance-input" id="${card.id}" 
                        value="${card.balance || ''}" placeholder="0.00" step="0.01" 
                        oninput="updateCreditCardBalance('${card.id}', this.value)">
                </span>
                <button class="remove-bank-btn" onclick="removeCreditCard('${card.id}')" title="Remove card">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;
    });
    
    container.innerHTML = html;
    updateDetailedBalanceTotals();
}

function updateCreditCardBalance(cardId, value) {
    const cards = safeLocalStorageGet(CREDIT_CARDS_KEY, []);
    const card = cards.find(c => c.id === cardId);
    
    if (card) {
        card.balance = parseFloat(value) || 0;
        safeLocalStorageSet(CREDIT_CARDS_KEY, cards);
        updateDetailedBalanceTotals();
    }
}

function removeCreditCard(cardId) {
    if (!confirm('Are you sure you want to remove this credit card?')) {
        return;
    }
    
    let cards = safeLocalStorageGet(CREDIT_CARDS_KEY, []);
    cards = cards.filter(c => c.id !== cardId);
    safeLocalStorageSet(CREDIT_CARDS_KEY, cards);
    
    loadCreditCards();
    updateDetailedBalanceTotals();
    showNotification('Credit card removed', 'success');
}

// ==================== BULK ENTRY FUNCTIONS ====================
function showBulkEntryModal() {
    const modalHTML = `
        <div class="modal" id="bulkEntryModal" style="display: block;">
            <div class="modal-content" style="max-width: 800px;">
                <div class="modal-header">
                    <h3 class="modal-title">
                        <i class="fas fa-history"></i> Bulk Entry for Old Transactions
                    </h3>
                    <button class="close-modal" onclick="closeBulkEntryModal()">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="bulk-entry-guide">
                        <h4>How to enter old business data:</h4>
                        <ol style="margin: 15px 0 15px 20px; color: #475569;">
                            <li>Enter your opening balances using the setup wizard</li>
                            <li>Add major transactions from the past 3-6 months</li>
                            <li>You don't need to enter every single transaction</li>
                            <li>Focus on large income and expense items</li>
                        </ol>
                    </div>
                    
                    <div class="bulk-entry-form">
                        <div class="form-row">
                            <div class="form-group">
                                <label>Starting Date</label>
                                <input type="date" id="bulkStartDate">
                            </div>
                            <div class="form-group">
                                <label>Ending Date</label>
                                <input type="date" id="bulkEndDate">
                            </div>
                        </div>
                        
                        <div class="quick-templates" style="margin: 20px 0;">
                            <h4>Quick Entry Templates:</h4>
                            <div style="display: flex; gap: 10px; flex-wrap: wrap; margin-top: 10px;">
                                <button class="template-btn" onclick="loadTemplate('monthly-rent')">
                                    <i class="fas fa-home"></i> Monthly Rent
                                </button>
                                <button class="template-btn" onclick="loadTemplate('utilities')">
                                    <i class="fas fa-bolt"></i> Utilities
                                </button>
                                <button class="template-btn" onclick="loadTemplate('salary')">
                                    <i class="fas fa-user-tie"></i> Monthly Salary
                                </button>
                                <button class="template-btn" onclick="loadTemplate('sales')">
                                    <i class="fas fa-chart-line"></i> Monthly Sales
                                </button>
                            </div>
                        </div>
                        
                        <div style="margin: 20px 0;">
                            <h4>Bulk Transactions</h4>
                            <div style="max-height: 300px; overflow-y: auto; border: 1px solid #e2e8f0; border-radius: 6px; padding: 10px;">
                                <table style="width: 100%;" id="bulkEntryTable">
                                    <thead>
                                        <tr>
                                            <th>Date</th>
                                            <th>Type</th>
                                            <th>Amount</th>
                                            <th>Description</th>
                                            <th></th>
                                        </tr>
                                    </thead>
                                    <tbody id="bulkEntries">
                                        <tr>
                                            <td><input type="date" class="bulk-input"></td>
                                            <td>
                                                <select class="bulk-input">
                                                    <option value="income">Income</option>
                                                    <option value="expense">Expense</option>
                                                </select>
                                            </td>
                                            <td><input type="number" class="bulk-input" placeholder="0.00" step="0.01"></td>
                                            <td><input type="text" class="bulk-input" placeholder="Description"></td>
                                            <td><button onclick="removeBulkRow(this)" style="background: none; border: none; color: #ef4444; cursor: pointer;"><i class="fas fa-times"></i></button></td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                            <button class="btn-secondary" onclick="addBulkRow()" style="margin-top: 10px; width: 100%;">
                                <i class="fas fa-plus"></i> Add Row
                            </button>
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn-primary" onclick="processBulkEntries()">
                        <i class="fas fa-save"></i> Save All Entries
                    </button>
                    <button class="btn-secondary" onclick="closeBulkEntryModal()">
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

function addBulkRow() {
    const tbody = document.getElementById('bulkEntries');
    const newRow = document.createElement('tr');
    newRow.innerHTML = `
        <td><input type="date" class="bulk-input"></td>
        <td>
            <select class="bulk-input">
                <option value="income">Income</option>
                <option value="expense">Expense</option>
            </select>
        </td>
        <td><input type="number" class="bulk-input" placeholder="0.00" step="0.01"></td>
        <td><input type="text" class="bulk-input" placeholder="Description"></td>
        <td><button onclick="removeBulkRow(this)" style="background: none; border: none; color: #ef4444; cursor: pointer;"><i class="fas fa-times"></i></button></td>
    `;
    tbody.appendChild(newRow);
}

function removeBulkRow(button) {
    button.closest('tr').remove();
}

function processBulkEntries() {
    const rows = document.querySelectorAll('#bulkEntries tr');
    const transactions = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    let addedCount = 0;
    
    rows.forEach(row => {
        const inputs = row.querySelectorAll('.bulk-input');
        if (inputs[0].value && inputs[2].value) {
            transactions.push({
                id: Date.now() + Math.random(),
                type: inputs[1].value,
                amount: parseFloat(inputs[2].value),
                description: inputs[3].value,
                date: inputs[0].value,
                category: inputs[1].value === 'income' ? 'sales' : 'other',
                method: 'bank'
            });
            addedCount++;
        }
    });
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));
    closeBulkEntryModal();
    showNotification(`${addedCount} entries saved successfully!`, 'success');
    updateDashboard();
}

function closeBulkEntryModal() {
    document.getElementById('bulkEntryModal')?.remove();
}

function loadTemplate(templateType) {
    const startDate = document.getElementById('bulkStartDate')?.value;
    const endDate = document.getElementById('bulkEndDate')?.value;
    
    if (!startDate || !endDate) {
        showNotification('Please select start and end dates first', 'warning');
        return;
    }
    
    const start = new Date(startDate);
    const end = new Date(endDate);
    const months = [];
    
    let current = new Date(start);
    while (current <= end) {
        months.push(new Date(current));
        current.setMonth(current.getMonth() + 1);
    }
    
    const tbody = document.getElementById('bulkEntries');
    tbody.innerHTML = '';
    
    const templates = {
        'monthly-rent': { type: 'expense', description: 'Monthly Rent', amount: '' },
        'utilities': { type: 'expense', description: 'Utilities (Electric/Water)', amount: '' },
        'salary': { type: 'expense', description: 'Staff Salary', amount: '' },
        'sales': { type: 'income', description: 'Monthly Sales', amount: '' }
    };
    
    const template = templates[templateType];
    
    months.forEach(month => {
        const dateStr = month.toISOString().split('T')[0];
        const row = document.createElement('tr');
        row.innerHTML = `
            <td><input type="date" class="bulk-input" value="${dateStr}"></td>
            <td>
                <select class="bulk-input">
                    <option value="income" ${template.type === 'income' ? 'selected' : ''}>Income</option>
                    <option value="expense" ${template.type === 'expense' ? 'selected' : ''}>Expense</option>
                </select>
            </td>
            <td><input type="number" class="bulk-input" placeholder="0.00" step="0.01" value="${template.amount}"></td>
            <td><input type="text" class="bulk-input" value="${template.description}"></td>
            <td><button onclick="removeBulkRow(this)" style="background: none; border: none; color: #ef4444; cursor: pointer;"><i class="fas fa-times"></i></button></td>
        `;
        tbody.appendChild(row);
    });
    
    showNotification(`Template loaded for ${months.length} months`, 'success');
}

// ==================== OPENING BALANCE WIZARD ====================
function showOpeningBalanceWizard() {
    const modalHTML = `
        <div class="modal" id="openingBalanceModal" style="display: block;">
            <div class="modal-content" style="max-width: 600px;">
                <div class="modal-header">
                    <h3 class="modal-title">
                        <i class="fas fa-calculator"></i> Set Opening Balances
                    </h3>
                    <button class="close-modal" onclick="closeOpeningBalanceModal()">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="wizard-intro">
                        <i class="fas fa-piggy-bank"></i>
                        <h4>Enter your opening balances</h4>
                        <p style="color: #64748b;">These are the balances as of the date you start using EZCubic</p>
                    </div>
                    
                    <div class="form-group">
                        <label>Opening Balance Date</label>
                        <input type="date" id="openingBalanceDate" value="${new Date().toISOString().split('T')[0]}">
                    </div>
                    
                    <div class="balance-input-group">
                        <div class="balance-field">
                            <label><i class="fas fa-university"></i> Bank Account Balance</label>
                            <input type="number" id="openingBankBalance" placeholder="0.00" step="0.01">
                            <div class="field-hint">Total cash in all bank accounts</div>
                        </div>
                        
                        <div class="balance-field">
                            <label><i class="fas fa-money-bill-wave"></i> Cash on Hand</label>
                            <input type="number" id="openingCashBalance" placeholder="0.00" step="0.01">
                            <div class="field-hint">Physical cash in your business</div>
                        </div>
                        
                        <div class="balance-field">
                            <label><i class="fas fa-file-invoice-dollar"></i> Accounts Receivable</label>
                            <input type="number" id="openingReceivable" placeholder="0.00" step="0.01">
                            <div class="field-hint">Money owed to you by customers</div>
                        </div>
                        
                        <div class="balance-field">
                            <label><i class="fas fa-credit-card"></i> Accounts Payable</label>
                            <input type="number" id="openingPayable" placeholder="0.00" step="0.01">
                            <div class="field-hint">Money you owe to suppliers</div>
                        </div>
                        
                        <div class="balance-field">
                            <label><i class="fas fa-boxes"></i> Inventory Value</label>
                            <input type="number" id="openingInventory" placeholder="0.00" step="0.01">
                            <div class="field-hint">Total value of stock/inventory</div>
                        </div>
                        
                        <div class="balance-field">
                            <label><i class="fas fa-building"></i> Fixed Assets</label>
                            <input type="number" id="openingFixedAssets" placeholder="0.00" step="0.01">
                            <div class="field-hint">Equipment, vehicles, property</div>
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn-primary" onclick="saveOpeningBalances()">
                        <i class="fas fa-save"></i> Save Opening Balances
                    </button>
                    <button class="btn-secondary" onclick="closeOpeningBalanceModal()">
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    const openingBalances = safeLocalStorageGet(OPENING_BALANCE_KEY, {});
    if (openingBalances.date) {
        document.getElementById('openingBalanceDate').value = openingBalances.date;
        document.getElementById('openingBankBalance').value = openingBalances.bankBalance || '';
        document.getElementById('openingCashBalance').value = openingBalances.cashBalance || '';
        document.getElementById('openingReceivable').value = openingBalances.receivable || '';
        document.getElementById('openingPayable').value = openingBalances.payable || '';
        document.getElementById('openingInventory').value = openingBalances.inventory || '';
        document.getElementById('openingFixedAssets').value = openingBalances.fixedAssets || '';
    }
}

function saveOpeningBalances() {
    const openingBalances = {
        date: document.getElementById('openingBalanceDate').value,
        bankBalance: parseFloat(document.getElementById('openingBankBalance').value) || 0,
        cashBalance: parseFloat(document.getElementById('openingCashBalance').value) || 0,
        receivable: parseFloat(document.getElementById('openingReceivable').value) || 0,
        payable: parseFloat(document.getElementById('openingPayable').value) || 0,
        inventory: parseFloat(document.getElementById('openingInventory').value) || 0,
        fixedAssets: parseFloat(document.getElementById('openingFixedAssets').value) || 0
    };
    
    safeLocalStorageSet(OPENING_BALANCE_KEY, openingBalances);
    
    const manualBalances = safeLocalStorageGet(MANUAL_BALANCES_KEY, {});
    manualBalances['bank-account-input'] = openingBalances.bankBalance;
    manualBalances['inventory-input'] = openingBalances.inventory;
    manualBalances['fixed-assets-input'] = openingBalances.fixedAssets;
    safeLocalStorageSet(MANUAL_BALANCES_KEY, manualBalances);
    
    closeOpeningBalanceModal();
    showNotification('Opening balances saved successfully!', 'success');
    
    if (document.getElementById('detailed-view')?.classList.contains('active')) {
        loadDetailedBalanceSheet();
    }
}

function closeOpeningBalanceModal() {
    document.getElementById('openingBalanceModal')?.remove();
}

// ==================== WINDOW EXPORTS ====================
// Bank Account functions
window.showAddBankAccountModal = showAddBankAccountModal;
window.handleBankSelect = handleBankSelect;
window.closeAddBankAccountModal = closeAddBankAccountModal;
window.saveBankAccount = saveBankAccount;
window.loadBankAccounts = loadBankAccounts;
window.maskAccountNumber = maskAccountNumber;
window.getAccountTypeLabel = getAccountTypeLabel;
window.updateBankAccountBalance = updateBankAccountBalance;
window.removeBankAccount = removeBankAccount;

// Credit Card functions
window.showAddCreditCardModal = showAddCreditCardModal;
window.closeAddCreditCardModal = closeAddCreditCardModal;
window.saveCreditCard = saveCreditCard;
window.loadCreditCards = loadCreditCards;
window.updateCreditCardBalance = updateCreditCardBalance;
window.removeCreditCard = removeCreditCard;

// Bulk Entry functions
window.showBulkEntryModal = showBulkEntryModal;
window.addBulkRow = addBulkRow;
window.removeBulkRow = removeBulkRow;
window.processBulkEntries = processBulkEntries;
window.closeBulkEntryModal = closeBulkEntryModal;
window.loadTemplate = loadTemplate;

// Opening Balance functions
window.showOpeningBalanceWizard = showOpeningBalanceWizard;
window.saveOpeningBalances = saveOpeningBalances;
window.closeOpeningBalanceModal = closeOpeningBalanceModal;
