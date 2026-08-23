import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

function balanceApiPlugin() {
  const balancesFile = path.resolve(__dirname, 'balances.json')

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
