"use client";

import { Eye, EyeOff } from "lucide-react";
import { useActionState, useState } from "react";
import { login, type LoginState } from "./actions";

const initial: LoginState = { error: null };

export function LoginForm() {
  const [state, action, pending] = useActionState(login, initial);
  const [show, setShow] = useState(false);

  return (
    <form action={action} className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <label htmlFor="username" className="text-sm text-ink-2">
          Username
        </label>
        <input
          id="username"
          name="username"
          type="text"
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          enterKeyHint="next"
          required
          className="field"
        />
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="current-password" className="text-sm text-ink-2">
          Password
        </label>
        <div className="relative">
          <input
            id="current-password"
            name="password"
            type={show ? "text" : "password"}
            autoComplete="current-password"
            enterKeyHint="done"
            required
            className="field pe-12"
          />
          <button
            type="button"
            onClick={() => setShow((v) => !v)}
            aria-label={show ? "Hide password" : "Show password"}
            aria-pressed={show}
            className="absolute inset-y-0 end-0 grid w-11 place-items-center rounded-control text-ink-3 transition-colors hover:text-ink"
          >
            {show ? <EyeOff size={18} strokeWidth={1.5} /> : <Eye size={18} strokeWidth={1.5} />}
          </button>
        </div>
      </div>

      <p role="alert" className="min-h-5 text-sm text-negative">
        {state.error}
      </p>

      <button type="submit" disabled={pending} className="btn btn-primary">
        {pending ? "Signing in" : "Sign in"}
      </button>
    </form>
  );
}
