<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue';
import { useAppTheme } from '@/ui/theme/themes';
import { useStyleStore } from '@/stores/style.store';

// n8n chat widget configuration
const chatConfig = {
  // n8n webhook chat configuration
  apiUrl: 'https://n8n.khoadue.me/webhook/7bef8c91-88bc-4986-bd99-bf42a12012dc/chat',
  // Add other configuration options as needed
  // add basic auth credentials
  basicAuth: {
    username: 'admin',
    password: '@dmin123',
  },
};

let chatWidget: any = null;

// Session management for n8n
let sessionId: string | null = null;

// Chat window state management
let isMaximized = false;
let chatWindowElement: HTMLElement | null = null;
let isResizing = false;
let startX = 0;
let startY = 0;
let startWidth = 0;
let startHeight = 0;
let isProcessing = false;

// Theme integration
const appTheme = useAppTheme();
const styleStore = useStyleStore();

// Generate or retrieve session ID
const getSessionId = (): string => {
  if (!sessionId) {
    // Generate a unique session ID
    sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    console.log('Generated new session ID:', sessionId);
  }
  return sessionId;
};

onMounted(() => {
  // Initialize n8n chat widget
  initializeChatWidget();
});

onUnmounted(() => {
  // Cleanup chat widget if needed
  if (chatWidget) {
    // Add cleanup logic here if the n8n widget provides it
  }
});

