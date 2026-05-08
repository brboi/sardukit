<template>
  <div class="transaction-table-wrapper">
    <table class="transaction-table">
      <thead>
        <tr>
          <th class="col-selection">Sélection</th>
          <th class="col-date">Date</th>
          <th class="col-description">Description</th>
          <th class="col-amount">Montant</th>
          <th class="col-category">Catégorie</th>
          <th class="col-subcategory">Sous-catégorie</th>
          <th class="col-tags">Tags</th>
          <th class="col-counterparty">Contrepartie</th>
          <th class="col-account">Compte</th>
          <th class="col-bic">BIC</th>
          <th class="col-type">Type</th>
          <th class="col-status">Statut</th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="t in transactions"
          :key="t.transaction_id"
          :class="{ grouped: isGrouped(t.transaction_id) }"
        >
          <td class="col-selection">
            <template v-if="isGrouped(t.transaction_id)">
              <span class="group-name">{{ getGroupName(t.transaction_id) }}</span>
            </template>
            <template v-else-if="showCheckbox">
              <input
                type="checkbox"
                :checked="selectedIds.has(t.transaction_id)"
                @change="$emit('select', t.transaction_id)"
              />
            </template>
          </td>
          <td class="col-date">{{ formatDate(t.execution_date) }}</td>
          <td class="col-description">{{ t.communication || t.details || '-' }}</td>
          <td class="col-amount">{{ formatCurrency(t.amount) }}</td>
          <td class="col-category">{{ t.category || '-' }}</td>
          <td class="col-subcategory">{{ t.sub_category || '-' }}</td>
          <td class="col-tags">{{ (t.tags || []).join(', ') || '-' }}</td>
          <td class="col-counterparty">{{ t.counterparty_name || '-' }}</td>
          <td class="col-account">{{ t.counterparty_account || '-' }}</td>
          <td class="col-bic">{{ t.bic || '-' }}</td>
          <td class="col-type">{{ t.transaction_type || '-' }}</td>
          <td class="col-status">{{ t.status || '-' }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup>
defineProps({
  transactions: {
    type: Array,
    default: () => [],
  },
  showCheckbox: {
    type: Boolean,
    default: true,
  },
  groupedIds: {
    type: Set,
    default: () => new Set(),
  },
  selectedIds: {
    type: Set,
    default: () => new Set(),
  },
  allGroupNames: {
    type: Map,
    default: () => new Map(),
  },
})

defineEmits(['select'])

function formatDate(dateStr) {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleDateString('fr-FR')
}

function formatCurrency(val) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(val || 0)
}

function isGrouped(transactionId) {
  return groupedIds.has(transactionId)
}

function getGroupName(transactionId) {
  return allGroupNames.get(transactionId) || ''
}
</script>

<style scoped>
.transaction-table-wrapper {
  overflow-x: auto;
  min-width: 1200px;
}

.transaction-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.875rem;
}

.transaction-table th,
.transaction-table td {
  padding: 0.5rem;
  text-align: left;
  border-bottom: 1px solid #e5e5e5;
  white-space: nowrap;
}

.transaction-table th {
  background: #f5f5f5;
  font-weight: 600;
  position: sticky;
  top: 0;
  z-index: 1;
}

.col-selection {
  width: 100px;
}

.col-date {
  width: 100px;
}

.col-description {
  min-width: 200px;
}

.col-amount {
  width: 120px;
  text-align: right;
}

.col-category,
.col-subcategory,
.col-type,
.col-status {
  width: 120px;
}

.col-tags {
  min-width: 150px;
}

.col-counterparty {
  min-width: 150px;
}

.col-account {
  width: 180px;
}

.col-bic {
  width: 100px;
}

.transaction-table tr.grouped {
  opacity: 0.5;
  background: #f5f5f5;
}

.group-name {
  font-style: italic;
  color: #666;
}
</style>
