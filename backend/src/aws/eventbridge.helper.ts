import { EventBridgeClient, EnableRuleCommand, DisableRuleCommand } from '@aws-sdk/client-eventbridge';
import { env } from '../config/index.js';

const eventBridgeClient = new EventBridgeClient({ region: env.AWS_REGION });

/**
 * Enables an AWS EventBridge scheduled rule.
 * 
 * Note on EventBridge Cron Expressions vs Standard Unix Cron:
 * AWS uses a 6-field format: cron(Minutes Hours Day-of-month Month Day-of-week Year)
 * Differences from Unix cron:
 * - Requires a Year field.
 * - Cannot use '*' for both Day-of-month and Day-of-week (one must be '?').
 * Example: `cron(0 8 ? * MON-FRI *)` runs at 8:00 AM UTC every Monday through Friday.
 */
export async function enableRule(ruleName: string): Promise<void> {
  const command = new EnableRuleCommand({ Name: ruleName });
  await eventBridgeClient.send(command);
}

export async function disableRule(ruleName: string): Promise<void> {
  const command = new DisableRuleCommand({ Name: ruleName });
  await eventBridgeClient.send(command);
}
