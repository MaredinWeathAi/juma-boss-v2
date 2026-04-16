import React, { useState, useEffect } from 'react';
import { Save, AlertTriangle, CheckCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../lib/api';

interface ProfileData {
  user: {
    id: string;
    name: string;
    email: string;
    phone?: string;
  };
  bakery: {
    id: string;
    name: string;
    description?: string;
    address?: string;
    city?: string;
    phone?: string;
    email?: string;
    tier: string;
  };
  subscription: {
    tier: string;
    status: string;
    currentPeriodEnd: string;
  };
}

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  completed: boolean;
}

const Settings = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [onboardingSteps, setOnboardingSteps] = useState<OnboardingStep[]>([]);

  const [formData, setFormData] = useState({
    userName: '',
    userPhone: '',
    bakeryName: '',
    bakeryDescription: '',
    bakeryAddress: '',
    bakeryCity: '',
    bakeryPhone: '',
    bakeryEmail: '',
  });

  useEffect(() => {
    fetchProfileData();
  }, []);

  const fetchProfileData = async () => {
    try {
      setLoading(true);
      setError(null);
      const profileResponse = await api.get('/baker/profile');
      setProfileData(profileResponse.data || profileResponse);

      const profile = profileResponse.data || profileResponse;
      if (profile) {
        setFormData({
          userName: profile.user?.name || '',
          userPhone: profile.user?.phone || '',
          bakeryName: profile.bakery?.name || '',
          bakeryDescription: profile.bakery?.description || '',
          bakeryAddress: profile.bakery?.address || '',
          bakeryCity: profile.bakery?.city || '',
          bakeryPhone: profile.bakery?.phone || '',
          bakeryEmail: profile.bakery?.email || '',
        });
      }

      try {
        const onboardingResponse = await api.get('/baker/onboarding');
        const onboarding = onboardingResponse.data || onboardingResponse;
        if (onboarding && onboarding.steps) {
          setOnboardingSteps(onboarding.steps);
        }
      } catch {
        // Onboarding endpoint may not be available
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      await api.put('/baker/profile', {
        name: formData.userName,
        phone: formData.userPhone,
        bakeryName: formData.bakeryName,
        description: formData.bakeryDescription,
        address: formData.bakeryAddress,
        city: formData.bakeryCity,
      });

      setSuccess('Alterações salvas com sucesso!');
      await fetchProfileData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-surface-800 rounded w-1/4 animate-pulse"></div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="card animate-pulse h-64"></div>
          ))}
        </div>
      </div>
    );
  }

  const onboardingProgress = onboardingSteps.length > 0
    ? (onboardingSteps.filter((s) => s.completed).length / onboardingSteps.length * 100).toFixed(0)
    : 0;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="page-title mb-2">Configurações</h1>
        <p className="page-subtitle">Gerenciar perfil e informações da padaria</p>
      </div>

      {error && (
        <div className="card bg-red-500/10 border-red-500/50 flex items-start gap-3">
          <AlertTriangle className="text-red-400 flex-shrink-0 mt-1" size={18} />
          <p className="text-sm text-red-300">{error}</p>
        </div>
      )}

      {success && (
        <div className="card bg-emerald-500/10 border-emerald-500/30 flex items-start gap-3">
          <CheckCircle className="text-emerald-400 flex-shrink-0 mt-1" size={18} />
          <p className="text-sm text-emerald-300">{success}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Profile Section */}
        <div className="card">
          <h2 className="text-lg font-semibold text-white mb-6">Perfil Pessoal</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-white mb-2">
                Nome Completo
              </label>
              <input
                type="text"
                value={formData.userName}
                onChange={(e) => setFormData({ ...formData, userName: e.target.value })}
                className="input w-full"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-white mb-2">
                Telefone
              </label>
              <input
                type="tel"
                value={formData.userPhone}
                onChange={(e) => setFormData({ ...formData, userPhone: e.target.value })}
                className="input w-full"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-white mb-2">
                Email
              </label>
              <input
                type="email"
                value={user?.email || ''}
                disabled
                className="input w-full bg-surface-800 cursor-not-allowed"
              />
              <p className="text-xs text-surface-500 mt-1">
                Para alterar o email, entre em contato com o suporte
              </p>
            </div>
          </div>
        </div>

        {/* Bakery Section */}
        <div className="card">
          <h2 className="text-lg font-semibold text-white mb-6">Informações da Padaria</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-white mb-2">
                Nome da Padaria
              </label>
              <input
                type="text"
                value={formData.bakeryName}
                onChange={(e) => setFormData({ ...formData, bakeryName: e.target.value })}
                className="input w-full"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-white mb-2">
                Descrição
              </label>
              <textarea
                value={formData.bakeryDescription}
                onChange={(e) =>
                  setFormData({ ...formData, bakeryDescription: e.target.value })
                }
                className="input w-full"
                rows={3}
                placeholder="Descreva sua padaria..."
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Endereço
                </label>
                <input
                  type="text"
                  value={formData.bakeryAddress}
                  onChange={(e) => setFormData({ ...formData, bakeryAddress: e.target.value })}
                  className="input w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Cidade
                </label>
                <input
                  type="text"
                  value={formData.bakeryCity}
                  onChange={(e) => setFormData({ ...formData, bakeryCity: e.target.value })}
                  className="input w-full"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Telefone
                </label>
                <input
                  type="tel"
                  value={formData.bakeryPhone}
                  onChange={(e) => setFormData({ ...formData, bakeryPhone: e.target.value })}
                  className="input w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Email da Padaria
                </label>
                <input
                  type="email"
                  value={formData.bakeryEmail}
                  onChange={(e) => setFormData({ ...formData, bakeryEmail: e.target.value })}
                  className="input w-full"
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="btn-primary mt-6 flex items-center gap-2 w-full justify-center"
          >
            <Save size={18} />
            {saving ? 'Salvando...' : 'Salvar Alterações'}
          </button>
        </div>

        {/* Subscription Section */}
        {profileData?.subscription && (
          <div className="card">
            <h2 className="text-lg font-semibold text-white mb-6">Plano Atual</h2>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-surface-400 text-sm">Plano</p>
                  <p className="text-white font-semibold mt-1">
                    {profileData.subscription.tier === 'pro'
                      ? 'Padeiro Profissional'
                      : profileData.subscription.tier === 'starter'
                      ? 'Iniciante'
                      : 'Gratuito'}
                  </p>
                </div>
                <span className={`badge font-semibold ${
                  profileData.subscription.tier === 'pro'
                    ? 'bg-brand-500/20 text-brand-400'
                    : profileData.subscription.tier === 'starter'
                    ? 'bg-blue-500/20 text-blue-400'
                    : 'bg-surface-700 text-surface-300'
                }`}>
                  {profileData.subscription.tier.charAt(0).toUpperCase() +
                    profileData.subscription.tier.slice(1)}
                </span>
              </div>

              <div className="border-t border-surface-700 pt-4">
                <p className="text-surface-400 text-sm">Status</p>
                <p className="text-white font-semibold mt-1 capitalize">
                  {profileData.subscription.status === 'active' ? 'Ativo' : profileData.subscription.status}
                </p>
              </div>

              {profileData.subscription.currentPeriodEnd && (
                <div className="border-t border-surface-700 pt-4">
                  <p className="text-surface-400 text-sm">Próxima renovação</p>
                  <p className="text-white font-semibold mt-1">
                    {new Date(profileData.subscription.currentPeriodEnd).toLocaleDateString(
                      'pt-BR'
                    )}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Onboarding Progress */}
        {onboardingSteps.length > 0 && (
          <div className="card">
            <h2 className="text-lg font-semibold text-white mb-6">Progresso de Integração</h2>

            <div className="mb-6">
              <div className="flex justify-between items-center mb-2">
                <p className="text-sm text-surface-400">Completude</p>
                <p className="text-sm font-semibold text-brand-400">{onboardingProgress}%</p>
              </div>
              <div className="w-full h-2 bg-surface-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-brand-500 transition-all"
                  style={{ width: `${onboardingProgress}%` }}
                />
              </div>
            </div>

            <div className="space-y-3">
              {onboardingSteps.map((step) => (
                <div key={step.id} className="flex items-start gap-3">
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                      step.completed
                        ? 'bg-emerald-500 text-white'
                        : 'bg-surface-800 text-surface-500'
                    }`}
                  >
                    {step.completed ? (
                      <CheckCircle size={16} />
                    ) : (
                      <span className="text-xs">•</span>
                    )}
                  </div>

                  <div>
                    <p className={`font-medium ${step.completed ? 'text-emerald-400' : 'text-white'}`}>
                      {step.title}
                    </p>
                    <p className="text-xs text-surface-500 mt-0.5">{step.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </form>

      {/* Danger Zone */}
      <div className="card border-red-500/30">
        <h2 className="text-lg font-semibold text-red-400 mb-4">Zona de Perigo</h2>
        <p className="text-sm text-surface-400 mb-6">
          Essas ações são irreversíveis. Tenha cuidado.
        </p>

        <button
          className="btn-danger w-full"
          disabled
        >
          Excluir Conta (Desabilitado)
        </button>
        <p className="text-xs text-surface-500 mt-2">
          Para excluir sua conta, entre em contato com o suporte
        </p>
      </div>
    </div>
  );
};

export default Settings;
