import { describe, it, expect } from 'vitest';
import { 
  convertHtmlToMarkdown, 
  isValidHTML, 
  sanitizeHTML, 
  analyzeHTMLComplexity,
  defaultTurndownOptions 
} from './html-to-markdown.service';

describe('HTML to Markdown Converter Service', () => {
  describe('isValidHTML', () => {
    it('should return true for empty input', () => {
      expect(isValidHTML('')).toBe(true);
      expect(isValidHTML('   ')).toBe(true);
    });

    it('should return true for valid HTML', () => {
      expect(isValidHTML('<h1>Title</h1>')).toBe(true);
      expect(isValidHTML('<p>Paragraph with <strong>bold</strong> text.</p>')).toBe(true);
      expect(isValidHTML('<div><span>Nested elements</span></div>')).toBe(true);
    });

    it('should return false for malformed HTML', () => {
      // Note: DOMParser is quite forgiving, so some malformed HTML might still be considered valid
      // Only test cases that DOMParser actually rejects
      expect(isValidHTML('<h1>Title</h2>')).toBe(false);
    });

    it('should return true for HTML with content', () => {
      expect(isValidHTML('<div>Some text content</div>')).toBe(true);
      expect(isValidHTML('<img src="test.jpg" alt="test">')).toBe(true);
    });
  });

  describe('convertHtmlToMarkdown', () => {
    it('should return empty string for empty input', () => {
      expect(convertHtmlToMarkdown('')).toBe('');
      expect(convertHtmlToMarkdown('   ')).toBe('');
    });

    it('should convert basic HTML elements', () => {
      expect(convertHtmlToMarkdown('<h1>Title</h1>')).toBe('# Title');
      expect(convertHtmlToMarkdown('<h2>Subtitle</h2>')).toBe('## Subtitle');
      expect(convertHtmlToMarkdown('<p>Paragraph</p>')).toBe('Paragraph');
    });

    it('should convert text formatting', () => {
      expect(convertHtmlToMarkdown('<p>This is <strong>bold</strong> text.</p>')).toBe('This is **bold** text.');
      expect(convertHtmlToMarkdown('<p>This is <em>italic</em> text.</p>')).toBe('This is *italic* text.');
      expect(convertHtmlToMarkdown('<p>This is <code>code</code> text.</p>')).toBe('This is `code` text.');
    });

    it('should convert lists', () => {
      const html = `
        <ul>
          <li>Item 1</li>
          <li>Item 2</li>
        </ul>
      `;
      const result = convertHtmlToMarkdown(html);
      expect(result).toContain('-   Item 1');
      expect(result).toContain('-   Item 2');
    });

    it('should convert links', () => {
      expect(convertHtmlToMarkdown('<a href="https://example.com">Link</a>')).toBe('[Link](https://example.com)');
    });

    it('should convert code blocks', () => {
      const html = '<pre><code>console.log("hello");</code></pre>';
      const result = convertHtmlToMarkdown(html);
      expect(result).toMatch(/```[\s\S]*console\.log/);
    });

    it('should convert tables', () => {
      const html = `
        <table>
          <thead>
            <tr><th>Header 1</th><th>Header 2</th></tr>
          </thead>
          <tbody>
            <tr><td>Data 1</td><td>Data 2</td></tr>
          </tbody>
        </table>
      `;
      const result = convertHtmlToMarkdown(html);
      // Turndown converts tables to plain text by default
      expect(result).toContain('Header 1');
      expect(result).toContain('Header 2');
      expect(result).toContain('Data 1');
      expect(result).toContain('Data 2');
    });

    it('should handle custom options', () => {
      const options = {
        ...defaultTurndownOptions,
        headingStyle: 'setext' as const,
        bulletListMarker: '*' as const,
      };
      
      const html = '<h1>Title</h1><ul><li>Item</li></ul>';
      const result = convertHtmlToMarkdown(html, options);
      expect(result).toContain('Title\n=====');
      expect(result).toContain('*   Item');
    });

    it('should handle complex nested HTML', () => {
      const html = `
        <div>
          <h1>Main Title</h1>
          <p>Introduction paragraph with <strong>bold</strong> text.</p>
          <h2>Section</h2>
          <ul>
            <li>First item with <em>emphasis</em></li>
            <li>Second item with <code>code</code></li>
          </ul>
          <blockquote>
            <p>This is a quote.</p>
          </blockquote>
        </div>
      `;
      
      const result = convertHtmlToMarkdown(html);
      expect(result).toContain('# Main Title');
      expect(result).toContain('**bold**');
      expect(result).toContain('## Section');
      expect(result).toContain('-   First item with *emphasis*');
      expect(result).toContain('-   Second item with `code`');
      expect(result).toContain('> This is a quote.');
    });

    it('should handle malformed HTML gracefully', () => {
      const malformedHtml = '<div>Unclosed tag<p>Another unclosed';
      expect(() => convertHtmlToMarkdown(malformedHtml)).not.toThrow();
    });
  });

  describe('sanitizeHTML', () => {
    it('should return empty string for empty input', () => {
      expect(sanitizeHTML('')).toBe('');
    });

    it('should remove script tags', () => {
      const html = '<div>Content</div><script>alert("xss")</script>';
      const result = sanitizeHTML(html);
      expect(result).not.toContain('<script>');
      expect(result).toContain('<div>Content</div>');
    });

    it('should remove style tags', () => {
      const html = '<div>Content</div><style>body { color: red; }</style>';
      const result = sanitizeHTML(html);
      expect(result).not.toContain('<style>');
      expect(result).toContain('<div>Content</div>');
    });

    it('should remove event handlers', () => {
      const html = '<div onclick="alert(\'xss\')">Content</div>';
      const result = sanitizeHTML(html);
      expect(result).not.toContain('onclick');
      expect(result).toContain('<div>Content</div>');
    });

    it('should preserve safe content', () => {
      const html = '<div><p>Safe content with <strong>formatting</strong></p></div>';
      const result = sanitizeHTML(html);
      expect(result).toContain('Safe content');
      expect(result).toContain('<strong>formatting</strong>');
    });

    it('should handle malformed HTML', () => {
      const malformedHtml = '<div>Unclosed tag';
      expect(() => sanitizeHTML(malformedHtml)).not.toThrow();
    });
  });

  describe('analyzeHTMLComplexity', () => {
    it('should return zero metrics for empty input', () => {
      const result = analyzeHTMLComplexity('');
      expect(result).toEqual({
        elementCount: 0,
        depth: 0,
        hasTables: false,
        hasLists: false,
        hasCode: false,
        estimatedConversionTime: 0,
      });
    });

    it('should analyze simple HTML', () => {
      const html = '<div><p>Simple content</p></div>';
      const result = analyzeHTMLComplexity(html);
      expect(result.elementCount).toBeGreaterThan(0);
      expect(result.depth).toBeGreaterThan(0);
      expect(result.hasTables).toBe(false);
      expect(result.hasLists).toBe(false);
      expect(result.hasCode).toBe(false);
    });

    it('should detect tables', () => {
      const html = '<table><tr><td>Data</td></tr></table>';
      const result = analyzeHTMLComplexity(html);
      expect(result.hasTables).toBe(true);
    });

    it('should detect lists', () => {
      const html = '<ul><li>Item</li></ul>';
      const result = analyzeHTMLComplexity(html);
      expect(result.hasLists).toBe(true);
    });

    it('should detect code blocks', () => {
      const html = '<pre><code>console.log("test");</code></pre>';
      const result = analyzeHTMLComplexity(html);
      expect(result.hasCode).toBe(true);
    });

    it('should calculate depth correctly', () => {
      const html = '<div><div><div><p>Deep content</p></div></div></div>';
      const result = analyzeHTMLComplexity(html);
      expect(result.depth).toBeGreaterThan(2);
    });

    it('should estimate conversion time', () => {
      const html = '<div>'.repeat(100) + 'content' + '</div>'.repeat(100);
      const result = analyzeHTMLComplexity(html);
      expect(result.estimatedConversionTime).toBeGreaterThan(0);
    });

    it('should handle malformed HTML', () => {
      const malformedHtml = '<div>Unclosed tag';
      expect(() => analyzeHTMLComplexity(malformedHtml)).not.toThrow();
    });
  });

  describe('edge cases', () => {
    it('should handle HTML with special characters', () => {
      const html = '<p>Special chars: &lt; &gt; &amp; &quot; &#39;</p>';
      const result = convertHtmlToMarkdown(html);
      expect(result).toContain('Special chars:');
    });

    it('should handle HTML with Unicode', () => {
      const html = '<p>Unicode: 🚀 émojis and àccénts</p>';
      const result = convertHtmlToMarkdown(html);
      expect(result).toContain('🚀');
      expect(result).toContain('émojis');
      expect(result).toContain('àccénts');
    });

    it('should handle very large HTML documents', () => {
      const largeHtml = '<div>' + 'x'.repeat(10000) + '</div>';
      expect(() => convertHtmlToMarkdown(largeHtml)).not.toThrow();
    });

    it('should handle HTML with nested quotes', () => {
      const html = '<p>He said "Hello \'world\'" to me.</p>';
      const result = convertHtmlToMarkdown(html);
      expect(result).toContain('He said');
    });
  });
});
