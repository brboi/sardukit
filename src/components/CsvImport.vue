<template>
  <div>
    <h2>Importer CSV</h2>

    <p v-if="sourcesError" class="text-warning mb-2">
      Impossible de charger les sources bancaires.
    </p>

    <div class="import-grid">
      <label>
        Source bancaire
        <input
          type="text"
          v-model="bankSource"
          list="bank-sources"
          placeholder="ex. BNP, Belfius"
        />
        <datalist id="bank-sources">
          <option v-for="src in bankSources" :key="src" :value="src">{{ src }}</option>
        </datalist>
      </label>

      <label>
        Lignes d'en-tête à ignorer
        <input type="number" v-model.number="skipLines" min="0" max="20" />
      </label>

      <label>
        Fichier CSV
        <input type="file" accept=".csv" @change="onFileSelect" />
      </label>
    </div>

    <details v-if="parsedHeaders.length" class="mt-2">
      <summary><strong>Auto-matcher les colonnes avec l'IA</strong></summary>
      <div class="mt-1">
        <button @click="aiMatchColumns" :disabled="aiMatching">
          {{ aiMatching ? 'Analyse en cours...' : 'Matcher avec l\'IA' }}
        </button>
        <span v-if="aiMatchResult" class="ml-2 text-sm text-accent">
          {{ aiMatchResult }}
        </span>
      </div>
    </details>

    <div v-if="parsedHeaders.length" class="mt-2">
      <h3>Mapping des colonnes (auto-détecté)</h3>
      <div class="mapping-grid">
        <div
          v-for="h in parsedHeaders"
          :key="h"
          class="mapping-card"
          :class="{ 'auto-detected': columnMapping[h] }"
        >
          <div class="csv-header">{{ h }}</div>
          <select v-model="columnMapping[h]">
            <option value="">-- ignorer --</option>
            <option v-for="(label, dbField) in COLUMN_LABELS" :key="dbField" :value="dbField">
              {{ label }}
            </option>
          </select>
        </div>
      </div>

      <p v-if="preview.length" class="text-sm text-accent mt-1">
        {{ preview.length }} lignes prêtes à l'import
      </p>
    </div>

    <div v-if="preview.length" class="mt-3">
      <h3>Aperçu ({{ preview.length }} lignes)</h3>
      <div class="overflow-auto">
        <table>
          <thead>
            <tr>
              <th v-for="col in previewColumns" :key="col">{{ colLabel(col) }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(row, i) in preview.slice(0, 20)" :key="i">
              <td v-for="col in previewColumns" :key="col">{{ row[col] || '-' }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p v-if="preview.length > 20">... et {{ preview.length - 20 }} de plus</p>

      <div class="flex gap-1 mt-2">
        <button @click="saveTransactions" :disabled="saving || !bankSource">
          {{ saving ? 'Sauvegarde...' : 'Tout sauvegarder' }}
        </button>
        <button @click="reset">Retour</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, computed, onMounted } from 'vue'
import { apiFetch } from '../services/api.js'
import { parseCSV, detectColumns, mapRows, detectFooterLines } from '../services/csvParser.js'
import { showError, showSuccess } from '../composables/useModal.js'
import { COLUMN_LABELS } from '../services/columnLabels.js'

const bankSources = ref([])
const sourcesError = ref(false)
const bankSource = ref('')
const skipLines = ref(0)
const skipFooter = ref(0)
const rawText = ref('')
const parsedHeaders = ref([])
const parsedRows = ref([])
const columnMapping = ref({})
const preview = ref([])
const previewColumns = computed(() => {
  const cols = new Set()
  preview.value.forEach(row => Object.keys(row).forEach(k => cols.add(k)))
  return [...cols]
})
const saving = ref(false)
const aiMatching = ref(false)
const aiMatchResult = ref('')

function colLabel(col) {
  return COLUMN_LABELS[col] || col
}

onMounted(async () => {
  try {
    const res = await apiFetch('/api/transactions?sources_only=1')
    if (res.ok) {
      bankSources.value = await res.json()
      sourcesError.value = false
    } else {
      sourcesError.value = true
    }
  } catch {
    sourcesError.value = true
  }
})

watch(skipLines, () => {
  if (rawText.value) {
    reparse()
  }
})

watch(columnMapping, () => {
  if (parsedRows.value.length > 0) {
    updatePreview()
  }
}, { deep: true })

function onFileSelect(event) {
  const file = event.target.files[0]
  if (!file) return
  if (!file.name.endsWith('.csv')) {
    showError('Veuillez sélectionner un fichier CSV')
    event.target.value = ''
    return
  }
  const reader = new FileReader()
  reader.onload = (e) => {
    rawText.value = e.target.result
    reparse()
  }
  reader.onerror = () => {
    showError('Impossible de lire le fichier')
  }
  reader.readAsText(file)
}

function reparse() {
  const result = parseCSV(rawText.value, skipLines.value, skipFooter.value)
  parsedHeaders.value = result.headers
  parsedRows.value = result.rows

  const autoMapping = detectColumns(result.headers)
  const existingMapping = { ...columnMapping.value }

  columnMapping.value = {}
  result.headers.forEach((h, idx) => {
    if (existingMapping[h]) {
      columnMapping.value[h] = existingMapping[h]
    } else {
      const dbCol = Object.keys(autoMapping).find(k => autoMapping[k] === idx)
      columnMapping.value[h] = dbCol || ''
    }
  })

  if (skipFooter.value === 0) {
    const detected = detectFooterLines(rawText.value, skipLines.value)
    if (detected > 0) {
      skipFooter.value = detected
      reparse()
      return
    }
  }

  updatePreview()
}

function updatePreview() {
  const colIdxMap = {}
  parsedHeaders.value.forEach((h, idx) => {
    if (columnMapping.value[h]) {
      colIdxMap[columnMapping.value[h]] = idx
    }
  })
  preview.value = mapRows(parsedRows.value, colIdxMap)
}

async function aiMatchColumns() {
  if (!parsedHeaders.value.length) return
  aiMatching.value = true
  aiMatchResult.value = ''
  try {
    const res = await apiFetch('/api/column-mapping', {
      method: 'POST',
      body: JSON.stringify({ headers: parsedHeaders.value }),
    })
    if (!res.ok) {
      const err = await res.json()
      aiMatchResult.value = 'Erreur: ' + (err.error || 'Inconnue')
    } else {
      const data = await res.json()
      const mapping = data.mapping || {}
      const newMapping = { ...columnMapping.value }
      parsedHeaders.value.forEach(h => {
        if (mapping[h] && !newMapping[h]) {
          newMapping[h] = mapping[h]
        }
      })
      columnMapping.value = newMapping
      const matched = Object.keys(mapping).filter(k => mapping[k]).length
      aiMatchResult.value = `${matched} colonne(s) mappée(s) par l'IA`
    }
  } catch (e) {
    aiMatchResult.value = 'Erreur réseau: ' + e.message
  } finally {
    aiMatching.value = false
  }
}

async function saveTransactions() {
  if (!bankSource.value) return
  saving.value = true
  try {
    const res = await apiFetch('/api/transactions', {
      method: 'POST',
      body: JSON.stringify({
        bank_source: bankSource.value,
        transactions: preview.value,
      }),
    })
    if (!res.ok) {
      const err = await res.json()
      showError('Erreur: ' + (err.error || 'Erreur inconnue'))
    } else {
      const data = await res.json()
      showSuccess(data.saved + ' transaction(s) sauvegardée(s)')
    }
  } catch (e) {
    showError('Erreur réseau: ' + e.message)
  } finally {
    saving.value = false
  }
}

function reset() {
  parsedHeaders.value = []
  parsedRows.value = []
  rawText.value = ''
  preview.value = []
  columnMapping.value = {}
  aiMatchResult.value = ''
  aiMatching.value = false
  skipFooter.value = 0
}
</script>
