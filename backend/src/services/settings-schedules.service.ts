import type { FastifyBaseLogger } from 'fastify';
import { SystemSetting } from '../models/index.js';
import { enableRule, disableRule } from '../aws/eventbridge.helper.js';
import { env } from '../config/index.js';

export async function getSchedulesService(logger: FastifyBaseLogger) {
  logger.info('[settings-schedules.service.ts] getSchedulesService - Init');

  const settings = await SystemSetting.findAll({
    where: {
      key: ['report_schedule_daily', 'report_schedule_weekly', 'report_schedule_monthly']
    }
  });
  
  const map: Record<string, boolean> = {
    daily: true,
    weekly: true,
    monthly: true,
  };
  
  for (const s of settings) {
    if (s.key === 'report_schedule_daily') map.daily = s.value === 'true';
    if (s.key === 'report_schedule_weekly') map.weekly = s.value === 'true';
    if (s.key === 'report_schedule_monthly') map.monthly = s.value === 'true';
  }
  
  logger.info('[settings-schedules.service.ts] getSchedulesService - Success');
  return map;
}

/**
 * Updates the automation schedules by persisting to the DB and toggling EventBridge rules.
 * 
 * Note on EventBridge Cron Construction:
 * If we were to construct dynamic cron schedules, we would use the AWS 6-field format:
 * `cron(Minutes Hours Day-of-month Month Day-of-week Year)`
 * Unlike standard Unix cron (5 fields, where '*' can be used for both day of month and week),
 * EventBridge requires a Year field and forces the use of '?' for either Day-of-month or Day-of-week.
 */
export async function updateSchedulesService(schedules: { daily: boolean; weekly: boolean; monthly: boolean }, logger: FastifyBaseLogger) {
  logger.info({ schedules }, '[settings-schedules.service.ts] updateSchedulesService - Init');

  await SystemSetting.update({ value: String(schedules.daily) }, { where: { key: 'report_schedule_daily' } });
  await SystemSetting.update({ value: String(schedules.weekly) }, { where: { key: 'report_schedule_weekly' } });
  await SystemSetting.update({ value: String(schedules.monthly) }, { where: { key: 'report_schedule_monthly' } });
  
  // Atualizar regras no EventBridge
  try {
    if (schedules.daily) await enableRule(env.EVENTBRIDGE_DAILY_RULE_NAME);
    else await disableRule(env.EVENTBRIDGE_DAILY_RULE_NAME);
    
    if (schedules.weekly) await enableRule(env.EVENTBRIDGE_WEEKLY_RULE_NAME);
    else await disableRule(env.EVENTBRIDGE_WEEKLY_RULE_NAME);
    
    if (schedules.monthly) await enableRule(env.EVENTBRIDGE_MONTHLY_RULE_NAME);
    else await disableRule(env.EVENTBRIDGE_MONTHLY_RULE_NAME);
  } catch (error) {
    logger.error({ error }, '[settings-schedules.service.ts] updateSchedulesService - Error updating EventBridge rules');
    // Not throwing here, to allow DB changes to persist. A sync job or manual retry could be added later.
  }
  
  logger.info('[settings-schedules.service.ts] updateSchedulesService - Success');
  return schedules;
}
