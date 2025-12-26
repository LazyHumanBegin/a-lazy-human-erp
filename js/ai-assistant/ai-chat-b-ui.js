/**
 * EZCubic - AI Chat & Query Processing - Part B UI
 * Projects, Tutorials, Help, Voice Input, Automation, Learning Module
 * Split from ai-chat-b.js v2.2.6 - 26 Dec 2025
 * Part B UI: Project handlers, tutorial/help responses, voice input, automation, learning
 */

// ==================== PART B UI RESPONSE HANDLER ====================
// This function handles queries not covered by Part B Core
window._generateAIResponsePartBUI = function(query, lowerQuery, transactions, bills, currentYear, currentMonth, yearIncome, yearExpenses, monthIncome, monthExpenses) {
    
    // ==================== PROJECT QUESTIONS ====================
    if (lowerQuery.includes('project') || lowerQuery.includes('milestone') || lowerQuery.includes('task')) {
        if (lowerQuery.includes('create') || lowerQuery.includes('new') || lowerQuery.includes('how')) {
            return {
                text: `<strong>📋 How to Create & Manage Projects</strong>
                    <div style="margin-top: 15px; line-height: 1.8;">
                        <div style="background: rgba(20, 184, 166, 0.15); padding: 20px; border-radius: 10px;">
                            <strong style="color: #2dd4bf;">Creating a Project:</strong>
                            <ol style="color: #cbd5e1; padding-left: 20px; margin-top: 10px;">
                                <li style="margin-bottom: 8px;">Go to <strong>Projects</strong></li>
                                <li style="margin-bottom: 8px;">Click <strong>"New Project"</strong></li>
                                <li style="margin-bottom: 8px;">Enter details:
                                    <ul style="padding-left: 15px; margin-top: 5px; color: #94a3b8;">
                                        <li>Project name</li>
                                        <li>Client/Customer</li>
                                        <li>Start & end dates</li>
                                        <li>Budget</li>
                                    </ul>
                                </li>
                                <li style="margin-bottom: 8px;">Add <strong>Milestones</strong> (phases)</li>
                                <li>Add <strong>Tasks</strong> under each milestone</li>
                            </ol>
                        </div>
                        
                        <div style="margin-top: 15px; background: rgba(245, 158, 11, 0.15); padding: 12px; border-radius: 8px;">
                            <strong style="color: #fcd34d;">💡 Example Milestones:</strong>
                            <span style="color: #94a3b8;"> Design → Development → Testing → Launch</span>
                        </div>
                    </div>`,
                actions: [
                    { label: '📋 Go to Projects', action: "showSection('projects')" },
                    { label: '📚 Projects Tutorial', action: "startModuleTutorial('projects')" }
                ]
            };
        }
        
        if (lowerQuery.includes('profit') || lowerQuery.includes('budget') || lowerQuery.includes('cost')) {
            return {
                text: `<strong>💰 Project Profitability Tracking</strong>
                    <div style="margin-top: 15px; line-height: 1.8;">
                        <p>Track if your project is profitable before it ends!</p>
                        
                        <div style="display: grid; gap: 10px; margin: 15px 0;">
                            <div style="background: rgba(16, 185, 129, 0.15); padding: 12px; border-radius: 8px;">
                                <strong style="color: #6ee7b7;">Budget</strong>
                                <p style="color: #94a3b8; font-size: 13px;">Set when creating project - what client pays</p>
                            </div>
                            <div style="background: rgba(239, 68, 68, 0.15); padding: 12px; border-radius: 8px;">
                                <strong style="color: #fca5a5;">Costs</strong>
                                <p style="color: #94a3b8; font-size: 13px;">Add expenses as you incur them - materials, labor, etc.</p>
                            </div>
                            <div style="background: rgba(59, 130, 246, 0.15); padding: 12px; border-radius: 8px;">
                                <strong style="color: #93c5fd;">Profit = Budget - Costs</strong>
                                <p style="color: #94a3b8; font-size: 13px;">See real-time profit margin throughout the project</p>
                            </div>
                        </div>
                        
                        <p style="color: #f59e0b;">⚠️ If costs exceed budget, adjust scope or timeline!</p>
                    </div>`,
                actions: [
                    { label: '📋 View Projects', action: "showSection('projects')" }
                ]
            };
        }
    }
    
    // ==================== TUTORIAL/HELP REQUESTS ====================
    if (lowerQuery.includes('tutorial') || lowerQuery.includes('learn') || lowerQuery.includes('guide') || lowerQuery.includes('teach')) {
        return {
            text: `<strong>📚 Available Tutorials & Guides</strong>
                <div style="margin-top: 15px; line-height: 1.8;">
                    <p style="color: #cbd5e1;">Click any topic to start learning:</p>
                    
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 15px;">
                        <button onclick="startBeginnerTutorial()" style="background: rgba(59, 130, 246, 0.2); border: none; padding: 15px; border-radius: 8px; cursor: pointer; text-align: left;">
                            <strong style="color: #60a5fa;">🎓 Beginner Tutorial</strong>
                            <p style="color: #94a3b8; font-size: 12px; margin-top: 3px;">New to accounting? Start here!</p>
                        </button>
                        <button onclick="startModuleTutorial('dashboard')" style="background: rgba(16, 185, 129, 0.2); border: none; padding: 15px; border-radius: 8px; cursor: pointer; text-align: left;">
                            <strong style="color: #6ee7b7;">📊 Dashboard</strong>
                            <p style="color: #94a3b8; font-size: 12px; margin-top: 3px;">Understand your finances</p>
                        </button>
                        <button onclick="startModuleTutorial('pos')" style="background: rgba(139, 92, 246, 0.2); border: none; padding: 15px; border-radius: 8px; cursor: pointer; text-align: left;">
                            <strong style="color: #a78bfa;">🛒 POS System</strong>
                            <p style="color: #94a3b8; font-size: 12px; margin-top: 3px;">Make sales like a pro</p>
                        </button>
                        <button onclick="startModuleTutorial('inventory')" style="background: rgba(245, 158, 11, 0.2); border: none; padding: 15px; border-radius: 8px; cursor: pointer; text-align: left;">
                            <strong style="color: #fcd34d;">📦 Inventory</strong>
                            <p style="color: #94a3b8; font-size: 12px; margin-top: 3px;">Track your products</p>
                        </button>
                        <button onclick="startModuleTutorial('taxes')" style="background: rgba(239, 68, 68, 0.2); border: none; padding: 15px; border-radius: 8px; cursor: pointer; text-align: left;">
                            <strong style="color: #fca5a5;">🧾 Taxes</strong>
                            <p style="color: #94a3b8; font-size: 12px; margin-top: 3px;">Malaysian tax guide</p>
                        </button>
                        <button onclick="showAllTutorials()" style="background: rgba(100, 116, 139, 0.2); border: none; padding: 15px; border-radius: 8px; cursor: pointer; text-align: left;">
                            <strong style="color: #94a3b8;">📖 All Tutorials</strong>
                            <p style="color: #64748b; font-size: 12px; margin-top: 3px;">See full list</p>
                        </button>
                    </div>
                </div>`,
            actions: [
                { label: '🎓 Start Beginner Tutorial', action: "startBeginnerTutorial()" },
                { label: '📖 All Tutorials', action: "showAllTutorials()" }
            ]
        };
    }
    
    // ==================== HELP / WHAT CAN YOU DO ====================
    if (lowerQuery.includes('help') || lowerQuery.includes('what can you') || lowerQuery.includes('assist')) {
        return {
            text: `<strong>🤖 Hi! I'm your AI Assistant!</strong>
                <div style="margin-top: 15px; line-height: 1.8;">
                    <p style="color: #cbd5e1;">I can help you with lots of things:</p>
                    
                    <div style="display: grid; gap: 10px; margin-top: 15px;">
                        <div style="background: rgba(59, 130, 246, 0.15); padding: 12px; border-radius: 8px;">
                            <strong style="color: #60a5fa;">📚 Learn & Tutorial</strong>
                            <p style="color: #94a3b8; font-size: 12px;">Step-by-step guides for every feature</p>
                        </div>
                        <div style="background: rgba(16, 185, 129, 0.15); padding: 12px; border-radius: 8px;">
                            <strong style="color: #6ee7b7;">📊 Business Insights</strong>
                            <p style="color: #94a3b8; font-size: 12px;">"Show my profit", "Top expenses", "Cash flow"</p>
                        </div>
                        <div style="background: rgba(245, 158, 11, 0.15); padding: 12px; border-radius: 8px;">
                            <strong style="color: #fcd34d;">🧾 Tax Help</strong>
                            <p style="color: #94a3b8; font-size: 12px;">Malaysian tax rates, deductions, SST info</p>
                        </div>
                        <div style="background: rgba(239, 68, 68, 0.15); padding: 12px; border-radius: 8px;">
                            <strong style="color: #fca5a5;">📅 Reminders</strong>
                            <p style="color: #94a3b8; font-size: 12px;">"Bills due soon", upcoming payments</p>
                        </div>
                        <div style="background: rgba(139, 92, 246, 0.15); padding: 12px; border-radius: 8px;">
                            <strong style="color: #a78bfa;">🔧 How-To Guides</strong>
                            <p style="color: #94a3b8; font-size: 12px;">POS, Inventory, CRM, Projects, Quotations</p>
                        </div>
                    </div>
                    
                    <p style="margin-top: 15px; color: #f59e0b; font-size: 13px;">
                        💡 Just type your question or click the buttons below!
                    </p>
                </div>`,
            actions: [
                { label: '🎓 Start Tutorial', action: "startBeginnerTutorial()" },
                { label: '📊 My Profit', action: "askAIExample('Show my profit this month')" },
                { label: '📚 All Guides', action: "showAllTutorials()" }
            ]
        };
    }
    
    // ==================== DEFAULT RESPONSE ====================
    // More helpful with guided options
    return {
        text: `<strong>I'm here to help! 🤖</strong>
            <p style="margin-top: 10px; color: #cbd5e1;">I didn't quite catch that. Here's what I can do:</p>
            
            <div style="margin-top: 15px; display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                <div style="background: rgba(59, 130, 246, 0.15); padding: 12px; border-radius: 8px;">
                    <strong style="color: #60a5fa;">🚀 Getting Started</strong>
                    <p style="color: #94a3b8; font-size: 12px; margin-top: 3px;">"How do I get started?"</p>
                </div>
                <div style="background: rgba(16, 185, 129, 0.15); padding: 12px; border-radius: 8px;">
                    <strong style="color: #6ee7b7;">💰 Finances</strong>
                    <p style="color: #94a3b8; font-size: 12px; margin-top: 3px;">"Show my profit this month"</p>
                </div>
                <div style="background: rgba(245, 158, 11, 0.15); padding: 12px; border-radius: 8px;">
                    <strong style="color: #fcd34d;">🧾 Tax Help</strong>
                    <p style="color: #94a3b8; font-size: 12px; margin-top: 3px;">"How can I reduce my tax?"</p>
                </div>
                <div style="background: rgba(239, 68, 68, 0.15); padding: 12px; border-radius: 8px;">
                    <strong style="color: #fca5a5;">📅 Bills</strong>
                    <p style="color: #94a3b8; font-size: 12px; margin-top: 3px;">"What bills are due soon?"</p>
                </div>
            </div>
            
            <p style="margin-top: 15px; color: #94a3b8; font-size: 13px;">💡 Tip: Click the Quick Start buttons above for guided help!</p>`,
        actions: [
            { label: '🚀 Get Started', action: "askAIExample('How do I get started?')" },
            { label: '📊 Dashboard', action: "showSection('dashboard')" }
        ]
    };
};

