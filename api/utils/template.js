import Mustache from 'mustache';

const DEFAULT_PROMPT_TEMPLATE = `Given these bank transaction descriptions:
{{#context.transactions}}
{{.}}
{{/context.transactions}}

And these existing categories: {{#context.categories}}{{.}}, {{/context.categories}}

And these existing tags: {{#context.tags}}{{.}}, {{/context.tags}}

Suggest ONE rule that would cover the most transactions. Return ONLY valid JSON with this exact structure:
{
  "pattern": "the regex or text pattern to match",
  "match_type": "contains",
  "category": "suggested category name",
  "sub_category": null,
  "tags": [],
  "explanation": "brief explanation of why this rule makes sense"
}

Do not include any text before or after the JSON.`;

export function renderPrompt(template, context) {
  const tpl = template || DEFAULT_PROMPT_TEMPLATE;
  return Mustache.render(tpl, { context });
}

export { DEFAULT_PROMPT_TEMPLATE };
