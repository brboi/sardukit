<template>
  <details>
    <summary><strong>{{ title }}</strong></summary>
    <div class="grid mt-2">
      <p v-if="loadError" class="text-warning">Impossible de charger le template.</p>
      <textarea
        v-model="content"
        :placeholder="loading ? 'Chargement du template...' : 'Template Mustache'"
        :rows="rows"
        :disabled="loading"
        class="font-mono text-sm"
      ></textarea>
      <div class="flex gap-1">
        <button @click="save" :disabled="saving">
          {{ saving ? 'Sauvegarde...' : 'Sauvegarder le template' }}
        </button>
        <button @click="reset">Réinitialiser par défaut</button>
      </div>
    </div>
  </details>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { apiFetch } from '../services/api.js'
import { showSuccess, showError } from '../composables/useModal.js'

const props = defineProps({
  title: { type: String, required: true },
  storageKey: { type: String, required: true },
  defaultValue: { type: String, default: '' },
  rows: { type: Number, default: 12 },
})

const emit = defineEmits(['saved'])

const content = ref('')
const loading = ref(true)
const saving = ref(false)
const loadError = ref(false)

onMounted(async () => {
  await load()
})

async function load() {
  loading.value = true
  loadError.value = false
  try {
    const res = await apiFetch(`/api/settings?key=${props.storageKey}`)
    if (res.ok) {
      const data = await res.json()
      content.value = data.value || props.defaultValue || ''
    } else {
      content.value = props.defaultValue || ''
    }
  } catch {
    loadError.value = true
    content.value = props.defaultValue || ''
  } finally {
    loading.value = false
  }
}

async function save() {
  saving.value = true
  try {
    const res = await apiFetch('/api/settings', {
      method: 'POST',
      body: JSON.stringify({ key: props.storageKey, value: content.value }),
    })
    if (!res.ok) {
      const err = await res.json()
      showError('Erreur: ' + (err.error || 'Erreur inconnue'))
    } else {
      showSuccess('Template sauvegardé')
      emit('saved')
    }
  } catch (e) {
    showError('Erreur réseau: ' + e.message)
  } finally {
    saving.value = false
  }
}

function reset() {
  content.value = props.defaultValue || ''
}
</script>
