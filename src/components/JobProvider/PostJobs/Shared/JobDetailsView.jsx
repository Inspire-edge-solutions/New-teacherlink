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
    // Handle empty strings, null, undefined, or 0
    const hasYears = years !== null && years !== undefined && years !== "" && String(years).trim() !== "";
    const hasMonths = months !== null && months !== undefined && months !== "" && String(months).trim() !== "";
    
    if (!hasYears && !hasMonths) return "Not specified";
    
    // Extract numeric values from various formats
    let yearValue = 0;
    let monthValue = 0;
    
    if (hasYears) {
      if (typeof years === 'number') {
        yearValue = years;
      } else if (typeof years === 'string') {
        // Handle strings like "0 years", "1 year", "2 years", "3 years", or just "3"
        const match = String(years).trim().match(/^(\d+)/);
        yearValue = match ? parseInt(match[1], 10) : 0;
      }
    }
    
    if (hasMonths) {
      if (typeof months === 'number') {
        monthValue = months;
      } else if (typeof months === 'string') {
        // Handle strings like "0 months", "1 month", "2 months", or just "3"
        const match = String(months).trim().match(/^(\d+)/);
        monthValue = match ? parseInt(match[1], 10) : 0;
      }
    }
    
    // If both are 0, return "Not specified"
    if (yearValue === 0 && monthValue === 0) return "Not specified";
    
    const yearText = yearValue > 0 ? `${yearValue} year${yearValue !== 1 ? 's' : ''}` : '';
    const monthText = monthValue > 0 ? `${monthValue} month${monthValue !== 1 ? 's' : ''}` : '';
    return [yearText, monthText].filter(Boolean).join(" ");
  };

  // Convert salary value to LPA (Lakhs Per Annum) format
  const convertSalaryToLPA = (salaryValue) => {
    if (!salaryValue && salaryValue !== 0) return null;
    
    // Convert to string and normalize
    let valueStr = String(salaryValue).trim();
    if (!valueStr) return null;
    
    // Handle "k" notation (e.g., "20k" = 20000)
    const hasK = /k$/i.test(valueStr);
    if (hasK) {
      valueStr = valueStr.replace(/k$/i, '');
    }
    
    // Extract numeric value
    const numericValue = parseFloat(valueStr);
    if (Number.isNaN(numericValue)) return null;
    
    // Convert "k" notation to actual number
    const actualValue = hasK ? numericValue * 1000 : numericValue;
    
    // Determine if it's monthly or annual
    // If value < 100000, assume it's monthly salary
    // If value >= 100000, assume it's already annual
    const annualSalary = actualValue < 100000 ? actualValue * 12 : actualValue;
    
    // Convert to LPA (divide by 100000)
    const lpa = annualSalary / 100000;
    
    // Format to 1 decimal place, remove trailing zeros
    const formattedLPA = parseFloat(lpa.toFixed(1));
    
    return `${formattedLPA} LPA`;
  };

  // Helper function to format salary in LPA format
  const formatSalary = (min, max) => {
    if (!min && !max) return "Not specified";
    
    const minLPA = convertSalaryToLPA(min);
    const maxLPA = convertSalaryToLPA(max);
    
    if (!minLPA && !maxLPA) return "Not specified";
    if (minLPA && maxLPA) return `${minLPA} to ${maxLPA}`;
    if (minLPA) return `${minLPA}+`;
    if (maxLPA) return `Up to ${maxLPA}`;
    
    return "Not specified";
  };

  // Helper function to format experience range
  const formatExperienceRange = (minYears, minMonths, maxYears, maxMonths) => {
    const minExp = formatExperience(minYears, minMonths);
    const maxExp = formatExperience(maxYears, maxMonths);
    
    if (minExp === "Not specified" && maxExp === "Not specified") {
      return "Not specified";
    }
    if (minExp === "Not specified" && maxExp !== "Not specified") {
      return `Up to ${maxExp}`;
    }
    if (minExp !== "Not specified" && maxExp === "Not specified") {
      return `${minExp}+`;
    }
    if (minExp === maxExp) {
      return minExp;
    }
    return `${minExp} to ${maxExp}`;
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
  const headingClassName = 'text-xl font-semibold text-[#A1025D] mb-4 pb-2 border-b-2 border-[#A1025D] leading-tight tracking-tight';
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
          <div className="leading-normal tracking-tight"><strong>Job Title:</strong> {jobData.job_title || "Not specified"}</div>
          <div className="leading-normal tracking-tight"><strong>Job Type:</strong> {jobData.job_type?.replace('_', ' ').toUpperCase() || "Not specified"}</div>
          <div className="leading-normal tracking-tight"><strong>Number of Openings:</strong> {jobData.no_of_opening || "Not specified"}</div>
          <div className="leading-normal tracking-tight"><strong>Joining Date:</strong> {formatDateFunc(jobData.joining_date) || "Not specified"}</div>
          <div className="leading-normal tracking-tight"><strong>Salary Range:</strong> {formatSalary(jobData.min_salary, jobData.max_salary)}</div>
          <div className="leading-normal tracking-tight"><strong>Notice Period:</strong> {jobData.notice_period || "Not specified"}</div>
          {getDaysRemaining && typeof getDaysRemaining === 'function' && (
            <div className="leading-normal tracking-tight"><strong>Days Remaining:</strong> {getDaysRemaining(jobData)} days</div>
          )}
        </div>
        {jobData.job_description && (
          <div className="mt-4 leading-normal tracking-tight">
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
          <div className="leading-normal tracking-tight"><strong>Country:</strong> {jobData.country || "Not specified"}</div>
          <div className="leading-normal tracking-tight"><strong>State:</strong> {jobData.state_ut || "Not specified"}</div>
          <div className="leading-normal tracking-tight"><strong>City:</strong> {jobData.city || "Not specified"}</div>
          {jobData.address && (
            <div className="col-span-full leading-normal tracking-tight">
              <strong>Address:</strong>
              <div className="bg-white p-3 rounded-lg mt-1 border border-gray-200 leading-normal tracking-tight">
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
          <div className="leading-normal tracking-tight"><strong>Total Experience:</strong> {formatExperienceRange(jobData.total_experience_min_years, jobData.total_experience_min_months, jobData.total_experience_max_years, jobData.total_experience_max_months)}</div>
          <div className="leading-normal tracking-tight"><strong>Teaching Experience:</strong> {formatExperienceRange(jobData.teaching_experience_min_years, jobData.teaching_experience_min_months, jobData.teaching_experience_max_years, jobData.teaching_experience_max_months)}</div>
          <div className="leading-normal tracking-tight"><strong>Non-Teaching Experience:</strong> {formatExperienceRange(jobData.non_teaching_experience_min_years, jobData.non_teaching_experience_min_months, jobData.non_teaching_experience_max_years, jobData.non_teaching_experience_max_months)}</div>
        </div>
      </div>

      {/* Qualifications & Skills */}
      <div className={sectionClassName}>
        <h4 className={headingClassName}>
          🎓 Qualifications & Skills
        </h4>
        <div className={contentClassName}>
          <div className="leading-normal tracking-tight"><strong>Required Qualifications:</strong> {formatArrayData(jobData.qualification)}</div>
          <div className="leading-normal tracking-tight"><strong>Core Subjects:</strong> {formatArrayData(jobData.core_subjects)}</div>
          <div className="leading-normal tracking-tight"><strong>Optional Subjects:</strong> {formatArrayData(jobData.optional_subject)}</div>
          <div className="leading-normal tracking-tight"><strong>Designations:</strong> {formatArrayData(jobData.designations)}</div>
          <div className="leading-normal tracking-tight"><strong>Grades:</strong> {formatArrayData(jobData.designated_grades)}</div>
          <div className="leading-normal tracking-tight"><strong>Curriculum:</strong> {formatArrayData(jobData.curriculum)}</div>
          <div className="leading-normal tracking-tight"><strong>Core Expertise:</strong> {formatArrayData(jobData.core_expertise)}</div>
          <div className="leading-normal tracking-tight"><strong>Computer Skills:</strong> {formatArrayData(jobData.computer_skills)}</div>
        </div>
      </div>

      {/* Languages */}
      <div className={sectionClassName}>
        <h4 className={headingClassName}>
          🗣️ Language Requirements
        </h4>
        <div className={contentClassName}>
          <div className="leading-normal tracking-tight"><strong>Speak:</strong> {formatArrayData(jobData.language_speak)}</div>
          <div className="leading-normal tracking-tight"><strong>Read:</strong> {formatArrayData(jobData.language_read)}</div>
          <div className="leading-normal tracking-tight"><strong>Write:</strong> {formatArrayData(jobData.language_write)}</div>
        </div>
      </div>

      {/* Additional Preferences */}
      <div className={sectionClassName}>
        <h4 className={headingClassName}>
          ⚙️ Additional Preferences
        </h4>
        <div className={contentClassName}>
          <div className="leading-normal tracking-tight"><strong>Gender:</strong> {jobData.gender || "Not specified"}</div>
          <div className="leading-normal tracking-tight"><strong>Age Range:</strong> {jobData.minimum_age && jobData.maximum_age ? `${jobData.minimum_age} - ${jobData.maximum_age} years` : "Not specified"}</div>
          <div className="leading-normal tracking-tight"><strong>Job Search Status:</strong> {jobData.job_search_status || "Not specified"}</div>
          <div className="leading-normal tracking-tight"><strong>Knowledge of ACC Process:</strong> {jobData.knowledge_of_acc_process || "Not specified"}</div>
          <div className="leading-normal tracking-tight"><strong>Job Shifts:</strong> {formatArrayData(jobData.job_shifts)}</div>
          <div className="leading-normal tracking-tight"><strong>Job Process:</strong> {formatArrayData(jobData.job_process)}</div>
          <div className="leading-normal tracking-tight"><strong>Selection Process:</strong> {formatArrayData(jobData.selection_process)}</div>
          {jobData.tution_types && jobData.tution_types.length > 0 && (
            <div className="leading-normal tracking-tight"><strong>Tution Types:</strong> {formatArrayData(jobData.tution_types)}</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default JobDetailsView;