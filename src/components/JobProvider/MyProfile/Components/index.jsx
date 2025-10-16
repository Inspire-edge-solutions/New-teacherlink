import FormInfoBox from "./FormInfoBox";

const index = ({ setShowProfile }) => {
    return (
        <div className="widget-content">
           
            {/* End logo and cover photo components */}

            <FormInfoBox onProfileSaved={() => setShowProfile(true)} />
            {/* compnay info box */}
        </div>
    );
};

export default index;
