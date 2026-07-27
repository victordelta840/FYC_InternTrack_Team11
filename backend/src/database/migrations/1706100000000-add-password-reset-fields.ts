import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPasswordResetFields1706100000000 implements MigrationInterface {
  name = 'AddPasswordResetFields1706100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE \`users\`
        ADD COLUMN \`reset_password_token_hash\` varchar(255) NULL AFTER \`refresh_token_hash\`,
        ADD COLUMN \`reset_password_expires_at\` datetime(6) NULL AFTER \`reset_password_token_hash\`;
    `);

    await queryRunner.query(`
      CREATE INDEX \`idx_users_reset_token\` ON \`users\` (\`reset_password_token_hash\`);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX \`idx_users_reset_token\` ON \`users\`;`);
    await queryRunner.query(`
      ALTER TABLE \`users\`
        DROP COLUMN \`reset_password_expires_at\`,
        DROP COLUMN \`reset_password_token_hash\`;
    `);
  }
}
