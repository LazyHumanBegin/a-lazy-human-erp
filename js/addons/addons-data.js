// ==================== ADDONS-DATA.JS ====================
// EZCubic - Addons Data Module - Logo, barcode, dark mode, CSV export - Split from addons-core.js v2.3.2

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

// ==================== WINDOW EXPORTS ====================
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
