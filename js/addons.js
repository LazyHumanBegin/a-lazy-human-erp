// ==================== ADDONS.JS ====================
// Safe Add-on Features for A Lazy Human ERP
// These features are isolated and don't modify existing functions

// ==================== 0. COMPANY LOGO MANAGEMENT ====================
function handleLogoUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
        showNotification('Please upload an image file', 'error');
        return;
    }
    
    // Validate file size (max 500KB)
    if (file.size > 500 * 1024) {
        showNotification('Image too large. Please use an image under 500KB', 'error');
        return;
    }
    
    const reader = new FileReader();
    reader.onload = function(e) {
        const base64 = e.target.result;
        
        // Save to localStorage
        localStorage.setItem('ezcubic_company_logo', base64);
        
        // Update preview
        updateLogoPreview(base64);
        
        // Also save to businessData
        if (window.businessData && window.businessData.settings) {
            window.businessData.settings.companyLogo = base64;
        }
        
        showNotification('Logo uploaded successfully!', 'success');
    };
    reader.readAsDataURL(file);
}

function updateLogoPreview(base64) {
    const preview = document.getElementById('logoPreview');
    const placeholder = document.getElementById('logoPlaceholder');
    
    if (base64) {
        if (preview) {
            preview.src = base64;
            preview.style.display = 'block';
        }
        if (placeholder) {
            placeholder.style.display = 'none';
        }
    } else {
        if (preview) {
            preview.src = '';
            preview.style.display = 'none';
        }
        if (placeholder) {
            placeholder.style.display = 'block';
        }
    }
}

function removeCompanyLogo() {
    localStorage.removeItem('ezcubic_company_logo');
    updateLogoPreview(null);
    
    if (window.businessData && window.businessData.settings) {
        delete window.businessData.settings.companyLogo;
    }
    
    showNotification('Logo removed', 'success');
}

function loadCompanyLogo() {
    const logo = localStorage.getItem('ezcubic_company_logo');
    if (logo) {
        updateLogoPreview(logo);
    }
}

function getCompanyLogo() {
    return localStorage.getItem('ezcubic_company_logo') || null;
}

// ==================== 1. BARCODE SCANNER ====================
let barcodeStream = null;

// Handle barcode result for POS
function handlePOSBarcode(code) {
    // Search for product by barcode/SKU
    const products = window.products || [];
    const product = products.find(p => 
        p.sku === code || 
        p.barcode === code || 
        (p.name && p.name.toLowerCase().includes(code.toLowerCase()))
    );
    
    if (product) {
        // Add to cart
        if (typeof addToCart === 'function') {
            addToCart(product.id);
            showNotification(`Added ${product.name} to cart`, 'success');
        }
    } else {
        showNotification(`Product not found: ${code}`, 'warning');
        // Put code in search box
        const searchInput = document.getElementById('posSearch');
        if (searchInput) {
            searchInput.value = code;
            if (typeof searchPOSProducts === 'function') {
                searchPOSProducts(code);
            }
        }
    }
}

