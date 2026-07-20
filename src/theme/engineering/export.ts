export function engineeringExportMarkup(): string {
  return `
  <button class="engineering-editor-toggle" type="button" data-export-markdown aria-label="Export Markdown" title="Export Markdown">
    <span class="engineering-editor-toggle__label">Export Markdown</span>
  </button>
`;
}

export const engineeringExportScript = `
  <script data-silmaril-export>
    (function () {
      var installExport = function () {
        var actions = document.querySelector('[data-editor-actions]');
        var button = document.querySelector('[data-export-markdown]');
        if (!actions || !button) {
          throw new Error('Silmaril export markup is incomplete');
        }
        actions.insertBefore(button, actions.firstChild);

        var sourceScript = document.getElementById('silmaril-source');
        var sourcePayload = sourceScript ? JSON.parse(sourceScript.textContent || 'null') : null;
        var documentTitle = sourcePayload && typeof sourcePayload.title === 'string' ? sourcePayload.title : '';
        var slides = Array.isArray(window.silmarilSourceModel) ? window.silmarilSourceModel : [];

        var sanitizeFileName = function (value) {
          var cleaned = (value || '').trim().replace(/[\\\\/\\s]+/g, '-').replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/-+/g, '-').replace(/^-+|-+$/g, '');
          return cleaned ? cleaned + '.md' : 'presentation.md';
        };

        var serializeMarkdown = function () {
          var sections = ['# ' + (documentTitle || 'Presentation')];
          slides.forEach(function (slide) {
            var title = typeof slide.title === 'string' ? slide.title : '';
            var markdown = typeof slide.markdown === 'string' ? slide.markdown : '';
            var bodySeparator = markdown.startsWith('\\n') ? '\\n' : '\\n\\n';
            sections.push('## ' + title + (markdown ? bodySeparator + markdown : ''));
          });
          return sections.join('\\n\\n') + '\\n';
        };

        var exportMarkdown = async function () {
          var markdown = serializeMarkdown();
          var fileName = sanitizeFileName(documentTitle);
          if (typeof window.showSaveFilePicker === 'function') {
            try {
              var handle = await window.showSaveFilePicker({
                suggestedName: fileName,
                types: [{
                  description: 'Markdown',
                  accept: {
                    'text/markdown': ['.md'],
                  },
                }],
              });
              var writable = await handle.createWritable();
              await writable.write(markdown);
              await writable.close();
              return;
            } catch (error) {
              if (error && typeof error === 'object' && error.name === 'AbortError') {
                return;
              }
              throw error;
            }
          }

          var blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
          var objectUrl = URL.createObjectURL(blob);
          var anchor = document.createElement('a');
          anchor.href = objectUrl;
          anchor.download = fileName;
          anchor.style.display = 'none';
          document.body.appendChild(anchor);
          anchor.click();
          anchor.remove();
          URL.revokeObjectURL(objectUrl);
        };

        button.addEventListener('click', exportMarkdown);
      };

      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', installExport, { once: true });
      } else {
        installExport();
      }
    })();
  </script>
`;
