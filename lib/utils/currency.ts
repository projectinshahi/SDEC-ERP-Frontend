/**
 * Currency Formatting Utilities
 * Standardizes all monetary values to INR format as requested.
 */

export function formatINR(value: number | string | null | undefined): string {
  if (value === null || value === undefined) {
    return '₹0';
  }

  const numValue = typeof value === 'string' ? parseFloat(value) : value;

  if (isNaN(numValue)) {
    return '₹0';
  }

  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0, // Drop decimals for executive summary view
    minimumFractionDigits: 0,
  }).format(numValue);
}
