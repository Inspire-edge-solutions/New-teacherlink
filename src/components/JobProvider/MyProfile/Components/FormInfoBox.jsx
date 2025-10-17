
import React, { useState } from "react";
import OrgDetails from "./OrgDetails";
//import LogoCoverUploader from "./LogoCoverUploader";

const FormInfoBox = ({ onProfileSaved }) => {
  return (
    <div className="default-form">
      <div className="row">
        {/* <LogoCoverUploader /> */}
        <OrgDetails onSaveSuccess={onProfileSaved} />
      </div>
    </div>
  );
};

export default FormInfoBox;
