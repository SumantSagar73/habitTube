const QUOTES = [
  { text: 'You do not rise to the level of your goals. You fall to the level of your systems.', author: 'James Clear' },
  { text: 'We are what we repeatedly do. Excellence, then, is not an act, but a habit.', author: 'Will Durant' },
  { text: 'Success is the product of daily habits — not once-in-a-lifetime transformations.', author: 'James Clear' },
  { text: 'Motivation is what gets you started. Habit is what keeps you going.', author: 'Jim Ryun' },
  { text: 'The secret of getting ahead is getting started.', author: 'Mark Twain' },
  { text: 'Don’t break the chain.', author: 'Jerry Seinfeld' },
  { text: 'Small daily improvements over time lead to stunning results.', author: 'Robin Sharma' },
  { text: 'Discipline is choosing between what you want now and what you want most.', author: 'Abraham Lincoln' },
  { text: 'It’s not what we do once in a while that shapes our lives, but what we do consistently.', author: 'Tony Robbins' },
  { text: 'A year from now you may wish you had started today.', author: 'Karen Lamb' },
  { text: 'Every action you take is a vote for the type of person you wish to become.', author: 'James Clear' },
  { text: 'First we make our habits, then our habits make us.', author: 'Charles C. Noble' },
  { text: 'You’ll never change your life until you change something you do daily.', author: 'John C. Maxwell' },
  { text: 'The chains of habit are too weak to be felt until they are too strong to be broken.', author: 'Samuel Johnson' },
  { text: 'How you do anything is how you do everything.', author: 'T. Harv Eker' },
  { text: 'The best way to predict your future is to create it.', author: 'Abraham Lincoln' },
  { text: 'Do something today that your future self will thank you for.', author: 'Sean Patrick Flanery' },
  { text: 'Consistency is harder when no one is clapping for you. Clap for yourself.', author: 'Unknown' },
  { text: 'You don’t have to be great to start, but you have to start to be great.', author: 'Zig Ziglar' },
  { text: 'Lose an hour in the morning, and you will spend all day looking for it.', author: 'Richard Whately' },
  { text: 'Habits are the compound interest of self-improvement.', author: 'James Clear' },
  { text: 'What you do every day matters more than what you do once in a while.', author: 'Gretchen Rubin' },
]

// Deterministic quote of the day so it stays stable all day.
export function quoteOfTheDay(dateKey) {
  let hash = 0
  for (let i = 0; i < dateKey.length; i++) {
    hash = (hash * 31 + dateKey.charCodeAt(i)) >>> 0
  }
  return QUOTES[hash % QUOTES.length]
}

export default QUOTES
