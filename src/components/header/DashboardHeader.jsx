import React from "react";
import { Box, AppBar, Toolbar, styled, Stack, IconButton } from "@mui/material";
import Profile from "./Profile";
import { Menu as MenuIcon } from "lucide-react";

const DashboardHeader = ({ onMenuClick }) => {
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
          sx={{ display: { md: "none", xs: "inline-flex" } }} // only show on small screens
        >
          <MenuIcon size={22} />
        </IconButton>
        <Box flexGrow={1} />
        <Stack spacing={1} direction="row" alignItems="center">
          <Profile />
        </Stack>
      </ToolbarStyled>
    </AppBarStyled>
  );
};

export default DashboardHeader;
