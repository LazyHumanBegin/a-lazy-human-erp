// ==================== PURCHASE ORDERS CORE ====================
// Data management, CRUD operations, goods receiving logic
// Version: 2.3.0 - Split from purchase-orders.js

// ==================== GLOBAL VARIABLES ====================
let purchaseOrders = [];
let goodsReceipts = [];

const PURCHASE_ORDERS_KEY = 'ezcubic_purchase_orders';
const GOODS_RECEIPTS_KEY = 'ezcubic_goods_receipts';

// PO Status Flow: draft -> pending -> approved -> ordered -> partial/received -> closed
const PO_STATUS = {
    draft: { label: 'Draft', color: '#64748b', next: ['pending', 'cancelled'] },
    pending: { label: 'Pending Approval', color: '#f59e0b', next: ['approved', 'cancelled'] },
    approved: { label: 'Approved', color: '#3b82f6', next: ['ordered', 'cancelled'] },
    ordered: { label: 'Ordered', color: '#8b5cf6', next: ['partial', 'received'] },
    partial: { label: 'Partially Received', color: '#06b6d4', next: ['received'] },
    received: { label: 'Received', color: '#10b981', next: ['closed'] },
    closed: { label: 'Closed', color: '#475569', next: [] },
    cancelled: { label: 'Cancelled', color: '#ef4444', next: [] }
};

// ==================== SYNC FUNCTIONS ====================
function syncPurchaseOrdersFromWindow() {
    if (Array.isArray(window.purchaseOrders)) {
        purchaseOrders = window.purchaseOrders;
    }
    if (Array.isArray(window.goodsReceipts)) {
        goodsReceipts = window.goodsReceipts;
    }
}

// ==================== HELPER FUNCTIONS ====================
function getSuppliersList() {
    try {
        if (Array.isArray(window.suppliers)) {
            return window.suppliers;
        }
        const stored = localStorage.getItem('ezcubic_suppliers');
        if (stored) {
            const parsed = JSON.parse(stored);
            return Array.isArray(parsed) ? parsed : [];
        }
    } catch (e) {
        console.error('Error loading suppliers:', e);
    }
    return [];
}

function generateUniqueIdPO(prefix = 'ID') {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function escapeHTMLPO(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function formatDatePO(dateStr) {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-MY', { 
        day: '2-digit', 
        month: 'short', 
        year: 'numeric' 
    });
}

function showNotificationPO(message, type = 'info') {
    if (typeof window.showNotification === 'function') {
        window.showNotification(message, type);
    } else {
        console.log(`[${type.toUpperCase()}] ${message}`);
    }
}

// ==================== INITIALIZATION ====================
function initializePurchaseOrders() {
    loadPOData();
    populatePOFilters();
    updatePOStats();
}

function loadPOData() {
    // First check if window has data from tenant loading
    if (Array.isArray(window.purchaseOrders)) {
        purchaseOrders = window.purchaseOrders;
    } else {
        const storedPOs = localStorage.getItem(PURCHASE_ORDERS_KEY);
        if (storedPOs) {
            purchaseOrders = JSON.parse(storedPOs);
            if (!Array.isArray(purchaseOrders)) purchaseOrders = [];
        }
        window.purchaseOrders = purchaseOrders;
    }
    
    if (Array.isArray(window.goodsReceipts)) {
        goodsReceipts = window.goodsReceipts;
    } else {
        const storedReceipts = localStorage.getItem(GOODS_RECEIPTS_KEY);
        if (storedReceipts) {
            goodsReceipts = JSON.parse(storedReceipts);
            if (!Array.isArray(goodsReceipts)) goodsReceipts = [];
        }
        window.goodsReceipts = goodsReceipts;
    }
}

function savePOData() {
    localStorage.setItem(PURCHASE_ORDERS_KEY, JSON.stringify(purchaseOrders));
    localStorage.setItem(GOODS_RECEIPTS_KEY, JSON.stringify(goodsReceipts));
    
    // Keep window in sync
    window.purchaseOrders = purchaseOrders;
    window.goodsReceipts = goodsReceipts;
    
    // Also save to tenant storage for data isolation
    if (typeof saveToUserTenant === 'function') {
        saveToUserTenant();
    }
}

