"use client";

import ReportTeamShareButton from "@/components/report/ReportTeamShareButton";
import ReportShareUnlockButton from "@/components/report/ReportShareUnlockButton";

export type NewsCardFooterShareConfig =
  | {
      kind: "marketing";
      reportDate: string;
      shareTitle: string;
      shareText: string;
      loginNextPath: string;
    }
  | {
      kind: "job_wage";
      reportDate: string;
      shareTitle: string;
      shareText: string;
      loginNextPath: string;
    }
  | { kind: "bid_post"; postId: string; shareTitle: string; shareText: string };

type Props = {
  config: NewsCardFooterShareConfig;
};

export default function NewsCardFooterShare({ config }: Props) {
  if (config.kind === "marketing") {
    return (
      <ReportTeamShareButton
        kind="marketing"
        reportDate={config.reportDate}
        shareTitle={config.shareTitle}
        shareText={config.shareText}
        loginNextPath={config.loginNextPath}
        layout="inline"
      />
    );
  }
  if (config.kind === "job_wage") {
    return (
      <ReportTeamShareButton
        kind="job_wage"
        reportDate={config.reportDate}
        shareTitle={config.shareTitle}
        shareText={config.shareText}
        loginNextPath={config.loginNextPath}
        layout="inline"
      />
    );
  }
  return (
    <ReportShareUnlockButton
      postId={config.postId}
      shareTitle={config.shareTitle}
      shareText={config.shareText}
      layout="inline"
    />
  );
}
