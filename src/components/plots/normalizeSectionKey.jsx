/**
 * Normalizes any section identifier to a canonical form ('1', '2', '3', '4', '5')
 * Handles formats like: "North", "Section 1", "1", "Row D", "N", "S", etc.
 */
export function normalizeSectionKey(sectionStr) {
  if (!sectionStr) return '';
  
  const s = String(sectionStr).trim().toLowerCase();
  
  // Already a number 1-5
  if (/^[1-5]$/.test(s)) return s;
  
  // "Section X" format
  const sectionMatch = s.match(/section\s*(\d)/i);
  if (sectionMatch) return sectionMatch[1];
  
  // Row A-D maps to Section 1
  if (/^row\s*[a-d]/i.test(s) || /^[a-d]$/i.test(s)) return '1';
  // Row E-F maps to Section 2
  if (/^row\s*[e-f]/i.test(s) || /^[e-f]$/i.test(s)) return '2';
  
  // Cardinal directions and common abbreviations
  // North/N -> 1, South/S -> 2, East/E -> 3, West/W -> 4
  if (s === 'n' || s === 'north') return '1';
  if (s === 's' || s === 'south') return '2';
  if (s === 'e' || s === 'east') return '3';
  if (s === 'w' || s === 'west') return '4';
  
  // If it starts with a digit, extract it
  const digitMatch = s.match(/^(\d)/);
  if (digitMatch && ['1','2','3','4','5'].includes(digitMatch[1])) {
    return digitMatch[1];
  }
  
  return '';
}