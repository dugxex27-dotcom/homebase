(function () {
  var toggle = document.querySelector('[data-marketing-menu-toggle]');
  var panel = document.querySelector('[data-marketing-mobile-panel]');
  if (!toggle || !panel) return;

  var drawer = panel.querySelector('[data-marketing-mobile-drawer]');
  var closeButton = panel.querySelector('[data-marketing-menu-close]');
  var lastFocused = null;

  function focusable() {
    return Array.from((drawer || panel).querySelectorAll(
      'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
    )).filter(function (el) {
      return !el.hasAttribute('hidden') && el.getAttribute('aria-hidden') !== 'true';
    });
  }

  function openMenu() {
    lastFocused = document.activeElement;
    panel.classList.add('open');
    panel.removeAttribute('hidden');
    toggle.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';
    if ('inert' in HTMLElement.prototype) {
      Array.from(document.body.children).forEach(function (child) {
        if (child !== panel && child.tagName !== 'SCRIPT') child.inert = true;
      });
      panel.inert = false;
    }
    window.requestAnimationFrame(function () {
      (closeButton || focusable()[0])?.focus();
    });
  }

  function closeMenu() {
    panel.classList.remove('open');
    panel.setAttribute('hidden', '');
    toggle.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
    if ('inert' in HTMLElement.prototype) {
      Array.from(document.body.children).forEach(function (child) {
        if (child !== panel) child.inert = false;
      });
    }
    if (lastFocused && typeof lastFocused.focus === 'function') lastFocused.focus();
  }

  toggle.addEventListener('click', openMenu);
  closeButton?.addEventListener('click', closeMenu);
  panel.querySelector('[data-marketing-menu-backdrop]')?.addEventListener('click', closeMenu);
  panel.querySelectorAll('a[href], [data-marketing-menu-action]').forEach(function (control) {
    control.addEventListener('click', closeMenu);
  });
  panel.addEventListener('keydown', function (event) {
    if (event.key === 'Escape') {
      event.preventDefault();
      closeMenu();
      return;
    }
    if (event.key !== 'Tab') return;
    var items = focusable();
    if (!items.length) return;
    var first = items[0];
    var last = items[items.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });
})();