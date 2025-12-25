// ==================== APP-OUTLETS.JS ====================
// Outlet Management Functions
// Part B of app.js split

// ==================== OUTLET MANAGEMENT ====================
function loadOutlets() {
    // PRIORITY 1: Load from tenant storage directly
    const user = window.currentUser;
    if (user && user.tenantId) {
        const tenantKey = 'ezcubic_tenant_' + user.tenantId;
        const tenantData = JSON.parse(localStorage.getItem(tenantKey) || '{}');
        if (Array.isArray(tenantData.outlets) && tenantData.outlets.length > 0) {
            outlets = tenantData.outlets;
            window.outlets = outlets;
            console.log('✅ Outlets loaded from tenant:', outlets.length);
            renderOutletDropdowns();
            return;
        }
    }
    
    // PRIORITY 2: Load from localStorage
    const stored = localStorage.getItem(OUTLETS_KEY);
    if (stored) {
        outlets = JSON.parse(stored);
        console.log('✅ Outlets loaded from localStorage:', outlets.length);
    } else {
        // Default outlets - only create if nothing exists
        outlets = [
            { id: 'outlet1', name: 'Main Branch', status: 'active' }
        ];
        saveOutlets();
    }
    window.outlets = outlets;
    renderOutletDropdowns();
}

function saveOutlets() {
    localStorage.setItem(OUTLETS_KEY, JSON.stringify(outlets));
    window.outlets = outlets;
    
    // DIRECT tenant save
    const user = window.currentUser;
    if (user && user.tenantId) {
        const tenantKey = 'ezcubic_tenant_' + user.tenantId;
        let tenantData = JSON.parse(localStorage.getItem(tenantKey) || '{}');
        tenantData.outlets = outlets;
        tenantData.updatedAt = new Date().toISOString();
        localStorage.setItem(tenantKey, JSON.stringify(tenantData));
        console.log('✅ Outlets saved directly to tenant:', outlets.length);
    }
}

