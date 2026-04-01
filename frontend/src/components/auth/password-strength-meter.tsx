import { CheckCircle2, Circle } from "lucide-react";
import { evaluatePasswordStrength } from "@/lib/password-strength";
import { cn } from "@/lib/utils";

type PasswordStrengthMeterProps = {
  password: string;
  compact?: boolean;
};

export function PasswordStrengthMeter({ password, compact = false }: PasswordStrengthMeterProps) {
  const strength = evaluatePasswordStrength(password);
  const activeBars = Math.max(strength.score, password ? 1 : 0);

  return (
    <div className={cn("auth-password-meter", compact && "auth-password-meter-compact")}>
      <div className="flex items-center justify-between gap-3">
        <p className="text-[0.74rem] font-semibold uppercase tracking-[0.22em] text-slate-500">Password strength</p>
        <p className={cn("text-sm font-semibold", strength.accentClassName)}>{strength.label}</p>
      </div>

      <div className="mt-3 grid grid-cols-4 gap-2">
        {Array.from({ length: 4 }).map((_, index) => (
          <span
            key={index}
            className={cn(
              "h-1.5 rounded-full bg-slate-800/80 transition-all duration-200",
              index < activeBars && `bg-gradient-to-r ${strength.meterClassName}`,
            )}
          />
        ))}
      </div>

      <div className={cn("mt-3 grid gap-2 sm:grid-cols-2", compact && "sm:grid-cols-1")}>
        {strength.rules.map((rule) => (
          <div key={rule.id} className={cn("flex items-center gap-2 text-sm text-slate-400", compact && "text-[0.82rem]")}>
            {rule.met ? <CheckCircle2 className="h-4 w-4 text-emerald-300" /> : <Circle className="h-4 w-4 text-slate-600" />}
            <span>{rule.label}</span>
          </div>
        ))}
      </div>

      {strength.suggestions.length ? (
        <div className="auth-password-suggestion-box mt-3">
          <p className="text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-slate-500">Suggestions</p>
          <ul className={cn("mt-2 grid gap-1.5 text-sm text-slate-400", compact && "text-[0.82rem]")}>
            {strength.suggestions.slice(0, 3).map((suggestion) => (
              <li key={suggestion} className="flex gap-2">
                <span className="mt-[0.35rem] h-1.5 w-1.5 rounded-full bg-sky-400/80" aria-hidden="true" />
                <span>{suggestion}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
