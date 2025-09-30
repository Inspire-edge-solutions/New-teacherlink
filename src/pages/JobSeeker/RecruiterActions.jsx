import React from 'react';
import RecruiterActionsComponent from '../../components/JobSeeker/RecruiterActions/index';
import MetaComponent from '../../components/common/MetaComponent';

const RecruiterActions = () => {

    const metadata = {
        title: "Recruiter Actions | Manage Your TeacherLink Account",
        description: "Get to know how recruiter is liking your profile.",
      };

  return (
    <div>
        <MetaComponent meta={metadata} />
        <RecruiterActionsComponent />
    </div>
  )
}

export default RecruiterActions