function renderOutletDropdowns() {
    // Get elements
    const productOutletCheckboxes = document.getElementById('productOutletCheckboxes');
    const posOutletFilter = document.getElementById('posOutletFilter');
    const posOutletFilterContainer = posOutletFilter?.closest('.pos-outlet-filter');
    const manageOutletsBtn = productOutletCheckboxes?.parentElement?.querySelector('button[onclick*="showOutletModal"]');
    const posManageOutletsBtn = posOutletFilterContainer?.querySelector('button[onclick*="showOutletModal"]');
    
    // ALWAYS hide the manage outlets button in product form - outlets/branches are managed in Branches section
    if (manageOutletsBtn) {
        manageOutletsBtn.style.display = 'none';
    }
    
    // Default: restricted (safe default)
    let isRestricted = true;
    let branchLimit = 1;
    
    // Get current user's plan and check limits
    const currentUser = window.currentUser || (typeof getCurrentUser === 'function' ? getCurrentUser() : null);
    const settings = typeof getPlatformSettings === 'function' ? getPlatformSettings() : null;
    
    console.log('renderOutletDropdowns - currentUser:', currentUser?.name, 'role:', currentUser?.role, 'plan:', currentUser?.plan);
    
    if (currentUser) {
        // Founder and ERP Assistant have unlimited access
        if (currentUser.role === 'founder' || currentUser.role === 'erp_assistant') {
            isRestricted = false;
            branchLimit = -1; // Unlimited
        } else {
            const userPlan = currentUser.plan || 'starter';
            
            // Check plan directly - Professional and Enterprise always get multi-outlet
            if (userPlan === 'professional' || userPlan === 'enterprise') {
                isRestricted = false;
            }
            
            // Also check via settings if available
            if (settings && settings.plans) {
                const planData = settings.plans[userPlan];
                if (planData && planData.limits) {
                    branchLimit = planData.limits.branches;
                    // Unrestricted if branches > 1 or unlimited (-1)
                    if (branchLimit === -1 || branchLimit > 1) {
                        isRestricted = false;
                    }
                }
            }
        }
    }
    
    console.log('renderOutletDropdowns - isRestricted:', isRestricted, 'branchLimit:', branchLimit);
    
    // Use branches as the source (synced from Branches module)
    const availableBranches = window.branches || [];
    console.log('renderOutletDropdowns - availableBranches:', availableBranches.length);
    
    // Handle POS outlet filter section
    if (posOutletFilterContainer) {
        if (isRestricted || availableBranches.length <= 1) {
            // Hide entire POS outlet filter section for plans without multi-outlet or single branch
            posOutletFilterContainer.style.display = 'none';
        } else {
            // Show outlet filter
            posOutletFilterContainer.style.display = '';
            
            // Hide manage button on POS
            if (posManageOutletsBtn) {
                posManageOutletsBtn.style.display = 'none';
            }
            
            // Populate outlet options from branches
            const optionsHTML = availableBranches
                .filter(b => b.status === 'active')
                .map(b => `<option value="${b.id}">${escapeHtml(b.name)}</option>`)
                .join('');
            
            const currentValue = posOutletFilter.value;
            posOutletFilter.innerHTML = `<option value="all">All Outlets</option>${optionsHTML}`;
            if (currentValue) posOutletFilter.value = currentValue;
        }
    }
    
    // Generate checkboxes for product form using branches
    if (productOutletCheckboxes) {
        if (isRestricted) {
            productOutletCheckboxes.innerHTML = `
                <div style="padding: 12px; background: #fef3c7; border-radius: 8px; color: #92400e; font-size: 13px; border: 1px solid #fcd34d;">
                    <i class="fas fa-lock" style="margin-right: 8px; color: #f59e0b;"></i>
                    <strong>Multi-outlet feature</strong> requires Professional plan (with branches) or Enterprise plan.
                    <input type="checkbox" value="all" checked style="display: none;">
                </div>
            `;
        } else if (availableBranches.length === 0) {
            // No branches created yet
            productOutletCheckboxes.innerHTML = `
                <div style="padding: 12px; background: #e0f2fe; border-radius: 8px; color: #0369a1; font-size: 13px; border: 1px solid #7dd3fc;">
                    <i class="fas fa-info-circle" style="margin-right: 8px;"></i>
                    No outlets/branches created yet. Go to <strong>Branches</strong> section to add outlets.
                    <input type="checkbox" value="all" checked style="display: none;">
                </div>
            `;
        } else {
            // Show branches as checkboxes (read-only selection, no add/remove)
            const activeBranches = availableBranches.filter(b => b.status === 'active');
            const maxSelectable = branchLimit === -1 ? -1 : branchLimit;
            
            const checkboxesHTML = `
                <label class="outlet-checkbox-item checked" onclick="toggleOutletCheckbox(this, ${maxSelectable})">
                    <input type="checkbox" value="all" checked>
                    <i class="fas fa-check"></i>
                    <span>All Outlets</span>
                </label>
                ${activeBranches.map(b => `
                    <label class="outlet-checkbox-item" onclick="toggleOutletCheckbox(this, ${maxSelectable})">
                        <input type="checkbox" value="${b.id}">
                        <i class="fas fa-check"></i>
                        <span>${escapeHtml(b.name)} (${escapeHtml(b.code || '')})</span>
                    </label>
                `).join('')}
                ${branchLimit !== -1 ? `
                    <div style="width: 100%; font-size: 11px; color: #64748b; margin-top: 5px;">
                        <i class="fas fa-info-circle"></i> Your plan allows up to ${branchLimit} outlets. Manage outlets in Branches section.
                    </div>
                ` : `
                    <div style="width: 100%; font-size: 11px; color: #64748b; margin-top: 5px;">
                        <i class="fas fa-info-circle"></i> Manage outlets in Branches section.
                    </div>
                `}
            `;
            productOutletCheckboxes.innerHTML = checkboxesHTML;
        }
    }
}

