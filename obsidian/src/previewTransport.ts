import { randomUUID } from 'node:crypto';
import path from 'node:path';

interface PreviewFileSystem {
  mkdir(directory: string, options: { recursive: true }): Promise<unknown>;
  rm(filePath: string, options: { force: true }): Promise<void>;
  writeFile(
    filePath: string,
    content: string,
    options: { encoding: 'utf8' },
  ): Promise<void>;
}

interface PreviewTransportOptions {
  readonly directory: string;
  readonly fileSystem: PreviewFileSystem;
  readonly toFileUrl: (filePath: string) => string;
}

export function createPreviewTransport({
  directory,
  fileSystem,
  toFileUrl,
}: PreviewTransportOptions) {
  const filePath = path.join(directory, `${randomUUID()}.html`);
  let revision = 0;
  let pending: Promise<void> = Promise.resolve();
  let published = false;

  const enqueue = <T>(operation: () => Promise<T>): Promise<T> => {
    const result = pending.then(operation);
    pending = result.then(
      () => undefined,
      () => undefined,
    );
    return result;
  };

  return {
    publish(html: string) {
      return enqueue(async () => {
        await fileSystem.mkdir(directory, { recursive: true });
        await fileSystem.writeFile(filePath, html, { encoding: 'utf8' });
        published = true;
        revision += 1;
        return `${toFileUrl(filePath)}?revision=${revision}`;
      });
    },
    dispose() {
      return enqueue(async () => {
        if (!published) {
          return;
        }

        await fileSystem.rm(filePath, { force: true });
        published = false;
      });
    },
  };
}
