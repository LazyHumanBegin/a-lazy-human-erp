/**
 * BOM-UI.JS
 * Bill of Materials - User Interface
 * Recipe builder, production management, reports
 * Version: 2.3.3 - 26 Dec 2025
 */

// ==================== EXPORTS ====================
window.initBOMUI = initBOMUI;
window.renderBOMSection = renderBOMSection;
window.showBOMTab = showBOMTab;
window.showRecipeModal = showRecipeModal;
window.closeRecipeModal = closeRecipeModal;
window.saveRecipe = saveRecipe;
window.editRecipe = editRecipe;
window.deleteRecipe = deleteRecipeUI;
window.duplicateRecipe = duplicateRecipeUI;
window.addIngredientRow = addIngredientRow;
window.removeIngredientRow = removeIngredientRow;
window.showProductionModal = showProductionModal;
window.closeProductionModal = closeProductionModal;
window.createProductionOrder = createProductionOrderUI;
window.completeProduction = completeProductionUI;
window.cancelProduction = cancelProductionUI;
window.viewRecipeDetails = viewRecipeDetails;

// ==================== STATE ====================
let currentBOMTab = 'recipes';
let editingRecipeId = null;
let ingredientRowCounter = 0;

// ==================== INITIALIZATION ====================
function initBOMUI() {
    renderBOMSection();
    console.log('✅ BOM UI initialized');
}

// ==================== MAIN RENDER ====================
function renderBOMSection() {
    renderRecipesList();
    renderProductionList();
    updateBOMStats();
}

function updateBOMStats() {
    const recipes = window.BOMSystem ? window.BOMSystem.getRecipes() : [];
    const production = window.BOMSystem ? window.BOMSystem.getProduction() : [];
    
    const activeRecipes = recipes.filter(r => r.status === 'active').length;
    const pendingProduction = production.filter(p => p.status === 'pending').length;
    const completedToday = production.filter(p => {
        if (p.status !== 'completed') return false;
        const completed = new Date(p.completedAt);
        const today = new Date();
        return completed.toDateString() === today.toDateString();
    }).length;
    
    // Calculate total production value
    const totalValue = production
        .filter(p => p.status === 'completed')
        .reduce((sum, p) => sum + (p.estimatedCost || 0), 0);
    
    updateElementText('bomTotalRecipes', activeRecipes);
    updateElementText('bomPendingProduction', pendingProduction);
    updateElementText('bomCompletedToday', completedToday);
    updateElementText('bomTotalValue', formatCurrency(totalValue));
}

function updateElementText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
}

