const normalize = (value) => String(value || "").trim().toLowerCase();

const subjectMatchScore = (request, tutor) => {
  const wantedSubject = normalize(request.subject);
  if (!wantedSubject) return 0;

  const teaches = (tutor.subjectsYouTeach || []).some(
    (s) => normalize(s) === wantedSubject
  );
  return teaches ? 1 : 0;
};

const teachingStyleScore = (request, tutor) => {
  if (!request.learningStyle || !tutor.teachingStyle) return 0;
  return normalize(request.learningStyle) === normalize(tutor.teachingStyle) ? 1 : 0;
};

const budgetFitScore = (request, tutor) => {
  const studentBudget = Number(request.maxBudget);
  if (Number.isNaN(studentBudget) || studentBudget < 0) return 0;

  const tutorRate = tutor.isFree ? 0 : Number(tutor.hourlyRate || 0);
  if (studentBudget === 0) return tutorRate === 0 ? 1 : 0;
  if (tutorRate <= studentBudget) return 1;

  const priceDiff = tutorRate - studentBudget;
  return Math.max(0, 1 - priceDiff / studentBudget);
};

const experienceScore = (tutor) => {
  if (typeof tutor.averageRating === "number" && tutor.averageRating > 0) {
    return Math.min(Math.max(tutor.averageRating / 5, 0), 1);
  }

  const years = Number(tutor.yearsOfExperience || 0);
  return Math.min(Math.max(years / 10, 0), 1);
};

const languageScore = (request, tutor) => {
  if (!request.language || !tutor.language) return 0;
  return normalize(request.language) === normalize(tutor.language) ? 1 : 0;
};

const availabilityScore = (request, tutor) => {
  const studentAvailability = request.availability || {};
  const tutorAvailability = tutor.availability || {};

  const hasOverlap = Object.keys(studentAvailability).some(
    (slot) => Boolean(studentAvailability[slot]) && Boolean(tutorAvailability[slot])
  );

  return hasOverlap ? 1 : 0;
};

const computeTutorMatchScore = (request, tutor) => {
  const sSubject = subjectMatchScore(request, tutor);
  const sStyle = teachingStyleScore(request, tutor);
  const sBudget = budgetFitScore(request, tutor);
  const sExperience = experienceScore(tutor);
  const sLanguage = languageScore(request, tutor);
  const sTime = availabilityScore(request, tutor);

  const total =
    sSubject * 0.4 +
    sStyle * 0.2 +
    sBudget * 0.15 +
    sExperience * 0.1 +
    sLanguage * 0.1 +
    sTime * 0.05;

  return {
    total,
    dimensions: {
      subject: sSubject,
      style: sStyle,
      budget: sBudget,
      experience: sExperience,
      language: sLanguage,
      availability: sTime,
    },
  };
};

const getTutorMatchReasons = (request, tutor, scoreDimensions) => {
  const reasons = [];

  if (scoreDimensions.subject === 1) {
    reasons.push(`Teaches ${request.subject}`);
  }
  if (scoreDimensions.style === 1) {
    reasons.push(`Teaching style match: ${tutor.teachingStyle}`);
  }
  if (scoreDimensions.budget === 1) {
    reasons.push(tutor.isFree ? "Free tutor" : "Within your budget");
  } else if (!tutor.isFree) {
    reasons.push(`Hourly rate: LKR ${Number(tutor.hourlyRate || 0).toFixed(2)}`);
  }
  if (scoreDimensions.language === 1) {
    reasons.push(`Language match: ${tutor.language}`);
  }
  if (scoreDimensions.availability === 1) {
    reasons.push("Has overlapping available time slots");
  }
  if (scoreDimensions.experience > 0) {
    reasons.push(
      tutor.averageRating > 0
        ? `Tutor rating: ${tutor.averageRating.toFixed(1)}/5`
        : `${tutor.yearsOfExperience || 0} years experience`
    );
  }

  return reasons;
};

module.exports = {
  computeTutorMatchScore,
  getTutorMatchReasons,
};
