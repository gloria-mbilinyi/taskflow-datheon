export function initializeNavigation() {
  const sidebar = document.getElementById('sidebar');
  const toggle = document.getElementById('menu-toggle');
  const mobile = window.matchMedia('(max-width: 800px)');
  function setOpen(open, restoreFocus = false) {
    sidebar.classList.toggle('is-open', open);
    toggle.setAttribute('aria-expanded', open);
    toggle.setAttribute('aria-label', `${open ? 'Close' : 'Open'} navigation`);
    if (restoreFocus) toggle.focus();
  }
  function synchronize() { toggle.hidden = !mobile.matches; setOpen(false); }
  synchronize(); mobile.addEventListener('change', synchronize);
  toggle.addEventListener('click', () => {
    const open = toggle.getAttribute('aria-expanded') !== 'true';
    setOpen(open);
    if (open) sidebar.querySelector('button').focus();
  });
  sidebar.addEventListener('click', event => { if (mobile.matches && event.target.closest('button')) setOpen(false, true); });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && mobile.matches && sidebar.classList.contains('is-open') && !document.querySelector('dialog[open]')) setOpen(false, true);
  });
}
