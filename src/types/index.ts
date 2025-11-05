/**
 * Central Type Definitions for Gayatri Power Application
 *
 * This file contains all shared TypeScript interfaces and types
 * used across the application to ensure type safety and consistency.
 */

import { LucideIcon } from 'lucide-react';

// ============= User & Authentication Types =============

export interface Profile {
  id: string;
  full_name: string;
  role: string;
  created_at?: string;
  updated_at?: string;
}

// ============= Equipment Types =============

export interface Equipment {
  id: string;
  name: string;
  qr_code: string;
  location: string;
  description?: string;
  category?: string;
  created_at?: string;
}

export interface CategoryWithIcon {
  name: string;
  icon: LucideIcon;
  color: string;
  qrCode: string;
}

// ============= Checklist Types =============

export interface ChecklistItem {
  id: string;
  title: string;
  description: string;
  sort_order: number;
  category: string;
  expected_value: string | null;
  unit: string | null;
  icon: string | null;
  checklist_id?: string;
}

export interface Checklist {
  id: string;
  title: string;
  description: string;
  frequency?: string;
  equipment_id?: string;
  equipment?: Equipment;
  category?: string;
  completed_at?: string;
  completed_by_name?: string;
  session_number?: number | null;
  created_at?: string;
}

export interface CompletedChecklist {
  id: string;
  checklist_id: string;
  user_id: string;
  equipment_id: string;
  completed_at: string;
  notes: string | null;
  category_unlocked_at: string;
  completed_by_name: string;
  session_number: number | null;
  time_slot: string;
  is_emergency: boolean;
  emergency_reason: string | null;
  emergency_reported_at: string | null;
}

export interface CompletedItem {
  id: string;
  completed_checklist_id: string;
  checklist_item_id: string;
  status: 'pass' | 'fail' | 'na';
  notes: string | null;
  actual_value: string | null;
  has_issue: boolean;
  created_at?: string;
}

export interface ChecklistResult {
  itemId: string;
  status: 'pass' | 'fail' | 'na';
  notes?: string;
  actualValue?: string;
  hasIssue?: boolean;
}

// ============= Issue Types =============

export interface Issue {
  id: string;
  completed_item_id: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  reported_by: string;
  reported_by_name: string;
  reported_at: string;
  resolved_at?: string | null;
  resolution_notes?: string | null;
  created_at?: string;
  updated_at?: string;
}

// ============= Report Types =============

export interface ReportSummary {
  totalChecklists: number;
  totalIssues: number;
  sessionNumber?: number;
  dateGenerated: string;
  emergencyReason?: string;
  completedCategories?: number;
  passCount?: number;
  failCount?: number;
  naCount?: number;
}

export interface Report {
  id: string;
  title: string;
  report_type: 'daily' | 'weekly' | 'monthly' | 'emergency' | 'custom';
  generated_at: string;
  generated_by: string;
  generated_by_name?: string;
  date_from: string;
  date_to: string;
  summary?: ReportSummary;
  content?: string;
}

// ============= Photo/Media Types =============

export interface Photo {
  id: string;
  completed_item_id: string;
  storage_path: string;
  url: string;
  caption?: string | null;
  uploaded_at: string;
}

// ============= Time Slot Types =============

export interface TimeSlotInfo {
  session: number;
  startTime: string;
  endTime: string;
  label: string;
}

export interface NextTimeSlot {
  session: number;
  time: string;
}

// ============= Category Status Types =============

export interface CategoryStatus {
  unlocked: boolean;
  completed: boolean;
  unlockedAt?: string;
  completedAt?: string;
}

// ============= Emergency Context Types =============

export interface EmergencyContext {
  reason: string;
  reportedAt: string;
  categoryName?: string;
}

// ============= Database Query Result Types =============

export interface CompletedChecklistWithItems extends CompletedChecklist {
  completed_items: CompletedItem[];
}

export interface ChecklistWithEquipment extends Checklist {
  equipment: Equipment;
}

export interface CompletedChecklistWithEquipmentAndItems {
  id: string;
  completed_at: string;
  completed_by_name: string;
  notes: string | null;
  equipment: Equipment;
  completed_items: CompletedItem[];
}

// ============= Component Prop Types =============

export interface ChecklistViewProps {
  checklist: Checklist;
  items: ChecklistItem[];
  onComplete: (results: ChecklistResult[]) => void;
  onBack: () => void;
}

export interface CategoryDashboardProps {
  onStartChecklist: (checklist: Checklist) => void;
  onScanQR: () => void;
}

export interface QRScannerProps {
  onScanSuccess: (qrCode: string) => void;
  onClose: () => void;
}

export interface NavigationProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

// ============= Form Types =============

export interface EmergencyFormData {
  categoryName: string;
  reason: string;
}

// ============= API Response Types =============

export interface SupabaseResponse<T> {
  data: T | null;
  error: Error | null;
}

// ============= Utility Types =============

export type ChecklistStatus = 'pending' | 'in_progress' | 'completed';
export type ItemStatus = 'pass' | 'fail' | 'na' | 'pending';
export type SessionNumber = 1 | 2 | 3 | 4;

// ============= Type Guards =============

export function isCompletedChecklistWithItems(
  obj: unknown
): obj is CompletedChecklistWithItems {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'id' in obj &&
    'completed_items' in obj &&
    Array.isArray((obj as CompletedChecklistWithItems).completed_items)
  );
}

export function isValidStatus(status: string): status is 'pass' | 'fail' | 'na' {
  return status === 'pass' || status === 'fail' || status === 'na';
}

export function isValidPriority(
  priority: string
): priority is 'low' | 'medium' | 'high' | 'critical' {
  return ['low', 'medium', 'high', 'critical'].includes(priority);
}
