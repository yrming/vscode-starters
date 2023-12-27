import * as child_process from 'node:child_process'
import type { SpawnedProcess } from '../../types'
import { isWin } from '../constants'

const toolEnv: { [key: string]: string } = {}
const simpleCommandRegex = new RegExp('^[\\w\\-.]+$')

export function safeToolSpawn(workingDirectory: string | undefined, binPath: string, args: string[], envOverrides?: { [key: string]: string | undefined }): SpawnedProcess {
  const env = Object.assign({}, toolEnv, envOverrides) as { [key: string]: string | undefined } | undefined
  return safeSpawn(workingDirectory, binPath, args, env)
}

export function safeSpawn(workingDirectory: string | undefined, binPath: string, args: string[], env: { [key: string]: string | undefined } | undefined): SpawnedProcess {
  const quotedArgs = args.map(quoteAndEscapeArg)
  const customEnv = Object.assign({}, process.env, env)
  // Putting quotes around something like "git" will cause it to fail, so don't do it if binPath is just a single identifier.
  binPath = simpleCommandRegex.test(binPath) ? binPath : `"${binPath}"`
  return child_process.spawn(binPath, quotedArgs, { cwd: workingDirectory, env: customEnv, shell: true }) as SpawnedProcess
}

function quoteAndEscapeArg(arg: string) {
  // Spawning processes on Windows with funny symbols in the path requires quoting. However if you quote an
  // executable with a space in its path and an argument also has a space, you have to then quote _all_ of the
  // arguments!
  // https://github.com/nodejs/node/issues/7367
  let escaped = arg.replace(/"/g, `\\"`).replace(/`/g, '\\`')
  // Additionally, on Windows escape redirection symbols with ^ if they come
  // directly after quotes (?).
  // https://ss64.com/nt/syntax-esc.html
  if (isWin)
    escaped = escaped.replace(/"([<>])/g, '"^$1')
  return `"${escaped}"`
}
