/**
 * EZCubic Smart Accounting - Projects UI Module
 * Modals, rendering, search/filter, print
 * Version: 2.3.0 - Split from projects.js
 */

// ==================== PROJECT MODAL ====================
function showProjectModal(projectId = null) {
    const modal = document.getElementById('projectModal');
    const title = document.getElementById('projectModalTitle');
    const form = document.getElementById('projectForm');
    
    form.reset();
    document.getElementById('projectId').value = '';
    
    loadProjectCustomers();
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
            
            renderMilestoneInputs(project.milestones || []);
        }
    } else {
        title.textContent = 'New Project';
        document.getElementById('projectStartDate').value = new Date().toISOString().split('T')[0];
        
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
    
    const currentUser = typeof getCurrentUser === 'function' ? getCurrentUser() : null;
    const currentTenantId = currentUser?.tenantId || null;
    
    let salespersons = [];
    
    if (currentUser && currentUser.name) {
        salespersons.push({ name: currentUser.name, role: currentUser.role });
    }
    
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

// ==================== MILESTONE INPUTS ====================
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

// ==================== RENDER PROJECTS ====================
function renderProjects() {
    const container = document.getElementById('projectsGrid');
    if (!container) return;
    
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
            <div class="project-card" onclick="showProjectDetail('${project.id}')">
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
}

function searchProjects(term) {
    renderProjects();
}

function filterProjects() {
    renderProjects();
}

function viewProjectDetail(projectId) {
    showProjectDetail(projectId);
}

// ==================== PROJECT DETAIL ====================
function showProjectDetail(projectId) {
    const project = projects.find(p => p.id === projectId);
    if (!project) return;
    
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

// ==================== RECORD PAYMENT MODAL ====================
function showRecordPaymentModal(projectId, milestoneIndex = null) {
    const project = projects.find(p => p.id === projectId);
    if (!project) return;
    
    const remaining = project.totalAmount - (project.amountPaid || 0);
    
    let selectedMilestone = null;
    let milestoneOptions = '';
    
    if (milestoneIndex !== null) {
        selectedMilestone = project.milestones[milestoneIndex];
    }
    
    project.milestones.forEach((m, index) => {
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
                
                <form onsubmit="submitProjectPayment(event, '${projectId}')">
                    <div class="form-group">
                        <label class="form-label">Milestone *</label>
                        <select id="paymentMilestone" class="form-control" required onchange="updatePaymentAmount('${projectId}')">
                            <option value="">-- Select Milestone --</option>
                            ${milestoneOptions}
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Payment Amount (RM) *</label>
                        <input type="number" id="paymentAmount" class="form-control" 
                               step="0.01" min="0.01" value="${defaultAmount.toFixed(2)}" required>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Payment Method *</label>
                        <select id="paymentMethod" class="form-control" required>
                            <option value="cash">Cash</option>
                            <option value="bank_transfer">Bank Transfer</option>
                            <option value="cheque">Cheque</option>
                            <option value="card">Credit/Debit Card</option>
                            <option value="ewallet">E-Wallet</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Reference (Optional)</label>
                        <input type="text" id="paymentReference" class="form-control" 
                               placeholder="Cheque no., transfer ref, etc.">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Payment Date</label>
                        <input type="date" id="paymentDate" class="form-control" 
                               value="${new Date().toISOString().split('T')[0]}">
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn-secondary" onclick="closeModal('recordPaymentModal')">Cancel</button>
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

// ==================== WINDOW EXPORTS ====================
window.showProjectModal = showProjectModal;
window.loadProjectCustomers = loadProjectCustomers;
window.loadProjectSalespersons = loadProjectSalespersons;
window.renderMilestoneInputs = renderMilestoneInputs;
window.addMilestoneInput = addMilestoneInput;
window.removeMilestoneInput = removeMilestoneInput;
window.updateMilestoneTotal = updateMilestoneTotal;
window.renderProjects = renderProjects;
window.searchProjects = searchProjects;
window.filterProjects = filterProjects;
window.viewProjectDetail = viewProjectDetail;
window.showProjectDetail = showProjectDetail;
window.showRecordPaymentModal = showRecordPaymentModal;
window.printProjectInvoice = printProjectInvoice;
