// ============================================
// SMART CATEGORIZATION - AI-Powered Category Suggestions
// ============================================

const SmartCategorization = {
    // ============================================
    // KEYWORD PATTERNS FOR CATEGORIES
    // ============================================
    
    // Expense category patterns
    expensePatterns: {
        'Advertising': ['ads', 'advertising', 'facebook ads', 'google ads', 'instagram', 'promotion', 'marketing', 'billboard', 'banner', 'campaign', 'sponsor'],
        'Bank Charges': ['bank charge', 'bank fee', 'service charge', 'atm fee', 'transfer fee', 'withdrawal fee', 'overdraft', 'interest charge'],
        'Car & Transport': ['petrol', 'fuel', 'diesel', 'parking', 'toll', 'grab', 'uber', 'taxi', 'mrt', 'lrt', 'bus', 'train', 'car wash', 'car service', 'tyre', 'tire', 'mechanic', 'workshop'],
        'Cost of Goods Sold': ['cogs', 'cost of goods', 'raw material', 'inventory purchase', 'stock purchase', 'wholesale', 'supplier payment'],
        'Depreciation': ['depreciation', 'amortization', 'asset depreciation'],
        'Entertainment': ['entertainment', 'movie', 'cinema', 'concert', 'show', 'ticket', 'karaoke', 'club', 'bar', 'nightlife'],
        'Equipment': ['equipment', 'machinery', 'machine', 'tools', 'hardware', 'computer', 'laptop', 'printer', 'scanner', 'monitor'],
        'Insurance': ['insurance', 'coverage', 'policy premium', 'life insurance', 'health insurance', 'car insurance', 'fire insurance'],
        'Interest Expense': ['interest', 'loan interest', 'mortgage interest', 'finance charge'],
        'Legal & Professional': ['legal', 'lawyer', 'attorney', 'accountant', 'audit', 'consultant', 'professional fee', 'advisory', 'tax agent'],
        'Meals': ['meal', 'lunch', 'dinner', 'breakfast', 'food', 'restaurant', 'cafe', 'coffee', 'starbucks', 'mcdonald', 'kfc', 'pizza', 'nasi', 'makan', 'foodpanda', 'grabfood'],
        'Office Supplies': ['office', 'stationery', 'paper', 'pen', 'pencil', 'stapler', 'folder', 'envelope', 'ink', 'toner', 'cartridge'],
        'Payroll': ['salary', 'wages', 'payroll', 'bonus', 'commission', 'staff', 'employee', 'epf', 'socso', 'eis', 'pcb'],
        'Rent': ['rent', 'rental', 'lease', 'tenancy', 'sewa'],
        'Repairs & Maintenance': ['repair', 'maintenance', 'fix', 'service', 'plumber', 'electrician', 'aircon', 'aircond', 'cleaning'],
        'Software & Subscriptions': ['software', 'subscription', 'saas', 'license', 'netflix', 'spotify', 'microsoft', 'adobe', 'canva', 'zoom', 'cloud', 'hosting', 'domain'],
        'Taxes': ['tax', 'cukai', 'gst', 'sst', 'income tax', 'corporate tax', 'stamp duty', 'assessment', 'quit rent'],
        'Telephone & Internet': ['phone', 'telephone', 'mobile', 'celcom', 'maxis', 'digi', 'unifi', 'time', 'internet', 'broadband', 'wifi', 'data plan'],
        'Travel': ['travel', 'flight', 'airfare', 'hotel', 'accommodation', 'airbnb', 'booking', 'trip', 'business trip'],
        'Utilities': ['utility', 'utilities', 'electric', 'electricity', 'water', 'tnb', 'tenaga', 'syabas', 'gas', 'sewage', 'indah water'],
        'Other Expenses': [] // Fallback
    },

    // Income category patterns
    incomePatterns: {
        'Sales Revenue': ['sale', 'sales', 'sold', 'revenue', 'invoice', 'order', 'customer payment', 'product sale'],
        'Service Revenue': ['service', 'consultation', 'consulting', 'fee', 'professional service', 'advisory'],
        'Commission Income': ['commission', 'referral', 'affiliate', 'kickback'],
        'Interest Income': ['interest received', 'interest income', 'bank interest', 'fd interest', 'fixed deposit'],
        'Rental Income': ['rental income', 'rent received', 'tenant', 'lease income'],
        'Other Income': ['refund', 'rebate', 'cashback', 'dividend', 'grant', 'subsidy']
    },

    // ============================================
    // LEARNING FROM USER HISTORY
    // ============================================
    
    // Get user's historical categorization patterns
    getUserPatterns() {
        try {
            const stored = localStorage.getItem('ezcubic_category_patterns');
            return stored ? JSON.parse(stored) : {};
        } catch (e) {
            return {};
        }
    },

    // Save learned pattern
    learnPattern(description, category) {
        try {
            const patterns = this.getUserPatterns();
            const keywords = this.extractKeywords(description);
            
            keywords.forEach(keyword => {
                if (!patterns[keyword]) {
                    patterns[keyword] = {};
                }
                patterns[keyword][category] = (patterns[keyword][category] || 0) + 1;
            });
            
            localStorage.setItem('ezcubic_category_patterns', JSON.stringify(patterns));
            console.log('📚 Learned category pattern:', description, '→', category);
        } catch (e) {
            console.error('Error saving category pattern:', e);
        }
    },

    // Extract keywords from description
    extractKeywords(description) {
        if (!description) return [];
        
        return description
            .toLowerCase()
            .replace(/[^\w\s]/g, ' ')
            .split(/\s+/)
            .filter(word => word.length >= 3)
            .filter(word => !['the', 'and', 'for', 'from', 'with', 'payment', 'paid'].includes(word));
    },

    // ============================================
    // CATEGORY SUGGESTION ENGINE
    // ============================================
    
    /**
     * Get category suggestions for a description
     * @param {string} description - Transaction description
     * @param {string} type - 'expense' or 'income'
     * @returns {Array} Array of {category, confidence, reason}
     */
    suggest(description, type = 'expense') {
        if (!description || description.length < 2) {
            return [];
        }

        const descLower = description.toLowerCase();
        const keywords = this.extractKeywords(description);
        const suggestions = [];
        const patterns = type === 'expense' ? this.expensePatterns : this.incomePatterns;
        
        // Check user's learned patterns first (highest priority)
        const userPatterns = this.getUserPatterns();
        const userScores = {};
        
        keywords.forEach(keyword => {
            if (userPatterns[keyword]) {
                Object.entries(userPatterns[keyword]).forEach(([category, count]) => {
                    userScores[category] = (userScores[category] || 0) + count;
                });
            }
        });
        
        // Add user-learned suggestions
        Object.entries(userScores)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 2)
            .forEach(([category, score]) => {
                suggestions.push({
                    category,
                    confidence: Math.min(0.95, 0.5 + (score * 0.1)),
                    reason: 'Based on your past transactions',
                    source: 'learned'
                });
            });

        // Check built-in patterns
        Object.entries(patterns).forEach(([category, categoryKeywords]) => {
            let matchCount = 0;
            let matchedWords = [];
            
            categoryKeywords.forEach(keyword => {
                if (descLower.includes(keyword.toLowerCase())) {
                    matchCount++;
                    matchedWords.push(keyword);
                }
            });
            
            if (matchCount > 0) {
                // Don't add if already suggested from user patterns
                if (!suggestions.find(s => s.category === category)) {
                    const confidence = Math.min(0.9, 0.3 + (matchCount * 0.2));
                    suggestions.push({
                        category,
                        confidence,
                        reason: `Matches: ${matchedWords.slice(0, 3).join(', ')}`,
                        source: 'pattern'
                    });
                }
            }
        });

        // Sort by confidence
        suggestions.sort((a, b) => b.confidence - a.confidence);
        
        // Return top 3 suggestions
        return suggestions.slice(0, 3);
    },

    /**
     * Get the best category suggestion
     * @returns {string|null} Best category or null
     */
    getBestSuggestion(description, type = 'expense') {
        const suggestions = this.suggest(description, type);
        return suggestions.length > 0 ? suggestions[0].category : null;
    },

    // ============================================
    // UI INTEGRATION
    // ============================================
    
    /**
     * Show suggestion dropdown near input field
     */
    showSuggestions(inputElement, suggestions, onSelect) {
        // Remove existing dropdown
        this.hideSuggestions();
        
        if (!suggestions || suggestions.length === 0) return;

        const dropdown = document.createElement('div');
        dropdown.id = 'categorySuggestionDropdown';
        dropdown.className = 'category-suggestion-dropdown';
        
        dropdown.innerHTML = `
            <div class="suggestion-header">
                <i class="fas fa-magic"></i> AI Suggestions
            </div>
            ${suggestions.map((s, i) => `
                <div class="suggestion-item ${i === 0 ? 'recommended' : ''}" data-category="${s.category}">
                    <div class="suggestion-category">
                        ${i === 0 ? '<span class="suggestion-badge">Best Match</span>' : ''}
                        ${s.category}
                    </div>
                    <div class="suggestion-reason">${s.reason}</div>
                    <div class="suggestion-confidence">
                        <div class="confidence-bar" style="width: ${s.confidence * 100}%"></div>
                    </div>
                </div>
            `).join('')}
        `;

        // Position dropdown below input
        const rect = inputElement.getBoundingClientRect();
        dropdown.style.position = 'fixed';
        dropdown.style.top = (rect.bottom + 4) + 'px';
        dropdown.style.left = rect.left + 'px';
        dropdown.style.width = Math.max(rect.width, 280) + 'px';
        dropdown.style.zIndex = '10001';

        document.body.appendChild(dropdown);

        // Handle clicks
        dropdown.querySelectorAll('.suggestion-item').forEach(item => {
            item.addEventListener('click', () => {
                const category = item.dataset.category;
                if (onSelect) onSelect(category);
                this.hideSuggestions();
            });
        });

        // Close on outside click
        setTimeout(() => {
            document.addEventListener('click', this.outsideClickHandler);
        }, 100);
    },

    outsideClickHandler(e) {
        const dropdown = document.getElementById('categorySuggestionDropdown');
        if (dropdown && !dropdown.contains(e.target)) {
            SmartCategorization.hideSuggestions();
        }
    },

    hideSuggestions() {
        const dropdown = document.getElementById('categorySuggestionDropdown');
        if (dropdown) {
            dropdown.remove();
        }
        document.removeEventListener('click', this.outsideClickHandler);
    },

    // ============================================
    // AUTO-ATTACH TO FORMS
    // ============================================
    
    /**
     * Attach smart categorization to a description input
     */
    attachToInput(descriptionInputId, categorySelectId, type = 'expense') {
        const descInput = document.getElementById(descriptionInputId);
        const categorySelect = document.getElementById(categorySelectId);
        
        if (!descInput || !categorySelect) {
            console.log('SmartCategorization: Inputs not found', descriptionInputId, categorySelectId);
            return;
        }

        let debounceTimer;
        
        descInput.addEventListener('input', (e) => {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
                const description = e.target.value;
                if (description.length >= 3) {
                    const suggestions = this.suggest(description, type);
                    if (suggestions.length > 0) {
                        this.showSuggestions(categorySelect, suggestions, (category) => {
                            // Set the category
                            categorySelect.value = category;
                            // Trigger change event
                            categorySelect.dispatchEvent(new Event('change'));
                            // Learn from selection
                            this.learnPattern(description, category);
                        });
                    }
                } else {
                    this.hideSuggestions();
                }
            }, 300);
        });

        // Learn when user manually selects category
        categorySelect.addEventListener('change', () => {
            const description = descInput.value;
            const category = categorySelect.value;
            if (description && category) {
                this.learnPattern(description, category);
            }
        });

        console.log('✅ SmartCategorization attached to:', descriptionInputId);
    },

    // ============================================
    // INITIALIZATION
    // ============================================
    
    init() {
        console.log('🧠 Initializing Smart Categorization...');
        
        // Auto-attach to common transaction forms when they become visible
        this.observeForms();
        
        console.log('✅ Smart Categorization ready');
    },

    observeForms() {
        // Use MutationObserver to detect when modals are opened
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
                    const target = mutation.target;
                    
                    // Check if a modal just became visible
                    if (target.classList?.contains('modal') && 
                        target.style.display !== 'none' && 
                        !target.dataset.categorySuggestionAttached) {
                        
                        // Try to attach to common input patterns
                        setTimeout(() => this.attachToVisibleForms(target), 100);
                        target.dataset.categorySuggestionAttached = 'true';
                    }
                }
            });
        });

        // Observe all modals
        document.querySelectorAll('.modal').forEach(modal => {
            observer.observe(modal, { attributes: true });
        });

        // Also attach to main form if visible
        this.attachToMainForms();
    },

    attachToMainForms() {
        // Income form
        this.attachToInput('incomeDescription', 'incomeCategory', 'income');
        
        // Expense form
        this.attachToInput('expenseDescription', 'expenseCategory', 'expense');
        
        // Edit Transaction form
        this.attachToInput('editTransactionDescription', 'editTransactionCategory', 'expense');
        
        // Bill form
        this.attachToInput('billDescription', 'billCategory', 'expense');
        this.attachToInput('newBillDescription', 'newBillCategory', 'expense');
    },

    attachToVisibleForms(container) {
        // Find description and category inputs in the container
        const descInputs = container.querySelectorAll('input[name*="description"], input[id*="description"], input[id*="Description"]');
        const categorySelects = container.querySelectorAll('select[name*="category"], select[id*="category"], select[id*="Category"]');
        
        descInputs.forEach((descInput, i) => {
            const categorySelect = categorySelects[i] || categorySelects[0];
            if (descInput && categorySelect && descInput.id && categorySelect.id) {
                this.attachToInput(descInput.id, categorySelect.id, 'expense');
            }
        });
    }
};

// Initialize on DOM ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => SmartCategorization.init());
} else {
    SmartCategorization.init();
}

// Export to window
window.SmartCategorization = SmartCategorization;
