# ERP Dashboard System

A modern, scalable, and SEO-friendly ERP dashboard built with Next.js 16, React 19, TypeScript, and Tailwind CSS.

![ERP Dashboard](https://img.shields.io/badge/Next.js-16.2.6-black?style=flat-square&logo=next.js)
![React](https://img.shields.io/badge/React-19.2.4-blue?style=flat-square&logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue?style=flat-square&logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-4.x-38bdf8?style=flat-square&logo=tailwind-css)

## ✨ Features

### Core Features
- 📊 **Dashboard Overview** - Real-time statistics and activity monitoring
- 👥 **User Management** - Complete user and role management system
- ✅ **Task Management** - Track and manage project tasks with progress indicators
- 🎨 **Modern UI/UX** - Clean, professional admin dashboard design
- 📱 **Fully Responsive** - Optimized for mobile, tablet, and desktop
- 🌓 **Dark/Light Mode** - Toggle between themes with persistent preference
- 🔍 **SEO Optimized** - Semantic HTML, meta tags, and accessibility features

### Technical Features
- ⚡ **Next.js App Router** - Latest Next.js 16 with App Router
- 🎯 **TypeScript** - Full type safety throughout the application
- 🎨 **Tailwind CSS 4** - Modern utility-first CSS framework
- 🧩 **Reusable Components** - Modular component architecture
- 🛡️ **Error Boundaries** - Graceful error handling
- 🔄 **Loading States** - Skeleton loaders for better UX
- 🎭 **Icons** - Lucide React icons library
- 📦 **Clean Architecture** - Well-organized folder structure

## 🚀 Getting Started

### Prerequisites
- Node.js 18.x or higher
- npm, yarn, or pnpm

### Installation

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd my-app
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   yarn install
   # or
   pnpm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   ```
   
   Edit `.env.local` and configure your environment variables:
   ```env
   NEXT_PUBLIC_API_URL=http://localhost:3001/api
   ```

4. **Run the development server**
   ```bash
   npm run dev
   # or
   yarn dev
   # or
   pnpm dev
   ```

5. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

### Build for Production

```bash
npm run build
npm start
```

## 📁 Project Structure

```
my-app/
├── app/                          # Next.js App Router pages
│   ├── dashboard/               # Dashboard pages
│   │   ├── tasks/              # Task management
│   │   └── user-management/    # User & role management
│   ├── layout.tsx              # Root layout with metadata
│   ├── page.tsx                # Home page (redirects to dashboard)
│   └── globals.css             # Global styles
├── components/                  # Reusable UI components
│   ├── Alert.tsx
│   ├── Badge.tsx
│   ├── Breadcrumb.tsx
│   ├── Button.tsx
│   ├── Card.tsx
│   ├── ErrorBoundary.tsx
│   ├── Layout.tsx              # Main dashboard layout
│   ├── Navbar.tsx              # Top navigation bar
│   ├── Sidebar.tsx             # Collapsible sidebar
│   ├── Skeleton.tsx            # Loading skeletons
│   └── index.ts                # Component exports
├── lib/                         # Utilities and hooks
│   ├── api/                    # API client
│   ├── hooks/                  # Custom React hooks
│   │   ├── useAuth.ts         # Authentication hook
│   │   ├── useFetch.ts        # Data fetching hook
│   │   └── useTheme.ts        # Theme management hook
│   ├── api-errors.ts          # Error handling
│   ├── constants.ts           # App constants
│   └── utils.ts               # Utility functions
├── public/                      # Static assets
└── package.json                # Dependencies
```

## 🎨 UI Components

### Available Components
- **Button** - Multiple variants (primary, secondary, danger, success) and sizes
- **Card** - Container component with header, body, and footer sections
- **Badge** - Status indicators with color variants
- **Alert** - Notification messages
- **Breadcrumb** - Navigation hierarchy
- **Skeleton** - Loading placeholders
- **ErrorBoundary** - Error handling wrapper

### Component Usage Example

```tsx
import { Button, Card, CardBody, Badge } from '@/components';

export default function Example() {
  return (
    <Card>
      <CardBody>
        <h2>Example Card</h2>
        <Badge variant="success">Active</Badge>
        <Button variant="primary" size="lg">
          Click Me
        </Button>
      </CardBody>
    </Card>
  );
}
```

## 🔐 Authentication

The app includes a mock authentication system ready for backend integration:

```typescript
import { useAuth } from '@/lib/hooks/useAuth';

function MyComponent() {
  const { user, isAuthenticated, login, logout } = useAuth();
  
  // Use authentication state and methods
}
```

**Note:** Replace the mock implementation in `lib/hooks/useAuth.ts` with your actual backend API calls.

## 🌐 Pages

### Dashboard (`/dashboard`)
- Overview statistics
- Recent activity feed
- Quick access links

### Tasks (`/dashboard/tasks`)
- Task list with status indicators
- Progress tracking
- Priority badges
- Assignee information

### User Management (`/dashboard/user-management`)
- Entry point for user and role management
- Two main sections: Users and Roles

### Users (`/dashboard/user-management/users`)
- User list table
- Add/Edit/Delete users
- Status management

### Roles (`/dashboard/user-management/roles`)
- Role cards with permissions
- Create and manage roles
- Permission guide

## 🎯 SEO Features

- ✅ Semantic HTML structure
- ✅ Meta tags for each page
- ✅ Open Graph tags
- ✅ Accessible ARIA labels
- ✅ Proper heading hierarchy
- ✅ Alt text for images
- ✅ Descriptive link text

## 🌓 Dark Mode

The application includes a fully functional dark mode toggle:

- Persistent theme preference (localStorage)
- System preference detection
- Smooth transitions
- All components support dark mode

## 📱 Responsive Design

Breakpoints:
- **Mobile**: < 768px
- **Tablet**: 768px - 1024px
- **Desktop**: > 1024px

Features:
- Collapsible sidebar on mobile
- Responsive tables
- Adaptive grid layouts
- Touch-friendly buttons

## 🛠️ Customization

### Colors
Edit `tailwind.config.ts` to customize the color palette.

### Routes
Update `lib/constants.ts` to modify navigation routes.

### Menu Items
Edit `SIDEBAR_MENU` in `lib/constants.ts` to add/remove menu items.

## 🔧 Available Scripts

```bash
npm run dev      # Start development server
npm run build    # Build for production
npm run start    # Start production server
npm run lint     # Run ESLint
```

## 📦 Dependencies

### Core
- **next**: 16.2.6
- **react**: 19.2.4
- **react-dom**: 19.2.4

### UI & Styling
- **tailwindcss**: ^4
- **lucide-react**: ^0.344.0 (Icons)

### Utilities
- **axios**: ^1.6.0 (HTTP client)

### Dev Dependencies
- **typescript**: ^5
- **eslint**: ^9
- **@types/react**: ^19
- **@types/node**: ^20

## 🚧 Future Enhancements

- [ ] Backend API integration
- [ ] Real authentication system
- [ ] Data persistence
- [ ] Advanced filtering and search
- [ ] Export functionality
- [ ] Notifications system
- [ ] User profile pages
- [ ] Settings page
- [ ] Analytics dashboard
- [ ] Multi-language support

## 📝 Notes

- This is a **frontend-only** implementation with dummy data
- No backend integration is included
- Authentication is mocked for demonstration
- Ready for backend API integration

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the ISC License.

## 👨‍💻 Author

Your Name - Your Organization

## 🙏 Acknowledgments

- Next.js team for the amazing framework
- Tailwind CSS for the utility-first CSS framework
- Lucide for the beautiful icon set
- Vercel for hosting and deployment platform

---

**Built with ❤️ using Next.js, React, TypeScript, and Tailwind CSS**
