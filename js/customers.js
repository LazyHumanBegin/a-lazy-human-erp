/**
 * EZCubic Phase 2 - Customer Management Module
 * Customer CRUD, loyalty points, purchase history
 */

// ==================== CUSTOMER INITIALIZATION ====================
function initializeCustomers() {
    loadCustomers();
    updateCustomerStats();
}

function loadCustomers() {
    // PRIORITY 1: Load from tenant storage directly (most reliable)
    const user = window.currentUser;
    if (user && user.tenantId) {
        const tenantKey = 'ezcubic_tenant_' + user.tenantId;
        const tenantData = JSON.parse(localStorage.getItem(tenantKey) || '{}');
        if (Array.isArray(tenantData.customers) && tenantData.customers.length > 0) {
            customers = tenantData.customers;
            window.customers = customers;
            console.log('✅ Customers loaded from tenant:', customers.length);
            renderCustomers();
            return;
        }
    }
    
    // PRIORITY 2: Check window.customers (set by tenant data loading)
    if (Array.isArray(window.customers) && window.customers.length > 0) {
        customers = window.customers;
        console.log('✅ Customers loaded from window:', customers.length);
    } else {
        // PRIORITY 3: Fall back to localStorage key
        const stored = localStorage.getItem(CUSTOMERS_KEY);
        if (stored) {
            try {
                const parsed = JSON.parse(stored);
                if (Array.isArray(parsed)) {
                    customers = parsed;
                    console.log('✅ Customers loaded from localStorage key:', customers.length);
                }
            } catch (e) {
                console.error('Error parsing customers from localStorage:', e);
                customers = [];
            }
        }
    }
    // Sync back to window for other modules
    window.customers = customers;
    renderCustomers();
}

function saveCustomers() {
    // Save to localStorage
    localStorage.setItem(CUSTOMERS_KEY, JSON.stringify(customers));
    
    // Sync to window for other modules
    window.customers = customers;
    
    // Update UI stats
    updateCustomerStats();
    
    // DIRECT tenant save - don't rely on saveToUserTenant
    const user = window.currentUser;
    if (user && user.tenantId) {
        const tenantKey = 'ezcubic_tenant_' + user.tenantId;
        let tenantData = JSON.parse(localStorage.getItem(tenantKey) || '{}');
        tenantData.customers = customers;
        tenantData.updatedAt = new Date().toISOString();
        localStorage.setItem(tenantKey, JSON.stringify(tenantData));
        console.log('✅ Customers saved directly to tenant:', customers.length);
        
        // Trigger cloud sync for cross-device synchronization
        if (typeof window.fullCloudSync === 'function') {
            setTimeout(() => {
                window.fullCloudSync().catch(e => console.warn('Cloud sync failed:', e));
            }, 500);
        }
    }
    
    // Note: Don't call saveToUserTenant - it would overwrite with stale data
}

// ==================== CUSTOMER MODAL ====================
// Alias for showCustomerDetail - shows customer in view/edit mode
function showCustomerDetail(customerId) {
    showCustomerModal(customerId);
}

function showCustomerModal(customerId = null) {
    // Check customer limit for new customers
    if (!customerId && typeof canAdd === 'function' && !canAdd('customers')) {
        return; // Limit reached, modal shown by canAdd()
    }
    
    const modal = document.getElementById('customerModal');
    const title = document.getElementById('customerModalTitle');
    const form = document.getElementById('customerForm');
    
    if (!modal || !form) {
        console.error('Customer modal or form not found');
        return;
    }
    
    form.reset();
    document.getElementById('customerId').value = '';
    
    if (customerId) {
        // Edit mode
        const customer = customers.find(c => c.id === customerId);
        if (customer) {
            title.textContent = 'Edit Customer';
            document.getElementById('customerId').value = customer.id;
            document.getElementById('customerName').value = customer.name;
            document.getElementById('customerPhone').value = customer.phone || '';
            document.getElementById('customerEmail').value = customer.email || '';
            document.getElementById('customerAddress').value = customer.address || '';
            document.getElementById('customerNotes').value = customer.notes || '';
        }
    } else {
        title.textContent = 'Add Customer';
    }
    
    // Clear any stale inline styles and show modal
    modal.style.display = '';
    modal.classList.add('show');
    
    // Focus on first input
    setTimeout(() => {
        document.getElementById('customerName')?.focus();
    }, 100);
}

