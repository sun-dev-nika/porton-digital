import { request } from './client';
import type {
  CreateManualEntryInput,
  CreateManualEntryResponse,
  ListResidentEntriesResponse,
  ListTodayEntriesResponse,
} from './types';

export function listResidentEntries(): Promise<ListResidentEntriesResponse> {
  return request<ListResidentEntriesResponse>('/residents/me/entries');
}

export function listTodayEntries(): Promise<ListTodayEntriesResponse> {
  return request<ListTodayEntriesResponse>('/entries/today');
}

export function createManualEntry(
  input: CreateManualEntryInput,
): Promise<CreateManualEntryResponse> {
  return request<CreateManualEntryResponse>('/entries/manual', {
    method: 'POST',
    body: input,
  });
}
