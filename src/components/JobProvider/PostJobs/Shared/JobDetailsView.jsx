import React from 'react';

/**
 * Shared component to display comprehensive job details
 * Used in: ActiveJobs, JobPostHistory, SaveJobs (expanded View), and JobReviewModal
 * 
 * @param {Object} jobData - The job object to display
 * @param {Function} formatDate - Optional date formatter function (if not provided, will use default)
 * @param {Function} getDaysRemaining - Optional function to calculate days remaining (for ActiveJobs)
 * @param {String} variant - Display variant: 'expanded' (inline in list) or 'modal' (in review modal)
 */
const JobDetailsView = ({ 
  jobData, 
  formatDate, 
  getDaysRemaining,
  variant = 'expanded' 
}) => {
  if (!jobData) return null;

  // Helper function to format arrays
  const formatArrayData = (arr) => {
    if (!Array.isArray(arr) || arr.length === 0) return "Not specified";
    return arr.join(", ");
  };

  // Helper function to format experience values
  const formatExperience = (years, months) => {
    if (!years && !months) return "Not specified";
    
    // Extract numeric values from various formats
    let yearValue = 0;
    let monthValue = 0;
    
    if (years) {
      if (typeof years === 'number') {
        yearValue = years;
      } else if (typeof years === 'string') {
        // Handle strings like "0 years", "1 year", "2 years", "3 years", or just "3"
        const match = years.match(/^(\d+)/);
        yearValue = match ? parseInt(match[1]) : 0;
      }
    }
    
    if (months) {
      if (typeof months === 'number') {
        monthValue = months;
      } else if (typeof months === 'string') {
        // Handle strings like "0 months", "1 month", "2 months", or just "3"
        const match = months.match(/^(\d+)/);
        monthValue = match ? parseInt(match[1]) : 0;
      }
    }
    
    // If both are 0, return "Not specified"
    if (yearValue === 0 && monthValue === 0) return "Not specified";
    
    const yearText = yearValue > 0 ? `${yearValue} year${yearValue !== 1 ? 's' : ''}` : '';
    const monthText = monthValue > 0 ? `${monthValue} month${monthValue !== 1 ? 's' : ''}` : '';
    return [yearText, monthText].filter(Boolean).join(" ");
  };

  // Helper function to format salary
  const formatSalary = (min, max) => {
    if (!min && !max) return "Not specified";
    if (min && max) return `₹${min} - ₹${max}`;
    if (min) return `₹${min}+`;
    if (max) return `Up to ₹${max}`;
    return "Not specified";
  };

  // Default date formatter
  const defaultFormatDate = (date) => {
    if (!date) return "Not specified";
    try {
      const d = new Date(date);
      return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch {
      return date;
    }
  };

  const formatDateFunc = formatDate || defaultFormatDate;

  // Determine layout classes based on variant
  const isModal = variant === 'modal';
  // Use same layout for both modal and expanded view
  const sectionClassName = 'mb-8';
  // Uniform heading style with brand color
  const headingClassName = 'text-lg font-semibold text-[#A1025D] mb-4 pb-2 border-b-2 border-[#A1025D]';
  const contentClassName = 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4';

  // Get location string (handle both API format and form format)
  const getLocation = () => {
    if (jobData.city && jobData.country && jobData.state_ut) {
      return `${jobData.city}, ${jobData.state_ut}, ${jobData.country}`;
    }
    if (jobData.location) {
      return jobData.location;
    }
    if (jobData.city) {
      return jobData.city;
    }
    return "Not specified";
  };

  return (
    <div className="bg-[#F0D8D9] rounded-lg p-6 shadow-sm">
      {/* Basic Information */}
      <div className={sectionClassName}>
        <h4 className={headingClassName}>
          📝 Basic Information
        </h4>
        <div className={contentClassName}>
          <div><strong>Job Title:</strong> {jobData.job_title || "Not specified"}</div>
          <div><strong>Job Type:</strong> {jobData.job_type?.replace('_', ' ').toUpperCase() || "Not specified"}</div>
          <div><strong>Number of Openings:</strong> {jobData.no_of_opening || "Not specified"}</div>
          <div><strong>Joining Date:</strong> {formatDateFunc(jobData.joining_date) || "Not specified"}</div>
          <div><strong>Salary Range:</strong> {formatSalary(jobData.min_salary, jobData.max_salary)}</div>
          <div><strong>Notice Period:</strong> {jobData.notice_period || "Not specified"}</div>
          {getDaysRemaining && typeof getDaysRemaining === 'function' && (
            <div><strong>Days Remaining:</strong> {getDaysRemaining(jobData)} days</div>
          )}
        </div>
        {jobData.job_description && (
          <div className="mt-4">
            <strong>Job Description: {jobData.job_description}</strong>
          </div>
        )}
      </div>

      {/* Location */}
      <div className={sectionClassName}>
        <h4 className={headingClassName}>
          📍 Location
        </h4>
        <div className={contentClassName}>
          <div><strong>Country:</strong> {jobData.country || "Not specified"}</div>
          <div><strong>State:</strong> {jobData.state_ut || "Not specified"}</div>
          <div><strong>City:</strong> {jobData.city || "Not specified"}</div>
          {jobData.address && (
            <div className="col-span-full">
              <strong>Address:</strong>
              <div className="bg-white p-3 rounded-lg mt-1 border border-gray-200">
                {jobData.address}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Experience Requirements */}
      <div className={sectionClassName}>
        <h4 className={headingClassName}>
          💼 Experience Requirements
        </h4>
        <div className={contentClassName}>
          <div><strong>Total Experience:</strong> {formatExperience(jobData.total_experience_min_years, jobData.total_experience_min_months)} - {formatExperience(jobData.total_experience_max_years, jobData.total_experience_max_months)}</div>
          <div><strong>Teaching Experience:</strong> {formatExperience(jobData.teaching_experience_min_years, jobData.teaching_experience_min_months)} - {formatExperience(jobData.teaching_experience_max_years, jobData.teaching_experience_max_months)}</div>
          <div><strong>Non-Teaching Experience:</strong> {formatExperience(jobData.non_teaching_experience_min_years, jobData.non_teaching_experience_min_months)} - {formatExperience(jobData.non_teaching_experience_max_years, jobData.non_teaching_experience_max_months)}</div>
        </div>
      </div>

      {/* Qualifications & Skills */}
      <div className={sectionClassName}>
        <h4 className={headingClassName}>
          🎓 Qualifications & Skills
        </h4>
        <div className={contentClassName}>
          <div><strong>Required Qualifications:</strong> {formatArrayData(jobData.qualification)}</div>
          <div><strong>Core Subjects:</strong> {formatArrayData(jobData.core_subjects)}</div>
          <div><strong>Optional Subjects:</strong> {formatArrayData(jobData.optional_subject)}</div>
          <div><strong>Designations:</strong> {formatArrayData(jobData.designations)}</div>
          <div><strong>Grades:</strong> {formatArrayData(jobData.designated_grades)}</div>
          <div><strong>Curriculum:</strong> {formatArrayData(jobData.curriculum)}</div>
          <div><strong>Core Expertise:</strong> {formatArrayData(jobData.core_expertise)}</div>
          <div><strong>Computer Skills:</strong> {formatArrayData(jobData.computer_skills)}</div>
        </div>
      </div>

      {/* Languages */}
      <div className={sectionClassName}>
        <h4 className={headingClassName}>
          🗣️ Language Requirements
        </h4>
        <div className={contentClassName}>
          <div><strong>Speak:</strong> {formatArrayData(jobData.language_speak)}</div>
          <div><strong>Read:</strong> {formatArrayData(jobData.language_read)}</div>
          <div><strong>Write:</strong> {formatArrayData(jobData.language_write)}</div>
        </div>
      </div>

      {/* Additional Preferences */}
      <div className={sectionClassName}>
        <h4 className={headingClassName}>
          ⚙️ Additional Preferences
        </h4>
        <div className={contentClassName}>
          <div><strong>Gender:</strong> {jobData.gender || "Not specified"}</div>
          <div><strong>Age Range:</strong> {jobData.minimum_age && jobData.maximum_age ? `${jobData.minimum_age} - ${jobData.maximum_age} years` : "Not specified"}</div>
          <div><strong>Job Search Status:</strong> {jobData.job_search_status || "Not specified"}</div>
          <div><strong>Knowledge of ACC Process:</strong> {jobData.knowledge_of_acc_process || "Not specified"}</div>
          <div><strong>Job Shifts:</strong> {formatArrayData(jobData.job_shifts)}</div>
          <div><strong>Job Process:</strong> {formatArrayData(jobData.job_process)}</div>
          <div><strong>Selection Process:</strong> {formatArrayData(jobData.selection_process)}</div>
          {jobData.tution_types && jobData.tution_types.length > 0 && (
            <div><strong>Tution Types:</strong> {formatArrayData(jobData.tution_types)}</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default JobDetailsView;

