// TOTP (authenticator-app) helpers for optional 2FA.
import { authenticator } from "otplib";
import QRCode from "qrcode";

const ISSUER = "GSDN Tracker";

export function generateTotpSecret(): string {
  return authenticator.generateSecret();
}

export function totpKeyUri(account: string, secret: string): string {
  return authenticator.keyuri(account, ISSUER, secret);
}

export function qrDataUrl(uri: string): Promise<string> {
  return QRCode.toDataURL(uri, { margin: 1, width: 220 });
}

export function verifyTotp(token: string, secret: string): boolean {
  try {
    return authenticator.verify({ token: token.replace(/\s/g, ""), secret });
  } catch {
    return false;
  }
}
