import mongoose from 'mongoose';
import { connectDB } from '../config/database.js';
import User from '../models/User.js';
import { env } from '../config/env.js';
import { ROLES, USER_STATUS } from '../utils/constants.js';

const seedAdmin = async () => {
  const isUnset = (v) => !v || /^(replace[_-]?me|changeme|password)$/i.test(v.trim());
  if (isUnset(env.admin.email) || isUnset(env.admin.password)) {
    console.error('ADMIN_EMAIL and ADMIN_PASSWORD must be set to real values (not placeholders) before seeding the admin.');
    process.exit(1);
  }
  if (env.isProduction && env.admin.password.length < 12) {
    console.error('ADMIN_PASSWORD must be at least 12 characters in production.');
    process.exit(1);
  }

  await connectDB();
  
  try {
    const adminExists = await User.findOne({ email: env.admin.email });
    
    if (adminExists) {
      console.log(`Admin user with email ${env.admin.email} already exists.`);
      process.exit(0);
    }
    
    await User.create({
      name: env.admin.name,
      email: env.admin.email,
      phone: '9999999999',
      password: env.admin.password,
      role: ROLES.CONTROL_ROOM_ADMIN,
      status: USER_STATUS.ACTIVE
    });
    
    console.log('Control Room Admin seeded successfully!');
    process.exit(0);
  } catch (error) {
    console.error(`Error seeding admin: ${error.message}`);
    process.exit(1);
  }
};

seedAdmin();
