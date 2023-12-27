import { Disposable } from "vscode";
import { disposeAll } from "../shared/utils/common";
import { Context } from "../shared/vscode/workspace";
import { IAmDisposable, Logger } from "../types";

export class BaseCommands implements IAmDisposable {
  protected readonly disposables: Disposable[] = [];
  constructor(protected readonly logger: Logger, protected readonly context: Context) {

  }
  public dispose(): void | Promise<void> {
    disposeAll(this.disposables);
  }
}
