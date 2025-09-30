import React from 'react';
import MyProfileComponent from '../../components/JobProvider/MyProfile/index';
import MetaComponent from '../../components/common/MetaComponent';

const MyProfile = () => {

    const metadata = {
        title: "Organization Profile | Showcase Your Educational Institution on TeacherLink",
        description: "Create an attractive profile for your school or educational institution. Highlight your values, culture, facilities, and achievements to attract qualified teaching candidates.",
      };      

  return (
    <div>
        <MetaComponent meta={metadata} />
        <MyProfileComponent />
    </div>
  )
}

export default MyProfile