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
    } else {
        showNotification(`❌ Failed: ${result.error}`, 'error');
    }
    
    return result;
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

// ==================== INITIALIZATION ====================
function initializeChatbot() {
    loadChatHistory();
    loadPendingApprovals();
    loadAIMemory(); // Load AI self-learning memory
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
    messageElement.innerHTML = `
        <div class="message-content">
            <div class="message-avatar">
                <i class="fas fa-${isUser ? 'user' : 'robot'}"></i>
            </div>
            <div class="message-text">${escapeHTML(messageText)}</div>
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
    const quotation = {
        id: 'QUO' + Date.now(),
        quoteNo: action.quoteNo || 'QUO-' + Date.now().toString().slice(-6),
        customer: action.customer || '',
        title: action.title || '',
        items: action.items || [],
        subtotal: parseFloat(action.subtotal) || parseFloat(action.total) || 0,
        total: parseFloat(action.total) || 0,
        status: 'draft',
        validUntil: action.validUntil || '',
        createdAt: new Date().toISOString(),
        createdBy: 'AI Assistant'
    };
    
    if (!window.quotations) window.quotations = [];
    window.quotations.push(quotation);
    
    if (typeof saveQuotations === 'function') saveQuotations();
    if (typeof renderQuotations === 'function') renderQuotations();
    
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
    
    // Find product and update stock
    if (window.products) {
        const product = window.products.find(p => 
            p.name?.toLowerCase().includes(productName?.toLowerCase()) || 
            p.sku?.toLowerCase() === productName?.toLowerCase()
        );
        
        if (product) {
            product.stock = (product.stock || 0) + quantity;
            if (typeof saveProducts === 'function') saveProducts();
            if (typeof renderProducts === 'function') renderProducts();
            return { product, quantityAdded: quantity };
        }
    }
    
    throw new Error(`Product "${productName}" not found`);
}

function doStockOut(action) {
    const productName = action.product || action.name;
    const quantity = parseInt(action.quantity) || 0;
    
    if (window.products) {
        const product = window.products.find(p => 
            p.name?.toLowerCase().includes(productName?.toLowerCase()) || 
            p.sku?.toLowerCase() === productName?.toLowerCase()
        );
        
        if (product) {
            if ((product.stock || 0) >= quantity) {
                product.stock = (product.stock || 0) - quantity;
                if (typeof saveProducts === 'function') saveProducts();
                if (typeof renderProducts === 'function') renderProducts();
                return { product, quantityRemoved: quantity };
            } else {
                throw new Error(`Insufficient stock. Available: ${product.stock}`);
            }
        }
    }
    
    throw new Error(`Product "${productName}" not found`);
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
        if (!action.product && !action.item) {
            return { isAction: true, message: "Need product to transfer! Try: 'transfer 10 iPhone to Penang branch'" };
        }
        
        const productName = action.product || action.item;
        const quantity = parseInt(action.quantity) || parseInt(action.amount) || 1;
        const toBranch = action.to || action.branch || action.destination;
        const fromBranch = action.from || 'HQ';
        
        // Find product
        const products = window.products || [];
        const product = products.find(p => 
            p.name?.toLowerCase().includes(productName.toLowerCase()) ||
            p.sku?.toLowerCase().includes(productName.toLowerCase())
        );
        
        if (!product) {
            return { isAction: true, message: `Couldn't find product "${productName}". Check inventory.` };
        }
        
        // Find branches
        const branches = window.branches || [];
        const sourceBranch = branches.find(b => b.name?.toLowerCase().includes(fromBranch.toLowerCase()) || b.code?.toLowerCase().includes(fromBranch.toLowerCase())) || { id: 'BRANCH_HQ', name: 'HQ' };
        const destBranch = branches.find(b => b.name?.toLowerCase().includes(toBranch?.toLowerCase()) || b.code?.toLowerCase().includes(toBranch?.toLowerCase()));
        
        if (!destBranch) {
            return { isAction: true, message: `Couldn't find destination branch "${toBranch}". Check branch list.` };
        }
        
        const transfer = {
            id: 'transfer_' + Date.now(),
            transferNumber: 'TRF-' + Date.now().toString().slice(-6),
            productId: product.id,
            productName: product.name,
            productSku: product.sku,
            quantity: quantity,
            fromBranchId: sourceBranch.id,
            fromBranchName: sourceBranch.name,
            toBranchId: destBranch.id,
            toBranchName: destBranch.name,
            status: 'pending',
            notes: action.notes || 'Created via AI Assistant',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        
        // Add to transfers array
        if (!window.branchTransfers) window.branchTransfers = [];
        window.branchTransfers.push(transfer);
        
        // Save
        if (typeof saveBranchData === 'function') {
            saveBranchData();
        } else {
            localStorage.setItem('ezcubic_branch_transfers', JSON.stringify(window.branchTransfers));
        }
        
        // Refresh UI
        if (typeof renderTransfers === 'function') renderTransfers();
        
        return {
            isAction: true,
            message: `Done! ✅ Stock transfer created: ${transfer.transferNumber} 📦\n${quantity}x ${product.name}\nFrom: ${sourceBranch.name} → To: ${destBranch.name}\nStatus: Pending approval`
        };
    } catch (e) {
        console.error('Error creating transfer:', e);
        return { isAction: true, message: `Oops! Couldn't create transfer: ${e.message}` };
    }
}

