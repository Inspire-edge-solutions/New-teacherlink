import React from 'react';
import MyAccountComponent from '../../components/JobProvider/MyAccount/index';
import MetaComponent from '../../components/common/MetaComponent';

const MyAccount = () => {

    const metadata = {
        title: "My Account | Manage Your TeacherLink Account",
        description: "Access your TeacherLink account settings, manage your subscription, and view your account history.",
      };

  return (
    <div>
        <MetaComponent meta={metadata} />
        <MyAccountComponent />
    </div>
  )
}

export default MyAccount