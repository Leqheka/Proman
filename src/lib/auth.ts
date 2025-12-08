import crypto from "crypto";

export function hashPassword(password: string, salt?: string) {
  const s = salt || crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, s, 64).toString("hex");
  return `${s}:${hash}`;
}

export function verifyPassword(password: string, stored: string | null | undefined) {
  if (!stored) return false;
  const [s, h] = stored.split(":");
  const computed = crypto.scryptSync(password, s, 64).toString("hex");
  return crypto.timingSafeEqual(Buffer.from(h, "hex"), Buffer.from(computed, "hex"));
}

function getSecret() {
  const v = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || "dev-secret";
  return v;
}

export function signSession(payload: any, expSeconds = 60 * 60 * 24 * 7) {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const now = Math.floor(Date.now() / 1000);
  const body = Buffer.from(JSON.stringify({ ...payload, iat: now, exp: now + expSeconds })).toString("base64url");
  const data = `${header}.${body}`;
  const sig = crypto.createHmac("sha256", getSecret()).update(data).digest("base64url");
  return `${data}.${sig}`;
}

export function verifySession(token: string) {
  try {
    const [h, b, s] = token.split(".");
    const data = `${h}.${b}`;
    const sig = crypto.createHmac("sha256", getSecret()).update(data).digest("base64url");
    if (sig !== s) return null;
    const json = JSON.parse(Buffer.from(b, "base64url").toString("utf8"));
    if (typeof json?.exp === "number" && json.exp < Math.floor(Date.now() / 1000)) return null;
    return json;
  } catch {
    return null;
  }
}

