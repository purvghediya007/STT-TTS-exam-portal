# Student Exams Page - Integration Guide

This document provides integration instructions for the Student Exams page (`/student/exams`) with your FastAPI backend.

## Overview

The Student Exams page is a production-ready React component built with:
- **React** (functional components + hooks)
- **Tailwind CSS** (design system with custom tokens)
- **React Router v6** for navigation
- **lucide-react** for icons
- **Vitest + React Testing Library** for testing

## Design System

The page uses a comprehensive design system defined in `tailwind.config.js`:

### Colors
- **Primary**: `#0066FF` (primary-500) with hover `#0052CC` (primary-600)
- **Brand/Accent**: `#7C3AED` (brand-400)
- **Neutral**: Slate scale (slate-50 to slate-900)
- **Status colors**: Success `#16A34A`, Warning `#F59E0B`, Danger `#EF4444`

### Typography
- **Headlines**: Inter/SF Pro Display, 700 weight
- **Body**: Inter, 400 weight, 16px base
- **Small**: 13px for badges/metadata

### Spacing
- 4px base grid system
- Card padding: 16px (mobile), 24px (desktop)
- Border radius: 16px for cards, 6px for buttons

## File Structure

```
src/
├── pages/
│   └── StudentExams.jsx          # Main page component
├── components/
│   ├── ExamCard.jsx              # Exam card component
│   ├── JoinModal.jsx             # Start exam modal
│   ├── SkeletonCard.jsx           # Loading skeleton
│   ├── StatusPill.jsx             # Status badge component
│   ├── Badge.jsx                  # Badge component
│   ├── EmptyState.jsx             # Empty state component
│   └── ErrorState.jsx             # Error state component
├── hooks/
│   ├── useExams.ts                # Main hook for exams logic
│   ├── useCountdown.js            # Countdown timer hook
│   └── useDebouncedValue.js       # Debounced value hook
├── services/
│   └── api.ts                     # API service layer
└── utils/
    └── format.ts                  # Date/time formatting utilities
```

## Backend Integration

### 1. API Base URL Configuration

Update the `API_BASE_URL` in `src/services/api.ts`:

```typescript
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api'
```

Or set via environment variable:
```bash
# .env
VITE_API_BASE_URL=https://api.yourserver.com
```

### 2. Authentication Integration

**TODO**: Replace the `getAuthHeaders()` function in `src/services/api.ts`:

```typescript
function getAuthHeaders(): HeadersInit {
  // Option 1: JWT from localStorage
  const token = localStorage.getItem('auth_token')
  return {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
  }
  
  // Option 2: Using auth context
  // const { token } = useAuth() // Your auth context
  // return {
  //   'Content-Type': 'application/json',
  //   ...(token && { Authorization: `Bearer ${token}` }),
  // }
  
  // Option 3: Session-based (cookies sent automatically)
  // return {
  //   'Content-Type': 'application/json',
  // }
}
```

### 3. Required API Endpoints

#### GET `/api/student/exams`

**Query Parameters:**
- `status` (optional): `all | live | upcoming | finished`
- `page` (optional): Page number
- `limit` (optional): Items per page

**Response:**
```json
{
  "exams": [
    {
      "id": "EX-101",
      "title": "Intro to Algorithms - Midterm",
      "shortDescription": "Data structures, complexity, and basic algorithms.",
      "startsAt": "2025-12-03T10:00:00Z",
      "endsAt": "2025-12-03T12:00:00Z",
      "durationMin": 120,
      "timePerQuestionSec": 60,
      "status": "live",
      "attemptsLeft": 1,
      "allowedReRecords": 1,
      "teacherName": "Prof. X",
      "pointsTotal": 100,
      "thumbnailUrl": null,
      "settingsSummary": {
        "strictMode": false
      }
    }
  ],
  "page": 1,
  "limit": 20,
  "total": 3
}
```

#### GET `/api/student/exams/:examId/summary`

**Response:**
```json
{
  "id": "EX-101",
  "title": "Intro to Algorithms - Midterm",
  "instructions": "Read rules carefully...",
  "timePerQuestionSec": 60,
  "durationMin": 120,
  "attemptsLeft": 1,
  "allowedReRecords": 1,
  "strictMode": false,
  "otherSettings": {}
}
```

#### POST `/api/student/exams/:examId/start`

**Request Body:** `{}`

