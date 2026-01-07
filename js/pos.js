/**
 * A Lazy Human - Point of Sale (POS) Module
 * Cart management, checkout, payment processing, receipts
 * Restaurant table management support
 */

// ==================== POS STATE ====================
let heldSales = [];
let currentPOSCategory = '';

// ==================== ORDER TYPE STATE ====================
let currentOrderType = 'dine-in'; // 'dine-in', 'takeaway', 'delivery'
let currentDeliveryPlatform = ''; // 'grab', 'foodpanda', 'shopeefood', 'own', 'other'
let currentDeliveryOrderId = '';

const DELIVERY_PLATFORMS = [
    { id: 'grab', name: 'Grab', icon: '🟢' },
    { id: 'foodpanda', name: 'FoodPanda', icon: '🩷' },
    { id: 'shopeefood', name: 'ShopeeFood', icon: '🟠' },
    { id: 'own', name: 'Own Delivery', icon: '🚗' },
    { id: 'other', name: 'Other', icon: '📦' }
];

// Platform commission rates (editable in Settings)
const PLATFORM_COMMISSIONS_KEY = 'ezcubic_platform_commissions';

function getPlatformCommissions() {
    const stored = localStorage.getItem(PLATFORM_COMMISSIONS_KEY);
    if (stored) {
        return JSON.parse(stored);
    }
    // Default rates
    return {
        grab: 30,
        foodpanda: 30,
        shopeefood: 25,
        own: 0,
        other: 0
    };
}

function savePlatformCommissions() {
    const commissions = {
        grab: parseFloat(document.getElementById('commissionGrab')?.value) || 30,
        foodpanda: parseFloat(document.getElementById('commissionFoodpanda')?.value) || 30,
        shopeefood: parseFloat(document.getElementById('commissionShopeefood')?.value) || 25,
        own: parseFloat(document.getElementById('commissionOwn')?.value) || 0,
        other: parseFloat(document.getElementById('commissionOther')?.value) || 0
    };
    localStorage.setItem(PLATFORM_COMMISSIONS_KEY, JSON.stringify(commissions));
    showToast('Platform commissions saved', 'success');
}

function loadPlatformCommissions() {
    const commissions = getPlatformCommissions();
    const grabInput = document.getElementById('commissionGrab');
    const foodpandaInput = document.getElementById('commissionFoodpanda');
    const shopeefoodInput = document.getElementById('commissionShopeefood');
    const ownInput = document.getElementById('commissionOwn');
    const otherInput = document.getElementById('commissionOther');
    
    if (grabInput) grabInput.value = commissions.grab;
    if (foodpandaInput) foodpandaInput.value = commissions.foodpanda;
    if (shopeefoodInput) shopeefoodInput.value = commissions.shopeefood;
    if (ownInput) ownInput.value = commissions.own;
    if (otherInput) otherInput.value = commissions.other;
}

// ==================== TABLE MANAGEMENT STATE ====================
let posTables = [];
let currentTable = null; // Currently selected table
let posMode = 'retail'; // 'retail' or 'restaurant'
const POS_TABLES_KEY = 'ezcubic_pos_tables';
const POS_MODE_KEY = 'ezcubic_pos_mode';

// ==================== TABLE MANAGEMENT FUNCTIONS ====================

function loadPOSTables() {
    const stored = localStorage.getItem(POS_TABLES_KEY);
    if (stored) {
        posTables = JSON.parse(stored);
    } else {
        // Default tables for restaurant
        posTables = [];
    }
    
    // Load POS mode
    const storedMode = localStorage.getItem(POS_MODE_KEY);
    posMode = storedMode || 'retail';
}

function savePOSTables() {
    localStorage.setItem(POS_TABLES_KEY, JSON.stringify(posTables));
    
    // DIRECT tenant save for deletion persistence
    const user = window.currentUser;
    if (user && user.tenantId) {
        const tenantKey = 'ezcubic_tenant_' + user.tenantId;
        let tenantData = JSON.parse(localStorage.getItem(tenantKey) || '{}');
        tenantData.posTables = posTables;
        tenantData.updatedAt = new Date().toISOString();
        localStorage.setItem(tenantKey, JSON.stringify(tenantData));
        console.log('✅ POS Tables saved directly to tenant:', posTables.length);
    }
    
    // Trigger cloud sync for deletions
    if (typeof window.fullCloudSync === 'function') {
        setTimeout(() => {
            window.fullCloudSync().catch(e => console.warn('Cloud sync failed:', e));
        }, 100);
    }
}

function savePOSMode() {
    localStorage.setItem(POS_MODE_KEY, posMode);
}

function togglePOSMode() {
    posMode = posMode === 'retail' ? 'restaurant' : 'retail';
    savePOSMode();
    renderPOSModeUI();
    
    if (posMode === 'restaurant') {
        showToast('Restaurant Mode - Table management enabled', 'success');
    } else {
        currentTable = null;
        showToast('Retail Mode - Standard POS', 'success');
    }
}

// ==================== ORDER TYPE FUNCTIONS ====================

function setOrderType(type) {
    currentOrderType = type;
    
    // Update button states
    const buttons = document.querySelectorAll('.order-type-btn');
    buttons.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.type === type);
    });
    
    // Show/hide delivery details
    const deliveryDetails = document.getElementById('deliveryDetails');
    if (deliveryDetails) {
        deliveryDetails.style.display = type === 'delivery' ? 'block' : 'none';
    }
    
    // Clear delivery info if not delivery
    if (type !== 'delivery') {
        currentDeliveryPlatform = '';
        currentDeliveryOrderId = '';
        const platformSelect = document.getElementById('deliveryPlatform');
        const orderIdInput = document.getElementById('deliveryOrderId');
        if (platformSelect) platformSelect.value = '';
        if (orderIdInput) orderIdInput.value = '';
    }
}

function setDeliveryPlatform(platform) {
    currentDeliveryPlatform = platform;
}

function setDeliveryOrderId(orderId) {
    currentDeliveryOrderId = orderId;
}

function resetOrderType() {
    currentOrderType = 'dine-in';
    currentDeliveryPlatform = '';
    currentDeliveryOrderId = '';
    
    const buttons = document.querySelectorAll('.order-type-btn');
    buttons.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.type === 'dine-in');
    });
    
    const deliveryDetails = document.getElementById('deliveryDetails');
    if (deliveryDetails) deliveryDetails.style.display = 'none';
    
    const platformSelect = document.getElementById('deliveryPlatform');
    const orderIdInput = document.getElementById('deliveryOrderId');
    if (platformSelect) platformSelect.value = '';
    if (orderIdInput) orderIdInput.value = '';
}

function getOrderTypeLabel(type) {
    switch(type) {
        case 'dine-in': return '🍽️ Dine-in';
        case 'takeaway': return '🥡 Takeaway';
        case 'delivery': return '🛵 Delivery';
        default: return type;
    }
}

function getPlatformLabel(platform) {
    const p = DELIVERY_PLATFORMS.find(d => d.id === platform);
    return p ? `${p.icon} ${p.name}` : platform;
}

function renderPOSModeUI() {
    const tableSection = document.getElementById('posTableSection');
    const modeToggle = document.getElementById('posModeToggle');
    
    if (modeToggle) {
        modeToggle.innerHTML = posMode === 'restaurant' 
            ? '<i class="fas fa-store"></i> Retail Mode'
            : '<i class="fas fa-utensils"></i> Restaurant Mode';
        modeToggle.className = posMode === 'restaurant' 
            ? 'btn-outline btn-sm' 
            : 'btn-primary btn-sm';
    }
    
    if (tableSection) {
        tableSection.style.display = posMode === 'restaurant' ? 'block' : 'none';
    }
    
    // Update current table display
    updateCurrentTableDisplay();
    
    // If restaurant mode, load tables
    if (posMode === 'restaurant') {
        renderTableSelector();
    }
}

function renderTableSelector() {
    const container = document.getElementById('posTableSelector');
    if (!container) return;
    
    const occupiedTables = getOccupiedTables();
    
    if (posTables.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 10px; color: #64748b;">
                <i class="fas fa-chair" style="font-size: 24px; margin-bottom: 5px;"></i>
                <p style="margin: 0; font-size: 12px;">No tables configured</p>
                <button class="btn-outline btn-sm" onclick="showTableManagement()" style="margin-top: 8px;">
                    <i class="fas fa-plus"></i> Add Tables
                </button>
            </div>
        `;
        return;
    }
    
    container.innerHTML = `
        <div class="pos-table-grid">
            ${posTables.map(table => {
                const isOccupied = occupiedTables.includes(table.id);
                const isSelected = currentTable?.id === table.id;
                const heldSale = heldSales.find(s => s.tableId === table.id);
                
                return `
                    <div class="pos-table-btn ${isOccupied ? 'occupied' : 'available'} ${isSelected ? 'selected' : ''}"
                         onclick="selectTable('${table.id}')"
                         title="${table.name}${heldSale ? ' - ' + heldSale.items.length + ' items' : ''}">
                        <div class="table-number">${table.number}</div>
                        <div class="table-name">${table.name}</div>
                        ${isOccupied ? `<div class="table-status"><i class="fas fa-utensils"></i></div>` : ''}
                        ${heldSale ? `<div class="table-amount">RM ${heldSale.items.reduce((s, i) => s + i.price * i.quantity, 0).toFixed(0)}</div>` : ''}
                    </div>
                `;
            }).join('')}
        </div>
        <div style="display: flex; gap: 5px; margin-top: 10px;">
            <button class="btn-outline btn-sm flex-1" onclick="showTableManagement()">
                <i class="fas fa-cog"></i> Manage
            </button>
            ${currentTable ? `
                <button class="btn-outline btn-sm danger" onclick="clearTableSelection()">
                    <i class="fas fa-times"></i> Clear
                </button>
            ` : ''}
        </div>
    `;
}

function getOccupiedTables() {
    return heldSales.filter(s => s.tableId).map(s => s.tableId);
}

function selectTable(tableId) {
    const table = posTables.find(t => t.id === tableId);
    if (!table) return;
    
    // Check if table has a held sale
    const heldSale = heldSales.find(s => s.tableId === tableId);
    
    if (heldSale) {
        // Table has existing order - recall it
        if (currentCart.length > 0) {
            if (!confirm(`Table ${table.number} has an existing order. Load it? (Current cart will be saved)`)) {
                return;
            }
            // Hold current cart first (without table)
            holdSaleInternal(null);
        }
        
        // Recall the table's order
        currentCart = [...heldSale.items];
        restorePOSCustomer(heldSale.customerId);
        document.getElementById('posSalesperson').value = heldSale.salesperson || '';
        document.getElementById('cartDiscount').value = heldSale.discount || 0;
        
        // Remove from held
        const heldIndex = heldSales.indexOf(heldSale);
        if (heldIndex > -1) {
            heldSales.splice(heldIndex, 1);
            saveHeldSales();
        }
        
        currentTable = table;
        renderCart();
        updateCartTotals();
        showToast(`Table ${table.number} order loaded`, 'success');
    } else {
        // Empty table - just select it
        if (currentTable?.id === tableId) {
            // Deselect if clicking same table
            currentTable = null;
            showToast('Table deselected', 'info');
        } else {
            currentTable = table;
            showToast(`Table ${table.number} selected`, 'success');
        }
    }
    
    renderTableSelector();
    updateCurrentTableDisplay();
}

function clearTableSelection() {
    currentTable = null;
    renderTableSelector();
    updateCurrentTableDisplay();
    showToast('Table selection cleared', 'info');
}

function updateCurrentTableDisplay() {
    const display = document.getElementById('currentTableDisplay');
    if (!display) return;
    
    if (posMode === 'restaurant' && currentTable) {
        display.innerHTML = `
            <div class="current-table-badge">
                <i class="fas fa-chair"></i>
                <span>Table ${currentTable.number}</span>
                <button onclick="clearTableSelection()" class="badge-close">&times;</button>
            </div>
        `;
        display.style.display = 'block';
    } else {
        display.style.display = 'none';
    }
}

// ==================== TABLE MANAGEMENT MODAL ====================

function showTableManagement() {
    let modal = document.getElementById('tableManagementModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'tableManagementModal';
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 600px;">
                <div class="modal-header">
                    <h3 class="modal-title"><i class="fas fa-chair"></i> Table Management</h3>
                    <button class="modal-close" onclick="closeTableManagement()">&times;</button>
                </div>
                <div class="modal-body" id="tableManagementContent"></div>
            </div>
        `;
        document.body.appendChild(modal);
    }
    
    renderTableManagementContent();
    modal.style.display = '';
    modal.classList.add('show');
}

function closeTableManagement() {
    const modal = document.getElementById('tableManagementModal');
    if (modal) modal.classList.remove('show');
}

function renderTableManagementContent() {
    const content = document.getElementById('tableManagementContent');
    if (!content) return;
    
    content.innerHTML = `
        <div style="margin-bottom: 20px;">
            <h4 style="margin-bottom: 10px;">Quick Add Tables</h4>
            <div style="display: flex; gap: 10px; align-items: center;">
                <input type="number" id="quickAddTableCount" min="1" max="50" value="5" 
                       class="form-control" style="width: 80px;" placeholder="Count">
                <input type="text" id="quickAddTablePrefix" class="form-control" style="width: 120px;" 
                       placeholder="Prefix (e.g., T)" value="T">
                <button class="btn-primary" onclick="quickAddTables()">
                    <i class="fas fa-plus"></i> Add Tables
                </button>
            </div>
        </div>
        
        <div style="margin-bottom: 20px;">
            <h4 style="margin-bottom: 10px;">Add Single Table</h4>
            <div style="display: flex; gap: 10px;">
                <input type="text" id="newTableNumber" class="form-control" style="width: 80px;" placeholder="No.">
                <input type="text" id="newTableName" class="form-control" style="flex: 1;" placeholder="Name (e.g., Window Seat)">
                <button class="btn-primary" onclick="addSingleTable()">
                    <i class="fas fa-plus"></i> Add
                </button>
            </div>
        </div>
        
        <div>
            <h4 style="margin-bottom: 10px;">Current Tables (${posTables.length})</h4>
            ${posTables.length === 0 ? `
                <div style="text-align: center; padding: 20px; color: #64748b; background: #f8fafc; border-radius: 8px;">
                    <i class="fas fa-chair" style="font-size: 32px; margin-bottom: 10px;"></i>
                    <p>No tables configured yet</p>
                </div>
            ` : `
                <div class="table-management-list" style="max-height: 300px; overflow-y: auto;">
                    ${posTables.map(table => {
                        const isOccupied = getOccupiedTables().includes(table.id);
                        return `
                            <div class="table-mgmt-item" style="display: flex; align-items: center; gap: 10px; padding: 10px; border: 1px solid #e2e8f0; border-radius: 8px; margin-bottom: 8px;">
                                <div class="table-mgmt-number" style="width: 50px; height: 50px; background: ${isOccupied ? '#fef3c7' : '#e0f2fe'}; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-weight: 700; color: ${isOccupied ? '#d97706' : '#0284c7'};">
                                    ${table.number}
                                </div>
                                <div style="flex: 1;">
                                    <div style="font-weight: 600;">${table.name}</div>
                                    <div style="font-size: 12px; color: ${isOccupied ? '#d97706' : '#22c55e'};">
                                        ${isOccupied ? '<i class="fas fa-utensils"></i> Occupied' : '<i class="fas fa-check"></i> Available'}
                                    </div>
                                </div>
                                <button class="btn-outline btn-sm" onclick="editTable('${table.id}')" ${isOccupied ? 'disabled title="Cannot edit occupied table"' : ''}>
                                    <i class="fas fa-edit"></i>
                                </button>
                                <button class="btn-outline btn-sm danger" onclick="deleteTable('${table.id}')" ${isOccupied ? 'disabled title="Cannot delete occupied table"' : ''}>
                                    <i class="fas fa-trash"></i>
                                </button>
                            </div>
                        `;
                    }).join('')}
                </div>
                <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #e2e8f0;">
                    <button class="btn-outline danger" onclick="clearAllTables()">
                        <i class="fas fa-trash-alt"></i> Clear All Tables
                    </button>
                </div>
            `}
        </div>
    `;
}

