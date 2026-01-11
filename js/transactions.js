// ==================== TRANSACTIONS.JS ====================
// Transaction CRUD Functions
// Version: 2.1.6 - Added robust input validation - 20 Dec 2025

// Early function declarations to prevent reference errors
var closeEditModal, editTransaction, saveEditedTransaction;

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

function quickAddIncome() {
    showSection('income');
}

function quickAddExpense() {
    showSection('expenses');
}

// ==================== EDIT TRANSACTION ====================
function editTransaction(transactionId) {
    const transaction = businessData.transactions.find(tx => tx.id === transactionId);
    if (!transaction) return;
    
    document.getElementById('editTransactionId').value = transaction.id;
    document.getElementById('editTransactionType').value = transaction.type;
    document.getElementById('editTransactionDate').value = transaction.date;
    document.getElementById('editTransactionAmount').value = transaction.amount;
    document.getElementById('editTransactionDescription').value = transaction.description;
    document.getElementById('editTransactionMethod').value = transaction.method;
    
    const customerField = document.getElementById('editTransactionCustomerField');
    const vendorField = document.getElementById('editTransactionVendorField');
    
    if (transaction.type === 'income') {
        customerField.style.display = 'block';
        vendorField.style.display = 'none';
        document.getElementById('editTransactionCustomer').value = transaction.customer || '';
    } else {
        customerField.style.display = 'none';
        vendorField.style.display = 'block';
        document.getElementById('editTransactionVendor').value = transaction.vendor || '';
    }
    
    const categorySelect = document.getElementById('editTransactionCategory');
    categorySelect.innerHTML = '';
    
    let categories = [];
    if (transaction.type === 'income') {
        categories = [
            { value: 'sales', label: 'Sales Revenue' },
            { value: 'service', label: 'Service Income' },
            { value: 'rental', label: 'Rental Income' },
            { value: 'interest', label: 'Interest Income' },
            { value: 'other', label: 'Other Income' }
        ];
    } else {
        categories = [
            { value: 'rent', label: 'Rent' },
            { value: 'utilities', label: 'Utilities (TNB, Water, Internet)' },
            { value: 'supplies', label: 'Office Supplies' },
            { value: 'salary', label: 'Salaries & EPF' },
            { value: 'marketing', label: 'Marketing & Advertising' },
            { value: 'travel', label: 'Travel & Transportation' },
            { value: 'entertainment', label: 'Entertainment' },
            { value: 'professional', label: 'Professional Fees' },
            { value: 'other', label: 'Other' }
        ];
    }
    
    categories.forEach(cat => {
        const option = document.createElement('option');
        option.value = cat.value;
        option.text = cat.label;
        option.selected = cat.value === transaction.category;
        categorySelect.appendChild(option);
    });
    
    const modal = document.getElementById('editTransactionModal');
    if (modal) {
        modal.style.display = ''; // Clear inline style first
        modal.classList.add('show');
        console.log('Modal opened for transaction:', transaction.id);
    }
}

function closeEditTransactionModal() {
    console.log('closeEditTransactionModal called');
    const modal = document.getElementById('editTransactionModal');
    if (modal) {
        modal.classList.remove('show');
        modal.style.display = ''; // Clear inline style to let CSS take over
        console.log('Modal closed');
    }
}

