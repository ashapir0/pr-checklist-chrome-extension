/**
 * Content script for GitHub PR auto-fill
 * Detects compare pages and facilitates auto-filling PR descriptions using AI
 */

interface Message {
  type: 'GET_DIFF' | 'FILL_DESCRIPTION' | 'GET_TEMPLATE';
  data?: any;
}

interface AutoFillResponse {
  success: boolean;
  data?: any;
  error?: string;
}

class GitHubPRAutoFill {
  private isComparePage = false;
  private hasInjectedUI = false;

  constructor() {
    this.init();
  }

  private init() {
    // Check if we're on a compare page
    this.detectComparePage();
    
    if (this.isComparePage) {
      this.setupAutoFillUI();
      this.setupMessageListeners();
    }

    // Watch for navigation changes (GitHub uses pushState)
    this.observeNavigationChanges();
  }

  private detectComparePage() {
    const url = window.location.href;
    this.isComparePage = url.includes('/compare/') || url.includes('/pull/new');
    
    // Also check if there's a PR description textarea
    const prDescriptionField = document.querySelector('textarea[name="pull_request[body]"]') as HTMLTextAreaElement;
    if (prDescriptionField) {
      this.isComparePage = true;
    }
  }

  private setupAutoFillUI() {
    if (this.hasInjectedUI) return;

    // Wait for the page to fully load
    setTimeout(() => {
      this.injectAutoFillButton();
      this.hasInjectedUI = true;
    }, 1000);
  }

  private injectAutoFillButton() {
    const prDescriptionField = document.querySelector('textarea[name="pull_request[body]"]') as HTMLTextAreaElement;
    if (!prDescriptionField) return;

    // Check if button already exists
    if (document.querySelector('.pr-autofill-button')) return;

    // Create clean, minimal auto-fill button
    const autoFillButton = document.createElement('button');
    autoFillButton.type = 'button';
    autoFillButton.className = 'btn btn-sm pr-autofill-button';
    autoFillButton.style.cssText = `
      margin-left: 8px;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: #1976d2;
      color: white;
      border: none;
      border-radius: 4px;
      font-weight: 500;
      font-size: 12px;
      padding: 6px 12px;
      transition: background-color 0.2s ease;
    `;
    
    autoFillButton.innerHTML = `
      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
      </svg>
      AI Auto-fill
    `;
    autoFillButton.title = 'Generate PR description using AI based on your changes';
    
    // Add hover effect
    autoFillButton.addEventListener('mouseenter', () => {
      autoFillButton.style.background = '#1565c0';
    });
    
    autoFillButton.addEventListener('mouseleave', () => {
      autoFillButton.style.background = '#1976d2';
    });

    // Find a good place to insert the button (near the description field)
    const fieldContainer = prDescriptionField.closest('.form-group, .FormControl, .js-previewable-comment-form');
    if (fieldContainer) {
      const toolbar = fieldContainer.querySelector('.toolbar, .FormControl-spacingWrapper, .comment-form-head');
      if (toolbar) {
        toolbar.appendChild(autoFillButton);
      } else {
        // Fallback: insert after the textarea
        prDescriptionField.parentNode?.insertBefore(autoFillButton, prDescriptionField.nextSibling);
      }
    }

    // Add click handler
    autoFillButton.addEventListener('click', this.handleAutoFillClick.bind(this));
  }

  private async handleAutoFillClick(event: Event) {
    event.preventDefault();
    const button = event.target as HTMLButtonElement;
    
    try {
      button.disabled = true;
      button.innerHTML = `
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style="animation: spin 1s linear infinite;">
          <path d="M12,4a8,8,0,0,1,7.89,6.7A1.53,1.53,0,0,0,21.38,12h0a1.5,1.5,0,0,0,1.48-1.75,11,11,0,0,0-21.72,0A1.5,1.5,0,0,0,2.62,12h0a1.53,1.53,0,0,0,1.49-1.3A8,8,0,0,1,12,4Z"/>
        </svg>
        Generating...
      `;
      button.style.background = '#ff9800';

      // Get diff content
      const diffData = this.extractDiffData();
      
      // Get existing PR template
      const templateData = this.extractPRTemplate();

      // Send to background script for AI processing
      const response = await this.sendMessage({
        type: 'GENERATE_PR_DESCRIPTION',
        data: {
          diff: diffData,
          template: templateData,
          url: window.location.href
        }
      });

      if (response.success && response.data) {
        this.fillPRDescription(response.data.description);
        button.innerHTML = `
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <path d="M9,20.42L2.79,14.21L5.62,11.38L9,14.77L18.88,4.88L21.71,7.71L9,20.42Z"/>
          </svg>
          Generated!
        `;
        button.style.background = '#4caf50';
        setTimeout(() => {
          button.innerHTML = `
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
            </svg>
            AI Auto-fill
          `;
          button.style.background = '#1976d2';
          button.disabled = false;
        }, 2000);
      } else {
        throw new Error(response.error || 'Failed to generate description');
      }

    } catch (error) {
      console.error('Auto-fill error:', error);
      button.innerHTML = `
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12,2A10,10,0,1,0,22,12,10,10,0,0,0,12,2Zm5,11H7a1,1,0,0,1,0-2H17A1,1,0,0,1,17,13Z"/>
        </svg>
        Error
      `;
      button.style.background = '#f44336';
      button.title = `Error: ${error.message}`;
      setTimeout(() => {
        button.innerHTML = `
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
          </svg>
          AI Auto-fill
        `;
        button.style.background = '#1976d2';
        button.disabled = false;
        button.title = 'Generate PR description using AI based on your changes';
      }, 3000);
    }
  }

