// ==================== QUOTATIONS UI ====================
// Modal, rendering, forms, items management, view detail

// ==================== QUOTATION MODAL ====================
function showQuotationModal(editId = null) {
    const modal = document.getElementById('quotationModal');
    const form = document.getElementById('quotationForm');
    const title = document.getElementById('quotationModalTitle');
    
    if (!modal || !form) return;
    
    form.reset();
    
    // Reset items container
    const itemsContainer = document.getElementById('quotationItemsContainer');
    if (itemsContainer) itemsContainer.innerHTML = '';
    
    // Load customers and salespersons
    loadQuotationCustomers();
    loadQuotationSalespersons();
    
    // Set default dates
    const today = new Date().toISOString().split('T')[0];
    const validDate = new Date();
    validDate.setDate(validDate.getDate() + 30);
    
    document.getElementById('quotationDate').value = today;
    document.getElementById('quotationValidUntil').value = validDate.toISOString().split('T')[0];
    
    if (editId) {
        const quotation = quotations.find(q => q.id === editId);
        if (quotation) {
            title.textContent = 'Edit Quotation';
            document.getElementById('editQuotationId').value = quotation.id;
            document.getElementById('quotationNo').value = quotation.quotationNo;
            document.getElementById('quotationDate').value = quotation.date;
            document.getElementById('quotationValidUntil').value = quotation.validUntil;
            document.getElementById('quotationCustomer').value = quotation.customerId || '';
            document.getElementById('quotationSubject').value = quotation.subject || '';
            document.getElementById('quotationSalesperson').value = quotation.salespersonId || '';
            document.getElementById('quotationNotes').value = quotation.notes || '';
            document.getElementById('quotationTerms').value = quotation.terms || '';
            document.getElementById('quotationDiscount').value = quotation.discount || 0;
            document.getElementById('quotationTaxRate').value = quotation.taxRate || 0;
            
            // Load items
            if (quotation.items && quotation.items.length > 0) {
                quotation.items.forEach(item => {
                    addQuotationItem(item);
                });
            }
            
            // Update customer info display
            if (quotation.customerId) {
                updateQuotationCustomerInfo(quotation.customerId);
            }
        }
    } else {
        title.textContent = 'Create Quotation';
        document.getElementById('editQuotationId').value = '';
        document.getElementById('quotationNo').value = generateQuotationNo();
        
        // Add first empty item row
        addQuotationItem();
    }
    
    calculateQuotationTotals();
    
    modal.style.display = '';
    modal.classList.add('show');
}

// ==================== LOAD DROPDOWNS ====================
function loadQuotationCustomers() {
    const select = document.getElementById('quotationCustomer');
    if (!select) return;
    
    select.innerHTML = '<option value="">Select Customer</option>';
    
    // Load from CRM customers if available
    if (typeof crmCustomers !== 'undefined' && crmCustomers.length > 0) {
        crmCustomers.forEach(customer => {
            const option = document.createElement('option');
            option.value = customer.id;
            option.textContent = customer.company ? `${customer.name} (${customer.company})` : customer.name;
            select.appendChild(option);
        });
    }
}

function loadQuotationSalespersons() {
    const select = document.getElementById('quotationSalesperson');
    if (!select) return;
    
    select.innerHTML = '<option value="">Select Salesperson</option>';
    
    // Load from employees if available
    if (typeof employees !== 'undefined' && employees.length > 0) {
        employees.filter(e => e.status === 'active').forEach(emp => {
            const option = document.createElement('option');
            option.value = emp.id;
            option.textContent = emp.name;
            select.appendChild(option);
        });
    }
}

// ==================== CUSTOMER INFO ====================
function onQuotationCustomerChange() {
    const customerId = document.getElementById('quotationCustomer').value;
    if (customerId) {
        updateQuotationCustomerInfo(customerId);
    } else {
        const infoDiv = document.getElementById('quotationCustomerInfo');
        if (infoDiv) infoDiv.innerHTML = '';
    }
}

