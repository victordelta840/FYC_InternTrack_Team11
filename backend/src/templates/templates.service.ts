import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { writeFile, mkdir, readFile, unlink } from 'fs/promises';
import { existsSync } from 'fs';
import { join, extname, resolve } from 'path';
import { v4 as uuid } from 'uuid';
import { createWorker } from 'tesseract.js';
import { Template } from '../database/entities/template.entity';
import { TemplateFormat } from '../database/entities/enums';
import { decryptJson, encryptJson } from '../common/utils/crypto.util';
import { Certificate } from '../database/entities/certificate.entity';

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

export interface MappingConfig {
  fields: TemplateField[];
  ocrTried?: boolean;
  ocrConfident?: boolean;
}

const KNOWN_PLACEHOLDERS = [
  { key: 'student_name', regex: /(\{\{\s*student[_ ]?name\s*\}\}|\[STUDENT[_ ]?NAME\])/i },
  { key: 'internship_title', regex: /(\{\{\s*internship[_ ]?title\s*\}\}|\[INTERNSHIP[_ ]?TITLE\])/i },
  { key: 'organization', regex: /(\{\{\s*organization\s*\}\}|\[ORGANIZATION\])/i },
  { key: 'start_date', regex: /(\{\{\s*start[_ ]?date\s*\}\}|\[START[_ ]?DATE\])/i },
  { key: 'end_date', regex: /(\{\{\s*end[_ ]?date\s*\}\}|\[END[_ ]?DATE\])/i },
  { key: 'issued_date', regex: /(\{\{\s*issued[_ ]?date\s*\}\}|\[ISSUED[_ ]?DATE\])/i },
];

@Injectable()
export class TemplatesService {
  constructor(
    @InjectRepository(Template)
    private readonly repo: Repository<Template>,
    private readonly ds: DataSource,
    private readonly config: ConfigService,
    @InjectRepository(Certificate)
    private readonly certificateRepo: Repository<Certificate>,
  ) {}

  private storagePath(): string {
    return resolve(process.cwd(), this.config.get<string>('app.storage.templateDir')!);
  }

  async list() {
    const rows = await this.repo.find({ order: { createdAt: 'DESC' } });
    return rows.map((t) => this.serialize(t));
  }

  async findOne(id: string) {
    const t = await this.repo.findOne({ where: { id } });
    if (!t) throw new NotFoundException('Template not found');
    return this.serialize(t);
  }

  async getActive() {
    const t = await this.repo.findOne({ where: { isActive: true } });
    if (!t) return null;
    return this.serialize(t);
  }

  async upload(input: {
    name: string;
    file: Express.Multer.File;
    createdBy: string;
  }): Promise<ReturnType<TemplatesService['serialize']>> {
    const ext = extname(input.file.originalname).toLowerCase();
    let format: TemplateFormat;
    if (ext === '.pdf') format = TemplateFormat.PDF;
    else if (ext === '.png') format = TemplateFormat.PNG;
    else if (ext === '.jpg' || ext === '.jpeg') format = TemplateFormat.JPG;
    else throw new BadRequestException('Only .pdf, .png, .jpg templates are supported');

    const dir = this.storagePath();
    if (!existsSync(dir)) await mkdir(dir, { recursive: true });
    const filename = `${uuid()}${ext}`;
    const filepath = join(dir, filename);
    await writeFile(filepath, input.file.buffer);

    // Attempt local heuristic + OCR mapping; degrade gracefully on failure.
    let mapping: MappingConfig = { fields: [], ocrTried: false, ocrConfident: false };
    try {
      mapping = await this.attemptLocalMapping(filepath, format);
    } catch {
      mapping = { fields: [], ocrTried: true, ocrConfident: false };
    }

    const encrypted = encryptJson(mapping);
    const row = this.repo.create({
      name: input.name,
      localFilePath: filepath,
      format,
      mappingConfig: encrypted,
      isActive: false,
      createdBy: input.createdBy,
    });
    const saved = await this.repo.save(row);
    return this.serialize(saved);
  }

