import { copyFileSync, readFileSync, writeFileSync } from "node:fs";

const sourceMapPath = "dist/auralis-cards.js.map";
const sourceMap = JSON.parse(readFileSync(sourceMapPath, "utf8"));

if (Array.isArray(sourceMap.sourcesContent)) {
  sourceMap.sourcesContent = sourceMap.sourcesContent.map((source) =>
    typeof source === "string" ? source.replace(/\r\n/g, "\n") : source,
  );
}

writeFileSync(sourceMapPath, JSON.stringify(sourceMap));

copyFileSync("dist/auralis-cards.js", "auralis-cards.js");
copyFileSync("dist/auralis-cards.js.map", "auralis-cards.js.map");
copyFileSync("dist/auralis-cards.js", "dist/orbit-home-cards.js");
copyFileSync("dist/auralis-cards.js.map", "dist/orbit-home-cards.js.map");
copyFileSync("dist/auralis-cards.js", "orbit-home-cards.js");
copyFileSync("dist/auralis-cards.js.map", "orbit-home-cards.js.map");
