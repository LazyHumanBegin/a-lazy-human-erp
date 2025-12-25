/**
 * EZCubic - AI Tutorials System
 * Beginner tutorials, module tutorials, contextual help, quick guides
 * Split from ai-assistant.js v2.2.6 - 26 Dec 2025
 */

// ==================== BEGINNER'S TUTORIAL SYSTEM ====================
let tutorialStep = 0;
const tutorialSteps = [
    {
        title: "Welcome to A Lazy Human! 🎉",
        content: `
            <div style="line-height: 1.8;">
                <p>Hi there! I'm your AI accounting assistant. Don't worry if you've <strong>never done accounting before</strong> - I'll make it super easy!</p>
                <div style="background: rgba(59, 130, 246, 0.2); padding: 15px; border-radius: 10px; margin: 15px 0;">
                    <strong style="color: #60a5fa;">🎯 What is EZCubic?</strong>
                    <p style="color: #cbd5e1; margin-top: 8px;">It's like a simple notebook for your business money - tracking what comes IN (income) and what goes OUT (expenses).</p>
                </div>
                <p style="color: #f59e0b;"><i class="fas fa-clock"></i> This tutorial takes about 5 minutes. Ready?</p>
            </div>`,
        actions: [
            { label: "Let's Go! →", action: "nextTutorialStep()" },
            { label: "Skip Tutorial", action: "skipTutorial()" }
        ]
    },
    {
        title: "Step 1: Understanding Money Flow 💰",
        content: `
            <div style="line-height: 1.8;">
                <p>Every business has two types of money movement:</p>
                
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin: 20px 0;">
                    <div style="background: rgba(16, 185, 129, 0.2); padding: 20px; border-radius: 10px; border-left: 4px solid #10b981;">
                        <h4 style="color: #6ee7b7; margin-bottom: 10px;"><i class="fas fa-arrow-down"></i> INCOME</h4>
                        <p style="color: #cbd5e1; font-size: 13px;">Money coming INTO your business</p>
                        <ul style="color: #94a3b8; font-size: 12px; margin-top: 10px; padding-left: 15px;">
                            <li>Sales to customers</li>
                            <li>Payment for services</li>
                            <li>Interest earned</li>
                        </ul>
                    </div>
                    <div style="background: rgba(239, 68, 68, 0.2); padding: 20px; border-radius: 10px; border-left: 4px solid #ef4444;">
                        <h4 style="color: #fca5a5; margin-bottom: 10px;"><i class="fas fa-arrow-up"></i> EXPENSES</h4>
                        <p style="color: #cbd5e1; font-size: 13px;">Money going OUT of your business</p>
                        <ul style="color: #94a3b8; font-size: 12px; margin-top: 10px; padding-left: 15px;">
                            <li>Rent, utilities</li>
                            <li>Supplies, inventory</li>
                            <li>Salaries, fees</li>
                        </ul>
                    </div>
                </div>
                
                <div style="background: rgba(245, 158, 11, 0.2); padding: 15px; border-radius: 10px;">
                    <strong style="color: #fcd34d;">💡 Simple Formula:</strong>
                    <p style="color: white; font-size: 16px; margin-top: 8px;">Income - Expenses = <strong>Profit</strong> (or Loss)</p>
                </div>
            </div>`,
        actions: [
            { label: "← Back", action: "prevTutorialStep()" },
            { label: "Got it! Next →", action: "nextTutorialStep()" }
        ]
    },
    {
        title: "Step 2: Your First Task - Set Up Profile 🏢",
        content: `
            <div style="line-height: 1.8;">
                <p>Let's set up your business profile. This info appears on your reports.</p>
                
                <div style="background: rgba(255,255,255,0.05); padding: 20px; border-radius: 10px; margin: 15px 0;">
                    <h4 style="color: white; margin-bottom: 15px;">You'll need:</h4>
                    <div style="display: grid; gap: 10px;">
                        <div style="display: flex; align-items: center; gap: 10px; color: #cbd5e1;">
                            <i class="fas fa-check-circle" style="color: #10b981;"></i>
                            <span><strong>Business Name</strong> - Your company/shop name</span>
                        </div>
                        <div style="display: flex; align-items: center; gap: 10px; color: #cbd5e1;">
                            <i class="fas fa-check-circle" style="color: #10b981;"></i>
                            <span><strong>SSM Number</strong> - Company registration (optional)</span>
                        </div>
                        <div style="display: flex; align-items: center; gap: 10px; color: #cbd5e1;">
                            <i class="fas fa-check-circle" style="color: #10b981;"></i>
                            <span><strong>Address</strong> - Business address</span>
                        </div>
                    </div>
                </div>
                
                <p style="color: #94a3b8; font-size: 13px;"><i class="fas fa-info-circle"></i> Don't have SSM? No problem! Just enter your business name to start.</p>
            </div>`,
        actions: [
            { label: "← Back", action: "prevTutorialStep()" },
            { label: "⚙️ Go to Settings", action: "showSection('settings'); nextTutorialStep()" },
            { label: "Skip, Next →", action: "nextTutorialStep()" }
        ]
    },
    {
        title: "Step 3: Record Your First Income 💵",
        content: `
            <div style="line-height: 1.8;">
                <p>Now let's add your first income! This is how you record money coming in.</p>
                
                <div style="background: rgba(16, 185, 129, 0.15); padding: 20px; border-radius: 10px; margin: 15px 0;">
                    <h4 style="color: #6ee7b7; margin-bottom: 15px;"><i class="fas fa-hand-holding-usd"></i> Example: Recording a Sale</h4>
                    <ol style="color: #cbd5e1; padding-left: 20px;">
                        <li style="margin-bottom: 8px;">Click <strong>"Record Income"</strong> in the menu</li>
                        <li style="margin-bottom: 8px;">Enter <strong>Amount</strong>: RM 500.00</li>
                        <li style="margin-bottom: 8px;">Add <strong>Description</strong>: "Sale to Customer ABC"</li>
                        <li style="margin-bottom: 8px;">Pick the <strong>Date</strong></li>
                        <li>Click <strong>"Add Income"</strong> button</li>
                    </ol>
                </div>
                
                <div style="background: rgba(59, 130, 246, 0.2); padding: 12px; border-radius: 8px;">
                    <strong style="color: #60a5fa;">🎯 Pro Tip:</strong>
                    <span style="color: #cbd5e1;"> Add income right after you receive payment so you don't forget!</span>
                </div>
            </div>`,
        actions: [
            { label: "← Back", action: "prevTutorialStep()" },
            { label: "➕ Try Adding Income", action: "showSection('income'); nextTutorialStep()" },
            { label: "Next →", action: "nextTutorialStep()" }
        ]
    },
    {
        title: "Step 4: Record Expenses 📝",
        content: `
            <div style="line-height: 1.8;">
                <p>Tracking expenses is <strong>super important</strong> for knowing your real profit!</p>
                
                <div style="background: rgba(239, 68, 68, 0.15); padding: 20px; border-radius: 10px; margin: 15px 0;">
                    <h4 style="color: #fca5a5; margin-bottom: 15px;"><i class="fas fa-shopping-cart"></i> Example: Recording an Expense</h4>
                    <ol style="color: #cbd5e1; padding-left: 20px;">
                        <li style="margin-bottom: 8px;">Click <strong>"Record Expenses"</strong> in the menu</li>
                        <li style="margin-bottom: 8px;">Enter <strong>Amount</strong>: RM 150.00</li>
                        <li style="margin-bottom: 8px;">Select <strong>Category</strong>: Office Supplies</li>
                        <li style="margin-bottom: 8px;">Add <strong>Description</strong>: "Printer paper & ink"</li>
                        <li>Click <strong>"Add Expense"</strong></li>
                    </ol>
                </div>
                
                <div style="background: rgba(245, 158, 11, 0.2); padding: 12px; border-radius: 8px;">
                    <strong style="color: #fcd34d;">💡 Why Categories?</strong>
                    <span style="color: #cbd5e1;"> Proper categories = better tax deductions = more savings!</span>
                </div>
            </div>`,
        actions: [
            { label: "← Back", action: "prevTutorialStep()" },
            { label: "➖ Try Adding Expense", action: "showSection('expenses'); nextTutorialStep()" },
            { label: "Next →", action: "nextTutorialStep()" }
        ]
    },
    {
        title: "Step 5: Understanding Your Dashboard 📊",
        content: `
            <div style="line-height: 1.8;">
                <p>Your dashboard shows everything at a glance!</p>
                
                <div style="display: grid; gap: 12px; margin: 15px 0;">
                    <div style="background: rgba(16, 185, 129, 0.15); padding: 15px; border-radius: 8px; display: flex; align-items: center; gap: 15px;">
                        <i class="fas fa-arrow-down" style="font-size: 24px; color: #10b981;"></i>
                        <div>
                            <strong style="color: #6ee7b7;">Total Revenue</strong>
                            <p style="color: #94a3b8; font-size: 12px; margin-top: 3px;">Sum of all your income/sales</p>
                        </div>
                    </div>
                    <div style="background: rgba(239, 68, 68, 0.15); padding: 15px; border-radius: 8px; display: flex; align-items: center; gap: 15px;">
                        <i class="fas fa-arrow-up" style="font-size: 24px; color: #ef4444;"></i>
                        <div>
                            <strong style="color: #fca5a5;">Total Expenses</strong>
                            <p style="color: #94a3b8; font-size: 12px; margin-top: 3px;">Sum of all your costs</p>
                        </div>
                    </div>
                    <div style="background: rgba(59, 130, 246, 0.15); padding: 15px; border-radius: 8px; display: flex; align-items: center; gap: 15px;">
                        <i class="fas fa-chart-line" style="font-size: 24px; color: #3b82f6;"></i>
                        <div>
                            <strong style="color: #93c5fd;">Net Profit/Loss</strong>
                            <p style="color: #94a3b8; font-size: 12px; margin-top: 3px;">Revenue minus Expenses = Your profit!</p>
                        </div>
                    </div>
                </div>
                
                <p style="color: #10b981;">✓ Green numbers = Good (making money)</p>
                <p style="color: #ef4444;">✗ Red numbers = Review needed (spending more than earning)</p>
            </div>`,
        actions: [
            { label: "← Back", action: "prevTutorialStep()" },
            { label: "📊 View Dashboard", action: "showSection('dashboard'); nextTutorialStep()" },
            { label: "Next →", action: "nextTutorialStep()" }
        ]
    },
    {
        title: "You're Ready! 🎓",
        content: `
            <div style="line-height: 1.8;">
                <div style="text-align: center; margin-bottom: 20px;">
                    <i class="fas fa-trophy" style="font-size: 48px; color: #f59e0b;"></i>
                    <h3 style="color: white; margin-top: 15px;">Congratulations! Tutorial Complete!</h3>
                </div>
                
                <p>You now know the basics! Here's what you learned:</p>
                
                <div style="background: rgba(16, 185, 129, 0.15); padding: 20px; border-radius: 10px; margin: 15px 0;">
                    <ul style="color: #cbd5e1; padding-left: 20px;">
                        <li style="margin-bottom: 8px;">✓ Income vs Expenses</li>
                        <li style="margin-bottom: 8px;">✓ How to record transactions</li>
                        <li style="margin-bottom: 8px;">✓ Understanding your dashboard</li>
                        <li>✓ What profit means</li>
                    </ul>
                </div>
                
                <div style="background: rgba(59, 130, 246, 0.2); padding: 15px; border-radius: 10px;">
                    <strong style="color: #60a5fa;">💡 What's Next?</strong>
                    <ul style="color: #cbd5e1; font-size: 13px; margin-top: 10px; padding-left: 20px;">
                        <li>Add your actual income & expenses</li>
                        <li>Set up recurring bills</li>
                        <li>Check the Tax section for tax estimates</li>
                        <li>Ask me anytime you have questions!</li>
                    </ul>
                </div>
            </div>`,
        actions: [
            { label: "📊 Go to Dashboard", action: "showSection('dashboard'); closeTutorial()" },
            { label: "➕ Add Income", action: "showSection('income'); closeTutorial()" },
            { label: "🔄 Restart Tutorial", action: "restartTutorial()" }
        ]
    }
];