function saveCustomer(event) {
    event.preventDefault();
    
    const id = document.getElementById('customerId').value;
    
    // Check customer limit for new customers only
    if (!id && typeof canAdd === 'function' && !canAdd('customers')) {
        return; // Limit reached, modal shown by canAdd()
    }
    
    const customerData = {
        name: document.getElementById('customerName').value.trim(),
        phone: document.getElementById('customerPhone').value.trim(),
        email: document.getElementById('customerEmail').value.trim(),
        address: document.getElementById('customerAddress').value.trim(),
        notes: document.getElementById('customerNotes').value.trim(),
        updatedAt: new Date().toISOString()
    };
    
    if (id) {
        // Update existing customer
        const index = customers.findIndex(c => c.id === id);
        if (index !== -1) {
            customers[index] = { ...customers[index], ...customerData };
        }
        showToast('Customer updated successfully!', 'success');
    } else {
        // Create new customer
        const newCustomer = {
            id: generateUUID(),
            ...customerData,
            loyaltyPoints: 0,
            totalPurchases: 0,
            lastPurchase: null,
            createdAt: new Date().toISOString()
        };
        customers.push(newCustomer);
        showToast('Customer added successfully!', 'success');
    }
    
    saveCustomers();
    renderCustomers();
    loadPOSCustomers(); // Update POS dropdown
    closeModal('customerModal');
}

function deleteCustomer(customerId) {
    const customer = customers.find(c => c.id === customerId);
    if (!customer) return;
    
    if (confirm(`Are you sure you want to delete "${customer.name}"?\n\nThis will not delete their purchase history.`)) {
        customers = customers.filter(c => c.id !== customerId);
        saveCustomers();
        renderCustomers();
        loadPOSCustomers();
        showToast('Customer deleted successfully!', 'info');
    }
}

