export const engineeringToggleMarkup = `
  <div class="engineering-shell" data-theme="dark" data-attribute="theme">
    <div class="engineering-shell__toolbar">
      <div class="engineering-shell__title">
        <span>Engineering</span>
        <span>Dark-first launch briefing</span>
      </div>
      <button class="engineering-toggle" id="engineering-theme-toggle" type="button" aria-label="Switch to light mode" aria-pressed="false" title="Switch to light mode">
        <span aria-hidden="true">☀︎</span>
        <span class="engineering-toggle__label">Light mode</span>
      </button>
    </div>
  </div>
`;

export const engineeringToggleScript = `
  <script>
    (function () {
      var storageKey = 'silmaril-engineering-theme';
      var shell = document.querySelector('.engineering-shell');
      var toggle = document.getElementById('engineering-theme-toggle');
      var cards = Array.prototype.slice.call(document.querySelectorAll('.engineering-card'));
      var setTheme = function (theme) {
        var nextTheme = theme === 'light' ? 'light' : 'dark';
        if (shell) {
          shell.setAttribute('data-theme', nextTheme);
        }
        if (document.documentElement) {
          document.documentElement.setAttribute('data-theme', nextTheme);
        }
        if (document.body) {
          document.body.setAttribute('data-theme', nextTheme);
        }
        cards.forEach(function (card) {
          card.setAttribute('data-theme', nextTheme);
        });
        if (toggle) {
          toggle.setAttribute('aria-pressed', nextTheme === 'light' ? 'true' : 'false');
          toggle.setAttribute('aria-label', nextTheme === 'light' ? 'Switch to dark mode' : 'Switch to light mode');
          toggle.setAttribute('title', nextTheme === 'light' ? 'Switch to dark mode' : 'Switch to light mode');
          var label = toggle.querySelector('.engineering-toggle__label');
          var icon = toggle.querySelector('span');
          if (label) {
            label.textContent = nextTheme === 'light' ? 'Dark mode' : 'Light mode';
          }
          if (icon) {
            icon.textContent = nextTheme === 'light' ? '☾' : '☀︎';
          }
        }
      };
      var storedTheme = null;
      try {
        storedTheme = window.localStorage.getItem(storageKey);
      } catch (error) {
        storedTheme = null;
      }
      var activeTheme = storedTheme === 'light' || storedTheme === 'dark' ? storedTheme : 'dark';
      setTheme(activeTheme);
      if (toggle) {
        toggle.addEventListener('click', function () {
          var nextTheme = shell && shell.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
          try {
            window.localStorage.setItem(storageKey, nextTheme);
          } catch (error) {
            // Keep the toggle deterministic even when storage is unavailable.
          }
          setTheme(nextTheme);
        });
      }
    })();
  </script>
`;