// Execute: Create Journal Entry
function executeCreateJournalEntry(action) {
    try {
        if (!action.debit && !action.credit) {
            return { isAction: true, message: "Need debit and credit accounts! Try: 'journal entry debit Cash RM1000 credit Sales RM1000'" };
        }
        
        const amount = parseFloat(action.amount) || parseFloat(action.debitAmount) || parseFloat(action.creditAmount) || 0;
        const journalNumber = 'JE-' + Date.now().toString().slice(-6);
        
        const journalEntry = {
            id: 'je_' + Date.now(),
            journalNumber: journalNumber,
            date: action.date || new Date().toISOString().split('T')[0],
            type: action.type || 'general',
            description: action.description || action.memo || 'Journal Entry',
            lines: [
                {
                    id: 'line_' + Date.now() + '_1',
                    accountCode: action.debitCode || '',
                    accountName: action.debit || 'Debit Account',
                    debit: amount,
                    credit: 0,
                    description: action.debitDesc || ''
                },
                {
                    id: 'line_' + Date.now() + '_2',
                    accountCode: action.creditCode || '',
                    accountName: action.credit || 'Credit Account',
                    debit: 0,
                    credit: amount,
                    description: action.creditDesc || ''
                }
            ],
            totalDebit: amount,
            totalCredit: amount,
            status: 'draft',
            reference: action.reference || '',
            createdBy: window.currentUser?.name || 'AI Assistant',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        
        // Add to journal entries array
        if (!window.journalEntries) window.journalEntries = [];
        window.journalEntries.push(journalEntry);
        
        // Save
        if (typeof saveJournalEntries === 'function') {
            saveJournalEntries();
        } else {
            localStorage.setItem('ezcubic_journal_entries', JSON.stringify(window.journalEntries));
            const user = window.currentUser;
            if (user && user.tenantId) {
                const tenantKey = 'ezcubic_tenant_' + user.tenantId;
                let tenantData = JSON.parse(localStorage.getItem(tenantKey) || '{}');
                tenantData.journalEntries = window.journalEntries;
                tenantData.updatedAt = new Date().toISOString();
                localStorage.setItem(tenantKey, JSON.stringify(tenantData));
            }
        }
        
        // Refresh UI
        if (typeof renderJournalEntries === 'function') renderJournalEntries();
        
        return {
            isAction: true,
            message: `Done! ✅ Journal Entry ${journalNumber} created 📒\nDr. ${action.debit}: RM${amount.toLocaleString()}\nCr. ${action.credit}: RM${amount.toLocaleString()}\nStatus: Draft`
        };
    } catch (e) {
        console.error('Error creating journal entry:', e);
        return { isAction: true, message: `Oops! Couldn't create journal entry: ${e.message}` };
    }
}

// Execute: Apply Leave
function executeApplyLeave(action) {
    try {
        if (!action.employee && !action.name) {
            return { isAction: true, message: "Need employee name! Try: 'apply leave for Ahmad from Jan 5 to Jan 7'" };
        }
        
        const employeeName = action.employee || action.name;
        
        // Find employee
        const employees = window.employees || [];
        const employee = employees.find(e => 
            e.name?.toLowerCase().includes(employeeName.toLowerCase())
        );
        
        const startDate = action.startDate || action.from || action.date || new Date().toISOString().split('T')[0];
        const endDate = action.endDate || action.to || startDate;
        
        // Calculate days
        const start = new Date(startDate);
        const end = new Date(endDate);
        const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
        
        const leaveRequest = {
            id: 'leave_' + Date.now(),
            employeeId: employee?.id || null,
            employeeName: employee?.name || employeeName,
            leaveType: action.type || 'annual',
            startDate: startDate,
            endDate: endDate,
            days: days,
            reason: action.reason || 'Applied via AI Assistant',
            status: 'pending',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        
        // Add to leave requests
        if (!window.leaveRequests) window.leaveRequests = [];
        window.leaveRequests.push(leaveRequest);
        
        // Save
        localStorage.setItem('ezcubic_leave_requests', JSON.stringify(window.leaveRequests));
        const user = window.currentUser;
        if (user && user.tenantId) {
            const tenantKey = 'ezcubic_tenant_' + user.tenantId;
            let tenantData = JSON.parse(localStorage.getItem(tenantKey) || '{}');
            tenantData.leaveRequests = window.leaveRequests;
            tenantData.updatedAt = new Date().toISOString();
            localStorage.setItem(tenantKey, JSON.stringify(tenantData));
        }
        
        // Refresh UI
        if (typeof loadLeaveRequests === 'function') loadLeaveRequests();
        if (typeof updateLeaveStats === 'function') updateLeaveStats();
        
        const leaveTypeNames = {
            annual: 'Annual Leave',
            medical: 'Medical Leave',
            maternity: 'Maternity Leave',
            paternity: 'Paternity Leave',
            unpaid: 'Unpaid Leave',
            emergency: 'Emergency Leave'
        };
        
        return {
            isAction: true,
            message: `Done! ✅ Leave request submitted 📅\nEmployee: ${leaveRequest.employeeName}\nType: ${leaveTypeNames[leaveRequest.leaveType] || leaveRequest.leaveType}\nDuration: ${startDate} to ${endDate} (${days} day${days > 1 ? 's' : ''})\nStatus: Pending approval`
        };
    } catch (e) {
        console.error('Error applying leave:', e);
        return { isAction: true, message: `Oops! Couldn't apply leave: ${e.message}` };
    }
}

// Execute: POS Quick Sale
function executePOSSale(action) {
    try {
        const amount = parseFloat(action.amount) || parseFloat(action.total) || 0;
        const paymentMethod = action.payment || action.method || 'cash';
        
        if (amount <= 0 && !action.items && !action.product) {
            return { isAction: true, message: "Need sale amount or items! Try: 'sale RM150 cash' or 'sell 2 coffee'" };
        }
        
        const saleNumber = 'POS-' + Date.now().toString().slice(-6);
        let items = [];
        let totalAmount = amount;
        
        // If product specified, find it
        if (action.product || action.item) {
            const productName = action.product || action.item;
            const products = window.products || [];
            const product = products.find(p => 
                p.name?.toLowerCase().includes(productName.toLowerCase())
            );
            
            if (product) {
                const qty = parseInt(action.quantity) || 1;
                items.push({
                    productId: product.id,
                    name: product.name,
                    sku: product.sku,
                    quantity: qty,
                    price: product.price,
                    total: product.price * qty
                });
                totalAmount = product.price * qty;
            }
        }
        
        // If no items but amount given, create generic item
        if (items.length === 0 && totalAmount > 0) {
            items.push({
                productId: null,
                name: 'Quick Sale',
                quantity: 1,
                price: totalAmount,
                total: totalAmount
            });
        }
        
        const sale = {
            id: 'sale_' + Date.now(),
            saleNumber: saleNumber,
            date: new Date().toISOString(),
            items: items,
            subtotal: totalAmount,
            tax: 0,
            discount: parseFloat(action.discount) || 0,
            total: totalAmount - (parseFloat(action.discount) || 0),
            paymentMethod: paymentMethod,
            amountPaid: totalAmount,
            change: 0,
            customerId: action.customerId || null,
            customerName: action.customer || 'Walk-in',
            cashierId: window.currentUser?.id || null,
            cashierName: window.currentUser?.name || 'POS',
            status: 'completed',
            createdAt: new Date().toISOString()
        };
        
        // Add to sales
        if (!window.sales) window.sales = [];
        window.sales.push(sale);
        
        // Save
        if (typeof saveSales === 'function') {
            saveSales();
        } else {
            localStorage.setItem('ezcubic_sales', JSON.stringify(window.sales));
            const user = window.currentUser;
            if (user && user.tenantId) {
                const tenantKey = 'ezcubic_tenant_' + user.tenantId;
                let tenantData = JSON.parse(localStorage.getItem(tenantKey) || '{}');
                tenantData.sales = window.sales;
                tenantData.updatedAt = new Date().toISOString();
                localStorage.setItem(tenantKey, JSON.stringify(tenantData));
            }
        }
        
        // Deduct stock if product sold
        if (items.length > 0 && items[0].productId) {
            const products = window.products || [];
            const product = products.find(p => p.id === items[0].productId);
            if (product) {
                product.stock = (product.stock || 0) - items[0].quantity;
                if (typeof saveProducts === 'function') saveProducts();
            }
        }
        
        // Refresh UI
        if (typeof renderSalesHistory === 'function') renderSalesHistory();
        if (typeof updatePOSStats === 'function') updatePOSStats();
        
        const paymentLabels = { cash: '💵 Cash', card: '💳 Card', ewallet: '📱 E-Wallet', qr: '📱 QR' };
        
        return {
            isAction: true,
            message: `Done! ✅ Sale completed: ${saleNumber} 🧾\nTotal: RM${sale.total.toLocaleString()}\nPayment: ${paymentLabels[paymentMethod] || paymentMethod}\nCustomer: ${sale.customerName}`
        };
    } catch (e) {
        console.error('Error creating sale:', e);
        return { isAction: true, message: `Oops! Couldn't create sale: ${e.message}` };
    }
}

// Execute: Search/Find
function executeSearch(action) {
    try {
        const type = action.type?.toLowerCase() || '';
        const filter = action.filter?.toLowerCase() || 'all';
        const value = action.value || '';
        let results = [];
        let message = '';
        
        const today = new Date().toISOString().split('T')[0];
        const thisMonth = today.slice(0, 7);
        
        if (type === 'invoices' || type === 'invoice') {
            // Use window.invoices (same as invoices.js)
            const invoices = window.invoices || [];
            
            if (filter === 'unpaid' || filter === 'pending') {
                results = invoices.filter(i => i.status === 'pending' || i.status === 'unpaid');
                message = results.length > 0 
                    ? `Found ${results.length} unpaid invoice(s):\n${results.slice(0, 5).map(i => `• ${i.invoiceNumber || i.id} - ${i.customer || i.customerName} RM${i.total?.toFixed(2) || i.amount?.toFixed(2)}`).join('\n')}`
                    : `No unpaid invoices found! 🎉`;
            } else if (filter === 'customer' && value) {
                results = invoices.filter(i => (i.customer || i.customerName)?.toLowerCase().includes(value.toLowerCase()));
                message = results.length > 0
                    ? `Found ${results.length} invoice(s) for "${value}":\n${results.slice(0, 5).map(i => `• ${i.invoiceNumber || i.id} - RM${i.total?.toFixed(2) || i.amount?.toFixed(2)} (${i.status})`).join('\n')}`
                    : `No invoices found for "${value}"`;
            } else if (filter === 'paid') {
                results = invoices.filter(i => i.status === 'paid');
                message = `Found ${results.length} paid invoice(s) 💰`;
            } else {
                message = `Total: ${invoices.length} invoices 📄`;
            }
            
        } else if (type === 'customers' || type === 'customer') {
            // Use window.crmCustomers (same as crm.js)
            const customers = window.crmCustomers || [];
            if (value) {
                results = customers.filter(c => c.name?.toLowerCase().includes(value.toLowerCase()));
                message = results.length > 0
                    ? `Found ${results.length} customer(s) matching "${value}":\n${results.slice(0, 5).map(c => `• ${c.name} ${c.phone || ''}`).join('\n')}`
                    : `No customers found matching "${value}"`;
            } else {
                message = `Total: ${customers.length} customers 👥`;
            }
            
        } else if (type === 'products' || type === 'product') {
            // Use window.products (same as inventory.js)
            const products = window.products || [];
            if (filter === 'low_stock' || filter === 'low stock') {
                results = products.filter(p => (p.stock || 0) < (p.minStock || 10));
                message = results.length > 0
                    ? `⚠️ ${results.length} low stock items:\n${results.slice(0, 5).map(p => `• ${p.name}: ${p.stock || 0} left`).join('\n')}`
                    : `All products are well stocked! ✅`;
            } else if (value) {
                results = products.filter(p => p.name?.toLowerCase().includes(value.toLowerCase()));
                message = results.length > 0
                    ? `Found:\n${results.slice(0, 5).map(p => `• ${p.name} - RM${p.price?.toFixed(2)} (Stock: ${p.stock || 0})`).join('\n')}`
                    : `No products found matching "${value}"`;
            } else {
                message = `Total: ${products.length} products 📦`;
            }
            
        } else if (type === 'expenses' || type === 'expense') {
            const transactions = window.businessData?.transactions || [];
            const expenses = transactions.filter(t => t.type === 'expense');
            
            if (filter === 'today') {
                results = expenses.filter(e => e.date === today);
                const total = results.reduce((sum, e) => sum + (e.amount || 0), 0);
                message = `Today's expenses: RM${total.toFixed(2)} (${results.length} items) 💸`;
            } else if (filter === 'this_month' || filter === 'this month') {
                results = expenses.filter(e => e.date?.startsWith(thisMonth));
                const total = results.reduce((sum, e) => sum + (e.amount || 0), 0);
                message = `This month's expenses: RM${total.toFixed(2)} (${results.length} items) 💸`;
            } else {
                const total = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
                message = `Total expenses: RM${total.toFixed(2)} (${expenses.length} items)`;
            }
            
        } else if (type === 'income') {
            const transactions = window.businessData?.transactions || [];
            const income = transactions.filter(t => t.type === 'income');
            
            if (filter === 'today') {
                results = income.filter(i => i.date === today);
                const total = results.reduce((sum, i) => sum + (i.amount || 0), 0);
                message = `Today's income: RM${total.toFixed(2)} (${results.length} items) 💰`;
            } else if (filter === 'this_month' || filter === 'this month') {
                results = income.filter(i => i.date?.startsWith(thisMonth));
                const total = results.reduce((sum, i) => sum + (i.amount || 0), 0);
                message = `This month's income: RM${total.toFixed(2)} (${results.length} items) 💰`;
            } else {
                const total = income.reduce((sum, i) => sum + (i.amount || 0), 0);
                message = `Total income: RM${total.toFixed(2)} (${income.length} items)`;
            }
            
        } else if (type === 'quotations' || type === 'quotation') {
            // Use window.quotations (same as quotations.js)
            const quotations = window.quotations || [];
            if (filter === 'pending' || filter === 'draft') {
                results = quotations.filter(q => q.status === 'draft' || q.status === 'pending');
                message = `Found ${results.length} pending quotation(s) 📋`;
            } else {
                message = `Total: ${quotations.length} quotations 📋`;
            }
            
        } else if (type === 'suppliers' || type === 'supplier') {
            // Use window.suppliers (same as suppliers.js)
            const suppliers = window.suppliers || [];
            if (value) {
                results = suppliers.filter(s => s.name?.toLowerCase().includes(value.toLowerCase()));
                message = results.length > 0
                    ? `Found ${results.length} supplier(s) matching "${value}":\n${results.slice(0, 5).map(s => `• ${s.name} ${s.phone || ''}`).join('\n')}`
                    : `No suppliers found matching "${value}"`;
            } else {
                message = `Total: ${suppliers.length} suppliers 🏭`;
            }
            
        } else if (type === 'bills' || type === 'bill') {
            const bills = (typeof businessData !== 'undefined' ? businessData.bills : window.businessData?.bills) || [];
            
            if (filter === 'unpaid' || filter === 'pending') {
                results = bills.filter(b => b.status === 'unpaid' || b.status === 'pending');
                const total = results.reduce((sum, b) => sum + (b.amount || 0), 0);
                if (results.length > 0) {
                    message = `📋 ${results.length} unpaid bill(s) - Total: RM${total.toFixed(2)}\n${results.slice(0, 5).map(b => `• ${b.name}: RM${b.amount?.toFixed(2)} (due ${b.dueDate || 'N/A'})`).join('\n')}`;
                } else {
                    message = `No unpaid bills! All clear 🎉`;
                }
            } else if (filter === 'due_soon' || filter === 'due soon' || filter === 'due this week') {
                const nextWeek = new Date(Date.now() + 7*24*60*60*1000).toISOString().split('T')[0];
                results = bills.filter(b => (b.status === 'unpaid' || b.status === 'pending') && b.dueDate && b.dueDate <= nextWeek);
                const total = results.reduce((sum, b) => sum + (b.amount || 0), 0);
                if (results.length > 0) {
                    message = `⚠️ ${results.length} bill(s) due soon - Total: RM${total.toFixed(2)}\n${results.map(b => `• ${b.name}: RM${b.amount?.toFixed(2)} (due ${b.dueDate})`).join('\n')}`;
                } else {
                    message = `No bills due this week! 👍`;
                }
            } else if (filter === 'paid') {
                results = bills.filter(b => b.status === 'paid');
                message = `${results.length} paid bill(s) ✅`;
            } else {
                const unpaid = bills.filter(b => b.status !== 'paid');
                const total = unpaid.reduce((sum, b) => sum + (b.amount || 0), 0);
                message = `Total: ${bills.length} bills (${unpaid.length} unpaid - RM${total.toFixed(2)}) 📋`;
            }
            
        } else if (type === 'bom' || type === 'boms' || type === 'bill of materials') {
            // Use window.billOfMaterials (same as bom.js)
            const boms = window.billOfMaterials || [];
            if (filter === 'active') {
                results = boms.filter(b => b.status === 'active');
                message = results.length > 0
                    ? `Found ${results.length} active BOM(s):\n${results.slice(0, 5).map(b => `• ${b.name} (${b.components?.length || 0} components)`).join('\n')}`
                    : `No active BOMs found`;
            } else if (value) {
                results = boms.filter(b => b.name?.toLowerCase().includes(value.toLowerCase()));
                message = results.length > 0
                    ? `Found ${results.length} BOM(s) matching "${value}":\n${results.slice(0, 5).map(b => `• ${b.name}`).join('\n')}`
                    : `No BOMs found matching "${value}"`;
            } else {
                message = `Total: ${boms.length} BOM(s) 🏭`;
            }
            
        } else if (type === 'projects' || type === 'project') {
            // Use window.projects (same as projects.js)
            const projectList = window.projects || [];
            if (filter === 'active' || filter === 'in_progress') {
                results = projectList.filter(p => p.status !== 'completed' && p.status !== 'cancelled');
                const totalValue = results.reduce((sum, p) => sum + (p.totalAmount || 0), 0);
                message = results.length > 0
                    ? `📋 ${results.length} active project(s) - Total: RM${totalValue.toLocaleString()}\n${results.slice(0, 5).map(p => `• ${p.projectNo}: ${p.name} - RM${(p.totalAmount || 0).toLocaleString()}`).join('\n')}`
                    : `No active projects`;
            } else if (filter === 'completed') {
                results = projectList.filter(p => p.status === 'completed');
                message = `${results.length} completed project(s) ✅`;
            } else if (value) {
                results = projectList.filter(p => p.name?.toLowerCase().includes(value.toLowerCase()) || p.customerName?.toLowerCase().includes(value.toLowerCase()));
                message = results.length > 0
                    ? `Found ${results.length} project(s):\n${results.slice(0, 5).map(p => `• ${p.projectNo}: ${p.name} (${p.status})`).join('\n')}`
                    : `No projects found matching "${value}"`;
            } else {
                const totalValue = projectList.reduce((sum, p) => sum + (p.totalAmount || 0), 0);
                message = `Total: ${projectList.length} projects - RM${totalValue.toLocaleString()} 📋`;
            }
            
        } else if (type === 'delivery_orders' || type === 'delivery' || type === 'do') {
            // Use window.deliveryOrders (same as delivery-orders.js)
            const doList = window.deliveryOrders || [];
            if (filter === 'pending' || filter === 'draft') {
                results = doList.filter(d => d.status === 'draft' || d.status === 'confirmed');
                message = results.length > 0
                    ? `📦 ${results.length} pending DO(s):\n${results.slice(0, 5).map(d => `• ${d.doNumber}: ${d.customerName || d.supplierName} (${d.status})`).join('\n')}`
                    : `No pending delivery orders`;
            } else if (filter === 'shipped' || filter === 'in_transit') {
                results = doList.filter(d => d.status === 'shipped' || d.status === 'in_transit');
                message = `${results.length} DO(s) in transit 🚚`;
            } else if (filter === 'delivered') {
                results = doList.filter(d => d.status === 'delivered');
                message = `${results.length} delivered DO(s) ✅`;
            } else {
                message = `Total: ${doList.length} delivery orders 🚚`;
            }
            
        } else if (type === 'employees' || type === 'employee' || type === 'staff') {
            const employees = window.employees || [];
            if (filter === 'active') {
                results = employees.filter(e => e.status === 'active');
                const totalSalary = results.reduce((sum, e) => sum + (e.basicSalary || 0), 0);
                message = results.length > 0
                    ? `👤 ${results.length} active employee(s) - Total salary: RM${totalSalary.toLocaleString()}\n${results.slice(0, 5).map(e => `• ${e.name} - ${e.position || 'Staff'} (RM${(e.basicSalary || 0).toLocaleString()})`).join('\n')}`
                    : `No active employees`;
            } else if (value) {
                results = employees.filter(e => e.name?.toLowerCase().includes(value.toLowerCase()) || e.department?.toLowerCase().includes(value.toLowerCase()));
                message = results.length > 0
                    ? `Found ${results.length} employee(s):\n${results.slice(0, 5).map(e => `• ${e.name} - ${e.department || 'General'}`).join('\n')}`
                    : `No employees found matching "${value}"`;
            } else {
                const totalSalary = employees.reduce((sum, e) => sum + (e.basicSalary || 0), 0);
                message = `Total: ${employees.length} employees - Salary: RM${totalSalary.toLocaleString()}/month 👥`;
            }
            
        } else if (type === 'kpi' || type === 'kpis') {
            const kpis = window.kpiTemplates || [];
            if (filter === 'active') {
                results = kpis.filter(k => k.status === 'active');
                message = results.length > 0
                    ? `🎯 ${results.length} active KPI(s):\n${results.slice(0, 5).map(k => `• ${k.name} - Target: ${k.unit === 'RM' ? 'RM' : ''}${k.targetValue}${k.unit === '%' ? '%' : ''}`).join('\n')}`
                    : `No active KPIs`;
            } else {
                message = `Total: ${kpis.length} KPI template(s) 🎯`;
            }
            
        } else if (type === 'branches' || type === 'branch' || type === 'outlets') {
            const branches = window.branches || [];
            if (filter === 'active') {
                results = branches.filter(b => b.status === 'active');
                message = results.length > 0
                    ? `🏢 ${results.length} active branch(es):\n${results.slice(0, 5).map(b => `• ${b.name} (${b.code}) - ${b.type || 'outlet'}`).join('\n')}`
                    : `No active branches`;
            } else {
                message = `Total: ${branches.length} branch(es) 🏢`;
            }
            
        } else if (type === 'journal' || type === 'journals' || type === 'journal_entries') {
            const journals = window.journalEntries || [];
            if (filter === 'draft') {
                results = journals.filter(j => j.status === 'draft');
                message = results.length > 0
                    ? `📒 ${results.length} draft journal(s):\n${results.slice(0, 5).map(j => `• ${j.journalNumber}: ${j.description} - RM${j.totalDebit?.toLocaleString() || 0}`).join('\n')}`
                    : `No draft journals`;
            } else if (filter === 'posted') {
                results = journals.filter(j => j.status === 'posted');
                message = `${results.length} posted journal(s) ✅`;
            } else {
                const totalDebit = journals.reduce((sum, j) => sum + (j.totalDebit || 0), 0);
                message = `Total: ${journals.length} journal entries - RM${totalDebit.toLocaleString()} 📒`;
            }
            
        } else if (type === 'leave' || type === 'leaves' || type === 'cuti') {
            const leaves = window.leaveRequests || [];
            if (filter === 'pending') {
                results = leaves.filter(l => l.status === 'pending');
                message = results.length > 0
                    ? `📅 ${results.length} pending leave request(s):\n${results.slice(0, 5).map(l => `• ${l.employeeName}: ${l.leaveType} (${l.days} days)`).join('\n')}`
                    : `No pending leave requests`;
            } else if (filter === 'approved') {
                results = leaves.filter(l => l.status === 'approved');
                message = `${results.length} approved leave(s) ✅`;
            } else {
                message = `Total: ${leaves.length} leave request(s) 📅`;
            }
            
        } else if (type === 'sales' || type === 'pos') {
            const sales = window.sales || [];
            if (filter === 'today') {
                results = sales.filter(s => s.date?.startsWith(today) || s.createdAt?.startsWith(today));
                const totalSales = results.reduce((sum, s) => sum + (s.total || 0), 0);
                message = results.length > 0
                    ? `💰 Today's sales: ${results.length} transaction(s) - RM${totalSales.toLocaleString()}`
                    : `No sales today yet`;
            } else if (filter === 'this_month') {
                results = sales.filter(s => s.date?.startsWith(thisMonth) || s.createdAt?.startsWith(thisMonth));
                const totalSales = results.reduce((sum, s) => sum + (s.total || 0), 0);
                message = `This month: ${results.length} sales - RM${totalSales.toLocaleString()} 📊`;
            } else {
                const totalSales = sales.reduce((sum, s) => sum + (s.total || 0), 0);
                message = `Total: ${sales.length} sales - RM${totalSales.toLocaleString()} 💰`;
            }
            
        } else {
            message = `I can search: invoices, customers, products, suppliers, expenses, income, quotations, bills, bom, projects, delivery_orders, employees, kpi, branches, journals, leave, sales 🔍`;
        }
        
        return { isAction: true, message };
    } catch (e) {
        console.error('Error searching:', e);
        return { isAction: true, message: `Search error: ${e.message}` };
    }
}

// Execute: Update Status
function executeUpdateStatus(action) {
    try {
        const type = action.type?.toLowerCase() || '';
        const id = action.id || '';
        const newStatus = action.status?.toLowerCase() || '';
        
        if (!id) {
            return { isAction: true, message: "Need an ID! Try: 'mark invoice INV-123456 as paid'" };
        }
        
        if (type === 'invoice') {
            // Use window.invoices (same as invoices.js)
            const invoices = window.invoices || [];
            const invoice = invoices.find(i => 
                i.invoiceNumber === id || 
                i.id === id || 
                i.invoiceNumber?.includes(id) ||
                i.id?.includes(id)
            );
            
            if (invoice) {
                invoice.status = newStatus || 'paid';
                if (newStatus === 'paid') {
                    invoice.paidDate = new Date().toISOString().split('T')[0];
                }
                if (typeof saveInvoices === 'function') saveInvoices();
                if (typeof renderInvoices === 'function') renderInvoices();
                return { isAction: true, message: `Done! ✅ Invoice ${invoice.invoiceNumber || id} marked as ${invoice.status} 📄` };
            } else {
                return { isAction: true, message: `Couldn't find invoice "${id}". Check the invoice number?` };
            }
            
        } else if (type === 'quotation') {
            // Use window.quotations (same as quotations.js)
            const quotations = window.quotations || [];
            const quotation = quotations.find(q => 
                q.quotationNumber === id || 
                q.id === id ||
                q.quotationNumber?.includes(id)
            );
            
            if (quotation) {
                quotation.status = newStatus || 'accepted';
                if (typeof saveQuotations === 'function') saveQuotations();
                if (typeof renderQuotations === 'function') renderQuotations();
                return { isAction: true, message: `Done! ✅ Quotation ${quotation.quotationNumber || id} marked as ${quotation.status} 📋` };
            } else {
                return { isAction: true, message: `Couldn't find quotation "${id}"` };
            }
            
        } else if (type === 'order') {
            // Use window.purchaseOrders (same as purchase-orders.js)
            const orders = window.purchaseOrders || [];
            const order = orders.find(o => 
                o.poNumber === id || 
                o.orderNumber === id || 
                o.id === id ||
                o.poNumber?.includes(id) ||
                o.orderNumber?.includes(id)
            );
            
            if (order) {
                order.status = newStatus || 'completed';
                if (typeof savePurchaseOrders === 'function') savePurchaseOrders();
                if (typeof renderPurchaseOrders === 'function') renderPurchaseOrders();
                return { isAction: true, message: `Done! ✅ Order ${order.poNumber || order.orderNumber || id} marked as ${order.status} 📝` };
            } else {
                return { isAction: true, message: `Couldn't find order "${id}"` };
            }
            
        } else if (type === 'bill') {
            const bills = window.businessData.bills || [];
            const name = action.name || id;
            const bill = bills.find(b => 
                b.name?.toLowerCase().includes(name.toLowerCase()) ||
                b.id === name
            );
            
            if (bill) {
                bill.status = newStatus || 'paid';
                if (newStatus === 'paid') {
                    bill.paidDate = new Date().toISOString().split('T')[0];
                }
                saveData();
                if (typeof renderBills === 'function') renderBills();
                return { isAction: true, message: `Done! ✅ Bill "${bill.name}" marked as ${bill.status} 💰` };
            } else {
                return { isAction: true, message: `Couldn't find bill "${name}". Try: 'show unpaid bills' first` };
            }
        }
        
        return { isAction: true, message: `Can update: invoice, quotation, order, bill status` };
    } catch (e) {
        console.error('Error updating status:', e);
        return { isAction: true, message: `Update error: ${e.message}` };
    }
}

// Execute: Delete
async function executeDelete(action) {
    try {
        const type = action.type?.toLowerCase() || '';
        const which = action.which?.toLowerCase() || '';
        const id = action.id || '';
        
        // Get data safely
        const data = window.businessData || {};
        
        if (type === 'expense') {
            const transactions = data.transactions || [];
            const expenses = transactions.filter(t => t.type === 'expense');
            
            if (expenses.length === 0) {
                return { isAction: true, message: "No expenses to delete 📝" };
            }
            
            if (which === 'last') {
                // Find the most recent expense
                const sorted = [...expenses].sort((a, b) => new Date(b.createdAt || b.date) - new Date(a.createdAt || a.date));
                const lastExpense = sorted[0];
                const index = transactions.findIndex(t => t.id === lastExpense.id);
                
                if (index > -1) {
                    const deleted = transactions.splice(index, 1)[0];
                    saveData();
                    if (typeof renderTransactions === 'function') renderTransactions();
                    return { isAction: true, message: `Done! 🗑️ Deleted expense: RM${deleted.amount?.toFixed(2)} - ${deleted.description}` };
                }
            } else if (id) {
                const index = transactions.findIndex(t => t.id === id && t.type === 'expense');
                if (index > -1) {
                    const deleted = transactions.splice(index, 1)[0];
                    saveData();
                    if (typeof renderTransactions === 'function') renderTransactions();
                    return { isAction: true, message: `Done! 🗑️ Deleted expense: ${deleted.description}` };
                }
            }
            return { isAction: true, message: `No expense found to delete` };
            
        } else if (type === 'income') {
            const transactions = data.transactions || [];
            const incomes = transactions.filter(t => t.type === 'income');
            
            if (incomes.length === 0) {
                return { isAction: true, message: "No income to delete 📝" };
            }
            
            if (which === 'last') {
                const sorted = [...incomes].sort((a, b) => new Date(b.createdAt || b.date) - new Date(a.createdAt || a.date));
                const lastIncome = sorted[0];
                const index = transactions.findIndex(t => t.id === lastIncome.id);
                
                if (index > -1) {
                    const deleted = transactions.splice(index, 1)[0];
                    saveData();
                    if (typeof renderTransactions === 'function') renderTransactions();
                    return { isAction: true, message: `Done! 🗑️ Deleted income: RM${deleted.amount?.toFixed(2)} - ${deleted.description}` };
                }
            }
            return { isAction: true, message: `No income found to delete` };
            
        } else if (type === 'invoice') {
            // Use window.invoices (same as invoices.js)
            const invoiceList = window.invoices || [];
            const index = invoiceList.findIndex(i => i.invoiceNumber === id || i.id === id || i.invoiceNumber?.includes(id));
            
            if (index > -1) {
                const deleted = invoiceList.splice(index, 1)[0];
                if (typeof saveInvoices === 'function') {
                    saveInvoices();
                } else {
                    localStorage.setItem('ezcubic_invoices', JSON.stringify(window.invoices));
                    const user = window.currentUser;
                    if (user && user.tenantId) {
                        const tenantKey = 'ezcubic_tenant_' + user.tenantId;
                        let tenantData = JSON.parse(localStorage.getItem(tenantKey) || '{}');
                        tenantData.invoices = window.invoices;
                        tenantData.updatedAt = new Date().toISOString();
                        localStorage.setItem(tenantKey, JSON.stringify(tenantData));
                    }
                }
                if (typeof renderInvoices === 'function') renderInvoices();
                return { isAction: true, message: `Done! 🗑️ Deleted invoice: ${deleted.invoiceNumber}` };
            }
            return { isAction: true, message: `Couldn't find invoice "${id}"` };
            
        } else if (type === 'customer') {
            // Use window.crmCustomers (same as crm.js)
            const customers = window.crmCustomers || [];
            const index = customers.findIndex(c => c.name?.toLowerCase().includes(id.toLowerCase()) || c.id === id);
            
            if (index > -1) {
                const deleted = customers.splice(index, 1)[0];
                if (typeof saveCRMCustomers === 'function') {
                    saveCRMCustomers();
                } else {
                    localStorage.setItem('ezcubic_crm_customers', JSON.stringify(window.crmCustomers));
                    const user = window.currentUser;
                    if (user && user.tenantId) {
                        const tenantKey = 'ezcubic_tenant_' + user.tenantId;
                        let tenantData = JSON.parse(localStorage.getItem(tenantKey) || '{}');
                        tenantData.crmCustomers = window.crmCustomers;
                        tenantData.updatedAt = new Date().toISOString();
                        localStorage.setItem(tenantKey, JSON.stringify(tenantData));
                    }
                }
                if (typeof renderCRMCustomers === 'function') renderCRMCustomers();
                return { isAction: true, message: `Done! 🗑️ Deleted customer: ${deleted.name}` };
            }
            return { isAction: true, message: `Couldn't find customer "${id}"` };
            
        } else if (type === 'product') {
            // Use window.products (same as inventory.js)
            const productsList = window.products || [];
            const index = productsList.findIndex(p => p.name?.toLowerCase().includes(id.toLowerCase()) || p.id === id);
            
            if (index > -1) {
                const deleted = productsList.splice(index, 1)[0];
                // Use proper save function if available - use sync version to avoid double cloud sync
                if (typeof saveProductsSync === 'function') {
                    saveProductsSync();
                } else if (typeof saveProducts === 'function') {
                    saveProducts();
                } else {
                    localStorage.setItem('ezcubic_products', JSON.stringify(window.products));
                    // Save timestamp with margin to ensure local wins
                    localStorage.setItem('ezcubic_last_save_timestamp', (Date.now() + 5000).toString());
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
                
                // CRITICAL: Await cloud sync for deletions
                if (typeof window.fullCloudSync === 'function') {
                    try {
                        await window.fullCloudSync();
                        return { isAction: true, message: `Done! 🗑️ Deleted & synced: ${deleted.name}` };
                    } catch (e) {
                        console.warn('Cloud sync failed:', e);
                        return { isAction: true, message: `Done! 🗑️ Deleted product: ${deleted.name} (sync pending)` };
                    }
                }
                return { isAction: true, message: `Done! 🗑️ Deleted product: ${deleted.name}` };
            }
            return { isAction: true, message: `Couldn't find product "${id}"` };
        }
        
        return { isAction: true, message: `I can delete: expense, income, invoice, customer, product` };
    } catch (e) {
        console.error('Error deleting:', e);
        return { isAction: true, message: `Delete error: ${e.message}` };
    }
}

// Smart Quick Actions - show context-aware buttons based on AI response
function showSmartActions(responseText) {
    const lowerResponse = responseText.toLowerCase();
    const actionsContainer = document.querySelector('.chatbot-quick-actions');
    if (!actionsContainer) return;
    
    const actions = [];
    
    // Detect keywords and suggest relevant actions
    if (lowerResponse.includes('stock') || lowerResponse.includes('inventory') || lowerResponse.includes('product')) {
        actions.push({ label: '📦 View Inventory', action: "showSection('inventory')" });
    }
    if (lowerResponse.includes('profit') || lowerResponse.includes('revenue') || lowerResponse.includes('expense') || lowerResponse.includes('rm')) {
        actions.push({ label: '📊 View Dashboard', action: "showSection('dashboard')" });
    }
    if (lowerResponse.includes('customer') || lowerResponse.includes('crm') || lowerResponse.includes('client')) {
        actions.push({ label: '👥 View Customers', action: "showSection('crm')" });
    }
    if (lowerResponse.includes('invoice') || lowerResponse.includes('bill') || lowerResponse.includes('payment')) {
        actions.push({ label: '📄 View Invoices', action: "showSection('invoices')" });
    }
    if (lowerResponse.includes('sale') || lowerResponse.includes('pos') || lowerResponse.includes('order')) {
        actions.push({ label: '🛒 Go to POS', action: "showSection('pos')" });
    }
    if (lowerResponse.includes('tax') || lowerResponse.includes('sst') || lowerResponse.includes('lhdn')) {
        actions.push({ label: '💰 Tax Calculator', action: "showSection('taxes')" });
    }
    if (lowerResponse.includes('report') || lowerResponse.includes('statement')) {
        actions.push({ label: '📈 View Reports', action: "showSection('reports')" });
    }
    
    // Limit to 3 actions max
    const limitedActions = actions.slice(0, 3);
    
    // If we found relevant actions, show them; otherwise show defaults
    if (limitedActions.length > 0) {
        actionsContainer.innerHTML = limitedActions.map(a => 
            `<button onclick="${a.action}; toggleChatbot();">${a.label}</button>`
        ).join('');
    } else {
        // Default actions
        actionsContainer.innerHTML = `
            <button onclick="askQuickQuestion('What is my profit this month?')">📊 My Profit</button>
            <button onclick="askQuickQuestion('Who are my top customers?')">👥 Top Customers</button>
            <button onclick="askQuickQuestion('Any low stock items?')">📦 Low Stock</button>
        `;
    }
}

// ==================== SMART HYBRID AI SYSTEM ====================
// Flow: User → Local Check → If complex → DeepSeek understands → Local data → DeepSeek responds
// Privacy: Business data stays local, only questions go to AI

async function getAIResponse(message) {
    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    const isNetlify = window.location.hostname.includes('netlify.app') || window.location.hostname.includes('netlify.com');
    
    // PRE-STEP: Apply learned typo fixes and custom terms
    let processedMessage = applyLearnedTypoFixes(message);
    processedMessage = applyCustomTerms(processedMessage);
    
    if (processedMessage !== message) {
        console.log('🧠 Message processed with AI memory:', processedMessage);
    }
    
    // PRE-STEP: Check if user is teaching AI (corrections)
    const correctionResponse = processCorrection(message);
    if (correctionResponse) {
        return { success: true, message: correctionResponse, source: 'learning' };
    }
    
    // PRE-STEP: Check if user wants to see AI memory
    const lowerMsg = message.toLowerCase();
    if (lowerMsg.includes('what have you learned') || lowerMsg.includes('show memory') || 
        lowerMsg.includes('ai memory') || lowerMsg.includes('what did you learn')) {
        return { success: true, message: showAIMemory(), source: 'memory' };
    }
    
    // PRE-STEP: Check if user wants to clear AI memory
    if (lowerMsg.includes('forget everything') || lowerMsg.includes('clear memory') || 
        lowerMsg.includes('reset learning') || lowerMsg.includes('clear ai memory')) {
        clearAIMemory();
        return { success: true, message: "🧠 I've cleared my memory. Starting fresh!", source: 'memory' };
    }
    
    // PRE-STEP: Check if user wants predictive insights
    if (lowerMsg.includes('predict') || lowerMsg.includes('forecast') || lowerMsg.includes('insights') ||
        lowerMsg.includes('business health') || lowerMsg.includes('how is my business') ||
        lowerMsg.includes('how\'s my business') || lowerMsg.includes('business doing') ||
        lowerMsg.includes('analyze my') || lowerMsg.includes('analyse my') ||
        lowerMsg.includes('stock alert') || lowerMsg.includes('what should i') ||
        lowerMsg.includes('recommendations') || lowerMsg.includes('advice')) {
        return { success: true, message: formatPredictiveInsights(), source: 'predictions' };
    }
    
    // STEP 0: Always try local fallback first (free, instant, private)
    const localResponse = tryLocalFirst(processedMessage);
    if (localResponse) {
        console.log('✅ Handled by local AI');
        return { success: true, message: localResponse, source: 'local' };
    }
    
    // If localhost, use local fallback only
    if (isLocalhost && !isNetlify) {
        console.log('🏠 Localhost - using full local fallback');
        return { success: false, error: 'localhost', useSmartFallback: true };
    }
    
    // STEP 1: DeepSeek understands intent (NO business data sent)
    try {
        console.log('🧠 Step 1: DeepSeek understanding intent...');
        const intentResponse = await callSmartAI('understand', message, null);
        
        if (!intentResponse.success) {
            console.log('Intent understanding failed, using fallback');
            return { success: false, useSmartFallback: true };
        }
        
        // Parse the intent JSON
        let intent;
        try {
            intent = JSON.parse(intentResponse.result);
        } catch (e) {
            // If not valid JSON, treat as general chat response
            console.log('Intent not JSON, treating as chat');
            intent = { intent: 'general' };
        }
        
        console.log('🎯 Intent detected:', intent);
        
        // STEP 2: Handle based on intent
        switch (intent.intent) {
            case 'action':
                // Execute locally based on DeepSeek's understanding
                return handleActionIntent(intent);
                
            case 'query':
                // Get local data, then DeepSeek formats response
                return await handleQueryIntent(message, intent);
                
            case 'analysis':
                // Get local data, DeepSeek provides analysis
                return await handleAnalysisIntent(message, intent);
                
            case 'navigate':
                // Handle navigation locally
                return handleNavigateIntent(intent);
                
            case 'greeting':
                // Simple local response
                return handleGreetingIntent();
                
            case 'general':
            default:
                // General question - DeepSeek answers (no business data)
                return await handleGeneralIntent(message);
        }
        
    } catch (error) {
        console.error('Smart AI error:', error);
        return { success: false, error: error.message, useSmartFallback: true };
    }
}

// Try local handling first for common patterns
function tryLocalFirst(message) {
    const lower = message.toLowerCase().trim();
    
    // Quick patterns that local can definitely handle
    const quickPatterns = [
        // Greetings
        { pattern: /^(hi|hello|hey|hai|helo)[\s!?.]*$/i, handler: () => null }, // Let smart handle
        // Navigation  
        { pattern: /^(go to|open|show)\s+(dashboard|inventory|pos|crm|settings)/i, handler: null },
        // Simple expense/income with amount
        { pattern: /(breakfast|lunch|dinner|petrol|parking|toll)\s*(rm)?\s*\d+/i, handler: null },
        { pattern: /rm\s*\d+.*(breakfast|lunch|dinner|petrol|parking|toll)/i, handler: null },
    ];
    
    // If matches quick pattern, let the full fallback handle it
    for (const { pattern } of quickPatterns) {
        if (pattern.test(lower)) {
            return null; // Let processUserMessage use generateChatbotFallback
        }
    }
    
    return null; // Let smart AI handle
}

// Handle action intent from DeepSeek
function handleActionIntent(intent) {
    if (!intent.action || !intent.entities) {
        return { success: false, useSmartFallback: true };
    }
    
    // Build action object and queue it
    const action = {
        action: intent.action,
        ...intent.entities
    };
    
    const description = buildActionDescription(action);
    queueAIAction(action, description);
    
    return {
        success: true,
        message: `✅ "${description}" queued! Check Pending.`,
        source: 'smart-action'
    };
}

// Handle query intent - get local data, DeepSeek formats
async function handleQueryIntent(message, intent) {
    // Get only the data DeepSeek requested
    const localData = getRequestedData(intent.dataNeeded || []);
    
    // DeepSeek formats the response with local data
    const response = await callSmartAI('respond', message, localData);
    
    if (response.success) {
        return { success: true, message: response.message, source: 'smart-query' };
    }
    
    // Fallback: format locally
    return { success: false, useSmartFallback: true };
}

// Handle analysis intent - get comprehensive local data, DeepSeek analyzes
async function handleAnalysisIntent(message, intent) {
    // Get analysis data (sanitized summary)
    const localData = getAnalysisData();
    
    // DeepSeek provides analysis
    const response = await callSmartAI('respond', message, localData);
    
    if (response.success) {
        return { success: true, message: response.message, source: 'smart-analysis' };
    }
    
    return { success: false, useSmartFallback: true };
}

// Handle navigate intent locally
function handleNavigateIntent(intent) {
    const section = intent.section || 'dashboard';
    if (typeof showSection === 'function') {
        showSection(section);
    }
    return {
        success: true,
        message: `📍 Opening ${section}...`,
        source: 'local-navigate'
    };
}

// Handle greeting locally
function handleGreetingIntent() {
    const hour = new Date().getHours();
    const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
    return {
        success: true,
        message: `${greeting}! 👋 I'm your AI Business Partner. How can I help you today?`,
        source: 'local-greeting'
    };
}

// Handle general questions (no business data sent)
async function handleGeneralIntent(message) {
    const response = await callSmartAI('chat', message, null);
    
    if (response.success) {
        return { success: true, message: response.message, source: 'smart-chat' };
    }
    
    return { success: false, useSmartFallback: true };
}

// Get only requested data (minimal exposure)
function getRequestedData(dataNeeded) {
    const data = {};
    const context = getBusinessContext();
    
    for (const key of dataNeeded) {
        switch (key) {
            case 'monthly_income':
                data.monthlyIncome = context.monthlyIncome;
                break;
            case 'monthly_expenses':
                data.monthlyExpenses = context.monthlyExpenses;
                break;
            case 'monthly_profit':
                data.monthlyProfit = context.monthlyProfit;
                break;
            case 'products':
                data.productCount = context.totalProducts;
                data.lowStockCount = context.lowStockCount;
                break;
            case 'customers':
                data.customerCount = context.totalCustomers;
                break;
            case 'top_customers':
                data.topCustomers = context.topCustomers?.map(c => ({ name: c.name, total: c.total })) || [];
                break;
            case 'pending_orders':
                data.pendingOrderCount = context.pendingOrderCount;
                break;
            case 'overdue_invoices':
                data.overdueInvoiceCount = context.overdueInvoiceCount;
                break;
            case 'branches':
                data.branchCount = context.branches?.length || 0;
                break;
        }
    }
    
    return data;
}

// Get analysis data (sanitized summary for business analysis)
function getAnalysisData() {
    const context = getBusinessContext();
    return {
        // Financial summary (numbers only, no transaction details)
        revenue: context.monthlyIncome,
        expenses: context.monthlyExpenses,
        profit: context.monthlyProfit,
        profitMargin: context.monthlyIncome > 0 ? 
            ((context.monthlyProfit / context.monthlyIncome) * 100).toFixed(1) : 0,
        
        // Business metrics (counts only)
        totalProducts: context.totalProducts,
        lowStockItems: context.lowStockCount,
        totalCustomers: context.totalCustomers,
        pendingOrders: context.pendingOrderCount,
        overdueInvoices: context.overdueInvoiceCount,
        activeBranches: context.branches?.length || 1,
        
        // Period
        period: context.currentMonth,
        currency: context.currency
    };
}

// Call Smart AI endpoint
async function callSmartAI(step, message, localData) {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 20000);
        
        const response = await fetch('/.netlify/functions/ai-smart', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                step,
                message,
                localData,
                conversationHistory: conversationHistory.slice(-6)
            }),
            signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
            throw new Error(`AI error: ${response.status}`);
        }
        
        return await response.json();
    } catch (error) {
        console.error('Smart AI call failed:', error);
        return { success: false, error: error.message };
    }
}

