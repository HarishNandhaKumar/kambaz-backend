const assignment = {
    id: 1, title: "NodeJS Assignment",
    description: "Create a NodeJS server with ExpressJS",
    due: "2021-10-10", completed: false, score: 0,
};

const module = {
    id: "CS5610",
    name: "Web Development",
    description: "Learn full-stack web development",
    course: "Computer Science"
};

export default function WorkingWithObjects(app) {
    const getAssignment = (req, res) => {
        res.json(assignment);
    };

    const getAssignmentTitle = (req, res) => {
        res.json(assignment.title);
    };

    const setAssignmentTitle = (req, res) => {
        const { newTitle } = req.params;
        assignment.title = newTitle;
        res.json(assignment);
    };

    const getModule = (req, res) => {
        res.json(module);
    }

    const getModuleName = (req, res) => {
        res.json(module.name);
    }

    const getModuleDescription = (req, res) => {
        res.json(module.description);
    }

    const setModuleName = (req, res) => {
        const { newName } = req.params;
        module.name = newName;
        res.json(module);
    }

    const setModuleDescription = (req, res) => {
        const { newDescription } = req.params;
        module.description = newDescription;
        res.json(module);
    }

    const setAssignmentScore = (req, res) => {
        const { newScore } = req.params;
        assignment.score = parseInt(newScore);
        res.json(assignment)
    }

    const setAssignmentStatus = (req, res) => {
        const { newStatus } = req.params;
        assignment.completed =newStatus === "true";
        res.json(assignment);
    }

    app.get("/lab5/assignment/title", getAssignmentTitle);
    app.get("/lab5/assignment", getAssignment);
    app.get("/lab5/assignment/title/:newTitle", setAssignmentTitle);
    app.get("/lab5/module", getModule);
    app.get("/lab5/module/name", getModuleName);
    app.get("/lab5/module/description", getModuleDescription);
    app.get("/lab5/module/name/:newName", setModuleName);
    app.get("/lab5/module/description/:newDescription", setModuleDescription);
    app.get("/lab5/assignment/score/:newScore", setAssignmentScore);
    app.get("/lab5/assignment/completed/:newStatus", setAssignmentStatus);
};