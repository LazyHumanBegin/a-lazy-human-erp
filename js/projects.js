/**
 * EZCubic Smart Accounting - Project Invoice Module
 * For large projects with milestone/installment payments
 */

const PROJECTS_KEY = 'ezcubic_projects';
let projects = [];

// ==================== INITIALIZATION ====================
function initializeProjects() {
    loadProjects();
    renderProjects();
    updateProjectStats();
}

function loadProjects() {
    try {
        // PRIORITY 1: Load from tenant storage (for data isolation per account)
        const user = window.currentUser;
        if (user && user.tenantId) {
            const tenantKey = 'ezcubic_tenant_' + user.tenantId;
            const tenantData = JSON.parse(localStorage.getItem(tenantKey) || '{}');
            if (Array.isArray(tenantData.projects) && tenantData.projects.length > 0) {
                projects = tenantData.projects;
                window.projects = projects;
                console.log('✅ Projects loaded from tenant:', projects.length);
                return;
            }
        }
        
        // PRIORITY 2: Check window.projects (set by tenant data loading)
        if (Array.isArray(window.projects) && window.projects.length > 0) {
            projects = window.projects;
            console.log('✅ Projects loaded from window:', projects.length);
            return;
        }
        
        // PRIORITY 3: Fall back to localStorage key
        const stored = localStorage.getItem(PROJECTS_KEY);
        const parsed = stored ? JSON.parse(stored) : [];
        projects = Array.isArray(parsed) ? parsed : [];
        console.log('✅ Projects loaded from localStorage:', projects.length);
    } catch (e) {
        console.error('Error loading projects:', e);
        projects = [];
    }
    window.projects = projects;
}

function saveProjects() {
    localStorage.setItem(PROJECTS_KEY, JSON.stringify(projects));
    
    // Sync to window for other modules
    window.projects = projects;
    
    // DIRECT tenant save for data persistence
    const user = window.currentUser;
    if (user && user.tenantId) {
        const tenantKey = 'ezcubic_tenant_' + user.tenantId;
        let tenantData = JSON.parse(localStorage.getItem(tenantKey) || '{}');
        tenantData.projects = projects;
        tenantData.updatedAt = new Date().toISOString();
        localStorage.setItem(tenantKey, JSON.stringify(tenantData));
        console.log('✅ Projects saved to tenant:', projects.length);
        
        // Trigger cloud sync
        if (typeof window.fullCloudSync === 'function') {
            setTimeout(() => {
                window.fullCloudSync().catch(e => console.warn('Cloud sync failed:', e));
            }, 500);
        }
    }
}

// ==================== PROJECT STATS ====================
function updateProjectStats() {
    const activeEl = document.getElementById('projectsActive');
    const totalValueEl = document.getElementById('projectsTotalValue');
    const receivedEl = document.getElementById('projectsReceived');
    const pendingEl = document.getElementById('projectsPending');
    
    // Ensure projects is an array
    if (!Array.isArray(projects)) projects = [];
    
    const activeProjects = projects.filter(p => p.status !== 'completed' && p.status !== 'cancelled');
    const totalValue = projects.reduce((sum, p) => sum + (p.totalAmount || 0), 0);
    const totalReceived = projects.reduce((sum, p) => sum + (p.amountPaid || 0), 0);
    const totalPending = totalValue - totalReceived;
    
    if (activeEl) activeEl.textContent = activeProjects.length;
        if (totalValueEl) totalValueEl.textContent = formatRM(totalValue);
        if (receivedEl) receivedEl.textContent = formatRM(totalReceived);
        if (pendingEl) pendingEl.textContent = formatRM(totalPending);
}

// ==================== PROJECT MODAL ====================
function showProjectModal(projectId = null) {
    const modal = document.getElementById('projectModal');
    const title = document.getElementById('projectModalTitle');
    const form = document.getElementById('projectForm');
    
    // Reset form
    form.reset();
    document.getElementById('projectId').value = '';
    
    // Load CRM customers
    loadProjectCustomers();
    
    // Load salesperson dropdown
    loadProjectSalespersons();
    
    if (projectId) {
        const project = projects.find(p => p.id === projectId);
        if (project) {
            title.textContent = 'Edit Project';
            document.getElementById('projectId').value = project.id;
            document.getElementById('projectName').value = project.name || '';
            document.getElementById('projectCustomer').value = project.customerId || '';
            document.getElementById('projectSalesperson').value = project.salesperson || '';
            document.getElementById('projectDescription').value = project.description || '';
            document.getElementById('projectTotalAmount').value = project.totalAmount || '';
            document.getElementById('projectStartDate').value = project.startDate || '';
            document.getElementById('projectEndDate').value = project.endDate || '';
            document.getElementById('projectStatus').value = project.status || 'quotation';
            
            // Load milestones
            renderMilestoneInputs(project.milestones || []);
        }
    } else {
        title.textContent = 'New Project';
        document.getElementById('projectStartDate').value = new Date().toISOString().split('T')[0];
        
        // Default milestones template
        renderMilestoneInputs([
            { name: 'Deposit', percentage: 30, dueDate: '', status: 'pending' },
            { name: 'Progress Payment', percentage: 40, dueDate: '', status: 'pending' },
            { name: 'Final Payment', percentage: 30, dueDate: '', status: 'pending' }
        ]);
    }
    
    modal.style.display = '';
    modal.classList.add('show');
}