function quickAddTables() {
    const count = parseInt(document.getElementById('quickAddTableCount').value) || 5;
    const prefix = document.getElementById('quickAddTablePrefix').value || 'T';
    
    if (count < 1 || count > 50) {
        showToast('Please enter 1-50 tables', 'warning');
        return;
    }
    
    // Find highest existing number
    let startNum = 1;
    posTables.forEach(t => {
        const num = parseInt(t.number.replace(/\D/g, '')) || 0;
        if (num >= startNum) startNum = num + 1;
    });
    
    for (let i = 0; i < count; i++) {
        const num = startNum + i;
        posTables.push({
            id: generateUUID(),
            number: `${prefix}${num}`,
            name: `Table ${num}`,
            capacity: 4,
            createdAt: new Date().toISOString()
        });
    }
    
    savePOSTables();
    renderTableManagementContent();
    renderTableSelector();
    showToast(`Added ${count} tables`, 'success');
}

function addSingleTable() {
    const number = document.getElementById('newTableNumber').value.trim();
    const name = document.getElementById('newTableName').value.trim() || `Table ${number}`;
    
    if (!number) {
        showToast('Please enter table number', 'warning');
        return;
    }
    
    // Check for duplicate
    if (posTables.find(t => t.number === number)) {
        showToast('Table number already exists', 'warning');
        return;
    }
    
    posTables.push({
        id: generateUUID(),
        number: number,
        name: name,
        capacity: 4,
        createdAt: new Date().toISOString()
    });
    
    savePOSTables();
    renderTableManagementContent();
    renderTableSelector();
    
    // Clear inputs
    document.getElementById('newTableNumber').value = '';
    document.getElementById('newTableName').value = '';
    
    showToast(`Table ${number} added`, 'success');
}

function editTable(tableId) {
    const table = posTables.find(t => t.id === tableId);
    if (!table) return;
    
    const newNumber = prompt('Enter table number:', table.number);
    if (newNumber === null) return;
    
    const newName = prompt('Enter table name:', table.name);
    if (newName === null) return;
    
    // Check for duplicate number (excluding current)
    if (posTables.find(t => t.number === newNumber && t.id !== tableId)) {
        showToast('Table number already exists', 'warning');
        return;
    }
    
    table.number = newNumber.trim() || table.number;
    table.name = newName.trim() || table.name;
    
    savePOSTables();
    renderTableManagementContent();
    renderTableSelector();
    showToast('Table updated', 'success');
}

function deleteTable(tableId) {
    const table = posTables.find(t => t.id === tableId);
    if (!table) return;
    
    if (!confirm(`Delete table ${table.number}?`)) return;
    
    posTables = posTables.filter(t => t.id !== tableId);
    savePOSTables();
    
    if (currentTable?.id === tableId) {
        currentTable = null;
        updateCurrentTableDisplay();
    }
    
    renderTableManagementContent();
    renderTableSelector();
    showToast('Table deleted', 'success');
}

function clearAllTables() {
    const occupiedCount = getOccupiedTables().length;
    if (occupiedCount > 0) {
        showToast(`Cannot clear - ${occupiedCount} tables have active orders`, 'warning');
        return;
    }
    
    if (!confirm('Delete ALL tables? This cannot be undone.')) return;
    
    posTables = [];
    currentTable = null;
    savePOSTables();
    
    renderTableManagementContent();
    renderTableSelector();
    updateCurrentTableDisplay();
    showToast('All tables cleared', 'success');
}

// Internal hold function (for table management)
function holdSaleInternal(tableId) {
    if (currentCart.length === 0) return;
    
    const customerId = document.getElementById('posCustomer')?.value || '';
    const customer = customers.find(c => c.id === customerId);
    const salesperson = document.getElementById('posSalesperson')?.value || '';
    
    heldSales.push({
        id: generateUUID(),
        date: new Date().toISOString(),
        customerId: customerId,
        customerName: customer?.name || 'Walk-in',
        salesperson: salesperson,
        items: [...currentCart],
        discount: parseFloat(document.getElementById('cartDiscount')?.value) || 0,
        tableId: tableId,
        tableName: tableId ? posTables.find(t => t.id === tableId)?.number : null
    });
    
    saveHeldSales();
    currentCart = [];
    document.getElementById('cartDiscount').value = 0;
    renderCart();
    updateCartTotals();
}

// ==================== POS INITIALIZATION ====================
function initializePOS() {
    console.log('initializePOS called, products:', products?.length, 'window.products:', window.products?.length);
    
    // Ensure HQ branch exists for ALL plans (even if Branches section is hidden)
    ensureHQBranchExists();
    
    // Sync branch stock to products array (ensures correct stock values across all outlets)
    if (typeof syncAllBranchStockToProducts === 'function') {
        syncAllBranchStockToProducts();
    }
    
    loadHeldSales();
    loadPOSTables(); // Load restaurant tables
    loadPOSProducts();
    loadPOSCategories();
    loadPOSCustomers();
    loadPOSSalespersons();
    updateHeldCount();
    
    // Sync branches to POS outlets first
    if (typeof syncBranchesToOutlets === 'function') {
        syncBranchesToOutlets();
    }
    
    // Then apply outlet filter visibility based on plan
    if (typeof renderOutletDropdowns === 'function') {
        renderOutletDropdowns();
    }
    
    // Load POS branch/outlet selector
    loadPOSBranchSelector();
    
    // Initialize restaurant mode UI
    renderPOSModeUI();
}

// Ensure HQ branch exists for ALL plans - even Starter needs an outlet for POS
function ensureHQBranchExists() {
    // Load branches from window or localStorage
    let branchList = window.branches || [];
    if (branchList.length === 0) {
        const stored = localStorage.getItem('ezcubic_branches');
        if (stored) {
            branchList = JSON.parse(stored);
        }
    }
    
    // If no branches exist, create default HQ
    if (branchList.length === 0) {
        const hqBranch = {
            id: 'BRANCH_HQ',
            code: 'HQ',
            name: 'Headquarters',
            type: 'headquarters',
            address: '',
            city: '',
            state: '',
            postcode: '',
            phone: '',
            email: '',
            manager: '',
            status: 'active',
            isDefault: true,
            createdAt: new Date().toISOString()
        };
        branchList.push(hqBranch);
        
        // Save to localStorage and window
        localStorage.setItem('ezcubic_branches', JSON.stringify(branchList));
        window.branches = branchList;
        
        // Also update the branches variable if it exists
        if (typeof branches !== 'undefined') {
            branches = branchList;
        }
        
        console.log('Created default HQ branch for POS');
    }
}

function loadHeldSales() {
    // First check if window.heldSales was set by tenant loader (most up-to-date)
    if (window.heldSales && Array.isArray(window.heldSales)) {
        heldSales = window.heldSales;
        console.log('Loaded held sales from window.heldSales:', heldSales.length);
        updateHeldCount();
        return;
    }
    
    // Then try localStorage (should be synced from tenant data on login)
    const stored = localStorage.getItem('ezcubic_held_sales');
    if (stored) {
        heldSales = JSON.parse(stored);
        console.log('Loaded held sales from ezcubic_held_sales:', heldSales.length);
    } else {
        // Fallback: Try loading from tenant storage directly
        const user = window.currentUser;
        if (user && user.tenantId) {
            const tenantKey = 'ezcubic_tenant_' + user.tenantId;
            const tenantData = JSON.parse(localStorage.getItem(tenantKey) || '{}');
            if (tenantData.heldSales && tenantData.heldSales.length > 0) {
                heldSales = tenantData.heldSales;
                // Sync to localStorage for consistency
                localStorage.setItem('ezcubic_held_sales', JSON.stringify(heldSales));
                console.log('Loaded held sales from tenant storage:', heldSales.length);
            } else {
                console.log('No held sales in tenant storage');
            }
        } else {
            console.log('No held sales found');
        }
    }
    
    // CRITICAL: Update the held count badge after loading
    updateHeldCount();
}

function saveHeldSales() {
    localStorage.setItem('ezcubic_held_sales', JSON.stringify(heldSales));
    updateHeldCount();
    console.log('💾 Saved held sales to localStorage:', heldSales.length);
    
    // Sync to window for cross-module access
    window.heldSales = heldSales;
    
    // DIRECT tenant save for deletion persistence
    const user = window.currentUser;
    if (user && user.tenantId) {
        const tenantKey = 'ezcubic_tenant_' + user.tenantId;
        let tenantData = JSON.parse(localStorage.getItem(tenantKey) || '{}');
        tenantData.heldSales = heldSales;
        tenantData.updatedAt = new Date().toISOString();
        localStorage.setItem(tenantKey, JSON.stringify(tenantData));
        console.log('💾 Held sales saved to tenant storage:', heldSales.length, 'updatedAt:', tenantData.updatedAt);
    }
    
    // CRITICAL: Save timestamp AFTER tenant save (must be newer than tenantData.updatedAt)
    const timestamp = Date.now();
    localStorage.setItem('ezcubic_last_save_timestamp', timestamp.toString());
    console.log('💾 Saved timestamp:', timestamp);
    
    // Trigger cloud sync for deletions
    if (typeof window.fullCloudSync === 'function') {
        console.log('💾 Triggering cloud sync...');
        setTimeout(() => {
            window.fullCloudSync().then(() => {
                console.log('💾 Cloud sync completed');
            }).catch(e => console.warn('Cloud sync failed:', e));
        }, 100);
    }
    
    // Always refresh table selector when held sales change
    if (posMode === 'restaurant') {
        renderTableSelector();
    }
}

// Debug helper - call from console: clearAllHeldSales()
async function clearAllHeldSales() {
    console.log('=== CLEARING ALL HELD SALES ===');
    
    // 1. Clear the in-memory array
    heldSales = [];
    console.log('1. Cleared heldSales array');
    
    // 2. Clear ezcubic_held_sales directly
    localStorage.setItem('ezcubic_held_sales', JSON.stringify([]));
    console.log('2. Cleared ezcubic_held_sales');
    
    // 3. Clear from window.tenantData
    if (window.tenantData) {
        window.tenantData.heldSales = [];
        console.log('3. Cleared window.tenantData.heldSales');
    }
    
    // 4. Clear from ALL tenant storage keys in localStorage
    const tenantId = localStorage.getItem('ezcubic_last_tenant_id');
    let tenantDataToSync = null;
    
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('ezcubic_tenant_')) {
            try {
                const data = JSON.parse(localStorage.getItem(key));
                if (data && data.heldSales) {
                    data.heldSales = [];
                    localStorage.setItem(key, JSON.stringify(data));
                    console.log('4. Cleared heldSales from:', key);
                    
                    // Keep reference to current tenant data for cloud sync
                    if (tenantId && key === 'ezcubic_tenant_' + tenantId) {
                        tenantDataToSync = data;
                    }
                }
            } catch (e) {
                console.log('Error parsing', key, e);
            }
        }
    }
    
    // 5. Sync to Supabase cloud to clear there too
    if (tenantId && tenantDataToSync && typeof window.syncTenantDataToCloud === 'function') {
        try {
            await window.syncTenantDataToCloud(tenantId, tenantDataToSync);
            console.log('5. ☁️ Synced empty heldSales to cloud');
        } catch (e) {
            console.log('5. Cloud sync failed:', e);
        }
    } else {
        console.log('5. No cloud sync (tenantId:', tenantId, ')');
    }
    
    // 6. Update held count
    updateHeldCount();
    
    // 7. Refresh table selector
    if (posMode === 'restaurant') {
        renderTableSelector();
    }
    
    console.log('=== DONE - Refresh the page to verify ===');
    showToast('All held sales cleared (local + cloud)', 'success');
}

// ==================== POS PRODUCTS ====================
function loadPOSProducts() {
    // Sync products from window in case tenant loaded new data
    syncProductsFromWindow();
    
    // Initialize branch stock from products (ensures stock is allocated to default branch)
    if (typeof initializeBranchStockFromProducts === 'function') {
        initializeBranchStockFromProducts();
    }
    
    renderPOSProducts();
}

// Sync products from window.products to local scope
function syncProductsFromWindow() {
    if (Array.isArray(window.products) && window.products.length > 0) {
        // Update core.js products if it exists AND is a different array
        // IMPORTANT: Don't clear if products === window.products (same reference)
        if (typeof products !== 'undefined' && products !== window.products) {
            products.length = 0;
            products.push(...window.products);
        }
        console.log('📦 POS synced products from window:', window.products.length);
    }
}
window.syncProductsFromWindow = syncProductsFromWindow;

function loadPOSCategories() {
    const container = document.getElementById('posCategories');
    if (!container) return;
    
    // ALWAYS prefer window.products - it's the most up-to-date source
    const productList = window.products || [];
    
    // Get products with stock (using branch stock system OR product.stock as fallback)
    const usedCategories = [...new Set(productList.filter(p => {
        // Check branch stock first
        if (typeof getTotalBranchStock === 'function') {
            const branchStock = getTotalBranchStock(p.id);
            if (branchStock > 0) return true;
        }
        // Fall back to product.stock
        return (p.stock || 0) > 0;
    }).map(p => p.category))];
    
    container.innerHTML = `
        <button class="pos-category-btn ${!currentPOSCategory ? 'active' : ''}" onclick="filterPOSCategory('')">All</button>
        ${usedCategories.map(cat => `
            <button class="pos-category-btn ${currentPOSCategory === cat ? 'active' : ''}" 
                    onclick="filterPOSCategory('${cat}')">${cat}</button>
        `).join('')}
    `;
}

// Store all customers for search
let allPOSCustomers = [];

function loadPOSCustomers() {
    const searchInput = document.getElementById('posCustomerSearch');
    if (!searchInput) return;
    
    // Get CRM customers if available
    const crmList = typeof getCRMCustomersForSelect === 'function' ? getCRMCustomersForSelect() : [];
    
    // Also get regular customers
    let regularCustomers = Array.isArray(window.customers) ? window.customers : [];
    if (regularCustomers.length === 0) {
        try {
            const stored = localStorage.getItem('ezcubic_customers');
            if (stored) regularCustomers = JSON.parse(stored) || [];
        } catch (e) {}
    }
    
    // Build combined customer list
    allPOSCustomers = [];
    
    // Add CRM customers (they support membership/credit)
    crmList.forEach(c => {
        const membership = typeof getCustomerMembership === 'function' ? getCustomerMembership(c.id) : null;
        allPOSCustomers.push({
            id: c.id,
            name: c.name,
            company: c.company || '',
            phone: c.phone || '',
            email: c.email || '',
            type: 'crm',
            tier: membership?.tierInfo || null,
            points: membership?.points || 0
        });
    });
    
    // Add regular customers (no membership)
    const crmNames = crmList.map(c => c.name.toLowerCase());
    regularCustomers.forEach(c => {
        if (!crmNames.includes(c.name?.toLowerCase())) {
            allPOSCustomers.push({
                id: c.id,
                name: c.name,
                company: '',
                phone: c.phone || '',
                email: c.email || '',
                type: 'regular',
                tier: null,
                points: 0
            });
        }
    });
    
    // Setup search input events
    setupPOSCustomerSearch();
}

