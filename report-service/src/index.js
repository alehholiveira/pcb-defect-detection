import { validateEnv } from "./config/env.js";
import { generateReport, generateManualReport } from "./services/reportService.js";
import { LAMBDA_ERRORS } from "./utils/errors.js";

/** Retorna a data de ontem formatada como YYYY-MM-DD */
function getYesterdayStr() {
  const date = new Date();
  date.setDate(date.getDate() - 1);
  return date.toISOString().split("T")[0];
}

/** Retorna um array com as datas dos últimos 7 dias (Segunda a Domingo) formatadas como YYYY-MM-DD */
function getLastWeekDaysStrs() {
  const dates = [];
  const today = new Date();
  
  // Voltando 7 dias a partir de ontem
  for (let i = 7; i >= 1; i--) {
    const date = new Date(today);
    date.setDate(today.getDate() - i);
    dates.push(date.toISOString().split("T")[0]);
  }
  return dates;
}

export const handler = async (event, context) => {
  console.log(`[index.js] handler - Init`, { requestId: context.awsRequestId, eventType: event.trigger_type || "SQS" });
  
  try {
    validateEnv();

    // ── SQS Trigger (Relatório Manual) ──────────────────────────────────
    if ("Records" in event) {
      for (const record of event.Records) {
        console.log(`[index.js] handler - Processando mensagem SQS: ${record.messageId}`);
        const body = JSON.parse(record.body);

        // Validação básica do payload
        if (!body.inferences || !Array.isArray(body.inferences) || body.inferences.length === 0) {
          throw LAMBDA_ERRORS.SQS_PAYLOAD_INVALID;
        }
        if (!body.report_name || typeof body.report_name !== 'string') {
          throw LAMBDA_ERRORS.SQS_PAYLOAD_INVALID;
        }

        const message = await generateManualReport(
          body.inferences,
          body.report_name,
          body.requested_by || "manual"
        );
        console.log(`[index.js] handler - Success (SQS): ${message}`);
      }
      return { statusCode: 200, body: JSON.stringify({ message: "Relatórios manuais processados" }) };
    }

    // ── EventBridge Trigger (Relatório Automático) ──────────────────────
    if ("trigger_type" in event && event.trigger_type === "scheduled") {
      const reportType = event.report_type;
      console.log(`[index.js] handler - Processando relatório agendado via EventBridge. Tipo: ${reportType}`);
      
      let targetDates = [];
      if (reportType === "daily") {
        targetDates = [getYesterdayStr()];
      } else if (reportType === "weekly") {
        targetDates = getLastWeekDaysStrs();
      } else {
        throw LAMBDA_ERRORS.INVALID_REPORT_TYPE;
      }

      const message = await generateReport(targetDates, reportType);
      
      console.log(`[index.js] handler - Success (EventBridge)`);
      return {
        statusCode: 200,
        body: JSON.stringify({ message, timestamp: new Date().toISOString() }),
      };
    }

    console.error(`[index.js] handler - Error: Event type not recognized`, event);
    return { statusCode: LAMBDA_ERRORS.EVENT_NOT_RECOGNIZED.statusCode, body: JSON.stringify(LAMBDA_ERRORS.EVENT_NOT_RECOGNIZED) };
  } catch (error) {
    console.error(`[index.js] handler - Error`, error);
    
    // Se for um erro já mapeado do nosso dicionário
    if (error && error.code) {
      return {
        statusCode: error.statusCode,
        body: JSON.stringify(error)
      };
    }

    // Erro inesperado
    return {
      statusCode: LAMBDA_ERRORS.INTERNAL_ERROR.statusCode,
      body: JSON.stringify({ ...LAMBDA_ERRORS.INTERNAL_ERROR, details: error.message }),
    };
  }
};
