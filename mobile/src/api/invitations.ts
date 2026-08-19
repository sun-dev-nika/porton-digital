import { request } from './client';
import type {
  CreateInvitationInput,
  CreateInvitationResponse,
  GetInvitationResponse,
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

export function getInvitation(id: number): Promise<GetInvitationResponse> {
  return request<GetInvitationResponse>(`/invitations/${id}`);
}
