import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddResetPasswordColumns1707000000000 implements MigrationInterface {
  name = 'AddResetPasswordColumns1707000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE users
      ADD COLUMN reset_password_token_hash VARCHAR(255) NULL,
      ADD COLUMN reset_password_expires_at DATETIME(6) NULL;
    `);

    await queryRunner.query(`
      CREATE INDEX idx_users_reset_password_token_hash
      ON users (reset_password_token_hash);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX idx_users_reset_password_token_hash ON users;
    `);

    await queryRunner.query(`
      ALTER TABLE users
      DROP COLUMN reset_password_token_hash,
      DROP COLUMN reset_password_expires_at;
    `);
  }
}