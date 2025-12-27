/**
 * EZCubic Phase 2 - Inventory Management Module
 * Product CRUD, categories, SKU generation, search/filter
 * Phase 5: Multi-Branch Stock Support
 * Version: 2.1.10 - Fixed modal issues - 17 Dec 2025 - Build 1765953999
 */

// Prevent caching - timestamp: 1765953999

// ==================== INVENTORY INITIALIZATION ====================
function initializeInventory() {
    loadProducts();
    loadCategories();
    loadInventoryBranchFilter();
    updateInventoryStats();
}

// Load branches into inventory filter dropdown
function loadInventoryBranchFilter() {
    const filter = document.getElementById('inventoryBranchFilter');
    if (!filter) return;
    
    filter.innerHTML = '<option value="">All Branches/Outlets</option>';
    
    // Get branches from branches module
    const branchList = typeof branches !== 'undefined' ? branches : [];
    const activeBranches = branchList.filter(b => b.status === 'active');
    
    activeBranches.forEach(branch => {
        const option = document.createElement('option');
        option.value = branch.id;
        option.textContent = `${branch.name} (${branch.code})`;
        filter.appendChild(option);
    });
}

// ==================== PRODUCT CRUD ====================
function loadProducts() {
    console.log('📦 loadProducts called');
    
    // PRIORITY 1: Load from tenant storage directly (most reliable)
    const user = window.currentUser;
    if (user && user.tenantId) {
        const tenantKey = 'ezcubic_tenant_' + user.tenantId;
        const tenantData = JSON.parse(localStorage.getItem(tenantKey) || '{}');
        console.log('📦 Tenant data products:', tenantData.products?.length || 0);
        if (Array.isArray(tenantData.products) && tenantData.products.length > 0) {
            products = tenantData.products;
            window.products = products;
            // Also sync to businessData if it exists
            if (typeof businessData !== 'undefined') {
                businessData.products = products;
            }
            console.log('✅ Products loaded from tenant:', products.length);
            renderProducts();
            return;
        }
    }
    
    // PRIORITY 2: Check window.products
    if (Array.isArray(window.products) && window.products.length > 0) {
        products = window.products;
        console.log('✅ Products loaded from window:', products.length);
    } else {
        // PRIORITY 3: Load from localStorage
        const stored = localStorage.getItem(PRODUCTS_KEY);
        if (stored) {
            const parsed = JSON.parse(stored);
            if (Array.isArray(parsed) && parsed.length > 0) {
                products = parsed;
                console.log('✅ Products loaded from localStorage key:', products.length);
            }
        }
    }
    
    // Sync everywhere
    window.products = products;
    if (typeof businessData !== 'undefined') {
        businessData.products = products;
    }
    
    console.log('📦 Final products count:', products.length);
    renderProducts();
}

function saveProducts() {
    console.log('💾 saveProducts called, products:', products.length, products.map(p => ({name: p.name, stock: p.stock, branchStock: p.branchStock})));
    
    localStorage.setItem(PRODUCTS_KEY, JSON.stringify(products));
    updateInventoryStats();
    updateLowStockBadge();
    
    // Sync to window for tenant save
    window.products = products;
    
    // Also sync to businessData
    if (typeof businessData !== 'undefined') {
        businessData.products = products;
    }
    
    // DIRECT tenant save
    const user = window.currentUser;
    if (user && user.tenantId) {
        const tenantKey = 'ezcubic_tenant_' + user.tenantId;
        let tenantData = JSON.parse(localStorage.getItem(tenantKey) || '{}');
        tenantData.products = products;
        tenantData.updatedAt = new Date().toISOString();
        localStorage.setItem(tenantKey, JSON.stringify(tenantData));
        console.log('✅ Products saved directly to tenant:', products.length);
    }
    
    // Note: Don't call saveToUserTenant - it would overwrite with stale data
}

