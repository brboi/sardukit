<template>
  <div>
    <h2>Settings</h2>

    <details open>
      <summary><strong>Général</strong></summary>
      <div class="form-grid mt-2">
        <label>
          Batch size (lignes par page dans les rapports)
          <input type="number" v-model.number="batchSize" min="5" max="100" />
        </label>
        <button @click="saveBatchSize" :disabled="savingBatch">
          {{ savingBatch ? 'Sauvegarde...' : 'Sauvegarder' }}
        </button>
      </div>
    </details>

    <template v-if="Object.keys(defaults).length">
      <TemplateEditor
        title="Template de prompt IA (règles)"
        storage-key="gemini_prompt_template"
        :default-value="defaults.gemini_prompt_template"
        class="mt-2"
      />
      <TemplateEditor
        title="Template de prompt IA (mapping colonnes)"
        storage-key="column_mapping_prompt_template"
        :default-value="defaults.column_mapping_prompt_template"
        class="mt-2"
      />
    </template>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { apiFetch } from '../services/api.js'
import { showError, showSuccess } from '../composables/useModal.js'
import TemplateEditor from './TemplateEditor.vue'

const batchSize = ref(25)
const savingBatch = ref(false)
const defaults = ref({})

onMounted(async () => {
  await loadDefaults()
  await loadBatchSize()
})

async function loadDefaults() {
  try {
    const res = await apiFetch('/api/settings?key=defaults')
    if (res.ok) {
      defaults.value = await res.json()
    }
  } catch {
    // ignore
  }
}

async function loadBatchSize() {
  try {
    const res = await apiFetch('/api/settings?key=report_batch_size')
    if (res.ok) {
      const data = await res.json()
      batchSize.value = data.value ?? 25
    }
  } catch {
    // use default
  }
}

async function saveBatchSize() {
  savingBatch.value = true
  try {
    const res = await apiFetch('/api/settings', {
      method: 'POST',
      body: JSON.stringify({ key: 'report_batch_size', value: batchSize.value }),
    })
    if (!res.ok) {
      const err = await res.json()
      showError('Erreur: ' + (err.error || 'Erreur inconnue'))
    } else {
      showSuccess('Batch size sauvegardé')
    }
  } catch (e) {
    showError('Erreur réseau: ' + e.message)
  } finally {
    savingBatch.value = false
  }
}
</script>