const initializeChatWidget = () => {
  // Initialize n8n chat widget using the webhook endpoint
  // Since this is a webhook endpoint, we'll create a simple chat interface
  // that can communicate with your n8n workflow
  
  const chatContainer = document.getElementById('n8n-chat-widget');
  if (!chatContainer) return;

  // Create a simple floating chat button
  const chatButton = document.createElement('div');
  chatButton.className = 'n8n-chat-button';
  chatButton.innerHTML = `
    <div class="chat-icon">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M20 2H4C2.9 2 2 2.9 2 4V22L6 18H20C21.1 18 22 17.1 22 16V4C22 2.9 21.1 2 20 2ZM20 16H5.17L4 17.17V4H20V16Z" fill="currentColor"/>
        <path d="M7 9H17V11H7V9ZM7 12H15V14H7V12Z" fill="currentColor"/>
      </svg>
    </div>
  `;
  
  // Create chat window
  const chatWindow = document.createElement('div');
  chatWindow.className = 'n8n-chat-window';
  chatWindow.style.display = 'none';
  chatWindow.innerHTML = `
    <div class="chat-header">
      <span class="chat-title">Chat Support</span>
      <div class="chat-controls">
        <button class="chat-maximize" aria-label="Maximize chat">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M7 14H5V19H10V17H7V14ZM5 10H7V7H10V5H5V10ZM17 17H14V19H19V14H17V17ZM14 5V7H17V10H19V5H14Z" fill="currentColor"/>
          </svg>
        </button>
        <button class="chat-close" aria-label="Close chat">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M19 6.41L17.59 5L12 10.59L6.41 5L5 6.41L10.59 12L5 17.59L6.41 19L12 13.41L17.59 19L19 17.59L13.41 12L19 6.41Z" fill="currentColor"/>
          </svg>
        </button>
      </div>
    </div>
    <div class="chat-messages pretty-scrollbar"></div>
    <div class="chat-input-container">
      <div class="input-wrapper">
        <input type="text" class="chat-input" placeholder="Type your message..." autocomplete="off">
        <button class="chat-send" aria-label="Send message">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M2.01 21L23 12L2.01 3L2 10L17 12L2 14L2.01 21Z" fill="currentColor"/>
          </svg>
        </button>
      </div>
    </div>
    <div class="resize-handle"></div>
  `;

  chatContainer.appendChild(chatButton);
  chatContainer.appendChild(chatWindow);
  chatWindowElement = chatWindow;

  // Chat functionality
  let isOpen = false;
  const messagesContainer = chatWindow.querySelector('.chat-messages');
  const input = chatWindow.querySelector('.chat-input') as HTMLInputElement;
  const sendButton = chatWindow.querySelector('.chat-send');
  const closeButton = chatWindow.querySelector('.chat-close');
  const maximizeButton = chatWindow.querySelector('.chat-maximize');
  const resizeHandle = chatWindow.querySelector('.resize-handle');

  const toggleChat = () => {
    isOpen = !isOpen;
    chatWindow.style.display = isOpen ? 'block' : 'none';
    if (isOpen) {
      input.focus();
      // Optionally reset session when opening chat (uncomment if needed)
      // sessionId = null;
      // console.log('Chat opened - session reset');
    }
  };

  const toggleMaximize = () => {
    isMaximized = !isMaximized;
    if (isMaximized) {
      chatWindow.classList.add('maximized');
      // Update maximize button icon to minimize
      const icon = maximizeButton?.querySelector('svg path');
      if (icon) {
        icon.setAttribute('d', 'M5 16H3V5H14V3H3C1.9 3 1 3.9 1 5V16C1 17.1 1.9 18 3 18H16C17.1 18 18 17.1 18 16V5H16V16H5ZM19 3H10V5H19V14H21V5C21 3.9 20.1 3 19 3Z');
      }
    } else {
      chatWindow.classList.remove('maximized');
      // Update maximize button icon to maximize
      const icon = maximizeButton?.querySelector('svg path');
      if (icon) {
        icon.setAttribute('d', 'M7 14H5V19H10V17H7V14ZM5 10H7V7H10V5H5V10ZM17 17H14V19H19V14H17V17ZM14 5V7H17V10H19V5H14Z');
      }
    }
  };

  const startResize = (e: MouseEvent) => {
    e.preventDefault();
    isResizing = true;
    startX = e.clientX;
    startY = e.clientY;
    startWidth = parseInt(window.getComputedStyle(chatWindow).width, 10);
    startHeight = parseInt(window.getComputedStyle(chatWindow).height, 10);
    
    document.addEventListener('mousemove', doResize);
    document.addEventListener('mouseup', stopResize);
  };

  const doResize = (e: MouseEvent) => {
    if (!isResizing) return;
    
    const newWidth = startWidth + e.clientX - startX;
    const newHeight = startHeight + e.clientY - startY;
    
    // Set minimum and maximum sizes
    const minWidth = 300;
    const minHeight = 400;
    const maxWidth = window.innerWidth - 40;
    const maxHeight = window.innerHeight - 40;
    
    chatWindow.style.width = Math.max(minWidth, Math.min(maxWidth, newWidth)) + 'px';
    chatWindow.style.height = Math.max(minHeight, Math.min(maxHeight, newHeight)) + 'px';
  };

  const stopResize = () => {
    isResizing = false;
    document.removeEventListener('mousemove', doResize);
    document.removeEventListener('mouseup', stopResize);
  };

  const sendMessage = async () => {
    const message = input.value.trim();
    if (!message || isProcessing) return;

    // Add user message to chat
    addMessage(message, 'user');
    input.value = '';

    // Show typing indicator
    isProcessing = true;
    const typingIndicator = showTypingIndicator();
    
    // Disable input and send button while processing
    if (input) input.disabled = true;
    if (sendButton) (sendButton as HTMLButtonElement).disabled = true;

    try {
      // Create basic auth header with fallback
      const credentials = `${chatConfig.basicAuth.username}:${chatConfig.basicAuth.password}`;
      let authHeader;
      
      try {
        authHeader = `Basic ${btoa(credentials)}`;
      } catch (btoaError) {
        // Fallback for environments where btoa is not available
        authHeader = `Basic ${Buffer.from(credentials).toString('base64')}`;
      }
      
      console.log('Sending request to:', chatConfig.apiUrl);
      console.log('Auth header:', authHeader);
      
      // Send message to n8n webhook with session ID
      const requestBody = {
        chatInput: message,
        sessionId: getSessionId(),
      };
      
      console.log('Request body:', requestBody);
      
      const response = await fetch(chatConfig.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': authHeader,
        },
        body: JSON.stringify(requestBody),
      });

      console.log('Response status:', response.status);
      console.log('Response headers:', response.headers);

      // Hide typing indicator
      if (typingIndicator) {
        hideTypingIndicator(typingIndicator);
      }

      if (response.ok) {
        const data = await response.json();
        console.log('Response data:', data);
        // Add bot response to chat
        addMessage(data.response || data.output || 'Thank you for your message!', 'bot');
      } else {
        const errorText = await response.text();
        console.error('Error response:', errorText);
        addMessage(`Error ${response.status}: ${response.statusText}`, 'bot');
      }
    } catch (error) {
      // Hide typing indicator on error
      if (typingIndicator) {
        hideTypingIndicator(typingIndicator);
      }
      
      console.error('Chat error details:', error);
      
      const errorObj = error as Error;
      console.error('Error name:', errorObj.name);
      console.error('Error message:', errorObj.message);
      
      // More specific error messages
      if (errorObj.name === 'TypeError' && errorObj.message.includes('fetch')) {
        addMessage('Network error: Unable to connect to chat service', 'bot');
      } else if (errorObj.name === 'TypeError' && errorObj.message.includes('CORS')) {
        addMessage('CORS error: Chat service blocked by browser security', 'bot');
      } else {
        addMessage(`Error: ${errorObj.message}`, 'bot');
      }
    } finally {
      // Re-enable input and send button
      isProcessing = false;
      if (input) input.disabled = false;
      if (sendButton) (sendButton as HTMLButtonElement).disabled = false;
      if (input) input.focus();
    }
  };

  // Simple markdown parser for bot messages
  const parseMarkdown = (text: string): string => {
    let html = text;
    
    // Escape HTML to prevent XSS
    html = html.replace(/&/g, '&amp;')
               .replace(/</g, '&lt;')
               .replace(/>/g, '&gt;');
    
    // Bold: **text** or __text__
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/__(.+?)__/g, '<strong>$1</strong>');
    
    // Italic: *text* or _text_
    html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
    html = html.replace(/_(.+?)_/g, '<em>$1</em>');
    
    // Inline code: `code`
    html = html.replace(/`(.+?)`/g, '<code>$1</code>');
    
    // Links: [text](url)
    html = html.replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
    
    // Line breaks: convert \n to <br> but preserve paragraph structure
    html = html.replace(/\n\n/g, '</p><p>');
    html = html.replace(/\n/g, '<br>');
    
    // Wrap in paragraph if not already wrapped
    if (!html.startsWith('<p>')) {
      html = '<p>' + html + '</p>';
    }
    
    // Unordered lists: lines starting with * or -
    html = html.replace(/<p>([*-]\s.+?)<\/p>/g, (match, content) => {
      const items = content.split(/<br>([*-]\s)/g)
        .filter((item: string) => item && !item.match(/^[*-]\s$/))
        .map((item: string) => item.replace(/^[*-]\s/, ''))
        .map((item: string) => `<li>${item}</li>`)
        .join('');
      return `<ul>${items}</ul>`;
    });
    
    return html;
  };

  const addMessage = (text: string, sender: 'user' | 'bot') => {
    const messageDiv = document.createElement('div');
    messageDiv.className = `chat-message ${sender}`;
    
    // Parse markdown for bot messages, plain text for user messages
    if (sender === 'bot') {
      messageDiv.innerHTML = parseMarkdown(text);
    } else {
      messageDiv.textContent = text;
    }
    
    if (messagesContainer) {
      messagesContainer.appendChild(messageDiv);
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
  };

  const showTypingIndicator = () => {
    if (!messagesContainer) return;
    
    const typingDiv = document.createElement('div');
    typingDiv.className = 'chat-message bot typing-indicator';
    typingDiv.innerHTML = `
      <div class="typing-dots">
        <span></span>
        <span></span>
        <span></span>
      </div>
    `;
    
    messagesContainer.appendChild(typingDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
    
    return typingDiv;
  };

  const hideTypingIndicator = (typingElement: HTMLElement) => {
    if (typingElement && typingElement.parentNode) {
      typingElement.parentNode.removeChild(typingElement);
    }
  };

  // Event listeners
  chatButton.addEventListener('click', toggleChat);
  closeButton?.addEventListener('click', toggleChat);
  maximizeButton?.addEventListener('click', toggleMaximize);
  resizeHandle?.addEventListener('mousedown', startResize as EventListener);
  sendButton?.addEventListener('click', sendMessage);
  input?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      sendMessage();
    }
  });

  chatWidget = { open: toggleChat, close: () => { isOpen = false; chatWindow.style.display = 'none'; } };
};

