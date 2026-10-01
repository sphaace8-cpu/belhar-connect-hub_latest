import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { JobCard, StatCard, Section } from "@/components/ui-kit";
import { useAvailability } from "@/lib/hooks";
import { useNavigate } from "@tanstack/react-router";
import { useProfile } from "@/lib/auth";
import { useMarketplaceJobs } from "@/lib/marketplace";

export const Route = createFileRoute("/worker/dashboard")({
  head: () => ({
    meta: [
      { title: "Worker Dashboard — Connectly" },
      {
        name: "description",
        content: "See recommended jobs near you, your rating and earnings on Connectly.",
      },
      { property: "og:title", content: "Worker Dashboard — Connectly" },
      { property: "og:description", content: "Your work, rating and income in Belhar." },
    ],
  }),
  component: WorkerDashboard,
});

function WorkerDashboard() {
  const { available, toggleAvailability } = useAvailability();
  const navigate = useNavigate();
  const { jobs, isLoading, error, refresh } = useMarketplaceJobs();
  const { profile, userId } = useProfile();
  const openJobs = jobs.filter((j) => j.status === "Open").slice(0, 4);
  const applications = jobs.flatMap((job) =>
    job.applicants.filter((application) => application.workerId === userId),
  );
  const name = profile?.full_name || "Worker";
  const role = profile?.skills?.[0] || "Local worker";
  const location = profile?.location || "Belhar, Cape Town";

  return (
    <AppShell
      role="worker"
      title={`Molo, ${name.split(" ")[0]}!`}
      subtitle={`${role} · ${location}`}
      action={
        <button
          onClick={toggleAvailability}
          className="flex items-center gap-3 rounded-xl border border-border bg-surface px-4 py-2.5 transition-colors hover:bg-muted"
          title={available ? "Click to go offline" : "Click to go online"}
        >
          <span className="text-sm font-semibold">
            {available ? "Available for work" : "Not available"}
          </span>
          <span
            className={`relative h-7 w-12 rounded-full transition-colors ${
              available ? "bg-primary" : "bg-border"
            }`}
          >
            <span
              className={`absolute top-1 h-5 w-5 rounded-full bg-surface transition-all ${
                available ? "left-6" : "left-1"
              }`}
            />
          </span>
        </button>
      }
    >
      <div className="grid gap-4 sm:grid-cols-3">
        <button
          onClick={() => navigate({ to: "/worker/applications" })}
          className="card-surface text-left transition-colors hover:bg-muted"
        >
          <div className="p-5">
            <StatCard
              label="Completed jobs"
              value={String(profile?.jobs_done ?? 0)}
              hint="On your profile"
              icon="✅"
            />
          </div>
        </button>
        <button
          onClick={() => navigate({ to: "/earnings" })}
          className="card-surface text-left transition-colors hover:bg-muted"
        >
          <div className="p-5">
            <StatCard label="Total earned" value="R23 850" hint="R3 630 this week" icon="💰" />
          </div>
        </button>
        <button
          onClick={() => navigate({ to: "/profile" })}
          className="card-surface text-left transition-colors hover:bg-muted"
        >
          <div className="p-5">
            <StatCard
              label="Rating"
              value={`${(profile?.rating ?? 0).toFixed(1)}★`}
              hint="Your profile rating"
              icon="⭐"
            />
          </div>
        </button>
      </div>

      <Section
        title="Recommended for you"
        action={
          <Link
            to="/worker/find-jobs"
            className="text-sm font-semibold text-primary hover:underline"
          >
            See all jobs
          </Link>
        }
      >
        {error ? (
          <p role="alert" className="card-surface p-5 text-sm text-destructive">
            We couldn't load current jobs.{" "}
            <button onClick={() => void refresh()} className="font-semibold underline">
              Try again
            </button>
          </p>
        ) : null}
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading available jobs…</p>
        ) : null}
        {openJobs.length > 0 ? (
          <div className="grid gap-4 lg:grid-cols-2">
            {openJobs.map((j) => (
              <div key={j.id} className="transition-transform hover:scale-[1.02]">
                <JobCard job={j} view="worker" />
              </div>
            ))}
          </div>
        ) : !isLoading && !error ? (
          <div className="card-surface p-8 text-center text-sm text-muted-foreground">
            No open jobs right now. Check back soon!
          </div>
        ) : null}
      </Section>

      <Section
        title="My applications"
        action={
          <Link
            to="/worker/applications"
            className="text-sm font-semibold text-primary hover:underline"
          >
            View all
          </Link>
        }
      >
        <div className="grid gap-4 sm:grid-cols-4">
          {[
            [
              "Applied",
              applications.filter((application) => application.status === "Applied").length,
            ],
            [
              "Shortlisted",
              applications.filter((application) => application.status === "Shortlisted").length,
            ],
            ["Hired", applications.filter((application) => application.status === "Hired").length],
            [
              "Rejected",
              applications.filter((application) => application.status === "Rejected").length,
            ],
          ].map(([label, n]) => (
            <button
              key={label as string}
              onClick={() => navigate({ to: "/worker/applications" })}
              className="card-surface p-5 transition-colors hover:bg-muted"
            >
              <div className="font-display text-2xl font-bold">{n}</div>
              <div className="text-sm text-muted-foreground">{label}</div>
            </button>
          ))}
        </div>
      </Section>
    </AppShell>
  );
}
