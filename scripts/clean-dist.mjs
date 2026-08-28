import { rm } from 'node:fs/promises';
import { relative, resolve } from 'node:path';

const root = resolve(process.cwd());
const dist = resolve(root, 'dist');
if (relative(root, dist) !== 'dist') throw new Error(`Refusing to clean unexpected path: ${dist}`);
await rm(dist, { recursive: true, force: true });
