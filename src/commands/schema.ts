import { emitJsonSuccess } from "../output.js";
import { buildSchema } from "../registry.js";

export async function schemaCommand(pathArgs: string[], opts: { summary?: boolean }, cliVersion: string): Promise<void> {
  const payload = buildSchema(cliVersion, pathArgs, opts.summary ?? false);
  emitJsonSuccess("schema", payload);
  process.exit(0);
}
