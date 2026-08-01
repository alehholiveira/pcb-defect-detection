import {
  SESClient,
  VerifyEmailIdentityCommand,
  DeleteIdentityCommand,
  GetIdentityVerificationAttributesCommand,
  ListIdentitiesCommand,
  SendEmailCommand
} from '@aws-sdk/client-ses';
import { env } from '../config/index.js';
import { API_ERRORS } from '../utils/errors.js';

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

/**
 * Retrieves a list of successfully verified email addresses from SES.
 */
export async function getVerifiedEmails(): Promise<string[]> {
  try {
    const listResponse = await sesClient.send(
      new ListIdentitiesCommand({ IdentityType: 'EmailAddress' })
    );

    if (!listResponse.Identities || listResponse.Identities.length === 0) {
      return [];
    }

    const verificationResponse = await sesClient.send(
      new GetIdentityVerificationAttributesCommand({
        Identities: listResponse.Identities,
      })
    );

    const verified: string[] = [];
    if (verificationResponse.VerificationAttributes) {
      for (const [email, attrs] of Object.entries(
        verificationResponse.VerificationAttributes
      )) {
        if (attrs.VerificationStatus === 'Success' && email !== env.SENDER_EMAIL) {
          verified.push(email);
        }
      }
    }
    return verified;
  } catch (error) {
    console.error('[ses.helper.ts] getVerifiedEmails - Error', error);
    return [];
  }
}

/**
 * Sends an HTML email via AWS SES to specified recipients.
 */
export async function sendEmail(
  recipients: string[],
  subject: string,
  htmlBody: string
): Promise<void> {
  try {
    const command = new SendEmailCommand({
      Source: env.SENDER_EMAIL,
      Destination: {
        ToAddresses: recipients,
      },
      Message: {
        Subject: {
          Data: subject,
          Charset: 'UTF-8',
        },
        Body: {
          Html: {
            Data: htmlBody,
            Charset: 'UTF-8',
          },
        },
      },
    });

    await sesClient.send(command);
  } catch (error) {
    console.error('[ses.helper.ts] sendEmail - Error', error);
    throw API_ERRORS.SEND_EMAIL_FAILED;
  }
}
