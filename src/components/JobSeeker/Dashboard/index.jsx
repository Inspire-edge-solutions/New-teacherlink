import React from 'react'
import Photo from './Components/Photo'
import ProfileCompletion from './Components/ProfileCompletion'
import Coins from './Components/Coins'
import JobSearchStatus from './Components/JobSearchStatus'

const DashboardComponent = () => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 w-full">
      {/* Left Column - Stacked Components */}
      <div className="flex flex-col gap-4">
        <Photo />
        <JobSearchStatus />
        <ProfileCompletion />
      </div>

      {/* Right Column - Coins Component (Available Coins + Coupon Details) */}
      <div>
        <Coins />
      </div>
    </div>
  )
}

export default DashboardComponent