// Expose methods for controlling the chat widget
const openChat = () => {
  if (chatWidget && chatWidget.open) {
    chatWidget.open();
  }
};

const closeChat = () => {
  if (chatWidget && chatWidget.close) {
    chatWidget.close();
  }
};

// Make methods available to parent components if needed
defineExpose({
  openChat,
  closeChat,
});
</script>

<template>
  <!-- n8n Chat Widget Container -->
  <div id="n8n-chat-widget" class="n8n-chat-container">
    <!-- The chat widget will be rendered here by the n8n script -->
  </div>
</template>

<style scoped>
.n8n-chat-container {
  position: fixed;
  bottom: 20px;
  right: 20px;
  z-index: 9999;
  pointer-events: none; /* Allow clicks to pass through to the widget */
}

/* Chat button styles - using project's primary color */
:deep(.n8n-chat-button) {
  width: 56px;
  height: 56px;
  background-color: v-bind('appTheme.primary.color');
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  pointer-events: auto;
  border: none;
}

:deep(.n8n-chat-button:hover) {
  background-color: v-bind('appTheme.primary.colorHover');
  transform: scale(1.05);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

:deep(.n8n-chat-button:active) {
  background-color: v-bind('appTheme.primary.colorPressed');
  transform: scale(0.98);
}

:deep(.chat-icon) {
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Chat window styles - using project's theme colors */
:deep(.n8n-chat-window) {
  position: absolute;
  bottom: 70px;
  right: 0;
  width: 360px;
  height: 520px;
  max-height: 520px; /* Ensure fixed height */
  background-color: v-bind('appTheme.background');
  border: 1px solid v-bind('styleStore.isDarkTheme ? "#282828" : "rgba(46, 51, 56, 0.05)"');
  border-radius: 12px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  pointer-events: auto;
  /* Ensure proper flex container behavior */
  min-height: 0;
  /* Force the container to respect its height */
  box-sizing: border-box;
}

/* Chat header - using project's primary color */
:deep(.chat-header) {
  flex-shrink: 0; /* Prevent header from shrinking */
  background-color: v-bind('appTheme.primary.color');
  color: white;
  padding: 16px 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: 500;
  font-size: 16px;
  cursor: move; /* Make header draggable */
  user-select: none;
}

:deep(.chat-controls) {
  display: flex;
  gap: 8px;
  align-items: center;
}

:deep(.chat-title) {
  font-weight: 500;
}

:deep(.chat-maximize),
:deep(.chat-close) {
  background: none;
  border: none;
  color: white;
  cursor: pointer;
  padding: 4px;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: background-color 0.2s ease;
}

:deep(.chat-maximize:hover),
:deep(.chat-close:hover) {
  background-color: rgba(255, 255, 255, 0.2);
}

/* Chat messages - using project's theme colors */
:deep(.chat-messages) {
  flex: 1;
  min-height: 0; /* Important for flex children with overflow */
  max-height: calc(100% - 120px); /* Reserve space for header and input */
  padding: 20px;
  overflow-y: auto;
  overflow-x: hidden;
  display: flex;
  flex-direction: column;
  gap: 12px;
  background-color: v-bind('appTheme.background');
  /* Force scrollbar to be always visible */
  scrollbar-width: thin;
  scrollbar-color: #ccc v-bind('appTheme.background');
}

/* Custom scrollbar for webkit browsers */
:deep(.chat-messages)::-webkit-scrollbar {
  width: 6px;
}

:deep(.chat-messages)::-webkit-scrollbar-track {
  background: v-bind('appTheme.background');
  border-radius: 3px;
}

:deep(.chat-messages)::-webkit-scrollbar-thumb {
  background: #ccc;
  border-radius: 3px;
}

:deep(.chat-messages)::-webkit-scrollbar-thumb:hover {
  background: #999;
}

:deep(.chat-message) {
  max-width: 80%;
  padding: 12px 16px;
  border-radius: 18px;
  word-wrap: break-word;
  word-break: break-word;
  overflow-wrap: break-word;
  white-space: pre-wrap;
  font-size: 14px;
  line-height: 1.6;
}

:deep(.chat-message.user) {
  background-color: v-bind('appTheme.primary.color');
  color: white;
  align-self: flex-end;
  border-bottom-right-radius: 4px;
}

:deep(.chat-message.bot) {
  background-color: v-bind('styleStore.isDarkTheme ? "rgba(255, 255, 255, 0.08)" : "rgba(46, 51, 56, 0.05)"');
  color: v-bind('appTheme.text.baseColor');
  align-self: flex-start;
  border-bottom-left-radius: 4px;
}

/* Markdown styling for bot messages */
:deep(.chat-message.bot strong) {
  font-weight: 600;
  color: v-bind('appTheme.text.baseColor');
}

:deep(.chat-message.bot em) {
  font-style: italic;
}

:deep(.chat-message.bot ul),
:deep(.chat-message.bot ol) {
  margin: 8px 0;
  padding-left: 20px;
}

:deep(.chat-message.bot li) {
  margin: 4px 0;
}

:deep(.chat-message.bot p) {
  margin: 8px 0;
}

:deep(.chat-message.bot p:first-child) {
  margin-top: 0;
}

:deep(.chat-message.bot p:last-child) {
  margin-bottom: 0;
}

:deep(.chat-message.bot code) {
  background-color: v-bind('styleStore.isDarkTheme ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.05)"');
  padding: 2px 6px;
  border-radius: 3px;
  font-family: monospace;
  font-size: 13px;
}

:deep(.chat-message.bot a) {
  color: v-bind('appTheme.primary.color');
  text-decoration: underline;
}

/* Typing indicator */
:deep(.typing-indicator) {
  background-color: v-bind('styleStore.isDarkTheme ? "rgba(255, 255, 255, 0.08)" : "rgba(46, 51, 56, 0.05)"');
  color: v-bind('appTheme.text.baseColor');
  align-self: flex-start;
  border-bottom-left-radius: 4px;
  padding: 10px 10px;
}

:deep(.typing-dots) {
  display: flex;
  align-items: center;
  gap: 2px;
}

:deep(.typing-dots span) {
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background-color: v-bind('appTheme.text.mutedColor');
  animation: typing 1.4s infinite ease-in-out;
}

:deep(.typing-dots span:nth-child(1)) {
  animation-delay: -0.32s;
}

:deep(.typing-dots span:nth-child(2)) {
  animation-delay: -0.16s;
}

:deep(.typing-dots span:nth-child(3)) {
  animation-delay: 0s;
}

@keyframes typing {
  0%, 80%, 100% {
    transform: scale(0.8);
    opacity: 0.5;
  }
  40% {
    transform: scale(1);
    opacity: 1;
  }
}

/* Chat input - matching c-input-text component styling */
:deep(.chat-input-container) {
  flex-shrink: 0; /* Prevent input from shrinking */
  padding: 16px 20px;
  border-top: 1px solid v-bind('styleStore.isDarkTheme ? "#282828" : "rgba(46, 51, 56, 0.05)"');
  background-color: v-bind('appTheme.background');
  border-bottom-left-radius: 12px;
  border-bottom-right-radius: 12px;
}

:deep(.input-wrapper) {
  display: flex;
  align-items: center;
  background-color: v-bind('appTheme.background');
  border: 1px solid v-bind('styleStore.isDarkTheme ? "#282828" : "rgba(46, 51, 56, 0.05)"');
  border-radius: 24px;
  padding: 0 4px 0 16px;
  transition: border-color 0.2s ease-in-out;
  gap: 8px;
}

:deep(.input-wrapper:hover) {
  border-color: v-bind('appTheme.primary.color');
}

:deep(.input-wrapper:focus-within) {
  border-color: v-bind('appTheme.primary.color');
  background-color: v-bind('appTheme.primary.colorFaded');
}

:deep(.chat-input) {
  flex: 1;
  padding: 12px 0;
  border: none;
  outline: none;
  background: transparent;
  color: v-bind('appTheme.text.baseColor');
  font-size: 14px;
  font-family: inherit;
}

:deep(.chat-input::placeholder) {
  color: v-bind('appTheme.text.mutedColor');
}

:deep(.chat-send) {
  padding: 8px;
  background-color: v-bind('appTheme.primary.color');
  color: white;
  border: none;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background-color 0.2s ease;
  width: 36px;
  height: 36px;
  margin-right: 4px;
}

:deep(.chat-send:hover) {
  background-color: v-bind('appTheme.primary.colorHover');
}

:deep(.chat-send:active) {
  background-color: v-bind('appTheme.primary.colorPressed');
}

:deep(.chat-send:disabled) {
  background-color: v-bind('styleStore.isDarkTheme ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.1)"');
  cursor: not-allowed;
  opacity: 0.6;
}

:deep(.chat-input:disabled) {
  cursor: not-allowed;
  opacity: 0.6;
}

:deep(.input-wrapper:has(.chat-input:disabled)) {
  opacity: 0.6;
  cursor: not-allowed;
}

/* Resize handle */
:deep(.resize-handle) {
  position: absolute;
  bottom: 0;
  right: 0;
  width: 12px;
  height: 12px;
  cursor: nw-resize;
  background: linear-gradient(-45deg, transparent 0%, transparent 30%, #ccc 30%, #ccc 40%, transparent 40%, transparent 60%, #ccc 60%, #ccc 70%, transparent 70%);
  border-bottom-right-radius: 12px;
  opacity: 0.7;
  transition: opacity 0.2s ease;
}

:deep(.resize-handle:hover) {
  opacity: 1;
}

/* Maximized state */
:deep(.n8n-chat-window.maximized) {
  position: fixed !important;
  top: 20px !important;
  left: 20px !important;
  right: 20px !important;
  bottom: 20px !important;
  width: auto !important;
  height: auto !important;
  max-width: none !important;
  max-height: none !important;
  z-index: 10000;
}

:deep(.n8n-chat-window.maximized .resize-handle) {
  display: none;
}

/* Responsive adjustments - using project's 700px breakpoint */
@media (max-width: 700px) {
  .n8n-chat-container {
    bottom: 15px;
    right: 15px;
  }
  
  :deep(.n8n-chat-window) {
    width: 320px;
    height: 480px;
    max-height: 480px;
    bottom: 65px;
    right: -10px;
    border-radius: 12px;
    box-sizing: border-box;
  }
  
  :deep(.n8n-chat-window.maximized) {
    top: 10px !important;
    left: 10px !important;
    right: 10px !important;
    bottom: 10px !important;
  }
  
  :deep(.chat-messages) {
    max-height: calc(100% - 100px); /* Smaller reserve for mobile */
    padding: 16px;
  }
  
  :deep(.n8n-chat-button) {
    width: 48px;
    height: 48px;
  }
  
  :deep(.chat-icon svg) {
    width: 20px;
    height: 20px;
  }
  
  :deep(.chat-header) {
    padding: 12px 16px;
    font-size: 14px;
  }
  
  :deep(.chat-input-container) {
    padding: 16px;
  }
  
  :deep(.resize-handle) {
    width: 16px;
    height: 16px;
  }
}

/* Tablet adjustments */
@media (min-width: 701px) and (max-width: 1024px) {
  :deep(.n8n-chat-window) {
    width: 400px;
    height: 600px;
    max-height: 600px;
  }
  
  :deep(.n8n-chat-window.maximized) {
    top: 15px !important;
    left: 15px !important;
    right: 15px !important;
    bottom: 15px !important;
  }
}

/* Large screen adjustments */
@media (min-width: 1025px) {
  :deep(.n8n-chat-window) {
    width: 450px;
    height: 650px;
    max-height: 650px;
  }
}

/* Ensure proper positioning and visibility */
:deep(.n8n-chat-widget *) {
  box-sizing: border-box;
}
</style>
