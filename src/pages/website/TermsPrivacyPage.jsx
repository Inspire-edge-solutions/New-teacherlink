import React from "react";
import TermsPrivacy from "../../components/website/TermsPrivacy/index";
import MetaComponent from "../../components/common/MetaComponent";

const TermsPrivacyPage = () => {

    const metadata = {
        title: 'Terms & Privacy | TeacherLink Platform Agreement & Privacy Policy',
        description: 'Review TeacherLink\'s complete terms of service and privacy policy covering user responsibilities, data protection, platform usage policies, and legal requirements for educators and institutions.'
      }

  return (
    <div>
        <MetaComponent meta={metadata} />
      <TermsPrivacy />
    </div>
  );
};

export default TermsPrivacyPage;
