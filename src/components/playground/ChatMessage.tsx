import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import ReactMarkdown from 'react-markdown';
import { IconCopy, IconUser, IconBot } from '@/components/ui/icons';
import { copyToClipboard } from '@/utils/clipboard';
import styles from './ChatMessage.module.scss';

interface ChatMessageProps {
  role: 'user' | 'assistant';
  content: string;
  tokenCount?: number;
  typing?: boolean;
}

const THINK_BLOCK_RE = /<think>([\s\S]*?)<\/think>/gi;

const extractThinkBlocks = (input: string): { reasoning: string[]; visibleContent: string } => {
  const reasoning: string[] = [];
  const visibleContent = input.replace(THINK_BLOCK_RE, (_full, block: string) => {
    const trimmed = String(block ?? '').trim();
    if (trimmed) reasoning.push(trimmed);
    return '';
  });

  return {
    reasoning,
    visibleContent: visibleContent.trim(),
  };
};

export function ChatMessage({ role, content, tokenCount, typing = false }: ChatMessageProps) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);
  const [reasoningExpanded, setReasoningExpanded] = useState(false);
  const { reasoning, visibleContent } = extractThinkBlocks(content);

  const handleCopy = useCallback(async () => {
    await copyToClipboard(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [content]);

  return (
    <div className={`${styles.message} ${role === 'user' ? styles.user : styles.assistant}`}>
      <div className={styles.avatar}>
        {role === 'user' ? (
          <IconUser size={18} />
        ) : (
          <IconBot size={18} />
        )}
      </div>
      <div className={styles.content}>
        <div className={styles.role}>
          {role === 'user' ? t('playground.you') : t('playground.assistant')}
        </div>
        <div className={styles.markdown}>
          {role === 'assistant' && reasoning.length > 0 && (
            <details
              className={styles.reasoning}
              open={reasoningExpanded}
              onToggle={(event) =>
                setReasoningExpanded((event.currentTarget as HTMLDetailsElement).open)
              }
            >
              <summary className={styles.reasoningSummary}>
                Reasoning ({reasoning.length})
              </summary>
              <div className={styles.reasoningBody}>
                {reasoning.map((block, index) => (
                  <pre key={`${index}-${block.slice(0, 24)}`}>{block}</pre>
                ))}
              </div>
            </details>
          )}
          {role === 'user' ? (
            <div className={styles.userText}>{content}</div>
          ) : typing && !visibleContent.trim() ? (
            <div className={styles.typingIndicator} aria-label={t('common.loading')}>
              <span className={styles.typingDot} />
              <span className={styles.typingDot} />
              <span className={styles.typingDot} />
            </div>
          ) : typing ? (
            <div className={styles.typingText}>
              {visibleContent}
              <span className={styles.typingCursor}>▍</span>
            </div>
          ) : (
            <ReactMarkdown>{visibleContent}</ReactMarkdown>
          )}
        </div>
        <div className={styles.footer}>
          {role === 'assistant' && tokenCount !== undefined && (
            <span className={styles.tokenBadge}>
              {t('playground.tokens')}: {tokenCount.toLocaleString()}
            </span>
          )}
          <button
            type="button"
            className={`${styles.copyBtn} ${copied ? styles.copyBtnCopied : ''}`}
            onClick={handleCopy}
            title={t('common.copy')}
            aria-label={t('common.copy')}
            disabled={!content.trim()}
          >
            <IconCopy size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