function formatCurrency(amount) {
    return 'RM ' + (amount || 0).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

// ==================== TAB SWITCHING ====================
function showBOMTab(tabName) {
    currentBOMTab = tabName;
    
    // Update tab buttons
    document.querySelectorAll('#bom .tab').forEach(tab => {
        tab.classList.remove('active');
    });
    document.querySelector(`#bom .tab[onclick*="${tabName}"]`)?.classList.add('active');
    
    // Update tab content
    document.querySelectorAll('#bom .bom-tab-content').forEach(content => {
        content.classList.remove('active');
        content.style.display = 'none';
    });
    
    const activeContent = document.getElementById(`bom-${tabName}`);
    if (activeContent) {
        activeContent.classList.add('active');
        activeContent.style.display = 'block';
    }
    
    // Refresh data
    if (tabName === 'recipes') {
        renderRecipesList();
    } else if (tabName === 'production') {
        renderProductionList();
    }
}

// ==================== RECIPES LIST ====================
function renderRecipesList() {
    const container = document.getElementById('bomRecipesList');
    if (!container) return;
    
    const recipes = window.BOMSystem ? window.BOMSystem.getRecipes() : [];
    const searchTerm = document.getElementById('bomRecipeSearch')?.value?.toLowerCase() || '';
    const categoryFilter = document.getElementById('bomCategoryFilter')?.value || '';
    
    let filteredRecipes = recipes.filter(recipe => {
        const matchesSearch = !searchTerm || 
            recipe.name.toLowerCase().includes(searchTerm) ||
            (recipe.description || '').toLowerCase().includes(searchTerm);
        const matchesCategory = !categoryFilter || recipe.category === categoryFilter;
        return matchesSearch && matchesCategory;
    });
    
    if (filteredRecipes.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-clipboard-list"></i>
                <h3>No Recipes Found</h3>
                <p>${recipes.length === 0 ? 'Create your first recipe to get started' : 'Try adjusting your search filters'}</p>
                ${recipes.length === 0 ? '<button class="btn-primary" onclick="showRecipeModal()"><i class="fas fa-plus"></i> Create Recipe</button>' : ''}
            </div>
        `;
        return;
    }
    
    container.innerHTML = `
        <table class="data-table">
            <thead>
                <tr>
                    <th>Recipe Name</th>
                    <th>Category</th>
                    <th>Ingredients</th>
                    <th>Output</th>
                    <th>Cost/Unit</th>
                    <th>Status</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                ${filteredRecipes.map(recipe => {
                    const availability = window.BOMSystem ? window.BOMSystem.checkIngredientAvailability(recipe, 1) : { canProduce: false };
                    return `
                        <tr>
                            <td>
                                <div style="font-weight: 600;">${recipe.name}</div>
                                ${recipe.description ? `<div style="font-size: 11px; color: #64748b;">${recipe.description.substring(0, 50)}...</div>` : ''}
                            </td>
                            <td><span class="badge">${recipe.category || 'General'}</span></td>
                            <td>${recipe.ingredients.length} items</td>
                            <td>${recipe.outputQuantity} ${recipe.outputUnit}</td>
                            <td style="font-weight: 600; color: #f59e0b;">${formatCurrency(recipe.calculatedCost || 0)}</td>
                            <td>
                                ${availability.canProduce 
                                    ? '<span class="status-badge success"><i class="fas fa-check"></i> Ready</span>'
                                    : '<span class="status-badge warning"><i class="fas fa-exclamation-triangle"></i> Low Stock</span>'
                                }
                            </td>
                            <td>
                                <div class="action-btns">
                                    <button class="btn-icon" onclick="viewRecipeDetails('${recipe.id}')" title="View Details">
                                        <i class="fas fa-eye"></i>
                                    </button>
                                    <button class="btn-icon" onclick="showProductionModal('${recipe.id}')" title="Start Production">
                                        <i class="fas fa-play"></i>
                                    </button>
                                    <button class="btn-icon" onclick="editRecipe('${recipe.id}')" title="Edit">
                                        <i class="fas fa-edit"></i>
                                    </button>
                                    <button class="btn-icon" onclick="duplicateRecipeUI('${recipe.id}')" title="Duplicate">
                                        <i class="fas fa-copy"></i>
                                    </button>
                                    <button class="btn-icon danger" onclick="deleteRecipeUI('${recipe.id}')" title="Delete">
                                        <i class="fas fa-trash"></i>
                                    </button>
                                </div>
                            </td>
                        </tr>
                    `;
                }).join('')}
            </tbody>
        </table>
    `;
}

// ==================== PRODUCTION LIST ====================
function renderProductionList() {
    const container = document.getElementById('bomProductionList');
    if (!container) return;
    
    const production = window.BOMSystem ? window.BOMSystem.getProduction() : [];
    const statusFilter = document.getElementById('bomProductionStatus')?.value || '';
    
    let filteredProduction = production;
    if (statusFilter) {
        filteredProduction = production.filter(p => p.status === statusFilter);
    }
    
    if (filteredProduction.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-industry"></i>
                <h3>No Production Orders</h3>
                <p>Start production from a recipe to see orders here</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = `
        <table class="data-table">
            <thead>
                <tr>
                    <th>Order ID</th>
                    <th>Recipe</th>
                    <th>Quantity</th>
                    <th>Est. Cost</th>
                    <th>Status</th>
                    <th>Created</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                ${filteredProduction.map(order => `
                    <tr>
                        <td><code>${order.id}</code></td>
                        <td style="font-weight: 600;">${order.recipeName}</td>
                        <td>${order.outputQuantity} ${order.outputUnit}</td>
                        <td style="color: #f59e0b;">${formatCurrency(order.estimatedCost)}</td>
                        <td>${getStatusBadge(order.status)}</td>
                        <td>${formatDate(order.createdAt)}</td>
                        <td>
                            <div class="action-btns">
                                ${order.status === 'pending' ? `
                                    <button class="btn-sm btn-success" onclick="completeProductionUI('${order.id}')" title="Complete">
                                        <i class="fas fa-check"></i> Complete
                                    </button>
                                    <button class="btn-sm btn-danger" onclick="cancelProductionUI('${order.id}')" title="Cancel">
                                        <i class="fas fa-times"></i>
                                    </button>
                                ` : `
                                    <button class="btn-icon" onclick="viewProductionDetails('${order.id}')" title="View Details">
                                        <i class="fas fa-eye"></i>
                                    </button>
                                `}
                            </div>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

function getStatusBadge(status) {
    const badges = {
        'pending': '<span class="status-badge warning"><i class="fas fa-clock"></i> Pending</span>',
        'in-progress': '<span class="status-badge info"><i class="fas fa-spinner fa-spin"></i> In Progress</span>',
        'completed': '<span class="status-badge success"><i class="fas fa-check"></i> Completed</span>',
        'cancelled': '<span class="status-badge danger"><i class="fas fa-times"></i> Cancelled</span>'
    };
    return badges[status] || status;
}

function formatDate(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' });
}

// ==================== RECIPE MODAL ====================
function showRecipeModal(recipeId = null) {
    editingRecipeId = recipeId;
    ingredientRowCounter = 0;
    
    const recipe = recipeId && window.BOMSystem ? window.BOMSystem.getRecipe(recipeId) : null;
    const isEdit = !!recipe;
    
    const modalHTML = `
        <div class="modal-overlay" id="recipeModal" onclick="if(event.target === this) closeRecipeModal()">
            <div class="modal-content" style="max-width: 800px; max-height: 90vh; overflow-y: auto;">
                <div class="modal-header">
                    <h3><i class="fas fa-clipboard-list"></i> ${isEdit ? 'Edit Recipe' : 'Create New Recipe'}</h3>
                    <button class="modal-close" onclick="closeRecipeModal()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <form id="recipeForm">
                        <div class="form-row">
                            <div class="form-group" style="flex: 2;">
                                <label>Recipe Name *</label>
                                <input type="text" id="recipeName" class="form-control" value="${recipe?.name || ''}" required>
                            </div>
                            <div class="form-group" style="flex: 1;">
                                <label>Category</label>
                                <select id="recipeCategory" class="form-control">
                                    <option value="General" ${recipe?.category === 'General' ? 'selected' : ''}>General</option>
                                    <option value="Food" ${recipe?.category === 'Food' ? 'selected' : ''}>Food</option>
                                    <option value="Beverage" ${recipe?.category === 'Beverage' ? 'selected' : ''}>Beverage</option>
                                    <option value="Bakery" ${recipe?.category === 'Bakery' ? 'selected' : ''}>Bakery</option>
                                    <option value="Assembly" ${recipe?.category === 'Assembly' ? 'selected' : ''}>Assembly</option>
                                    <option value="Manufacturing" ${recipe?.category === 'Manufacturing' ? 'selected' : ''}>Manufacturing</option>
                                </select>
                            </div>
                        </div>
                        
                        <div class="form-group">
                            <label>Description</label>
                            <textarea id="recipeDescription" class="form-control" rows="2">${recipe?.description || ''}</textarea>
                        </div>
                        
                        <div class="form-row">
                            <div class="form-group">
                                <label>Output Quantity *</label>
                                <input type="number" id="recipeOutputQty" class="form-control" value="${recipe?.outputQuantity || 1}" min="1" required>
                            </div>
                            <div class="form-group">
                                <label>Output Unit</label>
                                <select id="recipeOutputUnit" class="form-control">
                                    <option value="pcs" ${recipe?.outputUnit === 'pcs' ? 'selected' : ''}>Pieces (pcs)</option>
                                    <option value="kg" ${recipe?.outputUnit === 'kg' ? 'selected' : ''}>Kilograms (kg)</option>
                                    <option value="g" ${recipe?.outputUnit === 'g' ? 'selected' : ''}>Grams (g)</option>
                                    <option value="L" ${recipe?.outputUnit === 'L' ? 'selected' : ''}>Liters (L)</option>
                                    <option value="ml" ${recipe?.outputUnit === 'ml' ? 'selected' : ''}>Milliliters (ml)</option>
                                    <option value="box" ${recipe?.outputUnit === 'box' ? 'selected' : ''}>Box</option>
                                    <option value="set" ${recipe?.outputUnit === 'set' ? 'selected' : ''}>Set</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label>Prep Time (min)</label>
                                <input type="number" id="recipePrepTime" class="form-control" value="${recipe?.prepTime || 0}" min="0">
                            </div>
                        </div>
                        
                        <div class="form-group">
                            <label>Link to Finished Product (Optional)</label>
                            <select id="recipeOutputProduct" class="form-control">
                                <option value="">-- None --</option>
                                ${getInventoryOptions(recipe?.outputProductId)}
                            </select>
                            <small style="color: #64748b;">If linked, completed production will add to this product's stock</small>
                        </div>
                        
                        <hr style="margin: 20px 0; border-color: #334155;">
                        
                        <div class="form-group">
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                                <label style="margin: 0;"><i class="fas fa-list"></i> Ingredients</label>
                                <button type="button" class="btn-sm btn-primary" onclick="addIngredientRow()">
                                    <i class="fas fa-plus"></i> Add Ingredient
                                </button>
                            </div>
                            <div id="ingredientsList">
                                ${recipe?.ingredients?.length > 0 
                                    ? recipe.ingredients.map(ing => createIngredientRowHTML(ing)).join('')
                                    : '<p style="color: #64748b; text-align: center; padding: 20px;">No ingredients added. Click "Add Ingredient" to start.</p>'
                                }
                            </div>
                        </div>
                        
                        <div class="form-group">
                            <label>Instructions / Notes</label>
                            <textarea id="recipeInstructions" class="form-control" rows="3" placeholder="Optional preparation instructions...">${recipe?.instructions || ''}</textarea>
                        </div>
                        
                        <div id="recipeCostPreview" style="background: #0f172a; padding: 15px; border-radius: 8px; margin-top: 15px;">
                            <div style="display: flex; justify-content: space-between; align-items: center;">
                                <span style="color: #94a3b8;">Estimated Cost per Unit:</span>
                                <span style="font-size: 24px; font-weight: 700; color: #f59e0b;" id="recipeCostValue">RM 0.00</span>
                            </div>
                        </div>
                    </form>
                </div>
                <div class="modal-footer">
                    <button class="btn-secondary" onclick="closeRecipeModal()">Cancel</button>
                    <button class="btn-primary" onclick="saveRecipe()">
                        <i class="fas fa-save"></i> ${isEdit ? 'Update Recipe' : 'Create Recipe'}
                    </button>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // Calculate initial cost if editing
    if (recipe) {
        setTimeout(calculateRecipeCostPreview, 100);
    }
}

function getInventoryOptions(selectedId = null) {
    const items = window.inventoryItems || [];
    return items.map(item => 
        `<option value="${item.id}" ${item.id === selectedId ? 'selected' : ''}>${item.name}</option>`
    ).join('');
}

function createIngredientRowHTML(ingredient = null) {
    const rowId = `ing_${ingredientRowCounter++}`;
    const items = window.inventoryItems || [];
    
    return `
        <div class="ingredient-row" id="${rowId}" style="display: grid; grid-template-columns: 2fr 1fr 1fr 1fr auto; gap: 10px; margin-bottom: 10px; padding: 10px; background: #0f172a; border-radius: 8px;">
            <div>
                <select class="form-control ing-item" onchange="updateIngredientCost('${rowId}')">
                    <option value="">-- Select Item --</option>
                    ${items.map(item => 
                        `<option value="${item.id}" data-cost="${item.costPrice || item.price || 0}" data-unit="${item.unit || 'pcs'}" ${ingredient?.inventoryItemId === item.id ? 'selected' : ''}>${item.name}</option>`
                    ).join('')}
                </select>
            </div>
            <div>
                <input type="number" class="form-control ing-qty" placeholder="Qty" value="${ingredient?.quantity || ''}" min="0.001" step="0.001" onchange="calculateRecipeCostPreview()">
            </div>
            <div>
                <select class="form-control ing-unit">
                    <option value="pcs" ${ingredient?.unit === 'pcs' ? 'selected' : ''}>pcs</option>
                    <option value="kg" ${ingredient?.unit === 'kg' ? 'selected' : ''}>kg</option>
                    <option value="g" ${ingredient?.unit === 'g' ? 'selected' : ''}>g</option>
                    <option value="L" ${ingredient?.unit === 'L' ? 'selected' : ''}>L</option>
                    <option value="ml" ${ingredient?.unit === 'ml' ? 'selected' : ''}>ml</option>
                </select>
            </div>
            <div>
                <input type="number" class="form-control ing-cost" placeholder="Cost" value="${ingredient?.cost || ''}" min="0" step="0.01" onchange="calculateRecipeCostPreview()">
            </div>
            <div>
                <button type="button" class="btn-icon danger" onclick="removeIngredientRow('${rowId}')" title="Remove">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
    `;
}

function addIngredientRow() {
    const container = document.getElementById('ingredientsList');
    if (!container) return;
    
    // Remove empty message if exists
    const emptyMsg = container.querySelector('p');
    if (emptyMsg) emptyMsg.remove();
    
    container.insertAdjacentHTML('beforeend', createIngredientRowHTML());
}

function removeIngredientRow(rowId) {
    const row = document.getElementById(rowId);
    if (row) {
        row.remove();
        calculateRecipeCostPreview();
    }
}

window.updateIngredientCost = function(rowId) {
    const row = document.getElementById(rowId);
    if (!row) return;
    
    const select = row.querySelector('.ing-item');
    const costInput = row.querySelector('.ing-cost');
    const unitSelect = row.querySelector('.ing-unit');
    
    if (select && select.selectedOptions[0]) {
        const cost = select.selectedOptions[0].dataset.cost || 0;
        const unit = select.selectedOptions[0].dataset.unit || 'pcs';
        
        if (costInput && !costInput.value) costInput.value = cost;
        if (unitSelect) unitSelect.value = unit;
    }
    
    calculateRecipeCostPreview();
};

window.calculateRecipeCostPreview = function() {
    const rows = document.querySelectorAll('.ingredient-row');
    let totalCost = 0;
    
    rows.forEach(row => {
        const qty = parseFloat(row.querySelector('.ing-qty')?.value) || 0;
        const cost = parseFloat(row.querySelector('.ing-cost')?.value) || 0;
        totalCost += qty * cost;
    });
    
    const outputQty = parseFloat(document.getElementById('recipeOutputQty')?.value) || 1;
    const costPerUnit = totalCost / outputQty;
    
    const costEl = document.getElementById('recipeCostValue');
    if (costEl) {
        costEl.textContent = formatCurrency(costPerUnit);
    }
};

function closeRecipeModal() {
    const modal = document.getElementById('recipeModal');
    if (modal) modal.remove();
    editingRecipeId = null;
}

function saveRecipe() {
    const name = document.getElementById('recipeName')?.value?.trim();
    if (!name) {
        alert('Please enter a recipe name');
        return;
    }
    
    // Collect ingredients
    const ingredients = [];
    document.querySelectorAll('.ingredient-row').forEach(row => {
        const itemId = row.querySelector('.ing-item')?.value;
        const qty = parseFloat(row.querySelector('.ing-qty')?.value) || 0;
        const unit = row.querySelector('.ing-unit')?.value || 'pcs';
        const cost = parseFloat(row.querySelector('.ing-cost')?.value) || 0;
        
        if (itemId && qty > 0) {
            const items = window.inventoryItems || [];
            const item = items.find(i => i.id === itemId);
            
            ingredients.push({
                inventoryItemId: itemId,
                name: item ? item.name : '',
                quantity: qty,
                unit: unit,
                cost: cost
            });
        }
    });
    
    const recipeData = {
        name: name,
        description: document.getElementById('recipeDescription')?.value || '',
        category: document.getElementById('recipeCategory')?.value || 'General',
        outputQuantity: parseFloat(document.getElementById('recipeOutputQty')?.value) || 1,
        outputUnit: document.getElementById('recipeOutputUnit')?.value || 'pcs',
        outputProductId: document.getElementById('recipeOutputProduct')?.value || null,
        prepTime: parseInt(document.getElementById('recipePrepTime')?.value) || 0,
        instructions: document.getElementById('recipeInstructions')?.value || '',
        ingredients: ingredients
    };
    
    if (editingRecipeId) {
        window.BOMSystem?.updateRecipe(editingRecipeId, recipeData);
        showToast('Recipe updated successfully!', 'success');
    } else {
        window.BOMSystem?.createRecipe(recipeData);
        showToast('Recipe created successfully!', 'success');
    }
    
    closeRecipeModal();
    renderRecipesList();
    updateBOMStats();
}

function editRecipe(recipeId) {
    showRecipeModal(recipeId);
}

function deleteRecipeUI(recipeId) {
    if (!confirm('Are you sure you want to delete this recipe?')) return;
    
    if (window.BOMSystem?.deleteRecipe(recipeId)) {
        showToast('Recipe deleted', 'success');
        renderRecipesList();
        updateBOMStats();
    }
}

function duplicateRecipeUI(recipeId) {
    const newRecipe = window.BOMSystem?.duplicateRecipe(recipeId);
    if (newRecipe) {
        showToast('Recipe duplicated!', 'success');
        renderRecipesList();
        updateBOMStats();
    }
}

// ==================== VIEW RECIPE DETAILS ====================
function viewRecipeDetails(recipeId) {
    const report = window.BOMSystem?.getRecipeReport(recipeId);
    if (!report) return;
    
    const recipe = report.recipe;
    const availability = report.availability;
    
    const modalHTML = `
        <div class="modal-overlay" id="recipeDetailsModal" onclick="if(event.target === this) this.remove()">
            <div class="modal-content" style="max-width: 700px; max-height: 90vh; overflow-y: auto;">
                <div class="modal-header">
                    <h3><i class="fas fa-clipboard-list"></i> ${recipe.name}</h3>
                    <button class="modal-close" onclick="document.getElementById('recipeDetailsModal').remove()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin-bottom: 20px;">
                        <div style="background: #0f172a; padding: 15px; border-radius: 8px; text-align: center;">
                            <div style="color: #94a3b8; font-size: 12px;">Output</div>
                            <div style="font-size: 20px; font-weight: 600; color: white;">${recipe.outputQuantity} ${recipe.outputUnit}</div>
                        </div>
                        <div style="background: #0f172a; padding: 15px; border-radius: 8px; text-align: center;">
                            <div style="color: #94a3b8; font-size: 12px;">Cost/Unit</div>
                            <div style="font-size: 20px; font-weight: 600; color: #f59e0b;">${formatCurrency(recipe.calculatedCost)}</div>
                        </div>
                        <div style="background: #0f172a; padding: 15px; border-radius: 8px; text-align: center;">
                            <div style="color: #94a3b8; font-size: 12px;">Max Producible</div>
                            <div style="font-size: 20px; font-weight: 600; color: #22c55e;">${report.maxProducible}</div>
                        </div>
                        <div style="background: #0f172a; padding: 15px; border-radius: 8px; text-align: center;">
                            <div style="color: #94a3b8; font-size: 12px;">Total Produced</div>
                            <div style="font-size: 20px; font-weight: 600; color: #3b82f6;">${report.stats.totalProduced}</div>
                        </div>
                    </div>
                    
                    <h4 style="margin-bottom: 10px;"><i class="fas fa-list"></i> Ingredients</h4>
                    <table class="data-table" style="margin-bottom: 20px;">
                        <thead>
                            <tr>
                                <th>Item</th>
                                <th>Required</th>
                                <th>Available</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${recipe.ingredients.map(ing => {
                                const check = [...availability.available, ...availability.missing].find(a => a.name === ing.name);
                                return `
                                    <tr>
                                        <td>${ing.name}</td>
                                        <td>${ing.quantity} ${ing.unit}</td>
                                        <td>${check?.available || 0} ${ing.unit}</td>
                                        <td>${check?.sufficient 
                                            ? '<span class="status-badge success">✓ OK</span>' 
                                            : '<span class="status-badge danger">✗ Low</span>'
                                        }</td>
                                    </tr>
                                `;
                            }).join('')}
                        </tbody>
                    </table>
                    
                    ${recipe.instructions ? `
                        <h4 style="margin-bottom: 10px;"><i class="fas fa-book"></i> Instructions</h4>
                        <p style="background: #0f172a; padding: 15px; border-radius: 8px; color: #94a3b8;">${recipe.instructions}</p>
                    ` : ''}
                </div>
                <div class="modal-footer">
                    <button class="btn-secondary" onclick="document.getElementById('recipeDetailsModal').remove()">Close</button>
                    <button class="btn-primary" onclick="document.getElementById('recipeDetailsModal').remove(); showProductionModal('${recipe.id}')">
                        <i class="fas fa-play"></i> Start Production
                    </button>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

// ==================== PRODUCTION MODAL ====================
function showProductionModal(recipeId) {
    const recipe = window.BOMSystem?.getRecipe(recipeId);
    if (!recipe) return;
    
    const availability = window.BOMSystem?.checkIngredientAvailability(recipe, 1);
    const maxQty = window.BOMSystem?.getMaxProducible(recipe) || 0;
    
    const modalHTML = `
        <div class="modal-overlay" id="productionModal" onclick="if(event.target === this) closeProductionModal()">
            <div class="modal-content" style="max-width: 500px;">
                <div class="modal-header">
                    <h3><i class="fas fa-industry"></i> Start Production</h3>
                    <button class="modal-close" onclick="closeProductionModal()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <div style="background: #0f172a; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                        <div style="font-weight: 600; color: white; margin-bottom: 5px;">${recipe.name}</div>
                        <div style="color: #94a3b8; font-size: 13px;">Cost: ${formatCurrency(recipe.calculatedCost)} per ${recipe.outputUnit}</div>
                    </div>
                    
                    <input type="hidden" id="productionRecipeId" value="${recipe.id}">
                    
                    <div class="form-group">
                        <label>Production Quantity</label>
                        <input type="number" id="productionQty" class="form-control" value="1" min="1" max="${maxQty}" onchange="updateProductionPreview()">
                        <small style="color: #64748b;">Maximum producible with current stock: <strong>${maxQty}</strong></small>
                    </div>
                    
                    <div class="form-group">
                        <label>Notes (Optional)</label>
                        <textarea id="productionNotes" class="form-control" rows="2" placeholder="Production batch notes..."></textarea>
                    </div>
                    
                    <div style="background: ${availability.canProduce ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)'}; padding: 15px; border-radius: 8px; border-left: 3px solid ${availability.canProduce ? '#22c55e' : '#ef4444'};">
                        <div style="font-weight: 600; color: ${availability.canProduce ? '#22c55e' : '#ef4444'}; margin-bottom: 5px;">
                            ${availability.canProduce ? '✓ Ready to Produce' : '✗ Insufficient Ingredients'}
                        </div>
                        ${availability.missing.length > 0 ? `
                            <div style="color: #94a3b8; font-size: 13px;">
                                Missing: ${availability.missing.map(m => `${m.name} (need ${m.required - m.available} more)`).join(', ')}
                            </div>
                        ` : ''}
                    </div>
                    
                    <div id="productionCostPreview" style="margin-top: 15px; padding: 15px; background: #0f172a; border-radius: 8px;">
                        <div style="display: flex; justify-content: space-between;">
                            <span style="color: #94a3b8;">Estimated Total Cost:</span>
                            <span style="font-size: 20px; font-weight: 600; color: #f59e0b;" id="productionTotalCost">${formatCurrency(recipe.calculatedCost)}</span>
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn-secondary" onclick="closeProductionModal()">Cancel</button>
                    <button class="btn-primary" onclick="createProductionOrderUI()" ${!availability.canProduce ? 'disabled' : ''}>
                        <i class="fas fa-play"></i> Create Production Order
                    </button>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

window.updateProductionPreview = function() {
    const recipeId = document.getElementById('productionRecipeId')?.value;
    const qty = parseInt(document.getElementById('productionQty')?.value) || 1;
    
    const recipe = window.BOMSystem?.getRecipe(recipeId);
    if (!recipe) return;
    
    const totalCost = (recipe.calculatedCost || 0) * qty;
    document.getElementById('productionTotalCost').textContent = formatCurrency(totalCost);
};

function closeProductionModal() {
    const modal = document.getElementById('productionModal');
    if (modal) modal.remove();
}

function createProductionOrderUI() {
    const recipeId = document.getElementById('productionRecipeId')?.value;
    const qty = parseInt(document.getElementById('productionQty')?.value) || 1;
    const notes = document.getElementById('productionNotes')?.value || '';
    
    const result = window.BOMSystem?.createProduction(recipeId, qty, notes);
    
    if (result?.success) {
        showToast('Production order created!', 'success');
        closeProductionModal();
        renderProductionList();
        updateBOMStats();
    } else {
        showToast(result?.error || 'Failed to create production order', 'error');
    }
}

function completeProductionUI(productionId) {
    if (!confirm('Complete this production? This will deduct ingredients from inventory.')) return;
    
    const result = window.BOMSystem?.completeProduction(productionId);
    
    if (result?.success) {
        showToast('Production completed! Ingredients deducted.', 'success');
        renderProductionList();
        updateBOMStats();
        // Refresh inventory if function exists
        if (typeof renderInventory === 'function') renderInventory();
    } else {
        showToast(result?.error || 'Failed to complete production', 'error');
    }
}

function cancelProductionUI(productionId) {
    const reason = prompt('Reason for cancellation (optional):');
    if (reason === null) return; // User clicked cancel
    
    const result = window.BOMSystem?.cancelProduction(productionId, reason);
    
    if (result?.success) {
        showToast('Production order cancelled', 'info');
        renderProductionList();
        updateBOMStats();
    } else {
        showToast(result?.error || 'Failed to cancel production', 'error');
    }
}

// Helper function
function showToast(message, type = 'info') {
    if (typeof window.showToast === 'function') {
        window.showToast(message, type);
    } else {
        alert(message);
    }
}

// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(initBOMUI, 2000);
});

console.log('🏭 BOM UI loaded');
