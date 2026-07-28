/**
 * Lambda Error Definitions
 * Error object contract: { code: string, message: string, statusCode: number }
 */
export const LAMBDA_ERRORS = {
  EVENT_NOT_RECOGNIZED: {
    code: 'EVENT_NOT_RECOGNIZED',
    message: 'The received event format was not recognized or is unsupported by the Lambda.',
    statusCode: 400
  },
  MISSING_ENV_VARS: {
    code: 'MISSING_ENV_VARS',
    message: 'Required environment variables are missing in the Lambda.',
    statusCode: 500
  },
  INVALID_REPORT_TYPE: {
    code: 'INVALID_REPORT_TYPE',
    message: 'Unsupported report type.',
    statusCode: 400
  },
  S3_DOWNLOAD_FAILED: {
    code: 'S3_DOWNLOAD_FAILED',
    message: 'Failed to download artifact from S3.',
    statusCode: 500
  },
  SQS_PAYLOAD_INVALID: {
    code: 'SQS_PAYLOAD_INVALID',
    message: 'The payload received from the SQS queue is invalid or incomplete.',
    statusCode: 400
  },
  INTERNAL_ERROR: {
    code: 'INTERNAL_ERROR',
    message: 'Unhandled internal error.',
    statusCode: 500
  }
};
