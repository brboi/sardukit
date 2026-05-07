<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { getAuthToken, apiFetch, clearAuthToken } from './services/api.js'
import CsvImport from './components/CsvImport.vue'
import RulesManager from './components/RulesManager.vue'
import ReportGenerator from './components/ReportGenerator.vue'

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || ''

const email = ref(null)
const loading = ref(true)
const error = ref(null)
const view = ref('dash')
const authExpiredMessage = ref('')

function handleCredentialResponse(response) {
  verifyToken(response.credential)
}

async function verifyToken(idToken) {
  loading.value = true
  error.value = null
  authExpiredMessage.value = ''
  try {
    const res = await apiFetch('/api/auth/verify', {
      method: 'POST',
      body: JSON.stringify({ token: idToken }),
    })
    const data = await res.json()
    if (!res.ok) {
      error.value = data.error || 'Échec de l\'authentification'
      return
    }
    localStorage.setItem('auth_token', data.token)
    email.value = data.email
  } catch (err) {
    error.value = 'Erreur réseau'
  } finally {
    loading.value = false
  }
}

function logout() {
  clearAuthToken()
  email.value = null
  view.value = 'dash'
  window.location.reload()
}

function handleAuthExpired() {
  email.value = null
  authExpiredMessage.value = 'Votre session a expiré. Veuillez vous reconnecter.'
}

onMounted(async () => {
  window.addEventListener('auth-expired', handleAuthExpired)
  const token = getAuthToken()
  if (token) {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]))
      email.value = payload.email
    } catch {
      clearAuthToken()
    }
  }
  loading.value = false
})

onUnmounted(() => {
  window.removeEventListener('auth-expired', handleAuthExpired)
})

window.handleCredentialResponse = handleCredentialResponse
</script>

<template>
  <main class="container" style="margin-top: 2rem">
    <div v-if="loading" style="text-align: center">Chargement...</div>

    <template v-else-if="email">
      <nav>
        <ul><li><strong>Sardukit</strong></li></ul>
        <ul>
          <li><a href="#" @click.prevent="view = 'dash'">Tableau de bord</a></li>
          <li><a href="#" @click.prevent="view = 'import'">Importer</a></li>
          <li><a href="#" @click.prevent="view = 'rules'">Règles</a></li>
          <li><a href="#" @click.prevent="view = 'report'">Rapport</a></li>
          <li><a href="#" @click.prevent="logout">Déconnexion ({{ email }})</a></li>
        </ul>
      </nav>

      <div v-if="view === 'dash'">
        <h1>Bienvenue</h1>
        <p>Connecté en tant que <strong>{{ email }}</strong></p>
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
      <p v-if="authExpiredMessage" style="color: #c0392b; font-weight: 600">{{ authExpiredMessage }}</p>
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