// ==================== VOICE INPUT ====================
let isRecording = false;

function toggleVoiceInput() {
    const btn = document.getElementById('aiVoiceButton');
    
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
        if (typeof showNotification === 'function') showNotification('Voice input not supported in this browser', 'error');
        return;
    }
    
    if (isRecording) {
        stopVoiceInput();
        return;
    }
    
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    
    recognition.lang = 'en-MY';
    recognition.continuous = false;
    recognition.interimResults = false;
    
    recognition.onstart = function() {
        isRecording = true;
        btn.classList.add('active');
        btn.innerHTML = '<i class="fas fa-stop"></i>';
        if (typeof showNotification === 'function') showNotification('Listening...', 'info');
    };
    
    recognition.onresult = function(event) {
        const transcript = event.results[0][0].transcript;
        document.getElementById('aiQueryInput').value = transcript;
        processAIQuery();
    };
    
    recognition.onerror = function(event) {
        if (typeof showNotification === 'function') showNotification('Voice recognition error: ' + event.error, 'error');
        stopVoiceInput();
    };
    
    recognition.onend = function() {
        stopVoiceInput();
    };
    
    recognition.start();
}

function stopVoiceInput() {
    const btn = document.getElementById('aiVoiceButton');
    isRecording = false;
    if (btn) {
        btn.classList.remove('active');
        btn.innerHTML = '<i class="fas fa-microphone"></i>';
    }
}

