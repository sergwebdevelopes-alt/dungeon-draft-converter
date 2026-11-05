import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, it } from 'node:test';

const SCRIPT = path.join(import.meta.dirname, 'deploy-app.sh');
const SHA = 'c7dc0f6b8072e9ff79722d4be9180edeb04885b7';
const OTHER_SHA = '84b3d27c42c1386ba53304269927c9dd8c8dad2b';

const FAKE_CURL = `#!/bin/sh
echo "curl $*" >> "$LOG"
while [ $# -gt 0 ]; do
  if [ "$1" = "-o" ]; then echo "from $2" > "$2"; fi
  shift
done
`;
const FAKE_DOCKER = `#!/bin/sh
echo "docker $*" >> "$LOG"
`;

let root;
let appDir;
let log;

function writeExecutable(file, content) {
  fs.writeFileSync(file, content, { mode: 0o755 });
}

function run(command, { asArgument = false } = {}) {
  const env = {
    ...process.env,
    PATH: `${path.join(root, 'bin')}:${process.env.PATH}`,
    APP_DIR: appDir,
    LOG: log,
  };
  if (asArgument) {
    delete env.SSH_ORIGINAL_COMMAND;
  } else {
    env.SSH_ORIGINAL_COMMAND = command;
  }

  try {
    const stdout = execFileSync(
      'sh',
      [SCRIPT, ...(asArgument ? [command] : [])],
      {
        env,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
      },
    );
    return { status: 0, stdout };
  } catch (error) {
    return { status: error.status, stdout: error.stdout };
  }
}

function calls() {
  return fs.existsSync(log)
    ? fs.readFileSync(log, 'utf8').trim().split('\n')
    : [];
}

function envFile() {
  return fs.readFileSync(path.join(appDir, '.env'), 'utf8');
}

describe('deploy-app.sh', () => {
  beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'deploy-app-'));
    appDir = path.join(root, 'app');
    log = path.join(root, 'log');
    fs.mkdirSync(path.join(root, 'bin'));
    fs.mkdirSync(appDir);
    writeExecutable(path.join(root, 'bin', 'curl'), FAKE_CURL);
    writeExecutable(path.join(root, 'bin', 'docker'), FAKE_DOCKER);
    fs.writeFileSync(
      path.join(appDir, '.env'),
      'COMPOSE_FILE=compose.yml:compose.prod.yml\nPOSTGRES_USER=lair\n',
      { mode: 0o600 },
    );
  });

  afterEach(() => {
    fs.rmSync(root, { recursive: true, force: true });
  });

  it('refuses anything but a full lowercase commit sha, without running anything', () => {
    for (const bad of [
      '',
      'c7dc0f6',
      'rm -rf /',
      SHA.toUpperCase(),
      `${SHA}x`,
      `${SHA}; ls`,
    ]) {
      assert.equal(run(bad).status, 2, JSON.stringify(bad));
    }
    assert.deepEqual(calls(), []);
    assert.equal(envFile().includes('APP_TAG'), false);
  });

  it('fetches the compose files of that commit, pins the image and restarts', () => {
    const result = run(SHA);

    assert.equal(result.status, 0, result.stdout);
    assert.match(result.stdout, new RegExp(`Deployed ${SHA}`));
    assert.deepEqual(calls(), [
      `curl -fsSL https://raw.githubusercontent.com/sergwebdevelopes-alt/dungeon-draft-converter/${SHA}/compose.yml -o compose.yml.new`,
      `curl -fsSL https://raw.githubusercontent.com/sergwebdevelopes-alt/dungeon-draft-converter/${SHA}/compose.prod.yml -o compose.prod.yml.new`,
      'docker compose pull',
      'docker compose up -d --wait',
      'docker image prune -af',
    ]);
    assert.equal(
      fs.readFileSync(path.join(appDir, 'compose.prod.yml'), 'utf8'),
      'from compose.prod.yml.new\n',
    );
    assert.deepEqual(fs.readdirSync(appDir).sort(), [
      '.env',
      'compose.prod.yml',
      'compose.yml',
    ]);
    assert.equal(
      envFile(),
      `COMPOSE_FILE=compose.yml:compose.prod.yml\nPOSTGRES_USER=lair\nAPP_TAG=${SHA}\n`,
    );
  });

  it('replaces the pinned image on the next deploy and keeps .env private', () => {
    run(SHA);
    run(OTHER_SHA);

    const lines = envFile().trim().split('\n');
    assert.deepEqual(
      lines.filter((line) => line.startsWith('APP_TAG=')),
      [`APP_TAG=${OTHER_SHA}`],
    );
    assert.equal(lines.length, 3);
    assert.equal(fs.statSync(path.join(appDir, '.env')).mode & 0o777, 0o600);
  });

  it('takes the sha as an argument when run by hand', () => {
    const result = run(SHA, { asArgument: true });

    assert.equal(result.status, 0, result.stdout);
    assert.equal(calls().length, 5);
  });

  it('stops before restarting when a compose file cannot be fetched', () => {
    writeExecutable(
      path.join(root, 'bin', 'curl'),
      '#!/bin/sh\necho "curl $*" >> "$LOG"\nexit 22\n',
    );

    const result = run(SHA);

    assert.notEqual(result.status, 0);
    assert.equal(
      calls().some((call) => call.startsWith('docker')),
      false,
    );
    assert.equal(fs.existsSync(path.join(appDir, 'compose.yml')), false);
    assert.equal(envFile().includes('APP_TAG'), false);
  });
});
