// Background service worker for AgileEmails
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({
    categories: {
      'school': { enabled: true, color: '#4A90E2', autoDelete: null },
      'work-current': { enabled: true, color: '#E24A4A', autoDelete: null },
      'work-opportunities': { enabled: true, color: '#E2A44A', autoDelete: null },
      'finance': { enabled: true, color: '#4AE24A', autoDelete: null },
      'personal': { enabled: true, color: '#E24AE2', autoDelete: null },
      'auth-codes': { enabled: true, color: '#A4A4A4', autoDelete: 1 },
      'promo': { enabled: true, color: '#FFB84D', autoDelete: 1 },
      'other': { enabled: true, color: '#808080', autoDelete: null }
    },
    dndRules: [],
    pricingTier: 'free',
    settings: {
      contextWindow: 7, // days
      autoDeleteOldEmails: true,
      autoDeleteThresholds: {
        '3months': false,
        '6months': false,
        '1year': true
      }
    }
  });
});

// Listen for alarms (for auto-delete and periodic checks)
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'processEmails') {
    processEmails();
  } else if (alarm.name.startsWith('autoDelete-')) {
    handleAutoDelete(alarm.name);
  }
});

// Create periodic alarm for email processing
chrome.alarms.create('processEmails', { periodInMinutes: 15 });

// Process emails in the background
async function processEmails() {
  // This would integrate with Gmail API or content script
  // For now, we'll let the content script handle it
  chrome.tabs.query({ url: 'https://mail.google.com/*' }, (tabs) => {
    tabs.forEach(tab => {
      chrome.tabs.sendMessage(tab.id, { action: 'processEmails' });
    });
  });
}

function handleAutoDelete(alarmName) {
  const category = alarmName.replace('autoDelete-', '');
  // Auto-delete logic would go here
  chrome.tabs.query({ url: 'https://mail.google.com/*' }, (tabs) => {
    tabs.forEach(tab => {
      chrome.tabs.sendMessage(tab.id, { action: 'autoDelete', category });
    });
  });
}

// Handle messages from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getSettings') {
    chrome.storage.local.get(['categories', 'dndRules', 'settings', 'pricingTier'], (data) => {
      sendResponse(data);
    });
    return true;
  } else if (request.action === 'saveEmailData') {
    chrome.storage.local.get(['emailData'], (data) => {
      const emailData = data.emailData || [];
      emailData.push(request.emailData);
      chrome.storage.local.set({ emailData: emailData.slice(-1000) }); // Keep last 1000
    });
    sendResponse({ success: true });
    return true;
  }
});


