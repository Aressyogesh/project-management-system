import { useState, useEffect } from 'react';
import { AiAssistantButton } from './AiAssistantButton';
import { AiAssistantPanel } from './AiAssistantPanel';
import { useAuthStore } from '../../../store/authStore';

export function AiAssistant() {
  const [open, setOpen] = useState(false);
  const [greeted, setGreeted] = useState(false);
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    if (open && !greeted && user?.fullName) {
      setGreeted(true);
    }
  }, [open, greeted, user]);

  if (!user) return null;

  return (
    <>
      <AiAssistantButton onClick={() => setOpen((v) => !v)} />
      {open && (
        <AiAssistantPanel
          onClose={() => setOpen(false)}
          userName={user.fullName}
          greetOnMount={!greeted}
        />
      )}
    </>
  );
}
