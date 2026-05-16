/**
 * Celebration utilities - confetti animations and task completion rewards
 */
import confetti from "canvas-confetti";

/**
 * Trigger confetti animation (default cannon effect)
 */
export function triggerConfetti() {
  const duration = 2000;
  const animationEnd = Date.now() + duration;

  const randomInRange = (min, max) => Math.random() * (max - min) + min;

  const interval = setInterval(() => {
    const timeLeft = animationEnd - Date.now();

    if (timeLeft <= 0) {
      clearInterval(interval);
      return;
    }

    const particleCount = 50 * (timeLeft / duration);

    confetti({
      particleCount,
      angle: randomInRange(55, 125),
      spread: randomInRange(50, 70),
      origin: { y: 0.6 },
      gravity: randomInRange(0.75, 1.25),
    });
  }, 250);
}

/**
 * Trigger snowfall effect
 */
export function triggerSnowfall() {
  const duration = 3000;
  const animationEnd = Date.now() + duration;

  const randomInRange = (min, max) => Math.random() * (max - min) + min;

  const interval = setInterval(() => {
    const timeLeft = animationEnd - Date.now();

    if (timeLeft <= 0) {
      clearInterval(interval);
      return;
    }

    confetti({
      particleCount: 15,
      angle: 90,
      spread: 120,
      origin: { y: -0.05 },
      gravity: 0.3,
      scalar: randomInRange(0.5, 1),
    });
  }, 150);
}

/**
 * Trigger fireworks effect (multiple bursts)
 */
export function triggerFireworks() {
  const end = Date.now() + 3000;

  const colors = ["#FF6B6B", "#4ECDC4", "#45B7D1", "#FFA07A", "#98D8C8"];

  function frame() {
    confetti({
      particleCount: 3,
      angle: Math.random() * 360,
      spread: Math.random() * 70,
      origin: {
        x: Math.random(),
        y: Math.random() - 0.2,
      },
      colors: [colors[Math.floor(Math.random() * colors.length)]],
      zIndex: 999,
    });

    if (Date.now() < end) {
      requestAnimationFrame(frame);
    }
  }

  frame();
}

/**
 * Trigger celebration when task is completed
 * Combines confetti with a satisfying message
 */
export function celebrateTaskCompletion(taskTitle) {
  // Trigger confetti effect
  triggerConfetti();

  // Log to console for debugging
  console.log(`🎉 Task completed: ${taskTitle}`);
}
