/**
 * QR Code Generator Utility
 * Generates QR codes for equipment testing
 */

interface QRCodeData {
  code: string;
  category: string;
  equipment: string;
  description: string;
}

/**
 * Test QR codes for each equipment category
 * These codes can be scanned to unlock category-specific checklists
 */
export const TEST_QR_CODES: QRCodeData[] = [
  {
    code: "OPU-2025-001",
    category: "Oil Pressure Unit",
    equipment: "Oil Pressure Monitor",
    description: "Scan to unlock Oil Pressure Unit checklist"
  },
  {
    code: "CS-2025-001",
    category: "Cooling System",
    equipment: "Primary Cooling Unit",
    description: "Scan to unlock Cooling System checklist"
  },
  {
    code: "GEN-2025-001",
    category: "Generator",
    equipment: "Backup Generator 1",
    description: "Scan to unlock Generator checklist"
  },
  {
    code: "TURB-2025-001",
    category: "Turbine System",
    equipment: "Main Turbine",
    description: "Scan to unlock Turbine System checklist"
  },
  {
    code: "ELEC-2025-001",
    category: "Electrical Systems",
    equipment: "Main Electrical Panel",
    description: "Scan to unlock Electrical Systems checklist"
  },
  {
    code: "SAFE-2025-001",
    category: "Safety & General",
    equipment: "Safety Equipment Station",
    description: "Scan to unlock Safety & General checklist"
  }
];

/**
 * Generates a printable QR code test sheet HTML
 */
export const generateQRCodeTestSheet = (): string => {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Equipment QR Codes - Test Sheet</title>
  <script src="https://cdn.jsdelivr.net/npm/qrcode@1.5.3/build/qrcode.min.js"></script>
  <style>
    body {
      font-family: Arial, sans-serif;
      padding: 20px;
      max-width: 1200px;
      margin: 0 auto;
    }
    .header {
      text-align: center;
      margin-bottom: 40px;
      border-bottom: 3px solid #333;
      padding-bottom: 20px;
    }
    .qr-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 30px;
      margin-top: 30px;
    }
    .qr-card {
      border: 2px solid #ddd;
      border-radius: 8px;
      padding: 20px;
      text-align: center;
      background: #f9f9f9;
    }
    .qr-code {
      margin: 15px auto;
      background: white;
      padding: 15px;
      border-radius: 8px;
    }
    .category {
      font-weight: bold;
      font-size: 18px;
      color: #2563eb;
      margin-bottom: 10px;
    }
    .code {
      font-family: 'Courier New', monospace;
      font-size: 16px;
      background: #333;
      color: #fff;
      padding: 8px 12px;
      border-radius: 4px;
      display: inline-block;
      margin: 10px 0;
    }
    .equipment {
      color: #666;
      font-size: 14px;
      margin-top: 5px;
    }
    .instructions {
      background: #fffbeb;
      border: 2px solid #fbbf24;
      border-radius: 8px;
      padding: 20px;
      margin-bottom: 30px;
    }
    @media print {
      .qr-card {
        page-break-inside: avoid;
      }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>🔧 Equipment QR Codes - Test Sheet</h1>
    <p>Maintenance Checklist System</p>
  </div>

  <div class="instructions">
    <h2>📱 How to Use These QR Codes:</h2>
    <ol>
      <li>Open the maintenance app and navigate to the Checklists tab</li>
      <li>Click the "Scan Equipment QR" button</li>
      <li>Point your camera at any QR code below</li>
      <li>The corresponding checklist will automatically unlock and display</li>
    </ol>
    <p><strong>Note:</strong> Each QR code unlocks a specific equipment category checklist for daily maintenance.</p>
  </div>

  <div class="qr-grid" id="qrGrid"></div>

  <script>
    const qrCodes = ${JSON.stringify(TEST_QR_CODES, null, 2)};

    qrCodes.forEach((qr, index) => {
      const card = document.createElement('div');
      card.className = 'qr-card';
      
      const category = document.createElement('div');
      category.className = 'category';
      category.textContent = qr.category;
      
      const code = document.createElement('div');
      code.className = 'code';
      code.textContent = qr.code;
      
      const qrCodeDiv = document.createElement('div');
      qrCodeDiv.className = 'qr-code';
      qrCodeDiv.id = 'qr-' + index;
      
      const equipment = document.createElement('div');
      equipment.className = 'equipment';
      equipment.textContent = qr.equipment;
      
      const description = document.createElement('div');
      description.className = 'equipment';
      description.textContent = qr.description;
      
      card.appendChild(category);
      card.appendChild(code);
      card.appendChild(qrCodeDiv);
      card.appendChild(equipment);
      card.appendChild(description);
      
      document.getElementById('qrGrid').appendChild(card);
      
      // Generate QR code
      QRCode.toCanvas(qr.code, { width: 200, margin: 2 }, (err, canvas) => {
        if (!err) {
          document.getElementById('qr-' + index).appendChild(canvas);
        }
      });
    });
  </script>
</body>
</html>
  `;
};

export const downloadQRCodeSheet = () => {
  const html = generateQRCodeTestSheet();
  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'equipment-qr-codes.html';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};
