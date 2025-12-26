// ==================== TRANSACTIONS-UI.JS ====================
// EZCubic - Transaction UI Rendering and Modal Functions - Split from transactions.js v2.3.2
// Version: 2.3.2

// Early function declarations to prevent reference errors
var closeEditModal, editTransaction, saveEditedTransaction;

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

// ==================== CLOSE MODAL FUNCTIONS ====================
function closeEditTransactionModal() {
    console.log('closeEditTransactionModal called');
    const modal = document.getElementById('editTransactionModal');
    if (modal) {
        modal.classList.remove('show');
        modal.style.display = ''; // Clear inline style to let CSS take over
        console.log('Modal closed');
    }
}

function closeEditModal() {
    const modal = document.getElementById('editTransactionModal');
    if (modal) {
        modal.classList.remove('show');
    }
}

// ==================== SAVE EDITED TRANSACTION ====================
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

// ==================== FILTER FUNCTIONS ====================
function clearFilters() {
    const categoryEl = document.getElementById('filterCategory');
    const monthEl = document.getElementById('filterMonth');
    if (categoryEl) categoryEl.value = '';
    if (monthEl) monthEl.value = '';
    loadTransactions();
}

function filterTransactions() {
    loadTransactions();
}

// ==================== LOAD TRANSACTIONS LIST ====================
function loadTransactions() {
    const categoryFilter = document.getElementById('filterCategory')?.value || '';
    const monthFilter = document.getElementById('filterMonth')?.value || '';
    
    let filteredTransactions = [...businessData.transactions];
    
    if (categoryFilter === 'income') {
        filteredTransactions = filteredTransactions.filter(tx => tx.type === 'income');
    } else if (categoryFilter === 'expense') {
        filteredTransactions = filteredTransactions.filter(tx => tx.type === 'expense');
    }
    
    if (monthFilter) {
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

// ==================== RENDER TRANSACTIONS ====================
function renderTransactions(transactions) {
    const container = document.getElementById('allTransactions');
    if (!container) return;
    
    if (!transactions || transactions.length === 0) {
        container.innerHTML = `
            <div class="empty-state" style="text-align: center; padding: 40px; color: #94a3b8;">
                <i class="fas fa-receipt" style="font-size: 48px; margin-bottom: 15px;"></i>
                <p>No transactions found</p>
            </div>
        `;
        return;
    }
    
    // Use loadTransactions logic for rendering
    loadTransactions();
}

// ==================== EXPORT FUNCTIONS ====================
window.editTransaction = editTransaction;
window.saveEditedTransaction = saveEditedTransaction;
window.closeEditModal = closeEditModal;
window.closeEditTransactionModal = closeEditTransactionModal;
window.clearFilters = clearFilters;
window.filterTransactions = filterTransactions;
window.loadTransactions = loadTransactions;
window.renderTransactions = renderTransactions;

// Ensure global availability
if (typeof closeEditModal === 'function') {
    window.closeEditModal = closeEditModal;
}
if (typeof closeEditTransactionModal === 'function') {
    window.closeEditTransactionModal = closeEditTransactionModal;
}
