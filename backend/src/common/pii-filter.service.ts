import { Injectable, Logger } from '@nestjs/common';

// PII patterns for different regions
const PII_PATTERNS = {
  // Email addresses
  email: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
  
  // Phone numbers (various formats)
  phoneKR: /\d{2,3}-\d{3,4}-\d{4}/g,
  phoneUS: /(\+1[-\s]?)?(\(?\d{3}\)?[-\s]?)?\d{3}[-\s]?\d{4}/g,
  phoneGeneral: /\+?\d{10,14}/g,
  
  // Korean resident registration number (주민등록번호)
  krrn: /\d{6}[-\s]?[1-4]\d{6}/g,
  
  // Credit card numbers
  creditCard: /\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}/g,
  
  // IP addresses
  ipv4: /\b(?:\d{1,3}\.){3}\d{1,3}\b/g,
  
  // Korean name patterns (간단한 패턴)
  koreanName: /[가-힣]{2,4}\s*(님|씨|선생님)?/g,
  
  // API keys and tokens (common patterns)
  apiKey: /(?:api[_-]?key|secret|token|password)\s*[:=]\s*['"]?[a-zA-Z0-9_-]{20,}['"]?/gi,
  
  // JWT tokens
  jwt: /eyJ[a-zA-Z0-9_-]*\.eyJ[a-zA-Z0-9_-]*\.[a-zA-Z0-9_-]*/g,
  
  // AWS keys
  awsKey: /(?:AKIA|ASIA)[A-Z0-9]{16}/g,
};

export interface PIIResult {
  original: string;
  masked: string;
  detected: { type: string; count: number }[];
}

@Injectable()
export class PIIFilterService {
  private readonly logger = new Logger(PIIFilterService.name);

  mask(text: string): PIIResult {
    if (!text || typeof text !== 'string') {
      return { original: text, masked: text, detected: [] };
    }

    let masked = text;
    const detected: { type: string; count: number }[] = [];

    // Apply each pattern
    for (const [type, pattern] of Object.entries(PII_PATTERNS)) {
      const matches = text.match(pattern);
      if (matches && matches.length > 0) {
        detected.push({ type, count: matches.length });
        masked = masked.replace(pattern, (match) => this.getMask(type, match));
      }
    }

    if (detected.length > 0) {
      this.logger.debug(`PII detected and masked: ${detected.map(d => `${d.type}(${d.count})`).join(', ')}`);
    }

    return { original: text, masked, detected };
  }

  private getMask(type: string, original: string): string {
    switch (type) {
      case 'email':
        const [local, domain] = original.split('@');
        return `${local.slice(0, 2)}***@${domain}`;
      
      case 'phoneKR':
      case 'phoneUS':
      case 'phoneGeneral':
        return original.slice(0, 3) + '-****-' + original.slice(-4);
      
      case 'krrn':
        return original.slice(0, 6) + '-*******';
      
      case 'creditCard':
        return '**** **** **** ' + original.slice(-4);
      
      case 'ipv4':
        return original.split('.').map((p, i) => i < 2 ? p : '***').join('.');
      
      case 'koreanName':
        if (original.length <= 2) return original[0] + '*';
        return original[0] + '*'.repeat(original.length - 2) + original.slice(-1);
      
      case 'apiKey':
      case 'jwt':
      case 'awsKey':
        return '[REDACTED_KEY]';
      
      default:
        return '[REDACTED]';
    }
  }

  // Mask PII in JSON object (recursive)
  maskObject(obj: any): any {
    if (obj === null || obj === undefined) return obj;
    
    if (typeof obj === 'string') {
      return this.mask(obj).masked;
    }
    
    if (Array.isArray(obj)) {
      return obj.map(item => this.maskObject(item));
    }
    
    if (typeof obj === 'object') {
      const masked: any = {};
      for (const [key, value] of Object.entries(obj)) {
        // Skip sensitive field names entirely
        if (['password', 'secret', 'token', 'apiKey', 'accessToken'].includes(key)) {
          masked[key] = '[REDACTED]';
        } else {
          masked[key] = this.maskObject(value);
        }
      }
      return masked;
    }
    
    return obj;
  }

  // Check if text contains PII
  hasPII(text: string): boolean {
    if (!text || typeof text !== 'string') return false;

    for (const pattern of Object.values(PII_PATTERNS)) {
      if (pattern.test(text)) {
        pattern.lastIndex = 0; // Reset regex
        return true;
      }
    }
    return false;
  }
}
