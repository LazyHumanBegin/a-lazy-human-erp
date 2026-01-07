/**
 * EZCubic Smart Accounting - Quotation Module
 * Create quotations linked to CRM, convert to Projects when accepted
 */

const QUOTATIONS_KEY = 'ezcubic_quotations';
let quotations = [];

// ==================== INITIALIZATION ====================
function initializeQuotations() {
    loadQuotations();
    renderQuotations();
    updateQuotationStats();
}

function loadQuotations() {
    // PRIORITY 1: Load from tenant storage directly (most reliable)
    const user = window.currentUser;
    if (user && user.tenantId) {
        const tenantKey = 'ezcubic_tenant_' + user.tenantId;
        const tenantData = JSON.parse(localStorage.getItem(tenantKey) || '{}');
        if (Array.isArray(tenantData.quotations) && tenantData.quotations.length > 0) {
            quotations = tenantData.quotations;
            window.quotations = quotations;
            console.log('✅ Quotations loaded from tenant:', quotations.length);
            return;
        }
    }
    
    // PRIORITY 2: Check window.quotations
    if (Array.isArray(window.quotations) && window.quotations.length > 0) {
        quotations = window.quotations;
        console.log('✅ Quotations loaded from window:', quotations.length);
    } else {
        // PRIORITY 3: Load from localStorage
        const stored = localStorage.getItem(QUOTATIONS_KEY);
        if (stored) {
            try {
                const parsed = JSON.parse(stored);
                quotations = Array.isArray(parsed) ? parsed : [];
                console.log('✅ Quotations loaded from localStorage key:', quotations.length);
            } catch (e) {
                console.error('Error parsing quotations:', e);
                quotations = [];
            }
        } else {
            quotations = [];
        }
    }
    
    // Update window reference
    window.quotations = quotations;
}

function saveQuotations() {
    // Sync local variable with window.quotations (in case it was modified externally)
    if (window.quotations && Array.isArray(window.quotations)) {
        quotations = window.quotations;
    }
    
    localStorage.setItem(QUOTATIONS_KEY, JSON.stringify(quotations));
    window.quotations = quotations;
    
    // DIRECT tenant save
    const user = window.currentUser;
    if (user && user.tenantId) {
        const tenantKey = 'ezcubic_tenant_' + user.tenantId;
        let tenantData = JSON.parse(localStorage.getItem(tenantKey) || '{}');
        tenantData.quotations = quotations;
        tenantData.updatedAt = new Date().toISOString();
        localStorage.setItem(tenantKey, JSON.stringify(tenantData));
        console.log('✅ Quotations saved directly to tenant:', quotations.length);
        
        // Trigger cloud sync for cross-device synchronization
        if (typeof window.fullCloudSync === 'function') {
            setTimeout(() => {
                window.fullCloudSync().catch(e => console.warn('Cloud sync failed:', e));
            }, 500);
        }
    }
    
    // Note: Don't call saveToUserTenant - it would overwrite with stale data
}

// ==================== GENERATE QUOTATION NUMBER ====================
function generateQuotationNo() {
    // Use customizable document numbering if available
    if (typeof generateDocumentNumber === 'function') {
        return generateDocumentNumber('quotation');
    }
    
    // Fallback to original logic
    const now = new Date();
    const year = now.getFullYear().toString().slice(-2);
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    
    // Ensure quotations is an array
    if (!Array.isArray(quotations)) {
        console.warn('quotations was not an array, resetting');
        quotations = [];
    }
    
    // Get existing quotations this month
    const prefix = `QT${year}${month}`;
    const existingNums = quotations
        .filter(q => q.quotationNo && q.quotationNo.startsWith(prefix))
        .map(q => parseInt(q.quotationNo.replace(prefix, '')) || 0);
    
    const nextNum = existingNums.length > 0 ? Math.max(...existingNums) + 1 : 1;
    return `${prefix}${nextNum.toString().padStart(4, '0')}`;
}

// ==================== QUOTATION STATS ====================
function updateQuotationStats() {
    const totalEl = document.getElementById('quotationsTotalCount');
    const pendingEl = document.getElementById('quotationsPending');
    const acceptedEl = document.getElementById('quotationsAccepted');
    const valueEl = document.getElementById('quotationsTotalValue');
    
    // Ensure quotations is an array
    if (!Array.isArray(quotations)) {
        quotations = [];
    }
    
    const pending = quotations.filter(q => q.status === 'sent' || q.status === 'draft');
    const accepted = quotations.filter(q => q.status === 'accepted');
    const totalValue = quotations
        .filter(q => q.status !== 'rejected' && q.status !== 'expired')
        .reduce((sum, q) => sum + (q.totalAmount || 0), 0);
    
    if (totalEl) totalEl.textContent = quotations.length;
    if (pendingEl) pendingEl.textContent = pending.length;
    if (acceptedEl) acceptedEl.textContent = accepted.length;
    if (valueEl) valueEl.textContent = formatRM(totalValue);
}

