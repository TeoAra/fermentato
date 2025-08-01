# Fermenta.to - Italian Beer Discovery Platform

## Overview

Fermenta.to is a full-stack web application designed for discovering Italian craft beers, pubs, and breweries. It caters to two primary user types: customers seeking beer and pub information, and pub owners managing their establishments and tap lists. The platform aims to provide a comprehensive and user-friendly experience for exploring Italy's craft beer scene, facilitating connections between consumers and businesses.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript (Vite).
- **Routing**: Wouter, supporting authenticated and unauthenticated routes.
- **State Management**: TanStack Query (React Query) for server state.
- **UI Framework**: shadcn/ui components built on Radix UI primitives.
- **Styling**: Tailwind CSS with custom CSS variables, supporting light/dark modes.

### Backend Architecture
- **Runtime**: Node.js with Express.js.
- **Language**: TypeScript with ESM modules.
- **Database**: PostgreSQL with Drizzle ORM.
- **Authentication**: Replit Auth with OpenID Connect and Passport.js.
- **Session Management**: Express sessions stored in PostgreSQL (connect-pg-simple).

### Database Architecture
- **ORM**: Drizzle ORM with schema-first approach.
- **Database**: PostgreSQL (flexible, configured for Neon serverless).
- **Migrations**: Drizzle Kit.
- **Connection**: Connection pooling with @neondatabase/serverless.

### Key Components

- **Authentication System**: Replit Auth, PostgreSQL-backed sessions, role-based access (customer, pub_owner, admin).
- **Data Models**: Users, Pubs (with logo/cover images), Breweries, Beers (with style, ABV), Tap Lists, Menu System (categories, allergens), Favorites, Pub Sizes, Image Assets.
- **Component Architecture**: Reusable UI components, page-specific components, shadcn/ui integration, responsive layout components.
- **API Design**: RESTful endpoints, authentication routes, CRUD operations for pub owners, multi-resource search functionality.

### Data Flow
- **Authentication Flow**: Replit Auth integration, user record management, PostgreSQL session storage, client-side state management via React Query.
- **Content Discovery Flow**: Featured content for unauthenticated users, personalized home for authenticated users, comprehensive search, detailed information pages.
- **Pub Management Flow**: Pub registration, dashboard for tap list/menu management, real-time updates reflected on public-facing pages.
- **Data Fetching Strategy**: React Query for caching and optimistic updates, with error boundaries and loading states.

## External Dependencies

- **Database**: Neon PostgreSQL (serverless).
- **Authentication**: Replit Auth services.
- **Image CDN**: Cloudinary for image upload and delivery.
- **WebSocket**: For real-time Neon connections.
- **Component Library**: Radix UI primitives.
- **Icons**: Lucide React.
- **Styling**: Tailwind CSS.
- **Forms**: React Hook Form with Zod validation.
- **Date Handling**: date-fns library.