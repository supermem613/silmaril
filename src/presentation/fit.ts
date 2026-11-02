export const engineeringFitScript = `
  <script>
    (function () {
      function fits(card) {
        return [card].concat(Array.from(card.querySelectorAll('pre, table'))).every(function (element) {
          return element.scrollHeight <= element.clientHeight && element.scrollWidth <= element.clientWidth;
        });
      }

      function fit(card) {
        delete card.dataset.slideFit;
        card.style.removeProperty('height');
        card.style.setProperty('--slide-fit', '1');
        var style = getComputedStyle(card);
        var availableHeight = card.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom);
        card.style.setProperty('--slide-media-height', Math.max(0, availableHeight) + 'px');
        if (fits(card)) {
          card.dataset.slideFit = '1';
          return;
        }

        card.style.height = card.offsetHeight + 'px';
        var low = Number.EPSILON;
        var high = 1;
        card.style.setProperty('--slide-fit', String(low));
        if (!fits(card)) {
          card.style.setProperty('--slide-fit', '1');
          card.dataset.slideFit = 'overflow';
          return;
        }

        // Adjacent floating-point bounds end the search without a font-size policy.
        while (true) {
          var next = (low + high) / 2;
          if (next === low || next === high) {
            break;
          }
          card.style.setProperty('--slide-fit', String(next));
          if (fits(card)) {
            low = next;
          } else {
            high = next;
          }
        }
        card.style.setProperty('--slide-fit', String(low));
        card.dataset.slideFit = String(low);
      }

      function start() {
        var cards = Array.from(document.querySelectorAll('.engineering-card'));
        var pending = new Set();
        var frame = null;
        function schedule(card) {
          pending.add(card);
          if (frame !== null) {
            return;
          }
          frame = requestAnimationFrame(function () {
            frame = null;
            var changed = Array.from(pending);
            pending.clear();
            changed.forEach(fit);
          });
        }
        function scheduleAll() {
          cards.forEach(schedule);
        }
        cards.forEach(function (card) {
          fit(card);
          new MutationObserver(function () {
            schedule(card);
          }).observe(card, {
            subtree: true,
            childList: true,
            characterData: true,
            attributes: true,
            attributeFilter: ['src', 'width', 'height']
          });
        });
        if (typeof ResizeObserver === 'function') {
          var observer = new ResizeObserver(function (entries) {
            entries.forEach(function (entry) {
              schedule(entry.target);
            });
          });
          cards.forEach(function (card) {
            observer.observe(card);
          });
        }
        function mediaChanged(event) {
          if (event.target instanceof Element) {
            var card = event.target.closest('.engineering-card');
            if (card) {
              schedule(card);
            }
          }
        }
        document.addEventListener('load', mediaChanged, true);
        document.addEventListener('error', mediaChanged, true);
        document.addEventListener('impress:stepenter', scheduleAll);
        window.addEventListener('resize', scheduleAll);
        window.addEventListener('beforeprint', function () {
          cards.forEach(fit);
        });
        window.addEventListener('afterprint', scheduleAll);
        if (document.fonts) {
          document.fonts.ready.then(scheduleAll);
          document.fonts.addEventListener('loadingdone', scheduleAll);
        }
      }
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', start, { once: true });
      } else {
        start();
      }
    })();
  </script>
`;
