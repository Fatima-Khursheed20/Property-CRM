/** Remove `.next` — fixes Turbopack persist / ENOENT errors after interrupted dev */
const fs = require("fs");
const path = require("path");

const dir = path.join(process.cwd(), ".next");

try {
  fs.rmSync(dir, { recursive: true, force: true });
  console.log("Removed .next");
} catch (e) {
  const err = /** @type {NodeJS.ErrnoException} */ (e);
  if (err.code !== "ENOENT") {
    console.error(err);
    process.exit(1);
  }
}
