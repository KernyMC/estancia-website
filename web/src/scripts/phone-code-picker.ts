/**
 * Wires the custom flag + dial-code listbox used next to the phone number
 * field (BookingForm, CartDrawer checkout). Shared because both forms need
 * identical open/close/search/select behavior — only the markup+CSS are
 * duplicated per component (Astro scopes <style> per file).
 *
 * Expects, inside `root`, a single `[data-phone-picker]` with:
 *   [data-phone-btn]    - toggle button (shows current flag + dial code)
 *   [data-phone-panel]  - popover containing the search input + listbox
 *   [data-phone-search] - text input that filters the listbox
 *   [data-phone-list]   - <ul> of <li data-dial data-iso data-name data-search>
 *   [data-phone-empty]  - "no matches" message, shown when the filter empties the list
 *   [data-phone-flag]   - <img> in the toggle button, swapped on selection
 *   [data-phone-dial]   - <span> in the toggle button, swapped on selection
 *   [data-phone-input]  - hidden <input name="phoneCode"> submitted with the form
 */
export function wirePhoneCodePicker(root: ParentNode): void {
  const picker = root.querySelector<HTMLElement>('[data-phone-picker]');
  if (!picker) return;

  const btn = picker.querySelector<HTMLButtonElement>('[data-phone-btn]')!;
  const panel = picker.querySelector<HTMLElement>('[data-phone-panel]')!;
  const search = picker.querySelector<HTMLInputElement>('[data-phone-search]')!;
  const list = picker.querySelector<HTMLUListElement>('[data-phone-list]')!;
  const empty = picker.querySelector<HTMLElement>('[data-phone-empty]')!;
  const flagImg = picker.querySelector<HTMLImageElement>('[data-phone-flag]')!;
  const dialLabel = picker.querySelector<HTMLElement>('[data-phone-dial]')!;
  const hiddenInput = picker.querySelector<HTMLInputElement>('[data-phone-input]')!;
  const options = Array.from(list.querySelectorAll<HTMLLIElement>('li'));

  function filter(query: string) {
    const q = query.trim().toLowerCase();
    let visibleCount = 0;
    for (const option of options) {
      const matches = !q || (option.dataset.search ?? '').includes(q);
      option.hidden = !matches;
      if (matches) visibleCount += 1;
    }
    empty.hidden = visibleCount > 0;
  }

  function close() {
    panel.hidden = true;
    btn.setAttribute('aria-expanded', 'false');
  }

  function open() {
    panel.hidden = false;
    btn.setAttribute('aria-expanded', 'true');
    search.value = '';
    filter('');
    search.focus();
  }

  btn.addEventListener('click', () => {
    if (panel.hidden) open();
    else close();
  });

  search.addEventListener('input', () => filter(search.value));
  search.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      close();
      btn.focus();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const firstVisible = options.find((o) => !o.hidden);
      firstVisible?.click();
    }
  });

  for (const option of options) {
    option.addEventListener('click', (e) => {
      // This list sits inside the field's <label> (for the visual layout),
      // so a plain click also fires the browser's built-in label->control
      // delegation, which re-focuses the button and reopens the panel right
      // after close() runs below. preventDefault() suppresses that delegated
      // activation (found 2026-08-02).
      e.preventDefault();
      const dial = option.dataset.dial ?? '';
      const iso = option.dataset.iso ?? '';
      hiddenInput.value = dial;
      dialLabel.textContent = dial;
      flagImg.src = `https://flagcdn.com/${iso}.svg`;
      flagImg.alt = option.dataset.name ?? '';
      close();
    });
  }

  document.addEventListener('click', (e) => {
    if (!picker.contains(e.target as Node)) close();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') close();
  });
}

/** Combines the picker's dial code with the typed number for submission; empty number → no phone at all. */
export function buildPhoneValue(data: FormData): string | undefined {
  const number = (data.get('phone') as string)?.trim();
  if (!number) return undefined;
  const code = (data.get('phoneCode') as string) || '';
  return [code, number].filter(Boolean).join(' ');
}
