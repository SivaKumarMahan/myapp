/**
 * GitHub Pages serves static files only, so a deep link such as
 * /myapp/az104/topics/az1-rbac has no file behind it and Pages answers with
 * 404.html. Copying index.html to 404.html lets the client side router take
 * over, which keeps real URLs (instead of hash URLs) working on Pages.
 *
 * .nojekyll stops Pages from running Jekyll, which would otherwise drop files
 * and directories whose names begin with an underscore.
 */
import { copyFileSync, existsSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const distDir = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'dist')
const indexHtml = resolve(distDir, 'index.html')

if (!existsSync(indexHtml)) {
  console.error('postbuild: dist/index.html not found - did "vite build" run?')
  process.exit(1)
}

copyFileSync(indexHtml, resolve(distDir, '404.html'))
writeFileSync(resolve(distDir, '.nojekyll'), '')
console.log('postbuild: wrote dist/404.html and dist/.nojekyll')

/*
 * transformers.js references the ONNX runtime's wasm, so Vite copies it into
 * assets/ (27 MB) - but at run time the runtime is loaded from jsDelivr, as
 * the browser test showed. Nothing requests the local copy, so it is dropped
 * rather than deployed.
 */
const assetsDir = resolve(distDir, 'assets')
for (const file of readdirSync(assetsDir)) {
  if (/^ort-wasm.*\.wasm$/.test(file)) {
    rmSync(resolve(assetsDir, file))
    console.log(`postbuild: removed unused ${file}`)
  }
}

/*
 * Offline check: every built page, script, style, wasm and icon must be in the
 * service worker's precache, except the files that are deliberately cached on
 * first use (the Study bot's optional on-device model runtime). A new lazy
 * chunk that slipped past the globPatterns - or grew past the size limit -
 * would silently break offline use, so the build fails instead.
 */
const swPath = resolve(distDir, 'sw.js')
if (existsSync(swPath)) {
  const sw = readFileSync(swPath, 'utf8')
  const precached = new Set([...sw.matchAll(/url:"([^"]+)"/g)].map((match) => match[1]))
  const runtimeOnly = [/^assets\/vendor-transformers-.*\.js$/]
  const walk = (dir, prefix = '') =>
    readdirSync(resolve(distDir, dir), { withFileTypes: true }).flatMap((entry) =>
      entry.isDirectory()
        ? walk(`${dir}/${entry.name}`, `${prefix}${entry.name}/`)
        : [`${prefix}${entry.name}`],
    )
  const shipped = [
    ...walk('assets', 'assets/'),
    ...readdirSync(distDir).filter((name) => /\.(html|svg|png)$/.test(name) && name !== '404.html'),
    ...walk('icons', 'icons/'),
  ].filter((file) => /\.(js|css|wasm|html|svg|png|woff2)$/.test(file))
  const missing = shipped.filter(
    (file) => !precached.has(file) && !runtimeOnly.some((pattern) => pattern.test(file)),
  )
  if (missing.length > 0) {
    console.error(
      `postbuild: ${missing.length} file(s) are not precached and would not work offline:\n  ${missing.join('\n  ')}`,
    )
    process.exit(1)
  }
  console.log(`postbuild: offline check passed - ${precached.size} files precached`)
}
