import { auth } from "@clerk/nextjs/server";
import { WebsiteCard } from "@/components/dashboard/website-card";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { listUserWebsites } from "@/lib/analysis/reports";
import { getScheduleForWebsite } from "@/lib/monitor/schedule";

export default async function WebsitesPage() {
  const { userId } = await auth();
  const live = userId ? await listUserWebsites(userId) : [];

  const liveWithSchedules = await Promise.all(
    live.map(async (item) => {
      const schedule = await getScheduleForWebsite(item.website.id);
      return {
        ...item,
        schedule: schedule
          ? {
              id: schedule.id,
              frequency: schedule.frequency,
              intervalDays: schedule.intervalDays,
              enabled: schedule.enabled,
              nextRunAt: schedule.nextRunAt?.toISOString() ?? null,
              lastRunAt: schedule.lastRunAt?.toISOString() ?? null,
            }
          : null,
      };
    }),
  );

  return (
    <div className="w-full space-y-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight">
            My Websites™
          </h1>
          <p className="mt-1 text-sm text-fg-muted">
            MoneyGap Score™, open gaps, and actions per property — report,
            growth plan, or a new scan.
          </p>
        </div>
        <Button href="/dashboard/analyze" size="sm">
          Analyze New Website
        </Button>
      </div>

      {liveWithSchedules.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {liveWithSchedules.map(
            ({
              website,
              latestReport,
              schedule,
              openGapsCount,
              completedImprovementsCount,
              lastScanAt,
            }) => (
              <WebsiteCard
                key={website.id}
                website={website}
                latestReport={
                  latestReport
                    ? {
                        id: latestReport.id,
                        moneyGapScore: latestReport.moneyGapScore,
                        revenueAtRisk: latestReport.revenueAtRisk,
                      }
                    : null
                }
                openGapsCount={openGapsCount}
                completedImprovementsCount={completedImprovementsCount}
                lastScanAt={
                  lastScanAt instanceof Date
                    ? lastScanAt.toISOString()
                    : (lastScanAt ?? null)
                }
                schedule={schedule}
              />
            ),
          )}
        </div>
      ) : (
        <Card>
          <CardBody className="py-4">
            <EmptyState
              title="No websites yet?"
              description="Run your first scan to add a site, track MoneyGap Score™, and enable monitoring."
              actionLabel="Run your first scan"
              actionHref="/dashboard/analyze"
            />
          </CardBody>
        </Card>
      )}
    </div>
  );
}
