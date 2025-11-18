import React from 'react';
import { FaStar, FaHome, FaEnvelope, FaShareAlt, FaTag, FaPalette } from 'react-icons/fa';
import { MdTrendingUp } from 'react-icons/md';
import { HiSparkles } from 'react-icons/hi2';

// Main featured package
export const homepageBannerPackage = {
  id: 'homepage-banner',
  name: 'Homepage Banner Advertisement',
  icon: <FaHome className="text-green-500" />,
  description: 'Display your advertisement on our home page',
  price: '2000',
  duration: '1 week',
  features: [
    'Prominent banner placement on home page',
    'High visibility to all visitors',
    'Custom banner design options available',
    'Mobile responsive display'
  ]
};

// Future packages in accordion
export const futurePackages = [
  {
    id: 'featured-job',
    name: 'Featured Job Posting',
    icon: <FaStar className="text-yellow-500" />,
    description: 'Get your job posting featured at the top of search results',
    price: '500',
    duration: '1 week',
    features: [
      'Top placement in job search results',
      'Featured badge on job card',
      '3x more visibility than regular posts',
      'Priority in candidate recommendations',
      'Highlighted with premium styling'
    ]
  },
  {
    id: 'sponsored-listing',
    name: 'Sponsored Job Listing',
    icon: <MdTrendingUp className="text-blue-500" />,
    description: 'Promote your job with enhanced visibility and branding',
    price: '800',
    duration: '2 weeks',
    features: [
      'Featured placement in multiple sections',
      'Custom branded job card design',
      '5x more visibility',
      'Priority email notifications to candidates',
      'Analytics dashboard included'
    ]
  },
//   {
//     id: 'newsletter-sponsorship',
//     name: 'Newsletter Sponsorship',
//     icon: <FaEnvelope className="text-purple-500" />,
//     description: 'Reach thousands of candidates via email newsletter',
//     price: '1500',
//     duration: '1 newsletter',
//     features: [
//       'Featured placement in weekly newsletter',
//       'Reach 10,000+ active job seekers',
//       'Custom content section',
//       'Direct links to your job postings',
//       'Performance metrics report'
//     ]
//   },
  {
    id: 'social-media-promotion',
    name: 'Social Media Promotion',
    icon: <FaShareAlt className="text-pink-500" />,
    description: 'Promote your jobs across social media platforms',
    price: '1200',
    duration: '1 week',
    features: [
      'Posts on Facebook, LinkedIn, Twitter',
      'Professional content creation',
      'Targeted audience reach',
      'Engagement tracking',
      'Multiple job postings included'
    ]
  },
  {
    id: 'category-promotion',
    name: 'Category-Specific Promotion',
    icon: <FaTag className="text-orange-500" />,
    description: 'Target candidates in specific job categories',
    price: '1000',
    duration: '2 weeks',
    features: [
      'Featured in selected category',
      'Targeted candidate matching',
      'Category banner placement',
      'Enhanced search visibility',
      'Category-specific analytics'
    ]
  },
  {
    id: 'branded-content',
    name: 'Branded Content Package',
    icon: <FaPalette className="text-indigo-500" />,
    description: 'Complete branding solution for your institute',
    price: '3000',
    duration: '1 month',
    features: [
      'Custom branded job cards',
      'Institute logo on all listings',
      'Branded email templates',
      'Custom color scheme',
      'Dedicated account manager'
    ]
  },
  {
    id: 'premium-package',
    name: 'Premium Advertising Package',
    icon: <HiSparkles className="text-yellow-400" />,
    description: 'All-in-one premium advertising solution',
    price: '5000',
    duration: '1 month',
    features: [
      'All premium features included',
      'Homepage banner + Featured listings',
      'Newsletter + Social media promotion',
      'Branded content + Analytics',
      'Priority support & consultation'
    ]
  }
];