// ==================== AUTOMATION ====================
function runAutomation(type) {
    if (typeof showNotification === 'function') showNotification(`Running ${type} automation...`, 'info');
    
    switch (type) {
        case 'categorize':
            autoCategorizeTransactions();
            break;
        case 'duplicates':
            findAndShowDuplicates();
            break;
        case 'tax-optimize':
            showTaxOptimization();
            break;
        case 'report-generate':
            goToMonthlyReports();
            break;
        case 'predict-cashflow':
            showCashFlowPrediction();
            break;
        case 'receipts':
            if (typeof showNotification === 'function') showNotification('Receipt analysis coming soon!', 'info');
            break;
        default:
            if (typeof showNotification === 'function') showNotification('Automation not available', 'error');
    }
    
    if (window.aiState) {
        window.aiState.tasksCompleted++;
        window.aiState.timeSaved += 0.5;
    }
    if (typeof updateAIStats === 'function') updateAIStats();
    if (typeof saveAIState === 'function') saveAIState();
}

function runAllAutomations() {
    if (typeof showNotification === 'function') showNotification('Running all automations...', 'info');
    
    setTimeout(() => autoCategorizeTransactions(), 500);
    setTimeout(() => findAndShowDuplicates(), 1500);
    
    if (window.aiState) {
        window.aiState.tasksCompleted += 2;
        window.aiState.timeSaved += 1;
    }
    if (typeof updateAIStats === 'function') updateAIStats();
    if (typeof saveAIState === 'function') saveAIState();
}

