import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitSchema1706000000000 implements MigrationInterface {
  name = 'InitSchema1706000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Users
    await queryRunner.query(`
      CREATE TABLE \`users\` (
        \`id\` char(36) NOT NULL,
        \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        \`deleted_at\` datetime(6) NULL,
        \`email\` varchar(191) NOT NULL,
        \`password_hash\` varchar(255) NOT NULL,
        \`role\` enum('ADMIN','MENTOR','STUDENT') NOT NULL,
        \`is_active\` tinyint(1) NOT NULL DEFAULT 1,
        \`last_login_at\` datetime(6) NULL,
        \`failed_login_attempts\` int NOT NULL DEFAULT 0,
        \`locked_until\` datetime(6) NULL,
        \`refresh_token_hash\` varchar(255) NULL,
        UNIQUE INDEX \`idx_users_email\` (\`email\`),
        INDEX \`idx_users_role\` (\`role\`),
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // Profiles
    await queryRunner.query(`
      CREATE TABLE \`profiles\` (
        \`id\` char(36) NOT NULL,
        \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        \`deleted_at\` datetime(6) NULL,
        \`user_id\` char(36) NOT NULL,
        \`first_name\` varchar(80) NOT NULL,
        \`last_name\` varchar(80) NOT NULL,
        \`phone\` varchar(30) NULL,
        \`roll_number\` varchar(60) NULL,
        \`department\` varchar(120) NULL,
        \`avatar_path\` varchar(255) NULL,
        \`metadata\` json NULL,
        UNIQUE INDEX \`uq_profile_user\` (\`user_id\`),
        PRIMARY KEY (\`id\`),
        CONSTRAINT \`fk_profile_user\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // Internships
    await queryRunner.query(`
      CREATE TABLE \`internships\` (
        \`id\` char(36) NOT NULL,
        \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        \`deleted_at\` datetime(6) NULL,
        \`title\` varchar(200) NOT NULL,
        \`organization\` varchar(200) NOT NULL,
        \`description\` text NULL,
        \`start_date\` date NOT NULL,
        \`end_date\` date NOT NULL,
        \`total_days\` int NOT NULL,
        \`status\` enum('DRAFT','ACTIVE','COMPLETED','ARCHIVED') NOT NULL DEFAULT 'ACTIVE',
        INDEX \`idx_internships_status\` (\`status\`),
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // Internship <-> Mentor
    await queryRunner.query(`
      CREATE TABLE \`internship_mentors\` (
        \`id\` char(36) NOT NULL,
        \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        \`deleted_at\` datetime(6) NULL,
        \`internship_id\` char(36) NOT NULL,
        \`mentor_id\` char(36) NOT NULL,
        UNIQUE INDEX \`uq_internship_mentor\` (\`internship_id\`,\`mentor_id\`),
        PRIMARY KEY (\`id\`),
        CONSTRAINT \`fk_im_internship\` FOREIGN KEY (\`internship_id\`) REFERENCES \`internships\`(\`id\`) ON DELETE CASCADE,
        CONSTRAINT \`fk_im_mentor\` FOREIGN KEY (\`mentor_id\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // Internship <-> Student
    await queryRunner.query(`
      CREATE TABLE \`internship_students\` (
        \`id\` char(36) NOT NULL,
        \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        \`deleted_at\` datetime(6) NULL,
        \`internship_id\` char(36) NOT NULL,
        \`student_id\` char(36) NOT NULL,
        UNIQUE INDEX \`uq_internship_student\` (\`internship_id\`,\`student_id\`),
        PRIMARY KEY (\`id\`),
        CONSTRAINT \`fk_is_internship\` FOREIGN KEY (\`internship_id\`) REFERENCES \`internships\`(\`id\`) ON DELETE CASCADE,
        CONSTRAINT \`fk_is_student\` FOREIGN KEY (\`student_id\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // Attendances
    await queryRunner.query(`
      CREATE TABLE \`attendances\` (
        \`id\` char(36) NOT NULL,
        \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        \`deleted_at\` datetime(6) NULL,
        \`student_id\` char(36) NOT NULL,
        \`internship_id\` char(36) NOT NULL,
        \`mentor_id\` char(36) NOT NULL,
        \`date\` date NOT NULL,
        \`status\` enum('PRESENT','ABSENT','HALF_DAY') NOT NULL,
        \`notes\` varchar(500) NULL,
        UNIQUE INDEX \`uq_attendance_unique_day\` (\`student_id\`,\`internship_id\`,\`date\`),
        INDEX \`idx_attendance_internship_date\` (\`internship_id\`,\`date\`),
        INDEX \`idx_attendance_student\` (\`student_id\`),
        PRIMARY KEY (\`id\`),
        CONSTRAINT \`fk_att_student\` FOREIGN KEY (\`student_id\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE,
        CONSTRAINT \`fk_att_internship\` FOREIGN KEY (\`internship_id\`) REFERENCES \`internships\`(\`id\`) ON DELETE CASCADE,
        CONSTRAINT \`fk_att_mentor\` FOREIGN KEY (\`mentor_id\`) REFERENCES \`users\`(\`id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // Attendance revisions
    await queryRunner.query(`
      CREATE TABLE \`attendance_revisions\` (
        \`id\` char(36) NOT NULL,
        \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        \`deleted_at\` datetime(6) NULL,
        \`attendance_id\` char(36) NOT NULL,
        \`editor_id\` char(36) NOT NULL,
        \`previous_status\` enum('PRESENT','ABSENT','HALF_DAY') NOT NULL,
        \`new_status\` enum('PRESENT','ABSENT','HALF_DAY') NOT NULL,
        \`justification\` varchar(1000) NOT NULL,
        \`ip_address\` varchar(64) NULL,
        INDEX \`idx_att_rev_attendance\` (\`attendance_id\`),
        PRIMARY KEY (\`id\`),
        CONSTRAINT \`fk_arev_att\` FOREIGN KEY (\`attendance_id\`) REFERENCES \`attendances\`(\`id\`) ON DELETE CASCADE,
        CONSTRAINT \`fk_arev_editor\` FOREIGN KEY (\`editor_id\`) REFERENCES \`users\`(\`id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // Templates
    await queryRunner.query(`
      CREATE TABLE \`templates\` (
        \`id\` char(36) NOT NULL,
        \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        \`deleted_at\` datetime(6) NULL,
        \`name\` varchar(200) NOT NULL,
        \`local_file_path\` varchar(500) NOT NULL,
        \`format\` enum('PDF','PNG','JPG') NOT NULL,
        \`mapping_config\` text NOT NULL,
        \`is_active\` tinyint(1) NOT NULL DEFAULT 0,
        \`created_by\` char(36) NOT NULL,
        INDEX \`idx_templates_is_active\` (\`is_active\`),
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // Certificates
    await queryRunner.query(`
      CREATE TABLE \`certificates\` (
        \`id\` char(36) NOT NULL,
        \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        \`deleted_at\` datetime(6) NULL,
        \`student_id\` char(36) NOT NULL,
        \`internship_id\` char(36) NOT NULL,
        \`template_id\` char(36) NOT NULL,
        \`local_pdf_path\` varchar(500) NOT NULL,
        \`attendance_percentage\` decimal(5,2) NOT NULL,
        \`issued_at\` datetime(6) NOT NULL,
        \`issued_by\` char(36) NOT NULL,
        UNIQUE INDEX \`uq_cert_student_internship\` (\`student_id\`,\`internship_id\`),
        INDEX \`idx_cert_student\` (\`student_id\`),
        PRIMARY KEY (\`id\`),
        CONSTRAINT \`fk_cert_student\` FOREIGN KEY (\`student_id\`) REFERENCES \`users\`(\`id\`),
        CONSTRAINT \`fk_cert_internship\` FOREIGN KEY (\`internship_id\`) REFERENCES \`internships\`(\`id\`),
        CONSTRAINT \`fk_cert_template\` FOREIGN KEY (\`template_id\`) REFERENCES \`templates\`(\`id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // Complaints
    await queryRunner.query(`
      CREATE TABLE \`complaints\` (
        \`id\` char(36) NOT NULL,
        \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        \`deleted_at\` datetime(6) NULL,
        \`student_id\` char(36) NOT NULL,
        \`category\` varchar(100) NOT NULL,
        \`subject\` varchar(200) NOT NULL,
        \`description\` text NOT NULL,
        \`status\` enum('OPEN','IN_REVIEW','ESCALATED','RESOLVED','CLOSED') NOT NULL DEFAULT 'OPEN',
        \`assigned_to\` char(36) NULL,
        \`resolution_notes\` text NULL,
        \`sla_breach_at\` datetime(6) NULL,
        \`last_activity_at\` datetime(6) NULL,
        INDEX \`idx_complaints_status\` (\`status\`),
        INDEX \`idx_complaints_assigned\` (\`assigned_to\`),
        PRIMARY KEY (\`id\`),
        CONSTRAINT \`fk_comp_student\` FOREIGN KEY (\`student_id\`) REFERENCES \`users\`(\`id\`),
        CONSTRAINT \`fk_comp_assignee\` FOREIGN KEY (\`assigned_to\`) REFERENCES \`users\`(\`id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // Webhooks
    await queryRunner.query(`
      CREATE TABLE \`webhooks\` (
        \`id\` char(36) NOT NULL,
        \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        \`deleted_at\` datetime(6) NULL,
        \`name\` varchar(200) NOT NULL,
        \`target_url\` varchar(500) NOT NULL,
        \`events\` json NOT NULL,
        \`secret_key\` varchar(128) NOT NULL,
        \`is_active\` tinyint(1) NOT NULL DEFAULT 1,
        \`last_success_at\` datetime(6) NULL,
        \`failure_count\` int NOT NULL DEFAULT 0,
        INDEX \`idx_webhooks_active\` (\`is_active\`),
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // Audit logs (immutable)
    await queryRunner.query(`
      CREATE TABLE \`audit_logs\` (
        \`id\` char(36) NOT NULL,
        \`user_id\` char(36) NULL,
        \`action\` varchar(100) NOT NULL,
        \`resource\` varchar(100) NOT NULL,
        \`resource_id\` varchar(100) NULL,
        \`ip_address\` varchar(64) NULL,
        \`user_agent\` varchar(255) NULL,
        \`details\` json NULL,
        \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        INDEX \`idx_audit_user\` (\`user_id\`),
        INDEX \`idx_audit_resource\` (\`resource\`),
        INDEX \`idx_audit_time\` (\`created_at\`),
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // System jobs
    await queryRunner.query(`
      CREATE TABLE \`system_jobs\` (
        \`id\` char(36) NOT NULL,
        \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        \`deleted_at\` datetime(6) NULL,
        \`type\` enum('ATTENDANCE_IMPORT','CERTIFICATE_RENDER','WEBHOOK_DELIVERY','TEMPLATE_OCR') NOT NULL,
        \`status\` enum('PENDING','PROCESSING','FAILED','COMPLETED') NOT NULL DEFAULT 'PENDING',
        \`payload\` json NOT NULL,
        \`attempts\` int NOT NULL DEFAULT 0,
        \`max_attempts\` int NOT NULL DEFAULT 3,
        \`error_trace\` text NULL,
        \`started_at\` datetime(6) NULL,
        \`completed_at\` datetime(6) NULL,
        \`created_by\` char(36) NULL,
        INDEX \`idx_jobs_status\` (\`status\`),
        INDEX \`idx_jobs_type_status\` (\`type\`,\`status\`),
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS \`system_jobs\``);
    await queryRunner.query(`DROP TABLE IF EXISTS \`audit_logs\``);
    await queryRunner.query(`DROP TABLE IF EXISTS \`webhooks\``);
    await queryRunner.query(`DROP TABLE IF EXISTS \`complaints\``);
    await queryRunner.query(`DROP TABLE IF EXISTS \`certificates\``);
    await queryRunner.query(`DROP TABLE IF EXISTS \`templates\``);
    await queryRunner.query(`DROP TABLE IF EXISTS \`attendance_revisions\``);
    await queryRunner.query(`DROP TABLE IF EXISTS \`attendances\``);
    await queryRunner.query(`DROP TABLE IF EXISTS \`internship_students\``);
    await queryRunner.query(`DROP TABLE IF EXISTS \`internship_mentors\``);
    await queryRunner.query(`DROP TABLE IF EXISTS \`internships\``);
    await queryRunner.query(`DROP TABLE IF EXISTS \`profiles\``);
    await queryRunner.query(`DROP TABLE IF EXISTS \`users\``);
  }
}