// ==================== QUOTATION MODAL ====================
function showQuotationModal(quotationId = null) {
    const modal = document.getElementById('quotationModal');
    const title = document.getElementById('quotationModalTitle');
    const form = document.getElementById('quotationForm');
    
    // Reset form
    form.reset();
    document.getElementById('quotationId').value = '';
    document.getElementById('quotationItemsContainer').innerHTML = '';
    
    // Load CRM customers
    loadQuotationCustomers();
    
    // Load salesperson dropdown
    loadQuotationSalespersons();
    
    if (quotationId) {
        const quotation = quotations.find(q => q.id === quotationId);
        if (quotation) {
            title.textContent = 'Edit Quotation';
            document.getElementById('quotationId').value = quotation.id;
            document.getElementById('quotationNo').value = quotation.quotationNo;
            document.getElementById('quotationCustomer').value = quotation.customerId || '';
            document.getElementById('quotationSalesperson').value = quotation.salesperson || '';
            document.getElementById('quotationDate').value = quotation.date || '';
            document.getElementById('quotationValidUntil').value = quotation.validUntil || '';
            document.getElementById('quotationSubject').value = quotation.subject || '';
            document.getElementById('quotationNotes').value = quotation.notes || '';
            document.getElementById('quotationTerms').value = quotation.terms || '';
            document.getElementById('quotationDiscount').value = quotation.discount || 0;
            document.getElementById('quotationTax').value = quotation.taxRate || 0;
            
            // Load items
            renderQuotationItemInputs(quotation.items || []);
            
            // Update customer info display
            updateQuotationCustomerInfo(quotation.customerId);
        }
    } else {
        title.textContent = 'New Quotation';
        document.getElementById('quotationNo').value = generateQuotationNo();
        document.getElementById('quotationDate').value = new Date().toISOString().split('T')[0];
        
        // Set default valid for 30 days
        const validDate = new Date();
        validDate.setDate(validDate.getDate() + 30);
        document.getElementById('quotationValidUntil').value = validDate.toISOString().split('T')[0];
        
        // Default terms
        document.getElementById('quotationTerms').value = 
            '1. Payment terms: 50% deposit upon confirmation, 50% upon completion.\n' +
            '2. Quotation valid for 30 days from date of issue.\n' +
            '3. Prices are subject to change without prior notice after validity period.';
        
        // Add default empty item
        renderQuotationItemInputs([{ description: '', quantity: 1, unitPrice: 0 }]);
    }
    
    calculateQuotationTotals();
    modal.style.display = '';
    modal.classList.add('show');
}

function loadQuotationCustomers() {
    const select = document.getElementById('quotationCustomer');
    if (!select) return;
    
    // Get CRM customers
    let crmList = [];
    if (typeof crmCustomers !== 'undefined' && Array.isArray(crmCustomers)) {
        crmList = crmCustomers.filter(c => c.status === 'active');
    }
    
    select.innerHTML = `<option value="">-- Select Customer --</option>`;
    
    if (crmList.length > 0) {
        select.innerHTML += crmList.map(c => `
            <option value="${c.id}">${escapeHtml(c.name)}${c.company ? ` (${escapeHtml(c.company)})` : ''}</option>
        `).join('');
    }
    
    // Add option to create new customer
    select.innerHTML += `<option value="__new__">+ Add New Customer</option>`;
}

function loadQuotationSalespersons() {
    const select = document.getElementById('quotationSalesperson');
    if (!select) return;
    
    select.innerHTML = `<option value="">-- Select Salesperson --</option>`;
    
    // Get current user and their tenant
    const currentUser = typeof getCurrentUser === 'function' ? getCurrentUser() : null;
    const currentTenantId = currentUser?.tenantId || null;
    
    // Collect all salespersons for this tenant
    let salespersons = [];
    
    // 1. Add current logged-in user
    if (currentUser && currentUser.name) {
        salespersons.push({ name: currentUser.name, role: currentUser.role });
    }
    
    // 2. Add users from same tenant (manager, staff)
    if (currentTenantId && typeof getUsers === 'function') {
        const allUsers = getUsers();
        const tenantUsers = allUsers.filter(u => 
            u.tenantId === currentTenantId && 
            u.status === 'active' &&
            u.id !== currentUser?.id &&
            (u.role === 'manager' || u.role === 'staff' || u.role === 'business_admin')
        );
        tenantUsers.forEach(u => {
            salespersons.push({ name: u.name, role: u.role });
        });
    }
    
    // 3. Add employees from payroll - check multiple sources
    const employeesList = window.employees || JSON.parse(localStorage.getItem('ezcubic_employees') || '[]');
    if (Array.isArray(employeesList) && employeesList.length > 0) {
        employeesList.filter(e => e.status === 'active').forEach(e => {
            if (!salespersons.some(s => s.name.toLowerCase() === e.name.toLowerCase())) {
                salespersons.push({ name: e.name, role: e.position || 'Employee' });
            }
        });
    }
    
    if (salespersons.length > 0) {
        select.innerHTML += salespersons.map(s => `
            <option value="${escapeHtml(s.name)}">${escapeHtml(s.name)}${s.role ? ` (${escapeHtml(s.role)})` : ''}</option>
        `).join('');
    }
}

function onQuotationCustomerChange() {
    const customerId = document.getElementById('quotationCustomer').value;
    
    if (customerId === '__new__') {
        // Close quotation modal first
        closeModal('quotationModal');
        
        // Open CRM modal to add new customer
        if (typeof showCRMCustomerModal === 'function') {
            // Set flag to return to quotation after saving
            window.returnToQuotationAfterCustomer = true;
            showCRMCustomerModal();
        }
        return;
    }
    
    updateQuotationCustomerInfo(customerId);
}

function updateQuotationCustomerInfo(customerId) {
    const infoDiv = document.getElementById('quotationCustomerInfo');
    if (!infoDiv) return;
    
    if (!customerId || typeof crmCustomers === 'undefined') {
        infoDiv.innerHTML = '';
        infoDiv.style.display = 'none';
        return;
    }
    
    const customer = crmCustomers.find(c => c.id === customerId);
    if (!customer) {
        infoDiv.innerHTML = '';
        infoDiv.style.display = 'none';
        return;
    }
    
    infoDiv.style.display = 'block';
    infoDiv.innerHTML = `
        <div class="customer-info-card">
            <div class="customer-info-row">
                <i class="fas fa-building"></i>
                <span>${escapeHtml(customer.company || 'N/A')}</span>
            </div>
            <div class="customer-info-row">
                <i class="fas fa-phone"></i>
                <span>${escapeHtml(customer.phone || 'N/A')}</span>
            </div>
            <div class="customer-info-row">
                <i class="fas fa-envelope"></i>
                <span>${escapeHtml(customer.email || 'N/A')}</span>
            </div>
            ${customer.address ? `
            <div class="customer-info-row">
                <i class="fas fa-map-marker-alt"></i>
                <span>${escapeHtml(customer.address)}</span>
            </div>
            ` : ''}
        </div>
    `;
}

