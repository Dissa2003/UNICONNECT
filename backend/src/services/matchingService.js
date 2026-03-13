const subjectScore = (a, b) => {
  const overlap = a.subjects.filter(s => b.subjects.includes(s));
  return overlap.length / Math.max(a.subjects.length, 1);
};

const skillScore = (a, b) => {
  const overlap = a.skills.filter(s => b.skills.includes(s));
  return overlap.length / Math.max(a.skills.length, 1);
};

const learningStyleScore = (a, b) => {
  return a.learningStyle === b.learningStyle ? 1 : 0;
};

// additional dimensions
const universityScore = (a, b) => {
  return a.university && b.university && a.university === b.university ? 1 : 0;
};

const degreeScore = (a, b) => {
  return a.degreeProgram && b.degreeProgram && a.degreeProgram === b.degreeProgram ? 1 : 0;
};

const yearScore = (a, b) => {
  if (!a.year || !b.year) return 0;
  const diff = Math.abs(a.year - b.year);
  // penalize difference; same year -> 1, each year apart reduces score
  return Math.max(0, 1 - diff * 0.2);
};

const computeScore = (a, b) => {
  const sScore = subjectScore(a, b);
  const skScore = skillScore(a, b);
  const lScore = learningStyleScore(a, b);
  const uScore = universityScore(a, b);
  const dScore = degreeScore(a, b);
  const yScore = yearScore(a, b);

  // weights sum to 1
  const total =
    sScore * 0.3 +
    skScore * 0.2 +
    lScore * 0.2 +
    uScore * 0.1 +
    dScore * 0.1 +
    yScore * 0.1;

  return total;
};

module.exports = { computeScore };
