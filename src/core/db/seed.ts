import 'dotenv/config';
import { PrismaClient } from './prisma-client/client.js';
import { config } from '../config/index.js';
import { logger } from '../logger.js';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main(): Promise<void> {
    logger.info(`Start seeding with NODE_ENV: ${config.NODE_ENV}`);

    // Seed Admin role account.
    const hashedAdminPass = await bcrypt.hash(
        config.SEED_ADMIN_PASSWORD,
        config.SALT_ROUNDS
    );
    const adminUser = await prisma.user.upsert({
        where: {
            username: 'blue0206',
        },
        update: {},
        create: {
            username: 'blue0206',
            firstName: 'Aayush',
            lastName: 'Rai',
            password: hashedAdminPass,
            role: 'ADMIN',
            messages: {
                connectOrCreate: [
                    {
                        where: {
                            id: -1,
                        },
                        create: {
                            id: -1,
                            content: "Hello there! It's Blue this side!",
                        },
                    },
                ],
            },
        },
    });
    logger.info(`Admin account ${adminUser.username} seeded.`);

    // Seed Member role account.
    const hashedMemberPass = await bcrypt.hash(
        config.SEED_MEMBER_PASSWORD,
        config.SALT_ROUNDS
    );
    const memberUser = await prisma.user.upsert({
        where: {
            username: 'red0206',
        },
        update: {},
        create: {
            username: 'red0206',
            firstName: 'Red',
            password: hashedMemberPass,
            role: 'MEMBER',
            messages: {
                connectOrCreate: [
                    {
                        where: {
                            id: -2,
                        },
                        create: {
                            id: -2,
                            content: 'Hi chat! This is Red.',
                        },
                    },
                ],
            },
        },
    });
    logger.info(`Member account ${memberUser.username} seeded.`);

    // Seed User role account.
    const hashedUserPass = await bcrypt.hash(
        config.SEED_USER_PASSWORD,
        config.SALT_ROUNDS
    );
    const user = await prisma.user.upsert({
        where: {
            username: 'soap0206',
        },
        update: {},
        create: {
            username: 'soap0206',
            firstName: 'John',
            middleName: "'SOAP'",
            lastName: 'MacTavish',
            password: hashedUserPass,
            role: 'USER',
            messages: {
                connectOrCreate: [
                    {
                        where: {
                            id: -3,
                        },
                        create: {
                            id: -3,
                            content:
                                "Hello lads! I'm Captain MacTavish, Task Force 141, callsign '$'",
                        },
                    },
                ],
            },
        },
    });
    logger.info(`User account ${user.username} seeded.`);

    logger.info('Seeding finished.');
}

main()
    .catch(async (error: unknown) => {
        logger.error({ error }, 'Error seeding the database.');
        await prisma.$disconnect();
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
