/**
 * EZCubic CRM Module
 * Customer Relationship Management
 */

// ==================== CRM DATA ====================
const CRM_CUSTOMERS_KEY = 'ezcubic_crm_customers';
let crmCustomers = [];

// ==================== CRM INITIALIZATION ====================
function initializeCRM() {
    loadCRMCustomers();
    renderCRMCustomers();
    updateCRMStats();
}

// ==================== CRM DATA MANAGEMENT ====================
function loadCRMCustomers() {
    // First check window.crmCustomers (set by tenant data loading)
    if (Array.isArray(window.crmCustomers) && window.crmCustomers.length > 0) {
        crmCustomers = window.crmCustomers;
    } else {
        // Fall back to localStorage
        const stored = localStorage.getItem(CRM_CUSTOMERS_KEY);
        if (stored) {
            try {
                const parsed = JSON.parse(stored);
                if (Array.isArray(parsed)) {
                    crmCustomers = parsed;
                }
            } catch (e) {
                console.error('Error parsing CRM customers from localStorage:', e);
                crmCustomers = [];
            }
        }
    }
    // Sync back to window for other modules
    window.crmCustomers = crmCustomers;
}

function saveCRMCustomers() {
    // Save to localStorage
    localStorage.setItem(CRM_CUSTOMERS_KEY, JSON.stringify(crmCustomers));
    
    // Sync to window for other modules
    window.crmCustomers = crmCustomers;
    
    // Update UI stats
    updateCRMStats();
    
    // Also save to tenant storage for data isolation
    if (typeof saveToUserTenant === 'function') {
        saveToUserTenant();
    }
}

// ==================== CRM STATS ====================
function updateCRMStats() {
    // Total customers
    const totalEl = document.getElementById('crmTotalCustomers');
    if (totalEl) totalEl.textContent = crmCustomers.length;
    
    // VIP customers
    const vipEl = document.getElementById('crmVIPCustomers');
    if (vipEl) vipEl.textContent = crmCustomers.filter(c => c.group === 'vip').length;
    
    // Outstanding balance
    const outstandingEl = document.getElementById('crmOutstandingBalance');
    if (outstandingEl) {
        const totalOutstanding = crmCustomers.reduce((sum, c) => sum + (c.outstandingBalance || 0), 0);
        outstandingEl.textContent = formatRM(totalOutstanding);
    }
    
    // This month sales
    const thisMonthEl = document.getElementById('crmThisMonthSales');
    if (thisMonthEl) {
        const now = new Date();
        const thisMonth = now.getMonth();
        const thisYear = now.getFullYear();
        
        let monthSales = 0;
        crmCustomers.forEach(customer => {
            if (customer.salesHistory) {
                customer.salesHistory.forEach(sale => {
                    const saleDate = new Date(sale.date);
                    if (saleDate.getMonth() === thisMonth && saleDate.getFullYear() === thisYear) {
                        monthSales += sale.amount;
                    }
                });
            }
        });
        thisMonthEl.textContent = formatRM(monthSales);
    }
}

// ==================== CRM CUSTOMER MODAL ====================
function showCRMCustomerModal(customerId = null) {
    const modal = document.getElementById('crmCustomerModal');
    const title = document.getElementById('crmCustomerModalTitle');
    const form = document.getElementById('crmCustomerForm');
    
    form.reset();
    document.getElementById('crmCustomerId').value = '';
    
    if (customerId) {
        // Edit mode
        const customer = crmCustomers.find(c => c.id === customerId);
        if (customer) {
            title.textContent = 'Edit Customer';
            document.getElementById('crmCustomerId').value = customer.id;
            document.getElementById('crmCustomerName').value = customer.name;
            document.getElementById('crmCustomerGroup').value = customer.group || 'regular';
            document.getElementById('crmCustomerPhone').value = customer.phone || '';
            document.getElementById('crmCustomerEmail').value = customer.email || '';
            document.getElementById('crmCustomerCompany').value = customer.company || '';
            document.getElementById('crmCustomerCreditTerms').value = customer.creditTerms || 'cod';
            document.getElementById('crmCustomerCreditLimit').value = customer.creditLimit || 0;
            document.getElementById('crmCustomerStatus').value = customer.status || 'active';
            document.getElementById('crmCustomerAddress').value = customer.address || '';
            document.getElementById('crmCustomerNotes').value = customer.notes || '';
        }
    } else {
        // Add mode
        title.textContent = 'Add Customer';
    }
    
    modal.style.display = '';
    modal.classList.add('show');
}

