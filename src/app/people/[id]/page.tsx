import { DiagonalArrow } from "@/components/diagonal-arrow";
import { notFound } from "next/navigation";
import { z } from "zod";
import { database } from "@/server/db";
export const dynamic = "force-dynamic";
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const [p] =
    await database()`SELECT u.name,p.bio,p.skills,p.portfolio_url FROM auth_users u LEFT JOIN profiles p ON p.user_id=u.id WHERE u.id=${id}`;
  if (!p) notFound();
  const portfolio =
    p.portfolio_url &&
    z.url().safeParse(p.portfolio_url).success &&
    new URL(p.portfolio_url).protocol === "https:"
      ? p.portfolio_url
      : null;
  return (
    <div className="page account-page">
      <p className="eyebrow">Community profile</p>
      <h1>{p.name}</h1>
      <p className="submission-text">
        {p.bio || "This member hasn’t added a bio yet."}
      </p>
      {Array.isArray(p.skills) && p.skills.length > 0 && (
        <>
          <h2>Skills</h2>
          <p>{p.skills.join(" · ")}</p>
        </>
      )}
      {portfolio && (
        <a
          className="button secondary"
          href={portfolio}
          target="_blank"
          rel="noreferrer"
        >
          View portfolio <DiagonalArrow />
        </a>
      )}
      <p className="helper">
        Profiles are supplied by members. Bountini is currently a Devnet test
        application.
      </p>
    </div>
  );
}
