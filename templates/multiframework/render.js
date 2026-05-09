const fs = require("fs");
const path = require("path");

function render(template, data) {
  return template
    .replace(/\{\{\s*title\s*\}\}/g, data.title)
    .replace(/\{\{\s*email\s*\}\}/g, data.email)
    .replace(/\{\{\s*description\s*\}\}/g, data.description);
}

const frameworks = [
  { name: "vue", tpl: "index.vue" },
  { name: "react", tpl: "index.tsx" },
  { name: "svelte", tpl: "index.svelte" },
  { name: "angular", tpl: "index.component.ts" },
];

for (let i = 0; i < 4; i++) {
  const data = JSON.parse(
    fs.readFileSync(
      path.join(__dirname, `data${i ? i + "" : ""}.json`),
      "utf8",
    ),
  );
  frameworks.forEach((fw) => {
    const tpl = fs.readFileSync(path.join(__dirname, fw.tpl), "utf8");
    const out = render(tpl, data);
    fs.writeFileSync(
      path.join(
        __dirname,
        `output_${fw.name}_${i + 1}.${fw.tpl.split(".").pop()}`,
      ),
      out,
    );
  });
}

console.log("Templates rendered for all frameworks and data sets!");
