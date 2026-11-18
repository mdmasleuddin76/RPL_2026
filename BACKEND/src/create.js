// Creates the admin login from environment variables. Run once:
//   docker compose exec backend node src/create.js
import 'dotenv/config';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import Admin from './models/Admin.js';

const { MONGO_URI, ADMIN_EMAIL, ADMIN_PASSWORD } = process.env;
if (!MONGO_URI || !ADMIN_EMAIL || !ADMIN_PASSWORD) {
  console.error('Set MONGO_URI, ADMIN_EMAIL and ADMIN_PASSWORD first');
  process.exit(1);
}

await mongoose.connect(MONGO_URI);
const exists = await Admin.findOne({ email: ADMIN_EMAIL });
if (exists) {
  console.log('Admin already exists:', ADMIN_EMAIL);
} else {
  await Admin.create({ email: ADMIN_EMAIL, password: await bcrypt.hash(ADMIN_PASSWORD, 10) });
  console.log('Admin created:', ADMIN_EMAIL);
}
await mongoose.disconnect();
