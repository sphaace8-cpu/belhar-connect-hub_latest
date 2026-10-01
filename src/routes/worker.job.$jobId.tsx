import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { JobPhotos, Stars, Tag } from "@/components/ui-kit";
import { rand } from "@/lib/data";
import { useMarketplaceJobs } from "@/lib/marketplace";
import { useProfile } from "@/lib/auth";
import { toast } from "sonner";

export const Route = createFileRoute("/worker/job/$jobId")({
  head: () => ({
    meta: [
      { title: "Job details — Connectly" },
      {
        name: "description",
        content: "Read the full job brief, budget and client rating before you apply on Connectly.",
      },
      { property: "og:title", content: "Job details — Connectly" },
      { property: "og:description", content: "Apply to paid work near Belhar." },
    ],
  }),
  component: WorkerJobDetail,
});

function WorkerJobDetail() {
  const { jobId } = Route.useParams();
  const { jobs, isLoading, error, refresh, applyToJob } = useMarketplaceJobs();
  const { userId } = useProfile();
  const [applying, setApplying] = useState(false);
  const job = jobs.find((j) => j.id === jobId);
  const hasApplied =
    job?.applicants.some((application) => application.workerId === userId) ?? false;

  const handleApply = async () => {
    if (!job || !userId || hasApplied || applying) return;
    setApplying(true);
    try {
      await applyToJob(job.id, userId);
      toast.success("Application sent to the client");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not send your application.");
    } finally {
      setApplying(false);
    }
  };

  if (isLoading) {
    return (
      <AppShell role="worker" title="Loading job…">
        <p className="text-sm text-muted-foreground">Loading job details…</p>
      </AppShell>
    );
  }

  if (error || !job) {
    return (
      <AppShell role="worker" title="Job unavailable">
        <div className="card-surface p-8 text-center">
          <p role={error ? "alert" : undefined} className="text-sm text-muted-foreground">
            {error ? "We couldn't load this job." : "This job no longer exists or isn't available."}
          </p>
          {error ? (
            <button onClick={() => void refresh()} className="btn-primary mt-5">
              Try again
            </button>
          ) : null}
          <Link to="/worker/find-jobs" className="btn-secondary mt-5">
            Back to Find Jobs
          </Link>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell
      role="worker"
      title={job.title}
      subtitle={`${job.location} · ${job.distanceKm} km away`}
    >
      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="card-surface p-6">
          <div className="flex flex-wrap items-center gap-2">
            <Tag label={job.category} className="bg-muted text-muted-foreground" />
            <Tag label={job.status} />
            {job.urgent && <Tag label="Urgent" />}
          </div>
          <h2 className="mt-4 font-display text-lg font-bold">What needs doing</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{job.description}</p>
          <JobPhotos photos={job.photos} />

          <dl className="mt-6 grid grid-cols-2 gap-4 border-t border-border pt-5 text-sm sm:grid-cols-3">
            <div>
              <dt className="text-xs text-muted-foreground">Budget</dt>
              <dd className="font-display text-xl font-bold text-primary">{rand(job.budget)}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">When</dt>
              <dd className="font-semibold">{job.when}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Distance</dt>
              <dd className="font-semibold">{job.distanceKm} km</dd>
            </div>
          </dl>
        </div>

        <aside className="space-y-4">
          <div className="card-surface p-5">
            <h3 className="font-display font-bold">About the client</h3>
            <div className="mt-4 flex items-center gap-3">
              <span className="grid h-11 w-11 place-items-center rounded-full bg-accent font-display font-bold text-primary">
                {job.postedBy
                  .split(" ")
                  .map((p) => p[0])
                  .join("")}
              </span>
              <div className="min-w-0">
                <p className="truncate font-semibold">{job.postedBy}</p>
                <p className="text-xs text-muted-foreground">{job.location}</p>
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Client rating</span>
              <Stars rating={job.clientRating} />
            </div>
            <div className="mt-5 space-y-2">
              <button
                type="button"
                className="btn-primary w-full disabled:cursor-not-allowed disabled:opacity-60"
                onClick={handleApply}
                disabled={hasApplied || applying || job.status !== "Open"}
              >
                {hasApplied
                  ? "Application sent"
                  : applying
                    ? "Sending…"
                    : job.status === "Open"
                      ? "Apply Now"
                      : "Job closed"}
              </button>
              <Link to="/messages" className="btn-secondary w-full">
                Message Client
              </Link>
              <Link to="/worker/find-jobs" className="btn-ghost w-full">
                Back to Find Jobs
              </Link>
            </div>
          </div>
        </aside>
      </div>
    </AppShell>
  );
}
