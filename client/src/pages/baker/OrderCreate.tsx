import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Plus, X, AlertTriangle } from 'lucide-react';
import api from '../../lib/api';

interface Customer {
  id: string;
  name: string;
  email: string;
  phone?: string;
  address?: string;
  city?: string;
}

interface Product {
  id: string;
  name: string;
  basePrice: number;
  cost: number;
}

interface OrderItem {
  productId: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

const OrderCreate = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Step 1: Customer
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerSearch, setCustomerSearch] = useState('');
  const [showNewCustomerForm, setShowNewCustomerForm] = useState(false);
  const [newCustomer, setNewCustomer] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    city: '',
  });

  // Step 2: Items
  const [products, setProducts] = useState<Product[]>([]);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [itemQuantity, setItemQuantity] = useState(1);
  const [productSearch, setProductSearch] = useState('');

  // Step 3: Delivery
  const [deliveryDate, setDeliveryDate] = useState(new Date().toISOString().split('T')[0]);
  const [deliveryType, setDeliveryType] = useState<'pickup' | 'delivery'>('pickup');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (step === 1) {
      fetchCustomers();
    } else if (step === 2) {
      fetchProducts();
    }
  }, [step]);

  const fetchCustomers = async () => {
    try {
      const response = await api.get('/baker/customers');
      setCustomers(response.data || response || []);
    } catch (err) {
      setError('Failed to load customers');
    }
  };

  const fetchProducts = async () => {
    try {
      const response = await api.get('/baker/products');
      setProducts(response.data || response || []);
    } catch (err) {
      setError('Failed to load products');
    }
  };

  const handleAddCustomer = async () => {
    if (!newCustomer.name || !newCustomer.email) {
      setError('Nome e email são obrigatórios');
      return;
    }

    try {
      setLoading(true);
      const response = await api.post('/baker/customers', newCustomer);
      const created = response.data || response;
      setSelectedCustomer(created);
      setShowNewCustomerForm(false);
      setNewCustomer({ name: '', email: '', phone: '', address: '', city: '' });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create customer');
    } finally {
      setLoading(false);
    }
  };

  const handleAddItem = () => {
    if (!selectedProduct || itemQuantity <= 0) {
      setError('Selecione um produto e quantidade válida');
      return;
    }

    const newItem: OrderItem = {
      productId: selectedProduct.id,
      quantity: itemQuantity,
      unitPrice: selectedProduct.basePrice,
      total: selectedProduct.basePrice * itemQuantity,
    };

    setOrderItems([...orderItems, newItem]);
    setSelectedProduct(null);
    setItemQuantity(1);
    setError(null);
  };

  const handleRemoveItem = (index: number) => {
    setOrderItems(orderItems.filter((_, i) => i !== index));
  };

  const handleSubmitOrder = async () => {
    if (!selectedCustomer) {
      setError('Selecione um cliente');
      return;
    }

    if (orderItems.length === 0) {
      setError('Adicione pelo menos um item');
      return;
    }

    if (!deliveryDate) {
      setError('Selecione uma data de entrega');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const orderData = {
        customerId: selectedCustomer.id,
        items: orderItems,
        dueDate: deliveryDate,
        deliveryType,
        deliveryAddress,
        notes,
      };

      const response = await api.post('/baker/orders', orderData);
      const createdOrder = response.data || response;
      navigate(`/app/orders/${createdOrder.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create order');
    } finally {
      setLoading(false);
    }
  };

  const totalPrice = orderItems.reduce((sum, item) => sum + item.total, 0);
  const filteredCustomers = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
      c.email.toLowerCase().includes(customerSearch.toLowerCase())
  );
  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(productSearch.toLowerCase())
  );

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8 flex items-center gap-4">
        <button
          onClick={() => (step > 1 ? setStep(step - 1) : navigate('/app/orders'))}
          className="btn-ghost p-2"
        >
          <ChevronLeft size={20} />
        </button>
        <div>
          <h1 className="page-title">Novo Pedido</h1>
          <p className="page-subtitle">Passo {step} de 4</p>
        </div>
      </div>

      {/* Step Indicator */}
      <div className="card mb-8">
        <div className="flex items-center justify-between mb-6">
          {[1, 2, 3, 4].map((s) => (
            <div key={s} className="flex flex-col items-center flex-1">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold mb-2 ${
                  s === step
                    ? 'bg-brand-500 text-surface-950'
                    : s < step
                    ? 'bg-emerald-500 text-white'
                    : 'bg-surface-800 text-surface-400'
                }`}
              >
                {s < step ? '✓' : s}
              </div>
              <p className="text-xs text-surface-400">
                {s === 1 ? 'Cliente' : s === 2 ? 'Itens' : s === 3 ? 'Entrega' : 'Confirmar'}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="card bg-red-500/10 border-red-500/50 mb-6 flex items-start gap-3">
          <AlertTriangle className="text-red-400 flex-shrink-0 mt-1" size={18} />
          <div>
            <p className="text-sm text-red-300">{error}</p>
          </div>
        </div>
      )}

      {/* Step 1: Customer Selection */}
      {step === 1 && (
        <div className="card space-y-6">
          <div>
            <h2 className="text-lg font-semibold text-white mb-4">Selecionar Cliente</h2>

            {selectedCustomer ? (
              <div className="bg-surface-800 p-4 rounded-lg border border-surface-700 mb-4">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-semibold text-white">{selectedCustomer.name}</p>
                    <p className="text-sm text-surface-400">{selectedCustomer.email}</p>
                    {selectedCustomer.phone && (
                      <p className="text-sm text-surface-400">{selectedCustomer.phone}</p>
                    )}
                  </div>
                  <button
                    onClick={() => setSelectedCustomer(null)}
                    className="text-surface-400 hover:text-red-400 transition-colors"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="mb-4">
                  <input
                    type="text"
                    placeholder="Buscar cliente..."
                    value={customerSearch}
                    onChange={(e) => setCustomerSearch(e.target.value)}
                    className="input w-full"
                  />
                </div>

                {filteredCustomers.length > 0 ? (
                  <div className="space-y-2 mb-4 max-h-64 overflow-y-auto">
                    {filteredCustomers.map((customer) => (
                      <button
                        key={customer.id}
                        onClick={() => setSelectedCustomer(customer)}
                        className="w-full text-left p-3 bg-surface-800 hover:bg-surface-700 rounded-lg transition-colors"
                      >
                        <p className="font-semibold text-white">{customer.name}</p>
                        <p className="text-sm text-surface-400">{customer.email}</p>
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-surface-400 text-sm mb-4">Nenhum cliente encontrado</p>
                )}

                <button
                  onClick={() => setShowNewCustomerForm(!showNewCustomerForm)}
                  className="btn-secondary w-full flex items-center justify-center gap-2"
                >
                  <Plus size={18} />
                  Adicionar Novo Cliente
                </button>
              </>
            )}

            {showNewCustomerForm && !selectedCustomer && (
              <div className="mt-6 p-4 border border-brand-500/30 rounded-lg bg-brand-500/5">
                <h3 className="font-semibold text-white mb-4">Novo Cliente</h3>
                <div className="space-y-3">
                  <input
                    type="text"
                    placeholder="Nome completo"
                    value={newCustomer.name}
                    onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })}
                    className="input w-full"
                  />
                  <input
                    type="email"
                    placeholder="Email"
                    value={newCustomer.email}
                    onChange={(e) => setNewCustomer({ ...newCustomer, email: e.target.value })}
                    className="input w-full"
                  />
                  <input
                    type="tel"
                    placeholder="Telefone (opcional)"
                    value={newCustomer.phone}
                    onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
                    className="input w-full"
                  />
                  <input
                    type="text"
                    placeholder="Endereço (opcional)"
                    value={newCustomer.address}
                    onChange={(e) => setNewCustomer({ ...newCustomer, address: e.target.value })}
                    className="input w-full"
                  />
                  <input
                    type="text"
                    placeholder="Cidade (opcional)"
                    value={newCustomer.city}
                    onChange={(e) => setNewCustomer({ ...newCustomer, city: e.target.value })}
                    className="input w-full"
                  />
                  <button
                    onClick={handleAddCustomer}
                    disabled={loading}
                    className="btn-primary w-full"
                  >
                    Criar Cliente
                  </button>
                </div>
              </div>
            )}
          </div>

          <button
            onClick={() => setStep(2)}
            disabled={!selectedCustomer}
            className={`w-full py-2 rounded-lg font-semibold transition-colors ${
              selectedCustomer
                ? 'btn-primary'
                : 'bg-surface-700 text-surface-400 cursor-not-allowed'
            }`}
          >
            Continuar
          </button>
        </div>
      )}

      {/* Step 2: Add Items */}
      {step === 2 && (
        <div className="card space-y-6">
          <div>
            <h2 className="text-lg font-semibold text-white mb-4">Adicionar Itens</h2>

            {/* Product Selection */}
            <div className="space-y-3 mb-6">
              <input
                type="text"
                placeholder="Buscar produto..."
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                className="input w-full"
              />

              {filteredProducts.length > 0 && (
                <select
                  value={selectedProduct?.id || ''}
                  onChange={(e) => {
                    const product = products.find((p) => p.id === e.target.value);
                    setSelectedProduct(product || null);
                  }}
                  className="input w-full"
                >
                  <option value="">Selecionar produto...</option>
                  {filteredProducts.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.name} - R$ {product.basePrice.toFixed(2)}
                    </option>
                  ))}
                </select>
              )}

              {selectedProduct && (
                <div className="flex gap-3">
                  <input
                    type="number"
                    min="1"
                    value={itemQuantity}
                    onChange={(e) => setItemQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                    className="input w-20"
                    placeholder="Qtd"
                  />
                  <button
                    onClick={handleAddItem}
                    className="btn-primary flex-1 flex items-center justify-center gap-2"
                  >
                    <Plus size={18} />
                    Adicionar
                  </button>
                </div>
              )}
            </div>

            {/* Items List */}
            {orderItems.length > 0 ? (
              <div className="space-y-2 mb-6">
                <h3 className="font-semibold text-white text-sm mb-3">Itens do Pedido</h3>
                {orderItems.map((item, index) => {
                  const product = products.find((p) => p.id === item.productId);
                  return (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 bg-surface-800 rounded-lg"
                    >
                      <div className="flex-1">
                        <p className="text-sm font-medium text-white">{product?.name}</p>
                        <p className="text-xs text-surface-400">
                          {item.quantity}x R$ {item.unitPrice.toFixed(2)} = R$ {item.total.toFixed(2)}
                        </p>
                      </div>
                      <button
                        onClick={() => handleRemoveItem(index)}
                        className="text-surface-400 hover:text-red-400 transition-colors"
                      >
                        <X size={18} />
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-surface-400 text-sm mb-6">Nenhum item adicionado</p>
            )}

            {/* Total */}
            <div className="bg-surface-800 p-4 rounded-lg mb-6">
              <div className="flex justify-between items-center">
                <span className="text-surface-400">Total</span>
                <span className="text-2xl font-bold text-white">
                  R$ {totalPrice.toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <button onClick={() => setStep(1)} className="btn-secondary flex-1">
              Voltar
            </button>
            <button
              onClick={() => setStep(3)}
              disabled={orderItems.length === 0}
              className={`flex-1 py-2 rounded-lg font-semibold transition-colors ${
                orderItems.length > 0
                  ? 'btn-primary'
                  : 'bg-surface-700 text-surface-400 cursor-not-allowed'
              }`}
            >
              Continuar
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Delivery Details */}
      {step === 3 && (
        <div className="card space-y-6">
          <div>
            <h2 className="text-lg font-semibold text-white mb-4">Detalhes de Entrega</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Data de Entrega
                </label>
                <input
                  type="date"
                  value={deliveryDate}
                  onChange={(e) => setDeliveryDate(e.target.value)}
                  className="input w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Tipo de Entrega
                </label>
                <select
                  value={deliveryType}
                  onChange={(e) => setDeliveryType(e.target.value as 'pickup' | 'delivery')}
                  className="input w-full"
                >
                  <option value="pickup">Retirada</option>
                  <option value="delivery">Entrega</option>
                </select>
              </div>

              {deliveryType === 'delivery' && (
                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    Endereço de Entrega
                  </label>
                  <textarea
                    value={deliveryAddress}
                    onChange={(e) => setDeliveryAddress(e.target.value)}
                    className="input w-full"
                    rows={3}
                    placeholder="Rua, número, bairro..."
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Notas (opcional)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="input w-full"
                  rows={3}
                  placeholder="Instruções especiais, alergias, etc..."
                />
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <button onClick={() => setStep(2)} className="btn-secondary flex-1">
              Voltar
            </button>
            <button onClick={() => setStep(4)} className="btn-primary flex-1">
              Revisar
            </button>
          </div>
        </div>
      )}

      {/* Step 4: Review & Confirm */}
      {step === 4 && (
        <div className="card space-y-6">
          <div>
            <h2 className="text-lg font-semibold text-white mb-6">Revisar Pedido</h2>

            {/* Customer Summary */}
            <div className="bg-surface-800 p-4 rounded-lg mb-6">
              <p className="text-xs text-surface-500 mb-1">Cliente</p>
              <p className="font-semibold text-white">{selectedCustomer?.name}</p>
            </div>

            {/* Items Summary */}
            <div className="bg-surface-800 p-4 rounded-lg mb-6">
              <p className="text-xs text-surface-500 mb-3">Itens</p>
              <div className="space-y-2">
                {orderItems.map((item, index) => {
                  const product = products.find((p) => p.id === item.productId);
                  return (
                    <div key={index} className="flex justify-between text-sm">
                      <span className="text-surface-300">
                        {product?.name} x{item.quantity}
                      </span>
                      <span className="text-white font-medium">
                        R$ {item.total.toFixed(2)}
                      </span>
                    </div>
                  );
                })}
              </div>
              <div className="border-t border-surface-700 mt-3 pt-3 flex justify-between">
                <span className="font-semibold text-white">Total</span>
                <span className="font-bold text-brand-400">R$ {totalPrice.toFixed(2)}</span>
              </div>
            </div>

            {/* Delivery Summary */}
            <div className="bg-surface-800 p-4 rounded-lg">
              <p className="text-xs text-surface-500 mb-3">Entrega</p>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-surface-400">Data</span>
                  <span className="text-white">{new Date(deliveryDate).toLocaleDateString('pt-BR')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-surface-400">Tipo</span>
                  <span className="text-white">
                    {deliveryType === 'pickup' ? 'Retirada' : 'Entrega'}
                  </span>
                </div>
                {deliveryAddress && (
                  <div className="flex justify-between">
                    <span className="text-surface-400">Endereço</span>
                    <span className="text-white text-right">{deliveryAddress}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <button onClick={() => setStep(3)} className="btn-secondary flex-1">
              Voltar
            </button>
            <button
              onClick={handleSubmitOrder}
              disabled={loading}
              className="btn-primary flex-1"
            >
              {loading ? 'Criando...' : 'Confirmar Pedido'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrderCreate;
