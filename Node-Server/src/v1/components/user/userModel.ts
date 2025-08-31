import { Schema, model } from "mongoose";
import bcrypt from "bcrypt";
const saltRounds = 10;


// 1. Define the User interface
export interface IUser {
    username: string;
    email: string;
    password: string;
    comparePassword(candidatePassword: string): Promise<boolean>;
}

const userSchema = new Schema<IUser>({
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
}, { timestamps: true });

userSchema.pre('save', async function (next) {
    // Hash password before saving (pseudo-code)
    if (!this.isModified("password")) return next();
    try {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
        next(); // ✅ MUST call next(), otherwise it hangs forever
    } catch (err: Error | any) {
        next(err); // ✅ pass error to Mongoose
    }
});

userSchema.methods.comparePassword = function (userPassword: string) {
    return bcrypt.compareSync(userPassword, this.password);
}

export const UserModel = model('User', userSchema);