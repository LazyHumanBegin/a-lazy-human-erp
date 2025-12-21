/**
 * EZCubic - Supplier Profile Module
 * Manage supplier contacts, purchase history, payment terms, and accounts payable
 */

const SUPPLIERS_KEY = 'ezcubic_suppliers';

// Use a getter to always return window.suppliers array
// This ensures consistency with multi-tenant data loading
Object.defineProperty(window, 'suppliersModule', {
    get: function() {
        if (!Array.isArray(window.suppliers)) {
            window.suppliers = [];
        }
        return window.suppliers;
    },
    set: function(val) {
        window.suppliers = Array.isArray(val) ? val : [];
    }
});

// Local variable that stays synced - initialized from window
let suppliers = [];

// Sync local variable with window (called by multi-tenant system)
function syncSuppliersFromWindow() {
    if (Array.isArray(window.suppliers)) {
        suppliers = window.suppliers;
    }
}
window.syncSuppliersFromWindow = syncSuppliersFromWindow;

// ==================== INITIALIZATION ====================
function initializeSuppliers() {
    loadSuppliers();
    renderSuppliers();
    updateSupplierStats();
}

function loadSuppliers() {
    // First sync from window in case tenant data was loaded (even if empty array)
    // This is critical for multi-tenant isolation - don't fall back to localStorage if tenant has no data
    if (Array.isArray(window.suppliers)) {
        suppliers = window.suppliers;
        return;
    }
    // Otherwise load from localStorage
    const stored = localStorage.getItem(SUPPLIERS_KEY);
    const data = stored ? JSON.parse(stored) : [];
    // Ensure it's always an array
    suppliers = Array.isArray(data) ? data : [];
    window.suppliers = suppliers;
}

function saveSuppliers() {
    localStorage.setItem(SUPPLIERS_KEY, JSON.stringify(suppliers));
    window.suppliers = suppliers; // Keep window in sync
    updateSupplierStats();
    
    // Also save to tenant storage for data isolation
    if (typeof saveToUserTenant === 'function') {
        saveToUserTenant();
    }
}

// ==================== SYNC SUPPLIER OUTSTANDING FROM BILLS/POs ====================
function syncSupplierOutstanding() {
    // Get all unpaid bills
    const bills = (typeof businessData !== 'undefined' && Array.isArray(businessData.bills)) 
                  ? businessData.bills 
                  : JSON.parse(localStorage.getItem('ezcubic_bills') || '[]');
    
    // Get all unpaid purchase orders
    const purchaseOrders = window.purchaseOrders || JSON.parse(localStorage.getItem('ezcubic_purchaseOrders') || '[]');
    
    // Calculate outstanding per supplier
    const supplierOutstanding = new Map();
    const supplierBillsList = new Map();
    
    // Sum up unpaid bills by vendor/supplier
    if (Array.isArray(bills)) {
        bills.forEach(bill => {
            if (bill.status !== 'paid') {
                const vendor = bill.vendor || bill.supplierName || 'Unknown';
                const amount = parseFloat(bill.amount || bill.total || 0) - parseFloat(bill.paidAmount || 0);
                if (amount > 0) {
                    supplierOutstanding.set(vendor, (supplierOutstanding.get(vendor) || 0) + amount);
                    if (!supplierBillsList.has(vendor)) supplierBillsList.set(vendor, []);
                    supplierBillsList.get(vendor).push({
                        id: bill.id,
                        reference: bill.name || bill.billNumber || bill.id,
                        amount: amount,
                        dueDate: bill.dueDate
                    });
                }
            }
        });
    }
    
    // Sum up unpaid purchase orders
    if (Array.isArray(purchaseOrders)) {
        purchaseOrders.forEach(po => {
            if (po.status !== 'paid' && po.status !== 'cancelled') {
                const supplier = po.supplierName || 'Unknown';
                const amount = parseFloat(po.total || po.grandTotal || 0) - parseFloat(po.paidAmount || 0);
                if (amount > 0) {
                    supplierOutstanding.set(supplier, (supplierOutstanding.get(supplier) || 0) + amount);
                    if (!supplierBillsList.has(supplier)) supplierBillsList.set(supplier, []);
                    supplierBillsList.get(supplier).push({
                        id: po.id,
                        reference: po.poNumber || po.id,
                        amount: amount,
                        dueDate: po.dueDate
                    });
                }
            }
        });
    }
    
    // Update supplier outstanding balances
    suppliers.forEach(supplier => {
        const supplierNames = [supplier.company, supplier.name].filter(Boolean);
        let totalOutstanding = 0;
        let billsList = [];
        
        supplierNames.forEach(name => {
            if (supplierOutstanding.has(name)) {
                totalOutstanding += supplierOutstanding.get(name);
            }
            if (supplierBillsList.has(name)) {
                billsList = billsList.concat(supplierBillsList.get(name));
            }
        });
        
        supplier.outstandingBalance = totalOutstanding;
        supplier.unpaidBills = billsList;
    });
    
    window.suppliers = suppliers;
}
window.syncSupplierOutstanding = syncSupplierOutstanding;

