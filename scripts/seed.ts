import { config } from "dotenv";
import { resolve } from "path";
import { connectDB } from "../src/lib/mongodb";
import User from "../src/models/User";
import { hashPassword } from "../src/lib/password";

const root = process.cwd();
config({ path: resolve(root, ".env.local") });
config({ path: resolve(root, ".env") });

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error(
      "Missing MONGODB_URI. Copy .env.example to .env.local and set MONGODB_URI (e.g. mongodb://localhost:27017/property_crm)."
    );
    process.exit(1);
  }

  await connectDB();

  const existingAdmin = await User.findOne({ role: "admin" });
  if (existingAdmin) {
    console.log("Admin user already exists. Skipping seed.");
    process.exit(0);
  }

  const email =
    process.env.SEED_ADMIN_EMAIL ?? "admin@property-crm.local";
  const password = process.env.SEED_ADMIN_PASSWORD ?? "ChangeMe123!";
  const name = process.env.SEED_ADMIN_NAME ?? "System Admin";

  const passwordHash = await hashPassword(password);
  await User.create({
    email,
    name,
    passwordHash,
    role: "admin",
  });

  console.log(`Seeded admin user: ${email}`);
  console.log("Sign in and change the password in production.");
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
