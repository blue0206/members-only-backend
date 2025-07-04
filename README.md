# Members Only - Backend API

[![Backend CI/CD Status](https://img.shields.io/badge/CI%2FCD-Pending-lightgrey.svg)]()

This repository contains the backend API for **Members Only**, a real-time discussion platform. It's a robust monolithic application built with Node.js, Express, and TypeScript, designed to be scalable, secure, and maintainable. It serves as the single source of truth for all application data and business logic.

> **Note:** This repository represents the monolithic deployment of the application, deployed to **Render**. Ongoing development for a refactored serverless architecture is taking place on the `main` branch.

---

## 🏛️ Architecture & Core Concepts

This backend is built using a layered, feature-based architecture to promote separation of concerns and scalability.

- **Layered Architecture:**
    - **Routes:** Define the API endpoints and map them to controllers.
    - **Controllers:** Handle HTTP request/response logic and orchestrate service calls.
    - **Services:** Contain the core business logic and workflows for each feature.
    - **Data Access:** Handled by **Prisma ORM**, which provides a type-safe interface to the PostgreSQL database.
- **Feature-Based Organization:** Code is grouped by feature (e.g., `auth`, `messages`, `users`), making it easy to locate and work on related logic.
- **Error Handling:** A centralized global error handler catches all exceptions, maps them to a standardized `ApiResponseError` format, and logs them using Pino. Custom `AppError` classes are used for specific, predictable application errors.
- **Environment Configuration:** Uses a Zod-validated configuration module to load and type-check all environment variables on startup, ensuring the application doesn't start in an invalid state.

---

## 🚀 Features

- **Robust Authentication:**
    - Secure JWT-based authentication with short-lived Access Tokens and long-lived Refresh Tokens.
    - Refresh tokens are stored in secure, `HttpOnly` cookies and implement rotation with `jti` invalidation for session management.
    - Double Submit Cookie pattern implemented for CSRF protection on all state-changing endpoints.
    - Password hashing using `bcrypt`.
- **Role-Based Access Control (RBAC):**
    - Defined user roles (`Admin`, `Member`, `User`) with permissions enforced at the middleware and service layers.
- **Real-time Signaling (SSE):**
    - A dedicated Server-Sent Events (`/api/events`) endpoint pushes real-time notifications to authenticated clients about events like message updates or profile changes, enabling a live user experience.
    - Manages SSE client connections and handles graceful disconnects.
- **File Uploads & Image Processing:**
    - Secure avatar uploads using `multer` (in-memory storage).
    - Integration with **Cloudinary** for cloud storage, optimization, and on-the-fly image transformations.
- **User & Session Management:**
    - API endpoints to manage user profiles.
    - Functionality for users to view and revoke their active sessions ("Log out specific device").
    - "Last Active" status tracking for users.
- **Core Application Logic:**
    - Full CRUD (Create, Read, Update, Delete) operations for messages and other core entities.
    - "Like" functionality for messages.

---

## 🛠️ Tech Stack

- **Framework:** Node.js with Express.js
- **Language:** TypeScript
- **Database ORM:** Prisma
- **Database:** PostgreSQL
- **Authentication:** JSON Web Tokens (JWT), `bcrypt`
- **File Handling:** Multer, Cloudinary
- **Validation:** Zod (via shared types package)
- **Logging:** Pino (for structured JSON logging)
- **Real-time:** Server-Sent Events (SSE)
- **Containerization:** Docker

---

## Running Locally

You can run the backend for local development using **Docker Compose**, it manages the database and other services automatically.

This method requires having the [`members-only-docker-compose`](https://github.com/blue0206/members-only-docker-compose) repository set up.

1.  Follow the setup instructions in the `members-only-docker-compose` [README.md](https://github.com/blue0206/members-only-docker-compose/README.md).
2.  Create a `.env` file in the root of this `members-only-backend` repo.
3.  Copy the variables from `.env.example` and fill them in. The `DATABASE_URL` must point to the Docker service name:
    ```env
    # members-only-backend/.env
    DATABASE_URL="postgresql://your_db_user:your_db_password@db:5432/your_dev_db_name"
    # ... other backend variables
    ```
4.  Navigate to the `members-only-docker-compose` directory and run:
    ```bash
    docker-compose up --build
    ```
    The backend server will start with Nodemon for live reloading and will be accessible at `http://localhost:8000`.

## API Endpoints

A comprehensive list of API endpoints, request/response bodies, and error codes can be found in the **[members-only-shared-types](https://github.com/blue0206/members-only-shared-types) package repository's README**, as it serves as the primary documentation for the API contract.

---

## Deployment

This monolithic version of the backend is deployed on **Render**. It connects to a managed PostgreSQL instance provided by NeonDB.

This was initially going to be the main backend application until I realized that AWS Elastic Beanstalk, where I was thinking of deploying it, isn't under free tier 🥲. I thought of exploring other services so I checked out AWS App Runner but it didn't have a free tier either. As a result, this is deployed on render.
I'm not giving up on AWS, hence the main branch is being refactored into serverless microservice architecture so that I can rely on AWS Lambda and API Gateway which have very generous free tiers.
