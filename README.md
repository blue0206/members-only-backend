# Members Only (Monolithic Deployment Version)

**Note:** This branch represents the stable, monolithic version of the Members Only backend. The `main` branch contains the active development work refactoring this application into a serverless microservice architecture on AWS Lambda.

---

## Overview

This repository contains the backend code for the "Members Only" application, a kind of classic clubhouse-style message board. It is built as a traditional, robust monolithic application using Node.js, Express, and Prisma, designed to be deployed as a single, stateful container.

### Tech Stack

- **Framework:** Node.js, Express.js
- **Language:** TypeScript
- **ORM:** Prisma
- **Database:** PostgreSQL
- **Authentication:** JWTs with Access & Refresh Tokens (stored in `HttpOnly` cookie) with CSRF protection
- **Real-time:** Server-Sent Events (SSE) for live updates
- **File Uploads:** Cloudinary API

### Key Features

- **Robust Authentication:** Secure user registration, login, logout, and token refresh system with CSRF protection.
- **Role-Based Access Control:** Differentiates between regular Users, Members, and Admins, with message author visibility and actions restricted by role.
- **Real-Time Messaging:** A central message board where users can post and view messages, with new messages pushed to all connected clients in real-time via SSE.
- **User Activity Tracking:** Features logic to track when users are last active.
- **Cloud-Based Image Uploads:** Users can upload avatars which are stored and served via the Cloudinary CDN.

## Project Architecture

This application is built using a **Layered Architecture**:

- **Routes:** Defines all API endpoints.
- **Controllers:** Handles HTTP request/response validation and flow.
- **Services:** Contains all core business logic.
- **Data Access Layer:** Managed by the Prisma Client ORM.

[This article really helped me in coming up with this](https://blog.logrocket.com/node-js-project-architecture-best-practices/)

## Running Locally

This service is designed to be run as part of the `dev-environment` Docker Compose setup. Please see [the repository for that project](https://github.com/blue0206/members-only-docker-compose) for instructions on running the full stack locally.

Key environment variables are documented in the `.env.example` file.

## Deployment

This was initially going to be the main backend application until I realized that AWS Elastic Beanstalk, where I was thinking of deploying it, isn't under free tier 🥲. I thought of exploring other services so I checked out AWS App Runner but it didn't have a free tier either. As a result, this is deployed on render.

I'm not giving up on AWS, hence the main branch is being refactored into serverless microservice architecture so that I can rely on AWS Lambda and API Gateway which have very generous free tiers.
