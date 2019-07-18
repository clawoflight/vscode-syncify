import { ExtensionContext } from "vscode";
import { EnvironmentService } from "../services/environment.service";
import { ExtensionService } from "../services/extension.service";
import { FileSystemService } from "../services/fs.service";
import { LocalizationService } from "../services/localization.service";
import { LockService } from "../services/lock.service";
import { SettingsService } from "../services/settings.service";
import { WatcherService } from "../services/watcher.service";
import { WebviewService } from "../services/webview.service";
import { ISyncService } from "./sync.model";

export interface IExtensionState {
  context?: ExtensionContext;
  sync?: ISyncService;
  settings?: SettingsService;
  fs?: FileSystemService;
  env?: EnvironmentService;
  watcher?: WatcherService;
  extensions?: ExtensionService;
  webview?: WebviewService;
  lock?: LockService;
  localize: (key: string, ...args: string[]) => string;
}

export const state: IExtensionState = {
  localize: LocalizationService.prototype.localize.bind(
    new LocalizationService()
  )
};
