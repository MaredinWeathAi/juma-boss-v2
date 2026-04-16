export function requireAuth(req, res, next) {
    if (!req.user) {
        res.status(401).json({ error: 'Authentication required' });
        return;
    }
    next();
}
export function requireAdmin(req, res, next) {
    if (!req.user) {
        res.status(401).json({ error: 'Authentication required' });
        return;
    }
    if (req.user.role !== 'admin') {
        res.status(403).json({ error: 'Admin role required' });
        return;
    }
    next();
}
export function requireBaker(req, res, next) {
    if (!req.user) {
        res.status(401).json({ error: 'Authentication required' });
        return;
    }
    if (req.user.role !== 'baker') {
        res.status(403).json({ error: 'Baker role required' });
        return;
    }
    next();
}
//# sourceMappingURL=rbac.js.map