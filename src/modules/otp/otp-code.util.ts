import { createHash } from 'crypto';

/** OTP numérico de 6 dígitos para flujos por correo (login 2FA, registro, etc.). */
export function generateSixDigitNumericOtp(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export function hashOtpCode(
  challengeToken: string,
  otpCode: string,
  pepper: string,
): string {
  return createHash('sha256')
    .update(`${challengeToken}:${otpCode}:${pepper}`)
    .digest('hex');
}
