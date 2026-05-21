import React from 'react';
import { Outlet } from 'react-router-dom';
import { Toaster } from 'sonner';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import RoleGuard from './components/RoleGuard.jsx';
import { IqacFilterProvider } from './context/IqacFilterContext.jsx';

function App() {
  return (
    <>
      <RoleGuard />
      <Toaster richColors position="top-center" />
      <IqacFilterProvider>
        <div className="flex min-h-screen bg-gray-50 text-gray-800">
          <Sidebar />
          <div className="flex-1 flex flex-col min-w-0">
            <Header />
            <main className="p-6 sm:p-8 flex-1">
              <Outlet />
            </main>
          </div>
        </div>
      </IqacFilterProvider>
    </>
  );
}

export default App;