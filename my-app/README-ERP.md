# ERP System Dashboard - Frontend

A modern, scalable, and production-ready ERP dashboard built with Next.js 16, React 19, TypeScript, and Tailwind CSS.

## 🎯 Features

### Core Features
- ✅ Responsive dashboard with collapsible sidebar
- ✅ Dynamic navigation with active state indication
- ✅ User Management system (Users & Roles)
- ✅ Task management with status tracking
- ✅ Error boundary for graceful error handling
- ✅ Global error handling with API interceptors
- ✅ Custom hooks for common operations (useFetch, useAuth)
- ✅ Reusable UI components (Button, Card, Badge, Alert, etc.)
- ✅ SEO optimized with proper metadata
- ✅ Fully responsive (mobile, tablet, desktop)
- ✅ Loading states and skeletons
- ✅ Breadcrumb navigation

### Technical Features
- TypeScript for type safety
- Tailwind CSS v4 for styling
- Axios for API calls with interceptors
- Custom error classes for better error handling
- Modular architecture for scalability
- Clean code principles and best practices

## 📁 Project Structure

```
src/
├── app/                                 # Next.js App Router
│   ├── page.tsx                        # Home page (redirects to dashboard)
│   ├── layout.tsx                      # Root layout with global metadata
│   ├── globals.css                     # Global styles and Tailwind directives
│   └── dashboard/                      # Dashboard pages
│       ├── page.tsx                    # Dashboard overview
│       ├── tasks/
│       │   └── page.tsx               # Tasks management page
│       └── user-management/
│           ├── page.tsx               # User management hub
│           ├── users/
│           │   └── page.tsx           # Users list and management
│           └── roles/
│               └── page.tsx           # Roles management
│
├── components/                         # Reusable UI Components
│   ├── index.ts                       # Component exports
│   ├── Button.tsx                     # Button component with variants
│   ├── Card.tsx                       # Card component with subcomponents
│   ├── Badge.tsx                      # Badge/status indicator
│   ├── Skeleton.tsx                   # Loading skeletons
│   ├── Alert.tsx                      # Alert/notification component
│   ├── ErrorBoundary.tsx              # Error boundary wrapper
│   ├── Breadcrumb.tsx                 # Breadcrumb navigation
│   ├── Sidebar.tsx                    # Collapsible sidebar menu
│   ├── Navbar.tsx                     # Top navigation bar
│   └── Layout.tsx                     # Main dashboard layout wrapper
│
├── lib/                               # Utilities and services
│   ├── constants.ts                   # Application constants
│   ├── utils.ts                       # Utility functions
│   ├── api-errors.ts                  # Custom error classes
│   ├── api/
│   │   └── api-client.ts              # Axios instance with interceptors
│   └── hooks/
│       ├── useFetch.ts                # Data fetching hook
│       └── useAuth.ts                 # Authentication hook
│
└── public/                            # Static assets
```

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ (installed)
- npm or yarn

### Installation

1. **Install dependencies:**
```bash
npm install
```

2. **Run development server:**
```bash
npm run dev
```

The application will be available at `http://localhost:3000`

3. **Build for production:**
```bash
npm run build
npm start
```

## 📚 Component Usage

### Button Component
```tsx
import { Button } from '@/components';

// Primary button
<Button variant="primary">Click me</Button>

// With loading state
<Button isLoading={true}>Processing...</Button>

// Full width
<Button fullWidth>Full Width Button</Button>

// Different sizes
<Button size="sm">Small</Button>
<Button size="md">Medium</Button>
<Button size="lg">Large</Button>
```

### Card Component
```tsx
import { Card, CardHeader, CardBody, CardFooter } from '@/components';

<Card variant="outlined">
  <CardHeader>
    <h2>Card Title</h2>
  </CardHeader>
  <CardBody>
    <p>Card content goes here</p>
  </CardBody>
  <CardFooter>
    <button>Action</button>
  </CardFooter>
</Card>
```

### Alert Component
```tsx
import { Alert } from '@/components';

<Alert variant="success" title="Success">
  Operation completed successfully!
</Alert>

<Alert variant="error" title="Error">
  An error occurred. Please try again.
</Alert>
```

### Using Custom Hooks
```tsx
import { useFetch } from '@/lib/hooks/useFetch';

export function MyComponent() {
  const { data, loading, error } = useFetch('/api/users');

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return <div>{JSON.stringify(data)}</div>;
}
```

## 🔗 API Integration

### API Client Configuration

The API client is configured in `lib/api/api-client.ts` with:
- Base URL from `NEXT_PUBLIC_API_URL` environment variable
- Automatic token injection in Authorization header
- Error interceptors with custom error classes
- Response error handling with specific status codes

### Setting API Base URL

Create a `.env.local` file:
```env
NEXT_PUBLIC_API_URL=http://localhost:3001/api
```

### Using the API Client

```tsx
import { apiClient } from '@/lib/api/api-client';

// GET request
const response = await apiClient.get('/users');

// POST request
const newUser = await apiClient.post('/users', { name: 'John' });

// PUT request
await apiClient.put('/users/1', { name: 'John Updated' });

// DELETE request
await apiClient.delete('/users/1');
```