function generatePONumber() {
    // Use customizable document numbering if available
    if (typeof generateDocumentNumber === 'function') {
        return generateDocumentNumber('purchaseorder');
    }
    
    // Fallback to original logic
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    
    const prefix = `PO${year}${month}`;
    const existingNumbers = purchaseOrders
        .filter(po => po.poNumber && po.poNumber.startsWith(prefix))
        .map(po => parseInt(po.poNumber.slice(-4)) || 0);
    
    const nextNumber = existingNumbers.length > 0 ? Math.max(...existingNumbers) + 1 : 1;
    return `${prefix}${nextNumber.toString().padStart(4, '0')}`;
}

// ==================== PO ITEMS MANAGEMENT ====================
let poItemCounter = 0;

function collectPOItems() {
    const rows = document.querySelectorAll('.po-item-row');
    const items = [];
    
    rows.forEach(row => {
        const productSelect = row.querySelector('.poi-product');
        const productId = productSelect.value;
        
        if (!productId) return;
        
        let productName = '';
        let description = '';
        
        if (productId === '_custom') {
            description = row.querySelector('.poi-description').value.trim();
            productName = description;
        } else {
            const selectedOption = productSelect.options[productSelect.selectedIndex];
            productName = selectedOption.textContent;
        }
        
        const quantity = parseFloat(row.querySelector('.poi-qty').value) || 0;
        const unitPrice = parseFloat(row.querySelector('.poi-price').value) || 0;
        
        if (quantity > 0) {
            items.push({
                productId: productId,
                productName: productName,
                description: description,
                quantity: quantity,
                unitPrice: unitPrice,
                total: quantity * unitPrice,
                receivedQty: 0
            });
        }
    });
    
    return items;
}

// ==================== SAVE PURCHASE ORDER ====================
function savePurchaseOrder(status = 'pending') {
    const id = document.getElementById('poId').value;
    const poNumber = document.getElementById('poNumber').value;
    const date = document.getElementById('poDate').value;
    const supplierId = document.getElementById('poSupplier').value;
    const expectedDelivery = document.getElementById('poExpectedDelivery').value;
    const remarks = document.getElementById('poRemarks').value.trim();
    
    if (!supplierId) {
        showNotificationPO('Please select a supplier', 'error');
        return;
    }
    
    const items = collectPOItems();
    
    if (items.length === 0) {
        showNotificationPO('Please add at least one item', 'error');
        return;
    }
    
    const suppliers = getSuppliersList();
    const supplier = suppliers.find(s => s.id === supplierId);
    
    const subtotal = items.reduce((sum, item) => sum + item.total, 0);
    
    const poData = {
        id: id || generateUniqueIdPO('PO'),
        poNumber: poNumber,
        date: date,
        supplierId: supplierId,
        supplierName: supplier ? (supplier.company || supplier.name) : 'Unknown',
        expectedDelivery: expectedDelivery || null,
        items: items,
        subtotal: subtotal,
        tax: 0,
        total: subtotal,
        status: status,
        remarks: remarks,
        createdAt: id ? purchaseOrders.find(p => p.id === id)?.createdAt : new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };
    
    if (id) {
        const index = purchaseOrders.findIndex(p => p.id === id);
        if (index !== -1) {
            purchaseOrders[index] = poData;
        }
    } else {
        purchaseOrders.push(poData);
    }
    
    savePOData();
    closePurchaseOrderModal();
    loadPurchaseOrders();
    updatePOStats();
    
    const statusLabel = status === 'draft' ? 'saved as draft' : 'submitted for approval';
    showNotificationPO(`Purchase Order ${poNumber} ${statusLabel}!`, 'success');
}

