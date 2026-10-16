#!/usr/bin/env node
// Popup pane: finds the projects with user secrets, lets you pick one and opens its secrets.json.
// Also runnable outside Herdr: `node bin/picker.mjs [directory]`.
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { spawnSync } from 'node:child_process';
import { createInterface } from 'node:readline/promises';
import { editorCommand, parseContextJson, startDirFromContext } from '../src/context.mjs';
import { findProjects, secretsFilePath } from '../src/projects.mjs';
import { choose } from '../src/picker.mjs';

const env = process.env;

async function fail(message) {
  console.log(`\x1b[33m${message}\x1b[0m`);
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  await rl.question('Press Enter to close...');
  rl.close();
  process.exit(1);
}

const start =
  process.argv[2] ||
  env.USER_SECRETS_START_DIR ||
  startDirFromContext(parseContextJson(env.HERDR_PLUGIN_CONTEXT_JSON)) ||
  process.cwd();
console.log(`\x1b[90mSearching projects with user secrets from ${start} ...\x1b[0m`);

const projects = findProjects(start);
if (!projects.length) {
  await fail(`No project with <UserSecretsId> found from ${start}. Run 'dotnet user-secrets init' in the project first.`);
}

const selected = await choose(projects);
if (!selected) process.exit(0);

const file = secretsFilePath(selected.id);
if (!existsSync(file)) {
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, '{\n}\n');
}

// Through the shell so editors with arguments (`code --wait`) and Windows .cmd shims work.
const result = spawnSync(`${editorCommand(env)} "${file}"`, { stdio: 'inherit', shell: true });
if (result.error) await fail(`Could not start the editor: ${result.error.message}`);
process.exit(result.status ?? 0);