// ==================== QUOTATION ITEMS ====================
function renderQuotationItemInputs(items = []) {
    const container = document.getElementById('quotationItemsContainer');
    if (!container) return;
    
    // Get products from inventory
    const products = window.products || JSON.parse(localStorage.getItem('ezcubic_products') || '[]');
    const productOptions = products.map(p => 
        `<option value="${p.id}" data-price="${p.sellingPrice || p.price || 0}">${escapeHtml(p.name)} - RM ${parseFloat(p.sellingPrice || p.price || 0).toFixed(2)}</option>`
    ).join('');
    
    container.innerHTML = items.map((item, index) => `
        <div class="quotation-item-row" data-index="${index}">
            <div class="item-main" style="display: flex; flex-direction: column; gap: 5px;">
                <select class="form-control item-product-select" onchange="selectQuotationProduct(this, ${index})" style="padding: 8px;">
                    <option value="">-- Select Product (optional) --</option>
                    ${productOptions}
                </select>
                <input type="text" class="form-control item-description" 
                       value="${escapeHtml(item.description || '')}" 
                       placeholder="Item description (or type custom)" 
                       oninput="calculateQuotationTotals()">
            </div>
            <div class="item-qty">
                <input type="number" class="form-control item-quantity" 
                       value="${item.quantity || 1}" 
                       placeholder="Qty" min="1" step="1"
                       oninput="calculateQuotationTotals()">
            </div>
            <div class="item-price">
                <input type="number" class="form-control item-unit-price" 
                       value="${item.unitPrice || ''}" 
                       placeholder="Unit Price (RM)" min="0" step="0.01"
                       oninput="calculateQuotationTotals()">
            </div>
            <div class="item-total">
                <span class="item-line-total">${formatRM((item.quantity || 1) * (item.unitPrice || 0))}</span>
            </div>
            <div class="item-actions">
                <button type="button" class="btn-icon danger" onclick="removeQuotationItem(${index})" title="Remove item">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
    `).join('');
    
    calculateQuotationTotals();
}

function addQuotationItem() {
    const container = document.getElementById('quotationItemsContainer');
    const rows = container.querySelectorAll('.quotation-item-row');
    const index = rows.length;
    
    // Get products from inventory
    const products = window.products || JSON.parse(localStorage.getItem('ezcubic_products') || '[]');
    const productOptions = products.map(p => 
        `<option value="${p.id}" data-price="${p.sellingPrice || p.price || 0}">${escapeHtml(p.name)} - RM ${parseFloat(p.sellingPrice || p.price || 0).toFixed(2)}</option>`
    ).join('');
    
    const newRow = document.createElement('div');
    newRow.className = 'quotation-item-row';
    newRow.dataset.index = index;
    newRow.innerHTML = `
        <div class="item-main" style="display: flex; flex-direction: column; gap: 5px;">
            <select class="form-control item-product-select" onchange="selectQuotationProduct(this, ${index})" style="padding: 8px;">
                <option value="">-- Select Product (optional) --</option>
                ${productOptions}
            </select>
            <input type="text" class="form-control item-description" 
                   value="" placeholder="Item description (or type custom)" 
                   oninput="calculateQuotationTotals()">
        </div>
        <div class="item-qty">
            <input type="number" class="form-control item-quantity" 
                   value="1" placeholder="Qty" min="1" step="1"
                   oninput="calculateQuotationTotals()">
        </div>
        <div class="item-price">
            <input type="number" class="form-control item-unit-price" 
                   value="" placeholder="Unit Price (RM)" min="0" step="0.01"
                   oninput="calculateQuotationTotals()">
        </div>
        <div class="item-total">
            <span class="item-line-total">RM 0.00</span>
        </div>
        <div class="item-actions">
            <button type="button" class="btn-icon danger" onclick="removeQuotationItem(${index})" title="Remove item">
                <i class="fas fa-trash"></i>
            </button>
        </div>
    `;
    container.appendChild(newRow);
}

// Select product from dropdown and auto-fill details
function selectQuotationProduct(selectEl, index) {
    const row = selectEl.closest('.quotation-item-row');
    const selectedOption = selectEl.options[selectEl.selectedIndex];
    
    if (selectEl.value) {
        const products = window.products || JSON.parse(localStorage.getItem('ezcubic_products') || '[]');
        const product = products.find(p => p.id == selectEl.value);
        
        if (product) {
            row.querySelector('.item-description').value = product.name;
            row.querySelector('.item-unit-price').value = product.sellingPrice || product.price || 0;
            calculateQuotationTotals();
        }
    }
}

function removeQuotationItem(index) {
    const container = document.getElementById('quotationItemsContainer');
    const rows = container.querySelectorAll('.quotation-item-row');
    
    if (rows.length > 1) {
        rows[index]?.remove();
        // Re-index rows
        container.querySelectorAll('.quotation-item-row').forEach((row, i) => {
            row.dataset.index = i;
            const btn = row.querySelector('.btn-icon.danger');
            if (btn) btn.setAttribute('onclick', `removeQuotationItem(${i})`);
        });
        calculateQuotationTotals();
    } else {
        showToast('At least one item is required', 'warning');
    }
}

