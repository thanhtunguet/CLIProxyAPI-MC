import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { parse as parseYaml } from 'yaml';
import { useAuthStore, useNotificationStore } from '@/stores';
import { apiCallApi, getApiCallErrorMessage } from '@/services/api/apiCall';
import { configFileApi } from '@/services/api/configFile';
import {
  ModelSelector,
  TemperatureControl,
  SystemPromptDialog,
  ChatMessage,
} from '@/components/playground';
import type { ModelGroup } from '@/components/playground';
import { Button } from '@/components/ui/Button';
import { IconSend, IconStop } from '@/components/ui/icons';
import styles from './PlaygroundPage.module.scss';

declare const process: {
  env: {
    API_URL?: string;
    NODE_ENV?: string;
  };
};

interface ChatMessageItem {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  tokenCount?: number;
}

let messageCounter = 0;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

const extractApiKeyValue = (raw: unknown): string | null => {
  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    return trimmed ? trimmed : null;
  }

  if (!isRecord(raw)) return null;
  const candidates = [raw['api-key'], raw.apiKey, raw.key, raw.Key];
  for (const candidate of candidates) {
    if (typeof candidate !== 'string') continue;
    const trimmed = candidate.trim();
    if (trimmed) return trimmed;
  }
  return null;
};

const parseApiKeys = (raw: unknown): string[] => {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const keys: string[] = [];

  for (const item of raw) {
    const key = extractApiKeyValue(item);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    keys.push(key);
  }

  return keys;
};

const parseApiKeysFromConfigYaml = (yamlContent: string): string[] => {
  try {
    const parsed = parseYaml(yamlContent);
    if (!isRecord(parsed)) return [];

    if (Object.prototype.hasOwnProperty.call(parsed, 'api-keys')) {
      const directKeys = parseApiKeys(parsed['api-keys']);
      if (directKeys.length) return directKeys;
    }

    const auth = isRecord(parsed.auth) ? parsed.auth : null;
    const providers = auth && isRecord(auth.providers) ? auth.providers : null;
    const configApiKeyProvider =
      providers && isRecord(providers['config-api-key']) ? providers['config-api-key'] : null;

    if (!configApiKeyProvider) return [];

    if (Object.prototype.hasOwnProperty.call(configApiKeyProvider, 'api-key-entries')) {
      const entryKeys = parseApiKeys(configApiKeyProvider['api-key-entries']);
      if (entryKeys.length) return entryKeys;
    }

    return parseApiKeys(configApiKeyProvider['api-keys']);
  } catch {
    return [];
  }
};

const normalizeProviderLabel = (raw: string): string => {
  const normalized = raw.trim().toLowerCase();
  if (!normalized) return '';

  const knownMap: Record<string, string> = {
    openai: 'OpenAI',
    anthropic: 'Anthropic',
    google: 'Google',
    gemini: 'Google',
    deepseek: 'DeepSeek',
    qwen: 'Qwen',
    moonshotai: 'MoonshotAI',
    xai: 'xAI',
    'x-ai': 'xAI',
    grok: 'xAI',
    mistral: 'Mistral',
  };

  if (knownMap[normalized]) return knownMap[normalized];
  return normalized
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ');
};

const inferProviderFromModel = (modelName: string): string => {
  const trimmed = modelName.trim();
  if (!trimmed) return 'Other';

  const lower = trimmed.toLowerCase();
  const slashIndex = lower.indexOf('/');
  if (slashIndex > 0) {
    const prefix = normalizeProviderLabel(lower.slice(0, slashIndex));
    if (prefix) return prefix;
  }

  if (lower.includes('gpt') || /^o\d/.test(lower) || lower.includes('chatgpt')) return 'OpenAI';
  if (lower.includes('claude')) return 'Anthropic';
  if (lower.includes('gemini')) return 'Google';
  if (lower.includes('qwen')) return 'Qwen';
  if (lower.includes('deepseek')) return 'DeepSeek';
  if (lower.includes('grok')) return 'xAI';
  if (lower.includes('mistral')) return 'Mistral';

  return 'Other';
};

const parseModelName = (raw: unknown): string => {
  if (typeof raw === 'string') return raw.trim();
  if (!isRecord(raw)) return '';
  const candidate = raw.id ?? raw.name ?? raw.model ?? raw.value;
  return typeof candidate === 'string' ? candidate.trim() : '';
};

const parseProviderName = (raw: unknown): string => {
  if (!isRecord(raw)) return '';
  const candidate =
    raw.owned_by ?? raw.ownedBy ?? raw.provider ?? raw.vendor ?? raw.organization ?? raw.org;
  if (typeof candidate !== 'string') return '';
  return normalizeProviderLabel(candidate);
};

