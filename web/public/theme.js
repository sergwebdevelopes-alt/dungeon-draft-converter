(() => {
  try {
    const saved = JSON.parse(
      localStorage.getItem('lair-of-artificer:theme') ?? 'null',
    );
    if (saved === 'light' || saved === 'dark') {
      document.documentElement.dataset.theme = saved;
    }
  } catch {
    return;
  }
})();
