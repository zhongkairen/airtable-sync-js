/**
 * generate a random date within ±360 days of the current date
 * @returns {string} - A random date string in the format 'YYYY-MM-DD'
 */
function getRandomDateString(value) {
  const currentDate = new Date();
  const randomDays = Math.floor(Math.random() * 721) - 360;
  currentDate.setDate(currentDate.getDate() + randomDays);
  const val = currentDate.toISOString().slice(0, 10);
  if (value === val) return getRandomDateString(value);
  return val;
}

export { getRandomDateString };