function saveCRMCustomer(event) {
    event.preventDefault();
    
    const id = document.getElementById('crmCustomerId').value;
    
    // Check customer limit for new customers only
    if (!id && typeof canAdd === 'function' && !canAdd('customers')) {
        return; // Limit reached, modal shown by canAdd()
    }
    
    const customerData = {
        name: document.getElementById('crmCustomerName').value.trim(),
        group: document.getElementById('crmCustomerGroup').value,
        phone: document.getElementById('crmCustomerPhone').value.trim(),
        email: document.getElementById('crmCustomerEmail').value.trim(),
        company: document.getElementById('crmCustomerCompany').value.trim(),
        creditTerms: document.getElementById('crmCustomerCreditTerms').value,
        creditLimit: parseFloat(document.getElementById('crmCustomerCreditLimit').value) || 0,
        status: document.getElementById('crmCustomerStatus').value,
        address: document.getElementById('crmCustomerAddress').value.trim(),
        notes: document.getElementById('crmCustomerNotes').value.trim(),
        updatedAt: new Date().toISOString()
    };
    
    let newCustomerId = null;
    
    if (id) {
        // Update existing customer
        const index = crmCustomers.findIndex(c => c.id === id);
        if (index !== -1) {
            crmCustomers[index] = { ...crmCustomers[index], ...customerData };
            showToast('Customer updated successfully!', 'success');
        }
    } else {
        // Add new customer
        const newCustomer = {
            id: generateUUID(),
            ...customerData,
            outstandingBalance: 0,
            totalSpent: 0,
            salesHistory: [],
            interactions: [],
            createdAt: new Date().toISOString()
        };
        crmCustomers.push(newCustomer);
        newCustomerId = newCustomer.id;
        showToast('Customer added successfully!', 'success');
    }
    
    saveCRMCustomers();
    renderCRMCustomers();
    closeModal('crmCustomerModal');
    
    // Check if we need to return to quotation modal with the new customer
    if (window.returnToQuotationAfterCustomer && newCustomerId) {
        window.returnToQuotationAfterCustomer = false;
        
        // Small delay to let modal close animation complete
        setTimeout(() => {
            if (typeof showQuotationModal === 'function') {
                showQuotationModal();
                // Wait for modal to render, then select the new customer
                setTimeout(() => {
                    const customerSelect = document.getElementById('quotationCustomer');
                    if (customerSelect) {
                        // Refresh customer list first
                        if (typeof populateQuotationCustomers === 'function') {
                            populateQuotationCustomers();
                        }
                        customerSelect.value = newCustomerId;
                        // Trigger change to update customer info
                        if (typeof updateQuotationCustomerInfo === 'function') {
                            updateQuotationCustomerInfo(newCustomerId);
                        }
                    }
                }, 100);
            }
        }, 200);
    }
}

