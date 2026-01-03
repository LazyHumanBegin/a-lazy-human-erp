// ==================== BILLS.JS ====================
// Bill Management Functions
// Version: 2.1.5 - Fixed exports - 17 Dec 2025

// Early function declarations to prevent reference errors
var closeBillModal, closeAddBillModal;

// ==================== BILL MODAL ====================
function showAddBillModal() {
    document.getElementById('addBillModal').style.display = 'flex';
    const nextMonth = new Date();
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    document.getElementById('billDueDate').value = formatDateForInput(nextMonth);
    
    // Reset recurring options
    const recurringCheckbox = document.getElementById('billRecurring');
    if (recurringCheckbox) {
        recurringCheckbox.checked = false;
        toggleRecurringOptions();
    }
}

function closeAddBillModal() {
    document.getElementById('addBillModal').style.display = 'none';
}

// Toggle recurring options visibility
function toggleRecurringOptions() {
    const checkbox = document.getElementById('billRecurring');
    const options = document.getElementById('recurringOptions');
    if (checkbox && options) {
        options.style.display = checkbox.checked ? 'block' : 'none';
    }
}

// ==================== SAVE BILL ====================
function saveBill() {
    const name = document.getElementById('billName').value.trim();
    const amount = parseFloat(document.getElementById('billAmount').value);
    const dueDate = document.getElementById('billDueDate').value;
    const category = document.getElementById('billCategory').value;
    const vendor = document.getElementById('billVendor').value.trim();
    const status = document.getElementById('billStatus').value;
    
    // Recurring settings
    const isRecurring = document.getElementById('billRecurring')?.checked || false;
    const recurringFrequency = document.getElementById('billRecurringFrequency')?.value || 'monthly';
    const recurringEnd = document.getElementById('billRecurringEnd')?.value || null;
    
    if (!name || !amount || amount <= 0 || !dueDate) {
        showNotification('Please fill all required fields', 'error');
        return;
    }
    
    const bill = {
        id: generateUniqueId(),
        name: name,
        amount: amount,
        dueDate: dueDate,
        category: category,
        vendor: vendor || 'Unknown',
        status: status,
        createdAt: new Date().toISOString(),
        // Recurring fields
        isRecurring: isRecurring,
        recurringFrequency: isRecurring ? recurringFrequency : null,
        recurringEndDate: isRecurring ? recurringEnd : null,
        lastGeneratedDate: isRecurring ? dueDate : null
    };
    
    businessData.bills.push(bill);
    
    // Record audit log for new bill
    if (typeof recordAuditLog === 'function') {
        recordAuditLog({
            action: 'create',
            module: 'bills',
            recordId: bill.id,
            recordName: bill.name,
            description: `New bill added: ${bill.name} - RM ${bill.amount.toFixed(2)} due ${bill.dueDate}`,
            newValue: {
                name: bill.name,
                amount: bill.amount,
                dueDate: bill.dueDate,
                category: bill.category,
                vendor: bill.vendor,
                isRecurring: bill.isRecurring
            }
        });
    }
    
    // Save data
    saveData();
    
    // Close modal and reset form
    closeAddBillModal();
    
    document.getElementById('billName').value = '';
    document.getElementById('billAmount').value = '';
    document.getElementById('billVendor').value = '';
    if (document.getElementById('billRecurring')) {
        document.getElementById('billRecurring').checked = false;
        toggleRecurringOptions();
    }
    
    // Update UI
    updateDashboard();
    
    // Always reload bills list
    loadBills();
    
    // Show success notification
    showNotification(isRecurring ? '✅ Recurring bill added successfully!' : '✅ Bill added successfully!', 'success');
}