// ==================== SUPPLIER STATS ====================
function updateSupplierStats() {
    // First sync outstanding from actual bills/POs
    syncSupplierOutstanding();
    
    const totalEl = document.getElementById('suppliersTotalCount');
    const activeEl = document.getElementById('suppliersActive');
    const payableEl = document.getElementById('suppliersTotalPayable');
    const overdueEl = document.getElementById('suppliersOverdue');
    
    const activeSuppliers = suppliers.filter(s => s.status === 'active');
    const totalPayable = suppliers.reduce((sum, s) => sum + (parseFloat(s.outstandingBalance) || 0), 0);
    const overdueCount = suppliers.filter(s => (parseFloat(s.outstandingBalance) || 0) > 0 && isOverdue(s)).length;
    
    if (totalEl) totalEl.textContent = suppliers.length;
    if (activeEl) activeEl.textContent = activeSuppliers.length;
    if (payableEl) payableEl.textContent = formatRM(totalPayable);
    if (overdueEl) overdueEl.textContent = overdueCount;
}

function isOverdue(supplier) {
    // Check if any unpaid bills are overdue
    if (supplier.unpaidBills && supplier.unpaidBills.length > 0) {
        const today = new Date();
        return supplier.unpaidBills.some(bill => {
            if (bill.dueDate) {
                return new Date(bill.dueDate) < today;
            }
            return false;
        });
    }
    // Fallback to old logic
    if (!supplier.lastPurchaseDate || !supplier.paymentTerms) return false;
    const termDays = parseInt(supplier.paymentTerms) || 30;
    const dueDate = new Date(supplier.lastPurchaseDate);
    dueDate.setDate(dueDate.getDate() + termDays);
    return new Date() > dueDate;
}

// ==================== SUPPLIER MODAL ====================
function showSupplierModal(supplierId = null) {
    const modal = document.getElementById('supplierModal');
    const title = document.getElementById('supplierModalTitle');
    const form = document.getElementById('supplierForm');
    
    form.reset();
    document.getElementById('supplierId').value = '';
    
    if (supplierId) {
        const supplier = suppliers.find(s => s.id === supplierId);
        if (supplier) {
            title.textContent = 'Edit Supplier';
            document.getElementById('supplierId').value = supplier.id;
            document.getElementById('supplierName').value = supplier.name || '';
            document.getElementById('supplierCompany').value = supplier.company || '';
            document.getElementById('supplierEmail').value = supplier.email || '';
            document.getElementById('supplierPhone').value = supplier.phone || '';
            document.getElementById('supplierAddress').value = supplier.address || '';
            document.getElementById('supplierCategory').value = supplier.category || 'general';
            document.getElementById('supplierPaymentTerms').value = supplier.paymentTerms || '30';
            document.getElementById('supplierCreditLimit').value = supplier.creditLimit || '';
            document.getElementById('supplierBankName').value = supplier.bankName || '';
            document.getElementById('supplierBankAccount').value = supplier.bankAccount || '';
            document.getElementById('supplierNotes').value = supplier.notes || '';
            document.getElementById('supplierStatus').value = supplier.status || 'active';
        }
    } else {
        title.textContent = 'Add Supplier';
        document.getElementById('supplierPaymentTerms').value = '30';
        document.getElementById('supplierStatus').value = 'active';
    }
    
    modal.style.display = '';
    modal.classList.add('show');
}

function closeSupplierModal() {
    document.getElementById('supplierModal').classList.remove('show');
}

function saveSupplier(event) {
    event.preventDefault();
    
    const id = document.getElementById('supplierId').value;
    
    const supplierData = {
        name: document.getElementById('supplierName').value.trim(),
        company: document.getElementById('supplierCompany').value.trim(),
        email: document.getElementById('supplierEmail').value.trim(),
        phone: document.getElementById('supplierPhone').value.trim(),
        address: document.getElementById('supplierAddress').value.trim(),
        category: document.getElementById('supplierCategory').value,
        paymentTerms: document.getElementById('supplierPaymentTerms').value,
        creditLimit: parseFloat(document.getElementById('supplierCreditLimit').value) || 0,
        bankName: document.getElementById('supplierBankName').value.trim(),
        bankAccount: document.getElementById('supplierBankAccount').value.trim(),
        notes: document.getElementById('supplierNotes').value.trim(),
        status: document.getElementById('supplierStatus').value,
        updatedAt: new Date().toISOString()
    };
    
    if (!supplierData.name && !supplierData.company) {
        showToast('Please enter supplier name or company', 'error');
        return;
    }
    
    if (id) {
        // Update existing
        const index = suppliers.findIndex(s => s.id === id);
        if (index !== -1) {
            suppliers[index] = { ...suppliers[index], ...supplierData };
            showToast('Supplier updated successfully!', 'success');
        }
    } else {
        // Create new
        const newSupplier = {
            id: generateUUID(),
            ...supplierData,
            outstandingBalance: 0,
            totalPurchases: 0,
            purchaseHistory: [],
            createdAt: new Date().toISOString()
        };
        suppliers.push(newSupplier);
        showToast('Supplier added successfully!', 'success');
    }
    
    saveSuppliers();
    renderSuppliers();
    closeSupplierModal();
}

