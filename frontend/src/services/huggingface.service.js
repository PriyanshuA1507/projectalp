import {
  buildFeedbackSystemPrompt,
  buildFeedbackUserPrompt,
} from '../config/feedbackContexts.js';

const HF_ROUTER_BASE = import.meta.env.VITE_HF_ROUTER_URL || 'https://router.huggingface.co/v1';
const DEFAULT_MODEL_CANDIDATES = [
  'Qwen/Qwen3-4B-Thinking-2507',
  'Qwen/Qwen2.5-7B-Instruct-1M',
  'google/gemma-2-2b-it',
  'mistralai/Mistral-7B-Instruct-v0.3',
];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const normalizeToken = (token) => {
  const value = token?.trim() || '';
  if (!value || value === 'hf_your_token_here' || value.includes('your_token')) {
    return '';
  }
  return value;
};

const readEnvToken = () => normalizeToken(import.meta.env.VITE_HUGGINGFACE_API_KEY);

export const hasConfiguredEnvHfApiKey = () => Boolean(readEnvToken());

export const getConfiguredHfApiKey = () => readEnvToken();

export const getHfModelCandidates = () => {
  const configured = import.meta.env.VITE_HF_MODELS || import.meta.env.VITE_HF_MODEL;
  const models = configured
    ?.split(',')
    .map((model) => model.trim())
    .filter(Boolean);

  return models?.length ? models : DEFAULT_MODEL_CANDIDATES;
};

const extractChatContent = (payload) => {
  const content = payload?.choices?.[0]?.message?.content;

  if (typeof content === 'string') {
    return content;
  }

  if (Array.isArray(content)) {
    return content
      .map((part) => (typeof part === 'string' ? part : part?.text || ''))
      .join('');
  }

  return '';
};

const cleanModelOutput = (text) => text
  .replace(/<think>[\s\S]*?<\/think>/gi, '')
  .replace(/^```(?:markdown|md)?\s*/i, '')
  .replace(/```$/i, '')
  .trim();

const parseErrorMessage = async (response) => {
  const body = await response.text().catch(() => '');
  let payload = {};

  try {
    payload = body ? JSON.parse(body) : {};
  } catch {
    payload = {};
  }

  const raw = payload?.error?.message || payload?.error || payload?.message || payload?.detail || body;
  if (typeof raw === 'string' && raw.trim()) return raw.trim();
  if (Array.isArray(raw)) {
    return raw.map((item) => item?.msg || item?.message || JSON.stringify(item)).join('; ');
  }
  return `Hugging Face API error (${response.status})`;
};

const isProviderOrModelIssue = (status, message) => {
  const text = message.toLowerCase();
  return (
    status === 404
    || text.includes('not supported by any provider')
    || text.includes('provider you have enabled')
    || text.includes('model is not supported')
    || text.includes('currently unavailable')
    || text.includes('no provider')
  );
};

const createNextModelError = (message) => {
  const error = new Error(message);
  error.tryNextModel = true;
  return error;
};

async function requestChatCompletion({
  apiKey,
  context,
  dataSummary,
  model,
  onProgress,
}) {
  const endpoint = `${HF_ROUTER_BASE.replace(/\/$/, '')}/chat/completions`;
  const systemPrompt = buildFeedbackSystemPrompt(context);
  const userPrompt = buildFeedbackUserPrompt(context, dataSummary);

  for (let attempt = 0; attempt < 3; attempt += 1) {
    onProgress?.(`Calling Hugging Face Router with ${model}${attempt ? ` (retry ${attempt + 1})` : ''}...`);

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
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          max_tokens: 2200,
          temperature: 0.25,
          stream: false,
        }),
      });
    } catch (error) {
      throw new Error(`Cannot reach Hugging Face Router. Check your internet connection. ${error.message || ''}`.trim());
    }

    if (response.status === 503) {
      const retryAfter = Number(response.headers.get('retry-after'));
      const waitMs = Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : 12000;
      onProgress?.(`Model is warming up. Waiting ${Math.round(waitMs / 1000)}s...`);
      await sleep(waitMs);
      continue;
    }

    if (response.status === 401 || response.status === 403) {
      throw new Error('Hugging Face token is invalid or missing Inference Providers permission.');
    }

    if (response.status === 402) {
      throw new Error('Hugging Face credits are unavailable or exhausted for this account. Add credits or try a smaller model.');
    }

    if (response.status === 429) {
      throw new Error('Hugging Face rate limit reached. Please wait a moment and try again.');
    }

    if (!response.ok) {
      const message = await parseErrorMessage(response);
      if (isProviderOrModelIssue(response.status, message)) {
        throw createNextModelError(message);
      }
      throw new Error(message);
    }

    const payload = await response.json();
    const text = cleanModelOutput(extractChatContent(payload));

    if (!text) {
      throw createNextModelError(`No analysis text returned from ${model}.`);
    }

    return text;
  }

  throw createNextModelError(`${model} is still loading or unavailable.`);
}

export async function analyzeFeedbackWithHuggingFace({
  apiKey,
  context,
  dataString,
  model,
  onProgress,
}) {
  const token = normalizeToken(apiKey);
  if (!token) {
    throw new Error('Hugging Face API key is required. Add VITE_HUGGINGFACE_API_KEY to frontend/.env, then restart the dev server.');
  }

  if (!context) {
    throw new Error('Feedback type is required before analysis can run.');
  }

  const models = model ? [model] : getHfModelCandidates();
  let lastError = null;

  for (const modelName of models) {
    try {
      return await requestChatCompletion({
        apiKey: token,
        context,
        dataSummary: dataString,
        model: modelName,
        onProgress,
      });
    } catch (error) {
      lastError = error;
      if (!error.tryNextModel) {
        throw error;
      }
      onProgress?.(`${modelName} is unavailable for this account. Trying another Hugging Face model...`);
    }
  }

  throw new Error(lastError?.message || 'No configured Hugging Face model could generate the analysis.');
}
