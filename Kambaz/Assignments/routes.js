import AssignmentsDao from "../Assignments/dao.js";
import { requireUser, requireRole } from "../Middleware/auth.js";

export default function AssignmentRoutes(app) {

    const dao = AssignmentsDao();

    const findAssignmentsForCourse = async (req, res) => {
        try {
            const { courseId } = req.params;
            const assignments = await dao.findAssignmentsForCourse(courseId);
            res.json(assignments);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    };

    const createAssignment = async (req, res) => {
        try {
            const { courseId } = req.params;
            const assignment = {
                ...req.body,
                course: courseId,
            };
            const newAssignment = await dao.createAssignment(assignment);
            res.json(newAssignment);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    };

    const updateAssignment = async (req, res) => {
        try {
            const { assignmentId } = req.params;
            const assignmentUpdates = req.body;
            const updatedAssignment = await dao.updateAssignment(assignmentId, assignmentUpdates);
            if (updatedAssignment) {
                res.json(updatedAssignment);
            } else {
                res.status(404).json({ message: "Assignment not found" });
            }
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    };

    const deleteAssignment = async (req, res) => {
        try {
            const { assignmentId } = req.params;
            await dao.deleteAssignment(assignmentId);
            res.sendStatus(204);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    };

    app.get("/api/courses/:courseId/assignments", requireUser, findAssignmentsForCourse);
    app.post("/api/courses/:courseId/assignments", requireUser, requireRole("FACULTY", "ADMIN"), createAssignment);
    app.put("/api/assignments/:assignmentId", requireUser, requireRole("FACULTY", "ADMIN"), updateAssignment);
    app.delete("/api/assignments/:assignmentId", requireUser, requireRole("FACULTY", "ADMIN"), deleteAssignment);

}