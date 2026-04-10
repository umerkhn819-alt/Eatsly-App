import type { ObjectId } from "mongodb";

export const USER_ROLES = ["user", "admin"] as const;
export type UserRole = (typeof USER_ROLES)[number];

export type UserDocument = {
  _id: ObjectId;
  email: string;
  passwordHash: string;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
};

export const USERS_COLLECTION = "users";

export const PASSWORD_MIN_LENGTH = 10;
