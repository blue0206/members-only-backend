import { vi } from 'vitest';

export const sseService = {
    addClient: vi.fn().mockReturnValue('clientId'),

    removeClient: vi.fn(),

    unicastEvent: vi.fn(),

    multicastEventToRoles: vi.fn(),

    broadcastEvent: vi.fn(),

    clearSseClients: vi.fn(),

    sendHeartbeat: vi.fn(),
};
