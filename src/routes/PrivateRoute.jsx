import React, { useState, useEffect } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { supabase } from '../services/supabase';

const PrivateRoute = ({ allowedRoles }) => {
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState(null);

  useEffect(() => {
    let isMounted = true;

    const checkAuth = async () => {
      try {
        // Cek sesi aktif
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          if (isMounted) {
            setIsAuthenticated(false);
            setLoading(false);
          }
          return;
        }

        if (isMounted) {
          setIsAuthenticated(true);
        }

        // Ambil role secara instan dari metadata atau cache sessionStorage terlebih dahulu
        let role = session.user.user_metadata?.role;
        if (!role) {
          try {
            role = sessionStorage.getItem(`bioquest_role_${session.user.id}`);
          } catch (e) {
            console.warn(e);
          }
        }

        // Hanya jika role belum ada, query ke tabel users
        if (!role) {
          try {
            const { data: userRows } = await supabase
              .from('users')
              .select('role')
              .eq('id', session.user.id)
              .limit(1);
              
            if (userRows?.[0]?.role) {
              role = userRows[0].role;
            }
          } catch (fetchErr) {
            console.warn('Gagal membaca role dari tabel users:', fetchErr);
          }
        }

        // Fallback cerdas jika role masih null (misal dari email atau default student)
        if (!role) {
          const email = session.user.email?.toLowerCase() || '';
          role = (email.includes('teacher') || email.includes('guru')) ? 'teacher' : 'student';
        }

        try {
          if (role) sessionStorage.setItem(`bioquest_role_${session.user.id}`, role);
        } catch (e) {
          console.warn(e);
        }

        if (isMounted) {
          setUserRole(role);
          setLoading(false);
        }
      } catch (err) {
        console.error('Error saat verifikasi sesi:', err);
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    checkAuth();

    return () => {
      isMounted = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-[#479F88] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Jika allowedRoles didefinisikan dan role user tidak ada di dalamnya, arahkan ke home/login
  if (allowedRoles && !allowedRoles.includes(userRole)) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
};

export default PrivateRoute;
