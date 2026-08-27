import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

function balanceApiPlugin() {
  const balancesFile = path.resolve(__dirname, 'balances.json')
  const ordersFile = path.resolve(__dirname, 'orders.json')

  function getBalances() {
    if (!fs.existsSync(balancesFile)) {
      const initial = {
        'carlosjavierlarosagranado@gmail.com': 0.75,
        '0a6ee88c-c9e8-4b8f-a247-4fa73d2cac1c': 0.75
      }
      fs.writeFileSync(balancesFile, JSON.stringify(initial, null, 2), 'utf-8')
      return initial
    }
    try {
      return JSON.parse(fs.readFileSync(balancesFile, 'utf-8'))
    } catch (e) {
      return {}
    }
  }

  function saveBalances(data) {
    try {
      fs.writeFileSync(balancesFile, JSON.stringify(data, null, 2), 'utf-8')
    } catch (e) {}
  }

  function getOrders() {
    if (!fs.existsSync(ordersFile)) {
      fs.writeFileSync(ordersFile, JSON.stringify([], null, 2), 'utf-8')
      return []
    }
    try {
      return JSON.parse(fs.readFileSync(ordersFile, 'utf-8'))
    } catch (e) {
      return []
    }
  }

  function saveOrders(data) {
    try {
      fs.writeFileSync(ordersFile, JSON.stringify(data, null, 2), 'utf-8')
    } catch (e) {}
  }

  return {
    name: 'vite-plugin-balance-api',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const parsedUrl = req.url ? req.url.split('?')[0] : ''

        if (parsedUrl === '/api/v1/balances' && req.method === 'GET') {
          const balances = getBalances()
          res.setHeader('Content-Type', 'application/json')
          res.setHeader('Access-Control-Allow-Origin', '*')
          res.end(JSON.stringify({ success: true, balances }))
          return
        }

        if (parsedUrl === '/api/v1/balance/update' && req.method === 'POST') {
          let body = ''
          req.on('data', chunk => { body += chunk })
          req.on('end', () => {
            try {
              const data = JSON.parse(body || '{}')
              const userId = (data.userId || '').trim()
              const email = (data.email || '').trim().toLowerCase()
              const balance = Number(Number(data.balance || 0).toFixed(2))

              const current = getBalances()
              if (userId) current[userId] = balance
              if (email) current[email] = balance
              saveBalances(current)

              res.setHeader('Content-Type', 'application/json')
              res.setHeader('Access-Control-Allow-Origin', '*')
              res.end(JSON.stringify({ success: true, userId, email, balance }))
            } catch (err) {
              res.statusCode = 400
              res.end(JSON.stringify({ error: err.message }))
            }
          })
          return
        }

        if (parsedUrl === '/api/v1/orders' && req.method === 'GET') {
          const orders = getOrders()
          res.setHeader('Content-Type', 'application/json')
          res.setHeader('Access-Control-Allow-Origin', '*')
          res.end(JSON.stringify(orders))
          return
        }

        if ((parsedUrl === '/api/v1/orders' || parsedUrl === '/api/v1/order/create') && req.method === 'POST') {
          let body = ''
          req.on('data', chunk => { body += chunk })
          req.on('end', () => {
            try {
              const newOrder = JSON.parse(body || '{}')
              if (newOrder && newOrder.id) {
                const current = getOrders()
                const filtered = current.filter(o => o.id !== newOrder.id)
                const updated = [newOrder, ...filtered]
                saveOrders(updated)
                res.setHeader('Content-Type', 'application/json')
                res.setHeader('Access-Control-Allow-Origin', '*')
                res.end(JSON.stringify({ success: true, order: newOrder }))
                return
              }
              res.statusCode = 400
              res.end(JSON.stringify({ error: 'Order must have an ID' }))
            } catch (err) {
              res.statusCode = 400
              res.end(JSON.stringify({ error: err.message }))
            }
          })
          return
        }

        // Proxy for Recargas América Wallet
        if (parsedUrl === '/api/v1/supplier/wallet') {
          const authHeader = req.headers['authorization'] || 'Bearer ra_CMZjuhXfrdk9WDJ1RYbg0CBrBNxM0Qa3QESkRxmb'
          import('https').then(({ default: https }) => {
            const proxyReq = https.request({
              hostname: 'panel.recargasamerica.com',
              path: '/api/v1/wallet',
              method: 'GET',
              headers: {
                'Authorization': authHeader,
                'Accept': 'application/json'
              }
            }, (proxyRes) => {
              let pData = ''
              proxyRes.on('data', c => pData += c)
              proxyRes.on('end', () => {
                res.setHeader('Content-Type', 'application/json')
                res.setHeader('Access-Control-Allow-Origin', '*')
                res.statusCode = proxyRes.statusCode || 200
                res.end(pData)
              })
            })
            proxyReq.on('error', (e) => {
              res.statusCode = 500
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ success: false, error: e.message }))
            })
            proxyReq.end()
          })
          return
        }

        // Proxy for Recargas América Validate UID
        if (parsedUrl === '/api/v1/supplier/validate' && req.method === 'POST') {
          const authHeader = req.headers['authorization'] || 'Bearer ra_CMZjuhXfrdk9WDJ1RYbg0CBrBNxM0Qa3QESkRxmb'
          let body = ''
          req.on('data', chunk => { body += chunk })
          req.on('end', () => {
            import('https').then(({ default: https }) => {
              const proxyReq = https.request({
                hostname: 'panel.recargasamerica.com',
                path: '/api/v1/pins/validate',
                method: 'POST',
                headers: {
                  'Authorization': authHeader,
                  'Content-Type': 'application/json',
                  'Accept': 'application/json'
                }
              }, (proxyRes) => {
                let pData = ''
                proxyRes.on('data', c => pData += c)
                proxyRes.on('end', () => {
                  res.setHeader('Content-Type', 'application/json')
                  res.setHeader('Access-Control-Allow-Origin', '*')
                  res.statusCode = proxyRes.statusCode || 200
                  res.end(pData)
                })
              })
              proxyReq.on('error', (e) => {
                res.statusCode = 500
                res.setHeader('Content-Type', 'application/json')
                res.end(JSON.stringify({ success: false, error: e.message }))
              })
              proxyReq.write(body)
              proxyReq.end()
            })
          })
          return
        }

        // Proxy for Recargas América Buy
        if (parsedUrl === '/api/v1/supplier/buy' && req.method === 'POST') {
          const authHeader = req.headers['authorization'] || 'Bearer ra_CMZjuhXfrdk9WDJ1RYbg0CBrBNxM0Qa3QESkRxmb'
          let body = ''
          req.on('data', chunk => { body += chunk })
          req.on('end', () => {
            import('https').then(({ default: https }) => {
              const proxyReq = https.request({
                hostname: 'panel.recargasamerica.com',
                path: '/api/v1/buy/pins',
                method: 'POST',
                headers: {
                  'Authorization': authHeader,
                  'Content-Type': 'application/json',
                  'Accept': 'application/json'
                }
              }, (proxyRes) => {
                let pData = ''
                proxyRes.on('data', c => pData += c)
                proxyRes.on('end', () => {
                  res.setHeader('Content-Type', 'application/json')
                  res.setHeader('Access-Control-Allow-Origin', '*')
                  res.statusCode = proxyRes.statusCode || 200
                  res.end(pData)
                })
              })
              proxyReq.on('error', (e) => {
                res.statusCode = 500
                res.setHeader('Content-Type', 'application/json')
                res.end(JSON.stringify({ success: false, error: e.message }))
              })
              proxyReq.write(body)
              proxyReq.end()
            })
          })
          return
        }

        // Proxy for Free Fire Info & Stats API (SiamBhau / Custom)
        if (parsedUrl.startsWith('/api/v1/ff-info')) {
          const queryStr = req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : ''
          import('https').then(({ default: https }) => {
            const proxyReq = https.request({
              hostname: 'siambhau69.eu.cc',
              path: `/freefireinfo/bhau${queryStr}`,
              method: 'GET',
              headers: {
                'Accept': 'application/json',
                'User-Agent': 'ALVSHOP-App/2.0'
              }
            }, (proxyRes) => {
              let pData = ''
              proxyRes.on('data', c => pData += c)
              proxyRes.on('end', () => {
                res.setHeader('Content-Type', 'application/json')
                res.setHeader('Access-Control-Allow-Origin', '*')
                res.statusCode = proxyRes.statusCode || 200
                res.end(pData)
              })
            })
            proxyReq.on('error', (e) => {
              res.statusCode = 500
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ success: false, error: e.message }))
            })
            proxyReq.end()
          })
          return
        }

        next()
      })
    }
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), balanceApiPlugin()],
  server: {
    host: '0.0.0.0',
    port: 5173
  }
})
