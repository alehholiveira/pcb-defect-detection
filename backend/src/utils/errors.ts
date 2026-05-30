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

export type ApiErrorCode = keyof typeof API_ERRORS;
