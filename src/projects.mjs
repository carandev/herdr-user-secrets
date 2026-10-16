/** Locates .NET projects that declare a <UserSecretsId> and their secrets.json file. */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { basename, dirname, extname, join, resolve } from 'node:path';
import { execFileSync } from 'node:child_process';

const PROJECT_EXTENSIONS = new Set(['.csproj', '.fsproj', '.vbproj']);
const SOLUTION_EXTENSIONS = new Set(['.sln', '.slnx']);
const PRUNED_DIRS = new Set(['bin', 'obj', 'node_modules', '.git', '.vs', '.idea', '.claude', 'dist', 'packages']);

export function extractUserSecretsId(xml) {
  const match = /<UserSecretsId>\s*([^<\s]+)\s*<\/UserSecretsId>/.exec(xml);
  return match ? match[1] : null;
}

/** Same location `dotnet user-secrets` uses on each OS. */
export function secretsFilePath(id, { platform = process.platform, env = process.env, home = homedir() } = {}) {
  const base = platform === 'win32'
    ? join(env.APPDATA, 'Microsoft', 'UserSecrets')
    : join(home, '.microsoft', 'usersecrets');
  return join(base, id, 'secrets.json');
}

function listDir(dir) {
  try {
    return readdirSync(dir, { withFileTypes: true });
  } catch {
    return [];
  }
}

function toProject(file) {
  let id = null;
  try {
    id = extractUserSecretsId(readFileSync(file, 'utf8'));
  } catch {
    return null;
  }
  return id ? { name: basename(file, extname(file)), file, id } : null;
}

function withSecrets(files) {
  return files
    .map(toProject)
    .filter(Boolean)
    .sort((a, b) => a.name.localeCompare(b.name));
}

/** Recursive walk that skips heavy folders and nested git repos/worktrees before entering them. */
function walkProjectFiles(dir, out = []) {
  for (const entry of listDir(dir)) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (PRUNED_DIRS.has(entry.name) || existsSync(join(full, '.git'))) continue;
      walkProjectFiles(full, out);
    } else if (PROJECT_EXTENSIONS.has(extname(entry.name))) {
      out.push(full);
    }
  }
  return out;
}

/** In a git repo, git already knows the files: fast, honours .gitignore, ignores nested worktrees. */
function gitProjectFiles(root) {
  try {
    const output = execFileSync(
      'git',
      ['ls-files', '--cached', '--others', '--exclude-standard', '--', '*.csproj', '*.fsproj', '*.vbproj'],
      { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], windowsHide: true },
    );
    return [...new Set(output.split('\n').filter(Boolean))]
      .map((rel) => join(root, rel))
      .filter((file) => existsSync(file));
  } catch {
    return null;
  }
}

function isSearchRoot(entries) {
  return entries.some((e) => e.name === '.git' || (e.isFile() && SOLUTION_EXTENSIONS.has(extname(e.name))));
}

/**
 * Walks up from `start`: the nearest project with secrets wins; otherwise stops at the
 * first solution or repository root and returns every project with secrets below it.
 */
export function findProjects(start) {
  let dir = resolve(start);
  for (;;) {
    const entries = listDir(dir);
    const here = withSecrets(
      entries.filter((e) => e.isFile() && PROJECT_EXTENSIONS.has(extname(e.name))).map((e) => join(dir, e.name)),
    );
    if (here.length) return here;

    if (isSearchRoot(entries)) {
      const files = (existsSync(join(dir, '.git')) && gitProjectFiles(dir)) || walkProjectFiles(dir);
      return withSecrets(files);
    }

    const parent = dirname(dir);
    if (parent === dir) return [];
    dir = parent;
  }
}
