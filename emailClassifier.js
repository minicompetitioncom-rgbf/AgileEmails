// Email classification and priority scoring engine

class EmailClassifier {
  constructor() {
    this.categories = {
      'school': {
        keywords: ['university', 'college', 'professor', 'assignment', 'homework', 'course', 'syllabus', 'campus', 'edu'],
        domains: ['edu', 'school'],
        priority: 3
      },
      'work-current': {
        keywords: ['team', 'meeting', 'project', 'deadline', 'urgent', 'asap', 'standup', 'sprint'],
        priority: 4
      },
      'work-opportunities': {
        keywords: ['opportunity', 'job', 'position', 'recruiter', 'hiring', 'career', 'interview', 'linkedin'],
        priority: 3
      },
      'finance': {
        keywords: ['payment', 'invoice', 'receipt', 'transaction', 'bank', 'credit card', 'statement', 'balance'],
        domains: ['bank', 'paypal', 'stripe'],
        priority: 4
      },
      'personal': {
        keywords: ['family', 'friend', 'birthday', 'party', 'weekend', 'dinner'],
        priority: 2
      },
      'auth-codes': {
        keywords: ['verification code', 'security code', 'login code', 'one-time', 'otp', '2fa'],
        priority: 1,
        autoDelete: 1
      },
      'promo': {
        keywords: ['sale', 'discount', 'offer', 'deal', 'promo', 'coupon', 'subscribe', 'unsubscribe'],
        priority: 1,
        autoDelete: 1
      }
    };

    this.urgentKeywords = ['urgent', 'asap', 'immediately', 'deadline', 'due today', 'action required'];
    this.importantKeywords = ['important', 'priority', 'attention', 'required', 'must', 'need'];
  }

  classifyEmail(email) {
    const from = email.from?.toLowerCase() || '';
    const subject = email.subject?.toLowerCase() || '';
    const body = email.body?.toLowerCase() || '';
    const text = `${from} ${subject} ${body}`;

    let bestCategory = 'other';
    let bestScore = 0;
    let priority = 1;
    let isNewsletter = false;

    // Check for newsletter patterns
    isNewsletter = this.isNewsletter(email);

    // Classify by category
    for (const [category, config] of Object.entries(this.categories)) {
      let score = 0;

      // Check keywords
      if (config.keywords) {
        score += config.keywords.filter(kw => text.includes(kw.toLowerCase())).length * 2;
      }

      // Check domains
      if (config.domains) {
        const emailDomain = from.split('@')[1]?.split('.')[0] || '';
        if (config.domains.some(d => emailDomain.includes(d))) {
          score += 5;
        }
      }

      // Check sender domain match
      if (config.senderPatterns) {
        config.senderPatterns.forEach(pattern => {
          if (from.includes(pattern.toLowerCase())) {
            score += 10;
          }
        });
      }

      if (score > bestScore) {
        bestScore = score;
        bestCategory = category;
        priority = config.priority || 1;
      }
    }

    // Adjust priority based on urgency
    if (this.urgentKeywords.some(kw => text.includes(kw))) {
      priority = Math.min(5, priority + 2);
    } else if (this.importantKeywords.some(kw => text.includes(kw))) {
      priority = Math.min(5, priority + 1);
    }

    // Check historical interaction (would need to check storage)
    priority = this.adjustPriorityByHistory(email, priority);

    return {
      category: bestCategory,
      priority: Math.max(1, Math.min(5, priority)),
      isNewsletter,
      confidence: bestScore
    };
  }

  isNewsletter(email) {
    const from = email.from?.toLowerCase() || '';
    const subject = email.subject?.toLowerCase() || '';
    const text = `${from} ${subject}`;

    // Check for BCC pattern (if no CC, might be bulk)
    // Check for unsubscribe links
    const newsletterIndicators = [
      'unsubscribe',
      'newsletter',
      'noreply',
      'no-reply',
      'donotreply',
      'mailing list',
      'mailchimp',
      'constant contact'
    ];

    return newsletterIndicators.some(indicator => text.includes(indicator));
  }

  adjustPriorityByHistory(email, currentPriority) {
    // In a real implementation, this would check historical reply rates
    // For now, we'll keep the priority as is
    return currentPriority;
  }

  getPriorityColor(priority) {
    const colors = {
      5: '#FF0000', // Red - urgent
      4: '#FF8C00', // Orange - high
      3: '#FFD700', // Yellow - medium-high
      2: '#90EE90', // Light green - medium
      1: '#006400'  // Dark green - low
    };
    return colors[priority] || colors[1];
  }

  extractImportantInfo(email) {
    const info = {
      links: [],
      dates: [],
      money: [],
      tasks: []
    };

    const text = `${email.subject} ${email.body}`;

    // Extract links
    const linkRegex = /https?:\/\/[^\s]+/g;
    info.links = text.match(linkRegex) || [];

    // Extract dates
    const dateRegex = /\b(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}|\w+\s+\d{1,2},?\s+\d{4}|\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2})\b/g;
    info.dates = text.match(dateRegex) || [];

    // Extract money amounts
    const moneyRegex = /\$[\d,]+\.?\d*/g;
    info.money = text.match(moneyRegex) || [];

    // Extract tasks (lines starting with -, *, or numbered)
    const taskRegex = /^[\s]*[-*•]\s+.+$/gm;
    info.tasks = (text.match(taskRegex) || []).slice(0, 5);

    return info;
  }

  checkDNDRules(email, dndRules) {
    if (!dndRules || dndRules.length === 0) return false;

    const from = email.from?.toLowerCase() || '';
    const subject = email.subject?.toLowerCase() || '';
    const text = `${from} ${subject}`;
    const now = new Date();
    const hour = now.getHours();

    for (const rule of dndRules) {
      if (!rule.enabled) continue;

      // Check time-based rules
      if (rule.timeStart && rule.timeEnd) {
        const start = parseInt(rule.timeStart);
        const end = parseInt(rule.timeEnd);
        if (hour >= start && hour < end) {
          // Check exceptions
          if (this.checkExceptions(email, rule.exceptions || [])) {
            continue; // Exception matched, don't apply DND
          }
          return true; // DND active
        }
      }

      // Check sender-based rules
      if (rule.senders && rule.senders.length > 0) {
        if (rule.senders.some(sender => from.includes(sender.toLowerCase()))) {
          if (this.checkExceptions(email, rule.exceptions || [])) {
            continue;
          }
          return true;
        }
      }
    }

    return false;
  }

  checkExceptions(email, exceptions) {
    if (!exceptions || exceptions.length === 0) return false;

    const subject = email.subject?.toLowerCase() || '';
    const body = email.body?.toLowerCase() || '';
    const text = `${subject} ${body}`;

    for (const exception of exceptions) {
      if (exception.type === 'keyword' && exception.value) {
        if (text.includes(exception.value.toLowerCase())) {
          return true;
        }
      } else if (exception.type === 'urgent' && exception.enabled) {
        if (this.urgentKeywords.some(kw => text.includes(kw))) {
          return true;
        }
      } else if (exception.type === 'deadline' && exception.enabled) {
        const deadlineRegex = /\bdeadline\b.*?\b(\d{1,2}[\/\-]\d{1,2})/i;
        if (deadlineRegex.test(text)) {
          return true;
        }
      }
    }

    return false;
  }
}

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = EmailClassifier;
}


