import * as fs from 'node:fs'
import * as path from 'node:path'
import { chdir, cwd } from 'node:process'
import type { QuickPickItem } from 'vscode'
import { QuickPickItemKind, Uri, commands, window } from 'vscode'
import degit from 'degit'
import execa from 'execa'
import type { Logger, ProjectTemplate, StarterCreateCommandArgs, StarterCreateTriggerData } from '../types'
import { fsPath, nextAvailableFilename } from '../shared/utils/fs'
import type { Context } from '../shared/vscode/workspace'
import type { PickableSetting } from '../shared/vscode/input'
import { showInputBoxWithSettings, showSimpleSettingsEditor } from '../shared/vscode/input'
import { config } from '../config'
import { getFolderToRunCommandIn, writeStarterTriggerFile } from '../shared/vscode/project'
import { BaseCommands } from './base'

export class StarterCommands extends BaseCommands {
  constructor(logger: Logger, context: Context) {
    super(logger, context)
    this.disposables.push(commands.registerCommand('_starterTemplates.create', this.starterCreate, this))
    this.disposables.push(commands.registerCommand('starterTemplates.createProject', this.createProject, this))
  }

  private async starterCreate({ projectPath, triggerData }: StarterCreateCommandArgs) {
    if (!projectPath) {
      projectPath = await getFolderToRunCommandIn(this.logger, `Select the folder to run command in`, undefined, true)
      if (!projectPath)
        return
    }
    if (!triggerData)
      return

    const { templateId, projectName } = triggerData
    switch (templateId) {
      case 'create-vue':
        chdir(projectPath)
        chdir('..')
        const dir = cwd()
        const args = ['--force']
        if (config.createVueNeedsTypeScript)
          args.push('--ts')

        if (config.createVueNeedsJsx)
          args.push('--jsx')

        if (config.createVueNeedsRouter)
          args.push('--router')

        if (config.createVueNeedsPinia)
          args.push('--pinia')

        if (config.createVueNeedsVitest)
          args.push('--vitest')

        if (config.createVueEndToEndTestingSolution !== 'No')
          args.push(`--${config.createVueEndToEndTestingSolution.toLocaleLowerCase()}`)
        else
          args.push(`--tests false`)

        if (config.createVueNeedsEslint) {
          if (config.createVueNeedsPrettier)
            args.push('--eslint-with-prettier')
          else
            args.push('--eslint')
        }
        await execa('npx', ['create-vue', projectName, dir, ...args])
        break
      case 'vitesse':
        await degit('antfu/vitesse').clone(`${projectPath}`)
        break
      case 'vitesse-lite':
        await degit('antfu/vitesse-lite').clone(`${projectPath}`)
        break
      case 'nuxt3-minimal-starter':
        await degit('nuxt/starter/#v3').clone(`${projectPath}`)
        break
      case 'vitesse-nuxt3':
        await degit('antfu/vitesse-nuxt3').clone(`${projectPath}`)
        break
      case 'vitesse-webext':
        await degit('antfu/vitesse-webext').clone(`${projectPath}`)
        break
      case 'starter-ts':
        await degit('antfu/starter-ts').clone(`${projectPath}`)
        break

      default:
        break
    }
    return 0
  }

  private async createProject() {
    const pickItems = this.getTemplates()
    const selectedTemplate = await window.showQuickPick(
      pickItems,
      {
        ignoreFocusOut: true,
        matchOnDescription: true,
        placeHolder: 'Which Starter template?',
      },
    )
    if (!selectedTemplate?.template)
      return
    return this.createProjectForTemplate(selectedTemplate.template)
  }

