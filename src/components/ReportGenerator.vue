<template>
  <div>
    <h2>Rapports</h2>

    <!-- Report list -->
    <div v-if="!currentReport">
      <div class="flex gap-2 mb-2">
        <button @click="showCreateForm = !showCreateForm">
          {{ showCreateForm ? 'Masquer le formulaire' : 'Créer un nouveau rapport' }}
        </button>
      </div>

      <div v-if="showCreateForm" class="bordered-card mb-2">
        <h3>Nouveau rapport</h3>
        <div class="form-grid">
          <label>Nom <input type="text" v-model="form.name" placeholder="Nom du rapport" /></label>
          <label>Année
            <select v-model.number="form.year">
              <option v-for="y in availableYears" :key="y" :value="y">{{ y }}</option>
            </select>
          </label>
          <label>Solde initial <input type="number" step="0.01" v-model.number="form.initial_balance" /></label>
        </div>
        <button @click="createReport" :disabled="creating || !form.year">
          {{ creating ? 'Création...' : 'Créer le rapport' }}
        </button>
      </div>

      <div v-if="reports.length">
        <h3>Rapports existants</h3>
        <table>
          <thead>
            <tr><th>Nom</th><th>Année</th><th>Créé le</th><th></th></tr>
          </thead>
          <tbody>
            <tr v-for="r in reports" :key="r.id">
              <td>{{ r.name }}</td>
              <td>{{ r.year }}</td>
              <td>{{ formatDate(r.created_at) }}</td>
              <td><button @click="openReport(r)">Ouvrir</button></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Report detail -->
    <template v-else>
      <div class="flex gap-2 mb-2">
        <h3 style="margin:0">{{ currentReport.name }}</h3>
        <span class="text-muted">Année : {{ currentReport.year }}</span>
        <button @click="currentReport = null; breakdown = []; reportTransactions = []">← Liste</button>
      </div>

      <div class="bordered-card mb-2">
        <div class="form-grid">
          <label>Solde initial
            <input type="number" step="0.01" v-model.number="editForm.initial_balance" />
          </label>
          <div class="flex gap-1">
            <button @click="saveBalance">Sauvegarder</button>
            <button @click="generateReport" :disabled="generating">
              {{ generating ? 'Scan...' : 'Re-scanner' }}
            </button>
          </div>
        </div>
      </div>

      <div class="flex gap-2 mb-2">
        <button @click="generateReport" :disabled="generating">
          {{ generating ? 'Génération...' : 'Générer / Re-scanner' }}
        </button>
        <button @click="exportReport" :disabled="exporting">
          {{ exporting ? 'Export...' : 'Exporter XLSX' }}
        </button>
      </div>

      <!-- Breakdown -->
      <div v-if="breakdown.length" class="mb-3">
        <h3>Résumé du bilan</h3>
        <table>
          <thead>
            <tr><th>Catégorie</th><th>Sous-catégorie</th><th>Nombre</th><th>Total</th></tr>
          </thead>
          <tbody>
            <tr v-for="row in breakdown" :key="row.category + row.sub_category">
              <td>{{ row.category }}</td>
              <td>{{ row.sub_category || '-' }}</td>
              <td>{{ row.count }}</td>
              <td>{{ formatCurrency(row.total) }}</td>
            </tr>
          </tbody>
          <tfoot>
            <tr>
              <td colspan="3"><strong>Solde initial</strong></td>
              <td><strong>{{ formatCurrency(currentReport.initial_balance) }}</strong></td>
            </tr>
            <tr>
              <td colspan="3"><strong>Somme des transactions</strong></td>
              <td><strong>{{ formatCurrency(sumTransactions) }}</strong></td>
            </tr>
            <tr :class="{ 'text-error': !isValid }">
              <td colspan="3"><strong>Solde final attendu</strong></td>
              <td><strong>{{ formatCurrency(currentReport.initial_balance + sumTransactions) }}</strong></td>
            </tr>
            <tr>
              <td colspan="3"><strong>Solde final déclaré</strong></td>
              <td><strong>{{ formatCurrency(currentReport.final_balance) }}</strong></td>
            </tr>
          </tfoot>
        </table>
        <p v-if="!isValid" style="color: var(--pico-color-red)">
          Attention : les soldes ne correspondent pas !
        </p>
      </div>

      <!-- Transaction table -->
      <div v-if="reportTransactions.length" class="mb-3">
        <div class="flex gap-2 mb-1">
          <button @click="applyRulesToSelected" :disabled="selectedIds.size === 0 || applyingRules">
            Appliquer règles ({{ selectedIds.size }})
          </button>
          <button @click="prepareGroup" :disabled="selectedIds.size === 0">
            Préparer un groupe pour l'IA ({{ selectedIds.size }})
          </button>
        </div>

        <TransactionTable
          :transactions="paginatedTransactions"
          :show-checkbox="true"
          :grouped-ids="groupedIds"
          :selected-ids="selectedIds"
          :all-group-names="allGroupNames"
          @select="toggleSelect"
        />

        <!-- Pagination -->
        <div class="flex gap-2 mt-1" v-if="totalPages > 1">
          <button @click="page--" :disabled="page === 1">← Précédent</button>
          <span>Page {{ page }} / {{ totalPages }}</span>
          <button @click="page++" :disabled="page === totalPages">Suivant →</button>
        </div>
      </div>

      <!-- AI Groups -->
      <div v-if="aiGroups.length" class="mb-3">
        <div class="flex gap-2 mb-1">
          <button @click="sendGroupsToAI" :disabled="aiLoading || aiGroups.length === 0">
            {{ aiLoading ? 'Analyse en cours...' : `Envoyer ${aiGroups.length} groupe(s) à l'IA` }}
          </button>
        </div>

        <details
          v-for="(group, gi) in aiGroups"
          :key="group.id"
          :open="gi === aiGroups.length - 1"
        >
          <summary>
            <strong>{{ group.name }}</strong> ({{ group.transactions.length }} transaction{{ group.transactions.length > 1 ? 's' : '' }})
            <button @click.prevent="deleteGroup(gi)" title="Supprimer le groupe" style="margin-left:0.5rem">🗑</button>
          </summary>
          <div class="mt-1">
            <table>
              <thead>
                <tr><th>Date</th><th>Description</th><th>Montant</th><th></th></tr>
              </thead>
              <tbody>
                <tr v-for="(t, ti) in group.transactions" :key="t.transaction_id">
                  <td>{{ t.date || '-' }}</td>
                  <td>{{ t.communication || t.details || '-' }}</td>
                  <td>{{ formatCurrency(t.amount) }}</td>
                  <td><button @click="removeFromGroup(gi, ti)" title="Retirer">✕</button></td>
                </tr>
              </tbody>
            </table>
            <div class="grid mt-1">
              <label>Catégorie suggérée <input type="text" v-model="group.suggested_category" /></label>
              <label>Sous-catégorie suggérée <input type="text" v-model="group.suggested_sub_category" /></label>
              <label>Tags suggérés <input type="text" v-model="group.suggested_tags_text" placeholder="tag1, tag2" /></label>
            </div>
          </div>
        </details>
      </div>

      <!-- AI Suggestions -->
      <div v-if="aiSuggestions.length" class="bordered-card mb-3">
        <h3>Règles suggérées par l'IA</h3>
        <div v-for="(s, si) in aiSuggestions" :key="si" class="bordered-card mt-1">
          <p class="text-muted italic">{{ s.explanation }}</p>
          <div v-for="(c, ci) in s.criteria" :key="ci" class="flex gap-1 mb-1">
            <select v-model="c.column">
              <option value="communication">Communication</option>
              <option value="details">Détails</option>
              <option value="counterparty_name">Nom contrepartie</option>
              <option value="counterparty_account">Compte contrepartie</option>
              <option value="transaction_type">Type transaction</option>
              <option value="counterparty_street">Rue</option>
              <option value="counterparty_city">Ville</option>
              <option value="status">Statut</option>
              <option value="rejection_reason">Motif refus</option>
              <option value="bic">BIC</option>
              <option value="country_code">Code pays</option>
              <option value="sequence_number">Nº séquence</option>
              <option value="extract_number">Nº extrait</option>
              <option value="any">Toutes</option>
            </select>
            <select v-model="c.match_type">
              <option value="contains">Contient</option>
              <option value="starts_with">Commence par</option>
              <option value="ends_with">Finit par</option>
              <option value="regex">Regex</option>
              <option value="exact">Exact</option>
            </select>
            <input type="text" v-model="c.pattern" style="flex:1" />
          </div>
          <div class="form-grid">
            <label>Mode
              <select v-model="s.criteria_mode">
                <option value="AND">AND</option>
                <option value="OR">OR</option>
              </select>
            </label>
            <label>Catégorie <input type="text" v-model="s.category" /></label>
            <label>Sous-catégorie <input type="text" v-model="s.sub_category" /></label>
          </div>
          <div class="flex gap-1 mt-1">
            <button @click="acceptSuggestion(si)">Accepter</button>
            <button @click="rejectSuggestion(si)">Rejeter</button>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import * as XLSX from 'xlsx'
