import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { setupTestDatabase, teardownTestDatabase } from '../../helpers/testDatabase.js';

describe('Database Migrations (Integration)', () => {
  let sequelizeInstance: any;

  beforeAll(async () => {
    const { sequelize } = await setupTestDatabase();
    sequelizeInstance = sequelize;
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  it('should have created all expected tables in MySQL', async () => {
    const queryInterface = sequelizeInstance.getQueryInterface();
    const tables: string[] = await queryInterface.showAllTables();

    expect(tables).toContain('inferences');
    expect(tables).toContain('inference_images');
    expect(tables).toContain('detections');
    expect(tables).toContain('system_settings');
    expect(tables).toContain('recipient_emails');
  });

  it('should have seeded initial system_settings rows', async () => {
    const [results]: [any[], any] = await sequelizeInstance.query(
      "SELECT * FROM system_settings WHERE `key` IN ('report_schedule_daily', 'report_schedule_weekly', 'report_schedule_monthly');"
    );

    expect(results.length).toBe(3);
    const keys = results.map((r: any) => r.key);
    expect(keys).toContain('report_schedule_daily');
    expect(keys).toContain('report_schedule_weekly');
    expect(keys).toContain('report_schedule_monthly');
  });
});
