import * as fs from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'
import type { URI } from 'vscode-uri'
import type { WorkspaceFolder } from 'vscode'
import { STARTER_TEMPLATE_CREATE_PROJECT_TRIGGER_FILE, isWin } from '../constants'
import { config } from '../../config'
import type { Logger, MyCancellationToken } from '../../types'
import { sortBy } from './array'

export function fsPath(uri: URI | string, { useRealCasing = false }: { useRealCasing?: boolean } = {}): string {
  // tslint:disable-next-line:disallow-fspath
  let newPath = typeof uri === 'string' ? uri : uri.fsPath

  if (useRealCasing) {
    const realPath = fs.existsSync(newPath) && fs.realpathSync.native(newPath)
    // Since realpathSync.native will resolve symlinks, only do anything if the paths differ
    // _only_ by case.
    // when there was no symlink (eg. the lowercase version of both paths match).
    if (realPath && realPath.toLowerCase() === newPath.toLowerCase() && realPath !== newPath) {
      console.warn(`Rewriting path:\n  ${newPath}\nto:\n  ${realPath} because the casing appears incorrect`)
      newPath = realPath
    }
  }

  newPath = forceWindowsDriveLetterToUppercase(newPath)

  return newPath
}

export function forceWindowsDriveLetterToUppercase<T extends string | undefined>(p: T): string | (undefined extends T ? undefined : never) {
  if (typeof p !== 'string')
    return undefined as (undefined extends T ? undefined : never)

  if (p && isWin && path.isAbsolute(p) && p.startsWith(p.charAt(0).toLowerCase()))
    return p.substr(0, 1).toUpperCase() + p.substr(1)

  return p
}

export function nextAvailableFilename(folder: string, prefix: string, suffix = ''): string {
  // Set an upper bound on how many attempts we should make in getting a non-existent name.
  const maxSearchLimit = 128

  for (let index = 1; index <= maxSearchLimit; index++) {
    const name = `${prefix}${index}${suffix}`
    const fullPath = path.join(folder, name)

    if (!fs.existsSync(fullPath)) {
      // Name doesn't appear to exist on-disk and thus can be used - return it.
      return name
    }
  }

  // We hit the search limit, so return {prefix}{index} (eg. mydir1) and allow the extension to
  // handle the already-exists condition if user doesn't change it manually.
  return `${prefix}1${suffix}`
}

/// Shortens a path to use ~ if it's inside the home directory and always
// uses forward slashes in that case.
export function homeRelativePath(p: string | undefined) {
  if (!p)
    return undefined
  const homedir = os.homedir()
  if (isWithinPath(p, homedir)) {
    if (isWin)
      return path.join('~', path.relative(homedir, p)).replace(/\\/g, '/')
    else
      return path.join('~', path.relative(homedir, p))
  }
  return p
}

export function isWithinPath(file: string, folder: string) {
  const relative = path.relative(folder.toLowerCase(), file.toLowerCase())
  return !!relative && !relative.startsWith('..') && !path.isAbsolute(relative)
}

export function hasPackageJson(folder: string): boolean {
  return fs.existsSync(path.join(folder, 'package.json'))
}

/// Gets all excluded folders (full absolute paths) for a given workspace
/// folder based on config.
export function getExcludedFolders(f: WorkspaceFolder | undefined): string[] {
  if (!f)
    return []

  const excludedForWorkspace = config.for(f.uri).excludedFolders
  if (!excludedForWorkspace || !Array.isArray(excludedForWorkspace))
    return []

  const workspacePath = fsPath(f.uri)
  return excludedForWorkspace.map((folder) => {
    // Handle both relative and absolute paths.
    if (!path.isAbsolute(folder))
      folder = path.join(workspacePath, folder)
    return folder
  })
}

// Walks a few levels down and returns all folders that look like project
// folders, such as:
// - have a package.json
// - have a project create trigger file
// - are the repo root
export async function findProjectFolders(logger: Logger, roots: string[], excludedFolders: string[], options: { sort?: boolean, requirePackageJson?: boolean, searchDepth: number, onlyWorkspaceRoots?: boolean }, token: MyCancellationToken): Promise<string[]> {
  let previousLevelFolders = roots.slice()
  let allPossibleFolders = previousLevelFolders.slice()
  // Start at 1, as we already added the roots.
  const searchDepth = options.onlyWorkspaceRoots ? 1 : options.searchDepth
  for (let i = 1; i < searchDepth; i++) {
    let nextLevelFolders: string[] = []
    for (const folder of previousLevelFolders) {
      if (token.isCancellationRequested)
        break
      nextLevelFolders = nextLevelFolders.concat(await getChildFolders(logger, folder))
    }

    allPossibleFolders = allPossibleFolders.concat(nextLevelFolders)
    previousLevelFolders = nextLevelFolders
  }

  allPossibleFolders = allPossibleFolders
    .filter(f => excludedFolders.every(ef => !isEqualOrWithinPath(f, ef)))

  const projectFolderPromises = allPossibleFolders.map(async folder => ({
    exists: options && options.requirePackageJson
      ? await hasPackageJsonAsync(folder)
      : options.onlyWorkspaceRoots || await hasPackageJsonAsync(folder) || await hasCreateTriggerFileAsync(folder),
    folder,
  }))
  const projectFoldersChecks = await Promise.all(projectFolderPromises)
  const projectFolders = projectFoldersChecks
    .filter(res => res.exists)
    .map(res => res.folder)

  return options && options.sort
    ? sortBy(projectFolders, (p: any) => p.toLowerCase())
    : projectFolders
}

export async function getChildFolders(logger: Logger, parent: string, options?: { allowBin?: boolean, allowCache?: boolean }): Promise<string[]> {
  if (!fs.existsSync(parent))
    return []
  const files = await readDirAsync(logger, parent)

  return files.filter(f => f.isDirectory())
    .filter(f => f.name !== 'bin' || (options && options.allowBin)) // Don't look in bin folders
    .filter(f => f.name !== 'cache' || (options && options.allowCache)) // Don't look in cache folders
    .map(item => path.join(parent, item.name))
}

export function readDirAsync(logger: Logger, folder: string): Promise<fs.Dirent[]> {
  return new Promise<fs.Dirent[]>(resolve => fs.readdir(folder, { withFileTypes: true }, (err, files) => {
    // We will generate errors if we don't have access to this folder
    // so just skip over it.
    if (err) {
      logger.warn(`Skipping folder ${folder} due to error: ${err}`)
      resolve([])
    }
    else {
      resolve(files)
    }
  }))
}

export function isEqualOrWithinPath(file: string, folder: string) {
  const relative = path.relative(folder.toLowerCase(), file.toLowerCase())
  return relative === '' || (!!relative && !relative.startsWith('..') && !path.isAbsolute(relative))
}

export async function hasPackageJsonAsync(folder: string): Promise<boolean> {
  return await fileExists(path.join(folder, 'package.json'))
}

export async function hasCreateTriggerFileAsync(folder: string): Promise<boolean> {
  return await fileExists(path.join(folder, STARTER_TEMPLATE_CREATE_PROJECT_TRIGGER_FILE))
}

async function fileExists(p: string): Promise<boolean> {
  try {
    await fs.promises.access(p)
    return true
  }
  catch {
    return false
  }
}