function startBeginnerTutorial() {
    tutorialStep = 0;
    displayTutorialStep();
    if (typeof showNotification === 'function') showNotification('Tutorial started! Let\'s learn accounting together 🎓', 'success');
    
    // Mark tutorial as started
    if (window.aiState) {
        window.aiState.tutorialStarted = true;
        if (typeof saveAIState === 'function') saveAIState();
    }
}

function displayTutorialStep() {
    const step = tutorialSteps[tutorialStep];
    if (!step) return;
    
    const container = document.getElementById('aiResponseContainer');
    if (!container) return;
    
    const actionsHtml = step.actions.map(a => 
        `<button class="ai-action-btn" onclick="${a.action}">${a.label}</button>`
    ).join('');
    
    container.innerHTML = `
        <div class="ai-response tutorial-response" style="border: 2px solid rgba(59, 130, 246, 0.3); background: rgba(59, 130, 246, 0.05);">
            <div class="ai-avatar" style="background: linear-gradient(135deg, #3b82f6, #8b5cf6);">
                <i class="fas fa-graduation-cap"></i>
            </div>
            <div class="response-content">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                    <h3 style="color: white;">${step.title}</h3>
                    <span style="color: #60a5fa; font-size: 12px;">Step ${tutorialStep + 1} of ${tutorialSteps.length}</span>
                </div>
                <div class="response-text">${step.content}</div>
                <div class="response-actions" style="margin-top: 15px;">
                    ${actionsHtml}
                </div>
            </div>
        </div>
    `;
    container.scrollTop = 0;
    
    // Update learning progress
    if (window.aiState) {
        window.aiState.learningProgress = Math.round((tutorialStep / (tutorialSteps.length - 1)) * 100);
        const progressEl = document.getElementById('learningProgressPercent');
        const progressBar = document.getElementById('learningProgressBar');
        if (progressEl) progressEl.textContent = window.aiState.learningProgress + '% Complete';
        if (progressBar) progressBar.style.width = window.aiState.learningProgress + '%';
    }
}

