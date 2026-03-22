import { defineConfig, type Plugin } from 'vite';
import path from 'path';
import fs from 'fs';

/** 将赵云透明贴图复制到 minigame 包内（英文路径，避免 wx 下 URL 解析问题） */
function copyZhaoYunTextureToMinigame(outDir: string): void {
  const src = path.resolve(
    __dirname,
    'assets/03_game_assets/characters/heroes/zhaoyun/in_game/赵云_transparent.png',
  );
  const destDir = path.resolve(outDir, 'assets/characters/zhaoyun');
  const dest = path.resolve(destDir, 'zhaoyun_transparent.png');
  if (!fs.existsSync(src)) {
    console.warn('[copy-game-assets] 源贴图不存在，跳过:', src);
    return;
  }
  fs.mkdirSync(destDir, { recursive: true });
  fs.copyFileSync(src, dest);
  console.log('[copy-game-assets] 已复制赵云贴图到 minigame');
}

/**
 * 构建后替换 bundle 中 ShaderSystem.systemCheck，
 * 避免微信小游戏 unsafe-eval 报错
 */
function pixiUnsafeEvalPlugin(): Plugin {
  return {
    name: 'pixi-unsafe-eval-patch',
    writeBundle(options) {
      const outDir = options.dir || 'minigame';
      copyZhaoYunTextureToMinigame(outDir);
      const bundlePath = path.resolve(outDir, 'game-bundle.js');
      if (!fs.existsSync(bundlePath)) return;
      let code = fs.readFileSync(bundlePath, 'utf8');
      const re = /systemCheck\(\)\{if\(!\w+\(\)\)throw new Error\("Current environment does not allow unsafe-eval[^}]*\}/g;
      const patched = code.replace(re, 'systemCheck(){}');
      if (patched !== code) {
        fs.writeFileSync(bundlePath, patched, 'utf8');
        console.log('[pixi-unsafe-eval-patch] Patched systemCheck in bundle');
      }
    },
  };
}

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
    dedupe: ['@pixi/core', '@pixi/display', '@pixi/settings', '@pixi/constants', '@pixi/utils'],
  },
  publicDir: false,
  plugins: [pixiUnsafeEvalPlugin()],
  build: {
    outDir: 'minigame',
    assetsInlineLimit: 0,
    lib: {
      entry: path.resolve(__dirname, 'src/main.ts'),
      formats: ['iife'],
      name: 'SDC',
      fileName: () => 'game-bundle.js',
    },
    rollupOptions: {
      output: {
        inlineDynamicImports: true,
      },
    },
    minify: 'esbuild',
    emptyOutDir: false,
  },
});
