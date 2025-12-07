
export type FeedbackStatus = 'pending' | 'reviewed' | 'resolved' | 'rejected' | 'in_progress'; // Assuming standard values, can be string
export type ProductTag = 'bug' | 'feature' | 'ui_ux' | 'general' | 'other';

export interface Feedback {
  id?: string; // View vw_feedback_user excludes ID
  product_tag: ProductTag;
  page?: string | null;
  user_id?: string | null;
  message?: string | null;
  start_date?: string | null; // ISO string
  end_date?: string | null;   // ISO string
  status: FeedbackStatus;
  created_at: string;
}

export interface SubmitFeedbackDTO {
  product_tag?: ProductTag;
  page: string;
  user_id?: string | null;
  message: string;
  start_date?: string | null;
  end_date?: string | null;
}

export interface FeedbackResponse {
  data: Feedback[];
  total: number;
}