export const LAMBDA_ERRORS = {
  EVENT_NOT_RECOGNIZED: {
    code: 'EVENT_NOT_RECOGNIZED',
    message: 'O formato do evento recebido não foi reconhecido ou suportado pela Lambda.',
    statusCode: 400
  },
  MISSING_ENV_VARS: {
    code: 'MISSING_ENV_VARS',
    message: 'Variáveis de ambiente obrigatórias estão ausentes na Lambda.',
    statusCode: 500
  },
  INVALID_REPORT_TYPE: {
    code: 'INVALID_REPORT_TYPE',
    message: 'Tipo de relatório não suportado.',
    statusCode: 400
  },
  S3_DOWNLOAD_FAILED: {
    code: 'S3_DOWNLOAD_FAILED',
    message: 'Falha ao baixar artefato do S3.',
    statusCode: 500
  },
  SQS_PAYLOAD_INVALID: {
    code: 'SQS_PAYLOAD_INVALID',
    message: 'O payload recebido da fila SQS está inválido ou incompleto.',
    statusCode: 400
  },
  INTERNAL_ERROR: {
    code: 'INTERNAL_ERROR',
    message: 'Erro interno não tratado.',
    statusCode: 500
  }
};
