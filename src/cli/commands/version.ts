import packageJSON from "../../package.json";

async function main(): Promise<void> {
  console.log(packageJSON.version);
}

export default main;
