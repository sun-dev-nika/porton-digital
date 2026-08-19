import { request } from './client';
import type { CreateInvitationInput, CreateInvitationResponse } from './types';

export function createInvitation(input: CreateInvitationInput): Promise<CreateInvitationResponse> {
  return request<CreateInvitationResponse>('/invitations', {
    method: 'POST',
    body: input,
  });
}
