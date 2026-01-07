// ==================== CHATBOT.JS ====================
// AI Chatbot Functions
console.log('🤖 Loading chatbot.js...');

// ==================== STATE VARIABLES ====================
let isChatbotActive = false;
let chatHistory = [];
let unreadMessages = 0;

// ==================== USER-SCOPED STORAGE HELPER ====================
// Ensures each user's data is isolated (privacy protection)
function getUserStorageKey(baseKey) {
    const user = window.currentUser;
    if (user && user.id) {
        return `ezcubic_${user.id}_${baseKey}`;
    } else if (user && user.email) {
        // Fallback to email hash if no id
        const emailHash = user.email.split('@')[0].replace(/[^a-zA-Z0-9]/g, '');
        return `ezcubic_${emailHash}_${baseKey}`;
    }
    // Guest/anonymous user - use generic key (will be cleared on login)
    return `ezcubic_guest_${baseKey}`;
}

// Get current user identifier for logging
function getCurrentUserIdentifier() {
    const user = window.currentUser;
    if (user) {
        return user.name || user.email || user.id || 'Unknown';
    }
    return 'Guest';
}

// ==================== AI MEMORY / SELF-LEARNING SYSTEM ====================
// Stores corrections, preferences, and learned patterns (USER-SCOPED)
let aiMemory = {
    corrections: {},      // { "petrol": "Fuel", "makan": "Food" }
    entityTypes: {},      // { "ABC Sdn Bhd": "supplier", "John": "customer" }
    preferences: {},      // { language: "en", responseStyle: "short" }
    customTerms: {},      // { "boss": "manager", "kedai": "shop" }
    typoFixes: {},        // { "invioce": "invoice", "qoutation": "quotation" }
    lastUpdated: null,
    userId: null          // Track which user this memory belongs to
};

// Load AI Memory from localStorage (USER-SCOPED) + Cloud sync
async function loadAIMemory() {
    try {
        const storageKey = getUserStorageKey('ai_memory');
        const saved = localStorage.getItem(storageKey);
        if (saved) {
            const parsed = JSON.parse(saved);
            aiMemory = { ...aiMemory, ...parsed };
            console.log(`🧠 AI Memory loaded for ${getCurrentUserIdentifier()}:`, Object.keys(aiMemory.corrections).length, 'corrections');
        } else {
            // Reset memory for new user
            aiMemory = {
                corrections: {},
                entityTypes: {},
                preferences: {},
                customTerms: {},
                typoFixes: {},
                lastUpdated: null,
                userId: window.currentUser?.id || null
            };
            console.log(`🧠 New AI Memory initialized for ${getCurrentUserIdentifier()}`);
        }
        
        // Also try to load from cloud (Supabase)
        await loadAIMemoryFromCloud();
    } catch (e) {
        console.error('Error loading AI memory:', e);
    }
}

// ==================== CLOUD AI MEMORY SYNC (SUPABASE) ====================
// Syncs AI memory to cloud so it follows the user across devices

const AI_MEMORY_TABLE = 'ai_user_memory';

// Load AI Memory from cloud (Supabase)
async function loadAIMemoryFromCloud() {
    try {
        const user = window.currentUser;
        if (!user || !user.id) {
            console.log('🧠 No user logged in, skipping cloud memory load');
            return;
        }
        
        // Check if Supabase is available
        if (typeof getSupabase !== 'function') {
            console.log('🧠 Supabase not available, using local memory only');
            return;
        }
        
        const supabase = getSupabase();
        if (!supabase) {
            console.log('🧠 Supabase client not ready');
            return;
        }
        
        console.log(`☁️ Loading AI memory from cloud for user ${user.id}...`);
        
        const { data, error } = await supabase
            .from(AI_MEMORY_TABLE)
            .select('*')
            .eq('user_id', user.id)
            .single();
        
        if (error) {
            if (error.code === 'PGRST116') {
                // No data found - this is OK for new users
                console.log('☁️ No cloud AI memory found, starting fresh');
                return;
            }
            throw error;
        }
        
        if (data && data.memory_data) {
            // Merge cloud data with local (cloud takes priority)
            const cloudMemory = typeof data.memory_data === 'string' 
                ? JSON.parse(data.memory_data) 
                : data.memory_data;
            
            aiMemory = {
                corrections: { ...aiMemory.corrections, ...cloudMemory.corrections },
                entityTypes: { ...aiMemory.entityTypes, ...cloudMemory.entityTypes },
                preferences: { ...aiMemory.preferences, ...cloudMemory.preferences },
                customTerms: { ...aiMemory.customTerms, ...cloudMemory.customTerms },
                typoFixes: { ...aiMemory.typoFixes, ...cloudMemory.typoFixes },
                lastUpdated: cloudMemory.lastUpdated || new Date().toISOString(),
                userId: user.id
            };
            
            // Also save to local for offline access
            const storageKey = getUserStorageKey('ai_memory');
            localStorage.setItem(storageKey, JSON.stringify(aiMemory));
            
            console.log(`☁️ AI Memory loaded from cloud:`, Object.keys(aiMemory.corrections).length, 'corrections');
        }
    } catch (e) {
        console.error('☁️ Error loading AI memory from cloud:', e);
        // Continue with local memory
    }
}

// Save AI Memory to cloud (Supabase) - IMMEDIATE SYNC
async function saveAIMemoryToCloud() {
    try {
        const user = window.currentUser;
        if (!user || !user.id) {
            console.log('🧠 No user logged in, skipping cloud memory save');
            return false;
        }
        
        // Check if Supabase is available
        if (typeof getSupabase !== 'function') {
            console.log('🧠 Supabase not available');
            return false;
        }
        
        const supabase = getSupabase();
        if (!supabase) {
            console.log('🧠 Supabase client not ready');
            return false;
        }
        
        console.log(`☁️ Saving AI memory to cloud for user ${user.id}...`);
        
        const { data, error } = await supabase
            .from(AI_MEMORY_TABLE)
            .upsert({
                user_id: user.id,
                memory_data: aiMemory,
                updated_at: new Date().toISOString()
            }, {
                onConflict: 'user_id'
            });
        
        if (error) throw error;
        
        console.log(`☁️ AI Memory saved to cloud successfully`);
        return true;
    } catch (e) {
        console.error('☁️ Error saving AI memory to cloud:', e);
        return false;
    }
}

// Save AI Memory to localStorage AND cloud (USER-SCOPED + CLOUD SYNC)
function saveAIMemory() {
    try {
        const storageKey = getUserStorageKey('ai_memory');
        aiMemory.lastUpdated = new Date().toISOString();
        aiMemory.userId = window.currentUser?.id || null;
        localStorage.setItem(storageKey, JSON.stringify(aiMemory));
        
        // IMMEDIATE cloud sync (non-blocking)
        saveAIMemoryToCloud().catch(err => {
            console.warn('☁️ Cloud sync failed (will retry):', err);
        });
    } catch (e) {
        console.error('Error saving AI memory:', e);
    }
}

// Learn a category correction
function learnCategoryCorrection(keyword, correctCategory) {
    const key = keyword.toLowerCase().trim();
    aiMemory.corrections[key] = correctCategory;
    saveAIMemory();
    console.log(`🧠 Learned: "${key}" → category "${correctCategory}"`);
    return true;
}

// Learn entity type (supplier, customer, product, etc.)
function learnEntityType(entityName, entityType) {
    const key = entityName.toLowerCase().trim();
    aiMemory.entityTypes[key] = entityType;
    saveAIMemory();
    console.log(`🧠 Learned: "${key}" is a ${entityType}`);
    return true;
}

// Learn user preference
function learnPreference(prefKey, prefValue) {
    aiMemory.preferences[prefKey] = prefValue;
    saveAIMemory();
    console.log(`🧠 Preference saved: ${prefKey} = ${prefValue}`);
    return true;
}

// Learn custom term/alias
function learnCustomTerm(term, meaning) {
    const key = term.toLowerCase().trim();
    aiMemory.customTerms[key] = meaning;
    saveAIMemory();
    console.log(`🧠 Learned term: "${key}" means "${meaning}"`);
    return true;
}

// Learn typo correction
function learnTypoFix(typo, correct) {
    const key = typo.toLowerCase().trim();
    aiMemory.typoFixes[key] = correct;
    saveAIMemory();
    console.log(`🧠 Learned typo: "${key}" → "${correct}"`);
    return true;
}

// Get learned category for a keyword
function getLearnedCategory(keyword) {
    const key = keyword.toLowerCase().trim();
    return aiMemory.corrections[key] || null;
}

// Get learned entity type
function getLearnedEntityType(entityName) {
    const key = entityName.toLowerCase().trim();
    return aiMemory.entityTypes[key] || null;
}

// Get user preference
function getPreference(prefKey, defaultValue = null) {
    return aiMemory.preferences[prefKey] || defaultValue;
}

// Apply learned typo fixes to message
function applyLearnedTypoFixes(message) {
    let fixed = message;
    for (const [typo, correct] of Object.entries(aiMemory.typoFixes)) {
        const regex = new RegExp(`\\b${typo}\\b`, 'gi');
        fixed = fixed.replace(regex, correct);
    }
    return fixed;
}

// Apply custom terms to message
function applyCustomTerms(message) {
    let processed = message;
    for (const [term, meaning] of Object.entries(aiMemory.customTerms)) {
        const regex = new RegExp(`\\b${term}\\b`, 'gi');
        processed = processed.replace(regex, meaning);
    }
    return processed;
}

