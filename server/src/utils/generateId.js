export const generateUniqueId = (prefix) => {
  const date = new Date();
  const year = date.getFullYear();
  const random = Math.floor(1000 + Math.random() * 9000); // 4-digit random number
  return `${prefix}-${year}-${random}`;
};
