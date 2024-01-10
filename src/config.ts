import type { Uri, WorkspaceConfiguration } from 'vscode'
import { ConfigurationTarget, workspace } from 'vscode'
import type { NullAsUndefined } from './shared/utils/common'
import { nullToUndefined } from './shared/utils/common'

class Config {
  private config: WorkspaceConfiguration

  constructor() {
    workspace.onDidChangeConfiguration(e => this.reloadConfig())
    this.config = workspace.getConfiguration('starters')
  }

  private reloadConfig() {
    this.config = workspace.getConfiguration('starters')
  }

  private getConfig<T>(key: string, defaultValue: T): NullAsUndefined<T> {
    const value = this.config.get<T>(key, defaultValue)
    return nullToUndefined(value)
  }

  private getWorkspaceConfig<T>(key: string): NullAsUndefined<T> {
    const c = this.config.inspect<T>(key)

    if (c && c.workspaceValue)
      return c.workspaceValue

    if (c && c.workspaceFolderValue)
      return c.workspaceFolderValue

    return undefined as NullAsUndefined<T>
  }

  private async setConfig<T>(key: string, value: T, target: ConfigurationTarget): Promise<void> {
    await this.config.update(key, value, target)
  }

  get projectSearchDepth(): number { return this.getConfig<number>('projectSearchDepth', 5) }

  // create vue
  get createVueNeedsTypeScript(): boolean { return this.getConfig<boolean>('createVue.needsTypeScript', true) }
  get createVueNeedsJsx(): boolean { return this.getConfig<boolean>('createVue.needsJsx', true) }
  get createVueNeedsRouter(): boolean { return this.getConfig<boolean>('createVue.needsRouter', true) }
  get createVueNeedsPinia(): boolean { return this.getConfig<boolean>('createVue.needsPinia', true) }
  get createVueNeedsVitest(): boolean { return this.getConfig<boolean>('createVue.needsVitest', true) }
  get createVueEndToEndTestingSolution(): 'Cypress' | 'Nightwatch' | 'Playwright' | 'No' { return this.getConfig<'Cypress' | 'Nightwatch' | 'Playwright' | 'No'>('createVue.endToEndTestingSolution', 'Cypress') }
  get createVueNeedsEslint(): boolean { return this.getConfig<boolean>('createVue.needsEslint', true) }
  get createVueNeedsPrettier(): boolean { return this.getConfig<boolean>('createVue.needsPrettier', true) }
  // create next app
  get createNextAppNeedsTypeScript(): boolean { return this.getConfig<boolean>('createNextApp.needsTypeScript', true) }
  get createNextAppNeedsEslint(): boolean { return this.getConfig<boolean>('createNextApp.needsEslint', true) }
  get createNextAppNeedsTailwind(): boolean { return this.getConfig<boolean>('createNextApp.needsTailwind', true) }
  get createNextAppNeedsSrcDirectory(): boolean { return this.getConfig<boolean>('createNextApp.needsSrcDirectory', true) }
  get createNextAppNeedsAppRouter(): boolean { return this.getConfig<boolean>('createNextApp.needsAppRouter', true) }
  get createNextAppCustomizeTheDefaultImportAlias(): string { return this.getConfig<string>('createNextApp.customizeTheDefaultImportAlias', '@/*') }
  // create svelte
  get createSvelteWhichAppTemplate(): 'default' | 'skeleton' | 'skeletonlib' { return this.getConfig<'default' | 'skeleton' | 'skeletonlib'>('createSvelte.whichAppTemplate', 'default') }
  get createSvelteAddTypeCheckingWith(): 'checkjs' | 'typescript' | 'no' { return this.getConfig<'checkjs' | 'typescript' | 'no'>('createSvelte.addTypeCheckingWith', 'typescript') }
  get createSvelteNeedsEslint(): boolean { return this.getConfig<boolean>('createSvelte.needsEslint', true) }
  get createSvelteNeedsPrettier(): boolean { return this.getConfig<boolean>('createSvelte.needsPrettier', true) }
  get createSvelteNeedsPlaywright(): boolean { return this.getConfig<boolean>('createSvelte.needsPlaywright', true) }
  get createSvelteNeedsVitest(): boolean { return this.getConfig<boolean>('createSvelte.needsVitest', true) }
  get createSvelteTrySvelte5Preview(): boolean { return this.getConfig<boolean>('createSvelte.trySvelte5Preview', true) }
  // create solid
  get createSolidWhichTemplate(): 'bare' | 'basic' | 'experiments' | 'hackernews' | 'todomvc' | 'with-auth' | 'with-mdx' | 'with-prisma' | 'with-solid-styled' | 'with-tailwindcss' | 'with-trpc' { return this.getConfig<'bare' | 'basic' | 'experiments' | 'hackernews' | 'todomvc' | 'with-auth' | 'with-mdx' | 'with-prisma' | 'with-solid-styled' | 'with-tailwindcss' | 'with-trpc'>('createSolid.whichTemplate', 'bare') }
  get createSolidNeedsTypeScript(): boolean { return this.getConfig<boolean>('createSolid.needsTypeScript', true) }
  get createSolidNeedsSsr(): boolean { return this.getConfig<boolean>('createSolid.needsSsr', true) }
  // create nest
  get createNestNeedsTypeScript(): boolean { return this.getConfig<boolean>('createNest.needsTypeScript', true) }
  // create expo app
  get createExpoAppWhichAppTemplate(): 'expo-template-blank' | 'expo-template-blank-typescript' | 'expo-template-tabs' | 'expo-template-bare-minimum' { return this.getConfig<'expo-template-blank' | 'expo-template-blank-typescript' | 'expo-template-tabs' | 'expo-template-bare-minimum'>('createExpoApp.whichTemplate', 'expo-template-blank-typescript') }
  // global settings
  get globalNeedsGitInit(): boolean { return this.getConfig<boolean>('globalSettings.needsGitInit', true) }
  get globalNeedsInstall(): boolean { return this.getConfig<boolean>('globalSettings.needsInstall', true) }
  get globalPackageManager(): 'pnpm' | 'npm' | 'yarn' | 'bun' { return this.getConfig<'pnpm' | 'npm' | 'yarn' | 'bun'>('globalSettings.packageManager', 'pnpm') }