## 🎨 Styling

The project uses Tailwind CSS v4 with a custom theme. Key styling utilities:

- **Color Palette:**
  - Primary: Blue (#3b82f6)
  - Secondary: Gray (#6b7280)
  - Success: Green
  - Danger: Red
  - Warning: Yellow

- **Responsive Breakpoints:**
  - sm: 640px
  - md: 768px
  - lg: 1024px
  - xl: 1280px

## 🔐 Authentication (Ready for Backend Integration)

The `useAuth` hook is prepared for authentication:

```tsx
import { useAuth } from '@/lib/hooks/useAuth';

export function LoginComponent() {
  const { login, logout, user, isAuthenticated } = useAuth();

  const handleLogin = async () => {
    try {
      await login('user@example.com', 'password');
      // Redirected automatically on successful login
    } catch (error) {
      console.error('Login failed:', error);
    }
  };

  return (
    <>
      {isAuthenticated ? (
        <>
          <p>Welcome, {user?.name}</p>
          <button onClick={logout}>Logout</button>
        </>
      ) : (
        <button onClick={handleLogin}>Login</button>
      )}
    </>
  );
}
```

## 📊 Page Routes

| Route | Description |
|-------|-------------|
| `/` | Redirects to `/dashboard` |
| `/dashboard` | Main dashboard overview with statistics |
| `/dashboard/user-management` | User management hub with navigation |
| `/dashboard/user-management/users` | List and manage users |
| `/dashboard/user-management/roles` | Create and manage roles |
| `/dashboard/tasks` | Task list with filters and status |

## 🛡️ Error Handling

### Global Error Boundary
Wraps the entire dashboard to catch and display errors gracefully:

```tsx
<ErrorBoundary fallback={(error, reset) => (
  <div>
    <p>Error: {error.message}</p>
    <button onClick={reset}>Try again</button>
  </div>
)}>
  <YourComponent />
</ErrorBoundary>
```

### API Error Handling
- Network errors are caught and wrapped as `NetworkError`
- HTTP status errors are wrapped as `ApiError` with status code
- Validation errors are wrapped as `ValidationError` with field details
- Automatic token refresh and logout on 401 Unauthorized

## 📱 Responsive Design

The layout is fully responsive:
- **Mobile:** Sidebar is collapsible with overlay
- **Tablet:** Sidebar visible but optimized for touch
- **Desktop:** Full sidebar and expanded layout

## 🚦 Performance Optimizations

- Code splitting with lazy loading on routes
- Images optimized with Next.js Image component
- Component memoization where necessary
- Efficient re-render prevention
- Tree-shaking of unused components

## 🔧 Development

### Available Scripts

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run linting
npm run lint
```

### Adding New Pages

1. Create a new file in `app/dashboard/[section]/page.tsx`
2. Wrap content with `<DashboardLayout>`
3. Add route to `SIDEBAR_MENU` in `lib/constants.ts` (optional)

### Adding New Components

1. Create component in `components/YourComponent.tsx`
2. Export from `components/index.ts`
3. Use with: `import { YourComponent } from '@/components'`

## 📦 Dependencies

- **next** ^16.2.6 - React framework
- **react** 19.2.4 - UI library
- **react-dom** 19.2.4 - React DOM
- **axios** ^1.6.0 - HTTP client
- **lucide-react** ^0.344.0 - Icon library
- **tailwindcss** ^4 - Utility CSS
- **typescript** ^5 - Type safety

## 🌍 SEO Optimization

- Semantic HTML structure
- Dynamic page titles and descriptions via Metadata API
- Clean URL structure
- Proper heading hierarchy
- ARIA labels for accessibility
- Meta tags for social sharing

## 🔄 Backend Integration Checklist

- [ ] Replace mock data with API calls using `apiClient`
- [ ] Implement authentication endpoint
- [ ] Set up User API endpoints (`/api/users`)
- [ ] Set up Role API endpoints (`/api/roles`)
- [ ] Set up Task API endpoints (`/api/tasks`)
- [ ] Configure `NEXT_PUBLIC_API_URL` environment variable
- [ ] Implement token refresh logic in API interceptors
- [ ] Add form validation and submission handlers
- [ ] Implement pagination and filtering
- [ ] Add real-time updates (WebSocket/Polling)

## 📝 Code Standards

- Use TypeScript for type safety
- Follow React hooks best practices
- Use semantic HTML elements
- Implement proper error handling
- Add comments for complex logic
- Keep components focused and reusable
- Use meaningful variable and function names

## 🤝 Contributing

When adding new features:
1. Follow the existing folder structure
2. Create reusable components
3. Add proper TypeScript types
4. Include error handling
5. Test on different screen sizes
6. Update this README with new routes/features

## 📞 Support

For issues or questions about the codebase:
1. Check the component documentation above
2. Review the example implementations in pages
3. Check API error handling in `lib/api/api-client.ts`

## 📄 License

This project is private and for internal use only.

---

**Last Updated:** May 2026
**Next.js Version:** 16.2.6
**React Version:** 19.2.4
**Tailwind CSS Version:** 4
