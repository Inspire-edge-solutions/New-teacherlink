import React from 'react';
import AllJobsComponent from '../../components/JobSeeker/AllJobs/index';
import MetaComponent from '../../components/common/MetaComponent';

const AllJobs = () => {

    const metadata = {
        title: "Browse Teaching Jobs | Find Your Next Teaching Position | TeacherLink",
        description: "Explore hundreds of teaching opportunities across all education levels and locations. Filter by subject, location, and job type to find your perfect teaching position.",
      };
  return (
    <div>
        <MetaComponent meta={metadata} />
        <AllJobsComponent />
    </div>
  )
}

export default AllJobs