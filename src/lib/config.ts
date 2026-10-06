import { prisma } from "./prisma";

export async function getApiKey(keyName: string = "GOOGLE_MAPS_API_KEY"): Promise<string | null> {
  // 1. Check process.env first
  const envVal = process.env[keyName];
  if (envVal && envVal.trim().length > 0) {
    return envVal.trim();
  }

  // 2. Check database ApiSetting table
  try {
    const setting = await prisma.apiSetting.findUnique({
      where: { key: keyName },
    });
    if (setting && setting.value && setting.value.trim().length > 0) {
      return setting.value.trim();
    }
  } catch (err) {
    console.error(`Error querying ApiSetting for ${keyName}:`, err);
  }

  return null;
}

export async function setApiKey(keyName: string, value: string, description?: string): Promise<void> {
  await prisma.apiSetting.upsert({
    where: { key: keyName },
    create: {
      key: keyName,
      value: value.trim(),
      is_secret: true,
      description: description || `API key for ${keyName}`,
    },
    update: {
      value: value.trim(),
      description: description || `API key for ${keyName}`,
    },
  });
}

export async function getApiSettingsStatus(): Promise<{
  googleMapsConfigured: boolean;
  googleMapsSource: "ENV" | "DATABASE" | "NONE";
  maskedKey: string | null;
}> {
  const envKey = process.env.GOOGLE_MAPS_API_KEY?.trim();
  if (envKey) {
    return {
      googleMapsConfigured: true,
      googleMapsSource: "ENV",
      maskedKey: maskKey(envKey),
    };
  }

  try {
    const dbSetting = await prisma.apiSetting.findUnique({
      where: { key: "GOOGLE_MAPS_API_KEY" },
    });
    if (dbSetting?.value?.trim()) {
      return {
        googleMapsConfigured: true,
        googleMapsSource: "DATABASE",
        maskedKey: maskKey(dbSetting.value.trim()),
      };
    }
  } catch (err) {
    console.error("Error reading api settings status:", err);
  }

  return {
    googleMapsConfigured: false,
    googleMapsSource: "NONE",
    maskedKey: null,
  };
}

export function maskKey(key: string): string {
  if (key.length <= 8) return "••••••••";
  return key.slice(0, 4) + "••••••••" + key.slice(-4);
}
