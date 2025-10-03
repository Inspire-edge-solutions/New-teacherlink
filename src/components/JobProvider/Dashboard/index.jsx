import React from 'react'
import Photo from './Components/Photo'
import ProfileCompletion from './Components/ProfileCompletion'
import Coins from './Components/Coins'

const DashboardComponent = () => {
  return (
    <div className="container mx-auto px-2 py-4 space-y-4">
      {/* Top Row: Profile Card + Profile Completion */}
      <div className="grid grid-cols-1 lg:grid-cols-[607fr_419fr] gap-4">
        <Photo />
        <ProfileCompletion />
      </div>

      {/* Bottom Row: Coins & Rewards */}
      <div className="w-full">
        <Coins />
      </div>
    </div>
  )
}

export default DashboardComponent