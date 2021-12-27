function test(word, constraint) {
  if (constraint[0] === "length") return word.length === constraint[1];
  if (constraint[0] === "notInWord") return !word.includes(constraint[1]);
  if (constraint[0] === "notAtPos") {
    const [_, pos, letter] = constraint;
    return word.includes(letter) && word[pos] !== letter;
  }
  if (constraint[0] === "atPos") {
    const [_, pos, letter] = constraint;
    return word[pos] === letter;
  }
  console.log("BAD CONSTRAINT", constraint);
  return false;
}

function distinct(xs) {
  const seen = [];
  for (const x of xs) {
    if (!seen.includes(x)) seen.push(x);
  }
  return seen;
}

function randNth(xs) {
  return xs[Math.floor(Math.random() * xs.length)];
}

// for testing
function getNewConstraints(guess, word) {
  const newConstraints = [];
  for (let i = 0; i < guess.length; i++) {
    if (guess[i] === word[i]) {
      newConstraints.push(["atPos", i, guess[i]]);
    }
    else if (word.includes(guess[i])) {
      newConstraints.push(["notAtPos", i, guess[i]]);
    }
    else {
      newConstraints.push(["notInWord", guess[i]]);
    }
  }
  return newConstraints;
}

function getAllCandidates(constraints) {
  return words.filter(word => constraints.every(constraint => test(word, constraint)));
}

// janky attempt at an information-maximizer

const alphabet = "abcdefghijklmnopqrstuvwxyz".split("");

function getBestCandidates(constraints, words, topwords) {
  const candidates = getAllCandidates(constraints);

  // sort the letters we haven't yet tested by how often they appear in the candidate words
  const letterCounts = {};
  for (const candidate of candidates) {
    for (const letter of candidate) {
      letterCounts[letter] = (letterCounts[letter] || 0) + 1;
    }
  }
  const testedLetters = [];
  for (const constraint of constraints) {
    if (constraint[0] === "notInWord") {
      testedLetters.push(constraint[1]);
    } else if (constraint[0] === "notAtPos" || constraint[0] === "atPos") {
      testedLetters.push(constraint[2]);
    }
  }
  const untestedLetters = alphabet.filter(l => !testedLetters.includes(l));
  const likeliestUntestedLetters = untestedLetters.sort((a, b) => {
    return (letterCounts[b] || 0) - (letterCounts[a] || 0);
  });
  //console.log("likeliestUntestedLetters", likeliestUntestedLetters.map(l => [l, letterCounts[l]]));

  // have we reached the point at which information-maximization as a strategy is exhausted,
  // i.e., the point at which no unknown letters are shared between multiple candidates?
  // if so, use each candidate's position in topwords (if any) to break ties.
  // TODO this can probably be improved with better frequency data.
  // maybe by looking at letter frequency too, RSTLNE etc?
  const highestUntestedLetterCount = letterCounts[likeliestUntestedLetters[0]] || 0;
  if (highestUntestedLetterCount <= 1) {
    //console.log("  ambiguous candidates", candidates);
    const scoredCandidates = candidates.map(word => {
      const positionInTopwords = topwords.indexOf(word);
      return [word, positionInTopwords > -1 ? positionInTopwords : topwords.length];
    });
    const bestScore = Math.min(...scoredCandidates.map(wordAndScore => wordAndScore[1]));
    const bestScoredCandidates = scoredCandidates.filter(wordAndScore => wordAndScore[1] === bestScore);
    //console.log("  bestScore", bestScore, "among", bestScoredCandidates);
    return bestScoredCandidates.map(wordAndScore => wordAndScore[0]);
  }

  // otherwise, pick the candidates that include the most probable but untested letters
  const scoredCandidates = candidates.map(word => {
    const distinctLetters = distinct(word);
    let candidateScore = 0;
    for (const letter of distinctLetters) {
      const letterScore = likeliestUntestedLetters.includes(letter)
        ? 1 / (likeliestUntestedLetters.indexOf(letter) + 1)
        : 0;
      candidateScore += letterScore;
    }
    if (topwords.includes(word)) candidateScore *= 2;
    return [word, candidateScore];
  });
  const bestScore = Math.max(...scoredCandidates.map(wordAndScore => wordAndScore[1]));
  const bestScoredCandidates = scoredCandidates.filter(wordAndScore => wordAndScore[1] === bestScore);
  return bestScoredCandidates.map(wordAndScore => wordAndScore[0]);
}

function testSolver(word, words, topwords) {
  let constraints = [["length", word.length]];
  let guess = word.split("").map(c => " ").join("");
  const guesses = [];
  while (guess !== word) {
    const guess = randNth(getBestCandidates(constraints, words, topwords));
    guesses.push(guess);
    console.log("GUESS:", guess);
    if (guess === word) {
      console.log("GOT IT!");
      return guesses;
    }
    else {
      const newConstraints = getNewConstraints(guess, word);
      constraints = constraints.concat(newConstraints);
    }
  }
}
