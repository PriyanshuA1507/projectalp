import dotenv from 'dotenv';
import { connectDB } from '../src/db/index.js';
import { User } from '../src/models/user.model.js';

dotenv.config();

const confirmed = process.argv.includes('--yes') || process.argv.includes('-y');

async function main() {
  console.log('This script will set `must_change_password = false` for all users where it is currently true.');
  if (!confirmed) {
    console.log('To proceed, re-run with `--yes` or `-y` flag. Example:');
    console.log('  node scripts/clear-must-change-password.js --yes');
    process.exit(0);
  }

  try {
    await connectDB();

    const res = await User.updateMany(
      { must_change_password: true },
      { $set: { must_change_password: false } }
    );

    const updated = (res.modifiedCount ?? res.nModified ?? 0);
    console.log(`✅ Updated ${updated} user(s).`);
    process.exit(0);
  } catch (err) {
    console.error('Error while updating users:', err);
    process.exit(1);
  }
}

main();
