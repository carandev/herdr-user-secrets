#!/usr/bin/env node
// Action entrypoint: opens the popup pane, forwarding the directory of the focused pane.
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { parseContextJson, startDirFromContext } from '../src/context.mjs';

const run = promisify(execFile);
const env = process.env;
const startDir = startDirFromContext(parseContextJson(env.HERDR_PLUGIN_CONTEXT_JSON));

// Popup panes may not inherit the action's env, so the start directory travels explicitly.
const args = ['plugin', 'pane', 'open', '--plugin', env.HERDR_PLUGIN_ID || 'user-secrets', '--entrypoint', 'picker', '--focus'];
if (startDir) args.push('--env', `USER_SECRETS_START_DIR=${startDir}`);

try {
  await run(env.HERDR_BIN_PATH || 'herdr', args, { windowsHide: true });
} catch (e) {
  console.error(`user-secrets: could not open the picker: ${e.stderr || e.message}`);
  process.exit(1);
}
