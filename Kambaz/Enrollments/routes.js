import EnrollmentsDao from "./dao.js";
import { requireUser, requireRole, requireSelfOrRole } from "../Middleware/auth.js";

export default function EnrollmentRoutes(app, db) {
    const enrollmentsDao = EnrollmentsDao(db);

    const resolveUserId = (req) =>
        req.params.userId === "current" ? req.user._id : req.params.userId;

    const enrollUserInCourse = async (req, res) => {
        const userId = resolveUserId(req);
        const { courseId } = req.params;
        const newEnrollment = await enrollmentsDao.enrollUserInCourse(userId, courseId);
        res.json(newEnrollment);
    };

    const unenrollUserFromCourse = async (req, res) => {
        const userId = resolveUserId(req);
        const { courseId } = req.params;
        await enrollmentsDao.unenrollUserFromCourse(userId, courseId);
        res.sendStatus(204);
    };

    const findAllEnrollments = async (req, res) => {
        const enrollments = await enrollmentsDao.findAllEnrollments();
        res.json(enrollments);
    };

    const findEnrollmentsForUser = async (req, res) => {
        const userId = resolveUserId(req);
        const enrollments = await enrollmentsDao.findEnrollmentsForUser(userId);
        res.json(enrollments);
    };

    const findUsersForCourse = async (req, res) => {
        const { courseId } = req.params;
        const users = await enrollmentsDao.findUsersForCourse(courseId);
        res.json(users);
    };

    app.post("/api/users/:userId/courses/:courseId", requireUser, requireSelfOrRole("userId", "FACULTY", "ADMIN"), enrollUserInCourse);
    app.delete("/api/users/:userId/courses/:courseId", requireUser, requireSelfOrRole("userId", "FACULTY", "ADMIN"), unenrollUserFromCourse);
    app.get("/api/enrollments", requireUser, requireRole("FACULTY", "ADMIN"), findAllEnrollments);
    app.get("/api/users/:userId/enrollments", requireUser, requireSelfOrRole("userId", "FACULTY", "ADMIN"), findEnrollmentsForUser);
    app.get("/api/courses/:courseId/users", requireUser, requireRole("FACULTY", "ADMIN"), findUsersForCourse);
}
