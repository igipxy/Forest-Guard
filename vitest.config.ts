import { defineConfig } from 'vitest/config';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const rootDir = path.dirname(fileURLToPath(import.meta.url));
const dashboardDir = path.resolve(rootDir, 'apps/monitoring-dashboard');
const cameraWebDir = path.resolve(rootDir, 'apps/camera-web');
const sharedIndex = path.resolve(rootDir, 'packages/shared/index.ts');

function resolveWithExtensions(basePath: string): string | null {
  const candidates = [
    basePath,
    `${basePath}.ts`,
    `${basePath}.tsx`,
    `${basePath}.js`,
    `${basePath}.jsx`,
    path.join(basePath, 'index.ts'),
    path.join(basePath, 'index.tsx'),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
      return candidate;
    }
  }
  return null;
}

export default defineConfig({
  plugins: [
    {
      name: 'monorepo-contextual-alias-resolver',
      resolveId(source: string, importer?: string): string | null {
        if (source === '@fire-monitoring/shared') {
          return sharedIndex;
        }

        if (source.startsWith('@/')) {
          const subPath = source.slice(2);
          const normalizedImporter = (importer ?? '').replace(/\\/g, '/');

          // If the importing file is inside apps/camera-web, resolve @/* to apps/camera-web/*
          if (normalizedImporter.includes('/apps/camera-web/')) {
            const target = path.resolve(cameraWebDir, subPath);
            return resolveWithExtensions(target) ?? target;
          }

          // Otherwise resolve @/* to apps/monitoring-dashboard/* (with fallback check in camera-web)
          const primaryTarget = path.resolve(dashboardDir, subPath);
          const resolvedPrimary = resolveWithExtensions(primaryTarget);
          if (resolvedPrimary) {
            return resolvedPrimary;
          }

          const fallbackTarget = path.resolve(cameraWebDir, subPath);
          return resolveWithExtensions(fallbackTarget) ?? primaryTarget;
        }

        return null;
      },
    },
  ],
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/unit/**/*.test.ts', 'tests/integration/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary'],
    },
  },
});