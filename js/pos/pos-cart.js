/**
 * EZCubic Phase 2 - POS Cart Module
 * Cart management, quantity updates, hold/recall sales, item memo
 */

// ==================== CART STATE ====================
let cart = [];
let currentItemMemo = null;

// ==================== CART MANAGEMENT ====================
function addToCart(productId) {
    const productList = (typeof products !== 'undefined' && products.length > 0) ? products : (window.products || []);
    const product = productList.find(p => p.id === productId);
    if (!product) {
        showNotification('Product not found', 'error');
        return;
    }
    
    // Get selected outlet/branch for stock checking
    const selectedOutlet = document.getElementById('posOutletFilter')?.value || 'all';
    const currentBranch = selectedOutlet !== 'all' ? selectedOutlet : 
        (typeof getCurrentBranchId === 'function' ? getCurrentBranchId() : null);
    
    // Get available stock for this outlet
    let availableStock = product.stock; // Default to total stock
    if (currentBranch && typeof getBranchStock === 'function') {
        availableStock = getBranchStock(product.id, currentBranch);
    } else if (selectedOutlet !== 'all' && product.branchStock) {
        availableStock = product.branchStock[selectedOutlet] || 0;
    }
    
    // Check stock availability at the selected outlet
    const existingItem = cart.find(item => item.productId === productId);
    const currentCartQty = existingItem ? existingItem.quantity : 0;
    
    if (currentCartQty >= availableStock) {
        showNotification(`Only ${availableStock} available at this outlet`, 'error');
        return;
    }
    
    if (existingItem) {
        existingItem.quantity++;
    } else {
        cart.push({
            productId: productId,
            name: product.name,
            sku: product.sku,
            price: product.price,
            quantity: 1,
            discount: 0,
            memo: ''
        });
    }
    
    renderCart();
    updateCartTotals();
    
    // Play sound feedback (optional)
    if (typeof playBeep === 'function') {
        playBeep();
    }
}

function updateCartItemQuantity(productId, change) {
    const item = cart.find(i => i.productId === productId);
    if (!item) return;
    
    const productList = (typeof products !== 'undefined' && products.length > 0) ? products : (window.products || []);
    const product = productList.find(p => p.id === productId);
    
    // Get selected outlet/branch for stock checking
    const selectedOutlet = document.getElementById('posOutletFilter')?.value || 'all';
    const currentBranch = selectedOutlet !== 'all' ? selectedOutlet : 
        (typeof getCurrentBranchId === 'function' ? getCurrentBranchId() : null);
    
    // Get available stock for this outlet
    let availableStock = product ? product.stock : 0;
    if (currentBranch && typeof getBranchStock === 'function') {
        availableStock = getBranchStock(productId, currentBranch);
    } else if (selectedOutlet !== 'all' && product?.branchStock) {
        availableStock = product.branchStock[selectedOutlet] || 0;
    }
    
    const newQty = item.quantity + change;
    
    if (newQty <= 0) {
        removeFromCart(productId);
    } else if (product && newQty > availableStock) {
        showNotification(`Only ${availableStock} in stock at this outlet`, 'error');
    } else {
        item.quantity = newQty;
        renderCart();
        updateCartTotals();
    }
}

function setCartItemQuantity(productId, qty) {
    const item = cart.find(i => i.productId === productId);
    if (!item) return;
    
    const productList = (typeof products !== 'undefined' && products.length > 0) ? products : (window.products || []);
    const product = productList.find(p => p.id === productId);
    
    // Get selected outlet/branch for stock checking
    const selectedOutlet = document.getElementById('posOutletFilter')?.value || 'all';
    const currentBranch = selectedOutlet !== 'all' ? selectedOutlet : 
        (typeof getCurrentBranchId === 'function' ? getCurrentBranchId() : null);
    
    // Get available stock for this outlet
    let availableStock = product ? product.stock : 0;
    if (currentBranch && typeof getBranchStock === 'function') {
        availableStock = getBranchStock(productId, currentBranch);
    } else if (selectedOutlet !== 'all' && product?.branchStock) {
        availableStock = product.branchStock[selectedOutlet] || 0;
    }
    
    const newQty = parseInt(qty);
    
    if (isNaN(newQty) || newQty <= 0) {
        removeFromCart(productId);
    } else if (product && newQty > availableStock) {
        showNotification(`Only ${availableStock} in stock at this outlet`, 'error');
        item.quantity = availableStock;
        renderCart();
        updateCartTotals();
    } else {
        item.quantity = newQty;
        renderCart();
        updateCartTotals();
    }
}

function removeFromCart(productId) {
    cart = cart.filter(item => item.productId !== productId);
    renderCart();
    updateCartTotals();
}

