import React from "react";
import WhyTeacherlink from "../../components/website/WhyTeacherlink/index";
import MetaComponent from "../../components/common/MetaComponent";

const WhyTeacherlinkPage = () => {

    const metadata = {
        title: 'Why Choose TeacherLink | Smart Hiring for Indian Schools - TeacherLink',
        description: 'Discover why TeacherLink is trusted by schools and educators across India. We simplify teacher hiring with smart tools, verified profiles, and fast recruitment.'
      }

  return (
    <div>
        <MetaComponent meta={metadata} />
      <WhyTeacherlink />
    </div>
  );
};

export default WhyTeacherlinkPage;
