const MAIN_ID = 'content';

function focusMain(options?: FocusOptions): void {
  document.getElementById(MAIN_ID)?.focus(options);
}

export { MAIN_ID, focusMain };