function loadProjectCustomers() {
    const select = document.getElementById('projectCustomer');
    if (!select) return;
    
    // Get CRM customers
    const crmList = typeof getCRMCustomersForSelect === 'function' ? getCRMCustomersForSelect() : [];
    
    select.innerHTML = `<option value="">-- Select Customer --</option>`;
    
    if (crmList.length > 0) {
        select.innerHTML += crmList.map(c => `
            <option value="${c.id}">${escapeHtml(c.name)}${c.company ? ` (${escapeHtml(c.company)})` : ''}</option>
        `).join('');
    }
}

function loadProjectSalespersons() {
    const select = document.getElementById('projectSalesperson');
    if (!select) return;
    
    select.innerHTML = `<option value="">-- Select Salesperson --</option>`;
    
    // Get current user and their tenant
    const currentUser = typeof getCurrentUser === 'function' ? getCurrentUser() : null;
    const currentTenantId = currentUser?.tenantId || null;
    
    // Collect all salespersons for this tenant
    let salespersons = [];
    
    // 1. Add current logged-in user
    if (currentUser && currentUser.name) {
        salespersons.push({ name: currentUser.name, role: currentUser.role });
    }
    
    // 2. Add users from same tenant (manager, staff)
    if (currentTenantId && typeof getUsers === 'function') {
        const allUsers = getUsers();
        const tenantUsers = allUsers.filter(u => 
            u.tenantId === currentTenantId && 
            u.status === 'active' &&
            u.id !== currentUser?.id &&
            (u.role === 'manager' || u.role === 'staff' || u.role === 'business_admin')
        );
        tenantUsers.forEach(u => {
            salespersons.push({ name: u.name, role: u.role });
        });
    }
    
    // 3. Add employees from payroll (tenant-filtered)
    if (typeof getEmployees === 'function') {
        const employeeList = getEmployees().filter(e => e.status === 'active');
        employeeList.forEach(e => {
            if (!salespersons.some(s => s.name.toLowerCase() === e.name.toLowerCase())) {
                salespersons.push({ name: e.name, role: e.position || 'Employee' });
            }
        });
    }
    
    if (salespersons.length > 0) {
        select.innerHTML += salespersons.map(s => `
            <option value="${escapeHtml(s.name)}">${escapeHtml(s.name)}${s.role ? ` (${escapeHtml(s.role)})` : ''}</option>
        `).join('');
    }
}

function renderMilestoneInputs(milestones = []) {
    const container = document.getElementById('milestonesContainer');
    if (!container) return;
    
    container.innerHTML = milestones.map((m, index) => `
        <div class="milestone-input-row" data-index="${index}">
            <input type="text" class="form-control milestone-name" value="${escapeHtml(m.name || '')}" placeholder="Milestone name">
            <input type="number" class="form-control milestone-percent" value="${m.percentage || ''}" placeholder="%" min="0" max="100" step="1">
            <input type="date" class="form-control milestone-date" value="${m.dueDate || ''}">
            <button type="button" class="btn-outline btn-sm danger" onclick="removeMilestoneInput(${index})">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `).join('');
    
    updateMilestoneTotal();
}

function addMilestoneInput() {
    const container = document.getElementById('milestonesContainer');
    const rows = container.querySelectorAll('.milestone-input-row');
    const index = rows.length;
    
    const newRow = document.createElement('div');
    newRow.className = 'milestone-input-row';
    newRow.dataset.index = index;
    newRow.innerHTML = `
        <input type="text" class="form-control milestone-name" value="" placeholder="Milestone name">
        <input type="number" class="form-control milestone-percent" value="" placeholder="%" min="0" max="100" step="1">
        <input type="date" class="form-control milestone-date" value="">
        <button type="button" class="btn-outline btn-sm danger" onclick="removeMilestoneInput(${index})">
            <i class="fas fa-times"></i>
        </button>
    `;
    container.appendChild(newRow);
    updateMilestoneTotal();
}

function removeMilestoneInput(index) {
    const container = document.getElementById('milestonesContainer');
    const rows = container.querySelectorAll('.milestone-input-row');
    if (rows.length > 1) {
        rows[index]?.remove();
        updateMilestoneTotal();
    } else {
        showToast('At least one milestone is required', 'warning');
    }
}

function updateMilestoneTotal() {
    const percentInputs = document.querySelectorAll('.milestone-percent');
    let total = 0;
    percentInputs.forEach(input => {
        total += parseFloat(input.value) || 0;
    });
    
    const totalEl = document.getElementById('milestoneTotal');
    if (totalEl) {
        totalEl.textContent = `${total}%`;
        totalEl.style.color = total === 100 ? '#10b981' : '#ef4444';
    }
}

