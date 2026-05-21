# ERP Dashboard - Architecture & Development Guide

## 🏗️ Architecture Overview

This ERP dashboard follows a modern, scalable frontend architecture with clean separation of concerns:

```
┌─────────────────────────────────────────────────────────────┐
│                    Next.js App Router                        │
│        (Server-side Rendering & Static Generation)          │
└────────────────┬────────────────────────────────────────────┘
                 │
┌────────────────┴────────────────────────────────────────────┐
│              React Components & Hooks Layer                  │
│     (UI Components, Custom Hooks, Error Boundaries)         │
└────────────────┬────────────────────────────────────────────┘
                 │
┌────────────────┴────────────────────────────────────────────┐
│          Business Logic & Services Layer                     │
│     (API Client, Error Handling, Data Fetching)             │
└────────────────┬────────────────────────────────────────────┘
                 │
┌────────────────┴────────────────────────────────────────────┐
│              Backend API Layer (External)                    │
│        (Node.js/Express/Other Backend Server)               │
└─────────────────────────────────────────────────────────────┘
```

## 📦 Layer Descriptions

### 1. **Presentation Layer** (`/components`)
- Reusable UI components with single responsibility
- No business logic, only UI rendering
- Props-based configuration
- Examples: Button, Card, Badge, Alert

### 2. **Page Layer** (`/app/dashboard/*`)
- Next.js pages that compose components
- Handle route-level concerns (metadata, layout)
- Connect data to components
- Implement page-specific logic

### 3. **Business Logic Layer** (`/lib`)
- Custom hooks for data fetching and state management
- API service clients
- Utility functions
- Constants and configurations

### 4. **API Client Layer** (`/lib/api`)
- Axios instance with interceptors
- Error handling and transformation
- Token injection for authentication
- Request/response middleware

## 🔄 Data Flow

### Example: Fetching Users Data

```
User Interaction
      ↓
Page Component (useFetch)
      ↓
Custom Hook (useFetch)
      ↓
API Client (apiClient.get)
      ↓
HTTP Request → Backend API
      ↓
Response Processing (Interceptors)
      ↓
Error Handling (Custom Error Classes)
      ↓
State Update → Re-render
```

## 🎯 Key Design Patterns

### 1. **Component Composition**
```tsx
<DashboardLayout>
  <Breadcrumb />
  <Card>
    <CardHeader>Title</CardHeader>
    <CardBody>Content</CardBody>
    <CardFooter>Actions</CardFooter>
  </Card>
</DashboardLayout>
```

### 2. **Custom Hooks for Logic**
```tsx
const { data, loading, error } = useFetch('/api/users');
const { user, login, logout } = useAuth();
```

### 3. **Error Boundary for Fallbacks**
```tsx
<ErrorBoundary fallback={(error, reset) => <ErrorUI />}>
  <MyComponent />
</ErrorBoundary>
```

### 4. **API Interceptors for Cross-Cutting Concerns**
```tsx
// Request: Inject auth token
// Response: Handle errors globally
// Both: Log/monitor API calls
```

## 🔐 Security Considerations

### Authentication Flow
1. User logs in with credentials
2. Backend returns auth token
3. Token stored in localStorage (ready for sessionStorage upgrade)
4. Token automatically injected in API requests
5. 401 response triggers logout + redirect

### CORS & HTTPS
- Ensure backend has proper CORS headers
- Use HTTPS in production
- Secure cookies with httpOnly flag (future upgrade)

### XSS Prevention
- React automatically escapes content
- DOMPurify integration (if needed for rich text)

### CSRF Protection
- Token-based CSRF should be handled by backend
- Consider implementing CSRF tokens

## 🚀 Performance Considerations

### Code Splitting
- Next.js automatically splits code per route
- Components are lazy-loaded on demand

### Image Optimization
- Use Next.js Image component for optimization
- Consider WebP format for better compression

### State Management
- Minimal state (hooks + Context if needed)
- Avoid unnecessary re-renders with React.memo
- Use useCallback for function stability

### API Caching
- Implement SWR or React Query for advanced caching
- Consider ETags for conditional requests

## 📊 State Management Strategy

### Current Approach
- Component-level state with useState
- Custom hooks for shared logic
- No external state management library

### Future Upgrade Path
```tsx
// If needed, add one of:
// 1. React Context + useReducer
// 2. Redux Toolkit
// 3. Zustand
// 4. TanStack Query (React Query)
```

### When to Upgrade
- Complex global state sharing
- Frequent state updates
- Time-travel debugging needed
- Server state synchronization complex

## 🧪 Testing Strategy

### Component Testing
```tsx
// Create tests in __tests__ or .test.tsx files
import { render, screen } from '@testing-library/react';
import { Button } from '@/components';

test('Button renders with text', () => {
  render(<Button>Click me</Button>);
  expect(screen.getByText('Click me')).toBeInTheDocument();
});
```

### Hook Testing
```tsx
import { renderHook, act } from '@testing-library/react';
import { useFetch } from '@/lib/hooks/useFetch';

test('useFetch fetches data', async () => {
  const { result } = renderHook(() => useFetch('/api/users'));
  // Test assertions
});
```

