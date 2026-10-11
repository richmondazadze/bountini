"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { authClient } from "@/client/account";
import { Button, Banner } from "./ui";
import { useAccount } from "./account-provider";
import { accountHref, type AccountRole } from "@/client/account-flow";
export function AccountForm({
  resetToken,
  destination,
  intendedRole,
}: {
  resetToken?: string;
  destination?: string;
  intendedRole?: AccountRole;
}) {
  const [mode, setMode] = useState<"signin" | "signup" | "forgot">("signin");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const router = useRouter();
  const { me, refresh } = useAccount();
  const continued = useRef(false);
  const callbackURL = destination
    ? accountHref(destination, intendedRole)
    : "/my";
  async function continueAccount() {
    if (intendedRole) {
      const response = await fetch("/api/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ activeRole: intendedRole }),
      });
      if (!response.ok)
        throw new Error(
          "Unable to save your dashboard preference. Please retry.",
        );
      await refresh();
    }
    router.push(destination || "/my");
    router.refresh();
  }
  useEffect(() => {
    if (!me || !destination || resetToken || continued.current) return;
    continued.current = true;
    void continueAccount().catch((e) => {
      setError(e.message);
      continued.current = false;
    });
  }, [me?.user.id, destination, resetToken]);
  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setNotice("");
    setPending(true);
    try {
      const result = resetToken
        ? await authClient.resetPassword({
            token: resetToken,
            newPassword: password,
          })
        : mode === "signup"
          ? await authClient.signUp.email({
              email,
              password,
              name,
              callbackURL,
            })
          : mode === "forgot"
            ? await authClient.requestPasswordReset({
                email,
                redirectTo: "/account/reset",
              })
            : await authClient.signIn.email({
                email,
                password,
                callbackURL,
              });
      if (result.error)
        throw new Error(
          result.error.message || "Unable to complete this request",
        );
      setPassword("");
      if (resetToken) {
        setNotice("Password updated. Sign in with your new password.");
      } else if (mode === "signup") {
        setNotice(
          "Check your inbox to verify your email. The link expires in one hour.",
        );
      } else if (mode === "forgot") {
        setNotice(
          "If that address has an account, a password reset link is on its way.",
        );
      } else {
        await refresh();
        window.dispatchEvent(new Event("bountini-auth-change"));
        if (!destination) await continueAccount();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Please try again");
    } finally {
      setPending(false);
    }
  }
  if (me && !resetToken)
    return (
      <div className="page account-page">
        <h1>Welcome, {me.user.name}.</h1>
        {error && <Banner error>{error}</Banner>}
        {destination ? (
          <Button
            pending={pending}
            onClick={async () => {
              setPending(true);
              setError("");
              try {
                await continueAccount();
              } catch (e) {
                setError(e instanceof Error ? e.message : "Please retry");
              } finally {
                setPending(false);
              }
            }}
          >
            Continue to{" "}
            {destination === "/create" ? "your quest" : "your selected page"}
          </Button>
        ) : (
          <Link className="button primary" href="/my">
            Open your dashboard
          </Link>
        )}
      </div>
    );
  return (
    <div className="page account-page">
      <p className="eyebrow">One account. Two ways to contribute.</p>
      <h1>
        {resetToken
          ? "Choose a new password"
          : mode === "signup"
            ? "Join Bountini."
            : mode === "forgot"
              ? "Reset your password."
              : "Welcome back."}
      </h1>
      <p className="muted">
        Post quests as a Requester or complete them as a Worker. Switch anytime.
      </p>
      {error && <Banner error>{error}</Banner>}
      {notice && <Banner>{notice}</Banner>}
      <form onSubmit={submit} className="account-form">
        {mode === "signup" && !resetToken && (
          <div className="field">
            <label htmlFor="account-name">Display name</label>
            <input
              id="account-name"
              autoComplete="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              minLength={2}
              maxLength={80}
            />
          </div>
        )}
        {!resetToken && (
          <div className="field">
            <label htmlFor="account-email">Email</label>
            <input
              id="account-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              maxLength={254}
            />
          </div>
        )}
        {(resetToken || mode !== "forgot") && (
          <div className="field">
            <label htmlFor="account-password">
              {resetToken ? "New password" : "Password"}
            </label>
            <input
              id="account-password"
              type="password"
              autoComplete={
                mode === "signup" || resetToken
                  ? "new-password"
                  : "current-password"
              }
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={mode === "signup" || resetToken ? 12 : 1}
              maxLength={128}
            />
            {(mode === "signup" || resetToken) && (
              <p className="helper">
                At least 12 characters. A unique passphrase works well.
              </p>
            )}
          </div>
        )}
        <Button pending={pending} type="submit">
          {resetToken
            ? "Update password"
            : mode === "signup"
              ? "Create account"
              : mode === "forgot"
                ? "Send recovery link"
                : "Sign in"}
        </Button>
      </form>
      {resetToken ? (
        <Link href="/account">Back to sign in</Link>
      ) : (
        <div className="account-links">
          <Button
            variant="quiet"
            onClick={() => {
              setMode(mode === "signup" ? "signin" : "signup");
              setError("");
              setNotice("");
            }}
          >
            {mode === "signup"
              ? "Already have an account? Sign in"
              : "Create an account"}
          </Button>
          <Button
            variant="quiet"
            onClick={() => {
              setMode(mode === "forgot" ? "signin" : "forgot");
              setError("");
              setNotice("");
            }}
          >
            {mode === "forgot" ? "Back to sign in" : "Forgot password?"}
          </Button>
        </div>
      )}
      {!resetToken && (
        <Button
          variant="quiet"
          disabled={!email || pending}
          onClick={async () => {
            setPending(true);
            try {
              const r = await authClient.sendVerificationEmail({
                email,
                callbackURL,
              });
              if (r.error) throw new Error(r.error.message);
              setNotice(
                "If your email needs verification, a new link is on its way.",
              );
            } catch (e) {
              setError(e instanceof Error ? e.message : "Please try again");
            } finally {
              setPending(false);
            }
          }}
        >
          Resend verification email
        </Button>
      )}
      <p className="helper">
        Devnet beta · Rewards are test SOL with no cash value. Your email stays
        private.
      </p>
    </div>
  );
}
