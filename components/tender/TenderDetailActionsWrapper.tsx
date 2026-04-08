"use client";

import TenderBidActions from "./TenderBidActions";

type Props = {
  tenderNumber: string;
  hasAttachments: boolean;
  showG2bLink?: boolean;
  showCopyButton?: boolean;
};

export default function TenderDetailActionsWrapper({
  tenderNumber,
  hasAttachments,
  showG2bLink = true,
  showCopyButton = true,
}: Props) {
  const scrollToAttachments = () => {
    document.getElementById("tender-attachments")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <TenderBidActions
      tenderNumber={tenderNumber}
      hasAttachments={hasAttachments}
      onOpenAttachments={hasAttachments ? scrollToAttachments : undefined}
      showG2bLink={showG2bLink}
      showCopyButton={showCopyButton}
    />
  );
}
