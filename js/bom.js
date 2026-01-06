/**
 * EZCubic - Bill of Materials (BOM) System
 * For manufacturing, assembly, and product recipes
 * Version: 1.0.0 - 26 Dec 2025
 */

// ==================== STORAGE ====================
const BOM_KEY = 'ezcubic_bom';

// ==================== DATA ====================
let billOfMaterials = [];

// ==================== INITIALIZATION ====================
function initializeBOM() {
    loadBOMData();
    console.log('✅ BOM module initialized');
}

function loadBOMData() {
    try {
        const stored = localStorage.getItem(BOM_KEY);
        if (stored) {
            billOfMaterials = JSON.parse(stored);
        }
    } catch (e) {
        console.error('Error loading BOM data:', e);
        billOfMaterials = [];
    }
}

function saveBOMData() {
    try {
        localStorage.setItem(BOM_KEY, JSON.stringify(billOfMaterials));
    } catch (e) {
        console.error('Error saving BOM data:', e);
    }
}

// ==================== BOM CRUD ====================
function createBOM(data) {
    const bom = {
        id: 'bom_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
        name: data.name || 'Untitled BOM',
        description: data.description || '',
        productId: data.productId || null, // Output product
        outputQuantity: data.outputQuantity || 1,
        components: data.components || [], // Array of {productId, quantity, unit}
        laborCost: data.laborCost || 0,
        overheadCost: data.overheadCost || 0,
        notes: data.notes || '',
        status: data.status || 'active', // active, inactive, draft
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: window.currentUser?.name || 'System'
    };
    
    billOfMaterials.push(bom);
    saveBOMData();
    
    if (typeof showToast === 'function') {
        showToast('BOM created successfully!', 'success');
    }
    
    return bom;
}

function updateBOM(bomId, data) {
    const index = billOfMaterials.findIndex(b => b.id === bomId);
    if (index === -1) return null;
    
    billOfMaterials[index] = {
        ...billOfMaterials[index],
        ...data,
        updatedAt: new Date().toISOString()
    };
    
    saveBOMData();
    
    if (typeof showToast === 'function') {
        showToast('BOM updated successfully!', 'success');
    }
    
    return billOfMaterials[index];
}

function deleteBOM(bomId) {
    const index = billOfMaterials.findIndex(b => b.id === bomId);
    if (index === -1) return false;
    
    billOfMaterials.splice(index, 1);
    saveBOMData();
    
    if (typeof showToast === 'function') {
        showToast('BOM deleted', 'success');
    }
    
    return true;
}

function getBOM(bomId) {
    return billOfMaterials.find(b => b.id === bomId);
}

function getAllBOMs() {
    return billOfMaterials;
}

function getBOMsByProduct(productId) {
    return billOfMaterials.filter(b => b.productId === productId);
}

// ==================== COST CALCULATION ====================
function calculateBOMCost(bomId) {
    const bom = getBOM(bomId);
    if (!bom) return null;
    
    const products = window.products || [];
    let componentsCost = 0;
    
    bom.components.forEach(comp => {
        const product = products.find(p => p.id === comp.productId);
        if (product) {
            componentsCost += (product.cost || 0) * comp.quantity;
        }
    });
    
    const totalCost = componentsCost + (bom.laborCost || 0) + (bom.overheadCost || 0);
    const costPerUnit = totalCost / (bom.outputQuantity || 1);
    
    return {
        componentsCost,
        laborCost: bom.laborCost || 0,
        overheadCost: bom.overheadCost || 0,
        totalCost,
        outputQuantity: bom.outputQuantity,
        costPerUnit
    };
}

// ==================== PRODUCTION ====================
function checkBOMAvailability(bomId, quantity = 1) {
    const bom = getBOM(bomId);
    if (!bom) return { available: false, missing: [], error: 'BOM not found' };
    
    const products = window.products || [];
    const missing = [];
    let canProduce = true;
    
    bom.components.forEach(comp => {
        const product = products.find(p => p.id === comp.productId);
        const needed = comp.quantity * quantity;
        const available = product ? (product.stock || 0) : 0;
        
        if (available < needed) {
            canProduce = false;
            missing.push({
                productId: comp.productId,
                productName: product?.name || 'Unknown',
                needed,
                available,
                shortage: needed - available
            });
        }
    });
    
    return {
        available: canProduce,
        missing,
        quantity
    };
}

