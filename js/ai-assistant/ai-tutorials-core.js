/**
 * EZCubic - AI Tutorials Core
 * Beginner tutorial system with step-by-step learning
 * Split from ai-tutorials.js v2.2.6 - 26 Dec 2025
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

// ==================== GLOBAL EXPORTS ====================
window.tutorialStep = tutorialStep;
window.tutorialSteps = tutorialSteps;
window.startBeginnerTutorial = startBeginnerTutorial;
window.displayTutorialStep = displayTutorialStep;
window.nextTutorialStep = nextTutorialStep;
window.prevTutorialStep = prevTutorialStep;
window.skipTutorial = skipTutorial;
window.closeTutorial = closeTutorial;
window.restartTutorial = restartTutorial;
