import { IsEnum, IsInt, IsOptional, IsString, IsUUID, Max, Min, MinLength } from 'class-validator';
import { ComplaintStatus } from '../database/entities/enums';

export class CreateComplaintDto {
  @IsString() @MinLength(2)
  category: string;

  @IsString() @MinLength(3)
  subject: string;

  @IsString() @MinLength(10)
  description: string;

  @IsOptional() @IsUUID('4')
  assignedTo?: string;

  @IsOptional() @IsInt() @Min(1) @Max(720)
  slaHours?: number;
}

export class UpdateStatusDto {
  @IsEnum(ComplaintStatus)
  status: ComplaintStatus;

  @IsOptional() @IsString() @MinLength(5)
  resolutionNotes?: string;
}

export class AssignDto {
  @IsUUID('4') assigneeId: string;
}
