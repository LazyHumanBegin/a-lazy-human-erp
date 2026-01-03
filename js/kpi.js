// ==================== KPI.JS ====================
// Key Performance Indicator System
// Employee Performance Tracking & Evaluation
// Version: 2.1.5 - Fixed exports - 17 Dec 2025

// Early function declarations to prevent reference errors
var loadEmployeeKPIs, showScoreKPIModal, viewEmployeePerformance;

// ==================== GLOBAL VARIABLES ====================
let kpiTemplates = [];
let kpiAssignments = [];
let kpiScores = [];
const KPI_TEMPLATES_KEY = 'ezcubic_kpi_templates';
const KPI_ASSIGNMENTS_KEY = 'ezcubic_kpi_assignments';
const KPI_SCORES_KEY = 'ezcubic_kpi_scores';

// ==================== DEFAULT KPI TEMPLATES ====================
const DEFAULT_KPI_TEMPLATES = [
    {
        id: 'sales-default',
        name: 'Sales Staff KPI',
        category: 'sales',
        metrics: [
            { id: 'm1', name: 'Sales Target Achievement', weight: 40, unit: 'RM', target: 50000 },
            { id: 'm2', name: 'New Customers Acquired', weight: 20, unit: 'count', target: 10 },
            { id: 'm3', name: 'Customer Retention Rate', weight: 20, unit: '%', target: 90 },
            { id: 'm4', name: 'Average Response Time', weight: 20, unit: 'hours', target: 2 }
        ],
        isDefault: true
    },
    {
        id: 'operations-default',
        name: 'Operations Staff KPI',
        category: 'operations',
        metrics: [
            { id: 'm1', name: 'Productivity/Output', weight: 40, unit: '%', target: 100 },
            { id: 'm2', name: 'Quality Score', weight: 30, unit: '%', target: 95 },
            { id: 'm3', name: 'Attendance & Punctuality', weight: 15, unit: '%', target: 98 },
            { id: 'm4', name: 'Safety Compliance', weight: 15, unit: '%', target: 100 }
        ],
        isDefault: true
    },
    {
        id: 'admin-default',
        name: 'Admin/Support Staff KPI',
        category: 'admin',
        metrics: [
            { id: 'm1', name: 'Task Completion Rate', weight: 40, unit: '%', target: 100 },
            { id: 'm2', name: 'Accuracy/Error Rate', weight: 30, unit: '%', target: 98 },
            { id: 'm3', name: 'Response Time', weight: 15, unit: 'hours', target: 4 },
            { id: 'm4', name: 'Initiative & Improvement', weight: 15, unit: 'score', target: 4 }
        ],
        isDefault: true
    },
    {
        id: 'management-default',
        name: 'Management KPI',
        category: 'management',
        metrics: [
            { id: 'm1', name: 'Team Performance', weight: 35, unit: '%', target: 100 },
            { id: 'm2', name: 'Budget Management', weight: 25, unit: '%', target: 100 },
            { id: 'm3', name: 'Project Delivery', weight: 25, unit: '%', target: 100 },
            { id: 'm4', name: 'Staff Development', weight: 15, unit: 'score', target: 4 }
        ],
        isDefault: true
    },
    // ========== NEW PRE-BUILT TEMPLATES ==========
    {
        id: 'customer-service-default',
        name: 'Customer Service KPI',
        category: 'admin',
        metrics: [
            { id: 'm1', name: 'Customer Satisfaction Score', weight: 35, unit: '%', target: 90 },
            { id: 'm2', name: 'Tickets Resolved', weight: 25, unit: 'count', target: 100 },
            { id: 'm3', name: 'First Response Time', weight: 20, unit: 'hours', target: 1 },
            { id: 'm4', name: 'Resolution Time', weight: 20, unit: 'hours', target: 24 }
        ],
        isDefault: true
    },
    {
        id: 'marketing-default',
        name: 'Marketing Staff KPI',
        category: 'sales',
        metrics: [
            { id: 'm1', name: 'Leads Generated', weight: 30, unit: 'count', target: 50 },
            { id: 'm2', name: 'Social Media Engagement', weight: 25, unit: '%', target: 100 },
            { id: 'm3', name: 'Campaign ROI', weight: 25, unit: '%', target: 150 },
            { id: 'm4', name: 'Content Published', weight: 20, unit: 'count', target: 20 }
        ],
        isDefault: true
    },
    {
        id: 'finance-default',
        name: 'Finance/Accounts KPI',
        category: 'admin',
        metrics: [
            { id: 'm1', name: 'Invoice Processing Accuracy', weight: 30, unit: '%', target: 99 },
            { id: 'm2', name: 'Collection Rate', weight: 30, unit: '%', target: 95 },
            { id: 'm3', name: 'Report Submission On-Time', weight: 25, unit: '%', target: 100 },
            { id: 'm4', name: 'Audit Compliance', weight: 15, unit: '%', target: 100 }
        ],
        isDefault: true
    },
    {
        id: 'warehouse-default',
        name: 'Warehouse/Logistics KPI',
        category: 'operations',
        metrics: [
            { id: 'm1', name: 'Order Fulfillment Rate', weight: 35, unit: '%', target: 98 },
            { id: 'm2', name: 'Inventory Accuracy', weight: 25, unit: '%', target: 99 },
            { id: 'm3', name: 'Picking/Packing Speed', weight: 20, unit: 'count', target: 50 },
            { id: 'm4', name: 'Damage/Error Rate', weight: 20, unit: '%', target: 1 }
        ],
        isDefault: true
    },
    {
        id: 'driver-default',
        name: 'Driver/Delivery KPI',
        category: 'operations',
        metrics: [
            { id: 'm1', name: 'Deliveries Completed', weight: 35, unit: 'count', target: 30 },
            { id: 'm2', name: 'On-Time Delivery Rate', weight: 30, unit: '%', target: 95 },
            { id: 'm3', name: 'Customer Feedback Score', weight: 20, unit: 'score', target: 4 },
            { id: 'm4', name: 'Fuel Efficiency', weight: 15, unit: '%', target: 100 }
        ],
        isDefault: true
    },
    {
        id: 'technician-default',
        name: 'Technician/IT Support KPI',
        category: 'operations',
        metrics: [
            { id: 'm1', name: 'Issues Resolved', weight: 35, unit: 'count', target: 40 },
            { id: 'm2', name: 'Resolution Time', weight: 25, unit: 'hours', target: 4 },
            { id: 'm3', name: 'First-Fix Rate', weight: 25, unit: '%', target: 85 },
            { id: 'm4', name: 'Customer Satisfaction', weight: 15, unit: 'score', target: 4 }
        ],
        isDefault: true
    },
    {
        id: 'hr-default',
        name: 'HR Staff KPI',
        category: 'admin',
        metrics: [
            { id: 'm1', name: 'Recruitment Completion', weight: 30, unit: '%', target: 100 },
            { id: 'm2', name: 'Employee Satisfaction', weight: 25, unit: '%', target: 85 },
            { id: 'm3', name: 'Training Hours Delivered', weight: 25, unit: 'count', target: 20 },
            { id: 'm4', name: 'Payroll Accuracy', weight: 20, unit: '%', target: 100 }
        ],
        isDefault: true
    },
    {
        id: 'production-default',
        name: 'Production Worker KPI',
        category: 'operations',
        metrics: [
            { id: 'm1', name: 'Units Produced', weight: 40, unit: 'count', target: 500 },
            { id: 'm2', name: 'Quality Pass Rate', weight: 30, unit: '%', target: 98 },
            { id: 'm3', name: 'Machine Downtime', weight: 15, unit: 'hours', target: 2 },
            { id: 'm4', name: 'Safety Incidents', weight: 15, unit: 'count', target: 0 }
        ],
        isDefault: true
    }
];

// ==================== SCORING GUIDE ====================
const SCORE_RATINGS = [
    { min: 120, label: 'Exceptional', color: '#10b981', stars: 5 },
    { min: 100, label: 'Excellent', color: '#22c55e', stars: 4 },
    { min: 80, label: 'Good', color: '#f59e0b', stars: 3 },
    { min: 60, label: 'Needs Improvement', color: '#f97316', stars: 2 },
    { min: 0, label: 'Poor', color: '#ef4444', stars: 1 }
];

// ==================== INITIALIZE ====================
function initializeKPI() {
    loadKPIData();
    
    // Only add default templates if NO templates exist at all
    // This prevents re-adding defaults that user deleted
    if (kpiTemplates.length === 0) {
        console.log('No KPI templates found, loading defaults...');
        kpiTemplates = [...DEFAULT_KPI_TEMPLATES];
        saveKPITemplates();
    }
    
    // DON'T re-add default templates if user deleted them
    // The old code was forcing defaults back, undoing user deletions
    // Now we respect user's choice to delete templates
    
    loadKPITemplates();
    loadKPIOverview();
    updateKPIStats();
    
    console.log('KPI initialized with', kpiTemplates.length, 'templates');
}

function loadKPIData() {
    // Load templates
    const storedTemplates = localStorage.getItem(KPI_TEMPLATES_KEY);
    if (storedTemplates) {
        kpiTemplates = JSON.parse(storedTemplates);
        // If templates array is empty, reinitialize with defaults
        if (kpiTemplates.length === 0) {
            kpiTemplates = [...DEFAULT_KPI_TEMPLATES];
            saveKPITemplates();
        }
    } else {
        // Initialize with default templates
        kpiTemplates = [...DEFAULT_KPI_TEMPLATES];
        saveKPITemplates();
    }
    
    // Load assignments
    const storedAssignments = localStorage.getItem(KPI_ASSIGNMENTS_KEY);
    if (storedAssignments) {
        kpiAssignments = JSON.parse(storedAssignments);
    }
    
    // Load scores
    const storedScores = localStorage.getItem(KPI_SCORES_KEY);
    if (storedScores) {
        kpiScores = JSON.parse(storedScores);
    }
}

// Force reset KPI templates to defaults
window.resetKPITemplates = function() {
    console.log('Resetting KPI templates...');
    console.log('DEFAULT_KPI_TEMPLATES count:', DEFAULT_KPI_TEMPLATES.length);
    
    try {
        kpiTemplates = JSON.parse(JSON.stringify(DEFAULT_KPI_TEMPLATES));
        console.log('Templates loaded:', kpiTemplates.length);
        
        localStorage.setItem(KPI_TEMPLATES_KEY, JSON.stringify(kpiTemplates));
        console.log('Templates saved to localStorage');
        
        loadKPITemplates();
        updateKPIStats();
        
        if (typeof showNotification === 'function') {
            showNotification('Loaded ' + kpiTemplates.length + ' KPI templates!', 'success');
        } else {
            alert('Loaded ' + kpiTemplates.length + ' KPI templates!');
        }
    } catch (error) {
        console.error('Error resetting templates:', error);
        alert('Error: ' + error.message);
    }
};

function saveKPITemplates() {
    // Sync to window for tenant save
    window.kpiTemplates = kpiTemplates;
    localStorage.setItem(KPI_TEMPLATES_KEY, JSON.stringify(kpiTemplates));
    console.log('KPI Templates saved:', kpiTemplates.length);
    
    // DIRECT tenant save for deletion persistence
    const user = window.currentUser;
    if (user && user.tenantId) {
        const tenantKey = 'ezcubic_tenant_' + user.tenantId;
        let tenantData = JSON.parse(localStorage.getItem(tenantKey) || '{}');
        tenantData.kpiTemplates = kpiTemplates;
        tenantData.updatedAt = new Date().toISOString();
        localStorage.setItem(tenantKey, JSON.stringify(tenantData));
    }
    
    // CRITICAL: Save timestamp AFTER tenant save (must be newer than tenantData.updatedAt)
    localStorage.setItem('ezcubic_last_save_timestamp', Date.now().toString());
    
    // Trigger cloud sync for deletions
    if (typeof window.fullCloudSync === 'function') {
        setTimeout(() => {
            window.fullCloudSync().catch(e => console.warn('Cloud sync failed:', e));
        }, 100);
    }
}

