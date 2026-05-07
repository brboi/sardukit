<template>
  <div>
    <h2>Gestionnaire de règles</h2>

    <div v-if="loading">Chargement des règles...</div>

    <template v-else>
      <table>
        <thead>
          <tr>
            <th>Priorité</th>
            <th>Motif</th>
            <th>Type de correspondance</th>
            <th>Catégorie</th>
            <th>Sous-catégorie</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(rule, idx) in rules" :key="rule.id">
            <td>
              <input type="number" v-model.number="rule.priority" style="width: 60px" />
            </td>
            <td><input type="text" v-model="rule.pattern" /></td>
            <td>
              <select v-model="rule.match_type">
                <option value="contains">Contient</option>
                <option value="starts_with">Commence par</option>
                <option value="ends_with">Finit par</option>
                <option value="regex">Regex</option>
                <option value="exact">Exact</option>
              </select>
            </td>
            <td><input type="text" v-model="rule.category" /></td>
            <td><input type="text" v-model="rule.sub_category" /></td>
            <td>
              <button @click="moveRule(idx, -1)" :disabled="idx === 0" title="Monter">↑</button>
              <button @click="moveRule(idx, 1)" :disabled="idx === rules.length - 1" title="Descendre">↓</button>
              <button @click="deleteRule(idx)" title="Supprimer">✕</button>
            </td>
          </tr>
        </tbody>
      </table>

      <div class="grid" style="margin-top: 1rem">
        <h3>Ajouter une règle</h3>
        <input type="text" v-model="newRule.pattern" placeholder="Motif" />
        <select v-model="newRule.match_type">
          <option value="contains">Contient</option>
          <option value="starts_with">Commence par</option>
          <option value="ends_with">Finit par</option>
          <option value="regex">Regex</option>
          <option value="exact">Exact</option>
        </select>
        <input type="text" v-model="newRule.category" placeholder="Catégorie" />
        <input type="text" v-model="newRule.sub_category" placeholder="Sous-catégorie (optionnel)" />
        <button @click="addRule">Ajouter</button>
      </div>

      <button @click="saveRules" :disabled="saving" style="margin-top: 1rem">
        {{ saving ? 'Sauvegarde...' : 'Sauvegarder toutes les règles' }}
      </button>

      <details style="margin-top: 2rem">
        <summary><strong>Suggérer une règle avec l'IA Gemini</strong></summary>
        <div class="grid" style="margin-top: 1rem">
          <h4>Coller les descriptions de transactions</h4>
          <textarea
            v-model="geminiDescriptions"
            placeholder="Une description par ligne"
            rows="5"
          ></textarea>
          <button @click="suggestRule" :disabled="geminiLoading">
            {{ geminiLoading ? 'Analyse en cours...' : 'Suggérer une règle' }}
          </button>
        </div>

        <div v-if="geminiSuggestion" style="margin-top: 1rem; border: 1px solid var(--border); padding: 1rem">
          <h4>Règle proposée</h4>
          <p v-if="geminiSuggestion.explanation" style="font-style: italic; color: var(--text)">
            {{ geminiSuggestion.explanation }}
          </p>
          <label>Motif <input type="text" v-model="geminiSuggestion.pattern" /></label>
          <label>Type de correspondance
            <select v-model="geminiSuggestion.match_type">
              <option value="contains">Contient</option>
              <option value="starts_with">Commence par</option>
              <option value="ends_with">Finit par</option>
              <option value="regex">Regex</option>
              <option value="exact">Exact</option>
            </select>
          </label>
          <label>Catégorie <input type="text" v-model="geminiSuggestion.category" /></label>
          <label>Sous-catégorie <input type="text" v-model="geminiSuggestion.sub_category" /></label>
          <button @click="addGeminiRule">Ajouter cette règle</button>
          <button @click="geminiSuggestion = null">Ignorer</button>
        </div>
      </details>

      <details style="margin-top: 2rem">
        <summary><strong>Template de prompt IA (règles)</strong></summary>
        <div class="grid" style="margin-top: 1rem">
          <textarea
            v-model="promptTemplate"
            placeholder="Template Mustache pour le prompt IA"
            rows="12"
            style="font-family: monospace; font-size: 0.85rem"
          ></textarea>
          <div>
            <button @click="saveTemplate" :disabled="templateSaving">
              {{ templateSaving ? 'Sauvegarde...' : 'Sauvegarder le template' }}
            </button>
            <button @click="resetTemplate">Réinitialiser par défaut</button>
          </div>
        </div>
      </details>

      <details style="margin-top: 2rem">
        <summary><strong>Template de prompt IA (mapping colonnes)</strong></summary>
        <div class="grid" style="margin-top: 1rem">
          <textarea
            v-model="columnMappingTemplate"
            placeholder="Template Mustache pour le prompt de mapping de colonnes"
            rows="12"
            style="font-family: monospace; font-size: 0.85rem"
          ></textarea>
          <div>
            <button @click="saveColumnMappingTemplate" :disabled="columnMappingTemplateSaving">
              {{ columnMappingTemplateSaving ? 'Sauvegarde...' : 'Sauvegarder le template' }}
            </button>
            <button @click="resetColumnMappingTemplate">Réinitialiser par défaut</button>
          </div>
        </div>
      </details>
    </template>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { apiFetch } from '../services/api.js'
