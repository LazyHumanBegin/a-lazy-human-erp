// ==================== KPI-TEMPLATES.JS ====================
// Key Performance Indicator System - Templates Module
// Template CRUD Operations, Metrics Editor
// Version: 2.2.7 - Modular Split - 26 Dec 2025

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
    if (!template || template.isDefault) return;
    
    if (confirm(`Delete "${template.name}"? This cannot be undone.`)) {
        kpiTemplates = kpiTemplates.filter(t => t.id !== templateId);
        saveKPITemplates();
        loadKPITemplates();
        showNotification('Template deleted', 'success');
    }
}

// ==================== EXPORT TO WINDOW ====================
window.showKPITemplateModal = showKPITemplateModal;
window.closeKPITemplateModal = closeKPITemplateModal;
window.renderKPIMetricsEditor = renderKPIMetricsEditor;
window.addKPIMetric = addKPIMetric;
window.removeKPIMetric = removeKPIMetric;
window.updateWeightTotal = updateWeightTotal;
window.saveKPITemplate = saveKPITemplate;
window.loadKPITemplates = loadKPITemplates;
window.deleteKPITemplate = deleteKPITemplate;
