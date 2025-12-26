// ==================== KPI-CORE.JS ====================
// Key Performance Indicator System - Core Module
// Constants, Data Management, Initialization
// Version: 2.2.7 - Modular Split - 26 Dec 2025

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
    
    // Force load default templates if none exist
    if (kpiTemplates.length === 0) {
        console.log('No KPI templates found, loading defaults...');
        kpiTemplates = [...DEFAULT_KPI_TEMPLATES];
        saveKPITemplates();
    }
    
    // Ensure all default templates exist (add missing ones)
    const defaultIds = DEFAULT_KPI_TEMPLATES.map(t => t.id);
    const existingIds = kpiTemplates.map(t => t.id);
    
    DEFAULT_KPI_TEMPLATES.forEach(defaultTemplate => {
        if (!existingIds.includes(defaultTemplate.id)) {
            kpiTemplates.push(defaultTemplate);
        }
    });
    saveKPITemplates();
    
    loadKPITemplates();
    loadKPIOverview();
    updateKPIStats();
    
    console.log('KPI initialized with', kpiTemplates.length, 'templates');
}

function loadKPIData() {
    // Load templates
    const storedTemplates = localStorage.getItem(KPI_TEMPLATES_KEY);
    if (storedTemplates && storedTemplates !== 'undefined' && storedTemplates !== 'null') {
        try {
            kpiTemplates = JSON.parse(storedTemplates);
            // If templates array is empty, reinitialize with defaults
            if (!Array.isArray(kpiTemplates) || kpiTemplates.length === 0) {
                kpiTemplates = [...DEFAULT_KPI_TEMPLATES];
                saveKPITemplates();
            }
        } catch (e) {
            console.warn('KPI templates parse error, using defaults:', e.message);
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
    if (storedAssignments && storedAssignments !== 'undefined' && storedAssignments !== 'null') {
        try {
            kpiAssignments = JSON.parse(storedAssignments);
            if (!Array.isArray(kpiAssignments)) kpiAssignments = [];
        } catch (e) {
            console.warn('KPI assignments parse error:', e.message);
            kpiAssignments = [];
        }
    }
    
    // Load scores
    const storedScores = localStorage.getItem(KPI_SCORES_KEY);
    if (storedScores && storedScores !== 'undefined' && storedScores !== 'null') {
        try {
            kpiScores = JSON.parse(storedScores);
            if (!Array.isArray(kpiScores)) kpiScores = [];
        } catch (e) {
            console.warn('KPI scores parse error:', e.message);
            kpiScores = [];
        }
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
    // Also save to tenant storage for multi-tenant isolation
    if (typeof saveToUserTenant === 'function') {
        saveToUserTenant();
    }
}

function saveKPIAssignments() {
    // Sync to window for tenant save
    window.kpiAssignments = kpiAssignments;
    localStorage.setItem(KPI_ASSIGNMENTS_KEY, JSON.stringify(kpiAssignments));
    console.log('KPI Assignments saved:', kpiAssignments.length);
    // Also save to tenant storage for multi-tenant isolation
    if (typeof saveToUserTenant === 'function') {
        saveToUserTenant();
    }
}

function saveKPIScores() {
    // Sync to window for tenant save
    window.kpiScores = kpiScores;
    localStorage.setItem(KPI_SCORES_KEY, JSON.stringify(kpiScores));
    console.log('KPI Scores saved:', kpiScores.length);
    // Also save to tenant storage for multi-tenant isolation
    if (typeof saveToUserTenant === 'function') {
        saveToUserTenant();
    }
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

function formatPeriod(periodStr) {
    const [year, month] = periodStr.split('-');
    const date = new Date(year, month - 1);
    return date.toLocaleDateString('en-MY', { month: 'short', year: 'numeric' });
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

function getAvatarColor(index) {
    const colors = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4', '#ec4899'];
    return colors[index % colors.length];
}

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

// Helper function to refresh all KPI views
function refreshKPI() {
    console.log('Refreshing KPI views...');
    loadKPITemplates();
    loadKPIOverview();
    updateKPIStats();
    console.log('KPI refresh complete');
}

// Debug helper - check current KPI data
window.debugKPI = function() {
    console.log('KPI Templates:', kpiTemplates.length, kpiTemplates);
    console.log('KPI Assignments:', kpiAssignments.length, kpiAssignments);
    console.log('KPI Scores:', kpiScores.length, kpiScores);
};

// ==================== EXPORT TO WINDOW ====================
window.kpiTemplates = kpiTemplates;
window.kpiAssignments = kpiAssignments;
window.kpiScores = kpiScores;
window.KPI_TEMPLATES_KEY = KPI_TEMPLATES_KEY;
window.KPI_ASSIGNMENTS_KEY = KPI_ASSIGNMENTS_KEY;
window.KPI_SCORES_KEY = KPI_SCORES_KEY;
window.DEFAULT_KPI_TEMPLATES = DEFAULT_KPI_TEMPLATES;
window.SCORE_RATINGS = SCORE_RATINGS;

window.initializeKPI = initializeKPI;
window.loadKPIData = loadKPIData;
window.saveKPITemplates = saveKPITemplates;
window.saveKPIAssignments = saveKPIAssignments;
window.saveKPIScores = saveKPIScores;
window.formatCurrency = formatCurrency;
window.escapeHTML = escapeHTML;
window.generateUniqueId = generateUniqueId;
window.getCategoryIcon = getCategoryIcon;
window.formatCategory = formatCategory;
window.formatPeriod = formatPeriod;
window.getScoreClass = getScoreClass;
window.getRating = getRating;
window.getAvatarColor = getAvatarColor;
window.updateKPIStats = updateKPIStats;
window.refreshKPI = refreshKPI;
