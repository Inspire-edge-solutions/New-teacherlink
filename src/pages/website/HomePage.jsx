import React from "react";
import Home from "../../components/website/Home/index";
import MetaComponent from "../../components/common/MetaComponent";

const HomePage = () => {

  const metadata = {
    title: "TeacherLink | India’s Trusted Platform to Hire Teachers Online",
    description: "Find and hire qualified teachers with TeacherLink—India’s leading recruitment platform for schools. Post jobs, access verified educators, and hire faster with ease.",
  };

  return (
    <div>
        <MetaComponent meta={metadata} />
      <Home />
    </div>
  );
};

export default HomePage;
