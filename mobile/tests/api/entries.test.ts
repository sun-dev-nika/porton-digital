import * as SecureStore from 'expo-secure-store';

import { listResidentEntries } from '../../src/api/entries';

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

function jsonResponse(status: number, body: unknown): Response {
  return {
    status,
    ok: status >= 200 && status < 300,
    text: () => Promise.resolve(JSON.stringify(body)),
  } as Response;
}

describe('listResidentEntries', () => {
  const secureStore = SecureStore as jest.Mocked<typeof SecureStore>;

  beforeEach(() => {
    jest.resetAllMocks();
    global.fetch = jest.fn();
  });

  it('llama a GET /residents/me/entries sin method ni body explícitos y propaga el resultado tipado', async () => {
    secureStore.getItemAsync.mockResolvedValue('stored-jwt-token');
    const entriesResponse = {
      entries: [
        {
          id: 1,
          invitationId: 1,
          visitorName: 'Juan Pérez',
          enteredAt: '2026-01-02T10:00:00.000Z',
        },
      ],
    };
    (global.fetch as jest.Mock).mockResolvedValue(jsonResponse(200, entriesResponse));

    const result = await listResidentEntries();

    expect(result).toEqual(entriesResponse);
    const [url, init] = (global.fetch as jest.Mock).mock.calls[0];
    expect(url).toBe('http://localhost:3000/residents/me/entries');
    expect(init.method).toBe('GET');
    expect(init.body).toBeUndefined();
  });
});