function calculateQuotationTotals() {
    const container = document.getElementById('quotationItemsContainer');
    if (!container) return;
    
    const rows = container.querySelectorAll('.quotation-item-row');
    let subtotal = 0;
    
    rows.forEach(row => {
        const qty = parseFloat(row.querySelector('.item-quantity')?.value) || 0;
        const price = parseFloat(row.querySelector('.item-unit-price')?.value) || 0;
        const lineTotal = qty * price;
        
        const lineTotalEl = row.querySelector('.item-line-total');
        if (lineTotalEl) lineTotalEl.textContent = formatRM(lineTotal);
        
        subtotal += lineTotal;
    });
    
    const discount = parseFloat(document.getElementById('quotationDiscount')?.value) || 0;
    const taxRate = parseFloat(document.getElementById('quotationTax')?.value) || 0;
    
    const discountAmount = subtotal * (discount / 100);
    const afterDiscount = subtotal - discountAmount;
    const taxAmount = afterDiscount * (taxRate / 100);
    const grandTotal = afterDiscount + taxAmount;
    
    // Update display
    const subtotalEl = document.getElementById('quotationSubtotal');
    const discountEl = document.getElementById('quotationDiscountAmount');
    const taxEl = document.getElementById('quotationTaxAmount');
    const totalEl = document.getElementById('quotationGrandTotal');
    
    if (subtotalEl) subtotalEl.textContent = formatRM(subtotal);
    if (discountEl) discountEl.textContent = `- ${formatRM(discountAmount)}`;
    if (taxEl) taxEl.textContent = `+ ${formatRM(taxAmount)}`;
    if (totalEl) totalEl.textContent = formatRM(grandTotal);
}

// ==================== SAVE QUOTATION ====================
function saveQuotation(status = 'draft') {
    const form = document.getElementById('quotationForm');
    const quotationId = document.getElementById('quotationId').value;
    const customerId = document.getElementById('quotationCustomer').value;
    
    if (!customerId || customerId === '__new__') {
        showToast('Please select a customer', 'error');
        return;
    }
    
    // Gather items
    const container = document.getElementById('quotationItemsContainer');
    const rows = container.querySelectorAll('.quotation-item-row');
    const items = [];
    let hasItems = false;
    
    rows.forEach(row => {
        const description = row.querySelector('.item-description')?.value?.trim() || '';
        const quantity = parseFloat(row.querySelector('.item-quantity')?.value) || 0;
        const unitPrice = parseFloat(row.querySelector('.item-unit-price')?.value) || 0;
        
        if (description && quantity > 0 && unitPrice > 0) {
            hasItems = true;
            items.push({
                description,
                quantity,
                unitPrice,
                lineTotal: quantity * unitPrice
            });
        }
    });
    
    if (!hasItems) {
        showToast('Please add at least one item with description, quantity, and price', 'error');
        return;
    }
    
    // Calculate totals
    const subtotal = items.reduce((sum, item) => sum + item.lineTotal, 0);
    const discount = parseFloat(document.getElementById('quotationDiscount')?.value) || 0;
    const taxRate = parseFloat(document.getElementById('quotationTax')?.value) || 0;
    const discountAmount = subtotal * (discount / 100);
    const afterDiscount = subtotal - discountAmount;
    const taxAmount = afterDiscount * (taxRate / 100);
    const totalAmount = afterDiscount + taxAmount;
    
    // Get customer info
    let customerName = '';
    let customerCompany = '';
    if (typeof crmCustomers !== 'undefined') {
        const customer = crmCustomers.find(c => c.id === customerId);
        if (customer) {
            customerName = customer.name;
            customerCompany = customer.company || '';
        }
    }
    
    const quotationData = {
        id: quotationId || 'QT' + Date.now(),
        quotationNo: document.getElementById('quotationNo').value,
        customerId: customerId,
        customerName: customerName,
        customerCompany: customerCompany,
        salesperson: document.getElementById('quotationSalesperson')?.value || '',
        date: document.getElementById('quotationDate').value,
        validUntil: document.getElementById('quotationValidUntil').value,
        subject: document.getElementById('quotationSubject').value?.trim() || '',
        items: items,
        subtotal: subtotal,
        discount: discount,
        discountAmount: discountAmount,
        taxRate: taxRate,
        taxAmount: taxAmount,
        totalAmount: totalAmount,
        notes: document.getElementById('quotationNotes').value?.trim() || '',
        terms: document.getElementById('quotationTerms').value?.trim() || '',
        status: status,
        createdAt: quotationId ? (quotations.find(q => q.id === quotationId)?.createdAt || new Date().toISOString()) : new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };
    
    if (quotationId) {
        // Update existing
        const index = quotations.findIndex(q => q.id === quotationId);
        if (index !== -1) {
            quotations[index] = quotationData;
        }
    } else {
        // Add new
        quotations.push(quotationData);
    }
    
    saveQuotations();
    renderQuotations();
    updateQuotationStats();
    closeModal('quotationModal');
    showToast(`Quotation ${status === 'sent' ? 'saved and marked as sent' : 'saved as draft'}!`, 'success');
}

function saveAndSendQuotation() {
    saveQuotation('sent');
}

