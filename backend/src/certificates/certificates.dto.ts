import { IsUUID } from 'class-validator';

export class IssueCertificateDto {
  @IsUUID('4') studentId: string;
  @IsUUID('4') internshipId: string;
}

export class PrecheckDto {
  @IsUUID('4') studentId: string;
  @IsUUID('4') internshipId: string;
}
