import React from 'react';
import MessagesComponent from '../../components/JobProvider/Messages/index';
import MetaComponent from '../../components/common/MetaComponent';

const Messages = () => {

    const metadata = {
        title: "Messaging | Communicate with Teachers on TeacherLink",
        description: "Send and receive messages with teachers on TeacherLink. Manage your conversations, track replies, and stay connected with potential candidates for your teaching positions.",
      };
      
  return (
    <div style={{ marginLeft: '-24px', marginRight: '-24px', marginBottom: '-80px', height: 'calc(100vh - 170px + 80px)' }}>
        <MetaComponent meta={metadata} />
        <MessagesComponent />
    </div>
  )
}

export default Messages