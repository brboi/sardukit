const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent';

export async function callGemini(apiKey, prompt, zodSchema) {
  const schema = JSON.parse(JSON.stringify(zodSchema.toJSONSchema()));
  const clean = (obj) => {
    if (!obj || typeof obj !== 'object') return obj;
    if (Array.isArray(obj)) return obj.map(clean);
    const { $schema, additionalProperties, ...rest } = obj;
    const cleaned = {};
    for (const [k, v] of Object.entries(rest)) {
      cleaned[k] = clean(v);
    }
    return cleaned;
  };

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
        responseSchema: clean(schema),
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
