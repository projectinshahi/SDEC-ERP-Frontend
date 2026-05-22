import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Users | ERP System',
  description: 'Manage system users',
};

interface UsersLayoutProps {
  children: React.ReactNode;
}

export default function UsersLayout({ children }: UsersLayoutProps) {
  return <>{children}</>;
}
