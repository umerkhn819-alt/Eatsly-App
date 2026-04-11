import bcrypt from "bcrypt";
import jwt, { type Secret, type SignOptions } from "jsonwebtoken";
import { MongoServerError } from "mongodb";
import { env } from "../config/env.js";
import {
  PASSWORD_MIN_LENGTH,
  type UserDocument,
  type UserRole,
} from "../domain/user.js";
import { HttpError } from "../middleware/errorHandler.js";
import * as usersRepo from "../repos/usersRepo.js";

const BCRYPT_ROUNDS = 12;

type JwtPayload = {
  sub: string;
};

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function assertPasswordPolicy(password: string): void {
  if (password.length < PASSWORD_MIN_LENGTH) {
    throw new HttpError(
      400,
      `Password must be at least ${PASSWORD_MIN_LENGTH} characters`,
    );
  }
}

function assertEmailShape(email: string): string {
  const normalized = normalizeEmail(email);
  if (normalized.length === 0) {
    throw new HttpError(400, "Email is required");
  }
  if (normalized.length > 254) {
    throw new HttpError(400, "Email is too long");
  }
  const basic = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!basic.test(normalized)) {
    throw new HttpError(400, "Invalid email format");
  }
  return normalized;
}

function signAccessToken(userId: string): string {
  const payload: JwtPayload = { sub: userId };
  const options: SignOptions = {
    expiresIn: env.JWT_EXPIRES_IN as SignOptions["expiresIn"],
  };
  return jwt.sign(payload, env.JWT_SECRET as Secret, options);
}

function publicUser(user: UserDocument) {
  return {
    id: user._id.toHexString(),
    email: user.email,
    role: user.role,
    createdAt: user.createdAt.toISOString(),
  };
}

export async function register(input: {
  email: string;
  password: string;
}): Promise<{ token: string; user: ReturnType<typeof publicUser> }> {
  const email = assertEmailShape(input.email);
  assertPasswordPolicy(input.password);

  const role: UserRole = "user";

  const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);

  try {
    const { id } = await usersRepo.insertUser({ email, passwordHash, role });
    const token = signAccessToken(id);
    const created = await usersRepo.findUserById(id);
    if (!created) {
      throw new HttpError(500, "User was not found after registration");
    }
    return { token, user: publicUser(created) };
  } catch (err) {
    if (err instanceof MongoServerError && err.code === 11000) {
      throw new HttpError(409, "An account with this email already exists");
    }
    throw err;
  }
}

export async function login(input: {
  email: string;
  password: string;
}): Promise<{ token: string; user: ReturnType<typeof publicUser> }> {
  const email = assertEmailShape(input.email);
  if (input.password.length === 0) {
    throw new HttpError(400, "Password is required");
  }

  const user = await usersRepo.findUserByEmail(email);
  if (!user) {
    throw new HttpError(401, "Invalid email or password");
  }

  const passwordOk = await bcrypt.compare(input.password, user.passwordHash);
  if (!passwordOk) {
    throw new HttpError(401, "Invalid email or password");
  }

  const token = signAccessToken(user._id.toHexString());
  return { token, user: publicUser(user) };
}

export function verifyAccessToken(token: string): JwtPayload {
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET);
    if (typeof decoded !== "object" || decoded === null) {
      throw new HttpError(401, "Invalid token");
    }
    const sub = (decoded as { sub?: unknown }).sub;
    if (typeof sub !== "string" || sub.length === 0) {
      throw new HttpError(401, "Invalid token");
    }
    return { sub };
  } catch (err) {
    if (err instanceof HttpError) {
      throw err;
    }
    throw new HttpError(401, "Invalid or expired token");
  }
}

export async function ensureBootstrapAdmin(input: {
  email: string;
  password: string;
}): Promise<void> {
  const email = assertEmailShape(input.email);
  assertPasswordPolicy(input.password);

  const existing = await usersRepo.findUserByEmail(email);
  if (existing) {
    if (existing.role !== "admin") {
      await usersRepo.updateUserRole(existing._id.toHexString(), "admin");
      console.info(`[bootstrap] promoted ${email} to admin`);
    }
    return;
  }

  const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);
  await usersRepo.insertUser({
    email,
    passwordHash,
    role: "admin",
  });
  console.info(`[bootstrap] created admin account ${email}`);
}
