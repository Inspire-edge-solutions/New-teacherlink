import React from 'react';
import DashboardComponent from '../../components/JobSeeker/Dashboard/index';
import MetaComponent from '../../components/common/MetaComponent';

const Dashboard = () => {

  const metadata = {
    title: "Teacher Dashboard | Manage Your Teaching Career on TeacherLink",
    description: "Access your personalized teacher dashboard to track applications, view job matches, update your profile, and manage your teaching career opportunities in one place.",
  };

  return (
    <div>
        <MetaComponent meta={metadata} />
        <DashboardComponent />
    </div>
  )
}

export default Dashboard