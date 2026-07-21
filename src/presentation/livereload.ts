export const engineeringLiveReloadScript = `
  <script>
    (function () {
      var connect = function () {
        try {
          var source = new EventSource('/__silmaril/livereload');
          source.addEventListener('message', function (event) {
            if (event.data === 'reload') {
              window.location.reload();
            }
          });
        } catch (error) {
          // EventSource is unavailable, so external edits will not reload the page.
        }
      };

      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', connect, { once: true });
      } else {
        connect();
      }
    })();
  </script>
`;
