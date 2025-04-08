export interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatResponse {
  choices: {
    message: {
      content: string;
      role: string;
    };
  }[];
}

export type Language = 'en' | 'es' | 'it' | 'fr' | 'de' | 'pl' | 'palmero';

export interface LanguageStrings {
  placeholder: string;
  welcome: string;
  subtitle: string;
  acceptPrivacy: string;
  acceptCookies: string;
  privacyPolicy: string;
  termsOfService: string;
  cookiePolicy: string;
  pleaseAccept: string;
  pleaseAcceptShort: string;
  uploadDocument: string;
  uploadImage: string;
  identifyPlant: string;
  analyzingPlant: string;
  plantLimitReached: string;
  send: string;
  startListening: string;
  stopListening: string;
  languageSelector: string;
  openSource: string;
  createdBy: string;
  uploadedFiles: string;
  removeFile: string;
  analyzing: string;
  maxFilesReached: string;
  and: string;
  dailyLimitReached: string;
  questionsRemaining: string;
  supportProject: string;
  supportMessage: string;
  limitReachedDonate: string;
}

export interface DocumentFile {
  name: string;
  content: string;
  type: string;
  preview?: string;
  analysis?: string;
}