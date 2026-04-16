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
}

export function ChatMessage({ role, content, tokenCount }: ChatMessageProps) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);

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
          {role === 'user' ? (
            <div className={styles.userText}>{content}</div>
          ) : (
            <ReactMarkdown>{content}</ReactMarkdown>
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
          >
            <IconCopy size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
