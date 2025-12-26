/**
 * EZCubic - AI Tutorials UI
 * Module tutorials, contextual help, quick guides
 * Split from ai-tutorials.js v2.2.6 - 26 Dec 2025
 */

// ==================== MODULE TUTORIAL SYSTEM ====================
let currentModuleTutorial = null;
let moduleStep = 0;

function startModuleTutorial(moduleName) {
    const MODULE_TUTORIALS = window.MODULE_TUTORIALS;
    if (!MODULE_TUTORIALS) {
        if (typeof showNotification === 'function') showNotification('Tutorials not loaded yet', 'error');
        return;
    }
    
    const tutorial = MODULE_TUTORIALS[moduleName];
    if (!tutorial) {
        if (typeof showNotification === 'function') showNotification('Tutorial not available for this section', 'info');
        return;
    }
    
    currentModuleTutorial = moduleName;
    moduleStep = 0;
    
    // Track viewed tutorials
    if (window.aiState && !window.aiState.viewedTutorials.includes(moduleName)) {
        window.aiState.viewedTutorials.push(moduleName);
        if (typeof saveAIState === 'function') saveAIState();
    }
    
    displayModuleTutorialStep();
    if (typeof showNotification === 'function') showNotification(`Starting ${tutorial.title} tutorial 🎓`, 'info');
}

function displayModuleTutorialStep() {
    const MODULE_TUTORIALS = window.MODULE_TUTORIALS;
    if (!MODULE_TUTORIALS) return;
    
    const tutorial = MODULE_TUTORIALS[currentModuleTutorial];
    if (!tutorial) return;
    
    const step = tutorial.steps[moduleStep];
    if (!step) return;
    
    const container = document.getElementById('aiResponseContainer');
    if (!container) return;
    
    const progressPercent = Math.round(((moduleStep + 1) / tutorial.steps.length) * 100);
    
    container.innerHTML = `
        <div class="ai-response module-tutorial" style="border: 2px solid ${tutorial.color}33; background: ${tutorial.color}08;">
            <div class="ai-avatar" style="background: ${tutorial.color};">
                <i class="fas ${tutorial.icon}"></i>
            </div>
            <div class="response-content">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                    <div>
                        <span style="color: ${tutorial.color}; font-size: 12px; text-transform: uppercase;">${tutorial.title}</span>
                        <h3 style="color: white; margin-top: 5px;">${step.title}</h3>
                    </div>
                    <span style="color: #64748b; font-size: 12px;">Step ${moduleStep + 1}/${tutorial.steps.length}</span>
                </div>
                
                <div style="background: rgba(0,0,0,0.2); height: 4px; border-radius: 2px; margin-bottom: 15px;">
                    <div style="background: ${tutorial.color}; height: 100%; width: ${progressPercent}%; border-radius: 2px; transition: width 0.3s;"></div>
                </div>
                
                <div class="response-text" style="white-space: pre-line; line-height: 1.8;">
                    ${step.content}
                </div>
                
                <div class="response-actions" style="margin-top: 20px; display: flex; gap: 10px; flex-wrap: wrap;">
                    ${moduleStep > 0 ? '<button class="ai-action-btn secondary" onclick="prevModuleStep()"><i class="fas fa-arrow-left"></i> Back</button>' : ''}
                    ${moduleStep < tutorial.steps.length - 1 
                        ? '<button class="ai-action-btn primary" onclick="nextModuleStep()">Next <i class="fas fa-arrow-right"></i></button>' 
                        : '<button class="ai-action-btn success" onclick="closeModuleTutorial()"><i class="fas fa-check"></i> Done!</button>'}
                    <button class="ai-action-btn outline" onclick="closeModuleTutorial()">Exit Tutorial</button>
                </div>
            </div>
        </div>
    `;
    
    container.scrollTop = 0;
}

function nextModuleStep() {
    const MODULE_TUTORIALS = window.MODULE_TUTORIALS;
    if (!MODULE_TUTORIALS) return;
    
    const tutorial = MODULE_TUTORIALS[currentModuleTutorial];
    if (tutorial && moduleStep < tutorial.steps.length - 1) {
        moduleStep++;
        displayModuleTutorialStep();
    }
}

function prevModuleStep() {
    if (moduleStep > 0) {
        moduleStep--;
        displayModuleTutorialStep();
    }
}

