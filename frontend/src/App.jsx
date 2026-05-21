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
        <div className="iqac-shell flex min-h-screen text-gray-800">
          <Sidebar />
          <div className="flex min-w-0 flex-1 flex-col">
            <Header />
            <main className="flex-1 p-6 sm:p-8">
              <div className="mx-auto max-w-[1600px]">
                <Outlet />
              </div>
            </main>
          </div>
        </div>
      </IqacFilterProvider>
    </>
  );
}

export default App;