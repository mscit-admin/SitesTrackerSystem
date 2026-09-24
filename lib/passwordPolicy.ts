// Configurable password strength policy (set from Settings), enforced wherever a
// password is created or changed.
import { prisma } from "@/lib/prisma";

export interface PasswordPolicy {
  minLength: number;
  minDigits: number;
  minLetters: number;
  requireUppercase: boolean; // Latin A-Z
  requireLowercase: boolean; // Latin a-z
  requireSymbol: boolean;
  allowSymbols: boolean;
  // languageCode -> whether that language's letters are allowed inside passwords
  langLetters: Record<string, boolean>;
}

export const PASSWORD_POLICY_DEFAULTS: PasswordPolicy = {
  minLength: 8,
  minDigits: 1,
  minLetters: 1,
  requireUppercase: false,
  requireLowercase: false,
  requireSymbol: false,
  allowSymbols: true,
  langLetters: {},
};

const KEY = "passwordPolicy";

// --- script ranges per language ---
const LATIN = "A-Za-z\\u00C0-\\u024F";
const ARABIC = "\\u0600-\\u06FF\\u0750-\\u077F\\u08A0-\\u08FF\\uFB50-\\uFDFF\\uFE70-\\uFEFF";
const CYRILLIC = "\\u0400-\\u04FF";
const SCRIPT_RANGE: Record<string, string> = { latin: LATIN, arabic: ARABIC, cyrillic: CYRILLIC };
const CYRILLIC_CODES = new Set(["ru", "uk", "be", "bg", "sr", "mk", "kk"]);

export function scriptForCode(code: string): "latin" | "arabic" | "cyrillic" {
  const c = code.toLowerCase();
  if (c === "ar" || c.startsWith("ar") || c === "fa" || c === "ur") return "arabic";
  if (CYRILLIC_CODES.has(c)) return "cyrillic";
  return "latin";
}

const DIGITS = /[0-9٠-٩۰-۹]/; // ASCII + Arabic-Indic digits
const ANY_LETTER = new RegExp(`[${LATIN}${ARABIC}${CYRILLIC}]`);

export async function getPasswordPolicy(): Promise<PasswordPolicy> {
  const row = await prisma.appSetting.findUnique({ where: { key: KEY } });
  if (!row) return { ...PASSWORD_POLICY_DEFAULTS };
  try {
    const p = JSON.parse(row.value);
    return { ...PASSWORD_POLICY_DEFAULTS, ...p, langLetters: p.langLetters ?? {} };
  } catch {
    return { ...PASSWORD_POLICY_DEFAULTS };
  }
}

export async function setPasswordPolicy(p: PasswordPolicy): Promise<void> {
  const clean: PasswordPolicy = {
    minLength: clamp(p.minLength, 4, 128),
    minDigits: clamp(p.minDigits, 0, 64),
    minLetters: clamp(p.minLetters, 0, 64),
    requireUppercase: !!p.requireUppercase,
    requireLowercase: !!p.requireLowercase,
    requireSymbol: !!p.requireSymbol,
    allowSymbols: !!p.allowSymbols,
    langLetters: p.langLetters ?? {},
  };
  await prisma.appSetting.upsert({ where: { key: KEY }, update: { value: JSON.stringify(clean) }, create: { key: KEY, value: JSON.stringify(clean) } });
}

const clamp = (v: number, lo: number, hi: number) => (Number.isFinite(v) ? Math.min(hi, Math.max(lo, Math.round(v))) : lo);

/** Which scripts are allowed, based on enabled languages + the policy toggles. */
async function allowedScriptRegex(policy: PasswordPolicy): Promise<RegExp | null> {
  const langs = await prisma.language.findMany({ where: { isEnabled: true }, select: { code: true } });
  const scripts = new Set<string>();
  for (const l of langs) {
    if (policy.langLetters[l.code] === false) continue; // explicitly denied
    scripts.add(scriptForCode(l.code));
  }
  if (scripts.size === 0) return null; // no allowed letter script
  const ranges = [...scripts].map((s) => SCRIPT_RANGE[s]).join("");
  return new RegExp(`[${ranges}]`);
}

/** Validate a password against the active policy. Returns an Arabic error, or null. */
export async function validatePassword(pw: string): Promise<string | null> {
  const policy = await getPasswordPolicy();
  if (pw.length < policy.minLength) return `كلمة المرور ${policy.minLength} أحرف على الأقل`;

  const allowedLetters = await allowedScriptRegex(policy);
  let digits = 0, letters = 0, symbols = 0;

  for (const ch of pw) {
    if (DIGITS.test(ch)) { digits++; continue; }
    if (/\s/.test(ch)) return "لا يُسمح بالمسافات في كلمة المرور";
    if (ANY_LETTER.test(ch)) {
      if (!allowedLetters || !allowedLetters.test(ch)) return "تحتوي كلمة المرور على حروف بلغة غير مسموح بها";
      letters++;
      continue;
    }
    // anything else is a symbol
    if (!policy.allowSymbols) return "لا يُسمح باستخدام الرموز في كلمة المرور";
    symbols++;
  }

  if (letters < policy.minLetters) return `يجب أن تحتوي على ${policy.minLetters} حرفاً على الأقل`;
  if (digits < policy.minDigits) return `يجب أن تحتوي على ${policy.minDigits} رقماً على الأقل`;
  if (policy.requireUppercase && !/[A-Z]/.test(pw)) return "يجب أن تحتوي على حرف لاتيني كبير (A-Z)";
  if (policy.requireLowercase && !/[a-z]/.test(pw)) return "يجب أن تحتوي على حرف لاتيني صغير (a-z)";
  if (policy.requireSymbol && symbols < 1) return "يجب أن تحتوي على رمز واحد على الأقل";
  return null;
}

/** Human-readable Arabic summary of the policy (for hints). */
export function describePolicy(p: PasswordPolicy, langNames: Record<string, string> = {}): string {
  const parts: string[] = [`${p.minLength} أحرف على الأقل`];
  if (p.minLetters > 0) parts.push(`${p.minLetters} حرف`);
  if (p.minDigits > 0) parts.push(`${p.minDigits} رقم`);
  if (p.requireUppercase) parts.push("حرف كبير");
  if (p.requireLowercase) parts.push("حرف صغير");
  if (p.requireSymbol) parts.push("رمز");
  else if (!p.allowSymbols) parts.push("بدون رموز");
  return parts.join("، ");
}
