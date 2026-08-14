export type AdminMember = {
  id: string;
  email: string | null;
  username: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  verified: boolean;
  isElite: boolean;
  isAdmin: boolean;
  createdAt: string | null;
};

export type AdminChallenge = {
  id: string;
  title: string;
  description: string | null;
  goalLabel: string | null;
  startsOn: string;
  endsOn: string | null;
  rewardPoints: number;
  imageUrl: string | null;
  participants: number;
};

export type AdminMessage = {
  id: string;
  body: string;
  createdAt: string;
  readAt: string | null;
  from: { id: string; name: string | null; username: string | null };
  to: { id: string; name: string | null; username: string | null };
};

export type AdminPointsMember = {
  id: string;
  email: string | null;
  username: string | null;
  displayName: string | null;
  points: number;
};

export type AdminReward = {
  id: string;
  title: string;
  description: string | null;
  kind: string;
  pointsCost: number;
  active: boolean;
  stock: number | null;
};

export type PointsSettings = { workoutPoints: number; prPoints: number };
