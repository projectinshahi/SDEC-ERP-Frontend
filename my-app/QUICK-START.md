# Quick Start Guide - ERP Dashboard

Get up and running with the ERP Dashboard in 5 minutes!

## 📋 Prerequisites

- **Node.js** 18 or higher ([Download](https://nodejs.org))
- **npm** (comes with Node.js)
- **Git** (for version control)

## ⚡ Quick Setup

### Step 1: Install Dependencies (1 minute)
```bash
npm install
```

### Step 2: Configure Environment (30 seconds)
Create a `.env.local` file in the root directory:

```bash
# Copy from template
cp .env.example .env.local

# Edit to add your backend API URL
# NEXT_PUBLIC_API_URL=http://localhost:3001/api
```

Or manually create `.env.local`:
```env
NEXT_PUBLIC_API_URL=http://localhost:3001/api
```

### Step 3: Start Development Server (30 seconds)
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## 🎯 First Time Using the Dashboard

### Explore the Navigation
1. **Dashboard** - Overview with statistics
2. **User Management** - Manage users and roles
3. **Tasks** - Track and manage tasks

### Try It Out
- Click on menu items to navigate
- Use the sidebar menu (collapsible on mobile)
- Try clicking "Roles" and "Users" buttons on User Management page

## 🔧 Development Commands

```bash
# Start dev server (hot reload)
npm run dev

# Build for production
npm run build

# Run production server
npm start

# Run linting
npm run lint
```

## 📁 Key Files to Know

| File | Purpose |
|------|---------|
| `app/` | Next.js pages and routing |
| `components/` | Reusable UI components |
| `lib/constants.ts` | App configuration |
| `lib/hooks/` | Custom React hooks |
| `.env.local` | Environment variables |

## 🔌 API Integration

### Current Setup
The dashboard uses **mock data** for demonstration. To connect to a backend:

1. Update `NEXT_PUBLIC_API_URL` in `.env.local`
2. Replace mock data with actual API calls
3. Use the `useFetch` hook for data fetching:

```tsx
import { useFetch } from '@/lib/hooks/useFetch';

export function MyPage() {
  const { data: users, loading, error } = useFetch('/api/users');

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return <div>{users?.map(user => <div key={user.id}>{user.name}</div>)}</div>;
}
```

## 🎨 Customizing the UI

### Change Colors
Edit `tailwind.config.ts`:
```ts
theme: {
  extend: {
    colors: {
      primary: '#your-color-here',
    },
  },
}
```

### Add New Pages
1. Create file: `app/dashboard/your-page/page.tsx`
2. Wrap with: `<DashboardLayout>`
3. Add to menu in: `lib/constants.ts`

### Customize Sidebar Menu
Edit `lib/constants.ts` - `SIDEBAR_MENU` array

## 🐛 Troubleshooting

### "npm install" fails
```bash
# Try clearing npm cache
npm cache clean --force
npm install
```

### Port 3000 already in use
```bash
# Use different port
npm run dev -- -p 3001
```

### Components not rendering
1. Check browser console for errors
2. Verify all imports are correct
3. Check that dependencies are installed

### API errors
1. Verify `NEXT_PUBLIC_API_URL` is correct
2. Check backend is running
3. Check CORS headers in backend
4. Test endpoint with Postman/Insomnia

## 📚 Learning the Codebase

### Day 1: Explore Structure
- Read [README-ERP.md](./README-ERP.md) - Features & Usage
- Explore folder structure
- Visit each page in the dashboard

### Day 2: Understand Components
- Review components in `/components` folder
- Check how components are used in pages
- Try modifying a component

### Day 3: API Integration
- Read API client in `lib/api/api-client.ts`
- Review hooks in `lib/hooks/`
- Create a simple API call

### Day 4: Advanced Topics
- Read [ARCHITECTURE.md](./ARCHITECTURE.md) - Design patterns
- Review error handling
- Check TypeScript types

## 🚀 Making Your First Change

### Change Sidebar Color
```tsx
// In components/Sidebar.tsx
<aside
  className="
    fixed md:relative top-0 left-0 h-screen w-64
    bg-indigo-900 text-white  // ← Change color here
    ...
  "
>
```

### Add a New Menu Item
```ts
// In lib/constants.ts
export const SIDEBAR_MENU = [
  // ... existing items
  {
    label: 'Reports',
    href: '/dashboard/reports',
    icon: 'BarChart3',
  },
];
```

### Create a New Page
```tsx
// In app/dashboard/reports/page.tsx
import { DashboardLayout } from '@/components';

export default function ReportsPage() {
  return (
    <DashboardLayout>
      <h1>Reports Page</h1>
      <p>Your reports go here</p>
    </DashboardLayout>
  );
}
```

## 📖 Documentation

- **[README-ERP.md](./README-ERP.md)** - Complete feature & usage guide
- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - Technical architecture & patterns
- **This file** - Quick start guide

## 🆘 Need Help?

1. Check the documentation files above
2. Review example code in page files
3. Check component source code with comments
4. Look at TypeScript error messages

## ✅ Development Checklist

- [ ] Dependencies installed (`npm install`)
- [ ] `.env.local` created with API URL
- [ ] Dev server running (`npm run dev`)
- [ ] Can access [http://localhost:3000](http://localhost:3000)
- [ ] Can navigate all menu items
- [ ] Console has no errors
- [ ] Responsive design works (try mobile view)

## 🎉 You're Ready!

You now have a fully functional ERP dashboard ready for development. Start by:

1. Exploring the existing pages
2. Connecting to your backend API
3. Adding your business logic
4. Customizing the UI for your needs

Happy coding! 🚀

---

**Last Updated:** May 2026
**Next.js Version:** 16.2.6