function updateQuotationCustomerInfo(customerId) {
    const infoDiv = document.getElementById('quotationCustomerInfo');
    if (!infoDiv) return;
    
    if (typeof crmCustomers !== 'undefined') {
        const customer = crmCustomers.find(c => c.id === customerId);
        if (customer) {
            infoDiv.innerHTML = `
                <div class="customer-preview">
                    ${customer.company ? `<div><strong>${escapeHtml(customer.company)}</strong></div>` : ''}
                    ${customer.phone ? `<div><i class="fas fa-phone"></i> ${escapeHtml(customer.phone)}</div>` : ''}
                    ${customer.email ? `<div><i class="fas fa-envelope"></i> ${escapeHtml(customer.email)}</div>` : ''}
                </div>
            `;
            return;
        }
    }
    infoDiv.innerHTML = '';
}

// ==================== QUOTATION ITEMS ====================
function renderQuotationItemInputs() {
    // This function re-renders existing items if needed
    calculateQuotationTotals();
}

function addQuotationItem(itemData = null) {
    const container = document.getElementById('quotationItemsContainer');
    if (!container) return;
    
    const itemId = 'item_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    
    const itemRow = document.createElement('div');
    itemRow.className = 'quotation-item-row';
    itemRow.id = itemId;
    
    // Get products for dropdown
    let productOptions = '<option value="">Select Product (Optional)</option>';
    if (typeof inventory !== 'undefined' && inventory.length > 0) {
        inventory.forEach(product => {
            productOptions += `<option value="${product.id}" data-price="${product.price}">${escapeHtml(product.name)} - RM ${product.price?.toFixed(2)}</option>`;
        });
    }
    
    itemRow.innerHTML = `
        <div class="item-row-content">
            <div class="item-field product-select">
                <select class="item-product" onchange="selectQuotationProduct('${itemId}', this.value)">
                    ${productOptions}
                </select>
            </div>
            <div class="item-field description-field">
                <input type="text" class="item-description" placeholder="Description" 
                    value="${itemData ? escapeHtml(itemData.description) : ''}" required>
            </div>
            <div class="item-field qty-field">
                <input type="number" class="item-quantity" placeholder="Qty" min="1" step="1"
                    value="${itemData ? itemData.quantity : 1}" onchange="calculateQuotationTotals()">
            </div>
            <div class="item-field price-field">
                <input type="number" class="item-price" placeholder="Unit Price" min="0" step="0.01"
                    value="${itemData ? itemData.unitPrice : ''}" onchange="calculateQuotationTotals()">
            </div>
            <div class="item-field total-field">
                <input type="text" class="item-total" readonly value="RM 0.00">
            </div>
            <div class="item-field action-field">
                <button type="button" class="btn-icon danger" onclick="removeQuotationItem('${itemId}')">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
    `;
    
    container.appendChild(itemRow);
    calculateQuotationTotals();
}

function selectQuotationProduct(itemId, productId) {
    if (!productId) return;
    
    const itemRow = document.getElementById(itemId);
    if (!itemRow) return;
    
    if (typeof inventory !== 'undefined') {
        const product = inventory.find(p => p.id === productId);
        if (product) {
            itemRow.querySelector('.item-description').value = product.name;
            itemRow.querySelector('.item-price').value = product.price || 0;
            calculateQuotationTotals();
        }
    }
}

function removeQuotationItem(itemId) {
    const itemRow = document.getElementById(itemId);
    if (itemRow) {
        itemRow.remove();
        calculateQuotationTotals();
    }
}