// Setup customer search functionality
function setupPOSCustomerSearch() {
    const searchInput = document.getElementById('posCustomerSearch');
    const dropdown = document.getElementById('posCustomerDropdown');
    
    if (!searchInput || !dropdown) return;
    
    // Remove existing listeners by cloning
    const newSearchInput = searchInput.cloneNode(true);
    searchInput.parentNode.replaceChild(newSearchInput, searchInput);
    
    let highlightIndex = -1;
    
    // Input event for search
    newSearchInput.addEventListener('input', function() {
        const query = this.value.trim().toLowerCase();
        highlightIndex = -1;
        
        if (query.length === 0) {
            // Show all customers or recent ones
            showCustomerDropdown(allPOSCustomers.slice(0, 20), '');
        } else {
            // Filter customers
            const filtered = allPOSCustomers.filter(c => {
                return c.name.toLowerCase().includes(query) ||
                       c.phone.toLowerCase().includes(query) ||
                       c.email.toLowerCase().includes(query) ||
                       c.company.toLowerCase().includes(query);
            });
            showCustomerDropdown(filtered, query);
        }
    });
    
    // Focus event
    newSearchInput.addEventListener('focus', function() {
        if (!document.getElementById('posCustomer').value) {
            const query = this.value.trim().toLowerCase();
            if (query.length === 0) {
                showCustomerDropdown(allPOSCustomers.slice(0, 20), '');
            } else {
                const filtered = allPOSCustomers.filter(c => {
                    return c.name.toLowerCase().includes(query) ||
                           c.phone.toLowerCase().includes(query) ||
                           c.email.toLowerCase().includes(query);
                });
                showCustomerDropdown(filtered, query);
            }
        }
    });
    
    // Keyboard navigation
    newSearchInput.addEventListener('keydown', function(e) {
        const items = dropdown.querySelectorAll('.pos-customer-dropdown-item:not(.walk-in)');
        
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            highlightIndex = Math.min(highlightIndex + 1, items.length - 1);
            updateDropdownHighlight(items, highlightIndex);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            highlightIndex = Math.max(highlightIndex - 1, -1);
            updateDropdownHighlight(items, highlightIndex);
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (highlightIndex >= 0 && items[highlightIndex]) {
                items[highlightIndex].click();
            } else if (items.length === 1) {
                items[0].click();
            }
        } else if (e.key === 'Escape') {
            hideCustomerDropdown();
            this.blur();
        }
    });
    
    // Click outside to close
    document.addEventListener('click', function(e) {
        if (!e.target.closest('.pos-customer-select')) {
            hideCustomerDropdown();
        }
    });
}

function updateDropdownHighlight(items, index) {
    items.forEach((item, i) => {
        item.classList.toggle('highlighted', i === index);
        if (i === index) {
            item.scrollIntoView({ block: 'nearest' });
        }
    });
}

function showCustomerDropdown(customers, query) {
    const dropdown = document.getElementById('posCustomerDropdown');
    if (!dropdown) return;
    
    let html = '';
    
    // Walk-in option always first
    html += `
        <div class="pos-customer-dropdown-item walk-in" onclick="selectPOSCustomer(null)">
            <div class="pos-customer-item-avatar" style="background: #e2e8f0; color: #64748b;">
                <i class="fas fa-user"></i>
            </div>
            <div class="pos-customer-item-info">
                <div class="pos-customer-item-name">Walk-in Customer</div>
                <div class="pos-customer-item-details">No membership / Guest checkout</div>
            </div>
        </div>
    `;
    
    if (customers.length === 0 && query) {
        html += `
            <div class="pos-customer-no-results">
                <i class="fas fa-search"></i>
                No members found for "${escapeHtml(query)}"<br>
                <small>Try searching by name, phone or email</small>
            </div>
        `;
    } else {
        customers.forEach(c => {
            const initials = c.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
            const tierColor = c.tier?.color || '#94a3b8';
            const tierLabel = c.tier ? `${c.tier.icon} ${c.tier.label}` : '';
            
            // Highlight matching text
            let displayName = escapeHtml(c.name);
            let displayDetails = escapeHtml([c.phone, c.email, c.company].filter(Boolean).join(' • '));
            
            if (query) {
                const regex = new RegExp(`(${escapeRegex(query)})`, 'gi');
                displayName = displayName.replace(regex, '<mark>$1</mark>');
                displayDetails = displayDetails.replace(regex, '<mark>$1</mark>');
            }
            
            html += `
                <div class="pos-customer-dropdown-item" onclick="selectPOSCustomer('${c.id}')">
                    <div class="pos-customer-item-avatar" style="background: ${tierColor}20; color: ${tierColor};">
                        ${initials}
                    </div>
                    <div class="pos-customer-item-info">
                        <div class="pos-customer-item-name">${displayName}</div>
                        <div class="pos-customer-item-details">${displayDetails || 'No contact info'}</div>
                    </div>
                    ${tierLabel ? `<span class="pos-customer-item-tier" style="background: ${tierColor};">${tierLabel}</span>` : ''}
                    ${c.points > 0 ? `<span class="pos-customer-item-points">⭐ ${c.points.toLocaleString()}</span>` : ''}
                </div>
            `;
        });
    }
    
    dropdown.innerHTML = html;
    dropdown.style.display = 'block';
}

function hideCustomerDropdown() {
    const dropdown = document.getElementById('posCustomerDropdown');
    if (dropdown) dropdown.style.display = 'none';
}

