import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { mkdir, readFile, writeFile } from 'fs/promises';
import { existsSync } from 'fs';
import { join, resolve } from 'path';
import { v4 as uuid } from 'uuid';
import { PDFDocument, StandardFonts, rgb, PDFFont, PDFPage } from 'pdf-lib';
import Decimal from 'decimal.js';
import { Certificate } from '../database/entities/certificate.entity';
import { Template } from '../database/entities/template.entity';
import { Internship } from '../database/entities/internship.entity';
import { User } from '../database/entities/user.entity';
import { TemplateFormat } from '../database/entities/enums';
import { TemplatesService, MappingConfig, TemplateField } from '../templates/templates.service';
import { AttendanceService } from '../attendance/attendance.service';
import { meetsThreshold } from '../common/utils/decimal.util';
import { WebhookEmitterService } from '../webhooks/webhook-emitter.service';

@Injectable()
export class CertificatesService {
  private readonly logger = new Logger(CertificatesService.name);

  constructor(
    @InjectRepository(Certificate) private readonly certRepo: Repository<Certificate>,
    @InjectRepository(Template) private readonly tplRepo: Repository<Template>,
    @InjectRepository(Internship) private readonly internshipRepo: Repository<Internship>,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    private readonly templates: TemplatesService,
    private readonly attendance: AttendanceService,
    private readonly config: ConfigService,
    private readonly emitter: WebhookEmitterService,
  ) {}

  private outputDir(): string {
    return resolve(process.cwd(), this.config.get<string>('app.storage.certificateDir')!);
  }

  /**
   * The 90.00% Absolute Rule — enforced at controller/service layer with
   * precision math. 89.99 → immediate hard block.
   */
  async precheck(studentId: string, internshipId: string) {
    const stats = await this.attendance.stats(studentId, internshipId);
    const threshold = this.config.get<string>('app.business.certAttendanceThreshold', '90.00');
    const eligible = meetsThreshold(stats.percentage, threshold);
    return { ...stats, threshold, eligible };
  }

  async issue(input: { studentId: string; internshipId: string; issuedBy: string }) {
    const pre = await this.precheck(input.studentId, input.internshipId);
    if (!pre.eligible) {
      throw new BadRequestException({
        code: 'ATTENDANCE_BELOW_THRESHOLD',
        message: 'Attendance does not meet the required threshold for certificate issuance.',
        details: {
          currentPercentage: pre.percentage,
          requiredPercentage: pre.threshold,
          shortfall: new Decimal(pre.threshold).minus(pre.percentage).toFixed(2),
        },
      });
    }

    const template = await this.tplRepo.findOne({ where: { isActive: true } });
    if (!template) {
      throw new BadRequestException({
        code: 'NO_ACTIVE_TEMPLATE',
        message: 'No active certificate template. Please ask an administrator to configure one.',
      });
    }

    const mapping = await this.templates.decodeMapping(template.id);
    if (!mapping.fields || mapping.fields.length === 0) {
      throw new BadRequestException({
        code: 'TEMPLATE_UNMAPPED',
        message: 'Active template has no field mapping. Admin must complete the mapping step.',
      });
    }

    // Duplicate guard.
    const existing = await this.certRepo.findOne({
      where: { studentId: input.studentId, internshipId: input.internshipId },
    });
    if (existing) return existing;

    const student = await this.userRepo.findOne({
      where: { id: input.studentId },
      relations: { profile: true },
    });
    const internship = await this.internshipRepo.findOne({ where: { id: input.internshipId } });
    if (!student || !internship) throw new NotFoundException('Student or internship missing');

    const dir = this.outputDir();
    if (!existsSync(dir)) await mkdir(dir, { recursive: true });
    const filename = `cert_${student.id}_${internship.id}_${uuid()}.pdf`;
    const filepath = join(dir, filename);

    const data: Record<string, string> = {
      student_name: `${student.profile?.firstName ?? ''} ${student.profile?.lastName ?? ''}`.trim(),
      internship_title: internship.title,
      organization: internship.organization,
      start_date: internship.startDate,
      end_date: internship.endDate,
      issued_date: new Date().toISOString().slice(0, 10),
    };

    const pdfBytes = await this.renderPdf({
      templatePath: template.localFilePath,
      templateFormat: template.format,
      mapping,
      data,
    });
    await writeFile(filepath, pdfBytes);

    const cert = this.certRepo.create({
      studentId: input.studentId,
      internshipId: input.internshipId,
      templateId: template.id,
      localPdfPath: filepath,
      attendancePercentage: pre.percentage,
      issuedAt: new Date(),
      issuedBy: input.issuedBy,
    });
    const saved = await this.certRepo.save(cert);

    void this.emitter.broadcast('certificate.generated', {
      id: saved.id,
      studentId: saved.studentId,
      internshipId: saved.internshipId,
      templateId: saved.templateId,
      attendancePercentage: saved.attendancePercentage,
      issuedBy: saved.issuedBy,
      issuedAt: saved.issuedAt.toISOString(),
    });

    return saved;
  }

