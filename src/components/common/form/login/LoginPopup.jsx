import Register from "../register/Register";
import FormContent from "./FormContent";
import { getIcon } from "../../../../utils/iconMapping";
import { Link } from "react-router-dom";

const LoginPopup = () => {
  
  return (
    <>
      <div className="modal fade" id="loginPopupModal">
        <div className="modal-dialog modal-lg modal-dialog-centered login-modal modal-dialog-scrollable">
          <div className="modal-content">
            <button
              type="button"
              className="closed-modal"
              data-bs-dismiss="modal"
            >
              {getIcon('icon-close')}
            </button>
            {/* End close modal btn */}

            <div className="modal-body">
              {/* <!-- Login modal --> */}
              <div id="login-modal">
                {/* <!-- Logo --> */}
                <div className="text-center mb-4 mt-3">
                  <Link to="/" data-bs-dismiss="modal">
                    <img 
                      src="/images/teacherlink-logo.svg" 
                      alt="Teacherlink Logo" 
                      style={{ maxHeight: '60px', width: 'auto', cursor: 'pointer' }}
                    />
                  </Link>
                </div>
                {/* <!-- Login Form --> */}
                <div className="login-form default-form">
                  <FormContent />
                </div>
                {/* <!--End Login Form --> */}
              </div>
              {/* <!-- End Login Module --> */}
            </div>
            {/* End modal-body */}
          </div>
          {/* End modal-content */}
        </div>
      </div>
      {/* <!-- Login Popup Modal --> */}

      <div className="modal fade" id="registerModal">
        <div className="modal-dialog modal-lg modal-dialog-centered login-modal modal-dialog-scrollable">
          <div className="modal-content">
            <button
              type="button"
              className="closed-modal"
              data-bs-dismiss="modal"
            >
              {getIcon('icon-close')}
            </button>
            {/* End close modal btn */}

            <div className="modal-body">
              {/* <!-- Login modal --> */}
              <div id="login-modal">
                {/* <!-- Logo --> */}
                <div className="text-center mb-4 mt-3">
                  <Link to="/" data-bs-dismiss="modal">
                    <img 
                      src="/images/teacherlink-logo.svg" 
                      alt="Teacherlink Logo" 
                      style={{ maxHeight: '60px', width: 'auto', cursor: 'pointer' }}
                    />
                  </Link>
                </div>
                {/* <!-- Login Form --> */}
                <div className="login-form default-form">
                  <Register />
                </div>
                {/* <!--End Login Form --> */}
              </div>
              {/* <!-- End Login Module --> */}
            </div>
            {/* En modal-body */}
          </div>
          {/* End modal-content */}
        </div>
      </div>
      {/* <!-- Login Popup Modal --> */}
    </>
  );
};

export default LoginPopup;