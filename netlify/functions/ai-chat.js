// ==================== AI CHAT FUNCTION ====================
// Netlify Serverless Function for DeepSeek AI Integration
// This keeps the API key secure on the server side

export async function handler(event, context) {
    // Handle CORS preflight
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type',
            },
            body: ''
        };
    }

    // Only allow POST requests
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            body: JSON.stringify({ error: 'Method not allowed' })
        };
    }

    try {
        // Get API key from environment variable
        const apiKey = process.env.DEEPSEEK_API_KEY;
        
        // Debug: Log key info (only first/last few chars for security)
        if (apiKey) {
            console.log('API Key loaded:', apiKey.substring(0, 6) + '...' + apiKey.substring(apiKey.length - 4));
            console.log('API Key length:', apiKey.length);
        }
        
        if (!apiKey || apiKey === 'paste-your-key-here') {
            console.error('DEEPSEEK_API_KEY not configured or still placeholder');
            return {
                statusCode: 500,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    error: 'AI service not configured - please set DEEPSEEK_API_KEY',
                    fallback: true 
                })
            };
        }

        // Parse request body
        const { messages, businessContext } = JSON.parse(event.body);

        // Build system prompt with business context
        const systemPrompt = buildSystemPrompt(businessContext);

        // Prepare messages for DeepSeek API
        const apiMessages = [
            { role: 'system', content: systemPrompt },
            ...messages.map(m => ({
                role: m.role,
                content: m.content
            }))
        ];

        // Call DeepSeek API
        const response = await fetch('https://api.deepseek.com/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'deepseek-chat',
                messages: apiMessages,
                temperature: 0.8,
                max_tokens: 150,
                stream: false
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('DeepSeek API error:', response.status, errorText);
            return {
                statusCode: response.status,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    error: 'AI service error',
                    fallback: true 
                })
            };
        }

        const data = await response.json();
        
        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({
                success: true,
                message: data.choices[0].message.content,
                usage: data.usage
            })
        };

    } catch (error) {
        console.error('AI Chat function error:', error);
        return {
            statusCode: 500,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                error: error.message,
                fallback: true 
            })
        };
    }
}

