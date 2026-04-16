import React, { useState, useEffect } from 'react';
import {
  Star,
  Check,
  AlertTriangle,
  ChevronUp,
  Download,
  Trash2,
  Plus,
  CreditCard,
  X,
  AlertCircle,
  Clock,
} from 'lucide-react';
import api from '../../lib/api';
import { formatBRL } from '../../lib/utils';
import { useAuth } from '../../contexts/AuthContext';

interface Plan {
  id: string;
  slug: string;
  name: string;
  description?: string;
  monthly_price: number;
  annual_price: number;
  features: string[];
  is_active: boolean;
}

interface Subscription {
  id: string;
  bakery_id: string;
  tier: string;
  status: string;
  monthly_price: number;
  billing_cycle: string;
  current_period_start: string;
  current_period_end: string;
  trial_ends_at?: string;
  next_billing_date: string;
  payment_method_id?: string;
  plan_name: string;
  payment_method_label?: string;
}

interface BillingHistoryItem {
  id: string;
  subscription_id: string;
  bakery_id: string;
  amount: number;
  currency: string;
  status: string;
  invoice_number: string;
  created_at: string;
  description?: string;
}

interface PaymentMethod {
  id: string;
  bakery_id: string;
  type: string;
  label: string;
  is_default: number;
  created_at: string;
}

