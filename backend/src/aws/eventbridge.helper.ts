import { EventBridgeClient, EnableRuleCommand, DisableRuleCommand } from '@aws-sdk/client-eventbridge';
import { env } from '../config/index.js';

export const eventBridgeClient = new EventBridgeClient({ region: env.AWS_REGION });

export async function enableRule(ruleName: string): Promise<void> {
  const command = new EnableRuleCommand({ Name: ruleName });
  await eventBridgeClient.send(command);
}

export async function disableRule(ruleName: string): Promise<void> {
  const command = new DisableRuleCommand({ Name: ruleName });
  await eventBridgeClient.send(command);
}