// ==================== RENDER QUOTATIONS ====================
function renderQuotations() {
    const container = document.getElementById('quotationsGrid');
    if (!container) return;
    
    // Sync local variable with window.quotations (in case it was modified externally)
    if (window.quotations && Array.isArray(window.quotations)) {
        quotations = window.quotations;
    }
    
    // Apply filters
    const searchTerm = document.getElementById('quotationSearch')?.value?.toLowerCase() || '';
    const statusFilter = document.getElementById('quotationStatusFilter')?.value || '';
    
    let filtered = [...quotations];
    
    if (searchTerm) {
        filtered = filtered.filter(q => 
            q.quotationNo?.toLowerCase().includes(searchTerm) ||
            q.customerName?.toLowerCase().includes(searchTerm) ||
            q.customerCompany?.toLowerCase().includes(searchTerm) ||
            q.subject?.toLowerCase().includes(searchTerm)
        );
    }
    
    if (statusFilter) {
        filtered = filtered.filter(q => q.status === statusFilter);
    }
    
    // Sort by date (newest first)
    filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    if (filtered.length === 0) {
        container.innerHTML = `
            <div class="quotations-empty">
                <i class="fas fa-file-invoice"></i>
                <p>${searchTerm || statusFilter ? 'No quotations match your filters.' : 'No quotations yet. Create your first quotation!'}</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = filtered.map(q => {
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
        
        // Check if expired
        let displayStatus = q.status;
        if (q.status === 'sent' && q.validUntil && new Date(q.validUntil) < new Date()) {
            displayStatus = 'expired';
        }
        
        return `
            <div class="quotation-card" data-quotation-id="${q.id}" style="cursor: pointer;">
                <div class="quotation-card-header">
                    <div class="quotation-number">${escapeHtml(q.quotationNo)}</div>
                    <span class="status-badge" style="background: ${statusColors[displayStatus]}20; color: ${statusColors[displayStatus]};">
                        ${statusLabels[displayStatus]}
                    </span>
                </div>
                <div class="quotation-card-customer">
                    <i class="fas fa-user"></i>
                    <span>${escapeHtml(q.customerName)}${q.customerCompany ? ` - ${escapeHtml(q.customerCompany)}` : ''}</span>
                </div>
                ${q.salesperson ? `<div class="quotation-card-salesperson" style="font-size: 12px; color: #64748b; margin: 4px 0;"><i class="fas fa-user-tie"></i> ${escapeHtml(q.salesperson)}</div>` : ''}
                ${q.subject ? `<div class="quotation-card-subject">${escapeHtml(q.subject)}</div>` : ''}
                <div class="quotation-card-details">
                    <div class="quotation-card-date">
                        <i class="fas fa-calendar"></i> ${formatDate(q.date)}
                    </div>
                    <div class="quotation-card-amount">
                        <strong>RM ${q.totalAmount?.toFixed(2) || '0.00'}</strong>
                    </div>
                </div>
                ${q.validUntil ? `
                <div class="quotation-card-valid">
                    Valid until: ${formatDate(q.validUntil)}
                </div>
                ` : ''}
            </div>
        `;
    }).join('');
    
    // Add click event listeners to cards
    container.querySelectorAll('.quotation-card[data-quotation-id]').forEach(card => {
        card.addEventListener('click', function() {
            const id = this.getAttribute('data-quotation-id');
            console.log('Quotation card clicked:', id);
            viewQuotationDetail(id);
        });
    });
}

function searchQuotations(term) {
    renderQuotations();
}

function filterQuotationsByStatus() {
    renderQuotations();
}

// ==================== QUOTATION DETAIL VIEW ====================
function viewQuotationDetail(quotationId) {
    console.log('viewQuotationDetail called with:', quotationId);
    
    // Reload quotations to ensure fresh data
    loadQuotations();
    
    // Use window.quotations to ensure we have access
    const quotationsList = window.quotations || quotations || [];
    const quotation = quotationsList.find(q => q.id === quotationId);
    
    if (!quotation) {
        console.error('Quotation not found:', quotationId);
        showToast('Quotation not found - it may have been deleted', 'error');
        // Re-render to remove stale cards
        renderQuotations();
        return;
    }
    
    const modal = document.getElementById('quotationDetailModal');
    const content = document.getElementById('quotationDetailContent');
    
    if (!modal || !content) {
        console.error('Modal elements not found');
        showToast('Error opening quotation details', 'error');
        return;
    }
    
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
                ${quotation.status !== 'accepted' ? `
                    <button class="btn-secondary" onclick="closeModal('quotationDetailModal'); setTimeout(() => showQuotationModal('${quotation.id}'), 150);">
                        <i class="fas fa-edit"></i> Edit
                    </button>
                ` : `
                    <button class="btn-outline" onclick="closeModal('quotationDetailModal'); if(typeof showSection==='function') showSection('projects'); setTimeout(()=>viewProjectDetail('${quotation.projectId}'),300);" style="background: #10b981; color: white; border: none;">
                        <i class="fas fa-project-diagram"></i> View Project
                    </button>
                `}
                ${quotation.status === 'draft' ? `
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

// ==================== QUOTATION ACTIONS ====================
function markQuotationSent(quotationId) {
    const quotation = quotations.find(q => q.id === quotationId);
    if (!quotation) return;
    
    quotation.status = 'sent';
    quotation.sentAt = new Date().toISOString();
    quotation.updatedAt = new Date().toISOString();
    
    saveQuotations();
    renderQuotations();
    updateQuotationStats();
    viewQuotationDetail(quotationId);
    showToast('Quotation marked as sent!', 'success');
}

function acceptQuotation(quotationId) {
    const quotation = quotations.find(q => q.id === quotationId);
    if (!quotation) return;
    
    if (!confirm('Accept this quotation and create a new project?\n\nThis will convert the quotation into an active project for tracking and payments.')) {
        return;
    }
    
    // Create project from quotation
    const project = {
        id: 'PROJ' + Date.now(),
        projectNo: quotation.quotationNo.replace('QT', 'PRJ'),
        name: quotation.subject || `Project for ${quotation.customerName}`,
        description: generateProjectDescription(quotation),
        customerId: quotation.customerId,
        customerName: quotation.customerName,
        totalAmount: quotation.totalAmount,
        amountPaid: 0,
        startDate: new Date().toISOString().split('T')[0],
        endDate: '',
        status: 'confirmed',
        milestones: generateDefaultMilestones(quotation.totalAmount),
        paymentHistory: [],
        quotationId: quotationId,
        quotationNo: quotation.quotationNo,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };
    
    // Add to projects
    if (typeof projects !== 'undefined') {
        projects.push(project);
        if (typeof saveProjects === 'function') saveProjects();
        if (typeof renderProjects === 'function') renderProjects();
        if (typeof updateProjectStats === 'function') updateProjectStats();
    }
    
    // Update quotation status
    quotation.status = 'accepted';
    quotation.acceptedAt = new Date().toISOString();
    quotation.updatedAt = new Date().toISOString();
    quotation.projectId = project.id;
    
    saveQuotations();
    renderQuotations();
    updateQuotationStats();
    closeModal('quotationDetailModal');
    
    showToast('Quotation accepted! Project created successfully.', 'success');
    
    // Navigate to projects section
    setTimeout(() => {
        if (typeof showSection === 'function') {
            showSection('projects');
            // Open the new project detail
            if (typeof viewProjectDetail === 'function') {
                viewProjectDetail(project.id);
            }
        }
    }, 500);
}

function generateProjectDescription(quotation) {
    let desc = '';
    if (quotation.subject) {
        desc += quotation.subject + '\n\n';
    }
    desc += 'Items:\n';
    (quotation.items || []).forEach((item, i) => {
        desc += `${i + 1}. ${item.description} (Qty: ${item.quantity}, RM ${item.lineTotal?.toFixed(2)})\n`;
    });
    desc += `\nTotal: RM ${quotation.totalAmount?.toFixed(2)}`;
    return desc;
}

function generateDefaultMilestones(totalAmount) {
    return [
        {
            name: 'Deposit (50%)',
            percentage: 50,
            amount: totalAmount * 0.5,
            dueDate: '',
            status: 'pending',
            paidAmount: 0
        },
        {
            name: 'Final Payment (50%)',
            percentage: 50,
            amount: totalAmount * 0.5,
            dueDate: '',
            status: 'pending',
            paidAmount: 0
        }
    ];
}

function rejectQuotation(quotationId) {
    const quotation = quotations.find(q => q.id === quotationId);
    if (!quotation) return;
    
    const reason = prompt('Reason for rejection (optional):');
    
    quotation.status = 'rejected';
    quotation.rejectedAt = new Date().toISOString();
    quotation.rejectionReason = reason || '';
    quotation.updatedAt = new Date().toISOString();
    
    saveQuotations();
    renderQuotations();
    updateQuotationStats();
    viewQuotationDetail(quotationId);
    showToast('Quotation marked as rejected.', 'info');
}

function duplicateQuotation(quotationId) {
    const quotation = quotations.find(q => q.id === quotationId);
    if (!quotation) return;
    
    // Create duplicate with new ID and dates
    const duplicate = {
        ...JSON.parse(JSON.stringify(quotation)),
        id: 'QT' + Date.now(),
        quotationNo: generateQuotationNo(),
        date: new Date().toISOString().split('T')[0],
        status: 'draft',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };
    
    // Set new validity period
    const validDate = new Date();
    validDate.setDate(validDate.getDate() + 30);
    duplicate.validUntil = validDate.toISOString().split('T')[0];
    
    // Remove links to old data
    delete duplicate.sentAt;
    delete duplicate.acceptedAt;
    delete duplicate.rejectedAt;
    delete duplicate.rejectionReason;
    delete duplicate.projectId;
    
    quotations.push(duplicate);
    saveQuotations();
    renderQuotations();
    updateQuotationStats();
    closeModal('quotationDetailModal');
    
    // Open the duplicate for editing
    showQuotationModal(duplicate.id);
    showToast('Quotation duplicated! You can now edit and send.', 'success');
}

function deleteQuotation(quotationId) {
    const quotation = quotations.find(q => q.id === quotationId);
    if (!quotation) return;
    
    if (!confirm(`Delete quotation ${quotation.quotationNo}?\n\nThis cannot be undone.`)) {
        return;
    }
    
    const index = quotations.findIndex(q => q.id === quotationId);
    if (index !== -1) {
        quotations.splice(index, 1);
        saveQuotations();
        renderQuotations();
        updateQuotationStats();
        closeModal('quotationDetailModal');
        showToast('Quotation deleted!', 'success');
    }
}

// ==================== PRINT QUOTATION ====================
function printQuotation(quotationId) {
    const quotation = quotations.find(q => q.id === quotationId);
    if (!quotation) return;
    
    // Get customer details
    let customerInfo = { name: quotation.customerName, company: quotation.customerCompany };
    if (typeof crmCustomers !== 'undefined' && quotation.customerId) {
        const customer = crmCustomers.find(c => c.id === quotation.customerId);
        if (customer) {
            customerInfo = customer;
        }
    }
    
    // Get business info
    let businessName = 'Your Business';
    let businessAddress = '';
    let businessPhone = '';
    let businessEmail = '';
    if (typeof businessData !== 'undefined' && businessData.settings) {
        businessName = businessData.settings.businessName || businessName;
        businessAddress = businessData.settings.businessAddress || '';
        businessPhone = businessData.settings.businessPhone || '';
        businessEmail = businessData.settings.businessEmail || '';
    }
    
    const printContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Quotation ${quotation.quotationNo}</title>
            <style>
                * { margin: 0; padding: 0; box-sizing: border-box; }
                body { font-family: 'Segoe UI', Arial, sans-serif; padding: 40px; color: #333; }
                .header { display: flex; justify-content: space-between; margin-bottom: 40px; }
                .company-info h1 { font-size: 24px; color: #2563eb; margin-bottom: 5px; }
                .company-info p { font-size: 12px; color: #666; }
                .quotation-title { text-align: right; }
                .quotation-title h2 { font-size: 28px; color: #333; margin-bottom: 5px; }
                .quotation-title .number { font-size: 14px; color: #666; }
                .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 30px; margin-bottom: 30px; }
                .info-section h3 { font-size: 12px; text-transform: uppercase; color: #666; margin-bottom: 10px; border-bottom: 1px solid #eee; padding-bottom: 5px; }
                .info-section p { font-size: 13px; margin-bottom: 3px; }
                .items-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
                .items-table th { background: #f8fafc; padding: 12px; text-align: left; font-size: 12px; text-transform: uppercase; color: #666; border-bottom: 2px solid #e2e8f0; }
                .items-table td { padding: 12px; border-bottom: 1px solid #e2e8f0; font-size: 13px; }
                .items-table .qty { text-align: center; }
                .items-table .amount { text-align: right; }
                .totals { margin-left: auto; width: 300px; }
                .totals .row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee; font-size: 13px; }
                .totals .row.grand { font-weight: bold; font-size: 16px; color: #2563eb; border-bottom: 2px solid #2563eb; }
                .terms { margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; }
                .terms h3 { font-size: 12px; text-transform: uppercase; color: #666; margin-bottom: 10px; }
                .terms p { font-size: 12px; color: #666; white-space: pre-line; }
                .footer { margin-top: 50px; text-align: center; font-size: 11px; color: #999; }
                @media print { body { padding: 20px; } }
            </style>
        </head>
        <body>
            <div class="header">
                <div class="company-info">
                    <h1>${escapeHtml(businessName)}</h1>
                    ${businessAddress ? `<p>${escapeHtml(businessAddress)}</p>` : ''}
                    ${businessPhone ? `<p>Tel: ${escapeHtml(businessPhone)}</p>` : ''}
                    ${businessEmail ? `<p>Email: ${escapeHtml(businessEmail)}</p>` : ''}
                </div>
                <div class="quotation-title">
                    <h2>QUOTATION</h2>
                    <div class="number">${escapeHtml(quotation.quotationNo)}</div>
                </div>
            </div>
            
            <div class="info-grid">
                <div class="info-section">
                    <h3>Bill To</h3>
                    <p><strong>${escapeHtml(customerInfo.name)}</strong></p>
                    ${customerInfo.company ? `<p>${escapeHtml(customerInfo.company)}</p>` : ''}
                    ${customerInfo.address ? `<p>${escapeHtml(customerInfo.address)}</p>` : ''}
                    ${customerInfo.phone ? `<p>Tel: ${escapeHtml(customerInfo.phone)}</p>` : ''}
                    ${customerInfo.email ? `<p>Email: ${escapeHtml(customerInfo.email)}</p>` : ''}
                </div>
                <div class="info-section">
                    <h3>Quotation Details</h3>
                    <p><strong>Date:</strong> ${formatDate(quotation.date)}</p>
                    <p><strong>Valid Until:</strong> ${formatDate(quotation.validUntil)}</p>
                    ${quotation.subject ? `<p><strong>Subject:</strong> ${escapeHtml(quotation.subject)}</p>` : ''}
                </div>
            </div>
            
            <table class="items-table">
                <thead>
                    <tr>
                        <th style="width: 50%;">Description</th>
                        <th class="qty" style="width: 15%;">Qty</th>
                        <th class="amount" style="width: 17.5%;">Unit Price</th>
                        <th class="amount" style="width: 17.5%;">Amount</th>
                    </tr>
                </thead>
                <tbody>
                    ${(quotation.items || []).map(item => `
                        <tr>
                            <td>${escapeHtml(item.description)}</td>
                            <td class="qty">${item.quantity}</td>
                            <td class="amount">RM ${item.unitPrice?.toFixed(2)}</td>
                            <td class="amount">RM ${item.lineTotal?.toFixed(2)}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
            
            <div class="totals">
                <div class="row">
                    <span>Subtotal:</span>
                    <span>RM ${quotation.subtotal?.toFixed(2)}</span>
                </div>
                ${quotation.discount > 0 ? `
                <div class="row">
                    <span>Discount (${quotation.discount}%):</span>
                    <span>- RM ${quotation.discountAmount?.toFixed(2)}</span>
                </div>
                ` : ''}
                ${quotation.taxRate > 0 ? `
                <div class="row">
                    <span>SST/Tax (${quotation.taxRate}%):</span>
                    <span>+ RM ${quotation.taxAmount?.toFixed(2)}</span>
                </div>
                ` : ''}
                <div class="row grand">
                    <span>Grand Total:</span>
                    <span>RM ${quotation.totalAmount?.toFixed(2)}</span>
                </div>
            </div>
            
            ${quotation.notes ? `
            <div class="terms">
                <h3>Notes</h3>
                <p>${escapeHtml(quotation.notes)}</p>
            </div>
            ` : ''}
            
            ${quotation.terms ? `
            <div class="terms">
                <h3>Terms & Conditions</h3>
                <p>${escapeHtml(quotation.terms)}</p>
            </div>
            ` : ''}
            
            <div class="footer">
                <p>This is a computer-generated document. No signature is required.</p>
                <p>Thank you for your business!</p>
            </div>
            
            <script>window.onload = function() { window.print(); }</script>
        </body>
        </html>
    `;
    
    const printWindow = window.open('', '_blank');
    printWindow.document.write(printContent);
    printWindow.document.close();
}

// ==================== HELPER FUNCTIONS ====================
function formatDate(dateStr) {
    if (!dateStr) return 'N/A';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' });
}

// ==================== WHATSAPP QUOTATION ====================
function shareQuotationWhatsApp(quotationId) {
    const quotation = quotations.find(q => q.id === quotationId);
    if (!quotation) {
        showNotification('Quotation not found', 'error');
        return;
    }
    
    const settings = JSON.parse(localStorage.getItem('companySettings') || '{}');
    const businessName = settings.businessName || window.businessData?.settings?.businessName || 'A Lazy Human';
    
    let message = `*${businessName}*\n`;
    message += `━━━━━━━━━━━━━━━━\n`;
    message += `📋 *Quotation: ${quotation.quotationNo}*\n`;
    message += `📅 Date: ${quotation.date}\n`;
    message += `⏰ Valid Until: ${quotation.validUntil || 'N/A'}\n`;
    message += `👤 Customer: ${quotation.customerName}\n\n`;
    
    message += `*Items:*\n`;
    if (quotation.items && quotation.items.length > 0) {
        quotation.items.forEach(item => {
            message += `• ${item.description}\n`;
            message += `   Qty: ${item.quantity} × RM ${parseFloat(item.unitPrice).toFixed(2)} = RM ${parseFloat(item.total).toFixed(2)}\n`;
        });
    }
    
    message += `\n━━━━━━━━━━━━━━━━\n`;
    message += `Subtotal: RM ${parseFloat(quotation.subtotal || 0).toFixed(2)}\n`;
    if (quotation.discount > 0) {
        message += `Discount: -RM ${parseFloat(quotation.discount).toFixed(2)}\n`;
    }
    if (quotation.tax > 0) {
        message += `Tax: RM ${parseFloat(quotation.tax).toFixed(2)}\n`;
    }
    message += `*TOTAL: RM ${parseFloat(quotation.total).toFixed(2)}*\n`;
    message += `━━━━━━━━━━━━━━━━\n\n`;
    
    if (quotation.notes) {
        message += `📝 Notes: ${quotation.notes}\n\n`;
    }
    
    message += `Please reply to confirm or if you have any questions. Thank you! 🙏`;
    
    const encoded = encodeURIComponent(message);
    window.open(`https://wa.me/?text=${encoded}`, '_blank');
    
    showNotification('Opening WhatsApp...', 'success');
}

// ==================== EMAIL QUOTATION ====================
function emailQuotation(quotationId) {
    const quotation = quotations.find(q => q.id === quotationId);
    if (!quotation) {
        showNotification('Error', 'Quotation not found', 'error');
        return;
    }

    // Get customer email
    let customerEmail = '';
    let customerName = quotation.customerName || 'Valued Customer';
    
    if (typeof crmCustomers !== 'undefined' && quotation.customerId) {
        const customer = crmCustomers.find(c => c.id === quotation.customerId);
        if (customer) {
            customerEmail = customer.email || '';
            customerName = customer.name || customerName;
        }
    }

    // Get company settings
    const settings = JSON.parse(localStorage.getItem('companySettings') || '{}');
    const companyName = settings.businessName || 'Our Company';

    // Build items list
    let itemsList = '';
    if (quotation.items && quotation.items.length > 0) {
        itemsList = quotation.items.map((item, i) => 
            `${i + 1}. ${item.description} - Qty: ${item.quantity} x RM ${parseFloat(item.unitPrice).toFixed(2)} = RM ${parseFloat(item.total).toFixed(2)}`
        ).join('%0D%0A');
    }

    // Build email subject
    const subject = encodeURIComponent(`Quotation ${quotation.quotationNo} from ${companyName}`);

    // Build email body
    const body = encodeURIComponent(
`Dear ${customerName},

Please find below the details of your quotation:

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
QUOTATION: ${quotation.quotationNo}
Date: ${formatDate(quotation.date)}
Valid Until: ${formatDate(quotation.validUntil)}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${quotation.subject ? `Subject: ${quotation.subject}\n\n` : ''}ITEMS:
${itemsList}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Subtotal: RM ${parseFloat(quotation.subtotal || 0).toFixed(2)}
${quotation.discountPercent > 0 ? `Discount (${quotation.discountPercent}%): - RM ${parseFloat(quotation.discountAmount || 0).toFixed(2)}\n` : ''}${quotation.taxPercent > 0 ? `Tax/SST (${quotation.taxPercent}%): + RM ${parseFloat(quotation.taxAmount || 0).toFixed(2)}\n` : ''}GRAND TOTAL: RM ${parseFloat(quotation.grandTotal || 0).toFixed(2)}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${quotation.notes ? `Note: ${quotation.notes}\n\n` : ''}${quotation.terms ? `Terms & Conditions:\n${quotation.terms}\n\n` : ''}
Please let us know if you have any questions or would like to proceed with this quotation.

Thank you for your business!

Best regards,
${companyName}
`);

    // Open mailto link
    const mailtoLink = `mailto:${customerEmail}?subject=${subject}&body=${body}`;
    window.location.href = mailtoLink;

    showNotification('Email Opened', 'Your email app should open with the quotation details. Please send the email manually.', 'success');
}

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', function() {
    initializeQuotations();
});

// Export functions to window for onclick handlers
window.viewQuotationDetail = viewQuotationDetail;
window.showQuotationModal = showQuotationModal;
// approveQuotation is alias for acceptQuotation
window.approveQuotation = acceptQuotation;
window.acceptQuotation = acceptQuotation;
window.initializeQuotations = initializeQuotations;
window.renderQuotations = renderQuotations;
window.saveQuotations = saveQuotations;
window.updateQuotationStats = updateQuotationStats;
window.deleteQuotation = deleteQuotation;
window.markQuotationSent = markQuotationSent;
window.rejectQuotation = rejectQuotation;
window.duplicateQuotation = duplicateQuotation;
window.shareQuotationWhatsApp = shareQuotationWhatsApp;
window.emailQuotation = emailQuotation;
// Note: generateQuotationPDF is defined in js/addons.js, not here
// window.generateQuotationPDF = generateQuotationPDF;
