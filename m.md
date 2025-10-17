API Endpoints
- `POST /auth/register`: Body: `{email, password, name}` → Registers user and sends OTP.
- `POST /auth/login`: Body: `{email, password}` → Logs in if verified.
- `POST /auth/send-otp`: Body: `{email}` → Resends OTP.
- `POST /auth/verify-otp`: Body: `{email, otp}` → Verifies account.
