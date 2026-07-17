export interface JsonEnvelope<T = unknown> {
  ok: boolean;
  command: string;
  data?: T;
  error?: string;
  hint?: string;
  warnings: string[];
}

export function emitJsonSuccess<T>(command: string, data: T, warnings: string[] = []): void {
  const payload: JsonEnvelope<T> = { ok: true, command, data, warnings };
  process.stdout.write(JSON.stringify(payload) + "\n");
}

export function emitJsonError(command: string, error: string, hint: string, warnings: string[] = []): void {
  const payload: JsonEnvelope = { ok: false, command, error, hint, warnings };
  process.stdout.write(JSON.stringify(payload) + "\n");
}

export function emitJsonFailure(command: string, error: string, hint: string, warnings: string[] = []): void {
  emitJsonError(command, error, hint, warnings);
  if (hint) {
    process.stderr.write(`${hint}\n`);
  }
}
