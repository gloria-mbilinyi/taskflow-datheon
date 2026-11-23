import { chromium } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const destination = fileURLToPath(new URL('../assets/screenshots/', import.meta.url));
await mkdir(destination, { recursive: true });
const browser = await chromium.launch({ channel: process.env.PLAYWRIGHT_CHANNEL || (process.platform === 'win32' ? 'chrome' : undefined) });
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1100 }, colorScheme: 'light', reducedMotion: 'reduce' });
  const page = await context.newPage();
  await page.goto(process.env.TASKFLOW_BASE_URL || 'http://127.0.0.1:4173/');
  const date = offset => {
    const value = new Date(); value.setDate(value.getDate() + offset);
    return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;
  };
  const examples = [
    { title: 'Bring the TaskFlow dashboard to life', description: 'Polish the details that make every day feel a little more organized.', category: 'Work', dueDate: date(1) },
    { title: 'A little JavaScript, a little progress', description: 'Practice ES modules and revisit the localStorage API.', category: 'Study', dueDate: date(0) },
    { title: 'Make room for a proper lunch break', description: 'Step away, recharge, and come back with a fresh perspective.', category: 'Personal', dueDate: date(2) },
    { title: 'Map out the week ahead', description: 'Choose three things worth focusing on.', category: 'Work', dueDate: date(-1) },
    { title: 'Sketch the first dashboard ideas', description: 'A clear direction for a calmer workspace.', category: 'Work', dueDate: date(-2), completed: true },
    { title: 'Finish the ES modules practice', description: '', category: 'Study', dueDate: date(-1), completed: true },
  ];
  for (const task of examples) {
    await page.locator('.new-task-button').click();
    for (const [selector, value] of [['#task-title', task.title], ['#task-description', task.description], ['#task-due', task.dueDate]]) await page.locator(selector).fill(value);
    await page.locator('#task-category').selectOption(task.category);
    await page.locator('#save-task').click();
    if (task.completed) await page.getByRole('checkbox', { name: `Complete task: ${task.title}`, exact: true }).click();
  }
  while (await page.locator('.toast .icon-button').count()) await page.locator('.toast .icon-button').first().click();
  async function capture(filename) {
    const geometry = await page.evaluate(() => ({ width: document.documentElement.clientWidth, scroll: document.documentElement.scrollWidth }));
    if (geometry.scroll > geometry.width) throw new Error(`Horizontal overflow before ${filename}`);
    await page.screenshot({ path: destination + filename, fullPage: true });
  }
  await page.locator('h1').click();
  await capture('desktop-light.png');
  await page.locator('#theme-toggle').click();
  await capture('desktop-dark.png');
  await page.locator('#theme-toggle').click();
  await page.setViewportSize({ width: 390, height: 1000 });
  await capture('mobile-light.png');
  console.log(`Actual application screenshots saved. Browser: ${browser.version()}`);
} finally { await browser.close(); }
