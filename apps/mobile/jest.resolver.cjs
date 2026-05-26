/**
 * Custom Jest resolver for apps/mobile.
 *
 * Problem: jest-expo uses the react-native resolver (for platform-specific
 * file extensions like .ios.js/.android.js). The @lenserfight/* path aliases
 * live in tsconfig.base.json but apps/mobile/tsconfig.json extends it without
 * re-declaring the paths, so jest-expo's withTypescriptMapping can't see them.
 *
 * Solution: for @lenserfight/* imports we resolve via tsconfig path mapping
 * manually; for everything else we delegate to the react-native resolver so
 * that .ios/.android platform files keep working.
 */


const path = require('path')

// Build the path map once. Workspace root is two directories up from apps/mobile.
const WORKSPACE_ROOT = path.resolve(__dirname, '../..')
const tsconfig = require('../../tsconfig.base.json')
const tsPaths = tsconfig?.compilerOptions?.paths ?? {}

/**
 * Map @lenserfight/* patterns → absolute file path using tsconfig.base.json paths.
 * Only handles single-target (non-wildcard) entries for simplicity.
 */
function resolveLenserfightAlias(moduleName) {
  for (const [key, targets] of Object.entries(tsPaths)) {
    if (!targets.length) continue
    // Exact match  (e.g. "@lenserfight/utils/env" → "libs/utils/env/src/index.ts")
    if (key === moduleName) {
      return path.join(WORKSPACE_ROOT, targets[0])
    }
    // Wildcard match (e.g. "@lenserfight/ui/*")
    if (key.endsWith('/*')) {
      const prefix = key.slice(0, -2) // strip "/*"
      if (moduleName.startsWith(prefix + '/')) {
        const rest = moduleName.slice(prefix.length + 1)
        const target = targets[0].replace('*', rest)
        return path.join(WORKSPACE_ROOT, target)
      }
    }
  }
  return null
}

/**
 * Merge a caller-supplied packageFilter (if any) with react-native's own
 * filter that deletes the "exports" field.  This forces Jest to use the CJS
 * build of react-native instead of its ESM entrypoint.
 * See: node_modules/react-native/jest/resolver.js
 */
function buildPackageFilter(upstream) {
  return (pkg) => {
    const base = upstream ? upstream(pkg) : pkg
    if (base.name === 'react-native') {
      delete base.exports
    }
    return base
  }
}

module.exports = function resolver(moduleName, options) {
  // 1. Intercept @lenserfight/* — resolve via workspace tsconfig paths
  if (moduleName.startsWith('@lenserfight/')) {
    const resolved = resolveLenserfightAlias(moduleName)
    if (resolved) {
      return resolved
    }
  }

  // 2. Everything else: delegate to jest's defaultResolver but apply the
  //    react-native packageFilter so we always get the CJS bundle.
  return options.defaultResolver(moduleName, {
    ...options,
    packageFilter: buildPackageFilter(options.packageFilter),
  })
}
