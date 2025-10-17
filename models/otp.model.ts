export interface OTP {
  id: number;
  email: string;
  otp_code: string;
  expires_at: Date;
}