// ==================== PO ACTIONS ====================
function deletePurchaseOrder(poId) {
    const po = purchaseOrders.find(p => p.id === poId);
    if (!po) return;
    
    if (confirm(`Delete Purchase Order ${po.poNumber}? This cannot be undone.`)) {
        purchaseOrders = purchaseOrders.filter(p => p.id !== poId);
        savePOData();
        loadPurchaseOrders();
        updatePOStats();
        showNotificationPO('Purchase Order deleted', 'success');
    }
}

function approvePurchaseOrder(poId) {
    const po = purchaseOrders.find(p => p.id === poId);
    if (!po) return;
    
    if (confirm(`Approve Purchase Order ${po.poNumber} for RM ${po.total.toFixed(2)}?`)) {
        po.status = 'approved';
        po.approvedAt = new Date().toISOString();
        savePOData();
        loadPurchaseOrders();
        updatePOStats();
        showNotificationPO(`PO ${po.poNumber} approved!`, 'success');
    }
}

function markAsOrdered(poId) {
    const po = purchaseOrders.find(p => p.id === poId);
    if (!po) return;
    
    if (confirm(`Mark ${po.poNumber} as ordered/sent to supplier?`)) {
        po.status = 'ordered';
        po.orderedAt = new Date().toISOString();
        savePOData();
        loadPurchaseOrders();
        updatePOStats();
        showNotificationPO(`PO ${po.poNumber} marked as ordered`, 'success');
    }
}

// ==================== RECEIVE GOODS ====================
function saveGoodsReceipt() {
    const poId = document.getElementById('receivePoId').value;
    const po = purchaseOrders.find(p => p.id === poId);
    if (!po) return;
    
    const receiptDate = document.getElementById('receiveDate').value;
    const deliveryNote = document.getElementById('receiveDeliveryNote').value.trim();
    const notes = document.getElementById('receiveNotes').value.trim();
    
    const rows = document.querySelectorAll('.receive-item-row');
    let hasReceipts = false;
    const receivedItems = [];
    
    rows.forEach((row, idx) => {
        const checkbox = row.querySelector('.rcv-check');
        const qtyInput = row.querySelector('.rcv-qty');
        
        if (checkbox && checkbox.checked && !qtyInput.disabled) {
            const qty = parseFloat(qtyInput.value) || 0;
            if (qty > 0) {
                hasReceipts = true;
                po.items[idx].receivedQty = (po.items[idx].receivedQty || 0) + qty;
                
                receivedItems.push({
                    productId: po.items[idx].productId,
                    productName: po.items[idx].productName,
                    quantity: qty,
                    unitPrice: po.items[idx].unitPrice
                });
                
                // Update inventory stock
                updateInventoryStock(po.items[idx].productId, qty, 'in', `Received from PO ${po.poNumber}`);
            }
        }
    });
    
    if (!hasReceipts) {
        showNotificationPO('Please select items to receive', 'error');
        return;
    }
    
    // Check if all items fully received
    const allReceived = po.items.every(item => (item.receivedQty || 0) >= item.quantity);
    po.status = allReceived ? 'received' : 'partial';
    
    // Create receipt record
    const receipt = {
        id: generateUniqueIdPO('RCV'),
        poId: po.id,
        poNumber: po.poNumber,
        supplierId: po.supplierId,
        supplierName: po.supplierName,
        receiptDate: receiptDate,
        deliveryNote: deliveryNote,
        items: receivedItems,
        totalValue: receivedItems.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0),
        notes: notes,
        tenantId: window.currentUser?.tenantId || null,
        createdAt: new Date().toISOString()
    };
    
    goodsReceipts.push(receipt);
    
    // Update supplier's outstanding balance
    updateSupplierPayable(po.supplierId, receipt.totalValue);
    
    savePOData();
    
    // Create expense transaction
    createPurchaseTransaction(receipt, po);
    
    // Create a bill
    createBillFromReceipt(receipt, po);
    
    closeReceiveGoodsModal();
    loadPurchaseOrders();
    loadPendingDeliveries();
    loadRecentReceipts();
    updatePOStats();
    
    // Refresh other modules
    if (typeof loadTransactions === 'function') loadTransactions();
    if (typeof loadRecentTransactions === 'function') loadRecentTransactions();
    if (typeof updateDashboard === 'function') updateDashboard();
    if (typeof updateMonthlyCharts === 'function') updateMonthlyCharts();
    if (typeof updateReports === 'function') updateReports();
    if (typeof updateBalanceSheet === 'function') updateBalanceSheet();
    
    setTimeout(() => {
        if (typeof loadBills === 'function') loadBills();
        if (typeof loadUpcomingBills === 'function') loadUpcomingBills();
    }, 100);
    
    const message = allReceived ? 
        `All items received for PO ${po.poNumber}!` : 
        `Partial receipt recorded for PO ${po.poNumber}`;
    showNotificationPO(message, 'success');
}

