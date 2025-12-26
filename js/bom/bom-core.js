/**
 * BOM-CORE.JS
 * Bill of Materials - Core Data Management
 * Handles recipes, ingredients, cost calculations
 * Version: 2.3.3 - 26 Dec 2025
 * 
 * SAFETY: This module is OPTIONAL and does NOT modify other modules.
 * Stock deduction only happens when explicitly triggered by user.
 */

// ==================== CONSTANTS ====================
const BOM_KEY = 'ezcubic_bom_recipes';
const BOM_PRODUCTION_KEY = 'ezcubic_bom_production';
const BOM_SETTINGS_KEY = 'ezcubic_bom_settings';

// ==================== GLOBAL VARIABLES ====================
let bomRecipes = [];
let bomProduction = [];
let bomSettings = {
    enabled: true,
    autoDeductOnSale: false, // DISABLED by default for safety
    showCostOnPOS: true,
    defaultUnit: 'pcs',
    trackWastage: true
};

// ==================== EXPORTS ====================
window.BOMSystem = {
    init: initBOM,
    // Recipe CRUD
    getRecipes: () => bomRecipes,
    getRecipe: getRecipeById,
    createRecipe: createRecipe,
    updateRecipe: updateRecipe,
    deleteRecipe: deleteRecipe,
    duplicateRecipe: duplicateRecipe,
    // Calculations
    calculateRecipeCost: calculateRecipeCost,
    calculateAllCosts: calculateAllRecipeCosts,
    checkIngredientAvailability: checkIngredientAvailability,
    getMaxProducible: getMaxProducibleQuantity,
    // Production
    createProduction: createProductionOrder,
    getProduction: () => bomProduction,
    completeProduction: completeProductionOrder,
    cancelProduction: cancelProductionOrder,
    // Settings
    getSettings: () => bomSettings,
    updateSettings: updateBOMSettings,
    // Stock interaction (safe)
    deductIngredients: deductIngredientsForProduction,
    // Reports
    getRecipeReport: generateRecipeReport
};

// ==================== INITIALIZATION ====================
function initBOM() {
    loadBOMSettings();
    loadRecipes();
    loadProduction();
    console.log('✅ BOM System initialized with', bomRecipes.length, 'recipes');
}

function loadBOMSettings() {
    try {
        const stored = localStorage.getItem(BOM_SETTINGS_KEY);
        if (stored) {
            bomSettings = { ...bomSettings, ...JSON.parse(stored) };
        }
    } catch (e) {
        console.error('Error loading BOM settings:', e);
    }
}

function saveBOMSettings() {
    try {
        localStorage.setItem(BOM_SETTINGS_KEY, JSON.stringify(bomSettings));
    } catch (e) {
        console.error('Error saving BOM settings:', e);
    }
}

function updateBOMSettings(newSettings) {
    bomSettings = { ...bomSettings, ...newSettings };
    saveBOMSettings();
}

function loadRecipes() {
    try {
        const stored = localStorage.getItem(BOM_KEY);
        if (stored) {
            bomRecipes = JSON.parse(stored);
        }
    } catch (e) {
        console.error('Error loading BOM recipes:', e);
        bomRecipes = [];
    }
}

function saveRecipes() {
    try {
        localStorage.setItem(BOM_KEY, JSON.stringify(bomRecipes));
        // Also save to tenant if multi-tenant
        saveBOMToTenant();
    } catch (e) {
        console.error('Error saving BOM recipes:', e);
    }
}

function saveBOMToTenant() {
    try {
        const user = window.currentUser;
        if (user && user.tenantId) {
            const tenantKey = 'ezcubic_tenant_' + user.tenantId;
            let tenantData = JSON.parse(localStorage.getItem(tenantKey) || '{}');
            tenantData.bomRecipes = bomRecipes;
            tenantData.bomProduction = bomProduction;
            tenantData.updatedAt = new Date().toISOString();
            localStorage.setItem(tenantKey, JSON.stringify(tenantData));
        }
    } catch (e) {
        console.error('Error saving BOM to tenant:', e);
    }
}

function loadProduction() {
    try {
        const stored = localStorage.getItem(BOM_PRODUCTION_KEY);
        if (stored) {
            bomProduction = JSON.parse(stored);
        }
    } catch (e) {
        console.error('Error loading production orders:', e);
        bomProduction = [];
    }
}