function closeModuleTutorial() {
    const MODULE_TUTORIALS = window.MODULE_TUTORIALS;
    const tutorial = MODULE_TUTORIALS ? MODULE_TUTORIALS[currentModuleTutorial] : null;
    currentModuleTutorial = null;
    moduleStep = 0;
    
    const container = document.getElementById('aiResponseContainer');
    if (container) {
        container.innerHTML = `
            <div class="ai-response">
                <div class="ai-avatar" style="background: #10b981;">
                    <i class="fas fa-check-circle"></i>
                </div>
                <div class="response-content">
                    <div class="response-text">
                        <strong style="color: #10b981;">Tutorial Complete! 🎉</strong>
                        <p style="margin-top: 10px; color: #cbd5e1;">
                            Great job! You've learned the basics of ${tutorial?.title || 'this module'}.
                        </p>
                        <p style="margin-top: 10px; color: #94a3b8; font-size: 13px;">
                            💡 Need more help? Just ask me anything or type your question below!
                        </p>
                    </div>
                    <div class="response-actions" style="margin-top: 15px;">
                        <button class="ai-action-btn" onclick="showAllTutorials()">📚 More Tutorials</button>
                        <button class="ai-action-btn" onclick="askAIExample('What else can you help me with?')">💬 Ask a Question</button>
                    </div>
                </div>
            </div>
        `;
    }
    
    if (window.aiState) {
        window.aiState.tasksCompleted++;
        if (typeof saveAIState === 'function') saveAIState();
    }
}

function showAllTutorials() {
    const MODULE_TUTORIALS = window.MODULE_TUTORIALS;
    if (!MODULE_TUTORIALS) return;
    
    const container = document.getElementById('aiResponseContainer');
    if (!container) return;
    
    const viewedTutorials = (window.aiState && window.aiState.viewedTutorials) || [];
    
    const tutorialCards = Object.entries(MODULE_TUTORIALS).map(([key, tutorial]) => {
        const completed = viewedTutorials.includes(key);
        return `
            <div onclick="startModuleTutorial('${key}')" 
                 style="background: ${tutorial.color}15; padding: 15px; border-radius: 10px; cursor: pointer; 
                        border-left: 4px solid ${tutorial.color}; transition: all 0.2s;"
                 onmouseover="this.style.transform='translateX(5px)'" 
                 onmouseout="this.style.transform='translateX(0)'">
                <div style="display: flex; align-items: center; gap: 12px;">
                    <i class="fas ${tutorial.icon}" style="color: ${tutorial.color}; font-size: 20px;"></i>
                    <div style="flex: 1;">
                        <strong style="color: white;">${tutorial.title}</strong>
                        <p style="color: #94a3b8; font-size: 12px; margin-top: 3px;">${tutorial.steps.length} steps</p>
                    </div>
                    ${completed ? '<i class="fas fa-check-circle" style="color: #10b981;"></i>' : '<i class="fas fa-play-circle" style="color: #64748b;"></i>'}
                </div>
            </div>
        `;
    }).join('');
    
    container.innerHTML = `
        <div class="ai-response">
            <div class="ai-avatar" style="background: linear-gradient(135deg, #3b82f6, #8b5cf6);">
                <i class="fas fa-graduation-cap"></i>
            </div>
            <div class="response-content">
                <h3 style="color: white; margin-bottom: 5px;">📚 Available Tutorials</h3>
                <p style="color: #94a3b8; font-size: 13px; margin-bottom: 20px;">Click any tutorial to start learning!</p>
                
                <div style="display: grid; gap: 10px; max-height: 400px; overflow-y: auto;">
                    ${tutorialCards}
                </div>
                
                <div style="margin-top: 20px; padding: 15px; background: rgba(245, 158, 11, 0.15); border-radius: 10px;">
                    <strong style="color: #fcd34d;"><i class="fas fa-lightbulb"></i> Tip:</strong>
                    <span style="color: #cbd5e1;"> Start with "Dashboard Overview" if you're new!</span>
                </div>
            </div>
        </div>
    `;
    
    container.scrollTop = 0;
}

