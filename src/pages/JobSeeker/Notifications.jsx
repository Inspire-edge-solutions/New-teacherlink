import React from 'react';
import NotificationsComponent from '../../components/JobSeeker/Notifications/index';
import MetaComponent from '../../components/common/MetaComponent';

const Notifications = () => {

    const metadata = {
        title: "Notifications | Manage Your TeacherLink Account",
        description: "Receive notifications about your TeacherLink account, including password changes, account updates, and important platform announcements.",
      };

  return (
    <div>
        <MetaComponent meta={metadata} />
        <NotificationsComponent />
    </div>
  )
}

export default Notifications