import React, { useState, useEffect } from "react";
import { Box, AppBar, Toolbar, styled, Stack, IconButton } from "@mui/material";
import { Menu as MenuIcon } from "@mui/icons-material";
import Profile from "./Profile";
import { useAuth } from "../../Context/AuthContext";
import axios from "axios";

const DashboardHeader = ({ onMenuClick , activeTab }) => {
  const { user } = useAuth();
  const [userName, setUserName] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserName = async () => {
      if (!user?.uid) {
        setLoading(false);
        return;
      }

      try {
        const response = await axios.get("https://l4y3zup2k2.execute-api.ap-south-1.amazonaws.com/dev/login");
        const users = Array.isArray(response.data) ? response.data : [];
        const currentUser = users.find(u => u.firebase_uid === user.uid);
        
        if (currentUser && currentUser.name) {
          setUserName(currentUser.name);
        } else {
          setUserName(user.name || "");
        }
      } catch (error) {
        console.error("Error fetching user name:", error);
        setUserName(user.name || "");
      } finally {
        setLoading(false);
      }
    };

    fetchUserName();
  }, [user?.uid, user?.name]);
  const AppBarStyled = styled(AppBar)(({ theme }) => ({
    borderRight: "1px solid white",
    background: "white",
    justifyContent: "center",
    // backdropFilter: "blur(4px)",
    // [theme.breakpoints.up("lg")]: {
    //   minHeight: customizer.TopbarHeight,
    // },
  }));
  const ToolbarStyled = styled(Toolbar)(({ theme }) => ({
    width: "100%",
    // color: theme.palette.text.secondary,
  }));

  return (
    <AppBarStyled position="sticky" color="default">
      <ToolbarStyled>
        <IconButton
          edge="start"
          color="inherit"
          aria-label="menu"
          onClick={onMenuClick}
          sx={{ display: { md: "none",sm:"none", xs: "inline-flex" } }} // only show on small screens
        >
          <MenuIcon size={22} />
        </IconButton>
        
        {/* Active Tab - Left Side */}
        <div className="ml-4 flex items-center">
          <h2 
            className="text-2xl font-bold bg-gradient-brand-text bg-clip-text text-transparent"
          >
            {activeTab}
          </h2>
        </div>
        
        <Box flexGrow={1} />
        
        <Stack spacing={1} direction="row" alignItems="center">
          <Profile />
        </Stack>
      </ToolbarStyled>
    </AppBarStyled>
  );
};

export default DashboardHeader;



// import React, { useState, useEffect } from "react";
// import { Box, AppBar, Toolbar, styled, Stack, IconButton } from "@mui/material";
// import Profile from "./Profile";
// import { useAuth } from "../../Context/AuthContext";
// import axios from "axios";

// const DashboardHeader = ({ onMenuClick , activeTab }) => {
//   const { user } = useAuth();
//   const [userName, setUserName] = useState("");
//   const [loading, setLoading] = useState(true);

//   useEffect(() => {
//     const fetchUserName = async () => {
//       if (!user?.uid) {
//         setLoading(false);
//         return;
//       }

//       try {
//         const response = await axios.get("https://l4y3zup2k2.execute-api.ap-south-1.amazonaws.com/dev/login");
//         const users = Array.isArray(response.data) ? response.data : [];
//         const currentUser = users.find(u => u.firebase_uid === user.uid);
        
//         if (currentUser && currentUser.name) {
//           setUserName(currentUser.name);
//         } else {
//           setUserName(user.name || "");
//         }
//       } catch (error) {
//         console.error("Error fetching user name:", error);
//         setUserName(user.name || "");
//       } finally {
//         setLoading(false);
//       }
//     };

//     fetchUserName();
//   }, [user?.uid, user?.name]);
//   const AppBarStyled = styled(AppBar)(({ theme }) => ({
//     borderRight: "1px solid white",
//     background: "white",
//     justifyContent: "center",
//     // backdropFilter: "blur(4px)",
//     // [theme.breakpoints.up("lg")]: {
//     //   minHeight: customizer.TopbarHeight,
//     // },
//   }));
//   const ToolbarStyled = styled(Toolbar)(({ theme }) => ({
//     width: "100%",
//     // color: theme.palette.text.secondary,
//   }));

//   return (
//     <AppBarStyled position="sticky" color="default">
//       <ToolbarStyled>

//       <IconButton
//           edge="start"
//           color="inherit"
//           aria-label="menu"
//           onClick={onMenuClick}
//           sx={{ display: { md: "none", xs: "inline-flex" } }} // only show on small screens
//         >
//           <MenuIcon size={22} />
//         </IconButton>
//         <Box flexGrow={1} />
//         <Stack spacing={1} direction="row" alignItems="center">

//         {/* Username Display */}
//         <div className="ml-4 flex items-center">
//           <h2 
//             className="text-3xl font-bold bg-gradient-to-r from-[#F34B58] to-[#A1025D] bg-clip-text text-transparent"
//           >
//             {/* {loading ? "Loading..." : (userName ? `Welcome ${userName}!` : "Dashboard")} */}
//             {activeTab}
//           </h2>
//         </div>
        
//         <div className="flex-grow" />
//         <div className="flex items-center gap-2">
//           <Profile />
//         </div>
//         </Stack>
//       </ToolbarStyled>
//     </AppBarStyled>
//   );
// };

// export default DashboardHeader;
