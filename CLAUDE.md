# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Flokraft is a professional dance analysis platform powered by AI. It's a Next.js 16 TypeScript application that allows users to upload dance videos (or provide YouTube links) for AI-powered analysis. The platform supports multiple analysis types: Couple, Solo, Duo, and Formation dances.

## Technology Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript (with `ignoreBuildErrors: true` in config)
- **Styling**: Tailwind CSS v4
- **UI Components**: Radix UI primitives with shadcn/ui patterns
- **Authentication**: Firebase Auth (Google sign-in, email/password)
- **Database**: Firestore (via Firebase)
- **State Management**: React Context (AuthContext, CreditsContext)
- **Backend API**: External REST API at `https://chappie-demo.novosense.africa:5555`

## Common Commands

```bash
# Development
npm run dev              # Start dev server (Next.js dev mode)

# Building
npm run build           # Build for production

# Production
npm start               # Start production server

# Linting
npm run lint            # Run Next.js linter
```

## Architecture

### Directory Structure

- `app/` - Next.js App Router pages and routes
  - Route-based pages: `/login`, `/signup`, `/profile`, `/admin`, `/credits`, `/events`, `/shared-analyses`
  - Dynamic routes: `/shared/[shareId]`, `/events/[eventId]`
- `components/` - React components organized as:
  - Feature components (e.g., `dashboard-content.tsx`, `sidebar-layout.tsx`, `video-player.tsx`)
  - `ui/` - Radix UI-based design system components (buttons, dialogs, forms, etc.)
- `contexts/` - React Context providers
  - `auth-context.tsx` - Firebase authentication state and methods
  - `credits-context.tsx` - User credits management and payment integration
- `lib/` - Utility functions and configuration
  - `firebase.ts` - Firebase initialization and auth functions
  - `firebase-config.ts` - Firebase config from environment variables
  - `constants.ts` - API endpoint, dance types, admin UIDs
  - `utils.ts` - Utility functions
- `hooks/` - Custom React hooks
- `styles/` - Global styles
- `public/` - Static assets (logo, etc.)

### Authentication Flow

1. Firebase Auth handles user authentication (email/password and Google OAuth)
2. `AuthProvider` wraps the entire app in `app/layout.tsx`
3. Protected routes check for `currentUser` and redirect to `/login` if not authenticated
4. Backend API expects Firebase ID tokens in `Authorization: Bearer <token>` header
5. On first login, backend creates a user document via `/auth/verify-token` endpoint

### Credits System

- Each analysis costs 5 credits
- New users receive 5 free credits
- Users can purchase credit packages via `/credits` page
- Payment processing handled by backend API (Paystack integration)
- Credits fetched/verified via `/user/credits` endpoint
- `CreditsContext` manages credit state across the app

### Analysis Workflow

1. User selects analysis type (couple/solo/duo/formation)
2. User inputs dancer name(s) and selects dance type from predefined list
3. User uploads video file (max 100MB) OR provides YouTube URL
4. Frontend submits to `/analyze` (file upload) or `/analyze-youtube` (YouTube)
5. Backend processes video asynchronously
6. Dashboard polls `/analyses?analysis_type={type}&user_id={uid}` every 3 seconds
7. Analysis status updates: pending → processing → completed
8. Completed analyses show total score and detailed breakdown

### Admin Features

- Admin UIDs defined in `lib/constants.ts` (`ADMIN_UIDS` array)
- Admins have access to `/admin` panel (hidden from regular users in sidebar)
- Admins can rerun any analysis (regular users can only rerun stuck analyses)
- Admin status checked via `ADMIN_UIDS.includes(currentUser.uid)`

## Key Implementation Details

### Path Aliases

TypeScript paths are configured in `tsconfig.json`:
```json
"paths": {
  "@/*": ["./*"]
}
```
Use `@/` prefix for imports (e.g., `import { useAuth } from "@/contexts/auth-context"`)

### Environment Variables