function autoCategorizeTransactions() {
    const transactions = (window.businessData && window.businessData.transactions) || [];
    let categorized = 0;
    
    const patterns = {
        'rent|sewa': 'Rent',
        'electric|tnb|water|air|utility': 'Utilities',
        'supplies|stationery|office': 'Office Supplies',
        'salary|wage|gaji|epf|socso': 'Salaries',
        'marketing|ads|promotion|iklan': 'Marketing',
        'travel|petrol|toll|parking|fuel': 'Travel',
        'lawyer|accountant|consultant|professional': 'Professional Fees',
        'food|meal|lunch|dinner|makan': 'Meals & Entertainment',
        'phone|internet|telco|mobile': 'Telecommunications',
        'insurance|insuran': 'Insurance',
        'bank|charge|fee': 'Bank Charges'
    };
    
    transactions.forEach(t => {
        if (!t.category || t.category === 'Other' || t.category === 'Uncategorized') {
            const desc = (t.description || '').toLowerCase();
            for (const [pattern, category] of Object.entries(patterns)) {
                if (new RegExp(pattern, 'i').test(desc)) {
                    t.category = category;
                    categorized++;
                    break;
                }
            }
        }
    });
    
    if (categorized > 0) {
        if (typeof saveData === 'function') saveData();
        if (typeof showNotification === 'function') showNotification(`Categorized ${categorized} transactions!`, 'success');
    } else {
        if (typeof showNotification === 'function') showNotification('All transactions are already categorized', 'info');
    }
}

function findAndShowDuplicates() {
    const duplicates = typeof findDuplicateTransactions === 'function' ? findDuplicateTransactions() : [];
    
    if (duplicates.length === 0) {
        if (typeof showNotification === 'function') showNotification('No duplicate transactions found!', 'success');
        return;
    }
    
    if (typeof showNotification === 'function') showNotification(`Found ${duplicates.length} potential duplicates. Review in transactions.`, 'warning');
    if (typeof showSection === 'function') showSection('transactions');
}

