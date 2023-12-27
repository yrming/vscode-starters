import { ExtensionContext, Uri } from "vscode"

export class Context {
  private constructor(public readonly context: ExtensionContext) {
  }

  // Helper we can manually call in the constructor when testing.
  public clear(): void {
    const clearableKeys = [
      "lastUsedNewProjectPath",
    ];
    for (const clearableKey of clearableKeys) {
      void this.context.globalState.update(clearableKey, undefined);
      void this.context.workspaceState.update(clearableKey, undefined);
    }
  }

  public static for(context: ExtensionContext): Context {
    return new Context(context)
  }

  get extensionStorageUri(): Uri {
    return this.context.globalStorageUri;
  }

  get lastUsedNewProjectPath(): string | undefined { return this.context.globalState.get("lastUsedNewProjectPath"); }
  set lastUsedNewProjectPath(value: string | undefined) { void this.context.globalState.update("lastUsedNewProjectPath", value); }


  public update(key: string, value: any): any {
    return this.context.globalState.update(key, value);
  }
  public get(key: string): any {
    return this.context.globalState.get(key);
  }

  public asAbsolutePath(relativePath: string): string {
    return this.context.asAbsolutePath(relativePath);
  }
}
