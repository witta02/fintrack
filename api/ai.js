const GEMINI_MODEL = 'gemini-1.5-flash';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ response: 'Method not allowed', transaction_to_add: null });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(503).json({
      response: 'AI API key is not configured. Offline planner will handle this request.',
      transaction_to_add: null
    });
  }

  try {
    const { message, context } = req.body || {};
    if (!message || typeof message !== 'string') {
      return res.status(400).json({ response: 'Missing message', transaction_to_add: null });
    }

    const prompt = buildPrompt(message, context);
    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
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
      const detail = await geminiResponse.text();
      return res.status(502).json({
        response: `AI provider error: ${geminiResponse.status}. Offline planner will handle this request.`,
        transaction_to_add: null,
        detail
      });
    }

    const data = await geminiResponse.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    const parsed = JSON.parse((text || '').replace(/```json|```/g, '').trim());

    return res.status(200).json({
      response: parsed.response || 'I calculated a result, but the answer was empty.',
      transaction_to_add: parsed.transaction_to_add || null
    });
  } catch (error) {
    return res.status(500).json({
      response: 'AI service failed. Offline planner will handle this request.',
      transaction_to_add: null,
      error: error.message
    });
  }
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