const buildModelGroupsFromPayload = (payload: unknown): ModelGroup[] => {
  let source: unknown[] = [];
  if (Array.isArray(payload)) {
    source = payload;
  } else if (isRecord(payload)) {
    if (Array.isArray(payload.data)) source = payload.data;
    else if (Array.isArray(payload.models)) source = payload.models;
  }

  const grouped = new Map<string, Set<string>>();

  for (const item of source) {
    const modelName = parseModelName(item);
    if (!modelName) continue;

    const provider = parseProviderName(item) || inferProviderFromModel(modelName);
    const bucket = grouped.get(provider) ?? new Set<string>();
    bucket.add(modelName);
    grouped.set(provider, bucket);
  }

  return Array.from(grouped.entries())
    .map(([provider, models]) => ({
      provider,
      models: Array.from(models).sort((a, b) => a.localeCompare(b)),
    }))
    .sort((a, b) => a.provider.localeCompare(b.provider));
};

const hasModel = (groups: readonly ModelGroup[], model: string): boolean => {
  if (!model.trim()) return false;
  return groups.some((group) => group.models.includes(model));
};

const buildApiCallOpenAIEndpoint = (
  _apiBase: string,
  route: 'models' | 'chat/completions'
): string => {
  const env = String(process.env.NODE_ENV || '').toLowerCase();
  const apiUrlFromEnv = String(process.env.API_URL || '').trim();
  const browserOrigin =
    typeof window !== 'undefined' && window.location?.origin ? window.location.origin : '';

  const rawBase =
    env === 'development'
      ? (apiUrlFromEnv || browserOrigin)
      : (browserOrigin || apiUrlFromEnv);

  const trimmedBase = rawBase.trim().replace(/\/+$/g, '');
  const path = `/v1/${route}`;
  if (!trimmedBase) return path;
  return `${trimmedBase}${path}`;
};

const isRequestCanceled = (error: unknown): boolean => {
  if (error instanceof DOMException && error.name === 'AbortError') return true;
  if (error instanceof Error && (error.name === 'CanceledError' || error.name === 'AbortError')) {
    return true;
  }
  if (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: string }).code === 'ERR_CANCELED'
  ) {
    return true;
  }
  return false;
};

