/**
 * Pay@Palm biometric authorisation — SIMULATED.
 *
 * No palm dev kit ships with the prototype, so this module fakes the rail
 * while mirroring the surface a real SDK exposes: one async `authorizePalm`
 * call that resolves with a signed auth token or throws a coded
 * `PalmAuthError`. When the real kit lands, only the body of `authorizePalm`
 * changes — call sites keep their try/catch + success handling as is.
 */

export type PalmAuthRequest = {
  /** Amount being authorised (₹). */
  amount: number;
  /** Caller-supplied idempotency/trace reference. */
  reference: string;
};

export type PalmAuthResult = {
  status: 'authorised';
  /** Opaque token the payment rail would verify server-side. */
  authToken: string;
  capturedAt: string;
};

export type PalmAuthErrorCode = 'PALM_NOT_RECOGNISED' | 'SENSOR_TIMEOUT' | 'SENSOR_UNAVAILABLE';

export class PalmAuthError extends Error {
  readonly code: PalmAuthErrorCode;

  constructor(code: PalmAuthErrorCode, message: string) {
    super(message);
    this.name = 'PalmAuthError';
    this.code = code;
  }
}

/** Simulated sensor read time, consistent with the simulated-QR pacing. */
const CAPTURE_LATENCY_MS = 1400;

/** Roughly 1-in-6 simulated misreads so the error path stays exercised. */
const SIMULATED_FAILURE_RATE = 0.18;

export async function authorizePalm(request: PalmAuthRequest): Promise<PalmAuthResult> {
  if (!Number.isFinite(request.amount) || request.amount <= 0) {
    throw new PalmAuthError('SENSOR_UNAVAILABLE', 'Nothing to authorise — the bill is empty.');
  }

  await new Promise((resolve) => setTimeout(resolve, CAPTURE_LATENCY_MS));

  if (Math.random() < SIMULATED_FAILURE_RATE) {
    throw new PalmAuthError('PALM_NOT_RECOGNISED', 'Palm not recognised.');
  }

  return {
    status: 'authorised',
    authToken: `palm_${Math.random().toString(36).slice(2, 10)}`,
    capturedAt: new Date().toISOString(),
  };
}
