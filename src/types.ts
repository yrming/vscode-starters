import * as child_process from "child_process";
import * as stream from "stream";

export interface ProjectTemplate {
  readonly id: string
  readonly defaultProjectName: string
}

export interface IAmDisposable {
  dispose(): void | Promise<void>
}

export type SpawnedProcess = child_process.ChildProcess & {
  stdin: stream.Writable,
  stdout: stream.Readable,
  stderr: stream.Readable,
}

export interface Logger {
  info(message: string, category?: LogCategory): void;
  warn(message: any, category?: LogCategory): void;
  error(error: any, category?: LogCategory): void;
}

export enum LogCategory {
  General,
  CommandProcesses,
}

export interface ProjectFolderSearchResults { projectFolders: string[], excludedFolders: Set<string> };

export interface MyCancellationToken {
  isCancellationRequested: boolean;
}

export interface StarterCreateTriggerData {
  readonly templateId: string;
  readonly projectName: string
}

export interface StarterCreateCommandArgs {
  projectPath?: string;
  projectName?: string;
  triggerData?: StarterCreateTriggerData;
}

export interface LogMessage {
  readonly message: string;
  readonly severity: LogSeverity;
  readonly category: LogCategory;
  toLine(maxLength: number): string;
}

export enum LogSeverity {
  Info,
  Warn,
  Error,
}
