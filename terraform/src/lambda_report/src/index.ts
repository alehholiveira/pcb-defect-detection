import type { SQSEvent, ScheduledEvent, Context } from "aws-lambda";

/**
 * Lambda handler para geração de relatórios de defeitos em PCB.
 *
 * Disparo por SQS  → Relatório manual (recebe parâmetros no body da mensagem).
 * Disparo por EventBridge → Relatório automático diário (lê dados estruturados do S3).
 */

type LambdaEvent = SQSEvent | ScheduledEvent;

export const handler = async (
  event: LambdaEvent,
  context: Context,
): Promise<{ statusCode: number; body: string }> => {
  console.log("Lambda de relatórios PCB iniciada", {
    requestId: context.awsRequestId,
  });
  console.log("Evento recebido:", JSON.stringify(event, null, 2));

  // ── SQS Trigger (Relatório Manual) ──────────────────────────────────
  if ("Records" in event) {
    for (const record of event.Records) {
      console.log("Processando mensagem SQS:", record.messageId);

      const body = JSON.parse(record.body) as Record<string, unknown>;
      console.log("Parâmetros do relatório manual:", body);

      // TODO: Buscar dados do S3, gerar PDF e enviar via SES
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "Relatório(s) manual(is) processado(s) com sucesso",
      }),
    };
  }

  // ── EventBridge Trigger (Relatório Automático Diário) ───────────────
  if ("detail-type" in event) {
    console.log("Processando relatório diário agendado");

    // TODO: Ler dados estruturados do S3 bucket, gerar PDF resumo e enviar via SES
  }

  return {
    statusCode: 200,
    body: JSON.stringify({
      message: "Relatório processado com sucesso",
      timestamp: new Date().toISOString(),
    }),
  };
};