**Success Response (200):**
```json
{
  "attemptId": "ATT-987",
  "expiresAt": "2025-12-03T11:59:00Z",
  "firstQuestionId": "Q1"
}
```

**Error Responses:**
- **400**: `{ "error": "attempts_exhausted", "message": "You have no attempts left." }`
- **403**: `{ "error": "not_live", "message": "Exam is not live." }`

## Installation

1. **Install dependencies:**
```bash
npm install
```

2. **Install lucide-react (if not already installed):**
```bash
npm install lucide-react
```

## Running the Application

```bash
# Development
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Testing

```bash
# Run tests
npm test

# Run tests with UI
npm run test:ui

# Run tests with coverage
npm run test:coverage
```

### Test Coverage

The test suite includes:
- **useExams hook**: Filtering, sorting, search debounce behavior
- **ExamCard**: Displays correct CTA for each status, shows countdown for live exams
- **JoinModal**: Calls `/start` when confirmed, handles server errors

### E2E Testing (Cypress)

Suggested Cypress tests:
1. **Join flow happy path**: Mock successful `POST /start` response
2. **Join flow error path**: Mock 400/403 error responses
3. **Search and filter**: Test search debounce and filter changes

## Features

### Search
- Debounced search (250ms) by title, ID, or description
- Search state persisted in sessionStorage

### Filtering
- Segmented control for: All, Live, Upcoming, Finished
- Filter state persisted in sessionStorage

### Sorting
- Sort by: Start time, Title, Deadline
- Sort state persisted in sessionStorage

### Live Updates
- Auto-refresh every 60 seconds for live exams
- Real-time countdown updates every second
- Countdown displayed in `aria-live="polite"` region

### Prefetching
- Exam summary prefetched on card hover
- Prefetch on "View details" click
- Cached for faster navigation

### Caching
- Last fetched exams cached in sessionStorage
- Instant rebuild on page reload
- Falls back to mock data if API fails

### Accessibility
- Keyboard navigation support
- Focus trap in modal
- ARIA labels and live regions
- Semantic HTML
- WCAG AA color contrast

## Demo Mode

When the API is unavailable, the page automatically:
- Shows a "Demo mode" banner
- Uses mock exam data (defined in `src/services/api.ts`)
- Displays a helpful error message

To disable demo mode, ensure your API is accessible and `getAuthHeaders()` returns valid credentials.

## Icons Used

The page uses **lucide-react** icons:
- `FileText` - Exam/document icon
- `Clock` - Timer/duration icon
- `Calendar` - Date/time icon
- `User` - Teacher icon
- `Award` - Points/score icon
- `Play` - Join/start icon
- `Search` - Search icon
- `Funnel` - Filter icon
- `AlertTriangle` - Error icon
- `CheckCircle` - Success icon
- `Mic` - Microphone requirement
- `Shield` - Strict mode
- `X` - Close icon

## Responsive Breakpoints

- **Mobile** (<640px): 1-column list, compact metadata, 18px icons
- **Tablet** (640–1024px): 2-column grid
- **Desktop** (>=1024px): 3-column grid, full metadata

## Micro-interactions

- Card hover: Lift (`-translate-y-1`) + shadow increase
- Button press: Scale (`scale-[0.98]`)
- Live status: Pulsing dot animation
- Skeleton: Shimmer animation
- Modal: Fade-in and zoom-in animations

## Troubleshooting

### API calls failing
- Verify `API_BASE_URL` is set correctly
- Check `getAuthHeaders()` implementation
- Ensure CORS is configured on the backend
- Check browser console for network errors

### Countdown not updating
- Check browser console for errors
- Verify exam `endsAt` date is in the future
- Ensure the component is re-rendering

### Modal not closing
- Check for JavaScript errors in console
- Verify focus trap implementation
- Ensure `onClose` callback is properly passed

### Tests failing
- Ensure all dependencies are installed: `npm install`
- Check that `jsdom` is properly configured in `vite.config.js`
- Verify mock implementations match actual API responses

## Next Steps

1. **Wire up authentication**: Replace `getAuthHeaders()` placeholder
2. **Set API base URL**: Configure `VITE_API_BASE_URL` environment variable
3. **Add exam attempt route**: Implement `/student/exams/:examId` route for exam taking
4. **Add results route**: Implement `/student/exams/:examId/results` route
5. **Add WebSocket support**: For real-time exam status updates (optional)

## Support

For issues or questions, refer to the main project documentation or contact the development team.
