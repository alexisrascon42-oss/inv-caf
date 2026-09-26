import React from 'react';
import { Outlet } from 'react-router-dom';
import { BottomNav } from '../components/layout/BottomNav';

export default function OperadorLayout() {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Main content area, with bottom padding to account for the bottom nav */}
      <main className="flex-1 pb-16">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  );
}