  private getTemplates(): Array<QuickPickItem & { template?: ProjectTemplate }> {
    const templates = [
      {
        kind: QuickPickItemKind.Separator,
        label: 'Vue',
      },
      {
        label: 'Create Vue(Official)',
        detail: '🛠️ The recommended way to start a Vite-powered Vue project',
        template: { id: 'create-vue', defaultProjectName: 'vue-project' },
      },
      {
        label: 'Vitesse(Anthony Fu)',
        detail: '🏕 Opinionated Vite + Vue Starter Template',
        template: { id: 'vitesse', defaultProjectName: 'vue-vitesse-project' },
      },
      {
        label: 'Vitesse Lite(Anthony Fu)',
        detail: '⛺️ Lightweight version of Vitesse',
        template: { id: 'vitesse-lite', defaultProjectName: 'vue-vitesse-lite-project' },
      },
      {
        kind: QuickPickItemKind.Separator,
        label: 'Nuxt',
      },
      {
        label: 'Nuxt3 Minimal Starter(Official)',
        detail: 'Create a new Nuxt project, module, layer or start from a theme with our collection of starters.',
        template: { id: 'nuxt3-minimal-starter', defaultProjectName: 'nuxt-project' },
      },
      {
        label: 'Vitesse Nuxt3(Anthony Fu)',
        detail: 'Vitesse for Nuxt 3 🏔💚⚡️',
        template: { id: 'vitesse-nuxt3', defaultProjectName: 'nuxt-vitesse-project' },
      },
      {
        kind: QuickPickItemKind.Separator,
        label: 'Web Extension',
      },
      {
        label: 'Vitesse WebExt(Anthony Fu)',
        detail: '⚡️ WebExtension Vite Starter Template',
        template: { id: 'vitesse-webext', defaultProjectName: 'webext-vitesse-project' },
      },
      {
        kind: QuickPickItemKind.Separator,
        label: 'TypeScript Library',
      },
      {
        label: 'Starter TS(Anthony Fu)',
        detail: 'Starter template for TypeScript library',
        template: { id: 'starter-ts', defaultProjectName: 'ts-library-project' },
      },
    ]
    return templates
  }

  async createProjectForTemplate(template: ProjectTemplate): Promise<Uri | undefined> {
    const folders = await window.showOpenDialog({
      canSelectFolders: true,
      defaultUri: this.context.lastUsedNewProjectPath ? Uri.file(this.context.lastUsedNewProjectPath) : undefined,
      openLabel: 'Select a folder to create the project in',
    })
    if (!folders || folders.length !== 1)
      return
    const folderPath = fsPath(folders[0])
    this.context.lastUsedNewProjectPath = folderPath

    const defaultName = nextAvailableFilename(folderPath, `${template.defaultProjectName}-`)
    const name = await this.promptForNameWithSettings(template, defaultName, folderPath)
    if (!name)
      return
    const projectFolderUri = Uri.file(path.join(folderPath, name))
    const projectFolderPath = fsPath(projectFolderUri)
    if (fs.existsSync(projectFolderPath)) {
      void window.showErrorMessage(`A folder named ${name} already exists in ${folderPath}`)
      return
    }
    fs.mkdirSync(projectFolderPath)

    const triggerData: StarterCreateTriggerData | undefined = template
      ? { templateId: template.id, projectName: name }
      : undefined
    writeStarterTriggerFile(projectFolderPath, triggerData)

    void commands.executeCommand('vscode.openFolder', projectFolderUri)

    return projectFolderUri
  }

  private async promptForNameWithSettings(template: ProjectTemplate, defaultName: string, folderPath: string): Promise<string | undefined> {
    while (true) {
      const response = await showInputBoxWithSettings(
        this.context,
        {
          ignoreFocusOut: true,
          placeholder: defaultName,
          prompt: 'Enter a name for your new project',
          title: 'Project Name',
          validation: s => this.validateProjectName(s, folderPath),
          value: defaultName,
          enableSetting: true,
        },
      )

      if (response === 'SETTINGS') {
        await showSimpleSettingsEditor(
          'Settings for new projects',
          'Select a setting to change (or \'Escape\' to cancel)',
          () => this.getCurrentCreateSettings(template),
        )
        continue
      }
      else if (response) {
        return response.value
      }
      else {
        return undefined
      }
    }
  }

  private validateProjectName(input: string, folderDir: string) {
    if (fs.existsSync(path.join(folderDir, input)))
      return `A project with this name already exists within the selected directory`
  }

  private getGlobalSettings(): PickableSetting[] {
    return [
      {
        kind: QuickPickItemKind.Separator,
        label: 'Global Settings',
      },
      {
        currentValue: config.globalNeedsGitInit ? 'Yes' : 'No',
        description: config.globalNeedsGitInit ? 'Yes' : 'No',
        detail: '',
        label: 'Initialize git repository?',
        setValue: (newValue: boolean) => config.setGlobalNeedsGitInit(newValue),
        settingKind: 'BOOL',
      },
      {
        currentValue: config.globalNeedsInstall ? 'Yes' : 'No',
        description: config.globalNeedsInstall ? 'Yes' : 'No',
        detail: '',
        label: 'Install project dependencies?',
        setValue: (newValue: boolean) => config.setGlobalNeedsInstall(newValue),
        settingKind: 'BOOL',
      },
      {
        currentValue: config.globalPackageManager || 'pnpm',
        description: config.globalPackageManager || 'pnpm',
        detail: '',
        enumValues: ['pnpm', 'npm', 'yarn', 'bun'],
        label: 'Package manager choice?',
        setValue: (newValue: 'pnpm' | 'npm' | 'yarn' | 'bun') => config.setGlobalPackageManager(newValue),
        settingKind: 'ENUM',
      },
    ]
  }

