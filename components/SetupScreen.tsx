import React from 'react';
import { CheckCircle } from 'lucide-react';

export const SetupScreen: React.FC = () => {
    return (
        <div className="min-h-screen bg-[#0A1628] flex items-center justify-center p-4">
            <div className="text-center">
                <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                <h1 className="text-2xl font-bold text-white">System Configured</h1>
                <p className="text-gray-400">Database connection established.</p>
            </div>
        </div>
    );
};