// ==================== PROCESS RECURRING BILLS ====================
function processRecurringBills() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    let billsGenerated = 0;
    
    businessData.bills.forEach(bill => {
        if (!bill.isRecurring) return;
        
        // Check if recurring has ended
        if (bill.recurringEndDate) {
            const endDate = new Date(bill.recurringEndDate);
            if (today > endDate) return;
        }
        
        const lastGenerated = bill.lastGeneratedDate ? new Date(bill.lastGeneratedDate) : new Date(bill.dueDate);
        lastGenerated.setHours(0, 0, 0, 0);
        
        // Calculate next due date based on frequency
        let nextDueDate = new Date(lastGenerated);
        
        switch (bill.recurringFrequency) {
            case 'weekly':
                nextDueDate.setDate(nextDueDate.getDate() + 7);
                break;
            case 'monthly':
                nextDueDate.setMonth(nextDueDate.getMonth() + 1);
                break;
            case 'quarterly':
                nextDueDate.setMonth(nextDueDate.getMonth() + 3);
                break;
            case 'yearly':
                nextDueDate.setFullYear(nextDueDate.getFullYear() + 1);
                break;
        }
        
        // Generate new bills up to today + 30 days (so users can see upcoming recurring)
        const generateUntil = new Date(today);
        generateUntil.setDate(generateUntil.getDate() + 30);
        
        while (nextDueDate <= generateUntil) {
            // Check if this bill already exists
            const exists = businessData.bills.some(b => 
                b.name === bill.name && 
                b.dueDate === formatDateForInput(nextDueDate) &&
                b.id !== bill.id
            );
            
            if (!exists) {
                const newBill = {
                    id: generateUniqueId(),
                    name: bill.name,
                    amount: bill.amount,
                    dueDate: formatDateForInput(nextDueDate),
                    category: bill.category,
                    vendor: bill.vendor,
                    status: 'upcoming',
                    createdAt: new Date().toISOString(),
                    parentRecurringId: bill.id,
                    isAutoGenerated: true
                };
                
                businessData.bills.push(newBill);
                billsGenerated++;
                
                // Update the parent bill's last generated date
                bill.lastGeneratedDate = formatDateForInput(nextDueDate);
            }
            
            // Move to next occurrence
            switch (bill.recurringFrequency) {
                case 'weekly':
                    nextDueDate.setDate(nextDueDate.getDate() + 7);
                    break;
                case 'monthly':
                    nextDueDate.setMonth(nextDueDate.getMonth() + 1);
                    break;
                case 'quarterly':
                    nextDueDate.setMonth(nextDueDate.getMonth() + 3);
                    break;
                case 'yearly':
                    nextDueDate.setFullYear(nextDueDate.getFullYear() + 1);
                    break;
            }
        }
    });
    
    if (billsGenerated > 0) {
        saveData();
        console.log(`Generated ${billsGenerated} recurring bills`);
    }
    
    return billsGenerated;
}

