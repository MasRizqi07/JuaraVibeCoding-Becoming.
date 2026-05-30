import { useState, useRef, useEffect } from "react";
import { useBecomingStore } from "../../../../store/useBecomingStore";
import html2canvas from "html2canvas";
import { PanelLoader } from "./PanelLoader";
import { SectionSummary } from "./SectionSummary";
import { Twitter, Linkedin } from "lucide-react";

export default function SharePanel() {
  const { result, user } = useBecomingStore();
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const cardRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    const t = setTimeout(() => setIsLoading(false), 500);
    return () => clearTimeout(t);
  }, []);

  if (!result || !user) return null;
  if (isLoading) return <PanelLoader title="Rendering Identity Card..." />;
  const { shareCard, sectionSummaries } = result;

  const handleDownload = async () => {
    if (!cardRef.current) return;
    setIsGenerating(true);
    try {
      const canvas = await html2canvas(cardRef.current, {
        scale: 3,
        logging: false,
        useCORS: true,
        backgroundColor: "#000"
      });
      const dataUrl = canvas.toDataURL("image/png");
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `becoming-identity-${user.displayName.replace(/\s+/g, '-').toLowerCase()}.png`;
      a.click();
    } catch (e) {
      console.error("Capture failed", e);
    } finally {
      setIsGenerating(false);
    }
  };

  const shareUrl = `https://becoming.app/card/${result.sessionId}`;
  const shareText = `My deep reflection analysis:\n\n"${shareCard.tagline}"\n\nArchetype: ${shareCard.archetype}\n\n`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    alert("Link copied to clipboard (Demo)");
  };

  const shareNative = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Becoming. Profile",
          text: shareText,
          url: shareUrl,
        });
      } catch (err) {
        console.error("Share failed", err);
      }
    } else {
      handleCopyLink();
    }
  };

  const shareTwitter = () => {
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`;
    window.open(url, "_blank");
  };

  const shareLinkedIn = () => {
    const url = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`;
    window.open(url, "_blank");
  };

  return (
    <>
      {sectionSummaries && <SectionSummary summary={sectionSummaries.share} />}
      <p className="font-mono text-[10px] tracking-[0.3em] uppercase text-[var(--gold)] mb-[0.5rem]">Network</p>
      <h2 className="font-serif text-[1.9rem] font-light text-[var(--text)] mb-[2rem] leading-[1.2]">
        Declare your trajectory.
      </h2>
      
      <div className="bg-[var(--bg2)] border border-[var(--border)] p-[3rem] rounded-[var(--r)] text-center mb-[1.5rem]">
        <p className="text-[13px] color-[var(--muted)] mb-[2rem]">This is your identity card.</p>
        
        {/* The Card */}
        <div 
          ref={cardRef} 
          className="max-w-[300px] mx-auto bg-[#000] border border-[var(--border)] aspect-[3/4] flex flex-col justify-between p-[2rem] text-left relative overflow-hidden"
        >
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-[var(--muted)] mb-[0.5rem]">Archetype</p>
            <h3 className="font-sans text-[1.4rem] font-light leading-[1.2] text-[var(--text)] tracking-[-0.02em]">
              {shareCard.archetype}
            </h3>
          </div>
          <div>
            <div className="flex justify-between border-b border-[var(--border)] pb-[0.5rem] mb-[0.5rem] font-mono text-[10px] uppercase tracking-[0.1em] text-[var(--text)]">
              <span className="text-[var(--muted)]">Readiness</span><span>{shareCard.aiReadiness}%</span>
            </div>
            <div className="flex justify-between border-b border-[var(--border)] pb-[0.5rem] mb-[0.5rem] font-mono text-[10px] uppercase tracking-[0.1em] text-[var(--text)]">
              <span className="text-[var(--muted)]">Velocity</span><span>{shareCard.growthPotential}</span>
            </div>
          </div>
          <p className="font-serif text-[1.2rem] italic text-[var(--text)]">
            "{shareCard.tagline || "I stopped waiting for the perfect moment."}"
          </p>
          <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-[var(--gold)]">
            Becoming.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-[1rem] justify-center mb-[2rem]">
        <button 
          onClick={handleDownload} 
          disabled={isGenerating}
          className="bg-[var(--text)] text-[#000] border-none p-[0.8rem_2rem] rounded-[var(--rs)] text-[13px] font-medium cursor-pointer transition-opacity hover:opacity-90"
        >
          {isGenerating ? "Capturing..." : "Download"}
        </button>
        <button 
          onClick={shareNative} 
          className="bg-transparent text-[var(--text)] border border-[var(--border)] p-[0.8rem_2rem] rounded-[var(--rs)] text-[13px] font-normal cursor-pointer transition-colors hover:bg-[var(--bg3)]"
        >
          Share link
        </button>
      </div>

      <div className="flex gap-[1rem] justify-center">
        <button 
          onClick={shareTwitter}
          className="flex items-center gap-[0.5rem] bg-[var(--bg2)] text-[var(--text)] border border-[var(--border)] p-[0.6rem_1.5rem] rounded-[var(--rs)] text-[13px] font-normal cursor-pointer hover:bg-[var(--bg3)] transition-colors"
        >
          <Twitter size={16} /> Twitter
        </button>
        <button 
          onClick={shareLinkedIn}
          className="flex items-center gap-[0.5rem] bg-[var(--bg2)] text-[var(--text)] border border-[var(--border)] p-[0.6rem_1.5rem] rounded-[var(--rs)] text-[13px] font-normal cursor-pointer hover:bg-[var(--bg3)] transition-colors"
        >
          <Linkedin size={16} /> LinkedIn
        </button>
      </div>
    </>
  );
}
