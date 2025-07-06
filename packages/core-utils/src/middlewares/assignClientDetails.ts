import requestIp from 'request-ip';
import { UAParser } from 'ua-parser-js';
import type { Request, Response, NextFunction } from 'express';
import type { Logger } from 'pino';

export interface ClientDetailsType {
    ip: string;
    userAgent: string;
    location: string;
}

export async function assignClientDetails(
    req: Request,
    _res: Response,
    next: NextFunction
): Promise<void> {
    const clientIp = requestIp.getClientIp(req);
    const userAgent = getUserAgent(req.headers['user-agent']);
    const location = await getLocation(clientIp, req.log);

    req.clientDetails = {
        ip: clientIp ?? '',
        userAgent,
        location,
    };

    req.log.info("Client's ip, user agent, and location assigned.");

    next();
}

function getUserAgent(userAgentString: string | undefined): string {
    if (!userAgentString) {
        return 'Browser: Unknown Browser Device: Unknown Device DeviceType: Unknown Device Type OS: Unknown OS';
    }

    const result = UAParser(userAgentString);
    const userAgent = `Browser: ${result.browser.name ?? 'Unknown Browser'} ${result.browser.version ?? ''} Device: ${result.device.vendor ?? 'Unknown Device'} ${result.device.model ?? ''} DeviceType: ${result.device.type ?? ''} OS:  ${result.os.name ?? ''} ${result.os.version ?? ''}`;
    return userAgent;
}

interface IpApiResponse {
    status: 'success' | 'fail';
    country?: string;
    city?: string;
}

async function getLocation(ip: string | null, log: Logger): Promise<string> {
    if (!ip) {
        return 'Unknown Location';
    }
    const url = `http://ip-api.com/json/${ip}?fields=status,country,city`;

    try {
        const response = await fetch(url);
        const data: unknown = await response.json();
        if (dataIsIpApiResponseData(data)) {
            if (data.status === 'fail' || (!data.city && !data.country))
                return 'Unknown Location';

            if (!data.city) {
                return data.country ?? 'Unknown Location';
            }
            if (!data.country) {
                return data.city ?? 'Unknown Location';
            }

            return `${data.city ?? ''}, ${data.country ?? ''}`;
        } else {
            return 'Unknown Location';
        }
    } catch (error) {
        log.error({ error }, 'Error getting location from ip-api.');
        return 'Unknown Location';
    }
}

function dataIsIpApiResponseData(data: unknown): data is IpApiResponse {
    // We only check for status because API returns only the status on failure.
    if (typeof data === 'object' && data && 'status' in data) {
        return true;
    }
    return false;
}
