import UsersDao from "./dao.js";
import { validateBody } from "../Middleware/validate.js";
import { signinLimiter } from "../Middleware/rateLimit.js";
import { requireUser, requireRole, requireSelfOrRole } from "../Middleware/auth.js";
import { signupSchema, signinSchema } from "./validators.js";


const sanitize = (user) => {
    if (!user) return user;
    const obj = typeof user.toObject === "function" ? user.toObject() : { ...user };
    delete obj.password;
    return obj;
};

export default function UserRoutes(app, db) {
    const dao = UsersDao(db);

        const createUser = async (req, res) => { 
            const user = await dao.createUser(req.body);
            res.json(sanitize(user));
        };

        const deleteUser = async (req, res) => {
            const status = await dao.deleteUser(req.params.userId);
            res.json(status);
         };

        const findAllUsers = async (req, res) => {
            const { role, name } = req.query;
            if (role) {
                const users = await dao.findUsersByRole(role);
                res.json(users.map(sanitize));
                return;
            }

            if (name) {
                const users = await dao.findUsersByPartialName(name);
                res.json(users.map(sanitize));
                return;
            }

            const users = await dao.findAllUsers();
            res.json(users.map(sanitize));
        };

        const findUserById = async (req, res) => {
            const user = await dao.findUserById(req.params.userId);
            res.json(sanitize(user));
         };

        const updateUser = async (req, res) => {
            const userId = req.params.userId;
            const userUpdates = req.body;
            await dao.updateUser(userId, userUpdates);
            const sessionUser = req.session["currentUser"];
            if (sessionUser && sessionUser._id === userId) {
                const { password, ...safeUpdates } = userUpdates;
                req.session["currentUser"] = { ...sessionUser, ...safeUpdates };
            }
            const updated = await dao.findUserById(userId);
            res.json(sanitize(updated));
        };

        const signup = async (req, res) => {
            const existing = await dao.findUserByUsername(req.body.username);
            if (existing) {
                res.status(400).json(
                    { message: "Username already in use" });
                return;
            }
            const newUser = await dao.createUser(req.body);
            const safeUser = sanitize(newUser);
            req.session["currentUser"] = safeUser;
            res.json(safeUser);
         };

        const signin = async (req, res) => { 
            const { username, password } = req.body;
            const user = await dao.findUserByCredentials(username, password);
            if (user) {
                const safeUser = sanitize(user);
                req.session["currentUser"] = safeUser;
                res.json(safeUser);
            }
            else {
                res.status(401).json({ message: "Unable to login. Try again later." });
            }
        };

        const signout = (req, res) => {
            req.session.destroy();
            res.sendStatus(200);
         };

        const profile = async (req, res) => {
            const currentUser = req.session["currentUser"];
            if (!currentUser) {
                res.sendStatus(401);
                return;
            }
            res.json(currentUser);
        };

        app.post("/api/users", requireUser, requireRole("ADMIN"), createUser);
        app.get("/api/users", requireUser, requireRole("FACULTY", "ADMIN"), findAllUsers);
        app.get("/api/users/:userId", requireUser, requireSelfOrRole("userId", "FACULTY", "ADMIN"), findUserById);
        app.put("/api/users/:userId", requireUser, requireSelfOrRole("userId", "ADMIN"), updateUser);
        app.delete("/api/users/:userId", requireUser, requireRole("ADMIN"), deleteUser);
        app.post("/api/users/signup", validateBody(signupSchema), signup);
        app.post("/api/users/signin", signinLimiter, validateBody(signinSchema), signin);
        app.post("/api/users/signout", signout);
        app.post("/api/users/profile", profile);
}