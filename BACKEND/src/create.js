// createAdmin.js
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import Admin from './models/Admin.js';

mongoose.connect('mongodb://localhost:27017/cricket_engine'); // Update with your DB URI

const createSeedAdmin = async () => {
  const hashedPassword = await bcrypt.hash('admin123', 10); // Your password here
  await Admin.create({ email: 'admin@rpl.com', password: hashedPassword });
  console.log("Admin created successfully!");
  process.exit();
};

createSeedAdmin();