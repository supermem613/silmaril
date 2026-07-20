import { readFileSync } from "node:fs";
import { fileURLToPath } from 'node:url';

const markdownItBundlePath = fileURLToPath(import.meta.resolve('markdown-it/dist/markdown-it.min.js'));
const markdownItBundle = readFileSync(markdownItBundlePath, 'utf8');

export function engineeringEditorMarkup(): string {
  return `
  <div class="engineering-editor-shell" data-editor-shell>
    <div class="engineering-editor-panel" id="engineering-editor-panel" data-editor-container hidden>
      <div class="engineering-editor-panel__header">
        <label class="engineering-editor-panel__label" for="engineering-editor-input">Markdown</label>
        <button class="engineering-editor-panel__close" type="button" data-editor-close aria-label="Close Markdown editor" title="Close Markdown editor">
          <span aria-hidden="true">&times;</span>
        </button>
      </div>
      <textarea class="engineering-editor-panel__input" id="engineering-editor-input" data-editor-input spellcheck="false"></textarea>
    </div>
    <div class="engineering-editor-drawer">
      <div class="engineering-editor-actions" id="engineering-editor-actions" data-editor-actions hidden>
        <button class="engineering-editor-toggle" type="button" data-editor-toggle aria-controls="engineering-editor-panel" aria-expanded="false" aria-label="Edit slide markdown" title="Edit slide markdown">
          <span class="engineering-editor-toggle__label">Edit</span>
        </button>
      </div>
      <button class="engineering-editor-drawer-toggle" type="button" data-editor-drawer-toggle aria-controls="engineering-editor-actions" aria-expanded="false" aria-label="Show editing controls" title="Show editing controls">
        <span data-editor-drawer-icon aria-hidden="true">&laquo;</span>
      </button>
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
        var drawerToggle = editorShell ? editorShell.querySelector('[data-editor-drawer-toggle]') : document.querySelector('[data-editor-drawer-toggle]');
        var drawerIcon = editorShell ? editorShell.querySelector('[data-editor-drawer-icon]') : document.querySelector('[data-editor-drawer-icon]');
        var actions = editorShell ? editorShell.querySelector('[data-editor-actions]') : document.querySelector('[data-editor-actions]');
        var container = editorShell ? editorShell.querySelector('[data-editor-container]') : document.querySelector('[data-editor-container]');
        var input = editorShell ? editorShell.querySelector('[data-editor-input]') : document.querySelector('[data-editor-input]');
        var closeButton = editorShell ? editorShell.querySelector('[data-editor-close]') : document.querySelector('[data-editor-close]');
        if (!toggle || !drawerToggle || !drawerIcon || !actions || !container || !input || !closeButton) {
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

        var isEditorOpen = false;
        var isDrawerOpen = false;
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

        var renderActiveSlide = function (markdown) {
          var activeStep = document.querySelector('.step.active');
          var slideContent = activeStep ? activeStep.querySelector('[data-slide-content]') : null;
          if (slideContent) {
            slideContent.innerHTML = renderMarkdown(markdown || '');
          }
        };

        var bindSlide = function (slideId) {
          currentSlideId = slideId || null;
          if (!slideId) {
            input.value = '';
            input.dataset.slideId = '';
            return;
          }

          var slide = sourceMap.get(slideId);
          if (!slide) {
            input.value = '';
            input.dataset.slideId = slideId;
            return;
          }

          input.dataset.slideId = slide.id;
          input.value = slide.markdown || '';
        };

        var getActiveSlideId = function () {
          var activeStep = document.querySelector('.step.active');
          if (!activeStep) {
            return '';
          }
          return activeStep.getAttribute('data-id') || activeStep.id || '';
        };

        var syncEditor = function () {
          if (!isEditorOpen) {
            return;
          }
          bindSlide(getActiveSlideId());
        };

        var openEditor = function () {
          isEditorOpen = true;
          toggle.setAttribute('aria-expanded', 'true');
          container.removeAttribute('hidden');
          bindSlide(getActiveSlideId());
        };

        var closeEditor = function () {
          isEditorOpen = false;
          toggle.setAttribute('aria-expanded', 'false');
          container.setAttribute('hidden', '');
        };

        var setDrawerOpen = function (open) {
          isDrawerOpen = open;
          drawerToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
          drawerToggle.setAttribute('aria-label', open ? 'Hide editing controls' : 'Show editing controls');
          drawerToggle.setAttribute('title', open ? 'Hide editing controls' : 'Show editing controls');
          drawerIcon.textContent = open ? '\\u00bb' : '\\u00ab';
          if (open) {
            actions.removeAttribute('hidden');
          } else {
            actions.setAttribute('hidden', '');
            closeEditor();
          }
        };

        drawerToggle.addEventListener('click', function () {
          setDrawerOpen(!isDrawerOpen);
        });

        toggle.addEventListener('click', function () {
          if (isEditorOpen) {
            closeEditor();
          } else {
            openEditor();
          }
        });

        closeButton.addEventListener('click', function () {
          closeEditor();
          toggle.focus();
        });

        input.addEventListener('input', function (event) {
          var slideId = input.dataset.slideId || currentSlideId || getActiveSlideId();
          var slide = slideId ? sourceMap.get(slideId) : null;
          if (!slide) {
            return;
          }

          var markdown = event.target.value;
          slide.markdown = markdown;
          renderActiveSlide(markdown);
        });

        document.addEventListener('impress:stepenter', function () {
          syncEditor();
        });

        document.addEventListener('keydown', function (event) {
          if (event.key === 'Escape') {
            if (isEditorOpen) {
              closeEditor();
            } else if (isDrawerOpen) {
              setDrawerOpen(false);
            }
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