// Legacy function for backwards compatibility
async function getAIResponseLegacy(message) {
    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    const isNetlify = window.location.hostname.includes('netlify.app') || window.location.hostname.includes('netlify.com');
    
    if (isLocalhost && !isNetlify) {
        return { success: false, error: 'localhost', useSmartFallback: true };
    }
    
    try {
        const businessContext = getBusinessContext();
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000);
        
        const response = await fetch('/.netlify/functions/ai-chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                messages: conversationHistory,
                businessContext
            }),
            signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) throw new Error(`AI service error: ${response.status}`);
        
        const data = await response.json();
        if (data.fallback || data.error) return { success: false, error: data.error };
        
        return { success: true, message: String(data.message || 'No response') };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

// ==================== AI RESPONSE GENERATION (FALLBACK) ====================
// Used when DeepSeek API is not available
// Named generateChatbotFallback to avoid conflict with ai-assistant.js
// ==================== AI RESPONSE GENERATION (FALLBACK) ====================
// COMPREHENSIVE AI BUSINESS PARTNER - Covers ALL modules
// Used when DeepSeek API is not available
function generateChatbotFallback(message) {
    const lowerMessage = message.toLowerCase().trim();
    const context = getSimpleContext();
    const products = window.products || [];
    const customers = window.crmCustomers || [];
    const suppliers = window.suppliers || [];
    const invoices = window.invoices || [];
    const quotations = window.quotations || [];
    const orders = window.orders || [];
    const bills = window.businessData?.bills || [];
    const branches = window.branches || [];
    const employees = window.employees || [];
    const projects = window.projects || [];
    
    // Helper: Extract amount from message
    const extractAmount = (msg) => {
        const match = msg.match(/rm?\s*(\d+(?:[.,]\d+)?)|(\d+(?:[.,]\d+)?)\s*(?:rm|ringgit)?|\b(\d+(?:\.\d+)?)\b/i);
        if (match) {
            const val = parseFloat((match[1] || match[2] || match[3] || '0').replace(',', ''));
            return val > 0 ? val : null;
        }
        return null;
    };
    
    // Helper: Extract quantity from message
    const extractQty = (msg) => {
        const match = msg.match(/(\d+)\s*(units?|pcs?|pieces?|bottles?|items?|qty|quantity)?/i);
        return match ? parseInt(match[1]) : null;
    };
    
    // Helper: Find product by name
    const findProduct = (msg) => {
        for (const p of products) {
            if (msg.includes(p.name.toLowerCase())) return p;
        }
        return null;
    };
    
    // Helper: Find customer by name
    const findCustomer = (msg) => {
        for (const c of customers) {
            if (msg.includes(c.name.toLowerCase())) return c;
        }
        return null;
    };
    
    // Helper: Find branch by name
    const findBranch = (msg) => {
        for (const b of branches) {
            if (msg.includes(b.name.toLowerCase()) || (b.code && msg.includes(b.code.toLowerCase()))) return b;
        }
        return null;
    };
    
    // Helper: Find supplier by name
    const findSupplier = (msg) => {
        const suppliers = window.suppliers || [];
        for (const s of suppliers) {
            if (s.name && msg.includes(s.name.toLowerCase())) return s;
        }
        return null;
    };
    
    // Helper: Find employee by name
    const findEmployee = (msg) => {
        const employees = window.employees || [];
        for (const e of employees) {
            if (e.name && msg.includes(e.name.toLowerCase())) return e;
        }
        return null;
    };

    // ==================== GREETINGS ====================
    if (/^(hi|hello|hey|helo|hai|good\s*(morning|afternoon|evening|day)|howdy|yo|sup|apa khabar|selamat)[\s!?.]*$/i.test(lowerMessage)) {
        const hour = new Date().getHours();
        const timeGreet = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
        return `${timeGreet}! 👋 I'm your AI Business Partner.\n\nI can help you:\n• 📊 View reports & analytics\n• 📦 Manage inventory & stock\n• �� Record expenses & income\n• 📄 Create invoices & quotations\n• 👥 Manage customers & suppliers\n• 🧭 Navigate anywhere\n\nJust talk naturally! What do you need?`;
    }
    
    if (lowerMessage.includes('how are you') || lowerMessage.includes('how r u')) {
        return `I'm great, ready to help! 😊 What can I do for you today?`;
    }
    
    if (lowerMessage.includes('thank') || lowerMessage.includes('tq') || lowerMessage.includes('terima kasih')) {
        return `You're welcome! 😊 Let me know if you need anything else.`;
    }

    // ==================== HELP ====================
    if (lowerMessage === 'help' || lowerMessage === '?' || lowerMessage.includes('what can you do')) {
        return `🤖 I can help with:\n• Expenses: "petrol RM50"\n• Stock: "sold 5 Wine"\n• Quotes/Invoices: "quote for John RM500"\n• Info: "profit?" "low stock?"\n• Navigate: "open POS"\n\nJust talk naturally! 💬`;
    }

    // ==================== SMART GUIDANCE SYSTEM ====================
    // Detect vague intents and guide users to correct format
    
    // QUOTATION - vague intent detection
    if ((lowerMessage.includes('quotation') || lowerMessage.includes('quote') || lowerMessage.includes('sebut harga')) && 
        !lowerMessage.includes('create') && !lowerMessage.includes('make') && !lowerMessage.includes('new') && !lowerMessage.includes('buat')) {
        // User mentioned quotation but no action word
        if (typeof showSection === 'function') showSection('quotations');
        return `📝 **Quotation Help**\n\nTo create a quotation, tell me:\n• Customer name\n• Amount (optional)\n\n**Example:** "create quotation for John RM500"\n\nI've opened Quotations for you - you can also create one manually there! 👆`;
    }
    
    // QUOTATION - has action word but missing info
    if ((lowerMessage.includes('create') || lowerMessage.includes('make') || lowerMessage.includes('want') || lowerMessage.includes('need') || lowerMessage.includes('help')) && 
        (lowerMessage.includes('quotation') || lowerMessage.includes('quote')) && 
        !findCustomer(lowerMessage) && !amount) {
        return `📝 **Creating Quotation**\n\nI need a bit more info:\n• **Customer name** (required)\n• **Amount** (optional)\n\n**Examples:**\n• "create quotation for Ahmad RM1500"\n• "quotation for Siti Bakery RM800"\n• "new quote Ahmad"\n\nOr say **"open quotations"** to create manually.`;
    }
    
    // INVOICE - vague intent detection
    if ((lowerMessage.includes('invoice') || lowerMessage.includes('invois') || lowerMessage.includes('bil')) && 
        !lowerMessage.includes('create') && !lowerMessage.includes('make') && !lowerMessage.includes('new') && !lowerMessage.includes('buat') &&
        !lowerMessage.includes('overdue') && !lowerMessage.includes('unpaid') && !lowerMessage.includes('show') && !lowerMessage.includes('list')) {
        if (typeof showSection === 'function') showSection('invoices');
        return `📄 **Invoice Help**\n\nTo create an invoice, tell me:\n• Customer name\n• Amount\n\n**Example:** "create invoice for Ali RM1000"\n\nI've opened Invoices for you - you can also create one manually! 👆`;
    }
    
    // INVOICE - has action word but missing info
    if ((lowerMessage.includes('create') || lowerMessage.includes('make') || lowerMessage.includes('want') || lowerMessage.includes('need') || lowerMessage.includes('help')) && 
        (lowerMessage.includes('invoice') || lowerMessage.includes('invois')) && 
        !findCustomer(lowerMessage) && !amount) {
        return `📄 **Creating Invoice**\n\nI need a bit more info:\n• **Customer name** (required)\n• **Amount** (required)\n\n**Examples:**\n• "create invoice for Ahmad RM2000"\n• "invoice Ali RM500"\n• "new invoice for Siti Corp RM1500"\n\nOr say **"open invoices"** to create manually.`;
    }
    
    // STOCK - vague intent detection
    if ((lowerMessage.includes('stock') || lowerMessage.includes('stok') || lowerMessage.includes('inventory')) && 
        !lowerMessage.includes('in') && !lowerMessage.includes('out') && !lowerMessage.includes('transfer') &&
        !lowerMessage.includes('low') && !lowerMessage.includes('check') && !lowerMessage.includes('show') && 
        !lowerMessage.includes('level') && !lowerMessage.includes('what')) {
        return `📦 Stock?\n• "stock in 10 Beer" or "sold 5 Wine"\n• "low stock?" or "show stock"\n• "open inventory"`;
    }
    
    // STOCK IN - has intent but missing info
    if ((lowerMessage.includes('stock in') || lowerMessage.includes('add stock') || lowerMessage.includes('restock')) && 
        !findProduct(lowerMessage) && !extractQty(lowerMessage)) {
        return `📥 Stock in what? Example: "stock in 10 Beer"`;
    }
    
    // STOCK OUT - has intent but missing info
    if ((lowerMessage.includes('stock out') || lowerMessage.includes('remove stock') || lowerMessage.includes('deduct')) && 
        !findProduct(lowerMessage) && !extractQty(lowerMessage)) {
        return `📤 Stock out what? Example: "sold 5 Wine"`;
    }
    
    // CUSTOMER - vague intent detection
    if ((lowerMessage.includes('customer') || lowerMessage.includes('pelanggan') || lowerMessage.includes('client')) && 
        !lowerMessage.includes('add') && !lowerMessage.includes('create') && !lowerMessage.includes('new') && !lowerMessage.includes('tambah') &&
        !lowerMessage.includes('find') && !lowerMessage.includes('search') && !lowerMessage.includes('show') && 
        !lowerMessage.includes('top') && !lowerMessage.includes('how many') && !lowerMessage.includes('list')) {
        return `👥 Customer?\n• "add customer John 0123456789"\n• "show customers" or "top customers"\n• "open customers"`;
    }
    
    // CUSTOMER - has action but missing info
    if ((lowerMessage.includes('add') || lowerMessage.includes('create') || lowerMessage.includes('new')) && 
        (lowerMessage.includes('customer') || lowerMessage.includes('client')) && 
        !lowerMessage.match(/customer\s+[a-zA-Z]/i)) {
        return `👤 Add who? Example: "add customer Ahmad 0123456789"`;
    }
    
    // PRODUCT - vague intent detection
    if ((lowerMessage.includes('product') || lowerMessage.includes('produk') || lowerMessage.includes('item')) && 
        !lowerMessage.includes('add') && !lowerMessage.includes('create') && !lowerMessage.includes('new') &&
        !lowerMessage.includes('show') && !lowerMessage.includes('list') && !lowerMessage.includes('what') &&
        !lowerMessage.includes('find') && !lowerMessage.includes('search')) {
        return `📦 Product?\n• "add product Laptop RM2500"\n• "show products" or "low stock?"\n• "open inventory"`;
    }
    
    // EXPENSE - vague intent detection  
    if ((lowerMessage.includes('expense') || lowerMessage.includes('perbelanjaan') || lowerMessage.includes('belanja')) && 
        !lowerMessage.includes('add') && !lowerMessage.includes('record') && !amount &&
        !lowerMessage.includes('show') && !lowerMessage.includes('total') && !lowerMessage.includes('how much')) {
        return `💸 Expense?\n• "petrol RM50" or "lunch RM15"\n• "show expenses"\n• "open transactions"`;
    }
    
    // SUPPLIER - vague intent detection
    if ((lowerMessage.includes('supplier') || lowerMessage.includes('pembekal') || lowerMessage.includes('vendor')) && 
        !lowerMessage.includes('add') && !lowerMessage.includes('create') && !lowerMessage.includes('new') &&
        !lowerMessage.includes('find') && !lowerMessage.includes('show') && !lowerMessage.includes('list') &&
        !lowerMessage.includes('pay') && !lowerMessage.includes('paid')) {
        return `🚚 Supplier?\n• "add supplier ABC Trading"\n• "show suppliers"\n• "open suppliers"`;
    }
    
    // BILL - vague intent detection
    if ((lowerMessage.includes('bill') && !lowerMessage.includes('bills')) && 
        !lowerMessage.includes('add') && !lowerMessage.includes('create') && !lowerMessage.includes('new') && !lowerMessage.includes('pay') &&
        !amount) {
        return `📃 Bill?\n• "add bill RM500 from TNB"\n• "unpaid bills" or "paid TNB"\n• "open bills"`;
    }
    
    // ORDER - vague intent detection
    if ((lowerMessage.includes('order') && !lowerMessage.includes('orders')) && 
        !lowerMessage.includes('create') && !lowerMessage.includes('make') && !lowerMessage.includes('new') &&
        !lowerMessage.includes('pending') && !lowerMessage.includes('show') && !lowerMessage.includes('list')) {
        return `📋 Order?\n• "create order for Ahmad RM500"\n• "pending orders" or "show orders"\n• "open orders"`;
    }
    
    // PROJECT - vague intent detection
    if ((lowerMessage.includes('project') || lowerMessage.includes('projek')) && 
        !lowerMessage.includes('create') && !lowerMessage.includes('make') && !lowerMessage.includes('new') &&
        !lowerMessage.includes('show') && !lowerMessage.includes('list') && !lowerMessage.includes('active')) {
        return `📁 Project?\n• "create project Website RM5000"\n• "active projects" or "show projects"\n• "open projects"`;
    }
    
    // EMPLOYEE / STAFF - vague intent detection
    if ((lowerMessage.includes('employee') || lowerMessage.includes('staff') || lowerMessage.includes('pekerja') || lowerMessage.includes('kakitangan')) && 
        !lowerMessage.includes('add') && !lowerMessage.includes('hire') && !lowerMessage.includes('new') &&
        !lowerMessage.includes('show') && !lowerMessage.includes('list')) {
        return `👷 Employee?\n• "add employee Ahmad salary RM3000"\n• "show employees"\n• "open payroll"`;
    }
    
    // BRANCH / OUTLET - vague intent detection (includes common typos)
    if ((lowerMessage.includes('branch') || lowerMessage.includes('branches') || lowerMessage.includes('brunches') || 
         lowerMessage.includes('brunch') || lowerMessage.includes('outlet') || lowerMessage.includes('outlets') ||
         lowerMessage.includes('cawangan') || lowerMessage.includes('kedai') || lowerMessage.includes('store') ||
         lowerMessage.includes('location') || lowerMessage.includes('lokasi')) && 
        !lowerMessage.includes('add') && !lowerMessage.includes('create') && !lowerMessage.includes('new') &&
        !lowerMessage.includes('show') && !lowerMessage.includes('list') && !lowerMessage.includes('stock') && !lowerMessage.includes('transfer')) {
        return `🏢 Branch?\n• "add branch Penang"\n• "transfer 10 Beer to Penang"\n• "show branches"\n• "open branches"`;
    }
    
    // GENERAL "I WANT" / "CAN YOU" / "HELP ME" detection
    if ((lowerMessage.startsWith('i want') || lowerMessage.startsWith('can you') || lowerMessage.startsWith('help me') || 
         lowerMessage.startsWith('i need') || lowerMessage.startsWith('please') || lowerMessage.startsWith('tolong') ||
         lowerMessage.startsWith('boleh') || lowerMessage.startsWith('saya nak')) && 
        !extractAmount(lowerMessage) && !findProduct(lowerMessage) && !findCustomer(lowerMessage)) {
        return `🤖 What do you need?\n• "petrol RM50" or "lunch RM15"\n• "sold 5 Beer" or "stock in 10 Wine"\n• "create invoice for Ali RM1000"\n• "open POS" or "go to inventory"`;
    }

    // ==================== NATURAL EXPENSE DETECTION ====================
    const expenseWords = ['breakfast', 'lunch', 'dinner', 'makan', 'food', 'meal', 'parking', 'petrol', 'petro', 
        'fuel', 'gas', 'minyak', 'toll', 'tol', 'grab', 'taxi', 'uber', 'transport', 'electricity', 'electric', 
        'water', 'air', 'bill', 'rent', 'sewa', 'salary', 'wages', 'gaji', 'office', 'supplies', 'repair', 
        'maintenance', 'internet', 'wifi', 'phone', 'mobile', 'subscription', 'insurance', 'delivery', 'shipping', 
        'postage', 'cleaning', 'laundry', 'coffee', 'kopi', 'tea', 'teh', 'snack', 'groceries', 'stationery', 
        'printing', 'marketing', 'advertising', 'nasi', 'mee', 'roti', 'ayam', 'ikan', 'kari'];
    
    const expenseWord = expenseWords.find(w => lowerMessage.includes(w));
    const amount = extractAmount(lowerMessage);
    
    if (expenseWord && amount) {
        // First check if we've learned a specific category for this word
        let category = getLearnedCategory(expenseWord);
        
        if (!category) {
            // No learned category, use default mapping
            category = expenseWord.charAt(0).toUpperCase() + expenseWord.slice(1);
            // Normalize Malay words
            const normalize = { petro: 'Petrol', minyak: 'Petrol', tol: 'Toll', makan: 'Food', sewa: 'Rent', 
                gaji: 'Salary', kopi: 'Coffee', teh: 'Tea', nasi: 'Meals', mee: 'Meals', roti: 'Meals', 
                ayam: 'Meals', ikan: 'Meals', kari: 'Meals', air: 'Water' };
            if (normalize[expenseWord]) category = normalize[expenseWord];
        } else {
            console.log(`🧠 Using learned category: "${expenseWord}" → "${category}"`);
        }
        
        queueAIAction({ action: 'add_expense', amount, description: category, category }, `Add Expense: RM${amount} - ${category}`);
        return `✅ RM${amount} ${category} queued! Check Pending.`;
    }

    // ==================== INCOME DETECTION ====================
    if ((lowerMessage.includes('received') || lowerMessage.includes('got') || lowerMessage.includes('collected') || 
         lowerMessage.includes('payment from') || lowerMessage.includes('terima')) && amount) {
        const descMatch = lowerMessage.match(/(?:from|by|dari)\s+([a-zA-Z\s]+?)(?:\s+(?:rm|\d)|$)/i);
        const desc = descMatch ? descMatch[1].trim() : 'Payment Received';
        queueAIAction({ action: 'add_income', amount, description: desc, category: 'Sales' }, `Add Income: RM${amount} - ${desc}`);
        return `✅ RM${amount} from ${desc} queued! Check Pending.`;
    }

    // ==================== STOCK OUT (SALES) ====================
    if ((lowerMessage.includes('sold') || lowerMessage.includes('sell') || lowerMessage.includes('jual') ||
         lowerMessage.includes('customer bought') || lowerMessage.includes('customer buy')) && !lowerMessage.includes('how')) {
        const product = findProduct(lowerMessage);
        const qty = extractQty(lowerMessage) || 1;
        if (product) {
            queueAIAction({ action: 'stock_out', product: product.name, quantity: qty }, `Stock Out: ${qty}x ${product.name}`);
            return `✅ Sold ${qty}x ${product.name} queued! Check Pending.`;
        }
        return `Which product? Example: "sold 5 Wine"`;
    }

    // ==================== STOCK IN (PURCHASE) ====================
    if ((lowerMessage.includes('bought') || lowerMessage.includes('purchased') || lowerMessage.includes('beli') ||
         lowerMessage.includes('restock') || lowerMessage.includes('received stock')) && !lowerMessage.includes('customer')) {
        const product = findProduct(lowerMessage);
        const qty = extractQty(lowerMessage);
        if (product && qty) {
            queueAIAction({ action: 'stock_in', product: product.name, quantity: qty }, `Stock In: +${qty} ${product.name}`);
            return `✅ +${qty} ${product.name} queued! Check Pending.`;
        }
        return `What did you buy? Example: "bought 10 Wine"`;
    }

    // ==================== STOCK TRANSFER ====================
    if (lowerMessage.includes('transfer') && (lowerMessage.includes('stock') || findProduct(lowerMessage))) {
        const product = findProduct(lowerMessage);
        const qty = extractQty(lowerMessage);
        const branch = findBranch(lowerMessage);
        
        if (product && qty && branch) {
            queueAIAction({ action: 'stock_transfer', product: product.name, quantity: qty, to: branch.name, from: 'HQ' },
                `Transfer: ${qty}x ${product.name} → ${branch.name}`);
            return `✅ Transfer ${qty}x ${product.name} → ${branch.name} queued! Check Pending.`;
        }
        return `Need: product, qty, destination.\nExample: "Transfer 10 Wine to ${branches[0]?.name || 'Penang'}"`;
    }

    // ==================== STOCK IN/OUT COMMANDS ====================
    if (lowerMessage.includes('stock in') || lowerMessage.includes('add stock')) {
        const product = findProduct(lowerMessage);
        const qty = extractQty(lowerMessage);
        if (product && qty) {
            queueAIAction({ action: 'stock_in', product: product.name, quantity: qty }, `Stock In: +${qty} ${product.name}`);
            return `✅ +${qty} ${product.name} queued! Check Pending.`;
        }
        return `Example: "Stock in 10 Wine"`;
    }
    
    if (lowerMessage.includes('stock out') || lowerMessage.includes('reduce stock')) {
        const product = findProduct(lowerMessage);
        const qty = extractQty(lowerMessage);
        if (product && qty) {
            queueAIAction({ action: 'stock_out', product: product.name, quantity: qty }, `Stock Out: -${qty} ${product.name}`);
            return `✅ -${qty} ${product.name} queued! Check Pending.`;
        }
        return `Example: "Stock out 5 Beer"`;
    }

    // ==================== CREATE QUOTATION ====================
    if ((lowerMessage.includes('create') || lowerMessage.includes('make') || lowerMessage.includes('new') || lowerMessage.includes('buat')) && 
        (lowerMessage.includes('quotation') || lowerMessage.includes('quote') || lowerMessage.includes('sebut harga'))) {
        const customer = findCustomer(lowerMessage);
        if (customer || amount) {
            queueAIAction({ action: 'create_quotation', customer: customer?.name || 'Customer', total: amount || 0 },
                `Create Quotation: ${customer?.name || 'Customer'} - RM${amount || 0}`);
            return `✅ Quotation for ${customer?.name || 'Customer'}${amount ? ` (RM${amount})` : ''} queued! Check Pending.`;
        }
        if (typeof showSection === 'function') { showSection('quotations'); }
        return `📝 Opening Quotations...\n\nOr say: "Create quotation for John RM500"`;
    }

    // ==================== CREATE INVOICE ====================
    if ((lowerMessage.includes('create') || lowerMessage.includes('make') || lowerMessage.includes('new') || lowerMessage.includes('buat')) && 
        (lowerMessage.includes('invoice') || lowerMessage.includes('invois'))) {
        const customer = findCustomer(lowerMessage);
        if (customer || amount) {
            queueAIAction({ action: 'create_invoice', customer: customer?.name || 'Customer', total: amount || 0 },
                `Create Invoice: ${customer?.name || 'Customer'} - RM${amount || 0}`);
            return `✅ Invoice for ${customer?.name || 'Customer'}${amount ? ` (RM${amount})` : ''} queued! Check Pending.`;
        }
        if (typeof showSection === 'function') { showSection('invoices'); }
        return `📄 Opening Invoices...\n\nOr say: "Create invoice for Ali RM1000"`;
    }

    // ==================== ADD PRODUCT ====================
    if ((lowerMessage.includes('add') || lowerMessage.includes('create') || lowerMessage.includes('new') || lowerMessage.includes('tambah')) && 
        lowerMessage.includes('product') && !lowerMessage.includes('what') && !lowerMessage.includes('list')) {
        const nameMatch = lowerMessage.match(/product\s+([a-zA-Z0-9\s]+?)(?:\s+(?:rm|at|price|\d)|$)/i);
        const name = nameMatch ? nameMatch[1].trim().replace(/\s+(at|for|price)$/i, '') : null;
        if (name && amount) {
            queueAIAction({ action: 'add_product', name, price: amount, quantity: extractQty(lowerMessage) || 0 },
                `Add Product: ${name} - RM${amount}`);
            return `✅ Product "${name}" @ RM${amount} queued! Check Pending.`;
        }
        if (typeof showSection === 'function') { showSection('inventory'); }
        return `📦 Opening Inventory...\n\nOr say: "Add product Laptop RM2000"`;
    }

    // ==================== ADD CUSTOMER ====================
    if ((lowerMessage.includes('add') || lowerMessage.includes('create') || lowerMessage.includes('new') || lowerMessage.includes('tambah')) && 
        (lowerMessage.includes('customer') || lowerMessage.includes('pelanggan') || lowerMessage.includes('client'))) {
        // Better name extraction - try multiple patterns
        let name = null;
        const phoneMatch = lowerMessage.match(/(\+?\d[\d\s-]{7,})/);
        const phone = phoneMatch ? phoneMatch[1].replace(/\s+/g, '') : '';
        const emailMatch = lowerMessage.match(/([\w.-]+@[\w.-]+\.[a-z]{2,})/i);
        const email = emailMatch ? emailMatch[1] : '';
        
        // Pattern 1: "add customer John" or "add customer John Doe"
        let nameMatch = lowerMessage.match(/(?:customer|pelanggan|client)\s+([a-zA-Z][a-zA-Z\s]+?)(?:\s+(?:phone|email|\d|@)|$)/i);
        if (nameMatch) name = nameMatch[1].trim();
        
        // Pattern 2: "add John as customer" or "new client John Doe"
        if (!name) {
            nameMatch = lowerMessage.match(/(?:add|new|create|tambah)\s+([a-zA-Z][a-zA-Z\s]+?)\s+(?:as|to)\s+(?:customer|client)/i);
            if (nameMatch) name = nameMatch[1].trim();
        }
        
        // Pattern 3: Just get the name after command words
        if (!name) {
            nameMatch = lowerMessage.match(/(?:add|new|create)\s+(?:customer|client)\s+named?\s+([a-zA-Z][a-zA-Z\s]+)/i);
            if (nameMatch) name = nameMatch[1].trim();
        }
        
        // Clean up common trailing words
        if (name) {
            name = name.replace(/\s+(please|pls|now|today|urgent)$/i, '').trim();
            // Remove if it's too short or just common words
            if (name.length < 2 || /^(please|pls|the|a|an)$/i.test(name)) name = null;
        }
        
        if (name) {
            queueAIAction({ action: 'add_customer', name, phone, email }, `Add Customer: ${name}`);
            return `✅ Customer "${name}"${phone ? ` (${phone})` : ''}${email ? ` <${email}>` : ''} queued! Check Pending.`;
        }
        if (typeof showSection === 'function') { showSection('crm'); }
        return `👥 Opening Customers...\n\nSay: "Add customer John 0123456789" or "Add customer Ali ahmad@email.com"`;
    }

    // ==================== ADD SUPPLIER ====================
    if ((lowerMessage.includes('add') || lowerMessage.includes('create') || lowerMessage.includes('new')) && 
        lowerMessage.includes('supplier')) {
        const nameMatch = lowerMessage.match(/supplier\s+([a-zA-Z\s]+?)(?:\s+(?:phone|\d)|$)/i);
        const name = nameMatch ? nameMatch[1].trim() : null;
        if (name) {
            queueAIAction({ action: 'add_supplier', name, phone: '' }, `Add Supplier: ${name}`);
            return `✅ Supplier "${name}" queued! Check Pending.`;
        }
        if (typeof showSection === 'function') { showSection('suppliers'); }
        return `🚚 Opening Suppliers...\n\nOr say: "Add supplier ABC Trading"`;
    }

    // ==================== ADD EXPENSE (EXPLICIT) ====================
    if ((lowerMessage.includes('add') || lowerMessage.includes('record') || lowerMessage.includes('new')) && 
        lowerMessage.includes('expense') && amount) {
        const descMatch = lowerMessage.match(/(?:for|on|about)\s+([^,]+?)(?:\s+(?:rm|\d)|$)/i);
        const desc = descMatch ? descMatch[1].trim() : 'General Expense';
        queueAIAction({ action: 'add_expense', amount, description: desc, category: desc }, `Add Expense: RM${amount} - ${desc}`);
        return `✅ Expense RM${amount} (${desc}) queued! Check Pending.`;
    }

    // ==================== ADD BILL ====================
    if ((lowerMessage.includes('add') || lowerMessage.includes('create') || lowerMessage.includes('new')) && 
        lowerMessage.includes('bill') && !lowerMessage.includes('bills') && amount) {
        const vendorMatch = lowerMessage.match(/(?:from|to|for)\s+([a-zA-Z\s]+?)(?:\s+(?:rm|\d)|$)/i);
        const vendor = vendorMatch ? vendorMatch[1].trim() : 'Vendor';
        queueAIAction({ action: 'add_bill', amount, name: vendor, vendor }, `Add Bill: ${vendor} - RM${amount}`);
        return `✅ Bill RM${amount} from ${vendor} queued! Check Pending.`;
    }

    // ==================== CREATE ORDER ====================
    if ((lowerMessage.includes('create') || lowerMessage.includes('make') || lowerMessage.includes('new')) && 
        lowerMessage.includes('order') && !lowerMessage.includes('orders')) {
        const customer = findCustomer(lowerMessage);
        if (customer || amount) {
            queueAIAction({ action: 'create_order', customer: customer?.name || 'Customer', total: amount || 0 },
                `Create Order: ${customer?.name || 'Customer'} - RM${amount || 0}`);
            return `✅ Order for ${customer?.name || 'Customer'}${amount ? ` (RM${amount})` : ''} queued! Check Pending.`;
        }
        if (typeof showSection === 'function') { showSection('orders'); }
        return `📋 Opening Orders...\n\nOr say: "Create order for John RM500"`;
    }

    // ==================== CREATE PROJECT ====================
    if ((lowerMessage.includes('create') || lowerMessage.includes('make') || lowerMessage.includes('new')) && 
        lowerMessage.includes('project')) {
        const nameMatch = lowerMessage.match(/project\s+([a-zA-Z0-9\s]+?)(?:\s+(?:budget|rm|\d)|$)/i);
        const name = nameMatch ? nameMatch[1].trim() : null;
        if (name) {
            queueAIAction({ action: 'create_project', name, budget: amount || 0 }, `Create Project: ${name}`);
            return `✅ Project "${name}"${amount ? ` (Budget: RM${amount})` : ''} queued! Check Pending.`;
        }
        if (typeof showSection === 'function') { showSection('projects'); }
        return `📁 Opening Projects...\n\nOr say: "Create project Website RM5000"`;
    }

    // ==================== ADD EMPLOYEE ====================
    if ((lowerMessage.includes('add') || lowerMessage.includes('hire') || lowerMessage.includes('new')) && 
        (lowerMessage.includes('employee') || lowerMessage.includes('staff') || lowerMessage.includes('pekerja'))) {
        const nameMatch = lowerMessage.match(/(?:employee|staff|pekerja)\s+([a-zA-Z\s]+?)(?:\s+(?:salary|gaji|rm|\d)|$)/i);
        const name = nameMatch ? nameMatch[1].trim() : null;
        const salaryMatch = lowerMessage.match(/(?:salary|gaji)\s*(?:rm)?\s*(\d+)/i) || lowerMessage.match(/rm\s*(\d+)/i);
        const salary = salaryMatch ? parseFloat(salaryMatch[1]) : amount || 0;
        
        if (name) {
            queueAIAction({ action: 'add_employee', name, salary }, `Add Employee: ${name} - RM${salary}`);
            return `✅ Employee "${name}"${salary ? ` (Salary: RM${salary})` : ''} queued! Check Pending.`;
        }
        if (typeof showSection === 'function') { showSection('payroll'); }
        return `👷 Opening Payroll...\n\nOr say: "Add employee Ahmad salary RM3000"`;
    }

    // ==================== CREATE BOM ====================
    if ((lowerMessage.includes('create') || lowerMessage.includes('make') || lowerMessage.includes('new')) && 
        (lowerMessage.includes('bom') || lowerMessage.includes('bill of material') || lowerMessage.includes('recipe'))) {
        const nameMatch = lowerMessage.match(/(?:bom|recipe|bill of material)\s+(?:for\s+)?([a-zA-Z0-9\s]+?)(?:\s+(?:with|using|rm|\d)|$)/i);
        const name = nameMatch ? nameMatch[1].trim() : null;
        
        if (name) {
            queueAIAction({ action: 'create_bom', name, outputQuantity: 1 }, `Create BOM: ${name}`);
            return `✅ BOM "${name}" queued! Check Pending.\n\n💡 Add materials after in BOM section.`;
        }
        if (typeof showSection === 'function') { showSection('bom'); }
        return `⚙️ Opening BOM...\n\nOr say: "Create BOM for Wooden Chair"`;
    }

    // ==================== CREATE DELIVERY ORDER ====================
    if ((lowerMessage.includes('create') || lowerMessage.includes('make') || lowerMessage.includes('new')) && 
        (lowerMessage.includes('delivery order') || lowerMessage.includes(' do ') || lowerMessage.includes('do for'))) {
        const customer = findCustomer(lowerMessage);
        const supplier = findSupplier(lowerMessage);
        const qty = extractQty(lowerMessage) || 1;
        
        if (customer) {
            queueAIAction({ action: 'create_do', type: 'outgoing', customer: customer.name, quantity: qty }, 
                `Create DO: Outgoing to ${customer.name}`);
            return `✅ Delivery Order to ${customer.name} queued! Check Pending.`;
        }
        if (supplier) {
            queueAIAction({ action: 'create_do', type: 'incoming', supplier: supplier.name, quantity: qty }, 
                `Create DO: Incoming from ${supplier.name}`);
            return `✅ Incoming DO from ${supplier.name} queued! Check Pending.`;
        }
        if (typeof showSection === 'function') { showSection('orders'); }
        return `🚚 Opening Orders...\n\nOr say: "Create DO for Ahmad" or "Create DO from ABC Supplier"`;
    }

    // ==================== CREATE KPI ====================
    if ((lowerMessage.includes('create') || lowerMessage.includes('add') || lowerMessage.includes('set') || lowerMessage.includes('new')) && 
        (lowerMessage.includes('kpi') || lowerMessage.includes('key performance') || lowerMessage.includes('target'))) {
        const nameMatch = lowerMessage.match(/(?:kpi|target)\s+(?:for\s+)?([a-zA-Z0-9\s]+?)(?:\s+(?:target|rm|\d)|$)/i);
        const name = nameMatch ? nameMatch[1].trim() : null;
        const targetMatch = lowerMessage.match(/(?:target|value)\s*(?:rm)?\s*(\d+)/i);
        const target = targetMatch ? parseFloat(targetMatch[1]) : amount || 0;
        
        if (name || target) {
            queueAIAction({ action: 'create_kpi', name: name || 'Sales Target', target, unit: 'RM' }, 
                `Create KPI: ${name || 'Sales Target'} - Target: ${target}`);
            return `✅ KPI "${name || 'Sales Target'}" (Target: ${target}) queued! Check Pending.`;
        }
        if (typeof showSection === 'function') { showSection('kpi'); }
        return `📊 Opening KPI...\n\nOr say: "Create KPI Sales Target 10000"`;
    }

    // ==================== CREATE JOURNAL ENTRY ====================
    if ((lowerMessage.includes('journal') || lowerMessage.includes('debit') || lowerMessage.includes('credit')) && 
        (lowerMessage.includes('entry') || lowerMessage.includes('record') || amount)) {
        const debitMatch = lowerMessage.match(/debit\s+([a-zA-Z\s]+?)(?:\s+(?:credit|rm|\d)|$)/i);
        const creditMatch = lowerMessage.match(/credit\s+([a-zA-Z\s]+?)(?:\s+(?:rm|\d)|$)/i);
        const debit = debitMatch ? debitMatch[1].trim() : '';
        const credit = creditMatch ? creditMatch[1].trim() : '';
        
        if (debit && credit && amount) {
            queueAIAction({ action: 'create_journal', debit, credit, amount }, 
                `Journal: Dr ${debit} / Cr ${credit} - RM${amount}`);
            return `✅ Journal: Dr ${debit} / Cr ${credit} RM${amount} queued!`;
        }
        if (typeof showSection === 'function') { showSection('accounting'); }
        return `📚 Opening Accounting...\n\nSay: "Journal debit Cash credit Sales RM1000"`;
    }

    // ==================== APPLY LEAVE ====================
    if ((lowerMessage.includes('apply') || lowerMessage.includes('request') || lowerMessage.includes('take')) && 
        (lowerMessage.includes('leave') || lowerMessage.includes('cuti') || lowerMessage.includes('mc') || lowerMessage.includes('annual'))) {
        const employeeMatch = lowerMessage.match(/(?:for|by)\s+([a-zA-Z\s]+?)(?:\s+(?:from|on|type)|$)/i);
        const employee = employeeMatch ? employeeMatch[1].trim() : '';
        const typeMatch = lowerMessage.match(/(annual|sick|medical|mc|unpaid|emergency)/i);
        const leaveType = typeMatch ? (typeMatch[1].toLowerCase() === 'mc' ? 'medical' : typeMatch[1].toLowerCase()) : 'annual';
        
        if (employee) {
            queueAIAction({ action: 'apply_leave', employee, type: leaveType }, 
                `Apply Leave: ${employee} (${leaveType})`);
            return `✅ Leave request for ${employee} (${leaveType}) queued! Check Pending.`;
        }
        if (typeof showSection === 'function') { showSection('payroll'); }
        return `📅 Opening HR/Leave...\n\nSay: "Apply leave for Ahmad from Jan 10 to Jan 12"`;
    }

    // ==================== QUICK POS SALE ====================
    if ((lowerMessage.includes('quick sale') || lowerMessage.includes('ring up') || lowerMessage.includes('pos sale') ||
        (lowerMessage.includes('sale') && amount && !lowerMessage.includes('sales'))) && amount) {
        const paymentMatch = lowerMessage.match(/(cash|card|ewallet|qr|transfer)/i);
        const payment = paymentMatch ? paymentMatch[1].toLowerCase() : 'cash';
        
        queueAIAction({ action: 'pos_sale', amount, payment }, `POS Sale: RM${amount} (${payment})`);
        return `✅ Sale RM${amount} (${payment}) queued! Check Pending.`;
    }

    // ==================== STOCK TRANSFER ====================
    if ((lowerMessage.includes('transfer') || lowerMessage.includes('move') || lowerMessage.includes('send')) && 
        (lowerMessage.includes('stock') || lowerMessage.includes('to branch') || lowerMessage.includes('to outlet'))) {
        const product = findProduct(lowerMessage);
        const qty = extractQty(lowerMessage) || 1;
        const toMatch = lowerMessage.match(/(?:to|ke)\s+([a-zA-Z\s]+?)(?:\s+(?:branch|outlet)|$)/i);
        const toBranch = toMatch ? toMatch[1].trim() : '';
        
        if (product && toBranch) {
            queueAIAction({ action: 'stock_transfer', product: product.name, quantity: qty, to: toBranch }, 
                `Transfer: ${qty} ${product.name} → ${toBranch}`);
            return `✅ Transfer ${qty} ${product.name} to ${toBranch} queued! Check Pending.`;
        }
        if (typeof showSection === 'function') { showSection('branches'); }
        return `🔄 Opening Branches...\n\nSay: "Transfer 10 iPhone to Penang branch"`;
    }

    // ==================== PAYMENT TO SUPPLIER ====================
    if ((lowerMessage.includes('paid') || lowerMessage.includes('pay')) && 
        (lowerMessage.includes('to') || lowerMessage.includes('supplier')) && amount) {
        const vendorMatch = lowerMessage.match(/(?:to|for)\s+([a-zA-Z\s]+?)(?:\s+(?:rm|\d)|$)/i);
        const vendor = vendorMatch ? vendorMatch[1].trim() : 'Supplier';
        queueAIAction({ action: 'add_expense', amount, description: `Payment to ${vendor}`, category: 'Supplier Payment' },
            `Payment: RM${amount} to ${vendor}`);
        return `✅ Payment RM${amount} to ${vendor} queued! Check Pending.`;
    }

    // ==================== MODULE HELP + NAVIGATION ====================
    
    // Balance Sheet
    if (lowerMessage.includes('balance sheet') || (lowerMessage.includes('balance') && lowerMessage.includes('sheet'))) {
        if (typeof showSection === 'function') { showSection('balance-sheet'); }
        return `📊 **Balance Sheet** - Opening now!\n\n• **Assets** = What you own\n• **Liabilities** = What you owe\n• **Equity** = Assets - Liabilities\n\nThis shows your financial position at a point in time.`;
    }
    
    // POS
    if (lowerMessage.includes('pos') || lowerMessage.includes('point of sale') || lowerMessage.includes('cashier') ||
        (lowerMessage.includes('how') && lowerMessage.includes('sell'))) {
        if (typeof showSection === 'function') { showSection('pos'); }
        return `🛒 **POS** - Opening now!\n\n1. Click products to add to cart\n2. Adjust quantity if needed\n3. Select payment method\n4. Complete sale!\n\nOr tell me: "sold 5 Wine"`;
    }
    
    // Inventory
    if ((lowerMessage.includes('inventory') || lowerMessage.includes('stock management')) && 
        (lowerMessage.includes('how') || lowerMessage.includes('help') || lowerMessage.includes('use') || lowerMessage.includes('open') || lowerMessage.includes('go'))) {
        if (typeof showSection === 'function') { showSection('inventory'); }
        return `📦 **Inventory** - Opening now!\n\n• Add products with name, SKU, price\n• Set min stock for alerts\n• Stock In/Out to adjust\n• Transfer between outlets\n\nOr tell me: "stock in 10 Wine"`;
    }
    
    // CRM / Customers
    if ((lowerMessage.includes('crm') || lowerMessage.includes('customer')) && 
        (lowerMessage.includes('how') || lowerMessage.includes('help') || lowerMessage.includes('use') || lowerMessage.includes('open') || lowerMessage.includes('go') || lowerMessage.includes('manage'))) {
        if (typeof showSection === 'function') { showSection('crm'); }
        return `👥 **Customers** - Opening now!\n\n• Add customer details\n• Track purchase history\n• View top buyers\n• Set credit limits\n\nOr tell me: "add customer John 0123456789"`;
    }
    
    // Quotations
    if ((lowerMessage.includes('quotation') || lowerMessage.includes('quote')) && 
        (lowerMessage.includes('how') || lowerMessage.includes('help') || lowerMessage.includes('use') || lowerMessage.includes('open') || lowerMessage.includes('go'))) {
        if (typeof showSection === 'function') { showSection('quotations'); }
        return `📝 **Quotations** - Opening now!\n\n1. Click New Quotation\n2. Select customer\n3. Add items\n4. Set validity\n5. Save & send!\n\nOr tell me: "create quotation for John RM500"`;
    }
    
    // Invoices
    if (lowerMessage.includes('invoice') && 
        (lowerMessage.includes('how') || lowerMessage.includes('help') || lowerMessage.includes('use') || lowerMessage.includes('open') || lowerMessage.includes('go'))) {
        if (typeof showSection === 'function') { showSection('invoices'); }
        return `📄 **Invoices** - Opening now!\n\n1. Create from quotation or new\n2. Add line items\n3. Set payment terms\n4. Send to customer\n\nOr tell me: "create invoice for Ali RM1000"`;
    }
    
    // Orders
    if (lowerMessage.includes('order') && !lowerMessage.includes('purchase') &&
        (lowerMessage.includes('how') || lowerMessage.includes('help') || lowerMessage.includes('use') || lowerMessage.includes('open') || lowerMessage.includes('go'))) {
        if (typeof showSection === 'function') { showSection('orders'); }
        return `📋 **Orders** - Opening now!\n\n• Track order status\n• Convert to invoice\n• Mark as delivered\n\nOr tell me: "pending orders?"`;
    }
    
    // Bills
    if (lowerMessage.includes('bill') && 
        (lowerMessage.includes('how') || lowerMessage.includes('help') || lowerMessage.includes('use') || lowerMessage.includes('open') || lowerMessage.includes('go') || lowerMessage.includes('manage'))) {
        if (typeof showSection === 'function') { showSection('bills'); }
        return `📃 **Bills** - Opening now!\n\n• Add supplier bills\n• Set due dates\n• Track payments\n• See overdue\n\nOr tell me: "add bill RM500 from TNB"`;
    }
    
    // Reports
    if (lowerMessage.includes('report') && 
        (lowerMessage.includes('how') || lowerMessage.includes('help') || lowerMessage.includes('use') || lowerMessage.includes('open') || lowerMessage.includes('go') || lowerMessage.includes('generate'))) {
        if (typeof showSection === 'function') { showSection('reports'); }
        return `📈 **Reports** - Opening now!\n\n• Sales Report\n• Profit & Loss\n• Inventory Report\n• Customer Report\n• Tax Summary`;
    }
    
    // Tax
    if ((lowerMessage.includes('tax') || lowerMessage.includes('sst') || lowerMessage.includes('lhdn')) && 
        (lowerMessage.includes('how') || lowerMessage.includes('help') || lowerMessage.includes('use') || lowerMessage.includes('open') || lowerMessage.includes('go') || lowerMessage.includes('calculate'))) {
        if (typeof showSection === 'function') { showSection('taxes'); }
        return `💰 **Tax Calculator** - Opening now!\n\n• SST: 6% service, 5-10% sales\n• Threshold: RM500k/year\n• Deductible: Rent, utilities, salaries\n• Keep receipts 7 years!`;
    }
    
    // Projects
    if (lowerMessage.includes('project') && 
        (lowerMessage.includes('how') || lowerMessage.includes('help') || lowerMessage.includes('use') || lowerMessage.includes('open') || lowerMessage.includes('go') || lowerMessage.includes('manage'))) {
        if (typeof showSection === 'function') { showSection('projects'); }
        return `📁 **Projects** - Opening now!\n\n• Create with budget\n• Add tasks & milestones\n• Track expenses\n• Invoice on completion`;
    }
    
    // Settings
    if (lowerMessage.includes('setting') && 
        (lowerMessage.includes('how') || lowerMessage.includes('help') || lowerMessage.includes('use') || lowerMessage.includes('open') || lowerMessage.includes('go') || lowerMessage.includes('change'))) {
        if (typeof showSection === 'function') { showSection('settings'); }
        return `⚙️ **Settings** - Opening now!\n\n• Company info & logo\n• Tax rates\n• Currency format\n• Branches/outlets\n• Backup & restore`;
    }
    
    // Suppliers
    if (lowerMessage.includes('supplier') && 
        (lowerMessage.includes('how') || lowerMessage.includes('help') || lowerMessage.includes('use') || lowerMessage.includes('open') || lowerMessage.includes('go') || lowerMessage.includes('manage'))) {
        if (typeof showSection === 'function') { showSection('suppliers'); }
        return `🚚 **Suppliers** - Opening now!\n\n• Add supplier details\n• Track purchase orders\n• Record payments\n• View history`;
    }
    
    // Transactions
    if (lowerMessage.includes('transaction') && 
        (lowerMessage.includes('how') || lowerMessage.includes('help') || lowerMessage.includes('use') || lowerMessage.includes('open') || lowerMessage.includes('go'))) {
        if (typeof showSection === 'function') { showSection('transactions'); }
        return `💳 **Transactions** - Opening now!\n\n• Add income/expense\n• Categorize entries\n• Attach receipts\n• View history`;
    }
    
    // Dashboard
    if (lowerMessage.includes('dashboard') && 
        (lowerMessage.includes('how') || lowerMessage.includes('help') || lowerMessage.includes('use') || lowerMessage.includes('open') || lowerMessage.includes('go'))) {
        if (typeof showSection === 'function') { showSection('dashboard'); }
        return `📊 **Dashboard** - Opening now!\n\n• Today's sales\n• Monthly revenue\n• Profit/loss\n• Low stock alerts\n• Cash flow chart`;
    }
    
    // Payroll
    if ((lowerMessage.includes('payroll') || lowerMessage.includes('salary') || lowerMessage.includes('gaji')) && 
        (lowerMessage.includes('how') || lowerMessage.includes('help') || lowerMessage.includes('use') || lowerMessage.includes('open') || lowerMessage.includes('go'))) {
        if (typeof showSection === 'function') { showSection('payroll'); }
        return `💵 **Payroll** - Opening now!\n\n• Add employees\n• Set salaries\n• Process payments\n• Generate payslips`;
    }
    
    // Purchase Orders
    if ((lowerMessage.includes('purchase order') || lowerMessage.includes('po')) && 
        (lowerMessage.includes('how') || lowerMessage.includes('help') || lowerMessage.includes('use') || lowerMessage.includes('open') || lowerMessage.includes('go'))) {
        if (typeof showSection === 'function') { showSection('purchase-orders'); }
        return `📦 **Purchase Orders** - Opening now!\n\n• Create PO to suppliers\n• Track deliveries\n• Match with bills\n• Manage inventory`;
    }
    
    // Delivery Orders
    if ((lowerMessage.includes('delivery order') || lowerMessage.includes('do')) && 
        (lowerMessage.includes('how') || lowerMessage.includes('help') || lowerMessage.includes('use') || lowerMessage.includes('open') || lowerMessage.includes('go'))) {
        if (typeof showSection === 'function') { showSection('delivery-orders'); }
        return `🚚 **Delivery Orders** - Opening now!\n\n• Create from orders\n• Track deliveries\n• Print DO\n• Update status`;
    }

    // ==================== NAVIGATION COMMANDS ====================
    const navMap = {
        'dashboard': ['dashboard', 'home', 'main'],
        'inventory': ['inventory', 'stock', 'product'],
        'pos': ['pos', 'cashier', 'sell', 'sale'],
        'crm': ['crm', 'customer', 'client'],
        'orders': ['order'],
        'invoices': ['invoice'],
        'quotations': ['quotation', 'quote'],
        'bills': ['bill'],
        'taxes': ['tax', 'sst'],
        'reports': ['report'],
        'projects': ['project'],
        'settings': ['setting', 'config'],
        'transactions': ['transaction', 'expense', 'income'],
        'balance-sheet': ['balance sheet', 'accounting'],
        'suppliers': ['supplier', 'vendor'],
        'payroll': ['payroll', 'salary', 'gaji'],
        'purchase-orders': ['purchase order', 'po'],
        'delivery-orders': ['delivery order', 'do']
    };
    
    if (lowerMessage.includes('go to') || lowerMessage.includes('open') || lowerMessage.includes('show me') || 
        lowerMessage.includes('take me') || lowerMessage.includes('navigate') || lowerMessage.includes('buka')) {
        for (const [section, keywords] of Object.entries(navMap)) {
            if (keywords.some(k => lowerMessage.includes(k))) {
                if (typeof showSection === 'function') { showSection(section); }
                return `✅ Opening ${section.replace('-', ' ')}...`;
            }
        }
    }

    // ==================== SEARCH & FIND ====================
    if (lowerMessage.includes('find') || lowerMessage.includes('search') || lowerMessage.includes('cari') || lowerMessage.includes('look for')) {
        if (lowerMessage.includes('customer') || lowerMessage.includes('client')) {
            const customer = findCustomer(lowerMessage);
            if (customer) return `Found: ${customer.name}\n📞 ${customer.phone || 'No phone'}\n📧 ${customer.email || 'No email'}`;
            if (typeof showSection === 'function') { showSection('crm'); }
            return `👥 Opening Customers to search...`;
        }
        if (lowerMessage.includes('product') || lowerMessage.includes('item')) {
            const product = findProduct(lowerMessage);
            if (product) return `Found: ${product.name}\n💰 RM${product.price || 0}\n📦 Stock: ${product.stock || 0}`;
            if (typeof showSection === 'function') { showSection('inventory'); }
            return `📦 Opening Inventory to search...`;
        }
        if (lowerMessage.includes('invoice')) {
            if (typeof showSection === 'function') { showSection('invoices'); }
            return `📄 Opening Invoices to search...`;
        }
        if (lowerMessage.includes('supplier')) {
            if (typeof showSection === 'function') { showSection('suppliers'); }
            return `🚚 Opening Suppliers to search...`;
        }
    }

    // ==================== QUERIES - FINANCIAL ====================
    if (lowerMessage.includes('profit') || lowerMessage.includes('untung') || 
        (lowerMessage.includes('how much') && lowerMessage.includes('make'))) {
        const net = context.currentMonthIncome - context.currentMonthExpenses;
        const margin = context.currentMonthIncome > 0 ? (net / context.currentMonthIncome * 100).toFixed(1) : 0;
        const status = margin > 20 ? '🟢 Excellent!' : margin > 10 ? '🟡 Good' : margin > 0 ? '🟠 Low' : '🔴 Loss';
        return `📊 **This Month**\n\n💰 Revenue: ${formatCurrency(context.currentMonthIncome)}\n💸 Expenses: ${formatCurrency(context.currentMonthExpenses)}\n📈 Profit: ${formatCurrency(net)} (${margin}%)\n\n${status}`;
    }
    
    if (lowerMessage.includes('revenue') || lowerMessage.includes('income') || lowerMessage.includes('pendapatan')) {
        return `💰 **Revenue This Month**\n\n${formatCurrency(context.currentMonthIncome)}\n\nSay "show profit" for full breakdown.`;
    }
    
    if (lowerMessage.includes('expense') || lowerMessage.includes('perbelanjaan') || lowerMessage.includes('spending')) {
        return `💸 **Expenses This Month**\n\n${formatCurrency(context.currentMonthExpenses)}\n\n💡 Say "breakfast RM8" to add an expense.`;
    }

    // ==================== QUERIES - INVENTORY ====================
    if (lowerMessage.includes('what product') || lowerMessage.includes('list product') || lowerMessage.includes('show product') ||
        lowerMessage.includes('my product') || lowerMessage.includes('all product') || lowerMessage.includes('my inventory') ||
        lowerMessage.includes('what do i have')) {
        if (products.length === 0) return `📦 No products yet! Say "add product Laptop RM2000" or go to Inventory.`;
        const list = products.slice(0, 10).map(p => `• ${p.name}: ${p.stock || 0} @ ${formatCurrency(p.price || 0)}`).join('\n');
        const more = products.length > 10 ? `\n...and ${products.length - 10} more` : '';
        return `📦 **Products (${products.length})**\n\n${list}${more}`;
    }
    
    if (lowerMessage.includes('low stock') || lowerMessage.includes('restock') || lowerMessage.includes('stock rendah')) {
        const low = products.filter(p => (p.stock || 0) < (p.minStock || 10));
        if (low.length === 0) return `✅ All stock levels OK! (${products.length} products)`;
        const list = low.slice(0, 8).map(p => `• ${p.name}: ${p.stock || 0} (min: ${p.minStock || 10})`).join('\n');
        return `⚠️ **Low Stock (${low.length})**\n\n${list}\n\nSay "stock in 10 Wine" to restock.`;
    }
    
    if (lowerMessage.includes('stock level') || lowerMessage.includes('show stock') || lowerMessage.includes('check stock')) {
        const product = findProduct(lowerMessage);
        if (product) return `📦 **${product.name}**\n\nStock: ${product.stock || 0}\nPrice: ${formatCurrency(product.price || 0)}${product.minStock ? `\nMin: ${product.minStock}` : ''}`;
        return `📦 ${products.length} products in inventory.\n\nAsk "what products?" to see all, or "low stock?" for alerts.`;
    }

    // ==================== ADD BRANCH/OUTLET ====================
    if ((lowerMessage.includes('add') || lowerMessage.includes('create') || lowerMessage.includes('new') || lowerMessage.includes('tambah')) && 
        (lowerMessage.includes('branch') || lowerMessage.includes('branches') || lowerMessage.includes('brunches') || lowerMessage.includes('brunch') ||
         lowerMessage.includes('outlet') || lowerMessage.includes('outlets') || lowerMessage.includes('cawangan') || lowerMessage.includes('kedai') ||
         lowerMessage.includes('store') || lowerMessage.includes('location') || lowerMessage.includes('lokasi'))) {
        // Extract branch name from message
        const nameMatch = lowerMessage.match(/(?:branch|branches|brunches|brunch|outlet|outlets|cawangan|kedai|store|location|lokasi)\s+([a-zA-Z0-9\s]+?)(?:\s+(?:at|in|outlet|branch)|$)/i);
        let branchName = nameMatch ? nameMatch[1].trim() : null;
        
        // Clean up common words
        if (branchName) {
            branchName = branchName.replace(/\b(please|pls|can|you|help|me|add|create|new)\b/gi, '').trim();
        }
        
        if (branchName && branchName.length > 1) {
            // Generate code from name
            const code = branchName.substring(0, 3).toUpperCase();
            const branch = {
                id: 'BRANCH_' + Date.now(),
                code: code,
                name: branchName,
                type: 'branch',
                address: '',
                city: '',
                state: '',
                phone: '',
                email: '',
                manager: '',
                status: 'active',
                isDefault: false,
                createdAt: new Date().toISOString(),
                stock: {}
            };
            
            queueAIAction({ action: 'add_branch', branch: branch }, `Add Branch: ${branchName}`);
            return `✅ Branch "${branchName}" queued! Check Pending.\n\nOr go to Settings → Branches to add manually.`;
        }
        
        // No name provided - open branches section
        if (typeof showSection === 'function') { showSection('branches'); }
        return `🏢 Opening Branches...\n\nSay: "add branch Penang" or "add outlet Johor"`;
    }

    // ==================== QUERIES - OUTLETS/BRANCHES ====================
    if (lowerMessage.includes('outlet') || lowerMessage.includes('branch') || lowerMessage.includes('location') || lowerMessage.includes('cawangan') ||
        (lowerMessage.includes('which') && lowerMessage.includes('stock'))) {
        if (branches.length === 0) return `No outlets set up yet. Go to Settings → Branches.`;
        
        const branch = findBranch(lowerMessage);
        if (branch) {
            if (branch.stock) {
                const items = Object.entries(branch.stock).filter(([_, q]) => q > 0).slice(0, 8)
                    .map(([pid, qty]) => {
                        const p = products.find(x => x.id === pid);
                        return `• ${p?.name || pid}: ${qty}`;
                    });
                return `📍 **${branch.name}**\n\n${items.length > 0 ? items.join('\n') : 'No stock data'}`;
            }
            return `📍 ${branch.name} - No stock recorded.`;
        }
        
        const product = findProduct(lowerMessage);
        if (product) {
            let info = [`📦 **${product.name}** by outlet:\n• HQ: ${product.stock || 0}`];
            branches.slice(0, 5).forEach(b => {
                const qty = b.stock?.[product.id] || 0;
                info.push(`• ${b.name}: ${qty}`);
            });
            return info.join('\n');
        }
        
        const list = branches.map(b => `• ${b.name}${b.code ? ` (${b.code})` : ''}`).join('\n');
        return `📍 **Outlets (${branches.length})**\n\n${list}\n\nAsk "stock at ${branches[0]?.name}?" or "transfer 10 Wine to Penang"`;
    }

    // ==================== QUERIES - ORDERS/INVOICES ====================
    if (lowerMessage.includes('pending order') || (lowerMessage.includes('order') && lowerMessage.includes('pending'))) {
        const pending = orders.filter(o => o.status === 'pending' || o.status === 'processing');
        if (pending.length === 0) return `✅ No pending orders!`;
        const list = pending.slice(0, 5).map(o => `• ${o.orderNo || o.id}: ${formatCurrency(o.total || 0)}`).join('\n');
        return `📋 **Pending Orders (${pending.length})**\n\n${list}`;
    }
    
    if (lowerMessage.includes('overdue') || (lowerMessage.includes('invoice') && lowerMessage.includes('unpaid'))) {
        const overdue = invoices.filter(i => i.status !== 'paid' && new Date(i.dueDate) < new Date());
        if (overdue.length === 0) return `✅ No overdue invoices!`;
        const list = overdue.slice(0, 5).map(i => `• ${i.invoiceNo || i.id}: ${formatCurrency(i.total || 0)}`).join('\n');
        return `⚠️ **Overdue Invoices (${overdue.length})**\n\n${list}`;
    }

    // ==================== QUERIES - CUSTOMERS ====================
    if (lowerMessage.includes('top customer') || lowerMessage.includes('best customer') || lowerMessage.includes('pelanggan terbaik')) {
        const sorted = [...customers].sort((a, b) => (b.totalSpent || 0) - (a.totalSpent || 0));
        if (sorted.length === 0) return `No customers yet.`;
        const list = sorted.slice(0, 5).map((c, i) => `${i + 1}. ${c.name}: ${formatCurrency(c.totalSpent || 0)}`).join('\n');
        return `🏆 **Top Customers**\n\n${list}`;
    }
    
    if ((lowerMessage.includes('how many') && lowerMessage.includes('customer')) || lowerMessage.includes('customer count')) {
        return `👥 You have ${customers.length} customers.\n\nSay "top customers" to see best buyers.`;
    }

    // ==================== QUERIES - BILLS ====================
    if (lowerMessage.includes('unpaid bill') || lowerMessage.includes('bills due') || lowerMessage.includes('bil tertunggak')) {
        const unpaid = bills.filter(b => b.status !== 'paid');
        const overdue = unpaid.filter(b => new Date(b.dueDate) < new Date());
        if (unpaid.length === 0) return `✅ All bills paid!`;
        return `📃 **Unpaid Bills: ${unpaid.length}** (${overdue.length} overdue)\n\nTotal: ${formatCurrency(unpaid.reduce((s, b) => s + (b.amount || 0), 0))}`;
    }

    // ==================== QUERIES - SALES ====================
    if (lowerMessage.includes('today') && (lowerMessage.includes('sale') || lowerMessage.includes('jualan'))) {
        const sales = window.sales || [];
        const today = new Date().toISOString().split('T')[0];
        const todaySales = sales.filter(s => s.date?.startsWith(today));
        const total = todaySales.reduce((s, sale) => s + (sale.total || 0), 0);
        return `📊 **Today's Sales**\n\n${todaySales.length} transactions\nTotal: ${formatCurrency(total)}`;
    }

    // ==================== SUMMARIES ====================
    if (lowerMessage.includes('daily summary') || lowerMessage.includes('today summary') || lowerMessage.includes('ringkasan hari')) {
        const sales = window.sales || [];
        const today = new Date().toISOString().split('T')[0];
        const todaySales = sales.filter(s => s.date?.startsWith(today));
        const totalSales = todaySales.reduce((s, sale) => s + (sale.total || 0), 0);
        const transactions = window.businessData?.transactions || [];
        const todayExp = transactions.filter(t => t.type === 'expense' && t.date === today);
        const totalExp = todayExp.reduce((s, e) => s + (e.amount || 0), 0);
        const pendingOrders = orders.filter(o => o.status === 'pending');
        
        return `📊 **Daily Summary**\n\n💰 Sales: ${todaySales.length} = ${formatCurrency(totalSales)}\n💸 Expenses: ${todayExp.length} = ${formatCurrency(totalExp)}\n📋 Pending Orders: ${pendingOrders.length}\n\n📈 Net: ${formatCurrency(totalSales - totalExp)}`;
    }
    
    if (lowerMessage.includes('monthly summary') || lowerMessage.includes('month summary') || lowerMessage.includes('ringkasan bulan')) {
        const net = context.currentMonthIncome - context.currentMonthExpenses;
        return `📊 **Monthly Summary**\n\n💰 Revenue: ${formatCurrency(context.currentMonthIncome)}\n💸 Expenses: ${formatCurrency(context.currentMonthExpenses)}\n📈 Profit: ${formatCurrency(net)}\n\nGo to Reports for details.`;
    }

    // ==================== TAX QUERIES ====================
    if (lowerMessage.includes('tax deduct') || lowerMessage.includes('claim tax') || lowerMessage.includes('potongan cukai')) {
        return `✅ **Tax Deductible:**\n• Rent, utilities\n• Salaries, EPF/SOCSO\n• Marketing, repairs\n• Training, insurance\n• Depreciation\n\n❌ **Not Deductible:**\n• Personal expenses\n• Fines, penalties\n• Entertainment (limited)\n\n💡 Keep receipts 7 years!`;
    }
    
    if (lowerMessage.includes('sst rate') || lowerMessage.includes('kadar sst')) {
        return `💰 **SST Rates**\n\n• Sales Tax: 5-10%\n• Service Tax: 6%\n• Threshold: RM500k/year\n\nYour monthly revenue: ${formatCurrency(context.currentMonthIncome)}`;
    }

    // ==================== BUSINESS ADVICE ====================
    if (lowerMessage.includes('ssm') || lowerMessage.includes('register business') || lowerMessage.includes('daftar perniagaan')) {
        return `🏢 **Business Registration**\n\n• Sole Prop: RM60-100\n• Partnership: RM150-300\n• Sdn Bhd: RM1,000+\n\nTimeline: 1-3 business days`;
    }
    
    if (lowerMessage.includes('record keeping') || lowerMessage.includes('simpan rekod') || lowerMessage.includes('bookkeeping')) {
        return `📚 **Record Keeping (LHDN)**\n\n• Keep 7 years minimum\n• Invoices & receipts\n• Bank statements\n• Payment vouchers\n\n💡 EZCubic backs up automatically!`;
    }

    // ==================== QUICK ACTIONS ====================
    if (lowerMessage.includes('quick sale') || lowerMessage.includes('ring up')) {
        if (typeof showSection === 'function') { showSection('pos'); }
        return `🛒 Opening POS for quick sale...`;
    }
    
    if (lowerMessage.includes('backup') || lowerMessage.includes('export data')) {
        if (typeof showSection === 'function') { showSection('settings'); }
        return `⚙️ Opening Settings... Go to Backup section.`;
    }

    // ==================== DEFAULT ====================
    const defaults = [
        `🤔 Not sure about that. Try:\n• "show profit" / "low stock?"\n• "breakfast RM8" / "sold 5 wine"\n• "go to inventory" / "create quotation"\n\nOr say "help" for full list!`,
        `I'm here to help! Try:\n• Financial queries\n• Inventory management\n• Create documents\n• Navigate the system\n\nWhat do you need?`,
        `💬 Just talk naturally!\n• "petrol 100" → adds expense\n• "sold 5 wine" → stock out\n• "how to use POS?" → opens & explains`
    ];
    
    return defaults[Math.floor(Math.random() * defaults.length)];
}
// ==================== USER INTERACTION ====================
function sendChatMessage() {
    const input = document.getElementById('chatbotInput');
    const message = input.value.trim();
    
    if (message) {
        processUserMessage(message);
        input.value = '';
    }
}

