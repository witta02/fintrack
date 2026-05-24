const GEMINI_MODELS = [
  'gemini-3.5-flash',
  'gemini-3.1-flash',
  'gemini-3.1-flash-lite',
  'gemini-2.5-flash',
  'gemini-1.5-flash'
];

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const apiKey = process.env.GEMINI_API_KEY || 'AIzaSyDXpFjOTv3CuxtdtPPlameZ5VGqSkUB91M';
    const { models: availableModels, error: listError } = apiKey 
      ? await listGenerateContentModels(apiKey) 
      : { models: [], error: 'No API key' };

    return res.status(200).json({
      ok: true,
      service: 'FinTrack AI',
      provider: 'Gemini',
      hasGeminiKey: Boolean(apiKey),
      preferredModels: GEMINI_MODELS,
      availableGenerateContentModels: availableModels,
      listError: listError
    });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ response: 'Method not allowed', transaction_to_add: null, source: 'server' });
  }

  const apiKey = process.env.GEMINI_API_KEY || 'AIzaSyDXpFjOTv3CuxtdtPPlameZ5VGqSkUB91M';
  if (!apiKey) {
    return res.status(503).json({
      response: 'AI API key is not configured. Offline planner will handle this request.',
      transaction_to_add: null,
      source: 'server_missing_key'
    });
  }

  try {
    const { message, context } = req.body || {};
    if (!message || typeof message !== 'string') {
      return res.status(400).json({ response: 'Missing message', transaction_to_add: null });
    }

    const prompt = buildPrompt(message, context);
    const result = await callGeminiWithFallback(apiKey, prompt);

    if (!result.ok) {
      return res.status(502).json({
        response: `AI provider error. Offline planner will handle this request.`,
        transaction_to_add: null,
        source: 'gemini_error',
        error: result.error,
        model: result.model
      });
    }

    return res.status(200).json({
      response: result.parsed.response || 'I calculated a result, but the answer was empty.',
      transaction_to_add: result.parsed.transaction_to_add || null,
      source: 'gemini',
      model: result.model
    });
  } catch (error) {
    return res.status(500).json({
      response: 'AI service failed. Offline planner will handle this request.',
      transaction_to_add: null,
      source: 'server_error',
      error: error.message
    });
  }
}

async function callGeminiWithFallback(apiKey, prompt) {
  let lastError = '';
  const { models: availableModels } = await listGenerateContentModels(apiKey);
  const models = buildModelCandidates(availableModels);
  let lastModel = models[0] || GEMINI_MODELS[0];

  for (const model of models) {
    lastModel = model;
    
    // In May 2026, GA models are on v1, while previews/older models might be on v1beta
    const versions = model.includes('preview') ? ['v1beta', 'v1'] : ['v1', 'v1beta'];

    for (const ver of versions) {
      try {
        const modelPath = model.startsWith('models/') ? model : `models/${model}`;
        const geminiResponse = await fetch(
          `https://generativelanguage.googleapis.com/${ver}/${modelPath}:generateContent?key=${apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ role: 'user', parts: [{ text: prompt }] }],
              systemInstruction: {
                parts: [{
                  text: `You are Finny, the finance assistant inside FinTrack.
Reply mainly in the user's app language when possible.
Give practical, specific, numerically useful personal finance guidance.
If the user asks to record an income or expense, return transaction_to_add.
Return valid JSON only. No markdown fences.`
                }]
              },
              generationConfig: {
                temperature: 0.45,
                responseMimeType: 'application/json'
              }
            })
          }
        );

        if (!geminiResponse.ok) {
          lastError = `${ver} ${geminiResponse.status}: ${await geminiResponse.text()}`;
          // If 404, try the next version or next model
          continue;
        }

        const data = await geminiResponse.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
        const parsed = JSON.parse(text.replace(/```json|```/g, '').trim());

        return { ok: true, model: `${ver}/${model}`, parsed };
      } catch (error) {
        lastError = error.message;
      }
    }
  }

  return { ok: false, model: lastModel, error: lastError };
}

async function listGenerateContentModels(apiKey) {
  const versions = ['v1', 'v1beta'];
  let allModels = [];
  let lastError = null;

  for (const ver of versions) {
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/${ver}/models?key=${apiKey}`);
      if (response.ok) {
        const data = await response.json();
        const models = (data.models || [])
          .filter((model) => model.supportedGenerationMethods?.includes('generateContent'))
          .map((model) => model.name);
        allModels = [...new Set([...allModels, ...models])];
      } else {
        const errText = await response.text();
        lastError = `${ver} ${response.status}: ${errText}`;
      }
    } catch (error) {
      lastError = error.message;
    }
  }

  return { 
    models: allModels, 
    error: allModels.length > 0 ? null : lastError 
  };
}

function buildModelCandidates(availableModels) {
  const preferred = GEMINI_MODELS.map((model) => `models/${model}`);
  const exactPreferred = preferred.filter((model) => availableModels.includes(model));
  const flashModels = availableModels.filter((model) => /flash/i.test(model));
  const otherModels = availableModels.filter((model) => !/flash/i.test(model));
  const candidates = [...exactPreferred, ...flashModels, ...otherModels, ...preferred];

  return [...new Set(candidates)];
}

function buildPrompt(message, context = {}) {
  return `
User message:
${message}

Current FinTrack context:
${JSON.stringify(context, null, 2)}

Return JSON in this exact shape:
{
  "response": "Helpful answer for the user. Include concrete daily/weekly/monthly numbers when planning money.",
  "transaction_to_add": null or {
    "title": "short transaction title",
    "amount": number,
    "isIncome": boolean,
    "category": "Food | Transport | Shopping | Salary | Bills | Entertainment | Health | Investment | Gift | Travel | Education | Other"
  }
}
`;
}
