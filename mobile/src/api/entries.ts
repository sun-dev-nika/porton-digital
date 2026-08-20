import { request } from './client';
import type { ListResidentEntriesResponse } from './types';

export function listResidentEntries(): Promise<ListResidentEntriesResponse> {
  return request<ListResidentEntriesResponse>('/residents/me/entries');
}