// Detect correction patterns in user message
function detectCorrection(message) {
    const lowerMsg = message.toLowerCase();
    
    // Patterns that indicate user is correcting AI
    const correctionPatterns = [
        // "petrol should be under Fuel" or "petrol should be Fuel"
        /(?:no[,.]?\s*)?(\w+)\s+should\s+be\s+(?:under\s+)?(?:category\s+)?["']?(\w+)["']?$/i,
        // "petrol is under Fuel" or "petrol goes under Fuel"
        /(?:no[,.]?\s*)?(\w+)\s+(?:is|goes|belongs)\s+(?:to\s+)?under\s+(?:category\s+)?["']?(\w+)["']?$/i,
        // "put petrol under Fuel" or "categorize petrol as Fuel"
        /(?:put|record|file|categorize)\s+(\w+)\s+(?:under|as)\s+(?:category\s+)?["']?(\w+)["']?$/i,
        // "petrol is Fuel category" or "petrol use Fuel"
        /(?:no[,.]?\s*)?(\w+)\s+(?:is|use)\s+(?:category\s+)?["']?(\w+)["']?\s*(?:category)?$/i,
        // "X is not Y, it's Z" pattern
        /(\w+)\s+is\s+not\s+\w+[,.]?\s*(?:it'?s?|should be|use)\s+["']?(\w+)["']?/i
    ];
    
    for (const pattern of correctionPatterns) {
        const match = message.match(pattern);
        if (match) {
            return {
                type: 'category',
                keyword: match[1].trim(),
                correction: match[2].trim()
            };
        }
    }
    
    // Entity type corrections: "ABC is a supplier not customer"
    const entityPatterns = [
        /["']?(.+?)["']?\s+is\s+(?:a\s+)?(supplier|customer|product|employee|vendor)[,.]?\s*not\s+(?:a\s+)?\w+/i,
        /["']?(.+?)["']?\s+is\s+(?:a\s+)?(supplier|customer|product|employee|vendor)/i
    ];
    
    for (const pattern of entityPatterns) {
        const match = message.match(pattern);
        if (match) {
            return {
                type: 'entity',
                name: match[1].trim(),
                entityType: match[2].toLowerCase().trim()
            };
        }
    }
    
    // Typo corrections: "I meant invoice not invioce"
    const typoPatterns = [
        /i\s+meant?\s+["']?(\w+)["']?\s*(?:not|instead of)\s+["']?(\w+)["']?/i,
        /(?:it'?s?|should be|correct is)\s+["']?(\w+)["']?\s*not\s+["']?(\w+)["']?/i
    ];
    
    for (const pattern of typoPatterns) {
        const match = message.match(pattern);
        if (match) {
            return {
                type: 'typo',
                correct: match[1].trim(),
                typo: match[2].trim()
            };
        }
    }
    
    return null;
}

// Process and learn from user correction
function processCorrection(message) {
    const correction = detectCorrection(message);
    
    if (!correction) return null;
    
    let response = '';
    
    switch (correction.type) {
        case 'category':
            learnCategoryCorrection(correction.keyword, correction.correction);
            response = `🧠 Got it! I'll remember "${correction.keyword}" goes under "${correction.correction}" category from now on.`;
            break;
            
        case 'entity':
            learnEntityType(correction.name, correction.entityType);
            response = `🧠 Got it! I'll remember "${correction.name}" is a ${correction.entityType}.`;
            break;
            
        case 'typo':
            learnTypoFix(correction.typo, correction.correct);
            response = `🧠 Got it! I'll auto-correct "${correction.typo}" to "${correction.correct}" next time.`;
            break;
    }
    
    return response;
}

// Detect language preference
function detectLanguagePreference(message) {
    const lowerMsg = message.toLowerCase();
    
    // Malay indicators
    const malayWords = ['saya', 'nak', 'macam', 'mana', 'tolong', 'boleh', 'apa', 'bila', 'mahu', 'hendak', 'dengan', 'untuk', 'dalam', 'ada'];
    const malayCount = malayWords.filter(w => lowerMsg.includes(w)).length;
    
    // Chinese indicators (simplified check)
    const hasChineseChars = /[\u4e00-\u9fa5]/.test(message);
    
    if (hasChineseChars) {
        return 'zh';
    } else if (malayCount >= 2) {
        return 'ms';
    }
    
    return 'en';
}

// Get AI memory stats
function getAIMemoryStats() {
    return {
        corrections: Object.keys(aiMemory.corrections).length,
        entityTypes: Object.keys(aiMemory.entityTypes).length,
        customTerms: Object.keys(aiMemory.customTerms).length,
        typoFixes: Object.keys(aiMemory.typoFixes).length,
        preferences: Object.keys(aiMemory.preferences).length,
        lastUpdated: aiMemory.lastUpdated
    };
}

// Clear AI memory (for testing/reset)
function clearAIMemory() {
    aiMemory = {
        corrections: {},
        entityTypes: {},
        preferences: {},
        customTerms: {},
        typoFixes: {},
        lastUpdated: null,
        userId: null
    };
    const storageKey = getUserStorageKey('ai_memory');
    localStorage.removeItem(storageKey);
    console.log(`🧠 AI Memory cleared for ${getCurrentUserIdentifier()}`);
    return true;
}

// Show what AI has learned
function showAIMemory() {
    const stats = getAIMemoryStats();
    const user = window.currentUser;
    const hasCloud = typeof getSupabase === 'function' && user?.id;
    
    let response = `🧠 **AI Memory Status**\n\n`;
    response += `👤 User: ${getCurrentUserIdentifier()}\n`;
    response += `☁️ Cloud Sync: ${hasCloud ? '✅ Enabled' : '❌ Local only'}\n\n`;
    response += `📝 Category corrections: ${stats.corrections}\n`;
    response += `👤 Entity types learned: ${stats.entityTypes}\n`;
    response += `📖 Custom terms: ${stats.customTerms}\n`;
    response += `✏️ Typo fixes: ${stats.typoFixes}\n`;
    
    if (stats.corrections > 0) {
        response += `\n**Categories I've learned:**\n`;
        for (const [key, val] of Object.entries(aiMemory.corrections)) {
            response += `• "${key}" → ${val}\n`;
        }
    }
    
    if (stats.entityTypes > 0) {
        response += `\n**Entities I know:**\n`;
        for (const [key, val] of Object.entries(aiMemory.entityTypes)) {
            response += `• "${key}" is a ${val}\n`;
        }
    }
    
    if (stats.typoFixes > 0) {
        response += `\n**Typos I auto-correct:**\n`;
        for (const [key, val] of Object.entries(aiMemory.typoFixes)) {
            response += `• "${key}" → "${val}"\n`;
        }
    }
    
    if (aiMemory.lastUpdated) {
        response += `\n⏰ Last updated: ${new Date(aiMemory.lastUpdated).toLocaleString()}`;
    }
    
    return response;
}

// Force sync AI memory to cloud
async function syncAIMemoryNow() {
    const success = await saveAIMemoryToCloud();
    return success ? '☁️ AI Memory synced to cloud!' : '❌ Cloud sync failed';
}

// Export memory functions to window
window.learnCategoryCorrection = learnCategoryCorrection;
window.learnEntityType = learnEntityType;
window.learnTypoFix = learnTypoFix;
window.showAIMemory = showAIMemory;
window.clearAIMemory = clearAIMemory;
window.getAIMemoryStats = getAIMemoryStats;
window.syncAIMemoryNow = syncAIMemoryNow;
window.loadAIMemoryFromCloud = loadAIMemoryFromCloud;

// ==================== AI PENDING APPROVALS (USER-SCOPED) ====================
let aiPendingApprovals = [];

function loadPendingApprovals() {
    try {
        const storageKey = getUserStorageKey('ai_pending_approvals');
        const saved = localStorage.getItem(storageKey);
        if (saved) {
            aiPendingApprovals = JSON.parse(saved);
            console.log(`📋 Loaded ${aiPendingApprovals.length} pending approvals for ${getCurrentUserIdentifier()}`);
        } else {
            aiPendingApprovals = [];
        }
    } catch (e) {
        console.error('Error loading pending approvals:', e);
        aiPendingApprovals = [];
    }
}

function savePendingApprovals() {
    try {
        const storageKey = getUserStorageKey('ai_pending_approvals');
        localStorage.setItem(storageKey, JSON.stringify(aiPendingApprovals));
    } catch (e) {
        console.error('Error saving pending approvals:', e);
    }
}

// Add action to pending queue instead of executing immediately
function queueAIAction(action, description) {
    const pendingItem = {
        id: 'PENDING_' + Date.now(),
        action: action,
        description: description,
        createdAt: new Date().toISOString(),
        status: 'pending' // pending, approved, rejected
    };
    
    aiPendingApprovals.push(pendingItem);
    savePendingApprovals();
    updatePendingApprovalsUI();
    
    return pendingItem;
}

// Approve and execute a pending action
function approveAIAction(pendingId) {
    const index = aiPendingApprovals.findIndex(p => p.id === pendingId);
    if (index === -1) return;
    
    const pending = aiPendingApprovals[index];
    pending.status = 'approved';
    pending.approvedAt = new Date().toISOString();
    
    // Execute the actual action
    const result = executeApprovedAction(pending.action);
    
    // Remove from pending list
    aiPendingApprovals.splice(index, 1);
    savePendingApprovals();
    updatePendingApprovalsUI();
    
    if (result.success) {
        showNotification(`✅ Approved: ${pending.description}`, 'success');
        
        // SMART FOLLOW-UP: After stock in, offer transfer to outlets if user has multiple branches
        if (pending.action.action === 'stock_in') {
            // Check if cost was recorded
            const costRecorded = result.result?.costRecorded;
            if (!costRecorded && costRecorded !== 0) {
                // Show warning that no cost was recorded
                setTimeout(() => {
                    addChatMessage(`⚠️ No cost recorded. Set in **Inventory** or say "stock in 10 Beer cost RM5"`, false);
                }, 300);
            }
            
            offerStockTransferAfterStockIn(pending.action, result.result);
        }
    } else {
        showNotification(`❌ Failed: ${result.error}`, 'error');
    }
    
    return result;
}

// Smart follow-up: Offer stock transfer to outlets after stock in
function offerStockTransferAfterStockIn(action, result) {
    const branches = window.branches || [];
    const activeBranches = branches.filter(b => b.status === 'active' && b.id !== 'BRANCH_HQ');
    
    // Only show if user has more than 1 outlet (besides HQ)
    if (activeBranches.length === 0) return;
    
    const productName = action.product || action.name;
    const quantity = parseInt(action.quantity) || 0;
    const newStock = result?.newStock || quantity;
    
    // Build branch options
    const branchList = activeBranches.slice(0, 5).map(b => b.name).join(', ');
    
    // Add follow-up message to chat
    setTimeout(() => {
        const followUpMessage = `✅ **+${quantity} ${productName}** to HQ (Total: ${newStock})\n\n` +
            `🏢 ${activeBranches.length} outlet(s): ${branchList}\n` +
            `Transfer? "transfer 10 ${productName} to [outlet]" or "split to all"`;
        
        addChatMessage(followUpMessage, false);
        
        // Show quick action buttons
        showStockTransferQuickActions(productName, activeBranches, newStock);
    }, 500);
}

// Show quick action buttons for stock transfer
function showStockTransferQuickActions(productName, branches, availableStock) {
    const actionsContainer = document.getElementById('chatbotSmartActions');
    if (!actionsContainer) return;
    
    // Create quick transfer buttons
    const quickActions = [];
    
    // Add "Split equally" option if multiple branches
    if (branches.length > 1 && availableStock >= branches.length) {
        const perBranch = Math.floor(availableStock / branches.length);
        quickActions.push({
            label: `📦 Split ${perBranch} each to ${branches.length} outlets`,
            query: `split ${availableStock} ${productName} equally to all outlets`
        });
    }
    
    // Add individual branch transfer options (max 3)
    branches.slice(0, 3).forEach(branch => {
        quickActions.push({
            label: `➡️ Transfer to ${branch.name}`,
            query: `transfer ${productName} to ${branch.name}`
        });
    });
    
    // Add "No transfer needed" option
    quickActions.push({
        label: `✓ No transfer needed`,
        query: `ok, no transfer needed`
    });
    
    actionsContainer.innerHTML = quickActions.map(action => 
        `<button class="smart-action-btn" onclick="askQuickQuestion('${action.query}')">${action.label}</button>`
    ).join('');
    actionsContainer.style.display = 'flex';
}

// Reject a pending action
function rejectAIAction(pendingId) {
    const index = aiPendingApprovals.findIndex(p => p.id === pendingId);
    if (index === -1) return;
    
    const pending = aiPendingApprovals[index];
    aiPendingApprovals.splice(index, 1);
    savePendingApprovals();
    updatePendingApprovalsUI();
    
    showNotification(`🚫 Rejected: ${pending.description}`, 'info');
}

// Edit pending action before approval
function editAIAction(pendingId) {
    const pending = aiPendingApprovals.find(p => p.id === pendingId);
    if (!pending) return;
    
    // Navigate to the appropriate section based on action type
    const action = pending.action;
    const sectionMap = {
        'add_product': 'inventory',
        'add_expense': 'expenses',
        'add_income': 'income',
        'add_customer': 'crm',
        'add_supplier': 'crm',
        'create_invoice': 'orders',
        'create_quotation': 'quotations',
        'create_order': 'orders',
        'create_project': 'projects',
        'add_bill': 'bills',
        'add_employee': 'payroll',
        'create_do': 'orders'
    };
    
    const section = sectionMap[action.action] || 'dashboard';
    
    // Show the section
    if (typeof showSection === 'function') {
        showSection(section);
    }
    
    // Pre-fill form based on action type (you can add more cases)
    setTimeout(() => {
        prefillFormFromAction(action);
    }, 300);
    
    // Remove from pending since user will create manually
    rejectAIAction(pendingId);
    
    showNotification(`📝 Opening ${section} - you can create manually with the data`, 'info');
}

// Pre-fill form fields from action data
function prefillFormFromAction(action) {
    // This will vary by action type - add specific prefill logic
    if (action.action === 'add_product' && document.getElementById('productName')) {
        document.getElementById('productName').value = action.name || '';
        document.getElementById('productPrice').value = action.price || '';
        document.getElementById('productCost').value = action.cost || '';
        document.getElementById('productStock').value = action.quantity || '';
    }
    // Add more prefill cases as needed
}

// Execute approved action (the actual work)
function executeApprovedAction(action) {
    try {
        let result;
        
        switch(action.action) {
            case 'add_expense':
                result = doAddExpense(action);
                break;
            case 'add_income':
                result = doAddIncome(action);
                break;
            case 'add_product':
                result = doAddProduct(action);
                break;
            case 'stock_in':
                result = doStockIn(action);
                break;
            case 'stock_out':
                result = doStockOut(action);
                break;
            case 'add_customer':
                result = doAddCustomer(action);
                break;
            case 'add_supplier':
                result = doAddSupplier(action);
                break;
            case 'create_invoice':
                result = doCreateInvoice(action);
                break;
            case 'create_quotation':
                result = doCreateQuotation(action);
                break;
            case 'create_order':
                result = doCreateOrder(action);
                break;
            case 'add_bill':
                result = doAddBill(action);
                break;
            case 'create_project':
                result = doCreateProject(action);
                break;
            case 'add_employee':
                result = doAddEmployee(action);
                break;
            case 'stock_transfer':
            case 'transfer_stock':
                result = executeStockTransfer(action);
                if (result.isAction) {
                    return { success: true, result: result.message };
                }
                break;
            case 'add_branch':
            case 'add_outlet':
                result = doAddBranch(action);
                break;
            case 'create_bom':
                result = doCreateBOM(action);
                break;
            case 'create_do':
            case 'create_delivery_order':
                result = doCreateDO(action);
                break;
            case 'create_kpi':
                result = doCreateKPI(action);
                break;
            case 'create_journal':
            case 'journal_entry':
                result = doCreateJournal(action);
                break;
            case 'apply_leave':
            case 'create_leave':
                result = doApplyLeave(action);
                break;
            case 'pos_sale':
            case 'quick_sale':
            case 'create_sale':
                result = doPOSSale(action);
                break;
            default:
                return { success: false, error: 'Unknown action type: ' + action.action };
        }
        
        return { success: true, result };
    } catch (e) {
        console.error('Error executing approved action:', e);
        return { success: false, error: e.message };
    }
}

// Update the pending approvals UI panel
function updatePendingApprovalsUI() {
    const container = document.getElementById('aiPendingApprovalsPanel');
    const badge = document.getElementById('aiPendingBadge');
    const topBadge = document.getElementById('aiPendingTopBadge');
    
    // Update badge count (both floating and top bar)
    const count = aiPendingApprovals.length;
    if (badge) {
        badge.textContent = count;
        badge.style.display = count > 0 ? 'flex' : 'none';
    }
    if (topBadge) {
        topBadge.textContent = count;
        topBadge.style.display = count > 0 ? 'flex' : 'none';
    }
    
    if (!container) return;
    
    if (aiPendingApprovals.length === 0) {
        container.innerHTML = `
            <div class="ai-pending-empty">
                <i class="fas fa-check-circle"></i>
                <p>No pending approvals</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = aiPendingApprovals.map(pending => {
        const actionIcons = {
            'add_product': 'fa-box',
            'add_expense': 'fa-receipt',
            'add_income': 'fa-money-bill-wave',
            'add_customer': 'fa-user-plus',
            'add_supplier': 'fa-truck',
            'create_invoice': 'fa-file-invoice-dollar',
            'create_quotation': 'fa-file-alt',
            'create_order': 'fa-shopping-cart',
            'create_project': 'fa-project-diagram',
            'add_bill': 'fa-file-invoice',
            'add_employee': 'fa-user-tie',
            'add_branch': 'fa-store',
            'add_outlet': 'fa-store',
            'stock_in': 'fa-arrow-down',
            'stock_out': 'fa-arrow-up',
            'stock_transfer': 'fa-exchange-alt',
            'transfer_stock': 'fa-exchange-alt',
            'create_bom': 'fa-cogs',
            'create_do': 'fa-truck-loading',
            'create_delivery_order': 'fa-truck-loading',
            'create_kpi': 'fa-chart-line',
            'create_journal': 'fa-book',
            'journal_entry': 'fa-book',
            'apply_leave': 'fa-calendar-minus',
            'create_leave': 'fa-calendar-minus',
            'pos_sale': 'fa-cash-register',
            'quick_sale': 'fa-cash-register',
            'create_sale': 'fa-cash-register'
        };
        
        const icon = actionIcons[pending.action.action] || 'fa-robot';
        const timeAgo = getTimeAgo(pending.createdAt);
        
        // Build preview of the data
        let preview = '';
        const a = pending.action;
        if (a.name) preview += `<strong>${a.name}</strong>`;
        if (a.amount) preview += ` - RM${parseFloat(a.amount).toFixed(2)}`;
        if (a.price) preview += ` - RM${parseFloat(a.price).toFixed(2)}`;
        if (a.quantity) preview += ` (${a.quantity} units)`;
        if (a.customer) preview += ` for ${a.customer}`;
        if (a.product) preview += ` - ${a.product}`;
        if (a.debit && a.credit) preview += ` Dr:${a.debit} Cr:${a.credit}`;
        if (a.employee) preview += ` - ${a.employee}`;
        if (a.target) preview += ` Target: ${a.target}`;
        if (a.to) preview += ` → ${a.to}`;
        if (a.payment) preview += ` (${a.payment})`;
        if (a.type) preview += ` [${a.type}]`;
        
        return `
            <div class="ai-pending-card">
                <div class="ai-pending-header">
                    <div class="ai-pending-icon"><i class="fas ${icon}"></i></div>
                    <div class="ai-pending-info">
                        <div class="ai-pending-title">${pending.description}</div>
                        <div class="ai-pending-preview">${preview}</div>
                        <div class="ai-pending-time"><i class="fas fa-clock"></i> ${timeAgo}</div>
                    </div>
                </div>
                <div class="ai-pending-actions">
                    <button class="ai-btn-approve" onclick="approveAIAction('${pending.id}')" title="Approve & Execute">
                        <i class="fas fa-check"></i> Approve
                    </button>
                    <button class="ai-btn-edit" onclick="editAIAction('${pending.id}')" title="Edit manually">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="ai-btn-reject" onclick="rejectAIAction('${pending.id}')" title="Reject">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

// Helper: Get time ago string
function getTimeAgo(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now - date) / 1000);
    
    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
}

// Toggle pending approvals panel
function togglePendingApprovalsPanel() {
    const panel = document.getElementById('aiPendingApprovalsContainer');
    if (panel) {
        panel.classList.toggle('show');
        if (panel.classList.contains('show')) {
            updatePendingApprovalsUI();
        }
    }
}

// Export to window
window.approveAIAction = approveAIAction;
window.rejectAIAction = rejectAIAction;
window.editAIAction = editAIAction;
window.togglePendingApprovalsPanel = togglePendingApprovalsPanel;
window.updatePendingApprovalsUI = updatePendingApprovalsUI;
window.loadPendingApprovals = loadPendingApprovals;

// Test function for localhost - simulate AI actions
function testAIPendingApproval(type = 'product') {
    const testActions = {
        product: {
            action: 'add_product',
            name: 'Test Product ' + Date.now().toString().slice(-4),
            price: Math.floor(Math.random() * 100) + 10,
            cost: Math.floor(Math.random() * 50) + 5,
            quantity: Math.floor(Math.random() * 50) + 1,
            category: 'General'
        },
        expense: {
            action: 'add_expense',
            amount: Math.floor(Math.random() * 200) + 20,
            description: 'Test Expense',
            category: 'Office Supplies'
        },
        customer: {
            action: 'add_customer',
            name: 'Test Customer ' + Date.now().toString().slice(-4),
            phone: '012-345' + Math.floor(Math.random() * 10000),
            email: 'test@example.com'
        },
        invoice: {
            action: 'create_invoice',
            customer: 'Test Customer',
            total: Math.floor(Math.random() * 1000) + 100
        },
        quotation: {
            action: 'create_quotation',
            customer: 'Test Customer',
            title: 'Test Quote',
            total: Math.floor(Math.random() * 5000) + 500
        }
    };
    
    const action = testActions[type] || testActions.product;
    const description = buildActionDescription(action);
    
    queueAIAction(action, description);
    
    showNotification(`📋 Test ${type} added to pending approvals`, 'info');
    console.log('🧪 Test pending approval added:', action);
    
    return action;
}
window.testAIPendingApproval = testAIPendingApproval;

// ==================== ALPHA 5 LEARNING SYSTEM (Phase 5.4) ====================
// Company-wide learning - All staff benefit from training done by anyone
// Option B: Local Learning + Option C: FAQ Collection

const LEARNING_STORAGE_KEY = 'alpha5_learning';
const FAQ_COLLECTION_KEY = 'alpha5_faq_collection';

// Learning data structure (company-wide)
let alpha5Learning = {
    customResponses: {},      // { "how to backup": "Go to Settings > Backup..." }
    shortcuts: {},            // { "my branch": "Branch Setapak", "boss": "John Tan" }
    frequentQuestions: [],    // [{question, count, lastAsked}]
    unansweredQuestions: [],  // [{question, timestamp, askedBy}]
    helpfulAnswers: [],       // [{question, answer, rating, timestamp}]
    lastUpdated: null,
    companyId: null
};

// Get company ID for storage (ensures company-wide learning)
function getCompanyId() {
    const businessData = window.businessData;
    if (businessData && businessData.settings && businessData.settings.businessName) {
        // Use business name as unique ID (hash it for consistency)
        return hashString(businessData.settings.businessName);
    }
    // Fallback to a generic ID if business not set up
    return 'default_company';
}

// Simple string hash function
function hashString(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
    }
    return 'company_' + Math.abs(hash);
}

// Load Alpha 5 Learning from localStorage
function loadAlpha5Learning() {
    try {
        const companyId = getCompanyId();
        const storageKey = `${LEARNING_STORAGE_KEY}_${companyId}`;
        const saved = localStorage.getItem(storageKey);
        
        if (saved) {
            const parsed = JSON.parse(saved);
            alpha5Learning = { ...alpha5Learning, ...parsed };
            console.log(`🧠 Alpha 5 Learning loaded for company ${companyId}:`, 
                Object.keys(alpha5Learning.customResponses).length, 'custom responses,',
                Object.keys(alpha5Learning.shortcuts).length, 'shortcuts');
        } else {
            // Initialize new learning for this company
            alpha5Learning.companyId = companyId;
            console.log(`🧠 New Alpha 5 Learning initialized for company ${companyId}`);
        }
    } catch (e) {
        console.error('Error loading Alpha 5 learning:', e);
    }
}

// Save Alpha 5 Learning to localStorage
function saveAlpha5Learning() {
    try {
        const companyId = getCompanyId();
        const storageKey = `${LEARNING_STORAGE_KEY}_${companyId}`;
        alpha5Learning.lastUpdated = new Date().toISOString();
        alpha5Learning.companyId = companyId;
        localStorage.setItem(storageKey, JSON.stringify(alpha5Learning));
    } catch (e) {
        console.error('Error saving Alpha 5 learning:', e);
    }
}

// Teach Alpha 5 a custom response
function teachAlpha5(question, answer) {
    const key = question.toLowerCase().trim();
    alpha5Learning.customResponses[key] = answer;
    saveAlpha5Learning();
    console.log(`✅ Alpha 5 learned: "${question}" → "${answer.substring(0, 50)}..."`);
    return true;
}

// Add a shortcut (e.g., "my branch" = "Branch Setapak")
function addShortcut(trigger, replacement) {
    const key = trigger.toLowerCase().trim();
    alpha5Learning.shortcuts[key] = replacement;
    saveAlpha5Learning();
    console.log(`✅ Shortcut added: "${trigger}" → "${replacement}"`);
    return true;
}

// Remove a learned response
function forgetResponse(question) {
    const key = question.toLowerCase().trim();
    if (alpha5Learning.customResponses[key]) {
        delete alpha5Learning.customResponses[key];
        saveAlpha5Learning();
        return true;
    }
    return false;
}

// Remove a shortcut
function removeShortcut(trigger) {
    const key = trigger.toLowerCase().trim();
    if (alpha5Learning.shortcuts[key]) {
        delete alpha5Learning.shortcuts[key];
        saveAlpha5Learning();
        return true;
    }
    return false;
}

// Check if Alpha 5 has a learned response
function getLearnedResponse(message) {
    const lowerMsg = message.toLowerCase().trim();
    
    // Check exact match first
    if (alpha5Learning.customResponses[lowerMsg]) {
        return alpha5Learning.customResponses[lowerMsg];
    }
    
    // Check partial matches (if question contains learned keyword)
    for (const [key, response] of Object.entries(alpha5Learning.customResponses)) {
        if (lowerMsg.includes(key) || key.includes(lowerMsg)) {
            return response;
        }
    }
    
    return null;
}

// Apply shortcuts to message
function applyShortcuts(message) {
    let processed = message;
    for (const [trigger, replacement] of Object.entries(alpha5Learning.shortcuts)) {
        const regex = new RegExp(`\\b${trigger}\\b`, 'gi');
        processed = processed.replace(regex, replacement);
    }
    return processed;
}

// Log unanswered question (for FAQ curation)
function logUnansweredQuestion(question) {
    const currentUser = getCurrentUserIdentifier();
    const entry = {
        question: question.trim(),
        timestamp: new Date().toISOString(),
        askedBy: currentUser
    };
    
    // Check if already logged recently (avoid duplicates)
    const recentDuplicate = alpha5Learning.unansweredQuestions.find(q => 
        q.question === question.trim() && 
        (Date.now() - new Date(q.timestamp).getTime()) < 3600000 // within 1 hour
    );
    
    if (!recentDuplicate) {
        alpha5Learning.unansweredQuestions.push(entry);
        
        // Keep only last 100 unanswered questions
        if (alpha5Learning.unansweredQuestions.length > 100) {
            alpha5Learning.unansweredQuestions = alpha5Learning.unansweredQuestions.slice(-100);
        }
        
        saveAlpha5Learning();
        console.log(`📝 Logged unanswered question: "${question}"`);
    }
}

// Track frequently asked questions
function trackFrequentQuestion(question) {
    const key = question.toLowerCase().trim();
    const existing = alpha5Learning.frequentQuestions.find(q => q.question === key);
    
    if (existing) {
        existing.count++;
        existing.lastAsked = new Date().toISOString();
    } else {
        alpha5Learning.frequentQuestions.push({
            question: key,
            count: 1,
            lastAsked: new Date().toISOString()
        });
    }
    
    // Sort by count (most asked first)
    alpha5Learning.frequentQuestions.sort((a, b) => b.count - a.count);
    
    // Keep only top 50
    if (alpha5Learning.frequentQuestions.length > 50) {
        alpha5Learning.frequentQuestions = alpha5Learning.frequentQuestions.slice(0, 50);
    }
    
    saveAlpha5Learning();
}

// Rate an answer as helpful (for learning what works)
function rateAnswerHelpful(question, answer, isHelpful) {
    if (isHelpful) {
        const entry = {
            question: question.trim(),
            answer: answer.substring(0, 500), // Store truncated answer
            rating: 'helpful',
            timestamp: new Date().toISOString()
        };
        
        alpha5Learning.helpfulAnswers.push(entry);
        
        // Keep only last 50
        if (alpha5Learning.helpfulAnswers.length > 50) {
            alpha5Learning.helpfulAnswers = alpha5Learning.helpfulAnswers.slice(-50);
        }
        
        saveAlpha5Learning();
        console.log(`👍 Answer rated helpful for: "${question}"`);
    }
}

// Get learning statistics
function getAlpha5LearningStats() {
    return {
        customResponses: Object.keys(alpha5Learning.customResponses).length,
        shortcuts: Object.keys(alpha5Learning.shortcuts).length,
        frequentQuestions: alpha5Learning.frequentQuestions.length,
        unansweredQuestions: alpha5Learning.unansweredQuestions.length,
        helpfulAnswers: alpha5Learning.helpfulAnswers.length,
        companyId: alpha5Learning.companyId,
        lastUpdated: alpha5Learning.lastUpdated
    };
}

// Show what Alpha 5 has learned
function showAlpha5Learning() {
    const stats = getAlpha5LearningStats();
    const companyName = window.businessData?.settings?.businessName || 'Your Company';
    
    let response = `🧠 **Alpha 5 Learning Status**\n\n`;
    response += `🏢 Company: ${companyName}\n`;
    response += `👥 Shared across all staff!\n\n`;
    response += `📚 Custom responses: ${stats.customResponses}\n`;
    response += `⚡ Shortcuts: ${stats.shortcuts}\n`;
    response += `❓ Frequent questions: ${stats.frequentQuestions}\n`;
    response += `🤔 Unanswered (need training): ${stats.unansweredQuestions}\n`;
    
    if (stats.customResponses > 0) {
        response += `\n**🎓 What I've learned:**\n`;
        let count = 0;
        for (const [question, answer] of Object.entries(alpha5Learning.customResponses)) {
            if (count < 5) { // Show first 5
                response += `• "${question}" → ${answer.substring(0, 50)}...\n`;
                count++;
            }
        }
        if (stats.customResponses > 5) {
            response += `_...and ${stats.customResponses - 5} more!_\n`;
        }
    }
    
    if (stats.shortcuts > 0) {
        response += `\n**⚡ Shortcuts:**\n`;
        let count = 0;
        for (const [trigger, replacement] of Object.entries(alpha5Learning.shortcuts)) {
            if (count < 5) {
                response += `• "${trigger}" = "${replacement}"\n`;
                count++;
            }
        }
        if (stats.shortcuts > 5) {
            response += `_...and ${stats.shortcuts - 5} more!_\n`;
        }
    }
    
    if (stats.unansweredQuestions > 0) {
        response += `\n**❓ Need Training (Recent):**\n`;
        const recent = alpha5Learning.unansweredQuestions.slice(-5).reverse();
        recent.forEach(q => {
            response += `• "${q.question}"\n`;
        });
    }
    
    response += `\n💡 **Train me:** "teach: question = answer"\n`;
    response += `⚡ **Add shortcut:** "shortcut: trigger = text"`;
    
    return response;
}

// Export/download learning data for curation (Option C)
function exportLearningData() {
    const stats = getAlpha5LearningStats();
    const companyName = window.businessData?.settings?.businessName || 'Company';
    
    const data = {
        company: companyName,
        exportedAt: new Date().toISOString(),
        stats: stats,
        unansweredQuestions: alpha5Learning.unansweredQuestions,
        frequentQuestions: alpha5Learning.frequentQuestions.slice(0, 20), // Top 20
        customResponses: alpha5Learning.customResponses,
        shortcuts: alpha5Learning.shortcuts
    };
    
    // Create download
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Alpha5_Learning_${companyName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    
    showNotification('Learning data exported!', `Downloaded for curation`, 'success');
    return data;
}

// Clear learning data (admin only)
function clearAlpha5Learning() {
    const companyId = getCompanyId();
    const storageKey = `${LEARNING_STORAGE_KEY}_${companyId}`;
    
    alpha5Learning = {
        customResponses: {},
        shortcuts: {},
        frequentQuestions: [],
        unansweredQuestions: [],
        helpfulAnswers: [],
        lastUpdated: null,
        companyId: companyId
    };
    
    localStorage.removeItem(storageKey);
    console.log(`🧠 Alpha 5 Learning cleared for company ${companyId}`);
    return true;
}

// Expose functions to window
window.teachAlpha5 = teachAlpha5;
window.addShortcut = addShortcut;
window.forgetResponse = forgetResponse;
window.removeShortcut = removeShortcut;
window.showAlpha5Learning = showAlpha5Learning;
window.getAlpha5LearningStats = getAlpha5LearningStats;
window.exportLearningData = exportLearningData;
window.clearAlpha5Learning = clearAlpha5Learning;

// ==================== INITIALIZATION ====================
function initializeChatbot() {
    loadChatHistory();
    loadPendingApprovals();
    loadAIMemory(); // Load AI self-learning memory
    loadAlpha5Learning(); // Load company-wide learning (Phase 5.4)
    updatePendingApprovalsUI();
    updateRecentChatPreview();
    console.log(`🤖 Chatbot initialized for ${getCurrentUserIdentifier()}`);
}

// Reload all user-scoped data (call this on login/logout)
function reloadChatbotForUser() {
    console.log(`🔄 Reloading chatbot data for ${getCurrentUserIdentifier()}...`);
    chatHistory = [];
    aiPendingApprovals = [];
    aiMemory = {
        corrections: {},
        entityTypes: {},
        preferences: {},
        customTerms: {},
        typoFixes: {},
        lastUpdated: null,
        userId: null
    };
    
    // Reload from user-scoped storage
    loadChatHistory();
    loadPendingApprovals();
    loadAIMemory();
    updatePendingApprovalsUI();
    updateRecentChatPreview();
    
    // Clear chat display
    const chatMessages = document.getElementById('chatMessages');
    if (chatMessages) {
        chatMessages.innerHTML = '';
        // Reload messages from history
        chatHistory.forEach(msg => {
            appendMessage(msg.text, msg.sender, false);
        });
    }
    
    console.log(`✅ Chatbot reloaded for ${getCurrentUserIdentifier()}`);
}

// Export reload function
window.reloadChatbotForUser = reloadChatbotForUser;

function loadChatHistory() {
    try {
        const storageKey = getUserStorageKey('chat_history');
        const saved = localStorage.getItem(storageKey);
        if (saved) {
            chatHistory = JSON.parse(saved);
            console.log(`💬 Loaded ${chatHistory.length} chat messages for ${getCurrentUserIdentifier()}`);
        } else {
            chatHistory = [];
        }
    } catch (error) {
        console.error('Error loading chat history:', error);
        chatHistory = [];
    }
}

function saveChatHistory() {
    try {
        const storageKey = getUserStorageKey('chat_history');
        localStorage.setItem(storageKey, JSON.stringify(chatHistory));
    } catch (error) {
        console.error('Error saving chat history:', error);
    }
}

// ==================== TOGGLE / SHOW ====================
function toggleChatbot() {
    const chatbot = document.getElementById('aiChatbotContainer');
    const toggleBtn = document.getElementById('chatbotToggleBtn');
    
    if (!chatbot) {
        console.warn('Chatbot container not found');
        return;
    }
    
    if (!isChatbotActive) {
        // Open chat - hide circle button
        chatbot.classList.add('active');
        chatbot.classList.remove('minimized');
        if (toggleBtn) toggleBtn.style.display = 'none';
        isChatbotActive = true;
        unreadMessages = 0;
        updateNotificationBadge();
        const input = document.getElementById('chatbotInput');
        if (input) input.focus();
    } else if (chatbot.classList.contains('minimized')) {
        // Restore from minimized
        chatbot.classList.remove('minimized');
        const input = document.getElementById('chatbotInput');
        if (input) input.focus();
    } else {
        // Minimize (but don't close)
        chatbot.classList.add('minimized');
    }
}

// Close chatbot completely and show circle button
function closeChatbot() {
    const chatbot = document.getElementById('aiChatbotContainer');
    const toggleBtn = document.getElementById('chatbotToggleBtn');
    
    if (chatbot) {
        chatbot.classList.remove('active');
        chatbot.classList.remove('minimized');
    }
    if (toggleBtn) {
        toggleBtn.style.display = 'flex';
    }
    isChatbotActive = false;
}

function showChatbot() {
    const chatbot = document.getElementById('aiChatbotContainer');
    if (!chatbot) {
        console.warn('Chatbot container not found');
        return;
    }
    chatbot.classList.add('active');
    chatbot.classList.remove('minimized');
    isChatbotActive = true;
    unreadMessages = 0;
    updateNotificationBadge();
    const input = document.getElementById('chatbotInput');
    if (input) input.focus();
}

// ==================== MESSAGE HANDLING ====================

// Simple markdown parser for chat messages
function parseMarkdown(text) {
    if (!text) return '';
    let html = escapeHTML(text);
    // Bold: **text** or __text__
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/__(.+?)__/g, '<strong>$1</strong>');
    // Italic: *text* or _text_
    html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');
    html = html.replace(/_([^_]+)_/g, '<em>$1</em>');
    // Line breaks
    html = html.replace(/\n/g, '<br>');
    return html;
}

function addChatMessage(message, isUser = true) {
    const messagesContainer = document.getElementById('chatbotMessages');
    const now = new Date();
    const timeString = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    // Ensure message is a string
    let messageText = message;
    if (typeof message === 'object') {
        messageText = message.content || message.message || JSON.stringify(message);
    }
    messageText = String(messageText || '');
    
    const messageElement = document.createElement('div');
    messageElement.className = `chatbot-message ${isUser ? 'user' : 'bot'}`;
    
    // Use markdown parser for bot messages, escape for user messages
    const displayText = isUser ? escapeHTML(messageText) : parseMarkdown(messageText);
    
    messageElement.innerHTML = `
        <div class="message-content">
            <div class="message-avatar">
                <i class="fas fa-${isUser ? 'user' : 'robot'}"></i>
            </div>
            <div class="message-text">${displayText}</div>
        </div>
        <div class="message-time">${timeString}</div>
    `;
    
    messagesContainer.appendChild(messageElement);
    
    chatHistory.push({
        message: messageText,
        isUser: isUser,
        timestamp: now.toISOString(),
        context: getBusinessContext()
    });
    
    if (chatHistory.length > 50) {
        chatHistory = chatHistory.slice(-50);
    }
    
    saveChatHistory();
    updateRecentChatPreview();
    
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
    
    if (isChatbotActive && !document.getElementById('aiChatbotContainer').classList.contains('minimized')) {
    } else if (!isUser) {
        unreadMessages++;
        updateNotificationBadge();
    }
}

function showTypingIndicator() {
    const messagesContainer = document.getElementById('chatbotMessages');
    const typingElement = document.createElement('div');
    typingElement.className = 'chatbot-message bot';
    typingElement.id = 'typingIndicator';
    typingElement.innerHTML = `
        <div class="message-content">
            <div class="message-avatar">
                <i class="fas fa-robot"></i>
            </div>
            <div class="message-text">
                <div class="typing-indicator">
                    <span></span>
                    <span></span>
                    <span></span>
                </div>
            </div>
        </div>
    `;
    
    messagesContainer.appendChild(typingElement);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function hideTypingIndicator() {
    const typingElement = document.getElementById('typingIndicator');
    if (typingElement) {
        typingElement.remove();
    }
}

// ==================== CONTEXT & PROCESSING ====================

// Conversation history for AI context
let conversationHistory = [];
const MAX_CONVERSATION_HISTORY = 10; // Keep last 10 messages for context
let isProcessingMessage = false; // Prevent double-sends
let processingTimeout = null; // Safety timeout

// Reset processing flag (safety function)
function resetProcessingFlag() {
    isProcessingMessage = false;
    if (processingTimeout) {
        clearTimeout(processingTimeout);
        processingTimeout = null;
    }
    hideTypingIndicator();
}

// Expose globally for debugging
window.resetProcessingFlag = resetProcessingFlag;

// Build comprehensive business context for AI
function getBusinessContext() {
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                        'July', 'August', 'September', 'October', 'November', 'December'];
    
    let monthIncome = 0;
    let monthExpenses = 0;
    const recentTransactions = [];
    
    // Calculate monthly figures and get recent transactions
    const sortedTransactions = [...(businessData.transactions || [])].sort((a, b) => 
        new Date(b.date) - new Date(a.date)
    );
    
    sortedTransactions.forEach(tx => {
        const txDate = parseDateSafe(tx.date);
        if (txDate.getMonth() === currentMonth && txDate.getFullYear() === currentYear) {
            if (tx.type === 'income') monthIncome += tx.amount;
            else monthExpenses += tx.amount;
        }
    });
    
    // Get recent transactions (last 10)
    sortedTransactions.slice(0, 10).forEach(tx => {
        recentTransactions.push({
            type: tx.type,
            amount: tx.amount,
            description: tx.description,
            category: tx.category,
            date: tx.date
        });
    });
    
    // Get customer stats
    const customers = Array.isArray(window.customers) ? window.customers : [];
    const crmCustomers = Array.isArray(window.crmCustomers) ? window.crmCustomers : [];
    const allCustomers = crmCustomers.length > 0 ? crmCustomers : customers;
    const topCustomers = [...allCustomers]
        .sort((a, b) => (b.totalSpent || 0) - (a.totalSpent || 0))
        .slice(0, 5)
        .map(c => ({ name: c.name, total: c.totalSpent || 0, phone: c.phone }));
    
    // Get product/inventory - FULL LIST for AI to reference
    const products = Array.isArray(window.products) ? window.products : [];
    const productList = products.slice(0, 50).map(p => ({
        id: p.id,
        name: p.name,
        sku: p.sku,
        price: p.price,
        cost: p.cost,
        stock: p.stock || 0,
        category: p.category,
        minStock: p.minStock || p.reorderLevel || 5
    }));
    const lowStockItems = products.filter(p => (p.stock || 0) <= (p.minStock || p.reorderLevel || 5));
    const lowStockList = lowStockItems.slice(0, 10).map(p => ({
        name: p.name,
        sku: p.sku,
        stock: p.stock || 0,
        minStock: p.minStock || 5
    }));
    
    // Get order stats
    const orders = Array.isArray(window.orders) ? window.orders : [];
    const pendingOrders = orders.filter(o => o.status === 'pending' || o.status === 'processing');
    const pendingOrderList = pendingOrders.slice(0, 10).map(o => ({
        orderNo: o.orderNo || o.id,
        customer: o.customer || o.customerName,
        total: o.total,
        status: o.status,
        date: o.date || o.createdAt
    }));
    
    // Get overdue invoices
    const invoices = Array.isArray(window.invoices) ? window.invoices : [];
    const today = new Date();
    const overdueInvoices = invoices.filter(inv => 
        inv.status !== 'paid' && new Date(inv.dueDate) < today
    );
    const overdueList = overdueInvoices.slice(0, 10).map(inv => ({
        invoiceNo: inv.invoiceNo || inv.id,
        customer: inv.customer,
        amount: inv.total,
        dueDate: inv.dueDate
    }));
    
    // Get quotations
    const quotations = Array.isArray(window.quotations) ? window.quotations : [];
    const activeQuotes = quotations.filter(q => q.status === 'pending' || q.status === 'sent');
    
    // Get branches/outlets
    const branches = Array.isArray(window.branches) ? window.branches : [];
    const branchList = branches.map(b => ({ id: b.id, name: b.name, code: b.code }));
    
    // Get suppliers
    const suppliers = Array.isArray(window.suppliers) ? window.suppliers : [];
    const supplierList = suppliers.slice(0, 20).map(s => ({
        name: s.name,
        phone: s.phone,
        email: s.email
    }));
    
    return {
        businessName: businessData.settings?.businessName || 'My Business',
        currency: businessData.settings?.currency || 'MYR',
        currentMonth: monthNames[currentMonth] + ' ' + currentYear,
        today: new Date().toISOString().split('T')[0],
        
        // Financial summary
        monthlyIncome: monthIncome,
        monthlyExpenses: monthExpenses,
        monthlyProfit: monthIncome - monthExpenses,
        totalTransactions: businessData.transactions?.length || 0,
        recentTransactions: recentTransactions,
        
        // Inventory - FULL DATA
        totalProducts: products.length,
        products: productList,
        lowStockCount: lowStockItems.length,
        lowStockItems: lowStockList,
        
        // Customers
        totalCustomers: allCustomers.length,
        topCustomers: topCustomers,
        customerList: allCustomers.slice(0, 20).map(c => ({ 
            id: c.id, name: c.name, phone: c.phone, email: c.email 
        })),
        
        // Orders & Invoices
        pendingOrderCount: pendingOrders.length,
        pendingOrders: pendingOrderList,
        overdueInvoiceCount: overdueInvoices.length,
        overdueInvoices: overdueList,
        
        // Quotations
        activeQuoteCount: activeQuotes.length,
        
        // Branches
        branches: branchList,
        
        // Suppliers
        suppliers: supplierList
    };
}

// Build simple context for fallback responses
function getSimpleContext() {
    const context = getBusinessContext();
    return {
        currentMonthIncome: context.monthlyIncome,
        currentMonthExpenses: context.monthlyExpenses,
        businessName: context.businessName,
        totalTransactions: context.totalTransactions,
        currency: context.currency
    };
}

// ==================== PREDICTIVE ANALYTICS ====================
// Smart predictions based on business data

function getPredictiveInsights() {
    const insights = {
        salesTrend: calculateSalesTrend(),
        stockAlerts: calculateStockAlerts(),
        cashFlowForecast: calculateCashFlowForecast(),
        topProducts: getTopProducts(),
        slowProducts: getSlowProducts(),
        customerInsights: getCustomerInsights(),
        businessHealth: calculateBusinessHealth(),
        recommendations: []
    };
    
    // Generate smart recommendations based on insights
    insights.recommendations = generateRecommendations(insights);
    
    return insights;
}

// Calculate sales trend (% change vs last period)
function calculateSalesTrend() {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;
    
    let currentMonthSales = 0;
    let lastMonthSales = 0;
    let currentMonthCount = 0;
    let lastMonthCount = 0;
    
    const transactions = businessData.transactions || [];
    
    transactions.forEach(tx => {
        if (tx.type !== 'income') return;
        const txDate = parseDateSafe(tx.date);
        const txMonth = txDate.getMonth();
        const txYear = txDate.getFullYear();
        
        if (txMonth === currentMonth && txYear === currentYear) {
            currentMonthSales += tx.amount;
            currentMonthCount++;
        } else if (txMonth === lastMonth && txYear === lastMonthYear) {
            lastMonthSales += tx.amount;
            lastMonthCount++;
        }
    });
    
    // Calculate percentage change
    let percentChange = 0;
    let trend = 'stable';
    
    if (lastMonthSales > 0) {
        percentChange = ((currentMonthSales - lastMonthSales) / lastMonthSales) * 100;
        if (percentChange > 5) trend = 'up';
        else if (percentChange < -5) trend = 'down';
    } else if (currentMonthSales > 0) {
        percentChange = 100;
        trend = 'up';
    }
    
    // Calculate daily average for projection
    const dayOfMonth = now.getDate();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const dailyAverage = currentMonthSales / dayOfMonth;
    const projectedMonthEnd = dailyAverage * daysInMonth;
    
    return {
        currentMonth: currentMonthSales,
        lastMonth: lastMonthSales,
        percentChange: Math.round(percentChange * 10) / 10,
        trend: trend,
        transactionCount: currentMonthCount,
        dailyAverage: Math.round(dailyAverage),
        projectedMonthEnd: Math.round(projectedMonthEnd)
    };
}

// Calculate stock alerts (days until stockout)
function calculateStockAlerts() {
    const products = Array.isArray(window.products) ? window.products : [];
    const salesData = businessData.transactions?.filter(tx => 
        tx.type === 'income' && tx.product
    ) || [];
    
    // Calculate sales velocity per product (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const productVelocity = {};
    
    salesData.forEach(tx => {
        const txDate = parseDateSafe(tx.date);
        if (txDate >= thirtyDaysAgo) {
            const productName = tx.product?.toLowerCase() || tx.description?.toLowerCase();
            if (productName) {
                productVelocity[productName] = (productVelocity[productName] || 0) + (tx.quantity || 1);
            }
        }
    });
    
    const alerts = [];
    
    products.forEach(product => {
        const stock = product.stock || 0;
        const minStock = product.minStock || product.reorderLevel || 5;
        const productKey = product.name?.toLowerCase();
        const monthlySales = productVelocity[productKey] || 0;
        const dailySales = monthlySales / 30;
        
        let daysUntilStockout = null;
        if (dailySales > 0) {
            daysUntilStockout = Math.round(stock / dailySales);
        }
        
        // Alert conditions
        const isLowStock = stock <= minStock;
        const isRunningOut = daysUntilStockout !== null && daysUntilStockout <= 7;
        const isOutOfStock = stock === 0;
        
        if (isOutOfStock || isLowStock || isRunningOut) {
            alerts.push({
                product: product.name,
                sku: product.sku,
                currentStock: stock,
                minStock: minStock,
                dailySales: Math.round(dailySales * 10) / 10,
                daysUntilStockout: daysUntilStockout,
                severity: isOutOfStock ? 'critical' : (isRunningOut ? 'warning' : 'low'),
                message: isOutOfStock 
                    ? `${product.name} is OUT OF STOCK!`
                    : isRunningOut 
                        ? `${product.name} will run out in ${daysUntilStockout} days`
                        : `${product.name} is below minimum stock (${stock}/${minStock})`
            });
        }
    });
    
    // Sort by severity
    const severityOrder = { critical: 0, warning: 1, low: 2 };
    alerts.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);
    
    return {
        totalAlerts: alerts.length,
        critical: alerts.filter(a => a.severity === 'critical').length,
        warning: alerts.filter(a => a.severity === 'warning').length,
        low: alerts.filter(a => a.severity === 'low').length,
        items: alerts.slice(0, 10) // Top 10 alerts
    };
}

// Calculate cash flow forecast
function calculateCashFlowForecast() {
    const now = new Date();
    const transactions = businessData.transactions || [];
    
    // Calculate last 30 days income and expenses
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    let incomeL30 = 0;
    let expensesL30 = 0;
    
    transactions.forEach(tx => {
        const txDate = parseDateSafe(tx.date);
        if (txDate >= thirtyDaysAgo) {
            if (tx.type === 'income') incomeL30 += tx.amount;
            else expensesL30 += tx.amount;
        }
    });
    
    const dailyIncome = incomeL30 / 30;
    const dailyExpenses = expensesL30 / 30;
    const dailyNet = dailyIncome - dailyExpenses;
    
    // Get current balance (rough estimate)
    const totalIncome = transactions.filter(tx => tx.type === 'income').reduce((sum, tx) => sum + tx.amount, 0);
    const totalExpenses = transactions.filter(tx => tx.type === 'expense').reduce((sum, tx) => sum + tx.amount, 0);
    const estimatedBalance = totalIncome - totalExpenses;
    
    // Forecast next 7, 14, 30 days
    const forecast7 = estimatedBalance + (dailyNet * 7);
    const forecast14 = estimatedBalance + (dailyNet * 14);
    const forecast30 = estimatedBalance + (dailyNet * 30);
    
    // Check for pending receivables
    const invoices = Array.isArray(window.invoices) ? window.invoices : [];
    const pendingReceivables = invoices
        .filter(inv => inv.status !== 'paid')
        .reduce((sum, inv) => sum + (inv.total || 0), 0);
    
    // Check for pending payables (bills)
    const bills = Array.isArray(window.bills) ? window.bills : [];
    const pendingPayables = bills
        .filter(bill => bill.status !== 'paid')
        .reduce((sum, bill) => sum + (bill.total || bill.amount || 0), 0);
    
    return {
        estimatedBalance: Math.round(estimatedBalance),
        dailyIncome: Math.round(dailyIncome),
        dailyExpenses: Math.round(dailyExpenses),
        dailyNet: Math.round(dailyNet),
        forecast7Days: Math.round(forecast7),
        forecast14Days: Math.round(forecast14),
        forecast30Days: Math.round(forecast30),
        pendingReceivables: Math.round(pendingReceivables),
        pendingPayables: Math.round(pendingPayables),
        netReceivables: Math.round(pendingReceivables - pendingPayables),
        healthStatus: dailyNet >= 0 ? 'healthy' : 'attention',
        warning: forecast7 < 0 ? 'Cash flow may go negative in 7 days!' : null
    };
}

// Get top performing products
function getTopProducts() {
    const products = Array.isArray(window.products) ? window.products : [];
    const salesData = businessData.transactions?.filter(tx => tx.type === 'income') || [];
    
    // Count sales by product
    const productSales = {};
    const productRevenue = {};
    
    salesData.forEach(tx => {
        const productName = tx.product || tx.description || 'Unknown';
        productSales[productName] = (productSales[productName] || 0) + (tx.quantity || 1);
        productRevenue[productName] = (productRevenue[productName] || 0) + tx.amount;
    });
    
    // Create ranked list
    const ranked = Object.entries(productRevenue)
        .map(([name, revenue]) => ({
            name,
            revenue,
            quantity: productSales[name] || 0
        }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5);
    
    return ranked;
}

// Get slow moving products
function getSlowProducts() {
    const products = Array.isArray(window.products) ? window.products : [];
    const salesData = businessData.transactions?.filter(tx => tx.type === 'income') || [];
    
    // Get products sold in last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const recentlySold = new Set();
    salesData.forEach(tx => {
        const txDate = parseDateSafe(tx.date);
        if (txDate >= thirtyDaysAgo) {
            const productName = (tx.product || tx.description || '').toLowerCase();
            if (productName) recentlySold.add(productName);
        }
    });
    
    // Find products with stock but no recent sales
    const slowProducts = products
        .filter(p => p.stock > 0 && !recentlySold.has(p.name?.toLowerCase()))
        .map(p => ({
            name: p.name,
            stock: p.stock,
            value: (p.cost || p.price || 0) * p.stock,
            daysSinceLastSale: 30 // At least 30 days
        }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 5);
    
    return slowProducts;
}

// Get customer insights
function getCustomerInsights() {
    const customers = Array.isArray(window.crmCustomers) && window.crmCustomers.length > 0 
        ? window.crmCustomers 
        : (Array.isArray(window.customers) ? window.customers : []);
    
    const transactions = businessData.transactions?.filter(tx => tx.type === 'income') || [];
    
    // Calculate customer stats
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
    
    const activeCustomers = new Set();
    const customerLastPurchase = {};
    
    transactions.forEach(tx => {
        const customerName = tx.customer || tx.customerName;
        if (!customerName) return;
        
        const txDate = parseDateSafe(tx.date);
        
        if (txDate >= thirtyDaysAgo) {
            activeCustomers.add(customerName.toLowerCase());
        }
        
        const key = customerName.toLowerCase();
        if (!customerLastPurchase[key] || txDate > customerLastPurchase[key]) {
            customerLastPurchase[key] = txDate;
        }
    });
    
    // Find at-risk customers (no purchase in 60 days)
    const atRiskCustomers = customers
        .filter(c => {
            const lastPurchase = customerLastPurchase[c.name?.toLowerCase()];
            return lastPurchase && lastPurchase < sixtyDaysAgo && lastPurchase >= new Date(sixtyDaysAgo.getTime() - 90*24*60*60*1000);
        })
        .slice(0, 5)
        .map(c => ({
            name: c.name,
            phone: c.phone,
            totalSpent: c.totalSpent || 0,
            daysSinceLastPurchase: Math.round((new Date() - customerLastPurchase[c.name?.toLowerCase()]) / (24*60*60*1000))
        }));
    
    // Top customers by spend
    const topCustomers = [...customers]
        .sort((a, b) => (b.totalSpent || 0) - (a.totalSpent || 0))
        .slice(0, 5)
        .map(c => ({
            name: c.name,
            totalSpent: c.totalSpent || 0
        }));
    
    return {
        totalCustomers: customers.length,
        activeCustomers: activeCustomers.size,
        atRiskCustomers: atRiskCustomers,
        topCustomers: topCustomers
    };
}

// Calculate overall business health score
function calculateBusinessHealth() {
    const salesTrend = calculateSalesTrend();
    const stockAlerts = calculateStockAlerts();
    const cashFlow = calculateCashFlowForecast();
    
    let score = 100;
    const issues = [];
    
    // Deduct for sales decline
    if (salesTrend.percentChange < -10) {
        score -= 20;
        issues.push(`Sales down ${Math.abs(salesTrend.percentChange)}%`);
    } else if (salesTrend.percentChange < 0) {
        score -= 10;
        issues.push(`Sales slightly down`);
    }
    
    // Deduct for stock issues
    if (stockAlerts.critical > 0) {
        score -= 15;
        issues.push(`${stockAlerts.critical} products out of stock`);
    }
    if (stockAlerts.warning > 0) {
        score -= 5;
        issues.push(`${stockAlerts.warning} products running low`);
    }
    
    // Deduct for cash flow issues
    if (cashFlow.dailyNet < 0) {
        score -= 15;
        issues.push(`Negative daily cash flow`);
    }
    if (cashFlow.forecast7Days < 0) {
        score -= 10;
        issues.push(`Cash may run out in 7 days`);
    }
    
    // Deduct for unpaid invoices
    if (cashFlow.pendingReceivables > cashFlow.estimatedBalance) {
        score -= 5;
        issues.push(`High pending receivables`);
    }
    
    // Determine status
    let status = 'excellent';
    if (score < 50) status = 'critical';
    else if (score < 70) status = 'needs attention';
    else if (score < 85) status = 'good';
    
    return {
        score: Math.max(0, score),
        status: status,
        issues: issues,
        summary: score >= 85 
            ? '🌟 Your business is doing great!' 
            : score >= 70 
                ? '👍 Business is good, minor improvements possible' 
                : score >= 50 
                    ? '⚠️ Some areas need attention' 
                    : '🚨 Critical issues require immediate action'
    };
}

// Generate smart recommendations
function generateRecommendations(insights) {
    const recommendations = [];
    
    // Stock recommendations
    if (insights.stockAlerts.critical > 0) {
        recommendations.push({
            priority: 'high',
            category: 'inventory',
            message: `Restock ${insights.stockAlerts.critical} out-of-stock items immediately`,
            action: 'Open Inventory'
        });
    }
    
    insights.stockAlerts.items?.filter(a => a.severity === 'warning').slice(0, 3).forEach(item => {
        recommendations.push({
            priority: 'medium',
            category: 'inventory',
            message: `Order ${item.product} - only ${item.daysUntilStockout} days of stock left`,
            action: 'Create PO'
        });
    });
    
    // Sales recommendations
    if (insights.salesTrend.trend === 'down') {
        recommendations.push({
            priority: 'medium',
            category: 'sales',
            message: `Sales are down ${Math.abs(insights.salesTrend.percentChange)}% - consider a promotion`,
            action: 'Review Products'
        });
    }
    
    // Cash flow recommendations
    if (insights.cashFlowForecast.dailyNet < 0) {
        recommendations.push({
            priority: 'high',
            category: 'finance',
            message: 'Daily expenses exceed income - review expenses',
            action: 'View Expenses'
        });
    }
    
    if (insights.cashFlowForecast.pendingReceivables > 1000) {
        recommendations.push({
            priority: 'medium',
            category: 'finance',
            message: `RM ${insights.cashFlowForecast.pendingReceivables} in unpaid invoices - follow up`,
            action: 'View Invoices'
        });
    }
    
    // Customer recommendations
    if (insights.customerInsights.atRiskCustomers?.length > 0) {
        recommendations.push({
            priority: 'low',
            category: 'customers',
            message: `${insights.customerInsights.atRiskCustomers.length} customers haven't purchased recently`,
            action: 'View Customers'
        });
    }
    
    // Slow products
    if (insights.slowProducts?.length > 0) {
        const totalValue = insights.slowProducts.reduce((sum, p) => sum + p.value, 0);
        recommendations.push({
            priority: 'low',
            category: 'inventory',
            message: `RM ${Math.round(totalValue)} in slow-moving stock - consider discounts`,
            action: 'View Products'
        });
    }
    
    return recommendations.slice(0, 5); // Top 5 recommendations
}

// Format insights for display
function formatPredictiveInsights() {
    const insights = getPredictiveInsights();
    
    let response = `📊 **Business Insights & Predictions**\n\n`;
    
    // Business Health
    response += `**Health Score: ${insights.businessHealth.score}/100** ${insights.businessHealth.summary}\n\n`;
    
    // Sales Trend
    const trendIcon = insights.salesTrend.trend === 'up' ? '📈' : insights.salesTrend.trend === 'down' ? '📉' : '➡️';
    response += `**Sales Trend** ${trendIcon}\n`;
    response += `• This month: RM ${insights.salesTrend.currentMonth.toLocaleString()}\n`;
    response += `• vs Last month: ${insights.salesTrend.percentChange > 0 ? '+' : ''}${insights.salesTrend.percentChange}%\n`;
    response += `• Projected month-end: RM ${insights.salesTrend.projectedMonthEnd.toLocaleString()}\n\n`;
    
    // Stock Alerts
    if (insights.stockAlerts.totalAlerts > 0) {
        response += `**Stock Alerts** ⚠️\n`;
        insights.stockAlerts.items.slice(0, 3).forEach(item => {
            const icon = item.severity === 'critical' ? '🔴' : item.severity === 'warning' ? '🟡' : '🟢';
            response += `${icon} ${item.message}\n`;
        });
        response += `\n`;
    }
    
    // Cash Flow
    response += `**Cash Flow Forecast** 💰\n`;
    response += `• Daily net: RM ${insights.cashFlowForecast.dailyNet > 0 ? '+' : ''}${insights.cashFlowForecast.dailyNet}\n`;
    response += `• 7-day forecast: RM ${insights.cashFlowForecast.forecast7Days.toLocaleString()}\n`;
    if (insights.cashFlowForecast.pendingReceivables > 0) {
        response += `• Pending invoices: RM ${insights.cashFlowForecast.pendingReceivables.toLocaleString()}\n`;
    }
    response += `\n`;
    
    // Top Recommendations
    if (insights.recommendations.length > 0) {
        response += `**Recommendations** 💡\n`;
        insights.recommendations.slice(0, 3).forEach((rec, i) => {
            const icon = rec.priority === 'high' ? '🔴' : rec.priority === 'medium' ? '🟡' : '🟢';
            response += `${i + 1}. ${icon} ${rec.message}\n`;
        });
    }
    
    return response;
}

// Export predictive functions
window.getPredictiveInsights = getPredictiveInsights;
window.formatPredictiveInsights = formatPredictiveInsights;
window.calculateSalesTrend = calculateSalesTrend;
window.calculateStockAlerts = calculateStockAlerts;
window.calculateCashFlowForecast = calculateCashFlowForecast;
window.calculateBusinessHealth = calculateBusinessHealth;

// Process user message - try AI first, fallback to rules
async function processUserMessage(message) {
    if (!message.trim()) return;
    
    // Prevent double processing - but with safety reset after 10 seconds
    if (isProcessingMessage) {
        console.log('Already processing a message, please wait...');
        // Safety: If stuck for more than 5 seconds, force reset
        setTimeout(() => {
            if (isProcessingMessage) {
                console.warn('Processing flag was stuck, forcing reset');
                resetProcessingFlag();
            }
        }, 5000);
        return;
    }
    
    isProcessingMessage = true;
    
    // Safety timeout - auto-reset after 15 seconds max
    processingTimeout = setTimeout(() => {
        console.warn('Processing timeout - auto resetting');
        resetProcessingFlag();
    }, 15000);
    
    addChatMessage(message, true);
    showTypingIndicator();
    
    // Add to conversation history
    conversationHistory.push({ role: 'user', content: message });
    if (conversationHistory.length > MAX_CONVERSATION_HISTORY) {
        conversationHistory = conversationHistory.slice(-MAX_CONVERSATION_HISTORY);
    }
    
    try {
        // Try AI response first
        console.log('Calling AI with message:', message);
        const aiResponse = await getAIResponse(message);
        console.log('AI response:', aiResponse);
        
        hideTypingIndicator();
        
        if (aiResponse.success) {
            // Check if response is an action (JSON)
            const actionResult = parseAndExecuteAction(aiResponse.message);
            
            if (actionResult.isAction) {
                // Show action confirmation message
                addChatMessage(actionResult.message, false);
                showSmartActions(actionResult.message);
                
                // Add to history
                conversationHistory.push({ role: 'assistant', content: actionResult.message });
            } else {
                // Normal chat response
                addChatMessage(aiResponse.message, false);
                showSmartActions(aiResponse.message);
                
                conversationHistory.push({ role: 'assistant', content: aiResponse.message });
            }
            
            if (conversationHistory.length > MAX_CONVERSATION_HISTORY) {
                conversationHistory = conversationHistory.slice(-MAX_CONVERSATION_HISTORY);
            }
        } else {
            // Fallback to rule-based response
            console.log('Using fallback response');
            const fallbackResponse = generateChatbotFallback(message);
            addChatMessage(fallbackResponse, false);
        }
    } catch (error) {
        console.error('AI response failed:', error);
        hideTypingIndicator();
        const fallbackResponse = generateChatbotFallback(message);
        addChatMessage(fallbackResponse, false);
    } finally {
        // Always unlock
        isProcessingMessage = false;
    }
}

// Action types that require approval vs instant execution
const ACTIONS_REQUIRE_APPROVAL = [
    'add_product', 'add_expense', 'add_income', 'add_customer', 'add_supplier',
    'create_invoice', 'create_quotation', 'create_order', 'add_bill',
    'create_project', 'add_employee', 'stock_in', 'stock_out', 'create_bom',
    'create_do', 'create_delivery_order', 'create_journal', 'journal_entry',
    'stock_transfer', 'transfer_stock', 'add_branch', 'add_outlet',
    'create_kpi', 'apply_leave', 'create_leave', 'create_sale'
];

// Actions that can execute immediately (non-destructive)
const ACTIONS_INSTANT = ['search', 'pos_sale', 'quick_sale'];

// Parse AI response and queue action for approval (or execute instant actions)
function parseAndExecuteAction(response) {
    // Try to extract JSON from response (might be mixed with text)
    const jsonMatch = response.match(/\{[^{}]*"action"[^{}]*\}/s);
    if (!jsonMatch) {
        return { isAction: false };
    }
    
    try {
        const action = JSON.parse(jsonMatch[0]);
        
        // Normalize field names (AI might use variations)
        if (action.productName) action.name = action.productName;
        if (action.customerName) action.customer = action.customerName;
        if (action.supplierName) action.supplier = action.supplierName;
        
        console.log('Parsed action:', action);
        
        // Build a human-readable description
        const description = buildActionDescription(action);
        
        // Check if this action requires approval
        if (ACTIONS_REQUIRE_APPROVAL.includes(action.action)) {
            // Queue for approval
            const pending = queueAIAction(action, description);
            
            return {
                isAction: true,
                message: `📋 **Pending Approval**\n\n${description}\n\n✅ Click the **🔔 Pending** button to review and approve this action.`
            };
        }
        
        // Instant actions (search, POS sale, etc.)
        if (action.action === 'search') {
            return executeSearch(action);
        } else if (action.action === 'pos_sale' || action.action === 'create_sale' || action.action === 'quick_sale') {
            return executePOSSale(action);
        } else if (action.action === 'update_status') {
            return executeUpdateStatus(action);
        } else if (action.action === 'delete') {
            // Delete requires confirmation
            const pending = queueAIAction(action, description);
            return {
                isAction: true,
                message: `⚠️ **Delete Pending Approval**\n\n${description}\n\n🔔 Click **Pending** to confirm deletion.`
            };
        }
        
        return { isAction: false };
    } catch (e) {
        console.log('Not a JSON action:', e.message);
        return { isAction: false };
    }
}

// Build human-readable description for an action
function buildActionDescription(action) {
    const a = action;
    switch(a.action) {
        case 'add_product':
            return `Add Product: "${a.name || 'New Product'}" - RM${a.price || 0} (${a.quantity || 0} units)`;
        case 'add_expense':
            return `Add Expense: RM${a.amount || 0} - ${a.description || a.category || 'Expense'}`;
        case 'add_income':
            return `Add Income: RM${a.amount || 0} - ${a.description || a.category || 'Income'}`;
        case 'add_customer':
            return `Add Customer: ${a.name || 'New Customer'} (${a.phone || a.email || 'No contact'})`;
        case 'add_supplier':
            return `Add Supplier: ${a.name || 'New Supplier'}`;
        case 'create_invoice':
            return `Create Invoice: ${a.customer || 'Customer'} - RM${a.total || a.amount || 0}`;
        case 'create_quotation':
            return `Create Quotation: ${a.customer || a.title || 'New Quote'} - RM${a.total || a.amount || 0}`;
        case 'create_order':
            return `Create Order: ${a.customer || 'Customer'} - RM${a.total || 0}`;
        case 'add_bill':
            return `Add Bill: ${a.name || a.vendor || 'Bill'} - RM${a.amount || 0}`;
        case 'create_project':
            return `Create Project: ${a.name || 'New Project'} - Budget RM${a.budget || 0}`;
        case 'add_employee':
            return `Add Employee: ${a.name || 'New Employee'} - RM${a.salary || 0}/month`;
        case 'stock_in':
            return `Stock In: ${a.quantity || 0} x ${a.product || a.name || 'Product'}`;
        case 'stock_out':
            return `Stock Out: ${a.quantity || 0} x ${a.product || a.name || 'Product'}`;
        case 'create_bom':
            return `Create BOM: ${a.name || 'New BOM'}`;
        case 'create_do':
        case 'create_delivery_order':
            return `Create DO: ${a.type === 'incoming' ? 'From' : 'To'} ${a.supplier || a.customer || 'N/A'}`;
        case 'create_kpi':
            return `Create KPI: ${a.name || 'KPI'} - Target: ${a.target || 0} ${a.unit || ''}`;
        case 'create_journal':
        case 'journal_entry':
            return `Journal: Dr ${a.debit || ''} / Cr ${a.credit || ''} - RM${a.amount || 0}`;
        case 'apply_leave':
        case 'create_leave':
            return `Apply Leave: ${a.employee || a.name || 'Employee'} (${a.type || 'annual'})`;
        case 'pos_sale':
        case 'quick_sale':
        case 'create_sale':
            return `POS Sale: RM${a.amount || a.total || 0} (${a.payment || 'cash'})`;
        case 'stock_transfer':
        case 'transfer_stock':
            return `Transfer: ${a.quantity || 0} x ${a.product || ''} → ${a.to || ''}`;
        case 'delete':
            return `Delete: ${a.type || 'Item'} - ${a.id || a.name || 'Unknown'}`;
        case 'add_branch':
        case 'add_outlet':
            return `Add Branch: ${a.branch?.name || a.name || 'New Branch'}`;
        default:
            return `${a.action}: ${JSON.stringify(a).slice(0, 100)}`;
    }
}

// ==================== ACTUAL EXECUTION FUNCTIONS (doXxx) ====================
// These are called when user approves an action

function doAddExpense(action) {
    const transaction = {
        id: 'TX' + Date.now(),
        type: 'expense',
        amount: parseFloat(action.amount) || 0,
        description: action.description || 'Expense',
        category: action.category || 'Other',
        date: action.date || new Date().toISOString().split('T')[0],
        createdAt: new Date().toISOString(),
        createdBy: 'AI Assistant'
    };
    
    if (window.businessData && window.businessData.transactions) {
        window.businessData.transactions.push(transaction);
        if (typeof saveData === 'function') saveData();
        if (typeof updateDashboard === 'function') updateDashboard();
    }
    return transaction;
}

function doAddIncome(action) {
    const transaction = {
        id: 'TX' + Date.now(),
        type: 'income',
        amount: parseFloat(action.amount) || 0,
        description: action.description || 'Income',
        category: action.category || 'Sales',
        date: action.date || new Date().toISOString().split('T')[0],
        createdAt: new Date().toISOString(),
        createdBy: 'AI Assistant'
    };
    
    if (window.businessData && window.businessData.transactions) {
        window.businessData.transactions.push(transaction);
        if (typeof saveData === 'function') saveData();
        if (typeof updateDashboard === 'function') updateDashboard();
    }
    return transaction;
}

function doAddProduct(action) {
    const product = {
        id: 'PROD' + Date.now(),
        name: action.name || 'New Product',
        sku: action.sku || 'SKU' + Date.now().toString().slice(-6),
        price: parseFloat(action.price) || 0,
        cost: parseFloat(action.cost) || 0,
        quantity: parseInt(action.quantity) || 0,
        category: action.category || 'General',
        minStock: parseInt(action.minStock) || 5,
        status: 'active',
        createdAt: new Date().toISOString(),
        createdBy: 'AI Assistant'
    };
    
    // Add to inventory products array
    if (!window.products) window.products = [];
    window.products.push(product);
    
    // Save using inventory system - use window.saveProducts for global access
    if (typeof window.saveProducts === 'function') {
        window.saveProducts();
        console.log('✅ Product saved via inventory system');
    } else if (typeof saveProducts === 'function') {
        saveProducts();
        console.log('✅ Product saved via local saveProducts');
    } else {
        localStorage.setItem('ezcubic_products', JSON.stringify(window.products));
        console.log('✅ Product saved directly to localStorage');
    }
    
    // Refresh UI
    if (typeof window.renderProducts === 'function') {
        window.renderProducts();
    } else if (typeof renderProducts === 'function') {
        renderProducts();
    }
    
    return product;
}

function doAddCustomer(action) {
    const customer = {
        id: 'CUS' + Date.now(),
        name: action.name || 'New Customer',
        email: action.email || '',
        phone: action.phone || '',
        address: action.address || '',
        company: action.company || '',
        type: action.type || 'individual',
        status: 'active',
        createdAt: new Date().toISOString(),
        createdBy: 'AI Assistant'
    };
    
    // Add to CRM customers
    if (typeof window.crmCustomers !== 'undefined') {
        window.crmCustomers.push(customer);
        if (typeof saveCRMCustomers === 'function') saveCRMCustomers();
        if (typeof renderCRMCustomers === 'function') renderCRMCustomers();
    }
    
    return customer;
}

function doAddSupplier(action) {
    const supplier = {
        id: 'SUP' + Date.now(),
        name: action.name || 'New Supplier',
        email: action.email || '',
        phone: action.phone || '',
        address: action.address || '',
        contactPerson: action.contactPerson || '',
        status: 'active',
        createdAt: new Date().toISOString(),
        createdBy: 'AI Assistant'
    };
    
    if (!window.suppliers) window.suppliers = [];
    window.suppliers.push(supplier);
    
    if (typeof saveSuppliers === 'function') saveSuppliers();
    
    return supplier;
}

// Add a new branch/outlet
function doAddBranch(action) {
    // Support both direct branch object and individual fields
    const branchData = action.branch || action;
    
    const branch = {
        id: branchData.id || 'BRANCH_' + Date.now(),
        code: branchData.code || (branchData.name || 'BR').substring(0, 3).toUpperCase(),
        name: branchData.name || 'New Branch',
        type: branchData.type || 'branch',
        address: branchData.address || '',
        city: branchData.city || '',
        state: branchData.state || '',
        postcode: branchData.postcode || '',
        phone: branchData.phone || '',
        email: branchData.email || '',
        manager: branchData.manager || '',
        status: 'active',
        isDefault: false,
        createdAt: new Date().toISOString(),
        stock: {}
    };
    
    // Add to branches array
    if (!window.branches) window.branches = [];
    window.branches.push(branch);
    
    // Save to localStorage
    localStorage.setItem('ezcubic_branches', JSON.stringify(window.branches));
    
    // Save to tenant if logged in
    const user = window.currentUser;
    if (user && user.tenantId) {
        const tenantKey = 'ezcubic_tenant_' + user.tenantId;
        let tenantData = JSON.parse(localStorage.getItem(tenantKey) || '{}');
        tenantData.branches = window.branches;
        tenantData.updatedAt = new Date().toISOString();
        localStorage.setItem(tenantKey, JSON.stringify(tenantData));
    }
    
    // Refresh UI
    if (typeof renderBranches === 'function') renderBranches();
    if (typeof syncBranchesToOutlets === 'function') syncBranchesToOutlets();
    
    console.log('✅ Branch added via AI:', branch.name);
    return branch;
}

function doCreateInvoice(action) {
    const invoice = {
        id: 'INV' + Date.now(),
        invoiceNo: action.invoiceNo || 'INV-' + Date.now().toString().slice(-6),
        customer: action.customer || '',
        items: action.items || [],
        subtotal: parseFloat(action.subtotal) || parseFloat(action.total) || 0,
        tax: parseFloat(action.tax) || 0,
        total: parseFloat(action.total) || 0,
        status: 'draft',
        dueDate: action.dueDate || '',
        createdAt: new Date().toISOString(),
        createdBy: 'AI Assistant'
    };
    
    if (!window.invoices) window.invoices = [];
    window.invoices.push(invoice);
    
    if (typeof saveInvoices === 'function') saveInvoices();
    
    return invoice;
}

function doCreateQuotation(action) {
    // Generate proper quotation number
    let quotationNo = 'QT' + Date.now().toString().slice(-6);
    if (typeof generateQuotationNo === 'function') {
        try { quotationNo = generateQuotationNo(); } catch(e) {}
    }
    
    const amount = parseFloat(action.total) || parseFloat(action.amount) || 0;
    const customerName = action.customer || action.customerName || '';
    
    // Build items array with proper structure
    let items = [];
    if (Array.isArray(action.items) && action.items.length > 0) {
        items = action.items.map(item => ({
            description: item.description || item.name || 'Item',
            quantity: parseFloat(item.quantity) || 1,
            unitPrice: parseFloat(item.unitPrice) || parseFloat(item.price) || 0,
            lineTotal: (parseFloat(item.quantity) || 1) * (parseFloat(item.unitPrice) || parseFloat(item.price) || 0)
        }));
    } else if (amount > 0) {
        // Create single item from total amount
        items = [{
            description: action.title || action.subject || `Quotation for ${customerName}`,
            quantity: 1,
            unitPrice: amount,
            lineTotal: amount
        }];
    }
    
    const subtotal = items.reduce((sum, item) => sum + (item.lineTotal || 0), 0);
    
    // Set valid date 30 days from now
    const validDate = new Date();
    validDate.setDate(validDate.getDate() + 30);
    
    const quotation = {
        id: 'QT' + Date.now(),
        quotationNo: quotationNo,
        customerId: action.customerId || '',
        customerName: customerName,
        customerCompany: action.company || '',
        salesperson: action.salesperson || '',
        date: new Date().toISOString().split('T')[0],
        validUntil: action.validUntil || validDate.toISOString().split('T')[0],
        subject: action.title || action.subject || '',
        items: items,
        subtotal: subtotal,
        discount: 0,
        discountAmount: 0,
        taxRate: 0,
        taxAmount: 0,
        totalAmount: subtotal,
        notes: action.notes || '',
        terms: '',
        status: 'draft',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: 'AI Assistant'
    };
    
    if (!window.quotations) window.quotations = [];
    window.quotations.push(quotation);
    
    if (typeof saveQuotations === 'function') saveQuotations();
    if (typeof renderQuotations === 'function') renderQuotations();
    if (typeof updateQuotationStats === 'function') updateQuotationStats();
    
    return quotation;
}

function doCreateOrder(action) {
    const order = {
        id: 'ORD' + Date.now(),
        orderNo: action.orderNo || 'ORD-' + Date.now().toString().slice(-6),
        customer: action.customer || '',
        items: action.items || [],
        total: parseFloat(action.total) || 0,
        status: 'pending',
        createdAt: new Date().toISOString(),
        createdBy: 'AI Assistant'
    };
    
    if (!window.orders) window.orders = [];
    window.orders.push(order);
    
    if (typeof saveOrders === 'function') saveOrders();
    
    return order;
}

function doAddBill(action) {
    const bill = {
        id: 'BILL' + Date.now(),
        name: action.name || action.vendor || 'New Bill',
        vendor: action.vendor || '',
        amount: parseFloat(action.amount) || 0,
        dueDate: action.dueDate || '',
        category: action.category || 'Other',
        recurring: action.recurring || false,
        isPaid: false,
        createdAt: new Date().toISOString(),
        createdBy: 'AI Assistant'
    };
    
    if (window.businessData && window.businessData.bills) {
        window.businessData.bills.push(bill);
        if (typeof saveData === 'function') saveData();
        if (typeof loadBills === 'function') loadBills();
    }
    
    return bill;
}

function doCreateProject(action) {
    const project = {
        id: 'PROJ' + Date.now(),
        name: action.name || 'New Project',
        client: action.client || action.customer || '',
        budget: parseFloat(action.budget) || 0,
        startDate: action.startDate || new Date().toISOString().split('T')[0],
        endDate: action.endDate || '',
        status: 'planning',
        milestones: action.milestones || [],
        createdAt: new Date().toISOString(),
        createdBy: 'AI Assistant'
    };
    
    if (!window.projects) window.projects = [];
    window.projects.push(project);
    
    if (typeof saveProjects === 'function') saveProjects();
    if (typeof renderProjects === 'function') renderProjects();
    
    return project;
}

function doAddEmployee(action) {
    const employee = {
        id: 'EMP' + Date.now(),
        name: action.name || 'New Employee',
        email: action.email || '',
        phone: action.phone || '',
        position: action.position || '',
        department: action.department || '',
        salary: parseFloat(action.salary) || 0,
        startDate: action.startDate || new Date().toISOString().split('T')[0],
        status: 'active',
        createdAt: new Date().toISOString(),
        createdBy: 'AI Assistant'
    };
    
    if (!window.employees) window.employees = [];
    window.employees.push(employee);
    
    if (typeof saveEmployees === 'function') saveEmployees();
    
    return employee;
}

// Create BOM (Bill of Materials)
function doCreateBOM(action) {
    const bom = {
        id: 'BOM' + Date.now(),
        name: action.name || 'New BOM',
        description: action.description || '',
        outputQuantity: parseInt(action.outputQuantity) || 1,
        laborCost: parseFloat(action.laborCost) || 0,
        materials: action.materials || [],
        status: 'active',
        createdAt: new Date().toISOString(),
        createdBy: 'AI Assistant'
    };
    
    if (!window.boms) window.boms = [];
    window.boms.push(bom);
    
    localStorage.setItem('ezcubic_boms', JSON.stringify(window.boms));
    if (typeof renderBOMs === 'function') renderBOMs();
    
    return bom;
}

// Create Delivery Order
function doCreateDO(action) {
    const doItem = {
        id: 'DO' + Date.now(),
        doNumber: 'DO-' + Date.now().toString().slice(-6),
        type: action.type || (action.supplier ? 'incoming' : 'outgoing'),
        customer: action.customer || '',
        supplier: action.supplier || '',
        item: action.item || action.product || '',
        quantity: parseInt(action.quantity) || 1,
        status: 'pending',
        notes: action.notes || '',
        createdAt: new Date().toISOString(),
        createdBy: 'AI Assistant'
    };
    
    if (!window.deliveryOrders) window.deliveryOrders = [];
    window.deliveryOrders.push(doItem);
    
    localStorage.setItem('ezcubic_delivery_orders', JSON.stringify(window.deliveryOrders));
    if (typeof renderDeliveryOrders === 'function') renderDeliveryOrders();
    
    return doItem;
}

// Create KPI
function doCreateKPI(action) {
    const kpi = {
        id: 'KPI' + Date.now(),
        name: action.name || 'New KPI',
        target: parseFloat(action.target) || 0,
        actual: 0,
        unit: action.unit || 'RM',
        frequency: action.frequency || 'monthly',
        category: action.category || 'General',
        status: 'active',
        createdAt: new Date().toISOString(),
        createdBy: 'AI Assistant'
    };
    
    if (!window.kpis) window.kpis = [];
    window.kpis.push(kpi);
    
    localStorage.setItem('ezcubic_kpis', JSON.stringify(window.kpis));
    if (typeof renderKPIs === 'function') renderKPIs();
    
    return kpi;
}

// Create Journal Entry
function doCreateJournal(action) {
    const journal = {
        id: 'JE' + Date.now(),
        journalNo: 'JE-' + Date.now().toString().slice(-6),
        date: action.date || new Date().toISOString().split('T')[0],
        debit: action.debit || '',
        credit: action.credit || '',
        amount: parseFloat(action.amount) || 0,
        description: action.description || '',
        reference: action.reference || '',
        status: 'posted',
        createdAt: new Date().toISOString(),
        createdBy: 'AI Assistant'
    };
    
    if (!window.journalEntries) window.journalEntries = [];
    window.journalEntries.push(journal);
    
    localStorage.setItem('ezcubic_journal_entries', JSON.stringify(window.journalEntries));
    if (typeof renderJournalEntries === 'function') renderJournalEntries();
    
    return journal;
}

// Apply Leave
function doApplyLeave(action) {
    const leave = {
        id: 'LV' + Date.now(),
        employee: action.employee || action.name || '',
        type: action.type || 'annual',
        startDate: action.startDate || action.from || new Date().toISOString().split('T')[0],
        endDate: action.endDate || action.to || new Date().toISOString().split('T')[0],
        reason: action.reason || '',
        status: 'pending',
        createdAt: new Date().toISOString(),
        createdBy: 'AI Assistant'
    };
    
    if (!window.leaveRequests) window.leaveRequests = [];
    window.leaveRequests.push(leave);
    
    localStorage.setItem('ezcubic_leave_requests', JSON.stringify(window.leaveRequests));
    if (typeof renderLeaveRequests === 'function') renderLeaveRequests();
    
    return leave;
}

// Quick POS Sale (executes immediately)
function doPOSSale(action) {
    const sale = {
        id: 'SALE' + Date.now(),
        saleNo: 'S-' + Date.now().toString().slice(-6),
        items: action.items || [],
        subtotal: parseFloat(action.amount) || parseFloat(action.total) || 0,
        tax: 0,
        total: parseFloat(action.amount) || parseFloat(action.total) || 0,
        payment: action.payment || 'cash',
        customer: action.customer || 'Walk-in',
        status: 'completed',
        date: new Date().toISOString(),
        createdBy: 'AI Assistant'
    };
    
    if (!window.sales) window.sales = [];
    window.sales.push(sale);
    
    localStorage.setItem('ezcubic_sales', JSON.stringify(window.sales));
    if (typeof renderSales === 'function') renderSales();
    if (typeof updateDashboard === 'function') updateDashboard();
    
    return sale;
}

function doStockIn(action) {
    const productName = action.product || action.name;
    const quantity = parseInt(action.quantity) || 0;
    const reason = action.reason || 'stock-in';
    const notes = action.notes || 'Added via AI Assistant';
    
    if (!productName) {
        throw new Error('Product name is required');
    }
    if (quantity <= 0) {
        throw new Error('Quantity must be greater than 0');
    }
    
    // Find product
    if (!window.products || window.products.length === 0) {
        throw new Error('No products in inventory. Add products first.');
    }
    
    const product = window.products.find(p => 
        p.name?.toLowerCase().includes(productName.toLowerCase()) || 
        p.sku?.toLowerCase() === productName.toLowerCase()
    );
    
    if (!product) {
        // Suggest similar products
        const similar = window.products.filter(p => 
            p.name?.toLowerCase().includes(productName.substring(0, 3).toLowerCase())
        ).slice(0, 3).map(p => p.name);
        
        throw new Error(`Product "${productName}" not found.${similar.length > 0 ? ` Did you mean: ${similar.join(', ')}?` : ''}`);
    }
    
    // Get cost price for accounting
    const costPrice = parseFloat(action.cost) || parseFloat(product.cost) || 0;
    const totalCost = costPrice * quantity;
    
    // Use centralized stock manager if available
    if (typeof updateProductStock === 'function') {
        const result = updateProductStock(product.id, null, quantity, reason, {
            notes: notes,
            reference: `AI-IN-${Date.now()}`
        });
        
        if (!result.success) {
            throw new Error(result.error || 'Stock update failed');
        }
    } else {
        // Fallback: direct update
        const index = window.products.findIndex(p => p.id === product.id);
        if (index !== -1) {
            window.products[index].stock = (window.products[index].stock || 0) + quantity;
            window.products[index].updatedAt = new Date().toISOString();
        }
        
        // Record stock movement
        if (typeof recordStockMovement === 'function') {
            recordStockMovement({
                productId: product.id,
                productName: product.name,
                type: 'in',
                quantity: quantity,
                reason: reason,
                notes: notes,
                reference: `AI-IN-${Date.now()}`
            });
        }
        
        if (typeof saveProducts === 'function') saveProducts();
    }
    
    // ===== RECORD PURCHASE EXPENSE TO FINANCIALS =====
    // When stock in, record the cost as inventory purchase expense
    if (totalCost > 0) {
        const purchaseTransaction = {
            id: 'TX' + Date.now(),
            type: 'expense',
            amount: totalCost,
            description: `Stock Purchase: ${product.name} (${quantity} ${product.unit || 'units'})`,
            category: 'Inventory Purchase',
            date: new Date().toISOString().split('T')[0],
            reference: `STK-IN-${Date.now().toString().slice(-6)}`,
            createdAt: new Date().toISOString(),
            createdBy: 'AI Assistant'
        };
        
        // Add to businessData transactions
        if (window.businessData && window.businessData.transactions) {
            window.businessData.transactions.push(purchaseTransaction);
        } else if (window.transactions) {
            window.transactions.push(purchaseTransaction);
        }
        
        // Save
        if (typeof saveData === 'function') saveData();
        if (typeof updateDashboard === 'function') updateDashboard();
        
        console.log('📊 Stock purchase recorded:', purchaseTransaction);
    }
    
    // Refresh UI
    if (typeof renderProducts === 'function') renderProducts();
    if (typeof renderStockMovements === 'function') renderStockMovements();
    if (typeof updateStockStats === 'function') updateStockStats();
    
    return { 
        product: product.name, 
        quantityAdded: quantity, 
        newStock: product.stock,
        costRecorded: totalCost > 0 ? totalCost : null
    };
}

function doStockOut(action) {
    const productName = action.product || action.name;
    const quantity = parseInt(action.quantity) || 0;
    const reason = action.reason || 'stock-out';
    const notes = action.notes || 'Removed via AI Assistant';
    
    if (!productName) {
        throw new Error('Product name is required');
    }
    if (quantity <= 0) {
        throw new Error('Quantity must be greater than 0');
    }
    
    // Find product
    if (!window.products || window.products.length === 0) {
        throw new Error('No products in inventory. Add products first.');
    }
    
    const product = window.products.find(p => 
        p.name?.toLowerCase().includes(productName.toLowerCase()) || 
        p.sku?.toLowerCase() === productName.toLowerCase()
    );
    
    if (!product) {
        // Suggest similar products
        const similar = window.products.filter(p => 
            p.name?.toLowerCase().includes(productName.substring(0, 3).toLowerCase())
        ).slice(0, 3).map(p => p.name);
        
        throw new Error(`Product "${productName}" not found.${similar.length > 0 ? ` Did you mean: ${similar.join(', ')}?` : ''}`);
    }
    
    // Check available stock (use centralized function if available)
    const availableStock = typeof getAvailableStock === 'function' 
        ? getAvailableStock(product.id) 
        : (product.stock || 0);
    
    if (quantity > availableStock) {
        throw new Error(`Insufficient stock! Available: ${availableStock} ${product.unit || 'units'}`);
    }
    
    // Use centralized stock manager if available
    if (typeof updateProductStock === 'function') {
        const result = updateProductStock(product.id, null, -quantity, reason, {
            notes: notes,
            reference: `AI-OUT-${Date.now()}`
        });
        
        if (!result.success) {
            throw new Error(result.error || 'Stock update failed');
        }
    } else {
        // Fallback: direct update
        const index = window.products.findIndex(p => p.id === product.id);
        if (index !== -1) {
            window.products[index].stock = (window.products[index].stock || 0) - quantity;
            window.products[index].updatedAt = new Date().toISOString();
        }
        
        // Record stock movement
        if (typeof recordStockMovement === 'function') {
            recordStockMovement({
                productId: product.id,
                productName: product.name,
                type: 'out',
                quantity: -quantity,
                reason: reason,
                notes: notes,
                reference: `AI-OUT-${Date.now()}`
            });
        }
        
        if (typeof saveProducts === 'function') saveProducts();
    }
    
    // Refresh UI
    if (typeof renderProducts === 'function') renderProducts();
    if (typeof renderStockMovements === 'function') renderStockMovements();
    if (typeof updateStockStats === 'function') updateStockStats();
    
    return { 
        product: product.name, 
        quantityRemoved: quantity, 
        remainingStock: product.stock 
    };
}

// Legacy execute functions (keep for backwards compatibility)
function executeAddExpense(action) {
    try {
        const transaction = {
            id: 'TX' + Date.now(),
            type: 'expense',
            amount: parseFloat(action.amount) || 0,
            description: action.description || 'Expense',
            category: action.category || 'Other',
            date: new Date().toISOString().split('T')[0],
            createdAt: new Date().toISOString(),
            createdBy: 'AI Assistant'
        };
        
        // Add to businessData
        if (window.businessData && window.businessData.transactions) {
            window.businessData.transactions.push(transaction);
            
            // Save and update
            if (typeof saveData === 'function') saveData();
            if (typeof updateDashboard === 'function') updateDashboard();
            if (typeof showNotification === 'function') {
                showNotification(`Expense RM${action.amount} added!`, 'success');
            }
        }
        
        return {
            isAction: true,
            message: `Done! ✅ Added expense: RM${action.amount} for "${action.description}" (${action.category})`
        };
    } catch (e) {
        console.error('Error adding expense:', e);
        return { isAction: true, message: `Oops! Couldn't add expense: ${e.message}` };
    }
}

// Execute: Add Income
function executeAddIncome(action) {
    try {
        const transaction = {
            id: 'TX' + Date.now(),
            type: 'income',
            amount: parseFloat(action.amount) || 0,
            description: action.description || 'Income',
            category: action.category || 'Sales',
            date: new Date().toISOString().split('T')[0],
            createdAt: new Date().toISOString(),
            createdBy: 'AI Assistant'
        };
        
        // Add to businessData
        if (window.businessData && window.businessData.transactions) {
            window.businessData.transactions.push(transaction);
            
            // Save and update
            if (typeof saveData === 'function') saveData();
            if (typeof updateDashboard === 'function') updateDashboard();
            if (typeof showNotification === 'function') {
                showNotification(`Income RM${action.amount} added!`, 'success');
            }
        }
        
        return {
            isAction: true,
            message: `Done! ✅ Added income: RM${action.amount} for "${action.description}" (${action.category})`
        };
    } catch (e) {
        console.error('Error adding income:', e);
        return { isAction: true, message: `Oops! Couldn't add income: ${e.message}` };
    }
}

// Execute: Add Product
function executeAddProduct(action) {
    try {
        const product = {
            id: 'PROD' + Date.now(),
            name: action.name || 'New Product',
            sku: action.sku || 'SKU' + Date.now().toString().slice(-6),
            price: parseFloat(action.price) || 0,
            cost: parseFloat(action.cost) || 0,
            quantity: parseInt(action.quantity) || 0,
            category: action.category || 'General',
            status: 'active',
            createdAt: new Date().toISOString(),
            createdBy: 'AI Assistant'
        };
        
        // Add to products array (same pattern as inventory.js)
        if (!window.products) window.products = [];
        window.products.push(product);
        
        // Use proper save function if available, else direct localStorage
        if (typeof saveProducts === 'function') {
            saveProducts();
        } else {
            localStorage.setItem('ezcubic_products', JSON.stringify(window.products));
            // Also save to tenant
            const user = window.currentUser;
            if (user && user.tenantId) {
                const tenantKey = 'ezcubic_tenant_' + user.tenantId;
                let tenantData = JSON.parse(localStorage.getItem(tenantKey) || '{}');
                tenantData.products = window.products;
                tenantData.updatedAt = new Date().toISOString();
                localStorage.setItem(tenantKey, JSON.stringify(tenantData));
            }
        }
        
        // Refresh the UI
        if (typeof renderProducts === 'function') renderProducts();
        if (typeof showNotification === 'function') {
            showNotification(`Product "${action.name}" added!`, 'success');
        }
        
        return {
            isAction: true,
            message: `Done! ✅ Added product: "${action.name}" - RM${action.price}, ${action.quantity} in stock 📦`
        };
    } catch (e) {
        console.error('Error adding product:', e);
        return { isAction: true, message: `Oops! Couldn't add product: ${e.message}` };
    }
}

// Execute: Add Customer
function executeAddCustomer(action) {
    try {
        const customer = {
            id: 'CUST' + Date.now(),
            name: action.name || 'New Customer',
            email: action.email || '',
            phone: action.phone || '',
            company: action.company || '',
            status: 'active',
            createdAt: new Date().toISOString(),
            createdBy: 'AI Assistant'
        };
        
        // Add to CRM customers array (same pattern as crm.js)
        if (!window.crmCustomers) window.crmCustomers = [];
        window.crmCustomers.push(customer);
        
        // Use proper save function if available, else direct localStorage
        if (typeof saveCRMCustomers === 'function') {
            saveCRMCustomers();
        } else {
            localStorage.setItem('ezcubic_crm_customers', JSON.stringify(window.crmCustomers));
            // Also save to tenant
            const user = window.currentUser;
            if (user && user.tenantId) {
                const tenantKey = 'ezcubic_tenant_' + user.tenantId;
                let tenantData = JSON.parse(localStorage.getItem(tenantKey) || '{}');
                tenantData.crmCustomers = window.crmCustomers;
                tenantData.updatedAt = new Date().toISOString();
                localStorage.setItem(tenantKey, JSON.stringify(tenantData));
            }
        }
        
        // Refresh the UI
        if (typeof renderCRMCustomers === 'function') renderCRMCustomers();
        if (typeof showNotification === 'function') {
            showNotification(`Customer "${action.name}" added!`, 'success');
        }
        
        return {
            isAction: true,
            message: `Done! ✅ Added customer: "${action.name}" 👤`
        };
    } catch (e) {
        console.error('Error adding customer:', e);
        return { isAction: true, message: `Oops! Couldn't add customer: ${e.message}` };
    }
}

// Execute: Add Supplier
function executeAddSupplier(action) {
    try {
        if (!action.name) {
            return { isAction: true, message: "Need a supplier name! Try: 'add supplier ABC Trading'" };
        }
        
        const supplier = {
            id: 'SUP_' + Date.now(),
            name: action.name,
            company: action.company || action.name,
            email: action.email || '',
            phone: action.phone || '',
            address: action.address || '',
            category: action.category || 'General',
            status: 'active',
            notes: action.notes || 'Added via AI',
            createdAt: new Date().toISOString()
        };
        
        // Add to suppliers array (same pattern as suppliers.js)
        if (!window.suppliers) window.suppliers = [];
        window.suppliers.push(supplier);
        
        // Use proper save function if available, else direct localStorage
        if (typeof saveSuppliers === 'function') {
            saveSuppliers();
        } else {
            localStorage.setItem('ezcubic_suppliers', JSON.stringify(window.suppliers));
            // Also save to tenant
            const user = window.currentUser;
            if (user && user.tenantId) {
                const tenantKey = 'ezcubic_tenant_' + user.tenantId;
                let tenantData = JSON.parse(localStorage.getItem(tenantKey) || '{}');
                tenantData.suppliers = window.suppliers;
                tenantData.updatedAt = new Date().toISOString();
                localStorage.setItem(tenantKey, JSON.stringify(tenantData));
            }
        }
        
        // Refresh the UI
        if (typeof renderSuppliers === 'function') renderSuppliers();
        if (typeof showNotification === 'function') {
            showNotification(`Supplier "${action.name}" added!`, 'success');
        }
        
        return {
            isAction: true,
            message: `Done! ✅ Added supplier: "${action.name}" 🏭`
        };
    } catch (e) {
        console.error('Error adding supplier:', e);
        return { isAction: true, message: `Oops! Couldn't add supplier: ${e.message}` };
    }
}

// Execute: Create Invoice
function executeCreateInvoice(action) {
    try {
        if (!action.customer) {
            return { isAction: true, message: "Need a customer name! Try: 'create invoice for Ahmad RM500'" };
        }
        
        const amount = parseFloat(action.amount) || 0;
        const invoice = {
            id: 'INV_' + Date.now(),
            invoiceNumber: `INV-${Date.now().toString().slice(-6)}`,
            customer: action.customer,
            customerName: action.customer,
            items: action.items || [{ description: action.description || 'Service', quantity: 1, price: amount }],
            subtotal: amount,
            tax: amount * 0.06,
            total: amount * 1.06,
            status: action.status || 'pending',
            dueDate: action.dueDate || new Date(Date.now() + 30*24*60*60*1000).toISOString().split('T')[0],
            createdAt: new Date().toISOString(),
            notes: action.notes || 'Created via AI'
        };
        
        // Add to invoices array (same pattern as invoices.js)
        if (!window.invoices) window.invoices = [];
        window.invoices.push(invoice);
        
        // Use proper save function if available, else direct localStorage
        if (typeof saveInvoices === 'function') {
            saveInvoices();
        } else {
            localStorage.setItem('ezcubic_invoices', JSON.stringify(window.invoices));
            // Also save to tenant
            const user = window.currentUser;
            if (user && user.tenantId) {
                const tenantKey = 'ezcubic_tenant_' + user.tenantId;
                let tenantData = JSON.parse(localStorage.getItem(tenantKey) || '{}');
                tenantData.invoices = window.invoices;
                tenantData.updatedAt = new Date().toISOString();
                localStorage.setItem(tenantKey, JSON.stringify(tenantData));
            }
        }
        
        // Refresh the UI
        if (typeof renderInvoices === 'function') renderInvoices();
        if (typeof showNotification === 'function') {
            showNotification(`Invoice ${invoice.invoiceNumber} created!`, 'success');
        }
        
        return {
            isAction: true,
            message: `Done! ✅ Created invoice ${invoice.invoiceNumber} for ${action.customer} - RM${amount.toFixed(2)} 📄`
        };
    } catch (e) {
        console.error('Error creating invoice:', e);
        return { isAction: true, message: `Oops! Couldn't create invoice: ${e.message}` };
    }
}

// Execute: Create Quotation
function executeCreateQuotation(action) {
    try {
        if (!action.customer) {
            return { isAction: true, message: "Need a customer name! Try: 'create quotation for Siti RM1000'" };
        }
        
        const amount = parseFloat(action.amount) || 0;
        const quotation = {
            id: 'QT_' + Date.now(),
            quotationNumber: `QT-${Date.now().toString().slice(-6)}`,
            customer: action.customer,
            customerName: action.customer,
            items: action.items || [{ description: action.description || 'Service', quantity: 1, price: amount }],
            subtotal: amount,
            tax: amount * 0.06,
            total: amount * 1.06,
            status: action.status || 'draft',
            validUntil: action.validUntil || new Date(Date.now() + 14*24*60*60*1000).toISOString().split('T')[0],
            createdAt: new Date().toISOString(),
            notes: action.notes || 'Created via AI'
        };
        
        // Add to quotations array (same pattern as quotations.js)
        if (!window.quotations) window.quotations = [];
        window.quotations.push(quotation);
        
        // Use proper save function if available, else direct localStorage
        if (typeof saveQuotations === 'function') {
            saveQuotations();
        } else {
            localStorage.setItem('ezcubic_quotations', JSON.stringify(window.quotations));
            // Also save to tenant
            const user = window.currentUser;
            if (user && user.tenantId) {
                const tenantKey = 'ezcubic_tenant_' + user.tenantId;
                let tenantData = JSON.parse(localStorage.getItem(tenantKey) || '{}');
                tenantData.quotations = window.quotations;
                tenantData.updatedAt = new Date().toISOString();
                localStorage.setItem(tenantKey, JSON.stringify(tenantData));
            }
        }
        
        // Refresh the UI
        if (typeof renderQuotations === 'function') renderQuotations();
        if (typeof showNotification === 'function') {
            showNotification(`Quotation ${quotation.quotationNumber} created!`, 'success');
        }
        
        return {
            isAction: true,
            message: `Done! ✅ Created quotation ${quotation.quotationNumber} for ${action.customer} - RM${amount.toFixed(2)} 📋`
        };
    } catch (e) {
        console.error('Error creating quotation:', e);
        return { isAction: true, message: `Oops! Couldn't create quotation: ${e.message}` };
    }
}

// Execute: Stock In (receive inventory)
function executeStockIn(action) {
    try {
        if (!action.product) {
            return { isAction: true, message: "Need a product name! Try: 'stock in 50 units of Widget A'" };
        }
        
        const quantity = parseInt(action.quantity) || 1;
        
        // Get products from window.products (same pattern as inventory.js)
        const productsList = window.products || [];
        
        if (productsList.length === 0) {
            return { isAction: true, message: "No products found. Add some products first! 📦" };
        }
        
        // Find product by name (case insensitive)
        const product = productsList.find(p => 
            p.name?.toLowerCase().includes(action.product.toLowerCase())
        );
        
        if (product) {
            product.stock = (product.stock || 0) + quantity;
            
            // Use proper save function if available
            if (typeof saveProducts === 'function') {
                saveProducts();
            } else {
                localStorage.setItem('ezcubic_products', JSON.stringify(window.products));
                const user = window.currentUser;
                if (user && user.tenantId) {
                    const tenantKey = 'ezcubic_tenant_' + user.tenantId;
                    let tenantData = JSON.parse(localStorage.getItem(tenantKey) || '{}');
                    tenantData.products = window.products;
                    tenantData.updatedAt = new Date().toISOString();
                    localStorage.setItem(tenantKey, JSON.stringify(tenantData));
                }
            }
            
            if (typeof renderProducts === 'function') renderProducts();
            if (typeof renderInventory === 'function') renderInventory();
            
            return {
                isAction: true,
                message: `Done! ✅ Added ${quantity} units to "${product.name}" (now: ${product.stock}) 📦⬆️`
            };
        } else {
            return {
                isAction: true,
                message: `Couldn't find product "${action.product}". Want me to add it first?`
            };
        }
    } catch (e) {
        console.error('Error with stock in:', e);
        return { isAction: true, message: `Oops! Stock in failed: ${e.message}` };
    }
}

// Execute: Stock Out (reduce inventory)
function executeStockOut(action) {
    try {
        if (!action.product) {
            return { isAction: true, message: "Need a product name! Try: 'stock out 10 units of Widget A'" };
        }
        
        const quantity = parseInt(action.quantity) || 1;
        
        // Get products from window.products (same pattern as inventory.js)
        const productsList = window.products || [];
        
        if (productsList.length === 0) {
            return { isAction: true, message: "No products found. Add some products first! 📦" };
        }
        
        // Find product by name (case insensitive)
        const product = productsList.find(p => 
            p.name?.toLowerCase().includes(action.product.toLowerCase())
        );
        
        if (product) {
            const currentQty = product.stock || 0;
            if (currentQty < quantity) {
                return {
                    isAction: true,
                    message: `⚠️ Not enough stock! "${product.name}" only has ${currentQty} units.`
                };
            }
            
            product.stock = currentQty - quantity;
            
            // Use proper save function if available
            if (typeof saveProducts === 'function') {
                saveProducts();
            } else {
                localStorage.setItem('ezcubic_products', JSON.stringify(window.products));
                const user = window.currentUser;
                if (user && user.tenantId) {
                    const tenantKey = 'ezcubic_tenant_' + user.tenantId;
                    let tenantData = JSON.parse(localStorage.getItem(tenantKey) || '{}');
                    tenantData.products = window.products;
                    tenantData.updatedAt = new Date().toISOString();
                    localStorage.setItem(tenantKey, JSON.stringify(tenantData));
                }
            }
            
            if (typeof renderProducts === 'function') renderProducts();
            if (typeof renderInventory === 'function') renderInventory();
            
            return {
                isAction: true,
                message: `Done! ✅ Removed ${quantity} units from "${product.name}" (now: ${product.stock}) 📦⬇️`
            };
        } else {
            return {
                isAction: true,
                message: `Couldn't find product "${action.product}". Check inventory?`
            };
        }
    } catch (e) {
        console.error('Error with stock out:', e);
        return { isAction: true, message: `Oops! Stock out failed: ${e.message}` };
    }
}

// Execute: Create Order (purchase order)
function executeCreateOrder(action) {
    try {
        if (!action.supplier && !action.product) {
            return { isAction: true, message: "Need details! Try: 'create order for 100 widgets from ABC Supply'" };
        }
        
        const quantity = parseInt(action.quantity) || 1;
        const amount = parseFloat(action.amount) || 0;
        
        const order = {
            id: 'PO_' + Date.now(),
            poNumber: `PO-${Date.now().toString().slice(-6)}`,
            orderNumber: `PO-${Date.now().toString().slice(-6)}`,
            supplier: action.supplier || 'General Supplier',
            supplierName: action.supplier || 'General Supplier',
            items: [{
                product: action.product || 'Various Items',
                quantity: quantity,
                unitPrice: amount / quantity || 0
            }],
            total: amount,
            status: action.status || 'pending',
            expectedDate: action.expectedDate || new Date(Date.now() + 7*24*60*60*1000).toISOString().split('T')[0],
            createdAt: new Date().toISOString(),
            notes: action.notes || 'Created via AI'
        };
        
        // Add to purchaseOrders array (same pattern as purchase-orders.js)
        if (!window.purchaseOrders) window.purchaseOrders = [];
        window.purchaseOrders.push(order);
        
        // Use proper save function if available
        if (typeof savePurchaseOrders === 'function') {
            savePurchaseOrders();
        } else {
            localStorage.setItem('ezcubic_purchaseOrders', JSON.stringify(window.purchaseOrders));
            const user = window.currentUser;
            if (user && user.tenantId) {
                const tenantKey = 'ezcubic_tenant_' + user.tenantId;
                let tenantData = JSON.parse(localStorage.getItem(tenantKey) || '{}');
                tenantData.purchaseOrders = window.purchaseOrders;
                tenantData.updatedAt = new Date().toISOString();
                localStorage.setItem(tenantKey, JSON.stringify(tenantData));
            }
        }
        
        // Refresh the UI
        if (typeof renderPurchaseOrders === 'function') renderPurchaseOrders();
        if (typeof showNotification === 'function') {
            showNotification(`Purchase Order ${order.poNumber} created!`, 'success');
        }
        
        return {
            isAction: true,
            message: `Done! ✅ Created PO ${order.poNumber} - ${quantity}x ${action.product || 'items'} from ${order.supplier} 📝`
        };
    } catch (e) {
        console.error('Error creating order:', e);
        return { isAction: true, message: `Oops! Couldn't create order: ${e.message}` };
    }
}

// Execute: Add Bill
function executeAddBill(action) {
    try {
        if (!action.name && !action.description) {
            return { isAction: true, message: "Need a bill name! Try: 'add bill electricity RM500 due 15th'" };
        }
        
        const amount = parseFloat(action.amount) || 0;
        
        // Parse due date
        let dueDate = action.dueDate;
        if (!dueDate) {
            // Default to end of current month
            const now = new Date();
            dueDate = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
        } else if (typeof dueDate === 'string' && !dueDate.includes('-')) {
            // If just a day number like "15th", set to current month
            const day = parseInt(dueDate.replace(/\D/g, ''));
            if (day > 0 && day <= 31) {
                const now = new Date();
                dueDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            }
        }
        
        // Match the structure from bills.js saveBill()
        const bill = {
            id: 'BILL_' + Date.now(),
            name: action.name || action.description || 'Bill',
            amount: amount,
            dueDate: dueDate,
            category: action.category || 'Utilities',
            vendor: action.vendor || 'Unknown',
            status: 'pending',
            createdAt: new Date().toISOString(),
            isRecurring: action.recurring || false,
            recurringFrequency: null,
            recurringEndDate: null,
            lastGeneratedDate: null
        };
        
        // Use global businessData (same as bills.js)
        if (typeof businessData !== 'undefined') {
            if (!businessData.bills) businessData.bills = [];
            businessData.bills.push(bill);
        } else if (window.businessData) {
            if (!window.businessData.bills) window.businessData.bills = [];
            window.businessData.bills.push(bill);
        }
        
        saveData();
        
        // Reload bills list (same as bills.js does)
        if (typeof loadBills === 'function') loadBills();
        
        const dueDateFormatted = new Date(dueDate).toLocaleDateString('en-MY', { day: 'numeric', month: 'short' });
        
        return {
            isAction: true,
            message: `Done! ✅ Added bill: ${bill.name} RM${amount.toFixed(2)} due ${dueDateFormatted} 📋`
        };
    } catch (e) {
        console.error('Error adding bill:', e);
        return { isAction: true, message: `Oops! Couldn't add bill: ${e.message}` };
    }
}

// Execute: Create BOM (Bill of Materials)
function executeCreateBOM(action) {
    try {
        if (!action.name) {
            return { isAction: true, message: "Need a BOM name! Try: 'create BOM for Wooden Chair'" };
        }
        
        const bom = {
            id: 'bom_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
            name: action.name,
            description: action.description || '',
            productId: action.productId || null,
            outputQuantity: parseInt(action.outputQuantity) || 1,
            components: action.components || [],
            laborCost: parseFloat(action.laborCost) || 0,
            overheadCost: parseFloat(action.overheadCost) || 0,
            notes: action.notes || 'Created via AI Assistant',
            status: action.status || 'active',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            createdBy: window.currentUser?.name || 'AI Assistant'
        };
        
        // Add to billOfMaterials array (same pattern as bom.js)
        if (!window.billOfMaterials) window.billOfMaterials = [];
        window.billOfMaterials.push(bom);
        
        // Use proper save function if available
        if (typeof saveBOMData === 'function') {
            saveBOMData();
        } else {
            localStorage.setItem('ezcubic_bom', JSON.stringify(window.billOfMaterials));
            const user = window.currentUser;
            if (user && user.tenantId) {
                const tenantKey = 'ezcubic_tenant_' + user.tenantId;
                let tenantData = JSON.parse(localStorage.getItem(tenantKey) || '{}');
                tenantData.billOfMaterials = window.billOfMaterials;
                tenantData.updatedAt = new Date().toISOString();
                localStorage.setItem(tenantKey, JSON.stringify(tenantData));
            }
        }
        
        // Refresh UI
        if (typeof renderBOMList === 'function') renderBOMList();
        if (typeof showNotification === 'function') {
            showNotification(`BOM "${action.name}" created!`, 'success');
        }
        
        return {
            isAction: true,
            message: `Done! ✅ Created BOM: "${action.name}" 🏭\nYou can add components in the BOM section.`
        };
    } catch (e) {
        console.error('Error creating BOM:', e);
        return { isAction: true, message: `Oops! Couldn't create BOM: ${e.message}` };
    }
}

// Execute: Create Project
function executeCreateProject(action) {
    try {
        if (!action.name && !action.customer) {
            return { isAction: true, message: "Need project details! Try: 'create project Kitchen Renovation for Ahmad RM50000'" };
        }
        
        const amount = parseFloat(action.amount) || 0;
        const projectNo = `PRJ-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}-${Date.now().toString().slice(-4)}`;
        
        const project = {
            id: 'proj_' + Date.now(),
            projectNo: projectNo,
            name: action.name || `Project for ${action.customer}`,
            customerId: action.customerId || null,
            customerName: action.customer || 'General Customer',
            description: action.description || '',
            totalAmount: amount,
            amountPaid: 0,
            status: action.status || 'quotation',
            startDate: action.startDate || new Date().toISOString().split('T')[0],
            endDate: action.endDate || null,
            salesperson: action.salesperson || window.currentUser?.name || '',
            milestones: action.milestones || [
                { name: 'Deposit', percentage: 30, amount: amount * 0.30, status: 'pending', dueDate: '' },
                { name: 'Progress Payment', percentage: 40, amount: amount * 0.40, status: 'pending', dueDate: '' },
                { name: 'Final Payment', percentage: 30, amount: amount * 0.30, status: 'pending', dueDate: '' }
            ],
            payments: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        
        // Add to projects array (same pattern as projects.js)
        if (!window.projects) window.projects = [];
        window.projects.push(project);
        
        // Use proper save function if available
        if (typeof saveProjects === 'function') {
            saveProjects();
        } else {
            localStorage.setItem('ezcubic_projects', JSON.stringify(window.projects));
            const user = window.currentUser;
            if (user && user.tenantId) {
                const tenantKey = 'ezcubic_tenant_' + user.tenantId;
                let tenantData = JSON.parse(localStorage.getItem(tenantKey) || '{}');
                tenantData.projects = window.projects;
                tenantData.updatedAt = new Date().toISOString();
                localStorage.setItem(tenantKey, JSON.stringify(tenantData));
            }
        }
        
        // Refresh UI
        if (typeof renderProjects === 'function') renderProjects();
        if (typeof updateProjectStats === 'function') updateProjectStats();
        if (typeof showNotification === 'function') {
            showNotification(`Project "${project.name}" created!`, 'success');
        }
        
        return {
            isAction: true,
            message: `Done! ✅ Created project ${projectNo}: "${project.name}" for ${project.customerName} - RM${amount.toFixed(2)} 📋\n\nMilestones:\n• Deposit (30%): RM${(amount * 0.30).toFixed(2)}\n• Progress (40%): RM${(amount * 0.40).toFixed(2)}\n• Final (30%): RM${(amount * 0.30).toFixed(2)}`
        };
    } catch (e) {
        console.error('Error creating project:', e);
        return { isAction: true, message: `Oops! Couldn't create project: ${e.message}` };
    }
}

// Execute: Create Delivery Order
function executeCreateDeliveryOrder(action) {
    try {
        if (!action.customer && !action.supplier) {
            return { isAction: true, message: "Need details! Try: 'create delivery order for Ahmad' or 'create incoming DO from ABC Supply'" };
        }
        
        const type = action.supplier ? 'incoming' : 'outgoing';
        const doNumber = `DO-${Date.now().toString().slice(-6)}`;
        
        const deliveryOrder = {
            id: 'do_' + Date.now(),
            doNumber: doNumber,
            type: type,
            date: action.date || new Date().toISOString().split('T')[0],
            customerId: type === 'outgoing' ? (action.customerId || null) : null,
            customerName: type === 'outgoing' ? (action.customer || null) : null,
            supplierId: type === 'incoming' ? (action.supplierId || null) : null,
            supplierName: type === 'incoming' ? (action.supplier || null) : null,
            referenceType: action.referenceType || (action.invoiceNo ? 'Invoice' : action.poNumber ? 'PO' : ''),
            referenceNumber: action.referenceNumber || action.invoiceNo || action.poNumber || '',
            address: action.address || '',
            items: action.items || [{ description: action.item || 'Items', quantity: parseInt(action.quantity) || 1 }],
            notes: action.notes || 'Created via AI Assistant',
            status: 'draft',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        
        // Add to deliveryOrders array (same pattern as delivery-orders.js)
        if (!window.deliveryOrders) window.deliveryOrders = [];
        window.deliveryOrders.push(deliveryOrder);
        
        // Use proper save function if available
        if (typeof saveDeliveryOrders === 'function') {
            saveDeliveryOrders();
        } else {
            localStorage.setItem('ezcubic_delivery_orders', JSON.stringify(window.deliveryOrders));
            const user = window.currentUser;
            if (user && user.tenantId) {
                const tenantKey = 'ezcubic_tenant_' + user.tenantId;
                let tenantData = JSON.parse(localStorage.getItem(tenantKey) || '{}');
                tenantData.deliveryOrders = window.deliveryOrders;
                tenantData.updatedAt = new Date().toISOString();
                localStorage.setItem(tenantKey, JSON.stringify(tenantData));
            }
        }
        
        // Refresh UI
        if (typeof renderDeliveryOrdersList === 'function') renderDeliveryOrdersList();
        if (typeof updateDOStats === 'function') updateDOStats();
        if (typeof showNotification === 'function') {
            showNotification(`Delivery Order ${doNumber} created!`, 'success');
        }
        
        const recipient = type === 'outgoing' ? action.customer : action.supplier;
        return {
            isAction: true,
            message: `Done! ✅ Created ${type === 'outgoing' ? 'outgoing' : 'incoming'} DO ${doNumber} for ${recipient} 🚚\nStatus: Draft - Ready for confirmation.`
        };
    } catch (e) {
        console.error('Error creating delivery order:', e);
        return { isAction: true, message: `Oops! Couldn't create delivery order: ${e.message}` };
    }
}

// Execute: Add Employee (Payroll)
function executeAddEmployee(action) {
    try {
        if (!action.name) {
            return { isAction: true, message: "Need employee name! Try: 'add employee Ahmad salary RM3000'" };
        }
        
        const employee = {
            id: 'emp_' + Date.now(),
            name: action.name,
            ic: action.ic || '',
            email: action.email || '',
            phone: action.phone || '',
            department: action.department || 'General',
            position: action.position || 'Staff',
            employmentType: action.type || 'full-time',
            startDate: action.startDate || new Date().toISOString().split('T')[0],
            basicSalary: parseFloat(action.salary) || parseFloat(action.amount) || 0,
            bankName: action.bank || '',
            bankAccount: action.bankAccount || '',
            hasEPF: true,
            hasSOCSO: true,
            hasEIS: true,
            hasPCB: true,
            status: 'active',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        
        // Add to employees array
        if (!window.employees) window.employees = [];
        window.employees.push(employee);
        
        // Save
        if (typeof saveEmployeesData === 'function') {
            saveEmployeesData();
        } else {
            localStorage.setItem('ezcubic_employees', JSON.stringify(window.employees));
            const user = window.currentUser;
            if (user && user.tenantId) {
                const tenantKey = 'ezcubic_tenant_' + user.tenantId;
                let tenantData = JSON.parse(localStorage.getItem(tenantKey) || '{}');
                tenantData.employees = window.employees;
                tenantData.updatedAt = new Date().toISOString();
                localStorage.setItem(tenantKey, JSON.stringify(tenantData));
            }
        }
        
        // Refresh UI
        if (typeof loadEmployees === 'function') loadEmployees();
        if (typeof updatePayrollStats === 'function') updatePayrollStats();
        
        const salaryStr = employee.basicSalary > 0 ? ` with salary RM${employee.basicSalary.toLocaleString()}` : '';
        return {
            isAction: true,
            message: `Done! ✅ Added employee: ${employee.name}${salaryStr} 👤\nDepartment: ${employee.department} | Position: ${employee.position}`
        };
    } catch (e) {
        console.error('Error adding employee:', e);
        return { isAction: true, message: `Oops! Couldn't add employee: ${e.message}` };
    }
}

// Execute: Create KPI Template
function executeCreateKPI(action) {
    try {
        if (!action.name && !action.title) {
            return { isAction: true, message: "Need KPI name! Try: 'create KPI Sales Target RM10000'" };
        }
        
        const kpiTemplate = {
            id: 'kpi_' + Date.now(),
            name: action.name || action.title,
            description: action.description || `KPI for ${action.name || action.title}`,
            category: action.category || 'Performance',
            metric: action.metric || 'value',
            targetValue: parseFloat(action.target) || parseFloat(action.amount) || parseFloat(action.value) || 100,
            unit: action.unit || (action.amount ? 'RM' : '%'),
            frequency: action.frequency || 'monthly',
            weight: parseFloat(action.weight) || 100,
            status: 'active',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        
        // Add to kpiTemplates array
        if (!window.kpiTemplates) window.kpiTemplates = [];
        window.kpiTemplates.push(kpiTemplate);
        
        // Save
        if (typeof saveKPITemplates === 'function') {
            saveKPITemplates();
        } else {
            localStorage.setItem('ezcubic_kpi_templates', JSON.stringify(window.kpiTemplates));
            const user = window.currentUser;
            if (user && user.tenantId) {
                const tenantKey = 'ezcubic_tenant_' + user.tenantId;
                let tenantData = JSON.parse(localStorage.getItem(tenantKey) || '{}');
                tenantData.kpiTemplates = window.kpiTemplates;
                tenantData.updatedAt = new Date().toISOString();
                localStorage.setItem(tenantKey, JSON.stringify(tenantData));
            }
        }
        
        // Refresh UI
        if (typeof loadKPITemplates === 'function') loadKPITemplates();
        if (typeof updateKPIStats === 'function') updateKPIStats();
        
        return {
            isAction: true,
            message: `Done! ✅ Created KPI: ${kpiTemplate.name} 🎯\nTarget: ${kpiTemplate.unit === 'RM' ? 'RM' : ''}${kpiTemplate.targetValue.toLocaleString()}${kpiTemplate.unit === '%' ? '%' : ''} | Frequency: ${kpiTemplate.frequency}`
        };
    } catch (e) {
        console.error('Error creating KPI:', e);
        return { isAction: true, message: `Oops! Couldn't create KPI: ${e.message}` };
    }
}

// Execute: Add Branch
function executeAddBranch(action) {
    try {
        if (!action.name) {
            return { isAction: true, message: "Need branch name! Try: 'add branch Penang outlet'" };
        }
        
        const branchCode = (action.code || action.name.substring(0, 3).toUpperCase() + '_' + Date.now().toString().slice(-4));
        
        const branch = {
            id: 'branch_' + Date.now(),
            code: branchCode,
            name: action.name,
            address: action.address || '',
            phone: action.phone || '',
            email: action.email || '',
            manager: action.manager || '',
            type: action.type || 'outlet',
            status: 'active',
            isDefault: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        
        // Add to branches array
        if (!window.branches) window.branches = [];
        window.branches.push(branch);
        
        // Save
        if (typeof saveBranchData === 'function') {
            saveBranchData();
        } else {
            localStorage.setItem('ezcubic_branches', JSON.stringify(window.branches));
            const user = window.currentUser;
            if (user && user.tenantId) {
                const tenantKey = 'ezcubic_tenant_' + user.tenantId;
                let tenantData = JSON.parse(localStorage.getItem(tenantKey) || '{}');
                tenantData.branches = window.branches;
                tenantData.updatedAt = new Date().toISOString();
                localStorage.setItem(tenantKey, JSON.stringify(tenantData));
            }
        }
        
        // Refresh UI
        if (typeof renderBranches === 'function') renderBranches();
        if (typeof updateBranchStats === 'function') updateBranchStats();
        if (typeof renderBranchSelector === 'function') renderBranchSelector();
        
        return {
            isAction: true,
            message: `Done! ✅ Added branch: ${branch.name} 🏢\nCode: ${branch.code} | Type: ${branch.type}`
        };
    } catch (e) {
        console.error('Error adding branch:', e);
        return { isAction: true, message: `Oops! Couldn't add branch: ${e.message}` };
    }
}

// Execute: Stock Transfer between branches
function executeStockTransfer(action) {
    try {
        