// Content script for Gmail integration
const classifier = new EmailClassifier();

// Initialize when Gmail loads
let emailCache = new Map();
let processedEmails = new Set();

function init() {
  if (!classifier) return;
  // Wait for Gmail to load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', processGmailPage);
  } else {
    processGmailPage();
  }

  // Listen for Gmail navigation
  const observer = new MutationObserver(() => {
    setTimeout(processGmailPage, 1000);
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
}

function processGmailPage() {
  chrome.storage.local.get(['categories', 'dndRules', 'settings', 'pricingTier'], (data) => {
    const emails = extractEmails();
    emails.forEach(email => {
      if (!processedEmails.has(email.id)) {
        processEmail(email, data);
        processedEmails.add(email.id);
      }
    });

    applyVisualIndicators(emails, data);
  });
}

function extractEmails() {
  const emails = [];
  
  // Gmail thread selectors (may need adjustment based on Gmail's structure)
  const threadElements = document.querySelectorAll('div[role="main"] tr[role="row"]');
  
  threadElements.forEach((element, index) => {
    try {
      const subjectEl = element.querySelector('span.bog');
      const senderEl = element.querySelector('span.yW span[email]');
      const dateEl = element.querySelector('span[title]');
      const unread = element.classList.contains('zE');
      
      if (subjectEl && senderEl) {
        const email = {
          id: `${senderEl.getAttribute('email')}-${subjectEl.textContent}-${index}`,
          subject: subjectEl.textContent,
          from: senderEl.getAttribute('email') || senderEl.textContent,
          date: dateEl ? dateEl.getAttribute('title') : null,
          unread: unread,
          element: element,
          body: '' // Would need to open email to get full body
        };
        emails.push(email);
      }
    } catch (e) {
      console.error('Error extracting email:', e);
    }
  });
  
  return emails;
}

async function processEmail(email, settings) {
  // Classify email
  const classification = classifier.classifyEmail(email);
  
  // Check DND rules
  const isDND = classifier.checkDNDRules(email, settings.dndRules || []);
  
  // Extract important info
  const importantInfo = classifier.extractImportantInfo(email);
  
  const emailData = {
    ...email,
    ...classification,
    isDND,
    importantInfo,
    processedAt: Date.now()
  };
  
  emailCache.set(email.id, emailData);
  
  // Save to storage
  chrome.runtime.sendMessage({
    action: 'saveEmailData',
    emailData: emailData
  });
}

function applyVisualIndicators(emails, settings) {
  emails.forEach(emailData => {
    const cached = emailCache.get(emailData.id);
    if (cached && cached.element) {
      const element = cached.element;
      
      // Remove existing indicators
      const existingBadge = element.querySelector('.agileemails-badge');
      if (existingBadge) {
        existingBadge.remove();
      }
      
      // Add priority color border
      const priorityColor = classifier.getPriorityColor(cached.priority);
      element.style.borderLeft = `4px solid ${priorityColor}`;
      
      // Add category badge
      const badge = document.createElement('div');
      badge.className = 'agileemails-badge';
      badge.textContent = cached.category.replace('-', ' ').toUpperCase();
      badge.style.cssText = `
        display: inline-block;
        padding: 2px 6px;
        margin-left: 8px;
        font-size: 10px;
        font-weight: bold;
        border-radius: 3px;
        background: ${settings.categories?.[cached.category]?.color || '#808080'};
        color: white;
      `;
      
      const subjectEl = element.querySelector('span.bog');
      if (subjectEl && !subjectEl.querySelector('.agileemails-badge')) {
        subjectEl.appendChild(badge);
      }
      
      // Hide if DND active
      if (cached.isDND) {
        element.style.opacity = '0.3';
        element.style.pointerEvents = 'none';
      }
    }
  });
}

// Listen for messages from background
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'processEmails') {
    processGmailPage();
    sendResponse({ success: true });
  } else if (request.action === 'autoDelete') {
    handleAutoDelete(request.category);
    sendResponse({ success: true });
  }
  return true;
});

function handleAutoDelete(category) {
  // Auto-delete logic for specific category
  emailCache.forEach((emailData, id) => {
    if (emailData.category === category && emailData.element) {
      const deleteAge = emailData.processedAt ? 
        (Date.now() - emailData.processedAt) / (1000 * 60 * 60 * 24) : 0;
      
      // Check if auto-delete threshold reached
      const categorySettings = chrome.storage.local.get(['categories'], (data) => {
        const autoDeleteDays = data.categories?.[category]?.autoDelete;
        if (autoDeleteDays && deleteAge >= autoDeleteDays) {
          // Mark for deletion (in real implementation, would actually delete)
          emailData.element.style.display = 'none';
        }
      });
    }
  });
}

// Initialize
init();

