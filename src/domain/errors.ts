export enum ErrorCode {
  VALIDATION_FAILED = 2,
  GUARD_PAUSE = 3,
  GUARD_BLOCK = 4,
  INPUT_ERROR = 5,
  PARSER_ERROR = 6,
  INTERNAL_ERROR = 7,
}

export class VastError extends Error {
  constructor(public readonly code: ErrorCode, message: string, public readonly details?: unknown) {
    super(message);
    this.name = 'VastError';
  }
}
