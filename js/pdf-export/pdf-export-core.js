/**
 * EZCubic Smart Accounting - PDF Export Core Module
 * Export options, period calculations, data gathering
 * Split from pdf-export.js for v2.3.1
 */

// Export options state
window.exportOptions = {
    type: 'summary',
    format: 'pdf',
    period: 'year'
};

// Generate professional financial report
function exportToPDF() {
    showExportOptionsModal('financial');
}

// Show export options modal
function showExportOptionsModal(reportType) {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.id = 'exportModal';
    modal.style.display = 'flex';
    
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 500px;">
            <div class="modal-header">
                <h3 class="modal-title"><i class="fas fa-file-export" style="color: #2563eb;"></i> Export Report</h3>
                <button class="close-modal" onclick="closeExportModal()">&times;</button>
            </div>
            
            <div style="margin-bottom: 20px;">
                <label style="font-weight: 600; margin-bottom: 10px; display: block;">Report Type</label>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                    <button class="export-type-btn active" data-type="summary" onclick="selectExportType('summary', this)">
                        <i class="fas fa-chart-pie"></i>
                        <span>Summary Report</span>
                    </button>
                    <button class="export-type-btn" data-type="detailed" onclick="selectExportType('detailed', this)">
                        <i class="fas fa-list-alt"></i>
                        <span>Detailed Report</span>
                    </button>
                    <button class="export-type-btn" data-type="balance" onclick="selectExportType('balance', this)">
                        <i class="fas fa-balance-scale"></i>
                        <span>Balance Sheet</span>
                    </button>
                    <button class="export-type-btn" data-type="transactions" onclick="selectExportType('transactions', this)">
                        <i class="fas fa-receipt"></i>
                        <span>Transactions</span>
                    </button>
                </div>
            </div>
            
            <div style="margin-bottom: 20px;">
                <label style="font-weight: 600; margin-bottom: 10px; display: block;">Period</label>
                <select id="exportPeriod" style="width: 100%;">
                    <option value="month">This Month</option>
                    <option value="quarter">This Quarter</option>
                    <option value="year" selected>This Year</option>
                    <option value="all">All Time</option>
                </select>
            </div>
            
            <div style="margin-bottom: 20px;">
                <label style="font-weight: 600; margin-bottom: 10px; display: block;">Format</label>
                <div style="display: flex; gap: 10px;">
                    <button class="export-format-btn active" data-format="pdf" onclick="selectExportFormat('pdf', this)">
                        <i class="fas fa-file-pdf"></i> PDF
                    </button>
                    <button class="export-format-btn" data-format="excel" onclick="selectExportFormat('excel', this)">
                        <i class="fas fa-file-excel"></i> Excel
                    </button>
                </div>
            </div>
            
            <div style="display: flex; gap: 10px; margin-top: 25px;">
                <button class="btn-secondary" style="flex: 1;" onclick="closeExportModal()">Cancel</button>
                <button class="btn-primary" style="flex: 1;" onclick="generateExport()">
                    <i class="fas fa-download"></i> Export
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Reset options
    window.exportOptions = {
        type: 'summary',
        format: 'pdf',
        period: 'year'
    };
}

