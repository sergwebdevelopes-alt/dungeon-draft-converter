import type { StoredTokens } from './patreon-tokens.ts';

interface ChosenTokens {
  tokens: StoredTokens;
  fromEnv: boolean;
}

function chooseTokens(
  stored: StoredTokens | null,
  fromEnv: StoredTokens,
): ChosenTokens {
  if (stored?.seededFrom === fromEnv.seededFrom) {
    return { tokens: stored, fromEnv: false };
  }

  return { tokens: fromEnv, fromEnv: true };
}

export { chooseTokens };
export type { ChosenTokens };