function handleChatbotKeyPress(event) {
    if (event.key === 'Enter') {
        sendChatMessage();
    }
}

function askQuickQuestion(question) {
    const input = document.getElementById('chatbotInput');
    input.value = question;
    sendChatMessage();
}

function clearChatHistory() {
    if (confirm('Are you sure you want to clear all chat history? This action cannot be undone.')) {
        chatHistory = [];
        saveChatHistory();
        
        const messagesContainer = document.getElementById('chatbotMessages');
        messagesContainer.innerHTML = `
            <div class="chatbot-message bot">
                <div class="message-content">
                    <div class="message-avatar">
                        <i class="fas fa-robot"></i>
                    </div>
                    <div class="message-text">
                        Hello! I'm your EZCubic AI Assistant. I can help you with:
                        <ul style="margin-top: 5px; padding-left: 15px;">
                            <li>Accounting advice for Malaysian businesses</li>
                            <li>Tax calculation explanations</li>
                            <li>Financial report analysis</li>
                            <li>Expense categorization help</li>
                            <li>General business finance questions</li>
                        </ul>
                        How can I help you today?
                    </div>
                </div>
                <div class="message-time">Just now</div>
            </div>
        `;
        
        unreadMessages = 0;
        updateNotificationBadge();
        updateRecentChatPreview();
        
        showNotification('Chat history cleared successfully!', 'success');
    }
}

