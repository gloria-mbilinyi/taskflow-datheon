import { cp, mkdir, readFile, realpath, lstat, rm, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = await realpath(fileURLToPath(new URL('../', import.meta.url)));
const output = path.resolve(root, 'dist');
// Verify the exact workspace target before recursively replacing generated output.
if (path.dirname(output) !== root || path.basename(output) !== 'dist') throw new Error('Unsafe build output path');
const existing = await lstat(output).catch(error => { if (error.code === 'ENOENT') return null; throw error; });
if (existing?.isSymbolicLink()) throw new Error('Build output cannot be a symbolic link');
await rm(output, { recursive: true, force: true });
await mkdir(path.join(output, 'assets'), { recursive: true });
for (const entry of ['index.html', 'css', 'js', 'assets/icons']) await cp(path.join(root, entry), path.join(output, entry), { recursive: true });
await writeFile(path.join(output, '.nojekyll'), '');
const git = spawnSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' });
const commit = process.env.GITHUB_SHA || (git.status === 0 ? git.stdout.trim() : 'unversioned');
await writeFile(path.join(output, 'build-info.json'), JSON.stringify({ app: 'TaskFlow', version: '1.0.0', commit, builtAt: new Date().toISOString() }, null, 2));
const html = await readFile(path.join(output, 'index.html'), 'utf8');
for (const match of html.matchAll(/(?:src|href)="(\.\/[^"#]+)"/g)) await readFile(path.resolve(output, match[1]));
console.log('Static release built in dist/; only application files were included.');