import { showError, showSuccess } from '../composables/useModal.js'

const RULES_KEY = 'categorization_rules'
const rules = ref([])
const loading = ref(true)
const saving = ref(false)
const newRule = ref({
  pattern: '',
  match_type: 'contains',
  category: '',
  sub_category: '',
})
const geminiDescriptions = ref('')
const geminiLoading = ref(false)
const geminiSuggestion = ref(null)

const TEMPLATE_KEY = 'gemini_prompt_template'
const promptTemplate = ref('')
const templateSaving = ref(false)

const COLUMN_MAPPING_TEMPLATE_KEY = 'column_mapping_prompt_template'
const columnMappingTemplate = ref('')
const columnMappingTemplateSaving = ref(false)

const defaults = ref({})

onMounted(async () => {
  await loadDefaults()
  await loadRules()
  await loadTemplate()
  await loadColumnMappingTemplate()
})

async function loadDefaults() {
  try {
    const res = await apiFetch('/api/settings?key=defaults')
    if (res.ok) {
      defaults.value = await res.json()
    }
  } catch {
    // Defaults not available, will use fallbacks
  }
}

async function loadRules() {
  loading.value = true
  try {
    const res = await apiFetch(`/api/settings?key=${RULES_KEY}`)
    if (res.ok) {
      const data = await res.json()
      rules.value = Array.isArray(data.value) ? data.value : []
    } else {
      rules.value = []
    }
  } catch {
    rules.value = []
  } finally {
    loading.value = false
  }
}

function addRule() {
  if (!newRule.value.pattern || !newRule.value.category) return
  const maxPriority = rules.value.reduce((max, r) => Math.max(max, r.priority ?? 0), 0)
  rules.value.push({
    id: Date.now().toString(),
    pattern: newRule.value.pattern,
    match_type: newRule.value.match_type,
    category: newRule.value.category,
    sub_category: newRule.value.sub_category || null,
    priority: maxPriority + 1,
    tags: [],
  })
  newRule.value = { pattern: '', match_type: 'contains', category: '', sub_category: '' }
}

function deleteRule(idx) {
  rules.value.splice(idx, 1)
}

function moveRule(idx, direction) {
  const newIdx = idx + direction
  if (newIdx < 0 || newIdx >= rules.value.length) return
  const temp = rules.value[idx]
  rules.value[idx] = rules.value[newIdx]
  rules.value[newIdx] = temp
  rules.value.forEach((r, i) => { r.priority = i + 1 })
}

async function saveRules() {
  saving.value = true
  try {
    const res = await apiFetch('/api/settings', {
      method: 'POST',
      body: JSON.stringify({ key: RULES_KEY, value: rules.value }),
    })
    if (!res.ok) {
      const err = await res.json()
      showError('Erreur: ' + (err.error || 'Erreur inconnue'))
    } else {
      showSuccess('Règles sauvegardées')
    }
  } catch (e) {
    showError('Erreur réseau: ' + e.message)
  } finally {
    saving.value = false
  }
}

