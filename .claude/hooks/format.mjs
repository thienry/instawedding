// PostToolUse hook: formats the edited file with Prettier, silently.
import { spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import path from 'node:path'

const root = path.resolve(import.meta.dirname, '../..')
const { tool_input: input } = JSON.parse(readFileSync(0, 'utf8'))
const file = input?.file_path && path.resolve(root, input.file_path)

if (file?.startsWith(root + path.sep)) {
  const prettier = path.join(root, 'node_modules/prettier/bin/prettier.cjs')
  spawnSync(
    process.execPath,
    [prettier, '--write', '--ignore-unknown', '--log-level=silent', file],
    { cwd: root, stdio: 'ignore' }
  )
}