// ==================== NOTIFICATIONS ====================
function updateNotificationBadge() {
    const badge = document.getElementById('chatbotNotification');
    const navBadge = document.getElementById('chatbotNavBadge');
    
    if (unreadMessages > 0) {
        badge.style.display = 'flex';
        badge.textContent = unreadMessages > 9 ? '9+' : unreadMessages;
        
        if (navBadge) {
            navBadge.style.display = 'flex';
            navBadge.textContent = unreadMessages > 9 ? '9+' : unreadMessages;
        }
    } else {
        badge.style.display = 'none';
        if (navBadge) {
            navBadge.style.display = 'none';
        }
    }
}

function updateRecentChatPreview() {
    const recentContainer = document.getElementById('recentChatPreview');
    if (!recentContainer) return;
    
    const recentChats = chatHistory.filter(msg => msg.isUser).slice(-3);
    
    if (recentChats.length === 0) {
        recentContainer.innerHTML = `
            <div style="color: #94a3b8; text-align: center; padding: 20px;">
                <i class="fas fa-comment-slash" style="font-size: 24px; margin-bottom: 10px;"></i>
                <div>No recent conversations</div>
            </div>
        `;
        return;
    }
    
    recentContainer.innerHTML = recentChats.map(chat => `
        <div style="padding: 8px; border-bottom: 1px solid #e2e8f0;">
            <div style="font-size: 13px; color: #475569; margin-bottom: 4px;">
                ${escapeHTML(chat.message.length > 50 ? chat.message.substring(0, 50) + '...' : chat.message)}
            </div>
            <div style="font-size: 11px; color: #94a3b8;">
                ${new Date(chat.timestamp).toLocaleDateString()}
            </div>
        </div>
    `).join('');
}

// ==================== EXPORT FUNCTIONS TO WINDOW ====================
// Must be at end of file after all functions are defined
window.initializeChatbot = initializeChatbot;
window.toggleChatbot = toggleChatbot;
window.closeChatbot = closeChatbot;
window.showChatbot = showChatbot;
window.sendChatMessage = sendChatMessage;
window.handleChatbotKeyPress = handleChatbotKeyPress;
window.askQuickQuestion = askQuickQuestion;
window.clearChatHistory = clearChatHistory;
console.log('🤖 chatbot.js loaded successfully, toggleChatbot:', typeof toggleChatbot);