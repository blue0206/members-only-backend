import { config } from '../config';
import type { Logger } from 'pino';
import type { EventRequestDto } from '@blue0206/members-only-shared-types/dtos/event.dto';

export const eventDispatch = (body: EventRequestDto, log: Logger): void => {
    fetch(config.DISPATCH_EVENT_API_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-internal-api-secret': config.INTERNAL_API_SECRET,
        },
        body: JSON.stringify(body),
    })
        .then(() => {
            log.info('Event dispatched successfully.');
        })
        .catch((error: unknown) => {
            log.error({ error }, 'Failed to dispatch event.');
        });
};
