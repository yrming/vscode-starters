import * as fs from 'node:fs'
import * as path from 'node:path'
import { chdir, cwd } from 'node:process'
import fsExtra from 'fs-extra'
import type { InputBoxValidationMessage, QuickPickItem } from 'vscode'
import { ProgressLocation, QuickPickItemKind, Uri, commands, window } from 'vscode'
import { create } from 'create-svelte'
import degit from 'degit'
import { $ } from 'execa'
import fg from 'fast-glob'
import { installDependencies } from 'nypm'
import { transformSync } from '@babel/core'
import pluginSyntaxJSX from '@babel/plugin-syntax-jsx'
import presetTypescript from '@babel/preset-typescript'
import prettierBabel from 'prettier/plugins/babel'
import * as prettier from 'prettier/standalone'
import * as prettierPluginEstree from 'prettier/plugins/estree'
import type { Logger, ProjectTemplate, StarterCreateCommandArgs, StarterCreateTriggerData } from '../types'
import { fsPath, nextAvailableFilename } from '../shared/utils/fs'
import type { Context } from '../shared/vscode/workspace'
import type { PickableSetting } from '../shared/vscode/input'
import { showInputBoxWithSettings, showSimpleSettingsEditor } from '../shared/vscode/input'
import { config } from '../config'
import { getFolderToRunCommandIn, writeStarterTriggerFile } from '../shared/vscode/project'
import { gitIgnoreForCreateSolid } from '../shared/constants'
import { compile } from '../shared/utils/gitignore'
import { BaseCommands } from './base'

export class StarterCommands extends BaseCommands {
  constructor(logger: Logger, context: Context) {
    super(logger, context)
    this.disposables.push(commands.registerCommand('_starters.create', this.starterCreate, this))
    this.disposables.push(commands.registerCommand('starters.createProject', this.createProject, this))
  }

  private async starterCreate({ projectPath, triggerData }: StarterCreateCommandArgs) {
    if (!projectPath) {
      projectPath = await getFolderToRunCommandIn(this.logger, `Select the folder to run command in`, undefined, true)
      if (!projectPath)
        return
    }
    if (!triggerData)
      return

    const code = await window.withProgress({
      location: ProgressLocation.Notification,
    }, async (progress) => {
      progress.report({
        message: 'Creating project...',
      })

      const { templateId, projectName } = triggerData
      chdir(projectPath!)
      chdir('..')
      const dir = cwd()
      try {
        switch (templateId) {
          case 'nuxt3-minimal-starter':
            await degit('nuxt/starter/#v3').clone(`${projectPath}`)
            break
          case 'vitesse-nuxt3':
            await degit('antfu/vitesse-nuxt3').clone(`${projectPath}`)
            break
          case 'create-vue':
            await this.handleCreateVue(projectName, dir)
            break
          case 'vitesse':
            await degit('antfu/vitesse').clone(`${projectPath}`)
            break
          case 'vitesse-lite':
            await degit('antfu/vitesse-lite').clone(`${projectPath}`)
            break
          case 'create-next-app':
            await this.handleCreateNextApp(projectName)
            break
          case 'create-svelte':
            await this.handleCreateSvelte(projectName, projectPath!)
            break
          case 'create-solid':
            await this.handleCreateSolid(projectName, projectPath!, dir)
            break
          case 'starter-ts':
            await degit('antfu/starter-ts').clone(`${projectPath}`)
            break
          case 'starter-vscode':
            await degit('antfu/starter-vscode').clone(`${projectPath}`)
            break
          case 'vitesse-webext':
            await degit('antfu/vitesse-webext').clone(`${projectPath}`)
            break

          default:
            break
        }

        if (templateId !== 'create-next-app')
          await this.handleCommonActions(projectPath!)

        return 0
      }
      catch (error) {
        console.log(error)
        window.showErrorMessage('Failed to create prpject!')
        return -1
      }
    })

    return code
  }

