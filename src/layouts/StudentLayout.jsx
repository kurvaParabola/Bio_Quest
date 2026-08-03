import React from 'react';
import { Outlet, Link } from 'react-router-dom';

const StudentLayout = () => {
  return (
    <div className="student-layout" style={{ display: 'flex', minHeight: '100vh' }}>
      <aside style={{ width: '250px', background: '#2c3e50', color: 'white', padding: '1rem' }}>
        <h3>Student Portal</h3>
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '2rem' }}>
          <Link to="/student" style={{ color: 'white', textDecoration: 'none' }}>Dashboard</Link>
          {/* Menu lain akan ditambahkan dari menuConfig nanti */}
        </nav>
      </aside>
      <main style={{ flex: 1, padding: '2rem', background: '#f5f6fa' }}>
        <Outlet />
      </main>
    </div>
  );
};

export default StudentLayout;