function saveEditedTransaction() {
    console.log('saveEditedTransaction called');
    const transactionId = document.getElementById('editTransactionId').value;
    console.log('Transaction ID:', transactionId);
    const transactionType = document.getElementById('editTransactionType').value;
    const date = document.getElementById('editTransactionDate').value;
    const amount = parseFloat(document.getElementById('editTransactionAmount').value);
    const description = document.getElementById('editTransactionDescription').value.trim();
    const category = document.getElementById('editTransactionCategory').value;
    const method = document.getElementById('editTransactionMethod').value;
    
    if (!date || !amount || amount <= 0) {
        showNotification('Please enter a valid date and amount', 'error');
        return;
    }
    
    if (!description) {
        showNotification('Please enter a description', 'error');
        return;
    }
    
    const transactionIndex = businessData.transactions.findIndex(tx => tx.id === transactionId);
    if (transactionIndex !== -1) {
        businessData.transactions[transactionIndex].date = date;
        businessData.transactions[transactionIndex].amount = amount;
        businessData.transactions[transactionIndex].description = description;
        businessData.transactions[transactionIndex].category = category;
        businessData.transactions[transactionIndex].method = method;
        
        if (transactionType === 'income') {
            businessData.transactions[transactionIndex].customer = document.getElementById('editTransactionCustomer').value.trim();
        } else {
            businessData.transactions[transactionIndex].vendor = document.getElementById('editTransactionVendor').value.trim();
        }
        
        businessData.transactions[transactionIndex].timestamp = new Date().toISOString();
        
        // Save data
        saveData();
        
        // Close modal first
        closeEditTransactionModal();
        
        // Show notification
        showNotification('✅ Transaction updated successfully!', 'success');
        
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
            
            // Save data to main localStorage
            console.log('Saving data...');
            saveData();
            
            // CRITICAL: Also save directly to tenant storage to ensure deletion persists
            const user = window.currentUser;
            if (user && user.tenantId) {
                const tenantKey = 'ezcubic_tenant_' + user.tenantId;
                let tenantData = JSON.parse(localStorage.getItem(tenantKey) || '{}');
                tenantData.transactions = businessData.transactions;
                tenantData.updatedAt = new Date().toISOString();
                localStorage.setItem(tenantKey, JSON.stringify(tenantData));
                console.log('✅ Transaction deletion saved directly to tenant storage');
            }
            
            // Force cloud sync to ensure deletion persists
            if (typeof CloudSync !== 'undefined' && CloudSync.uploadToCloud) {
                CloudSync.uploadToCloud().then(() => {
                    console.log('☁️ Deletion synced to cloud');
                }).catch(err => {
                    console.warn('Cloud sync failed:', err);
                });
            }
            
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
        
        // CRITICAL: Also save directly to tenant storage to ensure deletion persists
        const user = window.currentUser;
        if (user && user.tenantId) {
            const tenantKey = 'ezcubic_tenant_' + user.tenantId;
            let tenantData = JSON.parse(localStorage.getItem(tenantKey) || '{}');
            tenantData.transactions = businessData.transactions;
            tenantData.updatedAt = new Date().toISOString();
            localStorage.setItem(tenantKey, JSON.stringify(tenantData));
            console.log('✅ Transaction deletion saved directly to tenant storage');
        }
        
        // Force cloud sync to ensure deletion persists
        if (typeof CloudSync !== 'undefined' && CloudSync.uploadToCloud) {
            CloudSync.uploadToCloud().then(() => {
                console.log('☁️ Deletion synced to cloud');
            }).catch(err => {
                console.warn('Cloud sync failed:', err);
            });
        }
        
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

function clearFilters() {
    const categoryEl = document.getElementById('filterCategory');
    const monthEl = document.getElementById('filterMonth');
    const dayEl = document.getElementById('filterDay');
    if (categoryEl) categoryEl.value = '';
    if (monthEl) monthEl.value = '';
    if (dayEl) dayEl.value = '';
    loadTransactions();
}

function filterTransactions() {
    loadTransactions();
}

// ==================== LOAD TRANSACTIONS LIST ====================
function loadTransactions() {
    const categoryFilter = document.getElementById('filterCategory')?.value || '';
    const monthFilter = document.getElementById('filterMonth')?.value || '';
    const dayFilter = document.getElementById('filterDay')?.value || '';
    
    let filteredTransactions = [...businessData.transactions];
    
    if (categoryFilter === 'income') {
        filteredTransactions = filteredTransactions.filter(tx => tx.type === 'income');
    } else if (categoryFilter === 'expense') {
        filteredTransactions = filteredTransactions.filter(tx => tx.type === 'expense');
    }
    
    if (dayFilter) {
        filteredTransactions = filteredTransactions.filter(tx => tx.date === dayFilter);
    } else if (monthFilter) {
        filteredTransactions = filteredTransactions.filter(tx => tx.date.startsWith(monthFilter));
    }
    
    // Sort by date descending (newest first), then by timestamp/id for same-day transactions
    filteredTransactions.sort((a, b) => {
        // First compare by date
        const dateCompare = new Date(b.date) - new Date(a.date);
        if (dateCompare !== 0) return dateCompare;
        
        // If same date, sort by timestamp (newest first)
        if (a.timestamp && b.timestamp) {
            return new Date(b.timestamp) - new Date(a.timestamp);
        }
        
        // Fallback: sort by ID (assuming newer IDs are larger/later)
        return (b.id || '').localeCompare(a.id || '');
    });
    
    const container = document.getElementById('allTransactions');
    
    if (!container) return;
    
    if (filteredTransactions.length === 0) {
        container.innerHTML = `
            <div class="empty-state" style="text-align: center; padding: 40px; color: #94a3b8;">
                <i class="fas fa-receipt" style="font-size: 48px; margin-bottom: 15px;"></i>
                <p>No transactions found</p>
            </div>
        `;
        return;
    }
    
    // Group transactions by date
    const groupedByDate = {};
    filteredTransactions.forEach(tx => {
        const dateKey = tx.date; // YYYY-MM-DD format
        if (!groupedByDate[dateKey]) {
            groupedByDate[dateKey] = [];
        }
        groupedByDate[dateKey].push(tx);
    });
    
    // Get sorted dates (newest first)
    const sortedDates = Object.keys(groupedByDate).sort((a, b) => new Date(b) - new Date(a));
    
    // Render grouped transactions
    container.innerHTML = sortedDates.map(dateKey => {
        const dayTransactions = groupedByDate[dateKey];
        const dayIncome = dayTransactions.filter(tx => tx.type === 'income').reduce((sum, tx) => sum + tx.amount, 0);
        const dayExpense = dayTransactions.filter(tx => tx.type === 'expense').reduce((sum, tx) => sum + tx.amount, 0);
        const dayNet = dayIncome - dayExpense;
        
        // Format date nicely
        const date = new Date(dateKey);
        const isToday = dateKey === new Date().toISOString().split('T')[0];
        const isYesterday = dateKey === new Date(Date.now() - 86400000).toISOString().split('T')[0];
        const dayLabel = isToday ? 'Today' : isYesterday ? 'Yesterday' : date.toLocaleDateString('en-MY', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' });
        
        return `
            <div class="day-group" style="margin-bottom: 20px;">
                <div class="day-header" style="display: flex; justify-content: space-between; align-items: center; padding: 12px 15px; background: linear-gradient(135deg, #f8fafc, #f1f5f9); border-radius: 10px; margin-bottom: 10px; border-left: 4px solid #3b82f6;">
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <i class="fas fa-calendar-day" style="color: #3b82f6;"></i>
                        <span style="font-weight: 600; color: #1e293b;">${dayLabel}</span>
                        <span style="font-size: 12px; color: #64748b; background: white; padding: 2px 8px; border-radius: 10px;">${dayTransactions.length} transaction${dayTransactions.length !== 1 ? 's' : ''}</span>
                    </div>
                    <div style="display: flex; gap: 15px; font-size: 13px;">
                        <span style="color: #10b981;"><i class="fas fa-arrow-down"></i> +RM ${formatNumber(dayIncome)}</span>
                        <span style="color: #ef4444;"><i class="fas fa-arrow-up"></i> -RM ${formatNumber(dayExpense)}</span>
                        <span style="font-weight: 600; color: ${dayNet >= 0 ? '#10b981' : '#ef4444'};">
                            Net: ${dayNet >= 0 ? '+' : ''}RM ${formatNumber(dayNet)}
                        </span>
                    </div>
                </div>
                <div class="day-transactions" style="background: white; border-radius: 10px; overflow: hidden; border: 1px solid #e2e8f0;">
                    ${dayTransactions.map(tx => `
                        <div class="transaction-item ${tx.type}" style="display: flex; align-items: center; justify-content: space-between; padding: 15px; border-bottom: 1px solid #f1f5f9;">
                            <div class="transaction-info" style="display: flex; align-items: center; gap: 15px;">
                                <div class="transaction-icon ${tx.type}" style="width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; background: ${tx.type === 'income' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)'};">
                                    <i class="fas ${tx.type === 'income' ? 'fa-arrow-down' : 'fa-arrow-up'}" style="color: ${tx.type === 'income' ? '#10b981' : '#ef4444'};"></i>
                                </div>
                                <div class="transaction-details">
                                    <span class="transaction-description" style="font-weight: 600; color: #1e293b; display: block;">${escapeHTML(tx.description)}</span>
                                    <span class="transaction-meta" style="font-size: 12px; color: #64748b;">${getCategoryName(tx.category)} • ${tx.method || 'N/A'}${tx.customer ? ' • ' + escapeHTML(tx.customer) : ''}</span>
                                </div>
                            </div>
                            <div style="display: flex; align-items: center; gap: 15px;">
                                <div class="transaction-amount" style="font-weight: 700; font-size: 16px; color: ${tx.type === 'income' ? '#10b981' : '#ef4444'};">
                                    ${tx.type === 'income' ? '+' : '-'}RM ${formatNumber(tx.amount)}
                                </div>
                                <div class="transaction-actions" style="display: flex; gap: 5px;">
                                    <button class="btn-icon" onclick="editTransaction('${tx.id}')" title="Edit" style="background: #f1f5f9; border: none; padding: 8px; border-radius: 5px; cursor: pointer;">
                                        <i class="fas fa-edit" style="color: #3b82f6;"></i>
                                    </button>
                                    <button class="btn-icon delete" onclick="confirmDeleteTransaction('${tx.id}')" title="Delete" style="background: #fef2f2; border: none; padding: 8px; border-radius: 5px; cursor: pointer;">
                                        <i class="fas fa-trash" style="color: #ef4444;"></i>
                                    </button>
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }).join('');
}

// ==================== MODAL FUNCTIONS ====================
function closeEditModal() {
    const modal = document.getElementById('editTransactionModal');
    if (modal) {
        modal.classList.remove('show');
    }
}

// ==================== EXPORT FUNCTIONS ====================
window.addIncome = addIncome;
window.addExpense = addExpense;
window.editTransaction = editTransaction;
window.saveEditedTransaction = saveEditedTransaction;
window.deleteTransaction = deleteTransaction;
window.confirmDeleteTransaction = confirmDeleteTransaction;
window.clearFilters = clearFilters;
window.loadTransactions = loadTransactions;
window.closeEditModal = closeEditModal;
window.closeEditTransactionModal = closeEditTransactionModal;
window.filterTransactions = filterTransactions;

// Ensure global availability
if (typeof closeEditModal === 'function') {
    window.closeEditModal = closeEditModal;
}
if (typeof closeEditTransactionModal === 'function') {
    window.closeEditTransactionModal = closeEditTransactionModal;
}
