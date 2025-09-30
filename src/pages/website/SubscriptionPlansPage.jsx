import React from "react";
import SubscriptionPlans from "../../components/website/SubscriptionPlans/index";
import MetaComponent from "../../components/common/MetaComponent";

const SubscriptionPlansPage = () => {

    const metadata = {
        title: 'TeacherLink Subscription Plans | Affordable Hiring Solutions - TeacherLink',
        description: 'Choose the right TeacherLink subscription for your school. Get access to verified teacher profiles, smart hiring tools, and priority support at flexible pricing.',
        
      }

  return (
    <div>
        <MetaComponent meta={metadata} />
      <SubscriptionPlans />
    </div>
  );
};

export default SubscriptionPlansPage;
