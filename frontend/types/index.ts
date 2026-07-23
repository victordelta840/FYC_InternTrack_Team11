export type Role = 'ADMIN' | 'MENTOR' | 'STUDENT';

export interface AuthUser {
  id: string;
  email: string;
  role: Role;
  firstName: string;
  lastName: string;
  department?: string | null;
  rollNumber?: string | null;
}

export type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'HALF_DAY';

export interface Internship {
  id: string;
  title: string;
  organization: string;
  description: string | null;
  startDate: string;
  endDate: string;
  totalDays: number;
  status: 'DRAFT' | 'ACTIVE' | 'COMPLETED' | 'ARCHIVED';
  mentors?: Array<{ mentor: { id: string; email: string; profile?: { firstName: string; lastName: string } } }>;
  students?: Array<{ student: { id: string; email: string; profile?: { firstName: string; lastName: string } } }>;
}

export interface AttendanceRecord {
  id: string;
  studentId: string;
  internshipId: string;
  mentorId: string;
  date: string;
  status: AttendanceStatus;
  notes: string | null;
}

export interface AttendanceStats {
  studentId: string;
  internshipId: string;
  totalDays: number;
  counted: number;
  present: number;
  absent: number;
  halfDay: number;
  percentage: string;
}

export interface CertPrecheck extends AttendanceStats {
  threshold: string;
  eligible: boolean;
}

export interface Certificate {
  id: string;
  studentId: string;
  internshipId: string;
  templateId: string;
  localPdfPath: string;
  attendancePercentage: string;
  issuedAt: string;
  internship?: Internship;
}

export interface TemplateField {
  key: string;
  page: number;
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize: number;
  fontColor: string;
  align: 'left' | 'center' | 'right';
}

export interface Template {
  id: string;
  name: string;
  format: 'PDF' | 'PNG' | 'JPG';
  isActive: boolean;
  fileName: string;
  mapping: { fields: TemplateField[]; ocrTried?: boolean; ocrConfident?: boolean };
  createdBy: string;
  createdAt: string;
}
