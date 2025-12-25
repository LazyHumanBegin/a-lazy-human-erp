/**
 * BRANCHES-UI.JS
 * Multi-Branch Management Module - UI
 * Tabs, Inventory View, Reports
 * Version: 2.2.7 - Modular Split - 26 Dec 2025
 */

// ==================== TAB NAVIGATION ====================
function showBranchTab(tabName) {
    // Hide all tab contents
    document.querySelectorAll('.branch-tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    
    // Remove active from all tab buttons
    document.querySelectorAll('.branch-tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Show selected tab
    const tabContent = document.getElementById(`branch-${tabName}-tab`);
    if (tabContent) {
        tabContent.classList.add('active');
    }
    
    // Activate tab button
    const tabBtn = document.querySelector(`.branch-tab-btn[data-tab="${tabName}"]`);
    if (tabBtn) {
        tabBtn.classList.add('active');
    }
    
    // Load tab-specific content
    switch (tabName) {
        case 'list':
            renderBranches();
            break;
        case 'transfers':
            renderTransfers();
            break;
        case 'inventory':
            renderBranchInventory();
            break;
        case 'reports':
            renderBranchReports();
            break;
    }
}

// ==================== BRANCH INVENTORY ====================
function renderBranchInventory() {
    const container = document.getElementById('branch-inventory-content');
    if (!container) return;
    
    const activeBranches = branches.filter(b => b.status === 'active');
    const products = window.products || [];
    
    if (activeBranches.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-warehouse"></i>
                <p>No active branches</p>
            </div>
        `;
        return;
    }
    
    // Create inventory comparison table
    let html = `
        <div class="inventory-comparison">
            <div class="inventory-filters">
                <select id="inventory-branch-filter" onchange="filterBranchInventory()">
                    <option value="all">All Branches</option>
                    ${activeBranches.map(b => `
                        <option value="${b.id}">${escapeHTML(b.name)}</option>
                    `).join('')}
                </select>
                <input type="text" id="inventory-search" placeholder="Search products..." 
                       onkeyup="filterBranchInventory()">
            </div>
            
            <div class="inventory-table-wrapper">
                <table class="inventory-table">
                    <thead>
                        <tr>
                            <th>Product</th>
                            <th>SKU</th>
                            ${activeBranches.map(b => `
                                <th class="branch-col">${escapeHTML(b.code)}</th>
                            `).join('')}
                            <th>Total</th>
                        </tr>
                    </thead>
                    <tbody id="branch-inventory-tbody">
    `;
    
    products.forEach(product => {
        const branchStocks = activeBranches.map(b => getBranchStock(product.id, b.id));
        const totalStock = branchStocks.reduce((sum, qty) => sum + qty, 0);
        
        html += `
            <tr data-product-id="${product.id}">
                <td>${escapeHTML(product.name)}</td>
                <td>${escapeHTML(product.sku || product.code || '-')}</td>
                ${branchStocks.map((stock, i) => `
                    <td class="stock-cell ${stock === 0 ? 'out-of-stock' : stock < 10 ? 'low-stock' : ''}">
                        ${stock}
                    </td>
                `).join('')}
                <td class="total-col"><strong>${totalStock}</strong></td>
            </tr>
        `;
    });
    
    html += `
                    </tbody>
                </table>
            </div>
            
            <div class="inventory-summary">
                <div class="summary-card">
                    <span class="label">Total Products</span>
                    <span class="value">${products.length}</span>
                </div>
                ${activeBranches.map(b => {
                    const branchValue = getBranchInventoryValue(b.id);
                    return `
                        <div class="summary-card">
                            <span class="label">${escapeHTML(b.code)} Value</span>
                            <span class="value">${formatRM(branchValue)}</span>
                        </div>
                    `;
                }).join('')}
            </div>
        </div>
    `;
    
    container.innerHTML = html;
}

function filterBranchInventory() {
    const branchFilter = document.getElementById('inventory-branch-filter')?.value || 'all';
    const searchTerm = document.getElementById('inventory-search')?.value.toLowerCase() || '';
    
    const rows = document.querySelectorAll('#branch-inventory-tbody tr');
    
    rows.forEach(row => {
        const productName = row.querySelector('td:first-child')?.textContent.toLowerCase() || '';
        const sku = row.querySelector('td:nth-child(2)')?.textContent.toLowerCase() || '';
        
        const matchesSearch = productName.includes(searchTerm) || sku.includes(searchTerm);
        
        if (matchesSearch) {
            row.style.display = '';
        } else {
            row.style.display = 'none';
        }
    });
}

// ==================== BRANCH REPORTS ====================
function renderBranchReports() {
    const container = document.getElementById('branch-reports-content');
    if (!container) return;
    
    const activeBranches = branches.filter(b => b.status === 'active');
    
    if (activeBranches.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-chart-bar"></i>
                <p>No active branches to report</p>
            </div>
        `;
        return;
    }
    
    let html = `
        <div class="branch-reports-grid">
            <div class="report-section">
                <h3><i class="fas fa-chart-line"></i> Sales Performance</h3>
                <div class="report-cards">
                    ${activeBranches.map(branch => {
                        const salesThisMonth = getBranchSalesThisMonth(branch.id);
                        const totalSales = getBranchSalesTotal(branch.id);
                        const transactions = getBranchTransactionCount(branch.id);
                        
                        return `
                            <div class="report-card">
                                <div class="report-header">
                                    <h4>${escapeHTML(branch.name)}</h4>
                                    <span class="branch-code">${escapeHTML(branch.code)}</span>
                                </div>
                                <div class="report-metrics">
                                    <div class="metric">
                                        <span class="label">This Month</span>
                                        <span class="value">${formatRM(salesThisMonth)}</span>
                                    </div>
                                    <div class="metric">
                                        <span class="label">Total Sales</span>
                                        <span class="value">${formatRM(totalSales)}</span>
                                    </div>
                                    <div class="metric">
                                        <span class="label">Transactions</span>
                                        <span class="value">${transactions}</span>
                                    </div>
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
            
            <div class="report-section">
                <h3><i class="fas fa-boxes"></i> Inventory Value</h3>
                <div class="report-cards">
                    ${activeBranches.map(branch => {
                        const inventoryValue = getBranchInventoryValue(branch.id);
                        const products = window.products || [];
                        const productsInStock = products.filter(p => 
                            getBranchStock(p.id, branch.id) > 0
                        ).length;
                        const lowStock = products.filter(p => {
                            const stock = getBranchStock(p.id, branch.id);
                            return stock > 0 && stock < (p.reorderLevel || 10);
                        }).length;
                        
                        return `
                            <div class="report-card">
                                <div class="report-header">
                                    <h4>${escapeHTML(branch.name)}</h4>
                                </div>
                                <div class="report-metrics">
                                    <div class="metric">
                                        <span class="label">Inventory Value</span>
                                        <span class="value">${formatRM(inventoryValue)}</span>
                                    </div>
                                    <div class="metric">
                                        <span class="label">Products in Stock</span>
                                        <span class="value">${productsInStock}</span>
                                    </div>
                                    <div class="metric ${lowStock > 0 ? 'warning' : ''}">
                                        <span class="label">Low Stock Items</span>
                                        <span class="value">${lowStock}</span>
                                    </div>
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
            
            <div class="report-section">
                <h3><i class="fas fa-exchange-alt"></i> Transfer Activity</h3>
                <div class="transfer-stats">
                    <div class="stat-item">
                        <span class="stat-value">${branchTransfers.length}</span>
                        <span class="stat-label">Total Transfers</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-value">${branchTransfers.filter(t => t.status === 'pending').length}</span>
                        <span class="stat-label">Pending</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-value">${branchTransfers.filter(t => t.status === 'in-transit').length}</span>
                        <span class="stat-label">In Transit</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-value">${branchTransfers.filter(t => t.status === 'completed').length}</span>
                        <span class="stat-label">Completed</span>
                    </div>
                </div>
            </div>
        </div>
        
        <div class="report-actions">
            <button class="btn btn-primary" onclick="exportBranchReport()">
                <i class="fas fa-download"></i> Export Report
            </button>
            <button class="btn btn-outline" onclick="printBranchReport()">
                <i class="fas fa-print"></i> Print
            </button>
        </div>
    `;
    
    container.innerHTML = html;
}

// ==================== EXPORT & PRINT ====================
function exportBranchReport() {
    const activeBranches = branches.filter(b => b.status === 'active');
    
    let csvContent = 'Branch Performance Report\n\n';
    csvContent += 'Branch,Code,Sales This Month,Total Sales,Transactions,Inventory Value\n';
    
    activeBranches.forEach(branch => {
        const salesThisMonth = getBranchSalesThisMonth(branch.id);
        const totalSales = getBranchSalesTotal(branch.id);
        const transactions = getBranchTransactionCount(branch.id);
        const inventoryValue = getBranchInventoryValue(branch.id);
        
        csvContent += `"${branch.name}","${branch.code}",${salesThisMonth},${totalSales},${transactions},${inventoryValue}\n`;
    });
    
    // Download CSV
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `branch-report-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showNotification('Report exported successfully', 'success');
}

function printBranchReport() {
    const content = document.getElementById('branch-reports-content');
    if (!content) return;
    
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
        <html>
        <head>
            <title>Branch Report</title>
            <style>
                body { font-family: Arial, sans-serif; padding: 20px; }
                h1 { color: #333; }
                .report-card { border: 1px solid #ddd; padding: 15px; margin: 10px 0; }
                .metric { margin: 5px 0; }
                .label { color: #666; }
                .value { font-weight: bold; }
            </style>
        </head>
        <body>
            <h1>Branch Performance Report</h1>
            <p>Generated: ${new Date().toLocaleDateString()}</p>
            ${content.innerHTML}
        </body>
        </html>
    `);
    printWindow.document.close();
    printWindow.print();
}

// ==================== VIEW HELPERS ====================
function viewBranchInventory(branchId) {
    showBranchTab('inventory');
    
    setTimeout(() => {
        const filter = document.getElementById('inventory-branch-filter');
        if (filter) {
            filter.value = branchId;
            filterBranchInventory();
        }
    }, 100);
}

function viewBranchTransactions(branchId) {
    // Navigate to transactions with branch filter
    if (typeof showSection === 'function') {
        showSection('transactions');
    }
    
    setTimeout(() => {
        const branchFilter = document.getElementById('transaction-branch-filter');
        if (branchFilter) {
            branchFilter.value = branchId;
            if (typeof loadTransactions === 'function') {
                loadTransactions();
            }
        }
    }, 100);
}

// ==================== EXPORT TO WINDOW ====================
window.showBranchTab = showBranchTab;
window.renderBranchInventory = renderBranchInventory;
window.filterBranchInventory = filterBranchInventory;
window.renderBranchReports = renderBranchReports;
window.exportBranchReport = exportBranchReport;
window.printBranchReport = printBranchReport;
window.viewBranchInventory = viewBranchInventory;
window.viewBranchTransactions = viewBranchTransactions;
