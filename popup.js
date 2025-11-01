// Popup script for AgileEmails
const classifier = new EmailClassifier();

// Initialize popup
document.addEventListener('DOMContentLoaded', () => {
  loadSettings();
  setupTabs();
  loadEmailQueue();
  
  document.getElementById('refreshQueue').addEventListener('click', loadEmailQueue);
  document.getElementById('settingsBtn').addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });
  document.getElementById('upgradeBtn').addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });
  document.getElementById('priorityFilter').addEventListener('change', loadEmailQueue);
});

function setupTabs() {
  const tabBtns = document.querySelectorAll('.tab-btn');
  const tabContents = document.querySelectorAll('.tab-content');

  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetTab = btn.getAttribute('data-tab');

      // Remove active class from all
      tabBtns.forEach(b => b.classList.remove('active'));
      tabContents.forEach(c => c.classList.remove('active'));

      // Add active to clicked tab
      btn.classList.add('active');
      document.getElementById(`${targetTab}-tab`).classList.add('active');

      // Load appropriate emails
      if (targetTab === 'queue') {
        loadEmailQueue();
      } else if (targetTab === 'missed') {
        loadMissedEmails();
      } else if (targetTab === 'today') {
        loadTodayEmails();
      } else if (targetTab === 'non-important') {
        loadNonImportantEmails();
      }
    });
  });
}

async function loadSettings() {
  chrome.storage.local.get(['pricingTier', 'categories'], (data) => {
    const tier = data.pricingTier || 'free';
    const badge = document.getElementById('pricingBadge');
    badge.textContent = tier.toUpperCase();
    badge.className = `pricing-badge ${tier}`;
  });
}

async function loadEmailQueue() {
  const priorityFilter = document.getElementById('priorityFilter').value;
  const queueList = document.getElementById('queueList');
  queueList.innerHTML = '<div class="loading">Loading reply queue...</div>';

  chrome.storage.local.get(['emailData', 'categories'], (data) => {
    const emails = (data.emailData || []).filter(email => {
      // Filter by priority
      if (priorityFilter !== 'all') {
        return email.priority === parseInt(priorityFilter);
      } else {
        return email.priority >= 4;
      }
    });

    // Sort by priority (descending)
    emails.sort((a, b) => b.priority - a.priority);

    if (emails.length === 0) {
      queueList.innerHTML = '<div class="empty-state">No emails in queue</div>';
      return;
    }

    queueList.innerHTML = emails.map(email => createEmailCard(email, data.categories)).join('');
    
    // Add click handlers
    queueList.querySelectorAll('.email-card').forEach(card => {
      card.addEventListener('click', () => {
        chrome.tabs.query({ url: 'https://mail.google.com/*' }, (tabs) => {
          if (tabs[0]) {
            chrome.tabs.sendMessage(tabs[0].id, {
              action: 'highlightEmail',
              emailId: card.dataset.emailId
            });
          }
        });
      });
    });
  });
}

async function loadMissedEmails() {
  const missedList = document.getElementById('missedList');
  missedList.innerHTML = '<div class="loading">Loading missed emails...</div>';

  chrome.storage.local.get(['emailData', 'categories'], (data) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const emails = (data.emailData || []).filter(email => {
      if (!email.date) return false;
      const emailDate = new Date(email.date);
      emailDate.setHours(0, 0, 0, 0);
      return emailDate < today && email.unread && email.priority >= 3;
    });

    emails.sort((a, b) => b.priority - a.priority);

    if (emails.length === 0) {
      missedList.innerHTML = '<div class="empty-state">No missed emails</div>';
      return;
    }

    missedList.innerHTML = emails.map(email => createEmailCard(email, data.categories)).join('');
  });
}

async function loadTodayEmails() {
  const todayList = document.getElementById('todayList');
  todayList.innerHTML = '<div class="loading">Loading today\'s emails...</div>';

  chrome.storage.local.get(['emailData', 'categories'], (data) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const emails = (data.emailData || []).filter(email => {
      if (!email.date) return false;
      const emailDate = new Date(email.date);
      emailDate.setHours(0, 0, 0, 0);
      return emailDate.getTime() === today.getTime();
    });

    emails.sort((a, b) => b.priority - a.priority);

    if (emails.length === 0) {
      todayList.innerHTML = '<div class="empty-state">No emails today</div>';
      return;
    }

    todayList.innerHTML = emails.map(email => createEmailCard(email, data.categories)).join('');
  });
}

async function loadNonImportantEmails() {
  const nonImportantList = document.getElementById('nonImportantList');
  nonImportantList.innerHTML = '<div class="loading">Loading non-important emails...</div>';

  chrome.storage.local.get(['emailData', 'categories'], (data) => {
    const emails = (data.emailData || []).filter(email => {
      return email.priority <= 3;
    });

    emails.sort((a, b) => b.priority - a.priority);

    if (emails.length === 0) {
      nonImportantList.innerHTML = '<div class="empty-state">No non-important emails</div>';
      return;
    }

    nonImportantList.innerHTML = emails.map(email => createEmailCard(email, data.categories)).join('');
  });
}

function createEmailCard(email, categories) {
  const priorityColor = classifier.getPriorityColor(email.priority);
  const categoryColor = categories?.[email.category]?.color || '#808080';
  const categoryName = email.category.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase());

  return `
    <div class="email-card" data-email-id="${email.id}" data-priority="${email.priority}">
      <div class="email-header">
        <div class="priority-indicator" style="background-color: ${priorityColor}"></div>
        <div class="email-info">
          <div class="email-subject">${escapeHtml(email.subject || 'No subject')}</div>
          <div class="email-from">${escapeHtml(email.from || 'Unknown sender')}</div>
        </div>
        <div class="email-badge" style="background-color: ${categoryColor}">${categoryName}</div>
      </div>
      ${email.importantInfo && (email.importantInfo.links?.length > 0 || email.importantInfo.dates?.length > 0 || email.importantInfo.money?.length > 0) ? `
        <div class="important-info">
          ${email.importantInfo.dates?.length > 0 ? `<div class="info-item">📅 ${email.importantInfo.dates.slice(0, 2).join(', ')}</div>` : ''}
          ${email.importantInfo.money?.length > 0 ? `<div class="info-item">💰 ${email.importantInfo.money.slice(0, 2).join(', ')}</div>` : ''}
        </div>
      ` : ''}
      <div class="email-footer">
        <span class="priority-label">Priority ${email.priority}/5</span>
        ${email.isNewsletter ? '<span class="newsletter-badge">📧 Newsletter</span>' : ''}
        ${email.isDND ? '<span class="dnd-badge">🔕 DND</span>' : ''}
      </div>
    </div>
  `;
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}


