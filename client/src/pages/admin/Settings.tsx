import React from 'react';
import { Save } from 'lucide-react';

export default function Settings() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">Settings</h1>
        <p className="page-subtitle">Platform configuration and preferences</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="card">
            <h2 className="font-bold text-lg mb-6">General Settings</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-surface-300 mb-2">
                  Platform Name
                </label>
                <input type="text" defaultValue="Juma Boss" className="input w-full" />
              </div>
              <div>
                <label className="block text-sm font-medium text-surface-300 mb-2">
                  Default Timezone
                </label>
                <input type="text" defaultValue="UTC" className="input w-full" />
              </div>
              <button className="btn-primary flex items-center gap-2 mt-6">
                <Save size={18} />
                Save Changes
              </button>
            </div>
          </div>

          <div className="card">
            <h2 className="font-bold text-lg mb-6">Email Configuration</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-surface-300 mb-2">
                  SMTP Host
                </label>
                <input type="text" placeholder="smtp.example.com" className="input w-full" />
              </div>
              <button className="btn-secondary">Test Connection</button>
            </div>
          </div>
        </div>

        <div className="card">
          <h3 className="font-bold text-lg mb-4">System Status</h3>
          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-surface-400">Database</span>
              <span className="text-green-400">Connected</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-surface-400">API</span>
              <span className="text-green-400">Healthy</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-surface-400">Cache</span>
              <span className="text-green-400">Active</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