// ==================== SAVE PROJECT ====================
function saveProject(event) {
    event.preventDefault();
    
    const id = document.getElementById('projectId').value;
    const name = document.getElementById('projectName').value.trim();
    const customerId = document.getElementById('projectCustomer').value;
    const totalAmount = parseFloat(document.getElementById('projectTotalAmount').value) || 0;
    
    if (!name) {
        showToast('Project name is required!', 'error');
        return;
    }
    
    if (totalAmount <= 0) {
        showToast('Total amount must be greater than 0!', 'error');
        return;
    }
    
    // Collect milestones
    const milestones = [];
    const rows = document.querySelectorAll('.milestone-input-row');
    let totalPercent = 0;
    
    rows.forEach((row, index) => {
        const milestoneName = row.querySelector('.milestone-name').value.trim();
        const percentage = parseFloat(row.querySelector('.milestone-percent').value) || 0;
        const dueDate = row.querySelector('.milestone-date').value;
        
        if (milestoneName && percentage > 0) {
            milestones.push({
                id: `M${index + 1}`,
                name: milestoneName,
                percentage: percentage,
                amount: (totalAmount * percentage / 100),
                dueDate: dueDate,
                status: 'pending',
                paidAmount: 0,
                paidDate: null
            });
            totalPercent += percentage;
        }
    });
    
    if (totalPercent !== 100) {
        showToast(`Milestone percentages must total 100% (currently ${totalPercent}%)`, 'error');
        return;
    }
    
    // Get customer name
    let customerName = '';
    if (customerId && typeof getCRMCustomersForSelect === 'function') {
        const customers = getCRMCustomersForSelect();
        const customer = customers.find(c => c.id === customerId);
        if (customer) customerName = customer.name;
    }
    
    const projectData = {
        name: name,
        customerId: customerId,
        customerName: customerName,
        salesperson: document.getElementById('projectSalesperson')?.value || '',
        description: document.getElementById('projectDescription').value.trim(),
        totalAmount: totalAmount,
        startDate: document.getElementById('projectStartDate').value,
        endDate: document.getElementById('projectEndDate').value,
        status: document.getElementById('projectStatus').value,
        milestones: milestones,
        amountPaid: 0,
        payments: []
    };
    
    if (id) {
        // Update existing
        const index = projects.findIndex(p => p.id === id);
        if (index !== -1) {
            // Preserve payment history
            projectData.amountPaid = projects[index].amountPaid || 0;
            projectData.payments = projects[index].payments || [];
            projectData.milestones = projectData.milestones.map((m, i) => {
                const existingMilestone = projects[index].milestones?.[i];
                if (existingMilestone && existingMilestone.name === m.name) {
                    m.paidAmount = existingMilestone.paidAmount || 0;
                    m.paidDate = existingMilestone.paidDate;
                    m.status = existingMilestone.status;
                }
                return m;
            });
            projectData.updatedAt = new Date().toISOString();
            projects[index] = { ...projects[index], ...projectData };
        }
    } else {
        // Create new
        projectData.id = generateUUID();
        projectData.projectNo = generateProjectNumber();
        projectData.createdAt = new Date().toISOString();
        projectData.updatedAt = new Date().toISOString();
        projects.push(projectData);
    }
    
    saveProjects();
    renderProjects();
    updateProjectStats();
    closeModal('projectModal');
    
    showToast(id ? 'Project updated!' : 'Project created!', 'success');
}

function generateProjectNumber() {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const sequence = (projects.length + 1).toString().padStart(3, '0');
    return `PRJ-${year}${month}-${sequence}`;
}

// ==================== RENDER PROJECTS ====================
function renderProjects() {
    const container = document.getElementById('projectsGrid');
    if (!container) return;
    
    // Ensure projects is an array
    if (!Array.isArray(projects)) projects = [];
    
    const searchTerm = document.getElementById('projectSearch')?.value?.toLowerCase() || '';
    const statusFilter = document.getElementById('projectStatusFilter')?.value || '';
    
    let filtered = projects.filter(project => {
        const matchesSearch = !searchTerm || 
            project.name.toLowerCase().includes(searchTerm) ||
            project.projectNo?.toLowerCase().includes(searchTerm) ||
            (project.customerName && project.customerName.toLowerCase().includes(searchTerm));
        const matchesStatus = !statusFilter || project.status === statusFilter;
        return matchesSearch && matchesStatus;
    });
    
    if (filtered.length === 0) {
        container.innerHTML = `
            <div class="projects-empty">
                <i class="fas fa-project-diagram"></i>
                <p>${projects.length === 0 ? 'No projects yet. Create your first project!' : 'No projects found matching your filters.'}</p>
            </div>
        `;
        return;
    }
    
    // Sort by most recent
    filtered.sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt));
    
    const statusLabels = {
        'quotation': { label: 'Quotation', color: '#94a3b8', icon: 'file-alt' },
        'confirmed': { label: 'Confirmed', color: '#2563eb', icon: 'check-circle' },
        'in-progress': { label: 'In Progress', color: '#f59e0b', icon: 'spinner' },
        'completed': { label: 'Completed', color: '#10b981', icon: 'check-double' },
        'cancelled': { label: 'Cancelled', color: '#ef4444', icon: 'times-circle' }
    };
    
    container.innerHTML = filtered.map(project => {
        const status = statusLabels[project.status] || statusLabels.quotation;
        const progress = project.totalAmount > 0 ? ((project.amountPaid || 0) / project.totalAmount * 100) : 0;
        const remaining = project.totalAmount - (project.amountPaid || 0);
        
        return `
            <div class="project-card" data-project-id="${project.id}" style="cursor: pointer;">
                <div class="project-card-header">
                    <div class="project-info">
                        <span class="project-no">${project.projectNo || 'N/A'}</span>
                        <h4 class="project-name">${escapeHtml(project.name)}</h4>
                        <span class="project-customer">${project.customerName ? escapeHtml(project.customerName) : 'No customer'}</span>
                        ${project.salesperson ? `<span class="project-salesperson" style="display: block; font-size: 12px; color: #64748b; margin-top: 2px;"><i class="fas fa-user-tie"></i> ${escapeHtml(project.salesperson)}</span>` : ''}
                    </div>
                    <div class="project-status" style="background: ${status.color};">
                        <i class="fas fa-${status.icon}"></i> ${status.label}
                    </div>
                </div>
                
                <div class="project-amounts">
                    <div class="project-amount-item">
                        <span class="amount-label">Total Value</span>
                            <span class="amount-value">${formatRM(project.totalAmount || 0)}</span>
                    </div>
                    <div class="project-amount-item">
                        <span class="amount-label">Received</span>
                            <span class="amount-value received">${formatRM(project.amountPaid || 0)}</span>
                    </div>
                    <div class="project-amount-item">
                        <span class="amount-label">Remaining</span>
                            <span class="amount-value pending">${formatRM(remaining)}</span>
                    </div>
                </div>
                
                <div class="project-progress">
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${progress}%;"></div>
                    </div>
                    <span class="progress-text">${progress.toFixed(0)}% Paid</span>
                </div>
                
                <div class="project-milestones-preview">
                    ${(project.milestones || []).slice(0, 3).map(m => `
                        <span class="milestone-chip ${m.status === 'paid' ? 'paid' : m.status === 'partial' ? 'partial' : ''}">
                            ${escapeHtml(m.name)}
                        </span>
                    `).join('')}
                    ${(project.milestones || []).length > 3 ? `<span class="milestone-more">+${project.milestones.length - 3} more</span>` : ''}
                </div>
                
                <div class="project-dates">
                    ${project.startDate ? `<span><i class="fas fa-calendar-alt"></i> ${project.startDate}</span>` : ''}
                    ${project.endDate ? `<span><i class="fas fa-flag-checkered"></i> ${project.endDate}</span>` : ''}
                </div>
            </div>
        `;
    }).join('');
    
    // Add click event listeners to cards
    container.querySelectorAll('.project-card[data-project-id]').forEach(card => {
        card.addEventListener('click', function() {
            const id = this.getAttribute('data-project-id');
            console.log('Project card clicked:', id);
            showProjectDetail(id);
        });
    });
}