function selectExportType(type, btn) {
    document.querySelectorAll('.export-type-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    window.exportOptions.type = type;
}

function selectExportFormat(format, btn) {
    document.querySelectorAll('.export-format-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    window.exportOptions.format = format;
}

function closeExportModal() {
    const modal = document.getElementById('exportModal');
    if (modal) modal.remove();
}

function generateExport() {
    const period = document.getElementById('exportPeriod').value;
    window.exportOptions.period = period;
    
    closeExportModal();
    
    switch (window.exportOptions.type) {
        case 'summary':
            generateSummaryReport();
            break;
        case 'detailed':
            generateDetailedReport();
            break;
        case 'balance':
            generateBalanceSheetReport();
            break;
        case 'transactions':
            generateTransactionsReport();
            break;
    }
}

// Get transactions for period
function getTransactionsForPeriod(period) {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    const currentQuarter = Math.floor(currentMonth / 3);
    
    return businessData.transactions.filter(tx => {
        const txDate = parseDateSafe(tx.date);
        switch (period) {
            case 'month':
                return txDate.getFullYear() === currentYear && txDate.getMonth() === currentMonth;
            case 'quarter':
                const txQuarter = Math.floor(txDate.getMonth() / 3);
                return txDate.getFullYear() === currentYear && txQuarter === currentQuarter;
            case 'year':
                return txDate.getFullYear() === currentYear;
            case 'all':
            default:
                return true;
        }
    });
}

// Calculate period totals
function calculatePeriodTotals(transactions) {
    let income = 0, expenses = 0;
    transactions.forEach(tx => {
        if (tx.type === 'income') income += tx.amount;
        else expenses += tx.amount;
    });
    return { income, expenses, profit: income - expenses };
}

// Get period label
function getPeriodLabel(period) {
    const now = new Date();
    switch (period) {
        case 'month':
            return now.toLocaleDateString('en-MY', { month: 'long', year: 'numeric' });
        case 'quarter':
            const quarter = Math.floor(now.getMonth() / 3) + 1;
            return `Q${quarter} ${now.getFullYear()}`;
        case 'year':
            return `Year ${now.getFullYear()}`;
        case 'all':
            return 'All Time';
    }
}

// Export report content (PDF or Excel)
function exportReportContent(reportContent, filename) {
    document.body.appendChild(reportContent);
    
    if (window.exportOptions.format === 'pdf') {
        // Export as PDF using iframe (more reliable than window.open)
        try {
            // Create hidden iframe for printing
            let printFrame = document.getElementById('printFrame');
            if (!printFrame) {
                printFrame = document.createElement('iframe');
                printFrame.id = 'printFrame';
                printFrame.style.cssText = 'position: fixed; right: 0; bottom: 0; width: 0; height: 0; border: 0;';
                document.body.appendChild(printFrame);
            }
            
            const printDoc = printFrame.contentDocument || printFrame.contentWindow.document;
            printDoc.open();
            printDoc.write(`
                <!DOCTYPE html>
                <html>
                <head>
                    <title>${filename}</title>
                    <style>
                        body { margin: 0; padding: 0; }
                        @media print {
                            body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
                        }
                        @page { 
                            size: A4; 
                            margin: 10mm; 
                        }
                    </style>
                </head>
                <body>${reportContent.innerHTML}</body>
                </html>
            `);
            printDoc.close();
            
            // Wait for content to load, then print
            setTimeout(() => {
                try {
                    printFrame.contentWindow.focus();
                    printFrame.contentWindow.print();
                    showNotification('Print dialog opened! Select "Save as PDF" to save.', 'success');
                } catch (printError) {
                    console.error('Print error:', printError);
                    // Fallback: try window.print() on main document
                    fallbackPrint(reportContent, filename);
                }
            }, 300);
            
        } catch (error) {
            console.error('Export error:', error);
            // Fallback method
            fallbackPrint(reportContent, filename);
        }
        document.body.removeChild(reportContent);
    } else if (window.exportOptions.format === 'excel') {
        // Export as Excel (CSV format that Excel can open)
        exportToExcel(filename);
        document.body.removeChild(reportContent);
    } else {
        document.body.removeChild(reportContent);
        showNotification('Unknown export format', 'error');
    }
}

// Fallback print function using a new window
function fallbackPrint(reportContent, filename) {
    const printWindow = window.open('', '_blank', 'width=800,height=600');
    if (printWindow) {
        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>${filename}</title>
                <style>
                    body { margin: 20px; padding: 0; }
                    @media print {
                        body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
                    }
                </style>
            </head>
            <body>
                ${reportContent.innerHTML}
                <script>
                    setTimeout(function() { window.print(); }, 500);
                <\/script>
            </body>
            </html>
        `);
        printWindow.document.close();
        showNotification('Print window opened! Select "Save as PDF" to save.', 'success');
    } else {
        showNotification('Pop-up blocked! Please allow pop-ups for this site to export PDF.', 'error');
    }
}

// Helper function for HTML escaping
function escapeHTML(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function generateMonthlyReport() {
    exportToPDF();
}

// Export functions to window for onclick handlers
window.exportToPDF = exportToPDF;
window.generateMonthlyReport = generateMonthlyReport;
window.showExportOptionsModal = showExportOptionsModal;
window.selectExportType = selectExportType;
window.selectExportFormat = selectExportFormat;
window.closeExportModal = closeExportModal;
window.generateExport = generateExport;
window.getTransactionsForPeriod = getTransactionsForPeriod;
window.calculatePeriodTotals = calculatePeriodTotals;
window.getPeriodLabel = getPeriodLabel;
window.exportReportContent = exportReportContent;
window.fallbackPrint = fallbackPrint;
window.escapeHTML = escapeHTML;