function saveKPIAssignments() {
    // Sync to window for tenant save
    window.kpiAssignments = kpiAssignments;
    localStorage.setItem(KPI_ASSIGNMENTS_KEY, JSON.stringify(kpiAssignments));
    console.log('KPI Assignments saved:', kpiAssignments.length);
    
    // DIRECT tenant save for deletion persistence
    const user = window.currentUser;
    if (user && user.tenantId) {
        const tenantKey = 'ezcubic_tenant_' + user.tenantId;
        let tenantData = JSON.parse(localStorage.getItem(tenantKey) || '{}');
        tenantData.kpiAssignments = kpiAssignments;
        tenantData.updatedAt = new Date().toISOString();
        localStorage.setItem(tenantKey, JSON.stringify(tenantData));
    }
    
    // Trigger cloud sync for deletions
    if (typeof window.fullCloudSync === 'function') {
        setTimeout(() => {
            window.fullCloudSync().catch(e => console.warn('Cloud sync failed:', e));
        }, 100);
    }
}

function saveKPIScores() {
    // Sync to window for tenant save
    window.kpiScores = kpiScores;
    localStorage.setItem(KPI_SCORES_KEY, JSON.stringify(kpiScores));
    console.log('KPI Scores saved:', kpiScores.length);
    
    // DIRECT tenant save for deletion persistence
    const user = window.currentUser;
    if (user && user.tenantId) {
        const tenantKey = 'ezcubic_tenant_' + user.tenantId;
        let tenantData = JSON.parse(localStorage.getItem(tenantKey) || '{}');
        tenantData.kpiScores = kpiScores;
        tenantData.updatedAt = new Date().toISOString();
        localStorage.setItem(tenantKey, JSON.stringify(tenantData));
    }
    
    // Trigger cloud sync for deletions
    if (typeof window.fullCloudSync === 'function') {
        setTimeout(() => {
            window.fullCloudSync().catch(e => console.warn('Cloud sync failed:', e));
        }, 100);
    }
}

/**
 * Delete a KPI assignment from overview
 */
function deleteKPIAssignment(assignmentId) {
    const assignment = kpiAssignments.find(a => a.id === assignmentId);
    if (!assignment) {
        showNotification('Assignment not found', 'error');
        return;
    }
    
    if (confirm(`Delete KPI assignment for "${assignment.employeeName}" (${formatPeriod(assignment.period)})?\n\nThis cannot be undone.`)) {
        // Remove assignment
        kpiAssignments = kpiAssignments.filter(a => a.id !== assignmentId);
        saveKPIAssignments();
        
        // Also remove related scores
        kpiScores = kpiScores.filter(s => s.assignmentId !== assignmentId);
        saveKPIScores();
        
        // Update timestamp for merge priority
        localStorage.setItem('ezcubic_last_save_timestamp', Date.now().toString());
        
        // Refresh UI
        loadKPIOverview();
        updateKPIStats();
        
        showNotification('KPI assignment deleted', 'success');
    }
}

// ==================== KPI TEMPLATES ====================
function showKPITemplateModal(templateId = null) {
    const modal = document.getElementById('kpiTemplateModal');
    const title = document.getElementById('kpiTemplateModalTitle');
    const form = document.getElementById('kpiTemplateForm');
    
    if (templateId) {
        const template = kpiTemplates.find(t => t.id === templateId);
        if (template) {
            title.textContent = 'Edit KPI Template';
            document.getElementById('kpiTemplateId').value = template.id;
            document.getElementById('kpiTemplateName').value = template.name;
            document.getElementById('kpiTemplateCategory').value = template.category;
            
            // Load metrics
            renderKPIMetricsEditor(template.metrics);
        }
    } else {
        title.textContent = 'Create KPI Template';
        form.reset();
        document.getElementById('kpiTemplateId').value = '';
        // Start with empty metrics
        renderKPIMetricsEditor([
            { id: generateUniqueId(), name: '', weight: 25, unit: '%', target: 100 }
        ]);
    }
    
    modal.style.display = 'flex';
}

function closeKPITemplateModal() {
    document.getElementById('kpiTemplateModal').style.display = 'none';
}

function renderKPIMetricsEditor(metrics) {
    const container = document.getElementById('kpiMetricsEditor');
    
    container.innerHTML = metrics.map((metric, index) => `
        <div class="kpi-metric-row" data-metric-id="${metric.id}">
            <div class="metric-fields">
                <input type="text" class="form-control metric-name" value="${escapeHTML(metric.name)}" 
                       placeholder="Metric name (e.g., Sales Target)" required>
                <input type="number" class="form-control metric-weight" value="${metric.weight}" 
                       min="1" max="100" placeholder="Weight %" title="Weight %">
                <select class="form-control metric-unit">
                    <option value="%" ${metric.unit === '%' ? 'selected' : ''}>%</option>
                    <option value="count" ${metric.unit === 'count' ? 'selected' : ''}>Count</option>
                    <option value="hours" ${metric.unit === 'hours' ? 'selected' : ''}>Hours</option>
                    <option value="days" ${metric.unit === 'days' ? 'selected' : ''}>Days</option>
                    <option value="score" ${metric.unit === 'score' ? 'selected' : ''}>Score (1-5)</option>
                    <option value="RM" ${metric.unit === 'RM' ? 'selected' : ''}>RM</option>
                </select>
                <input type="number" class="form-control metric-target" value="${metric.target}" 
                       min="0" step="0.01" placeholder="Target" title="Target value">
            </div>
            <button type="button" class="btn-icon danger" onclick="removeKPIMetric('${metric.id}')" title="Remove metric">
                <i class="fas fa-trash"></i>
            </button>
        </div>
    `).join('');
    
    updateWeightTotal();
}

function addKPIMetric() {
    const container = document.getElementById('kpiMetricsEditor');
    const newMetricId = generateUniqueId();
    
    const metricHtml = `
        <div class="kpi-metric-row" data-metric-id="${newMetricId}">
            <div class="metric-fields">
                <input type="text" class="form-control metric-name" value="" 
                       placeholder="Metric name" required>
                <input type="number" class="form-control metric-weight" value="25" 
                       min="1" max="100" placeholder="Weight %" title="Weight %" onchange="updateWeightTotal()">
                <select class="form-control metric-unit">
                    <option value="%">%</option>
                    <option value="count">Count</option>
                    <option value="hours">Hours</option>
                    <option value="days">Days</option>
                    <option value="score">Score (1-5)</option>
                    <option value="RM">RM</option>
                </select>
                <input type="number" class="form-control metric-target" value="100" 
                       min="0" step="0.01" placeholder="Target" title="Target value">
            </div>
            <button type="button" class="btn-icon danger" onclick="removeKPIMetric('${newMetricId}')" title="Remove metric">
                <i class="fas fa-trash"></i>
            </button>
        </div>
    `;
    
    container.insertAdjacentHTML('beforeend', metricHtml);
    updateWeightTotal();
}

function removeKPIMetric(metricId) {
    const row = document.querySelector(`[data-metric-id="${metricId}"]`);
    if (row) {
        row.remove();
        updateWeightTotal();
    }
}

function updateWeightTotal() {
    const weights = document.querySelectorAll('.metric-weight');
    let total = 0;
    weights.forEach(w => total += parseFloat(w.value) || 0);
    
    const indicator = document.getElementById('weightTotalIndicator');
    if (indicator) {
        indicator.textContent = `Total Weight: ${total}%`;
        indicator.className = total === 100 ? 'weight-valid' : 'weight-invalid';
    }
}
window.updateWeightTotal = updateWeightTotal;

function saveKPITemplate() {
    console.log('saveKPITemplate called');
    const id = document.getElementById('kpiTemplateId').value;
    const name = document.getElementById('kpiTemplateName').value.trim();
    const category = document.getElementById('kpiTemplateCategory').value;
    
    if (!name) {
        showNotification('Please enter template name', 'error');
        return;
    }
    
    // Collect metrics
    const metricRows = document.querySelectorAll('.kpi-metric-row');
    const metrics = [];
    let totalWeight = 0;
    
    metricRows.forEach(row => {
        const metricName = row.querySelector('.metric-name').value.trim();
        const weight = parseFloat(row.querySelector('.metric-weight').value) || 0;
        const unit = row.querySelector('.metric-unit').value;
        const target = parseFloat(row.querySelector('.metric-target').value) || 0;
        
        if (metricName) {
            metrics.push({
                id: row.dataset.metricId,
                name: metricName,
                weight: weight,
                unit: unit,
                target: target
            });
            totalWeight += weight;
        }
    });
    
    if (metrics.length === 0) {
        showNotification('Please add at least one metric', 'error');
        return;
    }
    
    if (totalWeight !== 100) {
        showNotification(`Total weight must equal 100% (currently ${totalWeight}%)`, 'error');
        return;
    }
    
    const templateData = {
        id: id || generateUniqueId(),
        name: name,
        category: category,
        metrics: metrics,
        isDefault: false,
        createdAt: id ? kpiTemplates.find(t => t.id === id)?.createdAt : new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };
    
    console.log('Saving template:', templateData);
    
    if (id) {
        const index = kpiTemplates.findIndex(t => t.id === id);
        if (index !== -1) {
            kpiTemplates[index] = templateData;
        }
    } else {
        kpiTemplates.push(templateData);
    }
    
    saveKPITemplates();
    closeKPITemplateModal();
    loadKPITemplates();
    console.log('Template saved and UI refreshed. Total templates:', kpiTemplates.length);
    showNotification(id ? 'KPI Template updated!' : 'KPI Template created!', 'success');
}

