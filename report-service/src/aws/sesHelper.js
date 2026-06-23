import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";
import { env } from "../config/env.js";

const sesClient = new SESClient({ region: env.AWS_REGION });

export async function sendReportEmail(periodLabel, reportUrl, stats, reportTitle) {
  console.log(`[sesHelper.js] sendReportEmail - Init`, { periodLabel, reportUrl });
  
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
      Destination: { ToAddresses: [env.SENDER_EMAIL] },
      Message: {
        Subject: { Data: `Relatório de Defeitos PCB - ${periodLabel}` },
        Body: { Html: { Data: emailHtml } }
      }
    }));
    console.log(`[sesHelper.js] sendReportEmail - Success`);
  } catch (error) {
    console.error(`[sesHelper.js] sendReportEmail - Error`, error);
  }
}
