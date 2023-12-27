import * as fs from "fs";
import path from "path";
import { CancellationTokenSource, ProgressLocation, QuickPickItem, Uri, WorkspaceFolder, window, workspace } from "vscode";
import { findProjectFolders, fsPath, getExcludedFolders, homeRelativePath } from "../utils/fs";
import { PromiseCompleter, flatMap, isWithinWorkspace, notUndefined } from "../utils/common";
import { getActiveRealFileEditor } from "./editor";
import { Logger, ProjectFolderSearchResults, StarterCreateTriggerData } from "../../types";
import { config } from "../../config";
import { SimpleTimeBasedCache } from "../utils/cache";
import { STARTER_TEMPLATE_CREATE_PROJECT_TRIGGER_FILE, projectSearchCacheTimeInMs, projectSearchProgressNotificationDelayInMs, projectSearchProgressText } from "../constants";

const projectFolderCache = new SimpleTimeBasedCache<ProjectFolderSearchResults>();
let inProgressProjectFolderSearch: Promise<void> | undefined;

export async function getFolderToRunCommandIn(logger: Logger, placeHolder: string, selection?: Uri, webOnly = false): Promise<string | undefined> {
  // Attempt to find a project based on the supplied folder of active file.
  let file = selection && fsPath(selection);
  if (!file) {
    const editor = getActiveRealFileEditor();
    if (editor)
      file = fsPath(editor.document.uri);
  }
  const folder = file && locateBestProjectRoot(file);

  if (folder)
    return folder;

  // Otherwise look for what projects we have.
  const selectableFolders = (await getAllProjectFolders(logger, getExcludedFolders, { requirePackageJson: true, sort: true, searchDepth: config.projectSearchDepth }))
    .filter(() => true);

  if (!selectableFolders || !selectableFolders.length) {
    void window.showWarningMessage(`No project roots were found. Do you have a package.json file?`);
    return undefined;
  }

  return showFolderPicker(selectableFolders, placeHolder); // TODO: What if the user didn't pick anything?
}

async function showFolderPicker(folders: string[], placeHolder: string): Promise<string | undefined> {
  // No point asking the user if there's only one.
  if (folders.length === 1) {
    return folders[0];
  }

  const items = folders.map((f) => {
    const workspaceFolder = workspace.getWorkspaceFolder(Uri.file(f));
    if (!workspaceFolder)
      return undefined;

    const workspacePathParent = path.dirname(fsPath(workspaceFolder.uri));
    return {
      description: homeRelativePath(workspacePathParent),
      label: path.relative(workspacePathParent, f),
      path: f,
    } as QuickPickItem & { path: string };
  }).filter(notUndefined);

  const selectedFolder = await window.showQuickPick(items, { placeHolder });
  return selectedFolder && selectedFolder.path;
}

export function locateBestProjectRoot(folder: string, allowOutsideWorkspace = false): string | undefined {
  if (!folder)
    return undefined;

  if (!allowOutsideWorkspace && (!isWithinWorkspace(folder) && workspace.workspaceFolders?.length)) {
    return undefined;
  }

  let dir = folder;
  while (dir !== path.dirname(dir)) {
    // if (hasPubspec(dir) || hasPackageMapFile(dir))
    //   return dir;
    dir = path.dirname(dir);
  }

  return undefined;
}

export async function getAllProjectFolders(
  logger: Logger,
  getExcludedFolders: ((f: WorkspaceFolder | undefined) => string[]) | undefined,
  options: { sort?: boolean; requirePackageJson?: boolean, searchDepth: number, workspaceFolders?: WorkspaceFolder[], onlyWorkspaceRoots?: boolean },
) {
  const results = await getAllProjectFoldersAndExclusions(logger, getExcludedFolders, options);
  return results.projectFolders;
}


export async function getAllProjectFoldersAndExclusions(
  logger: Logger,
  getExcludedFolders: ((f: WorkspaceFolder | undefined) => string[]) | undefined,
  options: { sort?: boolean; requirePackageJson?: boolean, searchDepth: number, workspaceFolders?: WorkspaceFolder[], onlyWorkspaceRoots?: boolean },
): Promise<ProjectFolderSearchResults> {
  const workspaceFolders = options.workspaceFolders ?? getWorkspaceFolders();

  // If an existing search is in progress, wait because it might populate the cache with the results
  // we want.
  if (inProgressProjectFolderSearch) {
    await inProgressProjectFolderSearch;
  }

  const cacheKey = `folders-${workspaceFolders.map((f: any) => f.uri.toString()).join(path.sep)}-${options.onlyWorkspaceRoots ? "true" : "false"}`;
  const cachedFolders = projectFolderCache.get(cacheKey);
  if (cachedFolders) {
    logger.info(`Returning cached results for project search`);
    return cachedFolders;
  }

  // Track this search so other searches can wait on it.
  const completer = new PromiseCompleter<void>();
  inProgressProjectFolderSearch = completer.promise;
  try {
    let startTimeMs = new Date().getTime();
    const tokenSource = new CancellationTokenSource();
    let isComplete = false;

    const topLevelFolders = workspaceFolders.map((w: any) => fsPath(w.uri));
    let allExcludedFolders = getExcludedFolders ? flatMap(workspaceFolders, getExcludedFolders) : [];
    const resultsPromise = findProjectFolders(logger, topLevelFolders, allExcludedFolders, options, tokenSource.token);

    // After some time, if we still have not completed, show a progress notification that can be cancelled
    // to stop the search, which automatically hides when `resultsPromise` resolves.
    setTimeout(() => {
      if (!isComplete) {
        void window.withProgress({
          cancellable: true,
          location: ProgressLocation.Notification,
          title: projectSearchProgressText,
        }, (progress, token) => {
          token.onCancellationRequested(() => {
            tokenSource.cancel();
            logger.info(`Project search was cancelled after ${new Date().getTime() - startTimeMs}ms (was searching ${options.searchDepth} levels)`);
          });
          return resultsPromise;
        });
      }
    }, projectSearchProgressNotificationDelayInMs);

    let projectFolders = await resultsPromise;
    isComplete = true;
    logger.info(`Took ${new Date().getTime() - startTimeMs}ms to search for projects (${options.searchDepth} levels)`);
    startTimeMs = new Date().getTime();

    const result = { projectFolders, excludedFolders: new Set(allExcludedFolders) };

    // Cache the results.
    projectFolderCache.add(cacheKey, result, projectSearchCacheTimeInMs);

    return result;
  } finally {
    // Clear the promise if it's still ours.
    completer.resolve();
    if (inProgressProjectFolderSearch === completer.promise)
      inProgressProjectFolderSearch = undefined;
  }
}

export function getWorkspaceFolders(folder?: WorkspaceFolder) {
  if (!workspace.workspaceFolders)
    return [];
  const flag = (!folder || folder.uri.scheme !== "file") ? false : true
  return workspace.workspaceFolders.filter(isWorkspaceFolder);
}

export function isWorkspaceFolder(folder?: WorkspaceFolder): boolean {
  if (!folder || folder.uri.scheme !== "file")
    return false;

  return true;
}

export function writeStarterTriggerFile(folderPath: string, triggerData: StarterCreateTriggerData | undefined) {
  const jsonString = triggerData ? JSON.stringify(triggerData) : "";

  fs.writeFileSync(path.join(folderPath, STARTER_TEMPLATE_CREATE_PROJECT_TRIGGER_FILE), jsonString);
}
