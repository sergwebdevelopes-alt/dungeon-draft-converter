function stopOnBadSettings(problems: string[]): void {
  if (problems.length === 0) {
    return;
  }

  console.error(
    [
      'Stopped because of problems in the settings:',
      ...problems.map((problem) => `- ${problem}`),
    ].join('\n'),
  );
  process.exit(1);
}

export { stopOnBadSettings };
