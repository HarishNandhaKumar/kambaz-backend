import ModulesDao from "../Modules/dao.js";
import { requireUser, requireRole } from "../Middleware/auth.js";

export default function ModulesRoutes(app, db) {

    const dao = ModulesDao(db);
    const findModulesForCourse = async (req, res) => {
        const { courseId } = req.params;
        const modules = await dao.findModulesForCourse(courseId);
        res.json(modules);
    }

    const createModuleForCourse = async (req, res) => {
        const { courseId } = req.params;
        const module = {
            ...req.body,
            course: courseId,
        };
        const newModule = await dao.createModule(module);
        res.send(newModule);
    }

    const deleteModule = async (req, res) => {
        const { moduleId } = req.params;
        const status = await dao.deleteModule(moduleId);
        res.send(status);
    }

    const updateModule = async (req, res) => {
        const { moduleId } = req.params;
        const moduleUpdates = req.body;
        const status = await dao.updateModule(moduleId, moduleUpdates);
        res.send(status);
    }

    app.get("/api/courses/:courseId/modules", requireUser, findModulesForCourse);
    app.post("/api/courses/:courseId/modules", requireUser, requireRole("FACULTY", "ADMIN"), createModuleForCourse);
    app.put("/api/modules/:moduleId", requireUser, requireRole("FACULTY", "ADMIN"), updateModule);
    app.delete("/api/modules/:moduleId", requireUser, requireRole("FACULTY", "ADMIN"), deleteModule);
}