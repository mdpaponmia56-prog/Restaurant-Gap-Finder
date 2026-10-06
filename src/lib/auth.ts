import { prisma } from "./prisma";
import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const JWT_SECRET_STRING = process.env.JWT_SECRET || "restaurant-gap-finder-jwt-secret-replace-with-secure-key";
const JWT_SECRET = new TextEncoder().encode(JWT_SECRET_STRING);
const COOKIE_NAME = "rgf_session_token";

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: string;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function createSessionToken(user: AuthUser): Promise<string> {
  return new SignJWT({
    userId: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(JWT_SECRET);
}

export async function verifySessionToken(token: string): Promise<AuthUser | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    if (!payload.userId || typeof payload.userId !== "string") return null;

    return {
      id: payload.userId,
      email: (payload.email as string) || "",
      name: (payload.name as string) || "",
      role: (payload.role as string) || "RESEARCHER",
    };
  } catch {
    return null;
  }
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    if (!token) return null;

    const verified = await verifySessionToken(token);
    if (!verified) return null;

    // Verify user still exists in database
    const user = await prisma.user.findUnique({
      where: { id: verified.id },
      select: { id: true, email: true, name: true, role: true },
    });

    return user || null;
  } catch (err) {
    console.error("Error retrieving current user:", err);
    return null;
  }
}

export async function ensureDefaultAdminUser(): Promise<AuthUser> {
  const count = await prisma.user.count();
  if (count === 0) {
    const defaultEmail = "admin@restaurantgapfinder.com";
    const passwordHash = await hashPassword("admin12345");
    const user = await prisma.user.create({
      data: {
        email: defaultEmail,
        passwordHash,
        name: "Lead Research Admin",
        role: "ADMIN",
      },
    });
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    };
  }

  const existing = await prisma.user.findFirst({
    select: { id: true, email: true, name: true, role: true },
  });
  return existing!;
}

export { COOKIE_NAME };
