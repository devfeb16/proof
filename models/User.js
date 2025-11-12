import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const UserSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, minlength: 6 },
    role: { type: String, default: 'base_user', index: true },
    /**
     * Optional pointer to a role document.
     * Enables future migration to managed roles without breaking existing data.
     */
    roleRef: { type: mongoose.Schema.Types.ObjectId, ref: 'Role', default: null },
    createdAt: { type: Date, default: Date.now },
  },
  { versionKey: false }
);

// Hash password before save if modified
UserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

UserSchema.methods.comparePassword = function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

const User = mongoose.models.User || mongoose.model('User', UserSchema);
export default User;


