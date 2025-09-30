import React from "react";
import ContactUs from "../../components/website/ContactUs/index";
import MetaComponent from "../../components/common/MetaComponent";

const ContactUsPage = () => {

    const metadata = {
        title: 'Contact TeacherLink | We\'re Here to Help You Hire Better - Teacherlink',
        description: 'Get in touch with the TeacherLink team for support, inquiries, or demo requests. We assist schools and educators across India with personalized service.'
      }

  return (
    <div>
        <MetaComponent meta={metadata} />
      <ContactUs />
    </div>
  );
};

export default ContactUsPage;