function toggleOutletCheckbox(label, maxSelectable = -1) {
    const checkbox = label.querySelector('input[type="checkbox"]');
    const isAllOutlets = checkbox.value === 'all';
    const container = label.closest('.outlet-checkbox-container');
    
    if (isAllOutlets) {
        // If clicking "All Outlets", uncheck all others
        if (!checkbox.checked) {
            checkbox.checked = true;
            label.classList.add('checked');
            // Uncheck all other checkboxes
            container.querySelectorAll('input[type="checkbox"]').forEach(cb => {
                if (cb.value !== 'all') {
                    cb.checked = false;
                    cb.closest('label').classList.remove('checked');
                }
            });
        }
    } else {
        // Check if we're at the limit before allowing selection
        if (!checkbox.checked && maxSelectable !== -1) {
            const currentlySelected = container.querySelectorAll('input[type="checkbox"]:checked:not([value="all"])').length;
            if (currentlySelected >= maxSelectable) {
                if (typeof showToast === 'function') {
                    showToast(`Your plan allows max ${maxSelectable} outlets. Upgrade for more.`, 'warning');
                }
                return; // Don't allow selecting more
            }
        }
        
        // Toggle this checkbox
        checkbox.checked = !checkbox.checked;
        label.classList.toggle('checked', checkbox.checked);
        
        // If any specific outlet is checked, uncheck "All Outlets"
        const allCheckbox = container.querySelector('input[value="all"]');
        const specificChecked = container.querySelectorAll('input[type="checkbox"]:checked:not([value="all"])').length > 0;
        
        if (specificChecked) {
            allCheckbox.checked = false;
            allCheckbox.closest('label').classList.remove('checked');
        } else {
            // If nothing selected, default to "All Outlets"
            allCheckbox.checked = true;
            allCheckbox.closest('label').classList.add('checked');
        }
    }
}

function getSelectedOutlets() {
    const container = document.getElementById('productOutletCheckboxes');
    if (!container) return ['all'];
    
    const checkedBoxes = container.querySelectorAll('input[type="checkbox"]:checked');
    const values = Array.from(checkedBoxes).map(cb => cb.value);
    
    // If "all" is selected or nothing selected, return ['all']
    if (values.includes('all') || values.length === 0) {
        return ['all'];
    }
    return values;
}

function setSelectedOutlets(outletIds) {
    const container = document.getElementById('productOutletCheckboxes');
    if (!container) return;
    
    // If container only has the locked message (restricted plan), skip
    const checkboxes = container.querySelectorAll('input[type="checkbox"]:not([style*="display: none"])');
    if (checkboxes.length === 0) return;
    
    // Normalize to array
    let ids = outletIds;
    if (!Array.isArray(ids)) {
        ids = ids ? [ids] : ['all'];
    }
    if (ids.length === 0) ids = ['all'];
    
    // Uncheck all first
    container.querySelectorAll('input[type="checkbox"]').forEach(cb => {
        cb.checked = false;
        const label = cb.closest('label');
        if (label) label.classList.remove('checked');
    });
    
    // Check the specified outlets
    ids.forEach(id => {
        const cb = container.querySelector(`input[value="${id}"]`);
        if (cb) {
            cb.checked = true;
            const label = cb.closest('label');
            if (label) label.classList.add('checked');
        }
    });
}

function showOutletModal() {
    renderOutletList();
    const outletModal = document.getElementById('outletModal');
    if (outletModal) {
        outletModal.style.display = '';
        outletModal.classList.add('show');
    }
    
    const newOutletInput = document.getElementById('newOutletName');
    const addButton = newOutletInput?.nextElementSibling;
    const addSection = newOutletInput?.closest('div[style*="margin-bottom"]');
    
    // Check branch/outlet limit and show/hide add section
    if (typeof checkLimit === 'function') {
        const limitInfo = checkLimit('branches');
        const totalOutlets = outlets.length + (typeof branches !== 'undefined' ? branches.length : 0);
        
        if (limitInfo && limitInfo.limit !== -1 && totalOutlets >= limitInfo.limit) {
            // At limit - replace add section with upgrade message
            if (addSection) {
                addSection.innerHTML = `
                    <div style="padding: 15px; background: #fef3c7; border-radius: 8px; text-align: center;">
                        <i class="fas fa-exclamation-triangle" style="color: #f59e0b;"></i>
                        <p style="color: #92400e; margin: 8px 0 0;">
                            Branch/Outlet limit reached (${limitInfo.limit}).<br>
                            <a href="#" onclick="closeModal('outletModal'); if(typeof showUpgradePlanModal === 'function') showUpgradePlanModal('branches'); return false;" style="color: #2563eb; font-weight: 600;">Upgrade your plan</a> for more branches/outlets.
                        </p>
                    </div>
                `;
            }
            return;
        }
    }
    
    // Reset the add section if it was replaced
    if (addSection && !addSection.querySelector('#newOutletName')) {
        addSection.innerHTML = `
            <label class="form-label">Add New Outlet</label>
            <div style="display: flex; gap: 8px;">
                <input type="text" id="newOutletName" class="form-control" placeholder="e.g., Main Branch, Outlet KL">
                <button type="button" class="btn-primary" onclick="addOutlet()">
                    <i class="fas fa-plus"></i> Add
                </button>
            </div>
        `;
    }
    
    document.getElementById('newOutletName')?.focus();
}

