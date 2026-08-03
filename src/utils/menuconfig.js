// src/utils/menuConfig.js

export const roleMenus = {
  student: [
    { title: 'Dashboard', path: '/student' },
    { title: 'My Courses', path: '/student/courses' },
    { title: 'Assignments', path: '/student/assignments' },
    { title: 'Grades', path: '/student/grades' },
  ],
  teacher: [
    { title: 'Dashboard', path: '/teacher' },
    { title: 'My Classes', path: '/teacher/classes' },
    { title: 'Students', path: '/teacher/students' },
    { title: 'Grading', path: '/teacher/grading' },
  ]
};