async function suggestRule() {
  const descriptions = geminiDescriptions.value.split('\n').filter(l => l.trim())
  if (descriptions.length === 0) return

  geminiLoading.value = true
  geminiSuggestion.value = null
  try {
    const categories = [...new Set(rules.value.map(r => r.category).filter(Boolean))]
    const res = await apiFetch('/api/gemini', {
      method: 'POST',
      body: JSON.stringify({ descriptions, categories }),
    })
    if (!res.ok) {
      const err = await res.json()
      showError('Erreur: ' + (err.error || 'Erreur inconnue'))
    } else {
      geminiSuggestion.value = await res.json()
    }
  } catch (e) {
    showError('Erreur réseau: ' + e.message)
  } finally {
    geminiLoading.value = false
  }
}

function addGeminiRule() {
  if (!geminiSuggestion.value?.pattern || !geminiSuggestion.value?.category) return
  const maxPriority = rules.value.reduce((max, r) => Math.max(max, r.priority ?? 0), 0)
  rules.value.push({
    id: Date.now().toString(),
    pattern: geminiSuggestion.value.pattern,
    match_type: geminiSuggestion.value.match_type || 'contains',
    category: geminiSuggestion.value.category,
    sub_category: geminiSuggestion.value.sub_category || null,
    priority: maxPriority + 1,
    tags: geminiSuggestion.value.tags || [],
  })
  geminiSuggestion.value = null
  geminiDescriptions.value = ''
}

async function loadTemplate() {
  try {
    const res = await apiFetch(`/api/settings?key=${TEMPLATE_KEY}`)
    if (res.ok) {
      const data = await res.json()
      promptTemplate.value = data.value || defaults.value.gemini_prompt_template || ''
    } else {
      promptTemplate.value = defaults.value.gemini_prompt_template || ''
    }
  } catch {
    promptTemplate.value = defaults.value.gemini_prompt_template || ''
  }
}

async function saveTemplate() {
  templateSaving.value = true
  try {
    const res = await apiFetch('/api/settings', {
      method: 'POST',
      body: JSON.stringify({ key: TEMPLATE_KEY, value: promptTemplate.value }),
    })
    if (!res.ok) {
      const err = await res.json()
      showError('Erreur: ' + (err.error || 'Erreur inconnue'))
    } else {
      showSuccess('Template sauvegardé')
    }
  } catch (e) {
    showError('Erreur réseau: ' + e.message)
  } finally {
    templateSaving.value = false
  }
}

function resetTemplate() {
  promptTemplate.value = defaults.value.gemini_prompt_template || ''
}

async function loadColumnMappingTemplate() {
  try {
    const res = await apiFetch(`/api/settings?key=${COLUMN_MAPPING_TEMPLATE_KEY}`)
    if (res.ok) {
      const data = await res.json()
      columnMappingTemplate.value = data.value || defaults.value.column_mapping_prompt_template || ''
    } else {
      columnMappingTemplate.value = defaults.value.column_mapping_prompt_template || ''
    }
  } catch {
    columnMappingTemplate.value = defaults.value.column_mapping_prompt_template || ''
  }
}

async function saveColumnMappingTemplate() {
  columnMappingTemplateSaving.value = true
  try {
    const res = await apiFetch('/api/settings', {
      method: 'POST',
      body: JSON.stringify({ key: COLUMN_MAPPING_TEMPLATE_KEY, value: columnMappingTemplate.value }),
    })
    if (!res.ok) {
      const err = await res.json()
      showError('Erreur: ' + (err.error || 'Erreur inconnue'))
    } else {
      showSuccess('Template sauvegardé')
    }
  } catch (e) {
    showError('Erreur réseau: ' + e.message)
  } finally {
    columnMappingTemplateSaving.value = false
  }
}

function resetColumnMappingTemplate() {
  columnMappingTemplate.value = defaults.value.column_mapping_prompt_template || ''
}
</script>
