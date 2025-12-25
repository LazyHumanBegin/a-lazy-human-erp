// ==================== ADDONS-CORE.JS ====================
// Core Add-on Features - Part A
// Logo, Barcode, Dark Mode, Keyboard, CSV, Quick Add, Utils

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
            background: #0f172a !important;
        }
        
        /* Main Content Area */
        body.dark-mode .main-content { background: #0f172a; }
        body.dark-mode .content-card { background: #1e293b; border-color: #334155; }
        body.dark-mode .card-header { background: #1e293b; border-color: #334155; }
        body.dark-mode .card-header h2 { color: #f1f5f9; }
        
        /* Nav Panel / Sidebar */
        body.dark-mode .nav-panel {
            background: linear-gradient(180deg, #1e293b 0%, #0f172a 100%) !important;
            border-color: #334155 !important;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4) !important;
        }
        body.dark-mode .logo { border-bottom-color: rgba(37, 99, 235, 0.4) !important; }
        body.dark-mode .logo h1 { color: #60a5fa !important; }
        body.dark-mode .logo .tagline { color: #94a3b8 !important; }
        body.dark-mode .logo .version { 
            background: rgba(251, 191, 36, 0.2) !important; 
            color: #fbbf24 !important; 
        }
        body.dark-mode .nav-btn {
            background: rgba(255, 255, 255, 0.05) !important;
            color: #94a3b8 !important;
        }
        body.dark-mode .nav-btn:hover {
            background: rgba(37, 99, 235, 0.3) !important;
            color: #fff !important;
        }
        body.dark-mode .nav-btn.active {
            background: linear-gradient(90deg, #2563eb 0%, #1d4ed8 100%) !important;
            color: white !important;
        }
        body.dark-mode .nav-btn i { color: #60a5fa !important; }
        body.dark-mode .nav-btn:hover i,
        body.dark-mode .nav-btn.active i { color: #fff !important; }
        body.dark-mode .nav-separator span { color: #64748b !important; }
        body.dark-mode .quick-actions {
            background: rgba(251, 191, 36, 0.1) !important;
            border-color: rgba(251, 191, 36, 0.3) !important;
        }
        body.dark-mode .quick-actions h3 { color: #fbbf24 !important; }
        body.dark-mode .quick-action-btn {
            background: rgba(37, 99, 235, 0.2) !important;
            border-color: rgba(37, 99, 235, 0.4) !important;
            color: #60a5fa !important;
        }
        body.dark-mode .quick-action-btn:hover {
            background: #2563eb !important;
            color: white !important;
        }
        body.dark-mode .quick-action-btn.alt {
            background: rgba(251, 191, 36, 0.1) !important;
            border-color: rgba(251, 191, 36, 0.4) !important;
            color: #fbbf24 !important;
        }
        body.dark-mode .quick-action-btn.alt:hover {
            background: #fbbf24 !important;
            color: #1e293b !important;
        }
        
        /* Stats */
        body.dark-mode .stat-card { background: #334155; border-color: #475569; }
        body.dark-mode .stat-label { color: #94a3b8; }
        body.dark-mode .stat-value { color: #f1f5f9; }
        
        /* Forms */
        body.dark-mode .form-control { background: #334155; border-color: #475569; color: #f1f5f9; }
        body.dark-mode .form-control::placeholder { color: #64748b; }
        body.dark-mode .form-label { color: #e2e8f0; }
        body.dark-mode select.form-control { background: #334155; color: #f1f5f9; }
        
        /* Tables */
        body.dark-mode table { background: #1e293b; }
        body.dark-mode th { background: #334155; color: #f1f5f9; }
        body.dark-mode td { color: #e2e8f0; border-color: #334155; }
        body.dark-mode tr:hover { background: #334155; }
        body.dark-mode .data-table { background: #1e293b; }
        
        /* Modals */
        body.dark-mode .modal-content { background: #1e293b; color: #f1f5f9; }
        body.dark-mode .modal-header { background: #334155; border-color: #475569; }
        body.dark-mode .modal-footer { background: #1e293b; border-color: #334155; }
        body.dark-mode .modal-title { color: #f1f5f9; }
        
        /* Tabs */
        body.dark-mode .tabs { background: #334155; }
        body.dark-mode .tab { color: #94a3b8; }
        body.dark-mode .tab.active { background: #1e293b; color: #f1f5f9; }
        
        /* Other */
        body.dark-mode h3, body.dark-mode h4 { color: #f1f5f9; }
        body.dark-mode .transaction-item { background: #334155; border-color: #475569; }
        body.dark-mode .empty-state { color: #94a3b8; }
        body.dark-mode p { color: #cbd5e1; }
        body.dark-mode label { color: #e2e8f0; }
        body.dark-mode .btn-secondary { 
            background: #334155 !important; 
            color: #e2e8f0 !important; 
            border-color: #475569 !important; 
        }
        body.dark-mode .btn-secondary:hover { 
            background: #475569 !important; 
        }
        body.dark-mode .section-header { border-color: #334155; }
        body.dark-mode .divider { border-color: #334155; }
        body.dark-mode .status-badge { opacity: 0.9; }
        
        /* AI Assistant Logo */
        body.dark-mode .ai-avatar { background: transparent !important; }
        body.dark-mode .ai-logo-img { 
            background: transparent !important;
            filter: brightness(1.1);
        }
        
        /* Top Auth Bar */
        body.dark-mode .top-auth-bar {
            background: #1e293b !important;
            border-color: #334155 !important;
        }
        body.dark-mode .top-auth-bar span,
        body.dark-mode .top-auth-bar label { color: #94a3b8 !important; }
        
        /* Platform Control */
        body.dark-mode .platform-section { 
            background: #1e293b !important; 
            border-color: #334155 !important; 
        }
        body.dark-mode .platform-stat { 
            background: #334155 !important; 
        }
        body.dark-mode .settings-group { 
            background: #0f172a !important; 
        }
        body.dark-mode .pricing-plan-card {
            background: #334155 !important;
        }
        
        /* Charts */
        body.dark-mode .chart-container { background: #1e293b; }
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

// ==================== GLOBAL EXPORTS - PART A ====================
// Logo management
window.handleLogoUpload = handleLogoUpload;
window.updateLogoPreview = updateLogoPreview;
window.removeCompanyLogo = removeCompanyLogo;
window.loadCompanyLogo = loadCompanyLogo;
window.getCompanyLogo = getCompanyLogo;

// Barcode
window.handlePOSBarcode = handlePOSBarcode;
window.openBarcodeScanner = openBarcodeScanner;
window.startBarcodeCamera = startBarcodeCamera;
window.handleBarcodeResult = handleBarcodeResult;
window.submitManualBarcode = submitManualBarcode;
window.closeBarcodeScanner = closeBarcodeScanner;

// Dark mode
window.initDarkMode = initDarkMode;
window.toggleDarkMode = toggleDarkMode;
window.addDarkModeStyles = addDarkModeStyles;

// Keyboard shortcuts
window.initKeyboardShortcuts = initKeyboardShortcuts;

// CSV Export
window.exportToCSV = exportToCSV;
window.exportTransactionsCSV = exportTransactionsCSV;
window.exportBillsCSV = exportBillsCSV;
window.exportInventoryCSV = exportInventoryCSV;
window.exportCustomersCSV = exportCustomersCSV;
window.exportOrdersCSV = exportOrdersCSV;

// Quick Add
window.initQuickAddButton = initQuickAddButton;
window.toggleQuickAddMenu = toggleQuickAddMenu;
window.quickAddIncome = quickAddIncome;
window.quickAddExpense = quickAddExpense;
window.quickAddBill = quickAddBill;
window.quickAddProduct = quickAddProduct;
window.quickAddCustomer = quickAddCustomer;

// Activity & Utils
window.getRecentActivity = getRecentActivity;
window.renderRecentActivityWidget = renderRecentActivityWidget;
window.duplicateQuotation = duplicateQuotation;
window.duplicateOrder = duplicateOrder;
window.printTable = printTable;
window.checkPaymentReminders = checkPaymentReminders;
window.checkLowStockAlerts = checkLowStockAlerts;

// WhatsApp & Search
window.shareViaWhatsApp = shareViaWhatsApp;
window.shareOrderWhatsApp = shareOrderWhatsApp;
window.shareQuotationWhatsApp = shareQuotationWhatsApp;
window.openGlobalSearch = openGlobalSearch;
window.closeGlobalSearch = closeGlobalSearch;
window.performGlobalSearch = performGlobalSearch;
