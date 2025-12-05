const isValidIsraeliID = (id) => {
  return /\d{9}/.test(id) && Array.from(id, Number).reduce((counter, digit, i) => {
    const step = digit * ((i % 2) + 1);
    return counter + (step > 9 ? step - 9 : step);
  }) % 10 === 0;
};

const isValidAuthCode = (code) => {
  if (code.length !== 8) return false;
  
  const digits = code.match(/\d/g) || [];
  const letters = code.match(/[a-zA-Z]/g) || [];
  
  if (digits.length !== 6 || letters.length !== 2) return false;
  
  const hasUpperCase = /[A-Z]/.test(code);
  const hasLowerCase = /[a-z]/.test(code);
  
  if (!hasUpperCase || !hasLowerCase) return false;
  
  const isLettersAtStart = /^[a-zA-Z]{2}\d{6}$/.test(code);
  const isLettersAtEnd = /^\d{6}[a-zA-Z]{2}$/.test(code);
  
  return isLettersAtStart || isLettersAtEnd;
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { isValidIsraeliID, isValidAuthCode };
}

