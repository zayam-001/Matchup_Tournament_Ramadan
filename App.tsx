import React, { useState, useEffect } from 'react';
import { Layout } from './components/ui/Layout';
import { LiveScoreboard } from './components/LiveScoreboard';
import { RegistrationForm } from './components/RegistrationForm';
import { AdminDashboard } from './components/AdminDashboard';
import { RefereeInterface } from './components/RefereeInterface';
import { PrivacyPolicy } from './components/PrivacyPolicy';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState('live');

  // Handle Hash Routing for "sub-urls"
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash;
      if (hash === '#privacy') {
        setActiveTab('privacy');
      } else if (!hash && activeTab === 'privacy') {
        // If navigating back
        setActiveTab('live');
      }
    };

    // Check initial hash
    handleHashChange();

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Update URL when tab changes
  useEffect(() => {
    if (activeTab === 'privacy') {
      window.location.hash = 'privacy';
    } else if (window.location.hash === '#privacy') {
      // If we move away from privacy via UI, clear hash
      history.pushState(null, '', ' ');
    }
  }, [activeTab]);

  return (
    <Layout activeTab={activeTab} onTabChange={setActiveTab}>
      {activeTab === 'live' && <LiveScoreboard />}
      {activeTab === 'register' && <RegistrationForm />}
      {activeTab === 'admin' && <AdminDashboard />}
      {activeTab === 'referee' && <RefereeInterface />}
      {activeTab === 'privacy' && <PrivacyPolicy onBack={() => setActiveTab('live')} />}
    </Layout>
  );
};

export default App;