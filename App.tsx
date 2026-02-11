import React, { useState } from 'react';
import { Layout } from './components/ui/Layout';
import { LiveScoreboard } from './components/LiveScoreboard';
import { RegistrationForm } from './components/RegistrationForm';
import { AdminDashboard } from './components/AdminDashboard';
import { RefereeInterface } from './components/RefereeInterface';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState('live');

  return (
    <Layout activeTab={activeTab} onTabChange={setActiveTab}>
      {activeTab === 'live' && <LiveScoreboard />}
      {activeTab === 'register' && <RegistrationForm />}
      {activeTab === 'admin' && <AdminDashboard />}
      {activeTab === 'referee' && <RefereeInterface />}
    </Layout>
  );
};

export default App;
