import fs from "node:fs";

export async function importCoverMateContract() {
  const source = fs.readFileSync(new URL("../../covermate-contract.js", import.meta.url), "utf8");
  return import(`data:text/javascript;base64,${Buffer.from(source).toString("base64")}`);
}