function showProductModal(productId = null) {
    console.log('showProductModal called with:', productId);
    
    // Ensure HQ branch exists for stock allocation
    if (typeof ensureDefaultHQExists === 'function') {
        ensureDefaultHQExists();
    }
    
    const modal = document.getElementById('productModal');
    const title = document.getElementById('productModalTitle');
    const form = document.getElementById('productForm');
    
    console.log('Modal element:', modal);
    console.log('Form element:', form);
    
    if (!modal) {
        console.error('Product modal not found');
        return;
    }
    
    // Always reset form first
    if (form) {
        form.reset();
        console.log('Form reset successfully');
    } else {
        console.error('Form not found - cannot reset');
    }
    
    // Clear hidden fields
    const productIdField = document.getElementById('productId');
    if (productIdField) {
        productIdField.value = '';
    }
    
    // Clear image data
    const imageDataField = document.getElementById('productImageData');
    if (imageDataField) {
        imageDataField.value = '';
    }
    
    clearProductImage(); // Reset image preview
    
    // Clear SKU fields
    const skuPrefix = document.getElementById('productSKUPrefix');
    const skuNumber = document.getElementById('productSKUNumber');
    const skuHidden = document.getElementById('productSKU');
    if (skuPrefix) skuPrefix.value = 'EZ';
    if (skuNumber) skuNumber.value = '';
    if (skuHidden) skuHidden.value = '';
    
    // Reset outlet checkboxes
    const outletCheckboxes = document.querySelectorAll('#productOutletCheckboxes input[type="checkbox"]');
    outletCheckboxes.forEach(cb => cb.checked = false);
    
    // Load suppliers dropdown fresh
    loadProductSuppliers();
    
    // Load branch stock inputs fresh (pass null first to clear, then product ID)
    loadBranchStockInputs(null);
    
    if (productId) {
        // Edit mode - reload products array to ensure we have latest data
        const stored = localStorage.getItem(PRODUCTS_KEY);
        if (stored) {
            products = JSON.parse(stored);
        }
        
        const product = products.find(p => p.id === productId);
        if (product) {
            title.textContent = 'Edit Product';
            document.getElementById('productId').value = product.id;
            document.getElementById('productName').value = product.name;
            
            // Split SKU into prefix and number
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
            
            // Set supplier
            if (document.getElementById('productSupplier')) {
                document.getElementById('productSupplier').value = product.supplierId || '';
            }
            
            // Load selected outlets (supports both old single value and new array)
            const productOutlets = product.outlets || (product.outlet ? [product.outlet] : ['all']);
            setSelectedOutlets(productOutlets);
            
            document.getElementById('productUnit').value = product.unit || 'pcs';
            document.getElementById('productCost').value = product.cost;
            document.getElementById('productPrice').value = product.price;
            document.getElementById('productStock').value = product.stock;
            document.getElementById('productMinStock').value = product.minStock || 5;
            document.getElementById('productTax').value = product.taxRate !== undefined ? product.taxRate : 6;
            document.getElementById('productDescription').value = product.description || '';
            
            // Load branch stock inputs with product data
            loadBranchStockInputs(productId);
            
            // Load product image if exists
            if (product.image) {
                document.getElementById('productImageData').value = product.image;
                showImagePreview(product.image);
            }
        }
    } else {
        // Add mode
        title.textContent = 'Add Product';
        document.getElementById('productTax').value = 6; // Default 6% tax
        document.getElementById('productSKUPrefix').value = 'EZ'; // Default prefix
        generateSKU();
    }
    
    modal.classList.add('show');
}

// Load suppliers into product dropdown
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

