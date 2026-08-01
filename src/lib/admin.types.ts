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