function loadKPITemplates() {
    console.log('loadKPITemplates called. Templates count:', kpiTemplates.length);
    const container = document.getElementById('kpiTemplatesGrid');
    if (!container) {
        console.warn('kpiTemplatesGrid container not found!');
        return;
    }
    
    console.log('Container found, rendering templates...');
    
    if (kpiTemplates.length === 0) {
        container.innerHTML = `
            <div class="empty-state" style="grid-column: 1/-1;">
                <i class="fas fa-clipboard-list"></i>
                <h4>No KPI Templates</h4>
                <p>Create your first KPI template to get started</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = kpiTemplates.map(template => `
        <div class="kpi-template-card">
            <div class="template-header">
                <div class="template-icon ${template.category}">
                    <i class="fas ${getCategoryIcon(template.category)}"></i>
                </div>
                <div class="template-info">
                    <h4>${escapeHTML(template.name)}</h4>
                    <span class="template-category">${formatCategory(template.category)}</span>
                </div>
                ${template.isDefault ? '<span class="default-badge">Default</span>' : ''}
            </div>
            <div class="template-metrics">
                ${template.metrics.map(m => `
                    <div class="metric-item">
                        <span class="metric-name">${escapeHTML(m.name)}</span>
                        <span class="metric-weight">${m.weight}%</span>
                    </div>
                `).join('')}
            </div>
            <div class="template-actions">
                <button class="btn-secondary" onclick="showAssignKPIModal('${template.id}')">
                    <i class="fas fa-user-plus"></i> Assign
                </button>
                ${!template.isDefault ? `
                    <button class="btn-icon" onclick="showKPITemplateModal('${template.id}')" title="Edit">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-icon danger" onclick="deleteKPITemplate('${template.id}')" title="Delete">
                        <i class="fas fa-trash"></i>
                    </button>
                ` : `
                    <button class="btn-icon" onclick="showKPITemplateModal('${template.id}')" title="Duplicate & Edit">
                        <i class="fas fa-copy"></i>
                    </button>
                `}
            </div>
        </div>
    `).join('');
}

function deleteKPITemplate(templateId) {
    const template = kpiTemplates.find(t => t.id === templateId);
    if (!template) {
        showNotification('Template not found', 'error');
        return;
    }
    
    if (template.isDefault) {
        showNotification('Cannot delete default templates. Create your own template to customize.', 'warning');
        return;
    }
    
    if (confirm(`Delete "${template.name}"? This cannot be undone.`)) {
        kpiTemplates = kpiTemplates.filter(t => t.id !== templateId);
        saveKPITemplates();
        loadKPITemplates();
        showNotification('Template deleted', 'success');
    }
}

function getCategoryIcon(category) {
    const icons = {
        'sales': 'fa-chart-line',
        'operations': 'fa-cogs',
        'admin': 'fa-file-alt',
        'management': 'fa-users-cog',
        'general': 'fa-clipboard-check'
    };
    return icons[category] || 'fa-clipboard-check';
}

function formatCategory(category) {
    const labels = {
        'sales': 'Sales',
        'operations': 'Operations',
        'admin': 'Admin/Support',
        'management': 'Management',
        'general': 'General'
    };
    return labels[category] || category;
}

// ==================== KPI ASSIGNMENT ====================
function showAssignKPIModal(templateId = null) {
    const modal = document.getElementById('assignKPIModal');
    const templateSelect = document.getElementById('assignKPITemplate');
    const employeeSelect = document.getElementById('assignKPIEmployee');
    
    // Populate templates
    templateSelect.innerHTML = '<option value="">Select KPI Template</option>' +
        kpiTemplates.map(t => `<option value="${t.id}" ${t.id === templateId ? 'selected' : ''}>${escapeHTML(t.name)}</option>`).join('');
    
    // Populate employees (get from payroll.js)
    const activeEmployees = (window.getEmployees ? window.getEmployees() : []).filter(e => e.status === 'active');
    employeeSelect.innerHTML = '<option value="">Select Employee</option>' +
        activeEmployees.map(e => `<option value="${e.id}">${escapeHTML(e.name)} - ${escapeHTML(e.position || 'No Position')}</option>`).join('');
    
    // Set current period
    const today = new Date();
    document.getElementById('assignKPIPeriod').value = today.toISOString().slice(0, 7);
    
    modal.style.display = 'flex';
}

function closeAssignKPIModal() {
    document.getElementById('assignKPIModal').style.display = 'none';
}

function assignKPIToEmployee() {
    const templateId = document.getElementById('assignKPITemplate').value;
    const employeeId = document.getElementById('assignKPIEmployee').value;
    const period = document.getElementById('assignKPIPeriod').value;
    
    if (!templateId || !employeeId || !period) {
        showNotification('Please fill all fields', 'error');
        return;
    }
    
    // Check if already assigned
    const existing = kpiAssignments.find(a => 
        a.employeeId === employeeId && 
        a.templateId === templateId && 
        a.period === period
    );
    
    if (existing) {
        showNotification('This KPI is already assigned for this period', 'error');
        return;
    }
    
    const template = kpiTemplates.find(t => t.id === templateId);
    const employee = (window.getEmployees ? window.getEmployees() : []).find(e => e.id === employeeId);
    
    const assignment = {
        id: generateUniqueId(),
        templateId: templateId,
        templateName: template.name,
        employeeId: employeeId,
        employeeName: employee.name,
        period: period,
        metrics: template.metrics.map(m => ({
            ...m,
            actual: null,
            score: null
        })),
        status: 'pending',
        overallScore: null,
        assignedAt: new Date().toISOString()
    };
    
    kpiAssignments.push(assignment);
    saveKPIAssignments();
    closeAssignKPIModal();
    loadKPIOverview();
    updateKPIStats();
    showNotification(`KPI assigned to ${employee.name}!`, 'success');
}

// ==================== KPI SCORING ====================
function showScoreKPIModal(assignmentId) {
    const modal = document.getElementById('scoreKPIModal');
    const assignment = kpiAssignments.find(a => a.id === assignmentId);
    
    if (!assignment) return;
    
    document.getElementById('scoreAssignmentId').value = assignmentId;
    document.getElementById('scoreEmployeeName').textContent = assignment.employeeName;
    document.getElementById('scorePeriod').textContent = formatPeriod(assignment.period);
    document.getElementById('scoreTemplateName').textContent = assignment.templateName;
    
    // Render metrics for scoring with auto-fill button
    const container = document.getElementById('scoreMetricsContainer');
    container.innerHTML = `
        <div class="auto-score-section" style="margin-bottom: 15px; padding: 10px; background: #f0f9ff; border-radius: 8px; border: 1px solid #0ea5e9;">
            <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px;">
                <div>
                    <strong style="color: #0369a1;"><i class="fas fa-magic"></i> Auto-Calculate from System Data</strong>
                    <p style="margin: 5px 0 0; font-size: 12px; color: #666;">Automatically fill metrics from sales, attendance, and performance data</p>
                </div>
                <button type="button" class="btn-primary" onclick="autoCalculateKPIScores('${assignmentId}')" style="background: linear-gradient(135deg, #0ea5e9, #0284c7);">
                    <i class="fas fa-calculator"></i> Auto-Calculate
                </button>
            </div>
        </div>
        ${assignment.metrics.map((metric, index) => `
        <div class="score-metric-row">
            <div class="metric-info">
                <span class="metric-label">${escapeHTML(metric.name)}</span>
                <span class="metric-target">Target: ${metric.target} ${metric.unit}</span>
                <span class="metric-weight-badge">${metric.weight}%</span>
            </div>
            <div class="metric-input">
                <input type="number" class="form-control metric-actual" 
                       data-metric-id="${metric.id}"
                       value="${metric.actual !== null ? metric.actual : ''}" 
                       step="0.01" placeholder="Actual value"
                       oninput="calculateMetricScore(this, ${metric.target}, '${metric.unit}')">
                <div class="metric-score-display" id="score-${metric.id}">
                    ${metric.score !== null ? `${metric.score.toFixed(1)}%` : '-'}
                </div>
            </div>
        </div>
    `).join('')}`;
    
    // Show current overall score if exists
    updateOverallScorePreview();
    
    modal.style.display = 'flex';
}

// ==================== AUTO-CALCULATE KPI FROM SYSTEM DATA ====================
function autoCalculateKPIScores(assignmentId) {
    const assignment = kpiAssignments.find(a => a.id === assignmentId);
    if (!assignment) return;
    
    const employeeName = assignment.employeeName;
    const period = assignment.period;
    const [year, month] = period.split('-');
    
    // Gather system data for this employee and period
    const employeeData = gatherEmployeePerformanceData(employeeName, year, month);
    
    // Fill in metric values based on metric names
    assignment.metrics.forEach(metric => {
        const autoValue = getAutoValueForMetric(metric, employeeData);
        if (autoValue !== null) {
            const input = document.querySelector(`[data-metric-id="${metric.id}"]`);
            if (input) {
                input.value = autoValue;
                calculateMetricScore(input, metric.target, metric.unit);
            }
        }
    });
    
    updateOverallScorePreview();
    showNotification('KPI scores auto-calculated from system data!', 'success');
}
window.autoCalculateKPIScores = autoCalculateKPIScores;

function gatherEmployeePerformanceData(employeeName, year, month) {
    // Get sales data - always try localStorage first for freshest data, then window objects
    // This ensures KPI reports reflect the latest POS sales
    let posSales = [];
    try {
        const storedSales = localStorage.getItem('ezcubic_sales');
        if (storedSales) {
            posSales = JSON.parse(storedSales);
        }
        // Merge with window.sales if different
        if (Array.isArray(window.sales) && window.sales.length > 0) {
            // Use window.sales if localStorage is empty or window has more records
            if (posSales.length === 0 || window.sales.length > posSales.length) {
                posSales = window.sales;
            }
        }
    } catch (e) {
        posSales = Array.isArray(window.sales) ? window.sales : [];
    }
    if (!Array.isArray(posSales)) posSales = [];
    
    let posReceipts = JSON.parse(localStorage.getItem('ezcubic_pos_receipts') || '[]');
    if (!Array.isArray(posReceipts)) posReceipts = [];
    
    let orders = [];
    try {
        const storedOrders = localStorage.getItem('ezcubic_orders');
        if (storedOrders) {
            orders = JSON.parse(storedOrders);
        }
        if (Array.isArray(window.orders) && window.orders.length > orders.length) {
            orders = window.orders;
        }
    } catch (e) {
        orders = Array.isArray(window.orders) ? window.orders : [];
    }
    if (!Array.isArray(orders)) orders = [];
    
    let transactions = (businessData && Array.isArray(businessData.transactions)) ? businessData.transactions : JSON.parse(localStorage.getItem('ezcubic_transactions') || '[]');
    if (!Array.isArray(transactions)) transactions = [];
    
    let customers = [];
    try {
        const storedCustomers = localStorage.getItem('ezcubic_customers');
        if (storedCustomers) {
            customers = JSON.parse(storedCustomers);
        }
        if (Array.isArray(window.customers) && window.customers.length > customers.length) {
            customers = window.customers;
        }
    } catch (e) {
        customers = Array.isArray(window.customers) ? window.customers : [];
    }
    if (!Array.isArray(customers)) customers = [];
    
    let quotations = [];
    try {
        const storedQuotations = localStorage.getItem('ezcubic_quotations');
        if (storedQuotations) {
            quotations = JSON.parse(storedQuotations);
        }
        if (Array.isArray(window.quotations) && window.quotations.length > quotations.length) {
            quotations = window.quotations;
        }
    } catch (e) {
        quotations = Array.isArray(window.quotations) ? window.quotations : [];
    }
    if (!Array.isArray(quotations)) quotations = [];
    
    let projects = [];
    try {
        const storedProjects = localStorage.getItem('ezcubic_projects');
        if (storedProjects) {
            projects = JSON.parse(storedProjects);
        }
        if (Array.isArray(window.projects) && window.projects.length > projects.length) {
            projects = window.projects;
        }
    } catch (e) {
        projects = Array.isArray(window.projects) ? window.projects : [];
    }
    if (!Array.isArray(projects)) projects = [];
    
    let inventory = [];
    try {
        const storedInventory = localStorage.getItem('ezcubic_products') || localStorage.getItem('ezcubic_inventory');
        if (storedInventory) {
            inventory = JSON.parse(storedInventory);
        }
        if (Array.isArray(window.products) && window.products.length > inventory.length) {
            inventory = window.products;
        }
    } catch (e) {
        inventory = Array.isArray(window.products) ? window.products : [];
    }
    if (!Array.isArray(inventory)) inventory = [];
    
    // Debug log for troubleshooting
    console.log(`KPI Data for ${employeeName} (${year}-${month}): Sales=${posSales.length}, Orders=${orders.length}, Customers=${customers.length}`);
    
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);
    
    // Helper to check if date is in period
    const isInPeriod = (dateStr) => {
        const date = new Date(dateStr);
        return date >= startDate && date <= endDate;
    };
    
    // Helper to check if employee matches (case-insensitive partial match)
    const isEmployeeSale = (salesperson) => {
        if (!salesperson) return false;
        return salesperson.toLowerCase().includes(employeeName.toLowerCase()) ||
               employeeName.toLowerCase().includes(salesperson.toLowerCase());
    };
    
    // Collect employee sales
    let employeeSales = [];
    let allPeriodSales = [];
    
    // POS Sales
    posSales.forEach(r => {
        if (isInPeriod(r.date || r.timestamp)) {
            const sale = {
                date: r.date || r.timestamp,
                total: parseFloat(r.total) || 0,
                items: r.items || [],
                customer: r.customerName || 'Walk-in',
                salesperson: r.salesperson || r.cashier || ''
            };
            allPeriodSales.push(sale);
            if (isEmployeeSale(sale.salesperson)) {
                employeeSales.push(sale);
            }
        }
    });
    
    // POS Receipts
    posReceipts.forEach(r => {
        if (isInPeriod(r.date || r.timestamp)) {
            const sale = {
                date: r.date || r.timestamp,
                total: parseFloat(r.total) || 0,
                items: r.items || [],
                customer: r.customerName || 'Walk-in',
                salesperson: r.salesperson || r.cashier || ''
            };
            // Avoid duplicates
            if (!employeeSales.find(s => s.date === sale.date && s.total === sale.total)) {
                allPeriodSales.push(sale);
                if (isEmployeeSale(sale.salesperson)) {
                    employeeSales.push(sale);
                }
            }
        }
    });
    
    // Orders
    orders.forEach(o => {
        if (o.status === 'completed' && isInPeriod(o.date)) {
            const sale = {
                date: o.date,
                total: parseFloat(o.total) || 0,
                items: o.items || [],
                customer: o.customerName || 'N/A',
                salesperson: o.salesperson || ''
            };
            allPeriodSales.push(sale);
            if (isEmployeeSale(sale.salesperson)) {
                employeeSales.push(sale);
            }
        }
    });
    
    // Calculate metrics
    const totalSales = employeeSales.reduce((sum, s) => sum + s.total, 0);
    const transactionCount = employeeSales.length;
    const totalItems = employeeSales.reduce((sum, s) => sum + (s.items?.length || 0), 0);
    const avgSale = transactionCount > 0 ? totalSales / transactionCount : 0;
    
    // Unique customers
    const uniqueCustomers = new Set(employeeSales.map(s => s.customer)).size;
    
    // New customers this month (customers not seen before this period)
    const customersBefore = new Set();
    [...posSales, ...posReceipts, ...orders].forEach(s => {
        const saleDate = new Date(s.date || s.timestamp);
        if (saleDate < startDate) {
            customersBefore.add(s.customerName || s.customer);
        }
    });
    const newCustomers = employeeSales.filter(s => 
        s.customer && !customersBefore.has(s.customer) && s.customer !== 'Walk-in'
    ).length;
    
    // Quotation conversion (if salesperson field exists)
    const employeeQuotations = quotations.filter(q => 
        isEmployeeSale(q.salesperson) && isInPeriod(q.date)
    );
    const convertedQuotations = employeeQuotations.filter(q => q.status === 'converted' || q.status === 'accepted').length;
    const quotationConversion = employeeQuotations.length > 0 ? 
        (convertedQuotations / employeeQuotations.length) * 100 : 0;
    
    // Projects completed
    const completedProjects = projects.filter(p => 
        isEmployeeSale(p.salesperson) && 
        p.status === 'completed' && 
        isInPeriod(p.completedDate || p.endDate)
    ).length;
    
    // Calculate retention (return customers)
    const returnCustomers = employeeSales.filter(s => 
        customersBefore.has(s.customer)
    ).length;
    const retentionRate = transactionCount > 0 ? (returnCustomers / transactionCount) * 100 : 0;
    
    // Average response time (simulated - based on time between quotation and conversion)
    let avgResponseTime = 24; // Default 24 hours
    if (employeeQuotations.length > 0) {
        const responseTimes = employeeQuotations
            .filter(q => q.convertedDate && q.date)
            .map(q => {
                const created = new Date(q.date);
                const converted = new Date(q.convertedDate);
                return (converted - created) / (1000 * 60 * 60); // hours
            });
        if (responseTimes.length > 0) {
            avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
        }
    }
    
    // Working days in month (approximate)
    const daysInMonth = new Date(year, month, 0).getDate();
    const workingDays = Math.round(daysInMonth * 5 / 7); // Approximate weekdays
    
    // Daily average
    const dailySalesAvg = totalSales / workingDays;
    const dailyTransactionAvg = transactionCount / workingDays;
    
    return {
        // Sales metrics
        totalSales,
        transactionCount,
        avgSale,
        totalItems,
        dailySalesAvg,
        dailyTransactionAvg,
        
        // Customer metrics
        uniqueCustomers,
        newCustomers,
        retentionRate,
        returnCustomers,
        
        // Conversion metrics
        quotationCount: employeeQuotations.length,
        quotationConversion,
        convertedQuotations,
        completedProjects,
        
        // Time metrics
        avgResponseTime,
        workingDays,
        
        // Comparison (vs team)
        teamTotalSales: allPeriodSales.reduce((sum, s) => sum + s.total, 0),
        teamSalesCount: allPeriodSales.length,
        salesShare: allPeriodSales.length > 0 ? 
            (transactionCount / allPeriodSales.length) * 100 : 0,
        revenueShare: allPeriodSales.reduce((sum, s) => sum + s.total, 0) > 0 ?
            (totalSales / allPeriodSales.reduce((sum, s) => sum + s.total, 0)) * 100 : 0,
        
        // Default values for non-sales metrics (can be overridden)
        attendanceRate: 95, // Default - would need attendance system
        qualityScore: 90,   // Default - would need quality tracking
        safetyScore: 100,   // Default - would need incident tracking
        customerSatisfaction: 4, // Default - would need feedback system
        productivityScore: 85   // Default calculated score
    };
}

function getAutoValueForMetric(metric, data) {
    const name = metric.name.toLowerCase();
    const unit = metric.unit;
    
    // Sales Target / Sales Achievement / Total Sales
    if (name.includes('sales target') || name.includes('sales achievement') || 
        (name.includes('total') && name.includes('sales'))) {
        return data.totalSales;
    }
    
    // Revenue / Gross Sales
    if (name.includes('revenue') || name.includes('gross')) {
        return data.totalSales;
    }
    
    // Number of Sales / Transaction Count
    if (name.includes('number of sales') || name.includes('transaction') || 
        name.includes('sales count') || name.includes('deals closed')) {
        return data.transactionCount;
    }
    
    // Average Sale Value
    if (name.includes('average') && (name.includes('sale') || name.includes('order'))) {
        return data.avgSale;
    }
    
    // New Customers Acquired
    if (name.includes('new customer') || name.includes('customer acquisition')) {
        return data.newCustomers;
    }
    
    // Customer Retention
    if (name.includes('retention') || name.includes('repeat customer')) {
        return data.retentionRate;
    }
    
    // Response Time
    if (name.includes('response time') || name.includes('reply time')) {
        return data.avgResponseTime;
    }
    
    // Quotation Conversion
    if (name.includes('conversion') || name.includes('close rate')) {
        return data.quotationConversion;
    }
    
    // Units/Items Sold
    if (name.includes('unit') || name.includes('items sold') || name.includes('products sold')) {
        return data.totalItems;
    }
    
    // Projects Completed
    if (name.includes('project') && name.includes('complet')) {
        return data.completedProjects;
    }
    
    // Quotations Made
    if (name.includes('quotation') && !name.includes('conversion')) {
        return data.quotationCount;
    }
    
    // Customer Satisfaction / Feedback Score
    if (name.includes('customer satisfaction') || name.includes('feedback') || 
        name.includes('csat')) {
        return data.customerSatisfaction;
    }
    
    // Attendance
    if (name.includes('attendance')) {
        return data.attendanceRate;
    }
    
    // Quality Score
    if (name.includes('quality')) {
        return data.qualityScore;
    }
    
    // Safety
    if (name.includes('safety')) {
        if (name.includes('incident')) return 0; // Lower is better
        return data.safetyScore;
    }
    
    // Productivity
    if (name.includes('productivity') || name.includes('output')) {
        if (unit === 'count') return data.transactionCount;
        return data.productivityScore;
    }
    
    // Deliveries (for driver KPI)
    if (name.includes('deliver')) {
        return data.transactionCount;
    }
    
    // On-time Rate
    if (name.includes('on-time') || name.includes('ontime')) {
        return 95; // Default assumption
    }
    
    // Issues Resolved (for support KPI)
    if (name.includes('issue') || name.includes('resolved') || name.includes('ticket')) {
        return data.transactionCount; // Use transaction count as proxy
    }
    
    // Fulfillment Rate
    if (name.includes('fulfillment')) {
        return 98; // Default assumption
    }
    
    // Inventory Accuracy
    if (name.includes('inventory') && name.includes('accuracy')) {
        return 99; // Default assumption
    }
    
    // Training Hours
    if (name.includes('training')) {
        return 8; // Default
    }
    
    // Employee Satisfaction
    if (name.includes('employee') && name.includes('satisfaction')) {
        return 85; // Default
    }
    
    // Payroll Accuracy
    if (name.includes('payroll') && name.includes('accuracy')) {
        return 100; // Default
    }
    
    // Recruitment
    if (name.includes('recruitment')) {
        return 100; // Default
    }
    
    // Return null if no match - user will need to fill manually
    return null;
}

function closeScoreKPIModal() {
    document.getElementById('scoreKPIModal').style.display = 'none';
}

function calculateMetricScore(input, target, unit) {
    const actual = parseFloat(input.value) || 0;
    const metricId = input.dataset.metricId;
    const scoreDisplay = document.getElementById(`score-${metricId}`);
    
    let score = 0;
    
    // Different calculation based on unit type
    if (unit === 'hours' || unit === 'days') {
        // Lower is better for time-based metrics
        score = target > 0 ? Math.min(200, (target / actual) * 100) : 0;
    } else if (unit === 'score') {
        // Score is typically 1-5, convert to percentage
        score = (actual / 5) * 100;
    } else {
        // Higher is better for most metrics
        score = target > 0 ? (actual / target) * 100 : 0;
    }
    
    score = Math.max(0, Math.min(200, score)); // Cap between 0-200%
    
    scoreDisplay.textContent = `${score.toFixed(1)}%`;
    scoreDisplay.className = 'metric-score-display ' + getScoreClass(score);
    
    updateOverallScorePreview();
}
window.calculateMetricScore = calculateMetricScore;

function updateOverallScorePreview() {
    const assignmentId = document.getElementById('scoreAssignmentId').value;
    const assignment = kpiAssignments.find(a => a.id === assignmentId);
    if (!assignment) return;
    
    let totalWeightedScore = 0;
    let totalWeight = 0;
    
    assignment.metrics.forEach(metric => {
        const input = document.querySelector(`[data-metric-id="${metric.id}"]`);
        if (input && input.value) {
            const actual = parseFloat(input.value) || 0;
            let score = 0;
            
            if (metric.unit === 'hours' || metric.unit === 'days') {
                score = metric.target > 0 ? Math.min(200, (metric.target / actual) * 100) : 0;
            } else if (metric.unit === 'score') {
                score = (actual / 5) * 100;
            } else {
                score = metric.target > 0 ? (actual / metric.target) * 100 : 0;
            }
            
            score = Math.max(0, Math.min(200, score));
            totalWeightedScore += score * (metric.weight / 100);
            totalWeight += metric.weight;
        }
    });
    
    const overallScore = totalWeight > 0 ? totalWeightedScore : 0;
    const rating = getRating(overallScore);
    
    const preview = document.getElementById('overallScorePreview');
    if (preview) {
        preview.innerHTML = `
            <div class="overall-score-value" style="color: ${rating.color}">
                ${overallScore.toFixed(1)}%
            </div>
            <div class="overall-score-rating">
                <span class="rating-stars">${'★'.repeat(rating.stars)}${'☆'.repeat(5-rating.stars)}</span>
                <span class="rating-label" style="color: ${rating.color}">${rating.label}</span>
            </div>
        `;
    }
}

function getScoreClass(score) {
    if (score >= 120) return 'exceptional';
    if (score >= 100) return 'excellent';
    if (score >= 80) return 'good';
    if (score >= 60) return 'needs-improvement';
    return 'poor';
}

function getRating(score) {
    for (const rating of SCORE_RATINGS) {
        if (score >= rating.min) return rating;
    }
    return SCORE_RATINGS[SCORE_RATINGS.length - 1];
}

function saveKPIScore() {
    const assignmentId = document.getElementById('scoreAssignmentId').value;
    const assignment = kpiAssignments.find(a => a.id === assignmentId);
    
    if (!assignment) return;
    
    let totalWeightedScore = 0;
    let allScored = true;
    
    assignment.metrics.forEach(metric => {
        const input = document.querySelector(`[data-metric-id="${metric.id}"]`);
        if (input && input.value) {
            const actual = parseFloat(input.value) || 0;
            let score = 0;
            
            if (metric.unit === 'hours' || metric.unit === 'days') {
                score = metric.target > 0 ? Math.min(200, (metric.target / actual) * 100) : 0;
            } else if (metric.unit === 'score') {
                score = (actual / 5) * 100;
            } else {
                score = metric.target > 0 ? (actual / metric.target) * 100 : 0;
            }
            
            score = Math.max(0, Math.min(200, score));
            
            metric.actual = actual;
            metric.score = score;
            totalWeightedScore += score * (metric.weight / 100);
        } else {
            allScored = false;
        }
    });
    
    if (!allScored) {
        showNotification('Please fill in all metric values', 'error');
        return;
    }
    
    assignment.overallScore = totalWeightedScore;
    assignment.status = 'scored';
    assignment.scoredAt = new Date().toISOString();
    
    // Save score record for history
    const scoreRecord = {
        id: generateUniqueId(),
        assignmentId: assignmentId,
        employeeId: assignment.employeeId,
        employeeName: assignment.employeeName,
        templateName: assignment.templateName,
        period: assignment.period,
        overallScore: totalWeightedScore,
        rating: getRating(totalWeightedScore).label,
        metrics: [...assignment.metrics],
        scoredAt: new Date().toISOString()
    };
    
    kpiScores.push(scoreRecord);
    
    saveKPIAssignments();
    saveKPIScores();
    closeScoreKPIModal();
    loadKPIOverview();
    updateKPIStats();
    showNotification('KPI scores saved!', 'success');
}

// ==================== KPI OVERVIEW ====================
function loadKPIOverview() {
    const container = document.getElementById('kpiOverviewGrid');
    if (!container) return;
    
    const periodFilter = document.getElementById('kpiPeriodFilter')?.value || '';
    
    let filtered = [...kpiAssignments].sort((a, b) => 
        new Date(b.assignedAt) - new Date(a.assignedAt)
    );
    
    if (periodFilter) {
        filtered = filtered.filter(a => a.period === periodFilter);
    }
    
    if (filtered.length === 0) {
        container.innerHTML = `
            <div class="empty-state" style="grid-column: 1/-1;">
                <i class="fas fa-chart-bar"></i>
                <h4>No KPI Assignments</h4>
                <p>Assign KPIs to employees to track performance</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = filtered.map(assignment => {
        const rating = assignment.overallScore !== null ? getRating(assignment.overallScore) : null;
        
        return `
            <div class="kpi-assignment-card ${assignment.status}">
                <div class="assignment-header">
                    <div class="employee-avatar-small">
                        ${assignment.employeeName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                    </div>
                    <div class="assignment-info">
                        <h4>${escapeHTML(assignment.employeeName)}</h4>
                        <span class="assignment-template">${escapeHTML(assignment.templateName)}</span>
                    </div>
                    <span class="assignment-period">${formatPeriod(assignment.period)}</span>
                </div>
                
                ${assignment.status === 'scored' ? `
                    <div class="assignment-score">
                        <div class="score-circle" style="border-color: ${rating.color}">
                            <span class="score-value">${assignment.overallScore.toFixed(0)}%</span>
                        </div>
                        <div class="score-details">
                            <span class="rating-stars" style="color: ${rating.color}">${'★'.repeat(rating.stars)}${'☆'.repeat(5-rating.stars)}</span>
                            <span class="rating-label">${rating.label}</span>
                        </div>
                    </div>
                    <div class="assignment-metrics-mini">
                        ${assignment.metrics.map(m => `
                            <div class="metric-mini ${getScoreClass(m.score)}">
                                <span class="metric-mini-name">${escapeHTML(m.name.substring(0, 15))}${m.name.length > 15 ? '...' : ''}</span>
                                <span class="metric-mini-score">${m.score.toFixed(0)}%</span>
                            </div>
                        `).join('')}
                    </div>
                ` : `
                    <div class="assignment-pending">
                        <i class="fas fa-clock"></i>
                        <span>Pending Scoring</span>
                    </div>
                `}
                
                <div class="assignment-actions">
                    ${assignment.status === 'pending' ? `
                        <button class="btn-primary" onclick="showScoreKPIModal('${assignment.id}')">
                            <i class="fas fa-edit"></i> Score Now
                        </button>
                        <button class="btn-icon danger" onclick="deleteKPIAssignment('${assignment.id}')" title="Delete">
                            <i class="fas fa-trash"></i>
                        </button>
                    ` : `
                        <button class="btn-secondary" onclick="showScoreKPIModal('${assignment.id}')">
                            <i class="fas fa-edit"></i> Update
                        </button>
                        <button class="btn-secondary" onclick="viewEmployeePerformance('${assignment.employeeId}')">
                            <i class="fas fa-chart-line"></i> History
                        </button>
                        <button class="btn-icon danger" onclick="deleteKPIAssignment('${assignment.id}')" title="Delete">
                            <i class="fas fa-trash"></i>
                        </button>
                    `}
                </div>
            </div>
        `;
    }).join('');
}

function filterKPIByPeriod() {
    loadKPIOverview();
}

function formatPeriod(periodStr) {
    const [year, month] = periodStr.split('-');
    const date = new Date(year, month - 1);
    return date.toLocaleDateString('en-MY', { month: 'short', year: 'numeric' });
}

// ==================== EMPLOYEE PERFORMANCE ====================
function viewEmployeePerformance(employeeId) {
    const modal = document.getElementById('performanceModal');
    const employee = (window.getEmployees ? window.getEmployees() : []).find(e => e.id === employeeId);
    
    if (!employee) return;
    
    const employeeScores = kpiScores.filter(s => s.employeeId === employeeId)
        .sort((a, b) => new Date(b.period) - new Date(a.period));
    
    const content = document.getElementById('performanceContent');
    
    if (employeeScores.length === 0) {
        content.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-chart-line"></i>
                <h4>No Performance History</h4>
                <p>Score KPIs to build performance history</p>
            </div>
        `;
    } else {
        // Calculate averages
        const avgScore = employeeScores.reduce((sum, s) => sum + s.overallScore, 0) / employeeScores.length;
        const avgRating = getRating(avgScore);
        const bestScore = Math.max(...employeeScores.map(s => s.overallScore));
        const latestScore = employeeScores[0];
        
        content.innerHTML = `
            <div class="performance-header">
                <div class="employee-avatar-large">
                    ${employee.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                </div>
                <div class="performance-summary">
                    <h3>${escapeHTML(employee.name)}</h3>
                    <p>${escapeHTML(employee.position || 'No Position')} • ${escapeHTML(employee.department || 'No Department')}</p>
                </div>
            </div>
            
            <div class="performance-stats">
                <div class="perf-stat">
                    <span class="perf-stat-value" style="color: ${avgRating.color}">${avgScore.toFixed(0)}%</span>
                    <span class="perf-stat-label">Average Score</span>
                </div>
                <div class="perf-stat">
                    <span class="perf-stat-value">${bestScore.toFixed(0)}%</span>
                    <span class="perf-stat-label">Best Score</span>
                </div>
                <div class="perf-stat">
                    <span class="perf-stat-value">${employeeScores.length}</span>
                    <span class="perf-stat-label">Reviews</span>
                </div>
                <div class="perf-stat">
                    <span class="perf-stat-value">${'★'.repeat(avgRating.stars)}</span>
                    <span class="perf-stat-label">${avgRating.label}</span>
                </div>
            </div>
            
            <h4 style="margin: 20px 0 15px;"><i class="fas fa-history"></i> Performance History</h4>
            <div class="performance-history">
                ${employeeScores.map(score => {
                    const rating = getRating(score.overallScore);
                    return `
                        <div class="history-item">
                            <div class="history-period">${formatPeriod(score.period)}</div>
                            <div class="history-template">${escapeHTML(score.templateName)}</div>
                            <div class="history-score">
                                <span class="score-badge" style="background: ${rating.color}">${score.overallScore.toFixed(0)}%</span>
                                <span class="rating-text">${rating.label}</span>
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        `;
    }
    
    document.getElementById('performanceEmployeeName').textContent = employee.name;
    modal.style.display = 'flex';
}

function closePerformanceModal() {
    document.getElementById('performanceModal').style.display = 'none';
}

// ==================== KPI TABS ====================
function showKPITab(tab) {
    document.querySelectorAll('#kpiSection .tab').forEach(t => t.classList.remove('active'));
    event.currentTarget.classList.add('active');
    
    const templatesSection = document.getElementById('kpiTemplatesSection');
    const overviewSection = document.getElementById('kpiOverviewSection');
    const reportSection = document.getElementById('kpiReportSection');
    
    // Hide all sections
    templatesSection.style.display = 'none';
    overviewSection.style.display = 'none';
    if (reportSection) reportSection.style.display = 'none';
    
    if (tab === 'templates') {
        templatesSection.style.display = 'block';
        loadKPITemplates();
    } else if (tab === 'report') {
        if (reportSection) {
            reportSection.style.display = 'block';
            initializeKPIReport();
        }
    } else {
        overviewSection.style.display = 'block';
        loadKPIOverview();
    }
}

// ==================== STAFF PERFORMANCE SCORECARD ====================
function initializeKPIReport() {
    // Populate employee dropdown
    const employeeSelect = document.getElementById('kpiReportEmployee');
    const departmentSelect = document.getElementById('kpiReportDepartment');
    const monthInput = document.getElementById('kpiReportMonth');
    
    const employees = window.getEmployees ? window.getEmployees() : [];
    
    if (employeeSelect) {
        employeeSelect.innerHTML = '<option value="">All Employees</option>' +
            employees.filter(e => e.status === 'active')
            .map(e => `<option value="${e.id}">${escapeHTML(e.name)}</option>`).join('');
    }
    
    // Populate departments from employees
    if (departmentSelect) {
        const departments = [...new Set(employees.map(e => e.department).filter(Boolean))];
        departmentSelect.innerHTML = '<option value="">All Departments</option>' +
            departments.map(d => `<option value="${d}">${escapeHTML(d)}</option>`).join('');
    }
    
    // Set current month
    if (monthInput && !monthInput.value) {
        const today = new Date();
        monthInput.value = today.toISOString().slice(0, 7);
    }
}
window.initializeKPIReport = initializeKPIReport;

function loadKPIReport() {
    // Placeholder - full data loaded when Generate is clicked
    console.log('KPI Report filters changed');
}
window.loadKPIReport = loadKPIReport;

// Force refresh all data sources for KPI Report to ensure latest data
function refreshKPIDataSources() {
    console.log('Refreshing KPI data sources from localStorage...');
    
    // Reload sales data
    try {
        const storedSales = localStorage.getItem('ezcubic_sales');
        if (storedSales) {
            const parsed = JSON.parse(storedSales);
            if (Array.isArray(parsed)) {
                window.sales = parsed;
                if (typeof sales !== 'undefined') sales = parsed;
            }
        }
    } catch (e) { console.error('Error refreshing sales:', e); }
    
    // Reload orders data
    try {
        const storedOrders = localStorage.getItem('ezcubic_orders');
        if (storedOrders) {
            const parsed = JSON.parse(storedOrders);
            if (Array.isArray(parsed)) {
                window.orders = parsed;
                if (typeof orders !== 'undefined') orders = parsed;
            }
        }
    } catch (e) { console.error('Error refreshing orders:', e); }
    
    // Reload customers data
    try {
        const storedCustomers = localStorage.getItem('ezcubic_customers');
        if (storedCustomers) {
            const parsed = JSON.parse(storedCustomers);
            if (Array.isArray(parsed)) {
                window.customers = parsed;
                if (typeof customers !== 'undefined') customers = parsed;
            }
        }
    } catch (e) { console.error('Error refreshing customers:', e); }
    
    // Reload quotations data
    try {
        const storedQuotations = localStorage.getItem('ezcubic_quotations');
        if (storedQuotations) {
            const parsed = JSON.parse(storedQuotations);
            if (Array.isArray(parsed)) {
                window.quotations = parsed;
                if (typeof quotations !== 'undefined') quotations = parsed;
            }
        }
    } catch (e) { console.error('Error refreshing quotations:', e); }
    
    // Reload projects data
    try {
        const storedProjects = localStorage.getItem('ezcubic_projects');
        if (storedProjects) {
            const parsed = JSON.parse(storedProjects);
            if (Array.isArray(parsed)) {
                window.projects = parsed;
                if (typeof projects !== 'undefined') projects = parsed;
            }
        }
    } catch (e) { console.error('Error refreshing projects:', e); }
    
    // Reload products/inventory data
    try {
        const storedProducts = localStorage.getItem('ezcubic_products');
        if (storedProducts) {
            const parsed = JSON.parse(storedProducts);
            if (Array.isArray(parsed)) {
                window.products = parsed;
                if (typeof products !== 'undefined') products = parsed;
            }
        }
    } catch (e) { console.error('Error refreshing products:', e); }
    
    // Reload employees data
    try {
        const storedEmployees = localStorage.getItem('ezcubic_employees');
        if (storedEmployees) {
            const parsed = JSON.parse(storedEmployees);
            if (Array.isArray(parsed)) {
                window.employees = parsed;
                if (typeof employees !== 'undefined') employees = parsed;
            }
        }
    } catch (e) { console.error('Error refreshing employees:', e); }
    
    // Also reload from tenant if available
    if (typeof loadFromUserTenant === 'function') {
        try {
            loadFromUserTenant();
        } catch (e) { console.error('Error loading from tenant:', e); }
    }
    
    console.log('KPI data sources refreshed. Sales:', (window.sales || []).length, 'Orders:', (window.orders || []).length);
}
window.refreshKPIDataSources = refreshKPIDataSources;

// ==================== STAFF PERFORMANCE SCORECARD ====================
function generateStaffScorecard() {
    const selectedEmployee = document.getElementById('kpiReportEmployee')?.value || '';
    const selectedMonth = document.getElementById('kpiReportMonth')?.value || '';
    const selectedDepartment = document.getElementById('kpiReportDepartment')?.value || '';
    
    if (!selectedMonth) {
        showNotification('Please select a month', 'error');
        return;
    }
    
    // Force refresh data from localStorage
    refreshKPIDataSources();
    
    const [year, month] = selectedMonth.split('-');
    const employees = window.getEmployees ? window.getEmployees() : [];
    let activeEmployees = employees.filter(e => e.status === 'active');
    
    // Filter by department
    if (selectedDepartment) {
        activeEmployees = activeEmployees.filter(e => e.department === selectedDepartment);
    }
    
    // Filter by specific employee
    if (selectedEmployee) {
        activeEmployees = activeEmployees.filter(e => e.id === selectedEmployee);
    }
    
    if (activeEmployees.length === 0) {
        document.getElementById('staffScorecardContainer').innerHTML = `
            <div style="text-align: center; padding: 60px; color: #666; background: #f8fafc; border-radius: 12px;">
                <i class="fas fa-users-slash" style="font-size: 48px; margin-bottom: 15px; display: block; color: #94a3b8;"></i>
                <h4 style="margin: 0 0 10px 0; color: #475569;">No Employees Found</h4>
                <p style="margin: 0;">Add employees in the HR module to generate scorecards</p>
            </div>
        `;
        return;
    }
    
    // Generate scorecard data for each employee
    let scorecardData = [];
    let topPerformers = 0;
    let needsImprovement = 0;
    let totalScores = [];
    
    activeEmployees.forEach(employee => {
        const perfData = gatherEmployeePerformanceData(employee.name, year, month);
        const attendanceData = getEmployeeAttendance(employee.id, year, month);
        const taskData = getEmployeeTaskCompletion(employee.id, year, month);
        
        // Calculate category scores
        const salesScore = calculateSalesScore(perfData);
        const attendanceScore = calculateAttendanceScore(attendanceData);
        const taskScore = calculateTaskScore(taskData);
        const qualityScore = getManualQualityScore(employee.id, year, month);
        
        // Calculate overall score (weighted)
        // Sales: 40%, Attendance: 30%, Tasks: 20%, Quality: 10%
        const overallScore = (salesScore * 0.4) + (attendanceScore * 0.3) + (taskScore * 0.2) + (qualityScore * 0.1);
        const rating = getRating(overallScore);
        
        if (overallScore >= 90) topPerformers++;
        if (overallScore < 60) needsImprovement++;
        if (overallScore > 0) totalScores.push(overallScore);
        
        scorecardData.push({
            employee: employee,
            salesScore: salesScore,
            salesData: perfData,
            attendanceScore: attendanceScore,
            attendanceData: attendanceData,
            taskScore: taskScore,
            taskData: taskData,
            qualityScore: qualityScore,
            overallScore: overallScore,
            rating: rating,
            period: selectedMonth
        });
    });
    
    // Sort by overall score (highest first)
    scorecardData.sort((a, b) => b.overallScore - a.overallScore);
    
    // Update summary stats
    const avgPerformance = totalScores.length > 0 ? 
        totalScores.reduce((a, b) => a + b, 0) / totalScores.length : 0;
    
    document.getElementById('kpiAvgPerformance').textContent = avgPerformance > 0 ? `${avgPerformance.toFixed(0)}%` : '-';
    document.getElementById('kpiTopPerformers').textContent = topPerformers;
    document.getElementById('kpiNeedsImprovement').textContent = needsImprovement;
    document.getElementById('kpiEmployeesEvaluated').textContent = scorecardData.length;
    
    // Render scorecards
    renderStaffScorecards(scorecardData, selectedMonth);
    
    // Store for export
    window.lastScorecardData = scorecardData;
    
    showNotification(`Generated scorecards for ${scorecardData.length} employee(s)`, 'success');
}
window.generateStaffScorecard = generateStaffScorecard;

// Get employee attendance data
function getEmployeeAttendance(employeeId, year, month) {
    // Try to get attendance from HR module
    const attendanceRecords = window.attendanceRecords || 
        JSON.parse(localStorage.getItem('ezcubic_attendance') || '[]');
    
    if (!Array.isArray(attendanceRecords)) return { present: 0, total: 22, late: 0 };
    
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);
    
    // Count working days in month (excluding weekends)
    let workingDays = 0;
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
        if (d.getDay() !== 0 && d.getDay() !== 6) workingDays++;
    }
    
    // Count attendance for this employee
    const monthRecords = attendanceRecords.filter(r => {
        if (r.employeeId !== employeeId) return false;
        const recordDate = new Date(r.date);
        return recordDate >= startDate && recordDate <= endDate;
    });
    
    const present = monthRecords.filter(r => r.status === 'present' || r.status === 'late').length;
    const late = monthRecords.filter(r => r.status === 'late').length;
    
    return {
        present: present,
        total: workingDays,
        late: late,
        absent: workingDays - present
    };
}

// Get employee task completion data
function getEmployeeTaskCompletion(employeeId, year, month) {
    // Try to get tasks from projects module
    const projects = window.projects || JSON.parse(localStorage.getItem('ezcubic_projects') || '[]');
    
    if (!Array.isArray(projects)) return { completed: 0, total: 0, onTime: 0 };
    
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);
    
    let completedTasks = 0;
    let totalTasks = 0;
    let onTimeTasks = 0;
    
    // Get employee name for matching
    const employees = window.getEmployees ? window.getEmployees() : [];
    const employee = employees.find(e => e.id === employeeId);
    const employeeName = employee?.name || '';
    
    projects.forEach(project => {
        if (!project.tasks) return;
        
        project.tasks.forEach(task => {
            // Check if task belongs to this employee
            const isAssigned = task.assignedTo === employeeId || 
                             task.assignedTo === employeeName ||
                             (task.assignees && task.assignees.includes(employeeId));
            
            if (!isAssigned) return;
            
            // Check if task was due or completed in this period
            const taskDue = task.dueDate ? new Date(task.dueDate) : null;
            const taskCompleted = task.completedAt ? new Date(task.completedAt) : null;
            
            if (taskDue && taskDue >= startDate && taskDue <= endDate) {
                totalTasks++;
                if (task.status === 'completed' || task.status === 'done') {
                    completedTasks++;
                    if (taskCompleted && taskCompleted <= taskDue) {
                        onTimeTasks++;
                    }
                }
            }
        });
    });
    
    return {
        completed: completedTasks,
        total: totalTasks,
        onTime: onTimeTasks
    };
}

// Get manual quality score (from KPI scores or default)
function getManualQualityScore(employeeId, year, month) {
    // Check if there's a saved quality score in KPI records
    const kpiScores = window.kpiScores || JSON.parse(localStorage.getItem('ezcubic_kpi_scores') || '[]');
    
    const period = `${year}-${month.toString().padStart(2, '0')}`;
    const qualityRecord = kpiScores.find(s => 
        s.employeeId === employeeId && 
        s.period === period &&
        s.category === 'quality'
    );
    
    if (qualityRecord) {
        return qualityRecord.score || 80;
    }
    
    // Default quality score (can be edited manually)
    return 80;
}

// Calculate sales score (0-100)
function calculateSalesScore(perfData) {
    // Get sales target from settings or use default
    const salesTarget = window.salesTargets?.[perfData.employeeId] || 10000;
    
    if (!perfData.totalSales || perfData.totalSales === 0) return 0;
    
    // Score based on % of target achieved (max 120% = 100 score)
    const percentAchieved = (perfData.totalSales / salesTarget) * 100;
    return Math.min(100, Math.max(0, percentAchieved * (100 / 120)));
}

// Calculate attendance score (0-100)
function calculateAttendanceScore(attendanceData) {
    if (!attendanceData.total || attendanceData.total === 0) return 80; // Default if no data
    
    const attendanceRate = (attendanceData.present / attendanceData.total) * 100;
    const lateDeduction = (attendanceData.late / attendanceData.total) * 10; // -10% for late days
    
    return Math.min(100, Math.max(0, attendanceRate - lateDeduction));
}

// Calculate task score (0-100)
function calculateTaskScore(taskData) {
    if (!taskData.total || taskData.total === 0) return 80; // Default if no tasks
    
    const completionRate = (taskData.completed / taskData.total) * 100;
    const onTimeBonus = taskData.completed > 0 ? (taskData.onTime / taskData.completed) * 10 : 0;
    
    return Math.min(100, Math.max(0, completionRate + onTimeBonus));
}

// Render staff scorecards
function renderStaffScorecards(scorecardData, period) {
    const container = document.getElementById('staffScorecardContainer');
    const monthName = new Date(period + '-01').toLocaleDateString('en-MY', { month: 'long', year: 'numeric' });
    
    container.innerHTML = `
        <div class="scorecard-grid">
            ${scorecardData.map((data, index) => renderSingleScorecard(data, index, monthName)).join('')}
        </div>
    `;
    
    // Show comparison table
    renderPerformanceComparison(scorecardData);
}

function renderSingleScorecard(data, rank, monthName) {
    const initials = data.employee.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
    const avatarColors = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4', '#ec4899'];
    const avatarColor = avatarColors[rank % avatarColors.length];
    
    const getBarClass = (score) => {
        if (score >= 90) return 'excellent';
        if (score >= 70) return 'good';
        if (score >= 50) return 'average';
        return 'poor';
    };
    
    return `
        <div class="staff-scorecard">
            <div class="scorecard-header" style="background: linear-gradient(135deg, ${avatarColor}, ${avatarColor}dd);">
                <div class="scorecard-avatar">${initials}</div>
                <div class="scorecard-employee-info">
                    <h3>${escapeHTML(data.employee.name)}</h3>
                    <div class="department">${escapeHTML(data.employee.department || 'General')}</div>
                    <div class="position">${escapeHTML(data.employee.position || 'Staff')}</div>
                </div>
                <div class="scorecard-overall">
                    <div class="score">${data.overallScore.toFixed(0)}%</div>
                    <div class="label">Overall</div>
                </div>
            </div>
            
            <div class="scorecard-metrics">
                <div class="scorecard-metric">
                    <div class="metric-icon sales"><i class="fas fa-dollar-sign"></i></div>
                    <div class="metric-label">Sales</div>
                    <div class="metric-value">${data.salesScore.toFixed(0)}%</div>
                    <div class="metric-detail">${formatCurrency(data.salesData.totalSales)} | ${data.salesData.transactionCount} txn</div>
                    <div class="metric-bar"><div class="metric-bar-fill ${getBarClass(data.salesScore)}" style="width: ${Math.min(100, data.salesScore)}%"></div></div>
                </div>
                
                <div class="scorecard-metric">
                    <div class="metric-icon attendance"><i class="fas fa-calendar-check"></i></div>
                    <div class="metric-label">Attendance</div>
                    <div class="metric-value">${data.attendanceScore.toFixed(0)}%</div>
                    <div class="metric-detail">${data.attendanceData.present}/${data.attendanceData.total} days | ${data.attendanceData.late} late</div>
                    <div class="metric-bar"><div class="metric-bar-fill ${getBarClass(data.attendanceScore)}" style="width: ${Math.min(100, data.attendanceScore)}%"></div></div>
                </div>
                
                <div class="scorecard-metric">
                    <div class="metric-icon tasks"><i class="fas fa-tasks"></i></div>
                    <div class="metric-label">Tasks</div>
                    <div class="metric-value">${data.taskScore.toFixed(0)}%</div>
                    <div class="metric-detail">${data.taskData.completed}/${data.taskData.total} done | ${data.taskData.onTime} on-time</div>
                    <div class="metric-bar"><div class="metric-bar-fill ${getBarClass(data.taskScore)}" style="width: ${Math.min(100, data.taskScore)}%"></div></div>
                </div>
                
                <div class="scorecard-metric">
                    <div class="metric-icon quality"><i class="fas fa-star"></i></div>
                    <div class="metric-label">Quality</div>
                    <div class="metric-value">${data.qualityScore.toFixed(0)}%</div>
                    <div class="metric-detail">Based on feedback</div>
                    <div class="metric-bar"><div class="metric-bar-fill ${getBarClass(data.qualityScore)}" style="width: ${Math.min(100, data.qualityScore)}%"></div></div>
                </div>
            </div>
            
            <div class="scorecard-footer">
                <div class="scorecard-rating">
                    <span class="stars">${'★'.repeat(data.rating.stars)}${'☆'.repeat(5-data.rating.stars)}</span>
                    <span class="rating-text">${data.rating.label}</span>
                </div>
                <div class="scorecard-actions">
                    <button class="btn-view" onclick="viewScorecardDetail('${data.employee.id}', '${data.period}')">
                        <i class="fas fa-eye"></i> Detail
                    </button>
                    <button class="btn-print" onclick="printScorecard('${data.employee.id}', '${data.period}')">
                        <i class="fas fa-print"></i>
                    </button>
                </div>
            </div>
        </div>
    `;
}

function renderPerformanceComparison(scorecardData) {
    const section = document.getElementById('performanceComparisonSection');
    const tbody = document.getElementById('performanceComparisonBody');
    
    if (!section || !tbody) return;
    
    section.style.display = 'block';
    
    tbody.innerHTML = scorecardData.map((data, index) => {
        const getBadgeClass = (score) => {
            if (score >= 90) return 'excellent';
            if (score >= 70) return 'good';
            if (score >= 50) return 'average';
            return 'poor';
        };
        
        return `
            <tr>
                <td><strong>#${index + 1}</strong></td>
                <td>
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <div style="width: 32px; height: 32px; border-radius: 50%; background: ${['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444'][index % 5]}; color: white; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: bold;">
                            ${data.employee.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                        </div>
                        ${escapeHTML(data.employee.name)}
                    </div>
                </td>
                <td>${escapeHTML(data.employee.department || '-')}</td>
                <td><span class="rating-badge ${getBadgeClass(data.salesScore)}">${data.salesScore.toFixed(0)}%</span></td>
                <td><span class="rating-badge ${getBadgeClass(data.attendanceScore)}">${data.attendanceScore.toFixed(0)}%</span></td>
                <td><span class="rating-badge ${getBadgeClass(data.taskScore)}">${data.taskScore.toFixed(0)}%</span></td>
                <td><span class="rating-badge ${getBadgeClass(data.qualityScore)}">${data.qualityScore.toFixed(0)}%</span></td>
                <td><strong style="color: ${data.rating.color}">${data.overallScore.toFixed(0)}%</strong></td>
                <td>
                    <span style="color: ${data.rating.color};">${'★'.repeat(data.rating.stars)}${'☆'.repeat(5-data.rating.stars)}</span>
                </td>
            </tr>
        `;
    }).join('');
}

function viewScorecardDetail(employeeId, period) {
    const data = window.lastScorecardData?.find(d => d.employee.id === employeeId && d.period === period);
    if (!data) {
        showNotification('Scorecard data not found', 'error');
        return;
    }
    
    const monthName = new Date(period + '-01').toLocaleDateString('en-MY', { month: 'long', year: 'numeric' });
    
    const html = `
        <div style="padding: 20px; max-width: 600px;">
            <h3 style="margin-bottom: 20px; display: flex; align-items: center; gap: 10px;">
                <i class="fas fa-user-chart"></i> 
                ${escapeHTML(data.employee.name)} - ${monthName}
            </h3>
            
            <div class="stats-grid" style="margin-bottom: 20px;">
                <div class="stat-card income">
                    <div class="stat-label">Overall Score</div>
                    <div class="stat-value" style="color: ${data.rating.color}">${data.overallScore.toFixed(0)}%</div>
                </div>
                <div class="stat-card">
                    <div class="stat-label">Rating</div>
                    <div class="stat-value">${data.rating.label}</div>
                </div>
            </div>
            
            <h4 style="margin-bottom: 15px;"><i class="fas fa-chart-bar"></i> Performance Breakdown</h4>
            
            <table class="data-table" style="font-size: 14px;">
                <thead>
                    <tr>
                        <th>Category</th>
                        <th>Weight</th>
                        <th>Score</th>
                        <th>Details</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td><i class="fas fa-dollar-sign text-success"></i> Sales Performance</td>
                        <td>40%</td>
                        <td><strong>${data.salesScore.toFixed(0)}%</strong></td>
                        <td>RM ${data.salesData.totalSales.toFixed(2)} | ${data.salesData.transactionCount} transactions</td>
                    </tr>
                    <tr>
                        <td><i class="fas fa-calendar-check text-primary"></i> Attendance</td>
                        <td>30%</td>
                        <td><strong>${data.attendanceScore.toFixed(0)}%</strong></td>
                        <td>${data.attendanceData.present}/${data.attendanceData.total} present | ${data.attendanceData.late} late</td>
                    </tr>
                    <tr>
                        <td><i class="fas fa-tasks text-warning"></i> Task Completion</td>
                        <td>20%</td>
                        <td><strong>${data.taskScore.toFixed(0)}%</strong></td>
                        <td>${data.taskData.completed}/${data.taskData.total} completed | ${data.taskData.onTime} on-time</td>
                    </tr>
                    <tr>
                        <td><i class="fas fa-star text-purple"></i> Quality</td>
                        <td>10%</td>
                        <td><strong>${data.qualityScore.toFixed(0)}%</strong></td>
                        <td>Based on feedback & reviews</td>
                    </tr>
                </tbody>
                <tfoot>
                    <tr style="font-weight: bold; background: #f8fafc;">
                        <td>TOTAL</td>
                        <td>100%</td>
                        <td style="color: ${data.rating.color}">${data.overallScore.toFixed(0)}%</td>
                        <td>${'★'.repeat(data.rating.stars)}${'☆'.repeat(5-data.rating.stars)} ${data.rating.label}</td>
                    </tr>
                </tfoot>
            </table>
        </div>
    `;
    
    showCustomModal('Scorecard Detail', html);
}

function printScorecard(employeeId, period) {
    const data = window.lastScorecardData?.find(d => d.employee.id === employeeId && d.period === period);
    if (!data) {
        showNotification('Scorecard data not found', 'error');
        return;
    }
    
    const monthName = new Date(period + '-01').toLocaleDateString('en-MY', { month: 'long', year: 'numeric' });
    const businessName = window.settings?.businessName || 'EZCubic Business';
    
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Staff Scorecard - ${data.employee.name}</title>
            <style>
                body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
                .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 15px; margin-bottom: 20px; }
                .header h1 { margin: 0 0 5px 0; }
                .header h2 { margin: 0; color: #666; font-weight: normal; }
                .employee-info { display: flex; justify-content: space-between; margin-bottom: 20px; }
                .score-box { text-align: center; padding: 20px; background: #f0f0f0; border-radius: 10px; }
                .score-box .score { font-size: 48px; font-weight: bold; }
                .score-box .label { font-size: 14px; color: #666; }
                table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
                th { background: #f5f5f5; }
                .footer { margin-top: 30px; text-align: center; font-size: 12px; color: #666; }
                @media print { body { margin: 0; } }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>${businessName}</h1>
                <h2>Staff Performance Scorecard - ${monthName}</h2>
            </div>
            
            <div class="employee-info">
                <div>
                    <p><strong>Employee:</strong> ${data.employee.name}</p>
                    <p><strong>Department:</strong> ${data.employee.department || 'General'}</p>
                    <p><strong>Position:</strong> ${data.employee.position || 'Staff'}</p>
                </div>
                <div class="score-box">
                    <div class="score">${data.overallScore.toFixed(0)}%</div>
                    <div class="label">${data.rating.label}</div>
                </div>
            </div>
            
            <table>
                <thead>
                    <tr>
                        <th>Performance Category</th>
                        <th>Weight</th>
                        <th>Score</th>
                        <th>Details</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>Sales Performance</td>
                        <td>40%</td>
                        <td>${data.salesScore.toFixed(0)}%</td>
                        <td>RM ${data.salesData.totalSales.toFixed(2)} revenue | ${data.salesData.transactionCount} transactions</td>
                    </tr>
                    <tr>
                        <td>Attendance</td>
                        <td>30%</td>
                        <td>${data.attendanceScore.toFixed(0)}%</td>
                        <td>${data.attendanceData.present}/${data.attendanceData.total} days present | ${data.attendanceData.late} late</td>
                    </tr>
                    <tr>
                        <td>Task Completion</td>
                        <td>20%</td>
                        <td>${data.taskScore.toFixed(0)}%</td>
                        <td>${data.taskData.completed}/${data.taskData.total} tasks completed | ${data.taskData.onTime} on-time</td>
                    </tr>
                    <tr>
                        <td>Quality Score</td>
                        <td>10%</td>
                        <td>${data.qualityScore.toFixed(0)}%</td>
                        <td>Based on feedback & quality metrics</td>
                    </tr>
                </tbody>
                <tfoot>
                    <tr style="font-weight: bold;">
                        <td>OVERALL SCORE</td>
                        <td>100%</td>
                        <td>${data.overallScore.toFixed(0)}%</td>
                        <td>${data.rating.label}</td>
                    </tr>
                </tfoot>
            </table>
            
            <div class="footer">
                <p>Generated on ${new Date().toLocaleDateString('en-MY')} | ${businessName}</p>
            </div>
        </body>
        </html>
    `);
    printWindow.document.close();
    printWindow.print();
}

function exportStaffScorecard() {
    const data = window.lastScorecardData;
    if (!data || data.length === 0) {
        showNotification('Generate scorecards first before exporting', 'warning');
        return;
    }
    
    // Export as CSV
    const headers = ['Rank', 'Employee', 'Department', 'Position', 'Sales Score', 'Attendance Score', 'Task Score', 'Quality Score', 'Overall Score', 'Rating'];
    const rows = data.map((d, i) => [
        i + 1,
        d.employee.name,
        d.employee.department || '',
        d.employee.position || '',
        d.salesScore.toFixed(0) + '%',
        d.attendanceScore.toFixed(0) + '%',
        d.taskScore.toFixed(0) + '%',
        d.qualityScore.toFixed(0) + '%',
        d.overallScore.toFixed(0) + '%',
        d.rating.label
    ]);
    
    const csv = [headers.join(','), ...rows.map(r => r.map(c => `"${c}"`).join(','))].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `staff-scorecard-${data[0].period}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    
    showNotification('Scorecard exported successfully', 'success');
}
window.exportStaffScorecard = exportStaffScorecard;

// Keep old function for backward compatibility
function generateAutoKPIReport() {
    generateStaffScorecard();
}
window.generateAutoKPIReport = generateAutoKPIReport;

function getAvatarColor(index) {
    const colors = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4', '#ec4899'];
    return colors[index % colors.length];
}

function viewKPIReportDetail(employeeId, templateId, period) {
    const reportData = window.lastKPIReportData?.find(d => 
        d.employeeId === employeeId && d.templateId === templateId && d.period === period
    );
    
    if (!reportData) {
        showNotification('Report data not found', 'error');
        return;
    }
    
    // Create detail modal content
    const detailHtml = `
        <div style="padding: 20px;">
            <h3 style="margin-bottom: 20px;">
                <i class="fas fa-chart-pie"></i> KPI Detail - ${escapeHTML(reportData.employeeName)}
            </h3>
            
            <div class="stats-grid" style="margin-bottom: 20px;">
                <div class="stat-card income">
                    <div class="stat-label">Overall Score</div>
                    <div class="stat-value" style="color: ${reportData.rating.color}">${reportData.overallScore.toFixed(0)}%</div>
                </div>
                <div class="stat-card">
                    <div class="stat-label">Rating</div>
                    <div class="stat-value">${reportData.rating.label}</div>
                </div>
            </div>
            
            <h4 style="margin-bottom: 15px;"><i class="fas fa-list"></i> Metric Breakdown</h4>
            <table class="data-table" style="font-size: 14px;">
                <thead>
                    <tr>
                        <th>Metric</th>
                        <th>Weight</th>
                        <th>Target</th>
                        <th>Actual</th>
                        <th>Score</th>
                    </tr>
                </thead>
                <tbody>
                    ${reportData.metrics.map(m => `
                        <tr>
                            <td>${escapeHTML(m.name)}</td>
                            <td>${m.weight}%</td>
                            <td>${m.target} ${m.unit}</td>
                            <td>${m.actual !== null ? `${m.unit === 'RM' ? formatCurrency(m.actual) : m.actual}` : '<em>N/A</em>'}</td>
                            <td>
                                <span class="score-badge ${getScoreClass(m.score)}" style="padding: 2px 8px; border-radius: 10px;">
                                    ${m.score.toFixed(0)}%
                                </span>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
            
            <div style="margin-top: 20px; text-align: right;">
                <button class="btn-secondary" onclick="this.closest('.modal-overlay').remove()">Close</button>
                <button class="btn-primary" onclick="saveAutoKPIScore('${employeeId}', '${templateId}', '${period}'); this.closest('.modal-overlay').remove();">
                    <i class="fas fa-save"></i> Save This Score
                </button>
            </div>
        </div>
    `;
    
    // Create modal
    const modalOverlay = document.createElement('div');
    modalOverlay.className = 'modal-overlay';
    modalOverlay.style.cssText = 'position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 10000;';
    modalOverlay.innerHTML = `
        <div class="modal-content" style="background: white; border-radius: 12px; max-width: 700px; width: 90%; max-height: 80vh; overflow-y: auto;">
            ${detailHtml}
        </div>
    `;
    modalOverlay.onclick = (e) => {
        if (e.target === modalOverlay) modalOverlay.remove();
    };
    document.body.appendChild(modalOverlay);
}
window.viewKPIReportDetail = viewKPIReportDetail;
window.viewScorecardDetail = viewScorecardDetail;
window.printScorecard = printScorecard;

function saveAutoKPIScore(employeeId, templateId, period) {
    const reportData = window.lastKPIReportData?.find(d => 
        d.employeeId === employeeId && d.templateId === templateId && d.period === period
    );
    
    if (!reportData) {
        showNotification('Report data not found', 'error');
        return;
    }
    
    // Check if assignment already exists
    let assignment = kpiAssignments.find(a => 
        a.employeeId === employeeId && 
        a.templateId === templateId && 
        a.period === period
    );
    
    const template = kpiTemplates.find(t => t.id === templateId);
    
    if (!assignment) {
        // Create new assignment
        assignment = {
            id: generateUniqueId(),
            templateId: templateId,
            templateName: template.name,
            employeeId: employeeId,
            employeeName: reportData.employeeName,
            period: period,
            metrics: reportData.metrics,
            status: 'scored',
            overallScore: reportData.overallScore,
            assignedAt: new Date().toISOString(),
            scoredAt: new Date().toISOString()
        };
        kpiAssignments.push(assignment);
    } else {
        // Update existing assignment
        assignment.metrics = reportData.metrics;
        assignment.overallScore = reportData.overallScore;
        assignment.status = 'scored';
        assignment.scoredAt = new Date().toISOString();
    }
    
    // Save score record
    const existingScore = kpiScores.find(s => 
        s.employeeId === employeeId && 
        s.templateName === template.name && 
        s.period === period
    );
    
    if (!existingScore) {
        const scoreRecord = {
            id: generateUniqueId(),
            assignmentId: assignment.id,
            employeeId: employeeId,
            employeeName: reportData.employeeName,
            templateName: template.name,
            period: period,
            overallScore: reportData.overallScore,
            rating: reportData.rating.label,
            metrics: [...reportData.metrics],
            scoredAt: new Date().toISOString(),
            autoGenerated: true
        };
        kpiScores.push(scoreRecord);
    } else {
        existingScore.overallScore = reportData.overallScore;
        existingScore.rating = reportData.rating.label;
        existingScore.metrics = [...reportData.metrics];
        existingScore.scoredAt = new Date().toISOString();
        existingScore.autoGenerated = true;
    }
    
    saveKPIAssignments();
    saveKPIScores();
    updateKPIStats();
    
    showNotification(`KPI score saved for ${reportData.employeeName}!`, 'success');
}
window.saveAutoKPIScore = saveAutoKPIScore;

function exportKPIReport() {
    const reportData = window.lastKPIReportData;
    
    if (!reportData || reportData.length === 0) {
        showNotification('No report data to export. Generate a report first.', 'error');
        return;
    }
    
    // Create CSV content
    const headers = ['Employee', 'Template', 'Period', 'Sales (RM)', 'Transactions', 'Avg Sale', 'Score (%)', 'Rating'];
    const rows = reportData.map(d => [
        d.employeeName,
        d.templateName,
        d.period,
        d.sales.toFixed(2),
        d.transactions,
        d.avgSale.toFixed(2),
        d.overallScore.toFixed(1),
        d.rating.label
    ]);
    
    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
    
    // Download
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `KPI_Report_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    
    showNotification('KPI report exported!', 'success');
}
window.exportKPIReport = exportKPIReport;

// ==================== STATS ====================
function updateKPIStats() {
    const totalTemplates = kpiTemplates.length;
    const pendingAssignments = kpiAssignments.filter(a => a.status === 'pending').length;
    const scoredAssignments = kpiAssignments.filter(a => a.status === 'scored').length;
    
    // Calculate average score
    const scoredRecords = kpiAssignments.filter(a => a.status === 'scored');
    const avgScore = scoredRecords.length > 0 
        ? scoredRecords.reduce((sum, a) => sum + a.overallScore, 0) / scoredRecords.length 
        : 0;
    
    const statElements = {
        'kpiTemplatesCount': totalTemplates,
        'kpiPendingCount': pendingAssignments,
        'kpiScoredCount': scoredAssignments,
        'kpiAvgScore': avgScore > 0 ? `${avgScore.toFixed(0)}%` : '-'
    };
    
    Object.entries(statElements).forEach(([id, value]) => {
        const el = document.getElementById(id);
        if (el) el.textContent = value;
    });
}

// ==================== HELPER FUNCTIONS ====================
function formatCurrency(amount) {
    return 'RM ' + (parseFloat(amount) || 0).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

function escapeHTML(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function generateUniqueId() {
    return 'kpi_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

// ==================== MISSING FUNCTION STUBS ====================
function loadEmployeeKPIs(employeeId) {
    // Load KPIs assigned to a specific employee
    const container = document.getElementById('employeeKPIsContainer');
    if (!container) return;
    
    const employeeAssignments = kpiAssignments.filter(a => a.employeeId === employeeId);
    
    if (employeeAssignments.length === 0) {
        container.innerHTML = '<p class="text-muted">No KPIs assigned to this employee.</p>';
        return;
    }
    
    container.innerHTML = employeeAssignments.map(assignment => {
        const template = kpiTemplates.find(t => t.id === assignment.templateId);
        const score = assignment.scores?.[assignment.scores?.length - 1] || null;
        
        return `
            <div class="kpi-item">
                <div class="kpi-name">${template?.name || 'Unknown KPI'}</div>
                <div class="kpi-score">${score ? score.totalScore + '%' : 'Not scored'}</div>
            </div>
        `;
    }).join('');
}

// ==================== EXPORT FUNCTIONS TO WINDOW ====================
window.initializeKPI = initializeKPI;
window.showKPITemplateModal = showKPITemplateModal;
window.closeKPITemplateModal = closeKPITemplateModal;
window.saveKPITemplate = saveKPITemplate;
window.loadKPITemplates = loadKPITemplates;
window.deleteKPITemplate = deleteKPITemplate;
window.deleteKPIAssignment = deleteKPIAssignment;
window.showAssignKPIModal = showAssignKPIModal;
window.closeAssignKPIModal = closeAssignKPIModal;
window.assignKPIToEmployee = assignKPIToEmployee;
window.loadEmployeeKPIs = loadEmployeeKPIs;
window.showScoreKPIModal = showScoreKPIModal;
window.closeScoreKPIModal = closeScoreKPIModal;
window.saveKPIScore = saveKPIScore;
window.loadKPIOverview = loadKPIOverview;
window.showKPITab = showKPITab;
window.viewEmployeePerformance = viewEmployeePerformance;
window.closePerformanceModal = closePerformanceModal;
window.addKPIMetric = addKPIMetric;
window.removeKPIMetric = removeKPIMetric;
window.filterKPIByPeriod = filterKPIByPeriod;
window.updateWeightTotal = updateWeightTotal;
window.gatherEmployeePerformanceData = gatherEmployeePerformanceData;
window.getAutoValueForMetric = getAutoValueForMetric;
window.updateKPIStats = updateKPIStats;
window.autoCalculateKPIScores = autoCalculateKPIScores;
window.loadKPIReport = loadKPIReport;
window.saveKPITemplates = saveKPITemplates;
window.saveKPIAssignments = saveKPIAssignments;

// Helper function to refresh all KPI views
function refreshKPI() {
    console.log('Refreshing KPI views...');
    loadKPITemplates();
    loadKPIOverview();
    updateKPIStats();
    console.log('KPI refresh complete');
}
window.refreshKPI = refreshKPI;

// Debug helper - check current KPI data
window.debugKPI = function() {
    console.log('KPI Templates:', kpiTemplates.length, kpiTemplates);
    console.log('KPI Assignments:', kpiAssignments.length, kpiAssignments);
    console.log('KPI Scores:', kpiScores.length, kpiScores);
};
