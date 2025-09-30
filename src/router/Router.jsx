import React, { lazy } from "react";
import { Navigate } from "react-router-dom";
import Loadable from "../layouts/shared/loadable/Loadable.jsx";

// const BlankLayout = Loadable(
//   lazy(() => import("../layouts/blank/BlankLayout.jsx"))
// );

const BlankLayout = Loadable(
  lazy(() => import("../layouts/blank/BlankLayout.jsx"))
);

const Login = Loadable(lazy(() => import("../pages/login/LoginPage.jsx")));
const ForgetPasswordPage = Loadable(lazy(() => import("../pages/login/ForgetPasswordPage.jsx")));
const RegisterPage = Loadable(lazy(() => import("../pages/login/RegisterPage.jsx")));

const HomePage = Loadable(lazy(()=>import("../pages/website/HomePage.jsx")));
const WhyTeacherLinkPage = Loadable(lazy(()=>import("../pages/website/WhyTeacherLinkPage.jsx")));
const SalientFeaturesPage = Loadable(lazy(()=>import("../pages/website/SalientFeaturesPage.jsx")));
const SubscriptionPlansPage = Loadable(lazy(()=>import("../pages/website/SubscriptionPlansPage.jsx")));
const AboutUsPage = Loadable(lazy(()=>import("../pages/website/AboutUsPage.jsx")));
const ContactUsPage = Loadable(lazy(()=>import("../pages/website/ContactUsPage.jsx")));
const TermsPrivacyPage = Loadable(lazy(()=>import("../pages/website/TermsPrivacyPage.jsx")));

const JobProviderDashboard = Loadable(lazy(()=>import("../pages/JobProvider/Dashboard.jsx")));
const JobProviderPostJobs = Loadable(lazy(()=>import("../pages/JobProvider/PostJobs.jsx")));
const JobProviderMyProfile = Loadable(lazy(()=>import("../pages/JobProvider/MyProfile.jsx")));
const JobProviderMyAccount = Loadable(lazy(()=>import("../pages/JobProvider/MyAccount.jsx")));
const JobProviderAllCandidates = Loadable(lazy(()=>import("../pages/JobProvider/Allcandidates.jsx")));
const JobProviderMessages = Loadable(lazy(()=>import("../pages/JobProvider/Messages.jsx")));
const JobProviderNotifications = Loadable(lazy(()=>import("../pages/JobProvider/Notifications.jsx")));
const JobProviderPremiumServices = Loadable(lazy(()=>import("../pages/JobProvider/PremiumServices.jsx")));

const JobSeekerDashboard = Loadable(lazy(()=>import("../pages/JobSeeker/Dashboard.jsx")));
const JobSeekerMyAccount = Loadable(lazy(()=>import("../pages/JobSeeker/MyAccount.jsx")));
const JobSeekerMyProfile = Loadable(lazy(()=>import("../pages/JobSeeker/MyProfile.jsx")));
const JobSeekerAllJobs = Loadable(lazy(()=>import("../pages/JobSeeker/AllJobs.jsx")));
const JobSeekerMessages = Loadable(lazy(()=>import("../pages/JobSeeker/Messages.jsx")));
const JobSeekerNotifications = Loadable(lazy(()=>import("../pages/JobSeeker/Notifications.jsx")));
const JobSeekerRecruiterActions = Loadable(lazy(()=>import("../pages/JobSeeker/RecruiterActions.jsx")));

const FullLayout = Loadable(
  lazy(() => import("../layouts/full/FullLayout.jsx"))
);

const NotFoundPage = Loadable(lazy(() => import("../pages/404/index.jsx")));

const Router = [
  {
    path: "*",
    element: <NotFoundPage />,
  },
  {
    path: "/",
    element: <BlankLayout />,
    children: [
      {
        path: "/",
        element: <Navigate to="/home" />,
      },
      {
        path: "/login",
        element: <Login />,
      },
      {
        path: "/home",
        element: <HomePage />,
      },
      {
        path: "/why-teacherlink",
        element: <WhyTeacherLinkPage />,
      },
      {
        path: "/salient-features",
        element: <SalientFeaturesPage />,
      },
      {
        path: "/subscription-plans",
        element: <SubscriptionPlansPage />,
      },
      {
        path: "/about-us",
        element: <AboutUsPage />,
      },
      {
        path: "/contact-us",
        element: <ContactUsPage />,
      },
      {
        path: "/terms-privacy",
        element: <TermsPrivacyPage />,
      },
      {
        path: "/forget-password",
        element: <ForgetPasswordPage />,
      },
      {
        path: "/register",
        element: <RegisterPage />,
      }
    ],
  },
  {
    path: "/",
    element: <FullLayout />,
    children: [
      {
        path: "/provider/dashboard",
        element: <JobProviderDashboard />,
      },
      {
        path: "/provider/post-jobs",
        element: <JobProviderPostJobs />,
      },
      {
        path: "/provider/my-profile",
        element: <JobProviderMyProfile />,
      },
      {
        path: "/provider/my-account",
        element: <JobProviderMyAccount />,
      },
      {
        path: "/provider/all-candidates",
        element: <JobProviderAllCandidates />,
      },
      {
        path: "/provider/messages",
        element: <JobProviderMessages />,
      },
      {
        path: "/provider/notifications",
        element: <JobProviderNotifications />,
      },
      {
        path: "/provider/premium-services",
        element: <JobProviderPremiumServices />,
      },
      {
        path: '/seeker/dashboard',
        element: <JobSeekerDashboard />,
      },
      {
        path: "/seeker/my-account",
        element: <JobSeekerMyAccount />,
      },
      {
        path: "/seeker/my-profile",
        element: <JobSeekerMyProfile />,
      },
      {
        path: "/seeker/all-jobs",
        element: <JobSeekerAllJobs />,
      },
      {
        path: "/seeker/messages",
        element: <JobSeekerMessages />,
      },
      {
        path: "/seeker/notifications",
        element: <JobSeekerNotifications />,
      },
      {
        path: "/seeker/recruiter-actions",
        element: <JobSeekerRecruiterActions />,
      },
    ]
  },
];

export default Router;
