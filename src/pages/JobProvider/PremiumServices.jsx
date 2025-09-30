import React from 'react';
import PremiumServicesComponent from '../../components/JobProvider/PremiumServices/index';
import MetaComponent from '../../components/common/MetaComponent';

const PremiumServices = () => {

    const metadata = {
        title: "Premium Service | Upgrade Your TeacherLink Account",
        description: "Upgrade your TeacherLink account to access premium features and services. Choose from our subscription plans to unlock exclusive benefits and enhance your education recruitment experience.",
      };
      

  return (
    <div>
        <MetaComponent meta={metadata} />
        <PremiumServicesComponent />
    </div>
  )
}

export default PremiumServices