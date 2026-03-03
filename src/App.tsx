import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, 
  Sparkles, 
  Trash2, 
  Download, 
  Settings, 
  Layers, 
  Image as ImageIcon, 
  Loader2, 
  AlertCircle,
  CheckCircle2,
  X,
  ChevronRight,
  Maximize2
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { cn } from './lib/utils';
import { generateImage, type ImageGenerationConfig, type GeneratedImage } from './services/gemini';

declare global {
  interface Window {
    aistudio: {
      hasSelectedApiKey: () => Promise<boolean>;
      openSelectKey: () => Promise<void>;
    };
  }
}

const ASPECT_RATIOS = ["1:1", "3:4", "4:3", "9:16", "16:9", "1:4", "1:8", "4:1", "8:1"] as const;
const MODELS = [
  { id: "gemini-2.5-flash-image", name: "Gemini 2.5 Flash" },
  { id: "gemini-3.1-flash-image-preview", name: "Gemini 3.1 Flash (HQ)" }
] as const;

export default function App() {
  const [prompts, setPrompts] = useState<string[]>(['']);
  const [config, setConfig] = useState<ImageGenerationConfig>({
    model: "gemini-2.5-flash-image",
    aspectRatio: "1:1",
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [results, setResults] = useState<GeneratedImage[]>([]);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [error, setError] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<GeneratedImage | null>(null);
  const [hasApiKey, setHasApiKey] = useState<boolean>(true);

  useEffect(() => {
    const checkKey = async () => {
      // Retry a few times if window.aistudio is not yet available
      let attempts = 0;
      const maxAttempts = 5;
      
      const poll = async () => {
        if (window.aistudio?.hasSelectedApiKey) {
          const selected = await window.aistudio.hasSelectedApiKey();
          setHasApiKey(selected);
          return true;
        }
        return false;
      };

      if (!(await poll())) {
        const interval = setInterval(async () => {
          attempts++;
          if (await poll() || attempts >= maxAttempts) {
            clearInterval(interval);
          }
        }, 500);
      }
    };
    checkKey();
  }, []);

  const handleOpenKeyDialog = async () => {
    if (window.aistudio?.openSelectKey) {
      await window.aistudio.openSelectKey();
      setHasApiKey(true);
    }
  };

  const handleAddPrompt = () => setPrompts([...prompts, '']);
  
  const handleUpdatePrompt = (index: number, value: string) => {
    const newPrompts = [...prompts];
    newPrompts[index] = value;
    setPrompts(newPrompts);
  };

  const handleRemovePrompt = (index: number) => {
    if (prompts.length > 1) {
      setPrompts(prompts.filter((_, i) => i !== index));
    } else {
      setPrompts(['']);
    }
  };

  const handleClearAll = () => {
    setPrompts(['']);
    setError(null);
  };

  const handleBulkGenerate = async () => {
    const validPrompts = prompts.filter(p => p.trim().length > 0);
    if (validPrompts.length === 0) {
      setError("Please enter at least one prompt.");
      return;
    }

    setIsGenerating(true);
    setError(null);
    setProgress({ current: 0, total: validPrompts.length });

    const newResults: GeneratedImage[] = [];

    for (let i = 0; i < validPrompts.length; i++) {
      const prompt = validPrompts[i];
      try {
        setProgress(prev => ({ ...prev, current: i + 1 }));
        
        // Add a small delay between requests to be more respectful of rate limits
        if (i > 0) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }

        const imageUrl = await generateImage(prompt, config);
        
        const result: GeneratedImage = {
          id: Math.random().toString(36).substring(7),
          prompt: prompt,
          url: imageUrl,
          timestamp: Date.now(),
          config: { ...config }
        };
        
        newResults.unshift(result);
        setResults(prev => [result, ...prev]);
      } catch (err: any) {
        console.error(`Error generating image for prompt "${prompt}":`, err);
        if (err.message === "AUTH_REQUIRED") {
          setHasApiKey(false);
          setError("Authentication required. Please select a valid API key.");
          setIsGenerating(false);
          return;
        }
        if (err.message === "RATE_LIMIT_EXCEEDED") {
          setError("Rate limit exceeded. Please wait a few moments and try again.");
          setIsGenerating(false);
          return;
        }
        setError(`Failed to generate: ${err.message || 'Unknown error'}`);
      }
    }

    setIsGenerating(false);
    if (newResults.length === validPrompts.length) {
      confetti({
        particleCount: 150,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#00FF00', '#000000', '#FFFFFF']
      });
    }
  };

  const downloadImage = (url: string, filename: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = `${filename.slice(0, 20)}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-gallery-white flex flex-col font-sans">
      {/* Marquee Header */}
      <div className="bg-brutal-black text-neon-green py-2 overflow-hidden whitespace-nowrap border-b border-brutal-black">
        <div className="flex animate-marquee">
          {Array(10).fill(0).map((_, i) => (
            <span key={i} className="mx-8 font-mono text-xs uppercase tracking-widest font-bold">
              Salmoskie • Mass Production Mode • Gemini Powered • Creative Engine • 
            </span>
          ))}
        </div>
      </div>

      <main className="flex-1 grid grid-cols-1 lg:grid-cols-[450px_1fr] h-[calc(100vh-33px)] relative">
        {/* API Key Selection Overlay */}
        {!hasApiKey && config.model.includes('3.1') && (
          <div className="absolute inset-0 z-40 bg-white/80 backdrop-blur-md flex items-center justify-center p-8">
            <div className="max-w-md w-full border-4 border-brutal-black bg-white p-8 shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] text-center space-y-6">
              <div className="w-20 h-20 bg-neon-green border-4 border-brutal-black flex items-center justify-center mx-auto">
                <AlertCircle size={40} />
              </div>
              <div className="space-y-2">
                <h2 className="font-display text-3xl uppercase">Key Required</h2>
                <p className="font-mono text-sm text-gray-600">
                  To use high-quality image generation, you must select a paid API key from your Google Cloud project.
                </p>
              </div>
              <div className="space-y-4">
                <button 
                  onClick={handleOpenKeyDialog}
                  className="w-full py-4 bg-neon-green border-2 border-brutal-black font-display text-xl uppercase hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all"
                >
                  Select API Key
                </button>
                <a 
                  href="https://ai.google.dev/gemini-api/docs/billing" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="block font-mono text-[10px] uppercase underline hover:text-neon-green"
                >
                  Learn about billing & keys
                </a>
              </div>
            </div>
          </div>
        )}

        {/* Sidebar: Controls */}
        <div className="border-r border-brutal-black flex flex-col h-full bg-white">
          <div className="p-6 border-b border-brutal-black">
            <h1 className="font-display text-5xl uppercase leading-none mb-2">Salmoskie</h1>
            <p className="text-xs font-mono text-gray-500 uppercase tracking-tighter">Automated Visual Synthesis v1.0</p>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
            {/* Configuration */}
            <section className="space-y-4">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest">
                <Settings size={14} />
                <span>Engine Parameters</span>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1">Model Selection</label>
                  <select 
                    value={config.model}
                    onChange={(e) => setConfig({ ...config, model: e.target.value as any })}
                    className="w-full border border-brutal-black p-2 bg-white font-mono text-sm focus:outline-none focus:ring-2 focus:ring-neon-green"
                  >
                    {MODELS.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1">Aspect Ratio</label>
                  <div className="grid grid-cols-3 gap-2">
                    {ASPECT_RATIOS.map(ratio => (
                      <button
                        key={ratio}
                        onClick={() => setConfig({ ...config, aspectRatio: ratio })}
                        className={cn(
                          "border border-brutal-black p-2 text-xs font-mono transition-colors",
                          config.aspectRatio === ratio ? "bg-brutal-black text-neon-green" : "hover:bg-gray-100"
                        )}
                      >
                        {ratio}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            {/* Prompts */}
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest">
                  <Layers size={14} />
                  <span>Prompt Queue</span>
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={handleClearAll}
                    className="p-1 hover:bg-red-50 text-gray-400 hover:text-red-600 border border-transparent hover:border-red-200 transition-colors"
                    title="Clear All"
                  >
                    <Trash2 size={16} />
                  </button>
                  <button 
                    onClick={handleAddPrompt}
                    className="p-1 hover:bg-neon-green border border-brutal-black transition-colors"
                    title="Add Prompt"
                  >
                    <Plus size={16} />
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                <AnimatePresence initial={false}>
                  {prompts.map((prompt, index) => (
                    <motion.div 
                      key={index}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      className="group relative"
                    >
                      <div className="absolute -left-4 top-3 text-[10px] font-mono text-gray-300 font-bold">
                        {(index + 1).toString().padStart(2, '0')}
                      </div>
                      <div className="flex gap-2">
                        <textarea
                          value={prompt}
                          onChange={(e) => handleUpdatePrompt(index, e.target.value)}
                          placeholder="Enter visual description..."
                          className="flex-1 border border-brutal-black p-3 text-sm font-mono min-h-[80px] resize-none focus:outline-none focus:ring-2 focus:ring-neon-green bg-gray-50 group-hover:bg-white transition-colors"
                        />
                        <button 
                          onClick={() => handleRemovePrompt(index)}
                          className="opacity-0 group-hover:opacity-100 p-2 text-gray-400 hover:text-red-600 transition-all"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </section>
          </div>

          {/* Action Footer */}
          <div className="p-6 border-t border-brutal-black bg-white">
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 text-xs flex items-center gap-2">
                <AlertCircle size={14} />
                {error}
              </div>
            )}
            
            <button
              onClick={handleBulkGenerate}
              disabled={isGenerating}
              className={cn(
                "w-full py-4 border-2 border-brutal-black font-display text-2xl uppercase tracking-wider transition-all flex items-center justify-center gap-3",
                isGenerating 
                  ? "bg-gray-100 cursor-not-allowed" 
                  : "bg-neon-green hover:translate-x-[-4px] hover:translate-y-[-4px] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-x-0 active:translate-y-0 active:shadow-none"
              )}
            >
              {isGenerating ? (
                <>
                  <Loader2 className="animate-spin" />
                  <span>Synthesizing ({progress.current}/{progress.total})</span>
                </>
              ) : (
                <>
                  <Sparkles size={24} />
                  <span>Generate All</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Main Content: Gallery */}
        <div className="bg-gray-100 overflow-y-auto p-8 custom-scrollbar relative">
          {results.length === 0 && !isGenerating ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-400 space-y-4">
              <div className="w-24 h-24 border-2 border-dashed border-gray-300 rounded-full flex items-center justify-center">
                <ImageIcon size={40} className="opacity-20" />
              </div>
              <div className="text-center">
                <h3 className="font-display text-2xl uppercase">No Output Detected</h3>
                <p className="font-mono text-xs">Awaiting prompt injection and synthesis...</p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              <AnimatePresence>
                {results.map((img) => (
                  <motion.div
                    key={img.id}
                    layout
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="group bg-white border border-brutal-black overflow-hidden hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] transition-all"
                  >
                    <div className="relative aspect-square bg-gray-200 overflow-hidden cursor-zoom-in" onClick={() => setSelectedImage(img)}>
                      <img 
                        src={img.url} 
                        alt={img.prompt}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute inset-0 bg-brutal-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                        <button 
                          onClick={(e) => { e.stopPropagation(); downloadImage(img.url, img.prompt); }}
                          className="p-3 bg-neon-green border border-brutal-black hover:scale-110 transition-transform"
                        >
                          <Download size={20} />
                        </button>
                        <button 
                          onClick={(e) => { e.stopPropagation(); setSelectedImage(img); }}
                          className="p-3 bg-white border border-brutal-black hover:scale-110 transition-transform"
                        >
                          <Maximize2 size={20} />
                        </button>
                      </div>
                    </div>
                    <div className="p-4 border-t border-brutal-black">
                      <p className="text-xs font-mono line-clamp-2 min-h-[2.5rem] mb-2">{img.prompt}</p>
                      <div className="flex items-center justify-between text-[10px] font-mono text-gray-400 uppercase">
                        <span>{img.config.aspectRatio} • {img.config.model.includes('3.1') ? 'HQ' : 'Standard'}</span>
                        <span>{new Date(img.timestamp).toLocaleTimeString()}</span>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      </main>

      {/* Image Modal */}
      <AnimatePresence>
        {selectedImage && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-brutal-black/90 backdrop-blur-sm flex items-center justify-center p-4 md:p-12"
            onClick={() => setSelectedImage(null)}
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white border-4 border-neon-green max-w-5xl w-full max-h-full overflow-hidden flex flex-col md:flex-row"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex-1 bg-gray-100 flex items-center justify-center overflow-hidden">
                <img 
                  src={selectedImage.url} 
                  alt={selectedImage.prompt}
                  className="max-w-full max-h-[70vh] md:max-h-full object-contain"
                  referrerPolicy="no-referrer"
                />
              </div>
              <div className="w-full md:w-80 p-8 border-t md:border-t-0 md:border-l-4 border-neon-green flex flex-col">
                <div className="flex justify-between items-start mb-6">
                  <h2 className="font-display text-3xl uppercase leading-none">Metadata</h2>
                  <button onClick={() => setSelectedImage(null)} className="hover:text-neon-green transition-colors">
                    <X size={24} />
                  </button>
                </div>
                
                <div className="flex-1 space-y-6 overflow-y-auto custom-scrollbar pr-2">
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-gray-400 mb-2">Prompt</label>
                    <p className="font-mono text-sm leading-relaxed">{selectedImage.prompt}</p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1">Ratio</label>
                      <p className="font-mono text-xs">{selectedImage.config.aspectRatio}</p>
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1">Model</label>
                      <p className="font-mono text-xs truncate">{selectedImage.config.model.split('-')[1]}</p>
                    </div>
                  </div>
                </div>

                <button 
                  onClick={() => downloadImage(selectedImage.url, selectedImage.prompt)}
                  className="mt-8 w-full py-3 bg-brutal-black text-neon-green font-display text-xl uppercase tracking-wider hover:bg-neon-green hover:text-brutal-black transition-colors flex items-center justify-center gap-2"
                >
                  <Download size={20} />
                  Download
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #000;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #00FF00;
        }
      `}</style>
    </div>
  );
}
