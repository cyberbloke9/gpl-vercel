import { format } from 'date-fns';

interface CompletedChecklist {
  id: string;
  checklist_id: string;
  completed_at: string;
  completed_by_name: string;
  equipment_id: string;
  category_unlocked_at: string;
  notes: string | null;
}

interface CompletedItem {
  id: string;
  checklist_item_id: string;
  status: string;
  actual_value: string | null;
  notes: string | null;
  has_issue: boolean;
}

interface ChecklistItem {
  id: string;
  title: string;
  expected_value: string | null;
  unit: string | null;
  category: string;
}

interface Issue {
  id: string;
  description: string;
  priority: string;
  status: string;
  reported_at: string;
  reported_by_name: string;
}

interface Equipment {
  id: string;
  name: string;
  category: string;
  location: string;
}

interface ReportData {
  completedChecklists: (CompletedChecklist & {
    equipment: Equipment;
    items: (CompletedItem & { checklist_item: ChecklistItem })[];
  })[];
  issues: Issue[];
  dateFrom: Date;
  dateTo: Date;
  reportType: string;
  generatedBy: string;
}

export const generateReportHTML = (data: ReportData): string => {
  const passedItems = data.completedChecklists.flatMap(c => c.items).filter(i => i.status === 'pass').length;
  const failedItems = data.completedChecklists.flatMap(c => c.items).filter(i => i.status === 'fail').length;
  const totalItems = passedItems + failedItems;
  const completionRate = totalItems > 0 ? ((passedItems / totalItems) * 100).toFixed(1) : '0';

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Maintenance Report - ${format(data.dateFrom, 'PP')} to ${format(data.dateTo, 'PP')}</title>
  <style>
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 1200px;
      margin: 0 auto;
      padding: 20px;
      background: #f5f5f5;
    }
    .report-container {
      background: white;
      padding: 40px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    }
    .header {
      border-bottom: 4px solid #2563eb;
      padding-bottom: 20px;
      margin-bottom: 30px;
    }
    .header h1 {
      margin: 0;
      color: #1e40af;
      font-size: 28px;
    }
    .header .meta {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 15px;
      margin-top: 15px;
      font-size: 14px;
    }
    .meta-item {
      background: #f8fafc;
      padding: 10px;
      border-radius: 4px;
    }
    .meta-label {
      font-weight: bold;
      color: #64748b;
    }
    .summary {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 20px;
      margin: 30px 0;
    }
    .summary-card {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 20px;
      border-radius: 8px;
      text-align: center;
    }
    .summary-card.success {
      background: linear-gradient(135deg, #10b981 0%, #059669 100%);
    }
    .summary-card.danger {
      background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
    }
    .summary-card.warning {
      background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
    }
    .summary-value {
      font-size: 36px;
      font-weight: bold;
      margin: 10px 0;
    }
    .summary-label {
      font-size: 14px;
      opacity: 0.9;
    }
    .section {
      margin: 40px 0;
    }
    .section-title {
      font-size: 20px;
      font-weight: bold;
      color: #1e40af;
      margin-bottom: 20px;
      padding-bottom: 10px;
      border-bottom: 2px solid #e5e7eb;
    }
    .checklist-block {
      background: #f8fafc;
      border-left: 4px solid #2563eb;
      padding: 20px;
      margin-bottom: 20px;
      border-radius: 4px;
    }
    .checklist-header {
      display: flex;
      justify-content: space-between;
      align-items: start;
      margin-bottom: 15px;
    }
    .checklist-title {
      font-weight: bold;
      font-size: 16px;
      color: #1e293b;
    }
    .checklist-meta {
      font-size: 13px;
      color: #64748b;
      margin-top: 5px;
    }
    .items-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 15px;
      background: white;
    }
    .items-table th {
      background: #e5e7eb;
      padding: 10px;
      text-align: left;
      font-size: 13px;
      font-weight: 600;
      color: #374151;
    }
    .items-table td {
      padding: 10px;
      border-bottom: 1px solid #e5e7eb;
      font-size: 13px;
    }
    .status-badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 11px;
      font-weight: bold;
      text-transform: uppercase;
    }
    .status-pass {
      background: #d1fae5;
      color: #065f46;
    }
    .status-fail {
      background: #fee2e2;
      color: #991b1b;
    }
    .issue-item {
      background: #fef2f2;
      border-left: 4px solid #dc2626;
      padding: 15px;
      margin-bottom: 15px;
      border-radius: 4px;
    }
    .issue-header {
      display: flex;
      justify-content: space-between;
      margin-bottom: 8px;
    }
    .priority-high {
      color: #dc2626;
      font-weight: bold;
    }
    .priority-medium {
      color: #f59e0b;
      font-weight: bold;
    }
    .priority-low {
      color: #3b82f6;
      font-weight: bold;
    }
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 2px solid #e5e7eb;
      text-align: center;
      color: #64748b;
      font-size: 12px;
    }
    @media print {
      body {
        background: white;
      }
      .report-container {
        box-shadow: none;
      }
      .checklist-block {
        page-break-inside: avoid;
      }
    }
  </style>