function calculateQuotationTotals() {
    const container = document.getElementById('quotationItemsContainer');
    if (!container) return;
    
    let subtotal = 0;
    
    container.querySelectorAll('.quotation-item-row').forEach(row => {
        const qty = parseFloat(row.querySelector('.item-quantity')?.value) || 0;
        const price = parseFloat(row.querySelector('.item-price')?.value) || 0;
        const lineTotal = qty * price;
        
        const totalField = row.querySelector('.item-total');
        if (totalField) {
            totalField.value = `RM ${lineTotal.toFixed(2)}`;
        }
        
        subtotal += lineTotal;
    });
    
    // Update subtotal display
    const subtotalEl = document.getElementById('quotationSubtotal');
    if (subtotalEl) subtotalEl.textContent = `RM ${subtotal.toFixed(2)}`;
    
    // Calculate discount
    const discountPercent = parseFloat(document.getElementById('quotationDiscount')?.value) || 0;
    const discountAmount = subtotal * (discountPercent / 100);
    const discountEl = document.getElementById('quotationDiscountAmount');
    if (discountEl) discountEl.textContent = `- RM ${discountAmount.toFixed(2)}`;
    
    // Calculate tax
    const afterDiscount = subtotal - discountAmount;
    const taxRate = parseFloat(document.getElementById('quotationTaxRate')?.value) || 0;
    const taxAmount = afterDiscount * (taxRate / 100);
    const taxEl = document.getElementById('quotationTaxAmount');
    if (taxEl) taxEl.textContent = `+ RM ${taxAmount.toFixed(2)}`;
    
    // Calculate grand total
    const grandTotal = afterDiscount + taxAmount;
    const totalEl = document.getElementById('quotationGrandTotal');
    if (totalEl) totalEl.textContent = `RM ${grandTotal.toFixed(2)}`;
}

// ==================== SAVE QUOTATION ====================
function saveQuotation(asDraft = true) {
    const editId = document.getElementById('editQuotationId').value;
    const customerId = document.getElementById('quotationCustomer').value;
    
    // Get customer name
    let customerName = '';
    let customerCompany = '';
    if (typeof crmCustomers !== 'undefined' && customerId) {
        const customer = crmCustomers.find(c => c.id === customerId);
        if (customer) {
            customerName = customer.name;
            customerCompany = customer.company || '';
        }
    }
    
    // Collect items
    const items = [];
    document.querySelectorAll('#quotationItemsContainer .quotation-item-row').forEach(row => {
        const description = row.querySelector('.item-description').value.trim();
        const quantity = parseFloat(row.querySelector('.item-quantity').value) || 0;
        const unitPrice = parseFloat(row.querySelector('.item-price').value) || 0;
        
        if (description && quantity > 0) {
            items.push({
                description,
                quantity,
                unitPrice,
                lineTotal: quantity * unitPrice
            });
        }
    });
    
    if (items.length === 0) {
        showToast('Please add at least one item', 'error');
        return;
    }
    
    // Calculate totals
    const subtotal = items.reduce((sum, item) => sum + item.lineTotal, 0);
    const discount = parseFloat(document.getElementById('quotationDiscount').value) || 0;
    const discountAmount = subtotal * (discount / 100);
    const afterDiscount = subtotal - discountAmount;
    const taxRate = parseFloat(document.getElementById('quotationTaxRate').value) || 0;
    const taxAmount = afterDiscount * (taxRate / 100);
    const totalAmount = afterDiscount + taxAmount;
    
    const quotationData = {
        quotationNo: document.getElementById('quotationNo').value,
        date: document.getElementById('quotationDate').value,
        validUntil: document.getElementById('quotationValidUntil').value,
        customerId,
        customerName,
        customerCompany,
        subject: document.getElementById('quotationSubject').value.trim(),
        salespersonId: document.getElementById('quotationSalesperson').value,
        items,
        subtotal,
        discount,
        discountAmount,
        taxRate,
        taxAmount,
        totalAmount,
        notes: document.getElementById('quotationNotes').value.trim(),
        terms: document.getElementById('quotationTerms').value.trim(),
        status: asDraft ? 'draft' : 'sent',
        updatedAt: new Date().toISOString()
    };
    
    if (editId) {
        // Update existing
        const index = quotations.findIndex(q => q.id === editId);
        if (index !== -1) {
            quotations[index] = { ...quotations[index], ...quotationData };
        }
    } else {
        // Create new
        quotationData.id = 'QT' + Date.now();
        quotationData.createdAt = new Date().toISOString();
        if (!asDraft) {
            quotationData.sentAt = new Date().toISOString();
        }
        quotations.push(quotationData);
    }
    
    saveQuotations();
    renderQuotations();
    updateQuotationStats();
    closeModal('quotationModal');
    
    showToast(editId ? 'Quotation updated!' : 'Quotation created!', 'success');
}

function saveAndSendQuotation() {
    saveQuotation(false);
}

