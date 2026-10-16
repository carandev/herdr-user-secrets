/** Herdr context parsing and editor selection. Parsing is deliberately defensive. */

const isObj = (v) => v !== null && typeof v === 'object';
const str = (v) => (typeof v === 'string' && v.trim() ? v : undefined);

/** Herdr reports Windows paths with a `\\?\` verbatim prefix; node and git dislike it. */
export function stripVerbatimPrefix(p) {
  return p.replace(/^\\\\\?\\/, '');
}

export function parseContextJson(text) {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

/** Directory to search from: the focused pane, then the worktree checkout, then the workspace. */
export function startDirFromContext(ctx) {
  if (!isObj(ctx)) return undefined;
  const worktree = isObj(ctx.worktree) ? ctx.worktree : {};
  const dir = str(ctx.focused_pane_cwd) ?? str(worktree.checkout_path) ?? str(ctx.workspace_cwd);
  return dir && stripVerbatimPrefix(dir);
}

export function editorCommand(env = process.env) {
  return str(env.USER_SECRETS_EDITOR) ?? str(env.VISUAL) ?? str(env.EDITOR) ?? 'nvim';
}
