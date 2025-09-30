import React from "react";
import SalientFeatures from "../../components/website/SalientFeatures/index";
import MetaComponent from "../../components/common/MetaComponent";

const SalientFeaturesPage = () => {

const metadata = {
    title: 'Key Features of TeacherLink | Smarter Hiring for Schools - TeacherLink',
    description: 'Explore the standout features of TeacherLink that simplify recruitment for schools AI-based filtering, verified teachers, and end-to-end hiring solutions.',
    }

  return (
    <div>
        <MetaComponent meta={metadata} />
      <SalientFeatures />
    </div>
  );
};

export default SalientFeaturesPage;
