import React, { useState, useRef, useEffect } from 'react';
import { Send, Globe, X, FileText, Image, ChevronDown, Mic, Leaf } from 'lucide-react';
import { Message, Language, DocumentFile } from './types';
import { ChatMessage } from './components/ChatMessage';
import { VoiceWaveform } from './components/VoiceWaveform';
import { DonateButton } from './components/DonateButton';
import { RemainingQuestions } from './components/RemainingQuestions';
import { translations } from './i18n';
import * as tf from '@tensorflow/tfjs';
import '@tensorflow/tfjs-backend-webgl';
import * as mobilenet from '@tensorflow-models/mobilenet';
import { getDailyQuestions, incrementDailyQuestions, hasReachedDailyLimit, getRemainingQuestions, hasReachedPlantLimit, incrementDailyPlants } from './utils/dailyLimit';
import { identifyPlant } from './utils/plantnet';

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
  const [streamingMessage, setStreamingMessage] = useState<string>('');
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const plantInputRef = useRef<HTMLInputElement>(null);
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
                        language === 'pl' ? 'pl-PL' : 'en-US';
    }
  }, [language, recognition]);

  useEffect(() => {
    const loadModel = async () => {
      try {
        await tf.setBackend('webgl');
        await tf.ready();
        const loadedModel = await mobilenet.load();
        setModel(loadedModel);
        setIsModelLoading(false);
      } catch (error) {
        console.error('Error loading MobileNet model:', error);
        setIsModelLoading(false);
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
  }, [messages, streamingMessage]);

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

  const createUploadMenu = (buttonRect: DOMRect) => {
    if (menuRef.current && document.body.contains(menuRef.current)) {
      document.body.removeChild(menuRef.current);
    }

    const menuElement = document.createElement('div');
    menuRef.current = menuElement;
    menuElement.className = 'fixed z-50 bg-gray-800/95 backdrop-blur-sm border border-gray-700 rounded-lg shadow-lg p-1.5 flex flex-col gap-1.5';
    
    const docButton = document.createElement('button');
    docButton.className = 'p-2 rounded-lg hover:bg-gray-700/80 text-gray-300 hover:text-gray-100 flex items-center gap-2 text-sm transition-colors';
    docButton.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>' +
      `<span>${strings.uploadDocument}</span>`;
    
    docButton.addEventListener('click', () => {
      fileInputRef.current?.click();
      if (document.body.contains(menuElement)) {
        document.body.removeChild(menuElement);
      }
    });
    
    const imgButton = document.createElement('button');
    imgButton.className = 'p-2 rounded-lg hover:bg-gray-700/80 text-gray-300 hover:text-gray-100 flex items-center gap-2 text-sm transition-colors';
    imgButton.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>' +
      `<span>${strings.uploadImage}</span>`;
    
    imgButton.addEventListener('click', () => {
      imageInputRef.current?.click();
      if (document.body.contains(menuElement)) {
        document.body.removeChild(menuElement);
      }
    });

    const plantButton = document.createElement('button');
    plantButton.className = 'p-2 rounded-lg hover:bg-gray-700/80 text-gray-300 hover:text-gray-100 flex items-center gap-2 text-sm transition-colors';
    plantButton.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2L22 12 12 22 2 12 12 2z"></path><path d="M12 6L18 12 12 18 6 12 12 6z"></path></svg>' +
      `<span>${strings.identifyPlant}</span>`;
    
    plantButton.addEventListener('click', () => {
      plantInputRef.current?.click();
      if (document.body.contains(menuElement)) {
        document.body.removeChild(menuElement);
      }
    });

    menuElement.appendChild(docButton);
    menuElement.appendChild(imgButton);
    menuElement.appendChild(plantButton);
    
    document.body.appendChild(menuElement);
    
    menuElement.style.left = `${buttonRect.left}px`;
    menuElement.style.top = `${buttonRect.top - menuElement.offsetHeight - 8}px`;
    
    menuElement.style.opacity = '0';
    menuElement.style.transform = 'translateY(8px)';
    menuElement.style.transition = 'opacity 150ms ease-out, transform 150ms ease-out';
    
    requestAnimationFrame(() => {
      menuElement.style.opacity = '1';
      menuElement.style.transform = 'translateY(0)';
    });
    
    const closeMenu = (e: MouseEvent) => {
      if (!menuElement.contains(e.target as Node)) {
        menuElement.style.opacity = '0';
        menuElement.style.transform = 'translateY(8px)';
        setTimeout(() => {
          if (document.body.contains(menuElement)) {
            document.body.removeChild(menuElement);
          }
        }, 150);
        document.removeEventListener('click', closeMenu);
      }
    };
    
    setTimeout(() => {
      document.addEventListener('click', closeMenu);
    }, 100);
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

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>, isImage: boolean = false, isPlant: boolean = false) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (documents.length >= MAX_FILES) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: strings.maxFilesReached
      }]);
      return;
    }

    const supportedTypes = isImage || isPlant
      ? ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
      : ['text/plain'];

    if (!supportedTypes.includes(file.type)) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: isImage || isPlant
          ? 'Sorry, only JPEG, PNG, GIF, and WebP images are supported.'
          : 'Sorry, only TXT files are supported.'
      }]);
      return;
    }

    if (isPlant && hasReachedPlantLimit()) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: strings.plantLimitReached
      }]);
      return;
    }

    try {
      let content = '';
      let preview: string | undefined;
      let analysis: string | undefined;

      if (file.type.startsWith('image/')) {
        preview = URL.createObjectURL(file);
        
        if (isPlant) {
          setMessages(prev => [...prev, {
            role: 'assistant',
            content: strings.analyzingPlant
          }]);
          analysis = await identifyPlant(file);
          incrementDailyPlants();
        } else {
          if (!model) {
            if (isModelLoading) {
              setMessages(prev => [...prev, {
                role: 'assistant',
                content: 'Please wait while the image analysis model is loading...'
              }]);
              return;
            } else {
              throw new Error('Image analysis model failed to load. Please try again later.');
            }
          }
          
          setMessages(prev => [...prev, {
            role: 'assistant',
            content: strings.analyzing
          }]);
          analysis = await analyzeImage(file);
        }
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
    if (plantInputRef.current) {
      plantInputRef.current.value = '';
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
    setStreamingMessage('');

try {
  const systemPromptBase = `
You are AVO AI, a friendly and charismatic AI assistant born and raised (virtually) in the Canary Islands.  
You've been trained on everything Canarian — from volcanic landscapes and hidden beaches, to local fiestas, traditional food, and the everyday life of the people.  
You speak like a true islander: warm, approachable, and sometimes with a cheeky sense of humor. Your mission is to share accurate and useful information about the Canary Islands — their culture, history, geography, tourism, traditions, and local customs.  
Talk with personality and heart. Respond in a relaxed, friendly tone, using a familiar and engaging style. If the question has a local flavor, feel free to sprinkle in expressions and vibes typical of the islands.
`;

  // Create language-specific prompts with stronger enforcement
  const languagePrompts = {
    en: "YOU MUST RESPOND IN ENGLISH ONLY. Do not use Spanish or any other language in your response.",
    es: "DEBES RESPONDER SOLO EN ESPAÑOL. No uses inglés ni ningún otro idioma en tu respuesta.",
    it: "DEVI RISPONDERE SOLO IN ITALIANO. Non usare spagnolo o qualsiasi altra lingua nella tua risposta.",
    fr: "TU DOIS RÉPONDRE UNIQUEMENT EN FRANÇAIS. N'utilise pas l'espagnol ou toute autre langue dans ta réponse.",
    de: "DU MUSST NUR AUF DEUTSCH ANTWORTEN. Verwende kein Spanisch oder eine andere Sprache in deiner Antwort.",
    pl: "MUSISZ ODPOWIADAĆ TYLKO PO POLSKU. Nie używaj hiszpańskiego ani żadnego innego języka w swojej odpowiedzi.",
    palmero: "DEBES RESPONDER SOLO EN EL DIALECTO PALMERO de La Palma, Islas Canarias. Usa expresiones locales y un estilo cálido y familiar."
  };

  const languagePrompt = languagePrompts[language] || languagePrompts.en;

  const documentsPrompt = documents.length > 0
    ? `Use the following documents as additional context:\n${documents.map(d => d.content).join('\n')}`
    : '';

  const systemPrompt = [systemPromptBase.trim(), languagePrompt, documentsPrompt].filter(Boolean).join('\n\n');

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
          content: systemPrompt,
        },
        ...messages,
        userMessage
      ],
      temperature: 0.7,
      max_tokens: 2000,
      stream: true,
    }),
  });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(
          errorData?.error?.message || 
          `API request failed with status ${response.status}`
        );
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('Response body is null');

      let accumulatedMessage = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = new TextDecoder().decode(value);
        const lines = chunk.split('\n').filter(line => line.trim() !== '');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') continue;

            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices[0]?.delta?.content || '';
              accumulatedMessage += content;
              setStreamingMessage(accumulatedMessage);
            } catch (e) {
              console.error('Error parsing streaming response:', e);
            }
          }
        }
      }

      const remainingQuestions = incrementDailyQuestions();
      
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: accumulatedMessage
      }]);
      
      if (remainingQuestions <= 2) {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: strings.questionsRemaining.replace('{count}', remainingQuestions.toString())
        }]);
      }

    } catch (error: any) {
      console.error('API Error:', error);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `Sorry, I encountered an error: ${error.message}. Please try again.`,
      }]);
    } finally {
      setIsLoading(false);
      setStreamingMessage('');
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
          <div className="flex items-center gap-3">
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
              <p className="text-base text-gray-400 mb-6">{strings.subtitle}</p>
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
                    <div className="flex flex-col items-center gap-2">
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
          {streamingMessage && (
            <ChatMessage
              message={{
                role: 'assistant',
                content: streamingMessage
              }}
            />
          )}
          {isLoading && !streamingMessage && (
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
        <div className="max-w-3xl mx-auto space-y-3">
          <RemainingQuestions 
            text={strings.questionsRemaining}
            limitReachedText={strings.limitReachedDonate}
            strings={strings}
          />

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
                disabled={isLoading || !allPoliciesAccepted}
                onInput={(e) => {
                  const target = e.target as HTMLTextAreaElement;
                  target.style.height = 'auto';
                  target.style.height = `${Math.min(target.scrollHeight, 120)}px`;
                }}
              />
              
              <div className="absolute left-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                <button
                  type="button"
                  onClick={(event) => {
                    if (allPoliciesAccepted) {
                      const target = event.target as HTMLElement;
                      createUploadMenu(target.getBoundingClientRect());
                    }
                  }}
                  disabled={isLoading || !allPoliciesAccepted}
                  className={`p-2 rounded-lg transition-all ${
                    (isLoading || !allPoliciesAccepted)
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
                <input
                  type="file"
                  ref={plantInputRef}
                  onChange={(e) => handleFileUpload(e, false, true)}
                  accept="image/*"
                  className="hidden"
                />
              </div>
              
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                <button
                  type="button"
                  onClick={isListening ? stopListening : startListening}
                  disabled={isLoading || !allPoliciesAccepted}
                  className={`p-2 rounded-lg transition-all ${
                    (isLoading || !allPoliciesAccepted)
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
                  disabled={isLoading || !allPoliciesAccepted || !input.trim()}
                  className={`p-2 rounded-lg transition-all ${
                    (isLoading || !allPoliciesAccepted || !input.trim())
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

          <div className="flex items-center justify-between text-xs text-gray-500">
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