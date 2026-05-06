export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { descriptions, categories } = req.body || {};
  if (!descriptions || !Array.isArray(descriptions)) {
    return res.status(400).json({ error: 'Missing descriptions array' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'GEMINI_API_KEY not configured' });
  }

  const categoryList = categories ? categories.join(', ') : 'none';
  const descList = descriptions.slice(0, 20).join('\n');

  const prompt = `Given these bank transaction descriptions:
${descList}

And these existing categories: ${categoryList}

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

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.2, maxOutputTokens: 500 },
        }),
      }
    );

    if (!response.ok) {
      const err = await response.json();
      return res.status(response.status).json({ error: err.error?.message || 'Gemini API error' });
    }

    const data = await response.json();
    let text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    text = text.replace(/^```json\s*/i, '').replace(/```\s*$/g, '').trim();

    try {
      const rule = JSON.parse(text);
      return res.status(200).json(rule);
    } catch {
      return res.status(500).json({ error: 'Failed to parse Gemini response as JSON', raw: text });
    }
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