export function PlaygroundPage() {
  const { t } = useTranslation();
  const showNotification = useNotificationStore((state) => state.showNotification);
  const apiBase = useAuthStore((state) => state.apiBase);

  const [messages, setMessages] = useState<ChatMessageItem[]>([]);
  const [input, setInput] = useState('');
  const [modelGroups, setModelGroups] = useState<ModelGroup[]>([]);
  const [selectedModel, setSelectedModel] = useState('');
  const [playgroundApiKey, setPlaygroundApiKey] = useState('');
  const [temperature, setTemperature] = useState(0.7);
  const [systemPrompt, setSystemPrompt] = useState('');
  const [systemPromptDialogOpen, setSystemPromptDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingModels, setLoadingModels] = useState(false);
  const [abortController, setAbortController] = useState<AbortController | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const loadModels = useCallback(async () => {
    if (!apiBase) {
      setModelGroups([]);
      setPlaygroundApiKey('');
      setSelectedModel('');
      return;
    }

    setLoadingModels(true);
    try {
      const yamlContent = await configFileApi.fetchConfigYaml();
      const configApiKeys = parseApiKeysFromConfigYaml(yamlContent);
      const primaryApiKey = configApiKeys[0]?.trim() ?? '';

      if (!primaryApiKey) {
        throw new Error(t('notification.openai_test_key_required'));
      }

      const endpoint = buildApiCallOpenAIEndpoint(apiBase, 'models');
      const result = await apiCallApi.request({
        method: 'GET',
        url: endpoint,
        header: {
          Authorization: `Bearer ${primaryApiKey}`,
          'Content-Type': 'application/json',
        },
      });

      if (result.statusCode < 200 || result.statusCode >= 300) {
        throw new Error(getApiCallErrorMessage(result));
      }

      const groups = buildModelGroupsFromPayload(result.body ?? result.bodyText);
      if (groups.length === 0) {
        throw new Error(t('playground.no_models'));
      }

      setPlaygroundApiKey(primaryApiKey);
      setModelGroups(groups);
      setSelectedModel((current) => (hasModel(groups, current) ? current : groups[0].models[0] ?? ''));
    } catch (err: unknown) {
      setModelGroups([]);
      setPlaygroundApiKey('');
      setSelectedModel('');
      const message = err instanceof Error ? err.message : t('notification.refresh_failed');
      showNotification(message, 'error');
    } finally {
      setLoadingModels(false);
    }
  }, [apiBase, showNotification, t]);

  useEffect(() => {
    loadModels().catch(() => {});
  }, [loadModels]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 160)}px`;
    }
  }, [input]);

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || loading || loadingModels || !selectedModel) return;

    const userMessage: ChatMessageItem = {
      id: `msg-${++messageCounter}`,
      role: 'user',
      content: text,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    const controller = new AbortController();
    setAbortController(controller);

    // Build messages array for API
    const apiMessages: Array<{ role: string; content: string }> = [];
    if (systemPrompt.trim()) {
      apiMessages.push({ role: 'system', content: systemPrompt.trim() });
    }
    for (const msg of messages) {
      apiMessages.push({ role: msg.role, content: msg.content });
    }
    apiMessages.push({ role: 'user', content: text });

    try {
      if (!apiBase) {
        throw new Error(t('notification.connection_required'));
      }
      if (!playgroundApiKey) {
        throw new Error(t('notification.openai_test_key_required'));
      }

      const endpoint = buildApiCallOpenAIEndpoint(apiBase, 'chat/completions');

      const requestBody = {
        model: selectedModel,
        messages: apiMessages,
        temperature,
      };

      const result = await apiCallApi.request({
        method: 'POST',
        url: endpoint,
        header: {
          Authorization: `Bearer ${playgroundApiKey}`,
          'Content-Type': 'application/json',
        },
        data: JSON.stringify(requestBody),
      }, { signal: controller.signal });

      if (result.statusCode < 200 || result.statusCode >= 300) {
        throw new Error(getApiCallErrorMessage(result));
      }

      const body = result.body;
      let assistantContent = '';
      let tokenCount: number | undefined;

      if (body && typeof body === 'object' && 'choices' in body) {
        const choices = (body as Record<string, unknown>).choices;
        if (Array.isArray(choices) && choices.length > 0) {
          const firstChoice = choices[0] as Record<string, unknown>;
          const messageObj = firstChoice.message as Record<string, unknown> | undefined;
          assistantContent = (messageObj?.content as string) || '';
        }
      }

      if (body && typeof body === 'object' && 'usage' in body) {
        const usage = (body as Record<string, unknown>).usage as
          | Record<string, unknown>
          | undefined;
        if (usage?.total_tokens) {
          tokenCount = Number(usage.total_tokens);
        }
      }

      const assistantMessage: ChatMessageItem = {
        id: `msg-${++messageCounter}`,
        role: 'assistant',
        content: assistantContent || t('playground.empty_response'),
        tokenCount,
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err: unknown) {
      if (isRequestCanceled(err)) {
        return;
      }
      const errorMessage = err instanceof Error ? err.message : t('common.unknown_error');
      const errorMessageObj: ChatMessageItem = {
        id: `msg-${++messageCounter}`,
        role: 'assistant',
        content: `**${t('playground.error')}**: ${errorMessage}`,
      };
      setMessages((prev) => [...prev, errorMessageObj]);
    } finally {
      setLoading(false);
      setAbortController(null);
    }
  }, [
    input,
    loading,
    loadingModels,
    selectedModel,
    systemPrompt,
    temperature,
    messages,
    t,
    apiBase,
    playgroundApiKey,
  ]);

  const handleStop = useCallback(() => {
    abortController?.abort();
  }, [abortController]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend]
  );

  const handleClear = useCallback(() => {
    setMessages([]);
  }, []);

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>{t('playground.title')}</h1>
        <div className={styles.controls}>
          <div className={styles.modelSelect}>
            <ModelSelector
              value={selectedModel}
              groups={modelGroups}
              onChange={setSelectedModel}
              placeholder={t('playground.select_model')}
              disabled={loading || loadingModels}
            />
          </div>
          <div className={styles.tempControl}>
            <TemperatureControl
              value={temperature}
              onChange={setTemperature}
              disabled={loading || loadingModels}
            />
          </div>
          <div className={styles.systemPromptBtn}>
            <SystemPromptDialog
              open={systemPromptDialogOpen}
              value={systemPrompt}
              onChange={setSystemPrompt}
              onOpen={() => setSystemPromptDialogOpen(true)}
              onClose={() => setSystemPromptDialogOpen(false)}
            />
          </div>
        </div>
      </div>

      <div className={styles.messages}>
        {messages.length === 0 ? (
          <div className={styles.empty}>
            <div className={styles.emptyIcon}>
              <svg
                width="48"
                height="48"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
            </div>
            <p className={styles.emptyTitle}>{t('playground.empty_title')}</p>
            <p className={styles.emptyDesc}>{t('playground.empty_desc')}</p>
          </div>
        ) : (
          messages.map((msg) => (
            <ChatMessage
              key={msg.id}
              role={msg.role}
              content={msg.content}
              tokenCount={msg.tokenCount}
            />
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className={styles.inputArea}>
        <div className={styles.inputWrap}>
          <textarea
            ref={textareaRef}
            className={styles.textarea}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t('playground.input_placeholder')}
            disabled={loading || loadingModels}
            rows={1}
          />
        </div>
        <div className={styles.inputActions}>
          <div className={styles.inputActionsLeft}>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClear}
              disabled={loading || messages.length === 0}
            >
              {t('playground.clear_chat')}
            </Button>
          </div>
          <div className={styles.inputActionsRight}>
            {loading ? (
              <Button variant="danger" size="sm" onClick={handleStop}>
                <IconStop size={14} />
                {t('playground.stop')}
              </Button>
            ) : (
              <Button
                variant="primary"
                size="sm"
                onClick={handleSend}
                disabled={!input.trim() || !selectedModel || loadingModels}
              >
                <IconSend size={14} />
                {t('playground.send')}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
