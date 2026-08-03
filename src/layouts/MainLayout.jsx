import React, { useState, useEffect } from 'react';
import { Outlet, Link } from 'react-router-dom';
import logo from '../assets/logo_bioquest.svg';

const MainLayout = () => {
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    // Start progress bar animation after component mounts
    const timer1 = setTimeout(() => {
      const bar = document.getElementById('progress-bar');
      if (bar) {
        bar.style.width = '100%';
      }
    }, 100);

    // Hide splash screen after 3 seconds
    const timer2 = setTimeout(() => {
      setShowSplash(false);
    }, 3000);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, []);

  const handleLogoClick = (e) => {
    const logo = e.currentTarget;
    logo.style.transform = 'scale(0.95)';
    setTimeout(() => {
      logo.style.transform = 'scale(1)';
    }, 100);
  };

  if (showSplash) {
    return (
      <div className="bg-primary-container">
        <div className="splash-container">
          {/* Subtle background texture */}
          <div className="micro-pattern"></div>
          
          {/* Logo Placeholder */}
          <div className="logo-box" onClick={handleLogoClick}>
            <img src={logo} alt="BioQuest Logo" className="w-24 h-24 object-contain" />
          </div>
          
          {/* Brand Name */}
          <div className="mt-stack-md text-center fade-in-text">
            <h1 className="font-display-lg text-display-lg text-on-primary">BioQuest</h1>
            <p className="font-label-md text-label-md text-white/80 mt-2 tracking-wide uppercase">Jelajahi Dunia Biologi</p>
          </div>
          
          {/* Loading Indicator */}
          <div className="absolute bottom-16 w-full flex flex-col items-center fade-in-text" style={{ animationDelay: '1s' }}>
            <div className="w-12 h-1 bg-white/20 rounded-full overflow-hidden">
              <div className="h-full bg-secondary-container w-0 transition-all duration-[2500ms] ease-out" id="progress-bar"></div>
            </div>
            <p className="mt-4 font-label-md text-label-md text-white/60">Menyiapkan petualangan...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen bg-surface">
      <Outlet />
    </div>
  );
};

export default MainLayout;
