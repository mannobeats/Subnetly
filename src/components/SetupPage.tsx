"use client";

import { AlertCircle, Loader2, Wifi } from "lucide-react";
import { type FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";

interface SetupPageProps {
  onSetupComplete: () => void;
}

export default function SetupPage({ onSetupComplete }: SetupPageProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleCreateOwner = async (e: FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    if (password.length < 10) {
      setError("Password must be at least 10 characters");
      return;
    }
    setLoading(true);
    try {
      const response = await fetch("/api/auth/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          password,
        }),
      });
      const result = await response.json();
      if (!response.ok || !result.setup) {
        setError(result.error || "Failed to create owner account");
        return;
      }

      const signInResult = await authClient.signIn.email({
        email: email.trim().toLowerCase(),
        password,
      });
      if (signInResult.error) {
        setError(
          signInResult.error.message ||
            "Owner created, but auto sign-in failed. Please sign in manually.",
        );
        return;
      }

      onSetupComplete();
    } catch {
      setError("Failed to create owner account");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="flex min-h-screen items-center justify-center p-4"
      style={{ background: "var(--gradient-login-bg)" }}
    >
      <div
        className={cn(
          "w-full max-w-[440px] rounded-xl border border-border bg-card p-10",
          "shadow-[0_4px_6px_-1px_rgba(0,0,0,0.05),0_20px_25px_-5px_rgba(0,0,0,0.08)]",
          "animate-in fade-in slide-in-from-bottom-1 duration-300",
        )}
      >
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-[14px] bg-linear-to-br from-(--blue) to-(--blue-light) text-white">
            <Wifi size={28} />
          </div>
          <h1 className="text-xl font-bold text-foreground mb-1">
            Initial Setup
          </h1>
          <p className="text-[13px] text-muted-foreground">
            Create the owner account to finish bootstrapping Subnetly
          </p>
        </div>

        {error && (
          <div className="mb-6 flex items-center gap-2 rounded-md border border-(--red-border) bg-(--red-bg) p-3 text-xs text-(--red)">
            <AlertCircle size={14} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleCreateOwner} className="space-y-4">
          <div>
            <Label
              htmlFor="owner-name"
              className="mb-2 block text-xs font-semibold text-muted-foreground"
            >
              Display Name
            </Label>
            <Input
              id="owner-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              required
              autoFocus
              autoComplete="name"
              className="h-9 text-[13px]"
            />
          </div>

          <div>
            <Label
              htmlFor="owner-email"
              className="mb-2 block text-xs font-semibold text-muted-foreground"
            >
              Email
            </Label>
            <Input
              id="owner-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              autoComplete="email"
              className="h-9 text-[13px]"
            />
          </div>

          <div>
            <Label
              htmlFor="owner-password"
              className="mb-2 block text-xs font-semibold text-muted-foreground"
            >
              Password
            </Label>
            <Input
              id="owner-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 10 characters"
              required
              minLength={10}
              autoComplete="new-password"
              className="h-9 text-[13px]"
            />
          </div>

          <div>
            <Label
              htmlFor="owner-password-confirm"
              className="mb-2 block text-xs font-semibold text-muted-foreground"
            >
              Confirm Password
            </Label>
            <Input
              id="owner-password-confirm"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm your password"
              required
              minLength={10}
              autoComplete="new-password"
              className="h-9 text-[13px]"
            />
          </div>

          <Button
            type="submit"
            className="mt-2 w-full h-10 text-sm font-semibold"
            disabled={
              loading || !name || !email || !password || !confirmPassword
            }
          >
            {loading ? (
              <>
                <Loader2 size={14} className="animate-spin" /> Creating owner
                account...
              </>
            ) : (
              "Create Owner Account"
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}