</head>
<body>
  <div class="report-container">
    <div class="header">
      <h1>🔧 Maintenance Report</h1>
      <div class="meta">
        <div class="meta-item">
          <div class="meta-label">Report Type</div>
          <div>${data.reportType.toUpperCase()}</div>
        </div>
        <div class="meta-item">
          <div class="meta-label">Period</div>
          <div>${format(data.dateFrom, 'PP')} - ${format(data.dateTo, 'PP')}</div>
        </div>
        <div class="meta-item">
          <div class="meta-label">Generated By</div>
          <div>${data.generatedBy}</div>
        </div>
        <div class="meta-item">
          <div class="meta-label">Generated On</div>
          <div>${format(new Date(), 'PPp')}</div>
        </div>
      </div>
    </div>

    <div class="summary">
      <div class="summary-card">
        <div class="summary-label">Checklists Completed</div>
        <div class="summary-value">${data.completedChecklists.length}</div>
      </div>
      <div class="summary-card success">
        <div class="summary-label">Items Passed</div>
        <div class="summary-value">${passedItems}</div>
      </div>
      <div class="summary-card danger">
        <div class="summary-label">Items Failed</div>
        <div class="summary-value">${failedItems}</div>
      </div>
      <div class="summary-card warning">
        <div class="summary-label">Completion Rate</div>
        <div class="summary-value">${completionRate}%</div>
      </div>
    </div>

    <div class="section">
      <div class="section-title">📋 Completed Inspections</div>
      ${data.completedChecklists.length === 0 ? '<p style="color: #64748b;">No inspections completed during this period.</p>' : ''}
      ${data.completedChecklists.map(checklist => `
        <div class="checklist-block">
          <div class="checklist-header">
            <div>
              <div class="checklist-title">${checklist.equipment.name} - ${checklist.equipment.category}</div>
              <div class="checklist-meta">
                📍 ${checklist.equipment.location} | 
                ✓ Completed by ${checklist.completed_by_name} on ${format(new Date(checklist.completed_at), 'PPp')}
              </div>
              ${checklist.notes ? `<div class="checklist-meta" style="margin-top: 8px; color: #f59e0b;">📝 ${checklist.notes}</div>` : ''}
            </div>
          </div>
          
          <table class="items-table">
            <thead>
              <tr>
                <th>Inspection Item</th>
                <th>Expected Value</th>
                <th>Actual Value</th>
                <th>Status</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              ${checklist.items.map(item => `
                <tr>
                  <td>${item.checklist_item.title}</td>
                  <td>${item.checklist_item.expected_value || '-'} ${item.checklist_item.unit || ''}</td>
                  <td>${item.actual_value || '-'}</td>
                  <td><span class="status-badge status-${item.status}">${item.status}</span></td>
                  <td>${item.notes || '-'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `).join('')}
    </div>

    <div class="section">
      <div class="section-title">⚠️ Issues Identified (${data.issues.length})</div>
      ${data.issues.length === 0 ? '<p style="color: #64748b;">No issues identified during this period.</p>' : ''}
      ${data.issues.map(issue => `
        <div class="issue-item">
          <div class="issue-header">
            <div>
              <span class="priority-${issue.priority}">Priority: ${issue.priority.toUpperCase()}</span>
            </div>
            <div style="font-size: 12px; color: #64748b;">
              ${format(new Date(issue.reported_at), 'PPp')}
            </div>
          </div>
          <div style="font-weight: 500; margin-bottom: 5px;">${issue.description}</div>
          <div style="font-size: 12px; color: #64748b;">
            Reported by: ${issue.reported_by_name} | Status: ${issue.status}
          </div>
        </div>
      `).join('')}
    </div>

    <div class="footer">
      <p>This is an automated maintenance report generated by the Maintenance Hub system.</p>
      <p>For questions or concerns, please contact your maintenance supervisor.</p>
    </div>
  </div>
</body>
</html>
  `;
};

export const downloadReport = (html: string, filename: string) => {
  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};
