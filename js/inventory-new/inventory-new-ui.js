/**
 * EZCubic Phase 2 - Inventory UI Module
 * Modals, rendering, search/filter, image handling
 * Version: 2.3.0 - Split from inventory-new.js
 */

// ==================== PRODUCT MODAL ====================
function showProductModal(productId = null) {
    console.log('showProductModal called with:', productId);
    
    if (typeof ensureDefaultHQExists === 'function') {
        ensureDefaultHQExists();
    }
    
    const modal = document.getElementById('productModal');
    const title = document.getElementById('productModalTitle');
    const form = document.getElementById('productForm');
    
    if (!modal) {
        console.error('Product modal not found');
        return;
    }
    
    if (form) {
        form.reset();
    }
    
    const productIdField = document.getElementById('productId');
    if (productIdField) {
        productIdField.value = '';
    }
    
    const imageDataField = document.getElementById('productImageData');
    if (imageDataField) {
        imageDataField.value = '';
    }
    
    clearProductImage();
    
    const skuPrefix = document.getElementById('productSKUPrefix');
    const skuNumber = document.getElementById('productSKUNumber');
    const skuHidden = document.getElementById('productSKU');
    if (skuPrefix) skuPrefix.value = 'EZ';
    if (skuNumber) skuNumber.value = '';
    if (skuHidden) skuHidden.value = '';
    
    const outletCheckboxes = document.querySelectorAll('#productOutletCheckboxes input[type="checkbox"]');
    outletCheckboxes.forEach(cb => cb.checked = false);
    
    loadProductSuppliers();
    loadBranchStockInputs(null);
    
    if (productId) {
        const stored = localStorage.getItem(PRODUCTS_KEY);
        if (stored) {
            products = JSON.parse(stored);
        }
        
        const product = products.find(p => p.id === productId);
        if (product) {
            title.textContent = 'Edit Product';
            document.getElementById('productId').value = product.id;
            document.getElementById('productName').value = product.name;
            
            if (product.sku && product.sku.includes('-')) {
                const [prefix, number] = product.sku.split('-');
                document.getElementById('productSKUPrefix').value = prefix;
                document.getElementById('productSKUNumber').value = number;
            } else {
                document.getElementById('productSKUPrefix').value = '';
                document.getElementById('productSKUNumber').value = product.sku || '';
            }
            document.getElementById('productSKU').value = product.sku;
            
            document.getElementById('productCategory').value = product.category;
            
            if (document.getElementById('productSupplier')) {
                document.getElementById('productSupplier').value = product.supplierId || '';
            }
            
            const productOutlets = product.outlets || (product.outlet ? [product.outlet] : ['all']);
            setSelectedOutlets(productOutlets);
            
            document.getElementById('productUnit').value = product.unit || 'pcs';
            document.getElementById('productCost').value = product.cost;
            document.getElementById('productPrice').value = product.price;
            document.getElementById('productStock').value = product.stock;
            document.getElementById('productMinStock').value = product.minStock || 5;
            document.getElementById('productTax').value = product.taxRate !== undefined ? product.taxRate : 6;
            document.getElementById('productDescription').value = product.description || '';
            
            loadBranchStockInputs(productId);
            
            if (product.image) {
                document.getElementById('productImageData').value = product.image;
                showImagePreview(product.image);
            }
        }
    } else {
        title.textContent = 'Add Product';
        document.getElementById('productTax').value = 6;
        document.getElementById('productSKUPrefix').value = 'EZ';
        generateSKU();
    }
    
    modal.classList.add('show');
}

function loadProductSuppliers() {
    const select = document.getElementById('productSupplier');
    if (!select) return;
    
    select.innerHTML = '<option value="">-- No Supplier --</option>';
    
    if (typeof suppliers !== 'undefined' && suppliers.length > 0) {
        const activeSuppliers = suppliers.filter(s => s.status === 'active');
        activeSuppliers.forEach(supplier => {
            const option = document.createElement('option');
            option.value = supplier.id;
            option.textContent = supplier.company || supplier.name;
            select.appendChild(option);
        });
    }
}

