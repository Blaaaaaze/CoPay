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

export type RoomExpense = {
  id: string;
  title: string;
  amount: number;
  payerId: string;
  shares: Record<string, number>;
  lineItems?: LineItemStored[];
  createdAt: string;
};

export type BalanceViewer = {
  payTo: { toName: string; amount: number }[];
  receiveFrom: { fromName: string; amount: number }[];
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
