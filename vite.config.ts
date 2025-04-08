import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    {
      name: 'html-transform',
      transformIndexHtml(html) {
        // Set the correct title
        html = html.replace(
          /<title>(.*?)<\/title>/,
          '<title>🇪🇸 AVO AI – Chatbot amigable con GPT desde las soleadas costas de La Palma, Islas Canarias.</title>'
        );
        
        // Add SEO meta tags and social image
        const seoMetaTags = `
    <meta name="description" content="Chatbot inteligente basado en GPT desde La Palma, Islas Canarias. Habla con AVO para obtener respuestas rápidas y precisas.">
    <meta name="keywords" content="chatbot, GPT, inteligencia artificial, La Palma, Islas Canarias, AVO AI">
    <meta property="og:title" content="AVO AI – Chatbot amigable con GPT">
    <meta property="og:description" content="Chatbot inteligente basado en GPT desde La Palma, Islas Canarias.">
    <meta property="og:image" content="https://www.hablaconavo.es/social.png">
    <meta property="og:url" content="https://www.hablaconavo.es">
    <meta property="og:type" content="website">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="AVO AI – Chatbot amigable con GPT">
    <meta name="twitter:description" content="Chatbot inteligente basado en GPT desde La Palma, Islas Canarias.">
    <meta name="twitter:image" content="https://www.hablaconavo.es/social.png">`;
        
        // Insert SEO meta tags before the closing head tag
        html = html.replace('<meta name="viewport"', `${seoMetaTags}\n    <meta name="viewport"`);
        
        // Add Google Analytics
        const gaScript = `
    <!-- Google tag (gtag.js) -->
    <script async src="https://www.googletagmanager.com/gtag/js?id=G-3EV4PRSQLK"></script>
    <script>
      window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      gtag('js', new Date());

      gtag('config', 'G-3EV4PRSQLK');
    </script>`;
        
        // Insert GA script before the closing head tag
        html = html.replace('</head>', `${gaScript}\n  </head>`);
        
        return html;
      }
    }
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
});