function showTaxOptimization() {
    if (typeof showSection === 'function') showSection('taxes');
    setTimeout(() => {
        if (typeof showNotification === 'function') showNotification('Review tax optimization suggestions in the Tax Center', 'info');
    }, 500);
}

function goToMonthlyReports() {
    if (typeof showSection === 'function') showSection('monthly-reports');
    if (typeof showNotification === 'function') showNotification('Monthly report generated!', 'success');
}

function showCashFlowPrediction() {
    askAIExample('Predict my cash flow next month');
}

// ==================== LEARNING MODULE ====================
function startLearning(topic) {
    const modules = {
        'basic-accounting': {
            title: 'Accounting Basics for Malaysian Businesses',
            content: `
                <h4>Understanding the Basics</h4>
                <p><strong>Assets</strong> = What you own (cash, equipment, inventory)</p>
                <p><strong>Liabilities</strong> = What you owe (loans, accounts payable)</p>
                <p><strong>Equity</strong> = Assets - Liabilities (your net worth)</p>
                <br>
                <h4>The Accounting Equation</h4>
                <p style="font-size: 18px; color: #60a5fa;"><strong>Assets = Liabilities + Equity</strong></p>
            `
        },
        'malaysian-tax': {
            title: 'Malaysian Tax Guide',
            content: `
                <h4>Corporate Tax Rates (SME - YA2024)</h4>
                <ul>
                    <li>First RM 150,000: <strong>15%</strong></li>
                    <li>RM 150,001 - RM 600,000: <strong>17%</strong></li>
                    <li>Above RM 600,000: <strong>24%</strong></li>
                </ul>
                <br>
                <h4>SST Rates</h4>
                <ul>
                    <li>Sales Tax: <strong>10%</strong> (goods)</li>
                    <li>Service Tax: <strong>6%</strong> (services)</li>
                    <li>Registration threshold: RM 500,000/year</li>
                </ul>
            `
        },
        'cash-flow': {
            title: 'Cash Flow Management',
            content: `
                <h4>Cash Flow Basics</h4>
                <p>Cash flow = Cash inflows - Cash outflows</p>
                <br>
                <h4>Tips for Better Cash Flow</h4>
                <ul>
                    <li>Invoice promptly and follow up</li>
                    <li>Negotiate better payment terms with suppliers</li>
                    <li>Monitor receivables regularly</li>
                    <li>Maintain emergency reserves</li>
                </ul>
            `
        }
    };
    
    const module = modules[topic];
    if (!module) {
        if (typeof showNotification === 'function') showNotification('Module coming soon!', 'info');
        return;
    }
    
    const container = document.getElementById('aiResponseContainer');
    if (container) {
        container.innerHTML += `
            <div class="ai-response">
                <div class="ai-avatar"><i class="fas fa-graduation-cap"></i></div>
                <div class="response-content">
                    <h3 style="color: white; margin-bottom: 15px;">${module.title}</h3>
                    <div class="response-text">${module.content}</div>
                </div>
            </div>
        `;
        container.scrollTop = container.scrollHeight;
    }
    
    // Update learning progress
    if (window.aiState) {
        window.aiState.learningProgress = Math.min(100, (window.aiState.learningProgress || 0) + 33);
        const progressPercent = document.getElementById('learningProgressPercent');
        const progressBar = document.getElementById('learningProgressBar');
        if (progressPercent) progressPercent.textContent = window.aiState.learningProgress + '% Complete';
        if (progressBar) progressBar.style.width = window.aiState.learningProgress + '%';
    }
    if (typeof saveAIState === 'function') saveAIState();
}

// ==================== GLOBAL EXPORTS (PART B UI) ====================
window.toggleVoiceInput = toggleVoiceInput;
window.stopVoiceInput = stopVoiceInput;
window.isRecording = isRecording;
window.runAutomation = runAutomation;
window.runAllAutomations = runAllAutomations;
window.autoCategorizeTransactions = autoCategorizeTransactions;
window.findAndShowDuplicates = findAndShowDuplicates;
window.showTaxOptimization = showTaxOptimization;
window.goToMonthlyReports = goToMonthlyReports;
window.showCashFlowPrediction = showCashFlowPrediction;
window.startLearning = startLearning;
