import React from 'react';
import PostJobsComponent from '../../components/JobProvider/PostJobs/index';
import MetaComponent from '../../components/common/MetaComponent';

const PostJobs = () => {

    const metadata = {
        title: "Post Teaching Positions | Create and Manage organization Job Listings",
        description: "Create effective teaching job listings for your school or institution. Manage active postings, track performance metrics, and reach qualified educators for your open positions.",
      };     

  return (
    <div>
        <MetaComponent meta={metadata} />
        <PostJobsComponent />
    </div>
  )
}

export default PostJobs