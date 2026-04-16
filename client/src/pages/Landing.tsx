import React, { useState } from 'react';
import {
  ArrowRight,
  ShoppingCart,
  ChefHat,
  Users,
  Package,
  CreditCard,
  BarChart3,
  Check,
  ChevronDown,
  Star,
  Menu,
  X,
  Zap,
  Shield,
  Smartphone,
  Github,
  Facebook,
  Instagram,
  Coffee
} from 'lucide-react';

export default function Landing() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  const toggleFaq = (index: number) => {
    setExpandedFaq(expandedFaq === index ? null : index);
  };

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    element?.scrollIntoView({ behavior: 'smooth' });
    setMobileMenuOpen(false);
  };

  // Pricing data
  const plans = [
    {
      name: 'Grátis',
      monthlyPrice: 0,
      annualPrice: 0,
      description: 'Perfeito para começar',
      features: [
        'Até 10 produtos',
        '20 clientes',
        '50 pedidos/mês',
        'Básico',
        'Não',
        'Não'
      ],
      badge: false,
      popular: false
    },
    {
      name: 'Iniciante',
      monthlyPrice: 149,
      annualPrice: 126.75,
      description: 'Para padarias em crescimento',
      features: [
        'Até 50 produtos',
        '200 clientes',
        'Pedidos ilimitados',
        'Completo',
        'Não',
        'Não'
      ],
      badge: false,
      popular: true
    },
    {
      name: 'Profissional',
      monthlyPrice: 399,
      annualPrice: 339.15,
      description: 'Para padarias estabelecidas',
      features: [
        'Tudo ilimitado',
        'Tudo ilimitado',
        'Tudo ilimitado',
        'Avançado',
        'Sim',
        'Até 3 usuários'
      ],
      badge: false,
      popular: false
    },
    {
      name: 'Empresa',
      monthlyPrice: 999,
      annualPrice: 849.15,
      description: 'Solução enterprise',
      features: [
        'Tudo ilimitado',
        'Tudo ilimitado',
        'Tudo ilimitado',
        'Enterprise',
        'Sim',
        'Usuários ilimitados + Suporte prioritário'
      ],
      badge: false,
      popular: false
    }
  ];

  // Testimonials
  const testimonials = [
    {
      name: 'Ana Santos',
      bakery: 'Padaria da Ana',
      text: 'Começamos como padaria caseira e agora temos 3 pontos de venda. O Juma Boss foi essencial para organizar tudo. Recomendo!',
      stars: 5
    },
    {
      name: 'Carlos Oliveira',
      bakery: 'Delícias do Carlos',
      text: 'O sistema de pedidos é incrível. Consigo gerenciar tudo pelo celular e meus clientes adoram poder fazer pedidos online.',
      stars: 5
    },
    {
      name: 'Maria Lima',
      bakery: 'Doces da Maria',
      text: 'Achei muito simples de usar. Em uma tarde já estava tudo configurado. O suporte também é bem atencioso!',
      stars: 5
    }
  ];

  // Features
  const features = [
    {
      icon: ShoppingCart,
      title: 'Pedidos',
      description: 'Gerencie pedidos do início ao fim. Receba via WhatsApp, site ou app.'
    },
    {
      icon: ChefHat,
      title: 'Produção',
      description: 'Organize sua produção diária e acompanhe o progresso de cada pedido.'
    },
    {
      icon: Users,
      title: 'Clientes',
      description: 'Conheça seus clientes e fidelize com histórico de compras completo.'
    },
    {
      icon: Package,
      title: 'Estoque',
      description: 'Controle ingredientes, custos e gerencie múltiplos locais de estoque.'
    },
    {
      icon: CreditCard,
      title: 'Pagamentos',
      description: 'PIX, cartão, dinheiro — tudo registrado automaticamente.'
    },
    {
      icon: BarChart3,
      title: 'Relatórios',
      description: 'Dados para tomar melhores decisões e crescer seu negócio.'
    }
  ];

  // How it works
  const steps = [
    {
      number: '1',
      title: 'Cadastre-se',
      description: 'Crie sua conta em 2 minutos com email e senha. Sem cartão de crédito necessário.'
    },
    {
      number: '2',
      title: 'Configure',
      description: 'Adicione seus produtos, preços, clientes e métodos de pagamento.'
    },
    {
      number: '3',
      title: 'Gerencie',
      description: 'Comece a gerenciar pedidos e cresça seu negócio com dados em tempo real.'
    }
  ];

  // FAQs
  const faqs = [
    {
      question: 'Preciso pagar para começar?',
      answer: 'Não! O plano Grátis é totalmente gratuito e sem tempo de expiração. Você pode usar para sempre, sem cartão de crédito. Faça upgrade quando estiver pronto.'
    },
    {
      question: 'Funciona no celular?',
      answer: 'Sim! Juma Boss é totalmente otimizado para celular. Você gerencia tudo do seu Android ou iPhone, em qualquer lugar.'
    },
    {
      question: 'Como funciona o pagamento?',
      answer: 'Aceitamos PIX, cartão de crédito, débito e boleto. Você pode alterar o método a qualquer momento e temos integração com as maiores operadoras de pagamento.'
    },
    {
      question: 'Posso cancelar a qualquer momento?',
      answer: 'Claro! Sem contratos, sem taxas de cancelamento. Você pode cancelar o plano quando quiser. Seus dados serão sempre seus.'
    },
    {
      question: 'É seguro?',
      answer: 'Sim! Toda comunicação é criptografada (HTTPS), seus dados são armazenados em servidores seguros e fazemos backup automático todos os dias.'
    },
    {
      question: 'Oferecem suporte?',
      answer: 'Sim! Respondemos via WhatsApp, email e chat. Nosso time está disponível durante o horário comercial para ajudar com qualquer dúvida.'
    }
  ];

  const currentPrice = (plan: typeof plans[0]) => {
    if (billingCycle === 'annual') {
      return plan.annualPrice;
    }
    return plan.monthlyPrice;
  };

  return (
    <div className="w-full bg-surface-950 text-white overflow-hidden">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-surface-950/95 backdrop-blur border-b border-surface-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex items-center gap-2">
              <Coffee className="w-8 h-8 text-amber-400" />
              <span className="text-2xl font-bold bg-gradient-to-r from-amber-400 to-amber-500 bg-clip-text text-transparent">
                Juma Boss
              </span>
            </div>

            {/* Desktop Menu */}
            <div className="hidden md:flex gap-8">
              <button
                onClick={() => scrollToSection('features')}
                className="text-surface-300 hover:text-white transition-colors text-sm font-medium"
              >
                Recursos
              </button>
              <button
                onClick={() => scrollToSection('pricing')}
                className="text-surface-300 hover:text-white transition-colors text-sm font-medium"
              >
                Preços
              </button>
              <button
                onClick={() => scrollToSection('about')}
                className="text-surface-300 hover:text-white transition-colors text-sm font-medium"
              >
                Sobre
              </button>
              <button
                onClick={() => scrollToSection('faq')}
                className="text-surface-300 hover:text-white transition-colors text-sm font-medium"
              >
                FAQ
              </button>
            </div>

            {/* CTA and Mobile Menu */}
            <div className="flex items-center gap-4">
              <a
                href="/login"
                className="hidden md:block px-4 py-2 text-sm font-medium text-amber-400 hover:text-amber-300 transition-colors"
              >
                Entrar
              </a>
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-2"
              >
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>

          {/* Mobile Menu */}
          {mobileMenuOpen && (
            <div className="md:hidden pb-4 space-y-3 border-t border-surface-800">
              <button
                onClick={() => scrollToSection('features')}
                className="block w-full text-left px-4 py-2 text-surface-300 hover:text-white hover:bg-surface-800 rounded transition-colors"
              >
                Recursos
              </button>
              <button
                onClick={() => scrollToSection('pricing')}
                className="block w-full text-left px-4 py-2 text-surface-300 hover:text-white hover:bg-surface-800 rounded transition-colors"
              >
                Preços
              </button>
              <button
                onClick={() => scrollToSection('about')}
                className="block w-full text-left px-4 py-2 text-surface-300 hover:text-white hover:bg-surface-800 rounded transition-colors"
              >
                Sobre
              </button>
              <button
                onClick={() => scrollToSection('faq')}
                className="block w-full text-left px-4 py-2 text-surface-300 hover:text-white hover:bg-surface-800 rounded transition-colors"
              >
                FAQ
              </button>
              <a
                href="/login"
                className="block w-full text-left px-4 py-2 text-amber-400 hover:text-amber-300 border-t border-surface-800"
              >
                Entrar
              </a>
            </div>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative px-4 sm:px-6 lg:px-8 py-20 sm:py-32 overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-amber-500/10 to-transparent rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-gradient-to-tr from-amber-500/5 to-transparent rounded-full blur-3xl"></div>
        </div>

        <div className="relative max-w-4xl mx-auto text-center z-10">
          <div className="mb-6 inline-block px-4 py-2 rounded-full bg-amber-500/10 border border-amber-500/30">
            <span className="text-amber-400 text-sm font-medium">Gerencie sua padaria como um profissional</span>
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold mb-6 leading-tight">
            <span className="bg-gradient-to-r from-amber-200 via-amber-400 to-amber-500 bg-clip-text text-transparent">
              Juma Boss
            </span>
            {' '}para padeiros
          </h1>

          <p className="text-lg sm:text-xl text-surface-300 mb-8 max-w-2xl mx-auto leading-relaxed">
            O sistema completo para padeiros brasileiros que querem crescer. Pedidos, estoque, clientes, pagamentos — tudo em um só lugar.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="/login"
              className="px-8 py-3 bg-amber-500 hover:bg-amber-600 text-surface-950 font-semibold rounded-lg transition-all transform hover:scale-105 flex items-center justify-center gap-2 group"
            >
              Comece Grátis
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </a>
            <button
              onClick={() => scrollToSection('features')}
              className="px-8 py-3 border border-amber-500/50 hover:bg-amber-500/10 text-amber-400 font-semibold rounded-lg transition-all"
            >
              Ver Demonstração
            </button>
          </div>

          <div className="mt-12 flex flex-col sm:flex-row justify-center gap-8 text-sm text-surface-400">
            <div className="flex items-center gap-2">
              <Check className="w-5 h-5 text-emerald-400" />
              Grátis para começar
            </div>
            <div className="flex items-center gap-2">
              <Check className="w-5 h-5 text-emerald-400" />
              Sem cartão de crédito
            </div>
            <div className="flex items-center gap-2">
              <Check className="w-5 h-5 text-emerald-400" />
              Funciona no celular
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="px-4 sm:px-6 lg:px-8 py-20">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">Tudo que você precisa</h2>
            <p className="text-surface-400 text-lg max-w-2xl mx-auto">
              Todas as ferramentas essenciais para gerenciar sua padaria de forma profissional
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <div
                  key={index}
                  className="p-8 rounded-xl bg-surface-900 border border-surface-800 hover:border-amber-500/30 transition-all group hover:shadow-lg hover:shadow-amber-500/5"
                >
                  <div className="mb-4 inline-flex p-3 rounded-lg bg-amber-500/10 group-hover:bg-amber-500/20 transition-colors">
                    <Icon className="w-6 h-6 text-amber-400" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                  <p className="text-surface-400 leading-relaxed">{feature.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section className="px-4 sm:px-6 lg:px-8 py-20 bg-surface-900/50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">Como funciona</h2>
            <p className="text-surface-400 text-lg">Comece em 3 passos simples</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 relative">
            {/* Connection line */}
            <div className="hidden md:block absolute top-1/3 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-amber-500/30 to-transparent"></div>

            {steps.map((step, index) => (
              <div key={index} className="relative">
                <div className="flex flex-col items-center text-center">
                  <div className="mb-6 flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 text-surface-950 font-bold text-xl shadow-lg shadow-amber-500/20">
                    {step.number}
                  </div>
                  <h3 className="text-xl font-semibold mb-3">{step.title}</h3>
                  <p className="text-surface-400 leading-relaxed">{step.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="px-4 sm:px-6 lg:px-8 py-20">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">Preços simples e transparentes</h2>
            <p className="text-surface-400 text-lg mb-8">Escolha o plano perfeito para seu negócio</p>

            {/* Billing Toggle */}
            <div className="inline-flex items-center gap-4 bg-surface-900 p-1 rounded-lg border border-surface-800">
              <button
                onClick={() => setBillingCycle('monthly')}
                className={`px-4 py-2 rounded font-medium transition-colors ${
                  billingCycle === 'monthly'
                    ? 'bg-amber-500/20 text-amber-400'
                    : 'text-surface-400 hover:text-white'
                }`}
              >
                Mensal
              </button>
              <button
                onClick={() => setBillingCycle('annual')}
                className={`px-4 py-2 rounded font-medium transition-colors ${
                  billingCycle === 'annual'
                    ? 'bg-amber-500/20 text-amber-400'
                    : 'text-surface-400 hover:text-white'
                }`}
              >
                Anual
              </button>
              {billingCycle === 'annual' && (
                <div className="ml-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-sm font-medium">
                  -15%
                </div>
              )}
            </div>
          </div>

          {/* Pricing Cards */}
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-4">
            {plans.map((plan, index) => (
              <div
                key={index}
                className={`relative rounded-xl border transition-all ${
                  plan.popular
                    ? 'border-amber-500/50 bg-gradient-to-b from-amber-500/10 to-surface-900 ring-2 ring-amber-500/20'
                    : 'border-surface-800 bg-surface-900'
                } p-8`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 px-4 py-1 rounded-full bg-gradient-to-r from-amber-400 to-amber-600 text-surface-950 text-xs font-bold">
                    MAIS POPULAR
                  </div>
                )}

                <h3 className="text-xl font-bold mb-2">{plan.name}</h3>
                <p className="text-surface-400 text-sm mb-6">{plan.description}</p>

                <div className="mb-6">
                  <div className="flex items-baseline gap-1">
                    {currentPrice(plan) > 0 ? (
                      <>
                        <span className="text-3xl font-bold">
                          R${' '}
                          {billingCycle === 'monthly'
                            ? plan.monthlyPrice.toLocaleString('pt-BR')
                            : plan.annualPrice.toLocaleString('pt-BR')}
                        </span>
                        <span className="text-surface-400 text-sm">
                          {billingCycle === 'monthly' ? '/mês' : '/mês*'}
                        </span>
                      </>
                    ) : (
                      <span className="text-3xl font-bold">Grátis</span>
                    )}
                  </div>
                  {billingCycle === 'annual' && currentPrice(plan) > 0 && (
                    <p className="text-xs text-surface-500 mt-2">*Faturado anualmente</p>
                  )}
                </div>

                <a
                  href="/login"
                  className={`w-full py-3 rounded-lg font-semibold transition-all mb-8 block text-center ${
                    plan.popular
                      ? 'bg-amber-500 hover:bg-amber-600 text-surface-950'
                      : 'bg-surface-800 hover:bg-surface-700 text-white'
                  }`}
                >
                  {plan.monthlyPrice === 0 ? 'Comece Grátis' : 'Começar'}
                </a>

                <div className="space-y-4">
                  <div className="text-sm font-semibold text-surface-300 mb-4">Incluso:</div>
                  {plan.features.map((feature, featureIndex) => (
                    <div key={featureIndex} className="flex items-start gap-3">
                      <Check className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                      <span className="text-sm text-surface-300">{feature}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <p className="text-center text-surface-400 text-sm mt-8">
            Todos os planos incluem suporte por email. Nenhum contrato. Cancele a qualquer momento.
          </p>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="px-4 sm:px-6 lg:px-8 py-20 bg-surface-900/50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">Histórias de sucesso</h2>
            <p className="text-surface-400 text-lg">
              Padeiros brasileiros crescendo com Juma Boss
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <div
                key={index}
                className="p-8 rounded-xl bg-surface-800 border border-surface-700 hover:border-amber-500/30 transition-all"
              >
                <div className="flex gap-1 mb-4">
                  {[...Array(testimonial.stars)].map((_, i) => (
                    <Star
                      key={i}
                      className="w-5 h-5 fill-amber-400 text-amber-400"
                    />
                  ))}
                </div>

                <p className="text-surface-200 mb-6 leading-relaxed">"{testimonial.text}"</p>

                <div>
                  <p className="font-semibold text-white">{testimonial.name}</p>
                  <p className="text-sm text-surface-400">{testimonial.bakery}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="px-4 sm:px-6 lg:px-8 py-20">
        <div className="max-w-4xl mx-auto">
          <div className="rounded-xl bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20 p-12 text-center">
            <h2 className="text-3xl font-bold mb-6">Feito para padeiros brasileiros</h2>

            <p className="text-lg text-surface-300 leading-relaxed mb-6">
              Juma Boss nasceu de uma conversa simples: "Por que não existe um sistema feito especificamente para padeiros brasileiros?"
            </p>

            <p className="text-surface-400 leading-relaxed mb-6">
              Entendemos os desafios únicos do seu dia a dia — desde gerenciar múltiplos tipos de clientes (varejo, restaurante, eventos) até lidar com sazonalidades de datas como Páscoa e Natal. Construímos Juma Boss pensando em você, com linguagem simples, funcionalidades práticas e suporte que realmente entende seu negócio.
            </p>

            <p className="text-surface-400 leading-relaxed">
              Nossa missão é empoderar padeiros a crescer seus negócios com tecnologia acessível, intuitiva e brasileira.
            </p>

            <div className="mt-8 flex flex-wrap justify-center gap-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-amber-400">1000+</div>
                <p className="text-surface-400 text-sm">Padeiros usando</p>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-amber-400">500k+</div>
                <p className="text-surface-400 text-sm">Pedidos gerenciados</p>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-amber-400">98%</div>
                <p className="text-surface-400 text-sm">Satisfação dos clientes</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="px-4 sm:px-6 lg:px-8 py-20 bg-surface-900/50">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">Perguntas frequentes</h2>
            <p className="text-surface-400 text-lg">
              Respostas para as dúvidas mais comuns
            </p>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, index) => (
              <div
                key={index}
                className="border border-surface-800 rounded-lg overflow-hidden transition-all hover:border-amber-500/30"
              >
                <button
                  onClick={() => toggleFaq(index)}
                  className="w-full px-6 py-4 flex items-center justify-between hover:bg-surface-800/50 transition-colors text-left"
                >
                  <span className="font-semibold text-white">{faq.question}</span>
                  <ChevronDown
                    className={`w-5 h-5 text-surface-400 transition-transform ${
                      expandedFaq === index ? 'transform rotate-180' : ''
                    }`}
                  />
                </button>

                {expandedFaq === index && (
                  <div className="px-6 py-4 bg-surface-800/30 border-t border-surface-800">
                    <p className="text-surface-300 leading-relaxed">{faq.answer}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="px-4 sm:px-6 lg:px-8 py-20">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold mb-6">
            Pronto para crescer sua padaria?
          </h2>
          <p className="text-xl text-surface-400 mb-8 max-w-2xl mx-auto">
            Comece grátis hoje e descubra como Juma Boss pode transformar seu negócio
          </p>

          <a
            href="/login"
            className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-amber-400 to-amber-600 hover:from-amber-500 hover:to-amber-700 text-surface-950 font-bold rounded-lg transition-all transform hover:scale-105 group text-lg"
          >
            Comece Grátis Agora
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-surface-800 px-4 sm:px-6 lg:px-8 py-16 bg-surface-900/50">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-5 gap-8 mb-12">
            {/* Brand */}
            <div className="md:col-span-1">
              <div className="flex items-center gap-2 mb-4">
                <Coffee className="w-6 h-6 text-amber-400" />
                <span className="text-lg font-bold">Juma Boss</span>
              </div>
              <p className="text-surface-400 text-sm leading-relaxed">
                Gerencie sua padaria como um profissional.
              </p>
            </div>

            {/* Links */}
            <div>
              <h4 className="font-semibold mb-4 text-white">Produto</h4>
              <ul className="space-y-2 text-sm text-surface-400">
                <li>
                  <button
                    onClick={() => scrollToSection('features')}
                    className="hover:text-white transition-colors"
                  >
                    Recursos
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => scrollToSection('pricing')}
                    className="hover:text-white transition-colors"
                  >
                    Preços
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => scrollToSection('faq')}
                    className="hover:text-white transition-colors"
                  >
                    FAQ
                  </button>
                </li>
              </ul>
            </div>

            {/* Company */}
            <div>
              <h4 className="font-semibold mb-4 text-white">Empresa</h4>
              <ul className="space-y-2 text-sm text-surface-400">
                <li>
                  <button
                    onClick={() => scrollToSection('about')}
                    className="hover:text-white transition-colors"
                  >
                    Sobre
                  </button>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Blog
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Contato
                  </a>
                </li>
              </ul>
            </div>

            {/* Legal */}
            <div>
              <h4 className="font-semibold mb-4 text-white">Legal</h4>
              <ul className="space-y-2 text-sm text-surface-400">
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Privacidade
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Termos
                  </a>
                </li>
              </ul>
            </div>

            {/* Social */}
            <div>
              <h4 className="font-semibold mb-4 text-white">Social</h4>
              <div className="flex gap-3">
                <a
                  href="#"
                  className="p-2 rounded-lg bg-surface-800 hover:bg-surface-700 text-surface-400 hover:text-white transition-colors"
                  aria-label="Instagram"
                >
                  <Instagram className="w-4 h-4" />
                </a>
                <a
                  href="#"
                  className="p-2 rounded-lg bg-surface-800 hover:bg-surface-700 text-surface-400 hover:text-white transition-colors"
                  aria-label="Facebook"
                >
                  <Facebook className="w-4 h-4" />
                </a>
                <a
                  href="#"
                  className="p-2 rounded-lg bg-surface-800 hover:bg-surface-700 text-surface-400 hover:text-white transition-colors"
                  aria-label="GitHub"
                >
                  <Github className="w-4 h-4" />
                </a>
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-surface-800 pt-8 flex flex-col sm:flex-row justify-between items-center gap-4">
            <p className="text-surface-500 text-sm">
              © 2024 Juma Boss. Todos os direitos reservados.
            </p>
            <p className="text-surface-500 text-sm">
              Feito com <span className="text-red-500">❤</span> para padeiros brasileiros
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