function nextTutorialStep() {
    if (tutorialStep < tutorialSteps.length - 1) {
        tutorialStep++;
        displayTutorialStep();
    }
}

function prevTutorialStep() {
    if (tutorialStep > 0) {
        tutorialStep--;
        displayTutorialStep();
    }
}

function skipTutorial() {
    closeTutorial();
    if (typeof showNotification === 'function') showNotification('Tutorial skipped. You can restart anytime from AI Assistant!', 'info');
}

function closeTutorial() {
    // Show default AI response
    const container = document.getElementById('aiResponseContainer');
    if (container) {
        container.innerHTML = `
            <div class="ai-response">
                <div class="ai-avatar">
                    <img src="images/ai-logo.png" alt="AI" class="ai-logo-img">
                </div>
                <div class="response-content">
                    <div class="response-text">
                        <strong style="color: #10b981;">🎓 Tutorial Complete!</strong>
                        <p style="margin-top: 10px; color: #cbd5e1;">
                            Great job! You're now ready to use EZCubic. Remember:
                        </p>
                        <ul style="margin-top: 10px; padding-left: 20px; color: #94a3b8;">
                            <li>Record income when you receive money</li>
                            <li>Record expenses when you spend money</li>
                            <li>Check your dashboard regularly</li>
                            <li>Ask me if you have any questions!</li>
                        </ul>
                    </div>
                </div>
            </div>
        `;
    }
    
    if (window.aiState) {
        window.aiState.tutorialCompleted = true;
        window.aiState.learningProgress = 100;
        if (typeof saveAIState === 'function') saveAIState();
    }
}

function restartTutorial() {
    tutorialStep = 0;
    if (window.aiState) {
        window.aiState.learningProgress = 0;
    }
    displayTutorialStep();
}

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
window.startBeginnerTutorial = startBeginnerTutorial;
window.displayTutorialStep = displayTutorialStep;
window.nextTutorialStep = nextTutorialStep;
window.prevTutorialStep = prevTutorialStep;
window.skipTutorial = skipTutorial;
window.closeTutorial = closeTutorial;
window.restartTutorial = restartTutorial;
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
