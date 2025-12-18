export const levenshtein = (a, b) => {
    if (a.length === 0) return b.length;
    if (b.length === 0) return a.length;
    const matrix = [];
    for (let i = 0; i <= b.length; i++) matrix[i] = [i];
    for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
    for (let i = 1; i <= b.length; i++) {
        for (let j = 1; j <= a.length; j++) {
            if (b.charAt(i - 1) === a.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(
                    matrix[i - 1][j - 1] + 1,
                    matrix[i][j - 1] + 1,
                    matrix[i - 1][j] + 1
                );
            }
        }
    }
    return matrix[b.length][a.length];
};

export const getFootnotesContent = (text, footnotesMap) => {
    const noteMatches = text.match(/NOTE\s*(\d+)/g);
    if (!noteMatches) return "";
    return noteMatches.map(match => {
        const id = parseInt(match.match(/\d+/)[0]);
        return footnotesMap[id] || "";
    }).join(" ");
};

export const parseYear = (yearStr) => {
    const match = yearStr.match(/(\d{4})/);
    return match ? parseInt(match[1]) : 0;
};

export const isFuzzyMatch = (text, query) => {
    if (!query) return false;
    const lowerText = text.toLowerCase();
    const lowerQuery = query.toLowerCase();
    
    // Exact substring match
    if (lowerText.includes(lowerQuery)) return true;
    
    // Split query into words and check if all words match (fuzzy or exact)
    const queryWords = lowerQuery.split(/\s+/);
    return queryWords.every(word => {
        // Check for substring
        if (lowerText.includes(word)) return true;
        
        // Check for fuzzy match on words in text
        const textWords = lowerText.split(/\s+/);
        return textWords.some(textWord => {
            if (Math.abs(textWord.length - word.length) > 2) return false;
            const distance = levenshtein(textWord, word);
            return distance <= 2; // Allow up to 2 typos
        });
    });
};