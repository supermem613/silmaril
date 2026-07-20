export function engineeringExportMarkup(): string {
  return `
  <div class="engineering-editor-shell" data-export-shell style="right: 8.6rem; bottom: 1.25rem;">
    <button class="engineering-editor-toggle" type="button" data-export-markdown aria-label="Export Markdown" title="Export Markdown">
      <span class="engineering-editor-toggle__label">Export Markdown</span>
    </button>
  </div>
`;
}

export const engineeringExportScript = `
  <script data-silmaril-export>
    (function () {
      var installExport = function () {
        var exportShell = document.querySelector('[data-export-shell]');
        if (exportShell && exportShell.parentElement !== document.body) {
          document.body.appendChild(exportShell);
        }

        var button = exportShell ? exportShell.querySelector('[data-export-markdown]') : null;
        if (!button) {
          throw new Error('Silmaril export markup is incomplete');
        }

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
            sections.push('## ' + title + (markdown ? '\\n\\n' + markdown : ''));
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
