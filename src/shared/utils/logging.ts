import EventEmitter from "events";
import { IAmDisposable, LogCategory, LogMessage, LogSeverity, Logger, SpawnedProcess } from "../../types";

export function logProcess(logger: Logger, category: LogCategory, process: SpawnedProcess): void {
  const prefix = `(PROC ${process.pid})`;
  logger.info(`${prefix} Logging data for process...`, category);
  process.stdout.on("data", (data) => logger.info(`${prefix} ${data}`, category));
  process.stderr.on("data", (data) => logger.info(`${prefix} ${data}`, category));
  process.on("close", (code, signal) => logger.info(`${prefix} closed (${code}, ${signal})`, category));
  process.on("exit", (code, signal) => logger.info(`${prefix} exited (${code}, ${signal})`, category));
}

class LogEmitter extends EventEmitter {
  public fire(msg: LogMessage): void {
    this.emit("log", msg);
  }
  public onLog(listener: (message: LogMessage) => void): IAmDisposable {
    this.on("log", listener);
    return {
      dispose: () => { this.removeListener("log", listener); },
    };
  }
}

export class EmittingLogger implements Logger, IAmDisposable {
  private readonly onLogEmitter = new LogEmitter();
  public readonly onLog = (listener: (message: LogMessage) => void) => this.onLogEmitter.onLog(listener);

  private log(message: string, severity: LogSeverity, category = LogCategory.General): void {
    this.onLogEmitter.fire(new LogMessageImpl(message, severity, category));
  }

  public info(message: string, category?: LogCategory): void {
    this.log(message, LogSeverity.Info, category);
  }
  public warn(errorOrMessage: any, category?: LogCategory): void {
    this.log(errorString(errorOrMessage), LogSeverity.Warn, category);
  }
  public error(errorOrMessage: any, category?: LogCategory): void {
    this.log(errorString(errorOrMessage), LogSeverity.Error, category);
  }

  public dispose(): void {
    this.onLogEmitter.removeAllListeners();
  }
}

class LogMessageImpl implements LogMessage {
  constructor(
    readonly message: string,
    readonly severity: LogSeverity,
    readonly category: LogCategory,
  ) { }

  public toLine(maxLength: number): string {
    const logMessage = (
      maxLength && this.message && this.message.length > maxLength
        ? this.message.substring(0, maxLength) + "…"
        : (this.message || "<empty message>")
    ).trimRight();

    const time = `[${(new Date()).toLocaleTimeString()}]`;
    const prefix = `[${LogCategory[this.category]}] [${LogSeverity[this.severity]}]`;
    return `${time} ${prefix} ${logMessage}`;
  }
}

export function errorString(error: any): string {
  if (!error)
    return "<empty error>";
  else if (error instanceof Error)
    return error.message + (error.stack ? `\n${error.stack}` : "");
  else if (error.message)
    return error.message;
  else if (typeof error === "string")
    return error;
  else
    return `${error}`;
}
