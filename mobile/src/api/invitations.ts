import { request } from './client';
import type {
  CreateInvitationInput,
  CreateInvitationResponse,
  ListInvitationsResponse,
} from './types';

export function createInvitation(input: CreateInvitationInput): Promise<CreateInvitationResponse> {
  return request<CreateInvitationResponse>('/invitations', {
    method: 'POST',
    body: input,
  });
}

export function listInvitations(): Promise<ListInvitationsResponse> {
  return request<ListInvitationsResponse>('/invitations');
}
