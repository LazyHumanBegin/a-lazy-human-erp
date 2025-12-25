/**
 * EZCubic Phase 2 - POS Payment Module
 * Payment modal, validation, processing, change calculation
 */

// ==================== TRANSACTION REFERENCE ====================
function generateTransactionRef() {
    const now = new Date();
    const prefix = 'TXN';
    const date = now.toISOString().slice(0, 10).replace(/-/g, '');
    const time = now.toTimeString().slice(0, 8).replace(/:/g, '');
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `${prefix}${date}${time}${random}`;
}

// ==================== PAYMENT MODAL ====================
function showPaymentModal() {
    // Use cart from cart module via window
    const cart = window.getCart ? window.getCart() : (window.cart || []);
    
    if (cart.length === 0) {
        showNotification('Cart is empty!', 'warning');
        return;
    }
    
    // Reset processing flag when opening modal
    isProcessingPayment = false;
    
    const modal = document.getElementById('posPaymentModal');
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const discount = parseFloat(document.getElementById('cartDiscount')?.value) || 0;
    const tax = calculateCartTax();
    const total = Math.max(0, subtotal - discount) + tax;
    
    // Display actual amount
    document.getElementById('paymentTotalAmount').textContent = `RM ${total.toFixed(2)}`;
    document.getElementById('amountReceived').value = '';
    document.getElementById('changeDisplay').style.display = 'none';
    
    // Auto-generate Transaction ID
    document.getElementById('posPaymentReference').value = generateTransactionRef();
    
    // Auto-fill payment date to today
    const paymentDateField = document.getElementById('posPaymentDate');
    if (paymentDateField) {
        paymentDateField.value = new Date().toISOString().split('T')[0];
    }
    
    // Reset to cash
    document.querySelector('input[name="paymentMethod"][value="cash"]').checked = true;
    
    // Get credit payment elements
    const creditPaymentOption = document.getElementById('creditPaymentOption');
    const creditInfoGroup = document.getElementById('creditInfoGroup');
    
    // Default: hide credit option
    if (creditPaymentOption) creditPaymentOption.style.display = 'none';
    if (creditInfoGroup) creditInfoGroup.style.display = 'none';
    
    // Check if customer has credit terms
    const customerId = document.getElementById('posCustomer')?.value || '';
    
    if (customerId && creditPaymentOption && creditInfoGroup) {
        // Get CRM customer data
        const crmCustomer = getCRMCustomerById(customerId);
        console.log('POS Credit Check - Customer ID:', customerId, 'CRM Customer:', crmCustomer);
        
        if (crmCustomer && crmCustomer.creditTerms && crmCustomer.creditTerms !== 'cod') {
            // Show credit payment option
            creditPaymentOption.style.display = 'block';
            console.log('POS Credit - Showing credit option for:', crmCustomer.name, 'Terms:', crmCustomer.creditTerms);
            
            // Calculate credit info
            const creditLimit = parseFloat(crmCustomer.creditLimit) || 0;
            const outstanding = parseFloat(crmCustomer.outstandingBalance) || 0;
            const available = creditLimit - outstanding;
            
            // Update credit info display
            const termLabels = {
                '7days': 'Net 7 Days',
                '14days': 'Net 14 Days',
                '30days': 'Net 30 Days',
                '60days': 'Net 60 Days',
                '90days': 'Net 90 Days'
            };
            
            document.getElementById('creditTermsDisplay').textContent = termLabels[crmCustomer.creditTerms] || crmCustomer.creditTerms;
            document.getElementById('creditLimitDisplay').textContent = `RM ${creditLimit.toFixed(2)}`;
            document.getElementById('creditOutstandingDisplay').textContent = `RM ${outstanding.toFixed(2)}`;
            document.getElementById('creditAvailableDisplay').textContent = `RM ${available.toFixed(2)}`;
            
            // Color code available credit
            const availableEl = document.getElementById('creditAvailableDisplay');
            if (available < total) {
                availableEl.classList.add('over-limit');
                availableEl.classList.remove('credit-available');
            } else {
                availableEl.classList.add('credit-available');
                availableEl.classList.remove('over-limit');
            }
        } else {
            creditPaymentOption.style.display = 'none';
            creditInfoGroup.style.display = 'none';
        }
    }
    
    // Add event listener for payment method change
    document.querySelectorAll('input[name="paymentMethod"]').forEach(radio => {
        radio.addEventListener('change', handlePaymentMethodChange);
    });
    
    // Initialize view
    handlePaymentMethodChange();
    
    modal.style.display = '';
    modal.classList.add('show');
}

