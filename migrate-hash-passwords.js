import "dotenv/config";
import mongoose from "mongoose";
import bcrypt from "bcrypt";
import userSchema from "./Kambaz/Users/schema.js";

const SALT_ROUNDS = 10;
const CONNECTION_STRING =
    process.env.DATABASE_CONNECTION_STRING ||
    "mongodb://127.0.0.1:27017/kambaz";

const isAlreadyHashed = (s) => typeof s === "string" && s.startsWith("$2");

async function main() {
    await mongoose.connect(CONNECTION_STRING);
    const User = mongoose.model("UserModel", userSchema);

    const users = await User.find({});
    console.log(`Found ${users.length} users.`);

    let hashed = 0;
    let skipped = 0;

    for (const user of users) {
        if (isAlreadyHashed(user.password)) {
            skipped++;
            continue;
        }
        const hash = await bcrypt.hash(user.password, SALT_ROUNDS);
        await User.updateOne({ _id: user._id }, { $set: { password: hash } });
        hashed++;
        console.log(`  hashed: ${user.username}`);
    }

    console.log(`\nDone. hashed=${hashed}, skipped=${skipped}`);
    await mongoose.disconnect();
}

main().catch((err) => {
    console.error("Migration failed:", err);
    process.exit(1);
});
