import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { IconEdit } from '@/components/ui/icons';

interface SystemPromptDialogProps {
  open: boolean;
  value: string;
  onChange: (value: string) => void;
  onOpen: () => void;
  onClose: () => void;
}

export function SystemPromptDialog({ open, value, onChange, onOpen, onClose }: SystemPromptDialogProps) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState(value);

  const handleOpen = useCallback(() => {
    setDraft(value);
    onOpen();
  }, [onOpen, value]);

  const handleSave = useCallback(() => {
    onChange(draft);
    onClose();
  }, [draft, onChange, onClose]);

  return (
    <>
      <button
        type="button"
        className="btn btn-ghost btn-sm"
        onClick={handleOpen}
        title={t('playground.edit_system_prompt')}
      >
        <IconEdit size={14} />
        <span>{t('playground.system_prompt')}</span>
      </button>
      <Modal
        open={open}
        title={t('playground.edit_system_prompt')}
        onClose={onClose}
        width={560}
        footer={
          <>
            <Button variant="secondary" onClick={onClose}>
              {t('common.cancel')}
            </Button>
            <Button variant="primary" onClick={handleSave}>
              {t('common.save')}
            </Button>
          </>
        }
      >
        <textarea
          className="system-prompt-textarea"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={t('playground.system_prompt_placeholder')}
          rows={12}
        />
      </Modal>
    </>
  );
}