// ==================== SUPPLIER LIST ====================
function renderSuppliers(searchTerm = '') {
    const container = document.getElementById('suppliersList');
    if (!container) return;
    
    const search = searchTerm.toLowerCase() || document.getElementById('supplierSearch')?.value?.toLowerCase() || '';
    const categoryFilter = document.getElementById('supplierCategoryFilter')?.value || '';
    const statusFilter = document.getElementById('supplierStatusFilter')?.value || '';
    
    let filtered = suppliers.filter(s => {
        const matchesSearch = !search || 
            (s.name || '').toLowerCase().includes(search) ||
            (s.company || '').toLowerCase().includes(search) ||
            (s.email || '').toLowerCase().includes(search) ||
            (s.phone || '').includes(search);
        const matchesCategory = !categoryFilter || s.category === categoryFilter;
        const matchesStatus = !statusFilter || s.status === statusFilter;
        return matchesSearch && matchesCategory && matchesStatus;
    });
    
    // Sort by name
    filtered.sort((a, b) => (a.company || a.name).localeCompare(b.company || b.name));
    
    if (filtered.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-truck"></i>
                <p>${search || categoryFilter || statusFilter ? 'No suppliers match your filters' : 'No suppliers yet'}</p>
                <button class="btn-primary" onclick="showSupplierModal()">
                    <i class="fas fa-plus"></i> Add First Supplier
                </button>
            </div>
        `;
        return;
    }
    
    container.innerHTML = filtered.map(supplier => {
        const outstanding = parseFloat(supplier.outstandingBalance) || 0;
        const overdue = outstanding > 0 && isOverdue(supplier);
        const statusClass = supplier.status === 'active' ? 'success' : 'secondary';
        
        return `
            <div class="supplier-card" onclick="showSupplierDetail('${supplier.id}')">
                <div class="supplier-card-header">
                    <div class="supplier-avatar">
                        ${(supplier.company || supplier.name || 'S').charAt(0).toUpperCase()}
                    </div>
                    <div class="supplier-info">
                        <h4>${escapeHtml(supplier.company || supplier.name)}</h4>
                        ${supplier.company && supplier.name ? `<span class="supplier-contact">${escapeHtml(supplier.name)}</span>` : ''}
                        <span class="supplier-category">${getCategoryLabel(supplier.category)}</span>
                    </div>
                    <span class="status-badge ${statusClass}">${supplier.status || 'active'}</span>
                </div>
                <div class="supplier-card-body">
                    <div class="supplier-detail-row">
                        <i class="fas fa-phone"></i>
                        <span>${supplier.phone || '-'}</span>
                    </div>
                    <div class="supplier-detail-row">
                        <i class="fas fa-envelope"></i>
                        <span>${supplier.email || '-'}</span>
                    </div>
                    <div class="supplier-detail-row">
                        <i class="fas fa-clock"></i>
                        <span>Terms: Net ${supplier.paymentTerms || 30} days</span>
                    </div>
                </div>
                <div class="supplier-card-footer">
                    <div class="supplier-balance ${outstanding > 0 ? (overdue ? 'overdue' : 'pending') : ''}">
                        <span>Outstanding:</span>
                        <strong>${formatRM(outstanding)}</strong>
                        ${overdue ? '<span class="overdue-badge">OVERDUE</span>' : ''}
                    </div>
                    <div class="supplier-actions">
                        <button class="btn-icon" onclick="event.stopPropagation(); showSupplierModal('${supplier.id}')" title="Edit">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn-icon" onclick="event.stopPropagation(); recordSupplierPayment('${supplier.id}')" title="Record Payment">
                            <i class="fas fa-money-bill-wave"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function getCategoryLabel(category) {
    const labels = {
        'general': 'General',
        'raw-materials': 'Raw Materials',
        'packaging': 'Packaging',
        'equipment': 'Equipment',
        'services': 'Services',
        'logistics': 'Logistics',
        'office': 'Office Supplies',
        'utilities': 'Utilities'
    };
    return labels[category] || category || 'General';
}

function searchSuppliers(term) {
    renderSuppliers(term);
}

function filterSuppliers() {
    renderSuppliers();
}

// ==================== SUPPLIER DETAIL ====================
function showSupplierDetail(supplierId) {
    const supplier = suppliers.find(s => s.id === supplierId);
    if (!supplier) return;
    
    const modal = document.getElementById('supplierDetailModal');
    const title = document.getElementById('supplierDetailTitle');
    const content = document.getElementById('supplierDetailContent');
    
    title.textContent = supplier.company || supplier.name;
    
    const outstanding = parseFloat(supplier.outstandingBalance) || 0;
    const totalPurchases = parseFloat(supplier.totalPurchases) || 0;
    const overdue = outstanding > 0 && isOverdue(supplier);
    
    content.innerHTML = `
        <div class="supplier-detail-header">
            <div class="supplier-detail-avatar">
                ${(supplier.company || supplier.name || 'S').charAt(0).toUpperCase()}
            </div>
            <div class="supplier-detail-info">
                <h3>${escapeHtml(supplier.company || supplier.name)}</h3>
                ${supplier.company && supplier.name ? `<p class="contact-name"><i class="fas fa-user"></i> ${escapeHtml(supplier.name)}</p>` : ''}
                <span class="status-badge ${supplier.status === 'active' ? 'success' : 'secondary'}">${supplier.status || 'active'}</span>
            </div>
        </div>
        
        <div class="supplier-stats-grid">
            <div class="supplier-stat-card">
                <div class="stat-icon payable"><i class="fas fa-file-invoice-dollar"></i></div>
                <div class="stat-info">
                    <span class="stat-label">Outstanding</span>
                    <span class="stat-value ${overdue ? 'text-danger' : ''}">${formatRM(outstanding)}</span>
                    ${overdue ? '<span class="overdue-badge">OVERDUE</span>' : ''}
                </div>
            </div>
            <div class="supplier-stat-card">
                <div class="stat-icon purchases"><i class="fas fa-shopping-cart"></i></div>
                <div class="stat-info">
                    <span class="stat-label">Total Purchases</span>
                    <span class="stat-value">${formatRM(totalPurchases)}</span>
                </div>
            </div>
            <div class="supplier-stat-card">
                <div class="stat-icon terms"><i class="fas fa-calendar-alt"></i></div>
                <div class="stat-info">
                    <span class="stat-label">Payment Terms</span>
                    <span class="stat-value">Net ${supplier.paymentTerms || 30} days</span>
                </div>
            </div>
            <div class="supplier-stat-card">
                <div class="stat-icon limit"><i class="fas fa-credit-card"></i></div>
                <div class="stat-info">
                    <span class="stat-label">Credit Limit</span>
                    <span class="stat-value">${supplier.creditLimit ? formatRM(supplier.creditLimit) : 'No limit'}</span>
                </div>
            </div>
        </div>
        
        <div class="supplier-detail-sections">
            <div class="detail-section">
                <h4><i class="fas fa-address-card"></i> Contact Information</h4>
                <div class="detail-grid">
                    <div class="detail-item">
                        <label>Phone</label>
                        <span>${supplier.phone || '-'}</span>
                        ${supplier.phone ? `<a href="tel:${supplier.phone}" class="action-link"><i class="fas fa-phone"></i></a>` : ''}
                    </div>
                    <div class="detail-item">
                        <label>Email</label>
                        <span>${supplier.email || '-'}</span>
                        ${supplier.email ? `<a href="mailto:${supplier.email}" class="action-link"><i class="fas fa-envelope"></i></a>` : ''}
                    </div>
                    <div class="detail-item full-width">
                        <label>Address</label>
                        <span>${supplier.address || '-'}</span>
                    </div>
                </div>
            </div>
            
            <div class="detail-section">
                <h4><i class="fas fa-university"></i> Bank Details</h4>
                <div class="detail-grid">
                    <div class="detail-item">
                        <label>Bank Name</label>
                        <span>${supplier.bankName || '-'}</span>
                    </div>
                    <div class="detail-item">
                        <label>Account Number</label>
                        <span>${supplier.bankAccount || '-'}</span>
                        ${supplier.bankAccount ? `<button class="action-link" onclick="copyToClipboard('${supplier.bankAccount}')" title="Copy"><i class="fas fa-copy"></i></button>` : ''}
                    </div>
                </div>
            </div>
            
            ${supplier.notes ? `
            <div class="detail-section">
                <h4><i class="fas fa-sticky-note"></i> Notes</h4>
                <p class="notes-content">${escapeHtml(supplier.notes)}</p>
            </div>
            ` : ''}
            
            <div class="detail-section">
                <h4><i class="fas fa-file-invoice-dollar"></i> Outstanding Bills</h4>
                ${renderOutstandingBills(supplier)}
            </div>
            
            <div class="detail-section">
                <h4><i class="fas fa-history"></i> Recent Purchases</h4>
                ${renderPurchaseHistory(supplier)}
            </div>
        </div>
        
        <div class="supplier-detail-actions">
            <button class="btn-primary" onclick="recordSupplierPayment('${supplier.id}')">
                <i class="fas fa-money-bill-wave"></i> Record Payment
            </button>
            <button class="btn-outline" onclick="addPurchaseToSupplier('${supplier.id}')">
                <i class="fas fa-plus"></i> Add Purchase
            </button>
            <button class="btn-outline" onclick="showSupplierModal('${supplier.id}'); closeModal('supplierDetailModal');">
                <i class="fas fa-edit"></i> Edit
            </button>
            <button class="btn-outline danger" onclick="deleteSupplier('${supplier.id}')">
                <i class="fas fa-trash"></i> Delete
            </button>
        </div>
    `;
    
    modal.style.display = '';
    modal.classList.add('show');
}

function renderOutstandingBills(supplier) {
    const bills = supplier.unpaidBills || [];
    
    if (bills.length === 0) {
        return '<p class="no-history" style="color: #10b981;"><i class="fas fa-check-circle"></i> No outstanding bills</p>';
    }
    
    const today = new Date();
    
    return `
        <div class="outstanding-bills-list" style="max-height: 300px; overflow-y: auto;">
            <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
                <thead>
                    <tr style="background: #f8fafc;">
                        <th style="padding: 8px; text-align: left; border-bottom: 1px solid #e2e8f0;">Reference</th>
                        <th style="padding: 8px; text-align: left; border-bottom: 1px solid #e2e8f0;">Due Date</th>
                        <th style="padding: 8px; text-align: right; border-bottom: 1px solid #e2e8f0;">Amount</th>
                        <th style="padding: 8px; text-align: center; border-bottom: 1px solid #e2e8f0;">Status</th>
                    </tr>
                </thead>
                <tbody>
                    ${bills.map(bill => {
                        const dueDate = bill.dueDate ? new Date(bill.dueDate) : null;
                        const isOverdue = dueDate && dueDate < today;
                        const daysOverdue = dueDate ? Math.floor((today - dueDate) / (1000 * 60 * 60 * 24)) : 0;
                        
                        return `
                            <tr style="border-bottom: 1px solid #e2e8f0;">
                                <td style="padding: 8px;">${escapeHtml(bill.reference || bill.id)}</td>
                                <td style="padding: 8px;">${dueDate ? dueDate.toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}</td>
                                <td style="padding: 8px; text-align: right; font-weight: 600;">${formatRM(bill.amount)}</td>
                                <td style="padding: 8px; text-align: center;">
                                    ${isOverdue ? 
                                        `<span style="background: #fef2f2; color: #dc2626; padding: 2px 8px; border-radius: 4px; font-size: 11px;">${daysOverdue} days overdue</span>` :
                                        `<span style="background: #f0fdf4; color: #16a34a; padding: 2px 8px; border-radius: 4px; font-size: 11px;">Due</span>`
                                    }
                                </td>
                            </tr>
                        `;
                    }).join('')}
                </tbody>
                <tfoot>
                    <tr style="background: #1e293b; color: white; font-weight: 700;">
                        <td colspan="2" style="padding: 10px;">Total Outstanding</td>
                        <td style="padding: 10px; text-align: right;">${formatRM(bills.reduce((sum, b) => sum + (b.amount || 0), 0))}</td>
                        <td></td>
                    </tr>
                </tfoot>
            </table>
        </div>
    `;
}

function renderPurchaseHistory(supplier) {
    const history = supplier.purchaseHistory || [];
    
    if (history.length === 0) {
        return '<p class="no-history">No purchase history yet</p>';
    }
    
    const recent = history.slice(0, 10); // Show last 10
    
    return `
        <div class="purchase-history-list">
            ${recent.map(purchase => `
                <div class="purchase-item">
                    <div class="purchase-info">
                        <span class="purchase-date">${formatDate(purchase.date)}</span>
                        <span class="purchase-desc">${escapeHtml(purchase.description || 'Purchase')}</span>
                    </div>
                    <div class="purchase-amount">
                        ${formatRM(purchase.amount)}
                        <span class="purchase-status ${purchase.paid ? 'paid' : 'pending'}">${purchase.paid ? 'Paid' : 'Pending'}</span>
                    </div>
                </div>
            `).join('')}
        </div>
        ${history.length > 10 ? `<p class="more-history">+ ${history.length - 10} more purchases</p>` : ''}
    `;
}

// ==================== SUPPLIER PAYMENTS ====================
function recordSupplierPayment(supplierId) {
    const supplier = suppliers.find(s => s.id === supplierId);
    if (!supplier) return;
    
    const outstanding = parseFloat(supplier.outstandingBalance) || 0;
    
    if (outstanding <= 0) {
        showToast('No outstanding balance for this supplier', 'info');
        return;
    }
    
    // Create payment modal
    const modalHtml = `
        <div class="modal show" id="supplierPaymentModal">
            <div class="modal-content" style="max-width: 450px;">
                <div class="modal-header">
                    <h3 class="modal-title">Record Payment to Supplier</h3>
                    <button class="modal-close" onclick="closeModal('supplierPaymentModal')">&times;</button>
                </div>
                <form onsubmit="processSupplierPayment(event, '${supplierId}')">
                    <div class="form-group">
                        <label class="form-label">Supplier</label>
                        <input type="text" class="form-control" value="${escapeHtml(supplier.company || supplier.name)}" readonly>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Outstanding Balance</label>
                        <input type="text" class="form-control" value="${formatRM(outstanding)}" readonly style="color: #ef4444; font-weight: bold;">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Payment Amount (RM) *</label>
                        <input type="number" id="supplierPaymentAmount" class="form-control" required step="0.01" min="0.01" max="${outstanding}" value="${outstanding.toFixed(2)}">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Payment Method</label>
                        <select id="supplierPaymentMethod" class="form-control">
                            <option value="bank">Bank Transfer</option>
                            <option value="cash">Cash</option>
                            <option value="cheque">Cheque</option>
                            <option value="card">Credit/Debit Card</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Reference No.</label>
                        <input type="text" id="supplierPaymentRef" class="form-control" placeholder="Transaction/Receipt reference">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Payment Date</label>
                        <input type="date" id="supplierPaymentDate" class="form-control" value="${new Date().toISOString().split('T')[0]}">
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn-secondary" onclick="closeModal('supplierPaymentModal')">Cancel</button>
                        <button type="submit" class="btn-primary">
                            <i class="fas fa-check"></i> Record Payment
                        </button>
                    </div>
                </form>
            </div>
        </div>
    `;
    
    // Remove existing modal if any
    document.getElementById('supplierPaymentModal')?.remove();
    document.body.insertAdjacentHTML('beforeend', modalHtml);
}

function processSupplierPayment(event, supplierId) {
    event.preventDefault();
    
    const supplier = suppliers.find(s => s.id === supplierId);
    if (!supplier) return;
    
    const amount = parseFloat(document.getElementById('supplierPaymentAmount').value);
    const method = document.getElementById('supplierPaymentMethod').value;
    const reference = document.getElementById('supplierPaymentRef').value.trim();
    const date = document.getElementById('supplierPaymentDate').value;
    
    if (!amount || amount <= 0) {
        showToast('Please enter a valid amount', 'error');
        return;
    }
    
    // Update supplier balance
    supplier.outstandingBalance = Math.max(0, (parseFloat(supplier.outstandingBalance) || 0) - amount);
    
    // Mark matching purchases as paid
    if (supplier.purchaseHistory) {
        let remaining = amount;
        for (let purchase of supplier.purchaseHistory) {
            if (!purchase.paid && remaining > 0) {
                if (remaining >= purchase.amount) {
                    purchase.paid = true;
                    purchase.paidDate = date;
                    remaining -= purchase.amount;
                } else {
                    // Partial payment - split the purchase
                    purchase.amount -= remaining;
                    remaining = 0;
                }
            }
        }
    }
    
    supplier.updatedAt = new Date().toISOString();
    saveSuppliers();
    
    // Record as expense transaction
    const expenseTransaction = {
        id: generateUUID(),
        date: date,
        amount: amount,
        category: 'Supplier Payment',
        description: `Payment to ${supplier.company || supplier.name}${reference ? ' - Ref: ' + reference : ''}`,
        type: 'expense',
        method: method,
        vendor: supplier.company || supplier.name,
        reference: reference,
        timestamp: new Date().toISOString()
    };
    
    if (typeof businessData !== 'undefined' && businessData.transactions) {
        businessData.transactions.push(expenseTransaction);
    } else if (typeof transactions !== 'undefined') {
        transactions.push(expenseTransaction);
    }
    if (typeof saveData === 'function') saveData();
    
    // Mark related bills as paid
    markSupplierBillsAsPaid(supplierId, amount, date);
    
    closeModal('supplierPaymentModal');
    closeModal('supplierDetailModal');
    renderSuppliers();
    updateSupplierStats();
    
    // Refresh all related views
    if (typeof loadTransactions === 'function') loadTransactions();
    if (typeof loadRecentTransactions === 'function') loadRecentTransactions();
    if (typeof updateDashboard === 'function') updateDashboard();
    if (typeof loadBills === 'function') loadBills();
    if (typeof loadUpcomingBills === 'function') loadUpcomingBills();
    if (typeof updateBalanceSheet === 'function') updateBalanceSheet();
    if (typeof updateMonthlyCharts === 'function') updateMonthlyCharts();
    if (typeof updateReports === 'function') updateReports();
    
    showToast(`Payment of ${formatRM(amount)} recorded!`, 'success');
}

// Mark supplier bills as paid when payment is made
function markSupplierBillsAsPaid(supplierId, paymentAmount, paymentDate) {
    if (typeof businessData === 'undefined' || !businessData.bills) return;
    
    let remainingAmount = paymentAmount;
    
    // Find unpaid bills for this supplier, oldest first
    const supplierBills = businessData.bills
        .filter(b => b.supplierId === supplierId && b.status !== 'paid')
        .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
    
    for (const bill of supplierBills) {
        if (remainingAmount <= 0) break;
        
        if (remainingAmount >= bill.amount) {
            // Full payment for this bill
            bill.status = 'paid';
            bill.paidDate = paymentDate;
            bill.paidAmount = bill.amount;
            remainingAmount -= bill.amount;
            console.log(`Bill ${bill.id} marked as paid`);
        } else {
            // Partial payment - reduce bill amount
            bill.partialPayments = bill.partialPayments || [];
            bill.partialPayments.push({
                amount: remainingAmount,
                date: paymentDate
            });
            bill.paidAmount = (bill.paidAmount || 0) + remainingAmount;
            // If total paid equals or exceeds amount, mark as paid
            if (bill.paidAmount >= bill.amount) {
                bill.status = 'paid';
                bill.paidDate = paymentDate;
            }
            remainingAmount = 0;
        }
    }
    
    if (typeof saveData === 'function') saveData();
}

// ==================== ADD PURCHASE ====================
function addPurchaseToSupplier(supplierId) {
    const supplier = suppliers.find(s => s.id === supplierId);
    if (!supplier) return;
    
    const modalHtml = `
        <div class="modal show" id="addPurchaseModal">
            <div class="modal-content" style="max-width: 500px;">
                <div class="modal-header">
                    <h3 class="modal-title">Add Purchase from Supplier</h3>
                    <button class="modal-close" onclick="closeModal('addPurchaseModal')">&times;</button>
                </div>
                <form onsubmit="saveSupplierPurchase(event, '${supplierId}')">
                    <div class="form-group">
                        <label class="form-label">Supplier</label>
                        <input type="text" class="form-control" value="${escapeHtml(supplier.company || supplier.name)}" readonly>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Purchase Date *</label>
                        <input type="date" id="purchaseDate" class="form-control" value="${new Date().toISOString().split('T')[0]}" required>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Description *</label>
                        <input type="text" id="purchaseDescription" class="form-control" required placeholder="e.g., Raw materials, Stock replenishment">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Amount (RM) *</label>
                        <input type="number" id="purchaseAmount" class="form-control" required step="0.01" min="0.01" placeholder="0.00">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Invoice/PO Number</label>
                        <input type="text" id="purchaseInvoice" class="form-control" placeholder="Supplier invoice number">
                    </div>
                    <div class="form-group">
                        <label>
                            <input type="checkbox" id="purchasePaid"> Mark as Paid
                        </label>
                    </div>
                    <div class="form-group">
                        <label>
                            <input type="checkbox" id="purchaseCreateBill" checked> Create Bill to Pay
                        </label>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn-secondary" onclick="closeModal('addPurchaseModal')">Cancel</button>
                        <button type="submit" class="btn-primary">
                            <i class="fas fa-plus"></i> Add Purchase
                        </button>
                    </div>
                </form>
            </div>
        </div>
    `;
    
    document.getElementById('addPurchaseModal')?.remove();
    document.body.insertAdjacentHTML('beforeend', modalHtml);
}

function saveSupplierPurchase(event, supplierId) {
    event.preventDefault();
    
    const supplier = suppliers.find(s => s.id === supplierId);
    if (!supplier) return;
    
    const date = document.getElementById('purchaseDate').value;
    const description = document.getElementById('purchaseDescription').value.trim();
    const amount = parseFloat(document.getElementById('purchaseAmount').value);
    const invoice = document.getElementById('purchaseInvoice').value.trim();
    const paid = document.getElementById('purchasePaid').checked;
    const createBill = document.getElementById('purchaseCreateBill').checked;
    
    if (!amount || amount <= 0) {
        showToast('Please enter a valid amount', 'error');
        return;
    }
    
    // Add to purchase history
    if (!supplier.purchaseHistory) supplier.purchaseHistory = [];
    supplier.purchaseHistory.unshift({
        id: generateUUID(),
        date: date,
        description: description,
        amount: amount,
        invoice: invoice,
        paid: paid,
        paidDate: paid ? date : null
    });
    
    // Update totals
    supplier.totalPurchases = (parseFloat(supplier.totalPurchases) || 0) + amount;
    if (!paid) {
        supplier.outstandingBalance = (parseFloat(supplier.outstandingBalance) || 0) + amount;
    }
    supplier.lastPurchaseDate = date;
    supplier.updatedAt = new Date().toISOString();
    
    saveSuppliers();
    
    // Create bill if requested
    if (createBill && !paid && typeof businessData !== 'undefined') {
        const termDays = parseInt(supplier.paymentTerms) || 30;
        const dueDate = new Date(date);
        dueDate.setDate(dueDate.getDate() + termDays);
        
        const bill = {
            id: generateUUID(),
            name: description,
            amount: amount,
            dueDate: dueDate.toISOString().split('T')[0],
            category: 'Supplier Purchase',
            vendor: supplier.company || supplier.name,
            status: 'pending',
            recurring: false,
            reference: invoice,
            supplierId: supplierId,
            timestamp: new Date().toISOString()
        };
        
        if (!businessData.bills) businessData.bills = [];
        businessData.bills.push(bill);
        if (typeof saveData === 'function') saveData();
        if (typeof loadBills === 'function') loadBills();
    }
    
    closeModal('addPurchaseModal');
    showSupplierDetail(supplierId);
    renderSuppliers();
    updateSupplierStats();
    
    showToast('Purchase recorded successfully!', 'success');
}

// ==================== DELETE SUPPLIER ====================
function deleteSupplier(supplierId) {
    const supplier = suppliers.find(s => s.id === supplierId);
    if (!supplier) return;
    
    const outstanding = parseFloat(supplier.outstandingBalance) || 0;
    
    let message = `Are you sure you want to delete "${supplier.company || supplier.name}"?`;
    if (outstanding > 0) {
        message += `\n\n⚠️ Warning: This supplier has ${formatRM(outstanding)} outstanding balance!`;
    }
    
    if (confirm(message)) {
        suppliers = suppliers.filter(s => s.id !== supplierId);
        saveSuppliers();
        closeModal('supplierDetailModal');
        renderSuppliers();
        showToast('Supplier deleted', 'success');
    }
}

// ==================== HELPER FUNCTIONS ====================
function formatDate(dateStr) {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-MY', { day: '2-digit', month: 'short', year: 'numeric' });
}

function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        showToast('Copied to clipboard!', 'success');
    });
}

