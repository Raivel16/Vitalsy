export type UserAccount = {
  id: number;
  name: string;
  email: string;
  role: string;
  roleLabel: string;
  isActive: boolean;
  mustChangePassword: boolean;
  deactivatedAt?: string | null;
};

export type UserStatusFilter = "all" | "active" | "inactive";