function createPurchaseTransaction(receipt, po) {
    if (typeof businessData === 'undefined' || !businessData.transactions) {
        console.warn('businessData not available for transaction');
        return;
    }
    
    const transaction = {
        id: typeof generateUniqueId === 'function' ? generateUniqueId() : 'TXN_' + Date.now(),
        type: 'expense',
        date: receipt.receiptDate,
        amount: receipt.totalValue,
        description: `Purchase - ${receipt.poNumber} (${receipt.items.length} items from ${receipt.supplierName})`,
        category: 'supplies',
        vendor: receipt.supplierName,
        method: 'bank',
        poId: po.id,
        receiptId: receipt.id,
        timestamp: new Date().toISOString()
    };
    
    businessData.transactions.push(transaction);
    
    if (typeof saveData === 'function') {
        saveData();
    }
}

function createBillFromReceipt(receipt, po) {
    if (typeof businessData === 'undefined') {
        console.warn('businessData not available');
        return;
    }
    
    if (!businessData.bills) {
        businessData.bills = [];
    }
    
    const dueDate = new Date(receipt.receiptDate);
    dueDate.setDate(dueDate.getDate() + 30);
    
    const bill = {
        id: typeof generateUniqueId === 'function' ? generateUniqueId() : 'BILL_' + Date.now(),
        name: `Payment for ${receipt.poNumber}`,
        amount: receipt.totalValue,
        dueDate: dueDate.toISOString().slice(0, 10),
        category: 'supplies',
        vendor: receipt.supplierName,
        status: 'pending',
        createdAt: new Date().toISOString(),
        poId: po.id,
        receiptId: receipt.id,
        supplierId: po.supplierId,
        isRecurring: false
    };
    
    businessData.bills.push(bill);
    
    if (typeof saveData === 'function') {
        saveData();
    }
}

function updateInventoryStock(productId, quantity, type, notes) {
    if (!productId || productId === '_custom') return;
    
    const inventory = JSON.parse(localStorage.getItem('ezcubic_inventory') || '[]');
    const product = inventory.find(p => p.id === productId);
    
    if (product) {
        if (type === 'in') {
            product.stock = (product.stock || 0) + quantity;
        } else {
            product.stock = Math.max(0, (product.stock || 0) - quantity);
        }
        localStorage.setItem('ezcubic_inventory', JSON.stringify(inventory));
        
        if (typeof saveToUserTenant === 'function') {
            saveToUserTenant();
        }
        
        if (typeof recordStockMovement === 'function') {
            recordStockMovement({
                productId: productId,
                productName: product.name,
                type: type === 'in' ? 'purchase' : 'adjustment',
                quantity: quantity,
                notes: notes
            });
        }
    }
}

function updateSupplierPayable(supplierId, amount) {
    const suppliers = JSON.parse(localStorage.getItem('ezcubic_suppliers') || '[]');
    const supplier = suppliers.find(s => s.id === supplierId);
    
    if (supplier) {
        supplier.outstandingBalance = (parseFloat(supplier.outstandingBalance) || 0) + amount;
        localStorage.setItem('ezcubic_suppliers', JSON.stringify(suppliers));
        
        if (typeof saveToUserTenant === 'function') {
            saveToUserTenant();
        }
    }
}

