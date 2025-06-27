import { vi } from 'vitest';

export const uploadFile = vi.fn().mockResolvedValue('mock-avatar-public-id');

export const deleteFile = vi.fn().mockResolvedValue(undefined);

export const getAvatarUrl = vi.fn().mockReturnValue('mock-avatar-url');
