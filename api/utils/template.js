import Mustache from 'mustache';

const DEFAULT_COLUMN_MAPPING_PROMPT = `Voici les en-têtes de colonnes d'un fichier CSV bancaire :
{{#context.headers}}
- {{.}}
{{/context.headers}}

Mappe chaque en-tête à l'un de ces champs de base de données (ou laisse non mappé si aucun ne correspond) :
sequence_number, extract_number, account_number, execution_date, accounting_date, value_date, amount, currency, transaction_type, counterparty_account, counterparty_name, counterparty_street, counterparty_city, communication, details, status, rejection_reason, bic, country_code

Réponds avec un tableau d'objets : [{"header": "nom colonne CSV", "field": "champ base de données"}]`;

const DEFAULT_SUGGEST_RULES_PROMPT = `Tu es un expert en catégorisation de transactions bancaires.

Voici {{groups.length}} groupe(s) de transactions similaires. Pour chaque groupe, suggère UNE règle qui catégoriserait ces transactions.

Chaque transaction est un objet JSON avec ces colonnes :
bank_source, extract_number, account_number, execution_date, accounting_date, value_date, amount, currency, transaction_type, counterparty_account, counterparty_name, counterparty_street, counterparty_city, communication, details, status, rejection_reason, bic, country_code

{{#groups}}
--- GROUPE {{@index}} ---
{{transactions_json}}
{{#suggested_category}}Catégorie suggérée par l'utilisateur: {{suggested_category}}{{/suggested_category}}
{{#suggested_sub_category}}Sous-catégorie suggérée: {{suggested_sub_category}}{{/suggested_sub_category}}
{{#suggested_tags}}Tags suggérés: {{suggested_tags}}{{/suggested_tags}}

{{/groups}}

Catégories existantes: {{#categories}}{{.}}, {{/categories}}
Tags existants: {{#tags}}{{.}}, {{/tags}}

Pour chaque groupe, retourne une règle avec:
- criteria: array de critères (column: "communication"/"description"/"details"/"any", match_type: "contains"/"starts_with"/"ends_with"/"regex"/"exact", pattern: le motif)
- criteria_mode: "AND" ou "OR"
- category: la catégorie
- sub_category: sous-catégorie ou null
- tags: array de tags
- explanation: brève explication

Réponds avec un JSON: {"rules": [règle1, règle2, ...]}`;

export function renderColumnMappingPrompt(template, headers) {
  const tpl = template || DEFAULT_COLUMN_MAPPING_PROMPT;
  return Mustache.render(tpl, { context: { headers } });
}

export function renderSuggestRulesPrompt(template, groups, categories, tags) {
  const tpl = template || DEFAULT_SUGGEST_RULES_PROMPT;
  const context = {
    groups: groups.map(g => ({
      ...g,
      transactions_json: JSON.stringify(g.transactions, null, 2),
      suggested_tags: g.suggested_tags?.join(', ') || '',
    })),
    categories,
    tags,
  };
  return Mustache.render(tpl, context);
}

export { DEFAULT_COLUMN_MAPPING_PROMPT, DEFAULT_SUGGEST_RULES_PROMPT };
