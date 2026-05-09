import { v4 as uuidv4 } from "uuid";
import bcrypt from "bcrypt";
import model from "./model.js";

const SALT_ROUNDS = 10;

export default function UsersDao() {

    const createUser = async (user) => {
        const hashedPassword = await bcrypt.hash(user.password, SALT_ROUNDS);
        const newUser = { ...user, password: hashedPassword, _id: uuidv4() };
        return model.create(newUser);
    };

    const findAllUsers = () => model.find();
    const findUsersByRole = (role) => model.find({ role: role });
    const findUserById = (userId) => model.findById(userId);
    const findUserByUsername = (username) => model.findOne({ username: username });

    const findUserByCredentials = async (username, password) => {
        const user = await model.findOne({ username });
        if (!user) return null;
        const matches = await bcrypt.compare(password, user.password);
        return matches ? user : null;
    };

    const updateUser = async (userId, user) => {
        const updates = { ...user };
        if (updates.password) {
            updates.password = await bcrypt.hash(updates.password, SALT_ROUNDS);
        }
        return model.updateOne({ _id: userId }, { $set: updates });
    };

    const deleteUser = (userId) => model.deleteOne({ _id: userId });

    const findUsersByPartialName = (partialName) => {
        const regex = new RegExp(partialName, "i");
        return model.find({
            $or: [{ firstName: { $regex: regex } }, { lastName: { $regex: regex } }],
        });
    };

    return {
        createUser, findAllUsers, findUserById, findUserByUsername, findUserByCredentials, updateUser, deleteUser,
        findUsersByRole, findUsersByPartialName,
    };
}
