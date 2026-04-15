import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
} from 'react';
import { useTranslation } from 'react-i18next';
import { useConfigStore } from '@/stores';
import { apiCallApi, getApiCallErrorMessage } from '@/services/api/apiCall';
import { apiKeysApi } from '@/services/api/apiKeys';
import { buildOpenAIChatCompletionsEndpoint } from '@/components/providers/utils';
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

interface ChatMessageItem {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  tokenCount?: number;
}

let messageCounter = 0;

const buildModelGroups = (config: ReturnType<typeof useConfigStore.getState>['config']): ModelGroup[] => {
  const groups: ModelGroup[] = [];

  // Gemini
  if (config?.geminiApiKeys?.length) {
    const models = new Set<string>();
    for (const key of config.geminiApiKeys) {
      if (key.models) {
        for (const m of key.models) {
          models.add(m.name);
        }
      }
    }
    if (models.size > 0) {
      groups.push({ provider: 'Gemini', models: Array.from(models).sort() });
    }
  }

  // Codex
  if (config?.codexApiKeys?.length) {
    const models = new Set<string>();
    for (const key of config.codexApiKeys) {
      if (key.models) {
        for (const m of key.models) {
          models.add(m.name);
        }
      }
    }
    if (models.size > 0) {
      groups.push({ provider: 'Codex', models: Array.from(models).sort() });
    }
  }

  // Claude
  if (config?.claudeApiKeys?.length) {
    const models = new Set<string>();
    for (const key of config.claudeApiKeys) {
      if (key.models) {
        for (const m of key.models) {
          models.add(m.name);
        }
      }
    }
    if (models.size > 0) {
      groups.push({ provider: 'Claude', models: Array.from(models).sort() });
    }
  }

  // Vertex
  if (config?.vertexApiKeys?.length) {
    const models = new Set<string>();
    for (const key of config.vertexApiKeys) {
      if (key.models) {
        for (const m of key.models) {
          models.add(m.name);
        }
      }
    }
    if (models.size > 0) {
      groups.push({ provider: 'Vertex', models: Array.from(models).sort() });
    }
  }

  // OpenAI Compatible
  if (config?.openaiCompatibility?.length) {
    for (const provider of config.openaiCompatibility) {
      const models = new Set<string>();
      if (provider.models) {
        for (const m of provider.models) {
          models.add(m.name);
        }
      }
      if (models.size > 0) {
        groups.push({ provider: provider.name, models: Array.from(models).sort() });
      }
    }
  }

  return groups;
};

export function PlaygroundPage() {
  const { t } = useTranslation();
  const config = useConfigStore((state) => state.config);
  const fetchConfig = useConfigStore((state) => state.fetchConfig);

  const [messages, setMessages] = useState<ChatMessageItem[]>([]);
  const [input, setInput] = useState('');
  const [selectedModel, setSelectedModel] = useState('');
  const [temperature, setTemperature] = useState(0.7);
  const [systemPrompt, setSystemPrompt] = useState('');
  const [systemPromptDialogOpen, setSystemPromptDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [abortController, setAbortController] = useState<AbortController | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const modelGroups = buildModelGroups(config);

  useEffect(() => {
    fetchConfig().catch(() => {});
  }, [fetchConfig]);

  // Auto-select first model when groups change
  useEffect(() => {
    if (!selectedModel && modelGroups.length > 0 && modelGroups[0].models.length > 0) {
      setSelectedModel(modelGroups[0].models[0]);
    }
  }, [modelGroups, selectedModel]);

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
    if (!text || loading || !selectedModel) return;

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
      // Find the provider base URL for the selected model
      let baseUrl = '';
      let apiKey = '';
      const cfg = useConfigStore.getState().config;

      // Search through all providers for the model
      const searchModel = (models: Array<{ name: string }> | undefined): boolean => {
        if (!models) return false;
        return models.some((m) => m.name === selectedModel);
      };

      // Check Gemini
      if (!baseUrl && cfg?.geminiApiKeys) {
        for (const k of cfg.geminiApiKeys) {
          if (searchModel(k.models)) {
            baseUrl = k.baseUrl || 'https://generativelanguage.googleapis.com';
            apiKey = k.apiKey;
            break;
          }
        }
      }

      // Check Codex
      if (!baseUrl && cfg?.codexApiKeys) {
        for (const k of cfg.codexApiKeys) {
          if (searchModel(k.models)) {
            baseUrl = k.baseUrl!;
            apiKey = k.apiKey;
            break;
          }
        }
      }

      // Check Claude
      if (!baseUrl && cfg?.claudeApiKeys) {
        for (const k of cfg.claudeApiKeys) {
          if (searchModel(k.models)) {
            baseUrl = k.baseUrl || 'https://api.anthropic.com';
            apiKey = k.apiKey;
            break;
          }
        }
      }

      // Check Vertex
      if (!baseUrl && cfg?.vertexApiKeys) {
        for (const k of cfg.vertexApiKeys) {
          if (searchModel(k.models)) {
            baseUrl = k.baseUrl!;
            apiKey = k.apiKey;
            break;
          }
        }
      }

      // Check OpenAI Compatible
      if (!baseUrl && cfg?.openaiCompatibility) {
        for (const provider of cfg.openaiCompatibility) {
          if (searchModel(provider.models)) {
            baseUrl = provider.baseUrl;
            apiKey = provider.apiKeyEntries?.[0]?.apiKey || '';
            break;
          }
        }
      }

      if (!baseUrl) {
        throw new Error(t('playground.provider_not_found'));
      }

      // Prefer API keys managed by backend config management (/api-keys).
      // Fallback to provider-specific key if managed keys are not available.
      try {
        const managedKeys = await apiKeysApi.list();
        const primaryManagedKey = managedKeys.find((key) => key.trim());
        if (primaryManagedKey) {
          apiKey = primaryManagedKey.trim();
        }
      } catch {
        // Keep provider-level fallback key when /api-keys is unavailable.
      }

      if (!apiKey) {
        throw new Error(t('notification.openai_test_key_required'));
      }

      const endpoint = buildOpenAIChatCompletionsEndpoint(baseUrl);

      const requestBody = {
        model: selectedModel,
        messages: apiMessages,
        temperature,
      };

      const result = await apiCallApi.request({
        method: 'POST',
        url: endpoint,
        header: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        data: JSON.stringify(requestBody),
      });

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
        const usage = (body as Record<string, unknown>).usage as Record<string, unknown> | undefined;
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
    } catch (err) {
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
  }, [input, loading, selectedModel, systemPrompt, temperature, messages, t]);

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
              disabled={loading}
            />
          </div>
          <div className={styles.tempControl}>
            <TemperatureControl
              value={temperature}
              onChange={setTemperature}
              disabled={loading}
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
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
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
            disabled={loading}
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
                disabled={!input.trim() || !selectedModel}
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
