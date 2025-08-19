import crypto from "crypto";

export function generateUniqueReferralId(email) {
  const hash = crypto.createHash('sha256').update(email).digest('hex');
  const uniqueId = hash.slice(0, 15);
  return uniqueId;
}
