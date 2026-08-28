import { ErrorCode, VastError } from '../domain/errors.js';
export { ErrorCode, VastError };
export const inputError = (message: string, details?: unknown) => new VastError(ErrorCode.INPUT_ERROR, message, details);
export const parserError = (message: string, details?: unknown) => new VastError(ErrorCode.PARSER_ERROR, message, details);