  private async handleCommonActions(projectPath: string) {
    if (config.globalNeedsGitInit)
      await $`git init ${projectPath!}`

    if (config.globalNeedsInstall) {
      await window.withProgress({
        location: ProgressLocation.Notification,
      }, async (progress) => {
        progress.report({
          message: 'Installing dependencies...',
        })
        try {
          await installDependencies({
            cwd: projectPath,
            silent: true,
            packageManager: {
              name: config.globalPackageManager,
              command: config.globalPackageManager,
            },
          })
        }
        catch (error) {
          window.showWarningMessage('Failed to install dependencies!')
        }
      })
    }
  }

  private async handleCreateSolid(projectName: string, projectPath: string, dir: string) {
    const templateName = config.createSolidWhichTemplate
    await degit(`solidjs/solid-start/examples/${templateName}`, {
      force: true,
    }).clone(`${projectPath}`)

    const gitignore = compile(gitIgnoreForCreateSolid)
    const files = fg.sync('**/*', { cwd: projectPath }).filter(gitignore.accepts)
    files.forEach(async (file) => {
      const src = `${projectPath}/${file}`
      if (src.endsWith('tsconfig.json') && !config.createSolidNeedsTypeScript) {
        fsExtra.removeSync(src)
        return fsExtra.writeFileSync(
          `${projectPath}/jsconfig.json`,
          JSON.stringify(
            {
              compilerOptions: {
                jsx: 'preserve',
                jsxImportSource: 'solid-js',
                paths: {
                  '~/*': ['./src/*'],
                },
              },
            },
            null,
            2,
          ),
        )
      }

      let code = fsExtra.readFileSync(src).toString()
      if (src.includes('vite.config') && !code.includes('ssr: false') && !config.createSolidNeedsSsr) {
        code = code
          .replace(`start: {`, `start: { ssr: false, `)
          .replace(`defineConfig({})`, `defineConfig({ start: { ssr: false } })`)
      }
      if (src.endsWith('.ts') || src.endsWith('.tsx')) {
        if (!config.createSolidNeedsTypeScript) {
          const compiledCode = transformSync(code, {
            filename: src,
            presets: [presetTypescript],
            plugins: [pluginSyntaxJSX],
          })?.code

          const formatCode = prettier.format(compiledCode ?? '', {
            parser: 'babel',
            plugins: [prettierBabel, prettierPluginEstree],
          })
          fsExtra.removeSync(src)
          fsExtra.writeFileSync(src.replace('.ts', '.js'), await formatCode)
        }
        else {
          fsExtra.removeSync(src)
          fsExtra.writeFileSync(
            src,
            await prettier.format(code, { parser: 'babel-ts', plugins: [prettierBabel, prettierPluginEstree] }),
          )
        }
      }
    })
    fsExtra.writeFileSync(`${projectPath}/.gitignore`, gitIgnoreForCreateSolid)

    const pkgFile = path.join(projectPath, 'package.json')
    const pkgJson = JSON.parse(
      fs
        .readFileSync(pkgFile, 'utf-8')
        .replace(/"name": ".+"/, _m => `"name": "${projectName}"`)
        .replace(/"(.+)": "workspace:.+"/g, (_m, projectName) => `"${projectName}": "next"`),
    ) // TODO ^${versions[name]}

    if (!config.createSolidNeedsTypeScript && pkgJson.devDependencies) {
      delete pkgJson.devDependencies['@types/node']
      delete pkgJson.devDependencies.typescript
    }

    fsExtra.writeFileSync(pkgFile, JSON.stringify(pkgJson, null, 2))
  }

  private async handleCreateSvelte(projectName: string, projectPath: string) {
    await create(projectPath, {
      name: projectName,
      template: config.createSvelteWhichAppTemplate,
      types: config.createSvelteAddTypeCheckingWith === 'no' ? null : config.createSvelteAddTypeCheckingWith,
      eslint: config.createSvelteNeedsEslint,
      prettier: config.createSvelteNeedsPrettier,
      playwright: config.createSvelteNeedsPlaywright,
      vitest: config.createSvelteNeedsVitest,
      svelte5: config.createSvelteTrySvelte5Preview,
    })
  }

