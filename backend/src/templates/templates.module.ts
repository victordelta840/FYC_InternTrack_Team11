import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Template } from '../database/entities/template.entity';
import { TemplatesController } from './templates.controller';
import { TemplatesService } from './templates.service';
import { Certificate } from '../database/entities/certificate.entity';
@Module({
  imports: [TypeOrmModule.forFeature([Template,Certificate,]),],
  controllers: [TemplatesController],
  providers: [TemplatesService],
  exports: [TemplatesService],
})
export class TemplatesModule {}