  async listForStudent(studentId: string) {
    return this.certRepo.find({
      where: { studentId },
      relations: { internship: true },
      order: { issuedAt: 'DESC' },
    });
  }

  async listAll() {
    return this.certRepo.find({
      relations: { internship: true, student: { profile: true } as any },
      order: { issuedAt: 'DESC' },
    });
  }

  async downloadBuffer(id: string, requesterId: string, isAdmin: boolean) {
    const cert = await this.certRepo.findOne({ where: { id } });
    if (!cert) throw new NotFoundException('Certificate not found');
    if (!isAdmin && cert.studentId !== requesterId) throw new NotFoundException('Certificate not found');
    const buf = await readFile(cert.localPdfPath);
    return { buffer: buf, filename: cert.localPdfPath.split(/[/\\]/).pop()! };
  }

  private async renderPdf(input: {
    templatePath: string;
    templateFormat: TemplateFormat;
    mapping: MappingConfig;
    data: Record<string, string>;
  }): Promise<Uint8Array> {
    const doc = await PDFDocument.create();
    const font = await doc.embedFont(StandardFonts.HelveticaBold);
    const bytes = await readFile(input.templatePath);

    let page: PDFPage;
    let width: number;
    let height: number;

    if (input.templateFormat === TemplateFormat.PDF) {
      const src = await PDFDocument.load(bytes);
      const [copied] = await doc.copyPages(src, [0]);
      page = doc.addPage([copied.getWidth(), copied.getHeight()]);
      const embeddedPage = await doc.embedPage(copied);
      page.drawPage(embeddedPage, { x: 0, y: 0, width: copied.getWidth(), height: copied.getHeight() });
      width = copied.getWidth();
      height = copied.getHeight();
    } else {
      const image =
        input.templateFormat === TemplateFormat.PNG
          ? await doc.embedPng(bytes)
          : await doc.embedJpg(bytes);
      page = doc.addPage([image.width, image.height]);
      page.drawImage(image, { x: 0, y: 0, width: image.width, height: image.height });
      width = image.width;
      height = image.height;
    }

    for (const f of input.mapping.fields) {
      const value = input.data[f.key];
      if (!value) continue;
      this.paintField(page, font, f, value, height);
    }

    return doc.save();
  }

  private paintField(
    page: PDFPage,
    font: PDFFont,
    f: TemplateField,
    value: string,
    pageHeight: number,
  ) {
    const [r, g, b] = this.hexToRgb(f.fontColor);
    // pdf-lib origin = bottom-left; mapping origin = top-left.
    const textWidth = font.widthOfTextAtSize(value, f.fontSize);
    let x = f.x;
    if (f.align === 'center') x = f.x + (f.width - textWidth) / 2;
    else if (f.align === 'right') x = f.x + f.width - textWidth;
    const y = pageHeight - f.y - f.fontSize;
    page.drawText(value, {
      x,
      y,
      size: f.fontSize,
      font,
      color: rgb(r / 255, g / 255, b / 255),
    });
  }

  private hexToRgb(hex: string): [number, number, number] {
    const h = hex.replace('#', '');
    const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
}