  // create vue
  public setCreateVueNeedsTypeScript(value: boolean): Promise<void> { return this.setConfig('createVue.needsTypeScript', value, ConfigurationTarget.Global) }
  public setCreateVueNeedsJsx(value: boolean): Promise<void> { return this.setConfig('createVue.needsJsx', value, ConfigurationTarget.Global) }
  public setCreateVueNeedsRouter(value: boolean): Promise<void> { return this.setConfig('createVue.needsRouter', value, ConfigurationTarget.Global) }
  public setCreateVueNeedsPinia(value: boolean): Promise<void> { return this.setConfig('createVue.needsPinia', value, ConfigurationTarget.Global) }
  public setCreateVueNeedsVitest(value: boolean): Promise<void> { return this.setConfig('createVue.needsVitest', value, ConfigurationTarget.Global) }
  public setCreateVueEndToEndTestingSolution(value: 'Cypress' | 'Nightwatch' | 'Playwright' | 'No'): Promise<void> { return this.setConfig('createVue.endToEndTestingSolution', value, ConfigurationTarget.Global) }
  public setCreateVueNeedsEslint(value: boolean): Promise<void> { return this.setConfig('createVue.needsEslint', value, ConfigurationTarget.Global) }
  public setCreateVueNeedsPrettier(value: boolean): Promise<void> { return this.setConfig('createVue.needsPrettier', value, ConfigurationTarget.Global) }
  // create next app
  public setCreateNextAppNeedsTypeScript(value: boolean): Promise<void> { return this.setConfig('createNextApp.needsTypeScript', value, ConfigurationTarget.Global) }
  public setCreateNextAppNeedsEslint(value: boolean): Promise<void> { return this.setConfig('createNextApp.needsEslint', value, ConfigurationTarget.Global) }
  public setCreateNextAppNeedsTailwind(value: boolean): Promise<void> { return this.setConfig('createNextApp.needsTailwind', value, ConfigurationTarget.Global) }
  public setCreateNextAppNeedsSrcDirectory(value: boolean): Promise<void> { return this.setConfig('createNextApp.needsSrcDirectory', value, ConfigurationTarget.Global) }
  public setCreateNextAppNeedsAppRouter(value: boolean): Promise<void> { return this.setConfig('createNextApp.needsAppRouter', value, ConfigurationTarget.Global) }
  public setCreateNextAppCustomizeTheDefaultImportAlias(value: string): Promise<void> { return this.setConfig('createNextApp.customizeTheDefaultImportAlias', value, ConfigurationTarget.Global) }
  // create svelte
  public setCreateSvelteWhichAppTemplate(value: 'default' | 'skeleton' | 'skeletonlib'): Promise<void> { return this.setConfig('createSvelte.whichAppTemplate', value, ConfigurationTarget.Global) }
  public setCreateSvelteAddTypeCheckingWith(value: 'checkjs' | 'typescript' | 'no'): Promise<void> { return this.setConfig('createSvelte.addTypeCheckingWith', value, ConfigurationTarget.Global) }
  public setCreateSvelteNeedsEslint(value: boolean): Promise<void> { return this.setConfig<boolean>('createSvelte.needsEslint', value, ConfigurationTarget.Global) }
  public setCreateSvelteNeedsPrettier(value: boolean): Promise<void> { return this.setConfig<boolean>('createSvelte.needsPrettier', value, ConfigurationTarget.Global) }
  public setCreateSvelteNeedsPlaywright(value: boolean): Promise<void> { return this.setConfig<boolean>('createSvelte.needsPlaywright', value, ConfigurationTarget.Global) }
  public setCreateSvelteNeedsVitest(value: boolean): Promise<void> { return this.setConfig<boolean>('createSvelte.needsVitest', value, ConfigurationTarget.Global) }
  public setCreateSvelteTrySvelte5Preview(value: boolean): Promise<void> { return this.setConfig<boolean>('createSvelte.trySvelte5Preview', value, ConfigurationTarget.Global) }
  // create solid
  public setCreateSolidWhichTemplate(value: 'bare' | 'basic' | 'experiments' | 'hackernews' | 'todomvc' | 'with-auth' | 'with-mdx' | 'with-prisma' | 'with-solid-styled' | 'with-tailwindcss' | 'with-trpc'): Promise<void> { return this.setConfig('createSolid.whichTemplate', value, ConfigurationTarget.Global) }
  public setCreateSolidNeedsTypeScript(value: boolean): Promise<void> { return this.setConfig<boolean>('createSolid.needsTypeScript', value, ConfigurationTarget.Global) }
  public setCreateSolidNeedsSsr(value: boolean): Promise<void> { return this.setConfig<boolean>('createSolid.needsSsr', value, ConfigurationTarget.Global) }
  // create nest
  public setCreateNestNeedsTypeScript(value: boolean): Promise<void> { return this.setConfig<boolean>('createNest.needsTypeScript', value, ConfigurationTarget.Global) }
  // create expo app
  public setCreateExpoAppWhichAppTemplate(value: 'expo-template-blank' | 'expo-template-blank-typescript' | 'expo-template-tabs' | 'expo-template-bare-minimum'): Promise<void> { return this.setConfig('createExpoApp.whichTemplate', value, ConfigurationTarget.Global) }
  // global settings
  public setGlobalNeedsGitInit(value: boolean): Promise<void> { return this.setConfig('globalSettings.needsGitInit', value, ConfigurationTarget.Global) }
  public setGlobalNeedsInstall(value: boolean): Promise<void> { return this.setConfig('globalSettings.needsInstall', value, ConfigurationTarget.Global) }
  public setGlobalPackageManager(value: 'pnpm' | 'npm' | 'yarn' | 'bun'): Promise<void> { return this.setConfig('globalSettings.packageManager', value, ConfigurationTarget.Global) }

  public for(uri?: Uri): ResourceConfig {
    return new ResourceConfig(uri)
  }
}

export class ResourceConfig {
  public uri?: Uri
  public config: WorkspaceConfiguration

  constructor(uri?: Uri) {
    this.uri = uri
    this.config = workspace.getConfiguration('starters', this.uri)
  }

  private getConfig<T>(key: string, defaultValue: T): NullAsUndefined<T> {
    return nullToUndefined(this.config.get<T>(key, defaultValue))
  }

  get excludedFolders(): string[] { return this.getConfig<string[]>('excludedFolders', []) }
}

export const config = new Config()
