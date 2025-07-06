/* eslint-disable @typescript-eslint/no-empty-function */

import 'dotenv/config';
import { PrismaClient } from '@members-only/database';
import { logger } from '../logger.js';
import bcrypt from 'bcrypt';
import type { Role } from '@blue0206/members-only-shared-types';

const config = {
    NODE_ENV: process.env.NODE_ENV ?? 'development',
    SEED_ADMIN_PASSWORD: process.env.SEED_ADMIN_PASSWORD ?? 'Password@1234',
    SALT_ROUNDS: parseInt(process.env.SALT_ROUNDS ?? '10'),
    SEED_USER_PASSWORD: process.env.SEED_USER_PASSWORD ?? 'Password@1234',
    SEED_MEMBER_PASSWORD: process.env.SEED_MEMBER_PASSWORD ?? 'Password@1234',
};

const prisma = new PrismaClient();

async function main(): Promise<void> {
    logger.info(`Start seeding with NODE_ENV: ${config.NODE_ENV}`);

    // Seed Admin Account (blue0206)
    const hashedAdminPass = await bcrypt.hash(
        config.SEED_ADMIN_PASSWORD,
        config.SALT_ROUNDS
    );
    const adminUser = await prisma.user.upsert({
        where: { username: 'blue0206' },
        update: {},
        create: {
            username: 'blue0206',
            firstName: 'Aayush',
            lastName: 'Rai',
            password: hashedAdminPass,
            role: 'ADMIN',
            avatar: 'https://placehold.co/512x512/3B82F6/E0E7FF/png?text=AR',
        },
    });
    logger.info(`Admin account ${adminUser.username} seeded.`);

    // Seed Dummy Users
    const usersToSeed = [
        {
            username: 'coder_jane',
            firstName: 'Jane',
            lastName: 'Doe',
            role: 'MEMBER',
            avatarText: 'JD',
            password: 'password123',
        },
        {
            username: 'react_guru',
            firstName: 'Alex',
            lastName: 'Smith',
            role: 'MEMBER',
            avatarText: 'AS',
            password: 'password123',
        },
        {
            username: 'node_ninja',
            firstName: 'Sam',
            lastName: 'Jones',
            role: 'USER',
            avatarText: 'SJ',
            password: 'password123',
        },
        {
            username: 'db_diana',
            firstName: 'Diana',
            lastName: 'Prince',
            role: 'USER',
            avatarText: 'DP',
            password: 'password123',
        },
        {
            username: 'soap0206',
            firstName: 'John',
            middleName: "'SOAP'",
            lastName: 'MacTavish',
            role: 'USER',
            avatarText: 'SM',
            password: config.SEED_USER_PASSWORD,
        },
        {
            username: 'ghost_simon',
            firstName: 'Simon',
            lastName: 'Riley',
            role: 'USER',
            avatarText: 'GR',
            password: 'password123',
        },
        {
            username: 'design_dave',
            firstName: 'David',
            lastName: 'Chen',
            role: 'MEMBER',
            avatarText: 'DC',
            password: 'password123',
        },
        {
            username: 'frontend_fay',
            firstName: 'Fay',
            lastName: 'Valentine',
            role: 'MEMBER',
            avatarText: 'FV',
            password: 'password123',
        },
        {
            username: 'red0206',
            firstName: 'Ash',
            lastName: 'Ketchum',
            role: 'MEMBER',
            avatarText: 'AK',
            password: config.SEED_MEMBER_PASSWORD,
        },
    ];

    const createdUsers = [];
    for (const userData of usersToSeed) {
        const hashedPassword = await bcrypt.hash(
            userData.password,
            config.SALT_ROUNDS
        );
        const user = await prisma.user.upsert({
            where: { username: userData.username },
            update: {},
            create: {
                username: userData.username,
                firstName: userData.firstName,
                lastName: userData.lastName,
                middleName: userData.middleName,
                password: hashedPassword,
                role: userData.role as Role,
                avatar: `https://placehold.co/512x512/7C3AED/F3E8FF/png?text=${userData.avatarText}`,
            },
        });
        createdUsers.push(user);
        logger.info(`Seeded user: ${user.username}`);
    }

    const allUsers = [adminUser, ...createdUsers];

    // Seed Messages (including the Welcome Message)
    const messagesToSeed = [
        // Welcome Message (ID 1)
        {
            id: 1,
            authorUsername: 'blue0206',
            content: `
# Welcome to Members Only! 👋

This is a place to share your thoughts, ideas, and connect with other members. Here are a few things you should know:

- **Markdown is supported!** You can format your messages with headings, lists, bold/italic text, and more.
- **Code Syntax Highlighting** is built-in. Just specify the language after the backticks.

Here's a quick example in TypeScript:
\`\`\`ts
// Say hello to everyone!
function greet(name: string): string {
  console.log('Initializing greeting...');
  return \`Hello, \${name}! Welcome to the community.\`;
}

greet('New Member');
\`\`\`

Feel free to introduce yourself. We're excited to have you here!

Cheers,
- Aayush (Admin)
            `,
        },
        {
            authorUsername: 'coder_jane',
            content:
                'Just deployed a new project to AWS App Runner. The developer experience is so smooth compared to setting up EC2 and a load balancer manually!',
        },
        {
            authorUsername: 'react_guru',
            content:
                "Has anyone tried Vitest for unit testing their backend? I'm moving from Jest and it feels incredibly fast.",
        },
        {
            authorUsername: 'node_ninja',
            content:
                "I'm working on a complex Prisma query with nested includes and selects. The type-safety is amazing but sometimes it feels like I'm fighting the type system!",
        },
        {
            authorUsername: 'captain_soap',
            content:
                "What's everyone's favorite CSS-in-JS library for React? Or are you sticking with Tailwind CSS?",
        },
        {
            authorUsername: 'db_diana',
            content:
                'Quick reminder: `HttpOnly` cookies are essential for storing refresh tokens to prevent XSS attacks!',
        },
        {
            authorUsername: 'ghost_simon',
            content:
                "Here's a quick SQL snippet for anyone needing to find duplicate emails:\n```sql\nSELECT email, COUNT(email) \nFROM users \nGROUP BY email \nHAVING COUNT(email) > 1;\n```",
        },
        {
            authorUsername: 'design_dave',
            content:
                'Finally figured out Server-Sent Events! The auto-reconnect feature is a lifesaver.',
        },
        {
            authorUsername: 'frontend_fay',
            content:
                'I think `Promise.allSettled()` is one of the most underrated additions to JavaScript for handling multiple independent async operations.',
        },
        {
            authorUsername: 'react_guru',
            content:
                'Trying out `react-window` for the first time to virtualize a long list. The performance improvement is incredible.',
        },
        {
            authorUsername: 'coder_jane',
            content:
                'Just finished setting up a CI/CD pipeline with GitHub Actions. It feels great to have tests run automatically on every push.',
        },
        {
            authorUsername: 'node_ninja',
            content:
                'Thinking about system design. When do you choose a monolith over microservices for a new project?',
        },
        {
            authorUsername: 'captain_soap',
            content:
                "That feeling when you finally solve a bug that's been bothering you for hours... priceless.",
        },
        {
            authorUsername: 'db_diana',
            content:
                "Anyone have tips for managing environment variables in production? I'm looking at AWS Secrets Manager.",
        },
        {
            authorUsername: 'ghost_simon',
            content:
                'Is `pnpm` really that much faster than `npm` or `yarn` for package installation? Thinking of switching.',
        },
        {
            authorUsername: 'design_dave',
            content:
                "Tailwind's `prose` plugin is magic for styling markdown content, but you have to remember to disable it for code blocks if you're using a syntax highlighter.",
        },
        {
            authorUsername: 'frontend_fay',
            content:
                'Just refactored a huge controller into a smaller controller and a dedicated service class. The code is so much cleaner now.',
        },
        {
            authorUsername: 'blue0206',
            content: 'What a day, time to grab a coffee. ☕',
        },
        {
            authorUsername: 'react_guru',
            content:
                'Remember to use database transactions for operations that need to be atomic, like creating a user and their initial profile in one go.',
        },
        {
            authorUsername: 'coder_jane',
            content:
                "Here's a useful hook for debouncing input in React:\n```tsx\nimport { useState, useEffect } from 'react';\n\nexport function useDebounce<T>(value: T, delay: number): T {\n  const [debouncedValue, setDebouncedValue] = useState<T>(value);\n\n  useEffect(() => {\n    const handler = setTimeout(() => {\n      setDebouncedValue(value);\n    }, delay);\n\n    return () => {\n      clearTimeout(handler);\n    };\n  }, [value, delay]);\n\n  return debouncedValue;\n}\n```",
        },
        {
            authorUsername: 'node_ninja',
            content:
                'The difference between `let`, `const`, and `var` is one of the first things every new JS dev should master.',
        },
        {
            authorUsername: 'captain_soap',
            content:
                'Is anyone using GraphQL? How does it compare to building a REST API with something like RTK Query?',
        },
        {
            authorUsername: 'db_diana',
            content: 'Foxtrot. Uniform. Charlie. Kilo. We have a problem.',
        },
        { authorUsername: 'ghost_simon', content: 'Bravo Six, going dark.' },
        {
            authorUsername: 'red0206',
            content: "Gotta catch em' all!",
        },
    ];

    const createdMessages = [];
    for (const msgData of messagesToSeed) {
        const author = allUsers.find((u) => u.username === msgData.authorUsername);
        if (!author) continue;

        const message = await prisma.message.upsert({
            where: { id: msgData.id ?? -999 }, // Use ID for welcome message, dummy for others
            update: { content: msgData.content },
            create: {
                ...(msgData.id && { id: msgData.id }), // Conditionally add ID
                content: msgData.content,
                authorId: author.id,
            },
        });
        createdMessages.push(message);
    }
    logger.info(`Seeded ${createdMessages.length.toString()} messages.`);

    // Seed Likes and Bookmarks
    // Make most users like the welcome message
    for (const user of createdUsers) {
        await prisma.like
            .create({
                data: {
                    userId: user.id,
                    messageId: 1, // Welcome message ID
                },
            })
            .catch(() => {
                /* Ignore errors if like already exists */
            });
    }
    logger.info(`Seeded likes for the welcome message.`);

    // Make some users like other random messages
    await prisma.like
        .create({
            data: { userId: createdUsers[0].id, messageId: createdMessages[2].id },
        })
        .catch(() => {});
    await prisma.like
        .create({
            data: { userId: createdUsers[1].id, messageId: createdMessages[2].id },
        })
        .catch(() => {});
    await prisma.like
        .create({
            data: { userId: createdUsers[3].id, messageId: createdMessages[5].id },
        })
        .catch(() => {});
    await prisma.like
        .create({ data: { userId: adminUser.id, messageId: createdMessages[5].id } })
        .catch(() => {});

    // Make some users bookmark messages
    await prisma.bookmark
        .create({
            data: { userId: createdUsers[0].id, messageId: createdMessages[6].id },
        })
        .catch(() => {});
    await prisma.bookmark
        .create({
            data: { userId: createdUsers[2].id, messageId: createdMessages[18].id },
        })
        .catch(() => {});
    await prisma.bookmark
        .create({
            data: { userId: adminUser.id, messageId: createdMessages[18].id },
        })
        .catch(() => {});
    logger.info(`Seeded some random likes and bookmarks.`);

    logger.info('Seeding finished successfully.');
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
