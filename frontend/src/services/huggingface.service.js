const HF_STORAGE_KEY = 'hf_api_key';
const HF_ROUTER_BASE = import.meta.env.VITE_HF_ROUTER_URL || 'https://router.huggingface.co/v1';
const HF_INFERENCE_BASE = 'https://api-inference.huggingface.co';
const DEFAULT_MODEL = import.meta.env.VITE_HF_MODEL || 'mistralai/Mistral-7B-Instruct-v0.2';

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

const buildUserPrompt = (context, dataString) => `${context}

Data:
${dataString}

Please analyze the provided feedback data and give a detailed report containing:
1. Key Strengths
2. Areas for Improvement
3. Specific Recommendations
4. Sentiment/Mood Analysis (Overall sentiment)

Format the output in clean Markdown. Do not mention any institution, department, or individual names.`;

const buildInstructPrompt = (systemContext, dataString) => {
  const userPrompt = `${systemContext}

Data:
${dataString}

Please analyze the provided feedback data and give a detailed report containing:
1. Key Strengths
2. Areas for Improvement
3. Specific Recommendations
4. Sentiment/Mood Analysis (Overall sentiment)

Format the output in clean Markdown. Do not mention any institution, department, or individual names.`;

  return `<s>[INST] ${userPrompt} [/INST]`;
};

const extractChatContent = (result) => {
  const content = result?.choices?.[0]?.message?.content;
  if (typeof content === 'string' && content.trim()) {
    return content.trim();
  }
  return null;
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

const parseErrorMessage = async (response) => {
  const payload = await response.json().catch(() => ({}));
  const raw = payload?.error?.message || payload?.error || payload?.message || payload?.detail;
  if (typeof raw === 'string') return raw;
  if (Array.isArray(raw)) return raw.map((e) => e?.msg || e?.message || JSON.stringify(e)).join('; ');
  return `Hugging Face API error (${response.status})`;
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function tryRouterAPI(apiKey, context, dataString, model, onProgress) {
  const endpoint = `${HF_ROUTER_BASE.replace(/\/$/, '')}/chat/completions`;
  const userPrompt = buildUserPrompt(context, dataString);

  for (let attempt = 0; attempt < 3; attempt += 1) {
    onProgress?.(`Trying Router API with ${model.split('/').pop()}…${attempt > 0 ? ` (retry ${attempt + 1})` : ''}`);

    let response;
    try {
      response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          messages: [
            {
              role: 'system',
              content:
                'You are an expert institutional quality analyst. Produce clear, actionable Markdown reports from survey data.',
            },
            { role: 'user', content: userPrompt },
          ],
          max_tokens: 2048,
          temperature: 0.35,
          top_p: 0.9,
        }),
      });
    } catch (networkError) {
      const msg = networkError?.message || String(networkError);
      if (msg.includes('Failed to fetch') || msg.includes('ERR_NAME_NOT_RESOLVED')) {
        throw new Error('ROUTER_NETWORK_ERROR');
      }
      throw networkError;
    }

    if (response.status === 503) {
      onProgress?.('Model is loading… waiting 15s');
      await sleep(15000);
      continue;
    }

    if (response.status === 429) {
      throw new Error('Hugging Face rate limit reached. Please wait a moment and try again.');
    }

    if (!response.ok) {
      const message = await parseErrorMessage(response);
      if (message.includes('not supported by any provider') || message.includes('provider you have enabled')) {
        throw new Error('ROUTER_PROVIDER_ERROR');
      }
      throw new Error(message);
    }

    const payload = await response.json();
    const text = extractChatContent(payload);
    if (!text) {
      throw new Error('No analysis text returned from the model. Try a different model in VITE_HF_MODEL.');
    }

    return text;
  }

  throw new Error('Model is still loading. Please try again in a minute.');
}

async function tryInferenceAPI(apiKey, context, dataString, model, onProgress) {
  const endpoint = `${HF_INFERENCE_BASE}/models/${model}`;
  const prompt = buildInstructPrompt(context, dataString);

  for (let attempt = 0; attempt < 6; attempt += 1) {
    onProgress?.(`Trying Inference API with ${model.split('/').pop()}…${attempt > 0 ? ` (retry ${attempt + 1})` : ''}`);

    let response;
    try {
      response = await fetch(endpoint, {
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
    } catch (networkError) {
      const msg = networkError?.message || String(networkError);
      if (msg.includes('Failed to fetch') || msg.includes('ERR_NAME_NOT_RESOLVED')) {
        throw new Error('Cannot reach Hugging Face Inference API. Check your internet connection.');
      }
      throw networkError;
    }

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

  // Try Router API first (newer, faster)
  try {
    onProgress?.('Attempting Router API...');
    return await tryRouterAPI(apiKey, context, dataString, model, onProgress);
  } catch (error) {
    if (error.message === 'ROUTER_PROVIDER_ERROR') {
      onProgress?.('Router API providers not enabled, falling back to Inference API...');
      // Fall back to older Inference API
      return await tryInferenceAPI(apiKey, context, dataString, model, onProgress);
    }
    if (error.message === 'ROUTER_NETWORK_ERROR') {
      onProgress?.('Router API unreachable, falling back to Inference API...');
      // Fall back to older Inference API
      return await tryInferenceAPI(apiKey, context, dataString, model, onProgress);
    }
    throw error;
  }
}
