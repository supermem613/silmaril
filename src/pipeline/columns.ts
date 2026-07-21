export type MarkdownSegment =
  | { type: "text"; content: string }
  | { type: "columns"; content: string[] };

type FenceState = {
  inFence: boolean;
  marker: string;
  length: number;
};

function normalizeMarkdown(markdown: string): string {
  return markdown.replace(/\r\n?/g, "\n");
}

function parseFence(line: string): { marker: string; length: number } | null {
  const match = line.match(/^([`~]{3,})(.*)$/);
  if (!match) {
    return null;
  }

  return {
    marker: match[1][0],
    length: match[1].length,
  };
}

function isFenceClose(line: string, state: FenceState): boolean {
  if (!state.inFence) {
    return false;
  }

  const fence = parseFence(line);
  if (!fence) {
    return false;
  }

  if (fence.marker !== state.marker || fence.length < state.length) {
    return false;
  }

  return line.slice(fence.length).trim() === "";
}

function splitColumnsBody(body: string): string[] {
  const lines = normalizeMarkdown(body).split("\n");
  const columns: string[] = [];
  const current: string[] = [];
  let fenceState: FenceState = { inFence: false, marker: "", length: 0 };

  for (const line of lines) {
    if (!fenceState.inFence) {
      const fence = parseFence(line);
      if (fence) {
        fenceState = { inFence: true, marker: fence.marker, length: fence.length };
        current.push(line);
        continue;
      }

      if (line === "---") {
        columns.push(current.join("\n"));
        current.length = 0;
        continue;
      }

      current.push(line);
      continue;
    }

    if (isFenceClose(line, fenceState)) {
      fenceState = { inFence: false, marker: "", length: 0 };
      current.push(line);
      continue;
    }

    current.push(line);
  }

  columns.push(current.join("\n"));
  return columns;
}

export function parseMarkdownSegments(markdown: string): MarkdownSegment[] {
  const normalized = normalizeMarkdown(markdown);
  const lines = normalized.split("\n");
  const segments: MarkdownSegment[] = [];
  let buffer: string[] = [];
  let fenceState: FenceState = { inFence: false, marker: "", length: 0 };
  let index = 0;

  const flushBuffer = () => {
    if (buffer.length > 0) {
      segments.push({ type: "text", content: buffer.join("\n") });
      buffer = [];
    }
  };

  while (index < lines.length) {
    const line = lines[index];

    if (!fenceState.inFence) {
      const fence = parseFence(line);
      if (fence) {
        fenceState = { inFence: true, marker: fence.marker, length: fence.length };
        buffer.push(line);
        index += 1;
        continue;
      }

      if (line === ":::columns") {
        flushBuffer();
        const bodyLines: string[] = [];
        index += 1;
        let blockClosed = false;

        while (index < lines.length) {
          const bodyLine = lines[index];
          if (!fenceState.inFence) {
            const bodyFence = parseFence(bodyLine);
            if (bodyFence) {
              fenceState = { inFence: true, marker: bodyFence.marker, length: bodyFence.length };
              bodyLines.push(bodyLine);
              index += 1;
              continue;
            }

            if (bodyLine === ":::") {
              blockClosed = true;
              index += 1;
              break;
            }
          } else if (isFenceClose(bodyLine, fenceState)) {
            fenceState = { inFence: false, marker: "", length: 0 };
            bodyLines.push(bodyLine);
            index += 1;
            continue;
          }

          bodyLines.push(bodyLine);
          index += 1;
        }

        segments.push({ type: "columns", content: splitColumnsBody(bodyLines.join("\n")) });
        if (!blockClosed) {
          break;
        }
        continue;
      }

      buffer.push(line);
      index += 1;
      continue;
    }

    if (isFenceClose(line, fenceState)) {
      fenceState = { inFence: false, marker: "", length: 0 };
      buffer.push(line);
      index += 1;
      continue;
    }

    buffer.push(line);
    index += 1;
  }

  flushBuffer();
  return segments;
}
