import React from 'react';
import AllCandidatesComponent from '../../components/JobProvider/AllCandidates/index';
import MetaComponent from '../../components/common/MetaComponent';

const AllCandidates = () => {

    const metadata = {
        title: "Browse Teacher Candidates | Find Qualified Educators for Your Organization",
        description: "Search our database of qualified teaching professionals. Filter by subject expertise, experience level, certifications, and location to find the perfect educator for your institution.",
      };

  return (
    <div>
        <MetaComponent meta={metadata} />
        <AllCandidatesComponent />
    </div>
  )
}

export default AllCandidates