function produceBOM(bomId, quantity = 1) {
    const bom = getBOM(bomId);
    if (!bom) {
        showToast('BOM not found', 'error');
        return null;
    }
    
    const availability = checkBOMAvailability(bomId, quantity);
    if (!availability.available) {
        showToast('Insufficient materials for production', 'error');
        return { success: false, ...availability };
    }
    
    const products = window.products || [];
    
    // ===== USE CENTRALIZED STOCK MANAGER =====
    // Deduct components using batch update
    if (typeof batchUpdateStock === 'function') {
        const componentUpdates = bom.components.map(comp => ({
            productId: comp.productId,
            quantityChange: -(comp.quantity * quantity),
            notes: `Used in production of ${bom.name}`
        }));
        
        batchUpdateStock(componentUpdates, 'production-consume', {
            reference: `BOM-${bom.id}`,
            skipCloudSync: true // Sync once at the end
        });
        
        // Add output product
        if (bom.productId) {
            updateProductStock(bom.productId, null, bom.outputQuantity * quantity, 'production-output', {
                reference: `BOM-${bom.id}`,
                notes: `Produced from BOM: ${bom.name}`
            });
        }
    } else {
        // Fallback: direct update
        bom.components.forEach(comp => {
            const product = products.find(p => p.id === comp.productId);
            if (product) {
                product.stock = (product.stock || 0) - (comp.quantity * quantity);
            }
        });
        
        const outputProduct = products.find(p => p.id === bom.productId);
        if (outputProduct) {
            outputProduct.stock = (outputProduct.stock || 0) + (bom.outputQuantity * quantity);
        }
        
        if (typeof saveProducts === 'function') {
            saveProducts();
        }
    }
    
    // Create notification
    if (typeof createNotification === 'function') {
        createNotification('success', `Produced ${bom.outputQuantity * quantity} ${bom.name}`);
    }
    
    showToast(`Production complete: ${bom.outputQuantity * quantity} units`, 'success');
    
    return { success: true, produced: bom.outputQuantity * quantity };
}

// ==================== BOM UI ====================
function showBOMSection() {
    const container = document.getElementById('bomContainer') || document.getElementById('main-content');
    if (!container) return;
    
    container.innerHTML = `
        <div class="bom-section">
            <div class="section-header">
                <h2><i class="fas fa-sitemap"></i> Bill of Materials (BOM)</h2>
                <button class="btn-primary" onclick="showCreateBOMModal()">
                    <i class="fas fa-plus"></i> New BOM
                </button>
            </div>
            
            <div class="bom-stats">
                <div class="stat-card">
                    <i class="fas fa-list-alt"></i>
                    <div class="stat-value">${billOfMaterials.length}</div>
                    <div class="stat-label">Total BOMs</div>
                </div>
                <div class="stat-card">
                    <i class="fas fa-check-circle"></i>
                    <div class="stat-value">${billOfMaterials.filter(b => b.status === 'active').length}</div>
                    <div class="stat-label">Active</div>
                </div>
            </div>
            
            <div class="bom-list">
                ${renderBOMList()}
            </div>
        </div>
    `;
}

function renderBOMList() {
    if (billOfMaterials.length === 0) {
        return `
            <div class="empty-state">
                <i class="fas fa-sitemap"></i>
                <h3>No Bill of Materials</h3>
                <p>Create your first BOM to track components and production</p>
                <button class="btn-primary" onclick="showCreateBOMModal()">
                    <i class="fas fa-plus"></i> Create BOM
                </button>
            </div>
        `;
    }
    
    return `
        <table class="data-table">
            <thead>
                <tr>
                    <th>Name</th>
                    <th>Output Product</th>
                    <th>Components</th>
                    <th>Est. Cost</th>
                    <th>Status</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                ${billOfMaterials.map(bom => {
                    const products = window.products || [];
                    const outputProduct = products.find(p => p.id === bom.productId);
                    const cost = calculateBOMCost(bom.id);
                    
                    return `
                        <tr>
                            <td>
                                <strong>${escapeHtml(bom.name)}</strong>
                                ${bom.description ? `<br><small class="text-muted">${escapeHtml(bom.description)}</small>` : ''}
                            </td>
                            <td>${outputProduct ? escapeHtml(outputProduct.name) : '<em>Not set</em>'}</td>
                            <td>${bom.components.length} items</td>
                            <td>${cost ? formatCurrency(cost.costPerUnit) + '/unit' : '-'}</td>
                            <td>
                                <span class="status-badge ${bom.status}">${bom.status}</span>
                            </td>
                            <td class="action-cell">
                                <button class="btn-icon" onclick="viewBOMDetails('${bom.id}')" title="View">
                                    <i class="fas fa-eye"></i>
                                </button>
                                <button class="btn-icon" onclick="showEditBOMModal('${bom.id}')" title="Edit">
                                    <i class="fas fa-edit"></i>
                                </button>
                                <button class="btn-icon" onclick="showProduceBOMModal('${bom.id}')" title="Produce">
                                    <i class="fas fa-industry"></i>
                                </button>
                                <button class="btn-icon danger" onclick="confirmDeleteBOM('${bom.id}')" title="Delete">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </td>
                        </tr>
                    `;
                }).join('')}
            </tbody>
        </table>
    `;
}

