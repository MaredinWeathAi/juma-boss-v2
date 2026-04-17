import React, { useState, useEffect } from 'react';
import {
  Plus,
  Edit2,
  Trash2,
  Send,
  AlertTriangle,
  Search,
  Megaphone,
  MessageSquare,
  Users,
  BarChart3,
  Lock,
  Zap,
  TrendingUp,
  MessageCircle,
  Calendar,
  Target,
} from 'lucide-react';
import api from '../../lib/api';
import { formatBRL, formatNumber } from '../../lib/utils';
import { EmptyState } from '../../components/ui/EmptyState';
import { LineChart, Line, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface Campaign {
  id: string;
  name: string;
  type: string;
  status: string;
  channel: string;
  target_audience: string;
  message_title?: string;
  message_body?: string;
  recipient_count: number;
  delivered_count: number;
  read_count: number;
  conversion_count: number;
  revenue_generated: number;
  scheduled_at?: string;
  sent_at?: string;
  created_at: string;
}

interface Segment {
  id: string;
  name: string;
  description: string;
  customer_count: number;
  avg_order_value: number;
  avg_frequency: number;
  customers: any[];
}

interface MarketingAccess {
  tier: string;
  access: {
    campaigns: boolean;
    whatsapp: boolean;
    segmentation: boolean;
    analytics: boolean;
  };
}

const Marketing = () => {
  const [activeTab, setActiveTab] = useState<'campaigns' | 'whatsapp' | 'segments' | 'analytics'>('campaigns');
  const [loading, setLoading] = useState(true);
  const [access, setAccess] = useState<MarketingAccess | null>(null);

  // Campaigns state
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [showCampaignModal, setShowCampaignModal] = useState(false);
  const [editingCampaignId, setEditingCampaignId] = useState<string | null>(null);
  const [campaignFormData, setCampaignFormData] = useState({
    name: '',
    type: 'seasonal_promo',
    channel: 'whatsapp',
    targetAudience: 'all',
    messageTitle: '',
    messageBody: '',
    budget: '',
    scheduledAt: '',
  });

  // Segments state
  const [segments, setSegments] = useState<Segment[]>([]);
  const [selectedSegment, setSelectedSegment] = useState<Segment | null>(null);

  // Analytics state
  const [analyticsData, setAnalyticsData] = useState<any>(null);

  // WhatsApp blast state
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);
  const [whatsappFormData, setWhatsappFormData] = useState({
    message: '',
    template: 'greeting',
    recipient_segment: 'all',
    schedule_type: 'now',
    schedule_date: '',
  });

  useEffect(() => {
    fetchMarketingData();
  }, []);

  const fetchMarketingData = async () => {
    try {
      setLoading(true);

      // Check access
      const accessResponse = await api.get('/baker/marketing/access');
      setAccess(accessResponse);

      // Fetch campaigns
      const campaignsResponse = await api.get('/baker/marketing/campaigns');
      setCampaigns(campaignsResponse.campaigns || []);

      // Fetch segments
      const segmentsResponse = await api.get('/baker/marketing/segments');
      setSegments(segmentsResponse.segments || []);

      // Fetch analytics
      const analyticsResponse = await api.get('/baker/marketing/analytics');
      setAnalyticsData(analyticsResponse);
    } catch (err) {
      console.error('Error fetching marketing data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!campaignFormData.name || !campaignFormData.channel) {
      alert('Nome e canal são obrigatórios');
      return;
    }

    try {
      await api.post('/baker/marketing/campaigns', {
        ...campaignFormData,
        budget: campaignFormData.budget ? parseFloat(campaignFormData.budget) : null,
      });

      setCampaignFormData({
        name: '',
        type: 'seasonal_promo',
        channel: 'whatsapp',
        targetAudience: 'all',
        messageTitle: '',
        messageBody: '',
        budget: '',
        scheduledAt: '',
      });
      setShowCampaignModal(false);
      await fetchMarketingData();
    } catch (err) {
      alert('Erro ao criar campanhas: ' + (err instanceof Error ? err.message : 'Erro desconhecido'));
    }
  };

  const handleSendCampaign = async (campaignId: string) => {
    if (!window.confirm('Enviar esta campanhas agora?')) return;

    try {
      await api.post(`/baker/marketing/campaigns/${campaignId}/send`);
      await fetchMarketingData();
    } catch (err) {
      alert('Erro ao enviar campanhas: ' + (err instanceof Error ? err.message : 'Erro desconhecido'));
    }
  };

  const handleDeleteCampaign = async (campaignId: string) => {
    if (!window.confirm('Deletar esta campanhas?')) return;

    try {
      await api.delete(`/baker/marketing/campaigns/${campaignId}`);
      await fetchMarketingData();
    } catch (err) {
      alert('Erro ao deletar campanhas: ' + (err instanceof Error ? err.message : 'Erro desconhecido'));
    }
  };

  const handleSendWhatsApp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!whatsappFormData.message) {
      alert('Mensagem é obrigatória');
      return;
    }

    try {
      await api.post('/baker/marketing/campaigns', {
        name: `WhatsApp Blast - ${new Date().toLocaleDateString('pt-BR')}`,
        type: 'whatsapp_blast',
        channel: 'whatsapp',
        targetAudience: whatsappFormData.recipient_segment,
        messageBody: whatsappFormData.message,
      });

      setWhatsappFormData({
        message: '',
        template: 'greeting',
        recipient_segment: 'all',
        schedule_type: 'now',
        schedule_date: '',
      });
      setShowWhatsAppModal(false);
      await fetchMarketingData();
    } catch (err) {
      alert('Erro ao enviar WhatsApp: ' + (err instanceof Error ? err.message : 'Erro desconhecido'));
    }
  };

  const UpgradePrompt = ({ feature }: { feature: string }) => (
    <div className="card bg-gradient-to-r from-brand-500/10 to-brand-600/10 border border-brand-500/30 p-8 text-center">
      <Lock className="w-12 h-12 mx-auto text-brand-500 mb-4" />
      <h3 className="text-xl font-bold text-white mb-2">Recurso Premium</h3>
      <p className="text-surface-300 mb-6">{feature} está disponível apenas para planos Starter e acima.</p>
      <a href="/app/subscription" className="btn-primary inline-block">
        Fazer Upgrade
      </a>
    </div>
  );

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="page-title mb-2">Carregando...</div>
      </div>
    );
  }

  const COLORS = ['#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#ef4444', '#6366f1'];
  const campaignTypes = [
    { value: 'seasonal_promo', label: 'Promoção Sazonal' },
    { value: 'birthday_offer', label: 'Oferta de Aniversário' },
    { value: 'loyalty_reward', label: 'Recompensa Fidelidade' },
    { value: 'new_product', label: 'Novo Produto' },
    { value: 'holiday_special', label: 'Especial de Feriado' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="page-title mb-2 flex items-center gap-2">
            <Megaphone size={32} />
            Marketing
          </h1>
          <p className="page-subtitle">Gerencie campanhas e segmentos de clientes</p>
        </div>
      </div>

      {/* Tier Badge */}
      {access && (
        <div className="card bg-surface-800 border border-surface-700 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Zap size={20} className="text-brand-400" />
              <div>
                <p className="text-sm font-medium text-surface-300">Plano: {access.tier.toUpperCase()}</p>
                <p className="text-xs text-surface-500">
                  {!access.access.campaigns
                    ? 'Faça upgrade para acessar marketing'
                    : access.tier === 'pro' || access.tier === 'enterprise'
                    ? 'Acesso completo ao marketing'
                    : 'Acesso limitado - segmentação apenas'}
                </p>
              </div>
            </div>
            {!access.access.campaigns && (
              <a href="/app/subscription" className="btn-primary text-sm">
                Fazer Upgrade
              </a>
            )}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-4 border-b border-surface-700">
        {[
          { id: 'campaigns', label: 'Campanhas', icon: <MessageSquare size={18} /> },
          { id: 'whatsapp', label: 'WhatsApp', icon: <MessageCircle size={18} /> },
          { id: 'segments', label: 'Segmentos', icon: <Users size={18} /> },
          { id: 'analytics', label: 'Análise', icon: <BarChart3 size={18} /> },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-4 py-3 font-medium transition-all border-b-2 ${
              activeTab === tab.id
                ? 'border-brand-500 text-brand-400'
                : 'border-transparent text-surface-400 hover:text-white'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'campaigns' && (
        <div className="space-y-6">
          {!access?.access.campaigns ? (
            <UpgradePrompt feature="Campanhas de marketing" />
          ) : (
            <>
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold text-white">Campanhas</h2>
                <button
                  onClick={() => setShowCampaignModal(true)}
                  className="btn-primary flex items-center gap-2"
                >
                  <Plus size={18} />
                  Nova Campanha
                </button>
              </div>

              {campaigns.length === 0 ? (
                <EmptyState
                  title="Nenhuma campanha"
                  description="Comece criando sua primeira campanha de marketing"
                  icon={<Megaphone size={48} />}
                />
              ) : (
                <div className="grid gap-4">
                  {campaigns.map((campaign) => (
                    <div key={campaign.id} className="card bg-surface-800 border border-surface-700 p-6">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="text-lg font-bold text-white">{campaign.name}</h3>
                          <p className="text-sm text-surface-400 mt-1">
                            {campaignTypes.find((t) => t.value === campaign.type)?.label || campaign.type}
                          </p>
                        </div>
                        <span
                          className={`text-xs font-semibold px-3 py-1 rounded-full ${
                            campaign.status === 'draft'
                              ? 'bg-surface-700 text-surface-300'
                              : campaign.status === 'sent'
                              ? 'bg-green-500/20 text-green-400'
                              : campaign.status === 'scheduled'
                              ? 'bg-blue-500/20 text-blue-400'
                              : 'bg-surface-600 text-surface-400'
                          }`}
                        >
                          {campaign.status.charAt(0).toUpperCase() + campaign.status.slice(1)}
                        </span>
                      </div>

                      <div className="grid grid-cols-4 gap-4 mb-4 p-4 bg-surface-900 rounded-lg">
                        <div>
                          <p className="text-xs text-surface-500">Destinatários</p>
                          <p className="text-lg font-bold text-white">{campaign.recipient_count}</p>
                        </div>
                        <div>
                          <p className="text-xs text-surface-500">Entregues</p>
                          <p className="text-lg font-bold text-green-400">{campaign.delivered_count}</p>
                        </div>
                        <div>
                          <p className="text-xs text-surface-500">Conversões</p>
                          <p className="text-lg font-bold text-blue-400">{campaign.conversion_count}</p>
                        </div>
                        <div>
                          <p className="text-xs text-surface-500">Receita</p>
                          <p className="text-lg font-bold text-brand-400">{formatBRL(campaign.revenue_generated)}</p>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        {campaign.status === 'draft' && (
                          <>
                            <button
                              onClick={() => handleSendCampaign(campaign.id)}
                              className="btn-secondary flex items-center gap-2 text-sm"
                            >
                              <Send size={16} />
                              Enviar Agora
                            </button>
                            <button
                              onClick={() => handleDeleteCampaign(campaign.id)}
                              className="btn-danger flex items-center gap-2 text-sm"
                            >
                              <Trash2 size={16} />
                              Deletar
                            </button>
                          </>
                        )}
                        {campaign.status !== 'draft' && (
                          <span className="text-xs text-surface-400">
                            Enviada em {new Date(campaign.sent_at || campaign.created_at).toLocaleDateString('pt-BR')}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {activeTab === 'whatsapp' && (
        <div className="space-y-6">
          {!access?.access.whatsapp ? (
            <UpgradePrompt feature="Campanhas WhatsApp" />
          ) : (
            <>
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold text-white">WhatsApp Blasts</h2>
                <button
                  onClick={() => setShowWhatsAppModal(true)}
                  className="btn-primary flex items-center gap-2"
                >
                  <Plus size={18} />
                  Nova Mensagem
                </button>
              </div>

              <div className="card bg-surface-800 border border-surface-700 p-6">
                <h3 className="text-lg font-bold text-white mb-4">Templates de Mensagem</h3>
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { id: 'greeting', name: 'Saudação', preview: 'Olá! Confira nossas novidades...' },
                    { id: 'promo', name: 'Oferta Promocional', preview: '🎉 Promoção especial para você!' },
                    { id: 'product', name: 'Novo Produto', preview: 'Conheça nosso novo lançamento!' },
                    { id: 'loyalty', name: 'Recompensa Fidelidade', preview: 'Obrigado por ser nosso cliente!' },
                  ].map((template) => (
                    <div key={template.id} className="bg-surface-900 rounded-lg p-4 border border-surface-700">
                      <p className="font-medium text-white">{template.name}</p>
                      <p className="text-sm text-surface-400 mt-2">{template.preview}</p>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {activeTab === 'segments' && (
        <div className="space-y-6">
          {!access?.access.segmentation ? (
            <UpgradePrompt feature="Segmentação de clientes" />
          ) : (
            <>
              <h2 className="text-xl font-bold text-white">Segmentos de Clientes (RFM)</h2>

              {!segments.length ? (
                <EmptyState
                  title="Nenhum segmento"
                  description="Sem dados de cliente para análise"
                  icon={<Users size={48} />}
                />
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    {segments.map((segment) => (
                      <div
                        key={segment.id}
                        className="card bg-surface-800 border border-surface-700 p-6 cursor-pointer hover:border-surface-600 transition-colors"
                        onClick={() => setSelectedSegment(segment)}
                      >
                        <h3 className="text-lg font-bold text-white mb-2">{segment.name}</h3>
                        <p className="text-sm text-surface-400 mb-4">{segment.description}</p>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-surface-400">Clientes:</span>
                            <span className="text-white font-semibold">{segment.customer_count}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-surface-400">Valor Médio:</span>
                            <span className="text-white font-semibold">{formatBRL(segment.avg_order_value)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-surface-400">Frequência Média:</span>
                            <span className="text-white font-semibold">{formatNumber(segment.avg_frequency)}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {selectedSegment && (
                    <div className="card bg-surface-800 border border-surface-700 p-6">
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-bold text-white">{selectedSegment.name} - Clientes</h3>
                        <button
                          onClick={() => setSelectedSegment(null)}
                          className="text-surface-400 hover:text-white"
                        >
                          ✕
                        </button>
                      </div>

                      <div className="max-h-96 overflow-y-auto">
                        {selectedSegment.customers.length === 0 ? (
                          <p className="text-center text-surface-400 py-8">Sem clientes neste segmento</p>
                        ) : (
                          <table className="w-full">
                            <thead className="bg-surface-900">
                              <tr>
                                <th className="text-left px-4 py-2 text-xs font-semibold text-surface-400">Nome</th>
                                <th className="text-left px-4 py-2 text-xs font-semibold text-surface-400">Email</th>
                                <th className="text-right px-4 py-2 text-xs font-semibold text-surface-400">Compras</th>
                                <th className="text-right px-4 py-2 text-xs font-semibold text-surface-400">Gasto Total</th>
                              </tr>
                            </thead>
                            <tbody>
                              {selectedSegment.customers.map((customer, idx) => (
                                <tr key={idx} className="border-t border-surface-700">
                                  <td className="px-4 py-2 text-sm text-white">{customer.name}</td>
                                  <td className="px-4 py-2 text-sm text-surface-400">{customer.email}</td>
                                  <td className="text-right px-4 py-2 text-sm text-surface-400">{customer.order_count}</td>
                                  <td className="text-right px-4 py-2 text-sm text-white font-semibold">
                                    {formatBRL(customer.lifetime_value)}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {activeTab === 'analytics' && (
        <div className="space-y-6">
          {!access?.access.analytics ? (
            <UpgradePrompt feature="Análise de marketing" />
          ) : analyticsData ? (
            <>
              <h2 className="text-xl font-bold text-white">Análise de Campanhas</h2>

              {/* Overview Cards */}
              <div className="grid grid-cols-3 gap-4">
                <div className="card bg-surface-800 border border-surface-700 p-6">
                  <p className="text-surface-500 text-sm font-medium mb-2">Total de Campanhas</p>
                  <p className="text-3xl font-bold text-white">{analyticsData.overview.totalCampaigns}</p>
                  <p className="text-surface-400 text-xs mt-2">
                    {analyticsData.overview.completedCampaigns} concluídas
                  </p>
                </div>

                <div className="card bg-surface-800 border border-surface-700 p-6">
                  <p className="text-surface-500 text-sm font-medium mb-2">Mensagens Entregues</p>
                  <p className="text-3xl font-bold text-green-400">{analyticsData.deliveryMetrics.delivered}</p>
                  <p className="text-surface-400 text-xs mt-2">
                    Taxa: {analyticsData.deliveryMetrics.deliveryRate}%
                  </p>
                </div>

                <div className="card bg-surface-800 border border-surface-700 p-6">
                  <p className="text-surface-500 text-sm font-medium mb-2">Taxa de Leitura</p>
                  <p className="text-3xl font-bold text-blue-400">{analyticsData.deliveryMetrics.readRate}%</p>
                  <p className="text-surface-400 text-xs mt-2">
                    {analyticsData.deliveryMetrics.read} mensagens lidas
                  </p>
                </div>
              </div>

              {/* Performance Over Time */}
              {analyticsData.performanceOverTime.length > 0 && (
                <div className="card bg-surface-800 border border-surface-700 p-6">
                  <h3 className="text-lg font-bold text-white mb-4">Desempenho ao Longo do Tempo</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={analyticsData.performanceOverTime}>
                      <defs>
                        <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                      <XAxis dataKey="month" stroke="#94a3b8" />
                      <YAxis stroke="#94a3b8" />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569' }}
                        formatter={(value) => formatBRL(value as number)}
                      />
                      <Area type="monotone" dataKey="revenue" stroke="#8b5cf6" fill="url(#colorRevenue)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Channel Breakdown */}
              {analyticsData.channelBreakdown.length > 0 && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="card bg-surface-800 border border-surface-700 p-6">
                    <h3 className="text-lg font-bold text-white mb-4">Distribuição por Canal</h3>
                    <ResponsiveContainer width="100%" height={250}>
                      <PieChart>
                        <Pie
                          data={analyticsData.channelBreakdown}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ channel, campaign_count }) => `${channel}: ${campaign_count}`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="campaign_count"
                        >
                          {analyticsData.channelBreakdown.map((_entry: any, index: number) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="card bg-surface-800 border border-surface-700 p-6">
                    <h3 className="text-lg font-bold text-white mb-4">Detalhes por Canal</h3>
                    <div className="space-y-3">
                      {analyticsData.channelBreakdown.map((channel: any, idx: number) => (
                        <div key={idx} className="bg-surface-900 rounded-lg p-3">
                          <div className="flex justify-between items-center mb-2">
                            <span className="font-medium text-white">{channel.channel.toUpperCase()}</span>
                            <span className="text-sm text-surface-400">{channel.campaign_count} campanhas</span>
                          </div>
                          <div className="flex justify-between text-xs text-surface-400">
                            <span>Enviadas: {channel.total_sent}</span>
                            <span>Entregues: {channel.total_delivered}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : (
            <EmptyState
              title="Sem dados de análise"
              description="Execute suas primeiras campanhas para ver análises"
              icon={<BarChart3 size={48} />}
            />
          )}
        </div>
      )}

      {/* Campaign Modal */}
      {showCampaignModal && access?.access.campaigns && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="card bg-surface-800 border border-surface-700 max-w-2xl w-full mx-4 max-h-96 overflow-y-auto">
            <div className="flex justify-between items-center mb-4 p-6 border-b border-surface-700 sticky top-0 bg-surface-800">
              <h2 className="text-xl font-bold text-white">Nova Campanha</h2>
              <button
                onClick={() => setShowCampaignModal(false)}
                className="text-surface-400 hover:text-white text-2xl"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateCampaign} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-white mb-2">Nome da Campanha</label>
                <input
                  type="text"
                  value={campaignFormData.name}
                  onChange={(e) =>
                    setCampaignFormData({ ...campaignFormData, name: e.target.value })
                  }
                  className="input"
                  placeholder="Ex: Promoção de Verão"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-white mb-2">Tipo</label>
                  <select
                    value={campaignFormData.type}
                    onChange={(e) =>
                      setCampaignFormData({ ...campaignFormData, type: e.target.value })
                    }
                    className="input"
                  >
                    {campaignTypes.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-white mb-2">Canal</label>
                  <select
                    value={campaignFormData.channel}
                    onChange={(e) =>
                      setCampaignFormData({ ...campaignFormData, channel: e.target.value })
                    }
                    className="input"
                  >
                    <option value="whatsapp">WhatsApp</option>
                    <option value="email">Email</option>
                    <option value="sms">SMS</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-2">Público-Alvo</label>
                <select
                  value={campaignFormData.targetAudience}
                  onChange={(e) =>
                    setCampaignFormData({ ...campaignFormData, targetAudience: e.target.value })
                  }
                  className="input"
                >
                  <option value="all">Todos os Clientes</option>
                  <option value="new">Novos Clientes</option>
                  <option value="vip">Clientes VIP</option>
                  <option value="inactive">Clientes Inativos</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-2">Título da Mensagem</label>
                <input
                  type="text"
                  value={campaignFormData.messageTitle}
                  onChange={(e) =>
                    setCampaignFormData({ ...campaignFormData, messageTitle: e.target.value })
                  }
                  className="input"
                  placeholder="Título opcional"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-2">Corpo da Mensagem</label>
                <textarea
                  value={campaignFormData.messageBody}
                  onChange={(e) =>
                    setCampaignFormData({ ...campaignFormData, messageBody: e.target.value })
                  }
                  className="input resize-none"
                  rows={3}
                  placeholder="Digite sua mensagem..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-white mb-2">Orçamento (R$)</label>
                  <input
                    type="number"
                    value={campaignFormData.budget}
                    onChange={(e) =>
                      setCampaignFormData({ ...campaignFormData, budget: e.target.value })
                    }
                    className="input"
                    placeholder="0,00"
                    step="0.01"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-white mb-2">Agendar Para</label>
                  <input
                    type="datetime-local"
                    value={campaignFormData.scheduledAt}
                    onChange={(e) =>
                      setCampaignFormData({ ...campaignFormData, scheduledAt: e.target.value })
                    }
                    className="input"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t border-surface-700">
                <button
                  type="submit"
                  className="btn-primary flex-1"
                >
                  Criar Campanha
                </button>
                <button
                  type="button"
                  onClick={() => setShowCampaignModal(false)}
                  className="btn-secondary flex-1"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* WhatsApp Modal */}
      {showWhatsAppModal && access?.access.whatsapp && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="card bg-surface-800 border border-surface-700 max-w-2xl w-full mx-4 max-h-96 overflow-y-auto">
            <div className="flex justify-between items-center mb-4 p-6 border-b border-surface-700 sticky top-0 bg-surface-800">
              <h2 className="text-xl font-bold text-white">WhatsApp Blast</h2>
              <button
                onClick={() => setShowWhatsAppModal(false)}
                className="text-surface-400 hover:text-white text-2xl"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSendWhatsApp} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-white mb-2">Template</label>
                <select
                  value={whatsappFormData.template}
                  onChange={(e) =>
                    setWhatsappFormData({ ...whatsappFormData, template: e.target.value })
                  }
                  className="input"
                >
                  <option value="greeting">Saudação</option>
                  <option value="promo">Oferta Promocional</option>
                  <option value="product">Novo Produto</option>
                  <option value="loyalty">Recompensa Fidelidade</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-2">Mensagem</label>
                <textarea
                  value={whatsappFormData.message}
                  onChange={(e) =>
                    setWhatsappFormData({ ...whatsappFormData, message: e.target.value })
                  }
                  className="input resize-none"
                  rows={4}
                  placeholder="Digite sua mensagem..."
                />
                <p className="text-xs text-surface-500 mt-2">
                  {whatsappFormData.message.length}/1000 caracteres
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-2">Público-Alvo</label>
                <select
                  value={whatsappFormData.recipient_segment}
                  onChange={(e) =>
                    setWhatsappFormData({ ...whatsappFormData, recipient_segment: e.target.value })
                  }
                  className="input"
                >
                  <option value="all">Todos os Clientes</option>
                  <option value="champions">Champions</option>
                  <option value="loyal">Leais</option>
                  <option value="potential">Potencial</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-2">Agendar</label>
                <div className="grid grid-cols-2 gap-4">
                  <select
                    value={whatsappFormData.schedule_type}
                    onChange={(e) =>
                      setWhatsappFormData({ ...whatsappFormData, schedule_type: e.target.value })
                    }
                    className="input"
                  >
                    <option value="now">Agora</option>
                    <option value="scheduled">Agendar</option>
                  </select>

                  {whatsappFormData.schedule_type === 'scheduled' && (
                    <input
                      type="datetime-local"
                      value={whatsappFormData.schedule_date}
                      onChange={(e) =>
                        setWhatsappFormData({ ...whatsappFormData, schedule_date: e.target.value })
                      }
                      className="input"
                    />
                  )}
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t border-surface-700">
                <button
                  type="submit"
                  className="btn-primary flex-1 flex items-center justify-center gap-2"
                >
                  <Send size={18} />
                  Enviar
                </button>
                <button
                  type="button"
                  onClick={() => setShowWhatsAppModal(false)}
                  className="btn-secondary flex-1"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Marketing;