Firebase configuration is loaded from `.env.local`:
- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`

All Firebase env vars must be prefixed with `NEXT_PUBLIC_` for client-side access.

### API Integration

The backend API base URL is hardcoded in multiple places (should be centralized):
- Primary definition: `lib/constants.ts` exports `API_BASE`
- Duplicate in `contexts/credits-context.tsx` (should import from constants)

**API Endpoints Used:**

*Analysis Endpoints:*
- `GET /analyses?user_id={uid}&analysis_type={type}` - Get analyses with filtering
- `GET /analyses/{id}/formatted` - Get HTML-formatted analysis text
- `GET /analyses/{id}/pdf` - Download analysis as PDF
- `POST /analyze` - Upload video file for analysis (multipart/form-data)
- `POST /analyze-youtube` - Analyze video from YouTube URL
- `DELETE /analyses/{id}` - Delete analysis and associated records
- `POST /analyses/{id}/rerun` - Rerun failed/stuck analysis
- `POST /analyses/{id}/share` - Share analysis with another user by email

*Shared Analysis Endpoints:*
- `GET /shared-analyses` - Get analyses shared with current user
- `GET /shared-analyses/{share_id}` - Get specific shared analysis details
- `DELETE /shared-analyses/{share_id}` - Remove shared analysis (recipient only)

*Event Management Endpoints:*
- `GET /events` - Get all active events with entry counts
- `POST /admin/events` - Create new event (admin only)
- `DELETE /events/{event_id}` - Delete event and all entries (admin only)
- `POST /events/{event_id}/enter` - Enter analysis into event (costs 2 credits)
- `GET /events/{event_id}/entries` - Get event leaderboard with pagination

*Admin Endpoints:*
- `GET /admin/analyses` - Get all analyses with user information (admin only)
- `GET /admin/analyses/{id}` - Get specific analysis with user details (admin only)

*Authentication & User Endpoints:*
- `POST /auth/verify-token` - Verify Firebase token and ensure user document
- `POST /auth/create-user-doc` - Create user document with initial credits
- `GET /user/credits` - Fetch user credit balance and usage stats
- `GET /user/search?email={email}` - Search for users by email (min 3 chars)

*Payment Endpoints:*
- `POST /payment/initialize` - Initialize Paystack payment (ZAR currency)
- `POST /payment/webhook` - Paystack webhook for payment verification
- `GET /payment/verify/{reference}` - Manual client-side payment verification

All authenticated requests require `Authorization: Bearer {firebase_id_token}` header.

### Component Patterns

- **Client Components**: Most components use `"use client"` directive due to hooks/interactivity
- **Loading States**: Use `loading.tsx` files for route loading states
- **Layout Pattern**: `SidebarLayout` wraps authenticated pages with navigation sidebar
- **Conditional Rendering**: Auth-protected routes return `null` during loading phase
- **Error Handling**: Error messages displayed in red alert banners at top of content

### Styling Conventions

- Tailwind CSS utility classes for all styling
- Mobile-first responsive design with `md:` and `lg:` breakpoints
- Common patterns:
  - Cards: `bg-white rounded-lg shadow p-4 md:p-6`
  - Buttons: `px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition`
  - Form inputs: `w-full p-2 border rounded-lg`
  - Active sidebar items: `bg-blue-100 text-blue-700`

### Dance Types Configuration

Dance types are categorized in `lib/constants.ts`:
- Ballroom dances (indices 0-13)
- Latin dances (indices 14-20)
- Duo dances (indices 21-33)
- Formation dances (indices 34-38)

`getDanceTypesByAnalysisType()` function filters available dances based on analysis type (though current implementation has some issues - returns same slice for couple/solo/duo).

### Video Upload

File uploads use XMLHttpRequest (not fetch) to track upload progress:
- Progress tracked via `xhr.upload.onprogress` event
- Progress displayed as percentage in UI
- Max file size: 100MB (validated client-side)
- Accepted formats: video/mp4, video/quicktime

### Polling & Real-time Updates

Dashboard auto-refreshes analyses every 3 seconds via `setInterval`:
```javascript
useEffect(() => {
  fetchAnalyses()
  const interval = setInterval(fetchAnalyses, 3000)
  return () => clearInterval(interval)
}, [analysisType])
```

## Known Configuration Notes

- TypeScript build errors are ignored (`ignoreBuildErrors: true` in `next.config.mjs`)
- Images are unoptimized (`images.unoptimized: true`)
- JSX is configured for `react-jsx` transform (not `preserve`)
- CORS must be enabled on backend for requests from frontend origin

## Development Workflow

1. Environment setup requires Firebase project configuration in `.env.local`
2. Backend API must be running and accessible at configured URL
3. Admin features require adding Firebase UID to `ADMIN_UIDS` in `lib/constants.ts`
4. New dance types can be added to `DANCE_TYPES` array in `lib/constants.ts`
5. Payment integration requires backend Paystack configuration
