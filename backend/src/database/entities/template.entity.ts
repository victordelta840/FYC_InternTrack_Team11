import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from './base.entity';
import { TemplateFormat } from './enums';

/**
 * A single `is_active = true` row is enforced at application level.
 * MySQL does not support partial unique indexes; the service layer
 * uses a transaction to guarantee the invariant.
 */
@Entity({ name: 'templates' })
@Index('idx_templates_is_active', ['isActive'])
export class Template extends BaseEntity {
  @Column({ type: 'varchar', length: 200 })
  name: string;

  @Column({ name: 'local_file_path', type: 'varchar', length: 500 })
  localFilePath: string;

  @Column({ type: 'enum', enum: TemplateFormat })
  format: TemplateFormat;

  /**
   * Mapping between placeholder keys and their spatial coordinates.
   * Stored as an ENCRYPTED JSON string (see TemplatesService).
   *
   * Decrypted shape:
   * {
   *   "fields": [
   *     { "key":"student_name", "page":1, "x":120, "y":320, "width":300,
   *       "height":40, "fontSize":24, "fontColor":"#000000", "align":"left" }
   *   ]
   * }
   */
  @Column({ name: 'mapping_config', type: 'text' })
  mappingConfig: string;

  @Column({ name: 'is_active', type: 'boolean', default: false })
  isActive: boolean;

  @Column({ name: 'created_by', type: 'char', length: 36 })
  createdBy: string;
}
