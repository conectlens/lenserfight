/**
 * Root Babel config for the monorepo.
 *
 * babelrcRoots controls whether file-relative .babelrc files in workspace
 * libraries are loaded. When Metro compiles native files it sets a `platform`
 * caller (ios / android / web). In that case we skip the lib .babelrc files —
 * babel-preset-expo already handles JSX/TS and loading @nx/react/babel on top
 * causes a duplicate __self prop error (two @babel/preset-react instances with
 * the automatic runtime). For Jest and every other tool, we keep ["*"] so each
 * lib can declare its own transpilation config.
 */
module.exports = function (api) {
  const platform = api.caller((caller) => caller?.platform)
  api.cache.using(() => platform ?? 'default')
  return {
    babelrcRoots: platform ? false : ['*'],
  }
}
