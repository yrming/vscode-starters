import type * as vscode from 'vscode'
import { StarterCommands } from './commands/starter'
import { Context } from './shared/vscode/workspace'
import { EmittingLogger } from './shared/utils/logging'
import { handleNewProjects } from './create'

const logger = new EmittingLogger()

export async function activate(context: vscode.ExtensionContext, isRestart = false) {
  const extContext = Context.for(context)
  const starterCommands = new StarterCommands(logger, extContext)
  context.subscriptions.push(starterCommands)

  if (!isRestart)
    await handleNewProjects(logger, extContext)
}

export function deactivate() { }
