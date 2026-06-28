import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';
import { env } from '../config/index.js';
import { API_ERRORS } from '../utils/errors.js';

const sqsClient = new SQSClient({ region: env.AWS_REGION });

export interface ReportQueuePayload {
  trigger_type: string;
  report_type: string;
  inference_ids: number[];
  requested_by: string;
}

/** Sends a manual report generation request to the SQS queue */
export async function sendReportRequest(payload: ReportQueuePayload): Promise<string> {
  try {
    const cmd = new SendMessageCommand({
      QueueUrl: env.SQS_QUEUE_URL,
      MessageBody: JSON.stringify(payload),
    });

    const result = await sqsClient.send(cmd);
    return result.MessageId || 'unknown';
  } catch (error) {
    console.error('[sqs.helper.ts] sendReportRequest - Error sending message to SQS', error);
    throw API_ERRORS.SQS_OPERATION_FAILED;
  }
}
