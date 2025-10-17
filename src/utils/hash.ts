import bcrypt from "bcrypt";

const SALT_ROUNDS = 10;

export const hash = async (value: string) => bcrypt.hash(value, SALT_ROUNDS);

export const verifyHash = async (value: string, hashed: string) => bcrypt.compare(value, hashed);

export const secureCompare = (a: string, b: string): boolean => {
  const length = Math.max(a.length, b.length);
  let result = 0;
  for (let i = 0; i < length; i++) {
    result |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  }
  return result === 0 && a.length === b.length;
};
