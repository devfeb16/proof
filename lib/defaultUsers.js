import connectDB from './db';
import User from '../models/User';
import { ensureRole } from './roles';

const DEFAULT_HR_EMAIL = 'hr@proof360.com';
const DEFAULT_HR_PASSWORD = 'pass123';
const DEFAULT_HR_NAME = 'Default HR';

let ensuringDefaultHrPromise = null;

async function createOrFetchDefaultHr() {
  await connectDB();
  const existing = await User.findOne({ email: DEFAULT_HR_EMAIL });
  if (existing) {
    if (existing.role !== 'hr') {
      const hrRole = await ensureRole('hr', 'Human resources role');
      existing.role = hrRole.name;
      existing.roleRef = hrRole._id;
      await existing.save();
    }
    return existing;
  }

  const hrRole = await ensureRole('hr', 'Human resources role');

  const created = await User.create({
    name: DEFAULT_HR_NAME,
    email: DEFAULT_HR_EMAIL,
    password: DEFAULT_HR_PASSWORD,
    role: hrRole.name,
    roleRef: hrRole._id,
  });

  return created;
}

export async function ensureDefaultHrUser() {
  if (!ensuringDefaultHrPromise) {
    ensuringDefaultHrPromise = createOrFetchDefaultHr().catch((err) => {
      ensuringDefaultHrPromise = null;
      throw err;
    });
  }
  return ensuringDefaultHrPromise;
}









