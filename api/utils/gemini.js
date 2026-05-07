const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent';

const GEMINI_UNSUPPORTED_KEYS = ['$schema', 'propertyNames', 'additionalProperties', '$defs', 'definitions'];

function cleanSchemaForGemini(schema) {
  if (!schema || typeof schema !== 'object') return schema;
  if (Array.isArray(schema)) return schema.map(cleanSchemaForGemini);

  const cleaned = {};
  for (const [key, value] of Object.entries(schema)) {
    if (GEMINI_UNSUPPORTED_KEYS.includes(key)) continue;
    if (key === 'properties' && typeof value === 'object') {
      cleaned[key] = Object.fromEntries(
        Object.entries(value).map(([k, v]) => [k, cleanSchemaForGemini(v)])
      );
    } else if (key === 'items') {
      cleaned[key] = cleanSchemaForGemini(value);
    } else if (key === 'enum') {
      cleaned[key] = value;
    } else if (key === 'type') {
      cleaned[key] = value;
    } else if (typeof value === 'object' && value !== null) {
      cleaned[key] = cleanSchemaForGemini(value);
    } else {
      cleaned[key] = value;
    }
  }
  return cleaned;
}

export async function callGemini(apiKey, prompt, responseSchema) {
  const cleanedSchema = cleanSchemaForGemini(responseSchema);

  const response = await fetch(GEMINI_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': apiKey,
    },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0,
        responseMimeType: 'application/json',
        responseSchema: cleanedSchema,
      },
    }),
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error?.message || `Gemini API error (${response.status})`);
  }

  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
}
