import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";
import { env } from "../config/env";

const sesClient = new SESClient({ region: env.AWS_REGION });

export async function sendReportEmail(periodLabel: string, reportUrl: string, stats: { totalInferences: number, totalImages: number, totalDefects: number }, reportTitle: string) {
  const emailHtml = `
    <h2>${reportTitle} de Inspeção PCB (${periodLabel})</h2>
    <p>O relatório foi gerado com sucesso.</p>
    <ul>
      <li><b>Total de Inferências:</b> ${stats.totalInferences}</li>
      <li><b>Total de Imagens Analisadas:</b> ${stats.totalImages}</li>
      <li><b>Total de Defeitos Encontrados:</b> ${stats.totalDefects}</li>
    </ul>
    <p><a href="${reportUrl}">Clique aqui para baixar o relatório em PowerPoint (PPTX)</a></p>
    <p><i>Nota: O arquivo pode ser editado. As marcações de defeito são formas vetoriais nativas.</i></p>
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
    console.log("E-mail enviado com sucesso via SES");
  } catch (err) {
    console.error("Falha ao enviar e-mail pelo SES:", err);
  }
}
