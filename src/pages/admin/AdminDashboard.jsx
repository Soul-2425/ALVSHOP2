import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';

export default function AdminDashboard() {
  const [metrics, setMetrics] = useState({
    totalSalesUsdt: 0,
    totalCostUsdt: 0,
    netProfitUsdt: 0,
    totalOrders: 0,
    completedOrders: 0,
    resellersCount: 0
  });
  const [resellerSales, setResellerSales] = useState([]);
  const [bestSellers, setBestSellers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadAnalytics() {
      try {
        const fetchPromise = Promise.all([
          supabase.from('orders').select('*'),
          supabase.from('profiles').select('id, full_name, role'),
          supabase.from('order_items').select('*'),
          supabase.from('products').select('id, name, cost')
        ]);

        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Timeout')), 5000)
        );

        const [ordRes, profRes, itemsRes, prodsRes] = await Promise.race([fetchPromise, timeoutPromise]);

        const profMap = new Map((profRes?.data || []).map(p => [p.id, p]));
        const prodMap = new Map((prodsRes?.data || []).map(p => [p.id, p]));
        const items = (itemsRes?.data || []).map(i => ({
          ...i,
          products: prodMap.get(i.product_id)
        }));

        const itemsByOrder = new Map();
        items.forEach(i => {
          if (!itemsByOrder.has(i.order_id)) itemsByOrder.set(i.order_id, []);
          itemsByOrder.get(i.order_id).push(i);
        });

        const orders = (ordRes?.data || []).map(o => ({
          ...o,
          profiles: profMap.get(o.user_id),
          order_items: itemsByOrder.get(o.id) || []
        }));

        let grossSales = 0;
        let totalCost = 0;
        let completedCount = 0;
        const productCounts = {};
        const resellerMap = {};

        orders.forEach(ord => {
          if (ord.status === 'Completed') {
            const orderTotal = Number(ord.total_usdt || 0);
            grossSales += orderTotal;
            completedCount++;

            // Track Reseller sales
            if (ord.profiles?.role === 'Revendedor') {
              const resId = ord.profiles.id;
              if (!resellerMap[resId]) {
                resellerMap[resId] = {
                  name: ord.profiles.full_name || 'Revendedor #' + resId.slice(0, 5),
                  totalSales: 0,
                  totalCost: 0,
                  ordersCount: 0
                };
              }
              resellerMap[resId].totalSales += orderTotal;
              resellerMap[resId].ordersCount += 1;
            }

            // Calculate costs and product sales
            ord.order_items?.forEach(item => {
              const qty = item.quantity || 1;
              const unitCost = Number(item.cost_usdt || item.products?.cost || 0);
              const itemCost = unitCost * qty;
              totalCost += itemCost;

              if (ord.profiles?.role === 'Revendedor' && ord.profiles?.id && resellerMap[ord.profiles.id]) {
                resellerMap[ord.profiles.id].totalCost += itemCost;
              }

              const prodName = item.products?.name || 'Producto #' + (item.product_id || 'item');
              if (!productCounts[prodName]) {
                productCounts[prodName] = { name: prodName, unitsSold: 0, revenue: 0 };
              }
              productCounts[prodName].unitsSold += qty;
              productCounts[prodName].revenue += Number(item.price_usdt || 0) * qty;
            });
          }
        });

        const netProfit = grossSales - totalCost;

        // 2. Fetch Resellers Count
        const resCount = (profRes?.data || []).filter(p => p.role === 'Revendedor').length;

        // Set Real Metrics (Defaults to 0)
        setMetrics({
          totalSalesUsdt: grossSales,
          totalCostUsdt: totalCost,
          netProfitUsdt: netProfit,
          totalOrders: orders ? orders.length : 0,
          completedOrders: completedCount,
          resellersCount: resCount || 0
        });

        // Set Real Best-Sellers (Sorted by units sold)
        const sortedProducts = Object.values(productCounts).sort((a, b) => b.unitsSold - a.unitsSold);
        setBestSellers(sortedProducts);

        // Set Real Reseller Sales
        const formattedResellers = Object.values(resellerMap).map(r => ({
          name: r.name,
          totalSales: r.totalSales,
          netMargin: r.totalSales - r.totalCost,
          ordersCount: r.ordersCount
        }));
        setResellerSales(formattedResellers);

      } catch (err) {
        console.error('Error loading analytics:', err);
      } finally {
        setLoading(false);
      }
    }

    loadAnalytics();
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* 3 Metric Cards: Gross Profit, Net Profit, Orders */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '16px'
      }}>
        <div className="glass-panel" style={{ padding: '20px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-glass)' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Ventas Totales Brutas</div>
          <div style={{ fontSize: '1.8rem', fontWeight: '900', color: '#fff', margin: '4px 0' }}>
            ${metrics.totalSalesUsdt.toFixed(2)} <span style={{ fontSize: '0.9rem', color: 'var(--accent-cyan)' }}>USDT</span>
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>≈ Q{(metrics.totalSalesUsdt * 7.8).toFixed(2)} GTQ</div>
        </div>

        <div className="glass-panel" style={{ padding: '20px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-cyan)' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Ganancia Neta Real (Profit)</div>
          <div style={{ fontSize: '1.8rem', fontWeight: '900', color: '#34d399', margin: '4px 0' }}>
            +${metrics.netProfitUsdt.toFixed(2)} <span style={{ fontSize: '0.9rem' }}>USDT</span>
          </div>
          <div style={{ fontSize: '0.75rem', color: '#34d399' }}>Ventas - Costos de Proveedor</div>
        </div>

        <div className="glass-panel" style={{ padding: '20px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-glass)' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Pedidos Completados</div>
          <div style={{ fontSize: '1.8rem', fontWeight: '900', color: 'var(--accent-cyan)', margin: '4px 0' }}>
            {metrics.completedOrders} <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>/ {metrics.totalOrders}</span>
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{metrics.resellersCount} Revendedores Registrados</div>
        </div>
      </div>

      {/* Two Columns: Reseller Analytics & Best-Sellers */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
        
        {/* Resellers Breakdown Table */}
        <div className="glass-panel" style={{ padding: '20px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-glass)' }}>
          <h3 style={{ fontSize: '1.1rem', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>🤝</span> Analítica de Revendedores
          </h3>
          <div style={{ overflowX: 'auto' }}>
            {resellerSales.length === 0 ? (
              <div style={{ padding: '24px 10px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                No hay revendedores con ventas registradas aún.
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-glass)', textAlign: 'left', color: 'var(--text-muted)' }}>
                    <th style={{ padding: '8px 4px' }}>Revendedor</th>
                    <th style={{ padding: '8px 4px' }}>Pedidos</th>
                    <th style={{ padding: '8px 4px' }}>Venta Bruta</th>
                    <th style={{ padding: '8px 4px' }}>Margen Neto</th>
                  </tr>
                </thead>
                <tbody>
                  {resellerSales.map((res, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.03)' }}>
                      <td style={{ padding: '10px 4px', fontWeight: '700' }}>{res.name}</td>
                      <td style={{ padding: '10px 4px' }}>{res.ordersCount}</td>
                      <td style={{ padding: '10px 4px' }}>${res.totalSales.toFixed(2)}</td>
                      <td style={{ padding: '10px 4px', color: '#34d399', fontWeight: '700' }}>+${res.netMargin.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Best-Sellers Ranking Table */}
        <div className="glass-panel" style={{ padding: '20px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-glass)' }}>
          <h3 style={{ fontSize: '1.1rem', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>🏆</span> Ranking Best-Sellers (Más Vendidos)
          </h3>
          <div style={{ overflowX: 'auto' }}>
            {bestSellers.length === 0 ? (
              <div style={{ padding: '24px 10px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                No hay productos vendidos aún en la tienda.
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-glass)', textAlign: 'left', color: 'var(--text-muted)' }}>
                    <th style={{ padding: '8px 4px' }}>Producto</th>
                    <th style={{ padding: '8px 4px' }}>Unidades</th>
                    <th style={{ padding: '8px 4px' }}>Ingresos</th>
                  </tr>
                </thead>
                <tbody>
                  {bestSellers.map((item, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.03)' }}>
                      <td style={{ padding: '10px 4px', fontWeight: '700' }}>
                        <span style={{ color: 'var(--accent-cyan)', marginRight: '6px' }}>#{i + 1}</span>
                        {item.name}
                      </td>
                      <td style={{ padding: '10px 4px' }}>{item.unitsSold} u.</td>
                      <td style={{ padding: '10px 4px', color: 'var(--accent-cyan)', fontWeight: '700' }}>${item.revenue.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
