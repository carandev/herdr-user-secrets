import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, realpathSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { extractUserSecretsId, secretsFilePath, findProjects } from '../src/projects.mjs';

const csproj = (id) =>
  `<Project><PropertyGroup>${id ? `<UserSecretsId> ${id} </UserSecretsId>` : ''}</PropertyGroup></Project>`;

function write(root, rel, content = '') {
  const file = join(root, rel);
  mkdirSync(join(file, '..'), { recursive: true });
  writeFileSync(file, content);
}

function solution() {
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'us-')));
  write(root, 'App.sln');
  write(root, 'src/Api/Api.csproj', csproj('api-1'));
  write(root, 'src/Worker/Worker.fsproj', csproj('wrk-2'));
  write(root, 'src/Lib/Lib.csproj', csproj());
  write(root, 'src/Api/obj/Junk.csproj', csproj('junk'));
  write(root, 'node_modules/pkg/Pkg.csproj', csproj('junk'));
  write(root, '.claude/worktrees/feat/src/Api/Api.csproj', csproj('api-1'));
  return root;
}

const names = (projects) => projects.map((p) => p.name);

test('extractUserSecretsId reads the trimmed id or returns null', () => {
  assert.equal(extractUserSecretsId(csproj('abc-123')), 'abc-123');
  assert.equal(extractUserSecretsId(csproj()), null);
});

test('secretsFilePath follows the dotnet user-secrets location per OS', () => {
  assert.equal(
    secretsFilePath('id1', { platform: 'win32', env: { APPDATA: 'C:\\AppData' }, home: 'C:\\Users\\me' }),
    join('C:\\AppData', 'Microsoft', 'UserSecrets', 'id1', 'secrets.json'),
  );
  assert.equal(
    secretsFilePath('id1', { platform: 'linux', env: {}, home: '/home/me' }),
    join('/home/me', '.microsoft', 'usersecrets', 'id1', 'secrets.json'),
  );
});

test('inside a project with secrets, only that project is returned', () => {
  const root = solution();
  assert.deepEqual(names(findProjects(join(root, 'src/Api'))), ['Api']);
});

test('at the solution root, all projects with secrets are returned, skipping heavy folders', () => {
  const root = solution();
  const projects = findProjects(root);
  assert.deepEqual(names(projects), ['Api', 'Worker']);
  assert.equal(projects[0].id, 'api-1');
  assert.equal(projects[0].file, join(root, 'src', 'Api', 'Api.csproj'));
});

test('inside a project without secrets, it walks up to the solution', () => {
  const root = solution();
  assert.deepEqual(names(findProjects(join(root, 'src/Lib'))), ['Api', 'Worker']);
});

test('in a git repo, projects come from git (untracked included) and ignored folders are skipped', () => {
  const root = solution();
  write(root, '.gitignore', 'bin/\nobj/\nnode_modules/\n.claude/\n');
  execFileSync('git', ['init', '-q'], { cwd: root });
  write(root, 'src/New/New.csproj', csproj('new-3'));
  assert.deepEqual(names(findProjects(root)), ['Api', 'New', 'Worker']);
});

test('returns an empty list when no project declares secrets', () => {
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'us-')));
  write(root, 'App.sln');
  write(root, 'Lib/Lib.csproj', csproj());
  assert.deepEqual(findProjects(root), []);
});
