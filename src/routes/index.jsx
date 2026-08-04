/* eslint-disable no-unused-vars */
import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

// Layouts
import MainLayout from '../layouts/MainLayout';
import StudentLayout from '../layouts/StudentLayout';
import TeacherLayout from '../layouts/TeacherLayout';

// Pages
import Login from '../pages/auth/Login';
import Register from '../pages/auth/Register';
import ForgotPassword from '../pages/auth/ForgotPassword';
import ResetPassword from '../pages/auth/ResetPassword';


import StudentDashboard from '../pages/students/StudentDashboard';
import ClassManagement from '../pages/teacher/ClassManagement';
import TeacherDashboard from '../pages/teacher/TeacherDashboard';
import QuizManagement from '../pages/teacher/QuizManagement';

// Rute Proteksi
import PrivateRoute from './PrivateRoute';

const AppRouter = () => {
  return (
    <BrowserRouter>
      <Routes>
        {/* Rute Publik */}
        <Route path="/" element={<MainLayout />}>
          <Route index element={<Login />} />
          <Route path="login" element={<Login />} />
          <Route path="register" element={<Register />} />
          <Route path="forgot-password" element={<ForgotPassword />} />
          <Route path="reset-password" element={<ResetPassword />} />
        </Route>

        {/* Rute Student */}
        <Route path="/student" element={<PrivateRoute allowedRoles={['student']} />}>
          <Route element={<StudentDashboard />}>
            <Route index element={<StudentDashboard />} />
            {/* Tambahkan rute student lainnya di sini */}
          </Route>
        </Route>

        {/* Rute Teacher */}
        <Route path="/teacher" element={<PrivateRoute allowedRoles={['teacher']} />}>
          <Route element={<TeacherLayout />}>
            <Route index element={<TeacherDashboard />} />
            <Route path="classes" element={<ClassManagement />} />
            <Route path="quizzes" element={<QuizManagement />} />
            <Route path="analytics" element={
              <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                  <i className="fa-solid fa-wrench text-[80px] text-[#479F88] opacity-50 mb-4"></i>
                  <h1 className="text-3xl font-bold text-[#479F88] font-display-lg">Detail Analitik</h1>
                  <p className="mt-2 text-gray-500 font-body-md">Halaman ini sedang dalam tahap pengembangan.</p>
                </div>
              </div>
            } />
          </Route>
        </Route>

        {/* Rute 404 Not Found */}
        <Route path="*" element={
          <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center' }}>
            <h1>404 - Page Not Found</h1>
          </div>
        } />
      </Routes>
    </BrowserRouter>
  );
};

export default AppRouter;
