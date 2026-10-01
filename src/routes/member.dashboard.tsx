import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { JobCard, StatCard, Section } from "@/components/ui-kit";
import { categories, categoryEmoji } from "@/lib/data";
import { useMarketplaceJobs } from "@/lib/marketplace";
import { useProfile } from "@/lib/auth";

export const Route = createFileRoute("/member/dashboard")({
  head: () => ({
    meta: [
      { title: "Member Dashboard — Connectly" },
      {
        name: "description",
        content: "Track your posted jobs, active hires and applicants on Connectly.",
      },
      { property: "og:title", content: "Member Dashboard — Connectly" },
      { property: "og:description", content: "Manage your Belhar job posts in one place." },
    ],
  }),
  component: MemberDashboard,
});

function MemberDashboard() {
  const [cat, setCat] = useState<string>("All");
  const { userId, profile } = useProfile();
  const { jobs, isLoading, error, refresh } = useMarketplaceJobs();
  const myJobs = jobs.filter((job) => job.ownerId === userId);
  const list = cat === "All" ? myJobs : myJobs.filter((j) => j.category === cat);
  const activeJobs = myJobs.filter((job) => job.status === "Open" || job.status === "In Progress");
  const applicationCount = myJobs.reduce((total, job) => total + job.applicants.length, 0);
  const firstName = profile?.full_name.trim().split(/\s+/)[0] || "there";

  return (
    <AppShell
      role="member"
      title={`Goeie dag, ${firstName} 👋`}
      subtitle={profile?.location || "Belhar, Cape Town"}
      action={
        <Link to="/member/post-job" className="btn-primary">
          ➕ Post a New Job
        </Link>
      }
    >
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Jobs posted"
          value={String(myJobs.length)}
          hint="Your job posts"
          icon="📋"
        />
        <StatCard
          label="Active jobs"
          value={String(activeJobs.length)}
          hint="Open or in progress"
          icon="⏳"
        />
        <StatCard
          label="Jobs with applicants"
          value={String(myJobs.filter((job) => job.applicants.length > 0).length)}
          hint={`${applicationCount} application${applicationCount === 1 ? "" : "s"} received`}
          icon="🤝"
        />
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {["All", ...categories].map((c) => (
          <button
            key={c}
            onClick={() => setCat(c)}
            className={`pill shrink-0 border ${
              cat === c
                ? "border-primary bg-accent text-primary"
                : "border-border bg-surface text-muted-foreground"
            }`}
          >
            {c === "All" ? "All jobs" : `${categoryEmoji[c]} ${c}`}
          </button>
        ))}
      </div>

      <Section
        title="Your recent job posts"
        action={
          <Link to="/member/jobs" className="text-sm font-semibold text-primary">
            View all
          </Link>
        }
      >
        {error ? (
          <div role="alert" className="card-surface p-5 text-sm text-destructive">
            We couldn't load your jobs.{" "}
            <button onClick={() => void refresh()} className="font-semibold underline">
              Try again
            </button>
          </div>
        ) : null}
        <div className="grid gap-4 lg:grid-cols-2">
          {list.map((j) => (
            <JobCard key={j.id} job={j} view="member" />
          ))}
          {isLoading ? <p className="text-sm text-muted-foreground">Loading your jobs…</p> : null}
          {!isLoading && !error && list.length === 0 && (
            <div className="card-surface space-y-3 p-6 text-center sm:col-span-2">
              <p className="font-semibold">
                {myJobs.length === 0
                  ? "Your dashboard is ready for your first job."
                  : "No jobs in this category yet."}
              </p>
              <p className="text-sm text-muted-foreground">
                Post a job so local workers can apply. You can review applicants and choose who to
                hire from My Jobs.
              </p>
              <Link to="/member/post-job" className="btn-primary inline-flex">
                ➕ Post your first job
              </Link>
            </div>
          )}
        </div>
      </Section>
    </AppShell>
  );
}
