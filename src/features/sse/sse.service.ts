import { v4 as uuidv4 } from 'uuid';
import { logger } from '../../core/logger.js';
import type { SseClient, SseClientAddParamsType } from './sse.types.js';
import type {
    Role,
    ServerSentEvent,
    SseEventNamesType,
} from '@blue0206/members-only-shared-types';

const clients = new Map<string, SseClient>();

class SseService {
    constructor() {
        logger.info('SSE service initialized.');
    }

    /**
     * Registers a new SSE client.
     * @param {{ userId: number; userRole: Role; res: Response; req: Request }} client
     * @returns {string} The id for the client.
     */
    addClient({ userId, userRole, res, req }: SseClientAddParamsType): string {
        // Request ID is used inside sseClientCleanup middleware to remove the client.
        const clientId = req.requestId ?? uuidv4();

        clients.set(clientId, { id: clientId, userId, userRole, res });
        logger.info({ clientId, userId, userRole }, 'SSE client connected.');

        return clientId;
    }

    /**
     * Removes a client from the list of connected SSE clients and closes its connection.
     * @param {string} clientId - The id for the client to be removed.
     */
    removeClient(clientId: string): void {
        if (clients.has(clientId)) {
            const client = clients.get(clientId);
            if (client) client.res.end();
            clients.delete(clientId);
            logger.info({ clientId }, 'SSE client disconnected and removed.');
        }
    }

    /**
     * Sends an event to a specific SSE client.
     * @template EventName - The name of the event.
     * @template Payload - The type of the event payload (data).
     * @param {number} userId - The id of the user to send the event to.
     * @param {ServerSentEvent<EventName, Payload>} eventBody - The event body to send.
     */
    unicastEvent<EventName extends SseEventNamesType, Payload>(
        userId: number,
        eventBody: ServerSentEvent<EventName, Payload>
    ): void {
        clients.forEach((client) => {
            if (client.userId === userId) {
                this.sendEventToClient(client.id, eventBody);
            }
        });
    }

    /**
     * Sends an event to all connected SSE clients with the specified role.
     * This will typically be used to trigger refetch for GET '/users' endpoint
     * which is admin-only.
     * @template EventName - The name of the event.
     * @template Payload - The type of the event payload (data).
     * @param {Role[]} roles - The roles to send the event to.
     * @param {ServerSentEvent<EventName, Payload>} eventBody - The event body to send.
     */
    multicastEventToRoles<EventName extends SseEventNamesType, Payload>(
        roles: Role[],
        eventBody: ServerSentEvent<EventName, Payload>
    ): void {
        clients.forEach((client) => {
            if (roles.includes(client.userRole)) {
                this.sendEventToClient(client.id, eventBody);
            }
        });
    }

    /**
     * Sends an event to all connected SSE clients.
     * Will mostly be used to trigger refetch of messages/bookmarks of clients.
     * @template EventName - The name of the event.
     * @template Payload - The type of the event payload (data).
     * @param {ServerSentEvent<EventName, Payload>} eventBody - The event body to send.
     */
    broadcastEvent<EventName extends SseEventNamesType, Payload>(
        eventBody: ServerSentEvent<EventName, Payload>
    ): void {
        clients.forEach((client) => {
            this.sendEventToClient(client.id, eventBody);
        });
    }

    /**
     * Clears all connected SSE clients.
     *
     * This method removes all clients from the internal collection
     * and ends their connections, effectively disconnecting them.
     * Will be used during graceful shutdown to ensure that no
     * SSE connections remain open.
     */
    clearSseClients(): void {
        clients.forEach((client) => client.res.end());
        clients.clear();
        logger.info('All SSE clients cleared.');
    }

    sendHeartbeat(): void {
        clients.forEach((client) => {
            if (!client.res.writableEnded) {
                client.res.write(': keepalive\n\n');
            } else {
                this.removeClient(client.id);
            }
        });
    }

    /**
     * Sends a formatted Server-Sent Event to a specific client.
     *
     * This method constructs the SSE message string, including optional event ID,
     * event name, and JSON-stringified data. It then writes this message to the
     * client's response stream. If the client's connection is found to be closed,
     * the client is removed from the active list.
     *
     * @private
     * @template EventName - The type of the event name, constrained by SseEventNamesType.
     * @template Payload - The type of the event payload.
     * @param {string} clientId - The unique identifier of the client to send the event to.
     * @param {ServerSentEvent<EventName, Payload>} eventBody - The event object containing the event name, data, and optional ID.
     * @returns {void}
     */
    private sendEventToClient<EventName extends SseEventNamesType, Payload>(
        clientId: string,
        eventBody: ServerSentEvent<EventName, Payload>
    ): void {
        const client = clients.get(clientId);

        if (client && !client.res.writableEnded) {
            let message = '';
            if (eventBody.id) message += `id: ${eventBody.id}\n`;
            message += `event: ${eventBody.event}\n`;
            message += `data: ${JSON.stringify(eventBody.data)}\n\n`;

            client.res.write(message);
            logger.trace(
                { clientId, event: eventBody.event, data: eventBody.data },
                'SSE event sent to client.'
            );
        } else if (client?.res.writableEnded) {
            this.removeClient(client.id);
            logger.warn(
                { clientId, event: eventBody.event },
                'Could not send SSE to closed client connection. Removing client'
            );
        }
    }
}

export const sseService = new SseService();
