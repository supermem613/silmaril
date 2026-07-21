import { renderPresentationFromMarkdown } from '../../src/pipeline/renderFile.js';

export function renderDeck(markdown: string, sourcePath: string) {
  const presentation = renderPresentationFromMarkdown(markdown, sourcePath);

  return {
    html: presentation.html,
    slideCount: presentation.slideCount,
  };
}