function searchProjects(term) {
    renderProjects();
}

function filterProjects() {
    renderProjects();
}

// Alias for viewProjectDetail (used by quotations module)
function viewProjectDetail(projectId) {
    showProjectDetail(projectId);
}

// ==================== PROJECT DETAIL ====================
function showProjectDetail(projectId) {
    console.log('showProjectDetail called with:', projectId);
    
    // Reload projects to ensure fresh data
    loadProjects();
    
    const project = projects.find(p => p.id === projectId);
    if (!project) {
        console.error('Project not found:', projectId);
        showToast('Project not found - it may have been deleted', 'error');
        // Re-render to remove stale cards
        renderProjects();
        return;
    }
    
    const modal = document.getElementById('projectDetailModal');
    const title = document.getElementById('projectDetailTitle');
    const content = document.getElementById('projectDetailContent');
    
    title.textContent = project.name;
    
    const statusLabels = {
        'quotation': { label: 'Quotation', color: '#94a3b8' },
        'confirmed': { label: 'Confirmed', color: '#2563eb' },
        'in-progress': { label: 'In Progress', color: '#f59e0b' },
        'completed': { label: 'Completed', color: '#10b981' },
        'cancelled': { label: 'Cancelled', color: '#ef4444' }
    };
    
    const status = statusLabels[project.status] || statusLabels.quotation;
    const progress = project.totalAmount > 0 ? ((project.amountPaid || 0) / project.totalAmount * 100) : 0;
    const remaining = project.totalAmount - (project.amountPaid || 0);
    
    // Check if project has linked quotation
    let quotationBadge = '';
    if (project.quotationNo || project.quotationId) {
        quotationBadge = `
            <div class="linked-quotation-badge">
                <i class="fas fa-file-invoice"></i> From Quotation: ${escapeHtml(project.quotationNo || 'N/A')}
                ${project.quotationId ? `
                    <button class="btn-link" onclick="closeModal('projectDetailModal'); viewQuotationDetail('${project.quotationId}');">
                        View Quotation
                    </button>
                ` : ''}
            </div>
        `;
    }
    
    content.innerHTML = `
        <div class="project-detail-header">
            <div class="project-detail-info">
                <span class="project-detail-no">${project.projectNo || 'N/A'}</span>
                <h3>${escapeHtml(project.name)}</h3>
                <p class="project-detail-customer">
                    <i class="fas fa-user"></i> ${project.customerName || 'No customer assigned'}
                </p>
                ${project.description ? `<p class="project-detail-desc">${escapeHtml(project.description)}</p>` : ''}
                ${quotationBadge}
            </div>
            <div class="project-detail-status" style="background: ${status.color};">
                ${status.label}
            </div>
        </div>
        
        <div class="project-detail-summary">
            <div class="summary-card total">
                <span class="summary-label">Total Value</span>
                    <span class="summary-value">${formatRM(project.totalAmount || 0)}</span>
            </div>
            <div class="summary-card received">
                <span class="summary-label">Received</span>
                    <span class="summary-value">${formatRM(project.amountPaid || 0)}</span>
            </div>
            <div class="summary-card remaining">
                <span class="summary-label">Remaining</span>
                    <span class="summary-value">${formatRM(remaining)}</span>
            </div>
        </div>
        
        <div class="project-detail-progress">
            <div class="progress-bar large">
                <div class="progress-fill" style="width: ${progress}%;"></div>
            </div>
            <span class="progress-text">${progress.toFixed(1)}% Collected</span>
        </div>
        
        <div class="project-detail-section">
            <h4><i class="fas fa-tasks"></i> Payment Milestones</h4>
            <div class="milestones-list">
                ${(project.milestones || []).map((m, index) => `
                    <div class="milestone-item ${m.status}">
                        <div class="milestone-info">
                            <div class="milestone-header">
                                <span class="milestone-name">${escapeHtml(m.name)}</span>
                                <span class="milestone-badge ${m.status}">${m.status === 'paid' ? 'Paid' : m.status === 'partial' ? 'Partial' : 'Pending'}</span>
                            </div>
                            <div class="milestone-details">
                                <span>${m.percentage}% = RM ${m.amount.toFixed(2)}</span>
                                ${m.dueDate ? `<span class="milestone-due">Due: ${m.dueDate}</span>` : ''}
                            </div>
                            ${m.paidAmount > 0 ? `
                                <div class="milestone-paid-info">
                                    Paid: RM ${m.paidAmount.toFixed(2)} ${m.paidDate ? `on ${new Date(m.paidDate).toLocaleDateString()}` : ''}
                                </div>
                            ` : ''}
                        </div>
                        <div class="milestone-actions">
                            ${m.status !== 'paid' ? `
                                <button class="btn-primary btn-sm" onclick="showRecordPaymentModal('${project.id}', ${index})">
                                    <i class="fas fa-dollar-sign"></i> Record Payment
                                </button>
                            ` : ''}
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
        
        <div class="project-detail-section">
            <h4><i class="fas fa-history"></i> Payment History</h4>
            <div class="payment-history-list">
                ${project.payments && project.payments.length > 0 ? 
                    project.payments.map(p => `
                        <div class="payment-history-item">
                            <div class="payment-info">
                                <span class="payment-milestone">${escapeHtml(p.milestoneName || 'Payment')}</span>
                                <span class="payment-date">${new Date(p.date).toLocaleDateString()}</span>
                            </div>
                            <div class="payment-details">
                                <span class="payment-amount">RM ${p.amount.toFixed(2)}</span>
                                <span class="payment-method">${p.method || 'N/A'}</span>
                            </div>
                            ${p.reference ? `<div class="payment-ref">Ref: ${escapeHtml(p.reference)}</div>` : ''}
                        </div>
                    `).join('')
                    : '<p class="text-muted">No payments recorded yet</p>'
                }
            </div>
        </div>
        
        <div class="project-detail-actions">
            <button class="btn-outline danger" onclick="deleteProject('${project.id}')" title="Delete Project">
                <i class="fas fa-trash"></i> Delete
            </button>
            <button class="btn-outline" onclick="showProjectModal('${project.id}'); closeModal('projectDetailModal');">
                <i class="fas fa-edit"></i> Edit Project
            </button>
            <button class="btn-outline" onclick="printProjectInvoice('${project.id}')">
                <i class="fas fa-print"></i> Print Invoice
            </button>
            ${project.status !== 'completed' && project.status !== 'cancelled' ? `
                <button class="btn-primary" onclick="showRecordPaymentModal('${project.id}')">
                    <i class="fas fa-dollar-sign"></i> Record Payment
                </button>
            ` : ''}
        </div>
    `;
    
    modal.style.display = '';
    modal.classList.add('show');
}

// ==================== RECORD PAYMENT ====================
function showRecordPaymentModal(projectId, milestoneIndex = null) {
    const project = projects.find(p => p.id === projectId);
    if (!project) return;
    
    const remaining = project.totalAmount - (project.amountPaid || 0);
    
    let selectedMilestone = null;
    let milestoneOptions = '';
    
    if (milestoneIndex !== null) {
        selectedMilestone = project.milestones[milestoneIndex];
    }
    
    // Build milestone options - ensure amount is calculated
    project.milestones.forEach((m, index) => {
        // Calculate amount if not set (for backward compatibility)
        if (!m.amount && m.percentage) {
            m.amount = (project.totalAmount * m.percentage / 100);
        }
        if (m.status !== 'paid') {
            const remainingOnMilestone = (m.amount || 0) - (m.paidAmount || 0);
            if (remainingOnMilestone > 0) {
                milestoneOptions += `<option value="${index}" ${milestoneIndex === index ? 'selected' : ''}>
                    ${escapeHtml(m.name)} - RM ${remainingOnMilestone.toFixed(2)} remaining
                </option>`;
            }
        }
    });
    
    const defaultAmount = selectedMilestone ? ((selectedMilestone.amount || 0) - (selectedMilestone.paidAmount || 0)) : remaining;
    
    // Remove existing modal if any
    const existingModal = document.getElementById('recordPaymentModal');
    if (existingModal) existingModal.remove();
    
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.id = 'recordPaymentModal';
    modal.dataset.dynamic = 'true';
    modal.style.display = 'flex';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 450px;">
            <div class="modal-header">
                <h3 class="modal-title"><i class="fas fa-dollar-sign"></i> Record Payment</h3>
                <button class="modal-close" onclick="closeModal('recordPaymentModal')">&times;</button>
            </div>
            <div class="modal-body">
                <div class="credit-info-box" style="margin-bottom: 20px;">
                    <div class="credit-info-header">
                        <i class="fas fa-project-diagram"></i> ${escapeHtml(project.name)}
                    </div>
                    <div class="credit-info-details">
                        <div class="credit-info-row">
                            <span>Total Value:</span>
                            <span>RM ${project.totalAmount.toFixed(2)}</span>
                        </div>
                        <div class="credit-info-row">
                            <span>Already Paid:</span>
                            <span style="color: #10b981;">RM ${(project.amountPaid || 0).toFixed(2)}</span>
                        </div>
                        <div class="credit-info-row">
                            <span>Remaining:</span>
                            <span style="color: #ef4444; font-weight: 600;">RM ${remaining.toFixed(2)}</span>
                        </div>
                    </div>
                </div>
                
                <form id="projectPaymentForm">
                    <div class="form-group">
                        <label class="form-label">Milestone *</label>
                        <select id="projPaymentMilestone" class="form-control" required onchange="updatePaymentAmount('${projectId}')">
                            <option value="">-- Select Milestone --</option>
                            ${milestoneOptions}
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Payment Amount (RM) *</label>
                        <input type="number" id="projPaymentAmount" class="form-control" 
                               step="0.01" min="0.01" value="${defaultAmount.toFixed(2)}" required>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Payment Method *</label>
                        <select id="projPaymentMethod" class="form-control" required>
                            <option value="cash">Cash</option>
                            <option value="bank_transfer">Bank Transfer</option>
                            <option value="cheque">Cheque</option>
                            <option value="card">Credit/Debit Card</option>
                            <option value="ewallet">E-Wallet</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Reference (Optional)</label>
                        <input type="text" id="projPaymentReference" class="form-control" 
                               placeholder="Cheque no., transfer ref, etc.">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Payment Date</label>
                        <input type="date" id="projPaymentDate" class="form-control" 
                               value="${new Date().toISOString().split('T')[0]}">
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn-secondary" onclick="closeModal('recordPaymentModal')">Cancel</button>
                        <button type="button" class="btn-primary" onclick="submitProjectPayment('${projectId}')">
                            <i class="fas fa-check"></i> Record Payment
                        </button>
                    </div>
                </form>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

function updatePaymentAmount(projectId) {
    const project = projects.find(p => p.id === projectId);
    if (!project) return;
    
    const milestoneIndex = document.getElementById('projPaymentMilestone').value;
    if (milestoneIndex !== '') {
        const milestone = project.milestones[parseInt(milestoneIndex)];
        // Calculate amount if not set (for backward compatibility)
        if (!milestone.amount && milestone.percentage) {
            milestone.amount = (project.totalAmount * milestone.percentage / 100);
        }
        const remaining = (milestone.amount || 0) - (milestone.paidAmount || 0);
        document.getElementById('projPaymentAmount').value = remaining.toFixed(2);
    }
}

function submitProjectPayment(projectId) {
    console.log('Submit payment for project:', projectId);
    const project = projects.find(p => p.id === projectId);
    if (!project) {
        showToast('Project not found!', 'error');
        console.error('Project not found:', projectId);
        return;
    }
    
    const milestoneEl = document.getElementById('projPaymentMilestone');
    const amountEl = document.getElementById('projPaymentAmount');
    const methodEl = document.getElementById('projPaymentMethod');
    const referenceEl = document.getElementById('projPaymentReference');
    const dateEl = document.getElementById('projPaymentDate');
    
    if (!milestoneEl || !amountEl) {
        showToast('Form error - please try again!', 'error');
        return;
    }
    
    const milestoneIndex = parseInt(milestoneEl.value);
    const amount = parseFloat(amountEl.value) || 0;
    const method = methodEl ? methodEl.value : 'cash';
    const reference = referenceEl ? referenceEl.value.trim() : '';
    const date = dateEl ? dateEl.value : new Date().toISOString().split('T')[0];
    
    if (isNaN(milestoneIndex) || milestoneEl.value === '') {
        showToast('Please select a milestone!', 'error');
        return;
    }
    
    if (amount <= 0) {
        showToast('Payment amount must be greater than 0!', 'error');
        return;
    }
    
    const milestone = project.milestones[milestoneIndex];
    
    // Calculate amount if not set (for backward compatibility)
    if (!milestone.amount && milestone.percentage) {
        milestone.amount = (project.totalAmount * milestone.percentage / 100);
    }
    
    const milestoneAmount = milestone.amount || 0;
    const remainingOnMilestone = milestoneAmount - (milestone.paidAmount || 0);
    
    if (amount > remainingOnMilestone + 0.01) { // Allow small rounding tolerance
        showToast(`Amount exceeds remaining balance for this milestone (RM ${remainingOnMilestone.toFixed(2)})!`, 'error');
        return;
    }
    
    // Update milestone
    milestone.paidAmount = (milestone.paidAmount || 0) + amount;
    milestone.paidDate = date;
    
    const milestoneFullAmount = milestone.amount || (project.totalAmount * milestone.percentage / 100) || 0;
    if (milestone.paidAmount >= milestoneFullAmount - 0.01) {
        milestone.status = 'paid';
    } else if (milestone.paidAmount > 0) {
        milestone.status = 'partial';
    }
    
    // Update project totals
    project.amountPaid = (project.amountPaid || 0) + amount;
    
    // Add to payment history
    if (!project.payments) project.payments = [];
    project.payments.unshift({
        id: generateUUID(),
        milestoneId: milestone.id,
        milestoneName: milestone.name,
        amount: amount,
        method: method,
        reference: reference,
        date: date
    });
    
    // Check if all milestones are paid
    const allPaid = project.milestones.every(m => m.status === 'paid');
    if (allPaid && project.status !== 'completed') {
        project.status = 'completed';
    }
    
    project.updatedAt = new Date().toISOString();
    
    // Record income transaction - push to businessData.transactions for proper sync
    const incomeTransaction = {
        id: generateUUID(),
        date: date,
        amount: amount,
        category: 'Project Income',
        description: `${project.name} - ${milestone.name}`,
        type: 'income',
        method: method,
        reference: reference || project.projectNo,
        timestamp: new Date().toISOString()
    };
    if (typeof businessData !== 'undefined' && businessData.transactions) {
        businessData.transactions.push(incomeTransaction);
    } else if (typeof transactions !== 'undefined') {
        transactions.push(incomeTransaction);
    }
    if (typeof saveData === 'function') saveData();
    
    // Update CRM customer if linked
    if (project.customerId && typeof linkSaleToCRMCustomer === 'function') {
        linkSaleToCRMCustomer(project.customerId, {
            saleId: project.id,
            receiptNo: project.projectNo,
            date: date,
            total: amount,
            items: [{ name: `${project.name} - ${milestone.name}`, quantity: 1, price: amount }],
            paymentMethod: method
        });
    }
    
    saveProjects();
    closeModal('recordPaymentModal');
    
    // Immediately refresh the project cards list to show updated progress
    renderProjects();
    
    // Then show the updated project detail
    showProjectDetail(projectId);
    updateProjectStats();
    
    // Show success notification - this should appear at top-right
    console.log('Payment successful! Showing notification...');
    showToast(`✅ Payment of RM ${amount.toFixed(2)} recorded for ${milestone.name}!`, 'success');
}

// ==================== PRINT INVOICE ====================
function printProjectInvoice(projectId) {
    const project = projects.find(p => p.id === projectId);
    if (!project) return;
    
    const progress = project.totalAmount > 0 ? ((project.amountPaid || 0) / project.totalAmount * 100) : 0;
    const remaining = project.totalAmount - (project.amountPaid || 0);
    
    const printContent = `
        <html>
        <head>
            <title>Invoice - ${project.projectNo}</title>
            <style>
                body { font-family: Arial, sans-serif; padding: 20px; max-width: 800px; margin: 0 auto; }
                .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 20px; }
                .header h1 { margin: 0; color: #2563eb; }
                .info-row { display: flex; justify-content: space-between; margin-bottom: 20px; }
                .info-box { flex: 1; }
                .info-box h3 { margin: 0 0 10px 0; color: #666; font-size: 12px; text-transform: uppercase; }
                .info-box p { margin: 3px 0; }
                table { width: 100%; border-collapse: collapse; margin: 20px 0; }
                th, td { border: 1px solid #ddd; padding: 10px; text-align: left; }
                th { background: #f5f5f5; }
                .amount { text-align: right; }
                .total-row { font-weight: bold; background: #f0f9ff; }
                .paid-row { color: #10b981; }
                .remaining-row { color: #ef4444; }
                .footer { margin-top: 30px; font-size: 12px; color: #666; }
                @media print { body { padding: 0; } }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>PROJECT INVOICE</h1>
                <p>${project.projectNo}</p>
            </div>
            
            <div class="info-row">
                <div class="info-box">
                    <h3>Bill To</h3>
                    <p><strong>${project.customerName || 'N/A'}</strong></p>
                </div>
                <div class="info-box" style="text-align: right;">
                    <h3>Invoice Details</h3>
                    <p>Date: ${new Date().toLocaleDateString()}</p>
                    <p>Start: ${project.startDate || 'N/A'}</p>
                    <p>End: ${project.endDate || 'N/A'}</p>
                </div>
            </div>
            
            <h3>${project.name}</h3>
            ${project.description ? `<p>${project.description}</p>` : ''}
            
            <table>
                <thead>
                    <tr>
                        <th>Milestone</th>
                        <th>Percentage</th>
                        <th>Due Date</th>
                        <th class="amount">Amount</th>
                        <th class="amount">Paid</th>
                        <th>Status</th>
                    </tr>
                </thead>
                <tbody>
                    ${project.milestones.map(m => `
                        <tr>
                            <td>${m.name}</td>
                            <td>${m.percentage}%</td>
                            <td>${m.dueDate || '-'}</td>
                            <td class="amount">RM ${m.amount.toFixed(2)}</td>
                            <td class="amount">RM ${(m.paidAmount || 0).toFixed(2)}</td>
                            <td>${m.status === 'paid' ? '✓ Paid' : m.status === 'partial' ? 'Partial' : 'Pending'}</td>
                        </tr>
                    `).join('')}
                </tbody>
                <tfoot>
                    <tr class="total-row">
                        <td colspan="3">Total Project Value</td>
                        <td class="amount">RM ${project.totalAmount.toFixed(2)}</td>
                        <td></td>
                        <td></td>
                    </tr>
                    <tr class="paid-row">
                        <td colspan="3">Total Paid</td>
                        <td class="amount">RM ${(project.amountPaid || 0).toFixed(2)}</td>
                        <td></td>
                        <td>${progress.toFixed(0)}%</td>
                    </tr>
                    <tr class="remaining-row">
                        <td colspan="3">Balance Due</td>
                        <td class="amount">RM ${remaining.toFixed(2)}</td>
                        <td></td>
                        <td></td>
                    </tr>
                </tfoot>
            </table>
            
            <div class="footer">
                <p>Generated on ${new Date().toLocaleString()}</p>
            </div>
        </body>
        </html>
    `;
    
    const printWindow = window.open('', '_blank');
    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.print();
}

// ==================== DELETE PROJECT ====================
function deleteProject(projectId) {
    const project = projects.find(p => p.id === projectId);
    if (!project) return;
    
    const hasPayments = project.amountPaid > 0;
    const confirmMsg = hasPayments 
        ? `Are you sure you want to delete this project?\n\nThis project has RM ${project.amountPaid.toFixed(2)} in recorded payments.\nDeleting will also remove these income transactions from your reports.\n\nThis cannot be undone.`
        : 'Are you sure you want to delete this project? This cannot be undone.';
    
    if (!confirm(confirmMsg)) return;
    
    const projectRef = project.projectNo;
    const projectName = project.name;
    
    // Count how many transactions will be removed (for debugging)
    let removedCount = 0;
    
    // Remove from businessData.transactions (the main source)
    if (typeof businessData !== 'undefined' && businessData.transactions && Array.isArray(businessData.transactions)) {
        for (let i = businessData.transactions.length - 1; i >= 0; i--) {
            const t = businessData.transactions[i];
            const isProjectTransaction = 
                (t.reference && t.reference === projectRef) ||
                (t.description && t.description.includes(projectName)) ||
                (t.category === 'Project Income' && t.description && t.description.includes(projectName));
            
            if (isProjectTransaction) {
                businessData.transactions.splice(i, 1);
                removedCount++;
            }
        }
    }
    
    // Also remove from global transactions array (in case it's a different reference)
    if (typeof transactions !== 'undefined' && Array.isArray(transactions)) {
        for (let i = transactions.length - 1; i >= 0; i--) {
            const t = transactions[i];
            const isProjectTransaction = 
                (t.reference && t.reference === projectRef) ||
                (t.description && t.description.includes(projectName)) ||
                (t.category === 'Project Income' && t.description && t.description.includes(projectName));
            
            if (isProjectTransaction) {
                transactions.splice(i, 1);
            }
        }
    }
    
    console.log(`Deleted ${removedCount} transactions for project ${projectName}`);
    
    // Save to localStorage FIRST
    if (typeof saveData === 'function') {
        saveData();
    }
    
    // Also directly save to localStorage as backup
    try {
        const dataToSave = {
            transactions: businessData.transactions,
            bills: businessData.bills || [],
            settings: businessData.settings || {},
            version: '2.0',
            lastSaved: new Date().toISOString()
        };
        localStorage.setItem('ezcubicDataMY', JSON.stringify(dataToSave));
    } catch (e) {
        console.error('Error saving data:', e);
    }
    
    // Update all UI components
    setTimeout(() => {
        // Update Dashboard
        if (typeof updateDashboard === 'function') {
            updateDashboard();
        }
        
        // Update Transactions list
        if (typeof renderTransactions === 'function') {
            renderTransactions();
        }
        if (typeof filterTransactions === 'function') {
            filterTransactions();
        }
        
        // Update Reports
        if (typeof updateReports === 'function') {
            updateReports();
        }
        if (typeof updateMonthlyCharts === 'function') {
            updateMonthlyCharts();
        }
        if (typeof populateYearSelector === 'function') {
            populateYearSelector();
        }
        
        // Update Balance Sheet
        if (typeof updateBalanceSheet === 'function') {
            updateBalanceSheet();
        }
        if (typeof updateSimpleBalanceSheet === 'function') {
            updateSimpleBalanceSheet();
        }
        if (typeof displaySimpleBalanceSheet === 'function') {
            displaySimpleBalanceSheet();
        }
        
        // Update Taxes
        if (typeof updateMalaysianTaxEstimator === 'function') {
            updateMalaysianTaxEstimator();
        }
        if (typeof updateSSTSummary === 'function') {
            updateSSTSummary();
        }
    }, 100);
    
    // Update CRM customer if linked
    if (project.customerId && typeof crmCustomers !== 'undefined') {
        const customer = crmCustomers.find(c => c.id === project.customerId);
        if (customer) {
            customer.totalSpent = Math.max(0, (customer.totalSpent || 0) - (project.amountPaid || 0));
            
            if (customer.salesHistory) {
                customer.salesHistory = customer.salesHistory.filter(s => 
                    s.saleId !== projectId && s.receiptNo !== project.projectNo
                );
            }
            
            if (typeof saveCRMCustomers === 'function') saveCRMCustomers();
            if (typeof updateCRMStats === 'function') updateCRMStats();
            if (typeof renderCRMCustomers === 'function') renderCRMCustomers();
        }
    }
    
    // Also update/delete linked quotation if exists
    if (project.quotationId) {
        // Use window.quotations to access the global array
        let quotationsList = window.quotations || [];
        const quotationIndex = quotationsList.findIndex(q => q.id === project.quotationId);
        if (quotationIndex !== -1) {
            // Delete the quotation too
            quotationsList.splice(quotationIndex, 1);
            window.quotations = quotationsList;
            
            // Use saveQuotations function if available (handles all sync)
            if (typeof window.saveQuotations === 'function') {
                window.saveQuotations();
                console.log('✅ Deleted linked quotation via saveQuotations:', project.quotationId);
            } else {
                // Fallback: Manual save to tenant storage
                const user = window.currentUser;
                if (user && user.tenantId) {
                    const tenantKey = 'ezcubic_tenant_' + user.tenantId;
                    let tenantData = JSON.parse(localStorage.getItem(tenantKey) || '{}');
                    tenantData.quotations = quotationsList;
                    tenantData.updatedAt = new Date().toISOString();
                    localStorage.setItem(tenantKey, JSON.stringify(tenantData));
                }
                localStorage.setItem('ezcubic_quotations', JSON.stringify(quotationsList));
                console.log('✅ Deleted linked quotation (manual save):', project.quotationId);
            }
            
            // Force re-render quotations immediately
            if (typeof window.renderQuotations === 'function') {
                window.renderQuotations();
            }
            if (typeof window.updateQuotationStats === 'function') {
                window.updateQuotationStats();
            }
        }
    }
    
    // Remove project
    const index = projects.findIndex(p => p.id === projectId);
    if (index !== -1) {
        projects.splice(index, 1);
        saveProjects();
        renderProjects();
        updateProjectStats();
        closeModal('projectDetailModal');
        showToast('Project and linked quotation deleted!', 'success');
    }
}

// Export functions to window for onclick handlers
window.showProjectDetail = showProjectDetail;
window.viewProjectDetail = viewProjectDetail;
window.showProjectModal = showProjectModal;
window.deleteProject = deleteProject;
window.showRecordPaymentModal = showRecordPaymentModal;
window.initializeProjects = initializeProjects;
window.renderProjects = renderProjects;
window.submitProjectPayment = submitProjectPayment;
// updateMilestonePayment is alias for updatePaymentAmount
window.updateMilestonePayment = updatePaymentAmount;
window.updatePaymentAmount = updatePaymentAmount;
window.printProjectInvoice = printProjectInvoice;
window.saveProject = saveProject;
