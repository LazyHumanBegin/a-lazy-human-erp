/**
 * EZCubic CRM Module
 * Customer Relationship Management
 */

// ==================== CRM DATA ====================
const CRM_CUSTOMERS_KEY = 'ezcubic_crm_customers';
let crmCustomers = [];
let crmViewMode = localStorage.getItem('ezcubic_crm_view') || 'card'; // 'card', 'table', 'compact'

// ==================== MEMBERSHIP CONFIGURATION ====================
const MEMBERSHIP_CONFIG = {
    // Points earning: RM1 spent = 1 point
    pointsPerRM: 1,
    // Redemption: 100 points = RM1 discount
    pointsToRM: 100,
    // Birthday bonus points (awarded once per year)
    birthdayBonus: 100,
    // Tier thresholds (based on totalSpent)
    tiers: {
        'regular': { min: 0, label: 'Regular', color: '#64748b', discount: 0, icon: '👤' },
        'silver': { min: 500, label: 'Silver', color: '#94a3b8', discount: 3, icon: '🥈' },
        'gold': { min: 2000, label: 'Gold', color: '#f59e0b', discount: 5, icon: '🥇' },
        'vip': { min: 5000, label: 'VIP', color: '#7c3aed', discount: 10, icon: '💎' }
    }
};

// Expose MEMBERSHIP_CONFIG globally for POS
window.MEMBERSHIP_CONFIG = MEMBERSHIP_CONFIG;

// ==================== CRM INITIALIZATION ====================
function initializeCRM() {
    loadCRMCustomers();
    migrateCustomersToMembership(); // Add membership fields to existing customers
    initCRMViewMode();
    renderCRMCustomers();
    updateCRMStats();
    
    // Check for customer birthdays (delay slightly to ensure all data loaded)
    setTimeout(() => {
        checkBirthdayRewards();
    }, 1000);
}

// ==================== CRM DATA MANAGEMENT ====================
function loadCRMCustomers() {
    // PRIORITY 1: Load from tenant storage directly (most reliable)
    const user = window.currentUser;
    if (user && user.tenantId) {
        const tenantKey = 'ezcubic_tenant_' + user.tenantId;
        const tenantData = JSON.parse(localStorage.getItem(tenantKey) || '{}');
        if (Array.isArray(tenantData.crmCustomers) && tenantData.crmCustomers.length > 0) {
            crmCustomers = tenantData.crmCustomers;
            window.crmCustomers = crmCustomers;
            console.log('✅ CRM loaded from tenant:', crmCustomers.length, 'customers');
            return;
        }
    }
    
    // PRIORITY 2: Check window.crmCustomers (set by tenant data loading)
    if (Array.isArray(window.crmCustomers) && window.crmCustomers.length > 0) {
        crmCustomers = window.crmCustomers;
        console.log('✅ CRM loaded from window:', crmCustomers.length, 'customers');
    } else {
        // PRIORITY 3: Fall back to localStorage key
        const stored = localStorage.getItem(CRM_CUSTOMERS_KEY);
        if (stored) {
            try {
                const parsed = JSON.parse(stored);
                if (Array.isArray(parsed)) {
                    crmCustomers = parsed;
                    console.log('✅ CRM loaded from localStorage key:', crmCustomers.length, 'customers');
                }
            } catch (e) {
                console.error('Error parsing CRM customers from localStorage:', e);
                crmCustomers = [];
            }
        }
    }
    // Sync back to window for other modules
    window.crmCustomers = crmCustomers;
}

function saveCRMCustomers() {
    // Save to localStorage
    localStorage.setItem(CRM_CUSTOMERS_KEY, JSON.stringify(crmCustomers));
    
    // Sync to window for other modules
    window.crmCustomers = crmCustomers;
    
    // Update UI stats
    updateCRMStats();
    
    // DIRECT tenant save
    const user = window.currentUser;
    if (user && user.tenantId) {
        const tenantKey = 'ezcubic_tenant_' + user.tenantId;
        let tenantData = JSON.parse(localStorage.getItem(tenantKey) || '{}');
        tenantData.crmCustomers = crmCustomers;
        tenantData.updatedAt = new Date().toISOString();
        localStorage.setItem(tenantKey, JSON.stringify(tenantData));
        console.log('✅ CRM Customers saved directly to tenant:', crmCustomers.length);
    }
    
    // Trigger cloud sync for deletions
    if (typeof window.fullCloudSync === 'function') {
        setTimeout(() => {
            window.fullCloudSync().catch(e => console.warn('Cloud sync failed:', e));
        }, 100);
    }
}

// ==================== MEMBERSHIP FUNCTIONS ====================

// Calculate membership tier based on total spent
function calculateMembershipTier(totalSpent) {
    const tiers = MEMBERSHIP_CONFIG.tiers;
    let currentTier = 'regular';
    
    // Check tiers in order of threshold (highest first)
    if (totalSpent >= tiers.vip.min) currentTier = 'vip';
    else if (totalSpent >= tiers.gold.min) currentTier = 'gold';
    else if (totalSpent >= tiers.silver.min) currentTier = 'silver';
    
    return currentTier;
}

// Get tier info for display
function getTierInfo(tierKey) {
    return MEMBERSHIP_CONFIG.tiers[tierKey] || MEMBERSHIP_CONFIG.tiers.regular;
}

// Add points to customer (called from POS on checkout)
function addCustomerPoints(customerId, amountSpent, transactionRef = '') {
    const customer = crmCustomers.find(c => c.id === customerId);
    if (!customer) return { success: false, error: 'Customer not found' };
    
    // Initialize membership fields if missing
    if (typeof customer.points !== 'number') customer.points = 0;
    if (!Array.isArray(customer.pointsHistory)) customer.pointsHistory = [];
    
    // Calculate points earned
    const pointsEarned = Math.floor(amountSpent * MEMBERSHIP_CONFIG.pointsPerRM);
    
    // Add points
    customer.points += pointsEarned;
    
    // Record in history
    customer.pointsHistory.push({
        type: 'earn',
        points: pointsEarned,
        amount: amountSpent,
        ref: transactionRef,
        date: new Date().toISOString()
    });
    
    // Update total spent
    customer.totalSpent = (customer.totalSpent || 0) + amountSpent;
    
    // Check for tier upgrade
    const newTier = calculateMembershipTier(customer.totalSpent);
    const tierUpgraded = newTier !== customer.membershipTier;
    if (tierUpgraded) {
        customer.membershipTier = newTier;
    }
    
    saveCRMCustomers();
    
    return {
        success: true,
        pointsEarned,
        totalPoints: customer.points,
        tierUpgraded,
        newTier: tierUpgraded ? newTier : null,
        tierInfo: getTierInfo(customer.membershipTier)
    };
}

// Redeem points as discount (called from POS)
function redeemCustomerPoints(customerId, pointsToRedeem, transactionRef = '') {
    const customer = crmCustomers.find(c => c.id === customerId);
    if (!customer) return { success: false, error: 'Customer not found' };
    
    // Check points balance
    const currentPoints = customer.points || 0;
    if (pointsToRedeem > currentPoints) {
        return { success: false, error: 'Insufficient points', available: currentPoints };
    }
    
    // Calculate discount value
    const discountValue = pointsToRedeem / MEMBERSHIP_CONFIG.pointsToRM;
    
    // Deduct points
    customer.points = currentPoints - pointsToRedeem;
    
    // Record in history
    if (!Array.isArray(customer.pointsHistory)) customer.pointsHistory = [];
    customer.pointsHistory.push({
        type: 'redeem',
        points: -pointsToRedeem,
        discount: discountValue,
        ref: transactionRef,
        date: new Date().toISOString()
    });
    
    saveCRMCustomers();
    
    return {
        success: true,
        pointsRedeemed: pointsToRedeem,
        discountValue,
        remainingPoints: customer.points
    };
}

// ==================== BIRTHDAY REWARDS ====================

