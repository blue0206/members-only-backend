import { config } from '../config/index.js';
import type { EventRequestDto } from '@blue0206/members-only-shared-types/dtos/event.dto';

export const eventDispatch = async (body: EventRequestDto): Promise<void> => {
    await fetch(config.DISPATCH_EVENT_API_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-internal-api-secret': config.INTERNAL_API_SECRET,
        },
        body: JSON.stringify(body),
    });
};
