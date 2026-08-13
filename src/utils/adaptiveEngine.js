// adaptiveEngine.js
// A simple local state machine to adjust difficulty based on performance

const DIFFICULTY_LEVELS = ['easy', 'medium', 'hard'];

export class AdaptiveEngine {
  constructor(initialDifficulty = 'medium') {
    this.currentDifficultyIndex = DIFFICULTY_LEVELS.indexOf(initialDifficulty);
    this.history = [];
  }

  // Returns 'easy', 'medium', or 'hard'
  getCurrentDifficulty() {
    return DIFFICULTY_LEVELS[this.currentDifficultyIndex];
  }

  // score is 0.0 to 1.0 (e.g. 0.8 for 80% correct)
  recordScoreAndAdapt(score) {
    this.history.push(score);
    
    if (score >= 0.8) {
      // High score, increase difficulty if possible
      if (this.currentDifficultyIndex < DIFFICULTY_LEVELS.length - 1) {
        this.currentDifficultyIndex++;
      }
    } else if (score < 0.4) {
      // Low score, decrease difficulty if possible
      if (this.currentDifficultyIndex > 0) {
        this.currentDifficultyIndex--;
      }
    }
    
    return this.getCurrentDifficulty();
  }

  // Useful for analytics
  getHistory() {
    return this.history;
  }
}