// Get suppliers for dropdown select
function getSuppliersForSelect() {
    return suppliers.filter(s => s.status === 'active').map(s => ({
        id: s.id,
        name: s.name,
        company: s.company
    }));
}

// Link purchase to supplier from stock/inventory
function linkPurchaseToSupplier(supplierId, purchaseData) {
    const supplier = suppliers.find(s => s.id === supplierId);
    if (!supplier) return false;
    
    if (!supplier.purchaseHistory) supplier.purchaseHistory = [];
    supplier.purchaseHistory.unshift({
        id: generateUUID(),
        date: purchaseData.date || new Date().toISOString().split('T')[0],
        description: purchaseData.description || 'Stock Purchase',
        amount: purchaseData.amount || 0,
        invoice: purchaseData.invoice || '',
        paid: purchaseData.paid || false
    });
    
    supplier.totalPurchases = (parseFloat(supplier.totalPurchases) || 0) + (purchaseData.amount || 0);
    if (!purchaseData.paid) {
        supplier.outstandingBalance = (parseFloat(supplier.outstandingBalance) || 0) + (purchaseData.amount || 0);
    }
    supplier.lastPurchaseDate = purchaseData.date || new Date().toISOString().split('T')[0];
    
    saveSuppliers();
    return true;
}

// ==================== EXPORT SUPPLIERS ====================
function exportSuppliers() {
    if (suppliers.length === 0) {
        showToast('No suppliers to export', 'info');
        return;
    }
    
    // Create CSV content
    const headers = ['Company', 'Contact', 'Email', 'Phone', 'Address', 'Category', 'Payment Terms', 'Credit Limit', 'Outstanding', 'Total Purchases', 'Status'];
    const rows = suppliers.map(s => [
        s.company || '',
        s.name || '',
        s.email || '',
        s.phone || '',
        (s.address || '').replace(/\n/g, ' '),
        getCategoryLabel(s.category),
        `Net ${s.paymentTerms || 30} days`,
        s.creditLimit || 0,
        s.outstandingBalance || 0,
        s.totalPurchases || 0,
        s.status || 'active'
    ]);
    
    const csv = [headers.join(','), ...rows.map(row => row.map(cell => `"${cell}"`).join(','))].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `suppliers-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    
    showToast('Suppliers exported successfully!', 'success');
}

// Export functions
window.initializeSuppliers = initializeSuppliers;
window.showSupplierModal = showSupplierModal;
window.closeSupplierModal = closeSupplierModal;
window.saveSupplier = saveSupplier;
window.renderSuppliers = renderSuppliers;
window.searchSuppliers = searchSuppliers;
window.filterSuppliers = filterSuppliers;
window.showSupplierDetail = showSupplierDetail;
window.recordSupplierPayment = recordSupplierPayment;
window.processSupplierPayment = processSupplierPayment;
window.addPurchaseToSupplier = addPurchaseToSupplier;
window.saveSupplierPurchase = saveSupplierPurchase;
window.deleteSupplier = deleteSupplier;
window.getSuppliersForSelect = getSuppliersForSelect;
window.linkPurchaseToSupplier = linkPurchaseToSupplier;
window.exportSuppliers = exportSuppliers;
window.markSupplierBillsAsPaid = markSupplierBillsAsPaid;
