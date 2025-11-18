import React from 'react';
import PremiumServicesComponent from '../../components/JobProvider/PremiumServices/index';
import MetaComponent from '../../components/common/MetaComponent';

const PremiumServices = () => {

    const metadata = {
        title: "Premium Advertising Services | Promote Your Jobs | TeacherLink",
        description: "Maximize your reach and attract the best teaching talent with our premium advertising packages. Featured job postings, homepage banners, newsletter sponsorships, and more.",
      };
      

  return (
    <div>
        <MetaComponent meta={metadata} />
        <PremiumServicesComponent />
    </div>
  )
}

export default PremiumServices