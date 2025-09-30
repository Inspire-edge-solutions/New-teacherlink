import { Outlet } from "react-router-dom";
import Header from "../../components/header/Header";
import Footer from "../../components/footer/Footer";

const BlankLayout = () => (
  <>
  <Header />
  <Outlet />
  <Footer />
  </>
);

export default BlankLayout;