function clearCart() {
    if (cart.length === 0) return;
    
    if (confirm('Clear all items from cart?')) {
        cart = [];
        renderCart();
        updateCartTotals();
    }
}

// ==================== CART RENDERING ====================
function renderCart() {
    const container = document.getElementById('posCartItems');
    if (!container) return;
    
    if (cart.length === 0) {
        container.innerHTML = `
            <div class="pos-cart-empty">
                <i class="fas fa-shopping-cart"></i>
                <p>Cart is empty</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = cart.map(item => `
        <div class="pos-cart-item">
            <div class="pos-cart-item-info">
                <div class="pos-cart-item-name">${escapeHtml(item.name)}</div>
                <div class="pos-cart-item-price">RM ${item.price.toFixed(2)}</div>
                ${item.memo ? `<div class="pos-cart-item-memo"><i class="fas fa-sticky-note"></i> ${escapeHtml(item.memo)}</div>` : ''}
            </div>
            <div class="pos-cart-item-qty">
                <button class="qty-btn" onclick="updateCartItemQuantity('${item.productId}', -1)">-</button>
                <input type="number" value="${item.quantity}" min="1" 
                    onchange="setCartItemQuantity('${item.productId}', this.value)">
                <button class="qty-btn" onclick="updateCartItemQuantity('${item.productId}', 1)">+</button>
            </div>
            <div class="pos-cart-item-total">
                RM ${(item.price * item.quantity).toFixed(2)}
            </div>
            <div class="pos-cart-item-actions">
                <button class="pos-memo-btn" onclick="showItemMemo('${item.productId}')" title="Add memo">
                    <i class="fas fa-sticky-note"></i>
                </button>
                <button class="pos-remove-btn" onclick="removeFromCart('${item.productId}')" title="Remove">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        </div>
    `).join('');
}

function updateCartTotals() {
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const taxRate = parseFloat(localStorage.getItem('ezcubic_tax_rate') || '0') / 100;
    const tax = subtotal * taxRate;
    const total = subtotal + tax;
    
    const subtotalEl = document.getElementById('posSubtotal');
    const taxEl = document.getElementById('posTax');
    const totalEl = document.getElementById('posTotal');
    
    if (subtotalEl) subtotalEl.textContent = `RM ${subtotal.toFixed(2)}`;
    if (taxEl) taxEl.textContent = `RM ${tax.toFixed(2)}`;
    if (totalEl) totalEl.textContent = `RM ${total.toFixed(2)}`;
    
    // Update item count
    const itemCount = cart.reduce((sum, item) => sum + item.quantity, 0);
    const itemCountEl = document.getElementById('posItemCount');
    if (itemCountEl) itemCountEl.textContent = `${itemCount} item${itemCount !== 1 ? 's' : ''}`;
}

// ==================== ITEM MEMO ====================
function showItemMemo(productId) {
    const item = cart.find(i => i.productId === productId);
    if (!item) return;
    
    currentItemMemo = productId;
    
    const modal = document.getElementById('itemMemoModal');
    if (modal) {
        document.getElementById('itemMemoText').value = item.memo || '';
        document.getElementById('itemMemoProductName').textContent = item.name;
        modal.style.display = 'flex';
    }
}

function closeItemMemoModal() {
    const modal = document.getElementById('itemMemoModal');
    if (modal) {
        modal.style.display = 'none';
    }
    currentItemMemo = null;
}

function saveItemMemo() {
    if (!currentItemMemo) return;
    
    const item = cart.find(i => i.productId === currentItemMemo);
    if (item) {
        item.memo = document.getElementById('itemMemoText').value.trim();
        renderCart();
    }
    
    closeItemMemoModal();
}

// ==================== HOLD/RECALL SALES ====================
function holdSale() {
    if (cart.length === 0) {
        showNotification('Cart is empty', 'warning');
        return;
    }
    
    const holdName = prompt('Enter a name for this held sale (optional):') || `Sale ${Date.now()}`;
    
    const heldSale = {
        id: 'HELD_' + Date.now(),
        name: holdName,
        customer: document.getElementById('posCustomer')?.value || '',
        salesperson: document.getElementById('posSalesperson')?.value || '',
        outlet: document.getElementById('posOutletFilter')?.value || 'all',
        items: [...cart],
        heldAt: new Date().toISOString()
    };
    
    heldSales.push(heldSale);
    saveHeldSales();
    
    // Clear cart
    cart = [];
    renderCart();
    updateCartTotals();
    
    showNotification(`Sale held as "${holdName}"`, 'success');
}

function showHeldSales() {
    const modal = document.getElementById('heldSalesModal');
    if (!modal) return;
    
    const container = document.getElementById('heldSalesList');
    if (!container) return;
    
    if (heldSales.length === 0) {
        container.innerHTML = `
            <div class="pos-cart-empty">
                <i class="fas fa-pause-circle"></i>
                <p>No held sales</p>
            </div>
        `;
    } else {
        container.innerHTML = heldSales.map(sale => {
            const itemCount = sale.items.reduce((sum, item) => sum + item.quantity, 0);
            const total = sale.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
            
            return `
                <div class="held-sale-item">
                    <div class="held-sale-info">
                        <div class="held-sale-name">${escapeHtml(sale.name)}</div>
                        <div class="held-sale-meta">
                            ${itemCount} item${itemCount !== 1 ? 's' : ''} • 
                            RM ${total.toFixed(2)} • 
                            ${new Date(sale.heldAt).toLocaleString()}
                        </div>
                    </div>
                    <div class="held-sale-actions">
                        <button class="btn btn-sm btn-primary" onclick="recallSale('${sale.id}')">
                            <i class="fas fa-undo"></i> Recall
                        </button>
                        <button class="btn btn-sm btn-outline" onclick="deleteHeldSale('${sale.id}')">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    }
    
    modal.style.display = 'flex';
}