const Subscription = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [plans, setPlans] = useState<Plan[]>([]);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [billingHistory, setBillingHistory] = useState<BillingHistoryItem[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);

  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');
  const [showAddPaymentModal, setShowAddPaymentModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [upgrading, setUpgrading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  const [newPayment, setNewPayment] = useState({
    type: 'credit_card',
    label: '',
    details: {},
  });

  const [cancelReason, setCancelReason] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [plansRes, currentRes, historyRes, methodsRes] = await Promise.all([
        api.get('/subscriptions/plans'),
        api.get('/subscriptions/current'),
        api.get('/subscriptions/billing-history?page=1&limit=10'),
        api.get('/subscriptions/payment-methods'),
      ]);

      setPlans(plansRes || []);
      setSubscription(currentRes.subscription || null);
      setBillingHistory(historyRes.history || []);
      setPaymentMethods(methodsRes || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load subscription data');
    } finally {
      setLoading(false);
    }
  };

  const handleUpgrade = async (planSlug: string) => {
    if (!subscription) return;
    if (subscription.tier === planSlug && subscription.billing_cycle === billingCycle) {
      return;
    }

    try {
      setUpgrading(true);
      setError(null);
      await api.post('/subscriptions/upgrade', {
        planSlug,
        billingCycle,
      });
      setSuccess('Plano atualizado com sucesso!');
      setTimeout(() => fetchData(), 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upgrade plan');
    } finally {
      setUpgrading(false);
    }
  };

  const handleAddPayment = async () => {
    if (!newPayment.label) {
      setError('Por favor, insira um nome para o método de pagamento');
      return;
    }

    try {
      setError(null);
      await api.post('/subscriptions/payment-methods', {
        type: newPayment.type,
        label: newPayment.label,
        details: newPayment.details,
      });
      setSuccess('Método de pagamento adicionado!');
      setShowAddPaymentModal(false);
      setNewPayment({ type: 'credit_card', label: '', details: {} });
      fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add payment method');
    }
  };

  const handleDeletePayment = async (id: string) => {
    if (!window.confirm('Tem certeza que deseja remover este método de pagamento?')) {
      return;
    }

    try {
      setDeleting(true);
      setError(null);
      await api.delete(`/subscriptions/payment-methods/${id}`);
      setSuccess('Método de pagamento removido!');
      fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete payment method');
    } finally {
      setDeleting(false);
    }
  };

  const handleSetDefault = async (id: string) => {
    try {
      setError(null);
      await api.put(`/subscriptions/payment-methods/${id}/default`, {});
      setSuccess('Método de pagamento padrão atualizado!');
      fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update default payment method');
    }
  };

  const handleCancel = async () => {
    if (!cancelReason) {
      setError('Por favor, selecione um motivo para o cancelamento');
      return;
    }

    try {
      setError(null);
      await api.post('/subscriptions/cancel', { reason: cancelReason });
      setSuccess('Assinatura cancelada. Você será redirecionado em breve.');
      setShowCancelModal(false);
      setTimeout(() => fetchData(), 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to cancel subscription');
    }
  };

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="animate-pulse space-y-4">
          <div className="h-32 bg-surface-800 rounded-lg"></div>
          <div className="h-96 bg-surface-800 rounded-lg"></div>
          <div className="h-64 bg-surface-800 rounded-lg"></div>
        </div>
      </div>
    );
  }

  const calculateTrialDays = () => {
    if (!subscription?.trial_ends_at) return null;
    const trialEnd = new Date(subscription.trial_ends_at);
    const today = new Date();
    const daysRemaining = Math.ceil((trialEnd.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return daysRemaining > 0 ? daysRemaining : null;
  };

  const trialDays = calculateTrialDays();
  const currentPlan = plans.find(p => p.slug === subscription?.tier);

  return (
    <div className="space-y-8 max-w-7xl">
      {/* Alerts */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="text-red-400 mt-0.5 flex-shrink-0" size={20} />
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      {success && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-4 flex items-start gap-3">
          <Check className="text-emerald-400 mt-0.5 flex-shrink-0" size={20} />
          <p className="text-emerald-400 text-sm">{success}</p>
        </div>
      )}

      {/* Current Plan Banner */}
      {subscription && (
        <div className="bg-gradient-to-r from-brand-500/20 to-amber-500/20 border border-brand-500/30 rounded-lg p-6">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-2xl font-bold text-white mb-2">
                {currentPlan?.name || subscription.tier}
              </h2>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-surface-400 text-sm">Status:</span>
                  <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-semibold ${
                    subscription.status === 'active'
                      ? 'bg-emerald-500/20 text-emerald-400'
                      : subscription.status === 'trialing'
                        ? 'bg-blue-500/20 text-blue-400'
                        : subscription.status === 'past_due'
                          ? 'bg-yellow-500/20 text-yellow-400'
                          : 'bg-surface-700 text-surface-300'
                  }`}>
                    {subscription.status === 'active' && <Check size={16} />}
                    {subscription.status === 'trialing' && <Clock size={16} />}
                    {subscription.status === 'past_due' && <AlertTriangle size={16} />}
                    {subscription.status.charAt(0).toUpperCase() + subscription.status.slice(1)}
                  </span>
                </div>

                {trialDays && (
                  <div className="flex items-center gap-2">
                    <Clock size={16} className="text-blue-400" />
                    <span className="text-sm text-blue-300">
                      {trialDays} dias de avaliação gratuita restantes
                    </span>
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <span className="text-surface-400 text-sm">Próxima cobrança:</span>
                  <span className="text-white font-semibold">
                    {new Date(subscription.next_billing_date).toLocaleDateString('pt-BR')}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-surface-400 text-sm">Ciclo de cobrança:</span>
                  <span className="text-white font-semibold uppercase">
                    {subscription.billing_cycle === 'annual' ? 'Anual' : 'Mensal'}
                  </span>
                </div>
              </div>
            </div>

            <div className="text-right">
              <p className="text-surface-400 text-sm mb-2">Valor mensal</p>
              <p className="text-3xl font-bold text-brand-400">
                {formatBRL(subscription.monthly_price)}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Plan Comparison Cards */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-white">Selecionar Plano</h3>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                checked={billingCycle === 'monthly'}
                onChange={() => setBillingCycle('monthly')}
                className="w-4 h-4"
              />
              <span className="text-surface-300 text-sm">Mensal</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                checked={billingCycle === 'annual'}
                onChange={() => setBillingCycle('annual')}
                className="w-4 h-4"
              />
              <span className="text-surface-300 text-sm">Anual</span>
            </label>
            {billingCycle === 'annual' && (
              <span className="bg-brand-500/20 text-brand-400 px-2 py-1 rounded text-xs font-semibold">
                Economize 15%
              </span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-4 gap-4">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`rounded-lg border transition-all ${
                subscription?.tier === plan.slug
                  ? 'border-brand-500 bg-brand-500/10'
                  : 'border-surface-700 bg-surface-800 hover:border-surface-600'
              }`}
            >
              {subscription?.tier === plan.slug && (
                <div className="bg-brand-500 text-surface-950 px-3 py-2 rounded-t-lg flex items-center justify-center gap-1">
                  <Star size={16} />
                  <span className="text-xs font-bold">PLANO ATUAL</span>
                </div>
              )}

              <div className="p-4">
                <h4 className="text-white font-bold mb-2">{plan.name}</h4>
                <p className="text-surface-400 text-xs mb-4">{plan.description}</p>

                <div className="mb-6">
                  <p className="text-3xl font-bold text-white">
                    {formatBRL(billingCycle === 'annual' ? plan.annual_price : plan.monthly_price)}
                  </p>
                  <p className="text-surface-400 text-xs mt-1">
                    por {billingCycle === 'annual' ? 'ano' : 'mês'}
                  </p>
                </div>

                <button
                  onClick={() => handleUpgrade(plan.slug)}
                  disabled={
                    upgrading ||
                    (subscription?.tier === plan.slug && subscription?.billing_cycle === billingCycle)
                  }
                  className={`w-full py-2 rounded-lg font-semibold text-sm transition-colors mb-4 ${
                    subscription?.tier === plan.slug && subscription?.billing_cycle === billingCycle
                      ? 'bg-surface-700 text-surface-400 cursor-default'
                      : plan.slug === 'free'
                        ? 'bg-surface-700 text-white hover:bg-surface-600'
                        : 'bg-brand-500 text-surface-950 hover:bg-brand-600'
                  }`}
                >
                  {upgrading ? 'Processando...' : 'Selecionar'}
                </button>

                <div className="space-y-2">
                  {plan.features?.map((feature, idx) => (
                    <div key={idx} className="flex items-start gap-2">
                      <Check size={16} className="text-emerald-400 mt-0.5 flex-shrink-0" />
                      <span className="text-surface-300 text-xs">{feature}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Payment Methods Section */}
      <div>
        <h3 className="text-xl font-bold text-white mb-4">Métodos de Pagamento</h3>

        <div className="grid grid-cols-2 gap-4 mb-6">
          {paymentMethods.map((method) => (
            <div key={method.id} className="bg-surface-800 border border-surface-700 rounded-lg p-4">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="text-white font-semibold text-sm">{method.label}</p>
                  <p className="text-surface-400 text-xs mt-1 uppercase">{method.type}</p>
                </div>
                {method.is_default === 1 && (
                  <Star size={16} className="text-brand-400 fill-brand-400" />
                )}
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => handleSetDefault(method.id)}
                  disabled={method.is_default === 1 || deleting}
                  className="flex-1 text-xs py-1.5 rounded-lg bg-surface-700 text-surface-300 hover:bg-surface-600 disabled:opacity-50 transition-colors"
                >
                  Usar como padrão
                </button>
                <button
                  onClick={() => handleDeletePayment(method.id)}
                  disabled={method.is_default === 1 || deleting}
                  className="flex-1 text-xs py-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 disabled:opacity-50 transition-colors"
                >
                  <Trash2 size={14} className="mx-auto" />
                </button>
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={() => setShowAddPaymentModal(true)}
          className="w-full bg-surface-800 border border-surface-700 hover:border-brand-500/50 rounded-lg p-4 flex items-center justify-center gap-2 text-surface-300 hover:text-white transition-colors"
        >
          <Plus size={20} />
          Adicionar Método de Pagamento
        </button>
      </div>

      {/* Billing History */}
      <div>
        <h3 className="text-xl font-bold text-white mb-4">Histórico de Cobrança</h3>

        <div className="bg-surface-800 rounded-lg border border-surface-700 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-surface-700 bg-surface-900/50">
                <th className="px-6 py-3 text-left text-xs font-semibold text-surface-400 uppercase">Data</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-surface-400 uppercase">Descrição</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-surface-400 uppercase">Valor</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-surface-400 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-surface-400 uppercase">NF</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-surface-400 uppercase">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-700">
              {billingHistory.length > 0 ? (
                billingHistory.map((item) => (
                  <tr key={item.id} className="hover:bg-surface-700/50 transition-colors">
                    <td className="px-6 py-4 text-sm text-surface-300">
                      {new Date(item.created_at).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-6 py-4 text-sm text-surface-300">
                      {item.description || 'Cobrança de assinatura'}
                    </td>
                    <td className="px-6 py-4 text-sm font-semibold text-white">
                      {formatBRL(item.amount)}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold ${
                        item.status === 'paid'
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : item.status === 'pending'
                            ? 'bg-yellow-500/20 text-yellow-400'
                            : 'bg-red-500/20 text-red-400'
                      }`}>
                        {item.status === 'paid' && <Check size={12} />}
                        {item.status === 'pending' && <Clock size={12} />}
                        {item.status === 'failed' && <AlertTriangle size={12} />}
                        {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-surface-400">
                      {item.invoice_number}
                    </td>
                    <td className="px-6 py-4">
                      <button className="text-brand-400 hover:text-brand-300 transition-colors p-1">
                        <Download size={16} />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-surface-400">
                    Nenhum histórico de cobrança
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Cancel Subscription Section */}
      {subscription?.tier !== 'free' && subscription?.status !== 'cancelled' && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-6">
          <h3 className="text-lg font-bold text-red-400 mb-2">Zona de Perigo</h3>
          <p className="text-surface-300 text-sm mb-4">
            Ao cancelar sua assinatura, você perderá acesso a todos os recursos premium.
          </p>
          <button
            onClick={() => setShowCancelModal(true)}
            className="bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
          >
            Cancelar Assinatura
          </button>
        </div>
      )}

      {/* Add Payment Modal */}
      {showAddPaymentModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-surface-800 border border-surface-700 rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-lg font-bold text-white">Adicionar Método de Pagamento</h4>
              <button
                onClick={() => setShowAddPaymentModal(false)}
                className="text-surface-400 hover:text-white transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-white mb-2">Tipo de Pagamento</label>
                <select
                  value={newPayment.type}
                  onChange={(e) => setNewPayment({ ...newPayment, type: e.target.value })}
                  className="w-full bg-surface-900 border border-surface-700 rounded-lg px-3 py-2 text-white"
                >
                  <option value="credit_card">Cartão de Crédito</option>
                  <option value="debit_card">Cartão de Débito</option>
                  <option value="pix">PIX</option>
                  <option value="boleto">Boleto</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-white mb-2">Nome/Identificação</label>
                <input
                  type="text"
                  value={newPayment.label}
                  onChange={(e) => setNewPayment({ ...newPayment, label: e.target.value })}
                  placeholder="Ex: Meu Cartão Visa"
                  className="w-full bg-surface-900 border border-surface-700 rounded-lg px-3 py-2 text-white placeholder-surface-500"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setShowAddPaymentModal(false)}
                  className="flex-1 bg-surface-700 hover:bg-surface-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleAddPayment}
                  className="flex-1 bg-brand-500 hover:bg-brand-600 text-surface-950 font-semibold py-2 px-4 rounded-lg transition-colors"
                >
                  Adicionar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Subscription Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-surface-800 border border-surface-700 rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle className="text-red-400" size={24} />
              <h4 className="text-lg font-bold text-white">Cancelar Assinatura?</h4>
            </div>

            <p className="text-surface-300 text-sm mb-4">
              Você está prestes a cancelar sua assinatura. Ao confirmar, você perderá acesso a todos os recursos premium.
            </p>

            <div className="bg-brand-500/10 border border-brand-500/30 rounded-lg p-3 mb-4">
              <p className="text-brand-400 text-sm font-semibold mb-1">Espera aí! 🎉</p>
              <p className="text-brand-300 text-sm">Que tal um desconto de 20% para continuar conosco?</p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-white mb-2">Por que você está cancelando?</label>
              <select
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="w-full bg-surface-900 border border-surface-700 rounded-lg px-3 py-2 text-white mb-4"
              >
                <option value="">Selecione um motivo...</option>
                <option value="too_expensive">Muito caro</option>
                <option value="not_using">Não estou usando</option>
                <option value="found_alternative">Encontrei uma alternativa</option>
                <option value="poor_support">Suporte ruim</option>
                <option value="other">Outro</option>
              </select>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowCancelModal(false)}
                className="flex-1 bg-surface-700 hover:bg-surface-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
              >
                Manter Assinatura
              </button>
              <button
                onClick={handleCancel}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
              >
                Confirmar Cancelamento
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Subscription;
