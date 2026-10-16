import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pickerStep, splitKeys } from '../src/picker.mjs';

test('pickerStep moves with arrows and j/k, clamped to the list', () => {
  assert.deepEqual(pickerStep(0, '\x1b[B', 3), { index: 1 });
  assert.deepEqual(pickerStep(1, 'j', 3), { index: 2 });
  assert.deepEqual(pickerStep(2, '\x1b[B', 3), { index: 2 });
  assert.deepEqual(pickerStep(2, '\x1b[A', 3), { index: 1 });
  assert.deepEqual(pickerStep(0, 'k', 3), { index: 0 });
});

test('pickerStep jumps with digits within range and confirms with Enter', () => {
  assert.deepEqual(pickerStep(0, '3', 3), { index: 2 });
  assert.deepEqual(pickerStep(0, '9', 3), { index: 0 });
  assert.deepEqual(pickerStep(1, '\r', 3), { index: 1, done: true });
});

test('pickerStep cancels with Esc, q and Ctrl+C', () => {
  for (const key of ['\x1b', 'q', '\x03']) {
    assert.deepEqual(pickerStep(1, key, 3), { index: 1, cancel: true });
  }
});

test('splitKeys separates keys and escape sequences that arrive in one chunk', () => {
  assert.deepEqual(splitKeys('jj'), ['j', 'j']);
  assert.deepEqual(splitKeys('\x1b[B\x1b[B\r'), ['\x1b[B', '\x1b[B', '\r']);
  assert.deepEqual(splitKeys('\x1bOA'), ['\x1bOA']);
  assert.deepEqual(splitKeys('\x1b'), ['\x1b']);
  assert.deepEqual(splitKeys('2\r'), ['2', '\r']);
});
