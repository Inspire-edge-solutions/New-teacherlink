import { styled, Container, Box, useTheme, useMediaQuery } from "@mui/material";
import { useState, useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import Sidebar from "../../components/sidebar/Sidebar";
import DashboardHeader from "../../components/header/DashboardHeader";
import { getUserProp } from "../../Context/UserSession";

const MainWrapper = styled("div")(() => ({
  display: "flex",
  minHeight: "100vh",
  width: "100%",
}));

const PageWrapper = styled("div")(({ theme, sidebarWidth }) => ({
  display: "flex",
  flexGrow: 1,
  paddingBottom: "60px",
  flexDirection: "column",
  zIndex: 1,
  width: "100%",
  backgroundColor: "transparent",
  marginLeft: sidebarWidth,
  transition: "margin-left 0.3s ease-in-out",
  [theme.breakpoints.down("sm")]: {
    marginLeft: 0,
  },
}));

const FullLayout = () => {
  const [isOpen, setIsOpen] = useState(false);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const [activeTab, setActiveTab] = useState("Dashboard");
  const location = useLocation();
  const userType = getUserProp("user", "user_type");

  // Menu mappings for route to label conversion
  const providerMenuMap = {
    "/provider/dashboard": "Dashboard",
    "/provider/my-account": "My Account",
    "/provider/my-profile": "My Profile",
    "/provider/post-jobs": "My Jobs",
    "/provider/all-candidates": "All Candidates",
    "/provider/messages": "Messages",
    "/provider/notifications": "Notifications",
    "/provider/premium-services": "Premium Service",
  };

  const seekerMenuMap = {
    "/seeker/dashboard": "Dashboard",
    "/seeker/my-account": "My Account",
    "/seeker/my-profile": "My Profile",
    "/seeker/all-jobs": "Jobs",
    "/seeker/recruiter-actions": "Recruiter Actions",
    "/seeker/messages": "Messages",
    "/seeker/notifications": "Notifications",
  };

  // Update activeTab based on current route
  useEffect(() => {
    const menuMap = userType === "Employer" ? providerMenuMap : seekerMenuMap;
    const pathname = location.pathname;
    
    // Find matching menu item
    let matchedLabel = "Dashboard"; // default
    
    // Check for exact match first
    if (menuMap[pathname]) {
      matchedLabel = menuMap[pathname];
    } else {
      // Check for path prefix match (for nested routes)
      for (const [path, label] of Object.entries(menuMap)) {
        if (pathname.startsWith(path + "/") || pathname === path) {
          matchedLabel = label;
          break;
        }
      }
    }
    
    setActiveTab(matchedLabel);
  }, [location.pathname, userType]);

  return (
    <MainWrapper>
      {/* Sidebar */}
      {isMobile ? (
        // Mobile overlay mode
        isOpen && (
          <div className="fixed inset-0 z-50">
            <div
              className="absolute inset-0 bg-black opacity-50"
              onClick={() => setIsOpen(false)} // click outside to close
            />
            <Sidebar
              isCollapsed={false}
              setIsCollapsed={setIsOpen}
              setActiveTab={setActiveTab}
              className="absolute left-0 top-0 h-full z-50"
              isMobile={true}
            />
          </div>
        )
      ) : (
        // Desktop normal sidebar
        <Sidebar isCollapsed={isOpen} setIsCollapsed={setIsOpen} setActiveTab={setActiveTab} isMobile={false} />
      )}

      {/* Page content */}
      <PageWrapper className="page-wrapper" sidebarWidth={isOpen ? "64px" : "250px"}>
        <DashboardHeader onMenuClick={() => setIsOpen((prev) => !prev)} activeTab={activeTab} />
        <Container>
          <Box sx={{ minHeight: "calc(100vh - 170px)" }}>
            <Outlet />
          </Box>
        </Container>
      </PageWrapper>
    </MainWrapper>
  );
};

export default FullLayout;
