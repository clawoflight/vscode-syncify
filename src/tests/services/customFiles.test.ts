import { ensureDir, remove } from "fs-extra";
import { tmpdir } from "os";
import { resolve } from "path";
import { Uri } from "vscode";
import { CustomFiles, Environment, FS } from "~/services";

jest.mock("~/services/localization.ts");

const cleanupPath = resolve(tmpdir(), "syncify-jest/services/custom-file");
const pathToSource = `${cleanupPath}/source`;
const pathToRegistered = `${cleanupPath}/registered`;

jest
  .spyOn(Environment, "customFilesFolder", "get")
  .mockReturnValue(pathToRegistered);

beforeEach(() => ensureDir(pathToSource));
afterEach(() => remove(cleanupPath));

it("should register a provided file", async () => {
  const data = JSON.stringify({ test: true }, null, 2);
  await FS.write(resolve(pathToSource, "test.json"), data);

  const uri = {
    fsPath: resolve(pathToSource, "test.json")
  };

  await CustomFiles.register(uri as Uri);

  const exists = await FS.exists(resolve(pathToRegistered, "test.json"));
  expect(exists).toBeTruthy();
});