import { apiFetch } from '../services/api.js'
import { showError, showSuccess } from '../composables/useModal.js'
import TransactionTable from './TransactionTable.vue'

const reports = ref([])
const currentReport = ref(null)
const showCreateForm = ref(false)
const creating = ref(false)
const generating = ref(false)
const exporting = ref(false)
const breakdown = ref([])
const reportTransactions = ref([])
const totalTransactions = ref(0)
const page = ref(1)
const pageSize = ref(25)
const selectedIds = ref(new Set())
const applyingRules = ref(false)
const availableYears = ref([])
const aiGroups = ref([])
const aiLoading = ref(false)
const aiSuggestions = ref([])

const groupedIds = computed(() => {
  const ids = new Set()
  for (const g of aiGroups.value) {
    for (const t of g.transactions) {
      ids.add(t.transaction_id)
    }
  }
  return ids
})

const allGroupNames = computed(() => {
  const map = new Map()
  for (const g of aiGroups.value) {
    for (const t of g.transactions) {
      map.set(t.transaction_id, g.name)
    }
  }
  return map
})

const form = ref({
  name: '',
  year: null,
  initial_balance: 0,
})

const editForm = ref({
  initial_balance: 0,
})

const totalPages = computed(() => Math.ceil(totalTransactions.value / pageSize.value))
const paginatedTransactions = computed(() => {
  const start = (page.value - 1) * pageSize.value
  return reportTransactions.value.slice(start, start + pageSize.value)
})

