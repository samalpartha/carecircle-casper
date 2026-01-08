/**
 * Input Validation Utilities for CareCircle
 * Provides comprehensive validation for user inputs
 */

// Casper public key validation (hex format)
export function validateCasperPublicKey(key) {
    if (!key || typeof key !== 'string') {
        return { valid: false, error: 'Public key is required' };
    }

    const trimmed = key.trim();

    // Casper public keys are typically 66 characters (02 prefix + 64 hex chars)
    if (trimmed.length < 64) {
        return { valid: false, error: 'Public key is too short (minimum 64 characters)' };
    }

    // Check if it's valid hex
    if (!/^[0-9a-fA-F]+$/.test(trimmed)) {
        return { valid: false, error: 'Public key must contain only hexadecimal characters (0-9, a-f)' };
    }

    return { valid: true, value: trimmed };
}

// Circle name validation
export function validateCircleName(name) {
    if (!name || typeof name !== 'string') {
        return { valid: false, error: 'Circle name is required' };
    }

    const trimmed = name.trim();

    if (trimmed.length === 0) {
        return { valid: false, error: 'Circle name cannot be empty' };
    }

    if (trimmed.length < 3) {
        return { valid: false, error: 'Circle name must be at least 3 characters' };
    }

    if (trimmed.length > 100) {
        return { valid: false, error: 'Circle name must be less than 100 characters' };
    }

    // Check for invalid characters
    if (!/^[a-zA-Z0-9\s'-]+$/.test(trimmed)) {
        return { valid: false, error: 'Circle name can only contain letters, numbers, spaces, hyphens, and apostrophes' };
    }

    return { valid: true, value: trimmed };
}

// Task title validation
export function validateTaskTitle(title) {
    if (!title || typeof title !== 'string') {
        return { valid: false, error: 'Task title is required' };
    }

    const trimmed = title.trim();

    if (trimmed.length === 0) {
        return { valid: false, error: 'Task title cannot be empty' };
    }

    if (trimmed.length < 3) {
        return { valid: false, error: 'Task title must be at least 3 characters' };
    }

    if (trimmed.length > 200) {
        return { valid: false, error: 'Task title must be less than 200 characters' };
    }

    return { valid: true, value: trimmed };
}

// Task description validation
export function validateTaskDescription(description) {
    if (!description) {
        return { valid: true, value: '' }; // Optional field
    }

    if (typeof description !== 'string') {
        return { valid: false, error: 'Task description must be text' };
    }

    const trimmed = description.trim();

    if (trimmed.length > 1000) {
        return { valid: false, error: 'Task description must be less than 1000 characters' };
    }

    return { valid: true, value: trimmed };
}

// Member name validation
export function validateMemberName(name) {
    if (!name || typeof name !== 'string') {
        return { valid: false, error: 'Member name is required' };
    }

    const trimmed = name.trim();

    if (trimmed.length === 0) {
        return { valid: false, error: 'Member name cannot be empty' };
    }

    if (trimmed.length < 2) {
        return { valid: false, error: 'Member name must be at least 2 characters' };
    }

    if (trimmed.length > 100) {
        return { valid: false, error: 'Member name must be less than 100 characters' };
    }

    // Allow letters, spaces, hyphens, apostrophes, and common international characters
    if (!/^[\p{L}\s'-]+$/u.test(trimmed)) {
        return { valid: false, error: 'Member name can only contain letters, spaces, hyphens, and apostrophes' };
    }

    return { valid: true, value: trimmed };
}

// Email validation
export function validateEmail(email) {
    if (!email || typeof email !== 'string') {
        return { valid: false, error: 'Email address is required' };
    }

    const trimmed = email.trim().toLowerCase();

    // RFC 5322 compliant email regex (simplified)
    const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

    if (!emailRegex.test(trimmed)) {
        return { valid: false, error: 'Please enter a valid email address' };
    }

    if (trimmed.length > 254) {
        return { valid: false, error: 'Email address is too long' };
    }

    return { valid: true, value: trimmed };
}

// Circle ID validation
export function validateCircleId(id) {
    if (id === null || id === undefined || id === '') {
        return { valid: false, error: 'Circle ID is required' };
    }

    const numId = Number(id);

    if (isNaN(numId)) {
        return { valid: false, error: 'Circle ID must be a number' };
    }

    if (!Number.isInteger(numId)) {
        return { valid: false, error: 'Circle ID must be a whole number' };
    }

    if (numId < 1) {
        return { valid: false, error: 'Circle ID must be a positive number' };
    }

    if (numId > 999999999) {
        return { valid: false, error: 'Circle ID is too large' };
    }

    return { valid: true, value: numId };
}

// Priority validation
export function validatePriority(priority) {
    if (priority === null || priority === undefined) {
        return { valid: true, value: 1 }; // Default to normal priority
    }

    const numPriority = Number(priority);

    if (isNaN(numPriority)) {
        return { valid: false, error: 'Priority must be a number' };
    }

    if (!Number.isInteger(numPriority)) {
        return { valid: false, error: 'Priority must be a whole number' };
    }

    if (numPriority < 0 || numPriority > 3) {
        return { valid: false, error: 'Priority must be between 0 (Low) and 3 (Urgent)' };
    }

    return { valid: true, value: numPriority };
}

// Payment amount validation (in motes - smallest CSPR unit)
export function validatePaymentAmount(amount) {
    if (!amount) {
        return { valid: true, value: null }; // Optional field
    }

    const numAmount = Number(amount);

    if (isNaN(numAmount)) {
        return { valid: false, error: 'Payment amount must be a number' };
    }

    if (numAmount < 0) {
        return { valid: false, error: 'Payment amount cannot be negative' };
    }

    if (numAmount > 1000000) {
        return { valid: false, error: 'Payment amount is too large (max 1,000,000 CSPR)' };
    }

    // Convert to motes (1 CSPR = 1,000,000,000 motes)
    const motes = Math.floor(numAmount * 1_000_000_000);

    return { valid: true, value: motes };
}

// Sanitize HTML to prevent XSS
export function sanitizeHtml(input) {
    if (!input || typeof input !== 'string') {
        return '';
    }

    return input
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;')
        .replace(/\//g, '&#x2F;');
}

// Validate and sanitize all form inputs
export function validateFormInputs(inputs) {
    const errors = {};
    const sanitized = {};

    for (const [key, value] of Object.entries(inputs)) {
        if (typeof value === 'string') {
            sanitized[key] = value.trim();
        } else {
            sanitized[key] = value;
        }
    }

    return { errors, sanitized };
}
