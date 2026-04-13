export type Member = {
  id: string;
  displayName: string;
  lastName: string;
  fullName: string;
};

export type RoomInfo = {
  id: string;
  name: string;
  currency: string;
  createdBy: string;
  memberIds: string[];
  members: Member[];
};

export type LineItemStored = {
  name: string;
  amount: number;
  participantIds: string[];
};

export type ExpenseDisputeEntry = {
  userId: string;
  message: string;
  createdAt: string;
};

export type RoomExpense = {
  id: string;
  title: string;
  amount: number;
  payerId: string;
  createdById: string;
  shares: Record<string, number>;
  lineItems?: LineItemStored[];
  disputes?: ExpenseDisputeEntry[];
  createdAt: string;
};

export type BalanceViewer = {
  payTo: { toUserId: string; toName: string; amount: number }[];
  receiveFrom: { fromUserId: string; fromName: string; amount: number }[];
};

export type BalanceResp = {
  currency: string;
  balances: Record<string, number>;
  transfers: { from: string; to: string; amount: number }[];
  viewer: BalanceViewer;
  perMember: Record<string, BalanceViewer>;
};

export type SearchHit = {
  id: string;
  fullName: string;
  displayName: string;
  lastName: string;
};

export type RoomActivityItem = {
  id: string;
  kind: string;
  payload: Record<string, unknown>;
  actorId: string;
  actorName: string;
  createdAt: string;
};
