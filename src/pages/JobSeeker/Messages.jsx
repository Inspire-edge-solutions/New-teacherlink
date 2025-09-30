import React from 'react';
import MessagesComponent from '../../components/JobSeeker/Messages/index';
import MetaComponent from '../../components/common/MetaComponent';

const Messages = () => {

    const metadata = {
        title: "Messages | Communicate with Recruiters on TeacherLink",
        description: "Send and receive messages with recruiters on TeacherLink. Manage your conversations, track replies, and stay connected with potential recruiters for your teaching positions.",
      };
      

  return (
    <div>
        <MetaComponent meta={metadata} />
        <MessagesComponent />
    </div>
  )
}

export default Messages