const sumTransactions = computed(() => {
  return breakdown.value.reduce((sum, row) => sum + parseFloat(row.total || 0), 0)
})

const isValid = computed(() => {
  if (!currentReport.value) return true
  const expected = parseFloat(currentReport.value.initial_balance) + sumTransactions.value
  const reported = parseFloat(currentReport.value.final_balance)
  return Math.abs(expected - reported) < 0.01
})

const allSelected = computed(() => {
  return reportTransactions.value.length > 0 && reportTransactions.value.every(t => selectedIds.value.has(t.transaction_id))
})

onMounted(async () => {
  await loadReports()
  await loadAvailableYears()
  await loadBatchSize()
})

async function loadReports() {
  try {
    const res = await apiFetch('/api/reports')
    if (res.ok) {
      reports.value = await res.json()
    }
  } catch {
    // ignore
  }
}

async function loadAvailableYears() {
  try {
    const res = await apiFetch('/api/transactions?available_years=1')
    if (res.ok) {
      availableYears.value = await res.json()
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
      pageSize.value = data.value ?? 25
    }
  } catch {
    // use default
  }
}

function formatDate(dateStr) {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleDateString('fr-FR')
}

function formatCurrency(val) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(val || 0)
}

async function createReport() {
  if (!form.value.year) return
  creating.value = true
  try {
    const res = await apiFetch('/api/reports', {
      method: 'POST',
      body: JSON.stringify(form.value),
    })
    if (!res.ok) {
      const err = await res.json()
      showError('Erreur: ' + (err.error || 'Erreur inconnue'))
    } else {
      const data = await res.json()
      showSuccess('Rapport créé')
      await loadReports()
      showCreateForm.value = false
      form.value = { name: '', year: availableYears.value[0] || new Date().getFullYear(), initial_balance: 0 }
    }
  } catch (e) {
    showError('Erreur réseau: ' + e.message)
  } finally {
    creating.value = false
  }
}

