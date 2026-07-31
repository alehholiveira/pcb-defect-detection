import { SESClient, VerifyEmailIdentityCommand, DeleteIdentityCommand, GetIdentityVerificationAttributesCommand } from '@aws-sdk/client-ses';
import { env } from '../config/index.js';

const sesClient = new SESClient({ region: env.AWS_REGION });

export async function verifyEmailIdentity(email: string): Promise<void> {
  const command = new VerifyEmailIdentityCommand({ EmailAddress: email });
  await sesClient.send(command);
}

export async function deleteEmailIdentity(email: string): Promise<void> {
  const command = new DeleteIdentityCommand({ Identity: email });
  await sesClient.send(command);
}

export async function getVerificationStatus(emails: string[]): Promise<Record<string, string>> {
  if (emails.length === 0) return {};
  
  const command = new GetIdentityVerificationAttributesCommand({ Identities: emails });
  const response = await sesClient.send(command);
  
  const statusMap: Record<string, string> = {};
  
  if (response.VerificationAttributes) {
    for (const email of emails) {
      if (response.VerificationAttributes[email]) {
        statusMap[email] = response.VerificationAttributes[email].VerificationStatus || 'Pending';
      } else {
        statusMap[email] = 'NotStarted';
      }
    }
  }
  
  return statusMap;
}