// Check for customers with birthdays today and award bonus points
function checkBirthdayRewards() {
    const birthdayBonus = MEMBERSHIP_CONFIG.birthdayBonus ?? 100;
    
    // Skip if birthday bonus is disabled (set to 0)
    if (birthdayBonus <= 0) {
        console.log('🎂 Birthday bonus is disabled (set to 0)');
        return 0;
    }
    
    const today = new Date();
    const todayMonth = today.getMonth() + 1; // 1-12
    const todayDay = today.getDate();
    const todayYear = today.getFullYear();
    const birthdayCheckKey = `ezcubic_birthday_check_${todayYear}`;
    
    // Get list of customers who already received birthday bonus this year
    const checkedCustomers = JSON.parse(localStorage.getItem(birthdayCheckKey) || '[]');
    
    let birthdayCount = 0;
    
    crmCustomers.forEach(customer => {
        if (!customer.birthday || customer.status === 'inactive') return;
        if (checkedCustomers.includes(customer.id)) return; // Already awarded this year
        
        // Parse birthday (format: YYYY-MM-DD)
        const [year, month, day] = customer.birthday.split('-').map(Number);
        
        // Check if today is birthday (ignore year)
        if (month === todayMonth && day === todayDay) {
            // Award birthday bonus points
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
            birthdayCount++;
            
            console.log(`🎂 Birthday bonus awarded to ${customer.name}: +${birthdayBonus} pts`);
        }
    });
    
    if (birthdayCount > 0) {
        // Save updated customers
        saveCRMCustomers();
        
        // Save checked list
        localStorage.setItem(birthdayCheckKey, JSON.stringify(checkedCustomers));
        
        // Show notification
        showToast(`🎂 ${birthdayCount} customer${birthdayCount > 1 ? 's have' : ' has'} birthday today! Bonus points awarded.`, 'success');
    }
    
    return birthdayCount;
}
window.checkBirthdayRewards = checkBirthdayRewards;

// Award birthday bonus to a specific customer if today is their birthday
// Used when creating a new customer whose birthday is today
function awardBirthdayBonusIfToday(customer) {
    if (!customer || !customer.birthday) return false;
    
    const birthdayBonus = MEMBERSHIP_CONFIG.birthdayBonus ?? 100;
    if (birthdayBonus <= 0) return false;
    
    const today = new Date();
    const todayMonth = today.getMonth() + 1;
    const todayDay = today.getDate();
    const todayYear = today.getFullYear();
    
    // Parse birthday (format: YYYY-MM-DD)
    const [year, month, day] = customer.birthday.split('-').map(Number);
    
    // Check if today is birthday (ignore year)
    if (month === todayMonth && day === todayDay) {
        const birthdayCheckKey = `ezcubic_birthday_check_${todayYear}`;
        const checkedCustomers = JSON.parse(localStorage.getItem(birthdayCheckKey) || '[]');
        
        // Don't award if already given this year (shouldn't happen for new customer but safety check)
        if (checkedCustomers.includes(customer.id)) return false;
        
        // Award birthday bonus points
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
        
        console.log(`🎂 Birthday bonus awarded to new customer ${customer.name}: +${birthdayBonus} pts`);
        showToast(`🎂 Happy Birthday ${customer.name}! +${birthdayBonus} bonus points awarded!`, 'success');
        
        return true;
    }
    
    return false;
}
window.awardBirthdayBonusIfToday = awardBirthdayBonusIfToday;

// Get customers with upcoming birthdays (next 7 days)
function getUpcomingBirthdays(days = 7) {
    const today = new Date();
    const upcoming = [];
    
    crmCustomers.forEach(customer => {
        if (!customer.birthday || customer.status === 'inactive') return;
        
        const [year, month, day] = customer.birthday.split('-').map(Number);
        
        // Create a date for this year's birthday
        const birthdayThisYear = new Date(today.getFullYear(), month - 1, day);
        
        // If birthday has passed this year, use next year
        if (birthdayThisYear < today) {
            birthdayThisYear.setFullYear(today.getFullYear() + 1);
        }
        
        // Calculate days until birthday
        const diffTime = birthdayThisYear - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays >= 0 && diffDays <= days) {
            upcoming.push({
                customer,
                daysUntil: diffDays,
                birthdayDate: birthdayThisYear
            });
        }
    });
    
    // Sort by days until birthday
    upcoming.sort((a, b) => a.daysUntil - b.daysUntil);
    
    return upcoming;
}
window.getUpcomingBirthdays = getUpcomingBirthdays;

// Get customer membership summary
function getCustomerMembership(customerId) {
    const customer = crmCustomers.find(c => c.id === customerId);
    if (!customer) return null;
    
    const tierInfo = getTierInfo(customer.membershipTier || 'regular');
    const nextTierKey = getNextTier(customer.membershipTier || 'regular');
    const nextTier = nextTierKey ? getTierInfo(nextTierKey) : null;
    const spentToNextTier = nextTier ? nextTier.min - (customer.totalSpent || 0) : 0;
    
    return {
        points: customer.points || 0,
        tier: customer.membershipTier || 'regular',
        tierInfo,
        totalSpent: customer.totalSpent || 0,
        discount: tierInfo.discount,
        nextTier: nextTierKey,
        spentToNextTier: Math.max(0, spentToNextTier),
        pointsValue: (customer.points || 0) / MEMBERSHIP_CONFIG.pointsToRM
    };
}

// Get next tier key
function getNextTier(currentTier) {
    const tierOrder = ['regular', 'silver', 'gold', 'vip'];
    const currentIndex = tierOrder.indexOf(currentTier);
    return currentIndex < tierOrder.length - 1 ? tierOrder[currentIndex + 1] : null;
}

// Migrate existing customers to have membership fields
function migrateCustomersToMembership() {
    let migrated = 0;
    crmCustomers.forEach(customer => {
        let needsUpdate = false;
        
        if (typeof customer.points !== 'number') {
            customer.points = 0;
            needsUpdate = true;
        }
        if (!customer.membershipTier) {
            customer.membershipTier = calculateMembershipTier(customer.totalSpent || 0);
            needsUpdate = true;
        }
        if (!Array.isArray(customer.pointsHistory)) {
            customer.pointsHistory = [];
            needsUpdate = true;
        }
        
        if (needsUpdate) migrated++;
    });
    
    if (migrated > 0) {
        saveCRMCustomers();
        console.log(`✅ Migrated ${migrated} customers to membership system`);
    }
    
    return migrated;
}

// ==================== CRM STATS ====================
function updateCRMStats() {
    // Total customers
    const totalEl = document.getElementById('crmTotalCustomers');
    if (totalEl) totalEl.textContent = crmCustomers.length;
    
    // VIP customers (by membership tier now, not group)
    const vipEl = document.getElementById('crmVIPCustomers');
    if (vipEl) {
        const vipCount = crmCustomers.filter(c => c.membershipTier === 'vip' || c.membershipTier === 'gold').length;
        vipEl.textContent = vipCount;
    }
    
    // Total points in circulation
    const pointsEl = document.getElementById('crmTotalPoints');
    if (pointsEl) {
        const totalPoints = crmCustomers.reduce((sum, c) => sum + (c.points || 0), 0);
        pointsEl.textContent = totalPoints.toLocaleString();
    }
    
    // Outstanding balance
    const outstandingEl = document.getElementById('crmOutstandingBalance');
    if (outstandingEl) {
        const totalOutstanding = crmCustomers.reduce((sum, c) => sum + (c.outstandingBalance || 0), 0);
        outstandingEl.textContent = formatRM(totalOutstanding);
    }
    
    // This month sales
    const thisMonthEl = document.getElementById('crmThisMonthSales');
    if (thisMonthEl) {
        const now = new Date();
        const thisMonth = now.getMonth();
        const thisYear = now.getFullYear();
        
        let monthSales = 0;
        crmCustomers.forEach(customer => {
            if (customer.salesHistory) {
                customer.salesHistory.forEach(sale => {
                    const saleDate = new Date(sale.date);
                    if (saleDate.getMonth() === thisMonth && saleDate.getFullYear() === thisYear) {
                        monthSales += sale.amount;
                    }
                });
            }
        });
        thisMonthEl.textContent = formatRM(monthSales);
    }
}

