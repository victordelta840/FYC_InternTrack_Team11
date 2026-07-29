import { ArrayNotEmpty, IsArray, IsDateString, IsEnum, IsInt, IsOptional, IsString, IsUUID, Min } from 'class-validator';
import { InternshipStatus } from '../database/entities/enums';

export class CreateInternshipDto {
  @IsString() title: string;
  @IsString() organization: string;
  @IsOptional() @IsString() description?: string;
  @IsDateString() startDate: string;
  @IsDateString() endDate: string;
  @IsInt() @Min(1) totalDays: number;

  @IsArray() @IsUUID('4', { each: true })
  mentorIds: string[];

  @IsArray() @IsUUID('4', { each: true })
  studentIds: string[];
}

export class UpdateStatusDto {
  @IsEnum(InternshipStatus)
  status: InternshipStatus;
}

/**
 * Partial edit of an internship's core fields. Mentor/student rosters are
 * managed separately via AssignMentorDto / AssignStudentDto so this DTO
 * intentionally does not include mentorIds/studentIds.
 */
export class UpdateInternshipDto {
  @IsOptional() @IsString() title?: string;
  @IsOptional() @IsString() organization?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsDateString() startDate?: string;
  @IsOptional() @IsDateString() endDate?: string;
  @IsOptional() @IsInt() @Min(1) totalDays?: number;
}

export class AssignMentorDto {
  @IsUUID('4')
  mentorId: string;
}

export class AssignStudentDto {
  @IsUUID('4')
  studentId: string;
}
