// ==================== TRANSACTIONS-CORE.JS ====================
// EZCubic - Transaction Data Validation and CRUD Operations - Split from transactions.js v2.3.2
// Version: 2.3.2

// ==================== INPUT VALIDATION ====================
/**
 * Validate and sanitize transaction amount
 * @param {*} amount - Raw amount input
 * @returns {Object} { valid: boolean, value: number, error: string }
 */
function validateTransactionAmount(amount) {
    // Parse the amount
    const parsed = parseFloat(amount);
    
    // Check for invalid values
    if (isNaN(parsed)) {
        return { valid: false, value: 0, error: 'Please enter a valid number' };
    }
    
    if (parsed <= 0) {
        return { valid: false, value: 0, error: 'Amount must be greater than zero' };
    }
    
    if (!isFinite(parsed)) {
        return { valid: false, value: 0, error: 'Please enter a valid amount' };
    }
    
    // Check for reasonable limits (max RM 999,999,999.99)
    if (parsed > 999999999.99) {
        return { valid: false, value: 0, error: 'Amount exceeds maximum limit (RM 999,999,999.99)' };
    }
    
    // Round to 2 decimal places to avoid floating point precision issues
    const rounded = Math.round(parsed * 100) / 100;
    
    return { valid: true, value: rounded, error: null };
}

/**
 * Validate and sanitize text input
 * @param {string} text - Raw text input
 * @param {number} maxLength - Maximum allowed length
 * @returns {Object} { valid: boolean, value: string, error: string }
 */
function validateTextInput(text, maxLength = 500) {
    if (!text || typeof text !== 'string') {
        return { valid: false, value: '', error: 'This field is required' };
    }
    
    const trimmed = text.trim();
    
    if (trimmed.length === 0) {
        return { valid: false, value: '', error: 'This field cannot be empty' };
    }
    
    if (trimmed.length > maxLength) {
        return { valid: false, value: '', error: `Maximum ${maxLength} characters allowed` };
    }
    
    return { valid: true, value: trimmed, error: null };
}

/**
 * Validate date input
 * @param {string} dateString - Date string
 * @returns {Object} { valid: boolean, value: string, error: string }
 */
function validateDateInput(dateString) {
    if (!dateString) {
        return { valid: false, value: '', error: 'Please select a date' };
    }
    
    const date = parseDateSafe(dateString);
    
    // Check if valid date
    if (isNaN(date.getTime())) {
        return { valid: false, value: '', error: 'Invalid date format' };
    }
    
    // Check reasonable date range (not before 2000, not more than 1 year in future)
    const minDate = new Date('2000-01-01');
    const maxDate = new Date();
    maxDate.setFullYear(maxDate.getFullYear() + 1);
    
    if (date < minDate) {
        return { valid: false, value: '', error: 'Date cannot be before year 2000' };
    }
    
    if (date > maxDate) {
        return { valid: false, value: '', error: 'Date cannot be more than 1 year in the future' };
    }
    
    return { valid: true, value: dateString, error: null };
}

