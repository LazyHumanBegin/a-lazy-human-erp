/**
 * EZCubic - AI Chat & Query Processing - Part B Core
 * POS, Inventory, CRM, Quotations query handlers
 * Split from ai-chat-b.js v2.2.6 - 26 Dec 2025
 * Part B Core: generateAIResponse override with POS, Inventory, CRM, Quotation handlers
 */

// ==================== OVERRIDE generateAIResponse to include Part B ====================
// Store reference to Part A's generateAIResponse
const _generateAIResponsePartA = window.generateAIResponse;

// New complete generateAIResponse that includes Part B
window.generateAIResponse = function(query) {
    const lowerQuery = query.toLowerCase();
    const transactions = (window.businessData && window.businessData.transactions) || [];
    const bills = (window.businessData && window.businessData.bills) || [];
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth();
    
    // Calculate common metrics
    const yearIncome = transactions.filter(t => new Date(t.date).getFullYear() === currentYear && t.type === 'income')
        .reduce((s, t) => s + t.amount, 0);
    const yearExpenses = transactions.filter(t => new Date(t.date).getFullYear() === currentYear && t.type === 'expense')
        .reduce((s, t) => s + t.amount, 0);
    const monthIncome = transactions.filter(t => {
        const d = new Date(t.date);
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear && t.type === 'income';
    }).reduce((s, t) => s + t.amount, 0);
    const monthExpenses = transactions.filter(t => {
        const d = new Date(t.date);
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear && t.type === 'expense';
    }).reduce((s, t) => s + t.amount, 0);

    // ==================== POS QUESTIONS ====================
    if (lowerQuery.includes('pos') || lowerQuery.includes('point of sale') || lowerQuery.includes('cash register')) {
        if (lowerQuery.includes('how') || lowerQuery.includes('use') || lowerQuery.includes('work')) {
            return {
                text: `<strong>🛒 How to Use POS (Point of Sale)</strong>
                    <div style="margin-top: 15px; line-height: 1.8;">
                        <p>POS is your digital cash register - perfect for retail sales!</p>
                        
                        <div style="background: rgba(139, 92, 246, 0.15); padding: 20px; border-radius: 10px; margin: 15px 0;">
                            <strong style="color: #a78bfa;">Quick Steps to Make a Sale:</strong>
                            <ol style="color: #cbd5e1; padding-left: 20px; margin-top: 10px;">
                                <li style="margin-bottom: 8px;">Go to <strong>POS</strong> section</li>
                                <li style="margin-bottom: 8px;">Search or click products to add to cart</li>
                                <li style="margin-bottom: 8px;">Adjust quantity using +/- buttons</li>
                                <li style="margin-bottom: 8px;">Apply discount if needed</li>
                                <li style="margin-bottom: 8px;">Select payment: Cash, Card, or E-Wallet</li>
                                <li>Click <strong>"Complete Sale"</strong></li>
                            </ol>
                        </div>
                        
                        <div style="background: rgba(245, 158, 11, 0.15); padding: 12px; border-radius: 8px;">
                            <strong style="color: #fcd34d;">💡 Tips:</strong>
                            <ul style="color: #94a3b8; padding-left: 20px; margin-top: 5px; font-size: 13px;">
                                <li>Add products in Inventory first</li>
                                <li>Use barcode scanner for faster checkout</li>
                                <li>Check Daily Sales for cash reconciliation</li>
                            </ul>
                        </div>
                    </div>`,
                actions: [
                    { label: '🛒 Go to POS', action: "showSection('pos')" },
                    { label: '📦 Add Products', action: "showSection('inventory')" },
                    { label: '📚 POS Tutorial', action: "startModuleTutorial('pos')" }
                ]
            };
        }
        
        if (lowerQuery.includes('discount')) {
            return {
                text: `<strong>💰 How to Apply Discounts in POS</strong>
                    <div style="margin-top: 15px;">
                        <ol style="color: #cbd5e1; padding-left: 20px; line-height: 2;">
                            <li>Add items to cart first</li>
                            <li>Click <strong>"Apply Discount"</strong> button</li>
                            <li>Enter discount:
                                <ul style="padding-left: 20px; margin-top: 5px;">
                                    <li>Percentage: e.g., 10%</li>
                                    <li>Fixed amount: e.g., RM 5</li>
                                </ul>
                            </li>
                            <li>Discount will be applied to total</li>
                        </ol>
                        
                        <div style="background: rgba(16, 185, 129, 0.15); padding: 12px; border-radius: 8px; margin-top: 15px;">
                            <strong style="color: #6ee7b7;">💡 Pro Tip:</strong>
                            <span style="color: #94a3b8;"> Set up preset discounts (5%, 10%, 20%) for faster checkout!</span>
                        </div>
                    </div>`,
                actions: [
                    { label: '🛒 Go to POS', action: "showSection('pos')" }
                ]
            };
        }
    }
    
    // ==================== INVENTORY QUESTIONS ====================
    if (lowerQuery.includes('inventory') || lowerQuery.includes('stock') || lowerQuery.includes('product')) {
        if (lowerQuery.includes('add') || lowerQuery.includes('create') || lowerQuery.includes('new')) {
            return {
                text: `<strong>📦 How to Add Products to Inventory</strong>
                    <div style="margin-top: 15px; line-height: 1.8;">
                        <div style="background: rgba(245, 158, 11, 0.15); padding: 20px; border-radius: 10px; margin-bottom: 15px;">
                            <strong style="color: #fcd34d;">Step-by-Step:</strong>
                            <ol style="color: #cbd5e1; padding-left: 20px; margin-top: 10px;">
                                <li style="margin-bottom: 8px;">Go to <strong>Inventory</strong> section</li>
                                <li style="margin-bottom: 8px;">Click <strong>"Add Product"</strong></li>
                                <li style="margin-bottom: 8px;">Enter product details:
                                    <ul style="padding-left: 15px; margin-top: 5px; color: #94a3b8;">
                                        <li>Name: Product name</li>
                                        <li>SKU: Unique code (optional)</li>
                                        <li>Cost Price: What you pay</li>
                                        <li>Selling Price: What customer pays</li>
                                        <li>Quantity: Current stock</li>
                                        <li>Category: Food, Electronics, etc.</li>
                                    </ul>
                                </li>
                                <li style="margin-bottom: 8px;">Set <strong>Low Stock Alert</strong> level</li>
                                <li>Click <strong>"Save Product"</strong></li>
                            </ol>
                        </div>
                        
                        <p style="color: #10b981;">✓ Product will automatically appear in POS!</p>
                    </div>`,
                actions: [
                    { label: '📦 Go to Inventory', action: "showSection('inventory')" },
                    { label: '📚 Inventory Tutorial', action: "startModuleTutorial('inventory')" }
                ]
            };
        }
        
        if (lowerQuery.includes('low') || lowerQuery.includes('alert') || lowerQuery.includes('reorder')) {
            return {
                text: `<strong>⚠️ Low Stock Alerts</strong>
                    <div style="margin-top: 15px; line-height: 1.8;">
                        <p>Get notified when products are running low so you never miss a sale!</p>
                        
                        <div style="background: rgba(239, 68, 68, 0.15); padding: 15px; border-radius: 10px; margin: 15px 0;">
                            <strong style="color: #fca5a5;">How it Works:</strong>
                            <ol style="color: #cbd5e1; padding-left: 20px; margin-top: 10px;">
                                <li>When adding/editing a product, set "Low Stock Level"</li>
                                <li>Example: Set to 10 units</li>
                                <li>When stock drops to 10 or below, you'll see alerts</li>
                                <li>Alerts appear on Dashboard and Inventory</li>
                            </ol>
                        </div>
                        
                        <div style="background: rgba(245, 158, 11, 0.15); padding: 12px; border-radius: 8px;">
                            <strong style="color: #fcd34d;">💡 Recommended Levels:</strong>
                            <ul style="color: #94a3b8; padding-left: 20px; margin-top: 5px; font-size: 13px;">
                                <li>Fast-selling items: 20-30 units</li>
                                <li>Normal items: 10-15 units</li>
                                <li>Slow-moving items: 5 units</li>
                            </ul>
                        </div>
                    </div>`,
                actions: [
                    { label: '📦 Check Inventory', action: "showSection('inventory')" }
                ]
            };
        }
        
        if (lowerQuery.includes('track') || lowerQuery.includes('manage')) {
            return {
                text: `<strong>📦 Inventory Tracking Guide</strong>
                    <div style="margin-top: 15px; line-height: 1.8;">
                        <div style="display: grid; gap: 12px;">
                            <div style="background: rgba(16, 185, 129, 0.15); padding: 15px; border-radius: 8px;">
                                <strong style="color: #6ee7b7;">📥 Stock In (Receiving)</strong>
                                <p style="color: #94a3b8; font-size: 13px; margin-top: 5px;">When you receive stock from supplier, add a "Stock In" movement to increase quantity.</p>
                            </div>
                            <div style="background: rgba(239, 68, 68, 0.15); padding: 15px; border-radius: 8px;">
                                <strong style="color: #fca5a5;">📤 Stock Out (Sales/Adjustments)</strong>
                                <p style="color: #94a3b8; font-size: 13px; margin-top: 5px;">POS sales auto-deduct. For damaged/lost items, add "Stock Out" manually.</p>
                            </div>
                            <div style="background: rgba(59, 130, 246, 0.15); padding: 15px; border-radius: 8px;">
                                <strong style="color: #93c5fd;">📊 Stock Reports</strong>
                                <p style="color: #94a3b8; font-size: 13px; margin-top: 5px;">View stock levels, valuation, movement history. Export for stocktake!</p>
                            </div>
                        </div>
                    </div>`,
                actions: [
                    { label: '📦 Go to Inventory', action: "showSection('inventory')" },
                    { label: '📚 Full Tutorial', action: "startModuleTutorial('inventory')" }
                ]
            };
        }
    }
    
    // ==================== CRM / CUSTOMER QUESTIONS ====================
    if (lowerQuery.includes('customer') || lowerQuery.includes('crm') || lowerQuery.includes('client')) {
        if (lowerQuery.includes('add') || lowerQuery.includes('new') || lowerQuery.includes('create')) {
            return {
                text: `<strong>👥 How to Add Customers</strong>
                    <div style="margin-top: 15px; line-height: 1.8;">
                        <div style="background: rgba(6, 182, 212, 0.15); padding: 20px; border-radius: 10px;">
                            <strong style="color: #22d3ee;">Quick Steps:</strong>
                            <ol style="color: #cbd5e1; padding-left: 20px; margin-top: 10px;">
                                <li style="margin-bottom: 8px;">Go to <strong>CRM / Customers</strong></li>
                                <li style="margin-bottom: 8px;">Click <strong>"Add Customer"</strong></li>
                                <li style="margin-bottom: 8px;">Enter details:
                                    <ul style="padding-left: 15px; margin-top: 5px; color: #94a3b8;">
                                        <li>Name (required)</li>
                                        <li>Email</li>
                                        <li>Phone number</li>
                                        <li>Address</li>
                                        <li>Company (if B2B)</li>
                                    </ul>
                                </li>
                                <li>Click <strong>"Save Customer"</strong></li>
                            </ol>
                        </div>
                        
                        <div style="margin-top: 15px; color: #94a3b8; font-size: 13px;">
                            💡 You can also add customers during POS checkout or when creating quotations!
                        </div>
                    </div>`,
                actions: [
                    { label: '👥 Go to CRM', action: "showSection('crm')" },
                    { label: '📚 CRM Tutorial', action: "startModuleTutorial('crm')" }
                ]
            };
        }
        
        if (lowerQuery.includes('history') || lowerQuery.includes('track') || lowerQuery.includes('order')) {
            return {
                text: `<strong>📋 Customer History & Tracking</strong>
                    <div style="margin-top: 15px; line-height: 1.8;">
                        <p>Click on any customer to see their complete history!</p>
                        
                        <div style="background: rgba(6, 182, 212, 0.15); padding: 15px; border-radius: 10px; margin: 15px 0;">
                            <strong style="color: #22d3ee;">What You Can See:</strong>
                            <ul style="color: #cbd5e1; padding-left: 20px; margin-top: 10px;">
                                <li>All orders/purchases</li>
                                <li>Total spent (lifetime value)</li>
                                <li>Payment history</li>
                                <li>Outstanding amounts</li>
                                <li>Notes & interactions</li>
                                <li>Quotations sent</li>
                            </ul>
                        </div>
                        
                        <div style="background: rgba(245, 158, 11, 0.15); padding: 12px; border-radius: 8px;">
                            <strong style="color: #fcd34d;">💡 Why Track Customers?</strong>
                            <ul style="color: #94a3b8; padding-left: 20px; margin-top: 5px; font-size: 13px;">
                                <li>Identify VIP customers (top spenders)</li>
                                <li>Follow up on unpaid invoices</li>
                                <li>Send birthday/loyalty promotions</li>
                                <li>Personalize service based on history</li>
                            </ul>
                        </div>
                    </div>`,
                actions: [
                    { label: '👥 View Customers', action: "showSection('crm')" }
                ]
            };
        }
    }
    
    // ==================== QUOTATION QUESTIONS ====================
    if (lowerQuery.includes('quotation') || lowerQuery.includes('quote') || lowerQuery.includes('estimate')) {
        if (lowerQuery.includes('create') || lowerQuery.includes('how') || lowerQuery.includes('make')) {
            return {
                text: `<strong>📝 How to Create a Quotation</strong>
                    <div style="margin-top: 15px; line-height: 1.8;">
                        <div style="background: rgba(236, 72, 153, 0.15); padding: 20px; border-radius: 10px;">
                            <strong style="color: #f472b6;">Step-by-Step:</strong>
                            <ol style="color: #cbd5e1; padding-left: 20px; margin-top: 10px;">
                                <li style="margin-bottom: 8px;">Go to <strong>Quotations</strong></li>
                                <li style="margin-bottom: 8px;">Click <strong>"New Quotation"</strong></li>
                                <li style="margin-bottom: 8px;">Select or add customer</li>
                                <li style="margin-bottom: 8px;">Add items:
                                    <ul style="padding-left: 15px; margin-top: 5px; color: #94a3b8;">
                                        <li>Item description</li>
                                        <li>Quantity</li>
                                        <li>Unit price</li>
                                    </ul>
                                </li>
                                <li style="margin-bottom: 8px;">Set validity period (e.g., 14 days)</li>
                                <li style="margin-bottom: 8px;">Add terms & conditions</li>
                                <li>Click <strong>"Save"</strong> then <strong>"Send"</strong></li>
                            </ol>
                        </div>
                        
                        <p style="margin-top: 15px; color: #10b981;">✓ Customer accepts? Click "Convert to Order" - no retyping!</p>
                    </div>`,
                actions: [
                    { label: '📝 Create Quotation', action: "showSection('quotations')" },
                    { label: '📚 Quotations Tutorial', action: "startModuleTutorial('quotations')" }
                ]
            };
        }
        
        if (lowerQuery.includes('convert') || lowerQuery.includes('order') || lowerQuery.includes('accept')) {
            return {
                text: `<strong>✅ Converting Quotation to Order</strong>
                    <div style="margin-top: 15px; line-height: 1.8;">
                        <p>When customer accepts your quotation:</p>
                        
                        <div style="background: rgba(16, 185, 129, 0.15); padding: 15px; border-radius: 10px; margin: 15px 0;">
                            <ol style="color: #cbd5e1; padding-left: 20px;">
                                <li style="margin-bottom: 8px;">Open the quotation</li>
                                <li style="margin-bottom: 8px;">Click <strong>"Convert to Order"</strong></li>
                                <li style="margin-bottom: 8px;">Review order details</li>
                                <li>Confirm and save</li>
                            </ol>
                        </div>
                        
                        <p style="color: #94a3b8; font-size: 13px;">
                            💡 All items, prices, and customer info are auto-copied. The quotation is marked as "Accepted".
                        </p>
                    </div>`,
                actions: [
                    { label: '📝 View Quotations', action: "showSection('quotations')" }
                ]
            };
        }
    }

    // Delegate to Part B UI for remaining handlers (Projects, Tutorials, Help, etc.)
    // If Part B UI generateAIResponse is available, call it
    if (typeof window._generateAIResponsePartBUI === 'function') {
        return window._generateAIResponsePartBUI(query, lowerQuery, transactions, bills, currentYear, currentMonth, yearIncome, yearExpenses, monthIncome, monthExpenses);
    }
    
    // Fallback to Part A if available
    if (typeof _generateAIResponsePartA === 'function') {
        return _generateAIResponsePartA(query);
    }
    
    // Ultimate fallback
    return {
        text: `<strong>I'm here to help! 🤖</strong>
            <p style="margin-top: 10px; color: #cbd5e1;">Please try asking about POS, Inventory, Customers, or Quotations.</p>`,
        actions: [
            { label: '🚀 Get Started', action: "askAIExample('How do I get started?')" },
            { label: '📊 Dashboard', action: "showSection('dashboard')" }
        ]
    };
};

// ==================== GLOBAL EXPORTS (PART B CORE) ====================
window._generateAIResponsePartA = _generateAIResponsePartA;
