export const requireUser = (req, res, next) => {
    const user = req.session?.currentUser;
    if (!user) {
        return res.status(401).json({ message: "Authentication required" });
    }
    req.user = user;
    next();
};

export const requireRole = (...allowedRoles) => (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ message: "Authentication required" });
    }
    if (!allowedRoles.includes(req.user.role)) {
        return res.status(403).json({ message: "Insufficient permissions" });
    }
    next();
};

export const requireSelfOrRole = (paramName, ...allowedRoles) => (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ message: "Authentication required" });
    }
    const targetId = req.params[paramName];
    const isSelf = targetId === "current" || targetId === req.user._id;
    if (isSelf || allowedRoles.includes(req.user.role)) {
        return next();
    }
    return res.status(403).json({ message: "Insufficient permissions" });
};
