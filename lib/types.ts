export type ProfileRole = "subscriber" | "editor" | "admin";
export type SubscriptionPlan = "free" | "paid";
export type UgcType = "field" | "review" | "issue";
export type UgcStatus = "pending" | "approved" | "rejected";
export type QueueItemType = "auto" | "manual" | "ugc";
export type ReportTargetType = "ugc" | "post";
export type ReportStatus = "pending" | "dismissed" | "actioned";

export interface Profile {
  id: string;
  email: string | null;
  display_name: string | null;
  role: ProfileRole;
  subscription_plan: SubscriptionPlan;
  created_at: string;
  updated_at: string;
}

export interface ContentCategory {
  id: string;
  slug: string;
  name: string;
  sort_order: number;
  created_at: string;
}

export interface Post {
  id: string;
  category_id: string | null;
  title: string;
  slug: string | null;
  body: string | null;
  excerpt: string | null;
  newsletter_include: boolean;
  published_at: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  category?: ContentCategory | null;
}

export interface Bid {
  id: string;
  external_id: string | null;
  title: string | null;
  org_name: string | null;
  region: string | null;
  category: string | null;
  budget_amount: number | null;
  deadline_at: string | null;
  url: string | null;
  collected_at: string;
}

export interface Ugc {
  id: string;
  type: UgcType;
  user_id: string | null;
  region: string | null;
  area_sqm: number | null;
  frequency: string | null;
  price_per_pyeong: number | null;
  scope: string | null;
  rating: number | null;
  comment: string | null;
  target_type: string | null;
  target_id: string | null;
  issue_text: string | null;
  status: UgcStatus;
  grade: string | null;
  created_at: string;
  updated_at: string;
}

export interface NewsletterQueueItem {
  id: string;
  type: QueueItemType;
  ref_type: string | null;
  ref_id: string | null;
  title: string | null;
  summary: string | null;
  content_html: string | null;
  sort_order: number;
  scheduled_for: string;
  used_in_issue_id: string | null;
  created_at: string;
}

export interface NewsletterIssue {
  id: string;
  issue_number: number | null;
  subject: string;
  summary: string | null;
  body_html: string | null;
  sent_at: string | null;
  created_at: string;
}

export interface Report {
  id: string;
  target_type: ReportTargetType;
  target_id: string;
  reporter_id: string | null;
  reason: string | null;
  status: ReportStatus;
  created_at: string;
}

export interface AdSlot {
  id: string;
  issue_id: string | null;
  slot_index: number;
  advertiser_name: string | null;
  link_url: string | null;
  image_url: string | null;
  from_date: string;
  to_date: string;
  created_at: string;
}

export interface NewsletterSubscriber {
  id: string;
  email: string;
  subscribed_at: string;
  unsubscribed_at: string | null;
}

export interface RegionAvg {
  id: string;
  region: string;
  job_type: string | null;
  avg_price_per_pyeong: number;
  sample_count: number;
  calculated_at: string;
}
