const HF_STORAGE_KEY = 'hf_api_key';
const DEFAULT_MODEL = import.meta.env.VITE_HF_MODEL || 'mistralai/Mistral-7B-Instruct-v0.2';
const MAX_RETRIES = 6;

// Alternative endpoint to try if the main API inference endpoint is unreachable
const HF_API_ENDPOINT = import.meta.env.VITE_HF_API_ENDPOINT || 'https://api-inference.huggingface.co';

export const getStoredHfApiKey = () => {
  const fromEnv = import.meta.env.VITE_HUGGINGFACE_API_KEY?.trim();
  if (fromEnv) return fromEnv;
  try {
    return sessionStorage.getItem(HF_STORAGE_KEY)?.trim() || '';
  } catch {
    return '';
  }
};

export const storeHfApiKey = (key) => {
  try {
    if (key?.trim()) {
      sessionStorage.setItem(HF_STORAGE_KEY, key.trim());
    } else {
      sessionStorage.removeItem(HF_STORAGE_KEY);
    }
  } catch {
    // ignore storage errors
  }
};

const buildInstructPrompt = (systemContext, dataString) => {
  const userPrompt = `${systemContext}

Data:
${dataString}

Please analyze the provided feedback data and give a detailed report containing:
1. Key Strengths
2. Areas for Improvement
3. Specific Recommendations
4. Sentiment/Mood Analysis (Overall sentiment)

Format the output in clean Markdown.`;

  return `<s>[INST] ${userPrompt} [/INST]`;
};

const extractGeneratedText = (result) => {
  if (Array.isArray(result)) {
    const first = result[0];
    if (first?.generated_text) return first.generated_text;
    if (typeof first === 'string') return first;
  }
  if (result?.generated_text) return result.generated_text;
  if (typeof result === 'string') return result;
  return null;
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export async function analyzeFeedbackWithHuggingFace({
  apiKey,
  context,
  dataString,
  model = DEFAULT_MODEL,
  onProgress,
}) {
  if (!apiKey) {
    throw new Error('Hugging Face API key is required. Add VITE_HUGGINGFACE_API_KEY to .env or enter your key below.');
  }

  const prompt = buildInstructPrompt(context, dataString);
  const endpoint = `${HF_API_ENDPOINT}/models/${model}`;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt += 1) {
    onProgress?.(`Sending to ${model.split('/').pop()}…${attempt > 0 ? ` (retry ${attempt + 1})` : ''}`);

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        inputs: prompt,
        parameters: {
          max_new_tokens: 2048,
          temperature: 0.35,
          top_p: 0.9,
          return_full_text: false,
        },
        options: { wait_for_model: true },
      }),
    });

    const payload = await response.json().catch(() => ({}));

    if (response.status === 503 || payload?.error?.includes?.('loading')) {
      const waitSeconds = Math.min(payload?.estimated_time || 15, 45);
      onProgress?.(`Model is loading… waiting ${waitSeconds}s`);
      await sleep(waitSeconds * 1000);
      continue;
    }

    if (response.status === 429) {
      throw new Error('Hugging Face rate limit reached. Please wait a moment and try again.');
    }

    if (!response.ok) {
      const message = payload?.error || payload?.message || `Hugging Face API error (${response.status})`;
      throw new Error(typeof message === 'string' ? message : JSON.stringify(message));
    }

    const text = extractGeneratedText(payload);
    if (!text) {
      throw new Error('No analysis text returned from the model. Try again or choose a different model.');
    }

    return text.trim();
  }

  throw new Error('Model is still loading. Please try again in a minute.');
}
