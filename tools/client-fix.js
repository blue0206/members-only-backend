import fs from 'fs';
import path from 'path';

const filePath = path.join(import.meta.dirname, "../src/core/db/prisma-client/client.ts");

let content = fs.readFileSync(filePath, "utf8");
content = "// @ts-nocheck\n" + content;

fs.writeFileSync(filePath, content);

console.log("✅ Generated prisma client's type-checking has been turned off.");