// ==================== PRODUCT IMAGE HANDLING ====================
function previewProductImage(input) {
    if (input.files && input.files[0]) {
        const file = input.files[0];
        
        if (!file.type.match('image.*')) {
            showNotification('Please select an image file', 'error');
            return;
        }
        
        if (file.size > 2 * 1024 * 1024) {
            showNotification('Image size should be less than 2MB', 'error');
            return;
        }
        
        const reader = new FileReader();
        reader.onload = function(e) {
            const imageData = e.target.result;
            document.getElementById('productImageData').value = imageData;
            showImagePreview(imageData);
        };
        reader.readAsDataURL(file);
    }
}

function showImagePreview(imageData) {
    const previewDiv = document.getElementById('productImagePreview');
    const clearBtn = document.getElementById('clearImageBtn');
    
    if (previewDiv && imageData) {
        previewDiv.innerHTML = `<img src="${imageData}" alt="Product Preview">`;
        previewDiv.classList.add('has-image');
        if (clearBtn) clearBtn.style.display = 'inline-flex';
    }
}

function clearProductImage() {
    const previewDiv = document.getElementById('productImagePreview');
    const imageInput = document.getElementById('productImage');
    const imageData = document.getElementById('productImageData');
    const clearBtn = document.getElementById('clearImageBtn');
    
    if (previewDiv) {
        previewDiv.innerHTML = `
            <i class="fas fa-image"></i>
            <span>No image</span>
        `;
        previewDiv.classList.remove('has-image');
    }
    if (imageInput) imageInput.value = '';
    if (imageData) imageData.value = '';
    if (clearBtn) clearBtn.style.display = 'none';
}

// ==================== COST CALCULATION UI ====================
function calculateProfitMargin() {
    const cost = parseFloat(document.getElementById('productCost').value) || 0;
    const price = parseFloat(document.getElementById('productPrice').value) || 0;
    const marginDisplay = document.getElementById('marginDisplay');
    const marginText = document.getElementById('profitMarginText');
    const amountText = document.getElementById('profitAmountText');
    
    if (cost > 0 && price > 0) {
        const profit = price - cost;
        const margin = ((profit / price) * 100).toFixed(1);
        
        if (marginDisplay) marginDisplay.style.display = 'block';
        if (marginText) {
            marginText.textContent = margin + '%';
            marginText.style.color = profit >= 0 ? '#10b981' : '#ef4444';
        }
        if (amountText) {
            amountText.textContent = profit.toFixed(2);
            amountText.style.color = profit >= 0 ? '#10b981' : '#ef4444';
        }
    } else {
        if (marginDisplay) marginDisplay.style.display = 'none';
    }
}

function suggestCostFromPrice() {
    const price = parseFloat(document.getElementById('productPrice').value) || 0;
    const targetMargin = parseFloat(document.getElementById('targetMargin')?.value) || 30;
    const costSuggestion = document.getElementById('costSuggestion');
    const suggestionText = document.getElementById('costSuggestionText');
    
    if (price > 0) {
        const suggestedCost = price * (1 - targetMargin / 100);
        
        if (costSuggestion && suggestionText) {
            costSuggestion.style.display = 'block';
            suggestionText.innerHTML = `Suggested cost at ${targetMargin}% margin: <strong>RM ${suggestedCost.toFixed(2)}</strong> 
                <a href="#" onclick="applySuggestedCost(); return false;" style="color: #3b82f6; text-decoration: underline;">Apply</a>`;
        }
        
        calculateProfitMargin();
    } else {
        if (costSuggestion) costSuggestion.style.display = 'none';
    }
}

function applySuggestedCost() {
    const price = parseFloat(document.getElementById('productPrice').value) || 0;
    const targetMargin = parseFloat(document.getElementById('targetMargin')?.value) || 30;
    const costField = document.getElementById('productCost');
    
    if (price > 0 && costField) {
        const suggestedCost = price * (1 - targetMargin / 100);
        costField.value = suggestedCost.toFixed(2);
        calculateProfitMargin();
        
        const costSuggestion = document.getElementById('costSuggestion');
        if (costSuggestion) costSuggestion.style.display = 'none';
        
        showToast(`Cost set to RM ${suggestedCost.toFixed(2)} (${targetMargin}% margin)`, 'success');
    } else {
        showToast('Please enter a selling price first', 'warning');
    }
}