// ==================== LOAD BILLS ====================
function loadBills() {
    // Process recurring bills first
    processRecurringBills();
    
    const container = document.getElementById('billsContent');
    if (!container) return;
    
    const today = new Date();
    const upcomingBills = businessData.bills
        .filter(bill => {
            const dueDate = parseDateSafe(bill.dueDate);
            return bill.status !== 'paid' && dueDate >= today;
        })
        .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
    
    const overdueBills = businessData.bills
        .filter(bill => {
            const dueDate = parseDateSafe(bill.dueDate);
            return bill.status !== 'paid' && dueDate < today;
        })
        .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
    
    const paidBills = businessData.bills
        .filter(bill => bill.status === 'paid')
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    const allBills = [...businessData.bills]
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    const activeTab = document.querySelector('.tab.active')?.textContent.toLowerCase() || 'upcoming';
    
    let billsToShow = [];
    if (activeTab.includes('upcoming')) billsToShow = upcomingBills;
    else if (activeTab.includes('overdue')) billsToShow = overdueBills;
    else if (activeTab.includes('paid')) billsToShow = paidBills;
    else billsToShow = allBills;
    
    if (billsToShow.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-file-invoice-dollar"></i>
                <h4>${activeTab.includes('upcoming') ? 'No upcoming bills' : 
                      activeTab.includes('overdue') ? 'No overdue bills' : 
                      activeTab.includes('paid') ? 'No paid bills' : 'No bills yet'}</h4>
                <div style="margin-top: 10px;">${activeTab.includes('upcoming') ? 'All bills are paid or scheduled' : 
                      activeTab.includes('overdue') ? 'Good job! No bills are overdue' : 
                      activeTab.includes('paid') ? 'No bills have been paid yet' : 'Add your first bill to get started'}</div>
            </div>
        `;
        return;
    }
    
    container.innerHTML = billsToShow.map(bill => {
        const dueDate = parseDateSafe(bill.dueDate);
        const daysUntilDue = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));
        let statusClass = 'upcoming';
        let statusText = 'Upcoming';
        
        if (bill.status === 'paid') {
            statusClass = 'paid';
            statusText = 'Paid';
        } else if (daysUntilDue <= 0) {
            statusClass = 'overdue';
            statusText = 'Overdue';
        } else if (daysUntilDue <= 7) {
            statusClass = 'warning';
            statusText = 'Due Soon';
        }
        
        // Check if this is a recurring bill or auto-generated
        const recurringBadge = bill.isRecurring ? 
            `<span class="recurring-badge" title="Recurring ${bill.recurringFrequency}"><i class="fas fa-redo"></i> ${bill.recurringFrequency}</span>` : 
            (bill.isAutoGenerated ? `<span class="recurring-badge auto-generated" title="Auto-generated from recurring bill"><i class="fas fa-magic"></i> Auto</span>` : '');
        
        return `
            <div class="bill-card ${statusClass}" style="margin-bottom: 15px;">
                <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                    <div style="flex: 1;">
                        <div class="bill-title">${escapeHTML(bill.name)} ${recurringBadge}</div>
                        <div style="font-size: 12px; color: #64748b; margin-top: 5px;">
                            <i class="fas fa-building"></i> ${escapeHTML(bill.vendor)}
                            <span style="margin-left: 15px;"><i class="fas fa-tag"></i> ${bill.category}</span>
                        </div>
                        <div class="bill-due-date">
                            <i class="fas fa-calendar"></i> Due Date: ${dueDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </div>
                    </div>
                    <div style="text-align: right;">
                        <div class="bill-amount">${formatCurrency(bill.amount)}</div>
                        <div style="margin-top: 10px;">
                            <span class="bill-status status-${statusClass}">${statusText}</span>
                        </div>
                    </div>
                </div>
                <div style="display: flex; gap: 10px; margin-top: 15px;">
                    ${bill.status !== 'paid' ? `
                        <button class="btn-secondary" onclick="markBillAsPaid('${bill.id}')" style="flex: 1; padding: 8px;">
                            <i class="fas fa-check"></i> Mark as Paid
                        </button>
                    ` : ''}
                    <button class="btn-secondary" onclick="deleteBill('${bill.id}')" style="flex: 1; padding: 8px; background: #ef4444; color: white; border-color: #ef4444;">
                        <i class="fas fa-trash"></i> Delete
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

function showBillTab(tab) {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    event.currentTarget.classList.add('active');
    loadBills();
}

// ==================== BILL ACTIONS ====================
function markBillAsPaid(billId) {
    const bill = businessData.bills.find(b => String(b.id) === String(billId));
    if (!bill) {
        showNotification('Bill not found', 'error');
        return;
    }
    
    bill.status = 'paid';
    bill.paidDate = new Date().toISOString().slice(0, 10);
    bill.paidAmount = bill.amount;
    
    // Update supplier outstanding balance if bill is linked to a supplier
    if (bill.supplierId) {
        updateSupplierOutstandingOnPayment(bill.supplierId, bill.amount);
    }
    
    // Save bill update
    saveData();
    
    // Create expense transaction for the payment
    const expense = {
        id: generateUniqueId(),
        type: 'expense',
        date: new Date().toISOString().slice(0, 10),
        amount: bill.amount,
        description: `Payment for ${bill.name}`,
        category: bill.category,
        vendor: bill.vendor,
        method: 'bank',
        billId: bill.id,
        timestamp: new Date().toISOString()
    };
    
    businessData.transactions.push(expense);
    saveData();
    
    // Update all UI components
    updateDashboard();
    loadBills();
    
    // Update other components if available
    if (typeof loadUpcomingBills === 'function') loadUpcomingBills();
    if (typeof updateMalaysianTaxEstimator === 'function') updateMalaysianTaxEstimator();
    if (typeof calculatePersonalTax === 'function') calculatePersonalTax();
    if (typeof loadTransactions === 'function') loadTransactions();
    if (typeof loadRecentTransactions === 'function') loadRecentTransactions();
    if (typeof updateBalanceSheet === 'function') updateBalanceSheet();
    if (typeof updateMonthlyCharts === 'function') updateMonthlyCharts();
    if (typeof updateReports === 'function') updateReports();
    
    // Show success notification
    showNotification(`✅ Bill marked as paid: RM ${bill.amount.toFixed(2)}`, 'success');
}

// Update supplier outstanding balance when bill is paid
function updateSupplierOutstandingOnPayment(supplierId, amount) {
    const suppliers = JSON.parse(localStorage.getItem('ezcubic_suppliers') || '[]');
    const supplier = suppliers.find(s => s.id === supplierId);
    
    if (supplier) {
        supplier.outstandingBalance = Math.max(0, (parseFloat(supplier.outstandingBalance) || 0) - amount);
        supplier.updatedAt = new Date().toISOString();
        localStorage.setItem('ezcubic_suppliers', JSON.stringify(suppliers));
        // Also save to tenant storage for multi-tenant isolation
        if (typeof saveToUserTenant === 'function') {
            saveToUserTenant();
        }
        
        // Refresh supplier views if available
        if (typeof renderSuppliers === 'function') renderSuppliers();
        if (typeof updateSupplierStats === 'function') updateSupplierStats();
    }
}

function deleteBill(billId) {
    const bill = businessData.bills.find(b => String(b.id) === String(billId));
    
    if (confirm('Are you sure you want to delete this bill?')) {
        // Store bill data for audit log before deletion
        const deletedBill = bill ? { ...bill } : { id: billId, name: 'Unknown Bill' };
        
        businessData.bills = businessData.bills.filter(b => String(b.id) !== String(billId));
        
        // Save data first
        saveData();
        
        // CRITICAL: Also save directly to tenant storage to ensure deletion persists
        const user = window.currentUser;
        if (user && user.tenantId) {
            const tenantKey = 'ezcubic_tenant_' + user.tenantId;
            let tenantData = JSON.parse(localStorage.getItem(tenantKey) || '{}');
            tenantData.bills = businessData.bills;
            tenantData.updatedAt = new Date().toISOString();
            localStorage.setItem(tenantKey, JSON.stringify(tenantData));
            console.log('✅ Bill deletion saved directly to tenant storage');
        }
        
        // Force cloud sync for deletion
        if (typeof CloudSync !== 'undefined' && CloudSync.uploadToCloud) {
            CloudSync.uploadToCloud().then(() => {
                console.log('☁️ Bill deletion synced to cloud');
            }).catch(err => console.warn('Cloud sync after bill delete:', err));
        }
        
        // Record audit log for bill deletion
        if (typeof recordAuditLog === 'function') {
            recordAuditLog({
                action: 'delete',
                module: 'bills',
                recordId: billId,
                recordName: deletedBill.name,
                description: `Bill deleted: ${deletedBill.name} - RM ${(deletedBill.amount || 0).toFixed(2)}`,
                oldValue: {
                    name: deletedBill.name,
                    amount: deletedBill.amount,
                    dueDate: deletedBill.dueDate,
                    category: deletedBill.category,
                    vendor: deletedBill.vendor,
                    status: deletedBill.status
                }
            });
        }
        
        loadBills();
        updateDashboard();
        showNotification('🗑️ Bill deleted successfully', 'success');
    }
}

// ==================== MODAL FUNCTIONS ====================
function closeBillModal() {
    const modal = document.getElementById('addBillModal');
    if (modal) {
        modal.style.display = 'none';
    }
    // Reset form if exists
    const form = document.getElementById('billForm');
    if (form) {
        form.reset();
    }
}

// ==================== EXPORT FUNCTIONS ====================
window.showAddBillModal = showAddBillModal;
window.closeAddBillModal = closeAddBillModal;
window.closeBillModal = closeBillModal;
window.saveBill = saveBill;
window.loadBills = loadBills;
window.showBillTab = showBillTab;
window.markBillAsPaid = markBillAsPaid;
window.deleteBill = deleteBill;
window.toggleRecurringOptions = toggleRecurringOptions;
window.processRecurringBills = processRecurringBills;
window.updateSupplierOutstandingOnPayment = updateSupplierOutstandingOnPayment;