function openBarcodeScanner(callback) {
    // Create scanner modal
    const modal = document.createElement('div');
    modal.id = 'barcodeScannerModal';
    modal.innerHTML = `
        <div style="position: fixed; inset: 0; background: rgba(0,0,0,0.9); z-index: 99999; display: flex; flex-direction: column;">
            <div style="padding: 15px; display: flex; justify-content: space-between; align-items: center; color: white;">
                <h3 style="margin: 0;"><i class="fas fa-barcode"></i> Scan Barcode</h3>
                <button onclick="closeBarcodeScanner()" style="background: none; border: none; color: white; font-size: 24px; cursor: pointer;">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div style="flex: 1; display: flex; align-items: center; justify-content: center; position: relative;">
                <video id="barcodeVideo" style="width: 100%; max-width: 500px; border-radius: 10px;"></video>
                <div style="position: absolute; width: 250px; height: 100px; border: 3px solid #10b981; border-radius: 10px;"></div>
            </div>
            <div style="padding: 20px; text-align: center; color: white;">
                <p>Point camera at barcode</p>
                <div style="margin-top: 10px;">
                    <input type="text" id="manualBarcodeInput" placeholder="Or enter barcode manually" 
                           style="padding: 10px 15px; border-radius: 8px; border: none; width: 200px; font-size: 16px;">
                    <button onclick="submitManualBarcode()" style="padding: 10px 20px; background: #10b981; color: white; border: none; border-radius: 8px; margin-left: 10px; cursor: pointer;">
                        Submit
                    </button>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    
    // Store callback for later use
    window.barcodeCallback = callback;
    
    // Start camera
    startBarcodeCamera();
}

async function startBarcodeCamera() {
    try {
        const video = document.getElementById('barcodeVideo');
        barcodeStream = await navigator.mediaDevices.getUserMedia({ 
            video: { facingMode: 'environment' } 
        });
        video.srcObject = barcodeStream;
        video.play();
        
        // Use BarcodeDetector if available (Chrome)
        if ('BarcodeDetector' in window) {
            const barcodeDetector = new BarcodeDetector({ formats: ['ean_13', 'ean_8', 'code_128', 'code_39', 'qr_code', 'upc_a', 'upc_e'] });
            
            const detectBarcode = async () => {
                if (!barcodeStream) return;
                try {
                    const barcodes = await barcodeDetector.detect(video);
                    if (barcodes.length > 0) {
                        const code = barcodes[0].rawValue;
                        handleBarcodeResult(code);
                        return;
                    }
                } catch (e) {}
                requestAnimationFrame(detectBarcode);
            };
            detectBarcode();
        }
    } catch (error) {
        console.error('Camera error:', error);
        showNotification('Could not access camera. Please enter barcode manually.', 'warning');
    }
}

function handleBarcodeResult(code) {
    closeBarcodeScanner();
    if (window.barcodeCallback) {
        window.barcodeCallback(code);
    }
    showNotification('Barcode scanned: ' + code, 'success');
}

function submitManualBarcode() {
    const input = document.getElementById('manualBarcodeInput');
    if (input && input.value.trim()) {
        handleBarcodeResult(input.value.trim());
    }
}

function closeBarcodeScanner() {
    if (barcodeStream) {
        barcodeStream.getTracks().forEach(track => track.stop());
        barcodeStream = null;
    }
    const modal = document.getElementById('barcodeScannerModal');
    if (modal) modal.remove();
}

// ==================== 2. DARK MODE TOGGLE ====================
function initDarkMode() {
    const isDark = localStorage.getItem('ezcubic_dark_mode') === 'true';
    if (isDark) {
        document.body.classList.add('dark-mode');
    }
}

function toggleDarkMode() {
    const isDark = document.body.classList.toggle('dark-mode');
    localStorage.setItem('ezcubic_dark_mode', isDark);
    showNotification(isDark ? 'Dark mode enabled' : 'Light mode enabled', 'success');
}

// Add dark mode CSS
function addDarkModeStyles() {
    if (document.getElementById('darkModeStyles')) return;
    
    const style = document.createElement('style');
    style.id = 'darkModeStyles';
    style.textContent = `
        body.dark-mode {
            --bg-primary: #0f172a;
            --bg-secondary: #1e293b;
            --bg-card: #1e293b;
            --text-primary: #f1f5f9;
            --text-secondary: #94a3b8;
            --border-color: #334155;
        }
        body.dark-mode .main-content { background: #0f172a; }
        body.dark-mode .content-card { background: #1e293b; border-color: #334155; }
        body.dark-mode .card-header h2 { color: #f1f5f9; }
        body.dark-mode .stat-card { background: #334155; }
        body.dark-mode .stat-label { color: #94a3b8; }
        body.dark-mode .stat-value { color: #f1f5f9; }
        body.dark-mode .form-control { background: #334155; border-color: #475569; color: #f1f5f9; }
        body.dark-mode .form-control::placeholder { color: #64748b; }
        body.dark-mode table { background: #1e293b; }
        body.dark-mode th { background: #334155; color: #f1f5f9; }
        body.dark-mode td { color: #e2e8f0; border-color: #334155; }
        body.dark-mode tr:hover { background: #334155; }
        body.dark-mode .modal-content { background: #1e293b; }
        body.dark-mode .modal-header { background: #334155; }
        body.dark-mode h3, body.dark-mode h4 { color: #f1f5f9; }
        body.dark-mode .tabs { background: #334155; }
        body.dark-mode .tab { color: #94a3b8; }
        body.dark-mode .tab.active { background: #1e293b; color: #f1f5f9; }
        body.dark-mode .transaction-item { background: #334155; border-color: #475569; }
        body.dark-mode .empty-state { color: #94a3b8; }
    `;
    document.head.appendChild(style);
}

// ==================== 3. KEYBOARD SHORTCUTS ====================
function initKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
        // Ignore if typing in input/textarea
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
        
        // Ctrl/Cmd + Key shortcuts
        if (e.ctrlKey || e.metaKey) {
            switch(e.key.toLowerCase()) {
                case 'd':
                    e.preventDefault();
                    showSection('dashboard');
                    break;
                case 'i':
                    e.preventDefault();
                    showSection('inventory');
                    break;
                case 'p':
                    e.preventDefault();
                    showSection('pos');
                    break;
                case 't':
                    e.preventDefault();
                    showSection('transactions');
                    break;
                case 'b':
                    e.preventDefault();
                    showSection('bills');
                    break;
                case '/':
                    e.preventDefault();
                    openGlobalSearch();
                    break;
            }
        }
        
        // Escape to close modals
        if (e.key === 'Escape') {
            const modal = document.querySelector('.modal[style*="flex"]');
            if (modal) {
                modal.style.display = 'none';
            }
        }
    });
}

// ==================== 4. CSV EXPORT ====================
function exportToCSV(data, filename) {
    if (!data || data.length === 0) {
        showNotification('No data to export', 'warning');
        return;
    }
    
    const headers = Object.keys(data[0]);
    const csvContent = [
        headers.join(','),
        ...data.map(row => headers.map(h => {
            let val = row[h];
            if (val === null || val === undefined) val = '';
            val = String(val).replace(/"/g, '""');
            if (val.includes(',') || val.includes('"') || val.includes('\n')) {
                val = `"${val}"`;
            }
            return val;
        }).join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    
    showNotification(`Exported ${data.length} records to CSV`, 'success');
}

// Quick CSV exports
function exportTransactionsCSV() {
    exportToCSV(getTransactionsFromStorage(), 'transactions');
}

function exportBillsCSV() {
    exportToCSV(getBillsFromStorage(), 'bills');
}

function exportInventoryCSV() {
    const products = window.products || JSON.parse(localStorage.getItem('ezcubic_products') || '[]');
    exportToCSV(products, 'inventory');
}

function exportCustomersCSV() {
    const customers = window.customers || JSON.parse(localStorage.getItem('ezcubic_customers') || '[]');
    exportToCSV(customers, 'customers');
}

function exportOrdersCSV() {
    const orders = window.orders || JSON.parse(localStorage.getItem('ezcubic_orders') || '[]');
    exportToCSV(orders, 'orders');
}

// ==================== 5. QUICK ADD FLOATING BUTTON ====================
function initQuickAddButton() {
    if (document.getElementById('quickAddFab')) return;
    
    const fab = document.createElement('div');
    fab.id = 'quickAddFab';
    fab.innerHTML = `
        <style>
            #quickAddFab {
                position: fixed;
                bottom: 80px;
                right: 20px;
                z-index: 9998;
            }
            #quickAddFab .fab-main {
                width: 56px;
                height: 56px;
                border-radius: 50%;
                background: linear-gradient(135deg, #2563eb, #1d4ed8);
                color: white;
                border: none;
                font-size: 24px;
                cursor: pointer;
                box-shadow: 0 4px 15px rgba(37, 99, 235, 0.4);
                transition: transform 0.2s;
            }
            #quickAddFab .fab-main:hover { transform: scale(1.1); }
            #quickAddFab .fab-menu {
                position: absolute;
                bottom: 65px;
                right: 0;
                display: none;
                flex-direction: column;
                gap: 10px;
            }
            #quickAddFab.open .fab-menu { display: flex; }
            #quickAddFab.open .fab-main { transform: rotate(45deg); }
            #quickAddFab .fab-item {
                display: flex;
                align-items: center;
                gap: 10px;
                padding: 10px 15px;
                background: white;
                border-radius: 25px;
                box-shadow: 0 2px 10px rgba(0,0,0,0.15);
                cursor: pointer;
                white-space: nowrap;
                font-size: 14px;
                transition: transform 0.2s;
            }
            #quickAddFab .fab-item:hover { transform: translateX(-5px); }
            #quickAddFab .fab-item i { color: #2563eb; width: 20px; }
            @media (max-width: 768px) {
                #quickAddFab { bottom: 100px; }
            }
        </style>
        <div class="fab-menu">
            <div class="fab-item" onclick="quickAddIncome()"><i class="fas fa-plus-circle"></i> Add Income</div>
            <div class="fab-item" onclick="quickAddExpense()"><i class="fas fa-minus-circle"></i> Add Expense</div>
            <div class="fab-item" onclick="quickAddBill()"><i class="fas fa-file-invoice"></i> Add Bill</div>
            <div class="fab-item" onclick="quickAddProduct()"><i class="fas fa-box"></i> Add Product</div>
            <div class="fab-item" onclick="quickAddCustomer()"><i class="fas fa-user-plus"></i> Add Customer</div>
        </div>
        <button class="fab-main" onclick="toggleQuickAddMenu()">
            <i class="fas fa-plus"></i>
        </button>
    `;
    document.body.appendChild(fab);
}

function toggleQuickAddMenu() {
    document.getElementById('quickAddFab').classList.toggle('open');
}

function quickAddIncome() {
    toggleQuickAddMenu();
    showSection('income');
}

function quickAddExpense() {
    toggleQuickAddMenu();
    showSection('expenses');
}

function quickAddBill() {
    toggleQuickAddMenu();
    showSection('bills');
    if (typeof showAddBillModal === 'function') showAddBillModal();
}

function quickAddProduct() {
    toggleQuickAddMenu();
    showSection('inventory');
    if (typeof showProductModal === 'function') showProductModal();
}

function quickAddCustomer() {
    toggleQuickAddMenu();
    showSection('crm');
    if (typeof showCRMCustomerModal === 'function') showCRMCustomerModal();
}

// ==================== 6. RECENT ACTIVITY FEED ====================
function getRecentActivity(limit = 10) {
    const activities = [];
    
    // Get recent transactions
    const transactions = getTransactionsFromStorage().slice(-5);
    transactions.forEach(t => {
        activities.push({
            type: t.type,
            icon: t.type === 'income' ? 'fa-arrow-up' : 'fa-arrow-down',
            color: t.type === 'income' ? '#10b981' : '#ef4444',
            text: `${t.type === 'income' ? 'Income' : 'Expense'}: ${t.description || t.category}`,
            amount: t.amount,
            date: t.date
        });
    });
    
    // Sort by date and return
    return activities
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .slice(0, limit);
}

function renderRecentActivityWidget() {
    const container = document.getElementById('recentActivityWidget');
    if (!container) return;
    
    const activities = getRecentActivity(5);
    
    if (activities.length === 0) {
        container.innerHTML = '<p style="color: #94a3b8; text-align: center;">No recent activity</p>';
        return;
    }
    
    container.innerHTML = activities.map(a => `
        <div style="display: flex; align-items: center; gap: 12px; padding: 10px 0; border-bottom: 1px solid #e2e8f0;">
            <div style="width: 36px; height: 36px; background: ${a.color}20; color: ${a.color}; 
                        border-radius: 50%; display: flex; align-items: center; justify-content: center;">
                <i class="fas ${a.icon}"></i>
            </div>
            <div style="flex: 1;">
                <div style="font-size: 14px; color: #334155;">${a.text}</div>
                <div style="font-size: 12px; color: #94a3b8;">${a.date}</div>
            </div>
            <div style="font-weight: 600; color: ${a.color};">RM ${parseFloat(a.amount).toFixed(2)}</div>
        </div>
    `).join('');
}

// ==================== 7. DUPLICATE RECORD ====================
function duplicateQuotation(id) {
    const quotations = window.quotations || [];
    const original = quotations.find(q => q.id === id);
    if (!original) return;
    
    const duplicate = {
        ...JSON.parse(JSON.stringify(original)),
        id: Date.now(),
        quoteNumber: 'QT-' + Date.now(),
        date: new Date().toISOString().split('T')[0],
        status: 'draft'
    };
    
    quotations.push(duplicate);
    localStorage.setItem('ezcubic_quotations', JSON.stringify(quotations));
    window.quotations = quotations;
    
    showNotification('Quotation duplicated successfully', 'success');
    if (typeof loadQuotations === 'function') loadQuotations();
}

function duplicateOrder(id) {
    const orders = window.orders || [];
    const original = orders.find(o => o.id === id);
    if (!original) return;
    
    const duplicate = {
        ...JSON.parse(JSON.stringify(original)),
        id: Date.now(),
        orderNumber: 'ORD-' + Date.now(),
        date: new Date().toISOString().split('T')[0],
        status: 'pending'
    };
    
    orders.push(duplicate);
    localStorage.setItem('ezcubic_orders', JSON.stringify(orders));
    window.orders = orders;
    
    showNotification('Order duplicated successfully', 'success');
    if (typeof loadOrders === 'function') loadOrders();
}

// ==================== 8. PRINT ANY TABLE ====================
function printTable(tableId, title) {
    const table = document.getElementById(tableId);
    if (!table) {
        showNotification('Table not found', 'error');
        return;
    }
    
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
        <html>
        <head>
            <title>${title || 'Print'}</title>
            <style>
                body { font-family: Arial, sans-serif; padding: 20px; }
                h1 { color: #1e293b; margin-bottom: 20px; }
                table { width: 100%; border-collapse: collapse; }
                th, td { border: 1px solid #e2e8f0; padding: 10px; text-align: left; }
                th { background: #f1f5f9; font-weight: 600; }
                @media print { button { display: none; } }
            </style>
        </head>
        <body>
            <h1>${title || 'Report'}</h1>
            <p>Printed on: ${new Date().toLocaleString()}</p>
            ${table.outerHTML}
            <button onclick="window.print()" style="margin-top: 20px; padding: 10px 20px;">Print</button>
        </body>
        </html>
    `);
    printWindow.document.close();
}

// ==================== 9. PAYMENT REMINDERS ====================
function checkPaymentReminders() {
    const bills = getBillsFromStorage();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const overdueBills = bills.filter(b => {
        if (b.status === 'paid') return false;
        const dueDate = new Date(b.dueDate);
        return dueDate < today;
    });
    
    const dueSoonBills = bills.filter(b => {
        if (b.status === 'paid') return false;
        const dueDate = new Date(b.dueDate);
        const diffDays = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));
        return diffDays >= 0 && diffDays <= 3;
    });
    
    if (overdueBills.length > 0) {
        showNotification(`⚠️ You have ${overdueBills.length} overdue bill(s)!`, 'error');
    }
    
    if (dueSoonBills.length > 0) {
        setTimeout(() => {
            showNotification(`📅 ${dueSoonBills.length} bill(s) due within 3 days`, 'warning');
        }, 2000);
    }
}

// ==================== 10. LOW STOCK ALERTS ====================
function checkLowStockAlerts() {
    const products = window.products || JSON.parse(localStorage.getItem('ezcubic_products') || '[]');
    
    const lowStockItems = products.filter(p => {
        const stock = parseFloat(p.stock) || 0;
        const minStock = parseFloat(p.minStock) || 5;
        return stock <= minStock && stock > 0;
    });
    
    const outOfStockItems = products.filter(p => {
        const stock = parseFloat(p.stock) || 0;
        return stock <= 0;
    });
    
    if (outOfStockItems.length > 0) {
        showNotification(`🚨 ${outOfStockItems.length} product(s) out of stock!`, 'error');
    }
    
    if (lowStockItems.length > 0) {
        setTimeout(() => {
            showNotification(`📦 ${lowStockItems.length} product(s) running low on stock`, 'warning');
        }, 2000);
    }
}

// ==================== 11. WHATSAPP SHARE ====================
function shareViaWhatsApp(type, id) {
    let message = '';
    const businessName = businessData?.settings?.businessName || 'A Lazy Human';
    
    if (type === 'invoice' || type === 'order') {
        const orders = window.orders || [];
        const order = orders.find(o => o.id === id);
        if (order) {
            message = `*${businessName}*\n\n`;
            message += `📄 Invoice: ${order.orderNumber}\n`;
            message += `📅 Date: ${order.date}\n`;
            message += `💰 Total: RM ${parseFloat(order.total).toFixed(2)}\n\n`;
            message += `Thank you for your business!`;
        }
    } else if (type === 'quotation') {
        const quotations = window.quotations || [];
        const quote = quotations.find(q => q.id === id);
        if (quote) {
            message = `*${businessName}*\n\n`;
            message += `📋 Quotation: ${quote.quoteNumber}\n`;
            message += `📅 Date: ${quote.date}\n`;
            message += `💰 Total: RM ${parseFloat(quote.total).toFixed(2)}\n`;
            message += `⏰ Valid Until: ${quote.validUntil}\n\n`;
            message += `Please confirm if you'd like to proceed.`;
        }
    }
    
    if (message) {
        const encoded = encodeURIComponent(message);
        window.open(`https://wa.me/?text=${encoded}`, '_blank');
    } else {
        showNotification('Could not find record to share', 'error');
    }
}

function shareOrderWhatsApp(id) {
    shareViaWhatsApp('order', id);
}

function shareQuotationWhatsApp(id) {
    shareViaWhatsApp('quotation', id);
}

// ==================== GLOBAL SEARCH ====================
function openGlobalSearch() {
    const existing = document.getElementById('globalSearchModal');
    if (existing) existing.remove();
    
    const modal = document.createElement('div');
    modal.id = 'globalSearchModal';
    modal.innerHTML = `
        <div style="position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 99999; 
                    display: flex; align-items: flex-start; justify-content: center; padding-top: 100px;"
             onclick="if(event.target === this) closeGlobalSearch()">
            <div style="background: white; border-radius: 12px; width: 90%; max-width: 600px; 
                        box-shadow: 0 20px 50px rgba(0,0,0,0.3); overflow: hidden;">
                <div style="padding: 15px; border-bottom: 1px solid #e2e8f0;">
                    <input type="text" id="globalSearchInput" placeholder="Search transactions, customers, products..." 
                           style="width: 100%; padding: 12px 15px; border: none; font-size: 16px; outline: none;"
                           oninput="performGlobalSearch(this.value)" autofocus>
                </div>
                <div id="globalSearchResults" style="max-height: 400px; overflow-y: auto; padding: 10px;">
                    <p style="color: #94a3b8; text-align: center; padding: 20px;">Type to search...</p>
                </div>
                <div style="padding: 10px 15px; background: #f8fafc; font-size: 12px; color: #64748b;">
                    <kbd style="background: #e2e8f0; padding: 2px 6px; border-radius: 4px;">↵</kbd> to select • 
                    <kbd style="background: #e2e8f0; padding: 2px 6px; border-radius: 4px;">ESC</kbd> to close
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    document.getElementById('globalSearchInput').focus();
}

function closeGlobalSearch() {
    const modal = document.getElementById('globalSearchModal');
    if (modal) modal.remove();
}

function performGlobalSearch(query) {
    const results = document.getElementById('globalSearchResults');
    if (!query || query.length < 2) {
        results.innerHTML = '<p style="color: #94a3b8; text-align: center; padding: 20px;">Type at least 2 characters...</p>';
        return;
    }
    
    const q = query.toLowerCase();
    const matches = [];
    
    // Search transactions
    const transactions = getTransactionsFromStorage();
    transactions.filter(t => 
        (t.description && t.description.toLowerCase().includes(q)) ||
        (t.category && t.category.toLowerCase().includes(q))
    ).slice(0, 5).forEach(t => {
        matches.push({
            icon: t.type === 'income' ? 'fa-arrow-up' : 'fa-arrow-down',
            color: t.type === 'income' ? '#10b981' : '#ef4444',
            title: t.description || t.category,
            subtitle: `${t.type} • ${t.date} • RM ${parseFloat(t.amount).toFixed(2)}`,
            action: () => { closeGlobalSearch(); showSection('transactions'); }
        });
    });
    
    // Search customers
    const customers = window.customers || [];
    customers.filter(c => 
        (c.name && c.name.toLowerCase().includes(q)) ||
        (c.email && c.email.toLowerCase().includes(q))
    ).slice(0, 5).forEach(c => {
        matches.push({
            icon: 'fa-user',
            color: '#3b82f6',
            title: c.name,
            subtitle: c.email || c.phone || 'Customer',
            action: () => { closeGlobalSearch(); showSection('crm'); }
        });
    });
    
    // Search products
    const products = window.products || [];
    products.filter(p => 
        (p.name && p.name.toLowerCase().includes(q)) ||
        (p.sku && p.sku.toLowerCase().includes(q))
    ).slice(0, 5).forEach(p => {
        matches.push({
            icon: 'fa-box',
            color: '#8b5cf6',
            title: p.name,
            subtitle: `SKU: ${p.sku || 'N/A'} • Stock: ${p.stock || 0}`,
            action: () => { closeGlobalSearch(); showSection('inventory'); }
        });
    });
    
    if (matches.length === 0) {
        results.innerHTML = '<p style="color: #94a3b8; text-align: center; padding: 20px;">No results found</p>';
        return;
    }
    
    results.innerHTML = matches.map((m, i) => `
        <div onclick="globalSearchResults[${i}].action()" 
             style="display: flex; align-items: center; gap: 12px; padding: 12px; cursor: pointer; 
                    border-radius: 8px; transition: background 0.2s;"
             onmouseover="this.style.background='#f1f5f9'" onmouseout="this.style.background='transparent'">
            <div style="width: 40px; height: 40px; background: ${m.color}20; color: ${m.color}; 
                        border-radius: 10px; display: flex; align-items: center; justify-content: center;">
                <i class="fas ${m.icon}"></i>
            </div>
            <div>
                <div style="font-weight: 500; color: #1e293b;">${m.title}</div>
                <div style="font-size: 12px; color: #64748b;">${m.subtitle}</div>
            </div>
        </div>
    `).join('');
    
    window.globalSearchResults = matches;
}

// ==================== 12. EMAIL DAILY REPORT ====================
function generateDailyReportEmail() {
    const today = new Date().toISOString().split('T')[0];
    const businessName = window.businessData?.settings?.businessName || 'A Lazy Human';
    
    // Get today's data
    const transactions = getTransactionsFromStorage();
    const todayTransactions = transactions.filter(t => t.date === today);
    
    const todayIncome = todayTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);
    const todayExpense = todayTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);
    const netProfit = todayIncome - todayExpense;
    
    // Get orders
    const orders = window.orders || [];
    const todayOrders = orders.filter(o => o.date === today);
    const orderTotal = todayOrders.reduce((sum, o) => sum + parseFloat(o.total || 0), 0);
    
    // Get pending bills
    const bills = getBillsFromStorage();
    const pendingBills = bills.filter(b => b.status !== 'paid');
    const overdueBills = pendingBills.filter(b => new Date(b.dueDate) < new Date());
    
    // Build email body
    const subject = `📊 Daily Report - ${businessName} - ${today}`;
    const body = `
DAILY BUSINESS REPORT
${businessName}
Date: ${today}
Generated: ${new Date().toLocaleString()}

═══════════════════════════════════
📈 TODAY'S SUMMARY
═══════════════════════════════════
Income:      RM ${todayIncome.toFixed(2)}
Expenses:    RM ${todayExpense.toFixed(2)}
Net Profit:  RM ${netProfit.toFixed(2)}

═══════════════════════════════════
🛒 SALES
═══════════════════════════════════
Orders Today:    ${todayOrders.length}
Sales Total:     RM ${orderTotal.toFixed(2)}

═══════════════════════════════════
📋 BILLS STATUS
═══════════════════════════════════
Pending Bills:   ${pendingBills.length}
Overdue Bills:   ${overdueBills.length}

═══════════════════════════════════
📝 TODAY'S TRANSACTIONS (${todayTransactions.length})
═══════════════════════════════════
${todayTransactions.length > 0 ? todayTransactions.map(t => 
    `${t.type === 'income' ? '➕' : '➖'} ${t.description || t.category}: RM ${parseFloat(t.amount).toFixed(2)}`
).join('\n') : 'No transactions recorded today'}

---
Report generated by A Lazy Human ERP
    `.trim();
    
    return { subject, body };
}

function sendDailyReportEmail() {
    const { subject, body } = generateDailyReportEmail();
    const recipient = localStorage.getItem('ezcubic_report_email') || '';
    
    // Create mailto link
    const mailtoLink = `mailto:${recipient}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    
    // Open email client
    window.location.href = mailtoLink;
    
    showNotification('Email client opened with daily report', 'success');
}

function showEmailReportModal() {
    const savedEmail = localStorage.getItem('ezcubic_report_email') || '';
    const savedTime = localStorage.getItem('ezcubic_report_reminder_time') || '18:00';
    const reminderEnabled = localStorage.getItem('ezcubic_report_reminder') === 'true';
    
    const modal = document.createElement('div');
    modal.id = 'emailReportModal';
    modal.innerHTML = `
        <div style="position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 99999; 
                    display: flex; align-items: center; justify-content: center; padding: 20px;"
             onclick="if(event.target === this) this.remove()">
            <div style="background: white; border-radius: 16px; width: 100%; max-width: 450px; 
                        box-shadow: 0 20px 50px rgba(0,0,0,0.3); overflow: hidden;">
                <div style="padding: 20px; background: linear-gradient(135deg, #2563eb, #1d4ed8); color: white;">
                    <h3 style="margin: 0; display: flex; align-items: center; gap: 10px;">
                        <i class="fas fa-envelope"></i> Daily Report Email
                    </h3>
                </div>
                <div style="padding: 20px;">
                    <div style="margin-bottom: 15px;">
                        <label style="display: block; margin-bottom: 5px; font-weight: 500;">Your Email Address</label>
                        <input type="email" id="reportEmailAddress" class="form-control" value="${savedEmail}"
                               placeholder="your@email.com" style="width: 100%;">
                    </div>
                    
                    <div style="margin-bottom: 15px; padding: 15px; background: #f8fafc; border-radius: 10px;">
                        <label style="display: flex; align-items: center; gap: 10px; cursor: pointer;">
                            <input type="checkbox" id="enableReportReminder" ${reminderEnabled ? 'checked' : ''}>
                            <span style="font-weight: 500;"><i class="fas fa-bell"></i> Daily Reminder</span>
                        </label>
                        <div style="margin-top: 10px; display: flex; align-items: center; gap: 10px;">
                            <span style="color: #64748b;">Remind me at:</span>
                            <input type="time" id="reportReminderTime" class="form-control" value="${savedTime}"
                                   style="width: auto;">
                        </div>
                    </div>
                    
                    <div style="display: flex; gap: 10px;">
                        <button onclick="saveEmailReportSettings()" class="btn-primary" style="flex: 1;">
                            <i class="fas fa-save"></i> Save Settings
                        </button>
                        <button onclick="sendDailyReportEmail()" class="btn-secondary" style="flex: 1;">
                            <i class="fas fa-paper-plane"></i> Send Now
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

function saveEmailReportSettings() {
    const email = document.getElementById('reportEmailAddress').value;
    const reminderEnabled = document.getElementById('enableReportReminder').checked;
    const reminderTime = document.getElementById('reportReminderTime').value;
    
    localStorage.setItem('ezcubic_report_email', email);
    localStorage.setItem('ezcubic_report_reminder', reminderEnabled);
    localStorage.setItem('ezcubic_report_reminder_time', reminderTime);
    
    // Remove modal
    document.getElementById('emailReportModal')?.remove();
    
    showNotification('Email report settings saved!', 'success');
    
    // Restart reminder check
    if (reminderEnabled) {
        initDailyReportReminder();
    }
}

// ==================== 13. DAILY REPORT REMINDER ====================
let reportReminderInterval = null;

function initDailyReportReminder() {
    // Clear existing interval
    if (reportReminderInterval) {
        clearInterval(reportReminderInterval);
    }
    
    const reminderEnabled = localStorage.getItem('ezcubic_report_reminder') === 'true';
    if (!reminderEnabled) return;
    
    const reminderTime = localStorage.getItem('ezcubic_report_reminder_time') || '18:00';
    const lastReminder = localStorage.getItem('ezcubic_last_report_reminder');
    const today = new Date().toISOString().split('T')[0];
    
    // Check every minute
    reportReminderInterval = setInterval(() => {
        const now = new Date();
        const currentTime = now.toTimeString().slice(0, 5); // HH:MM
        const currentDate = now.toISOString().split('T')[0];
        
        // Check if it's reminder time and haven't reminded today
        if (currentTime === reminderTime && lastReminder !== currentDate) {
            localStorage.setItem('ezcubic_last_report_reminder', currentDate);
            showReportReminderNotification();
        }
    }, 60000); // Check every minute
    
    console.log('Daily report reminder initialized for', reminderTime);
}

function showReportReminderNotification() {
    // Create prominent reminder
    const reminder = document.createElement('div');
    reminder.id = 'reportReminderBanner';
    reminder.innerHTML = `
        <div style="position: fixed; bottom: 20px; left: 20px; right: 20px; max-width: 400px;
                    background: linear-gradient(135deg, #2563eb, #1d4ed8); color: white;
                    padding: 20px; border-radius: 16px; box-shadow: 0 10px 30px rgba(37,99,235,0.4);
                    z-index: 99998; animation: slideUp 0.3s ease;">
            <style>
                @keyframes slideUp { from { transform: translateY(100px); opacity: 0; } }
            </style>
            <div style="display: flex; align-items: center; gap: 15px;">
                <div style="font-size: 32px;">📊</div>
                <div style="flex: 1;">
                    <div style="font-weight: 600; font-size: 16px;">Time for Daily Report!</div>
                    <div style="opacity: 0.9; font-size: 14px;">Send your business summary email</div>
                </div>
                <button onclick="this.parentElement.parentElement.parentElement.remove()" 
                        style="background: none; border: none; color: white; font-size: 20px; cursor: pointer; opacity: 0.7;">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div style="display: flex; gap: 10px; margin-top: 15px;">
                <button onclick="sendDailyReportEmail(); this.parentElement.parentElement.parentElement.remove();"
                        style="flex: 1; padding: 10px; background: white; color: #2563eb; border: none; 
                               border-radius: 8px; font-weight: 600; cursor: pointer;">
                    <i class="fas fa-paper-plane"></i> Send Report
                </button>
                <button onclick="this.parentElement.parentElement.parentElement.remove();"
                        style="padding: 10px 15px; background: rgba(255,255,255,0.2); color: white; 
                               border: none; border-radius: 8px; cursor: pointer;">
                    Later
                </button>
            </div>
        </div>
    `;
    document.body.appendChild(reminder);
    
    // Also show notification
    showNotification('📊 Time to send your daily report!', 'info');
}

// ==================== 14. QUOTATION PDF EXPORT ====================
const quotationTemplates = {
    modern: {
        name: 'Modern',
        primaryColor: '#2563eb',
        headerBg: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
        style: 'clean'
    },
    classic: {
        name: 'Classic',
        primaryColor: '#1e293b',
        headerBg: '#1e293b',
        style: 'traditional'
    },
    minimal: {
        name: 'Minimal',
        primaryColor: '#374151',
        headerBg: '#ffffff',
        style: 'simple'
    },
    professional: {
        name: 'Professional',
        primaryColor: '#059669',
        headerBg: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
        style: 'corporate'
    }
};

function getSelectedTemplate() {
    return localStorage.getItem('ezcubic_quotation_template') || 'modern';
}

function setQuotationTemplate(templateId) {
    localStorage.setItem('ezcubic_quotation_template', templateId);
    showNotification(`Template changed to ${quotationTemplates[templateId]?.name || 'Modern'}`, 'success');
}

function showTemplateSelector() {
    const current = getSelectedTemplate();
    
    const modal = document.createElement('div');
    modal.id = 'templateSelectorModal';
    modal.innerHTML = `
        <div style="position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 99999; 
                    display: flex; align-items: center; justify-content: center; padding: 20px;"
             onclick="if(event.target === this) this.remove()">
            <div style="background: white; border-radius: 16px; width: 100%; max-width: 700px; 
                        box-shadow: 0 20px 50px rgba(0,0,0,0.3); overflow: hidden;">
                <div style="padding: 20px; background: linear-gradient(135deg, #2563eb, #1d4ed8); color: white;">
                    <h3 style="margin: 0;"><i class="fas fa-palette"></i> Choose Quotation Template</h3>
                </div>
                <div style="padding: 20px; display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px;">
                    ${Object.entries(quotationTemplates).map(([id, t]) => `
                        <div onclick="setQuotationTemplate('${id}'); document.getElementById('templateSelectorModal').remove();"
                             style="border: 2px solid ${current === id ? '#2563eb' : '#e2e8f0'}; border-radius: 12px; 
                                    padding: 15px; cursor: pointer; transition: all 0.2s;
                                    ${current === id ? 'background: #eff6ff;' : ''}"
                             onmouseover="this.style.borderColor='#2563eb'" 
                             onmouseout="this.style.borderColor='${current === id ? '#2563eb' : '#e2e8f0'}'">
                            <div style="height: 80px; background: ${t.headerBg}; border-radius: 8px; margin-bottom: 10px;
                                        display: flex; align-items: center; justify-content: center; color: ${t.style === 'simple' ? '#374151' : 'white'};">
                                <span style="font-weight: 600;">QUOTATION</span>
                            </div>
                            <div style="display: flex; justify-content: space-between; align-items: center;">
                                <span style="font-weight: 600; color: #1e293b;">${t.name}</span>
                                ${current === id ? '<i class="fas fa-check-circle" style="color: #2563eb;"></i>' : ''}
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

function generateQuotationPDF(quotationId) {
    const quotations = window.quotations || [];
    const quotation = quotations.find(q => q.id == quotationId);
    if (!quotation) {
        showNotification('Quotation not found', 'error');
        return;
    }
    
    const template = quotationTemplates[getSelectedTemplate()] || quotationTemplates.modern;
    const logo = getCompanyLogo();
    
    // Get company details
    const settings = window.businessData?.settings || {};
    const companyName = settings.businessName || 'Your Company';
    const companyAddress = settings.businessAddress || localStorage.getItem('ezcubic_business_address') || '';
    const companyPhone = settings.businessPhone || localStorage.getItem('ezcubic_business_phone') || '';
    const companyEmail = settings.businessEmail || localStorage.getItem('ezcubic_business_email') || '';
    const companyWebsite = settings.businessWebsite || localStorage.getItem('ezcubic_business_website') || '';
    const companySSM = settings.ssmNumber || '';
    const bankAccount = settings.businessBankAccount || localStorage.getItem('ezcubic_business_bank') || '';
    
    // Get customer info
    let customerInfo = { name: quotation.customerName, company: quotation.customerCompany };
    if (typeof crmCustomers !== 'undefined' && quotation.customerId) {
        const customer = crmCustomers.find(c => c.id === quotation.customerId);
        if (customer) customerInfo = customer;
    }
    
    const pdfContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Quotation ${quotation.quotationNo}</title>
            <style>
                * { margin: 0; padding: 0; box-sizing: border-box; }
                body { font-family: 'Segoe UI', Arial, sans-serif; color: #333; background: white; }
                .page { max-width: 800px; margin: 0 auto; padding: 40px; }
                
                .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 3px solid ${template.primaryColor}; }
                .company-section { display: flex; gap: 20px; align-items: center; }
                .company-logo { width: 80px; height: 80px; object-fit: contain; }
                .company-logo-placeholder { width: 80px; height: 80px; background: #f1f5f9; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: #94a3b8; font-size: 32px; }
                .company-info h1 { font-size: 22px; color: ${template.primaryColor}; margin-bottom: 5px; }
                .company-info p { font-size: 11px; color: #64748b; line-height: 1.4; }
                
                .doc-title { text-align: right; }
                .doc-title h2 { font-size: 28px; color: ${template.primaryColor}; letter-spacing: 2px; }
                .doc-title .number { font-size: 14px; color: #64748b; margin-top: 5px; }
                
                .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 30px; margin-bottom: 30px; }
                .info-box { background: #f8fafc; padding: 15px; border-radius: 8px; border-left: 3px solid ${template.primaryColor}; }
                .info-box h3 { font-size: 11px; text-transform: uppercase; color: ${template.primaryColor}; margin-bottom: 10px; letter-spacing: 1px; }
                .info-box p { font-size: 12px; margin-bottom: 3px; color: #334155; }
                .info-box strong { color: #1e293b; }
                
                table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
                th { background: ${template.primaryColor}; color: white; padding: 12px; text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; }
                td { padding: 12px; border-bottom: 1px solid #e2e8f0; font-size: 12px; }
                .text-right { text-align: right; }
                .text-center { text-align: center; }
                
                .totals { margin-left: auto; width: 280px; }
                .totals .row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e2e8f0; font-size: 13px; }
                .totals .row.grand { background: ${template.primaryColor}; color: white; padding: 12px; margin-top: 10px; border-radius: 6px; font-weight: bold; font-size: 15px; }
                
                .terms { margin-top: 30px; padding: 20px; background: #f8fafc; border-radius: 8px; }
                .terms h3 { font-size: 12px; color: ${template.primaryColor}; margin-bottom: 10px; text-transform: uppercase; }
                .terms p { font-size: 11px; color: #64748b; white-space: pre-line; line-height: 1.6; }
                
                .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e2e8f0; text-align: center; font-size: 10px; color: #94a3b8; }
                .bank-info { background: #fef3c7; padding: 15px; border-radius: 8px; margin-top: 20px; }
                .bank-info h4 { font-size: 11px; color: #92400e; margin-bottom: 8px; }
                .bank-info p { font-size: 12px; color: #78350f; }
                
                @media print { 
                    body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
                    .page { padding: 20px; }
                    .no-print { display: none; }
                }
            </style>
        </head>
        <body>
            <div class="page">
                <div class="header">
                    <div class="company-section">
                        ${logo ? `<img src="${logo}" class="company-logo" alt="Logo">` : `<div class="company-logo-placeholder"><i class="fas fa-building"></i>🏢</div>`}
                        <div class="company-info">
                            <h1>${escapeHtml(companyName)}</h1>
                            ${companySSM ? `<p><strong>Reg No:</strong> ${escapeHtml(companySSM)}</p>` : ''}
                            ${companyAddress ? `<p>${escapeHtml(companyAddress)}</p>` : ''}
                            ${companyPhone ? `<p>Tel: ${escapeHtml(companyPhone)}</p>` : ''}
                            ${companyEmail ? `<p>Email: ${escapeHtml(companyEmail)}</p>` : ''}
                            ${companyWebsite ? `<p>Web: ${escapeHtml(companyWebsite)}</p>` : ''}
                        </div>
                    </div>
                    <div class="doc-title">
                        <h2>QUOTATION</h2>
                        <div class="number">${escapeHtml(quotation.quotationNo)}</div>
                    </div>
                </div>
                
                <div class="info-grid">
                    <div class="info-box">
                        <h3>Bill To</h3>
                        <p><strong>${escapeHtml(customerInfo.name)}</strong></p>
                        ${customerInfo.company ? `<p>${escapeHtml(customerInfo.company)}</p>` : ''}
                        ${customerInfo.address ? `<p>${escapeHtml(customerInfo.address)}</p>` : ''}
                        ${customerInfo.phone ? `<p>Tel: ${escapeHtml(customerInfo.phone)}</p>` : ''}
                        ${customerInfo.email ? `<p>Email: ${escapeHtml(customerInfo.email)}</p>` : ''}
                    </div>
                    <div class="info-box">
                        <h3>Quotation Details</h3>
                        <p><strong>Date:</strong> ${quotation.date}</p>
                        <p><strong>Valid Until:</strong> ${quotation.validUntil}</p>
                        ${quotation.subject ? `<p><strong>Subject:</strong> ${escapeHtml(quotation.subject)}</p>` : ''}
                        ${quotation.salesperson ? `<p><strong>Salesperson:</strong> ${escapeHtml(quotation.salesperson)}</p>` : ''}
                    </div>
                </div>
                
                <table>
                    <thead>
                        <tr>
                            <th style="width: 5%;">#</th>
                            <th style="width: 45%;">Description</th>
                            <th class="text-center" style="width: 12%;">Qty</th>
                            <th class="text-right" style="width: 19%;">Unit Price</th>
                            <th class="text-right" style="width: 19%;">Amount</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${(quotation.items || []).map((item, i) => `
                            <tr>
                                <td>${i + 1}</td>
                                <td>${escapeHtml(item.description)}</td>
                                <td class="text-center">${item.quantity}</td>
                                <td class="text-right">RM ${parseFloat(item.unitPrice || 0).toFixed(2)}</td>
                                <td class="text-right">RM ${parseFloat(item.total || item.lineTotal || 0).toFixed(2)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
                
                <div class="totals">
                    <div class="row">
                        <span>Subtotal:</span>
                        <span>RM ${parseFloat(quotation.subtotal || 0).toFixed(2)}</span>
                    </div>
                    ${quotation.discount > 0 ? `
                    <div class="row">
                        <span>Discount (${quotation.discount}%):</span>
                        <span>- RM ${parseFloat(quotation.discountAmount || 0).toFixed(2)}</span>
                    </div>
                    ` : ''}
                    ${quotation.taxRate > 0 ? `
                    <div class="row">
                        <span>SST/Tax (${quotation.taxRate}%):</span>
                        <span>+ RM ${parseFloat(quotation.taxAmount || 0).toFixed(2)}</span>
                    </div>
                    ` : ''}
                    <div class="row grand">
                        <span>TOTAL</span>
                        <span>RM ${parseFloat(quotation.totalAmount || quotation.total || 0).toFixed(2)}</span>
                    </div>
                </div>
                
                ${bankAccount ? `
                <div class="bank-info">
                    <h4>💳 Payment Details</h4>
                    <p>${escapeHtml(bankAccount)}</p>
                </div>
                ` : ''}
                
                ${quotation.notes ? `
                <div class="terms">
                    <h3>Notes</h3>
                    <p>${escapeHtml(quotation.notes)}</p>
                </div>
                ` : ''}
                
                ${quotation.terms ? `
                <div class="terms">
                    <h3>Terms & Conditions</h3>
                    <p>${escapeHtml(quotation.terms)}</p>
                </div>
                ` : ''}
                
                <div class="footer">
                    <p>This is a computer-generated document. No signature is required.</p>
                    <p>Thank you for your business!</p>
                </div>
                
                <div class="no-print" style="text-align: center; margin-top: 30px; padding: 20px; background: #f0f9ff; border-radius: 10px;">
                    <button onclick="window.print()" style="padding: 12px 30px; background: ${template.primaryColor}; color: white; border: none; border-radius: 8px; font-size: 14px; cursor: pointer; margin-right: 10px;">
                        <i class="fas fa-print"></i> Print / Save as PDF
                    </button>
                    <button onclick="window.close()" style="padding: 12px 30px; background: #64748b; color: white; border: none; border-radius: 8px; font-size: 14px; cursor: pointer;">
                        Close
                    </button>
                    <p style="margin-top: 10px; font-size: 12px; color: #64748b;">
                        💡 Tip: To save as PDF, choose "Save as PDF" as your printer
                    </p>
                </div>
            </div>
        </body>
        </html>
    `;
    
    const pdfWindow = window.open('', '_blank');
    pdfWindow.document.write(pdfContent);
    pdfWindow.document.close();
}

// Helper for escaping HTML
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ==================== 15. INVOICE PDF EXPORT & TEMPLATES ====================
const invoiceTemplates = {
    modern: {
        name: 'Modern',
        primaryColor: '#2563eb',
        headerBg: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
        style: 'clean'
    },
    classic: {
        name: 'Classic',
        primaryColor: '#1e293b',
        headerBg: '#1e293b',
        style: 'traditional'
    },
    minimal: {
        name: 'Minimal',
        primaryColor: '#374151',
        headerBg: '#ffffff',
        style: 'simple'
    },
    professional: {
        name: 'Professional',
        primaryColor: '#059669',
        headerBg: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
        style: 'corporate'
    },
    elegant: {
        name: 'Elegant',
        primaryColor: '#7c3aed',
        headerBg: 'linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%)',
        style: 'premium'
    }
};

function getSelectedInvoiceTemplate() {
    return localStorage.getItem('ezcubic_invoice_template') || 'modern';
}

function setInvoiceTemplate(templateId) {
    localStorage.setItem('ezcubic_invoice_template', templateId);
    showNotification(`Invoice template changed to ${invoiceTemplates[templateId]?.name || 'Modern'}`, 'success');
}

function showInvoiceTemplateSelector() {
    const current = getSelectedInvoiceTemplate();
    
    const modal = document.createElement('div');
    modal.id = 'invoiceTemplateSelectorModal';
    modal.innerHTML = `
        <div style="position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 99999; 
                    display: flex; align-items: center; justify-content: center; padding: 20px;"
             onclick="if(event.target === this) this.remove()">
            <div style="background: white; border-radius: 16px; width: 100%; max-width: 800px; 
                        box-shadow: 0 20px 50px rgba(0,0,0,0.3); overflow: hidden;">
                <div style="padding: 20px; background: linear-gradient(135deg, #2563eb, #1d4ed8); color: white;">
                    <h3 style="margin: 0;"><i class="fas fa-palette"></i> Choose Invoice Template</h3>
                </div>
                <div style="padding: 20px; display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px;">
                    ${Object.entries(invoiceTemplates).map(([id, t]) => `
                        <div onclick="setInvoiceTemplate('${id}'); document.getElementById('invoiceTemplateSelectorModal').remove();"
                             style="border: 2px solid ${current === id ? '#2563eb' : '#e2e8f0'}; border-radius: 12px; 
                                    padding: 15px; cursor: pointer; transition: all 0.2s;
                                    ${current === id ? 'background: #eff6ff;' : ''}"
                             onmouseover="this.style.borderColor='#2563eb'" 
                             onmouseout="this.style.borderColor='${current === id ? '#2563eb' : '#e2e8f0'}'">
                            <div style="height: 70px; background: ${t.headerBg}; border-radius: 8px; margin-bottom: 10px;
                                        display: flex; align-items: center; justify-content: center; color: ${t.style === 'simple' ? '#374151' : 'white'};">
                                <span style="font-weight: 600; font-size: 14px;">INVOICE</span>
                            </div>
                            <div style="display: flex; justify-content: space-between; align-items: center;">
                                <span style="font-weight: 600; color: #1e293b; font-size: 13px;">${t.name}</span>
                                ${current === id ? '<i class="fas fa-check-circle" style="color: #2563eb;"></i>' : ''}
                            </div>
                        </div>
                    `).join('')}
                </div>
                <div style="padding: 15px 20px; background: #f8fafc; border-top: 1px solid #e2e8f0; text-align: center;">
                    <p style="margin: 0; color: #64748b; font-size: 13px;">
                        <i class="fas fa-info-circle"></i> Selected template will be used when generating invoice PDF
                    </p>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

function generateInvoicePDF(invoiceId) {
    const invoices = window.invoices || [];
    const invoice = invoices.find(i => i.id == invoiceId);
    if (!invoice) {
        showNotification('Invoice not found', 'error');
        return;
    }
    
    const template = invoiceTemplates[getSelectedInvoiceTemplate()] || invoiceTemplates.modern;
    const logo = getCompanyLogo();
    
    // Get company details
    const settings = window.businessData?.settings || {};
    const companyName = settings.businessName || 'Your Company';
    const companyAddress = settings.businessAddress || localStorage.getItem('ezcubic_business_address') || '';
    const companyPhone = settings.businessPhone || localStorage.getItem('ezcubic_business_phone') || '';
    const companyEmail = settings.businessEmail || localStorage.getItem('ezcubic_business_email') || '';
    const companyWebsite = settings.businessWebsite || localStorage.getItem('ezcubic_business_website') || '';
    const companySSM = settings.ssmNumber || '';
    const bankAccount = settings.businessBankAccount || localStorage.getItem('ezcubic_business_bank') || '';
    
    // Get customer info
    let customerInfo = { 
        name: invoice.customerName, 
        company: invoice.customerDetails?.company || '',
        address: invoice.customerDetails?.address || '',
        email: invoice.customerDetails?.email || '',
        phone: invoice.customerDetails?.phone || ''
    };
    
    // Status display
    let statusLabel = 'Unpaid';
    let statusColor = '#ef4444';
    let statusBg = '#fee2e2';
    if (invoice.status === 'paid') {
        statusLabel = 'PAID';
        statusColor = '#10b981';
        statusBg = '#d1fae5';
    } else if (invoice.status === 'partial') {
        statusLabel = 'PARTIAL';
        statusColor = '#f59e0b';
        statusBg = '#fef3c7';
    } else if (invoice.status === 'overdue' || (invoice.status === 'unpaid' && new Date(invoice.dueDate) < new Date())) {
        statusLabel = 'OVERDUE';
        statusColor = '#dc2626';
        statusBg = '#fecaca';
    }
    
    const pdfContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Invoice ${invoice.invoiceNo}</title>
            <style>
                * { margin: 0; padding: 0; box-sizing: border-box; }
                body { font-family: 'Segoe UI', Arial, sans-serif; color: #333; background: white; }
                .page { max-width: 800px; margin: 0 auto; padding: 40px; }
                
                .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 3px solid ${template.primaryColor}; }
                .company-section { display: flex; gap: 20px; align-items: center; }
                .company-logo { width: 80px; height: 80px; object-fit: contain; }
                .company-logo-placeholder { width: 80px; height: 80px; background: #f1f5f9; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: #94a3b8; font-size: 32px; }
                .company-info h1 { font-size: 22px; color: ${template.primaryColor}; margin-bottom: 5px; }
                .company-info p { font-size: 11px; color: #64748b; line-height: 1.4; }
                
                .doc-title { text-align: right; }
                .doc-title h2 { font-size: 28px; color: ${template.primaryColor}; letter-spacing: 2px; }
                .doc-title .number { font-size: 14px; color: #64748b; margin-top: 5px; }
                .status-badge { display: inline-block; padding: 6px 16px; border-radius: 20px; font-size: 12px; font-weight: 700; background: ${statusBg}; color: ${statusColor}; margin-top: 8px; }
                
                .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 30px; margin-bottom: 30px; }
                .info-box { background: #f8fafc; padding: 15px; border-radius: 8px; border-left: 3px solid ${template.primaryColor}; }
                .info-box h3 { font-size: 11px; text-transform: uppercase; color: ${template.primaryColor}; margin-bottom: 10px; letter-spacing: 1px; }
                .info-box p { font-size: 12px; margin-bottom: 3px; color: #334155; }
                .info-box strong { color: #1e293b; }
                
                table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
                th { background: ${template.primaryColor}; color: white; padding: 12px; text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; }
                td { padding: 12px; border-bottom: 1px solid #e2e8f0; font-size: 12px; }
                .text-right { text-align: right; }
                .text-center { text-align: center; }
                
                .totals { margin-left: auto; width: 280px; }
                .totals .row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e2e8f0; font-size: 13px; }
                .totals .row.grand { background: ${template.primaryColor}; color: white; padding: 12px; margin-top: 10px; border-radius: 6px; font-weight: bold; font-size: 15px; }
                .totals .row.paid { color: #10b981; }
                .totals .row.balance { color: #ef4444; font-weight: 600; }
                
                .terms { margin-top: 30px; padding: 20px; background: #f8fafc; border-radius: 8px; }
                .terms h3 { font-size: 12px; color: ${template.primaryColor}; margin-bottom: 10px; text-transform: uppercase; }
                .terms p { font-size: 11px; color: #64748b; white-space: pre-line; line-height: 1.6; }
                
                .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e2e8f0; text-align: center; font-size: 10px; color: #94a3b8; }
                .bank-info { background: #fef3c7; padding: 15px; border-radius: 8px; margin-top: 20px; }
                .bank-info h4 { font-size: 11px; color: #92400e; margin-bottom: 8px; }
                .bank-info p { font-size: 12px; color: #78350f; white-space: pre-line; }
                
                .payment-history { margin-top: 20px; background: #f0fdf4; padding: 15px; border-radius: 8px; }
                .payment-history h4 { font-size: 11px; color: #166534; margin-bottom: 10px; text-transform: uppercase; }
                .payment-history table { margin: 0; }
                .payment-history th { background: #166534; }
                
                @media print { 
                    body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
                    .page { padding: 20px; }
                    .no-print { display: none; }
                }
            </style>
        </head>
        <body>
            <div class="page">
                <div class="header">
                    <div class="company-section">
                        ${logo ? `<img src="${logo}" class="company-logo" alt="Logo">` : `<div class="company-logo-placeholder">🏢</div>`}
                        <div class="company-info">
                            <h1>${escapeHtml(companyName)}</h1>
                            ${companySSM ? `<p><strong>Reg No:</strong> ${escapeHtml(companySSM)}</p>` : ''}
                            ${companyAddress ? `<p>${escapeHtml(companyAddress)}</p>` : ''}
                            ${companyPhone ? `<p>Tel: ${escapeHtml(companyPhone)}</p>` : ''}
                            ${companyEmail ? `<p>Email: ${escapeHtml(companyEmail)}</p>` : ''}
                            ${companyWebsite ? `<p>Web: ${escapeHtml(companyWebsite)}</p>` : ''}
                        </div>
                    </div>
                    <div class="doc-title">
                        <h2>INVOICE</h2>
                        <div class="number">${escapeHtml(invoice.invoiceNo)}</div>
                        <div class="status-badge">${statusLabel}</div>
                    </div>
                </div>
                
                <div class="info-grid">
                    <div class="info-box">
                        <h3>Bill To</h3>
                        <p><strong>${escapeHtml(customerInfo.name || customerInfo.company)}</strong></p>
                        ${customerInfo.company && customerInfo.name !== customerInfo.company ? `<p>${escapeHtml(customerInfo.company)}</p>` : ''}
                        ${customerInfo.address ? `<p>${escapeHtml(customerInfo.address)}</p>` : ''}
                        ${customerInfo.phone ? `<p>Tel: ${escapeHtml(customerInfo.phone)}</p>` : ''}
                        ${customerInfo.email ? `<p>Email: ${escapeHtml(customerInfo.email)}</p>` : ''}
                    </div>
                    <div class="info-box">
                        <h3>Invoice Details</h3>
                        <p><strong>Invoice Date:</strong> ${invoice.date}</p>
                        <p><strong>Due Date:</strong> ${invoice.dueDate}</p>
                        ${invoice.description ? `<p><strong>Description:</strong> ${escapeHtml(invoice.description)}</p>` : ''}
                        ${invoice.isRecurring ? `<p><strong>Recurring:</strong> ${invoice.recurringFrequency}</p>` : ''}
                    </div>
                </div>
                
                <table>
                    <thead>
                        <tr>
                            <th style="width: 5%;">#</th>
                            <th style="width: 45%;">Description</th>
                            <th class="text-center" style="width: 12%;">Qty</th>
                            <th class="text-right" style="width: 19%;">Unit Price</th>
                            <th class="text-right" style="width: 19%;">Amount</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${(invoice.items || []).map((item, i) => `
                            <tr>
                                <td>${i + 1}</td>
                                <td>${escapeHtml(item.description)}</td>
                                <td class="text-center">${item.quantity}</td>
                                <td class="text-right">RM ${parseFloat(item.unitPrice || 0).toFixed(2)}</td>
                                <td class="text-right">RM ${parseFloat(item.amount || 0).toFixed(2)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
                
                <div class="totals">
                    <div class="row">
                        <span>Subtotal:</span>
                        <span>RM ${parseFloat(invoice.subtotal || 0).toFixed(2)}</span>
                    </div>
                    ${invoice.tax > 0 ? `
                    <div class="row">
                        <span>Tax (${invoice.taxRate}%):</span>
                        <span>RM ${parseFloat(invoice.tax || 0).toFixed(2)}</span>
                    </div>
                    ` : ''}
                    <div class="row grand">
                        <span>TOTAL</span>
                        <span>RM ${parseFloat(invoice.total || 0).toFixed(2)}</span>
                    </div>
                    ${invoice.paidAmount > 0 ? `
                    <div class="row paid">
                        <span>Amount Paid:</span>
                        <span>RM ${parseFloat(invoice.paidAmount || 0).toFixed(2)}</span>
                    </div>
                    <div class="row balance">
                        <span>Balance Due:</span>
                        <span>RM ${parseFloat((invoice.total || 0) - (invoice.paidAmount || 0)).toFixed(2)}</span>
                    </div>
                    ` : ''}
                </div>
                
                ${bankAccount ? `
                <div class="bank-info">
                    <h4>💳 Payment Details</h4>
                    <p>${escapeHtml(bankAccount)}</p>
                </div>
                ` : ''}
                
                ${invoice.payments && invoice.payments.length > 0 ? `
                <div class="payment-history">
                    <h4>💰 Payment History</h4>
                    <table>
                        <thead>
                            <tr>
                                <th>Date</th>
                                <th>Method</th>
                                <th>Reference</th>
                                <th class="text-right">Amount</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${invoice.payments.map(p => `
                                <tr>
                                    <td>${p.date}</td>
                                    <td>${p.method}</td>
                                    <td>${escapeHtml(p.reference || '-')}</td>
                                    <td class="text-right">RM ${parseFloat(p.amount || 0).toFixed(2)}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
                ` : ''}
                
                ${invoice.notes ? `
                <div class="terms">
                    <h3>Notes</h3>
                    <p>${escapeHtml(invoice.notes)}</p>
                </div>
                ` : ''}
                
                ${invoice.terms ? `
                <div class="terms">
                    <h3>Terms & Conditions</h3>
                    <p>${escapeHtml(invoice.terms)}</p>
                </div>
                ` : ''}
                
                <div class="footer">
                    <p>This is a computer-generated document. No signature is required.</p>
                    <p>Thank you for your business!</p>
                </div>
                
                <div class="no-print" style="text-align: center; margin-top: 30px; padding: 20px; background: #f0f9ff; border-radius: 10px;">
                    <button onclick="window.print()" style="padding: 12px 30px; background: ${template.primaryColor}; color: white; border: none; border-radius: 8px; font-size: 14px; cursor: pointer; margin-right: 10px;">
                        <i class="fas fa-print"></i> Print / Save as PDF
                    </button>
                    <button onclick="window.close()" style="padding: 12px 30px; background: #64748b; color: white; border: none; border-radius: 8px; font-size: 14px; cursor: pointer;">
                        Close
                    </button>
                    <p style="margin-top: 10px; font-size: 12px; color: #64748b;">
                        💡 Tip: To save as PDF, choose "Save as PDF" as your printer
                    </p>
                </div>
            </div>
        </body>
        </html>
    `;
    
    const pdfWindow = window.open('', '_blank');
    pdfWindow.document.write(pdfContent);
    pdfWindow.document.close();
}

// ==================== INITIALIZATION ====================
function initAddons() {
    console.log('Initializing add-ons...');
    
    // Add dark mode styles
    addDarkModeStyles();
    initDarkMode();
    
    // Load company logo
    loadCompanyLogo();
    
    // Init keyboard shortcuts
    initKeyboardShortcuts();
    
    // Init quick add button (after small delay for page load)
    setTimeout(() => {
        initQuickAddButton();
    }, 1000);
    
    // Check reminders on login (after 3 seconds)
    setTimeout(() => {
        checkPaymentReminders();
        checkLowStockAlerts();
    }, 3000);
    
    // Init daily report reminder
    initDailyReportReminder();
    
    console.log('Add-ons initialized');
}

// Auto-init when DOM ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAddons);
} else {
    initAddons();
}

// ==================== GLOBAL EXPORTS ====================
// Logo management
window.handleLogoUpload = handleLogoUpload;
window.updateLogoPreview = updateLogoPreview;
window.removeCompanyLogo = removeCompanyLogo;
window.loadCompanyLogo = loadCompanyLogo;
window.getCompanyLogo = getCompanyLogo;

// Barcode
window.handlePOSBarcode = handlePOSBarcode;
window.openBarcodeScanner = openBarcodeScanner;
window.closeBarcodeScanner = closeBarcodeScanner;
window.toggleDarkMode = toggleDarkMode;
window.exportToCSV = exportToCSV;
window.exportTransactionsCSV = exportTransactionsCSV;
window.exportBillsCSV = exportBillsCSV;
window.exportInventoryCSV = exportInventoryCSV;
window.exportCustomersCSV = exportCustomersCSV;
window.exportOrdersCSV = exportOrdersCSV;
window.toggleQuickAddMenu = toggleQuickAddMenu;
window.quickAddIncome = quickAddIncome;
window.quickAddExpense = quickAddExpense;
window.quickAddBill = quickAddBill;
window.quickAddProduct = quickAddProduct;
window.quickAddCustomer = quickAddCustomer;
window.getRecentActivity = getRecentActivity;
window.renderRecentActivityWidget = renderRecentActivityWidget;
window.duplicateQuotation = duplicateQuotation;
window.duplicateOrder = duplicateOrder;
window.printTable = printTable;
window.checkPaymentReminders = checkPaymentReminders;
window.checkLowStockAlerts = checkLowStockAlerts;
window.shareViaWhatsApp = shareViaWhatsApp;
window.shareOrderWhatsApp = shareOrderWhatsApp;
window.shareQuotationWhatsApp = shareQuotationWhatsApp;
window.openGlobalSearch = openGlobalSearch;
window.closeGlobalSearch = closeGlobalSearch;
window.performGlobalSearch = performGlobalSearch;
window.generateDailyReportEmail = generateDailyReportEmail;
window.sendDailyReportEmail = sendDailyReportEmail;
window.showEmailReportModal = showEmailReportModal;
window.saveEmailReportSettings = saveEmailReportSettings;
window.initDailyReportReminder = initDailyReportReminder;
window.showReportReminderNotification = showReportReminderNotification;

// Quotation PDF & Templates
window.quotationTemplates = quotationTemplates;
window.getSelectedTemplate = getSelectedTemplate;
window.setQuotationTemplate = setQuotationTemplate;
window.showTemplateSelector = showTemplateSelector;
window.generateQuotationPDF = generateQuotationPDF;

// Invoice PDF & Templates
window.invoiceTemplates = invoiceTemplates;
window.getSelectedInvoiceTemplate = getSelectedInvoiceTemplate;
window.setInvoiceTemplate = setInvoiceTemplate;
window.showInvoiceTemplateSelector = showInvoiceTemplateSelector;
window.generateInvoicePDF = generateInvoicePDF;
