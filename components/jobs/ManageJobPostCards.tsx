import JobPostCard from "@/components/jobs/JobPostCard";
import JobShareActions from "@/components/jobs/JobShareActions";
import { getKstTodayString, getKstTomorrowString } from "@/lib/jobs/kst-date";

export type ManageJobPostRow = {
  id: string;
  title: string;
  status: string;
  region: string;
  district: string | null;
  work_date: string | null;
  created_at: string;
  user_id: string;
};

type PositionRow = {
  id: string;
  job_post_id: string;
  category_main_id: string;
  category_sub_id: string | null;
  custom_subcategory_text: string | null;
  job_type_input: string | null;
  skill_level: string | null;
  required_count: number;
  filled_count: number;
  pay_amount: number | string;
  pay_unit: string;
  status: string;
};

type Props = {
  sortedPosts: ManageJobPostRow[];
  positionsByPost: Map<string, PositionRow[]>;
  applicationCountByPost: Map<string, number>;
  postIdsWithNoShow: Set<string>;
  shareStatsByPost: Map<string, { open: number; apply: number }>;
  categoryMap: Map<string, string>;
};

const skillLevelLabel: Record<string, string> = { expert: "숙련자(기공)", general: "일반(보조)" };

function positionDisplay(
  pos: PositionRow,
  categoryMap: Map<string, string>
): { label: string; skillLabel: string } {
  const label =
    (pos.job_type_input && pos.job_type_input.trim()) ||
    (() => {
      const sub = pos.category_sub_id ? categoryMap.get(pos.category_sub_id) : null;
      const main = categoryMap.get(pos.category_main_id);
      if (sub) return sub;
      if (pos.custom_subcategory_text?.trim()) return pos.custom_subcategory_text.trim();
      return main ?? "—";
    })();
  const skillLabel = pos.skill_level ? skillLevelLabel[pos.skill_level] ?? "" : "";
  return { label, skillLabel };
}

export default function ManageJobPostCards({
  sortedPosts,
  positionsByPost,
  applicationCountByPost,
  postIdsWithNoShow,
  shareStatsByPost,
  categoryMap,
}: Props) {
  const todayStr = getKstTodayString();
  const tomorrowStr = getKstTomorrowString();
  function getUrgentLabel(workDate: string | null): "today" | "tomorrow" | undefined {
    if (!workDate) return undefined;
    const d = workDate.slice(0, 10);
    if (d === todayStr) return "today";
    if (d === tomorrowStr) return "tomorrow";
    return undefined;
  }

  return (
    <div className="space-y-3">
      {sortedPosts.map((post, idx) => {
        const posList = positionsByPost.get(post.id) ?? [];
        const workDateFormatted = post.work_date
          ? new Date(post.work_date + "T12:00:00").toLocaleDateString("ko-KR", {
              month: "long",
              day: "numeric",
              year: "numeric",
            })
          : null;
        return (
          <div key={post.id} className="space-y-2">
            <JobPostCard
              index={idx}
              id={post.id}
              title={post.title}
              status={post.status}
              region={post.region}
              district={post.district ?? ""}
              work_date={workDateFormatted}
              applicationCount={Number(applicationCountByPost.get(post.id)) || 0}
              isOwner
              hasNoShowApplicant={postIdsWithNoShow.has(post.id)}
              urgentLabel={getUrgentLabel(post.work_date)}
              positions={posList.map((p) => {
                const { label, skillLabel } = positionDisplay(p, categoryMap);
                return {
                  id: p.id,
                  categoryDisplay: skillLabel ? `${label} / ${skillLabel}` : label,
                  required_count: p.required_count,
                  filled_count: p.filled_count,
                  pay_amount: Number(p.pay_amount),
                  pay_unit: p.pay_unit,
                  status: (post.status === "closed" ? "closed" : p.status) as "open" | "partial" | "closed",
                };
              })}
            />
            <div className="pl-1">
              {(() => {
                const stats = shareStatsByPost.get(post.id) ?? { open: 0, apply: 0 };
                const summary =
                  stats.open > 0 || stats.apply > 0
                    ? `최근 7일 공유 유입 ${stats.open}명 · 공유 경유 지원 ${stats.apply}건`
                    : null;
                return (
                  <JobShareActions
                    compact
                    postId={post.id}
                    title={post.title}
                    regionLabel={[post.region, post.district].filter(Boolean).join(" ")}
                    workDate={post.work_date}
                    statsSummary={summary}
                  />
                );
              })()}
            </div>
          </div>
        );
      })}
    </div>
  );
}