function closePosPaymentModal() {
    const modal = document.getElementById('posPaymentModal');
    if (modal) {
        modal.classList.remove('show');
        modal.style.display = 'none';
    }
    isProcessingPayment = false;
}

function handlePaymentMethodChange() {
    const paymentMethod = document.querySelector('input[name="paymentMethod"]:checked')?.value;
    const cashAmountGroup = document.getElementById('cashAmountGroup');
    const creditInfoGroup = document.getElementById('creditInfoGroup');
    
    if (cashAmountGroup) {
        cashAmountGroup.style.display = paymentMethod === 'cash' ? 'block' : 'none';
    }
    
    if (creditInfoGroup) {
        creditInfoGroup.style.display = paymentMethod === 'credit' ? 'block' : 'none';
    }
}

// ==================== CRM HELPER ====================
function getCRMCustomerById(customerId) {
    // Try window.crmCustomers first (set by tenant data loading)
    if (Array.isArray(window.crmCustomers) && window.crmCustomers.length > 0) {
        const found = window.crmCustomers.find(c => c.id === customerId);
        if (found) return found;
    }
    // Try module-level crmCustomers
    if (typeof crmCustomers !== 'undefined' && Array.isArray(crmCustomers)) {
        const found = crmCustomers.find(c => c.id === customerId);
        if (found) return found;
    }
    // Try from localStorage
    try {
        const stored = localStorage.getItem('ezcubic_crm_customers');
        if (stored) {
            const customers = JSON.parse(stored);
            const found = customers.find(c => c.id === customerId);
            if (found) return found;
        }
    } catch (e) {
        console.error('Error loading CRM customers:', e);
    }
    
    // Also check regular customers (they may have credit settings)
    if (Array.isArray(window.customers) && window.customers.length > 0) {
        const found = window.customers.find(c => c.id === customerId);
        if (found) return found;
    }
    
    // Try from localStorage for regular customers
    try {
        const stored = localStorage.getItem('ezcubic_customers');
        if (stored) {
            const customers = JSON.parse(stored);
            const found = customers.find(c => c.id === customerId);
            if (found) return found;
        }
    } catch (e) {
        console.error('Error loading regular customers:', e);
    }
    
    return null;
}

// ==================== CHANGE CALCULATION ====================
function calculateChange() {
    const cart = window.getCart ? window.getCart() : (window.cart || []);
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const discount = parseFloat(document.getElementById('cartDiscount')?.value) || 0;
    
    // Calculate tax per product
    let totalTax = 0;
    const productList = (typeof products !== 'undefined' && products.length > 0) ? products : (window.products || []);
    
    cart.forEach(item => {
        const product = productList.find(p => p.id === item.productId);
        const taxRate = product?.taxRate !== undefined ? product.taxRate / 100 : 0.06;
        const itemSubtotal = item.price * item.quantity;
        const itemDiscount = discount > 0 ? (itemSubtotal / subtotal) * discount : 0;
        const taxableAmount = Math.max(0, itemSubtotal - itemDiscount);
        totalTax += taxableAmount * taxRate;
    });
    
    const total = Math.max(0, subtotal - discount) + totalTax;
    
    const received = parseFloat(document.getElementById('amountReceived').value) || 0;
    const change = received - total;
    
    const displayEl = document.getElementById('changeDisplay');
    const changeEl = document.getElementById('changeAmount');
    
    if (received > 0) {
        displayEl.style.display = 'flex';
        changeEl.textContent = `RM ${Math.max(0, change).toFixed(2)}`;
        changeEl.style.color = change >= 0 ? '#10b981' : '#ef4444';
    } else {
        displayEl.style.display = 'none';
    }
}

