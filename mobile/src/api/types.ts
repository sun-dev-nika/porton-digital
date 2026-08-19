export type UserRole = 'resident' | 'guard';

export interface AuthenticatedUser {
  id: number;
  role: UserRole;
}

export interface LoginResponse {
  token: string;
  user: AuthenticatedUser;
}

export interface Invitation {
  id: number;
  code: string;
  visitorName: string;
  validFrom: string;
  validUntil: string;
}

export interface CreateInvitationInput {
  visitorName: string;
  validFrom: string;
  validUntil: string;
}

export interface CreateInvitationResponse {
  invitation: Invitation;
}

export type InvitationStatus = 'pending' | 'used' | 'expired';

export interface InvitationWithStatus extends Invitation {
  status: InvitationStatus;
}

export interface ListInvitationsResponse {
  invitations: InvitationWithStatus[];
}