function renderOutletList() {
    const container = document.getElementById('outletList');
    if (!container) return;
    
    if (outlets.length === 0) {
        container.innerHTML = '<p style="color: #94a3b8; text-align: center; padding: 20px;">No outlets added yet</p>';
        return;
    }
    
    container.innerHTML = outlets.map(outlet => `
        <div class="outlet-item" style="display: flex; align-items: center; justify-content: space-between; padding: 12px; background: #f8fafc; border-radius: 8px; margin-bottom: 8px;">
            <div style="display: flex; align-items: center; gap: 10px;">
                <i class="fas fa-store" style="color: #2563eb;"></i>
                <span style="font-weight: 500;">${escapeHtml(outlet.name)}</span>
            </div>
            <div style="display: flex; gap: 5px;">
                <button type="button" class="btn-outline btn-sm" onclick="editOutlet('${outlet.id}')" title="Edit">
                    <i class="fas fa-edit"></i>
                </button>
                <button type="button" class="btn-outline btn-sm danger" onclick="deleteOutlet('${outlet.id}')" title="Delete">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
    `).join('');
}

function addOutlet() {
    // Check branch/outlet limit before adding
    if (typeof canAdd === 'function' && !canAdd('branches')) {
        closeModal('outletModal');
        return; // Limit reached, modal shown by canAdd()
    }
    
    const nameInput = document.getElementById('newOutletName');
    const name = nameInput.value.trim();
    
    if (!name) {
        showToast('Please enter an outlet name', 'error');
        return;
    }
    
    // Check for duplicate
    if (outlets.some(o => o.name.toLowerCase() === name.toLowerCase())) {
        showToast('Outlet with this name already exists', 'error');
        return;
    }
    
    const newOutlet = {
        id: 'outlet_' + Date.now(),
        name: name
    };
    
    outlets.push(newOutlet);
    saveOutlets();
    renderOutletDropdowns();
    renderOutletList();
    
    nameInput.value = '';
    showToast('Outlet added successfully!', 'success');
}

function editOutlet(outletId) {
    const outlet = outlets.find(o => o.id === outletId);
    if (!outlet) return;
    
    const newName = prompt('Edit outlet name:', outlet.name);
    if (newName === null) return;
    
    const trimmedName = newName.trim();
    if (!trimmedName) {
        showToast('Outlet name cannot be empty', 'error');
        return;
    }
    
    // Check for duplicate (excluding current)
    if (outlets.some(o => o.id !== outletId && o.name.toLowerCase() === trimmedName.toLowerCase())) {
        showToast('Outlet with this name already exists', 'error');
        return;
    }
    
    outlet.name = trimmedName;
    saveOutlets();
    renderOutletDropdowns();
    renderOutletList();
    showToast('Outlet updated!', 'success');
}

function deleteOutlet(outletId) {
    const outlet = outlets.find(o => o.id === outletId);
    if (!outlet) return;
    
    if (!confirm(`Delete outlet "${outlet.name}"? Products assigned to this outlet will still exist.`)) {
        return;
    }
    
    outlets = outlets.filter(o => o.id !== outletId);
    saveOutlets();
    renderOutletDropdowns();
    renderOutletList();
    showToast('Outlet deleted!', 'success');
}

// ==================== WINDOW EXPORTS ====================
window.loadOutlets = loadOutlets;
window.saveOutlets = saveOutlets;
window.renderOutletDropdowns = renderOutletDropdowns;
window.toggleOutletCheckbox = toggleOutletCheckbox;
window.getSelectedOutlets = getSelectedOutlets;
window.setSelectedOutlets = setSelectedOutlets;
window.showOutletModal = showOutletModal;
window.renderOutletList = renderOutletList;
window.addOutlet = addOutlet;
window.editOutlet = editOutlet;
window.deleteOutlet = deleteOutlet;
