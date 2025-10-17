// Generate random team code (8 characters)
export function generateTeamCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Exclude confusing characters
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// Simple password hashing (in production, use bcrypt)
export async function hashPassword(password: string): Promise<string> {
  // For simplicity, we'll use a basic hash. In production, use bcrypt
  const crypto = await import('crypto');
  return crypto.createHash('sha256').update(password).digest('hex');
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const hashedPassword = await hashPassword(password);
  return hashedPassword === hash;
}
