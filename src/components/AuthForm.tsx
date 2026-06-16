"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Onboarding choices captured at sign-up and stored on the profile.
const INTERESTS = [
  { id: "history", label: "History & heritage" },
  { id: "food", label: "Food & cafes" },
  { id: "nature", label: "Nature & outdoors" },
  { id: "beaches", label: "Beaches" },
  { id: "nightlife", label: "Nightlife" },
  { id: "art", label: "Art & museums" },
  { id: "adventure", label: "Adventure" },
  { id: "shopping", label: "Shopping" },
] as const;

const TRAVEL_STYLES = [
  { id: "budget", label: "Budget" },
  { id: "balanced", label: "Balanced" },
  { id: "luxury", label: "Luxury" },
] as const;

type Mode = "login" | "signup";

export function AuthForm({ initialError }: { initialError?: string }) {
  const router = useRouter();
  const supabase = createClient();

  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [interests, setInterests] = useState<string[]>([]);
  const [travelStyle, setTravelStyle] = useState<string>("balanced");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(initialError ?? null);
  const [info, setInfo] = useState<string | null>(null);

  function reset() {
    setError(null);
    setInfo(null);
  }

  function toggleInterest(id: string) {
    setInterests((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  async function handleLogin(e: FormEvent) {
    e.preventDefault();
    reset();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setLoading(false);
      setError(error.message);
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  async function handleSignup(e: FormEvent) {
    e.preventDefault();
    reset();
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    setLoading(true);
    const preferences = { interests, travel_style: travelStyle };
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
        data: { full_name: fullName, preferences, home_currency: "INR" },
      },
    });
    if (error) {
      setLoading(false);
      setError(error.message);
      return;
    }
    // Email confirmation OFF → a session is returned, so persist preferences now.
    if (data.session && data.user) {
      await supabase
        .from("profiles")
        .update({ full_name: fullName, preferences, home_currency: "INR" })
        .eq("id", data.user.id);
      router.push("/dashboard");
      router.refresh();
      return;
    }
    // Email confirmation ON → preferences are synced in /auth/callback.
    setLoading(false);
    setInfo("Check your email to confirm your account, then sign in.");
    setMode("login");
  }

  async function handleGoogle() {
    reset();
    setLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) {
      setLoading(false);
      setError(error.message);
    }
    // On success the browser is redirected to Google — nothing more to do here.
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1.5">
        <h1 className="text-2xl font-semibold tracking-tight">Welcome to Roamio</h1>
        <p className="text-sm text-muted-foreground">
          Plan smarter trips with an AI travel companion in your pocket.
        </p>
      </div>

      {error && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {info && (
        <div
          role="status"
          className="flex items-start gap-2 rounded-md border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-700"
        >
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{info}</span>
        </div>
      )}

      <Tabs value={mode} onValueChange={(v) => { reset(); setMode(v as Mode); }}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="login">Log in</TabsTrigger>
          <TabsTrigger value="signup">Sign up</TabsTrigger>
        </TabsList>

        {/* ---- LOGIN ---- */}
        <TabsContent value="login" className="mt-6">
          <form onSubmit={handleLogin} className="space-y-4">
            <Field label="Email" htmlFor="login-email">
              <Input
                id="login-email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
              />
            </Field>
            <Field label="Password" htmlFor="login-password">
              <Input
                id="login-password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
            </Field>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Log in
            </Button>
          </form>
        </TabsContent>

        {/* ---- SIGN UP ---- */}
        <TabsContent value="signup" className="mt-6">
          <form onSubmit={handleSignup} className="space-y-4">
            <Field label="Full name" htmlFor="signup-name">
              <Input
                id="signup-name"
                type="text"
                autoComplete="name"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Aarav Sharma"
              />
            </Field>
            <Field label="Email" htmlFor="signup-email">
              <Input
                id="signup-email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
              />
            </Field>
            <Field label="Password" htmlFor="signup-password" hint="At least 8 characters">
              <Input
                id="signup-password"
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
            </Field>

            <div className="space-y-2">
              <p className="text-sm font-medium">What do you love when you travel?</p>
              <div className="flex flex-wrap gap-2">
                {INTERESTS.map((interest) => {
                  const active = interests.includes(interest.id);
                  return (
                    <button
                      key={interest.id}
                      type="button"
                      onClick={() => toggleInterest(interest.id)}
                      aria-pressed={active}
                      className={cn(
                        "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                        active
                          ? "border-transparent bg-primary text-primary-foreground"
                          : "border-input bg-background hover:bg-accent"
                      )}
                    >
                      {interest.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium">Travel style</p>
              <div className="grid grid-cols-3 gap-2">
                {TRAVEL_STYLES.map((style) => {
                  const active = travelStyle === style.id;
                  return (
                    <button
                      key={style.id}
                      type="button"
                      onClick={() => setTravelStyle(style.id)}
                      aria-pressed={active}
                      className={cn(
                        "rounded-md border px-3 py-2 text-sm font-medium transition-colors",
                        active
                          ? "border-transparent bg-primary text-primary-foreground"
                          : "border-input bg-background hover:bg-accent"
                      )}
                    >
                      {style.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Create account
            </Button>
          </form>
        </TabsContent>
      </Tabs>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">or</span>
        </div>
      </div>

      <Button
        type="button"
        variant="outline"
        className="w-full"
        onClick={handleGoogle}
        disabled={loading}
      >
        <GoogleIcon />
        Continue with Google
      </Button>

      <p className="text-center text-xs text-muted-foreground">
        By continuing you agree to Roamio&apos;s Terms and Privacy Policy.
      </p>
    </div>
  );
}

function Field({
  label,
  htmlFor,
  hint,
  children,
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between">
        <label htmlFor={htmlFor} className="text-sm font-medium">
          {label}
        </label>
        {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
      </div>
      {children}
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1Z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 1.39 14.97.4 12 .4A11 11 0 0 0 2.18 7.06L5.84 9.9C6.71 7.3 9.14 4.75 12 4.75Z"
      />
    </svg>
  );
}