  private async handleCreateNextApp(projectName: string) {
    const args = []
    if (config.createNextAppNeedsTypeScript)
      args.push('--ts')
    else
      args.push('--js')

    if (config.createNextAppNeedsEslint)
      args.push('--eslint')
    else
      args.push('--no-eslint')

    if (config.createNextAppNeedsTailwind)
      args.push('--tailwind')
    else
      args.push('--no-tailwind')

    if (config.createNextAppNeedsSrcDirectory)
      args.push('--src-dir')
    else
      args.push('--no-src-dir')

    if (config.createNextAppNeedsAppRouter)
      args.push('--app')
    else
      args.push('--no-app')

    if (config.createNextAppCustomizeTheDefaultImportAlias) {
      args.push('--import-alias')
      args.push(config.createNextAppCustomizeTheDefaultImportAlias)
    }
    if (config.globalPackageManager)
      args.push(`--use - ${config.globalPackageManager}`)

    await $`npx create - next - app@latest ${projectName} ${args}`
  }

  private async handleCreateVue(projectName: string, dir: string) {
    const args = []
    args.push('--force')
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
    await $`npx create - vue@latest ${projectName} ${dir} ${args}`
  }

  private async createProject() {
    const pickItems = this.getTemplates()
    const selectedTemplate = await window.showQuickPick(
      pickItems,
      {
        ignoreFocusOut: true,
        matchOnDescription: true,
        placeHolder: 'Which starter template?',
      },
    )
    if (!selectedTemplate?.template)
      return
    return this.createProjectForTemplate(selectedTemplate.template)
  }