// ==================== CRM CUSTOMER MODAL ====================
function showCRMCustomerModal(customerId = null) {
    const modal = document.getElementById('crmCustomerModal');
    const title = document.getElementById('crmCustomerModalTitle');
    const form = document.getElementById('crmCustomerForm');
    
    form.reset();
    document.getElementById('crmCustomerId').value = '';
    
    if (customerId) {
        // Edit mode
        const customer = crmCustomers.find(c => c.id === customerId);
        if (customer) {
            title.textContent = 'Edit Customer';
            document.getElementById('crmCustomerId').value = customer.id;
            document.getElementById('crmCustomerName').value = customer.name;
            document.getElementById('crmCustomerGroup').value = customer.group || 'regular';
            document.getElementById('crmCustomerPhone').value = customer.phone || '';
            document.getElementById('crmCustomerEmail').value = customer.email || '';
            document.getElementById('crmCustomerCompany').value = customer.company || '';
            document.getElementById('crmCustomerCreditTerms').value = customer.creditTerms || 'cod';
            document.getElementById('crmCustomerCreditLimit').value = customer.creditLimit || 0;
            document.getElementById('crmCustomerStatus').value = customer.status || 'active';
            if (document.getElementById('crmCustomerBirthday')) {
                document.getElementById('crmCustomerBirthday').value = customer.birthday || '';
            }
            document.getElementById('crmCustomerAddress').value = customer.address || '';
            document.getElementById('crmCustomerNotes').value = customer.notes || '';
        }
    } else {
        // Add mode
        title.textContent = 'Add Customer';
    }
    
    modal.style.display = '';
    modal.classList.add('show');
}

function saveCRMCustomer(event) {
    event.preventDefault();
    
    const id = document.getElementById('crmCustomerId').value;
    
    // Check customer limit for new customers only
    if (!id && typeof canAdd === 'function' && !canAdd('customers')) {
        return; // Limit reached, modal shown by canAdd()
    }
    
    const customerData = {
        name: document.getElementById('crmCustomerName').value.trim(),
        group: document.getElementById('crmCustomerGroup').value,
        phone: document.getElementById('crmCustomerPhone').value.trim(),
        email: document.getElementById('crmCustomerEmail').value.trim(),
        company: document.getElementById('crmCustomerCompany').value.trim(),
        creditTerms: document.getElementById('crmCustomerCreditTerms').value,
        creditLimit: parseFloat(document.getElementById('crmCustomerCreditLimit').value) || 0,
        status: document.getElementById('crmCustomerStatus').value,
        birthday: document.getElementById('crmCustomerBirthday')?.value || '',
        address: document.getElementById('crmCustomerAddress').value.trim(),
        notes: document.getElementById('crmCustomerNotes').value.trim(),
        updatedAt: new Date().toISOString()
    };
    
    let newCustomerId = null;
    
    if (id) {
        // Update existing customer
        const index = crmCustomers.findIndex(c => c.id === id);
        if (index !== -1) {
            crmCustomers[index] = { ...crmCustomers[index], ...customerData };
            showToast('Customer updated successfully!', 'success');
        }
    } else {
        // Add new customer
        const newCustomer = {
            id: generateUUID(),
            ...customerData,
            outstandingBalance: 0,
            totalSpent: 0,
            salesHistory: [],
            interactions: [],
            // Membership fields
            points: 0,
            membershipTier: 'regular',
            pointsHistory: [],
            createdAt: new Date().toISOString()
        };
        crmCustomers.push(newCustomer);
        newCustomerId = newCustomer.id;
        showToast('Customer added successfully!', 'success');
        
        // Check if today is the new customer's birthday - award bonus immediately!
        if (newCustomer.birthday) {
            awardBirthdayBonusIfToday(newCustomer);
        }
    }
    
    saveCRMCustomers();
    renderCRMCustomers();
    closeModal('crmCustomerModal');
    
    // Check if we need to return to quotation modal with the new customer
    if (window.returnToQuotationAfterCustomer && newCustomerId) {
        window.returnToQuotationAfterCustomer = false;
        
        // Small delay to let modal close animation complete
        setTimeout(() => {
            if (typeof showQuotationModal === 'function') {
                showQuotationModal();
                // Wait for modal to render, then select the new customer
                setTimeout(() => {
                    const customerSelect = document.getElementById('quotationCustomer');
                    if (customerSelect) {
                        // Refresh customer list first
                        if (typeof populateQuotationCustomers === 'function') {
                            populateQuotationCustomers();
                        }
                        customerSelect.value = newCustomerId;
                        // Trigger change to update customer info
                        if (typeof updateQuotationCustomerInfo === 'function') {
                            updateQuotationCustomerInfo(newCustomerId);
                        }
                    }
                }, 100);
            }
        }, 200);
    }
}

// ==================== CRM CUSTOMER RENDERING ====================
function renderCRMCustomers() {
    const container = document.getElementById('crmCustomerGrid');
    if (!container) return;
    
    const searchTerm = document.getElementById('crmSearch')?.value?.toLowerCase() || '';
    const groupFilter = document.getElementById('crmGroupFilter')?.value || '';
    const statusFilter = document.getElementById('crmStatusFilter')?.value || '';
    
    let filtered = crmCustomers.filter(customer => {
        const matchesSearch = !searchTerm || 
            customer.name.toLowerCase().includes(searchTerm) ||
            (customer.phone && customer.phone.includes(searchTerm)) ||
            (customer.email && customer.email.toLowerCase().includes(searchTerm)) ||
            (customer.company && customer.company.toLowerCase().includes(searchTerm));
        const matchesGroup = !groupFilter || customer.group === groupFilter;
        const matchesStatus = !statusFilter || customer.status === statusFilter;
        return matchesSearch && matchesGroup && matchesStatus;
    });
    
    if (filtered.length === 0) {
        container.innerHTML = `
            <div class="crm-empty">
                <i class="fas fa-users"></i>
                <p>${crmCustomers.length === 0 ? 'No customers yet. Add your first customer!' : 'No customers found matching your filters.'}</p>
            </div>
        `;
        return;
    }
    
    // Sort by most recent first
    filtered.sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt));
    
    // Render based on view mode
    if (crmViewMode === 'table') {
        renderCRMTableView(container, filtered);
    } else if (crmViewMode === 'compact') {
        renderCRMCompactView(container, filtered);
    } else {
        renderCRMCardView(container, filtered);
    }
}

// Set CRM view mode
function setCRMView(mode) {
    crmViewMode = mode;
    localStorage.setItem('ezcubic_crm_view', mode);
    
    // Update button states
    document.querySelectorAll('.crm-view-btn').forEach(btn => btn.classList.remove('active'));
    const activeBtn = document.getElementById('crmView' + mode.charAt(0).toUpperCase() + mode.slice(1));
    if (activeBtn) activeBtn.classList.add('active');
    
    // Update container class for styling
    const container = document.getElementById('crmCustomerGrid');
    if (container) {
        container.className = 'crm-customer-grid crm-view-' + mode;
    }
    
    renderCRMCustomers();
}

// Initialize view mode on page load
function initCRMViewMode() {
    const savedView = localStorage.getItem('ezcubic_crm_view') || 'card';
    crmViewMode = savedView;
    
    document.querySelectorAll('.crm-view-btn').forEach(btn => btn.classList.remove('active'));
    const activeBtn = document.getElementById('crmView' + savedView.charAt(0).toUpperCase() + savedView.slice(1));
    if (activeBtn) activeBtn.classList.add('active');
    
    const container = document.getElementById('crmCustomerGrid');
    if (container) {
        container.className = 'crm-customer-grid crm-view-' + savedView;
    }
}

