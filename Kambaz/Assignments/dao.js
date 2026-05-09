import model from "./model.js";
import { v4 as uuidv4 } from "uuid";

export default function AssignmentsDao() {

    async function findAssignmentsForCourse(courseId) {
        return await model.find({ course: courseId });
    }

    async function createAssignment(assignment) {
        delete assignment._id; // Remove any incoming _id
        assignment._id = `A-${uuidv4().substring(0, 8)}`; // Set our own
        return await model.create(assignment);
    }

    async function updateAssignment(assignmentId, assignmentUpdates) {
        return await model.findByIdAndUpdate(
            assignmentId, 
            assignmentUpdates, 
            { new: true }
        );
    }

    async function deleteAssignment(assignmentId) {
        return await model.findByIdAndDelete(assignmentId);
    }

    return { findAssignmentsForCourse, createAssignment, updateAssignment, deleteAssignment };
}