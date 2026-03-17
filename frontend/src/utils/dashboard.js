export function formatCurrency(value = 0, currency = 'USD') {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
}

export function formatDateTime(value) {
  if (!value) {
    return 'Just now';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
}

export function formatShortDate(value) {
  if (!value) {
    return '--';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
}

export function getDaysLeft(value) {
  if (!value) {
    return 'No deadline';
  }

  const today = new Date();
  const target = new Date(value);
  if (Number.isNaN(target.getTime())) {
    return value;
  }

  const diff = Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (diff <= 0) {
    return 'Due today';
  }
  if (diff === 1) {
    return '1 day left';
  }
  if (diff < 30) {
    return `${diff} days left`;
  }
  const months = Math.round(diff / 30);
  return `${months} month${months === 1 ? '' : 's'} left`;
}

export function getInitials(user) {
  const first = user?.firstName?.[0] || '';
  const last = user?.lastName?.[0] || '';
  return `${first}${last}`.toUpperCase() || 'ZA';
}

export function isValidAmount(value) {
  return /^\d+(\.\d{1,2})?$/.test(String(value).trim()) && Number(value) > 0;
}

export function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value).trim());
}

export function isValidPhone(value) {
  const digits = String(value).replace(/\D/g, '');
  return digits.length >= 10 && digits.length <= 15;
}

export function isValidOtp(value) {
  return /^\d{6}$/.test(String(value).trim());
}

export function maskCardNumber(value = '') {
  const digits = String(value).replace(/\s+/g, '');
  if (!digits) {
    return '**** **** **** ****';
  }
  return `**** **** **** ${digits.slice(-4)}`;
}

export function formatExpiry(value = '') {
  if (!value) {
    return '--/--';
  }
  return value;
}
