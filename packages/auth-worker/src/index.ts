
import { Hono } from 'hono'
import { cors } from 'hono/cors'

type Bindings = {
  ABS_AUTH: KVNamespace
}

const app = new Hono<{ Bindings: Bindings }>()

app.use('*', cors())

// 1. Mock Login (Replace with GitHub OAuth later)
app.post('/login', async (c) => {
  const { email, password, turnstile } = await c.req.json()
  
  // 0. Validate Turnstile
  if (!turnstile) return c.json({ error: 'Missing captcha' }, 400)
  
  const ip = c.req.header('CF-Connecting-IP')
  const formData = new FormData()
  formData.append('secret', '0x4AAAAAACNu2JqUWAas5oH0RIfM0Vlt7Ws')
  formData.append('response', turnstile)
  formData.append('remoteip', ip || '')

  const url = 'https://challenges.cloudflare.com/turnstile/v0/siteverify'
  const result = await fetch(url, { body: formData, method: 'POST' })
  const outcome = await result.json()

  // @ts-ignore
  if (!outcome.success) return c.json({ error: 'Bot detected' }, 403)

  // 1. Mock Login (Replace with GitHub OAuth later)
  // TODO: Validate password in D1
  if (email === 'dev@oconnector.tech' && password === 'Rsg4dr3g44@') {
    // Generate Session ID
    const sessionId = crypto.randomUUID()
    await c.env.ABS_AUTH.put(`session:${sessionId}`, JSON.stringify({
      id: 'user_123',
      email: email,
      role: 'admin'
    }), { expirationTtl: 86400 * 7 }) // 7 days

    return c.json({ 
      token: sessionId,
      user: { id: 'user_123', email, role: 'admin' }
    })
  }

  return c.json({ error: 'Invalid credentials' }, 401)
})

// 2. Generate Personal Access Token (CLI/Extension)
app.post('/token', async (c) => {
  const authHeader = c.req.header('Authorization')
  if (!authHeader) return c.json({ error: 'Unauthorized' }, 401)

  const sessionId = authHeader.replace('Bearer ', '')
  const session = await c.env.ABS_AUTH.get(`session:${sessionId}`)
  
  if (!session) return c.json({ error: 'Invalid session' }, 401)

  const userData = JSON.parse(session)
  const prefix = 'abs_pat_'
  const token = prefix + crypto.randomUUID().replace(/-/g, '')
  
  // Store PAT in KV linked to User
  await c.env.ABS_AUTH.put(`pat:${token}`, JSON.stringify({
    userId: userData.id,
    email: userData.email,
    scope: 'runtime:read runtime:write',
    createdAt: new Date().toISOString()
  }))

  return c.json({ 
    accessToken: token,
    dummy_cmd: `export ABS_TOKEN=${token}`
  })
})

// 3. Verify Token (Used by MCP Server)
app.get('/verify', async (c) => {
  const authHeader = c.req.header('Authorization')
  if (!authHeader) return c.json({ error: 'Missing token' }, 401)

  const token = authHeader.replace('Bearer ', '')
  const data = await c.env.ABS_AUTH.get(`pat:${token}`)

  if (!data) return c.json({ error: 'Invalid token' }, 403)

  return c.json({ active: true, ...JSON.parse(data) })
})

export default app
