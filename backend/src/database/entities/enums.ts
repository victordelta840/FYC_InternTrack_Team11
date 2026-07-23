export enum UserRole {
  ADMIN = 'ADMIN',
  MENTOR = 'MENTOR',
  STUDENT = 'STUDENT',
}

export enum AttendanceStatus {
  PRESENT = 'PRESENT',
  ABSENT = 'ABSENT',
  HALF_DAY = 'HALF_DAY',
}

export enum ComplaintStatus {
  OPEN = 'OPEN',
  IN_REVIEW = 'IN_REVIEW',
  ESCALATED = 'ESCALATED',
  RESOLVED = 'RESOLVED',
  CLOSED = 'CLOSED',
}

export enum InternshipStatus {
  DRAFT = 'DRAFT',
  ACTIVE = 'ACTIVE',
  COMPLETED = 'COMPLETED',
  ARCHIVED = 'ARCHIVED',
}

export enum SystemJobStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  FAILED = 'FAILED',
  COMPLETED = 'COMPLETED',
}

export enum SystemJobType {
  ATTENDANCE_IMPORT = 'ATTENDANCE_IMPORT',
  CERTIFICATE_RENDER = 'CERTIFICATE_RENDER',
  WEBHOOK_DELIVERY = 'WEBHOOK_DELIVERY',
  TEMPLATE_OCR = 'TEMPLATE_OCR',
}

export enum TemplateFormat {
  PDF = 'PDF',
  PNG = 'PNG',
  JPG = 'JPG',
}
