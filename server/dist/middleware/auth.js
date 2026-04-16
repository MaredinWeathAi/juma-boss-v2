import jwt from 'jsonwebtoken';
const JWT_SECRET = process.env.JWT_SECRET || 'juma-boss-secret-key-v2';
export function authMiddleware(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.status(401).json({ error: 'Missing or invalid authorization header' });
        return;
    }
    const token = authHeader.substring(7);
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = {
            id: decoded.id,
            email: decoded.email,
            name: decoded.name,
            role: decoded.role,
        };
        next();
    }
    catch (err) {
        res.status(401).json({ error: 'Invalid or expired token' });
    }
}
export function generateToken(userId, email, name, role) {
    return jwt.sign({ id: userId, email, name, role }, JWT_SECRET, { expiresIn: '7d' });
}
//# sourceMappingURL=auth.js.map