// ==================== BOM MODALS ====================
function showCreateBOMModal() {
    const products = window.products || [];
    
    const modalHTML = `
        <div class="modal show" id="bomModal" data-dynamic="true" style="z-index: 10001;">
            <div class="modal-content" style="max-width: 700px;">
                <div class="modal-header">
                    <h3><i class="fas fa-sitemap"></i> Create Bill of Materials</h3>
                    <button class="modal-close" onclick="closeBOMModal()">&times;</button>
                </div>
                <div class="modal-body">
                    <form id="bomForm">
                        <div class="form-row">
                            <div class="form-group">
                                <label>BOM Name *</label>
                                <input type="text" id="bomName" required placeholder="e.g., Assembled Product A">
                            </div>
                            <div class="form-group">
                                <label>Output Product *</label>
                                <select id="bomOutputProduct" required>
                                    <option value="">Select product...</option>
                                    ${products.map(p => `<option value="${p.id}">${escapeHtml(p.name)}</option>`).join('')}
                                </select>
                            </div>
                        </div>
                        
                        <div class="form-row">
                            <div class="form-group">
                                <label>Output Quantity</label>
                                <input type="number" id="bomOutputQty" value="1" min="1">
                            </div>
                            <div class="form-group">
                                <label>Status</label>
                                <select id="bomStatus">
                                    <option value="active">Active</option>
                                    <option value="draft">Draft</option>
                                    <option value="inactive">Inactive</option>
                                </select>
                            </div>
                        </div>
                        
                        <div class="form-group">
                            <label>Description</label>
                            <textarea id="bomDescription" rows="2" placeholder="Optional description"></textarea>
                        </div>
                        
                        <div class="form-group">
                            <label>Components</label>
                            <div id="bomComponents">
                                <div class="component-row">
                                    <select class="comp-product">
                                        <option value="">Select component...</option>
                                        ${products.map(p => `<option value="${p.id}">${escapeHtml(p.name)} (Stock: ${p.stock || 0})</option>`).join('')}
                                    </select>
                                    <input type="number" class="comp-qty" value="1" min="0.01" step="0.01" placeholder="Qty">
                                    <button type="button" class="btn-icon danger" onclick="this.closest('.component-row').remove()">
                                        <i class="fas fa-times"></i>
                                    </button>
                                </div>
                            </div>
                            <button type="button" class="btn-secondary btn-sm" onclick="addBOMComponent()">
                                <i class="fas fa-plus"></i> Add Component
                            </button>
                        </div>
                        
                        <div class="form-row">
                            <div class="form-group">
                                <label>Labor Cost</label>
                                <input type="number" id="bomLaborCost" value="0" min="0" step="0.01">
                            </div>
                            <div class="form-group">
                                <label>Overhead Cost</label>
                                <input type="number" id="bomOverheadCost" value="0" min="0" step="0.01">
                            </div>
                        </div>
                        
                        <div class="form-group">
                            <label>Notes</label>
                            <textarea id="bomNotes" rows="2" placeholder="Production notes"></textarea>
                        </div>
                    </form>
                </div>
                <div class="modal-footer">
                    <button class="btn-secondary" onclick="closeBOMModal()">Cancel</button>
                    <button class="btn-primary" onclick="saveBOMFromModal()">
                        <i class="fas fa-save"></i> Save BOM
                    </button>
                </div>
            </div>
        </div>
    `;
    
    // Remove any existing BOM modal first
    const existingModal = document.getElementById('bomModal');
    if (existingModal) existingModal.remove();
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

// Close BOM modal - removes the dynamically created modal
function closeBOMModal() {
    const modal = document.getElementById('bomModal');
    if (modal) {
        modal.classList.remove('show');
        modal.remove();
    }
}

function addBOMComponent() {
    const products = window.products || [];
    const container = document.getElementById('bomComponents');
    
    const row = document.createElement('div');
    row.className = 'component-row';
    row.innerHTML = `
        <select class="comp-product">
            <option value="">Select component...</option>
            ${products.map(p => `<option value="${p.id}">${escapeHtml(p.name)} (Stock: ${p.stock || 0})</option>`).join('')}
        </select>
        <input type="number" class="comp-qty" value="1" min="0.01" step="0.01" placeholder="Qty">
        <button type="button" class="btn-icon danger" onclick="this.closest('.component-row').remove()">
            <i class="fas fa-times"></i>
        </button>
    `;
    
    container.appendChild(row);
}

function saveBOMFromModal() {
    const name = document.getElementById('bomName').value.trim();
    const productId = document.getElementById('bomOutputProduct').value;
    
    if (!name) {
        showToast('Please enter BOM name', 'error');
        return;
    }
    
    if (!productId) {
        showToast('Please select output product', 'error');
        return;
    }
    
    // Gather components
    const components = [];
    document.querySelectorAll('.component-row').forEach(row => {
        const productSelect = row.querySelector('.comp-product');
        const qtyInput = row.querySelector('.comp-qty');
        
        if (productSelect.value && qtyInput.value) {
            components.push({
                productId: productSelect.value,
                quantity: parseFloat(qtyInput.value) || 1
            });
        }
    });
    
    const bomData = {
        name,
        productId,
        outputQuantity: parseFloat(document.getElementById('bomOutputQty').value) || 1,
        status: document.getElementById('bomStatus').value,
        description: document.getElementById('bomDescription').value.trim(),
        components,
        laborCost: parseFloat(document.getElementById('bomLaborCost').value) || 0,
        overheadCost: parseFloat(document.getElementById('bomOverheadCost').value) || 0,
        notes: document.getElementById('bomNotes').value.trim()
    };
    
    createBOM(bomData);
    closeBOMModal();
    
    // Refresh if on BOM section
    if (document.querySelector('.bom-section')) {
        showBOMSection();
    }
}

function showEditBOMModal(bomId) {
    const bom = getBOM(bomId);
    if (!bom) return;
    
    showCreateBOMModal();
    
    // Pre-fill form
    setTimeout(() => {
        document.getElementById('bomName').value = bom.name;
        document.getElementById('bomOutputProduct').value = bom.productId;
        document.getElementById('bomOutputQty').value = bom.outputQuantity;
        document.getElementById('bomStatus').value = bom.status;
        document.getElementById('bomDescription').value = bom.description || '';
        document.getElementById('bomLaborCost').value = bom.laborCost || 0;
        document.getElementById('bomOverheadCost').value = bom.overheadCost || 0;
        document.getElementById('bomNotes').value = bom.notes || '';
        
        // Clear existing components and add from BOM
        const container = document.getElementById('bomComponents');
        container.innerHTML = '';
        
        bom.components.forEach(comp => {
            addBOMComponent();
            const rows = container.querySelectorAll('.component-row');
            const lastRow = rows[rows.length - 1];
            lastRow.querySelector('.comp-product').value = comp.productId;
            lastRow.querySelector('.comp-qty').value = comp.quantity;
        });
        
        // Update save button to update instead
        const modalFooter = document.querySelector('#bomModal .modal-footer');
        modalFooter.innerHTML = `
            <button class="btn-secondary" onclick="closeBOMModal()">Cancel</button>
            <button class="btn-primary" onclick="updateBOMFromModal('${bomId}')">
                <i class="fas fa-save"></i> Update BOM
            </button>
        `;
        
        document.querySelector('#bomModal .modal-header h3').textContent = 'Edit Bill of Materials';
    }, 100);
}

function updateBOMFromModal(bomId) {
    const name = document.getElementById('bomName').value.trim();
    const productId = document.getElementById('bomOutputProduct').value;
    
    if (!name || !productId) {
        showToast('Please fill required fields', 'error');
        return;
    }
    
    // Gather components
    const components = [];
    document.querySelectorAll('.component-row').forEach(row => {
        const productSelect = row.querySelector('.comp-product');
        const qtyInput = row.querySelector('.comp-qty');
        
        if (productSelect.value && qtyInput.value) {
            components.push({
                productId: productSelect.value,
                quantity: parseFloat(qtyInput.value) || 1
            });
        }
    });
    
    const bomData = {
        name,
        productId,
        outputQuantity: parseFloat(document.getElementById('bomOutputQty').value) || 1,
        status: document.getElementById('bomStatus').value,
        description: document.getElementById('bomDescription').value.trim(),
        components,
        laborCost: parseFloat(document.getElementById('bomLaborCost').value) || 0,
        overheadCost: parseFloat(document.getElementById('bomOverheadCost').value) || 0,
        notes: document.getElementById('bomNotes').value.trim()
    };
    
    updateBOM(bomId, bomData);
    closeBOMModal();
    
    if (document.querySelector('.bom-section')) {
        showBOMSection();
    }
}

function viewBOMDetails(bomId) {
    const bom = getBOM(bomId);
    if (!bom) return;
    
    const products = window.products || [];
    const cost = calculateBOMCost(bomId);
    const availability = checkBOMAvailability(bomId, 1);
    const outputProduct = products.find(p => p.id === bom.productId);
    
    const modalHTML = `
        <div class="modal show" id="bomDetailsModal" style="z-index: 10001;">
            <div class="modal-content" style="max-width: 600px;">
                <div class="modal-header">
                    <h3><i class="fas fa-sitemap"></i> ${escapeHtml(bom.name)}</h3>
                    <button class="modal-close" onclick="closeModal('bomDetailsModal')">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="bom-details">
                        <div class="detail-row">
                            <strong>Output:</strong> 
                            ${outputProduct ? escapeHtml(outputProduct.name) : 'Not set'} 
                            × ${bom.outputQuantity}
                        </div>
                        <div class="detail-row">
                            <strong>Status:</strong> 
                            <span class="status-badge ${bom.status}">${bom.status}</span>
                        </div>
                        ${bom.description ? `<div class="detail-row"><strong>Description:</strong> ${escapeHtml(bom.description)}</div>` : ''}
                        
                        <h4 style="margin-top: 15px;">Components</h4>
                        <table class="data-table compact">
                            <thead>
                                <tr>
                                    <th>Component</th>
                                    <th>Required</th>
                                    <th>In Stock</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${bom.components.map(comp => {
                                    const product = products.find(p => p.id === comp.productId);
                                    const inStock = product ? (product.stock || 0) : 0;
                                    const hasEnough = inStock >= comp.quantity;
                                    return `
                                        <tr>
                                            <td>${product ? escapeHtml(product.name) : 'Unknown'}</td>
                                            <td>${comp.quantity}</td>
                                            <td>${inStock}</td>
                                            <td>
                                                <span class="status-badge ${hasEnough ? 'active' : 'danger'}">
                                                    ${hasEnough ? '✓ OK' : '⚠ Low'}
                                                </span>
                                            </td>
                                        </tr>
                                    `;
                                }).join('')}
                            </tbody>
                        </table>
                        
                        <h4 style="margin-top: 15px;">Cost Breakdown</h4>
                        <div class="cost-breakdown">
                            <div class="cost-row">
                                <span>Components Cost:</span>
                                <span>${formatCurrency(cost?.componentsCost || 0)}</span>
                            </div>
                            <div class="cost-row">
                                <span>Labor Cost:</span>
                                <span>${formatCurrency(cost?.laborCost || 0)}</span>
                            </div>
                            <div class="cost-row">
                                <span>Overhead Cost:</span>
                                <span>${formatCurrency(cost?.overheadCost || 0)}</span>
                            </div>
                            <div class="cost-row total">
                                <span><strong>Total Cost:</strong></span>
                                <span><strong>${formatCurrency(cost?.totalCost || 0)}</strong></span>
                            </div>
                            <div class="cost-row">
                                <span>Cost Per Unit:</span>
                                <span>${formatCurrency(cost?.costPerUnit || 0)}</span>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn-secondary" onclick="closeModal('bomDetailsModal')">Close</button>
                    <button class="btn-primary" onclick="closeModal('bomDetailsModal'); showProduceBOMModal('${bomId}')">
                        <i class="fas fa-industry"></i> Produce
                    </button>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

function showProduceBOMModal(bomId) {
    const bom = getBOM(bomId);
    if (!bom) return;
    
    const availability = checkBOMAvailability(bomId, 1);
    
    const modalHTML = `
        <div class="modal show" id="produceModal" style="z-index: 10001;">
            <div class="modal-content" style="max-width: 400px;">
                <div class="modal-header">
                    <h3><i class="fas fa-industry"></i> Produce: ${escapeHtml(bom.name)}</h3>
                    <button class="modal-close" onclick="closeModal('produceModal')">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="form-group">
                        <label>Production Quantity (batches)</label>
                        <input type="number" id="produceQty" value="1" min="1" onchange="checkProductionAvailability('${bomId}')">
                        <small class="text-muted">Each batch produces ${bom.outputQuantity} unit(s)</small>
                    </div>
                    
                    <div id="availabilityStatus" class="alert ${availability.available ? 'alert-success' : 'alert-danger'}">
                        ${availability.available 
                            ? '<i class="fas fa-check-circle"></i> Materials available for production'
                            : '<i class="fas fa-exclamation-triangle"></i> Insufficient materials'}
                    </div>
                    
                    ${!availability.available ? `
                        <div class="missing-materials">
                            <strong>Missing:</strong>
                            <ul>
                                ${availability.missing.map(m => `
                                    <li>${escapeHtml(m.productName)}: Need ${m.needed}, Have ${m.available}</li>
                                `).join('')}
                            </ul>
                        </div>
                    ` : ''}
                </div>
                <div class="modal-footer">
                    <button class="btn-secondary" onclick="closeModal('produceModal')">Cancel</button>
                    <button class="btn-primary" id="produceBtn" onclick="executeProduction('${bomId}')" ${!availability.available ? 'disabled' : ''}>
                        <i class="fas fa-play"></i> Start Production
                    </button>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

function checkProductionAvailability(bomId) {
    const qty = parseInt(document.getElementById('produceQty').value) || 1;
    const availability = checkBOMAvailability(bomId, qty);
    
    const statusDiv = document.getElementById('availabilityStatus');
    const produceBtn = document.getElementById('produceBtn');
    
    if (availability.available) {
        statusDiv.className = 'alert alert-success';
        statusDiv.innerHTML = '<i class="fas fa-check-circle"></i> Materials available for production';
        produceBtn.disabled = false;
    } else {
        statusDiv.className = 'alert alert-danger';
        statusDiv.innerHTML = `
            <i class="fas fa-exclamation-triangle"></i> Insufficient materials
            <ul class="mt-2">
                ${availability.missing.map(m => `
                    <li>${escapeHtml(m.productName)}: Need ${m.needed}, Have ${m.available}</li>
                `).join('')}
            </ul>
        `;
        produceBtn.disabled = true;
    }
}

function executeProduction(bomId) {
    const qty = parseInt(document.getElementById('produceQty').value) || 1;
    const result = produceBOM(bomId, qty);
    
    if (result && result.success) {
        closeModal('produceModal');
        if (document.querySelector('.bom-section')) {
            showBOMSection();
        }
    }
}

function confirmDeleteBOM(bomId) {
    if (confirm('Are you sure you want to delete this BOM?')) {
        deleteBOM(bomId);
        if (document.querySelector('.bom-section')) {
            showBOMSection();
        }
    }
}

// ==================== HELPERS ====================
function formatCurrency(amount) {
    const currency = window.businessData?.currency || 'RM';
    return `${currency} ${(amount || 0).toFixed(2)}`;
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ==================== WINDOW EXPORTS ====================
window.initializeBOM = initializeBOM;
window.billOfMaterials = billOfMaterials;
window.createBOM = createBOM;
window.updateBOM = updateBOM;
window.deleteBOM = deleteBOM;
window.getBOM = getBOM;
window.getAllBOMs = getAllBOMs;
window.getBOMsByProduct = getBOMsByProduct;
window.calculateBOMCost = calculateBOMCost;
window.checkBOMAvailability = checkBOMAvailability;
window.produceBOM = produceBOM;
window.showBOMSection = showBOMSection;
window.showCreateBOMModal = showCreateBOMModal;
window.closeBOMModal = closeBOMModal;
window.addBOMComponent = addBOMComponent;
window.saveBOMFromModal = saveBOMFromModal;
window.showEditBOMModal = showEditBOMModal;
window.updateBOMFromModal = updateBOMFromModal;
window.viewBOMDetails = viewBOMDetails;
window.showProduceBOMModal = showProduceBOMModal;
window.checkProductionAvailability = checkProductionAvailability;
window.executeProduction = executeProduction;
window.confirmDeleteBOM = confirmDeleteBOM;

console.log('✅ BOM module loaded');
