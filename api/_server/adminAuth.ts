import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import { storage } from "./storage.js";

export async function createAdminUser(email: string, password: string) {
  const existingUser = await storage.getAdminUserByEmail(email);
  if (existingUser) {
    return existingUser;
  }

  return await storage.createAdminUser({
    email,
    passwordHash: password, // Will be hashed in storage layer
  });
}

export async function authenticateAdmin(email: string, password: string) {
  const user = await storage.getAdminUserByEmail(email);
  if (!user) {
    return null;
  }

  const isValid = await bcrypt.compare(password, user.passwordHash);
  if (!isValid) {
    return null;
  }

  // Update last login
  await storage.updateAdminLastLogin(user.id);

  return user;
}

export async function createAdminSession(adminUserId: string) {
  const token = randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

  return await storage.createAdminSession({
    adminUserId,
    token,
    expiresAt,
  });
}

export async function validateAdminSession(token: string) {
  return await storage.getValidAdminSession(token);
}

export async function deleteAdminSession(token: string) {
  await storage.deleteAdminSession(token);
}