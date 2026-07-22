import { readFileSync } from "fs";
import path from "path";

const RESPONSES_BASE_PATH = path.resolve(__dirname, "../webhook/jsons");

export const normalizeDomain = (domain: string) => {
  if (!domain) {
    return domain;
  }
  // replace colons with dots for Windows-compatible dir names, then strip version suffix
  return domain.replace(/:/g, ".").replace(/\.\d+(?:\.\d+)*$/, "");
};

/**
 * Resolves the domain identifier from a beckn context object.
 * Falls back to networkId if domain is absent.
 */
export const resolveDomain = (context: any): string | undefined => {
  if (!context) {
    return undefined;
  }
  return context.domain || context.network_id || context.networkId;
};

export const readDomainResponse = async (
  domain: string | undefined,
  action: string,
  persona?: string
) => {
  if (!domain) {
    console.warn(`readDomainResponse called with no domain (action: ${action}), returning empty object`);
    return {};
  }
  const normalizedDomain = normalizeDomain(domain);

  // If persona is specified, try persona-specific path first
  if (persona) {
    const personaPath = path.join(
      RESPONSES_BASE_PATH,
      normalizedDomain,
      "response",
      persona,
      `${action}.json`
    );

    try {
      const fileContents = readFileSync(personaPath, "utf-8");
      const parsed = JSON.parse(fileContents);
      return parsed;
    } catch (error: any) {
      if (error?.code !== "ENOENT") {
        throw error;
      }
      // Fall through to default path if persona file not found
    }
  }

  // Default path (backward compatible)
  const targetPath = path.join(
    RESPONSES_BASE_PATH,
    normalizedDomain,
    "response",
    `${action}.json`
  );

  try {
    const fileContents = readFileSync(targetPath, "utf-8");
    const parsed = JSON.parse(fileContents);
    return parsed;
  } catch (error: any) {
    if (error?.code === "ENOENT") {
      console.warn(`File not found: ${targetPath}, returning empty object`);
      return {};
    }
    throw error;
  }
};