  async saveMapping(id: string, mapping: MappingConfig) {
    const t = await this.repo.findOne({ where: { id } });
    if (!t) throw new NotFoundException('Template not found');
    if (!mapping.fields || !Array.isArray(mapping.fields)) {
      throw new BadRequestException('mapping.fields is required');
    }
    t.mappingConfig = encryptJson({ ...mapping, ocrConfident: true });
    await this.repo.save(t);
    return this.serialize(t);
  }

  async setActive(id: string) {
    return this.ds.transaction(async (m) => {
      await m.getRepository(Template).update({ isActive: true }, { isActive: false });
      const t = await m.getRepository(Template).findOne({ where: { id } });
      if (!t) throw new NotFoundException('Template not found');
      t.isActive = true;
      await m.getRepository(Template).save(t);
      return this.serialize(t);
    });
  }

  async remove(id: string): Promise<{ success: true; message: string }> {
    const t = await this.repo.findOne({ where: { id } });
    if (!t) throw new NotFoundException('Template not found');

    if (t.isActive) {
      throw new BadRequestException(
        'Cannot delete active template. Activate another template first.',
      );
    }

    const certificateCount = await this.certificateRepo.count({
      where: { templateId: id },
    });

    if (certificateCount > 0) {
      throw new BadRequestException(
        'This template cannot be deleted because certificates have already been generated using it.',
      );
    }

    try {
      await unlink(t.localFilePath);
    } catch {
      // Ignore if the file is already missing
    }

    await this.repo.delete({ id: t.id });

    return {
      success: true,
      message: 'Template deleted successfully',
    };
  }

  async decodeMapping(id: string): Promise<MappingConfig> {
    const t = await this.repo.findOne({ where: { id } });
    if (!t) throw new NotFoundException('Template not found');
    return decryptJson<MappingConfig>(t.mappingConfig);
  }

  async fileBuffer(id: string): Promise<{ buffer: Buffer; format: TemplateFormat; name: string }> {
    const t = await this.repo.findOne({ where: { id } });
    if (!t) throw new NotFoundException('Template not found');
    const buf = await readFile(t.localFilePath);
    return { buffer: buf, format: t.format, name: t.name };
  }

  serialize(t: Template) {
    let mapping: MappingConfig = { fields: [] };
    try {
      mapping = decryptJson<MappingConfig>(t.mappingConfig);
    } catch {
      mapping = { fields: [] };
    }
    return {
      id: t.id,
      name: t.name,
      format: t.format,
      isActive: t.isActive,
      fileName: t.localFilePath.split(/[/\\]/).pop() ?? '',
      mapping,
      createdBy: t.createdBy,
      createdAt: t.createdAt,
    };
  }

  /**
   * Local heuristic + tesseract.js OCR mapping.
   * Only PNG/JPG are OCR'd. PDFs skip OCR (require rasterization tooling).
   */
  private async attemptLocalMapping(
    filepath: string,
    format: TemplateFormat,
  ): Promise<MappingConfig> {
    if (!this.config.get<boolean>('app.tesseract.enabled')) {
      return { fields: [], ocrTried: false, ocrConfident: false };
    }
    if (format === TemplateFormat.PDF) {
      return { fields: [], ocrTried: false, ocrConfident: false };
    }

    const lang = this.config.get<string>('app.tesseract.lang', 'eng');
    const worker = await createWorker(lang);
    try {
      const { data } = await worker.recognize(filepath);
      const found: TemplateField[] = [];
      const words = (data as any).words ?? [];
      for (const w of words) {
        for (const ph of KNOWN_PLACEHOLDERS) {
          if (ph.regex.test(w.text)) {
            const bbox = w.bbox;
            found.push({
              key: ph.key,
              page: 1,
              x: bbox.x0,
              y: bbox.y0,
              width: bbox.x1 - bbox.x0,
              height: bbox.y1 - bbox.y0,
              fontSize: 24,
              fontColor: '#000000',
              align: 'left',
            });
          }
        }
      }
      return {
        fields: found,
        ocrTried: true,
        ocrConfident: found.length >= 1,
      };
    } finally {
      await worker.terminate();
    }
  }
}