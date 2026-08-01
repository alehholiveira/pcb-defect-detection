/**
 * Centralized error dictionary for standardizing API responses.
 */
export const API_ERRORS = {
  FETCH_INFERENCES_FAILED: {
    code: 'ERR_FETCH_INFERENCES_FAILED',
    message: 'Não foi possível recuperar a lista de inferências.',
    description: 'Ocorreu um erro ao consultar o banco de dados. Tente novamente mais tarde.',
    statusCode: 500,
  },
  FETCH_REPORTS_FAILED: {
    code: 'ERR_FETCH_REPORTS_FAILED',
    message: 'Não foi possível recuperar a lista de relatórios.',
    description: 'Ocorreu um erro ao consultar os relatórios no S3.',
    statusCode: 500,
  },
  METRICS_FETCH_ERROR: {
    code: 'ERR_METRICS_FETCH_FAILED',
    message: 'Não foi possível recuperar as métricas.',
    description: 'Ocorreu um erro ao agregar os dados das métricas.',
    statusCode: 500,
  },
  GENERATE_REPORT_FAILED: {
    code: 'ERR_GENERATE_REPORT_FAILED',
    message: 'Não foi possível solicitar a geração do relatório.',
    description: 'Ocorreu um erro ao enviar a solicitação para a fila de processamento.',
    statusCode: 500,
  },
  S3_OPERATION_FAILED: {
    code: 'ERR_S3_OPERATION_FAILED',
    message: 'Falha na comunicação com o armazenamento de arquivos (S3).',
    description: 'Ocorreu um erro ao ler ou listar arquivos.',
    statusCode: 500,
  },
  SQS_OPERATION_FAILED: {
    code: 'ERR_SQS_OPERATION_FAILED',
    message: 'Falha na comunicação com a fila de processamento (SQS).',
    description: 'Ocorreu um erro ao enviar a mensagem para a fila.',
    statusCode: 500,
  },
  EMAIL_ALREADY_REGISTERED: {
    code: 'ERR_EMAIL_ALREADY_REGISTERED',
    message: 'Este e-mail já está cadastrado.',
    description: 'O e-mail fornecido já possui uma conta associada.',
    statusCode: 409,
  },
  RESOURCE_NOT_FOUND: {
    code: 'ERR_RESOURCE_NOT_FOUND',
    message: 'Recurso não encontrado.',
    description: 'O recurso solicitado não existe.',
    statusCode: 404,
  },
  NO_INFERENCES_FOUND: {
    code: 'ERR_NO_INFERENCES_FOUND',
    message: 'Nenhuma inferência encontrada para os filtros informados.',
    description: 'Verifique os filtros e tente novamente.',
    statusCode: 404,
  },
  REPORT_NOT_FOUND: {
    code: 'ERR_REPORT_NOT_FOUND',
    message: 'Relatório não encontrado.',
    description: 'O relatório solicitado não foi localizado no armazenamento S3.',
    statusCode: 404,
  },
  NO_VERIFIED_RECIPIENTS: {
    code: 'ERR_NO_VERIFIED_RECIPIENTS',
    message: 'Nenhum destinatário verificado foi informado.',
    description: 'Os e-mails informados não estão verificados no AWS SES.',
    statusCode: 400,
  },
  SEND_EMAIL_FAILED: {
    code: 'ERR_SEND_EMAIL_FAILED',
    message: 'Falha ao enviar o e-mail do relatório.',
    description: 'Ocorreu um erro ao enviar a mensagem via AWS SES.',
    statusCode: 500,
  },
  INVALID_REPORT_REQUEST: {
    code: 'ERR_INVALID_REPORT_REQUEST',
    message: 'Requisição inválida para geração de relatório.',
    description: 'Forneça selectedIds ou filters (opcionalmente com excludedIds).',
    statusCode: 400,
  },
  HEALTH_CHECK_FAILED: {
    code: 'ERR_HEALTH_CHECK_FAILED',
    message: 'O serviço encontra-se indisponível no momento.',
    description: 'Falha na conexão com serviços dependentes.',
    statusCode: 503,
  },
  VALIDATION_ERROR: {
    code: 'ERR_VALIDATION',
    message: 'Dados inválidos fornecidos na requisição.',
    description: 'Verifique os parâmetros e o corpo da requisição e tente novamente.',
    statusCode: 400,
  },
  INTERNAL_SERVER_ERROR: {
    code: 'ERR_INTERNAL_SERVER',
    message: 'Erro interno no servidor.',
    description: 'Um erro inesperado ocorreu.',
    statusCode: 500,
  },
} as const;

type ApiErrorCode = keyof typeof API_ERRORS;

export class AppError extends Error {
  public statusCode: number;
  public code: string;
  public description?: string;

  constructor(apiError: typeof API_ERRORS[keyof typeof API_ERRORS]) {
    super(apiError.message);
    this.name = 'AppError';
    this.statusCode = apiError.statusCode;
    this.code = apiError.code;
    this.description = apiError.description;
  }
}
