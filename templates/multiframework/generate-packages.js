const fs = require("fs");
const path = require("path");

const base = JSON.parse(
  fs.readFileSync(path.join(__dirname, "base.package.json"), "utf8"),
);

const frameworks = [
  {
    name: "vue",
    dependencies: { vue: "^3.4.0", vite: "^5.0.0" },
    devDependencies: { typescript: "^5.4.0" },
  },
  {
    name: "react",
    dependencies: { react: "^18.3.1", "react-dom": "^18.3.1", vite: "^5.0.0" },
    devDependencies: { typescript: "^5.4.0" },
  },
  {
    name: "svelte",
    dependencies: { svelte: "^4.2.0", vite: "^5.0.0" },
    devDependencies: { typescript: "^5.4.0" },
  },
  {
    name: "angular",
    dependencies: { "@angular/core": "^17.0.0" },
    devDependencies: { typescript: "^5.4.0" },
  },
];

frameworks.forEach((fw) => {
  const pkg = { ...base };
  pkg.name = `my-app-${fw.name}`;
  pkg.dependencies = fw.dependencies;
  pkg.devDependencies = fw.devDependencies;
  fs.writeFileSync(
    path.join(__dirname, `package.${fw.name}.json`),
    JSON.stringify(pkg, null, 2),
  );
});

console.log("Framework-specific package.json files generated!");