// ==================== STATS ====================
function updatePOStats() {
    const currentMonth = new Date().toISOString().slice(0, 7);
    
    const pending = purchaseOrders.filter(po => po.status === 'pending').length;
    const approved = purchaseOrders.filter(po => ['approved', 'ordered'].includes(po.status)).length;
    const received = purchaseOrders.filter(po => po.status === 'received').length;
    const monthTotal = purchaseOrders
        .filter(po => po.date.startsWith(currentMonth) && po.status !== 'cancelled')
        .reduce((sum, po) => sum + po.total, 0);
    
    const elements = {
        'poPendingCount': pending,
        'poApprovedCount': approved,
        'poReceivedCount': received,
        'poMonthTotal': `RM ${monthTotal.toFixed(2)}`
    };
    
    Object.entries(elements).forEach(([id, value]) => {
        const el = document.getElementById(id);
        if (el) el.textContent = value;
    });
}

function updateReceivingStats() {
    const today = new Date().toISOString().slice(0, 10);
    const currentMonth = new Date().toISOString().slice(0, 7);
    
    const currentTenantId = window.currentUser?.tenantId;
    
    const tenantReceipts = goodsReceipts.filter(receipt => {
        if (!receipt.tenantId) {
            const matchingPO = purchaseOrders.find(po => po.id === receipt.poId);
            return matchingPO !== undefined;
        }
        return receipt.tenantId === currentTenantId;
    });
    
    const pendingCount = purchaseOrders.filter(po => ['ordered', 'partial'].includes(po.status)).length;
    const todayReceipts = tenantReceipts.filter(r => r.receiptDate === today);
    const monthReceipts = tenantReceipts.filter(r => r.receiptDate.startsWith(currentMonth));
    
    const todayCount = todayReceipts.length;
    const monthValue = monthReceipts.reduce((sum, r) => sum + (r.totalValue || 0), 0);
    
    const elements = {
        'rcvPendingCount': pendingCount,
        'rcvTodayCount': todayCount,
        'rcvMonthValue': `RM ${monthValue.toFixed(2)}`
    };
    
    Object.entries(elements).forEach(([id, value]) => {
        const el = document.getElementById(id);
        if (el) el.textContent = value;
    });
}

function populatePOFilters() {
    const supplierFilter = document.getElementById('poSupplierFilter');
    if (supplierFilter) {
        const suppliers = getSuppliersList();
        supplierFilter.innerHTML = '<option value="">All Suppliers</option>' +
            suppliers.map(s => `<option value="${s.id}">${escapeHTMLPO(s.company || s.name)}</option>`).join('');
    }
}

// ==================== WINDOW EXPORTS ====================
window.purchaseOrders = purchaseOrders;
window.goodsReceipts = goodsReceipts;
window.PURCHASE_ORDERS_KEY = PURCHASE_ORDERS_KEY;
window.GOODS_RECEIPTS_KEY = GOODS_RECEIPTS_KEY;
window.PO_STATUS = PO_STATUS;
window.syncPurchaseOrdersFromWindow = syncPurchaseOrdersFromWindow;
window.getSuppliersList = getSuppliersList;
window.initializePurchaseOrders = initializePurchaseOrders;
window.loadPOData = loadPOData;
window.savePOData = savePOData;
window.generatePONumber = generatePONumber;
window.collectPOItems = collectPOItems;
window.savePurchaseOrder = savePurchaseOrder;
window.deletePurchaseOrder = deletePurchaseOrder;
window.approvePurchaseOrder = approvePurchaseOrder;
window.markAsOrdered = markAsOrdered;
window.saveGoodsReceipt = saveGoodsReceipt;
window.createPurchaseTransaction = createPurchaseTransaction;
window.createBillFromReceipt = createBillFromReceipt;
window.updateInventoryStock = updateInventoryStock;
window.updateSupplierPayable = updateSupplierPayable;
window.updatePOStats = updatePOStats;
window.updateReceivingStats = updateReceivingStats;
window.populatePOFilters = populatePOFilters;
