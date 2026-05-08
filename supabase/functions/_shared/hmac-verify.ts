import { createHmac } from "crypto";

function verifyHmacSignature(payload: string, signature: string, secret: string): boolean {
  const hmac = createHmac("sha256", secret);
  hmac.update(payload);
  const expected = "sha256=" + hmac.digest("hex");
  return expected === signature;
}