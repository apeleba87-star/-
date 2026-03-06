"use client";

import TenderBidActions from "./TenderBidActions";

type Props = {
  tenderNumber: string;
  hasAttachments: boolean;
};

export default function TenderDetailActionsWrapper({ tenderNumber, hasAttachments }: Props) {
  const scrollToAttachments = () => {
    document.getElementById("tender-attachments")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <TenderBidActions
      tenderNumber={tenderNumber}
      hasAttachments={hasAttachments}
      onOpenAttachments={hasAttachments ? scrollToAttachments : undefined}
    />
  );
}
