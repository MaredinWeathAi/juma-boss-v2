import React from 'react';
import { Routes, Route } from 'react-router-dom';
import BakerLayout from '../../components/layouts/BakerLayout';
import Dashboard from './Dashboard';
import Orders from './Orders';
import OrderCreate from './OrderCreate';
import OrderDetail from './OrderDetail';
import Products from './Products';
import Customers from './Customers';
import Inventory from './Inventory';
import Payments from './Payments';
import Reports from './Reports';
import Settings from './Settings';

export default function BakerApp() {
  return (
    <BakerLayout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/orders" element={<Orders />} />
        <Route path="/orders/new" element={<OrderCreate />} />
        <Route path="/orders/:id" element={<OrderDetail />} />
        <Route path="/products" element={<Products />} />
        <Route path="/customers" element={<Customers />} />
        <Route path="/inventory" element={<Inventory />} />
        <Route path="/payments" element={<Payments />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/settings" element={<Settings />} />
      </Routes>
    </BakerLayout>
  );
}