  private getCurrentCreateSettings(template: ProjectTemplate): PickableSetting[] {
    switch (template.id) {
      case 'create-vue':
        const createVueSettings: PickableSetting[] = [
          {
            kind: QuickPickItemKind.Separator,
            label: 'Create Vue',
          },
          {
            currentValue: config.createVueNeedsTypeScript ? 'Yes' : 'No',
            description: config.createVueNeedsTypeScript ? 'Yes' : 'No',
            detail: '',
            label: 'Add TypeScript?',
            setValue: (newValue: boolean) => config.setCreateVueNeedsTypeScript(newValue),
            settingKind: 'BOOL',
          },
          {
            currentValue: config.createVueNeedsJsx ? 'Yes' : 'No',
            description: config.createVueNeedsJsx ? 'Yes' : 'No',
            detail: '',
            label: 'Add JSX Support?',
            setValue: (newValue: boolean) => config.setCreateVueNeedsJsx(newValue),
            settingKind: 'BOOL',
          },
          {
            currentValue: config.createVueNeedsRouter ? 'Yes' : 'No',
            description: config.createVueNeedsRouter ? 'Yes' : 'No',
            detail: '',
            label: 'Add Vue Router for Single Page Application development?',
            setValue: (newValue: boolean) => config.setCreateVueNeedsRouter(newValue),
            settingKind: 'BOOL',
          },
          {
            currentValue: config.createVueNeedsPinia ? 'Yes' : 'No',
            description: config.createVueNeedsPinia ? 'Yes' : 'No',
            detail: '',
            label: 'Add Pinia for state management?',
            setValue: (newValue: boolean) => config.setCreateVueNeedsPinia(newValue),
            settingKind: 'BOOL',
          },
          {
            currentValue: config.createVueNeedsVitest ? 'Yes' : 'No',
            description: config.createVueNeedsVitest ? 'Yes' : 'No',
            detail: '',
            label: 'Add Vitest for Unit Testing?',
            setValue: (newValue: boolean) => config.setCreateVueNeedsVitest(newValue),
            settingKind: 'BOOL',
          },
          {
            currentValue: config.createVueEndToEndTestingSolution || 'Cypress',
            description: config.createVueEndToEndTestingSolution || 'Cypress',
            detail: '',
            enumValues: ['Cypress', 'Nightwatch', 'Playwright', 'No'],
            label: 'Add an End-to-End Testing Solution?',
            setValue: (newValue: 'Cypress' | 'Nightwatch' | 'Playwright' | 'No') => config.setCreateVueEndToEndTestingSolution(newValue),
            settingKind: 'ENUM',
          },
          {
            currentValue: config.createVueNeedsEslint ? 'Yes' : 'No',
            description: config.createVueNeedsEslint ? 'Yes' : 'No',
            detail: '',
            label: 'Add ESLint for code quality?',
            setValue: (newValue: boolean) => config.setCreateVueNeedsEslint(newValue),
            settingKind: 'BOOL',
          },
        ]

        if (config.createVueNeedsEslint) {
          createVueSettings.push(
            {
              currentValue: config.createVueNeedsPrettier ? 'Yes' : 'No',
              description: config.createVueNeedsPrettier ? 'Yes' : 'No',
              detail: '',
              label: 'Add Prettier for code formatting?',
              setValue: (newValue: boolean) => config.setCreateVueNeedsPrettier(newValue),
              settingKind: 'BOOL',
            },
          )
        }
        return [...createVueSettings, ...this.getGlobalSettings()]
      default:
        return [...this.getGlobalSettings()]
    }
  }
}

export const commandState = {
  numProjectCreationsInProgress: 0,
}

export function markProjectCreationStarted(): void {
  commandState.numProjectCreationsInProgress++
}
export function markProjectCreationEnded(): void {
  commandState.numProjectCreationsInProgress--
}
