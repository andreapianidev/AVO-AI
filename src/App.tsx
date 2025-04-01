import React, { useState, useRef, useEffect } from 'react';
import { Send, Globe, X, FileText, Image, ChevronDown, Mic, Check } from 'lucide-react';
import { Message, Language, DocumentFile } from './types';
import { ChatMessage } from './components/ChatMessage';
import { VoiceWaveform } from './components/VoiceWaveform';
import { DonateButton } from './components/DonateButton';
import { translations } from './i18n';
import { hasReachedDailyLimit, incrementDailyQuestions, getRemainingQuestions } from './utils/dailyLimit';
import * as tf from '@tensorflow/tfjs';
import '@tensorflow/tfjs-backend-webgl';
import * as mobilenet from '@tensorflow-models/mobilenet';

const API_KEY = 'YOUR-API-KEY';
const API_URL = 'https://api.deepseek.com/v1/chat/completions';
const MAX_FILES = 5;

const languageNames: Record<Language, string> = {
  en: 'English',
  es: 'Español',
  it: 'Italiano',
  fr: 'Français',
  de: 'Deutsch',
  pl: 'Polski',
  palmero: 'Palmero'
};

function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [cookiesAccepted, setCookiesAccepted] = useState(false);
  const [language, setLanguage] = useState<Language>(() => {
    // Prima controlliamo se c'è una lingua salvata nel localStorage
    const savedLanguage = localStorage.getItem('preferredLanguage') as Language;
    if (savedLanguage && Object.keys(translations).includes(savedLanguage)) {
      return savedLanguage;
    }
  
    const getSupportedLanguage = (browserLangs: string[]): Language => {
      console.log('Browser languages:', browserLangs);
      
      const normalizedLangs = browserLangs
        .map(lang => lang.toLowerCase().trim())
        .map(lang => lang.split('-')[0]);
      
      console.log('Normalized browser languages:', normalizedLangs);
      
      const supported = normalizedLangs.find(lang => 
        Object.keys(translations).includes(lang)
      ) as Language;
      
      console.log('Detected language:', supported || 'en');
      return supported || 'en';
    };
  
    const browserLangs = [
      navigator.language,
      ...(navigator.languages || [])
    ].filter(Boolean);
  
    return getSupportedLanguage(browserLangs);
  });
  const [documents, setDocuments] = useState<DocumentFile[]>([]);
  const [isLanguageMenuOpen, setIsLanguageMenuOpen] = useState(false);
  const [model, setModel] = useState<mobilenet.MobileNet | null>(null);
  const [isModelLoading, setIsModelLoading] = useState(true);
  const [isListening, setIsListening] = useState(false);
  const [audioStream, setAudioStream] = useState<MediaStream | null>(null);
  const [recognition, setRecognition] = useState<SpeechRecognition | null>(null);
  const [remainingQuestions, setRemainingQuestions] = useState(getRemainingQuestions());
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const languageMenuRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const strings = translations[language];

  useEffect(() => {
    if (recognition) {
      recognition.lang = language === 'en' ? 'en-US' : 
                        language === 'it' ? 'it-IT' : 
                        language === 'es' ? 'es-ES' :
                        language === 'fr' ? 'fr-FR' :
                        language === 'de' ? 'de-DE' :
                        language === 'pl' ? 'pl-PL' : 
                        language === 'palmero' ? 'es-ES' : 'en-US';
    }
  }, [language, recognition]);

  useEffect(() => {
    const loadModel = async () => {
      try {
        // Aggiungiamo un timeout più lungo per il caricamento del modello
        await tf.setBackend('webgl');
        console.log('TensorFlow backend set to WebGL');
        await tf.ready();
        console.log('TensorFlow ready');
        
        // Aggiungiamo un controllo per verificare se il backend è stato impostato correttamente
        const currentBackend = tf.getBackend();
        console.log('Current backend:', currentBackend);
        
        const loadedModel = await mobilenet.load({version: 1, alpha: 0.25});
        console.log('MobileNet model loaded successfully');
        setModel(loadedModel);
        setIsModelLoading(false);
      } catch (error) {
        console.error('Error loading MobileNet model:', error);
        // Proviamo con un backend alternativo in caso di errore
        try {
          console.log('Trying with CPU backend...');
          await tf.setBackend('cpu');
          await tf.ready();
          const loadedModel = await mobilenet.load({version: 1, alpha: 0.25});
          console.log('MobileNet model loaded successfully with CPU backend');
          setModel(loadedModel);
        } catch (fallbackError) {
          console.error('Fallback loading also failed:', fallbackError);
        } finally {
          setIsModelLoading(false);
        }
      }
    };
    loadModel();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (languageMenuRef.current && !languageMenuRef.current.contains(event.target as Node)) {
        setIsLanguageMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const startListening = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setAudioStream(stream);
      setIsListening(true);

      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        
        recognition.lang = language === 'en' ? 'en-US' : 
                          language === 'it' ? 'it-IT' : 
                          language === 'es' ? 'es-ES' :
                          language === 'fr' ? 'fr-FR' :
                          language === 'de' ? 'de-DE' :
                          language === 'pl' ? 'pl-PL' : 'en-US';

        recognition.onresult = (event) => {
          const transcript = Array.from(event.results)
            .map(result => result[0].transcript)
            .join('');
          setInput(transcript);
        };

        recognition.onerror = (event) => {
          console.error('Speech recognition error:', event.error);
          stopListening();
        };

        recognition.start();
        setRecognition(recognition);
      }
    } catch (error) {
      console.error('Error accessing microphone:', error);
    }
  };

  const stopListening = () => {
    if (audioStream) {
      audioStream.getTracks().forEach(track => track.stop());
      setAudioStream(null);
    }
    if (recognition) {
      recognition.stop();
      setRecognition(null);
    }
    setIsListening(false);
  };

  const handleVoiceCancel = () => {
    stopListening();
    setInput('');
  };

  const handleVoiceConfirm = () => {
    stopListening();
    if (input.trim()) {
      handleSubmit(new Event('submit') as any);
    }
  };

  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) {
      return <Image size={16} />;
    }
    return <FileText size={16} />;
  };

  const removeDocument = (index: number) => {
    const doc = documents[index];
    if (doc.preview) {
      URL.revokeObjectURL(doc.preview);
    }
    setDocuments(prev => prev.filter((_, i) => i !== index));
  };

  const analyzeImage = async (file: File): Promise<string> => {
    if (!model) {
      throw new Error('Image analysis model not loaded');
    }

    const img = document.createElement('img');
    const imageUrl = URL.createObjectURL(file);
    img.src = imageUrl;
    img.crossOrigin = 'anonymous';

    return new Promise((resolve, reject) => {
      img.onload = async () => {
        try {
          const predictions = await model.classify(img);
          URL.revokeObjectURL(imageUrl);
          const results = predictions
            .map(p => `${p.className} (${(p.probability * 100).toFixed(1)}%)`)
            .join(', ');
          resolve(results);
        } catch (error) {
          URL.revokeObjectURL(imageUrl);
          reject(error);
        }
      };
      img.onerror = () => {
        URL.revokeObjectURL(imageUrl);
        reject(new Error('Failed to load image'));
      };
    });
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>, isImage: boolean = false) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (documents.length >= MAX_FILES) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: strings.maxFilesReached
      }]);
      return;
    }

    const supportedTypes = isImage 
      ? ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
      : ['text/plain'];

    if (!supportedTypes.includes(file.type)) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: isImage 
          ? 'Sorry, only JPEG, PNG, GIF, and WebP images are supported.'
          : 'Sorry, only TXT files are supported.'
      }]);
      return;
    }

    try {
      let content = '';
      let preview: string | undefined;
      let analysis: string | undefined;

      if (file.type.startsWith('image/')) {
        if (isModelLoading) {
          setMessages(prev => [...prev, {
            role: 'assistant',
            content: 'Please wait while the image analysis model is loading...'
          }]);
          return;
        }
        preview = URL.createObjectURL(file);
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: strings.analyzing
        }]);
        analysis = await analyzeImage(file);
        content = `Image analysis results: ${analysis}`;
      } else {
        content = await file.text();
      }

      setDocuments(prev => [...prev, { 
        name: file.name, 
        content, 
        type: file.type,
        preview,
        analysis
      }]);
      
      if (file.type.startsWith('image/')) {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: `Image "${file.name}" has been analyzed. I detected: ${analysis}`
        }]);
      } else {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: `File "${file.name}" has been successfully uploaded and will be used as context for our conversation.`
        }]);
      }
    } catch (error: any) {
      console.error('Error processing file:', error);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `Sorry, I couldn't process the file "${file.name}". Error: ${error.message}`
      }]);
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    if (imageInputRef.current) {
      imageInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading || !termsAccepted || !cookiesAccepted) return;

    if (hasReachedDailyLimit()) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: strings.dailyLimitReached
      }]);
      return;
    }

    const userMessage: Message = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${API_KEY}`,
        },
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages: [
            {
              role: 'system',
              content: `You are AVO AI, an AI assistant specifically trained on the Canary Islands. You have extensive knowledge about the islands' culture, history, geography, tourism, and local customs. Always provide accurate and helpful information about the Canary Islands. ${language === 'palmero' ? 'Respond in a friendly, casual tone using the Palmero dialect from La Palma, Canary Islands. Use local expressions and a warm, familiar style.' : `Respond in ${language}.`} ${documents.length > 0 ? 'Use the following documents as additional context: ' + documents.map(d => d.content).join('\n') : ''}`
            },
            ...messages,
            userMessage
          ],
          temperature: language === 'palmero' ? 0.8 : 0.7, // Slightly higher temperature for more casual dialect
          max_tokens: 2000,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(
          errorData?.error?.message || 
          `API request failed with status ${response.status}`
        );
      }

      const data = await response.json();
      const assistantMessage: Message = {
        role: 'assistant',
        content: data.choices[0].message.content,
      };

      setMessages(prev => [...prev, assistantMessage]);
      const remaining = incrementDailyQuestions();
      setRemainingQuestions(remaining);
    } catch (error: any) {
      console.error('API Error:', error);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `Sorry, I encountered an error: ${error.message}. Please try again.`,
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const allPoliciesAccepted = termsAccepted && cookiesAccepted;

  return (
    <div className="flex flex-col min-h-[100dvh] bg-gray-900">
      <header className="bg-gray-800/80 backdrop-blur-sm border-b border-gray-700 px-4 py-3 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src="/avocado-logo.png" alt="AVO AI Logo" className="w-8 h-8" />
            <h1 className="text-xl font-semibold text-gray-100">AVO AI</h1>
          </div>
          <div className="relative" ref={languageMenuRef}>
            <button
              onClick={() => setIsLanguageMenuOpen(!isLanguageMenuOpen)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-gray-700/50 text-gray-300 hover:text-white transition-colors text-sm"
              aria-label={strings.languageSelector}
            >
              <Globe size={16} />
              <span>{languageNames[language]}</span>
              <ChevronDown size={14} className={`transition-transform ${isLanguageMenuOpen ? 'rotate-180' : ''}`} />
            </button>
            {isLanguageMenuOpen && (
              <div className="absolute right-0 mt-1 w-40 rounded-md bg-gray-800 shadow-lg ring-1 ring-black ring-opacity-5 z-50">
                <div className="py-1">
                  {(Object.entries(languageNames) as [Language, string][]).map(([code, name]) => (
                    <button
                      key={code}
                      onClick={() => {
                        setLanguage(code);
                        setIsLanguageMenuOpen(false);
                      }}
                      className={`block w-full text-left px-3 py-1.5 text-sm ${
                        language === code
                          ? 'bg-green-600 text-white'
                          : 'text-gray-300 hover:bg-gray-700'
                      }`}
                    >
                      {name}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {documents.length > 0 && (
        <div className="bg-gray-800/60 backdrop-blur-sm border-b border-gray-700 px-4 py-2">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-xs font-medium text-gray-400 mb-1.5">{strings.uploadedFiles}</h2>
            <div className="flex flex-wrap gap-1.5">
              {documents.map((doc, index) => (
                <div
                  key={index}
                  className="flex items-center gap-1.5 bg-gray-700/50 text-gray-300 px-2 py-1 rounded-md text-xs"
                >
                  {getFileIcon(doc.type)}
                  <span className="truncate max-w-[150px]">{doc.name}</span>
                  {doc.preview && (
                    <img
                      src={doc.preview}
                      alt={doc.name}
                      className="w-4 h-4 object-cover rounded"
                    />
                  )}
                  <button
                    onClick={() => removeDocument(index)}
                    className="text-gray-400 hover:text-gray-200 transition-colors"
                    aria-label={strings.removeFile}
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <main className="flex-1 overflow-y-auto p-4">
        <div className="max-w-3xl mx-auto space-y-4">
          {messages.length === 0 && (
            <div className="text-center py-10">
              <img src="/avocado-logo.png" alt="AVO AI Logo" className="w-20 h-20 mx-auto mb-4" />
              <h2 className="text-xl font-bold text-gray-100 mb-2">{strings.welcome}</h2>
              {language === 'palmero' ? (
                <p 
                  className="text-base text-gray-400 mb-6"
                  dangerouslySetInnerHTML={{ __html: strings.subtitle }}
                />
              ) : (
                <p className="text-base text-gray-400 mb-6">{strings.subtitle}</p>
              )}
              <div className="bg-gray-800/50 p-5 rounded-lg text-left max-w-xl mx-auto">
                <div className="space-y-3">
                  <label className="flex items-start gap-2 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={termsAccepted}
                      onChange={(e) => setTermsAccepted(e.target.checked)}
                      className="mt-0.5 h-4 w-4 rounded border-gray-600 text-green-500 focus:ring-green-500 focus:ring-offset-gray-900 transition-all"
                    />
                    <span className="text-sm text-gray-300 group-hover:text-gray-200 transition-colors">
                      {strings.acceptPrivacy}{' '}
                      <a
                        href="https://chatwithavo.avoagencylapalma.com/privacypolicy.html"
                        className="text-green-500 hover:text-green-400 underline"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {strings.privacyPolicy}
                      </a>
                      {' '}{strings.and}{' '}
                      <a
                        href="https://chatwithavo.avoagencylapalma.com/termsofservice.html"
                        className="text-green-500 hover:text-green-400 underline"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {strings.termsOfService}
                      </a>
                    </span>
                  </label>
                  <label className="flex items-start gap-2 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={cookiesAccepted}
                      onChange={(e) => setCookiesAccepted(e.target.checked)}
                      className="mt-0.5 h-4 w-4 rounded border-gray-600 text-green-500 focus:ring-green-500 focus:ring-offset-gray-900 transition-all"
                    />
                    <span className="text-sm text-gray-300 group-hover:text-gray-200 transition-colors">
                      {strings.acceptCookies}{' '}
                      <a
                        href="https://chatwithavo.avoagencylapalma.com/cookiepolicy.html"
                        className="text-green-500 hover:text-green-400 underline"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {strings.cookiePolicy}
                      </a>
                    </span>
                  </label>
                </div>
                {!allPoliciesAccepted && (
                  <div className="mt-4 space-y-4">
                    <p className="text-xs text-gray-400">
                      {strings.pleaseAccept}
                    </p>
                    <div className="flex flex-col items-center gap-3">
                      <p className="text-sm text-gray-300">{strings.supportMessage}</p>
                      <DonateButton text={strings.supportProject} />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
          {messages.map((message, index) => (
            <ChatMessage key={index} message={message} />
          ))}
          {isLoading && (
            <div className="flex items-center justify-center py-3">
              <div className="animate-pulse flex items-center gap-1 text-green-400">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-green-400 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                <div className="w-2 h-2 bg-green-400 rounded-full animate-bounce [animation-delay:0.4s]"></div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </main>

      <footer className="bg-gray-800/80 backdrop-blur-sm border-t border-gray-700 p-3 sticky bottom-0">
        <div className="max-w-3xl mx-auto">
          {remainingQuestions > 0 && allPoliciesAccepted && (
            <div className="text-xs text-gray-400 mb-2">
              {strings.questionsRemaining.replace('{count}', remainingQuestions.toString())}
            </div>
          )}
          <form onSubmit={handleSubmit} className="relative">
            <div className="relative rounded-xl bg-gray-700/50 backdrop-blur-sm">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={allPoliciesAccepted ? strings.placeholder : strings.pleaseAcceptShort}
                rows={1}
                className="w-full rounded-xl pr-14 pl-12 py-3 text-base focus:outline-none focus:ring-1 focus:ring-green-500 focus:border-transparent bg-transparent text-gray-100 placeholder-gray-400 transition-all resize-none"
                style={{
                  minHeight: '48px',
                  maxHeight: '120px'
                }}
                disabled={isLoading || !allPoliciesAccepted || hasReachedDailyLimit()}
                onInput={(e) => {
                  const target = e.target as HTMLTextAreaElement;
                  target.style.height = 'auto';
                  target.style.height = `${Math.min(target.scrollHeight, 120)}px`;
                }}
              />
              
        
              <div className="absolute left-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => {
                    if (allPoliciesAccepted) {
                      if (menuRef.current && document.body.contains(menuRef.current)) {
                        document.body.removeChild(menuRef.current);
                        menuRef.current = null;
                        return;
                      }
                      
                      const menuElement = document.createElement('div');
                      menuRef.current = menuElement;
                      
                      // Stile migliorato per il menu
                      menuElement.style.position = 'fixed';
                      menuElement.style.backgroundColor = '#1f2937'; // bg-gray-800
                      menuElement.style.borderRadius = '0.5rem';
                      menuElement.style.boxShadow = '0 10px 15px -3px rgba(0, 0, 0, 0.3), 0 4px 6px -4px rgba(0, 0, 0, 0.3)';
                      menuElement.style.padding = '0.5rem';
                      menuElement.style.zIndex = '50';
                      menuElement.style.display = 'flex';
                      menuElement.style.flexDirection = 'column';
                      menuElement.style.gap = '0.25rem';
                      menuElement.style.minWidth = '200px';
                      menuElement.style.border = '1px solid #374151'; // border-gray-700
                      
                      // Crea il pulsante per i documenti
                      const docButton = document.createElement('button');
                      docButton.style.padding = '0.5rem 0.75rem';
                      docButton.style.borderRadius = '0.375rem';
                      docButton.style.color = '#d1d5db'; // text-gray-300
                      docButton.style.display = 'flex';
                      docButton.style.alignItems = 'center';
                      docButton.style.gap = '0.5rem';
                      docButton.style.fontSize = '0.875rem';
                      docButton.style.width = '100%';
                      docButton.style.textAlign = 'left';
                      docButton.style.transition = 'all 0.2s';
                      
                      docButton.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>' +
                        `<span>${strings.uploadDocument}</span>`;
                      
                      docButton.addEventListener('mouseover', () => {
                        docButton.style.backgroundColor = '#374151'; // hover:bg-gray-700
                        docButton.style.color = '#e5e7eb'; // hover:text-gray-200
                      });
                      
                      docButton.addEventListener('mouseout', () => {
                        docButton.style.backgroundColor = 'transparent';
                        docButton.style.color = '#d1d5db'; // text-gray-300
                      });
                      
                      docButton.addEventListener('click', () => {
                        fileInputRef.current?.click();
                        if (document.body.contains(menuElement)) {
                          document.body.removeChild(menuElement);
                          menuRef.current = null;
                        }
                      });
                      
                      // Crea il pulsante per le immagini
                      const imgButton = document.createElement('button');
                      imgButton.style.padding = '0.5rem 0.75rem';
                      imgButton.style.borderRadius = '0.375rem';
                      imgButton.style.color = '#d1d5db'; // text-gray-300
                      imgButton.style.display = 'flex';
                      imgButton.style.alignItems = 'center';
                      imgButton.style.gap = '0.5rem';
                      imgButton.style.fontSize = '0.875rem';
                      imgButton.style.width = '100%';
                      imgButton.style.textAlign = 'left';
                      imgButton.style.transition = 'all 0.2s';
                      
                      imgButton.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>' +
                        `<span>${strings.uploadImage}</span>`;
                      
                      imgButton.addEventListener('mouseover', () => {
                        imgButton.style.backgroundColor = '#374151'; // hover:bg-gray-700
                        imgButton.style.color = '#e5e7eb'; // hover:text-gray-200
                      });
                      
                      imgButton.addEventListener('mouseout', () => {
                        imgButton.style.backgroundColor = 'transparent';
                        imgButton.style.color = '#d1d5db'; // text-gray-300
                      });
                      
                      imgButton.addEventListener('click', () => {
                        imageInputRef.current?.click();
                        if (document.body.contains(menuElement)) {
                          document.body.removeChild(menuElement);
                          menuRef.current = null;
                        }
                      });
              
                      menuElement.appendChild(docButton);
                      menuElement.appendChild(imgButton);
                      
                      document.body.appendChild(menuElement);
                      
                      const buttonRect = (event.target as HTMLElement).getBoundingClientRect();
                      menuElement.style.left = `${buttonRect.left}px`;
                      menuElement.style.top = `${buttonRect.top - menuElement.offsetHeight - 5}px`;
                      
                      // Assicuriamoci che il menu non vada fuori dallo schermo
                      setTimeout(() => {
                        const menuRect = menuElement.getBoundingClientRect();
                        if (menuRect.left < 10) {
                          menuElement.style.left = '10px';
                        }
                        if (menuRect.right > window.innerWidth - 10) {
                          menuElement.style.left = `${window.innerWidth - menuRect.width - 10}px`;
                        }
                      }, 0);
                      
                      const closeMenu = (e: MouseEvent) => {
                        if (!menuElement.contains(e.target as Node)) {
                          if (document.body.contains(menuElement)) {
                            document.body.removeChild(menuElement);
                            menuRef.current = null;
                          }
                          document.removeEventListener('click', closeMenu);
                        }
                      };
                      
                      setTimeout(() => {
                        document.addEventListener('click', closeMenu);
                      }, 100);
                    }
                  }}
                  disabled={isLoading || !allPoliciesAccepted || hasReachedDailyLimit()}
                  className={`p-2 rounded-lg transition-all ${
                    (isLoading || !allPoliciesAccepted || hasReachedDailyLimit())
                      ? 'opacity-50 cursor-not-allowed text-gray-500'
                      : 'text-gray-400 hover:text-gray-200 hover:bg-gray-600/50'
                  }`}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="16" />
                    <line x1="8" y1="12" x2="16" y2="12" />
                  </svg>
                </button>
                
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={(e) => handleFileUpload(e, false)}
                  accept=".txt"
                  className="hidden"
                />
                <input
                  type="file"
                  ref={imageInputRef}
                  onChange={(e) => handleFileUpload(e, true)}
                  accept="image/*"
                  className="hidden"
                />
              </div>
              
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                <button
                  type="button"
                  onClick={isListening ? stopListening : startListening}
                  disabled={isLoading || !allPoliciesAccepted || hasReachedDailyLimit()}
                  className={`p-2 rounded-lg transition-all ${
                    (isLoading || !allPoliciesAccepted || hasReachedDailyLimit())
                      ? 'opacity-50 cursor-not-allowed text-gray-500'
                      : isListening
                      ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                      : 'text-gray-400 hover:text-gray-200 hover:bg-gray-600/50'
                  }`}
                  aria-label={isListening ? strings.stopListening : strings.startListening}
                >
                  <Mic size={16} className={isListening ? 'animate-pulse' : ''} />
                </button>
                
                <button
                  type="submit"
                  disabled={isLoading || !allPoliciesAccepted || !input.trim() || hasReachedDailyLimit()}
                  className={`p-2 rounded-lg transition-all ${
                    (isLoading || !allPoliciesAccepted || !input.trim() || hasReachedDailyLimit())
                      ? 'opacity-50 cursor-not-allowed text-gray-500'
                      : 'text-green-500 hover:text-green-400 hover:bg-gray-600/50'
                  }`}
                  aria-label={strings.send}
                >
                  <Send size={16} />
                </button>
              </div>

              {isListening && (
                <VoiceWaveform
                  isListening={isListening}
                  audioStream={audioStream}
                  onCancel={handleVoiceCancel}
                  onConfirm={handleVoiceConfirm}
                />
              )}
            </div>
          </form>

          <div className="flex items-center justify-between text-xs text-gray-500 mt-2">
            <p>{strings.createdBy}</p>
            <a
              href="https://github.com/andreapianidev/AVO-AI"
              target="_blank"
              rel="noopener noreferrer"
              className="text-green-500 hover:text-green-400 transition-colors"
            >
              {strings.openSource}
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;