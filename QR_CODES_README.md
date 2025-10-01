# Production QR Codes - Equipment Maintenance System

## Overview
This system uses 6 production QR codes that are fully integrated with the backend to unlock specific equipment checklists.

## QR Codes and Their Functions

### 1. Oil Pressure Unit
- **Code:** `OPU-2025-001`
- **Unlocks:** Oil Pressure Unit Checklist
- **Category:** Oil Pressure Unit

### 2. Cooling System
- **Code:** `CS-2025-001`
- **Unlocks:** Cooling System Checklist
- **Category:** Cooling System

### 3. Generator
- **Code:** `GEN-2025-001`
- **Unlocks:** Generator Checklist
- **Category:** Generator

### 4. Turbine System
- **Code:** `TURB-2025-001`
- **Unlocks:** Turbine System Checklist
- **Category:** Turbine System

### 5. Electrical Systems
- **Code:** `ELEC-2025-001`
- **Unlocks:** Electrical Systems Checklist
- **Category:** Electrical Systems

### 6. Safety & General
- **Code:** `SAFE-2025-001`
- **Unlocks:** Safety & General Checklist
- **Category:** Safety & General

## How to Download Production QR Codes

1. Open the application and navigate to the **Reports** tab
2. Look for the button labeled **"Download Production QR Codes (PNG)"**
3. Click the button to download all 6 QR codes as separate PNG files
4. Each file will be named with the format: `[CODE]-[CATEGORY].png`
5. Print these QR codes and attach them to the corresponding equipment

## Backend Integration

### Database Structure
- QR codes are stored in the `equipment` table
- Each equipment entry links to a corresponding checklist via category matching
- When a QR code is scanned:
  1. The system looks up the equipment by QR code
  2. Finds the matching checklist based on equipment category
  3. Loads all checklist items for that category
  4. Displays the checklist for the technician to complete

### Authentication Flow
- Users must be authenticated to scan QR codes
- Only logged-in technicians can access and complete checklists
- All checklist completions are tracked with user ID, timestamp, and completion data
- Issues detected during inspections are automatically logged

### Data Security (RLS Policies)
- Row Level Security ensures users can only view their own completed checklists
- Issues are user-specific and protected by RLS policies
- Equipment and checklist templates are readable by all authenticated users
- Write operations are restricted to authorized users only

## Printing Recommendations

- **Size:** Print at 512x640 pixels or larger for optimal scanning
- **Material:** Use laminated cards for durability
- **Placement:** Attach QR codes directly on or near the equipment
- **Lighting:** Ensure QR codes are placed in well-lit areas for easy scanning
- **Protection:** Consider weatherproof enclosures for outdoor equipment

## Testing

For testing purposes, you can also download an HTML test sheet with all QR codes using the "Download Test QR Codes (HTML)" button in the Reports section. This is useful for development and training purposes.

## Troubleshooting

If a QR code doesn't unlock the correct checklist:
1. Verify the equipment entry exists in the database with the correct QR code
2. Check that the equipment category matches a checklist category exactly
3. Ensure the user is properly authenticated
4. Check browser console for any error messages

## Technical Details

- QR codes are generated using the `qrcode` npm package
- Production codes are 512x512 pixels with 2-pixel margins
- Labels are added below each QR code for easy identification
- All codes use high contrast (#000000 on #FFFFFF) for maximum scannability
