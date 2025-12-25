// ==================== E-INVOICE-DEMO.JS ====================
// LHDN MyInvois e-Invoice Integration - Demo Mode
// Part C of e-invoice.js split
// Version: 2.1.5 - 17 Dec 2025

// ==================== DEMO MODE ====================
// Demo functions for testing e-Invoice workflow without real credentials

function runEInvoiceDemo() {
    // Show demo walkthrough modal
    const modalHtml = `
        <div class="modal-overlay" id="demoWalkthroughModal" style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.7); display: flex; align-items: center; justify-content: center; z-index: 10000;">
            <div class="modal-content" style="background: white; border-radius: 16px; max-width: 600px; width: 90%; overflow: hidden;">
                <div style="background: linear-gradient(135deg, #8b5cf6, #6366f1); padding: 30px; color: white; text-align: center;">
                    <i class="fas fa-flask" style="font-size: 50px; margin-bottom: 15px;"></i>
                    <h2 style="margin: 0;">e-Invoice Demo Mode</h2>
                    <p style="margin: 10px 0 0; opacity: 0.9;">Experience the complete e-Invoice workflow</p>
                </div>
                <div style="padding: 25px;">
                    <div style="margin-bottom: 20px;">
                        <h4 style="color: #1e293b; margin-bottom: 15px;"><i class="fas fa-info-circle" style="color: #3b82f6;"></i> What this demo will show:</h4>
                        <ul style="color: #64748b; line-height: 1.8; padding-left: 20px;">
                            <li>Generate sample invoices with realistic Malaysian business data</li>
                            <li>Simulate submission to LHDN MyInvois (sandbox)</li>
                            <li>View UBL 2.1 document format used by LHDN</li>
                            <li>Track submission status (Submitted → Valid/Invalid)</li>
                            <li>Test cancellation workflow</li>
                        </ul>
                    </div>
                    
                    <div style="background: #f0fdf4; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                        <div style="display: flex; align-items: center; gap: 10px; color: #166534;">
                            <i class="fas fa-check-circle"></i>
                            <span><strong>No real LHDN credentials needed!</strong> All data is simulated.</span>
                        </div>
                    </div>
                    
                    <div style="display: flex; gap: 10px; justify-content: flex-end;">
                        <button class="btn-secondary" onclick="document.getElementById('demoWalkthroughModal').remove()">Cancel</button>
                        <button class="btn-primary" onclick="startDemoSequence()" style="background: linear-gradient(135deg, #8b5cf6, #6366f1);">
                            <i class="fas fa-play"></i> Start Demo
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);
}

async function startDemoSequence() {
    // Close walkthrough modal
    const walkthroughModal = document.getElementById('demoWalkthroughModal');
    if (walkthroughModal) walkthroughModal.remove();
    
    try {
        // Enable demo settings
        eInvoiceSettings = {
            enabled: true,
            environment: 'sandbox',
            demoMode: true,
            clientId: 'DEMO_CLIENT_ID',
            clientSecret: 'DEMO_SECRET',
            tin: 'C20231234567',
            brn: '202301012345',
            msic: '62011',
            businessActivityDesc: 'Computer programming activities',
            autoSubmit: false
        };
        saveEInvoiceData();
        
        showNotification('🎮 Demo mode enabled! Generating sample invoice...', 'success');
        
        // Wait a moment for visual feedback
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Generate first demo invoice
        await generateDemoInvoice();
        
        // Update UI
        if (typeof window.updateEInvoiceStatusBanner === 'function') {
            window.updateEInvoiceStatusBanner();
        }
        
        // Show success message
        setTimeout(() => {
            showNotification('✅ Demo invoice created! Check the submissions table below.', 'success');
        }, 500);
    } catch (error) {
        console.error('Demo sequence error:', error);
        showNotification('Demo error: ' + error.message, 'error');
    }
}

async function generateDemoInvoice() {
    try {
        // Random customer
        const customer = DEMO_CUSTOMERS[Math.floor(Math.random() * DEMO_CUSTOMERS.length)];
        
        // Random products (1-4 items)
        const numItems = Math.floor(Math.random() * 4) + 1;
        const items = [];
        const usedProducts = new Set();
        
        for (let i = 0; i < numItems; i++) {
            let productIdx;
            do {
                productIdx = Math.floor(Math.random() * DEMO_PRODUCTS.length);
            } while (usedProducts.has(productIdx) && usedProducts.size < DEMO_PRODUCTS.length);
            
            usedProducts.add(productIdx);
            const product = DEMO_PRODUCTS[productIdx];
            const qty = Math.floor(Math.random() * 5) + 1;
            
            items.push({
                name: product.name,
                description: product.name,
                quantity: qty,
                unitPrice: product.price,
                unit: product.unit,
                total: qty * product.price,
                tax: 0
            });
        }
        
        const subtotal = items.reduce((sum, item) => sum + item.total, 0);
        const taxRate = 0; // SST exempt for demo
        const tax = subtotal * taxRate;
        const total = subtotal + tax;
        
        // Generate invoice number using customizable document numbering if available
        const date = new Date();
        let invNum;
        if (typeof generateDocumentNumber === 'function') {
            invNum = generateDocumentNumber('invoice');
        } else {
            invNum = `INV${date.getFullYear()}${(date.getMonth() + 1).toString().padStart(2, '0')}${Math.floor(Math.random() * 9000 + 1000)}`;
        }
        
        // Create demo invoice object
        const demoInvoice = {
            id: 'DEMO_' + Date.now(),
            invoiceNumber: invNum,
            date: date.toISOString().slice(0, 10),
            customer: {
                name: customer.name,
                company: customer.name,
                tin: customer.tin,
                brn: customer.brn,
                address: customer.address,
                state: customer.state,
                city: customer.state,
                postcode: '50000'
            },
            items: items,
            subtotal: subtotal,
            tax: tax,
            taxRate: taxRate * 100,
            total: total,
            type: '01'
        };
        
        // Generate UBL document
        const ublData = formatUBLInvoice(demoInvoice);
        
        // Simulate random status
        const statuses = ['Submitted', 'Submitted', 'Valid', 'Valid', 'Valid'];
        const randomStatus = statuses[Math.floor(Math.random() * statuses.length)];
        
        // Create submission record
        const submission = {
            id: generateSubmissionId(),
            invoiceId: demoInvoice.id,
            invoiceNumber: demoInvoice.invoiceNumber,
            customerName: customer.name,
            amount: total,
            submissionUid: 'DEMO_SUB_' + Date.now(),
            uuid: ublData.uuid || generateUUID(),
            longId: 'DEMO_LONG_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
            status: randomStatus,
            submittedAt: new Date().toISOString(),
            validatedAt: randomStatus === 'Valid' ? new Date().toISOString() : null,
            environment: 'sandbox',
            isDemo: true,
            ublDocument: ublData.document,
            response: {
                acceptedDocuments: [{
                    uuid: ublData.uuid,
                    invoiceCodeNumber: demoInvoice.invoiceNumber
                }]
            }
        };
        
        eInvoiceSubmissions.push(submission);
        saveEInvoiceData();
        
        // Refresh the submissions table
        loadEInvoiceSubmissions();
        updateEInvoiceStats();
        
        showNotification(`📄 Demo invoice ${invNum} created (${randomStatus})`, 'success');
        
        return submission;
    } catch (error) {
        console.error('Generate demo invoice error:', error);
        showNotification('Error generating demo: ' + error.message, 'error');
        return null;
    }
}

function clearDemoData() {
    if (!confirm('Clear all demo e-Invoice data? This will remove all demo submissions.')) {
        return;
    }
    
    // Remove demo submissions
    eInvoiceSubmissions = eInvoiceSubmissions.filter(s => !s.isDemo);
    
    // Reset demo settings if in demo mode
    if (eInvoiceSettings.demoMode) {
        eInvoiceSettings = {
            enabled: false,
            environment: 'sandbox',
            demoMode: false,
            clientId: '',
            clientSecret: '',
            tin: '',
            brn: '',
            msic: '',
            businessActivityDesc: '',
            autoSubmit: false
        };
    }
    
    saveEInvoiceData();
    loadEInvoiceSubmissions();
    updateEInvoiceStats();
    
    if (typeof window.updateEInvoiceStatusBanner === 'function') {
        window.updateEInvoiceStatusBanner();
    }
    
    showNotification('🗑️ Demo data cleared', 'success');
}

// Simulate status check for demo
function simulateStatusCheck(submissionId) {
    const sub = eInvoiceSubmissions.find(s => s.id === submissionId);
    if (!sub) return;
    
    showNotification('🔄 Checking status with LHDN...', 'info');
    
    setTimeout(() => {
        // 80% chance of Valid, 20% chance of Invalid
        sub.status = Math.random() > 0.2 ? 'Valid' : 'Invalid';
        sub.validatedAt = new Date().toISOString();
        
        if (sub.status === 'Invalid') {
            sub.validationErrors = [
                { code: 'BR-MY-01', message: 'Demo validation error for testing purposes' }
            ];
        }
        
        saveEInvoiceData();
        loadEInvoiceSubmissions();
        updateEInvoiceStats();
        
        const icon = sub.status === 'Valid' ? '✅' : '❌';
        showNotification(`${icon} Status updated: ${sub.status}`, sub.status === 'Valid' ? 'success' : 'error');
    }, 1500);
}

// View UBL document
function viewUBLDocument(submissionId) {
    const sub = eInvoiceSubmissions.find(s => s.id === submissionId);
    if (!sub || !sub.ublDocument) {
        showNotification('UBL document not available', 'warning');
        return;
    }
    
    const ublJson = JSON.stringify(sub.ublDocument, null, 2);
    
    const modalHtml = `
        <div class="modal-overlay" style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 10000;">
            <div class="modal-content" style="background: white; border-radius: 12px; max-width: 800px; width: 95%; max-height: 85vh; display: flex; flex-direction: column;">
                <div style="padding: 20px; border-bottom: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center;">
                    <h3 style="margin: 0;"><i class="fas fa-code" style="color: #8b5cf6;"></i> UBL 2.1 Document</h3>
                    <button class="btn-icon" onclick="this.closest('.modal-overlay').remove()" style="font-size: 20px;">×</button>
                </div>
                <div style="padding: 20px; overflow-y: auto; flex: 1;">
                    <div style="background: #f8fafc; padding: 10px; border-radius: 6px; margin-bottom: 15px;">
                        <strong>Invoice:</strong> ${escapeHTML(sub.invoiceNumber)} | 
                        <strong>UUID:</strong> ${sub.uuid}
                    </div>
                    <pre style="background: #1e293b; color: #e2e8f0; padding: 20px; border-radius: 8px; overflow-x: auto; font-size: 12px; line-height: 1.5; max-height: 400px;">${escapeHTML(ublJson)}</pre>
                </div>
                <div style="padding: 15px 20px; border-top: 1px solid #e2e8f0; display: flex; justify-content: flex-end; gap: 10px;">
                    <button class="btn-outline" onclick="copyUBLToClipboard('${submissionId}')">
                        <i class="fas fa-copy"></i> Copy JSON
                    </button>
                    <button class="btn-secondary" onclick="this.closest('.modal-overlay').remove()">Close</button>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);
}

function copyUBLToClipboard(submissionId) {
    const sub = eInvoiceSubmissions.find(s => s.id === submissionId);
    if (!sub || !sub.ublDocument) return;
    
    const ublJson = JSON.stringify(sub.ublDocument, null, 2);
    navigator.clipboard.writeText(ublJson).then(() => {
        showNotification('📋 UBL document copied to clipboard!', 'success');
    }).catch(() => {
        showNotification('Failed to copy', 'error');
    });
}

// ==================== WINDOW EXPORTS ====================
window.runEInvoiceDemo = runEInvoiceDemo;
window.startDemoSequence = startDemoSequence;
window.generateDemoInvoice = generateDemoInvoice;
window.clearDemoData = clearDemoData;
window.simulateStatusCheck = simulateStatusCheck;
window.viewUBLDocument = viewUBLDocument;
window.copyUBLToClipboard = copyUBLToClipboard;
