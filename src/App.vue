<script setup>
import { ref, onMounted } from 'vue'
import { getAuthToken, apiFetch } from './services/api.js'
import CsvImport from './components/CsvImport.vue'
import RulesManager from './components/RulesManager.vue'
import ReportGenerator from './components/ReportGenerator.vue'

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || ''

const email = ref(null)
const loading = ref(true)
const error = ref(null)
const view = ref('dash')

function handleCredentialResponse(response) {
  verifyToken(response.credential)
}

async function verifyToken(idToken) {
  loading.value = true
  error.value = null
  try {
    const res = await apiFetch('/api/auth/verify', {
      method: 'POST',
      body: JSON.stringify({ token: idToken }),
    })
    const data = await res.json()
    if (!res.ok) {
      error.value = data.error || 'Authentication failed'
      return
    }
    localStorage.setItem('auth_token', data.token)
    email.value = data.email
  } catch (err) {
    error.value = 'Network error'
  } finally {
    loading.value = false
  }
}

function logout() {
  localStorage.removeItem('auth_token')
  email.value = null
  view.value = 'dash'
  window.location.reload()
}

onMounted(async () => {
  const token = getAuthToken()
  if (token) {
    try {
      const res = await apiFetch('/api/health')
      if (res.ok) {
        const payload = JSON.parse(atob(token.split('.')[1]))
        email.value = payload.email
      } else {
        localStorage.removeItem('auth_token')
      }
    } catch {
      localStorage.removeItem('auth_token')
    }
  }
  loading.value = false
})

window.handleCredentialResponse = handleCredentialResponse
</script>

<template>
  <main class="container" style="margin-top: 2rem">
    <div v-if="loading" style="text-align: center">Loading...</div>

    <template v-else-if="email">
      <nav>
        <ul><li><strong>Sardukit</strong></li></ul>
        <ul>
          <li><a href="#" @click.prevent="view = 'dash'">Dashboard</a></li>
          <li><a href="#" @click.prevent="view = 'import'">Import</a></li>
          <li><a href="#" @click.prevent="view = 'rules'">Rules</a></li>
          <li><a href="#" @click.prevent="view = 'report'">Report</a></li>
          <li><a href="#" @click.prevent="logout">Logout ({{ email }})</a></li>
        </ul>
      </nav>

      <div v-if="view === 'dash'">
        <h1>Welcome</h1>
        <p>Logged in as <strong>{{ email }}</strong></p>
      </div>
      <div v-if="view === 'import'">
        <CsvImport />
      </div>
      <div v-if="view === 'rules'">
        <RulesManager />
      </div>
      <div v-if="view === 'report'">
        <ReportGenerator />
      </div>
    </template>

    <template v-else>
      <h1>Sardukit</h1>
      <p v-if="error" style="color: #c0392b">{{ error }}</p>
      <div id="g_id_onload"
        :data-client_id="GOOGLE_CLIENT_ID"
        data-callback="handleCredentialResponse"
        data-auto_prompt="false"
        style="display: none"
      ></div>
      <div class="g_id_signin"
        data-type="standard"
        data-size="large"
        data-theme="outline"
        data-shape="rectangular"
        data-logo_alignment="left"
      ></div>
    </template>
  </main>
</template>

    <template v-else>
      <h1>Sardukit</h1>
      <p v-if="error" style="color: #c0392b">{{ error }}</p>
      <div id="g_id_onload"
        :data-client_id="GOOGLE_CLIENT_ID"
        data-callback="handleCredentialResponse"
        data-auto_prompt="false"
        style="display: none"
      ></div>
      <div class="g_id_signin"
        data-type="standard"
        data-size="large"
        data-theme="outline"
        data-shape="rectangular"
        data-logo_alignment="left"
      ></div>
    </template>
  </main>
</template>
