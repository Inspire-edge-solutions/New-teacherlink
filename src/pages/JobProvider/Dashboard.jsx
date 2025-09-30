import React from 'react';
import DashboardComponent from '../../components/JobProvider/Dashboard/index';
import MetaComponent from '../../components/common/MetaComponent';

const Dashboard = () => {

    const metadata = {
        title: "Organization Recruitment Dashboard | Manage Your Education Hiring on TeacherLink",
        description: "Access your institution's recruitment hub to post teaching positions, track applicants, manage candidate communications, and optimize your school's hiring process.",
      };

  return (
    <div>
        <MetaComponent meta={metadata} />
        <DashboardComponent />
    </div>
  )
}

export default Dashboard