const path = "./emails";

const files = [];
const folder = readdirSync(path, { recursive: true });

for (const entry of folder) {
  if (statSync(path + "/" + entry).isFile()) {
    files.push({
      path: entry,
      content: readFileSync(path + "/" + entry, "utf8"),
    });
  }
}

console.log(Buffer.from(JSON.stringify(files), "utf-8").toString("base64"));
