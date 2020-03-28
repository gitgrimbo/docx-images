import { promises as fsp } from "fs";
import * as path from "path";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default async function (): Promise<any> {
  // this code is compiled to "./dist" and "package.json" is in "./"
  const packageJsonPath = path.resolve(__dirname, "../package.json");
  const packageJsonContents = await fsp.readFile(packageJsonPath, "utf8");
  return JSON.parse(packageJsonContents);
}
