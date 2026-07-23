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