// ==================== CUSTOMER RENDERING ====================
function renderCustomers() {
    const tbody = document.getElementById('customersTableBody');
    if (!tbody) return;
    
    const searchTerm = document.getElementById('customerSearch')?.value?.toLowerCase() || '';
    
    let filtered = customers.filter(c => {
        if (!searchTerm) return true;
        return c.name.toLowerCase().includes(searchTerm) ||
               (c.phone && c.phone.includes(searchTerm)) ||
               (c.email && c.email.toLowerCase().includes(searchTerm));
    });
    
    // Sort by name
    filtered.sort((a, b) => a.name.localeCompare(b.name));
    
    if (filtered.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" style="text-align: center; padding: 40px; color: #94a3b8;">
                    <i class="fas fa-users" style="font-size: 48px; margin-bottom: 15px; opacity: 0.5;"></i>
                    <p>${customers.length === 0 ? 'No customers yet. Add your first customer!' : 'No customers found matching your search'}</p>
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = filtered.map(customer => {
        const vipBadge = (customer.totalPurchases || 0) >= 1000 ? 
            '<span class="vip-badge"><i class="fas fa-crown"></i> VIP</span>' : '';
        
        return `
            <tr>
                <td>
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <div class="customer-avatar">${getInitials(customer.name)}</div>
                        <div>
                            <div style="font-weight: 500; display: flex; align-items: center; gap: 5px;">
                                ${escapeHtml(customer.name)} ${vipBadge}
                            </div>
                            ${customer.email ? `<div style="font-size: 12px; color: #94a3b8;">${customer.email}</div>` : ''}
                        </div>
                    </div>
                </td>
                <td>
                    ${customer.phone ? `<div><i class="fas fa-phone" style="width: 16px; color: #64748b;"></i> ${customer.phone}</div>` : '-'}
                </td>
                <td>
                    <strong>${formatMYR(customer.totalPurchases || 0)}</strong>
                </td>
                <td>
                    <span class="loyalty-points">
                        <i class="fas fa-star" style="color: #f59e0b;"></i> ${customer.loyaltyPoints || 0}
                    </span>
                </td>
                <td>
                    ${customer.lastPurchase ? formatRelativeDate(customer.lastPurchase) : 'Never'}
                </td>
                <td>
                    <div style="display: flex; gap: 5px;">
                        <button class="btn-outline btn-sm" onclick="viewCustomerHistory('${customer.id}')" title="View History">
                            <i class="fas fa-history"></i>
                        </button>
                        <button class="btn-outline btn-sm" onclick="showCustomerModal('${customer.id}')" title="Edit">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn-outline btn-sm danger" onclick="deleteCustomer('${customer.id}')" title="Delete">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

function searchCustomers(term) {
    renderCustomers();
}

// ==================== CUSTOMER STATS ====================
function updateCustomerStats() {
    const totalCustomersEl = document.getElementById('totalCustomers');
    const totalSalesEl = document.getElementById('totalCustomerSales');
    const totalPointsEl = document.getElementById('totalLoyaltyPoints');
    const vipCountEl = document.getElementById('vipCustomers');
    
    const totalCustomers = customers.length;
    const totalSales = customers.reduce((sum, c) => sum + (c.totalPurchases || 0), 0);
    const totalPoints = customers.reduce((sum, c) => sum + (c.loyaltyPoints || 0), 0);
    const vipCount = customers.filter(c => (c.totalPurchases || 0) >= 1000).length;
    
    if (totalCustomersEl) totalCustomersEl.textContent = totalCustomers;
    if (totalSalesEl) totalSalesEl.textContent = formatMYR(totalSales);
    if (totalPointsEl) totalPointsEl.textContent = totalPoints.toLocaleString();
    if (vipCountEl) vipCountEl.textContent = vipCount;
}

// ==================== CUSTOMER HISTORY ====================
function viewCustomerHistory(customerId) {
    const customer = customers.find(c => c.id === customerId);
    if (!customer) return;
    
    // Get customer's sales from sales array
    const customerSales = sales.filter(s => s.customerId === customerId);
    
    let historyHtml = '';
    if (customerSales.length === 0) {
        historyHtml = `
            <div style="text-align: center; padding: 30px; color: #94a3b8;">
                <i class="fas fa-shopping-bag" style="font-size: 36px; margin-bottom: 10px; opacity: 0.5;"></i>
                <p>No purchase history yet</p>
            </div>
        `;
    } else {
        historyHtml = `
            <div class="customer-history-list">
                ${customerSales.slice(0, 20).map(sale => `
                    <div class="history-item">
                        <div class="history-date">${new Date(sale.date).toLocaleDateString('en-MY')}</div>
                        <div class="history-receipt">${sale.receiptNo}</div>
                        <div class="history-items">${sale.items.length} items</div>
                        <div class="history-total">${formatMYR(sale.total)}</div>
                    </div>
                `).join('')}
            </div>
            ${customerSales.length > 20 ? `<p style="text-align: center; color: #94a3b8; margin-top: 10px;">Showing latest 20 of ${customerSales.length} purchases</p>` : ''}
        `;
    }
    
    // Create/update modal
    let modal = document.getElementById('customerHistoryModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'customerHistoryModal';
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 550px;">
                <div class="modal-header">
                    <h3 class="modal-title" id="customerHistoryTitle">Customer History</h3>
                    <button class="modal-close" onclick="closeModal('customerHistoryModal')">&times;</button>
                </div>
                <div id="customerHistoryContent"></div>
            </div>
        `;
        document.body.appendChild(modal);
    }
    
    document.getElementById('customerHistoryTitle').textContent = `${customer.name} - Purchase History`;
    document.getElementById('customerHistoryContent').innerHTML = `
        <div class="customer-summary" style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin-bottom: 20px; padding: 15px; background: var(--bg-secondary); border-radius: 8px;">
            <div style="text-align: center;">
                <div style="font-size: 24px; font-weight: bold; color: var(--primary);">${formatMYR(customer.totalPurchases || 0)}</div>
                <div style="font-size: 12px; color: #94a3b8;">Total Spent</div>
            </div>
            <div style="text-align: center;">
                <div style="font-size: 24px; font-weight: bold; color: #f59e0b;">${customer.loyaltyPoints || 0}</div>
                <div style="font-size: 12px; color: #94a3b8;">Loyalty Points</div>
            </div>
            <div style="text-align: center;">
                <div style="font-size: 24px; font-weight: bold; color: #8b5cf6;">${customerSales.length}</div>
                <div style="font-size: 12px; color: #94a3b8;">Purchases</div>
            </div>
        </div>
        ${historyHtml}
    `;
    
    modal.style.display = '';
    modal.classList.add('show');
}

// ==================== HELPERS ====================
function getInitials(name) {
    return name.split(' ')
        .map(word => word[0])
        .join('')
        .substring(0, 2)
        .toUpperCase();
}

function formatRelativeDate(dateStr) {
    const date = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
    return date.toLocaleDateString('en-MY');
}

// ==================== EXPORTS ====================
window.initializeCustomers = initializeCustomers;
window.loadCustomers = loadCustomers;
window.saveCustomers = saveCustomers;
window.showCustomerModal = showCustomerModal;
window.saveCustomer = saveCustomer;
window.deleteCustomer = deleteCustomer;
window.renderCustomers = renderCustomers;
window.searchCustomers = searchCustomers;
window.showCustomerDetail = showCustomerDetail;

// Note: Customers module is initialized by app.js via initializePhase2Modules()
