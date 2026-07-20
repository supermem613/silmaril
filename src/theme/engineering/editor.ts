import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const markdownItBundlePath = fileURLToPath(import.meta.resolve('markdown-it/dist/markdown-it.min.js'));
const markdownItBundle = readFileSync(markdownItBundlePath, 'utf8');

export function engineeringEditorMarkup(): string {
  return `
  <div class="engineering-editor-shell" data-editor-shell>
    <button class="engineering-editor-toggle" type="button" data-editor-toggle aria-controls="engineering-editor-panel" aria-expanded="false" aria-label="Edit slide markdown" title="Edit slide markdown">
      <span class="engineering-editor-toggle__label">Edit</span>
    </button>
    <div class="engineering-editor-panel" id="engineering-editor-panel" data-editor-container hidden>
      <label class="engineering-editor-panel__label" for="engineering-editor-input">Markdown</label>
      <textarea class="engineering-editor-panel__input" id="engineering-editor-input" data-editor-input spellcheck="false"></textarea>
      <div class="engineering-editor-panel__preview" data-editor-preview aria-live="polite"></div>
    </div>
  </div>
`;
}

export const engineeringEditorScript = `
  <script>${markdownItBundle}</script>
  <script>
    (function () {
      var installEditor = function () {
        var editorShell = document.querySelector('[data-editor-shell]');
        if (editorShell && editorShell.parentElement !== document.body) {
          document.body.appendChild(editorShell);
        }

        var toggle = editorShell ? editorShell.querySelector('[data-editor-toggle]') : document.querySelector('[data-editor-toggle]');
        var container = editorShell ? editorShell.querySelector('[data-editor-container]') : document.querySelector('[data-editor-container]');
        var input = editorShell ? editorShell.querySelector('[data-editor-input]') : document.querySelector('[data-editor-input]');
        var preview = editorShell ? editorShell.querySelector('[data-editor-preview]') : document.querySelector('[data-editor-preview]');
        if (!toggle || !container || !input || !preview) {
          throw new Error('Silmaril editor markup is incomplete');
        }

        var sourceScript = document.getElementById('silmaril-source');
        if (!sourceScript) {
          editorShell.hidden = true;
          return;
        }
        var sourcePayload = JSON.parse(sourceScript.textContent || 'null');

        var slides = Array.isArray(sourcePayload && sourcePayload.slides) ? sourcePayload.slides : [];
        var sourceModel = slides.map(function (slide) {
          return {
            id: slide.id,
            title: slide.title,
            markdown: typeof slide.markdown === 'string' ? slide.markdown : '',
          };
        });
        var sourceMap = new Map();
        sourceModel.forEach(function (slide) {
          sourceMap.set(slide.id, slide);
        });

        window.silmarilSourceModel = sourceModel;
        window.silmarilSourceModelMap = sourceMap;

        var isOpen = false;
        var currentSlideId = null;
        var renderer = null;
        var markdownItFactory = window.markdownit;
        if (typeof markdownItFactory !== 'function') {
          throw new Error('Bundled markdown-it is unavailable');
        }

        renderer = markdownItFactory({
          html: false,
          linkify: true,
          breaks: false,
        });

        var renderMarkdown = function (value) {
          if (!value) {
            return '';
          }
          return renderer.render(value);
        };

        var render = function (markdown) {
          preview.innerHTML = renderMarkdown(markdown || '');
        };

        var bindSlide = function (slideId) {
          currentSlideId = slideId || null;
          if (!slideId) {
            input.value = '';
            input.dataset.slideId = '';
            render('');
            return;
          }

          var slide = sourceMap.get(slideId);
          if (!slide) {
            input.value = '';
            input.dataset.slideId = slideId;
            render('');
            return;
          }

          input.dataset.slideId = slide.id;
          input.value = slide.markdown || '';
          render(input.value);
        };

        var getActiveSlideId = function () {
          var activeStep = document.querySelector('.step.active');
          if (!activeStep) {
            return '';
          }
          return activeStep.getAttribute('data-id') || activeStep.id || '';
        };

        var syncEditor = function () {
          if (!isOpen) {
            return;
          }
          bindSlide(getActiveSlideId());
        };

        var openEditor = function () {
          isOpen = true;
          toggle.setAttribute('aria-expanded', 'true');
          container.removeAttribute('hidden');
          bindSlide(getActiveSlideId());
        };

        var closeEditor = function () {
          isOpen = false;
          toggle.setAttribute('aria-expanded', 'false');
          container.setAttribute('hidden', '');
        };

        toggle.addEventListener('click', function () {
          if (isOpen) {
            closeEditor();
          } else {
            openEditor();
          }
        });

        input.addEventListener('input', function (event) {
          var slideId = input.dataset.slideId || currentSlideId || getActiveSlideId();
          var slide = slideId ? sourceMap.get(slideId) : null;
          if (!slide) {
            return;
          }

          var markdown = event.target.value;
          slide.markdown = markdown;
          render(markdown);
        });

        document.addEventListener('impress:stepenter', function () {
          syncEditor();
        });

        document.addEventListener('keydown', function (event) {
          if (event.key === 'Escape' && isOpen) {
            closeEditor();
          }
        });

        bindSlide(getActiveSlideId());
      };

      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', installEditor, { once: true });
      } else {
        installEditor();
      }
    })();
  </script>
`;