// ==================== CONTEXTUAL HELP SYSTEM ====================
function updateContextualHelp(sectionName) {
    if (window.aiState) {
        window.aiState.currentSection = sectionName;
    }
    
    const viewedTutorials = (window.aiState && window.aiState.viewedTutorials) || [];
    const helpDismissed = window.aiState && window.aiState.helpDismissed;
    
    // Auto-show contextual help for first-time visitors
    if (!viewedTutorials.includes(sectionName) && !helpDismissed) {
        showContextualHelp(sectionName);
    }
}

function showContextualHelp(sectionName) {
    const MODULE_TUTORIALS = window.MODULE_TUTORIALS;
    const QUICK_HELP = window.QUICK_HELP;
    
    const tutorial = MODULE_TUTORIALS ? MODULE_TUTORIALS[sectionName] : null;
    const quickHelp = QUICK_HELP ? QUICK_HELP[sectionName] : null;
    
    if (!tutorial && !quickHelp) return;
    
    const container = document.getElementById('aiResponseContainer');
    if (!container) return;
    
    const quickQuestions = quickHelp ? quickHelp.map(q => 
        `<button class="ai-action-btn outline small" onclick="askAIExample('${q}')" style="font-size: 12px; padding: 8px 12px;">${q}</button>`
    ).join('') : '';
    
    container.innerHTML = `
        <div class="ai-response contextual-help" style="border: 2px solid ${tutorial?.color || '#3b82f6'}33;">
            <div class="ai-avatar" style="background: ${tutorial?.color || '#3b82f6'};">
                <i class="fas ${tutorial?.icon || 'fa-question-circle'}"></i>
            </div>
            <div class="response-content">
                <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                    <div>
                        <span style="color: ${tutorial?.color || '#3b82f6'}; font-size: 11px; text-transform: uppercase;">Need Help?</span>
                        <h3 style="color: white; margin-top: 5px;">${tutorial?.title || sectionName}</h3>
                    </div>
                    <button onclick="dismissContextualHelp()" style="background: none; border: none; color: #64748b; cursor: pointer; padding: 5px;">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                
                <p style="color: #94a3b8; margin-top: 10px; font-size: 14px;">
                    ${tutorial?.steps[0]?.content?.substring(0, 150) || 'Welcome to this section!'}...
                </p>
                
                ${quickHelp ? `
                    <div style="margin-top: 15px;">
                        <p style="color: #64748b; font-size: 11px; margin-bottom: 10px;">QUICK QUESTIONS:</p>
                        <div style="display: flex; flex-wrap: wrap; gap: 8px;">
                            ${quickQuestions}
                        </div>
                    </div>
                ` : ''}
                
                <div class="response-actions" style="margin-top: 15px; display: flex; gap: 10px;">
                    ${tutorial ? `<button class="ai-action-btn primary" onclick="startModuleTutorial('${sectionName}')"><i class="fas fa-play"></i> Start Tutorial</button>` : ''}
                    <button class="ai-action-btn outline" onclick="dismissContextualHelp()">Got it!</button>
                </div>
            </div>
        </div>
    `;
}

function dismissContextualHelp() {
    const container = document.getElementById('aiResponseContainer');
    if (container) {
        container.innerHTML = `
            <div class="ai-response">
                <div class="ai-avatar"><img src="images/ai-logo.png" alt="AI" class="ai-logo-img"></div>
                <div class="response-content">
                    <div class="response-text">
                        <p style="color: #cbd5e1;">👋 I'm here if you need help! Just type a question below or click one of the quick actions.</p>
                    </div>
                    <div class="response-actions" style="margin-top: 10px;">
                        <button class="ai-action-btn" onclick="showAllTutorials()">📚 Tutorials</button>
                        <button class="ai-action-btn" onclick="askAIExample('How do I get started?')">🚀 Get Started</button>
                    </div>
                </div>
            </div>
        `;
    }
}

