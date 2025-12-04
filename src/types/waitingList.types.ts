
export interface WaitingListEntry {
  id: string;
  lenser_id: string;
  email: string;
  kvkk_approved: boolean;
  created_at: string;
}

export interface JoinWaitingListDTO {
  lenser_id: string;
  email: string;
  kvkk_approved: boolean;
}
