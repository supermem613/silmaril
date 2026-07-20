export function engineeringToggleMarkup(): string {
  return `
  <div class="engineering-shell" data-theme="dark" data-attribute="theme">
    <button class="engineering-toggle" id="engineering-theme-toggle" type="button" aria-label="Switch to light mode" aria-pressed="false" title="Switch to light mode">
      <span class="engineering-toggle__label">Light mode</span>
    </button>
  </div>
`;
}

export const engineeringToggleScript = `
  <script>
    (function () {
      var installTheme = function () {
        var storageKey = 'silmaril-engineering-theme';
        var shell = document.querySelector('.engineering-shell');
        var toggle = document.getElementById('engineering-theme-toggle');
        var cards = Array.prototype.slice.call(document.querySelectorAll('.engineering-card'));
        if (shell && shell.parentElement !== document.body) {
          document.body.appendChild(shell);
        }
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
            if (label) {
              label.textContent = nextTheme === 'light' ? 'Dark mode' : 'Light mode';
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
      };
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', installTheme, { once: true });
      } else {
        installTheme();
      }
    })();
  </script>
`;

export const engineeringNavigationScript = `
  <script>
    (function () {
      var installNavigation = function () {
        var overview = document.querySelector('.step[data-id="overview"]');
        var slides = Array.prototype.slice.call(document.querySelectorAll('.step:not(.overview)'));
        var goToOverview = function () {
          if (overview && typeof window.impress === 'function') {
            window.impress().goto(overview);
          }
        };
        var scheduleOverview = function () {
          window.requestAnimationFrame(function () {
            window.requestAnimationFrame(goToOverview);
          });
        };
        var pendingOverviewKey = null;
        var preserveBrowserRefresh = function (event) {
          if (event.key === 'F5' || event.code === 'F5') {
            event.stopImmediatePropagation();
          }
        };
        var handleNavigation = function (event) {
          if (event.key === 'Tab' || event.key === 'End') {
            event.preventDefault();
            event.stopImmediatePropagation();
            if (event.type === 'keydown') {
              scheduleOverview();
            }
            return;
          }
          if (event.type === 'keyup' && event.key === pendingOverviewKey) {
            event.preventDefault();
            event.stopImmediatePropagation();
            pendingOverviewKey = null;
            return;
          }
          var active = document.querySelector('.step.active');
          var lastSlide = slides[slides.length - 1];
          var movesForward = event.key === 'ArrowRight'
            || event.key === 'PageDown'
            || event.key === ' ';
          if (event.type === 'keydown' && active === lastSlide && movesForward) {
            event.preventDefault();
            event.stopImmediatePropagation();
            pendingOverviewKey = event.key;
            scheduleOverview();
          }
        };
        var openBoardStep = function (event) {
          if (!document.querySelector('.step.active[data-id="overview"]')) {
            return;
          }
          var target = event.target instanceof Element ? event.target : null;
          var step = target ? target.closest('.step:not(.overview)') : null;
          if (!step || typeof window.impress !== 'function') {
            return;
          }
          if (event.type === 'keydown' && event.key !== 'Enter') {
            return;
          }
          event.preventDefault();
          window.impress().goto(step);
        };
        slides.forEach(function (slide) {
          slide.setAttribute('role', 'button');
          slide.setAttribute('tabindex', '0');
        });
        document.addEventListener('click', openBoardStep);
        document.addEventListener('keydown', openBoardStep);
        window.addEventListener('keydown', preserveBrowserRefresh, true);
        window.addEventListener('keydown', handleNavigation, true);
        window.addEventListener('keyup', handleNavigation, true);
      };
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', installNavigation, { once: true });
      } else {
        installNavigation();
      }
    })();
  </script>
`;
