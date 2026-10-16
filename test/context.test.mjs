import { test } from 'node:test';
import assert from 'node:assert/strict';
import { startDirFromContext, editorCommand } from '../src/context.mjs';

test('startDirFromContext prefers the focused pane cwd and strips the Windows verbatim prefix', () => {
  const ctx = {
    focused_pane_cwd: '\\\\?\\C:\\repo\\src\\Api',
    worktree: { checkout_path: 'C:/repo' },
    workspace_cwd: 'C:\\repo',
  };
  assert.equal(startDirFromContext(ctx), 'C:\\repo\\src\\Api');
});

test('startDirFromContext falls back to the worktree checkout, then the workspace cwd', () => {
  assert.equal(startDirFromContext({ worktree: { checkout_path: '/repo' }, workspace_cwd: '/ws' }), '/repo');
  assert.equal(startDirFromContext({ workspace_cwd: '/ws' }), '/ws');
});

test('startDirFromContext returns undefined for missing or malformed context', () => {
  assert.equal(startDirFromContext(null), undefined);
  assert.equal(startDirFromContext({ focused_pane_cwd: 42, worktree: 'x' }), undefined);
});

test('editorCommand uses USER_SECRETS_EDITOR, then VISUAL, then EDITOR, then nvim', () => {
  assert.equal(editorCommand({ USER_SECRETS_EDITOR: 'hx', VISUAL: 'code -w', EDITOR: 'vim' }), 'hx');
  assert.equal(editorCommand({ VISUAL: 'code -w', EDITOR: 'vim' }), 'code -w');
  assert.equal(editorCommand({ EDITOR: 'vim' }), 'vim');
  assert.equal(editorCommand({ EDITOR: '  ' }), 'nvim');
  assert.equal(editorCommand({}), 'nvim');
});
