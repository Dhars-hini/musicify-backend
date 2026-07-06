require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');

const ADMIN_USERNAME = 'admin';
const ADMIN_EMAIL    = 'admin@musicify.com';
const ADMIN_PASSWORD = 'Admin@1234';

async function createAdmin() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('MongoDB connected');

  const existing = await User.findOne({ $or: [{ email: ADMIN_EMAIL }, { username: ADMIN_USERNAME }] });
  if (existing) {
    // If found but not admin, upgrade role
    if (existing.role !== 'admin') {
      existing.role = 'admin';
      await existing.save();
      console.log(`✅ Existing user "${existing.username}" upgraded to admin`);
    } else {
      console.log(`ℹ️  Admin account already exists: ${existing.email}`);
    }
    await mongoose.disconnect();
    return;
  }

  const salt = await bcrypt.genSalt(10);
  const hashed = await bcrypt.hash(ADMIN_PASSWORD, salt);

  const admin = new User({
    username: ADMIN_USERNAME,
    email: ADMIN_EMAIL,
    password: hashed,
    role: 'admin',
  });

  await admin.save();
  console.log('✅ Admin account created!');
  console.log(`   Email   : ${ADMIN_EMAIL}`);
  console.log(`   Password: ${ADMIN_PASSWORD}`);

  await mongoose.disconnect();
}

createAdmin().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
