import { describe, it, expect } from 'vitest';
import {
    validateCasperPublicKey,
    validateCircleName,
    validateTaskTitle,
    validateMemberName,
    validateEmail,
    validateCircleId,
    validatePriority,
    sanitizeHtml
} from '../lib/validation';

describe('Validation Utilities', () => {
    describe('validateCasperPublicKey', () => {
        it('should validate correct public key', () => {
            const result = validateCasperPublicKey('0202b40ddeb748ccc6f80048bb6e0f2be1969dc528600390224557eb05c0e0f8844d');
            expect(result.valid).toBe(true);
            expect(result.value).toBe('0202b40ddeb748ccc6f80048bb6e0f2be1969dc528600390224557eb05c0e0f8844d');
        });

        it('should reject short public key', () => {
            const result = validateCasperPublicKey('123');
            expect(result.valid).toBe(false);
            expect(result.error).toContain('too short');
        });

        it('should reject non-hex characters', () => {
            const result = validateCasperPublicKey('0202b40ddeb748ccc6f80048bb6e0f2be1969dc528600390224557eb05c0e0f8844g');
            expect(result.valid).toBe(false);
            expect(result.error).toContain('hexadecimal');
        });

        it('should reject empty string', () => {
            const result = validateCasperPublicKey('');
            expect(result.valid).toBe(false);
        });
    });

    describe('validateCircleName', () => {
        it('should validate correct circle name', () => {
            const result = validateCircleName("Mom's Care Team");
            expect(result.valid).toBe(true);
            expect(result.value).toBe("Mom's Care Team");
        });

        it('should reject too short name', () => {
            const result = validateCircleName('AB');
            expect(result.valid).toBe(false);
            expect(result.error).toContain('at least 3 characters');
        });

        it('should reject too long name', () => {
            const result = validateCircleName('A'.repeat(101));
            expect(result.valid).toBe(false);
            expect(result.error).toContain('less than 100 characters');
        });

        it('should trim whitespace', () => {
            const result = validateCircleName('  Family Circle  ');
            expect(result.valid).toBe(true);
            expect(result.value).toBe('Family Circle');
        });
    });

    describe('validateTaskTitle', () => {
        it('should validate correct task title', () => {
            const result = validateTaskTitle('Doctor appointment');
            expect(result.valid).toBe(true);
        });

        it('should reject empty title', () => {
            const result = validateTaskTitle('');
            expect(result.valid).toBe(false);
        });

        it('should reject too long title', () => {
            const result = validateTaskTitle('A'.repeat(201));
            expect(result.valid).toBe(false);
        });
    });

    describe('validateMemberName', () => {
        it('should validate correct member name', () => {
            const result = validateMemberName('John Doe');
            expect(result.valid).toBe(true);
        });

        it('should validate name with hyphen', () => {
            const result = validateMemberName('Mary-Jane');
            expect(result.valid).toBe(true);
        });

        it('should validate name with apostrophe', () => {
            const result = validateMemberName("O'Brien");
            expect(result.valid).toBe(true);
        });

        it('should reject too short name', () => {
            const result = validateMemberName('A');
            expect(result.valid).toBe(false);
        });
    });

    describe('validateEmail', () => {
        it('should validate correct email', () => {
            const result = validateEmail('test@example.com');
            expect(result.valid).toBe(true);
            expect(result.value).toBe('test@example.com');
        });

        it('should convert to lowercase', () => {
            const result = validateEmail('Test@Example.COM');
            expect(result.valid).toBe(true);
            expect(result.value).toBe('test@example.com');
        });

        it('should reject invalid email', () => {
            const result = validateEmail('notanemail');
            expect(result.valid).toBe(false);
        });

        it('should reject email without domain', () => {
            const result = validateEmail('test@');
            expect(result.valid).toBe(false);
        });
    });

    describe('validateCircleId', () => {
        it('should validate correct ID', () => {
            const result = validateCircleId(123);
            expect(result.valid).toBe(true);
            expect(result.value).toBe(123);
        });

        it('should validate string number', () => {
            const result = validateCircleId('456');
            expect(result.valid).toBe(true);
            expect(result.value).toBe(456);
        });

        it('should reject negative number', () => {
            const result = validateCircleId(-1);
            expect(result.valid).toBe(false);
        });

        it('should reject zero', () => {
            const result = validateCircleId(0);
            expect(result.valid).toBe(false);
        });

        it('should reject decimal', () => {
            const result = validateCircleId(1.5);
            expect(result.valid).toBe(false);
        });
    });

    describe('validatePriority', () => {
        it('should validate priority 0 (Low)', () => {
            const result = validatePriority(0);
            expect(result.valid).toBe(true);
            expect(result.value).toBe(0);
        });

        it('should validate priority 3 (Urgent)', () => {
            const result = validatePriority(3);
            expect(result.valid).toBe(true);
            expect(result.value).toBe(3);
        });

        it('should default to 1 if not provided', () => {
            const result = validatePriority(null);
            expect(result.valid).toBe(true);
            expect(result.value).toBe(1);
        });

        it('should reject priority > 3', () => {
            const result = validatePriority(4);
            expect(result.valid).toBe(false);
        });

        it('should reject negative priority', () => {
            const result = validatePriority(-1);
            expect(result.valid).toBe(false);
        });
    });

    describe('sanitizeHtml', () => {
        it('should escape HTML tags', () => {
            const result = sanitizeHtml('<script>alert("xss")</script>');
            expect(result).toBe('&lt;script&gt;alert(&quot;xss&quot;)&lt;&#x2F;script&gt;');
        });

        it('should escape special characters', () => {
            const result = sanitizeHtml('Test & "quotes" <tag>');
            expect(result).toContain('&amp;');
            expect(result).toContain('&quot;');
            expect(result).toContain('&lt;');
            expect(result).toContain('&gt;');
        });

        it('should handle empty string', () => {
            const result = sanitizeHtml('');
            expect(result).toBe('');
        });

        it('should handle null', () => {
            const result = sanitizeHtml(null);
            expect(result).toBe('');
        });
    });
});