### API Testing
```tsx
// Mock API with MSW (Mock Service Worker)
import { server } from '@/mocks/server';
import { rest } from 'msw';

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

## 📱 Responsive Design Strategy

### Mobile-First Approach
```css
/* Default styles for mobile */
.component {
  display: flex;
  flex-direction: column;
}

/* Larger screens */
@media (min-width: 768px) {
  .component {
    flex-direction: row;
  }
}
```

### Tailwind Breakpoints Used
- `sm:` - 640px (tablets)
- `md:` - 768px (tablets+)
- `lg:` - 1024px (desktops)
- `xl:` - 1280px (large desktops)

## 🔄 Git Workflow Recommendations

### Branch Naming
```
feature/add-user-management
bugfix/fix-api-error-handling
docs/update-readme
refactor/reorganize-components
```

### Commit Message Format
```
feat: Add user management page
fix: Resolve API interceptor bug
docs: Update component documentation
refactor: Optimize sidebar rendering
style: Fix linting issues
```

## 📚 Documentation Files

- **README-ERP.md** - User and feature documentation
- **ARCHITECTURE.md** - This file (technical design)
- **Component comments** - In-code documentation
- **.env.example** - Environment variables template

## 🔧 Development Workflow

### Day-to-Day Development
1. Start dev server: `npm run dev`
2. Create feature branch
3. Implement feature with components
4. Test on mobile/tablet/desktop
5. Commit and push
6. Create pull request
7. Code review
8. Merge to main

### Adding a New Feature

Example: Adding an "Analytics" page

1. **Create Page**
```tsx
// app/dashboard/analytics/page.tsx
export default function AnalyticsPage() {
  return (
    <DashboardLayout>
      {/* Analytics content */}
    </DashboardLayout>
  );
}
```

2. **Add Route to Menu**
```tsx
// lib/constants.ts
export const SIDEBAR_MENU = [
  // ...
  {
    label: 'Analytics',
    href: ROUTES.ANALYTICS,
    icon: 'BarChart3',
  },
];
```

3. **Create Components (if needed)**
```tsx
// components/AnalyticsChart.tsx
export const AnalyticsChart = ({ data }) => {
  // Component logic
};
```

4. **Add Metadata**
```tsx
export const metadata: Metadata = {
  title: 'Analytics | ERP System',
  description: 'View system analytics and reports',
};
```

## 🚨 Common Issues & Solutions

### Issue: API calls not working
**Solution:**
1. Check `NEXT_PUBLIC_API_URL` in `.env.local`
2. Verify backend is running
3. Check CORS headers in backend
4. Test API endpoint with Postman

### Issue: Sidebar not responsive
**Solution:**
1. Check media queries in `components/Sidebar.tsx`
2. Verify onClick handlers work on mobile
3. Test on actual mobile device (not just DevTools)

### Issue: Components not rendering
**Solution:**
1. Check for TypeScript errors
2. Verify imports are correct
3. Check for missing props
4. Review console for React warnings

## 🔮 Future Enhancements

### Short Term
- [ ] Add form handling (React Hook Form)
- [ ] Add data validation (Zod/Yup)
- [ ] Implement pagination components
- [ ] Add date picker component
- [ ] Add search/filter functionality

### Medium Term
- [ ] Implement advanced caching (React Query)
- [ ] Add real-time updates (WebSocket)
- [ ] Dark/light mode toggle
- [ ] Internationalization (i18n)
- [ ] Advanced analytics/reporting

### Long Term
- [ ] Mobile app (React Native)
- [ ] Offline capabilities (IndexedDB)
- [ ] Progressive Web App (PWA)
- [ ] Advanced permission system
- [ ] Custom theme builder

## 📞 Backend Integration Guide

### Expected API Endpoints

```
GET    /api/users              → List users
POST   /api/users              → Create user
GET    /api/users/:id          → Get user
PUT    /api/users/:id          → Update user
DELETE /api/users/:id          → Delete user

GET    /api/roles              → List roles
POST   /api/roles              → Create role
GET    /api/roles/:id          → Get role
PUT    /api/roles/:id          → Update role
DELETE /api/roles/:id          → Delete role

GET    /api/tasks              → List tasks
POST   /api/tasks              → Create task
GET    /api/tasks/:id          → Get task
PUT    /api/tasks/:id          → Update task
DELETE /api/tasks/:id          → Delete task

POST   /api/auth/login         → User login
POST   /api/auth/logout        → User logout
POST   /api/auth/refresh       → Refresh token
GET    /api/auth/me            → Get current user
```

### Expected Response Format

```json
{
  "success": true,
  "data": {},
  "message": "Operation successful",
  "timestamp": "2024-05-21T10:00:00Z"
}
```

### Error Response Format

```json
{
  "success": false,
  "error": {
    "code": "USER_NOT_FOUND",
    "message": "User with ID 1 not found",
    "details": {}
  },
  "timestamp": "2024-05-21T10:00:00Z"
}
```

## 🎓 Learning Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [React Documentation](https://react.dev)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Axios Documentation](https://axios-http.com/docs/intro)

---

**Document Version:** 1.0
**Last Updated:** May 2026
**Maintained By:** Frontend Team