// Card View (original)
function renderCRMCardView(container, filtered) {
    const groupLabels = {
        'vip': { label: 'VIP', color: '#f59e0b' },
        'b2b': { label: 'B2B', color: '#2563eb' },
        'regular': { label: 'Regular', color: '#64748b' },
        'new': { label: 'New', color: '#10b981' }
    };
    
    container.innerHTML = filtered.map(customer => {
        const groupInfo = groupLabels[customer.group] || groupLabels.regular;
        const salesCount = customer.salesHistory?.length || 0;
        const tierInfo = getTierInfo(customer.membershipTier || 'regular');
        const points = customer.points || 0;
        
        return `
            <div class="crm-customer-card" onclick="showCRMCustomerDetail('${customer.id}')">
                <div class="crm-customer-header">
                    <div class="crm-customer-avatar">
                        ${customer.name.charAt(0).toUpperCase()}
                    </div>
                    <div class="crm-customer-info">
                        <div class="crm-customer-name">${escapeHtml(customer.name)}</div>
                        <div class="crm-customer-company">${customer.company ? escapeHtml(customer.company) : ''}</div>
                    </div>
                    <div class="crm-customer-badges">
                        <span class="crm-tier-badge" style="background: ${tierInfo.color};" title="Membership: ${tierInfo.label}">${tierInfo.icon} ${tierInfo.label}</span>
                        ${customer.status === 'inactive' ? '<span class="crm-badge inactive">Inactive</span>' : ''}
                    </div>
                </div>
                <div class="crm-membership-bar">
                    <span class="crm-points-display"><i class="fas fa-star" style="color: #f59e0b;"></i> ${points.toLocaleString()} pts</span>
                    ${tierInfo.discount > 0 ? `<span class="crm-tier-discount">${tierInfo.discount}% off</span>` : ''}
                </div>
                <div class="crm-customer-contact">
                    ${customer.phone ? `<span><i class="fas fa-phone"></i> ${escapeHtml(customer.phone)}</span>` : ''}
                    ${customer.email ? `<span><i class="fas fa-envelope"></i> ${escapeHtml(customer.email)}</span>` : ''}
                </div>
                <div class="crm-customer-stats">
                    <div class="crm-stat">
                        <span class="crm-stat-value">${formatRM(customer.totalSpent || 0)}</span>
                        <span class="crm-stat-label">Total Spent</span>
                    </div>
                    <div class="crm-stat">
                        <span class="crm-stat-value">${salesCount}</span>
                        <span class="crm-stat-label">Orders</span>
                    </div>
                    <div class="crm-stat ${customer.outstandingBalance > 0 ? 'outstanding' : ''}">
                        <span class="crm-stat-value">${formatRM(customer.outstandingBalance || 0)}</span>
                        <span class="crm-stat-label">Outstanding</span>
                    </div>
                </div>
                <div class="crm-customer-actions">
                    <button class="btn-outline btn-sm" onclick="event.stopPropagation(); showCRMCustomerModal('${customer.id}')" title="Edit">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-outline btn-sm" onclick="event.stopPropagation(); addCRMInteraction('${customer.id}')" title="Add Note">
                        <i class="fas fa-sticky-note"></i>
                    </button>
                    <button class="btn-outline btn-sm danger" onclick="event.stopPropagation(); deleteCRMCustomer('${customer.id}')" title="Delete">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

// Table View (spreadsheet-like)
function renderCRMTableView(container, filtered) {
    container.innerHTML = `
        <div class="crm-table-wrapper">
            <table class="crm-table">
                <thead>
                    <tr>
                        <th style="width: 50px;">#</th>
                        <th>Customer</th>
                        <th>Phone</th>
                        <th style="text-align: center;">Tier</th>
                        <th style="text-align: right;">Points</th>
                        <th style="text-align: right;">Total Spent</th>
                        <th style="text-align: right;">Outstanding</th>
                        <th style="width: 100px;">Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${filtered.map((customer, index) => {
                        const tierInfo = getTierInfo(customer.membershipTier || 'regular');
                        const salesCount = customer.salesHistory?.length || 0;
                        const points = customer.points || 0;
                        return `
                            <tr onclick="showCRMCustomerDetail('${customer.id}')" class="${customer.status === 'inactive' ? 'inactive-row' : ''}">
                                <td>${index + 1}</td>
                                <td>
                                    <div style="display: flex; align-items: center; gap: 10px;">
                                        <div class="crm-avatar-sm">${customer.name.charAt(0).toUpperCase()}</div>
                                        <div>
                                            <div style="font-weight: 600;">${escapeHtml(customer.name)}</div>
                                            ${customer.company ? `<div style="font-size: 11px; color: #64748b;">${escapeHtml(customer.company)}</div>` : ''}
                                        </div>
                                    </div>
                                </td>
                                <td>${customer.phone ? escapeHtml(customer.phone) : '-'}</td>
                                <td style="text-align: center;"><span class="crm-tier-badge-sm" style="background: ${tierInfo.color};">${tierInfo.icon} ${tierInfo.label}</span></td>
                                <td style="text-align: right;"><span style="color: #f59e0b;">⭐</span> ${points.toLocaleString()}</td>
                                <td style="text-align: right; font-weight: 600;">${formatRM(customer.totalSpent || 0)}</td>
                                <td style="text-align: right; ${customer.outstandingBalance > 0 ? 'color: #f59e0b; font-weight: 600;' : ''}">${formatRM(customer.outstandingBalance || 0)}</td>
                                <td>
                                    <div style="display: flex; gap: 4px; justify-content: center;">
                                        <button class="btn-icon-sm" onclick="event.stopPropagation(); showCRMCustomerModal('${customer.id}')" title="Edit">
                                            <i class="fas fa-edit"></i>
                                        </button>
                                        <button class="btn-icon-sm danger" onclick="event.stopPropagation(); deleteCRMCustomer('${customer.id}')" title="Delete">
                                            <i class="fas fa-trash"></i>
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
        </div>
        <div class="crm-table-footer">
            Showing ${filtered.length} of ${crmCustomers.length} customers
        </div>
    `;
}

// Compact List View (minimal, fast scrolling)
function renderCRMCompactView(container, filtered) {
    container.innerHTML = `
        <div class="crm-compact-list">
            ${filtered.map(customer => {
                const tierInfo = getTierInfo(customer.membershipTier || 'regular');
                const points = customer.points || 0;
                return `
                    <div class="crm-compact-item ${customer.status === 'inactive' ? 'inactive' : ''}" onclick="showCRMCustomerDetail('${customer.id}')">
                        <div class="crm-compact-avatar">${customer.name.charAt(0).toUpperCase()}</div>
                        <div class="crm-compact-info">
                            <div class="crm-compact-name">${escapeHtml(customer.name)}</div>
                            <div class="crm-compact-details">
                                ${customer.phone ? `<span><i class="fas fa-phone"></i> ${escapeHtml(customer.phone)}</span>` : ''}
                                <span style="color: #f59e0b;"><i class="fas fa-star"></i> ${points.toLocaleString()} pts</span>
                            </div>
                        </div>
                        <div class="crm-compact-meta">
                            <span class="crm-tier-badge-sm" style="background: ${tierInfo.color};">${tierInfo.icon}</span>
                            <span class="crm-compact-spent">${formatRM(customer.totalSpent || 0)}</span>
                        </div>
                        <div class="crm-compact-actions">
                            <button class="btn-icon-sm" onclick="event.stopPropagation(); showCRMCustomerModal('${customer.id}')" title="Edit">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn-icon-sm danger" onclick="event.stopPropagation(); deleteCRMCustomer('${customer.id}')" title="Delete">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                `;
            }).join('')}
        </div>
        <div class="crm-table-footer">
            Showing ${filtered.length} of ${crmCustomers.length} customers
        </div>
    `;
}

function searchCRMCustomers(term) {
    renderCRMCustomers();
}

function filterCRMCustomers() {
    renderCRMCustomers();
}

// ==================== CRM CUSTOMER DETAIL ====================
function showCRMCustomerDetail(customerId) {
    const customer = crmCustomers.find(c => c.id === customerId);
    if (!customer) return;
    
    const modal = document.getElementById('crmCustomerDetailModal');
    const title = document.getElementById('crmDetailTitle');
    const content = document.getElementById('crmCustomerDetailContent');
    
    title.textContent = customer.name;
    
    const groupLabels = {
        'vip': { label: 'VIP', color: '#f59e0b' },
        'b2b': { label: 'B2B', color: '#2563eb' },
        'regular': { label: 'Regular', color: '#64748b' },
        'new': { label: 'New', color: '#10b981' }
    };
    
    const groupInfo = groupLabels[customer.group] || groupLabels.regular;
    
    const creditTermsLabels = {
        'cod': 'COD',
        '7days': 'Net 7 Days',
        '14days': 'Net 14 Days',
        '30days': 'Net 30 Days',
        '60days': 'Net 60 Days',
        '90days': 'Net 90 Days'
    };
    
    // Get customer's quotations
    let customerQuotations = [];
    if (typeof quotations !== 'undefined' && Array.isArray(quotations)) {
        customerQuotations = quotations.filter(q => q.customerId === customerId);
    }
    
    // Get customer's projects
    let customerProjects = [];
    if (typeof projects !== 'undefined' && Array.isArray(projects)) {
        customerProjects = projects.filter(p => p.customerId === customerId);
    }
    
    // Calculate project totals
    const projectTotalValue = customerProjects.reduce((sum, p) => sum + (p.totalAmount || 0), 0);
    const projectTotalPaid = customerProjects.reduce((sum, p) => sum + (p.amountPaid || 0), 0);
    
    // Get membership info
    const membership = getCustomerMembership ? getCustomerMembership(customerId) : null;
    const tierInfo = membership?.tierInfo || getTierInfo('regular');
    
    // Build membership section HTML
    let membershipSectionHTML = '';
    if (membership) {
        const progressToNext = membership.nextTier ? 
            Math.min(100, (customer.totalSpent / MEMBERSHIP_CONFIG.tiers[membership.nextTier.toLowerCase()].minSpent) * 100) : 100;
        
        // Points history (last 10)
        const pointsHistory = (customer.pointsHistory || []).slice(-10).reverse();
        
        membershipSectionHTML = `
            <div class="crm-detail-section crm-membership-section">
                <h4><i class="fas fa-crown"></i> Membership & Loyalty</h4>
                <div class="crm-membership-detail">
                    <div class="crm-membership-tier-display">
                        <span class="crm-tier-badge-lg" style="background: ${tierInfo.color};">
                            ${tierInfo.icon} ${tierInfo.label}
                        </span>
                        ${tierInfo.discount > 0 ? `<span class="crm-tier-discount-lg">${tierInfo.discount}% discount</span>` : ''}
                    </div>
                    
                    <div class="crm-membership-stats">
                        <div class="crm-stat-box">
                            <div class="crm-stat-icon">⭐</div>
                            <div class="crm-stat-value">${(membership.points || 0).toLocaleString()}</div>
                            <div class="crm-stat-label">Points</div>
                        </div>
                        <div class="crm-stat-box">
                            <div class="crm-stat-icon">💰</div>
                            <div class="crm-stat-value">RM${membership.pointsValue.toFixed(2)}</div>
                            <div class="crm-stat-label">Points Value</div>
                        </div>
                        <div class="crm-stat-box">
                            <div class="crm-stat-icon">🛒</div>
                            <div class="crm-stat-value">RM${(customer.totalSpent || 0).toFixed(0)}</div>
                            <div class="crm-stat-label">Total Spent</div>
                        </div>
                    </div>
                    
                    ${membership.nextTier ? `
                        <div class="crm-tier-progress-section">
                            <div class="crm-tier-progress-label">
                                <span>Progress to <strong>${membership.nextTier}</strong></span>
                                <span>RM${membership.spentToNextTier.toFixed(0)} more</span>
                            </div>
                            <div class="crm-tier-progress-bar">
                                <div class="crm-tier-progress-fill" style="width: ${progressToNext}%; background: ${tierInfo.color};"></div>
                            </div>
                        </div>
                    ` : `
                        <div class="crm-tier-max-reached">
                            <i class="fas fa-trophy"></i> Maximum tier reached!
                        </div>
                    `}
                    
                    ${pointsHistory.length > 0 ? `
                        <div class="crm-points-history">
                            <h5><i class="fas fa-history"></i> Points History</h5>
                            <div class="crm-points-history-list">
                                ${pointsHistory.map(h => `
                                    <div class="crm-points-history-item ${h.type === 'earn' ? 'earn' : 'redeem'}">
                                        <div class="crm-points-history-info">
                                            <span class="crm-points-history-type">${h.type === 'earn' ? '+' : '-'}${h.points} pts</span>
                                            <span class="crm-points-history-ref">${h.reference || ''}</span>
                                        </div>
                                        <span class="crm-points-history-date">${new Date(h.date).toLocaleDateString()}</span>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    }
    
    content.innerHTML = `
        <div class="crm-detail-header">
            <div class="crm-detail-avatar">${customer.name.charAt(0).toUpperCase()}</div>
            <div class="crm-detail-info">
                <h3>${escapeHtml(customer.name)}</h3>
                ${customer.company ? `<p class="crm-detail-company">${escapeHtml(customer.company)}</p>` : ''}
                <div class="crm-detail-badges">
                    <span class="crm-badge" style="background: ${groupInfo.color};">${groupInfo.label}</span>
                    <span class="crm-badge ${customer.status === 'active' ? 'active' : 'inactive'}">${customer.status === 'active' ? 'Active' : 'Inactive'}</span>
                </div>
            </div>
            <div class="crm-detail-actions">
                <button class="btn-outline" onclick="showCRMCustomerModal('${customer.id}'); closeModal('crmCustomerDetailModal');">
                    <i class="fas fa-edit"></i> Edit
                </button>
            </div>
        </div>
        
        <div class="crm-detail-sections">
            <div class="crm-detail-section">
                <h4><i class="fas fa-address-card"></i> Contact Information</h4>
                <div class="crm-detail-grid">
                    <div class="crm-detail-item">
                        <label>Phone</label>
                        <span>${customer.phone || '-'}</span>
                    </div>
                    <div class="crm-detail-item">
                        <label>Email</label>
                        <span>${customer.email || '-'}</span>
                    </div>
                    <div class="crm-detail-item full-width">
                        <label>Address</label>
                        <span>${customer.address || '-'}</span>
                    </div>
                </div>
            </div>
            
            ${membershipSectionHTML}
            
            <div class="crm-detail-section">
                <h4><i class="fas fa-credit-card"></i> Credit Information</h4>
                <div class="crm-detail-grid">
                    <div class="crm-detail-item">
                        <label>Credit Terms</label>
                        <span>${creditTermsLabels[customer.creditTerms] || 'COD'}</span>
                    </div>
                    <div class="crm-detail-item">
                        <label>Credit Limit</label>
                        <span>${formatRM(customer.creditLimit || 0)}</span>
                    </div>
                    <div class="crm-detail-item">
                        <label>Outstanding Balance</label>
                        <span class="${customer.outstandingBalance > 0 ? 'text-warning' : ''}">${formatRM(customer.outstandingBalance || 0)}</span>
                    </div>
                    <div class="crm-detail-item">
                        <label>Total Spent</label>
                        <span class="text-success">${formatRM(customer.totalSpent || 0)}</span>
                    </div>
                </div>
                ${customer.outstandingBalance > 0 ? `
                    <button class="btn-primary btn-sm" onclick="showReceivePaymentModal('${customer.id}')" style="margin-top: 15px;">
                        <i class="fas fa-hand-holding-usd"></i> Receive Payment
                    </button>
                ` : ''}
            </div>
            
            <!-- Quotations Section -->
            <div class="crm-detail-section">
                <h4><i class="fas fa-file-invoice"></i> Quotations (${customerQuotations.length})</h4>
                <div class="crm-quotations-list">
                    ${customerQuotations.length > 0 ? 
                        customerQuotations.slice(0, 5).map(q => {
                            const statusColors = {
                                draft: '#64748b',
                                sent: '#3b82f6',
                                accepted: '#10b981',
                                rejected: '#ef4444',
                                expired: '#f59e0b'
                            };
                            const statusLabels = {
                                draft: 'Draft',
                                sent: 'Sent',
                                accepted: 'Accepted',
                                rejected: 'Rejected',
                                expired: 'Expired'
                            };
                            let displayStatus = q.status;
                            if (q.status === 'sent' && q.validUntil && new Date(q.validUntil) < new Date()) {
                                displayStatus = 'expired';
                            }
                            return `
                                <div class="crm-quotation-item" onclick="closeModal('crmCustomerDetailModal'); viewQuotationDetail('${q.id}');">
                                    <div class="crm-quotation-info">
                                        <span class="crm-quotation-no">${escapeHtml(q.quotationNo)}</span>
                                        <span class="crm-quotation-subject">${escapeHtml(q.subject || 'No subject')}</span>
                                        <span class="crm-quotation-date">${new Date(q.date).toLocaleDateString()}</span>
                                    </div>
                                    <div class="crm-quotation-right">
                                        <span class="crm-quotation-amount">RM ${(q.totalAmount || 0).toFixed(2)}</span>
                                        <span class="status-badge-sm" style="background: ${statusColors[displayStatus]}20; color: ${statusColors[displayStatus]};">${statusLabels[displayStatus]}</span>
                                    </div>
                                </div>
                            `;
                        }).join('') 
                        : '<p class="text-muted">No quotations for this customer</p>'
                    }
                    ${customerQuotations.length > 5 ? `<p class="text-muted" style="font-size: 12px; margin-top: 10px;">+ ${customerQuotations.length - 5} more quotations</p>` : ''}
                </div>
                <button class="btn-outline btn-sm" onclick="closeModal('crmCustomerDetailModal'); showQuotationModal(); setTimeout(() => document.getElementById('quotationCustomer').value = '${customer.id}', 100);" style="margin-top: 10px;">
                    <i class="fas fa-plus"></i> New Quotation
                </button>
            </div>
            
            <!-- Projects Section -->
            <div class="crm-detail-section">
                <h4><i class="fas fa-project-diagram"></i> Projects (${customerProjects.length})</h4>
                ${customerProjects.length > 0 ? `
                    <div class="crm-projects-summary">
                        <div class="summary-item">
                            <span class="label">Total Value:</span>
                            <span class="value">RM ${projectTotalValue.toFixed(2)}</span>
                        </div>
                        <div class="summary-item">
                            <span class="label">Paid:</span>
                            <span class="value text-success">RM ${projectTotalPaid.toFixed(2)}</span>
                        </div>
                        <div class="summary-item">
                            <span class="label">Outstanding:</span>
                            <span class="value text-warning">RM ${(projectTotalValue - projectTotalPaid).toFixed(2)}</span>
                        </div>
                    </div>
                ` : ''}
                <div class="crm-projects-list">
                    ${customerProjects.length > 0 ? 
                        customerProjects.slice(0, 5).map(p => {
                            const statusColors = {
                                'quotation': '#94a3b8',
                                'confirmed': '#2563eb',
                                'in-progress': '#f59e0b',
                                'completed': '#10b981',
                                'cancelled': '#ef4444'
                            };
                            const statusLabels = {
                                'quotation': 'Quotation',
                                'confirmed': 'Confirmed',
                                'in-progress': 'In Progress',
                                'completed': 'Completed',
                                'cancelled': 'Cancelled'
                            };
                            const progress = p.totalAmount > 0 ? ((p.amountPaid || 0) / p.totalAmount * 100) : 0;
                            return `
                                <div class="crm-project-item" onclick="closeModal('crmCustomerDetailModal'); viewProjectDetail('${p.id}');">
                                    <div class="crm-project-info">
                                        <span class="crm-project-no">${escapeHtml(p.projectNo || 'N/A')}</span>
                                        <span class="crm-project-name">${escapeHtml(p.name)}</span>
                                        <div class="crm-project-progress">
                                            <div class="mini-progress-bar">
                                                <div class="mini-progress-fill" style="width: ${progress}%;"></div>
                                            </div>
                                            <span class="progress-text">${progress.toFixed(0)}%</span>
                                        </div>
                                    </div>
                                    <div class="crm-project-right">
                                        <span class="crm-project-amount">RM ${(p.totalAmount || 0).toFixed(2)}</span>
                                        <span class="status-badge-sm" style="background: ${statusColors[p.status]}20; color: ${statusColors[p.status]};">${statusLabels[p.status]}</span>
                                    </div>
                                </div>
                            `;
                        }).join('') 
                        : '<p class="text-muted">No projects for this customer</p>'
                    }
                    ${customerProjects.length > 5 ? `<p class="text-muted" style="font-size: 12px; margin-top: 10px;">+ ${customerProjects.length - 5} more projects</p>` : ''}
                </div>
            </div>
            
            <div class="crm-detail-section">
                <h4><i class="fas fa-history"></i> POS Sales History (${customer.salesHistory?.length || 0})</h4>
                <div class="crm-sales-list">
                    ${customer.salesHistory && customer.salesHistory.length > 0 ? 
                        customer.salesHistory.slice(0, 5).map(sale => `
                            <div class="crm-sale-item">
                                <div class="crm-sale-info">
                                    <span class="crm-sale-ref">${sale.reference || 'N/A'}</span>
                                    <span class="crm-sale-date">${new Date(sale.date).toLocaleDateString()}</span>
                                </div>
                                <span class="crm-sale-amount">RM ${sale.amount.toFixed(2)}</span>
                            </div>
                        `).join('') 
                        : '<p class="text-muted">No POS sales history yet</p>'
                    }
                </div>
            </div>
            
            <div class="crm-detail-section">
                <h4><i class="fas fa-sticky-note"></i> Notes & Interactions</h4>
                <div class="crm-interactions-list">
                    ${customer.interactions && customer.interactions.length > 0 ? 
                        customer.interactions.slice(0, 10).map(note => `
                            <div class="crm-interaction-item ${note.type === 'payment' ? 'payment-note' : ''}">
                                <div class="crm-interaction-date">
                                    ${new Date(note.date).toLocaleDateString()}
                                    ${note.type === 'payment' ? '<i class="fas fa-check-circle" style="color: #10b981; margin-left: 5px;"></i>' : ''}
                                </div>
                                <div class="crm-interaction-text">${escapeHtml(note.text || note.note || '')}</div>
                            </div>
                        `).join('') 
                        : '<p class="text-muted">No notes yet</p>'
                    }
                    ${customer.notes ? `<div class="crm-customer-note"><strong>Internal Notes:</strong> ${escapeHtml(customer.notes)}</div>` : ''}
                </div>
                <button class="btn-outline btn-sm" onclick="addCRMInteraction('${customer.id}')" style="margin-top: 10px;">
                    <i class="fas fa-plus"></i> Add Note
                </button>
            </div>
        </div>
    `;
    
    modal.style.display = '';
    modal.classList.add('show');
}

// ==================== CRM INTERACTIONS ====================
function addCRMInteraction(customerId) {
    const note = prompt('Add a note for this customer:');
    if (note === null || note.trim() === '') return;
    
    const customer = crmCustomers.find(c => c.id === customerId);
    if (!customer) return;
    
    if (!customer.interactions) {
        customer.interactions = [];
    }
    
    customer.interactions.unshift({
        id: generateUUID(),
        date: new Date().toISOString(),
        text: note.trim(),
        type: 'note'
    });
    
    customer.updatedAt = new Date().toISOString();
    saveCRMCustomers();
    renderCRMCustomers();
    showToast('Note added!', 'success');
}

// ==================== CRM CUSTOMER DELETE ====================
function deleteCRMCustomer(customerId) {
    const customer = crmCustomers.find(c => c.id === customerId);
    if (!customer) return;
    
    if (!confirm(`Delete customer "${customer.name}"? This action cannot be undone.`)) {
        return;
    }
    
    crmCustomers = crmCustomers.filter(c => c.id !== customerId);
    saveCRMCustomers();
    renderCRMCustomers();
    showToast('Customer deleted!', 'success');
}

// ==================== LINK SALES TO CRM ====================
function linkSaleToCRMCustomer(customerId, saleData) {
    const customer = crmCustomers.find(c => c.id === customerId);
    if (!customer) return;
    
    if (!customer.salesHistory) {
        customer.salesHistory = [];
    }
    
    customer.salesHistory.unshift({
        id: saleData.id,
        reference: saleData.receiptNo,
        date: saleData.date,
        amount: saleData.total,
        items: saleData.items?.length || 0
    });
    
    // Note: totalSpent is now updated in addCustomerPoints() to avoid double-counting
    customer.updatedAt = new Date().toISOString();
    
    // Update membership tier based on totalSpent (calculated in addCustomerPoints)
    if (typeof calculateMembershipTier === 'function' && customer.totalSpent) {
        customer.membershipTier = calculateMembershipTier(customer.totalSpent);
    }
    
    saveCRMCustomers();
}

// ==================== CRM EXPORT ====================
function exportCustomersCRM() {
    if (crmCustomers.length === 0) {
        showToast('No customers to export', 'warning');
        return;
    }
    
    const headers = ['Name', 'Group', 'Phone', 'Email', 'Company', 'Address', 'Credit Terms', 'Credit Limit', 'Outstanding', 'Total Spent', 'Status'];
    const rows = crmCustomers.map(c => [
        c.name,
        c.group,
        c.phone || '',
        c.email || '',
        c.company || '',
        c.address || '',
        c.creditTerms || 'cod',
        c.creditLimit || 0,
        c.outstandingBalance || 0,
        c.totalSpent || 0,
        c.status || 'active'
    ]);
    
    const csvContent = [headers, ...rows]
        .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
        .join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `crm_customers_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    
    showToast('Customers exported!', 'success');
}

// ==================== GET CRM CUSTOMERS FOR POS ====================
function getCRMCustomersForSelect() {
    return crmCustomers
        .filter(c => c.status === 'active')
        .map(c => ({
            id: c.id,
            name: c.name,
            company: c.company,
            group: c.group,
            phone: c.phone || '',
            email: c.email || '',
            dob: c.dob || ''
        }));
}

// ==================== CREDIT MANAGEMENT ====================
function updateCRMCustomerCredit(customerId, amount) {
    const customer = crmCustomers.find(c => c.id === customerId);
    if (!customer) return;
    
    // Add to outstanding balance
    customer.outstandingBalance = (parseFloat(customer.outstandingBalance) || 0) + amount;
    customer.updatedAt = new Date().toISOString();
    
    saveCRMCustomers();
    updateCRMStats();
    renderCRMCustomers();
}

function receiveCRMPayment(customerId, amount, reference = '') {
    const customer = crmCustomers.find(c => c.id === customerId);
    if (!customer) return false;
    
    const outstanding = parseFloat(customer.outstandingBalance) || 0;
    const paymentAmount = parseFloat(amount) || 0;
    
    if (paymentAmount <= 0) {
        showToast('Invalid payment amount!', 'error');
        return false;
    }
    
    // Reduce outstanding balance
    customer.outstandingBalance = Math.max(0, outstanding - paymentAmount);
    customer.updatedAt = new Date().toISOString();
    
    // Record interaction
    customer.interactions = customer.interactions || [];
    customer.interactions.unshift({
        date: new Date().toISOString(),
        type: 'payment',
        note: `Payment received: RM ${paymentAmount.toFixed(2)}${reference ? ' (Ref: ' + reference + ')' : ''}`
    });
    
    saveCRMCustomers();
    updateCRMStats();
    
    // Record as income in accounting
    const incomeTransaction = {
        id: generateUUID(),
        date: new Date().toISOString().split('T')[0],
        amount: paymentAmount,
        category: 'Accounts Receivable Payment',
        description: `Credit payment from ${customer.name}${reference ? ' - Ref: ' + reference : ''}`,
        type: 'income',
        reference: reference || `CRM-${customerId}`,
        timestamp: new Date().toISOString()
    };
    // Push to businessData.transactions for proper sync with All Transactions
    if (typeof businessData !== 'undefined' && businessData.transactions) {
        businessData.transactions.push(incomeTransaction);
    } else if (typeof transactions !== 'undefined') {
        transactions.push(incomeTransaction);
    }
    if (typeof saveData === 'function') saveData();
    
    showToast(`Payment of RM ${paymentAmount.toFixed(2)} recorded!`, 'success');
    return true;
}

// Show receive payment modal
function showReceivePaymentModal(customerId) {
    const customer = crmCustomers.find(c => c.id === customerId);
    if (!customer) return;
    
    const outstanding = parseFloat(customer.outstandingBalance) || 0;
    
    if (outstanding <= 0) {
        showToast('No outstanding balance for this customer!', 'info');
        return;
    }
    
    const modal = document.createElement('div');
    modal.className = 'modal show';
    modal.id = 'receivePaymentModal';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 400px;">
            <div class="modal-header">
                <h3 class="modal-title"><i class="fas fa-hand-holding-usd"></i> Receive Payment</h3>
                <button class="modal-close" onclick="closeModal('receivePaymentModal')">&times;</button>
            </div>
            <div class="modal-body">
                <div class="credit-info-box" style="margin-bottom: 20px;">
                    <div class="credit-info-header">
                        <i class="fas fa-user"></i> ${escapeHtml(customer.name)}
                    </div>
                    <div class="credit-info-details">
                        <div class="credit-info-row">
                            <span>Outstanding Balance:</span>
                            <span style="color: #ef4444; font-weight: 600;">RM ${outstanding.toFixed(2)}</span>
                        </div>
                    </div>
                </div>
                <form onsubmit="submitReceivePayment(event, '${customerId}')">
                    <div class="form-group">
                        <label class="form-label">Payment Amount (RM) *</label>
                        <input type="number" id="receivePaymentAmount" class="form-control" 
                               step="0.01" min="0.01" max="${outstanding}" value="${outstanding.toFixed(2)}" required>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Reference (Optional)</label>
                        <input type="text" id="receivePaymentRef" class="form-control" 
                               placeholder="Check number, transfer ref, etc.">
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn-secondary" onclick="closeModal('receivePaymentModal')">Cancel</button>
                        <button type="submit" class="btn-primary">
                            <i class="fas fa-check"></i> Record Payment
                        </button>
                    </div>
                </form>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

function submitReceivePayment(event, customerId) {
    event.preventDefault();
    
    const amount = document.getElementById('receivePaymentAmount').value;
    const reference = document.getElementById('receivePaymentRef').value.trim();
    
    if (receiveCRMPayment(customerId, amount, reference)) {
        closeModal('receivePaymentModal');
        // Refresh detail view if open
        showCRMCustomerDetail(customerId);
    }
}

// ==================== MEMBERSHIP SETTINGS MANAGEMENT ====================

// Default membership config (used for reset)
const DEFAULT_MEMBERSHIP_CONFIG = {
    enabled: true,
    pointsPerRM: 1,
    pointsToRM: 100,
    birthdayBonus: 100,
    tiers: {
        'regular': { minSpent: 0, label: 'Regular', color: '#9ca3af', discount: 0, icon: '👤' },
        'silver': { minSpent: 500, label: 'Silver', color: '#94a3b8', discount: 3, icon: '🥈' },
        'gold': { minSpent: 2000, label: 'Gold', color: '#f59e0b', discount: 5, icon: '🥇' },
        'vip': { minSpent: 5000, label: 'VIP', color: '#8b5cf6', discount: 10, icon: '💎' }
    }
};

// Load membership settings from businessData or use defaults
function loadMembershipSettings() {
    const saved = businessData?.settings?.membershipConfig;
    if (saved) {
        // Update MEMBERSHIP_CONFIG from saved settings
        MEMBERSHIP_CONFIG.enabled = saved.enabled !== false;
        MEMBERSHIP_CONFIG.pointsPerRM = saved.pointsPerRM || 1;
        MEMBERSHIP_CONFIG.pointsToRM = saved.pointsToRM || 100;
        MEMBERSHIP_CONFIG.birthdayBonus = saved.birthdayBonus ?? 100;
        
        if (saved.tiers) {
            // Map saved tiers to MEMBERSHIP_CONFIG format
            const tierKeys = ['regular', 'silver', 'gold', 'vip'];
            tierKeys.forEach((key, index) => {
                const tierNum = index + 1;
                if (saved.tiers[key]) {
                    MEMBERSHIP_CONFIG.tiers[key] = {
                        min: saved.tiers[key].minSpent || 0,
                        minSpent: saved.tiers[key].minSpent || 0,
                        label: saved.tiers[key].label || DEFAULT_MEMBERSHIP_CONFIG.tiers[key].label,
                        color: saved.tiers[key].color || DEFAULT_MEMBERSHIP_CONFIG.tiers[key].color,
                        discount: saved.tiers[key].discount || 0,
                        icon: saved.tiers[key].icon || DEFAULT_MEMBERSHIP_CONFIG.tiers[key].icon
                    };
                }
            });
        }
    }
    
    // Populate form fields
    populateMembershipForm();
}

// Populate form with current settings
function populateMembershipForm() {
    const enabledCheckbox = document.getElementById('membershipEnabled');
    if (enabledCheckbox) enabledCheckbox.checked = MEMBERSHIP_CONFIG.enabled !== false;
    
    const pointsPerRMInput = document.getElementById('membershipPointsPerRM');
    if (pointsPerRMInput) pointsPerRMInput.value = MEMBERSHIP_CONFIG.pointsPerRM || 1;
    
    const pointsToRMInput = document.getElementById('membershipPointsToRM');
    if (pointsToRMInput) pointsToRMInput.value = MEMBERSHIP_CONFIG.pointsToRM || 100;
    
    const birthdayBonusInput = document.getElementById('membershipBirthdayBonus');
    if (birthdayBonusInput) birthdayBonusInput.value = MEMBERSHIP_CONFIG.birthdayBonus ?? 100;
    
    // Populate tier fields
    const tierKeys = ['regular', 'silver', 'gold', 'vip'];
    tierKeys.forEach((key, index) => {
        const tierNum = index + 1;
        const tier = MEMBERSHIP_CONFIG.tiers[key];
        if (tier) {
            const iconInput = document.getElementById(`tier${tierNum}Icon`);
            const nameInput = document.getElementById(`tier${tierNum}Name`);
            const minSpentInput = document.getElementById(`tier${tierNum}MinSpent`);
            const discountInput = document.getElementById(`tier${tierNum}Discount`);
            const colorInput = document.getElementById(`tier${tierNum}Color`);
            
            if (iconInput) iconInput.value = tier.icon || DEFAULT_MEMBERSHIP_CONFIG.tiers[key].icon;
            if (nameInput) nameInput.value = tier.label || DEFAULT_MEMBERSHIP_CONFIG.tiers[key].label;
            if (minSpentInput) minSpentInput.value = tier.minSpent || tier.min || 0;
            if (discountInput) discountInput.value = tier.discount || 0;
            if (colorInput) colorInput.value = tier.color || DEFAULT_MEMBERSHIP_CONFIG.tiers[key].color;
        }
    });
    
    // Update preview
    updateMembershipPreview();
    
    // Toggle content visibility
    toggleMembershipProgram();
}

// Toggle membership program enable/disable
function toggleMembershipProgram() {
    const enabled = document.getElementById('membershipEnabled')?.checked ?? true;
    const content = document.getElementById('membershipSettingsContent');
    if (content) {
        content.style.opacity = enabled ? '1' : '0.5';
        content.style.pointerEvents = enabled ? 'auto' : 'none';
    }
}
window.toggleMembershipProgram = toggleMembershipProgram;

// Update preview badges
function updateMembershipPreview() {
    const previewContainer = document.getElementById('membershipTierPreview');
    if (!previewContainer) return;
    
    let html = '';
    const tierKeys = ['regular', 'silver', 'gold', 'vip'];
    
    tierKeys.forEach((key, index) => {
        const tierNum = index + 1;
        const icon = document.getElementById(`tier${tierNum}Icon`)?.value || '👤';
        const name = document.getElementById(`tier${tierNum}Name`)?.value || key;
        const color = document.getElementById(`tier${tierNum}Color`)?.value || '#9ca3af';
        const discount = parseInt(document.getElementById(`tier${tierNum}Discount`)?.value) || 0;
        
        html += `
            <span style="display: inline-flex; align-items: center; gap: 4px; padding: 4px 10px; 
                         background: ${color}; color: white; border-radius: 12px; font-size: 12px; font-weight: 600;">
                ${icon} ${name}
                ${discount > 0 ? `<span style="opacity: 0.8; font-size: 10px;">(${discount}%)</span>` : ''}
            </span>
        `;
    });
    
    previewContainer.innerHTML = html;
}
window.updateMembershipPreview = updateMembershipPreview;

// Save membership settings
function saveMembershipSettings() {
    const config = {
        enabled: document.getElementById('membershipEnabled')?.checked ?? true,
        pointsPerRM: parseFloat(document.getElementById('membershipPointsPerRM')?.value) || 1,
        pointsToRM: parseInt(document.getElementById('membershipPointsToRM')?.value) || 100,
        birthdayBonus: parseInt(document.getElementById('membershipBirthdayBonus')?.value) ?? 100,
        tiers: {}
    };
    
    const tierKeys = ['regular', 'silver', 'gold', 'vip'];
    tierKeys.forEach((key, index) => {
        const tierNum = index + 1;
        config.tiers[key] = {
            icon: document.getElementById(`tier${tierNum}Icon`)?.value || DEFAULT_MEMBERSHIP_CONFIG.tiers[key].icon,
            label: document.getElementById(`tier${tierNum}Name`)?.value || DEFAULT_MEMBERSHIP_CONFIG.tiers[key].label,
            minSpent: parseInt(document.getElementById(`tier${tierNum}MinSpent`)?.value) || 0,
            discount: parseInt(document.getElementById(`tier${tierNum}Discount`)?.value) || 0,
            color: document.getElementById(`tier${tierNum}Color`)?.value || DEFAULT_MEMBERSHIP_CONFIG.tiers[key].color
        };
    });
    
    // Update global MEMBERSHIP_CONFIG
    MEMBERSHIP_CONFIG.enabled = config.enabled;
    MEMBERSHIP_CONFIG.pointsPerRM = config.pointsPerRM;
    MEMBERSHIP_CONFIG.pointsToRM = config.pointsToRM;
    MEMBERSHIP_CONFIG.birthdayBonus = config.birthdayBonus;
    tierKeys.forEach(key => {
        MEMBERSHIP_CONFIG.tiers[key] = {
            min: config.tiers[key].minSpent,
            minSpent: config.tiers[key].minSpent,
            label: config.tiers[key].label,
            color: config.tiers[key].color,
            discount: config.tiers[key].discount,
            icon: config.tiers[key].icon
        };
    });
    
    // Save to businessData.settings
    if (!businessData.settings) businessData.settings = {};
    businessData.settings.membershipConfig = config;
    
    // Save to localStorage
    localStorage.setItem('ezcubic_businessData', JSON.stringify(businessData));
    
    // Also save to tenant storage if available
    const user = window.currentUser;
    if (user && user.tenantId) {
        const tenantKey = 'ezcubic_tenant_' + user.tenantId;
        const tenantData = JSON.parse(localStorage.getItem(tenantKey) || '{}');
        if (!tenantData.settings) tenantData.settings = {};
        tenantData.settings.membershipConfig = config;
        localStorage.setItem(tenantKey, JSON.stringify(tenantData));
    }
    
    showToast('✅ Membership settings saved!', 'success');
    
    // Refresh CRM display if on CRM page
    if (typeof renderCRMCustomers === 'function') {
        renderCRMCustomers();
    }
}
window.saveMembershipSettings = saveMembershipSettings;

// Reset to defaults
function resetMembershipDefaults() {
    if (!confirm('Reset all membership settings to defaults?')) return;
    
    // Reset form fields to defaults
    document.getElementById('membershipEnabled').checked = true;
    document.getElementById('membershipPointsPerRM').value = 1;
    document.getElementById('membershipPointsToRM').value = 100;
    document.getElementById('membershipBirthdayBonus').value = 100;
    
    const tierKeys = ['regular', 'silver', 'gold', 'vip'];
    tierKeys.forEach((key, index) => {
        const tierNum = index + 1;
        const defaults = DEFAULT_MEMBERSHIP_CONFIG.tiers[key];
        
        document.getElementById(`tier${tierNum}Icon`).value = defaults.icon;
        document.getElementById(`tier${tierNum}Name`).value = defaults.label;
        if (tierNum > 1) {
            document.getElementById(`tier${tierNum}MinSpent`).value = defaults.minSpent;
        }
        document.getElementById(`tier${tierNum}Discount`).value = defaults.discount;
        document.getElementById(`tier${tierNum}Color`).value = defaults.color;
    });
    
    updateMembershipPreview();
    toggleMembershipProgram();
    
    showToast('Settings reset to defaults. Click Save to apply.', 'info');
}
window.resetMembershipDefaults = resetMembershipDefaults;

// Initialize membership settings on page load
function initMembershipSettings() {
    // Delay to ensure DOM is ready
    setTimeout(() => {
        loadMembershipSettings();
    }, 500);
}

// Call init when settings page is shown
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initMembershipSettings);
} else {
    initMembershipSettings();
}

// ==================== WINDOW EXPORTS ====================
window.initializeCRM = initializeCRM;
window.loadCRMCustomers = loadCRMCustomers;
window.saveCRMCustomers = saveCRMCustomers;
window.renderCRMCustomers = renderCRMCustomers;
window.updateCRMStats = updateCRMStats;
window.showCRMCustomerModal = showCRMCustomerModal;
window.saveCRMCustomer = saveCRMCustomer;
window.deleteCRMCustomer = deleteCRMCustomer;
window.searchCRMCustomers = searchCRMCustomers;
window.filterCRMCustomers = filterCRMCustomers;
window.showCRMCustomerDetail = showCRMCustomerDetail;
window.getCRMCustomersForSelect = getCRMCustomersForSelect;
window.updateCRMCustomerCredit = updateCRMCustomerCredit;
window.receiveCRMPayment = receiveCRMPayment;
window.showReceivePaymentModal = showReceivePaymentModal;
window.submitReceivePayment = submitReceivePayment;
window.exportCRMCustomers = exportCustomersCRM; // Alias
window.setCRMView = setCRMView;
window.initCRMViewMode = initCRMViewMode;

// Membership exports (for POS integration)
window.MEMBERSHIP_CONFIG = MEMBERSHIP_CONFIG;
window.addCustomerPoints = addCustomerPoints;
window.redeemCustomerPoints = redeemCustomerPoints;
window.getCustomerMembership = getCustomerMembership;
window.calculateMembershipTier = calculateMembershipTier;
window.getTierInfo = getTierInfo;
window.loadMembershipSettings = loadMembershipSettings;
