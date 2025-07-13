import { useAuth } from '../hooks/useAuth';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function ProtectedRoute({ children, allowedRoles = [] }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [isRedirecting, setIsRedirecting] = useState(false);

  useEffect(() => {
    console.log('ProtectedRoute - user:', user, 'loading:', loading, 'isRedirecting:', isRedirecting);
    if (!loading && !isRedirecting) {
      if (!user) {
        console.log('No user, redirecting to login');
        setIsRedirecting(true);
        router.push('/login');
        return;
      }

      if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
        console.log('User role not allowed, redirecting based on role:', user.role);
        setIsRedirecting(true);
        // Redirect to appropriate dashboard based on role
        switch (user.role) {
          case 'patient':
            router.push('/patient');
            break;
          case 'nurse':
            router.push('/nurse');
            break;
          case 'admin':
            router.push('/admin');
            break;
          default:
            router.push('/login');
        }
        return;
      }
    }
  }, [user, loading, router, allowedRoles, isRedirecting]);

  if (loading || isRedirecting) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user || (allowedRoles.length > 0 && !allowedRoles.includes(user.role))) {
    return null;
  }

  return children;
}