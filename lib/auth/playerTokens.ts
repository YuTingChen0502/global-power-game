import "server-only";

import { createHash, randomBytes } from "node:crypto";

export function createPlayerToken() {
  return randomBytes(32).toString("base64url");
}

export function hashSecret(secret: string) {
  return createHash("sha256").update(secret, "utf8").digest("hex");
}