  private getTemplates(): Array<QuickPickItem & { template?: ProjectTemplate }> {
    const templates: Array<QuickPickItem & { template?: ProjectTemplate }> = [
      {
        kind: QuickPickItemKind.Separator,
        label: 'Nuxt',
      },
      {
        label: 'Nuxt3 Minimal Starter(Official)',
        iconPath: {
          dark: Uri.file(this.context.asAbsolutePath('resources/nuxt.svg')),
          light: Uri.file(this.context.asAbsolutePath('resources/nuxt.svg')),
        },
        detail: 'Create a new Nuxt project',
        template: { id: 'nuxt3-minimal-starter', defaultProjectName: 'nuxt-project' },
      },
      {
        label: 'Vitesse Nuxt3(Anthony Fu)',
        iconPath: {
          dark: Uri.file(this.context.asAbsolutePath('resources/nuxt.svg')),
          light: Uri.file(this.context.asAbsolutePath('resources/nuxt.svg')),
        },
        detail: 'Vitesse for Nuxt 3',
        template: { id: 'vitesse-nuxt3', defaultProjectName: 'nuxt-vitesse-project' },
      },
      {
        kind: QuickPickItemKind.Separator,
        label: 'Vue',
      },
      {
        label: 'Create Vue(Official)',
        iconPath: {
          dark: Uri.file(this.context.asAbsolutePath('resources/vue.svg')),
          light: Uri.file(this.context.asAbsolutePath('resources/vue.svg')),
        },
        detail: 'The recommended way to start a Vite-powered Vue project',
        template: { id: 'create-vue', defaultProjectName: 'vue-project' },
      },
      {
        label: 'Vitesse(Anthony Fu)',
        iconPath: {
          dark: Uri.file(this.context.asAbsolutePath('resources/vue.svg')),
          light: Uri.file(this.context.asAbsolutePath('resources/vue.svg')),
        },
        detail: 'Opinionated Vite + Vue Starter Template',
        template: { id: 'vitesse', defaultProjectName: 'vue-vitesse-project' },
      },
      {
        label: 'Vitesse Lite(Anthony Fu)',
        iconPath: {
          dark: Uri.file(this.context.asAbsolutePath('resources/vue.svg')),
          light: Uri.file(this.context.asAbsolutePath('resources/vue.svg')),
        },
        detail: 'Lightweight version of Vitesse',
        template: { id: 'vitesse-lite', defaultProjectName: 'vue-vitesse-lite-project' },
      },
      {
        kind: QuickPickItemKind.Separator,
        label: 'Next',
      },
      {
        label: 'Create Next App(Official)',
        iconPath: {
          dark: Uri.file(this.context.asAbsolutePath('resources/next.svg')),
          light: Uri.file(this.context.asAbsolutePath('resources/next.svg')),
        },
        detail: 'The easiest way to get started with Next.js',
        template: { id: 'create-next-app', defaultProjectName: 'next-project' },
      },
      {
        kind: QuickPickItemKind.Separator,
        label: 'Svelte',
      },
      {
        label: 'Create Svelte(Official)',
        iconPath: {
          dark: Uri.file(this.context.asAbsolutePath('resources/svelte.svg')),
          light: Uri.file(this.context.asAbsolutePath('resources/svelte.svg')),
        },
        detail: 'Create new SvelteKit projects',
        template: { id: 'create-svelte', defaultProjectName: 'svelte-project' },
      },
      {
        kind: QuickPickItemKind.Separator,
        label: 'Solid',
      },
      {
        label: 'Create Solid(Official Beta)',
        iconPath: {
          dark: Uri.file(this.context.asAbsolutePath('resources/solid.svg')),
          light: Uri.file(this.context.asAbsolutePath('resources/solid.svg')),
        },
        detail: 'SolidStart, the Solid app framework',
        template: { id: 'create-solid', defaultProjectName: 'solid-project' },
      },
      {
        kind: QuickPickItemKind.Separator,
        label: 'TypeScript Library',
      },
      {
        label: 'Starter TS(Anthony Fu)',
        iconPath: {
          dark: Uri.file(this.context.asAbsolutePath('resources/ts.svg')),
          light: Uri.file(this.context.asAbsolutePath('resources/ts.svg')),
        },
        detail: 'Starter template for TypeScript library',
        template: { id: 'starter-ts', defaultProjectName: 'ts-library-project' },
      },
      {
        kind: QuickPickItemKind.Separator,
        label: 'VSCode Extension',
      },
      {
        label: 'Starter VSCode(Anthony Fu)',
        iconPath: {
          dark: Uri.file(this.context.asAbsolutePath('resources/vscode.svg')),
          light: Uri.file(this.context.asAbsolutePath('resources/vscode.svg')),
        },
        detail: 'Starter template for VS Code Extension',
        template: { id: 'starter-vscode', defaultProjectName: 'vscode-extension-project' },
      },
      {
        kind: QuickPickItemKind.Separator,
        label: 'Web Extension',
      },
      {
        label: 'Vitesse WebExt(Anthony Fu)',
        iconPath: {
          dark: Uri.file(this.context.asAbsolutePath('resources/web-ext.svg')),
          light: Uri.file(this.context.asAbsolutePath('resources/web-ext.svg')),
        },
        detail: 'WebExtension Vite Starter Template',
        template: { id: 'vitesse-webext', defaultProjectName: 'webext-vitesse-project' },
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

    const defaultName = nextAvailableFilename(folderPath, `${template.defaultProjectName} - `)
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

  private getCurrentCreateSettings(template: ProjectTemplate): PickableSetting[] {
    switch (template.id) {
      case 'create-vue':
        return [...this.getCurrentCreateSettingsOfCreateVue(), ...this.getGlobalSettings()]
      case 'create-next-app':
        return this.getCurrentCreateSettingsOfCreateNextApp()
      case 'create-svelte':
        return [...this.getCurrentCreateSettingsOfCreateSvelte(), ...this.getGlobalSettings()]
      case 'create-solid':
        return [...this.getCurrentCreateSettingsOfCreateSolid(), ...this.getGlobalSettings()]

      default:
        return this.getGlobalSettings()
    }
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

  private getCurrentCreateSettingsOfCreateVue() {
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
    return createVueSettings
  }

  private getCurrentCreateSettingsOfCreateNextApp() {
    const createNextAppSettings: PickableSetting[] = [
      {
        kind: QuickPickItemKind.Separator,
        label: 'Create Next App',
      },
      {
        currentValue: config.createNextAppNeedsTypeScript ? 'Yes' : 'No',
        description: config.createNextAppNeedsTypeScript ? 'Yes' : 'No',
        detail: '',
        label: 'Would you like to use TypeScript?',
        setValue: (newValue: boolean) => config.setCreateNextAppNeedsTypeScript(newValue),
        settingKind: 'BOOL',
      },
      {
        currentValue: config.createNextAppNeedsEslint ? 'Yes' : 'No',
        description: config.createNextAppNeedsEslint ? 'Yes' : 'No',
        detail: '',
        label: 'Would you like to use ESLint?',
        setValue: (newValue: boolean) => config.setCreateNextAppNeedsEslint(newValue),
        settingKind: 'BOOL',
      },
      {
        currentValue: config.createNextAppNeedsTailwind ? 'Yes' : 'No',
        description: config.createNextAppNeedsTailwind ? 'Yes' : 'No',
        detail: '',
        label: 'Would you like to use Tailwind CSS?',
        setValue: (newValue: boolean) => config.setCreateNextAppNeedsTailwind(newValue),
        settingKind: 'BOOL',
      },
      {
        currentValue: config.createNextAppNeedsSrcDirectory ? 'Yes' : 'No',
        description: config.createNextAppNeedsSrcDirectory ? 'Yes' : 'No',
        detail: '',
        label: 'Would you like to use `src / ` directory?',
        setValue: (newValue: boolean) => config.setCreateNextAppNeedsSrcDirectory(newValue),
        settingKind: 'BOOL',
      },
      {
        currentValue: config.createNextAppNeedsAppRouter ? 'Yes' : 'No',
        description: config.createNextAppNeedsAppRouter ? 'Yes' : 'No',
        detail: '',
        label: 'Would you like to use App Router? (recommended)',
        setValue: (newValue: boolean) => config.setCreateNextAppNeedsAppRouter(newValue),
        settingKind: 'BOOL',
      },
      {
        currentValue: config.createNextAppCustomizeTheDefaultImportAlias || '@/*',
        description: config.createNextAppCustomizeTheDefaultImportAlias || '@/*',
        detail: 'Import alias must follow the pattern <prefix>/*',
        label: 'What import alias would you like configured?',
        setValue: (newValue: string) => config.setCreateNextAppCustomizeTheDefaultImportAlias(newValue),
        settingKind: 'STRING',
        validation: s => this.validateCreateNextAppImportAlias(s),
      },
    ]
    return createNextAppSettings
  }

  private getCurrentCreateSettingsOfCreateSvelte() {
    const createSvelteSettings: PickableSetting[] = [
      {
        kind: QuickPickItemKind.Separator,
        label: 'Create Svelte',
      },
      {
        currentValue: config.createSvelteWhichAppTemplate || 'default',
        description: config.createSvelteWhichAppTemplate || 'default',
        detail: '',
        enumValues: ['default', 'skeleton', 'skeletonlib'],
        label: 'Which Svelte app template?',
        setValue: (newValue: 'default' | 'skeleton' | 'skeletonlib') => config.setCreateSvelteWhichAppTemplate(newValue),
        settingKind: 'ENUM',
      },
      {
        currentValue: config.createSvelteAddTypeCheckingWith || 'typescript',
        description: config.createSvelteAddTypeCheckingWith || 'typescript',
        detail: '',
        enumValues: ['checkjs', 'typescript', 'no'],
        label: 'Add type checking with TypeScript?',
        setValue: (newValue: 'checkjs' | 'typescript' | 'no') => config.setCreateSvelteAddTypeCheckingWith(newValue),
        settingKind: 'ENUM',
      },
      {
        currentValue: config.createSvelteNeedsEslint ? 'Yes' : 'No',
        description: config.createSvelteNeedsEslint ? 'Yes' : 'No',
        detail: '',
        label: 'Add ESLint for code linting?',
        setValue: (newValue: boolean) => config.setCreateSvelteNeedsEslint(newValue),
        settingKind: 'BOOL',
      },
      {
        currentValue: config.createSvelteNeedsPrettier ? 'Yes' : 'No',
        description: config.createSvelteNeedsPrettier ? 'Yes' : 'No',
        detail: '',
        label: 'Add Prettier for code formatting?',
        setValue: (newValue: boolean) => config.setCreateSvelteNeedsPrettier(newValue),
        settingKind: 'BOOL',
      },
      {
        currentValue: config.createSvelteNeedsPlaywright ? 'Yes' : 'No',
        description: config.createSvelteNeedsPlaywright ? 'Yes' : 'No',
        detail: '',
        label: 'Add Playwright for browser testing?',
        setValue: (newValue: boolean) => config.setCreateSvelteNeedsPlaywright(newValue),
        settingKind: 'BOOL',
      },
      {
        currentValue: config.createSvelteNeedsVitest ? 'Yes' : 'No',
        description: config.createSvelteNeedsVitest ? 'Yes' : 'No',
        detail: '',
        label: 'Add Vitest for unit testing?',
        setValue: (newValue: boolean) => config.setCreateSvelteNeedsVitest(newValue),
        settingKind: 'BOOL',
      },
      {
        currentValue: config.createSvelteTrySvelte5Preview ? 'Yes' : 'No',
        description: config.createSvelteTrySvelte5Preview ? 'Yes' : 'No',
        detail: '',
        label: 'Try the Svelte 5 preview (unstable!)?',
        setValue: (newValue: boolean) => config.setCreateSvelteTrySvelte5Preview(newValue),
        settingKind: 'BOOL',
      },
    ]
    return createSvelteSettings
  }

  private getCurrentCreateSettingsOfCreateSolid() {
    const createSolidSettings: PickableSetting[] = [
      {
        kind: QuickPickItemKind.Separator,
        label: 'Create Solid',
      },
      {
        currentValue: config.createSolidWhichTemplate || 'bare',
        description: config.createSolidWhichTemplate || 'bare',
        detail: '',
        enumValues: [
          'bare',
          'basic',
          'experiments',
          'hackernews',
          'todomvc',
          'with-auth',
          'with-mdx',
          'with-prisma',
          'with-solid-styled',
          'with-tailwindcss',
          'with-trpc',
        ],
        label: 'Which Svelte app template?',
        setValue: (newValue: 'bare' | 'basic' | 'experiments' | 'hackernews' | 'todomvc' | 'with-auth' | 'with-mdx' | 'with-prisma' | 'with-solid-styled' | 'with-tailwindcss' | 'with-trpc') => config.setCreateSolidWhichTemplate(newValue),
        settingKind: 'ENUM',
      },
      {
        currentValue: config.createSolidNeedsSsr ? 'Yes' : 'No',
        description: config.createSolidNeedsSsr ? 'Yes' : 'No',
        detail: '',
        label: 'Server Side Rendering?',
        setValue: (newValue: boolean) => config.setCreateSolidNeedsSsr(newValue),
        settingKind: 'BOOL',
      },
      {
        currentValue: config.createSolidNeedsTypeScript ? 'Yes' : 'No',
        description: config.createSolidNeedsTypeScript ? 'Yes' : 'No',
        detail: '',
        label: 'Use TypeScript?',
        setValue: (newValue: boolean) => config.setCreateSolidNeedsTypeScript(newValue),
        settingKind: 'BOOL',
      },
    ]
    return createSolidSettings
  }

  private validateCreateNextAppImportAlias(input: string): string | InputBoxValidationMessage | undefined | null |
    Thenable<string | InputBoxValidationMessage | undefined | null> {
    if (!/^.+\/\*$/.test(input))
      return 'Import alias must follow the pattern <prefix>/*'
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