function saveProduct(event) {
    event.preventDefault();
    
    const id = document.getElementById('productId').value;
    const imageData = document.getElementById('productImageData').value;
    
    // Combine SKU from prefix and number fields
    updateCombinedSKU();
    
    // Get selected outlets as array
    const selectedOutlets = getSelectedOutlets();
    
    // Get supplier ID
    const supplierId = document.getElementById('productSupplier')?.value || '';
    
    // Get branch-specific stock
    const branchStockData = getBranchStockFromInputs();
    const totalStock = Object.values(branchStockData).reduce((sum, qty) => sum + qty, 0);
    
    const productData = {
        name: document.getElementById('productName').value.trim(),
        sku: document.getElementById('productSKU').value.trim() || generateSKU(true),
        category: document.getElementById('productCategory').value,
        supplierId: supplierId,
        outlets: selectedOutlets,
        unit: document.getElementById('productUnit').value,
        cost: parseFloat(document.getElementById('productCost').value) || 0,
        price: parseFloat(document.getElementById('productPrice').value) || 0,
        stock: totalStock, // Total stock across all branches
        branchStock: branchStockData, // Stock per branch
        minStock: parseInt(document.getElementById('productMinStock').value) || 5,
        taxRate: parseFloat(document.getElementById('productTax').value) || 0,
        description: document.getElementById('productDescription').value.trim(),
        image: imageData || null,
        updatedAt: new Date().toISOString()
    };
    
    if (id) {
        // Update existing product
        const index = products.findIndex(p => p.id === id);
        if (index !== -1) {
            const oldStock = products[index].stock;
            const oldBranchStock = products[index].branchStock || {};
            products[index] = { ...products[index], ...productData };
            
            // Record stock adjustment per branch if changed
            Object.keys(branchStockData).forEach(branchId => {
                const oldQty = oldBranchStock[branchId] || 0;
                const newQty = branchStockData[branchId] || 0;
                if (oldQty !== newQty) {
                    const branchName = getBranchNameForStock(branchId);
                    recordStockMovement({
                        productId: id,
                        productName: productData.name,
                        type: 'adjustment',
                        quantity: newQty - oldQty,
                        branchId: branchId,
                        branchName: branchName,
                        reason: 'Product edit',
                        notes: `Stock at ${branchName} adjusted from ${oldQty} to ${newQty}`
                    });
                }
            });
            
            // Also update branch stock in branches module
            saveBranchStockData(id, branchStockData);
        }
        showToast('Product updated successfully!', 'success');
    } else {
        // Create new product
        const newProduct = {
            id: generateUUID(),
            ...productData,
            createdAt: new Date().toISOString()
        };
        products.push(newProduct);
        
        // Record initial stock per branch
        Object.keys(branchStockData).forEach(branchId => {
            const qty = branchStockData[branchId] || 0;
            if (qty > 0) {
                const branchName = getBranchNameForStock(branchId);
                recordStockMovement({
                    productId: newProduct.id,
                    productName: productData.name,
                    type: 'in',
                    quantity: qty,
                    branchId: branchId,
                    branchName: branchName,
                    reason: 'Initial stock',
                    notes: `Initial stock at ${branchName}`
                });
            }
        });
        
        // Save branch stock data
        saveBranchStockData(newProduct.id, branchStockData);
        
        showToast('Product added successfully!', 'success');
    }
    
    saveProducts();
    renderProducts();
    closeModal('productModal');
}

function deleteProduct(productId) {
    const product = products.find(p => p.id === productId);
    if (!product) return;
    
    if (confirm(`Are you sure you want to delete "${product.name}"?\n\nThis will also remove all stock history for this product.`)) {
        products = products.filter(p => p.id !== productId);
        stockMovements = stockMovements.filter(m => m.productId !== productId);
        
        saveProducts();
        localStorage.setItem(STOCK_MOVEMENTS_KEY, JSON.stringify(stockMovements));
        
        renderProducts();
        showToast('Product deleted successfully!', 'info');
    }
}

// ==================== SKU GENERATION ====================
function generateSKU(returnOnly = false) {
    const prefixField = document.getElementById('productSKUPrefix');
    const prefix = prefixField?.value.trim().toUpperCase() || 'EZ';
    
    // Generate sequential number based on existing products with same prefix
    const existingNumbers = products
        .filter(p => p.sku && p.sku.startsWith(prefix + '-'))
        .map(p => parseInt(p.sku.split('-')[1]) || 0);
    
    const nextNumber = existingNumbers.length > 0 ? Math.max(...existingNumbers) + 1 : 1;
    const numberStr = nextNumber.toString().padStart(3, '0');
    const sku = `${prefix}-${numberStr}`;
    
    if (returnOnly) {
        return sku;
    }
    
    if (prefixField) prefixField.value = prefix;
    document.getElementById('productSKUNumber').value = numberStr;
    updateCombinedSKU();
    return sku;
}

