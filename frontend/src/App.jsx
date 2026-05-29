import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Toaster } from 'sonner';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import RoleGuard from './components/RoleGuard.jsx';
import { IqacFilterProvider } from './context/IqacFilterContext.jsx';

function App() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <>
      <RoleGuard />
      <Toaster richColors position="top-center" />
      <IqacFilterProvider>
        <div className="iqac-shell flex min-h-screen text-gray-800">
          <Sidebar mobileMenuOpen={mobileMenuOpen} setMobileMenuOpen={setMobileMenuOpen} />
          <div className="flex min-w-0 flex-1 flex-col">
            <Header setMobileMenuOpen={setMobileMenuOpen} />
            <main className="flex-1 p-4 sm:p-6 lg:p-8">
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