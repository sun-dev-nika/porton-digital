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

export interface GetInvitationResponse {
  invitation: InvitationWithStatus;
}

export interface ResidentEntry {
  id: number;
  invitationId: number | null;
  visitorName: string;
  enteredAt: string;
}

export interface ListResidentEntriesResponse {
  entries: ResidentEntry[];
}

export type InvitationValidationStatus =
  | 'valid'
  | 'not_yet_valid'
  | 'used'
  | 'expired'
  | 'not_found';

export interface InvitationValidationSummary {
  id: number;
  visitorName: string;
  validFrom: string;
  validUntil: string;
}

export interface ValidateInvitationByCodeResponse {
  status: InvitationValidationStatus;
  invitation: InvitationValidationSummary | null;
}

export interface Entry {
  id: number;
  invitationId: number | null;
  unitId: number;
  guardId: number;
  visitorName: string;
  isManual: boolean;
  enteredAt: string;
}

export interface CreateManualEntryInput {
  visitorName: string;
  unitLabel: string;
}

export interface CreateManualEntryResponse {
  entry: Entry;
}

export interface TodayEntry extends Entry {
  unitLabel: string;
}

export interface ListTodayEntriesResponse {
  entries: TodayEntry[];
}

export interface RegisterPushTokenInput {
  pushToken: string;
}

export interface RegisterPushTokenResponse {
  pushToken: string;
}
