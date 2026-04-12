import { Detail, environment } from "@raycast/api";
import fs from "fs";
import path from "path";

export default function Command() {
  const imagePath = path.join(environment.assetsPath, "nansen.png");
  let base64 = "";
  try {
    base64 = fs.readFileSync(imagePath).toString("base64");
  } catch (e) {
    // Silently ignore asset read failure, extension will render without logo
  }

  const markdown = `
# Welcome to <img src="data:image/png;base64,${base64}" height="32" /> Nansen Plugin

---

The Nansen Raycast Plugin is installed and ready to use!

To use the Polymarket intelligence tools:
1. Open Raycast
2. Enter \`@nansen\`
3. Input your instruction.

**Examples:**
- *"Show me insiders in the US election market"*
- *"What is ImJustKent trading?"*
- *"Cluster this wallet: 0xa4eb52229991c074bc560f825bf2776d77acd010"*
  `;

  return <Detail markdown={markdown} />;
}
