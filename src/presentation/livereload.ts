export function engineeringLiveReloadMarkup(): string {
  return `
  <button class="silmaril-refresh" type="button" data-silmaril-refresh aria-label="Reload from source" title="Reload from source">
    <span class="silmaril-refresh__label">Refresh</span>
  </button>
`;
}

export const engineeringLiveReloadScript = `
  <script>
    (function () {
      window.__silmarilServe = true;

      var install = function () {
        var button = document.querySelector('[data-silmaril-refresh]');
        if (button && button.parentElement !== document.body) {
          document.body.appendChild(button);
        }
        if (button) {
          button.addEventListener('click', function () {
            window.location.reload();
          });
        }

        try {
          var source = new EventSource('/__silmaril/livereload');
          source.addEventListener('message', function (event) {
            if (event.data === 'reload') {
              window.location.reload();
            }
          });
        } catch (error) {
          // EventSource is unavailable; the manual Refresh button still works.
        }
      };

      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', install, { once: true });
      } else {
        install();
      }
    })();
  </script>
`;
