const ALPHABET = "abcdefghijkmnpqrstuvwxyz23456789";

export function newId(length = 10) {
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  let out = "";
  for (const b of bytes) out += ALPHABET[b % ALPHABET.length];
  return out;
}