function escapeRegex(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function selectPOSCustomer(customerId) {
    const searchInput = document.getElementById('posCustomerSearch');
    const hiddenInput = document.getElementById('posCustomer');
    const clearBtn = document.getElementById('posCustomerClearBtn');
    
    if (!searchInput || !hiddenInput) return;
    
    if (customerId) {
        const customer = allPOSCustomers.find(c => c.id === customerId);
        if (customer) {
            searchInput.value = customer.name + (customer.company ? ` (${customer.company})` : '');
            searchInput.classList.add('has-customer');
            hiddenInput.value = customerId;
            if (clearBtn) clearBtn.style.display = 'flex';
        }
    } else {
        // Walk-in customer
        searchInput.value = '';
        searchInput.placeholder = '🔍 Search member by name, phone, email...';
        searchInput.classList.remove('has-customer');
        hiddenInput.value = '';
        if (clearBtn) clearBtn.style.display = 'none';
    }
    
    hideCustomerDropdown();
    updatePOSCustomerMembership();
}
window.selectPOSCustomer = selectPOSCustomer;

function clearPOSCustomer() {
    selectPOSCustomer(null);
    document.getElementById('posCustomerSearch')?.focus();
}
window.clearPOSCustomer = clearPOSCustomer;

// Restore customer selection by ID (for held sales, table recalls)
function restorePOSCustomer(customerId) {
    if (!customerId) {
        selectPOSCustomer(null);
        return;
    }
    
    // Make sure customer list is loaded
    if (allPOSCustomers.length === 0) {
        loadPOSCustomers();
    }
    
    // Find and select the customer
    const customer = allPOSCustomers.find(c => c.id === customerId);
    if (customer) {
        selectPOSCustomer(customerId);
    } else {
        // Customer not found in list, try to find from CRM directly
        if (typeof window.crmCustomers !== 'undefined') {
            const crmCustomer = window.crmCustomers.find(c => c.id === customerId);
            if (crmCustomer) {
                const searchInput = document.getElementById('posCustomerSearch');
                const hiddenInput = document.getElementById('posCustomer');
                const clearBtn = document.getElementById('posCustomerClearBtn');
                
                if (searchInput && hiddenInput) {
                    searchInput.value = crmCustomer.name + (crmCustomer.company ? ` (${crmCustomer.company})` : '');
                    searchInput.classList.add('has-customer');
                    hiddenInput.value = customerId;
                    if (clearBtn) clearBtn.style.display = 'flex';
                    updatePOSCustomerMembership();
                }
            }
        }
    }
}
window.restorePOSCustomer = restorePOSCustomer;

function loadPOSSalespersons() {
    const select = document.getElementById('posSalesperson');
    if (!select) return;
    
    const currentUser = typeof getCurrentUser === 'function' ? getCurrentUser() : window.currentUser;
    const userPlan = currentUser?.plan || 'starter';
    
    // Check if user has HR/Employee module access (Professional and Enterprise plans)
    const hasEmployeeModule = userPlan === 'professional' || userPlan === 'premium';
    
    // Get employees if available - try multiple sources
    let employeeList = [];
    
    // Try window.employees first
    if (Array.isArray(window.employees) && window.employees.length > 0) {
        employeeList = window.employees;
    } else {
        // Try loading from localStorage
        try {
            const stored = localStorage.getItem('ezcubic_employees');
            if (stored) {
                const parsed = JSON.parse(stored);
                if (Array.isArray(parsed)) {
                    employeeList = parsed;
                    window.employees = employeeList; // Update window reference
                }
            }
        } catch (e) {
            console.error('Error loading employees for POS:', e);
        }
    }
    
    // Ensure employeeList is always an array
    if (!Array.isArray(employeeList)) {
        console.warn('employeeList was not an array, resetting to empty array');
        employeeList = [];
    }
    
    const activeEmployees = employeeList.filter(e => e.status === 'active');
    
    // Debug log to help troubleshoot
    console.log('POS Salespersons: Plan=', userPlan, 'hasEmployeeModule=', hasEmployeeModule, 'Total employees=', employeeList.length, 'Active=', activeEmployees.length);
    activeEmployees.forEach(emp => {
        console.log('  Employee:', emp.name, 'Position:', emp.position, 'posAccountType:', emp.posAccountType);
    });
    
    // Build options list
    let options = '<option value="">-- Select Cashier/Staff --</option>';
    
    if (hasEmployeeModule && activeEmployees.length > 0) {
        // Filter employees based on current user's role
        let filteredEmployees = activeEmployees;
        
        // If staff is logged in, only show staff role employees
        if (currentUser && currentUser.role === 'staff') {
            filteredEmployees = activeEmployees.filter(emp => {
                let accountType = emp.posAccountType || 'staff';
                if (accountType === 'staff' && emp.position) {
                    const positionLower = emp.position.toLowerCase();
                    if (positionLower.includes('admin') || positionLower.includes('owner') || positionLower.includes('director')) {
                        accountType = 'admin';
                    } else if (positionLower.includes('manager') || positionLower.includes('supervisor') || positionLower.includes('lead')) {
                        accountType = 'manager';
                    }
                }
                return accountType === 'staff';
            });
        }
        
        // Show employees from HR module
        filteredEmployees.forEach(emp => {
            // Determine account type: check posAccountType first, then infer from position field
            let accountType = emp.posAccountType || 'staff';
            
            // If posAccountType is default 'staff', check position field for manager/admin roles
            if (accountType === 'staff' && emp.position) {
                const positionLower = emp.position.toLowerCase();
                if (positionLower.includes('admin') || positionLower.includes('owner') || positionLower.includes('director')) {
                    accountType = 'admin';
                } else if (positionLower.includes('manager') || positionLower.includes('supervisor') || positionLower.includes('lead')) {
                    accountType = 'manager';
                }
            }
            
            const badge = accountType === 'admin' ? '👑' : accountType === 'manager' ? '⭐' : '👤';
            options += `<option value="${escapeHtml(emp.name)}" data-account-type="${accountType}">${badge} ${escapeHtml(emp.name)} (${escapeHtml(emp.position || accountType)})</option>`;
        });
    } else {
        // Default accounts for Starter plan or when no employees exist
        // Include current logged-in user
        if (currentUser && currentUser.name) {
            const userRole = currentUser.role || 'admin';
            const badge = userRole === 'admin' ? '👑' : userRole === 'manager' ? '⭐' : '👤';
            options += `<option value="${escapeHtml(currentUser.name)}" data-account-type="${userRole}">${badge} ${escapeHtml(currentUser.name)} (${userRole.charAt(0).toUpperCase() + userRole.slice(1)})</option>`;
        }
        
        // Add default account options if no employees
        if (activeEmployees.length === 0) {
            options += `
                <option value="Admin" data-account-type="admin">👑 Admin Account</option>
                <option value="Manager" data-account-type="manager">⭐ Manager Account</option>
                <option value="Staff" data-account-type="staff">👤 Staff Account</option>
            `;
        }
    }
    
    select.innerHTML = options;
    
    // Auto-select current user if they're in the list
    if (currentUser && currentUser.name) {
        const userOption = Array.from(select.options).find(opt => opt.value === currentUser.name);
        if (userOption) {
            select.value = currentUser.name;
        }
    }
}

function filterPOSCategory(category) {
    currentPOSCategory = category;
    loadPOSCategories();
    renderPOSProducts();
}

function searchPOSProducts(term) {
    renderPOSProducts(term);
}

// Alias for filterPOSProducts
function filterPOSProducts(term) {
    renderPOSProducts(term);
}

// Alias for outlet filtering
function filterProductsByOutlet(outlet) {
    renderPOSProducts();
}

function filterPOSByOutlet(outlet) {
    renderPOSProducts();
}

function renderPOSProducts(searchTerm = '') {
    const container = document.getElementById('posProductsGrid');
    if (!container) return;
    
    // ALWAYS prefer window.products - it's the authoritative source after tenant load
    const productList = window.products || [];
    
    const search = searchTerm || document.getElementById('posSearch')?.value?.toLowerCase() || '';
    const selectedOutlet = document.getElementById('posOutletFilter')?.value || 'all';
    
    // Get current branch for stock lookup (use selectedOutlet or current branch)
    const currentBranch = selectedOutlet !== 'all' ? selectedOutlet : 
        (typeof getCurrentBranchId === 'function' ? getCurrentBranchId() : null);
    
    // Check if we're filtering by a specific branch (not "all")
    const isFilteringByBranch = selectedOutlet !== 'all' && currentBranch;
    
    let filtered = productList.filter(p => {
        const matchesSearch = !search || 
            p.name.toLowerCase().includes(search) ||
            p.sku.toLowerCase().includes(search);
        const matchesCategory = !currentPOSCategory || p.category === currentPOSCategory;
        
        // Check if product is available at selected outlet
        // Support both old single 'outlet' and new 'outlets' array
        const productOutlets = p.outlets || (p.outlet ? [p.outlet] : ['all']);
        const matchesOutlet = selectedOutlet === 'all' || 
            productOutlets.includes('all') || 
            productOutlets.includes(selectedOutlet);
        
        // Get stock based on selection
        let stockAtOutlet = 0;
        
        if (isFilteringByBranch) {
            // SPECIFIC BRANCH SELECTED: Only show products with stock at THIS branch
            // Check product.branchStock first (new system)
            if (p.branchStock && typeof p.branchStock === 'object') {
                stockAtOutlet = p.branchStock[currentBranch] || 0;
            }
            // Also check getBranchStock function (legacy system)
            else if (typeof getBranchStock === 'function') {
                stockAtOutlet = getBranchStock(p.id, currentBranch);
            }
            // DO NOT fall back to product.stock - if branch has 0, show 0
        } else {
            // "ALL OUTLETS" SELECTED: Show total stock across all branches
            // Try branch stock total first
            if (p.branchStock && typeof p.branchStock === 'object') {
                stockAtOutlet = Object.values(p.branchStock).reduce((sum, qty) => sum + (qty || 0), 0);
            }
            // Also check getTotalBranchStock function
            else if (typeof getTotalBranchStock === 'function') {
                stockAtOutlet = getTotalBranchStock(p.id);
            }
            // Fall back to product.stock only for "all" view
            if (stockAtOutlet === 0) {
                stockAtOutlet = p.stock || 0;
            }
        }
        
        const inStock = stockAtOutlet > 0;
        return matchesSearch && matchesCategory && matchesOutlet && inStock;
    });
    
    if (filtered.length === 0) {
        const noStockAtBranch = isFilteringByBranch && productList.length > 0;
        const branchName = window.branches?.find(b => b.id === currentBranch)?.name || selectedOutlet;
        
        container.innerHTML = `
            <div class="pos-empty">
                <i class="fas fa-box-open"></i>
                <p>${productList.length === 0 ? 'No products in inventory' : 
                    noStockAtBranch ? `No products with stock at ${branchName}` : 
                    'No products found'}</p>
                ${productList.length === 0 ? `<a href="#" onclick="showSection('inventory')">Add Products</a>` : 
                    noStockAtBranch ? `<p style="font-size:12px;margin-top:10px;">💡 Transfer stock to this branch first</p>` : ''}
            </div>
        `;
        return;
    }
    
    // Get outlet/branch display name dynamically
    const getOutletShortName = (outletId) => {
        if (!outletId || outletId === 'all') return 'All';
        // Try branches first (new system)
        const branch = window.branches?.find(b => b.id === outletId);
        if (branch) return branch.code || branch.name.slice(0, 3).toUpperCase();
        // Fallback to outlets
        const outlet = outlets.find(o => o.id === outletId);
        if (outlet) {
            const words = outlet.name.split(' ');
            if (words.length > 1) {
                return words.map(w => w[0]).join('').toUpperCase().slice(0, 3);
            }
            return outlet.name.slice(0, 3).toUpperCase();
        }
        return 'All';
    };
    
    // Get display string for multiple outlets
    const getOutletsDisplay = (product) => {
        const productOutlets = product.outlets || (product.outlet ? [product.outlet] : ['all']);
        if (productOutlets.includes('all')) return 'All';
        if (productOutlets.length === 1) return getOutletShortName(productOutlets[0]);
        if (productOutlets.length <= 2) return productOutlets.map(getOutletShortName).join(', ');
        return `${productOutlets.length} outlets`;
    };
    
    // Get stock display based on selected outlet using branch stock system
    const getStockDisplay = (product) => {
        let stockToShow = 0;
        
        // If a specific branch is selected, show ONLY that branch's stock
        if (isFilteringByBranch) {
            // Check product.branchStock first (new system)
            if (product.branchStock && typeof product.branchStock === 'object') {
                stockToShow = product.branchStock[currentBranch] || 0;
            }
            // Also check getBranchStock function (legacy system)
            else if (typeof getBranchStock === 'function') {
                stockToShow = getBranchStock(product.id, currentBranch);
            }
            // DO NOT fall back - if branch has 0, show 0
        }
        // For "All Outlets", show total from all branches
        else {
            if (product.branchStock && typeof product.branchStock === 'object') {
                stockToShow = Object.values(product.branchStock).reduce((sum, qty) => sum + (qty || 0), 0);
            } else if (typeof getTotalBranchStock === 'function') {
                stockToShow = getTotalBranchStock(product.id);
            }
            // Fall back to product.stock for "all" view
            if (stockToShow === 0) {
                stockToShow = product.stock || 0;
            }
        }
        
        return stockToShow;
    };
    
    container.innerHTML = filtered.map(product => {
        const stockDisplay = getStockDisplay(product);
        const stockClass = stockDisplay <= (product.minStock || 5) ? 'low-stock' : '';
        
        return `
            <div class="pos-product-card" onclick="addToCart('${product.id}')">
                ${product.image ? `<div class="pos-product-image"><img src="${product.image}" alt="${escapeHtml(product.name)}"></div>` : 
                `<div class="pos-product-image pos-product-no-image"><i class="fas fa-box"></i></div>`}
                <div class="pos-product-info">
                    <div class="pos-product-sku">${product.sku}</div>
                    <div class="pos-product-name">${escapeHtml(product.name)}</div>
                    <div class="pos-product-price">RM ${product.price.toFixed(2)}</div>
                    <div class="pos-product-meta">
                        <span class="pos-product-stock ${stockClass}">${stockDisplay} in stock</span>
                        <span class="pos-product-outlet">${getOutletsDisplay(product)}</span>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// ==================== CART MANAGEMENT ====================
function addToCart(productId) {
    const product = products.find(p => p.id === productId);
    if (!product) return;
    
    // Get current outlet/branch
    const currentBranchId = document.getElementById('posOutletFilter')?.value || 'BRANCH_HQ';
    
    // ===== USE CENTRALIZED STOCK CHECK =====
    let availableStock;
    if (typeof getAvailableStock === 'function') {
        // Use central stock manager
        availableStock = getAvailableStock(productId, currentBranchId !== 'all' ? currentBranchId : null);
    } else {
        // Fallback: use product.stock
        availableStock = product.stock || 0;
    }
    
    // Check if already in cart
    const existingIndex = currentCart.findIndex(item => item.productId === productId);
    
    if (existingIndex !== -1) {
        // Check stock at current branch
        if (currentCart[existingIndex].quantity >= availableStock) {
            showToast(`Only ${availableStock} available at this outlet`, 'warning');
            return;
        }
        currentCart[existingIndex].quantity++;
    } else {
        if (availableStock === 0) {
            showToast(`${product.name} is out of stock at this outlet`, 'warning');
            return;
        }
        currentCart.push({
            productId: product.id,
            name: product.name,
            price: product.price,
            cost: product.cost,
            quantity: 1,
            unit: product.unit
        });
    }
    
    renderCart();
    updateCartTotals();
    
    // Visual feedback
    showToast(`${product.name} added to cart`, 'success');
}

function updateCartItemQuantity(productId, change) {
    const product = products.find(p => p.id === productId);
    const itemIndex = currentCart.findIndex(item => item.productId === productId);
    
    if (itemIndex === -1) return;
    
    const newQty = currentCart[itemIndex].quantity + change;
    
    if (newQty <= 0) {
        removeFromCart(productId);
        return;
    }
    
    // Get current outlet/branch
    const currentBranchId = document.getElementById('posOutletFilter')?.value || 'BRANCH_HQ';
    
    // ===== USE CENTRALIZED STOCK CHECK =====
    let availableStock;
    if (typeof getAvailableStock === 'function') {
        availableStock = getAvailableStock(productId, currentBranchId !== 'all' ? currentBranchId : null);
    } else {
        availableStock = product ? (product.stock || 0) : 999;
    }
    
    if (newQty > availableStock) {
        showToast(`Only ${availableStock} available at this outlet`, 'warning');
        return;
    }
    
    currentCart[itemIndex].quantity = newQty;
    renderCart();
    updateCartTotals();
}

function setCartItemQuantity(productId, quantity) {
    const product = products.find(p => p.id === productId);
    const itemIndex = currentCart.findIndex(item => item.productId === productId);
    
    if (itemIndex === -1) return;
    
    const qty = parseInt(quantity) || 0;
    
    if (qty <= 0) {
        removeFromCart(productId);
        return;
    }
    
    if (product && qty > product.stock) {
        showToast(`Only ${product.stock} available in stock`, 'warning');
        currentCart[itemIndex].quantity = product.stock;
    } else {
        currentCart[itemIndex].quantity = qty;
    }
    
    renderCart();
    updateCartTotals();
}

function removeFromCart(productId) {
    currentCart = currentCart.filter(item => item.productId !== productId);
    renderCart();
    updateCartTotals();
}

function clearCart() {
    if (currentCart.length === 0) return;
    
    if (confirm('Clear all items from cart?')) {
        currentCart = [];
        renderCart();
        updateCartTotals();
        
        // Reset points redemption and member discount when cart is cleared
        if (typeof resetPointsRedemption === 'function') {
            window.posRedeemedPoints = 0;
            window.posRedeemCustomerId = null;
            window.posMemberDiscount = 0;
            updatePOSCustomerMembership();
        }
    }
}

function renderCart() {
    const container = document.getElementById('posCartItems');
    if (!container) return;
    
    if (currentCart.length === 0) {
        container.innerHTML = `
            <div class="cart-empty">
                <i class="fas fa-shopping-basket"></i>
                <p>Cart is empty</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = currentCart.map(item => `
        <div class="cart-item">
            <div class="cart-item-info">
                <div class="cart-item-name">
                    ${escapeHtml(item.name)}
                    <button class="cart-item-memo-btn" onclick="showItemMemo('${item.productId}')" title="Add serving note">
                        <i class="fas fa-sticky-note ${item.memo ? 'has-memo' : ''}"></i>
                    </button>
                </div>
                <div class="cart-item-price">RM ${item.price.toFixed(2)} each</div>
                ${item.memo ? `<div class="cart-item-memo"><i class="fas fa-info-circle"></i> ${escapeHtml(item.memo)}</div>` : ''}
            </div>
            <div class="cart-item-quantity">
                <button class="qty-btn" onclick="updateCartItemQuantity('${item.productId}', -1)">-</button>
                <input type="number" value="${item.quantity}" min="1" 
                       onchange="setCartItemQuantity('${item.productId}', this.value)"
                       onclick="this.select()">
                <button class="qty-btn" onclick="updateCartItemQuantity('${item.productId}', 1)">+</button>
            </div>
            <div class="cart-item-total">RM ${(item.price * item.quantity).toFixed(2)}</div>
            <button class="cart-item-remove" onclick="removeFromCart('${item.productId}')">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `).join('');
}

// ==================== ITEM MEMO / SERVING NOTES ====================
function showItemMemo(productId) {
    const item = currentCart.find(i => i.productId === productId);
    if (!item) return;
    
    const currentMemo = item.memo || '';
    const memo = prompt(`Serving Note for ${item.name}:\n(e.g., "Less ice", "No sugar", "Table 5", "Serve to Mr. Tan")`, currentMemo);
    
    if (memo !== null) {
        item.memo = memo.trim();
        renderCart();
        if (memo.trim()) {
            showToast('Memo added', 'success');
        }
    }
}

function updateCartTotals() {
    const subtotal = currentCart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    
    // Recalculate member discount if customer has tier discount
    const customerId = document.getElementById('posCustomer')?.value;
    if (customerId && typeof getCustomerMembership === 'function') {
        const membership = getCustomerMembership(customerId);
        if (membership && membership.tierInfo.discount > 0) {
            const newMemberDiscount = Math.round((subtotal * membership.tierInfo.discount / 100) * 100) / 100;
            const discountInput = document.getElementById('cartDiscount');
            if (discountInput && window.posMemberDiscount !== newMemberDiscount) {
                const currentDiscount = parseFloat(discountInput.value) || 0;
                const otherDiscounts = currentDiscount - (window.posMemberDiscount || 0);
                discountInput.value = Math.max(0, otherDiscounts + newMemberDiscount).toFixed(2);
                window.posMemberDiscount = newMemberDiscount;
                
                // Update membership card to show new discount amount
                const memberDiscountDisplay = document.querySelector('.pos-tier-discount');
                if (memberDiscountDisplay) {
                    memberDiscountDisplay.textContent = `${membership.tierInfo.discount}% member discount${newMemberDiscount > 0 ? ` (-RM${newMemberDiscount.toFixed(2)})` : ''}`;
                }
            }
        }
    }
    
    const discount = parseFloat(document.getElementById('cartDiscount')?.value) || 0;
    
    // Calculate tax per item based on product's tax rate
    let totalTax = 0;
    currentCart.forEach(item => {
        const product = products.find(p => p.id === item.productId);
        const taxRate = product?.taxRate !== undefined ? product.taxRate / 100 : 0.06; // Default 6% if not set
        const itemSubtotal = item.price * item.quantity;
        // Apply proportional discount
        const itemDiscount = discount > 0 ? (itemSubtotal / subtotal) * discount : 0;
        const taxableAmount = Math.max(0, itemSubtotal - itemDiscount);
        totalTax += taxableAmount * taxRate;
    });
    
    const taxableSubtotal = Math.max(0, subtotal - discount);
    const total = taxableSubtotal + totalTax;
    
    const subtotalEl = document.getElementById('cartSubtotal');
    const taxEl = document.getElementById('cartTax');
    const totalEl = document.getElementById('cartTotal');
    
    if (subtotalEl) subtotalEl.textContent = `RM ${subtotal.toFixed(2)}`;
    if (taxEl) taxEl.textContent = `RM ${totalTax.toFixed(2)}`;
    if (totalEl) totalEl.textContent = `RM ${total.toFixed(2)}`;
}

// ==================== HOLD / RECALL SALES ====================
function holdSale() {
    if (currentCart.length === 0) {
        showToast('Cart is empty!', 'warning');
        return;
    }
    
    const customerId = document.getElementById('posCustomer')?.value || '';
    const customer = customers.find(c => c.id === customerId);
    const salesperson = document.getElementById('posSalesperson')?.value || '';
    
    // Include table info if in restaurant mode
    const tableId = posMode === 'restaurant' && currentTable ? currentTable.id : null;
    const tableName = currentTable?.number || null;
    
    heldSales.push({
        id: generateUUID(),
        date: new Date().toISOString(),
        customerId: customerId,
        customerName: customer?.name || 'Walk-in',
        salesperson: salesperson,
        items: [...currentCart],
        discount: parseFloat(document.getElementById('cartDiscount')?.value) || 0,
        tableId: tableId,
        tableName: tableName,
        // Order type info
        orderType: currentOrderType,
        deliveryPlatform: currentOrderType === 'delivery' ? currentDeliveryPlatform : null,
        deliveryOrderId: currentOrderType === 'delivery' ? currentDeliveryOrderId : null
    });
    
    saveHeldSales();
    currentCart = [];
    document.getElementById('cartDiscount').value = 0;
    
    // Clear table selection after holding
    if (posMode === 'restaurant') {
        currentTable = null;
        renderTableSelector();
        updateCurrentTableDisplay();
    }
    
    // Reset order type
    resetOrderType();
    
    renderCart();
    updateCartTotals();
    
    showToast(tableName ? `Table ${tableName} order held` : 'Sale held successfully!', 'success');
}

function showHeldSales() {
    if (heldSales.length === 0) {
        showToast('No held sales', 'info');
        return;
    }
    
    const html = `
        <div class="held-sales-list">
            ${heldSales.map((sale, index) => `
                <div class="held-sale-item">
                    <div class="held-sale-info">
                        <strong>
                            ${sale.tableName ? `<span class="held-table-badge"><i class="fas fa-chair"></i> ${sale.tableName}</span> ` : ''}
                            ${sale.orderType ? `<span class="held-order-type-badge ${sale.orderType}">${getOrderTypeLabel(sale.orderType)}</span> ` : ''}
                            ${sale.deliveryPlatform ? `<span class="held-platform-badge">${getPlatformLabel(sale.deliveryPlatform)}${sale.deliveryOrderId ? ' #' + sale.deliveryOrderId : ''}</span> ` : ''}
                            ${sale.customerName}
                        </strong>
                        <span>${formatHeldDate(sale.date)}</span>
                        <span>${sale.items.length} items - RM ${sale.items.reduce((s, i) => s + i.price * i.quantity, 0).toFixed(2)}</span>
                    </div>
                    <div class="held-sale-actions">
                        <button class="btn-primary btn-sm" onclick="recallSale(${index}); closeHeldModal();">Recall</button>
                        <button class="btn-outline btn-sm danger" onclick="deleteHeldSale(${index})">Delete</button>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
    
    // Create temporary modal for held sales
    let modal = document.getElementById('heldSalesModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'heldSalesModal';
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 500px;">
                <div class="modal-header">
                    <h3 class="modal-title"><i class="fas fa-history"></i> Held Sales</h3>
                    <button class="modal-close" onclick="closeHeldModal()">&times;</button>
                </div>
                <div id="heldSalesContent"></div>
            </div>
        `;
        document.body.appendChild(modal);
    }
    
    document.getElementById('heldSalesContent').innerHTML = html;
    modal.style.display = '';
    modal.classList.add('show');
}

function closeHeldModal() {
    const modal = document.getElementById('heldSalesModal');
    if (modal) modal.classList.remove('show');
}

function recallSale(index) {
    const sale = heldSales[index];
    if (!sale) return;
    
    // Check if cart has items
    if (currentCart.length > 0) {
        if (!confirm('Current cart has items. Replace with held sale?')) return;
    }
    
    currentCart = [...sale.items];
    restorePOSCustomer(sale.customerId);
    document.getElementById('posSalesperson').value = sale.salesperson || '';
    document.getElementById('cartDiscount').value = sale.discount || 0;
    
    // Restore order type
    if (sale.orderType) {
        setOrderType(sale.orderType);
        if (sale.orderType === 'delivery') {
            if (sale.deliveryPlatform) {
                const platformSelect = document.getElementById('deliveryPlatform');
                if (platformSelect) platformSelect.value = sale.deliveryPlatform;
                currentDeliveryPlatform = sale.deliveryPlatform;
            }
            if (sale.deliveryOrderId) {
                const orderIdInput = document.getElementById('deliveryOrderId');
                if (orderIdInput) orderIdInput.value = sale.deliveryOrderId;
                currentDeliveryOrderId = sale.deliveryOrderId;
            }
        }
    }
    
    // Restore table selection if this sale had a table
    if (sale.tableId && posMode === 'restaurant') {
        const table = posTables.find(t => t.id === sale.tableId);
        if (table) {
            currentTable = table;
            updateCurrentTableDisplay();
        }
    }
    
    // Remove from held
    heldSales.splice(index, 1);
    saveHeldSales();
    
    // Refresh table selector to update occupied status
    if (posMode === 'restaurant') {
        renderTableSelector();
    }
    
    renderCart();
    updateCartTotals();
    showToast(sale.tableName ? `Table ${sale.tableName} order recalled` : 'Sale recalled!', 'success');
}

function deleteHeldSale(index) {
    if (confirm('Delete this held sale?')) {
        heldSales.splice(index, 1);
        saveHeldSales();
        showHeldSales();
        
        // Show success message
        if (typeof showToast === 'function') {
            showToast('Held sale deleted', 'success');
        } else if (typeof showNotification === 'function') {
            showNotification('Held sale deleted', 'success');
        }
        
        // Refresh table selector to update occupied status
        if (posMode === 'restaurant') {
            renderTableSelector();
        }
    }
}

function updateHeldCount() {
    const el = document.getElementById('heldCount');
    if (el) el.textContent = heldSales.length;
}

function formatHeldDate(dateStr) {
    const date = new Date(dateStr);
    return date.toLocaleString('en-MY', { 
        month: 'short', 
        day: 'numeric', 
        hour: '2-digit', 
        minute: '2-digit' 
    });
}

// ==================== PAYMENT PROCESSING ====================

// Auto-generate transaction reference
function generateTransactionRef() {
    const now = new Date();
    const prefix = 'TXN';
    const date = now.toISOString().slice(0, 10).replace(/-/g, '');
    const time = now.toTimeString().slice(0, 8).replace(/:/g, '');
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `${prefix}${date}${time}${random}`;
}

function showPaymentModal() {
    if (currentCart.length === 0) {
        showToast('Cart is empty!', 'warning');
        return;
    }
    
    // Reset processing flag when opening modal
    isProcessingPayment = false;
    
    const modal = document.getElementById('posPaymentModal');
    const subtotal = currentCart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const discount = parseFloat(document.getElementById('cartDiscount')?.value) || 0;
    const tax = calculateCartTax();
    const total = Math.max(0, subtotal - discount) + tax;
    
    document.getElementById('paymentTotalAmount').textContent = `RM ${total.toFixed(2)}`;
    document.getElementById('amountReceived').value = '';
    document.getElementById('changeDisplay').style.display = 'none';
    // Auto-generate Transaction ID
    document.getElementById('posPaymentReference').value = generateTransactionRef();;
    
    // Reset to cash
    document.querySelector('input[name="paymentMethod"][value="cash"]').checked = true;
    
    // Get credit payment elements
    const creditPaymentOption = document.getElementById('creditPaymentOption');
    const creditInfoGroup = document.getElementById('creditInfoGroup');
    
    // Default: hide credit option
    if (creditPaymentOption) creditPaymentOption.style.display = 'none';
    if (creditInfoGroup) creditInfoGroup.style.display = 'none';
    
    // Check if customer has credit terms
    const customerId = document.getElementById('posCustomer')?.value || '';
    
    if (customerId && creditPaymentOption && creditInfoGroup) {
        // Get CRM customer data
        const crmCustomer = getCRMCustomerById(customerId);
        console.log('POS Credit Check - Customer ID:', customerId, 'CRM Customer:', crmCustomer);
        
        if (crmCustomer && crmCustomer.creditTerms && crmCustomer.creditTerms !== 'cod') {
            // Show credit payment option
            creditPaymentOption.style.display = 'block';
            console.log('POS Credit - Showing credit option for:', crmCustomer.name, 'Terms:', crmCustomer.creditTerms);
            
            // Calculate credit info
            const creditLimit = parseFloat(crmCustomer.creditLimit) || 0;
            const outstanding = parseFloat(crmCustomer.outstandingBalance) || 0;
            const available = creditLimit - outstanding;
            
            // Update credit info display
            const termLabels = {
                '7days': 'Net 7 Days',
                '14days': 'Net 14 Days',
                '30days': 'Net 30 Days',
                '60days': 'Net 60 Days',
                '90days': 'Net 90 Days'
            };
            
            document.getElementById('creditTermsDisplay').textContent = termLabels[crmCustomer.creditTerms] || crmCustomer.creditTerms;
            document.getElementById('creditLimitDisplay').textContent = `RM ${creditLimit.toFixed(2)}`;
            document.getElementById('creditOutstandingDisplay').textContent = `RM ${outstanding.toFixed(2)}`;
            document.getElementById('creditAvailableDisplay').textContent = `RM ${available.toFixed(2)}`;
            
            // Color code available credit
            const availableEl = document.getElementById('creditAvailableDisplay');
            if (available < total) {
                availableEl.classList.add('over-limit');
                availableEl.classList.remove('credit-available');
            } else {
                availableEl.classList.add('credit-available');
                availableEl.classList.remove('over-limit');
            }
        } else {
            creditPaymentOption.style.display = 'none';
            creditInfoGroup.style.display = 'none';
        }
    }
    
    // Add event listener for payment method change
    document.querySelectorAll('input[name="paymentMethod"]').forEach(radio => {
        radio.addEventListener('change', handlePaymentMethodChange);
    });
    
    // Initialize view
    handlePaymentMethodChange();
    
    modal.style.display = '';
    modal.classList.add('show');
}

function closePosPaymentModal() {
    const modal = document.getElementById('posPaymentModal');
    if (modal) {
        modal.classList.remove('show');
        modal.style.display = 'none';
    }
    isProcessingPayment = false;
}

function handlePaymentMethodChange() {
    const paymentMethod = document.querySelector('input[name="paymentMethod"]:checked')?.value;
    const cashAmountGroup = document.getElementById('cashAmountGroup');
    const creditInfoGroup = document.getElementById('creditInfoGroup');
    
    if (cashAmountGroup) {
        cashAmountGroup.style.display = paymentMethod === 'cash' ? 'block' : 'none';
    }
    
    if (creditInfoGroup) {
        creditInfoGroup.style.display = paymentMethod === 'credit' ? 'block' : 'none';
    }
}

// Helper to get CRM customer by ID
function getCRMCustomerById(customerId) {
    // Try window.crmCustomers first (set by tenant data loading)
    if (Array.isArray(window.crmCustomers) && window.crmCustomers.length > 0) {
        const found = window.crmCustomers.find(c => c.id === customerId);
        if (found) return found;
    }
    // Try module-level crmCustomers
    if (typeof crmCustomers !== 'undefined' && Array.isArray(crmCustomers)) {
        const found = crmCustomers.find(c => c.id === customerId);
        if (found) return found;
    }
    // Try from localStorage
    try {
        const stored = localStorage.getItem('ezcubic_crm_customers');
        if (stored) {
            const customers = JSON.parse(stored);
            const found = customers.find(c => c.id === customerId);
            if (found) return found;
        }
    } catch (e) {
        console.error('Error loading CRM customers:', e);
    }
    
    // Also check regular customers (they may have credit settings)
    if (Array.isArray(window.customers) && window.customers.length > 0) {
        const found = window.customers.find(c => c.id === customerId);
        if (found) return found;
    }
    
    // Try from localStorage for regular customers
    try {
        const stored = localStorage.getItem('ezcubic_customers');
        if (stored) {
            const customers = JSON.parse(stored);
            const found = customers.find(c => c.id === customerId);
            if (found) return found;
        }
    } catch (e) {
        console.error('Error loading regular customers:', e);
    }
    
    return null;
}

function calculateChange() {
    const subtotal = currentCart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const discount = parseFloat(document.getElementById('cartDiscount')?.value) || 0;
    
    // Calculate tax per product
    let totalTax = 0;
    currentCart.forEach(item => {
        const product = products.find(p => p.id === item.productId);
        const taxRate = product?.taxRate !== undefined ? product.taxRate / 100 : 0.06;
        const itemSubtotal = item.price * item.quantity;
        const itemDiscount = discount > 0 ? (itemSubtotal / subtotal) * discount : 0;
        const taxableAmount = Math.max(0, itemSubtotal - itemDiscount);
        totalTax += taxableAmount * taxRate;
    });
    
    const total = Math.max(0, subtotal - discount) + totalTax;
    
    const received = parseFloat(document.getElementById('amountReceived').value) || 0;
    const change = received - total;
    
    const displayEl = document.getElementById('changeDisplay');
    const changeEl = document.getElementById('changeAmount');
    
    if (received > 0) {
        displayEl.style.display = 'flex';
        changeEl.textContent = `RM ${Math.max(0, change).toFixed(2)}`;
        changeEl.style.color = change >= 0 ? '#10b981' : '#ef4444';
    } else {
        displayEl.style.display = 'none';
    }
}

function fillExactAmount() {
    const subtotal = currentCart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const discount = parseFloat(document.getElementById('cartDiscount')?.value) || 0;
    const tax = calculateCartTax();
    const total = Math.max(0, subtotal - discount) + tax;
    
    document.getElementById('amountReceived').value = total.toFixed(2);
    calculateChange();
}

function calculateCartTax() {
    const subtotal = currentCart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const discount = parseFloat(document.getElementById('cartDiscount')?.value) || 0;
    
    let totalTax = 0;
    currentCart.forEach(item => {
        const product = products.find(p => p.id === item.productId);
        const taxRate = product?.taxRate !== undefined ? product.taxRate / 100 : 0.06;
        const itemSubtotal = item.price * item.quantity;
        const itemDiscount = discount > 0 ? (itemSubtotal / subtotal) * discount : 0;
        const taxableAmount = Math.max(0, itemSubtotal - itemDiscount);
        totalTax += taxableAmount * taxRate;
    });
    
    return totalTax;
}

// Flag to prevent double submission
let isProcessingPayment = false;

function processPayment(event) {
    event.preventDefault();
    
    // Prevent double submission
    if (isProcessingPayment) {
        console.log('Payment already processing...');
        return;
    }
    
    // ===== VALIDATE OUTLET SELECTION =====
    const posOutletFilter = document.getElementById('posOutletFilter');
    const outletFilterVisible = posOutletFilter && posOutletFilter.closest('.pos-outlet-filter')?.style.display !== 'none';
    let selectedOutlet = posOutletFilter?.value || 'all';
    
    // If outlet filter is hidden (single-branch plans), use default HQ branch
    if (!outletFilterVisible || selectedOutlet === 'all') {
        // Get default branch or HQ
        const defaultBranch = (window.branches || []).find(b => b.isDefault || b.id === 'BRANCH_HQ');
        selectedOutlet = defaultBranch?.id || 'BRANCH_HQ';
    }
    
    // ===== VALIDATE SALESPERSON/CASHIER SELECTION =====
    const salesperson = document.getElementById('posSalesperson')?.value || '';
    if (!salesperson) {
        showToast('Please select a cashier/staff before checkout!', 'error');
        document.getElementById('posSalesperson')?.focus();
        return;
    }
    
    // Check if cart is empty
    if (currentCart.length === 0) {
        showToast('Cart is empty!', 'error');
        return;
    }
    
    // Set processing flag AFTER validations pass
    isProcessingPayment = true;
    
    const paymentMethod = document.querySelector('input[name="paymentMethod"]:checked').value;
    const reference = document.getElementById('posPaymentReference').value.trim();
    
    const subtotal = currentCart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const discount = parseFloat(document.getElementById('cartDiscount')?.value) || 0;
    const tax = calculateCartTax();
    const total = Math.max(0, subtotal - discount) + tax;
    
    // Validate cash payment
    if (paymentMethod === 'cash') {
        const received = parseFloat(document.getElementById('amountReceived').value) || 0;
        if (received < total) {
            showToast('Insufficient amount received!', 'error');
            isProcessingPayment = false;
            return;
        }
    }
    
    // Validate credit payment
    if (paymentMethod === 'credit') {
        const customerId = document.getElementById('posCustomer')?.value || '';
        if (!customerId) {
            showToast('Please select a customer for credit payment!', 'error');
            isProcessingPayment = false;
            return;
        }
        
        const crmCustomer = getCRMCustomerById(customerId);
        if (!crmCustomer || !crmCustomer.creditTerms || crmCustomer.creditTerms === 'cod') {
            showToast('This customer does not have credit terms!', 'error');
            isProcessingPayment = false;
            return;
        }
        
        const creditLimit = parseFloat(crmCustomer.creditLimit) || 0;
        const outstanding = parseFloat(crmCustomer.outstandingBalance) || 0;
        const available = creditLimit - outstanding;
        
        if (total > available) {
            showToast(`Credit limit exceeded! Available: RM ${available.toFixed(2)}`, 'error');
            isProcessingPayment = false;
            return;
        }
    }
    
    // Create sale record
    const customerId = document.getElementById('posCustomer')?.value || '';
    
    // Look up customer in CRM first, then fall back to legacy customers
    let customer = null;
    let customerName = 'Walk-in Customer';
    
    if (customerId) {
        // Try CRM customers first
        if (typeof getCRMCustomersForSelect === 'function') {
            const crmCustomers = getCRMCustomersForSelect();
            const crmCustomer = crmCustomers.find(c => c.id === customerId);
            if (crmCustomer) {
                customerName = crmCustomer.name;
                customer = crmCustomer;
            }
        }
        
        // Fall back to legacy customers array
        if (!customer && Array.isArray(customers)) {
            customer = customers.find(c => c.id === customerId);
            if (customer) {
                customerName = customer.name;
            }
        }
    }
    
    // Get current branch/outlet (use selectedOutlet from validation above)
    const currentBranch = typeof getCurrentBranch === 'function' ? getCurrentBranch() : null;
    const branchId = selectedOutlet !== 'all' ? selectedOutlet : (currentBranch?.id || 'BRANCH_HQ');
    const branchName = getBranchNameById(branchId);
    
    // Get current tenant ID for multi-tenant support
    const currentTenantId = typeof getCurrentTenantId === 'function' ? getCurrentTenantId() : null;
    
    // Calculate due date for credit sales based on customer's credit terms
    let dueDate = null;
    let creditTerms = null;
    if (paymentMethod === 'credit' && customerId) {
        const crmCustomer = getCRMCustomerById(customerId);
        if (crmCustomer && crmCustomer.creditTerms) {
            creditTerms = crmCustomer.creditTerms;
            const saleDate = new Date();
            const termDays = {
                'cod': 0,
                '7days': 7,
                '14days': 14,
                '30days': 30,
                '60days': 60,
                '90days': 90
            };
            const days = termDays[crmCustomer.creditTerms] || 30;
            dueDate = new Date(saleDate);
            dueDate.setDate(dueDate.getDate() + days);
            dueDate = dueDate.toISOString();
        }
    }
    
    // Get table info if restaurant mode
    const tableId = posMode === 'restaurant' && currentTable ? currentTable.id : null;
    const tableName = posMode === 'restaurant' && currentTable ? currentTable.number : null;
    
    const sale = {
        id: generateUUID(),
        receiptNo: generateReceiptNumber(),
        date: new Date().toISOString(),
        dueDate: dueDate, // Due date for credit sales (for AR aging reports)
        creditTerms: creditTerms, // Store credit terms used
        isCredit: paymentMethod === 'credit', // Flag for AR reports
        paidAmount: paymentMethod === 'credit' ? 0 : total, // Credit sales start unpaid
        tenantId: currentTenantId, // Add tenant ID for multi-tenant support
        customerId: customerId,
        customerName: customerName,
        salesperson: document.getElementById('posSalesperson')?.value || '',
        cashier: document.getElementById('posSalesperson')?.value || '',
        branchId: branchId,
        branchName: branchName,
        items: [...currentCart],
        subtotal: subtotal,
        discount: discount,
        tax: tax,
        total: total,
        paymentMethod: paymentMethod,
        reference: reference,
        amountReceived: paymentMethod === 'cash' ? parseFloat(document.getElementById('amountReceived').value) : total,
        change: paymentMethod === 'cash' ? parseFloat(document.getElementById('amountReceived').value) - total : 0,
        status: paymentMethod === 'credit' ? 'unpaid' : 'completed', // Credit sales start as unpaid
        // Order type info
        orderType: currentOrderType,
        deliveryPlatform: currentOrderType === 'delivery' ? currentDeliveryPlatform : null,
        deliveryOrderId: currentOrderType === 'delivery' ? currentDeliveryOrderId : null,
        // Table info (restaurant mode)
        tableId: tableId,
        tableName: tableName
    };
    
    // Save sale
    sales.push(sale);
    localStorage.setItem(SALES_KEY, JSON.stringify(sales));
    
    // ===== STOCK DEDUCTION - USING CENTRALIZED STOCK MANAGER =====
    // FIX: Use single source of truth for stock operations
    if (typeof batchUpdateStock === 'function') {
        // Build updates array for batch processing
        const stockUpdates = currentCart.map(item => ({
            productId: item.productId,
            quantityChange: -item.quantity, // Negative for sale
            notes: `Sold to ${customerName}`
        }));
        
        // Batch deduct stock - all or nothing
        const stockResult = batchUpdateStock(stockUpdates, 'sale', {
            branchId: branchId || 'BRANCH_HQ',
            reference: sale.receiptNo
        });
        
        if (!stockResult.success) {
            console.warn('⚠️ Stock deduction had issues:', stockResult);
        } else {
            console.log('✅ Stock deducted for sale:', sale.receiptNo);
        }
    } else {
        // Fallback to old method if stock-manager not loaded
        console.warn('⚠️ Stock manager not available, using legacy stock deduction');
        currentCart.forEach(item => {
            const productIndex = products.findIndex(p => p.id === item.productId);
            if (productIndex !== -1) {
                products[productIndex].stock = Math.max(0, (products[productIndex].stock || 0) - item.quantity);
            }
        });
        if (typeof saveProducts === 'function') {
            saveProducts();
        } else {
            localStorage.setItem(PRODUCTS_KEY, JSON.stringify(products));
        }
    }
    
    // ===== CRM MEMBERSHIP: REDEEM POINTS =====
    // Deduct redeemed points from customer account
    if (customerId && window.posRedeemedPoints > 0 && window.posRedeemCustomerId === customerId) {
        const redeemResult = redeemCustomerPoints(customerId, window.posRedeemedPoints, sale.receiptNo);
        if (redeemResult.success) {
            sale.pointsRedeemed = window.posRedeemedPoints;
            sale.pointsDiscount = window.posRedeemedPoints / 100; // RM value
            console.log(`✅ Redeemed ${window.posRedeemedPoints} points for customer ${customerId}`);
        }
        // Reset redemption state after checkout
        window.posRedeemedPoints = 0;
        window.posRedeemCustomerId = null;
    }
    
    // ===== CRM MEMBERSHIP: EARN POINTS =====
    // Add membership points for CRM customers (new system)
    if (customerId && typeof addCustomerPoints === 'function') {
        const pointsResult = addCustomerPoints(customerId, total, sale.receiptNo);
        if (pointsResult.success) {
            // Store points info in sale record for receipt
            sale.pointsEarned = pointsResult.pointsEarned;
            sale.totalPoints = pointsResult.totalPoints;
            sale.membershipTier = pointsResult.tierInfo?.label;
            
            // Show points earned notification
            setTimeout(() => {
                let pointsMsg = `⭐ ${pointsResult.pointsEarned} points earned! (Total: ${pointsResult.totalPoints})`;
                if (pointsResult.tierUpgraded) {
                    pointsMsg = `🎉 UPGRADED to ${pointsResult.tierInfo.icon} ${pointsResult.tierInfo.label}! +${pointsResult.pointsEarned} pts`;
                    showToast(pointsMsg, 'success');
                } else {
                    showToast(pointsMsg, 'info');
                }
                
                // Refresh membership card display with new points
                if (typeof updatePOSCustomerMembership === 'function') {
                    updatePOSCustomerMembership();
                }
            }, 2000);
            
            // Update sale record in storage with points info
            const saleIndex = sales.findIndex(s => s.id === sale.id);
            if (saleIndex !== -1) {
                sales[saleIndex] = sale;
                localStorage.setItem(SALES_KEY, JSON.stringify(sales));
            }
        }
    }
    
    // Legacy loyalty points (fallback for non-CRM customers)
    if (customer && settings.enableLoyaltyPoints && !customerId) {
        const pointsEarned = Math.floor(total * settings.pointsPerRM);
        const customerIndex = customers.findIndex(c => c.id === customerId);
        if (customerIndex !== -1) {
            customers[customerIndex].loyaltyPoints = (customers[customerIndex].loyaltyPoints || 0) + pointsEarned;
            customers[customerIndex].totalPurchases = (customers[customerIndex].totalPurchases || 0) + total;
            customers[customerIndex].lastPurchase = sale.date;
            saveCustomers();
        }
    }
    
    // Link sale to CRM customer
    if (customerId && typeof linkSaleToCRMCustomer === 'function') {
        linkSaleToCRMCustomer(customerId, {
            saleId: sale.id,
            receiptNo: sale.receiptNo,
            date: sale.date,
            total: sale.total,
            items: sale.items.map(item => ({
                name: item.name,
                quantity: item.quantity,
                price: item.price
            })),
            paymentMethod: sale.paymentMethod
        });
    }
    
    // Update CRM customer outstanding balance for credit payments
    if (paymentMethod === 'credit' && customerId) {
        updateCRMCustomerCredit(customerId, total);
    }
    
    // Also record as income transaction (for credit, mark as accounts receivable)
    const incomeTransaction = {
        id: generateUUID(),
        date: new Date().toISOString().split('T')[0],
        amount: total,
        category: 'Sales',
        description: `POS Sale #${sale.receiptNo}`,
        type: 'income',
        method: paymentMethod,
        reference: sale.receiptNo,
        timestamp: new Date().toISOString()
    };
    // Push to businessData.transactions to ensure proper sync with All Transactions
    if (typeof businessData !== 'undefined' && businessData.transactions) {
        businessData.transactions.push(incomeTransaction);
    } else {
        transactions.push(incomeTransaction);
    }
    
    // Record cost of goods sold (COGS) as expense
    const totalCost = currentCart.reduce((sum, item) => {
        const product = products.find(p => p.id === item.productId);
        return sum + ((product?.cost || 0) * item.quantity);
    }, 0);
    
    if (totalCost > 0) {
        const cogsTransaction = {
            id: generateUUID(),
            date: new Date().toISOString().split('T')[0],
            amount: totalCost,
            category: 'Cost of Goods Sold',
            description: `COGS for Sale #${sale.receiptNo}`,
            type: 'expense',
            method: paymentMethod,
            reference: sale.receiptNo,
            timestamp: new Date().toISOString()
        };
        // Push to businessData.transactions to ensure proper sync with All Transactions
        if (typeof businessData !== 'undefined' && businessData.transactions) {
            businessData.transactions.push(cogsTransaction);
        } else {
            transactions.push(cogsTransaction);
        }
        
        // Show COGS expense recorded notification
        setTimeout(() => {
            showToast(`📦 COGS expense recorded: RM ${totalCost.toFixed(2)}`, 'info');
        }, 1500);
    }
    
    saveData();
    
    // Also save sales to tenant storage
    window.sales = sales;
    if (typeof saveToUserTenant === 'function') {
        saveToUserTenant();
        console.log('POS: Sales and products saved to tenant');
    }
    
    // Trigger cloud sync to persist sales
    if (typeof window.fullCloudSync === 'function') {
        setTimeout(() => {
            window.fullCloudSync().catch(e => console.warn('POS Cloud sync failed:', e));
        }, 100);
    }
    
    // Update order stats if function exists
    if (typeof updateOrderStats === 'function') {
        updateOrderStats();
    }
    
    // Also refresh orders table if visible
    if (typeof renderOrders === 'function') {
        renderOrders();
    }
    
    closePosPaymentModal();
    
    // Clear the cart BEFORE showing receipt to prevent double submission
    currentCart = [];
    renderCart();
    updateCartTotals();
    
    // Clear table selection after payment (restaurant mode)
    if (posMode === 'restaurant') {
        currentTable = null;
        renderTableSelector();
        updateCurrentTableDisplay();
    }
    
    // Reset order type
    resetOrderType();
    
    // Reset customer selection
    clearPOSCustomer();
    
    // Reset payment form
    const paymentForm = document.getElementById('paymentForm');
    if (paymentForm) paymentForm.reset();
    document.getElementById('amountReceived').value = '';
    document.getElementById('changeAmount').textContent = 'RM 0.00';
    document.getElementById('posPaymentReference').value = '';
    
    // Show receipt
    showReceipt(sale);
    
    // Refresh POS products to show updated stock
    renderPOSProducts();
    
    // Reset processing flag
    isProcessingPayment = false;
    
    // Show success notification
    showToast('✅ Sale completed successfully!', 'success');
    
    // Record audit log for the sale
    if (typeof recordAuditLog === 'function') {
        recordAuditLog({
            action: 'create',
            module: 'sales',
            subModule: 'pos',
            recordId: sale.id,
            recordName: sale.receiptNo,
            description: `POS sale completed - ${sale.items.length} item(s), Total: RM ${sale.total.toFixed(2)}`,
            newValue: {
                receiptNo: sale.receiptNo,
                customer: sale.customerName,
                items: sale.items.map(i => `${i.name} x${i.quantity}`).join(', '),
                total: sale.total,
                paymentMethod: sale.paymentMethod,
                cashier: sale.salesperson,
                branch: sale.branchName
            }
        });
    }
    
    // Show income recorded notification after a delay
    setTimeout(() => {
        showToast(`💰 Income recorded: RM ${total.toFixed(2)}`, 'success');
    }, 500);
}

function generateReceiptNumber() {
    // Use customizable document numbering if available
    if (typeof generateDocumentNumber === 'function') {
        return generateDocumentNumber('receipt');
    }
    
    // Fallback to original logic
    const date = new Date();
    const prefix = 'RCP';
    const dateStr = date.toISOString().split('T')[0].replace(/-/g, '');
    const sequence = (sales.length + 1).toString().padStart(4, '0');
    return `${prefix}${dateStr}-${sequence}`;
}

// ==================== RECEIPT ====================
function showReceipt(sale) {
    const modal = document.getElementById('receiptModal');
    const content = document.getElementById('receiptContent');
    
    const businessName = settings.businessName || 'A Lazy Human Business';
    const businessAddress = settings.businessAddress || '';
    const sst = settings.sstNumber || '';
    const branchName = sale.branchName || 'Main Branch';
    
    // Build order type display
    let orderTypeDisplay = '';
    if (sale.orderType) {
        const orderTypeLabels = {
            'dine-in': '🍽️ DINE-IN',
            'takeaway': '🥡 TAKEAWAY', 
            'delivery': '🛵 DELIVERY'
        };
        orderTypeDisplay = orderTypeLabels[sale.orderType] || sale.orderType.toUpperCase();
    }
    
    // Build delivery info display
    let deliveryInfoDisplay = '';
    if (sale.orderType === 'delivery' && sale.deliveryPlatform) {
        const platformLabels = {
            'grab': '🟢 Grab',
            'foodpanda': '🩷 FoodPanda',
            'shopeefood': '🟠 ShopeeFood',
            'own': '🚗 Own Delivery',
            'other': '📦 Other'
        };
        deliveryInfoDisplay = platformLabels[sale.deliveryPlatform] || sale.deliveryPlatform;
        if (sale.deliveryOrderId) {
            deliveryInfoDisplay += ` #${sale.deliveryOrderId}`;
        }
    }
    
    content.innerHTML = `
        <div class="receipt">
            <div class="receipt-header">
                <h2>${escapeHtml(businessName)}</h2>
                <p style="font-weight: 600; color: #2563eb;"><i class="fas fa-store"></i> ${escapeHtml(branchName)}</p>
                ${businessAddress ? `<p>${escapeHtml(businessAddress)}</p>` : ''}
                ${sst ? `<p>SST No: ${sst}</p>` : ''}
            </div>
            ${orderTypeDisplay ? `
            <div style="text-align: center; padding: 8px; margin: 8px 0; background: #f0f0f0; border-radius: 4px; font-weight: bold; font-size: 14px;">
                ${orderTypeDisplay}
                ${sale.tableName ? ` - Table ${sale.tableName}` : ''}
                ${deliveryInfoDisplay ? `<br><span style="font-size: 12px;">${deliveryInfoDisplay}</span>` : ''}
            </div>
            ` : ''}
            <div class="receipt-divider">================================</div>
            <div class="receipt-info">
                <div><strong>Receipt:</strong> ${sale.receiptNo}</div>
                <div><strong>Date:</strong> ${typeof formatMalaysiaDateTime === 'function' ? formatMalaysiaDateTime(sale.date) : new Date(sale.date).toLocaleString('en-MY', { timeZone: 'Asia/Kuala_Lumpur' })}</div>
                <div><strong>Customer:</strong> ${escapeHtml(sale.customerName)}</div>
                ${sale.salesperson ? `<div><strong>Served by:</strong> ${escapeHtml(sale.salesperson)}</div>` : ''}
            </div>
            <div class="receipt-divider">================================</div>
            <div class="receipt-items">
                ${sale.items.map(item => `
                    <div class="receipt-item">
                        <div class="item-name">${escapeHtml(item.name)}</div>
                        <div class="item-details">
                            ${item.quantity} x RM${item.price.toFixed(2)}
                            <span class="item-total">RM${(item.quantity * item.price).toFixed(2)}</span>
                        </div>
                        ${item.memo ? `<div class="item-memo" style="font-size: 10px; color: #666; padding-left: 10px;"><i>📝 ${escapeHtml(item.memo)}</i></div>` : ''}
                    </div>
                `).join('')}
            </div>
            <div class="receipt-divider">--------------------------------</div>
            <div class="receipt-totals">
                <div class="total-row">
                    <span>Subtotal:</span>
                    <span>RM ${sale.subtotal.toFixed(2)}</span>
                </div>
                ${sale.discount > 0 ? `
                <div class="total-row">
                    <span>Discount:</span>
                    <span>-RM ${sale.discount.toFixed(2)}</span>
                </div>
                ` : ''}
                <div class="total-row">
                    <span>Tax (6% SST):</span>
                    <span>RM ${sale.tax.toFixed(2)}</span>
                </div>
                <div class="total-row grand-total">
                    <span>TOTAL:</span>
                    <span>RM ${sale.total.toFixed(2)}</span>
                </div>
            </div>
            <div class="receipt-divider">--------------------------------</div>
            <div class="receipt-payment">
                <div><strong>Payment:</strong> ${capitalizeFirst(sale.paymentMethod)}</div>
                ${sale.paymentMethod === 'cash' ? `
                <div>Received: RM ${sale.amountReceived.toFixed(2)}</div>
                <div>Change: RM ${sale.change.toFixed(2)}</div>
                ` : ''}
            </div>
            ${(sale.pointsEarned || sale.pointsRedeemed || sale.membershipTier) ? `
            <div class="receipt-divider">--------------------------------</div>
            <div class="receipt-membership" style="text-align: center; padding: 8px 0;">
                ${sale.membershipTier ? `<div style="font-weight: bold; color: #f59e0b;">⭐ ${sale.membershipTier} Member</div>` : ''}
                ${sale.pointsRedeemed ? `<div style="color: #10b981;">🎁 Points Redeemed: -${sale.pointsRedeemed} pts (-RM${sale.pointsDiscount?.toFixed(2) || (sale.pointsRedeemed/100).toFixed(2)})</div>` : ''}
                ${sale.pointsEarned ? `<div style="color: #2563eb;">✨ Points Earned: +${sale.pointsEarned} pts</div>` : ''}
                ${sale.totalPoints ? `<div style="font-size: 11px; color: #64748b;">Total Points: ${sale.totalPoints}</div>` : ''}
            </div>
            ` : ''}
            <div class="receipt-divider">================================</div>
            <div class="receipt-footer">
                <p>Thank you for your purchase!</p>
                <p>Terima kasih atas pembelian anda!</p>
            </div>
        </div>
    `;
    
    // Store for printing
    window.lastReceipt = sale;
    
    modal.style.display = '';
    modal.classList.add('show');
}

function printReceipt() {
    const content = document.getElementById('receiptContent');
    if (!content) return;
    
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Receipt</title>
            <style>
                body { font-family: 'Courier New', monospace; font-size: 12px; width: 280px; margin: 0 auto; }
                .receipt { padding: 10px; }
                .receipt-header { text-align: center; margin-bottom: 10px; }
                .receipt-header h2 { margin: 0; font-size: 14px; }
                .receipt-divider { text-align: center; margin: 5px 0; }
                .receipt-item { margin: 5px 0; }
                .item-details { display: flex; justify-content: space-between; padding-left: 10px; }
                .total-row { display: flex; justify-content: space-between; }
                .grand-total { font-weight: bold; font-size: 14px; margin-top: 5px; }
                .receipt-footer { text-align: center; margin-top: 10px; font-size: 10px; }
                @media print { body { width: 100%; } }
            </style>
        </head>
        <body>${content.innerHTML}</body>
        </html>
    `);
    printWindow.document.close();
    printWindow.print();
}

// ==================== EMAIL RECEIPT ====================
function emailReceipt() {
    const sale = window.lastReceipt;
    if (!sale) {
        showNotification('Error', 'No receipt to email', 'error');
        return;
    }

    // Get company settings
    const settings = JSON.parse(localStorage.getItem('companySettings') || '{}');
    const companyName = settings.businessName || 'Our Store';

    // Build items list
    const itemsList = sale.items.map((item, i) => 
        `${i + 1}. ${item.name} x ${item.quantity} @ RM${item.price.toFixed(2)} = RM${(item.quantity * item.price).toFixed(2)}`
    ).join('%0D%0A');

    // Build email subject
    const subject = encodeURIComponent(`Receipt from ${companyName} - ${sale.receiptNo}`);

    // Build email body
    const body = encodeURIComponent(
`Thank you for shopping at ${companyName}!

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
RECEIPT: ${sale.receiptNo}
Date: ${sale.date} ${sale.time}
Cashier: ${sale.cashier}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

ITEMS:
${itemsList}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Subtotal: RM ${sale.subtotal.toFixed(2)}
${sale.discount > 0 ? `Discount: - RM ${sale.discount.toFixed(2)}\n` : ''}Tax (6% SST): RM ${sale.tax.toFixed(2)}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TOTAL: RM ${sale.total.toFixed(2)}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Payment Method: ${sale.paymentMethod.charAt(0).toUpperCase() + sale.paymentMethod.slice(1)}
${sale.paymentMethod === 'cash' ? `Amount Received: RM ${sale.amountReceived.toFixed(2)}\nChange: RM ${sale.change.toFixed(2)}` : ''}
${(sale.pointsEarned || sale.pointsRedeemed || sale.membershipTier) ? `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
MEMBERSHIP REWARDS
${sale.membershipTier ? `⭐ ${sale.membershipTier} Member` : ''}
${sale.pointsRedeemed ? `🎁 Points Redeemed: -${sale.pointsRedeemed} pts` : ''}
${sale.pointsEarned ? `✨ Points Earned: +${sale.pointsEarned} pts` : ''}
${sale.totalPoints ? `Total Points Balance: ${sale.totalPoints}` : ''}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━` : ''}

Thank you for your purchase!
Terima kasih atas pembelian anda!

${companyName}
`);

    // Open mailto link
    const mailtoLink = `mailto:?subject=${subject}&body=${body}`;
    window.location.href = mailtoLink;

    showNotification('Email Opened', 'Your email app should open with the receipt details. Add the customer email and send.', 'success');
}

// ==================== SALES HISTORY ====================
function loadSales() {
    const stored = localStorage.getItem(SALES_KEY);
    if (stored) {
        sales = JSON.parse(stored);
    }
}

// ==================== BRANCH HELPER ====================
function getBranchNameById(branchId) {
    if (!branchId || branchId === 'all') return 'All Branches';
    
    // Try branches array first
    if (typeof branches !== 'undefined' && branches.length > 0) {
        const branch = branches.find(b => b.id === branchId);
        if (branch) return branch.name;
    }
    
    // Fall back to outlets
    if (typeof outlets !== 'undefined' && outlets.length > 0) {
        const outlet = outlets.find(o => o.id === branchId);
        if (outlet) return outlet.name;
    }
    
    return 'Unknown Branch';
}

// ==================== POS BRANCH/OUTLET SELECTOR ====================
function loadPOSBranchSelector() {
    const posOutletFilter = document.getElementById('posOutletFilter');
    if (!posOutletFilter) return;
    
    // Get branches from window or local scope - ensure it's an array
    let branchList = window.branches || (typeof branches !== 'undefined' ? branches : []);
    if (!Array.isArray(branchList)) branchList = [];
    let activeBranches = branchList.filter(b => b && b.status === 'active');
    
    // Always ensure at least HQ exists for single-branch plans
    if (activeBranches.length === 0) {
        activeBranches = [{
            id: 'hq',
            name: 'Headquarters (HQ)',
            code: 'HQ',
            type: 'hq',
            status: 'active'
        }];
    }
    
    // Check if user's plan allows multi-branch
    let canUseMultiBranch = false;
    const currentUser = typeof getCurrentUser === 'function' ? getCurrentUser() : window.currentUser;
    const settings = typeof getPlatformSettings === 'function' ? getPlatformSettings() : null;
    
    // Founder and ERP Assistant always have unlimited branch access
    if (currentUser && (currentUser.role === 'founder' || currentUser.role === 'erp_assistant')) {
        canUseMultiBranch = true;
    } else if (currentUser && settings && settings.plans) {
        const userPlan = currentUser.plan || 'starter';
        const planData = settings.plans[userPlan];
        if (planData && planData.limits) {
            const branchLimit = planData.limits.branches;
            canUseMultiBranch = branchLimit === -1 || branchLimit > 1;
        }
    }
    
    // ========== BRANCH ACCESS RESTRICTION ==========
    // Filter branches by user's allowedBranches (for staff/manager roles)
    if (currentUser && currentUser.allowedBranches && Array.isArray(currentUser.allowedBranches)) {
        // Only Admin/Founder/ERP Assistant bypass branch restrictions
        const bypassRoles = ['founder', 'admin', 'erp_assistant'];
        if (!bypassRoles.includes(currentUser.role)) {
            activeBranches = activeBranches.filter(b => currentUser.allowedBranches.includes(b.id));
            
            // If no branches left after filtering, show at least the first allowed branch
            if (activeBranches.length === 0 && currentUser.allowedBranches.length > 0) {
                const firstAllowedId = currentUser.allowedBranches[0];
                const fallbackBranch = branchList.find(b => b.id === firstAllowedId);
                if (fallbackBranch) {
                    activeBranches = [fallbackBranch];
                }
            }
        }
    }
    // ===============================================
    
    // Hide outlet filter if plan doesn't support multi-branch or only 1 branch
    const posOutletContainer = posOutletFilter.closest('.pos-outlet-filter');
    const shouldHideSelector = !canUseMultiBranch || activeBranches.length <= 1;
    
    if (posOutletContainer) {
        posOutletContainer.style.display = shouldHideSelector ? 'none' : '';
    }
    
    // For single-branch/Starter plan: auto-select the only branch
    if (shouldHideSelector && activeBranches.length > 0) {
        posOutletFilter.innerHTML = `<option value="${activeBranches[0].id}">${escapeHtml(activeBranches[0].name)}</option>`;
        posOutletFilter.value = activeBranches[0].id;
        return;
    }
    
    // Populate outlet dropdown with branches for multi-branch plans
    const currentValue = posOutletFilter.value;
    posOutletFilter.innerHTML = `
        <option value="all">-- Select Outlet/Branch --</option>
        ${activeBranches.map(branch => `
            <option value="${branch.id}">${escapeHtml(branch.name)}${branch.code ? ` (${escapeHtml(branch.code)})` : ''}</option>
        `).join('')}
    `;
    
    // Restore previous selection if valid
    if (currentValue && currentValue !== 'all' && activeBranches.find(b => b.id === currentValue)) {
        posOutletFilter.value = currentValue;
    }
}

// Function to get sales filtered by branch
function getSalesByBranch(branchId) {
    const salesList = window.sales || (typeof sales !== 'undefined' ? sales : []);
    if (!branchId || branchId === 'all') {
        return salesList;
    }
    return salesList.filter(s => s.branchId === branchId);
}

// Function to get sales summary by branch
function getSalesSummaryByBranch() {
    const salesList = window.sales || (typeof sales !== 'undefined' ? sales : []);
    const branchList = window.branches || (typeof branches !== 'undefined' ? branches : []);
    
    const summary = {};
    
    // Initialize all branches
    branchList.forEach(branch => {
        summary[branch.id] = {
            branchId: branch.id,
            branchName: branch.name,
            branchCode: branch.code,
            totalSales: 0,
            salesCount: 0,
            itemsSold: 0
        };
    });
    
    // Aggregate sales by branch
    salesList.forEach(sale => {
        const branchId = sale.branchId || 'BRANCH_HQ';
        if (!summary[branchId]) {
            summary[branchId] = {
                branchId: branchId,
                branchName: sale.branchName || 'Unknown',
                branchCode: '',
                totalSales: 0,
                salesCount: 0,
                itemsSold: 0
            };
        }
        summary[branchId].totalSales += (sale.total || 0);
        summary[branchId].salesCount += 1;
        summary[branchId].itemsSold += sale.items?.reduce((sum, item) => sum + item.quantity, 0) || 0;
    });
    
    return Object.values(summary);
}

// ==================== WINDOW EXPORTS ====================
// Export all functions used by inline onclick handlers
window.initializePOS = initializePOS;
window.addToCart = addToCart;
window.updateCartItemQuantity = updateCartItemQuantity;
window.setCartItemQuantity = setCartItemQuantity;
window.removeFromCart = removeFromCart;
window.filterPOSCategory = filterPOSCategory;
window.filterPOSProducts = filterPOSProducts;
window.filterProductsByOutlet = filterProductsByOutlet;
window.filterPOSByOutlet = filterPOSByOutlet;
window.clearCart = clearCart;
window.holdSale = holdSale;
window.showHeldSales = showHeldSales;
window.recallSale = recallSale;
window.deleteHeldSale = deleteHeldSale;
window.closeHeldModal = closeHeldModal;
window.showCheckout = showPaymentModal;
window.showPaymentModal = showPaymentModal;
window.closePosPaymentModal = closePosPaymentModal;
window.processPayment = processPayment;
// Note: selectPOSCustomer was removed - customer selection handled by posCustomer dropdown
window.showItemMemo = showItemMemo;
// Note: saveItemMemo was removed - memo is saved directly in showItemMemo via prompt()
// Note: updateAmountReceived was removed - use calculateChange() instead
// Note: applyDiscount was removed - discount is applied via cartDiscount input field
window.printReceipt = printReceipt;
window.emailReceipt = emailReceipt;
window.loadSales = loadSales;
window.loadPOSCustomers = loadPOSCustomers;
window.loadPOSBranchSelector = loadPOSBranchSelector;
window.getSalesByBranch = getSalesByBranch;
window.getSalesSummaryByBranch = getSalesSummaryByBranch;
window.searchPOSProducts = searchPOSProducts;
window.calculateChange = calculateChange;
window.fillExactAmount = fillExactAmount;
window.generateTransactionRef = generateTransactionRef;

// ==================== POS MEMBERSHIP DISPLAY ====================
function updatePOSCustomerMembership() {
    const container = document.getElementById('posMembershipInfo');
    if (!container) return;
    
    const customerId = document.getElementById('posCustomer')?.value;
    const discountInput = document.getElementById('cartDiscount');
    
    // Track previous member discount to remove it
    const previousMemberDiscount = window.posMemberDiscount || 0;
    
    // If customer changed, reset any pending redemption and member discount
    if (window.posRedeemCustomerId && window.posRedeemCustomerId !== customerId && window.posRedeemedPoints > 0) {
        // Cancel the previous redemption discount
        const discountValue = window.posRedeemedPoints / 100;
        if (discountInput) {
            const currentDiscount = parseFloat(discountInput.value) || 0;
            discountInput.value = Math.max(0, currentDiscount - discountValue).toFixed(2);
        }
        window.posRedeemedPoints = 0;
        window.posRedeemCustomerId = null;
    }
    
    // Remove previous member discount when customer changes
    if (previousMemberDiscount > 0 && discountInput) {
        const currentDiscount = parseFloat(discountInput.value) || 0;
        discountInput.value = Math.max(0, currentDiscount - previousMemberDiscount).toFixed(2);
        window.posMemberDiscount = 0;
    }
    
    if (!customerId || typeof getCustomerMembership !== 'function') {
        container.style.display = 'none';
        window.posMemberDiscount = 0;
        updateCartTotals();
        return;
    }
    
    // Reload CRM customers to get fresh data
    if (typeof loadCRMCustomers === 'function') {
        loadCRMCustomers();
    }
    
    const membership = getCustomerMembership(customerId);
    if (!membership) {
        container.style.display = 'none';
        window.posMemberDiscount = 0;
        updateCartTotals();
        return;
    }
    
    const tierInfo = membership.tierInfo;
    const nextTierText = membership.nextTier ? 
        `Spend RM${membership.spentToNextTier.toFixed(0)} more for ${membership.nextTier}` : 
        'Maximum tier reached!';
    
    // Auto-apply tier discount
    let memberDiscountAmount = 0;
    if (tierInfo.discount > 0 && currentCart.length > 0) {
        const subtotal = currentCart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        memberDiscountAmount = Math.round((subtotal * tierInfo.discount / 100) * 100) / 100; // Round to 2 decimal
        
        // Apply member discount if not already applied
        if (discountInput && window.posMemberDiscount !== memberDiscountAmount) {
            const currentDiscount = parseFloat(discountInput.value) || 0;
            // Remove old member discount, add new one
            const newDiscount = currentDiscount - (window.posMemberDiscount || 0) + memberDiscountAmount;
            discountInput.value = Math.max(0, newDiscount).toFixed(2);
            window.posMemberDiscount = memberDiscountAmount;
            updateCartTotals();
        }
    }
    
    // Check if points already redeemed in this session
    const redeemedPoints = window.posRedeemedPoints || 0;
    const availablePoints = membership.points;
    const canRedeem = availablePoints >= 100 && redeemedPoints === 0; // Min 100 pts to redeem
    
    container.innerHTML = `
        <div class="pos-membership-card">
            <div class="pos-membership-tier">
                <span class="pos-tier-badge" style="background: ${tierInfo.color};">${tierInfo.icon} ${tierInfo.label}</span>
                ${tierInfo.discount > 0 ? `<span class="pos-tier-discount">${tierInfo.discount}% member discount${memberDiscountAmount > 0 ? ` (-RM${memberDiscountAmount.toFixed(2)})` : ''}</span>` : ''}
            </div>
            <div class="pos-membership-points">
                <div class="pos-points-value">⭐ ${availablePoints.toLocaleString()} pts</div>
                <div class="pos-points-worth">Worth RM${membership.pointsValue.toFixed(2)}</div>
            </div>
            ${redeemedPoints > 0 ? `
                <div class="pos-points-redeemed">
                    <span>✅ Redeemed: ${redeemedPoints} pts = -RM${(redeemedPoints / 100).toFixed(2)}</span>
                    <button class="pos-cancel-redeem" onclick="cancelPointsRedemption()">✕</button>
                </div>
            ` : `
                <div class="pos-redeem-section">
                    ${canRedeem ? `
                        <button class="pos-redeem-btn" onclick="showRedeemPointsDialog('${customerId}', ${availablePoints})">
                            <i class="fas fa-gift"></i> Redeem Points
                        </button>
                    ` : availablePoints < 100 ? `
                        <span class="pos-redeem-hint">Need ${100 - availablePoints} more pts to redeem</span>
                    ` : ''}
                </div>
            `}
            <div class="pos-membership-progress">${nextTierText}</div>
        </div>
    `;
    container.style.display = 'block';
    
    // Check if today is customer's birthday and award bonus if not yet given
    checkAndAwardBirthdayBonus(customerId);
}

// Check if it's the customer's birthday and award bonus points if not yet given today
function checkAndAwardBirthdayBonus(customerId) {
    if (!customerId || !window.crmCustomers) return;
    
    const customer = window.crmCustomers.find(c => c.id === customerId);
    if (!customer || !customer.birthday || customer.status === 'inactive') return;
    
    const today = new Date();
    const [year, month, day] = customer.birthday.split('-').map(Number);
    
    // Check if today is birthday (ignore year)
    if (month === today.getMonth() + 1 && day === today.getDate()) {
        const todayYear = today.getFullYear();
        const birthdayCheckKey = `ezcubic_birthday_check_${todayYear}`;
        const checkedCustomers = JSON.parse(localStorage.getItem(birthdayCheckKey) || '[]');
        
        // Check if already awarded this year
        if (checkedCustomers.includes(customer.id)) {
            // Already awarded - just show notification once per session
            const sessionKey = `birthday_notified_${customerId}_${today.toDateString()}`;
            if (!sessionStorage.getItem(sessionKey)) {
                sessionStorage.setItem(sessionKey, 'true');
                showToast(`🎂 Happy Birthday ${customer.name}!`, 'info');
            }
            return;
        }
        
        // Award birthday bonus NOW
        const birthdayBonus = (window.MEMBERSHIP_CONFIG?.birthdayBonus ?? 100);
        if (birthdayBonus <= 0) return;
        
        // Initialize points if needed
        if (typeof customer.points !== 'number') customer.points = 0;
        if (!Array.isArray(customer.pointsHistory)) customer.pointsHistory = [];
        
        customer.points += birthdayBonus;
        customer.pointsHistory.push({
            type: 'earn',
            points: birthdayBonus,
            reference: `🎂 Birthday Bonus ${todayYear}`,
            date: new Date().toISOString()
        });
        
        // Mark as awarded this year
        checkedCustomers.push(customer.id);
        localStorage.setItem(birthdayCheckKey, JSON.stringify(checkedCustomers));
        
        // Save customer data
        if (typeof saveCRMCustomers === 'function') {
            saveCRMCustomers();
        }
        
        console.log(`🎂 Birthday bonus awarded to ${customer.name}: +${birthdayBonus} pts`);
        showToast(`🎂 Happy Birthday ${customer.name}! +${birthdayBonus} bonus points awarded!`, 'success');
        
        // Refresh the membership display to show updated points
        setTimeout(() => {
            updatePOSCustomerMembership();
        }, 500);
    }
}
window.updatePOSCustomerMembership = updatePOSCustomerMembership;

// Track member discount applied
window.posMemberDiscount = 0;

// Points redemption state
window.posRedeemedPoints = 0;
window.posRedeemCustomerId = null;

// Close redeem points modal
function closeRedeemPointsModal() {
    const modal = document.getElementById('redeemPointsModal');
    if (modal) {
        modal.classList.remove('show');
        setTimeout(() => modal.remove(), 200);
    }
}
window.closeRedeemPointsModal = closeRedeemPointsModal;

// Show redeem points dialog
function showRedeemPointsDialog(customerId, availablePoints) {
    const maxRedeem = Math.min(availablePoints, 10000); // Cap at 10000 pts (RM100)
    const maxValue = (maxRedeem / 100).toFixed(2);
    
    const modal = document.createElement('div');
    modal.className = 'modal show';
    modal.id = 'redeemPointsModal';
    modal.dataset.dynamic = 'true';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 400px;">
            <div class="modal-header">
                <h3>🎁 Redeem Points</h3>
                <button class="modal-close" onclick="closeRedeemPointsModal()">✕</button>
            </div>
            <div class="modal-body" style="padding: 20px;">
                <div style="text-align: center; margin-bottom: 20px;">
                    <div style="font-size: 24px; color: #f59e0b;">⭐ ${availablePoints.toLocaleString()}</div>
                    <div style="color: #64748b;">Available Points</div>
                </div>
                <div class="form-group">
                    <label>Points to Redeem</label>
                    <input type="number" id="redeemPointsAmount" class="form-control" 
                           value="${Math.min(availablePoints, 500)}" min="100" max="${maxRedeem}" step="100"
                           oninput="updateRedeemPreview()">
                    <small style="color: #64748b;">Min: 100 pts | Max: ${maxRedeem.toLocaleString()} pts</small>
                </div>
                <div style="background: #d1fae5; padding: 15px; border-radius: 8px; text-align: center; margin-top: 15px;">
                    <div style="font-size: 12px; color: #047857;">Discount Value</div>
                    <div id="redeemPreviewValue" style="font-size: 24px; font-weight: 700; color: #10b981;">
                        -RM ${(Math.min(availablePoints, 500) / 100).toFixed(2)}
                    </div>
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn-outline" onclick="closeRedeemPointsModal()">Cancel</button>
                <button class="btn-primary" onclick="applyPointsRedemption('${customerId}')">
                    <i class="fas fa-check"></i> Apply Discount
                </button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}
window.showRedeemPointsDialog = showRedeemPointsDialog;

// Update preview in redeem dialog
function updateRedeemPreview() {
    const points = parseInt(document.getElementById('redeemPointsAmount')?.value) || 0;
    const value = (points / 100).toFixed(2);
    const preview = document.getElementById('redeemPreviewValue');
    if (preview) preview.textContent = `-RM ${value}`;
}
window.updateRedeemPreview = updateRedeemPreview;

// Apply points redemption as discount
function applyPointsRedemption(customerId) {
    const pointsInput = document.getElementById('redeemPointsAmount');
    const points = parseInt(pointsInput?.value) || 0;
    
    if (points < 100) {
        showToast('Minimum 100 points required', 'error');
        return;
    }
    
    // Store redemption for this session (actual deduction happens on checkout)
    window.posRedeemedPoints = points;
    window.posRedeemCustomerId = customerId;
    
    // Apply as cart discount
    const discountValue = points / 100; // 100 pts = RM1
    const discountInput = document.getElementById('cartDiscount');
    if (discountInput) {
        const currentDiscount = parseFloat(discountInput.value) || 0;
        discountInput.value = (currentDiscount + discountValue).toFixed(2);
        updateCartTotals();
    }
    
    // Close modal and refresh membership display
    closeRedeemPointsModal();
    updatePOSCustomerMembership();
    
    showToast(`🎁 ${points} points applied as RM${discountValue.toFixed(2)} discount!`, 'success');
}
window.applyPointsRedemption = applyPointsRedemption;

// Cancel points redemption
function cancelPointsRedemption() {
    if (window.posRedeemedPoints > 0) {
        // Remove from cart discount
        const discountValue = window.posRedeemedPoints / 100;
        const discountInput = document.getElementById('cartDiscount');
        if (discountInput) {
            const currentDiscount = parseFloat(discountInput.value) || 0;
            discountInput.value = Math.max(0, currentDiscount - discountValue).toFixed(2);
            updateCartTotals();
        }
        
        showToast('Points redemption cancelled', 'info');
    }
    
    window.posRedeemedPoints = 0;
    window.posRedeemCustomerId = null;
    updatePOSCustomerMembership();
}
window.cancelPointsRedemption = cancelPointsRedemption;

// Reset redemption when cart is cleared or customer changes
function resetPointsRedemption() {
    if (window.posRedeemedPoints > 0) {
        cancelPointsRedemption();
    }
}
window.resetPointsRedemption = resetPointsRedemption;

// Restaurant mode / Table management
window.togglePOSMode = togglePOSMode;
window.selectTable = selectTable;
window.clearTableSelection = clearTableSelection;
window.showTableManagement = showTableManagement;
window.closeTableManagement = closeTableManagement;
window.quickAddTables = quickAddTables;
window.addSingleTable = addSingleTable;
window.editTable = editTable;
window.deleteTable = deleteTable;
window.clearAllTables = clearAllTables;
window.clearAllHeldSales = clearAllHeldSales; // Debug helper

// Order type functions
window.setOrderType = setOrderType;
window.setDeliveryPlatform = setDeliveryPlatform;
window.setDeliveryOrderId = setDeliveryOrderId;
window.resetOrderType = resetOrderType;
window.getOrderTypeLabel = getOrderTypeLabel;
window.getPlatformLabel = getPlatformLabel;

// Platform commission functions
window.getPlatformCommissions = getPlatformCommissions;
window.savePlatformCommissions = savePlatformCommissions;
window.loadPlatformCommissions = loadPlatformCommissions;

// Load commissions into Settings form
window.loadCommissionSettings = function() {
    const commissions = getPlatformCommissions();
    const grabInput = document.getElementById('commissionGrab');
    const foodpandaInput = document.getElementById('commissionFoodpanda');
    const shopeefoodInput = document.getElementById('commissionShopeefood');
    const ownInput = document.getElementById('commissionOwn');
    const otherInput = document.getElementById('commissionOther');
    
    if (grabInput) grabInput.value = commissions.grab || 30;
    if (foodpandaInput) foodpandaInput.value = commissions.foodpanda || 30;
    if (shopeefoodInput) shopeefoodInput.value = commissions.shopeefood || 25;
    if (ownInput) ownInput.value = commissions.own || 0;
    if (otherInput) otherInput.value = commissions.other || 0;
};

// Save commissions from Settings form
window.saveCommissionSettings = function() {
    const commissions = {
        grab: parseFloat(document.getElementById('commissionGrab')?.value) || 0,
        foodpanda: parseFloat(document.getElementById('commissionFoodpanda')?.value) || 0,
        shopeefood: parseFloat(document.getElementById('commissionShopeefood')?.value) || 0,
        own: parseFloat(document.getElementById('commissionOwn')?.value) || 0,
        other: parseFloat(document.getElementById('commissionOther')?.value) || 0
    };
    savePlatformCommissions(commissions);
    showNotification('Platform commission rates saved!', 'success');
};

// Note: POS module is initialized by app.js via initializePhase2Modules()
