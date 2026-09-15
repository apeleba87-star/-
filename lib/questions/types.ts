import type { QuestionEntityType } from "@/lib/questions/constants";

export type QuestionStatus = "published" | "hidden" | "deleted";

export type QuestionRow = {
  id: number;
  author_id: string;
  title: string;
  body: string;
  slug: string;
  status: QuestionStatus;
  answer_count: number;
  view_count: number;
  author_label: string | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
};

export type QuestionAnswerRow = {
  id: string;
  question_id: number;
  author_id: string;
  body: string;
  is_official: boolean;
  status: QuestionStatus;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
};

export type QuestionEntityLinkRow = {
  id: string;
  question_id: number;
  entity_type: QuestionEntityType;
  entity_id: string;
  is_primary: boolean;
  created_at: string;
};

export type QuestionListItem = {
  id: number;
  title: string;
  slug: string;
  answer_count: number;
  view_count: number;
  created_at: string;
  author_display_name: string | null;
  primary_product_id: string | null;
  primary_product_name: string | null;
};

export type ResolvedEntityLink = {
  entity_type: QuestionEntityType;
  entity_id: string;
  label: string;
  href: string | null;
  subtitle?: string;
};

export type QuestionDetail = QuestionRow & {
  author_display_name: string | null;
  author_role: string | null;
  links: QuestionEntityLinkRow[];
  resolved_links: ResolvedEntityLink[];
  answers: (QuestionAnswerRow & {
    author_display_name: string | null;
    author_role: string | null;
  })[];
};
