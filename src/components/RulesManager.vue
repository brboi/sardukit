<template>
  <div>
    <h2>Gestionnaire de règles</h2>

    <div v-if="loading">Chargement des règles...</div>

    <template v-else>
      <table>
        <thead>
          <tr>
            <th>Priorité</th>
            <th>Critères</th>
            <th>Mode</th>
            <th>Catégorie</th>
            <th>Sous-catégorie</th>
            <th>Tags</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(rule, idx) in rules" :key="rule.id">
            <td>
              <input type="number" v-model.number="rule.priority" class="w-60" />
            </td>
            <td>
              <div v-for="(c, ci) in rule.criteria" :key="ci" class="flex gap-1 mb-1">
                <select v-model="c.column" class="text-sm">
                  <option value="communication">Communication</option>
                  <option value="description">Description</option>
                  <option value="details">Détails</option>
                  <option value="any">Toutes</option>
                </select>
                <select v-model="c.match_type" class="text-sm">
                  <option value="contains">Contient</option>
                  <option value="starts_with">Commence par</option>
                  <option value="ends_with">Finit par</option>
                  <option value="regex">Regex</option>
                  <option value="exact">Exact</option>
                </select>
                <input type="text" v-model="c.pattern" class="text-sm" style="flex:1" />
                <button @click="removeCriterion(idx, ci)" title="Supprimer critère">✕</button>
              </div>
              <button @click="addCriterion(idx)" class="text-sm text-accent">+ Critère</button>
            </td>
            <td>
              <select v-model="rule.criteria_mode">
                <option value="AND">AND</option>
                <option value="OR">OR</option>
              </select>
            </td>
            <td><input type="text" v-model="rule.category" /></td>
            <td><input type="text" v-model="rule.sub_category" /></td>
            <td><input type="text" v-model="rule.tags_text" placeholder="tag1, tag2" /></td>
            <td>
              <button @click="moveRule(idx, -1)" :disabled="idx === 0" title="Monter">↑</button>
              <button @click="moveRule(idx, 1)" :disabled="idx === rules.length - 1" title="Descendre">↓</button>
              <button @click="deleteRule(idx)" title="Supprimer">✕</button>
            </td>
          </tr>
        </tbody>
      </table>

      <div class="form-grid mt-2">
        <h3>Ajouter une règle</h3>
        <div class="flex gap-1 mb-1">
          <select v-model="newRule.criteria[0].column">
            <option value="communication">Communication</option>
            <option value="description">Description</option>
            <option value="details">Détails</option>
            <option value="any">Toutes</option>
          </select>
          <select v-model="newRule.criteria[0].match_type">
            <option value="contains">Contient</option>
            <option value="starts_with">Commence par</option>
            <option value="ends_with">Finit par</option>
            <option value="regex">Regex</option>
            <option value="exact">Exact</option>
          </select>
          <input type="text" v-model="newRule.criteria[0].pattern" placeholder="Motif" style="flex:1" />
        </div>
        <select v-model="newRule.criteria_mode">
          <option value="AND">AND</option>
          <option value="OR">OR</option>
        </select>
        <input type="text" v-model="newRule.category" placeholder="Catégorie" />
        <input type="text" v-model="newRule.sub_category" placeholder="Sous-catégorie (optionnel)" />
        <input type="text" v-model="newRule.tags_text" placeholder="Tags (séparés par virgule)" />
        <button @click="addRule">Ajouter</button>
      </div>

      <button @click="saveRules" :disabled="saving" class="mt-2">
        {{ saving ? 'Sauvegarde...' : 'Sauvegarder toutes les règles' }}
      </button>
    </template>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { apiFetch } from '../services/api.js'
import { showError, showSuccess } from '../composables/useModal.js'

const rules = ref([])
const loading = ref(true)
const saving = ref(false)
const newRule = ref({
  criteria: [{ column: 'communication', match_type: 'contains', pattern: '' }],
  criteria_mode: 'AND',
  category: '',
  sub_category: '',
  tags_text: '',
})

onMounted(async () => {
  await loadRules()
})

async function loadRules() {
  loading.value = true
  try {
    const res = await apiFetch('/api/rules')
    if (res.ok) {
      const data = await res.json()
      rules.value = (Array.isArray(data) ? data : []).map(r => ({
        ...r,
        tags_text: (r.tags || []).join(', '),
      }))
    } else {
      rules.value = []
    }
  } catch {
    rules.value = []
  } finally {
    loading.value = false
  }
}

function addCriterion(idx) {
  rules.value[idx].criteria.push({ column: 'communication', match_type: 'contains', pattern: '' })
}

function removeCriterion(ruleIdx, criterionIdx) {
  rules.value[ruleIdx].criteria.splice(criterionIdx, 1)
}

function addRule() {
  if (!newRule.value.criteria.some(c => c.pattern) || !newRule.value.category) return
  const maxPriority = rules.value.reduce((max, r) => Math.max(max, r.priority ?? 0), 0)
  const tags = newRule.value.tags_text
    .split(',')
    .map(t => t.trim())
    .filter(Boolean)
  rules.value.push({
    id: Date.now().toString(),
    criteria: newRule.value.criteria.filter(c => c.pattern).map(c => ({ ...c })),
    criteria_mode: newRule.value.criteria_mode,
    category: newRule.value.category,
    sub_category: newRule.value.sub_category || null,
    priority: maxPriority + 1,
    tags,
    tags_text: newRule.value.tags_text,
  })
  newRule.value = {
    criteria: [{ column: 'communication', match_type: 'contains', pattern: '' }],
    criteria_mode: 'AND',
    category: '',
    sub_category: '',
    tags_text: '',
  }
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
    for (const rule of rules.value) {
      const tags = rule.tags_text
        ? rule.tags_text.split(',').map(t => t.trim()).filter(Boolean)
        : (rule.tags || [])
      const body = {
        id: rule.id,
        priority: rule.priority ?? 0,
        criteria: rule.criteria,
        criteria_mode: rule.criteria_mode || 'AND',
        category: rule.category,
        sub_category: rule.sub_category || null,
        tags,
      }
      const res = await apiFetch('/api/rules', {
        method: 'POST',
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const err = await res.json()
        showError('Erreur: ' + (err.error || 'Erreur inconnue'))
        return
      }
    }
    showSuccess('Règles sauvegardées')
    await loadRules()
  } catch (e) {
    showError('Erreur réseau: ' + e.message)
  } finally {
    saving.value = false
  }
}
</script>
