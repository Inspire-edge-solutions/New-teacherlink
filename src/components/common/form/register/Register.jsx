import { Tab, Tabs, TabList, TabPanel } from "react-tabs";
import LoginWithSocial from "./LoginWithSocial";
import Form from "./FormContent";
import { Link } from "react-router-dom";
import { useState } from "react";

const Register = ({ onUserTypeChange }) => {
  const [user_type, setUser_type] = useState("Candidate");

  const handleUserType = (type) => {
    setUser_type(type);
    onUserTypeChange(type);
  };

  return (
    <div className="form-inner">
      <h3>Create a Free TeacherLink Account !</h3>

      <Tabs>
        <div className="form-group register-dual">
          <TabList className="btn-box row">
            <Tab className="col-lg-6 col-md-12" onClick={() => handleUserType("Candidate")}>
              <button className="theme-btn btn-style-four" >
                <i className="la la-user"></i> Job Seeker
              </button>
            </Tab>

            <Tab className="col-lg-6 col-md-12" onClick={() => handleUserType("Employer")}>
              <button className="theme-btn btn-style-four">
                <i className="la la-briefcase"></i> Job Provider
              </button>
            </Tab>
          </TabList>
        </div>
        {/* End .form-group */}

        <TabPanel>
          <Form user_type={user_type} />
        </TabPanel>
        {/* End cadidates Form */}

        <TabPanel>
          <Form user_type={user_type} />
        </TabPanel>
        {/* End Employer Form */}
      </Tabs>
      {/* End form-group */}

      <div className="bottom-box">
        <div className="text">
          Already have an account?{" "}
          <Link
            to="/login"
            className="call-modal login"
          >
            Log In
          </Link>
        </div>
        <div className="divider">
          <span>or</span>
        </div>
        <LoginWithSocial />
      </div>
      {/* End bottom-box LoginWithSocial */}
    </div>
  );
};

export default Register;
