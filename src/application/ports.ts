import type { DiagnosticHelp, IntentDiagnostic, ParserPort, RegressionRequest, RegressionResponse } from '../domain/types.js';

export type RegressionRunner = (request: RegressionRequest) => Promise<RegressionResponse>;
export type ApplicationDependencies = { regression?: RegressionRunner };
export type { DiagnosticHelp, IntentDiagnostic, ParserPort };
