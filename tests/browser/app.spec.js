import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { readFile } from 'node:fs/promises';

const key = 'taskflow.tasks.v1';
const cards = page => page.locator('.task-card');
async function quickAdd(page, title, category = 'Work', dueDate = '') {
  await page.locator('#quick-title').fill(title);
  await page.locator('#quick-category').selectOption(category);
  await page.locator('#quick-due').fill(dueDate);
  await page.getByRole('button', { name: 'Add task', exact: true }).click();
}
async function newTask(page, { title, description = '', category = 'Work', dueDate = '' }) {
  await page.locator('.new-task-button').click();
  await page.locator('#task-title').fill(title);
  await page.locator('#task-description').fill(description);
  await page.locator('#task-category').selectOption(category);
  await page.locator('#task-due').fill(dueDate);
  await page.getByRole('button', { name: 'Create task', exact: true }).click();
}
test.beforeEach(async ({ page }) => { await page.goto('./'); });

test('loads every application asset without runtime or request errors', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('requestfailed', request => errors.push(request.url()));
  page.on('response', response => { if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`); });
  await page.reload();
  await expect(page.locator('#quick-title')).toBeEnabled();
  await expect(page.locator('#theme-toggle')).toBeEnabled();
  expect(errors).toEqual([]);
});

test('creates tasks through both forms, validates titles and persists all task fields', async ({ page }) => {
  await page.locator('.new-task-button').click();
  await page.locator('#task-title').fill('   ');
  await page.getByRole('button', { name: 'Create task', exact: true }).click();
  await expect(page.locator('#title-error')).toContainText('Give your task a title');
  await expect(page.locator('#task-title')).toBeFocused();
  await page.locator('#task-title').fill('Build TaskFlow');
  await page.locator('#task-description').fill('Finish the Datheon internship project.');
  await page.locator('#task-category').selectOption('Study');
  await page.locator('#task-due').fill('2026-12-01');
  await page.getByRole('button', { name: 'Create task', exact: true }).click();
  await quickAdd(page, 'Plan tomorrow', 'Personal');
  await expect(cards(page)).toHaveCount(2);
  await page.reload();
  await expect(cards(page)).toHaveCount(2);
  const saved = await page.evaluate(key => JSON.parse(localStorage.getItem(key)), key);
  expect(saved.version).toBe(1);
  expect(saved.tasks[0]).toMatchObject({ title: 'Build TaskFlow', description: 'Finish the Datheon internship project.', category: 'Study', dueDate: '2026-12-01', completed: false });
  expect(saved.tasks[0].id).toBeTruthy();
  expect(saved.tasks[0].createdAt).toEqual(saved.tasks[0].updatedAt);
  expect(saved.tasks[0].id).not.toEqual(saved.tasks[1].id);
});

test('quick-add rejects a blank title with an associated error', async ({ page }) => {
  await quickAdd(page, '   ');
  await expect(page.locator('#quick-error')).toContainText('Give your task a title');
  await expect(cards(page)).toHaveCount(0);
  await expect(page.locator('#quick-title')).toHaveAttribute('aria-invalid', 'true');
});

test('edits task fields while preserving identity and reloads the edits', async ({ page }) => {
  await quickAdd(page, 'Original');
  const before = await page.evaluate(key => JSON.parse(localStorage.getItem(key)).tasks[0], key);
  await page.getByRole('button', { name: 'Edit task: Original', exact: true }).click();
  await page.locator('#task-title').fill('Updated');
  await page.locator('#task-description').fill('Refined details');
  await page.locator('#task-category').selectOption('Personal');
  await page.locator('#task-due').fill('2026-12-15');
  await page.locator('#completed-field input').check();
  await page.getByRole('button', { name: 'Save changes', exact: true }).click();
  await page.reload();
  await expect(cards(page)).toContainText('Updated');
  await expect(page.locator('.task-check')).toBeChecked();
  const after = await page.evaluate(key => JSON.parse(localStorage.getItem(key)).tasks[0], key);
  expect(after.id).toBe(before.id); expect(after.createdAt).toBe(before.createdAt);
  expect(after).toMatchObject({ description: 'Refined details', category: 'Personal', dueDate: '2026-12-15', completed: true });
});

test('completion, reopening and clearing completed tasks update progress', async ({ page }) => {
  await quickAdd(page, 'First'); await quickAdd(page, 'Second');
  await page.getByRole('checkbox', { name: 'Complete task: First', exact: true }).click();
  await expect(page.locator('#stat-completed')).toHaveText('1');
  await expect(page.locator('#task-progress')).toHaveAttribute('value', '50');
  await page.getByRole('checkbox', { name: 'Reopen task: First', exact: true }).click();
  await expect(page.locator('#stat-completed')).toHaveText('0');
  await page.getByRole('checkbox', { name: 'Complete task: First', exact: true }).click();
  await page.locator('#clear-completed').click();
  await page.locator('#confirm-cancel').click();
  await expect(cards(page)).toHaveCount(2);
  await page.locator('#clear-completed').click();
  await page.locator('#confirm-accept').click();
  await expect(cards(page)).toHaveCount(1);
  await expect(cards(page)).toContainText('Second');
});

test('deletion is canceled by Escape and requires explicit confirmation', async ({ page }) => {
  await quickAdd(page, 'Temporary task');
  await page.getByRole('button', { name: 'Delete task: Temporary task', exact: true }).click();
  await expect(page.locator('#confirm-cancel')).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(cards(page)).toHaveCount(1);
  await page.getByRole('button', { name: 'Delete task: Temporary task', exact: true }).click();
  await page.locator('#confirm-accept').click();
  await expect(cards(page)).toHaveCount(0);
  await page.reload(); await expect(cards(page)).toHaveCount(0);
});

test('combines status, category and search and clears a filtered empty state', async ({ page }) => {
  await quickAdd(page, 'Read JavaScript notes', 'Study');
  await quickAdd(page, 'Read project brief', 'Work');
  await quickAdd(page, 'Take a walk', 'Personal');
  await page.getByRole('checkbox', { name: 'Complete task: Read JavaScript notes', exact: true }).click();
  await page.locator('#category-filter').selectOption('Study');
  await page.locator('.status-tabs [data-status="completed"]').click();
  await page.locator('#search').fill('JAVASCRIPT');
  await expect(cards(page)).toHaveCount(1);
  await page.locator('.status-tabs [data-status="active"]').click();
  await expect(cards(page)).toHaveCount(0);
  await expect(page.locator('#empty-title')).toContainText('quiet');
  await page.locator('#empty-action').click();
  await expect(cards(page)).toHaveCount(3);
  await expect(page.locator('#search')).toHaveValue('');
  await expect(page.locator('#stat-total')).toHaveText('3');
});

test('keyboard and mobile move controls persist task order', async ({ page }) => {
  for (const title of ['Alpha', 'Bravo', 'Charlie']) await quickAdd(page, title);
  await page.getByRole('button', { name: 'Move up: Charlie', exact: true }).press('Enter');
  await expect(page.locator('.task-title')).toHaveText(['Alpha', 'Charlie', 'Bravo']);
  await page.getByRole('button', { name: 'Move down: Alpha', exact: true }).click();
  await page.reload();
  await expect(page.locator('.task-title')).toHaveText(['Charlie', 'Alpha', 'Bravo']);
  await expect(page.getByRole('button', { name: 'Move up: Charlie', exact: true })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Move down: Bravo', exact: true })).toBeDisabled();
});

test('native desktop drag-and-drop reorders and persists tasks', async ({ page }) => {
  for (const title of ['Alpha', 'Bravo', 'Charlie']) await quickAdd(page, title);
  await cards(page).last().locator('.drag-handle').dragTo(cards(page).first(), { targetPosition: { x: 100, y: 10 } });
  await expect(page.locator('.task-title')).toHaveText(['Charlie', 'Alpha', 'Bravo']);
  await page.reload();
  await expect(page.locator('.task-title')).toHaveText(['Charlie', 'Alpha', 'Bravo']);
});

test('renders user input as text and never creates executable HTML', async ({ page }) => {
  const title = '<img src=x onerror="window.taskflowInjected=true">';
  await newTask(page, { title, description: '<script>window.taskflowInjected=true</script>' });
  await expect(page.locator('.task-title')).toHaveText(title);
  await expect(cards(page).locator('script, img')).toHaveCount(0);
  expect(await page.evaluate(() => window.taskflowInjected)).toBeUndefined();
});

test('dialogs trap keyboard focus, close with Escape, and restore the opener', async ({ page }) => {
  await page.locator('.new-task-button').click();
  await expect(page.locator('#task-title')).toBeFocused();
  for (let i = 0; i < 15; i++) {
    await page.keyboard.press('Tab');
    expect(await page.evaluate(() => !!document.activeElement.closest('#task-dialog'))).toBe(true);
  }
  await page.keyboard.press('Escape');
  await expect(page.locator('.new-task-button')).toBeFocused();
  await page.keyboard.press('/');
  await expect(page.locator('#search')).toBeFocused();
});

test('theme choice survives reload in both directions', async ({ page }) => {
  await page.getByRole('button', { name: 'Switch to dark theme', exact: true }).click();
  await page.reload(); await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.getByRole('button', { name: 'Switch to light theme', exact: true }).click();
  await page.reload(); await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
});

test('corrupt storage is protected, can be backed up, and recovers after confirmation', async ({ page }) => {
  await page.evaluate(key => localStorage.setItem(key, '{broken'), key);
  await page.reload();
  await expect(page.locator('#storage-warning')).toBeVisible();
  await quickAdd(page, 'Protected new task');
  expect(await page.evaluate(key => localStorage.getItem(key), key)).toBe('{broken');
  const downloadPromise = page.waitForEvent('download');
  await page.locator('#export-backup').click();
  const download = await downloadPromise;
  const backup = JSON.parse(await readFile(await download.path(), 'utf8'));
  expect(backup.originalSavedData).toBe('{broken');
  expect(backup.tasks[0].title).toBe('Protected new task');
  await page.locator('#reset-storage').click();
  await page.locator('#confirm-accept').click();
  await expect(page.locator('#storage-warning')).toBeHidden();
  await page.reload();
  await expect(cards(page)).toHaveCount(1);
});

test('denied storage keeps CRUD functional in memory and displays a persistent warning', async ({ page }) => {
  await page.addInitScript(() => { Object.defineProperty(window, 'localStorage', { get() { throw new DOMException('Denied', 'SecurityError'); } }); });
  await page.reload();
  await expect(page.locator('#storage-warning')).toBeVisible();
  await quickAdd(page, 'In-memory task');
  await expect(cards(page)).toHaveCount(1);
  await expect(page.locator('#save-status')).toContainText('this tab only');
});

test('quota failures preserve the previous saved workspace', async ({ page }) => {
  await quickAdd(page, 'Already saved');
  const before = await page.evaluate(key => localStorage.getItem(key), key);
  await page.evaluate(key => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function (name, value) { if (name === key) throw new DOMException('Full', 'QuotaExceededError'); return original.call(this, name, value); };
  }, key);
  await quickAdd(page, 'Not yet saved');
  await expect(cards(page)).toHaveCount(2);
  await expect(page.locator('#storage-warning')).toBeVisible();
  expect(await page.evaluate(key => localStorage.getItem(key), key)).toBe(before);
});

test('synchronizes valid workspace changes across tabs without losing edits', async ({ page, context, baseURL }) => {
  const other = await context.newPage(); await other.goto(baseURL);
  await quickAdd(other, 'Shared task');
  await expect(cards(page)).toHaveCount(1);
  await page.getByRole('checkbox', { name: 'Complete task: Shared task', exact: true }).click();
  await expect(other.locator('.task-check')).toBeChecked();
  await other.close();
});

for (const width of [1440, 768, 390, 320]) {
  test(`responsive layout and accessible dialogs at ${width}px in light and dark themes`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 1000 });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
    const upcomingDate = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')}`;
    await newTask(page, { title: 'A thoughtful plan for a productive week ' + 'x'.repeat(100), description: 'x'.repeat(120), category: 'Study', dueDate: upcomingDate });
    await quickAdd(page, 'Review project goals', 'Work', '2026-11-01');
    await quickAdd(page, 'Make time for a walk', 'Personal');
    await page.getByRole('button', { name: 'Edit task: Review project goals', exact: true }).click();
    await page.locator('#completed-field input').check();
    await page.getByRole('button', { name: 'Save changes', exact: true }).click();
    if (width <= 800) {
      await page.locator('#menu-toggle').click();
      await expect(page.locator('#menu-toggle')).toHaveAttribute('aria-expanded', 'true');
      await expect(page.locator('#sidebar')).toBeVisible();
      await page.keyboard.press('Escape');
      await expect(page.locator('#sidebar')).toBeHidden();
    }
    for (const theme of ['light', 'dark']) {
      if (theme === 'dark') await page.locator('#theme-toggle').click();
      const geometry = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, width: document.documentElement.clientWidth }));
      expect(geometry.scroll).toBeLessThanOrEqual(geometry.width);
      const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
      expect(results.violations).toEqual([]);
      await page.screenshot({ path: testInfo.outputPath(`${width}-${theme}.png`), fullPage: true });
      await page.locator('.new-task-button').click();
      const modalResults = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
      expect(modalResults.violations).toEqual([]);
      expect(await page.locator('#task-dialog').evaluate(node => node.scrollWidth <= node.clientWidth)).toBe(true);
      await page.keyboard.press('Escape');
    }
    expect(errors).toEqual([]);
  });
}
