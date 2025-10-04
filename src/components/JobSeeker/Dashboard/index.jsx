import React, { useState, useEffect, lazy, Suspense } from 'react'
import { Grow, Paper, Skeleton, Box } from '@mui/material'
import Photo from './Components/Photo'
import Coins from './Components/Coins'
import JobSearchStatus from './Components/JobSearchStatus'

const DashboardComponent = () => {
  const [checked, setChecked] = useState(false)
  const ProfileCompletion = lazy(() => import('./Components/ProfileCompletion'))

  // Skeleton fallback for lazy loading
  const ProfileCompletionSkeleton = () => (
    <div className="bg-white rounded-lg shadow-md p-2 sm:p-3 relative">
      {/* Title Skeleton */}
      <div className="text-center mb-1 sm:mb-2">
        <Skeleton variant="text" width="60%" height={24} className="mx-auto" />
      </div>

      {/* Two Column Grid Skeleton */}
      <div className="grid grid-cols-2 gap-2 sm:gap-3">
        {/* Short Profile Column */}
        <div className="flex flex-col">
          <Skeleton variant="text" width="80%" height={20} className="mx-auto mb-1" />
          <div className="flex flex-col items-center">
            {/* Circular Progress Skeleton */}
            <div className="flex items-center justify-center mb-1 sm:mb-2">
              <Skeleton 
                variant="circular" 
                width={100} 
                height={100}
                className="sm:w-[100px] sm:h-[100px] w-[70px] h-[70px]"
              />
            </div>
            
            {/* Arrow Link Skeleton */}
            <Skeleton 
              variant="rectangular" 
              width={32} 
              height={32}
              className="rounded"
            />
          </div>
        </div>

        {/* Complete Profile Column */}
        <div className="flex flex-col">
          <Skeleton variant="text" width="80%" height={20} className="mx-auto mb-1" />
          <div className="flex flex-col items-center">
            {/* Circular Progress Skeleton */}
            <div className="flex items-center justify-center mb-1 sm:mb-2">
              <Skeleton 
                variant="circular" 
                width={100} 
                height={100}
                className="sm:w-[100px] sm:h-[100px] w-[70px] h-[70px]"
              />
            </div>
            
            {/* Arrow Link Skeleton */}
            <Skeleton 
              variant="rectangular" 
              width={32} 
              height={32}
              className="rounded"
            />
          </div>
        </div>
      </div>
    </div>
  )

  useEffect(() => {
    const timer = setTimeout(() => setChecked(true), 200)
    return () => clearTimeout(timer)
  }, [])

  return (
    <div className="flex flex-col gap-3 sm:gap-4 w-full md:p-5 p-0">
      {/* First Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 items-start">
        {/* Left Side - Photo and JobSearchStatus */}
        <div className="flex flex-col gap-3 sm:gap-4">
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
            {...(checked ? { timeout: 1200 } : {})}
          >
            <Paper elevation={8}>
              <JobSearchStatus />
            </Paper>
          </Grow>
        </div>

        {/* Right Side - ProfileCompletion */}
        <Grow
          in={checked}
          style={{ transformOrigin: '0 0 0' }}
          {...(checked ? { timeout: 1000 } : {})}
        >
          <Paper elevation={8}>
            <Suspense fallback={<ProfileCompletionSkeleton />}>
              <ProfileCompletion />
            </Suspense>
          </Paper>
        </Grow>
      </div>

      {/* Second Row - Coins section split */}
      <Grow
        in={checked}
        style={{ transformOrigin: '0 0 0' }}
        {...(checked ? { timeout: 1400 } : {})}
      >
        <Paper elevation={8}>
          <Coins />
        </Paper>
      </Grow>
    </div>
  )
}

export default DashboardComponent


// import React, { useState, useEffect } from "react";
// import { Box, Grid, Paper, Grow } from "@mui/material";
// import Photo from "./Components/Photo";

// const Dashboard = () => {
//   const [checked, setChecked] = useState(false);

//   useEffect(() => {
//     const timer = setTimeout(() => setChecked(true), 200);
//     return () => clearTimeout(timer);
//   }, []);

//   return (
//     <Box className="p-6">
//       <Grid container spacing={3}>
//         {/* ===== Row 1 - Two Grids ===== */}
//         <Grid item xs={12}>
//           <Grid container spacing={3}>
//             <Grid item xs={12} md={6}>
//               <Grow
//                 in={checked}
//                 style={{ transformOrigin: "0 0 0" }}
//                 {...(checked ? { timeout: 1000 } : {})}
//               >
                
//                 <Paper
//                   elevation={18}
//                   className="h-64 flex items-center justify-center text-lg font-semibold"
//                 >
//                   <Photo />
//                 </Paper>
//               </Grow>
//             </Grid>
//             <Grid item xs={12} md={6}>
//               <Grow
//                 in={checked}
//                 style={{ transformOrigin: "0 0 0" }}
//                 {...(checked ? { timeout: 1200 } : {})}
//               >
//                 <Paper
//                   elevation={18}
//                   className="h-64 flex items-center justify-center text-lg font-semibold"
//                 >
//                   Row 1 - Grid 2
//                 </Paper>
//               </Grow>
//             </Grid>
//           </Grid>
//         </Grid>

//         {/* ===== Row 2 - Three Grids ===== */}
//         <Grid item xs={12}>
//           <Grid container spacing={3}>
//             <Grid item xs={12} sm={6} md={4}>
//               <Grow
//                 in={checked}
//                 style={{ transformOrigin: "0 0 0" }}
//                 {...(checked ? { timeout: 1400 } : {})}
//               >
//                 <Paper
//                   elevation={18}
//                   className="h-64 flex items-center justify-center text-lg font-semibold"
//                 >
//                   Row 2 - Grid 1
//                 </Paper>
//               </Grow>
//             </Grid>

//             <Grid item xs={12} sm={6} md={4}>
//               <Grow
//                 in={checked}
//                 style={{ transformOrigin: "0 0 0" }}
//                 {...(checked ? { timeout: 1600 } : {})}
//               >
//                 <Paper
//                   elevation={18}
//                   className="h-64 flex items-center justify-center text-lg font-semibold"
//                 >
//                   Row 2 - Grid 2
//                 </Paper>
//               </Grow>
//             </Grid>

//             <Grid item xs={12} sm={12} md={4}>
//               <Grow
//                 in={checked}
//                 style={{ transformOrigin: "0 0 0" }}
//                 {...(checked ? { timeout: 1800 } : {})}
//               >
//                 <Paper
//                   elevation={18}
//                   className="h-64 flex items-center justify-center text-lg font-semibold"
//                 >
//                   Row 2 - Grid 3
//                 </Paper>
//               </Grow>
//             </Grid>
//           </Grid>
//         </Grid>
//       </Grid>
//     </Box>
//   );
// };

// export default Dashboard;