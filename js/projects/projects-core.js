/**
 * EZCubic Smart Accounting - Projects Core Module
 * Data management, CRUD, payments, stats
 * Version: 2.3.0 - Split from projects.js
 */

// ==================== CONSTANTS ====================
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
        const stored = localStorage.getItem(PROJECTS_KEY);
        const parsed = stored ? JSON.parse(stored) : [];
        projects = Array.isArray(parsed) ? parsed : [];
    } catch (e) {
        console.error('Error loading projects:', e);
        projects = [];
    }
}

function saveProjects() {
    localStorage.setItem(PROJECTS_KEY, JSON.stringify(projects));
    
    if (typeof saveToUserTenant === 'function') {
        window.projects = projects;
        saveToUserTenant();
    }
}

// ==================== PROJECT STATS ====================
function updateProjectStats() {
    const activeEl = document.getElementById('projectsActive');
    const totalValueEl = document.getElementById('projectsTotalValue');
    const receivedEl = document.getElementById('projectsReceived');
    const pendingEl = document.getElementById('projectsPending');
    
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
        const index = projects.findIndex(p => p.id === id);
        if (index !== -1) {
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

// ==================== RECORD PAYMENT ====================
function submitProjectPayment(event, projectId) {
    event.preventDefault();
    
    const project = projects.find(p => p.id === projectId);
    if (!project) return;
    
    const milestoneIndex = parseInt(document.getElementById('paymentMilestone').value);
    const amount = parseFloat(document.getElementById('paymentAmount').value) || 0;
    const method = document.getElementById('paymentMethod').value;
    const reference = document.getElementById('paymentReference').value.trim();
    const date = document.getElementById('paymentDate').value || new Date().toISOString().split('T')[0];
    
    if (isNaN(milestoneIndex)) {
        showToast('Please select a milestone!', 'error');
        return;
    }
    
    if (amount <= 0) {
        showToast('Payment amount must be greater than 0!', 'error');
        return;
    }
    
    const milestone = project.milestones[milestoneIndex];
    
    if (!milestone.amount && milestone.percentage) {
        milestone.amount = (project.totalAmount * milestone.percentage / 100);
    }
    
    const milestoneAmount = milestone.amount || 0;
    const remainingOnMilestone = milestoneAmount - (milestone.paidAmount || 0);
    
    if (amount > remainingOnMilestone + 0.01) {
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
    
    // Record income transaction
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
    showProjectDetail(projectId);
    updateProjectStats();
    
    showToast(`Payment of RM ${amount.toFixed(2)} recorded successfully!`, 'success');
}

function updatePaymentAmount(projectId) {
    const project = projects.find(p => p.id === projectId);
    if (!project) return;
    
    const milestoneIndex = document.getElementById('paymentMilestone').value;
    if (milestoneIndex !== '') {
        const milestone = project.milestones[parseInt(milestoneIndex)];
        if (!milestone.amount && milestone.percentage) {
            milestone.amount = (project.totalAmount * milestone.percentage / 100);
        }
        const remaining = (milestone.amount || 0) - (milestone.paidAmount || 0);
        document.getElementById('paymentAmount').value = remaining.toFixed(2);
    }
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
    
    let removedCount = 0;
    
    // Remove from businessData.transactions
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
    
    // Remove from global transactions array
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
    
    if (typeof saveData === 'function') {
        saveData();
    }
    
    // Update UI
    setTimeout(() => {
        if (typeof updateDashboard === 'function') updateDashboard();
        if (typeof renderTransactions === 'function') renderTransactions();
        if (typeof updateReports === 'function') updateReports();
        if (typeof updateBalanceSheet === 'function') updateBalanceSheet();
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
        showToast('Project and related transactions deleted!', 'success');
    }
}

// ==================== WINDOW EXPORTS ====================
window.projects = projects;
window.initializeProjects = initializeProjects;
window.loadProjects = loadProjects;
window.saveProjects = saveProjects;
window.updateProjectStats = updateProjectStats;
window.saveProject = saveProject;
window.generateProjectNumber = generateProjectNumber;
window.submitProjectPayment = submitProjectPayment;
window.updatePaymentAmount = updatePaymentAmount;
window.deleteProject = deleteProject;
