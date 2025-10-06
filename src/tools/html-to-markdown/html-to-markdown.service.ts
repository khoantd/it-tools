import TurndownService from 'turndown';

export interface TurndownOptions {
  headingStyle: 'atx' | 'setext';
  bulletListMarker: '-' | '*' | '+';
  codeBlockStyle: 'fenced' | 'indented';
  emDelimiter: '*' | '_';
  strongDelimiter: '**' | '__';
  linkStyle: 'inlined' | 'referenced';
}

export const defaultTurndownOptions: TurndownOptions = {
  headingStyle: 'atx',
  bulletListMarker: '-',
  codeBlockStyle: 'fenced',
  emDelimiter: '*',
  strongDelimiter: '**',
  linkStyle: 'inlined',
};

/**
 * Validates HTML content using DOMParser
 * @param html - HTML string to validate
 * @returns true if HTML is valid, false otherwise
 */
export function isValidHTML(html: string): boolean {
  if (!html.trim()) return true; // Empty input is considered valid
  
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    
    // Check for parser errors
    const parserError = doc.querySelector('parsererror');
    if (parserError) return false;
    
    // Additional validation: check if the document has content
    return (doc.body?.textContent?.trim().length ?? 0) > 0 || (doc.body?.innerHTML.trim().length ?? 0) > 0;
  } catch {
    return false;
  }
}

/**
 * Converts HTML to Markdown using TurndownService
 * @param html - HTML string to convert
 * @param options - Turndown configuration options
 * @returns Markdown string
 */
export function convertHtmlToMarkdown(html: string, options: TurndownOptions = defaultTurndownOptions): string {
  if (!html.trim()) return '';
  
  try {
    const turndownService = new TurndownService({
      headingStyle: options.headingStyle,
      bulletListMarker: options.bulletListMarker,
      codeBlockStyle: options.codeBlockStyle,
      emDelimiter: options.emDelimiter,
      strongDelimiter: options.strongDelimiter,
      linkStyle: options.linkStyle,
    });

    // Add custom rules for better conversion
    turndownService.addRule('strikethrough', {
      filter: ['del', 's'],
      replacement: (content) => `~~${content}~~`,
    });

    turndownService.addRule('highlight', {
      filter: 'mark',
      replacement: (content) => `==${content}==`,
    });

    return turndownService.turndown(html);
  } catch (error) {
    throw new Error(`Conversion failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Sanitizes HTML content by removing potentially dangerous elements
 * @param html - HTML string to sanitize
 * @returns Sanitized HTML string
 */
export function sanitizeHTML(html: string): string {
  if (!html.trim()) return '';
  
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    
    // Remove script tags and event handlers
    const scripts = doc.querySelectorAll('script');
    scripts.forEach(script => script.remove());
    
    // Remove style tags that might contain malicious CSS
    const styles = doc.querySelectorAll('style');
    styles.forEach(style => style.remove());
    
    // Remove elements with event handlers
    const elementsWithEvents = doc.querySelectorAll('[onclick], [onload], [onerror], [onmouseover]');
    elementsWithEvents.forEach(el => {
      // Remove event attributes
      Array.from(el.attributes).forEach(attr => {
        if (attr.name.startsWith('on')) {
          el.removeAttribute(attr.name);
        }
      });
    });
    
    return doc.body?.innerHTML || '';
  } catch {
    return html; // Return original if sanitization fails
  }
}

/**
 * Estimates the complexity of HTML content
 * @param html - HTML string to analyze
 * @returns Object with complexity metrics
 */
export function analyzeHTMLComplexity(html: string): {
  elementCount: number;
  depth: number;
  hasTables: boolean;
  hasLists: boolean;
  hasCode: boolean;
  estimatedConversionTime: number;
} {
  if (!html.trim()) {
    return {
      elementCount: 0,
      depth: 0,
      hasTables: false,
      hasLists: false,
      hasCode: false,
      estimatedConversionTime: 0,
    };
  }
  
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const body = doc.body;
    
    if (!body) {
      return {
        elementCount: 0,
        depth: 0,
        hasTables: false,
        hasLists: false,
        hasCode: false,
        estimatedConversionTime: 0,
      };
    }
    
    const elements = body.querySelectorAll('*');
    const elementCount = elements.length;
    
    // Calculate maximum depth
    let maxDepth = 0;
    const calculateDepth = (element: Element, currentDepth: number) => {
      maxDepth = Math.max(maxDepth, currentDepth);
      Array.from(element.children).forEach(child => {
        calculateDepth(child, currentDepth + 1);
      });
    };
    calculateDepth(body, 0);
    
    const hasTables = body.querySelector('table') !== null;
    const hasLists = body.querySelector('ul, ol') !== null;
    const hasCode = body.querySelector('code, pre') !== null;
    
    // Estimate conversion time based on complexity
    const estimatedConversionTime = Math.max(10, elementCount * 0.1 + maxDepth * 2);
    
    return {
      elementCount,
      depth: maxDepth,
      hasTables,
      hasLists,
      hasCode,
      estimatedConversionTime,
    };
  } catch {
    return {
      elementCount: 0,
      depth: 0,
      hasTables: false,
      hasLists: false,
      hasCode: false,
      estimatedConversionTime: 0,
    };
  }
}
