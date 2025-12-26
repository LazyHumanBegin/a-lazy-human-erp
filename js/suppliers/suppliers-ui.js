/**
 * EZCubic - Supplier Profile Module (UI)
 * Modals, rendering, forms, and user interface
 */

// ==================== SUPPLIER MODAL ====================
function showSupplierModal(supplierId = null) {
    const modal = document.getElementById('supplierModal');
    const title = document.getElementById('supplierModalTitle');
    const form = document.getElementById('supplierForm');
    
    form.reset();
    document.getElementById('supplierId').value = '';
    
    if (supplierId) {
        const supplier = getSupplierById(supplierId);
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
        status: document.getElementById('supplierStatus').value
    };
    
    if (saveSupplierData(supplierData, id)) {
        renderSuppliers();
        closeSupplierModal();
    }
}

// ==================== SUPPLIER LIST ====================
function renderSuppliers(searchTerm = '') {
    const container = document.getElementById('suppliersList');
    if (!container) return;
    
    const suppliers = getSuppliersArray();
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

function searchSuppliers(term) {
    renderSuppliers(term);
}

function filterSuppliers() {
    renderSuppliers();
}

// ==================== SUPPLIER DETAIL ====================
function showSupplierDetail(supplierId) {
    const supplier = getSupplierById(supplierId);
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
                        const isOverdueBill = dueDate && dueDate < today;
                        const daysOverdue = dueDate ? Math.floor((today - dueDate) / (1000 * 60 * 60 * 24)) : 0;
                        
                        return `
                            <tr style="border-bottom: 1px solid #e2e8f0;">
                                <td style="padding: 8px;">${escapeHtml(bill.reference || bill.id)}</td>
                                <td style="padding: 8px;">${dueDate ? dueDate.toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}</td>
                                <td style="padding: 8px; text-align: right; font-weight: 600;">${formatRM(bill.amount)}</td>
                                <td style="padding: 8px; text-align: center;">
                                    ${isOverdueBill ? 
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
                        <span class="purchase-date">${formatDateSupplier(purchase.date)}</span>
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

// ==================== SUPPLIER PAYMENT MODAL ====================
function recordSupplierPayment(supplierId) {
    const supplier = getSupplierById(supplierId);
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

// ==================== ADD PURCHASE MODAL ====================
function addPurchaseToSupplier(supplierId) {
    const supplier = getSupplierById(supplierId);
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

// ==================== WINDOW EXPORTS ====================
window.showSupplierModal = showSupplierModal;
window.closeSupplierModal = closeSupplierModal;
window.saveSupplier = saveSupplier;
window.renderSuppliers = renderSuppliers;
window.searchSuppliers = searchSuppliers;
window.filterSuppliers = filterSuppliers;
window.showSupplierDetail = showSupplierDetail;
window.renderOutstandingBills = renderOutstandingBills;
window.renderPurchaseHistory = renderPurchaseHistory;
window.recordSupplierPayment = recordSupplierPayment;
window.addPurchaseToSupplier = addPurchaseToSupplier;
