// Runs every check and prints output only for the ones that fail.
import { spawnSync } from 'node:child_process'
import path from 'node:path'

// Known warnings (set-state-in-effect). Lower this as they get fixed.
const MAX_LINT_WARNINGS = 4

const steps = [
  ['typecheck', 'tsc -b --pretty false'],
  ['lint', `oxlint -f unix --max-warnings=${MAX_LINT_WARNINGS}`],
  ['test', 'vitest run --reporter=dot'],
  ['format', 'prettier --check . --log-level warn'],
]

// Lets the script work both through npm and directly with node.
const env = {
  ...process.env,
  NO_COLOR: '1',
  PATH: `${path.resolve('node_modules/.bin')}${path.delimiter}${process.env.PATH}`,
}

let failed = false
for (const [name, command] of steps) {
  const result = spawnSync(command, { shell: true, encoding: 'utf8', env })
  if (result.status === 0) continue
  failed = true
  const output = `${result.stdout ?? ''}${result.stderr ?? ''}`.trim()
  console.error(`[${name}] failed\n${output}\n`)
}

if (failed) process.exit(1)
console.log('check ok')
