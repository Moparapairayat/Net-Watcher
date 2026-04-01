export type PasswordRule = {
  id: "length" | "upper" | "lower" | "number" | "symbol";
  label: string;
  met: boolean;
};

export type PasswordStrength = {
  score: 0 | 1 | 2 | 3 | 4;
  label: "Too weak" | "Weak" | "Fair" | "Good" | "Strong";
  accentClassName: string;
  meterClassName: string;
  rules: PasswordRule[];
  suggestions: string[];
};

const passwordRules = (value: string): PasswordRule[] => [
  { id: "length", label: "At least 8 characters", met: value.length >= 8 },
  { id: "upper", label: "An uppercase letter", met: /[A-Z]/.test(value) },
  { id: "lower", label: "A lowercase letter", met: /[a-z]/.test(value) },
  { id: "number", label: "A number", met: /\d/.test(value) },
  { id: "symbol", label: "A symbol", met: /[^A-Za-z0-9]/.test(value) },
];

export function evaluatePasswordStrength(value: string): PasswordStrength {
  const trimmed = value.trim();
  const rules = passwordRules(value);
  const metCount = rules.filter((rule) => rule.met).length;
  const hasLongLength = value.length >= 12;

  let score: PasswordStrength["score"] = 0;
  if (trimmed.length === 0) {
    score = 0;
  } else if (value.length < 8 || metCount <= 2) {
    score = 1;
  } else if (metCount === 3) {
    score = 2;
  } else if (metCount >= 4 && !hasLongLength) {
    score = 3;
  } else {
    score = 4;
  }

  const labelMap: Record<PasswordStrength["score"], PasswordStrength["label"]> = {
    0: "Too weak",
    1: "Weak",
    2: "Fair",
    3: "Good",
    4: "Strong",
  };

  const accentClassMap: Record<PasswordStrength["score"], string> = {
    0: "text-slate-500",
    1: "text-rose-400",
    2: "text-amber-300",
    3: "text-cyan-300",
    4: "text-emerald-300",
  };

  const meterClassMap: Record<PasswordStrength["score"], string> = {
    0: "from-slate-700 to-slate-600",
    1: "from-rose-500 to-rose-400",
    2: "from-amber-500 to-amber-300",
    3: "from-sky-500 to-cyan-300",
    4: "from-emerald-500 to-teal-300",
  };

  const suggestions: string[] = rules.filter((rule) => !rule.met).map((rule) => {
    switch (rule.id) {
      case "length":
        return "Use at least 8 characters; 12+ is noticeably stronger.";
      case "upper":
        return "Add an uppercase letter to reduce predictability.";
      case "lower":
        return "Add a lowercase letter for better character mix.";
      case "number":
        return "Add a number to strengthen the password.";
      case "symbol":
        return "Add a symbol like ! @ # $ for more entropy.";
    }
  });

  if (value.length >= 8 && value.length < 12 && suggestions.length < 3) {
    suggestions.unshift("Longer passwords are harder to crack. Aim for 12 or more characters.");
  }

  return {
    score,
    label: labelMap[score],
    accentClassName: accentClassMap[score],
    meterClassName: meterClassMap[score],
    rules,
    suggestions,
  };
}
