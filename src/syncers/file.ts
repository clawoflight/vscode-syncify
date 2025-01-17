import { basename, dirname, relative, resolve } from "path";
import { commands, extensions, ProgressLocation, window } from "vscode";
import { ISettings, ISyncer } from "~/models";
import {
  Debug,
  Environment,
  Extensions,
  FS,
  localize,
  Logger,
  Pragma,
  Settings,
  Watcher,
  Webview
} from "~/services";
import { sleep } from "~/utilities";

export class FileSyncer implements ISyncer {
  public async sync(): Promise<void> {
    window.showInformationMessage(
      "Syncify: Sync is not available for File Syncer yet"
    );
  }

  public async upload(): Promise<void> {
    const settings = await Settings.get();
    Watcher.stop();

    await window.withProgress(
      { location: ProgressLocation.Window },
      async progress => {
        try {
          const configured = await this.isConfigured();
          if (!configured) {
            Webview.openLandingPage();
            return;
          }

          progress.report({ message: localize("(info) upload.uploading") });

          const installedExtensions = Extensions.get();

          await FS.write(
            resolve(settings.file.path, "extensions.json"),
            JSON.stringify(installedExtensions, null, 2)
          );

          await this.copyFilesToPath(settings);

          progress.report({ increment: 100 });

          await sleep(10);

          window.setStatusBarMessage(localize("(info) upload.uploaded"), 2000);
        } catch (err) {
          Logger.error(err);
        }
      }
    );

    if (settings.watchSettings) Watcher.start();
  }

  public async download(): Promise<void> {
    const settings = await Settings.get();
    Watcher.stop();

    await window.withProgress(
      { location: ProgressLocation.Window },
      async progress => {
        try {
          const configured = await this.isConfigured();
          if (!configured) {
            Webview.openLandingPage();
            return;
          }

          progress.report({ message: localize("(info) download.downloading") });

          await this.copyFilesFromPath(settings);

          const extensionsFromFile = await (async () => {
            const path = resolve(settings.file.path, "extensions.json");

            const extensionsExist = await FS.exists(path);

            if (!extensionsExist) return [];

            return JSON.parse(await FS.read(path));
          })();

          Debug.log(
            "Extensions parsed from downloaded file:",
            extensionsFromFile
          );

          await Extensions.install(
            ...Extensions.getMissing(extensionsFromFile)
          );

          if (settings.removeExtensions) {
            const toDelete = Extensions.getUnneeded(extensionsFromFile);

            if (toDelete.length) {
              const needToReload = toDelete.some(
                name => extensions.getExtension(name)?.isActive ?? false
              );

              Debug.log("Need to reload:", needToReload);

              await Extensions.uninstall(...toDelete);

              if (needToReload) {
                const result = await window.showInformationMessage(
                  localize("(info) download.needToReload"),
                  localize("(btn) yes")
                );

                if (result) {
                  commands.executeCommand("workbench.action.reloadWindow");
                }
              }
            }
          }

          progress.report({ increment: 100 });

          await sleep(10);

          window.setStatusBarMessage(
            localize("(info) download.downloaded"),
            2000
          );
        } catch (err) {
          Logger.error(err);
        }
      }
    );

    if (settings.watchSettings) Watcher.start();
  }

  public async isConfigured(): Promise<boolean> {
    const settings = await Settings.get();
    const { path } = settings.file;

    if (!path) return false;

    const folderExists = await FS.exists(path);
    if (!folderExists) await FS.mkdir(path);

    return true;
  }

  private async copyFilesToPath(settings: ISettings): Promise<void> {
    try {
      const files = await FS.listFiles(Environment.userFolder);

      Debug.log(
        "Files to copy to folder:",
        files.map(f => relative(Environment.userFolder, f))
      );

      const filesToPragma = ["settings.json", "keybindings.json"];

      await Promise.all(
        files.map(async file => {
          const contents = await FS.read(file);

          const newPath = resolve(
            settings.file.path,
            relative(Environment.userFolder, file)
          );

          await FS.mkdir(dirname(newPath));

          if (filesToPragma.includes(basename(file))) {
            return FS.write(newPath, Pragma.processOutgoing(contents));
          }

          return FS.write(newPath, contents);
        })
      );
    } catch (err) {
      Logger.error(err);
    }
  }

  private async copyFilesFromPath(settings: ISettings): Promise<void> {
    try {
      const files = await FS.listFiles(settings.file.path);

      Debug.log(
        "Files to copy from folder:",
        files.map(f => relative(settings.file.path, f))
      );

      const filesToPragma = ["settings.json", "keybindings.json"];

      await Promise.all(
        files.map(async file => {
          const contents = await FS.read(file);

          const newPath = resolve(
            Environment.userFolder,
            relative(settings.file.path, file)
          );

          await FS.mkdir(dirname(newPath));

          const currentContents = await (async () => {
            if (await FS.exists(newPath)) return FS.read(newPath);

            return "{}";
          })();

          if (filesToPragma.includes(basename(file))) {
            const afterPragma = Pragma.processIncoming(
              settings.hostname,
              contents,
              currentContents
            );

            if (currentContents !== afterPragma) {
              return FS.write(newPath, afterPragma);
            }

            return;
          }

          if (currentContents !== contents) return FS.write(newPath, contents);
        })
      );
    } catch (err) {
      Logger.error(err);
    }
  }
}