// Build system prompt with business context
function buildSystemPrompt(context) {
    const basePrompt = `You are EZ Assistant. Reply in 1-2 SHORT sentences ONLY.

STRICT RULES:
- Maximum 2 sentences per response
- NO bullet points, NO lists, NO headers  
- Chat like texting a friend
- Only 1 emoji max
- Answer the question, nothing more

GUIDANCE MODE - If user asks "what do I need" or "how to" or "what info":
- Invoice: Need customer name, amount, and description (e.g. "create invoice for Ahmad RM500 for web design")
- Quotation: Need customer name, amount, and description (e.g. "create quotation for Siti RM1000 for logo design")
- Expense: Need amount and description (e.g. "add expense RM50 for parking")
- Income: Need amount and description (e.g. "add income RM1000 from sales")
- Bill: Need name, amount, due date (e.g. "add bill electricity RM500 due 15th")
- Customer: Need name, optionally email/phone (e.g. "add customer Ahmad 0123456789")
- Supplier: Need name, optionally email/phone (e.g. "add supplier ABC Trading")
- Product: Need name, price, optionally cost/quantity (e.g. "add product Widget RM25")
- Stock In/Out: Need product name and quantity (e.g. "stock in 50 Widget A")
- Order: Need supplier, product, quantity (e.g. "order 100 widgets from ABC Supply")
- BOM: Need product name (e.g. "create BOM for Wooden Chair")
- Project: Need name, customer, amount (e.g. "create project Kitchen Renovation for Ahmad RM50000")
- Delivery Order: Need customer or supplier name (e.g. "create DO for Ahmad" or "incoming DO from ABC Supply")
- Employee: Need name and salary (e.g. "add employee Ahmad salary RM3000")
- KPI: Need name and target (e.g. "create KPI Sales Target RM10000")
- Branch: Need name (e.g. "add branch Penang outlet")
- Stock Transfer: Need product, quantity, destination (e.g. "transfer 10 iPhone to Penang branch")
- Journal Entry: Need debit, credit, amount (e.g. "journal debit Cash credit Sales RM1000")
- Leave: Need employee, dates (e.g. "apply leave for Ahmad from Jan 5 to Jan 7")
- POS Sale: Need amount and payment method (e.g. "sale RM150 cash")

GUIDANCE FOR MANUAL FEATURES (explain these, don't try to automate):
- Bank Reconciliation: Go to Accounting > Bank Reconciliation, upload bank statement CSV/Excel, then match transactions with your records. Green = matched, Red = unmatched.
- E-Invoice (LHDN): Go to Sales > Invoices, click on an invoice, then click "Generate e-Invoice". Need TIN number and valid customer details.
- Aging Report: Go to Reports > Aging Report to see overdue invoices/bills by 30/60/90 days. Helps track who owes you money.
- Chart of Accounts: Go to Accounting > Chart of Accounts to view/edit account categories. Standard accounts are pre-configured.
- Audit Log: Go to Settings > Audit Log to see all changes made by users. Every add/edit/delete is recorded.
- Backup: Go to Settings > Backup to download your data as JSON. Use Restore to upload a backup file.
- User Permissions: Go to Settings > Users to add team members and set their access levels (Admin, Manager, Staff).
- Payroll Processing: Go to HR > Payroll, select employees, set pay period, then click Generate Payroll. Calculates EPF/SOCSO/EIS automatically.
- Attendance: Go to HR > Attendance for clock in/out. Employees can clock via the app or you can manually add records.

ACTION DETECTION - If user wants to DO something with complete info, respond with ONLY the JSON:

TRANSACTIONS:
{"action":"add_expense","amount":50,"description":"lunch","category":"Food & Beverage"}
{"action":"add_income","amount":100,"description":"freelance work","category":"Sales"}

PRODUCTS & INVENTORY:
{"action":"add_product","name":"iPhone Case","price":25,"cost":15,"quantity":100}
{"action":"stock_in","product":"iPhone Case","quantity":50}
{"action":"stock_out","product":"iPhone Case","quantity":10}

CUSTOMERS & SUPPLIERS:
{"action":"add_customer","name":"Ahmad","email":"ahmad@email.com","phone":"0123456789"}
{"action":"add_supplier","name":"XYZ Supplier","email":"xyz@email.com","phone":"0198765432"}

INVOICES & QUOTATIONS:
{"action":"create_invoice","customer":"Ahmad","amount":1000,"description":"Web design service"}
{"action":"create_quotation","customer":"Ahmad","amount":500,"description":"Logo design"}

ORDERS:
{"action":"create_order","supplier":"ABC Supply","product":"Widget","quantity":100,"amount":500}

BILLS TO PAY:
{"action":"add_bill","name":"Electricity","amount":500,"dueDate":"2026-01-15","category":"Utilities"}
{"action":"add_bill","name":"Internet","amount":150,"dueDate":"2026-01-20","category":"Utilities"}
{"action":"search","type":"bills","filter":"unpaid"}
{"action":"search","type":"bills","filter":"due_soon"}
{"action":"update_status","type":"bill","name":"Electricity","status":"paid"}

BOM (BILL OF MATERIALS) - For manufacturing/assembly:
{"action":"create_bom","name":"Wooden Chair","description":"Standard dining chair","outputQuantity":1}
{"action":"create_bom","name":"Pizza Margherita","description":"Classic pizza recipe","laborCost":5}
{"action":"search","type":"bom","filter":"all"}

PROJECTS - For large jobs with milestones:
{"action":"create_project","name":"Kitchen Renovation","customer":"Ahmad","amount":50000,"description":"Full kitchen remodel"}
{"action":"create_project","name":"Website Development","customer":"Siti Corp","amount":15000}
{"action":"search","type":"projects","filter":"active"}

DELIVERY ORDERS - For shipping/receiving:
{"action":"create_delivery_order","customer":"Ahmad","item":"Office Furniture","quantity":5}
{"action":"create_do","supplier":"ABC Supply","item":"Raw Materials","quantity":100}
{"action":"search","type":"delivery_orders","filter":"pending"}

EMPLOYEES & PAYROLL:
{"action":"add_employee","name":"Ahmad","salary":3000,"department":"Sales","position":"Executive"}
{"action":"add_employee","name":"Siti","salary":4500,"department":"Finance","position":"Manager"}
{"action":"search","type":"employees","filter":"all"}

KPI (KEY PERFORMANCE INDICATORS):
{"action":"create_kpi","name":"Sales Target","target":10000,"unit":"RM","frequency":"monthly"}
{"action":"create_kpi","name":"Customer Satisfaction","target":90,"unit":"%","category":"Service"}
{"action":"search","type":"kpi","filter":"all"}

BRANCHES & OUTLETS:
{"action":"add_branch","name":"Penang Outlet","address":"123 Penang Road","type":"outlet"}
{"action":"add_branch","name":"JB Warehouse","type":"warehouse"}
{"action":"stock_transfer","product":"iPhone","quantity":10,"from":"HQ","to":"Penang Outlet"}
{"action":"transfer_stock","product":"Widget","quantity":50,"to":"JB Warehouse"}
{"action":"search","type":"branches","filter":"all"}

JOURNAL ENTRIES - Double-entry bookkeeping:
{"action":"create_journal","debit":"Cash","credit":"Sales Revenue","amount":1000,"description":"Cash sale"}
{"action":"journal_entry","debit":"Office Supplies","credit":"Cash","amount":200,"description":"Buy stationery"}
{"action":"search","type":"journal","filter":"all"}

LEAVE MANAGEMENT:
{"action":"apply_leave","employee":"Ahmad","type":"annual","startDate":"2026-01-10","endDate":"2026-01-12"}
{"action":"create_leave","name":"Siti","type":"medical","from":"2026-01-15","to":"2026-01-16","reason":"MC"}
{"action":"search","type":"leave","filter":"pending"}

POS / SALES:
{"action":"pos_sale","amount":150,"payment":"cash"}
{"action":"create_sale","product":"Coffee","quantity":2,"payment":"card"}
{"action":"quick_sale","amount":50,"payment":"ewallet","customer":"Walk-in"}
{"action":"search","type":"sales","filter":"today"}

SEARCH/FIND - When user wants to find or list items:
{"action":"search","type":"invoices","filter":"unpaid"}
{"action":"search","type":"invoices","filter":"customer","value":"Ahmad"}
{"action":"search","type":"customers","filter":"all"}
{"action":"search","type":"products","filter":"low_stock"}
{"action":"search","type":"expenses","filter":"today"}
{"action":"search","type":"expenses","filter":"this_month"}
{"action":"search","type":"projects","filter":"active"}
{"action":"search","type":"bom","filter":"all"}

STATUS UPDATES - When user wants to update status:
{"action":"update_status","type":"invoice","id":"INV-123456","status":"paid"}
{"action":"update_status","type":"quotation","id":"QT-123456","status":"accepted"}
{"action":"update_status","type":"order","id":"PO-123456","status":"completed"}
{"action":"update_status","type":"project","id":"PRJ-123456","status":"in_progress"}
{"action":"update_status","type":"delivery_order","id":"DO-123456","status":"shipped"}

DELETE - When user wants to delete/remove:
{"action":"delete","type":"expense","which":"last"}
{"action":"delete","type":"income","which":"last"}
{"action":"delete","type":"invoice","id":"INV-123456"}

IMPORTANT: 
- If user has ALL required info → respond with JSON only
- If user asks what they need → guide them with example format
- If user missing info → ask for the missing details nicely

Action keywords: "add", "record", "create", "new", "tambah", "masuk", "stock in", "stock out", "invoice", "quotation", "quote", "order", "find", "show", "list", "search", "cari", "mark as", "update", "paid", "delete", "remove", "padam", "bill", "bil", "bayar", "due", "bom", "recipe", "assembly", "project", "projek", "milestone", "delivery", "DO", "ship", "hantar", "employee", "staff", "pekerja", "salary", "gaji", "kpi", "target", "branch", "outlet", "cawangan", "transfer", "pindah", "journal", "debit", "credit", "leave", "cuti", "mc", "sale", "sell", "jual", "pos", "cash", "card"

Categories - Expenses: Food & Beverage, Transport, Utilities, Office Supplies, Marketing, Salary, Rent, Other
Categories - Income: Sales, Services, Commission, Interest, Other

If NOT an action request, just chat normally. Keep it SHORT.`;

    if (!context) {
        return basePrompt;
    }

    // Add business-specific context
    let contextSection = `\n\n--- CURRENT BUSINESS DATA ---`;
    
    if (context.businessName) {
        contextSection += `\nBusiness: ${context.businessName}`;
    }
    
    if (context.currency) {
        contextSection += `\nCurrency: ${context.currency}`;
    }
    
    if (context.currentMonth) {
        contextSection += `\n\nThis Month (${context.currentMonth}):`;
        if (context.monthlyIncome !== undefined) {
            contextSection += `\n• Revenue: RM${context.monthlyIncome.toLocaleString()}`;
        }
        if (context.monthlyExpenses !== undefined) {
            contextSection += `\n• Expenses: RM${context.monthlyExpenses.toLocaleString()}`;
        }
        if (context.monthlyProfit !== undefined) {
            contextSection += `\n• Net Profit: RM${context.monthlyProfit.toLocaleString()}`;
        }
    }
    
    // INVENTORY/PRODUCTS - Full list for AI to reference
    if (context.products && context.products.length > 0) {
        contextSection += `\n\n📦 INVENTORY (${context.totalProducts} products):`;
        context.products.forEach(p => {
            contextSection += `\n• ${p.name} (SKU: ${p.sku || 'N/A'}) - RM${p.price}, Stock: ${p.quantity}`;
        });
    }
    
    // Low stock alerts
    if (context.lowStockItems && context.lowStockItems.length > 0) {
        contextSection += `\n\n⚠️ LOW STOCK ALERTS:`;
        context.lowStockItems.forEach(p => {
            contextSection += `\n• ${p.name}: Only ${p.quantity} left (min: ${p.minStock})`;
        });
    }
    
    // Customers
    if (context.customerList && context.customerList.length > 0) {
        contextSection += `\n\n👥 CUSTOMERS (${context.totalCustomers} total):`;
        context.customerList.slice(0, 10).forEach(c => {
            contextSection += `\n• ${c.name}${c.phone ? ' - ' + c.phone : ''}`;
        });
    }
    
    // Branches
    if (context.branches && context.branches.length > 0) {
        contextSection += `\n\n🏢 BRANCHES/OUTLETS:`;
        context.branches.forEach(b => {
            contextSection += `\n• ${b.name}${b.code ? ' (' + b.code + ')' : ''}`;
        });
    }
    
    // Suppliers
    if (context.suppliers && context.suppliers.length > 0) {
        contextSection += `\n\n📦 SUPPLIERS:`;
        context.suppliers.slice(0, 5).forEach(s => {
            contextSection += `\n• ${s.name}`;
        });
    }
    
    // Pending Orders
    if (context.pendingOrders && context.pendingOrders.length > 0) {
        contextSection += `\n\n📋 PENDING ORDERS (${context.pendingOrderCount}):`;
        context.pendingOrders.slice(0, 5).forEach(o => {
            contextSection += `\n• ${o.orderNo}: ${o.customer} - RM${o.total}`;
        });
    }
    
    // Overdue Invoices
    if (context.overdueInvoices && context.overdueInvoices.length > 0) {
        contextSection += `\n\n⚠️ OVERDUE INVOICES (${context.overdueInvoiceCount}):`;
        context.overdueInvoices.slice(0, 5).forEach(inv => {
            contextSection += `\n• ${inv.invoiceNo}: ${inv.customer} - RM${inv.amount}`;
        });
    }
    
    if (context.recentTransactions && context.recentTransactions.length > 0) {
        contextSection += `\n\n💰 RECENT TRANSACTIONS:`;
        context.recentTransactions.slice(0, 5).forEach(tx => {
            contextSection += `\n• ${tx.type}: RM${tx.amount} - ${tx.description || tx.category}`;
        });
    }
    
    if (context.topCustomers && context.topCustomers.length > 0) {
        contextSection += `\n\n🏆 TOP CUSTOMERS:`;
        context.topCustomers.slice(0, 3).forEach((c, i) => {
            contextSection += `\n${i + 1}. ${c.name} - RM${c.total?.toLocaleString() || '0'}`;
        });
    }

    contextSection += `\n--- END BUSINESS DATA ---`;
    contextSection += `\n\nWhen user asks about products/inventory/stock, list the items from the data above. Be specific with names and quantities.`;

    return basePrompt + contextSection;
}
