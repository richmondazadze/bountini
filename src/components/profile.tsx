"use client";
import { useState, useEffect, type FormEvent } from "react";
import Link from "next/link";
import { useAccount } from "./account-provider";
import { authClient } from "@/client/account";
import { api } from "./header";
import { Button, Banner } from "./ui";
export function Profile() {
  const { me, loading, refresh } = useAccount();
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [skills, setSkills] = useState("");
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [pending, setPending] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  useEffect(() => {
    if (me) {
      setName(me.user.name);
      setBio(me.profile.bio);
      setSkills(me.profile.skills.join(", "));
      setUrl(me.profile.portfolioUrl);
    }
  }, [me?.user.id]);
  async function save(e: FormEvent) {
    e.preventDefault();
    setPending(true);
    setError("");
    setNotice("");
    try {
      await api("/api/me", {
        method: "PATCH",
        body: JSON.stringify({
          name,
          bio,
          skills: skills
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
          portfolioUrl: url,
        }),
      });
      await refresh();
      setNotice("Your profile is saved and synced.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to save");
    } finally {
      setPending(false);
    }
  }
  if (loading) return <div className="page">Loading profile…</div>;
  if (!me)
    return (
      <div className="page">
        <Link href="/account">Sign in to manage your profile</Link>
      </div>
    );
  return (
    <div className="page account-page">
      <p className="eyebrow">Account & profile</p>
      <h1>Make yourself known.</h1>
      <p className="helper">
        Your display name, bio, skills and portfolio appear on your public
        profile. Your email stays private.
      </p>
      <p className="muted">{me.user.email}</p>
      {error && <Banner error>{error}</Banner>}
      {notice && <Banner>{notice}</Banner>}
      <form className="account-form" onSubmit={save}>
        <div className="field">
          <label htmlFor="profile-name">Display name</label>
          <input
            id="profile-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            minLength={2}
            maxLength={80}
            required
          />
        </div>
        <div className="field">
          <label htmlFor="profile-bio">About you</label>
          <textarea
            id="profile-bio"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            maxLength={1000}
            rows={4}
          />
        </div>
        <div className="field">
          <label htmlFor="profile-skills">Skills, separated by commas</label>
          <input
            id="profile-skills"
            value={skills}
            onChange={(e) => setSkills(e.target.value)}
            maxLength={490}
          />
          <p className="helper">Up to 12 skills.</p>
        </div>
        <div className="field">
          <label htmlFor="profile-url">Portfolio link</label>
          <input
            id="profile-url"
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://"
          />
        </div>
        <Button type="submit" pending={pending}>
          Save profile
        </Button>
      </form>
      <h2>Linked wallets</h2>
      {me.wallets.length ? (
        me.wallets.map((w) => (
          <p className="address" key={w.wallet}>
            {w.wallet}
          </p>
        ))
      ) : (
        <p>
          Connect your wallet in the header, then sign a message to link it.
        </p>
      )}
      <p className="helper">
        Wallet ownership is verified by signature. Your existing escrow stays
        with its original wallet. Test SOL only.
      </p>
      <h2>Change password</h2>
      <form
        className="account-form"
        onSubmit={async (e) => {
          e.preventDefault();
          setPending(true);
          setError("");
          setNotice("");
          try {
            const r = await authClient.changePassword({
              currentPassword,
              newPassword,
              revokeOtherSessions: true,
            });
            if (r.error) throw new Error(r.error.message);
            setCurrentPassword("");
            setNewPassword("");
            setNotice(
              "Password changed. Other account sessions were signed out.",
            );
          } catch (e) {
            setError(
              e instanceof Error ? e.message : "Unable to change password",
            );
          } finally {
            setPending(false);
          }
        }}
      >
        <div className="field">
          <label htmlFor="current-password">Current password</label>
          <input
            id="current-password"
            type="password"
            autoComplete="current-password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            required
          />
        </div>
        <div className="field">
          <label htmlFor="new-password">New password</label>
          <input
            id="new-password"
            type="password"
            autoComplete="new-password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            minLength={12}
            maxLength={128}
            required
          />
        </div>
        <Button pending={pending} type="submit">
          Change password
        </Button>
      </form>
      <Link href="/my">Back to your dashboard</Link>
    </div>
  );
}