function suggestCostFromSimilar() {
    const name = document.getElementById('productName')?.value || '';
    const category = document.getElementById('productCategory')?.value || '';
    const costField = document.getElementById('productCost');
    const costSuggestion = document.getElementById('costSuggestion');
    const suggestionText = document.getElementById('costSuggestionText');
    
    if (name.length > 2 && costField && !costField.value) {
        const suggestedCost = getLastKnownCost(name, category);
        
        if (suggestedCost && costSuggestion && suggestionText) {
            costSuggestion.style.display = 'block';
            suggestionText.innerHTML = `Similar items avg cost: <strong>RM ${suggestedCost.toFixed(2)}</strong> 
                <a href="#" onclick="document.getElementById('productCost').value='${suggestedCost.toFixed(2)}'; calculateProfitMargin(); return false;" style="color: #3b82f6; text-decoration: underline;">Use this</a>`;
        }
    }
}

// ==================== QUICK STOCK ADJUST ====================
function quickStockAdjust(productId) {
    const product = products.find(p => p.id === productId);
    if (!product) return;
    
    showStockAdjustmentModal();
    
    setTimeout(() => {
        const select = document.getElementById('adjustProductId');
        if (select) {
            select.value = productId;
            showCurrentStock();
        }
    }, 100);
}

// ==================== PRODUCT RENDERING ====================
let inventoryView = 'grid';

function setInventoryView(view) {
    inventoryView = view;
    
    document.querySelectorAll('.view-toggle-btn').forEach(btn => btn.classList.remove('active'));
    event.target.closest('.view-toggle-btn').classList.add('active');
    
    document.getElementById('productsGrid').style.display = view === 'grid' ? 'grid' : 'none';
    document.getElementById('productsTable').style.display = view === 'table' ? 'block' : 'none';
    
    renderProducts();
}

function renderProducts() {
    const searchTerm = document.getElementById('productSearch')?.value?.toLowerCase() || '';
    const categoryFilter = document.getElementById('categoryFilter')?.value || '';
    const stockFilter = document.getElementById('stockFilter')?.value || '';
    const branchFilter = document.getElementById('inventoryBranchFilter')?.value || '';
    
    let filtered = products.filter(p => {
        const matchesSearch = !searchTerm || 
            p.name.toLowerCase().includes(searchTerm) ||
            p.sku.toLowerCase().includes(searchTerm) ||
            (p.description && p.description.toLowerCase().includes(searchTerm));
        
        const matchesCategory = !categoryFilter || p.category === categoryFilter;
        
        let stockToCheck = p.stock;
        if (branchFilter && p.branchStock) {
            stockToCheck = p.branchStock[branchFilter] || 0;
        }
        
        let matchesStock = true;
        if (stockFilter === 'instock') matchesStock = stockToCheck > p.minStock;
        else if (stockFilter === 'lowstock') matchesStock = stockToCheck > 0 && stockToCheck <= p.minStock;
        else if (stockFilter === 'outofstock') matchesStock = stockToCheck === 0;
        
        let matchesBranch = true;
        if (branchFilter) {
            if (p.outlets && !p.outlets.includes('all') && !p.outlets.includes(branchFilter)) {
                matchesBranch = false;
            }
        }
        
        return matchesSearch && matchesCategory && matchesStock && matchesBranch;
    });
    
    filtered.sort((a, b) => a.name.localeCompare(b.name));
    
    if (inventoryView === 'grid') {
        renderProductsGrid(filtered);
    } else {
        renderProductsTable(filtered);
    }
}

