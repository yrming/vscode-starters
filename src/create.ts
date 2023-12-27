import * as fs from 'node:fs'
import * as path from 'node:path'
import type { WorkspaceFolder } from 'vscode'
import { commands, window } from 'vscode'
import type { Context } from './shared/vscode/workspace'
import type { Logger, StarterCreateCommandArgs, StarterCreateTriggerData } from './types'
import { getWorkspaceFolders } from './shared/vscode/project'
import { STARTER_TEMPLATE_CREATE_PROJECT_TRIGGER_FILE } from './shared/constants'
import { fsPath } from './shared/utils/fs'
import { markProjectCreationEnded, markProjectCreationStarted } from './commands/starter'

export async function handleNewProjects(logger: Logger, context: Context): Promise<void> {
  await Promise.all(getWorkspaceFolders().map(async (wf) => {
    try {
      await handleStarterCreateTrigger(wf)
    }
    catch (e) {
      logger.error('Failed to create project')
      void window.showErrorMessage('Failed to create project')
    }
  }))
}

async function handleStarterCreateTrigger(wf: WorkspaceFolder): Promise<void> {
  const starterTriggerFile = path.join(fsPath(wf.uri), STARTER_TEMPLATE_CREATE_PROJECT_TRIGGER_FILE)
  if (!fs.existsSync(starterTriggerFile))
    return

  const jsonString = fs.readFileSync(starterTriggerFile).toString().trim()
  const json = JSON.parse(jsonString) as StarterCreateTriggerData

  fs.unlinkSync(starterTriggerFile)

  try {
    markProjectCreationStarted()
    const success = await createStarterProject(fsPath(wf.uri), json)
    if (success)
      handleStarterWelcome(wf, json)
  }
  finally {
    markProjectCreationEnded()
  }
}

async function createStarterProject(projectPath: string, triggerData: StarterCreateTriggerData): Promise<boolean> {
  const args = { projectPath, triggerData } as StarterCreateCommandArgs
  const code = await commands.executeCommand<number>('_starterTemplates.create', args)
  return code === 0
}

function handleStarterWelcome(workspaceFolder: WorkspaceFolder, triggerData: StarterCreateTriggerData) {
  void window.showInformationMessage('Your project is ready !')
}
