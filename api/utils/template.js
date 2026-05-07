import Mustache from 'mustache';

const DEFAULT_PROMPT_TEMPLATE = `Étant donné ces descriptions de transactions bancaires :
{{#context.transactions}}
{{.}}
{{/context.transactions}}

Et ces catégories existantes : {{#context.categories}}{{.}}, {{/context.categories}}

Et ces tags existants : {{#context.tags}}{{.}}, {{/context.tags}}

Suggère UNE règle qui couvrirait le plus de transactions.`;

const DEFAULT_COLUMN_MAPPING_PROMPT = `Voici les en-têtes de colonnes d'un fichier CSV bancaire :
{{#context.headers}}
- {{.}}
{{/context.headers}}

Mappe chaque en-tête à l'un de ces champs de base de données (ou laisse non mappé si aucun ne correspond) :
sequence_number, extract_number, account_number, execution_date, accounting_date, value_date, amount, currency, transaction_type, counterparty_account, counterparty_name, counterparty_street, counterparty_city, communication, details, status, rejection_reason, bic, country_code

Réponds avec un tableau d'objets : [{"header": "nom colonne CSV", "field": "champ base de données"}]`;

export function renderPrompt(template, context) {
  const tpl = template || DEFAULT_PROMPT_TEMPLATE;
  return Mustache.render(tpl, { context });
}

export function renderColumnMappingPrompt(template, headers) {
  const tpl = template || DEFAULT_COLUMN_MAPPING_PROMPT;
  return Mustache.render(tpl, { context: { headers } });
}

export { DEFAULT_PROMPT_TEMPLATE, DEFAULT_COLUMN_MAPPING_PROMPT };