function renderProductsGrid(productsList) {
    const container = document.getElementById('productsGrid');
    const branchFilter = document.getElementById('inventoryBranchFilter')?.value || '';
    
    if (productsList.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-box-open"></i>
                <h3>${products.length === 0 ? 'No Products Yet' : 'No Products Found'}</h3>
                <p>${products.length === 0 ? 'Add your first product to start managing inventory' : 'Try adjusting your search or filters'}</p>
                ${products.length === 0 ? `<button class="btn-primary" onclick="showProductModal()">
                    <i class="fas fa-plus"></i> Add Product
                </button>` : ''}
            </div>
        `;
        return;
    }
    
    container.innerHTML = productsList.map(product => {
        let displayStock = product.stock;
        if (branchFilter && product.branchStock) {
            displayStock = product.branchStock[branchFilter] || 0;
        }
        
        const stockStatus = getStockStatusForQty(displayStock, product.minStock);
        const taxRate = product.taxRate !== undefined ? product.taxRate : 6;
        const branchStockBadges = !branchFilter ? getBranchStockBadges(product) : '';
        
        return `
            <div class="product-card ${stockStatus.class}">
                <div class="product-card-header">
                    <span class="product-category">${product.category}</span>
                    <span class="product-sku">${product.sku}</span>
                </div>
                <h3 class="product-name">${escapeHtml(product.name)}</h3>
                <div class="product-prices">
                    <div class="cost-price">
                        <span class="label">Cost</span>
                        <span class="value">RM ${product.cost.toFixed(2)}</span>
                    </div>
                    <div class="sell-price">
                        <span class="label">Price</span>
                        <span class="value">RM ${product.price.toFixed(2)}</span>
                    </div>
                    <div class="margin">
                        <span class="label">Tax</span>
                        <span class="value ${taxRate === 0 ? 'tax-exempt' : ''}">${taxRate === 0 ? 'Exempt' : taxRate + '%'}</span>
                    </div>
                </div>
                <div class="product-stock">
                    <span class="stock-badge ${stockStatus.class}">
                        <i class="fas ${stockStatus.icon}"></i> ${stockStatus.text}
                    </span>
                    <span class="stock-count">${displayStock} ${product.unit}</span>
                </div>
                ${branchStockBadges ? `<div class="stock-by-branch">${branchStockBadges}</div>` : ''}
                <div class="product-actions">
                    <button class="btn-outline btn-sm" onclick="showProductModal('${product.id}')" title="Edit">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-outline btn-sm" onclick="quickStockAdjust('${product.id}')" title="Adjust Stock">
                        <i class="fas fa-boxes"></i>
                    </button>
                    <button class="btn-outline btn-sm danger" onclick="deleteProduct('${product.id}')" title="Delete">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

function renderProductsTable(productsList) {
    const tbody = document.getElementById('productsTableBody');
    const branchFilter = document.getElementById('inventoryBranchFilter')?.value || '';
    
    if (productsList.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" style="text-align: center; padding: 40px; color: #94a3b8;">
                    <i class="fas fa-box-open" style="font-size: 48px; margin-bottom: 15px; opacity: 0.5;"></i>
                    <p>${products.length === 0 ? 'No products yet. Add your first product!' : 'No products found matching your criteria'}</p>
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = productsList.map(product => {
        let displayStock = product.stock;
        if (branchFilter && product.branchStock) {
            displayStock = product.branchStock[branchFilter] || 0;
        }
        
        const stockStatus = getStockStatusForQty(displayStock, product.minStock);
        const branchStockBadges = !branchFilter ? getBranchStockBadges(product) : '';
        
        return `
            <tr>
                <td>
                    <div style="font-weight: 500;">${escapeHtml(product.name)}</div>
                    ${product.description ? `<div style="font-size: 12px; color: #94a3b8;">${escapeHtml(product.description.substring(0, 50))}${product.description.length > 50 ? '...' : ''}</div>` : ''}
                </td>
                <td><code style="background: rgba(99, 102, 241, 0.1); padding: 2px 6px; border-radius: 4px;">${product.sku}</code></td>
                <td>${product.category}</td>
                <td>RM ${product.cost.toFixed(2)}</td>
                <td>RM ${product.price.toFixed(2)}</td>
                <td>
                    <div>${displayStock} ${product.unit}</div>
                    ${branchStockBadges ? `<div class="stock-by-branch" style="margin-top: 4px;">${branchStockBadges}</div>` : ''}
                </td>
                <td><span class="stock-badge ${stockStatus.class}">${stockStatus.text}</span></td>
                <td>
                    <div style="display: flex; gap: 5px;">
                        <button class="btn-outline btn-sm" onclick="showProductModal('${product.id}')" title="Edit">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn-outline btn-sm danger" onclick="deleteProduct('${product.id}')" title="Delete">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

// ==================== SEARCH & FILTER ====================
function searchProducts(term) {
    renderProducts();
}

function filterProducts() {
    renderProducts();
}

function filterByCategory() {
    filterProducts();
}

// ==================== BRANCH STOCK UI ====================
function loadBranchStockInputs(productId = null) {
    console.log('=== loadBranchStockInputs called ===');
    const container = document.getElementById('branchStockInputs');
    if (!container) {
        console.log('Container not found!');
        return;
    }
    
    const currentUserPlan = window.currentUser?.plan || 'starter';
    const currentUserRole = window.currentUser?.role || '';
    const isMultiBranchPlan = ['founder', 'erp_assistant', 'professional', 'enterprise'].includes(currentUserPlan) ||
                              ['founder', 'erp_assistant'].includes(currentUserRole);
    
    // Get branches/outlets from multiple sources
    let branchList = [];
    const user = window.currentUser;
    
    // PRIORITY 1: Get branches from tenant storage
    if (user && user.tenantId) {
        const tenantKey = 'ezcubic_tenant_' + user.tenantId;
        const tenantData = JSON.parse(localStorage.getItem(tenantKey) || '{}');
        
        if (Array.isArray(tenantData.branches) && tenantData.branches.length > 0) {
            branchList = tenantData.branches;
        }
        
        if (Array.isArray(tenantData.outlets) && tenantData.outlets.length > branchList.length) {
            branchList = tenantData.outlets.map(o => ({
                id: o.id,
                name: o.name,
                code: o.code || o.name.substring(0, 3).toUpperCase(),
                status: o.status || 'active',
                type: o.type || 'outlet'
            }));
        }
    }
    
    // PRIORITY 2: Fall back to window.branches or window.outlets
    if (branchList.length === 0) {
        if (window.branches && window.branches.length > 0) {
            branchList = window.branches;
        } else if (window.outlets && window.outlets.length > 0) {
            branchList = window.outlets.map(o => ({
                id: o.id,
                name: o.name,
                code: o.code || o.name.substring(0, 3).toUpperCase(),
                status: o.status || 'active',
                type: o.type || 'outlet'
            }));
        }
    }
    
    // PRIORITY 3: Fall back to localStorage keys
    if (branchList.length === 0) {
        const storedBranches = localStorage.getItem('ezcubic_branches');
        if (storedBranches) {
            branchList = JSON.parse(storedBranches);
        }
        
        if (branchList.length === 0) {
            const storedOutlets = localStorage.getItem('ezcubic_outlets');
            if (storedOutlets) {
                const outlets = JSON.parse(storedOutlets);
                branchList = outlets.map(o => ({
                    id: o.id,
                    name: o.name,
                    code: o.code || o.name.substring(0, 3).toUpperCase(),
                    status: o.status || 'active',
                    type: o.type || 'outlet'
                }));
            }
        }
    }
    
    // PRIORITY 4: Fall back to module variables
    if (branchList.length === 0) {
        if (typeof branches !== 'undefined' && branches.length > 0) {
            branchList = branches;
        } else if (typeof outlets !== 'undefined' && outlets.length > 0) {
            branchList = outlets.map(o => ({
                id: o.id,
                name: o.name,
                code: o.code || o.name.substring(0, 3).toUpperCase(),
                status: o.status || 'active',
                type: o.type || 'outlet'
            }));
        }
    }
    
    const activeBranches = branchList.filter(b => b.status === 'active');
    
    // Helper to get products from tenant storage
    function getProductsFromTenant() {
        const user = window.currentUser;
        if (user && user.tenantId) {
            const tenantKey = 'ezcubic_tenant_' + user.tenantId;
            const tenantData = JSON.parse(localStorage.getItem(tenantKey) || '{}');
            if (Array.isArray(tenantData.products) && tenantData.products.length > 0) {
                return tenantData.products;
            }
        }
        const storedProducts = localStorage.getItem(PRODUCTS_KEY);
        return storedProducts ? JSON.parse(storedProducts) : [];
    }
    
    // If not multi-branch plan OR no branches, show simple input
    if (!isMultiBranchPlan || activeBranches.length === 0) {
        let currentStock = 0;
        if (productId) {
            const freshProducts = getProductsFromTenant();
            const product = freshProducts.find(p => p.id === productId);
            if (product) {
                currentStock = product.stock || 0;
            }
        }
        
        container.innerHTML = `
            <div style="grid-column: 1/-1; padding: 15px; background: #f8fafc; border-radius: 8px;">
                <div style="display: flex; align-items: center; gap: 10px;">
                    <label style="font-weight: 500; color: #334155;">Stock Quantity:</label>
                    <input type="number" id="singleBranchStock" class="form-control" 
                           min="0" value="${currentStock}" placeholder="0" 
                           style="width: 120px;"
                           onchange="document.getElementById('productStock').value = this.value">
                </div>
                ${!isMultiBranchPlan ? `
                <small style="color: #64748b; margin-top: 8px; display: block;">
                    <i class="fas fa-info-circle"></i> Multi-branch stock management is available on Professional plan and above.
                </small>
                ` : ''}
            </div>
        `;
        const totalStockField = document.getElementById('productStock');
        if (totalStockField) totalStockField.value = currentStock;
        return;
    }
    
    // Get existing stock for this product
    let productBranchStock = {};
    if (productId) {
        const freshProducts = getProductsFromTenant();
        const product = freshProducts.find(p => p.id === productId);
        if (product && product.branchStock) {
            productBranchStock = product.branchStock;
        }
    }
    
    const minStock = parseInt(document.getElementById('productMinStock')?.value) || 5;
    
    container.innerHTML = activeBranches.map(branch => {
        const stockQty = productBranchStock[branch.id] || 0;
        let statusClass = '';
        if (stockQty === 0) statusClass = 'out-of-stock';
        else if (stockQty <= minStock) statusClass = 'low-stock';
        
        return `
            <div class="branch-stock-item ${statusClass}" data-branch-id="${branch.id}">
                <div class="branch-label">
                    <i class="fas fa-store"></i>
                    <span>${escapeHtml(branch.name)}</span>
                    <span class="branch-code">${escapeHtml(branch.code)}</span>
                </div>
                <input type="number" 
                       class="branch-stock-input" 
                       data-branch-id="${branch.id}"
                       min="0" 
                       value="${stockQty}" 
                       placeholder="0"
                       onchange="updateTotalStock(); updateBranchStockStatus(this)">
            </div>
        `;
    }).join('');
    
    updateTotalStock();
}

function updateBranchStockStatus(input) {
    const item = input.closest('.branch-stock-item');
    if (!item) return;
    
    const qty = parseInt(input.value) || 0;
    const minStock = parseInt(document.getElementById('productMinStock')?.value) || 5;
    
    item.classList.remove('low-stock', 'out-of-stock');
    if (qty === 0) {
        item.classList.add('out-of-stock');
    } else if (qty <= minStock) {
        item.classList.add('low-stock');
    }
}

// ==================== WINDOW EXPORTS ====================
window.showProductModal = showProductModal;
window.loadProductSuppliers = loadProductSuppliers;
window.previewProductImage = previewProductImage;
window.showImagePreview = showImagePreview;
window.clearProductImage = clearProductImage;
window.calculateProfitMargin = calculateProfitMargin;
window.suggestCostFromPrice = suggestCostFromPrice;
window.applySuggestedCost = applySuggestedCost;
window.suggestCostFromSimilar = suggestCostFromSimilar;
window.quickStockAdjust = quickStockAdjust;
window.setInventoryView = setInventoryView;
window.renderProducts = renderProducts;
window.renderProductsGrid = renderProductsGrid;
window.renderProductsTable = renderProductsTable;
window.searchProducts = searchProducts;
window.filterProducts = filterProducts;
window.filterByCategory = filterByCategory;
window.loadBranchStockInputs = loadBranchStockInputs;
window.updateBranchStockStatus = updateBranchStockStatus;
