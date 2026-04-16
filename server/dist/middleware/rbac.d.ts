import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth.js';
export declare function requireAuth(req: AuthRequest, res: Response, next: NextFunction): void;
export declare function requireAdmin(req: AuthRequest, res: Response, next: NextFunction): void;
export declare function requireBaker(req: AuthRequest, res: Response, next: NextFunction): void;
//# sourceMappingURL=rbac.d.ts.map