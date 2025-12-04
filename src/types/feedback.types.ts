
export interface Feedback {
  id: string;
  product_tag?: string | null;
  page?: string | null;
  user_id?: string | null;
  message?: string | null;
  start_date?: string | null; // ISO string
  end_date?: string | null;   // ISO string
  created_at: string;
}

export interface SubmitFeedbackDTO {
  product_tag?: string;
  page: string;
  user_id?: string | null;
  message: string;
  start_date?: string | null;
  end_date?: string | null;
}

export type FeedbackTag = 'Bug' | 'Feature Request' | 'General' | 'UI/UX' | 'Other';

export interface FeedbackResponse {
  data: Feedback[];
  total: number;
}
