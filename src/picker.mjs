/** Terminal picker for choosing one project. */
import { createInterface } from 'node:readline/promises';

const KEY_UP = new Set(['\x1b[A', '\x1bOA', 'k']);
const KEY_DOWN = new Set(['\x1b[B', '\x1bOB', 'j']);
const KEY_CANCEL = new Set(['\x1b', 'q', '\x03']);

export function pickerStep(index, key, count) {
  if (KEY_UP.has(key)) return { index: Math.max(0, index - 1) };
  if (KEY_DOWN.has(key)) return { index: Math.min(count - 1, index + 1) };
  if (key === '\r' || key === '\n') return { index, done: true };
  if (KEY_CANCEL.has(key)) return { index, cancel: true };
  const digit = Number(key);
  if (/^[1-9]$/.test(key) && digit <= count) return { index: digit - 1 };
  return { index };
}

/** A data chunk may carry several keys (fast typing, paste): split CSI/SS3 sequences and characters. */
export function splitKeys(chunk) {
  return chunk.match(/\x1b\[[0-9;]*[A-Za-z~]|\x1bO[A-Za-z]|[\s\S]/gu) ?? [];
}

function render(projects, index, redraw) {
  if (redraw) process.stdout.write(`\x1b[${projects.length}A`);
  projects.forEach((p, i) => {
    const line = i === index ? `\x1b[36m❯ ${i + 1}) ${p.name}\x1b[0m` : `  ${i + 1}) ${p.name}`;
    process.stdout.write(`\x1b[2K${line}\n`);
  });
}

/**
 * Raw-mode picker. stdin is paused BEFORE leaving raw mode: the other order makes
 * libuv restart a line-mode console read on Windows that keeps swallowing the
 * editor's input until Enter is pressed.
 */
function pickInteractive(projects) {
  const { stdin } = process;
  console.log('\x1b[36mProjects with user secrets\x1b[0m \x1b[90m(↑/↓ or j/k, 1-9, Enter, Esc)\x1b[0m');
  let index = 0;
  render(projects, index, false);
  return new Promise((resolveChoice) => {
    const onData = (chunk) => {
      for (const key of splitKeys(chunk.toString('utf8'))) {
        const step = pickerStep(index, key, projects.length);
        if (step.done || step.cancel) {
          stdin.off('data', onData);
          stdin.pause();
          stdin.setRawMode(false);
          resolveChoice(step.done ? projects[step.index] : null);
          return;
        }
        if (step.index !== index) {
          index = step.index;
          render(projects, index, true);
        }
      }
    };
    stdin.setRawMode(true);
    stdin.on('data', onData);
    stdin.resume();
  });
}

/** Non-interactive fallback (piped stdin): numbered prompt. */
async function pickNumbered(projects) {
  console.log('\x1b[36mProjects with user secrets:\x1b[0m');
  projects.forEach((p, i) => console.log(`  ${String(i + 1).padStart(2)}) ${p.name}`));
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  try {
    for (;;) {
      const answer = (await rl.question('Choose a number (empty to cancel): ')).trim();
      if (!answer) return null;
      const n = Number(answer);
      if (Number.isInteger(n) && n >= 1 && n <= projects.length) return projects[n - 1];
      console.log('\x1b[31mInvalid option.\x1b[0m');
    }
  } finally {
    rl.close();
  }
}

/** Resolves the chosen project, or null when cancelled. */
export async function choose(projects) {
  if (projects.length === 1) return projects[0];
  return process.stdin.isTTY ? pickInteractive(projects) : pickNumbered(projects);
}