function updateCombinedSKU() {
    const prefix = document.getElementById('productSKUPrefix')?.value.trim().toUpperCase() || '';
    const number = document.getElementById('productSKUNumber')?.value.trim() || '';
    const combined = prefix && number ? `${prefix}-${number}` : (prefix || number);
    document.getElementById('productSKU').value = combined;
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
        
        // Get stock for filtering - either branch-specific or total
        let stockToCheck = p.stock;
        if (branchFilter && p.branchStock) {
            stockToCheck = p.branchStock[branchFilter] || 0;
        }
        
        let matchesStock = true;
        if (stockFilter === 'instock') matchesStock = stockToCheck > p.minStock;
        else if (stockFilter === 'lowstock') matchesStock = stockToCheck > 0 && stockToCheck <= p.minStock;
        else if (stockFilter === 'outofstock') matchesStock = stockToCheck === 0;
        
        // Filter by branch availability
        let matchesBranch = true;
        if (branchFilter) {
            // Product should be available at this branch (check outlets array or branchStock)
            if (p.outlets && !p.outlets.includes('all') && !p.outlets.includes(branchFilter)) {
                matchesBranch = false;
            }
        }
        
        return matchesSearch && matchesCategory && matchesStock && matchesBranch;
    });
    
    // Sort by name
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
        // Get stock based on branch filter
        let displayStock = product.stock;
        if (branchFilter && product.branchStock) {
            displayStock = product.branchStock[branchFilter] || 0;
        }
        
        const stockStatus = getStockStatusForQty(displayStock, product.minStock);
        const margin = ((product.price - product.cost) / product.price * 100).toFixed(0);
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
        // Get stock based on branch filter
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

function getStockStatus(product) {
    if (product.stock === 0) {
        return { class: 'out-of-stock', text: 'Out of Stock', icon: 'fa-times-circle' };
    } else if (product.stock <= product.minStock) {
        return { class: 'low-stock', text: 'Low Stock', icon: 'fa-exclamation-triangle' };
    }
    return { class: 'in-stock', text: 'In Stock', icon: 'fa-check-circle' };
}

function getStockStatusForQty(stock, minStock) {
    if (stock === 0) {
        return { class: 'out-of-stock', text: 'Out of Stock', icon: 'fa-times-circle' };
    } else if (stock <= minStock) {
        return { class: 'low-stock', text: 'Low Stock', icon: 'fa-exclamation-triangle' };
    }
    return { class: 'in-stock', text: 'In Stock', icon: 'fa-check-circle' };
}

// ==================== SEARCH & FILTER ====================
function searchProducts(term) {
    renderProducts();
}

function filterProducts() {
    renderProducts();
}

// Alias for filterByCategory
function filterByCategory() {
    filterProducts();
}

// ==================== CATEGORIES ====================
function loadCategories() {
    const categoryFilter = document.getElementById('categoryFilter');
    if (!categoryFilter) return;
    
    // Get unique categories from products
    const usedCategories = [...new Set(products.map(p => p.category))];
    
    // Combine with default categories
    const allCategories = [...new Set([...categories, ...usedCategories])].sort();
    
    categoryFilter.innerHTML = '<option value="">All Categories</option>' +
        allCategories.map(cat => `<option value="${cat}">${cat}</option>`).join('');
}

// ==================== INVENTORY STATS ====================
function updateInventoryStats() {
    const totalProducts = products.length;
    const totalStockValue = products.reduce((sum, p) => sum + (p.cost * p.stock), 0);
    const lowStockItems = products.filter(p => p.stock > 0 && p.stock <= p.minStock).length;
    const outOfStockItems = products.filter(p => p.stock === 0).length;
    
    const totalProductsEl = document.getElementById('totalProducts');
    const totalStockValueEl = document.getElementById('totalStockValue');
    const lowStockCountEl = document.getElementById('lowStockCount');
    const outOfStockCountEl = document.getElementById('outOfStockCount');
    
    if (totalProductsEl) totalProductsEl.textContent = totalProducts;
    if (totalStockValueEl) totalStockValueEl.textContent = formatMYR(totalStockValue);
    if (lowStockCountEl) lowStockCountEl.textContent = lowStockItems;
    if (outOfStockCountEl) outOfStockCountEl.textContent = outOfStockItems;
}

