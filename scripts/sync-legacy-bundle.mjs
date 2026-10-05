import { copyFileSync } from "node:fs";

copyFileSync("dist/auralis-cards.js", "auralis-cards.js");
copyFileSync("dist/auralis-cards.js.map", "auralis-cards.js.map");
copyFileSync("dist/auralis-cards.js", "dist/orbit-home-cards.js");
copyFileSync("dist/auralis-cards.js.map", "dist/orbit-home-cards.js.map");
copyFileSync("dist/auralis-cards.js", "orbit-home-cards.js");
copyFileSync("dist/auralis-cards.js.map", "orbit-home-cards.js.map");
