import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function formatDatabaseUrl(url?: string): string | undefined {
  if (!url) return undefined;
  let formatted = url;
  if (formatted.includes("-pooler") && !formatted.includes("pgbouncer=true")) {
    const sep = formatted.includes("?") ? "&" : "?";
    formatted = `${formatted}${sep}pgbouncer=true`;
  }
  if (!formatted.includes("connect_timeout")) {
    const sep = formatted.includes("?") ? "&" : "?";
    formatted = `${formatted}${sep}connect_timeout=30&pool_timeout=30`;
  }
  return formatted;
}

const resolvedDbUrl = formatDatabaseUrl(process.env.DATABASE_URL);

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
    datasources: resolvedDbUrl
      ? {
          db: {
            url: resolvedDbUrl,
          },
        }
      : undefined,
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
