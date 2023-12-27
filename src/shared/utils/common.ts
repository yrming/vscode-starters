import { Uri, workspace } from "vscode";
import { IAmDisposable } from "../../types";

export function disposeAll(disposables: IAmDisposable[]) {
  const toDispose = disposables.slice();
  disposables.length = 0;
  for (const d of toDispose) {
    try {
      void d.dispose();
    } catch (e) {
      console.warn(e);
    }
  }
}

export type NullAsUndefined<T> = null extends T ? NonNullable<T> | undefined : T;

export function nullToUndefined<T>(value: T): NullAsUndefined<T> {
  return (value === null ? undefined : value) as NullAsUndefined<T>;
}


export class PromiseCompleter<T> {
  public promise: Promise<T>;
  public resolve!: (value: T | PromiseLike<T>) => void;
  public reject!: (error?: any, stackTrace?: string) => void;

  constructor() {
    this.promise = new Promise((res, rej) => {
      this.resolve = res;
      this.reject = rej;
    });
  }
}

export function notUndefined<T>(x: T | undefined): x is T {
  return x !== undefined;
}

export function isWithinWorkspace(file: string) {
  return !!workspace.getWorkspaceFolder(Uri.file(file));
}

export function flatMap<T1, T2>(input: readonly T1[], f: (input: T1) => readonly T2[]): T2[] {
  return input.reduce((acc, x) => acc.concat(f(x)), [] as T2[]);
}