function updateLowStockBadge() {
    const badge = document.getElementById('lowStockBadge');
    if (!badge) return;
    
    const lowStockCount = products.filter(p => p.stock <= p.minStock).length;
    
    if (lowStockCount > 0) {
        badge.textContent = lowStockCount;
        badge.style.display = 'flex';
    } else {
        badge.style.display = 'none';
    }
}

// ==================== QUICK STOCK ADJUST ====================
function quickStockAdjust(productId) {
    const product = products.find(p => p.id === productId);
    if (!product) return;
    
    // Pre-fill the stock adjustment modal
    showStockAdjustmentModal();
    
    setTimeout(() => {
        const select = document.getElementById('adjustProductId');
        if (select) {
            select.value = productId;
            showCurrentStock();
        }
    }, 100);
}

// ==================== PRODUCT IMAGE HANDLING ====================
function previewProductImage(input) {
    if (input.files && input.files[0]) {
        const file = input.files[0];
        
        // Validate file type
        if (!file.type.match('image.*')) {
            showNotification('Please select an image file', 'error');
            return;
        }
        
        // Validate file size (max 2MB)
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

// ==================== COST CALCULATION HELPERS ====================

/**
 * Calculate profit margin when cost is entered
 */
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

/**
 * Suggest cost price based on selling price and target margin
 */
function suggestCostFromPrice() {
    const price = parseFloat(document.getElementById('productPrice').value) || 0;
    const targetMargin = parseFloat(document.getElementById('targetMargin')?.value) || 30;
    const costSuggestion = document.getElementById('costSuggestion');
    const suggestionText = document.getElementById('costSuggestionText');
    
    if (price > 0) {
        // Calculate suggested cost based on target margin
        // margin% = (price - cost) / price * 100
        // cost = price * (1 - margin/100)
        const suggestedCost = price * (1 - targetMargin / 100);
        
        if (costSuggestion && suggestionText) {
            costSuggestion.style.display = 'block';
            suggestionText.innerHTML = `Suggested cost at ${targetMargin}% margin: <strong>RM ${suggestedCost.toFixed(2)}</strong> 
                <a href="#" onclick="applySuggestedCost(); return false;" style="color: #3b82f6; text-decoration: underline;">Apply</a>`;
        }
        
        // Also recalculate current margin if cost is already filled
        calculateProfitMargin();
    } else {
        if (costSuggestion) costSuggestion.style.display = 'none';
    }
}

/**
 * Apply the suggested cost to the cost field
 */
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

/**
 * Get last known cost for a product by name/category for suggestion
 */
function getLastKnownCost(productName, category) {
    // Find similar products to suggest cost
    const similar = products.filter(p => 
        p.category === category || 
        p.name.toLowerCase().includes(productName.toLowerCase().split(' ')[0])
    );
    
    if (similar.length > 0) {
        // Return average cost of similar products
        const avgCost = similar.reduce((sum, p) => sum + (p.cost || 0), 0) / similar.length;
        return avgCost > 0 ? avgCost : null;
    }
    return null;
}

/**
 * Suggest cost from similar products when product name changes
 */
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

// ==================== BRANCH STOCK FUNCTIONS ====================

/**
 * Load branch stock input fields in product modal
 */
function loadBranchStockInputs(productId = null) {
    console.log('=== loadBranchStockInputs called ===');
    const container = document.getElementById('branchStockInputs');
    if (!container) {
        console.log('Container not found!');
        return;
    }
    
    // Check if multi-branch is available on current plan OR role
    const currentUserPlan = window.currentUser?.plan || 'starter';
    const currentUserRole = window.currentUser?.role || '';
    // Include founder, erp_assistant roles OR professional, enterprise plans for multi-branch
    const isMultiBranchPlan = ['founder', 'erp_assistant', 'professional', 'enterprise'].includes(currentUserPlan) ||
                              ['founder', 'erp_assistant'].includes(currentUserRole);
    console.log('Plan check:', { currentUserPlan, currentUserRole, isMultiBranchPlan, windowCurrentUser: !!window.currentUser });
    
    // Get branches/outlets from multiple sources
    let branchList = [];
    const user = window.currentUser;
    
    // PRIORITY 1: Get branches from tenant storage
    if (user && user.tenantId) {
        const tenantKey = 'ezcubic_tenant_' + user.tenantId;
        const tenantData = JSON.parse(localStorage.getItem(tenantKey) || '{}');
        
        // Check branches first
        if (Array.isArray(tenantData.branches) && tenantData.branches.length > 0) {
            branchList = tenantData.branches;
            console.log('Branches loaded from tenant:', branchList.length);
        }
        
        // ALSO check outlets from tenant - they might have more than branches
        if (Array.isArray(tenantData.outlets) && tenantData.outlets.length > branchList.length) {
            // Convert outlets to branch format if they have more data
            branchList = tenantData.outlets.map(o => ({
                id: o.id,
                name: o.name,
                code: o.code || o.name.substring(0, 3).toUpperCase(),
                status: o.status || 'active',
                type: o.type || 'outlet'
            }));
            console.log('Using outlets from tenant instead:', branchList.length);
        }
    }
    
    // PRIORITY 2: Fall back to window.branches or window.outlets
    if (branchList.length === 0) {
        if (window.branches && window.branches.length > 0) {
            branchList = window.branches;
            console.log('Branches loaded from window:', branchList.length);
        } else if (window.outlets && window.outlets.length > 0) {
            branchList = window.outlets.map(o => ({
                id: o.id,
                name: o.name,
                code: o.code || o.name.substring(0, 3).toUpperCase(),
                status: o.status || 'active',
                type: o.type || 'outlet'
            }));
            console.log('Outlets loaded from window:', branchList.length);
        }
    }
    
    // PRIORITY 3: Fall back to localStorage keys
    if (branchList.length === 0) {
        const storedBranches = localStorage.getItem('ezcubic_branches');
        if (storedBranches) {
            branchList = JSON.parse(storedBranches);
            console.log('Branches loaded from localStorage key:', branchList.length);
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
                console.log('Outlets loaded from localStorage key:', branchList.length);
            }
        }
    }
    
    // PRIORITY 4: Fall back to module variables
    if (branchList.length === 0) {
        if (typeof branches !== 'undefined' && branches.length > 0) {
            branchList = branches;
            console.log('Branches loaded from module var:', branchList.length);
        } else if (typeof outlets !== 'undefined' && outlets.length > 0) {
            branchList = outlets.map(o => ({
                id: o.id,
                name: o.name,
                code: o.code || o.name.substring(0, 3).toUpperCase(),
                status: o.status || 'active',
                type: o.type || 'outlet'
            }));
            console.log('Outlets loaded from module var:', branchList.length);
        }
    }
    
    const activeBranches = branchList.filter(b => b.status === 'active');
    console.log('Active branches/outlets:', activeBranches.length, activeBranches.map(b => b.name));
    
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
        // Fallback to localStorage key
        const storedProducts = localStorage.getItem(PRODUCTS_KEY);
        return storedProducts ? JSON.parse(storedProducts) : [];
    }
    
    // If not a multi-branch plan OR no branches exist, show simple stock input
    if (!isMultiBranchPlan || activeBranches.length === 0) {
        // Get existing stock if editing product
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
        // Update hidden total stock field
        const totalStockField = document.getElementById('productStock');
        if (totalStockField) totalStockField.value = currentStock;
        return;
    }
    
    // Get existing stock for this product - always fetch fresh from tenant storage
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

/**
 * Get branch stock values from input fields
 */
function getBranchStockFromInputs() {
    // Check for single branch stock input (Starter plan or no branches)
    const singleStockInput = document.getElementById('singleBranchStock');
    if (singleStockInput) {
        const qty = parseInt(singleStockInput.value) || 0;
        // Return with 'main' as default branch for non-multi-branch plans
        return { 'main': qty };
    }
    
    // Multi-branch stock inputs
    const inputs = document.querySelectorAll('.branch-stock-input');
    const branchStock = {};
    
    inputs.forEach(input => {
        const branchId = input.dataset.branchId;
        const qty = parseInt(input.value) || 0;
        branchStock[branchId] = qty;
    });
    
    return branchStock;
}

/**
 * Update total stock field from branch inputs
 */
function updateTotalStock() {
    const branchStock = getBranchStockFromInputs();
    const total = Object.values(branchStock).reduce((sum, qty) => sum + qty, 0);
    
    const totalField = document.getElementById('productStock');
    if (totalField) {
        totalField.value = total;
    }
}

/**
 * Update visual status of branch stock item
 */
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

/**
 * Get branch name for stock display
 */
function getBranchNameForStock(branchId) {
    const branchList = typeof branches !== 'undefined' ? branches : [];
    const branch = branchList.find(b => b.id === branchId);
    return branch ? branch.name : 'Unknown Branch';
}

/**
 * Save branch stock data to localStorage (sync with branches module)
 */
function saveBranchStockData(productId, branchStock) {
    const stockKey = 'ezcubic_branch_stock';
    const stored = localStorage.getItem(stockKey);
    const allBranchStock = stored ? JSON.parse(stored) : {};
    
    Object.keys(branchStock).forEach(branchId => {
        const key = `${productId}_${branchId}`;
        allBranchStock[key] = branchStock[branchId];
    });
    
    localStorage.setItem(stockKey, JSON.stringify(allBranchStock));
}

/**
 * Get product stock for specific branch
 */
function getProductStockByBranch(productId, branchId) {
    const product = products.find(p => p.id === productId);
    if (!product) return 0;
    
    // First check product's branchStock
    if (product.branchStock && product.branchStock[branchId] !== undefined) {
        return product.branchStock[branchId];
    }
    
    // Fallback to branch stock storage
    if (typeof getBranchStock === 'function') {
        return getBranchStock(productId, branchId);
    }
    
    return 0;
}

/**
 * Get total stock across all branches for a product
 */
function getProductTotalStock(productId) {
    const product = products.find(p => p.id === productId);
    if (!product) return 0;
    
    if (product.branchStock) {
        return Object.values(product.branchStock).reduce((sum, qty) => sum + qty, 0);
    }
    
    return product.stock || 0;
}

/**
 * Generate branch stock badges for product display
 */
function getBranchStockBadges(product) {
    if (!product.branchStock) return '';
    
    const branchList = typeof branches !== 'undefined' ? branches : [];
    const activeBranches = branchList.filter(b => b.status === 'active');
    
    if (activeBranches.length === 0) return '';
    
    return activeBranches.map(branch => {
        const qty = product.branchStock[branch.id] || 0;
        let badgeClass = '';
        if (qty === 0) badgeClass = 'out';
        else if (qty <= product.minStock) badgeClass = 'low';
        
        return `<span class="branch-stock-badge ${badgeClass}" title="${branch.name}">
            <i class="fas fa-store"></i> ${branch.code}: ${qty}
        </span>`;
    }).join('');
}

// Export functions to window
window.initializeInventory = initializeInventory;
window.showProductModal = showProductModal;
window.saveProduct = saveProduct;
window.deleteProduct = deleteProduct;
window.quickStockAdjust = quickStockAdjust;
window.renderProducts = renderProducts;
window.searchProducts = searchProducts;
window.filterByCategory = filterByCategory;
window.generateSKU = generateSKU;
window.updateCombinedSKU = updateCombinedSKU;
window.previewProductImage = previewProductImage;
window.clearProductImage = clearProductImage;
// showOutletModal is defined in app.js
// loadOutletCheckboxes removed - function doesn't exist
window.calculateProfitMargin = calculateProfitMargin;
window.suggestCostFromPrice = suggestCostFromPrice;
window.applySuggestedCost = applySuggestedCost;
window.suggestCostFromSimilar = suggestCostFromSimilar;
window.loadBranchStockInputs = loadBranchStockInputs;
window.getBranchStockFromInputs = getBranchStockFromInputs;
window.updateTotalStock = updateTotalStock;
window.updateBranchStockStatus = updateBranchStockStatus;
window.getProductStockByBranch = getProductStockByBranch;
window.getProductTotalStock = getProductTotalStock;
window.loadInventoryBranchFilter = loadInventoryBranchFilter;

// Initialize when document ready - removed duplicate init as app.js handles this
