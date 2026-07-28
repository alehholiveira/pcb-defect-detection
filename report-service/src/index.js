import { validateEnv } from "./config/env.js";
import { generateReport, generateManualReport } from "./services/reportService.js";
import { LAMBDA_ERRORS } from "./utils/errors.js";

/** Returns yesterday's date formatted as YYYY-MM-DD */
function getYesterdayStr() {
  const date = new Date();
  date.setDate(date.getDate() - 1);
  return date.toISOString().split("T")[0];
}

/** Returns an array of dates for the last 7 days formatted as YYYY-MM-DD */
function getLastWeekDaysStrs() {
  const dates = [];
  const today = new Date();
  
  for (let i = 7; i >= 1; i--) {
    const date = new Date(today);
    date.setDate(today.getDate() - i);
    dates.push(date.toISOString().split("T")[0]);
  }
  return dates;
}

/** Returns an array of dates for the previous month formatted as YYYY-MM-DD */
function getLastMonthDaysStrs() {
  const dates = [];
  const today = new Date();
  const year = today.getMonth() === 0 ? today.getFullYear() - 1 : today.getFullYear();
  // If January (0), roll back to December (11) of the previous year
  const month = today.getMonth() === 0 ? 11 : today.getMonth() - 1;
  
  const lastDayOfMonth = new Date(year, month + 1, 0).getDate();
  
  for (let day = 1; day <= lastDayOfMonth; day++) {
    const d = new Date(year, month, day);
    dates.push(d.toISOString().split("T")[0]);
  }
  return dates;
}

/**
 * Lambda handler supporting dual-trigger patterns:
 * 1. SQS: Manual report requests. Invalid payloads (400) are swallowed to prevent DLQ loops.
 * 2. EventBridge: Scheduled automated reports (daily, weekly, monthly).
 * 
 * Unexpected errors (500) are returned as HTTP responses. Depending on the event source mapping,
 * throwing an error instead of returning it might be required for SQS to properly retry via DLQ.
 * Currently, all errors are swallowed and returned as successful Lambda executions with error payloads.
 */
export const handler = async (event, context) => {
  console.log(`[index.js] handler - Init`, { requestId: context.awsRequestId, eventType: event.trigger_type || "SQS" });
  
  try {
    validateEnv();

    // ── SQS Trigger (Manual Report) ──────────────────────────────────
    if ("Records" in event) {
      for (const record of event.Records) {
        console.log(`[index.js] handler - Processando mensagem SQS: ${record.messageId}`);
        const body = JSON.parse(record.body);

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

    // ── EventBridge Trigger (Scheduled Report) ──────────────────────
    if ("trigger_type" in event && event.trigger_type === "scheduled") {
      const reportType = event.report_type;
      console.log(`[index.js] handler - Processando relatório agendado via EventBridge. Tipo: ${reportType}`);
      
      let targetDates = [];
      if (reportType === "daily") {
        targetDates = [getYesterdayStr()];
      } else if (reportType === "weekly") {
        targetDates = getLastWeekDaysStrs();
      } else if (reportType === "monthly") {
        targetDates = getLastMonthDaysStrs();
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
    
    // Return mapped errors directly
    if (error && error.code) {
      return {
        statusCode: error.statusCode,
        body: JSON.stringify(error)
      };
    }

    // Return unexpected errors as 500
    return {
      statusCode: LAMBDA_ERRORS.INTERNAL_ERROR.statusCode,
      body: JSON.stringify({ ...LAMBDA_ERRORS.INTERNAL_ERROR, details: error.message }),
    };
  }
};