// ==================== ADD INCOME ====================
function addIncome() {
    // Check transaction limit
    if (typeof canAdd === 'function' && !canAdd('transactions')) {
        return; // Limit reached, modal shown by canAdd()
    }
    
    const date = document.getElementById('incomeDate').value;
    const amountRaw = document.getElementById('incomeAmount').value;
    const description = document.getElementById('incomeDescription').value;
    const category = document.getElementById('incomeCategory').value;
    const method = document.getElementById('incomeMethod').value;
    const customer = document.getElementById('incomeCustomer').value;
    
    // Validate date
    const dateValidation = validateDateInput(date);
    if (!dateValidation.valid) {
        showNotification(dateValidation.error, 'error');
        return;
    }
    
    // Validate amount
    const amountValidation = validateTransactionAmount(amountRaw);
    if (!amountValidation.valid) {
        showNotification(amountValidation.error, 'error');
        return;
    }
    const amount = amountValidation.value;
    
    // Validate description
    const descValidation = validateTextInput(description, 500);
    if (!descValidation.valid) {
        showNotification('Please enter a description', 'error');
        return;
    }
    
    const transactionDate = parseDateSafe(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (transactionDate > today) {
        const confirm = window.confirm('You are recording income for a future date. Continue?');
        if (!confirm) return;
    }
    
    const transaction = {
        id: generateUniqueId(),
        type: 'income',
        date: dateValidation.value,
        amount: amount,
        description: descValidation.value,
        category: category,
        method: method,
        customer: (customer || '').trim(),
        timestamp: new Date().toISOString()
    };
    
    businessData.transactions.push(transaction);
    
    // Create journal entry for double-entry bookkeeping
    if (typeof createJournalFromIncome === 'function') {
        const journalEntry = createJournalFromIncomeTransaction(transaction);
        if (journalEntry && typeof postJournalEntry === 'function') {
            postJournalEntry(journalEntry.id);
        }
    }
    
    // Save data
    const saved = saveData();
    console.log('Income saveData result:', saved);
    
    // Always show notifications regardless of save result
    // Show in-page success message
    const successDiv = document.getElementById('incomeSuccessMessage');
    const successText = document.getElementById('incomeSuccessText');
    console.log('Success elements found:', !!successDiv, !!successText);
    
    if (successDiv && successText) {
        successText.innerHTML = `✅ Income Recorded: <strong>RM ${amount.toFixed(2)}</strong><br><small style="opacity: 0.9;">${description} - ${category}</small>`;
        successDiv.style.display = 'block';
        successDiv.style.animation = 'none';
        successDiv.offsetHeight; // Trigger reflow
        successDiv.style.animation = 'slideIn 0.3s ease';
        
        // Auto-hide after 5 seconds
        setTimeout(() => {
            successDiv.style.opacity = '0';
            successDiv.style.transition = 'opacity 0.3s';
            setTimeout(() => {
                successDiv.style.display = 'none';
                successDiv.style.opacity = '1';
                successDiv.style.transition = '';
            }, 300);
        }, 5000);
    } else {
        console.log('Success div not found, creating alert fallback');
        alert(`✅ Income Recorded: RM ${amount.toFixed(2)}`);
    }
    
    // Also show floating notification
    console.log('Calling showNotification...');
    if (typeof showNotification === 'function') {
        showNotification(`💰 Income recorded: RM ${amount.toFixed(2)}`, 'success');
    } else {
        console.error('showNotification function not available');
    }
    
    // Clear form fields
    document.getElementById('incomeAmount').value = '';
    document.getElementById('incomeDescription').value = '';
    document.getElementById('incomeCustomer').value = '';
    
    updateDashboard();
    
    if (document.getElementById('dashboard').classList.contains('active')) {
        loadRecentTransactions();
    } else if (document.getElementById('transactions').classList.contains('active')) {
        loadTransactions();
    }
    
    updateMalaysianTaxEstimator();
    calculatePersonalTax();
}

// ==================== ADD EXPENSE ====================
function addExpense() {
    // Check transaction limit
    if (typeof canAdd === 'function' && !canAdd('transactions')) {
        return; // Limit reached, modal shown by canAdd()
    }
    
    const date = document.getElementById('expenseDate').value;
    const amountRaw = document.getElementById('expenseAmount').value;
    const description = document.getElementById('expenseDescription').value;
    const category = document.getElementById('expenseCategory').value;
    const vendor = document.getElementById('expenseVendor').value;
    const method = document.getElementById('expenseMethod').value;
    
    // Validate date
    const dateValidation = validateDateInput(date);
    if (!dateValidation.valid) {
        showNotification(dateValidation.error, 'error');
        return;
    }
    
    // Validate amount
    const amountValidation = validateTransactionAmount(amountRaw);
    if (!amountValidation.valid) {
        showNotification(amountValidation.error, 'error');
        return;
    }
    const amount = amountValidation.value;
    
    // Validate description
    const descValidation = validateTextInput(description, 500);
    if (!descValidation.valid) {
        showNotification('Please enter a description', 'error');
        return;
    }
    
    const transactionDate = parseDateSafe(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (transactionDate > today) {
        const confirm = window.confirm('You are recording an expense for a future date. Continue?');
        if (!confirm) return;
    }
    
    const transaction = {
        id: generateUniqueId(),
        type: 'expense',
        date: dateValidation.value,
        amount: amount,
        description: descValidation.value,
        category: category,
        vendor: (vendor || '').trim() || 'Unknown',
        method: method,
        timestamp: new Date().toISOString()
    };
    
    businessData.transactions.push(transaction);
    
    // Create journal entry for double-entry bookkeeping
    if (typeof createJournalFromExpense === 'function') {
        const journalEntry = createJournalFromExpenseTransaction(transaction);
        if (journalEntry && typeof postJournalEntry === 'function') {
            postJournalEntry(journalEntry.id);
        }
    }
    
    // Save data
    const saved = saveData();
    console.log('Expense saveData result:', saved);
    
    // Always show notifications regardless of save result
    // Show in-page success message
    const successDiv = document.getElementById('expenseSuccessMessage');
    const successText = document.getElementById('expenseSuccessText');
    console.log('Expense success elements found:', !!successDiv, !!successText);
    
    if (successDiv && successText) {
        successText.innerHTML = `✅ Expense Recorded: <strong>RM ${amount.toFixed(2)}</strong><br><small style="opacity: 0.9;">${description} - ${category}</small>`;
        successDiv.style.display = 'block';
        successDiv.style.animation = 'none';
        successDiv.offsetHeight; // Trigger reflow
        successDiv.style.animation = 'slideIn 0.3s ease';
        
        // Auto-hide after 5 seconds
        setTimeout(() => {
            successDiv.style.opacity = '0';
            successDiv.style.transition = 'opacity 0.3s';
            setTimeout(() => {
                successDiv.style.display = 'none';
                successDiv.style.opacity = '1';
                successDiv.style.transition = '';
            }, 300);
        }, 5000);
    } else {
        console.log('Expense success div not found, creating alert fallback');
        alert(`✅ Expense Recorded: RM ${amount.toFixed(2)}`);
    }
    
    // Also show floating notification
    console.log('Calling showNotification for expense...');
    if (typeof showNotification === 'function') {
        showNotification(`📦 Expense recorded: RM ${amount.toFixed(2)}`, 'success');
    } else {
        console.error('showNotification function not available');
    }
    
    // Clear form fields
    document.getElementById('expenseAmount').value = '';
    document.getElementById('expenseDescription').value = '';
    document.getElementById('expenseVendor').value = '';
    
    updateDashboard();
    
    if (document.getElementById('dashboard').classList.contains('active')) {
        loadRecentTransactions();
    } else if (document.getElementById('transactions').classList.contains('active')) {
        loadTransactions();
    }
    
    updateMalaysianTaxEstimator();
    calculatePersonalTax();
}

// ==================== DELETE TRANSACTION ====================
function deleteTransaction() {
    console.log('deleteTransaction called');
    const transactionIdEl = document.getElementById('editTransactionId');
    if (!transactionIdEl || !transactionIdEl.value) {
        showNotification('No transaction selected!', 'error');
        return;
    }
    
    const transactionId = transactionIdEl.value;
    console.log('Deleting transaction ID:', transactionId);
    console.log('All transaction IDs:', businessData.transactions.map(tx => tx.id));
    
    if (confirm('Are you sure you want to delete this transaction?')) {
        const originalLength = businessData.transactions.length;
        console.log('Original length:', originalLength);
        
        // Find and log the transaction to be deleted
        const txToDelete = businessData.transactions.find(tx => String(tx.id) === String(transactionId));
        console.log('Transaction to delete:', txToDelete);
        
        if (!txToDelete) {
            showNotification('Transaction not found in data!', 'error');
            return;
        }
        
        // Store transaction data for audit log before deletion
        const deletedTx = { ...txToDelete };
        
        // Use string comparison to ensure match
        businessData.transactions = businessData.transactions.filter(tx => String(tx.id) !== String(transactionId));
        
        // Also sync global transactions array
        if (typeof transactions !== 'undefined') {
            transactions = businessData.transactions;
            window.transactions = businessData.transactions;
        }
        
        console.log('New length:', businessData.transactions.length);
        
        if (businessData.transactions.length < originalLength) {
            // Record audit log for transaction deletion
            if (typeof recordAuditLog === 'function') {
                recordAuditLog({
                    action: 'delete',
                    module: 'transactions',
                    recordId: transactionId,
                    recordName: deletedTx.description || `${deletedTx.type} Transaction`,
                    description: `Transaction deleted: ${deletedTx.type} - RM ${(deletedTx.amount || 0).toFixed(2)} - ${deletedTx.category}`,
                    oldValue: {
                        type: deletedTx.type,
                        amount: deletedTx.amount,
                        category: deletedTx.category,
                        description: deletedTx.description,
                        date: deletedTx.date
                    }
                });
            }
            
            // Save data
            console.log('Saving data...');
            saveData();
            
            // Close modal first
            console.log('Closing modal...');
            closeEditTransactionModal();
            
            // Show notification
            showNotification('🗑️ Transaction deleted successfully!', 'success');
            
            // Update UI - wrap in try-catch to prevent errors from blocking
            try {
                if (typeof updateDashboard === 'function') updateDashboard();
                loadTransactions();
                if (typeof loadRecentTransactions === 'function') loadRecentTransactions();
                if (typeof updateMalaysianTaxEstimator === 'function') updateMalaysianTaxEstimator();
                if (typeof calculatePersonalTax === 'function') calculatePersonalTax();
            } catch (e) {
                console.log('UI update error:', e);
            }
        } else {
            showNotification('Transaction not found!', 'error');
        }
    }
}

function confirmDeleteTransaction(transactionId) {
    console.log('confirmDeleteTransaction called with ID:', transactionId);
    
    if (confirm('Are you sure you want to delete this transaction?')) {
        // Find transaction first
        const txToDelete = businessData.transactions.find(tx => String(tx.id) === String(transactionId));
        console.log('Transaction to delete:', txToDelete);
        
        if (!txToDelete) {
            showNotification('Transaction not found!', 'error');
            return;
        }
        
        // Use string comparison for filtering
        businessData.transactions = businessData.transactions.filter(tx => String(tx.id) !== String(transactionId));
        
        // Sync global transactions array
        if (typeof transactions !== 'undefined') {
            transactions = businessData.transactions;
            window.transactions = businessData.transactions;
        }
        
        // Save data
        saveData();
        
        // Show notification
        showNotification('🗑️ Transaction deleted successfully!', 'success');
        
        // Update UI
        try {
            if (typeof updateDashboard === 'function') updateDashboard();
            if (typeof loadRecentTransactions === 'function') loadRecentTransactions();
            if (document.getElementById('transactions')?.classList.contains('active')) {
                loadTransactions();
            }
            if (typeof updateMalaysianTaxEstimator === 'function') updateMalaysianTaxEstimator();
            if (typeof calculatePersonalTax === 'function') calculatePersonalTax();
        } catch (e) {
            console.log('UI update error:', e);
        }
    }
}

// ==================== QUICK ADD FUNCTIONS ====================
function quickAddIncome() {
    showSection('income');
}

function quickAddExpense() {
    showSection('expenses');
}

// ==================== EXPORT FUNCTIONS ====================
window.validateTransactionAmount = validateTransactionAmount;
window.validateTextInput = validateTextInput;
window.validateDateInput = validateDateInput;
window.addIncome = addIncome;
window.addExpense = addExpense;
window.deleteTransaction = deleteTransaction;
window.confirmDeleteTransaction = confirmDeleteTransaction;
window.quickAddIncome = quickAddIncome;
window.quickAddExpense = quickAddExpense;
