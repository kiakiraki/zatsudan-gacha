import esbuild from 'esbuild';
import { mkdir, copyFile, readdir, watch as fsWatch } from 'node:fs/promises';
import { join } from 'node:path';

const watch = process.argv.includes('--watch');

async function copyData() {
  await mkdir('public/data', { recursive: true });
  const files = await readdir('data');
  for (const file of files) {
    if (file.endsWith('.json')) {
      await copyFile(join('data', file), join('public/data', file));
    }
  }
}

async function copyCss() {
  await copyFile('src/client/styles.css', 'public/styles.css');
}

async function copyAssets() {
  await Promise.all([copyData(), copyCss()]);
}

const esbuildOptions = {
  entryPoints: ['src/client/main.ts'],
  bundle: true,
  outfile: 'public/main.js',
  format: 'esm',
  target: 'es2020',
  minify: !watch,
  sourcemap: watch ? 'inline' : false,
};

async function build() {
  await copyAssets();

  if (watch) {
    const ctx = await esbuild.context(esbuildOptions);
    await ctx.watch();
    console.log('[build] esbuild watching src/client/main.ts');

    watchAndCopy('data', copyData);
    watchAndCopy('src/client', copyCss, (filename) => filename === 'styles.css');
  } else {
    await esbuild.build(esbuildOptions);
    console.log('[build] done');
  }
}

async function watchAndCopy(target, copyFn, filter) {
  try {
    const watcher = fsWatch(target);
    for await (const event of watcher) {
      if (filter && !filter(event.filename)) continue;
      try {
        await copyFn();
        console.log(`[build] copied (${event.filename ?? target})`);
      } catch (err) {
        console.error(`[build] copy failed for ${target}:`, err);
      }
    }
  } catch (err) {
    console.error(`[build] watch failed for ${target}:`, err);
  }
}

build().catch((err) => {
  console.error(err);
  process.exit(1);
});
