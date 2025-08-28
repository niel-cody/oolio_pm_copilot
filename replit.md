# Overview

This is a Jira PM Copilot web application designed to help Product Managers streamline their workflow by reading ideas/issues from Jira, grooming them into structured Epics and Stories, writing updates back to Jira, and generating release notes. The application provides AI-assisted grooming capabilities and integrates with Jira's REST API for seamless issue management.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
- **Framework**: React with TypeScript using Vite as the build tool
- **UI Components**: Built with shadcn/ui (Radix-based) and Tailwind CSS for styling
- **State Management**: TanStack Query (React Query) for server state management and API caching
- **Routing**: Wouter for client-side routing
- **Forms**: React Hook Form with Zod validation for type-safe form handling

## Backend Architecture
- **Server**: Express.js with TypeScript running as ESM modules
- **API Structure**: RESTful endpoints under `/api/*` namespace
- **Middleware**: Custom logging, JSON parsing, and error handling
- **Development**: Vite middleware integration for hot module replacement

## Database and ORM
- **ORM**: Drizzle ORM configured for PostgreSQL
- **Database**: PostgreSQL (configured via DATABASE_URL environment variable)
- **Schema**: Centralized schema definitions in `/shared/schema.ts`
- **Storage**: In-memory storage implementation for development with interface for future database integration

## Authentication and Data Flow
- **Mock Authentication**: Currently uses a mock user ID for development
- **Session Management**: Designed to integrate with proper authentication (infrastructure ready)
- **API Communication**: Centralized API client with error handling and response normalization

## Integration Architecture
- **Jira Integration**: Custom JiraClient service for REST API communication using Basic Auth
- **AI Integration**: OpenAI service for idea grooming and content generation
- **Templates**: Configurable Epic and Story templates stored in database

## Key Design Patterns
- **Shared Types**: Common types and schemas shared between client and server
- **Service Layer**: Separate services for external integrations (Jira, OpenAI)
- **Component Architecture**: Reusable UI components with consistent theming
- **Error Handling**: Centralized error handling with user-friendly messaging

# External Dependencies

## Core Services
- **Jira Cloud**: Primary integration for issue management via REST API v3
- **OpenAI**: AI assistance for grooming ideas into structured formats
- **Neon Database**: PostgreSQL hosting (via @neondatabase/serverless)

## UI and Styling
- **Radix UI**: Headless component primitives for accessibility
- **Tailwind CSS**: Utility-first CSS framework for styling
- **Lucide React**: Icon library for consistent iconography

## Development Tools
- **Vite**: Build tool and development server
- **TypeScript**: Type safety across the entire stack
- **Replit**: Development environment with custom plugins for error handling

## Data and State Management
- **TanStack Query**: Server state management and caching
- **React Hook Form**: Form state management with validation
- **Zod**: Runtime type validation and schema definition

## Authentication and Sessions
- **Connect PG Simple**: PostgreSQL session store (configured for future use)
- **Express Session**: Session management middleware

The application is architected as a full-stack TypeScript application with clear separation between client and server code, shared type definitions, and a modular service-oriented design that supports both development and production environments.