export interface User {
  id: number;
  email: string;
  name: string;
  password_hash: string;
  is_verified: boolean;
  created_at?: string;
}