function saveProduction() {
    try {
        localStorage.setItem(BOM_PRODUCTION_KEY, JSON.stringify(bomProduction));
        saveBOMToTenant();
    } catch (e) {
        console.error('Error saving production orders:', e);
    }
}

// ==================== RECIPE CRUD ====================
function generateRecipeId() {
    return 'BOM_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

function createRecipe(recipeData) {
    const recipe = {
        id: generateRecipeId(),
        name: recipeData.name || 'Untitled Recipe',
        description: recipeData.description || '',
        category: recipeData.category || 'General',
        outputProductId: recipeData.outputProductId || null, // Links to inventory item
        outputQuantity: recipeData.outputQuantity || 1,
        outputUnit: recipeData.outputUnit || bomSettings.defaultUnit,
        ingredients: recipeData.ingredients || [],
        instructions: recipeData.instructions || '',
        prepTime: recipeData.prepTime || 0, // in minutes
        status: 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };
    
    // Validate ingredients
    recipe.ingredients = recipe.ingredients.map(ing => ({
        inventoryItemId: ing.inventoryItemId,
        name: ing.name || '',
        quantity: parseFloat(ing.quantity) || 0,
        unit: ing.unit || 'pcs',
        cost: parseFloat(ing.cost) || 0, // Per unit cost
        notes: ing.notes || ''
    }));
    
    // Calculate initial cost
    recipe.calculatedCost = calculateRecipeCost(recipe);
    
    bomRecipes.push(recipe);
    saveRecipes();
    
    return recipe;
}

function updateRecipe(recipeId, updates) {
    const index = bomRecipes.findIndex(r => r.id === recipeId);
    if (index === -1) return null;
    
    bomRecipes[index] = {
        ...bomRecipes[index],
        ...updates,
        updatedAt: new Date().toISOString()
    };
    
    // Recalculate cost
    bomRecipes[index].calculatedCost = calculateRecipeCost(bomRecipes[index]);
    
    saveRecipes();
    return bomRecipes[index];
}

function deleteRecipe(recipeId) {
    const index = bomRecipes.findIndex(r => r.id === recipeId);
    if (index === -1) return false;
    
    bomRecipes.splice(index, 1);
    saveRecipes();
    return true;
}

function duplicateRecipe(recipeId) {
    const original = bomRecipes.find(r => r.id === recipeId);
    if (!original) return null;
    
    const duplicate = {
        ...JSON.parse(JSON.stringify(original)),
        id: generateRecipeId(),
        name: original.name + ' (Copy)',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };
    
    bomRecipes.push(duplicate);
    saveRecipes();
    return duplicate;
}

function getRecipeById(recipeId) {
    return bomRecipes.find(r => r.id === recipeId);
}

// ==================== COST CALCULATIONS ====================
function calculateRecipeCost(recipe) {
    if (!recipe || !recipe.ingredients) return 0;
    
    let totalCost = 0;
    
    recipe.ingredients.forEach(ingredient => {
        // Try to get current cost from inventory
        const inventoryItem = getInventoryItem(ingredient.inventoryItemId);
        const unitCost = inventoryItem ? (inventoryItem.costPrice || inventoryItem.price || 0) : ingredient.cost;
        
        totalCost += (unitCost * ingredient.quantity);
    });
    
    // Cost per output unit
    const outputQty = recipe.outputQuantity || 1;
    return Math.round((totalCost / outputQty) * 100) / 100;
}

function calculateAllRecipeCosts() {
    bomRecipes.forEach(recipe => {
        recipe.calculatedCost = calculateRecipeCost(recipe);
    });
    saveRecipes();
    return bomRecipes;
}

// Helper to get inventory item (READ-ONLY)
function getInventoryItem(itemId) {
    const items = window.inventoryItems || [];
    return items.find(item => item.id === itemId);
}

// ==================== AVAILABILITY CHECKS ====================
function checkIngredientAvailability(recipe, quantity = 1) {
    const results = {
        canProduce: true,
        available: [],
        missing: [],
        warnings: []
    };
    
    if (!recipe || !recipe.ingredients) {
        results.canProduce = false;
        return results;
    }
    
    recipe.ingredients.forEach(ingredient => {
        const inventoryItem = getInventoryItem(ingredient.inventoryItemId);
        const requiredQty = ingredient.quantity * quantity;
        const availableQty = inventoryItem ? (inventoryItem.quantity || 0) : 0;
        
        const check = {
            name: ingredient.name || (inventoryItem ? inventoryItem.name : 'Unknown'),
            required: requiredQty,
            available: availableQty,
            unit: ingredient.unit,
            sufficient: availableQty >= requiredQty
        };
        
        if (check.sufficient) {
            results.available.push(check);
            if (availableQty < requiredQty * 1.5) {
                results.warnings.push(`${check.name} stock is low after production`);
            }
        } else {
            results.missing.push(check);
            results.canProduce = false;
        }
    });
    
    return results;
}

function getMaxProducibleQuantity(recipe) {
    if (!recipe || !recipe.ingredients || recipe.ingredients.length === 0) return 0;
    
    let maxQty = Infinity;
    
    recipe.ingredients.forEach(ingredient => {
        const inventoryItem = getInventoryItem(ingredient.inventoryItemId);
        const availableQty = inventoryItem ? (inventoryItem.quantity || 0) : 0;
        const requiredPerUnit = ingredient.quantity || 1;
        
        const possibleUnits = Math.floor(availableQty / requiredPerUnit);
        maxQty = Math.min(maxQty, possibleUnits);
    });
    
    return maxQty === Infinity ? 0 : maxQty;
}

// ==================== PRODUCTION ORDERS ====================
function generateProductionId() {
    const date = new Date();
    const prefix = 'PROD';
    const dateStr = date.getFullYear().toString().slice(-2) + 
                    String(date.getMonth() + 1).padStart(2, '0') +
                    String(date.getDate()).padStart(2, '0');
    const seq = String(bomProduction.length + 1).padStart(4, '0');
    return `${prefix}-${dateStr}-${seq}`;
}

function createProductionOrder(recipeId, quantity, notes = '') {
    const recipe = getRecipeById(recipeId);
    if (!recipe) return { success: false, error: 'Recipe not found' };
    
    // Check availability
    const availability = checkIngredientAvailability(recipe, quantity);
    
    const production = {
        id: generateProductionId(),
        recipeId: recipeId,
        recipeName: recipe.name,
        quantity: quantity,
        outputQuantity: quantity * (recipe.outputQuantity || 1),
        outputUnit: recipe.outputUnit,
        status: 'pending', // pending, in-progress, completed, cancelled
        ingredientsSnapshot: recipe.ingredients.map(ing => ({
            ...ing,
            requiredQty: ing.quantity * quantity
        })),
        estimatedCost: recipe.calculatedCost * quantity,
        notes: notes,
        canProduce: availability.canProduce,
        availabilityCheck: availability,
        createdAt: new Date().toISOString(),
        createdBy: window.currentUser ? window.currentUser.name : 'System',
        completedAt: null,
        completedBy: null
    };
    
    bomProduction.unshift(production);
    saveProduction();
    
    return { success: true, production };
}

function completeProductionOrder(productionId, actualQuantity = null) {
    const index = bomProduction.findIndex(p => p.id === productionId);
    if (index === -1) return { success: false, error: 'Production order not found' };
    
    const production = bomProduction[index];
    
    if (production.status === 'completed') {
        return { success: false, error: 'Production already completed' };
    }
    
    if (production.status === 'cancelled') {
        return { success: false, error: 'Cannot complete cancelled production' };
    }
    
    // Deduct ingredients from inventory
    const deductResult = deductIngredientsForProduction(production);
    
    if (!deductResult.success) {
        return deductResult;
    }
    
    // Update production order
    production.status = 'completed';
    production.completedAt = new Date().toISOString();
    production.completedBy = window.currentUser ? window.currentUser.name : 'System';
    production.actualQuantity = actualQuantity || production.outputQuantity;
    production.deductionLog = deductResult.log;
    
    // Add finished product to inventory (if linked)
    const recipe = getRecipeById(production.recipeId);
    if (recipe && recipe.outputProductId) {
        addFinishedProductToInventory(recipe.outputProductId, production.actualQuantity);
    }
    
    saveProduction();
    
    return { success: true, production };
}

function cancelProductionOrder(productionId, reason = '') {
    const index = bomProduction.findIndex(p => p.id === productionId);
    if (index === -1) return { success: false, error: 'Production order not found' };
    
    const production = bomProduction[index];
    
    if (production.status === 'completed') {
        return { success: false, error: 'Cannot cancel completed production' };
    }
    
    production.status = 'cancelled';
    production.cancelledAt = new Date().toISOString();
    production.cancelledBy = window.currentUser ? window.currentUser.name : 'System';
    production.cancelReason = reason;
    
    saveProduction();
    
    return { success: true, production };
}

// ==================== STOCK INTERACTION (SAFE) ====================
function deductIngredientsForProduction(production) {
    const log = [];
    const items = window.inventoryItems || [];
    
    // First verify all ingredients are available
    for (const ingredient of production.ingredientsSnapshot) {
        const item = items.find(i => i.id === ingredient.inventoryItemId);
        if (!item) {
            return { 
                success: false, 
                error: `Ingredient not found: ${ingredient.name}`,
                log 
            };
        }
        if ((item.quantity || 0) < ingredient.requiredQty) {
            return { 
                success: false, 
                error: `Insufficient stock: ${ingredient.name} (need ${ingredient.requiredQty}, have ${item.quantity})`,
                log 
            };
        }
    }
    
    // Deduct all ingredients
    for (const ingredient of production.ingredientsSnapshot) {
        const item = items.find(i => i.id === ingredient.inventoryItemId);
        const previousQty = item.quantity;
        item.quantity = (item.quantity || 0) - ingredient.requiredQty;
        
        log.push({
            itemId: item.id,
            itemName: item.name,
            previousQty: previousQty,
            deducted: ingredient.requiredQty,
            newQty: item.quantity,
            timestamp: new Date().toISOString()
        });
    }
    
    // Save inventory changes
    if (typeof saveInventory === 'function') {
        saveInventory();
    } else if (typeof window.saveInventoryData === 'function') {
        window.saveInventoryData();
    } else {
        // Fallback: save directly
        localStorage.setItem('ezcubic_inventory', JSON.stringify(items));
    }
    
    return { success: true, log };
}

function addFinishedProductToInventory(productId, quantity) {
    const items = window.inventoryItems || [];
    const item = items.find(i => i.id === productId);
    
    if (item) {
        item.quantity = (item.quantity || 0) + quantity;
        
        // Save inventory changes
        if (typeof saveInventory === 'function') {
            saveInventory();
        } else if (typeof window.saveInventoryData === 'function') {
            window.saveInventoryData();
        } else {
            localStorage.setItem('ezcubic_inventory', JSON.stringify(items));
        }
        
        return true;
    }
    
    return false;
}

// ==================== REPORTS ====================
function generateRecipeReport(recipeId) {
    const recipe = getRecipeById(recipeId);
    if (!recipe) return null;
    
    const availability = checkIngredientAvailability(recipe, 1);
    const maxProducible = getMaxProducibleQuantity(recipe);
    
    // Production history
    const productionHistory = bomProduction.filter(p => p.recipeId === recipeId);
    const completedProductions = productionHistory.filter(p => p.status === 'completed');
    const totalProduced = completedProductions.reduce((sum, p) => sum + (p.actualQuantity || 0), 0);
    const totalCostSpent = completedProductions.reduce((sum, p) => sum + (p.estimatedCost || 0), 0);
    
    return {
        recipe,
        availability,
        maxProducible,
        stats: {
            totalProductions: productionHistory.length,
            completedProductions: completedProductions.length,
            totalProduced,
            totalCostSpent,
            averageCostPerUnit: completedProductions.length > 0 ? totalCostSpent / totalProduced : recipe.calculatedCost
        },
        recentProductions: productionHistory.slice(0, 10)
    };
}

// ==================== SYNC FROM TENANT ====================
window.syncBOMFromTenant = function(tenantData) {
    if (tenantData.bomRecipes) {
        bomRecipes = tenantData.bomRecipes;
        localStorage.setItem(BOM_KEY, JSON.stringify(bomRecipes));
    }
    if (tenantData.bomProduction) {
        bomProduction = tenantData.bomProduction;
        localStorage.setItem(BOM_PRODUCTION_KEY, JSON.stringify(bomProduction));
    }
};

// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(initBOM, 1500);
});

console.log('🏭 BOM Core loaded');