function fillExactAmount() {
    const cart = window.getCart ? window.getCart() : (window.cart || []);
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const discount = parseFloat(document.getElementById('cartDiscount')?.value) || 0;
    const tax = calculateCartTax();
    const total = Math.max(0, subtotal - discount) + tax;
    
    document.getElementById('amountReceived').value = total.toFixed(2);
    calculateChange();
}

function calculateCartTax() {
    const cart = window.getCart ? window.getCart() : (window.cart || []);
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const discount = parseFloat(document.getElementById('cartDiscount')?.value) || 0;
    
    const productList = (typeof products !== 'undefined' && products.length > 0) ? products : (window.products || []);
    
    let totalTax = 0;
    cart.forEach(item => {
        const product = productList.find(p => p.id === item.productId);
        const taxRate = product?.taxRate !== undefined ? product.taxRate / 100 : 0.06;
        const itemSubtotal = item.price * item.quantity;
        const itemDiscount = discount > 0 ? (itemSubtotal / subtotal) * discount : 0;
        const taxableAmount = Math.max(0, itemSubtotal - itemDiscount);
        totalTax += taxableAmount * taxRate;
    });
    
    return totalTax;
}

// ==================== PAYMENT PROCESSING ====================
function processPayment(event) {
    event.preventDefault();
    
    // Prevent double submission
    if (isProcessingPayment) {
        console.log('Payment already processing...');
        return;
    }
    
    // Get cart from cart module
    let cart = window.getCart ? window.getCart() : (window.cart || []);
    
    // ===== VALIDATE OUTLET SELECTION =====
    const posOutletFilter = document.getElementById('posOutletFilter');
    const outletFilterVisible = posOutletFilter && posOutletFilter.closest('.pos-outlet-filter')?.style.display !== 'none';
    let selectedOutlet = posOutletFilter?.value || 'all';
    
    // If outlet filter is hidden (single-branch plans), use default HQ branch
    if (!outletFilterVisible || selectedOutlet === 'all') {
        // Get default branch or HQ
        const defaultBranch = (window.branches || []).find(b => b.isDefault || b.id === 'BRANCH_HQ');
        selectedOutlet = defaultBranch?.id || 'BRANCH_HQ';
    }
    
    // ===== VALIDATE SALESPERSON/CASHIER SELECTION =====
    const salesperson = document.getElementById('posSalesperson')?.value || '';
    if (!salesperson) {
        showNotification('Please select a cashier/staff before checkout!', 'error');
        document.getElementById('posSalesperson')?.focus();
        return;
    }
    
    // Check if cart is empty
    if (cart.length === 0) {
        showNotification('Cart is empty!', 'error');
        return;
    }
    
    // Set processing flag AFTER validations pass
    isProcessingPayment = true;
    
    const paymentMethod = document.querySelector('input[name="paymentMethod"]:checked').value;
    const reference = document.getElementById('posPaymentReference').value.trim();
    
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const discount = parseFloat(document.getElementById('cartDiscount')?.value) || 0;
    const tax = calculateCartTax();
    const total = Math.max(0, subtotal - discount) + tax;
    
    // Validate cash payment
    if (paymentMethod === 'cash') {
        const received = parseFloat(document.getElementById('amountReceived').value) || 0;
        if (received < total) {
            showNotification('Insufficient amount received!', 'error');
            isProcessingPayment = false;
            return;
        }
    }
    
    // Validate credit payment
    if (paymentMethod === 'credit') {
        const customerId = document.getElementById('posCustomer')?.value || '';
        if (!customerId) {
            showNotification('Please select a customer for credit payment!', 'error');
            isProcessingPayment = false;
            return;
        }
        
        const crmCustomer = getCRMCustomerById(customerId);
        if (!crmCustomer || !crmCustomer.creditTerms || crmCustomer.creditTerms === 'cod') {
            showNotification('This customer does not have credit terms!', 'error');
            isProcessingPayment = false;
            return;
        }
        
        const creditLimit = parseFloat(crmCustomer.creditLimit) || 0;
        const outstanding = parseFloat(crmCustomer.outstandingBalance) || 0;
        const available = creditLimit - outstanding;
        
        if (total > available) {
            showNotification(`Credit limit exceeded! Available: RM ${available.toFixed(2)}`, 'error');
            isProcessingPayment = false;
            return;
        }
    }
    
    // Create sale record
    const customerId = document.getElementById('posCustomer')?.value || '';
    
    // Look up customer in CRM first, then fall back to legacy customers
    let customer = null;
    let customerName = 'Walk-in Customer';
    
    if (customerId) {
        // Try CRM customers first
        if (typeof getCRMCustomersForSelect === 'function') {
            const crmCustomers = getCRMCustomersForSelect();
            const crmCustomer = crmCustomers.find(c => c.id === customerId);
            if (crmCustomer) {
                customerName = crmCustomer.name;
                customer = crmCustomer;
            }
        }
        
        // Fall back to legacy customers array
        if (!customer && Array.isArray(customers)) {
            customer = customers.find(c => c.id === customerId);
            if (customer) {
                customerName = customer.name;
            }
        }
    }
    
    // Get current branch/outlet (use selectedOutlet from validation above)
    const currentBranch = typeof getCurrentBranch === 'function' ? getCurrentBranch() : null;
    const branchId = selectedOutlet !== 'all' ? selectedOutlet : (currentBranch?.id || 'BRANCH_HQ');
    const branchName = typeof getBranchNameById === 'function' ? getBranchNameById(branchId) : 'Headquarters';
    
    // Get current tenant ID for multi-tenant support
    const currentTenantId = typeof getCurrentTenantId === 'function' ? getCurrentTenantId() : null;
    
    // Calculate due date for credit sales based on customer's credit terms
    let dueDate = null;
    let creditTerms = null;
    if (paymentMethod === 'credit' && customerId) {
        const crmCustomer = getCRMCustomerById(customerId);
        if (crmCustomer && crmCustomer.creditTerms) {
            creditTerms = crmCustomer.creditTerms;
            const saleDate = new Date();
            const termDays = {
                'cod': 0,
                '7days': 7,
                '14days': 14,
                '30days': 30,
                '60days': 60,
                '90days': 90
            };
            const days = termDays[crmCustomer.creditTerms] || 30;
            dueDate = new Date(saleDate);
            dueDate.setDate(dueDate.getDate() + days);
            dueDate = dueDate.toISOString();
        }
    }
    
    const productList = (typeof products !== 'undefined' && products.length > 0) ? products : (window.products || []);
    
    const sale = {
        id: generateUUID(),
        receiptNo: generateReceiptNumber(),
        date: new Date().toISOString(),
        dueDate: dueDate,
        creditTerms: creditTerms,
        isCredit: paymentMethod === 'credit',
        paidAmount: paymentMethod === 'credit' ? 0 : total,
        tenantId: currentTenantId,
        customerId: customerId,
        customerName: customerName,
        salesperson: document.getElementById('posSalesperson')?.value || '',
        cashier: document.getElementById('posSalesperson')?.value || '',
        branchId: branchId,
        branchName: branchName,
        items: [...cart],
        subtotal: subtotal,
        discount: discount,
        tax: tax,
        total: total,
        paymentMethod: paymentMethod,
        reference: reference,
        amountReceived: paymentMethod === 'cash' ? parseFloat(document.getElementById('amountReceived').value) : total,
        change: paymentMethod === 'cash' ? parseFloat(document.getElementById('amountReceived').value) - total : 0,
        status: paymentMethod === 'credit' ? 'unpaid' : 'completed'
    };
    
    // Save sale
    sales.push(sale);
    localStorage.setItem(SALES_KEY, JSON.stringify(sales));
    
    // Update stock using branch stock system
    cart.forEach(item => {
        const productIndex = productList.findIndex(p => p.id === item.productId);
        if (productIndex !== -1) {
            // Use centralized branch stock system
            if (branchId && branchId !== 'all' && typeof adjustBranchStock === 'function') {
                // Deduct from branch-specific stock
                adjustBranchStock(item.productId, branchId, -item.quantity);
                
                // Update total stock in product (sum of all branches)
                if (typeof getTotalBranchStock === 'function') {
                    productList[productIndex].stock = getTotalBranchStock(item.productId);
                }
            } else {
                // Fallback to simple stock deduction from total stock
                productList[productIndex].stock = Math.max(0, (productList[productIndex].stock || 0) - item.quantity);
                
                // Also adjust default branch stock
                if (typeof adjustBranchStock === 'function') {
                    const defaultBranchId = typeof getCurrentBranchId === 'function' ? getCurrentBranchId() : 'BRANCH_HQ';
                    adjustBranchStock(item.productId, defaultBranchId, -item.quantity);
                }
            }
            
            // Record stock movement with branch info
            if (typeof recordStockMovement === 'function') {
                recordStockMovement({
                    productId: item.productId,
                    productName: item.name,
                    type: 'sale',
                    quantity: -item.quantity,
                    branchId: branchId,
                    branchName: branchName,
                    reason: 'POS Sale',
                    reference: sale.receiptNo,
                    notes: `Sold at ${branchName} to ${sale.customerName}`
                });
            }
        }
    });
    
    // Save updated products to localStorage
    if (typeof saveProducts === 'function') {
        saveProducts();
    } else {
        localStorage.setItem(PRODUCTS_KEY, JSON.stringify(productList));
    }
    
    // Update customer loyalty points
    const settings = typeof getPlatformSettings === 'function' ? getPlatformSettings() : window.settings || {};
    if (customer && settings.enableLoyaltyPoints) {
        const pointsEarned = Math.floor(total * settings.pointsPerRM);
        const customerIndex = customers.findIndex(c => c.id === customerId);
        if (customerIndex !== -1) {
            customers[customerIndex].loyaltyPoints = (customers[customerIndex].loyaltyPoints || 0) + pointsEarned;
            customers[customerIndex].totalPurchases = (customers[customerIndex].totalPurchases || 0) + total;
            customers[customerIndex].lastPurchase = sale.date;
            if (typeof saveCustomers === 'function') {
                saveCustomers();
            }
        }
    }
    
    // Link sale to CRM customer
    if (customerId && typeof linkSaleToCRMCustomer === 'function') {
        linkSaleToCRMCustomer(customerId, {
            saleId: sale.id,
            receiptNo: sale.receiptNo,
            date: sale.date,
            total: sale.total,
            items: sale.items.map(item => ({
                name: item.name,
                quantity: item.quantity,
                price: item.price
            })),
            paymentMethod: sale.paymentMethod
        });
    }
    
    // Update CRM customer outstanding balance for credit payments
    if (paymentMethod === 'credit' && customerId && typeof updateCRMCustomerCredit === 'function') {
        updateCRMCustomerCredit(customerId, total);
    }
    
    // Also record as income transaction (for credit, mark as accounts receivable)
    const incomeTransaction = {
        id: generateUUID(),
        date: new Date().toISOString().split('T')[0],
        amount: total,
        category: 'Sales',
        description: `POS Sale #${sale.receiptNo}`,
        type: 'income',
        method: paymentMethod,
        reference: sale.receiptNo,
        timestamp: new Date().toISOString()
    };
    
    // Push to businessData.transactions to ensure proper sync with All Transactions
    if (typeof businessData !== 'undefined' && businessData.transactions) {
        businessData.transactions.push(incomeTransaction);
    } else if (typeof transactions !== 'undefined') {
        transactions.push(incomeTransaction);
    }
    
    // Record cost of goods sold (COGS) as expense
    const totalCost = cart.reduce((sum, item) => {
        const product = productList.find(p => p.id === item.productId);
        return sum + ((product?.cost || 0) * item.quantity);
    }, 0);
    
    if (totalCost > 0) {
        const cogsTransaction = {
            id: generateUUID(),
            date: new Date().toISOString().split('T')[0],
            amount: totalCost,
            category: 'Cost of Goods Sold',
            description: `COGS for Sale #${sale.receiptNo}`,
            type: 'expense',
            method: paymentMethod,
            reference: sale.receiptNo,
            timestamp: new Date().toISOString()
        };
        
        // Push to businessData.transactions to ensure proper sync with All Transactions
        if (typeof businessData !== 'undefined' && businessData.transactions) {
            businessData.transactions.push(cogsTransaction);
        } else if (typeof transactions !== 'undefined') {
            transactions.push(cogsTransaction);
        }
        
        // Show COGS expense recorded notification
        setTimeout(() => {
            showNotification(`📦 COGS expense recorded: RM ${totalCost.toFixed(2)}`, 'info');
        }, 1500);
    }
    
    if (typeof saveData === 'function') {
        saveData();
    }
    
    // Also save sales to tenant storage
    window.sales = sales;
    if (typeof saveToUserTenant === 'function') {
        saveToUserTenant();
        console.log('POS: Sales and products saved to tenant');
    }
    
    // Update order stats if function exists
    if (typeof updateOrderStats === 'function') {
        updateOrderStats();
    }
    
    // Also refresh orders table if visible
    if (typeof renderOrders === 'function') {
        renderOrders();
    }
    
    closePosPaymentModal();
    
    // Clear the cart BEFORE showing receipt to prevent double submission
    if (window.setCart) {
        window.setCart([]);
    } else {
        window.cart = [];
    }
    if (typeof renderCart === 'function') {
        renderCart();
    }
    if (typeof updateCartTotals === 'function') {
        updateCartTotals();
    }
    
    // Reset payment form
    const paymentForm = document.getElementById('paymentForm');
    if (paymentForm) paymentForm.reset();
    document.getElementById('amountReceived').value = '';
    document.getElementById('changeAmount').textContent = 'RM 0.00';
    document.getElementById('posPaymentReference').value = '';
    
    // Show receipt
    if (typeof showReceipt === 'function') {
        showReceipt(sale);
    }
    
    // Refresh POS products to show updated stock
    if (typeof renderPOSProducts === 'function') {
        renderPOSProducts();
    }
    
    // Reset processing flag
    isProcessingPayment = false;
    
    // Show success notification
    showNotification('✅ Sale completed successfully!', 'success');
    
    // Record audit log for the sale
    if (typeof recordAuditLog === 'function') {
        recordAuditLog({
            action: 'create',
            module: 'sales',
            subModule: 'pos',
            recordId: sale.id,
            recordName: sale.receiptNo,
            description: `POS sale completed - ${sale.items.length} item(s), Total: RM ${sale.total.toFixed(2)}`,
            newValue: {
                receiptNo: sale.receiptNo,
                customer: sale.customerName,
                items: sale.items.map(i => `${i.name} x${i.quantity}`).join(', '),
                total: sale.total,
                paymentMethod: sale.paymentMethod,
                cashier: sale.salesperson,
                branch: sale.branchName
            }
        });
    }
    
    // Show income recorded notification after a delay
    setTimeout(() => {
        showNotification(`💰 Income recorded: RM ${total.toFixed(2)}`, 'success');
    }, 500);
}

// ==================== RECEIPT NUMBER ====================
function generateReceiptNumber() {
    // Use customizable document numbering if available
    if (typeof generateDocumentNumber === 'function') {
        return generateDocumentNumber('receipt');
    }
    
    // Fallback to original logic
    const date = new Date();
    const prefix = 'RCP';
    const dateStr = date.toISOString().split('T')[0].replace(/-/g, '');
    const salesList = window.sales || (typeof sales !== 'undefined' ? sales : []);
    const sequence = (salesList.length + 1).toString().padStart(4, '0');
    return `${prefix}${dateStr}-${sequence}`;
}

// ==================== WINDOW EXPORTS (Payment) ====================
window.generateTransactionRef = generateTransactionRef;
window.showPaymentModal = showPaymentModal;
window.closePosPaymentModal = closePosPaymentModal;
window.handlePaymentMethodChange = handlePaymentMethodChange;
window.getCRMCustomerById = getCRMCustomerById;
window.calculateChange = calculateChange;
window.fillExactAmount = fillExactAmount;
window.calculateCartTax = calculateCartTax;
window.processPayment = processPayment;
window.generateReceiptNumber = generateReceiptNumber;

console.log('POS Payment module loaded');
