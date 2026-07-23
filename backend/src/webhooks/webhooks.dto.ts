import { ArrayNotEmpty, IsArray, IsBoolean, IsOptional, IsString, IsUrl } from 'class-validator';

export class CreateWebhookDto {
  @IsString() name: string;
  @IsUrl({ require_tld: false }) targetUrl: string;
  @IsArray() @ArrayNotEmpty() events: string[];
}

export class UpdateWebhookDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsUrl({ require_tld: false }) targetUrl?: string;
  @IsOptional() @IsArray() @ArrayNotEmpty() events?: string[];
  @IsOptional() @IsBoolean() isActive?: boolean;
}
