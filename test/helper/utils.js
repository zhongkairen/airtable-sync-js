/**
 * generate a random date within ±360 days of the current date
 * @returns {string} - A random date string in the format 'YYYY-MM-DD'
 */
function getRandomDateString() {
  const currentDate = new Date();
  const randomDays = Math.floor(Math.random() * 721) - 360;
  currentDate.setDate(currentDate.getDate() + randomDays);
  return currentDate.toISOString().slice(0, 10);
}

export { getRandomDateString };
