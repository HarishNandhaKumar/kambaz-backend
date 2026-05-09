import { v4 as uuidv4 } from "uuid";
import model from "./model.js";

export default function EnrollmentsDao(db) {
    let { enrollments } = db;

    const enrollUserInCourse = (userId, courseId) => {
        return model.create({ user: userId, course: courseId, _id: `${userId}-${courseId}` });
    };

    const unenrollUserFromCourse = (userId, courseId) => {
        return model.deleteOne({ user: userId, course: courseId });
    };

    const findEnrollmentsForUser = async (userId) => {
        return await model.find({ user: userId }).populate("course");
    };

    const findEnrollmentsForCourse = async (courseId) => {
        const enrollments = await model.find({ course: courseId }).populate("user");
        return enrollments.map((enrollment) => enrollment.user);
    };

    const findAllEnrollments = () => {
        return enrollments;
    };

    const deleteEnrollmentsForCourse = async (courseId) => {
        return await model.deleteMany({ course: courseId });
    };

    const findUsersForCourse = async (courseId) => {
        const enrollments = await model.find({ course: courseId }).populate("user");
        return enrollments.map((enrollment) => enrollment.user).filter((user) => user !== null);
    };

    return { 
        enrollUserInCourse, 
        unenrollUserFromCourse, 
        findEnrollmentsForUser,
        findEnrollmentsForCourse,
        findAllEnrollments,
        deleteEnrollmentsForCourse,
        findUsersForCourse,
    };
}