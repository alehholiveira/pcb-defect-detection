import type { SQSEvent, ScheduledEvent, Context } from "aws-lambda";
import { validateEnv } from "./config/env";
import { generateReport } from "./services/reportService";

type LambdaEvent = SQSEvent | ScheduledEvent | { trigger_type: string, report_type: 'daily' | 'weekly' };

/** Retorna a data de ontem formatada como YYYY-MM-DD */
function getYesterdayStr(): string {
  const date = new Date();
  date.setDate(date.getDate() - 1);
  return date.toISOString().split("T")[0];
}

/** Retorna um array com as datas dos últimos 7 dias (Segunda a Domingo) formatadas como YYYY-MM-DD */
function getLastWeekDaysStrs(): string[] {
  const dates: string[] = [];
  const today = new Date();
  
  // Voltando 7 dias a partir de ontem
  for (let i = 7; i >= 1; i--) {
    const date = new Date(today);
    date.setDate(today.getDate() - i);
    dates.push(date.toISOString().split("T")[0]);
  }
  return dates;
}

export const handler = async (
  event: LambdaEvent,
  context: Context,
): Promise<{ statusCode: number; body: string }> => {
  console.log("Lambda de relatórios PCB iniciada", { requestId: context.awsRequestId });
  
  try {
    validateEnv();

    // ── SQS Trigger (Relatório Manual) ──────────────────────────────────
    if ("Records" in event) {
      for (const record of (event as SQSEvent).Records) {
        console.log("Processando mensagem SQS:", record.messageId);
        const body = JSON.parse(record.body) as Record<string, unknown>;
        console.log("Parâmetros do relatório manual:", body);
      }
      return { statusCode: 200, body: JSON.stringify({ message: "SQS Manual não suportado ainda" }) };
    }

    // ── EventBridge Trigger (Relatório Automático) ──────────────────────
    if ("trigger_type" in event && event.trigger_type === "scheduled") {
      const reportType = event.report_type;
      console.log(`Processando relatório agendado via EventBridge. Tipo: ${reportType}`);
      
      let targetDates: string[] = [];
      if (reportType === "daily") {
        targetDates = [getYesterdayStr()];
      } else if (reportType === "weekly") {
        targetDates = getLastWeekDaysStrs();
      } else {
        throw new Error("Tipo de relatório não suportado.");
      }

      const message = await generateReport(targetDates, reportType);
      
      return {
        statusCode: 200,
        body: JSON.stringify({ message, timestamp: new Date().toISOString() }),
      };
    }

    return { statusCode: 400, body: "Event type not recognized" };
  } catch (error: any) {
    console.error("Erro não tratado na Lambda:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Erro interno no servidor", error: error.message }),
    };
  }
};
