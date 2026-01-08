// ============================================
// SMART SEARCH - Global Search Across All Modules
// ============================================

const SmartSearch = {
    // Search configuration
    config: {
        maxResults: 50,
        fuzzyThreshold: 0.6, // Lower = more strict (0-1)
        minQueryLength: 2
    },

    // Data sources to search
    dataSources: [
        {
            name: 'CRM Customers',
            icon: 'fa-user-tie',
            color: '#3b82f6',
            getItems: () => window.crmCustomers || JSON.parse(localStorage.getItem('ezcubic_crm_customers') || '[]'),
            searchFields: ['name', 'email', 'phone', 'company', 'contactPerson'],
            displayFields: (item) => ({
                title: item.name,
                subtitle: `${item.company || item.contactPerson || item.email || item.phone} | ${item.status || 'Active'}`,
                badge: item.totalSpent ? `RM ${item.totalSpent.toLocaleString()}` : 'New',
                action: () => SmartSearch.navigateTo('crm', item.id)
            })
        },
        {
            name: 'Customers',
            icon: 'fa-user',
            color: '#06b6d4',
            getItems: () => window.customers || JSON.parse(localStorage.getItem('ezcubic_customers') || '[]'),
            searchFields: ['name', 'email', 'phone', 'company'],
            displayFields: (item) => ({
                title: item.name,
                subtitle: item.company || item.email || item.phone,
                badge: `RM ${(item.totalPurchases || 0).toLocaleString()}`,
                action: () => SmartSearch.navigateTo('customers', item.id)
            })
        },
        {
            name: 'Products',
            icon: 'fa-box',
            color: '#10b981',
            getItems: () => window.products || JSON.parse(localStorage.getItem('ezcubic_products') || '[]'),
            searchFields: ['name', 'sku', 'barcode', 'category'],
            displayFields: (item) => ({
                title: item.name,
                subtitle: `SKU: ${item.sku || 'N/A'} | Stock: ${item.stock || 0}`,
                badge: `RM ${(item.price || 0).toFixed(2)}`,
                action: () => SmartSearch.navigateTo('inventory', item.id)
            })
        },
        {
            name: 'Invoices',
            icon: 'fa-file-invoice',
            color: '#f59e0b',
            getItems: () => window.invoices || JSON.parse(localStorage.getItem('ezcubic_invoices') || '[]'),
            searchFields: ['invoiceNo', 'customerName', 'id'],
            displayFields: (item) => ({
                title: item.invoiceNo || item.id,
                subtitle: `Customer: ${item.customerName || 'N/A'} | ${new Date(item.date).toLocaleDateString()}`,
                badge: `RM ${(item.total || 0).toLocaleString()}`,
                action: () => SmartSearch.navigateTo('orders', item.id)
            })
        },
        {
            name: 'Transactions',
            icon: 'fa-exchange-alt',
            color: '#8b5cf6',
            getItems: () => window.businessData?.transactions || JSON.parse(localStorage.getItem('ezcubicDataMY') || '{}').transactions || [],
            searchFields: ['description', 'category', 'payee', 'reference'],
            displayFields: (item) => ({
                title: item.description,
                subtitle: `${item.category} | ${new Date(item.date).toLocaleDateString()}`,
                badge: `${item.type === 'income' ? '+' : '-'}RM ${Math.abs(item.amount).toLocaleString()}`,
                badgeColor: item.type === 'income' ? '#10b981' : '#ef4444',
                action: () => SmartSearch.navigateTo('transactions', item.id)
            })
        },
        {
            name: 'Orders',
            icon: 'fa-shopping-cart',
            color: '#ec4899',
            getItems: () => window.orders || JSON.parse(localStorage.getItem('ezcubic_orders') || '[]'),
            searchFields: ['orderNumber', 'customerName', 'id'],
            displayFields: (item) => ({
                title: item.orderNumber || item.id,
                subtitle: `Customer: ${item.customerName || 'N/A'} | ${item.orderType || 'Order'}`,
                badge: `RM ${(item.total || 0).toLocaleString()}`,
                action: () => SmartSearch.navigateTo('pos', item.id)
            })
        },
        {
            name: 'Projects',
            icon: 'fa-project-diagram',
            color: '#06b6d4',
            getItems: () => window.projects || JSON.parse(localStorage.getItem('ezcubic_projects') || '[]'),
            searchFields: ['name', 'description', 'clientName'],
            displayFields: (item) => ({
                title: item.name,
                subtitle: `Client: ${item.clientName || 'N/A'} | ${item.status || 'Active'}`,
                badge: `RM ${(item.budget || 0).toLocaleString()}`,
                action: () => SmartSearch.navigateTo('projects', item.id)
            })
        },
        {
            name: 'Employees',
            icon: 'fa-user-tie',
            color: '#6366f1',
            getItems: () => window.employees || JSON.parse(localStorage.getItem('ezcubic_employees') || '[]'),
            searchFields: ['name', 'email', 'employeeId', 'position'],
            displayFields: (item) => ({
                title: item.name,
                subtitle: `${item.position || 'N/A'} | ID: ${item.employeeId || 'N/A'}`,
                badge: item.status || 'Active',
                action: () => SmartSearch.navigateTo('hr', item.id)
            })
        },
        {
            name: 'Suppliers',
            icon: 'fa-truck',
            color: '#14b8a6',
            getItems: () => window.suppliers || JSON.parse(localStorage.getItem('ezcubic_suppliers') || '[]'),
            searchFields: ['name', 'email', 'phone', 'company'],
            displayFields: (item) => ({
                title: item.name,
                subtitle: item.company || item.email || item.phone,
                badge: `RM ${(item.totalPurchases || 0).toLocaleString()}`,
                action: () => SmartSearch.navigateTo('suppliers', item.id)
            })
        },
        {
            name: 'Quotations',
            icon: 'fa-file-alt',
            color: '#f97316',
            getItems: () => window.quotations || JSON.parse(localStorage.getItem('ezcubic_quotations') || '[]'),
            searchFields: ['quotationNo', 'customerName', 'id'],
            displayFields: (item) => ({
                title: item.quotationNo || item.id,
                subtitle: `Customer: ${item.customerName || 'N/A'} | ${item.status || 'Pending'}`,
                badge: `RM ${(item.total || 0).toLocaleString()}`,
                action: () => SmartSearch.navigateTo('quotations', item.id)
            })
        }
    ],

    // ============================================
    // FUZZY SEARCH ALGORITHM
    // ============================================
    
    /**
     * Calculate similarity between two strings (Levenshtein distance)
     * Returns 0-1, where 1 is exact match
     */
    similarity(str1, str2) {
        if (!str1 || !str2) return 0;
        
        str1 = str1.toLowerCase().trim();
        str2 = str2.toLowerCase().trim();
        
        // Exact match
        if (str1 === str2) return 1;
        
        // Contains match (high score)
        if (str1.includes(str2) || str2.includes(str1)) return 0.85;
        
        // Levenshtein distance
        const len1 = str1.length;
        const len2 = str2.length;
        const matrix = [];

        for (let i = 0; i <= len2; i++) {
            matrix[i] = [i];
        }
        for (let j = 0; j <= len1; j++) {
            matrix[0][j] = j;
        }

        for (let i = 1; i <= len2; i++) {
            for (let j = 1; j <= len1; j++) {
                if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
                    matrix[i][j] = matrix[i - 1][j - 1];
                } else {
                    matrix[i][j] = Math.min(
                        matrix[i - 1][j - 1] + 1,
                        matrix[i][j - 1] + 1,
                        matrix[i - 1][j] + 1
                    );
                }
            }
        }

        const distance = matrix[len2][len1];
        const maxLen = Math.max(len1, len2);
        return 1 - distance / maxLen;
    },

    // ============================================
    // SEARCH FUNCTION
    // ============================================
    
    /**
     * Perform search across all data sources
     */
    search(query) {
        if (!query || query.length < this.config.minQueryLength) {
            return [];
        }

        const results = [];
        const queryLower = query.toLowerCase().trim();

        // Search each data source
        for (const source of this.dataSources) {
            try {
                const items = source.getItems();
                if (!Array.isArray(items)) continue;

                for (const item of items) {
                    let bestScore = 0;
                    let matchedField = '';

                    // Check each searchable field
                    for (const field of source.searchFields) {
                        const value = String(item[field] || '');
                        const score = this.similarity(value, queryLower);

                        if (score > bestScore) {
                            bestScore = score;
                            matchedField = field;
                        }
                    }

                    // If score exceeds threshold, add to results
                    if (bestScore >= this.config.fuzzyThreshold) {
                        const display = source.displayFields(item);
                        results.push({
                            source: source.name,
                            icon: source.icon,
                            color: source.color,
                            score: bestScore,
                            matchedField: matchedField,
                            ...display,
                            item: item
                        });
                    }
                }
            } catch (error) {
                console.error(`Search error in ${source.name}:`, error);
            }
        }

        // Sort by score (best matches first)
        results.sort((a, b) => b.score - a.score);

        // Limit results
        return results.slice(0, this.config.maxResults);
    },

    // ============================================
    // NAVIGATION
    // ============================================
    
    /**
     * Navigate to the relevant page/section
     */
    navigateTo(module, itemId) {
        console.log(`Navigating to ${module} item:`, itemId);
        
        // Close search modal
        this.closeSearchModal();

        // Navigate to module
        switch (module) {
            case 'customers':
                if (typeof switchSection === 'function') {
                    switchSection('crm');
                    // TODO: Highlight or open customer detail
                }
                break;
            case 'inventory':
            case 'products':
                if (typeof switchSection === 'function') {
                    switchSection('inventory');
                }
                break;
            case 'orders':
            case 'invoices':
                if (typeof switchSection === 'function') {
                    switchSection('orders');
                }
                break;
            case 'transactions':
                if (typeof switchSection === 'function') {
                    switchSection('transactions');
                }
                break;
            case 'pos':
                if (typeof switchSection === 'function') {
                    switchSection('pos');
                }
                break;
            case 'projects':
                if (typeof switchSection === 'function') {
                    switchSection('projects');
                }
                break;
            case 'hr':
                if (typeof switchSection === 'function') {
                    switchSection('hr');
                }
                break;
            case 'quotations':
                if (typeof switchSection === 'function') {
                    switchSection('quotations');
                }
                break;
            case 'suppliers':
                if (typeof switchSection === 'function') {
                    switchSection('inventory');
                    // Could open suppliers tab if exists
                }
                break;
            default:
                console.warn('Unknown module:', module);
        }
    },

    // ============================================
    // UI FUNCTIONS
    // ============================================
    
    /**
     * Open search modal
     */
    openSearchModal() {
        const modal = document.getElementById('smartSearchModal');
        if (modal) {
            modal.style.display = 'flex';
            const input = document.getElementById('smartSearchInput');
            if (input) {
                input.focus();
                input.select();
            }
        }
    },

    /**
     * Close search modal
     */
    closeSearchModal() {
        const modal = document.getElementById('smartSearchModal');
        if (modal) {
            modal.style.display = 'none';
            const input = document.getElementById('smartSearchInput');
            if (input) {
                input.value = '';
            }
            this.renderResults([]);
        }
    },

    /**
     * Render search results
     */
    renderResults(results) {
        const container = document.getElementById('smartSearchResults');
        if (!container) return;

        if (results.length === 0) {
            container.innerHTML = `
                <div class="search-empty">
                    <i class="fas fa-search" style="font-size: 48px; color: #cbd5e1; margin-bottom: 16px;"></i>
                    <p style="color: #64748b;">No results found</p>
                </div>
            `;
            return;
        }

        const html = results.map(result => `
            <div class="search-result-item" onclick="SmartSearch.handleResultClick('${result.source}', ${JSON.stringify(result.item.id || result.item._id || '').replace(/'/g, "\\'")}')">
                <div class="search-result-icon" style="background: ${result.color}15; color: ${result.color};">
                    <i class="fas ${result.icon}"></i>
                </div>
                <div class="search-result-content">
                    <div class="search-result-title">${this.highlightMatch(result.title)}</div>
                    <div class="search-result-subtitle">${result.subtitle}</div>
                    <div class="search-result-source">${result.source}</div>
                </div>
                <div class="search-result-badge" style="background: ${result.badgeColor || result.color}15; color: ${result.badgeColor || result.color};">
                    ${result.badge}
                </div>
            </div>
        `).join('');

        container.innerHTML = html;
    },

    /**
     * Highlight matched text
     */
    highlightMatch(text) {
        // TODO: Highlight the matching part of the text
        return text;
    },

    /**
     * Handle result click
     */
    handleResultClick(source, itemId) {
        // Find the result and call its action
        const results = this.lastResults || [];
        const result = results.find(r => r.source === source && (r.item.id === itemId || r.item._id === itemId));
        if (result && result.action) {
            result.action();
        }
    },

    /**
     * Handle search input
     */
    handleInput(event) {
        const query = event.target.value;
        const results = this.search(query);
        this.lastResults = results;
        this.renderResults(results);
    },

    // ============================================
    // INITIALIZATION
    // ============================================
    
    /**
     * Initialize Smart Search
     */
    init() {
        console.log('🔍 Initializing Smart Search...');

        // Setup keyboard shortcut (Cmd+K or Ctrl+K)
        document.addEventListener('keydown', (e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                this.openSearchModal();
            }
            
            // ESC to close
            if (e.key === 'Escape') {
                this.closeSearchModal();
            }
        });

        // Setup search input handler
        const input = document.getElementById('smartSearchInput');
        if (input) {
            input.addEventListener('input', (e) => this.handleInput(e));
        }

        // Click outside to close
        const modal = document.getElementById('smartSearchModal');
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.closeSearchModal();
                }
            });
        }

        console.log('✅ Smart Search initialized');
    }
};

// Initialize on DOM ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => SmartSearch.init());
} else {
    SmartSearch.init();
}

// Export to window
window.SmartSearch = SmartSearch;