// ==================== QUICK GUIDES ====================
function showQuickGuide(topic) {
    const guides = {
        'add-income': {
            title: 'Quick Guide: Add Income',
            steps: [
                '1. Click "Income" in the sidebar (or Record Income)',
                '2. Click the "Add Income" button',
                '3. Enter the amount you received',
                '4. Add a description (e.g., "Sale to Customer ABC")',
                '5. Select the date and payment method',
                '6. Click "Save" or "Add Income"',
                '✅ Done! Your income is recorded.'
            ]
        },
        'add-expense': {
            title: 'Quick Guide: Add Expense',
            steps: [
                '1. Click "Expenses" in the sidebar',
                '2. Click the "Add Expense" button',
                '3. Enter the amount spent',
                '4. Select a category (Rent, Utilities, etc.)',
                '5. Add description and receipt number',
                '6. Pick the date and click "Save"',
                '💡 Tip: Proper categories = better tax deductions!'
            ]
        },
        'make-sale': {
            title: 'Quick Guide: Make a Sale (POS)',
            steps: [
                '1. Go to POS (Point of Sale)',
                '2. Search or click products to add to cart',
                '3. Adjust quantity if needed',
                '4. Apply discount (if any)',
                '5. Select payment method (Cash/Card/E-Wallet)',
                '6. Click "Complete Sale"',
                '🧾 Receipt will be generated automatically!'
            ]
        },
        'add-product': {
            title: 'Quick Guide: Add Product',
            steps: [
                '1. Go to Inventory section',
                '2. Click "Add Product"',
                '3. Enter product name and SKU',
                '4. Set cost price and selling price',
                '5. Enter current stock quantity',
                '6. Set low stock alert level',
                '7. Click "Save Product"',
                '📦 Product will appear in POS!'
            ]
        },
        'add-customer': {
            title: 'Quick Guide: Add Customer',
            steps: [
                '1. Go to CRM / Customers section',
                '2. Click "Add Customer"',
                '3. Enter name, email, phone',
                '4. Add address (optional)',
                '5. Add any notes about the customer',
                '6. Click "Save Customer"',
                '👥 Now you can track their orders!'
            ]
        },
        'create-quotation': {
            title: 'Quick Guide: Create Quotation',
            steps: [
                '1. Go to Quotations section',
                '2. Click "New Quotation"',
                '3. Select customer (or add new)',
                '4. Add items with quantities and prices',
                '5. Set validity period (e.g., 14 days)',
                '6. Add terms & conditions',
                '7. Click "Save" then "Send to Customer"',
                '✉️ Email the PDF to your customer!'
            ]
        },
        'export-report': {
            title: 'Quick Guide: Export Report',
            steps: [
                '1. Go to Reports section',
                '2. Select report type (P&L, Balance Sheet, etc.)',
                '3. Choose date range',
                '4. Click "Generate Report"',
                '5. Review the report',
                '6. Click "Export to PDF" or "Export to Excel"',
                '📄 Save and send to your accountant!'
            ]
        }
    };
    
    const guide = guides[topic];
    if (!guide) return;
    
    const container = document.getElementById('aiResponseContainer');
    if (!container) return;
    
    const stepsHtml = guide.steps.map(step => `<li style="margin-bottom: 8px;">${step}</li>`).join('');
    
    container.innerHTML = `
        <div class="ai-response">
            <div class="ai-avatar" style="background: #3b82f6;">
                <i class="fas fa-list-ol"></i>
            </div>
            <div class="response-content">
                <h3 style="color: white; margin-bottom: 15px;">${guide.title}</h3>
                <ol style="color: #cbd5e1; padding-left: 20px; line-height: 1.8;">
                    ${stepsHtml}
                </ol>
                <div class="response-actions" style="margin-top: 15px;">
                    <button class="ai-action-btn" onclick="askAIExample('What else can you help me with?')">More Help</button>
                    <button class="ai-action-btn outline" onclick="dismissContextualHelp()">Got it!</button>
                </div>
            </div>
        </div>
    `;
}

// ==================== INITIALIZATION ====================
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(function() {
        if (typeof initAIAssistant === 'function') {
            initAIAssistant();
        }
    }, 500);
});

// ==================== GLOBAL EXPORTS ====================
window.currentModuleTutorial = currentModuleTutorial;
window.moduleStep = moduleStep;
window.startModuleTutorial = startModuleTutorial;
window.displayModuleTutorialStep = displayModuleTutorialStep;
window.nextModuleStep = nextModuleStep;
window.prevModuleStep = prevModuleStep;
window.closeModuleTutorial = closeModuleTutorial;
window.showAllTutorials = showAllTutorials;
window.updateContextualHelp = updateContextualHelp;
window.showContextualHelp = showContextualHelp;
window.dismissContextualHelp = dismissContextualHelp;
window.showQuickGuide = showQuickGuide;
