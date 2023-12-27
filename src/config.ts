import type { Uri, WorkspaceConfiguration } from 'vscode'
import { ConfigurationTarget, workspace } from 'vscode'
import type { NullAsUndefined } from './shared/utils/common'
import { nullToUndefined } from './shared/utils/common'

class Config {
  private config: WorkspaceConfiguration

  constructor() {
    workspace.onDidChangeConfiguration(e => this.reloadConfig())
    this.config = workspace.getConfiguration('starterTemplates')
  }

  private reloadConfig() {
    this.config = workspace.getConfiguration('starterTemplates')
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

  get createVueNeedsTypeScript(): boolean { return this.getConfig<boolean>('createVue.needsTypeScript', true) }
  get createVueNeedsJsx(): boolean { return this.getConfig<boolean>('createVue.needsJsx', true) }
  get createVueNeedsRouter(): boolean { return this.getConfig<boolean>('createVue.needsRouter', true) }
  get createVueNeedsPinia(): boolean { return this.getConfig<boolean>('createVue.needsPinia', true) }
  get createVueNeedsVitest(): boolean { return this.getConfig<boolean>('createVue.needsVitest', true) }
  get createVueEndToEndTestingSolution(): 'Cypress' | 'Nightwatch' | 'Playwright' | 'No' { return this.getConfig<'Cypress' | 'Nightwatch' | 'Playwright' | 'No'>('createVue.endToEndTestingSolution', 'Cypress') }
  get createVueNeedsEslint(): boolean { return this.getConfig<boolean>('createVue.needsEslint', true) }
  get createVueNeedsPrettier(): boolean { return this.getConfig<boolean>('createVue.needsPrettier', true) }

  public setCreateVueNeedsTypeScript(value: boolean): Promise<void> { return this.setConfig('createVue.needsTypeScript', value, ConfigurationTarget.Global) }
  public setCreateVueNeedsJsx(value: boolean): Promise<void> { return this.setConfig('createVue.needsJsx', value, ConfigurationTarget.Global) }
  public setCreateVueNeedsRouter(value: boolean): Promise<void> { return this.setConfig('createVue.needsRouter', value, ConfigurationTarget.Global) }
  public setCreateVueNeedsPinia(value: boolean): Promise<void> { return this.setConfig('createVue.needsPinia', value, ConfigurationTarget.Global) }
  public setCreateVueNeedsVitest(value: boolean): Promise<void> { return this.setConfig('createVue.needsVitest', value, ConfigurationTarget.Global) }
  public setCreateVueEndToEndTestingSolution(value: 'Cypress' | 'Nightwatch' | 'Playwright' | 'No'): Promise<void> { return this.setConfig('createVue.endToEndTestingSolution', value, ConfigurationTarget.Global) }
  public setCreateVueNeedsEslint(value: boolean): Promise<void> { return this.setConfig('createVue.needsEslint', value, ConfigurationTarget.Global) }
  public setCreateVueNeedsPrettier(value: boolean): Promise<void> { return this.setConfig('createVue.needsPrettier', value, ConfigurationTarget.Global) }

  public for(uri?: Uri): ResourceConfig {
    return new ResourceConfig(uri)
  }
}

export class ResourceConfig {
  public uri?: Uri
  public config: WorkspaceConfiguration

  constructor(uri?: Uri) {
    this.uri = uri
    this.config = workspace.getConfiguration('starterTemplates', this.uri)
  }

  private getConfig<T>(key: string, defaultValue: T): NullAsUndefined<T> {
    return nullToUndefined(this.config.get<T>(key, defaultValue))
  }

  get excludedFolders(): string[] { return this.getConfig<string[]>('excludedFolders', []) }
}

export const config = new Config()