// ==================== CRM CUSTOMER RENDERING ====================
function renderCRMCustomers() {
    const container = document.getElementById('crmCustomerGrid');
    if (!container) return;
    
    const searchTerm = document.getElementById('crmSearch')?.value?.toLowerCase() || '';
    const groupFilter = document.getElementById('crmGroupFilter')?.value || '';
    const statusFilter = document.getElementById('crmStatusFilter')?.value || '';
    
    let filtered = crmCustomers.filter(customer => {
        const matchesSearch = !searchTerm || 
            customer.name.toLowerCase().includes(searchTerm) ||
            (customer.phone && customer.phone.includes(searchTerm)) ||
            (customer.email && customer.email.toLowerCase().includes(searchTerm)) ||
            (customer.company && customer.company.toLowerCase().includes(searchTerm));
        const matchesGroup = !groupFilter || customer.group === groupFilter;
        const matchesStatus = !statusFilter || customer.status === statusFilter;
        return matchesSearch && matchesGroup && matchesStatus;
    });
    
    if (filtered.length === 0) {
        container.innerHTML = `
            <div class="crm-empty">
                <i class="fas fa-users"></i>
                <p>${crmCustomers.length === 0 ? 'No customers yet. Add your first customer!' : 'No customers found matching your filters.'}</p>
            </div>
        `;
        return;
    }
    
    // Sort by most recent first
    filtered.sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt));
    
    const groupLabels = {
        'vip': { label: 'VIP', color: '#f59e0b' },
        'b2b': { label: 'B2B', color: '#2563eb' },
        'regular': { label: 'Regular', color: '#64748b' },
        'new': { label: 'New', color: '#10b981' }
    };
    
    container.innerHTML = filtered.map(customer => {
        const groupInfo = groupLabels[customer.group] || groupLabels.regular;
        const salesCount = customer.salesHistory?.length || 0;
        
        return `
            <div class="crm-customer-card" onclick="showCRMCustomerDetail('${customer.id}')">
                <div class="crm-customer-header">
                    <div class="crm-customer-avatar">
                        ${customer.name.charAt(0).toUpperCase()}
                    </div>
                    <div class="crm-customer-info">
                        <div class="crm-customer-name">${escapeHtml(customer.name)}</div>
                        <div class="crm-customer-company">${customer.company ? escapeHtml(customer.company) : ''}</div>
                    </div>
                    <div class="crm-customer-badges">
                        <span class="crm-badge" style="background: ${groupInfo.color};">${groupInfo.label}</span>
                        ${customer.status === 'inactive' ? '<span class="crm-badge inactive">Inactive</span>' : ''}
                    </div>
                </div>
                <div class="crm-customer-contact">
                    ${customer.phone ? `<span><i class="fas fa-phone"></i> ${escapeHtml(customer.phone)}</span>` : ''}
                    ${customer.email ? `<span><i class="fas fa-envelope"></i> ${escapeHtml(customer.email)}</span>` : ''}
                </div>
                <div class="crm-customer-stats">
                    <div class="crm-stat">
                        <span class="crm-stat-value">${formatRM(customer.totalSpent || 0)}</span>
                        <span class="crm-stat-label">Total Spent</span>
                    </div>
                    <div class="crm-stat">
                        <span class="crm-stat-value">${salesCount}</span>
                        <span class="crm-stat-label">Orders</span>
                    </div>
                    <div class="crm-stat ${customer.outstandingBalance > 0 ? 'outstanding' : ''}">
                        <span class="crm-stat-value">${formatRM(customer.outstandingBalance || 0)}</span>
                        <span class="crm-stat-label">Outstanding</span>
                    </div>
                </div>
                <div class="crm-customer-actions">
                    <button class="btn-outline btn-sm" onclick="event.stopPropagation(); showCRMCustomerModal('${customer.id}')" title="Edit">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-outline btn-sm" onclick="event.stopPropagation(); addCRMInteraction('${customer.id}')" title="Add Note">
                        <i class="fas fa-sticky-note"></i>
                    </button>
                    <button class="btn-outline btn-sm danger" onclick="event.stopPropagation(); deleteCRMCustomer('${customer.id}')" title="Delete">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

function searchCRMCustomers(term) {
    renderCRMCustomers();
}

function filterCRMCustomers() {
    renderCRMCustomers();
}

// ==================== CRM CUSTOMER DETAIL ====================
function showCRMCustomerDetail(customerId) {
    const customer = crmCustomers.find(c => c.id === customerId);
    if (!customer) return;
    
    const modal = document.getElementById('crmCustomerDetailModal');
    const title = document.getElementById('crmDetailTitle');
    const content = document.getElementById('crmCustomerDetailContent');
    
    title.textContent = customer.name;
    
    const groupLabels = {
        'vip': { label: 'VIP', color: '#f59e0b' },
        'b2b': { label: 'B2B', color: '#2563eb' },
        'regular': { label: 'Regular', color: '#64748b' },
        'new': { label: 'New', color: '#10b981' }
    };
    
    const groupInfo = groupLabels[customer.group] || groupLabels.regular;
    
    const creditTermsLabels = {
        'cod': 'COD',
        '7days': 'Net 7 Days',
        '14days': 'Net 14 Days',
        '30days': 'Net 30 Days',
        '60days': 'Net 60 Days',
        '90days': 'Net 90 Days'
    };
    
    // Get customer's quotations
    let customerQuotations = [];
    if (typeof quotations !== 'undefined' && Array.isArray(quotations)) {
        customerQuotations = quotations.filter(q => q.customerId === customerId);
    }
    
    // Get customer's projects
    let customerProjects = [];
    if (typeof projects !== 'undefined' && Array.isArray(projects)) {
        customerProjects = projects.filter(p => p.customerId === customerId);
    }
    
    // Calculate project totals
    const projectTotalValue = customerProjects.reduce((sum, p) => sum + (p.totalAmount || 0), 0);
    const projectTotalPaid = customerProjects.reduce((sum, p) => sum + (p.amountPaid || 0), 0);
    
    content.innerHTML = `
        <div class="crm-detail-header">
            <div class="crm-detail-avatar">${customer.name.charAt(0).toUpperCase()}</div>
            <div class="crm-detail-info">
                <h3>${escapeHtml(customer.name)}</h3>
                ${customer.company ? `<p class="crm-detail-company">${escapeHtml(customer.company)}</p>` : ''}
                <div class="crm-detail-badges">
                    <span class="crm-badge" style="background: ${groupInfo.color};">${groupInfo.label}</span>
                    <span class="crm-badge ${customer.status === 'active' ? 'active' : 'inactive'}">${customer.status === 'active' ? 'Active' : 'Inactive'}</span>
                </div>
            </div>
            <div class="crm-detail-actions">
                <button class="btn-outline" onclick="showCRMCustomerModal('${customer.id}'); closeModal('crmCustomerDetailModal');">
                    <i class="fas fa-edit"></i> Edit
                </button>
            </div>
        </div>
        
        <div class="crm-detail-sections">
            <div class="crm-detail-section">
                <h4><i class="fas fa-address-card"></i> Contact Information</h4>
                <div class="crm-detail-grid">
                    <div class="crm-detail-item">
                        <label>Phone</label>
                        <span>${customer.phone || '-'}</span>
                    </div>
                    <div class="crm-detail-item">
                        <label>Email</label>
                        <span>${customer.email || '-'}</span>
                    </div>
                    <div class="crm-detail-item full-width">
                        <label>Address</label>
                        <span>${customer.address || '-'}</span>
                    </div>
                </div>
            </div>
            
            <div class="crm-detail-section">
                <h4><i class="fas fa-credit-card"></i> Credit Information</h4>
                <div class="crm-detail-grid">
                    <div class="crm-detail-item">
                        <label>Credit Terms</label>
                        <span>${creditTermsLabels[customer.creditTerms] || 'COD'}</span>
                    </div>
                    <div class="crm-detail-item">
                        <label>Credit Limit</label>
                        <span>${formatRM(customer.creditLimit || 0)}</span>
                    </div>
                    <div class="crm-detail-item">
                        <label>Outstanding Balance</label>
                        <span class="${customer.outstandingBalance > 0 ? 'text-warning' : ''}">${formatRM(customer.outstandingBalance || 0)}</span>
                    </div>
                    <div class="crm-detail-item">
                        <label>Total Spent</label>
                        <span class="text-success">${formatRM(customer.totalSpent || 0)}</span>
                    </div>
                </div>
                ${customer.outstandingBalance > 0 ? `
                    <button class="btn-primary btn-sm" onclick="showReceivePaymentModal('${customer.id}')" style="margin-top: 15px;">
                        <i class="fas fa-hand-holding-usd"></i> Receive Payment
                    </button>
                ` : ''}
            </div>
            
            <!-- Quotations Section -->
            <div class="crm-detail-section">
                <h4><i class="fas fa-file-invoice"></i> Quotations (${customerQuotations.length})</h4>
                <div class="crm-quotations-list">
                    ${customerQuotations.length > 0 ? 
                        customerQuotations.slice(0, 5).map(q => {
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
                            let displayStatus = q.status;
                            if (q.status === 'sent' && q.validUntil && new Date(q.validUntil) < new Date()) {
                                displayStatus = 'expired';
                            }
                            return `
                                <div class="crm-quotation-item" onclick="closeModal('crmCustomerDetailModal'); viewQuotationDetail('${q.id}');">
                                    <div class="crm-quotation-info">
                                        <span class="crm-quotation-no">${escapeHtml(q.quotationNo)}</span>
                                        <span class="crm-quotation-subject">${escapeHtml(q.subject || 'No subject')}</span>
                                        <span class="crm-quotation-date">${new Date(q.date).toLocaleDateString()}</span>
                                    </div>
                                    <div class="crm-quotation-right">
                                        <span class="crm-quotation-amount">RM ${(q.totalAmount || 0).toFixed(2)}</span>
                                        <span class="status-badge-sm" style="background: ${statusColors[displayStatus]}20; color: ${statusColors[displayStatus]};">${statusLabels[displayStatus]}</span>
                                    </div>
                                </div>
                            `;
                        }).join('') 
                        : '<p class="text-muted">No quotations for this customer</p>'
                    }
                    ${customerQuotations.length > 5 ? `<p class="text-muted" style="font-size: 12px; margin-top: 10px;">+ ${customerQuotations.length - 5} more quotations</p>` : ''}
                </div>
                <button class="btn-outline btn-sm" onclick="closeModal('crmCustomerDetailModal'); showQuotationModal(); setTimeout(() => document.getElementById('quotationCustomer').value = '${customer.id}', 100);" style="margin-top: 10px;">
                    <i class="fas fa-plus"></i> New Quotation
                </button>
            </div>
            
            <!-- Projects Section -->
            <div class="crm-detail-section">
                <h4><i class="fas fa-project-diagram"></i> Projects (${customerProjects.length})</h4>
                ${customerProjects.length > 0 ? `
                    <div class="crm-projects-summary">
                        <div class="summary-item">
                            <span class="label">Total Value:</span>
                            <span class="value">RM ${projectTotalValue.toFixed(2)}</span>
                        </div>
                        <div class="summary-item">
                            <span class="label">Paid:</span>
                            <span class="value text-success">RM ${projectTotalPaid.toFixed(2)}</span>
                        </div>
                        <div class="summary-item">
                            <span class="label">Outstanding:</span>
                            <span class="value text-warning">RM ${(projectTotalValue - projectTotalPaid).toFixed(2)}</span>
                        </div>
                    </div>
                ` : ''}
                <div class="crm-projects-list">
                    ${customerProjects.length > 0 ? 
                        customerProjects.slice(0, 5).map(p => {
                            const statusColors = {
                                'quotation': '#94a3b8',
                                'confirmed': '#2563eb',
                                'in-progress': '#f59e0b',
                                'completed': '#10b981',
                                'cancelled': '#ef4444'
                            };
                            const statusLabels = {
                                'quotation': 'Quotation',
                                'confirmed': 'Confirmed',
                                'in-progress': 'In Progress',
                                'completed': 'Completed',
                                'cancelled': 'Cancelled'
                            };
                            const progress = p.totalAmount > 0 ? ((p.amountPaid || 0) / p.totalAmount * 100) : 0;
                            return `
                                <div class="crm-project-item" onclick="closeModal('crmCustomerDetailModal'); viewProjectDetail('${p.id}');">
                                    <div class="crm-project-info">
                                        <span class="crm-project-no">${escapeHtml(p.projectNo || 'N/A')}</span>
                                        <span class="crm-project-name">${escapeHtml(p.name)}</span>
                                        <div class="crm-project-progress">
                                            <div class="mini-progress-bar">
                                                <div class="mini-progress-fill" style="width: ${progress}%;"></div>
                                            </div>
                                            <span class="progress-text">${progress.toFixed(0)}%</span>
                                        </div>
                                    </div>
                                    <div class="crm-project-right">
                                        <span class="crm-project-amount">RM ${(p.totalAmount || 0).toFixed(2)}</span>
                                        <span class="status-badge-sm" style="background: ${statusColors[p.status]}20; color: ${statusColors[p.status]};">${statusLabels[p.status]}</span>
                                    </div>
                                </div>
                            `;
                        }).join('') 
                        : '<p class="text-muted">No projects for this customer</p>'
                    }
                    ${customerProjects.length > 5 ? `<p class="text-muted" style="font-size: 12px; margin-top: 10px;">+ ${customerProjects.length - 5} more projects</p>` : ''}
                </div>
            </div>
            
            <div class="crm-detail-section">
                <h4><i class="fas fa-history"></i> POS Sales History (${customer.salesHistory?.length || 0})</h4>
                <div class="crm-sales-list">
                    ${customer.salesHistory && customer.salesHistory.length > 0 ? 
                        customer.salesHistory.slice(0, 5).map(sale => `
                            <div class="crm-sale-item">
                                <div class="crm-sale-info">
                                    <span class="crm-sale-ref">${sale.reference || 'N/A'}</span>
                                    <span class="crm-sale-date">${new Date(sale.date).toLocaleDateString()}</span>
                                </div>
                                <span class="crm-sale-amount">RM ${sale.amount.toFixed(2)}</span>
                            </div>
                        `).join('') 
                        : '<p class="text-muted">No POS sales history yet</p>'
                    }
                </div>
            </div>
            
            <div class="crm-detail-section">
                <h4><i class="fas fa-sticky-note"></i> Notes & Interactions</h4>
                <div class="crm-interactions-list">
                    ${customer.interactions && customer.interactions.length > 0 ? 
                        customer.interactions.slice(0, 10).map(note => `
                            <div class="crm-interaction-item ${note.type === 'payment' ? 'payment-note' : ''}">
                                <div class="crm-interaction-date">
                                    ${new Date(note.date).toLocaleDateString()}
                                    ${note.type === 'payment' ? '<i class="fas fa-check-circle" style="color: #10b981; margin-left: 5px;"></i>' : ''}
                                </div>
                                <div class="crm-interaction-text">${escapeHtml(note.text || note.note || '')}</div>
                            </div>
                        `).join('') 
                        : '<p class="text-muted">No notes yet</p>'
                    }
                    ${customer.notes ? `<div class="crm-customer-note"><strong>Internal Notes:</strong> ${escapeHtml(customer.notes)}</div>` : ''}
                </div>
                <button class="btn-outline btn-sm" onclick="addCRMInteraction('${customer.id}')" style="margin-top: 10px;">
                    <i class="fas fa-plus"></i> Add Note
                </button>
            </div>
        </div>
    `;
    
    modal.style.display = '';
    modal.classList.add('show');
}

// ==================== CRM INTERACTIONS ====================
function addCRMInteraction(customerId) {
    const note = prompt('Add a note for this customer:');
    if (note === null || note.trim() === '') return;
    
    const customer = crmCustomers.find(c => c.id === customerId);
    if (!customer) return;
    
    if (!customer.interactions) {
        customer.interactions = [];
    }
    
    customer.interactions.unshift({
        id: generateUUID(),
        date: new Date().toISOString(),
        text: note.trim(),
        type: 'note'
    });
    
    customer.updatedAt = new Date().toISOString();
    saveCRMCustomers();
    renderCRMCustomers();
    showToast('Note added!', 'success');
}

// ==================== CRM CUSTOMER DELETE ====================
function deleteCRMCustomer(customerId) {
    const customer = crmCustomers.find(c => c.id === customerId);
    if (!customer) return;
    
    if (!confirm(`Delete customer "${customer.name}"? This action cannot be undone.`)) {
        return;
    }
    
    crmCustomers = crmCustomers.filter(c => c.id !== customerId);
    saveCRMCustomers();
    renderCRMCustomers();
    showToast('Customer deleted!', 'success');
}

// ==================== LINK SALES TO CRM ====================
function linkSaleToCRMCustomer(customerId, saleData) {
    const customer = crmCustomers.find(c => c.id === customerId);
    if (!customer) return;
    
    if (!customer.salesHistory) {
        customer.salesHistory = [];
    }
    
    customer.salesHistory.unshift({
        id: saleData.id,
        reference: saleData.receiptNo,
        date: saleData.date,
        amount: saleData.total,
        items: saleData.items?.length || 0
    });
    
    customer.totalSpent = (customer.totalSpent || 0) + saleData.total;
    customer.updatedAt = new Date().toISOString();
    
    // Update group to VIP if they've spent enough
    if (customer.totalSpent >= 1000 && customer.group !== 'vip' && customer.group !== 'b2b') {
        customer.group = 'vip';
    }
    
    saveCRMCustomers();
}

// ==================== CRM EXPORT ====================
function exportCustomersCRM() {
    if (crmCustomers.length === 0) {
        showToast('No customers to export', 'warning');
        return;
    }
    
    const headers = ['Name', 'Group', 'Phone', 'Email', 'Company', 'Address', 'Credit Terms', 'Credit Limit', 'Outstanding', 'Total Spent', 'Status'];
    const rows = crmCustomers.map(c => [
        c.name,
        c.group,
        c.phone || '',
        c.email || '',
        c.company || '',
        c.address || '',
        c.creditTerms || 'cod',
        c.creditLimit || 0,
        c.outstandingBalance || 0,
        c.totalSpent || 0,
        c.status || 'active'
    ]);
    
    const csvContent = [headers, ...rows]
        .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
        .join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `crm_customers_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    
    showToast('Customers exported!', 'success');
}

// ==================== GET CRM CUSTOMERS FOR POS ====================
function getCRMCustomersForSelect() {
    return crmCustomers
        .filter(c => c.status === 'active')
        .map(c => ({
            id: c.id,
            name: c.name,
            company: c.company,
            group: c.group
        }));
}

// ==================== CREDIT MANAGEMENT ====================
function updateCRMCustomerCredit(customerId, amount) {
    const customer = crmCustomers.find(c => c.id === customerId);
    if (!customer) return;
    
    // Add to outstanding balance
    customer.outstandingBalance = (parseFloat(customer.outstandingBalance) || 0) + amount;
    customer.updatedAt = new Date().toISOString();
    
    saveCRMCustomers();
    updateCRMStats();
    renderCRMCustomers();
}

function receiveCRMPayment(customerId, amount, reference = '') {
    const customer = crmCustomers.find(c => c.id === customerId);
    if (!customer) return false;
    
    const outstanding = parseFloat(customer.outstandingBalance) || 0;
    const paymentAmount = parseFloat(amount) || 0;
    
    if (paymentAmount <= 0) {
        showToast('Invalid payment amount!', 'error');
        return false;
    }
    
    // Reduce outstanding balance
    customer.outstandingBalance = Math.max(0, outstanding - paymentAmount);
    customer.updatedAt = new Date().toISOString();
    
    // Record interaction
    customer.interactions = customer.interactions || [];
    customer.interactions.unshift({
        date: new Date().toISOString(),
        type: 'payment',
        note: `Payment received: RM ${paymentAmount.toFixed(2)}${reference ? ' (Ref: ' + reference + ')' : ''}`
    });
    
    saveCRMCustomers();
    updateCRMStats();
    
    // Record as income in accounting
    const incomeTransaction = {
        id: generateUUID(),
        date: new Date().toISOString().split('T')[0],
        amount: paymentAmount,
        category: 'Accounts Receivable Payment',
        description: `Credit payment from ${customer.name}${reference ? ' - Ref: ' + reference : ''}`,
        type: 'income',
        reference: reference || `CRM-${customerId}`,
        timestamp: new Date().toISOString()
    };
    // Push to businessData.transactions for proper sync with All Transactions
    if (typeof businessData !== 'undefined' && businessData.transactions) {
        businessData.transactions.push(incomeTransaction);
    } else if (typeof transactions !== 'undefined') {
        transactions.push(incomeTransaction);
    }
    if (typeof saveData === 'function') saveData();
    
    showToast(`Payment of RM ${paymentAmount.toFixed(2)} recorded!`, 'success');
    return true;
}

// Show receive payment modal
function showReceivePaymentModal(customerId) {
    const customer = crmCustomers.find(c => c.id === customerId);
    if (!customer) return;
    
    const outstanding = parseFloat(customer.outstandingBalance) || 0;
    
    if (outstanding <= 0) {
        showToast('No outstanding balance for this customer!', 'info');
        return;
    }
    
    const modal = document.createElement('div');
    modal.className = 'modal show';
    modal.id = 'receivePaymentModal';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 400px;">
            <div class="modal-header">
                <h3 class="modal-title"><i class="fas fa-hand-holding-usd"></i> Receive Payment</h3>
                <button class="modal-close" onclick="closeModal('receivePaymentModal')">&times;</button>
            </div>
            <div class="modal-body">
                <div class="credit-info-box" style="margin-bottom: 20px;">
                    <div class="credit-info-header">
                        <i class="fas fa-user"></i> ${escapeHtml(customer.name)}
                    </div>
                    <div class="credit-info-details">
                        <div class="credit-info-row">
                            <span>Outstanding Balance:</span>
                            <span style="color: #ef4444; font-weight: 600;">RM ${outstanding.toFixed(2)}</span>
                        </div>
                    </div>
                </div>
                <form onsubmit="submitReceivePayment(event, '${customerId}')">
                    <div class="form-group">
                        <label class="form-label">Payment Amount (RM) *</label>
                        <input type="number" id="receivePaymentAmount" class="form-control" 
                               step="0.01" min="0.01" max="${outstanding}" value="${outstanding.toFixed(2)}" required>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Reference (Optional)</label>
                        <input type="text" id="receivePaymentRef" class="form-control" 
                               placeholder="Check number, transfer ref, etc.">
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn-secondary" onclick="closeModal('receivePaymentModal')">Cancel</button>
                        <button type="submit" class="btn-primary">
                            <i class="fas fa-check"></i> Record Payment
                        </button>
                    </div>
                </form>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

function submitReceivePayment(event, customerId) {
    event.preventDefault();
    
    const amount = document.getElementById('receivePaymentAmount').value;
    const reference = document.getElementById('receivePaymentRef').value.trim();
    
    if (receiveCRMPayment(customerId, amount, reference)) {
        closeModal('receivePaymentModal');
        // Refresh detail view if open
        showCRMCustomerDetail(customerId);
    }
}

// ==================== WINDOW EXPORTS ====================
window.initializeCRM = initializeCRM;
window.loadCRMCustomers = loadCRMCustomers;
window.saveCRMCustomers = saveCRMCustomers;
window.renderCRMCustomers = renderCRMCustomers;
window.updateCRMStats = updateCRMStats;
window.showCRMCustomerModal = showCRMCustomerModal;
window.saveCRMCustomer = saveCRMCustomer;
window.deleteCRMCustomer = deleteCRMCustomer;
window.searchCRMCustomers = searchCRMCustomers;
window.filterCRMCustomers = filterCRMCustomers;
window.showCRMCustomerDetail = showCRMCustomerDetail;
window.getCRMCustomersForSelect = getCRMCustomersForSelect;
window.updateCRMCustomerCredit = updateCRMCustomerCredit;
window.receiveCRMPayment = receiveCRMPayment;
window.showReceivePaymentModal = showReceivePaymentModal;
window.submitReceivePayment = submitReceivePayment;
window.exportCRMCustomers = exportCRMCustomers;
