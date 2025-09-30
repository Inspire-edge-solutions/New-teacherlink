import { styled, Container, Box, useTheme, useMediaQuery } from "@mui/material";
import { useState , useEffect} from "react";
import { Outlet , useNavigate} from "react-router-dom";
import Sidebar from "../../components/sidebar/Sidebar";
import DashboardHeader from "../../components/header/DashboardHeader";

const MainWrapper = styled("div")(() => ({
  display: "flex",
  minHeight: "100vh",
  width: "100%",
}));

const PageWrapper = styled("div")(() => ({
  display: "flex",
  flexGrow: 1,
  paddingBottom: "60px",
  flexDirection: "column",
  zIndex: 1,
  width: "100%",
  backgroundColor: "transparent",
}));

const FullLayout = () => {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user"));
  const userType = user?.user_type;
  console.log(user);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  useEffect(() => {
    if(userType === "Candidate" || userType === "Employer"){
    if(userType === "Employer"){
      navigate("/provider/dashboard");
    }else{
      navigate("/seeker/dashboard");
    }
  }else{
    navigate("/");
  }
  }, [userType]);

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
              className="absolute left-0 top-0 h-full z-50"
            />
          </div>
        )
      ) : (
        // Desktop normal sidebar
        <Sidebar isCollapsed={isOpen} setIsCollapsed={setIsOpen} />
      )}

      {/* Page content */}
      <PageWrapper className="page-wrapper">
        <DashboardHeader onMenuClick={() => setIsOpen((prev) => !prev)} />
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
