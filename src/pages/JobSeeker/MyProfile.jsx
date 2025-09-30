import React from 'react';
import MyProfileComponent from '../../components/JobSeeker/MyProfile/index';
import MetaComponent from '../../components/common/MetaComponent';

const MyProfile = () => {

    const metadata = {
        title: "Teacher Profile | Showcase Your Teaching Experience and Credentials",
        description: "Create and manage your comprehensive teaching profile on TeacherLink. Highlight your education, certifications, teaching experience, and skills to attract the best opportunities.",
      };

  return (
    <div>
        <MetaComponent meta={metadata} />
        <MyProfileComponent />
    </div>
  )
}

export default MyProfile