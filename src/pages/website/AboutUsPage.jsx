import React from "react";
import AboutUs from "../../components/website/AboutUs/index";
import MetaComponent from "../../components/common/MetaComponent";

const AboutUsPage = () => {

    const metadata = {
        title: 'About TeacherLink | Revolutionizing Teacher Recruitment in India - TeacherLink',
        description: 'Learn about TeacherLink\'s mission to bridge the gap between schools and qualified teachers. Discover our journey, values, and commitment to education excellence.',
      }

  return (
    <div>
        <MetaComponent meta={metadata} />
      <AboutUs />
    </div>
  );
};

export default AboutUsPage;
