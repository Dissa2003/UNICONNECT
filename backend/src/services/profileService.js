const StudentProfile = require('../models/StudentProfile');

exports.getProfile = async (id) => {
  // Placeholder: return mock profile
  return new StudentProfile({ id, name: 'Test Student', email: 'student@example.com', major: 'Computer Science' });
};

exports.createProfile = async (data) => {
  // Placeholder: echo back created profile with mock id
  return new StudentProfile({ id: 'mock-id', ...data });
};
