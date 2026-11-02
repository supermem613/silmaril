import { renderPresentationFromMarkdownAsync } from '../../src/pipeline/renderFile.js';

const previewBridgeScript = `
<script>
  (function () {
    var readSlide = function () {
      var steps = Array.prototype.slice.call(document.querySelectorAll('.step'));
      var active = document.querySelector('.step.active');
      return {
        slideId: active ? active.getAttribute('data-id') || '' : '',
        slideIndex: active ? steps.indexOf(active) : 0
      };
    };
    var postSlide = function (type) {
      var slide = readSlide();
      window.parent.postMessage({
        type: type,
        slideId: slide.slideId,
        slideIndex: slide.slideIndex
      }, '*');
    };
    var afterPaint = function (callback) {
      window.requestAnimationFrame(function () {
        window.requestAnimationFrame(callback);
      });
    };
    var announceReady = function () {
      afterPaint(function () {
        postSlide('silmaril-preview-ready');
      });
    };

    document.addEventListener('impress:stepenter', function () {
      afterPaint(function () {
        postSlide('silmaril-preview-state');
      });
    });
    window.addEventListener('message', function (event) {
      var data = event.data;
      if (event.source !== window.parent
        || !data
        || data.type !== 'silmaril-preview-restore') {
        return;
      }

      var steps = Array.prototype.slice.call(document.querySelectorAll('.step'));
      var target = steps.find(function (step) {
        return step.getAttribute('data-id') === data.slideId;
      });
      if (!target && Number.isInteger(data.slideIndex) && steps.length > 0) {
        var index = Math.max(0, Math.min(data.slideIndex, steps.length - 1));
        target = steps[index];
      }
      if (!target || typeof window.impress !== 'function') {
        announceReady();
        return;
      }
      if (target.classList.contains('active')) {
        announceReady();
        return;
      }

      var targetObserver = new MutationObserver(function () {
        if (!target.classList.contains('active')) {
          return;
        }
        targetObserver.disconnect();
        announceReady();
      });
      targetObserver.observe(target, {
        attributes: true,
        attributeFilter: ['class']
      });
      window.impress().goto(target, 0);
      if (target.classList.contains('active')) {
        targetObserver.disconnect();
        announceReady();
      }
    });

    announceReady();
  })();
</script>`;

function addPreviewBridge(html: string): string {
  const closingBody = '  </body>';
  if (!html.includes(closingBody)) {
    throw new Error('Silmaril presentation is missing its closing body tag.');
  }

  return html.replace(closingBody, `${previewBridgeScript}\n${closingBody}`);
}

export async function renderDeck(markdown: string, sourcePath: string) {
  const presentation = await renderPresentationFromMarkdownAsync(markdown, sourcePath);

  return {
    html: addPreviewBridge(presentation.html),
    slideCount: presentation.slideCount,
  };
}