// ==================== RENDER QUOTATIONS ====================
function renderQuotations() {
    const container = document.getElementById('quotationsList');
    if (!container) return;
    
    if (quotations.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-file-invoice"></i>
                <h3>No Quotations Yet</h3>
                <p>Create your first quotation to get started</p>
                <button class="btn-primary" onclick="showQuotationModal()">
                    <i class="fas fa-plus"></i> Create Quotation
                </button>
            </div>
        `;
        return;
    }
    
    // Sort by date (newest first)
    const sorted = [...quotations].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    container.innerHTML = sorted.map(quotation => {
        // Check if expired
        let displayStatus = quotation.status;
        if (quotation.status === 'sent' && quotation.validUntil && new Date(quotation.validUntil) < new Date()) {
            displayStatus = 'expired';
        }
        
        const statusColors = {
            draft: '#64748b',
            sent: '#3b82f6',
            accepted: '#10b981',
            rejected: '#ef4444',
            expired: '#f59e0b'
        };
        const statusLabels = {
            draft: 'Draft',
            sent: 'Sent',
            accepted: 'Accepted',
            rejected: 'Rejected',
            expired: 'Expired'
        };
        
        return `
            <div class="quotation-card" onclick="viewQuotationDetail('${quotation.id}')">
                <div class="quotation-card-header">
                    <div class="quotation-number">${escapeHtml(quotation.quotationNo)}</div>
                    <span class="status-badge" style="background: ${statusColors[displayStatus]}20; color: ${statusColors[displayStatus]};">
                        ${statusLabels[displayStatus]}
                    </span>
                </div>
                <div class="quotation-card-body">
                    <div class="customer-name">${escapeHtml(quotation.customerName || 'No Customer')}</div>
                    ${quotation.subject ? `<div class="quotation-subject">${escapeHtml(quotation.subject)}</div>` : ''}
                    <div class="quotation-info">
                        <span><i class="fas fa-calendar"></i> ${formatDate(quotation.date)}</span>
                        <span class="quotation-amount">RM ${quotation.totalAmount?.toFixed(2)}</span>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// ==================== SEARCH & FILTER ====================
function searchQuotations() {
    const query = document.getElementById('quotationSearch')?.value.toLowerCase() || '';
    const cards = document.querySelectorAll('.quotation-card');
    
    cards.forEach(card => {
        const text = card.textContent.toLowerCase();
        card.style.display = text.includes(query) ? '' : 'none';
    });
}

function filterQuotationsByStatus(status) {
    // Update active tab
    document.querySelectorAll('.quotation-filter-tab').forEach(tab => {
        tab.classList.remove('active');
        if (tab.dataset.status === status) tab.classList.add('active');
    });
    
    const cards = document.querySelectorAll('.quotation-card');
    
    cards.forEach(card => {
        if (status === 'all') {
            card.style.display = '';
        } else {
            const badge = card.querySelector('.status-badge');
            const cardStatus = badge ? badge.textContent.trim().toLowerCase() : '';
            card.style.display = cardStatus === status ? '' : 'none';
        }
    });
}

// ==================== VIEW QUOTATION DETAIL ====================
function viewQuotationDetail(quotationId) {
    const quotation = quotations.find(q => q.id === quotationId);
    if (!quotation) {
        showToast('Quotation not found', 'error');
        return;
    }
    
    const modal = document.getElementById('quotationDetailModal');
    const content = document.getElementById('quotationDetailContent');
    if (!modal || !content) return;
    
    // Check if expired
    let displayStatus = quotation.status;
    if (quotation.status === 'sent' && quotation.validUntil && new Date(quotation.validUntil) < new Date()) {
        displayStatus = 'expired';
    }
    
    const statusColors = {
        draft: '#64748b',
        sent: '#3b82f6',
        accepted: '#10b981',
        rejected: '#ef4444',
        expired: '#f59e0b'
    };
    const statusLabels = {
        draft: 'Draft',
        sent: 'Sent',
        accepted: 'Accepted',
        rejected: 'Rejected',
        expired: 'Expired'
    };
    
    // Get customer details
    let customerInfo = { name: quotation.customerName, company: quotation.customerCompany };
    if (typeof crmCustomers !== 'undefined' && quotation.customerId) {
        const customer = crmCustomers.find(c => c.id === quotation.customerId);
        if (customer) {
            customerInfo = customer;
        }
    }
    
    content.innerHTML = `
        <div class="quotation-detail-header">
            <div>
                <h2>${escapeHtml(quotation.quotationNo)}</h2>
                <span class="status-badge large" style="background: ${statusColors[displayStatus]}20; color: ${statusColors[displayStatus]};">
                    ${statusLabels[displayStatus]}
                </span>
            </div>
            <div class="quotation-detail-actions">
                ${quotation.status === 'draft' ? `
                    <button class="btn-secondary" onclick="showQuotationModal('${quotation.id}')">
                        <i class="fas fa-edit"></i> Edit
                    </button>
                    <button class="btn-primary" onclick="markQuotationSent('${quotation.id}')">
                        <i class="fas fa-paper-plane"></i> Mark as Sent
                    </button>
                ` : ''}
                ${quotation.status === 'sent' && displayStatus !== 'expired' ? `
                    <button class="btn-success" onclick="acceptQuotation('${quotation.id}')">
                        <i class="fas fa-check"></i> Accept & Create Project
                    </button>
                    <button class="btn-danger" onclick="rejectQuotation('${quotation.id}')">
                        <i class="fas fa-times"></i> Reject
                    </button>
                ` : ''}
                ${displayStatus === 'expired' ? `
                    <button class="btn-secondary" onclick="duplicateQuotation('${quotation.id}')">
                        <i class="fas fa-copy"></i> Duplicate & Update
                    </button>
                ` : ''}
                <button class="btn-outline" onclick="shareQuotationWhatsApp('${quotation.id}')" style="background: #25d366; color: white; border: none;">
                    <i class="fab fa-whatsapp"></i> WhatsApp
                </button>
                <button class="btn-outline" onclick="emailQuotation('${quotation.id}')" style="background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%); color: white; border: none;">
                    <i class="fas fa-envelope"></i> Email
                </button>
                <button class="btn-primary" onclick="generateQuotationPDF('${quotation.id}')" style="background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);">
                    <i class="fas fa-file-pdf"></i> PDF
                </button>
                <button class="btn-outline" onclick="showTemplateSelector()" title="Change Template">
                    <i class="fas fa-palette"></i>
                </button>
                <button class="btn-outline danger" onclick="deleteQuotation('${quotation.id}')">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
        
        <div class="quotation-detail-grid">
            <div class="quotation-detail-section">
                <h3><i class="fas fa-user"></i> Customer Information</h3>
                <div class="detail-rows">
                    <div class="detail-row">
                        <span class="label">Name:</span>
                        <span class="value">${escapeHtml(customerInfo.name)}</span>
                    </div>
                    ${customerInfo.company ? `
                    <div class="detail-row">
                        <span class="label">Company:</span>
                        <span class="value">${escapeHtml(customerInfo.company)}</span>
                    </div>
                    ` : ''}
                    ${customerInfo.phone ? `
                    <div class="detail-row">
                        <span class="label">Phone:</span>
                        <span class="value">${escapeHtml(customerInfo.phone)}</span>
                    </div>
                    ` : ''}
                    ${customerInfo.email ? `
                    <div class="detail-row">
                        <span class="label">Email:</span>
                        <span class="value">${escapeHtml(customerInfo.email)}</span>
                    </div>
                    ` : ''}
                    ${customerInfo.address ? `
                    <div class="detail-row">
                        <span class="label">Address:</span>
                        <span class="value">${escapeHtml(customerInfo.address)}</span>
                    </div>
                    ` : ''}
                </div>
            </div>
            
            <div class="quotation-detail-section">
                <h3><i class="fas fa-info-circle"></i> Quotation Details</h3>
                <div class="detail-rows">
                    <div class="detail-row">
                        <span class="label">Date:</span>
                        <span class="value">${formatDate(quotation.date)}</span>
                    </div>
                    <div class="detail-row">
                        <span class="label">Valid Until:</span>
                        <span class="value">${formatDate(quotation.validUntil)}</span>
                    </div>
                    ${quotation.subject ? `
                    <div class="detail-row">
                        <span class="label">Subject:</span>
                        <span class="value">${escapeHtml(quotation.subject)}</span>
                    </div>
                    ` : ''}
                </div>
            </div>
        </div>
        
        <div class="quotation-detail-section">
            <h3><i class="fas fa-list"></i> Items</h3>
            <table class="quotation-items-table">
                <thead>
                    <tr>
                        <th style="width: 50%;">Description</th>
                        <th style="width: 15%; text-align: center;">Qty</th>
                        <th style="width: 17.5%; text-align: right;">Unit Price</th>
                        <th style="width: 17.5%; text-align: right;">Amount</th>
                    </tr>
                </thead>
                <tbody>
                    ${(quotation.items || []).map(item => `
                        <tr>
                            <td>${escapeHtml(item.description)}</td>
                            <td style="text-align: center;">${item.quantity}</td>
                            <td style="text-align: right;">RM ${item.unitPrice?.toFixed(2)}</td>
                            <td style="text-align: right;">RM ${item.lineTotal?.toFixed(2)}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
            
            <div class="quotation-totals">
                <div class="total-row">
                    <span>Subtotal:</span>
                    <span>RM ${quotation.subtotal?.toFixed(2)}</span>
                </div>
                ${quotation.discount > 0 ? `
                <div class="total-row discount">
                    <span>Discount (${quotation.discount}%):</span>
                    <span>- RM ${quotation.discountAmount?.toFixed(2)}</span>
                </div>
                ` : ''}
                ${quotation.taxRate > 0 ? `
                <div class="total-row tax">
                    <span>SST/Tax (${quotation.taxRate}%):</span>
                    <span>+ RM ${quotation.taxAmount?.toFixed(2)}</span>
                </div>
                ` : ''}
                <div class="total-row grand">
                    <span>Grand Total:</span>
                    <span>RM ${quotation.totalAmount?.toFixed(2)}</span>
                </div>
            </div>
        </div>
        
        ${quotation.notes ? `
        <div class="quotation-detail-section">
            <h3><i class="fas fa-sticky-note"></i> Notes</h3>
            <p class="quotation-notes">${escapeHtml(quotation.notes).replace(/\n/g, '<br>')}</p>
        </div>
        ` : ''}
        
        ${quotation.terms ? `
        <div class="quotation-detail-section">
            <h3><i class="fas fa-file-contract"></i> Terms & Conditions</h3>
            <p class="quotation-terms">${escapeHtml(quotation.terms).replace(/\n/g, '<br>')}</p>
        </div>
        ` : ''}
        
        ${quotation.projectId ? `
        <div class="quotation-detail-section highlight">
            <h3><i class="fas fa-project-diagram"></i> Linked Project</h3>
            <p>This quotation has been converted to a project.</p>
            <button class="btn-primary" onclick="closeModal('quotationDetailModal'); viewProjectDetail('${quotation.projectId}');">
                <i class="fas fa-external-link-alt"></i> View Project
            </button>
        </div>
        ` : ''}
    `;
    
    modal.style.display = '';
    modal.classList.add('show');
}

// ==================== WINDOW EXPORTS ====================
window.showQuotationModal = showQuotationModal;
window.loadQuotationCustomers = loadQuotationCustomers;
window.loadQuotationSalespersons = loadQuotationSalespersons;
window.onQuotationCustomerChange = onQuotationCustomerChange;
window.updateQuotationCustomerInfo = updateQuotationCustomerInfo;
window.renderQuotationItemInputs = renderQuotationItemInputs;
window.addQuotationItem = addQuotationItem;
window.selectQuotationProduct = selectQuotationProduct;
window.removeQuotationItem = removeQuotationItem;
window.calculateQuotationTotals = calculateQuotationTotals;
window.saveQuotation = saveQuotation;
window.saveAndSendQuotation = saveAndSendQuotation;
window.renderQuotations = renderQuotations;
window.searchQuotations = searchQuotations;
window.filterQuotationsByStatus = filterQuotationsByStatus;
window.viewQuotationDetail = viewQuotationDetail;
