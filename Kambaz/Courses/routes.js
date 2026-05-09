import CoursesDao from "./dao.js";
import EnrollmentsDao from "../Enrollments/dao.js";
import { requireUser, requireRole, requireSelfOrRole } from "../Middleware/auth.js";

export default function CourseRoutes(app, db) {
    const dao = CoursesDao(db);
    const enrollmentsDao = EnrollmentsDao(db);

    const findAllCourses = async (req, res) => {
        const courses = await dao.findAllCourses();
        res.send(courses);
    }

    const findCoursesForEnrolledUser = async (req, res) => {
        const userId = req.params.userId === "current" ? req.user._id : req.params.userId;
        const courses = await dao.findCoursesForEnrolledUser(userId);
        res.json(courses);
    };

    const createCourse = async (req, res) => {
        const newCourse = await dao.createCourse(req.body);
        res.json(newCourse);
    };

    const deleteCourse = async (req, res) => {
        const { courseId } = req.params;
        enrollmentsDao.deleteEnrollmentsForCourse(courseId);
        const status = await dao.deleteCourse(courseId);
        res.send(status);
    }

    const updateCourse = async (req, res) => {
        const { courseId } = req.params;
        const courseUpdates = req.body;
        const status = await dao.updateCourse(courseId, courseUpdates);
        res.send(status);
    }

    app.put("/api/courses/:courseId", requireUser, requireRole("FACULTY", "ADMIN"), updateCourse);
    app.delete("/api/courses/:courseId", requireUser, requireRole("FACULTY", "ADMIN"), deleteCourse);
    app.post("/api/users/current/courses", requireUser, requireRole("FACULTY", "ADMIN"), createCourse);
    app.get("/api/users/:userId/courses", requireUser, requireSelfOrRole("userId", "FACULTY", "ADMIN"), findCoursesForEnrolledUser);
    app.get("/api/courses", requireUser, findAllCourses);
}