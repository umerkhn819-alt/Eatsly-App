import type { UserRole } from "../domain/user.js";

declare global {
  namespace Express {
    interface Request {
      authUser?: {
        id: string;
        email: string;
        role: UserRole;
      };
    }
  }
}

export {};