  private extractDiffData(): string {
    try {
      // Try to get the raw diff if available
      const diffStats = document.querySelector('.diffstat')?.textContent || '';
      
      // Get file changes
      const fileHeaders = document.querySelectorAll('.file-header[data-path], .file[data-path] .file-header');
      const fileChanges: string[] = [];

      if (fileHeaders.length === 0) {
        // Fallback: try to extract from other GitHub UI elements
        const filesChanged = document.querySelectorAll('.file-diff-split .file, .js-diff-progressive-container .file');
        if (filesChanged.length > 0) {
          fileChanges.push(`Found ${filesChanged.length} file(s) changed`);
          
          filesChanged.forEach((file, index) => {
            if (index < 5) { // Limit to first 5 files to avoid overwhelming the prompt
              const fileName = file.querySelector('.file-header')?.getAttribute('data-path') || 
                             file.querySelector('.file-info a')?.textContent || 
                             `File ${index + 1}`;
              fileChanges.push(`File: ${fileName}`);
              
              const additions = file.querySelectorAll('.blob-code-addition').length;
              const deletions = file.querySelectorAll('.blob-code-deletion').length;
              
              if (additions > 0) fileChanges.push(`  +${additions} additions`);
              if (deletions > 0) fileChanges.push(`  -${deletions} deletions`);
            }
          });
        }
      } else {
        fileHeaders.forEach((header, index) => {
          if (index < 10) { // Limit to first 10 files
            const filePath = header.getAttribute('data-path') || 
                           header.closest('[data-path]')?.getAttribute('data-path') || 
                           `Unknown file ${index + 1}`;
            const diffContainer = header.closest('.file')?.querySelector('.js-file-content, .diff-table');
            
            if (diffContainer) {
              const addedLines = diffContainer.querySelectorAll('.blob-code-addition');
              const removedLines = diffContainer.querySelectorAll('.blob-code-deletion');
              
              fileChanges.push(`\nFile: ${filePath}`);
              
              if (addedLines.length > 0) {
                fileChanges.push(`  Added lines: ${addedLines.length}`);
                // Sample a few added lines for context
                Array.from(addedLines).slice(0, 2).forEach(line => {
                  const text = line.textContent?.trim().replace(/^\+\s*/, '');
                  if (text && text.length > 0 && text.length < 100) {
                    fileChanges.push(`    + ${text}`);
                  }
                });
              }
              
              if (removedLines.length > 0) {
                fileChanges.push(`  Removed lines: ${removedLines.length}`);
                // Sample a few removed lines for context
                Array.from(removedLines).slice(0, 2).forEach(line => {
                  const text = line.textContent?.trim().replace(/^-\s*/, '');
                  if (text && text.length > 0 && text.length < 100) {
                    fileChanges.push(`    - ${text}`);
                  }
                });
              }
            } else {
              fileChanges.push(`\nFile: ${filePath} (no diff details available)`);
            }
          }
        });
      }

      const result = `${diffStats}\n\nFile Changes:\n${fileChanges.join('\n')}`;
      
      // If we couldn't extract meaningful diff data, provide a fallback message
      if (fileChanges.length === 0) {
        return 'No specific diff data could be extracted from this page. Please ensure you are on a GitHub compare page with visible changes.';
      }
      
      return result;
    } catch (error) {
      console.error('Error extracting diff data:', error);
      return 'Error extracting diff data. Please try again or check the console for details.';
    }
  }

  private extractPRTemplate(): string {
    const prDescriptionField = document.querySelector('textarea[name="pull_request[body]"]') as HTMLTextAreaElement;
    return prDescriptionField?.value || '';
  }

  private fillPRDescription(description: string) {
    const prDescriptionField = document.querySelector('textarea[name="pull_request[body]"]') as HTMLTextAreaElement;
    if (prDescriptionField) {
      prDescriptionField.value = description;
      
      // Trigger change events to notify GitHub's form validation
      prDescriptionField.dispatchEvent(new Event('input', { bubbles: true }));
      prDescriptionField.dispatchEvent(new Event('change', { bubbles: true }));
    }
  }

  private observeNavigationChanges() {
    // Watch for GitHub's SPA navigation
    let currentUrl = window.location.href;
    
    const observer = new MutationObserver(() => {
      if (window.location.href !== currentUrl) {
        currentUrl = window.location.href;
        this.hasInjectedUI = false;
        this.detectComparePage();
        
        if (this.isComparePage) {
          this.setupAutoFillUI();
        }
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  private setupMessageListeners() {
    chrome.runtime.onMessage.addListener((message: Message, sender, sendResponse) => {
      this.handleMessage(message).then(sendResponse);
      return true; // Will respond asynchronously
    });
  }

  private async handleMessage(message: Message): Promise<AutoFillResponse> {
    try {
      switch (message.type) {
        case 'GET_DIFF':
          return {
            success: true,
            data: this.extractDiffData()
          };
        
        case 'GET_TEMPLATE':
          return {
            success: true,
            data: this.extractPRTemplate()
          };
        
        case 'FILL_DESCRIPTION':
          this.fillPRDescription(message.data);
          return { success: true };
        
        default:
          return {
            success: false,
            error: 'Unknown message type'
          };
      }
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  private async sendMessage(message: any): Promise<any> {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage(message, resolve);
    });
  }
}

// Initialize when page loads
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => new GitHubPRAutoFill());
} else {
  new GitHubPRAutoFill();
} 