async function saveBalance() {
  if (!currentReport.value) return
  try {
    const res = await apiFetch(`/api/reports/${currentReport.value.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ initial_balance: editForm.value.initial_balance }),
    })
    if (!res.ok) {
      const err = await res.json()
      showError('Erreur: ' + (err.error || 'Erreur inconnue'))
    } else {
      currentReport.value.initial_balance = editForm.value.initial_balance
      showSuccess('Solde initial mis à jour')
    }
  } catch (e) {
    showError('Erreur réseau: ' + e.message)
  }
}

async function openReport(report) {
  currentReport.value = report
  breakdown.value = []
  reportTransactions.value = []
  selectedIds.value = new Set()
  aiGroups.value = []
  aiSuggestions.value = []
  page.value = 1
  editForm.value.initial_balance = currentReport.value.initial_balance
  await loadBreakdown()
}

async function generateReport() {
  if (!currentReport.value) return
  generating.value = true
  try {
    const res = await apiFetch(`/api/reports/generate?id=${currentReport.value.id}`, {
      method: 'POST',
    })
    if (!res.ok) {
      const err = await res.json()
      showError('Erreur: ' + (err.error || 'Erreur inconnue'))
    } else {
      const result = await res.json()
      showSuccess(result.transactions_processed + ' transaction(s) traitée(s)')
      currentReport.value.final_balance = result.final_balance
      await loadBreakdown()
    }
  } catch (e) {
    showError('Erreur réseau: ' + e.message)
  } finally {
    generating.value = false
  }
}

async function loadBreakdown() {
  try {
    const res = await apiFetch(`/api/reports/generate?id=${currentReport.value.id}&page=${page.value}&page_size=${pageSize.value}`)
    if (res.ok) {
      const data = await res.json()
      currentReport.value = data.report
      breakdown.value = data.breakdown
      reportTransactions.value = data.transactions || []
      totalTransactions.value = data.total_count || 0
    }
  } catch (e) {
    console.error('Failed to load breakdown:', e)
  }
}

function toggleSelect(id) {
  if (selectedIds.value.has(id)) {
    selectedIds.value.delete(id)
  } else {
    selectedIds.value.add(id)
  }
}

function toggleAll() {
  if (allSelected.value) {
    selectedIds.value = new Set()
  } else {
    selectedIds.value = new Set(reportTransactions.value.map(t => t.transaction_id))
  }
}

async function applyRulesToSelected() {
  if (selectedIds.value.size === 0) return
  applyingRules.value = true
  try {
    const res = await apiFetch('/api/reports/apply-rules', {
      method: 'POST',
      body: JSON.stringify({
        report_id: currentReport.value.id,
        transaction_ids: [...selectedIds.value],
      }),
    })
    if (!res.ok) {
      const err = await res.json()
      showError('Erreur: ' + (err.error || 'Erreur inconnue'))
    } else {
      const data = await res.json()
      showSuccess(data.updated + ' transaction(s) mise(s) à jour')
      selectedIds.value = new Set()
      await loadBreakdown()
    }
  } catch (e) {
    showError('Erreur réseau: ' + e.message)
  } finally {
    applyingRules.value = false
  }
}

function prepareGroup() {
  if (selectedIds.value.size === 0) return
  const transactions = reportTransactions.value
    .filter(t => selectedIds.value.has(t.transaction_id))
    .map(t => ({
      transaction_id: t.transaction_id,
      date: t.execution_date || '',
      description: t.communication || t.details || '',
      amount: t.amount,
    }))
  aiGroups.value.push({
    id: 'group-' + Date.now(),
    name: 'Groupe ' + (aiGroups.value.length + 1),
    transactions,
    suggested_category: '',
    suggested_sub_category: '',
    suggested_tags: [],
    suggested_tags_text: '',
  })
  selectedIds.value = new Set()
}

function removeFromGroup(groupIdx, transactionIdx) {
  aiGroups.value[groupIdx].transactions.splice(transactionIdx, 1)
}

function deleteGroup(groupIdx) {
  aiGroups.value.splice(groupIdx, 1)
}

async function sendGroupsToAI() {
  if (aiGroups.value.length === 0) return
  aiLoading.value = true
  aiSuggestions.value = []
  try {
    const payload = aiGroups.value.map(g => ({
      ...g,
      suggested_tags: g.suggested_tags_text
        ? g.suggested_tags_text.split(',').map(t => t.trim()).filter(Boolean)
        : [],
    }))
    const res = await apiFetch('/api/gemini?suggest_rules=1', {
      method: 'POST',
      body: JSON.stringify({ groups: payload }),
    })
    if (!res.ok) {
      const err = await res.json()
      showError('Erreur: ' + (err.error || 'Erreur inconnue'))
    } else {
      const data = await res.json()
      aiSuggestions.value = data.rules || []
    }
  } catch (e) {
    showError('Erreur réseau: ' + e.message)
  } finally {
    aiLoading.value = false
  }
}

function acceptSuggestion(idx) {
  const suggestion = aiSuggestions.value[idx]
  if (!suggestion) return
  const existing = JSON.parse(localStorage.getItem('pending_rules') || '[]')
  existing.push(suggestion)
  localStorage.setItem('pending_rules', JSON.stringify(existing))
  aiSuggestions.value.splice(idx, 1)
  showSuccess('Règle ajoutée aux règles en attente')
}

function rejectSuggestion(idx) {
  aiSuggestions.value.splice(idx, 1)
}

async function exportReport() {
  if (!currentReport.value) return
  exporting.value = true
  try {
    const res = await apiFetch(`/api/reports/export?id=${currentReport.value.id}`)
    if (!res.ok) {
      const err = await res.json()
      showError('Erreur: ' + (err.error || 'Erreur inconnue'))
      return
    }
    const data = await res.json()

    const wb = XLSX.utils.book_new()

    // Summary sheet
    const summaryData = data.breakdown.map(row => ({
      Catégorie: row.category,
      'Sous-catégorie': row.sub_category || '-',
      Nombre: row.count,
      Total: parseFloat(row.total),
    }))
    summaryData.push({})
    summaryData.push({ Catégorie: 'Solde initial', Total: parseFloat(currentReport.value.initial_balance) })
    summaryData.push({ Catégorie: 'Somme transactions', Total: sumTransactions.value })
    summaryData.push({ Catégorie: 'Solde final attendu', Total: parseFloat(currentReport.value.initial_balance) + sumTransactions.value })
    summaryData.push({ Catégorie: 'Solde final déclaré', Total: parseFloat(currentReport.value.final_balance) })
    const wsSummary = XLSX.utils.json_to_sheet(summaryData)
    XLSX.utils.book_append_sheet(wb, wsSummary, 'summary')

    // Data sheet
    const dataRows = data.transactions.map(t => ({
      Date: t.date || '',
      Description: t.communication || t.details || '',
      Montant: parseFloat(t.amount),
      Catégorie: t.category || '',
      'Sous-catégorie': t.sub_category || '',
      Tags: (t.tags || []).join(', '),
      'Rule ID': t.rule_id || '',
    }))
    const wsData = XLSX.utils.json_to_sheet(dataRows)
    XLSX.utils.book_append_sheet(wb, wsData, 'data')

    XLSX.writeFile(wb, `${currentReport.value.name || 'rapport'}_${currentReport.value.year}.xlsx`)
    showSuccess('Export XLSX téléchargé')
  } catch (e) {
    showError('Erreur réseau: ' + e.message)
  } finally {
    exporting.value = false
  }
}
</script>
