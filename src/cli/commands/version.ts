import packageJson from "../../package-json";

async function main(): Promise<void> {
  const version = (await packageJson()).version;
  console.log(version);
}

export default main;
