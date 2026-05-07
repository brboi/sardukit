<template>
  <div>
    <h2>Importer CSV</h2>

    <p v-if="sourcesError" class="text-warning mb-2">
      Impossible de charger les sources bancaires.
    </p>

    <!-- Top inputs: 3-column grid -->
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

    <!-- AI Column Mapping -->
    <details v-if="parsedHeaders.length" style="margin-top: 1rem">
      <summary><strong>Auto-matcher les colonnes avec l'IA</strong></summary>
      <div style="margin-top: 0.5rem">
        <button @click="aiMatchColumns" :disabled="aiMatching">
          {{ aiMatching ? 'Analyse en cours...' : 'Matcher avec l\'IA' }}
        </button>
        <span v-if="aiMatchResult" style="margin-left: 1rem; font-size: 0.85rem; color: var(--accent)">
          {{ aiMatchResult }}
        </span>
      </div>
    </details>

    <!-- Column Mapping -->
    <div v-if="parsedHeaders.length" style="margin-top: 1rem">
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
            <option value="sequence_number">N° de séquence</option>
            <option value="extract_number">N° d'extrait</option>
            <option value="account_number">N° de compte</option>
            <option value="execution_date">Date d'exécution</option>
            <option value="accounting_date">Date de comptabilisation</option>
            <option value="value_date">Date valeur</option>
            <option value="amount">Montant</option>
            <option value="currency">Devise</option>
            <option value="transaction_type">Type de transaction</option>
            <option value="counterparty_account">Compte contrepartie</option>
            <option value="counterparty_name">Nom contrepartie</option>
            <option value="counterparty_street">Rue contrepartie</option>
            <option value="counterparty_city">Ville contrepartie</option>
            <option value="communication">Communication</option>
            <option value="details">Détails</option>
            <option value="status">Statut</option>
            <option value="rejection_reason">Motif du refus</option>
            <option value="bic">BIC</option>
            <option value="country_code">Code pays</option>
          </select>
        </div>
      </div>

      <!-- Status indicator -->
      <p v-if="preview.length" style="margin-top: 0.5rem; font-size: 0.85rem; color: var(--accent)">
        {{ preview.length }} lignes prêtes à l'import
      </p>
    </div>

    <!-- Preview table (reactive, shown when rows available) -->
    <div v-if="preview.length" style="margin-top: 1.5rem">
      <h3>Aperçu ({{ preview.length }} lignes)</h3>
      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th>Montant</th>
            <th>Contrepartie</th>
            <th>Détails</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(row, i) in preview.slice(0, 20)" :key="i">
            <td>{{ row.execution_date || row.accounting_date || row.value_date || '-' }}</td>
            <td>{{ row.amount }}</td>
            <td>{{ row.counterparty_name || '-' }}</td>
            <td>{{ (row.details || '').slice(0, 80) }}</td>
          </tr>
        </tbody>
      </table>
      <p v-if="preview.length > 20">... et {{ preview.length - 20 }} de plus</p>

      <div style="margin-top: 1rem; display: flex; gap: 0.5rem">
        <button @click="saveTransactions" :disabled="saving || !bankSource">
          {{ saving ? 'Sauvegarde...' : 'Tout sauvegarder' }}
        </button>
        <button @click="reset">Retour</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue'
import { apiFetch } from '../services/api.js'
import { parseCSV, detectColumns, mapRows } from '../services/csvParser.js'
import { showError, showSuccess } from '../composables/useModal.js'

const bankSource = ref('')
const bankSources = ref([])
const sourcesError = ref(false)
const skipLines = ref(0)
const parsedHeaders = ref([])
const parsedRows = ref([])
const rawText = ref('')
const columnMapping = ref({})
const preview = ref([])
const saving = ref(false)
const aiMatching = ref(false)
const aiMatchResult = ref('')

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

// Reactive preview: update when columnMapping changes
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
  const result = parseCSV(rawText.value, skipLines.value)
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
      // Apply AI mapping, keeping existing user selections — batch update to avoid multiple watch triggers
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
}
</script>
