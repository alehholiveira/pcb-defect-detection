import { SESClient, SendEmailCommand, ListIdentitiesCommand, GetIdentityVerificationAttributesCommand } from "@aws-sdk/client-ses";
import { env } from "../config/env.js";

const sesClient = new SESClient({ region: env.AWS_REGION });

/**
 * Retrieves a list of successfully verified email addresses from SES.
 * Silent error handling strategy: returns an empty array [] on failure instead of throwing,
 * allowing the main execution to continue even if email notification fails.
 * 
 * @returns {Promise<string[]>} Array of verified email addresses
 */
async function getVerifiedEmails() {
  try {
    const listResponse = await sesClient.send(new ListIdentitiesCommand({ IdentityType: "EmailAddress" }));
    if (!listResponse.Identities || listResponse.Identities.length === 0) return [];
    
    const verificationResponse = await sesClient.send(new GetIdentityVerificationAttributesCommand({
      Identities: listResponse.Identities
    }));
    
    const verified = [];
    if (verificationResponse.VerificationAttributes) {
      for (const [email, attrs] of Object.entries(verificationResponse.VerificationAttributes)) {
        // Filter out env.SENDER_EMAIL so the sender doesn't receive a copy of every report
        if (attrs.VerificationStatus === 'Success' && email !== env.SENDER_EMAIL) {
          verified.push(email);
        }
      }
    }
    return verified;
  } catch (error) {
    console.error(`[sesHelper.js] getVerifiedEmails - Error`, error);
    return [];
  }
}

/**
 * Sends an HTML email with the report link and summary statistics to all verified recipients.
 * 
 * @param {string} periodLabel - Formatted date/period string (e.g. "10/10/2023 até 17/10/2023")
 * @param {string} reportUrl - Public S3 URL for the generated PPTX report
 * @param {Object} stats - Object containing totalInferences, totalImages, totalDefects
 * @param {string} reportTitle - The title of the report (e.g. "Relatório Semanal")
 */
export async function sendReportEmail(periodLabel, reportUrl, stats, reportTitle) {
  console.log(`[sesHelper.js] sendReportEmail - Init`, { periodLabel, reportUrl });
  
  const recipients = await getVerifiedEmails();
  
  if (recipients.length === 0) {
    console.warn(`[sesHelper.js] sendReportEmail - No verified recipients found. Skipping email sending.`);
    return;
  }
  
  // HTML Template Structure: 
  // 1. Header with title and period
  // 2. Summary paragraph
  // 3. Unordered list with statistics
  // 4. Call-to-action link to download the PPTX
  const emailHtml = `
    <h2>${reportTitle} de Inspeção PCB (${periodLabel})</h2>
    <p>O relatório foi gerado com sucesso.</p>
    <ul>
      <li><b>Total de Inferências:</b> ${stats.totalInferences}</li>
      <li><b>Total de Imagens Analisadas:</b> ${stats.totalImages}</li>
      <li><b>Total de Defeitos Encontrados:</b> ${stats.totalDefects}</li>
    </ul>
    <p><a href="${reportUrl}">Clique aqui para baixar o relatório em PowerPoint (PPTX)</a></p>
  `;

  try {
    await sesClient.send(new SendEmailCommand({
      Source: env.SENDER_EMAIL,
      Destination: { ToAddresses: recipients },
      Message: {
        Subject: { Data: `Relatório de Defeitos PCB - ${periodLabel}` },
        Body: { Html: { Data: emailHtml } }
      }
    }));
    console.log(`[sesHelper.js] sendReportEmail - Success sent to ${recipients.length} recipients`);
  } catch (error) {
    console.error(`[sesHelper.js] sendReportEmail - Error`, error);
  }
}
