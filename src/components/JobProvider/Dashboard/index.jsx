import React, { useState, useEffect, lazy, Suspense } from 'react'
import { Grow, Paper, Skeleton, Box } from '@mui/material'
import Photo from './Components/Photo'
import Coins from './Components/Coins'

const DashboardComponent = () => {
  const [checked, setChecked] = useState(false);
  const Pc = lazy(() => import("./Components/ProfileCompletion"));

  // Skeleton fallback for lazy loading
  const ProfileCompletionSkeleton = () => (
    <div className="bg-white rounded-lg shadow-md p-4 sm:p-6 relative h-full">
      {/* Title Skeleton */}
      <div className="text-center mb-3 sm:mb-4">
        <Skeleton variant="text" width="60%" height={24} className="mx-auto" />
      </div>

      {/* Circular Progress Skeleton */}
      <div className="flex items-center justify-center mb-3 sm:mb-4">
        <Skeleton 
          variant="circular" 
          width={100} 
          height={100}
          className="sm:w-[100px] sm:h-[100px] w-[80px] h-[80px]"
        />
      </div>
      
      {/* Arrow Link Skeleton */}
      <div className="absolute bottom-4 right-4 sm:bottom-6 sm:right-6">
        <Skeleton 
          variant="rectangular" 
          width={32} 
          height={32}
          className="rounded"
        />
      </div>
    </div>
  );

  useEffect(() => {
    const timer = setTimeout(() => setChecked(true), 200)
    return () => clearTimeout(timer)
  }, [])

  return (
    <div className="container mx-auto px-2 sm:px-4 py-3 sm:py-4 space-y-3 sm:space-y-4">
      {/* Top Row: Profile Card + Profile Completion */}
      <div className="grid grid-cols-1 lg:grid-cols-[607fr_419fr] gap-3 sm:gap-4">
        <Grow
          in={checked}
          style={{ transformOrigin: '0 0 0' }}
          {...(checked ? { timeout: 800 } : {})}
        >
          <Paper elevation={8}>
            <Photo />
          </Paper>
        </Grow>
        
        <Grow
          in={checked}
          style={{ transformOrigin: '0 0 0' }}
          {...(checked ? { timeout: 1000 } : {})}
        >
          <Paper elevation={8}>
            <Suspense fallback={<ProfileCompletionSkeleton />}>
              <Pc />
            </Suspense>
          </Paper>
        </Grow>
      </div>

      {/* Bottom Row: Coins & Rewards */}
      <Grow
        in={checked}
        style={{ transformOrigin: '0 0 0' }}
        {...(checked ? { timeout: 1200 } : {})}
      >
        <Paper elevation={8} className="w-full">
          <Coins />
        </Paper>
      </Grow>
    </div>
  )
}

export default DashboardComponent;