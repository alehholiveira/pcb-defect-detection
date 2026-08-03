import { SESClient, SendEmailCommand, ListIdentitiesCommand, GetIdentityVerificationAttributesCommand } from "@aws-sdk/client-ses";
import { env } from "../config/env.js";
import { buildReportEmailHtml, emailTranslations } from "../utils/i18n.js";

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
 * @param {string} periodLabel - Formatted date/period string
 * @param {string} reportUrl - Public S3 URL for the generated PPTX report
 * @param {Object} stats - Object containing totalInferences, totalImages, totalDefects
 * @param {string} reportTitle - The title of the report (e.g. "Relatório Semanal")
 * @param {Object} [defectsByType] - Defect count breakdown by type
 * @param {string} [language] - Language code ('pt-BR' | 'en')
 */
export async function sendReportEmail(periodLabel, reportUrl, stats, reportTitle, defectsByType = {}, language = env.DEFAULT_LANGUAGE) {
  console.log(`[sesHelper.js] sendReportEmail - Init`, { periodLabel, reportUrl, language });
  
  const recipients = await getVerifiedEmails();
  
  if (recipients.length === 0) {
    console.warn(`[sesHelper.js] sendReportEmail - No verified recipients found. Skipping email sending.`);
    return;
  }
  
  const lang = (language === 'en' || language === 'pt-BR') ? language : env.DEFAULT_LANGUAGE;
  const t = emailTranslations[lang];

  const emailHtml = buildReportEmailHtml({
    reportTitle,
    periodLabel,
    stats,
    defectsByType,
    downloadUrl: reportUrl,
  }, lang);

  try {
    await sesClient.send(new SendEmailCommand({
      Source: env.SENDER_EMAIL,
      Destination: { ToAddresses: recipients },
      Message: {
        Subject: { Data: `${t.subjectPrefix} - ${periodLabel}` },
        Body: { Html: { Data: emailHtml } }
      }
    }));
    console.log(`[sesHelper.js] sendReportEmail - Success sent to ${recipients.length} recipients`);
  } catch (error) {
    console.error(`[sesHelper.js] sendReportEmail - Error`, error);
  }
}