function closeHeldSalesModal() {
    const modal = document.getElementById('heldSalesModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

function recallSale(saleId) {
    const heldSale = heldSales.find(s => s.id === saleId);
    if (!heldSale) return;
    
    // Warn if cart has items
    if (cart.length > 0) {
        if (!confirm('Current cart will be replaced. Continue?')) {
            return;
        }
    }
    
    // Restore cart and settings
    cart = [...heldSale.items];
    
    if (heldSale.customer && document.getElementById('posCustomer')) {
        document.getElementById('posCustomer').value = heldSale.customer;
    }
    if (heldSale.salesperson && document.getElementById('posSalesperson')) {
        document.getElementById('posSalesperson').value = heldSale.salesperson;
    }
    if (heldSale.outlet && document.getElementById('posOutletFilter')) {
        document.getElementById('posOutletFilter').value = heldSale.outlet;
    }
    
    // Remove from held sales
    heldSales = heldSales.filter(s => s.id !== saleId);
    saveHeldSales();
    
    renderCart();
    updateCartTotals();
    closeHeldSalesModal();
    
    showNotification(`Recalled sale: ${heldSale.name}`, 'success');
}

function deleteHeldSale(saleId) {
    if (!confirm('Delete this held sale?')) return;
    
    heldSales = heldSales.filter(s => s.id !== saleId);
    saveHeldSales();
    showHeldSales(); // Refresh list
    
    showNotification('Held sale deleted', 'success');
}

function updateHeldCount() {
    const badge = document.getElementById('heldSalesCount');
    if (badge) {
        badge.textContent = heldSales.length;
        badge.style.display = heldSales.length > 0 ? 'inline-block' : 'none';
    }
}

// ==================== CART DISCOUNT ====================
function applyDiscount(discountPercent) {
    if (cart.length === 0) {
        showNotification('Cart is empty', 'warning');
        return;
    }
    
    cart.forEach(item => {
        item.discount = discountPercent;
    });
    
    renderCart();
    updateCartTotals();
    showNotification(`${discountPercent}% discount applied`, 'success');
}

function clearDiscount() {
    cart.forEach(item => {
        item.discount = 0;
    });
    
    renderCart();
    updateCartTotals();
    showNotification('Discount cleared', 'success');
}

// ==================== WINDOW EXPORTS (Cart) ====================
window.cart = cart; // Expose cart array for other modules
window.addToCart = addToCart;
window.updateCartItemQuantity = updateCartItemQuantity;
window.setCartItemQuantity = setCartItemQuantity;
window.removeFromCart = removeFromCart;
window.clearCart = clearCart;
window.renderCart = renderCart;
window.updateCartTotals = updateCartTotals;
window.showItemMemo = showItemMemo;
window.closeItemMemoModal = closeItemMemoModal;
window.saveItemMemo = saveItemMemo;
window.holdSale = holdSale;
window.showHeldSales = showHeldSales;
window.closeHeldSalesModal = closeHeldSalesModal;
window.recallSale = recallSale;
window.deleteHeldSale = deleteHeldSale;
window.updateHeldCount = updateHeldCount;
window.applyDiscount = applyDiscount;
window.clearDiscount = clearDiscount;

// Expose cart getter for payment module
window.getCart = function() { return cart; };
window.setCart = function(newCart) { cart = newCart; };

console.log('POS Cart module loaded');
