import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AppShell } from "@/components/AppShell";
import { Tag } from "@/components/ui-kit";
import { rand } from "@/lib/data";
import { useMarketplaceJobs } from "@/lib/marketplace";
import { useProfile } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { submitWorkerReview } from "@/lib/reviews";
import { toast } from "sonner";

export const Route = createFileRoute("/worker/applications")({
  head: () => ({
    meta: [
      { title: "My Applications — Connectly" },
      {
        name: "description",
        content: "Track jobs you've applied to, shortlists, hires and rejections on Connectly.",
      },
      { property: "og:title", content: "My Applications — Connectly" },
      { property: "og:description", content: "Every application you've sent, in one list." },
    ],
  }),
  component: MyApplications,
});

const tabs = ["Applied", "Shortlisted", "Hired", "Rejected"] as const;
type Tab = (typeof tabs)[number];

function MyApplications() {
  const [tab, setTab] = useState<Tab>("Applied");
  const { jobs, isLoading, error, refresh } = useMarketplaceJobs();
  const { userId } = useProfile();
  const queryClient = useQueryClient();
  const [reviewingJobId, setReviewingJobId] = useState<string | null>(null);
  const [reviewRating, setReviewRating] = useState("5");
  const [reviewComment, setReviewComment] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);
  const { data: reviewedJobIds = [] } = useQuery({
    queryKey: ["reviews", "worker", userId],
    enabled: !!userId,
    queryFn: async () => {
      if (!userId) return [];
      const { data, error: queryError } = await supabase
        .from("reviews")
        .select("job_id")
        .eq("reviewer_id", userId)
        .not("job_id", "is", null);
      if (queryError) throw queryError;
      return data.flatMap((review) => (review.job_id ? [review.job_id] : []));
    },
  });
  const list = jobs.flatMap((job) =>
    job.applicants
      .filter((application) => application.workerId === userId && application.status === tab)
      .map((application) => ({
        id: application.id ?? `${job.id}-${application.workerId}`,
        jobId: job.id,
        job: job.title,
        client: job.postedBy,
        posterId: job.ownerId,
        budget: job.budget,
        when: job.when,
        jobStatus: job.status,
      })),
  );

  const handleSubmitReview = async (jobId: string, memberId?: string) => {
    if (!userId || !memberId) {
      toast.error("We couldn't identify the job poster. Refresh and try again.");
      return;
    }
    if (reviewComment.trim().length < 5) {
      toast.error("Please describe your experience in at least 5 characters.");
      return;
    }
    setSubmittingReview(true);
    try {
      await submitWorkerReview({
        jobId,
        workerId: userId,
        memberId,
        rating: Number(reviewRating),
        comment: reviewComment,
      });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["reviews", "worker", userId] }),
        queryClient.invalidateQueries({ queryKey: ["reviews", "profile", memberId] }),
      ]);
      setReviewingJobId(null);
      setReviewComment("");
      toast.success("Your review of the job poster has been published.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not submit your review.");
    } finally {
      setSubmittingReview(false);
    }
  };

  return (
    <AppShell role="worker" title="My Applications" subtitle="Where each application stands">
      <div className="flex gap-2 overflow-x-auto border-b border-border">
        {tabs.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`-mb-px shrink-0 border-b-2 px-4 py-3 text-sm font-semibold transition-colors ${
              tab === t
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {t} (
            {jobs.reduce(
              (count, job) =>
                count +
                job.applicants.filter(
                  (application) => application.workerId === userId && application.status === t,
                ).length,
              0,
            )}
            )
          </button>
        ))}
      </div>

      {error ? (
        <p role="alert" className="card-surface p-5 text-sm text-destructive">
          We couldn't load your applications.{" "}
          <button onClick={() => void refresh()} className="font-semibold underline">
            Try again
          </button>
        </p>
      ) : null}
      {isLoading ? <p className="text-sm text-muted-foreground">Loading applications…</p> : null}
      <div className="space-y-3">
        {list.map((a) => (
          <div
            key={a.id}
            className="card-surface grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 p-5"
          >
            <div className="min-w-0">
              <Tag label={tab} />
              <h3 className="mt-2 truncate font-display font-bold">{a.job}</h3>
              <p className="text-xs text-muted-foreground">
                {a.client} · {a.when}
              </p>
            </div>
            <div className="shrink-0 text-right">
              <div className="font-display text-lg font-bold text-primary">{rand(a.budget)}</div>
              <Link
                to="/worker/job/$jobId"
                params={{ jobId: a.jobId }}
                className="mr-3 text-xs font-semibold text-primary"
              >
                View job
              </Link>
              <Link to="/messages" className="text-xs font-semibold text-primary">
                Message client
              </Link>
              {tab === "Hired" &&
                a.jobStatus === "Completed" &&
                (reviewedJobIds.includes(a.jobId) ? (
                  <span className="ml-3 text-xs font-semibold text-primary">
                    ✓ Review submitted
                  </span>
                ) : (
                  <button
                    type="button"
                    className="ml-3 text-xs font-semibold text-primary"
                    onClick={() => setReviewingJobId(reviewingJobId === a.jobId ? null : a.jobId)}
                  >
                    Write a review
                  </button>
                ))}
            </div>
            {reviewingJobId === a.jobId && (
              <form
                className="mt-4 space-y-3 border-t border-border pt-4"
                onSubmit={(event) => {
                  event.preventDefault();
                  void handleSubmitReview(a.jobId, a.posterId);
                }}
              >
                <p className="text-sm font-semibold">
                  How did the job poster treat you during this job?
                </p>
                <label className="block">
                  <span className="mb-1 block text-xs font-semibold">Rating</span>
                  <select
                    value={reviewRating}
                    onChange={(event) => setReviewRating(event.target.value)}
                    className="field"
                  >
                    <option value="5">5 — Excellent</option>
                    <option value="4">4 — Good</option>
                    <option value="3">3 — Fair</option>
                    <option value="2">2 — Poor</option>
                    <option value="1">1 — Very poor</option>
                  </select>
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs font-semibold">Your experience</span>
                  <textarea
                    required
                    minLength={5}
                    maxLength={1000}
                    rows={3}
                    value={reviewComment}
                    onChange={(event) => setReviewComment(event.target.value)}
                    className="field h-auto py-3"
                    placeholder="Describe the poster's communication, respect, and behaviour."
                  />
                </label>
                <div className="flex gap-2">
                  <button disabled={submittingReview} className="btn-primary !h-10 !text-sm">
                    {submittingReview ? "Submitting…" : "Submit review"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setReviewingJobId(null)}
                    className="btn-secondary !h-10 !text-sm"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>
        ))}
        {!isLoading && !error && list.length === 0 ? (
          <p className="card-surface p-8 text-center text-sm text-muted-foreground">
            {tab === "Applied"
              ? "You haven't applied for any jobs yet."
              : `No ${tab.toLowerCase()} applications yet.`}
          </p>
        ) : null}
      </div>
    </AppShell>
  );
}
