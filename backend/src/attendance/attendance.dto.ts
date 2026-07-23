import { IsDateString, IsEnum, IsOptional, IsString, IsUUID, MinLength } from 'class-validator';
import { AttendanceStatus } from '../database/entities/enums';

export class MarkAttendanceDto {
  @IsUUID('4') internshipId: string;
  @IsUUID('4') studentId: string;
  @IsDateString() date: string;
  @IsEnum(AttendanceStatus) status: AttendanceStatus;
  @IsOptional() @IsString() notes?: string;
}

export class EditAttendanceDto {
  @IsEnum(AttendanceStatus) status: AttendanceStatus;
  @IsString() @MinLength(5) justification: string;
  @IsOptional() @IsString() notes?: string;
}

export class ImportCommitDto {
  @IsUUID('4') internshipId: string;
  // The staging payload sent back from the preview step.
  staging: unknown;
}

export class ImportPreviewDto {
  @IsUUID('4') internshipId: string;
}
