import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { submitFeedback } from '../../lib/firestore';
import { useBecomingStore } from '../../store/useBecomingStore';

export function FeedbackModal({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
  const [content, setContent] = useState('');
  const [type, setType] = useState<'general' | 'bug' | 'suggestion'>('general');
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  
  const { user } = useBecomingStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || !user) return;
    
    setStatus('submitting');
    setErrorMessage('');
    
    try {
      await submitFeedback(user.uid, content, type);
      setStatus('success');
      setTimeout(() => {
        onClose();
        setStatus('idle');
        setContent('');
      }, 2000);
    } catch (err: any) {
      console.error(err);
      setStatus('error');
      setErrorMessage(err.message || 'Failed to submit feedback. Please try again later.');
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-[1rem]">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-[#000000] opacity-80 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="relative bg-[var(--bg2)] border border-[var(--border)] p-[1.5rem] md:p-[2rem] w-full max-w-md rounded-[var(--r)] shadow-2xl"
          >
            <h2 className="font-serif text-[1.4rem] font-light text-[var(--text)] mb-[0.2rem]">Feedback</h2>
            <p className="font-sans text-[0.95rem] text-[var(--muted)] mb-[1.5rem]">Help us improve the Becoming experience.</p>
            
            {status === 'success' ? (
              <div className="py-[2rem] text-center text-[#4ade80]">
                Thank you for your feedback!
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="flex flex-col gap-[1rem]">
                <div className="flex gap-[0.5rem]">
                  {(['general', 'suggestion', 'bug'] as const).map(t => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setType(t)}
                      className={`flex-1 py-[0.5rem] text-[10px] uppercase font-mono tracking-[0.1em] border transition-colors rounded-[var(--rs)] ${
                        type === t 
                          ? 'border-[var(--text)] text-[var(--text)] bg-[rgba(255,255,255,0.05)]' 
                          : 'border-[var(--border)] text-[var(--muted)] hover:text-[var(--text)]'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
                
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="What's on your mind?"
                  className="w-full h-[8rem] bg-[var(--bg)] border border-[var(--border)] p-[0.75rem] text-[var(--text)] placeholder-[var(--muted)] focus:outline-none focus:border-[var(--text)] resize-none rounded-[var(--rs)] font-sans text-[0.95rem]"
                  required
                />
                
                {status === 'error' && (
                  <div className="text-[#f87171] text-[0.85rem]">{errorMessage}</div>
                )}
                
                <div className="flex gap-[0.75rem] justify-end mt-[0.5rem]">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-[1rem] py-[0.5rem] text-[0.9rem] text-[var(--muted)] hover:text-[var(--text)] transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={status === 'submitting' || !content.trim()}
                    className="px-[1.5rem] py-[0.5rem] bg-[var(--text)] text-[#000] text-[0.9rem] font-medium hover:bg-[#ccc] disabled:opacity-50 transition-colors rounded-[var(--rs)]"
                  >
                    {status === 'submitting' ? 'Submitting...' : 'Submit'}
                  </button>
                </div>
              </form>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
