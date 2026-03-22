import React from 'react';
import { useSearchParams } from 'react-router-dom';
import StudyRoom from './StudyRoom';
import TutorNav from '../components/TutorNav';
import '../styles/TutorDashboard.css';

export default function TutorChatting() {
  const [searchParams] = useSearchParams();
  const groupId = searchParams.get('groupId') || '';

  return (
    <div className="tutor-page" style={{ minHeight: '100vh' }}>
      <TutorNav active="chatting" />

      <StudyRoom
        initialGroupId={groupId}
        hideReferenceFlow
        layoutOffset={70}
        showCustomCursor={false}
        theme="tutor"
      />
    </div>
  );
}
