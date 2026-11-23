import test from 'node:test';
import assert from 'node:assert/strict';
import { loadTheme, saveTheme, THEME_KEY } from '../js/theme.js';

test('theme defaults to the system and honors a saved manual preference', () => {
  assert.deepEqual(loadTheme({ storage: { getItem: () => null }, systemDark: true }), { theme: 'dark', source: 'system' });
  assert.deepEqual(loadTheme({ storage: { getItem: () => 'light' }, systemDark: true }), { theme: 'light', source: 'saved' });
  assert.equal(loadTheme({ storage: { getItem: () => 'unexpected' } }).theme, 'light');
});
test('theme persistence survives a second load and handles storage denial', () => {
  let saved = null;
  const storage = { getItem: () => saved, setItem(key, value) { assert.equal(key, THEME_KEY); saved = value; } };
  assert.equal(saveTheme('dark', storage), true);
  assert.equal(loadTheme({ storage }).theme, 'dark');
  assert.equal(saveTheme('light', storage), true);
  assert.equal(loadTheme({ storage }).theme, 'light');
  const denied = { getItem() { throw new Error('Denied'); }, setItem() { throw new Error('Denied'); } };
  assert.equal(loadTheme({ storage: denied, systemDark: true }).theme, 'dark');
  assert.equal(saveTheme('dark', denied), false);
  assert.equal(saveTheme('invalid', storage), false);
});
